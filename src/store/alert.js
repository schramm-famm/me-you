const namespaced = true;

const state = {
  message: {},
};

const actions = {
  success({ commit }, { key, message }) {
    commit('success', { key, message });
  },
  error({ commit }, { key, message }) {
    commit('error', { key, message });
  },
  clear({ commit }, key) {
    commit('clear', key);
  },
};

const mutations = {
  success(prevState, { key, message }) {
    const newState = prevState;
    newState[key] = {
      type: 'alert-success',
      message,
    };
  },
  error(prevState, { key, message }) {
    const newState = prevState;
    newState[key] = {
      type: 'alert-danger',
      message,
    };
  },
  clear(prevState, key) {
    const newState = prevState;
    delete newState[key];
  },
};

export default {
  namespaced,
  state,
  actions,
  mutations,
};
