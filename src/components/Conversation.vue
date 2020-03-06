<template>
  <div class="conversation">
    <div class="header">
      <div class="header-content">
        <img class="avatar" v-bind:src="conversation.avatar_url">
        <div>
          <h1>{{ conversation.name }}</h1>
          <h2>last modified {{ conversation.last_modified_display }}</h2>
        </div>
      </div>
    </div>
    <div
      id="conversation-body"
      class="body"
      contenteditable="true"
      v-on:input="sendPatch"
      v-on:keyup="handleKeyUp"
      v-on:mouseup="sendCursorUpdate"
    >
    </div>
  </div>
</template>

<script>
import DiffMatchPatch from 'diff-match-patch';

// WebSocket message constants
const msgTypes = Object.freeze({
  Init: 0,
  Update: 1,
  Ack: 2,
  UserJoin: 3,
  UserLeave: 4,
});
const updateTypes = Object.freeze({
  Edit: 0,
  Cursor: 1,
});
const initialProps = Object.freeze(['content', 'version']);
const editProps = Object.freeze(['type', 'user_id', 'cursor_delta', 'version', 'patch']);
const cursorProps = Object.freeze(['type', 'user_id', 'cursor_delta']);
const ackProps = Object.freeze(['version']);
const userActionProps = Object.freeze(['user_id']);

// WebSocket error codes
const GOING_AWAY = 4001;
const INVALID_PAYLOAD_DATA = 4007;
const INTERNAL_ERROR = 4011;

// Key values
const ARROW_DOWN = 'ArrowDown';
const ARROW_LEFT = 'ArrowLeft';
const ARROW_RIGHT = 'ArrowRight';
const ARROW_UP = 'ArrowUp';
const END = 'End';
const HOME = 'Home';
const PAGE_DOWN = 'PageDown';
const PAGE_UP = 'PageUp';

const dmp = new DiffMatchPatch();

const data = () => ({
  ws: null,
  conversation: {},
  checkpoint: '',
  version: -1,
  content: '',
  patchBuffer: [],
  activeUsers: {},
  cursorPosition: 0,
});

/*
  Checks if the message has the required properties.
  Parameters:
    msg, object: the payload of a message received from the WebSocket connection
    requiredProps, string[]: the required properties for the payload type
  Returns: string[], the properties that are missing
*/
const checkMsgProps = (msg, requiredProps) => {
  const missingProps = [];
  requiredProps.forEach((prop) => {
    if (!(prop in msg)) {
      missingProps.push(prop);
    }
  });

  return missingProps;
};

/*
  Gets the current position of the caret.
  Parameters:
    el, DOM Element: the element that the caret is in
  Returns: int, the position of the caret
*/
const getCaretPosition = (el) => {
  let caretOffset = 0;
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  let sel;
  if (win.getSelection !== undefined) {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      const range = win.getSelection().getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if (sel === doc.selection && sel.type !== 'Control') {
    const textRange = sel.createRange();
    const preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(el);
    preCaretTextRange.setEndPoint('EndToEnd', textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
};

/*
  Gets all of the nodes within the given DOM Element that contain text.
  Parameters:
    el, DOM Element: the element to traverse
  Returns: Node[], list of all text nodes within el
*/
const getAllTextNodes = (el) => {
  const a = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  let n = walk.nextNode();
  while (n) {
    a.push(n);
    n = walk.nextNode();
  }
  return a;
};

/*
  Determines the node and offset within the node of the given position.
  Parameters:
    el, DOM Element: the element that contains the caret
    position, int: the desired position
  Returns:  Object{node, offset}, where node is the Node that the position is
            in and offset is the position within the element
*/
const getCaretData = (el, position) => {
  let node;
  let offset = position;
  const nodes = getAllTextNodes(el);

  for (let n = 0; n < nodes.length; n += 1) {
    if (offset > nodes[n].nodeValue.length && nodes[n + 1]) {
      // remove amount from the position, go to next node
      offset -= nodes[n].nodeValue.length;
    } else {
      node = nodes[n];
      break;
    }
  }

  return { node, offset };
};

/*
  Sets the caret position.
  Parameters:
    d, Object{node, offset}: where node is the Node that contains the caret and
      offset is the position within the Node
    el, DOM Element: the element that contains the Node
    position, int: the desired position
*/
const setCaretPosition = (d, el) => {
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  const sel = win.getSelection();
  const range = doc.createRange();
  range.setStart(d.node, d.offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

const debugLog = (msg) => {
  if (process.env.VUE_APP_DEBUG === 'true') {
    console.log(msg);
  }
};

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

/* Vue instance computed functions */
function token() {
  return this.$store.state.token;
}

function conversations() {
  return this.$store.state.conversations;
}

function activeConversation() {
  return parseInt(this.$route.params.id, 10);
}

/* Vue instance methods */
function sendPatch() {
  const patches = dmp.patch_make(this.content, this.conversationDOM.innerHTML);
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
        this.activeUsers[user] > this.cursorPosition
        || (this.activeUsers[user] >= this.cursorPosition && cursorDelta < 0)
      ) {
        this.activeUsers[user] += cursorDelta;
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

  this.content = this.conversationDOM.innerHTML;
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

function handleInitMsg(msg) {
  const missingProps = checkMsgProps(msg, initialProps);
  if (missingProps.length > 0) {
    const errMsg = `Initial message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  if ('active_users' in msg) {
    this.activeUsers = msg.active_users;
  }

  this.version = msg.version;
  this.content = msg.content;
  this.checkpoint = this.content;
  this.conversationDOM.innerHTML = this.content;
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

function handleUpdateEdit(msg) {
  const missingProps = checkMsgProps(msg, editProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  const msgPatch = dmp.patch_fromText(msg.patch);
  let versionDelta = 1;
  let cursorDelta = 0;

  let [content] = dmp.patch_apply(msgPatch, this.checkpoint);
  this.checkpoint = content;

  const cursorAffected = (
    this.activeUsers[msg.user_id] < this.cursorPosition
    || (this.activeUsers[msg.user_id] <= this.cursorPosition && msg.cursor_delta < 0)
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
  this.activeUsers[msg.user_id] += msg.cursor_delta;
  debugLog(this.activeUsers);
  this.content = content;
  this.conversationDOM.innerHTML = this.content;

  const caretData = getCaretData(this.conversationDOM, this.cursorPosition);
  if (caretData.node === undefined) {
    caretData.node = this.conversationDOM;
    caretData.offset = 0;
  } else if (caretData.offset > caretData.node.nodeValue.length) {
    caretData.offset = caretData.node.nodeValue.length;
  }
  setCaretPosition(caretData, this.conversationDOM);
}

function handleUpdateCursor(msg) {
  const missingProps = checkMsgProps(msg, cursorProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.activeUsers[msg.user_id] += msg.cursor_delta;
  debugLog(this.activeUsers);
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
  const missingProps = checkMsgProps(msg, ackProps);
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
  const missingProps = checkMsgProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserJoin message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  this.activeUsers[msg.user_id] = 0;
}

function handleUserLeaveMsg(msg) {
  const missingProps = checkMsgProps(msg, userActionProps);
  if (missingProps.length > 0) {
    const errMsg = `UserLeave message missing required fields: ${missingProps.join()}`;
    throw new InvalidDataException(errMsg);
  }

  delete this.activeUsers[msg.user_id];
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

/* Vue instance lifecycle hooks */
function created() {
  this.conversation = this.conversations[this.activeConversation];
  this.connectWebSocket();
}

function mounted() {
  this.conversationDOM = this.$el.querySelector('#conversation-body');
  this.conversationDOM.innerHTML = this.content;
}

export default {
  name: 'Conversation',
  data,
  created,
  mounted,
  computed: {
    token,
    conversations,
    activeConversation,
  },
  watch: {
    conversations() {
      this.conversation = this.conversations[this.activeConversation];
    },
    activeConversation() {
      this.ws.close(GOING_AWAY);
      this.connectWebSocket();
    },
  },
  methods: {
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
</script>

<style scoped>
.conversation {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.body {
  display: inline-block;
  color: black;
  font-size: 12pt;
  padding: 1em;
  height: 100%;
  overflow-y: scroll;
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
}

.body:focus {
  outline: 0px solid transparent;
}
</style>
