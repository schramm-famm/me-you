import { convService } from '../services';

const state = {
  status: {},
  conversations: {},
  currentConversation: null,
};

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

const getAll = ({ dispatch, commit }) => {
  commit('getAllRequest');

  convService.getAll()
    .then((conversationsList) => {
      const conversations = {};
      conversationsList.forEach((c) => {
        const newConversation = c;
        newConversation.last_modified_display = getDisplayTime(c.last_modified);
        conversations[c.id] = newConversation;
      });
      window.setInterval(() => {
        Object.keys(this.conversations).forEach((id) => {
          const conversation = this.conversations[id];
          conversation.last_modified_display = getDisplayTime(conversation.last_modified);
          commit('getOneSuccess', conversation);
        });
      }, 60000);


      commit('getAllSuccess', conversations);
    })
    .catch((error) => {
      commit('getAllFailure');
      dispatch('alert/error', error, { root: true });
    });
};

const actions = {
  getAll,
};

const getAllRequest = (currState) => {
  const newState = currState;
  newState.status = { gettingConvs: true };
};

const getAllSuccess = (currState, conversations) => {
  const newState = currState;
  newState.status = { gotConvs: true };
  newState.conversations = conversations;
};

const getAllFailure = (currState) => {
  const newState = currState;
  newState.status = {};
  newState.conversations = {};
};

const getOneSuccess = (currState, conversation) => {
  const newState = currState;
  newState.status = { gotConv: true };
  newState.conversations[conversation.id] = conversation;
};

const mutations = {
  getAllRequest,
  getAllSuccess,
  getAllFailure,
  getOneSuccess,
};

export default {
  namespaced: true,
  state,
  actions,
  mutations,
};
