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
    >
    </div>
  </div>
</template>

<script>
import DiffMatchPatch from 'diff-match-patch';

// Declare constants
const msgTypes = Object.freeze({
  Init: 0,
  Update: 1,
  Ack: 2,
});
const updateTypes = Object.freeze({
  Edit: 0,
});
const initialProps = Object.freeze(['content', 'version']);
const updateProps = Object.freeze(['type', 'version', 'patch', 'cursor_delta']);
const ackProps = Object.freeze(['version']);

const GOING_AWAY = 4001;
const INVALID_PAYLOAD_DATA = 4007;
const INTERNAL_ERROR = 4011;

const dmp = new DiffMatchPatch();

const data = () => ({
  ws: null,
  conversation: {},
  checkpoint: '',
  version: -1,
  content: '',
  patchBuffer: [],
});

const checkMsgProps = (msg, requiredProps) => {
  const missingProps = [];
  requiredProps.forEach((prop) => {
    if (!(prop in msg)) {
      missingProps.push(prop);
    }
  });

  return missingProps;
};

const debugLog = (msg) => {
  if (process.env.VUE_APP_DEBUG === 'true') {
    console.log(msg);
  }
};

function MissingPropsException(msg) {
  this.message = msg;
  this.code = INVALID_PAYLOAD_DATA;
}

function FailedAckException(msg) {
  this.message = msg;
  this.code = INTERNAL_ERROR;
}

function Message(type, msgData) {
  this.type = type;
  this.data = msgData;
}

function token() {
  return this.$store.state.token;
}

function conversations() {
  return this.$store.state.conversations;
}

function activeConversation() {
  return parseInt(this.$route.params.id, 10);
}

function sendPatch() {
  const patches = dmp.patch_make(this.content, this.conversationDOM.innerHTML);
  patches.forEach((patch) => {
    this.version += 1;
    const patchStr = dmp.patch_toText([patch]);
    if (patchStr === '') {
      return;
    }

    const update = {
      type: updateTypes.Edit,
      version: this.version,
      patch: patchStr,
      cursor_delta: 0,
    };

    const msg = new Message(msgTypes.Update, update);

    this.patchBuffer.push(patchStr);
    this.ws.send(JSON.stringify(msg));
    debugLog('Sent:');
    debugLog(msg);
  });

  this.content = this.conversationDOM.innerHTML;
}

function handleInitMsg(msg) {
  const missingProps = checkMsgProps(msg, initialProps);
  if (missingProps.length > 0) {
    const errMsg = `Initial message missing required fields: ${missingProps.join()}`;
    throw new MissingPropsException(errMsg);
  }

  this.checkpoint = msg.content;
  this.version = msg.version;
  this.content = this.checkpoint;
  this.conversationDOM.innerHTML = this.content;
}

function handleUpdateMsg(msg) {
  const missingProps = checkMsgProps(msg, updateProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new MissingPropsException(errMsg);
  }

  switch (msg.type) {
    case updateTypes.Edit: {
      const msgPatch = dmp.patch_fromText(msg.patch);
      let content = '';
      let versionDelta = 1;

      [content] = dmp.patch_apply(msgPatch, this.checkpoint);
      this.checkpoint = content;

      if (msg.version <= this.version) {
        let i = 0;

        while (i < this.patchBuffer.length) {
          const patch = dmp.patch_fromText(this.patchBuffer[i]);
          const [updatedContent, results] = dmp.patch_apply(patch, content);

          if (!results[0]) {
            this.patchBuffer.splice(i, 1);
            versionDelta -= 1;
          } else {
            content = updatedContent;
            i += 1;
          }
        }
      } else if (msg.version === this.version + 1) {
        this.patchBuffer = [];
      }

      this.version += versionDelta;
      this.content = content;
      this.conversationDOM.innerHTML = this.content;
      break;
    }
    default:
      console.log(`Invalid update type: ${msg.type}`);
  }
}

function handleAckMsg(msg) {
  const missingProps = checkMsgProps(msg, ackProps);
  if (missingProps.length > 0) {
    const errMsg = `Update message missing required fields: ${missingProps.join()}`;
    throw new MissingPropsException(errMsg);
  }

  const patch = dmp.patch_fromText(this.patchBuffer[0]);
  let ok = false;
  [this.checkpoint, ok] = dmp.patch_apply(patch, this.checkpoint);
  if (!ok) {
    const errMsg = 'Failed to apply acknowledged patch';
    throw new FailedAckException(errMsg);
  }

  this.patchBuffer.splice(0, 1);
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
        e instanceof MissingPropsException
        || e instanceof FailedAckException
      ) {
        this.ws.close(err.code, err.message);
      } else {
        this.ws.close(INTERNAL_ERROR, err.message);
      }
    }
  };
  this.ws.onerror = (e) => {
    console.log(`ERROR: ${e.data}`);
  };
}

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
    handleInitMsg,
    handleUpdateMsg,
    handleAckMsg,
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
