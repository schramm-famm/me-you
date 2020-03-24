import Vue from 'vue';
import VueRouter from 'vue-router';
import Conversations from '../views/Conversations.vue';
import Conversation from '../components/conversation/Conversation.vue';
import ConversationsHome from '../components/ConversationsHome.vue';
import LandingPage from '../views/LandingPage.vue';
import auth from '../components/auth/auth';

Vue.use(VueRouter);

function requireAuth(to, from, next) {
  if (!auth.loggedIn()) {
    next({
      path: '/',
      query: { redirect: to.fullPath },
    });
  } else {
    next();
  }
}

function checkLoggedIn(to, from, next) {
  if (auth.loggedIn()) {
    next({
      path: '/conversations',
    });
  } else {
    next();
  }
}

const routes = [
  {
    path: '/',
    component: LandingPage,
    beforeEnter: checkLoggedIn,
  },
  {
    path: '/conversations',
    component: Conversations,
    beforeEnter: requireAuth,
    children: [
      {
        path: '',
        component: ConversationsHome,
      },
      {
        path: ':id',
        component: Conversation,
      },
    ],
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
