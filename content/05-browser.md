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

讲「从输入 URL 到页面显示，浏览器经历了什么」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请按时间顺序描述从输入 URL 到页面可交互的大致流程。

### 答案要点

- 解析 URL，查缓存和 DNS，建立 TCP/TLS 连接
- 发送 HTTP 请求，服务端返回 HTML
- 浏览器边下载边解析 HTML，构建 DOM；遇到 CSS 构建 CSSOM；遇到同步脚本可能阻塞解析，defer / type="module" 与 async 的时机又不同
- DOM + CSSOM 生成 Render Tree，之后做 Layout、Paint、Composite

#### 工程化补充

- 场景前提：从输入 URL 到页面显示，浏览器经历了什么 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 从输入 URL 到页面显示，浏览器经历了什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

什么操作会触发回流、重绘和合成？为什么 transform/opacity 常被认为更高性能？

### 答案要点

- 回流（layout/reflow）是重新计算几何信息；重绘（paint）是重新绘制像素；合成（composite）是图层拼接
- 修改尺寸、位置、字体、内容等更容易触发回流
- 颜色、背景等可能只触发重绘
- transform / opacity 通常只影响合成阶段，因此更适合动画

#### 工程化补充

- 场景前提：DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 存储 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

对比浏览器常见存储方案，并说明 Cookie 的几个关键安全属性。

### 答案要点

- Cookie 体积小、会随请求自动发送，适合会话标识；支持 HttpOnly、Secure、SameSite
- localStorage 同步 API、实现简单，但配额和行为依浏览器而异；不适合存大量数据和高频写
- sessionStorage 生命周期跟 tab 绑定
- IndexedDB 适合结构化大数据、离线缓存、搜索索引

#### 工程化补充

- 场景前提：Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题的高分关键是把 PWA 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

Service Worker 的 install、activate、fetch 分别做什么？常见缓存策略有哪些？

### 答案要点

- Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）
- install 适合预缓存静态资源
- activate 适合清理旧缓存、接管客户端
- fetch 拦截请求并决定从缓存还是网络返回

#### 工程化补充

- 场景前提：Service Worker 生命周期与常见缓存策略 只有在瓶颈被数据证实时才值得推进；先确认 PWA 是否真是主耗时来源。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Service Worker 生命周期与常见缓存策略 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「浏览器事件循环、主线程限制与 Worker」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么浏览器里的 JS 要尽量避免长任务？Web Worker 能解决哪些问题，不能解决哪些问题？

### 答案要点

- 主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应
- Worker 可把计算密集型任务移到后台线程，如解析大 JSON、图像处理、搜索索引
- Worker 不能直接访问 DOM，和主线程通常通过 postMessage、Transferable 对象通信；SharedArrayBuffer 还要求安全上下文和 cross-origin isolation

#### 工程化补充

- 场景前提：讨论 浏览器事件循环、主线程限制与 Worker 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

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

这题回答要覆盖 Observer 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

`IntersectionObserver`、`ResizeObserver`、`MutationObserver`、`PerformanceObserver` 各自适合什么场景？

### 答案要点

- IntersectionObserver：懒加载、曝光埋点、无限滚动
- ResizeObserver：容器尺寸变化监听
- MutationObserver：DOM 结构变化监听
- PerformanceObserver：监听长任务、LCP、布局偏移等性能条目；具体可观察类型要看浏览器支持的 supportedEntryTypes

#### 工程化补充

- 场景前提：回答 Observer 家族与 Performance API 的实战用法 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：先把 Observer 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Observer 家族与 Performance API 的实战用法 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「浏览器 DevTools 如何排查内存泄漏与卡顿」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

如果线上页面越用越卡，你会如何利用浏览器开发者工具定位问题？

### 答案要点

- Performance 面板看长任务、掉帧、布局抖动、脚本热点
- Memory 面板做 heap snapshot，对比对象增长趋势，查 detached DOM、闭包引用链
- Network 看资源瀑布、缓存命中、接口阻塞
- Coverage 看未使用代码比例，辅助包体治理

#### 工程化补充

- 场景前提：浏览器 DevTools 如何排查内存泄漏与卡顿 只有在瓶颈被数据证实时才值得推进；先确认 DevTools 是否真是主耗时来源。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器 DevTools 如何排查内存泄漏与卡顿 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题回答要覆盖 V8 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

V8 是怎么把 JS 跑得越来越快的？理解这些对前端代码有什么实际意义？

### 答案要点

- 解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行
- 优化编译：热点代码进入 TurboFan，做基于类型反馈的 JIT 编译；类型不稳定会被 deopt 回 Ignition
- 隐藏类（Hidden Class / Map）：对象按属性顺序生成 shape，频繁改变 shape 会让 V8 退化到字典模式
- 内联缓存（IC）：调用点缓存上次见到的类型，命中则跳过查找

#### 工程化补充

- 场景前提：先定义 V8 引擎工作机制（Ignition / TurboFan / 隐藏类） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 V8 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 V8 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 V8 的可复现用例、线上监控指标和回退演练记录。

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

讲「WebGPU 概览与适用场景」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

WebGPU 跟 WebGL 的核心差异是什么？哪些场景值得切换？

### 答案要点

- 设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader
- 性能：相比 WebGL 减少状态机切换开销，能用 GPU 做通用计算
- 资源：BindGroup / Pipeline 显式声明，符合现代图形 API 习惯
- 适用：3D 渲染、机器学习推理（TensorFlow.js WebGPU backend）、视频特效、粒子模拟

#### 工程化补充

- 场景前提：回答 WebGPU 概览与适用场景 时先锁定 WebGPU 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 WebGPU 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 WebGPU 的可复现用例、线上监控指标和回退演练记录。

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

讲「回流（reflow）和重绘（repaint）的区别与触发条件」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

回流和重绘分别是什么？哪些操作会触发它们？怎么减少？

### 答案要点

- 重绘（repaint）：只改变外观（颜色、背景、可见性），不影响布局
- 回流（reflow / layout）：几何属性变化，浏览器需要重新计算布局
- 回流一定会重绘，重绘不一定回流
- 触发回流：尺寸/位置变化（width / height / margin / padding / top / left / font-size）、添加/移除 DOM、display 切换、读取 offset/scroll/client/getComputedStyle

#### 工程化补充

- 场景前提：回流（reflow）和重绘（repaint）的区别与触发条件 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 回流（reflow）和重绘（repaint）的区别与触发条件 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「浏览器缓存的完整链路是什么样的」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

从内存到磁盘，从强缓存到协商缓存，请描述浏览器请求资源时缓存命中的完整流程。

### 答案要点

- 优先级：Service Worker → Memory Cache → Disk Cache → Push Cache（HTTP/2） → 网络
- 强缓存：Cache-Control: max-age=31536000, immutable / Expires，命中直接返回 200 (from cache)
- 协商缓存：强缓存失效后带 If-None-Match (ETag) / If-Modified-Since；服务端 304 不带 body
- Cache-Control 关键值：no-cache（必须协商）、no-store（不缓存）、public/private、stale-while-revalidate

#### 工程化补充

- 场景前提：浏览器缓存的完整链路是什么样的 只有在瓶颈被数据证实时才值得推进；先确认 缓存 是否真是主耗时来源。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器缓存的完整链路是什么样的 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 存储 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

不同的客户端存储场景下应该如何选择，安全性怎么保障？

### 答案要点

- Cookie：4KB，每个请求自动携带（适合鉴权 token），可设 HttpOnly / Secure / SameSite
- localStorage：5-10MB，同源持久存储，同步 API，纯字符串
- sessionStorage：与 localStorage 相同 API，但生命周期=Tab
- IndexedDB：可存数百 MB，异步，结构化数据 / 二进制 Blob，事务支持

#### 工程化补充

- 场景前提：Cookie / localStorage / sessionStorage / IndexedDB 选哪个 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

回答「Web Worker 是什么，什么场景应该用」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

普通 Worker、SharedWorker、ServiceWorker 各自定位是什么？什么时候用？

### 答案要点

- Dedicated Worker：专属当前页面，主页关闭就销毁；通过 postMessage 通信，不能访问 DOM
- SharedWorker：可在多个同源 Tab 共享，适合做"集中式 WebSocket 网关"
- ServiceWorker：常驻后台，拦截网络请求 + 推送通知 + 离线缓存（PWA 的核心）
- 适合 Worker 的场景：大数据排序 / 解析、加解密、图像处理、Markdown / 语法高亮、JSON 解析超大对象

#### 工程化补充

- 场景前提：回答 Web Worker 是什么，什么场景应该用 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：先把 Worker 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Web Worker 是什么，什么场景应该用 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「Chrome 多进程 + 多线程架构是什么样的」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

Chrome 浏览器的进程模型和 Renderer 进程内部的线程模型分别是什么？

### 答案要点

- Browser Process：主控、UI、网络、磁盘 I/O 调度
- Renderer Process：每个 Tab / iframe 一个，负责 HTML/CSS/JS 解析与渲染（沙盒）
- GPU Process：合成最终位图、3D
- Network Process：网络请求（独立沙盒）

#### 工程化补充

- 场景前提：落地 Chrome 多进程 + 多线程架构是什么样的 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

回答「WebGPU 比 WebGL 强在哪？最小可用渲染管线」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

WebGL 已经能做大部分图形需求，WebGPU 解决了什么新问题？写出最小三角形渲染管线的关键步骤。

### 答案要点

- 状态机式 API：drawCall 前要 bind 一堆全局状态，难做并行
- 没有 compute shader（WebGL 2 也没有，要绕到 fragment shader 计算）
- 着色器语言是 GLSL，老旧
- 大量同步状态切换导致性能瓶颈

#### 工程化补充

- 场景前提：回答 WebGPU 比 WebGL 强在哪？最小可用渲染管线 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：先把 WebGPU 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 WebGPU 比 WebGL 强在哪？最小可用渲染管线 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

回答「WebTransport 和 WebSocket 的关系？什么场景用」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

WebSocket 用了十年还很稳，为什么浏览器要做 WebTransport？两者有什么本质差异？

### 答案要点

- WebSocket 的局限
- 跑在 TCP 上，单一有序字节流 → 一旦丢包整条连接 stall（队头阻塞 HOL）
- 多消息类型必须复用同一条流，互相影响
- 没有"不可靠"模式（实时游戏宁丢一帧也不重传）

#### 工程化补充

- 场景前提：先约定 WebTransport 的超时、重试和幂等语义，再谈 WebTransport 和 WebSocket 的关系？什么场景用 的实现细节。
- 实施步骤：围绕 WebTransport 和 WebSocket 的关系？什么场景用 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

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

回答「WebCodecs + Streams 实现浏览器内视频处理」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

浏览器里要做"实时给视频加水印 + 转码上传"，传统方案 ffmpeg.wasm 太慢。WebCodecs 怎么帮你？

### 答案要点

- WebCodecs 不做封装格式（mp4 / mkv），只解 / 编 raw frame
- 必须配合 demuxer（mp4box.js）做容器解析
- 配合 muxer（ebml-muxer / webm-muxer / mp4-muxer）做封装
- 文件 → demuxer → EncodedVideoChunk → VideoDecoder → VideoFrame

#### 工程化补充

- 场景前提：先说明浏览器调度与渲染阶段，再讲 WebCodecs + Streams 实现浏览器内视频处理，否则容易把现象当结论。
- 实施步骤：先把 WebCodecs 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

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

这道追问的关键是把 在当前团队与业务约束 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 渲染 相关的指标来判断「从输入 URL 到页面显示，浏览器经历了什么」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「从输入 URL 到页面显示，浏览器经历了什么」结论成立，给出 在当前团队与业务约束 的验收路径（对应追问：在当前团队与业务约束下，你会先看哪些与 渲染 相关的指标来判断「从输入 URL 到页面显示，浏览器经历了什么」是不是当前性能瓶颈）。
- 直接围绕「在当前团队与业务约束下，你会先看哪些与 渲染 相关的指标来判断「从输入 URL 到页面显示，浏览器经历了什么」是不是当前性能瓶颈」作答：解析 URL，查缓存和 DNS，建立 TCP/TLS 连接

#### 落地步骤

- 第一步：从输入 URL 到页面显示，浏览器经历了什么 只有在瓶颈被数据证实时才值得推进；先确认 在当前团队与业务约束 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 在当前团队与业务约束 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 从输入 URL 到页面显示，浏览器经历了什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## opfs-file-system-access

title: OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线]
followups: [opfs-file-system-access-followup-1, opfs-file-system-access-followup-2, opfs-file-system-access-followup-3]

### 一句话

回答「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

浏览器里要做本地编辑器、离线 IDE、视频缓存或大文件草稿时，OPFS、File System Access API 和 IndexedDB 应该怎么选？

### 答案要点

- IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。
- OPFS（Origin Private File System）是站点私有文件系统，适合 WASM、编辑器、音视频、离线包和大文件缓存；用户通常看不到这些文件，权限模型也不同于真实磁盘文件。
- File System Access API 让用户显式选择文件或目录，适合“打开本地项目、保存到用户指定路径”的应用，但兼容性和权限提示需要认真设计。
- 大文件场景要分层：IndexedDB 存索引和元信息，OPFS 存内部块文件，File System Access 做导入/导出或用户可见文件编辑。

#### 工程化补充

- 场景前提：回答 OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：先把 OPFS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这道追问的关键是把 从输入 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「从输入 URL 到页面显示，浏览器经历了什么」场景下，优化上线后，你会怎么用 渲染 相关的真实用户信号，证明「从输入 URL 到页面显示，浏览器经历了什么」确实让体验变好了，而不只是实验室分数提升？

### 答案要点

#### 直答

- 追问核心：说明如何验证「从输入 URL 到页面显示，浏览器经历了什么」结论成立，给出 从输入 的验收路径（对应追问：在「从输入 URL 到页面显示，浏览器经历了什么」场景下，优化上线后，你会怎么用 渲染 相关的真实用户信号，证明「从输入 URL 到页面显示，浏览器经历了什么」确实让体验变好了，而不只是实验室分数提升）。
- 直接围绕「在「从输入 URL 到页面显示，浏览器经历了什么」场景下，优化上线后，你会怎么用 渲染 相关的真实用户信号，证明「从输入 URL 到页面显示，浏览器经历了什么」确实让体验变好了，而不只是实验室分数提升」作答：解析 URL，查缓存和 DNS，建立 TCP/TLS 连接

#### 落地步骤

- 第一步：从输入 URL 到页面显示，浏览器经历了什么 只有在瓶颈被数据证实时才值得推进；先确认 从输入 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 从输入 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 从输入 URL 到页面显示，浏览器经历了什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## url-to-render-followup-3

title: 追问：你会怎样评估「从输入 URL 到页面显示，浏览器经历了什么」在性能收益与兼容性风险之间的平衡点
difficulty: 进阶
tags: [追问]
parent: url-to-render

### 一句话

回答这题时，先给 你会怎样评估 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：你会怎样评估「从输入 URL 到页面显示，浏览器经历了什么」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 直答

- 追问核心：比较「从输入 URL 到页面显示，浏览器经历了什么」在收益、成本和维护复杂度上的取舍边界（对应追问：你会怎样评估「从输入 URL 到页面显示，浏览器经历了什么」在性能收益与兼容性风险之间的平衡点）。
- 直接围绕「你会怎样评估「从输入 URL 到页面显示，浏览器经历了什么」在性能收益与兼容性风险之间的平衡点」作答：解析 URL，查缓存和 DNS，建立 TCP/TLS 连接

#### 落地步骤

- 第一步：从输入 URL 到页面显示，浏览器经历了什么 只有在瓶颈被数据证实时才值得推进；先确认 你会怎样评估 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 你会怎样评估 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 从输入 URL 到页面显示，浏览器经历了什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## render-pipeline-followup-1

title: 追问：你会先看哪些与 渲染 相关的指标来判断「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」是不是当前性能瓶颈
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: render-pipeline

### 一句话

这道追问的关键是把 渲染 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：你会先看哪些与 渲染 相关的指标来判断「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」结论成立，给出 渲染 的验收路径（对应追问：你会先看哪些与 渲染 相关的指标来判断「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」是不是当前性能瓶颈）。
- 直接围绕「你会先看哪些与 渲染 相关的指标来判断「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」是不是当前性能瓶颈」作答：回流（layout/reflow）是重新计算几何信息；重绘（paint）是重新绘制像素；合成（composite）是图层拼接

#### 落地步骤

- 第一步：DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 渲染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## render-pipeline-followup-2

title: 追问：你会怎样验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: render-pipeline

### 一句话

围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」回答追问时，重点说清 渲染 的前提、动作和回退条件。

### 题目

如果面试官追问：你会怎样验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」结论成立，给出 渲染 的验收路径（对应追问：你会怎样验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的优化收益在真实设备和真实网络下也成立）。
- 直接围绕「你会怎样验证「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」的优化收益在真实设备和真实网络下也成立」作答：回流（layout/reflow）是重新计算几何信息；重绘（paint）是重新绘制像素；合成（composite）是图层拼接

#### 落地步骤

- 第一步：回答 DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 渲染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## render-pipeline-followup-3

title: 追问：结合真实业务约束，围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在 渲染 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: render-pipeline

### 一句话

回答这题时，先给 渲染 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在 渲染 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 追问核心：比较「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在 渲染 上的优化决策，你会如何量化收益、风险和长期维护成本）。
- 直接围绕「结合真实业务约束，围绕「DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系」在 渲染 上的优化决策，你会如何量化收益、风险和长期维护成本」作答：回流（layout/reflow）是重新计算几何信息；重绘（paint）是重新绘制像素；合成（composite）是图层拼接

#### 落地步骤

- 第一步：DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 渲染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## storage-cookie-followup-1

title: 追问：如果要评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的落地风险，你会优先检查哪些 存储 约束是否成立
difficulty: 基础
tags: [存储, Cookie, 追问]
parent: storage-cookie

### 一句话

这道追问的关键是把 存储 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：如果要评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的落地风险，你会优先检查哪些 存储 约束是否成立？

### 答案要点

#### 直答

- 追问核心：比较「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」在收益、成本和维护复杂度上的取舍边界（对应追问：如果要评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的落地风险，你会优先检查哪些 存储 约束是否成立）。
- 直接围绕「如果要评估「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」的落地风险，你会优先检查哪些 存储 约束是否成立」作答：Cookie 体积小、会随请求自动发送，适合会话标识；支持 HttpOnly、Secure、SameSite

#### 落地步骤

- 第一步：Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 存储 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## service-worker-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 PWA 相关的指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈
difficulty: 进阶
tags: [PWA, 离线, 追问]
parent: service-worker

### 一句话

回答这题时，先给 PWA 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 PWA 相关的指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Service Worker 生命周期与常见缓存策略」结论成立，给出 PWA 的验收路径（对应追问：结合真实业务约束，你会先看哪些与 PWA 相关的指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈）。
- 直接围绕「结合真实业务约束，你会先看哪些与 PWA 相关的指标来判断「Service Worker 生命周期与常见缓存策略」是不是当前性能瓶颈」作答：Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）

#### 落地步骤

- 第一步：Service Worker 生命周期与常见缓存策略 只有在瓶颈被数据证实时才值得推进；先确认 PWA 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Service Worker 生命周期与常见缓存策略 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## event-loop-worker-followup-1

title: 追问：当「浏览器事件循环、主线程限制与 Worker」进入复杂场景后，你会先验证哪些 事件循环 前置条件，避免方案踩坑
difficulty: 进阶
tags: [事件循环, Worker, 追问]
parent: event-loop-worker

### 一句话

这道追问的关键是把 事件循环 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：当「浏览器事件循环、主线程限制与 Worker」进入复杂场景后，你会先验证哪些 事件循环 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器事件循环、主线程限制与 Worker」结论成立，给出 事件循环 的验收路径（对应追问：当「浏览器事件循环、主线程限制与 Worker」进入复杂场景后，你会先验证哪些 事件循环 前置条件，避免方案踩坑）。
- 直接围绕「当「浏览器事件循环、主线程限制与 Worker」进入复杂场景后，你会先验证哪些 事件循环 前置条件，避免方案踩坑」作答：主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应

#### 落地步骤

- 第一步：讨论 浏览器事件循环、主线程限制与 Worker 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 事件循环 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## observer-performance-api-followup-1

title: 追问：你会先看哪些与 Observer 相关的指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈
difficulty: 进阶
tags: [Observer, 性能, 追问]
parent: observer-performance-api

### 一句话

围绕「Observer 家族与 Performance API 的实战用法」回答追问时，重点说清 Observer 的前提、动作和回退条件。

### 题目

如果面试官追问：你会先看哪些与 Observer 相关的指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Observer 家族与 Performance API 的实战用法」结论成立，给出 Observer 的验收路径（对应追问：你会先看哪些与 Observer 相关的指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈）。
- 直接围绕「你会先看哪些与 Observer 相关的指标来判断「Observer 家族与 Performance API 的实战用法」是不是当前性能瓶颈」作答：IntersectionObserver：懒加载、曝光埋点、无限滚动

#### 落地步骤

- 第一步：回答 Observer 家族与 Performance API 的实战用法 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Observer 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Observer 家族与 Performance API 的实战用法 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## devtools-memory-followup-1

title: 追问：真要给「浏览器 DevTools 如何排查内存泄漏与卡顿」排查优先级，你会先抓哪几组观测信号再动手优化
difficulty: 进阶
tags: [DevTools, 调试, 追问]
parent: devtools-memory

### 一句话

回答这题时，先给 DevTools 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：真要给「浏览器 DevTools 如何排查内存泄漏与卡顿」排查优先级，你会先抓哪几组观测信号再动手优化？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」给出可执行的落地方案，重点说明 DevTools 怎么做（对应追问：真要给「浏览器 DevTools 如何排查内存泄漏与卡顿」排查优先级，你会先抓哪几组观测信号再动手优化）。
- 直接围绕「真要给「浏览器 DevTools 如何排查内存泄漏与卡顿」排查优先级，你会先抓哪几组观测信号再动手优化」作答：Performance 面板看长任务、掉帧、布局抖动、脚本热点

#### 落地步骤

- 第一步：浏览器 DevTools 如何排查内存泄漏与卡顿 只有在瓶颈被数据证实时才值得推进；先确认 DevTools 是否真是主耗时来源。
- 第二步：先把 DevTools 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 DevTools 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器 DevTools 如何排查内存泄漏与卡顿 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## v8-engine-followup-1

title: 追问：面对真实流量和复杂依赖时，「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」最可能被哪些 V8 边界条件击穿
difficulty: 资深
tags: [V8, 引擎, 追问]
parent: v8-engine

### 一句话

这道追问要直接回应「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」在 V8 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」最可能被哪些 V8 边界条件击穿？

### 答案要点

#### 直答

- 追问核心：围绕「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」给出可执行的落地方案，重点说明 V8 怎么做（对应追问：面对真实流量和复杂依赖时，「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」最可能被哪些 V8 边界条件击穿）。
- 直接围绕「面对真实流量和复杂依赖时，「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」最可能被哪些 V8 边界条件击穿」作答：解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行

#### 落地步骤

- 第一步：先定义 V8 引擎工作机制（Ignition / TurboFan / 隐藏类） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 V8 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 V8 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 V8 的可复现用例、线上监控指标和回退演练记录。

## webgpu-overview-followup-1

title: 追问：如果要让「WebGPU 概览与适用场景」稳定上线，你会优先补齐哪些与 WebGPU 相关的检查项
difficulty: 资深
tags: [WebGPU, GPU, 追问]
parent: webgpu-overview

### 一句话

回答这题时，先给 WebGPU 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要让「WebGPU 概览与适用场景」稳定上线，你会优先补齐哪些与 WebGPU 相关的检查项？

### 答案要点

#### 直答

- 追问核心：说明「WebGPU 概览与适用场景」上线时如何灰度、观测、回滚（对应追问：如果要让「WebGPU 概览与适用场景」稳定上线，你会优先补齐哪些与 WebGPU 相关的检查项）。
- 直接围绕「如果要让「WebGPU 概览与适用场景」稳定上线，你会优先补齐哪些与 WebGPU 相关的检查项」作答：设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader

#### 落地步骤

- 第一步：回答 WebGPU 概览与适用场景 时先锁定 WebGPU 的边界条件，避免把经验结论当成通用规则。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 WebGPU 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 WebGPU 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 WebGPU 的可复现用例、线上监控指标和回退演练记录。

## reflow-vs-repaint-followup-1

title: 追问：你会先看哪些与 渲染 相关的指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: reflow-vs-repaint

### 一句话

这道追问的关键是把 渲染 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：你会先看哪些与 渲染 相关的指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「回流（reflow）和重绘（repaint）的区别与触发条件」结论成立，给出 渲染 的验收路径（对应追问：你会先看哪些与 渲染 相关的指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈）。
- 直接围绕「你会先看哪些与 渲染 相关的指标来判断「回流（reflow）和重绘（repaint）的区别与触发条件」是不是当前性能瓶颈」作答：重绘（repaint）：只改变外观（颜色、背景、可见性），不影响布局

#### 落地步骤

- 第一步：回流（reflow）和重绘（repaint）的区别与触发条件 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 渲染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 回流（reflow）和重绘（repaint）的区别与触发条件 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-cache-strategy-followup-1

title: 追问：你会先看哪些与 缓存 相关的指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈
difficulty: 进阶
tags: [缓存, 性能, HTTP, 追问]
parent: browser-cache-strategy

### 一句话

回答这题时，先给 缓存 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：你会先看哪些与 缓存 相关的指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器缓存的完整链路是什么样的」结论成立，给出 缓存 的验收路径（对应追问：你会先看哪些与 缓存 相关的指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈）。
- 直接围绕「你会先看哪些与 缓存 相关的指标来判断「浏览器缓存的完整链路是什么样的」是不是当前性能瓶颈」作答：优先级：Service Worker → Memory Cache → Disk Cache → Push Cache（HTTP/2） → 网络

#### 落地步骤

- 第一步：浏览器缓存的完整链路是什么样的 只有在瓶颈被数据证实时才值得推进；先确认 缓存 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 缓存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器缓存的完整链路是什么样的 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## cookie-localstorage-indexeddb-followup-1

title: 追问：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时，你会怎样定义前端可信范围与服务端强校验边界
difficulty: 基础
tags: [存储, 安全, 追问]
parent: cookie-localstorage-indexeddb

### 一句话

这道追问的关键是把 存储 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时，你会怎样定义前端可信范围与服务端强校验边界？

### 答案要点

#### 直答

- 追问核心：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」给出可执行的落地方案，重点说明 存储 怎么做（对应追问：围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时，你会怎样定义前端可信范围与服务端强校验边界）。
- 直接围绕「围绕「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」落地时，你会怎样定义前端可信范围与服务端强校验边界」作答：Cookie：4KB，每个请求自动携带（适合鉴权 token），可设 HttpOnly / Secure / SameSite

#### 落地步骤

- 第一步：Cookie / localStorage / sessionStorage / IndexedDB 选哪个 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：先把 存储 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 存储 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## web-worker-basics-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Worker 相关的指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈
difficulty: 进阶
tags: [Worker, 性能, 追问]
parent: web-worker-basics

### 一句话

围绕「Web Worker 是什么，什么场景应该用」回答追问时，重点说清 Worker 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Worker 相关的指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Web Worker 是什么，什么场景应该用」结论成立，给出 Worker 的验收路径（对应追问：从工程落地角度看，你会先看哪些与 Worker 相关的指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈）。
- 直接围绕「从工程落地角度看，你会先看哪些与 Worker 相关的指标来判断「Web Worker 是什么，什么场景应该用」是不是当前性能瓶颈」作答：Dedicated Worker：专属当前页面，主页关闭就销毁；通过 postMessage 通信，不能访问 DOM

#### 落地步骤

- 第一步：回答 Web Worker 是什么，什么场景应该用 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Worker 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Web Worker 是什么，什么场景应该用 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-process-thread-followup-1

title: 追问：在当前团队与业务约束下，真要把「Chrome 多进程 + 多线程架构是什么样的」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, 进程, 追问]
parent: browser-process-thread

### 一句话

回答这题时，先给 架构 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「Chrome 多进程 + 多线程架构是什么样的」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「Chrome 多进程 + 多线程架构是什么样的」上线时如何灰度、观测、回滚（对应追问：在当前团队与业务约束下，真要把「Chrome 多进程 + 多线程架构是什么样的」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「在当前团队与业务约束下，真要把「Chrome 多进程 + 多线程架构是什么样的」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」作答：Browser Process：主控、UI、网络、磁盘 I/O 调度

#### 落地步骤

- 第一步：落地 Chrome 多进程 + 多线程架构是什么样的 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 架构 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## webgpu-pipeline-basics-followup-1

title: 追问：在「WebGPU 比 WebGL 强在哪？最小可用渲染管线」场景下，你会先看哪些与 WebGPU 相关的指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈
difficulty: 资深
tags: [WebGPU, 图形, 高频, 追问]
parent: webgpu-pipeline-basics

### 一句话

这道追问要直接回应「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「WebGPU 比 WebGL 强在哪？最小可用渲染管线」场景下，你会先看哪些与 WebGPU 相关的指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」结论成立，给出 WebGPU 的验收路径（对应追问：在「WebGPU 比 WebGL 强在哪？最小可用渲染管线」场景下，你会先看哪些与 WebGPU 相关的指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈）。
- 直接围绕「在「WebGPU 比 WebGL 强在哪？最小可用渲染管线」场景下，你会先看哪些与 WebGPU 相关的指标来判断「WebGPU 比 WebGL 强在哪？最小可用渲染管线」是不是当前性能瓶颈」作答：状态机式 API：drawCall 前要 bind 一堆全局状态，难做并行

#### 落地步骤

- 第一步：回答 WebGPU 比 WebGL 强在哪？最小可用渲染管线 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 WebGPU 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 WebGPU 比 WebGL 强在哪？最小可用渲染管线 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## webtransport-vs-websocket-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 WebTransport 重点排查「WebTransport 和 WebSocket 的关系？什么场景用」的哪些边界问题
difficulty: 资深
tags: [WebTransport, 实时通信, 追问]
parent: webtransport-vs-websocket

### 一句话

围绕「WebTransport 和 WebSocket 的关系？什么场景用」回答追问时，重点说清 WebTransport 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 WebTransport 重点排查「WebTransport 和 WebSocket 的关系？什么场景用」的哪些边界问题？

### 答案要点

#### 直答

- 追问核心：围绕「WebTransport 和 WebSocket 的关系？什么场景用」给出可执行的落地方案，重点说明 WebTransport 怎么做（对应追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 WebTransport 重点排查「WebTransport 和 WebSocket 的关系？什么场景用」的哪些边界问题）。
- 直接围绕「结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 WebTransport 重点排查「WebTransport 和 WebSocket 的关系？什么场景用」的哪些边界问题」作答：WebSocket 的局限

#### 落地步骤

- 第一步：先约定 WebTransport 的超时、重试和幂等语义，再谈 WebTransport 和 WebSocket 的关系？什么场景用 的实现细节。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 第三步：如果 WebTransport 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

## webcodecs-streams-followup-1

title: 追问：你会如何识别「WebCodecs + Streams 实现浏览器内视频处理」在生产环境中最容易失效的 WebCodecs 边界因素
difficulty: 资深
tags: [WebCodecs, Streams, 视频, 追问]
parent: webcodecs-streams

### 一句话

这道追问要直接回应「WebCodecs + Streams 实现浏览器内视频处理」在 WebCodecs 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会如何识别「WebCodecs + Streams 实现浏览器内视频处理」在生产环境中最容易失效的 WebCodecs 边界因素？

### 答案要点

#### 直答

- 追问核心：围绕「WebCodecs + Streams 实现浏览器内视频处理」给出可执行的落地方案，重点说明 WebCodecs 怎么做（对应追问：你会如何识别「WebCodecs + Streams 实现浏览器内视频处理」在生产环境中最容易失效的 WebCodecs 边界因素）。
- 直接围绕「你会如何识别「WebCodecs + Streams 实现浏览器内视频处理」在生产环境中最容易失效的 WebCodecs 边界因素」作答：WebCodecs 不做封装格式（mp4 / mkv），只解 / 编 raw frame

#### 落地步骤

- 第一步：先说明浏览器调度与渲染阶段，再讲 WebCodecs + Streams 实现浏览器内视频处理，否则容易把现象当结论。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 WebCodecs 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## navigation-api-app-history

title: Navigation API / App History 如何统一 SPA 与浏览器导航
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器]
links: [06-network/bfcache-frontend, 04-css/view-transitions-api, 22-react/react-router-data-loaders]
followups: [navigation-api-app-history-followup-1, navigation-api-app-history-followup-2, navigation-api-app-history-followup-3]

### 一句话

讲「Navigation API / App History 如何统一 SPA 与浏览器导航」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

传统 SPA 路由通常依赖 `history.pushState`、`popstate` 和框架内部状态。Navigation API / App History 想解决哪些问题？接入时要注意哪些边界？

### 答案要点

- 传统 popstate 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。
- Navigation API 提供 navigation.navigate()、navigate 事件、event.intercept()、transition.finished 等能力，更适合把数据加载、转场、取消和错误页统一到导航生命周期里。
- SPA 接入时要区分同文档导航和跨文档导航：站内路由可拦截并更新状态，跨域、下载、表单提交、浏览器保留行为不应强行接管。
- 与 View Transitions、BFCache、滚动恢复、焦点恢复关系很近：转场动画不能破坏无障碍和回退体验，回退后也要能恢复列表位置和表单状态。

#### 工程化补充

- 场景前提：讨论 Navigation API / App History 如何统一 SPA 与浏览器导航 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

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

围绕「Service Worker 生命周期与常见缓存策略」回答追问时，重点说清 PWA 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，当「Service Worker 生命周期与常见缓存策略」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 直答

- 追问核心：比较「Service Worker 生命周期与常见缓存策略」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，当「Service Worker 生命周期与常见缓存策略」优化后，你会优先看哪些真实用户信号来确认收益）。
- 直接围绕「从工程落地角度看，当「Service Worker 生命周期与常见缓存策略」优化后，你会优先看哪些真实用户信号来确认收益」作答：Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）

#### 落地步骤

- 第一步：回答 Service Worker 生命周期与常见缓存策略 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Service Worker 生命周期与常见缓存策略 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## service-worker-followup-3

title: 追问：从工程落地角度看，围绕「Service Worker 生命周期与常见缓存策略」在 PWA 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [PWA, 离线, 追问]
parent: service-worker
generated: followup-script

### 一句话

这道追问的关键是把 PWA 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，围绕「Service Worker 生命周期与常见缓存策略」在 PWA 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 追问核心：比较「Service Worker 生命周期与常见缓存策略」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，围绕「Service Worker 生命周期与常见缓存策略」在 PWA 上的优化决策，你会如何量化收益、风险和长期维护成本）。
- 直接围绕「从工程落地角度看，围绕「Service Worker 生命周期与常见缓存策略」在 PWA 上的优化决策，你会如何量化收益、风险和长期维护成本」作答：Service Worker 只在安全上下文可用（通常是 HTTPS，localhost 例外）

#### 落地步骤

- 第一步：Service Worker 生命周期与常见缓存策略 只有在瓶颈被数据证实时才值得推进；先确认 PWA 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Service Worker 生命周期与常见缓存策略 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## event-loop-worker-followup-2

title: 追问：结合真实业务约束，SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头
difficulty: 进阶
tags: [事件循环, Worker, 追问]
parent: event-loop-worker
generated: followup-script

### 一句话

围绕「浏览器事件循环、主线程限制与 Worker」回答追问时，重点说清 事件循环 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器事件循环、主线程限制与 Worker」给出可执行的落地方案，重点说明 事件循环 怎么做（对应追问：结合真实业务约束，SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头）。
- 直接围绕「结合真实业务约束，SharedArrayBuffer 能跨线程零拷贝，需要哪些 HTTP 头」作答：主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应

#### 落地步骤

- 第一步：先约定 事件循环 的超时、重试和幂等语义，再谈 浏览器事件循环、主线程限制与 Worker 的实现细节。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 第三步：如果 事件循环 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

## event-loop-worker-followup-3

title: 追问：在「浏览器事件循环、主线程限制与 Worker」场景下，web worker 和 service worker 区别
difficulty: 进阶
tags: [事件循环, Worker, 追问]
parent: event-loop-worker
generated: followup-script

### 一句话

回答这题时，先给 事件循环 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「浏览器事件循环、主线程限制与 Worker」场景下，web worker 和 service worker 区别？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器事件循环、主线程限制与 Worker」给出可执行的落地方案，重点说明 事件循环 怎么做（对应追问：在「浏览器事件循环、主线程限制与 Worker」场景下，web worker 和 service worker 区别）。
- 直接围绕「在「浏览器事件循环、主线程限制与 Worker」场景下，web worker 和 service worker 区别」作答：主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应

#### 落地步骤

- 第一步：讨论 浏览器事件循环、主线程限制与 Worker 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：先把 事件循环 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 事件循环 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## observer-performance-api-followup-2

title: 追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 Observer 重新评估「Observer 家族与 Performance API 的实战用法」优化效果
difficulty: 进阶
tags: [Observer, 性能, 追问]
parent: observer-performance-api
generated: followup-script

### 一句话

这道追问的关键是把 Observer 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 Observer 重新评估「Observer 家族与 Performance API 的实战用法」优化效果？

### 答案要点

#### 直答

- 追问核心：围绕「Observer 家族与 Performance API 的实战用法」给出可执行的落地方案，重点说明 Observer 怎么做（对应追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 Observer 重新评估「Observer 家族与 Performance API 的实战用法」优化效果）。
- 直接围绕「从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 Observer 重新评估「Observer 家族与 Performance API 的实战用法」优化效果」作答：IntersectionObserver：懒加载、曝光埋点、无限滚动

#### 落地步骤

- 第一步：Observer 家族与 Performance API 的实战用法 只有在瓶颈被数据证实时才值得推进；先确认 Observer 是否真是主耗时来源。
- 第二步：先把 Observer 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Observer 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Observer 家族与 Performance API 的实战用法 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## observer-performance-api-followup-3

title: 追问：在「Observer 家族与 Performance API 的实战用法」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「Observer 家族与 Performance API 的实战用法」是否值得做
difficulty: 进阶
tags: [Observer, 性能, 追问]
parent: observer-performance-api
generated: followup-script

### 一句话

这道追问要直接回应「Observer 家族与 Performance API 的实战用法」在 Observer 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「Observer 家族与 Performance API 的实战用法」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「Observer 家族与 Performance API 的实战用法」是否值得做？

### 答案要点

#### 直答

- 追问核心：比较「Observer 家族与 Performance API 的实战用法」在收益、成本和维护复杂度上的取舍边界（对应追问：在「Observer 家族与 Performance API 的实战用法」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「Observer 家族与 Performance API 的实战用法」是否值得做）。
- 直接围绕「在「Observer 家族与 Performance API 的实战用法」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「Observer 家族与 Performance API 的实战用法」是否值得做」作答：IntersectionObserver：懒加载、曝光埋点、无限滚动

#### 落地步骤

- 第一步：回答 Observer 家族与 Performance API 的实战用法 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Observer 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Observer 家族与 Performance API 的实战用法 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## devtools-memory-followup-2

title: 追问：从工程落地角度看，当「浏览器 DevTools 如何排查内存泄漏与卡顿」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [DevTools, 调试, 追问]
parent: devtools-memory
generated: followup-script

### 一句话

这道追问要直接回应「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「浏览器 DevTools 如何排查内存泄漏与卡顿」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 直答

- 追问核心：比较「浏览器 DevTools 如何排查内存泄漏与卡顿」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，当「浏览器 DevTools 如何排查内存泄漏与卡顿」优化后，你会优先看哪些真实用户信号来确认收益）。
- 直接围绕「从工程落地角度看，当「浏览器 DevTools 如何排查内存泄漏与卡顿」优化后，你会优先看哪些真实用户信号来确认收益」作答：Performance 面板看长任务、掉帧、布局抖动、脚本热点

#### 落地步骤

- 第一步：回答 浏览器 DevTools 如何排查内存泄漏与卡顿 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 DevTools 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器 DevTools 如何排查内存泄漏与卡顿 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## devtools-memory-followup-3

title: 追问：在当前团队与业务约束下，围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [DevTools, 调试, 追问]
parent: devtools-memory
generated: followup-script

### 一句话

这道追问的关键是把 DevTools 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 追问核心：比较「浏览器 DevTools 如何排查内存泄漏与卡顿」在收益、成本和维护复杂度上的取舍边界（对应追问：在当前团队与业务约束下，围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的优化决策，你会如何量化收益、风险和长期维护成本）。
- 直接围绕「在当前团队与业务约束下，围绕「浏览器 DevTools 如何排查内存泄漏与卡顿」在 DevTools 上的优化决策，你会如何量化收益、风险和长期维护成本」作答：Performance 面板看长任务、掉帧、布局抖动、脚本热点

#### 落地步骤

- 第一步：浏览器 DevTools 如何排查内存泄漏与卡顿 只有在瓶颈被数据证实时才值得推进；先确认 DevTools 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 DevTools 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器 DevTools 如何排查内存泄漏与卡顿 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## reflow-vs-repaint-followup-2

title: 追问：以「回流（reflow）和重绘（repaint）的区别与触发条件」为例，要证明「回流（reflow）和重绘（repaint）的区别与触发条件」确实改善体验，你会如何围绕 渲染 设计线上观测与对照验证
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: reflow-vs-repaint
generated: followup-script

### 一句话

围绕「回流（reflow）和重绘（repaint）的区别与触发条件」回答追问时，重点说清 渲染 的前提、动作和回退条件。

### 题目

如果面试官追问：以「回流（reflow）和重绘（repaint）的区别与触发条件」为例，要证明「回流（reflow）和重绘（repaint）的区别与触发条件」确实改善体验，你会如何围绕 渲染 设计线上观测与对照验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「回流（reflow）和重绘（repaint）的区别与触发条件」结论成立，给出 渲染 的验收路径（对应追问：以「回流（reflow）和重绘（repaint）的区别与触发条件」为例，要证明「回流（reflow）和重绘（repaint）的区别与触发条件」确实改善体验，你会如何围绕 渲染 设计线上观测与对照验证）。
- 直接围绕「以「回流（reflow）和重绘（repaint）的区别与触发条件」为例，要证明「回流（reflow）和重绘（repaint）的区别与触发条件」确实改善体验，你会如何围绕 渲染 设计线上观测与对照验证」作答：重绘（repaint）：只改变外观（颜色、背景、可见性），不影响布局

#### 落地步骤

- 第一步：回答 回流（reflow）和重绘（repaint）的区别与触发条件 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 渲染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 回流（reflow）和重绘（repaint）的区别与触发条件 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## reflow-vs-repaint-followup-3

title: 追问：如果「回流和重绘的区别与触发条件」在 渲染路径 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [渲染, 性能, 追问]
parent: reflow-vs-repaint
generated: followup-script

### 一句话

回答这题时，先给 渲染 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果「回流和重绘的区别与触发条件」在 渲染路径 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 追问核心：比较「回流（reflow）和重绘（repaint）的区别与触发条件」在收益、成本和维护复杂度上的取舍边界（对应追问：如果「回流和重绘的区别与触发条件」在 渲染路径 上的收益和维护成本打架，你会怎么做取舍判断）。
- 直接围绕「如果「回流和重绘的区别与触发条件」在 渲染路径 上的收益和维护成本打架，你会怎么做取舍判断」作答：重绘（repaint）：只改变外观（颜色、背景、可见性），不影响布局

#### 落地步骤

- 第一步：回流（reflow）和重绘（repaint）的区别与触发条件 只有在瓶颈被数据证实时才值得推进；先确认 渲染 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 渲染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 回流（reflow）和重绘（repaint）的区别与触发条件 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-cache-strategy-followup-2

title: 追问：结合真实业务约束，你会怎样验证「浏览器缓存的完整链路是什么样的」在 缓存策略 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [缓存, 性能, HTTP, 追问]
parent: browser-cache-strategy
generated: followup-script

### 一句话

围绕「浏览器缓存的完整链路是什么样的」回答追问时，重点说清 缓存 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「浏览器缓存的完整链路是什么样的」在 缓存策略 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器缓存的完整链路是什么样的」结论成立，给出 缓存 的验收路径（对应追问：结合真实业务约束，你会怎样验证「浏览器缓存的完整链路是什么样的」在 缓存策略 维度上的优化收益在真实设备和真实网络下也成立）。
- 直接围绕「结合真实业务约束，你会怎样验证「浏览器缓存的完整链路是什么样的」在 缓存策略 维度上的优化收益在真实设备和真实网络下也成立」作答：优先级：Service Worker → Memory Cache → Disk Cache → Push Cache（HTTP/2） → 网络

#### 落地步骤

- 第一步：回答 浏览器缓存的完整链路是什么样的 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 缓存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器缓存的完整链路是什么样的 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-cache-strategy-followup-3

title: 追问：结合真实业务约束，你会如何给「浏览器缓存的完整链路是什么样的」算一笔账：短期收益能不能覆盖后续在 缓存 上的维护成本
difficulty: 进阶
tags: [缓存, 性能, HTTP, 追问]
parent: browser-cache-strategy
generated: followup-script

### 一句话

这道追问的关键是把 缓存 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，你会如何给「浏览器缓存的完整链路是什么样的」算一笔账：短期收益能不能覆盖后续在 缓存 上的维护成本？

### 答案要点

#### 直答

- 追问核心：比较「浏览器缓存的完整链路是什么样的」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，你会如何给「浏览器缓存的完整链路是什么样的」算一笔账：短期收益能不能覆盖后续在 缓存 上的维护成本）。
- 直接围绕「结合真实业务约束，你会如何给「浏览器缓存的完整链路是什么样的」算一笔账：短期收益能不能覆盖后续在 缓存 上的维护成本」作答：优先级：Service Worker → Memory Cache → Disk Cache → Push Cache（HTTP/2） → 网络

#### 落地步骤

- 第一步：浏览器缓存的完整链路是什么样的 只有在瓶颈被数据证实时才值得推进；先确认 缓存 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 缓存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器缓存的完整链路是什么样的 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## cookie-localstorage-indexeddb-followup-2

title: 追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，你会如何搭建「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的攻击监控面板，及时识别绕过尝试与异常行为
difficulty: 基础
tags: [存储, 安全, 追问]
parent: cookie-localstorage-indexeddb
generated: followup-script

### 一句话

这道追问要直接回应「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」在 存储 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，你会如何搭建「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的攻击监控面板，及时识别绕过尝试与异常行为？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」结论成立，给出 存储 的验收路径（对应追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，你会如何搭建「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的攻击监控面板，及时识别绕过尝试与异常行为）。
- 直接围绕「以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，你会如何搭建「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」的攻击监控面板，及时识别绕过尝试与异常行为」作答：Cookie：4KB，每个请求自动携带（适合鉴权 token），可设 HttpOnly / Secure / SameSite

#### 落地步骤

- 第一步：先限定 存储 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Cookie / localStorage / sessionStorage / IndexedDB 选哪个 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 存储 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## cookie-localstorage-indexeddb-followup-3

title: 追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，当预算和人力有限时，你会怎样推进「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」以兼顾上线速度和安全下限
difficulty: 基础
tags: [存储, 安全, 追问]
parent: cookie-localstorage-indexeddb
generated: followup-script

### 一句话

回答这题时，先给 存储 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，当预算和人力有限时，你会怎样推进「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」以兼顾上线速度和安全下限？

### 答案要点

#### 直答

- 追问核心：说明「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」上线时如何灰度、观测、回滚（对应追问：以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，当预算和人力有限时，你会怎样推进「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」以兼顾上线速度和安全下限）。
- 直接围绕「以「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」为例，当预算和人力有限时，你会怎样推进「Cookie / localStorage / sessionStorage / IndexedDB 选哪个」以兼顾上线速度和安全下限」作答：Cookie：4KB，每个请求自动携带（适合鉴权 token），可设 HttpOnly / Secure / SameSite

#### 落地步骤

- 第一步：Cookie / localStorage / sessionStorage / IndexedDB 选哪个 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 存储 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## web-worker-basics-followup-2

title: 追问：以「Web Worker 是什么，什么场景应该用」为例，你会怎样验证「Web Worker 是什么，什么场景应该用」在 Worker 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [Worker, 性能, 追问]
parent: web-worker-basics
generated: followup-script

### 一句话

这道追问的关键是把 Worker 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「Web Worker 是什么，什么场景应该用」为例，你会怎样验证「Web Worker 是什么，什么场景应该用」在 Worker 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Web Worker 是什么，什么场景应该用」结论成立，给出 Worker 的验收路径（对应追问：以「Web Worker 是什么，什么场景应该用」为例，你会怎样验证「Web Worker 是什么，什么场景应该用」在 Worker 维度上的优化收益在真实设备和真实网络下也成立）。
- 直接围绕「以「Web Worker 是什么，什么场景应该用」为例，你会怎样验证「Web Worker 是什么，什么场景应该用」在 Worker 维度上的优化收益在真实设备和真实网络下也成立」作答：Dedicated Worker：专属当前页面，主页关闭就销毁；通过 postMessage 通信，不能访问 DOM

#### 落地步骤

- 第一步：Web Worker 是什么，什么场景应该用 只有在瓶颈被数据证实时才值得推进；先确认 Worker 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Worker 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Web Worker 是什么，什么场景应该用 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## web-worker-basics-followup-3

title: 追问：结合真实业务约束，如果「Web Worker 是什么，什么场景应该用」在 Worker 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [Worker, 性能, 追问]
parent: web-worker-basics
generated: followup-script

### 一句话

这道追问要直接回应「Web Worker 是什么，什么场景应该用」在 Worker 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果「Web Worker 是什么，什么场景应该用」在 Worker 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 追问核心：比较「Web Worker 是什么，什么场景应该用」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，如果「Web Worker 是什么，什么场景应该用」在 Worker 上的收益和维护成本打架，你会怎么做取舍判断）。
- 直接围绕「结合真实业务约束，如果「Web Worker 是什么，什么场景应该用」在 Worker 上的收益和维护成本打架，你会怎么做取舍判断」作答：Dedicated Worker：专属当前页面，主页关闭就销毁；通过 postMessage 通信，不能访问 DOM

#### 落地步骤

- 第一步：回答 Web Worker 是什么，什么场景应该用 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Worker 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Web Worker 是什么，什么场景应该用 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-process-thread-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 架构 把「Chrome 多进程 + 多线程架构是什么样的」拆成几段推进，确保每段都能独立验收
difficulty: 进阶
tags: [架构, 进程, 追问]
parent: browser-process-thread
generated: followup-script

### 一句话

围绕「Chrome 多进程 + 多线程架构是什么样的」回答追问时，重点说清 架构 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 架构 把「Chrome 多进程 + 多线程架构是什么样的」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Chrome 多进程 + 多线程架构是什么样的」结论成立，给出 架构 的验收路径（对应追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 架构 把「Chrome 多进程 + 多线程架构是什么样的」拆成几段推进，确保每段都能独立验收）。
- 直接围绕「在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 架构 把「Chrome 多进程 + 多线程架构是什么样的」拆成几段推进，确保每段都能独立验收」作答：Browser Process：主控、UI、网络、磁盘 I/O 调度

#### 落地步骤

- 第一步：Chrome 多进程 + 多线程架构是什么样的 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 架构 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-process-thread-followup-3

title: 追问：在当前团队与业务约束下，要判断「Chrome 多进程 + 多线程架构是什么样的」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标
difficulty: 进阶
tags: [架构, 进程, 追问]
parent: browser-process-thread
generated: followup-script

### 一句话

这道追问的关键是把 架构 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「Chrome 多进程 + 多线程架构是什么样的」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Chrome 多进程 + 多线程架构是什么样的」结论成立，给出 架构 的验收路径（对应追问：在当前团队与业务约束下，要判断「Chrome 多进程 + 多线程架构是什么样的」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标）。
- 直接围绕「在当前团队与业务约束下，要判断「Chrome 多进程 + 多线程架构是什么样的」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标」作答：Browser Process：主控、UI、网络、磁盘 I/O 调度

#### 落地步骤

- 第一步：落地 Chrome 多进程 + 多线程架构是什么样的 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 架构 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## webgpu-pipeline-basics-followup-2

title: 追问：你会怎样验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [WebGPU, 图形, 高频, 追问]
parent: webgpu-pipeline-basics
generated: followup-script

### 一句话

这道追问的关键是把 WebGPU 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：你会怎样验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」结论成立，给出 WebGPU 的验收路径（对应追问：你会怎样验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 维度上的优化收益在真实设备和真实网络下也成立）。
- 直接围绕「你会怎样验证「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 维度上的优化收益在真实设备和真实网络下也成立」作答：状态机式 API：drawCall 前要 bind 一堆全局状态，难做并行

#### 落地步骤

- 第一步：WebGPU 比 WebGL 强在哪？最小可用渲染管线 只有在瓶颈被数据证实时才值得推进；先确认 WebGPU 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 WebGPU 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 WebGPU 比 WebGL 强在哪？最小可用渲染管线 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## webgpu-pipeline-basics-followup-3

title: 追问：如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [WebGPU, 图形, 高频, 追问]
parent: webgpu-pipeline-basics
generated: followup-script

### 一句话

围绕「WebGPU 比 WebGL 强在哪？最小可用渲染管线」回答追问时，重点说清 WebGPU 的前提、动作和回退条件。

### 题目

如果面试官追问：如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 追问核心：比较「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在收益、成本和维护复杂度上的取舍边界（对应追问：如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的收益和维护成本打架，你会怎么做取舍判断）。
- 直接围绕「如果「WebGPU 比 WebGL 强在哪？最小可用渲染管线」在 WebGPU 上的收益和维护成本打架，你会怎么做取舍判断」作答：状态机式 API：drawCall 前要 bind 一堆全局状态，难做并行

#### 落地步骤

- 第一步：回答 WebGPU 比 WebGL 强在哪？最小可用渲染管线 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 WebGPU 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 WebGPU 比 WebGL 强在哪？最小可用渲染管线 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## webtransport-vs-websocket-followup-2

title: 追问：在「WebTransport 和 WebSocket 的关系？什么场景用」场景下，在「WebTransport 和 WebSocket 的关系？什么场景用」里你会怎样划分可重试与不可重试场景，防止误重试放大故障
difficulty: 资深
tags: [WebTransport, 实时通信, 追问]
parent: webtransport-vs-websocket
generated: followup-script

### 一句话

这道追问的关键是把 WebTransport 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「WebTransport 和 WebSocket 的关系？什么场景用」场景下，在「WebTransport 和 WebSocket 的关系？什么场景用」里你会怎样划分可重试与不可重试场景，防止误重试放大故障？

### 答案要点

#### 直答

- 追问核心：识别「WebTransport 和 WebSocket 的关系？什么场景用」的高风险失败场景并给出兜底措施（对应追问：在「WebTransport 和 WebSocket 的关系？什么场景用」场景下，在「WebTransport 和 WebSocket 的关系？什么场景用」里你会怎样划分可重试与不可重试场景，防止误重试放大故障）。
- 直接围绕「在「WebTransport 和 WebSocket 的关系？什么场景用」场景下，在「WebTransport 和 WebSocket 的关系？什么场景用」里你会怎样划分可重试与不可重试场景，防止误重试放大故障」作答：WebSocket 的局限

#### 落地步骤

- 第一步：讨论 WebTransport 和 WebSocket 的关系？什么场景用 时要把弱网、限流和断连场景并列考虑，不要只讲理想链路。
- 第二步：围绕 WebTransport 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 第三步：如果 WebTransport 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

## webtransport-vs-websocket-followup-3

title: 追问：结合真实业务约束，你会如何把「WebTransport 和 WebSocket 的关系？什么场景用」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定
difficulty: 资深
tags: [WebTransport, 实时通信, 追问]
parent: webtransport-vs-websocket
generated: followup-script

### 一句话

这道追问要直接回应「WebTransport 和 WebSocket 的关系？什么场景用」在 WebTransport 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何把「WebTransport 和 WebSocket 的关系？什么场景用」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？

### 答案要点

#### 直答

- 追问核心：说明如何验证「WebTransport 和 WebSocket 的关系？什么场景用」结论成立，给出 WebTransport 的验收路径（对应追问：结合真实业务约束，你会如何把「WebTransport 和 WebSocket 的关系？什么场景用」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定）。
- 直接围绕「结合真实业务约束，你会如何把「WebTransport 和 WebSocket 的关系？什么场景用」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定」作答：WebSocket 的局限

#### 落地步骤

- 第一步：先约定 WebTransport 的超时、重试和幂等语义，再谈 WebTransport 和 WebSocket 的关系？什么场景用 的实现细节。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 第三步：如果 WebTransport 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

## opfs-file-system-access-followup-1

title: 追问：在当前团队与业务约束下，OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线, 追问]
parent: opfs-file-system-access
generated: followup-script

### 一句话

围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」回答追问时，重点说清 OPFS 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别？

### 答案要点

#### 直答

- 追问核心：围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」给出可执行的落地方案，重点说明 OPFS 怎么做（对应追问：在当前团队与业务约束下，OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别）。
- 直接围绕「在当前团队与业务约束下，OPFS 与 IndexedDB 在事务、随机读写和权限模型上有什么差别」作答：IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。

#### 落地步骤

- 第一步：先限定 OPFS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存 的结论不成立。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 OPFS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## opfs-file-system-access-followup-2

title: 追问：在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」场景下，本地大文件缓存如何做配额控制和过期清理
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线, 追问]
parent: opfs-file-system-access
generated: followup-script

### 一句话

回答这题时，先给 OPFS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」场景下，本地大文件缓存如何做配额控制和过期清理？

### 答案要点

#### 直答

- 追问核心：围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」给出可执行的落地方案，重点说明 OPFS 怎么做（对应追问：在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」场景下，本地大文件缓存如何做配额控制和过期清理）。
- 直接围绕「在「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」场景下，本地大文件缓存如何做配额控制和过期清理」作答：IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。

#### 落地步骤

- 第一步：OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存 只有在瓶颈被数据证实时才值得推进；先确认 OPFS 是否真是主耗时来源。
- 第二步：先把 OPFS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 OPFS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## opfs-file-system-access-followup-3

title: 追问：在当前团队与业务约束下，离线编辑器如何避免本地数据损坏导致用户草稿丢失
difficulty: 资深
tags: [OPFS, FileSystemAccess, IndexedDB, 离线, 追问]
parent: opfs-file-system-access
generated: followup-script

### 一句话

围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」回答追问时，重点说清 OPFS 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，离线编辑器如何避免本地数据损坏导致用户草稿丢失？

### 答案要点

#### 直答

- 追问核心：围绕「OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存」给出可执行的落地方案，重点说明 OPFS 怎么做（对应追问：在当前团队与业务约束下，离线编辑器如何避免本地数据损坏导致用户草稿丢失）。
- 直接围绕「在当前团队与业务约束下，离线编辑器如何避免本地数据损坏导致用户草稿丢失」作答：IndexedDB 是最通用的持久化能力，适合元数据、索引、任务队列、离线表和较小 Blob；缺点是大文件随机读写、流式处理和事务调试体验不够理想。

#### 落地步骤

- 第一步：先说明浏览器调度与渲染阶段，再讲 OPFS、File System Access 与 IndexedDB：浏览器本地大文件怎么存，否则容易把现象当结论。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 OPFS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## navigation-api-app-history-followup-1

title: 追问：在「Navigation API / App History 如何统一 SPA 与浏览器导航」场景下，Navigation API 与框架路由的边界如何划分
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器, 追问]
parent: navigation-api-app-history
generated: followup-script

### 一句话

这道追问的关键是把 SPA 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「Navigation API / App History 如何统一 SPA 与浏览器导航」场景下，Navigation API 与框架路由的边界如何划分？

### 答案要点

#### 直答

- 追问核心：围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」给出可执行的落地方案，重点说明 SPA 怎么做（对应追问：在「Navigation API / App History 如何统一 SPA 与浏览器导航」场景下，Navigation API 与框架路由的边界如何划分）。
- 直接围绕「在「Navigation API / App History 如何统一 SPA 与浏览器导航」场景下，Navigation API 与框架路由的边界如何划分」作答：传统 popstate 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。

#### 落地步骤

- 第一步：讨论 Navigation API / App History 如何统一 SPA 与浏览器导航 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：先把 SPA 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 SPA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## navigation-api-app-history-followup-2

title: 追问：同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器, 追问]
parent: navigation-api-app-history
generated: followup-script

### 一句话

这道追问要直接回应「Navigation API / App History 如何统一 SPA 与浏览器导航」在 SPA 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别？

### 答案要点

#### 直答

- 追问核心：围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」给出可执行的落地方案，重点说明 SPA 怎么做（对应追问：同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别）。
- 直接围绕「同文档导航、跨文档导航和 BFCache 恢复在体验上有什么差别」作答：传统 popstate 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。

#### 落地步骤

- 第一步：先说明浏览器调度与渲染阶段，再讲 Navigation API / App History 如何统一 SPA 与浏览器导航，否则容易把现象当结论。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 SPA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## navigation-api-app-history-followup-3

title: 追问：从工程落地角度看，如果浏览器不支持 Navigation API，你会如何做渐进增强
difficulty: 资深
tags: [NavigationAPI, SPA, 路由, 浏览器, 追问]
parent: navigation-api-app-history
generated: followup-script

### 一句话

围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」回答追问时，重点说清 SPA 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，如果浏览器不支持 Navigation API，你会如何做渐进增强？

### 答案要点

#### 直答

- 追问核心：围绕「Navigation API / App History 如何统一 SPA 与浏览器导航」给出可执行的落地方案，重点说明 SPA 怎么做（对应追问：从工程落地角度看，如果浏览器不支持 Navigation API，你会如何做渐进增强）。
- 直接围绕「从工程落地角度看，如果浏览器不支持 Navigation API，你会如何做渐进增强」作答：传统 popstate 只能观察历史变化，拦截导航、取消导航、异步加载、错误恢复和滚动位置管理都要路由库自己拼。

#### 落地步骤

- 第一步：Navigation API / App History 如何统一 SPA 与浏览器导航 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 SPA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## storage-cookie-followup-2

title: 追问：从工程落地角度看，你会如何围绕 存储 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 基础
tags: [存储, Cookie, 追问]
parent: storage-cookie
generated: followup-script

### 一句话

围绕「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」回答追问时，重点说清 存储 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 存储 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」结论成立，给出 存储 的验收路径（对应追问：从工程落地角度看，你会如何围绕 存储 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖）。
- 直接围绕「从工程落地角度看，你会如何围绕 存储 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」作答：Cookie 体积小、会随请求自动发送，适合会话标识；支持 HttpOnly、Secure、SameSite

#### 落地步骤

- 第一步：先限定 存储 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 存储 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## storage-cookie-followup-3

title: 追问：当约束变化导致成本上升时，你会先优化「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里和 存储 相关的哪些环节
difficulty: 基础
tags: [存储, Cookie, 追问]
parent: storage-cookie
generated: followup-script

### 一句话

回答这题时，先给 存储 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：当约束变化导致成本上升时，你会先优化「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里和 存储 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」在收益、成本和维护复杂度上的取舍边界（对应追问：当约束变化导致成本上升时，你会先优化「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里和 存储 相关的哪些环节）。
- 直接围绕「当约束变化导致成本上升时，你会先优化「Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍」里和 存储 相关的哪些环节」作答：Cookie 体积小、会随请求自动发送，适合会话标识；支持 HttpOnly、Secure、SameSite

#### 落地步骤

- 第一步：Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 存储 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## v8-engine-followup-2

title: 追问：以「V8 引擎工作机制」为例，如果要让结论在 V8 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [V8, 引擎, 追问]
parent: v8-engine
generated: followup-script

### 一句话

回答这题时，先给 V8 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「V8 引擎工作机制」为例，如果要让结论在 V8 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」结论成立，给出 V8 的验收路径（对应追问：以「V8 引擎工作机制」为例，如果要让结论在 V8 上可复核，你会怎样安排测试、日志和指标的组合验证）。
- 直接围绕「以「V8 引擎工作机制」为例，如果要让结论在 V8 上可复核，你会怎样安排测试、日志和指标的组合验证」作答：解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行

#### 落地步骤

- 第一步：V8 引擎工作机制（Ignition / TurboFan / 隐藏类） 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 V8。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 V8 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## v8-engine-followup-3

title: 追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 V8 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [V8, 引擎, 追问]
parent: v8-engine
generated: followup-script

### 一句话

围绕「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」回答追问时，重点说清 V8 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 V8 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 追问核心：围绕「V8 引擎工作机制（Ignition / TurboFan / 隐藏类）」给出可执行的落地方案，重点说明 V8 怎么做（对应追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 V8 拆分方案演进路径，而不是一次性推翻重来）。
- 直接围绕「在当前团队与业务约束下，遇到约束变化时，你会如何围绕 V8 拆分方案演进路径，而不是一次性推翻重来」作答：解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行

#### 落地步骤

- 第一步：先定义 V8 引擎工作机制（Ignition / TurboFan / 隐藏类） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 V8 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 V8 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 V8 的可复现用例、线上监控指标和回退演练记录。

## webgpu-overview-followup-2

title: 追问：在「WebGPU 概览与适用场景」场景下，为了证明这个方案在 WebGPU 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [WebGPU, GPU, 追问]
parent: webgpu-overview
generated: followup-script

### 一句话

这道追问要直接回应「WebGPU 概览与适用场景」在 WebGPU 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「WebGPU 概览与适用场景」场景下，为了证明这个方案在 WebGPU 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「WebGPU 概览与适用场景」结论成立，给出 WebGPU 的验收路径（对应追问：在「WebGPU 概览与适用场景」场景下，为了证明这个方案在 WebGPU 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在「WebGPU 概览与适用场景」场景下，为了证明这个方案在 WebGPU 维度有效，你会怎么设计测试闭环和线上观测指标」作答：设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader

#### 落地步骤

- 第一步：回答 WebGPU 概览与适用场景 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 WebGPU 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## webgpu-overview-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「WebGPU 概览与适用场景」里和 WebGPU 相关的哪些环节
difficulty: 资深
tags: [WebGPU, GPU, 追问]
parent: webgpu-overview
generated: followup-script

### 一句话

回答这题时，先给 WebGPU 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「WebGPU 概览与适用场景」里和 WebGPU 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「WebGPU 概览与适用场景」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「WebGPU 概览与适用场景」里和 WebGPU 相关的哪些环节）。
- 直接围绕「结合真实业务约束，当约束变化导致成本上升时，你会先优化「WebGPU 概览与适用场景」里和 WebGPU 相关的哪些环节」作答：设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader

#### 落地步骤

- 第一步：WebGPU 概览与适用场景 只有在瓶颈被数据证实时才值得推进；先确认 WebGPU 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 WebGPU 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 WebGPU 概览与适用场景 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## webcodecs-streams-followup-2

title: 追问：结合真实业务约束，上线后你会盯哪些和 WebCodecs 相关的指标，来判断「WebCodecs + Streams 实现浏览器内视频处理」的收益是否持续成立
difficulty: 资深
tags: [WebCodecs, Streams, 视频, 追问]
parent: webcodecs-streams
generated: followup-script

### 一句话

这道追问的关键是把 WebCodecs 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，上线后你会盯哪些和 WebCodecs 相关的指标，来判断「WebCodecs + Streams 实现浏览器内视频处理」的收益是否持续成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「WebCodecs + Streams 实现浏览器内视频处理」结论成立，给出 WebCodecs 的验收路径（对应追问：结合真实业务约束，上线后你会盯哪些和 WebCodecs 相关的指标，来判断「WebCodecs + Streams 实现浏览器内视频处理」的收益是否持续成立）。
- 直接围绕「结合真实业务约束，上线后你会盯哪些和 WebCodecs 相关的指标，来判断「WebCodecs + Streams 实现浏览器内视频处理」的收益是否持续成立」作答：WebCodecs 不做封装格式（mp4 / mkv），只解 / 编 raw frame

#### 落地步骤

- 第一步：讨论 WebCodecs + Streams 实现浏览器内视频处理 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 WebCodecs 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## webcodecs-streams-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 WebCodecs 重排「WebCodecs + Streams 实现浏览器内视频处理」方案优先级
difficulty: 资深
tags: [WebCodecs, Streams, 视频, 追问]
parent: webcodecs-streams
generated: followup-script

### 一句话

回答这题时，先给 WebCodecs 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 WebCodecs 重排「WebCodecs + Streams 实现浏览器内视频处理」方案优先级？

### 答案要点

#### 直答

- 追问核心：围绕「WebCodecs + Streams 实现浏览器内视频处理」给出可执行的落地方案，重点说明 WebCodecs 怎么做（对应追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 WebCodecs 重排「WebCodecs + Streams 实现浏览器内视频处理」方案优先级）。
- 直接围绕「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 WebCodecs 重排「WebCodecs + Streams 实现浏览器内视频处理」方案优先级」作答：WebCodecs 不做封装格式（mp4 / mkv），只解 / 编 raw frame

#### 落地步骤

- 第一步：落地 WebCodecs + Streams 实现浏览器内视频处理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 WebCodecs 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 WebCodecs 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-progressive-enhancement-guardrail

title: 浏览器新能力上线护栏：特性检测、降级与回滚
difficulty: 资深
tags: [兼容性, 渐进增强, 发布]
followups: [browser-progressive-enhancement-guardrail-followup-1, browser-progressive-enhancement-guardrail-followup-2, browser-progressive-enhancement-guardrail-followup-3]

### 一句话

这题的高分关键是把 兼容性 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你计划上线一个依赖新 Web API 的能力（例如 WebGPU、Navigation API 或 File System Access）。如何设计上线护栏，避免兼容性事故？

### 答案要点

- 先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。
- 能力检测优先于 UA 判断：运行时 feature detection 更可靠，避免 UA 伪装和版本碎片导致误判。
- 降级路径要可验证：例如 WebGPU 降级到 WebGL2，File System Access 降级到上传/下载模式，不能只弹“浏览器不支持”。
- 发布阶段要可控：按人群或流量灰度放量，配合特性开关（kill switch）实现分钟级回退。

#### 工程化补充

- 场景前提：落地 浏览器新能力上线护栏：特性检测、降级与回滚 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

回答「浏览器性能预算治理：把优化目标写进发布流程」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

你会如何给前端项目建立性能预算，并把预算真正落到日常发布流程中？

### 答案要点

- 预算要分层：资源预算（JS/CSS/图片体积）+ 体验预算（LCP/INP/CLS）+ 运行时预算（长任务、主线程阻塞）。
- 阈值要按业务场景设定：营销页、后台页、弱网地区不能用同一标准，避免“统一目标”失真。
- CI 阶段要自动守门：超过预算直接阻断发布，或至少触发强提醒和审批流程。
- 发布阶段要做灰度对比：新旧版本同口径看 RUM 指标，确认收益来自本次改动而不是样本波动。

#### 工程化补充

- 场景前提：回答 浏览器性能预算治理：把优化目标写进发布流程 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器性能预算治理：把优化目标写进发布流程 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

回答这题时，先给 兼容性 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「浏览器新能力上线护栏：特性检测、降级与回滚」场景下，真要把「浏览器新能力上线护栏：特性检测、降级与回滚」推到线上，你会如何围绕 兼容性 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「浏览器新能力上线护栏：特性检测、降级与回滚」上线时如何灰度、观测、回滚（对应追问：在「浏览器新能力上线护栏：特性检测、降级与回滚」场景下，真要把「浏览器新能力上线护栏：特性检测、降级与回滚」推到线上，你会如何围绕 兼容性 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「在「浏览器新能力上线护栏：特性检测、降级与回滚」场景下，真要把「浏览器新能力上线护栏：特性检测、降级与回滚」推到线上，你会如何围绕 兼容性 设计灰度节奏、回滚条件和迁移路径」作答：先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。

#### 落地步骤

- 第一步：落地 浏览器新能力上线护栏：特性检测、降级与回滚 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 兼容性 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-progressive-enhancement-guardrail-followup-2

title: 追问：以「浏览器新能力上线护栏：特性检测、降级与回滚」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 兼容性 方案有效
difficulty: 资深
tags: [兼容性, 渐进增强, 发布, 追问]
parent: browser-progressive-enhancement-guardrail
generated: followup-script

### 一句话

这道追问的关键是把 兼容性 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「浏览器新能力上线护栏：特性检测、降级与回滚」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 兼容性 方案有效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器新能力上线护栏：特性检测、降级与回滚」结论成立，给出 兼容性 的验收路径（对应追问：以「浏览器新能力上线护栏：特性检测、降级与回滚」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 兼容性 方案有效）。
- 直接围绕「以「浏览器新能力上线护栏：特性检测、降级与回滚」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 兼容性 方案有效」作答：先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。

#### 落地步骤

- 第一步：浏览器新能力上线护栏：特性检测、降级与回滚 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 兼容性。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 兼容性 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## browser-progressive-enhancement-guardrail-followup-3

title: 追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「浏览器新能力上线护栏：特性检测、降级与回滚」范围，并把 兼容性 相关技术债回补计划讲清楚
difficulty: 资深
tags: [兼容性, 渐进增强, 发布, 追问]
parent: browser-progressive-enhancement-guardrail
generated: followup-script

### 一句话

这道追问的关键是把 兼容性 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「浏览器新能力上线护栏：特性检测、降级与回滚」范围，并把 兼容性 相关技术债回补计划讲清楚？

### 答案要点

#### 直答

- 追问核心：说明「浏览器新能力上线护栏：特性检测、降级与回滚」上线时如何灰度、观测、回滚（对应追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「浏览器新能力上线护栏：特性检测、降级与回滚」范围，并把 兼容性 相关技术债回补计划讲清楚）。
- 直接围绕「从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「浏览器新能力上线护栏：特性检测、降级与回滚」范围，并把 兼容性 相关技术债回补计划讲清楚」作答：先定义能力矩阵：按浏览器版本、系统、设备分档，明确“主路径、降级路径、不可用提示”三层策略。

#### 落地步骤

- 第一步：落地 浏览器新能力上线护栏：特性检测、降级与回滚 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 兼容性 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-performance-budget-guardrail-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 性能预算 相关的指标来判断「浏览器性能预算治理：把优化目标写进发布流程」是不是当前性能瓶颈
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理, 追问]
parent: browser-performance-budget-guardrail
generated: followup-script

### 一句话

这道追问要直接回应「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 性能预算 相关的指标来判断「浏览器性能预算治理：把优化目标写进发布流程」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器性能预算治理：把优化目标写进发布流程」结论成立，给出 性能预算 的验收路径（对应追问：结合真实业务约束，你会先看哪些与 性能预算 相关的指标来判断「浏览器性能预算治理：把优化目标写进发布流程」是不是当前性能瓶颈）。
- 直接围绕「结合真实业务约束，你会先看哪些与 性能预算 相关的指标来判断「浏览器性能预算治理：把优化目标写进发布流程」是不是当前性能瓶颈」作答：预算要分层：资源预算（JS/CSS/图片体积）+ 体验预算（LCP/INP/CLS）+ 运行时预算（长任务、主线程阻塞）。

#### 落地步骤

- 第一步：回答 浏览器性能预算治理：把优化目标写进发布流程 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 性能预算 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器性能预算治理：把优化目标写进发布流程 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-performance-budget-guardrail-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 性能预算 方案有效
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理, 追问]
parent: browser-performance-budget-guardrail
generated: followup-script

### 一句话

这道追问的关键是把 性能预算 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 性能预算 方案有效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器性能预算治理：把优化目标写进发布流程」结论成立，给出 性能预算 的验收路径（对应追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 性能预算 方案有效）。
- 直接围绕「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 性能预算 方案有效」作答：预算要分层：资源预算（JS/CSS/图片体积）+ 体验预算（LCP/INP/CLS）+ 运行时预算（长任务、主线程阻塞）。

#### 落地步骤

- 第一步：浏览器性能预算治理：把优化目标写进发布流程 只有在瓶颈被数据证实时才值得推进；先确认 性能预算 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 性能预算 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器性能预算治理：把优化目标写进发布流程 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-performance-budget-guardrail-followup-3

title: 追问：以「浏览器性能预算治理：把优化目标写进发布流程」为例，围绕「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 资深
tags: [性能预算, CoreWebVitals, 治理, 追问]
parent: browser-performance-budget-guardrail
generated: followup-script

### 一句话

围绕「浏览器性能预算治理：把优化目标写进发布流程」回答追问时，重点说清 性能预算 的前提、动作和回退条件。

### 题目

如果面试官追问：以「浏览器性能预算治理：把优化目标写进发布流程」为例，围绕「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 追问核心：比较「浏览器性能预算治理：把优化目标写进发布流程」在收益、成本和维护复杂度上的取舍边界（对应追问：以「浏览器性能预算治理：把优化目标写进发布流程」为例，围绕「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的优化决策，你会如何量化收益、风险和长期维护成本）。
- 直接围绕「以「浏览器性能预算治理：把优化目标写进发布流程」为例，围绕「浏览器性能预算治理：把优化目标写进发布流程」在 性能预算 上的优化决策，你会如何量化收益、风险和长期维护成本」作答：预算要分层：资源预算（JS/CSS/图片体积）+ 体验预算（LCP/INP/CLS）+ 运行时预算（长任务、主线程阻塞）。

#### 落地步骤

- 第一步：回答 浏览器性能预算治理：把优化目标写进发布流程 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 性能预算 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 浏览器性能预算治理：把优化目标写进发布流程 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## browser-compatibility-incident-bridge

title: 浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通]
followups: [browser-compatibility-incident-bridge-followup-1, browser-compatibility-incident-bridge-followup-2, browser-compatibility-incident-bridge-followup-3]

### 一句话

这题回答要覆盖 兼容性 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

某次发布后，低版本 Safari 白屏率突增，但 Chrome 一切正常。运营要求立刻回滚，产品希望先观察。你作为前端负责人，会如何组织兼容性事故指挥桥并快速拍板？

### 答案要点

- 先分层定位：按浏览器版本、设备型号、系统版本拆分影响面，避免全量误判。
- 先确认数据可信：白屏埋点、资源加载失败、JS 异常三路信号要交叉验证。
- 明确拍板条件：触发阈值（白屏率、影响用户量、恢复 ETA）提前约定，减少争论。
- 动作分级执行：高风险版本先切降级包，中风险版本先开特性开关，低风险版本继续观察。

#### 工程化补充

- 场景前提：浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

回答「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

你们上线了依赖新浏览器能力的重功能（如 WebGPU / File System Access），上线后部分环境出现异常。你会如何设计 Kill Switch 编排，保证止损快且恢复有序？

### 答案要点

- 开关要分层：全局开关、浏览器版本开关、功能模块开关分开，避免一刀切。
- 降级路径要预演：新能力关闭后必须有可用替代链路（WebGL2 / 上传下载 / 只读模式）。
- 切换要幂等：多次触发不会导致状态错乱，避免事故中“开关抖动”。
- 观测要绑定动作：每次开关动作要记录影响范围、恢复时长和用户体验变化。

#### 工程化补充

- 场景前提：浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这道追问的关键是把 兼容性 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：兼容性事故指挥桥要真正落地，你会先验证哪三条前提，避免事故时现场返工？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通」结论成立，给出 兼容性 的验收路径（对应追问：兼容性事故指挥桥要真正落地，你会先验证哪三条前提，避免事故时现场返工）。
- 直接围绕「兼容性事故指挥桥要真正落地，你会先验证哪三条前提，避免事故时现场返工」作答：先分层定位：按浏览器版本、设备型号、系统版本拆分影响面，避免全量误判。

#### 落地步骤

- 第一步：讨论 浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 兼容性 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## browser-compatibility-incident-bridge-followup-2

title: 追问：你会用哪些数据证明兼容性事故治理在变好
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通, 追问]
parent: browser-compatibility-incident-bridge
generated: followup-script

### 一句话

这道追问的关键是把 兼容性 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：你说兼容性事故治理有效，会拿哪些数据证明“真的变好”，而不是只是多开了几个群？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通」结论成立，给出 兼容性 的验收路径（对应追问：你说兼容性事故治理有效，会拿哪些数据证明“真的变好”，而不是只是多开了几个群）。
- 直接围绕「你说兼容性事故治理有效，会拿哪些数据证明“真的变好”，而不是只是多开了几个群」作答：先分层定位：按浏览器版本、设备型号、系统版本拆分影响面，避免全量误判。

#### 落地步骤

- 第一步：落地 浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 兼容性 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-compatibility-incident-bridge-followup-3

title: 追问：预算紧张时你如何重排兼容性事故处置优先级
difficulty: 资深
tags: [兼容性, 事故处置, 决策沟通, 追问]
parent: browser-compatibility-incident-bridge
generated: followup-script

### 一句话

回答这题时，先给 兼容性 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：预算收紧但兼容性事故在增多，你会怎么重排处置优先级，既止损又不拖垮团队？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通」给出可执行的落地方案，重点说明 兼容性 怎么做（对应追问：预算收紧但兼容性事故在增多，你会怎么重排处置优先级，既止损又不拖垮团队）。
- 直接围绕「预算收紧但兼容性事故在增多，你会怎么重排处置优先级，既止损又不拖垮团队」作答：先分层定位：按浏览器版本、设备型号、系统版本拆分影响面，避免全量误判。

#### 落地步骤

- 第一步：讨论 浏览器兼容性事故指挥桥：白屏告警、版本分层与止损沟通 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：先把 兼容性 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 兼容性 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## browser-kill-switch-orchestration-followup-1

title: 追问：Kill Switch 编排最容易遗漏哪几条关键前提
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略, 追问]
parent: browser-kill-switch-orchestration
generated: followup-script

### 一句话

这道追问要直接回应「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」在 发布治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：Kill Switch 设计里最容易遗漏哪几条关键前提？事故来时你会先检查什么？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」给出可执行的落地方案，重点说明 发布治理 怎么做（对应追问：Kill Switch 设计里最容易遗漏哪几条关键前提？事故来时你会先检查什么）。
- 直接围绕「Kill Switch 设计里最容易遗漏哪几条关键前提？事故来时你会先检查什么」作答：开关要分层：全局开关、浏览器版本开关、功能模块开关分开，避免一刀切。

#### 落地步骤

- 第一步：浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-kill-switch-orchestration-followup-2

title: 追问：你会拿哪些指标证明 Kill Switch 机制真的有效
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略, 追问]
parent: browser-kill-switch-orchestration
generated: followup-script

### 一句话

回答这题时，先给 发布治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：你说 Kill Switch 编排有效，会用哪些指标证明它真的缩短了损失窗口？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」结论成立，给出 发布治理 的验收路径（对应追问：你说 Kill Switch 编排有效，会用哪些指标证明它真的缩短了损失窗口）。
- 直接围绕「你说 Kill Switch 编排有效，会用哪些指标证明它真的缩短了损失窗口」作答：开关要分层：全局开关、浏览器版本开关、功能模块开关分开，避免一刀切。

#### 落地步骤

- 第一步：落地 浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## browser-kill-switch-orchestration-followup-3

title: 追问：上线窗口提前时你如何收敛 Kill Switch 范围并补债
difficulty: 资深
tags: [发布治理, 兼容性, 止损策略, 追问]
parent: browser-kill-switch-orchestration
generated: followup-script

### 一句话

围绕「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」回答追问时，重点说清 发布治理 的前提、动作和回退条件。

### 题目

如果面试官追问：上线窗口突然提前，你会如何收敛 Kill Switch 建设范围，同时把后续补债计划说清楚？

### 答案要点

#### 直答

- 追问核心：说明「浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏」上线时如何灰度、观测、回滚（对应追问：上线窗口突然提前，你会如何收敛 Kill Switch 建设范围，同时把后续补债计划说清楚）。
- 直接围绕「上线窗口突然提前，你会如何收敛 Kill Switch 建设范围，同时把后续补债计划说清楚」作答：开关要分层：全局开关、浏览器版本开关、功能模块开关分开，避免一刀切。

#### 落地步骤

- 第一步：浏览器特性 Kill Switch 编排：开关分层、回退包与恢复节奏 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。
