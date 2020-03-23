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
    <div id="conversation-container">
      <div
        id="conversation-body"
        class="body"
        contenteditable="true"
        v-on:input="sendPatch"
      >
      </div>
    </div>
  </div>
</template>

<script>
import handlers from './handlers';
import { GOING_AWAY, userColours } from './constants';

const data = () => ({
  ws: null,
  conversation: {},
  checkpoint: {
    version: {},
    latest: -1,
    content: '',
  },
  version: -1,
  content: '',
  textSize: 0,
  patchBuffer: [],
  activeUsers: {},
  caret: {
    start: 0,
    end: 0,
  },
  colourList: userColours.slice(),
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
}

function mounted() {
  this.conversationDOM = this.$el.querySelector('#conversation-body');
  document.onselectionchange = this.handleSelectionChange;
  this.connectWebSocket();
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

#conversation-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  width: 100%;
  overflow: scroll;
}

.body {
  display: inline-block;
  padding: 1em;
  height: 100%;
  color: black;
  font-size: 12pt;
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
}

.body:focus {
  outline: 0px solid transparent;
}
</style>
