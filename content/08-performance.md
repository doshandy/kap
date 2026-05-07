---
id: 08-performance
title: 性能优化
order: 8
icon: ⚡
description: Core Web Vitals、首屏与运行时优化、资源治理、监控与性能预算。
---

## methodology
title: 性能优化方法论：先度量，再定位，再治理
difficulty: 基础
tags: [方法论, 指标]

### 题目
为什么性能优化不能靠“经验主义手改”？请给出一套可落地的方法论。

### 答案要点
- 先明确目标：提升首屏、交互响应、稳定性还是成本
- 先度量再优化：RUM、Lighthouse、Performance 面板、业务埋点
- 找瓶颈：网络、脚本、渲染、图片、接口、缓存、第三方脚本
- 优化后持续监控，防止回归

### 代码示例
```ts
// 业务侧 RUM：上报 Web Vitals + 自定义指标
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

function reportMetric(name: string, value: number, id: string) {
  navigator.sendBeacon('/api/rum', JSON.stringify({
    name, value, id,
    page: location.pathname,
    ua: navigator.userAgent,
    nt: (navigator as any).connection?.effectiveType,
    ts: Date.now(),
  }));
}

onLCP(m => reportMetric('LCP', m.value, m.id));
onINP(m => reportMetric('INP', m.value, m.id));
onCLS(m => reportMetric('CLS', m.value, m.id));
onFCP(m => reportMetric('FCP', m.value, m.id));
onTTFB(m => reportMetric('TTFB', m.value, m.id));

// 自定义业务指标：列表渲染耗时
performance.mark('list-render-start');
renderList(data);
performance.mark('list-render-end');
performance.measure('list-render', 'list-render-start', 'list-render-end');
const m = performance.getEntriesByName('list-render')[0];
reportMetric('list-render', m.duration, '');
```

### 延伸
- 没有指标的优化很容易沦为"玄学调参"
- 性能是系统问题，不只是前端包体问题

## core-web-vitals
title: LCP、INP、CLS 如何理解与治理
difficulty: 进阶
tags: [CWV, WebVitals]

### 题目
解释 LCP、INP、CLS 各自衡量什么，以及最常见的优化抓手。

### 答案要点
- LCP 衡量主要内容出现速度，重点看首屏 HTML、关键资源、服务端响应、首图/首屏块渲染
- INP 衡量交互到下一帧视觉反馈的延迟，重点看长任务、主线程阻塞、重计算
- CLS 衡量布局稳定性，重点防止图片/广告/异步内容无尺寸占位
- Core Web Vitals 通常以页面访问样本的第 75 百分位来评估；常见“良好”阈值是 LCP <= 2.5s、INP <= 200ms、CLS <= 0.1

### 代码示例
```ts
// 监听长任务（INP 大头）
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long task:', entry.duration, 'ms', entry);
      reportLongTask(entry);
    }
  }
}).observe({ type: 'longtask', buffered: true });

// 监听 LCP 元素：找到首屏关键内容
new PerformanceObserver(list => {
  const last = list.getEntries().at(-1) as any;
  console.log('LCP element:', last.element, 'time:', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// 监听布局抖动（CLS 元凶）
new PerformanceObserver(list => {
  for (const entry of list.getEntries() as any[]) {
    if (!entry.hadRecentInput && entry.value > 0.05)
      console.warn('Layout shift:', entry.value, entry.sources);
  }
}).observe({ type: 'layout-shift', buffered: true });
```

```html
<!-- CLS 优化：图片预留尺寸，避免回流 -->
<img src="hero.webp" width="1200" height="600" alt="..." />
<!-- 或用 aspect-ratio -->
<div style="aspect-ratio: 16/9"><img src="hero.webp" /></div>
```

### 延伸
- INP 取代 FID，是因为它更能反映整个页面生命周期内真实交互体验
- 只盯实验室数据不够，必须结合真实用户监控

## rum-vs-lab
title: 实验室数据与真实用户数据为什么经常不一致
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals]

### 题目
为什么 Lighthouse 跑出来很好，线上用户却依然觉得慢？实验室数据和真实用户数据该怎么一起看？

### 答案要点
- 实验室数据来自受控环境，适合做回归对比和本地定位；真实用户数据反映设备、网络、地域、登录态、个性化、缓存命中等真实差异
- LCP、INP 等指标在 field 和 lab 中可能明显不同，例如线上会遇到重定向、冷缓存、Cookie 弹窗、A/B 实验脚本和第三方资源抖动
- 排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群
- 指标分析要分页面、设备、网络和国家地区分桶，否则平均值很容易掩盖真实瓶颈

### 代码示例
```js
// lighthouserc.cjs：Lighthouse CI 在 CI 中跑实验室数据
module.exports = {
  ci: {
    collect: {
      url: ['https://staging.example.com/'],
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

```ts
// RUM 端：按设备/地区/网络分桶
function bucket(metric: any) {
  return {
    name: metric.name,
    value: metric.value,
    p: location.pathname,
    nt: (navigator as any).connection?.effectiveType ?? 'unknown', // 4g/3g/2g
    dpr: devicePixelRatio,
    mem: (navigator as any).deviceMemory ?? 0,
    cores: navigator.hardwareConcurrency,
  };
}
```

### 延伸
- Lab 更擅长"发现为什么慢"，Field 更擅长"判断到底有多少用户受影响"
- 只看单次 Lighthouse 分数，通常不足以指导长期性能治理

## initial-load
title: 首屏优化：SSR、SSG、ISR、路由分包、Critical CSS
difficulty: 进阶
tags: [首屏, SSR]

### 题目
如果首页很慢，你会怎样判断该上 SSR、SSG 还是继续优化纯 SPA？

### 答案要点
- 内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高
- 高频更新但允许增量生成时可考虑 ISR
- 纯 SPA 也能通过路由分包、预加载、关键 CSS、骨架屏优化首屏
- 是否引入 SSR 取决于业务目标、团队运维能力和数据获取复杂度

### 代码示例
```ts
// 路由级懒加载 + 关键路由预加载
const routes = [
  {
    path: '/dashboard',
    component: () => import(/* webpackPrefetch: true */ '@/pages/Dashboard.vue'),
  },
  {
    path: '/heavy',
    component: () => import('@/pages/Heavy.vue'), // 按需加载
  },
];

// 鼠标 hover 预加载
function preload(href: string) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = href;
  document.head.appendChild(link);
}
```

```vue
<!-- Critical CSS：仅 inline 首屏关键样式 -->
<template>
  <div class="hero">
    <img src="/hero.webp" fetchpriority="high" />
    <h1>{{ title }}</h1>
  </div>
</template>

<style scoped>
/* 首屏关键 CSS（构建时被 critters 提取并 inline 到 HTML） */
.hero { display: flex; min-height: 60vh; }
</style>
```

```ts
// vite-plugin-prerender：构建期生成静态首屏
import prerender from 'vite-plugin-prerender';
export default {
  plugins: [
    prerender({
      routes: ['/', '/about', '/pricing'],
      postProcess: r => ({ ...r, html: r.html.replace(/<script[^>]*>([\s\S]*?)<\/script>/g, '') }),
    }),
  ],
};
```

### 延伸
- "上 SSR"不是银弹，水合错误、缓存、边缘部署都会带来新复杂度

## runtime-optimization
title: 运行时优化：虚拟列表、拆长任务、批量更新
difficulty: 进阶
tags: [运行时, 长任务]

### 题目
用户操作时页面卡顿，前端最常见的运行时优化手段有哪些？

### 答案要点
- 减少一次渲染要处理的节点：分页、虚拟列表、按需展开、条件卸载不可见区域
- 拆分长任务：把大循环切片、移入 Worker、让出主线程
- 减少重复计算和重复渲染：缓存派生值、合并状态更新、避免无效 watcher
- 某些浏览器已提供 `scheduler.postTask()` 等调度能力，但它们并非所有环境都可用，落地时要准备降级路径

### 代码示例
```ts
// 1. 把大循环切片，让出主线程
async function processLargeData(data: any[]) {
  const CHUNK = 200;
  for (let i = 0; i < data.length; i += CHUNK) {
    for (let j = i; j < Math.min(i + CHUNK, data.length); j++) {
      processItem(data[j]);
    }
    // 让出一帧给浏览器渲染
    await new Promise(r => setTimeout(r, 0));
  }
}

// 2. 使用 requestIdleCallback 利用空闲时段
function idleProcess(items: any[]) {
  let i = 0;
  function tick(deadline: IdleDeadline) {
    while (deadline.timeRemaining() > 0 && i < items.length) {
      processItem(items[i++]);
    }
    if (i < items.length) requestIdleCallback(tick);
  }
  requestIdleCallback(tick);
}

// 3. scheduler.postTask（现代浏览器，可降级）
async function priorityTask() {
  if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
    await (window as any).scheduler.postTask(heavyWork, { priority: 'background' });
  } else {
    await new Promise(r => setTimeout(r, 0));
    heavyWork();
  }
}

// 4. CPU 密集移到 Web Worker
const worker = new Worker(new URL('./crunch.worker.ts', import.meta.url), { type: 'module' });
worker.postMessage({ data: largeArray });
worker.onmessage = e => render(e.data);
```

```ts
// 5. Vue 中：v-memo 跳过相同子树重渲染
// <li v-for="item in items" :key="item.id" v-memo="[item.id, item.selected]">
//   {{ item.label }}
// </li>
```

### 延伸
- 框架层的优化只是基础，真正的大头通常在业务代码和数据量
- 卡顿问题要看 flame chart，而不是猜

## network-resource-hints
title: preload、prefetch、modulepreload、preconnect 怎么用才不浪费
difficulty: 进阶
tags: [资源提示, 网络]

### 题目
说明几种常见 Resource Hints 的区别，并给出一个错误使用的例子。

### 答案要点
- `preload`：当前导航很快就要用的关键资源
- `modulepreload`：提前拉取模块依赖
- `prefetch`：未来导航可能用到的低优先级资源，通常更适合同站后续页面资源
- `preconnect`：提前建立连接；`dns-prefetch` 只做更轻量的 DNS 预热
- 浏览器会结合自身调度策略决定是否采纳提示，提示不是强制命令
- 误用例：把大量非关键资源都 preload，会挤占真正关键资源带宽

### 代码示例
```html
<!-- ✅ 关键资源用 preload + fetchpriority -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<link rel="preload" as="font" href="/fonts/main.woff2" type="font/woff2" crossorigin />
<link rel="modulepreload" href="/assets/critical-route.js" />

<!-- ✅ 提前建立连接（第三方域） -->
<link rel="preconnect" href="https://api.example.com" crossorigin />
<link rel="dns-prefetch" href="https://cdn.thirdparty.com" />

<!-- ✅ 后续可能用到的资源（低优先级） -->
<link rel="prefetch" href="/dashboard.js" as="script" />

<!-- ❌ 反例：把所有图片都 preload -->
<!-- <link rel="preload" as="image" href="/img1.png" /> ... 100 行 -->
<!-- 后果：挤占首屏带宽，关键 CSS/JS 反而更晚拿到 -->

<!-- ✅ 图片优先级控制 -->
<img src="hero.webp" fetchpriority="high" />     <!-- 首屏主图 -->
<img src="thumb.webp" fetchpriority="low" loading="lazy" />  <!-- 列表缩略图 -->
```

### 延伸
- 提示不是越多越好，关键在"优先级正确"
- 模块脚本优先考虑 `modulepreload`；图片等资源若需要更细粒度优先级，还可以结合 `fetchpriority`

## image-font-bundle
title: 图片、字体、JS 包体是最常见的三类资源瓶颈
difficulty: 基础
tags: [图片, 字体, 包体]

### 题目
针对图片、字体、JS 包体，分别列出 2 到 3 个最高收益优化动作。

### 答案要点
- 图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF
- 字体：子集化、`font-display: swap`、减少变体数量
- JS：路由分包、按需引入、删除无用依赖、分析第三方包体积

### 代码示例
```html
<!-- 响应式图片 + 现代格式 -->
<picture>
  <source type="image/avif" srcset="hero.avif 1x, hero@2x.avif 2x" />
  <source type="image/webp" srcset="hero.webp 1x, hero@2x.webp 2x" />
  <img
    src="hero.jpg"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
    sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
    loading="lazy"
    decoding="async"
    width="1200" height="600"
    alt="..."
  />
</picture>
```

```css
/* 字体优化 */
@font-face {
  font-family: 'Main';
  src: url('/fonts/main-subset.woff2') format('woff2');
  font-display: swap;       /* 字体加载时显示降级字体 */
  unicode-range: U+0020-007F, U+4E00-9FFF;  /* 子集化：仅常用字符 */
}
```

```ts
// 包体分析与按需引入
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
export default {
  plugins: [
    visualizer({ open: true, gzipSize: true }),
  ],
};

// ❌ 全量引入
import _ from 'lodash';
// ✅ 按需引入（配合 unplugin-auto-import 更优）
import debounce from 'lodash/debounce';
// ✅ 或换成 lodash-es + Tree Shaking
import { debounce } from 'lodash-es';
```

### 延伸
- 很多页面"看起来像 JS 慢"，其实是大图和 Web 字体拖慢了可见内容

## monitoring-budget
title: 性能预算与回归治理
difficulty: 进阶
tags: [预算, 监控]

### 题目
如何防止性能优化做完后几周内又被新需求吃回去？

### 答案要点
- 建立性能预算：首屏 JS、图片体积、LCP/INP/CLS 阈值
- 在 CI 中接入 Lighthouse CI、bundle analyzer、包体阈值检查
- 线上持续收集 Web Vitals 和长任务数据，按页面、地区、设备分桶看趋势

### 代码示例
```js
// vite.config.ts：bundle 大小阈值
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 500, // 单 chunk 超 500KB 警告
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          echarts: ['echarts'],
        },
      },
    },
  },
});
```

```yaml
# .github/workflows/perf.yml：CI 性能预算
name: perf-budget
on: [pull_request]
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://staging.example.com/
          uploadArtifacts: true
          configPath: ./lighthouserc.cjs
```

```json
// package.json：size-limit 配置
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "150 KB" },
    { "path": "dist/assets/vendor-*.js", "limit": "200 KB" }
  ]
}
```

### 延伸
- 性能预算不是为了挡需求，而是让团队知道"每次新增成本是多少"
- 预算要可解释、可协商，而不是一刀切

## inp-deep
title: INP 取代 FID 后，前端要怎么优化交互响应
difficulty: 资深
tags: [INP, 交互]

### 题目
2024 年起 INP 取代 FID 成为 Core Web Vitals 之一，它衡量的是什么？前端如何系统性优化？

### 答案要点
- INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98
- FID 只看首次输入，INP 看所有交互，是更严格的指标
- 优化路径：拆长任务、`scheduler.yield()` / `requestIdleCallback`、脏检查降级、避免大列表 sync render
- 输入处理：`onInput` 内只 setState，重计算放到 `useTransition` 或 `requestIdleCallback`
- 第三方脚本：埋点 / 广告 / 客服往往是 INP 杀手，能延迟加载就延迟，能用 Web Worker 就用
- 度量：`web-vitals` SDK 里 `onINP`，配合长任务采样（PerformanceObserver `longtask`）

### 代码示例
```ts
import { onINP } from 'web-vitals';
onINP((m) => navigator.sendBeacon('/beacon', JSON.stringify({ name: m.name, value: m.value, id: m.id })));

if ('scheduler' in window && 'yield' in (window.scheduler as object)) {
  async function processChunks(items: unknown[]) {
    for (const item of items) {
      doWork(item);
      await (window.scheduler as { yield: () => Promise<void> }).yield();
    }
  }
}

let pending: Set<string> | null = null;
function onTyping(value: string) {
  if (!pending) {
    pending = new Set();
    requestAnimationFrame(() => {
      const next = new Set(pending!);
      pending = null;
      heavyUpdate(next);
    });
  }
  pending.add(value);
}
```

### 延伸
- React 18 的 `useTransition`、Vue 的 Suspense + defer、Solid 的细粒度更新都直接帮助 INP
- 长任务（>50ms）治理是 INP 优化的根，老老实实拆 long task 收益最大

## image-modern-pipeline
title: 现代图片处理流水线（AVIF / WebP / responsive / blur-up）
difficulty: 进阶
tags: [图片, LCP]

### 题目
做内容站的图片优化，从源图到客户端展示完整链路有哪些环节？

### 答案要点
- 上传：原图存对象存储，不要直接服务客户端
- 处理：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）
- 命名：`/img/{id}/{w}.{format}`，方便缓存和回滚
- 响应式：`<picture>` + `srcset` + `sizes`，让浏览器选最优
- 占位：LQIP（低质量缩略图）/ blurhash / dominant color，避免 CLS
- 懒加载：`loading="lazy"` + `fetchpriority`（首屏首图设 high）
- LCP：首屏图加 `fetchpriority="high" + preload`

### 代码示例
```html
<picture>
  <source type="image/avif" srcset="/img/x.avif?w=480 480w, /img/x.avif?w=960 960w" sizes="(max-width: 720px) 100vw, 720px" />
  <source type="image/webp" srcset="/img/x.webp?w=480 480w, /img/x.webp?w=960 960w" sizes="(max-width: 720px) 100vw, 720px" />
  <img
    src="/img/x.jpg?w=720"
    width="1440" height="810"
    style="background-image: url('data:image/svg+xml;...')"
    loading="lazy"
    fetchpriority="auto"
    alt="..."
  />
</picture>
```

```ts
function blurDataUrl(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='rgb(${r},${g},${b})'/></svg>`;
}
```

### 延伸
- AVIF 体积小但编码慢，CDN 端按需生成更合适，源站直接存比较费 CPU
- 真正提升 LCP 的常常不是图片优化，而是 HTML 流式渲染让图片更早可发现

## core-web-vitals-explain
title: Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化
difficulty: 进阶
tags: [Web Vitals, 性能]

### 一句话
LCP（最大内容绘制 ≤2.5s）= 首屏多快；INP（交互到绘制 ≤200ms）= 操作多跟手；CLS（累计布局偏移 ≤0.1）= 页面多稳定。Google 用这三个指标排序网页体验。

### 题目
请解释 LCP / INP / CLS 各自衡量什么、推荐阈值，以及典型优化手段。

### 答案要点
- **LCP**：首屏最大元素的呈现时间。优化：服务端响应快（TTFB）、压缩图片 / 用 AVIF/WebP、首屏关键资源 preload、避免 render-blocking 的 CSS/JS、字体 `font-display: swap`
- **INP**：用户交互到下一帧绘制的耗时（取一段时间内的 P98）。优化：减少长任务（拆分 + scheduler.yield）、`startTransition` / `useDeferredValue` 把昂贵渲染降级、事件处理器中避免大计算
- **CLS**：可见元素位置突变的累积分数。优化：`<img>` 始终设置宽高 / aspect-ratio、不在已有内容上方插入广告、`min-height` 占位、字体回退尺寸匹配（`size-adjust`）
- **TTFB**（不在 CWV 但相关）：边缘 CDN、HTTP/3、103 Early Hints
- 监控：Lighthouse / PageSpeed Insights / `web-vitals` 库 + 上报 RUM

### 代码示例
```js
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

onLCP(({ name, value, attribution }) => {
  navigator.sendBeacon('/rum', JSON.stringify({
    name, value,
    element: attribution.element,
    url: attribution.url,
  }));
});
onINP(console.log);
onCLS(console.log);
```

### 延伸
- 2024 年 INP 取代了 FID，更能反映真实交互卡顿
- 移动端弱网场景下 LCP 优化空间更大
- 业务侧多关注首屏关键路径，工程侧多关注 Bundle / CDN

## long-task-scheduling
title: 长任务（Long Task）怎么定位与拆分
difficulty: 进阶
tags: [性能, 调度]

### 一句话
浏览器主线程一旦执行单段超过 50ms 的任务，就会让用户感觉卡。解决思路是"把大任务拆小 + 让出主线程"——`requestIdleCallback`、`scheduler.yield()`、Web Worker。

### 题目
什么是 Long Task？怎么发现、怎么拆？

### 答案要点
- Long Task 定义：浏览器主线程任务执行时间 > 50ms
- 发现：`PerformanceObserver({ entryTypes: ['longtask'] })`、Performance 面板的红色三角
- 拆分思路：
  - 计算密集型任务搬到 Web Worker
  - 大列表用虚拟滚动
  - 批处理用 `requestAnimationFrame` 切帧、`requestIdleCallback` 闲时执行
  - React `startTransition` / `useDeferredValue` 把"次要更新"降级
  - 新 API `scheduler.yield()`（async 函数里直接 await）让浏览器有机会响应输入

### 代码示例
```js
const po = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    console.warn('Long task:', e.duration, 'ms', e);
  }
});
po.observe({ entryTypes: ['longtask'] });

async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    handle(items[i]);
    if (i % 100 === 0 && 'scheduler' in window && scheduler.yield) {
      await scheduler.yield();
    }
  }
}
```

### 延伸
- React 19 的 React Compiler 自动减少不必要 re-render，对 INP 友好
- Worker 通信开销不可忽略，复杂数据用 SharedArrayBuffer 或转 transferable
- 别为了"拆分"而拆分，正常一两次 80ms 任务不是问题，关键是用户操作后那一次

