function pretendRequest(email, pass, callback) {
  setTimeout(() => {
    if (email === 'joe@example.com' && pass === 'password1') {
      callback({
        authenticated: true,
        token: Math.random().toString(36).substring(7),
      });
    } else {
      callback({ authenticated: false });
    }
  }, 0);
}

export default {
  login(email, pass, callback) {
    if (localStorage.getItem('token')) {
      if (callback) callback(true);
      this.onChange(true);
      return;
    }
    pretendRequest(email, pass, (res) => {
      if (res.authenticated) {
        localStorage.setItem('token', res.token);
        if (callback) callback(true);
        this.onChange(true);
      } else {
        if (callback) callback(false);
        this.onChange(false);
      }
    });
  },

  getToken() {
    return localStorage.getItem('token');
  },

  logout(callback) {
    localStorage.removeItem('token');
    if (callback) callback();
    this.onChange(false);
  },

  loggedIn() {
    return !!localStorage.getItem('token');
  },

  onChange() {},
};
