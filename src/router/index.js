import Vue from 'vue';
import VueRouter from 'vue-router';
import Conversations from '../views/Conversations.vue';
import Conversation from '../components/conversation/Conversation.vue';
import ConversationsHome from '../components/ConversationsHome.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/conversations',
    component: Conversations,
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
