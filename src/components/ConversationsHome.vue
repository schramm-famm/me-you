<template>
  <div class="conversations-home">
    <div class="header">
    </div>
    <div class="welcome">
      <p>Welcome to riht.</p>
      <div v-if="alert.openWS && alert.openWS.type === 'alert-danger'" class="error">
        {{ alert.openWS.message }}
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'ConversationsHome',
  computed: {
    ...mapState(['alert']),
  },
};
</script>

<style scoped>
.conversations-home {
  display: flex;
  flex: 1;
  flex-direction: column;
}
</style>
