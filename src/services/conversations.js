import utils from './utils';

const getAll = () => {
  const requestOptions = {
    method: 'GET',
    headers: { ...utils.authHeader() },
  };

  return fetch(`https://${utils.backend}/ether/v1/conversations`, requestOptions)
    .then(utils.handleResponse)
    .then((json) => json.conversations);
};

const create = (name, description, avatarURL) => {
  const requestOptions = {
    method: 'POST',
    headers: { ...utils.authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, avatar_url: avatarURL }),
  };
  console.log(requestOptions);

  return fetch(`https://${utils.backend}/ether/v1/conversations`, requestOptions)
    .then(utils.handleResponse);
};

const addUser = (conversationID, userID, role) => {
  const requestOptions = {
    method: 'POST',
    headers: { ...utils.authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationID,
      user_id: userID,
      role,
    }),
  };

  return fetch(`https://${utils.backend}/ether/v1/conversations/${conversationID}/users`, requestOptions)
    .then(utils.handleResponse);
};

export default {
  getAll,
  create,
  addUser,
};
