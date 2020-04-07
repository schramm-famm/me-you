const login = () => {
  localStorage.setItem('token', 'token');
  return Promise.resolve({ token: 'token' });
};

const register = () => {};

const getUser = () => Promise.resolve({
  name: 'Thao',
  avatar_url: 'https://i.redd.it/o6i20msl7wcz.jpg',
});

export default {
  login,
  register,
  getUser,
};
