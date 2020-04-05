<template>
  <div>
    <h1 class="subtitle">Login to make things riht.</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group" v-bind:class="{ invalid: submitted && !email }">
        <input
          type="text"
          placeholder="Email"
          v-model="email"
          :class="{ 'is-invalid': submitted && !email }"
        />
        <div v-show="submitted && !email" class="error">Email is required</div>
      </div>
      <div class="form-group" v-bind:class="{ invalid: submitted && !password }">
        <input
          type="password"
          placeholder="Password"
          v-model="password"
          :class="{ 'is-invalid': submitted && !password }"
        />
        <div v-show="submitted && !password" class="error">Password is required</div>
      </div>
      <div class="form-group">
          <button type="submit" :disabled="status.loggingIn">
            Login
          </button>
          <router-link to="/register">Register</router-link>
      </div>
    </form>
    <p v-if="alert.type === 'alert-danger'" class="error">
      {{ alert.message }}
    </p>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

const data = () => ({
  email: '',
  password: '',
  submitted: false,
});

/* Vue instance lifecycle hooks */
function created() {
  if (this.$route.query.redirect) {
    this.error('You need to login first.');
  }
}

function mounted() {}

export default {
  name: 'Login',
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
    ...mapActions('user', ['login']),
    ...mapActions('alert', ['error']),
    handleSubmit() {
      this.submitted = true;
      const { email, password } = this;
      if (email && password) {
        this.login({ email, password, path: this.$route.query.redirect });
      }
    },
  },
};
</script>
