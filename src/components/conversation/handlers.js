import DiffMatchPatch from 'diff-match-patch';

import {
  getTextSize,
  getCaretPosition,
  setCaretPosition,
  removeHighlight,
  removeAllHighlights,
  setActiveUserCaretPosition,
} from './dom';

import {
  InvalidDataException,
  RestartConnectionException,
  FailedAckException,
  Message,
  Sync,
  Update,
  Delta,
  Caret,
  Patch,
  VersionCheckpoint,
  shiftCaret,
} from './protocol';

import {
  msgTypes,
  updateTypes,
  initialProps,
  editProps,
  cursorProps,
  ackProps,
  syncProps,
  userActionProps,
  userColours,
  INTERNAL_ERROR,
} from './constants';

import { debugLog, checkProps, keysToCamel } from '../../utils';

const dmp = new DiffMatchPatch();

const randomInd = (list) => Math.floor(Math.random() * Math.floor(list.length));

function createActiveUser(user, caret) {
  const colourInd = randomInd(this.colourList);
  const { latest, version } = this.checkpoint;

  version[latest].activeUsers[user] = caret;
  this.activeUsers[user] = {
    caret,
    colour: this.colourList[colourInd],
  };

  this.colourList.splice(colourInd, 1);

  setActiveUserCaretPosition(
    this.conversationDOM,
    this.activeUsers[user].caret,
    user,
    this.activeUsers[user].colour,
  );

  if (this.colourList.length === 0) {
    this.colourList = userColours;
  }
}

function sendPatch() {
  removeAllHighlights(this.conversationDOM);

  const patches = dmp.patch_make(this.content, this.conversationDOM.innerHTML);

  const { start, end } = getCaretPosition(this.conversationDOM);
  const newTextSize = getTextSize(this.conversationDOM);

  const delta = new Delta(
    start - this.caret.start,
    end - this.caret.end,
    newTextSize - this.textSize,
  );

  const camelDelta = keysToCamel(delta);

  patches.forEach((patch) => {
    this.version += 1;

    const patchStr = dmp.patch_toText([patch]);
    if (patchStr === '') {
      return;
    }

    const update = new Update(
      updateTypes.Edit,
      delta,
      this.version,
      patchStr,
    );

    const msg = new Message(msgTypes.Update, update);

    this.ws.send(JSON.stringify(msg));
    this.patchBuffer.push(new Patch(patchStr, camelDelta));
  });

  Object.entries(this.activeUsers).forEach(([user, { caret, colour }]) => {
    this.activeUsers[user].caret = shiftCaret(caret, this.caret, camelDelta);
    setActiveUserCaretPosition(
      this.conversationDOM,
      this.activeUsers[user].caret,
      user,
      colour,
    );
  });

  this.caret = new Caret(start, end);
  this.textSize = newTextSize;
  this.content = this.conversationDOM.innerHTML;
}

function handleSelectionChange() {
  if (document.activeElement !== this.conversationDOM) {
    return;
  }

  const { start, end } = getCaretPosition(this.conversationDOM);
  const delta = new Delta(start - this.caret.start, end - this.caret.end);
  const update = new Update(updateTypes.Cursor, delta, this.version);
  const msg = new Message(msgTypes.Update, update);

  this.ws.send(JSON.stringify(msg));
  this.caret = new Caret(start, end);

  if (this.checkpoint.latest === this.version) {
    this.checkpoint.version[this.version].selfCaret = this.caret;
  }
}

function handleInitMsg(msg) {
  const missingProps = checkProps(msg, initialProps);
  if (missingProps.length > 0) {
    const errMsg = `Initial message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.version = msg.version;
  this.content = msg.content;
  this.checkpoint.content = this.content;
  this.checkpoint.latest = this.version;
  this.checkpoint.version[this.version] = new VersionCheckpoint(this.caret, {});
  this.conversationDOM.innerHTML = this.content;
  this.textSize = getTextSize(this.conversationDOM);

  if (msg.activeUsers !== undefined) {
    Object.entries(msg.activeUsers).forEach(([user, caret]) => {
      this.createActiveUser(user, caret);
    });
  }
}

function handleUpdateEdit(msg) {
  const missingProps = checkProps(msg, editProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  removeAllHighlights(this.conversationDOM);

  const msgPatch = dmp.patch_fromText(msg.patch);

  [this.content] = dmp.patch_apply(msgPatch, this.checkpoint.content);
  this.checkpoint.content = this.content;

  const { latest } = this.checkpoint;
  const { activeUsers } = this.checkpoint.version[latest];
  let { selfCaret } = this.checkpoint.version[latest];
  const senderCaret = activeUsers[msg.userId];
  const newCheckpoint = new VersionCheckpoint(
    selfCaret,
    activeUsers,
    senderCaret,
    msg.delta,
  );

  // Shift client checkpoint caret
  if (selfCaret) {
    newCheckpoint.selfCaret = shiftCaret(selfCaret, senderCaret, msg.delta);
    selfCaret = { ...newCheckpoint.selfCaret };
  }

  // Shift active users' checkpoint carets
  Object.entries(newCheckpoint.activeUsers).forEach(([user, caret]) => {
    let newCaret = caret;
    if (user === msg.userId.toString(10)) {
      // Apply delta to sender caret
      newCaret.start += msg.delta.caretStart;
      newCaret.end += msg.delta.caretEnd;
    } else {
      newCaret = shiftCaret(newCaret, senderCaret, msg.delta);
    }
    newCheckpoint.activeUsers[user] = newCaret;
    this.activeUsers[user].caret = newCaret;
  });

  // Add new version checkpoint
  this.checkpoint.version[msg.version] = newCheckpoint;
  this.checkpoint.latest = msg.version;

  if (msg.version <= this.version) {
    let i = 0;

    while (i < this.patchBuffer.length) {
      const { delta, patchStr } = this.patchBuffer[i];
      const patch = dmp.patch_fromText(patchStr);
      const [content, results] = dmp.patch_apply(patch, this.content);

      if (!results[0]) {
        this.patchBuffer.splice(i, 1);
        this.version -= 1;
      } else {
        this.content = content;
        Object.entries(this.activeUsers).forEach(([user, { caret }]) => {
          this.activeUsers[user].caret = shiftCaret(caret, selfCaret, delta);
        });
        selfCaret.start += delta.caretStart;
        selfCaret.end += delta.caretEnd;
        i += 1;
      }
    }
  } else if (msg.version > this.version + 1) {
    const errMsg = `Server version greater than expected: ${msg.version} > ${this.version + 1}`;
    throw new RestartConnectionException(errMsg);
  }

  const syncMsg = new Message(msgTypes.Sync, new Sync(msg.version));
  this.ws.send(JSON.stringify(syncMsg));

  this.version += 1;
  this.conversationDOM.innerHTML = this.content;
  this.textSize += msg.delta.doc;

  if (this.caret) {
    this.caret = selfCaret;
    setCaretPosition(this.conversationDOM, this.caret);
  }

  Object.entries(this.activeUsers).forEach(([user, { caret, colour }]) => {
    setActiveUserCaretPosition(this.conversationDOM, caret, user, colour);
  });
}

function handleUpdateCursor(msg) {
  const missingProps = checkProps(msg, cursorProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  // Update user's checkpoint caret
  const checkpoint = this.checkpoint.version[msg.version];
  checkpoint.activeUsers[msg.userId].start += msg.delta.caretStart;
  checkpoint.activeUsers[msg.userId].end += msg.delta.caretEnd;

  const latestVersion = this.version - this.patchBuffer.length;
  for (let v = msg.version + 1; v <= latestVersion; v += 1) {
    this.checkpoint.version[v].activeUsers[msg.userId] = shiftCaret(
      this.checkpoint.version[v - 1].activeUsers[msg.userId],
      this.checkpoint.version[v].senderCaret,
      this.checkpoint.version[v].delta,
    );
  }

  // Update user's caret using patchBuffer
  const latestActiveUsers = this.checkpoint.version[latestVersion].activeUsers;
  const selfCaret = { ...this.checkpoint.version[latestVersion].selfCaret };

  this.activeUsers[msg.userId].caret = { ...latestActiveUsers[msg.userId] };

  this.patchBuffer.forEach(({ delta }) => {
    this.activeUsers[msg.userId].caret = shiftCaret(
      this.activeUsers[msg.userId].caret,
      selfCaret,
      delta,
    );
    selfCaret.start += delta.caretStart;
    selfCaret.end += delta.caretEnd;
  });

  setActiveUserCaretPosition(
    this.conversationDOM,
    this.activeUsers[msg.userId].caret,
    msg.userId,
    this.activeUsers[msg.userId].colour,
  );
}

function handleUpdateMsg(msg) {
  if (!(msg.userId in this.activeUsers)) {
    const errMsg = `Message sender (user ${msg.userId}) not active in conversation`;
    throw new InvalidDataException(errMsg);
  }

  switch (msg.type) {
    case updateTypes.Edit: {
      this.handleUpdateEdit(msg);
      break;
    }
    case updateTypes.Cursor: {
      this.handleUpdateCursor(msg);
      break;
    }
    default:
      console.log(`Invalid update type: ${msg.type}`);
  }
}

function handleAckMsg(msg) {
  const missingProps = checkProps(msg, ackProps);
  if (missingProps.length > 0) {
    const errMsg = `Ack message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  if (this.patchBuffer.length <= 0) {
    const errMsg = 'No outstanding patches awaiting acknowledgement';
    throw new FailedAckException(errMsg);
  }

  const [{ patchStr, delta }] = this.patchBuffer.splice(0, 1);
  const patch = dmp.patch_fromText(patchStr);
  const [content, ok] = dmp.patch_apply(patch, this.checkpoint.content);
  if (!ok) {
    const errMsg = 'Failed to apply acknowledged patch';
    throw new FailedAckException(errMsg);
  }
  this.checkpoint.content = content;

  const { selfCaret } = this.checkpoint.version[msg.version - 1];
  const newCheckpoint = new VersionCheckpoint(
    selfCaret,
    this.checkpoint.version[msg.version - 1].activeUsers,
    selfCaret,
    delta,
  );

  newCheckpoint.selfCaret.start += delta.caretStart;
  newCheckpoint.selfCaret.end += delta.caretEnd;

  Object.entries(newCheckpoint.activeUsers).forEach(([user, caret]) => {
    newCheckpoint.activeUsers[user] = shiftCaret(caret, selfCaret, delta);
  });

  this.checkpoint.version[msg.version] = newCheckpoint;
  this.checkpoint.latest = msg.version;
}

function handleSyncMsg(msg) {
  const missingProps = checkProps(msg, syncProps);
  if (missingProps.length > 0) {
    const errMsg = `Sync message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  if (!(msg.version - 1 in this.checkpoint.version)) {
    const errMsg = `Version ${msg.version - 1} does not exist in checkpoints`;
    throw new InvalidDataException(errMsg);
  }

  delete this.checkpoint.version[msg.version - 1];
}

function handleUserJoinMsg(msg) {
  const missingProps = checkProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserJoin message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.createActiveUser(msg.userId, new Caret(0, 0));
}

function handleUserLeaveMsg(msg) {
  const missingProps = checkProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserLeave message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  delete this.activeUsers[msg.userId];
  const cursor = this.conversationDOM.parentNode.querySelector(`#cursor-${msg.userId}`);
  if (cursor) {
    cursor.parentNode.removeChild(cursor);
  }
  const highlight = this.conversationDOM.querySelector(`#highlight-${msg.userId}`);
  if (highlight) {
    removeHighlight(highlight);
  }
}

function parseWSMessage(e) {
  let msg = {};
  try {
    msg = JSON.parse(e.data);
  } catch (err) {
    console.log(`Unable to parse JSON data: ${err.message}`);
    return;
  }

  msg = keysToCamel(msg);

  debugLog('Received:');
  debugLog(msg);

  switch (msg.type) {
    case msgTypes.Init:
      this.handleInitMsg(msg.data);
      break;
    case msgTypes.Update:
      this.handleUpdateMsg(msg.data);
      break;
    case msgTypes.Ack:
      this.handleAckMsg(msg.data);
      break;
    case msgTypes.Sync:
      this.handleSyncMsg(msg.data);
      break;
    case msgTypes.UserJoin:
      this.handleUserJoinMsg(msg.data);
      break;
    case msgTypes.UserLeave:
      this.handleUserLeaveMsg(msg.data);
      break;
    default:
      console.log(`Invalid message type: ${msg.type}`);
  }
}

function connectWebSocket() {
  try {
    this.ws = new WebSocket(`ws://${process.env.VUE_APP_BACKEND}/patches/v1/connect/${this.activeConversation}`);
  } catch (err) {
    console.log(`Unable to create WebSocket connection: ${err.message}`);
    return;
  }

  this.ws.onopen = () => {
    console.log(`OPEN CONVERSATION_${this.activeConversation} WS`);
    this.ws.send(this.token);
  };
  this.ws.onclose = (e) => {
    console.log(`Closing WebSocket connection for conversation ${this.conversation.id}: ${e.reason}`);
    this.content = '';
    this.conversationDOM.innerHTML = this.content;
    this.checkpoint.content = this.content;
    this.checkpoint.version = {};
    this.version = -1;
    this.latest = this.version;
    this.patchBuffer = [];
    this.conversation = this.conversations[this.activeConversation];
  };
  this.ws.onmessage = (e) => {
    try {
      this.parseWSMessage(e);
    } catch (err) {
      console.log(`Failed to parse WebSocket message: ${err.message}`);
      if (
        e instanceof InvalidDataException
        || e instanceof FailedAckException
      ) {
        this.ws.close(err.code, err.message);
      } else if (e instanceof RestartConnectionException) {
        this.ws.close(err.code, err.message);
        this.connectWebSocket();
      } else {
        this.ws.close(INTERNAL_ERROR, err.message);
      }
    }
  };
  this.ws.onerror = (e) => {
    console.log(`ERROR: ${e.data}`);
  };
}

export default {
  methods: {
    createActiveUser,
    sendPatch,
    handleSelectionChange,
    handleInitMsg,
    handleUpdateEdit,
    handleUpdateCursor,
    handleUpdateMsg,
    handleAckMsg,
    handleSyncMsg,
    handleUserJoinMsg,
    handleUserLeaveMsg,
    parseWSMessage,
    connectWebSocket,
  },
};
