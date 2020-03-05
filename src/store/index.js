import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    user: null,
    token: '',
    conversations: {},
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    setToken(state, token) {
      state.token = token;
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
