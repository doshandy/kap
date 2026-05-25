---
id: 01-javascript
title: JavaScript 核心
order: 1
icon: 🟨
description: 原型、闭包、事件循环、Promise、模块化、内存与性能等核心机制。
---

## prototype-chain

title: 原型链是什么？查找规则和终点
followups: [prototype-chain-followup-1, prototype-chain-followup-2, prototype-chain-followup-3]
difficulty: 基础
tags: [原型, 继承]

### 一句话

讲「原型链是什么？查找规则和终点」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请描述 JavaScript 的原型链查找规则、终止条件，以及它与「类继承」的本质区别。

### 答案要点

- 每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找
- 函数有 prototype 属性，new 出来的实例 [[Prototype]] 指向该 prototype
- 链的终点是 Object.prototype，再上一层为 null，查找失败返回 undefined
- ES6 class 是原型继承的语法糖：方法定义在 Class.prototype 上，静态方法在构造函数上

#### 工程化补充

- 场景前提：回答 原型链是什么？查找规则和终点 时先锁定 原型 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 原型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 原型 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} 叫`;
};

class Dog extends Animal {
  constructor(name) {
    super(name);
  }
  speak() {
    return `${super.speak()}：汪`;
  }
}

const d = new Dog('阿黄');
Object.getPrototypeOf(d) === Dog.prototype; // true
Object.getPrototypeOf(Dog.prototype) === Animal.prototype; // true
Object.getPrototypeOf(Animal.prototype) === Object.prototype; // true
Object.getPrototypeOf(Object.prototype) === null; // true
```

### 常见误区

- 把 `__proto__`、`prototype`、`[[Prototype]]` 三个混着用：
  - `__proto__` 是非标准遗留属性，用 `Object.getPrototypeOf` / `Object.setPrototypeOf`
  - `prototype` 只在**函数**上有，是 `new` 时给实例用的
  - `[[Prototype]]` 是规范里的内部槽
- 以为 `instanceof` 检查「是不是这个类」，其实它检查的是「原型链上是否出现过该构造函数的 prototype」
- 用 `obj.hasOwnProperty(k)` 不安全：如果 obj 自己就有一个叫 `hasOwnProperty` 的属性会被覆盖。改用 `Object.hasOwn(obj, k)`

### 追问

- 为什么 `Object.create(null)` 创建的对象更适合做「纯字典」？
- 修改原型链（`Object.setPrototypeOf`）为什么是性能反模式？
- ES6 `class` 和原型继承能 100% 等价吗？类字段、私有字段（`#x`）有什么不同？

### 延伸

- `Object.create(null)` 可创建无原型的纯字典对象，适合存储不受保留字干扰的键
- `__proto__` 已废弃，使用 `Object.getPrototypeOf` / `Object.setPrototypeOf`
- `hasOwnProperty` 安全写法：`Object.hasOwn(obj, key)`（ES2022）

## this-binding

title: this 指向的七种场景
followups: [this-binding-followup-1, this-binding-followup-2, this-binding-followup-3]
difficulty: 基础
tags: [this, 函数]

### 一句话

讲「this 指向的七种场景」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

列举 this 绑定的全部规则，并说明优先级。箭头函数为何"没有 this"？

### 答案要点

- 默认绑定：直接调用函数，非严格 globalThis，严格 undefined
- 隐式绑定：obj.fn()，this 指向 obj
- 显式绑定：call/apply/bind，this 指向第一个参数
- new 绑定：new Fn()，this 指向新创建的对象

#### 工程化补充

- 场景前提：回答 this 指向的七种场景 时先锁定 this 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 this 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 this 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```js
const obj = {
  x: 1,
  get() {
    return this.x;
  },
};
const f = obj.get;
obj.get(); // 1（隐式）
f(); // undefined（默认 + 严格）
f.call(obj); // 1（显式）
new obj.get(); // {}（new 绑定，忽略隐式）

const arrow = () => this;
arrow.call({ a: 1 }); // 仍是外层 this，不会被改变
```

### 常见误区

- 箭头函数里写 `this.xxx` 期望它是某个对象——它永远是定义时外层的 this，不会被 `.call/.apply/.bind` 改变
- `setTimeout(obj.fn, 0)` 里 `this` 不再是 obj（隐式绑定丢失）
- React class 组件方法没绑定就传 `onClick={this.handle}`，`this` 是 undefined（要么用箭头函数声明，要么 bind）
- DOM 事件 handler 用箭头函数，里面 `this` 不是 currentTarget

### 追问

- new 调用一个箭头函数会怎样？为什么
- bind 之后还能再 bind 吗？再调用 call 呢？
- 严格模式下默认绑定的 this 是什么？为什么这么设计

### 延伸

- 类字段（class fields）写成箭头函数 `onClick = () => {}` 是常见的 React 绑定写法，但每个实例都新建一份函数
- Vue 3 `<script setup>` 中无 `this`，组合式 API 取消了 this 心智负担

## closure

title: 闭包的定义、用途与陷阱
followups: [closure-followup-1, closure-followup-2]
difficulty: 基础
tags: [闭包, 作用域]

### 一句话

讲「闭包的定义、用途与陷阱」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

什么是闭包？典型用途和常见的内存陷阱有哪些？

### 答案要点

- 闭包 = 函数 + 它定义时的词法环境
- 用途：数据私有、模块模式、柯里化、防抖节流、React Hooks 闭包陷阱、for-let 循环捕获
- 长生命周期对象引用闭包内大对象 → 无法回收
- DOM 节点 + 闭包的循环引用（旧 IE 严重，现代 V8 已改善但仍有泄漏风险）

#### 工程化补充

- 场景前提：回答 闭包的定义、用途与陷阱 时先锁定 闭包 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 闭包 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 闭包 的可复现用例、线上监控指标和回退演练记录。

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
c.inc();
c.inc();
c.get(); // 2，n 始终被两个闭包共享
```

### 常见误区

- 经典坑：`for (var i = 0; i < 5; i++) setTimeout(() => console.log(i))` 全部输出 5——闭包共享同一个 `i`；改成 `let` 即可
- 闭包里持有大对象但没释放：典型内存泄漏来源
- 闭包并不一定意味着「有性能开销」——V8 优化得很好，不要因为怕闭包而瞎写

### 追问

- IIFE（立即执行函数）和闭包的关系
- 模块模式（私有变量）现在还需要靠闭包吗？ESM 是否替代了它

### 延伸

- React `useEffect` 中读到旧的 state，本质是闭包捕获了渲染时的 state 快照，需用 ref 或函数式更新
- Vue 3 `setup` 中所有变量天然都是闭包，配合 `ref/reactive` 实现响应式

## event-loop

title: 浏览器事件循环：宏任务、微任务、RAF、IDLE
followups: [event-loop-followup-1, event-loop-followup-2, event-loop-followup-3]
links: [async-await, 05-browser/event-loop-worker, 09-node/node-event-loop]
difficulty: 进阶
tags: [事件循环, 异步]

### 一句话

这题的高分关键是把 事件循环 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

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

- 可以把浏览器主线程理解为反复执行：取一个 task（宏任务）→ 清空 microtask → 浏览器在合适时机执行渲染相关工作（其中可包含 requestAnimationFrame 回调）→ 进入下一轮
- 微任务源：Promise.then、queueMicrotask、MutationObserver
- 宏任务源：setTimeout、setInterval、I/O、UI 事件、postMessage
- requestAnimationFrame 回调在浏览器下一次重绘前执行，它不是 Promise microtask，也不等同于普通 task

#### 工程化补充

- 场景前提：讨论 浏览器事件循环：宏任务、微任务、RAF、IDLE 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

### 代码示例

```js
// 微任务能阻塞渲染（错误用法）
function block() {
  Promise.resolve().then(block);
}
// 这会让浏览器一直忙于清空微任务，直到栈溢出
```

### 常见误区

- 把「宏任务/微任务」和「同步/异步」混为一谈：同步代码走完才会执行任何任务
- 以为 `setTimeout(fn, 0)` 是「立即执行」——它至少要等一轮 tick + 浏览器节流
- Promise then 是微任务，会在当前宏任务结束前清空整个微任务队列；如果你在 then 里又 schedule 微任务可能「饿死」渲染
- requestAnimationFrame 不是微任务也不是宏任务，是渲染前的特殊队列

### 追问

- Node 的事件循环和浏览器有什么差异？setImmediate vs setTimeout
- `queueMicrotask`、`Promise.resolve().then` 哪个先执行
- async/await 在 Event Loop 中的实际表现（每个 await 等价于一次微任务调度）

### 延伸

- Node.js 事件循环阶段更复杂：timers / pending / poll / check / close，`setImmediate` vs `setTimeout(0)` 在 I/O 回调中顺序更容易观察到差异
- 在 Node.js CommonJS 场景里，`process.nextTick()` 队列通常先于 Promise microtask 队列；但在 ESM 场景下顺序可能不同，且 Node 官方已更推荐 `queueMicrotask()`

## promise-aplus

title: 手写一个符合 Promise/A+ 规范的 Promise
followups: [promise-aplus-followup-1, promise-aplus-followup-2, promise-aplus-followup-3]
links: [promise-all-allsettled-race-any]
difficulty: 进阶
tags: [Promise, 异步, 手写]

### 一句话

回答「手写一个符合 Promise/A+ 规范的 Promise」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请实现 `MyPromise`，覆盖 then 链式调用、值穿透、异步解决、错误冒泡。

### 答案要点

- 三态：pending / fulfilled / rejected，状态不可逆
- then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）
- then 的 onFulfilled/onRejected 必须异步调用
- 解析过程要处理 thenable 兼容（resolvePromise(promise2, x, resolve, reject)）

#### 工程化补充

- 场景前提：先定义 手写一个符合 Promise/A+ 规范的 Promise 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 Promise 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Promise 的可复现用例、线上监控指标和回退演练记录。

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
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  private transition(state: 'fulfilled' | 'rejected', value: any) {
    if (this.state !== 'pending') return;
    this.state = state;
    this.value = value;
    const cbs = state === 'fulfilled' ? this.onFulfilled : this.onRejected;
    cbs.forEach((cb) => queueMicrotask(() => cb(value)));
  }

  then<U>(onF?: (v: T) => U, onR?: (e: any) => U): MyPromise<U> {
    return new MyPromise<U>((resolve, reject) => {
      const handle = (state: 'fulfilled' | 'rejected') => {
        const cb = state === 'fulfilled' ? onF : onR;
        if (typeof cb !== 'function') {
          state === 'fulfilled' ? resolve(this.value) : reject(this.value);
          return;
        }
        try {
          resolve(cb(this.value));
        } catch (e) {
          reject(e);
        }
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

### 常见误区

- `Promise.all` 一个失败全失败：要全部完成结果改用 `Promise.allSettled`
- then 里返回一个 thenable 不会立即转成 Promise，要走「unwrap」流程
- 没 catch 的 Promise 会触发 `unhandledrejection`，浏览器和 Node 表现不同
- new Promise 的 executor 是同步执行的，不要在里面写「等等再 resolve」逻辑

### 追问

- 实现一个简易 Promise.all（已在算法专题里）
- Promise 链中抛错会在哪一环被捕获
- 为什么说 async/await 是 Promise 的语法糖？有什么差异（堆栈、异常）

### 延伸

- `Promise.all` 短路失败，`Promise.allSettled` 永不失败，`Promise.any` 短路成功，`Promise.race` 第一个 settle 即返回
- async/await 是 Promise 的语法糖，await 等价于 `.then` + 包装

## async-await

title: async/await 在事件循环里的真实执行顺序
followups: [async-await-followup-1, async-await-followup-2, async-await-followup-3]
links: [event-loop, 05-browser/event-loop-worker, 09-node/node-event-loop]
difficulty: 进阶
tags: [async, 事件循环]

### 一句话

这题的高分关键是把 async 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

解释下面代码的输出顺序：

```js
async function a() {
  console.log('a1');
  await b();
  console.log('a2');
}
async function b() {
  console.log('b1');
}
a();
console.log('main');
```

### 答案要点

- async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise
- await 后面表达式立即求值（同步部分），然后将"恢复执行"作为微任务排入队列
- 因此：a1 → b1 → main → a2

#### 工程化补充

- 场景前提：回答 async/await 在事件循环里的真实执行顺序 时先锁定 async 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 async 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 async 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```js
// 等价改写
function a() {
  console.log('a1');
  return Promise.resolve(b()).then(() => {
    console.log('a2');
  });
}
```

### 追问

- 「async/await 在事件循环里的真实执行顺序」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「async/await 在事件循环里的真实执行顺序」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 async、事件循环，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 多个 await 串行：用 `Promise.all` 改成并发
- async 函数内 throw 等价于 reject，可被 `try/catch` 或 `.catch` 捕获
- `for await...of` 处理异步迭代器，需配合 `Symbol.asyncIterator`

## debounce-throttle

title: 手写防抖与节流
followups: [debounce-throttle-followup-1, debounce-throttle-followup-2, debounce-throttle-followup-3]
links: [20-algorithm/debounce-throttle-handwritten, debounce-immediate]
difficulty: 基础
tags: [手写, 性能]

### 一句话

讲「手写防抖与节流」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

实现 `debounce(fn, wait, immediate)` 与 `throttle(fn, wait, { leading, trailing })`，并说明使用场景。

### 答案要点

- 防抖：N 毫秒内重复触发 → 重新计时，最后一次后才执行。场景：搜索输入、resize 后计算
- 节流：N 毫秒内最多执行一次。场景：scroll、mousemove、按钮防连点
- 注意 this/参数透传，cancel 方法

#### 工程化补充

- 场景前提：手写防抖与节流 只有在瓶颈被数据证实时才值得推进；先确认 手写 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 手写防抖与节流 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
  debounced.cancel = () => {
    clearTimeout(t);
    t = null;
  };
  return debounced;
}

function throttle<T extends (...a: any[]) => any>(fn: T, wait = 200) {
  let last = 0;
  let t: any;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remain = wait - (now - last);
    if (remain <= 0) {
      clearTimeout(t);
      t = null;
      last = now;
      fn.apply(this, args);
    } else if (!t) {
      t = setTimeout(() => {
        last = Date.now();
        t = null;
        fn.apply(this, args);
      }, remain);
    }
  };
}
```

### 常见误区

- 实现里漏了 `this` 透传：`fn.apply(this, args)` 不能写成 `fn(...args)`
- debounce 的「立即执行」语义没想清——是首次立即还是末尾再执行
- 卸载组件时没 cancel：定时器仍然会触发，造成 setState 报警告 / 内存泄漏
- 非常高频场景（mousemove）用 debounce 容易感觉「卡了」，应该用 throttle

### 追问

- 如何实现「前沿+后沿」都触发的 throttle
- requestAnimationFrame 实现的 throttle 和 setTimeout 实现有何差异
- React 里如何用 useRef 实现稳定的 debounce 函数（避免每次 render 重新创建）

### 延伸

- VueUse 的 `useDebounceFn` / `useThrottleFn` 已有完善实现
- React 中用 `useRef` 持有定时器避免重新创建

## deep-clone

title: 深拷贝完整实现：循环引用、Symbol、特殊对象
followups: [deep-clone-followup-1, deep-clone-followup-2, deep-clone-followup-3]
links: [21-interview-special/handwrite-deep-clone-circular, structured-clone]
difficulty: 进阶
tags: [手写, 对象]

### 一句话

这题回答要覆盖 手写 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

实现一个工业级深拷贝，处理循环引用、Symbol 键、Date/RegExp/Map/Set/函数。

### 答案要点

- 用 WeakMap 记录已克隆对象避免循环引用
- 区分类型：基本类型直接返回；Date/RegExp 调用构造器；Map/Set 递归；函数直接返回（业务上一般不克隆）
- 包含 Symbol 键：Reflect.ownKeys 同时拿到 string + symbol
- 现代浏览器 structuredClone 已可处理大部分情况（含循环引用），但不支持函数

#### 工程化补充

- 场景前提：先定义 深拷贝完整实现：循环引用、Symbol、特殊对象 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 手写 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 手写 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```ts
function deepClone<T>(value: T, seen = new WeakMap()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as any)) return seen.get(value as any);
  if (value instanceof Date) return new Date(value) as any;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as any;
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

- `JSON.parse(JSON.stringify(x))` 会丢失：函数、Symbol、undefined、循环引用、Date 变字符串、Map/Set 变空对象
- 自己写递归：忘记处理循环引用 → 栈溢出；忘记处理 Map/Set/Date/RegExp → 类型丢失
- structuredClone 现代浏览器内置，几乎是首选；但跑 web worker postMessage 也走它的算法

### 追问

- structuredClone 和 lodash cloneDeep 哪个全？哪个快
- 拷贝一个含 DOM 节点的对象会怎样
- 写一个支持循环引用的简易深拷贝（用 WeakMap 备忘）

### 延伸

- 性能更好的方案：`structuredClone(obj)`（HTML 标准 API）
- 序列化派 `JSON.parse(JSON.stringify(x))` 丢失 undefined/Symbol/循环引用/Date 转字符串

## esm-vs-cjs

title: ESM 与 CommonJS 的差异、互操作与陷阱
followups: [esm-vs-cjs-followup-1, esm-vs-cjs-followup-2, esm-vs-cjs-followup-3]
difficulty: 进阶
tags: [模块化, Node]

### 一句话

这题的高分关键是把 模块化 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

ESM 与 CommonJS 在加载时机、绑定语义、循环依赖处理上的差异？为什么 Node 中两者互导会踩坑？

### 答案要点

- ESM：静态分析、异步加载、export 是实时绑定（live binding），可被 tree-shaking
- CommonJS：同步加载，围绕 module.exports 对象工作，天然不具备 ESM 那样的静态结构信息
- 互操作：在 Node 中，ESM import CommonJS 时会拿到一个以 module.exports 为核心的命名空间包装，通常可通过 default 访问；CommonJS 侧加载 ESM 时更通用的方式仍是 import()
- 循环依赖：ESM 先建立绑定再执行模块；CommonJS 则可能暴露“执行到一半的 exports 对象”

#### 工程化补充

- 场景前提：回答 ESM 与 CommonJS 的差异、互操作与陷阱 时要明确 模块化 在高并发和错误恢复下的表现。
- 失败风险：常见风险是事件循环阻塞与资源未释放，导致吞吐退化。
- 验收信号：验收至少看事件循环延迟、吞吐和资源占用趋势。

### 代码示例

```js
// ESM live binding
// a.mjs
export let count = 0;
export function inc() {
  count++;
}
// b.mjs
import { count, inc } from './a.mjs';
console.log(count); // 0
inc();
console.log(count); // 1（live binding）
```

### 常见误区

- CJS 的 `module.exports = x` 和 `exports.x = ...` 差别：前者整体替换，后者添加属性
- ESM 是静态的，不能用变量做 `import`；CJS 的 `require` 是运行时
- ESM 默认走 strict mode，`this` 顶层是 undefined
- 同一个包既给 CJS 又给 ESM 用要小心 dual package hazard（各 require 一份单例就有两份）

### 追问

- 为什么 ESM 能 tree-shake，CJS 通常不能
- import 一个 CJS 模块时 default 怎么映射
- Node 怎么决定 `.js` 是 ESM 还是 CJS（package.json 的 type 字段、`.mjs`）

### 延伸

- Vite 利用 ESM 实现按需加载和 HMR
- `package.json` 中 `"type": "module"`、`exports` 字段，以及 Node/构建工具对 CJS / ESM 互操作的处理，是现代模块化踩坑高发区

## memory-leak

title: 前端常见内存泄漏与排查
followups: [memory-leak-followup-1, memory-leak-followup-2, memory-leak-followup-3]
difficulty: 进阶
tags: [内存, 性能]

### 一句话

这题回答要覆盖 内存 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

列举前端常见内存泄漏类型与对应排查方式。

### 答案要点

- 未解绑的事件监听器（特别是 window/document）→ 组件销毁时 removeEventListener
- 未清理的定时器（setInterval、setTimeout 自循环）→ clearInterval
- 闭包持有大对象 → 显式置 null
- DOM 引用未释放（detached DOM）→ Vue keep-alive、组件卸载后 ref 置空

#### 工程化补充

- 场景前提：回答 前端常见内存泄漏与排查 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 前端常见内存泄漏与排查 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

### 常见误区

- 把 DOM 引用放到全局 / 模块顶层变量里，组件卸载后还活着
- 定时器 / 监听器忘记清——SPA 切路由后旧组件死循环跑
- 闭包里持有大对象但其实不用
- WeakMap 用错：把 string 当 key（WeakMap 只能 object key）

### 追问

- 排查内存泄漏的标准流程（三次 Heap snapshot 对比）
- WeakRef 的真实使用场景
- React 里 useEffect 没 return cleanup 会怎样

### 延伸

- WeakMap/WeakSet/WeakRef 不阻止 GC，适合做缓存或 DOM 关联数据
- `FinalizationRegistry` 监听 GC（不保证立即触发，仅用于资源回收提示）

## proxy-reflect

title: Proxy 与 Reflect：13 种 trap 与 receiver 正确性
followups: [proxy-reflect-followup-1, proxy-reflect-followup-2, proxy-reflect-followup-3]
links: [03-vue/effect-track-trigger]
difficulty: 进阶
tags: [Proxy, 元编程]

### 一句话

回答「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么 Proxy 的 handler 内部要用 `Reflect.get/set` 而不是直接 `target[key] = value`？

### 答案要点

- Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...
- 直接 target[key] 会丢失 receiver 信息，导致 getter 中的 this 错位（特别是继承链上）
- Reflect.get(target, key, receiver) 显式传 receiver，保证 getter/setter 中 this 正确

#### 工程化补充

- 场景前提：先定义 Proxy 与 Reflect：13 种 trap 与 receiver 正确性 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 Proxy 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Proxy 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```js
const parent = {
  _x: 1,
  get x() {
    return this._x;
  },
};
const child = new Proxy(Object.create(parent), {
  get(t, k, r) {
    return Reflect.get(t, k, r);
  },
});
child._x = 2;
console.log(child.x); // 2，receiver 正确指向 child
```

### 追问

- 「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Proxy、元编程，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vue3 `reactive` 基于 Proxy 实现，对每个 trap 做依赖追踪
- 透明拦截不到的：基础数据类型不能 Proxy，私有属性 `#x` 不可代理（会抛 TypeError）

## iterator-generator

title: 迭代器、生成器与异步迭代
followups: [iterator-generator-followup-1, iterator-generator-followup-2, iterator-generator-followup-3]
difficulty: 进阶
tags: [迭代器, 生成器]

### 一句话

回答「迭代器、生成器与异步迭代」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

`Symbol.iterator`、`Symbol.asyncIterator`、`function*` 是怎么协作的？什么时候该手写迭代器？

### 答案要点

- 可迭代协议：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展
- 生成器：function\* 自动实现迭代器协议，yield 暂停让出，return 标记 done
- 异步迭代：Symbol.asyncIterator + for await...of，每个 next() 返回 Promise
- 真实场景：流式数据（fetch ReadableStream）、分页拉取、惰性大集合、状态机

#### 工程化补充

- 场景前提：迭代器、生成器与异步迭代 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

async function* paginate<T>(
  fetchPage: (cursor?: string) => Promise<{ items: T[]; next?: string }>,
) {
  let cursor: string | undefined;
  do {
    const { items, next } = await fetchPage(cursor);
    yield* items;
    cursor = next;
  } while (cursor);
}
```

### 追问

- 「迭代器、生成器与异步迭代」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「迭代器、生成器与异步迭代」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 迭代器、生成器，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 生成器 + Promise 组合可以模拟 async/await（早期 co 库就是这么做的）
- 想做"可暂停的协作式调度"（如 React 调度器）也是基于生成器思想

## structured-clone

title: 结构化克隆 vs JSON 序列化
followups: [structured-clone-followup-1, structured-clone-followup-2, structured-clone-followup-3]
links: [deep-clone]
difficulty: 进阶
tags: [克隆, postMessage]

### 一句话

讲「结构化克隆 vs JSON 序列化」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

`structuredClone`、`JSON.parse(JSON.stringify(x))`、自实现深拷贝各自的能力边界？

### 答案要点

- JSON：丢失 undefined / function / Symbol / Date / RegExp / Map / Set / BigInt / 循环引用
- structuredClone：标准结构化克隆算法，支持 Date / RegExp / Map / Set / ArrayBuffer / TypedArray / Blob / 循环引用，无法克隆 function / DOM 节点 / Symbol
- 自实现：可定制（处理 class 实例、保留原型链、对外部资源做引用计数），但要小心循环引用
- postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制

#### 工程化补充

- 场景前提：回答 结构化克隆 vs JSON 序列化 时先锁定 克隆 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 克隆 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 克隆 的可复现用例、线上监控指标和回退演练记录。

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
    (out as Record<PropertyKey, unknown>)[k] = deepCloneClass(
      (x as Record<PropertyKey, unknown>)[k],
      seen,
    );
  }
  return out as T;
}
```

### 追问

- 「结构化克隆 vs JSON 序列化」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「结构化克隆 vs JSON 序列化」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 克隆、postMessage，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `structuredClone` 还能 transfer 大对象（不复制，权属转移）：`postMessage(buf, [buf])`
- 性能极致场景下可以用 `flatbuffers / msgpack` 自定义二进制协议绕过通用克隆

## tagged-template-literal

title: 模板字符串与标签模板的实战
followups: [tagged-template-literal-followup-1, tagged-template-literal-followup-2, tagged-template-literal-followup-3]
difficulty: 进阶
tags: [模板字符串, 标签模板]

### 一句话

这题回答要覆盖 模板字符串 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

标签模板（tagged template）有什么实际用途？除了 styled-components 还能怎么玩？

### 答案要点

- 语法：tag 函数收到 (strings: TemplateStringsArray, ...values: unknown[])
- 自动转义：把用户输入插值时强制走转义（防 XSS / SQL 注入）
- DSL 构造：写 GraphQL / SQL / CSS 时，能让编辑器有语法高亮（VS Code 插件按 tag 名识别）
- 国际化：i18n tag 可以根据 locale 重排参数顺序

#### 工程化补充

- 场景前提：先定义 模板字符串与标签模板的实战 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 模板字符串 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 模板字符串 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```ts
function html(strings: TemplateStringsArray, ...values: unknown[]) {
  const escape = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return strings.reduce(
    (out, cur, i) => out + cur + (i < values.length ? escape(values[i]) : ''),
    '',
  );
}

const userInput = '<img onerror=alert(1)>';
document.body.innerHTML = html` <div>${userInput}</div> `;

function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce(
    (out, cur, i) => out + cur + (i < values.length ? `$${i + 1}` : ''),
    '',
  );
  return { text, values };
}
const id = 42;
const q = sql`SELECT * FROM users WHERE id = ${id}`;
```

### 追问

- 「模板字符串与标签模板的实战」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「模板字符串与标签模板的实战」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 模板字符串、标签模板，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- TS 5.0 的 `Tagged Template` 类型可以静态推断变量类型，做编译期的 DSL 校验
- 标签模板嵌套时性能要注意，每次都会新建数组

## weak-collection

title: WeakMap / WeakSet / WeakRef 与垃圾回收
followups: [weak-collection-followup-1, weak-collection-followup-2, weak-collection-followup-3]
difficulty: 资深
tags: [WeakMap, GC]

### 一句话

这题的高分关键是把 WeakMap 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

什么时候必须用 `WeakMap`？`WeakRef` 和 `FinalizationRegistry` 又有什么用？

### 答案要点

- 普通 Map 强引用 key，被 Map 持有的 key 不会因为外部引用消失就自动释放，容易内存泄漏
- WeakMap：key 必须是可弱引用值（对象，现代规范也允许非注册 Symbol），弱引用条目不会阻止 key 被 GC，适合"给对象挂私有数据"
- WeakSet：同理，做"对象集合的存在性检查"，不阻止回收；不要放字符串、数字等原始值
- WeakRef：手动持有弱引用，常用于缓存大对象，避免引用导致无法回收

#### 工程化补充

- 场景前提：回答 WeakMap / WeakSet / WeakRef 与垃圾回收 时先锁定 WeakMap 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 WeakMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 WeakMap 的可复现用例、线上监控指标和回退演练记录。

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

### 追问

- 「WeakMap / WeakSet / WeakRef 与垃圾回收」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「WeakMap / WeakSet / WeakRef 与垃圾回收」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 WeakMap、GC，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- WeakRef / FinalizationRegistry 行为依赖 GC 时机，跨引擎 / 跨设备表现不一致，业务侧不要依赖具体时序
- React Compiler 的依赖追踪在内部也用 WeakMap 关联组件实例和缓存

## bind-call-apply

title: bind / call / apply 的区别与手写实现
followups: [bind-call-apply-followup-1, bind-call-apply-followup-2, bind-call-apply-followup-3]
difficulty: 进阶
tags: [this, 函数]

### 一句话

讲「bind / call / apply 的区别与手写实现」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

说说 bind / call / apply 的区别，并手写一个 myBind。

### 答案要点

- call(thisArg, ...args)：立即调用，参数依次传
- apply(thisArg, [args])：立即调用，参数为数组
- bind(thisArg, ...args)：返回新函数，可继续传参（柯里化）
- bind 后再被 new 调用时，绑定的 this 失效（new 的优先级更高）

#### 工程化补充

- 场景前提：回答 bind / call / apply 的区别与手写实现 时先锁定 this 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 this 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 this 的可复现用例、线上监控指标和回退演练记录。

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

### 追问

- 「bind / call / apply 的区别与手写实现」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「bind / call / apply 的区别与手写实现」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 this、函数，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 箭头函数没有自己的 this，bind/call/apply 对它无效
- bind 链式调用只第一次绑定生效

## new-operator

title: new 操作符做了哪些事，怎么手写
followups: [new-operator-followup-1, new-operator-followup-2, new-operator-followup-3]
difficulty: 进阶
tags: [对象, 函数]

### 一句话

回答「new 操作符做了哪些事，怎么手写」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

`new Foo(args)` 内部的执行步骤是什么？请用 myNew 实现。

### 答案要点

- 创建一个空对象 obj
- 将 obj 的 [[Prototype]] 指向 Foo.prototype
- 以 obj 为 this 执行 Foo
- 如果构造函数返回的是对象则返回该对象，否则返回 obj

#### 工程化补充

- 场景前提：先定义 new 操作符做了哪些事，怎么手写 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 对象 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 对象 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```js
function myNew(Ctor, ...args) {
  if (typeof Ctor !== 'function') throw new TypeError('not constructor');
  const obj = Object.create(Ctor.prototype);
  const ret = Ctor.apply(obj, args);
  return (ret && typeof ret === 'object') || typeof ret === 'function' ? ret : obj;
}

function Point(x, y) {
  this.x = x;
  this.y = y;
}
Point.prototype.toString = function () {
  return `(${this.x}, ${this.y})`;
};
const p = myNew(Point, 1, 2);
console.log(p.toString(), p instanceof Point);
```

### 追问

- 「new 操作符做了哪些事，怎么手写」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「new 操作符做了哪些事，怎么手写」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 对象、函数，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 显式返回原始值（如 `return 1`）会被忽略
- 箭头函数被 new 时抛 TypeError
- `class` 构造器不能被 `Ctor.apply(obj, args)` 直接调用；如果要支持 class，需要用 `Reflect.construct`
- ES6 `Reflect.construct` 是底层 API，可用于继承场景

## promise-all-allsettled-race-any

title: Promise.all / allSettled / race / any 的差异和典型用法
followups: [promise-all-allsettled-race-any-followup-1, promise-all-allsettled-race-any-followup-2, promise-all-allsettled-race-any-followup-3]
links: [20-algorithm/promise-all-impl, promise-aplus]
difficulty: 进阶
tags: [异步, Promise]

### 一句话

这题回答要覆盖 异步 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

四个静态方法分别什么时候 resolve / reject？日常怎么选？

### 答案要点

- Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）
- Promise.allSettled(iter)：等所有都结束，永不 reject，返回 {status, value/reason}[]（批量上报）
- Promise.race(iter)：最先 settle 的决定结果（超时控制）
- Promise.any(iter)：任一 fulfilled 立即返回，全部 rejected 抛 AggregateError（多源容灾）

#### 工程化补充

- 场景前提：先定义 Promise.all / allSettled / race / any 的差异和典型用法 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 异步 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 异步 的可复现用例、线上监控指标和回退演练记录。

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

### 追问

- 「Promise.all / allSettled / race / any 的差异和典型用法」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Promise.all / allSettled / race / any 的差异和典型用法」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 异步、Promise，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 在 Node 18+/现代浏览器中 4 个方法都已稳定支持
- 处理「成功一个就够」用 any；处理「等所有完成才汇总」用 allSettled
- 注意 `Promise.all` 的 fail-fast：如果有一个 reject，其他请求其实仍会继续跑（无法 abort）。需要 AbortController 配合

## flatten-array

title: 数组扁平化的多种实现
followups: [flatten-array-followup-1, flatten-array-followup-2, flatten-array-followup-3]
difficulty: 基础
tags: [数组, 手写]

### 一句话

这题回答要覆盖 数组 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请用至少 3 种方式实现数组扁平化（任意深度），并给出复杂度对比。

### 答案要点

- ES2019 内置 arr.flat(Infinity)：最简洁，可指定深度
- 递归 reduce：(arr) => arr.reduce((a, b) => a.concat(Array.isArray(b) ? f(b) : b), [])
- 迭代 + 栈：手动 push/pop 避免递归深度限制（大数据量更安全）
- JSON.stringify(arr).replace(/\[|\]/g, '') 是面试黑魔法但会丢类型，仅适合数字/字符串

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 数组扁平化的多种实现；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

### 代码示例

```js
function flat1(arr) {
  return arr.flat(Infinity);
}

function flat2(arr) {
  return arr.reduce((acc, v) => acc.concat(Array.isArray(v) ? flat2(v) : v), []);
}

function flat3(arr) {
  const stack = [...arr];
  const out = [];
  while (stack.length) {
    const v = stack.pop();
    if (Array.isArray(v)) stack.push(...v);
    else out.unshift(v);
  }
  return out;
}

console.log(flat1([1, [2, [3, [4]]]]));
console.log(flat2([1, [2, [3, [4]]]]));
console.log(flat3([1, [2, [3, [4]]]]));
```

### 追问

- 「数组扁平化的多种实现」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「数组扁平化的多种实现」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 数组、手写，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大数据量时优先选迭代版本，避免栈溢出
- TypeScript 中 `flat` 的返回类型 `FlatArray<T, D>` 很有意思，可以参考类型体操

## event-emitter

title: 手写一个 EventEmitter（订阅发布）
followups: [event-emitter-followup-1, event-emitter-followup-2, event-emitter-followup-3]
difficulty: 基础
tags: [设计模式, 手写]

### 一句话

这题的高分关键是把 设计模式 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

请实现一个支持 on / off / once / emit 的事件总线。

### 答案要点

- on(event, fn) 把 fn 放进对应事件的数组里
- off(event, fn) 不传 fn 清空整组，传 fn 则移除一个
- once(event, fn) 用一个包装函数：调用时执行后立刻 off
- emit(event, ...args) 取出回调列表依次调用，建议拷贝一份再遍历，避免遍历过程中 off 影响

#### 工程化补充

- 场景前提：落地 手写一个 EventEmitter（订阅发布） 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```js
class EventEmitter {
  constructor() {
    this.map = new Map();
  }
  on(event, fn) {
    if (!this.map.has(event)) this.map.set(event, []);
    this.map.get(event).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const list = this.map.get(event);
    if (!list) return;
    if (!fn) this.map.delete(event);
    else
      this.map.set(
        event,
        list.filter((f) => f !== fn),
      );
  }
  once(event, fn) {
    const wrap = (...args) => {
      this.off(event, wrap);
      fn(...args);
    };
    this.on(event, wrap);
  }
  emit(event, ...args) {
    const list = this.map.get(event)?.slice() || [];
    for (const fn of list) {
      try {
        fn(...args);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

const bus = new EventEmitter();
const off = bus.on('msg', (x) => console.log('A', x));
bus.once('msg', (x) => console.log('B once', x));
bus.emit('msg', 1);
bus.emit('msg', 2);
off();
bus.emit('msg', 3);
```

### 追问

- 推动「手写一个 EventEmitter（订阅发布）」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「手写一个 EventEmitter（订阅发布）」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 设计模式、手写，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Node.js 内置 EventEmitter 还支持 `setMaxListeners`、错误事件、Async 迭代
- 浏览器原生 `EventTarget` 也可以用，性能更好

## debounce-immediate

title: 防抖（debounce）的 immediate 模式怎么实现
followups: [debounce-immediate-followup-1, debounce-immediate-followup-2, debounce-immediate-followup-3]
links: [debounce-throttle, 20-algorithm/debounce-throttle-handwritten]
difficulty: 进阶
tags: [手写, 性能]

### 一句话

这题回答要覆盖 手写 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请实现支持 `immediate` 选项的防抖函数；并支持取消 `cancel` 与立即触发 `flush`。

### 答案要点

- 内部维护一个定时器 id 和最后一次调用的参数
- immediate=true 时，第一次调用立刻执行，后续在 wait 内被忽略；wait 过了之后下次调用又算"第一次"
- cancel：clearTimeout 并把 id 置 null
- flush：清掉定时器并立即执行最后一次缓存的参数（实现起来需要在 trailing 模式下保存 args）

#### 工程化补充

- 场景前提：回答 防抖（debounce）的 immediate 模式怎么实现 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 防抖（debounce）的 immediate 模式怎么实现 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```js
function debounce(fn, wait, immediate = false) {
  let t = null;
  let lastArgs = null;
  let lastThis = null;

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    const callNow = immediate && t == null;
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      if (!immediate && lastArgs) {
        fn.apply(lastThis, lastArgs);
        lastArgs = null;
      }
    }, wait);
    if (callNow) fn.apply(lastThis, lastArgs);
  }
  debounced.cancel = () => {
    if (t) clearTimeout(t);
    t = null;
    lastArgs = null;
  };
  debounced.flush = () => {
    if (t && lastArgs) {
      clearTimeout(t);
      fn.apply(lastThis, lastArgs);
      t = null;
      lastArgs = null;
    }
  };
  return debounced;
}

const log = debounce((x) => console.log('run', x), 500, true);
log(1);
log(2);
log(3);
```

### 追问

- 你会先看哪些指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「防抖（debounce）的 immediate 模式怎么实现」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 手写、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- lodash 的 `debounce` 还支持 `leading + trailing` 双触发与最大等待时间 `maxWait`
- 真实需求里大部分情况非 immediate 就够；immediate 用于按钮防连点

## prototype-chain-followup-1

title: 追问：如果要让「原型链是什么？查找规则和终点」稳定上线，你会优先补齐哪些与 原型 相关的检查项
difficulty: 基础
tags: [原型, 继承, 追问]
parent: prototype-chain

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「原型链是什么？查找规则和终点」稳定上线，你会优先补齐哪些与 原型 相关的检查项？

### 答案要点

#### 直答

- 结论：先列「原型链是什么？查找规则和终点」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：围绕 查找规则 与 终点 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- 原型：每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找。
- 继承：ES6 class 是原型继承的语法糖：方法定义在 Class.prototype 上，静态方法在构造函数上。

#### 风险与验收

- 主要风险：围绕 查找规则 与 终点 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 查找规则 与 终点 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## this-binding-followup-1

title: 追问：把「this 指向的七种场景」放到真实业务里，围绕 this 最容易被低估的边界条件和前置约束是什么
difficulty: 基础
tags: [this, 函数, 追问]
parent: this-binding

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：把「this 指向的七种场景」放到真实业务里，围绕 this 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：this 指向的七种场景 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先演练 this 指向的七种场景 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- this：obj.fn()，this 指向 obj。
- 函数：直接调用函数，非严格 globalThis，严格 undefined。

#### 风险与验收

- 主要风险：若 this 指向的七种场景 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 this 指向的七种场景 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## closure-followup-1

title: 追问：在真实业务里落地「闭包的定义、用途与陷阱」时，你会先排查哪些与 闭包 相关的边界假设
difficulty: 基础
tags: [闭包, 作用域, 追问]
parent: closure

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在真实业务里落地「闭包的定义、用途与陷阱」时，你会先排查哪些与 闭包 相关的边界假设？

### 答案要点

#### 直答

- 结论：先排查 闭包的定义 用途与陷阱 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：把「闭包的定义、用途与陷阱」里的 闭包的定义 用途与陷阱 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 闭包：闭包 = 函数 + 它定义时的词法环境。
- 作用域：在「闭包的定义、用途与陷阱」这题里，作用域 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 闭包的定义 用途与陷阱 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「闭包的定义、用途与陷阱」里 闭包的定义 用途与陷阱 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## event-loop-followup-1

title: 追问：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」做方案评审时，哪些 事件循环 边界输入最容易导致结论失真
difficulty: 进阶
tags: [事件循环, 异步, 追问]
parent: event-loop

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」做方案评审时，哪些 事件循环 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先梳理 浏览器事件循环 宏任务 微任务 RAF IDLE 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的 浏览器事件循环 宏任务 微任务 RAF IDLE 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- RAF：RAF 是「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- IDLE：IDLE 是「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 事件循环：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的 事件循环 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：围绕 浏览器事件循环 宏任务 微任务 RAF IDLE 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：浏览器事件循环 宏任务 微任务 RAF IDLE 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## promise-aplus-followup-1

title: 追问：真要把「手写一个符合 Promise/A+ 规范的 Promise」推到线上，你会如何围绕 Promise 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Promise, 异步, 手写, 追问]
parent: promise-aplus

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「手写一个符合 Promise/A+ 规范的 Promise」推到线上，你会如何围绕 Promise 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「手写一个符合 Promise/A+ 规范的 Promise」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：手写一个符合 Promise 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- Promise/A+：Promise/A+ 是「手写一个符合 Promise/A+ 规范的 Promise」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Promise：then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）。
- 异步：then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）。

#### 风险与验收

- 主要风险：围绕 手写一个符合 Promise 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 手写一个符合 Promise 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## promise-aplus-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 Promise 把「手写一个符合 Promise/A+ 规范的 Promise」拆成几段推进，确保每段都能独立验收
difficulty: 进阶
tags: [Promise, 异步, 手写, 追问]
parent: promise-aplus

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 Promise 把「手写一个符合 Promise/A+ 规范的 Promise」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 结论：把 手写一个符合 Promise 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先定义 手写一个符合 Promise 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Promise/A+：Promise/A+ 是「手写一个符合 Promise/A+ 规范的 Promise」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Promise：then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）。
- 异步：then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）。

#### 风险与验收

- 主要风险：手写一个符合 Promise 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「手写一个符合 Promise/A+ 规范的 Promise」里，手写一个符合 Promise 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## promise-aplus-followup-3

title: 追问：评估「手写一个符合 Promise/A+ 规范的 Promise」长期维护价值时，你最看重哪些稳定性和效率信号
difficulty: 进阶
tags: [Promise, 异步, 手写, 追问]
parent: promise-aplus

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：评估「手写一个符合 Promise/A+ 规范的 Promise」长期维护价值时，你最看重哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：验证 手写一个符合 Promise 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「手写一个符合 Promise/A+ 规范的 Promise」里的 手写一个符合 Promise 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Promise/A+：Promise/A+ 是「手写一个符合 Promise/A+ 规范的 Promise」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Promise：then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）。
- 异步：then 返回新 Promise，回调放入队列异步执行（用 queueMicrotask 或 MutationObserver）。

#### 风险与验收

- 主要风险：在「手写一个符合 Promise/A+ 规范的 Promise」里，手写一个符合 Promise 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「手写一个符合 Promise/A+ 规范的 Promise」里，手写一个符合 Promise 至少要给一组指标阈值、一条日志证据和一组测试结果。

## async-await-followup-1

title: 追问：在「async/await 在事件循环里的真实执行顺序」进入长周期维护后，你会重点巡检哪些高风险边界点
difficulty: 进阶
tags: [async, 事件循环, 追问]
parent: async-await

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「async/await 在事件循环里的真实执行顺序」进入长周期维护后，你会重点巡检哪些高风险边界点？

### 答案要点

#### 直答

- 结论：先列出 async/await 在事件循环里的真实执行顺序 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先演练 async/await 在事件循环里的真实执行顺序 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- async/await：围绕「async/await 在事件循环里的真实执行顺序」里的 async/await 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- async：async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise。
- 事件循环：在「async/await 在事件循环里的真实执行顺序」里，事件循环 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 async/await 在事件循环里的真实执行顺序 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 async/await 在事件循环里的真实执行顺序 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## debounce-throttle-followup-1

title: 追问：以「手写防抖与节流」为例，你会先看哪些与 手写 相关的指标来判断「手写防抖与节流」是不是当前性能瓶颈
difficulty: 基础
tags: [手写, 性能, 追问]
parent: debounce-throttle

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「手写防抖与节流」为例，你会先看哪些与 手写 相关的指标来判断「手写防抖与节流」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 手写防抖与节流 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 手写防抖与节流 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 手写防抖与节流：在「手写防抖与节流」这道追问里，手写防抖与节流 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 手写：围绕「手写防抖与节流」里的 手写 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 性能：围绕「手写防抖与节流」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：手写防抖与节流 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「手写防抖与节流」里，手写防抖与节流 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## debounce-throttle-followup-2

title: 追问：你会如何避免把「手写防抖与节流」的实验室提升误判为真实用户体验改善
difficulty: 基础
tags: [手写, 性能, 追问]
parent: debounce-throttle

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何避免把「手写防抖与节流」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 直答

- 结论：先拆分 手写防抖与节流 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 手写防抖与节流 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 手写防抖与节流：手写防抖与节流 是「手写防抖与节流」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 手写：在「手写防抖与节流」这题里，手写 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 性能：在「手写防抖与节流」这题里，性能 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：手写防抖与节流 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「手写防抖与节流」里，手写防抖与节流 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## debounce-throttle-followup-3

title: 追问：如果优化带来复杂度或兼容性成本，你会怎么评估「手写防抖与节流」是否值得做
difficulty: 基础
tags: [手写, 性能, 追问]
parent: debounce-throttle

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果优化带来复杂度或兼容性成本，你会怎么评估「手写防抖与节流」是否值得做？

### 答案要点

#### 直答

- 结论：先量化 手写防抖与节流 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先量化 手写防抖与节流 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 手写防抖与节流：在「手写防抖与节流」这道追问里，手写防抖与节流 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 手写：围绕「手写防抖与节流」里的 手写 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 性能：围绕「手写防抖与节流」里的 性能 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 手写防抖与节流 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 手写防抖与节流 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## deep-clone-followup-1

title: 追问：如果要评估「深拷贝完整实现：循环引用、Symbol、特殊对象」的落地风险，你会优先检查哪些 手写 约束是否成立
difficulty: 进阶
tags: [手写, 对象, 追问]
parent: deep-clone

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「深拷贝完整实现：循环引用、Symbol、特殊对象」的落地风险，你会优先检查哪些 手写 约束是否成立？

### 答案要点

#### 直答

- 结论：围绕「深拷贝完整实现：循环引用、Symbol、特殊对象」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：围绕 深拷贝完整实现 循环引用 Symbol 特殊对象 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Symbol：Reflect.ownKeys 同时拿到 string + symbol。
- 手写：围绕「深拷贝完整实现：循环引用、Symbol、特殊对象」里的 手写 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 对象：用 WeakMap 记录已克隆对象避免循环引用。

#### 风险与验收

- 主要风险：若 深拷贝完整实现 循环引用 Symbol 特殊对象 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：深拷贝完整实现 循环引用 Symbol 特殊对象 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## esm-vs-cjs-followup-1

title: 追问：从工程落地角度看，当「ESM 与 CommonJS 的差异、互操作与陷阱」进入复杂场景后，你会先验证哪些 模块化 前置条件，避免方案踩坑
difficulty: 进阶
tags: [模块化, Node, 追问]
parent: esm-vs-cjs

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「ESM 与 CommonJS 的差异、互操作与陷阱」进入复杂场景后，你会先验证哪些 模块化 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 结论：先定义 ESM 与 CommonJS 的差异 互操作与陷阱 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 ESM 与 CommonJS 的差异 互操作与陷阱 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- ESM：静态分析、异步加载、export 是实时绑定（live binding），可被 tree-shaking。
- CommonJS：同步加载，围绕 module.exports 对象工作，天然不具备 ESM 那样的静态结构信息。
- 模块化：围绕「ESM 与 CommonJS 的差异、互操作与陷阱」里的 模块化 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 ESM 与 CommonJS 的差异 互操作与陷阱 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：ESM 与 CommonJS 的差异 互操作与陷阱 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## memory-leak-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 内存 相关的指标来判断「前端常见内存泄漏与排查」是不是当前性能瓶颈
difficulty: 进阶
tags: [内存, 性能, 追问]
parent: memory-leak

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 内存 相关的指标来判断「前端常见内存泄漏与排查」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 前端常见内存泄漏与排查 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 前端常见内存泄漏与排查 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 内存：围绕「前端常见内存泄漏与排查」里的 内存 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 性能：在「前端常见内存泄漏与排查」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：前端常见内存泄漏与排查 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「前端常见内存泄漏与排查」里，前端常见内存泄漏与排查 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## memory-leak-followup-2

title: 追问：结合真实业务约束，你会怎样验证「前端常见内存泄漏与排查」的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [内存, 性能, 追问]
parent: memory-leak

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「前端常见内存泄漏与排查」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 前端常见内存泄漏与排查 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先统一 前端常见内存泄漏与排查 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 内存：围绕「前端常见内存泄漏与排查」里的 内存 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 性能：在「前端常见内存泄漏与排查」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「前端常见内存泄漏与排查」里，前端常见内存泄漏与排查 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：前端常见内存泄漏与排查 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## memory-leak-followup-3

title: 追问：以「前端常见内存泄漏与排查」为例，如果「前端常见内存泄漏与排查」在 内存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 进阶
tags: [内存, 性能, 追问]
parent: memory-leak

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端常见内存泄漏与排查」为例，如果「前端常见内存泄漏与排查」在 内存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 直答

- 结论：前端常见内存泄漏与排查 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先识别 前端常见内存泄漏与排查 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 内存：在「前端常见内存泄漏与排查」里，内存 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 性能：围绕「前端常见内存泄漏与排查」里的 性能 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 前端常见内存泄漏与排查 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 前端常见内存泄漏与排查 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## proxy-reflect-followup-1

title: 追问：如果要让「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」稳定上线，你会优先补齐哪些与 Proxy 相关的检查项
difficulty: 进阶
tags: [Proxy, 元编程, 追问]
parent: proxy-reflect

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」稳定上线，你会优先补齐哪些与 Proxy 相关的检查项？

### 答案要点

#### 直答

- 结论：先列「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：Proxy 与 Reflect 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- Proxy：Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...。
- Reflect：Reflect.get(target, key, receiver) 显式传 receiver，保证 getter/setter 中 this 正确。
- trap：围绕「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里的 trap 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：Proxy 与 Reflect 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 Proxy 与 Reflect 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## iterator-generator-followup-1

title: 追问：当「迭代器、生成器与异步迭代」进入复杂场景后，你会先验证哪些 迭代器 前置条件，避免方案踩坑
difficulty: 进阶
tags: [迭代器, 生成器, 追问]
parent: iterator-generator

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「迭代器、生成器与异步迭代」进入复杂场景后，你会先验证哪些 迭代器 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 结论：先定义 迭代器 生成器与异步迭代 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「迭代器、生成器与异步迭代」里的 迭代器 生成器与异步迭代 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 迭代器：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展。
- 生成器：function\* 自动实现迭代器协议，yield 暂停让出，return 标记 done。

#### 风险与验收

- 主要风险：在「迭代器、生成器与异步迭代」里，迭代器 生成器与异步迭代 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「迭代器、生成器与异步迭代」里，迭代器 生成器与异步迭代 至少要给一组指标阈值、一条日志证据和一组测试结果。

## structured-clone-followup-1

title: 追问：面对真实流量和复杂依赖时，「结构化克隆 vs JSON 序列化」最可能被哪些 克隆 边界条件击穿
difficulty: 进阶
tags: [克隆, postMessage, 追问]
parent: structured-clone

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「结构化克隆 vs JSON 序列化」最可能被哪些 克隆 边界条件击穿？

### 答案要点

#### 直答

- 结论：先列「结构化克隆 vs JSON 序列化」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：围绕 结构化克隆 vs JSON 序列化 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- vs JSON：围绕「结构化克隆 vs JSON 序列化」里的 vs JSON 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 克隆：postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制。
- postMessage：postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制。

#### 风险与验收

- 主要风险：围绕 结构化克隆 vs JSON 序列化 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：结构化克隆 vs JSON 序列化 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## tagged-template-literal-followup-1

title: 追问：在「模板字符串与标签模板的实战」进入长周期维护后，你会重点巡检哪些与 模板字符串 相关的高风险边界点
difficulty: 进阶
tags: [模板字符串, 标签模板, 追问]
parent: tagged-template-literal

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「模板字符串与标签模板的实战」进入长周期维护后，你会重点巡检哪些与 模板字符串 相关的高风险边界点？

### 答案要点

#### 直答

- 结论：上线 模板字符串与标签模板的实战 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先识别 模板字符串与标签模板的实战 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 模板字符串：围绕「模板字符串与标签模板的实战」里的 模板字符串 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 标签模板：围绕「模板字符串与标签模板的实战」里的 标签模板 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：模板字符串与标签模板的实战 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 模板字符串与标签模板的实战 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## weak-collection-followup-1

title: 追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，在真实业务里落地「WeakMap / WeakSet / WeakRef 与垃圾回收」时，你会先排查哪些与 WeakMap 相关的边界假设
difficulty: 资深
tags: [WeakMap, GC, 追问]
parent: weak-collection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，在真实业务里落地「WeakMap / WeakSet / WeakRef 与垃圾回收」时，你会先排查哪些与 WeakMap 相关的边界假设？

### 答案要点

#### 直答

- 结论：先排查 WeakMap 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先梳理 WeakMap 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- WeakMap：key 必须是可弱引用值（对象，现代规范也允许非注册 Symbol），弱引用条目不会阻止 key 被 GC，适合"给对象挂私有数据"。
- WeakSet：同理，做"对象集合的存在性检查"，不阻止回收；不要放字符串、数字等原始值。
- WeakRef：手动持有弱引用，常用于缓存大对象，避免引用导致无法回收。

#### 风险与验收

- 主要风险：围绕 WeakMap 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：WeakMap 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## bind-call-apply-followup-1

title: 追问：你会如何识别「bind / call / apply 的区别与手写实现」在生产环境中最容易失效的 this 边界因素
difficulty: 进阶
tags: [this, 函数, 追问]
parent: bind-call-apply

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「bind / call / apply 的区别与手写实现」在生产环境中最容易失效的 this 边界因素？

### 答案要点

#### 直答

- 结论：先列「bind / call / apply 的区别与手写实现」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先梳理 bind / call / apply 的区别与手写实现 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- bind：bind(thisArg, ...args)：返回新函数，可继续传参（柯里化）。
- call：call(thisArg, ...args)：立即调用，参数依次传。
- apply：apply(thisArg, [args])：立即调用，参数为数组。

#### 风险与验收

- 主要风险：bind 后再被 new 调用时，绑定的 this 失效（new 的优先级更高）。
- 验收信号：bind / call / apply 的区别与手写实现 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## new-operator-followup-1

title: 追问：你会如何识别「new 操作符做了哪些事，怎么手写」在生产环境中最容易失效的 对象 边界因素
difficulty: 进阶
tags: [对象, 函数, 追问]
parent: new-operator

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「new 操作符做了哪些事，怎么手写」在生产环境中最容易失效的 对象 边界因素？

### 答案要点

#### 直答

- 结论：「new 操作符做了哪些事，怎么手写」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先梳理 new 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- new：在「new 操作符做了哪些事，怎么手写」这道追问里，new 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 对象：创建一个空对象 obj。
- 函数：如果构造函数返回的是对象则返回该对象，否则返回 obj。

#### 风险与验收

- 主要风险：围绕 new 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：new 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## promise-all-allsettled-race-any-followup-1

title: 追问：面对真实流量和复杂依赖时，「Promise.all / allSettled / race / any 的差异和典型用法」最可能被哪些 异步 边界条件击穿
difficulty: 进阶
tags: [异步, Promise, 追问]
parent: promise-all-allsettled-race-any

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「Promise.all / allSettled / race / any 的差异和典型用法」最可能被哪些 异步 边界条件击穿？

### 答案要点

#### 直答

- 结论：围绕「Promise.all / allSettled / race / any 的差异和典型用法」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：先演练 Promise.all 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- Promise.all：Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）。
- allSettled：Promise.allSettled(iter)：等所有都结束，永不 reject，返回 {status, value/reason}[]（批量上报）。
- race：Promise.race(iter)：最先 settle 的决定结果（超时控制）。

#### 风险与验收

- 主要风险：Promise.all 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 Promise.all 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## flatten-array-followup-1

title: 追问：你会如何围绕 数组 提前识别「数组扁平化的多种实现」中的复杂度陷阱，避免实现后期返工
difficulty: 基础
tags: [数组, 手写, 追问]
parent: flatten-array

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 数组 提前识别「数组扁平化的多种实现」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 结论：数组扁平化的多种实现 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先识别 数组扁平化的多种实现 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 数组扁平化的多种实现：围绕「数组扁平化的多种实现」里的 数组扁平化的多种实现 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 数组：围绕「数组扁平化的多种实现」里的 数组 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 手写：围绕「数组扁平化的多种实现」里的 手写 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 数组扁平化的多种实现 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 数组扁平化的多种实现 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## event-emitter-followup-1

title: 追问：结合真实业务约束，真要把「手写一个 EventEmitter（订阅发布）」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径
difficulty: 基础
tags: [设计模式, 手写, 追问]
parent: event-emitter

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「手写一个 EventEmitter（订阅发布）」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「手写一个 EventEmitter（订阅发布）」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：围绕 手写一个 EventEmitter 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- EventEmitter：EventEmitter 是「手写一个 EventEmitter（订阅发布）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 设计模式：围绕「手写一个 EventEmitter（订阅发布）」里的 设计模式 推进上线时，要明确每个批次的放量门槛和回退条件。
- 手写：在「手写一个 EventEmitter（订阅发布）」里，手写 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：围绕 手写一个 EventEmitter 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：围绕 手写一个 EventEmitter 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## debounce-immediate-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 手写 相关的指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈
difficulty: 进阶
tags: [手写, 性能, 追问]
parent: debounce-immediate

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 手写 相关的指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证 防抖 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 防抖 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- debounce：在「防抖（debounce）的 immediate 模式怎么实现」里，debounce 是验收对象，必须给可量化指标、日志信号和测试证据。
- immediate：immediate=true 时，第一次调用立刻执行，后续在 wait 内被忽略；wait 过了之后下次调用又算"第一次"。
- 手写：围绕「防抖（debounce）的 immediate 模式怎么实现」里的 手写 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 防抖 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：防抖 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## prototype-chain-followup-2

title: 追问：在当前团队与业务约束下，修改原型链为什么是性能反模式
difficulty: 基础
tags: [原型, 继承, 追问]
parent: prototype-chain
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，修改原型链（`Object.setPrototypeOf`）为什么是性能反模式？

### 答案要点

#### 直答

- 结论：查找规则 与 终点 的原因要落到“为什么会发生、何时会失效、如何规避”三点，缺一都不完整。
- 关键动作：先复盘 查找规则 与 终点 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- 原型：每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找。
- 继承：ES6 class 是原型继承的语法糖：方法定义在 Class.prototype 上，静态方法在构造函数上。
- Object.setPrototype：Object.setPrototype 是「原型链是什么？查找规则和终点」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：查找规则 与 终点 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：验收标准是 查找规则 与 终点 因果链可复现：输入触发、机制命中、修复后指标回稳。

## prototype-chain-followup-3

title: 追问：ES6 class 和原型继承能 100% 等价吗？类字段、私有字段有什么不同
difficulty: 基础
tags: [原型, 继承, 追问]
parent: prototype-chain
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：ES6 `class` 和原型继承能 100% 等价吗？类字段、私有字段（`#x`）有什么不同？

### 答案要点

#### 直答

- 结论：先拆分 class 与 原型继承能 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 class 与 原型继承能 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 原型：每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找。
- 继承：ES6 class 是原型继承的语法糖：方法定义在 Class.prototype 上，静态方法在构造函数上。
- ES6：ES6 class 是原型继承的语法糖：方法定义在 Class.prototype 上，静态方法在构造函数上。

#### 风险与验收

- 主要风险：class 与 原型继承能 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「原型链是什么？查找规则和终点」里，验收 class 与 原型继承能 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## this-binding-followup-2

title: 追问：bind 之后还能再 bind 吗？再调用 call 呢
difficulty: 基础
tags: [this, 函数, 追问]
parent: this-binding
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：bind 之后还能再 bind 吗？再调用 call 呢？

### 答案要点

#### 直答

- 结论：把 this 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 this 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- this：obj.fn()，this 指向 obj。
- 函数：直接调用函数，非严格 globalThis，严格 undefined。
- bind：call/apply/bind，this 指向第一个参数。

#### 风险与验收

- 主要风险：this 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「this 指向的七种场景」里 this 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## this-binding-followup-3

title: 追问：以「this 指向的七种场景」为例，严格模式下默认绑定的 this 是什么？为什么这么设计
difficulty: 基础
tags: [this, 函数, 追问]
parent: this-binding
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「this 指向的七种场景」为例，严格模式下默认绑定的 this 是什么？为什么这么设计？

### 答案要点

#### 直答

- 结论：解释 this 指向的七种场景 时先给结论，再补触发前提、作用机制和失效边界，避免只背定义。
- 关键动作：先复盘 this 指向的七种场景 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- this：obj.fn()，this 指向 obj。
- 函数：直接调用函数，非严格 globalThis，严格 undefined。

#### 风险与验收

- 主要风险：this 指向的七种场景 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：验收要能复现 this 指向的七种场景 问题并证明原因链成立，再观察修复后指标是否回归。

## closure-followup-2

title: 追问：模块模式现在还需要靠闭包吗？ESM 是否替代了它
difficulty: 基础
tags: [闭包, 作用域, 追问]
parent: closure
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：模块模式（私有变量）现在还需要靠闭包吗？ESM 是否替代了它？

### 答案要点

#### 直答

- 结论：用途 与 陷阱 的原因要落到“为什么会发生、何时会失效、如何规避”三点，缺一都不完整。
- 关键动作：先复盘 用途 与 陷阱 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- 闭包：闭包 = 函数 + 它定义时的词法环境。
- 作用域：作用域 决定「闭包的定义、用途与陷阱」为什么会这样，回答时要把原因和失效前提讲清楚。
- ESM：ESM 是「闭包的定义、用途与陷阱」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：用途 与 陷阱 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：围绕 用途 与 陷阱 归因结果至少给复现步骤、日志证据和回归指标，防止误判。

## event-loop-followup-2

title: 追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，queueMicrotask、Promise.resolve.then 哪个先执行
difficulty: 进阶
tags: [事件循环, 异步, 追问]
parent: event-loop
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，`queueMicrotask`、`Promise.resolve().then` 哪个先执行？

### 答案要点

#### 直答

- 结论：先画出 浏览器事件循环 宏任务 微任务 RAF IDLE 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 浏览器事件循环 宏任务 微任务 RAF IDLE 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- RAF：RAF 是「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- IDLE：IDLE 是「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 事件循环：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」这题里，事件循环 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：浏览器事件循环 宏任务 微任务 RAF IDLE 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」里，浏览器事件循环 宏任务 微任务 RAF IDLE 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## event-loop-followup-3

title: 追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，async/await 在 Event Loop 中的实际表现
difficulty: 进阶
tags: [事件循环, 异步, 追问]
parent: event-loop
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，async/await 在 Event Loop 中的实际表现（每个 await 等价于一次微任务调度）？

### 答案要点

#### 直答

- 结论：先锁定 浏览器事件循环 宏任务 微任务 RAF IDLE 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 浏览器事件循环 宏任务 微任务 RAF IDLE 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- RAF：RAF 是「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- IDLE：IDLE 是「浏览器事件循环：宏任务、微任务、RAF、IDLE」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 事件循环：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」这题里，事件循环 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：浏览器事件循环 宏任务 微任务 RAF IDLE 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」里，浏览器事件循环 宏任务 微任务 RAF IDLE 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## deep-clone-followup-2

title: 追问：结合真实业务约束，拷贝一个含 DOM 节点的对象会怎样
difficulty: 进阶
tags: [手写, 对象, 追问]
parent: deep-clone
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，拷贝一个含 DOM 节点的对象会怎样？

### 答案要点

#### 直答

- 结论：先把 深拷贝完整实现 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 深拷贝完整实现 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 手写：围绕「深拷贝完整实现：循环引用、Symbol、特殊对象」里的 手写 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 对象：用 WeakMap 记录已克隆对象避免循环引用。
- DOM：DOM 是「深拷贝完整实现：循环引用、Symbol、特殊对象」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 深拷贝完整实现 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：深拷贝完整实现 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## deep-clone-followup-3

title: 追问：以「深拷贝完整实现：循环引用、Symbol、特殊对象」为例，写一个支持循环引用的简易深拷贝
difficulty: 进阶
tags: [手写, 对象, 追问]
parent: deep-clone
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「深拷贝完整实现：循环引用、Symbol、特殊对象」为例，写一个支持循环引用的简易深拷贝（用 WeakMap 备忘）？

### 答案要点

#### 直答

- 结论：先把 深拷贝完整实现 循环引用 Symbol 特殊对象 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 深拷贝完整实现 循环引用 Symbol 特殊对象 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Symbol：Reflect.ownKeys 同时拿到 string + symbol。
- 手写：在「深拷贝完整实现：循环引用、Symbol、特殊对象」这题里，手写 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 对象：用 WeakMap 记录已克隆对象避免循环引用。

#### 风险与验收

- 主要风险：围绕 深拷贝完整实现 循环引用 Symbol 特殊对象 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「深拷贝完整实现：循环引用、Symbol、特殊对象」里 深拷贝完整实现 循环引用 Symbol 特殊对象 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## esm-vs-cjs-followup-2

title: 追问：在「ESM 与 CommonJS 的差异、互操作与陷阱」场景下，import 一个 CJS 模块时 default 怎么映射
difficulty: 进阶
tags: [模块化, Node, 追问]
parent: esm-vs-cjs
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「ESM 与 CommonJS 的差异、互操作与陷阱」场景下，import 一个 CJS 模块时 default 怎么映射？

### 答案要点

#### 直答

- 结论：先锁定 ESM 与 CommonJS 的差异 互操作与陷阱 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 ESM 与 CommonJS 的差异 互操作与陷阱 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- ESM：静态分析、异步加载、export 是实时绑定（live binding），可被 tree-shaking。
- CommonJS：同步加载，围绕 module.exports 对象工作，天然不具备 ESM 那样的静态结构信息。
- 模块化：围绕「ESM 与 CommonJS 的差异、互操作与陷阱」里的 模块化 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：ESM 与 CommonJS 的差异 互操作与陷阱 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「ESM 与 CommonJS 的差异、互操作与陷阱」里，验收 ESM 与 CommonJS 的差异 互操作与陷阱 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## esm-vs-cjs-followup-3

title: 追问：Node 怎么决定 .js 是 ESM 还是 CJS
difficulty: 进阶
tags: [模块化, Node, 追问]
parent: esm-vs-cjs
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：Node 怎么决定 `.js` 是 ESM 还是 CJS（package.json 的 type 字段、`.mjs`）？

### 答案要点

#### 直答

- 结论：先画出 ESM 与 CommonJS 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 ESM 与 CommonJS 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 模块化：在「ESM 与 CommonJS 的差异、互操作与陷阱」这题里，模块化 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Node：Node 是「ESM 与 CommonJS 的差异、互操作与陷阱」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- js：围绕「ESM 与 CommonJS 的差异、互操作与陷阱」里的 js 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：ESM 与 CommonJS 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 ESM 与 CommonJS 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## flatten-array-followup-2

title: 追问：以「数组扁平化的多种实现」为例，如果数据规模扩大一个数量级，你会如何围绕 数组 调整数据结构或算法
difficulty: 基础
tags: [数组, 手写, 追问]
parent: flatten-array
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「数组扁平化的多种实现」为例，如果数据规模扩大一个数量级，你会如何围绕 数组 调整数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 数组扁平化的多种实现 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：先明确 数组扁平化的多种实现 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 数组扁平化的多种实现：数组扁平化的多种实现 是「数组扁平化的多种实现」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 数组：在「数组扁平化的多种实现」这题里，数组 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 手写：在「数组扁平化的多种实现」这题里，手写 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：数组扁平化的多种实现 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 数组扁平化的多种实现 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## flatten-array-followup-3

title: 追问：如果要让「数组扁平化的多种实现」的正确性可复核，你会围绕 数组 设计哪些验证步骤
difficulty: 基础
tags: [数组, 手写, 追问]
parent: flatten-array
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「数组扁平化的多种实现」的正确性可复核，你会围绕 数组 设计哪些验证步骤？

### 答案要点

#### 直答

- 结论：先约定「数组扁平化的多种实现」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先把「数组扁平化的多种实现」里的 数组扁平化的多种实现 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 数组扁平化的多种实现：在「数组扁平化的多种实现」这道追问里，数组扁平化的多种实现 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 数组：在「数组扁平化的多种实现」里，数组 是验收对象，必须给可量化指标、日志信号和测试证据。
- 手写：在「数组扁平化的多种实现」里，手写 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「数组扁平化的多种实现」里，数组扁平化的多种实现 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「数组扁平化的多种实现」里，数组扁平化的多种实现 至少要给一组指标阈值、一条日志证据和一组测试结果。

## event-emitter-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 设计模式 规划「手写一个 EventEmitter」的阶段目标与交付边界
difficulty: 基础
tags: [设计模式, 手写, 追问]
parent: event-emitter
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 设计模式 规划「手写一个 EventEmitter」的阶段目标与交付边界？

### 答案要点

#### 直答

- 结论：先量化 手写一个 EventEmitter 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先排查 手写一个 EventEmitter 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- EventEmitter：EventEmitter 是「手写一个 EventEmitter（订阅发布）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 设计模式：围绕「手写一个 EventEmitter（订阅发布）」里的 设计模式 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 手写：在「手写一个 EventEmitter（订阅发布）」里，手写 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：若 手写一个 EventEmitter 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 手写一个 EventEmitter 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## event-emitter-followup-3

title: 追问：在当前团队与业务约束下，为了确认「手写一个 EventEmitter」在 设计模式 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 基础
tags: [设计模式, 手写, 追问]
parent: event-emitter
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「手写一个 EventEmitter」在 设计模式 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：把 手写一个 EventEmitter 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 手写一个 EventEmitter 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- EventEmitter：EventEmitter 是「手写一个 EventEmitter（订阅发布）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 设计模式：围绕「手写一个 EventEmitter（订阅发布）」里的 设计模式 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 手写：在「手写一个 EventEmitter（订阅发布）」里，手写 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：手写一个 EventEmitter 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「手写一个 EventEmitter（订阅发布）」里，手写一个 EventEmitter 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## debounce-immediate-followup-2

title: 追问：围绕「防抖（debounce）的 immediate 模式怎么实现」上线效果，你会优先看哪些和 手写 相关的真实用户指标来佐证体验提升
difficulty: 进阶
tags: [手写, 性能, 追问]
parent: debounce-immediate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「防抖（debounce）的 immediate 模式怎么实现」上线效果，你会优先看哪些和 手写 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 直答

- 结论：先定义 防抖 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先定义 防抖 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- debounce：围绕「防抖（debounce）的 immediate 模式怎么实现」里的 debounce 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- immediate：immediate=true 时，第一次调用立刻执行，后续在 wait 内被忽略；wait 过了之后下次调用又算"第一次"。
- 手写：在「防抖（debounce）的 immediate 模式怎么实现」里，手写 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：防抖 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「防抖（debounce）的 immediate 模式怎么实现」里，防抖 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## debounce-immediate-followup-3

title: 追问：结合真实业务约束，如果「防抖的 immediate 模式怎么实现」在 手写实现 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [手写, 性能, 追问]
parent: debounce-immediate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果「防抖的 immediate 模式怎么实现」在 手写实现 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 防抖 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先拆分 防抖 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- immediate：immediate=true 时，第一次调用立刻执行，后续在 wait 内被忽略；wait 过了之后下次调用又算"第一次"。
- 手写：在「防抖（debounce）的 immediate 模式怎么实现」里，手写 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 性能：在「防抖（debounce）的 immediate 模式怎么实现」里，性能 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：若 防抖 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 防抖 收益提升和维护成本变化，确保取舍结论可持续。

## async-await-followup-2

title: 追问：以「async/await 在事件循环里的真实执行顺序」为例，如果要让结论在 async 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [async, 事件循环, 追问]
parent: async-await
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「async/await 在事件循环里的真实执行顺序」为例，如果要让结论在 async 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：验证「async/await 在事件循环里的真实执行顺序」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 async/await 在事件循环里的真实执行顺序 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- async/await：围绕「async/await 在事件循环里的真实执行顺序」里的 async/await 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- async：async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise。
- 事件循环：在「async/await 在事件循环里的真实执行顺序」里，事件循环 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「async/await 在事件循环里的真实执行顺序」里，async/await 在事件循环里的真实执行顺序 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：async/await 在事件循环里的真实执行顺序 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## async-await-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 async 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [async, 事件循环, 追问]
parent: async-await
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 async 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先梳理 async 与 await 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 async 与 await 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- async：async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise。
- 事件循环：在「async/await 在事件循环里的真实执行顺序」这题里，事件循环 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「async/await 在事件循环里的真实执行顺序」里，async 与 await 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「async/await 在事件循环里的真实执行顺序」里 async 与 await 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## proxy-reflect-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 Proxy 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [Proxy, 元编程, 追问]
parent: proxy-reflect
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 Proxy 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 Proxy 与 Reflect 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Proxy：Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...。
- 元编程：围绕「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里的 元编程 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：Proxy 与 Reflect 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里，Proxy 与 Reflect 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## proxy-reflect-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里和 Proxy 相关的哪些环节
difficulty: 进阶
tags: [Proxy, 元编程, 追问]
parent: proxy-reflect
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里和 Proxy 相关的哪些环节？

### 答案要点

#### 直答

- 结论：先处理 Proxy 与 Reflect 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：先排查 Proxy 与 Reflect 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Proxy：Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...。
- Reflect：Reflect.get(target, key, receiver) 显式传 receiver，保证 getter/setter 中 this 正确。
- trap：在「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里，trap 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 Proxy 与 Reflect 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收看 Proxy 与 Reflect 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## iterator-generator-followup-2

title: 追问：从工程落地角度看，你会如何围绕 迭代器 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [迭代器, 生成器, 追问]
parent: iterator-generator
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 迭代器 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先定「迭代器、生成器与异步迭代」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 生成器 与 异步迭代 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 迭代器：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展。
- 生成器：function\* 自动实现迭代器协议，yield 暂停让出，return 标记 done。

#### 风险与验收

- 主要风险：在「迭代器、生成器与异步迭代」里，生成器 与 异步迭代 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：生成器 与 异步迭代 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## iterator-generator-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「迭代器、生成器与异步迭代」里和 迭代器 相关的哪些环节
difficulty: 进阶
tags: [迭代器, 生成器, 追问]
parent: iterator-generator
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「迭代器、生成器与异步迭代」里和 迭代器 相关的哪些环节？

### 答案要点

#### 直答

- 结论：先处理 迭代器 生成器与异步迭代 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：先拆分 迭代器 生成器与异步迭代 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 迭代器：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展。
- 生成器：function\* 自动实现迭代器协议，yield 暂停让出，return 标记 done。

#### 风险与验收

- 主要风险：围绕 迭代器 生成器与异步迭代 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 迭代器 生成器与异步迭代 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## structured-clone-followup-2

title: 追问：以「结构化克隆 vs JSON 序列化」为例，为了确认「结构化克隆 vs JSON 序列化」不是“看起来有效”，你会如何安排测试证据和观测指标
difficulty: 进阶
tags: [克隆, postMessage, 追问]
parent: structured-clone
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「结构化克隆 vs JSON 序列化」为例，为了确认「结构化克隆 vs JSON 序列化」不是“看起来有效”，你会如何安排测试证据和观测指标？

### 答案要点

#### 直答

- 结论：先定「结构化克隆 vs JSON 序列化」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先把「结构化克隆 vs JSON 序列化」里的 结构化克隆 vs JSON 序列化 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- vs JSON：围绕「结构化克隆 vs JSON 序列化」里的 vs JSON 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 克隆：postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制。
- postMessage：postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制。

#### 风险与验收

- 主要风险：在「结构化克隆 vs JSON 序列化」里，结构化克隆 vs JSON 序列化 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「结构化克隆 vs JSON 序列化」里，结构化克隆 vs JSON 序列化 至少要给一组指标阈值、一条日志证据和一组测试结果。

## structured-clone-followup-3

title: 追问：在「结构化克隆 vs JSON 序列化」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 克隆 拆分「结构化克隆 vs JSON 序列化」的落地路径
difficulty: 进阶
tags: [克隆, postMessage, 追问]
parent: structured-clone
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「结构化克隆 vs JSON 序列化」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 克隆 拆分「结构化克隆 vs JSON 序列化」的落地路径？

### 答案要点

#### 直答

- 结论：把 结构化克隆 vs JSON 序列化 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 结构化克隆 vs JSON 序列化 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- vs JSON：在「结构化克隆 vs JSON 序列化」这题里，vs JSON 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 克隆：postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制。
- postMessage：postMessage / Worker / IndexedDB 内部都用结构化克隆，理解它就理解这些 API 的限制。

#### 风险与验收

- 主要风险：结构化克隆 vs JSON 序列化 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「结构化克隆 vs JSON 序列化」里 结构化克隆 vs JSON 序列化 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## tagged-template-literal-followup-2

title: 追问：以「模板字符串与标签模板的实战」为例，你会如何围绕 模板字符串 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [模板字符串, 标签模板, 追问]
parent: tagged-template-literal
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「模板字符串与标签模板的实战」为例，你会如何围绕 模板字符串 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先约定「模板字符串与标签模板的实战」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：围绕 模板字符串与标签模板的实战 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 模板字符串：在「模板字符串与标签模板的实战」里，模板字符串 是验收对象，必须给可量化指标、日志信号和测试证据。
- 标签模板：在「模板字符串与标签模板的实战」里，标签模板 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 模板字符串与标签模板的实战 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：模板字符串与标签模板的实战 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## tagged-template-literal-followup-3

title: 追问：在「模板字符串与标签模板的实战」场景下，如果兼容性压力突然升高，你会如何围绕 模板字符串 重新划分「模板字符串与标签模板的实战」的实施阶段
difficulty: 进阶
tags: [模板字符串, 标签模板, 追问]
parent: tagged-template-literal
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「模板字符串与标签模板的实战」场景下，如果兼容性压力突然升高，你会如何围绕 模板字符串 重新划分「模板字符串与标签模板的实战」的实施阶段？

### 答案要点

#### 直答

- 结论：「模板字符串与标签模板的实战」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：把「模板字符串与标签模板的实战」里的 模板字符串与标签模板的实战 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 模板字符串：围绕「模板字符串与标签模板的实战」里的 模板字符串 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 标签模板：围绕「模板字符串与标签模板的实战」里的 标签模板 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「模板字符串与标签模板的实战」里，模板字符串与标签模板的实战 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：模板字符串与标签模板的实战 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## weak-collection-followup-2

title: 追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，如果要让结论在 WeakMap 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [WeakMap, GC, 追问]
parent: weak-collection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，如果要让结论在 WeakMap 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：先定「WeakMap / WeakSet / WeakRef 与垃圾回收」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先定义 WeakMap 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- WeakMap：key 必须是可弱引用值（对象，现代规范也允许非注册 Symbol），弱引用条目不会阻止 key 被 GC，适合"给对象挂私有数据"。
- WeakSet：同理，做"对象集合的存在性检查"，不阻止回收；不要放字符串、数字等原始值。
- WeakRef：手动持有弱引用，常用于缓存大对象，避免引用导致无法回收。

#### 风险与验收

- 主要风险：WeakMap 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「WeakMap / WeakSet / WeakRef 与垃圾回收」里，WeakMap 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## weak-collection-followup-3

title: 追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 WeakMap 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [WeakMap, GC, 追问]
parent: weak-collection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 WeakMap 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先把 WeakMap 与 WeakSet 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 WeakMap 与 WeakSet 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- WeakMap：key 必须是可弱引用值（对象，现代规范也允许非注册 Symbol），弱引用条目不会阻止 key 被 GC，适合"给对象挂私有数据"。
- GC：key 必须是可弱引用值（对象，现代规范也允许非注册 Symbol），弱引用条目不会阻止 key 被 GC，适合"给对象挂私有数据"。

#### 风险与验收

- 主要风险：WeakMap 与 WeakSet 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「WeakMap / WeakSet / WeakRef 与垃圾回收」里 WeakMap 与 WeakSet 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## bind-call-apply-followup-2

title: 追问：你会如何围绕 this 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [this, 函数, 追问]
parent: bind-call-apply
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 this 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先约定「bind / call / apply 的区别与手写实现」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 bind 与 call 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- this：call(thisArg, ...args)：立即调用，参数依次传。
- 函数：bind(thisArg, ...args)：返回新函数，可继续传参（柯里化）。

#### 风险与验收

- 主要风险：bind 后再被 new 调用时，绑定的 this 失效（new 的优先级更高）。
- 验收信号：在「bind / call / apply 的区别与手写实现」里，bind 与 call 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## bind-call-apply-followup-3

title: 追问：在「bind / call / apply 的区别与手写实现」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 this 拆分「bind / call / apply 的区别与手写实现」的落地路径
difficulty: 进阶
tags: [this, 函数, 追问]
parent: bind-call-apply
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「bind / call / apply 的区别与手写实现」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 this 拆分「bind / call / apply 的区别与手写实现」的落地路径？

### 答案要点

#### 直答

- 结论：回答 bind / call / apply 的区别与手写实现 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先明确 bind / call / apply 的区别与手写实现 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- bind：bind(thisArg, ...args)：返回新函数，可继续传参（柯里化）。
- call：call(thisArg, ...args)：立即调用，参数依次传。
- apply：apply(thisArg, [args])：立即调用，参数为数组。

#### 风险与验收

- 主要风险：bind 后再被 new 调用时，绑定的 this 失效（new 的优先级更高）。
- 验收信号：在「bind / call / apply 的区别与手写实现」里，bind / call / apply 的区别与手写实现 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## new-operator-followup-2

title: 追问：以「new 操作符做了哪些事，怎么手写」为例，你会如何围绕 对象 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [对象, 函数, 追问]
parent: new-operator
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「new 操作符做了哪些事，怎么手写」为例，你会如何围绕 对象 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先约定「new 操作符做了哪些事，怎么手写」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 new 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- new：new 是「new 操作符做了哪些事，怎么手写」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 对象：创建一个空对象 obj。
- 函数：如果构造函数返回的是对象则返回该对象，否则返回 obj。

#### 风险与验收

- 主要风险：new 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「new 操作符做了哪些事，怎么手写」里，new 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## new-operator-followup-3

title: 追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 对象 拆分「new 操作符做了哪些事，怎么手写」的落地路径
difficulty: 进阶
tags: [对象, 函数, 追问]
parent: new-operator
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 对象 拆分「new 操作符做了哪些事，怎么手写」的落地路径？

### 答案要点

#### 直答

- 结论：先梳理 new 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「new 操作符做了哪些事，怎么手写」里的 new 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- new：在「new 操作符做了哪些事，怎么手写」这道追问里，new 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 对象：创建一个空对象 obj。
- 函数：如果构造函数返回的是对象则返回该对象，否则返回 obj。

#### 风险与验收

- 主要风险：在「new 操作符做了哪些事，怎么手写」里，new 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：new 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## promise-all-allsettled-race-any-followup-2

title: 追问：以「Promise.all / allSettled / race / any 的差异和典型用法」为例，你会如何围绕 异步 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [异步, Promise, 追问]
parent: promise-all-allsettled-race-any
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Promise.all / allSettled / race / any 的差异和典型用法」为例，你会如何围绕 异步 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：验证「Promise.all / allSettled / race / any 的差异和典型用法」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 Promise.all 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Promise.all：Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）。
- allSettled：Promise.allSettled(iter)：等所有都结束，永不 reject，返回 {status, value/reason}[]（批量上报）。
- race：Promise.race(iter)：最先 settle 的决定结果（超时控制）。

#### 风险与验收

- 主要风险：若 Promise.all 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Promise.all 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## promise-all-allsettled-race-any-followup-3

title: 追问：在「Promise.all / allSettled / race / any 的差异和典型用法」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 异步 拆分「Promise.all / allSettled / race / any 的差异和典型用法」的落地路径
difficulty: 进阶
tags: [异步, Promise, 追问]
parent: promise-all-allsettled-race-any
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Promise.all / allSettled / race / any 的差异和典型用法」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 异步 拆分「Promise.all / allSettled / race / any 的差异和典型用法」的落地路径？

### 答案要点

#### 直答

- 结论：先把 Promise.all 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「Promise.all / allSettled / race / any 的差异和典型用法」里的 Promise.all 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Promise.all：Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）。
- allSettled：Promise.allSettled(iter)：等所有都结束，永不 reject，返回 {status, value/reason}[]（批量上报）。
- race：Promise.race(iter)：最先 settle 的决定结果（超时控制）。

#### 风险与验收

- 主要风险：Promise.all 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：Promise.all 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## javascript-runtime-error-warroom

title: JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板
difficulty: 资深
tags: [异常治理, runtime, 决策沟通]
followups: [javascript-runtime-error-warroom-followup-1, javascript-runtime-error-warroom-followup-2, javascript-runtime-error-warroom-followup-3]

### 一句话

这题的高分关键是把 异常治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

发布后 15 分钟，前端 `TypeError` 与 `UnhandledPromiseRejection` 告警激增，业务指标开始下滑。你会如何组织战情室，在 20 分钟内完成影响判定和止损拍板？

### 答案要点

- 先分层判定影响：按路由、浏览器版本、用户人群分桶，避免单一错误数误导决策。
- 三路信号交叉确认：错误告警、关键事件失败率、业务转化波动要对齐看。
- 拍板条件提前定义：错误率阈值、影响用户规模、恢复 ETA 不达标就触发降级或回滚。
- 动作拆层执行：先止损（关高风险特性），再恢复（热修或回滚），最后补偿（客服/公告口径）。

#### 工程化补充

- 场景前提：落地 JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type RuntimeSignal = {
  jsFatalRate: number;
  promiseRejectRate: number;
  conversionDrop: number;
};

function shouldEmergencyRollback(s: RuntimeSignal) {
  return s.jsFatalRate > 0.008 || s.promiseRejectRate > 0.015 || s.conversionDrop > 0.03;
}
```

```yaml
runtime_incident_bridge:
  update_interval_min: 5
  required_fields:
    - impact_scope
    - current_action
    - next_observation_time
  rollback_rule:
    js_fatal_rate: '>= 0.8%'
    conversion_drop: '>= 3%'
```

### 追问

- 「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只盯错误条数，不看影响用户和关键路径是否受损。
- 技术结论无法转成业务可执行动作，导致“知道有问题但不敢拍板”。
- 故障恢复后不沉淀判定规则，下次仍需现场临时争论。

### 延伸

- 可将“错误影响分层”接入告警平台，自动给出建议动作等级。
- 建议沉淀“异常战情室模板”，降低跨团队沟通成本。

## javascript-polyfill-baseline-governance

title: JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略]
followups: [javascript-polyfill-baseline-governance-followup-1, javascript-polyfill-baseline-governance-followup-2, javascript-polyfill-baseline-governance-followup-3]

### 一句话

回答「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

团队想引入新语法特性并升级 Babel/构建目标，能改善开发体验，但担心低版本浏览器兼容与包体膨胀。你会如何制定 Polyfill 基线治理策略并推进发布？

### 答案要点

- 先定义浏览器基线：明确支持矩阵、最低版本和业务覆盖率，不用“感觉上都支持”。
- 语法升级分层：语法转译、运行时 polyfill、按需注入分别评估成本与风险。
- 预算联动发布闸门：升级后体积、解析耗时、关键指标超阈值要触发拦截或审批。
- 低版本路径要可验证：降级 bundle 与特性开关必须有自动回归和真机抽检。

#### 工程化补充

- 场景前提：JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type PolyfillPlan = {
  targetCoverage: number;
  bundleDeltaKb: number;
  parseTimeDeltaMs: number;
};

function canPromotePolyfill(p: PolyfillPlan) {
  return p.targetCoverage >= 0.95 && p.bundleDeltaKb <= 25 && p.parseTimeDeltaMs <= 40;
}
```

```yaml
polyfill_gate:
  require:
    - browser_baseline_matrix
    - bundle_delta_report
    - fallback_bundle_ready
  block_when:
    bundle_delta_kb: '> 25'
    parse_time_delta_ms: '> 40'
```

### 追问

- 「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看新语法收益，不看 polyfill 对包体和启动性能的持续影响。
- 兼容策略只写文档，不做低版本真实验证。
- 升级后不清理历史兼容代码，长期累积构建和维护负担。

### 延伸

- 可把 `browserslist` 变更纳入发布审查流程。
- 建议建立“兼容债务看板”，定期回收历史 polyfill 冗余。

## javascript-runtime-error-warroom-followup-1

title: 追问：运行时异常战情室上线前先验哪三件事
difficulty: 资深
tags: [异常治理, runtime, 决策沟通, 追问]
parent: javascript-runtime-error-warroom
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：运行时异常战情室真正落到线上前，你会先验哪三件事，确保故障来了不是临时拍脑袋？

### 答案要点

#### 直答

- 结论：先列出 影响分层 与 止损拍板 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：动作拆层执行：先止损（关高风险特性），再恢复（热修或回滚），最后补偿（客服/公告口径）。

#### 术语解释

- 异常治理：围绕「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里的 异常治理 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- runtime：在「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里，runtime 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 决策沟通：在「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里，决策沟通 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：影响分层 与 止损拍板 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 影响分层 与 止损拍板 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## javascript-runtime-error-warroom-followup-2

title: 追问：你会怎样证明异常治理闭环真的有效
difficulty: 资深
tags: [异常治理, runtime, 决策沟通, 追问]
parent: javascript-runtime-error-warroom
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说这个异常治理方案可落地，那你会怎样用测试、日志和线上指标证明它不是“看起来不错”？

### 答案要点

#### 直答

- 结论：先定「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：动作拆层执行：先止损（关高风险特性），再恢复（热修或回滚），最后补偿（客服/公告口径）。

#### 术语解释

- 异常治理：在「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里，异常治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- runtime：围绕「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里的 runtime 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 决策沟通：围绕「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里的 决策沟通 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：影响分层 与 止损拍板 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里，影响分层 与 止损拍板 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## javascript-runtime-error-warroom-followup-3

title: 追问：长期看哪些信号才知道战情室机制跑稳了
difficulty: 资深
tags: [异常治理, runtime, 决策沟通, 追问]
parent: javascript-runtime-error-warroom
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：这套战情室机制不是只应急一次就结束，你会长期跟踪哪些信号来判断它是否真的稳定有效？

### 答案要点

#### 直答

- 结论：先定义 影响分层 与 止损拍板 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：动作拆层执行：先止损（关高风险特性），再恢复（热修或回滚），最后补偿（客服/公告口径）。

#### 术语解释

- 异常治理：在「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里，异常治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- runtime：围绕「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里的 runtime 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 决策沟通：围绕「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里的 决策沟通 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」里，影响分层 与 止损拍板 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：影响分层 与 止损拍板 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## javascript-polyfill-baseline-governance-followup-1

title: 追问：语法升级评审时你先验哪些兼容边界
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略, 追问]
parent: javascript-polyfill-baseline-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：语法升级方案评审时，你会先检查哪些兼容边界，避免上线后低版本用户直接踩雷？

### 答案要点

#### 直答

- 结论：先让 兼容风险 与 发布闸门 走小流量灰度，观察成功率与告警，再决定是否继续扩量。
- 关键动作：兼容风险 与 发布闸门 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- 兼容治理：在「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里，兼容治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- polyfill：语法转译、运行时 polyfill、按需注入分别评估成本与风险。
- 发布策略：围绕「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里的 发布策略 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：兼容风险 与 发布闸门 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 兼容风险 与 发布闸门 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## javascript-polyfill-baseline-governance-followup-2

title: 追问：复盘语法升级时该拿哪些证据说服团队
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略, 追问]
parent: javascript-polyfill-baseline-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：复盘这次语法升级和 polyfill 治理，你会拿哪些关键证据向团队证明方案确实有效？

### 答案要点

#### 直答

- 结论：先约定「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先把「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里的 复盘这次语法升级 与 polyfill 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 兼容治理：围绕「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里的 兼容治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- polyfill：语法转译、运行时 polyfill、按需注入分别评估成本与风险。
- 发布策略：在「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里，发布策略 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：语法升级分层：语法转译、运行时 polyfill、按需注入分别评估成本与风险。
- 验收信号：在「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里，复盘这次语法升级 与 polyfill 至少要给一组指标阈值、一条日志证据和一组测试结果。

## javascript-polyfill-baseline-governance-followup-3

title: 追问：怎么量化语法升级的长期收益与维护成本
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略, 追问]
parent: javascript-polyfill-baseline-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：半年后回头看，你会怎么量化语法升级方案的长期收益和维护成本，判断这条路还值不值得继续？

### 答案要点

#### 直答

- 结论：评估 维护成本 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先拆分 维护成本 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 兼容治理：在「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里，兼容治理 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- polyfill：语法转译、运行时 polyfill、按需注入分别评估成本与风险。
- 发布策略：围绕「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」里的 发布策略 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 维护成本 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 维护成本 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。
