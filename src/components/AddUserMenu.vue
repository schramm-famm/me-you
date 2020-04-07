<template>
  <div class="popup-menu">
    <form @submit.prevent="handleAddUser">
      <div class="form-group" v-bind:class="{ invalid: submitted && missingEmail }">
        <input
          type="text"
          placeholder="Email"
          v-model="email"
          :class="{ 'is-invalid': submitted && missingEmail }"
        />
        <div v-show="submitted && missingEmail" class="error">Email is required</div>
      </div>
      <div class="form-group">
        <div class="check-input">
          <input
            type="checkbox"
            id="admin"
            value="admin"
            v-model="admin"
          >
          <label for="admin">Admin</label><br>
        </div>
      </div>
      <div class="form-group">
        <button type="submit" :disabled="status.addUserRequest">
          Add User
        </button>
      </div>
    </form>
    <p v-if="alert.addUserToConv && alert.addUserToConv.type === 'alert-danger'" class="error">
      {{ alert.addUserToConv.message }}
    </p>
    <p v-if="alert.addUserToConv && alert.addUserToConv.type === 'alert-success'" class="success">
      {{ alert.addUserToConv.message }}
    </p>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

const data = () => ({
  email: '',
  admin: false,
  submitted: false,
  missingEmail: false,
});

function destroyed() {
  this.clear('addUserToConv');
}

export default {
  name: 'AddUserMenu',
  data,
  destroyed,
  computed: {
    ...mapState('conversations', ['status', 'conversation']),
    ...mapState({
      alert: (state) => state.alert,
    }),
  },
  methods: {
    ...mapActions('conversations', ['addUser']),
    ...mapActions('alert', ['clear']),
    handleAddUser() {
      this.submitted = true;
      const { email, admin } = this;
      if (email) {
        this.addUser({
          conversationID: this.conversation.metadata.id,
          email,
          role: admin ? 'admin' : 'user',
        });
        this.email = '';
        this.admin = false;
      } else {
        this.missingEmail = true;
      }
    },
  },
};
</script>
