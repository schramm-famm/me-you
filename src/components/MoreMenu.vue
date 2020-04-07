<template>
  <div class="popup-menu">
    <div v-on:click="handleLogout" class="popup-button">Logout</div>
  </div>
</template>

<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import { WSException } from '../services/models';

export default {
  name: 'MoreMenu',
  computed: {
    ...mapState('conversations', ['conversation']),
  },
  methods: {
    ...mapActions('user', ['logout']),
    ...mapMutations('conversations', ['close']),
    handleLogout() {
      if (this.conversation.ws) {
        this.close(WSException.GOING_AWAY);
      }
      this.logout();
    },
  },
};
</script>
