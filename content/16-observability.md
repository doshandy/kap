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

这题的高分关键是把 错误监控 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端有哪些常见错误来源？`window.onerror`、`unhandledrejection`、框架级错误边界各能兜到什么？

### 答案要点

- 运行时脚本错误可由 window.onerror 捕获
- 未处理 Promise 异常由 unhandledrejection 捕获
- Vue/React 组件渲染链路的异常需要框架级 error handler / Error Boundary
- 资源加载失败、跨域脚本、Worker 错误、SSR 异常都需要额外关注

#### 工程化补充

- 场景前提：落地 前端错误捕获链路应该怎么搭 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

回答「Source Map 上传与错误还原」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么线上错误堆栈经常看不懂？Source Map 平台化接入时要注意什么？

### 答案要点

- 生产环境代码被压缩和拆包后，堆栈只剩短变量名和偏移量
- 需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原
- 要保证发布版本、commit、产物 hash、环境信息能对齐

#### 工程化补充

- 场景前提：先定义 Source Map 上传与错误还原 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 SourceMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SourceMap 的可复现用例、线上监控指标和回退演练记录。

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

回答「RUM 与 Web Vitals 才能告诉你真实用户体验」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么只看 Lighthouse 报告不够？RUM 应该收哪些最有价值的指标？

### 答案要点

- Lighthouse 是实验室环境，不能覆盖真实网络、设备、地区和用户行为差异
- RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等
- 还应关联版本号、路由、设备、浏览器、地域、登录态等上下文

#### 工程化补充

- 场景前提：先定义 RUM 与 Web Vitals 才能告诉你真实用户体验 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 RUM 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 RUM 的可复现用例、线上监控指标和回退演练记录。

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

讲「埋点模型设计：事件、属性、上下文、会话」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么埋点经常“越埋越乱”？一个可持续的数据模型至少要包含什么？

### 答案要点

- 要有稳定事件命名、属性字典、用户上下文和版本上下文
- 事件语义必须可解释，避免一堆 click_button_1 这类不可维护命名
- 埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”

#### 工程化补充

- 场景前提：埋点模型设计：事件、属性、上下文、会话 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题的高分关键是把 Beacon 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端监控为什么经常偏爱 `navigator.sendBeacon()`？什么时候又该改用 `fetch(..., { keepalive: true })`？

### 答案要点

- sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达
- sendBeacon() 只适合小体积、POST、不关心响应内容的上报
- 如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活
- 无论哪种方式，都要考虑限流、采样、失败重试和离线场景补偿，避免监控反过来影响页面性能

#### 工程化补充

- 场景前提：落地 Beacon、fetch keepalive 与监控上报通道怎么选 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

讲「会话回放、采样与告警阈值」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

会话回放和告警为什么都不能“全量开最大”？

### 答案要点

- 会话回放有性能、隐私和存储成本，必须做采样和敏感信息脱敏
- 告警阈值太低会噪音泛滥，太高又会错过故障
- 常见做法是错误率、性能分位数、白屏率、接口失败率多维组合告警

#### 工程化补充

- 场景前提：会话回放、采样与告警阈值 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

讲「可观测性与隐私合规的平衡」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么说监控系统本身也可能成为隐私风险源？

### 答案要点

- 用户输入、URL query、错误堆栈、接口响应里都可能包含敏感信息
- 采集前要做脱敏、白名单、最小必要原则
- 不同地区对 Cookie、追踪、会话回放有不同合规要求

#### 工程化补充

- 场景前提：可观测性与隐私合规的平衡 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题回答要覆盖 Trace 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

后端常用 OpenTelemetry 做分布式追踪，前端怎么接入并把链路打通？

### 答案要点

- SDK：@opentelemetry/sdk-trace-web + @opentelemetry/instrumentation-fetch / xml-http-request / document-load
- 出口：OTLP HTTP / gRPC，收集端如 Jaeger / Tempo / Datadog
- TraceContext：fetch 自动注入 traceparent header，后端继续传播形成端到端 span
- 用户行为 span：路由切换、关键交互埋成 span，便于回溯

#### 工程化补充

- 场景前提：先定义 OpenTelemetry 在前端的接入 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 Trace 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Trace 的可复现用例、线上监控指标和回退演练记录。

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

讲「前端 A/B 测试与特性开关的工程实现」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

特性开关 / A/B 实验在前端怎么做，才能既灵活又不影响性能 / 体验？

### 答案要点

- 决策放在边缘 / SSR：避免客户端"先看到旧版再切到新版"造成 flash
- SDK：第三方（LaunchDarkly / Unleash / Statsig）或自建 KV + 推送
- 缓存：每个 flag 在客户端有 TTL，不要每次渲染都问服务端
- 实验分桶：按 user / device 哈希分桶，保证同一用户看同一版本

#### 工程化补充

- 场景前提：前端 A/B 测试与特性开关的工程实现 只有在瓶颈被数据证实时才值得推进；先确认 Feature Flag 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 前端 A/B 测试与特性开关的工程实现 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题回答要覆盖 监控 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

做一个完整的前端错误监控系统需要捕获哪些类型的错误？关键链路有哪些？

### 答案要点

- 同步 JS 异常：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）
- 未处理的 Promise rejection：window.addEventListener('unhandledrejection', e => e.reason)
- 资源加载失败（img/script/link）：error 事件冒泡不上来，必须捕获阶段监听
- 框架渲染错误：React 的 ErrorBoundary、Vue 的 app.config.errorHandler、Next.js error.tsx

#### 工程化补充

- 场景前提：前端如何全链路捕获错误并上报 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题的高分关键是把 可观测性 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

线上偶发"用户打开页面什么都没有"，怎么自动检测和定位白屏？

### 答案要点

- JS 致命错误（首屏 chunk 报错）
- 网络资源加载失败（CDN 挂 / 网络拦截）
- 渲染依赖的 API 失败（强依赖的 SSR 数据 / 用户 token）
- CSP 拦截 / 浏览器扩展干扰

#### 工程化补充

- 场景前提：落地 前端白屏怎么检测 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题的高分关键是把 可观测性 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

PM 想测试两个落地页的转化率差异。前端怎么落地 A/B 实验？

### 答案要点

- 服务端分流：基于 user_id hash 取模，stick 用户在一个桶
- 边缘分流（CDN / Edge Worker）：响应不同版本 HTML，无 SSR 闪烁
- 客户端分流：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）
- useExperiment(expId): { variant, isControl }

#### 工程化补充

- 场景前提：前端怎么承接 A/B 实验 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 可观测性。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

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

这题回答要覆盖 错误 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

前端要做错误上报，有哪些原生的事件 / 钩子可以监听？分别能拿到什么信息？

### 答案要点

- window.onerror = (msg, url, line, col, err) —— 同步运行时错误，跨域脚本只能拿到 Script error.，要给 script 加 crossorigin
- window.addEventListener('error', e, true) —— 第三个参数 true 才能在捕获阶段拿到资源（img/script/link）加载失败
- window.addEventListener('unhandledrejection', e) —— 没 catch 的 Promise
- Vue：app.config.errorHandler；React：ErrorBoundary（仅渲染错误，事件错误它收不到）

#### 工程化补充

- 场景前提：先定义 JS 错误监听都有哪几个钩子？各管什么 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 错误 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 错误 的可复现用例、线上监控指标和回退演练记录。

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

这题回答要覆盖 LCP 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

你们 LCP 优化到 90 分（实验室 Lighthouse），线上的真实 LCP 是怎么收集的？怎么验证优化效果？

### 答案要点

- PerformanceObserver({ type: 'largest-contentful-paint', buffered: true })，buffered: true 拿首条之前已发生的
- LCP 是单调更新：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格
- 上报时机：visibilitychange → hidden / pagehide / beforeunload（其中 visibilitychange 最稳）
- 用 navigator.sendBeacon / fetch keepalive 保证页面卸载时不丢

#### 工程化补充

- 场景前提：回答 线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 TBT 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你提到 LCP 之外还会关注 TBT、Long Task。这两个怎么采集？为什么用 requestIdleCallback 上报？紧急情况和主线程被占满怎么办？

### 答案要点

- Long Task 采集
- W3C 标准：任务执行 ≥ 50ms 就算 long task
- API：new PerformanceObserver(...).observe({ type: 'longtask', buffered: true })
- 拿到的 entry：{ duration, startTime, name, attribution: [{ containerType, containerName, ... }] }

#### 工程化补充

- 场景前提：TBT / Long Task 怎么采集？requestIdleCallback 上报权衡 只有在瓶颈被数据证实时才值得推进；先确认 TBT 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 TBT / Long Task 怎么采集？requestIdleCallback 上报权衡 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「Source Map：栈解析定位到源码行列」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

线上错误堆栈是 `app.abc123.js:1:50000` 这种压缩位置，怎么定位到原始源码？底层用什么逻辑？

### 答案要点

- Source Map 文件结构
- 关键字段：version / sources（源文件路径数组）/ names（标识符数组）/ mappings（VLQ 编码的位置映射串）
- mappings 用 Base64 VLQ 编码：每个生成位置 → 源文件 / 源行 / 源列 / 名称索引
- ; 分行，, 分段；段内 1-5 个数字（生成列、源文件 idx、源行、源列、name idx）

#### 工程化补充

- 场景前提：回答 Source Map：栈解析定位到源码行列 时先锁定 SourceMap 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 SourceMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SourceMap 的可复现用例、线上监控指标和回退演练记录。

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

这题回答要覆盖 白屏 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

白屏检测你是怎么做的？给一个尽量可靠的方案。

### 答案要点

- 单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏
- 单看 document.body.children.length——SSR 占位 / loading 容器会让此值 > 0 但视觉空白
- DOM 信号：检查 #app / #root 是否有 ≥ N 个子元素；关键 selector（.header/.main）是否存在
- 视口采样：document.elementFromPoint(x, y) 取 9 宫格中心 + 四角，全部命中 root 容器或空 → 疑似白屏

#### 工程化补充

- 场景前提：白屏检测：从根节点扫描到采样像素 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题的高分关键是把 rrweb 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

百万级用户里某用户反馈视频播放有问题，你想看他具体操作了什么。rrweb 依赖很大，怎么让这个用户能加载并录制？下发时机怎么定？

### 答案要点

- rrweb 库 + 序列化数据量大，全量下发拖累首屏
- 录屏数据上传也大，全量录制带宽 / 存储爆炸
- 用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb
- 抽样：1% 流量录屏，A/B 验证或问题排查

#### 工程化补充

- 场景前提：回答 大依赖按需下发：rrweb 百万级用户场景 时先锁定 rrweb 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 rrweb 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 rrweb 的可复现用例、线上监控指标和回退演练记录。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在「前端错误捕获链路应该怎么搭」落地过程中，你会如何围绕 错误监控 设计发布开关和故障回退策略？

### 答案要点

#### 直答

- 结论：验证 设计发布开关 与 故障回退策略 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 设计发布开关 与 故障回退策略 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 错误监控：围绕「前端错误捕获链路应该怎么搭」里的 错误监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- ErrorBoundary：ErrorBoundary 是「前端错误捕获链路应该怎么搭」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 设计发布开关 与 故障回退策略 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：设计发布开关 与 故障回退策略 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## source-map-symbolicate-followup-1

title: 追问：围绕「Source Map 上传与错误还原」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「Source Map 上传与错误还原」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先梳理 Source Map 上传与错误还原 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原。

#### 术语解释

- Source Map：围绕「Source Map 上传与错误还原」里的 Source Map 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- SourceMap：SourceMap 是「Source Map 上传与错误还原」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Sentry：Sentry 是「Source Map 上传与错误还原」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Source Map 上传与错误还原」里，Source Map 上传与错误还原 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原。

## rum-web-vitals-followup-1

title: 追问：面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「RUM 与 Web Vitals 才能告诉你真实用户体验」最可能被哪些 RUM 边界条件击穿？

### 答案要点

#### 直答

- 结论：「RUM 与 Web Vitals 才能告诉你真实用户体验」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先识别 RUM 与 Web Vitals 才能告诉你真实用户体验 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- RUM：RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等。
- Web Vitals：在「RUM 与 Web Vitals 才能告诉你真实用户体验」里，Web Vitals 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- WebVitals：WebVitals 是「RUM 与 Web Vitals 才能告诉你真实用户体验」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：RUM 与 Web Vitals 才能告诉你真实用户体验 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 RUM 与 Web Vitals 才能告诉你真实用户体验 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## event-model-followup-1

title: 追问：以「埋点模型设计：事件、属性、上下文、会话」为例，真要把「埋点模型设计：事件、属性、上下文、会话」推到线上，你会如何围绕 埋点 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「埋点模型设计：事件、属性、上下文、会话」为例，真要把「埋点模型设计：事件、属性、上下文、会话」推到线上，你会如何围绕 埋点 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「埋点模型设计：事件、属性、上下文、会话」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：埋点模型设计 事件 属性 上下文 会话 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- 埋点：埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”。
- 数据模型：围绕「埋点模型设计：事件、属性、上下文、会话」里的 数据模型 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：围绕 埋点模型设计 事件 属性 上下文 会话 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 埋点模型设计 事件 属性 上下文 会话 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## reporting-channel-followup-1

title: 追问：真要把「Beacon、fetch keepalive 与监控上报通道怎么选」推到线上，你会如何围绕 Beacon 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「Beacon、fetch keepalive 与监控上报通道怎么选」推到线上，你会如何围绕 Beacon 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「Beacon、fetch keepalive 与监控上报通道怎么选」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：无论哪种方式，都要考虑限流、采样、失败重试和离线场景补偿，避免监控反过来影响页面性能。

#### 术语解释

- Beacon：sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达。
- fetch keepalive：围绕「Beacon、fetch keepalive 与监控上报通道怎么选」里的 fetch keepalive 推进上线时，要明确每个批次的放量门槛和回退条件。
- keepalive：如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活。

#### 风险与验收

- 主要风险：若 Beacon 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：围绕 Beacon 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## session-replay-alert-followup-1

title: 追问：围绕「会话回放、采样与告警阈值」做方案评审时，哪些 SessionReplay 边界输入最容易导致结论失真
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「会话回放、采样与告警阈值」做方案评审时，哪些 SessionReplay 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先拆分 会话回放 采样与告警阈值 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 会话回放 采样与告警阈值 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- SessionReplay：SessionReplay 是「会话回放、采样与告警阈值」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 告警：告警阈值太低会噪音泛滥，太高又会错过故障。

#### 风险与验收

- 主要风险：在「会话回放、采样与告警阈值」场景下，会话回放 采样与告警阈值 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「会话回放、采样与告警阈值」里，验收 会话回放 采样与告警阈值 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## privacy-compliance-followup-1

title: 追问：在「可观测性与隐私合规的平衡」场景下，真要把「可观测性与隐私合规的平衡」推到线上，你会如何围绕 隐私合规 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「可观测性与隐私合规的平衡」场景下，真要把「可观测性与隐私合规的平衡」推到线上，你会如何围绕 隐私合规 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「可观测性与隐私合规的平衡」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：可观测性 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- 隐私合规：在「可观测性与隐私合规的平衡」里，隐私合规 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- GDPR：GDPR 是「可观测性与隐私合规的平衡」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 可观测性 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 可观测性 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## opentelemetry-frontend-followup-1

title: 追问：在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「OpenTelemetry 在前端的接入」场景下，把「OpenTelemetry 在前端的接入」放到真实业务里，围绕 Trace 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：先列出 OpenTelemetry 在前端的接入 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：围绕 OpenTelemetry 在前端的接入 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- OpenTelemetry：OpenTelemetry 是「OpenTelemetry 在前端的接入」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Trace：fetch 自动注入 traceparent header，后端继续传播形成端到端 span。

#### 风险与验收

- 主要风险：若 OpenTelemetry 在前端的接入 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 OpenTelemetry 在前端的接入 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## frontend-feature-flag-followup-1

title: 追问：如果要提升「前端 A/B 测试与特性开关的工程实现」的回归信心，你会先补哪几类边界与回归用例
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要提升「前端 A/B 测试与特性开关的工程实现」的回归信心，你会先补哪几类边界与回归用例？

### 答案要点

#### 直答

- 结论：先把 前端 A/B 测试与特性开关的工程实现 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 前端 A/B 测试与特性开关的工程实现 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- A/B：A/B 是「前端 A/B 测试与特性开关的工程实现」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Feature Flag：围绕「前端 A/B 测试与特性开关的工程实现」里的 Feature Flag 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：前端 A/B 测试与特性开关的工程实现 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「前端 A/B 测试与特性开关的工程实现」里 前端 A/B 测试与特性开关的工程实现 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## frontend-error-monitor-followup-1

title: 追问：真要把「前端如何全链路捕获错误并上报」推到线上，你会如何围绕 监控 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「前端如何全链路捕获错误并上报」推到线上，你会如何围绕 监控 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「前端如何全链路捕获错误并上报」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：围绕 回滚条件 与 迁移路径 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 监控：围绕「前端如何全链路捕获错误并上报」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 错误：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）。

#### 风险与验收

- 主要风险：若 回滚条件 与 迁移路径 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：回滚条件 与 迁移路径 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## white-screen-detection-followup-1

title: 追问：在当前团队与业务约束下，真要把「前端白屏怎么检测」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「前端白屏怎么检测」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「前端白屏怎么检测」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：先统一 回滚条件 与 迁移路径 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 前端白屏怎么检测：围绕「前端白屏怎么检测」里的 前端白屏怎么检测 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 可观测性：围绕「前端白屏怎么检测」里的 可观测性 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 监控：在「前端白屏怎么检测」里，监控 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「前端白屏怎么检测」里，回滚条件 与 迁移路径 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：回滚条件 与 迁移路径 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## ab-experiment-frontend-followup-1

title: 追问：从工程落地角度看，真要把「前端怎么承接 A/B 实验」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，真要把「前端怎么承接 A/B 实验」推到线上，你会如何围绕 可观测性 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「前端怎么承接 A/B 实验」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：先统一 B 实验 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- A/B：A/B 是「前端怎么承接 A/B 实验」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 可观测性：围绕「前端怎么承接 A/B 实验」里的 可观测性 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 实验：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）。

#### 风险与验收

- 主要风险：在「前端怎么承接 A/B 实验」里，B 实验 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：B 实验 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## js-error-types-basic-followup-1

title: 追问：围绕「JS 错误监听都有哪几个钩子？各管什么」做方案评审时，哪些 错误 边界输入最容易导致结论失真
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「JS 错误监听都有哪几个钩子？各管什么」做方案评审时，哪些 错误 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先处理 JS 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：把「JS 错误监听都有哪几个钩子？各管什么」里的 JS 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- JS：JS 是「JS 错误监听都有哪几个钩子？各管什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 错误：app.config.errorHandler；React：ErrorBoundary（仅渲染错误，事件错误它收不到）。
- 监听：在「JS 错误监听都有哪几个钩子？各管什么」这题里，监听 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 JS 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「JS 错误监听都有哪几个钩子？各管什么」里 JS 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## lcp-rum-collection-followup-1

title: 追问：你会先看哪些与 LCP 相关的指标来判断「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是不是当前性能瓶颈
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会先看哪些与 LCP 相关的指标来判断「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 灰度 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先定义 灰度 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- LCP：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格。
- AB：AB 是「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- RUM：RUM 是「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：灰度 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里，灰度 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## lcp-rum-collection-followup-2

title: 追问：要证明「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」确实改善体验，你会如何围绕 LCP 设计线上观测与对照验证
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：要证明「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」确实改善体验，你会如何围绕 LCP 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 灰度 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先定义 灰度 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- LCP：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格。
- AB：AB 是「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- RUM：RUM 是「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：灰度 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里，灰度 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## lcp-rum-collection-followup-3

title: 追问：以「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是否值得做
difficulty: 资深
tags: [LCP, RUM, 高频, 追问]
parent: lcp-rum-collection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」是否值得做？

### 答案要点

#### 直答

- 结论：评估 灰度 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先拆分 灰度 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- LCP：每个候选元素更大就刷新；最终值在用户首次交互或页面 hidden 后定格。
- AB：AB 是「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- RUM：RUM 是「线上 LCP 怎么收集？AB / 灰度 / 大盘 / 业务关联怎么做」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 灰度 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 灰度 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## tbt-and-long-task-collection-followup-1

title: 追问：从工程落地角度看，当「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」跨团队落地时，你会先确认哪些 TBT 前置假设，避免后续返工
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」跨团队落地时，你会先确认哪些 TBT 前置假设，避免后续返工？

### 答案要点

#### 直答

- 结论：先量化 TBT 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先明确 TBT 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- TBT：TBT 是「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Long Task：Long Task 采集。
- requestIdleCallback：围绕「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里的 requestIdleCallback 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」场景下，TBT 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里，验收 TBT 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## source-map-stack-trace-followup-1

title: 追问：围绕「Source Map：栈解析定位到源码行列」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「Source Map：栈解析定位到源码行列」做方案评审时，哪些 SourceMap 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先画出 Source Map 栈解析定位到源码行列 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 Source Map 栈解析定位到源码行列 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Source Map：Source Map 文件结构。
- SourceMap：SourceMap 是「Source Map：栈解析定位到源码行列」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 错误定位：围绕「Source Map：栈解析定位到源码行列」里的 错误定位 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：Source Map 栈解析定位到源码行列 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Source Map：栈解析定位到源码行列」里，Source Map 栈解析定位到源码行列 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## white-screen-detection-deep-followup-1

title: 追问：在「白屏检测：从根节点扫描到采样像素」场景下，真要把「白屏检测：从根节点扫描到采样像素」推到线上，你会如何围绕 白屏 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「白屏检测：从根节点扫描到采样像素」场景下，真要把「白屏检测：从根节点扫描到采样像素」推到线上，你会如何围绕 白屏 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「白屏检测：从根节点扫描到采样像素」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：白屏检测 从根节点扫描到采样像素 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- 白屏：单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏。
- 监控：在「白屏检测：从根节点扫描到采样像素」里，监控 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：白屏检测 从根节点扫描到采样像素 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：发布验收至少看 白屏检测 从根节点扫描到采样像素 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## white-screen-detection-deep-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 白屏 把「白屏检测：从根节点扫描到采样像素」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 白屏 把「白屏检测：从根节点扫描到采样像素」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 结论：把 白屏检测 从根节点扫描到采样像素 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先统一 白屏检测 从根节点扫描到采样像素 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 白屏：单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏。
- 监控：在「白屏检测：从根节点扫描到采样像素」里，监控 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「白屏检测：从根节点扫描到采样像素」里，白屏检测 从根节点扫描到采样像素 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：白屏检测 从根节点扫描到采样像素 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## white-screen-detection-deep-followup-3

title: 追问：围绕「白屏检测：从根节点扫描到采样像素」做去留决策，你会拿哪些指标说服团队
difficulty: 资深
tags: [白屏, 监控, 追问]
parent: white-screen-detection-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「白屏检测：从根节点扫描到采样像素」做去留决策，你会拿哪些指标说服团队？

### 答案要点

#### 直答

- 结论：先定义 白屏检测 从根节点扫描到采样像素 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 白屏检测 从根节点扫描到采样像素 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 白屏：单看"页面 0 报错就是没白屏"——不对，CSS 加载失败、root 没挂载也会白屏。
- 监控：围绕「白屏检测：从根节点扫描到采样像素」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 白屏检测 从根节点扫描到采样像素 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：白屏检测 从根节点扫描到采样像素 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## rrweb-on-demand-recording-followup-1

title: 追问：如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「大依赖按需下发：rrweb 百万级用户场景」的落地风险，你会优先检查哪些 rrweb 约束是否成立？

### 答案要点

#### 直答

- 结论：围绕「大依赖按需下发：rrweb 百万级用户场景」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb。

#### 术语解释

- rrweb：rrweb 库 + 序列化数据量大，全量下发拖累首屏。
- 录屏：录屏数据上传也大，全量录制带宽 / 存储爆炸。
- 大依赖：围绕「大依赖按需下发：rrweb 百万级用户场景」里的 大依赖 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：大依赖按需下发 rrweb 百万级用户场景 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 大依赖按需下发 rrweb 百万级用户场景 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## error-capture-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 错误监控 安排「前端错误捕获链路应该怎么搭」的渐进改造路线
difficulty: 基础
tags: [错误监控, ErrorBoundary, 追问]
parent: error-capture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 错误监控 安排「前端错误捕获链路应该怎么搭」的渐进改造路线？

### 答案要点

#### 直答

- 结论：验证 错误监控 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「前端错误捕获链路应该怎么搭」里的 错误监控 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 错误监控：错误监控 是「前端错误捕获链路应该怎么搭」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- ErrorBoundary：ErrorBoundary 是「前端错误捕获链路应该怎么搭」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「前端错误捕获链路应该怎么搭」里，错误监控 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「前端错误捕获链路应该怎么搭」里，错误监控 至少要给一组指标阈值、一条日志证据和一组测试结果。

## error-capture-followup-3

title: 追问：在当前团队与业务约束下，要判断「前端错误捕获链路应该怎么搭」值不值得长期维护，你会先盯哪些和 错误监控 相关的核心指标
difficulty: 基础
tags: [错误监控, ErrorBoundary, 追问]
parent: error-capture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「前端错误捕获链路应该怎么搭」值不值得长期维护，你会先盯哪些和 错误监控 相关的核心指标？

### 答案要点

#### 直答

- 结论：把 错误监控 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「前端错误捕获链路应该怎么搭」里的 错误监控 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 错误监控：在「前端错误捕获链路应该怎么搭」这道追问里，错误监控 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- ErrorBoundary：ErrorBoundary 是「前端错误捕获链路应该怎么搭」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「前端错误捕获链路应该怎么搭」里，错误监控 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「前端错误捕获链路应该怎么搭」里，错误监控 至少要给一组指标阈值、一条日志证据和一组测试结果。

## event-model-followup-2

title: 追问：以「埋点模型设计：事件、属性、上下文、会话」为例，当团队成熟度不一致时，你会如何围绕 埋点 定义「埋点模型设计：事件、属性、上下文、会话」的先后改造顺序
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「埋点模型设计：事件、属性、上下文、会话」为例，当团队成熟度不一致时，你会如何围绕 埋点 定义「埋点模型设计：事件、属性、上下文、会话」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 埋点模型设计 事件 属性 上下文 会话 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 埋点模型设计 事件 属性 上下文 会话 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 埋点：埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”。
- 数据模型：在「埋点模型设计：事件、属性、上下文、会话」这题里，数据模型 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「埋点模型设计：事件、属性、上下文、会话」里，埋点模型设计 事件 属性 上下文 会话 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：埋点模型设计 事件 属性 上下文 会话 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## event-model-followup-3

title: 追问：当团队讨论「埋点模型设计：事件、属性、上下文、会话」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 进阶
tags: [埋点, 数据模型, 追问]
parent: event-model
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队讨论「埋点模型设计：事件、属性、上下文、会话」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 直答

- 结论：把 埋点模型设计 事件 属性 上下文 会话 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「埋点模型设计：事件、属性、上下文、会话」里的 埋点模型设计 事件 属性 上下文 会话 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 埋点：埋点要围绕业务问题和分析目标设计，而不是“能埋的都埋”。
- 数据模型：围绕「埋点模型设计：事件、属性、上下文、会话」里的 数据模型 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「埋点模型设计：事件、属性、上下文、会话」里，埋点模型设计 事件 属性 上下文 会话 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「埋点模型设计：事件、属性、上下文、会话」里，埋点模型设计 事件 属性 上下文 会话 至少要给一组指标阈值、一条日志证据和一组测试结果。

## reporting-channel-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 Beacon 定义「Beacon、fetch keepalive 与监控上报通道怎么选」的先后改造顺序
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 Beacon 定义「Beacon、fetch keepalive 与监控上报通道怎么选」的先后改造顺序？

### 答案要点

#### 直答

- 结论：先把 Beacon 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：无论哪种方式，都要考虑限流、采样、失败重试和离线场景补偿，避免监控反过来影响页面性能。

#### 术语解释

- Beacon：sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达。
- fetch keepalive：在「Beacon、fetch keepalive 与监控上报通道怎么选」这题里，fetch keepalive 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- keepalive：如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活。

#### 风险与验收

- 主要风险：在「Beacon、fetch keepalive 与监控上报通道怎么选」里，Beacon 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Beacon 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## reporting-channel-followup-3

title: 追问：结合真实业务约束，当团队讨论「Beacon、fetch keepalive 与监控上报通道怎么选」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 进阶
tags: [Beacon, keepalive, 上报, 追问]
parent: reporting-channel
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当团队讨论「Beacon、fetch keepalive 与监控上报通道怎么选」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 直答

- 结论：把 Beacon 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：无论哪种方式，都要考虑限流、采样、失败重试和离线场景补偿，避免监控反过来影响页面性能。

#### 术语解释

- Beacon：sendBeacon() 适合页面隐藏、跳转、卸载前发送少量分析数据，浏览器会尽量异步送达。
- fetch keepalive：围绕「Beacon、fetch keepalive 与监控上报通道怎么选」里的 fetch keepalive 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- keepalive：如果需要自定义方法、请求头、读取响应，或想与现有 fetch 基础设施复用，fetch 搭配 keepalive: true 更灵活。

#### 风险与验收

- 主要风险：在「Beacon、fetch keepalive 与监控上报通道怎么选」里，Beacon 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Beacon、fetch keepalive 与监控上报通道怎么选」里，Beacon 至少要给一组指标阈值、一条日志证据和一组测试结果。

## privacy-compliance-followup-2

title: 追问：结合真实业务约束，面对团队能力差异，你会如何围绕 隐私合规 把「可观测性与隐私合规的平衡」拆成可并行推进的小阶段
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，面对团队能力差异，你会如何围绕 隐私合规 把「可观测性与隐私合规的平衡」拆成可并行推进的小阶段？

### 答案要点

#### 直答

- 结论：先拆分 可观测性 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 可观测性 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 隐私合规：围绕「可观测性与隐私合规的平衡」里的 隐私合规 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- GDPR：GDPR 是「可观测性与隐私合规的平衡」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：可观测性 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「可观测性与隐私合规的平衡」里，验收 可观测性 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## privacy-compliance-followup-3

title: 追问：你会如何用可观测数据衡量「可观测性与隐私合规的平衡」在 隐私合规 上的维护成本和收益平衡
difficulty: 进阶
tags: [隐私合规, GDPR, 追问]
parent: privacy-compliance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何用可观测数据衡量「可观测性与隐私合规的平衡」在 隐私合规 上的维护成本和收益平衡？

### 答案要点

#### 直答

- 结论：把 可观测性 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 可观测性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 隐私合规：在「可观测性与隐私合规的平衡」里，隐私合规 是验收对象，必须给可量化指标、日志信号和测试证据。
- GDPR：GDPR 是「可观测性与隐私合规的平衡」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「可观测性与隐私合规的平衡」里，可观测性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：可观测性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## frontend-feature-flag-followup-2

title: 追问：结合真实业务约束，如果 CI 在「前端 A/B 测试与特性开关的工程实现」改造期频繁误报，你会怎么拆测试层次来降噪
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果 CI 在「前端 A/B 测试与特性开关的工程实现」改造期频繁误报，你会怎么拆测试层次来降噪？

### 答案要点

#### 直答

- 结论：把 前端 A/B 测试与特性开关的工程实现 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「前端 A/B 测试与特性开关的工程实现」里的 前端 A/B 测试与特性开关的工程实现 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- A/B：A/B 是「前端 A/B 测试与特性开关的工程实现」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Feature Flag：在「前端 A/B 测试与特性开关的工程实现」里，Feature Flag 是验收对象，必须给可量化指标、日志信号和测试证据。
- CI：CI 是「前端 A/B 测试与特性开关的工程实现」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「前端 A/B 测试与特性开关的工程实现」里，前端 A/B 测试与特性开关的工程实现 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「前端 A/B 测试与特性开关的工程实现」里，前端 A/B 测试与特性开关的工程实现 至少要给一组指标阈值、一条日志证据和一组测试结果。

## frontend-feature-flag-followup-3

title: 追问：以「前端 A/B 测试与特性开关的工程实现」为例，当「前端 A/B 测试与特性开关的工程实现」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 进阶
tags: [Feature Flag, A/B, 追问]
parent: frontend-feature-flag
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端 A/B 测试与特性开关的工程实现」为例，当「前端 A/B 测试与特性开关的工程实现」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 直答

- 结论：把 前端 A/B 测试与特性开关的工程实现 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「前端 A/B 测试与特性开关的工程实现」里的 前端 A/B 测试与特性开关的工程实现 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- A/B：A/B 是「前端 A/B 测试与特性开关的工程实现」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Feature Flag：在「前端 A/B 测试与特性开关的工程实现」里，Feature Flag 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「前端 A/B 测试与特性开关的工程实现」里，前端 A/B 测试与特性开关的工程实现 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「前端 A/B 测试与特性开关的工程实现」里，前端 A/B 测试与特性开关的工程实现 至少要给一组指标阈值、一条日志证据和一组测试结果。

## frontend-error-monitor-followup-2

title: 追问：以「前端如何全链路捕获错误并上报」为例，当团队成熟度不一致时，你会如何围绕 监控 定义「前端如何全链路捕获错误并上报」的先后改造顺序
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端如何全链路捕获错误并上报」为例，当团队成熟度不一致时，你会如何围绕 监控 定义「前端如何全链路捕获错误并上报」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 上报 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 上报 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 监控：在「前端如何全链路捕获错误并上报」里，监控 是验收对象，必须给可量化指标、日志信号和测试证据。
- 错误：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）。

#### 风险与验收

- 主要风险：若 上报 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：上报 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## frontend-error-monitor-followup-3

title: 追问：如果「前端如何全链路捕获错误并上报」进入维护期，你会优先围绕 观测指标 监控哪些指标来预警风险
difficulty: 进阶
tags: [监控, 错误, 追问]
parent: frontend-error-monitor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果「前端如何全链路捕获错误并上报」进入维护期，你会优先围绕 观测指标 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：把 上报 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 上报 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 监控：围绕「前端如何全链路捕获错误并上报」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 错误：window.addEventListener('error', e => ...)（注意第 3 个参数 useCapture=true 才能捕获资源加载错误）。

#### 风险与验收

- 主要风险：上报 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「前端如何全链路捕获错误并上报」里，上报 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## white-screen-detection-followup-2

title: 追问：以「前端白屏怎么检测」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端白屏怎么检测」的先后改造顺序
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端白屏怎么检测」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端白屏怎么检测」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 可观测性 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 可观测性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 前端白屏怎么检测：在「前端白屏怎么检测」里，前端白屏怎么检测 是验收对象，必须给可量化指标、日志信号和测试证据。
- 可观测性：围绕「前端白屏怎么检测」里的 可观测性 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 监控：围绕「前端白屏怎么检测」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「前端白屏怎么检测」里，可观测性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：可观测性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## white-screen-detection-followup-3

title: 追问：以「前端白屏怎么检测」为例，当团队讨论「前端白屏怎么检测」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 资深
tags: [可观测性, 监控, 高频, 追问]
parent: white-screen-detection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端白屏怎么检测」为例，当团队讨论「前端白屏怎么检测」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 直答

- 结论：先定义 可观测性 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先统一 可观测性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 前端白屏怎么检测：在「前端白屏怎么检测」里，前端白屏怎么检测 是验收对象，必须给可量化指标、日志信号和测试证据。
- 可观测性：可观测性 是「前端白屏怎么检测」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 监控：围绕「前端白屏怎么检测」里的 监控 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「前端白屏怎么检测」里，可观测性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：可观测性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## ab-experiment-frontend-followup-2

title: 追问：以「前端怎么承接 A/B 实验」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端怎么承接 A/B 实验」的先后改造顺序
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端怎么承接 A/B 实验」为例，当团队成熟度不一致时，你会如何围绕 可观测性 定义「前端怎么承接 A/B 实验」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 B 实验 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 B 实验 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- A/B：A/B 是「前端怎么承接 A/B 实验」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 可观测性：围绕「前端怎么承接 A/B 实验」里的 可观测性 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 实验：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）。

#### 风险与验收

- 主要风险：在「前端怎么承接 A/B 实验」里，B 实验 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：B 实验 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## ab-experiment-frontend-followup-3

title: 追问：以「前端怎么承接 A/B 实验」为例，如果「前端怎么承接 A/B 实验」进入维护期，你会优先围绕 可观测性 监控哪些指标来预警风险
difficulty: 进阶
tags: [可观测性, 实验, 高频, 追问]
parent: ab-experiment-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端怎么承接 A/B 实验」为例，如果「前端怎么承接 A/B 实验」进入维护期，你会优先围绕 可观测性 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：把 B 实验 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 B 实验 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- A/B：A/B 是「前端怎么承接 A/B 实验」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 可观测性：围绕「前端怎么承接 A/B 实验」里的 可观测性 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 实验：需注意 SSR 不一致 + 闪烁问题（先渲染默认 → 实验分配后切换）。

#### 风险与验收

- 主要风险：在「前端怎么承接 A/B 实验」里，B 实验 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：B 实验 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## js-error-types-basic-followup-2

title: 追问：以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「JS 错误监听都有哪几个钩子？各管什么」为例，上报通道选 sendBeacon 还是 fetch keepalive？

### 答案要点

#### 直答

- 结论：先处理 JS 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：先梳理 JS 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- JS：JS 是「JS 错误监听都有哪几个钩子？各管什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 错误：app.config.errorHandler；React：ErrorBoundary（仅渲染错误，事件错误它收不到）。
- 监听：在「JS 错误监听都有哪几个钩子？各管什么」这题里，监听 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 JS 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：JS 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## js-error-types-basic-followup-3

title: 追问：结合真实业务约束，海量错误怎么聚合
difficulty: 基础
tags: [错误, 监听, 基础, 追问]
parent: js-error-types-basic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，海量错误怎么聚合（指纹 / 采样）？

### 答案要点

#### 直答

- 结论：先锁定 指纹 与 采样 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 指纹 与 采样 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 错误：app.config.errorHandler；React：ErrorBoundary（仅渲染错误，事件错误它收不到）。
- 监听：在「JS 错误监听都有哪几个钩子？各管什么」这题里，监听 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：指纹 与 采样 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 指纹 与 采样 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## tbt-and-long-task-collection-followup-2

title: 追问：结合真实业务约束，polyfill： = setTimeout + 用 IdleDeadline 模拟，或直接用 setTimeout 退化
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，polyfill：`(cb) => setTimeout(cb, 1)` + 用 IdleDeadline 模拟，或直接用 `setTimeout` 退化？

### 答案要点

#### 直答

- 结论：把 TBT 与 Long 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 TBT 与 Long 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- TBT：TBT 是「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Long Task：Long Task 采集。
- 上报：围绕「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里的 上报 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：TBT 与 Long 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：TBT 与 Long 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## tbt-and-long-task-collection-followup-3

title: 追问：在当前团队与业务约束下，紧急上报怎么不丢
difficulty: 资深
tags: [TBT, Long Task, 上报, 高频, 追问]
parent: tbt-and-long-task-collection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，紧急上报怎么不丢？

### 答案要点

#### 直答

- 结论：先锁定 TBT 与 Long 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 TBT 与 Long 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- TBT：TBT 是「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Long Task：Long Task 采集。
- 上报：在「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」这题里，上报 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：TBT 与 Long 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「TBT / Long Task 怎么采集？requestIdleCallback 上报权衡」里，验收 TBT 与 Long 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## source-map-stack-trace-followup-2

title: 追问：从工程落地角度看，6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，6-bit 一组，最高位续位标志，最后位是符号位；连续段相对前一段做差值？

### 答案要点

#### 直答

- 结论：先画出 Source 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 Source 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- SourceMap：SourceMap 是「Source Map：栈解析定位到源码行列」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 错误定位：围绕「Source Map：栈解析定位到源码行列」里的 错误定位 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- bit：围绕「Source Map：栈解析定位到源码行列」里的 bit 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：Source 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Source Map：栈解析定位到源码行列」里，Source 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## source-map-stack-trace-followup-3

title: 追问：从工程落地角度看，multi-level source map怎么处理
difficulty: 进阶
tags: [SourceMap, 错误定位, 追问]
parent: source-map-stack-trace
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，multi-level source map（babel + webpack 双重转换）怎么处理？

### 答案要点

#### 直答

- 结论：先拆分 Source 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 Source 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- SourceMap：SourceMap 是「Source Map：栈解析定位到源码行列」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 错误定位：围绕「Source Map：栈解析定位到源码行列」里的 错误定位 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- multi-level：在「Source Map：栈解析定位到源码行列」这题里，multi-level 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：Source 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Source Map：栈解析定位到源码行列」里，验收 Source 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## rrweb-on-demand-recording-followup-2

title: 追问：异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：异常发生 + 用户路径在风险页面 + 后台拉黑名单/灰名单？

### 答案要点

#### 直答

- 结论：先列出 后台拉黑名单 与 灰名单 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb。

#### 术语解释

- rrweb：rrweb 库 + 序列化数据量大，全量下发拖累首屏。
- 录屏：录屏数据上传也大，全量录制带宽 / 存储爆炸。
- 大依赖：在「大依赖按需下发：rrweb 百万级用户场景」里，大依赖 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 后台拉黑名单 与 灰名单 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：后台拉黑名单 与 灰名单 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## rrweb-on-demand-recording-followup-3

title: 追问：结合真实业务约束，录屏的存储成本怎么控
difficulty: 资深
tags: [rrweb, 录屏, 大依赖, 高频, 追问]
parent: rrweb-on-demand-recording
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，录屏的存储成本怎么控？

### 答案要点

#### 直答

- 结论：大依赖按需下发 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：用户主动：用户点"反馈" → 弹窗里说"为帮助排查，开始录制 1 分钟" → 此时动态 import rrweb。

#### 术语解释

- rrweb：rrweb 库 + 序列化数据量大，全量下发拖累首屏。
- 录屏：录屏数据上传也大，全量录制带宽 / 存储爆炸。
- 大依赖：在「大依赖按需下发：rrweb 百万级用户场景」里，大依赖 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 大依赖按需下发 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 大依赖按需下发 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## source-map-symbolicate-followup-2

title: 追问：以「Source Map 上传与错误还原」为例，你会如何围绕 SourceMap 定义「Source Map 上传与错误还原」生效的判据，并用测试与监控长期验证
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Source Map 上传与错误还原」为例，你会如何围绕 SourceMap 定义「Source Map 上传与错误还原」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 直答

- 结论：先定「Source Map 上传与错误还原」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原。

#### 术语解释

- Source Map：围绕「Source Map 上传与错误还原」里的 Source Map 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- SourceMap：SourceMap 是「Source Map 上传与错误还原」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Sentry：Sentry 是「Source Map 上传与错误还原」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Source Map 上传与错误还原」里，Source Map 上传与错误还原 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原。

## source-map-symbolicate-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SourceMap 重新划分「Source Map 上传与错误还原」的实施阶段
difficulty: 进阶
tags: [SourceMap, Sentry, 追问]
parent: source-map-symbolicate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SourceMap 重新划分「Source Map 上传与错误还原」的实施阶段？

### 答案要点

#### 直答

- 结论：把「Source Map 上传与错误还原」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原。

#### 术语解释

- Source Map：在「Source Map 上传与错误还原」这题里，Source Map 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- SourceMap：SourceMap 是「Source Map 上传与错误还原」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Sentry：Sentry 是「Source Map 上传与错误还原」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Source Map 上传与错误还原 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：需要把构建产物版本与对应 sourcemap 上传到监控平台做符号还原。

## rum-web-vitals-followup-2

title: 追问：如果要让结论在 RUM 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让结论在 RUM 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：验证「RUM 与 Web Vitals 才能告诉你真实用户体验」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 指标的组合验证 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- RUM：RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等。
- WebVitals：WebVitals 是「RUM 与 Web Vitals 才能告诉你真实用户体验」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 指标的组合验证 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：指标的组合验证 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## rum-web-vitals-followup-3

title: 追问：在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [RUM, WebVitals, 追问]
parent: rum-web-vitals
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「RUM 与 Web Vitals 才能告诉你真实用户体验」场景下，遇到约束变化时，你会如何围绕 RUM 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：把 RUM 与 Web Vitals 才能告诉你真实用户体验 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 RUM 与 Web Vitals 才能告诉你真实用户体验 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- RUM：RUM 适合收集 LCP、INP、CLS、TTFB、长任务、JS 错误、资源错误、页面白屏等。
- Web Vitals：在「RUM 与 Web Vitals 才能告诉你真实用户体验」这题里，Web Vitals 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- WebVitals：WebVitals 是「RUM 与 Web Vitals 才能告诉你真实用户体验」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 RUM 与 Web Vitals 才能告诉你真实用户体验 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：RUM 与 Web Vitals 才能告诉你真实用户体验 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## session-replay-alert-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 SessionReplay 方案有效
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 SessionReplay 方案有效？

### 答案要点

#### 直答

- 结论：先约定「会话回放、采样与告警阈值」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 采样 与 告警阈值 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- SessionReplay：SessionReplay 是「会话回放、采样与告警阈值」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 告警：告警阈值太低会噪音泛滥，太高又会错过故障。

#### 风险与验收

- 主要风险：在「会话回放、采样与告警阈值」里，采样 与 告警阈值 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：采样 与 告警阈值 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## session-replay-alert-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SessionReplay 重新划分「会话回放、采样与告警阈值」的实施阶段
difficulty: 进阶
tags: [SessionReplay, 告警, 追问]
parent: session-replay-alert
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 SessionReplay 重新划分「会话回放、采样与告警阈值」的实施阶段？

### 答案要点

#### 直答

- 结论：先小流量验证「会话回放、采样与告警阈值」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：把「会话回放、采样与告警阈值」里的 会话回放 采样与告警阈值 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- SessionReplay：SessionReplay 是「会话回放、采样与告警阈值」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 告警：告警阈值太低会噪音泛滥，太高又会错过故障。

#### 风险与验收

- 主要风险：在「会话回放、采样与告警阈值」里，会话回放 采样与告警阈值 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：会话回放 采样与告警阈值 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## opentelemetry-frontend-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 OpenTelemetry 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 OpenTelemetry 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「OpenTelemetry 在前端的接入」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 OpenTelemetry 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- OpenTelemetry：OpenTelemetry 是「OpenTelemetry 在前端的接入」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Trace：fetch 自动注入 traceparent header，后端继续传播形成端到端 span。

#### 风险与验收

- 主要风险：在「OpenTelemetry 在前端的接入」里，OpenTelemetry 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：OpenTelemetry 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## opentelemetry-frontend-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 OpenTelemetry 调整「OpenTelemetry 在前端的接入」的推进顺序
difficulty: 资深
tags: [OpenTelemetry, Trace, 追问]
parent: opentelemetry-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 OpenTelemetry 调整「OpenTelemetry 在前端的接入」的推进顺序？

### 答案要点

#### 直答

- 结论：「OpenTelemetry 在前端的接入」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：把「OpenTelemetry 在前端的接入」里的 OpenTelemetry 在前端的接入 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- OpenTelemetry：OpenTelemetry 是「OpenTelemetry 在前端的接入」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Trace：fetch 自动注入 traceparent header，后端继续传播形成端到端 span。

#### 风险与验收

- 主要风险：围绕 OpenTelemetry 在前端的接入 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：OpenTelemetry 在前端的接入 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## frontend-slo-error-budget

title: 前端 SLO 与错误预算：把可观测性接到发布闸门
followups: [frontend-slo-error-budget-followup-1, frontend-slo-error-budget-followup-2, frontend-slo-error-budget-followup-3]
difficulty: 资深
tags: [SLO, 错误预算, 发布治理]

### 一句话

这题回答要覆盖 SLO 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

你会如何给前端建立 SLO 与错误预算，并把它接到发布流程里，做到“预算吃紧就自动降风险”？

### 答案要点

- 先选可行动的 SLI：JS 致命错误率、白屏率、关键路径成功率、LCP/INP 分位，不要只看单一报错量。
- SLO 要按场景分层：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”。
- 错误预算要有周期和策略：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更。
- 结合 burn rate 做多窗口告警：短窗口抓突发，长窗口防慢性劣化，避免“瞬时波动”导致误触发。

#### 工程化补充

- 场景前提：前端 SLO 与错误预算：把可观测性接到发布闸门 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题回答要覆盖 事故响应 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

线上出现大面积白屏或关键流程失败时，你会如何组织前端事故响应，做到快速止损和闭环复盘？

### 答案要点

- 建立事故分级和触发条件：按影响面、业务损失、持续时长定义 Sev1/Sev2/Sev3，并绑定升级路径。
- 明确战时角色：Incident Commander 负责决策，Owner 负责技术定位，Comms 负责内外沟通，避免多人并行指挥。
- Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。
- 证据链要完整：告警时间线、版本变更、session replay、trace、用户反馈要能串成同一事件。

#### 工程化补充

- 场景前提：先定义 前端事故响应闭环：告警分级、指挥机制与复盘回放 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 事故响应 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 事故响应 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 事故响应 的可复现用例、线上监控指标和回退演练记录。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端 SLO 与错误预算：把可观测性接到发布闸门」为例，你会如何识别「前端 SLO 与错误预算：把可观测性接到发布闸门」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 结论：「前端 SLO 与错误预算：把可观测性接到发布闸门」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先梳理 前端 SLO 与错误预算 把可观测性接到发布闸门 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- SLO：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”。
- 错误预算：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更。
- 发布治理：在「前端 SLO 与错误预算：把可观测性接到发布闸门」这题里，发布治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「前端 SLO 与错误预算：把可观测性接到发布闸门」里，前端 SLO 与错误预算 把可观测性接到发布闸门 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：前端 SLO 与错误预算 把可观测性接到发布闸门 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## frontend-slo-error-budget-followup-2

title: 追问：在「前端 SLO 与错误预算：把可观测性接到发布闸门」场景下，为了证明这个方案在 SLO 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [SLO, 错误预算, 发布治理, 追问]
parent: frontend-slo-error-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前端 SLO 与错误预算：把可观测性接到发布闸门」场景下，为了证明这个方案在 SLO 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先约定「前端 SLO 与错误预算：把可观测性接到发布闸门」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先把「前端 SLO 与错误预算：把可观测性接到发布闸门」里的 前端 SLO 与错误预算 把可观测性接到发布闸门 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- SLO：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”。
- 错误预算：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更。
- 发布治理：围绕「前端 SLO 与错误预算：把可观测性接到发布闸门」里的 发布治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「前端 SLO 与错误预算：把可观测性接到发布闸门」里，前端 SLO 与错误预算 把可观测性接到发布闸门 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「前端 SLO 与错误预算：把可观测性接到发布闸门」里，前端 SLO 与错误预算 把可观测性接到发布闸门 至少要给一组指标阈值、一条日志证据和一组测试结果。

## frontend-slo-error-budget-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 SLO 调整方案边界与实施节奏
difficulty: 资深
tags: [SLO, 错误预算, 发布治理, 追问]
parent: frontend-slo-error-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 SLO 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「前端 SLO 与错误预算：把可观测性接到发布闸门」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：把「前端 SLO 与错误预算：把可观测性接到发布闸门」里的 调整方案边界 与 实施节奏 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- SLO：登录页、支付链路、营销页容忍度不同，阈值不能“一把尺子量到底”。
- 错误预算：例如按周/月计算预算消耗，超过阈值就冻结高风险发布，只允许修复类变更。
- 发布治理：在「前端 SLO 与错误预算：把可观测性接到发布闸门」这题里，发布治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：调整方案边界 与 实施节奏 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「前端 SLO 与错误预算：把可观测性接到发布闸门」里 调整方案边界 与 实施节奏 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## incident-command-runbook-followup-1

title: 追问：结合真实业务约束，围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」做方案评审时，哪些 事故响应 边界输入最容易导致结论失真
difficulty: 资深
tags: [事故响应, Runbook, 复盘, 追问]
parent: incident-command-runbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」做方案评审时，哪些 事故响应 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先拆分 前端事故响应闭环 告警分级 指挥机制与复盘回放 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。

#### 术语解释

- 事故响应：围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」里的 事故响应 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- Runbook：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。
- 复盘：围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」里的 复盘 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：前端事故响应闭环 告警分级 指挥机制与复盘回放 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「前端事故响应闭环：告警分级、指挥机制与复盘回放」里，前端事故响应闭环 告警分级 指挥机制与复盘回放 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## incident-command-runbook-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 事故响应 方案有效
difficulty: 资深
tags: [事故响应, Runbook, 复盘, 追问]
parent: incident-command-runbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 事故响应 方案有效？

### 答案要点

#### 直答

- 结论：验证「前端事故响应闭环：告警分级、指挥机制与复盘回放」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。

#### 术语解释

- 事故响应：围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」里的 事故响应 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- Runbook：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。
- 复盘：围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」里的 复盘 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 指挥机制 与 复盘回放 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：指挥机制 与 复盘回放 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## incident-command-runbook-followup-3

title: 追问：在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级
difficulty: 资深
tags: [事故响应, Runbook, 复盘, 追问]
parent: incident-command-runbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 事故响应 重排「前端事故响应闭环：告警分级、指挥机制与复盘回放」方案优先级？

### 答案要点

#### 直答

- 结论：「前端事故响应闭环：告警分级、指挥机制与复盘回放」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：Runbook 要可执行：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。

#### 术语解释

- 事故响应：围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」里的 事故响应 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- Runbook：先看哪组指标、先查哪条日志、先做哪种止损（开关、降级、回滚）要写成步骤。
- 复盘：围绕「前端事故响应闭环：告警分级、指挥机制与复盘回放」里的 复盘 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「前端事故响应闭环：告警分级、指挥机制与复盘回放」场景下，前端事故响应闭环 告警分级 指挥机制与复盘回放 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「前端事故响应闭环：告警分级、指挥机制与复盘回放」里，前端事故响应闭环 告警分级 指挥机制与复盘回放 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## observability-release-readiness-gate

title: 可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理]
followups: [observability-release-readiness-gate-followup-1, observability-release-readiness-gate-followup-2, observability-release-readiness-gate-followup-3]

### 一句话

这题的高分关键是把 可观测性 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

一个核心前端系统准备发布大版本改造。你会如何定义“可观测性发布就绪”标准，把观测能力变成真正的发布准入条件？

### 答案要点

- 先定义覆盖基线：关键路径必须具备日志、指标、trace 和用户体验指标（如 LCP/白屏率）最小集。
- 质量要可验：告警命中率、误报率、漏报率、定位时长需达到阈值，而不是“有告警就算完成”。
- 恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过。
- 发布前做探针检查：验证版本号、source map、采样配置、上报通道和看板同步正确。

#### 工程化补充

- 场景前提：可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 可观测性。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

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

讲「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你已经有前端 SLO 和错误预算，但值班反馈“告警响了也不知道先做什么”。你会如何设计 burn rate 驱动的自动止损编排？

### 答案要点

- burn rate 要用多窗口组合：短窗识别突发事故，长窗识别慢性退化，减少单窗误判。
- 告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚。
- 每个动作都要绑定责任边界：谁确认、谁接管、谁复核要在 runbook 里写清楚。
- 观测要覆盖“动作效果”：止损后错误率、延迟、业务转化是否回归阈值。

#### 工程化补充

- 场景前提：回答 Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复 时先锁定 SLO 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 SLO 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SLO 的可复现用例、线上监控指标和回退演练记录。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要做「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 结论：先锁定 覆盖率 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过。

#### 术语解释

- 可观测性：围绕「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里的 可观测性 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 发布闸门：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」这题里，发布闸门 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 质量治理：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」这题里，质量治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」场景下，覆盖率 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里，覆盖率 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## observability-release-readiness-gate-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 可观测性 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理, 追问]
parent: observability-release-readiness-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 可观测性 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：验证「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过。

#### 术语解释

- 可观测性：可观测性 是「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 发布闸门：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里，发布闸门 是验收对象，必须给可量化指标、日志信号和测试证据。
- 质量治理：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里，质量治理 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 可观测性 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：可观测性 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## observability-release-readiness-gate-followup-3

title: 追问：这套「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」要不要继续投人投钱，你会盯哪几组和 可观测性 相关的数据先说话
difficulty: 资深
tags: [可观测性, 发布闸门, 质量治理, 追问]
parent: observability-release-readiness-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：这套「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」要不要继续投人投钱，你会盯哪几组和 可观测性 相关的数据先说话？

### 答案要点

#### 直答

- 结论：把 覆盖率 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：恢复能力纳入验收：每条高风险链路都要有可执行回滚或降级动作，并且演练通过。

#### 术语解释

- 可观测性：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里，可观测性 是验收对象，必须给可量化指标、日志信号和测试证据。
- 发布闸门：围绕「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里的 发布闸门 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 质量治理：围绕「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里的 质量治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「可观测性发布就绪闸门：覆盖率、质量与恢复能力联合验收」里，覆盖率 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：覆盖率 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## burn-rate-auto-mitigation-orchestration-followup-1

title: 追问：以「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」为例，如果要做「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [SLO, BurnRate, 事故响应, 追问]
parent: burn-rate-auto-mitigation-orchestration
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」为例，如果要做「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 结论：先梳理 Burn Rate 自动止损编排 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚。

#### 术语解释

- Burn Rate：围绕「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的 Burn Rate 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- SLO：SLO 是「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- BurnRate：BurnRate 是「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 Burn Rate 自动止损编排 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里 Burn Rate 自动止损编排 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## burn-rate-auto-mitigation-orchestration-followup-2

title: 追问：在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [SLO, BurnRate, 事故响应, 追问]
parent: burn-rate-auto-mitigation-orchestration
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」场景下，上线后你会盯哪些与 SLO 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先定「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚。

#### 术语解释

- Burn Rate：围绕「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的 Burn Rate 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- SLO：SLO 是「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- BurnRate：BurnRate 是「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Burn Rate 自动止损编排 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里，Burn Rate 自动止损编排 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## burn-rate-auto-mitigation-orchestration-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 SLO 调整「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」方案的边界和节奏
difficulty: 资深
tags: [SLO, BurnRate, 事故响应, 追问]
parent: burn-rate-auto-mitigation-orchestration
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 SLO 调整「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」方案的边界和节奏？

### 答案要点

#### 直答

- 结论：先锁定 Burn Rate 自动止损编排 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：告警触发后动作要分级：先降流和开关降级，再限制发布，最后执行自动回滚。

#### 术语解释

- Burn Rate：在「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」这题里，Burn Rate 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- SLO：SLO 是「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- BurnRate：BurnRate 是「Burn Rate 自动止损编排：多窗口告警、分级动作与闭环恢复」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Burn Rate 自动止损编排 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 Burn Rate 自动止损编排 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## alert-fatigue-budget-governance

title: 告警疲劳预算治理：噪音配额、升级纪律与静默止损
difficulty: 资深
tags: [告警治理, oncall, 事故响应]
followups: [alert-fatigue-budget-governance-followup-1, alert-fatigue-budget-governance-followup-2, alert-fatigue-budget-governance-followup-3]

### 一句话

这题的高分关键是把 告警治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

近期值班团队反馈告警噪音过高，夜间大量误报导致关键告警被淹没。你会如何建立告警疲劳预算治理机制，恢复告警系统的可信度？

### 答案要点

- 先定义告警预算：按团队与业务域设定“可接受噪音上限”。
- 告警分级要绑定动作：P1 直达值班，P2 聚合提醒，P3 汇总回顾。
- 误报要有治理 SLA：超过阈值必须在固定时限内降噪或下线规则。
- 静默策略必须可追溯：谁静默、静默多久、何时恢复要有审计记录。

#### 工程化补充

- 场景前提：落地 告警疲劳预算治理：噪音配额、升级纪律与静默止损 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题的高分关键是把 事故闭环 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

一次线上事故在告警恢复后又反复出现，团队争议焦点是“到底有没有真正修复”。你会如何建立事故证据闭环协议，避免“误恢复”？

### 答案要点

- 定义恢复证据最小集合：告警回落、关键链路成功率、业务指标回稳三者缺一不可。
- 每次止损动作都要绑定证据：执行时间、影响范围、观测窗口、复核结论。
- 恢复确认分两层：技术恢复（系统指标）+ 业务恢复（用户影响）。
- 设立“观察期再开闸”规则：短暂回落不立即宣布恢复。

#### 工程化补充

- 场景前提：落地 事故证据闭环协议：从告警命中到恢复确认的最后一公里 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：告警预算机制上线前，你会先验哪些关键假设，避免“降噪做了但值班更乱”？

### 答案要点

#### 直答

- 结论：先列「告警疲劳预算治理：噪音配额、升级纪律与静默止损」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：围绕 升级纪律 与 静默止损 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 告警治理：围绕「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里的 告警治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- oncall：围绕「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里的 oncall 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 事故响应：围绕「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里的 事故响应 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 升级纪律 与 静默止损 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：升级纪律 与 静默止损 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## alert-fatigue-budget-governance-followup-2

title: 追问：你会怎样验证告警降噪不是纸面优化
difficulty: 资深
tags: [告警治理, oncall, 事故响应, 追问]
parent: alert-fatigue-budget-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说告警降噪有效，那怎么证明不是“响得少了，但关键问题也漏了”？

### 答案要点

#### 直答

- 结论：验证 升级纪律 与 静默止损 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 升级纪律 与 静默止损 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 告警治理：在「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里，告警治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- oncall：在「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里，oncall 是验收对象，必须给可量化指标、日志信号和测试证据。
- 事故响应：在「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里，事故响应 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：升级纪律 与 静默止损 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里，升级纪律 与 静默止损 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## alert-fatigue-budget-governance-followup-3

title: 追问：约束变化时如何渐进演进告警治理
difficulty: 资深
tags: [告警治理, oncall, 事故响应, 追问]
parent: alert-fatigue-budget-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：业务量增长或值班人手收紧时，你会怎么渐进调整告警治理，而不是推翻重来？

### 答案要点

#### 直答

- 结论：先定义 升级纪律 与 静默止损 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 升级纪律 与 静默止损 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 告警治理：围绕「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里的 告警治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- oncall：围绕「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里的 oncall 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 事故响应：围绕「告警疲劳预算治理：噪音配额、升级纪律与静默止损」里的 事故响应 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 升级纪律 与 静默止损 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：升级纪律 与 静默止损 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## incident-evidence-closure-protocol-followup-1

title: 追问：事故闭环里哪些边界最容易导致误恢复
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理, 追问]
parent: incident-evidence-closure-protocol
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：事故看起来恢复了却又复发，通常是哪些边界没验到位，你会怎么防？

### 答案要点

#### 直答

- 结论：先梳理 事故证据闭环协议 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 事故证据闭环协议 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 事故闭环：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」这题里，事故闭环 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 证据链：围绕「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里的 证据链 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 可观测性治理：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」这题里，可观测性治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：事故证据闭环协议 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：事故证据闭环协议 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## incident-evidence-closure-protocol-followup-2

title: 追问：团队经验不均时怎么分段落地证据闭环
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理, 追问]
parent: incident-evidence-closure-protocol
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：团队里有新手也有老手，你会如何把事故证据闭环拆成可分段执行且可独立验收的流程？

### 答案要点

#### 直答

- 结论：先定「事故证据闭环协议：从告警命中到恢复确认的最后一公里」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先把「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里的 事故证据闭环协议 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 事故闭环：围绕「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里的 事故闭环 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 证据链：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里，证据链 是验收对象，必须给可量化指标、日志信号和测试证据。
- 可观测性治理：围绕「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里的 可观测性治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里，事故证据闭环协议 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里，事故证据闭环协议 至少要给一组指标阈值、一条日志证据和一组测试结果。

## incident-evidence-closure-protocol-followup-3

title: 追问：预算收紧时如何调整事故闭环节奏
difficulty: 资深
tags: [事故闭环, 证据链, 可观测性治理, 追问]
parent: incident-evidence-closure-protocol
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：预算收紧但稳定性目标不变，你会怎么调整事故闭环节奏，既不失控也不拖慢恢复？

### 答案要点

#### 直答

- 结论：先冻结「事故证据闭环协议：从告警命中到恢复确认的最后一公里」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。
- 关键动作：先定位 事故证据闭环协议 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 事故闭环：围绕「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里的 事故闭环 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 证据链：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」这题里，证据链 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 可观测性治理：围绕「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里的 可观测性治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」场景下，事故证据闭环协议 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「事故证据闭环协议：从告警命中到恢复确认的最后一公里」里，验收 事故证据闭环协议 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。
