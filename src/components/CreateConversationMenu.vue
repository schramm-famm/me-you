<template>
  <div class="popup-menu">
    <form @submit.prevent="handleCreate">
      <div class="form-group" v-bind:class="{ invalid: submitted && missingName }">
        <input
          type="text"
          placeholder="Name"
          v-model="name"
          :class="{ 'is-invalid': submitted && missingName }"
        />
        <div v-show="submitted && missingName" class="error">Name is required</div>
      </div>
      <div class="form-group">
        <input
          type="text"
          placeholder="Description"
          v-model="description"
        />
      </div>
      <div class="form-group">
        <button type="submit" :disabled="status.createRequest">
          Create Conversation
        </button>
      </div>
    </form>
    <p v-if="alert.createConv && alert.createConv.type === 'alert-danger'" class="error">
      {{ alert.createConv.message }}
    </p>
    <p v-if="alert.createConv && alert.createConv.type === 'alert-success'" class="success">
      {{ alert.createConv.message }}
    </p>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

const data = () => ({
  name: '',
  description: '',
  submitted: false,
  missingName: false,
});

function destroyed() {
  this.clear('createConv');
}

export default {
  name: 'CreateConversationMenu',
  data,
  destroyed,
  computed: {
    ...mapState('conversations', ['status']),
    ...mapState({
      alert: (state) => state.alert,
    }),
  },
  methods: {
    ...mapActions('conversations', ['create']),
    ...mapActions('alert', ['clear']),
    handleCreate() {
      this.submitted = true;
      const { name, description } = this;
      if (name) {
        this.create({ name, description, avatarURL: '' });
        this.name = '';
        this.description = '';
      } else {
        this.missingName = true;
      }
    },
  },
};
</script>
