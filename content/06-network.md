---
id: 06-network
title: 网络协议
order: 6
icon: 📡
description: TCP/IP、HTTP、TLS、缓存、跨域、实时通信与传输优化。
---

## tcp-tls-http
title: TCP、TLS、HTTP 三层关系怎么向面试官讲清楚
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
new PerformanceObserver(list => {
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

### 延伸
- 很多"接口慢"不是 HTTP 本身慢，而是下层连接建立、证书校验、丢包重传等因素叠加

## http1-http2-http3
title: HTTP/1.1、HTTP/2、HTTP/3 的关键差异
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
console.log('protocol:', nav.nextHopProtocol);    // 'h2' / 'h3' / 'http/1.1'
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
  return Promise.all(urls.map(u => fetch(u).then(r => r.json())));
}
```

### 延伸
- "升级 HTTP/2/3"不等于一定更快，还要看 CDN、客户端支持、资源组织方式
- HTTP/2 的 Server Push 虽然在协议层存在过，但现代浏览器和生态里基本已不再作为主流优化手段

## caching
title: 强缓存、协商缓存、Service Worker 缓存如何协同
difficulty: 基础
tags: [缓存, CDN]

### 一句话
强缓存命中直接不发请求：Cache-Control: max-age 优先级高于 Expires；协商缓存会发请求问服务器：ETag/If-None-Match 更精确，Last-Modified/If-Modified-Since 更轻量…。

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

### 延伸
- hash 命名 + immutable 是静态资源治理核心套路
- 不要把带 hash 的静态资源和不带 hash 的 HTML 用同一缓存策略

## cors-cross-origin
title: CORS、预检请求与常见跨域方案
difficulty: 进阶
tags: [跨域, CORS]

### 一句话
同源策略保护用户上下文和站点数据，防止任意站点读取别站响应；简单请求满足方法/头部/content-type 限制；否则先发 OPTIONS 预检…。

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
  credentials: 'include',          // 带 Cookie
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
        rewrite: p => p.replace(/^\/api/, ''),
      },
    },
  },
};
```

### 延伸
- JSONP 只能 GET 且有安全和维护成本，现在更多是历史题
- CORS 是浏览器约束，不是服务器安全边界的全部
- CORS 放行后，也不等于 Cookie 一定会跨站发送；凭证请求还受 `credentials` 配置与 Cookie `SameSite` 策略共同影响

## websocket-sse
title: WebSocket、SSE、轮询怎么选
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

### 代码示例
```ts
// 1. WebSocket：双向，自动重连
class WS {
  private ws!: WebSocket;
  private retry = 0;
  constructor(private url: string) { this.connect(); }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => { this.retry = 0; };
    this.ws.onmessage = e => this.onMessage(JSON.parse(e.data));
    this.ws.onclose = () => {
      const delay = Math.min(1000 * 2 ** this.retry++, 30_000);
      setTimeout(() => this.connect(), delay);
    };
  }

  send(data: any) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data));
  }

  onMessage(msg: any) { /* ... */ }
}

// 2. SSE：服务端推送
const es = new EventSource('/api/notifications', { withCredentials: true });
es.onmessage = e => console.log('msg:', e.data);
es.addEventListener('order-update', e => console.log('order:', (e as MessageEvent).data));
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

### 延伸
- SSE 在企业代理、CDN、超时控制上要做额外验证
- WebSocket 连接建立后不再走普通 HTTP 缓存和拦截链路
- 原生 `EventSource` 对请求方法、自定义请求头、响应控制都比较受限；若这些能力很重要，常会改用 `fetch` 流

## upload-download
title: 大文件上传、断点续传、Range 下载的前端设计
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

### 代码示例
```ts
// 大文件上传：切片 + 秒传 + 断点续传
async function upload(file: File, chunkSize = 5 * 1024 * 1024) {
  // 1. 计算 hash（在 Worker 中跑，避免阻塞）
  const hash = await hashInWorker(file);

  // 2. 询问服务端：是否秒传 / 已上传分片
  const { skip, uploaded } = await fetch('/api/upload/check', {
    method: 'POST', body: JSON.stringify({ hash, size: file.size }),
  }).then(r => r.json()) as { skip: boolean; uploaded: number[] };

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
    method: 'POST', body: JSON.stringify({ hash, total }),
  }).then(r => r.json());
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

### 延伸
- hash 计算可能很耗 CPU，适合放 Worker
- 真正可用的上传组件还要考虑暂停、重试、并发数、自定义鉴权和失败恢复

## dns-cdn
title: DNS、CDN 与接入层优化的前端视角
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
  console.log('网络类型:', conn.effectiveType);   // '4g' / '3g' / 'slow-2g'
  console.log('节省流量:', conn.saveData);
  if (conn.saveData || conn.effectiveType === 'slow-2g') {
    // 关闭自动播放、降低图片质量
    document.documentElement.classList.add('low-bandwidth');
  }
}
```

### 延伸
- CDN 不只是"快"，还是安全和可用性基础设施
- 缓存键里是否包含 query、header、cookie，会直接影响命中率
- 很多平台还会引入 WAF、Bot 防护、边缘重写和回源鉴权，因此"前端看到的网络行为"未必等于源站真实行为

## webrtc-basic
title: WebRTC 基础：为什么 P2P 仍然需要服务器
difficulty: 资深
tags: [WebRTC, P2P]

### 一句话
Signaling 服务器：交换 SDP / ICE，但本身不传媒体；常用 WebSocket；SDP（Session Description Protocol）：协商编解码、媒体方向、加密参数…。

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

### 延伸
- 大规模会议不走纯 P2P，而是 SFU（Selective Forwarding Unit），中心服务器只转发不编解码
- 数据通道可代替 WebSocket 做"同 P2P 信道"的实时数据传输（白板、协同光标）

## quic-http3-deep
title: HTTP/3 / QUIC 在前端工程中的可见影响
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

### 延伸
- HTTP/3 收益最明显的是中等延迟 + 抖动场景（跨国、移动网）
- 强制走 H3 不一定更稳定，建议保留 H2 fallback，做 A/B

## https-handshake
title: HTTPS 握手过程，TLS 1.2 vs 1.3 有什么区别
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

### 延伸
- HTTP/3 基于 QUIC（UDP），将 TLS 1.3 内嵌到传输层握手中
- mTLS 在企业内网常用：客户端也提供证书
- HSTS（Strict-Transport-Security）防止降级攻击

## websocket-vs-sse-vs-polling
title: 长轮询 / WebSocket / SSE 怎么选
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

### 延伸
- AI 流式响应一般用 SSE（OpenAI / Anthropic / DeepSeek 都是）
- WebSocket 必须自己处理心跳与重连（socket.io 帮忙做了）
- 反向代理（Nginx / Cloudflare）需要 `Connection: upgrade` 配置

## cors-and-preflight
title: 跨域与 CORS 预检，谁触发了 OPTIONS
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

### 延伸
- Chrome 强制 SameSite=Lax，跨域 cookie 需 Secure + SameSite=None
- Private Network Access（CORS-RFC1918）会进一步收紧本地网络的跨源访问
- 推荐用 BFF/网关代理减少跨域复杂度

## status-codes
title: HTTP 常见状态码及其含义
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

### 延伸
- HTTP/2 推送已废弃，103 Early Hints 是替代方案
- 限流 429 + `Retry-After` 是大型 API 标配


## early-hints-103
title: HTTP 103 Early Hints 是什么？怎么用来优化首屏
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
        'Link': '</app.css>; rel=preload; as=style, </main.js>; rel=preload; as=script',
      },
    });
    return earlyHints;
  },
};
```

### 延伸
- Vercel / Netlify 部分平台已默认替你发 103
- Next.js / Remix 都在路由级别支持自动注入 Link 头
- 可以配合 Service Worker：让 SW 命中缓存的资源跳过 103（避免重复请求）

## bfcache-frontend
title: bfcache（前进/后退缓存）你怎么用好它
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

### 延伸
- Safari 一直默认 bfcache；Chrome 86+ 才默认开启
- Firefox 也支持，但条件更严
- SPA 路由切换不走 bfcache；想要"返回如初"得自己做 KeepAlive（Vue `<keep-alive>` / React Suspense Cache）

