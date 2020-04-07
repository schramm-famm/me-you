import Vue from 'vue';
import Vuex from 'vuex';
import user from './user';
import alert from './alert';
import conversations from './conversations';

Vue.use(Vuex);

export default new Vuex.Store({
  mutations: {
    addConversation(state, conversation) {
      state.conversations[conversation.id] = conversation;
    },
  },
  modules: {
    user,
    alert,
    conversations,
  },
});
