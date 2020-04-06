import DiffMatchPatch from 'diff-match-patch';

import { convService, userService, wsService } from '../services';
import {
  WSException,
  Caret,
  ActiveUser,
  Delta,
  Update,
} from '../services/models';

const conversationState = {
  dmp: new DiffMatchPatch(),
  activeUsers: {},
  caret: new Caret(0, 0),
  checkpoint: {
    content: '',
    version: {},
    latest: -1,
  },
  colourList: [...ActiveUser.colours],
  content: '',
  el: null,
  metadata: {},
  patchBuffer: [],
  textSize: 0,
  ws: null,
  version: -1,
};

const state = {
  status: {},
  conversations: {},
  conversationsSorted: [],
  conversation: { ...conversationState },
};

const getDisplayTime = (lastModifiedStr) => {
  const lastModifiedDate = new Date(`${lastModifiedStr}Z`);
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
      const conversationsSorted = [];
      conversationsList.forEach((c) => {
        const newConversation = c;
        newConversation.last_modified_display = getDisplayTime(c.last_modified);
        conversations[c.id] = newConversation;
        conversationsSorted.push(c.id);
      });

      commit('getAllSuccess', { conversations, conversationsSorted });
      dispatch('alert/success', { key: 'getAllConv', message: 'Got all conversations' }, { root: true });
    })
    .catch((error) => {
      commit('getAllFailure');
      dispatch('alert/error', { key: 'getAllConv', message: error }, { root: true });
    });
};

const create = ({ dispatch, commit }, { name, description, avatarURL }) => {
  commit('createRequest');

  convService.create(name, description, avatarURL)
    .then(() => dispatch('getAll'))
    .then(() => {
      commit('createSuccess');
      dispatch('alert/success', { key: 'createConv', message: 'Created conversation' }, { root: true });
    })
    .catch((error) => {
      commit('createFailure');
      dispatch('alert/error', { key: 'createConv', message: error }, { root: true });
    });
};

const addUser = ({ dispatch, commit }, { conversationID, email, role }) => {
  commit('addUserRequest');

  userService.getUserByEmail(email)
    .then((json) => convService.addUser(conversationID, json.id, role))
    .then(() => {
      commit('addUserSuccess');
      dispatch('alert/success', { key: 'addUserToConv', message: 'Added a user to conversation' }, { root: true });
    })
    .catch((error) => {
      commit('addUserFailure');
      dispatch('alert/error', { key: 'addUserToConv', message: error }, { root: true });
    });
};

const open = ({ dispatch, commit }, { id, token, el }) => {
  commit('openRequest', id);

  wsService.connect(id)
    .then((resp) => {
      const ws = resp;

      ws.onopen = () => {
        console.log(`OPEN CONVERSATION_${id} WS`);
        ws.send(token);
        commit('openSuccess', { ws, id, el });
      };
      ws.onclose = (e) => {
        commit('closeSuccess', e);
      };
      ws.onmessage = (e) => {
        try {
          commit('handleMessage', e);
        } catch (error) {
          console.log('failed to handle message');
          console.log(error);
          if (error instanceof WSException) {
            ws.close(error.code, error.message);
          } else {
            ws.close(WSException.INTERNAL_ERROR, error.message);
          }
          dispatch('alert/error', { key: 'openWS', message: error.message }, { root: true });
        }
      };
      ws.onerror = (e) => {
        console.log(`ERROR: ${e.data}`);
      };
      return ws;
    })
    .catch((error) => {
      console.log(error);
      commit('openFailure');
      dispatch('alert/error', { key: 'openWS', message: error }, { root: true });
    });
};

const actions = {
  getAll,
  create,
  addUser,
  open,
};

const getAllRequest = (currState) => {
  console.log('getAllRequest');
  const newState = currState;
  newState.status = { gettingConvs: true };
};

const getAllSuccess = (currState, { conversations, conversationsSorted }) => {
  console.log('getAllSuccess');
  const newState = currState;
  newState.status = { gotConvs: true };
  newState.conversations = conversations;
  newState.conversationsSorted = conversationsSorted;

  const { id } = newState.conversation.metadata;
  if (id) {
    newState.conversation = { ...newState.conversation, metadata: conversations[id] };
  }
};

const getAllFailure = (currState) => {
  console.log('getAllFailure');
  const newState = currState;
  newState.status = {};
  newState.conversations = {};
};

const createRequest = (currState) => {
  console.log('createRequest');
  const newState = currState;
  newState.status = { gettingConvs: true };
};

const createSuccess = (currState) => {
  console.log('createSuccess');
  const newState = currState;
  newState.status = { createdConvs: true };
};

const createFailure = (currState) => {
  console.log('createFailure');
  const newState = currState;
  newState.status = {};
};

const addUserRequest = (currState) => {
  console.log('addUserRequest');
  const newState = currState;
  newState.status = { addingUser: true };
};

const addUserSuccess = (currState) => {
  console.log('addUserSuccess');
  const newState = currState;
  newState.status = { addedUser: true };
};

const addUserFailure = (currState) => {
  console.log('addUserFailure');
  const newState = currState;
  newState.status = {};
};

const updateDisplayTime = (currState) => {
  console.log('updating display time');
  const newState = currState;
  const { conversations } = newState;
  Object.keys(conversations).forEach((id) => {
    const conversation = conversations[id];
    conversation.last_modified_display = getDisplayTime(conversation.last_modified);
  });
  newState.conversations = { ...conversations };
  if (newState.conversation.metadata) {
    newState.conversation = {
      ...newState.conversation,
      metadata: conversations[newState.conversation.metadata.id],
    };
  }
};

const getOneSuccess = (currState, conversation) => {
  console.log('getOneSuccess');
  const newState = currState;
  newState.status = { gotConv: true };
  newState.conversations[conversation.id] = conversation;
};

const openRequest = (currState, id) => {
  console.log('openRequest');
  const newState = currState;
  newState.status = { opening: true };
  const metadata = newState.conversations[id] || { id };
  newState.conversation = { ...newState.conversation, metadata };
};

const openSuccess = (currState, { ws, id, el }) => {
  console.log('openSuccess');
  const newState = currState;
  newState.status = { opened: true };
  const metadata = newState.conversations[id] || { id };
  newState.conversation = {
    ...newState.conversation,
    ws,
    metadata,
    el,
  };
};

const openFailure = (currState) => {
  console.log('openFailure');
  const newState = currState;
  newState.status = {};
};

const setDOMElement = (currState, el) => {
  console.log('setDOMElement');
  const newState = currState;
  newState.conversation = { ...newState.conversation, el };
};

const handleSelectionChange = (currState) => {
  console.log('handleSelectionChange');
  const newState = currState;
  const { conversation } = newState;

  if (!conversation.el.isActive()) {
    return;
  }

  const newCaret = conversation.el.getCaretPosition();
  const delta = new Delta(
    newCaret.start - conversation.caret.start,
    newCaret.end - conversation.caret.end,
  );

  // Prevent empty caret updates from being sent
  if (delta.caretStart === 0 && delta.caretEnd === 0) {
    return;
  }

  const update = new Update(Update.types.Caret, delta, conversation.version);
  update.send(conversation.ws);

  if (conversation.checkpoint.latest === conversation.version) {
    conversation.checkpoint.version[conversation.version].selfCaret = newCaret.copy();
  }

  conversation.caret = newCaret.copy();

  newState.conversation = { ...conversation };
};

const handleInput = (currState) => {
  console.log('handleInput');
  const newState = currState;
  const {
    el,
    content,
    dmp,
    caret,
    textSize,
    ws,
    patchBuffer,
    activeUsers,
  } = newState.conversation;
  let { version } = newState.conversation;

  el.removeAllHighlights();

  if (content === '' || content === '<br>') {
    el.setInnerHTML(`<div>${el.innerHTML}</div>`);
  }
  const patches = dmp.patch_make(content, el.innerHTML);

  const newCaret = el.getCaretPosition();
  const newTextSize = el.getTextSize();

  const delta = new Delta(
    newCaret.start - caret.start,
    newCaret.end - caret.end,
    newTextSize - textSize,
  );

  // Send an Edit Update message for each patch
  let firstPatch = true;
  patches.forEach((patch) => {
    version += 1;

    const patchStr = dmp.patch_toText([patch]);
    if (patchStr === '') {
      return;
    }

    const updateDelta = firstPatch ? delta : new Delta(0, 0, 0);
    const update = new Update(
      Update.types.Edit,
      updateDelta,
      version,
      patchStr,
    );
    update.send(ws);

    patchBuffer.push({ patchStr, delta });
    firstPatch = false;
  });

  // Shift each active users' caret position and update the DOM with the new
  // position
  Object.keys(activeUsers).forEach((user) => {
    activeUsers[user].caret.shiftCaret(caret, delta);
    el.setActiveUserCaret(activeUsers[user]);
  });

  newState.conversation = {
    ...newState.conversation,
    version,
    activeUsers,
    caret: newCaret,
    textSize: newTextSize,
    content: el.innerHTML,
  };
};

const handleMessage = (currState, e) => {
  console.log('handleMessage');
  console.log(e);
  const newState = currState;
  const msg = wsService.parseMessage(e.data);
  const conversation = msg.handle(newState.conversation);
  newState.conversation = { ...conversation };
};

const close = (currState, reason) => {
  console.log(`close: closing because ${reason}`);
  currState.conversation.ws.close(reason);
};

const closeSuccess = (currState, e) => {
  console.log('closeSuccess');
  console.log(e);
  console.log(`Closed WebSocket connection for conversation ${currState.conversation.metadata.id}: ${e.reason}`);

  const newState = currState;
  Object.values(newState.conversation.activeUsers).forEach((activeUser) => {
    newState.conversation.el.removeActiveUserCaret(activeUser);
  });

  newState.conversation = { ...conversationState };
};

const mutations = {
  getAllRequest,
  getAllSuccess,
  getAllFailure,
  createRequest,
  createSuccess,
  createFailure,
  addUserRequest,
  addUserSuccess,
  addUserFailure,
  getOneSuccess,
  updateDisplayTime,
  openRequest,
  openSuccess,
  openFailure,
  setDOMElement,
  handleMessage,
  handleInput,
  handleSelectionChange,
  close,
  closeSuccess,
};

export default {
  namespaced: true,
  state,
  actions,
  mutations,
};
