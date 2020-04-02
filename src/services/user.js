import { authHeader } from '../utils';

const backend = process.env.VUE_APP_BACKEND;

const handleResponse = (response) => response.text().then((text) => {
  if (!response.ok) {
    if (response.status === 401) {
      return Promise.reject(response.status);
    }
    const error = text || response.statusText;
    return Promise.reject(error);
  }
  return JSON.parse(text);
});

const login = (email, password) => {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  };

  return fetch(`https://${backend}/heimdall/v1/token`, requestOptions)
    .then(handleResponse)
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

const logout = (callback) => {
  localStorage.removeItem('token');
  if (callback) callback();
};

const register = (name, email, password) => {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  };

  return fetch(`https://${backend}/karen/v1/users`, requestOptions)
    .then(handleResponse);
};

const getUser = () => {
  const requestOptions = {
    method: 'GET',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
  };

  return fetch(`https://${backend}/karen/v1/users/self`, requestOptions)
    .then(handleResponse);
};

export default {
  login,
  logout,
  register,
  getUser,
};
