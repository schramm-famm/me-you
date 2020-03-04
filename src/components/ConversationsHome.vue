<template>
  <div class="conversations-home">
    <div class="header">
    </div>
    <div class="welcome">
      <p>Welcome to riht.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConversationsHome',
};
</script>

<style scoped>
.conversations-home {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.welcome {
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
}
</style>
