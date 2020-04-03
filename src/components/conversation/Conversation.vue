<template>
  <div class="conversation">
    <div class="header">
      <div class="header-content">
        <div class="header-info">
          <img class="avatar" v-bind:src="conversation.avatar_url">
          <div>
            <h1>{{ conversation.name }}</h1>
            <h2>last modified {{ conversation.last_modified_display }}</h2>
          </div>
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
import { mapState } from 'vuex';
import handlers from './handlers';
import { GOING_AWAY, userColours } from './constants';
import { utilsService } from '../../services';

const data = () => ({
  ws: null, // WebSocket object
  conversation: {}, // Conversation metadata
  checkpoint: {
    version: {}, // Map, version -> checkpoint
    latest: -1, // Latest checkpoint version
    content: '', // Latest checkpoint content
  },
  version: -1, // Current conversation version
  content: '', // Current conversation content
  textSize: 0, // Current conversation content text size
  patchBuffer: [], // Buffer of patches awaiting acknowledgement
  activeUsers: {}, // Map, userID -> caret position
  caret: { // Current client caret position
    start: 0,
    end: 0,
  },
  colourList: userColours.slice(), // List of colours to use for active users
  backend: utilsService.backend,
});

/* Vue instance computed functions */
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
    ...mapState('user', ['user']),
    ...mapState('conversations', ['conversations']),
    activeConversation,
  },
  watch: {
    conversations() {
      this.conversation = this.conversations[this.activeConversation];
    },
    activeConversation() {
      this.ws.close(GOING_AWAY);
      this.connectWebSocket(this.backend);
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
