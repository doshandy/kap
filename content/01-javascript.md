---
id: 01-javascript
title: JavaScript 核心
order: 1
icon: 🟨
description: 原型、闭包、事件循环、Promise、模块化、内存与性能等核心机制。
---

## prototype-chain
title: 原型链是什么？查找规则和终点
difficulty: 基础
tags: [原型, 继承]

### 题目
请描述 JavaScript 的原型链查找规则、终止条件，以及它与「类继承」的本质区别。

### 答案要点
- 每个对象都有内部槽 `[[Prototype]]`，访问属性时若自身不存在则沿原型链向上查找
- 函数有 `prototype` 属性，`new` 出来的实例 `[[Prototype]]` 指向该 `prototype`
- 链的终点是 `Object.prototype`，再上一层为 `null`，查找失败返回 `undefined`
- ES6 `class` 是原型继承的语法糖：方法定义在 `Class.prototype` 上，静态方法在构造函数上
- 与基于类的语言（Java/C++）的本质差异：原型继承是**对象到对象**的委托，运行时可改变；类继承是**类型到类型**的复制

### 代码示例
```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return `${this.name} 叫`; };

class Dog extends Animal {
  constructor(name) { super(name); }
  speak() { return `${super.speak()}：汪`; }
}

const d = new Dog('阿黄');
Object.getPrototypeOf(d) === Dog.prototype;            // true
Object.getPrototypeOf(Dog.prototype) === Animal.prototype; // true
Object.getPrototypeOf(Animal.prototype) === Object.prototype; // true
Object.getPrototypeOf(Object.prototype) === null;     // true
```

### 延伸
- `Object.create(null)` 可创建无原型的纯字典对象，适合存储不受保留字干扰的键
- `__proto__` 已废弃，使用 `Object.getPrototypeOf` / `Object.setPrototypeOf`
- `hasOwnProperty` 安全写法：`Object.hasOwn(obj, key)`（ES2022）

## this-binding
title: this 指向的七种场景
difficulty: 基础
tags: [this, 函数]

### 题目
列举 this 绑定的全部规则，并说明优先级。箭头函数为何"没有 this"？

### 答案要点
1. **默认绑定**：直接调用函数，非严格 `globalThis`，严格 `undefined`
2. **隐式绑定**：`obj.fn()`，this 指向 obj
3. **显式绑定**：`call/apply/bind`，this 指向第一个参数
4. **new 绑定**：`new Fn()`，this 指向新创建的对象
5. **箭头函数**：捕获定义时所在词法环境的 this，不可用 call/apply/bind 改变
6. **DOM 事件**：默认 this 指向触发元素（非箭头）
7. **类方法**：自动 strict mode，未绑定时 this 为 undefined

优先级：`new` > 显式绑定 > 隐式绑定 > 默认绑定。

### 代码示例
```js
const obj = { x: 1, get() { return this.x; } };
const f = obj.get;
obj.get();         // 1（隐式）
f();               // undefined（默认 + 严格）
f.call(obj);       // 1（显式）
new obj.get();     // {}（new 绑定，忽略隐式）

const arrow = () => this;
arrow.call({ a: 1 }); // 仍是外层 this，不会被改变
```

### 延伸
- 类字段（class fields）写成箭头函数 `onClick = () => {}` 是常见的 React 绑定写法，但每个实例都新建一份函数
- Vue 3 `<script setup>` 中无 `this`，组合式 API 取消了 this 心智负担

## closure
title: 闭包的定义、用途与陷阱
difficulty: 基础
tags: [闭包, 作用域]

### 题目
什么是闭包？典型用途和常见的内存陷阱有哪些？

### 答案要点
- 闭包 = **函数 + 它定义时的词法环境**
- 用途：数据私有、模块模式、柯里化、防抖节流、React Hooks 闭包陷阱、`for-let` 循环捕获
- 内存陷阱：
  - 长生命周期对象引用闭包内大对象 → 无法回收
  - DOM 节点 + 闭包的循环引用（旧 IE 严重，现代 V8 已改善但仍有泄漏风险）
  - 定时器/事件监听器没解绑，闭包持续持有外部变量

### 代码示例
```js
function counter() {
  let n = 0;
  return {
    inc: () => ++n,
    get: () => n,
  };
}
const c = counter();
c.inc(); c.inc();
c.get(); // 2，n 始终被两个闭包共享
```

### 延伸
- React `useEffect` 中读到旧的 state，本质是闭包捕获了渲染时的 state 快照，需用 ref 或函数式更新
- Vue 3 `setup` 中所有变量天然都是闭包，配合 `ref/reactive` 实现响应式

## event-loop
title: 浏览器事件循环：宏任务、微任务、RAF、IDLE
difficulty: 进阶
tags: [事件循环, 异步]

### 题目
描述浏览器事件循环的完整执行模型，并解释下面输出顺序。

```js
console.log(1);
setTimeout(() => console.log(2));
Promise.resolve().then(() => console.log(3));
requestAnimationFrame(() => console.log(4));
queueMicrotask(() => console.log(5));
console.log(6);
```

### 答案要点
- 可以把浏览器主线程理解为反复执行：取一个 task（宏任务）→ 清空 microtask → 浏览器在合适时机执行渲染相关工作（其中可包含 `requestAnimationFrame` 回调）→ 进入下一轮
- 微任务源：Promise.then、queueMicrotask、MutationObserver
- 宏任务源：setTimeout、setInterval、I/O、UI 事件、postMessage
- `requestAnimationFrame` 回调在浏览器下一次重绘前执行，它不是 Promise microtask，也不等同于普通 task
- `requestIdleCallback` 适合低优先级后台工作，但兼容性并不如 `requestAnimationFrame` 稳定，要求可靠触发时应配合 `timeout`

输出顺序通常是：`1, 6, 3, 5, 2`，而 `4` 会在后续某次重绘前执行；如果页面不可见或浏览器没安排下一帧，它可能更晚。

### 代码示例
```js
// 微任务能阻塞渲染（错误用法）
function block() {
  Promise.resolve().then(block);
}
// 这会让浏览器一直忙于清空微任务，直到栈溢出
```

### 延伸
- Node.js 事件循环阶段更复杂：timers / pending / poll / check / close，`setImmediate` vs `setTimeout(0)` 在 I/O 回调中顺序更容易观察到差异
- 在 Node.js CommonJS 场景里，`process.nextTick()` 队列通常先于 Promise microtask 队列；但在 ESM 场景下顺序可能不同，且 Node 官方已更推荐 `queueMicrotask()`

## promise-aplus
title: 手写一个符合 Promise/A+ 规范的 Promise
difficulty: 进阶
tags: [Promise, 异步, 手写]

### 题目
请实现 `MyPromise`，覆盖 then 链式调用、值穿透、异步解决、错误冒泡。

### 答案要点
- 三态：pending / fulfilled / rejected，状态不可逆
- `then` 返回新 Promise，回调放入队列异步执行（用 `queueMicrotask` 或 `MutationObserver`）
- `then` 的 onFulfilled/onRejected 必须异步调用
- 解析过程要处理 thenable 兼容（`resolvePromise(promise2, x, resolve, reject)`）

### 代码示例
```ts
class MyPromise<T = unknown> {
  state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  value: any;
  onFulfilled: Array<(v: any) => void> = [];
  onRejected: Array<(e: any) => void> = [];

  constructor(executor: (resolve: (v: T) => void, reject: (e: any) => void) => void) {
    const resolve = (v: any) => this.transition('fulfilled', v);
    const reject = (e: any) => this.transition('rejected', e);
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }

  private transition(state: 'fulfilled' | 'rejected', value: any) {
    if (this.state !== 'pending') return;
    this.state = state;
    this.value = value;
    const cbs = state === 'fulfilled' ? this.onFulfilled : this.onRejected;
    cbs.forEach(cb => queueMicrotask(() => cb(value)));
  }

  then<U>(onF?: (v: T) => U, onR?: (e: any) => U): MyPromise<U> {
    return new MyPromise<U>((resolve, reject) => {
      const handle = (state: 'fulfilled' | 'rejected') => {
        const cb = state === 'fulfilled' ? onF : onR;
        if (typeof cb !== 'function') {
          state === 'fulfilled' ? resolve(this.value) : reject(this.value);
          return;
        }
        try { resolve(cb(this.value)); } catch (e) { reject(e); }
      };
      if (this.state !== 'pending') queueMicrotask(() => handle(this.state as any));
      else {
        this.onFulfilled.push(() => handle('fulfilled'));
        this.onRejected.push(() => handle('rejected'));
      }
    });
  }
}
```

### 延伸
- `Promise.all` 短路失败，`Promise.allSettled` 永不失败，`Promise.any` 短路成功，`Promise.race` 第一个 settle 即返回
- async/await 是 Promise 的语法糖，await 等价于 `.then` + 包装

## async-await
title: async/await 在事件循环里的真实执行顺序
difficulty: 进阶
tags: [async, 事件循环]

### 题目
解释下面代码的输出顺序：

```js
async function a() { console.log('a1'); await b(); console.log('a2'); }
async function b() { console.log('b1'); }
a(); console.log('main');
```

### 答案要点
- async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise
- await 后面表达式立即求值（同步部分），然后将"恢复执行"作为微任务排入队列
- 因此：a1 → b1 → main → a2

### 代码示例
```js
// 等价改写
function a() {
  console.log('a1');
  return Promise.resolve(b()).then(() => { console.log('a2'); });
}
```

### 延伸
- 多个 await 串行：用 `Promise.all` 改成并发
- async 函数内 throw 等价于 reject，可被 `try/catch` 或 `.catch` 捕获
- `for await...of` 处理异步迭代器，需配合 `Symbol.asyncIterator`

## debounce-throttle
title: 手写防抖与节流
difficulty: 基础
tags: [手写, 性能]

### 题目
实现 `debounce(fn, wait, immediate)` 与 `throttle(fn, wait, { leading, trailing })`，并说明使用场景。

### 答案要点
- **防抖**：N 毫秒内重复触发 → 重新计时，最后一次后才执行。场景：搜索输入、resize 后计算
- **节流**：N 毫秒内最多执行一次。场景：scroll、mousemove、按钮防连点
- 注意 this/参数透传，cancel 方法

### 代码示例
```ts
function debounce<T extends (...a: any[]) => any>(fn: T, wait = 200, immediate = false) {
  let t: any;
  function debounced(this: any, ...args: Parameters<T>) {
    const callNow = immediate && !t;
    clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      if (!immediate) fn.apply(this, args);
    }, wait);
    if (callNow) fn.apply(this, args);
  }
  debounced.cancel = () => { clearTimeout(t); t = null; };
  return debounced;
}

function throttle<T extends (...a: any[]) => any>(fn: T, wait = 200) {
  let last = 0;
  let t: any;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remain = wait - (now - last);
    if (remain <= 0) {
      clearTimeout(t); t = null; last = now; fn.apply(this, args);
    } else if (!t) {
      t = setTimeout(() => { last = Date.now(); t = null; fn.apply(this, args); }, remain);
    }
  };
}
```

### 延伸
- VueUse 的 `useDebounceFn` / `useThrottleFn` 已有完善实现
- React 中用 `useRef` 持有定时器避免重新创建

## deep-clone
title: 深拷贝完整实现：循环引用、Symbol、特殊对象
difficulty: 进阶
tags: [手写, 对象]

### 题目
实现一个工业级深拷贝，处理循环引用、Symbol 键、Date/RegExp/Map/Set/函数。

### 答案要点
- 用 `WeakMap` 记录已克隆对象避免循环引用
- 区分类型：基本类型直接返回；Date/RegExp 调用构造器；Map/Set 递归；函数直接返回（业务上一般不克隆）
- 包含 Symbol 键：`Reflect.ownKeys` 同时拿到 string + symbol
- 现代浏览器 `structuredClone` 已可处理大部分情况（含循环引用），但不支持函数

### 代码示例
```ts
function deepClone<T>(value: T, seen = new WeakMap()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as any)) return seen.get(value as any);
  if (value instanceof Date) return new Date(value) as any;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as any;
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
  const out: any = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value as any, out);
  Reflect.ownKeys(value as any).forEach(k => {
    out[k] = deepClone((value as any)[k], seen);
  });
  return out;
}
```

### 延伸
- 性能更好的方案：`structuredClone(obj)`（HTML 标准 API）
- 序列化派 `JSON.parse(JSON.stringify(x))` 丢失 undefined/Symbol/循环引用/Date 转字符串

## esm-vs-cjs
title: ESM 与 CommonJS 的差异、互操作与陷阱
difficulty: 进阶
tags: [模块化, Node]

### 题目
ESM 与 CommonJS 在加载时机、绑定语义、循环依赖处理上的差异？为什么 Node 中两者互导会踩坑？

### 答案要点
- **ESM**：静态分析、异步加载、export 是**实时绑定**（live binding），可被 tree-shaking
- **CommonJS**：同步加载，围绕 `module.exports` 对象工作，天然不具备 ESM 那样的静态结构信息
- 互操作：在 Node 中，ESM `import` CommonJS 时会拿到一个以 `module.exports` 为核心的命名空间包装，通常可通过 default 访问；CommonJS 侧加载 ESM 时更通用的方式仍是 `import()`
- 循环依赖：ESM 先建立绑定再执行模块；CommonJS 则可能暴露“执行到一半的 exports 对象”

### 代码示例
```js
// ESM live binding
// a.mjs
export let count = 0;
export function inc() { count++; }
// b.mjs
import { count, inc } from './a.mjs';
console.log(count); // 0
inc();
console.log(count); // 1（live binding）
```

### 延伸
- Vite 利用 ESM 实现按需加载和 HMR
- `package.json` 中 `"type": "module"`、`exports` 字段，以及 Node/构建工具对 CJS / ESM 互操作的处理，是现代模块化踩坑高发区

## memory-leak
title: 前端常见内存泄漏与排查
difficulty: 进阶
tags: [内存, 性能]

### 题目
列举前端常见内存泄漏类型与对应排查方式。

### 答案要点
1. **未解绑的事件监听器**（特别是 window/document）→ 组件销毁时 removeEventListener
2. **未清理的定时器**（setInterval、setTimeout 自循环）→ clearInterval
3. **闭包持有大对象** → 显式置 null
4. **DOM 引用未释放**（detached DOM）→ Vue keep-alive、组件卸载后 ref 置空
5. **全局变量误用**（漏写 var/let/const）
6. **EventBus / store 中残留监听** → off
7. **WebSocket / 第三方 SDK 未销毁**

排查工具：Chrome DevTools → Memory → Heap snapshot 三次对比法（Allocation instrumentation on timeline、Detached HTMLElement 过滤）

### 代码示例
```ts
// Vue 中的清理范式
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  const id = setInterval(tick, 1000);
  const ws = new WebSocket(url);
  onUnmounted(() => {
    clearInterval(id);
    ws.close();
  });
});
```

### 延伸
- WeakMap/WeakSet/WeakRef 不阻止 GC，适合做缓存或 DOM 关联数据
- `FinalizationRegistry` 监听 GC（不保证立即触发，仅用于资源回收提示）

## proxy-reflect
title: Proxy 与 Reflect：13 种 trap 与 receiver 正确性
difficulty: 进阶
tags: [Proxy, 元编程]

### 题目
为什么 Proxy 的 handler 内部要用 `Reflect.get/set` 而不是直接 `target[key] = value`？

### 答案要点
- Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...
- 直接 `target[key]` 会丢失 receiver 信息，导致 getter 中的 this 错位（特别是继承链上）
- `Reflect.get(target, key, receiver)` 显式传 receiver，保证 getter/setter 中 this 正确

### 代码示例
```js
const parent = {
  _x: 1,
  get x() { return this._x; },
};
const child = new Proxy(Object.create(parent), {
  get(t, k, r) { return Reflect.get(t, k, r); },
});
child._x = 2;
console.log(child.x); // 2，receiver 正确指向 child
```

### 延伸
- Vue3 `reactive` 基于 Proxy 实现，对每个 trap 做依赖追踪
- 透明拦截不到的：基础数据类型不能 Proxy，私有属性 `#x` 不可代理（会抛 TypeError）

## iterator-generator
title: 迭代器、生成器与异步迭代
difficulty: 进阶
tags: [迭代器, 生成器]

### 题目
`Symbol.iterator`、`Symbol.asyncIterator`、`function*` 是怎么协作的？什么时候该手写迭代器？

### 答案要点
- 可迭代协议：对象拥有 `[Symbol.iterator]()` 方法返回迭代器（含 `next()`），就能被 `for...of`、解构、扩展
- 生成器：`function*` 自动实现迭代器协议，`yield` 暂停让出，`return` 标记 done
- 异步迭代：`Symbol.asyncIterator` + `for await...of`，每个 `next()` 返回 Promise
- 真实场景：流式数据（fetch ReadableStream）、分页拉取、惰性大集合、状态机
- 优势：内存友好（按需产出）、可暂停、可组合（pipe）

### 代码示例
```ts
function* range(start: number, end: number, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}
console.log([...range(0, 10, 2)]); // [0, 2, 4, 6, 8]

async function* lines(stream: ReadableStream<Uint8Array>) {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buf) yield buf;
      break;
    }
    buf += value;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      yield buf.slice(0, i);
      buf = buf.slice(i + 1);
    }
  }
}

async function* paginate<T>(fetchPage: (cursor?: string) => Promise<{ items: T[]; next?: string }>) {
  let cursor: string | undefined;
  do {
    const { items, next } = await fetchPage(cursor);
    yield* items;
    cursor = next;
  } while (cursor);
}
```

### 延伸
- 生成器 + Promise 组合可以模拟 async/await（早期 co 库就是这么做的）
- 想做"可暂停的协作式调度"（如 React 调度器）也是基于生成器思想

## structured-clone
title: 结构化克隆 vs JSON 序列化
difficulty: 进阶
tags: [克隆, postMessage]

### 题目
`structuredClone`、`JSON.parse(JSON.stringify(x))`、自实现深拷贝各自的能力边界？

### 答案要点
- `JSON`：丢失 `undefined / function / Symbol / Date / RegExp / Map / Set / BigInt / 循环引用`
- `structuredClone`：标准结构化克隆算法，支持 `Date / RegExp / Map / Set / ArrayBuffer / TypedArray / Blob / 循环引用`，无法克隆 function / DOM 节点 / Symbol
- 自实现：可定制（处理 class 实例、保留原型链、对外部资源做引用计数），但要小心循环引用
- `postMessage / Worker / IndexedDB` 内部都用结构化克隆，理解它就理解这些 API 的限制
- 性能：`structuredClone` 比 `JSON` 慢，但比手写递归通常更快且更正确

### 代码示例
```ts
const obj: Record<string, unknown> = { a: 1, d: new Date(), m: new Map([['k', 1]]), self: null };
obj.self = obj;
const cloned = structuredClone(obj);
console.log(cloned.self === cloned); // true，循环引用保留

function deepCloneClass<T>(x: T, seen = new WeakMap<object, unknown>()): T {
  if (x === null || typeof x !== 'object') return x;
  if (seen.has(x as object)) return seen.get(x as object) as T;
  const proto = Object.getPrototypeOf(x);
  const out = Array.isArray(x) ? [] : Object.create(proto);
  seen.set(x as object, out);
  for (const k of Reflect.ownKeys(x as object)) {
    (out as Record<PropertyKey, unknown>)[k] = deepCloneClass((x as Record<PropertyKey, unknown>)[k], seen);
  }
  return out as T;
}
```

### 延伸
- `structuredClone` 还能 transfer 大对象（不复制，权属转移）：`postMessage(buf, [buf])`
- 性能极致场景下可以用 `flatbuffers / msgpack` 自定义二进制协议绕过通用克隆

## tagged-template-literal
title: 模板字符串与标签模板的实战
difficulty: 进阶
tags: [模板字符串, 标签模板]

### 题目
标签模板（tagged template）有什么实际用途？除了 styled-components 还能怎么玩？

### 答案要点
- 语法：`tag` 函数收到 `(strings: TemplateStringsArray, ...values: unknown[])`
- 自动转义：把用户输入插值时强制走转义（防 XSS / SQL 注入）
- DSL 构造：写 GraphQL / SQL / CSS 时，能让编辑器有语法高亮（VS Code 插件按 tag 名识别）
- 国际化：`i18n` tag 可以根据 locale 重排参数顺序
- 编译期常量：`strings.raw` 保留未转义版本（如 `\n` 仍是字面量）

### 代码示例
```ts
function html(strings: TemplateStringsArray, ...values: unknown[]) {
  const escape = (s: unknown) =>
    String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return strings.reduce((out, cur, i) => out + cur + (i < values.length ? escape(values[i]) : ''), '');
}

const userInput = '<img onerror=alert(1)>';
document.body.innerHTML = html`
  <div>${userInput}</div>
`;

function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((out, cur, i) => out + cur + (i < values.length ? `$${i + 1}` : ''), '');
  return { text, values };
}
const id = 42;
const q = sql`SELECT * FROM users WHERE id = ${id}`;
```

### 延伸
- TS 5.0 的 `Tagged Template` 类型可以静态推断变量类型，做编译期的 DSL 校验
- 标签模板嵌套时性能要注意，每次都会新建数组

## weak-collection
title: WeakMap / WeakSet / WeakRef 与垃圾回收
difficulty: 资深
tags: [WeakMap, GC]

### 题目
什么时候必须用 `WeakMap`？`WeakRef` 和 `FinalizationRegistry` 又有什么用？

### 答案要点
- 普通 Map 强引用 key，被 Map 持有的 key 永远不会被 GC，容易内存泄漏
- WeakMap：key 必须是对象，弱引用，key 被回收时条目自动消失，适合"给对象挂私有数据"
- WeakSet：同理，做"对象集合的存在性检查"，不阻止回收
- WeakRef：手动持有弱引用，常用于缓存大对象，避免引用导致无法回收
- FinalizationRegistry：对象被 GC 时收到回调，但不保证及时也不保证调用，不能依赖

### 代码示例
```ts
const meta = new WeakMap<HTMLElement, { hover: boolean; lastShown: number }>();

function track(el: HTMLElement) {
  meta.set(el, { hover: false, lastShown: Date.now() });
  el.addEventListener('mouseenter', () => {
    const m = meta.get(el);
    if (m) m.hover = true;
  });
}

const cache = new WeakRef(loadHugeData());
const reg = new FinalizationRegistry((key: string) => {
  console.log('GC 释放了', key);
});
reg.register(loadHugeData(), 'big-data');

setTimeout(() => {
  const data = cache.deref();
  if (data) console.log('still alive');
  else console.log('已经被回收，重新加载');
}, 60_000);
```

### 延伸
- WeakRef / FinalizationRegistry 行为依赖 GC 时机，跨引擎 / 跨设备表现不一致，业务侧不要依赖具体时序
- React Compiler 的依赖追踪在内部也用 WeakMap 关联组件实例和缓存

## bind-call-apply
title: bind / call / apply 的区别与手写实现
difficulty: 进阶
tags: [this, 函数]

### 题目
说说 bind / call / apply 的区别，并手写一个 myBind。

### 答案要点
- `call(thisArg, ...args)`：立即调用，参数依次传
- `apply(thisArg, [args])`：立即调用，参数为数组
- `bind(thisArg, ...args)`：返回新函数，可继续传参（柯里化）
- bind 后再被 new 调用时，绑定的 this 失效（new 的优先级更高）
- 三者都不会修改原函数

### 代码示例
```js
Function.prototype.myBind = function (ctx, ...preset) {
  if (typeof this !== 'function') throw new TypeError('not callable');
  const fn = this;
  function bound(...args) {
    if (this instanceof bound) {
      return fn.apply(this, [...preset, ...args]);
    }
    return fn.apply(ctx, [...preset, ...args]);
  }
  bound.prototype = Object.create(fn.prototype);
  return bound;
};

function greet(greeting, name) {
  return `${greeting}, ${name}, I am ${this.role}`;
}
const hi = greet.myBind({ role: 'dev' }, 'Hi');
console.log(hi('Alice'));
```

### 延伸
- 箭头函数没有自己的 this，bind/call/apply 对它无效
- bind 链式调用只第一次绑定生效

## new-operator
title: new 操作符做了哪些事，怎么手写
difficulty: 进阶
tags: [对象, 函数]

### 题目
`new Foo(args)` 内部的执行步骤是什么？请用 myNew 实现。

### 答案要点
1. 创建一个空对象 obj
2. 将 obj 的 `[[Prototype]]` 指向 `Foo.prototype`
3. 以 obj 为 this 执行 Foo
4. 如果构造函数返回的是对象则返回该对象，否则返回 obj
- class 内部基本等价于 new；箭头函数不能 new

### 代码示例
```js
function myNew(Ctor, ...args) {
  if (typeof Ctor !== 'function') throw new TypeError('not constructor');
  const obj = Object.create(Ctor.prototype);
  const ret = Ctor.apply(obj, args);
  return (ret && typeof ret === 'object') || typeof ret === 'function' ? ret : obj;
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  toString() {
    return `(${this.x}, ${this.y})`;
  }
}
const p = myNew(Point, 1, 2);
console.log(p.toString(), p instanceof Point);
```

### 延伸
- 显式返回原始值（如 `return 1`）会被忽略
- 箭头函数被 new 时抛 TypeError
- ES6 Reflect.construct 是底层 API，可用于继承场景

## promise-all-allsettled-race-any
title: Promise.all / allSettled / race / any 的差异和典型用法
difficulty: 进阶
tags: [异步, Promise]

### 题目
四个静态方法分别什么时候 resolve / reject？日常怎么选？

### 答案要点
- `Promise.all(iter)`：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）
- `Promise.allSettled(iter)`：等所有都结束，永不 reject，返回 `{status, value/reason}[]`（批量上报）
- `Promise.race(iter)`：最先 settle 的决定结果（超时控制）
- `Promise.any(iter)`：任一 fulfilled 立即返回，全部 rejected 抛 AggregateError（多源容灾）

### 代码示例
```js
function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function fetchAllUsers(ids) {
  const results = await Promise.allSettled(ids.map((id) => fetch('/u/' + id)));
  return results.map((r, i) => ({
    id: ids[i],
    ok: r.status === 'fulfilled',
    data: r.status === 'fulfilled' ? r.value : r.reason,
  }));
}

async function fastestCDN(urls) {
  return Promise.any(urls.map((u) => fetch(u)));
}
```

### 延伸
- 在 Node 18+/现代浏览器中 4 个方法都已稳定支持
- 处理「成功一个就够」用 any；处理「等所有完成才汇总」用 allSettled
- 注意 `Promise.all` 的 fail-fast：如果有一个 reject，其他请求其实仍会继续跑（无法 abort）。需要 AbortController 配合
