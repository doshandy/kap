---
id: 21-interview-special
title: 面试专题
order: 21
icon: 🎯
description: 高频手写题、系统设计题与面试表达策略。
---

## handwrite-call-apply-bind
title: 手写 call / apply / bind
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

### 延伸
- 箭头函数没有自己的 this，调用 `bind/call/apply` 不会改变 this
- `Function.prototype.bind` 是 ES5 引入，绑定后 `length` 会扣除已传参数

## handwrite-new-instanceof
title: 手写 new 与 instanceof
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

### 延伸
- `Symbol.hasInstance` 可自定义 `instanceof` 行为
- `Object.create(null)` 创建的对象 `instanceof Object` 为 false

## handwrite-curry-compose
title: 手写 curry / compose / pipe
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
const compose = <T>(...fns: ((x: T) => T)[]) =>
  (x: T) => fns.reduceRight((acc, fn) => fn(acc), x);

// pipe: 从左向右应用
const pipe = <T>(...fns: ((x: T) => T)[]) =>
  (x: T) => fns.reduce((acc, fn) => fn(acc), x);

// 用例
const add = (a: number) => (b: number) => a + b;
const double = (n: number) => n * 2;
pipe(add(1), double)(3); // (3+1)*2 = 8
```

### 延伸
- Redux 中间件用 compose 串联
- RxJS 的 `pipe` 是同思想的运算符组合

## handwrite-event-emitter
title: 手写 EventEmitter（含 once / off / wildcards）
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
    if (arr) this.map.set(event, arr.filter(f => f !== fn));
  }

  once(event: string, fn: Handler): void {
    const wrap: Handler = (...args) => { fn(...args); this.off(event, wrap); };
    this.on(event, wrap);
  }

  emit(event: string, ...args: any[]): void {
    // 复制一份避免在回调中 off 影响遍历
    [...(this.map.get(event) || [])].forEach(fn => {
      try { fn(...args); } catch (e) { console.error(e); }
    });
    [...(this.map.get('*') || [])].forEach(fn => fn(event, ...args));
  }
}
```

### 延伸
- Vue 3 不再内置 `$on/$off`，推荐使用 mitt
- Node.js 的 `EventEmitter` 有 `setMaxListeners`、`error` 事件兜底

## handwrite-deep-clone-circular
title: 手写深拷贝（处理循环引用 + Symbol + 特殊对象）
difficulty: 资深
tags: [手写, 高频, 对象]

### 一句话
用 WeakMap 记录已克隆对象，遇到相同引用直接返回，避免无限递归；特殊对象需要单独构造：new Date()、new RegExp()、new Map()、new Set()…。

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
    const m = new Map(); seen.set(value as any, m);
    value.forEach((v, k) => m.set(deepClone(k, seen), deepClone(v, seen)));
    return m as any;
  }
  if (value instanceof Set) {
    const s = new Set(); seen.set(value as any, s);
    value.forEach(v => s.add(deepClone(v, seen)));
    return s as any;
  }

  const out: any = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));
  seen.set(value as any, out);
  Reflect.ownKeys(value as any).forEach(k => {
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
function ajax(opts: { url: string; method?: string; data?: any; headers?: Record<string, string> }) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(opts.method || 'GET', opts.url, true);
    Object.entries(opts.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve(JSON.parse(xhr.responseText))
      : reject(new Error(`HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network Error'));
    xhr.send(opts.data ? JSON.stringify(opts.data) : null);
  });
}

// 2. 带超时与重试的 fetch
async function fetchWithRetry(url: string, opts: RequestInit & { timeout?: number; retries?: number } = {}) {
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
      await new Promise(r => setTimeout(r, 2 ** i * 200)); // 指数退避
    } finally {
      clearTimeout(timer);
    }
  }
}
```

### 延伸
- 真实工程用 axios / ky，重点理解拦截器、取消、上传/下载进度

## design-virtual-list
title: 系统设计：10 万条数据的高性能虚拟列表
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
const props = defineProps<{ items: { id: string; text: string }[]; rowH: number; viewportH: number }>();
const scrollTop = ref(0);
const overscan = 5;

const totalH = computed(() => props.items.length * props.rowH);
const offsets = computed(() => props.items.map((_, i) => i * props.rowH));
const start = computed(() => Math.max(0, Math.floor(scrollTop.value / props.rowH) - overscan));
const end = computed(() =>
  Math.min(props.items.length, start.value + Math.ceil(props.viewportH / props.rowH) + overscan * 2),
);
const visibleItems = computed(() => props.items.slice(start.value, end.value));

function onScroll(e: Event) {
  scrollTop.value = (e.target as HTMLElement).scrollTop;
}
</script>
```

### 延伸
- 变高列表：维护 `measured: Map<index, height>`，用累加偏移 + 二分查找定位
- TanStack Virtual / vue-virtual-scroller 是工业实现参考

## design-upload-system
title: 系统设计：秒传 + 断点续传 + 大文件上传组件
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

  const todo = chunks.filter(c => !uploaded.includes(c.idx));
  const queue = [...todo];
  let active = 0;

  await new Promise<void>((resolve, reject) => {
    const next = () => {
      if (!queue.length && active === 0) return resolve();
      while (active < concurrency && queue.length) {
        const c = queue.shift()!;
        active++;
        uploadChunk(fileHash, c).then(
          () => { active--; next(); },
          err => reject(err),
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
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

declare function checkUploaded(hash: string): Promise<{ uploaded: number[]; exist: boolean }>;
declare function uploadChunk(hash: string, c: { idx: number; blob: Blob }): Promise<void>;
declare function mergeChunks(hash: string): Promise<{ ok: true; fileHash: string }>;
```

### 延伸
- 大文件 hash 用 Web Worker 跑 SparkMD5 或 SHA-256，避免阻塞主线程
- 通过 `IndexedDB` 持久化上传进度，浏览器崩溃恢复后继续

## design-monitoring-sdk
title: 系统设计：前端监控 SDK 核心模块
difficulty: 资深
tags: [系统设计, 监控]

### 一句话
采集：JS Error / Promise Rejection / 资源加载失败 / Vue errorHandler / 自定义业务错误；性能：FCP/LCP/INP/CLS（PerformanceObserver）/ 长任务 / 接口耗时…。

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
    window.addEventListener('error', e => this.report({ type: 'error', message: e.message, stack: e.error?.stack }));
    window.addEventListener('unhandledrejection', e => this.report({ type: 'unhandled', reason: String(e.reason) }));
    new PerformanceObserver(list =>
      list.getEntries().forEach(entry => this.report({ type: 'perf', name: entry.name, duration: entry.duration })),
    ).observe({ entryTypes: ['longtask', 'largest-contentful-paint', 'first-input'] });
    addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && this.flush(true));
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
    clearTimeout(this.timer); this.timer = null;
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

### 延伸
- STAR / 4F 适合行为面试题
- 提前练习"白板"或"共享屏幕讲解"，让表达成为肌肉记忆

## design-rich-editor
title: 设计一个富文本编辑器
difficulty: 资深
tags: [系统设计, 富文本, 编辑器]

### 一句话
数据模型：放弃 contentEditable 的 DOM，用自定义 JSON tree（block + inline + marks）；选择 Slate / TipTap / Lexical / ProseMirror，各家都有 plugin 体系…。

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

### 延伸
- 真实编辑器最大成本是"边界 case"和"协同冲突解决"，框架选成熟的别造轮子
- Notion 早期单页 doc 大了之后卡，是因为没有 block 级 virtualization，最终重写

## design-realtime-collab
title: 设计一个多人实时协作系统（光标 / 编辑 / 在线状态）
difficulty: 资深
tags: [实时协作, 系统设计]

### 一句话
通信：WebSocket / WebRTC，长连接保活 + 心跳 + 重连；一致性：CRDT（Yjs、Automerge）首选，OT（ShareDB）次选；CRDT 不需要中心服务器仲裁…。

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

window.addEventListener('mousemove', throttle((e: MouseEvent) => {
  aware.setLocalStateField('cursor', { x: e.pageX, y: e.pageY });
}, 50));

aware.on('change', () => {
  for (const [clientId, state] of aware.getStates()) {
    if (clientId === aware.clientID) continue;
    paintCursor(state.cursor, state.user);
  }
});
```

### 延伸
- 真实业务的 CRDT 内存增长是个坑，要做"垃圾回收"或"snapshot 重置"
- 跨数据中心协作要看延迟分布，超过 200ms 单线程合并就会有"漂移感"

## difficult-bug-story
title: 你遇到过最难调的一个 bug 是什么
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

### 延伸
- 真实回答最好准备 2-3 个不同方向的故事（前端 / 后端联调 / 性能）
- 面试官关注：思考路径 > 技术细节 > 故事戏剧性

