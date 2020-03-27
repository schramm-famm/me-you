// Code for actually calling Heimdall
/*
function handleResponse(response) {
  return response.text().then((text) => {
    if (!response.ok) {
      const error = text || response.statusText;
      return Promise.reject(error);
    }
    return JSON.parse(text);
  });
}

function login(email, pass) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass }),
  };

  return fetch('http://localhost/heimdall/v1/token', requestOptions)
    .then(handleResponse)
    .then((json) => {
      localStorage.setItem('token', json.token);
    });
}
*/

// Placeholder login() function that always succeeds
function login() {
  localStorage.setItem('token', Math.random().toString(36).substring(7));
  return Promise.resolve(true);
}

function getToken() {
  return localStorage.getItem('token');
}

function logout(callback) {
  localStorage.removeItem('token');
  if (callback) callback();
}

function loggedIn() {
  return !!localStorage.getItem('token');
}

export default {
  login,
  getToken,
  logout,
  loggedIn,
};
