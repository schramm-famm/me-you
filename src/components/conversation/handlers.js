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

/*
  Adds a user caret to the latest version checkpoint and the activeUsers Object,
  and displays the caret in the DOM. Also randomly chooses a colour for the
  user's caret.
*/
function createActiveUser(user, caret) {
  const colourInd = randomInd(this.colourList);
  const { latest, version } = this.checkpoint;

  version[latest].activeUsers[user] = caret;
  this.activeUsers[user] = {
    caret,
    colour: this.colourList[colourInd],
  };

  this.colourList.splice(colourInd, 1);

  if (this.colourList.length === 0) {
    this.colourList = userColours;
  }

  setActiveUserCaretPosition(
    this.conversationDOM,
    this.activeUsers[user].caret,
    user,
    this.activeUsers[user].colour,
  );
}

/*
  Generates a patch for the new conversation state and calculates the deltas of
  the conversation before sending an Edit Update message to the WebSocket.
  Appends the patch and delta to the patchBuffer and shifts other active users'
  carets after the message is sent.
*/
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

  // Get the delta in camelCase
  const camelDelta = keysToCamel(delta);

  // Send an Edit Update message for each patch
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

  // Shift each active users' caret position and update the DOM with the new
  // position
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

/*
  Sends a Cursor Update message with the caret deltas to the WebSocket. Updates
  the caret position in the latest checkpoint if the latest checkpoint is the
  current state of the conversation.
*/
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
    this.checkpoint.version[this.version].selfCaret = { ...this.caret };
  }
}

/*
  Handles an Init message sent from the WebSocket. Initializes the conversation
  state, checkpoints, and active users.
  Parameters:
    msg, Object: payload of the Init Message
      msg.version, int: version of the conversation
      msg.content, string: conversation content
      msg.activeUsers, Object, optional: active users in the conversation and
        their caret positions. The keys are the user IDs and the values are the
        caret positions.
*/
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

/*
  Handles an Edit Update message sent from the WebSocket. Processes the patch in
  the message and shifts the client's and active users' carets accordingly.
  Parameters:
    msg, Object: payload of the Edit Update Message
      msg.type, int: update type
      msg.userId, int: sender user ID
      msg.version, int: version of the conversation
      msg.delta, Object: patch deltas
        msg.delta.caretStart, int: caret start position delta
        msg.delta.caretEnd, int: caret end position delta
        msg.delta.doc, int: conversation text content delta
      msg.patch, string: patch string
*/
function handleUpdateEdit(msg) {
  const missingProps = checkProps(msg, editProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  // Remove highlights from the DOM so they don't affect the patch
  removeAllHighlights(this.conversationDOM);

  const msgPatch = dmp.patch_fromText(msg.patch);

  [this.content] = dmp.patch_apply(msgPatch, this.checkpoint.content);
  this.checkpoint.content = this.content;

  const { latest } = this.checkpoint;
  const { activeUsers } = this.checkpoint.version[latest];
  let { selfCaret } = this.checkpoint.version[latest];
  const senderCaret = activeUsers[msg.userId];
  // newCheckpoint is the new version checkpoint once this update is processed
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
    // Version conflict occurred, so patches in patchBuffer need to be replayed
    // on top
    let i = 0;

    while (i < this.patchBuffer.length) {
      const { delta, patchStr } = this.patchBuffer[i];
      const patch = dmp.patch_fromText(patchStr);
      const [content, results] = dmp.patch_apply(patch, this.content);

      if (!results[0]) {
        // Remove failed patch from patchBuffer
        this.patchBuffer.splice(i, 1);
        this.version -= 1;
      } else {
        this.content = content;
        // Shift displayed active users' carets with the client's caret as the
        // sender
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

  // Send a Sync message to indicate that this version has been processed
  // successfully
  const syncMsg = new Message(msgTypes.Sync, new Sync(msg.version));
  this.ws.send(JSON.stringify(syncMsg));

  this.version += 1;
  this.conversationDOM.innerHTML = this.content;
  this.textSize += msg.delta.doc;

  // Set the client's caret in the DOM
  if (this.caret) {
    this.caret = selfCaret;
    setCaretPosition(this.conversationDOM, this.caret);
  }

  // Set the active users' carts in the DOM
  Object.entries(this.activeUsers).forEach(([user, { caret, colour }]) => {
    setActiveUserCaretPosition(this.conversationDOM, caret, user, colour);
  });
}

/*
  Handles a Cursor Update message sent from the WebSocket. Applies the delta to
  the sender's caret at the specified version and shifts its caret at subsequent
  versions accordingly.
  Parameters:
    msg, Object: payload of the Cursor Update Message
      msg.type, int: update type
      msg.userId, int: sender user ID
      msg.version, int: version of the conversation
      msg.delta, Object: patch deltas
        msg.delta.caretStart, int: caret start position delta
        msg.delta.caretEnd, int: caret end position delta
*/
function handleUpdateCursor(msg) {
  const missingProps = checkProps(msg, cursorProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  // Update user's checkpoint caret
  const msgCheckpoint = this.checkpoint.version[msg.version];
  msgCheckpoint.activeUsers[msg.userId].start += msg.delta.caretStart;
  msgCheckpoint.activeUsers[msg.userId].end += msg.delta.caretEnd;

  const { latest } = this.checkpoint;
  for (let v = msg.version + 1; v <= latest; v += 1) {
    const currCheckpoint = this.checkpoint.version[v];
    const prevCheckpoint = this.checkpoint.version[v - 1];
    // Shift caret using position at previous checkpoint and the sender and
    // delta at the current checkpoint
    currCheckpoint.activeUsers[msg.userId] = shiftCaret(
      prevCheckpoint.activeUsers[msg.userId],
      currCheckpoint.senderCaret,
      currCheckpoint.delta,
    );
  }

  // Update user's caret using patchBuffer
  const { activeUsers } = this.checkpoint.version[latest];
  const selfCaret = { ...this.checkpoint.version[latest].selfCaret };

  this.activeUsers[msg.userId].caret = { ...activeUsers[msg.userId] };

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

/*
  Handles a Update message sent from the WebSocket. Calls the proper function
  based on the subtype of the Update.
  Parameters:
    msg, Object: payload of the Update Message
      msg.type, int: update type
      msg.userId, int: sender user ID
      msg.version, int: version of the conversation
      msg.delta, Object: patch deltas
        msg.delta.caretStart, int: caret start position delta
        msg.delta.caretEnd, int: caret end position delta
        msg.delta.doc, int, Edit only: conversation text content delta
      msg.patch, string, Edit only: patch string
*/
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

/*
  Handles an Ack message sent from the WebSocket. Creates a new checkpoint for
  the version that was acknowledged using the earliest patch in the patchBuffer.
  Parameters:
    msg, Object: payload of the Ack message
      msg.version, int: version of the conversation
*/
function handleAckMsg(msg) {
  const missingProps = checkProps(msg, ackProps);
  if (missingProps.length > 0) {
    const errMsg = `Ack message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  if (this.patchBuffer.length <= 0) {
    const errMsg = 'No patches awaiting acknowledgement';
    throw new FailedAckException(errMsg);
  }

  // Dequeue the patch and delta from the patchBuffer
  const [{ patchStr, delta }] = this.patchBuffer.splice(0, 1);
  const patch = dmp.patch_fromText(patchStr);
  const [content, ok] = dmp.patch_apply(patch, this.checkpoint.content);
  if (!ok) {
    const errMsg = 'Failed to apply acknowledged patch';
    throw new FailedAckException(errMsg);
  }
  this.checkpoint.content = content;

  // Get the client's caret position at the latest checkpoint
  const { latest } = this.checkpoint;
  const { selfCaret: prevCaret } = this.checkpoint.version[latest];
  const newCheckpoint = new VersionCheckpoint(
    prevCaret,
    this.checkpoint.version[latest].activeUsers,
    prevCaret,
    delta,
  );

  // Apply delta to client's caret at new checkpoint
  newCheckpoint.selfCaret.start += delta.caretStart;
  newCheckpoint.selfCaret.end += delta.caretEnd;

  // Shift active users' carets at new checkpoint
  Object.entries(newCheckpoint.activeUsers).forEach(([user, caret]) => {
    newCheckpoint.activeUsers[user] = shiftCaret(caret, prevCaret, delta);
  });

  this.checkpoint.version[latest + 1] = newCheckpoint;
  this.checkpoint.latest += 1;
}

/*
  Handles a Sync message sent from the WebSocket. Deletes the version checkpoint
  preceding the specified version.
  Parameters:
    msg, Object: payload of the Sync message
      msg.version, int: version of the conversation
*/
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

/*
  Handles a UserJoin message sent from the WebSocket. Creates a new active user.
  Parameters:
    msg, Object: payload of the UserJoin message
      msg.userId, int: user ID of joining user
*/
function handleUserJoinMsg(msg) {
  const missingProps = checkProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserJoin message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.createActiveUser(msg.userId, new Caret(0, 0));
}

/*
  Handles a UserLeave message sent from the WebSocket. Removes an active user.
  Parameters:
    msg, Object: payload of the UserLeave message
      msg.userId, int: user ID of leaving user
*/
function handleUserLeaveMsg(msg) {
  const missingProps = checkProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserLeave message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  // Remove user from all checkpoints
  Object.keys(this.checkpoint.version).forEach((version) => {
    delete this.checkpoint.version[version].activeUsers[msg.userId];
  });
  // Remove user from active users
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
    this.ws = new WebSocket(`ws://${this.backend}/patches/v1/connect/${this.activeConversation}`);
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
