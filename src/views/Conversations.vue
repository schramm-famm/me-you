<template>
  <div class="conversations">
    <ConversationList/>
    <div class="conversation">
      <router-view/>
    </div>
  </div>
</template>

<script>
import ConversationList from '../components/ConversationList.vue';

export default {
  name: 'Conversations',
  components: {
    ConversationList,
  },
};
</script>

<style>
.conversations {
  flex: 1;
  display: flex;
  flex-direction: row;
}

.conversation {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
