<template>
  <div class="side">
    <div class="header">
      <h1>{{ user.name }}</h1>
      <router-link to="/logout">logout</router-link>
    </div>
    <div class="conversation-list">
      <ConversationItem
        v-for="conversation in conversations"
        :key="conversation.id"
        :id="conversation.id"
      ></ConversationItem>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ConversationItem from './ConversationItem.vue';

function conversations() {
  return this.$store.state.conversations;
}

export default {
  name: 'ConversationList',
  components: {
    ConversationItem,
  },
  computed: {
    ...mapState('user', ['user']),
    conversations,
  },
};
</script>

<style>
.side {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 25%;
  min-width: 7.5em;
  overflow: hidden;
  border-right: solid lightgrey thin;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  overflow: scroll;
}
</style>
