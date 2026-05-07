---
id: 05-browser
title: 浏览器原理
order: 5
icon: 🌐
description: 从 URL 到渲染、存储、事件循环、Service Worker、性能与调试工具。
---

## url-to-render
title: 从输入 URL 到页面显示，浏览器经历了什么

### 一句话
DNS 解析 → 建连（TCP/TLS）→ 发请求拿 HTML → 解析 HTML 同时下载 CSS/JS → 构建 DOM/CSSOM → 合并 Render Tree → 布局 → 绘制 → 合成上屏。
difficulty: 基础
tags: [流程, 渲染]

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
<script src="a.js"></script>           <!-- 阻塞解析与执行 -->
<script src="b.js" defer></script>     <!-- 不阻塞解析，DOMContentLoaded 前按序执行 -->
<script src="c.js" async></script>     <!-- 不阻塞解析，下载完立即执行（顺序不保证） -->
<script type="module" src="d.js"></script>  <!-- 默认 defer 行为 -->

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

### 延伸
- 首屏性能优化的本质，就是缩短这条关键路径上的阻塞链
- 真正的"可交互"不等于"首屏内容出现"
- 浏览器通常还有预加载扫描器等并行优化机制，所以"严格串行流程图"只是帮助理解的简化模型

## render-pipeline
title: DOM、CSSOM、Render Tree、Layout、Paint、Composite 的关系
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
    const w = el.offsetWidth;       // 读：强制同步布局
    el.style.width = w * 2 + 'px';  // 写：使下次读再次失效
  }
}

// ✅ 正解：先批量读，再批量写
function good(items: HTMLElement[]) {
  const widths = items.map(el => el.offsetWidth);   // 集中读
  items.forEach((el, i) => el.style.width = widths[i] * 2 + 'px'); // 集中写
}

// ✅ 用 class 切换，浏览器自动批处理
el.classList.add('expanded');

// ✅ requestAnimationFrame 把 DOM 操作对齐到渲染前
requestAnimationFrame(() => {
  el.style.transform = 'translateX(100px)';
});

// ✅ Web Animations API：合成层动画
el.animate(
  [{ transform: 'translateX(0)' }, { transform: 'translateX(100px)' }],
  { duration: 300, easing: 'ease-out', fill: 'forwards' },
);
```

### 延伸
- 读取布局信息（如 `offsetHeight`）可能强制浏览器同步刷新布局
- 批量读写分离、使用 class 切换，比一条条改 style 更稳

## storage-cookie
title: Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage 如何取舍
difficulty: 基础
tags: [存储, Cookie]

### 一句话
Cookie 体积小、会随请求自动发送，适合会话标识；支持 HttpOnly、Secure、SameSite；localStorage 同步 API、实现简单，但配额和行为依浏览器而异；不适合存大量数据和高频写…。

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

### 延伸
- 敏感令牌不要因为"前端方便"就直接存 localStorage
- localStorage 是同步的，在低端机和高频写场景会卡主线程
- Cookie 若承载会话，通常还应结合 `__Host-` / `__Secure-` 前缀、`Path`、过期策略与服务端会话治理一起设计

## service-worker
title: Service Worker 生命周期与常见缓存策略
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
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();    // 立即激活新版本（注意兼容性）
});

self.addEventListener('activate', (e: any) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// 1. cache-first（静态资源）
function cacheFirst(req: Request) {
  return caches.match(req).then(r => r || fetch(req).then(res => {
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(req, clone));
    return res;
  }));
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
  const fetchPromise = fetch(req).then(res => {
    caches.open(CACHE).then(c => c.put(req, res.clone()));
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

### 延伸
- SW 更新策略要权衡"立即生效"与"避免打断用户"
- 离线能力不是只缓存首页，数据和静态资源更新策略同样关键
- `skipWaiting()` / `clients.claim()` 很常见，但是否立即接管页面要结合版本兼容与用户正在进行的操作一起评估

## event-loop-worker
title: 浏览器事件循环、主线程限制与 Worker
difficulty: 进阶
tags: [事件循环, Worker]

### 一句话
主线程同时要处理 JS、样式、布局、绘制和用户输入，长任务会直接拖慢响应；Worker 可把计算密集型任务移到后台线程，如解析大 JSON、图像处理、搜索索引；Worker 不能直接访问 DOM…。

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
worker.onmessage = e => render(e.data);
worker.onerror = e => console.error(e);

// crunch.worker.ts
self.onmessage = e => {
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
  async parseCSV(text: string) { /* ... */ return rows; },
  async fuzzySearch(query: string) { /* ... */ },
};
Comlink.expose(api);
export type Api = typeof api;

// 主线程
import type { Api } from './worker';
const api = Comlink.wrap<Api>(new Worker(new URL('./worker', import.meta.url), { type: 'module' }));
const rows = await api.parseCSV(largeText);   // 像调用本地异步函数
```

### 延伸
- 结构化克隆有成本，大数据频繁传输未必划算
- OffscreenCanvas、AudioWorklet、PaintWorklet 都是更细分的线程化能力

## observer-performance-api
title: Observer 家族与 Performance API 的实战用法
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
  entries => {
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
document.querySelectorAll('img[data-src]').forEach(el => io.observe(el));

// 2. ResizeObserver：监听容器尺寸
const ro = new ResizeObserver(entries => {
  for (const entry of entries) {
    chart.resize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  }
});
ro.observe(containerEl);

// 3. MutationObserver：检测 DOM 变更（如富文本编辑）
const mo = new MutationObserver(records => {
  for (const r of records) {
    if (r.type === 'childList') console.log('children changed');
    if (r.type === 'attributes') console.log('attr', r.attributeName);
  }
});
mo.observe(editor, { childList: true, subtree: true, attributes: true });

// 4. PerformanceObserver：监听核心指标
new PerformanceObserver(list => {
  list.getEntries().forEach(entry => {
    console.log(entry.entryType, entry.name, entry.startTime, entry.duration);
  });
}).observe({
  type: 'longtask',
  buffered: true,                         // 拿历史条目
});

// 监听 LCP（取最后一个）
new PerformanceObserver(list => {
  const last = list.getEntries().at(-1);
  console.log('LCP', last?.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

### 延伸
- 这些 API 的价值在于"让浏览器帮你做监听批处理"，减少轮询与同步计算
- 可观测性 SDK 常用 `PerformanceObserver + Beacon` 做基础指标上报
- 性能条目缓冲区可能会满，工程上要考虑 `buffered` 读取和条目丢失问题

## devtools-memory
title: 浏览器 DevTools 如何排查内存泄漏与卡顿
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
    window.addEventListener('resize', this.onResize);  // ❌ 未保存引用
  }
  onResize = () => { /* ... */ };
  destroy() {
    window.removeEventListener('resize', this.onResize); // ✅ 同一引用才能移除
  }
}

// 2. 定时器未清理
let timer: any;
function start() {
  timer = setInterval(() => poll(), 1000);
}
function stop() { clearInterval(timer); }

// 3. 闭包引用大对象
function attach(big: ArrayBuffer) {
  return () => console.log('hi');   // ❌ 闭包仍然持有 big
}
// ✅ 用完释放
function attachOk(big: ArrayBuffer) {
  let local: ArrayBuffer | null = big;
  return () => { console.log(local?.byteLength); local = null; };
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
const obj = ref.deref();   // 可能为 undefined（已被 GC）
```

### 延伸
- 排查内存泄漏常做"三次快照对比"：初始、操作后、GC 后
- 不要只盯总内存大小，更要看"该被释放的对象是否还活着"

## v8-engine
title: V8 引擎工作机制（Ignition / TurboFan / 隐藏类）
difficulty: 资深
tags: [V8, 引擎]

### 一句话
解析 → 字节码：Parser 生成 AST，Ignition 直接解释字节码运行；优化编译：热点代码进入 TurboFan，做基于类型反馈的 JIT 编译；类型不稳定会被 deopt 回 Ignition…。

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

### 延伸
- V8 团队博客和 v8.dev 文章常更新优化细节，比道听途说靠谱
- "猜测优化"思路：根据代码运行时表现反馈类型，前端不需要手动加 type，但代码风格稳定能间接帮 V8

## webgpu-overview
title: WebGPU 概览与适用场景
difficulty: 资深
tags: [WebGPU, GPU]

### 一句话
设计目标：现代显卡 API（基于 Metal / Vulkan / DX12），多线程提交、Compute Shader；性能：相比 WebGL 减少状态机切换开销，能用 GPU 做通用计算；资源：BindGroup / Pipeline 显式声明…。

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

### 延伸
- 引擎层（Three.js、Babylon.js、PIXI v8、TensorFlow.js）已支持 WebGPU 后端，业务层切换成本不大
- 没有 WebGPU 时回退 WebGL2 / WASM SIMD 是常见的做法

## reflow-vs-repaint
title: 回流（reflow）和重绘（repaint）的区别与触发条件
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

### 延伸
- Chrome DevTools → Performance → Layout/Paint 火焰图可定位
- composite-only 属性：transform / opacity / filter（合成线程处理，不阻塞主线程）

## browser-cache-strategy
title: 浏览器缓存的完整链路是什么样的
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
      })
    );
  }
});
```

### 延伸
- 大公司常用 SWR（stale-while-revalidate）：先返回缓存再后台刷新
- 注意 chrome 强制刷新（Ctrl+Shift+R）会跳过强缓存但仍可能命中协商缓存
- HTTP/2 Push Cache 使用率低，已被 103 Early Hints + preload 取代

## cookie-localstorage-indexeddb
title: Cookie / localStorage / sessionStorage / IndexedDB 选哪个
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

### 延伸
- localStorage 同步阻塞主线程，不适合频繁写入
- 复杂应用首选 IndexedDB（用 idb-keyval / Dexie 简化）
- 跨子域共享存储用 cookie；跨主域用 postMessage + iframe

## web-worker-basics
title: Web Worker 是什么，什么场景应该用
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

### 延伸
- Vite / webpack 都支持把 `?worker` 后缀的文件单独打包成 Worker
- React / Vue 里推荐用 `Comlink` 让 Worker 通信像调用普通方法
- OffscreenCanvas 让你在 Worker 里直接操作 Canvas，特别适合可视化/游戏

## browser-process-thread
title: Chrome 多进程 + 多线程架构是什么样的
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

### 延伸
- 移动端 Chrome 进程数受限于内存，会做"进程合并"
- Edge 与 Brave 同源 Chromium 架构相同
- Safari 也用类似的 WebContent + Networking + GPU 进程拆分


## webgpu-pipeline-basics
title: WebGPU 比 WebGL 强在哪？最小可用渲染管线
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

const wgsl = /* wgsl */`
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
  vertex:   { module, entryPoint: 'vs' },
  fragment: { module, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list' },
});

function frame() {
  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [{
      view: ctx.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.draw(3);
  pass.end();
  device.queue.submit([enc.finish()]);
  requestAnimationFrame(frame);
}
frame();
```

### 延伸
- WebNN（神经网络 API）配合 WebGPU 后端，未来浏览器原生跑 LLM
- WebGPU 在 Node 也有实现（dawn / wgpu binding），跨端复用 shader

## webtransport-vs-websocket
title: WebTransport 和 WebSocket 的关系？什么场景用
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

### 延伸
- WebRTC + WebTransport 组合：媒体走 RTC，控制信令走 WebTransport
- 阿里 / 腾讯云的低延迟直播已有 WebTransport 试点

## webcodecs-streams
title: WebCodecs + Streams 实现浏览器内视频处理
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
processor.readable
  .pipeThrough(watermarkTransform)
  .pipeTo(new WritableStream({
    write(frame) {
      encoder.encode(frame, { keyFrame: false });
      frame.close();
    },
  }));
```

### 延伸
- WebRTC Insertable Streams（同样 VideoFrame 概念）做端到端加密 / 滤镜
- 实时 AI 处理：每帧扔到 WebGPU 跑模型 → 输出新 frame，全 GPU 管道
- "无服务器视频转码"：浏览器用户机器算力替代后端

