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

TCP 负责把字节"可靠地送到对面"，TLS 在 TCP 之上加密，HTTP 在 TLS 之上定报文格式。每一层只解决一件事，所以可以独立演进（HTTP/3 就把 TCP 换成了 QUIC）。

### 题目

请说明 TCP、TLS、HTTP 各自处于什么层，分别解决什么问题。

### 答案要点

- TCP 解决可靠字节流传输：有序、重传、流量控制、拥塞控制
- TLS 解决通信加密和身份认证：证书校验、密钥协商、数据完整性
- HTTP 解决应用语义：请求方法、状态码、缓存、内容协商
- 对 HTTP/1.1 与 HTTP/2 来说，HTTPS 常可概括为 HTTP over TLS over TCP；HTTP/3 则通常运行在 QUIC 之上，而 QUIC 本身集成了 TLS 1.3 的安全能力

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

HTTP/1.1 有队头阻塞 → HTTP/2 二进制分帧 + 多路复用，但 TCP 层还会队头阻塞 → HTTP/3 干脆把 TCP 换成 QUIC（UDP 上做可靠 + TLS 1.3），彻底解决。

### 题目

为什么 HTTP/2 解决了一部分问题，但没有彻底消除性能瓶颈？HTTP/3 又补了什么？

### 答案要点

- HTTP/1.1 在单连接内存在应用层队头阻塞，浏览器常通过开多个连接来缓解
- HTTP/2 带来二进制分帧、多路复用、头部压缩，但仍跑在 TCP 上，丢包时仍会受传输层队头阻塞影响
- HTTP/3 基于 QUIC（运行在 UDP 之上），把连接建立、重传和多路复用放到新的传输层协议里，通常更利于降低握手时延并改善弱网体验

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

强缓存命中直接不发请求：Cache-Control: max-age 优先级高于 Expires；协商缓存会发请求问服务器：ETag/If-None-Match 更精确，Last-Modified/If-Modified-Since 更轻量。

### 题目

说清楚 `Cache-Control`、`Expires`、`ETag`、`Last-Modified` 的关系，并补充前端资源版本化策略。

### 答案要点

- 强缓存命中直接不发请求：`Cache-Control: max-age` 优先级高于 `Expires`
- 协商缓存会发请求问服务器：`ETag/If-None-Match` 更精确，`Last-Modified/If-Modified-Since` 更轻量
- 静态资源通常配合 hash 文件名做长期缓存，HTML 短缓存或不缓存
- Service Worker 属于应用层缓存，可覆盖浏览器默认行为

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

同源策略保护用户上下文和站点数据，防止任意站点读取别站响应；简单请求满足方法/头部/content-type 限制；否则先发 OPTIONS 预检。

### 题目

浏览器为什么要做同源限制？CORS 的简单请求和预检请求区别是什么？

### 答案要点

- 同源策略保护用户上下文和站点数据，防止任意站点读取别站响应
- 简单请求满足方法/头部/content-type 限制；否则先发 `OPTIONS` 预检
- 服务端通过 `Access-Control-Allow-Origin/Methods/Headers/Credentials` 明确放行
- 带凭证时 `Allow-Origin` 不能写 `*`

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

聊天通常优先 WebSocket：双向实时、交互频繁；通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource；轮询实现简单但浪费请求；长轮询是过渡方案。

### 题目

给聊天、通知、AI 流式输出三个场景分别选通信方式，并解释原因。

### 答案要点

- 聊天通常优先 WebSocket：双向实时、交互频繁
- 通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource
- 轮询实现简单但浪费请求；长轮询是过渡方案

#### 补充说明

- 面试中不要只停留在「WebSocket、SSE、轮询怎么选」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 实时通信、SSE 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 网络题要覆盖客户端、代理、服务端和缓存链路，说明超时、重试和降级策略。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

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

前端切片，计算文件 hash，先问服务端“哪些分片已存在”；仅上传缺失分片，服务端最终合并；秒传本质是服务端发现同 hash 文件已存在，直接复用。

### 题目

如何设计一个支持断点续传和秒传的上传组件？

### 答案要点

- 前端切片，计算文件 hash，先问服务端“哪些分片已存在”
- 仅上传缺失分片，服务端最终合并
- 秒传本质是服务端发现同 hash 文件已存在，直接复用
- 下载续传依赖 `Range` / `206 Partial Content`

#### 补充说明

- 面试中不要只停留在「大文件上传、断点续传、Range 下载的前端设计」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 上传、Range 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

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

CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力；未命中时会回源，回源链路和缓存键策略会影响最终性能；dns-prefetch 提前解析域名；preconnect 提前建立 TCP/TLS。

### 题目

前端如何理解 CDN、回源、预连接和 DNS 优化？

### 答案要点

- CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力
- 未命中时会回源，回源链路和缓存键策略会影响最终性能
- `dns-prefetch` 提前解析域名；`preconnect` 提前建立 TCP/TLS
- 域名拆分不是永远有利，在 HTTP/2/3 下过多域名会放大连接建立成本

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

Signaling 服务器：交换 SDP / ICE，但本身不传媒体；常用 WebSocket；SDP（Session Description Protocol）：协商编解码、媒体方向、加密参数。

### 题目

浏览器之间打 P2P 视频通话，整个流程涉及哪些角色？SDP 和 ICE 各自做什么？

### 答案要点

- Signaling 服务器：交换 SDP / ICE，但本身不传媒体；常用 WebSocket
- SDP（Session Description Protocol）：协商编解码、媒体方向、加密参数
- ICE：穷举候选地址（host / srflx / relay），用 STUN / TURN 找出最佳通路
- STUN：帮助发现公网地址；TURN：NAT 打洞失败时做中继（流量贵）
- 通道：`RTCPeerConnection`（媒体）+ `RTCDataChannel`（任意数据，自动 SCTP 加密）
- 实战：同事内网通常 STUN 就够；4G / 弱网下 TURN 必备

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

0-RTT / 1-RTT：握手次数减少，移动网络弱信号下首请求显著快；多路复用：基于 UDP，避免 HTTP/2 的 TCP 队头阻塞；连接迁移：网络切换（WiFi → 4G）连接不丢。

### 题目

作为前端，HTTP/3 的落地会让你哪些指标受益？踩到的坑是什么？

### 答案要点

- 0-RTT / 1-RTT：握手次数减少，移动网络弱信号下首请求显著快
- 多路复用：基于 UDP，避免 HTTP/2 的 TCP 队头阻塞
- 连接迁移：网络切换（WiFi → 4G）连接不丢
- 加密：TLS 1.3 内嵌，整个传输层强制加密
- 影响：`Alt-Svc` 头让浏览器自动 upgrade 到 H3，无需前端改代码；但企业代理 / 老 CDN 可能不支持
- 监控：Server-Timing、Resource Timing API 里的 `nextHopProtocol` 可以观测 H3 命中率
- 坑：UDP 在某些企业内网被 ban；CDN H3 配置需要额外开启

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

TLS 1.2 要 2 个来回（Hello + 密钥交换），TLS 1.3 把握手压到 1 个来回，常见连接还能用会话票据做 0-RTT，所以 HTTPS 不再"慢"。

### 题目

请描述一次完整的 HTTPS 握手过程，TLS 1.3 相比 1.2 优化了什么？

### 答案要点

- **TLS 1.2**：2-RTT 握手（ClientHello → ServerHello + Cert + KeyExchange → ClientKeyExchange + Finished → Finished）
- **TLS 1.3**：1-RTT 握手；客户端 Hello 同时携带 KeyShare，服务端 Hello + Cert 一次返回；后续应用数据
- TLS 1.3 还支持 0-RTT（PSK / Session Ticket），但有重放风险
- 移除了不安全算法（RC4、MD5、SHA-1、CBC、RSA 密钥交换）
- 默认 ECDHE + AEAD（GCM/ChaCha20-Poly1305），前向保密
- 证书验证：链路验证、CN/SAN 匹配、CT 透明度日志

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

单向推送（仪表盘、AI 流式响应）→ SSE；双向通讯（聊天、协作、游戏）→ WebSocket；服务端不支持长连接 → 长轮询兜底。

### 题目

做一个聊天 / 推送 / 实时仪表盘，应该选哪种通信方式？

### 答案要点

- **轮询（Polling）**：简单粗暴；定时请求；浪费带宽，延迟取决于间隔
- **长轮询（Long Polling）**：服务器 hold 住请求直到有数据；HTTP/1.1 兼容性好
- **SSE（Server-Sent Events）**：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制
- **WebSocket**：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻
- **WebTransport（QUIC）**：双向 + 多流 + 不可靠（datagram），新一代选项
- 选型：仪表盘只读 → SSE；聊天/游戏/协作 → WebSocket；超低延迟（VR/RTC）→ WebTransport / WebRTC

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

跨域 = 协议/域名/端口任一不同；浏览器在"非简单请求"（自定义头、PUT/DELETE、application/json）发实际请求前会先发 OPTIONS 问服务端"我能不能这样发"。

### 题目

请说说同源策略、CORS 的工作机制，以及哪些请求会触发预检。

### 答案要点

- 同源 = 协议 + 域名 + 端口完全相同；同源策略限制 cookie / DOM / Ajax
- 简单请求条件：方法 ∈ {GET, HEAD, POST}；Content-Type ∈ {text/plain, application/x-www-form-urlencoded, multipart/form-data}；不含自定义头
- 触发预检（OPTIONS）的情况：自定义头、PUT/DELETE/PATCH、application/json
- 预检响应必须带 `Access-Control-Allow-Methods / Headers / Origin`，可用 `Access-Control-Max-Age` 缓存
- 携带 cookie 需要 `Access-Control-Allow-Credentials: true` 且服务端不能 `*` 通配
- 备选：JSONP（已淘汰）、postMessage（跨窗口）、Nginx 反向代理

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

1xx 处理中、2xx 成功、3xx 重定向、4xx 客户端错（请求有问题）、5xx 服务端错（后端有 bug）。重点记住 200 / 201 / 204 / 301 / 302 / 304 / 400 / 401 / 403 / 404 / 429 / 500 / 502 / 503 / 504。

### 题目

请按类别说明常见 HTTP 状态码的含义和典型使用场景。

### 答案要点

- **1xx（Informational）**：100 Continue（大请求体探测）、101 Switching Protocols（升级到 WebSocket）、103 Early Hints（提前推 preload）
- **2xx（Success）**：200 OK、201 Created（POST 成功创建）、202 Accepted（已收到但未处理完）、204 No Content（PUT/DELETE 成功无返回体）、206 Partial Content（断点续传）
- **3xx（Redirection）**：301 永久重定向（SEO 友好）、302 临时（POST→GET 转换）、303 See Other、304 Not Modified（协商缓存命中）、307 / 308（保留方法语义的重定向）
- **4xx（Client Error）**：
  - 400 Bad Request、401 Unauthorized（未登录）、403 Forbidden（已登录但无权）、404 Not Found
  - 405 Method Not Allowed、408 Request Timeout、409 Conflict（冲突，乐观锁）
  - 410 Gone（已永久删除）、413 Payload Too Large、415 Unsupported Media Type
  - 422 Unprocessable Entity（参数校验失败，REST 常见）、429 Too Many Requests（限流）
- **5xx（Server Error）**：500 Internal Server Error、502 Bad Gateway（网关上游异常）、503 Service Unavailable（过载/维护）、504 Gateway Timeout（网关上游超时）
- **避坑**：401 vs 403 经常混；422 在 RESTful API 中比 400 更精确

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

服务器在最终 200 响应前，**先发一个 103 中间响应**附带 `Link: <a.css>; rel=preload` 等头，让浏览器在后端还在算业务时就提前**预连接 / 预加载**关键资源；典型可省 100-300ms LCP。

### 题目

后端响应时间长（数据库慢），但 LCP 主要瓶颈是慢资源加载。怎么不动后端逻辑就能让浏览器尽早开始下载关键资源？

### 答案要点

- **HTTP/1.1 早就有 100/101/102 等 1xx**
  - 服务端可以在最终响应前发多次"中间响应"
  - 103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）
- **典型流程**
  - 浏览器请求 / page → 服务器先回 `103 Early Hints` 附带 Link 头
  - 浏览器立刻开始 preload / preconnect
  - 服务器继续算业务（查 DB），最后回 200 + HTML
  - 浏览器拿到 HTML 时，关键 CSS/JS/字体可能已经加载完
- **典型 Link 头内容**
  - `Link: </app.css>; rel=preload; as=style`
  - `Link: </main.js>; rel=preload; as=script`
  - `Link: <https://cdn.example.com>; rel=preconnect`
  - 多条用逗号分隔
- **谁支持**
  - Chromium 系（Chrome / Edge）已支持
  - Safari / Firefox 部分场景
  - HTTP/2 / HTTP/3 推荐（HTTP/1.1 也能用）
- **谁来发**
  - Cloudflare Workers / Vercel Edge / Fastly：边缘提前发 103
  - Node Express 14+：`res.writeEarlyHints(...)`
  - Nginx 1.13+：模块支持
- **跟 HTTP/2 Server Push 的区别**
  - Server Push 已被弃用：浏览器很难判断"是否已缓存"
  - Early Hints 让浏览器自己决定要不要请求，行为正确
- **跟 `<link rel=preload>` 标签的区别**
  - 标签写在 HTML 里 → 浏览器要先收到 HTML 才看到
  - 103 在 HTML 之前就到了 → 早一步开始下载
- **何时不该用**
  - 后端响应很快（< 50ms）：意义不大，反而多一次响应开销
  - HTTPS 需要 TLS 1.2+ + 现代客户端
- **观测**
  - Chrome DevTools → Network → 显示 "Early Hints" 时间线
  - WebPageTest 能看到具体收益
  - LCP 通常下降 100-300ms（依赖网络延迟）

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

浏览器把整页（DOM + JS state + 滚动位置）冻结在内存里，前进/后退时**几毫秒恢复**，不重新下载也不跑 JS；想吃到这个红利得避开 unload/beforeunload、避免长时定时器、避免 WebSocket / IndexedDB 持续打开。

### 题目

你做的页面在 Chrome DevTools "Back/forward cache" 显示 "not eligible"。为什么？怎么修？

### 答案要点

- **bfcache 是什么**
  - 用户点"返回"时，浏览器从内存恢复整页：JS 内存状态、DOM、滚动、定时器、scroll position
  - 几毫秒恢复 → INP / LCP 飞起；某些电商场景"返回继续浏览"提升转化
- **被踢出 bfcache 的常见原因**（DevTools → Application → Back/forward cache）
  - **unload / beforeunload 监听器**：会让浏览器无法安全冻结
  - **打开的 IndexedDB transaction**：未提交事务被冻结会导致 DB 死锁
  - **WebSocket / WebRTC**：长连接被冻结网络协议会异常
  - **navigator.lock**：未释放
  - **Cache-Control: no-store**：HTTP 头明确禁止缓存
  - **HTTPS 证书错误 / Mixed Content**
  - **页面有 noopener 打开的子窗口**
- **优化做法**
  - 用 `pagehide` / `visibilitychange` 替代 `unload`
  - 关 IndexedDB transaction 在 `pagehide` 时立即提交
  - WebSocket 在 `pagehide` 时主动 close，`pageshow` 时重连
  - 用 `pagehide.persisted` 判断是否进 bfcache，true 时 cleanup
  - 用 `pageshow.persisted` 判断是否从 bfcache 恢复，true 时 refresh 关键数据（如未读消息）
- **跨标签 / 通信**
  - 从 bfcache 恢复时数据可能过期（用户离开 5min 又回来）
  - 用 BroadcastChannel / SW 通知刷新关键数据
- **Web Vitals 影响**
  - 从 bfcache 恢复的访问，Chrome 会单独上报"bfcache 命中"
  - 命中率通常能到 10-30%，影响 RUM 数据解读
- **测试**
  - DevTools → Application → Back/forward cache → "Test back/forward cache"
  - 列出所有阻塞原因
- **典型场景收益**
  - 电商列表 → 详情 → 返回列表：滚动位置 + 列表数据全保留
  - 文章页面后退到首页：体验丝滑
  - SPA 内部的"返回"是路由变化，跟 bfcache 无关；这只影响"跨页面"的返回

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

HTTP/1.1 一条 TCP 连接只能串行收发一组请求-响应（队头阻塞），需要靠并发连接 + 域名分片绕过；HTTP/2 在单连接里把请求拆成二进制帧并交错发送（Stream + Frame），同时支持头部压缩 HPACK 和服务器推送，从协议层根除应用层队头阻塞。

### 题目

对比 HTTP/1.1 和 HTTP/2 的核心差异；解释多路复用解决了什么问题，又带来了什么新问题。

### 答案要点

**协议层差异**

- **格式**：1.1 是文本协议；2 是**二进制分帧**（Frame），消息按帧切并加 stream id
- **多路复用**：1.1 同连接串行（pipelining 实际不可用，被代理破坏）；2 在单连接里多个 stream 并发，互不阻塞
- **头部**：1.1 每次都明文重复（cookie 大头）；2 用 **HPACK**（静态表 + 动态表 + 哈夫曼）压缩
- **优先级**：2 引入 stream priority（依赖树 + 权重），客户端可指示资源加载优先级
- **服务器推送**：2 server push（实测效果差，已被弃用，Chrome 106 移除）
- **TLS**：HTTP/2 实际上**强制 https**（h2c over TCP 浏览器不实现）

**多路复用解决了什么**

- HTTP/1.1 应用层队头阻塞：单连接同一时刻只能跑一个请求，慢请求会卡住后面的
- 浏览器对同一域名最多 6 个连接 → 资源多时排队
- 老办法："**域名分片**"（cdn1.x.com / cdn2.x.com）和 **CSS Sprite / 合并 JS** 都是绕过手段
- HTTP/2 后这些 hack 反而**有害**：分片破坏单连接复用，sprite 增加首包

**多路复用没解决的问题**

- **TCP 层队头阻塞仍在**：底层 TCP 任一包丢失，整连接所有 stream 都得等重传
- **HTTP/3（QUIC over UDP）才真正解决**：在用户态实现可靠传输，stream 之间彻底独立

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

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 TCP 重点排查「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 回答前先列出「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## http1-http2-http3-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP2 重点排查「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的哪些边界问题
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC, 追问]
parent: http1-http2-http3

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP2 重点排查「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 准备这道追问时，先画出「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」从输入到输出的关键路径，再补异常路径。
- 准备一个「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## http1-http2-http3-followup-2

title: 追问：你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC, 追问]
parent: http1-http2-http3

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 核心回答

- 先把「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 开口先讲「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## http1-http2-http3-followup-3

title: 追问：从工程落地角度看，如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 进阶
tags: [HTTP2, HTTP3, QUIC, 追问]
parent: http1-http2-http3

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」不是只在理想输入下成立。；再补可观测指标：链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」不是只在理想输入下成立。
- 再补可观测指标：围绕「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 准备这道追问时，先画出「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」从输入到输出的关键路径，再补异常路径。
- 准备一个「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「HTTP/1.1、HTTP/2、HTTP/3 的关键差异」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## caching-followup-1

title: 追问：以「强缓存、协商缓存、Service Worker 缓存如何协同」为例，你会先看哪些与 缓存 相关的指标来判断「强缓存、协商缓存、Service Worker 缓存如何协同」是不是当前性能瓶颈
difficulty: 基础
tags: [缓存, CDN, 追问]
parent: caching

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「强缓存、协商缓存、Service Worker 缓存如何协同」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「强缓存、协商缓存、Service Worker 缓存如何协同」为例，你会先看哪些与 缓存 相关的指标来判断「强缓存、协商缓存、Service Worker 缓存如何协同」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「强缓存、协商缓存、Service Worker 缓存如何协同」不是只在理想输入下成立。
- 再补可观测指标：围绕「强缓存、协商缓存、Service Worker 缓存如何协同」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「强缓存、协商缓存、Service Worker 缓存如何协同」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「强缓存、协商缓存、Service Worker 缓存如何协同」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「强缓存、协商缓存、Service Worker 缓存如何协同」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「强缓存、协商缓存、Service Worker 缓存如何协同」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## caching-followup-2

title: 追问：要证明「强缓存、协商缓存、Service Worker 缓存如何协同」确实改善体验，你会如何围绕 缓存 设计线上观测与对照验证
difficulty: 基础
tags: [缓存, CDN, 追问]
parent: caching

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「强缓存、协商缓存、Service Worker 缓存如何协同」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：要证明「强缓存、协商缓存、Service Worker 缓存如何协同」确实改善体验，你会如何围绕 缓存 设计线上观测与对照验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「强缓存、协商缓存、Service Worker 缓存如何协同」不是只在理想输入下成立。
- 再补可观测指标：围绕「强缓存、协商缓存、Service Worker 缓存如何协同」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「强缓存、协商缓存、Service Worker 缓存如何协同」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「强缓存、协商缓存、Service Worker 缓存如何协同」的核心机制，再补一个会失败的具体场景。
- 准备一个与「强缓存、协商缓存、Service Worker 缓存如何协同」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「强缓存、协商缓存、Service Worker 缓存如何协同」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## caching-followup-3

title: 追问：结合真实业务约束，围绕「强缓存、协商缓存、Service Worker 缓存如何协同」在 缓存 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 基础
tags: [缓存, CDN, 追问]
parent: caching

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「强缓存、协商缓存、Service Worker 缓存如何协同」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：结合真实业务约束，围绕「强缓存、协商缓存、Service Worker 缓存如何协同」在 缓存 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「强缓存、协商缓存、Service Worker 缓存如何协同」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「强缓存、协商缓存、Service Worker 缓存如何协同」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「强缓存、协商缓存、Service Worker 缓存如何协同」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 准备这道追问时，先画出「强缓存、协商缓存、Service Worker 缓存如何协同」从输入到输出的关键路径，再补异常路径。
- 准备一个「强缓存、协商缓存、Service Worker 缓存如何协同」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「强缓存、协商缓存、Service Worker 缓存如何协同」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## cors-cross-origin-followup-1

title: 追问：结合真实业务约束，围绕「CORS、预检请求与常见跨域方案」落地时，你会怎样定义前端可信范围与服务端强校验边界
difficulty: 进阶
tags: [跨域, CORS, 追问]
parent: cors-cross-origin

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：结合真实业务约束，围绕「CORS、预检请求与常见跨域方案」落地时，你会怎样定义前端可信范围与服务端强校验边界？

### 答案要点

#### 核心回答

- 推动「CORS、预检请求与常见跨域方案」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「CORS、预检请求与常见跨域方案」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「CORS、预检请求与常见跨域方案」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 回答前先列出「CORS、预检请求与常见跨域方案」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「CORS、预检请求与常见跨域方案」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「CORS、预检请求与常见跨域方案」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## cors-cross-origin-followup-2

title: 追问：围绕「CORS、预检请求与常见跨域方案」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [跨域, CORS, 追问]
parent: cors-cross-origin

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「CORS、预检请求与常见跨域方案」不是只在理想输入下成立。；再补可观测指标：安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善，要能回到原题机制定位原因。

### 题目

如果面试官追问：围绕「CORS、预检请求与常见跨域方案」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「CORS、预检请求与常见跨域方案」不是只在理想输入下成立。
- 再补可观测指标：围绕「CORS、预检请求与常见跨域方案」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「CORS、预检请求与常见跨域方案」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 准备这道追问时，先画出「CORS、预检请求与常见跨域方案」从输入到输出的关键路径，再补异常路径。
- 准备一个「CORS、预检请求与常见跨域方案」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「CORS、预检请求与常见跨域方案」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## cors-cross-origin-followup-3

title: 追问：结合真实业务约束，你会怎样给「CORS、预检请求与常见跨域方案」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 进阶
tags: [跨域, CORS, 追问]
parent: cors-cross-origin

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：结合真实业务约束，你会怎样给「CORS、预检请求与常见跨域方案」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「CORS、预检请求与常见跨域方案」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「CORS、预检请求与常见跨域方案」对应的安全边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「CORS、预检请求与常见跨域方案」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 回答前先列出「CORS、预检请求与常见跨域方案」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「CORS、预检请求与常见跨域方案」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「CORS、预检请求与常见跨域方案」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## websocket-sse-followup-1

title: 追问：在弱网、代理、断连或服务端限流场景下，你会围绕 实时通信 重点排查「WebSocket、SSE、轮询怎么选」的哪些边界问题
difficulty: 进阶
tags: [实时通信, SSE, 追问]
parent: websocket-sse

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「WebSocket、SSE、轮询怎么选」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：在弱网、代理、断连或服务端限流场景下，你会围绕 实时通信 重点排查「WebSocket、SSE、轮询怎么选」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「WebSocket、SSE、轮询怎么选」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「WebSocket、SSE、轮询怎么选」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「WebSocket、SSE、轮询怎么选」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 开口先讲「WebSocket、SSE、轮询怎么选」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「WebSocket、SSE、轮询怎么选」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「WebSocket、SSE、轮询怎么选」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## upload-download-followup-1

title: 追问：结合真实业务约束，真要把「大文件上传、断点续传、Range 下载的前端设计」推到线上，你会如何围绕 上传 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [上传, Range, 追问]
parent: upload-download

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「大文件上传、断点续传、Range 下载的前端设计」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，真要把「大文件上传、断点续传、Range 下载的前端设计」推到线上，你会如何围绕 上传 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 核心回答

- 推动「大文件上传、断点续传、Range 下载的前端设计」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「大文件上传、断点续传、Range 下载的前端设计」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「大文件上传、断点续传、Range 下载的前端设计」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 开口先讲「大文件上传、断点续传、Range 下载的前端设计」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「大文件上传、断点续传、Range 下载的前端设计」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「大文件上传、断点续传、Range 下载的前端设计」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## dns-cdn-followup-1

title: 追问：以「DNS、CDN 与接入层优化的前端视角」为例，在弱网、代理、断连或服务端限流场景下，你会围绕 DNS 重点排查「DNS、CDN 与接入层优化的前端视角」的哪些边界问题
difficulty: 进阶
tags: [DNS, CDN, 追问]
parent: dns-cdn

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「DNS、CDN 与接入层优化的前端视角」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：以「DNS、CDN 与接入层优化的前端视角」为例，在弱网、代理、断连或服务端限流场景下，你会围绕 DNS 重点排查「DNS、CDN 与接入层优化的前端视角」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「DNS、CDN 与接入层优化的前端视角」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「DNS、CDN 与接入层优化的前端视角」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「DNS、CDN 与接入层优化的前端视角」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 准备这道追问时，先画出「DNS、CDN 与接入层优化的前端视角」从输入到输出的关键路径，再补异常路径。
- 准备一个「DNS、CDN 与接入层优化的前端视角」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「DNS、CDN 与接入层优化的前端视角」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## webrtc-basic-followup-1

title: 追问：当「WebRTC 基础：为什么 P2P 仍然需要服务器」进入复杂场景后，你会先验证哪些 WebRTC 前置条件，避免方案踩坑
difficulty: 资深
tags: [WebRTC, P2P, 追问]
parent: webrtc-basic

### 一句话

先界定「WebRTC 基础：为什么 P2P 仍然需要服务器」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：当「WebRTC 基础：为什么 P2P 仍然需要服务器」进入复杂场景后，你会先验证哪些 WebRTC 前置条件，避免方案踩坑？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebRTC 基础：为什么 P2P 仍然需要服务器」不是只在理想输入下成立。
- 再补可观测指标：围绕「WebRTC 基础：为什么 P2P 仍然需要服务器」的核心机制应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「WebRTC 基础：为什么 P2P 仍然需要服务器」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「WebRTC 基础：为什么 P2P 仍然需要服务器」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「WebRTC 基础：为什么 P2P 仍然需要服务器」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「WebRTC 基础：为什么 P2P 仍然需要服务器」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## quic-http3-deep-followup-1

title: 追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/3 重点排查「HTTP/3 / QUIC 在前端工程中的可见影响」的哪些边界问题
difficulty: 资深
tags: [HTTP/3, QUIC, 追问]
parent: quic-http3-deep

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「HTTP/3 / QUIC 在前端工程中的可见影响」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/3 重点排查「HTTP/3 / QUIC 在前端工程中的可见影响」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「HTTP/3 / QUIC 在前端工程中的可见影响」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「HTTP/3 / QUIC 在前端工程中的可见影响」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「HTTP/3 / QUIC 在前端工程中的可见影响」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「HTTP/3 / QUIC 在前端工程中的可见影响」的核心机制，再补一个会失败的具体场景。
- 准备一个与「HTTP/3 / QUIC 在前端工程中的可见影响」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「HTTP/3 / QUIC 在前端工程中的可见影响」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## https-handshake-followup-1

title: 追问：你会怎样把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的前端防护与服务端兜底串成完整安全闭环
difficulty: 进阶
tags: [TLS, 安全, 追问]
parent: https-handshake

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：你会怎样把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的前端防护与服务端兜底串成完整安全闭环？

### 答案要点

#### 核心回答

- 先画清「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。
- 证明「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。
- 一旦发现「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」相关异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

#### 学习抓手

- 准备这道追问时，先画出「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」从输入到输出的关键路径，再补异常路径。
- 准备一个「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## websocket-vs-sse-vs-polling-followup-1

title: 追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 实时 重点排查「长轮询 / WebSocket / SSE 怎么选」的哪些边界问题
difficulty: 进阶
tags: [实时, 推送, 追问]
parent: websocket-vs-sse-vs-polling

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「长轮询 / WebSocket / SSE 怎么选」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 实时 重点排查「长轮询 / WebSocket / SSE 怎么选」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「长轮询 / WebSocket / SSE 怎么选」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「长轮询 / WebSocket / SSE 怎么选」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「长轮询 / WebSocket / SSE 怎么选」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「长轮询 / WebSocket / SSE 怎么选」的核心机制，再补一个会失败的具体场景。
- 准备一个与「长轮询 / WebSocket / SSE 怎么选」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「长轮询 / WebSocket / SSE 怎么选」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## cors-and-preflight-followup-1

title: 追问：在「跨域与 CORS 预检，谁触发了 OPTIONS」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 进阶
tags: [CORS, 安全, 追问]
parent: cors-and-preflight

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「跨域与 CORS 预检，谁触发了 OPTIONS」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 核心回答

- 先画清「跨域与 CORS 预检，谁触发了 OPTIONS」信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。
- 证明「跨域与 CORS 预检，谁触发了 OPTIONS」没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。
- 一旦发现「跨域与 CORS 预检，谁触发了 OPTIONS」相关异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

#### 学习抓手

- 回答前先列出「跨域与 CORS 预检，谁触发了 OPTIONS」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「跨域与 CORS 预检，谁触发了 OPTIONS」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「跨域与 CORS 预检，谁触发了 OPTIONS」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## status-codes-followup-1

title: 追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP 重点排查「HTTP 常见状态码及其含义」的哪些边界问题
difficulty: 基础
tags: [HTTP, 高频, 追问]
parent: status-codes

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「HTTP 常见状态码及其含义」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。；降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步。

### 题目

如果面试官追问：在当前团队与业务约束下，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP 重点排查「HTTP 常见状态码及其含义」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「HTTP 常见状态码及其含义」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「HTTP 常见状态码及其含义」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「HTTP 常见状态码及其含义」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「HTTP 常见状态码及其含义」的核心机制，再补一个会失败的具体场景。
- 准备一个与「HTTP 常见状态码及其含义」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「HTTP 常见状态码及其含义」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## early-hints-103-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 HTTP 相关的指标来判断「HTTP 103 Early Hints 是什么？怎么用来优化首屏」是不是当前性能瓶颈
difficulty: 资深
tags: [HTTP, 性能, 高频, 追问]
parent: early-hints-103

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP 103 Early Hints 是什么？怎么用来优化首屏」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 HTTP 相关的指标来判断「HTTP 103 Early Hints 是什么？怎么用来优化首屏」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP 103 Early Hints 是什么？怎么用来优化首屏」不是只在理想输入下成立。
- 再补可观测指标：围绕「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「HTTP 103 Early Hints 是什么？怎么用来优化首屏」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的核心机制，再补一个会失败的具体场景。
- 准备一个与「HTTP 103 Early Hints 是什么？怎么用来优化首屏」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「HTTP 103 Early Hints 是什么？怎么用来优化首屏」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## bfcache-frontend-followup-1

title: 追问：你会先看哪些与 浏览器 相关的指标来判断「bfcache（前进/后退缓存）你怎么用好它」是不是当前性能瓶颈
difficulty: 资深
tags: [浏览器, 性能, 高频, 追问]
parent: bfcache-frontend

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「bfcache（前进/后退缓存）你怎么用好它」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：你会先看哪些与 浏览器 相关的指标来判断「bfcache（前进/后退缓存）你怎么用好它」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「bfcache（前进/后退缓存）你怎么用好它」不是只在理想输入下成立。
- 再补可观测指标：围绕「bfcache（前进/后退缓存）你怎么用好它」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「bfcache（前进/后退缓存）你怎么用好它」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先把「bfcache（前进/后退缓存）你怎么用好它」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「bfcache（前进/后退缓存）你怎么用好它」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「bfcache（前进/后退缓存）你怎么用好它」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## http1-vs-http2-multiplex-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/2 重点排查「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的哪些边界问题
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频, 追问]
parent: http1-vs-http2-multiplex

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 HTTP/2 重点排查「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的哪些边界问题？

### 答案要点

#### 核心回答

- 先把「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 回答前先列出「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## http1-vs-http2-multiplex-followup-2

title: 追问：从工程落地角度看，你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频, 追问]
parent: http1-vs-http2-multiplex

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：从工程落地角度看，你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 核心回答

- 先把「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 复盘时先确认「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## http1-vs-http2-multiplex-followup-3

title: 追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 进阶
tags: [HTTP/2, 多路复用, 高频, 追问]
parent: http1-vs-http2-multiplex

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」不是只在理想输入下成立。；再补可观测指标：链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」不是只在理想输入下成立。
- 再补可观测指标：围绕「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「HTTP/1.1 与 HTTP/2 核心差异，多路复用解决了什么」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## request-race-cancel-dedupe

title: 前端请求竞态、取消、去重与幂等怎么处理
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理]
links: [caching, upload-download, 16-observability/reporting-channel]
followups: [request-race-cancel-dedupe-followup-1, request-race-cancel-dedupe-followup-2, request-race-cancel-dedupe-followup-3]

### 一句话

请求治理不是“多加几个 loading”：要同时处理慢请求覆盖新结果、重复提交、切页取消、请求去重、重试幂等和失败回滚；`AbortController` 只能取消客户端消费，真正可靠还要靠请求 ID、幂等键和服务端配合。

### 题目

搜索联想、Tab 切换、表单重复提交和弱网重试里，前端为什么会出现请求竞态？你会如何设计取消、去重、幂等和状态回滚？

### 答案要点

- 竞态的本质是“响应返回顺序不等于用户最新意图”：旧搜索请求可能晚于新请求返回，旧 Tab 数据可能覆盖当前 Tab。
- 取消分两层：`AbortController` 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 去重适合相同资源读取：同 URL、同参数、同身份的 GET 可以共享 pending promise；写操作不要盲目去重，要按业务幂等键判断。
- UI 状态要按 requestId 或 version 更新：只有当前请求能写入结果、错误和 loading；旧请求返回只能丢弃或写入缓存。
- 表单提交要防重复：按钮禁用只是体验层，服务端仍要用 idempotency key、订单号、nonce 或业务唯一索引兜底。
- 重试要区分错误类型：网络断开、超时、`429/503` 可退避重试；`400/401/403` 不应自动重试；写操作重试必须保证幂等。

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

先把目标和约束说清楚，再展开实现：这能避免把「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」讲成只在理想输入下可用。；建议按「输入约束 -> TCP 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：以「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」为例，如果「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」遇到外部依赖抖动，你会先收紧哪几个可靠性开关？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」讲成只在理想输入下可用。
- 建议按「输入约束 -> TCP 执行链路 -> 结果验证」展开，并结合「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」回答里，实现层面要解释 TCP 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- TCP 解决可靠字节流传输：有序、重传、流量控制、拥塞控制
- TLS 解决通信加密和身份认证：证书校验、密钥协商、数据完整性
- HTTP 解决应用语义：请求方法、状态码、缓存、内容协商
- 结合一次「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」线上案例说明 TCP 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的最小可复现样例，再扩展到主链路回归，这样能更快确认 TCP 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」里的 TCP，否则很难证明变化来自这次改动。
- 「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 如果没说明「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」里 TCP 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 避免把「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## tcp-tls-http-followup-3

title: 追问：在「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」场景下，当你要验证「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标
difficulty: 基础
tags: [TCP, TLS, HTTP, 追问]
parent: tcp-tls-http
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> TCP 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」场景下，当你要验证「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> TCP 机制 -> 取舍边界」回答，再用「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」补一个反例，避免停在口号层。
- 如果涉及「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- TCP 解决可靠字节流传输：有序、重传、流量控制、拥塞控制
- TLS 解决通信加密和身份认证：证书校验、密钥协商、数据完整性
- HTTP 解决应用语义：请求方法、状态码、缓存、内容协商
- 补一个你真实处理过的「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」相似场景：说明 TCP 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 TCP 设计测试与回归流程。
- 围绕「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 TCP 的真实收益是否稳定。
- 围绕「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 另一个问题是缺少失败预案：若「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」里的 TCP 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 保持「TCP、TLS、HTTP 三层关系怎么向面试官讲清楚」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## websocket-sse-followup-2

title: 追问：从工程落地角度看，在「WebSocket、SSE、轮询怎么选」里你会怎样划分可重试与不可重试场景，防止误重试放大故障
difficulty: 进阶
tags: [实时通信, SSE, 追问]
parent: websocket-sse
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「WebSocket、SSE、轮询怎么选」讲成只在理想输入下可用。；围绕「WebSocket、SSE、轮询怎么选」组织答案时，建议按「约束来源 -> 实时通信 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：从工程落地角度看，在「WebSocket、SSE、轮询怎么选」里你会怎样划分可重试与不可重试场景，防止误重试放大故障？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「WebSocket、SSE、轮询怎么选」讲成只在理想输入下可用。
- 围绕「WebSocket、SSE、轮询怎么选」组织答案时，建议按「约束来源 -> 实时通信 关键决策 -> 验证闭环」展开。
- 在「WebSocket、SSE、轮询怎么选」回答里，实现层面要解释 实时通信 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 聊天通常优先 WebSocket：双向实时、交互频繁
- 通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource
- 轮询实现简单但浪费请求；长轮询是过渡方案
- 若能补一段「WebSocket、SSE、轮询怎么选」复盘片段，解释 实时通信 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「WebSocket、SSE、轮询怎么选」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 实时通信 的预期结果写成可复核标准。
- 在「WebSocket、SSE、轮询怎么选」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 实时通信 的问题定位闭环。
- 「WebSocket、SSE、轮询怎么选」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「WebSocket、SSE、轮询怎么选」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 若没说明「WebSocket、SSE、轮询怎么选」在 实时通信 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 避免把「WebSocket、SSE、轮询怎么选」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## websocket-sse-followup-3

title: 追问：结合真实业务约束，你会如何把「WebSocket、SSE、轮询怎么选」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定
difficulty: 进阶
tags: [实时通信, SSE, 追问]
parent: websocket-sse
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「WebSocket、SSE、轮询怎么选」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 实时通信 机制 -> 风险兜底」展开，并以「WebSocket、SSE、轮询怎么选」补一条失败场景。

### 题目

如果面试官追问：结合真实业务约束，你会如何把「WebSocket、SSE、轮询怎么选」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「WebSocket、SSE、轮询怎么选」讲成只在理想输入下可用。
- 回答结构可按「触发条件 -> 实时通信 机制 -> 风险兜底」展开，并以「WebSocket、SSE、轮询怎么选」补一条失败场景，能体现工程拆解能力。
- 在「WebSocket、SSE、轮询怎么选」回答里，实现层面要解释 实时通信 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 聊天通常优先 WebSocket：双向实时、交互频繁
- 通知流、日志流、AI 文本流很适合 SSE：服务端到客户端单向流式、浏览器原生支持 EventSource
- 轮询实现简单但浪费请求；长轮询是过渡方案
- 把原题观点放进「WebSocket、SSE、轮询怎么选」的一个具体版本迭代里，讲清 实时通信 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「WebSocket、SSE、轮询怎么选」在 实时通信 上的优化不是只在 demo 数据下成立。
- 围绕「WebSocket、SSE、轮询怎么选」建监控时，建议把 实时通信 指标和业务转化指标并排展示，避免只看技术侧信号。
- 「WebSocket、SSE、轮询怎么选」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「WebSocket、SSE、轮询怎么选」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 只关注「WebSocket、SSE、轮询怎么选」里 实时通信 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 避免把「WebSocket、SSE、轮询怎么选」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## upload-download-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 上传 定义「大文件上传、断点续传、Range 下载的前端设计」的先后改造顺序
difficulty: 进阶
tags: [上传, Range, 追问]
parent: upload-download
generated: followup-script

### 一句话

推动「大文件上传、断点续传、Range 下载的前端设计」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「大文件上传、断点续传、Range 下载的前端设计」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 上传 定义「大文件上传、断点续传、Range 下载的前端设计」的先后改造顺序？

### 答案要点

#### 核心回答

- 推动「大文件上传、断点续传、Range 下载的前端设计」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「大文件上传、断点续传、Range 下载的前端设计」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「大文件上传、断点续传、Range 下载的前端设计」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 先把「大文件上传、断点续传、Range 下载的前端设计」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「大文件上传、断点续传、Range 下载的前端设计」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「大文件上传、断点续传、Range 下载的前端设计」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## upload-download-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「大文件上传、断点续传、Range 下载的前端设计」还值不值得继续维护
difficulty: 进阶
tags: [上传, Range, 追问]
parent: upload-download
generated: followup-script

### 一句话

规模变大后先重新评估「大文件上传、断点续传、Range 下载的前端设计」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「大文件上传、断点续传、Range 下载的前端设计」对应的工程可维护性收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「大文件上传、断点续传、Range 下载的前端设计」还值不值得继续维护？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「大文件上传、断点续传、Range 下载的前端设计」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「大文件上传、断点续传、Range 下载的前端设计」对应的工程可维护性收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「大文件上传、断点续传、Range 下载的前端设计」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 复盘时先确认「大文件上传、断点续传、Range 下载的前端设计」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「大文件上传、断点续传、Range 下载的前端设计」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「大文件上传、断点续传、Range 下载的前端设计」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## dns-cdn-followup-2

title: 追问：在当前团队与业务约束下，围绕「DNS、CDN 与接入层优化的前端视角」这条链路，你会怎么定超时、重试、幂等和降级策略
difficulty: 进阶
tags: [DNS, CDN, 追问]
parent: dns-cdn
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「DNS、CDN 与接入层优化的前端视角」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> DNS 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「DNS、CDN 与接入层优化的前端视角」这条链路，你会怎么定超时、重试、幂等和降级策略？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「DNS、CDN 与接入层优化的前端视角」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> DNS 方案动作 -> 验证结果」，并用「DNS、CDN 与接入层优化的前端视角」举一条主链路说明。
- 讲「DNS、CDN 与接入层优化的前端视角」时实现侧重点应放在 DNS 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力
- 未命中时会回源，回源链路和缓存键策略会影响最终性能
- dns-prefetch 提前解析域名；preconnect 提前建立 TCP/TLS
- 结合一次「DNS、CDN 与接入层优化的前端视角」线上案例说明 DNS 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「DNS、CDN 与接入层优化的前端视角」的最小可复现样例，再扩展到主链路回归，这样能更快确认 DNS 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「DNS、CDN 与接入层优化的前端视角」里的 DNS，否则很难证明变化来自这次改动。
- 涉及「DNS、CDN 与接入层优化的前端视角」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「DNS、CDN 与接入层优化的前端视角」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「DNS、CDN 与接入层优化的前端视角」里 DNS 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「DNS、CDN 与接入层优化的前端视角」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## dns-cdn-followup-3

title: 追问：结合真实业务约束，围绕「DNS、CDN 与接入层优化的前端视角」上线后的稳定性，你会先盯哪几组信号判断风险在收敛还是在扩散
difficulty: 进阶
tags: [DNS, CDN, 追问]
parent: dns-cdn
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「DNS、CDN 与接入层优化的前端视角」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> DNS 方案动作 -> 验证结果」，并用「DNS、CDN 与接入层优化的前端视角」举一条主链路说明。。

### 题目

如果面试官追问：结合真实业务约束，围绕「DNS、CDN 与接入层优化的前端视角」上线后的稳定性，你会先盯哪几组信号判断风险在收敛还是在扩散？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「DNS、CDN 与接入层优化的前端视角」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> DNS 方案动作 -> 验证结果」，并用「DNS、CDN 与接入层优化的前端视角」举一条主链路说明。
- 如果涉及「DNS、CDN 与接入层优化的前端视角」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- CDN 把静态资源分发到边缘节点，减少 RTT 和源站压力
- dns-prefetch 提前解析域名；preconnect 提前建立 TCP/TLS
- 回答「DNS、CDN 与接入层优化的前端视角」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 给出与「DNS、CDN 与接入层优化的前端视角」相关的业务上下文，说明 DNS 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「DNS、CDN 与接入层优化的前端视角」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 DNS 的缺口。
- 围绕「DNS、CDN 与接入层优化的前端视角」的观测层要绑定 DNS 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 围绕「DNS、CDN 与接入层优化的前端视角」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「DNS、CDN 与接入层优化的前端视角」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没有针对「DNS、CDN 与接入层优化的前端视角」里的 DNS 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 保持「DNS、CDN 与接入层优化的前端视角」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## quic-http3-deep-followup-2

title: 追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，围绕「HTTP/3 / QUIC 在前端工程中的可见影响」这条链路，你会怎么定超时、重试、幂等和降级策略
difficulty: 资深
tags: [HTTP/3, QUIC, 追问]
parent: quic-http3-deep
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「HTTP/3 / QUIC 在前端工程中的可见影响」在当前约束下为什么成立。；围绕「HTTP/3 / QUIC 在前端工程中的可见影响」组织答案时。

### 题目

如果面试官追问：在「HTTP/3 / QUIC 在前端工程中的可见影响」场景下，围绕「HTTP/3 / QUIC 在前端工程中的可见影响」这条链路，你会怎么定超时、重试、幂等和降级策略？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「HTTP/3 / QUIC 在前端工程中的可见影响」在当前约束下为什么成立。
- 围绕「HTTP/3 / QUIC 在前端工程中的可见影响」组织答案时，建议按「约束来源 -> HTTP/3 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「HTTP/3 / QUIC 在前端工程中的可见影响」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 回答「HTTP/3 / QUIC 在前端工程中的可见影响」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 补一个你真实处理过的「HTTP/3 / QUIC 在前端工程中的可见影响」相似场景：说明 HTTP/3 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「HTTP/3 / QUIC 在前端工程中的可见影响」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 HTTP/3 设计测试与回归流程。
- 围绕「HTTP/3 / QUIC 在前端工程中的可见影响」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 HTTP/3 的真实收益是否稳定。
- 如果「HTTP/3 / QUIC 在前端工程中的可见影响」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「HTTP/3 / QUIC 在前端工程中的可见影响」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「HTTP/3 / QUIC 在前端工程中的可见影响」里的 HTTP/3 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「HTTP/3 / QUIC 在前端工程中的可见影响」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## quic-http3-deep-followup-3

title: 追问：以「HTTP/3 / QUIC 在前端工程中的可见影响」为例，你会如何把「HTTP/3 / QUIC 在前端工程中的可见影响」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定
difficulty: 资深
tags: [HTTP/3, QUIC, 追问]
parent: quic-http3-deep
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「HTTP/3 / QUIC 在前端工程中的可见影响」落到真实交付，而不是停在概念层。；可以按「问题背景 -> HTTP/3 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：以「HTTP/3 / QUIC 在前端工程中的可见影响」为例，你会如何把「HTTP/3 / QUIC 在前端工程中的可见影响」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「HTTP/3 / QUIC 在前端工程中的可见影响」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> HTTP/3 机制 -> 取舍边界」回答，再用「HTTP/3 / QUIC 在前端工程中的可见影响」补一个反例，避免停在口号层。
- 讲「HTTP/3 / QUIC 在前端工程中的可见影响」时实现侧重点应放在 HTTP/3 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 回答「HTTP/3 / QUIC 在前端工程中的可见影响」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 相关标签是 HTTP/3、QUIC，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- HTTP/3 收益最明显的是中等延迟 + 抖动场景（跨国、移动网）
- 把原题观点放进「HTTP/3 / QUIC 在前端工程中的可见影响」的一个具体版本迭代里，讲清 HTTP/3 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「HTTP/3 / QUIC 在前端工程中的可见影响」在 HTTP/3 上的优化不是只在 demo 数据下成立。
- 围绕「HTTP/3 / QUIC 在前端工程中的可见影响」建监控时，建议把 HTTP/3 指标和业务转化指标并排展示，避免只看技术侧信号。
- 涉及「HTTP/3 / QUIC 在前端工程中的可见影响」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「HTTP/3 / QUIC 在前端工程中的可见影响」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 只关注「HTTP/3 / QUIC 在前端工程中的可见影响」里 HTTP/3 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 表达「HTTP/3 / QUIC 在前端工程中的可见影响」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## https-handshake-followup-2

title: 追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，你会怎样验证「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 进阶
tags: [TLS, 安全, 追问]
parent: https-handshake
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」不是只在理想输入下成立。；再补可观测指标：围绕「HTTPS 握手过程。

### 题目

如果面试官追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，你会怎样验证「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」不是只在理想输入下成立。
- 再补可观测指标：围绕「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 开口先讲「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## https-handshake-followup-3

title: 追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，如果「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」必须在安全和体验之间做权衡，你会先守住哪些底线
difficulty: 进阶
tags: [TLS, 安全, 追问]
parent: https-handshake
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」在当前约束下为什么成立。；回答结构可按「触发条件 -> TLS 机制 -> 风险兜底」展开，并以「HTTPS 握手过程。

### 题目

如果面试官追问：以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」为例，如果「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」必须在安全和体验之间做权衡，你会先守住哪些底线？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」在当前约束下为什么成立。
- 回答结构可按「触发条件 -> TLS 机制 -> 风险兜底」展开，并以「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」补一条失败场景，能体现工程拆解能力。
- 不要只罗列工具名或 API，最好把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- TLS 1.2：2-RTT 握手（ClientHello → ServerHello + Cert + KeyExchange → ClientKeyExchange + Finished → Finished）
- TLS 1.3：1-RTT 握手；客户端 Hello 同时携带 KeyShare，服务端 Hello + Cert 一次返回；后续应用数据
- TLS 1.3 还支持 0-RTT（PSK / Session Ticket），但有重放风险
- 补一个你真实处理过的「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」相似场景：说明 TLS 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 TLS 设计测试与回归流程。
- 围绕「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 TLS 的真实收益是否稳定。
- 如果「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」里的 TLS 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## websocket-vs-sse-vs-polling-followup-2

title: 追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，你会如何给「长轮询 / WebSocket / SSE 怎么选」设计“失败可恢复、重复不出错、超时可止损”的机制
difficulty: 进阶
tags: [实时, 推送, 追问]
parent: websocket-vs-sse-vs-polling
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「长轮询 / WebSocket / SSE 怎么选」在当前约束下为什么成立。；围绕「长轮询 / WebSocket / SSE 怎么选」组织答案时，建议按「约束来源 -> 实时 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：在「长轮询 / WebSocket / SSE 怎么选」场景下，你会如何给「长轮询 / WebSocket / SSE 怎么选」设计“失败可恢复、重复不出错、超时可止损”的机制？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「长轮询 / WebSocket / SSE 怎么选」在当前约束下为什么成立。
- 围绕「长轮询 / WebSocket / SSE 怎么选」组织答案时，建议按「约束来源 -> 实时 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「长轮询 / WebSocket / SSE 怎么选」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 长轮询（Long Polling）：服务器 hold 住请求直到有数据；HTTP/1.1 兼容性好
- SSE（Server-Sent Events）：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制
- WebSocket：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻
- 把原题观点放进「长轮询 / WebSocket / SSE 怎么选」的一个具体版本迭代里，讲清 实时 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「长轮询 / WebSocket / SSE 怎么选」在 实时 上的优化不是只在 demo 数据下成立。
- 围绕「长轮询 / WebSocket / SSE 怎么选」建监控时，建议把 实时 指标和业务转化指标并排展示，避免只看技术侧信号。
- 如果「长轮询 / WebSocket / SSE 怎么选」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「长轮询 / WebSocket / SSE 怎么选」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 只关注「长轮询 / WebSocket / SSE 怎么选」里 实时 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 不要把「长轮询 / WebSocket / SSE 怎么选」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## websocket-vs-sse-vs-polling-followup-3

title: 追问：为了复盘「长轮询 / WebSocket / SSE 怎么选」上线质量，你会如何组织日志、指标和告警证据链
difficulty: 进阶
tags: [实时, 推送, 追问]
parent: websocket-vs-sse-vs-polling
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「长轮询 / WebSocket / SSE 怎么选」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 实时 方案动作 -> 验证结果」。

### 题目

如果面试官追问：为了复盘「长轮询 / WebSocket / SSE 怎么选」上线质量，你会如何组织日志、指标和告警证据链？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「长轮询 / WebSocket / SSE 怎么选」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> 实时 方案动作 -> 验证结果」，并用「长轮询 / WebSocket / SSE 怎么选」举一条主链路说明。
- 如果涉及「长轮询 / WebSocket / SSE 怎么选」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 长轮询（Long Polling）：服务器 hold 住请求直到有数据；HTTP/1.1 兼容性好
- SSE（Server-Sent Events）：基于 HTTP 的单向推送（服务器→客户端）；自动重连、事件 ID 续传；不支持二进制
- WebSocket：双向，二进制/文本，握手后是 TCP 长连接；低延迟、协议轻
- 若能补一段「长轮询 / WebSocket / SSE 怎么选」复盘片段，解释 实时 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「长轮询 / WebSocket / SSE 怎么选」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 实时 的预期结果写成可复核标准。
- 在「长轮询 / WebSocket / SSE 怎么选」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 实时 的问题定位闭环。
- 围绕「长轮询 / WebSocket / SSE 怎么选」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「长轮询 / WebSocket / SSE 怎么选」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没说明「长轮询 / WebSocket / SSE 怎么选」在 实时 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 保持「长轮询 / WebSocket / SSE 怎么选」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## cors-and-preflight-followup-2

title: 追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，围绕「跨域与 CORS 预检，谁触发了 OPTIONS」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [CORS, 安全, 追问]
parent: cors-and-preflight
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「跨域与 CORS 预检，谁触发了 OPTIONS」不是只在理想输入下成立。；再补可观测指标：围绕「跨域与 CORS 预检。

### 题目

如果面试官追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，围绕「跨域与 CORS 预检，谁触发了 OPTIONS」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「跨域与 CORS 预检，谁触发了 OPTIONS」不是只在理想输入下成立。
- 再补可观测指标：围绕「跨域与 CORS 预检，谁触发了 OPTIONS」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「跨域与 CORS 预检，谁触发了 OPTIONS」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「跨域与 CORS 预检，谁触发了 OPTIONS」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「跨域与 CORS 预检，谁触发了 OPTIONS」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「跨域与 CORS 预检，谁触发了 OPTIONS」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## cors-and-preflight-followup-3

title: 追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，你会如何把「跨域与 CORS 预检，谁触发了 OPTIONS」的取舍逻辑转成可执行的发布策略和监控标准
difficulty: 进阶
tags: [CORS, 安全, 追问]
parent: cors-and-preflight
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「跨域与 CORS 预检，谁触发了 OPTIONS」时要能同时解释收益、代价和失败信号。；讲「跨域与 CORS 预检，谁触发了 OPTIONS」时先给 CORS 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「跨域与 CORS 预检，谁触发了 OPTIONS」为例，你会如何把「跨域与 CORS 预检，谁触发了 OPTIONS」的取舍逻辑转成可执行的发布策略和监控标准？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「跨域与 CORS 预检，谁触发了 OPTIONS」时要能同时解释收益、代价和失败信号。
- 讲「跨域与 CORS 预检，谁触发了 OPTIONS」时先给 CORS 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「跨域与 CORS 预检，谁触发了 OPTIONS」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 触发预检（OPTIONS）的情况：自定义头、PUT/DELETE/PATCH、application/json
- 预检响应必须带 Access-Control-Allow-Methods / Headers / Origin，可用 Access-Control-Max-Age 缓存
- 回答「跨域与 CORS 预检，谁触发了 OPTIONS」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 把原题观点放进「跨域与 CORS 预检，谁触发了 OPTIONS」的一个具体版本迭代里，讲清 CORS 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「跨域与 CORS 预检，谁触发了 OPTIONS」在 CORS 上的优化不是只在 demo 数据下成立。
- 围绕「跨域与 CORS 预检，谁触发了 OPTIONS」建监控时，建议把 CORS 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「跨域与 CORS 预检，谁触发了 OPTIONS」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「跨域与 CORS 预检，谁触发了 OPTIONS」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「跨域与 CORS 预检，谁触发了 OPTIONS」里 CORS 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「跨域与 CORS 预检，谁触发了 OPTIONS」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## status-codes-followup-2

title: 追问：在「HTTP 常见状态码及其含义」场景下，围绕「HTTP 常见状态码及其含义」这条链路，你会怎么定超时、重试、幂等和降级策略
difficulty: 基础
tags: [HTTP, 高频, 追问]
parent: status-codes
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「HTTP 常见状态码及其含义」时要能同时解释收益、代价和失败信号。；讲「HTTP 常见状态码及其含义」时先给 HTTP 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在「HTTP 常见状态码及其含义」场景下，围绕「HTTP 常见状态码及其含义」这条链路，你会怎么定超时、重试、幂等和降级策略？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「HTTP 常见状态码及其含义」时要能同时解释收益、代价和失败信号。
- 讲「HTTP 常见状态码及其含义」时先给 HTTP 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「HTTP 常见状态码及其含义」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 422 Unprocessable Entity（参数校验失败，REST 常见）、429 Too Many Requests（限流）
- 回答「HTTP 常见状态码及其含义」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 若能补一段「HTTP 常见状态码及其含义」复盘片段，解释 HTTP 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「HTTP 常见状态码及其含义」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 HTTP 的预期结果写成可复核标准。
- 在「HTTP 常见状态码及其含义」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 HTTP 的问题定位闭环。
- 围绕「HTTP 常见状态码及其含义」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「HTTP 常见状态码及其含义」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没说明「HTTP 常见状态码及其含义」在 HTTP 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 保持「HTTP 常见状态码及其含义」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## status-codes-followup-3

title: 追问：以「HTTP 常见状态码及其含义」为例，为了复盘「HTTP 常见状态码及其含义」上线质量，你会如何组织日志、指标和告警证据链
difficulty: 基础
tags: [HTTP, 高频, 追问]
parent: status-codes
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「HTTP 常见状态码及其含义」时要能同时解释收益、代价和失败信号。；讲「HTTP 常见状态码及其含义」时先给 HTTP 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「HTTP 常见状态码及其含义」为例，为了复盘「HTTP 常见状态码及其含义」上线质量，你会如何组织日志、指标和告警证据链？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「HTTP 常见状态码及其含义」时要能同时解释收益、代价和失败信号。
- 讲「HTTP 常见状态码及其含义」时先给 HTTP 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「HTTP 常见状态码及其含义」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 422 Unprocessable Entity（参数校验失败，REST 常见）、429 Too Many Requests（限流）
- 回答「HTTP 常见状态码及其含义」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 相关标签是 HTTP、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 把原题观点放进「HTTP 常见状态码及其含义」的一个具体版本迭代里，讲清 HTTP 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「HTTP 常见状态码及其含义」在 HTTP 上的优化不是只在 demo 数据下成立。
- 围绕「HTTP 常见状态码及其含义」建监控时，建议把 HTTP 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「HTTP 常见状态码及其含义」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「HTTP 常见状态码及其含义」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「HTTP 常见状态码及其含义」里 HTTP 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「HTTP 常见状态码及其含义」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## early-hints-103-followup-2

title: 追问：要证明「HTTP 103 Early Hints 是什么？怎么用来优化首屏」确实改善体验，你会如何围绕 HTTP 设计线上观测与对照验证
difficulty: 资深
tags: [HTTP, 性能, 高频, 追问]
parent: early-hints-103
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP 103 Early Hints 是什么？怎么用来优化首屏」不是只在理想输入下成立。。

### 题目

如果面试官追问：要证明「HTTP 103 Early Hints 是什么？怎么用来优化首屏」确实改善体验，你会如何围绕 HTTP 设计线上观测与对照验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「HTTP 103 Early Hints 是什么？怎么用来优化首屏」不是只在理想输入下成立。
- 再补可观测指标：围绕「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「HTTP 103 Early Hints 是什么？怎么用来优化首屏」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「HTTP 103 Early Hints 是什么？怎么用来优化首屏」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「HTTP 103 Early Hints 是什么？怎么用来优化首屏」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## early-hints-103-followup-3

title: 追问：如果「HTTP 103 Early Hints 是什么？怎么用来优化首屏」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 资深
tags: [HTTP, 性能, 高频, 追问]
parent: early-hints-103
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「HTTP 103 Early Hints 是什么？怎么用来优化首屏」落到真实交付，而不是停在概念层。；可以按「问题背景 -> HTTP 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：如果「HTTP 103 Early Hints 是什么？怎么用来优化首屏」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「HTTP 103 Early Hints 是什么？怎么用来优化首屏」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> HTTP 机制 -> 取舍边界」回答，再用「HTTP 103 Early Hints 是什么？怎么用来优化首屏」补一个反例，避免停在口号层。
- 讲「HTTP 103 Early Hints 是什么？怎么用来优化首屏」时实现侧重点应放在 HTTP 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- HTTP/1.1 早就有 100/101/102 等 1xx
- 103 Early Hints 是为前端性能新增的"准官方"用法（RFC 8297）
- 浏览器请求 / page → 服务器先回 103 Early Hints 附带 Link 头
- 给出与「HTTP 103 Early Hints 是什么？怎么用来优化首屏」相关的业务上下文，说明 HTTP 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「HTTP 103 Early Hints 是什么？怎么用来优化首屏」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 HTTP 的缺口。
- 围绕「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的观测层要绑定 HTTP 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 涉及「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「HTTP 103 Early Hints 是什么？怎么用来优化首屏」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没有针对「HTTP 103 Early Hints 是什么？怎么用来优化首屏」里的 HTTP 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 表达「HTTP 103 Early Hints 是什么？怎么用来优化首屏」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## bfcache-frontend-followup-2

title: 追问：你会怎样验证「bfcache（前进/后退缓存）你怎么用好它」在 浏览器 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [浏览器, 性能, 高频, 追问]
parent: bfcache-frontend
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「bfcache（前进/后退缓存）你怎么用好它」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会怎样验证「bfcache（前进/后退缓存）你怎么用好它」在 浏览器 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「bfcache（前进/后退缓存）你怎么用好它」不是只在理想输入下成立。
- 再补可观测指标：围绕「bfcache（前进/后退缓存）你怎么用好它」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「bfcache（前进/后退缓存）你怎么用好它」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 回答前先列出「bfcache（前进/后退缓存）你怎么用好它」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「bfcache（前进/后退缓存）你怎么用好它」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「bfcache（前进/后退缓存）你怎么用好它」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## bfcache-frontend-followup-3

title: 追问：如果「bfcache你怎么用好它」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 资深
tags: [浏览器, 性能, 高频, 追问]
parent: bfcache-frontend
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「bfcache你怎么用好它」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 浏览器 方案动作 -> 验证结果」，并用「bfcache你怎么用好它」举一条主链路说明。。

### 题目

如果面试官追问：如果「bfcache你怎么用好它」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「bfcache你怎么用好它」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> 浏览器 方案动作 -> 验证结果」，并用「bfcache你怎么用好它」举一条主链路说明。
- 如果涉及「bfcache你怎么用好它」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 被踢出 bfcache 的常见原因（DevTools → Application → Back/forward cache）
- 用 pagehide.persisted 判断是否进 bfcache，true 时 cleanup
- 用 pageshow.persisted 判断是否从 bfcache 恢复，true 时 refresh 关键数据（如未读消息）
- 把原题观点放进「bfcache你怎么用好它」的一个具体版本迭代里，讲清 浏览器 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「bfcache你怎么用好它」在 浏览器 上的优化不是只在 demo 数据下成立。
- 围绕「bfcache你怎么用好它」建监控时，建议把 浏览器 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「bfcache你怎么用好它」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「bfcache你怎么用好它」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「bfcache你怎么用好它」里 浏览器 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「bfcache你怎么用好它」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## request-race-cancel-dedupe-followup-1

title: 追问：以「前端请求竞态、取消、去重与幂等怎么处理」为例，GET 请求去重和 POST 请求幂等有什么本质差别
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理, 追问]
parent: request-race-cancel-dedupe
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「前端请求竞态、取消、去重与幂等怎么处理」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 并发 机制 -> 风险兜底」展开，并以「前端请求竞态、取消、去重与幂等怎么处理」补一条失败场景。

### 题目

如果面试官追问：以「前端请求竞态、取消、去重与幂等怎么处理」为例，GET 请求去重和 POST 请求幂等有什么本质差别？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「前端请求竞态、取消、去重与幂等怎么处理」讲成只在理想输入下可用。
- 回答结构可按「触发条件 -> 并发 机制 -> 风险兜底」展开，并以「前端请求竞态、取消、去重与幂等怎么处理」补一条失败场景，能体现工程拆解能力。
- 在「前端请求竞态、取消、去重与幂等怎么处理」回答里，实现层面要解释 并发 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 竞态的本质是“响应返回顺序不等于用户最新意图”：旧搜索请求可能晚于新请求返回，旧 Tab 数据可能覆盖当前 Tab。
- 取消分两层：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 去重适合相同资源读取：同 URL、同参数、同身份的 GET 可以共享 pending promise；写操作不要盲目去重，要按业务幂等键判断。
- 把原题观点放进「前端请求竞态、取消、去重与幂等怎么处理」的一个具体版本迭代里，讲清 并发 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「前端请求竞态、取消、去重与幂等怎么处理」在 并发 上的优化不是只在 demo 数据下成立。
- 围绕「前端请求竞态、取消、去重与幂等怎么处理」建监控时，建议把 并发 指标和业务转化指标并排展示，避免只看技术侧信号。
- 「前端请求竞态、取消、去重与幂等怎么处理」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「前端请求竞态、取消、去重与幂等怎么处理」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 只关注「前端请求竞态、取消、去重与幂等怎么处理」里 并发 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 避免把「前端请求竞态、取消、去重与幂等怎么处理」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## request-race-cancel-dedupe-followup-2

title: 追问：从工程落地角度看，慢请求晚于新请求返回时，你会选择丢弃、缓存还是合并
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理, 追问]
parent: request-race-cancel-dedupe
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端请求竞态、取消、去重与幂等怎么处理」落到真实交付，而不是停在概念层。；可以按「问题背景 -> 并发 机制 -> 取舍边界」回答，再用「前端请求竞态、取消、去重与幂等怎么处理」补一个反例。

### 题目

如果面试官追问：从工程落地角度看，慢请求晚于新请求返回时，你会选择丢弃、缓存还是合并？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「前端请求竞态、取消、去重与幂等怎么处理」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> 并发 机制 -> 取舍边界」回答，再用「前端请求竞态、取消、去重与幂等怎么处理」补一个反例，避免停在口号层。
- 讲「前端请求竞态、取消、去重与幂等怎么处理」时实现侧重点应放在 并发 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 竞态的本质是“响应返回顺序不等于用户最新意图”：旧搜索请求可能晚于新请求返回，旧 Tab 数据可能覆盖当前 Tab。
- 取消分两层：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- UI 状态要按 requestId 或 version 更新：只有当前请求能写入结果、错误和 loading；旧请求返回只能丢弃或写入缓存。
- 结合一次「前端请求竞态、取消、去重与幂等怎么处理」线上案例说明 并发 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「前端请求竞态、取消、去重与幂等怎么处理」的最小可复现样例，再扩展到主链路回归，这样能更快确认 并发 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「前端请求竞态、取消、去重与幂等怎么处理」里的 并发，否则很难证明变化来自这次改动。
- 涉及「前端请求竞态、取消、去重与幂等怎么处理」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「前端请求竞态、取消、去重与幂等怎么处理」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「前端请求竞态、取消、去重与幂等怎么处理」里 并发 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「前端请求竞态、取消、去重与幂等怎么处理」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## request-race-cancel-dedupe-followup-3

title: 追问：在「前端请求竞态、取消、去重与幂等怎么处理」场景下，如果用户离开页面后请求成功了，前端和服务端分别应该怎么处理
difficulty: 进阶
tags: [AbortController, 并发, 幂等, 请求治理, 追问]
parent: request-race-cancel-dedupe
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端请求竞态、取消、去重与幂等怎么处理」落到真实交付，而不是停在概念层。；讲「前端请求竞态、取消、去重与幂等怎么处理」时先给 并发 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在「前端请求竞态、取消、去重与幂等怎么处理」场景下，如果用户离开页面后请求成功了，前端和服务端分别应该怎么处理？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「前端请求竞态、取消、去重与幂等怎么处理」落到真实交付，而不是停在概念层。
- 讲「前端请求竞态、取消、去重与幂等怎么处理」时先给 并发 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 讲「前端请求竞态、取消、去重与幂等怎么处理」时实现侧重点应放在 并发 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 竞态的本质是“响应返回顺序不等于用户最新意图”：旧搜索请求可能晚于新请求返回，旧 Tab 数据可能覆盖当前 Tab。
- 取消分两层：AbortController 可以中止 fetch 和响应体读取，但请求可能已经到达服务端；服务端副作用仍需要幂等键或事务保护。
- 去重适合相同资源读取：同 URL、同参数、同身份的 GET 可以共享 pending promise；写操作不要盲目去重，要按业务幂等键判断。
- 给出与「前端请求竞态、取消、去重与幂等怎么处理」相关的业务上下文，说明 并发 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「前端请求竞态、取消、去重与幂等怎么处理」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 并发 的缺口。
- 围绕「前端请求竞态、取消、去重与幂等怎么处理」的观测层要绑定 并发 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 涉及「前端请求竞态、取消、去重与幂等怎么处理」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「前端请求竞态、取消、去重与幂等怎么处理」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没有针对「前端请求竞态、取消、去重与幂等怎么处理」里的 并发 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 表达「前端请求竞态、取消、去重与幂等怎么处理」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## webrtc-basic-followup-2

title: 追问：从工程落地角度看，你会如何围绕 WebRTC 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [WebRTC, P2P, 追问]
parent: webrtc-basic
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「WebRTC 基础：为什么 P2P 仍然需要服务器」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> WebRTC 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 WebRTC 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「WebRTC 基础：为什么 P2P 仍然需要服务器」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> WebRTC 方案动作 -> 验证结果」，并用「WebRTC 基础：为什么 P2P 仍然需要服务器」举一条主链路说明。
- 讲「WebRTC 基础：为什么 P2P 仍然需要服务器」时实现侧重点应放在 WebRTC 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 回答「WebRTC 基础：为什么 P2P 仍然需要服务器」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 相关标签是 WebRTC、P2P，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 结合一次「WebRTC 基础：为什么 P2P 仍然需要服务器」线上案例说明 WebRTC 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「WebRTC 基础：为什么 P2P 仍然需要服务器」的最小可复现样例，再扩展到主链路回归，这样能更快确认 WebRTC 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「WebRTC 基础：为什么 P2P 仍然需要服务器」里的 WebRTC，否则很难证明变化来自这次改动。
- 涉及「WebRTC 基础：为什么 P2P 仍然需要服务器」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「WebRTC 基础：为什么 P2P 仍然需要服务器」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「WebRTC 基础：为什么 P2P 仍然需要服务器」里 WebRTC 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「WebRTC 基础：为什么 P2P 仍然需要服务器」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## webrtc-basic-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 WebRTC 调整「WebRTC 基础：为什么 P2P 仍然需要服务器」的推进顺序
difficulty: 资深
tags: [WebRTC, P2P, 追问]
parent: webrtc-basic
generated: followup-script

### 一句话

规模变大后先重新评估「WebRTC 基础：为什么 P2P 仍然需要服务器」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「WebRTC 基础：为什么 P2P 仍然需要服务器」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 WebRTC 调整「WebRTC 基础：为什么 P2P 仍然需要服务器」的推进顺序？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「WebRTC 基础：为什么 P2P 仍然需要服务器」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「WebRTC 基础：为什么 P2P 仍然需要服务器」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「WebRTC 基础：为什么 P2P 仍然需要服务器」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 回答前先列出「WebRTC 基础：为什么 P2P 仍然需要服务器」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「WebRTC 基础：为什么 P2P 仍然需要服务器」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「WebRTC 基础：为什么 P2P 仍然需要服务器」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## timeout-retry-budget

title: 超时预算、重试策略与重试风暴治理
difficulty: 资深
tags: [超时, 重试, 稳定性]
followups: [timeout-retry-budget-followup-1, timeout-retry-budget-followup-2, timeout-retry-budget-followup-3]

### 一句话

超时和重试要按“端到端预算”设计：先分配每一跳的 deadline，再限制重试次数与退避策略，配合幂等和熔断，避免把局部抖动放大成全链路雪崩。

### 题目

一个前端请求经由 CDN、网关、BFF、下游服务，偶发超时且峰值时会出现重试风暴。你会如何设计超时预算与重试策略，兼顾成功率和系统稳定性？

### 答案要点

- 先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 超时要分类型：连接超时、读超时、总超时分别治理；只配一个全局 timeout 往往无法定位瓶颈。
- 重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 写操作必须配幂等键；没有幂等语义就重试，极易导致重复扣费、重复写入、状态污染。
- 熔断与降级要联动：错误率或 P99 超阈值时快速失败，返回缓存/兜底数据，并阻断继续放量。
- 上线验证要看“成功率上升 + 下游压力不失控”：重试率、超时率、熔断触发次数、平均重试成本都要纳入验收。

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

CDN 缓存治理不是“全站一键 purge”，而是把版本化、分层 TTL、按 key/tag 失效和回源保护组合起来，在发布速度、命中率和数据一致性之间做可解释取舍。

### 题目

你们站点在大促前刚做完 CDN 优化，命中率上去了，但发布后偶发“部分用户看到旧内容”。你会如何设计缓存失效策略，既避免脏数据又不把回源打爆？

### 答案要点

- 静态资源优先用 hash 文件名 + 长缓存（immutable）；业务页面和 API 用短 TTL + 协商缓存，不同类型不能一刀切。
- 发布失效优先按 key/tag 精准 purge，避免全站 purge 导致瞬时回源洪峰。
- 关键数据链路要配主动失效（发布事件触发）+ 被动过期（TTL）双保险，减少“新旧版本混读”窗口。
- 回源保护要配请求合并和并发上限，防止热点 key 到期时缓存击穿。
- 对可容忍短暂旧值的内容可用 stale-while-revalidate，先保用户响应，再后台刷新。
- 验证不能只看命中率：还要看脏读投诉、回源 QPS、失效传播时延、发布后错误率。

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

先说判断标准，再说执行路径：回答「超时预算、重试策略与重试风暴治理」时要能同时解释收益、代价和失败信号。；讲「超时预算、重试策略与重试风暴治理」时先给 超时 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「超时预算、重试策略与重试风暴治理」为例，你会如何识别「超时预算、重试策略与重试风暴治理」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「超时预算、重试策略与重试风暴治理」时要能同时解释收益、代价和失败信号。
- 讲「超时预算、重试策略与重试风暴治理」时先给 超时 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「超时预算、重试策略与重试风暴治理」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 超时要分类型：连接超时、读超时、总超时分别治理；只配一个全局 timeout 往往无法定位瓶颈。
- 重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 把原题观点放进「超时预算、重试策略与重试风暴治理」的一个具体版本迭代里，讲清 超时 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「超时预算、重试策略与重试风暴治理」在 超时 上的优化不是只在 demo 数据下成立。
- 围绕「超时预算、重试策略与重试风暴治理」建监控时，建议把 超时 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「超时预算、重试策略与重试风暴治理」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「超时预算、重试策略与重试风暴治理」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「超时预算、重试策略与重试风暴治理」里 超时 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「超时预算、重试策略与重试风暴治理」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## timeout-retry-budget-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 超时 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [超时, 重试, 稳定性, 追问]
parent: timeout-retry-budget
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「超时预算、重试策略与重试风暴治理」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 超时 方案动作 -> 验证结果」，并用「超时预算、重试策略与重试风暴治理」举一条主链路说明。。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 超时 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「超时预算、重试策略与重试风暴治理」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> 超时 方案动作 -> 验证结果」，并用「超时预算、重试策略与重试风暴治理」举一条主链路说明。
- 如果涉及「超时预算、重试策略与重试风暴治理」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 先定义端到端 SLA（例如 800ms），再把预算拆到各跳（CDN/网关/BFF/下游），避免每层都用 1s 超时导致累计失控。
- 超时要分类型：连接超时、读超时、总超时分别治理；只配一个全局 timeout 往往无法定位瓶颈。
- 重试只对可恢复错误生效（超时、429、部分 5xx），并限制次数（通常 1~2 次）+ 指数退避 + 抖动，防止同频重试打爆下游。
- 若能补一段「超时预算、重试策略与重试风暴治理」复盘片段，解释 超时 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「超时预算、重试策略与重试风暴治理」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 超时 的预期结果写成可复核标准。
- 在「超时预算、重试策略与重试风暴治理」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 超时 的问题定位闭环。
- 围绕「超时预算、重试策略与重试风暴治理」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「超时预算、重试策略与重试风暴治理」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没说明「超时预算、重试策略与重试风暴治理」在 超时 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 保持「超时预算、重试策略与重试风暴治理」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## timeout-retry-budget-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「超时预算、重试策略与重试风暴治理」还值不值得继续维护
difficulty: 资深
tags: [超时, 重试, 稳定性, 追问]
parent: timeout-retry-budget
generated: followup-script

### 一句话

先把「超时预算、重试策略与重试风暴治理」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「超时预算、重试策略与重试风暴治理」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「超时预算、重试策略与重试风暴治理」还值不值得继续维护？

### 答案要点

#### 核心回答

- 先把「超时预算、重试策略与重试风暴治理」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「超时预算、重试策略与重试风暴治理」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「超时预算、重试策略与重试风暴治理」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 先用一句话给出「超时预算、重试策略与重试风暴治理」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「超时预算、重试策略与重试风暴治理」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「超时预算、重试策略与重试风暴治理」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## cdn-cache-invalidation-followup-1

title: 追问：在「CDN 缓存失效：Purge、版本化与一致性取舍」场景下，当「CDN 缓存失效：Purge、版本化与一致性取舍」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [CDN, 缓存, 一致性, 追问]
parent: cdn-cache-invalidation
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「CDN 缓存失效：Purge、版本化与一致性取舍」讲成只在理想输入下可用。；回答结构可按「触发条件 -> CDN 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：在「CDN 缓存失效：Purge、版本化与一致性取舍」场景下，当「CDN 缓存失效：Purge、版本化与一致性取舍」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「CDN 缓存失效：Purge、版本化与一致性取舍」讲成只在理想输入下可用。
- 回答结构可按「触发条件 -> CDN 机制 -> 风险兜底」展开，并以「CDN 缓存失效：Purge、版本化与一致性取舍」补一条失败场景，能体现工程拆解能力。
- 在「CDN 缓存失效：Purge、版本化与一致性取舍」回答里，实现层面要解释 CDN 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 静态资源优先用 hash 文件名 + 长缓存（immutable）；业务页面和 API 用短 TTL + 协商缓存，不同类型不能一刀切。
- 发布失效优先按 key/tag 精准 purge，避免全站 purge 导致瞬时回源洪峰。
- 关键数据链路要配主动失效（发布事件触发）+ 被动过期（TTL）双保险，减少“新旧版本混读”窗口。
- 把原题观点放进「CDN 缓存失效：Purge、版本化与一致性取舍」的一个具体版本迭代里，讲清 CDN 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「CDN 缓存失效：Purge、版本化与一致性取舍」在 CDN 上的优化不是只在 demo 数据下成立。
- 围绕「CDN 缓存失效：Purge、版本化与一致性取舍」建监控时，建议把 CDN 指标和业务转化指标并排展示，避免只看技术侧信号。
- 「CDN 缓存失效：Purge、版本化与一致性取舍」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「CDN 缓存失效：Purge、版本化与一致性取舍」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 只关注「CDN 缓存失效：Purge、版本化与一致性取舍」里 CDN 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 避免把「CDN 缓存失效：Purge、版本化与一致性取舍」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## cdn-cache-invalidation-followup-2

title: 追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，要证明「CDN 缓存失效：Purge、版本化与一致性取舍」确实改善体验，你会如何围绕 CDN 设计线上观测与对照验证
difficulty: 资深
tags: [CDN, 缓存, 一致性, 追问]
parent: cdn-cache-invalidation
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「CDN 缓存失效：Purge、版本化与一致性取舍」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，要证明「CDN 缓存失效：Purge、版本化与一致性取舍」确实改善体验，你会如何围绕 CDN 设计线上观测与对照验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「CDN 缓存失效：Purge、版本化与一致性取舍」不是只在理想输入下成立。
- 再补可观测指标：围绕「CDN 缓存失效：Purge、版本化与一致性取舍」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「CDN 缓存失效：Purge、版本化与一致性取舍」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「CDN 缓存失效：Purge、版本化与一致性取舍」的核心机制，再补一个会失败的具体场景。
- 准备一个与「CDN 缓存失效：Purge、版本化与一致性取舍」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「CDN 缓存失效：Purge、版本化与一致性取舍」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## cdn-cache-invalidation-followup-3

title: 追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，如果「CDN 缓存失效：Purge、版本化与一致性取舍」在 CDN 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 资深
tags: [CDN, 缓存, 一致性, 追问]
parent: cdn-cache-invalidation
generated: followup-script

### 一句话

推动「CDN 缓存失效：Purge、版本化与一致性取舍」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「CDN 缓存失效：Purge、版本化与一致性取舍」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：以「CDN 缓存失效：Purge、版本化与一致性取舍」为例，如果「CDN 缓存失效：Purge、版本化与一致性取舍」在 CDN 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 核心回答

- 推动「CDN 缓存失效：Purge、版本化与一致性取舍」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「CDN 缓存失效：Purge、版本化与一致性取舍」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「CDN 缓存失效：Purge、版本化与一致性取舍」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 开口先讲「CDN 缓存失效：Purge、版本化与一致性取舍」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「CDN 缓存失效：Purge、版本化与一致性取舍」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「CDN 缓存失效：Purge、版本化与一致性取舍」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## multi-cdn-failover-drill

title: 多 CDN 故障切流演练：探测、切换、回切与一致性验收
difficulty: 资深
tags: [CDN, 高可用, 故障演练]
followups: [multi-cdn-failover-drill-followup-1, multi-cdn-failover-drill-followup-2, multi-cdn-failover-drill-followup-3]

### 一句话

多 CDN 不是“配两家就高可用”，关键在于故障判据、切流策略和回切验收要前置演练，否则真实事故里很容易从单点故障变成全局抖动。

### 题目

你负责一个流量高峰明显的站点，采用双 CDN。某次区域性故障时主 CDN 命中率骤降、回源激增。你会如何设计自动切流与人工兜底机制，确保业务连续性？

### 答案要点

- 先定义切流触发条件：可用率、回源率、TTFB、错误码占比、探测失败连续次数都要有明确阈值。
- 切流策略分层：先区域切流，再全局切流；避免“一键全切”导致次生拥塞。
- 回切必须设冷静期与验收窗口，确认源站压力、缓存预热和错误率恢复后再逐步回切。
- DNS、边缘路由、缓存失效语义要统一，不同厂商的 purge/tag 行为差异必须提前对齐。
- 保留人工止损通道：一键降级静态兜底页、限制高成本接口、关闭非核心资源加载。
- 演练要闭环：至少季度级故障演练，复盘 MTTR、误切次数、业务损失和告警噪音。

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

弱网治理的核心不是“统一缩短超时”，而是按业务优先级定义降级矩阵：让核心链路先活下来，非核心能力按网络质量逐级退让。

### 题目

在地铁、商场等弱网场景下，页面出现加载超时和交互卡顿。你会如何设计前端网络自适应策略，兼顾核心转化与体验稳定性？

### 答案要点

- 先做能力分级：P0 核心交易、P1 关键信息、P2 增强体验分别配置不同超时和重试预算。
- 根据网络质量动态调参：`effectiveType`、`rtt`、丢包趋势决定并发数、资源尺寸和预加载策略。
- 高风险请求采用可中断机制：路由切换、重复点击、输入变化时取消旧请求，减少无效占用。
- 弱网下优先保核心：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。
- 离线或准离线状态给出明确可恢复反馈：本地草稿、重试队列、失败提示和一键重连。
- 观测上要看“体验止损是否生效”：核心成功率、首交互时间、降级命中率、用户中断率。

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

先明确这道追问要解决的业务目标，再说明「多 CDN 故障切流演练：探测、切换、回切与一致性验收」在当前约束下为什么成立。；围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」组织答案时。

### 题目

如果面试官追问：结合真实业务约束，如果要做「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「多 CDN 故障切流演练：探测、切换、回切与一致性验收」在当前约束下为什么成立。
- 围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」组织答案时，建议按「约束来源 -> CDN 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 先定义切流触发条件：可用率、回源率、TTFB、错误码占比、探测失败连续次数都要有明确阈值。
- 切流策略分层：先区域切流，再全局切流；避免“一键全切”导致次生拥塞。
- 回切必须设冷静期与验收窗口，确认源站压力、缓存预热和错误率恢复后再逐步回切。
- 把原题观点放进「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的一个具体版本迭代里，讲清 CDN 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「多 CDN 故障切流演练：探测、切换、回切与一致性验收」在 CDN 上的优化不是只在 demo 数据下成立。
- 围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」建监控时，建议把 CDN 指标和业务转化指标并排展示，避免只看技术侧信号。
- 如果「多 CDN 故障切流演练：探测、切换、回切与一致性验收」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 只关注「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里 CDN 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 不要把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## multi-cdn-failover-drill-followup-2

title: 追问：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」场景下，上线后你会盯哪些与 CDN 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [CDN, 高可用, 故障演练, 追问]
parent: multi-cdn-failover-drill
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> CDN 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」场景下，上线后你会盯哪些与 CDN 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> CDN 方案动作 -> 验证结果」，并用「多 CDN 故障切流演练：探测、切换、回切与一致性验收」举一条主链路说明。
- 讲「多 CDN 故障切流演练：探测、切换、回切与一致性验收」时实现侧重点应放在 CDN 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 先定义切流触发条件：可用率、回源率、TTFB、错误码占比、探测失败连续次数都要有明确阈值。
- 切流策略分层：先区域切流，再全局切流；避免“一键全切”导致次生拥塞。
- 回切必须设冷静期与验收窗口，确认源站压力、缓存预热和错误率恢复后再逐步回切。
- 结合一次「多 CDN 故障切流演练：探测、切换、回切与一致性验收」线上案例说明 CDN 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的最小可复现样例，再扩展到主链路回归，这样能更快确认 CDN 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的 CDN，否则很难证明变化来自这次改动。
- 涉及「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里 CDN 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「多 CDN 故障切流演练：探测、切换、回切与一致性验收」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## multi-cdn-failover-drill-followup-3

title: 追问：结合真实业务约束，遇到约束变化时，你会如何围绕 CDN 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [CDN, 高可用, 故障演练, 追问]
parent: multi-cdn-failover-drill
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」讲成只在理想输入下可用。；建议按「输入约束 -> CDN 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，遇到约束变化时，你会如何围绕 CDN 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」讲成只在理想输入下可用。
- 建议按「输入约束 -> CDN 执行链路 -> 结果验证」展开，并结合「多 CDN 故障切流演练：探测、切换、回切与一致性验收」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「多 CDN 故障切流演练：探测、切换、回切与一致性验收」回答里，实现层面要解释 CDN 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 演练要闭环：至少季度级故障演练，复盘 MTTR、误切次数、业务损失和告警噪音。
- 把探测成功当成真实可用，忽略业务接口成功率与缓存命中变化。
- 高峰业务建议预置“关键资源白名单”策略，故障时优先保障核心页面。
- 给出与「多 CDN 故障切流演练：探测、切换、回切与一致性验收」相关的业务上下文，说明 CDN 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「多 CDN 故障切流演练：探测、切换、回切与一致性验收」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 CDN 的缺口。
- 围绕「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的观测层要绑定 CDN 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 「多 CDN 故障切流演练：探测、切换、回切与一致性验收」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「多 CDN 故障切流演练：探测、切换、回切与一致性验收」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 若没有针对「多 CDN 故障切流演练：探测、切换、回切与一致性验收」里的 CDN 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 避免把「多 CDN 故障切流演练：探测、切换、回切与一致性验收」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## network-adaptive-degradation-matrix-followup-1

title: 追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」放到真实业务里，围绕 弱网 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [弱网, 降级策略, 用户体验, 追问]
parent: network-adaptive-degradation-matrix
generated: followup-script

### 一句话

先把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里的边界问题。

### 题目

如果面试官追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」放到真实业务里，围绕 弱网 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 核心回答

- 先把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

#### 学习抓手

- 先用一句话给出「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## network-adaptive-degradation-matrix-followup-2

title: 追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，你会如何围绕 弱网 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [弱网, 降级策略, 用户体验, 追问]
parent: network-adaptive-degradation-matrix
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」在当前约束下为什么成立。；建议按「输入约束 -> 弱网 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」场景下，你会如何围绕 弱网 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」在当前约束下为什么成立。
- 建议按「输入约束 -> 弱网 执行链路 -> 结果验证」展开，并结合「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 不要只罗列工具名或 API，最好把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 先做能力分级：P0 核心交易、P1 关键信息、P2 增强体验分别配置不同超时和重试预算。
- 高风险请求采用可中断机制：路由切换、重复点击、输入变化时取消旧请求，减少无效占用。
- 弱网下优先保核心：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。
- 把原题观点放进「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的一个具体版本迭代里，讲清 弱网 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」在 弱网 上的优化不是只在 demo 数据下成立。
- 围绕「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」建监控时，建议把 弱网 指标和业务转化指标并排展示，避免只看技术侧信号。
- 如果「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 只关注「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」里 弱网 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 不要把「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## network-adaptive-degradation-matrix-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 弱网 调整方案边界与实施节奏
difficulty: 资深
tags: [弱网, 降级策略, 用户体验, 追问]
parent: network-adaptive-degradation-matrix
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」时要能同时解释收益、代价和失败信号。；讲「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」时先给 弱网 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 弱网 调整方案边界与实施节奏？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」时要能同时解释收益、代价和失败信号。
- 讲「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」时先给 弱网 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 弱网下优先保核心：图片降清晰度、延后推荐流、关闭昂贵动画与非必要第三方脚本。
- 降级策略要和业务优先级绑定，避免核心与非核心请求在弱网下同等争抢资源。
- 可将弱网分层策略和 AB 实验联动，持续校准阈值而不是长期拍脑袋。
- 若能补一段「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」复盘片段，解释 弱网 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 弱网 的预期结果写成可复核标准。
- 在「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 弱网 的问题定位闭环。
- 围绕「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没说明「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」在 弱网 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 保持「弱网自适应降级矩阵：请求优先级、体验止损与恢复策略」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。
