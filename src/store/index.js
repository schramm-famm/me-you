import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    user: null,
    activeConversation: null,
    conversations: {},
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setActiveConversation(state, id) {
      state.activeConversation = id;
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
