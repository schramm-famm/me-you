<template>
  <div class="login">
    <div >
      <h2>Login</h2>
      <p v-if="$route.query.redirect">
        You need to login first.
      </p>
      <form @submit.prevent="login">
        <label><input v-model="email" placeholder="email"></label>
        <label><input v-model="pass" placeholder="password" type="password"></label>
        <button type="submit">login</button>
        <p v-if="error" class="error">Bad login information</p>
      </form>
    </div>
  </div>
</template>

<script>
import auth from './auth';

const data = () => ({
  email: '',
  pass: '',
  error: false,
});

/* Vue instance computed functions */
function token() {
  return this.$store.state.token;
}

/* Vue instance lifecycle hooks */
function created() {}

function mounted() {}

export default {
  name: 'Login',
  data,
  created,
  mounted,
  computed: {
    token,
  },
  methods: {
    login() {
      auth.login(this.email, this.pass, (loggedIn) => {
        if (!loggedIn) {
          console.log('failed to log in!');
          this.error = true;
        } else {
          console.log('logged in!');
          console.log(this.$route.query.redirect);
          this.$router.replace(this.$route.query.redirect || '/conversations');
        }
      });
    },
  },
};
</script>

<style scoped>
</style>
