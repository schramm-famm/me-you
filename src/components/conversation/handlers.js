import DiffMatchPatch from 'diff-match-patch';

import {
  getCaretPosition,
  setCaretPosition,
  setActiveUserCaretPosition,
} from './cursor';

import {
  msgTypes,
  updateTypes,
  initialProps,
  editProps,
  cursorProps,
  ackProps,
  userActionProps,
  userColours,
  INVALID_PAYLOAD_DATA,
  INTERNAL_ERROR,
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  END,
  HOME,
  PAGE_DOWN,
  PAGE_UP,
} from './constants';

import { debugLog, checkProps } from '../../utils';

const dmp = new DiffMatchPatch();

const randomInd = (list) => Math.floor(Math.random() * Math.floor(list.length));

/* WebSocket exception objects */
function InvalidDataException(msg) {
  this.message = msg;
  this.code = INVALID_PAYLOAD_DATA;
}

function RestartConnectionException(msg) {
  this.message = msg;
  this.code = INVALID_PAYLOAD_DATA;
}

function FailedAckException(msg) {
  this.message = msg;
  this.code = INTERNAL_ERROR;
}

/* WebSocket message objects */
function Message(type, msgData) {
  this.type = type;
  this.data = msgData;
}

function Update(type, cursorDelta, version, patch) {
  this.type = type;
  this.cursor_delta = cursorDelta;
  if (version !== undefined) {
    this.version = version;
  }
  if (patch !== undefined) {
    this.patch = patch;
  }
}

function createActiveUser(user, pos) {
  const colourInd = randomInd(this.colourList);
  this.activeUsers[user] = {
    position: pos,
    colour: this.colourList[colourInd],
  };

  this.colourList.splice(colourInd, 1);

  setActiveUserCaretPosition(
    this.conversationDOM,
    this.activeUsers[user].position,
    user,
    this.activeUsers[user].colour,
  );

  if (this.colourList.length === 0) {
    this.colourList = userColours;
  }
}

function sendPatch() {
  const cursors = this.conversationDOM.querySelectorAll('div.cursor');
  cursors.forEach((cursor) => {
    cursor.parentNode.removeChild(cursor);
  });

  const patches = dmp.patch_make(this.content, this.conversationDOM.innerHTML);
  this.content = this.conversationDOM.innerHTML;

  patches.forEach((patch) => {
    this.version += 1;

    const patchStr = dmp.patch_toText([patch]);
    if (patchStr === '') {
      return;
    }

    const cursorPosition = getCaretPosition(this.conversationDOM);
    const cursorDelta = cursorPosition - this.cursorPosition;

    Object.keys(this.activeUsers).forEach((user) => {
      if (
        this.activeUsers[user].position > this.cursorPosition
        || (this.activeUsers[user].position >= this.cursorPosition && cursorDelta < 0)
      ) {
        this.activeUsers[user].position += cursorDelta;
      }
    });

    this.cursorPosition = cursorPosition;
    debugLog(`Cursor position: ${this.cursorPosition}`);
    debugLog(this.activeUsers);

    const update = new Update(
      updateTypes.Edit,
      cursorDelta,
      this.version,
      patchStr,
    );

    const msg = new Message(msgTypes.Update, update);

    debugLog('Sent:');
    debugLog(msg);

    this.patchBuffer.push({ cursorDelta, patchStr });
    this.ws.send(JSON.stringify(msg));
  });

  Object.keys(this.activeUsers).forEach((user) => {
    setActiveUserCaretPosition(
      this.conversationDOM,
      this.activeUsers[user].position,
      user,
      this.activeUsers[user].colour,
    );
  });
}

function sendCursorUpdate() {
  const cursorPosition = getCaretPosition(this.conversationDOM);
  const cursorDelta = cursorPosition - this.cursorPosition;
  this.cursorPosition = cursorPosition;
  debugLog(`Cursor position: ${this.cursorPosition}`);

  const update = new Update(updateTypes.Cursor, cursorDelta);
  const msg = new Message(msgTypes.Update, update);

  debugLog('Sent:');
  debugLog(msg);

  this.ws.send(JSON.stringify(msg));
}

function handleKeyUp(e) {
  if ( // Not navigation key
    e.key !== ARROW_UP && e.key !== ARROW_DOWN && e.key !== ARROW_LEFT
    && e.key !== ARROW_RIGHT && e.key !== HOME && e.key !== END
    && e.key !== PAGE_UP && e.key !== PAGE_DOWN
  ) {
    return;
  }

  this.sendCursorUpdate();
}

function handleInitMsg(msg) {
  const missingProps = checkProps(msg, initialProps);
  if (missingProps.length > 0) {
    const errMsg = `Initial message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.version = msg.version;
  this.content = msg.content;
  this.checkpoint = this.content;
  this.conversationDOM.innerHTML = this.content;

  if (msg.active_users !== undefined) {
    Object.entries(msg.active_users).forEach(([user, pos]) => {
      this.createActiveUser(user, pos);
    });
  }
}

function handleUpdateEdit(msg) {
  const missingProps = checkProps(msg, editProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  const cursors = this.conversationDOM.querySelectorAll('div.cursor');
  cursors.forEach((cursor) => {
    cursor.parentNode.removeChild(cursor);
  });

  const msgPatch = dmp.patch_fromText(msg.patch);
  let versionDelta = 1;
  let cursorDelta = 0;

  let [content] = dmp.patch_apply(msgPatch, this.checkpoint);
  this.checkpoint = content;

  const cursorAffected = (
    this.activeUsers[msg.user_id].position < this.cursorPosition
    || (this.activeUsers[msg.user_id].position <= this.cursorPosition && msg.cursor_delta < 0)
  );

  if (cursorAffected) {
    cursorDelta += msg.cursor_delta;
  }

  if (msg.version <= this.version) {
    let i = 0;

    while (i < this.patchBuffer.length) {
      const { cursorDelta: patchCursorDelta, patchStr } = this.patchBuffer[i];
      const patch = dmp.patch_fromText(patchStr);
      const [updatedContent, results] = dmp.patch_apply(patch, content);

      if (!results[0]) {
        this.patchBuffer.splice(i, 1);
        versionDelta -= 1;
      } else {
        content = updatedContent;
        if (cursorAffected) {
          cursorDelta += patchCursorDelta;
        }
        i += 1;
      }
    }
  } else if (msg.version === this.version + 1) {
    this.patchBuffer = [];
  } else {
    const errMsg = `Server version greater than expected: ${msg.version} > ${this.version + 1}`;
    throw new RestartConnectionException(errMsg);
  }

  this.version += versionDelta;
  this.cursorPosition += cursorDelta;
  debugLog(`Cursor position: ${this.cursorPosition}`);
  this.content = content;
  this.conversationDOM.innerHTML = this.content;

  setCaretPosition(this.conversationDOM, this.cursorPosition);

  Object.entries(this.activeUsers).forEach(([user, { position, colour }]) => {
    if (user === msg.user_id.toString(10) || (user !== msg.user_id.toString(10)
      && (this.activeUsers[msg.user_id].position < position
      || (this.activeUsers[msg.user_id].position <= position && msg.cursor_delta < 0))
    )) {
      this.activeUsers[user].position += msg.cursor_delta;
    }

    setActiveUserCaretPosition(
      this.conversationDOM,
      this.activeUsers[user].position,
      user,
      colour,
    );
  });

  debugLog(this.activeUsers);
}

function handleUpdateCursor(msg) {
  const missingProps = checkProps(msg, cursorProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.activeUsers[msg.user_id].position += msg.cursor_delta;
  debugLog(this.activeUsers);
  setActiveUserCaretPosition(
    this.conversationDOM,
    this.activeUsers[msg.user_id].position,
    msg.user_id,
    this.activeUsers[msg.user_id].colour,
  );
}

function handleUpdateMsg(msg) {
  if (!(msg.user_id in this.activeUsers)) {
    const errMsg = `Message sender (user ${msg.user_id}) not active in conversation`;
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

  const patch = dmp.patch_fromText(this.patchBuffer[0].patchStr);
  let ok = false;
  [this.checkpoint, ok] = dmp.patch_apply(patch, this.checkpoint);
  if (!ok) {
    const errMsg = 'Failed to apply acknowledged patch';
    throw new FailedAckException(errMsg);
  }

  this.patchBuffer.splice(0, 1);
}

function handleUserJoinMsg(msg) {
  const missingProps = checkProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserJoin message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.createActiveUser(msg.user_id, 0);
}

function handleUserLeaveMsg(msg) {
  const missingProps = checkProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserLeave message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  delete this.activeUsers[msg.user_id];
  const cursor = this.conversationDOM.querySelector(`#user-${msg.user_id}`);
  cursor.parentNode.removeChild(cursor);
}

function parseWSMessage(e) {
  let msg = {};
  try {
    msg = JSON.parse(e.data);
  } catch (err) {
    console.log(`Unable to parse JSON data: ${err.message}`);
    return;
  }

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
    this.checkpoint = this.content;
    this.version = -1;
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
    sendCursorUpdate,
    handleKeyUp,
    handleInitMsg,
    handleUpdateEdit,
    handleUpdateCursor,
    handleUpdateMsg,
    handleAckMsg,
    handleUserJoinMsg,
    handleUserLeaveMsg,
    parseWSMessage,
    connectWebSocket,
  },
};
