<template>
  <div class="popup-menu">
    <div v-on:click="handleLogout">Logout</div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'MoreMenu',
  methods: {
    ...mapActions('user', ['logout']),
    handleLogout() {
      this.logout();
    },
  },
};
</script>
