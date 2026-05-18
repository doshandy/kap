---
id: 09-node
title: Node.js / BFF / SSR
order: 9
icon: 🟢
description: 事件循环、Stream、Buffer、BFF、SSR、Edge Runtime 与性能分析。
---

## node-event-loop

title: Node.js 事件循环六阶段与 nextTick 的特殊优先级
followups: [node-event-loop-followup-1]
links: [01-javascript/async-await, 01-javascript/event-loop, 05-browser/event-loop-worker]
difficulty: 进阶
tags: [事件循环, libuv]

### 一句话

Node 基于 libuv，有 timers、pending callbacks、idle/prepare、poll、check、close callbacks 等阶段；每个阶段切换前后都会处理微任务队列；在 CommonJS 场景里。

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
  process.nextTick(recurse); // 永远不让 I/O 阶段执行
}
// ✅ 改用 setImmediate 让出
function ok() {
  setImmediate(ok);
}
```

### 追问

- 「Node.js 事件循环六阶段与 nextTick 的特殊优先级」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Node.js 事件循环六阶段与 nextTick 的特殊优先级」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 事件循环、libuv，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 面试里讲 Node 事件循环时，重点不是背阶段名，而是说明"它比浏览器多了 libuv 调度层"

## stream-backpressure

title: Stream、背压与 pipeline 为什么对 Node 很重要
followups: [stream-backpressure-followup-1]
links: [node-streaming-response, stream-pipeline]
difficulty: 进阶
tags: [Stream, 背压]

### 一句话

Stream 支持分块处理，降低峰值内存占用；背压可以让生产者根据消费者处理速度减速，避免内存暴涨；pipeline 统一串起可读、转换、可写流，并处理错误传递与清理。

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

await pipeline(createReadStream('app.log'), createGzip(), createWriteStream('app.log.gz'));
```

### 追问

- 「Stream、背压与 pipeline 为什么对 Node 很重要」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Stream、背压与 pipeline 为什么对 Node 很重要」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Stream、背压，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Web Streams 与 Node Streams 概念接近但接口不完全一致，现代 Node 正在逐步打通两者体验

## buffer-worker-thread

title: Buffer、Uint8Array 与 Worker Threads 的边界
followups: [buffer-worker-thread-followup-1]
difficulty: 进阶
tags: [Buffer, Worker]

### 一句话

Buffer 本质是 Uint8Array 的子类，加了更方便的二进制读写能力；Node 单线程执行 JS，CPU 密集任务会阻塞事件循环，影响所有请求；Worker Threads 允许在同进程多线程执行 JS，适合 hash、压缩、解析、图像处理。

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
    worker.on('exit', (code) => code !== 0 && reject(new Error(`Worker stopped: ${code}`)));
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
worker.postMessage(ab, [ab]); // 转移所有权后主线程不能再用
```

### 追问

- 「Buffer、Uint8Array 与 Worker Threads 的边界」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Buffer、Uint8Array 与 Worker Threads 的边界」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Buffer、Worker，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 子进程适合隔离执行和调用外部程序；Worker 更适合共享进程内资源和低成本线程化

## express-koa-fastify

title: Express、Koa、Fastify、Nest 的取舍
followups: [express-koa-fastify-followup-1]
difficulty: 基础
tags: [框架, 中间件]

### 一句话

Express 生态成熟、上手快，但历史包袱较重；Koa 洋葱模型简洁，适合自己搭结构；Fastify 更强调性能、schema、插件体系。

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
  await next(); // 进入下一层
  ctx.set('X-Time', `${Date.now() - start}ms`);
});
koa.use(async (ctx) => {
  ctx.body = { ok: true };
});

// 3. Fastify（高性能 + JSON Schema）
import Fastify from 'fastify';
const fastify = Fastify({ logger: true });
fastify.get(
  '/users/:id',
  {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: {
        200: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
      },
    },
  },
  async (req: any) => db.findUser(req.params.id),
);

// 4. NestJS（装饰器 + 依赖注入）
import { Controller, Get, Param, Module } from '@nestjs/common';
@Controller('users')
class UserController {
  constructor(private readonly users: UserService) {}
  @Get(':id') get(@Param('id') id: string) {
    return this.users.find(id);
  }
}
```

### 追问

- 「Express、Koa、Fastify、Nest 的取舍」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Express、Koa、Fastify、Nest 的取舍」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 框架、中间件，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 框架差异在 BFF 项目中通常不是首要瓶颈，数据聚合、缓存、鉴权、监控更关键

## bff-pattern

title: BFF 模式的价值与反模式
followups: [bff-pattern-followup-1]
difficulty: 进阶
tags: [BFF, 架构]

### 一句话

BFF 可以聚合后端接口、裁剪字段、封装鉴权、屏蔽多端差异、做页面级缓存；反模式包括：把 BFF 做成“大后端”、承载核心事务、与下游强耦合、无边界扩张；理想状态是让 BFF 离用户场景近、离领域规则远。

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
    fetch(`http://user-svc/users/${userId}`).then((r) => r.json()),
    fetch(`http://order-svc/orders?user=${userId}&limit=5`).then((r) => r.json()),
    fetch(`http://notify-svc/inbox?user=${userId}&unread=1`).then((r) => r.json()),
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

### 追问

- 推动「BFF 模式的价值与反模式」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「BFF 模式的价值与反模式」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 BFF、架构，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- BFF 的团队边界要明确，否则容易和服务端领域层互相越界

## node-ssr

title: SSR、Hydration 与 Edge Runtime 的关键问题
followups: [node-ssr-followup-1]
links: [03-vue/advanced-features, 03-vue/nuxt3-overview, 08-performance/initial-load]
difficulty: 进阶
tags: [SSR, Hydration, Edge]

### 一句话

服务端和客户端输出必须一致，否则会 hydration mismatch；浏览器专属 API 不能在 SSR 阶段直接访问；数据预取、缓存键设计、流式输出、错误降级策略都会影响 SSR 体验。

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

### 追问

- 「SSR、Hydration 与 Edge Runtime 的关键问题」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「SSR、Hydration 与 Edge Runtime 的关键问题」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SSR、Hydration、Edge，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- SSR 成败很大程度上取决于"你是否真的需要它"
- 纯工具后台应用往往没必要引入 SSR 复杂度

## profiling-graceful-shutdown

title: Node 性能分析与优雅退出
followups: [profiling-graceful-shutdown-followup-1]
difficulty: 进阶
tags: [性能, 运维]

### 一句话

用 clinic.js、0x、Chrome Inspector、heap snapshot 排查 CPU 和内存热点；监听 SIGTERM，停止接新请求，等待连接处理完，再关闭资源后退出；对连接池、队列消费者、定时器、日志刷盘都要做收尾。

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
    new Promise((r) => setTimeout(r, SHUTDOWN_TIMEOUT)),
  ]);

  // 4. 关闭依赖：DB / Redis / 消息队列
  await Promise.all([db.disconnect(), redis.quit(), consumer.stop()]);

  // 5. 退出
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 兜底：未捕获异常仍然要落日志再退出
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});
```

```bash
# 性能分析
node --inspect=0.0.0.0:9229 server.js   # Chrome DevTools 远程调试
node --prof server.js                    # V8 性能日志
clinic doctor -- node server.js          # 综合诊断
```

### 追问

- 你会先看哪些指标来判断「Node 性能分析与优雅退出」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Node 性能分析与优雅退出」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 性能、运维，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- "重启能解决"往往意味着问题只是被延后，不是被根治

## node-test-runner

title: 原生 node:test 与 Vitest / Jest 的取舍
followups: [node-test-runner-followup-1]
difficulty: 进阶
tags: [测试, node:test]

### 一句话

node:test + node:assert：零依赖、启动快、与 Node 生态深度整合，适合纯后端 / 工具脚本；Jest：生态最大，snapshot / mock / 覆盖率开箱即用，但启动慢、对 ESM 兼容差；Vitest：基于 Vite。

### 题目

Node 18+ 内置了 `node:test`，还有必要再装 Jest / Vitest 吗？

### 答案要点

- `node:test` + `node:assert`：零依赖、启动快、与 Node 生态深度整合，适合纯后端 / 工具脚本
- Jest：生态最大，snapshot / mock / 覆盖率开箱即用，但启动慢、对 ESM 兼容差
- Vitest：基于 Vite，前端 / 同构项目首选；与 Vite config 复用
- 选型：纯 Node 服务用 `node:test` 越来越合适；前端 + Node 混合项目继续 Vitest
- 共用断言：`assert/strict` 在所有 runner 都能用
- 性能：`node:test --test --test-concurrency=8 --watch` 直接并行 + watch

### 代码示例

```ts
import { test, describe, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('userService', () => {
  before(async () => {
    await db.connect();
  });
  after(async () => {
    await db.close();
  });

  test('create user', async () => {
    const u = await createUser({ name: 'kap' });
    assert.equal(u.name, 'kap');
  });

  test('mocking', async () => {
    const fn = mock.fn();
    fn(1);
    fn(2);
    assert.equal(fn.mock.callCount(), 2);
  });
});
```

```bash
node --test --test-reporter=spec --test-concurrency=8 src/**/*.test.ts
```

### 追问

- 针对「原生 node:test 与 Vitest / Jest 的取舍」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「原生 node:test 与 Vitest / Jest 的取舍」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 测试、node:test，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- TypeScript 项目用 `tsx --test` 直接跑，无需额外编译
- 想保留 Jest snapshot 生态可以用 vitest，迁移成本最小

## stream-pipeline

title: Node Stream 实战与背压控制
followups: [stream-pipeline-followup-1]
links: [node-streaming-response, stream-backpressure]
difficulty: 资深
tags: [Stream, 背压]

### 一句话

不用 Stream：内存里一次性塞进整文件，OOM 风险；Stream 三种：Readable / Writable / Transform；通过 pipe 串联自动处理背压；背压：下游写入速度 < 上游产出速度，需要暂停上游避免缓冲膨胀。

### 题目

处理大文件 / 转码 / 转发请求时为什么必须用 Stream？背压 (backpressure) 是什么？

### 答案要点

- 不用 Stream：内存里一次性塞进整文件，OOM 风险
- Stream 三种：Readable / Writable / Transform；通过 pipe 串联自动处理背压
- 背压：下游写入速度 < 上游产出速度，需要暂停上游避免缓冲膨胀；Node 内部由 highWaterMark + .pause/.resume 自动协调
- `pipeline()`：替代 `.pipe()`，错误传播更可靠，自动 destroy 全链路
- 异步迭代：现代风格用 `for await (const chunk of stream)`
- WebStream：Node 18+ 支持 ReadableStream / WritableStream，与浏览器 / Edge 一致

### 代码示例

```ts
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(createReadStream('big.log'), createGzip(), createWriteStream('big.log.gz'));

import { Transform } from 'node:stream';

const upper = new Transform({
  transform(chunk: Buffer, _enc, cb) {
    cb(null, chunk.toString().toUpperCase());
  },
});

await pipeline(req, upper, res);
```

### 追问

- 「Node Stream 实战与背压控制」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Node Stream 实战与背压控制」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Stream、背压，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Stream 出错最难调，建议加 `stream.finished` 监听 + 全局 logger
- 浏览器 Fetch ReadableStream + Node Web Stream 互通可以做端到端流式

## node-event-loop-phases

title: Node.js 事件循环六阶段是什么
followups: [node-event-loop-phases-followup-1]
links: [01-javascript/async-await, 01-javascript/event-loop, 05-browser/event-loop-worker]
difficulty: 进阶
tags: [事件循环, Node]

### 一句话

Node 的 libuv 把异步事件分成 6 个阶段顺序处理：timers → pending callbacks → idle/prepare → poll → check → close。每跑完一个阶段会把所有微任务（Promise / nextTick）清空再进入下一个阶段。

### 题目

请描述 Node.js 的事件循环 6 个阶段，setImmediate vs setTimeout 在什么时候执行顺序不确定？

### 答案要点

- **6 个阶段**（按顺序）：
  1. timers：到期的 setTimeout / setInterval
  2. pending callbacks：上一轮 I/O 残留的回调
  3. idle / prepare：内部使用
  4. **poll**：等待新 I/O，处理 I/O 回调（核心阶段，可能阻塞等待）
  5. check：执行 setImmediate
  6. close callbacks：close 事件
- 每个阶段结束都会**清空 microtask 队列**（process.nextTick > Promise.then）
- `process.nextTick` 优先级最高，紧接当前操作执行（甚至高于 Promise）
- `setImmediate(fn)` 在 check 阶段执行；和 `setTimeout(fn, 0)` 谁先取决于事件循环当前位置（**在 I/O callback 内：setImmediate 先**；主模块顶层不确定）
- Node.js 与浏览器 microtask 时机略有不同（Node 18+ 已对齐 HTML 标准）

### 代码示例

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

const fs = require('node:fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate')); // 这种情况一定先打印
});

process.nextTick(() => console.log('next'));
Promise.resolve().then(() => console.log('promise'));
console.log('main');
```

### 追问

- 「Node.js 事件循环六阶段是什么」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Node.js 事件循环六阶段是什么」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 事件循环、Node，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要滥用 `process.nextTick`，会饿死 I/O
- Worker Threads 自己有独立的事件循环
- `--trace-event-categories` 能看清楚每个阶段的耗时

## node-cluster-pm2

title: Node 进程怎么充分利用多核？cluster / worker_threads / pm2 怎么选
followups: [node-cluster-pm2-followup-1]
difficulty: 资深
tags: [Node, 进程, 性能, 高频]

### 一句话

**CPU 密集**（加密 / 压缩 / 解析）用 worker_threads（共享内存、低开销）；**接受请求扩展并发**用 cluster（多进程 + 内置负载均衡，但隔离强）；**生产部署管理**用 pm2 / Node 22+ 内置 `--cluster`。

### 题目

单进程 Node 只能跑满一个核。一个高 QPS 的 BFF 服务怎么充分利用 16 核？CPU 密集任务又该怎么办？

### 答案要点

- **三种横向扩展方式**
  - **cluster**（Node 内置）：fork N 个 worker 进程，master 通过 round-robin 分发 socket；进程之间内存独立
  - **worker_threads**：单进程内多线程，共享 ArrayBuffer，开销低
  - **多容器 + 负载均衡**：交给 K8s / Nginx，进程级别就单核够，水平扩 pod
- **典型选型**
  - HTTP 服务：cluster 或多容器；不要单进程多线程接 HTTP（worker_threads 主要为计算）
  - 大文件 hash / SQL 解析 / 图片处理：worker_threads
  - 老牌方案 pm2：cluster 模式 + 自动重启 + 日志聚合（单机部署很方便）
- **cluster 注意**
  - 进程间共享 state 要靠 IPC（process.send）或外部存储（Redis）
  - 内存型 session 不能跨进程，改用 Redis session
  - sticky session：默认 round-robin 不绑定，长连接要自己处理
- **worker_threads 注意**
  - 每个 worker 启动 ~30ms + 几 MB 内存，不要随用随起，用 piscina 等池
  - 通信用 `postMessage` + Transferable（避免大对象序列化开销）
  - SharedArrayBuffer：跨线程共享内存，需要 Atomics 同步
- **PM2 实用功能**
  - `pm2 start app.js -i max`：max worker 数 = CPU 核
  - `pm2 reload`：零宕机重启（先拉新进程再杀旧）
  - `pm2 logs / pm2 monit`
- **健康检查 / 进程崩溃**
  - 单 worker 崩溃：cluster master 自动 fork 新的（避免立即 fork 风暴：限频）
  - K8s liveness / readiness 探针
  - `process.on('uncaughtException')` 记日志后**优雅退出**（重启），不要 swallow

### 代码示例

```js
const cluster = require('node:cluster');
const os = require('node:os');

if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`worker ${worker.process.pid} died, respawning`);
    setTimeout(() => cluster.fork(), 1000);
  });
} else {
  require('./server');
}
```

```js
const { Worker } = require('node:worker_threads');
const Piscina = require('piscina');

const pool = new Piscina({
  filename: new URL('./image-worker.js', import.meta.url).href,
  maxThreads: 4,
});

app.post('/resize', async (req, res) => {
  const result = await pool.run({ buffer: req.body, width: 800 });
  res.send(result);
});
```

### 追问

- 你会先看哪些指标来判断「Node 进程怎么充分利用多核？cluster / worker_threads / pm2 怎么选」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Node 进程怎么充分利用多核？cluster / worker_threads / pm2 怎么选」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Node、进程、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Node 21+ permission model：限制 worker 文件 / 网络访问
- bun / deno 自带原生多线程能力，但生态兼容仍有差距
- 生产线上：通常容器化 + K8s 横向扩 pod，进程内不再 cluster

## node-streaming-response

title: Node 接口怎么实现"边算边返回"
followups: [node-streaming-response-followup-1]
links: [stream-backpressure, stream-pipeline]
difficulty: 进阶
tags: [Node, 流, BFF, 高频]

### 一句话

HTTP/1.1 用 `Transfer-Encoding: chunked` 配合 `res.write` 分块输出；现代场景三选一：**SSE**（单向纯文本流）、**ReadableStream**（fetch 流式）、**WebSocket**（双向）。Node 18+ Web Streams 标准化支持。

### 题目

BFF 收到请求后要拉 LLM 流式返回 / 逐行处理大日志输出。Node 怎么实现并保证不 buffer 全部内容？

### 答案要点

- **基础**
  - HTTP 默认 chunked：`res.write` 立即发送，不等
  - `res.flushHeaders()` 提早 flush 头部，让 CDN / 代理快速建立连接
  - 关 Nagle / buffer：某些代理会缓冲整个响应，需要 `X-Accel-Buffering: no` 或类似头
- **三种协议**
  - **SSE（Server-Sent Events）**
    - 单向 server → client；浏览器原生 EventSource
    - `Content-Type: text/event-stream` + 行格式 `data: xxx\n\n`
    - 自带重连（last-event-id），适合 LLM 流式回包
  - **fetch ReadableStream**
    - server 用 chunked；client 用 `response.body.getReader()`
    - 灵活但要自己处理协议（拆分 chunk）
  - **WebSocket**
    - 双向；客户端能持续发，server 持续推
    - 适合实时游戏 / 协同编辑 / 双向控制
- **Node 实现**
  - 经典：`res.write(chunk)` + `res.end()`
  - 推荐：用 `pipeline(stream, res)` 自动 backpressure
  - Web Streams API：`new Response(readable, { headers })` (Node 18+)
- **背压（backpressure）**
  - `res.write` 返回 false 表示缓冲区满，要等 `drain` 事件
  - 用 pipeline / `Readable.pipe` 自动处理
  - 否则可能 OOM
- **超时 / 取消**
  - 客户端断开：监听 `req.on('close')` / AbortSignal
  - server 内部 LLM 拉取请求要级联取消（透传 AbortController）
  - keep-alive 超时（Nginx / ALB）：10min 之类，长流要心跳

### 代码示例

```js
import { setInterval as every } from 'node:timers/promises';

app.get('/sse', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    for await (const _ of every(1000, null, { signal: ac.signal })) {
      res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }
  } catch {
  } finally {
    res.end();
  }
});

import { pipeline } from 'node:stream/promises';
app.get('/log', async (req, res) => {
  const upstream = createReadStream('/var/log/big.log');
  res.setHeader('Content-Type', 'text/plain');
  await pipeline(upstream, res);
});

import { ReadableStream } from 'node:stream/web';
app.get('/llm', async (req, res) => {
  const upstream = await fetch('https://api.llm/stream', { signal: req.signal });
  await pipeline(upstream.body, res);
});
```

### 追问

- 「Node 接口怎么实现"边算边返回"」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Node 接口怎么实现"边算边返回"」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Node、流、BFF，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vercel / Cloudflare Edge 默认有响应 buffer 行为，需要专门启 streaming
- 大量并发流式连接：每条连接占 TCP fd，注意 ulimit + 反向代理 connection limit
- HTTP/2 / HTTP/3 多路复用同一 TCP，更适合大量流

## node-event-loop-followup-1

title: 追问：「Node.js 事件循环六阶段与 nextTick 的特殊优先级」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [事件循环, libuv, 追问]
parent: node-event-loop

### 题目

如果面试官追问：「Node.js 事件循环六阶段与 nextTick 的特殊优先级」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Node.js 事件循环六阶段与 nextTick 的特殊优先级」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Node 基于 libuv，有 timers、pending callbacks、idle/prepare、poll、check、close callbacks 等阶段」要进一步补到边界条件里，而不是只复述结论。

## stream-backpressure-followup-1

title: 追问：「Stream、背压与 pipeline 为什么对 Node 很重要」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Stream, 背压, 追问]
parent: stream-backpressure

### 题目

如果面试官追问：「Stream、背压与 pipeline 为什么对 Node 很重要」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Stream、背压与 pipeline 为什么对 Node 很重要」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Stream 支持分块处理，降低峰值内存占用」要进一步补到边界条件里，而不是只复述结论。

## buffer-worker-thread-followup-1

title: 追问：「Buffer、Uint8Array 与 Worker Threads 的边界」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Buffer, Worker, 追问]
parent: buffer-worker-thread

### 题目

如果面试官追问：「Buffer、Uint8Array 与 Worker Threads 的边界」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Buffer、Uint8Array 与 Worker Threads 的边界」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Buffer 本质是 Uint8Array 的子类，加了更方便的二进制读写能力」要进一步补到边界条件里，而不是只复述结论。

## express-koa-fastify-followup-1

title: 追问：「Express、Koa、Fastify、Nest 的取舍」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [框架, 中间件, 追问]
parent: express-koa-fastify

### 题目

如果面试官追问：「Express、Koa、Fastify、Nest 的取舍」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Express、Koa、Fastify、Nest 的取舍」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Express 生态成熟、上手快，但历史包袱较重」要进一步补到边界条件里，而不是只复述结论。

## bff-pattern-followup-1

title: 追问：推动「BFF 模式的价值与反模式」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [BFF, 架构, 追问]
parent: bff-pattern

### 题目

如果面试官追问：推动「BFF 模式的价值与反模式」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「BFF 模式的价值与反模式」拆成可验证的小步骤，逐步替换高风险部分。

## node-ssr-followup-1

title: 追问：「SSR、Hydration 与 Edge Runtime 的关键问题」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [SSR, Hydration, Edge, 追问]
parent: node-ssr

### 题目

如果面试官追问：「SSR、Hydration 与 Edge Runtime 的关键问题」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「SSR、Hydration 与 Edge Runtime 的关键问题」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「服务端和客户端输出必须一致，否则会 hydration mismatch」要进一步补到边界条件里，而不是只复述结论。

## profiling-graceful-shutdown-followup-1

title: 追问：你会先看哪些指标来判断「Node 性能分析与优雅退出」是不是当前性能瓶颈
difficulty: 进阶
tags: [性能, 运维, 追问]
parent: profiling-graceful-shutdown

### 题目

如果面试官追问：你会先看哪些指标来判断「Node 性能分析与优雅退出」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Node 性能分析与优雅退出」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## node-test-runner-followup-1

title: 追问：针对「原生 node:test 与 Vitest / Jest 的取舍」，你会优先补哪些边界用例和回归用例
difficulty: 进阶
tags: [测试, node:test, 追问]
parent: node-test-runner

### 题目

如果面试官追问：针对「原生 node:test 与 Vitest / Jest 的取舍」，你会优先补哪些边界用例和回归用例？

### 答案要点

#### 核心回答

- 先界定「原生 node:test 与 Vitest / Jest 的取舍」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 结合 回归信心 展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「node:test + node:assert：零依赖、启动快、与 Node 生态深度整合，适合纯后端 / 工具脚本」要进一步补到边界条件里，而不是只复述结论。

## stream-pipeline-followup-1

title: 追问：「Node Stream 实战与背压控制」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Stream, 背压, 追问]
parent: stream-pipeline

### 题目

如果面试官追问：「Node Stream 实战与背压控制」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Node Stream 实战与背压控制」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「不用 Stream：内存里一次性塞进整文件，OOM 风险」要进一步补到边界条件里，而不是只复述结论。

## node-event-loop-phases-followup-1

title: 追问：「Node.js 事件循环六阶段是什么」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [事件循环, Node, 追问]
parent: node-event-loop-phases

### 题目

如果面试官追问：「Node.js 事件循环六阶段是什么」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Node.js 事件循环六阶段是什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「1. timers：到期的 setTimeout / setInterval」要进一步补到边界条件里，而不是只复述结论。

## node-cluster-pm2-followup-1

title: 追问：你会先看哪些指标来判断「Node 进程怎么充分利用多核？cluster / worker_threads / pm2 怎么选」是不是当前性能瓶颈
difficulty: 资深
tags: [Node, 进程, 性能, 高频, 追问]
parent: node-cluster-pm2

### 题目

如果面试官追问：你会先看哪些指标来判断「Node 进程怎么充分利用多核？cluster / worker_threads / pm2 怎么选」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Node 进程怎么充分利用多核？cluster / worker_threads / pm2 怎么选」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## node-streaming-response-followup-1

title: 追问：「Node 接口怎么实现"边算边返回"」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Node, 流, BFF, 高频, 追问]
parent: node-streaming-response

### 题目

如果面试官追问：「Node 接口怎么实现"边算边返回"」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Node 接口怎么实现"边算边返回"」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「HTTP 默认 chunked：res.write 立即发送，不等」要进一步补到边界条件里，而不是只复述结论。
