const namespaced = true;

const state = {
  type: null,
  message: null,
};

const actions = {
  success({ commit }, message) {
    commit('success', message);
  },
  error({ commit }, message) {
    commit('error', message);
  },
  clear({ commit }) {
    commit('clear');
  },
};

const mutations = {
  success(prevState, message) {
    const newState = prevState;
    newState.type = 'alert-success';
    newState.message = message;
  },
  error(prevState, message) {
    const newState = prevState;
    newState.type = 'alert-danger';
    newState.message = message;
  },
  clear(prevState) {
    const newState = prevState;
    newState.type = null;
    newState.message = null;
  },
};

export default {
  namespaced,
  state,
  actions,
  mutations,
};
