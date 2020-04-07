<template>
  <div
    class="conversation-item"
    v-on:click="setConversation"
    v-bind:class="{ active: activeConversation === id }"
  >
    <h1>{{ conversation.name }}</h1>
    <h2>{{ conversation.last_modified_display }}</h2>
  </div>
</template>

<script>
import { mapState } from 'vuex';

const data = () => ({
  conversation: null,
});

function setConversation() {
  if (this.activeConversation !== this.$props.id) {
    this.$router.push(`/conversations/${this.$props.id}`);
  }
}

function activeConversation() {
  return parseInt(this.$route.params.id, 10);
}

function created() {
  this.conversation = this.conversations[this.$props.id];
}

export default {
  name: 'ConversationItem',
  props: ['id'],
  data,
  created,
  methods: {
    setConversation,
  },
  computed: {
    ...mapState('conversations', ['conversations']),
    activeConversation,
  },
  watch: {
    conversations() {
      this.conversation = this.conversations[this.$props.id];
    },
  },
};
</script>

<style>
.conversation-item {
  width: 100%;
  height: 4em;
  font-size: 10pt;
  padding: 0.5em;
  border-bottom: solid lightgrey thin;
}

.conversation-item:hover {
  cursor: pointer;
}
</style>
