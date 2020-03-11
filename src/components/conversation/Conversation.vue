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
import handlers from './handlers';
import { GOING_AWAY } from './constants';

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
  mixins: [handlers],
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
