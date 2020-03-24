<template>
  <div class="landing-page">
    <Login/>
  </div>
</template>

<script>
import Login from '../components/auth/Login.vue';

export default {
  name: 'Conversations',
  components: {
    Login,
  },
};
</script>
