<template>
  <div class="login">
    <div >
      <h2>Login</h2>
      <p v-if="$route.query.redirect">
        You need to login first.
      </p>
      <form @submit.prevent="login">
        <label><input v-model="email" placeholder="email"></label><br/>
        <label><input v-model="pass" placeholder="password" type="password"></label><br/>
        <button type="submit">login</button>
        <p v-if="error" class="error">Bad login information</p>
      </form>
      <router-link to="/register">register</router-link>
    </div>
  </div>
</template>

<script>
import auth from '../services/auth';
import { debugLog } from '../utils';

const data = () => ({
  email: '',
  pass: '',
  error: false,
});

/* Vue instance lifecycle hooks */
function created() {}

function mounted() {}

export default {
  name: 'Login',
  data,
  created,
  mounted,
  methods: {
    login() {
      auth.login(this.email, this.pass)
        .then(() => {
          console.log('logged in!');
          console.log(this.$route.query.redirect);
          this.$router.replace(this.$route.query.redirect || '/conversations');
        })
        .catch((err) => {
          debugLog(err);
          this.error = true;
        });
    },
  },
};
</script>

<style scoped>
</style>
