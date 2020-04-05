import Vue from 'vue';
import VueRouter from 'vue-router';
import Conversations from '../views/Conversations.vue';
import Conversation from '../components/Conversation.vue';
import ConversationsHome from '../components/ConversationsHome.vue';
import LandingPage from '../views/LandingPage.vue';
import Login from '../components/Login.vue';
import Register from '../components/Register.vue';
import { userService } from '../services';

Vue.use(VueRouter);

const checkAuth = (to, from, next) => {
  const publicPages = ['/', '/register'];
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = !!localStorage.getItem('token');
  if (authRequired && !loggedIn) {
    next({
      path: '/',
      query: { redirect: to.fullPath },
    });
  } else if (!authRequired && loggedIn) {
    next('/conversations');
  } else {
    next();
  }
};

const routes = [
  {
    path: '/',
    component: LandingPage,
    beforeEnter: checkAuth,
    children: [
      {
        path: '',
        component: Login,
      },
      {
        path: 'register',
        component: Register,
      },
    ],
  },
  {
    path: '/conversations',
    component: Conversations,
    beforeEnter: checkAuth,
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
  {
    path: '/logout',
    beforeEnter: (to, from, next) => {
      userService.logout(() => next('/'));
    },
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
