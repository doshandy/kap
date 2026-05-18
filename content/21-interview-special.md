---
id: 21-interview-special
title: 面试专题
order: 21
icon: 🎯
description: 高频手写题、系统设计题与面试表达策略。
---

## handwrite-call-apply-bind

title: 手写 call / apply / bind
followups: [handwrite-call-apply-bind-followup-1]
difficulty: 进阶
tags: [手写, this, 高频]

### 一句话

call/apply 本质：把函数挂为目标对象的临时属性 → 调用 → 删除属性；bind 返回新函数，需要支持柯里化拼参数；bind 后的函数若被 new 调用：忽略绑定的 this，仍创建新对象（构造调用优先级最高）。

### 题目

不借助原生 `call/apply/bind`，手写它们的实现，并说明 `bind` 的几个边界。

### 答案要点

- `call/apply` 本质：把函数挂为目标对象的临时属性 → 调用 → 删除属性
- `bind` 返回新函数，需要支持柯里化拼参数
- `bind` 后的函数若被 `new` 调用：忽略绑定的 this，仍创建新对象（构造调用优先级最高）
- `apply` 接受数组参数；`call` 接受参数列表

### 代码示例

```ts
Function.prototype.myCall = function (ctx: any, ...args: any[]) {
  ctx = ctx ?? globalThis;
  const key = Symbol();
  ctx[key] = this;
  const result = ctx[key](...args);
  delete ctx[key];
  return result;
};

Function.prototype.myApply = function (ctx: any, args: any[] = []) {
  return this.myCall(ctx, ...args);
};

Function.prototype.myBind = function (ctx: any, ...preset: any[]) {
  const fn = this;
  function bound(this: any, ...later: any[]) {
    // new 调用时 this 是新对象 instanceof bound
    const isNew = this instanceof bound;
    return fn.apply(isNew ? this : ctx, [...preset, ...later]);
  }
  bound.prototype = Object.create(fn.prototype);
  return bound;
};
```

### 追问

- 「手写 call / apply / bind」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「手写 call / apply / bind」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 手写、this、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 箭头函数没有自己的 this，调用 `bind/call/apply` 不会改变 this
- `Function.prototype.bind` 是 ES5 引入，绑定后 `length` 会扣除已传参数

## handwrite-new-instanceof

title: 手写 new 与 instanceof
followups: [handwrite-new-instanceof-followup-1]
difficulty: 进阶
tags: [手写, 原型, 高频]

### 一句话

new 的四步：创建对象 → 链原型 → 执行构造（this 指向新对象） → 若构造返回对象则用之，否则返回新对象；instanceof 的本质：判断右侧 prototype 是否在左侧的原型链上。

### 题目

不借助 `new` 关键字与原生 `instanceof`，实现 `myNew(Ctor, ...args)` 与 `myInstanceof(left, right)`。

### 答案要点

- `new` 的四步：创建对象 → 链原型 → 执行构造（this 指向新对象） → 若构造返回对象则用之，否则返回新对象
- `instanceof` 的本质：判断右侧 `prototype` 是否在左侧的原型链上

### 代码示例

```ts
function myNew(Ctor: Function, ...args: any[]) {
  const obj = Object.create(Ctor.prototype);
  const ret = Ctor.apply(obj, args);
  return ret instanceof Object ? ret : obj;
}

function myInstanceof(left: any, right: Function): boolean {
  if (left == null || (typeof left !== 'object' && typeof left !== 'function')) return false;
  let proto = Object.getPrototypeOf(left);
  while (proto) {
    if (proto === right.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

### 追问

- 「手写 new 与 instanceof」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「手写 new 与 instanceof」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 手写、原型、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `Symbol.hasInstance` 可自定义 `instanceof` 行为
- `Object.create(null)` 创建的对象 `instanceof Object` 为 false

## handwrite-curry-compose

title: 手写 curry / compose / pipe
followups: [handwrite-curry-compose-followup-1]
difficulty: 进阶
tags: [函数式, 手写]

### 一句话

curry：参数数量达到 fn.length 才执行，否则返回继续接收参数的函数；compose / pipe：reduce / reduceRight 串联函数，前一个的返回值喂给下一个；配合泛型可保留类型推导。

### 题目

手写函数柯里化 `curry`，以及函数组合 `compose`（从右往左）与 `pipe`（从左往右）。

### 答案要点

- curry：参数数量达到 `fn.length` 才执行，否则返回继续接收参数的函数
- compose / pipe：reduce / reduceRight 串联函数，前一个的返回值喂给下一个
- 配合泛型可保留类型推导

### 代码示例

```ts
// 柯里化（支持任意分批传参）
function curry<T extends (...a: any[]) => any>(fn: T): any {
  return function curried(this: any, ...args: any[]) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...rest: any[]) => curried.apply(this, [...args, ...rest]);
  };
}

// compose: 从右向左应用
const compose =
  <T>(...fns: ((x: T) => T)[]) =>
  (x: T) =>
    fns.reduceRight((acc, fn) => fn(acc), x);

// pipe: 从左向右应用
const pipe =
  <T>(...fns: ((x: T) => T)[]) =>
  (x: T) =>
    fns.reduce((acc, fn) => fn(acc), x);

// 用例
const add = (a: number) => (b: number) => a + b;
const double = (n: number) => n * 2;
pipe(add(1), double)(3); // (3+1)*2 = 8
```

### 追问

- 「手写 curry / compose / pipe」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「手写 curry / compose / pipe」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 函数式、手写，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Redux 中间件用 compose 串联
- RxJS 的 `pipe` 是同思想的运算符组合

## handwrite-event-emitter

title: 手写 EventEmitter（含 once / off / wildcards）
followups: [handwrite-event-emitter-followup-1]
difficulty: 进阶
tags: [发布订阅, 手写, 高频]

### 一句话

on 注册时建立事件 → 处理器列表的映射；once 通过包装函数自动 off；emit 时复制一份监听器列表，避免遍历过程中被改动。

### 题目

实现 `on / off / once / emit` 的发布订阅类，并说明事件回调中 `off` 自身可能引发的遍历问题。

### 答案要点

- `on` 注册时建立事件 → 处理器列表的映射
- `once` 通过包装函数自动 `off`
- `emit` 时复制一份监听器列表，避免遍历过程中被改动
- 通配符 `*` 用于全局监听场景

### 代码示例

```ts
type Handler = (...a: any[]) => void;

class EventEmitter {
  private map = new Map<string, Handler[]>();

  on(event: string, fn: Handler): void {
    if (!this.map.has(event)) this.map.set(event, []);
    this.map.get(event)!.push(fn);
  }

  off(event: string, fn?: Handler): void {
    if (!fn) return void this.map.delete(event);
    const arr = this.map.get(event);
    if (arr)
      this.map.set(
        event,
        arr.filter((f) => f !== fn),
      );
  }

  once(event: string, fn: Handler): void {
    const wrap: Handler = (...args) => {
      fn(...args);
      this.off(event, wrap);
    };
    this.on(event, wrap);
  }

  emit(event: string, ...args: any[]): void {
    // 复制一份避免在回调中 off 影响遍历
    [...(this.map.get(event) || [])].forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.error(e);
      }
    });
    [...(this.map.get('*') || [])].forEach((fn) => fn(event, ...args));
  }
}
```

### 追问

- 推动「手写 EventEmitter（含 once / off / wildcards）」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「手写 EventEmitter（含 once / off / wildcards）」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 发布订阅、手写、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vue 3 不再内置 `$on/$off`，推荐使用 mitt
- Node.js 的 `EventEmitter` 有 `setMaxListeners`、`error` 事件兜底

## handwrite-deep-clone-circular

title: 手写深拷贝（处理循环引用 + Symbol + 特殊对象）
followups: [handwrite-deep-clone-circular-followup-1]
links: [01-javascript/deep-clone]
difficulty: 资深
tags: [手写, 高频, 对象]

### 一句话

用 WeakMap 记录已克隆对象，遇到相同引用直接返回，避免无限递归；特殊对象需要单独构造：new Date()、new RegExp()、new Map()、new Set()。

### 题目

手写深拷贝，要求支持循环引用、Symbol 键、Map/Set/Date/RegExp，并说明与原生 `structuredClone` 的差异。

### 答案要点

- 用 `WeakMap` 记录已克隆对象，遇到相同引用直接返回，避免无限递归
- 特殊对象需要单独构造：`new Date()`、`new RegExp()`、`new Map()`、`new Set()`
- 用 `Reflect.ownKeys` 同时拿到 string 与 symbol 键
- `structuredClone` 原生支持循环引用，但不支持函数与 DOM 节点

### 代码示例

```ts
function deepClone<T>(value: T, seen = new WeakMap()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as any)) return seen.get(value as any);

  if (value instanceof Date) return new Date(value) as any;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as any;
  if (typeof value === 'function') return value;

  if (value instanceof Map) {
    const m = new Map();
    seen.set(value as any, m);
    value.forEach((v, k) => m.set(deepClone(k, seen), deepClone(v, seen)));
    return m as any;
  }
  if (value instanceof Set) {
    const s = new Set();
    seen.set(value as any, s);
    value.forEach((v) => s.add(deepClone(v, seen)));
    return s as any;
  }

  const out: any = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value as any, out);
  Reflect.ownKeys(value as any).forEach((k) => {
    out[k] = deepClone((value as any)[k], seen);
  });
  return out;
}
```

### 常见误区

- 用 JSON 法直接挂在循环引用上
- 用 Map 不用 WeakMap：被克隆对象不会被释放
- 没处理 Date / RegExp / Map / Set / Symbol key

### 追问

- 原生 structuredClone 内部是怎么实现的
- 跨 iframe 的对象 deep clone 有什么坑
- 拷贝带 prototype 的对象（如 class 实例）怎么保留原型链

### 延伸

- 现代浏览器原生 `structuredClone(obj)` 已能处理循环引用，但不支持函数与 DOM
- `JSON.parse(JSON.stringify(x))` 丢失 undefined / Symbol / Date / 循环引用

## handwrite-ajax-fetch

title: 手写一个简版 ajax / 带超时与重试的 fetch
followups: [handwrite-ajax-fetch-followup-1]
difficulty: 进阶
tags: [网络, 手写]

### 一句话

XHR 关键事件：onload、onerror，根据 status 判断成功/失败；超时用 AbortController + setTimeout，比 XHR 的 timeout 更通用；重试需要避免对幂等性敏感的请求（如 POST 创建订单）。

### 题目

手写一个基于 XHR 的 ajax 封装；再实现一个带超时、重试、指数退避的 fetch 包装。

### 答案要点

- XHR 关键事件：`onload`、`onerror`，根据 `status` 判断成功/失败
- 超时用 `AbortController` + `setTimeout`，比 XHR 的 `timeout` 更通用
- 重试需要避免对幂等性敏感的请求（如 POST 创建订单）
- 指数退避：`2^i * base` 减少风暴

### 代码示例

```ts
// 1. 简版 XHR 封装
function ajax(opts: {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
}) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(opts.method || 'GET', opts.url, true);
    Object.entries(opts.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.send(opts.data ? JSON.stringify(opts.data) : null);
  });
}

// 2. 带超时与重试的 fetch
async function fetchWithRetry(
  url: string,
  opts: RequestInit & { timeout?: number; retries?: number } = {},
) {
  const { timeout = 10_000, retries = 2, ...rest } = opts;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...rest, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 2 ** i * 200)); // 指数退避
    } finally {
      clearTimeout(timer);
    }
  }
}
```

### 追问

- 「手写一个简版 ajax / 带超时与重试的 fetch」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「手写一个简版 ajax / 带超时与重试的 fetch」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 网络、手写，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真实工程用 axios / ky，重点理解拦截器、取消、上传/下载进度

## design-virtual-list

title: 系统设计：10 万条数据的高性能虚拟列表
followups: [design-virtual-list-followup-1]
links: [20-algorithm/frontend-real-world, 27-data-platform-cases/big-table-virtualization, 28-customer-service-im/chat-perf-virtual-list]
difficulty: 资深
tags: [系统设计, 虚拟列表]

### 一句话

澄清问题：定高 / 变高 / 树形 / 分组吸顶？滚动容器是页面还是局部？是否要键盘/搜索/选择？SSR？；核心方案：；1. 计算可视区间 [start, end]，只渲染该区间 + overscan。

### 题目

让你从零设计一个支持 10 万条数据的列表组件，怎么拆解？

### 答案要点

- **澄清问题**：定高 / 变高 / 树形 / 分组吸顶？滚动容器是页面还是局部？是否要键盘/搜索/选择？SSR？
- **核心方案**：
  1. 计算可视区间 `[start, end]`，只渲染该区间 + overscan
  2. 用 padding/transform 撑出滚动条总高度
  3. 变高需要测量缓存（ResizeObserver）+ 滚动校正
  4. 用稳定 key 避免 DOM 复用错乱

### 代码示例

```vue
<template>
  <div class="vl" ref="wrap" @scroll="onScroll" :style="{ height: viewportH + 'px' }">
    <div :style="{ height: totalH + 'px', position: 'relative' }">
      <div
        v-for="(item, idx) in visibleItems"
        :key="item.id"
        class="row"
        :style="{ position: 'absolute', top: offsets[start + idx] + 'px', height: rowH + 'px' }"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
const props = defineProps<{
  items: { id: string; text: string }[];
  rowH: number;
  viewportH: number;
}>();
const scrollTop = ref(0);
const overscan = 5;

const totalH = computed(() => props.items.length * props.rowH);
const offsets = computed(() => props.items.map((_, i) => i * props.rowH));
const start = computed(() => Math.max(0, Math.floor(scrollTop.value / props.rowH) - overscan));
const end = computed(() =>
  Math.min(
    props.items.length,
    start.value + Math.ceil(props.viewportH / props.rowH) + overscan * 2,
  ),
);
const visibleItems = computed(() => props.items.slice(start.value, end.value));

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop;
}
</script>
```

### 追问

- 你会先看哪些指标来判断「系统设计：10 万条数据的高性能虚拟列表」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「系统设计：10 万条数据的高性能虚拟列表」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 系统设计、虚拟列表，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 变高列表：维护 `measured: Map<index, height>`，用累加偏移 + 二分查找定位
- TanStack Virtual / vue-virtual-scroller 是工业实现参考

## design-upload-system

title: 系统设计：秒传 + 断点续传 + 大文件上传组件
followups: [design-upload-system-followup-1]
links: [06-network/upload-download]
difficulty: 资深
tags: [系统设计, 上传]

### 一句话

切片：File.slice(start, end) 切成固定大小（如 5MB）；秒传：算整文件 hash → 询问服务端是否存在 → 存在则直接成功；断点续传：上传前询问"已上传分片列表"，跳过这些 chunk。

### 题目

设计一个支持秒传、断点续传、并发限流的大文件上传组件，描述前后端协议与关键实现。

### 答案要点

- **切片**：`File.slice(start, end)` 切成固定大小（如 5MB）
- **秒传**：算整文件 hash → 询问服务端是否存在 → 存在则直接成功
- **断点续传**：上传前询问"已上传分片列表"，跳过这些 chunk
- **并发限流**：同时最多 N 个分片在传，上传完触发下一个
- **失败重试**：单个分片失败重试 N 次，仍失败上报错误
- **进度聚合**：把所有分片的进度按权重合并

### 代码示例

```ts
async function uploadLarge(file: File, opts: { chunkSize?: number; concurrency?: number } = {}) {
  const { chunkSize = 5 * 1024 * 1024, concurrency = 3 } = opts;
  const chunks: { idx: number; blob: Blob }[] = [];
  for (let i = 0; i * chunkSize < file.size; i++)
    chunks.push({ idx: i, blob: file.slice(i * chunkSize, (i + 1) * chunkSize) });

  const fileHash = await hashFile(file);
  const { uploaded, exist } = await checkUploaded(fileHash); // 询问服务端
  if (exist) return { ok: true, fileHash };

  const todo = chunks.filter((c) => !uploaded.includes(c.idx));
  const queue = [...todo];
  let active = 0;

  await new Promise<void>((resolve, reject) => {
    const next = () => {
      if (!queue.length && active === 0) return resolve();
      while (active < concurrency && queue.length) {
        const c = queue.shift()!;
        active++;
        uploadChunk(fileHash, c).then(
          () => {
            active--;
            next();
          },
          (err) => reject(err),
        );
      }
    };
    next();
  });

  return mergeChunks(fileHash); // 通知服务端合并
}

async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

declare function checkUploaded(hash: string): Promise<{ uploaded: number[]; exist: boolean }>;
declare function uploadChunk(hash: string, c: { idx: number; blob: Blob }): Promise<void>;
declare function mergeChunks(hash: string): Promise<{ ok: true; fileHash: string }>;
```

### 追问

- 推动「系统设计：秒传 + 断点续传 + 大文件上传组件」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「系统设计：秒传 + 断点续传 + 大文件上传组件」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 系统设计、上传，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大文件 hash 用 Web Worker 跑 SparkMD5 或 SHA-256，避免阻塞主线程
- 通过 `IndexedDB` 持久化上传进度，浏览器崩溃恢复后继续

## design-monitoring-sdk

title: 系统设计：前端监控 SDK 核心模块
followups: [design-monitoring-sdk-followup-1, design-monitoring-sdk-followup-2, design-monitoring-sdk-followup-3]
links: [16-observability/error-capture]
difficulty: 资深
tags: [系统设计, 监控]

### 一句话

采集：JS Error / Promise Rejection / 资源加载失败 / Vue errorHandler / 自定义业务错误；性能：FCP/LCP/INP/CLS（PerformanceObserver）/ 长任务 / 接口耗时。

### 题目

让你设计一个前端监控 SDK，包含哪些核心模块？如何保证稳定性、低开销、不影响业务？

### 答案要点

- **采集**：JS Error / Promise Rejection / 资源加载失败 / Vue errorHandler / 自定义业务错误
- **性能**：FCP/LCP/INP/CLS（PerformanceObserver）/ 长任务 / 接口耗时
- **行为**：路由切换 / 点击 / 滚动 / Session Replay
- **上报**：Beacon API（页面 unload 仍可发送）/ fetch keepalive，批量+采样+去重
- **稳定性**：try/catch 包裹采集逻辑、SDK 自身错误隔离、超低开销
- **隐私**：URL/Cookie/Body 脱敏、合规上报

### 代码示例

```ts
class Monitor {
  private queue: any[] = [];
  private timer: any = null;

  init() {
    window.addEventListener('error', (e) =>
      this.report({ type: 'error', message: e.message, stack: e.error?.stack }),
    );
    window.addEventListener('unhandledrejection', (e) =>
      this.report({ type: 'unhandled', reason: String(e.reason) }),
    );
    new PerformanceObserver((list) =>
      list
        .getEntries()
        .forEach((entry) =>
          this.report({ type: 'perf', name: entry.name, duration: entry.duration }),
        ),
    ).observe({ entryTypes: ['longtask', 'largest-contentful-paint', 'first-input'] });
    addEventListener(
      'visibilitychange',
      () => document.visibilityState === 'hidden' && this.flush(true),
    );
  }

  private report(data: any) {
    this.queue.push({ ...data, ts: Date.now(), url: location.href });
    if (this.queue.length >= 10) this.flush();
    else if (!this.timer) this.timer = setTimeout(() => this.flush(), 5000);
  }

  private flush(sync = false) {
    if (!this.queue.length) return;
    const data = JSON.stringify(this.queue);
    this.queue = [];
    clearTimeout(this.timer);
    this.timer = null;
    if (sync && navigator.sendBeacon) navigator.sendBeacon('/api/monitor', data);
    else fetch('/api/monitor', { method: 'POST', body: data, keepalive: true });
  }
}
```

### 常见误区

- onerror 拿不到跨域 script 的真实信息——脚本要加 crossorigin
- sendBeacon 数据有大小限制（一般 64KB）
- 错误去重：相同堆栈反复上报会刷屏，要做指纹采样

### 追问

- 怎么把 source map 安全地放到内网做反解
- session replay 的隐私字段是怎么屏蔽的
- 怎么衡量 SDK 自身的性能开销（自监控）

### 延伸

- Sentry 工业实现：source map 上传、采样、breadcrumb、Session Replay
- 关键不是"采得越多越好"，而是"稳定、低侵入、不影响业务"

## interview-expression

title: 面试表达策略：先结论，后展开，再补边界
followups: [interview-expression-followup-1]
difficulty: 基础
tags: [表达, 面试, 软技能]

### 一句话

金字塔表达：先抛主线/结论 → 再分点展开 → 再补边界与取舍；不要"代码先行 + 默默写代码"，要"边写边讲思路+复杂度+陷阱"；系统设计题先澄清问题：场景、规模、约束，不要直接动手。

### 题目

为什么很多人会做题但面试表现一般？回答技术题更稳的表达结构是什么？

### 答案要点

- **金字塔表达**：先抛主线/结论 → 再分点展开 → 再补边界与取舍
- 不要"代码先行 + 默默写代码"，要"边写边讲思路+复杂度+陷阱"
- 系统设计题先**澄清问题**：场景、规模、约束，不要直接动手
- 不会的诚实承认，但要展示"如果遇到我会怎么查、怎么定位"

### 代码示例

```text
回答模板（30 秒内开口）：
1. 主线："这道题本质是 XX 模式，关键在 YY"
2. 复杂度："时间 O(n)，空间 O(1)"
3. 陷阱："边界要注意 A/B/C"
4. 落地代码（边写边读）
5. 进阶："如果数据量更大 / 要求实时 / 要求稳定，可以考虑 ZZ"
```

### 追问

- 如果只有 60 秒，你会如何压缩一个复杂项目回答？
- 面试官连续追问细节时，如何避免越讲越散？
- 不会的问题怎么诚实回答，同时体现推导和验证能力？

### 常见误区

- 背模板但不听问题，导致答非所问。
- 只讲“我做了什么”，不讲目标、约束、结果和复盘。
- 遇到不会的问题直接沉默或硬编，反而暴露可信度问题。

### 延伸

- STAR / 4F 适合行为面试题
- 提前练习"白板"或"共享屏幕讲解"，让表达成为肌肉记忆

## design-rich-editor

title: 设计一个富文本编辑器
followups: [design-rich-editor-followup-1]
links: [28-customer-service-im/chat-rich-text-safe-render]
difficulty: 资深
tags: [系统设计, 富文本, 编辑器]

### 一句话

数据模型：放弃 contentEditable 的 DOM，用自定义 JSON tree（block + inline + marks）；选择 Slate / TipTap / Lexical / ProseMirror，各家都有 plugin 体系。

### 题目

让你设计 Notion / 飞书文档级别的富文本编辑器，整体架构、数据模型、协作和性能怎么考虑？

### 答案要点

- 数据模型：放弃 contentEditable 的 DOM，用自定义 JSON tree（block + inline + marks）
- 选择 Slate / TipTap / Lexical / ProseMirror，各家都有 plugin 体系
- 渲染：从 JSON 渲染成 DOM，编辑时双向同步；contenteditable 只作为输入源
- 输入：handle key event，转成 transaction，操作 model 而不是 DOM
- 撤销：操作以原子 transaction 为单位入 history stack
- 协作：CRDT（Yjs / Automerge）或 OT（ShareDB），避免冲突
- 块化：每段 block 独立挂载 / 卸载 + virtual scroll，长文档不卡
- 嵌入：图片 / 代码 / 视频 / mention / 表格作为独立 block，提供 schema
- 离线：本地 IndexedDB 存最新 doc，恢复网络后再同步
- 富功能：搜索 / 大纲 / 评论 / 历史版本 / 分享权限

### 代码示例

```ts
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { yXmlFragment } from 'yjs';

const doc = new Y.Doc();
new WebrtcProvider('kap-doc-1', doc);
const fragment = doc.getXmlFragment('content');

doc.transact(() => {
  const p = new Y.XmlElement('paragraph');
  p.insert(0, [new Y.XmlText('Hello CRDT')]);
  fragment.push([p]);
});

doc.on('update', (update) => {
  syncToServer(Y.encodeStateAsUpdate(doc));
});
```

### 追问

- 推动「设计一个富文本编辑器」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「设计一个富文本编辑器」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 系统设计、富文本、编辑器，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真实编辑器最大成本是"边界 case"和"协同冲突解决"，框架选成熟的别造轮子
- Notion 早期单页 doc 大了之后卡，是因为没有 block 级 virtualization，最终重写

## design-realtime-collab

title: 设计一个多人实时协作系统（光标 / 编辑 / 在线状态）
followups: [design-realtime-collab-followup-1]
links: [10-architecture/local-first-sync-crdt]
difficulty: 资深
tags: [实时协作, 系统设计]

### 一句话

通信：WebSocket / WebRTC，长连接保活 + 心跳 + 重连；一致性：CRDT（Yjs、Automerge）首选，OT（ShareDB）次选；CRDT 不需要中心服务器仲裁。

### 题目

要让多人在同一文档 / 画布上实时协作（看到彼此光标、互不冲突地编辑），整体怎么设计？

### 答案要点

- 通信：WebSocket / WebRTC，长连接保活 + 心跳 + 重连
- 一致性：CRDT（Yjs、Automerge）首选，OT（ShareDB）次选；CRDT 不需要中心服务器仲裁
- Presence：各用户自身状态（光标位置、选中区域、在线 / 离开）通过 awareness 协议广播
- 性能：高频信令（光标移动）用 throttle + 局部信道；操作信令保证可靠送达
- 离线：操作进 local 队列，重连后批量同步
- 权限：可读 / 可评论 / 可编辑分级，服务端二次校验
- 扩展：服务端水平扩展 + 房间分片 + 消息队列；持久化定期 snapshot
- 监控：在线人数、消息时延、丢包率、冲突数

### 代码示例

```ts
import { Awareness } from 'y-protocols/awareness';

const aware = new Awareness(doc);
aware.setLocalStateField('user', { name: 'kap', color: '#0ea5e9' });

window.addEventListener(
  'mousemove',
  throttle((e: MouseEvent) => {
    aware.setLocalStateField('cursor', { x: e.pageX, y: e.pageY });
  }, 50),
);

aware.on('change', () => {
  for (const [clientId, state] of aware.getStates()) {
    if (clientId === aware.clientID) continue;
    paintCursor(state.cursor, state.user);
  }
});
```

### 追问

- 推动「设计一个多人实时协作系统（光标 / 编辑 / 在线状态）」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「设计一个多人实时协作系统（光标 / 编辑 / 在线状态）」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 实时协作、系统设计，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真实业务的 CRDT 内存增长是个坑，要做"垃圾回收"或"snapshot 重置"
- 跨数据中心协作要看延迟分布，超过 200ms 单线程合并就会有"漂移感"

## difficult-bug-story

title: 你遇到过最难调的一个 bug 是什么
followups: [difficult-bug-story-followup-1]
difficulty: 进阶
tags: [软实力, 经验, 高频]

### 一句话

讲故事用 STAR：背景 → 现象 → 排查路径（每一步排除假设）→ 根因 → 修复 → 复盘改进。重点不是"难"，而是**清晰的思维过程 + 可复用的经验沉淀**。

### 题目

请用 STAR 框架描述一次让你印象深刻的 bug 排查经历。

### 答案要点

- **常见加分案例方向**
  - 偶发性问题：只在线上 / 弱网 / 特定机型出现 → 数据采样 + 上报关联
  - 内存泄漏：DevTools Memory 面板 + heap snapshot 对比
  - 浏览器底层差异：iOS Safari 的事件冒泡 / 输入法 / 横屏问题
  - 多人协作冲突：状态管理 race condition / 缓存击穿
  - 性能退化：发版后某个指标突变 → git bisect 定位 commit
- **STAR 模板**
  - **Situation**：什么时间 / 什么业务 / 影响范围
  - **Task**：你的角色 + 要解决到什么程度
  - **Action**：
    - 提出假设并优先级排序
    - 用什么工具（Performance / Memory / Charles / curl / log / dump）
    - 哪些路被排除
    - 找到根因的关键证据
  - **Result**：修复方式 + 业务指标变化 + 沉淀（文档 / 工具 / 规范）
- **避免**：流水账、把锅推队友、技术词堆砌、说不清"为什么这么排查"

### 代码示例

```text
背景：电商首页曝光率比上线前下降 12%（线上灰度发布后）
- 假设 1：白屏 → 排查 LCP 上报：90 分位变化不大 ❌
- 假设 2：曝光埋点丢失 → 排查 SDK 版本：未变 ❌
- 假设 3：路由懒加载 chunk 加载失败
  - Sentry 看到 "ChunkLoadError" 暴增 ✅
  - 定位：CDN 老 hash 文件 24 小时后 410，弱网用户 service worker 仍持久缓存 index.html，里面引用的 chunk 已经不存在
- 修复：
  - 临时：CDN 老 hash 至少保留 7 天
  - 长期：捕获 ChunkLoadError 后强制刷新页面
  - 长期：service worker 改为 network-first index.html，stale-while-revalidate 静态资源
- 沉淀：写了《前端发版流量切换 checklist》，加到 release 审批模板
```

### 追问

- 「你遇到过最难调的一个 bug」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「你遇到过最难调的一个 bug」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 软实力、经验、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真实回答最好准备 2-3 个不同方向的故事（前端 / 后端联调 / 性能）
- 面试官关注：思考路径 > 技术细节 > 故事戏剧性

## handwrite-call-apply-bind-followup-1

title: 追问：「手写 call / apply / bind」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [手写, this, 高频, 追问]
parent: handwrite-call-apply-bind

### 题目

如果面试官追问：「手写 call / apply / bind」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「手写 call / apply / bind」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「call/apply 本质：把函数挂为目标对象的临时属性 → 调用 → 删除属性」要进一步补到边界条件里，而不是只复述结论。

## handwrite-new-instanceof-followup-1

title: 追问：「手写 new 与 instanceof」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [手写, 原型, 高频, 追问]
parent: handwrite-new-instanceof

### 题目

如果面试官追问：「手写 new 与 instanceof」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「手写 new 与 instanceof」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「new 的四步：创建对象 → 链原型 → 执行构造（this 指向新对象） → 若构造返回对象则用之，否则返回新对象」要进一步补到边界条件里，而不是只复述结论。

## handwrite-curry-compose-followup-1

title: 追问：「手写 curry / compose / pipe」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [函数式, 手写, 追问]
parent: handwrite-curry-compose

### 题目

如果面试官追问：「手写 curry / compose / pipe」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「手写 curry / compose / pipe」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「curry：参数数量达到 fn.length 才执行，否则返回继续接收参数的函数」要进一步补到边界条件里，而不是只复述结论。

## handwrite-event-emitter-followup-1

title: 追问：推动「手写 EventEmitter（含 once / off / wildcards）」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [发布订阅, 手写, 高频, 追问]
parent: handwrite-event-emitter

### 题目

如果面试官追问：推动「手写 EventEmitter（含 once / off / wildcards）」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「手写 EventEmitter（含 once / off / wildcards）」拆成可验证的小步骤，逐步替换高风险部分。

## handwrite-deep-clone-circular-followup-1

title: 追问：「手写深拷贝（处理循环引用 + Symbol + 特殊对象）」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [手写, 高频, 对象, 追问]
parent: handwrite-deep-clone-circular

### 题目

如果面试官追问：「手写深拷贝（处理循环引用 + Symbol + 特殊对象）」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「手写深拷贝（处理循环引用 + Symbol + 特殊对象）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「用 WeakMap 记录已克隆对象，遇到相同引用直接返回，避免无限递归」要进一步补到边界条件里，而不是只复述结论。

## handwrite-ajax-fetch-followup-1

title: 追问：「手写一个简版 ajax / 带超时与重试的 fetch」在弱网、代理、断连或服务端限流时会出现哪些边界问题
difficulty: 进阶
tags: [网络, 手写, 追问]
parent: handwrite-ajax-fetch

### 题目

如果面试官追问：「手写一个简版 ajax / 带超时与重试的 fetch」在弱网、代理、断连或服务端限流时会出现哪些边界问题？

### 答案要点

#### 核心回答

- 先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「手写一个简版 ajax / 带超时与重试的 fetch」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

## design-virtual-list-followup-1

title: 追问：你会先看哪些指标来判断「系统设计：10 万条数据的高性能虚拟列表」是不是当前性能瓶颈
difficulty: 资深
tags: [系统设计, 虚拟列表, 追问]
parent: design-virtual-list

### 题目

如果面试官追问：你会先看哪些指标来判断「系统设计：10 万条数据的高性能虚拟列表」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「系统设计：10 万条数据的高性能虚拟列表」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## design-upload-system-followup-1

title: 追问：推动「系统设计：秒传 + 断点续传 + 大文件上传组件」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [系统设计, 上传, 追问]
parent: design-upload-system

### 题目

如果面试官追问：推动「系统设计：秒传 + 断点续传 + 大文件上传组件」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「系统设计：秒传 + 断点续传 + 大文件上传组件」拆成可验证的小步骤，逐步替换高风险部分。

## design-monitoring-sdk-followup-1

title: 追问：推动「系统设计：前端监控 SDK 核心模块」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [系统设计, 监控, 追问]
parent: design-monitoring-sdk

### 题目

如果面试官追问：推动「系统设计：前端监控 SDK 核心模块」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「系统设计：前端监控 SDK 核心模块」不是只在理想输入下成立。
- 再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## design-monitoring-sdk-followup-2

title: 追问：如果团队成员能力和历史包袱不一致，你会如何拆阶段推进
difficulty: 资深
tags: [系统设计, 监控, 追问]
parent: design-monitoring-sdk

### 题目

如果面试官追问：如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「系统设计：前端监控 SDK 核心模块」拆成可验证的小步骤，逐步替换高风险部分。

## design-monitoring-sdk-followup-3

title: 追问：你会用哪些指标判断这个工程方案长期值得维护
difficulty: 资深
tags: [系统设计, 监控, 追问]
parent: design-monitoring-sdk

### 题目

如果面试官追问：你会用哪些指标判断这个工程方案长期值得维护？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「系统设计：前端监控 SDK 核心模块」不是只在理想输入下成立。
- 再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## interview-expression-followup-1

title: 追问：如果只有 60 秒，你会如何压缩一个复杂项目回答
difficulty: 基础
tags: [表达, 面试, 软技能, 追问]
parent: interview-expression

### 题目

如果面试官追问：如果只有 60 秒，你会如何压缩一个复杂项目回答？

### 答案要点

#### 核心回答

- 先给一句话主线：这个项目解决了什么业务或工程问题。
- 只保留三个信息点：你的角色、关键难点、可验证结果；技术细节等面试官追问时再展开。
- 结尾主动留钩子：如果你感兴趣，我可以继续展开性能治理、架构取舍或线上风险控制。
- 60 秒版本不是删掉技术含量，而是把“背景噪音”删掉，让对方先知道为什么值得继续问。

## design-rich-editor-followup-1

title: 追问：推动「设计一个富文本编辑器」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [系统设计, 富文本, 编辑器, 追问]
parent: design-rich-editor

### 题目

如果面试官追问：推动「设计一个富文本编辑器」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「设计一个富文本编辑器」拆成可验证的小步骤，逐步替换高风险部分。

## design-realtime-collab-followup-1

title: 追问：推动「设计一个多人实时协作系统（光标 / 编辑 / 在线状态）」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [实时协作, 系统设计, 追问]
parent: design-realtime-collab

### 题目

如果面试官追问：推动「设计一个多人实时协作系统（光标 / 编辑 / 在线状态）」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「设计一个多人实时协作系统（光标 / 编辑 / 在线状态）」拆成可验证的小步骤，逐步替换高风险部分。

## difficult-bug-story-followup-1

title: 追问：「你遇到过最难调的一个 bug」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [软实力, 经验, 高频, 追问]
parent: difficult-bug-story

### 题目

如果面试官追问：「你遇到过最难调的一个 bug」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「你遇到过最难调的一个 bug」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「偶发性问题：只在线上 / 弱网 / 特定机型出现 → 数据采样 + 上报关联」要进一步补到边界条件里，而不是只复述结论。
