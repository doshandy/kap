/* eslint-disable no-undef */
/**
 * KAP self-destruct Service Worker
 * ---------------------------------
 * 用途：
 *   线上发现旧 vite-plugin-pwa 生成的 SW（v0.17 时代 autoUpdate 模式）已经 install 在
 *   大量用户机器上，并且霸着 fetch handler，导致：即使我们部署了新 HTML，浏览器也只
 *   能拿到 SW 缓存里的旧 chunk。bump cleanup-key 也救不回来——因为根 HTML 本身可能
 *   就被旧 SW 从缓存返回，新 cleanup 脚本永远不会执行。
 *
 * 唯一的可靠出路：让线上 /kap/sw.js 由"workbox 大块头"换成这个**自杀脚本**。
 * 浏览器对 SW 有强制 byte-diff 更新策略——只要 sw.js 字节有变，新 SW 就会被下载、
 * install、activate；activate 后这个脚本会：
 *   1. 接管所有 client（clients.claim）
 *   2. 清空 cache storage 里所有键
 *   3. unregister 自己，让浏览器永远不再有 SW（直到我们重新启用 PWA）
 *   4. 给所有 client 发消息，由 client 主动 reload
 *
 * 发布到线上后，所有打开过 KAP 的浏览器在 24 小时内都会自然触发 SW 更新检查，
 * 拉到这个脚本，进入自愈流程。
 *
 * 等"绝大多数老用户"已自愈（一两周后），可以再决定是否重新启用 vite-plugin-pwa
 * 生成的真正 SW（届时再用 prompt 模式让用户主动确认）。
 */
self.addEventListener('install', (event) => {
  // 立刻 skipWaiting，避免还要等用户关掉所有标签
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (_) {
        /* ignore */
      }
      try {
        await self.clients.claim();
      } catch (_) {
        /* ignore */
      }
      try {
        const all = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        all.forEach((c) => {
          try {
            c.postMessage({ type: 'kap-sw-self-destruct' });
          } catch (_) {
            /* ignore */
          }
        });
      } catch (_) {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch (_) {
        /* ignore */
      }
    })(),
  );
});

// fetch handler 一律走网络，不走缓存。即使在 unregister 还没生效的瞬间也保证拿到最新版本。
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 只代理同源 GET，避免影响 OPTIONS / 跨域
  if (req.method !== 'GET') return;
  event.respondWith(fetch(req).catch(() => new Response('', { status: 504 })));
});
