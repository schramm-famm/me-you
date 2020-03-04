import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    user: null,
    conversations: {},
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    addConversation(state, conversation) {
      state.conversations[conversation.id] = conversation;
    },
  },
  actions: {
  },
  modules: {
  },
});
