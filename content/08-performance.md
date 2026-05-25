---
id: 08-performance
title: 性能优化
order: 8
icon: ⚡
description: Core Web Vitals、首屏与运行时优化、资源治理、监控与性能预算。
---

## methodology

title: 性能优化方法论：先度量，再定位，再治理
followups: [methodology-followup-1, methodology-followup-2, methodology-followup-3]
difficulty: 基础
tags: [方法论, 指标]

### 一句话

回答「性能优化方法论：先度量，再定位，再治理」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么性能优化不能靠“经验主义手改”？请给出一套可落地的方法论。

### 答案要点

- 先明确目标：提升首屏、交互响应、稳定性还是成本
- 先度量再优化：RUM、Lighthouse、Performance 面板、业务埋点
- 找瓶颈：网络、脚本、渲染、图片、接口、缓存、第三方脚本
- 优化后持续监控，防止回归

#### 工程化补充

- 场景前提：回答 性能优化方法论：先度量，再定位，再治理 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 性能优化方法论：先度量，再定位，再治理 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 CWV 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

解释 LCP、INP、CLS 各自衡量什么，以及最常见的优化抓手。

### 答案要点

- LCP 衡量主要内容出现速度，重点看首屏 HTML、关键资源、服务端响应、首图/首屏块渲染
- INP 衡量交互到下一帧视觉反馈的延迟，重点看长任务、主线程阻塞、重计算
- CLS 衡量布局稳定性，重点防止图片/广告/异步内容无尺寸占位
- Core Web Vitals 通常以页面访问样本的第 75 百分位来评估；常见“良好”阈值是 LCP <= 2.5s、INP <= 200ms、CLS <= 0.1

#### 工程化补充

- 场景前提：LCP、INP、CLS 如何理解与治理 只有在瓶颈被数据证实时才值得推进；先确认 CWV 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 LCP、INP、CLS 如何理解与治理 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [rum-vs-lab-followup-1, rum-vs-lab-followup-2, rum-vs-lab-followup-3]
links: [core-web-vitals, core-web-vitals-explain, image-modern-pipeline]
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals]

### 一句话

回答「实验室数据与真实用户数据为什么经常不一致」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么 Lighthouse 跑出来很好，线上用户却依然觉得慢？实验室数据和真实用户数据该怎么一起看？

### 答案要点

- 实验室数据来自受控环境，适合做回归对比和本地定位；真实用户数据反映设备、网络、地域、登录态、个性化、缓存命中等真实差异
- LCP、INP 等指标在 field 和 lab 中可能明显不同，例如线上会遇到重定向、冷缓存、Cookie 弹窗、A/B 实验脚本和第三方资源抖动
- 排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群
- 指标分析要分页面、设备、网络和国家地区分桶，否则平均值很容易掩盖真实瓶颈

#### 工程化补充

- 场景前提：先定义 实验室数据与真实用户数据为什么经常不一致 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 RUM 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 RUM 的可复现用例、线上监控指标和回退演练记录。

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

讲「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

如果首页很慢，你会怎样判断该上 SSR、SSG 还是继续优化纯 SPA？

### 答案要点

- 内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高
- 高频更新但允许增量生成时可考虑 ISR
- 纯 SPA 也能通过路由分包、预加载、关键 CSS、骨架屏优化首屏
- 是否引入 SSR 取决于业务目标、团队运维能力和数据获取复杂度

#### 工程化补充

- 场景前提：首屏优化：SSR、SSG、ISR、路由分包、Critical CSS 只有在瓶颈被数据证实时才值得推进；先确认 首屏 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 首屏优化：SSR、SSG、ISR、路由分包、Critical CSS 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [runtime-optimization-followup-1, runtime-optimization-followup-2, runtime-optimization-followup-3]
links: [03-vue/vue-performance-practice]
difficulty: 进阶
tags: [运行时, 长任务]

### 一句话

讲「运行时优化：虚拟列表、拆长任务、批量更新」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

用户操作时页面卡顿，前端最常见的运行时优化手段有哪些？

### 答案要点

- 减少一次渲染要处理的节点：分页、虚拟列表、按需展开、条件卸载不可见区域
- 拆分长任务：把大循环切片、移入 Worker、让出主线程
- 减少重复计算和重复渲染：缓存派生值、合并状态更新、避免无效 watcher
- 某些浏览器已提供 scheduler.postTask() 等调度能力，但它们并非所有环境都可用，落地时要准备降级路径

#### 工程化补充

- 场景前提：运行时优化：虚拟列表、拆长任务、批量更新 只有在瓶颈被数据证实时才值得推进；先确认 运行时 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 运行时优化：虚拟列表、拆长任务、批量更新 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [network-resource-hints-followup-1, network-resource-hints-followup-2, network-resource-hints-followup-3]
difficulty: 进阶
tags: [资源提示, 网络]

### 一句话

这题回答要覆盖 资源提示 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

说明几种常见 Resource Hints 的区别，并给出一个错误使用的例子。

### 答案要点

- preload：当前导航很快就要用的关键资源
- modulepreload：提前拉取模块依赖
- prefetch：未来导航可能用到的低优先级资源，通常更适合同站后续页面资源
- preconnect：提前建立连接；dns-prefetch 只做更轻量的 DNS 预热

#### 工程化补充

- 场景前提：先约定 资源提示 的超时、重试和幂等语义，再谈 preload、prefetch、modulepreload、preconnect 怎么用才不浪费 的实现细节。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

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
followups: [image-font-bundle-followup-1, image-font-bundle-followup-2, image-font-bundle-followup-3]
difficulty: 基础
tags: [图片, 字体, 包体]

### 一句话

讲「图片、字体、JS 包体是最常见的三类资源瓶颈」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

针对图片、字体、JS 包体，分别列出 2 到 3 个最高收益优化动作。

### 答案要点

- 图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF
- 字体：子集化、font-display: swap、减少变体数量
- JS：路由分包、按需引入、删除无用依赖、分析第三方包体积

#### 工程化补充

- 场景前提：图片、字体、JS 包体是最常见的三类资源瓶颈 只有在瓶颈被数据证实时才值得推进；先确认 图片 是否真是主耗时来源。
- 实施步骤：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 图片、字体、JS 包体是最常见的三类资源瓶颈 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [monitoring-budget-followup-1, monitoring-budget-followup-2, monitoring-budget-followup-3]
difficulty: 进阶
tags: [预算, 监控]

### 一句话

这题的高分关键是把 预算 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

如何防止性能优化做完后几周内又被新需求吃回去？

### 答案要点

- 建立性能预算：首屏 JS、图片体积、LCP/INP/CLS 阈值
- 在 CI 中接入 Lighthouse CI、bundle analyzer、包体阈值检查
- 线上持续收集 Web Vitals 和长任务数据，按页面、地区、设备分桶看趋势

#### 工程化补充

- 场景前提：性能预算与回归治理 只有在瓶颈被数据证实时才值得推进；先确认 预算 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 性能预算与回归治理 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [inp-deep-followup-1, inp-deep-followup-2, inp-deep-followup-3]
links: [core-web-vitals, core-web-vitals-explain, image-modern-pipeline]
difficulty: 资深
tags: [INP, 交互]

### 一句话

这题回答要覆盖 INP 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

2024 年起 INP 取代 FID 成为 Core Web Vitals 之一，它衡量的是什么？前端如何系统性优化？

### 答案要点

- INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98
- FID 只看首次输入，INP 看所有交互，是更严格的指标
- 优化路径：拆长任务、scheduler.yield() / requestIdleCallback、脏检查降级、避免大列表 sync render
- 输入处理：onInput 内只 setState，重计算放到 useTransition 或 requestIdleCallback

#### 工程化补充

- 场景前提：回答 INP 取代 FID 后，前端要怎么优化交互响应 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 INP 取代 FID 后，前端要怎么优化交互响应 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [image-modern-pipeline-followup-1, image-modern-pipeline-followup-2, image-modern-pipeline-followup-3]
links: [core-web-vitals, core-web-vitals-explain, inp-deep]
difficulty: 进阶
tags: [图片, LCP]

### 一句话

回答「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

做内容站的图片优化，从源图到客户端展示完整链路有哪些环节？

### 答案要点

- 上传：原图存对象存储，不要直接服务客户端
- 处理：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）
- 命名：/img/{id}/{w}.{format}，方便缓存和回滚
- 响应式： + srcset + sizes，让浏览器选最优

#### 工程化补充

- 场景前提：回答 现代图片处理流水线（AVIF / WebP / responsive / blur-up） 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 现代图片处理流水线（AVIF / WebP / responsive / blur-up） 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [core-web-vitals-explain-followup-1, core-web-vitals-explain-followup-2, core-web-vitals-explain-followup-3]
links: [core-web-vitals, image-modern-pipeline, inp-deep]
difficulty: 进阶
tags: [Web Vitals, 性能]

### 一句话

回答「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请解释 LCP / INP / CLS 各自衡量什么、推荐阈值，以及典型优化手段。

### 答案要点

- LCP：首屏最大元素的呈现时间。优化：服务端响应快（TTFB）、压缩图片 / 用 AVIF/WebP、首屏关键资源 preload、避免 render-blocking 的 CSS/JS、字体 font-display: swap
- INP：用户交互到下一帧绘制的耗时（取一段时间内的 P98）。优化：减少长任务（拆分 + scheduler.yield）、startTransition / useDeferredValue 把昂贵渲染降级、事件处理器中避免大计算
- CLS：可见元素位置突变的累积分数。优化： 始终设置宽高 / aspect-ratio、不在已有内容上方插入广告、min-height 占位、字体回退尺寸匹配（size-adjust）
- TTFB（不在 CWV 但相关）：边缘 CDN、HTTP/3、103 Early Hints

#### 工程化补充

- 场景前提：回答 Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [long-task-scheduling-followup-1, long-task-scheduling-followup-2, long-task-scheduling-followup-3]
links: [16-observability/tbt-and-long-task-collection, core-web-vitals, core-web-vitals-explain]
difficulty: 进阶
tags: [性能, 调度]

### 一句话

这题的高分关键是把 性能 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

什么是 Long Task？怎么发现、怎么拆？

### 答案要点

- Long Task 定义：浏览器主线程任务执行时间 > 50ms
- 发现：PerformanceObserver({ entryTypes: ['longtask'] })、Performance 面板的红色三角
- 计算密集型任务搬到 Web Worker
- 批处理用 requestAnimationFrame 切帧、requestIdleCallback 闲时执行

#### 工程化补充

- 场景前提：长任务（Long Task）怎么定位与拆分 只有在瓶颈被数据证实时才值得推进；先确认 性能 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 长任务（Long Task）怎么定位与拆分 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [bundle-split-strategy-followup-1, bundle-split-strategy-followup-2, bundle-split-strategy-followup-3]
links: [17-build-publish/bundle-optimization-tactics]
difficulty: 进阶
tags: [打包, 性能]

### 一句话

这题回答要覆盖 打包 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

什么样的拆包策略能让首屏 JS 最小？常见的反模式有哪些？

### 答案要点

- 路由级 code splitting：() => import('./pages/Settings.vue')
- vendor 拆分：把不常变的第三方库（vue / react / lodash）单独打成 chunk，长效缓存
- 预加载提示：路由切换前 提前下载
- 核心库内联：极小关键 CSS / runtime 内联到 HTML 减少瀑布

#### 工程化补充

- 场景前提：回答 bundle 拆分与按需加载策略 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 bundle 拆分与按需加载策略 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [memory-leak-frontend-followup-1, memory-leak-frontend-followup-2, memory-leak-frontend-followup-3]
difficulty: 资深
tags: [性能, 内存, 高频]

### 一句话

这题的高分关键是把 性能 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

SPA 应用打开几小时后明显变慢，怀疑内存泄漏。从工具到方法说说怎么排查、怎么修。

### 答案要点

- DevTools → Performance → Memory 录制：长时间使用后内存曲线持续上升不回落 = 泄漏
- performance.memory.usedJSHeapSize（仅 Chrome）按时序采样上报
- GC 后内存仍不降才算真泄漏（短时升降是正常）
- 三次 Heap Snapshot 对比法

#### 工程化补充

- 场景前提：怎么排查前端内存泄漏 只有在瓶颈被数据证实时才值得推进；先确认 性能 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 怎么排查前端内存泄漏 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

title: 追问：从工程落地角度看，你会先看哪些与 方法论 相关的指标来判断「性能优化方法论：先度量，再定位，再治理」是不是当前性能瓶颈
difficulty: 基础
tags: [方法论, 指标, 追问]
parent: methodology

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 方法论 相关的指标来判断「性能优化方法论：先度量，再定位，再治理」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 性能优化方法论 先度量 再定位 再治理 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 性能优化方法论 先度量 再定位 再治理 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 方法论：围绕「性能优化方法论：先度量，再定位，再治理」里的 方法论 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 指标：围绕「性能优化方法论：先度量，再定位，再治理」里的 指标 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「性能优化方法论：先度量，再定位，再治理」里，性能优化方法论 先度量 再定位 再治理 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：性能优化方法论 先度量 再定位 再治理 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## speculation-rules-prerender

title: Speculation Rules API：浏览器级 prerender 怎么用才不反噬
difficulty: 资深
tags: [SpeculationRules, prerender, 性能]
followups: [speculation-rules-prerender-followup-1, speculation-rules-prerender-followup-2, speculation-rules-prerender-followup-3]

### 一句话

这题回答要覆盖 prerender 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

Speculation Rules API 和传统 `preload`、`prefetch` 有什么不同？在 SPA 或 MPA 中应该如何安全地使用浏览器级 prerender？

### 答案要点

- preload 面向当前导航关键资源，prefetch 多用于未来资源下载；Speculation Rules 可以声明未来页面导航，让浏览器在合适时机预取甚至在隔离环境中预渲染整页。
- 适合高概率、低副作用、资源稳定的跳转，例如首页到详情页、搜索结果到商品页、文档目录到下一篇；不适合支付、提交、强鉴权或会改变服务端状态的路径。
- 规则要保守：可以按 URL pattern、链接可见性、鼠标悬停、路由预测模型分层启用，并限制同一时间预渲染数量。
- 页面必须处理 prerender 生命周期：避免统计重复上报、避免提前播放媒体、避免提前申请权限，等 prerendering 激活后再执行用户可见副作用。

#### 工程化补充

- 场景前提：先限定 prerender 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Speculation Rules API：浏览器级 prerender 怎么用才不反噬 的结论不成立。
- 实施步骤：围绕 prerender 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

title: 追问：以「LCP、INP、CLS 如何理解与治理」为例，你会先看哪些与 CWV 相关的指标来判断「LCP、INP、CLS 如何理解与治理」是不是当前性能瓶颈
difficulty: 进阶
tags: [CWV, WebVitals, 追问]
parent: core-web-vitals

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「LCP、INP、CLS 如何理解与治理」为例，你会先看哪些与 CWV 相关的指标来判断「LCP、INP、CLS 如何理解与治理」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证 LCP 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 LCP 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- LCP：LCP 衡量主要内容出现速度，重点看首屏 HTML、关键资源、服务端响应、首图/首屏块渲染。
- INP：INP 衡量交互到下一帧视觉反馈的延迟，重点看长任务、主线程阻塞、重计算。
- CLS：CLS 衡量布局稳定性，重点防止图片/广告/异步内容无尺寸占位。

#### 风险与验收

- 主要风险：LCP 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：Core Web Vitals 通常以页面访问样本的第 75 百分位来评估；常见“良好”阈值是 LCP <= 2.5s、INP <= 200ms、CLS <= 0.1。

## core-web-vitals-followup-2

title: 追问：你会如何避免把「LCP、INP、CLS 如何理解与治理」的实验室提升误判为真实用户体验改善
difficulty: 进阶
tags: [CWV, WebVitals, 追问]
parent: core-web-vitals

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何避免把「LCP、INP、CLS 如何理解与治理」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 直答

- 结论：先锁定 LCP 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 LCP 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- LCP：LCP 衡量主要内容出现速度，重点看首屏 HTML、关键资源、服务端响应、首图/首屏块渲染。
- INP：INP 衡量交互到下一帧视觉反馈的延迟，重点看长任务、主线程阻塞、重计算。
- CLS：CLS 衡量布局稳定性，重点防止图片/广告/异步内容无尺寸占位。

#### 风险与验收

- 主要风险：在「LCP、INP、CLS 如何理解与治理」场景下，LCP 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：Core Web Vitals 通常以页面访问样本的第 75 百分位来评估；常见“良好”阈值是 LCP <= 2.5s、INP <= 200ms、CLS <= 0.1。

## core-web-vitals-followup-3

title: 追问：从工程落地角度看，如果优化带来复杂度或兼容性成本，你会怎么评估「LCP、INP、CLS 如何理解与治理」是否值得做
difficulty: 进阶
tags: [CWV, WebVitals, 追问]
parent: core-web-vitals

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果优化带来复杂度或兼容性成本，你会怎么评估「LCP、INP、CLS 如何理解与治理」是否值得做？

### 答案要点

#### 直答

- 结论：评估 LCP 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先排查 LCP 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- LCP：LCP 衡量主要内容出现速度，重点看首屏 HTML、关键资源、服务端响应、首图/首屏块渲染。
- INP：INP 衡量交互到下一帧视觉反馈的延迟，重点看长任务、主线程阻塞、重计算。
- CLS：CLS 衡量布局稳定性，重点防止图片/广告/异步内容无尺寸占位。

#### 风险与验收

- 主要风险：若 LCP 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：Core Web Vitals 通常以页面访问样本的第 75 百分位来评估；常见“良好”阈值是 LCP <= 2.5s、INP <= 200ms、CLS <= 0.1。

## rum-vs-lab-followup-1

title: 追问：当「实验室数据与真实用户数据为什么经常不一致」进入复杂场景后，你会先验证哪些 RUM 前置条件，避免方案踩坑
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals, 追问]
parent: rum-vs-lab

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「实验室数据与真实用户数据为什么经常不一致」进入复杂场景后，你会先验证哪些 RUM 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 结论：把 实验室数据 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 实验室数据 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- RUM：排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群。
- Lighthouse：Lighthouse 是「实验室数据与真实用户数据为什么经常不一致」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- WebVitals：WebVitals 是「实验室数据与真实用户数据为什么经常不一致」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群。
- 验收信号：实验室数据 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## initial-load-followup-1

title: 追问：你会先看哪些与 首屏 相关的指标来判断「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」是不是当前性能瓶颈
difficulty: 进阶
tags: [首屏, SSR, 追问]
parent: initial-load

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会先看哪些与 首屏 相关的指标来判断「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 首屏优化 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」里的 首屏优化 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- SSR：内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高。
- SSG：内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高。
- ISR：高频更新但允许增量生成时可考虑 ISR。

#### 风险与验收

- 主要风险：在「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」里，首屏优化 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」里，首屏优化 至少要给一组指标阈值、一条日志证据和一组测试结果。

## initial-load-followup-2

title: 追问：你会怎样验证「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [首屏, SSR, 追问]
parent: initial-load

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样验证「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 首屏优化 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：围绕 首屏优化 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- SSR：内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高。
- SSG：内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高。
- ISR：高频更新但允许增量生成时可考虑 ISR。

#### 风险与验收

- 主要风险：若 首屏优化 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：首屏优化 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## initial-load-followup-3

title: 追问：结合真实业务约束，围绕「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」在 首屏 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [首屏, SSR, 追问]
parent: initial-load

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「首屏优化：SSR、SSG、ISR、路由分包、Critical CSS」在 首屏 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 结论：首屏优化 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先量化 首屏优化 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- SSR：内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高。
- SSG：内容稳定、SEO 重要、首屏信息密度高时，SSG/SSR 往往收益更高。
- ISR：高频更新但允许增量生成时可考虑 ISR。

#### 风险与验收

- 主要风险：围绕 首屏优化 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 首屏优化 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## runtime-optimization-followup-1

title: 追问：把「运行时优化：虚拟列表、拆长任务、批量更新」放到真实业务里，围绕 运行时 最容易被低估的边界条件和前置约束是什么
difficulty: 进阶
tags: [运行时, 长任务, 追问]
parent: runtime-optimization

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：把「运行时优化：虚拟列表、拆长任务、批量更新」放到真实业务里，围绕 运行时 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：运行时优化 虚拟列表 拆长任务 批量更新 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：某些浏览器已提供 scheduler.postTask() 等调度能力，但它们并非所有环境都可用，落地时要准备降级路径。

#### 术语解释

- 运行时：在「运行时优化：虚拟列表、拆长任务、批量更新」里，运行时 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 长任务：把大循环切片、移入 Worker、让出主线程。

#### 风险与验收

- 主要风险：若 运行时优化 虚拟列表 拆长任务 批量更新 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：运行时优化 虚拟列表 拆长任务 批量更新 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## network-resource-hints-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 资源提示 重点排查「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」的哪些边界问题
difficulty: 进阶
tags: [资源提示, 网络, 追问]
parent: network-resource-hints

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 资源提示 重点排查「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 preload 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先演练 preload 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- preload：当前导航很快就要用的关键资源。
- prefetch：未来导航可能用到的低优先级资源，通常更适合同站后续页面资源。
- modulepreload：在「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」里，modulepreload 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 preload 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 preload 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## image-font-bundle-followup-1

title: 追问：结合真实业务约束，如果要复盘「图片、字体、JS 包体是最常见的三类资源瓶颈」的实现风险，你会先检查哪些边界输入和复杂度问题
difficulty: 基础
tags: [图片, 字体, 包体, 追问]
parent: image-font-bundle

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要复盘「图片、字体、JS 包体是最常见的三类资源瓶颈」的实现风险，你会先检查哪些边界输入和复杂度问题？

### 答案要点

#### 直答

- 结论：上线 图片 字体 JS 包体是最常见的三类资源瓶颈 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先演练 图片 字体 JS 包体是最常见的三类资源瓶颈 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- JS：路由分包、按需引入、删除无用依赖、分析第三方包体积。
- 图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF。
- 字体：子集化、font-display: swap、减少变体数量。

#### 风险与验收

- 主要风险：图片 字体 JS 包体是最常见的三类资源瓶颈 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 图片 字体 JS 包体是最常见的三类资源瓶颈 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## monitoring-budget-followup-1

title: 追问：在「性能预算与回归治理」场景下，你会先看哪些与 预算 相关的指标来判断「性能预算与回归治理」是不是当前性能瓶颈
difficulty: 进阶
tags: [预算, 监控, 追问]
parent: monitoring-budget

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「性能预算与回归治理」场景下，你会先看哪些与 预算 相关的指标来判断「性能预算与回归治理」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证 性能预算与回归治理 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 性能预算与回归治理 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 性能预算与回归治理：围绕「性能预算与回归治理」里的 性能预算与回归治理 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 预算：首屏 JS、图片体积、LCP/INP/CLS 阈值。
- 监控：围绕「性能预算与回归治理」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 性能预算与回归治理 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：性能预算与回归治理 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## inp-deep-followup-1

title: 追问：把「INP 取代 FID 后，前端要怎么优化交互响应」放到真实业务里，围绕 INP 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [INP, 交互, 追问]
parent: inp-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：把「INP 取代 FID 后，前端要怎么优化交互响应」放到真实业务里，围绕 INP 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：INP 取代 FID 后 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先演练 INP 取代 FID 后 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- INP：INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98。
- FID：FID 只看首次输入，INP 看所有交互，是更严格的指标。
- 交互：FID 只看首次输入，INP 看所有交互，是更严格的指标。

#### 风险与验收

- 主要风险：围绕 INP 取代 FID 后 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：FID 只看首次输入，INP 看所有交互，是更严格的指标。

## image-modern-pipeline-followup-1

title: 追问：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」场景下，你会先看哪些与 图片 相关的指标来判断「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」是不是当前性能瓶颈
difficulty: 进阶
tags: [图片, LCP, 追问]
parent: image-modern-pipeline

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」场景下，你会先看哪些与 图片 相关的指标来判断「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 现代图片处理流水线（AVIF 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：命名：/img/{id}/{w}.{format}，方便缓存和回滚。

#### 术语解释

- AVIF：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）。
- WebP：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）。
- responsive：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」里，responsive 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：现代图片处理流水线（AVIF 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」里，现代图片处理流水线（AVIF 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## core-web-vitals-explain-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Web Vitals 相关的指标来判断「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」是不是当前性能瓶颈
difficulty: 进阶
tags: [Web Vitals, 性能, 追问]
parent: core-web-vitals-explain

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Web Vitals 相关的指标来判断「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 Core Web Vitals 三个指标 LCP 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：CLS：可见元素位置突变的累积分数。优化： 始终设置宽高 / aspect-ratio、不在已有内容上方插入广告、min-height 占位、字体回退尺寸匹配（size-adjust）。

#### 术语解释

- Core Web Vitals：在「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里，Core Web Vitals 是验收对象，必须给可量化指标、日志信号和测试证据。
- LCP：LCP 是「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- INP：INP 是「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：INP：用户交互到下一帧绘制的耗时（取一段时间内的 P98）。优化：减少长任务（拆分 + scheduler.yield）、startTransition / useDeferredValue 把昂贵渲染降级、事件处理器中避免大计算。
- 验收信号：Core Web Vitals 三个指标 LCP 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## long-task-scheduling-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 性能 相关的指标来判断「长任务（Long Task）怎么定位与拆分」是不是当前性能瓶颈
difficulty: 进阶
tags: [性能, 调度, 追问]
parent: long-task-scheduling

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 性能 相关的指标来判断「长任务（Long Task）怎么定位与拆分」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 性能 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 性能 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Long Task：浏览器主线程任务执行时间 > 50ms。
- 性能：性能 是「长任务（Long Task）怎么定位与拆分」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 调度：在「长任务（Long Task）怎么定位与拆分」里，调度 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 性能 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：性能 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## bundle-split-strategy-followup-1

title: 追问：结合真实业务约束，你会如何把用户侧体验指标和系统侧资源指标结合，判断「bundle 拆分与按需加载策略」是否该优先优化
difficulty: 进阶
tags: [打包, 性能, 追问]
parent: bundle-split-strategy

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何把用户侧体验指标和系统侧资源指标结合，判断「bundle 拆分与按需加载策略」是否该优先优化？

### 答案要点

#### 直答

- 结论：验证 bundle 拆分与按需加载策略 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「bundle 拆分与按需加载策略」里的 bundle 拆分与按需加载策略 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- bundle：在「bundle 拆分与按需加载策略」里，bundle 是验收对象，必须给可量化指标、日志信号和测试证据。
- 打包：在「bundle 拆分与按需加载策略」里，打包 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「bundle 拆分与按需加载策略」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「bundle 拆分与按需加载策略」里，bundle 拆分与按需加载策略 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「bundle 拆分与按需加载策略」里，bundle 拆分与按需加载策略 至少要给一组指标阈值、一条日志证据和一组测试结果。

## memory-leak-frontend-followup-1

title: 追问：你会先看哪些与 性能 相关的指标来判断「怎么排查前端内存泄漏」是不是当前性能瓶颈
difficulty: 资深
tags: [性能, 内存, 高频, 追问]
parent: memory-leak-frontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会先看哪些与 性能 相关的指标来判断「怎么排查前端内存泄漏」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 性能 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「怎么排查前端内存泄漏」里的 性能 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 怎么排查前端内存泄漏：在「怎么排查前端内存泄漏」里，怎么排查前端内存泄漏 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「怎么排查前端内存泄漏」这道追问里，性能 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 内存：DevTools → Performance → Memory 录制：长时间使用后内存曲线持续上升不回落 = 泄漏。

#### 风险与验收

- 主要风险：在「怎么排查前端内存泄漏」里，性能 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「怎么排查前端内存泄漏」里，性能 至少要给一组指标阈值、一条日志证据和一组测试结果。

## loaf-rendering-attribution

title: Long Animation Frames API 如何定位 INP 卡顿根因
difficulty: 资深
tags: [INP, LoAF, PerformanceObserver, RUM]
links: [inp-deep, long-task-scheduling, 16-observability/tbt-and-long-task-collection]
followups: [loaf-rendering-attribution-followup-1, loaf-rendering-attribution-followup-2, loaf-rendering-attribution-followup-3]

### 一句话

回答「Long Animation Frames API 如何定位 INP 卡顿根因」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

INP 变差时，为什么只看 Long Task 还不够？Long Animation Frames API 能补哪些排障信息，线上怎么采？

### 答案要点

- INP 关注用户交互到下一次可绘制反馈的延迟，卡顿可能来自事件处理、同步布局、样式计算、渲染提交、第三方脚本或同帧里排队的任务。
- Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 blockingDuration、脚本来源、样式布局耗时等信息串到同一帧。
- RUM 采集时应把 LoAF 与 INP event、路由、设备档位、页面状态、是否后台 tab 关联，避免只按平均值判断。
- 线上要做采样和脱敏：脚本 URL 可以做域名或 chunk 名归因，不要上报完整用户输入、DOM 文本或敏感路径。

#### 工程化补充

- 场景前提：回答 Long Animation Frames API 如何定位 INP 卡顿根因 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Long Animation Frames API 如何定位 INP 卡顿根因 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [third-party-script-governance-followup-1, third-party-script-governance-followup-2, third-party-script-governance-followup-3]

### 一句话

讲「第三方脚本如何治理：性能、隐私、安全与降级」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

埋点、广告、客服、A/B、风控、热图这些第三方脚本经常拖慢页面。你会如何从性能、隐私、安全和可用性角度治理？

### 答案要点

- 先分级：核心业务必需、收入相关、分析监控、体验增强、实验性脚本；不同级别有不同加载时机和失败策略。
- 加载时机要延后：首屏关键路径外的脚本放到交互后、空闲时、可见时或用户同意后加载，不要阻塞 LCP 资源。
- 性能监控要能归因：记录第三方域名、脚本耗时、Long Task/LoAF attribution、错误率、加载失败率、对 INP/LCP 的影响。
- 隐私合规要前置：用户同意前不加载营销/追踪脚本；采集字段最小化，避免把 PII、搜索词、输入内容直接发给供应商。

#### 工程化补充

- 场景前提：第三方脚本如何治理：性能、隐私、安全与降级 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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
followups: [bfcache-page-lifecycle-followup-1, bfcache-page-lifecycle-followup-2, bfcache-page-lifecycle-followup-3]

### 一句话

讲「bfcache 与 Page Lifecycle：返回秒开为什么会失效」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么浏览器返回上一页有时是秒开，有时却重新加载？bfcache 和 Page Lifecycle 如何影响性能、埋点、WebSocket 和页面状态恢复？

### 答案要点

- bfcache 是 back/forward cache，浏览器把整个页面冻结在内存中，用户后退/前进时恢复 DOM、JS heap、滚动位置和表单状态。
- 是否命中可通过 pageshow 事件的 event.persisted 判断；Performance Navigation Timing 也能辅助识别。
- 常见失效原因：使用 unload、存在不安全的页面生命周期副作用、部分浏览器策略限制、Cache-Control 特殊配置、打开中的资源未正确处理。
- 页面进入冻结/隐藏时要暂停轮询、动画、定时器、WebSocket 心跳；恢复时再重新校验数据和连接状态。

#### 工程化补充

- 场景前提：bfcache 与 Page Lifecycle：返回秒开为什么会失效 只有在瓶颈被数据证实时才值得推进；先确认 bfcache 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 bfcache 与 Page Lifecycle：返回秒开为什么会失效 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

## methodology-followup-2

title: 追问：你会怎样验证「性能优化方法论：先度量，再定位，再治理」在 方法论 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 基础
tags: [方法论, 指标, 追问]
parent: methodology
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样验证「性能优化方法论：先度量，再定位，再治理」在 方法论 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 性能优化方法论 先度量 再定位 再治理 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：围绕 性能优化方法论 先度量 再定位 再治理 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 方法论：在「性能优化方法论：先度量，再定位，再治理」里，方法论 是验收对象，必须给可量化指标、日志信号和测试证据。
- 指标：在「性能优化方法论：先度量，再定位，再治理」里，指标 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 性能优化方法论 先度量 再定位 再治理 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：性能优化方法论 先度量 再定位 再治理 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## methodology-followup-3

title: 追问：结合真实业务约束，如果「性能优化方法论：先度量，再定位，再治理」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 基础
tags: [方法论, 指标, 追问]
parent: methodology
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果「性能优化方法论：先度量，再定位，再治理」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 直答

- 结论：验证 性能优化方法论 先度量 再定位 再治理 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 性能优化方法论 先度量 再定位 再治理 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 方法论：在「性能优化方法论：先度量，再定位，再治理」里，方法论 是验收对象，必须给可量化指标、日志信号和测试证据。
- 指标：在「性能优化方法论：先度量，再定位，再治理」里，指标 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 性能优化方法论 先度量 再定位 再治理 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：性能优化方法论 先度量 再定位 再治理 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## network-resource-hints-followup-2

title: 追问：以「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」为例，如果「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」遇到外部依赖抖动，你会先收紧哪几个可靠性开关
difficulty: 进阶
tags: [资源提示, 网络, 追问]
parent: network-resource-hints
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」为例，如果「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」遇到外部依赖抖动，你会先收紧哪几个可靠性开关？

### 答案要点

#### 直答

- 结论：先收紧 preload 的超时阈值、重试上限、熔断开关和降级开关，再观察错误率与恢复时长。
- 关键动作：先识别 preload 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- preload：当前导航很快就要用的关键资源。
- prefetch：未来导航可能用到的低优先级资源，通常更适合同站后续页面资源。
- modulepreload：围绕「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」里的 modulepreload 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：preload 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：preload 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## network-resource-hints-followup-3

title: 追问：在当前团队与业务约束下，当你要验证「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标
difficulty: 进阶
tags: [资源提示, 网络, 追问]
parent: network-resource-hints
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当你要验证「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标？

### 答案要点

#### 直答

- 结论：先定「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 preload 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- preload：当前导航很快就要用的关键资源。
- prefetch：未来导航可能用到的低优先级资源，通常更适合同站后续页面资源。
- modulepreload：围绕「preload、prefetch、modulepreload、preconnect 怎么用才不浪费」里的 modulepreload 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 preload 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：preload 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## image-font-bundle-followup-2

title: 追问：以「图片、字体、JS 包体是最常见的三类资源瓶颈」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 基础
tags: [图片, 字体, 包体, 追问]
parent: image-font-bundle
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「图片、字体、JS 包体是最常见的三类资源瓶颈」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 直答

- 结论：规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。
- 关键动作：先梳理 图片 字体 JS 包体是最常见的三类资源瓶颈 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- JS：路由分包、按需引入、删除无用依赖、分析第三方包体积。
- 图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF。
- 字体：子集化、font-display: swap、减少变体数量。

#### 风险与验收

- 主要风险：围绕 图片 字体 JS 包体是最常见的三类资源瓶颈 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：图片 字体 JS 包体是最常见的三类资源瓶颈 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## image-font-bundle-followup-3

title: 追问：结合真实业务约束，如果要在评审里证明「图片、字体、JS 包体是最常见的三类资源瓶颈」可长期维护，你会展示哪些围绕 图片 的正确性证据
difficulty: 基础
tags: [图片, 字体, 包体, 追问]
parent: image-font-bundle
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要在评审里证明「图片、字体、JS 包体是最常见的三类资源瓶颈」可长期维护，你会展示哪些围绕 图片 的正确性证据？

### 答案要点

#### 直答

- 结论：先约定「图片、字体、JS 包体是最常见的三类资源瓶颈」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 图片 字体 JS 包体是最常见的三类资源瓶颈 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- JS：路由分包、按需引入、删除无用依赖、分析第三方包体积。
- 图片：压缩、响应式尺寸、懒加载、优先用 WebP/AVIF。
- 字体：子集化、font-display: swap、减少变体数量。

#### 风险与验收

- 主要风险：在「图片、字体、JS 包体是最常见的三类资源瓶颈」里，图片 字体 JS 包体是最常见的三类资源瓶颈 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：图片 字体 JS 包体是最常见的三类资源瓶颈 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## monitoring-budget-followup-2

title: 追问：从工程落地角度看，优化上线后，你会怎么用 预算 相关的真实用户信号，证明「性能预算与回归治理」确实让体验变好了，而不只是实验室分数提升
difficulty: 进阶
tags: [预算, 监控, 追问]
parent: monitoring-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，优化上线后，你会怎么用 预算 相关的真实用户信号，证明「性能预算与回归治理」确实让体验变好了，而不只是实验室分数提升？

### 答案要点

#### 直答

- 结论：把 性能预算与回归治理 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 性能预算与回归治理 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 性能预算与回归治理：在「性能预算与回归治理」这道追问里，性能预算与回归治理 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 预算：首屏 JS、图片体积、LCP/INP/CLS 阈值。
- 监控：围绕「性能预算与回归治理」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 性能预算与回归治理 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：性能预算与回归治理 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## monitoring-budget-followup-3

title: 追问：从工程落地角度看，你会怎样评估「性能预算与回归治理」在性能收益与兼容性风险之间的平衡点
difficulty: 进阶
tags: [预算, 监控, 追问]
parent: monitoring-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会怎样评估「性能预算与回归治理」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 直答

- 结论：先量化 性能预算与回归治理 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先量化 性能预算与回归治理 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 性能预算与回归治理：围绕「性能预算与回归治理」里的 性能预算与回归治理 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 预算：首屏 JS、图片体积、LCP/INP/CLS 阈值。
- 监控：围绕「性能预算与回归治理」里的 监控 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 性能预算与回归治理 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 性能预算与回归治理 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## image-modern-pipeline-followup-2

title: 追问：从工程落地角度看，你会如何结合 图片 指标，避免把「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」的实验室提升误判为真实用户体验改善
difficulty: 进阶
tags: [图片, LCP, 追问]
parent: image-modern-pipeline
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会如何结合 图片 指标，避免把「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 直答

- 结论：先定义 现代图片处理流水线（AVIF 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：命名：/img/{id}/{w}.{format}，方便缓存和回滚。

#### 术语解释

- AVIF：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）。
- WebP：CDN / 服务端按需生成多尺寸 + 多格式（AVIF > WebP > JPEG）。
- responsive：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」里，responsive 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：现代图片处理流水线（AVIF 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」里，现代图片处理流水线（AVIF 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## image-modern-pipeline-followup-3

title: 追问：在「现代图片处理流水线」场景下，你会怎样比较「现代图片处理流水线」在 图片 优化上的短期收益和长期负担，决定是否落地
difficulty: 进阶
tags: [图片, LCP, 追问]
parent: image-modern-pipeline
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「现代图片处理流水线」场景下，你会怎样比较「现代图片处理流水线」在 图片 优化上的短期收益和长期负担，决定是否落地？

### 答案要点

#### 直答

- 结论：现代图片处理流水线 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：命名：/img/{id}/{w}.{format}，方便缓存和回滚。

#### 术语解释

- 现代图片处理流水线：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」这道追问里，现代图片处理流水线 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 图片：在「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」里，图片 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- LCP：LCP 是「现代图片处理流水线（AVIF / WebP / responsive / blur-up）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 现代图片处理流水线 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 现代图片处理流水线 收益提升和维护成本变化，确保取舍结论可持续。

## core-web-vitals-explain-followup-2

title: 追问：从工程落地角度看，当「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [Web Vitals, 性能, 追问]
parent: core-web-vitals-explain
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 直答

- 结论：先定义 Core Web Vitals 三个指标 LCP 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：CLS：可见元素位置突变的累积分数。优化： 始终设置宽高 / aspect-ratio、不在已有内容上方插入广告、min-height 占位、字体回退尺寸匹配（size-adjust）。

#### 术语解释

- Core Web Vitals：围绕「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的 Core Web Vitals 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- LCP：LCP 是「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- INP：INP 是「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：INP：用户交互到下一帧绘制的耗时（取一段时间内的 P98）。优化：减少长任务（拆分 + scheduler.yield）、startTransition / useDeferredValue 把昂贵渲染降级、事件处理器中避免大计算。
- 验收信号：Core Web Vitals 三个指标 LCP 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## core-web-vitals-explain-followup-3

title: 追问：从工程落地角度看，围绕「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」在 Web Vitals 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [Web Vitals, 性能, 追问]
parent: core-web-vitals-explain
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，围绕「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」在 Web Vitals 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 结论：Core Web Vitals 三个指标 LCP 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：CLS：可见元素位置突变的累积分数。优化： 始终设置宽高 / aspect-ratio、不在已有内容上方插入广告、min-height 占位、字体回退尺寸匹配（size-adjust）。

#### 术语解释

- Core Web Vitals：在「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里，Core Web Vitals 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- LCP：LCP 是「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- INP：INP 是「Core Web Vitals 三个指标 LCP / INP / CLS 怎么解读和优化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Core Web Vitals 三个指标 LCP 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 Core Web Vitals 三个指标 LCP 收益提升和维护成本变化，确保取舍结论可持续。

## long-task-scheduling-followup-2

title: 追问：要证明「长任务（Long Task）怎么定位与拆分」确实改善体验，你会如何围绕 性能 设计线上观测与对照验证
difficulty: 进阶
tags: [性能, 调度, 追问]
parent: long-task-scheduling
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：要证明「长任务（Long Task）怎么定位与拆分」确实改善体验，你会如何围绕 性能 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 拆分 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先把「长任务（Long Task）怎么定位与拆分」里的 拆分 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Long Task：浏览器主线程任务执行时间 > 50ms。
- 性能：围绕「长任务（Long Task）怎么定位与拆分」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 调度：在「长任务（Long Task）怎么定位与拆分」里，调度 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「长任务（Long Task）怎么定位与拆分」里，拆分 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「长任务（Long Task）怎么定位与拆分」里，拆分 至少要给一组指标阈值、一条日志证据和一组测试结果。

## long-task-scheduling-followup-3

title: 追问：以「长任务（Long Task）怎么定位与拆分」为例，你会怎样评估「长任务（Long Task）怎么定位与拆分」在性能收益与兼容性风险之间的平衡点
difficulty: 进阶
tags: [性能, 调度, 追问]
parent: long-task-scheduling
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「长任务（Long Task）怎么定位与拆分」为例，你会怎样评估「长任务（Long Task）怎么定位与拆分」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 直答

- 结论：拆分 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先拆分 拆分 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- Long Task：浏览器主线程任务执行时间 > 50ms。
- 性能：在「长任务（Long Task）怎么定位与拆分」里，性能 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 调度：围绕「长任务（Long Task）怎么定位与拆分」里的 调度 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 拆分 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 拆分 收益提升和维护成本变化，确保取舍结论可持续。

## bundle-split-strategy-followup-2

title: 追问：以「bundle 拆分与按需加载策略」为例，围绕「bundle 拆分与按需加载策略」上线效果，你会优先看哪些和 打包 相关的真实用户指标来佐证体验提升
difficulty: 进阶
tags: [打包, 性能, 追问]
parent: bundle-split-strategy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「bundle 拆分与按需加载策略」为例，围绕「bundle 拆分与按需加载策略」上线效果，你会优先看哪些和 打包 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 直答

- 结论：先定义 bundle 拆分与按需加载策略 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 bundle 拆分与按需加载策略 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- bundle：在「bundle 拆分与按需加载策略」里，bundle 是验收对象，必须给可量化指标、日志信号和测试证据。
- 打包：在「bundle 拆分与按需加载策略」里，打包 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「bundle 拆分与按需加载策略」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 bundle 拆分与按需加载策略 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：bundle 拆分与按需加载策略 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## bundle-split-strategy-followup-3

title: 追问：以「bundle 拆分与按需加载策略」为例，如果「bundle 拆分与按需加载策略」在 打包 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [打包, 性能, 追问]
parent: bundle-split-strategy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「bundle 拆分与按需加载策略」为例，如果「bundle 拆分与按需加载策略」在 打包 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 bundle 拆分与按需加载策略 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先排查 bundle 拆分与按需加载策略 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- bundle：在「bundle 拆分与按需加载策略」里，bundle 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 打包：在「bundle 拆分与按需加载策略」里，打包 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 性能：在「bundle 拆分与按需加载策略」里，性能 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：若 bundle 拆分与按需加载策略 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 bundle 拆分与按需加载策略 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## memory-leak-frontend-followup-2

title: 追问：在「怎么排查前端内存泄漏」场景下，如果实验室分数变好但线上反馈一般，你会如何围绕 性能瓶颈 重新评估「怎么排查前端内存泄漏」优化效果
difficulty: 资深
tags: [性能, 内存, 高频, 追问]
parent: memory-leak-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「怎么排查前端内存泄漏」场景下，如果实验室分数变好但线上反馈一般，你会如何围绕 性能瓶颈 重新评估「怎么排查前端内存泄漏」优化效果？

### 答案要点

#### 直答

- 结论：先画出 性能 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 性能 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 怎么排查前端内存泄漏：在「怎么排查前端内存泄漏」这题里，怎么排查前端内存泄漏 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 性能：在「怎么排查前端内存泄漏」这道追问里，性能 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 内存：DevTools → Performance → Memory 录制：长时间使用后内存曲线持续上升不回落 = 泄漏。

#### 风险与验收

- 主要风险：性能 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「怎么排查前端内存泄漏」里，性能 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## memory-leak-frontend-followup-3

title: 追问：在当前团队与业务约束下，如果优化带来复杂度或兼容性成本，你会怎么评估「怎么排查前端内存泄漏」是否值得做
difficulty: 资深
tags: [性能, 内存, 高频, 追问]
parent: memory-leak-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果优化带来复杂度或兼容性成本，你会怎么评估「怎么排查前端内存泄漏」是否值得做？

### 答案要点

#### 直答

- 结论：先量化 性能 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先量化 性能 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 怎么排查前端内存泄漏：在「怎么排查前端内存泄漏」里，怎么排查前端内存泄漏 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 性能：围绕「怎么排查前端内存泄漏」里的 性能 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 内存：DevTools → Performance → Memory 录制：长时间使用后内存曲线持续上升不回落 = 泄漏。

#### 风险与验收

- 主要风险：围绕 性能 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 性能 收益提升和维护成本变化，确保取舍结论可持续。

## speculation-rules-prerender-followup-1

title: 追问：在当前团队与业务约束下，prerender 和 prefetch 分别适合哪些导航场景
difficulty: 资深
tags: [SpeculationRules, prerender, 性能, 追问]
parent: speculation-rules-prerender
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，prerender 和 prefetch 分别适合哪些导航场景？

### 答案要点

#### 直答

- 结论：回答 prerender 与 prefetch 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 prerender 与 prefetch 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- SpeculationRules：SpeculationRules 是「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- prerender：页面必须处理 prerender 生命周期：避免统计重复上报、避免提前播放媒体、避免提前申请权限，等 prerendering 激活后再执行用户可见副作用。
- 性能：性能 决定「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」为什么会这样，回答时要把原因和失效前提讲清楚。

#### 风险与验收

- 主要风险：围绕 prerender 与 prefetch 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收标准是 prerender 与 prefetch 因果链可复现：输入触发、机制命中、修复后指标回稳。

## speculation-rules-prerender-followup-2

title: 追问：结合真实业务约束，如何避免 prerender 造成统计重复和服务端副作用
difficulty: 资深
tags: [SpeculationRules, prerender, 性能, 追问]
parent: speculation-rules-prerender
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如何避免 prerender 造成统计重复和服务端副作用？

### 答案要点

#### 直答

- 结论：先把 造成统计重复 与 服务端副作用 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 造成统计重复 与 服务端副作用 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- SpeculationRules：SpeculationRules 是「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- prerender：页面必须处理 prerender 生命周期：避免统计重复上报、避免提前播放媒体、避免提前申请权限，等 prerendering 激活后再执行用户可见副作用。
- 性能：在「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」这题里，性能 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：造成统计重复 与 服务端副作用 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」里 造成统计重复 与 服务端副作用 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## speculation-rules-prerender-followup-3

title: 追问：在「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」场景下，你会如何评估预测命中率和额外资源消耗是否值得
difficulty: 资深
tags: [SpeculationRules, prerender, 性能, 追问]
parent: speculation-rules-prerender
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」场景下，你会如何评估预测命中率和额外资源消耗是否值得？

### 答案要点

#### 直答

- 结论：把 Speculation Rules API 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 Speculation Rules API 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Speculation Rules API：围绕「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」里的 Speculation Rules API 作答时，要给可落地动作，并说明异常处理与验收阈值。
- prerender：页面必须处理 prerender 生命周期：避免统计重复上报、避免提前播放媒体、避免提前申请权限，等 prerendering 激活后再执行用户可见副作用。
- SpeculationRules：SpeculationRules 是「Speculation Rules API：浏览器级 prerender 怎么用才不反噬」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Speculation Rules API 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：Speculation Rules API 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## loaf-rendering-attribution-followup-1

title: 追问：以「Long Animation Frames API 如何定位 INP 卡顿根因」为例，LoAF、Long Task、Event Timing 在排查 INP 时分别回答什么问题
difficulty: 资深
tags: [INP, LoAF, PerformanceObserver, RUM, 追问]
parent: loaf-rendering-attribution
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Long Animation Frames API 如何定位 INP 卡顿根因」为例，LoAF、Long Task、Event Timing 在排查 INP 时分别回答什么问题？

### 答案要点

#### 直答

- 结论：先锁定 Long 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 Long 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Long Animation Frames：围绕「Long Animation Frames API 如何定位 INP 卡顿根因」里的 Long Animation Frames 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- API：API 是「Long Animation Frames API 如何定位 INP 卡顿根因」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- INP：INP 关注用户交互到下一次可绘制反馈的延迟，卡顿可能来自事件处理、同步布局、样式计算、渲染提交、第三方脚本或同帧里排队的任务。

#### 风险与验收

- 主要风险：Long 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 blockingDuration、脚本来源、样式布局耗时等信息串到同一帧。

## loaf-rendering-attribution-followup-2

title: 追问：在当前团队与业务约束下，如果 LoAF 指向第三方脚本，你会如何治理而不影响业务投放
difficulty: 资深
tags: [INP, LoAF, PerformanceObserver, RUM, 追问]
parent: loaf-rendering-attribution
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果 LoAF 指向第三方脚本，你会如何治理而不影响业务投放？

### 答案要点

#### 直答

- 结论：先锁定 Long 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 Long 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- INP：INP 关注用户交互到下一次可绘制反馈的延迟，卡顿可能来自事件处理、同步布局、样式计算、渲染提交、第三方脚本或同帧里排队的任务。
- LoAF：Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 blockingDuration、脚本来源、样式布局耗时等信息串到同一帧。
- PerformanceObserver：PerformanceObserver 是「Long Animation Frames API 如何定位 INP 卡顿根因」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Long Animation Frames API 如何定位 INP 卡顿根因」场景下，Long 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 blockingDuration、脚本来源、样式布局耗时等信息串到同一帧。

## loaf-rendering-attribution-followup-3

title: 追问：为什么实验室里 INP 正常，真实用户仍然可能卡
difficulty: 资深
tags: [INP, LoAF, PerformanceObserver, RUM, 追问]
parent: loaf-rendering-attribution
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为什么实验室里 INP 正常，真实用户仍然可能卡？

### 答案要点

#### 直答

- 结论：Long 的原因要落到“为什么会发生、何时会失效、如何规避”三点，缺一都不完整。
- 关键动作：先列出 Long 的前提假设，再解释机制，最后补失效场景，形成因果闭环，并推进排查、实施与回退验证。

#### 术语解释

- INP：INP 关注用户交互到下一次可绘制反馈的延迟，卡顿可能来自事件处理、同步布局、样式计算、渲染提交、第三方脚本或同帧里排队的任务。
- LoAF：Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 blockingDuration、脚本来源、样式布局耗时等信息串到同一帧。
- PerformanceObserver：PerformanceObserver 是「Long Animation Frames API 如何定位 INP 卡顿根因」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Long 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：Long Task 的粒度是“主线程任务”，不一定对应用户感知的一帧；LoAF 的粒度是“长动画帧”，能把 blockingDuration、脚本来源、样式布局耗时等信息串到同一帧。

## third-party-script-governance-followup-1

title: 追问：在当前团队与业务约束下，如何证明某个第三方脚本对 INP 或 LCP 有显著影响
difficulty: 资深
tags: [第三方脚本, 性能, 安全, RUM, 追问]
parent: third-party-script-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如何证明某个第三方脚本对 INP 或 LCP 有显著影响？

### 答案要点

#### 直答

- 结论：先定义 安全 与 降级 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先分级：核心业务必需、收入相关、分析监控、体验增强、实验性脚本；不同级别有不同加载时机和失败策略。

#### 术语解释

- 第三方脚本：围绕「第三方脚本如何治理：性能、隐私、安全与降级」里的 第三方脚本 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 性能：记录第三方域名、脚本耗时、Long Task/LoAF attribution、错误率、加载失败率、对 INP/LCP 的影响。
- 安全：在「第三方脚本如何治理：性能、隐私、安全与降级」里，安全 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「第三方脚本如何治理：性能、隐私、安全与降级」里，安全 与 降级 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：安全 与 降级 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## third-party-script-governance-followup-2

title: 追问：如果业务强依赖客服/风控脚本，但它经常超时，你会怎么降级
difficulty: 资深
tags: [第三方脚本, 性能, 安全, RUM, 追问]
parent: third-party-script-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果业务强依赖客服/风控脚本，但它经常超时，你会怎么降级？

### 答案要点

#### 直答

- 结论：上线 风控脚本 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先分级：核心业务必需、收入相关、分析监控、体验增强、实验性脚本；不同级别有不同加载时机和失败策略。

#### 术语解释

- 第三方脚本：在「第三方脚本如何治理：性能、隐私、安全与降级」里，第三方脚本 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 性能：记录第三方域名、脚本耗时、Long Task/LoAF attribution、错误率、加载失败率、对 INP/LCP 的影响。
- 安全：围绕「第三方脚本如何治理：性能、隐私、安全与降级」里的 安全 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 风控脚本 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：风控脚本 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## third-party-script-governance-followup-3

title: 追问：结合真实业务约束，CSP 和 SRI 在第三方脚本治理里分别解决什么问题
difficulty: 资深
tags: [第三方脚本, 性能, 安全, RUM, 追问]
parent: third-party-script-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，CSP 和 SRI 在第三方脚本治理里分别解决什么问题？

### 答案要点

#### 直答

- 结论：先梳理 CSP 与 SRI 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先分级：核心业务必需、收入相关、分析监控、体验增强、实验性脚本；不同级别有不同加载时机和失败策略。

#### 术语解释

- 第三方脚本：在「第三方脚本如何治理：性能、隐私、安全与降级」这题里，第三方脚本 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 性能：记录第三方域名、脚本耗时、Long Task/LoAF attribution、错误率、加载失败率、对 INP/LCP 的影响。
- 安全：围绕「第三方脚本如何治理：性能、隐私、安全与降级」里的 安全 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：CSP 与 SRI 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：CSP 与 SRI 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## bfcache-page-lifecycle-followup-1

title: 追问：load、pageshow、pagehide、visibilitychange 各适合处理什么
difficulty: 资深
tags: [bfcache, PageLifecycle, 性能, 追问]
parent: bfcache-page-lifecycle
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：`load`、`pageshow`、`pagehide`、`visibilitychange` 各适合处理什么？

### 答案要点

#### 直答

- 结论：回答 bfcache 与 Page 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 bfcache 与 Page 先做归因再做验证，避免把现象当原因。

#### 术语解释

- bfcache：bfcache 是 back/forward cache，浏览器把整个页面冻结在内存中，用户后退/前进时恢复 DOM、JS heap、滚动位置和表单状态。
- PageLifecycle：PageLifecycle 是「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能：在「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里，性能 是因果链关键变量，需要说明触发条件、机制和反例。

#### 风险与验收

- 主要风险：bfcache 与 Page 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：围绕 bfcache 与 Page 归因结果至少给复现步骤、日志证据和回归指标，防止误判。

## bfcache-page-lifecycle-followup-2

title: 追问：以「bfcache 与 Page Lifecycle：返回秒开为什么会失效」为例，如何在命中 bfcache 的同时保证关键数据恢复后不过期
difficulty: 资深
tags: [bfcache, PageLifecycle, 性能, 追问]
parent: bfcache-page-lifecycle
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「bfcache 与 Page Lifecycle：返回秒开为什么会失效」为例，如何在命中 bfcache 的同时保证关键数据恢复后不过期？

### 答案要点

#### 直答

- 结论：先把 bfcache 与 Page Lifecycle 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里的 bfcache 与 Page Lifecycle 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- bfcache：bfcache 是 back/forward cache，浏览器把整个页面冻结在内存中，用户后退/前进时恢复 DOM、JS heap、滚动位置和表单状态。
- Page Lifecycle：在「bfcache 与 Page Lifecycle：返回秒开为什么会失效」这题里，Page Lifecycle 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- PageLifecycle：PageLifecycle 是「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里，bfcache 与 Page Lifecycle 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里 bfcache 与 Page Lifecycle 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## bfcache-page-lifecycle-followup-3

title: 追问：结合真实业务约束，列表页返回体验如何用 bfcache、滚动恢复和数据 revalidate 一起优化
difficulty: 资深
tags: [bfcache, PageLifecycle, 性能, 追问]
parent: bfcache-page-lifecycle
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，列表页返回体验如何用 bfcache、滚动恢复和数据 revalidate 一起优化？

### 答案要点

#### 直答

- 结论：先拆分 滚动恢复 与 数据 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 滚动恢复 与 数据 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- bfcache：bfcache 是 back/forward cache，浏览器把整个页面冻结在内存中，用户后退/前进时恢复 DOM、JS heap、滚动位置和表单状态。
- PageLifecycle：PageLifecycle 是「bfcache 与 Page Lifecycle：返回秒开为什么会失效」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能：在「bfcache 与 Page Lifecycle：返回秒开为什么会失效」这题里，性能 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：滚动恢复 与 数据 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 滚动恢复 与 数据 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## rum-vs-lab-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 RUM 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals, 追问]
parent: rum-vs-lab
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 RUM 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先定「实验室数据与真实用户数据为什么经常不一致」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先把「实验室数据与真实用户数据为什么经常不一致」里的 实验室数据 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- RUM：排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群。
- Lighthouse：Lighthouse 是「实验室数据与真实用户数据为什么经常不一致」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- WebVitals：WebVitals 是「实验室数据与真实用户数据为什么经常不一致」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群。
- 验收信号：在「实验室数据与真实用户数据为什么经常不一致」里，实验室数据 至少要给一组指标阈值、一条日志证据和一组测试结果。

## rum-vs-lab-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「实验室数据与真实用户数据为什么经常不一致」里和 RUM 相关的哪些环节
difficulty: 进阶
tags: [RUM, Lighthouse, WebVitals, 追问]
parent: rum-vs-lab
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「实验室数据与真实用户数据为什么经常不一致」里和 RUM 相关的哪些环节？

### 答案要点

#### 直答

- 结论：先处理 实验室数据 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：先量化 实验室数据 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- RUM：排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群。
- Lighthouse：Lighthouse 是「实验室数据与真实用户数据为什么经常不一致」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- WebVitals：WebVitals 是「实验室数据与真实用户数据为什么经常不一致」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：排障时通常先用实验室工具定位主线程、网络瀑布、布局抖动，再用 RUM 验证问题是否真的影响主要用户群。
- 验收信号：验收看 实验室数据 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## runtime-optimization-followup-2

title: 追问：在「运行时优化：虚拟列表、拆长任务、批量更新」场景下，为了证明这个方案在 运行时 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [运行时, 长任务, 追问]
parent: runtime-optimization
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「运行时优化：虚拟列表、拆长任务、批量更新」场景下，为了证明这个方案在 运行时 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先定「运行时优化：虚拟列表、拆长任务、批量更新」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：某些浏览器已提供 scheduler.postTask() 等调度能力，但它们并非所有环境都可用，落地时要准备降级路径。

#### 术语解释

- 运行时：在「运行时优化：虚拟列表、拆长任务、批量更新」里，运行时 是验收对象，必须给可量化指标、日志信号和测试证据。
- 长任务：把大循环切片、移入 Worker、让出主线程。

#### 风险与验收

- 主要风险：在「运行时优化：虚拟列表、拆长任务、批量更新」里，运行时优化 虚拟列表 拆长任务 批量更新 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「运行时优化：虚拟列表、拆长任务、批量更新」里，运行时优化 虚拟列表 拆长任务 批量更新 至少要给一组指标阈值、一条日志证据和一组测试结果。

## runtime-optimization-followup-3

title: 追问：以「运行时优化：虚拟列表、拆长任务、批量更新」为例，面对规模与资源变化并存时，你会如何围绕 运行时 调整「运行时优化：虚拟列表、拆长任务、批量更新」的推进顺序
difficulty: 进阶
tags: [运行时, 长任务, 追问]
parent: runtime-optimization
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「运行时优化：虚拟列表、拆长任务、批量更新」为例，面对规模与资源变化并存时，你会如何围绕 运行时 调整「运行时优化：虚拟列表、拆长任务、批量更新」的推进顺序？

### 答案要点

#### 直答

- 结论：「运行时优化：虚拟列表、拆长任务、批量更新」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：某些浏览器已提供 scheduler.postTask() 等调度能力，但它们并非所有环境都可用，落地时要准备降级路径。

#### 术语解释

- 运行时：在「运行时优化：虚拟列表、拆长任务、批量更新」这题里，运行时 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 长任务：把大循环切片、移入 Worker、让出主线程。

#### 风险与验收

- 主要风险：在「运行时优化：虚拟列表、拆长任务、批量更新」场景下，运行时优化 虚拟列表 拆长任务 批量更新 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「运行时优化：虚拟列表、拆长任务、批量更新」里，运行时优化 虚拟列表 拆长任务 批量更新 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## inp-deep-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 INP 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [INP, 交互, 追问]
parent: inp-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 INP 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「INP 取代 FID 后，前端要怎么优化交互响应」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 INP 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- INP：INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98。
- 交互：FID 只看首次输入，INP 看所有交互，是更严格的指标。

#### 风险与验收

- 主要风险：INP 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：FID 只看首次输入，INP 看所有交互，是更严格的指标。

## inp-deep-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 INP 调整「INP 取代 FID 后，前端要怎么优化交互响应」的推进顺序
difficulty: 资深
tags: [INP, 交互, 追问]
parent: inp-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 INP 调整「INP 取代 FID 后，前端要怎么优化交互响应」的推进顺序？

### 答案要点

#### 直答

- 结论：「INP 取代 FID 后，前端要怎么优化交互响应」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：把「INP 取代 FID 后，前端要怎么优化交互响应」里的 INP 取代 FID 后 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- INP：INP（Interaction to Next Paint）：从用户输入到下一帧渲染完成的最长延迟，整页生命周期内取 P98。
- FID：FID 只看首次输入，INP 看所有交互，是更严格的指标。
- 交互：FID 只看首次输入，INP 看所有交互，是更严格的指标。

#### 风险与验收

- 主要风险：INP 取代 FID 后 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：FID 只看首次输入，INP 看所有交互，是更严格的指标。

## performance-warroom-decision-brief

title: 性能战情室决策简报：技术指标如何翻译成业务拍板语言
difficulty: 资深
tags: [性能治理, 决策沟通, 发布]
followups: [performance-warroom-decision-brief-followup-1, performance-warroom-decision-brief-followup-2, performance-warroom-decision-brief-followup-3]

### 一句话

这题回答要覆盖 性能治理 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

大促前夜，核心页面 INP 与错误率同时恶化。业务方问“要不要立刻降级某些动效和推荐模块”。作为技术负责人，你会怎么组织 15 分钟内可拍板的性能决策简报？

### 答案要点

- 先给一句结论：当前风险等级、建议动作、预计影响范围，避免先堆监控细节。
- 用统一口径翻译指标：把 INP、LCP、错误率映射到转化、下单成功率、客服投诉量。
- 给出 A/B 两套决策选项：A 保守止损（先降级），B 激进修复（继续观察），并写清触发阈值。
- 决策链要明确：谁拍板、谁执行、谁同步业务，避免“大家都同意但没人动手”。

#### 工程化补充

- 场景前提：回答 性能战情室决策简报：技术指标如何翻译成业务拍板语言 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：围绕 性能治理 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 性能战情室决策简报：技术指标如何翻译成业务拍板语言 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
type WarRoomSignal = {
  inpP75: number;
  errorRate: number;
  conversionDrop: number;
};

type Decision = 'observe' | 'degrade' | 'rollback';

function decideAction(s: WarRoomSignal): Decision {
  if (s.errorRate >= 0.02 || s.conversionDrop >= 0.03) return 'rollback';
  if (s.inpP75 >= 350) return 'degrade';
  return 'observe';
}
```

```yaml
warroom_brief:
  update_interval_min: 5
  required_fields:
    - current_risk
    - suggested_action
    - business_impact
    - trigger_threshold
  escalation:
    owner: tech_lead
    approver: incident_commander
```

### 追问

- 「性能战情室决策简报：技术指标如何翻译成业务拍板语言」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 简报里只有指标截图，没有明确建议和触发阈值。
- 技术和业务使用不同口径，导致同一个数据得出相反结论。
- 决策后没人负责回看，造成“临时止损”长期化。

### 延伸

- 可以沉淀战情室“30 秒口头简报模板”，减少高压沟通成本。
- 建议把业务指标和性能指标放在同一看板，避免单维度优化。

## performance-budget-exception-governance

title: 性能预算例外治理：业务窗口、临时放行与到期回收机制
difficulty: 资深
tags: [预算治理, 技术债, 发布策略]
followups: [performance-budget-exception-governance-followup-1, performance-budget-exception-governance-followup-2, performance-budget-exception-governance-followup-3]

### 一句话

这题的高分关键是把 预算治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

大促期间某功能上线带来明显 GMV 提升，但会让首屏 JS 超预算 18%。你会如何设计“临时放行”机制，让业务能冲刺、技术债也不会失控？

### 答案要点

- 先定义例外准入条件：业务收益可量化、风险可观测、回收计划可执行，三项缺一不可。
- 例外必须“带到期日”：放行不是免责，超过窗口自动触发回收评审。
- 预算超线要分级：轻度超线允许灰度，重度超线必须绑定降级开关和回滚条件。
- 决策记录要可追溯：谁批准、基于什么证据、承诺何时回补写进 ADR/发布单。

#### 工程化补充

- 场景前提：性能预算例外治理：业务窗口、临时放行与到期回收机制 只有在瓶颈被数据证实时才值得推进；先确认 预算治理 是否真是主耗时来源。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 性能预算例外治理：业务窗口、临时放行与到期回收机制 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
type BudgetException = {
  overBudgetPercent: number;
  expectedBizGain: number;
  expiresInDays: number;
};

function canGrantException(e: BudgetException) {
  return e.expectedBizGain >= 0.05 && e.overBudgetPercent <= 20 && e.expiresInDays <= 30;
}
```

```yaml
performance_exception_policy:
  require:
    - measurable_business_gain
    - rollback_switch_ready
    - debt_repay_plan
  auto_recheck_after_days: 14
  auto_block_after_days: 30
```

### 追问

- 「性能预算例外治理：业务窗口、临时放行与到期回收机制」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看短期业务收益，不看长期性能债利息。
- 放行单写了“后续优化”，但没有 owner 和时间承诺。
- 预算例外审批没有统一口径，导致团队对规则失去信任。

### 延伸

- 可将预算例外和发布闸门联动，自动提醒临近到期项。
- 建议季度复盘“例外白名单”，持续压缩技术债存量。

## performance-warroom-decision-brief-followup-1

title: 追问：战情室沟通最容易失灵的边界条件是什么
difficulty: 资深
tags: [性能治理, 决策沟通, 发布, 追问]
parent: performance-warroom-decision-brief
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：高压性能战情室里，哪些边界条件最容易让沟通失灵？你会怎么提前兜住？

### 答案要点

#### 直答

- 结论：上线 性能战情室决策简报 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先给一句结论：当前风险等级、建议动作、预计影响范围，避免先堆监控细节。

#### 术语解释

- 性能治理：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，性能治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 决策沟通：围绕「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里的 决策沟通 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 发布：围绕「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里的 发布 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 性能战情室决策简报 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 性能战情室决策简报 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## performance-warroom-decision-brief-followup-2

title: 追问：你如何证明战情室简报确实让决策更快
difficulty: 资深
tags: [性能治理, 决策沟通, 发布, 追问]
parent: performance-warroom-decision-brief
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说战情室简报有效，怎么证明它让决策更快、更稳，而不是信息更多更乱？

### 答案要点

#### 直答

- 结论：把 性能战情室决策简报 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先给一句结论：当前风险等级、建议动作、预计影响范围，避免先堆监控细节。

#### 术语解释

- 性能治理：围绕「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里的 性能治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 决策沟通：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，决策沟通 是验收对象，必须给可量化指标、日志信号和测试证据。
- 发布：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，发布 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，性能战情室决策简报 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，性能战情室决策简报 至少要给一组指标阈值、一条日志证据和一组测试结果。

## performance-warroom-decision-brief-followup-3

title: 追问：当业务收益与性能风险冲突时你如何拍板
difficulty: 资深
tags: [性能治理, 决策沟通, 发布, 追问]
parent: performance-warroom-decision-brief
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：业务方希望继续放量，但性能风险在升高，你会怎么给出可执行的拍板建议？

### 答案要点

#### 直答

- 结论：上线 性能战情室决策简报 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先给一句结论：当前风险等级、建议动作、预计影响范围，避免先堆监控细节。

#### 术语解释

- 性能治理：围绕「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里的 性能治理 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 决策沟通：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，决策沟通 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 发布：在「性能战情室决策简报：技术指标如何翻译成业务拍板语言」里，发布 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 性能战情室决策简报 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 性能战情室决策简报 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## performance-budget-exception-governance-followup-1

title: 追问：你会盯哪几类指标判断预算例外还值不值得继续
difficulty: 资深
tags: [预算治理, 技术债, 发布策略, 追问]
parent: performance-budget-exception-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：预算例外放行后，你会看哪些关键指标判断它是否还能继续，而不是应该立即回收？

### 答案要点

#### 直答

- 结论：先定义 临时放行 与 到期回收机制 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：预算超线要分级：轻度超线允许灰度，重度超线必须绑定降级开关和回滚条件。

#### 术语解释

- 预算治理：在「性能预算例外治理：业务窗口、临时放行与到期回收机制」里，预算治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 技术债：围绕「性能预算例外治理：业务窗口、临时放行与到期回收机制」里的 技术债 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 发布策略：围绕「性能预算例外治理：业务窗口、临时放行与到期回收机制」里的 发布策略 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「性能预算例外治理：业务窗口、临时放行与到期回收机制」里，临时放行 与 到期回收机制 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「性能预算例外治理：业务窗口、临时放行与到期回收机制」里，临时放行 与 到期回收机制 至少要给一组指标阈值、一条日志证据和一组测试结果。

## performance-budget-exception-governance-followup-2

title: 追问：你如何定义预算例外“到期回收”是否达标
difficulty: 资深
tags: [预算治理, 技术债, 发布策略, 追问]
parent: performance-budget-exception-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：预算例外写了到期回收，你会怎么定义“回收达标”，并防止它变成一句口号？

### 答案要点

#### 直答

- 结论：先把 临时放行 与 到期回收机制 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：预算超线要分级：轻度超线允许灰度，重度超线必须绑定降级开关和回滚条件。

#### 术语解释

- 预算治理：围绕「性能预算例外治理：业务窗口、临时放行与到期回收机制」里的 预算治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 技术债：在「性能预算例外治理：业务窗口、临时放行与到期回收机制」这题里，技术债 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 发布策略：在「性能预算例外治理：业务窗口、临时放行与到期回收机制」这题里，发布策略 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 临时放行 与 到期回收机制 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：临时放行 与 到期回收机制 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## performance-budget-exception-governance-followup-3

title: 追问：预算例外越积越多时你怎么分批清债不伤业务
difficulty: 资深
tags: [预算治理, 技术债, 发布策略, 追问]
parent: performance-budget-exception-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当预算例外积累太多，你会怎么拆分清债路径，既不拖业务节奏也不继续放大技术债？

### 答案要点

#### 直答

- 结论：先画出 临时放行 与 到期回收机制 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：预算超线要分级：轻度超线允许灰度，重度超线必须绑定降级开关和回滚条件。

#### 术语解释

- 预算治理：在「性能预算例外治理：业务窗口、临时放行与到期回收机制」这题里，预算治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 技术债：围绕「性能预算例外治理：业务窗口、临时放行与到期回收机制」里的 技术债 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 发布策略：围绕「性能预算例外治理：业务窗口、临时放行与到期回收机制」里的 发布策略 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：临时放行 与 到期回收机制 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 临时放行 与 到期回收机制 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。
