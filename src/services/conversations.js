import utils from './utils';

const getAll = () => {
  const requestOptions = {
    method: 'GET',
    headers: { ...utils.authHeader(), 'Content-Type': 'application/json' },
  };

  return fetch(`https://${utils.backend}/ether/v1/conversations`, requestOptions)
    .then(utils.handleResponse)
    .then((json) => json.conversations);
};

export default {
  getAll,
};
