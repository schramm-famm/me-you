const backend = process.env.VUE_APP_BACKEND;

const logout = (callback) => {
  localStorage.removeItem('token');
  if (callback) callback();
};

const handleResponse = (response) => response.text().then((text) => {
  if (!response.ok) {
    if (response.status === 401) {
      logout();
      window.location.reload(true);
    }
    const error = text || response.statusText;
    return Promise.reject(error);
  }
  return JSON.parse(text);
});

/*
  Returns the Authorization header with the JWT token
*/
const authHeader = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export default {
  backend,
  logout,
  handleResponse,
  authHeader,
};
