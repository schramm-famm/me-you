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
const initialProps = Object.freeze(['content', 'version']);
const updateProps = Object.freeze(['type', 'version', 'patch', 'cursor_delta']);
const updateTypes = Object.freeze({
  Edit: 0,
});

const dmp = new DiffMatchPatch();

const data = () => ({
  ws: null,
  conversation: {},
  checkpoint: '',
  version: 0,
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

  return missingProps.join();
};

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

    const msg = {
      type: updateTypes.Edit,
      version: this.version,
      patch: patchStr,
      cursor_delta: 0,
    };

    this.patchBuffer.push(patchStr);
    this.ws.send(JSON.stringify(msg));
  });

  this.content = this.conversationDOM.innerHTML;
}

function parseWSMessage(e) {
  let msg = {};
  try {
    msg = JSON.parse(e.data);
  } catch (err) {
    console.log(`Unable to parse JSON data: ${err.message}`);
    return;
  }

  if ('content' in msg) { // Initial message
    const missingProps = checkMsgProps(msg, initialProps);
    if (missingProps !== '') {
      console.log(`Initial message missing required fields: ${missingProps}`);
    }
    this.checkpoint = msg.content;
    this.version = msg.version;
    this.content = this.checkpoint;
    this.conversationDOM.innerHTML = this.content;
  } else if ('type' in msg) {
    const missingProps = checkMsgProps(msg, updateProps);
    if (missingProps !== '') {
      console.log(`Update message missing required fields: ${missingProps}`);
    }

    switch (msg.type) {
      case updateTypes.Edit: {
        const msgPatch = dmp.patch_fromText(msg.patch);
        let content = '';
        let versionDelta = 1;

        if (msg.version <= this.version) {
          [content] = dmp.patch_apply(msgPatch, this.checkpoint);
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
          [content] = dmp.patch_apply(msgPatch, this.conversationDOM.innerHTML);
          this.checkpoint = content;
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
}

function created() {
  this.conversation = this.conversations[this.activeConversation];
  try {
    this.ws = new WebSocket(`ws://${process.env.VUE_APP_HOST}/patches/v1/connect/${this.activeConversation}`);
  } catch (err) {
    console.log(`Unable to create WebSocket connection: ${err.message}`);
    return;
  }

  this.ws.onopen = () => {
    console.log('OPEN WS');
    this.ws.send('blah');
  };
  this.ws.onclose = () => {
    console.log('CLOSE WS');
    this.ws = null;
  };
  this.ws.onmessage = (e) => {
    this.parseWSMessage(e);
  };
  this.ws.onerror = (e) => {
    console.log(`ERROR: ${e.data}`);
  };
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
    conversations,
    activeConversation,
  },
  watch: {
    conversations() {
      this.conversation = this.conversations[this.activeConversation];
    },
    activeConversation() {
      this.conversation = this.conversations[this.activeConversation];
    },
  },
  methods: {
    sendPatch,
    parseWSMessage,
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
