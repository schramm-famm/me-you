<template>
  <div class="conversations">
    <ConversationList/>
    <div class="conversation">
      <router-view/>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import ConversationList from '../components/ConversationList.vue';

const getDisplayTime = (lastModifiedStr) => {
  const lastModifiedDate = new Date(lastModifiedStr);
  const currDate = new Date();
  const lmYear = lastModifiedDate.getFullYear();
  const lmMonth = lastModifiedDate.getMonth();
  const lmDate = lastModifiedDate.getDate();
  const lmHours = lastModifiedDate.getHours();
  const lmMinutes = lastModifiedDate.getMinutes();
  const yearDelta = currDate.getFullYear() - lmYear;
  const monthDelta = currDate.getMonth() - lmMonth;
  const dateDelta = currDate.getDate() - lmDate;
  const hourDelta = currDate.getHours() - lmHours;
  const minuteDelta = currDate.getMinutes() - lmMinutes;

  if (yearDelta === 0 && monthDelta === 0 && dateDelta < 7) { // Within the week
    if (dateDelta === 0) { // Same day
      if (hourDelta === 0 && minuteDelta < 10) { // Same hour within 10 minutes
        if (minuteDelta === 0) {
          return 'now';
        }
        if (minuteDelta < 3) {
          return 'a couple minutes ago';
        }
        if (minuteDelta < 5) {
          return 'a few minutes ago';
        }
        return 'several minutes ago';
      }

      const meridian = lmHours < 12 ? 'A.M.' : 'P.M.';
      const hours = lmHours === 0 ? 12 : lmHours % 12;
      const minutes = lmMinutes < 10 ? `0${lmMinutes}` : lmMinutes;

      return `${hours}:${minutes} ${meridian}`;
    }

    return lastModifiedDate.getDay();
  }

  return `${lmYear}-${lmMonth}-${lmDate}`;
};

const preloadImage = (imgSrc) => {
  const img = new Image();
  img.src = imgSrc;
};

function created() {
  this.getUser();

  // TODO: Add API call to get all conversations for the user
  const conversationsList = [
    {
      id: 5,
      name: 'Friends',
      avatar_url: 'https://i.redd.it/o6i20msl7wcz.jpg',
      last_modified: (new Date()).toISOString(),
    },
    {
      id: 7,
      name: 'Family',
      avatar_url: 'https://i.redd.it/o6i20msl7wcz.jpg',
      last_modified: '2020-02-29T13:00:01Z',
    },
  ];

  conversationsList.forEach((conversation) => {
    const updatedConversation = conversation;
    updatedConversation.last_modified_display = getDisplayTime(conversation.last_modified);
    this.$store.commit('addConversation', updatedConversation);
    preloadImage(conversation.avatar_url);
  });

  window.setInterval(() => {
    Object.keys(this.conversations).forEach((id) => {
      const conversation = this.conversations[id];
      conversation.last_modified_display = getDisplayTime(conversation.last_modified);
      this.$store.commit('addConversation', conversation);
    });
  }, 60000);
}

function conversations() {
  return this.$store.state.conversations;
}

export default {
  name: 'Conversations',
  components: {
    ConversationList,
  },
  created,
  computed: {
    conversations,
  },
  methods: {
    ...mapActions('user', ['getUser']),
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
