<template>
  <div class="conversation" v-on:click="handleClick">
    <div class="header">
      <div class="header-content">
        <div class="header-info">
          <img
            class="avatar"
            v-bind:src="conversation.metadata.avatar_url"
          >
          <div>
            <h1>{{ conversation.metadata.name }}</h1>
            <h2 v-show="conversation.metadata.last_modified_display">
              last modified {{ conversation.metadata.last_modified_display }}
            </h2>
          </div>
        </div>
        <div class="header-options">
          <AddUser id="add-user-btn" v-on:click="addUser = !addUser"/>
        </div>
      </div>
    </div>
    <AddUserMenu v-if="addUser"/>
    <div id="conversation-container">
      <div
        id="conversation-body"
        class="body"
        contenteditable="true"
        v-on:input="handleInput"
      >
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex';
import { WSException, DOMElement } from '../services/models';
import AddUser from '../assets/person_add-24px.svg';
import AddUserMenu from './AddUserMenu.vue';

const data = () => ({
  addUser: false,
});

/* Vue instance computed functions */
function activeConversation() {
  return parseInt(this.$route.params.id, 10);
}

/* Vue instance lifecycle hooks */
function mounted() {
  const el = new DOMElement(this.$el.querySelector('#conversation-body'));
  document.onselectionchange = this.handleSelectionChange;
  this.open({ id: this.activeConversation, token: this.user.token, el });
}

function destroyed() {
  document.onselectionchange = () => {};
}

export default {
  name: 'Conversation',
  components: {
    AddUser,
    AddUserMenu,
  },
  data,
  mounted,
  destroyed,
  computed: {
    ...mapState('user', ['user']),
    ...mapState('conversations', ['conversations', 'conversation', 'status']),
    activeConversation,
  },
  watch: {
    activeConversation() {
      const el = new DOMElement(this.$el.querySelector('#conversation-body'));
      if (this.conversation.ws) {
        this.close(WSException.GOING_AWAY);
      }
      this.open({ id: this.activeConversation, token: this.user.token, el });
    },
    conversation() {
      console.log('conversation:');
      console.log({ ...this.conversation });
    },
    status() {
      console.log('status:');
      console.log({ ...this.status });
    },
  },
  methods: {
    ...mapActions('conversations', ['open']),
    ...mapMutations('conversations', [
      'setConversation',
      'setDOMElement',
      'handleInput',
      'handleSelectionChange',
      'close',
    ]),
    handleClick(e) {
      this.conversation.el.active = this.conversation.el.contains(e.target);
      if (this.addUser) {
        const btn = this.$el.querySelector('#add-user-btn');
        const menu = this.$el.querySelector('#add-user-menu');
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
          this.addUser = false;
        }
      }
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
