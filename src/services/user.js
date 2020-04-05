import utils from './utils';

const login = (email, password) => {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  };

  return fetch(`https://${utils.backend}/heimdall/v1/token`, requestOptions)
    .then(utils.handleResponse)
    .then(
      (json) => {
        localStorage.setItem('token', json.token);
        return json.token;
      },
      (err) => {
        console.log(err);
        return Promise.reject(err);
      },
    );
};

const register = (name, email, password) => {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  };

  return fetch(`https://${utils.backend}/karen/v1/users`, requestOptions)
    .then(utils.handleResponse);
};

const getUser = () => {
  const requestOptions = {
    method: 'GET',
    headers: { ...utils.authHeader(), 'Content-Type': 'application/json' },
  };

  return fetch(`https://${utils.backend}/karen/v1/users/self`, requestOptions)
    .then(utils.handleResponse);
};

export default {
  login,
  register,
  getUser,
};
