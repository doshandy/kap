---
id: 09-node
title: Node.js / BFF / SSR
order: 9
icon: 🟢
description: 事件循环、Stream、Buffer、BFF、SSR、Edge Runtime 与性能分析。
---

## node-event-loop
title: Node.js 事件循环六阶段与 nextTick 的特殊优先级
difficulty: 进阶
tags: [事件循环, libuv]

### 题目
浏览器事件循环和 Node.js 事件循环最重要的差异是什么？`process.nextTick`、Promise 微任务、`setImmediate` 的优先级如何理解？

### 答案要点
- Node 基于 libuv，有 timers、pending callbacks、idle/prepare、poll、check、close callbacks 等阶段
- 每个阶段切换前后都会处理微任务队列
- 在 CommonJS 场景里，`process.nextTick()` 队列通常先于 Promise / `queueMicrotask()` 微任务队列；但在 ESM 场景下顺序可能不同
- `process.nextTick()` 过度使用会让 I/O 和其他队列长期得不到执行；Node 官方也已把它标为 Legacy，并建议大多数用户态场景优先考虑 `queueMicrotask()`
- `setImmediate` 在 check 阶段，和 `setTimeout(0)` 的先后取决于上下文，I/O 回调后通常 `setImmediate` 更早

### 代码示例
```ts
// 优先级实测
console.log('1: sync');
setTimeout(() => console.log('2: timer'), 0);
setImmediate(() => console.log('3: immediate'));
process.nextTick(() => console.log('4: nextTick'));
queueMicrotask(() => console.log('5: microtask'));
Promise.resolve().then(() => console.log('6: promise'));

// 输出顺序（Node 20+）：
// 1: sync
// 4: nextTick      ← nextTick 队列优先
// 5: microtask
// 6: promise
// 2: timer
// 3: immediate

// I/O 回调内部，setImmediate 永远早于 setTimeout(0)
import { readFile } from 'node:fs';
readFile(__filename, () => {
  setTimeout(() => console.log('timer'), 0);
  setImmediate(() => console.log('immediate'));
  // 输出：immediate, timer
});
```

```ts
// ⚠️ 反例：滥用 nextTick 饿死 I/O
function recurse() {
  process.nextTick(recurse);   // 永远不让 I/O 阶段执行
}
// ✅ 改用 setImmediate 让出
function ok() { setImmediate(ok); }
```

### 延伸
- 面试里讲 Node 事件循环时，重点不是背阶段名，而是说明"它比浏览器多了 libuv 调度层"

## stream-backpressure
title: Stream、背压与 pipeline 为什么对 Node 很重要
difficulty: 进阶
tags: [Stream, 背压]

### 题目
为什么在 Node 里处理大文件、代理转发、日志流时，优先考虑 Stream 而不是一次性读入内存？

### 答案要点
- Stream 支持分块处理，降低峰值内存占用
- 背压可以让生产者根据消费者处理速度减速，避免内存暴涨
- `pipeline` 统一串起可读、转换、可写流，并处理错误传递与清理

### 代码示例
```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(
  createReadStream('app.log'),
  createGzip(),
  createWriteStream('app.log.gz'),
);
```

### 延伸
- Web Streams 与 Node Streams 概念接近但接口不完全一致，现代 Node 正在逐步打通两者体验

## buffer-worker-thread
title: Buffer、Uint8Array 与 Worker Threads 的边界
difficulty: 进阶
tags: [Buffer, Worker]

### 题目
Node 的 `Buffer` 和浏览器 `Uint8Array` 有何关系？CPU 密集型任务为什么应该优先考虑 Worker Threads？

### 答案要点
- `Buffer` 本质是 `Uint8Array` 的子类，加了更方便的二进制读写能力
- Node 单线程执行 JS，CPU 密集任务会阻塞事件循环，影响所有请求
- Worker Threads 允许在同进程多线程执行 JS，适合 hash、压缩、解析、图像处理

### 代码示例
```ts
// main.ts：用 Worker Threads 处理 CPU 密集任务
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

function runWorker(data: any) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(new URL('./hash.worker.ts', import.meta.url)), {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', code => code !== 0 && reject(new Error(`Worker stopped: ${code}`)));
  });
}

const result = await runWorker({ payload: largeBuffer });
```

```ts
// hash.worker.ts
import { workerData, parentPort } from 'node:worker_threads';
import { createHash } from 'node:crypto';

const hash = createHash('sha256').update(workerData.payload).digest('hex');
parentPort!.postMessage(hash);
```

```ts
// Buffer 与 Uint8Array 互通
const buf = Buffer.from('hello');
const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

// 跨线程零拷贝（Transferable）
const ab = new ArrayBuffer(1024 * 1024);
worker.postMessage(ab, [ab]);   // 转移所有权后主线程不能再用
```

### 延伸
- 子进程适合隔离执行和调用外部程序；Worker 更适合共享进程内资源和低成本线程化

## express-koa-fastify
title: Express、Koa、Fastify、Nest 的取舍
difficulty: 基础
tags: [框架, 中间件]

### 题目
给一个前端团队做 BFF，你会如何介绍 Express、Koa、Fastify、Nest 的适用边界？

### 答案要点
- Express 生态成熟、上手快，但历史包袱较重
- Koa 洋葱模型简洁，适合自己搭结构
- Fastify 更强调性能、schema、插件体系
- Nest 更像后端工程框架，适合大型团队和强约束场景

### 代码示例
```ts
// 1. Express
import express from 'express';
const app = express();
app.use(express.json());
app.get('/api/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  res.json(user);
});
app.listen(3000);

// 2. Koa（洋葱模型）
import Koa from 'koa';
const koa = new Koa();
koa.use(async (ctx, next) => {
  const start = Date.now();
  await next();             // 进入下一层
  ctx.set('X-Time', `${Date.now() - start}ms`);
});
koa.use(async ctx => { ctx.body = { ok: true }; });

// 3. Fastify（高性能 + JSON Schema）
import Fastify from 'fastify';
const fastify = Fastify({ logger: true });
fastify.get('/users/:id', {
  schema: {
    params: { type: 'object', properties: { id: { type: 'string' } } },
    response: { 200: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } } },
  },
}, async (req: any) => db.findUser(req.params.id));

// 4. NestJS（装饰器 + 依赖注入）
import { Controller, Get, Param, Module } from '@nestjs/common';
@Controller('users')
class UserController {
  constructor(private readonly users: UserService) {}
  @Get(':id') get(@Param('id') id: string) { return this.users.find(id); }
}
```

### 延伸
- 框架差异在 BFF 项目中通常不是首要瓶颈，数据聚合、缓存、鉴权、监控更关键

## bff-pattern
title: BFF 模式的价值与反模式
difficulty: 进阶
tags: [BFF, 架构]

### 题目
为什么前端团队会做 BFF？又有哪些常见失控模式？

### 答案要点
- BFF 可以聚合后端接口、裁剪字段、封装鉴权、屏蔽多端差异、做页面级缓存
- 反模式包括：把 BFF 做成“大后端”、承载核心事务、与下游强耦合、无边界扩张
- 理想状态是让 BFF 离用户场景近、离领域规则远

### 代码示例
```ts
// BFF 模式：聚合多个微服务，按页面裁剪字段
import Fastify from 'fastify';
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({ max: 1000, ttl: 60_000 });
const app = Fastify();

app.get('/bff/dashboard', async (req: any, reply) => {
  const userId = req.user.id;
  const cached = cache.get(`dashboard:${userId}`);
  if (cached) return cached;

  // 并发聚合多个下游
  const [profile, orders, notifications] = await Promise.all([
    fetch(`http://user-svc/users/${userId}`).then(r => r.json()),
    fetch(`http://order-svc/orders?user=${userId}&limit=5`).then(r => r.json()),
    fetch(`http://notify-svc/inbox?user=${userId}&unread=1`).then(r => r.json()),
  ]);

  // 按页面需要裁剪
  const result = {
    name: profile.name,
    avatar: profile.avatar,
    orders: orders.items.map((o: any) => ({ id: o.id, total: o.total, status: o.status })),
    unread: notifications.count,
  };

  cache.set(`dashboard:${userId}`, result);
  return result;
});
```

### 延伸
- BFF 的团队边界要明确，否则容易和服务端领域层互相越界

## node-ssr
title: SSR、Hydration 与 Edge Runtime 的关键问题
difficulty: 进阶
tags: [SSR, Hydration, Edge]

### 题目
Node 服务端渲染一个前端页面时，最容易踩的几个坑是什么？

### 答案要点
- 服务端和客户端输出必须一致，否则会 hydration mismatch
- 浏览器专属 API 不能在 SSR 阶段直接访问
- 数据预取、缓存键设计、流式输出、错误降级策略都会影响 SSR 体验
- Edge Runtime 降低时延，但 Node API 支持更受限

### 代码示例
```ts
// Vue 3 SSR：服务端入口
import { createSSRApp } from 'vue';
import { renderToString, renderToWebStream } from 'vue/server-renderer';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia } from 'pinia';
import App from './App.vue';

export async function render(url: string, manifest: any) {
  const app = createSSRApp(App);
  const router = createRouter({ history: createMemoryHistory(), routes });
  const pinia = createPinia();
  app.use(router).use(pinia);

  await router.push(url);
  await router.isReady();

  // 流式渲染（更早 TTFB）
  const stream = renderToWebStream(app);
  const state = JSON.stringify(pinia.state.value);
  return { stream, state, preload: getPreloadLinks(manifest, ctx.modules) };
}

// Express 集成
app.get('*', async (req, res) => {
  const { stream, state, preload } = await render(req.url, manifest);
  res.write(`<!DOCTYPE html><html><head>${preload}</head><body><div id="app">`);
  for await (const chunk of stream) res.write(chunk);
  res.end(`</div><script>window.__INITIAL_STATE__=${state}</script></body></html>`);
});
```

```ts
// 客户端 hydrate：必须复用同一份 state，避免 mismatch
import { createSSRApp } from 'vue';
const app = createSSRApp(App);
pinia.state.value = (window as any).__INITIAL_STATE__;
app.mount('#app');

// ⚠️ 浏览器专属代码必须放进 onMounted
import { onMounted } from 'vue';
onMounted(() => {
  console.log(window.localStorage.getItem('theme'));
});
```

### 延伸
- SSR 成败很大程度上取决于"你是否真的需要它"
- 纯工具后台应用往往没必要引入 SSR 复杂度

## profiling-graceful-shutdown
title: Node 性能分析与优雅退出
difficulty: 进阶
tags: [性能, 运维]

### 题目
线上 Node 进程 CPU 飙高、内存增长或发布重启时，你会关注哪些工程点？

### 答案要点
- 用 clinic.js、0x、Chrome Inspector、heap snapshot 排查 CPU 和内存热点
- 监听 `SIGTERM`，停止接新请求，等待连接处理完，再关闭资源后退出
- 对连接池、队列消费者、定时器、日志刷盘都要做收尾

### 代码示例
```ts
// 优雅退出
import { createServer } from 'node:http';
const server = createServer(handler);
server.listen(3000);

const SHUTDOWN_TIMEOUT = 30_000;
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`收到 ${signal}，开始优雅退出...`);

  // 1. 停止接受新连接
  server.close();

  // 2. 健康检查切走流量（K8s readiness probe 会失败）
  setHealthy(false);

  // 3. 等待进行中的请求完成
  await Promise.race([
    waitForActiveRequests(),
    new Promise(r => setTimeout(r, SHUTDOWN_TIMEOUT)),
  ]);

  // 4. 关闭依赖：DB / Redis / 消息队列
  await Promise.all([
    db.disconnect(),
    redis.quit(),
    consumer.stop(),
  ]);

  // 5. 退出
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 兜底：未捕获异常仍然要落日志再退出
process.on('uncaughtException', err => {
  console.error('uncaughtException:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', reason => {
  console.error('unhandledRejection:', reason);
});
```

```bash
# 性能分析
node --inspect=0.0.0.0:9229 server.js   # Chrome DevTools 远程调试
node --prof server.js                    # V8 性能日志
clinic doctor -- node server.js          # 综合诊断
```

### 延伸
- "重启能解决"往往意味着问题只是被延后，不是被根治
