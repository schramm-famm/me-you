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
    <div id="conversation-body" class="body" contenteditable="true">
    </div>
  </div>
</template>

<script>
const data = () => ({
  conversation: null,
});

function conversations() {
  return this.$store.state.conversations;
}

function activeConversation() {
  return this.$store.state.activeConversation;
}

function created() {
  this.conversation = this.conversations[this.activeConversation];
}

export default {
  name: 'Conversation',
  data,
  created,
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
