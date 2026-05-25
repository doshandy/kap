---
id: 06-network
title: 网络协议
order: 6
icon: 📡
description: TCP/IP、HTTP、TLS、缓存、跨域、实时通信与传输优化。
---

## tcp-tls-http

title: TCP、TLS、HTTP 三层关系怎么向面试官讲清楚
followups: [tcp-tls-http-followup-1, tcp-tls-http-followup-2, tcp-tls-http-followup-3]
links: [http1-http2-http3]
difficulty: 基础
tags: [TCP, TLS, HTTP]

### 一句话

讲「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请说明 TCP、TLS、HTTP 各自处于什么层，分别解决什么问题。

### 答案要点

- TCP 解决可靠字节流传输：有序、重传、流量控制、拥塞控制
- TLS 解决通信加密和身份认证：证书校验、密钥协商、数据完整性
- HTTP 解决应用语义：请求方法、状态码、缓存、内容协商
- 对 HTTP/1.1 与 HTTP/2 来说，HTTPS 常可概括为 HTTP over TLS over TCP；HTTP/3 则通常运行在 QUIC 之上，而 QUIC 本身集成了 TLS 1.3 的安全能力

#### 工程化补充

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```ts
// 通过 Performance API 拆解请求耗时
const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
console.log({
  DNS: nav.domainLookupEnd - nav.domainLookupStart,
  TCP: nav.connectEnd - nav.connectStart,
  TLS: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
  TTFB: nav.responseStart - nav.requestStart,
  Download: nav.responseEnd - nav.responseStart,
});

// 单个资源耗时
new PerformanceObserver((list) => {
  for (const entry of list.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    if (entry.duration > 1000) {
      console.warn('slow resource:', entry.name, {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        connect: entry.connectEnd - entry.connectStart,
        ttfb: entry.responseStart - entry.requestStart,
        size: entry.encodedBodySize,
      });
    }
  }
}).observe({ type: 'resource', buffered: true });
```

### 追问

- 「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 TCP、TLS、HTTP，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 很多"接口慢"不是 HTTP 本身慢，而是下层连接建立、证书校验、丢包重传等因素叠加

## http1-http2-http3

title: HTTP/1.1、HTTP/2、HTTP/3 的关键差异
followups: [http1-http2-http3-followup-1, http1-http2-http3-followup-2, http1-http2-http3-followup-3]
links: [tcp-tls-http]
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC]

### 一句话

这题的高分关键是把 HTTP2 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么 HTTP/2 解决了一部分问题，但没有彻底消除性能瓶颈？HTTP/3 又补了什么？

### 答案要点

- HTTP/1.1 在单连接内存在应用层队头阻塞，浏览器常通过开多个连接来缓解
- HTTP/2 带来二进制分帧、多路复用、头部压缩，但仍跑在 TCP 上，丢包时仍会受传输层队头阻塞影响
- HTTP/3 基于 QUIC（运行在 UDP 之上），把连接建立、重传和多路复用放到新的传输层协议里，通常更利于降低握手时延并改善弱网体验

#### 工程化补充

- 场景前提：HTTP/1.1、HTTP/2、HTTP/3 的关键差异 只有在瓶颈被数据证实时才值得推进；先确认 HTTP2 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 HTTP/1.1、HTTP/2、HTTP/3 的关键差异 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
// 检测当前请求的协议版本
const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
console.log('protocol:', nav.nextHopProtocol); // 'h2' / 'h3' / 'http/1.1'
```

```http
# Nginx 启用 HTTP/2
server {
  listen 443 ssl http2;
  ssl_certificate     /etc/ssl/cert.pem;
  ssl_certificate_key /etc/ssl/key.pem;

  # HTTP/3：广告 alt-svc 让客户端升级
  add_header Alt-Svc 'h3=":443"; ma=86400';
  listen 443 quic reuseport;
}
```

```ts
// 客户端开启复用，避免每个请求都走握手
fetch(url, { keepalive: true });

// 通过单个 connection 串行多个 fetch（同源会自动复用）
async function fetchMany(urls: string[]) {
  return Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
}
```

### 常见误区

- HTTP/2 解决了 HTTP/1.1 的应用层 head-of-line，但 TCP 层 HOL 仍在；HTTP/3（QUIC）才彻底解决
- HTTP/2 的 Server Push 已被弃用，转向 103 Early Hints
- HTTP/3 跑 UDP，企业内网防火墙可能拦——必须有 HTTP/2 fallback

### 追问

- 队头阻塞（HOL）的具体含义
- QUIC 的 0-RTT 是什么，有什么风险（重放攻击）
- 多大并发请求时 HTTP/2 收益最明显

### 延伸

- "升级 HTTP/2/3"不等于一定更快，还要看 CDN、客户端支持、资源组织方式
- HTTP/2 的 Server Push 虽然在协议层存在过，但现代浏览器和生态里基本已不再作为主流优化手段

## caching

title: 强缓存、协商缓存、Service Worker 缓存如何协同
followups: [caching-followup-1, caching-followup-2, caching-followup-3]
links: [05-browser/browser-cache-strategy, bfcache-frontend]
difficulty: 基础
tags: [缓存, CDN]

### 一句话

这题的高分关键是把 缓存 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

说清楚 `Cache-Control`、`Expires`、`ETag`、`Last-Modified` 的关系，并补充前端资源版本化策略。

### 答案要点

- 强缓存命中直接不发请求：Cache-Control: max-age 优先级高于 Expires
- 协商缓存会发请求问服务器：ETag/If-None-Match 更精确，Last-Modified/If-Modified-Since 更轻量
- 静态资源通常配合 hash 文件名做长期缓存，HTML 短缓存或不缓存
- Service Worker 属于应用层缓存，可覆盖浏览器默认行为

#### 工程化补充

- 场景前提：强缓存、协商缓存、Service Worker 缓存如何协同 只有在瓶颈被数据证实时才值得推进；先确认 缓存 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 强缓存、协商缓存、Service Worker 缓存如何协同 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```http
# 1. 带 hash 的静态资源：长缓存 + immutable
Cache-Control: public, max-age=31536000, immutable

# 2. HTML：短缓存或不缓存
Cache-Control: no-cache, must-revalidate

# 3. API：根据业务决定
Cache-Control: private, max-age=60
ETag: "v3-9d7c"

# 4. 协商缓存交互
Request:  If-None-Match: "v3-9d7c"
Response: 304 Not Modified
```

```js
// vite.config.ts：Vite 默认会给静态资源带 hash
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
};
```

```nginx
# nginx：根据路径下发缓存头
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  try_files $uri =404;
}
location = /index.html {
  add_header Cache-Control "no-cache, must-revalidate";
}
```

### 常见误区

- 强缓存（max-age）和协商缓存（ETag/Last-Modified）混着用——max-age 没过期不会发请求，何谈协商
- 用 `no-cache` 误以为「不缓存」——它是「每次都要 revalidate」；真不缓存用 `no-store`
- Service Worker 的缓存独立于 HTTP 缓存，发生版本不一致时极难排查

### 追问

- 强缓存 vs 协商缓存触发顺序
- ETag 的强校验和弱校验差别
- immutable 这个 Cache-Control 指令做什么用

### 延伸

- hash 命名 + immutable 是静态资源治理核心套路
- 不要把带 hash 的静态资源和不带 hash 的 HTML 用同一缓存策略

## cors-cross-origin

title: CORS、预检请求与常见跨域方案
followups: [cors-cross-origin-followup-1, cors-cross-origin-followup-2, cors-cross-origin-followup-3]
difficulty: 进阶
tags: [跨域, CORS]

### 一句话

这题回答要覆盖 跨域 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

浏览器为什么要做同源限制？CORS 的简单请求和预检请求区别是什么？

### 答案要点

- 同源策略保护用户上下文和站点数据，防止任意站点读取别站响应
- 简单请求满足方法/头部/content-type 限制；否则先发 OPTIONS 预检
- 服务端通过 Access-Control-Allow-Origin/Methods/Headers/Credentials 明确放行
- 带凭证时 Allow-Origin 不能写 \*

#### 工程化补充

- 场景前提：先约定 跨域 的超时、重试和幂等语义，再谈 CORS、预检请求与常见跨域方案 的实现细节。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```http
# 简单请求（GET / POST + 简单 content-type）：浏览器直接发，仅校验响应头
Request:
  GET /api/data HTTP/1.1
  Origin: https://app.example.com

Response:
  Access-Control-Allow-Origin: https://app.example.com
  Access-Control-Allow-Credentials: true
```

```http
# 复杂请求（自定义 header / PUT / DELETE）：先发 OPTIONS 预检
Request (preflight):
  OPTIONS /api/data HTTP/1.1
  Origin: https://app.example.com
  Access-Control-Request-Method: PUT
  Access-Control-Request-Headers: X-Token, Content-Type

Response:
  Access-Control-Allow-Origin: https://app.example.com
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  Access-Control-Allow-Headers: X-Token, Content-Type
  Access-Control-Allow-Credentials: true
  Access-Control-Max-Age: 86400      # 缓存预检结果 1 天
```

```ts
// 前端发起带凭证的跨域请求
await fetch('https://api.example.com/me', {
  credentials: 'include', // 带 Cookie
  headers: { 'X-Token': token },
});
```

```ts
// 开发期：通过 Vite 代理绕开 CORS
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
};
```

### 常见误区

- 简单请求和预检请求的判定经常被记错（GET/POST + 简单头 + 简单 Content-Type）
- 带 cookie 跨域要 server 设 `Access-Control-Allow-Credentials: true`，且 origin 不能是 `*`
- 预检请求被缓存——本以为改了 server 不生效，其实是 304，要清

### 追问

- 预检的 Access-Control-Max-Age 一般设多久
- CORS 和 CSRF 谁防谁，能互相替代吗
- 跨域字体（@font-face）为什么要 crossorigin 属性

### 延伸

- JSONP 只能 GET 且有安全和维护成本，现在更多是历史题
- CORS 是浏览器约束，不是服务器安全边界的全部
- CORS 放行后，也不等于 Cookie 一定会跨站发送；凭证请求还受 `credentials` 配置与 Cookie `SameSite` 策略共同影响

## websocket-sse

title: WebSocket、SSE、轮询怎么选
followups: [websocket-sse-followup-1, websocket-sse-followup-2, websocket-sse-followup-3]
links: [11-ai-frontend/llm-streaming-protocols, 05-browser/webtransport-vs-websocket, websocket-vs-sse-vs-polling]
difficulty: 进阶
tags: [实时通信, SSE]

### 一句话

这题的高分关键是把 实时通信 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

给聊天、通知、AI 流式输出三个场景分别选通信方式，并解释原因。

### 答案要点

- 聊天通常优先 WebSocket：双向实时、交互频繁
- 通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource
- 轮询实现简单但浪费请求；长轮询是过渡方案

#### 工程化补充

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```ts
// 1. WebSocket：双向，自动重连
class WS {
  private ws!: WebSocket;
  private retry = 0;
  constructor(private url: string) {
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.retry = 0;
    };
    this.ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    this.ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** this.retry++, 30_000);
      setTimeout(() => this.connect(), delay);
    };
  }

  send(data: any) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data));
  }

  onMessage(msg: any) {
    /* ... */
  }
}

// 2. SSE：服务端推送
const es = new EventSource('/api/notifications', { withCredentials: true });
es.onmessage = (e) => console.log('msg:', e.data);
es.addEventListener('order-update', (e) => console.log('order:', (e as MessageEvent).data));
es.onerror = () => console.warn('SSE 错误，浏览器会自动重连');

// 3. fetch 流：替代受限的 SSE（适合 AI 流式输出）
async function streamChat(prompt: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    appendToUI(chunk);
  }
}
```

### 追问

- 「WebSocket、SSE、轮询怎么选」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「WebSocket、SSE、轮询怎么选」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 实时通信、SSE，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- SSE 在企业代理、CDN、超时控制上要做额外验证
- WebSocket 连接建立后不再走普通 HTTP 缓存和拦截链路
- 原生 `EventSource` 对请求方法、自定义请求头、响应控制都比较受限；若这些能力很重要，常会改用 `fetch` 流

## upload-download

title: 大文件上传、断点续传、Range 下载的前端设计
followups: [upload-download-followup-1, upload-download-followup-2, upload-download-followup-3]
links: [21-interview-special/design-upload-system]
difficulty: 进阶
tags: [上传, Range]

### 一句话

讲「大文件上传、断点续传、Range 下载的前端设计」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

如何设计一个支持断点续传和秒传的上传组件？

### 答案要点

- 前端切片，计算文件 hash，先问服务端“哪些分片已存在”
- 仅上传缺失分片，服务端最终合并
- 秒传本质是服务端发现同 hash 文件已存在，直接复用
- 下载续传依赖 Range / 206 Partial Content

#### 工程化补充

- 场景前提：回答 大文件上传、断点续传、Range 下载的前端设计 时先锁定 上传 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 上传 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 上传 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```ts
// 大文件上传：切片 + 秒传 + 断点续传
async function upload(file: File, chunkSize = 5 * 1024 * 1024) {
  // 1. 计算 hash（在 Worker 中跑，避免阻塞）
  const hash = await hashInWorker(file);

  // 2. 询问服务端：是否秒传 / 已上传分片
  const { skip, uploaded } = (await fetch('/api/upload/check', {
    method: 'POST',
    body: JSON.stringify({ hash, size: file.size }),
  }).then((r) => r.json())) as { skip: boolean; uploaded: number[] };

  if (skip) return { hash, skip: true };

  // 3. 切片上传（仅缺失的）
  const total = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < total; i++) {
    if (uploaded.includes(i)) continue;
    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
    const fd = new FormData();
    fd.append('hash', hash);
    fd.append('idx', String(i));
    fd.append('chunk', chunk);
    await fetch('/api/upload/chunk', { method: 'POST', body: fd });
  }

  // 4. 通知合并
  return fetch('/api/upload/merge', {
    method: 'POST',
    body: JSON.stringify({ hash, total }),
  }).then((r) => r.json());
}
```

```ts
// Range 下载：支持续传
async function downloadRange(url: string, from: number) {
  const res = await fetch(url, { headers: { Range: `bytes=${from}-` } });
  if (res.status !== 206) throw new Error('服务端不支持 Range');
  const total = +res.headers.get('Content-Range')!.split('/')[1];
  const reader = res.body!.getReader();
  let received = from;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    onProgress(received / total);
    appendToFile(value);
  }
}
```

### 追问

- 推动「大文件上传、断点续传、Range 下载的前端设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「大文件上传、断点续传、Range 下载的前端设计」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 上传、Range，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- hash 计算可能很耗 CPU，适合放 Worker
- 真正可用的上传组件还要考虑暂停、重试、并发数、自定义鉴权和失败恢复

## dns-cdn

title: DNS、CDN 与接入层优化的前端视角
followups: [dns-cdn-followup-1, dns-cdn-followup-2, dns-cdn-followup-3]
difficulty: 进阶
tags: [DNS, CDN]

### 一句话

这题的高分关键是把 DNS 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端如何理解 CDN、回源、预连接和 DNS 优化？

### 答案要点

- CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力
- 未命中时会回源，回源链路和缓存键策略会影响最终性能
- dns-prefetch 提前解析域名；preconnect 提前建立 TCP/TLS
- 域名拆分不是永远有利，在 HTTP/2/3 下过多域名会放大连接建立成本

#### 工程化补充

- 场景前提：DNS、CDN 与接入层优化的前端视角 只有在瓶颈被数据证实时才值得推进；先确认 DNS 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 DNS、CDN 与接入层优化的前端视角 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```html
<!-- 提前 DNS 解析 -->
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- 提前建立完整连接（含 TLS） -->
<link rel="preconnect" href="https://api.example.com" crossorigin />
<link rel="preconnect" href="https://cdn.example.com" crossorigin />

<!-- HTTP/3 支持时优先升级 -->
<meta http-equiv="origin-trial" content="..." />
```

```http
# CDN 缓存键定制（CloudFront 示例配置）
CacheKey:
  Headers: [Accept-Language]
  QueryStringBehavior: whitelist
  QueryStringList: [v, locale]
  CookiesBehavior: none

# 回源协议
OriginProtocol: https-only
OriginSSLProtocols: [TLSv1.2, TLSv1.3]
```

```ts
// 客户端端：检测当前用户的网络质量并自适应
const conn = (navigator as any).connection;
if (conn) {
  console.log('网络类型:', conn.effectiveType); // '4g' / '3g' / 'slow-2g'
  console.log('节省流量:', conn.saveData);
  if (conn.saveData || conn.effectiveType === 'slow-2g') {
    // 关闭自动播放、降低图片质量
    document.documentElement.classList.add('low-bandwidth');
  }
}
```

### 追问

- 「DNS、CDN 与接入层优化的前端视角」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「DNS、CDN 与接入层优化的前端视角」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 DNS、CDN，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- CDN 不只是"快"，还是安全和可用性基础设施
- 缓存键里是否包含 query、header、cookie，会直接影响命中率
- 很多平台还会引入 WAF、Bot 防护、边缘重写和回源鉴权，因此"前端看到的网络行为"未必等于源站真实行为

## webrtc-basic

title: WebRTC 基础：为什么 P2P 仍然需要服务器
followups: [webrtc-basic-followup-1, webrtc-basic-followup-2, webrtc-basic-followup-3]
difficulty: 资深
tags: [WebRTC, P2P]

### 一句话

这题回答要覆盖 WebRTC 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

浏览器之间打 P2P 视频通话，整个流程涉及哪些角色？SDP 和 ICE 各自做什么？

### 答案要点

- Signaling 服务器：交换 SDP / ICE，但本身不传媒体；常用 WebSocket
- SDP（Session Description Protocol）：协商编解码、媒体方向、加密参数
- ICE：穷举候选地址（host / srflx / relay），用 STUN / TURN 找出最佳通路
- STUN：帮助发现公网地址；TURN：NAT 打洞失败时做中继（流量贵）

#### 工程化补充

- 场景前提：先说明浏览器调度与渲染阶段，再讲 WebRTC 基础：为什么 P2P 仍然需要服务器，否则容易把现象当结论。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

### 代码示例

```ts
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:turn.example.com', username: 'u', credential: 'p' },
  ],
});

const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
stream.getTracks().forEach((t) => pc.addTrack(t, stream));

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signaling.send({ type: 'offer', sdp: offer.sdp });

pc.onicecandidate = (e) => {
  if (e.candidate) signaling.send({ type: 'candidate', candidate: e.candidate });
};

pc.ontrack = (e) => {
  videoEl.srcObject = e.streams[0];
};
```

### 追问

- 「WebRTC 基础：为什么 P2P 仍然需要服务器」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「WebRTC 基础：为什么 P2P 仍然需要服务器」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 WebRTC、P2P，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大规模会议不走纯 P2P，而是 SFU（Selective Forwarding Unit），中心服务器只转发不编解码
- 数据通道可代替 WebSocket 做"同 P2P 信道"的实时数据传输（白板、协同光标）

## quic-http3-deep

title: HTTP/3 / QUIC 在前端工程中的可见影响
followups: [quic-http3-deep-followup-1, quic-http3-deep-followup-2, quic-http3-deep-followup-3]
difficulty: 资深
tags: [HTTP/3, QUIC]

### 一句话

讲「HTTP/3 / QUIC 在前端工程中的可见影响」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

作为前端，HTTP/3 的落地会让你哪些指标受益？踩到的坑是什么？

### 答案要点

- 0-RTT / 1-RTT：握手次数减少，移动网络弱信号下首请求显著快
- 多路复用：基于 UDP，避免 HTTP/2 的 TCP 队头阻塞
- 连接迁移：网络切换（WiFi → 4G）连接不丢
- 加密：TLS 1.3 内嵌，整个传输层强制加密

#### 工程化补充

- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```ts
performance.getEntriesByType('resource').forEach((r) => {
  const e = r as PerformanceResourceTiming;
  if (e.nextHopProtocol === 'h3') {
    console.log(e.name, 'via H3', e.duration);
  }
});

new PerformanceObserver((list) => {
  for (const e of list.getEntries() as PerformanceResourceTiming[]) {
    fetch('/beacon', {
      method: 'POST',
      body: JSON.stringify({
        url: e.name,
        proto: e.nextHopProtocol,
        ttfb: e.responseStart - e.requestStart,
        dur: e.duration,
      }),
      keepalive: true,
    });
  }
}).observe({ type: 'resource', buffered: true });
```

### 追问

- 「HTTP/3 / QUIC 在前端工程中的可见影响」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「HTTP/3 / QUIC 在前端工程中的可见影响」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 HTTP/3、QUIC，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- HTTP/3 收益最明显的是中等延迟 + 抖动场景（跨国、移动网）
- 强制走 H3 不一定更稳定，建议保留 H2 fallback，做 A/B

## https-handshake

title: HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别
followups: [https-handshake-followup-1, https-handshake-followup-2, https-handshake-followup-3]
difficulty: 进阶
tags: [TLS, 安全]

### 一句话

回答「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请描述一次完整的 HTTPS 握手过程，TLS 1.3 相比 1.2 优化了什么？

### 答案要点

- TLS 1.2：2-RTT 握手（ClientHello → ServerHello + Cert + KeyExchange → ClientKeyExchange + Finished → Finished）
- TLS 1.3：1-RTT 握手；客户端 Hello 同时携带 KeyShare，服务端 Hello + Cert 一次返回；后续应用数据
- TLS 1.3 还支持 0-RTT（PSK / Session Ticket），但有重放风险
- 移除了不安全算法（RC4、MD5、SHA-1、CBC、RSA 密钥交换）

#### 工程化补充

- 场景前提：先限定 TLS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别 的结论不成立。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```bash
openssl s_client -connect doshandy.github.io:443 -tls1_3 -showcerts

curl --tls13 https://example.com -v
```

### 追问

- 如果把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 TLS、安全，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- HTTP/3 基于 QUIC（UDP），将 TLS 1.3 内嵌到传输层握手中
- mTLS 在企业内网常用：客户端也提供证书
- HSTS（Strict-Transport-Security）防止降级攻击

## websocket-vs-sse-vs-polling

title: 长轮询 / WebSocket / SSE 怎么选
followups: [websocket-vs-sse-vs-polling-followup-1, websocket-vs-sse-vs-polling-followup-2, websocket-vs-sse-vs-polling-followup-3]
links: [28-customer-service-im/websocket-heartbeat-reconnect, websocket-sse]
difficulty: 进阶
tags: [实时, 推送]

### 一句话

这题的高分关键是把 实时 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

做一个聊天 / 推送 / 实时仪表盘，应该选哪种通信方式？

### 答案要点

- 轮询（Polling）：简单粗暴；定时请求；浪费带宽，延迟取决于间隔
- 长轮询（Long Polling）：服务器 hold 住请求直到有数据；HTTP/1.1 兼容性好
- SSE（Server-Sent Events）：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制
- WebSocket：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻

#### 工程化补充

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```js
const es = new EventSource('/stream');
es.onmessage = (e) => console.log('msg:', e.data);
es.addEventListener('price', (e) => updatePrice(JSON.parse(e.data)));

const ws = new WebSocket('wss://example.com/chat');
ws.onopen = () => ws.send(JSON.stringify({ type: 'hello' }));
ws.onmessage = (e) => render(JSON.parse(e.data));
ws.onclose = () => setTimeout(reconnect, 1000);
```

### 追问

- 「长轮询 / WebSocket / SSE 怎么选」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「长轮询 / WebSocket / SSE 怎么选」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 实时、推送，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- AI 流式响应一般用 SSE（OpenAI / Anthropic / DeepSeek 都是）
- WebSocket 必须自己处理心跳与重连（socket.io 帮忙做了）
- 反向代理（Nginx / Cloudflare）需要 `Connection: upgrade` 配置

## cors-and-preflight

title: 跨域与 CORS 预检，谁触发了 OPTIONS
followups: [cors-and-preflight-followup-1, cors-and-preflight-followup-2, cors-and-preflight-followup-3]
difficulty: 进阶
tags: [CORS, 安全]

### 一句话

这题回答要覆盖 CORS 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请说说同源策略、CORS 的工作机制，以及哪些请求会触发预检。

### 答案要点

- 同源 = 协议 + 域名 + 端口完全相同；同源策略限制 cookie / DOM / Ajax
- 简单请求条件：方法 ∈ {GET, HEAD, POST}；Content-Type ∈ {text/plain, application/x-www-form-urlencoded, multipart/form-data}；不含自定义头
- 触发预检（OPTIONS）的情况：自定义头、PUT/DELETE/PATCH、application/json
- 预检响应必须带 Access-Control-Allow-Methods / Headers / Origin，可用 Access-Control-Max-Age 缓存

#### 工程化补充

- 场景前提：先限定 CORS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 跨域与 CORS 预检，谁触发了 OPTIONS 的结论不成立。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```js
fetch('/api/users', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-Trace-Id': 'abc' },
  body: JSON.stringify({ name: 'kap' }),
});
```

```nginx
location /api/ {
  add_header Access-Control-Allow-Origin $http_origin always;
  add_header Access-Control-Allow-Credentials true always;
  add_header Access-Control-Allow-Headers 'Content-Type,X-Trace-Id' always;
  add_header Access-Control-Allow-Methods 'GET,POST,PUT,DELETE,OPTIONS' always;
  if ($request_method = OPTIONS) {
    add_header Access-Control-Max-Age 600;
    return 204;
  }
}
```

### 追问

- 如果把「跨域与 CORS 预检，谁触发了 OPTIONS」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「跨域与 CORS 预检，谁触发了 OPTIONS」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 CORS、安全，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Chrome 强制 SameSite=Lax，跨域 cookie 需 Secure + SameSite=None
- Private Network Access（CORS-RFC1918）会进一步收紧本地网络的跨源访问
- 推荐用 BFF/网关代理减少跨域复杂度

## status-codes

title: HTTP 常见状态码及其含义
followups: [status-codes-followup-1, status-codes-followup-2, status-codes-followup-3]
difficulty: 基础
tags: [HTTP, 高频]

### 一句话

回答「HTTP 常见状态码及其含义」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请按类别说明常见 HTTP 状态码的含义和典型使用场景。

### 答案要点

- 1xx（Informational）：100 Continue（大请求体探测）、101 Switching Protocols（升级到 WebSocket）、103 Early Hints（提前推 preload）
- 2xx（Success）：200 OK、201 Created（POST 成功创建）、202 Accepted（已收到但未处理完）、204 No Content（PUT/DELETE 成功无返回体）、206 Partial Content（断点续传）
- 3xx（Redirection）：301 永久重定向（SEO 友好）、302 临时（POST→GET 转换）、303 See Other、304 Not Modified（协商缓存命中）、307 / 308（保留方法语义的重定向）
- 4xx（Client Error）：

#### 工程化补充

- 场景前提：先约定 HTTP 的超时、重试和幂等语义，再谈 HTTP 常见状态码及其含义 的实现细节。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```js
const res = await fetch('/api/users', { method: 'POST', body: JSON.stringify({ ... }) });
if (res.status === 201) {
  const id = res.headers.get('Location');
} else if (res.status === 422) {
  const errors = await res.json();
} else if (res.status === 429) {
  const retryAfter = res.headers.get('Retry-After');
}
```

### 追问

- 「HTTP 常见状态码及其含义」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「HTTP 常见状态码及其含义」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 HTTP、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- HTTP/2 推送已废弃，103 Early Hints 是替代方案
- 限流 429 + `Retry-After` 是大型 API 标配

## early-hints-103

title: HTTP 103 Early Hints 是什么？怎么用来优化首屏
followups: [early-hints-103-followup-1, early-hints-103-followup-2, early-hints-103-followup-3]
difficulty: 资深
tags: [HTTP, 性能, 高频]

### 一句话

这题回答要覆盖 HTTP 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

后端响应时间长（数据库慢），但 LCP 主要瓶颈是慢资源加载。怎么不动后端逻辑就能让浏览器尽早开始下载关键资源？

### 答案要点

- HTTP/1.1 早就有 100/101/102 等 1xx
- 服务端可以在最终响应前发多次"中间响应"
- 103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）
- 浏览器请求 / page → 服务器先回 103 Early Hints 附带 Link 头

#### 工程化补充

- 场景前提：回答 HTTP 103 Early Hints 是什么？怎么用来优化首屏 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 HTTP 103 Early Hints 是什么？怎么用来优化首屏 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.writeEarlyHints({
    link: [
      '</static/app.css>; rel=preload; as=style',
      '</static/main.js>; rel=preload; as=script',
      '<https://cdn.example.com>; rel=preconnect',
    ],
  });

  setTimeout(() => {
    res.send(`<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="/static/app.css">
    <script src="/static/main.js" defer></script>
  </head>
  <body><div id="app"></div></body>
</html>`);
  }, 300);
});
```

```ts
export default {
  async fetch(req: Request) {
    const earlyHints = new Response(null, {
      status: 103,
      headers: {
        Link: '</app.css>; rel=preload; as=style, </main.js>; rel=preload; as=script',
      },
    });
    return earlyHints;
  },
};
```

### 追问

- 你会先看哪些指标来判断「HTTP 103 Early Hints 是什么？怎么用来优化首屏」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「HTTP 103 Early Hints 是什么？怎么用来优化首屏」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 HTTP、性能、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vercel / Netlify 部分平台已默认替你发 103
- Next.js / Remix 都在路由级别支持自动注入 Link 头
- 可以配合 Service Worker：让 SW 命中缓存的资源跳过 103（避免重复请求）

## bfcache-frontend

title: bfcache（前进/后退缓存）你怎么用好它
followups: [bfcache-frontend-followup-1, bfcache-frontend-followup-2, bfcache-frontend-followup-3]
links: [05-browser/browser-cache-strategy, caching, 11-ai-frontend/llm-prompt-caching-and-prefix]
difficulty: 资深
tags: [浏览器, 性能, 高频]

### 一句话

讲「bfcache（前进/后退缓存）你怎么用好它」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你做的页面在 Chrome DevTools "Back/forward cache" 显示 "not eligible"。为什么？怎么修？

### 答案要点

- bfcache 是什么
- 用户点"返回"时，浏览器从内存恢复整页：JS 内存状态、DOM、滚动、定时器、scroll position
- 几毫秒恢复 → INP / LCP 飞起；某些电商场景"返回继续浏览"提升转化
- 被踢出 bfcache 的常见原因（DevTools → Application → Back/forward cache）

#### 工程化补充

- 场景前提：bfcache（前进/后退缓存）你怎么用好它 只有在瓶颈被数据证实时才值得推进；先确认 浏览器 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 bfcache（前进/后退缓存）你怎么用好它 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
window.addEventListener('pagehide', (e) => {
  if (e.persisted) {
    ws?.close();
    cancelAllTimers();
  }
});

window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    ws = new WebSocket(WS_URL);
    refreshUnreadBadge();
    sendAnalytics({ kind: 'bfcache_restore' });
  }
});

window.addEventListener('beforeunload', () => {});
```

### 追问

- 你会先看哪些指标来判断「bfcache（前进/后退缓存）你怎么用好它」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「bfcache（前进/后退缓存）你怎么用好它」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 浏览器、性能、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Safari 一直默认 bfcache；Chrome 86+ 才默认开启
- Firefox 也支持，但条件更严
- SPA 路由切换不走 bfcache；想要"返回如初"得自己做 KeepAlive（Vue `<keep-alive>` / React Suspense Cache）

## http1-vs-http2-multiplex

title: HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么
followups: [http1-vs-http2-multiplex-followup-1, http1-vs-http2-multiplex-followup-2, http1-vs-http2-multiplex-followup-3]
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频]

### 一句话

讲「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

对比 HTTP/1.1 和 HTTP/2 的核心差异；解释多路复用解决了什么问题，又带来了什么新问题。

### 答案要点

- 格式：1.1 是文本协议；2 是二进制分帧（Frame），消息按帧切并加 stream id
- 多路复用：1.1 同连接串行（pipelining 实际不可用，被代理破坏）；2 在单连接里多个 stream 并发，互不阻塞
- 头部：1.1 每次都明文重复（cookie 大头）；2 用 HPACK（静态表 + 动态表 + 哈夫曼）压缩
- 优先级：2 引入 stream priority（依赖树 + 权重），客户端可指示资源加载优先级

#### 工程化补充

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```bash
curl -I --http2 https://www.cloudflare.com 2>&1 | head -5
curl --http2 --http2-prior-knowledge -v http://localhost:8080
```

```ts
// 基于 fetch 观察 HTTP/2 表现：开发者工具 Network → Protocol 列
// 如果上游 nginx：
// listen 443 ssl http2;       # 现代 nginx 改成 listen 443 ssl + http2 on;
// http2_max_concurrent_streams 128;
```

```ts
// 协议感知（仅 Node.js Server Timing 透传后端）
const ts = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
console.log('protocol:', ts.nextHopProtocol);
```

### 常见误区

- "HTTP/2 只是更快的 HTTP/1.1"：是协议结构升级，多路复用是质变
- 在 HTTP/2 下还做域名分片：每分片要新建 TLS 握手，反而拖慢
- "多路复用 = 并行 TCP 连接"：错，是**同一连接里多 stream**，连接数不变
- 以为 HTTP/2 必须用 TLS：协议本身允许明文 h2c，但**主流浏览器不支持明文 h2**
- 把 server push 当性能银弹：实测命中率低，被 Chrome 移除；首选 **103 Early Hints + Preload/Modulepreload**

### 追问

- 为什么 HTTP/2 还要 HPACK？普通 gzip 不行吗？
  - HPACK 针对头部高重复结构设计，**抗 CRIME/BREACH 攻击**，gzip 头部用会有压力侧信道风险
- 服务器推送为什么效果不好？
  - 客户端缓存无法跨页面感知；推送命中率低（推了客户端早缓存的）；发出推送时连接已忙
- 多路复用怎么定优先级？
  - HTTP/2 priority 树（已废弃为 RFC 9218 / Extensible Priorities），现代浏览器用 `priority` 提示和 `<link fetchpriority="high">`
- HTTP/3 / QUIC 解决了什么 HTTP/2 的痛点？
  - **TCP 队头阻塞**：QUIC 在 UDP 上自实现 stream，丢包只影响一个 stream
  - **更快的握手**：0-RTT / 1-RTT 重连（带连接迁移）
  - **连接迁移**：手机 4G→WiFi 不断流（Connection ID 而非五元组）
- 大量 stream 并发会不会撑爆服务端？
  - `SETTINGS_MAX_CONCURRENT_STREAMS` 限制（通常 128/256）；超出会被 RST_STREAM
- HTTP/2 流式上传/下载的代码层面跟 1.1 有差异吗？
  - 应用层 fetch / WebSocket 几乎透明；Streams API + ReadableStream 可双向流，但浏览器对 fetch 上传 stream 支持滞后（需要 HTTP/2 + isomorphic 配置）

### 延伸

- 进阶：HTTP/2 帧类型（HEADERS / DATA / PRIORITY / RST_STREAM / SETTINGS / WINDOW_UPDATE / PUSH_PROMISE）
- 工程：用 `chrome://net-export/` 抓 NetLog，能看到 stream / frame 级别的传输；nginx 配置 `http2_max_concurrent_streams` / `http2_max_field_size` 调优
- 实战：CDN 协议升级路径 H1.1 → H2 → H3 各自的兼容回退策略

## tcp-tls-http-followup-1

title: 追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 TCP 重点排查「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的哪些边界问题
difficulty: 基础
tags: [TCP, TLS, HTTP, 追问]
parent: tcp-tls-http

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 TCP 重点排查「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 TCP 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先演练 TCP 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- TCP：有序、重传、流量控制、拥塞控制。
- TLS：证书校验、密钥协商、数据完整性。
- HTTP：请求方法、状态码、缓存、内容协商。

#### 风险与验收

- 主要风险：围绕 TCP 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 TCP 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## http1-http2-http3-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP2 重点排查「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的哪些边界问题
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC, 追问]
parent: http1-http2-http3

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP2 重点排查「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 HTTP/1.1 HTTP/2 HTTP/3 的关键差异 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先演练 HTTP/1.1 HTTP/2 HTTP/3 的关键差异 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- HTTP/1.1：HTTP/1.1 在单连接内存在应用层队头阻塞，浏览器常通过开多个连接来缓解。
- HTTP/2：HTTP/2 带来二进制分帧、多路复用、头部压缩，但仍跑在 TCP 上，丢包时仍会受传输层队头阻塞影响。
- HTTP/3：HTTP/3 基于 QUIC（运行在 UDP 之上），把连接建立、重传和多路复用放到新的传输层协议里，通常更利于降低握手时延并改善弱网体验。

#### 风险与验收

- 主要风险：若 HTTP/1.1 HTTP/2 HTTP/3 的关键差异 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：围绕 HTTP/1.1 HTTP/2 HTTP/3 的关键差异 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## http1-http2-http3-followup-2

title: 追问：你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC, 追问]
parent: http1-http2-http3

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 直答

- 结论：幂等 与 降级来保证链路可靠 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：围绕 幂等 与 降级来保证链路可靠 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- HTTP2：HTTP2 是「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- HTTP3：HTTP3 是「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- QUIC：HTTP/3 基于 QUIC（运行在 UDP 之上），把连接建立、重传和多路复用放到新的传输层协议里，通常更利于降低握手时延并改善弱网体验。

#### 风险与验收

- 主要风险：幂等 与 降级来保证链路可靠 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 幂等 与 降级来保证链路可靠 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## http1-http2-http3-followup-3

title: 追问：从工程落地角度看，如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC, 追问]
parent: http1-http2-http3

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 直答

- 结论：验证「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 HTTP/1.1 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- HTTP2：HTTP2 是「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- HTTP3：HTTP3 是「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- QUIC：HTTP/3 基于 QUIC（运行在 UDP 之上），把连接建立、重传和多路复用放到新的传输层协议里，通常更利于降低握手时延并改善弱网体验。

#### 风险与验收

- 主要风险：HTTP/1.1 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里，HTTP/1.1 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## caching-followup-1

title: 追问：以「强缓存、协商缓存、Service Worker 缓存如何协同」为例，你会先看哪些与 缓存 相关的指标来判断「强缓存、协商缓存、Service Worker 缓存如何协同」是不是当前性能瓶颈
difficulty: 基础
tags: [缓存, CDN, 追问]
parent: caching

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「强缓存、协商缓存、Service Worker 缓存如何协同」为例，你会先看哪些与 缓存 相关的指标来判断「强缓存、协商缓存、Service Worker 缓存如何协同」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 强缓存 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「强缓存、协商缓存、Service Worker 缓存如何协同」里的 强缓存 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Service Worker：Service Worker 属于应用层缓存，可覆盖浏览器默认行为。
- 缓存：Cache-Control: max-age 优先级高于 Expires。
- CDN：CDN 是「强缓存、协商缓存、Service Worker 缓存如何协同」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「强缓存、协商缓存、Service Worker 缓存如何协同」里，强缓存 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「强缓存、协商缓存、Service Worker 缓存如何协同」里，强缓存 至少要给一组指标阈值、一条日志证据和一组测试结果。

## caching-followup-2

title: 追问：要证明「强缓存、协商缓存、Service Worker 缓存如何协同」确实改善体验，你会如何围绕 缓存 设计线上观测与对照验证
difficulty: 基础
tags: [缓存, CDN, 追问]
parent: caching

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：要证明「强缓存、协商缓存、Service Worker 缓存如何协同」确实改善体验，你会如何围绕 缓存 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 强缓存 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先把「强缓存、协商缓存、Service Worker 缓存如何协同」里的 强缓存 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Service Worker：Service Worker 属于应用层缓存，可覆盖浏览器默认行为。
- 缓存：Cache-Control: max-age 优先级高于 Expires。
- CDN：CDN 是「强缓存、协商缓存、Service Worker 缓存如何协同」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「强缓存、协商缓存、Service Worker 缓存如何协同」里，强缓存 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「强缓存、协商缓存、Service Worker 缓存如何协同」里，强缓存 至少要给一组指标阈值、一条日志证据和一组测试结果。

## caching-followup-3

title: 追问：结合真实业务约束，围绕「强缓存、协商缓存、Service Worker 缓存如何协同」在 缓存 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 基础
tags: [缓存, CDN, 追问]
parent: caching

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「强缓存、协商缓存、Service Worker 缓存如何协同」在 缓存 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 结论：先量化 强缓存 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先排查 强缓存 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Service Worker：Service Worker 属于应用层缓存，可覆盖浏览器默认行为。
- 缓存：Cache-Control: max-age 优先级高于 Expires。
- CDN：CDN 是「强缓存、协商缓存、Service Worker 缓存如何协同」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 强缓存 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收看 强缓存 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## cors-cross-origin-followup-1

title: 追问：结合真实业务约束，围绕「CORS、预检请求与常见跨域方案」落地时，你会怎样定义前端可信范围与服务端强校验边界
difficulty: 进阶
tags: [跨域, CORS, 追问]
parent: cors-cross-origin

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「CORS、预检请求与常见跨域方案」落地时，你会怎样定义前端可信范围与服务端强校验边界？

### 答案要点

#### 直答

- 结论：先梳理 CORS 预检请求与常见跨域方案 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「CORS、预检请求与常见跨域方案」里的 CORS 预检请求与常见跨域方案 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- CORS：CORS 是「CORS、预检请求与常见跨域方案」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 跨域：在「CORS、预检请求与常见跨域方案」这题里，跨域 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：CORS 预检请求与常见跨域方案 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「CORS、预检请求与常见跨域方案」里 CORS 预检请求与常见跨域方案 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## cors-cross-origin-followup-2

title: 追问：围绕「CORS、预检请求与常见跨域方案」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [跨域, CORS, 追问]
parent: cors-cross-origin

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「CORS、预检请求与常见跨域方案」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 直答

- 结论：把 CORS 预检请求与常见跨域方案 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「CORS、预检请求与常见跨域方案」里的 CORS 预检请求与常见跨域方案 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- CORS：CORS 是「CORS、预检请求与常见跨域方案」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 跨域：围绕「CORS、预检请求与常见跨域方案」里的 跨域 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「CORS、预检请求与常见跨域方案」里，CORS 预检请求与常见跨域方案 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「CORS、预检请求与常见跨域方案」里，CORS 预检请求与常见跨域方案 至少要给一组指标阈值、一条日志证据和一组测试结果。

## cors-cross-origin-followup-3

title: 追问：结合真实业务约束，你会怎样给「CORS、预检请求与常见跨域方案」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 进阶
tags: [跨域, CORS, 追问]
parent: cors-cross-origin

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会怎样给「CORS、预检请求与常见跨域方案」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 直答

- 结论：先列出 CORS 预检请求与常见跨域方案 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：围绕 CORS 预检请求与常见跨域方案 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- CORS：CORS 是「CORS、预检请求与常见跨域方案」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 跨域：在「CORS、预检请求与常见跨域方案」里，跨域 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 CORS 预检请求与常见跨域方案 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 CORS 预检请求与常见跨域方案 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## websocket-sse-followup-1

title: 追问：在弱网、代理、断连或服务端限流场景下，你会围绕 实时通信 重点排查「WebSocket、SSE、轮询怎么选」的哪些边界问题
difficulty: 进阶
tags: [实时通信, SSE, 追问]
parent: websocket-sse

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在弱网、代理、断连或服务端限流场景下，你会围绕 实时通信 重点排查「WebSocket、SSE、轮询怎么选」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 WebSocket 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：围绕 WebSocket 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- WebSocket：双向实时、交互频繁。
- SSE：通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource。
- 实时通信：围绕「WebSocket、SSE、轮询怎么选」里的 实时通信 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 WebSocket 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource。

## upload-download-followup-1

title: 追问：结合真实业务约束，真要把「大文件上传、断点续传、Range 下载的前端设计」推到线上，你会如何围绕 上传 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [上传, Range, 追问]
parent: upload-download

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「大文件上传、断点续传、Range 下载的前端设计」推到线上，你会如何围绕 上传 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「大文件上传、断点续传、Range 下载的前端设计」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：大文件上传 断点续传 Range 下载的前端设计 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- Range：下载续传依赖 Range / 206 Partial Content。
- 上传：仅上传缺失分片，服务端最终合并。

#### 风险与验收

- 主要风险：大文件上传 断点续传 Range 下载的前端设计 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 大文件上传 断点续传 Range 下载的前端设计 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## dns-cdn-followup-1

title: 追问：以「DNS、CDN 与接入层优化的前端视角」为例，在弱网、代理、断连或服务端限流场景下，你会围绕 DNS 重点排查「DNS、CDN 与接入层优化的前端视角」的哪些边界问题
difficulty: 进阶
tags: [DNS, CDN, 追问]
parent: dns-cdn

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「DNS、CDN 与接入层优化的前端视角」为例，在弱网、代理、断连或服务端限流场景下，你会围绕 DNS 重点排查「DNS、CDN 与接入层优化的前端视角」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 DNS CDN 与接入层优化的前端视角 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先演练 DNS CDN 与接入层优化的前端视角 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- DNS：DNS 是「DNS、CDN 与接入层优化的前端视角」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CDN：CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力。

#### 风险与验收

- 主要风险：围绕 DNS CDN 与接入层优化的前端视角 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 DNS CDN 与接入层优化的前端视角 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## webrtc-basic-followup-1

title: 追问：当「WebRTC 基础：为什么 P2P 仍然需要服务器」进入复杂场景后，你会先验证哪些 WebRTC 前置条件，避免方案踩坑
difficulty: 资深
tags: [WebRTC, P2P, 追问]
parent: webrtc-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「WebRTC 基础：为什么 P2P 仍然需要服务器」进入复杂场景后，你会先验证哪些 WebRTC 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 结论：把 WebRTC 基础 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 WebRTC 基础 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- WebRTC：WebRTC 是「WebRTC 基础：为什么 P2P 仍然需要服务器」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- P2P：P2P 是「WebRTC 基础：为什么 P2P 仍然需要服务器」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 WebRTC 基础 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：WebRTC 基础 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## quic-http3-deep-followup-1

title: 追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/3 重点排查「HTTP/3 / QUIC 在前端工程中的可见影响」的哪些边界问题
difficulty: 资深
tags: [HTTP/3, QUIC, 追问]
parent: quic-http3-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/3 重点排查「HTTP/3 / QUIC 在前端工程中的可见影响」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 HTTP/3 / QUIC 在前端工程中的可见影响 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：连接迁移：网络切换（WiFi → 4G）连接不丢。

#### 术语解释

- HTTP/3：HTTP/3 是「HTTP/3 / QUIC 在前端工程中的可见影响」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- QUIC：QUIC 是「HTTP/3 / QUIC 在前端工程中的可见影响」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：HTTP/3 / QUIC 在前端工程中的可见影响 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 HTTP/3 / QUIC 在前端工程中的可见影响 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## https-handshake-followup-1

title: 追问：你会怎样把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的前端防护与服务端兜底串成完整安全闭环
difficulty: 进阶
tags: [TLS, 安全, 追问]
parent: https-handshake

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的前端防护与服务端兜底串成完整安全闭环？

### 答案要点

#### 直答

- 结论：回答 HTTPS 握手过程 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 HTTPS 握手过程 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- HTTPS：HTTPS 是「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TLS：1-RTT 握手；客户端 Hello 同时携带 KeyShare，服务端 Hello + Cert 一次返回；后续应用数据。
- vs：在「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里，vs 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：TLS 1.3 还支持 0-RTT（PSK / Session Ticket），但有重放风险。
- 验收信号：验收看 HTTPS 握手过程 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## websocket-vs-sse-vs-polling-followup-1

title: 追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 实时 重点排查「长轮询 / WebSocket / SSE 怎么选」的哪些边界问题
difficulty: 进阶
tags: [实时, 推送, 追问]
parent: websocket-vs-sse-vs-polling

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 实时 重点排查「长轮询 / WebSocket / SSE 怎么选」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 长轮询 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先演练 长轮询 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- WebSocket：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻。
- SSE：SSE（Server-Sent Events）：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制。
- 实时：在「长轮询 / WebSocket / SSE 怎么选」里，实时 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 长轮询 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 长轮询 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## cors-and-preflight-followup-1

title: 追问：在「跨域与 CORS 预检，谁触发了 OPTIONS」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 进阶
tags: [CORS, 安全, 追问]
parent: cors-and-preflight

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「跨域与 CORS 预检，谁触发了 OPTIONS」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 直答

- 结论：上线 跨域与 CORS 预检 谁触发了 OPTIONS 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先演练 跨域与 CORS 预检 谁触发了 OPTIONS 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- CORS：CORS 是「跨域与 CORS 预检，谁触发了 OPTIONS」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- OPTIONS：自定义头、PUT/DELETE/PATCH、application/json。
- 安全：在「跨域与 CORS 预检，谁触发了 OPTIONS」里，安全 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：跨域与 CORS 预检 谁触发了 OPTIONS 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：跨域与 CORS 预检 谁触发了 OPTIONS 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## status-codes-followup-1

title: 追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP 重点排查「HTTP 常见状态码及其含义」的哪些边界问题
difficulty: 基础
tags: [HTTP, 高频, 追问]
parent: status-codes

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP 重点排查「HTTP 常见状态码及其含义」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 HTTP 常见状态码及其含义 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先演练 HTTP 常见状态码及其含义 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- HTTP：HTTP 是「HTTP 常见状态码及其含义」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 HTTP 常见状态码及其含义 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：HTTP 常见状态码及其含义 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## early-hints-103-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 HTTP 相关的指标来判断「HTTP 103 Early Hints 是什么？怎么用来优化首屏」是不是当前性能瓶颈
difficulty: 资深
tags: [HTTP, 性能, 高频, 追问]
parent: early-hints-103

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 HTTP 相关的指标来判断「HTTP 103 Early Hints 是什么？怎么用来优化首屏」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 HTTP 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 HTTP 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- HTTP：HTTP/1.1 早就有 100/101/102 等 1xx。
- Early Hints：103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）。
- 性能：103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）。

#### 风险与验收

- 主要风险：若 HTTP 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：HTTP 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## bfcache-frontend-followup-1

title: 追问：你会先看哪些与 浏览器 相关的指标来判断「bfcache（前进/后退缓存）你怎么用好它」是不是当前性能瓶颈
difficulty: 资深
tags: [浏览器, 性能, 高频, 追问]
parent: bfcache-frontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会先看哪些与 浏览器 相关的指标来判断「bfcache（前进/后退缓存）你怎么用好它」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证 bfcache（前进 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 bfcache（前进 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- bfcache：bfcache 是什么。
- 浏览器：用户点"返回"时，浏览器从内存恢复整页：JS 内存状态、DOM、滚动、定时器、scroll position。
- 性能：在「bfcache（前进/后退缓存）你怎么用好它」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「bfcache（前进/后退缓存）你怎么用好它」里，bfcache（前进 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：bfcache（前进 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## http1-vs-http2-multiplex-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/2 重点排查「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的哪些边界问题
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频, 追问]
parent: http1-vs-http2-multiplex

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/2 重点排查「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的哪些边界问题？

### 答案要点

#### 直答

- 结论：先排查 HTTP 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先识别 HTTP 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- HTTP/1.1：HTTP/1.1 是「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- HTTP/2：HTTP/2 是「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 多路复用：1.1 同连接串行（pipelining 实际不可用，被代理破坏）；2 在单连接里多个 stream 并发，互不阻塞。

#### 风险与验收

- 主要风险：若 HTTP 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：围绕 HTTP 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## http1-vs-http2-multiplex-followup-2

title: 追问：从工程落地角度看，你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频, 追问]
parent: http1-vs-http2-multiplex

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 直答

- 结论：幂等 与 降级来保证链路可靠 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：围绕 幂等 与 降级来保证链路可靠 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- HTTP/2：HTTP/2 是「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 多路复用：1.1 同连接串行（pipelining 实际不可用，被代理破坏）；2 在单连接里多个 stream 并发，互不阻塞。

#### 风险与验收

- 主要风险：若 幂等 与 降级来保证链路可靠 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：围绕 幂等 与 降级来保证链路可靠 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## http1-vs-http2-multiplex-followup-3

title: 追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频, 追问]
parent: http1-vs-http2-multiplex

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 直答

- 结论：验证「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 HTTP/1.1 与 HTTP/2 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- HTTP/2：HTTP/2 是「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 多路复用：1.1 同连接串行（pipelining 实际不可用，被代理破坏）；2 在单连接里多个 stream 并发，互不阻塞。

#### 风险与验收

- 主要风险：若 HTTP/1.1 与 HTTP/2 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：HTTP/1.1 与 HTTP/2 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## request-race-cancel-dedupe

title: 前端请求竞态、取消、去重与幂等怎么处理
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理]
links: [caching, upload-download, 16-observability/reporting-channel]
followups: [request-race-cancel-dedupe-followup-1, request-race-cancel-dedupe-followup-2, request-race-cancel-dedupe-followup-3]

### 一句话

这题回答要覆盖 并发 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

搜索联想、Tab 切换、表单重复提交和弱网重试里，前端为什么会出现请求竞态？你会如何设计取消、去重、幂等和状态回滚？

### 答案要点

- 竞态的本质是“响应返回顺序不等于用户最新意图”：旧搜索请求可能晚于新请求返回，旧 Tab 数据可能覆盖当前 Tab。
- 取消分两层：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 去重适合相同资源读取：同 URL、同参数、同身份的 GET 可以共享 pending promise；写操作不要盲目去重，要按业务幂等键判断。
- UI 状态要按 requestId 或 version 更新：只有当前请求能写入结果、错误和 loading；旧请求返回只能丢弃或写入缓存。

#### 工程化补充

- 场景前提：先约定 并发 的超时、重试和幂等语义，再谈 前端请求竞态、取消、去重与幂等怎么处理 的实现细节。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```ts
let activeSearchId = 0;
let activeController: AbortController | null = null;

async function search(keyword: string) {
  const requestId = ++activeSearchId;
  activeController?.abort();
  activeController = new AbortController();

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
      signal: activeController.signal,
    });
    const data = await res.json();
    if (requestId !== activeSearchId) return; // 旧请求晚到，不能覆盖新结果
    renderSearchResult(data);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (requestId === activeSearchId) showError('搜索失败，请稍后重试');
  }
}

async function submitOrder(payload: OrderDraft, idempotencyKey: string) {
  return fetch('/api/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

async function submitOrderWithRetry(payload: OrderDraft, idempotencyKey: string) {
  try {
    return await submitOrder(payload, idempotencyKey);
  } catch {
    return submitOrder(payload, idempotencyKey);
  }
}

async function onClickSubmit(payload: OrderDraft) {
  // key 属于“这一次用户提交意图”，不是某一次 HTTP 调用；超时重试必须复用它。
  const idempotencyKey = crypto.randomUUID();
  return submitOrderWithRetry(payload, idempotencyKey);
}
```

### 常见误区

- 以为 `abort()` 就能撤销服务端副作用；它只能让浏览器停止等待，服务端可能已经处理。
- 只靠按钮 disabled 防重复提交，刷新、双端登录、重试代理仍可能制造重复请求。
- 所有失败都自动重试，导致写接口重复执行、限流更严重或错误被放大。
- loading 是全局布尔值，多个请求并发时互相覆盖，最终状态不可信。

### 追问

- GET 请求去重和 POST 请求幂等有什么本质差别？
- 慢请求晚于新请求返回时，你会选择丢弃、缓存还是合并？
- 如果用户离开页面后请求成功了，前端和服务端分别应该怎么处理？

### 延伸

- TanStack Query / SWR 的 request dedupe、staleTime、mutation retry 本质上也是在封装这些规则。
- 对支付、下单、发消息这类写操作，幂等必须由服务端最终保证，前端只能降低误触概率。

## tcp-tls-http-followup-2

title: 追问：以「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」为例，如果「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」遇到外部依赖抖动，你会先收紧哪几个可靠性开关
difficulty: 基础
tags: [TCP, TLS, HTTP, 追问]
parent: tcp-tls-http
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」为例，如果「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」遇到外部依赖抖动，你会先收紧哪几个可靠性开关？

### 答案要点

#### 直答

- 结论：先收紧 TCP 的超时阈值、重试上限、熔断开关和降级开关，再观察错误率与恢复时长。
- 关键动作：先演练 TCP 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- TCP：有序、重传、流量控制、拥塞控制。
- TLS：证书校验、密钥协商、数据完整性。
- HTTP：请求方法、状态码、缓存、内容协商。

#### 风险与验收

- 主要风险：围绕 TCP 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 TCP 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## tcp-tls-http-followup-3

title: 追问：在「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」场景下，当你要验证「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标
difficulty: 基础
tags: [TCP, TLS, HTTP, 追问]
parent: tcp-tls-http
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」场景下，当你要验证「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标？

### 答案要点

#### 直答

- 结论：先约定「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 TCP 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- TCP：有序、重传、流量控制、拥塞控制。
- TLS：证书校验、密钥协商、数据完整性。
- HTTP：请求方法、状态码、缓存、内容协商。

#### 风险与验收

- 主要风险：TCP 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」里，TCP 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## websocket-sse-followup-2

title: 追问：从工程落地角度看，在「WebSocket、SSE、轮询怎么选」里你会怎样划分可重试与不可重试场景，防止误重试放大故障
difficulty: 进阶
tags: [实时通信, SSE, 追问]
parent: websocket-sse
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，在「WebSocket、SSE、轮询怎么选」里你会怎样划分可重试与不可重试场景，防止误重试放大故障？

### 答案要点

#### 直答

- 结论：WebSocket 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：围绕 WebSocket 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- WebSocket：双向实时、交互频繁。
- SSE：通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource。
- 实时通信：在「WebSocket、SSE、轮询怎么选」里，实时通信 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：WebSocket 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource。

## websocket-sse-followup-3

title: 追问：结合真实业务约束，你会如何把「WebSocket、SSE、轮询怎么选」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定
difficulty: 进阶
tags: [实时通信, SSE, 追问]
parent: websocket-sse
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何把「WebSocket、SSE、轮询怎么选」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？

### 答案要点

#### 直答

- 结论：验证 WebSocket 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 WebSocket 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- WebSocket：双向实时、交互频繁。
- SSE：通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource。
- 实时通信：在「WebSocket、SSE、轮询怎么选」里，实时通信 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：WebSocket 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource。

## upload-download-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 上传 定义「大文件上传、断点续传、Range 下载的前端设计」的先后改造顺序
difficulty: 进阶
tags: [上传, Range, 追问]
parent: upload-download
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 上传 定义「大文件上传、断点续传、Range 下载的前端设计」的先后改造顺序？

### 答案要点

#### 直答

- 结论：先锁定 大文件上传 断点续传 Range 下载的前端设计 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 大文件上传 断点续传 Range 下载的前端设计 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Range：下载续传依赖 Range / 206 Partial Content。
- 上传：仅上传缺失分片，服务端最终合并。

#### 风险与验收

- 主要风险：大文件上传 断点续传 Range 下载的前端设计 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「大文件上传、断点续传、Range 下载的前端设计」里，大文件上传 断点续传 Range 下载的前端设计 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## upload-download-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「大文件上传、断点续传、Range 下载的前端设计」还值不值得继续维护
difficulty: 进阶
tags: [上传, Range, 追问]
parent: upload-download
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「大文件上传、断点续传、Range 下载的前端设计」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：先画出 大文件上传 断点续传 Range 下载的前端设计 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 大文件上传 断点续传 Range 下载的前端设计 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Range：下载续传依赖 Range / 206 Partial Content。
- 上传：仅上传缺失分片，服务端最终合并。

#### 风险与验收

- 主要风险：大文件上传 断点续传 Range 下载的前端设计 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「大文件上传、断点续传、Range 下载的前端设计」里，大文件上传 断点续传 Range 下载的前端设计 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## dns-cdn-followup-2

title: 追问：在当前团队与业务约束下，围绕「DNS、CDN 与接入层优化的前端视角」这条链路，你会怎么定超时、重试、幂等和降级策略
difficulty: 进阶
tags: [DNS, CDN, 追问]
parent: dns-cdn
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「DNS、CDN 与接入层优化的前端视角」这条链路，你会怎么定超时、重试、幂等和降级策略？

### 答案要点

#### 直答

- 结论：DNS CDN 与接入层优化的前端视角 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：围绕 DNS CDN 与接入层优化的前端视角 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- DNS：DNS 是「DNS、CDN 与接入层优化的前端视角」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CDN：CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力。

#### 风险与验收

- 主要风险：DNS CDN 与接入层优化的前端视角 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 DNS CDN 与接入层优化的前端视角 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## dns-cdn-followup-3

title: 追问：结合真实业务约束，围绕「DNS、CDN 与接入层优化的前端视角」上线后的稳定性，你会先盯哪几组信号判断风险在收敛还是在扩散
difficulty: 进阶
tags: [DNS, CDN, 追问]
parent: dns-cdn
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「DNS、CDN 与接入层优化的前端视角」上线后的稳定性，你会先盯哪几组信号判断风险在收敛还是在扩散？

### 答案要点

#### 直答

- 结论：先定义 DNS CDN 与接入层优化的前端视角 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先定义 DNS CDN 与接入层优化的前端视角 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- DNS：DNS 是「DNS、CDN 与接入层优化的前端视角」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CDN：CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力。

#### 风险与验收

- 主要风险：DNS CDN 与接入层优化的前端视角 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「DNS、CDN 与接入层优化的前端视角」里，DNS CDN 与接入层优化的前端视角 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## quic-http3-deep-followup-2

title: 追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，围绕「HTTP/3 / QUIC 在前端工程中的可见影响」这条链路，你会怎么定超时、重试、幂等和降级策略
difficulty: 资深
tags: [HTTP/3, QUIC, 追问]
parent: quic-http3-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，围绕「HTTP/3 / QUIC 在前端工程中的可见影响」这条链路，你会怎么定超时、重试、幂等和降级策略？

### 答案要点

#### 直答

- 结论：HTTP/3 / QUIC 在前端工程中的可见影响 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：连接迁移：网络切换（WiFi → 4G）连接不丢。

#### 术语解释

- HTTP/3：HTTP/3 是「HTTP/3 / QUIC 在前端工程中的可见影响」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- QUIC：QUIC 是「HTTP/3 / QUIC 在前端工程中的可见影响」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 HTTP/3 / QUIC 在前端工程中的可见影响 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 HTTP/3 / QUIC 在前端工程中的可见影响 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## quic-http3-deep-followup-3

title: 追问：以「HTTP/3 / QUIC 在前端工程中的可见影响」为例，你会如何把「HTTP/3 / QUIC 在前端工程中的可见影响」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定
difficulty: 资深
tags: [HTTP/3, QUIC, 追问]
parent: quic-http3-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「HTTP/3 / QUIC 在前端工程中的可见影响」为例，你会如何把「HTTP/3 / QUIC 在前端工程中的可见影响」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？

### 答案要点

#### 直答

- 结论：把 HTTP/3 / QUIC 在前端工程中的可见影响 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：连接迁移：网络切换（WiFi → 4G）连接不丢。

#### 术语解释

- HTTP/3：HTTP/3 是「HTTP/3 / QUIC 在前端工程中的可见影响」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- QUIC：QUIC 是「HTTP/3 / QUIC 在前端工程中的可见影响」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：HTTP/3 / QUIC 在前端工程中的可见影响 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「HTTP/3 / QUIC 在前端工程中的可见影响」里，HTTP/3 / QUIC 在前端工程中的可见影响 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## https-handshake-followup-2

title: 追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，你会怎样验证「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 进阶
tags: [TLS, 安全, 追问]
parent: https-handshake
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，你会怎样验证「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 直答

- 结论：回答 HTTPS 握手过程 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 HTTPS 握手过程 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- HTTPS：HTTPS 是「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TLS：1-RTT 握手；客户端 Hello 同时携带 KeyShare，服务端 Hello + Cert 一次返回；后续应用数据。
- vs：围绕「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里的 vs 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：TLS 1.3 还支持 0-RTT（PSK / Session Ticket），但有重放风险。
- 验收信号：HTTPS 握手过程 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## https-handshake-followup-3

title: 追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，如果「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」必须在安全和体验之间做权衡，你会先守住哪些底线
difficulty: 进阶
tags: [TLS, 安全, 追问]
parent: https-handshake
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，如果「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」必须在安全和体验之间做权衡，你会先守住哪些底线？

### 答案要点

#### 直答

- 结论：回答 HTTPS 握手过程 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先排查 HTTPS 握手过程 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- HTTPS：HTTPS 是「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TLS：1-RTT 握手；客户端 Hello 同时携带 KeyShare，服务端 Hello + Cert 一次返回；后续应用数据。
- vs：在「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里，vs 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：TLS 1.3 还支持 0-RTT（PSK / Session Ticket），但有重放风险。
- 验收信号：验收看 HTTPS 握手过程 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## websocket-vs-sse-vs-polling-followup-2

title: 追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，你会如何给「长轮询 / WebSocket / SSE 怎么选」设计“失败可恢复、重复不出错、超时可止损”的机制
difficulty: 进阶
tags: [实时, 推送, 追问]
parent: websocket-vs-sse-vs-polling
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，你会如何给「长轮询 / WebSocket / SSE 怎么选」设计“失败可恢复、重复不出错、超时可止损”的机制？

### 答案要点

#### 直答

- 结论：先列出 长轮询 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：围绕 长轮询 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- WebSocket：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻。
- SSE：SSE（Server-Sent Events）：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制。
- 实时：围绕「长轮询 / WebSocket / SSE 怎么选」里的 实时 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：长轮询 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：长轮询 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## websocket-vs-sse-vs-polling-followup-3

title: 追问：为了复盘「长轮询 / WebSocket / SSE 怎么选」上线质量，你会如何组织日志、指标和告警证据链
difficulty: 进阶
tags: [实时, 推送, 追问]
parent: websocket-vs-sse-vs-polling
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了复盘「长轮询 / WebSocket / SSE 怎么选」上线质量，你会如何组织日志、指标和告警证据链？

### 答案要点

#### 直答

- 结论：验证「长轮询 / WebSocket / SSE 怎么选」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「长轮询 / WebSocket / SSE 怎么选」里的 长轮询 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- WebSocket：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻。
- SSE：SSE（Server-Sent Events）：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制。
- 实时：在「长轮询 / WebSocket / SSE 怎么选」里，实时 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「长轮询 / WebSocket / SSE 怎么选」里，长轮询 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「长轮询 / WebSocket / SSE 怎么选」里，长轮询 至少要给一组指标阈值、一条日志证据和一组测试结果。

## cors-and-preflight-followup-2

title: 追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，围绕「跨域与 CORS 预检，谁触发了 OPTIONS」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [CORS, 安全, 追问]
parent: cors-and-preflight
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，围绕「跨域与 CORS 预检，谁触发了 OPTIONS」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 直答

- 结论：先定义 跨域与 CORS 预检 谁触发了 OPTIONS 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「跨域与 CORS 预检，谁触发了 OPTIONS」里的 跨域与 CORS 预检 谁触发了 OPTIONS 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- CORS：CORS 是「跨域与 CORS 预检，谁触发了 OPTIONS」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- OPTIONS：自定义头、PUT/DELETE/PATCH、application/json。
- 安全：在「跨域与 CORS 预检，谁触发了 OPTIONS」里，安全 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「跨域与 CORS 预检，谁触发了 OPTIONS」里，跨域与 CORS 预检 谁触发了 OPTIONS 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「跨域与 CORS 预检，谁触发了 OPTIONS」里，跨域与 CORS 预检 谁触发了 OPTIONS 至少要给一组指标阈值、一条日志证据和一组测试结果。

## cors-and-preflight-followup-3

title: 追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，你会如何把「跨域与 CORS 预检，谁触发了 OPTIONS」的取舍逻辑转成可执行的发布策略和监控标准
difficulty: 进阶
tags: [CORS, 安全, 追问]
parent: cors-and-preflight
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，你会如何把「跨域与 CORS 预检，谁触发了 OPTIONS」的取舍逻辑转成可执行的发布策略和监控标准？

### 答案要点

#### 直答

- 结论：先量化 跨域与 CORS 预检 谁触发了 OPTIONS 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先定义 跨域与 CORS 预检 谁触发了 OPTIONS 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- CORS：CORS 是「跨域与 CORS 预检，谁触发了 OPTIONS」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- OPTIONS：自定义头、PUT/DELETE/PATCH、application/json。
- 安全：围绕「跨域与 CORS 预检，谁触发了 OPTIONS」里的 安全 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：跨域与 CORS 预检 谁触发了 OPTIONS 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「跨域与 CORS 预检，谁触发了 OPTIONS」里，跨域与 CORS 预检 谁触发了 OPTIONS 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## status-codes-followup-2

title: 追问：在「HTTP 常见状态码及其含义」场景下，围绕「HTTP 常见状态码及其含义」这条链路，你会怎么定超时、重试、幂等和降级策略
difficulty: 基础
tags: [HTTP, 高频, 追问]
parent: status-codes
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「HTTP 常见状态码及其含义」场景下，围绕「HTTP 常见状态码及其含义」这条链路，你会怎么定超时、重试、幂等和降级策略？

### 答案要点

#### 直答

- 结论：HTTP 常见状态码及其含义 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：先演练 HTTP 常见状态码及其含义 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- HTTP：HTTP 是「HTTP 常见状态码及其含义」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：HTTP 常见状态码及其含义 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：HTTP 常见状态码及其含义 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## status-codes-followup-3

title: 追问：以「HTTP 常见状态码及其含义」为例，为了复盘「HTTP 常见状态码及其含义」上线质量，你会如何组织日志、指标和告警证据链
difficulty: 基础
tags: [HTTP, 高频, 追问]
parent: status-codes
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「HTTP 常见状态码及其含义」为例，为了复盘「HTTP 常见状态码及其含义」上线质量，你会如何组织日志、指标和告警证据链？

### 答案要点

#### 直答

- 结论：验证「HTTP 常见状态码及其含义」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「HTTP 常见状态码及其含义」里的 HTTP 常见状态码及其含义 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- HTTP：HTTP 是「HTTP 常见状态码及其含义」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「HTTP 常见状态码及其含义」里，HTTP 常见状态码及其含义 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「HTTP 常见状态码及其含义」里，HTTP 常见状态码及其含义 至少要给一组指标阈值、一条日志证据和一组测试结果。

## early-hints-103-followup-2

title: 追问：要证明「HTTP 103 Early Hints 是什么？怎么用来优化首屏」确实改善体验，你会如何围绕 HTTP 设计线上观测与对照验证
difficulty: 资深
tags: [HTTP, 性能, 高频, 追问]
parent: early-hints-103
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：要证明「HTTP 103 Early Hints 是什么？怎么用来优化首屏」确实改善体验，你会如何围绕 HTTP 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 设计线上观测 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先定义 设计线上观测 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- HTTP：HTTP/1.1 早就有 100/101/102 等 1xx。
- Early Hints：103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）。
- 性能：103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）。

#### 风险与验收

- 主要风险：设计线上观测 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「HTTP 103 Early Hints 是什么？怎么用来优化首屏」里，设计线上观测 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## early-hints-103-followup-3

title: 追问：如果「HTTP 103 Early Hints 是什么？怎么用来优化首屏」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 资深
tags: [HTTP, 性能, 高频, 追问]
parent: early-hints-103
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果「HTTP 103 Early Hints 是什么？怎么用来优化首屏」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 直答

- 结论：把 HTTP 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 HTTP 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- HTTP：HTTP/1.1 早就有 100/101/102 等 1xx。
- Early Hints：103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）。
- 性能：103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）。

#### 风险与验收

- 主要风险：在「HTTP 103 Early Hints 是什么？怎么用来优化首屏」里，HTTP 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：HTTP 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## bfcache-frontend-followup-2

title: 追问：你会怎样验证「bfcache（前进/后退缓存）你怎么用好它」在 浏览器 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [浏览器, 性能, 高频, 追问]
parent: bfcache-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样验证「bfcache（前进/后退缓存）你怎么用好它」在 浏览器 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 bfcache（前进 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先把「bfcache（前进/后退缓存）你怎么用好它」里的 bfcache（前进 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- bfcache：bfcache 是什么。
- 浏览器：用户点"返回"时，浏览器从内存恢复整页：JS 内存状态、DOM、滚动、定时器、scroll position。
- 性能：围绕「bfcache（前进/后退缓存）你怎么用好它」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「bfcache（前进/后退缓存）你怎么用好它」里，bfcache（前进 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「bfcache（前进/后退缓存）你怎么用好它」里，bfcache（前进 至少要给一组指标阈值、一条日志证据和一组测试结果。

## bfcache-frontend-followup-3

title: 追问：如果「bfcache你怎么用好它」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 资深
tags: [浏览器, 性能, 高频, 追问]
parent: bfcache-frontend
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果「bfcache你怎么用好它」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 直答

- 结论：把 前进 与 后退缓存 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 前进 与 后退缓存 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- bfcache：bfcache 是什么。
- 浏览器：用户点"返回"时，浏览器从内存恢复整页：JS 内存状态、DOM、滚动、定时器、scroll position。
- 性能：围绕「bfcache（前进/后退缓存）你怎么用好它」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「bfcache（前进/后退缓存）你怎么用好它」里，前进 与 后退缓存 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：前进 与 后退缓存 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## request-race-cancel-dedupe-followup-1

title: 追问：以「前端请求竞态、取消、去重与幂等怎么处理」为例，GET 请求去重和 POST 请求幂等有什么本质差别
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理, 追问]
parent: request-race-cancel-dedupe
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端请求竞态、取消、去重与幂等怎么处理」为例，GET 请求去重和 POST 请求幂等有什么本质差别？

### 答案要点

#### 直答

- 结论：回答 前端请求竞态 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 前端请求竞态 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- AbortController：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 并发：并发 决定「前端请求竞态、取消、去重与幂等怎么处理」为什么会这样，回答时要把原因和失效前提讲清楚。
- 幂等：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。

#### 风险与验收

- 主要风险：围绕 前端请求竞态 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收标准是 前端请求竞态 因果链可复现：输入触发、机制命中、修复后指标回稳。

## request-race-cancel-dedupe-followup-2

title: 追问：从工程落地角度看，慢请求晚于新请求返回时，你会选择丢弃、缓存还是合并
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理, 追问]
parent: request-race-cancel-dedupe
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，慢请求晚于新请求返回时，你会选择丢弃、缓存还是合并？

### 答案要点

#### 直答

- 结论：先锁定 去重 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 去重 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- AbortController：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 并发：在「前端请求竞态、取消、去重与幂等怎么处理」这题里，并发 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 幂等：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。

#### 风险与验收

- 主要风险：去重 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「前端请求竞态、取消、去重与幂等怎么处理」里，去重 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## request-race-cancel-dedupe-followup-3

title: 追问：在「前端请求竞态、取消、去重与幂等怎么处理」场景下，如果用户离开页面后请求成功了，前端和服务端分别应该怎么处理
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理, 追问]
parent: request-race-cancel-dedupe
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前端请求竞态、取消、去重与幂等怎么处理」场景下，如果用户离开页面后请求成功了，前端和服务端分别应该怎么处理？

### 答案要点

#### 直答

- 结论：先拆分 前端请求竞态 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 前端请求竞态 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- AbortController：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 并发：在「前端请求竞态、取消、去重与幂等怎么处理」这题里，并发 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 幂等：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。

#### 风险与验收

- 主要风险：前端请求竞态 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 前端请求竞态 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## webrtc-basic-followup-2

title: 追问：从工程落地角度看，你会如何围绕 WebRTC 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [WebRTC, P2P, 追问]
parent: webrtc-basic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 WebRTC 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：验证「WebRTC 基础：为什么 P2P 仍然需要服务器」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 WebRTC 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- WebRTC：WebRTC 是「WebRTC 基础：为什么 P2P 仍然需要服务器」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- P2P：P2P 是「WebRTC 基础：为什么 P2P 仍然需要服务器」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：WebRTC 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「WebRTC 基础：为什么 P2P 仍然需要服务器」里，WebRTC 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## webrtc-basic-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 WebRTC 调整「WebRTC 基础：为什么 P2P 仍然需要服务器」的推进顺序
difficulty: 资深
tags: [WebRTC, P2P, 追问]
parent: webrtc-basic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 WebRTC 调整「WebRTC 基础：为什么 P2P 仍然需要服务器」的推进顺序？

### 答案要点

#### 直答

- 结论：先冻结「WebRTC 基础：为什么 P2P 仍然需要服务器」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。
- 关键动作：先梳理 WebRTC 基础 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- WebRTC：WebRTC 是「WebRTC 基础：为什么 P2P 仍然需要服务器」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- P2P：P2P 是「WebRTC 基础：为什么 P2P 仍然需要服务器」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「WebRTC 基础：为什么 P2P 仍然需要服务器」里，WebRTC 基础 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：WebRTC 基础 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## timeout-retry-budget

title: 超时预算、重试策略与重试风暴治理
difficulty: 资深
tags: [超时, 重试, 稳定性]
followups: [timeout-retry-budget-followup-1, timeout-retry-budget-followup-2, timeout-retry-budget-followup-3]

### 一句话

回答「超时预算、重试策略与重试风暴治理」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

一个前端请求经由 CDN、网关、BFF、下游服务，偶发超时且峰值时会出现重试风暴。你会如何设计超时预算与重试策略，兼顾成功率和系统稳定性？

### 答案要点

- 先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 超时要分类型：连接超时、读超时、总超时分别治理；只配一个全局 timeout 往往无法定位瓶颈。
- 重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 写操作必须配幂等键；没有幂等语义就重试，极易导致重复扣费、重复写入、状态污染。

#### 工程化补充

- 场景前提：先约定 超时 的超时、重试和幂等语义，再谈 超时预算、重试策略与重试风暴治理 的实现细节。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```ts
// 前端/网关侧 deadline 透传示意
function withDeadlineHeaders(init: RequestInit = {}, deadlineMs = 800): RequestInit {
  const now = Date.now();
  const headers = new Headers(init.headers || {});
  headers.set('x-deadline-at', String(now + deadlineMs));
  return { ...init, headers };
}

async function fetchWithRetry(url: string, retries = 1) {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 350);
    try {
      const resp = await fetch(url, withDeadlineHeaders({ signal: ctrl.signal }));
      clearTimeout(t);
      if (resp.status >= 500 || resp.status === 429) throw new Error(`retryable:${resp.status}`);
      return resp;
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (i === retries) break;
      const backoff = 80 * 2 ** i + Math.floor(Math.random() * 60);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}
```

### 追问

- 「超时预算、重试策略与重试风暴治理」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 每层都自行超时和重试，没有统一 deadline，最终链路时延不可控。
- 把“重试成功率提升”当成唯一目标，忽略下游成本和全链路抖动。
- 没有幂等约束就重试写请求，导致业务侧出现重复副作用。

### 延伸

- 建议在观测平台按“首发请求”和“重试请求”拆分看板，否则很容易误判优化效果。
- 弱网场景可配合请求分级（核心接口优先预算）提升用户可感知稳定性。

## cdn-cache-invalidation

title: CDN 缓存失效：Purge、版本化与一致性取舍
difficulty: 资深
tags: [CDN, 缓存, 一致性]
followups: [cdn-cache-invalidation-followup-1, cdn-cache-invalidation-followup-2, cdn-cache-invalidation-followup-3]

### 一句话

讲「CDN 缓存失效：Purge、版本化与一致性取舍」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你们站点在大促前刚做完 CDN 优化，命中率上去了，但发布后偶发“部分用户看到旧内容”。你会如何设计缓存失效策略，既避免脏数据又不把回源打爆？

### 答案要点

- 静态资源优先用 hash 文件名 + 长缓存（immutable）；业务页面和 API 用短 TTL + 协商缓存，不同类型不能一刀切。
- 发布失效优先按 key/tag 精准 purge，避免全站 purge 导致瞬时回源洪峰。
- 关键数据链路要配主动失效（发布事件触发）+ 被动过期（TTL）双保险，减少“新旧版本混读”窗口。
- 回源保护要配请求合并和并发上限，防止热点 key 到期时缓存击穿。

#### 工程化补充

- 场景前提：CDN 缓存失效：Purge、版本化与一致性取舍 只有在瓶颈被数据证实时才值得推进；先确认 CDN 是否真是主耗时来源。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 CDN 缓存失效：Purge、版本化与一致性取舍 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```http
# 静态资源（带 hash）
Cache-Control: public, max-age=31536000, immutable

# 动态页面（可协商）
Cache-Control: public, max-age=60, stale-while-revalidate=120
ETag: "page-v42"
```

```ts
// 发布后按 tag 精准失效（伪代码）
async function purgeByTag(tag: string) {
  await fetch('https://cdn.example.com/api/purge', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CDN_TOKEN}` },
    body: JSON.stringify({ tags: [tag] }),
  });
}

// 例如：文章发布后只失效文章详情和列表相关 tag
await purgeByTag('post:123');
await purgeByTag('post:list');
```

### 追问

- 「CDN 缓存失效：Purge、版本化与一致性取舍」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把命中率当唯一目标，不看数据一致性窗口和业务投诉，容易“指标好看体验变差”。
- 每次发布都全站 purge，短时间把下游和源站压力推到峰值。
- 缓存策略不分资源类型，导致 HTML、API、静态资源互相污染策略。

### 延伸

- 多 CDN 场景要重点关注失效传播时延和跨厂商语义差异。
- 大促前可提前做失效演练，验证 purge、回源限流、降级策略是否可执行。

## timeout-retry-budget-followup-1

title: 追问：以「超时预算、重试策略与重试风暴治理」为例，你会如何识别「超时预算、重试策略与重试风暴治理」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [超时, 重试, 稳定性, 追问]
parent: timeout-retry-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「超时预算、重试策略与重试风暴治理」为例，你会如何识别「超时预算、重试策略与重试风暴治理」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 结论：先列「超时预算、重试策略与重试风暴治理」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先定位 超时预算 重试策略与重试风暴治理 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 超时：先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 重试：重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 稳定性：围绕「超时预算、重试策略与重试风暴治理」里的 稳定性 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：超时预算 重试策略与重试风暴治理 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 超时预算 重试策略与重试风暴治理 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## timeout-retry-budget-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 超时 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [超时, 重试, 稳定性, 追问]
parent: timeout-retry-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 超时 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先定「超时预算、重试策略与重试风暴治理」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 重试策略 与 重试风暴治理 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 超时：先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 重试：重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 稳定性：围绕「超时预算、重试策略与重试风暴治理」里的 稳定性 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 验收信号：重试策略 与 重试风暴治理 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## timeout-retry-budget-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「超时预算、重试策略与重试风暴治理」还值不值得继续维护
difficulty: 资深
tags: [超时, 重试, 稳定性, 追问]
parent: timeout-retry-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「超时预算、重试策略与重试风暴治理」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：超时预算 重试策略与重试风暴治理 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。
- 关键动作：先梳理 超时预算 重试策略与重试风暴治理 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 超时：先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 重试：重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 稳定性：在「超时预算、重试策略与重试风暴治理」这题里，稳定性 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：超时预算 重试策略与重试风暴治理 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「超时预算、重试策略与重试风暴治理」里 超时预算 重试策略与重试风暴治理 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## cdn-cache-invalidation-followup-1

title: 追问：在「CDN 缓存失效：Purge、版本化与一致性取舍」场景下，当「CDN 缓存失效：Purge、版本化与一致性取舍」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [CDN, 缓存, 一致性, 追问]
parent: cdn-cache-invalidation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「CDN 缓存失效：Purge、版本化与一致性取舍」场景下，当「CDN 缓存失效：Purge、版本化与一致性取舍」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 直答

- 结论：先量化 CDN 缓存失效 Purge 版本化与一致性取舍 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：围绕 CDN 缓存失效 Purge 版本化与一致性取舍 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- CDN：CDN 是「CDN 缓存失效：Purge、版本化与一致性取舍」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Purge：Purge 是「CDN 缓存失效：Purge、版本化与一致性取舍」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 缓存：静态资源优先用 hash 文件名 + 长缓存（immutable）；业务页面和 API 用短 TTL + 协商缓存，不同类型不能一刀切。

#### 风险与验收

- 主要风险：发布失效优先按 key/tag 精准 purge，避免全站 purge 导致瞬时回源洪峰。
- 验收信号：CDN 缓存失效 Purge 版本化与一致性取舍 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## cdn-cache-invalidation-followup-2

title: 追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，要证明「CDN 缓存失效：Purge、版本化与一致性取舍」确实改善体验，你会如何围绕 CDN 设计线上观测与对照验证
difficulty: 资深
tags: [CDN, 缓存, 一致性, 追问]
parent: cdn-cache-invalidation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，要证明「CDN 缓存失效：Purge、版本化与一致性取舍」确实改善体验，你会如何围绕 CDN 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：先量化 CDN 缓存失效 Purge 版本化与一致性取舍 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先统一 CDN 缓存失效 Purge 版本化与一致性取舍 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- CDN：CDN 是「CDN 缓存失效：Purge、版本化与一致性取舍」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Purge：Purge 是「CDN 缓存失效：Purge、版本化与一致性取舍」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 缓存：静态资源优先用 hash 文件名 + 长缓存（immutable）；业务页面和 API 用短 TTL + 协商缓存，不同类型不能一刀切。

#### 风险与验收

- 主要风险：发布失效优先按 key/tag 精准 purge，避免全站 purge 导致瞬时回源洪峰。
- 验收信号：CDN 缓存失效 Purge 版本化与一致性取舍 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## cdn-cache-invalidation-followup-3

title: 追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，如果「CDN 缓存失效：Purge、版本化与一致性取舍」在 CDN 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 资深
tags: [CDN, 缓存, 一致性, 追问]
parent: cdn-cache-invalidation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，如果「CDN 缓存失效：Purge、版本化与一致性取舍」在 CDN 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 直答

- 结论：先量化 CDN 缓存失效 Purge 版本化与一致性取舍 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先识别 CDN 缓存失效 Purge 版本化与一致性取舍 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- CDN：CDN 是「CDN 缓存失效：Purge、版本化与一致性取舍」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Purge：Purge 是「CDN 缓存失效：Purge、版本化与一致性取舍」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 缓存：静态资源优先用 hash 文件名 + 长缓存（immutable）；业务页面和 API 用短 TTL + 协商缓存，不同类型不能一刀切。

#### 风险与验收

- 主要风险：发布失效优先按 key/tag 精准 purge，避免全站 purge 导致瞬时回源洪峰。
- 验收信号：验收看 CDN 缓存失效 Purge 版本化与一致性取舍 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## multi-cdn-failover-drill

title: 多 CDN 故障切流演练：探测、切换、回切与一致性验收
difficulty: 资深
tags: [CDN, 高可用, 故障演练]
followups: [multi-cdn-failover-drill-followup-1, multi-cdn-failover-drill-followup-2, multi-cdn-failover-drill-followup-3]

### 一句话

这题回答要覆盖 CDN 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

你负责一个流量高峰明显的站点，采用双 CDN。某次区域性故障时主 CDN 命中率骤降、回源激增。你会如何设计自动切流与人工兜底机制，确保业务连续性？

### 答案要点

- 先定义切流触发条件：可用率、回源率、TTFB、错误码占比、探测失败连续次数都要有明确阈值。
- 切流策略分层：先区域切流，再全局切流；避免“一键全切”导致次生拥塞。
- 回切必须设冷静期与验收窗口，确认源站压力、缓存预热和错误率恢复后再逐步回切。
- DNS、边缘路由、缓存失效语义要统一，不同厂商的 purge/tag 行为差异必须提前对齐。

#### 工程化补充

- 场景前提：先约定 CDN 的超时、重试和幂等语义，再谈 多 CDN 故障切流演练：探测、切换、回切与一致性验收 的实现细节。
- 实施步骤：围绕 CDN 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作里要写清超时、重试、幂等和降级顺序，防止故障放大。
- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

### 代码示例

```ts
type CdnHealth = {
  provider: 'A' | 'B';
  errorRate: number;
  originRate: number;
  p95TtfbMs: number;
};

function shouldShiftTraffic(h: CdnHealth) {
  return h.errorRate > 0.02 || h.originRate > 0.25 || h.p95TtfbMs > 900;
}
```

```yaml
cdn_failover_policy:
  region_first: true
  trigger:
    error_rate: '>= 2%'
    origin_rate: '>= 25%'
    p95_ttfb_ms: '>= 900'
  rollback_guard:
    observe_minutes: 20
    step_back_percent: [20, 50, 100]
```

### 追问

- 「多 CDN 故障切流演练：探测、切换、回切与一致性验收」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做切流，不做回切验收，导致恢复阶段再次放大故障。
- 探测口径要覆盖业务接口成功率与缓存命中变化，避免只看连通性就误判可用性。
- 厂商能力抽象不统一，切换后才暴露配置语义不一致。

### 延伸

- 高峰业务建议预置“关键资源白名单”策略，故障时优先保障核心页面。
- 可把 CDN 故障演练纳入发布准入，避免只在事故后被动补课。

## network-adaptive-degradation-matrix

title: 弱网自适应降级矩阵：请求优先级、体验止损与恢复策略
difficulty: 资深
tags: [弱网, 降级策略, 用户体验]
followups: [network-adaptive-degradation-matrix-followup-1, network-adaptive-degradation-matrix-followup-2, network-adaptive-degradation-matrix-followup-3]

### 一句话

讲「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

在地铁、商场等弱网场景下，页面出现加载超时和交互卡顿。你会如何设计前端网络自适应策略，兼顾核心转化与体验稳定性？

### 答案要点

- 先做能力分级：P0 核心交易、P1 关键信息、P2 增强体验分别配置不同超时和重试预算。
- 根据网络质量动态调参：effectiveType、rtt、丢包趋势决定并发数、资源尺寸和预加载策略。
- 高风险请求采用可中断机制：路由切换、重复点击、输入变化时取消旧请求，减少无效占用。
- 弱网下优先保核心：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。

#### 工程化补充

- 场景前提：弱网自适应降级矩阵：请求优先级、体验止损与恢复策略 只有在瓶颈被数据证实时才值得推进；先确认 弱网 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 弱网自适应降级矩阵：请求优先级、体验止损与恢复策略 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
type NetTier = 'good' | 'normal' | 'poor';

function resolveNetTier(input: {
  effectiveType?: string;
  saveData?: boolean;
  rtt?: number;
}): NetTier {
  if (input.saveData || input.effectiveType === 'slow-2g') return 'poor';
  if ((input.rtt ?? 0) > 800 || input.effectiveType === '2g') return 'poor';
  if (input.effectiveType === '3g') return 'normal';
  return 'good';
}
```

```ts
const requestBudgetByTier = {
  good: { timeoutMs: 1200, retry: 1, maxConcurrent: 6 },
  normal: { timeoutMs: 900, retry: 1, maxConcurrent: 4 },
  poor: { timeoutMs: 700, retry: 0, maxConcurrent: 2 },
} as const;
```

### 追问

- 「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只调超时和重试，不做业务优先级划分，弱网下仍然“全线一起慢”。
- 降级只关注技术指标，不关注用户是否完成核心任务。
- 没有恢复策略，网络回暖后仍停留在降级状态。

### 延伸

- 可将弱网分层策略和 AB 实验联动，持续校准阈值而不是长期拍脑袋。
- 跨端产品要统一降级语义，避免 Web/H5/App 表现不一致引发投诉。

## multi-cdn-failover-drill-followup-1

title: 追问：结合真实业务约束，如果要做「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [CDN, 高可用, 故障演练, 追问]
parent: multi-cdn-failover-drill
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要做「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 结论：先画出 多 CDN 故障切流演练 探测 切换 回切与一致性验收 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 多 CDN 故障切流演练 探测 切换 回切与一致性验收 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- CDN：CDN 是「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 高可用：围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的 高可用 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 故障演练：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」这题里，故障演练 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：多 CDN 故障切流演练 探测 切换 回切与一致性验收 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里，多 CDN 故障切流演练 探测 切换 回切与一致性验收 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## multi-cdn-failover-drill-followup-2

title: 追问：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」场景下，上线后你会盯哪些与 CDN 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [CDN, 高可用, 故障演练, 追问]
parent: multi-cdn-failover-drill
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」场景下，上线后你会盯哪些与 CDN 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先约定「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 多 CDN 故障切流演练 探测 切换 回切与一致性验收 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- CDN：CDN 是「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 高可用：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里，高可用 是验收对象，必须给可量化指标、日志信号和测试证据。
- 故障演练：围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的 故障演练 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：多 CDN 故障切流演练 探测 切换 回切与一致性验收 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里，多 CDN 故障切流演练 探测 切换 回切与一致性验收 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## multi-cdn-failover-drill-followup-3

title: 追问：结合真实业务约束，遇到约束变化时，你会如何围绕 CDN 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [CDN, 高可用, 故障演练, 追问]
parent: multi-cdn-failover-drill
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，遇到约束变化时，你会如何围绕 CDN 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先梳理 回切 与 一致性验收 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的 回切 与 一致性验收 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- CDN：CDN 是「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 高可用：围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的 高可用 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 故障演练：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」这题里，故障演练 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里，回切 与 一致性验收 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：回切 与 一致性验收 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## network-adaptive-degradation-matrix-followup-1

title: 追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」放到真实业务里，围绕 弱网 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [弱网, 降级策略, 用户体验, 追问]
parent: network-adaptive-degradation-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」放到真实业务里，围绕 弱网 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：先列出 弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先识别 弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 弱网：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。
- 降级策略：围绕「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里的 降级策略 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 用户体验：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里，用户体验 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## network-adaptive-degradation-matrix-followup-2

title: 追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，你会如何围绕 弱网 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [弱网, 降级策略, 用户体验, 追问]
parent: network-adaptive-degradation-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，你会如何围绕 弱网 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先约定「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 弱网：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。
- 降级策略：围绕「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里的 降级策略 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 用户体验：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里，用户体验 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里，弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：弱网自适应降级矩阵 请求优先级 体验止损与恢复策略 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## network-adaptive-degradation-matrix-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 弱网 调整方案边界与实施节奏
difficulty: 资深
tags: [弱网, 降级策略, 用户体验, 追问]
parent: network-adaptive-degradation-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 弱网 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里的 调整方案边界 与 实施节奏 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 弱网：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。
- 降级策略：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」这题里，降级策略 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 用户体验：围绕「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里的 用户体验 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里，调整方案边界 与 实施节奏 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：调整方案边界 与 实施节奏 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。
