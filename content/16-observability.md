---
id: 16-observability
title: 可观测性
order: 16
icon: 📈
description: 错误监控、RUM、埋点、会话回放、日志与告警体系。
---

## error-capture

title: 前端错误捕获链路应该怎么搭
followups: [error-capture-followup-1, error-capture-followup-2, error-capture-followup-3]
links: [21-interview-special/design-monitoring-sdk]
difficulty: 基础
tags: [错误监控, ErrorBoundary]

### 一句话

运行时脚本错误可由 window.onerror 捕获；未处理 Promise 异常由 unhandledrejection 捕获；Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary。

### 题目

前端有哪些常见错误来源？`window.onerror`、`unhandledrejection`、框架级错误边界各能兜到什么？

### 答案要点

- 运行时脚本错误可由 `window.onerror` 捕获
- 未处理 Promise 异常由 `unhandledrejection` 捕获
- Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary
- 资源加载失败、跨域脚本、Worker 错误、SSR 异常都需要额外关注

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端错误捕获链路应该 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端错误捕获链路应该，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端错误捕获链路应该怎么搭」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
// 1. 全局 JS 错误
window.addEventListener(
  'error',
  (e) => {
    // ⚠️ 资源加载错误（img/script 失败）也走这里，需要区分
    if (e.target && e.target !== window) {
      report({ type: 'resource', src: (e.target as any).src || (e.target as any).href });
      return;
    }
    report({
      type: 'js',
      message: e.message,
      filename: e.filename,
      line: e.lineno,
      col: e.colno,
      stack: e.error?.stack,
    });
  },
  true,
); // ⚠️ 必须 capture: true 才能收到资源错误

// 2. Promise 未捕获
window.addEventListener('unhandledrejection', (e) => {
  report({ type: 'unhandled', reason: String(e.reason), stack: e.reason?.stack });
});

// 3. Vue 框架级 errorHandler
import { createApp } from 'vue';
const app = createApp(App);
app.config.errorHandler = (err, instance, info) => {
  report({ type: 'vue', err, info, component: instance?.$options.name });
};

// 4. 跨域脚本能拿到详细堆栈：HTML 加 crossorigin + 服务端 CORS
// <script src="https://cdn.com/main.js" crossorigin="anonymous"></script>

function report(data: any) {
  navigator.sendBeacon(
    '/api/error',
    JSON.stringify({
      ...data,
      ts: Date.now(),
      url: location.href,
      ua: navigator.userAgent,
      version: import.meta.env.VITE_APP_VERSION,
    }),
  );
}
```

### 追问

- 推动「前端错误捕获链路应该怎么搭」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端错误捕获链路应该怎么搭」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 错误监控、ErrorBoundary，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 错误采集不是越多越好，去重和上下文质量同样重要
- 某些跨域脚本若没有正确的 CORS / `crossorigin` 配置，浏览器暴露给前端的错误信息会非常有限

## source-map-symbolicate

title: Source Map 上传与错误还原
followups: [source-map-symbolicate-followup-1, source-map-symbolicate-followup-2, source-map-symbolicate-followup-3]
difficulty: 进阶
tags: [SourceMap, Sentry]

### 一句话

生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量；需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原；要保证发布版本、commit、产物 hash、环境信息能对齐。

### 题目

为什么线上错误堆栈经常看不懂？Source Map 平台化接入时要注意什么？

### 答案要点

- 生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原
- 要保证发布版本、commit、产物 hash、环境信息能对齐

#### 补充说明

- 面试中不要只停留在「Source Map 上传与错误还原」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 SourceMap、Sentry 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Source Map 上传与错误还原」时要把 Source 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Source 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Source Map 上传与错误还原」里当前按阶段替换更稳。

### 代码示例

```bash
# Sentry 上传 sourcemap
sentry-cli releases new "$VERSION"
sentry-cli releases set-commits "$VERSION" --auto
sentry-cli sourcemaps upload \
  --release="$VERSION" \
  --url-prefix="~/assets/" \
  ./dist/assets

# 上传后从产物中移除 .map（避免被攻击者直接下载）
find dist -name "*.map" -delete

sentry-cli releases finalize "$VERSION"
```

```ts
// 应用初始化：注入版本号
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_APP_VERSION,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // 脱敏：移除可能含敏感信息的 URL 参数
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/g, 'token=***');
    }
    return event;
  },
});
```

### 追问

- 「Source Map 上传与错误还原」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Source Map 上传与错误还原」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SourceMap、Sentry，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- sourcemap 上传失败，往往不是"小问题"，会直接让故障排查效率腰斩

## rum-web-vitals

title: RUM 与 Web Vitals 才能告诉你真实用户体验
followups: [rum-web-vitals-followup-1, rum-web-vitals-followup-2, rum-web-vitals-followup-3]
links: [08-performance/core-web-vitals, 08-performance/rum-vs-lab, lcp-rum-collection]
difficulty: 进阶
tags: [RUM, WebVitals]

### 一句话

Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异；RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等；还应关联版本号、路由、设备、浏览器、地域、登录态等上下文。

### 题目

为什么只看 Lighthouse 报告不够？RUM 应该收哪些最有价值的指标？

### 答案要点

- Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等
- 还应关联版本号、路由、设备、浏览器、地域、登录态等上下文

#### 补充说明

- 面试中不要只停留在「RUM 与 Web Vitals 才能告诉你真实用户体验」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 RUM、WebVitals 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「RUM 与 Web Vitals 才能告诉你真实用户体验」时要把 RUM 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，RUM 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「RUM 与 Web Vitals 才能告诉你真实用户体验」里当前按阶段替换更稳。

### 代码示例

```ts
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

interface RumPayload {
  metric: string;
  value: number;
  id: string;
  page: string;
  version: string;
  ua: string;
  network?: string;
  user?: string;
}

function send(metric: any) {
  const payload: RumPayload = {
    metric: metric.name,
    value: Math.round(metric.value),
    id: metric.id,
    page: location.pathname,
    version: import.meta.env.VITE_APP_VERSION,
    ua: navigator.userAgent,
    network: (navigator as any).connection?.effectiveType,
    user: getUserId(),
  };
  navigator.sendBeacon('/api/rum', JSON.stringify(payload));
}

onLCP(send);
onINP(send);
onCLS(send);
onFCP(send);
onTTFB(send);

// 白屏检测：监控关键容器是否在 N 秒内有内容
setTimeout(() => {
  const root = document.querySelector('#app');
  const isBlank = !root || root.children.length === 0 || root.textContent?.trim() === '';
  if (isBlank) send({ name: 'blank-screen', value: 1, id: '' });
}, 5000);
```

### 追问

- 「RUM 与 Web Vitals 才能告诉你真实用户体验」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「RUM 与 Web Vitals 才能告诉你真实用户体验」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 RUM、WebVitals，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 指标如果不能按版本、页面和人群切开看，价值会大打折扣
- `PerformanceObserver` 能提供大量基础信号，但要注意不同条目类型支持差异、缓冲区上限和条目丢失

## event-model

title: 埋点模型设计：事件、属性、上下文、会话
followups: [event-model-followup-1, event-model-followup-2, event-model-followup-3]
difficulty: 进阶
tags: [埋点, 数据模型]

### 一句话

要有稳定事件命名、属性字典、用户上下文和版本上下文；事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名；埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”。

### 题目

为什么埋点经常“越埋越乱”？一个可持续的数据模型至少要包含什么？

### 答案要点

- 要有稳定事件命名、属性字典、用户上下文和版本上下文
- 事件语义必须可解释，避免一堆 `click_button_1` 这类不可维护命名
- 埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”

#### 补充说明

- 面试中不要只停留在「埋点模型设计：事件、属性、上下文、会话」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 埋点、数据模型 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 埋点模型设计 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 埋点模型设计，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「埋点模型设计：事件、属性、上下文、会话」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
// 1. 统一事件模型
interface TrackEvent {
  // 必填字段
  event: string; // 事件名：'page_view' / 'order_pay'
  category: 'page' | 'click' | 'api' | 'business';
  ts: number;
  sessionId: string;
  userId?: string;

  // 上下文（自动注入）
  page: string;
  version: string;
  ua: string;

  // 业务属性（事件相关）
  props?: Record<string, any>;
}

// 2. 事件字典（编译期约束 + 类型推导）
type EventMap = {
  page_view: { from?: string; to: string };
  click_signup: { source: 'header' | 'banner' };
  order_pay: { orderId: string; amount: number; method: string };
};

class Tracker {
  track<K extends keyof EventMap>(event: K, props: EventMap[K]) {
    const payload: TrackEvent = {
      event,
      category: this.categorize(event),
      ts: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      page: location.pathname,
      version: import.meta.env.VITE_APP_VERSION,
      ua: navigator.userAgent,
      props,
    };
    this.queue.push(payload);
    this.flushDebounced();
  }

  private categorize(event: string): TrackEvent['category'] {
    if (event.startsWith('page_')) return 'page';
    if (event.startsWith('click_')) return 'click';
    return 'business';
  }

  private flushDebounced = debounce(() => {
    if (!this.queue.length) return;
    navigator.sendBeacon('/api/track', JSON.stringify(this.queue));
    this.queue = [];
  }, 1000);
}
```

### 追问

- 推动「埋点模型设计：事件、属性、上下文、会话」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「埋点模型设计：事件、属性、上下文、会话」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 埋点、数据模型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 数据建模能力，是前端做增长和分析系统时的核心竞争力之一
- 事件字典、埋点版本和淘汰机制若不治理，后期分析口径会迅速失真

## reporting-channel

title: Beacon、fetch keepalive 与监控上报通道怎么选
followups: [reporting-channel-followup-1, reporting-channel-followup-2, reporting-channel-followup-3]
difficulty: 进阶
tags: [Beacon, keepalive, 上报]

### 一句话

sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达；sendBeacon() 只适合小体积、POST、不关心响应内容的上报；如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用。

### 题目

前端监控为什么经常偏爱 `navigator.sendBeacon()`？什么时候又该改用 `fetch(..., { keepalive: true })`？

### 答案要点

- `sendBeacon()` 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- `sendBeacon()` 只适合小体积、`POST`、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，`fetch` 搭配 `keepalive: true` 更灵活
- 无论哪种方式，都要考虑限流、采样、失败重试和离线场景补偿，避免监控反过来影响页面性能

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Beacon 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Beacon，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「Beacon、fetch keepalive 与监控上报通道怎么选」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
// 1. sendBeacon：页面卸载时发送（推荐方式）
function reportOnHidden(data: any) {
  // visibilitychange 比 unload 更可靠（移动端 unload 不一定触发）
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      navigator.sendBeacon('/api/track', JSON.stringify(data));
    }
  });
}

// 2. fetch keepalive：需要自定义请求头/方法时
async function reportWithFetch(data: any) {
  await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Token': token },
    body: JSON.stringify(data),
    keepalive: true, // 页面关闭也能发完
  });
}

// 3. 批量 + 节流：避免请求风暴
class Reporter {
  private queue: any[] = [];
  private timer: any = null;

  push(data: any) {
    this.queue.push(data);
    if (this.queue.length >= 20) this.flush();
    else if (!this.timer) this.timer = setTimeout(() => this.flush(), 5000);
  }

  flush(sync = false) {
    if (!this.queue.length) return;
    const batch = this.queue.splice(0);
    clearTimeout(this.timer);
    this.timer = null;

    const data = JSON.stringify(batch);
    if (sync && navigator.sendBeacon) navigator.sendBeacon('/api/track', data);
    else
      fetch('/api/track', { method: 'POST', body: data, keepalive: true }).catch(() =>
        this.queue.unshift(...batch),
      ); // 失败回填重试
  }
}
```

### 追问

- 推动「Beacon、fetch keepalive 与监控上报通道怎么选」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Beacon、fetch keepalive 与监控上报通道怎么选」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 Beacon、keepalive、上报，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- "页面关闭前再发一次"不是万能兜底，设计上仍应尽量把关键事件及时上报
- 上报链路本身也应被监控，否则你可能长期不知道监控已经失效

## session-replay-alert

title: 会话回放、采样与告警阈值
followups: [session-replay-alert-followup-1, session-replay-alert-followup-2, session-replay-alert-followup-3]
difficulty: 进阶
tags: [SessionReplay, 告警]

### 一句话

会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏；告警阈值太低会噪音泛滥，太高又会错过故障；常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警。

### 题目

会话回放和告警为什么都不能“全量开最大”？

### 答案要点

- 会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 告警阈值太低会噪音泛滥，太高又会错过故障
- 常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警

#### 补充说明

- 面试中不要只停留在「会话回放、采样与告警阈值」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 SessionReplay、告警 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「会话回放、采样与告警阈值」时要把 会话回放 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，会话回放 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「会话回放、采样与告警阈值」里当前按阶段替换更稳。

### 代码示例

```ts
// 会话回放采样（rrweb 简化集成）
import * as rrweb from 'rrweb';

// 仅对错误用户采样：所有用户 1%，触发错误后切到 100% 采集
const SAMPLE_RATE = 0.01;
let recording = Math.random() < SAMPLE_RATE;
const events: any[] = [];
let stop: (() => void) | undefined;

if (recording) startRecording();

window.addEventListener('error', () => {
  if (!recording) {
    recording = true;
    startRecording();
  }
  // 上报错误时附带最近 30 秒的回放
  reportSession(events.filter((e) => e.timestamp > Date.now() - 30_000));
});

function startRecording() {
  stop = rrweb.record({
    emit(event) {
      events.push(event);
    },
    maskAllInputs: true, // 输入框脱敏
    maskTextSelector: '[data-pii]', // 显式标记的元素脱敏
    blockClass: 'rr-block',
    sampling: { mousemove: 100, scroll: 200 }, // 降低采样
  });
}
```

```yaml
# Prometheus 多维度告警示例
- alert: FrontendErrorRateHigh
  expr: |
    sum(rate(frontend_js_errors_total[5m])) by (page, version)
    /
    sum(rate(frontend_pageviews_total[5m])) by (page, version)
    > 0.02
  for: 10m
  labels: { severity: warning, owner: web-team }
  annotations:
    summary: '{{ $labels.page }} 错误率 > 2%'
```

### 追问

- 「会话回放、采样与告警阈值」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「会话回放、采样与告警阈值」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SessionReplay、告警，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 告警系统最怕"大家都知道它在响，但没人信它"
- 告警要明确 owner、升级路径和静默规则，否则再好的采集也很难形成真正闭环

## privacy-compliance

title: 可观测性与隐私合规的平衡
followups: [privacy-compliance-followup-1, privacy-compliance-followup-2, privacy-compliance-followup-3]
difficulty: 进阶
tags: [隐私合规, GDPR]

### 一句话

用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息；采集前要做脱敏、白名单、最小必要原则；不同地区对 Cookie、追踪、会话回放有不同合规要求。

### 题目

为什么说监控系统本身也可能成为隐私风险源？

### 答案要点

- 用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 采集前要做脱敏、白名单、最小必要原则
- 不同地区对 Cookie、追踪、会话回放有不同合规要求

#### 补充说明

- 面试中不要只停留在「可观测性与隐私合规的平衡」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 隐私合规、GDPR 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 可观测性与隐私合规的 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 可观测性与隐私合规的，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「可观测性与隐私合规的平衡」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
// 1. URL 与请求体脱敏
const SENSITIVE = /(token|password|phone|email|idcard)=[^&]+/gi;

function sanitizeUrl(url: string) {
  return url.replace(SENSITIVE, (_, key) => `${key}=***`);
}

function sanitizeBody(body: any) {
  if (typeof body !== 'object') return body;
  const out: any = Array.isArray(body) ? [] : {};
  for (const [k, v] of Object.entries(body)) {
    if (/(password|token|secret|phone|idcard)/i.test(k)) out[k] = '***';
    else if (typeof v === 'object' && v) out[k] = sanitizeBody(v);
    else out[k] = v;
  }
  return out;
}

// 2. DOM 脱敏（rrweb / SessionReplay）
// 显式给敏感节点加属性，回放工具会自动遮挡
// <input type="password" data-pii />
// <div data-pii>{{ user.idCard }}</div>

// 3. Cookie 同意（GDPR）：未同意前不上报
const consent = localStorage.getItem('analytics-consent') === 'yes';
if (!consent) {
  showConsentBanner({
    onAccept: () => {
      localStorage.setItem('analytics-consent', 'yes');
      initAnalytics();
    },
    onReject: () => localStorage.setItem('analytics-consent', 'no'),
  });
} else {
  initAnalytics();
}
```

### 追问

- 推动「可观测性与隐私合规的平衡」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「可观测性与隐私合规的平衡」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 隐私合规、GDPR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 监控不是法外之地，越成熟的团队越重视数据采集边界

## opentelemetry-frontend

title: OpenTelemetry 在前端的接入
followups: [opentelemetry-frontend-followup-1, opentelemetry-frontend-followup-2, opentelemetry-frontend-followup-3]
links: [11-ai-frontend/llm-observability-and-tracing]
difficulty: 资深
tags: [OpenTelemetry, Trace]

### 一句话

SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load；出口：OTLP HTTP / gRPC。

### 题目

后端常用 OpenTelemetry 做分布式追踪，前端怎么接入并把链路打通？

### 答案要点

- SDK：`@opentelemetry/sdk-trace-web` + `@opentelemetry/instrumentation-fetch / xml-http-request / document-load`
- 出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog
- TraceContext：fetch 自动注入 `traceparent` header，后端继续传播形成端到端 span
- 用户行为 span：路由切换、关键交互埋成 span，便于回溯
- 采样：默认全采本地 dev，生产采样率 5%–10%；错误请求 100% 采
- 隐私：URL / 参数中的 PII 要 redact，避免外泄

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「OpenTelemetry 在前端的接入」时要把 OpenTelemetry 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，OpenTelemetry 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「OpenTelemetry 在前端的接入」里当前按阶段替换更稳。

### 代码示例

```ts
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

const provider = new WebTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(new OTLPTraceExporter({ url: '/otlp/v1/traces' })),
);
provider.register({ contextManager: new ZoneContextManager() });

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({ propagateTraceHeaderCorsUrls: [/.*api\.example\.com.*/] }),
    new DocumentLoadInstrumentation(),
  ],
});

const tracer = provider.getTracer('app');
function trackRouteChange(to: string) {
  const span = tracer.startSpan('route.change', { attributes: { to } });
  span.end();
}
```

### 追问

- 「OpenTelemetry 在前端的接入」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「OpenTelemetry 在前端的接入」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 OpenTelemetry、Trace，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 配合 RUM 还可以聚合 user journey，定位"特定路径下错误率高"的原因
- 前端 trace 量大、价值密度低，建议用尾采样（tail sampling）+ 错误优先

## frontend-feature-flag

title: 前端 A/B 测试与特性开关的工程实现
followups: [frontend-feature-flag-followup-1, frontend-feature-flag-followup-2, frontend-feature-flag-followup-3]
links: [10-architecture/feature-flag]
difficulty: 进阶
tags: [Feature Flag, A/B]

### 一句话

决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash；SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送；缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端。

### 题目

特性开关 / A/B 实验在前端怎么做，才能既灵活又不影响性能 / 体验？

### 答案要点

- 决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送
- 缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端
- 实验分桶：按 user / device 哈希分桶，保证同一用户看同一版本
- 观测：实验上线必须埋曝光 / 转化事件，结合后端核心指标做归因
- 代码治理：flag 有"创建-试验-决策-清理"生命周期，老 flag 要定期回收

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 前端 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 前端 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「前端 A/B 测试与特性开关的工程实现」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

### 代码示例

```ts
type Variant = 'control' | 'a' | 'b';
type Flags = Record<string, Variant | boolean>;

interface Ctx {
  userId: string;
  country: string;
  deviceType: 'mobile' | 'desktop';
}

function hashBucket(input: string, salt: string): number {
  let h = 0;
  for (const c of input + salt) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 100;
}

export function evaluate(
  ctx: Ctx,
  definitions: Record<string, { rollout: number; variants: Variant[] }>,
): Flags {
  const out: Flags = {};
  for (const [key, def] of Object.entries(definitions)) {
    const bucket = hashBucket(ctx.userId, key);
    if (bucket >= def.rollout) {
      out[key] = false;
      continue;
    }
    const idx = bucket % def.variants.length;
    out[key] = def.variants[idx];
  }
  return out;
}

export function trackExposure(flag: string, variant: Variant | boolean) {
  navigator.sendBeacon('/exp/exposure', JSON.stringify({ flag, variant, ts: Date.now() }));
}
```

### 追问

- 针对「前端 A/B 测试与特性开关的工程实现」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「前端 A/B 测试与特性开关的工程实现」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 Feature Flag、A/B，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要把所有 flag 都丢同一个对象，否则任何一个 flag 变更全站都要重渲染
- 实验设计需要数据团队配合，前端只负责"正确分桶 + 正确埋点"

## frontend-error-monitor

title: 前端如何全链路捕获错误并上报
followups: [frontend-error-monitor-followup-1, frontend-error-monitor-followup-2, frontend-error-monitor-followup-3]
difficulty: 进阶
tags: [监控, 错误]

### 一句话

五条线把错误捕全：`window.onerror`（同步 JS 错）+ `unhandledrejection`（Promise）+ ErrorBoundary（React 渲染）+ resource onerror（图片/脚本加载失败）+ console.error 拦截。然后 sourcemap 还原 + 上报。

### 题目

做一个完整的前端错误监控系统需要捕获哪些类型的错误？关键链路有哪些？

### 答案要点

- **同步 JS 异常**：`window.addEventListener('error', e => ...)`（注意第 3 个参数 `useCapture=true` 才能捕获资源加载错误）
- **未处理的 Promise rejection**：`window.addEventListener('unhandledrejection', e => e.reason)`
- **资源加载失败**（img/script/link）：`error` 事件冒泡不上来，必须捕获阶段监听
- **框架渲染错误**：React 的 ErrorBoundary、Vue 的 `app.config.errorHandler`、Next.js error.tsx
- **网络请求错误**：拦截 fetch / xhr，记录 URL / 状态码 / 耗时（4xx 5xx 算业务错误）
- **白屏检测**：通过定期检查根节点是否有内容、Performance 指标 LCP 是否上报
- **Source Map**：构建产物 sourcemap 上传到监控平台（Sentry / 自建），上报时只传 stack + line/column
- **采样策略**：低频错误 100% 上报，高频用 fingerprint 聚合 + 采样
- **联动**：错误带上 traceId 与后端 APM 串联（OpenTelemetry）

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端如何全链路捕获错 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端如何全链路捕获错，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端如何全链路捕获错误并上报」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```js
window.addEventListener(
  'error',
  (e) => {
    if (
      e.target &&
      (e.target instanceof HTMLImageElement || e.target instanceof HTMLScriptElement)
    ) {
      report({ type: 'resource', url: e.target.src, tag: e.target.tagName });
    } else {
      report({
        type: 'js',
        message: e.message,
        stack: e.error?.stack,
        file: e.filename,
        line: e.lineno,
      });
    }
  },
  true,
);

window.addEventListener('unhandledrejection', (e) => {
  report({ type: 'promise', reason: String(e.reason), stack: e.reason?.stack });
});

const _fetch = window.fetch;
window.fetch = async (...args) => {
  const start = performance.now();
  try {
    const res = await _fetch(...args);
    if (!res.ok) report({ type: 'http', status: res.status, url: args[0] });
    return res;
  } catch (e) {
    report({ type: 'network', url: String(args[0]), error: String(e) });
    throw e;
  } finally {
    const cost = performance.now() - start;
    if (cost > 5000) report({ type: 'slow_api', url: args[0], cost });
  }
};

function report(data) {
  navigator.sendBeacon('/rum', JSON.stringify({ ...data, ts: Date.now() }));
}
```

### 追问

- 推动「前端如何全链路捕获错误并上报」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端如何全链路捕获错误并上报」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 监控、错误，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Sentry / Bugsnag / 阿里 ARMS / 字节 Slardar 都是成熟方案
- 大型应用建议自建：上报量大、字段定制多
- AI 时代可对错误聚合做"自动归因"，找最近一次代码改动

## white-screen-detection

title: 前端白屏怎么检测？
followups: [white-screen-detection-followup-1, white-screen-detection-followup-2, white-screen-detection-followup-3]
difficulty: 资深
tags: [可观测性, 监控, 高频]

### 一句话

不能简单看"DOM 是不是空"，要多信号组合：① 关键 DOM 节点存在（document.querySelector 命中）+ ② 视口内有内容像素（采样几个点取色）+ ③ FCP / LCP 上报时间到了；任一不满足才判白屏，避免误报。

### 题目

线上偶发"用户打开页面什么都没有"，怎么自动检测和定位白屏？

### 答案要点

- **白屏成因**
  - JS 致命错误（首屏 chunk 报错）
  - 网络资源加载失败（CDN 挂 / 网络拦截）
  - 渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）
  - CSP 拦截 / 浏览器扩展干扰
  - 路由错误 / 404 fallback 失效
- **检测方法（多信号组合）**
  - **DOM 检查**：load 后延迟 3s 检查 `document.querySelector('#app')` 子节点数量、文本长度
  - **像素采样**：用 `elementsFromPoint` 在视口选 9 个点（井字格），看是否都命中 body / html
  - **关键元素**：业务约定一个标识，如 `<div data-app-mounted>`，没出现 = 白屏
  - **性能 API**：FCP / LCP 是否触发；超时未触发 = 白屏
- **实现**
  - 在 `<head>` 顶部塞一个守护脚本（不依赖打包产物），setTimeout 3s 后做检查
  - 命中疑似白屏 → 上报 + 收集环境信息（UA / 网络 / 路由 / 错误日志）
  - 可选：自动 reload 一次（前提：白屏检测有 99%+ 准确度，否则会循环刷新）
- **关联错误归因**
  - 同一 sessionId 下查全局 error / 资源 error / unhandledrejection
  - 关联 RUM 数据（FCP / LCP / TTFB）
  - 上下文信息：分页 URL / 用户 ID / 实验分组 / 灰度版本号
- **降级 / 兜底**
  - 主 chunk fail → SW 兜底缓存的旧版本
  - 关键资源 retry：`<script onerror>` 切换 fallback CDN
  - HTML 自带"加载失败"骨架，配合 navigator.onLine 提示

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端白屏怎么检测 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端白屏怎么检测，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端白屏怎么检测」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```html
<script>
  (function () {
    setTimeout(function () {
      var app = document.getElementById('app');
      var hasContent = app && app.children.length > 0 && (app.innerText || '').length > 5;
      var hits = 0;
      var w = innerWidth,
        h = innerHeight;
      [
        [w / 4, h / 4],
        [w / 2, h / 4],
        [(3 * w) / 4, h / 4],
        [w / 4, h / 2],
        [w / 2, h / 2],
        [(3 * w) / 4, h / 2],
        [w / 4, (3 * h) / 4],
        [w / 2, (3 * h) / 4],
        [(3 * w) / 4, (3 * h) / 4],
      ].forEach(function (p) {
        var el = document.elementFromPoint(p[0], p[1]);
        if (el && el !== document.body && el !== document.documentElement) hits++;
      });
      var fcp = performance.getEntriesByType('paint').find(function (e) {
        return e.name === 'first-contentful-paint';
      });
      var isWhite = !hasContent && hits < 3 && !fcp;
      if (isWhite) {
        navigator.sendBeacon(
          '/api/whitescreen',
          JSON.stringify({
            url: location.href,
            ua: navigator.userAgent,
            ts: Date.now(),
          }),
        );
      }
    }, 3000);
  })();
</script>
```

### 追问

- 推动「前端白屏怎么检测」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端白屏怎么检测？」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 可观测性、监控、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 视频回放（rrweb / LogRocket）能直接看用户白屏画面
- 配合"健康检查页"：每分钟 ping 真实页面，自动报警

## ab-experiment-frontend

title: 前端怎么承接 A/B 实验？
followups: [ab-experiment-frontend-followup-1, ab-experiment-frontend-followup-2, ab-experiment-frontend-followup-3]
difficulty: 进阶
tags: [可观测性, 实验, 高频]

### 一句话

SDK 拉取实验分流（用户 ID hash 分桶）→ 业务通过 `useExperiment('exp_id')` 拿到当前 variant → 按 variant 渲染不同 UI → 关键事件埋点带 expId/variantId → 后端做指标差异显著性检验。

### 题目

PM 想测试两个落地页的转化率差异。前端怎么落地 A/B 实验？

### 答案要点

- **分流逻辑**
  - 服务端分流：基于 user_id hash 取模，stick 用户在一个桶
  - 边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁
  - 客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）
- **SDK 接口**
  - `useExperiment(expId): { variant, isControl }`
  - 同步获取（缓存第一次结果）；首次请求做超时降级（拿不到当 control）
  - 强制覆盖：URL 参数 `?exp_xxx=variant_b` 方便 QA
- **埋点**
  - 关键事件（曝光、点击、转化）必须带 `expId`、`variantId`
  - 曝光埋点：用户**实际看到**实验位才算曝光（用 IntersectionObserver）
  - 不要把实验分组放页面参数里 leak 给 SEO
- **避免 SRM**
  - SRM = Sample Ratio Mismatch：实际分桶比例与期望偏差大 → 数据不可信
  - 前端要保证：每次访问分组结果稳定（fingerprint stable）
  - 不要刷新换分组、不要 IP 变就换分组
- **数据指标**
  - 主指标 1 个 + 护栏指标若干（不能为追求转化率害用户：跳出率、白屏率、性能）
  - 显著性检验由数据团队 / 实验平台做
- **流程**
  - 试点 1% → 5% → 20% → 50%（观察护栏）
  - 持续时间至少 7 天（覆盖工作日 / 周末差异）
  - 结果出来再"全量 + 删旧代码"
- **代码层面**
  - 实验代码用 feature flag 包，便于"实验完即删"
  - 不要让多个实验互相干扰：同一组件影响时声明互斥

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端怎么承接 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端怎么承接，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端怎么承接 A/B 实验」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
export function useExperiment(expId: string) {
  const variant = expSdk.getVariant(expId) ?? 'control';
  const elRef = ref<HTMLElement | null>(null);
  useIntersectionObserver(elRef, ([entry]) => {
    if (entry.isIntersecting) {
      track('exp_exposure', { expId, variant });
    }
  });
  return { variant, isControl: variant === 'control', elRef };
}

const { variant, isControl, elRef } = useExperiment('home_hero_v2');

const onCta = () => {
  track('home_cta_click', { expId: 'home_hero_v2', variant });
};
```

### 追问

- 推动「前端怎么承接 A/B 实验」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端怎么承接 A/B 实验？」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 可观测性、实验、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 平台：GrowthBook / Optimizely / Unleash / 字节 Libra / 内部自研
- 互斥实验组（layer）：同 layer 互斥、跨 layer 正交
- 客户端分流的闪烁：SSR 注入 cookie 决定首次渲染版本

## js-error-types-basic

title: JS 错误监听都有哪几个钩子？各管什么？
followups: [js-error-types-basic-followup-1, js-error-types-basic-followup-2, js-error-types-basic-followup-3]
difficulty: 基础
tags: [错误, 监听, 基础]

### 一句话

同步错误 → `window.onerror` / `window.addEventListener('error')`；Promise 未捕获 → `unhandledrejection`；资源加载失败（img/script）→ 捕获阶段的 `error`；Vue / React 还各有自己的边界。

### 题目

前端要做错误上报，有哪些原生的事件 / 钩子可以监听？分别能拿到什么信息？

### 答案要点

- `window.onerror = (msg, url, line, col, err)` —— 同步运行时错误，跨域脚本只能拿到 `Script error.`，要给 script 加 `crossorigin`
- `window.addEventListener('error', e, true)` —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败
- `window.addEventListener('unhandledrejection', e)` —— 没 catch 的 Promise
- Vue：`app.config.errorHandler`；React：ErrorBoundary（仅渲染错误，事件错误它收不到）
- 框架外异常 + console.error 监控可补；接口报错由请求层统一封装

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「JS 错误监听都有哪几个钩子？各管什么」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
window.addEventListener(
  'error',
  (e) => {
    if (e.target && e.target !== window) {
      report({ type: 'resource', src: (e.target as HTMLImageElement).src });
    } else {
      report({ type: 'js', message: e.message, stack: e.error?.stack });
    }
  },
  true,
);

window.addEventListener('unhandledrejection', (e) => {
  report({ type: 'promise', reason: String(e.reason) });
});
```

### 常见误区

- 只监听 `window.onerror` —— 资源错误和 Promise 错误漏报
- 跨域 script 不加 `crossorigin` 属性 + CORS 头，只能拿到 "Script error."
- 在 ErrorBoundary 里 setState 后又抛错 → 死循环

### 追问

- 怎么把 source map 反解到真实代码位置（云端反解 / 本地 stack-utils）
- 上报通道选 sendBeacon 还是 fetch keepalive
- 海量错误怎么聚合（指纹 / 采样）

### 延伸

- Sentry / Bugsnag / 自研 SDK 都基于这几个 API
- 长任务（PerformanceLongTaskTiming）也算"非异常但需上报"的健康指标

## lcp-rum-collection

title: 线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做
followups: [lcp-rum-collection-followup-1, lcp-rum-collection-followup-2, lcp-rum-collection-followup-3]
links: [08-performance/image-modern-pipeline, 08-performance/rum-vs-lab, rum-web-vitals]
difficulty: 资深
tags: [LCP, RUM, 高频]

### 一句话

LCP 用 PerformanceObserver `largest-contentful-paint` 在页面**可见性变化或 hidden** 时上报；按"页面 + 端 + 网络 + 实验分桶 + 业务路径"维度落 RUM；灰度阶段用 AB 组对比 75 分位 / 90 分位，得到的"线上数据"才能跟实验室分数对齐。

### 题目

你们 LCP 优化到 90 分（实验室 Lighthouse），线上的真实 LCP 是怎么收集的？怎么验证优化效果？

### 答案要点

**采集**

- `PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })`，`buffered: true` 拿首条之前已发生的
- LCP 是**单调更新**：每个候选元素更大就刷新；最终值在用户**首次交互或页面 hidden** 后定格
- 上报时机：`visibilitychange → hidden` / `pagehide` / `beforeunload`（其中 visibilitychange 最稳）
- 用 `navigator.sendBeacon` / `fetch keepalive` 保证页面卸载时不丢
- 元素也要带：LCP element 的 `tagName / id / src / outerHTML.slice(0,200)`，方便定位"是谁拖慢"

**RUM 维度（缺一不可）**

- **页面**：path / route name（要规范成模板，避免 ID 散落）
- **端**：device、UA、内存、CPU 核数（`navigator.deviceMemory` / `hardwareConcurrency`）
- **网络**：`navigator.connection.effectiveType` / rtt / downlink / saveData
- **实验**：feature flag 桶 ID + 灰度版本 + commit
- **业务路径**：是否登录、用户分层、A/B variant
- **首屏 vs 后续路由**：SPA 切路由要单独算（Soft Navigation）

**验证 AB 效果**

- 灰度时按 hash(uid) 分两桶；上报时带 variant 标签
- 关注 **P75 / P90**（不是平均值），LCP 标准 P75 < 2.5s
- 至少 1-3 天 + 数千用户样本，剔除明显异常（极慢网络、白名单内部用户）
- 跑 t-test / 贝叶斯，看是否显著

**和大盘的关系**

- 大盘是**业务全量分布**，AB 对比的是**实验同期同环境**两组
- 不能用"AB 实验组分位数 vs 大盘分位数"直接对比 → 选择性偏差

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」必须先给 线上 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，线上 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 线上 的计算与缓存路径。

### 代码示例

```ts
import type { LCPMetric } from 'web-vitals';

let final: LCPMetric | null = null;
const po = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    final = {
      name: 'LCP',
      value: entry.startTime,
      element: (entry as any).element as Element | null,
      url: (entry as any).url,
    } as LCPMetric;
  }
});
po.observe({ type: 'largest-contentful-paint', buffered: true });

function flush(reason: string) {
  if (!final) return;
  const el = final.element;
  const payload = {
    name: 'LCP',
    value: Math.round(final.value),
    reason,
    path: location.pathname,
    variant: window.__variant,
    nt: (navigator as any).connection?.effectiveType,
    deviceMemory: (navigator as any).deviceMemory,
    cpu: navigator.hardwareConcurrency,
    el: el ? `${el.tagName}#${el.id || ''}.${el.className || ''}` : null,
    src: (final as any).url,
    ts: Date.now(),
  };
  navigator.sendBeacon('/rum', JSON.stringify(payload));
  final = null;
}

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush('hidden');
});
addEventListener('pagehide', () => flush('pagehide'));
```

### 常见误区

- 在 `load` 时上报 LCP：LCP 可能在 load 之后才更新（懒加载图、字体回流）
- 只在卸载上报：用户 SPA 切路由不会卸载，要监听 visibilitychange 或自定义路由 hook
- 没区分首屏 / soft navigation：SPA 切路由当首屏算会导致 LCP 失真
- 直接对比"实验组 P75 vs 大盘 P75"：选择性偏差，必须 AB 同期

### 追问

- 怎么把 LCP 收集和后端 trace 关联？
  - 上报里带 traceparent（前端注入或后端模板注入）
- 75 分位还是 90 分位有意义？为什么不用平均？
  - 长尾用户体验代表性强；CWV 标准本身就是 P75
- LCP 优化到 90 分，实际用户没感觉，怎么解释？
  - 实验室是 throttling 模拟，可能跟用户网络分布差异大；线上要看 RUM
- 没装 web-vitals 库自己实现要注意什么？
  - 别忘了 `buffered: true`、定时定格、用 sendBeacon、SPA 切路由 reset

### 延伸

- 进阶：用 `web-vitals` 库的 `attribution build`，能直接告诉你 LCP 元素是 `image` / `text`，资源 URL，pre-paint delay
- 工程：把 LCP 上报接入 OpenTelemetry，与后端 trace 串起来

## tbt-and-long-task-collection

title: TBT / Long Task 怎么采集？requestIdleCallback 上报权衡
followups: [tbt-and-long-task-collection-followup-1, tbt-and-long-task-collection-followup-2, tbt-and-long-task-collection-followup-3]
links: [08-performance/long-task-scheduling]
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频]

### 一句话

Long Task ≥ 50ms 用 PerformanceObserver `longtask`；TBT = FCP→TTI 间所有 long task 超过 50ms 部分之和；上报用 requestIdleCallback 攒批 + visibilitychange 兜底；紧急上报 / 主线程被占满 / 大数据量都需要不同策略。

### 题目

你提到 LCP 之外还会关注 TBT、Long Task。这两个怎么采集？为什么用 requestIdleCallback 上报？紧急情况和主线程被占满怎么办？

### 答案要点

**Long Task 采集**

- W3C 标准：任务执行 ≥ 50ms 就算 long task
- API：`new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })`
- 拿到的 entry：`{ duration, startTime, name, attribution: [{ containerType, containerName, ... }] }`
- attribution 可以告诉你是哪个 iframe / script，但**跨源 iframe 拿不到具体 src**
- 限制：只能看到任务时长，看不到任务内部代码栈（可结合 `Long Animation Frames API` (LoAF) 拿堆栈）

**TBT 计算**

- 公式：`TBT = Σ max(0, longtask.duration - 50)`，时间窗 FCP → TTI
- 实验室能算 TBT；线上更适合上报"FCP→FID/INP 期间所有 long task 总长"近似 TBT
- 现代标准用 **INP**（替代 FID）作为线上交互延迟核心指标

**上报策略：为什么用 requestIdleCallback**

- LCP / TBT / Long Task 这类**观测数据非紧急**，应该让出主线程
- requestIdleCallback 在浏览器空闲时回调，**不抢用户交互**
- 攒批：积累多条上报合并成一次请求，减少网络开销

**紧急 vs 兜底（图里追问的关键）**

- **必须立刻上报**（崩溃、JS error、致命错误）：直接 `sendBeacon`，不等 idle
- **主线程长期被占（rIC 不触发）**：
  - **超时兜底**：`requestIdleCallback(cb, { timeout: 2000 })` 超过 2s 强制执行
  - **轮询定时器**：setTimeout 一定时间还没 flush 就强制
  - **visibilitychange / pagehide 兜底**：保底把内存里所有数据 sendBeacon 出去
- 数据量大（如 rrweb 录屏）：分块上传 + ack，单块失败重试

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Long Task 采集」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「W3C 标准：任务执行 ≥ 50ms 就算 long task」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
const longTasks: PerformanceEntry[] = [];
const lt = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    longTasks.push(e);
    if (e.duration > 200) {
      // 异常长任务，立刻上报，不等 idle
      navigator.sendBeacon(
        '/rum/longtask-critical',
        JSON.stringify({
          duration: e.duration,
          startTime: e.startTime,
          attribution: (e as any).attribution,
          path: location.pathname,
        }),
      );
    }
  }
});
lt.observe({ type: 'longtask', buffered: true });

function flushLongTasks() {
  if (!longTasks.length) return;
  const payload = longTasks.splice(0).map((e) => ({
    d: Math.round(e.duration),
    s: Math.round(e.startTime),
  }));
  navigator.sendBeacon('/rum/longtask', JSON.stringify(payload));
}

function scheduleFlush() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(flushLongTasks, { timeout: 5000 });
  } else {
    setTimeout(flushLongTasks, 1000);
  }
}

setInterval(scheduleFlush, 10_000);
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushLongTasks();
});
addEventListener('pagehide', flushLongTasks);
```

### 常见误区

- 把 long task 当 long animation frame：LoAF 是新 API，能拿到 render 阶段细分（style / layout / paint）
- 只用 setTimeout 上报：会阻塞用户交互
- 用 fetch 不带 keepalive：页面卸载时请求被 cancel
- 上报立刻执行：导致自身成为 long task 来源（监控组件别拖累线上）

### 追问

- requestIdleCallback 不被支持的浏览器（Safari < 15）怎么办？
  - polyfill：`(cb) => setTimeout(cb, 1)` + 用 IdleDeadline 模拟，或直接用 `setTimeout` 退化
- 紧急上报怎么不丢？
  - sendBeacon 优先；同时把数据写进 IndexedDB，下次启动时检查未上报 → 重发
- 主线程被疯狂占用，监控本身也卡住怎么办？
  - 部分采集放 **Web Worker / Shared Worker**，主线程崩了 worker 还能上报
- 长任务 attribution 给的 containerName 是 iframe，怎么知道是哪个第三方？
  - cross-origin iframe 给不出具体 URL；自家 iframe 可以加 `name` 属性带身份

### 延伸

- 进阶：Long Animation Frames API (LoAF) 把 long task 细化到渲染阶段
- 工程：监控库自身打"自检 metric"——上报耗时 > 10ms 就警报

## source-map-stack-trace

title: Source Map：栈解析定位到源码行列
followups: [source-map-stack-trace-followup-1, source-map-stack-trace-followup-2, source-map-stack-trace-followup-3]
difficulty: 进阶
tags: [SourceMap, 错误定位]

### 一句话

浏览器抛出的栈是压缩混淆后的行列号；用 source-map / @jridgewell/trace-mapping 加载对应 .map 文件查询 mappings，反向得到源码 file/line/col/name；生产环境 .map 不上线，只在监控后端解析。

### 题目

线上错误堆栈是 `app.abc123.js:1:50000` 这种压缩位置，怎么定位到原始源码？底层用什么逻辑？

### 答案要点

**Source Map 文件结构**

- 关键字段：`version` / `sources`（源文件路径数组）/ `names`（标识符数组）/ `mappings`（VLQ 编码的位置映射串）
- mappings 用 **Base64 VLQ** 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- `;` 分行，`,` 分段；段内 1-5 个数字（生成列、源文件 idx、源行、源列、name idx）
- 文件末尾通常 `//# sourceMappingURL=app.abc123.js.map`

**解析流程**

- 拿到压缩栈 `(file, line, col)` → 加载 file 对应 .map
- 解码 mappings → 二分查找最接近 (line, col) 的映射 → 还原 (源 file, 源 line, 源 col, 函数名)
- 用栈里逐帧解析

**生产实践**

- **.map 不要上线**：会泄漏源码；改成构建后产物上传到错误监控系统（Sentry / 自建）
- 生成的 JS 末尾**移除** `sourceMappingURL`，但保留 .map 在监控端
- 错误监控收到栈 → 后端拉对应版本 .map → 解析 → 推送可读报告
- 大文件 mappings 几 MB，解析有内存压力 → 监控后端用 streaming 解析或缓存

**库**

- `source-map`（Mozilla 老牌，wasm）
- `@jridgewell/trace-mapping`（更轻、更快，babel 在用）
- `stacktracejs` 前端调试用

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 Source 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 Source 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「Source Map：栈解析定位到源码行列」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

### 代码示例

```ts
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

async function symbolicate(file: string, line: number, col: number) {
  const mapText = await fetch(`/sourcemaps/${file}.map`).then((r) => r.text());
  const tracer = new TraceMap(JSON.parse(mapText));
  return originalPositionFor(tracer, { line, column: col });
}

// 错误监控收到 stack 后逐帧解析：
const frames = parseStackFrames(error.stack);
const original = await Promise.all(
  frames.map((f) => symbolicate(f.fileName, f.lineNumber, f.columnNumber)),
);
```

### 常见误区

- .map 上线 → 源码泄漏 + bundle 体积翻倍
- 解析时不区分 minor 版本：deploy A 的栈用 deploy B 的 map，行号对不上
- 直接 JSON.parse 大 .map 文件 → 内存爆炸；要 stream parsing
- 行列从 0 还是 1 开始：浏览器和 source-map spec 不一致（JS Error.stack 多为 1-based，spec 是 0-based）

### 追问

- 你了解底层 VLQ 是怎么编码的吗？
  - 6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值
- multi-level source map（babel + webpack 双重转换）怎么处理？
  - 用 `inline source map` 串联，最终 map 已合并；解析直接拿到原始 .ts/.tsx
- 怎么把解析结果反馈到 Cursor / VSCode 跳转？
  - 监控控制台带 `vscode://file/${absPath}:${line}:${col}` 或 GitHub Permalink

### 延伸

- 进阶：`source-map-support` Node.js 端 .ts → 错误栈映射；Vite 默认开 inline sourceMap
- 工程：每次发布把 .map + 版本号上传到 Sentry / Bugly / 自建对象存储；错误上报带 `release` 字段路由到对应 .map

## white-screen-detection-deep

title: 白屏检测：从根节点扫描到采样像素
followups: [white-screen-detection-deep-followup-1, white-screen-detection-deep-followup-2, white-screen-detection-deep-followup-3]
difficulty: 资深
tags: [白屏, 监控]

### 一句话

白屏不是单一信号；常用四种叠加：根节点子元素数 / 关键 DOM 选择器 / 关键视口区域 elementFromPoint / 关键 fetch 失败；都不命中再用 canvas 截屏 + 像素采样兜底；触发上报时带最近资源加载、错误、性能信息。

### 题目

白屏检测你是怎么做的？给一个尽量可靠的方案。

### 答案要点

**误区先排除**

- 单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 单看 `document.body.children.length`——SSR 占位 / loading 容器会让此值 > 0 但视觉空白

**多信号融合**

- **DOM 信号**：检查 `#app` / `#root` 是否有 ≥ N 个子元素；关键 selector（`.header`/`.main`）是否存在
- **视口采样**：`document.elementFromPoint(x, y)` 取 9 宫格中心 + 四角，全部命中 root 容器或空 → 疑似白屏
- **资源信号**：JS 主 bundle / 关键 CSS 加载失败（监听 `load` / `error` 或扫 `performance.getEntriesByType('resource')`）
- **错误信号**：`window.onerror` / `unhandledrejection` 在首屏内触发
- **业务关键 fetch**：核心接口 5xx / timeout

**像素兜底**

- 主进程把首屏区域 `html2canvas` / `domtoimage` 截屏 → 采样若干像素 → 全部接近背景色（如纯白）→ 判定白屏
- 缺点：性能开销大，仅在前面信号都"疑似"时再触发

**触发后**

- 收集：URL、版本、UA、最近 N 条 resource entry、error stack、网络 effectiveType、视口截图
- 上报：sendBeacon；同时记录 traceId 让后端复盘

**SPA 特殊性**

- 路由切换后白屏：要在每次 `router.afterEach` 重新检测，而不是只检测一次

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 白屏检测 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 白屏检测，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「白屏检测：从根节点扫描到采样像素」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
function isPossiblyBlank(): boolean {
  const root = document.querySelector('#app');
  if (!root || root.children.length < 1) return true;

  const w = innerWidth,
    h = innerHeight;
  const samples = [
    [w / 2, h / 2],
    [w / 4, h / 4],
    [(3 * w) / 4, h / 4],
    [w / 4, (3 * h) / 4],
    [(3 * w) / 4, (3 * h) / 4],
  ];
  const hits = samples.filter(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el && el !== document.body && !root.contains(el)
      ? false
      : !el || el === root || el === document.body;
  });
  return hits.length >= 4;
}

addEventListener('load', () => {
  setTimeout(() => {
    if (!isPossiblyBlank()) return;
    const resources = performance.getEntriesByType('resource').slice(-30);
    const errors = (window as any).__errorBuffer ?? [];
    navigator.sendBeacon(
      '/rum/blank',
      JSON.stringify({
        url: location.href,
        ua: navigator.userAgent,
        effectiveType: (navigator as any).connection?.effectiveType,
        resources,
        errors,
        ts: Date.now(),
      }),
    );
  }, 3000);
});
```

### 常见误区

- 单信号判定：误报满天飞
- 没考虑 SPA 路由切换
- 截图 / canvas 采样在主线程跑：本身造成卡顿
- 误报后没有人工 review 流程：白屏 dashboard 噪音大

### 追问

- 截图不能用怎么办（CORS image / iframe）？
  - 退化到 DOM + 视口元素采样
- 白屏率怎么定 SLO？
  - 通常 < 0.05% 算健康；按版本 / 端 / 运营商分桶看异动
- 用户首次访问就白屏，没法复现怎么办？
  - 自动化拉对应 sourcemap + 重放 trace + 静态资源版本回放

### 延伸

- 进阶：Long Animation Frames API + Visibility API 联合判断
- 工程：白屏归因——上报里把"首屏内最早出现的 resource error / JS error" 优先级置顶

## rrweb-on-demand-recording

title: 大依赖按需下发：rrweb 百万级用户场景
followups: [rrweb-on-demand-recording-followup-1, rrweb-on-demand-recording-followup-2, rrweb-on-demand-recording-followup-3]
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频]

### 一句话

rrweb 录屏 SDK 几十到几百 KB，全量下发不现实；策略是默认不加载，触发条件（用户主动反馈 / 抽样 / 异常发生）才动态 import；时机靠"问题已发生 → 重连后台拉录屏"或"业务路径风险预测"。

### 题目

百万级用户里某用户反馈视频播放有问题，你想看他具体操作了什么。rrweb 依赖很大，怎么让这个用户能加载并录制？下发时机怎么定？

### 答案要点

**为什么默认不加载**

- rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 录屏数据上传也大，全量录制带宽 / 存储爆炸

**触发模型**

- **用户主动**：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- **抽样**：1% 流量录屏，A/B 验证或问题排查
- **异常驱动**：JS error / 关键接口失败 → 立刻动态 import rrweb，**录后续 30 秒** + 缓冲区前 30 秒（用 record `checkoutEveryNms` + 双 buffer）
- **业务路径风险**：付款 / 注销前 N 步开启录制（预录"事故现场"）
- **服务端下发**：用户进入 `/help/feedback?caseId=xxx` 路由，后端依据 caseId 决定是否下发录屏脚本

**下发实现**

- 用 `import('rrweb')` 动态加载，配合 webpack/vite 的 chunk
- CDN 分发：rrweb 单独发包，命中浏览器缓存
- 加载完成前事件先用本地 ring buffer 暂存（如最近 30s 的 click / input event）
- 加载完成后接管，把 ring buffer 序列化补上

**回放消耗**

- 上传后端用对象存储；按 sessionId 切片
- 回放时也是按需 fetch，不做全量
- 隐私：input / password 字段必须 mask（rrweb 自带 `maskAllInputs`）；用户授权流程

**和 trace_id 关联**

- 录屏 session_id 和后端 trace 串起来，定位到具体接口

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「大依赖按需下发：rrweb 百万级用户场景」时要把 大依赖按需下发 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，大依赖按需下发 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「大依赖按需下发：rrweb 百万级用户场景」里当前按阶段替换更稳。

### 代码示例

```ts
let rrwebStop: (() => void) | null = null;

async function startRecording(reason: string, ttlMs = 60_000) {
  if (rrwebStop) return;
  const { record } = await import('rrweb');
  let events: any[] = [];
  const stop = record({
    emit(e) {
      events.push(e);
    },
    maskAllInputs: true,
    sampling: { mousemove: 50, scroll: 100 },
  });
  rrwebStop = () => {
    stop?.();
    rrwebStop = null;
  };

  setTimeout(async () => {
    rrwebStop?.();
    await uploadEvents(events, { reason, ts: Date.now() });
    events = [];
  }, ttlMs);
}

window.addEventListener('error', () => startRecording('runtime-error'));
addEventListener('unhandledrejection', () => startRecording('promise-rejection'));

document.querySelector('#feedback-btn')?.addEventListener('click', () => {
  startRecording('user-feedback', 90_000);
});
```

### 常见误区

- 全量下发 rrweb：首屏 LCP 直接退化
- 没用 ring buffer：错过"事故前"画面
- 没 mask 隐私字段：合规事故
- 录屏数据不分块上传：长时间录制会丢数据

### 追问

- 怎么决定时机最稳（既不晚也不太早）？
  - 异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单
- 录屏的存储成本怎么控？
  - 仅高优 case 长期保留，普通 case 7 天 TTL；事件级压缩
- 用户拒绝录屏怎么办？
  - 必须有 opt-out；GDPR / PIPL 要求知情同意

### 延伸

- 进阶：用 OffscreenCanvas + Worker 序列化大 DOM 减少主线程开销
- 工程：rrweb 版本和 player 版本必须配套，灰度切换要兼容历史 session

## error-capture-followup-1

title: 追问：结合真实业务约束，在「前端错误捕获链路应该怎么搭」落地过程中，你会如何围绕 错误监控 设计发布开关和故障回退策略
difficulty: 基础
tags: [错误监控, ErrorBoundary, 追问]
parent: error-capture

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端错误捕获链路应该怎么搭」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，在「前端错误捕获链路应该怎么搭」落地过程中，你会如何围绕 错误监控 设计发布开关和故障回退策略？

### 答案要点

#### 标准回答（直接作答）

- 结论：运行时脚本错误可由 window.onerror 捕获
- 机制：未处理 Promise 异常由 unhandledrejection 捕获；Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary
- 落地动作：回答「结合真实业务约束，在「前端错误捕获链路应该怎么搭」落地过程中，你会如何围绕 错误监控 设计发布开关和故障回退策略」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端错误捕获链路应该 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端错误捕获链路应该，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，在「前端错误捕获链路应该怎么搭」落地过程中，你会如何围绕 错误监控 设计发布开关和故障回退策略」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 运行时脚本错误可由 window.onerror 捕获
- 未处理 Promise 异常由 unhandledrejection 捕获
- Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary

## source-map-symbolicate-followup-1

title: 追问：围绕「Source Map 上传与错误还原」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate

### 一句话

先界定「Source Map 上传与错误还原」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「生产环境代码被压缩和拆包后。

### 题目

如果面试官追问：围绕「Source Map 上传与错误还原」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 机制：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原；要保证发布版本、commit、产物 hash、环境信息能对齐
- 落地动作：回答「围绕「Source Map 上传与错误还原」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「围绕「Source Map 上传与错误还原」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原
- 要保证发布版本、commit、产物 hash、环境信息能对齐

## rum-web-vitals-followup-1

title: 追问：面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals

### 一句话

先界定「RUM 与 Web Vitals 才能告诉你真实用户体验」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论：Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- 机制：RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等；还应关联版本号、路由、设备、浏览器、地域、登录态等上下文
- 落地动作：回答「面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿」时要把 面对真实流量和复杂依 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，面对真实流量和复杂依 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等
- 还应关联版本号、路由、设备、浏览器、地域、登录态等上下文

## event-model-followup-1

title: 追问：以「埋点模型设计：事件、属性、上下文、会话」为例，真要把「埋点模型设计：事件、属性、上下文、会话」推到线上，你会如何围绕 埋点 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「埋点模型设计：事件、属性、上下文、会话」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「埋点模型设计：事件、属性、上下文、会话」为例，真要把「埋点模型设计：事件、属性、上下文、会话」推到线上，你会如何围绕 埋点 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：要有稳定事件命名、属性字典、用户上下文和版本上下文
- 机制：事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名；埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”
- 落地动作：回答「以「埋点模型设计：事件、属性、上下文、会话」为例，真要把「埋点模型设计：事件、属性、上下文、会话」推到线上，你会如何围绕 埋点 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 埋点模型设计 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 埋点模型设计，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「埋点模型设计：事件、属性、上下文、会话」为例，真要把「埋点模型设计：事件、属性、上下文、会话」推到线上，你会如何围绕 埋点 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 要有稳定事件命名、属性字典、用户上下文和版本上下文
- 事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名
- 埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”

## reporting-channel-followup-1

title: 追问：真要把「Beacon、fetch keepalive 与监控上报通道怎么选」推到线上，你会如何围绕 Beacon 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Beacon、fetch keepalive 与监控上报通道怎么选」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：真要把「Beacon、fetch keepalive 与监控上报通道怎么选」推到线上，你会如何围绕 Beacon 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- 机制：sendBeacon() 只适合小体积、POST、不关心响应内容的上报；如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活
- 落地动作：回答「真要把「Beacon、fetch keepalive 与监控上报通道怎么选」推到线上，你会如何围绕 Beacon 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「真要把「Beacon、fetch keepalive 与监控上报通道怎么选」推到线上，你会如何围绕 Beacon 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- sendBeacon() 只适合小体积、POST、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活

## session-replay-alert-followup-1

title: 追问：围绕「会话回放、采样与告警阈值」做方案评审时，哪些 SessionReplay 边界输入最容易导致结论失真
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert

### 一句话

先界定「会话回放、采样与告警阈值」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「会话回放有性能、隐私和存储成本。

### 题目

如果面试官追问：围绕「会话回放、采样与告警阈值」做方案评审时，哪些 SessionReplay 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 机制：告警阈值太低会噪音泛滥，太高又会错过故障；常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警
- 落地动作：回答「围绕「会话回放、采样与告警阈值」做方案评审时，哪些 SessionReplay 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「告警阈值太低会噪音泛滥，太高又会错过故障」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「围绕「会话回放、采样与告警阈值」做方案评审时，哪些 SessionReplay 边界输入最容易导致结论失真」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 告警阈值太低会噪音泛滥，太高又会错过故障
- 常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警

## privacy-compliance-followup-1

title: 追问：在「可观测性与隐私合规的平衡」场景下，真要把「可观测性与隐私合规的平衡」推到线上，你会如何围绕 隐私合规 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「可观测性与隐私合规的平衡」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在「可观测性与隐私合规的平衡」场景下，真要把「可观测性与隐私合规的平衡」推到线上，你会如何围绕 隐私合规 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 机制：采集前要做脱敏、白名单、最小必要原则；不同地区对 Cookie、追踪、会话回放有不同合规要求
- 落地动作：回答「在「可观测性与隐私合规的平衡」场景下，真要把「可观测性与隐私合规的平衡」推到线上，你会如何围绕 隐私合规 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 可观测性与隐私合规的 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 可观测性与隐私合规的，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「可观测性与隐私合规的平衡」场景下，真要把「可观测性与隐私合规的平衡」推到线上，你会如何围绕 隐私合规 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 采集前要做脱敏、白名单、最小必要原则
- 不同地区对 Cookie、追踪、会话回放有不同合规要求

## opentelemetry-frontend-followup-1

title: 追问：在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend

### 一句话

先界定「OpenTelemetry 在前端的接入」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 机制：出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog；TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span
- 落地动作：回答「在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束的定义」时要把 OpenTelemetry 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，OpenTelemetry 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束的定义」里当前按阶段替换更稳。

#### 关键细节（可追问）

- SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog
- TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span

## frontend-feature-flag-followup-1

title: 追问：如果要提升「前端 A/B 测试与特性开关的工程实现」的回归信心，你会先补哪几类边界与回归用例
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端 A/B 测试与特性开关的工程实现」不是只在理想输入下成立。；再补可观测指标：回归信心应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：如果要提升「前端 A/B 测试与特性开关的工程实现」的回归信心，你会先补哪几类边界与回归用例？

### 答案要点

#### 标准回答（直接作答）

- 结论：决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- 机制：SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送；缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端
- 落地动作：回答「如果要提升「前端 A/B 测试与特性开关的工程实现」的回归信心，你会先补哪几类边界与回归用例」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 前端 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 前端 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「如果要提升「前端 A/B 测试与特性开关的工程实现」的回归信心，你会先补哪几类边界与回归用例」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送
- 缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端

## frontend-error-monitor-followup-1

title: 追问：真要把「前端如何全链路捕获错误并上报」推到线上，你会如何围绕 监控 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端如何全链路捕获错误并上报」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：真要把「前端如何全链路捕获错误并上报」推到线上，你会如何围绕 监控 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 机制：未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)；资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听
- 落地动作：回答「真要把「前端如何全链路捕获错误并上报」推到线上，你会如何围绕 监控 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「真要把「前端如何全链路捕获错误并上报」推到线上，你会如何围绕 监控 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- 同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)
- 资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听

## white-screen-detection-followup-1

title: 追问：在当前团队与业务约束下，真要把「前端白屏怎么检测」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端白屏怎么检测」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「前端白屏怎么检测」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：JS 致命错误（首屏 chunk 报错）
- 机制：网络资源加载失败（CDN 挂 / 网络拦截）；渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）
- 落地动作：回答「在当前团队与业务约束下，真要把「前端白屏怎么检测」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，真要把「前端白屏怎么检测」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- JS 致命错误（首屏 chunk 报错）
- 网络资源加载失败（CDN 挂 / 网络拦截）
- 渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）

## ab-experiment-frontend-followup-1

title: 追问：从工程落地角度看，真要把「前端怎么承接 A/B 实验」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端怎么承接 A/B 实验」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：从工程落地角度看，真要把「前端怎么承接 A/B 实验」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 机制：边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁；客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）
- 落地动作：回答「从工程落地角度看，真要把「前端怎么承接 A/B 实验」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，真要把「前端怎么承接 A/B 实验」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁
- 客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）

## js-error-types-basic-followup-1

title: 追问：围绕「JS 错误监听都有哪几个钩子？各管什么」做方案评审时，哪些 错误 边界输入最容易导致结论失真
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic

### 一句话

先界定「JS 错误监听都有哪几个钩子？各管什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「JS 错误监听都有哪几个钩子？各管什么」做方案评审时，哪些 错误 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- 机制：window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败；window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise
- 落地动作：回答「围绕「JS 错误监听都有哪几个钩子？各管什么」做方案评审时，哪些 错误 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「围绕「JS 错误监听都有哪几个钩子？各管什么」做方案评审时，哪些 错误 边界输入最容易导致结论失真」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败
- window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise

## lcp-rum-collection-followup-1

title: 追问：你会先看哪些与 LCP 相关的指标来判断「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是不是当前性能瓶颈
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：你会先看哪些与 LCP 相关的指标来判断「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- 机制：LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格；上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）
- 落地动作：回答「你会先看哪些与 LCP 相关的指标来判断「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会先看哪些与 LCP 相关的指标来判断「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是不是当前性能瓶颈」必须先给 你会先看哪些与 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会先看哪些与 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会先看哪些与 的计算与缓存路径。

#### 关键细节（可追问）

- PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）

## lcp-rum-collection-followup-2

title: 追问：要证明「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」确实改善体验，你会如何围绕 LCP 设计线上观测与对照验证
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：要证明「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」确实改善体验，你会如何围绕 LCP 设计线上观测与对照验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- 机制：LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格；上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）
- 落地动作：回答「要证明「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」确实改善体验，你会如何围绕 LCP 设计线上观测与对照验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 要证明 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，要证明 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「要证明「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」确实改善体验，你会如何围绕 LCP 设计线上观测与对照验证」采用小步优化更稳。

#### 关键细节（可追问）

- PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）

## lcp-rum-collection-followup-3

title: 追问：以「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是否值得做
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是否值得做？

### 答案要点

#### 标准回答（直接作答）

- 结论：PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- 机制：LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格；上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）
- 落地动作：回答「以「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是否值得做」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 线上 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，线上 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「以「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是否值得做」采用小步优化更稳。

#### 关键细节（可追问）

- PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）

## tbt-and-long-task-collection-followup-1

title: 追问：从工程落地角度看，当「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」跨团队落地时，你会先确认哪些 TBT 前置假设，避免后续返工
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 一句话

先界定「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：从工程落地角度看，当「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」跨团队落地时，你会先确认哪些 TBT 前置假设，避免后续返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：Long Task 采集
- 机制：W3C 标准：任务执行 ≥ 50ms 就算 long task；API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })
- 落地动作：回答「从工程落地角度看，当「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」跨团队落地时，你会先确认哪些 TBT 前置假设，避免后续返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」跨团队落地时，你会先确认哪些 TBT 前置假设，避免后续返工」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- Long Task 采集
- W3C 标准：任务执行 ≥ 50ms 就算 long task
- API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })

## source-map-stack-trace-followup-1

title: 追问：围绕「Source Map：栈解析定位到源码行列」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 一句话

先界定「Source Map：栈解析定位到源码行列」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「Source Map：栈解析定位到源码行列」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：Source Map 文件结构
- 机制：关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）；mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- 落地动作：回答「围绕「Source Map：栈解析定位到源码行列」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「Source Map：栈解析定位到源码行列」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真」时先约定 Source 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 Source 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- Source Map 文件结构
- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引

## white-screen-detection-deep-followup-1

title: 追问：在「白屏检测：从根节点扫描到采样像素」场景下，真要把「白屏检测：从根节点扫描到采样像素」推到线上，你会如何围绕 白屏 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「白屏检测：从根节点扫描到采样像素」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在「白屏检测：从根节点扫描到采样像素」场景下，真要把「白屏检测：从根节点扫描到采样像素」推到线上，你会如何围绕 白屏 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 机制：单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白；DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在
- 落地动作：回答「在「白屏检测：从根节点扫描到采样像素」场景下，真要把「白屏检测：从根节点扫描到采样像素」推到线上，你会如何围绕 白屏 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「白屏检测：从根节点扫描到采样像素」场景下，真要把「白屏检测：从根节点扫描到采样像素」推到线上，你会如何围绕 白屏 设计灰度节奏、回滚条件和迁移路径」时要先定义 白屏检测 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，白屏检测 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 白屏检测 关键链路先收敛再替换。

#### 关键细节（可追问）

- 单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白
- DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在

## white-screen-detection-deep-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 白屏 把「白屏检测：从根节点扫描到采样像素」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「白屏检测：从根节点扫描到采样像素」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 白屏 把「白屏检测：从根节点扫描到采样像素」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 标准回答（直接作答）

- 结论：单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 机制：单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白；DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在
- 落地动作：回答「在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 白屏 把「白屏检测：从根节点扫描到采样像素」拆成几段推进，确保每段都能独立验收」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 白屏 把「白屏检测：从根节点扫描到采样像素」拆成几段推进，确保每段都能独立验收」时要先定义 团队里有人熟有人新时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，团队里有人熟有人新时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 团队里有人熟有人新时 关键链路先收敛再替换。

#### 关键细节（可追问）

- 单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白
- DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在

## white-screen-detection-deep-followup-3

title: 追问：围绕「白屏检测：从根节点扫描到采样像素」做去留决策，你会拿哪些指标说服团队
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「白屏检测：从根节点扫描到采样像素」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：围绕「白屏检测：从根节点扫描到采样像素」做去留决策，你会拿哪些指标说服团队？

### 答案要点

#### 标准回答（直接作答）

- 结论：单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 机制：单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白；DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在
- 落地动作：回答「围绕「白屏检测：从根节点扫描到采样像素」做去留决策，你会拿哪些指标说服团队」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 白屏检测 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 白屏检测，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「围绕「白屏检测：从根节点扫描到采样像素」做去留决策，你会拿哪些指标说服团队」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白
- DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在

## rrweb-on-demand-recording-followup-1

title: 追问：如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 一句话

先界定「大依赖按需下发：rrweb 百万级用户场景」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「rrweb 库 + 序列化数据量大。

### 题目

如果面试官追问：如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 机制：录屏数据上传也大，全量录制带宽 / 存储爆炸；用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- 落地动作：回答「如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立」时要把 大依赖按需下发 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，大依赖按需下发 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 录屏数据上传也大，全量录制带宽 / 存储爆炸
- 用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb

## error-capture-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 错误监控 安排「前端错误捕获链路应该怎么搭」的渐进改造路线
difficulty: 基础
tags: [错误监控, ErrorBoundary, 追问]
parent: error-capture
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端错误捕获链路应该怎么搭」不是只在理想输入下成立。；再补可观测指标：围绕「前端错误捕获链路应该怎么搭」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 错误监控 安排「前端错误捕获链路应该怎么搭」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：运行时脚本错误可由 window.onerror 捕获
- 机制：未处理 Promise 异常由 unhandledrejection 捕获；Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary
- 落地动作：回答「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 错误监控 安排「前端错误捕获链路应该怎么搭」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 错误监控 安排「前端错误捕获链路应该怎么搭」的渐进改造路线」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 运行时脚本错误可由 window.onerror 捕获
- 未处理 Promise 异常由 unhandledrejection 捕获
- Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary

## error-capture-followup-3

title: 追问：在当前团队与业务约束下，要判断「前端错误捕获链路应该怎么搭」值不值得长期维护，你会先盯哪些和 错误监控 相关的核心指标
difficulty: 基础
tags: [错误监控, ErrorBoundary, 追问]
parent: error-capture
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端错误捕获链路应该怎么搭」不是只在理想输入下成立。；再补可观测指标：围绕「前端错误捕获链路应该怎么搭」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「前端错误捕获链路应该怎么搭」值不值得长期维护，你会先盯哪些和 错误监控 相关的核心指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：运行时脚本错误可由 window.onerror 捕获
- 机制：未处理 Promise 异常由 unhandledrejection 捕获；Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary
- 落地动作：回答「在当前团队与业务约束下，要判断「前端错误捕获链路应该怎么搭」值不值得长期维护，你会先盯哪些和 错误监控 相关的核心指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 要判断 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 要判断，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，要判断「前端错误捕获链路应该怎么搭」值不值得长期维护，你会先盯哪些和 错误监控 相关的核心指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 运行时脚本错误可由 window.onerror 捕获
- 未处理 Promise 异常由 unhandledrejection 捕获
- Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary

## event-model-followup-2

title: 追问：以「埋点模型设计：事件、属性、上下文、会话」为例，当团队成熟度不一致时，你会如何围绕 埋点 定义「埋点模型设计：事件、属性、上下文、会话」的先后改造顺序
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「埋点模型设计：事件、属性、上下文、会话」讲成只在理想输入下可用。；建议按「输入约束 -> 埋点 执行链路 -> 结果验证」展开，并结合「埋点模型设计：事件、属性、上下文、会话」给出一条可复核结果。

### 题目

如果面试官追问：以「埋点模型设计：事件、属性、上下文、会话」为例，当团队成熟度不一致时，你会如何围绕 埋点 定义「埋点模型设计：事件、属性、上下文、会话」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：要有稳定事件命名、属性字典、用户上下文和版本上下文
- 机制：事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名；埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”
- 落地动作：回答「以「埋点模型设计：事件、属性、上下文、会话」为例，当团队成熟度不一致时，你会如何围绕 埋点 定义「埋点模型设计：事件、属性、上下文、会话」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 埋点模型设计 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 埋点模型设计，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「埋点模型设计：事件、属性、上下文、会话」为例，当团队成熟度不一致时，你会如何围绕 埋点 定义「埋点模型设计：事件、属性、上下文、会话」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 要有稳定事件命名、属性字典、用户上下文和版本上下文
- 事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名
- 埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”

## event-model-followup-3

title: 追问：当团队讨论「埋点模型设计：事件、属性、上下文、会话」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「埋点模型设计：事件、属性、上下文、会话」不是只在理想输入下成立。；再补可观测指标：围绕「埋点模型设计：事件、属性、上下文、会话」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标。

### 题目

如果面试官追问：当团队讨论「埋点模型设计：事件、属性、上下文、会话」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 标准回答（直接作答）

- 结论：要有稳定事件命名、属性字典、用户上下文和版本上下文
- 机制：事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名；埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”
- 落地动作：回答「当团队讨论「埋点模型设计：事件、属性、上下文、会话」去留时，你会给出哪几组关键指标作为决策依据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「当团队讨论「埋点模型设计：事件、属性、上下文、会话」去留时，你会给出哪几组关键指标作为决策依据」时要先定义 当团队讨论 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队讨论 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队讨论 关键链路先收敛再替换。

#### 关键细节（可追问）

- 要有稳定事件命名、属性字典、用户上下文和版本上下文
- 事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名
- 埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”

## reporting-channel-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 Beacon 定义「Beacon、fetch keepalive 与监控上报通道怎么选」的先后改造顺序
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Beacon、fetch keepalive 与监控上报通道怎么选」在当前约束下为什么成立。；建议按「输入约束 -> Beacon 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 Beacon 定义「Beacon、fetch keepalive 与监控上报通道怎么选」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- 机制：sendBeacon() 只适合小体积、POST、不关心响应内容的上报；如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活
- 落地动作：回答「当团队成熟度不一致时，你会如何围绕 Beacon 定义「Beacon、fetch keepalive 与监控上报通道怎么选」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当团队成熟度不一致时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当团队成熟度不一致时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「当团队成熟度不一致时，你会如何围绕 Beacon 定义「Beacon、fetch keepalive 与监控上报通道怎么选」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- sendBeacon() 只适合小体积、POST、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活

## reporting-channel-followup-3

title: 追问：结合真实业务约束，当团队讨论「Beacon、fetch keepalive 与监控上报通道怎么选」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Beacon、fetch keepalive 与监控上报通道怎么选」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，当团队讨论「Beacon、fetch keepalive 与监控上报通道怎么选」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 标准回答（直接作答）

- 结论：sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- 机制：sendBeacon() 只适合小体积、POST、不关心响应内容的上报；如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活
- 落地动作：回答「结合真实业务约束，当团队讨论「Beacon、fetch keepalive 与监控上报通道怎么选」去留时，你会给出哪几组关键指标作为决策依据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当团队讨论 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当团队讨论，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，当团队讨论「Beacon、fetch keepalive 与监控上报通道怎么选」去留时，你会给出哪几组关键指标作为决策依据」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- sendBeacon() 只适合小体积、POST、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活

## privacy-compliance-followup-2

title: 追问：结合真实业务约束，面对团队能力差异，你会如何围绕 隐私合规 把「可观测性与隐私合规的平衡」拆成可并行推进的小阶段
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance
generated: followup-script

### 一句话

推动「可观测性与隐私合规的平衡」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「可观测性与隐私合规的平衡」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：结合真实业务约束，面对团队能力差异，你会如何围绕 隐私合规 把「可观测性与隐私合规的平衡」拆成可并行推进的小阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 机制：采集前要做脱敏、白名单、最小必要原则；不同地区对 Cookie、追踪、会话回放有不同合规要求
- 落地动作：回答「结合真实业务约束，面对团队能力差异，你会如何围绕 隐私合规 把「可观测性与隐私合规的平衡」拆成可并行推进的小阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 面对团队能力差异 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 面对团队能力差异，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，面对团队能力差异，你会如何围绕 隐私合规 把「可观测性与隐私合规的平衡」拆成可并行推进的小阶段」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 采集前要做脱敏、白名单、最小必要原则
- 不同地区对 Cookie、追踪、会话回放有不同合规要求

## privacy-compliance-followup-3

title: 追问：你会如何用可观测数据衡量「可观测性与隐私合规的平衡」在 隐私合规 上的维护成本和收益平衡
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「可观测性与隐私合规的平衡」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 隐私合规 机制 -> 取舍边界」回答，再用「可观测性与隐私合规的平衡」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：你会如何用可观测数据衡量「可观测性与隐私合规的平衡」在 隐私合规 上的维护成本和收益平衡？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 机制：采集前要做脱敏、白名单、最小必要原则；不同地区对 Cookie、追踪、会话回放有不同合规要求
- 落地动作：回答「你会如何用可观测数据衡量「可观测性与隐私合规的平衡」在 隐私合规 上的维护成本和收益平衡」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何用可观测数据衡量「可观测性与隐私合规的平衡」在 隐私合规 上的维护成本和收益平衡」时要先定义 你会如何用可观测数据 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会如何用可观测数据 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会如何用可观测数据 关键链路先收敛再替换。

#### 关键细节（可追问）

- 用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 采集前要做脱敏、白名单、最小必要原则
- 不同地区对 Cookie、追踪、会话回放有不同合规要求

## frontend-feature-flag-followup-2

title: 追问：结合真实业务约束，如果 CI 在「前端 A/B 测试与特性开关的工程实现」改造期频繁误报，你会怎么拆测试层次来降噪
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「前端 A/B 测试与特性开关的工程实现」在当前约束下为什么成立。；回答结构可按「触发条件 -> Feature Flag 机制 -> 风险兜底」展开，并以「前端 A/B 测试与特性开关的工程实现」补一条失败场景。

### 题目

如果面试官追问：结合真实业务约束，如果 CI 在「前端 A/B 测试与特性开关的工程实现」改造期频繁误报，你会怎么拆测试层次来降噪？

### 答案要点

#### 标准回答（直接作答）

- 结论：决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- 机制：SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送；缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端
- 落地动作：回答「结合真实业务约束，如果 CI 在「前端 A/B 测试与特性开关的工程实现」改造期频繁误报，你会怎么拆测试层次来降噪」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 CI 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 CI 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「结合真实业务约束，如果 CI 在「前端 A/B 测试与特性开关的工程实现」改造期频繁误报，你会怎么拆测试层次来降噪」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送
- 缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端

## frontend-feature-flag-followup-3

title: 追问：以「前端 A/B 测试与特性开关的工程实现」为例，当「前端 A/B 测试与特性开关的工程实现」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「前端 A/B 测试与特性开关的工程实现」讲成只在理想输入下可用。；建议按「输入约束 -> Feature Flag 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：以「前端 A/B 测试与特性开关的工程实现」为例，当「前端 A/B 测试与特性开关的工程实现」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 标准回答（直接作答）

- 结论：决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- 机制：SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送；缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端
- 落地动作：回答「以「前端 A/B 测试与特性开关的工程实现」为例，当「前端 A/B 测试与特性开关的工程实现」需求频繁变更时，你会优先完善哪些回归和边界测试」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「前端 A/B 测试与特性开关的工程实现」为例，当「前端 A/B 测试与特性开关的工程实现」需求频繁变更时，你会优先完善哪些回归和边界测试」时先约定 前端 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 前端 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- 决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送
- 缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端

## frontend-error-monitor-followup-2

title: 追问：以「前端如何全链路捕获错误并上报」为例，当团队成熟度不一致时，你会如何围绕 监控 定义「前端如何全链路捕获错误并上报」的先后改造顺序
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端如何全链路捕获错误并上报」不是只在理想输入下成立。；再补可观测指标：围绕「前端如何全链路捕获错误并上报」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「前端如何全链路捕获错误并上报」为例，当团队成熟度不一致时，你会如何围绕 监控 定义「前端如何全链路捕获错误并上报」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 机制：未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)；资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听
- 落地动作：回答「以「前端如何全链路捕获错误并上报」为例，当团队成熟度不一致时，你会如何围绕 监控 定义「前端如何全链路捕获错误并上报」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端如何全链路捕获错 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端如何全链路捕获错，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端如何全链路捕获错误并上报」为例，当团队成熟度不一致时，你会如何围绕 监控 定义「前端如何全链路捕获错误并上报」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)
- 资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听

## frontend-error-monitor-followup-3

title: 追问：如果「前端如何全链路捕获错误并上报」进入维护期，你会优先围绕 观测指标 监控哪些指标来预警风险
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「前端如何全链路捕获错误并上报」时要能同时解释收益、代价和失败信号。；讲「前端如何全链路捕获错误并上报」时先给 观测指标 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：如果「前端如何全链路捕获错误并上报」进入维护期，你会优先围绕 观测指标 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 机制：未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)；资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听
- 落地动作：回答「如果「前端如何全链路捕获错误并上报」进入维护期，你会优先围绕 观测指标 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端如何全链路捕获错 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端如何全链路捕获错，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「如果「前端如何全链路捕获错误并上报」进入维护期，你会优先围绕 观测指标 监控哪些指标来预警风险」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)
- 资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听

## white-screen-detection-followup-2

title: 追问：以「前端白屏怎么检测」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端白屏怎么检测」的先后改造顺序
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「前端白屏怎么检测」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 可观测性 方案动作 -> 验证结果」，并用「前端白屏怎么检测」举一条主链路说明。；如果涉及「前端白屏怎么检测」的技术细节。

### 题目

如果面试官追问：以「前端白屏怎么检测」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端白屏怎么检测」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：JS 致命错误（首屏 chunk 报错）
- 机制：网络资源加载失败（CDN 挂 / 网络拦截）；渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）
- 落地动作：回答「以「前端白屏怎么检测」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端白屏怎么检测」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「前端白屏怎么检测」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端白屏怎么检测」的先后改造顺序」时要先定义 前端白屏怎么检测 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端白屏怎么检测 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端白屏怎么检测 关键链路先收敛再替换。

#### 关键细节（可追问）

- JS 致命错误（首屏 chunk 报错）
- 网络资源加载失败（CDN 挂 / 网络拦截）
- 渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）

## white-screen-detection-followup-3

title: 追问：以「前端白屏怎么检测」为例，当团队讨论「前端白屏怎么检测」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端白屏怎么检测」不是只在理想输入下成立。；再补可观测指标：围绕「前端白屏怎么检测」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「前端白屏怎么检测」为例，当团队讨论「前端白屏怎么检测」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 标准回答（直接作答）

- 结论：JS 致命错误（首屏 chunk 报错）
- 机制：网络资源加载失败（CDN 挂 / 网络拦截）；渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）
- 落地动作：回答「以「前端白屏怎么检测」为例，当团队讨论「前端白屏怎么检测」去留时，你会给出哪几组关键指标作为决策依据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端白屏怎么检测 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端白屏怎么检测，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端白屏怎么检测」为例，当团队讨论「前端白屏怎么检测」去留时，你会给出哪几组关键指标作为决策依据」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- JS 致命错误（首屏 chunk 报错）
- 网络资源加载失败（CDN 挂 / 网络拦截）
- 渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）

## ab-experiment-frontend-followup-2

title: 追问：以「前端怎么承接 A/B 实验」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端怎么承接 A/B 实验」的先后改造顺序
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend
generated: followup-script

### 一句话

推动「前端怎么承接 A/B 实验」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「前端怎么承接 A/B 实验」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：以「前端怎么承接 A/B 实验」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端怎么承接 A/B 实验」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 机制：边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁；客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）
- 落地动作：回答「以「前端怎么承接 A/B 实验」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端怎么承接 A/B 实验」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端怎么承接 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端怎么承接，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端怎么承接 A/B 实验」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端怎么承接 A/B 实验」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁
- 客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）

## ab-experiment-frontend-followup-3

title: 追问：以「前端怎么承接 A/B 实验」为例，如果「前端怎么承接 A/B 实验」进入维护期，你会优先围绕 可观测性 监控哪些指标来预警风险
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「前端怎么承接 A/B 实验」讲成只在理想输入下可用。；围绕「前端怎么承接 A/B 实验」组织答案时，建议按「约束来源 -> 可观测性 关键决策 -> 验证闭环」展开。；在「前端怎么承接 A/B 实验」回答里。

### 题目

如果面试官追问：以「前端怎么承接 A/B 实验」为例，如果「前端怎么承接 A/B 实验」进入维护期，你会优先围绕 可观测性 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 机制：边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁；客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）
- 落地动作：回答「以「前端怎么承接 A/B 实验」为例，如果「前端怎么承接 A/B 实验」进入维护期，你会优先围绕 可观测性 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「前端怎么承接 A/B 实验」为例，如果「前端怎么承接 A/B 实验」进入维护期，你会优先围绕 可观测性 监控哪些指标来预警风险」时要先定义 前端怎么承接 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端怎么承接 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端怎么承接 关键链路先收敛再替换。

#### 关键细节（可追问）

- 服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁
- 客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）

## js-error-types-basic-followup-2

title: 追问：以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「JS 错误监听都有哪几个钩子？各管什么」在当前约束下为什么成立。；回答结构可按「触发条件 -> 错误 机制 -> 风险兜底」展开，并以「JS 错误监听都有哪几个钩子？各管什么」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive？

### 答案要点

#### 标准回答（直接作答）

- 结论：window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- 机制：window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败；window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise
- 落地动作：回答「以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive」时要把 JS 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，JS 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive」里当前按阶段替换更稳。

#### 关键细节（可追问）

- window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败
- window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise

## js-error-types-basic-followup-3

title: 追问：结合真实业务约束，海量错误怎么聚合
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「JS 错误监听都有哪几个钩子？各管什么」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 错误 机制 -> 风险兜底」展开，并以「JS 错误监听都有哪几个钩子？各管什么」补一条失败场景。

### 题目

如果面试官追问：结合真实业务约束，海量错误怎么聚合（指纹 / 采样）？

### 答案要点

#### 标准回答（直接作答）

- 结论：window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- 机制：window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败；window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise
- 落地动作：回答「结合真实业务约束，海量错误怎么聚合」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，海量错误怎么聚合」时要把 海量错误怎么聚合 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，海量错误怎么聚合 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，海量错误怎么聚合」里当前按阶段替换更稳。

#### 关键细节（可追问）

- window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败
- window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise

## tbt-and-long-task-collection-followup-2

title: 追问：结合真实业务约束，polyfill： = setTimeout + 用 IdleDeadline 模拟，或直接用 setTimeout 退化
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」在当前约束下为什么成立。。

### 题目

如果面试官追问：结合真实业务约束，polyfill：`(cb) => setTimeout(cb, 1)` + 用 IdleDeadline 模拟，或直接用 `setTimeout` 退化？

### 答案要点

#### 标准回答（直接作答）

- 结论：Long Task 采集
- 机制：W3C 标准：任务执行 ≥ 50ms 就算 long task；API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })
- 落地动作：回答「结合真实业务约束，polyfill： = setTimeout + 用 IdleDeadline 模拟，或直接用 setTimeout 退化」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 polyfill 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 polyfill 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「结合真实业务约束，polyfill： = setTimeout + 用 IdleDeadline 模拟，或直接用 setTimeout 退化」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- Long Task 采集
- W3C 标准：任务执行 ≥ 50ms 就算 long task
- API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })

## tbt-and-long-task-collection-followup-3

title: 追问：在当前团队与业务约束下，紧急上报怎么不丢
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> TBT 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在当前团队与业务约束下，紧急上报怎么不丢？

### 答案要点

#### 标准回答（直接作答）

- 结论：Long Task 采集
- 机制：W3C 标准：任务执行 ≥ 50ms 就算 long task；API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })
- 落地动作：回答「在当前团队与业务约束下，紧急上报怎么不丢」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Long Task 采集」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「W3C 标准：任务执行 ≥ 50ms 就算 long task」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，紧急上报怎么不丢」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Long Task 采集
- W3C 标准：任务执行 ≥ 50ms 就算 long task
- API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })

## source-map-stack-trace-followup-2

title: 追问：从工程落地角度看，6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Source Map：栈解析定位到源码行列」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> SourceMap 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值？

### 答案要点

#### 标准回答（直接作答）

- 结论：Source Map 文件结构
- 机制：关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）；mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- 落地动作：回答「从工程落地角度看，6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Source Map 文件结构
- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引

## source-map-stack-trace-followup-3

title: 追问：从工程落地角度看，multi-level source map怎么处理
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Source Map：栈解析定位到源码行列」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> SourceMap 机制 -> 取舍边界」回答，再用「Source Map：栈解析定位到源码行列」补一个反例。

### 题目

如果面试官追问：从工程落地角度看，multi-level source map（babel + webpack 双重转换）怎么处理？

### 答案要点

#### 标准回答（直接作答）

- 结论：Source Map 文件结构
- 机制：关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）；mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- 落地动作：回答「从工程落地角度看，multi-level source map怎么处理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，multi-level source map怎么处理」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- Source Map 文件结构
- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引

## rrweb-on-demand-recording-followup-2

title: 追问：异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「大依赖按需下发：rrweb 百万级用户场景」在当前约束下为什么成立。；围绕「大依赖按需下发：rrweb 百万级用户场景」组织答案时，建议按「约束来源 -> rrweb 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单？

### 答案要点

#### 标准回答（直接作答）

- 结论：rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 机制：录屏数据上传也大，全量录制带宽 / 存储爆炸；用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- 落地动作：回答「异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「rrweb 库 + 序列化数据量大，全量下发拖累首屏」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「录屏数据上传也大，全量录制带宽 / 存储爆炸」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 录屏数据上传也大，全量录制带宽 / 存储爆炸
- 用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb

## rrweb-on-demand-recording-followup-3

title: 追问：结合真实业务约束，录屏的存储成本怎么控
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「大依赖按需下发：rrweb 百万级用户场景」讲成只在理想输入下可用。；建议按「输入约束 -> rrweb 执行链路 -> 结果验证」展开，并结合「大依赖按需下发：rrweb 百万级用户场景」给出一条可复核结果。

### 题目

如果面试官追问：结合真实业务约束，录屏的存储成本怎么控？

### 答案要点

#### 标准回答（直接作答）

- 结论：rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 机制：录屏数据上传也大，全量录制带宽 / 存储爆炸；用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- 落地动作：回答「结合真实业务约束，录屏的存储成本怎么控」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「rrweb 库 + 序列化数据量大，全量下发拖累首屏」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「录屏数据上传也大，全量录制带宽 / 存储爆炸」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，录屏的存储成本怎么控」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 录屏数据上传也大，全量录制带宽 / 存储爆炸
- 用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb

## source-map-symbolicate-followup-2

title: 追问：以「Source Map 上传与错误还原」为例，你会如何围绕 SourceMap 定义「Source Map 上传与错误还原」生效的判据，并用测试与监控长期验证
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Source Map 上传与错误还原」不是只在理想输入下成立。；再补可观测指标：围绕「Source Map 上传与错误还原」的核心机制应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变。

### 题目

如果面试官追问：以「Source Map 上传与错误还原」为例，你会如何围绕 SourceMap 定义「Source Map 上传与错误还原」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 机制：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原；要保证发布版本、commit、产物 hash、环境信息能对齐
- 落地动作：回答「以「Source Map 上传与错误还原」为例，你会如何围绕 SourceMap 定义「Source Map 上传与错误还原」生效的判据，并用测试与监控长期验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「Source Map 上传与错误还原」为例，你会如何围绕 SourceMap 定义「Source Map 上传与错误还原」生效的判据，并用测试与监控长期验证」要明确 Source 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 Source 的高风险边界。

#### 关键细节（可追问）

- 生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原
- 要保证发布版本、commit、产物 hash、环境信息能对齐

## source-map-symbolicate-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SourceMap 重新划分「Source Map 上传与错误还原」的实施阶段
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate
generated: followup-script

### 一句话

规模变大后先重新评估「Source Map 上传与错误还原」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Source Map 上传与错误还原」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SourceMap 重新划分「Source Map 上传与错误还原」的实施阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 机制：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原；要保证发布版本、commit、产物 hash、环境信息能对齐
- 落地动作：回答「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SourceMap 重新划分「Source Map 上传与错误还原」的实施阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SourceMap 重新划分「Source Map 上传与错误还原」的实施阶段」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原
- 要保证发布版本、commit、产物 hash、环境信息能对齐

## rum-web-vitals-followup-2

title: 追问：如果要让结论在 RUM 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「RUM 与 Web Vitals 才能告诉你真实用户体验」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> RUM 方案动作 -> 验证结果」。

### 题目

如果面试官追问：如果要让结论在 RUM 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- 机制：RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等；还应关联版本号、路由、设备、浏览器、地域、登录态等上下文
- 落地动作：回答「如果要让结论在 RUM 上可复核，你会怎样安排测试、日志和指标的组合验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要让结论在 RUM 上可复核，你会怎样安排测试、日志和指标的组合验证」要明确 RUM 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 RUM 的高风险边界。

#### 关键细节（可追问）

- Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等
- 还应关联版本号、路由、设备、浏览器、地域、登录态等上下文

## rum-web-vitals-followup-3

title: 追问：在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「RUM 与 Web Vitals 才能告诉你真实用户体验」在当前约束下为什么成立。；建议按「输入约束 -> RUM 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- 机制：RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等；还应关联版本号、路由、设备、浏览器、地域、登录态等上下文
- 落地动作：回答「在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来」时要把 RUM 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，RUM 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等
- 还应关联版本号、路由、设备、浏览器、地域、登录态等上下文

## session-replay-alert-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 SessionReplay 方案有效
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「会话回放、采样与告警阈值」时要能同时解释收益、代价和失败信号。；讲「会话回放、采样与告警阈值」时先给 SessionReplay 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 SessionReplay 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 机制：告警阈值太低会噪音泛滥，太高又会错过故障；常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警
- 落地动作：回答「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 SessionReplay 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了避免主观判断 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了避免主观判断 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 SessionReplay 方案有效」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 告警阈值太低会噪音泛滥，太高又会错过故障
- 常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警

## session-replay-alert-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SessionReplay 重新划分「会话回放、采样与告警阈值」的实施阶段
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert
generated: followup-script

### 一句话

规模变大后先重新评估「会话回放、采样与告警阈值」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「会话回放、采样与告警阈值」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SessionReplay 重新划分「会话回放、采样与告警阈值」的实施阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 机制：告警阈值太低会噪音泛滥，太高又会错过故障；常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警
- 落地动作：回答「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SessionReplay 重新划分「会话回放、采样与告警阈值」的实施阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「告警阈值太低会噪音泛滥，太高又会错过故障」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SessionReplay 重新划分「会话回放、采样与告警阈值」的实施阶段」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 告警阈值太低会噪音泛滥，太高又会错过故障
- 常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警

## opentelemetry-frontend-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 OpenTelemetry 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「OpenTelemetry 在前端的接入」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> OpenTelemetry 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 OpenTelemetry 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 机制：出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog；TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span
- 落地动作：回答「从工程落地角度看，为了证明这个方案在 OpenTelemetry 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，为了证明这个方案在 OpenTelemetry 维度有效，你会怎么设计测试闭环和线上观测指标」要明确 从工程落地角度看 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 从工程落地角度看 的高风险边界。

#### 关键细节（可追问）

- SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog
- TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span

## opentelemetry-frontend-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 OpenTelemetry 调整「OpenTelemetry 在前端的接入」的推进顺序
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend
generated: followup-script

### 一句话

规模变大后先重新评估「OpenTelemetry 在前端的接入」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「OpenTelemetry 在前端的接入」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 OpenTelemetry 调整「OpenTelemetry 在前端的接入」的推进顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 机制：出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog；TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span
- 落地动作：回答「面对规模与资源变化并存时，你会如何围绕 OpenTelemetry 调整「OpenTelemetry 在前端的接入」的推进顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「面对规模与资源变化并存时，你会如何围绕 OpenTelemetry 调整「OpenTelemetry 在前端的接入」的推进顺序」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog
- TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span

## frontend-slo-error-budget

title: 前端 SLO 与错误预算：把可观测性接到发布闸门
followups: [frontend-slo-error-budget-followup-1, frontend-slo-error-budget-followup-2, frontend-slo-error-budget-followup-3]
difficulty: 资深
tags: [SLO, 错误预算, 发布治理]

### 一句话

可观测性不只是“看到问题”，还要“约束发布”：定义前端 SLI/SLO 和错误预算后，发布系统才能基于 burn rate 自动收紧节奏，把事故控制在可承受范围。

### 题目

你会如何给前端建立 SLO 与错误预算，并把它接到发布流程里，做到“预算吃紧就自动降风险”？

### 答案要点

- 先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量。
- SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”。
- 错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更。
- 结合 burn rate 做多窗口告警：短窗口抓突发，长窗口防慢性劣化，避免“瞬时波动”导致误触发。
- 发布闸门要自动化：CI/CD 接预算状态，预算告急时自动阻断高风险流水线并通知责任人。
- 预算超限后要有恢复路径：优先做止损（降级/回滚/关开关），再做根因修复和预算回补计划。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端 SLO 与错误预算：把可观测性接到发布闸门」时要先定义 前端 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端 关键链路先收敛再替换。

### 代码示例

```ts
type BudgetState = {
  budgetRatio: number; // 0~1，越大表示预算消耗越高
  burnRate1h: number;
  burnRate6h: number;
};

function releaseGate(state: BudgetState) {
  if (state.budgetRatio >= 0.9) return 'block_high_risk';
  if (state.burnRate1h > 2.0 && state.burnRate6h > 1.2) return 'slow_down';
  return 'allow';
}
```

```yaml
# 伪配置：预算状态驱动发布闸门
release_gates:
  - name: frontend-slo-budget
    when: budget_ratio >= 0.9
    action: block_high_risk_release
  - name: frontend-burn-rate
    when: burn_rate_1h > 2.0 && burn_rate_6h > 1.2
    action: require_oncall_approval
```

### 追问

- 「前端 SLO 与错误预算：把可观测性接到发布闸门」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只定义 SLO 不接发布闸门，最后变成“有看板、没约束”。
- 把预算超限理解成“禁止一切发布”，忽略修复发布的优先级。
- 阈值拍脑袋设定，没有结合历史基线和业务波动做校准。

### 延伸

- 可以把预算状态同步到值班群和发布面板，减少口头沟通损耗。
- 对高峰期（大促）可使用临时策略，但要明确生效窗口和恢复条件。

## incident-command-runbook

title: 前端事故响应闭环：告警分级、指挥机制与复盘回放
followups: [incident-command-runbook-followup-1, incident-command-runbook-followup-2, incident-command-runbook-followup-3]
difficulty: 资深
tags: [事故响应, Runbook, 复盘]

### 一句话

事故处理能力不是“谁先看到谁处理”，而是有分级、有指挥、有证据链：先止损恢复，再完成复盘闭环，确保同类问题不会反复出现。

### 题目

线上出现大面积白屏或关键流程失败时，你会如何组织前端事故响应，做到快速止损和闭环复盘？

### 答案要点

- 建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径。
- 明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥。
- Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。
- 证据链要完整：告警时间线、版本变更、session replay、trace、用户反馈要能串成同一事件。
- 恢复后立即进入复盘：区分根因、诱因、放大器，输出可跟踪的行动项（Owner + 截止时间 + 验收标准）。
- 复盘结论要回灌到工程系统：更新告警阈值、补自动化检查、完善演练脚本，形成“事故 -> 治理”闭环。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端事故响应闭环：告警分级、指挥机制与复盘回放」时要把 前端事故响应闭环 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，前端事故响应闭环 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「前端事故响应闭环：告警分级、指挥机制与复盘回放」里当前按阶段替换更稳。

### 代码示例

```yaml
incident_levels:
  sev1:
    trigger: 'white_screen_rate > 5% for 10m OR payment_success_drop > 20%'
    action: ['freeze_release', 'enable_safe_mode', 'start_war_room']
  sev2:
    trigger: 'error_rate > 2% for 15m'
    action: ['rollback_canary', 'assign_owner']
```

```ts
type IncidentEvent = {
  level: 'sev1' | 'sev2' | 'sev3';
  release: string;
  startedAt: number;
  mitigations: string[];
};

function shouldEscalate(e: IncidentEvent, now = Date.now()) {
  const durationMin = (now - e.startedAt) / 60000;
  return e.level === 'sev2' && durationMin > 20 && e.mitigations.length < 2;
}
```

### 追问

- 「前端事故响应闭环：告警分级、指挥机制与复盘回放」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 事故期临时拉群、临时分工，导致沟通成本远高于定位成本。
- 复盘只写“人因”不落工程改进，下一次同类事故仍会复现。
- 只关注恢复时间，不关注恢复后是否稳定，导致反复抖动。

### 延伸

- 建议每月做一次轻量故障演练，验证 Runbook 不是“纸面流程”。
- 关键系统可设置“事故证据最小集”模板，减少临场遗漏。

## frontend-slo-error-budget-followup-1

title: 追问：以「前端 SLO 与错误预算：把可观测性接到发布闸门」为例，你会如何识别「前端 SLO 与错误预算：把可观测性接到发布闸门」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [SLO, 错误预算, 发布治理, 追问]
parent: frontend-slo-error-budget
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「前端 SLO 与错误预算：把可观测性接到发布闸门」时要能同时解释收益、代价和失败信号。；讲「前端 SLO 与错误预算：把可观测性接到发布闸门」时先给 SLO 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「前端 SLO 与错误预算：把可观测性接到发布闸门」为例，你会如何识别「前端 SLO 与错误预算：把可观测性接到发布闸门」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 标准回答（直接作答）

- 结论：先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量
- 机制：SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”；错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更
- 落地动作：回答「以「前端 SLO 与错误预算：把可观测性接到发布闸门」为例，你会如何识别「前端 SLO 与错误预算：把可观测性接到发布闸门」在真实流量下最容易失效的输入与环境约束」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「前端 SLO 与错误预算：把可观测性接到发布闸门」为例，你会如何识别「前端 SLO 与错误预算：把可观测性接到发布闸门」在真实流量下最容易失效的输入与环境约束」时要先定义 前端 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量
- SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”
- 错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更

## frontend-slo-error-budget-followup-2

title: 追问：在「前端 SLO 与错误预算：把可观测性接到发布闸门」场景下，为了证明这个方案在 SLO 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [SLO, 错误预算, 发布治理, 追问]
parent: frontend-slo-error-budget
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「前端 SLO 与错误预算：把可观测性接到发布闸门」在当前约束下为什么成立。；建议按「输入约束 -> SLO 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「前端 SLO 与错误预算：把可观测性接到发布闸门」场景下，为了证明这个方案在 SLO 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量
- 机制：SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”；错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更
- 落地动作：回答「在「前端 SLO 与错误预算：把可观测性接到发布闸门」场景下，为了证明这个方案在 SLO 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 前端 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，前端 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「在「前端 SLO 与错误预算：把可观测性接到发布闸门」场景下，为了证明这个方案在 SLO 维度有效，你会怎么设计测试闭环和线上观测指标」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量
- SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”
- 错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更

## frontend-slo-error-budget-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 SLO 调整方案边界与实施节奏
difficulty: 资深
tags: [SLO, 错误预算, 发布治理, 追问]
parent: frontend-slo-error-budget
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端 SLO 与错误预算：把可观测性接到发布闸门」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> SLO 方案动作 -> 验证结果」。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 SLO 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量
- 机制：SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”；错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更
- 落地动作：回答「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 SLO 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当兼容性要求提升或预 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当兼容性要求提升或预，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 SLO 调整方案边界与实施节奏」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量
- SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”
- 错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更

## incident-command-runbook-followup-1

title: 追问：结合真实业务约束，围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」做方案评审时，哪些 事故响应 边界输入最容易导致结论失真
difficulty: 资深
tags: [事故响应, Runbook, 复盘, 追问]
parent: incident-command-runbook
generated: followup-script

### 一句话

先界定「前端事故响应闭环：告警分级、指挥机制与复盘回放」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」的核心机制展开：正常路径要能讲清楚。

### 题目

如果面试官追问：结合真实业务约束，围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」做方案评审时，哪些 事故响应 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径
- 机制：明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥；Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤
- 落地动作：回答「结合真实业务约束，围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」做方案评审时，哪些 事故响应 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」做方案评审时，哪些 事故响应 边界输入最容易导致结论失真」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径
- 明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥
- Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤

## incident-command-runbook-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 事故响应 方案有效
difficulty: 资深
tags: [事故响应, Runbook, 复盘, 追问]
parent: incident-command-runbook
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端事故响应闭环：告警分级、指挥机制与复盘回放」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 事故响应 方案动作 -> 验证结果」。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 事故响应 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径
- 机制：明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥；Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤
- 落地动作：回答「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 事故响应 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了避免主观判断 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了避免主观判断 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 事故响应 方案有效」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径
- 明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥
- Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤

## incident-command-runbook-followup-3

title: 追问：在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级
difficulty: 资深
tags: [事故响应, Runbook, 复盘, 追问]
parent: incident-command-runbook
generated: followup-script

### 一句话

规模变大后先重新评估「前端事故响应闭环：告警分级、指挥机制与复盘回放」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「前端事故响应闭环：告警分级、指挥机制与复盘回放」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径
- 机制：明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥；Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤
- 落地动作：回答「在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级」时要把 当需求规模 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，当需求规模 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径
- 明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥
- Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤

## observability-release-readiness-gate

title: 可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理]
followups: [observability-release-readiness-gate-followup-1, observability-release-readiness-gate-followup-2, observability-release-readiness-gate-followup-3]

### 一句话

没有观测就没有发布把握：上线前把埋点覆盖、告警质量和恢复能力做成联合闸门，才能避免“功能上线了，事故却看不见”。

### 题目

一个核心前端系统准备发布大版本改造。你会如何定义“可观测性发布就绪”标准，把观测能力变成真正的发布准入条件？

### 答案要点

- 先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集。
- 质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”。
- 恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过。
- 发布前做探针检查：验证版本号、source map、采样配置、上报通道和看板同步正确。
- 门禁策略分级：缺少阻断级信号直接禁止发布，观察级信号允许带风险上线并限期整改。
- 发布后首小时要重点盯盘：对比基线判断是否存在隐性劣化，避免“上线后无人接盘”。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 可观测性发布就绪闸门 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 可观测性发布就绪闸门，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type ObsReadiness = {
  keyPathCoverage: number;
  alertPrecision: number;
  rollbackDrillPassed: boolean;
  sourcemapReady: boolean;
};

function canReleaseWithObservability(o: ObsReadiness) {
  return (
    o.keyPathCoverage >= 0.95 &&
    o.alertPrecision >= 0.8 &&
    o.rollbackDrillPassed &&
    o.sourcemapReady
  );
}
```

```yaml
observability_gate:
  required:
    key_path_coverage: '>= 95%'
    alert_precision: '>= 80%'
    rollback_drill: pass
    sourcemap_uploaded: true
  on_fail: block_release
```

### 追问

- 「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只检查“有埋点”，不检查埋点语义和链路可用性。
- 告警规则全靠经验堆叠，缺少历史数据校准。
- 发布门禁和运行时看板脱节，导致通过后仍看不到关键风险。

### 延伸

- 建议为每个高风险业务域维护“观测就绪评分卡”。
- 可把门禁结果直接同步到发布审批流，减少口头确认成本。

## burn-rate-auto-mitigation-orchestration

title: Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复
difficulty: 资深
tags: [SLO, BurnRate, 事故响应]
followups: [burn-rate-auto-mitigation-orchestration-followup-1, burn-rate-auto-mitigation-orchestration-followup-2, burn-rate-auto-mitigation-orchestration-followup-3]

### 一句话

SLO 真正有用在于“预算消耗异常时能自动行动”：把 burn rate 告警接到分级止损编排，才能把事故从被动响应变成主动收敛。

### 题目

你已经有前端 SLO 和错误预算，但值班反馈“告警响了也不知道先做什么”。你会如何设计 burn rate 驱动的自动止损编排？

### 答案要点

- burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判。
- 告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚。
- 每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚。
- 观测要覆盖“动作效果”：止损后错误率、延迟、业务转化是否回归阈值。
- 自动化与人工协同：自动动作可先执行，但关键切换点需保留人工确认窗口。
- 恢复策略同样要编排：连续稳定一段时间后逐步恢复功能，避免反复抖动。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」时要把 Burn 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Burn 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里当前按阶段替换更稳。

### 代码示例

```ts
type BurnRateSignal = { shortWindow: number; longWindow: number };

function mitigationLevel(s: BurnRateSignal): 'observe' | 'degrade' | 'rollback' {
  if (s.shortWindow >= 10 || s.longWindow >= 4) return 'rollback';
  if (s.shortWindow >= 4 || s.longWindow >= 2) return 'degrade';
  return 'observe';
}
```

```yaml
burn_rate_orchestration:
  windows:
    short: 5m
    long: 1h
  actions:
    degrade:
      - disable_non_critical_features
      - freeze_risky_release
    rollback:
      - rollback_latest_release
      - enable_safe_mode
```

### 追问

- 「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只有告警没有动作编排，值班仍需临场拍板。
- 自动回滚后不复核恢复质量，导致服务反复波动。
- 多窗口阈值不校准，长期出现“不是漏报就是噪音”。

### 延伸

- 建议每月复盘 burn rate 告警质量，持续优化阈值与动作映射。
- 可将编排状态接入值班群机器人，缩短协同响应时间。

## observability-release-readiness-gate-followup-1

title: 追问：结合真实业务约束，如果要做「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理, 追问]
parent: observability-release-readiness-gate
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」在当前约束下为什么成立。；围绕「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」组织答案时。

### 题目

如果面试官追问：结合真实业务约束，如果要做「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集
- 机制：质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”；恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过
- 落地动作：回答「结合真实业务约束，如果要做「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果要做「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时要先定义 可观测性发布就绪闸门 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，可观测性发布就绪闸门 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 可观测性发布就绪闸门 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集
- 质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”
- 恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过

## observability-release-readiness-gate-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 可观测性 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理, 追问]
parent: observability-release-readiness-gate
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」在当前约束下为什么成立。；回答结构可按「触发条件 -> 可观测性 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 可观测性 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集
- 机制：质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”；恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过
- 落地动作：回答「在当前团队与业务约束下，上线后你会盯哪些与 可观测性 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，上线后你会盯哪些与 可观测性 相关的日志与指标，来确认这套方案确实带来改进」时要先定义 上线后你会盯哪些与 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，上线后你会盯哪些与 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 上线后你会盯哪些与 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集
- 质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”
- 恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过

## observability-release-readiness-gate-followup-3

title: 追问：这套「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」要不要继续投人投钱，你会盯哪几组和 可观测性 相关的数据先说话
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理, 追问]
parent: observability-release-readiness-gate
generated: followup-script

### 一句话

规模变大后先重新评估「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」对应的工程可维护性收益被复杂度抵消。

### 题目

如果面试官追问：这套「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」要不要继续投人投钱，你会盯哪几组和 可观测性 相关的数据先说话？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集
- 机制：质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”；恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过
- 落地动作：回答「这套「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」要不要继续投人投钱，你会盯哪几组和 可观测性 相关的数据先说话」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 这套 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 这套，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「这套「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」要不要继续投人投钱，你会盯哪几组和 可观测性 相关的数据先说话」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集
- 质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”
- 恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过

## burn-rate-auto-mitigation-orchestration-followup-1

title: 追问：以「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」为例，如果要做「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [SLO, BurnRate, 事故响应, 追问]
parent: burn-rate-auto-mitigation-orchestration
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」讲成只在理想输入下可用。；围绕「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」组织答案时。

### 题目

如果面试官追问：以「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」为例，如果要做「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判
- 机制：告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚；每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚
- 落地动作：回答「以「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」为例，如果要做「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」为例，如果要做「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判
- 告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚
- 每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚

## burn-rate-auto-mitigation-orchestration-followup-2

title: 追问：在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [SLO, BurnRate, 事故响应, 追问]
parent: burn-rate-auto-mitigation-orchestration
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」在当前约束下为什么成立。；建议按「输入约束 -> SLO 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判
- 机制：告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚；每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚
- 落地动作：回答「在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进」时要把 Burn 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Burn 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进」里当前按阶段替换更稳。

#### 关键细节（可追问）

- burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判
- 告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚
- 每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚

## burn-rate-auto-mitigation-orchestration-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 SLO 调整「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」方案的边界和节奏
difficulty: 资深
tags: [SLO, BurnRate, 事故响应, 追问]
parent: burn-rate-auto-mitigation-orchestration
generated: followup-script

### 一句话

规模变大后先重新评估「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 SLO 调整「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判
- 机制：告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚；每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚
- 落地动作：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 SLO 调整「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 SLO 调整「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」方案的边界和节奏」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判
- 告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚
- 每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚

## alert-fatigue-budget-governance

title: 告警疲劳预算治理：噪音配额、升级纪律与静默止损
difficulty: 资深
tags: [告警治理, oncall, 事故响应]
followups: [alert-fatigue-budget-governance-followup-1, alert-fatigue-budget-governance-followup-2, alert-fatigue-budget-governance-followup-3]

### 一句话

告警治理不是“把阈值调高”，而是“让每一次响铃都值得响应”。

### 题目

近期值班团队反馈告警噪音过高，夜间大量误报导致关键告警被淹没。你会如何建立告警疲劳预算治理机制，恢复告警系统的可信度？

### 答案要点

- 先定义告警预算：按团队与业务域设定“可接受噪音上限”。
- 告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾。
- 误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则。
- 静默策略必须可追溯：谁静默、静默多久、何时恢复要有审计记录。
- 每周复盘“高噪音前十规则”，优先治理高频误报源头。
- 通过“命中后行动率”衡量告警质量，不再只看触发次数。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 告警疲劳预算治理 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 告警疲劳预算治理，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「告警疲劳预算治理：噪音配额、升级纪律与静默止损」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type AlertNoiseSnapshot = {
  alertsTriggered: number;
  actionableAlerts: number;
  nightPageCount: number;
};

function isAlertFatigueRisk(s: AlertNoiseSnapshot) {
  const actionRate = s.actionableAlerts / Math.max(s.alertsTriggered, 1);
  return actionRate < 0.3 || s.nightPageCount > 8;
}
```

```yaml
alert_fatigue_policy:
  budgets:
    max_night_pages_per_oncall: 8
    min_actionable_rate: 0.3
  require:
    - owner
    - escalation_path
    - silence_expiry
  enforce:
    - weekly_top_noise_review
    - stale_rule_cleanup
```

### 追问

- 「告警疲劳预算治理：噪音配额、升级纪律与静默止损」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做静默不做根因治理，噪音会在下个周期回潮。
- 告警级别定义不绑定动作，导致级别存在但执行混乱。
- 把“触发次数下降”误当作治理成功，忽略漏报风险上升。

### 延伸

- 可引入告警规则评分卡，按信噪比动态调优。
- 建议将告警质量纳入值班与平台共担指标。

## incident-evidence-closure-protocol

title: 事故证据闭环协议：从告警命中到恢复确认的最后一公里
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理]
followups: [incident-evidence-closure-protocol-followup-1, incident-evidence-closure-protocol-followup-2, incident-evidence-closure-protocol-followup-3]

### 一句话

事故“看起来恢复”不等于真的恢复，必须有可复核证据链做闭环。

### 题目

一次线上事故在告警恢复后又反复出现，团队争议焦点是“到底有没有真正修复”。你会如何建立事故证据闭环协议，避免“误恢复”？

### 答案要点

- 定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可。
- 每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论。
- 恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）。
- 设立“观察期再开闸”规则：短暂回落不立即宣布恢复。
- 事故关闭必须写明残留风险与后续计划，防止“关单即遗忘”。
- 周会复盘“误恢复案例”，持续完善恢复判定规则。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 事故证据闭环协议 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 事故证据闭环协议，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「事故证据闭环协议：从告警命中到恢复确认的最后一公里」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type RecoveryEvidence = {
  alertRecovered: boolean;
  keyPathSuccessRate: number;
  bizMetricRecovered: boolean;
};

function canCloseIncident(e: RecoveryEvidence) {
  return e.alertRecovered && e.keyPathSuccessRate >= 0.995 && e.bizMetricRecovered;
}
```

```yaml
incident_closure_protocol:
  require_evidence:
    - alert_recovery_window
    - key_path_success_rate
    - business_metric_recovery
    - residual_risk_note
  close_when:
    observation_window_min: '>= 30'
    key_path_success_rate: '>= 99.5%'
```

### 追问

- 「事故证据闭环协议：从告警命中到恢复确认的最后一公里」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看监控回落就关单，没有验证业务侧是否真正恢复。
- 证据链记录不完整，事后无法复盘关键判断节点。
- 恢复判定没有观察窗口，导致反复“开单-关单”。

### 延伸

- 可将“事故关闭质量”纳入季度稳定性治理评估。
- 建议为关键事故类型预置证据模板，缩短闭环时间。

## alert-fatigue-budget-governance-followup-1

title: 追问：告警预算上线前先验哪些关键假设
difficulty: 资深
tags: [告警治理, oncall, 事故响应, 追问]
parent: alert-fatigue-budget-governance
generated: followup-script

### 一句话

我会先验三点：告警分级是否和动作匹配、静默策略是否可追溯、误报治理 SLA 是否可执行。；重点检查夜间高频规则，先处理最容易制造疲劳的噪音源。；若边界不清，宁可先小范围试点，也不全量上线新规则。

### 题目

如果面试官追问：告警预算机制上线前，你会先验哪些关键假设，避免“降噪做了但值班更乱”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义告警预算：按团队与业务域设定“可接受噪音上限”
- 机制：告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾；误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则
- 落地动作：回答「告警预算上线前先验哪些关键假设」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「告警预算上线前先验哪些关键假设」时要先定义 告警预算上线前先验哪 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，告警预算上线前先验哪 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 告警预算上线前先验哪 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义告警预算：按团队与业务域设定“可接受噪音上限”
- 告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾
- 误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则

## alert-fatigue-budget-governance-followup-2

title: 追问：你会怎样验证告警降噪不是纸面优化
difficulty: 资深
tags: [告警治理, oncall, 事故响应, 追问]
parent: alert-fatigue-budget-governance
generated: followup-script

### 一句话

我会同时看信噪比和漏报率，避免只追求告警数量下降。；指标至少覆盖：夜间 page 次数、命中后行动率、关键事故漏报数。；每次降噪规则调整都做回放验证，确认不会削弱故障发现能力。

### 题目

如果面试官追问：你说告警降噪有效，那怎么证明不是“响得少了，但关键问题也漏了”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义告警预算：按团队与业务域设定“可接受噪音上限”
- 机制：告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾；误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则
- 落地动作：回答「你会怎样验证告警降噪不是纸面优化」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样验证告警降噪不是纸面优化」时要先定义 你会怎样验证告警降噪 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会怎样验证告警降噪 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会怎样验证告警降噪 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义告警预算：按团队与业务域设定“可接受噪音上限”
- 告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾
- 误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则

## alert-fatigue-budget-governance-followup-3

title: 追问：约束变化时如何渐进演进告警治理
difficulty: 资深
tags: [告警治理, oncall, 事故响应, 追问]
parent: alert-fatigue-budget-governance
generated: followup-script

### 一句话

我会按阶段调整：先收敛噪音规则，再重排升级路径，最后优化自动化动作。；高风险告警保持强敏感，低价值告警优先聚合或改为日报。；每月复盘前十高噪音规则，持续小步迭代比一次性重构更稳。

### 题目

如果面试官追问：业务量增长或值班人手收紧时，你会怎么渐进调整告警治理，而不是推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义告警预算：按团队与业务域设定“可接受噪音上限”
- 机制：告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾；误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则
- 落地动作：回答「约束变化时如何渐进演进告警治理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 约束变化时如何渐进演 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 约束变化时如何渐进演，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「约束变化时如何渐进演进告警治理」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义告警预算：按团队与业务域设定“可接受噪音上限”
- 告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾
- 误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则

## incident-evidence-closure-protocol-followup-1

title: 追问：事故闭环里哪些边界最容易导致误恢复
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理, 追问]
parent: incident-evidence-closure-protocol
generated: followup-script

### 一句话

最容易出错的是只看告警回落，不看关键业务链路和用户侧恢复。；观测窗口过短也会导致误恢复，必须覆盖一个完整业务周期。；对高风险事故要做二次确认：技术指标回稳后再看业务指标。

### 题目

如果面试官追问：事故看起来恢复了却又复发，通常是哪些边界没验到位，你会怎么防？

### 答案要点

#### 标准回答（直接作答）

- 结论：定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可
- 机制：每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论；恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）
- 落地动作：回答「事故闭环里哪些边界最容易导致误恢复」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 事故闭环里哪些边界最 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 事故闭环里哪些边界最，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「事故闭环里哪些边界最容易导致误恢复」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可
- 每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论
- 恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）

## incident-evidence-closure-protocol-followup-2

title: 追问：团队经验不均时怎么分段落地证据闭环
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理, 追问]
parent: incident-evidence-closure-protocol
generated: followup-script

### 一句话

我会拆三段：证据采集、恢复确认、关单复核，每段都有固定模板和验收标准。；新手先执行模板化动作，资深同学负责关键判断和最终拍板。；每段都保留复核记录，确保交接时不丢上下文。

### 题目

如果面试官追问：团队里有新手也有老手，你会如何把事故证据闭环拆成可分段执行且可独立验收的流程？

### 答案要点

#### 标准回答（直接作答）

- 结论：定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可
- 机制：每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论；恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）
- 落地动作：回答「团队经验不均时怎么分段落地证据闭环」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 团队经验不均时怎么分 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 团队经验不均时怎么分，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「团队经验不均时怎么分段落地证据闭环」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可
- 每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论
- 恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）

## incident-evidence-closure-protocol-followup-3

title: 追问：预算收紧时如何调整事故闭环节奏
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理, 追问]
parent: incident-evidence-closure-protocol
generated: followup-script

### 一句话

我会先保留关键证据链路，再压缩低价值采集与重复复核步骤。；对高风险事故维持完整闭环，对低风险事故采用轻量流程加抽检。；每次收敛都要验证“恢复质量是否下降”，不能只看人力节省。

### 题目

如果面试官追问：预算收紧但稳定性目标不变，你会怎么调整事故闭环节奏，既不失控也不拖慢恢复？

### 答案要点

#### 标准回答（直接作答）

- 结论：定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可
- 机制：每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论；恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）
- 落地动作：回答「预算收紧时如何调整事故闭环节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 预算收紧时如何调整事 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 预算收紧时如何调整事，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「预算收紧时如何调整事故闭环节奏」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可
- 每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论
- 恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）
