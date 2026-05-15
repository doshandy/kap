---
id: 16-observability
title: 可观测性
order: 16
icon: 📈
description: 错误监控、RUM、埋点、会话回放、日志与告警体系。
---

## error-capture

title: 前端错误捕获链路应该怎么搭
followups: [error-capture-followup-1]
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

- 如果把「前端错误捕获链路应该怎么搭」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 错误采集不是越多越好，去重和上下文质量同样重要
- 某些跨域脚本若没有正确的 CORS / `crossorigin` 配置，浏览器暴露给前端的错误信息会非常有限

## source-map-symbolicate

title: Source Map 上传与错误还原
followups: [source-map-symbolicate-followup-1]
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

- 如果把「Source Map 上传与错误还原」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- sourcemap 上传失败，往往不是"小问题"，会直接让故障排查效率腰斩

## rum-web-vitals

title: RUM 与 Web Vitals 才能告诉你真实用户体验
followups: [rum-web-vitals-followup-1]
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

- 如果把「RUM 与 Web Vitals 才能告诉你真实用户体验」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 指标如果不能按版本、页面和人群切开看，价值会大打折扣
- `PerformanceObserver` 能提供大量基础信号，但要注意不同条目类型支持差异、缓冲区上限和条目丢失

## event-model

title: 埋点模型设计：事件、属性、上下文、会话
followups: [event-model-followup-1]
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

- 如果把「埋点模型设计：事件、属性、上下文、会话」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 数据建模能力，是前端做增长和分析系统时的核心竞争力之一
- 事件字典、埋点版本和淘汰机制若不治理，后期分析口径会迅速失真

## reporting-channel

title: Beacon、fetch keepalive 与监控上报通道怎么选
followups: [reporting-channel-followup-1]
difficulty: 进阶
tags: [Beacon, keepalive, 上报]

### 一句话

sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达；sendBeacon() 只适合小体积、POST、不关心响应内容的上报；如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用…。

### 题目

前端监控为什么经常偏爱 `navigator.sendBeacon()`？什么时候又该改用 `fetch(..., { keepalive: true })`？

### 答案要点

- `sendBeacon()` 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- `sendBeacon()` 只适合小体积、`POST`、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，`fetch` 搭配 `keepalive: true` 更灵活
- 无论哪种方式，都要考虑限流、采样、失败重试和离线场景补偿，避免监控反过来影响页面性能

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

- 如果把「Beacon、fetch keepalive 与监控上报通道怎么选」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- "页面关闭前再发一次"不是万能兜底，设计上仍应尽量把关键事件及时上报
- 上报链路本身也应被监控，否则你可能长期不知道监控已经失效

## session-replay-alert

title: 会话回放、采样与告警阈值
followups: [session-replay-alert-followup-1]
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

- 如果把「会话回放、采样与告警阈值」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 告警系统最怕"大家都知道它在响，但没人信它"
- 告警要明确 owner、升级路径和静默规则，否则再好的采集也很难形成真正闭环

## privacy-compliance

title: 可观测性与隐私合规的平衡
followups: [privacy-compliance-followup-1]
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

- 如果把「可观测性与隐私合规的平衡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 监控不是法外之地，越成熟的团队越重视数据采集边界

## opentelemetry-frontend

title: OpenTelemetry 在前端的接入
followups: [opentelemetry-frontend-followup-1]
difficulty: 资深
tags: [OpenTelemetry, Trace]

### 一句话

SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load；出口：OTLP HTTP / gRPC…。

### 题目

后端常用 OpenTelemetry 做分布式追踪，前端怎么接入并把链路打通？

### 答案要点

- SDK：`@opentelemetry/sdk-trace-web` + `@opentelemetry/instrumentation-fetch / xml-http-request / document-load`
- 出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog
- TraceContext：fetch 自动注入 `traceparent` header，后端继续传播形成端到端 span
- 用户行为 span：路由切换、关键交互埋成 span，便于回溯
- 采样：默认全采本地 dev，生产采样率 5%–10%；错误请求 100% 采
- 隐私：URL / 参数中的 PII 要 redact，避免外泄

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

- 如果把「OpenTelemetry 在前端的接入」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 配合 RUM 还可以聚合 user journey，定位"特定路径下错误率高"的原因
- 前端 trace 量大、价值密度低，建议用尾采样（tail sampling）+ 错误优先

## frontend-feature-flag

title: 前端 A/B 测试与特性开关的工程实现
followups: [frontend-feature-flag-followup-1]
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

- 如果把「前端 A/B 测试与特性开关的工程实现」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 不要把所有 flag 都丢同一个对象，否则任何一个 flag 变更全站都要重渲染
- 实验设计需要数据团队配合，前端只负责"正确分桶 + 正确埋点"

## frontend-error-monitor

title: 前端如何全链路捕获错误并上报
followups: [frontend-error-monitor-followup-1]
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

- 如果把「前端如何全链路捕获错误并上报」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- Sentry / Bugsnag / 阿里 ARMS / 字节 Slardar 都是成熟方案
- 大型应用建议自建：上报量大、字段定制多
- AI 时代可对错误聚合做"自动归因"，找最近一次代码改动

## white-screen-detection

title: 前端白屏怎么检测？
followups: [white-screen-detection-followup-1]
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

- 如果把「前端白屏怎么检测？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 视频回放（rrweb / LogRocket）能直接看用户白屏画面
- 配合"健康检查页"：每分钟 ping 真实页面，自动报警

## ab-experiment-frontend

title: 前端怎么承接 A/B 实验？
followups: [ab-experiment-frontend-followup-1]
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

- 如果把「前端怎么承接 A/B 实验？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

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
followups: [lcp-rum-collection-followup-1, lcp-rum-collection-followup-2, lcp-rum-collection-followup-3, lcp-rum-collection-followup-4, lcp-rum-collection-followup-5, lcp-rum-collection-followup-6, lcp-rum-collection-followup-7, lcp-rum-collection-followup-8]
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
followups: [tbt-and-long-task-collection-followup-1, tbt-and-long-task-collection-followup-2, tbt-and-long-task-collection-followup-3, tbt-and-long-task-collection-followup-4, tbt-and-long-task-collection-followup-5, tbt-and-long-task-collection-followup-6, tbt-and-long-task-collection-followup-7, tbt-and-long-task-collection-followup-8]
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
followups: [source-map-stack-trace-followup-1, source-map-stack-trace-followup-2, source-map-stack-trace-followup-3, source-map-stack-trace-followup-4, source-map-stack-trace-followup-5, source-map-stack-trace-followup-6]
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
followups: [white-screen-detection-deep-followup-1, white-screen-detection-deep-followup-2, white-screen-detection-deep-followup-3, white-screen-detection-deep-followup-4, white-screen-detection-deep-followup-5, white-screen-detection-deep-followup-6]
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
followups: [rrweb-on-demand-recording-followup-1, rrweb-on-demand-recording-followup-2, rrweb-on-demand-recording-followup-3, rrweb-on-demand-recording-followup-4, rrweb-on-demand-recording-followup-5, rrweb-on-demand-recording-followup-6]
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

title: 追问：如果把「前端错误捕获链路应该怎么搭」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 基础
tags: [错误监控, ErrorBoundary, 追问]
parent: error-capture

### 题目

如果面试官追问：如果把「前端错误捕获链路应该怎么搭」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 运行时脚本错误可由 window.onerror 捕获
- 未处理 Promise 异常由 unhandledrejection 捕获
- Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-symbolicate-followup-1

title: 追问：如果把「Source Map 上传与错误还原」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate

### 题目

如果面试官追问：如果把「Source Map 上传与错误还原」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原
- sourcemap 上传失败，往往不是"小问题"，会直接让故障排查效率腰斩
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rum-web-vitals-followup-1

title: 追问：如果把「RUM 与 Web Vitals 才能告诉你真实用户体验」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals

### 题目

如果面试官追问：如果把「RUM 与 Web Vitals 才能告诉你真实用户体验」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等
- 指标如果不能按版本、页面和人群切开看，价值会大打折扣
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## event-model-followup-1

title: 追问：如果把「埋点模型设计：事件、属性、上下文、会话」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model

### 题目

如果面试官追问：如果把「埋点模型设计：事件、属性、上下文、会话」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 要有稳定事件命名、属性字典、用户上下文和版本上下文
- 事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名
- 埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## reporting-channel-followup-1

title: 追问：如果把「Beacon、fetch keepalive 与监控上报通道怎么选」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel

### 题目

如果面试官追问：如果把「Beacon、fetch keepalive 与监控上报通道怎么选」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- sendBeacon() 只适合小体积、POST、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## session-replay-alert-followup-1

title: 追问：如果把「会话回放、采样与告警阈值」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert

### 题目

如果面试官追问：如果把「会话回放、采样与告警阈值」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 告警阈值太低会噪音泛滥，太高又会错过故障
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## privacy-compliance-followup-1

title: 追问：如果把「可观测性与隐私合规的平衡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance

### 题目

如果面试官追问：如果把「可观测性与隐私合规的平衡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 监控不是法外之地，越成熟的团队越重视数据采集边界
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## opentelemetry-frontend-followup-1

title: 追问：如果把「OpenTelemetry 在前端的接入」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend

### 题目

如果面试官追问：如果把「OpenTelemetry 在前端的接入」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## frontend-feature-flag-followup-1

title: 追问：如果把「前端 A/B 测试与特性开关的工程实现」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag

### 题目

如果面试官追问：如果把「前端 A/B 测试与特性开关的工程实现」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 实验设计需要数据团队配合，前端只负责"正确分桶 + 正确埋点"
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## frontend-error-monitor-followup-1

title: 追问：如果把「前端如何全链路捕获错误并上报」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor

### 题目

如果面试官追问：如果把「前端如何全链路捕获错误并上报」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 白屏检测：通过定期检查根节点是否有内容、Performance 指标 LCP 是否上报
- Source Map：构建产物 sourcemap 上传到监控平台（Sentry / 自建），上报时只传 stack + line/column
- 采样策略：低频错误 100% 上报，高频用 fingerprint 聚合 + 采样
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-followup-1

title: 追问：如果把「前端白屏怎么检测？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection

### 题目

如果面试官追问：如果把「前端白屏怎么检测？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 关键元素：业务约定一个标识，如 ，没出现 = 白屏
- 性能 API：FCP / LCP 是否触发；超时未触发 = 白屏
- 命中疑似白屏 → 上报 + 收集环境信息（UA / 网络 / 路由 / 错误日志）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## ab-experiment-frontend-followup-1

title: 追问：如果把「前端怎么承接 A/B 实验？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend

### 题目

如果面试官追问：如果把「前端怎么承接 A/B 实验？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）
- 曝光埋点：用户实际看到实验位才算曝光（用 IntersectionObserver）
- 不要把实验分组放页面参数里 leak 给 SEO
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## js-error-types-basic-followup-1

title: 追问：怎么把 source map 反解到真实代码位置
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic

### 题目

如果面试官追问：怎么把 source map 反解到真实代码位置（云端反解 / 本地 stack-utils）

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「JS 错误监听都有哪几个钩子？各管什么？」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## js-error-types-basic-followup-2

title: 追问：上报通道选 sendBeacon 还是 fetch keepalive
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic

### 题目

如果面试官追问：上报通道选 sendBeacon 还是 fetch keepalive

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 长任务（PerformanceLongTaskTiming）也算"非异常但需上报"的健康指标
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## js-error-types-basic-followup-3

title: 追问：海量错误怎么聚合
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic

### 题目

如果面试官追问：海量错误怎么聚合（指纹 / 采样）

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- Vue：app.config.errorHandler；React：ErrorBoundary（仅渲染错误，事件错误它收不到）
- 只监听 window.onerror —— 资源错误和 Promise 错误漏报
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-1

title: 追问：怎么把 LCP 收集和后端 trace 关联
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：怎么把 LCP 收集和后端 trace 关联？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 元素也要带：LCP element 的 tagName / id / src / outerHTML.slice(0,200)，方便定位"是谁拖慢"
- 关注 P75 / P90（不是平均值），LCP 标准 P75 < 2.5s
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-2

title: 追问：上报里带 traceparent
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：上报里带 traceparent（前端注入或后端模板注入）

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）
- 灰度时按 hash(uid) 分两桶；上报时带 variant 标签
- 在 load 时上报 LCP：LCP 可能在 load 之后才更新（懒加载图、字体回流）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-3

title: 追问：75 分位还是 90 分位有意义？为什么不用平均
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：75 分位还是 90 分位有意义？为什么不用平均？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 不能用"AB 实验组分位数 vs 大盘分位数"直接对比 → 选择性偏差
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-4

title: 追问：长尾用户体验代表性强；CWV 标准本身就是 P75
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：长尾用户体验代表性强；CWV 标准本身就是 P75

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 业务路径：是否登录、用户分层、A/B variant
- 关注 P75 / P90（不是平均值），LCP 标准 P75 < 2.5s
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-5

title: 追问：LCP 优化到 90 分，实际用户没感觉，怎么解释
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：LCP 优化到 90 分，实际用户没感觉，怎么解释？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 元素也要带：LCP element 的 tagName / id / src / outerHTML.slice(0,200)，方便定位"是谁拖慢"
- 业务路径：是否登录、用户分层、A/B variant
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-6

title: 追问：实验室是 throttling 模拟，可能跟用户网络分布差异大；线上要看 RUM
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：实验室是 throttling 模拟，可能跟用户网络分布差异大；线上要看 RUM

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- \*RUM 维度（缺一不可）\*\*
- 实验：feature flag 桶 ID + 灰度版本 + commit
- 大盘是业务全量分布，AB 对比的是实验同期同环境两组
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-7

title: 追问：没装 web-vitals 库自己实现要注意什么
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：没装 web-vitals 库自己实现要注意什么？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 进阶：用 web-vitals 库的 attribution build，能直接告诉你 LCP 元素是 image / text，资源 URL，pre-paint delay
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lcp-rum-collection-followup-8

title: 追问：别忘了 buffered: true、定时定格、用 sendBeacon、SPA 切路由 reset
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 题目

如果面试官追问：别忘了 `buffered: true`、定时定格、用 sendBeacon、SPA 切路由 reset

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 用 navigator.sendBeacon / fetch keepalive 保证页面卸载时不丢
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-1

title: 追问：requestIdleCallback 不被支持的浏览器怎么办
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：requestIdleCallback 不被支持的浏览器（Safari < 15）怎么办？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- \*上报策略：为什么用 requestIdleCallback\*\*
- requestIdleCallback 在浏览器空闲时回调，不抢用户交互
- 超时兜底：requestIdleCallback(cb, { timeout: 2000 }) 超过 2s 强制执行
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-2

title: 追问：polyfill： = setTimeout + 用 IdleDeadline 模拟，或直接用 setTimeout 退化
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：polyfill：`(cb) => setTimeout(cb, 1)` + 用 IdleDeadline 模拟，或直接用 `setTimeout` 退化

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 超时兜底：requestIdleCallback(cb, { timeout: 2000 }) 超过 2s 强制执行
- 轮询定时器：setTimeout 一定时间还没 flush 就强制
- 只用 setTimeout 上报：会阻塞用户交互
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-3

title: 追问：紧急上报怎么不丢
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：紧急上报怎么不丢？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 实验室能算 TBT；线上更适合上报"FCP→FID/INP 期间所有 long task 总长"近似 TBT
- \*上报策略：为什么用 requestIdleCallback\*\*
- LCP / TBT / Long Task 这类观测数据非紧急，应该让出主线程
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-4

title: 追问：sendBeacon 优先；同时把数据写进 IndexedDB，下次启动时检查未上报 → 重发
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：sendBeacon 优先；同时把数据写进 IndexedDB，下次启动时检查未上报 → 重发

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 实验室能算 TBT；线上更适合上报"FCP→FID/INP 期间所有 long task 总长"近似 TBT
- \*上报策略：为什么用 requestIdleCallback\*\*
- 攒批：积累多条上报合并成一次请求，减少网络开销
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-5

title: 追问：主线程被疯狂占用，监控本身也卡住怎么办
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：主线程被疯狂占用，监控本身也卡住怎么办？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- LCP / TBT / Long Task 这类观测数据非紧急，应该让出主线程
- 主线程长期被占（rIC 不触发）：
- 上报立刻执行：导致自身成为 long task 来源（监控组件别拖累线上）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-6

title: 追问：部分采集放 Web Worker / Shared Worker，主线程崩了 worker 还能上报
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：部分采集放 **Web Worker / Shared Worker**，主线程崩了 worker 还能上报

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- \*Long Task 采集\*\*
- 实验室能算 TBT；线上更适合上报"FCP→FID/INP 期间所有 long task 总长"近似 TBT
- \*上报策略：为什么用 requestIdleCallback\*\*
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-7

title: 追问：长任务 attribution 给的 containerName 是 iframe，怎么知道是哪个第三方
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：长任务 attribution 给的 containerName 是 iframe，怎么知道是哪个第三方？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 拿到的 entry：{ duration, startTime, name, attribution: [{ containerType, containerName, ... }] }
- attribution 可以告诉你是哪个 iframe / script，但跨源 iframe 拿不到具体 src
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tbt-and-long-task-collection-followup-8

title: 追问：cross-origin iframe 给不出具体 URL；自家 iframe 可以加 name 属性带身份
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 题目

如果面试官追问：cross-origin iframe 给不出具体 URL；自家 iframe 可以加 `name` 属性带身份

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 拿到的 entry：{ duration, startTime, name, attribution: [{ containerType, containerName, ... }] }
- attribution 可以告诉你是哪个 iframe / script，但跨源 iframe 拿不到具体 src
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-stack-trace-followup-1

title: 追问：你了解底层 VLQ 是怎么编码的吗
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 题目

如果面试官追问：你了解底层 VLQ 是怎么编码的吗？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-stack-trace-followup-2

title: 追问：6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 题目

如果面试官追问：6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「Source Map：栈解析定位到源码行列」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-stack-trace-followup-3

title: 追问：multi-level source map怎么处理
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 题目

如果面试官追问：multi-level source map（babel + webpack 双重转换）怎么处理？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- \*Source Map 文件结构\*\*
- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-stack-trace-followup-4

title: 追问：用 inline source map 串联，最终 map 已合并；解析直接拿到原始 .ts/.tsx
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 题目

如果面试官追问：用 `inline source map` 串联，最终 map 已合并；解析直接拿到原始 .ts/.tsx

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- \*Source Map 文件结构\*\*
- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-stack-trace-followup-5

title: 追问：怎么把解析结果反馈到 Cursor / VSCode 跳转
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 题目

如果面试官追问：怎么把解析结果反馈到 Cursor / VSCode 跳转？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「Source Map：栈解析定位到源码行列」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-stack-trace-followup-6

title: 追问：监控控制台带 vscode://file/${absPath}:${line}:${col} 或 GitHub Permalink
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 题目

如果面试官追问：监控控制台带 `vscode://file/${absPath}:${line}:${col}` 或 GitHub Permalink

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 拿到压缩栈 (file, line, col) → 加载 file 对应 .map
- 解码 mappings → 二分查找最接近 (line, col) 的映射 → 还原 (源 file, 源 line, 源 col, 函数名)
- .map 不要上线：会泄漏源码；改成构建后产物上传到错误监控系统（Sentry / 自建）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-deep-followup-1

title: 追问：截图不能用怎么办
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 题目

如果面试官追问：截图不能用怎么办（CORS image / iframe）？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 主进程把首屏区域 html2canvas / domtoimage 截屏 → 采样若干像素 → 全部接近背景色（如纯白）→ 判定白屏
- 收集：URL、版本、UA、最近 N 条 resource entry、error stack、网络 effectiveType、视口截图
- 截图 / canvas 采样在主线程跑：本身造成卡顿
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-deep-followup-2

title: 追问：退化到 DOM + 视口元素采样
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 题目

如果面试官追问：退化到 DOM + 视口元素采样

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在
- 视口采样：document.elementFromPoint(x, y) 取 9 宫格中心 + 四角，全部命中 root 容器或空 → 疑似白屏
- 主进程把首屏区域 html2canvas / domtoimage 截屏 → 采样若干像素 → 全部接近背景色（如纯白）→ 判定白屏
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-deep-followup-3

title: 追问：白屏率怎么定 SLO
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 题目

如果面试官追问：白屏率怎么定 SLO？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 视口采样：document.elementFromPoint(x, y) 取 9 宫格中心 + 四角，全部命中 root 容器或空 → 疑似白屏
- 主进程把首屏区域 html2canvas / domtoimage 截屏 → 采样若干像素 → 全部接近背景色（如纯白）→ 判定白屏
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-deep-followup-4

title: 追问：通常 < 0.05% 算健康；按版本 / 端 / 运营商分桶看异动
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 题目

如果面试官追问：通常 < 0.05% 算健康；按版本 / 端 / 运营商分桶看异动

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「白屏检测：从根节点扫描到采样像素」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-deep-followup-5

title: 追问：用户首次访问就白屏，没法复现怎么办
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 题目

如果面试官追问：用户首次访问就白屏，没法复现怎么办？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「白屏检测：从根节点扫描到采样像素」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## white-screen-detection-deep-followup-6

title: 追问：自动化拉对应 sourcemap + 重放 trace + 静态资源版本回放
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 题目

如果面试官追问：自动化拉对应 sourcemap + 重放 trace + 静态资源版本回放

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 资源信号：JS 主 bundle / 关键 CSS 加载失败（监听 load / error 或扫 performance.getEntriesByType('resource')）
- 收集：URL、版本、UA、最近 N 条 resource entry、error stack、网络 effectiveType、视口截图
- 上报：sendBeacon；同时记录 traceId 让后端复盘
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rrweb-on-demand-recording-followup-1

title: 追问：怎么决定时机最稳
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 题目

如果面试官追问：怎么决定时机最稳（既不晚也不太早）？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 服务端下发：用户进入 /help/feedback?caseId=xxx 路由，后端依据 caseId 决定是否下发录屏脚本
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rrweb-on-demand-recording-followup-2

title: 追问：异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 题目

如果面试官追问：异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- 异常驱动：JS error / 关键接口失败 → 立刻动态 import rrweb，录后续 30 秒 + 缓冲区前 30 秒（用 record checkoutEveryNms + 双 buffer）
- 业务路径风险：付款 / 注销前 N 步开启录制（预录"事故现场"）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rrweb-on-demand-recording-followup-3

title: 追问：录屏的存储成本怎么控
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 题目

如果面试官追问：录屏的存储成本怎么控？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 录屏数据上传也大，全量录制带宽 / 存储爆炸
- 抽样：1% 流量录屏，A/B 验证或问题排查
- 服务端下发：用户进入 /help/feedback?caseId=xxx 路由，后端依据 caseId 决定是否下发录屏脚本
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rrweb-on-demand-recording-followup-4

title: 追问：仅高优 case 长期保留，普通 case 7 天 TTL；事件级压缩
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 题目

如果面试官追问：仅高优 case 长期保留，普通 case 7 天 TTL；事件级压缩

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 服务端下发：用户进入 /help/feedback?caseId=xxx 路由，后端依据 caseId 决定是否下发录屏脚本
- 加载完成前事件先用本地 ring buffer 暂存（如最近 30s 的 click / input event）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rrweb-on-demand-recording-followup-5

title: 追问：用户拒绝录屏怎么办
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 题目

如果面试官追问：用户拒绝录屏怎么办？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 录屏数据上传也大，全量录制带宽 / 存储爆炸
- 用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- 抽样：1% 流量录屏，A/B 验证或问题排查
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## rrweb-on-demand-recording-followup-6

title: 追问：必须有 opt-out；GDPR / PIPL 要求知情同意
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 题目

如果面试官追问：必须有 opt-out；GDPR / PIPL 要求知情同意

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 隐私：input / password 字段必须 mask（rrweb 自带 maskAllInputs）；用户授权流程
- 工程：rrweb 版本和 player 版本必须配套，灰度切换要兼容历史 session
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。
