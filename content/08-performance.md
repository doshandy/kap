---
id: 08-performance
title: 性能优化
order: 8
icon: ⚡
description: Core Web Vitals、首屏与运行时优化、资源治理、监控与性能预算。
---

## methodology

title: 性能优化方法论：先度量，再定位，再治理
followups: [methodology-followup-1]
difficulty: 基础
tags: [方法论, 指标]

### 一句话

先明确目标：提升首屏、交互响应、稳定性还是成本；先度量再优化：RUM、Lighthouse、Performance 面板、业务埋点；找瓶颈：网络、脚本、渲染、图片、接口、缓存、第三方脚本。

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
  navigator.sendBeacon(
    '/api/rum',
    JSON.stringify({
      name,
      value,
      id,
      page: location.pathname,
      ua: navigator.userAgent,
      nt: (navigator as any).connection?.effectiveType,
      ts: Date.now(),
    }),
  );
}

onLCP((m) => reportMetric('LCP', m.value, m.id));
onINP((m) => reportMetric('INP', m.value, m.id));
onCLS((m) => reportMetric('CLS', m.value, m.id));
onFCP((m) => reportMetric('FCP', m.value, m.id));
onTTFB((m) => reportMetric('TTFB', m.value, m.id));

// 自定义业务指标：列表渲染耗时
performance.mark('list-render-start');
renderList(data);
performance.mark('list-render-end');
performance.measure('list-render', 'list-render-start', 'list-render-end');
const m = performance.getEntriesByName('list-render')[0];
reportMetric('list-render', m.duration, '');
```

### 追问

- 你会先看哪些指标来判断「性能优化方法论：先度量，再定位，再治理」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「性能优化方法论：先度量，再定位，再治理」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 方法论、指标，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 没有指标的优化很容易沦为"玄学调参"
- 性能是系统问题，不只是前端包体问题

## core-web-vitals

title: LCP、INP、CLS 如何理解与治理
followups: [core-web-vitals-followup-1, core-web-vitals-followup-2, core-web-vitals-followup-3]
links: [05-browser/render-pipeline, 16-observability/rum-web-vitals, core-web-vitals-explain]
difficulty: 进阶
tags: [CWV, WebVitals]

### 一句话

LCP 衡量主要内容出现速度，重点看首屏 HTML、关键资源、服务端响应、首图/首屏块渲染；INP 衡量交互到下一帧视觉反馈的延迟，重点看长任务、主线程阻塞、重计算；CLS 衡量布局稳定性，重点防止图片/广告/异步内容无尺寸占位。

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
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long task:', entry.duration, 'ms', entry);
      reportLongTask(entry);
    }
  }
}).observe({ type: 'longtask', buffered: true });

// 监听 LCP 元素：找到首屏关键内容
new PerformanceObserver((list) => {
  const last = list.getEntries().at(-1) as any;
  console.log('LCP element:', last.element, 'time:', last.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// 监听布局抖动（CLS 元凶）
new PerformanceObserver((list) => {
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

### 常见误区

- 只优化 LCP 元素本身（图片）忽略阻塞 CSS / JS
- INP 误以为是首屏指标——它衡量的是「整次会话中最慢的交互响应时间」
- CLS 出问题往往是图片 / 广告位没占位，不是字体闪屏

### 追问

- TBT（Total Blocking Time）和 INP 关系
- Web Vitals 的 P75 阈值各自是多少（LCP/INP/CLS）
- 怎么衡量「长任务」（Long Tasks API）

### 延伸

- INP 取代 FID，是因为它更能反映整个页面生命周期内真实交互体验
- 只盯实验室数据不够，必须结合真实用户监控

## rum-vs-lab

title: 实验室数据与真实用户数据为什么经常不一致
followups: [rum-vs-lab-followup-1]
links: [core-web-vitals, core-web-vitals-explain, image-modern-pipeline]
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals]

### 一句话

实验室数据来自受控环境，适合做回归对比和本地定位；真实用户数据反映设备、网络、地域、登录态、个性化、缓存命中等真实差异；LCP、INP 等指标在 field 和 lab 中可能明显不同。

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

### 追问

- 「实验室数据与真实用户数据为什么经常不一致」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「实验室数据与真实用户数据为什么经常不一致」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 RUM、Lighthouse、WebVitals，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Lab 更擅长"发现为什么慢"，Field 更擅长"判断到底有多少用户受影响"
- 只看单次 Lighthouse 分数，通常不足以指导长期性能治理

## initial-load

title: 首屏优化：SSR、SSG、ISR、路由分包、Critical CSS
followups: [initial-load-followup-1, initial-load-followup-2, initial-load-followup-3]
links: [03-vue/advanced-features, 03-vue/nuxt3-overview, 09-node/node-ssr]
difficulty: 进阶
tags: [首屏, SSR]

### 一句话

内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高；高频更新但允许增量生成时可考虑 ISR；纯 SPA 也能通过路由分包、预加载、关键 CSS、骨架屏优化首屏。

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
.hero {
  display: flex;
  min-height: 60vh;
}
</style>
```

```ts
// vite-plugin-prerender：构建期生成静态首屏
import prerender from 'vite-plugin-prerender';
export default {
  plugins: [
    prerender({
      routes: ['/', '/about', '/pricing'],
      postProcess: (r) => ({
        ...r,
        html: r.html.replace(/<script[^>]*>([\s\S]*?)<\/script>/g, ''),
      }),
    }),
  ],
};
```

### 常见误区

- 一上来就开 SSR——但只是营销页，CSR + 静态 HTML 就够
- 路由懒加载切得太碎，反而带来更多 HTTP 请求开销
- 为了「图片不抖」加 placeholder，但 placeholder 自己还得请求才看到

### 追问

- 关键 CSS 内联和 Above-the-fold 区别
- preload as=font 和 link rel=stylesheet 哪个先
- 304 和 200 (from cache) 的差别

### 延伸

- "上 SSR"不是银弹，水合错误、缓存、边缘部署都会带来新复杂度

## runtime-optimization

title: 运行时优化：虚拟列表、拆长任务、批量更新
followups: [runtime-optimization-followup-1]
links: [03-vue/vue-performance-practice]
difficulty: 进阶
tags: [运行时, 长任务]

### 一句话

减少一次渲染要处理的节点：分页、虚拟列表、按需展开、条件卸载不可见区域；拆分长任务：把大循环切片、移入 Worker、让出主线程；减少重复计算和重复渲染：缓存派生值、合并状态更新、避免无效 watcher。

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
    await new Promise((r) => setTimeout(r, 0));
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
    await new Promise((r) => setTimeout(r, 0));
    heavyWork();
  }
}

// 4. CPU 密集移到 Web Worker
const worker = new Worker(new URL('./crunch.worker.ts', import.meta.url), { type: 'module' });
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => render(e.data);
```

```ts
// 5. Vue 中：v-memo 跳过相同子树重渲染
// <li v-for="item in items" :key="item.id" v-memo="[item.id, item.selected]">
//   {{ item.label }}
// </li>
```

### 追问

- 「运行时优化：虚拟列表、拆长任务、批量更新」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「运行时优化：虚拟列表、拆长任务、批量更新」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 运行时、长任务，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 框架层的优化只是基础，真正的大头通常在业务代码和数据量
- 卡顿问题要看 flame chart，而不是猜

## network-resource-hints

title: preload、prefetch、modulepreload、preconnect 怎么用才不浪费
followups: [network-resource-hints-followup-1]
difficulty: 进阶
tags: [资源提示, 网络]

### 一句话

preload：当前导航很快就要用的关键资源；modulepreload：提前拉取模块依赖；prefetch：未来导航可能用到的低优先级资源，通常更适合同站后续页面资源。

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
<img src="hero.webp" fetchpriority="high" />
<!-- 首屏主图 -->
<img src="thumb.webp" fetchpriority="low" loading="lazy" />
<!-- 列表缩略图 -->
```

### 追问

- 「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 资源提示、网络，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 提示不是越多越好，关键在"优先级正确"
- 模块脚本优先考虑 `modulepreload`；图片等资源若需要更细粒度优先级，还可以结合 `fetchpriority`

## image-font-bundle

title: 图片、字体、JS 包体是最常见的三类资源瓶颈
followups: [image-font-bundle-followup-1]
difficulty: 基础
tags: [图片, 字体, 包体]

### 一句话

图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF；字体：子集化、font-display: swap、减少变体数量；JS：路由分包、按需引入、删除无用依赖、分析第三方包体积。

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
    width="1200"
    height="600"
    alt="..."
  />
</picture>
```

```css
/* 字体优化 */
@font-face {
  font-family: 'Main';
  src: url('/fonts/main-subset.woff2') format('woff2');
  font-display: swap; /* 字体加载时显示降级字体 */
  unicode-range: U+0020-007F, U+4E00-9FFF; /* 子集化：仅常用字符 */
}
```

```ts
// 包体分析与按需引入
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';
export default {
  plugins: [visualizer({ open: true, gzipSize: true })],
};

// ❌ 全量引入
import _ from 'lodash';
// ✅ 按需引入（配合 unplugin-auto-import 更优）
import debounce from 'lodash/debounce';
// ✅ 或换成 lodash-es + Tree Shaking
import { debounce } from 'lodash-es';
```

### 追问

- 「图片、字体、JS 包体是最常见的三类资源瓶颈」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「图片、字体、JS 包体是最常见的三类资源瓶颈」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 图片、字体、包体，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 很多页面"看起来像 JS 慢"，其实是大图和 Web 字体拖慢了可见内容

## monitoring-budget

title: 性能预算与回归治理
followups: [monitoring-budget-followup-1]
difficulty: 进阶
tags: [预算, 监控]

### 一句话

建立性能预算：首屏 JS、图片体积、LCP/INP/CLS 阈值；在 CI 中接入 Lighthouse CI、bundle analyzer、包体阈值检查；线上持续收集 Web Vitals 和长任务数据，按页面、地区、设备分桶看趋势。

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

### 追问

- 你会先看哪些指标来判断「性能预算与回归治理」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「性能预算与回归治理」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 预算、监控，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 性能预算不是为了挡需求，而是让团队知道"每次新增成本是多少"
- 预算要可解释、可协商，而不是一刀切

## inp-deep

title: INP 取代 FID 后，前端要怎么优化交互响应
followups: [inp-deep-followup-1]
links: [core-web-vitals, core-web-vitals-explain, image-modern-pipeline]
difficulty: 资深
tags: [INP, 交互]

### 一句话

INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98；FID 只看首次输入，INP 看所有交互，是更严格的指标。

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
onINP((m) =>
  navigator.sendBeacon('/beacon', JSON.stringify({ name: m.name, value: m.value, id: m.id })),
);

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

### 追问

- 「INP 取代 FID 后，前端要怎么优化交互响应」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「INP 取代 FID 后，前端要怎么优化交互响应」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 INP、交互，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React 18 的 `useTransition`、Vue 的 Suspense + defer、Solid 的细粒度更新都直接帮助 INP
- 长任务（>50ms）治理是 INP 优化的根，老老实实拆 long task 收益最大

## image-modern-pipeline

title: 现代图片处理流水线（AVIF / WebP / responsive / blur-up）
followups: [image-modern-pipeline-followup-1]
links: [core-web-vitals, core-web-vitals-explain, inp-deep]
difficulty: 进阶
tags: [图片, LCP]

### 一句话

上传：原图存对象存储，不要直接服务客户端；处理：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）；命名：/img/{id}/{w}.{format}，方便缓存和回滚。

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
  <source
    type="image/avif"
    srcset="/img/x.avif?w=480 480w, /img/x.avif?w=960 960w"
    sizes="(max-width: 720px) 100vw, 720px"
  />
  <source
    type="image/webp"
    srcset="/img/x.webp?w=480 480w, /img/x.webp?w=960 960w"
    sizes="(max-width: 720px) 100vw, 720px"
  />
  <img
    src="/img/x.jpg?w=720"
    width="1440"
    height="810"
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

### 追问

- 你会先看哪些指标来判断「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 图片、LCP，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- AVIF 体积小但编码慢，CDN 端按需生成更合适，源站直接存比较费 CPU
- 真正提升 LCP 的常常不是图片优化，而是 HTML 流式渲染让图片更早可发现

## core-web-vitals-explain

title: Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化
followups: [core-web-vitals-explain-followup-1]
links: [core-web-vitals, image-modern-pipeline, inp-deep]
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
  navigator.sendBeacon(
    '/rum',
    JSON.stringify({
      name,
      value,
      element: attribution.element,
      url: attribution.url,
    }),
  );
});
onINP(console.log);
onCLS(console.log);
```

### 追问

- 你会先看哪些指标来判断「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Web Vitals、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 2024 年 INP 取代了 FID，更能反映真实交互卡顿
- 移动端弱网场景下 LCP 优化空间更大
- 业务侧多关注首屏关键路径，工程侧多关注 Bundle / CDN

## long-task-scheduling

title: 长任务（Long Task）怎么定位与拆分
followups: [long-task-scheduling-followup-1]
links: [16-observability/tbt-and-long-task-collection, core-web-vitals, core-web-vitals-explain]
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

### 追问

- 你会先看哪些指标来判断「长任务（Long Task）怎么定位与拆分」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「长任务（Long Task）怎么定位与拆分」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 性能、调度，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React 19 的 React Compiler 自动减少不必要 re-render，对 INP 友好
- Worker 通信开销不可忽略，复杂数据用 SharedArrayBuffer 或转 transferable
- 别为了"拆分"而拆分，正常一两次 80ms 任务不是问题，关键是用户操作后那一次

## bundle-split-strategy

title: bundle 拆分与按需加载策略
followups: [bundle-split-strategy-followup-1]
links: [17-build-publish/bundle-optimization-tactics]
difficulty: 进阶
tags: [打包, 性能]

### 一句话

首屏只加载"首屏要用的代码"——路由级懒加载 + 第三方库分 chunk + 首屏关键 JS 内联，非首屏走动态 import。

### 题目

什么样的拆包策略能让首屏 JS 最小？常见的反模式有哪些？

### 答案要点

- **路由级 code splitting**：`() => import('./pages/Settings.vue')`
- **vendor 拆分**：把不常变的第三方库（vue / react / lodash）单独打成 chunk，长效缓存
- **预加载提示**：路由切换前 `<link rel="modulepreload">` 提前下载
- **核心库内联**：极小关键 CSS / runtime 内联到 HTML 减少瀑布
- **避免 barrel exports 副作用**：`import { x } from 'lib'` 看似按需，但 lib/index 把所有都 re-export 时会拖整个库进来——确保库标了 `sideEffects: false`
- **CDN externals**：vue/echarts 这种大库可放 CDN（注意配套 SRI 与缓存策略）
- **反模式**：
  - 首屏 import 了路由懒组件 → 拆分白做
  - moment.js 默认 import 全部 locales（用 dayjs / date-fns 替代）
  - polyfill 全量打包（用 `useBuiltIns: 'usage'` 按需）

### 代码示例

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'echarts';
            if (id.includes('lodash')) return 'lodash';
            return 'vendor';
          }
        },
      },
    },
  },
});
```

```html
<link rel="modulepreload" href="/assets/Settings-xyz.js" />
```

### 追问

- 你会先看哪些指标来判断「bundle 拆分与按需加载策略」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「bundle 拆分与按需加载策略」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 打包、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Webpack：`splitChunks` + `cacheGroups` 自定义；Vite：`manualChunks` 函数
- 监控 bundle 体积：rollup-plugin-visualizer / webpack-bundle-analyzer，CI 加 size-limit 卡阈值
- 加载分析用 Chrome Coverage 面板（看 JS 真实使用率）

## memory-leak-frontend

title: 怎么排查前端内存泄漏？
followups: [memory-leak-frontend-followup-1]
difficulty: 资深
tags: [性能, 内存, 高频]

### 一句话

**复现路径 → 三次 Heap snapshot 对比 → 看 detached DOM / 闭包引用** 是经典三步法。常见根因：定时器没清、事件监听器没移除、闭包持引用、observer 没 disconnect、被全局变量持有。

### 题目

SPA 应用打开几小时后明显变慢，怀疑内存泄漏。从工具到方法说说怎么排查、怎么修。

### 答案要点

- **判断是否真的泄漏**
  - DevTools → Performance → Memory 录制：长时间使用后内存曲线持续上升不回落 = 泄漏
  - performance.memory.usedJSHeapSize（仅 Chrome）按时序采样上报
  - GC 后内存仍不降才算真泄漏（短时升降是正常）
- **三次 Heap Snapshot 对比法**
  - DevTools → Memory → Heap snapshot
  - 步骤：
    1. 进入页面 → 拍 snapshot 1
    2. 执行可疑操作（开关弹窗 N 次、路由切换 N 次）
    3. 强制 GC → 拍 snapshot 2
    4. 再操作一次 → GC → snapshot 3
  - 在 snapshot 3 选 "Comparison" → 看 #New 始终增加的对象
  - Retainer 链找到根引用源
- **常见泄漏类型**
  - **detached DOM**：组件卸载后 DOM 仍被 JS 引用（如某全局 Map 缓存了 dom）
    - 在 Heap 里搜 `Detached`
  - **未清的定时器**：setInterval 持有 closure，永不停
  - **未移除的 listener**：addEventListener 没 removeEventListener
  - **未 disconnect 的 observer**：Resize/Mutation/Intersection Observer
  - **闭包陷阱**：内部函数引用大对象，外部回调持有内部函数
  - **全局变量**：把数据存到 window.xxx 忘了删
  - **WeakMap/WeakRef 该用没用**：缓存用 Map 强引用导致永驻
- **框架特定**
  - Vue：组件 onUnmounted 里清掉一切
  - React：useEffect 返回 cleanup 函数
  - watch / $on 等响应式订阅，组件销毁时自动 stop（Vue 3 用 `effectScope`）
- **典型 case**
  - 路由切换前的 chart 实例没 dispose → echarts 持有 canvas + 大量数据
  - 全局 EventBus.on 没 off → 老组件继续接消息
  - WebSocket onmessage 闭包持组件 state
  - debounce / throttle 返回的函数被某全局引用
- **修复后验证**
  - 同样路径再跑一次三次 snapshot，确认对象数稳定

### 代码示例

```ts
import { onBeforeUnmount, onMounted } from 'vue';

let timer: number;
let observer: ResizeObserver;
const onResize = () => doSomething();

onMounted(() => {
  timer = window.setInterval(tick, 1000);
  window.addEventListener('resize', onResize);
  observer = new ResizeObserver(onResize);
  observer.observe(el.value!);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener('resize', onResize);
  observer?.disconnect();
});

const cache = new WeakMap<object, Result>();
```

```ts
import { onBeforeUnmount, effectScope } from 'vue';
const scope = effectScope();
scope.run(() => {
  watch(...);
  watchEffect(...);
});
onBeforeUnmount(() => scope.stop());
```

### 追问

- 你会先看哪些指标来判断「怎么排查前端内存泄漏」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「怎么排查前端内存泄漏？」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 性能、内存、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- WeakRef + FinalizationRegistry 适合做"对象失效时清理"，但浏览器 GC 时机不可控
- Chrome `Performance Monitor` 实时看 JS heap / DOM nodes / listeners 数量
- 大型应用周期性自动拍 snapshot 上报供分析（仅内部用）

## methodology-followup-1

title: 追问：你会先看哪些指标来判断「性能优化方法论：先度量，再定位，再治理」是不是当前性能瓶颈
difficulty: 基础
tags: [方法论, 指标, 追问]
parent: methodology

### 题目

如果面试官追问：你会先看哪些指标来判断「性能优化方法论：先度量，再定位，再治理」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「性能优化方法论：先度量，再定位，再治理」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## speculation-rules-prerender

title: Speculation Rules API：浏览器级 prerender 怎么用才不反噬
difficulty: 资深
tags: [SpeculationRules, prerender, 性能]

### 一句话

Speculation Rules 用 JSON 规则告诉浏览器哪些链接值得 prefetch 或 prerender，命中时能接近瞬开；风险是误预测浪费资源、提前请求带来副作用，以及缓存和登录态边界处理不当。

### 题目

Speculation Rules API 和传统 `preload`、`prefetch` 有什么不同？在 SPA 或 MPA 中应该如何安全地使用浏览器级 prerender？

### 答案要点

- `preload` 面向当前导航关键资源，`prefetch` 多用于未来资源下载；Speculation Rules 可以声明未来页面导航，让浏览器在合适时机预取甚至在隔离环境中预渲染整页。
- 适合高概率、低副作用、资源稳定的跳转，例如首页到详情页、搜索结果到商品页、文档目录到下一篇；不适合支付、提交、强鉴权或会改变服务端状态的路径。
- 规则要保守：可以按 URL pattern、链接可见性、鼠标悬停、路由预测模型分层启用，并限制同一时间预渲染数量。
- 页面必须处理 prerender 生命周期：避免统计重复上报、避免提前播放媒体、避免提前申请权限，等 `prerendering` 激活后再执行用户可见副作用。
- 验证时不要只看实验室分数，要看真实用户的 navigation activation 命中率、额外流量、失败率、LCP/INP 改善和后端 QPS 变化。

### 常见误区

- 把所有链接都 prerender，低端机和弱网用户会被额外流量拖慢。
- 预渲染页面里提前打埋点或触发写接口，造成重复曝光、库存锁定或风控误判。
- 没有按登录态、地域、AB 实验分流规则，导致预渲染内容和真正导航时的内容不一致。
- 只在 Chrome 验证，没有给不支持的浏览器保留普通导航路径。

### 追问

- prerender 和 prefetch 分别适合哪些导航场景？
- 如何避免 prerender 造成统计重复和服务端副作用？
- 你会如何评估预测命中率和额外资源消耗是否值得？

## core-web-vitals-followup-1

title: 追问：你会先看哪些指标来判断「LCP、INP、CLS 如何理解与治理」是不是当前性能瓶颈
difficulty: 进阶
tags: [CWV, WebVitals, 追问]
parent: core-web-vitals

### 题目

如果面试官追问：你会先看哪些指标来判断「LCP、INP、CLS 如何理解与治理」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「LCP、INP、CLS 如何理解与治理」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## core-web-vitals-followup-2

title: 追问：优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数
difficulty: 进阶
tags: [CWV, WebVitals, 追问]
parent: core-web-vitals

### 题目

如果面试官追问：优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「LCP、INP、CLS 如何理解与治理」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## core-web-vitals-followup-3

title: 追问：如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做
difficulty: 进阶
tags: [CWV, WebVitals, 追问]
parent: core-web-vitals

### 题目

如果面试官追问：如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「LCP、INP、CLS 如何理解与治理」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## rum-vs-lab-followup-1

title: 追问：「实验室数据与真实用户数据为什么经常不一致」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals, 追问]
parent: rum-vs-lab

### 题目

如果面试官追问：「实验室数据与真实用户数据为什么经常不一致」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「实验室数据与真实用户数据为什么经常不一致」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「实验室数据来自受控环境，适合做回归对比和本地定位；真实用户数据反映设备、网络、地域、登录态、个性化、缓存命中等真实差异」要进一步补到边界条件里，而不是只复述结论。

## initial-load-followup-1

title: 追问：你会先看哪些指标来判断「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」是不是当前性能瓶颈
difficulty: 进阶
tags: [首屏, SSR, 追问]
parent: initial-load

### 题目

如果面试官追问：你会先看哪些指标来判断「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## initial-load-followup-2

title: 追问：优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数
difficulty: 进阶
tags: [首屏, SSR, 追问]
parent: initial-load

### 题目

如果面试官追问：优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## initial-load-followup-3

title: 追问：如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做
difficulty: 进阶
tags: [首屏, SSR, 追问]
parent: initial-load

### 题目

如果面试官追问：如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## runtime-optimization-followup-1

title: 追问：「运行时优化：虚拟列表、拆长任务、批量更新」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [运行时, 长任务, 追问]
parent: runtime-optimization

### 题目

如果面试官追问：「运行时优化：虚拟列表、拆长任务、批量更新」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「运行时优化：虚拟列表、拆长任务、批量更新」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「减少一次渲染要处理的节点：分页、虚拟列表、按需展开、条件卸载不可见区域」要进一步补到边界条件里，而不是只复述结论。

## network-resource-hints-followup-1

title: 追问：「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」在弱网、代理、断连或服务端限流时会出现哪些边界问题
difficulty: 进阶
tags: [资源提示, 网络, 追问]
parent: network-resource-hints

### 题目

如果面试官追问：「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」在弱网、代理、断连或服务端限流时会出现哪些边界问题？

### 答案要点

#### 核心回答

- 先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

## image-font-bundle-followup-1

title: 追问：「图片、字体、JS 包体是最常见的三类资源瓶颈」有哪些容易漏掉的边界输入和复杂度陷阱
difficulty: 基础
tags: [图片, 字体, 包体, 追问]
parent: image-font-bundle

### 题目

如果面试官追问：「图片、字体、JS 包体是最常见的三类资源瓶颈」有哪些容易漏掉的边界输入和复杂度陷阱？

### 答案要点

#### 核心回答

- 先界定「图片、字体、JS 包体是最常见的三类资源瓶颈」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF」要进一步补到边界条件里，而不是只复述结论。

## monitoring-budget-followup-1

title: 追问：你会先看哪些指标来判断「性能预算与回归治理」是不是当前性能瓶颈
difficulty: 进阶
tags: [预算, 监控, 追问]
parent: monitoring-budget

### 题目

如果面试官追问：你会先看哪些指标来判断「性能预算与回归治理」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「性能预算与回归治理」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## inp-deep-followup-1

title: 追问：「INP 取代 FID 后，前端要怎么优化交互响应」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [INP, 交互, 追问]
parent: inp-deep

### 题目

如果面试官追问：「INP 取代 FID 后，前端要怎么优化交互响应」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「INP 取代 FID 后，前端要怎么优化交互响应」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98」要进一步补到边界条件里，而不是只复述结论。

## image-modern-pipeline-followup-1

title: 追问：你会先看哪些指标来判断「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」是不是当前性能瓶颈
difficulty: 进阶
tags: [图片, LCP, 追问]
parent: image-modern-pipeline

### 题目

如果面试官追问：你会先看哪些指标来判断「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## core-web-vitals-explain-followup-1

title: 追问：你会先看哪些指标来判断「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」是不是当前性能瓶颈
difficulty: 进阶
tags: [Web Vitals, 性能, 追问]
parent: core-web-vitals-explain

### 题目

如果面试官追问：你会先看哪些指标来判断「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## long-task-scheduling-followup-1

title: 追问：你会先看哪些指标来判断「长任务（Long Task）怎么定位与拆分」是不是当前性能瓶颈
difficulty: 进阶
tags: [性能, 调度, 追问]
parent: long-task-scheduling

### 题目

如果面试官追问：你会先看哪些指标来判断「长任务（Long Task）怎么定位与拆分」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「长任务（Long Task）怎么定位与拆分」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## bundle-split-strategy-followup-1

title: 追问：你会先看哪些指标来判断「bundle 拆分与按需加载策略」是不是当前性能瓶颈
difficulty: 进阶
tags: [打包, 性能, 追问]
parent: bundle-split-strategy

### 题目

如果面试官追问：你会先看哪些指标来判断「bundle 拆分与按需加载策略」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「bundle 拆分与按需加载策略」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## memory-leak-frontend-followup-1

title: 追问：你会先看哪些指标来判断「怎么排查前端内存泄漏」是不是当前性能瓶颈
difficulty: 资深
tags: [性能, 内存, 高频, 追问]
parent: memory-leak-frontend

### 题目

如果面试官追问：你会先看哪些指标来判断「怎么排查前端内存泄漏」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「怎么排查前端内存泄漏」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## loaf-rendering-attribution

title: Long Animation Frames API 如何定位 INP 卡顿根因
difficulty: 资深
tags: [INP, LoAF, PerformanceObserver, RUM]
links: [inp-deep, long-task-scheduling, 16-observability/tbt-and-long-task-collection]

### 一句话

Long Task 只能告诉你主线程“有一段任务超过 50ms”，LoAF 更关注一帧为什么变长：脚本执行、样式布局、渲染提交和相关脚本归因，适合排查 INP 卡顿背后的真实阶段。

### 题目

INP 变差时，为什么只看 Long Task 还不够？Long Animation Frames API 能补哪些排障信息，线上怎么采？

### 答案要点

- INP 关注用户交互到下一次可绘制反馈的延迟，卡顿可能来自事件处理、同步布局、样式计算、渲染提交、第三方脚本或同帧里排队的任务。
- Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 `blockingDuration`、脚本来源、样式布局耗时等信息串到同一帧。
- RUM 采集时应把 LoAF 与 INP event、路由、设备档位、页面状态、是否后台 tab 关联，避免只按平均值判断。
- 线上要做采样和脱敏：脚本 URL 可以做域名或 chunk 名归因，不要上报完整用户输入、DOM 文本或敏感路径。
- 优化动作要回到根因：拆事件处理、延迟非关键 JS、减少强制同步布局、把计算放 Worker、治理第三方脚本。

### 代码示例

```ts
if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceLongAnimationFrameTiming[]) {
      reportPerf('loaf', {
        duration: entry.duration,
        blockingDuration: entry.blockingDuration,
        scripts: entry.scripts?.map((script) => ({
          sourceURL: new URL(script.sourceURL || location.href).pathname,
          duration: script.duration,
          invoker: script.invoker,
        })),
      });
    }
  });

  observer.observe({ type: 'long-animation-frame', buffered: true });
}
```

### 常见误区

- 看到 INP 差就只拆包；很多 INP 问题来自交互后的同步计算、布局抖动或第三方脚本。
- 只看 Long Task 数量，不把卡顿帧和具体交互事件、设备档位、页面状态关联。
- 线上无采样地上报完整脚本和页面信息，带来性能成本和隐私风险。

### 追问

- LoAF、Long Task、Event Timing 在排查 INP 时分别回答什么问题？
- 如果 LoAF 指向第三方脚本，你会如何治理而不影响业务投放？
- 为什么实验室里 INP 正常，真实用户仍然可能卡？

## third-party-script-governance

title: 第三方脚本如何治理：性能、隐私、安全与降级
difficulty: 资深
tags: [第三方脚本, 性能, 安全, RUM]
links: [inp-deep, loaf-rendering-attribution, 16-observability/privacy-compliance]

### 一句话

第三方脚本不是“加一段 SDK”这么简单，它会影响 LCP/INP、主线程、网络优先级、隐私合规、错误率和安全边界；治理重点是分级加载、权限收敛、可观测、可关闭和供应商 SLA。

### 题目

埋点、广告、客服、A/B、风控、热图这些第三方脚本经常拖慢页面。你会如何从性能、隐私、安全和可用性角度治理？

### 答案要点

- 先分级：核心业务必需、收入相关、分析监控、体验增强、实验性脚本；不同级别有不同加载时机和失败策略。
- 加载时机要延后：首屏关键路径外的脚本放到交互后、空闲时、可见时或用户同意后加载，不要阻塞 LCP 资源。
- 性能监控要能归因：记录第三方域名、脚本耗时、Long Task/LoAF attribution、错误率、加载失败率、对 INP/LCP 的影响。
- 隐私合规要前置：用户同意前不加载营销/追踪脚本；采集字段最小化，避免把 PII、搜索词、输入内容直接发给供应商。
- 安全要限制能力：CSP、SRI、域名 allowlist、sandbox iframe、postMessage 校验、供应商变更审计。
- 必须可降级：供应商超时、脚本报错、接口限流时不影响主流程；最好有 feature flag 可远程关闭。
- 组织上要有准入流程：谁申请、为什么需要、采什么数据、加载在哪些页面、如何监控、如何下线。

### 代码示例

```ts
function loadThirdPartyScript(src: string, timeoutMs = 3000) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error(`third-party timeout: ${src}`));
    }, timeoutMs);

    script.async = true;
    script.src = src;
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`third-party failed: ${src}`));
    };
    document.head.appendChild(script);
  });
}

const runWhenIdle =
  'requestIdleCallback' in window
    ? window.requestIdleCallback.bind(window)
    : (callback: IdleRequestCallback) =>
        window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 1);

runWhenIdle(() => {
  loadThirdPartyScript('https://vendor.example.com/sdk.js').catch((error) => {
    reportMetric('third_party_load_failed', {
      vendor: 'vendor.example.com',
      message: error.message,
    });
  });
});
```

### 常见误区

- 只看自家 bundle 大小，不看第三方脚本带来的 Long Task、网络竞争和错误。
- 所有页面都加载同一批 SDK，哪怕只有少数页面需要。
- 用户未同意就加载营销脚本，后续再隐藏 UI，合规上已经晚了。
- 没有远程开关，供应商事故时只能发版止血。

### 追问

- 如何证明某个第三方脚本对 INP 或 LCP 有显著影响？
- 如果业务强依赖客服/风控脚本，但它经常超时，你会怎么降级？
- CSP 和 SRI 在第三方脚本治理里分别解决什么问题？

### 延伸

- Chrome 的 LoAF attribution 能帮助定位长帧里具体脚本来源，但线上仍需要采样和脱敏。
- 大公司通常会有 third-party inventory，把每个脚本的负责人、页面范围、数据字段和下线日期登记清楚。

## bfcache-page-lifecycle

title: bfcache 与 Page Lifecycle：返回秒开为什么会失效
difficulty: 资深
tags: [bfcache, PageLifecycle, 性能]
links: [core-web-vitals, 05-browser/navigation-api-app-history, 06-network/bfcache-frontend]

### 一句话

bfcache 让用户返回上一页时直接恢复内存快照，体验接近秒开；但 `unload` 监听、未关闭资源、跨页面状态副作用、缓存头和浏览器策略都可能让页面失去 bfcache 资格。

### 题目

为什么浏览器返回上一页有时是秒开，有时却重新加载？bfcache 和 Page Lifecycle 如何影响性能、埋点、WebSocket 和页面状态恢复？

### 答案要点

- bfcache 是 back/forward cache，浏览器把整个页面冻结在内存中，用户后退/前进时恢复 DOM、JS heap、滚动位置和表单状态。
- 是否命中可通过 `pageshow` 事件的 `event.persisted` 判断；Performance Navigation Timing 也能辅助识别。
- 常见失效原因：使用 `unload`、存在不安全的页面生命周期副作用、部分浏览器策略限制、Cache-Control 特殊配置、打开中的资源未正确处理。
- 页面进入冻结/隐藏时要暂停轮询、动画、定时器、WebSocket 心跳；恢复时再重新校验数据和连接状态。
- 埋点要避免重复：`load` 不会在 bfcache 恢复时重新触发，但 `pageshow` 会触发；PV、曝光、停留时长都要区分首次加载和恢复。
- 数据新鲜度不能只依赖内存快照：恢复后可轻量 revalidate 关键数据，但不要破坏用户返回时的滚动和输入状态。
- 性能优化上，提升 bfcache 命中率往往比重新优化一次首屏更划算，尤其是列表页 -> 详情页 -> 返回列表页。

### 代码示例

```ts
window.addEventListener('pagehide', (event) => {
  pausePolling();
  pauseAnimations();
  if (event.persisted) {
    reportMetric('page_enter_bfcache');
  }
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    reportMetric('page_restore_from_bfcache');
    revalidateVisibleData();
    resumeAnimations();
  } else {
    reportMetric('page_normal_load');
  }
});

// 仅在确有未保存草稿时动态注册；保存后要 remove，避免影响 bfcache。
let beforeUnloadRegistered = false;

function onBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
}

watchDraftDirty((dirty) => {
  if (dirty && !beforeUnloadRegistered) {
    window.addEventListener('beforeunload', onBeforeUnload);
    beforeUnloadRegistered = true;
  }
  if (!dirty && beforeUnloadRegistered) {
    window.removeEventListener('beforeunload', onBeforeUnload);
    beforeUnloadRegistered = false;
  }
});
```

### 常见误区

- 用 `unload` 做埋点或清理，结果页面无法进入 bfcache。
- 返回列表页后强制重新请求并滚到顶部，破坏用户刚才的位置和上下文。
- `pageshow` 恢复时重复发送 PV，导致数据虚高。
- 认为 bfcache 命中后数据一定新鲜，忽略库存、权限、消息状态等变化。

### 追问

- `load`、`pageshow`、`pagehide`、`visibilitychange` 各适合处理什么？
- 如何在命中 bfcache 的同时保证关键数据恢复后不过期？
- 列表页返回体验如何用 bfcache、滚动恢复和数据 revalidate 一起优化？

### 延伸

- Chrome DevTools 的 Application / Back-forward Cache 面板可以直接告诉你为什么页面没有进入 bfcache。
- 移动端用户频繁来回切页面，bfcache 对真实体验的价值往往高于一次性的首屏优化。
