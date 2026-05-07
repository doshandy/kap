import { createRouter, createWebHistory } from 'vue-router';

const SITE = 'KAP - 前端知识自查';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/Home.vue'),
      meta: { title: '首页 / 仪表盘' },
    },
    {
      path: '/c/:categoryId',
      name: 'category',
      component: () => import('@/pages/Category.vue'),
      props: true,
      meta: { title: '分类' },
    },
    {
      path: '/q/:categoryId/:slug',
      name: 'question',
      component: () => import('@/pages/Question.vue'),
      props: true,
      meta: { title: '题目' },
    },
    {
      path: '/learn',
      name: 'learn',
      component: () => import('@/pages/Learn.vue'),
      meta: { title: '完整学习' },
    },
    {
      path: '/quiz',
      name: 'quiz',
      component: () => import('@/pages/Quiz.vue'),
      meta: { title: '模拟面试' },
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/pages/Review.vue'),
      meta: { title: '间隔复习' },
    },
    {
      path: '/marks',
      name: 'marks',
      component: () => import('@/pages/Marks.vue'),
      meta: { title: '收藏 / 跳过' },
    },
    {
      path: '/roadmap',
      name: 'roadmap',
      component: () => import('@/pages/Roadmap.vue'),
      meta: { title: '学习路线' },
    },
    {
      path: '/changelog',
      name: 'changelog',
      component: () => import('@/pages/Changelog.vue'),
      meta: { title: '更新日志' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/Settings.vue'),
      meta: { title: '设置' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFound.vue'),
      meta: { title: '页面不存在' },
    },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (to.hash) return { el: to.hash, behavior: reduce ? 'auto' : 'smooth' };
    return { top: 0 };
  },
});

router.afterEach((to) => {
  const meta = (to.meta?.title as string) || '';
  document.title = meta ? `${meta} · ${SITE}` : SITE;
});

export default router;
