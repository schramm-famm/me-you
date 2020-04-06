<template>
  <div class="side">
    <div class="header">
      <div class="header-content">
        <h1 v-show="!user.avatar_url">{{ user.name }}</h1>
        <img v-show="user.avatar_url" class="avatar" v-bind:src="user.avatar_url">
        <div class="header-options">
          <Add v-on:click="createConversation = !createConversation"/>
          <More v-on:click="more = !more"/>
        </div>
      </div>
    </div>
    <MoreMenu v-show="more" />
    <CreateConversationMenu v-if="createConversation"/>
    <div class="conversation-list">
      <ConversationItem
        v-for="id in conversationsSorted"
        :key="id"
        :id="id"
      ></ConversationItem>
      <div class="welcome" v-show="!conversationsSorted.length">
        Click the '+' to create a conversation!
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex';
import ConversationItem from './ConversationItem.vue';
import MoreMenu from './MoreMenu.vue';
import Add from '../assets/add-24px.svg';
import CreateConversationMenu from './CreateConversationMenu.vue';
import More from '../assets/more_vert-24px.svg';

const data = () => ({
  more: false,
  createConversation: false,
  intervalID: 0,
});

function created() {
  this.getAll();
  this.getUser();
  this.intervalID = window.setInterval(this.updateDisplayTime, 60000);
}

function destroyed() {
  // Stop updating conversation display times
  window.clearInterval(this.intervalID);
}

export default {
  name: 'ConversationList',
  components: {
    ConversationItem,
    Add,
    More,
    MoreMenu,
    CreateConversationMenu,
  },
  data,
  created,
  destroyed,
  computed: {
    ...mapState('user', ['user']),
    ...mapState('conversations', ['conversationsSorted']),
  },
  methods: {
    ...mapActions('conversations', ['getAll']),
    ...mapActions('user', ['getUser']),
    ...mapMutations('conversations', ['updateDisplayTime']),
  },
};
</script>

<style>
.side {
  position: relative;
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
