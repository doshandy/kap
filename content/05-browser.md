---
id: 05-browser
title: 浏览器原理
order: 5
icon: 🌐
description: 从 URL 到渲染、存储、事件循环、Service Worker、性能与调试工具。
---

## url-to-render

title: 从输入 URL 到页面显示，浏览器经历了什么
followups: [url-to-render-followup-1, url-to-render-followup-2, url-to-render-followup-3]
difficulty: 基础
tags: [流程, 渲染]

### 一句话

DNS 解析 → 建连（TCP/TLS）→ 发请求拿 HTML → 解析 HTML 同时下载 CSS/JS → 构建 DOM/CSSOM → 合并 Render Tree → 布局 → 绘制 → 合成上屏。

### 题目

请按时间顺序描述从输入 URL 到页面可交互的大致流程。

### 答案要点

- 解析 URL，查缓存和 DNS，建立 TCP/TLS 连接
- 发送 HTTP 请求，服务端返回 HTML
- 浏览器边下载边解析 HTML，构建 DOM；遇到 CSS 构建 CSSOM；遇到同步脚本可能阻塞解析，`defer` / `type="module"` 与 `async` 的时机又不同
- DOM + CSSOM 生成 Render Tree，之后做 Layout、Paint、Composite
- JS 执行、事件绑定、异步数据请求完成后，页面逐渐进入可交互状态

### 代码示例

```html
<!-- 影响关键路径的几种脚本加载方式 -->
<script src="a.js"></script>
<!-- 阻塞解析与执行 -->
<script src="b.js" defer></script>
<!-- 不阻塞解析，DOMContentLoaded 前按序执行 -->
<script src="c.js" async></script>
<!-- 不阻塞解析，下载完立即执行（顺序不保证） -->
<script type="module" src="d.js"></script>
<!-- 默认 defer 行为 -->

<!-- 提前建立连接 -->
<link rel="preconnect" href="https://api.example.com" crossorigin />
<link rel="dns-prefetch" href="https://cdn.example.com" />

<!-- 关键资源预加载 -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
```

```ts
// 测量真实流程的关键节点
addEventListener('DOMContentLoaded', () => console.log('DCL'));
addEventListener('load', () => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  console.log('TTFB', nav.responseStart - nav.requestStart);
  console.log('DCL', nav.domContentLoadedEventEnd);
  console.log('Load', nav.loadEventEnd);
});
```

### 常见误区

- DNS 查询不只是浏览器一层：操作系统、路由器、ISP 都有 cache
- TCP 三次握手只在没复用连接时发生；HTTP/2 多路复用同 TCP
- 渲染管线里 layout 和 paint 不是每次都触发——只读样式（getBoundingClientRect）会强制 reflow

### 追问

- HTTPS 握手具体几个 RTT，TLS 1.3 优化了什么
- preconnect / dns-prefetch / preload 的执行顺序
- LCP 的衡量对象通常是哪些元素

### 延伸

- 首屏性能优化的本质，就是缩短这条关键路径上的阻塞链
- 真正的"可交互"不等于"首屏内容出现"
- 浏览器通常还有预加载扫描器等并行优化机制，所以"严格串行流程图"只是帮助理解的简化模型

## render-pipeline

title: DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系
followups: [render-pipeline-followup-1, render-pipeline-followup-2, render-pipeline-followup-3]
links: [08-performance/core-web-vitals]
difficulty: 进阶
tags: [渲染, 性能]

### 一句话

DOM + CSSOM → Render Tree → Layout（算位置）→ Paint（画图层）→ Composite（GPU 合成）。改 transform/opacity 只走最后两步，所以最便宜。

### 题目

什么操作会触发回流、重绘和合成？为什么 transform/opacity 常被认为更高性能？

### 答案要点

- 回流（layout/reflow）是重新计算几何信息；重绘（paint）是重新绘制像素；合成（composite）是图层拼接
- 修改尺寸、位置、字体、内容等更容易触发回流
- 颜色、背景等可能只触发重绘
- `transform` / `opacity` 通常只影响合成阶段，因此更适合动画

### 代码示例

```ts
// ❌ 反例：读写交错触发多次强制布局
function bad(items: HTMLElement[]) {
  for (const el of items) {
    const w = el.offsetWidth; // 读：强制同步布局
    el.style.width = w * 2 + 'px'; // 写：使下次读再次失效
  }
}

// ✅ 正解：先批量读，再批量写
function good(items: HTMLElement[]) {
  const widths = items.map((el) => el.offsetWidth); // 集中读
  items.forEach((el, i) => (el.style.width = widths[i] * 2 + 'px')); // 集中写
}

// ✅ 用 class 切换，浏览器自动批处理
el.classList.add('expanded');

// ✅ requestAnimationFrame 把 DOM 操作对齐到渲染前
requestAnimationFrame(() => {
  el.style.transform = 'translateX(100px)';
});

// ✅ Web Animations API：合成层动画
el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100px)' }], {
  duration: 300,
  easing: 'ease-out',
  fill: 'forwards',
});
```

### 常见误区

- transform / opacity 通常 GPU 合成，不会触发 layout/paint，但**`will-change` 滥用反而让 layer 数量爆炸**
- 改 width / height 会 layout；改 background-image 会 paint；改 transform 只 composite
- `display: none` → 完全脱离渲染树，不再 layout；`visibility: hidden` 仍占位

### 追问

- contain 属性能做什么
- content-visibility: auto 和 IntersectionObserver 区别
- 强制同步布局（layout thrashing）怎么排查

### 延伸

- 读取布局信息（如 `offsetHeight`）可能强制浏览器同步刷新布局
- 批量读写分离、使用 class 切换，比一条条改 style 更稳

## storage-cookie

title: Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍
followups: [storage-cookie-followup-1, storage-cookie-followup-2, storage-cookie-followup-3]
links: [browser-cache-strategy, service-worker, cookie-localstorage-indexeddb]
difficulty: 基础
tags: [存储, Cookie]

### 一句话

Cookie 体积小、会随请求自动发送，适合会话标识；支持 HttpOnly、Secure、SameSite；localStorage 同步 API、实现简单，但配额和行为依浏览器而异；不适合存大量数据和高频写。

### 题目

对比浏览器常见存储方案，并说明 Cookie 的几个关键安全属性。

### 答案要点

- Cookie 体积小、会随请求自动发送，适合会话标识；支持 `HttpOnly`、`Secure`、`SameSite`
- localStorage 同步 API、实现简单，但配额和行为依浏览器而异；不适合存大量数据和高频写
- sessionStorage 生命周期跟 tab 绑定
- IndexedDB 适合结构化大数据、离线缓存、搜索索引
- Cache Storage 更适合存 Request/Response 对象，常与 Service Worker 配合

### 代码示例

```ts
// 1. localStorage：同步、5MB 左右
localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));
const s = JSON.parse(localStorage.getItem('settings') || '{}');

// 2. IndexedDB：结构化大数据（用 idb 简化）
import { openDB } from 'idb';
const db = await openDB('app', 1, {
  upgrade(db) {
    const store = db.createObjectStore('posts', { keyPath: 'id' });
    store.createIndex('byDate', 'createdAt');
  },
});
await db.put('posts', { id: '1', title: 'Hi', createdAt: Date.now() });
const posts = await db.getAllFromIndex('posts', 'byDate');

// 3. Cache Storage：常配合 Service Worker
const cache = await caches.open('static-v1');
await cache.addAll(['/index.html', '/main.js', '/style.css']);
const res = await caches.match('/index.html');
```

```http
# Cookie 安全属性
Set-Cookie: session=abc;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=86400

# 更严格：__Host- 前缀强制 Secure + Path=/
Set-Cookie: __Host-session=abc; Secure; Path=/; SameSite=Strict
```

### 追问

- 「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 存储、Cookie，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 敏感令牌不要因为"前端方便"就直接存 localStorage
- localStorage 是同步的，在低端机和高频写场景会卡主线程
- Cookie 若承载会话，通常还应结合 `__Host-` / `__Secure-` 前缀、`Path`、过期策略与服务端会话治理一起设计

## service-worker

title: Service Worker 生命周期与常见缓存策略
followups: [service-worker-followup-1, service-worker-followup-2, service-worker-followup-3]
links: [17-build-publish/sw-update-strategies, browser-cache-strategy, storage-cookie]
difficulty: 进阶
tags: [PWA, 离线]

### 一句话

Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）；install 适合预缓存静态资源；activate 适合清理旧缓存、接管客户端。

### 题目

Service Worker 的 install、activate、fetch 分别做什么？常见缓存策略有哪些？

### 答案要点

- Service Worker 只在安全上下文可用（通常是 HTTPS，`localhost` 例外）
- `install` 适合预缓存静态资源
- `activate` 适合清理旧缓存、接管客户端
- `fetch` 拦截请求并决定从缓存还是网络返回
- 常见策略：cache-first、network-first、stale-while-revalidate、cache-only、network-only

### 代码示例

```ts
// service-worker.ts
const CACHE = 'app-v3';
const PRECACHE = ['/', '/index.html', '/main.js', '/style.css'];

self.addEventListener('install', (e: any) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting(); // 立即激活新版本（注意兼容性）
});

self.addEventListener('activate', (e: any) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// 1. cache-first（静态资源）
function cacheFirst(req: Request) {
  return caches.match(req).then(
    (r) =>
      r ||
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
        return res;
      }),
  );
}

// 2. network-first（API）
async function networkFirst(req: Request) {
  try {
    const res = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req))!;
  }
}

// 3. stale-while-revalidate（最常用）
async function swr(req: Request) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req).then((res) => {
    caches.open(CACHE).then((c) => c.put(req, res.clone()));
    return res;
  });
  return cached || fetchPromise;
}

self.addEventListener('fetch', (e: any) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) e.respondWith(networkFirst(e.request));
  else if (url.pathname.startsWith('/assets/')) e.respondWith(cacheFirst(e.request));
  else e.respondWith(swr(e.request));
});
```

### 追问

- 你会先看哪些指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Service Worker 生命周期与常见缓存策略」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 PWA、离线，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- SW 更新策略要权衡"立即生效"与"避免打断用户"
- 离线能力不是只缓存首页，数据和静态资源更新策略同样关键
- `skipWaiting()` / `clients.claim()` 很常见，但是否立即接管页面要结合版本兼容与用户正在进行的操作一起评估

## event-loop-worker

title: 浏览器事件循环、主线程限制与 Worker
followups: [event-loop-worker-followup-1, event-loop-worker-followup-2, event-loop-worker-followup-3]
links: [01-javascript/async-await, 01-javascript/event-loop, 09-node/node-event-loop]
difficulty: 进阶
tags: [事件循环, Worker]

### 一句话

主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应；Worker 可把计算密集型任务移到后台线程，如解析大 JSON、图像处理、搜索索引；Worker 不能直接访问 DOM。

### 题目

为什么浏览器里的 JS 要尽量避免长任务？Web Worker 能解决哪些问题，不能解决哪些问题？

### 答案要点

- 主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应
- Worker 可把计算密集型任务移到后台线程，如解析大 JSON、图像处理、搜索索引
- Worker 不能直接访问 DOM，和主线程通常通过 `postMessage`、Transferable 对象通信；`SharedArrayBuffer` 还要求安全上下文和 cross-origin isolation

### 代码示例

```ts
// 主线程：创建 Worker（Vite 推荐用 import.meta.url）
const worker = new Worker(new URL('./crunch.worker.ts', import.meta.url), { type: 'module' });

worker.postMessage({ data: largeArray });
worker.onmessage = (e) => render(e.data);
worker.onerror = (e) => console.error(e);

// crunch.worker.ts
self.onmessage = (e) => {
  const { data } = e.data;
  const result = data.map(heavyCompute);
  // Transferable：避免结构化克隆，零拷贝转移
  self.postMessage(result, [result.buffer ?? undefined].filter(Boolean) as Transferable[]);
};
```

```ts
// Comlink：把 Worker 调用变成 Promise + 类型安全
import * as Comlink from 'comlink';

// worker.ts
const api = {
  async parseCSV(text: string) {
    /* ... */ return rows;
  },
  async fuzzySearch(query: string) {
    /* ... */
  },
};
Comlink.expose(api);
export type Api = typeof api;

// 主线程
import type { Api } from './worker';
const api = Comlink.wrap<Api>(new Worker(new URL('./worker', import.meta.url), { type: 'module' }));
const rows = await api.parseCSV(largeText); // 像调用本地异步函数
```

### 常见误区

- Worker 里没有 DOM、window、document，访问就报错
- 主线程 → Worker postMessage 是结构化克隆（不是引用），大数据要用 Transferable
- requestAnimationFrame 在 inactive tab 不跑（Chrome 暂停渲染）

### 追问

- requestIdleCallback 兼容性如何，什么时候用
- SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头
- web worker 和 service worker 区别

### 延伸

- 结构化克隆有成本，大数据频繁传输未必划算
- OffscreenCanvas、AudioWorklet、PaintWorklet 都是更细分的线程化能力

## observer-performance-api

title: Observer 家族与 Performance API 的实战用法
followups: [observer-performance-api-followup-1, observer-performance-api-followup-2, observer-performance-api-followup-3]
difficulty: 进阶
tags: [Observer, 性能]

### 一句话

IntersectionObserver：懒加载、曝光埋点、无限滚动；ResizeObserver：容器尺寸变化监听；MutationObserver：DOM 结构变化监听。

### 题目

`IntersectionObserver`、`ResizeObserver`、`MutationObserver`、`PerformanceObserver` 各自适合什么场景？

### 答案要点

- `IntersectionObserver`：懒加载、曝光埋点、无限滚动
- `ResizeObserver`：容器尺寸变化监听
- `MutationObserver`：DOM 结构变化监听
- `PerformanceObserver`：监听长任务、LCP、布局偏移等性能条目；具体可观察类型要看浏览器支持的 `supportedEntryTypes`

### 代码示例

```ts
// 1. IntersectionObserver：图片懒加载 + 曝光埋点
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLImageElement;
        el.src = el.dataset.src!;
        trackExposure(el.dataset.exposureId!);
        io.unobserve(el);
      }
    }
  },
  { rootMargin: '100px', threshold: 0.1 },
);
document.querySelectorAll('img[data-src]').forEach((el) => io.observe(el));

// 2. ResizeObserver：监听容器尺寸
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    chart.resize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  }
});
ro.observe(containerEl);

// 3. MutationObserver：检测 DOM 变更（如富文本编辑）
const mo = new MutationObserver((records) => {
  for (const r of records) {
    if (r.type === 'childList') console.log('children changed');
    if (r.type === 'attributes') console.log('attr', r.attributeName);
  }
});
mo.observe(editor, { childList: true, subtree: true, attributes: true });

// 4. PerformanceObserver：监听核心指标
new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.entryType, entry.name, entry.startTime, entry.duration);
  });
}).observe({
  type: 'longtask',
  buffered: true, // 拿历史条目
});

// 监听 LCP（取最后一个）
new PerformanceObserver((list) => {
  const last = list.getEntries().at(-1);
  console.log('LCP', last?.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

### 追问

- 你会先看哪些指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Observer 家族与 Performance API 的实战用法」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Observer、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 这些 API 的价值在于"让浏览器帮你做监听批处理"，减少轮询与同步计算
- 可观测性 SDK 常用 `PerformanceObserver + Beacon` 做基础指标上报
- 性能条目缓冲区可能会满，工程上要考虑 `buffered` 读取和条目丢失问题

## devtools-memory

title: 浏览器 DevTools 如何排查内存泄漏与卡顿
followups: [devtools-memory-followup-1, devtools-memory-followup-2, devtools-memory-followup-3]
difficulty: 进阶
tags: [DevTools, 调试]

### 一句话

Performance 面板看长任务、掉帧、布局抖动、脚本热点；Memory 面板做 heap snapshot，对比对象增长趋势，查 detached DOM、闭包引用链；Network 看资源瀑布、缓存命中、接口阻塞。

### 题目

如果线上页面越用越卡，你会如何利用浏览器开发者工具定位问题？

### 答案要点

- Performance 面板看长任务、掉帧、布局抖动、脚本热点
- Memory 面板做 heap snapshot，对比对象增长趋势，查 detached DOM、闭包引用链
- Network 看资源瀑布、缓存命中、接口阻塞
- Coverage 看未使用代码比例，辅助包体治理

### 代码示例

```ts
// 常见内存泄漏模式与修复

// 1. 全局事件未移除
class Widget {
  constructor() {
    window.addEventListener('resize', this.onResize); // ❌ 未保存引用
  }
  onResize = () => {
    /* ... */
  };
  destroy() {
    window.removeEventListener('resize', this.onResize); // ✅ 同一引用才能移除
  }
}

// 2. 定时器未清理
let timer: any;
function start() {
  timer = setInterval(() => poll(), 1000);
}
function stop() {
  clearInterval(timer);
}

// 3. 闭包引用大对象
function attach(big: ArrayBuffer) {
  return () => console.log('hi'); // ❌ 闭包仍然持有 big
}
// ✅ 用完释放
function attachOk(big: ArrayBuffer) {
  let local: ArrayBuffer | null = big;
  return () => {
    console.log(local?.byteLength);
    local = null;
  };
}

// 4. detached DOM：被 JS 引用但已移出文档
const cache = new Map<string, HTMLElement>();
cache.set('foo', document.createElement('div'));
// 后来从文档移除元素，但 Map 仍引用 → 不会被 GC
// ✅ 用 WeakRef 或 WeakMap

// 5. 监控代码内存增长
setInterval(() => {
  const mem = (performance as any).memory;
  if (mem) console.log('used:', mem.usedJSHeapSize / 1024 / 1024, 'MB');
}, 5000);
```

```ts
// 用 WeakRef 弱引用避免长生命周期持有
const ref = new WeakRef(someObj);
const obj = ref.deref(); // 可能为 undefined（已被 GC）
```

### 追问

- 你会先看哪些指标来判断「浏览器 DevTools 如何排查内存泄漏与卡顿」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「浏览器 DevTools 如何排查内存泄漏与卡顿」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 DevTools、调试，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 排查内存泄漏常做"三次快照对比"：初始、操作后、GC 后
- 不要只盯总内存大小，更要看"该被释放的对象是否还活着"

## v8-engine

title: V8 引擎工作机制（Ignition / TurboFan / 隐藏类）
followups: [v8-engine-followup-1, v8-engine-followup-2, v8-engine-followup-3]
difficulty: 资深
tags: [V8, 引擎]

### 一句话

解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行；优化编译：热点代码进入 TurboFan，做基于类型反馈的 JIT 编译；类型不稳定会被 deopt 回 Ignition。

### 题目

V8 是怎么把 JS 跑得越来越快的？理解这些对前端代码有什么实际意义？

### 答案要点

- 解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行
- 优化编译：热点代码进入 TurboFan，做基于类型反馈的 JIT 编译；类型不稳定会被 deopt 回 Ignition
- 隐藏类（Hidden Class / Map）：对象按属性顺序生成 shape，频繁改变 shape 会让 V8 退化到字典模式
- 内联缓存（IC）：调用点缓存上次见到的类型，命中则跳过查找
- GC：分代回收（Young / Old），大对象走 large object space；写屏障维护跨代引用
- 实践含义：保持对象 shape 稳定（构造时一次性赋值）、避免 megamorphic 调用、减少临时对象

### 代码示例

```ts
class Slow {
  init(x: number) {
    this.x = x;
    if (x > 0) this.positive = true;
  }
  x?: number;
  positive?: boolean;
}

class Fast {
  x: number;
  positive: boolean;
  constructor(x: number) {
    this.x = x;
    this.positive = x > 0;
  }
}

function callsite(o: { foo: () => void }) {
  o.foo();
}
```

### 追问

- 「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 V8、引擎，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- V8 团队博客和 v8.dev 文章常更新优化细节，比道听途说靠谱
- "猜测优化"思路：根据代码运行时表现反馈类型，前端不需要手动加 type，但代码风格稳定能间接帮 V8

## webgpu-overview

title: WebGPU 概览与适用场景
followups: [webgpu-overview-followup-1, webgpu-overview-followup-2, webgpu-overview-followup-3]
difficulty: 资深
tags: [WebGPU, GPU]

### 一句话

设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader；性能：相比 WebGL 减少状态机切换开销，能用 GPU 做通用计算；资源：BindGroup / Pipeline 显式声明。

### 题目

WebGPU 跟 WebGL 的核心差异是什么？哪些场景值得切换？

### 答案要点

- 设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader
- 性能：相比 WebGL 减少状态机切换开销，能用 GPU 做通用计算
- 资源：BindGroup / Pipeline 显式声明，符合现代图形 API 习惯
- 适用：3D 渲染、机器学习推理（TensorFlow.js WebGPU backend）、视频特效、粒子模拟
- 兼容：Chrome 113+ 默认开启，Safari 17.4+，移动端覆盖较慢，需要做 fallback

### 代码示例

```ts
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (!device) throw new Error('WebGPU not supported');

const module = device.createShaderModule({
  code: `
@group(0) @binding(0) var<storage, read_write> data: array<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  data[id.x] = data[id.x] * 2.0;
}`,
});
const pipeline = device.createComputePipeline({
  layout: 'auto',
  compute: { module, entryPoint: 'main' },
});
```

### 追问

- 「WebGPU 概览与适用场景」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「WebGPU 概览与适用场景」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 WebGPU、GPU，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 引擎层（Three.js、Babylon.js、PIXI v8、TensorFlow.js）已支持 WebGPU 后端，业务层切换成本不大
- 没有 WebGPU 时回退 WebGL2 / WASM SIMD 是常见的做法

## reflow-vs-repaint

title: 回流（reflow）和重绘（repaint）的区别与触发条件
followups: [reflow-vs-repaint-followup-1, reflow-vs-repaint-followup-2, reflow-vs-repaint-followup-3]
links: [04-css/animation-compositor]
difficulty: 进阶
tags: [渲染, 性能]

### 一句话

回流 = 改了几何（位置、大小）需要重算布局；重绘 = 只改外观（颜色、阴影）。回流必定带重绘，反之不一定。

### 题目

回流和重绘分别是什么？哪些操作会触发它们？怎么减少？

### 答案要点

- 重绘（repaint）：只改变外观（颜色、背景、可见性），不影响布局
- 回流（reflow / layout）：几何属性变化，浏览器需要重新计算布局
- 回流一定会重绘，重绘不一定回流
- 触发回流：尺寸/位置变化（width / height / margin / padding / top / left / font-size）、添加/移除 DOM、display 切换、读取 offset/scroll/client/getComputedStyle
- 触发重绘：color、background、visibility、box-shadow、outline
- 优化：批量 DOM 改动、使用 transform/opacity（合成层）、避免强制同步布局、使用 requestAnimationFrame

### 代码示例

```js
const el = document.querySelector('.box');

el.style.width = '100px';
const h = el.offsetHeight;
el.style.width = '200px';
const w = el.offsetWidth;

requestAnimationFrame(() => {
  el.style.cssText = 'width:200px;height:100px;';
});

el.style.transform = 'translate3d(0,0,0)';
el.style.willChange = 'transform';
```

### 追问

- 你会先看哪些指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「回流（reflow）和重绘（repaint）的区别与触发条件」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 渲染、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Chrome DevTools → Performance → Layout/Paint 火焰图可定位
- composite-only 属性：transform / opacity / filter（合成线程处理，不阻塞主线程）

## browser-cache-strategy

title: 浏览器缓存的完整链路是什么样的
followups: [browser-cache-strategy-followup-1, browser-cache-strategy-followup-2, browser-cache-strategy-followup-3]
links: [06-network/caching, service-worker, storage-cookie]
difficulty: 进阶
tags: [缓存, 性能, HTTP]

### 一句话

请求资源时浏览器按"Service Worker → 内存 → 磁盘 → 网络"顺序找；强缓存（Cache-Control / Expires）直接返回，过期再走协商缓存（ETag / Last-Modified）。

### 题目

从内存到磁盘，从强缓存到协商缓存，请描述浏览器请求资源时缓存命中的完整流程。

### 答案要点

- 优先级：Service Worker → Memory Cache → Disk Cache → Push Cache（HTTP/2） → 网络
- 强缓存：`Cache-Control: max-age=31536000, immutable` / `Expires`，命中直接返回 200 (from cache)
- 协商缓存：强缓存失效后带 `If-None-Match` (ETag) / `If-Modified-Since`；服务端 304 不带 body
- `Cache-Control` 关键值：`no-cache`（必须协商）、`no-store`（不缓存）、`public/private`、`stale-while-revalidate`
- 静态资源最佳实践：文件名带 hash + `Cache-Control: max-age=31536000, immutable`；HTML 用 `no-cache`
- Service Worker 自定义缓存策略：cache-first / network-first / stale-while-revalidate

### 代码示例

```js
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.destination === 'image') {
    e.respondWith(
      caches.open('imgs').then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      }),
    );
  }
});
```

### 追问

- 你会先看哪些指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「浏览器缓存的完整链路是什么样的」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 缓存、性能、HTTP，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大公司常用 SWR（stale-while-revalidate）：先返回缓存再后台刷新
- 注意 chrome 强制刷新（Ctrl+Shift+R）会跳过强缓存但仍可能命中协商缓存
- HTTP/2 Push Cache 使用率低，已被 103 Early Hints + preload 取代

## cookie-localstorage-indexeddb

title: Cookie / localStorage / sessionStorage / IndexedDB 选哪个
followups: [cookie-localstorage-indexeddb-followup-1, cookie-localstorage-indexeddb-followup-2, cookie-localstorage-indexeddb-followup-3]
links: [storage-cookie, 13-security/xss-csrf-defense]
difficulty: 基础
tags: [存储, 安全]

### 一句话

鉴权用 Cookie（自动发送 + HttpOnly 防 XSS）；少量配置用 localStorage；Tab 级临时数据用 sessionStorage；离线大数据用 IndexedDB。

### 题目

不同的客户端存储场景下应该如何选择，安全性怎么保障？

### 答案要点

- Cookie：4KB，每个请求自动携带（适合鉴权 token），可设 HttpOnly / Secure / SameSite
- localStorage：5-10MB，同源持久存储，同步 API，纯字符串
- sessionStorage：与 localStorage 相同 API，但生命周期=Tab
- IndexedDB：可存数百 MB，异步，结构化数据 / 二进制 Blob，事务支持
- Cache Storage：用于 Service Worker，存 Request/Response 对
- 安全：用户敏感数据 → Cookie + HttpOnly + Secure + SameSite=Lax/Strict；XSS 风险 → 不要在 localStorage 存 JWT

### 代码示例

```js
document.cookie = 'session=xxx; HttpOnly; Secure; SameSite=Lax; Max-Age=86400';

const req = indexedDB.open('app', 1);
req.onupgradeneeded = () => {
  req.result.createObjectStore('drafts', { keyPath: 'id' });
};
req.onsuccess = () => {
  const tx = req.result.transaction('drafts', 'readwrite');
  tx.objectStore('drafts').put({ id: 1, content: 'hello' });
};
```

### 追问

- 如果把「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 存储、安全，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- localStorage 同步阻塞主线程，不适合频繁写入
- 复杂应用首选 IndexedDB（用 idb-keyval / Dexie 简化）
- 跨子域共享存储用 cookie；跨主域用 postMessage + iframe

## web-worker-basics

title: Web Worker 是什么，什么场景应该用
followups: [web-worker-basics-followup-1, web-worker-basics-followup-2, web-worker-basics-followup-3]
difficulty: 进阶
tags: [Worker, 性能]

### 一句话

Web Worker 让 JS 跑在独立的后台线程，不阻塞主线程；通过 `postMessage` 互通——非常适合"算得久、不需要直接操作 DOM"的任务。

### 题目

普通 Worker、SharedWorker、ServiceWorker 各自定位是什么？什么时候用？

### 答案要点

- **Dedicated Worker**：专属当前页面，主页关闭就销毁；通过 `postMessage` 通信，不能访问 DOM
- **SharedWorker**：可在多个同源 Tab 共享，适合做"集中式 WebSocket 网关"
- **ServiceWorker**：常驻后台，拦截网络请求 + 推送通知 + 离线缓存（PWA 的核心）
- 适合 Worker 的场景：大数据排序 / 解析、加解密、图像处理、Markdown / 语法高亮、JSON 解析超大对象
- 数据传递：默认是 structured clone（开销大），可用 Transferable（ArrayBuffer / OffscreenCanvas / MessagePort）零拷贝

### 代码示例

```js
const worker = new Worker(new URL('./hash.worker.js', import.meta.url), { type: 'module' });
worker.postMessage({ buffer: arrayBuffer }, [arrayBuffer]);
worker.onmessage = (e) => console.log('hash:', e.data);

self.onmessage = async (e) => {
  const { buffer } = e.data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  self.postMessage(hash, [hash]);
};
```

### 追问

- 你会先看哪些指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Web Worker 是什么，什么场景应该用」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Worker、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vite / webpack 都支持把 `?worker` 后缀的文件单独打包成 Worker
- React / Vue 里推荐用 `Comlink` 让 Worker 通信像调用普通方法
- OffscreenCanvas 让你在 Worker 里直接操作 Canvas，特别适合可视化/游戏

## browser-process-thread

title: Chrome 多进程 + 多线程架构是什么样的
followups: [browser-process-thread-followup-1, browser-process-thread-followup-2, browser-process-thread-followup-3]
difficulty: 进阶
tags: [架构, 进程]

### 一句话

Chrome 把每个标签页放在独立的 Renderer 进程里（崩溃只影响当前页 + 安全沙盒）；Renderer 内部又有主线程、合成线程、光栅化线程、Worker 线程等多条线程协作。

### 题目

Chrome 浏览器的进程模型和 Renderer 进程内部的线程模型分别是什么？

### 答案要点

- 进程：
  - **Browser Process**：主控、UI、网络、磁盘 I/O 调度
  - **Renderer Process**：每个 Tab / iframe 一个，负责 HTML/CSS/JS 解析与渲染（沙盒）
  - **GPU Process**：合成最终位图、3D
  - **Network Process**：网络请求（独立沙盒）
  - **Plugin / Utility / Storage** 进程
- Renderer 进程内的线程：
  - **主线程**：解析 HTML/CSS、执行 JS、布局、绘制（即"主线程任务"）
  - **合成线程（Compositor）**：将图层合成最终帧，独立于主线程，所以 transform/opacity 动画不阻塞 JS
  - **光栅化线程**：把图层变成位图
  - **Worker 线程**：Web Worker / Service Worker
  - **JS Helper 线程**：V8 后台编译
- Site Isolation：跨站 iframe 也用独立进程，更安全（Spectre/Meltdown 后默认开启）

### 代码示例

```js
chrome://process-internals/
chrome://memory-internals/
```

### 追问

- 推动「Chrome 多进程 + 多线程架构是什么样的」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Chrome 多进程 + 多线程架构是什么样的」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 架构、进程，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 移动端 Chrome 进程数受限于内存，会做"进程合并"
- Edge 与 Brave 同源 Chromium 架构相同
- Safari 也用类似的 WebContent + Networking + GPU 进程拆分

## webgpu-pipeline-basics

title: WebGPU 比 WebGL 强在哪？最小可用渲染管线
followups: [webgpu-pipeline-basics-followup-1, webgpu-pipeline-basics-followup-2, webgpu-pipeline-basics-followup-3]
difficulty: 资深
tags: [WebGPU, 图形, 高频]

### 一句话

WebGPU 是新一代 GPU API：① 同时面向**渲染和计算**（compute shader），② 多线程友好（command encoder 提交 GPU），③ 显式描述 pipeline / bind group，性能可预测；适合大数据可视化、ML 推理、3D 引擎。

### 题目

WebGL 已经能做大部分图形需求，WebGPU 解决了什么新问题？写出最小三角形渲染管线的关键步骤。

### 答案要点

- **WebGL 的痛点**
  - 状态机式 API：drawCall 前要 bind 一堆全局状态，难做并行
  - 没有 compute shader（WebGL 2 也没有，要绕到 fragment shader 计算）
  - 着色器语言是 GLSL，老旧
  - 大量同步状态切换导致性能瓶颈
- **WebGPU 关键改进**
  - **Pipeline 显式**：vertex / fragment / compute pipeline 一次性配置好，driver 可以提前优化
  - **Bind Group**：把 buffer/texture/sampler 打包绑定，drawCall 切换轻量
  - **Compute Shader**：通用 GPU 计算（粒子系统、ML、物理仿真）
  - **WGSL**：现代 SL 语言（强类型、类似 Rust 语法）
  - **多线程**：GPU 命令在 CPU 端可由多 worker 并发录制
- **最小渲染管线步骤**
  1. `navigator.gpu.requestAdapter()` 拿适配器
  2. `adapter.requestDevice()` 拿 device
  3. canvas.getContext('webgpu') + configure
  4. createShaderModule（顶点 + 片段 WGSL）
  5. createRenderPipeline（描述顶点格式 / 片段输出）
  6. 帧循环：encoder.beginRenderPass → setPipeline → draw → submit
- **典型应用场景**
  - 海量散点 / 时序图（百万级数据点）
  - ML 推理：transformers.js、ONNX Runtime Web 都已支持 WebGPU 后端
  - 3D 引擎：Babylon.js、Three.js（WebGPURenderer）
  - 实时滤镜 / 视频特效
- **兼容性**
  - Chrome/Edge 113+ 默认开启
  - Safari 18+
  - Firefox 实验性
  - 不支持时降级到 WebGL2 / Canvas2D
- **常见坑**
  - 每个 GPUBuffer 用完要 destroy（不会自动 GC）
  - WGSL 与 GLSL 语法差异不小
  - 调试工具不如 WebGL 成熟（Chrome DevTools 有 GPU panel）

### 代码示例

```ts
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter!.requestDevice();
const canvas = document.querySelector('canvas')!;
const ctx = canvas.getContext('webgpu')!;
const format = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({ device, format, alphaMode: 'premultiplied' });

const wgsl = /* wgsl */ `
@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let pos = array<vec2f, 3>(vec2f(0., .5), vec2f(-.5, -.5), vec2f(.5, -.5));
  return vec4f(pos[i], 0., 1.);
}
@fragment
fn fs() -> @location(0) vec4f {
  return vec4f(.4, .7, 1., 1.);
}
`;
const module = device.createShaderModule({ code: wgsl });

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs' },
  fragment: { module, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list' },
});

function frame() {
  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [
      {
        view: ctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
  pass.setPipeline(pipeline);
  pass.draw(3);
  pass.end();
  device.queue.submit([enc.finish()]);
  requestAnimationFrame(frame);
}
frame();
```

### 追问

- 你会先看哪些指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「WebGPU 比 WebGL 强在哪？最小可用渲染管线」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 WebGPU、图形、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- WebNN（神经网络 API）配合 WebGPU 后端，未来浏览器原生跑 LLM
- WebGPU 在 Node 也有实现（dawn / wgpu binding），跨端复用 shader

## webtransport-vs-websocket

title: WebTransport 和 WebSocket 的关系？什么场景用
followups: [webtransport-vs-websocket-followup-1, webtransport-vs-websocket-followup-2, webtransport-vs-websocket-followup-3]
links: [webcodecs-streams, 06-network/websocket-sse]
difficulty: 资深
tags: [WebTransport, 实时通信]

### 一句话

WebTransport 跑在 **HTTP/3（QUIC + UDP）** 上，提供**多个独立流 + 不可靠数据报**两种通道：避免 WebSocket 的"队头阻塞"，适合实时游戏、低延迟流媒体、远程渲染等对丢包/乱序敏感的场景。

### 题目

WebSocket 用了十年还很稳，为什么浏览器要做 WebTransport？两者有什么本质差异？

### 答案要点

- **WebSocket 的局限**
  - 跑在 TCP 上，单一有序字节流 → 一旦丢包整条连接 stall（队头阻塞 HOL）
  - 多消息类型必须复用同一条流，互相影响
  - 没有"不可靠"模式（实时游戏宁丢一帧也不重传）
- **WebTransport 提供两种通道**
  - **streams**（双向 / 单向）：可靠有序，类似 WebSocket，但**多路复用**——一条流堵了不影响其他
  - **datagrams**：不可靠不重传，类似 UDP，适合实时音视频帧 / 鼠标位置 / 游戏指令
- **底层 = HTTP/3 = QUIC**
  - QUIC 跑 UDP，自带加密（TLS 1.3）
  - 0-RTT 重连：再次连接几乎瞬时
  - 抗弱网：丢包恢复快、连接迁移（手机切 wifi 不断线）
- **典型场景**
  - 云游戏 / 远程桌面：低延迟 + 不能容忍 HOL
  - 实时音视频转推
  - 大型 MMO 游戏：状态广播用 datagram，重要事件用 stream
  - 协同绘图 / 协同编辑大文档：数据流并行，互不阻塞
  - 高频金融行情推送
- **API 模型**
  - 客户端：`new WebTransport(url)` + `await transport.ready`
  - 创建可靠流：`createBidirectionalStream()` / `createUnidirectionalStream()`
  - 不可靠：`transport.datagrams.writable` / `readable`
- **服务端**
  - 不能用普通 HTTP/1.1 / WebSocket 服务器；要 HTTP/3 服务器（quiche / msquic / aioquic）
  - Node 暂未原生支持，要 native binding 或 Caddy / Nginx (实验) 中转
- **兼容性**
  - Chrome / Edge 完整支持，Firefox 跟进
  - 不支持时降级到 WebSocket 或 SSE
  - HTTP/3 端口 / 防火墙问题：企业网络 UDP 可能被屏蔽，需要 fallback
- **跟 WebRTC DataChannel 的区别**
  - WebRTC 主要为 P2P 设计（NAT 穿透 + ICE）；服务端转发繁琐
  - WebTransport 就是 client-server，工程化更简单

### 代码示例

```ts
const transport = new WebTransport('https://example.com/realtime');
await transport.ready;

const stream = await transport.createBidirectionalStream();
const writer = stream.writable.getWriter();
await writer.write(new TextEncoder().encode('hello'));

const reader = stream.readable.getReader();
const { value } = await reader.read();
console.log(new TextDecoder().decode(value));

const dgWriter = transport.datagrams.writable.getWriter();
function loop() {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, performance.now() | 0);
  dgWriter.write(buf);
  requestAnimationFrame(loop);
}
loop();

(async () => {
  const dgReader = transport.datagrams.readable.getReader();
  while (true) {
    const { value, done } = await dgReader.read();
    if (done) break;
    handleDatagram(value);
  }
})();
```

### 追问

- 「WebTransport 和 WebSocket 的关系？什么场景用」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「WebTransport 和 WebSocket 的关系？什么场景用」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 WebTransport、实时通信，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- WebRTC + WebTransport 组合：媒体走 RTC，控制信令走 WebTransport
- 阿里 / 腾讯云的低延迟直播已有 WebTransport 试点

## webcodecs-streams

title: WebCodecs + Streams 实现浏览器内视频处理
followups: [webcodecs-streams-followup-1, webcodecs-streams-followup-2, webcodecs-streams-followup-3]
links: [webtransport-vs-websocket]
difficulty: 资深
tags: [WebCodecs, Streams, 视频]

### 一句话

WebCodecs 暴露浏览器内置的硬件解码 / 编码（VideoDecoder/VideoEncoder/AudioDecoder/AudioEncoder），配合 ReadableStream / WritableStream 形成"零拷贝管道"：解码 → 处理 → 编码 → 上传，全程不离开 GPU，远比 ffmpeg.wasm 高效。

### 题目

浏览器里要做"实时给视频加水印 + 转码上传"，传统方案 ffmpeg.wasm 太慢。WebCodecs 怎么帮你？

### 答案要点

- **能力定位**
  - WebCodecs 不做封装格式（mp4 / mkv），只解 / 编 raw frame
  - 必须配合 demuxer（mp4box.js）做容器解析
  - 配合 muxer（ebml-muxer / webm-muxer / mp4-muxer）做封装
- **管道结构**
  - 文件 → demuxer → EncodedVideoChunk → VideoDecoder → VideoFrame
  - VideoFrame → 处理（Canvas / WebGL / WebGPU 加水印）→ 新 VideoFrame
  - 新 VideoFrame → VideoEncoder → EncodedVideoChunk → muxer → blob/upload
- **Streams 配合**
  - 上面每个箭头都可以包成 ReadableStream / TransformStream
  - 自动 backpressure：解码太快编码跟不上时上游会暂停
  - 标准 pipe：`source.pipeThrough(decode).pipeThrough(watermark).pipeThrough(encode).pipeTo(upload)`
- **VideoFrame 的省内存哲学**
  - VideoFrame 是 GPU 资源，**用完必须 close()**，否则很快 OOM
  - clone() 创建新引用，而不是真复制内存
  - 配合 OffscreenCanvas / WebGPU texture import 零拷贝处理
- **典型应用**
  - 浏览器内视频剪辑（裁剪 / 拼接 / 加滤镜）
  - 直播推流：MediaStreamTrackProcessor 拿到 camera track → 编码 → WebTransport 推
  - 截图 / 实时识别：每帧送给 WebGPU / TF.js
- **性能对比**
  - WebCodecs 用 GPU 硬解硬编：1080p 60fps 实时
  - ffmpeg.wasm 纯 CPU：1080p 60fps 慢 5-10 倍
- **常见坑**
  - 编码器 keyFrame 间隔影响转码画质和 seek
  - codec 字符串要严格（'avc1.42E01E' 这种 fourcc + profile + level）
  - Safari 支持滞后，需要 fallback
  - 错误码不直观，VideoDecoder.error 回调要打日志

### 代码示例

```ts
const decoder = new VideoDecoder({
  output: (frame) => writer.write(frame),
  error: (e) => console.error(e),
});
decoder.configure({ codec: 'avc1.42E01E' });

const encoder = new VideoEncoder({
  output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
  error: (e) => console.error(e),
});
encoder.configure({
  codec: 'avc1.42001f',
  width: 1280,
  height: 720,
  bitrate: 2_000_000,
  framerate: 30,
});

const watermarkTransform = new TransformStream<VideoFrame, VideoFrame>({
  transform(frame, controller) {
    const canvas = new OffscreenCanvas(frame.codedWidth, frame.codedHeight);
    const g = canvas.getContext('2d')!;
    g.drawImage(frame, 0, 0);
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.fillRect(20, 20, 200, 40);
    g.fillStyle = '#fff';
    g.fillText('© KAP', 30, 45);
    const newFrame = new VideoFrame(canvas, { timestamp: frame.timestamp });
    frame.close();
    controller.enqueue(newFrame);
  },
});

const track = (await navigator.mediaDevices.getUserMedia({ video: true })).getVideoTracks()[0];
const processor = new MediaStreamTrackProcessor({ track });
processor.readable.pipeThrough(watermarkTransform).pipeTo(
  new WritableStream({
    write(frame) {
      encoder.encode(frame, { keyFrame: false });
      frame.close();
    },
  }),
);
```

### 追问

- 「WebCodecs + Streams 实现浏览器内视频处理」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「WebCodecs + Streams 实现浏览器内视频处理」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 WebCodecs、Streams、视频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- WebRTC Insertable Streams（同样 VideoFrame 概念）做端到端加密 / 滤镜
- 实时 AI 处理：每帧扔到 WebGPU 跑模型 → 输出新 frame，全 GPU 管道
- "无服务器视频转码"：浏览器用户机器算力替代后端

## url-to-render-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 渲染 相关的指标来判断「从输入 URL 到页面显示，浏览器经历了什么」是不是当前性能瓶颈
difficulty: 进阶
tags: [追问]
parent: url-to-render

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「从输入 URL 到页面显示，浏览器经历了什么」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 渲染 相关的指标来判断「从输入 URL 到页面显示，浏览器经历了什么」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「从输入 URL 到页面显示，浏览器经历了什么」不是只在理想输入下成立。
- 再补可观测指标：围绕「从输入 URL 到页面显示，浏览器经历了什么」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「从输入 URL 到页面显示，浏览器经历了什么」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先把「从输入 URL 到页面显示，浏览器经历了什么」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「从输入 URL 到页面显示，浏览器经历了什么」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「从输入 URL 到页面显示，浏览器经历了什么」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## opfs-file-system-access

title: OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线]
followups: [opfs-file-system-access-followup-1, opfs-file-system-access-followup-2, opfs-file-system-access-followup-3]

### 一句话

IndexedDB 适合结构化数据和中小对象，OPFS 适合应用私有的大文件与高频读写，File System Access 适合用户主动选择的本地文件；本地优先应用通常需要三者组合。

### 题目

浏览器里要做本地编辑器、离线 IDE、视频缓存或大文件草稿时，OPFS、File System Access API 和 IndexedDB 应该怎么选？

### 答案要点

- IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。
- OPFS（Origin Private File System）是站点私有文件系统，适合 WASM、编辑器、音视频、离线包和大文件缓存；用户通常看不到这些文件，权限模型也不同于真实磁盘文件。
- File System Access API 让用户显式选择文件或目录，适合“打开本地项目、保存到用户指定路径”的应用，但兼容性和权限提示需要认真设计。
- 大文件场景要分层：IndexedDB 存索引和元信息，OPFS 存内部块文件，File System Access 做导入/导出或用户可见文件编辑。
- 需要关注存储配额、持久化申请、清理策略、隐私模式、跨浏览器降级，以及 Service Worker 缓存和业务数据存储的边界。

### 常见误区

- 把所有二进制都塞进 IndexedDB，数据量一大后备份、迁移、随机读写和错误恢复都很痛苦。
- 认为 OPFS 文件等于用户磁盘文件，实际上它是 origin 私有存储，用户未必能直接管理。
- 忽略存储清理策略，离线缓存无限增长，最终被浏览器回收或拖慢启动。
- 没有设计导入/导出和数据修复路径，本地数据库损坏后用户无法恢复。

### 追问

- OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别？
- 本地大文件缓存如何做配额控制和过期清理？
- 离线编辑器如何避免本地数据损坏导致用户草稿丢失？

## url-to-render-followup-2

title: 追问：在「从输入 URL 到页面显示，浏览器经历了什么」场景下，优化上线后，你会怎么用 渲染 相关的真实用户信号，证明「从输入 URL 到页面显示，浏览器经历了什么」确实让体验变好了，而不只是实验室分数提升
difficulty: 进阶
tags: [追问]
parent: url-to-render

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「从输入 URL 到页面显示，浏览器经历了什么」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在「从输入 URL 到页面显示，浏览器经历了什么」场景下，优化上线后，你会怎么用 渲染 相关的真实用户信号，证明「从输入 URL 到页面显示，浏览器经历了什么」确实让体验变好了，而不只是实验室分数提升？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「从输入 URL 到页面显示，浏览器经历了什么」不是只在理想输入下成立。
- 再补可观测指标：围绕「从输入 URL 到页面显示，浏览器经历了什么」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「从输入 URL 到页面显示，浏览器经历了什么」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先用一句话给出「从输入 URL 到页面显示，浏览器经历了什么」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「从输入 URL 到页面显示，浏览器经历了什么」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「从输入 URL 到页面显示，浏览器经历了什么」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## url-to-render-followup-3

title: 追问：你会怎样评估「从输入 URL 到页面显示，浏览器经历了什么」在性能收益与兼容性风险之间的平衡点
difficulty: 进阶
tags: [追问]
parent: url-to-render

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「从输入 URL 到页面显示，浏览器经历了什么」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：你会怎样评估「从输入 URL 到页面显示，浏览器经历了什么」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「从输入 URL 到页面显示，浏览器经历了什么」不是只在理想输入下成立。
- 再补可观测指标：围绕「从输入 URL 到页面显示，浏览器经历了什么」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「从输入 URL 到页面显示，浏览器经历了什么」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先用一句话给出「从输入 URL 到页面显示，浏览器经历了什么」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「从输入 URL 到页面显示，浏览器经历了什么」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「从输入 URL 到页面显示，浏览器经历了什么」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## render-pipeline-followup-1

title: 追问：你会先看哪些与 渲染 相关的指标来判断「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」是不是当前性能瓶颈
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: render-pipeline

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会先看哪些与 渲染 相关的指标来判断「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」不是只在理想输入下成立。
- 再补可观测指标：围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## render-pipeline-followup-2

title: 追问：你会怎样验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: render-pipeline

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会怎样验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」不是只在理想输入下成立。
- 再补可观测指标：围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## render-pipeline-followup-3

title: 追问：结合真实业务约束，围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在 渲染 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: render-pipeline

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在 渲染 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 开口先讲「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## storage-cookie-followup-1

title: 追问：如果要评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的落地风险，你会优先检查哪些 存储 约束是否成立
difficulty: 基础
tags: [存储, Cookie, 追问]
parent: storage-cookie

### 一句话

先界定「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚。

### 题目

如果面试官追问：如果要评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的落地风险，你会优先检查哪些 存储 约束是否成立？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」不是只在理想输入下成立。
- 再补可观测指标：围绕「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的核心机制应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## service-worker-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 PWA 相关的指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈
difficulty: 进阶
tags: [PWA, 离线, 追问]
parent: service-worker

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Service Worker 生命周期与常见缓存策略」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 PWA 相关的指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Service Worker 生命周期与常见缓存策略」不是只在理想输入下成立。
- 再补可观测指标：围绕「Service Worker 生命周期与常见缓存策略」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Service Worker 生命周期与常见缓存策略」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「Service Worker 生命周期与常见缓存策略」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「Service Worker 生命周期与常见缓存策略」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「Service Worker 生命周期与常见缓存策略」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## event-loop-worker-followup-1

title: 追问：当「浏览器事件循环、主线程限制与 Worker」进入复杂场景后，你会先验证哪些 事件循环 前置条件，避免方案踩坑
difficulty: 进阶
tags: [事件循环, Worker, 追问]
parent: event-loop-worker

### 一句话

先界定「浏览器事件循环、主线程限制与 Worker」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：当「浏览器事件循环、主线程限制与 Worker」进入复杂场景后，你会先验证哪些 事件循环 前置条件，避免方案踩坑？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器事件循环、主线程限制与 Worker」不是只在理想输入下成立。
- 再补可观测指标：围绕「浏览器事件循环、主线程限制与 Worker」的核心机制应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「浏览器事件循环、主线程限制与 Worker」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 准备这道追问时，先画出「浏览器事件循环、主线程限制与 Worker」从输入到输出的关键路径，再补异常路径。
- 准备一个「浏览器事件循环、主线程限制与 Worker」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「浏览器事件循环、主线程限制与 Worker」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## observer-performance-api-followup-1

title: 追问：你会先看哪些与 Observer 相关的指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈
difficulty: 进阶
tags: [Observer, 性能, 追问]
parent: observer-performance-api

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Observer 家族与 Performance API 的实战用法」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：你会先看哪些与 Observer 相关的指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Observer 家族与 Performance API 的实战用法」不是只在理想输入下成立。
- 再补可观测指标：围绕「Observer 家族与 Performance API 的实战用法」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Observer 家族与 Performance API 的实战用法」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先用一句话给出「Observer 家族与 Performance API 的实战用法」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「Observer 家族与 Performance API 的实战用法」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「Observer 家族与 Performance API 的实战用法」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## devtools-memory-followup-1

title: 追问：真要给「浏览器 DevTools 如何排查内存泄漏与卡顿」排查优先级，你会先抓哪几组观测信号再动手优化
difficulty: 进阶
tags: [DevTools, 调试, 追问]
parent: devtools-memory

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器 DevTools 如何排查内存泄漏与卡顿」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：真要给「浏览器 DevTools 如何排查内存泄漏与卡顿」排查优先级，你会先抓哪几组观测信号再动手优化？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器 DevTools 如何排查内存泄漏与卡顿」不是只在理想输入下成立。
- 再补可观测指标：围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「浏览器 DevTools 如何排查内存泄漏与卡顿」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先把「浏览器 DevTools 如何排查内存泄漏与卡顿」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「浏览器 DevTools 如何排查内存泄漏与卡顿」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「浏览器 DevTools 如何排查内存泄漏与卡顿」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## v8-engine-followup-1

title: 追问：面对真实流量和复杂依赖时，「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」最可能被哪些 V8 边界条件击穿
difficulty: 资深
tags: [V8, 引擎, 追问]
parent: v8-engine

### 一句话

先界定「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」最可能被哪些 V8 边界条件击穿？

### 答案要点

#### 核心回答

- 先界定「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」的核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先解释「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## webgpu-overview-followup-1

title: 追问：如果要让「WebGPU 概览与适用场景」稳定上线，你会优先补齐哪些与 WebGPU 相关的检查项
difficulty: 资深
tags: [WebGPU, GPU, 追问]
parent: webgpu-overview

### 一句话

先界定「WebGPU 概览与适用场景」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要让「WebGPU 概览与适用场景」稳定上线，你会优先补齐哪些与 WebGPU 相关的检查项？

### 答案要点

#### 核心回答

- 先界定「WebGPU 概览与适用场景」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「WebGPU 概览与适用场景」的核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先用一句话给出「WebGPU 概览与适用场景」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「WebGPU 概览与适用场景」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「WebGPU 概览与适用场景」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## reflow-vs-repaint-followup-1

title: 追问：你会先看哪些与 渲染 相关的指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: reflow-vs-repaint

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「回流（reflow）和重绘（repaint）的区别与触发条件」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：你会先看哪些与 渲染 相关的指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「回流（reflow）和重绘（repaint）的区别与触发条件」不是只在理想输入下成立。
- 再补可观测指标：围绕「回流（reflow）和重绘（repaint）的区别与触发条件」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「回流（reflow）和重绘（repaint）的区别与触发条件」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「回流（reflow）和重绘（repaint）的区别与触发条件」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「回流（reflow）和重绘（repaint）的区别与触发条件」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「回流（reflow）和重绘（repaint）的区别与触发条件」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## browser-cache-strategy-followup-1

title: 追问：你会先看哪些与 缓存 相关的指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈
difficulty: 进阶
tags: [缓存, 性能, HTTP, 追问]
parent: browser-cache-strategy

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器缓存的完整链路是什么样的」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善，要能回到原题机制定位原因。

### 题目

如果面试官追问：你会先看哪些与 缓存 相关的指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器缓存的完整链路是什么样的」不是只在理想输入下成立。
- 再补可观测指标：围绕「浏览器缓存的完整链路是什么样的」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「浏览器缓存的完整链路是什么样的」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 开口先讲「浏览器缓存的完整链路是什么样的」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「浏览器缓存的完整链路是什么样的」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「浏览器缓存的完整链路是什么样的」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## cookie-localstorage-indexeddb-followup-1

title: 追问：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时，你会怎样定义前端可信范围与服务端强校验边界
difficulty: 基础
tags: [存储, 安全, 追问]
parent: cookie-localstorage-indexeddb

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时，你会怎样定义前端可信范围与服务端强校验边界？

### 答案要点

#### 核心回答

- 推动「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 开口先讲「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## web-worker-basics-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Worker 相关的指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈
difficulty: 进阶
tags: [Worker, 性能, 追问]
parent: web-worker-basics

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Web Worker 是什么，什么场景应该用」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Worker 相关的指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Web Worker 是什么，什么场景应该用」不是只在理想输入下成立。
- 再补可观测指标：围绕「Web Worker 是什么，什么场景应该用」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Web Worker 是什么，什么场景应该用」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复盘时先确认「Web Worker 是什么，什么场景应该用」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「Web Worker 是什么，什么场景应该用」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「Web Worker 是什么，什么场景应该用」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## browser-process-thread-followup-1

title: 追问：在当前团队与业务约束下，真要把「Chrome 多进程 + 多线程架构是什么样的」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, 进程, 追问]
parent: browser-process-thread

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Chrome 多进程 + 多线程架构是什么样的」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「Chrome 多进程 + 多线程架构是什么样的」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 核心回答

- 推动「Chrome 多进程 + 多线程架构是什么样的」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「Chrome 多进程 + 多线程架构是什么样的」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Chrome 多进程 + 多线程架构是什么样的」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 复盘时先确认「Chrome 多进程 + 多线程架构是什么样的」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「Chrome 多进程 + 多线程架构是什么样的」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「Chrome 多进程 + 多线程架构是什么样的」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## webgpu-pipeline-basics-followup-1

title: 追问：在「WebGPU 比 WebGL 强在哪？最小可用渲染管线」场景下，你会先看哪些与 WebGPU 相关的指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈
difficulty: 资深
tags: [WebGPU, 图形, 高频, 追问]
parent: webgpu-pipeline-basics

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebGPU 比 WebGL 强在哪？最小可用渲染管线」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在「WebGPU 比 WebGL 强在哪？最小可用渲染管线」场景下，你会先看哪些与 WebGPU 相关的指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebGPU 比 WebGL 强在哪？最小可用渲染管线」不是只在理想输入下成立。
- 再补可观测指标：围绕「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复盘时先确认「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## webtransport-vs-websocket-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 WebTransport 重点排查「WebTransport 和 WebSocket 的关系？什么场景用」的哪些边界问题
difficulty: 资深
tags: [WebTransport, 实时通信, 追问]
parent: webtransport-vs-websocket

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「WebTransport 和 WebSocket 的关系？什么场景用」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 WebTransport 重点排查「WebTransport 和 WebSocket 的关系？什么场景用」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「WebTransport 和 WebSocket 的关系？什么场景用」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「WebTransport 和 WebSocket 的关系？什么场景用」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「WebTransport 和 WebSocket 的关系？什么场景用」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 先用一句话给出「WebTransport 和 WebSocket 的关系？什么场景用」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「WebTransport 和 WebSocket 的关系？什么场景用」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「WebTransport 和 WebSocket 的关系？什么场景用」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## webcodecs-streams-followup-1

title: 追问：你会如何识别「WebCodecs + Streams 实现浏览器内视频处理」在生产环境中最容易失效的 WebCodecs 边界因素
difficulty: 资深
tags: [WebCodecs, Streams, 视频, 追问]
parent: webcodecs-streams

### 一句话

先界定「WebCodecs + Streams 实现浏览器内视频处理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：你会如何识别「WebCodecs + Streams 实现浏览器内视频处理」在生产环境中最容易失效的 WebCodecs 边界因素？

### 答案要点

#### 核心回答

- 先界定「WebCodecs + Streams 实现浏览器内视频处理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「WebCodecs + Streams 实现浏览器内视频处理」的核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「WebCodecs 不做封装格式（mp4 / mkv），只解 / 编 raw frame」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先把「WebCodecs + Streams 实现浏览器内视频处理」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「WebCodecs + Streams 实现浏览器内视频处理」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「WebCodecs + Streams 实现浏览器内视频处理」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## navigation-api-app-history

title: Navigation API / App History 如何统一 SPA 与浏览器导航
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器]
links: [06-network/bfcache-frontend, 04-css/view-transitions-api, 22-react/react-router-data-loaders]
followups: [navigation-api-app-history-followup-1, navigation-api-app-history-followup-2, navigation-api-app-history-followup-3]

### 一句话

Navigation API 把导航拦截、提交、历史记录、转场和回退恢复变成更结构化的浏览器能力；它不是简单替代 `popstate`，而是让 SPA 路由更接近浏览器原生导航模型。

### 题目

传统 SPA 路由通常依赖 `history.pushState`、`popstate` 和框架内部状态。Navigation API / App History 想解决哪些问题？接入时要注意哪些边界？

### 答案要点

- 传统 `popstate` 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。
- Navigation API 提供 `navigation.navigate()`、`navigate` 事件、`event.intercept()`、`transition.finished` 等能力，更适合把数据加载、转场、取消和错误页统一到导航生命周期里。
- SPA 接入时要区分同文档导航和跨文档导航：站内路由可拦截并更新状态，跨域、下载、表单提交、浏览器保留行为不应强行接管。
- 与 View Transitions、BFCache、滚动恢复、焦点恢复关系很近：转场动画不能破坏无障碍和回退体验，回退后也要能恢复列表位置和表单状态。
- 兼容性仍需要 fallback：成熟路由库短期会做渐进增强，而不是要求所有浏览器立即切到新 API。

### 代码示例

```ts
if ('navigation' in window) {
  navigation.addEventListener('navigate', (event) => {
    const url = new URL(event.destination.url);
    if (url.origin !== location.origin) return;

    event.intercept({
      async handler() {
        const html = await fetch(url.pathname, { headers: { Accept: 'text/html' } }).then((r) =>
          r.text(),
        );
        document.startViewTransition?.(() => {
          document.querySelector('#app')!.innerHTML = extractAppHtml(html);
          history.replaceState(null, '', url);
        });
      },
    });
  });
}
```

### 常见误区

- 把 Navigation API 当作“新的 pushState”，忽略取消、错误恢复、滚动和焦点这些导航生命周期问题。
- 所有点击都拦截，导致下载链接、外链、带 modifier key 的新标签页打开行为被破坏。
- 只做动画，不处理 BFCache、滚动恢复和表单未保存提示，回退体验反而变差。

### 追问

- Navigation API 与框架路由的边界如何划分？
- 同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别？
- 如果浏览器不支持 Navigation API，你会如何做渐进增强？

## service-worker-followup-2

title: 追问：从工程落地角度看，当「Service Worker 生命周期与常见缓存策略」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [PWA, 离线, 追问]
parent: service-worker
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Service Worker 生命周期与常见缓存策略」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> PWA 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，当「Service Worker 生命周期与常见缓存策略」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「Service Worker 生命周期与常见缓存策略」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> PWA 方案动作 -> 验证结果」，并用「Service Worker 生命周期与常见缓存策略」举一条主链路说明。
- 如果涉及「Service Worker 生命周期与常见缓存策略」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）
- 回答「Service Worker 生命周期与常见缓存策略」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 结合一次「Service Worker 生命周期与常见缓存策略」线上案例说明 PWA 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「Service Worker 生命周期与常见缓存策略」的最小可复现样例，再扩展到主链路回归，这样能更快确认 PWA 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「Service Worker 生命周期与常见缓存策略」里的 PWA，否则很难证明变化来自这次改动。
- 围绕「Service Worker 生命周期与常见缓存策略」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「Service Worker 生命周期与常见缓存策略」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 如果没说明「Service Worker 生命周期与常见缓存策略」里 PWA 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 保持「Service Worker 生命周期与常见缓存策略」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## service-worker-followup-3

title: 追问：从工程落地角度看，围绕「Service Worker 生命周期与常见缓存策略」在 PWA 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [PWA, 离线, 追问]
parent: service-worker
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Service Worker 生命周期与常见缓存策略」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> PWA 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：从工程落地角度看，围绕「Service Worker 生命周期与常见缓存策略」在 PWA 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「Service Worker 生命周期与常见缓存策略」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> PWA 机制 -> 取舍边界」回答，再用「Service Worker 生命周期与常见缓存策略」补一个反例，避免停在口号层。
- 如果涉及「Service Worker 生命周期与常见缓存策略」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）
- 回答「Service Worker 生命周期与常见缓存策略」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 相关标签是 PWA、离线，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 给出与「Service Worker 生命周期与常见缓存策略」相关的业务上下文，说明 PWA 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「Service Worker 生命周期与常见缓存策略」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 PWA 的缺口。
- 围绕「Service Worker 生命周期与常见缓存策略」的观测层要绑定 PWA 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 围绕「Service Worker 生命周期与常见缓存策略」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「Service Worker 生命周期与常见缓存策略」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没有针对「Service Worker 生命周期与常见缓存策略」里的 PWA 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 保持「Service Worker 生命周期与常见缓存策略」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## event-loop-worker-followup-2

title: 追问：结合真实业务约束，SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头
difficulty: 进阶
tags: [事件循环, Worker, 追问]
parent: event-loop-worker
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「浏览器事件循环、主线程限制与 Worker」讲成只在理想输入下可用。；建议按「输入约束 -> 事件循环 执行链路 -> 结果验证」展开，并结合「浏览器事件循环、主线程限制与 Worker」给出一条可复核结果。

### 题目

如果面试官追问：结合真实业务约束，SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「浏览器事件循环、主线程限制与 Worker」讲成只在理想输入下可用。
- 建议按「输入约束 -> 事件循环 执行链路 -> 结果验证」展开，并结合「浏览器事件循环、主线程限制与 Worker」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「浏览器事件循环、主线程限制与 Worker」回答里，实现层面要解释 事件循环 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应
- Worker 可把计算密集型任务移到后台线程，如解析大 JSON、图像处理、搜索索引
- Worker 不能直接访问 DOM，和主线程通常通过 postMessage、Transferable 对象通信；SharedArrayBuffer 还要求安全上下文和 cross-origin isolation
- 给出与「浏览器事件循环、主线程限制与 Worker」相关的业务上下文，说明 事件循环 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「浏览器事件循环、主线程限制与 Worker」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 事件循环 的缺口。
- 围绕「浏览器事件循环、主线程限制与 Worker」的观测层要绑定 事件循环 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 「浏览器事件循环、主线程限制与 Worker」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「浏览器事件循环、主线程限制与 Worker」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 若没有针对「浏览器事件循环、主线程限制与 Worker」里的 事件循环 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 避免把「浏览器事件循环、主线程限制与 Worker」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## event-loop-worker-followup-3

title: 追问：在「浏览器事件循环、主线程限制与 Worker」场景下，web worker 和 service worker 区别
difficulty: 进阶
tags: [事件循环, Worker, 追问]
parent: event-loop-worker
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器事件循环、主线程限制与 Worker」落到真实交付，而不是停在概念层。；讲「浏览器事件循环、主线程限制与 Worker」时先给 事件循环 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在「浏览器事件循环、主线程限制与 Worker」场景下，web worker 和 service worker 区别？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器事件循环、主线程限制与 Worker」落到真实交付，而不是停在概念层。
- 讲「浏览器事件循环、主线程限制与 Worker」时先给 事件循环 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 讲「浏览器事件循环、主线程限制与 Worker」时实现侧重点应放在 事件循环 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应
- Worker 可把计算密集型任务移到后台线程，如解析大 JSON、图像处理、搜索索引
- Worker 不能直接访问 DOM，和主线程通常通过 postMessage、Transferable 对象通信；SharedArrayBuffer 还要求安全上下文和 cross-origin isolation
- 给出与「浏览器事件循环、主线程限制与 Worker」相关的业务上下文，说明 事件循环 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「浏览器事件循环、主线程限制与 Worker」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 事件循环 的缺口。
- 围绕「浏览器事件循环、主线程限制与 Worker」的观测层要绑定 事件循环 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 涉及「浏览器事件循环、主线程限制与 Worker」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「浏览器事件循环、主线程限制与 Worker」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没有针对「浏览器事件循环、主线程限制与 Worker」里的 事件循环 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 表达「浏览器事件循环、主线程限制与 Worker」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## observer-performance-api-followup-2

title: 追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 Observer 重新评估「Observer 家族与 Performance API 的实战用法」优化效果
difficulty: 进阶
tags: [Observer, 性能, 追问]
parent: observer-performance-api
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Observer 家族与 Performance API 的实战用法」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> Observer 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 Observer 重新评估「Observer 家族与 Performance API 的实战用法」优化效果？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「Observer 家族与 Performance API 的实战用法」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> Observer 方案动作 -> 验证结果」，并用「Observer 家族与 Performance API 的实战用法」举一条主链路说明。
- 如果涉及「Observer 家族与 Performance API 的实战用法」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- IntersectionObserver：懒加载、曝光埋点、无限滚动
- ResizeObserver：容器尺寸变化监听
- MutationObserver：DOM 结构变化监听
- 给出与「Observer 家族与 Performance API 的实战用法」相关的业务上下文，说明 Observer 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「Observer 家族与 Performance API 的实战用法」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 Observer 的缺口。
- 围绕「Observer 家族与 Performance API 的实战用法」的观测层要绑定 Observer 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 围绕「Observer 家族与 Performance API 的实战用法」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「Observer 家族与 Performance API 的实战用法」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没有针对「Observer 家族与 Performance API 的实战用法」里的 Observer 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 保持「Observer 家族与 Performance API 的实战用法」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## observer-performance-api-followup-3

title: 追问：在「Observer 家族与 Performance API 的实战用法」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「Observer 家族与 Performance API 的实战用法」是否值得做
difficulty: 进阶
tags: [Observer, 性能, 追问]
parent: observer-performance-api
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Observer 家族与 Performance API 的实战用法」讲成只在理想输入下可用。；建议按「输入约束 -> Observer 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「Observer 家族与 Performance API 的实战用法」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「Observer 家族与 Performance API 的实战用法」是否值得做？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「Observer 家族与 Performance API 的实战用法」讲成只在理想输入下可用。
- 建议按「输入约束 -> Observer 执行链路 -> 结果验证」展开，并结合「Observer 家族与 Performance API 的实战用法」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「Observer 家族与 Performance API 的实战用法」回答里，实现层面要解释 Observer 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- IntersectionObserver：懒加载、曝光埋点、无限滚动
- ResizeObserver：容器尺寸变化监听
- MutationObserver：DOM 结构变化监听
- 把原题观点放进「Observer 家族与 Performance API 的实战用法」的一个具体版本迭代里，讲清 Observer 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「Observer 家族与 Performance API 的实战用法」在 Observer 上的优化不是只在 demo 数据下成立。
- 围绕「Observer 家族与 Performance API 的实战用法」建监控时，建议把 Observer 指标和业务转化指标并排展示，避免只看技术侧信号。
- 「Observer 家族与 Performance API 的实战用法」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「Observer 家族与 Performance API 的实战用法」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 只关注「Observer 家族与 Performance API 的实战用法」里 Observer 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 避免把「Observer 家族与 Performance API 的实战用法」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## devtools-memory-followup-2

title: 追问：从工程落地角度看，当「浏览器 DevTools 如何排查内存泄漏与卡顿」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [DevTools, 调试, 追问]
parent: devtools-memory
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「浏览器 DevTools 如何排查内存泄漏与卡顿」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> DevTools 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，当「浏览器 DevTools 如何排查内存泄漏与卡顿」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「浏览器 DevTools 如何排查内存泄漏与卡顿」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> DevTools 方案动作 -> 验证结果」，并用「浏览器 DevTools 如何排查内存泄漏与卡顿」举一条主链路说明。
- 如果涉及「浏览器 DevTools 如何排查内存泄漏与卡顿」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 回答「浏览器 DevTools 如何排查内存泄漏与卡顿」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 相关标签是 DevTools、调试，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 排查内存泄漏常做"三次快照对比"：初始、操作后、GC 后
- 补一个你真实处理过的「浏览器 DevTools 如何排查内存泄漏与卡顿」相似场景：说明 DevTools 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「浏览器 DevTools 如何排查内存泄漏与卡顿」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 DevTools 设计测试与回归流程。
- 围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 DevTools 的真实收益是否稳定。
- 围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「浏览器 DevTools 如何排查内存泄漏与卡顿」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 另一个问题是缺少失败预案：若「浏览器 DevTools 如何排查内存泄漏与卡顿」里的 DevTools 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 保持「浏览器 DevTools 如何排查内存泄漏与卡顿」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## devtools-memory-followup-3

title: 追问：在当前团队与业务约束下，围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [DevTools, 调试, 追问]
parent: devtools-memory
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器 DevTools 如何排查内存泄漏与卡顿」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> DevTools 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器 DevTools 如何排查内存泄漏与卡顿」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> DevTools 方案动作 -> 验证结果」，并用「浏览器 DevTools 如何排查内存泄漏与卡顿」举一条主链路说明。
- 讲「浏览器 DevTools 如何排查内存泄漏与卡顿」时实现侧重点应放在 DevTools 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 回答「浏览器 DevTools 如何排查内存泄漏与卡顿」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 相关标签是 DevTools、调试，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 排查内存泄漏常做"三次快照对比"：初始、操作后、GC 后
- 补一个你真实处理过的「浏览器 DevTools 如何排查内存泄漏与卡顿」相似场景：说明 DevTools 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「浏览器 DevTools 如何排查内存泄漏与卡顿」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 DevTools 设计测试与回归流程。
- 围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 DevTools 的真实收益是否稳定。
- 涉及「浏览器 DevTools 如何排查内存泄漏与卡顿」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「浏览器 DevTools 如何排查内存泄漏与卡顿」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 另一个问题是缺少失败预案：若「浏览器 DevTools 如何排查内存泄漏与卡顿」里的 DevTools 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 表达「浏览器 DevTools 如何排查内存泄漏与卡顿」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## reflow-vs-repaint-followup-2

title: 追问：以「回流（reflow）和重绘（repaint）的区别与触发条件」为例，要证明「回流（reflow）和重绘（repaint）的区别与触发条件」确实改善体验，你会如何围绕 渲染 设计线上观测与对照验证
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: reflow-vs-repaint
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「回流（reflow）和重绘（repaint）的区别与触发条件」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「回流（reflow）和重绘（repaint）的区别与触发条件」为例，要证明「回流（reflow）和重绘（repaint）的区别与触发条件」确实改善体验，你会如何围绕 渲染 设计线上观测与对照验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「回流（reflow）和重绘（repaint）的区别与触发条件」不是只在理想输入下成立。
- 再补可观测指标：围绕「回流（reflow）和重绘（repaint）的区别与触发条件」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「回流（reflow）和重绘（repaint）的区别与触发条件」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「回流（reflow）和重绘（repaint）的区别与触发条件」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「回流（reflow）和重绘（repaint）的区别与触发条件」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「回流（reflow）和重绘（repaint）的区别与触发条件」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## reflow-vs-repaint-followup-3

title: 追问：如果「回流和重绘的区别与触发条件」在 渲染路径 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: reflow-vs-repaint
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「回流和重绘的区别与触发条件」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 渲染路径 机制 -> 取舍边界」回答，再用「回流和重绘的区别与触发条件」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：如果「回流和重绘的区别与触发条件」在 渲染路径 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「回流和重绘的区别与触发条件」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> 渲染路径 机制 -> 取舍边界」回答，再用「回流和重绘的区别与触发条件」补一个反例，避免停在口号层。
- 如果涉及「回流和重绘的区别与触发条件」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 回流（reflow / layout）：几何属性变化，浏览器需要重新计算布局
- 回流一定会重绘，重绘不一定回流
- 触发回流：尺寸/位置变化（width / height / margin / padding / top / left / font-size）、添加/移除 DOM、display 切换、读取 offset/scroll/client/getComputedStyle
- 把原题观点放进「回流和重绘的区别与触发条件」的一个具体版本迭代里，讲清 渲染路径 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「回流和重绘的区别与触发条件」在 渲染路径 上的优化不是只在 demo 数据下成立。
- 围绕「回流和重绘的区别与触发条件」建监控时，建议把 渲染路径 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「回流和重绘的区别与触发条件」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「回流和重绘的区别与触发条件」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「回流和重绘的区别与触发条件」里 渲染路径 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「回流和重绘的区别与触发条件」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## browser-cache-strategy-followup-2

title: 追问：结合真实业务约束，你会怎样验证「浏览器缓存的完整链路是什么样的」在 缓存策略 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [缓存, 性能, HTTP, 追问]
parent: browser-cache-strategy
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器缓存的完整链路是什么样的」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 缓存策略 方案动作 -> 验证结果」，并用「浏览器缓存的完整链路是什么样的」举一条主链路说明。。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「浏览器缓存的完整链路是什么样的」在 缓存策略 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器缓存的完整链路是什么样的」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> 缓存策略 方案动作 -> 验证结果」，并用「浏览器缓存的完整链路是什么样的」举一条主链路说明。
- 讲「浏览器缓存的完整链路是什么样的」时实现侧重点应放在 缓存策略 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 优先级：Service Worker → Memory Cache → Disk Cache → Push Cache（HTTP/2） → 网络
- 强缓存：Cache-Control: max-age=31536000, immutable / Expires，命中直接返回 200 (from cache)
- 协商缓存：强缓存失效后带 If-None-Match (ETag) / If-Modified-Since；服务端 304 不带 body
- 补一个你真实处理过的「浏览器缓存的完整链路是什么样的」相似场景：说明 缓存策略 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「浏览器缓存的完整链路是什么样的」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 缓存策略 设计测试与回归流程。
- 围绕「浏览器缓存的完整链路是什么样的」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 缓存策略 的真实收益是否稳定。
- 涉及「浏览器缓存的完整链路是什么样的」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「浏览器缓存的完整链路是什么样的」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 另一个问题是缺少失败预案：若「浏览器缓存的完整链路是什么样的」里的 缓存策略 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 表达「浏览器缓存的完整链路是什么样的」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## browser-cache-strategy-followup-3

title: 追问：结合真实业务约束，你会如何给「浏览器缓存的完整链路是什么样的」算一笔账：短期收益能不能覆盖后续在 缓存 上的维护成本
difficulty: 进阶
tags: [缓存, 性能, HTTP, 追问]
parent: browser-cache-strategy
generated: followup-script

### 一句话

规模变大后先重新评估「浏览器缓存的完整链路是什么样的」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「浏览器缓存的完整链路是什么样的」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：结合真实业务约束，你会如何给「浏览器缓存的完整链路是什么样的」算一笔账：短期收益能不能覆盖后续在 缓存 上的维护成本？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「浏览器缓存的完整链路是什么样的」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「浏览器缓存的完整链路是什么样的」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「浏览器缓存的完整链路是什么样的」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 复盘时先确认「浏览器缓存的完整链路是什么样的」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「浏览器缓存的完整链路是什么样的」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「浏览器缓存的完整链路是什么样的」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## cookie-localstorage-indexeddb-followup-2

title: 追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，你会如何搭建「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的攻击监控面板，及时识别绕过尝试与异常行为
difficulty: 基础
tags: [存储, 安全, 追问]
parent: cookie-localstorage-indexeddb
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，你会如何搭建「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的攻击监控面板，及时识别绕过尝试与异常行为？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」不是只在理想输入下成立。
- 再补可观测指标：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 开口先讲「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## cookie-localstorage-indexeddb-followup-3

title: 追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，当预算和人力有限时，你会怎样推进「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」以兼顾上线速度和安全下限
difficulty: 基础
tags: [存储, 安全, 追问]
parent: cookie-localstorage-indexeddb
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」讲成只在理想输入下可用。；建议按「输入约束 -> 存储 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，当预算和人力有限时，你会怎样推进「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」以兼顾上线速度和安全下限？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」讲成只在理想输入下可用。
- 建议按「输入约束 -> 存储 执行链路 -> 结果验证」展开，并结合「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」回答里，实现层面要解释 存储 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- Cookie：4KB，每个请求自动携带（适合鉴权 token），可设 HttpOnly / Secure / SameSite
- localStorage：5-10MB，同源持久存储，同步 API，纯字符串
- sessionStorage：与 localStorage 相同 API，但生命周期=Tab
- 结合一次「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」线上案例说明 存储 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的最小可复现样例，再扩展到主链路回归，这样能更快确认 存储 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」里的 存储，否则很难证明变化来自这次改动。
- 「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 如果没说明「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」里 存储 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 避免把「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## web-worker-basics-followup-2

title: 追问：以「Web Worker 是什么，什么场景应该用」为例，你会怎样验证「Web Worker 是什么，什么场景应该用」在 Worker 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [Worker, 性能, 追问]
parent: web-worker-basics
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Web Worker 是什么，什么场景应该用」不是只在理想输入下成立。；再补可观测指标：围绕「Web Worker 是什么。

### 题目

如果面试官追问：以「Web Worker 是什么，什么场景应该用」为例，你会怎样验证「Web Worker 是什么，什么场景应该用」在 Worker 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Web Worker 是什么，什么场景应该用」不是只在理想输入下成立。
- 再补可观测指标：围绕「Web Worker 是什么，什么场景应该用」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Web Worker 是什么，什么场景应该用」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先用一句话给出「Web Worker 是什么，什么场景应该用」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「Web Worker 是什么，什么场景应该用」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「Web Worker 是什么，什么场景应该用」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## web-worker-basics-followup-3

title: 追问：结合真实业务约束，如果「Web Worker 是什么，什么场景应该用」在 Worker 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [Worker, 性能, 追问]
parent: web-worker-basics
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Web Worker 是什么，什么场景应该用」落到真实交付，而不是停在概念层。；可以按「问题背景 -> Worker 机制 -> 取舍边界」回答，再用「Web Worker 是什么。

### 题目

如果面试官追问：结合真实业务约束，如果「Web Worker 是什么，什么场景应该用」在 Worker 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「Web Worker 是什么，什么场景应该用」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> Worker 机制 -> 取舍边界」回答，再用「Web Worker 是什么，什么场景应该用」补一个反例，避免停在口号层。
- 讲「Web Worker 是什么，什么场景应该用」时实现侧重点应放在 Worker 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- Dedicated Worker：专属当前页面，主页关闭就销毁；通过 postMessage 通信，不能访问 DOM
- SharedWorker：可在多个同源 Tab 共享，适合做"集中式 WebSocket 网关"
- ServiceWorker：常驻后台，拦截网络请求 + 推送通知 + 离线缓存（PWA 的核心）
- 给出与「Web Worker 是什么，什么场景应该用」相关的业务上下文，说明 Worker 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「Web Worker 是什么，什么场景应该用」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 Worker 的缺口。
- 围绕「Web Worker 是什么，什么场景应该用」的观测层要绑定 Worker 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 涉及「Web Worker 是什么，什么场景应该用」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「Web Worker 是什么，什么场景应该用」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没有针对「Web Worker 是什么，什么场景应该用」里的 Worker 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 表达「Web Worker 是什么，什么场景应该用」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## browser-process-thread-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 架构 把「Chrome 多进程 + 多线程架构是什么样的」拆成几段推进，确保每段都能独立验收
difficulty: 进阶
tags: [架构, 进程, 追问]
parent: browser-process-thread
generated: followup-script

### 一句话

推动「Chrome 多进程 + 多线程架构是什么样的」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「Chrome 多进程 + 多线程架构是什么样的」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 架构 把「Chrome 多进程 + 多线程架构是什么样的」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 核心回答

- 推动「Chrome 多进程 + 多线程架构是什么样的」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「Chrome 多进程 + 多线程架构是什么样的」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Chrome 多进程 + 多线程架构是什么样的」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 先用一句话给出「Chrome 多进程 + 多线程架构是什么样的」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「Chrome 多进程 + 多线程架构是什么样的」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「Chrome 多进程 + 多线程架构是什么样的」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## browser-process-thread-followup-3

title: 追问：在当前团队与业务约束下，要判断「Chrome 多进程 + 多线程架构是什么样的」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标
difficulty: 进阶
tags: [架构, 进程, 追问]
parent: browser-process-thread
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Chrome 多进程 + 多线程架构是什么样的」不是只在理想输入下成立。。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「Chrome 多进程 + 多线程架构是什么样的」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Chrome 多进程 + 多线程架构是什么样的」不是只在理想输入下成立。
- 再补可观测指标：围绕「Chrome 多进程 + 多线程架构是什么样的」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Chrome 多进程 + 多线程架构是什么样的」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「Chrome 多进程 + 多线程架构是什么样的」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「Chrome 多进程 + 多线程架构是什么样的」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「Chrome 多进程 + 多线程架构是什么样的」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## webgpu-pipeline-basics-followup-2

title: 追问：你会怎样验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [WebGPU, 图形, 高频, 追问]
parent: webgpu-pipeline-basics
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebGPU 比 WebGL 强在哪？最小可用渲染管线」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会怎样验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebGPU 比 WebGL 强在哪？最小可用渲染管线」不是只在理想输入下成立。
- 再补可观测指标：围绕「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「WebGPU 比 WebGL 强在哪？最小可用渲染管线」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## webgpu-pipeline-basics-followup-3

title: 追问：如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [WebGPU, 图形, 高频, 追问]
parent: webgpu-pipeline-basics
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「WebGPU 比 WebGL 强在哪？最小可用渲染管线」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> WebGPU 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「WebGPU 比 WebGL 强在哪？最小可用渲染管线」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> WebGPU 机制 -> 取舍边界」回答，再用「WebGPU 比 WebGL 强在哪？最小可用渲染管线」补一个反例，避免停在口号层。
- 如果涉及「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 没有 compute shader（WebGL 2 也没有，要绕到 fragment shader 计算）
- 3. canvas.getContext('webgpu') + configure
- ML 推理：transformers.js、ONNX Runtime Web 都已支持 WebGPU 后端
- 结合一次「WebGPU 比 WebGL 强在哪？最小可用渲染管线」线上案例说明 WebGPU 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的最小可复现样例，再扩展到主链路回归，这样能更快确认 WebGPU 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「WebGPU 比 WebGL 强在哪？最小可用渲染管线」里的 WebGPU，否则很难证明变化来自这次改动。
- 围绕「WebGPU 比 WebGL 强在哪？最小可用渲染管线」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「WebGPU 比 WebGL 强在哪？最小可用渲染管线」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 如果没说明「WebGPU 比 WebGL 强在哪？最小可用渲染管线」里 WebGPU 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 保持「WebGPU 比 WebGL 强在哪？最小可用渲染管线」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## webtransport-vs-websocket-followup-2

title: 追问：在「WebTransport 和 WebSocket 的关系？什么场景用」场景下，在「WebTransport 和 WebSocket 的关系？什么场景用」里你会怎样划分可重试与不可重试场景，防止误重试放大故障
difficulty: 资深
tags: [WebTransport, 实时通信, 追问]
parent: webtransport-vs-websocket
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「WebTransport 和 WebSocket 的关系？什么场景用」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> WebTransport 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「WebTransport 和 WebSocket 的关系？什么场景用」场景下，在「WebTransport 和 WebSocket 的关系？什么场景用」里你会怎样划分可重试与不可重试场景，防止误重试放大故障？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「WebTransport 和 WebSocket 的关系？什么场景用」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> WebTransport 方案动作 -> 验证结果」，并用「WebTransport 和 WebSocket 的关系？什么场景用」举一条主链路说明。
- 讲「WebTransport 和 WebSocket 的关系？什么场景用」时实现侧重点应放在 WebTransport 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- WebSocket 的局限
- WebTransport 提供两种通道
- streams（双向 / 单向）：可靠有序，类似 WebSocket，但多路复用——一条流堵了不影响其他
- 给出与「WebTransport 和 WebSocket 的关系？什么场景用」相关的业务上下文，说明 WebTransport 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「WebTransport 和 WebSocket 的关系？什么场景用」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 WebTransport 的缺口。
- 围绕「WebTransport 和 WebSocket 的关系？什么场景用」的观测层要绑定 WebTransport 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 涉及「WebTransport 和 WebSocket 的关系？什么场景用」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「WebTransport 和 WebSocket 的关系？什么场景用」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没有针对「WebTransport 和 WebSocket 的关系？什么场景用」里的 WebTransport 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 表达「WebTransport 和 WebSocket 的关系？什么场景用」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## webtransport-vs-websocket-followup-3

title: 追问：结合真实业务约束，你会如何把「WebTransport 和 WebSocket 的关系？什么场景用」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定
difficulty: 资深
tags: [WebTransport, 实时通信, 追问]
parent: webtransport-vs-websocket
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「WebTransport 和 WebSocket 的关系？什么场景用」讲成只在理想输入下可用。；围绕「WebTransport 和 WebSocket 的关系？什么场景用」组织答案时。

### 题目

如果面试官追问：结合真实业务约束，你会如何把「WebTransport 和 WebSocket 的关系？什么场景用」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「WebTransport 和 WebSocket 的关系？什么场景用」讲成只在理想输入下可用。
- 围绕「WebTransport 和 WebSocket 的关系？什么场景用」组织答案时，建议按「约束来源 -> WebTransport 关键决策 -> 验证闭环」展开。
- 在「WebTransport 和 WebSocket 的关系？什么场景用」回答里，实现层面要解释 WebTransport 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- WebSocket 的局限
- WebTransport 提供两种通道
- streams（双向 / 单向）：可靠有序，类似 WebSocket，但多路复用——一条流堵了不影响其他
- 若能补一段「WebTransport 和 WebSocket 的关系？什么场景用」复盘片段，解释 WebTransport 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「WebTransport 和 WebSocket 的关系？什么场景用」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 WebTransport 的预期结果写成可复核标准。
- 在「WebTransport 和 WebSocket 的关系？什么场景用」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 WebTransport 的问题定位闭环。
- 「WebTransport 和 WebSocket 的关系？什么场景用」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「WebTransport 和 WebSocket 的关系？什么场景用」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 若没说明「WebTransport 和 WebSocket 的关系？什么场景用」在 WebTransport 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 避免把「WebTransport 和 WebSocket 的关系？什么场景用」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## opfs-file-system-access-followup-1

title: 追问：在当前团队与业务约束下，OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线, 追问]
parent: opfs-file-system-access
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」在当前约束下为什么成立。；回答结构可按「触发条件 -> OPFS 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」在当前约束下为什么成立。
- 回答结构可按「触发条件 -> OPFS 机制 -> 风险兜底」展开，并以「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」补一条失败场景，能体现工程拆解能力。
- 不要只罗列工具名或 API，最好把「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。
- OPFS（Origin Private File System）是站点私有文件系统，适合 WASM、编辑器、音视频、离线包和大文件缓存；用户通常看不到这些文件，权限模型也不同于真实磁盘文件。
- File System Access API 让用户显式选择文件或目录，适合“打开本地项目、保存到用户指定路径”的应用，但兼容性和权限提示需要认真设计。
- 结合一次「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」线上案例说明 OPFS 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」的最小可复现样例，再扩展到主链路回归，这样能更快确认 OPFS 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」里的 OPFS，否则很难证明变化来自这次改动。
- 如果「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 如果没说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」里 OPFS 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 不要把「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## opfs-file-system-access-followup-2

title: 追问：在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」场景下，本地大文件缓存如何做配额控制和过期清理
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线, 追问]
parent: opfs-file-system-access
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」时要能同时解释收益、代价和失败信号。。

### 题目

如果面试官追问：在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」场景下，本地大文件缓存如何做配额控制和过期清理？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」时要能同时解释收益、代价和失败信号。
- 讲「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」时先给 OPFS 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。
- OPFS（Origin Private File System）是站点私有文件系统，适合 WASM、编辑器、音视频、离线包和大文件缓存；用户通常看不到这些文件，权限模型也不同于真实磁盘文件。
- File System Access API 让用户显式选择文件或目录，适合“打开本地项目、保存到用户指定路径”的应用，但兼容性和权限提示需要认真设计。
- 结合一次「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」线上案例说明 OPFS 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」的最小可复现样例，再扩展到主链路回归，这样能更快确认 OPFS 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」里的 OPFS，否则很难证明变化来自这次改动。
- 围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 如果没说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」里 OPFS 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 保持「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## opfs-file-system-access-followup-3

title: 追问：在当前团队与业务约束下，离线编辑器如何避免本地数据损坏导致用户草稿丢失
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线, 追问]
parent: opfs-file-system-access
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」在当前约束下为什么成立。；建议按「输入约束 -> OPFS 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，离线编辑器如何避免本地数据损坏导致用户草稿丢失？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」在当前约束下为什么成立。
- 建议按「输入约束 -> OPFS 执行链路 -> 结果验证」展开，并结合「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 不要只罗列工具名或 API，最好把「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。
- OPFS（Origin Private File System）是站点私有文件系统，适合 WASM、编辑器、音视频、离线包和大文件缓存；用户通常看不到这些文件，权限模型也不同于真实磁盘文件。
- 大文件场景要分层：IndexedDB 存索引和元信息，OPFS 存内部块文件，File System Access 做导入/导出或用户可见文件编辑。
- 若能补一段「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」复盘片段，解释 OPFS 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 OPFS 的预期结果写成可复核标准。
- 在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 OPFS 的问题定位闭环。
- 如果「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没说明「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」在 OPFS 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 不要把「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## navigation-api-app-history-followup-1

title: 追问：在「Navigation API / App History 如何统一 SPA 与浏览器导航」场景下，Navigation API 与框架路由的边界如何划分
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器, 追问]
parent: navigation-api-app-history
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Navigation API / App History 如何统一 SPA 与浏览器导航」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> NavigationAPI 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「Navigation API / App History 如何统一 SPA 与浏览器导航」场景下，Navigation API 与框架路由的边界如何划分？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「Navigation API / App History 如何统一 SPA 与浏览器导航」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> NavigationAPI 机制 -> 取舍边界」回答，再用「Navigation API / App History 如何统一 SPA 与浏览器导航」补一个反例，避免停在口号层。
- 如果涉及「Navigation API / App History 如何统一 SPA 与浏览器导航」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 传统 popstate 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。
- Navigation API 提供 navigation.navigate()、navigate 事件、event.intercept()、transition.finished 等能力，更适合把数据加载、转场、取消和错误页统一到导航生命周期里。
- SPA 接入时要区分同文档导航和跨文档导航：站内路由可拦截并更新状态，跨域、下载、表单提交、浏览器保留行为不应强行接管。
- 结合一次「Navigation API / App History 如何统一 SPA 与浏览器导航」线上案例说明 NavigationAPI 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「Navigation API / App History 如何统一 SPA 与浏览器导航」的最小可复现样例，再扩展到主链路回归，这样能更快确认 NavigationAPI 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「Navigation API / App History 如何统一 SPA 与浏览器导航」里的 NavigationAPI，否则很难证明变化来自这次改动。
- 围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「Navigation API / App History 如何统一 SPA 与浏览器导航」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 如果没说明「Navigation API / App History 如何统一 SPA 与浏览器导航」里 NavigationAPI 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 保持「Navigation API / App History 如何统一 SPA 与浏览器导航」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## navigation-api-app-history-followup-2

title: 追问：同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器, 追问]
parent: navigation-api-app-history
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Navigation API / App History 如何统一 SPA 与浏览器导航」讲成只在理想输入下可用。；回答结构可按「触发条件 -> NavigationAPI 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「Navigation API / App History 如何统一 SPA 与浏览器导航」讲成只在理想输入下可用。
- 回答结构可按「触发条件 -> NavigationAPI 机制 -> 风险兜底」展开，并以「Navigation API / App History 如何统一 SPA 与浏览器导航」补一条失败场景，能体现工程拆解能力。
- 在「Navigation API / App History 如何统一 SPA 与浏览器导航」回答里，实现层面要解释 NavigationAPI 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 传统 popstate 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。
- SPA 接入时要区分同文档导航和跨文档导航：站内路由可拦截并更新状态，跨域、下载、表单提交、浏览器保留行为不应强行接管。
- 与 View Transitions、BFCache、滚动恢复、焦点恢复关系很近：转场动画不能破坏无障碍和回退体验，回退后也要能恢复列表位置和表单状态。
- 把原题观点放进「Navigation API / App History 如何统一 SPA 与浏览器导航」的一个具体版本迭代里，讲清 NavigationAPI 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「Navigation API / App History 如何统一 SPA 与浏览器导航」在 NavigationAPI 上的优化不是只在 demo 数据下成立。
- 围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」建监控时，建议把 NavigationAPI 指标和业务转化指标并排展示，避免只看技术侧信号。
- 「Navigation API / App History 如何统一 SPA 与浏览器导航」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「Navigation API / App History 如何统一 SPA 与浏览器导航」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 只关注「Navigation API / App History 如何统一 SPA 与浏览器导航」里 NavigationAPI 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 避免把「Navigation API / App History 如何统一 SPA 与浏览器导航」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## navigation-api-app-history-followup-3

title: 追问：从工程落地角度看，如果浏览器不支持 Navigation API，你会如何做渐进增强
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器, 追问]
parent: navigation-api-app-history
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Navigation API / App History 如何统一 SPA 与浏览器导航」落到真实交付，而不是停在概念层。。

### 题目

如果面试官追问：从工程落地角度看，如果浏览器不支持 Navigation API，你会如何做渐进增强？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「Navigation API / App History 如何统一 SPA 与浏览器导航」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> NavigationAPI 方案动作 -> 验证结果」，并用「Navigation API / App History 如何统一 SPA 与浏览器导航」举一条主链路说明。
- 讲「Navigation API / App History 如何统一 SPA 与浏览器导航」时实现侧重点应放在 NavigationAPI 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- Navigation API 提供 navigation.navigate()、navigate 事件、event.intercept()、transition.finished 等能力，更适合把数据加载、转场、取消和错误页统一到导航生命周期里。
- SPA 接入时要区分同文档导航和跨文档导航：站内路由可拦截并更新状态，跨域、下载、表单提交、浏览器保留行为不应强行接管。
- 兼容性仍需要 fallback：成熟路由库短期会做渐进增强，而不是要求所有浏览器立即切到新 API。
- 若能补一段「Navigation API / App History 如何统一 SPA 与浏览器导航」复盘片段，解释 NavigationAPI 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 NavigationAPI 的预期结果写成可复核标准。
- 在「Navigation API / App History 如何统一 SPA 与浏览器导航」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 NavigationAPI 的问题定位闭环。
- 涉及「Navigation API / App History 如何统一 SPA 与浏览器导航」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「Navigation API / App History 如何统一 SPA 与浏览器导航」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没说明「Navigation API / App History 如何统一 SPA 与浏览器导航」在 NavigationAPI 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 表达「Navigation API / App History 如何统一 SPA 与浏览器导航」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## storage-cookie-followup-2

title: 追问：从工程落地角度看，你会如何围绕 存储 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 基础
tags: [存储, Cookie, 追问]
parent: storage-cookie
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」讲成只在理想输入下可用。。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 存储 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」讲成只在理想输入下可用。
- 围绕「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」组织答案时，建议按「约束来源 -> 存储 关键决策 -> 验证闭环」展开。
- 在「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」回答里，实现层面要解释 存储 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 回答「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 相关标签是 存储、Cookie，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 补一个你真实处理过的「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」相似场景：说明 存储 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 存储 设计测试与回归流程。
- 围绕「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 存储 的真实收益是否稳定。
- 「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 另一个问题是缺少失败预案：若「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里的 存储 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 避免把「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## storage-cookie-followup-3

title: 追问：当约束变化导致成本上升时，你会先优化「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里和 存储 相关的哪些环节
difficulty: 基础
tags: [存储, Cookie, 追问]
parent: storage-cookie
generated: followup-script

### 一句话

规模变大后先重新评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：当约束变化导致成本上升时，你会先优化「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里和 存储 相关的哪些环节？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 准备这道追问时，先画出「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」从输入到输出的关键路径，再补异常路径。
- 准备一个「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## v8-engine-followup-2

title: 追问：以「V8 引擎工作机制」为例，如果要让结论在 V8 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [V8, 引擎, 追问]
parent: v8-engine
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「V8 引擎工作机制」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> V8 方案动作 -> 验证结果」，并用「V8 引擎工作机制」举一条主链路说明。。

### 题目

如果面试官追问：以「V8 引擎工作机制」为例，如果要让结论在 V8 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「V8 引擎工作机制」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> V8 方案动作 -> 验证结果」，并用「V8 引擎工作机制」举一条主链路说明。
- 讲「V8 引擎工作机制」时实现侧重点应放在 V8 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 隐藏类（Hidden Class / Map）：对象按属性顺序生成 shape，频繁改变 shape 会让 V8 退化到字典模式
- 回答「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 相关标签是 V8、引擎，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 结合一次「V8 引擎工作机制」线上案例说明 V8 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「V8 引擎工作机制」的最小可复现样例，再扩展到主链路回归，这样能更快确认 V8 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「V8 引擎工作机制」里的 V8，否则很难证明变化来自这次改动。
- 涉及「V8 引擎工作机制」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「V8 引擎工作机制」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「V8 引擎工作机制」里 V8 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「V8 引擎工作机制」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## v8-engine-followup-3

title: 追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 V8 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [V8, 引擎, 追问]
parent: v8-engine
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「V8 引擎工作机制」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> V8 方案动作 -> 验证结果」，并用「V8 引擎工作机制」举一条主链路说明。。

### 题目

如果面试官追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 V8 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「V8 引擎工作机制」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> V8 方案动作 -> 验证结果」，并用「V8 引擎工作机制」举一条主链路说明。
- 讲「V8 引擎工作机制」时实现侧重点应放在 V8 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 隐藏类（Hidden Class / Map）：对象按属性顺序生成 shape，频繁改变 shape 会让 V8 退化到字典模式
- 实践含义：保持对象 shape 稳定（构造时一次性赋值）、避免 megamorphic 调用、减少临时对象
- 回答「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 结合一次「V8 引擎工作机制」线上案例说明 V8 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「V8 引擎工作机制」的最小可复现样例，再扩展到主链路回归，这样能更快确认 V8 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「V8 引擎工作机制」里的 V8，否则很难证明变化来自这次改动。
- 涉及「V8 引擎工作机制」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「V8 引擎工作机制」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「V8 引擎工作机制」里 V8 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「V8 引擎工作机制」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## webgpu-overview-followup-2

title: 追问：在「WebGPU 概览与适用场景」场景下，为了证明这个方案在 WebGPU 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [WebGPU, GPU, 追问]
parent: webgpu-overview
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「WebGPU 概览与适用场景」在当前约束下为什么成立。；回答结构可按「触发条件 -> WebGPU 机制 -> 风险兜底」展开，并以「WebGPU 概览与适用场景」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：在「WebGPU 概览与适用场景」场景下，为了证明这个方案在 WebGPU 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「WebGPU 概览与适用场景」在当前约束下为什么成立。
- 回答结构可按「触发条件 -> WebGPU 机制 -> 风险兜底」展开，并以「WebGPU 概览与适用场景」补一条失败场景，能体现工程拆解能力。
- 不要只罗列工具名或 API，最好把「WebGPU 概览与适用场景」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader
- 适用：3D 渲染、机器学习推理（TensorFlow.js WebGPU backend）、视频特效、粒子模拟
- 回答「WebGPU 概览与适用场景」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 给出与「WebGPU 概览与适用场景」相关的业务上下文，说明 WebGPU 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「WebGPU 概览与适用场景」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 WebGPU 的缺口。
- 围绕「WebGPU 概览与适用场景」的观测层要绑定 WebGPU 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 如果「WebGPU 概览与适用场景」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「WebGPU 概览与适用场景」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没有针对「WebGPU 概览与适用场景」里的 WebGPU 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 不要把「WebGPU 概览与适用场景」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## webgpu-overview-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「WebGPU 概览与适用场景」里和 WebGPU 相关的哪些环节
difficulty: 资深
tags: [WebGPU, GPU, 追问]
parent: webgpu-overview
generated: followup-script

### 一句话

规模变大后先重新评估「WebGPU 概览与适用场景」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「WebGPU 概览与适用场景」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「WebGPU 概览与适用场景」里和 WebGPU 相关的哪些环节？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「WebGPU 概览与适用场景」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「WebGPU 概览与适用场景」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「WebGPU 概览与适用场景」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 先把「WebGPU 概览与适用场景」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「WebGPU 概览与适用场景」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「WebGPU 概览与适用场景」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## webcodecs-streams-followup-2

title: 追问：结合真实业务约束，上线后你会盯哪些和 WebCodecs 相关的指标，来判断「WebCodecs + Streams 实现浏览器内视频处理」的收益是否持续成立
difficulty: 资深
tags: [WebCodecs, Streams, 视频, 追问]
parent: webcodecs-streams
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebCodecs + Streams 实现浏览器内视频处理」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，上线后你会盯哪些和 WebCodecs 相关的指标，来判断「WebCodecs + Streams 实现浏览器内视频处理」的收益是否持续成立？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebCodecs + Streams 实现浏览器内视频处理」不是只在理想输入下成立。
- 再补可观测指标：围绕「WebCodecs + Streams 实现浏览器内视频处理」的核心机制应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「WebCodecs + Streams 实现浏览器内视频处理」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 开口先讲「WebCodecs + Streams 实现浏览器内视频处理」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「WebCodecs + Streams 实现浏览器内视频处理」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「WebCodecs + Streams 实现浏览器内视频处理」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## webcodecs-streams-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 WebCodecs 重排「WebCodecs + Streams 实现浏览器内视频处理」方案优先级
difficulty: 资深
tags: [WebCodecs, Streams, 视频, 追问]
parent: webcodecs-streams
generated: followup-script

### 一句话

规模变大后先重新评估「WebCodecs + Streams 实现浏览器内视频处理」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「WebCodecs + Streams 实现浏览器内视频处理」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 WebCodecs 重排「WebCodecs + Streams 实现浏览器内视频处理」方案优先级？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「WebCodecs + Streams 实现浏览器内视频处理」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「WebCodecs + Streams 实现浏览器内视频处理」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「WebCodecs + Streams 实现浏览器内视频处理」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 复盘时先确认「WebCodecs + Streams 实现浏览器内视频处理」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「WebCodecs + Streams 实现浏览器内视频处理」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「WebCodecs + Streams 实现浏览器内视频处理」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## browser-progressive-enhancement-guardrail

title: 浏览器新能力上线护栏：特性检测、降级与回滚
difficulty: 资深
tags: [兼容性, 渐进增强, 发布]
followups: [browser-progressive-enhancement-guardrail-followup-1, browser-progressive-enhancement-guardrail-followup-2, browser-progressive-enhancement-guardrail-followup-3]

### 一句话

浏览器新能力上线要遵循“渐进增强”而不是“全量替换”：先做能力检测和分层降级，再用灰度与开关控制影响面，确保不支持新能力的用户仍有可用路径。

### 题目

你计划上线一个依赖新 Web API 的能力（例如 WebGPU、Navigation API 或 File System Access）。如何设计上线护栏，避免兼容性事故？

### 答案要点

- 先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。
- 能力检测优先于 UA 判断：运行时 `feature detection` 更可靠，避免 UA 伪装和版本碎片导致误判。
- 降级路径要可验证：例如 WebGPU 降级到 WebGL2，File System Access 降级到上传/下载模式，不能只弹“浏览器不支持”。
- 发布阶段要可控：按人群或流量灰度放量，配合特性开关（kill switch）实现分钟级回退。
- 指标看板要分端观察：错误率、失败原因、降级命中率、关键任务完成率，不能只看整体成功率。
- 回滚策略要包含“数据兼容”：新旧路径同时运行时，要保证状态和存储结构可双向兼容。

### 代码示例

```ts
// 1) 能力检测 + 降级分流
function pickRenderer() {
  if ('gpu' in navigator) return 'webgpu';
  const canvas = document.createElement('canvas');
  if (canvas.getContext('webgl2')) return 'webgl2';
  return 'cpu';
}

const renderer = pickRenderer();
if (renderer === 'cpu') {
  showFallbackModeBanner();
}
```

```ts
// 2) 发布开关：可快速止损
function isFeatureEnabled(userId: string) {
  return featureFlag('browser_new_pipeline_v2', userId);
}

export function boot(userId: string) {
  if (!isFeatureEnabled(userId)) return bootLegacyPipeline();
  try {
    return bootNewPipeline();
  } catch {
    // 兜底回退
    return bootLegacyPipeline();
  }
}
```

### 追问

- 「浏览器新能力上线护栏：特性检测、降级与回滚」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做 UA 判断不做能力检测，导致特性命中率和真实可用率不一致。
- 有主路径没降级路径，线上遇到不支持环境只能临时回滚。
- 只看技术错误率，不看业务任务完成率，容易误判上线效果。

### 延伸

- 渐进增强的目标不是“所有端体验完全一样”，而是“所有端都可完成核心任务”。
- 新能力上线前可先做“影子模式”采样，先观测兼容性再放量。

## browser-performance-budget-guardrail

title: 浏览器性能预算治理：把优化目标写进发布流程
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理]
followups: [browser-performance-budget-guardrail-followup-1, browser-performance-budget-guardrail-followup-2, browser-performance-budget-guardrail-followup-3]

### 一句话

性能优化要从“发现问题后补救”升级为“发布前有预算、发布中有护栏、发布后有追踪”：把 LCP/INP/CLS 与资源体积预算纳入 CI/CD，防止性能债务持续累积。

### 题目

你会如何给前端项目建立性能预算，并把预算真正落到日常发布流程中？

### 答案要点

- 预算要分层：资源预算（JS/CSS/图片体积）+ 体验预算（LCP/INP/CLS）+ 运行时预算（长任务、主线程阻塞）。
- 阈值要按业务场景设定：营销页、后台页、弱网地区不能用同一标准，避免“统一目标”失真。
- CI 阶段要自动守门：超过预算直接阻断发布，或至少触发强提醒和审批流程。
- 发布阶段要做灰度对比：新旧版本同口径看 RUM 指标，确认收益来自本次改动而不是样本波动。
- 预算治理要防“短期刷分”：同时看技术指标和业务指标（转化、留存、关键路径完成率）。
- 预算失守要有修复节奏：定义性能债台账和回补窗口，避免问题长期堆积。

### 代码示例

```json
// perf-budget.json（示例）
{
  "assets": {
    "entryJsKb": 220,
    "entryCssKb": 80,
    "imageKbAboveFold": 300
  },
  "webVitals": {
    "lcpP75Ms": 2500,
    "inpP75Ms": 200,
    "clsP75": 0.1
  }
}
```

```ts
// 伪代码：CI 预算校验
const report = await loadLighthouseAndBundleReport();
if (report.entryJsKb > budget.assets.entryJsKb) fail('entry JS 超预算');
if (report.lcpP75Ms > budget.webVitals.lcpP75Ms) fail('LCP 超预算');
```

### 追问

- 「浏览器性能预算治理：把优化目标写进发布流程」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只设实验室预算，不看真实用户口径，导致发布后收益不稳定。
- 预算只看首屏体积，不看交互时延和长任务，用户仍会感知卡顿。
- 预算超标没有治理闭环，最后变成“看板存在但没人处理”。

### 延伸

- 性能预算最有效的形态是“自动化守门 + 业务共识”，而不是单纯写在文档里。
- 可以按页面类型建立多套预算，减少“一个指标管所有页面”的误导。

## browser-progressive-enhancement-guardrail-followup-1

title: 追问：在「浏览器新能力上线护栏：特性检测、降级与回滚」场景下，真要把「浏览器新能力上线护栏：特性检测、降级与回滚」推到线上，你会如何围绕 兼容性 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [兼容性, 渐进增强, 发布, 追问]
parent: browser-progressive-enhancement-guardrail
generated: followup-script

### 一句话

规模变大后先重新评估「浏览器新能力上线护栏：特性检测、降级与回滚」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「浏览器新能力上线护栏：特性检测、降级与回滚」对应的工程可维护性收益被复杂度抵消。

### 题目

如果面试官追问：在「浏览器新能力上线护栏：特性检测、降级与回滚」场景下，真要把「浏览器新能力上线护栏：特性检测、降级与回滚」推到线上，你会如何围绕 兼容性 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「浏览器新能力上线护栏：特性检测、降级与回滚」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「浏览器新能力上线护栏：特性检测、降级与回滚」对应的工程可维护性收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「浏览器新能力上线护栏：特性检测、降级与回滚」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 先用一句话给出「浏览器新能力上线护栏：特性检测、降级与回滚」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「浏览器新能力上线护栏：特性检测、降级与回滚」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「浏览器新能力上线护栏：特性检测、降级与回滚」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## browser-progressive-enhancement-guardrail-followup-2

title: 追问：以「浏览器新能力上线护栏：特性检测、降级与回滚」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 兼容性 方案有效
difficulty: 资深
tags: [兼容性, 渐进增强, 发布, 追问]
parent: browser-progressive-enhancement-guardrail
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器新能力上线护栏：特性检测、降级与回滚」落到真实交付，而不是停在概念层。；可以按「问题背景 -> 兼容性 机制 -> 取舍边界」回答，再用「浏览器新能力上线护栏：特性检测、降级与回滚」补一个反例。

### 题目

如果面试官追问：以「浏览器新能力上线护栏：特性检测、降级与回滚」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 兼容性 方案有效？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器新能力上线护栏：特性检测、降级与回滚」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> 兼容性 机制 -> 取舍边界」回答，再用「浏览器新能力上线护栏：特性检测、降级与回滚」补一个反例，避免停在口号层。
- 讲「浏览器新能力上线护栏：特性检测、降级与回滚」时实现侧重点应放在 兼容性 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。
- 能力检测优先于 UA 判断：运行时 feature detection 更可靠，避免 UA 伪装和版本碎片导致误判。
- 降级路径要可验证：例如 WebGPU 降级到 WebGL2，File System Access 降级到上传/下载模式，不能只弹“浏览器不支持”。
- 结合一次「浏览器新能力上线护栏：特性检测、降级与回滚」线上案例说明 兼容性 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「浏览器新能力上线护栏：特性检测、降级与回滚」的最小可复现样例，再扩展到主链路回归，这样能更快确认 兼容性 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「浏览器新能力上线护栏：特性检测、降级与回滚」里的 兼容性，否则很难证明变化来自这次改动。
- 涉及「浏览器新能力上线护栏：特性检测、降级与回滚」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「浏览器新能力上线护栏：特性检测、降级与回滚」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「浏览器新能力上线护栏：特性检测、降级与回滚」里 兼容性 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「浏览器新能力上线护栏：特性检测、降级与回滚」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## browser-progressive-enhancement-guardrail-followup-3

title: 追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「浏览器新能力上线护栏：特性检测、降级与回滚」范围，并把 兼容性 相关技术债回补计划讲清楚
difficulty: 资深
tags: [兼容性, 渐进增强, 发布, 追问]
parent: browser-progressive-enhancement-guardrail
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器新能力上线护栏：特性检测、降级与回滚」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 兼容性 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「浏览器新能力上线护栏：特性检测、降级与回滚」范围，并把 兼容性 相关技术债回补计划讲清楚？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器新能力上线护栏：特性检测、降级与回滚」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> 兼容性 方案动作 -> 验证结果」，并用「浏览器新能力上线护栏：特性检测、降级与回滚」举一条主链路说明。
- 讲「浏览器新能力上线护栏：特性检测、降级与回滚」时实现侧重点应放在 兼容性 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。
- 能力检测优先于 UA 判断：运行时 feature detection 更可靠，避免 UA 伪装和版本碎片导致误判。
- 降级路径要可验证：例如 WebGPU 降级到 WebGL2，File System Access 降级到上传/下载模式，不能只弹“浏览器不支持”。
- 若能补一段「浏览器新能力上线护栏：特性检测、降级与回滚」复盘片段，解释 兼容性 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「浏览器新能力上线护栏：特性检测、降级与回滚」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 兼容性 的预期结果写成可复核标准。
- 在「浏览器新能力上线护栏：特性检测、降级与回滚」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 兼容性 的问题定位闭环。
- 涉及「浏览器新能力上线护栏：特性检测、降级与回滚」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「浏览器新能力上线护栏：特性检测、降级与回滚」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没说明「浏览器新能力上线护栏：特性检测、降级与回滚」在 兼容性 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 表达「浏览器新能力上线护栏：特性检测、降级与回滚」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## browser-performance-budget-guardrail-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 性能预算 相关的指标来判断「浏览器性能预算治理：把优化目标写进发布流程」是不是当前性能瓶颈
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理, 追问]
parent: browser-performance-budget-guardrail
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器性能预算治理：把优化目标写进发布流程」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 性能预算 相关的指标来判断「浏览器性能预算治理：把优化目标写进发布流程」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器性能预算治理：把优化目标写进发布流程」不是只在理想输入下成立。
- 再补可观测指标：围绕「浏览器性能预算治理：把优化目标写进发布流程」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「浏览器性能预算治理：把优化目标写进发布流程」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「浏览器性能预算治理：把优化目标写进发布流程」的核心机制，再补一个会失败的具体场景。
- 准备一个与「浏览器性能预算治理：把优化目标写进发布流程」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「浏览器性能预算治理：把优化目标写进发布流程」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## browser-performance-budget-guardrail-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 性能预算 方案有效
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理, 追问]
parent: browser-performance-budget-guardrail
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器性能预算治理：把优化目标写进发布流程」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 性能预算 方案动作 -> 验证结果」。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 性能预算 方案有效？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「浏览器性能预算治理：把优化目标写进发布流程」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> 性能预算 方案动作 -> 验证结果」，并用「浏览器性能预算治理：把优化目标写进发布流程」举一条主链路说明。
- 讲「浏览器性能预算治理：把优化目标写进发布流程」时实现侧重点应放在 性能预算 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 预算要分层：资源预算（JS/CSS/图片体积）+ 体验预算（LCP/INP/CLS）+ 运行时预算（长任务、主线程阻塞）。
- 阈值要按业务场景设定：营销页、后台页、弱网地区不能用同一标准，避免“统一目标”失真。
- CI 阶段要自动守门：超过预算直接阻断发布，或至少触发强提醒和审批流程。
- 补一个你真实处理过的「浏览器性能预算治理：把优化目标写进发布流程」相似场景：说明 性能预算 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「浏览器性能预算治理：把优化目标写进发布流程」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 性能预算 设计测试与回归流程。
- 围绕「浏览器性能预算治理：把优化目标写进发布流程」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 性能预算 的真实收益是否稳定。
- 涉及「浏览器性能预算治理：把优化目标写进发布流程」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「浏览器性能预算治理：把优化目标写进发布流程」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 另一个问题是缺少失败预案：若「浏览器性能预算治理：把优化目标写进发布流程」里的 性能预算 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 表达「浏览器性能预算治理：把优化目标写进发布流程」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## browser-performance-budget-guardrail-followup-3

title: 追问：以「浏览器性能预算治理：把优化目标写进发布流程」为例，围绕「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理, 追问]
parent: browser-performance-budget-guardrail
generated: followup-script

### 一句话

规模变大后先重新评估「浏览器性能预算治理：把优化目标写进发布流程」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「浏览器性能预算治理：把优化目标写进发布流程」对应的性能收益被复杂度抵消。

### 题目

如果面试官追问：以「浏览器性能预算治理：把优化目标写进发布流程」为例，围绕「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「浏览器性能预算治理：把优化目标写进发布流程」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「浏览器性能预算治理：把优化目标写进发布流程」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「浏览器性能预算治理：把优化目标写进发布流程」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 准备这道追问时，先画出「浏览器性能预算治理：把优化目标写进发布流程」从输入到输出的关键路径，再补异常路径。
- 准备一个「浏览器性能预算治理：把优化目标写进发布流程」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「浏览器性能预算治理：把优化目标写进发布流程」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## browser-compatibility-incident-bridge

title: 浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通]
followups: [browser-compatibility-incident-bridge-followup-1, browser-compatibility-incident-bridge-followup-2, browser-compatibility-incident-bridge-followup-3]

### 一句话

兼容性事故最怕“技术团队在修、业务团队在猜”：统一指挥桥与解释口径比单点修复更关键。

### 题目

某次发布后，低版本 Safari 白屏率突增，但 Chrome 一切正常。运营要求立刻回滚，产品希望先观察。你作为前端负责人，会如何组织兼容性事故指挥桥并快速拍板？

### 答案要点

- 先分层定位：按浏览器版本、设备型号、系统版本拆分影响面，避免全量误判。
- 先确认数据可信：白屏埋点、资源加载失败、JS 异常三路信号要交叉验证。
- 明确拍板条件：触发阈值（白屏率、影响用户量、恢复 ETA）提前约定，减少争论。
- 动作分级执行：高风险版本先切降级包，中风险版本先开特性开关，低风险版本继续观察。
- 对外沟通要统一：给业务“当前影响 + 临时措施 + 下一次更新时间”，不只给技术日志。
- 复盘要沉淀：事故原因、检测缺口、预防规则（兼容矩阵和预检）写入发布流程。

### 代码示例

```ts
type CompatSignal = {
  browser: string;
  version: number;
  whiteScreenRate: number;
  fatalJsRate: number;
};

function needEmergencyMitigation(s: CompatSignal) {
  return s.whiteScreenRate >= 0.02 || s.fatalJsRate >= 0.01;
}
```

```yaml
compat_incident_bridge:
  triage_dimensions:
    - browser_family
    - browser_version
    - os_version
  actions:
    high_risk: rollback_or_disable_feature
    medium_risk: enable_fallback_bundle
    low_risk: monitor_with_guardrail
```

### 追问

- 「浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看整体白屏率，不看版本分层，导致动作过度或不足。
- 事故沟通只在技术群流转，业务方无法获得可执行信息。
- 修复上线后不做回归矩阵复核，同类问题反复出现。

### 延伸

- 可在发布系统加入“高风险浏览器灰度闸门”。
- 建议沉淀兼容性事故模板，压缩跨团队沟通时间。

## browser-kill-switch-orchestration

title: 浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略]
followups: [browser-kill-switch-orchestration-followup-1, browser-kill-switch-orchestration-followup-2, browser-kill-switch-orchestration-followup-3]

### 一句话

Kill Switch 不是“一个大开关”，而是分层止损能力：关什么、怎么关、何时恢复都要提前设计。

### 题目

你们上线了依赖新浏览器能力的重功能（如 WebGPU / File System Access），上线后部分环境出现异常。你会如何设计 Kill Switch 编排，保证止损快且恢复有序？

### 答案要点

- 开关要分层：全局开关、浏览器版本开关、功能模块开关分开，避免一刀切。
- 降级路径要预演：新能力关闭后必须有可用替代链路（WebGL2 / 上传下载 / 只读模式）。
- 切换要幂等：多次触发不会导致状态错乱，避免事故中“开关抖动”。
- 观测要绑定动作：每次开关动作要记录影响范围、恢复时长和用户体验变化。
- 恢复要分阶段：先小流量回开，再按版本和地区扩容，不直接全量恢复。
- 机制要定期演练：没有演练过的开关在真实事故里往往不可依赖。

### 代码示例

```ts
type KillSwitchContext = {
  browser: string;
  majorVersion: number;
  feature: 'webgpu' | 'fs_access' | 'webcodecs';
};

function isFeatureEnabled(ctx: KillSwitchContext, disabledMatrix: Set<string>) {
  const key = `${ctx.feature}:${ctx.browser}:${ctx.majorVersion}`;
  return !disabledMatrix.has(key);
}
```

```yaml
kill_switch_policy:
  layers:
    - global_feature
    - browser_segment
    - region_segment
  recovery:
    step1: 1_percent
    step2: 10_percent
    step3: full
```

### 追问

- 「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只有全局开关，缺少按浏览器分层的精细止损能力。
- 开关关闭后没有可用降级路径，只是把问题换成“功能不可用”。
- 恢复时直接全量回开，导致二次事故。

### 延伸

- 可把 Kill Switch 与发布平台联动，自动生成回放审计记录。
- 建议将开关演练纳入季度稳定性例行流程。

## browser-compatibility-incident-bridge-followup-1

title: 追问：兼容性事故指挥桥上线前你先验哪三条前提
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通, 追问]
parent: browser-compatibility-incident-bridge
generated: followup-script

### 一句话

第一条是“信号可信”：白屏、资源失败、JS fatal 三路数据要一致可复核。；第二条是“动作可执行”：版本分层开关、降级包、回滚流程都要演练过。；第三条是“责任可追踪”：技术 owner、业务同步 owner、最终拍板人必须明确。

### 题目

如果面试官追问：兼容性事故指挥桥要真正落地，你会先验证哪三条前提，避免事故时现场返工？

### 答案要点

#### 核心回答

- 第一条是“信号可信”：白屏、资源失败、JS fatal 三路数据要一致可复核。
- 第二条是“动作可执行”：版本分层开关、降级包、回滚流程都要演练过。
- 第三条是“责任可追踪”：技术 owner、业务同步 owner、最终拍板人必须明确。

#### 学习抓手

- 准备一个“前提没验导致处置失灵”的案例，说明你如何补洞。
- 回答里把“前提 -> 触发动作 -> 责任人”三段串起来更有说服力。
- 收尾补一句：哪条前提不成立时直接升级到紧急模式。

## browser-compatibility-incident-bridge-followup-2

title: 追问：你会用哪些数据证明兼容性事故治理在变好
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通, 追问]
parent: browser-compatibility-incident-bridge
generated: followup-script

### 一句话

我会看四组数据：分浏览器白屏率、事故确认时长、恢复时长、结论反转次数。；再看沟通质量：业务方复问次数和“信息不一致”事件是否下降。；若恢复更快但反转更多，说明判断链路仍不稳，要先补数据可信度环节。

### 题目

如果面试官追问：你说兼容性事故治理有效，会拿哪些数据证明“真的变好”，而不是只是多开了几个群？

### 答案要点

#### 核心回答

- 我会看四组数据：分浏览器白屏率、事故确认时长、恢复时长、结论反转次数。
- 再看沟通质量：业务方复问次数和“信息不一致”事件是否下降。
- 若恢复更快但反转更多，说明判断链路仍不稳，要先补数据可信度环节。

#### 学习抓手

- 回答时最好给“事故前后对比”而不是单时点数据。
- 准备一个反例：指标好看但用户投诉没降，说明你会做二次校验。
- 收尾补阈值：哪些指标恶化会触发机制升级或重构。

## browser-compatibility-incident-bridge-followup-3

title: 追问：预算紧张时你如何重排兼容性事故处置优先级
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通, 追问]
parent: browser-compatibility-incident-bridge
generated: followup-script

### 一句话

我会按“影响用户规模 x 关键流程损失 x 可恢复速度”排序，先救高影响高可恢复项。；高风险版本先快速降级，低风险版本进入观察与延迟修复，避免全面开战。；同时冻结非核心兼容改造，把有限产能集中在能立刻降低损失的动作上。

### 题目

如果面试官追问：预算收紧但兼容性事故在增多，你会怎么重排处置优先级，既止损又不拖垮团队？

### 答案要点

#### 核心回答

- 我会按“影响用户规模 x 关键流程损失 x 可恢复速度”排序，先救高影响高可恢复项。
- 高风险版本先快速降级，低风险版本进入观察与延迟修复，避免全面开战。
- 同时冻结非核心兼容改造，把有限产能集中在能立刻降低损失的动作上。

#### 学习抓手

- 给一个你“主动砍范围保主链路”的真实案例。
- 回答里补一句你如何和业务解释“为什么这次先不全修”。
- 结尾说明预算恢复后的回补计划和优先级。

## browser-kill-switch-orchestration-followup-1

title: 追问：Kill Switch 编排最容易遗漏哪几条关键前提
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略, 追问]
parent: browser-kill-switch-orchestration
generated: followup-script

### 一句话

三条关键前提：开关粒度足够细、降级路径真实可用、切换动作幂等可审计。；少一条都会在事故中放大风险：要么关不准、要么关了也不可用、要么越切越乱。；事故前至少做一次“演练+回放复盘”，确认不是纸面能力。

### 题目

如果面试官追问：Kill Switch 设计里最容易遗漏哪几条关键前提？事故来时你会先检查什么？

### 答案要点

#### 核心回答

- 三条关键前提：开关粒度足够细、降级路径真实可用、切换动作幂等可审计。
- 少一条都会在事故中放大风险：要么关不准、要么关了也不可用、要么越切越乱。
- 事故前至少做一次“演练+回放复盘”，确认不是纸面能力。

#### 学习抓手

- 准备一个“开关存在但无法止损”的反例，说明你如何修复。
- 回答时把前提按“设计/执行/观测”三层讲清楚。
- 结尾补一句：谁负责定期演练和审计。

## browser-kill-switch-orchestration-followup-2

title: 追问：你会拿哪些指标证明 Kill Switch 机制真的有效
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略, 追问]
parent: browser-kill-switch-orchestration
generated: followup-script

### 一句话

我会给出四组指标：触发到生效时延、事故影响用户量、恢复成功率、误触发率。；还会补审计证据：每次开关动作的责任人、理由、回切结果是否完整记录。；如果触发快但恢复慢，说明“止损快、恢复弱”，下一步要补恢复编排能力。

### 题目

如果面试官追问：你说 Kill Switch 编排有效，会用哪些指标证明它真的缩短了损失窗口？

### 答案要点

#### 核心回答

- 我会给出四组指标：触发到生效时延、事故影响用户量、恢复成功率、误触发率。
- 还会补审计证据：每次开关动作的责任人、理由、回切结果是否完整记录。
- 如果触发快但恢复慢，说明“止损快、恢复弱”，下一步要补恢复编排能力。

#### 学习抓手

- 回答时先讲损失窗口是否缩短，再讲技术实现细节。
- 准备一个误触发案例，说明你如何降低开关噪声。
- 结尾补一句：哪些阈值会触发机制重构。

## browser-kill-switch-orchestration-followup-3

title: 追问：上线窗口提前时你如何收敛 Kill Switch 范围并补债
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略, 追问]
parent: browser-kill-switch-orchestration
generated: followup-script

### 一句话

我会先保三项最小能力：分版本关停、可用降级、操作审计；其余后补。；与业务约定“先保可用再保体验”的阶段目标，避免期望错位。；补债计划要有时间与 owner：哪周补演练、哪周补自动化、哪周补回切编排。

### 题目

如果面试官追问：上线窗口突然提前，你会如何收敛 Kill Switch 建设范围，同时把后续补债计划说清楚？

### 答案要点

#### 核心回答

- 我会先保三项最小能力：分版本关停、可用降级、操作审计；其余后补。
- 与业务约定“先保可用再保体验”的阶段目标，避免期望错位。
- 补债计划要有时间与 owner：哪周补演练、哪周补自动化、哪周补回切编排。

#### 学习抓手

- 用一个你做过的“最小可用止损方案”案例支撑回答。
- 回答时讲清“现在不做什么、为什么不做”。
- 收尾补一句：如何防止最小方案长期固化为技术债。
