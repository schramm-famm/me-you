<template>
  <div class="login">
    <div >
      <h2>Register</h2>
      <form @submit.prevent="register">
        <label><input v-model="name" placeholder="name"></label><br/>
        <label><input v-model="email" placeholder="email"></label><br/>
        <label><input v-model="pass" placeholder="password" type="password"></label><br/>
        <button type="submit">register</button>
        <p v-if="error" class="error">Bad registration information</p>
      </form>
      <router-link to="/">login</router-link>
    </div>
  </div>
</template>

<script>
const data = () => ({
  name: '',
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
    register() {
      // Should make a call to Karen.
      console.log('register');
    },
  },
};
</script>

<style scoped>
</style>
