---
id: 16-observability
title: 可观测性
order: 16
icon: 📈
description: 错误监控、RUM、埋点、会话回放、日志与告警体系。
---

## error-capture
title: 前端错误捕获链路应该怎么搭
difficulty: 基础
tags: [错误监控, ErrorBoundary]

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
window.addEventListener('error', e => {
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
}, true);   // ⚠️ 必须 capture: true 才能收到资源错误

// 2. Promise 未捕获
window.addEventListener('unhandledrejection', e => {
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
  navigator.sendBeacon('/api/error', JSON.stringify({
    ...data,
    ts: Date.now(),
    url: location.href,
    ua: navigator.userAgent,
    version: import.meta.env.VITE_APP_VERSION,
  }));
}
```

### 延伸
- 错误采集不是越多越好，去重和上下文质量同样重要
- 某些跨域脚本若没有正确的 CORS / `crossorigin` 配置，浏览器暴露给前端的错误信息会非常有限

## source-map-symbolicate
title: Source Map 上传与错误还原
difficulty: 进阶
tags: [SourceMap, Sentry]

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

### 延伸
- sourcemap 上传失败，往往不是"小问题"，会直接让故障排查效率腰斩

## rum-web-vitals
title: RUM 与 Web Vitals 才能告诉你真实用户体验
difficulty: 进阶
tags: [RUM, WebVitals]

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

### 延伸
- 指标如果不能按版本、页面和人群切开看，价值会大打折扣
- `PerformanceObserver` 能提供大量基础信号，但要注意不同条目类型支持差异、缓冲区上限和条目丢失

## event-model
title: 埋点模型设计：事件、属性、上下文、会话
difficulty: 进阶
tags: [埋点, 数据模型]

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
  event: string;                  // 事件名：'page_view' / 'order_pay'
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
  'page_view': { from?: string; to: string };
  'click_signup': { source: 'header' | 'banner' };
  'order_pay': { orderId: string; amount: number; method: string };
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

### 延伸
- 数据建模能力，是前端做增长和分析系统时的核心竞争力之一
- 事件字典、埋点版本和淘汰机制若不治理，后期分析口径会迅速失真

## reporting-channel
title: Beacon、fetch keepalive 与监控上报通道怎么选
difficulty: 进阶
tags: [Beacon, keepalive, 上报]

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
    keepalive: true,           // 页面关闭也能发完
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
    else fetch('/api/track', { method: 'POST', body: data, keepalive: true })
      .catch(() => this.queue.unshift(...batch));   // 失败回填重试
  }
}
```

### 延伸
- "页面关闭前再发一次"不是万能兜底，设计上仍应尽量把关键事件及时上报
- 上报链路本身也应被监控，否则你可能长期不知道监控已经失效

## session-replay-alert
title: 会话回放、采样与告警阈值
difficulty: 进阶
tags: [SessionReplay, 告警]

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
  reportSession(events.filter(e => e.timestamp > Date.now() - 30_000));
});

function startRecording() {
  stop = rrweb.record({
    emit(event) { events.push(event); },
    maskAllInputs: true,                       // 输入框脱敏
    maskTextSelector: '[data-pii]',            // 显式标记的元素脱敏
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
    summary: "{{ $labels.page }} 错误率 > 2%"
```

### 延伸
- 告警系统最怕"大家都知道它在响，但没人信它"
- 告警要明确 owner、升级路径和静默规则，否则再好的采集也很难形成真正闭环

## privacy-compliance
title: 可观测性与隐私合规的平衡
difficulty: 进阶
tags: [隐私合规, GDPR]

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

### 延伸
- 监控不是法外之地，越成熟的团队越重视数据采集边界

## opentelemetry-frontend
title: OpenTelemetry 在前端的接入
difficulty: 资深
tags: [OpenTelemetry, Trace]

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

### 延伸
- 配合 RUM 还可以聚合 user journey，定位"特定路径下错误率高"的原因
- 前端 trace 量大、价值密度低，建议用尾采样（tail sampling）+ 错误优先

## frontend-feature-flag
title: 前端 A/B 测试与特性开关的工程实现
difficulty: 进阶
tags: [Feature Flag, A/B]

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

interface Ctx { userId: string; country: string; deviceType: 'mobile' | 'desktop' }

function hashBucket(input: string, salt: string): number {
  let h = 0;
  for (const c of input + salt) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 100;
}

export function evaluate(ctx: Ctx, definitions: Record<string, { rollout: number; variants: Variant[] }>): Flags {
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

### 延伸
- 不要把所有 flag 都丢同一个对象，否则任何一个 flag 变更全站都要重渲染
- 实验设计需要数据团队配合，前端只负责"正确分桶 + 正确埋点"
