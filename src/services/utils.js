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

const isArray = (a) => Array.isArray(a);

const isObject = (o) => (
  o === Object(o) && !isArray(o) && typeof o !== 'function'
);

const toCamel = (s) => s.replace(
  /([_][a-z])/ig,
  ($1) => $1.toUpperCase().replace('_', ''),
);

const toSnake = (s) => s.replace(
  /([A-Z])/g,
  ($1) => `_${$1.toLowerCase()}`,
);

const formatKeys = (o, formatFunc) => {
  if (isObject(o)) {
    const n = {};

    Object.keys(o)
      .forEach((k) => {
        n[formatFunc(k)] = formatKeys(o[k], formatFunc);
      });

    return n;
  }
  if (isArray(o)) {
    return o.map((i) => formatKeys(i, formatFunc));
  }

  return o;
};

export default {
  backend,
  logout,
  handleResponse,
  authHeader,
  toCamel,
  toSnake,
  formatKeys,
};
