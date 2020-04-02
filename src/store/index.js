import Vue from 'vue';
import Vuex from 'vuex';
import user from './user';
import alert from './alert';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    conversations: {},
    backend: process.env.VUE_APP_BACKEND,
  },
  mutations: {
    addConversation(state, conversation) {
      state.conversations[conversation.id] = conversation;
    },
  },
  modules: {
    user,
    alert,
  },
});
