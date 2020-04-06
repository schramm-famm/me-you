<template>
  <div>
    <h1 class="subtitle">Register to get started.</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group" v-bind:class="{ invalid: submitted && !name }">
        <input v-model="name" placeholder="Name">
        <div v-show="submitted && !name" class="error">Name is required</div>
      </div>
      <div class="form-group" v-bind:class="{ invalid: submitted && !email }">
        <input v-model="email" placeholder="Email">
        <div v-show="submitted && !email" class="error">Email is required</div>
      </div>
      <div class="form-group" v-bind:class="{ invalid: submitted && !password }">
        <input v-model="password" placeholder="Password" type="password">
        <div v-show="submitted && !password" class="error">Password is required</div>
      </div>
      <div class="form-group">
        <button type="submit">Register</button>
        <router-link to="/">Login</router-link>
      </div>
    </form>
    <p v-if="alert.register && alert.register.type === 'alert-danger'" class="error">
      {{ alert.register.message }}
    </p>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

const data = () => ({
  name: '',
  email: '',
  password: '',
  submitted: false,
});

/* Vue instance lifecycle hooks */
function created() {}

function mounted() {}

export default {
  name: 'Register',
  data,
  created,
  mounted,
  computed: {
    ...mapState({
      alert: (state) => state.alert,
    }),
    ...mapState('user', ['status']),
  },
  methods: {
    ...mapActions('user', ['register']),
    handleSubmit() {
      this.submitted = true;

      const { name, email, password } = this;
      if (name && email && password) {
        this.register({ name, email, password });
      }
    },
  },
};
</script>

<style scoped>
</style>
