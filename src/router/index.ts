import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/pages/Home.vue') },
    {
      path: '/c/:categoryId',
      name: 'category',
      component: () => import('@/pages/Category.vue'),
      props: true,
    },
    {
      path: '/q/:categoryId/:slug',
      name: 'question',
      component: () => import('@/pages/Question.vue'),
      props: true,
    },
    { path: '/quiz', name: 'quiz', component: () => import('@/pages/Quiz.vue') },
    { path: '/review', name: 'review', component: () => import('@/pages/Review.vue') },
    { path: '/roadmap', name: 'roadmap', component: () => import('@/pages/Roadmap.vue') },
    { path: '/changelog', name: 'changelog', component: () => import('@/pages/Changelog.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/pages/Settings.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue') },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

export default router;
