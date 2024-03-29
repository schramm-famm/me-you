import { userService, utilsService } from '../services';
import router from '../router';

const token = localStorage.getItem('token');

const namespaced = true;

const state = token
  ? { status: { loggedIn: true }, user: { token } }
  : { status: {}, user: null };

/* Actions */
const login = ({ dispatch, commit }, { email, password, path }) => {
  commit('loginRequest', { email });

  userService.login(email, password)
    .then((loginToken) => {
      commit('loginSuccess', loginToken);
      router.replace(path || '/conversations');
    })
    .catch((error) => {
      commit('loginFailure', error);
      dispatch('alert/error', { key: 'login', message: error }, { root: true });
    });
};

const logout = ({ commit }) => {
  utilsService.logout(() => router.push('/'));
  commit('logoutSuccess');
};

const register = ({ dispatch, commit }, { name, email, password }) => {
  commit('registerRequest');

  userService.register(name, email, password)
    .then(() => {
      commit('registerSuccess');
      router.replace('/');
    })
    .catch((error) => {
      commit('registerFailure', error);
      dispatch('alert/error', { key: 'register', message: error }, { root: true });
    });
};

const getUser = ({ dispatch, commit }) => {
  commit('getUserRequest');

  userService.getUser()
    .then((user) => {
      commit('getUserSuccess', user);
    })
    .catch((error) => {
      commit('getUserFailure', error);
      dispatch('alert/error', { key: 'getUser', message: error }, { root: true });
    });
};

const actions = {
  login,
  logout,
  register,
  getUser,
};

/* Mutations */
const loginRequest = (currState, email) => {
  const newState = currState;
  newState.status = { loggingIn: true };
  newState.user = { email };
};

const loginSuccess = (currState, loginToken) => {
  const newState = currState;
  newState.status = { loggedIn: true };
  newState.user.token = loginToken;
};

const loginFailure = (currState) => {
  const newState = currState;
  newState.status = {};
  newState.user = null;
};

const logoutSuccess = (currState) => {
  const newState = currState;
  newState.status = {};
  newState.user = null;
};

const registerRequest = (currState) => {
  const newState = currState;
  newState.status = { registering: true };
};

const registerSuccess = (currState) => {
  const newState = currState;
  newState.status = {};
};

const registerFailure = (currState) => {
  const newState = currState;
  newState.status = {};
};

const getUserRequest = (currState) => {
  const newState = currState;
  newState.status = { getting: true };
};

const getUserSuccess = (currState, user) => {
  const newState = currState;
  newState.status = {};
  newState.user = { ...newState.user, ...user };
};

const getUserFailure = (currState) => {
  const newState = currState;
  newState.status = {};
  newState.user = null;
};

const mutations = {
  loginRequest,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  registerRequest,
  registerSuccess,
  registerFailure,
  getUserRequest,
  getUserSuccess,
  getUserFailure,
};

export default {
  namespaced,
  state,
  actions,
  mutations,
};
