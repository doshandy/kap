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
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
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
- 实施步骤：先把 Promise 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
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
- 面试中不要只停留在「async/await 在事件循环里的真实执行顺序」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：回答 async/await 在事件循环里的真实执行顺序 时先锁定 async 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
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
- 面试中不要只停留在「手写防抖与节流」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：手写防抖与节流 只有在瓶颈被数据证实时才值得推进；先确认 手写 是否真是主耗时来源。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
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
- 实施步骤：先把 手写 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
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
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要交代事件循环影响、资源释放和错误恢复策略。
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
- 实施步骤：先把 内存 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
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
- 实施步骤：围绕 Proxy 与 Reflect：13 种 trap 与 receiver 正确性 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
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
- 实施步骤：先把 迭代器 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
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
- 实施步骤：先把 模板字符串 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
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
- 实施步骤：先把 对象 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
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
- 实施步骤：先把 异步 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
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
- 实施步骤：先把 数组 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
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
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
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
- 实施步骤：先把 手写 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
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

回答这题时，先给 原型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要让「原型链是什么？查找规则和终点」稳定上线，你会优先补齐哪些与 原型 相关的检查项？

### 答案要点

#### 直答

- 追问核心：说明「原型链是什么？查找规则和终点」上线时如何灰度、观测、回滚（对应追问：如果要让「原型链是什么？查找规则和终点」稳定上线，你会优先补齐哪些与 原型 相关的检查项）。
- 直接围绕「如果要让「原型链是什么？查找规则和终点」稳定上线，你会优先补齐哪些与 原型 相关的检查项」作答：每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找

#### 落地步骤

- 第一步：回答 原型链是什么？查找规则和终点 时先锁定 原型 的边界条件，避免把经验结论当成通用规则。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 原型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 原型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 原型 的可复现用例、线上监控指标和回退演练记录。

## this-binding-followup-1

title: 追问：把「this 指向的七种场景」放到真实业务里，围绕 this 最容易被低估的边界条件和前置约束是什么
difficulty: 基础
tags: [this, 函数, 追问]
parent: this-binding

### 一句话

回答这题时，先给 this 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：把「this 指向的七种场景」放到真实业务里，围绕 this 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 追问核心：围绕「this 指向的七种场景」给出可执行的落地方案，重点说明 this 怎么做（对应追问：把「this 指向的七种场景」放到真实业务里，围绕 this 最容易被低估的边界条件和前置约束是什么）。
- 直接围绕「把「this 指向的七种场景」放到真实业务里，围绕 this 最容易被低估的边界条件和前置约束是什么」作答：默认绑定：直接调用函数，非严格 globalThis，严格 undefined

#### 落地步骤

- 第一步：回答 this 指向的七种场景 时先锁定 this 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 this 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 this 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 this 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 this 的可复现用例、线上监控指标和回退演练记录。

## closure-followup-1

title: 追问：在真实业务里落地「闭包的定义、用途与陷阱」时，你会先排查哪些与 闭包 相关的边界假设
difficulty: 基础
tags: [闭包, 作用域, 追问]
parent: closure

### 一句话

回答这题时，先给 闭包 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在真实业务里落地「闭包的定义、用途与陷阱」时，你会先排查哪些与 闭包 相关的边界假设？

### 答案要点

#### 直答

- 追问核心：围绕「闭包的定义、用途与陷阱」给出可执行的落地方案，重点说明 闭包 怎么做（对应追问：在真实业务里落地「闭包的定义、用途与陷阱」时，你会先排查哪些与 闭包 相关的边界假设）。
- 直接围绕「在真实业务里落地「闭包的定义、用途与陷阱」时，你会先排查哪些与 闭包 相关的边界假设」作答：闭包 = 函数 + 它定义时的词法环境

#### 落地步骤

- 第一步：回答 闭包的定义、用途与陷阱 时先锁定 闭包 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 闭包 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 闭包 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 闭包 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 闭包 的可复现用例、线上监控指标和回退演练记录。

## event-loop-followup-1

title: 追问：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」做方案评审时，哪些 事件循环 边界输入最容易导致结论失真
difficulty: 进阶
tags: [事件循环, 异步, 追问]
parent: event-loop

### 一句话

回答这题时，先给 事件循环 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」做方案评审时，哪些 事件循环 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」给出可执行的落地方案，重点说明 事件循环 怎么做（对应追问：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」做方案评审时，哪些 事件循环 边界输入最容易导致结论失真）。
- 直接围绕「围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」做方案评审时，哪些 事件循环 边界输入最容易导致结论失真」作答：可以把浏览器主线程理解为反复执行：取一个 task（宏任务）→ 清空 microtask → 浏览器在合适时机执行渲染相关工作（其中可包含 requestAnimationFrame 回调）→ 进入下一轮

#### 落地步骤

- 第一步：讨论 浏览器事件循环：宏任务、微任务、RAF、IDLE 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：先把 事件循环 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 事件循环 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## promise-aplus-followup-1

title: 追问：真要把「手写一个符合 Promise/A+ 规范的 Promise」推到线上，你会如何围绕 Promise 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Promise, 异步, 手写, 追问]
parent: promise-aplus

### 一句话

回答这题时，先给 Promise 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：真要把「手写一个符合 Promise/A+ 规范的 Promise」推到线上，你会如何围绕 Promise 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「手写一个符合 Promise/A+ 规范的 Promise」上线时如何灰度、观测、回滚（对应追问：真要把「手写一个符合 Promise/A+ 规范的 Promise」推到线上，你会如何围绕 Promise 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「真要把「手写一个符合 Promise/A+ 规范的 Promise」推到线上，你会如何围绕 Promise 设计灰度节奏、回滚条件和迁移路径」作答：三态：pending / fulfilled / rejected，状态不可逆

#### 落地步骤

- 第一步：落地 手写一个符合 Promise/A+ 规范的 Promise 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 Promise 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## promise-aplus-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 Promise 把「手写一个符合 Promise/A+ 规范的 Promise」拆成几段推进，确保每段都能独立验收
difficulty: 进阶
tags: [Promise, 异步, 手写, 追问]
parent: promise-aplus

### 一句话

这道追问的关键是把 Promise 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 Promise 把「手写一个符合 Promise/A+ 规范的 Promise」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 追问核心：说明如何验证「手写一个符合 Promise/A+ 规范的 Promise」结论成立，给出 Promise 的验收路径（对应追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 Promise 把「手写一个符合 Promise/A+ 规范的 Promise」拆成几段推进，确保每段都能独立验收）。
- 直接围绕「在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 Promise 把「手写一个符合 Promise/A+ 规范的 Promise」拆成几段推进，确保每段都能独立验收」作答：三态：pending / fulfilled / rejected，状态不可逆

#### 落地步骤

- 第一步：回答 手写一个符合 Promise/A+ 规范的 Promise 时先锁定 Promise 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 Promise 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Promise 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Promise 的可复现用例、线上监控指标和回退演练记录。

## promise-aplus-followup-3

title: 追问：评估「手写一个符合 Promise/A+ 规范的 Promise」长期维护价值时，你最看重哪些稳定性和效率信号
difficulty: 进阶
tags: [Promise, 异步, 手写, 追问]
parent: promise-aplus

### 一句话

这道追问要直接回应「手写一个符合 Promise/A+ 规范的 Promise」在 Promise 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：评估「手写一个符合 Promise/A+ 规范的 Promise」长期维护价值时，你最看重哪些稳定性和效率信号？

### 答案要点

#### 直答

- 追问核心：围绕「手写一个符合 Promise/A+ 规范的 Promise」给出可执行的落地方案，重点说明 Promise 怎么做（对应追问：评估「手写一个符合 Promise/A+ 规范的 Promise」长期维护价值时，你最看重哪些稳定性和效率信号）。
- 直接围绕「评估「手写一个符合 Promise/A+ 规范的 Promise」长期维护价值时，你最看重哪些稳定性和效率信号」作答：三态：pending / fulfilled / rejected，状态不可逆

#### 落地步骤

- 第一步：先定义 手写一个符合 Promise/A+ 规范的 Promise 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 Promise 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Promise 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Promise 的可复现用例、线上监控指标和回退演练记录。

## async-await-followup-1

title: 追问：在「async/await 在事件循环里的真实执行顺序」进入长周期维护后，你会重点巡检哪些高风险边界点
difficulty: 进阶
tags: [async, 事件循环, 追问]
parent: async-await

### 一句话

回答这题时，先给 async 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「async/await 在事件循环里的真实执行顺序」进入长周期维护后，你会重点巡检哪些高风险边界点？

### 答案要点

#### 直答

- 追问核心：识别「async/await 在事件循环里的真实执行顺序」的高风险失败场景并给出兜底措施（对应追问：在「async/await 在事件循环里的真实执行顺序」进入长周期维护后，你会重点巡检哪些高风险边界点）。
- 直接围绕「在「async/await 在事件循环里的真实执行顺序」进入长周期维护后，你会重点巡检哪些高风险边界点」作答：async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise

#### 落地步骤

- 第一步：回答 async/await 在事件循环里的真实执行顺序 时先锁定 async 的边界条件，避免把经验结论当成通用规则。
- 第二步：围绕 async 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 async 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 async 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 async 的可复现用例、线上监控指标和回退演练记录。

## debounce-throttle-followup-1

title: 追问：以「手写防抖与节流」为例，你会先看哪些与 手写 相关的指标来判断「手写防抖与节流」是不是当前性能瓶颈
difficulty: 基础
tags: [手写, 性能, 追问]
parent: debounce-throttle

### 一句话

这道追问的关键是把 手写 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「手写防抖与节流」为例，你会先看哪些与 手写 相关的指标来判断「手写防抖与节流」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「手写防抖与节流」结论成立，给出 手写 的验收路径（对应追问：以「手写防抖与节流」为例，你会先看哪些与 手写 相关的指标来判断「手写防抖与节流」是不是当前性能瓶颈）。
- 直接围绕「以「手写防抖与节流」为例，你会先看哪些与 手写 相关的指标来判断「手写防抖与节流」是不是当前性能瓶颈」作答：防抖：N 毫秒内重复触发 → 重新计时，最后一次后才执行。场景：搜索输入、resize 后计算

#### 落地步骤

- 第一步：手写防抖与节流 只有在瓶颈被数据证实时才值得推进；先确认 手写 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 手写防抖与节流 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## debounce-throttle-followup-2

title: 追问：你会如何避免把「手写防抖与节流」的实验室提升误判为真实用户体验改善
difficulty: 基础
tags: [手写, 性能, 追问]
parent: debounce-throttle

### 一句话

这道追问要直接回应「手写防抖与节流」在 手写 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会如何避免把「手写防抖与节流」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 直答

- 追问核心：围绕「手写防抖与节流」给出可执行的落地方案，重点说明 手写 怎么做（对应追问：你会如何避免把「手写防抖与节流」的实验室提升误判为真实用户体验改善）。
- 直接围绕「你会如何避免把「手写防抖与节流」的实验室提升误判为真实用户体验改善」作答：防抖：N 毫秒内重复触发 → 重新计时，最后一次后才执行。场景：搜索输入、resize 后计算

#### 落地步骤

- 第一步：回答 手写防抖与节流 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 手写防抖与节流 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## debounce-throttle-followup-3

title: 追问：如果优化带来复杂度或兼容性成本，你会怎么评估「手写防抖与节流」是否值得做
difficulty: 基础
tags: [手写, 性能, 追问]
parent: debounce-throttle

### 一句话

回答这题时，先给 手写 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果优化带来复杂度或兼容性成本，你会怎么评估「手写防抖与节流」是否值得做？

### 答案要点

#### 直答

- 追问核心：比较「手写防抖与节流」在收益、成本和维护复杂度上的取舍边界（对应追问：如果优化带来复杂度或兼容性成本，你会怎么评估「手写防抖与节流」是否值得做）。
- 直接围绕「如果优化带来复杂度或兼容性成本，你会怎么评估「手写防抖与节流」是否值得做」作答：防抖：N 毫秒内重复触发 → 重新计时，最后一次后才执行。场景：搜索输入、resize 后计算

#### 落地步骤

- 第一步：手写防抖与节流 只有在瓶颈被数据证实时才值得推进；先确认 手写 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 手写防抖与节流 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## deep-clone-followup-1

title: 追问：如果要评估「深拷贝完整实现：循环引用、Symbol、特殊对象」的落地风险，你会优先检查哪些 手写 约束是否成立
difficulty: 进阶
tags: [手写, 对象, 追问]
parent: deep-clone

### 一句话

围绕「深拷贝完整实现：循环引用、Symbol、特殊对象」回答追问时，重点说清 手写 的前提、动作和回退条件。

### 题目

如果面试官追问：如果要评估「深拷贝完整实现：循环引用、Symbol、特殊对象」的落地风险，你会优先检查哪些 手写 约束是否成立？

### 答案要点

#### 直答

- 追问核心：识别「深拷贝完整实现：循环引用、Symbol、特殊对象」的高风险失败场景并给出兜底措施（对应追问：如果要评估「深拷贝完整实现：循环引用、Symbol、特殊对象」的落地风险，你会优先检查哪些 手写 约束是否成立）。
- 直接围绕「如果要评估「深拷贝完整实现：循环引用、Symbol、特殊对象」的落地风险，你会优先检查哪些 手写 约束是否成立」作答：用 WeakMap 记录已克隆对象避免循环引用

#### 落地步骤

- 第一步：先定义 深拷贝完整实现：循环引用、Symbol、特殊对象 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 手写 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 手写 的可复现用例、线上监控指标和回退演练记录。

## esm-vs-cjs-followup-1

title: 追问：从工程落地角度看，当「ESM 与 CommonJS 的差异、互操作与陷阱」进入复杂场景后，你会先验证哪些 模块化 前置条件，避免方案踩坑
difficulty: 进阶
tags: [模块化, Node, 追问]
parent: esm-vs-cjs

### 一句话

这道追问要直接回应「ESM 与 CommonJS 的差异、互操作与陷阱」在 模块化 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「ESM 与 CommonJS 的差异、互操作与陷阱」进入复杂场景后，你会先验证哪些 模块化 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 追问核心：说明如何验证「ESM 与 CommonJS 的差异、互操作与陷阱」结论成立，给出 模块化 的验收路径（对应追问：从工程落地角度看，当「ESM 与 CommonJS 的差异、互操作与陷阱」进入复杂场景后，你会先验证哪些 模块化 前置条件，避免方案踩坑）。
- 直接围绕「从工程落地角度看，当「ESM 与 CommonJS 的差异、互操作与陷阱」进入复杂场景后，你会先验证哪些 模块化 前置条件，避免方案踩坑」作答：ESM：静态分析、异步加载、export 是实时绑定（live binding），可被 tree-shaking

#### 落地步骤

- 第一步：ESM 与 CommonJS 的差异、互操作与陷阱 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 模块化 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## memory-leak-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 内存 相关的指标来判断「前端常见内存泄漏与排查」是不是当前性能瓶颈
difficulty: 进阶
tags: [内存, 性能, 追问]
parent: memory-leak

### 一句话

围绕「前端常见内存泄漏与排查」回答追问时，重点说清 内存 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 内存 相关的指标来判断「前端常见内存泄漏与排查」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端常见内存泄漏与排查」结论成立，给出 内存 的验收路径（对应追问：结合真实业务约束，你会先看哪些与 内存 相关的指标来判断「前端常见内存泄漏与排查」是不是当前性能瓶颈）。
- 直接围绕「结合真实业务约束，你会先看哪些与 内存 相关的指标来判断「前端常见内存泄漏与排查」是不是当前性能瓶颈」作答：未解绑的事件监听器（特别是 window/document）→ 组件销毁时 removeEventListener

#### 落地步骤

- 第一步：回答 前端常见内存泄漏与排查 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 内存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 前端常见内存泄漏与排查 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## memory-leak-followup-2

title: 追问：结合真实业务约束，你会怎样验证「前端常见内存泄漏与排查」的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [内存, 性能, 追问]
parent: memory-leak

### 一句话

回答这题时，先给 内存 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「前端常见内存泄漏与排查」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端常见内存泄漏与排查」结论成立，给出 内存 的验收路径（对应追问：结合真实业务约束，你会怎样验证「前端常见内存泄漏与排查」的优化收益在真实设备和真实网络下也成立）。
- 直接围绕「结合真实业务约束，你会怎样验证「前端常见内存泄漏与排查」的优化收益在真实设备和真实网络下也成立」作答：未解绑的事件监听器（特别是 window/document）→ 组件销毁时 removeEventListener

#### 落地步骤

- 第一步：前端常见内存泄漏与排查 只有在瓶颈被数据证实时才值得推进；先确认 内存 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 内存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 前端常见内存泄漏与排查 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## memory-leak-followup-3

title: 追问：以「前端常见内存泄漏与排查」为例，如果「前端常见内存泄漏与排查」在 内存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 进阶
tags: [内存, 性能, 追问]
parent: memory-leak

### 一句话

这道追问要直接回应「前端常见内存泄漏与排查」在 内存 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「前端常见内存泄漏与排查」为例，如果「前端常见内存泄漏与排查」在 内存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 直答

- 追问核心：围绕「前端常见内存泄漏与排查」给出可执行的落地方案，重点说明 内存 怎么做（对应追问：以「前端常见内存泄漏与排查」为例，如果「前端常见内存泄漏与排查」在 内存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损）。
- 直接围绕「以「前端常见内存泄漏与排查」为例，如果「前端常见内存泄漏与排查」在 内存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」作答：未解绑的事件监听器（特别是 window/document）→ 组件销毁时 removeEventListener

#### 落地步骤

- 第一步：回答 前端常见内存泄漏与排查 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 内存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 前端常见内存泄漏与排查 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## proxy-reflect-followup-1

title: 追问：如果要让「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」稳定上线，你会优先补齐哪些与 Proxy 相关的检查项
difficulty: 进阶
tags: [Proxy, 元编程, 追问]
parent: proxy-reflect

### 一句话

围绕「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」回答追问时，重点说清 Proxy 的前提、动作和回退条件。

### 题目

如果面试官追问：如果要让「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」稳定上线，你会优先补齐哪些与 Proxy 相关的检查项？

### 答案要点

#### 直答

- 追问核心：说明「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」上线时如何灰度、观测、回滚（对应追问：如果要让「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」稳定上线，你会优先补齐哪些与 Proxy 相关的检查项）。
- 直接围绕「如果要让「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」稳定上线，你会优先补齐哪些与 Proxy 相关的检查项」作答：Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...

#### 落地步骤

- 第一步：先定义 Proxy 与 Reflect：13 种 trap 与 receiver 正确性 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 Proxy 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Proxy 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Proxy 的可复现用例、线上监控指标和回退演练记录。

## iterator-generator-followup-1

title: 追问：当「迭代器、生成器与异步迭代」进入复杂场景后，你会先验证哪些 迭代器 前置条件，避免方案踩坑
difficulty: 进阶
tags: [迭代器, 生成器, 追问]
parent: iterator-generator

### 一句话

回答这题时，先给 迭代器 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：当「迭代器、生成器与异步迭代」进入复杂场景后，你会先验证哪些 迭代器 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 追问核心：说明如何验证「迭代器、生成器与异步迭代」结论成立，给出 迭代器 的验收路径（对应追问：当「迭代器、生成器与异步迭代」进入复杂场景后，你会先验证哪些 迭代器 前置条件，避免方案踩坑）。
- 直接围绕「当「迭代器、生成器与异步迭代」进入复杂场景后，你会先验证哪些 迭代器 前置条件，避免方案踩坑」作答：可迭代协议：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展

#### 落地步骤

- 第一步：回答 迭代器、生成器与异步迭代 时先锁定 迭代器 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 迭代器 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 迭代器 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 迭代器 的可复现用例、线上监控指标和回退演练记录。

## structured-clone-followup-1

title: 追问：面对真实流量和复杂依赖时，「结构化克隆 vs JSON 序列化」最可能被哪些 克隆 边界条件击穿
difficulty: 进阶
tags: [克隆, postMessage, 追问]
parent: structured-clone

### 一句话

回答这题时，先给 克隆 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「结构化克隆 vs JSON 序列化」最可能被哪些 克隆 边界条件击穿？

### 答案要点

#### 直答

- 追问核心：围绕「结构化克隆 vs JSON 序列化」给出可执行的落地方案，重点说明 克隆 怎么做（对应追问：面对真实流量和复杂依赖时，「结构化克隆 vs JSON 序列化」最可能被哪些 克隆 边界条件击穿）。
- 直接围绕「面对真实流量和复杂依赖时，「结构化克隆 vs JSON 序列化」最可能被哪些 克隆 边界条件击穿」作答：JSON：丢失 undefined / function / Symbol / Date / RegExp / Map / Set / BigInt / 循环引用

#### 落地步骤

- 第一步：回答 结构化克隆 vs JSON 序列化 时先锁定 克隆 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 克隆 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 克隆 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 克隆 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 克隆 的可复现用例、线上监控指标和回退演练记录。

## tagged-template-literal-followup-1

title: 追问：在「模板字符串与标签模板的实战」进入长周期维护后，你会重点巡检哪些与 模板字符串 相关的高风险边界点
difficulty: 进阶
tags: [模板字符串, 标签模板, 追问]
parent: tagged-template-literal

### 一句话

这道追问要直接回应「模板字符串与标签模板的实战」在 模板字符串 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「模板字符串与标签模板的实战」进入长周期维护后，你会重点巡检哪些与 模板字符串 相关的高风险边界点？

### 答案要点

#### 直答

- 追问核心：识别「模板字符串与标签模板的实战」的高风险失败场景并给出兜底措施（对应追问：在「模板字符串与标签模板的实战」进入长周期维护后，你会重点巡检哪些与 模板字符串 相关的高风险边界点）。
- 直接围绕「在「模板字符串与标签模板的实战」进入长周期维护后，你会重点巡检哪些与 模板字符串 相关的高风险边界点」作答：语法：tag 函数收到 (strings: TemplateStringsArray, ...values: unknown[])

#### 落地步骤

- 第一步：先定义 模板字符串与标签模板的实战 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 模板字符串 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 模板字符串 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 模板字符串 的可复现用例、线上监控指标和回退演练记录。

## weak-collection-followup-1

title: 追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，在真实业务里落地「WeakMap / WeakSet / WeakRef 与垃圾回收」时，你会先排查哪些与 WeakMap 相关的边界假设
difficulty: 资深
tags: [WeakMap, GC, 追问]
parent: weak-collection

### 一句话

回答这题时，先给 WeakMap 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，在真实业务里落地「WeakMap / WeakSet / WeakRef 与垃圾回收」时，你会先排查哪些与 WeakMap 相关的边界假设？

### 答案要点

#### 直答

- 追问核心：围绕「WeakMap / WeakSet / WeakRef 与垃圾回收」给出可执行的落地方案，重点说明 WeakMap 怎么做（对应追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，在真实业务里落地「WeakMap / WeakSet / WeakRef 与垃圾回收」时，你会先排查哪些与 WeakMap 相关的边界假设）。
- 直接围绕「以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，在真实业务里落地「WeakMap / WeakSet / WeakRef 与垃圾回收」时，你会先排查哪些与 WeakMap 相关的边界假设」作答：普通 Map 强引用 key，被 Map 持有的 key 不会因为外部引用消失就自动释放，容易内存泄漏

#### 落地步骤

- 第一步：回答 WeakMap / WeakSet / WeakRef 与垃圾回收 时先锁定 WeakMap 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 WeakMap 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 WeakMap 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 WeakMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 WeakMap 的可复现用例、线上监控指标和回退演练记录。

## bind-call-apply-followup-1

title: 追问：你会如何识别「bind / call / apply 的区别与手写实现」在生产环境中最容易失效的 this 边界因素
difficulty: 进阶
tags: [this, 函数, 追问]
parent: bind-call-apply

### 一句话

这道追问的关键是把 this 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：你会如何识别「bind / call / apply 的区别与手写实现」在生产环境中最容易失效的 this 边界因素？

### 答案要点

#### 直答

- 追问核心：围绕「bind / call / apply 的区别与手写实现」给出可执行的落地方案，重点说明 this 怎么做（对应追问：你会如何识别「bind / call / apply 的区别与手写实现」在生产环境中最容易失效的 this 边界因素）。
- 直接围绕「你会如何识别「bind / call / apply 的区别与手写实现」在生产环境中最容易失效的 this 边界因素」作答：call(thisArg, ...args)：立即调用，参数依次传

#### 落地步骤

- 第一步：回答 bind / call / apply 的区别与手写实现 时先锁定 this 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 this 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 this 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 this 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 this 的可复现用例、线上监控指标和回退演练记录。

## new-operator-followup-1

title: 追问：你会如何识别「new 操作符做了哪些事，怎么手写」在生产环境中最容易失效的 对象 边界因素
difficulty: 进阶
tags: [对象, 函数, 追问]
parent: new-operator

### 一句话

这道追问要直接回应「new 操作符做了哪些事，怎么手写」在 对象 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会如何识别「new 操作符做了哪些事，怎么手写」在生产环境中最容易失效的 对象 边界因素？

### 答案要点

#### 直答

- 追问核心：围绕「new 操作符做了哪些事，怎么手写」给出可执行的落地方案，重点说明 对象 怎么做（对应追问：你会如何识别「new 操作符做了哪些事，怎么手写」在生产环境中最容易失效的 对象 边界因素）。
- 直接围绕「你会如何识别「new 操作符做了哪些事，怎么手写」在生产环境中最容易失效的 对象 边界因素」作答：创建一个空对象 obj

#### 落地步骤

- 第一步：先定义 new 操作符做了哪些事，怎么手写 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 对象 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 对象 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 对象 的可复现用例、线上监控指标和回退演练记录。

## promise-all-allsettled-race-any-followup-1

title: 追问：面对真实流量和复杂依赖时，「Promise.all / allSettled / race / any 的差异和典型用法」最可能被哪些 异步 边界条件击穿
difficulty: 进阶
tags: [异步, Promise, 追问]
parent: promise-all-allsettled-race-any

### 一句话

这道追问要直接回应「Promise.all / allSettled / race / any 的差异和典型用法」在 异步 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「Promise.all / allSettled / race / any 的差异和典型用法」最可能被哪些 异步 边界条件击穿？

### 答案要点

#### 直答

- 追问核心：围绕「Promise.all / allSettled / race / any 的差异和典型用法」给出可执行的落地方案，重点说明 异步 怎么做（对应追问：面对真实流量和复杂依赖时，「Promise.all / allSettled / race / any 的差异和典型用法」最可能被哪些 异步 边界条件击穿）。
- 直接围绕「面对真实流量和复杂依赖时，「Promise.all / allSettled / race / any 的差异和典型用法」最可能被哪些 异步 边界条件击穿」作答：Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）

#### 落地步骤

- 第一步：先定义 Promise.all / allSettled / race / any 的差异和典型用法 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 异步 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 异步 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 异步 的可复现用例、线上监控指标和回退演练记录。

## flatten-array-followup-1

title: 追问：你会如何围绕 数组 提前识别「数组扁平化的多种实现」中的复杂度陷阱，避免实现后期返工
difficulty: 基础
tags: [数组, 手写, 追问]
parent: flatten-array

### 一句话

围绕「数组扁平化的多种实现」回答追问时，重点说清 数组 的前提、动作和回退条件。

### 题目

如果面试官追问：你会如何围绕 数组 提前识别「数组扁平化的多种实现」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 追问核心：围绕「数组扁平化的多种实现」给出可执行的落地方案，重点说明 数组 怎么做（对应追问：你会如何围绕 数组 提前识别「数组扁平化的多种实现」中的复杂度陷阱，避免实现后期返工）。
- 直接围绕「你会如何围绕 数组 提前识别「数组扁平化的多种实现」中的复杂度陷阱，避免实现后期返工」作答：ES2019 内置 arr.flat(Infinity)：最简洁，可指定深度

#### 落地步骤

- 第一步：先声明输入规模和内存预算，再讨论 数组扁平化的多种实现；复杂度边界不清会导致方案失真。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 数组 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

## event-emitter-followup-1

title: 追问：结合真实业务约束，真要把「手写一个 EventEmitter（订阅发布）」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径
difficulty: 基础
tags: [设计模式, 手写, 追问]
parent: event-emitter

### 一句话

这道追问的关键是把 设计模式 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，真要把「手写一个 EventEmitter（订阅发布）」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「手写一个 EventEmitter（订阅发布）」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，真要把「手写一个 EventEmitter（订阅发布）」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「结合真实业务约束，真要把「手写一个 EventEmitter（订阅发布）」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径」作答：on(event, fn) 把 fn 放进对应事件的数组里

#### 落地步骤

- 第一步：落地 手写一个 EventEmitter（订阅发布） 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 设计模式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## debounce-immediate-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 手写 相关的指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈
difficulty: 进阶
tags: [手写, 性能, 追问]
parent: debounce-immediate

### 一句话

这道追问要直接回应「防抖（debounce）的 immediate 模式怎么实现」在 手写 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 手写 相关的指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「防抖（debounce）的 immediate 模式怎么实现」结论成立，给出 手写 的验收路径（对应追问：在当前团队与业务约束下，你会先看哪些与 手写 相关的指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈）。
- 直接围绕「在当前团队与业务约束下，你会先看哪些与 手写 相关的指标来判断「防抖（debounce）的 immediate 模式怎么实现」是不是当前性能瓶颈」作答：内部维护一个定时器 id 和最后一次调用的参数

#### 落地步骤

- 第一步：回答 防抖（debounce）的 immediate 模式怎么实现 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 防抖（debounce）的 immediate 模式怎么实现 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## prototype-chain-followup-2

title: 追问：在当前团队与业务约束下，修改原型链为什么是性能反模式
difficulty: 基础
tags: [原型, 继承, 追问]
parent: prototype-chain
generated: followup-script

### 一句话

围绕「原型链是什么？查找规则和终点」回答追问时，重点说清 原型 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，修改原型链（`Object.setPrototypeOf`）为什么是性能反模式？

### 答案要点

#### 直答

- 追问核心：解释「原型链是什么？查找规则和终点」背后的因果关系，并指出 原型 的触发条件（对应追问：在当前团队与业务约束下，修改原型链（Object.setPrototypeOf）为什么是性能反模式）。
- 直接围绕「在当前团队与业务约束下，修改原型链（Object.setPrototypeOf）为什么是性能反模式」作答：每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找

#### 落地步骤

- 第一步：回答 原型链是什么？查找规则和终点 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 原型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 原型链是什么？查找规则和终点 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## prototype-chain-followup-3

title: 追问：ES6 class 和原型继承能 100% 等价吗？类字段、私有字段有什么不同
difficulty: 基础
tags: [原型, 继承, 追问]
parent: prototype-chain
generated: followup-script

### 一句话

这道追问的关键是把 原型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：ES6 `class` 和原型继承能 100% 等价吗？类字段、私有字段（`#x`）有什么不同？

### 答案要点

#### 直答

- 追问核心：围绕「原型链是什么？查找规则和终点」给出可执行的落地方案，重点说明 原型 怎么做（对应追问：ES6 class 和原型继承能 100% 等价吗？类字段、私有字段（#x）有什么不同）。
- 直接围绕「ES6 class 和原型继承能 100% 等价吗？类字段、私有字段（#x）有什么不同」作答：每个对象都有内部槽 [[Prototype]]，访问属性时若自身不存在则沿原型链向上查找

#### 落地步骤

- 第一步：回答 原型链是什么？查找规则和终点 时先锁定 原型 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 原型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 原型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 原型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 原型 的可复现用例、线上监控指标和回退演练记录。

## this-binding-followup-2

title: 追问：bind 之后还能再 bind 吗？再调用 call 呢
difficulty: 基础
tags: [this, 函数, 追问]
parent: this-binding
generated: followup-script

### 一句话

这道追问要直接回应「this 指向的七种场景」在 this 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：bind 之后还能再 bind 吗？再调用 call 呢？

### 答案要点

#### 直答

- 追问核心：围绕「this 指向的七种场景」给出可执行的落地方案，重点说明 this 怎么做（对应追问：bind 之后还能再 bind 吗？再调用 call 呢）。
- 直接围绕「bind 之后还能再 bind 吗？再调用 call 呢」作答：默认绑定：直接调用函数，非严格 globalThis，严格 undefined

#### 落地步骤

- 第一步：先定义 this 指向的七种场景 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 this 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 this 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 this 的可复现用例、线上监控指标和回退演练记录。

## this-binding-followup-3

title: 追问：以「this 指向的七种场景」为例，严格模式下默认绑定的 this 是什么？为什么这么设计
difficulty: 基础
tags: [this, 函数, 追问]
parent: this-binding
generated: followup-script

### 一句话

这道追问的关键是把 this 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「this 指向的七种场景」为例，严格模式下默认绑定的 this 是什么？为什么这么设计？

### 答案要点

#### 直答

- 追问核心：解释「this 指向的七种场景」背后的因果关系，并指出 this 的触发条件（对应追问：以「this 指向的七种场景」为例，严格模式下默认绑定的 this 是什么？为什么这么设计）。
- 直接围绕「以「this 指向的七种场景」为例，严格模式下默认绑定的 this 是什么？为什么这么设计」作答：默认绑定：直接调用函数，非严格 globalThis，严格 undefined

#### 落地步骤

- 第一步：回答 this 指向的七种场景 时先锁定 this 的边界条件，避免把经验结论当成通用规则。
- 第二步：围绕 this 指向的七种场景 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 this 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 this 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 this 的可复现用例、线上监控指标和回退演练记录。

## closure-followup-2

title: 追问：模块模式现在还需要靠闭包吗？ESM 是否替代了它
difficulty: 基础
tags: [闭包, 作用域, 追问]
parent: closure
generated: followup-script

### 一句话

围绕「闭包的定义、用途与陷阱」回答追问时，重点说清 闭包 的前提、动作和回退条件。

### 题目

如果面试官追问：模块模式（私有变量）现在还需要靠闭包吗？ESM 是否替代了它？

### 答案要点

#### 直答

- 追问核心：围绕「闭包的定义、用途与陷阱」给出可执行的落地方案，重点说明 闭包 怎么做（对应追问：模块模式（私有变量）现在还需要靠闭包吗？ESM 是否替代了它）。
- 直接围绕「模块模式（私有变量）现在还需要靠闭包吗？ESM 是否替代了它」作答：闭包 = 函数 + 它定义时的词法环境

#### 落地步骤

- 第一步：先定义 闭包的定义、用途与陷阱 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 闭包 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 闭包 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 闭包 的可复现用例、线上监控指标和回退演练记录。

## event-loop-followup-2

title: 追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，queueMicrotask、Promise.resolve.then 哪个先执行
difficulty: 进阶
tags: [事件循环, 异步, 追问]
parent: event-loop
generated: followup-script

### 一句话

这道追问要直接回应「浏览器事件循环：宏任务、微任务、RAF、IDLE」在 事件循环 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，`queueMicrotask`、`Promise.resolve().then` 哪个先执行？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」给出可执行的落地方案，重点说明 事件循环 怎么做（对应追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，queueMicrotask、Promise.resolve().then 哪个先执行）。
- 直接围绕「在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，queueMicrotask、Promise.resolve().then 哪个先执行」作答：可以把浏览器主线程理解为反复执行：取一个 task（宏任务）→ 清空 microtask → 浏览器在合适时机执行渲染相关工作（其中可包含 requestAnimationFrame 回调）→ 进入下一轮

#### 落地步骤

- 第一步：先说明浏览器调度与渲染阶段，再讲 浏览器事件循环：宏任务、微任务、RAF、IDLE，否则容易把现象当结论。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 事件循环 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## event-loop-followup-3

title: 追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，async/await 在 Event Loop 中的实际表现
difficulty: 进阶
tags: [事件循环, 异步, 追问]
parent: event-loop
generated: followup-script

### 一句话

这道追问的关键是把 事件循环 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，async/await 在 Event Loop 中的实际表现（每个 await 等价于一次微任务调度）？

### 答案要点

#### 直答

- 追问核心：围绕「浏览器事件循环：宏任务、微任务、RAF、IDLE」给出可执行的落地方案，重点说明 事件循环 怎么做（对应追问：在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，async/await 在 Event Loop 中的实际表现（每个 await 等价于一次微任务调度））。
- 直接围绕「在「浏览器事件循环：宏任务、微任务、RAF、IDLE」场景下，async/await 在 Event Loop 中的实际表现（每个 await 等价于一次微任务调度）」作答：可以把浏览器主线程理解为反复执行：取一个 task（宏任务）→ 清空 microtask → 浏览器在合适时机执行渲染相关工作（其中可包含 requestAnimationFrame 回调）→ 进入下一轮

#### 落地步骤

- 第一步：讨论 浏览器事件循环：宏任务、微任务、RAF、IDLE 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：先把 事件循环 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 事件循环 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## deep-clone-followup-2

title: 追问：结合真实业务约束，拷贝一个含 DOM 节点的对象会怎样
difficulty: 进阶
tags: [手写, 对象, 追问]
parent: deep-clone
generated: followup-script

### 一句话

这道追问的关键是把 手写 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，拷贝一个含 DOM 节点的对象会怎样？

### 答案要点

#### 直答

- 追问核心：围绕「深拷贝完整实现：循环引用、Symbol、特殊对象」给出可执行的落地方案，重点说明 手写 怎么做（对应追问：结合真实业务约束，拷贝一个含 DOM 节点的对象会怎样）。
- 直接围绕「结合真实业务约束，拷贝一个含 DOM 节点的对象会怎样」作答：用 WeakMap 记录已克隆对象避免循环引用

#### 落地步骤

- 第一步：讨论 深拷贝完整实现：循环引用、Symbol、特殊对象 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：先把 手写 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## deep-clone-followup-3

title: 追问：以「深拷贝完整实现：循环引用、Symbol、特殊对象」为例，写一个支持循环引用的简易深拷贝
difficulty: 进阶
tags: [手写, 对象, 追问]
parent: deep-clone
generated: followup-script

### 一句话

这道追问要直接回应「深拷贝完整实现：循环引用、Symbol、特殊对象」在 手写 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「深拷贝完整实现：循环引用、Symbol、特殊对象」为例，写一个支持循环引用的简易深拷贝（用 WeakMap 备忘）？

### 答案要点

#### 直答

- 追问核心：围绕「深拷贝完整实现：循环引用、Symbol、特殊对象」给出可执行的落地方案，重点说明 手写 怎么做（对应追问：以「深拷贝完整实现：循环引用、Symbol、特殊对象」为例，写一个支持循环引用的简易深拷贝（用 WeakMap 备忘））。
- 直接围绕「以「深拷贝完整实现：循环引用、Symbol、特殊对象」为例，写一个支持循环引用的简易深拷贝（用 WeakMap 备忘）」作答：用 WeakMap 记录已克隆对象避免循环引用

#### 落地步骤

- 第一步：先定义 深拷贝完整实现：循环引用、Symbol、特殊对象 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 手写 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 手写 的可复现用例、线上监控指标和回退演练记录。

## esm-vs-cjs-followup-2

title: 追问：在「ESM 与 CommonJS 的差异、互操作与陷阱」场景下，import 一个 CJS 模块时 default 怎么映射
difficulty: 进阶
tags: [模块化, Node, 追问]
parent: esm-vs-cjs
generated: followup-script

### 一句话

围绕「ESM 与 CommonJS 的差异、互操作与陷阱」回答追问时，重点说清 模块化 的前提、动作和回退条件。

### 题目

如果面试官追问：在「ESM 与 CommonJS 的差异、互操作与陷阱」场景下，import 一个 CJS 模块时 default 怎么映射？

### 答案要点

#### 直答

- 追问核心：围绕「ESM 与 CommonJS 的差异、互操作与陷阱」给出可执行的落地方案，重点说明 模块化 怎么做（对应追问：在「ESM 与 CommonJS 的差异、互操作与陷阱」场景下，import 一个 CJS 模块时 default 怎么映射）。
- 直接围绕「在「ESM 与 CommonJS 的差异、互操作与陷阱」场景下，import 一个 CJS 模块时 default 怎么映射」作答：ESM：静态分析、异步加载、export 是实时绑定（live binding），可被 tree-shaking

#### 落地步骤

- 第一步：先约定 Node 运行时版本和事件循环语义，再回答 ESM 与 CommonJS 的差异、互操作与陷阱 的差异点。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要交代事件循环影响、资源释放和错误恢复策略。
- 第三步：如果 模块化 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是事件循环阻塞与资源未释放，导致吞吐退化。
- 验收信号：验收至少看事件循环延迟、吞吐和资源占用趋势。

## esm-vs-cjs-followup-3

title: 追问：Node 怎么决定 .js 是 ESM 还是 CJS
difficulty: 进阶
tags: [模块化, Node, 追问]
parent: esm-vs-cjs
generated: followup-script

### 一句话

这道追问的关键是把 模块化 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：Node 怎么决定 `.js` 是 ESM 还是 CJS（package.json 的 type 字段、`.mjs`）？

### 答案要点

#### 直答

- 追问核心：围绕「ESM 与 CommonJS 的差异、互操作与陷阱」给出可执行的落地方案，重点说明 模块化 怎么做（对应追问：Node 怎么决定 .js 是 ESM 还是 CJS（package.json 的 type 字段、.mjs））。
- 直接围绕「Node 怎么决定 .js 是 ESM 还是 CJS（package.json 的 type 字段、.mjs）」作答：ESM：静态分析、异步加载、export 是实时绑定（live binding），可被 tree-shaking

#### 落地步骤

- 第一步：回答 ESM 与 CommonJS 的差异、互操作与陷阱 时要明确 模块化 在高并发和错误恢复下的表现。
- 第二步：先把 模块化 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要交代事件循环影响、资源释放和错误恢复策略。
- 第三步：如果 模块化 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是事件循环阻塞与资源未释放，导致吞吐退化。
- 验收信号：验收至少看事件循环延迟、吞吐和资源占用趋势。

## flatten-array-followup-2

title: 追问：以「数组扁平化的多种实现」为例，如果数据规模扩大一个数量级，你会如何围绕 数组 调整数据结构或算法
difficulty: 基础
tags: [数组, 手写, 追问]
parent: flatten-array
generated: followup-script

### 一句话

这道追问的关键是把 数组 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「数组扁平化的多种实现」为例，如果数据规模扩大一个数量级，你会如何围绕 数组 调整数据结构或算法？

### 答案要点

#### 直答

- 追问核心：围绕「数组扁平化的多种实现」给出可执行的落地方案，重点说明 数组 怎么做（对应追问：以「数组扁平化的多种实现」为例，如果数据规模扩大一个数量级，你会如何围绕 数组 调整数据结构或算法）。
- 直接围绕「以「数组扁平化的多种实现」为例，如果数据规模扩大一个数量级，你会如何围绕 数组 调整数据结构或算法」作答：ES2019 内置 arr.flat(Infinity)：最简洁，可指定深度

#### 落地步骤

- 第一步：回答 数组扁平化的多种实现 时要说明 数组 在极端输入下的行为，不要只给样例路径。
- 第二步：先把 数组 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 数组 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

## flatten-array-followup-3

title: 追问：如果要让「数组扁平化的多种实现」的正确性可复核，你会围绕 数组 设计哪些验证步骤
difficulty: 基础
tags: [数组, 手写, 追问]
parent: flatten-array
generated: followup-script

### 一句话

这道追问要直接回应「数组扁平化的多种实现」在 数组 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：如果要让「数组扁平化的多种实现」的正确性可复核，你会围绕 数组 设计哪些验证步骤？

### 答案要点

#### 直答

- 追问核心：说明如何验证「数组扁平化的多种实现」结论成立，给出 数组 的验收路径（对应追问：如果要让「数组扁平化的多种实现」的正确性可复核，你会围绕 数组 设计哪些验证步骤）。
- 直接围绕「如果要让「数组扁平化的多种实现」的正确性可复核，你会围绕 数组 设计哪些验证步骤」作答：ES2019 内置 arr.flat(Infinity)：最简洁，可指定深度

#### 落地步骤

- 第一步：先声明输入规模和内存预算，再讨论 数组扁平化的多种实现；复杂度边界不清会导致方案失真。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 数组 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

## event-emitter-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 设计模式 规划「手写一个 EventEmitter」的阶段目标与交付边界
difficulty: 基础
tags: [设计模式, 手写, 追问]
parent: event-emitter
generated: followup-script

### 一句话

这道追问要直接回应「手写一个 EventEmitter（订阅发布）」在 设计模式 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 设计模式 规划「手写一个 EventEmitter」的阶段目标与交付边界？

### 答案要点

#### 直答

- 追问核心：比较「手写一个 EventEmitter（订阅发布）」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 设计模式 规划「手写一个 EventEmitter」的阶段目标与交付边界）。
- 直接围绕「从工程落地角度看，面对跨团队协作成本，你会如何围绕 设计模式 规划「手写一个 EventEmitter」的阶段目标与交付边界」作答：on(event, fn) 把 fn 放进对应事件的数组里

#### 落地步骤

- 第一步：手写一个 EventEmitter（订阅发布） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 设计模式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## event-emitter-followup-3

title: 追问：在当前团队与业务约束下，为了确认「手写一个 EventEmitter」在 设计模式 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 基础
tags: [设计模式, 手写, 追问]
parent: event-emitter
generated: followup-script

### 一句话

回答这题时，先给 设计模式 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「手写一个 EventEmitter」在 设计模式 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 追问核心：围绕「手写一个 EventEmitter（订阅发布）」给出可执行的落地方案，重点说明 设计模式 怎么做（对应追问：在当前团队与业务约束下，为了确认「手写一个 EventEmitter」在 设计模式 上能持续跑稳，你会长期追哪些稳定性和效率信号）。
- 直接围绕「在当前团队与业务约束下，为了确认「手写一个 EventEmitter」在 设计模式 上能持续跑稳，你会长期追哪些稳定性和效率信号」作答：on(event, fn) 把 fn 放进对应事件的数组里

#### 落地步骤

- 第一步：落地 手写一个 EventEmitter（订阅发布） 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 设计模式 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 设计模式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## debounce-immediate-followup-2

title: 追问：围绕「防抖（debounce）的 immediate 模式怎么实现」上线效果，你会优先看哪些和 手写 相关的真实用户指标来佐证体验提升
difficulty: 进阶
tags: [手写, 性能, 追问]
parent: debounce-immediate
generated: followup-script

### 一句话

回答这题时，先给 手写 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：围绕「防抖（debounce）的 immediate 模式怎么实现」上线效果，你会优先看哪些和 手写 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 直答

- 追问核心：说明如何验证「防抖（debounce）的 immediate 模式怎么实现」结论成立，给出 手写 的验收路径（对应追问：围绕「防抖（debounce）的 immediate 模式怎么实现」上线效果，你会优先看哪些和 手写 相关的真实用户指标来佐证体验提升）。
- 直接围绕「围绕「防抖（debounce）的 immediate 模式怎么实现」上线效果，你会优先看哪些和 手写 相关的真实用户指标来佐证体验提升」作答：内部维护一个定时器 id 和最后一次调用的参数

#### 落地步骤

- 第一步：防抖（debounce）的 immediate 模式怎么实现 只有在瓶颈被数据证实时才值得推进；先确认 手写 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 防抖（debounce）的 immediate 模式怎么实现 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## debounce-immediate-followup-3

title: 追问：结合真实业务约束，如果「防抖的 immediate 模式怎么实现」在 手写实现 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [手写, 性能, 追问]
parent: debounce-immediate
generated: followup-script

### 一句话

围绕「防抖（debounce）的 immediate 模式怎么实现」回答追问时，重点说清 手写 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果「防抖的 immediate 模式怎么实现」在 手写实现 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 追问核心：比较「防抖（debounce）的 immediate 模式怎么实现」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，如果「防抖的 immediate 模式怎么实现」在 手写实现 上的收益和维护成本打架，你会怎么做取舍判断）。
- 直接围绕「结合真实业务约束，如果「防抖的 immediate 模式怎么实现」在 手写实现 上的收益和维护成本打架，你会怎么做取舍判断」作答：内部维护一个定时器 id 和最后一次调用的参数

#### 落地步骤

- 第一步：回答 防抖（debounce）的 immediate 模式怎么实现 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 手写 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 防抖（debounce）的 immediate 模式怎么实现 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## async-await-followup-2

title: 追问：以「async/await 在事件循环里的真实执行顺序」为例，如果要让结论在 async 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [async, 事件循环, 追问]
parent: async-await
generated: followup-script

### 一句话

这道追问要直接回应「async/await 在事件循环里的真实执行顺序」在 async 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「async/await 在事件循环里的真实执行顺序」为例，如果要让结论在 async 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「async/await 在事件循环里的真实执行顺序」结论成立，给出 async 的验收路径（对应追问：以「async/await 在事件循环里的真实执行顺序」为例，如果要让结论在 async 上可复核，你会怎样安排测试、日志和指标的组合验证）。
- 直接围绕「以「async/await 在事件循环里的真实执行顺序」为例，如果要让结论在 async 上可复核，你会怎样安排测试、日志和指标的组合验证」作答：async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise

#### 落地步骤

- 第一步：回答 async/await 在事件循环里的真实执行顺序 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 async 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## async-await-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 async 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [async, 事件循环, 追问]
parent: async-await
generated: followup-script

### 一句话

这道追问要直接回应「async/await 在事件循环里的真实执行顺序」在 async 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 async 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 追问核心：围绕「async/await 在事件循环里的真实执行顺序」给出可执行的落地方案，重点说明 async 怎么做（对应追问：从工程落地角度看，遇到约束变化时，你会如何围绕 async 拆分方案演进路径，而不是一次性推翻重来）。
- 直接围绕「从工程落地角度看，遇到约束变化时，你会如何围绕 async 拆分方案演进路径，而不是一次性推翻重来」作答：async 函数本身是同步开始执行，遇到 await 时挂起当前函数，返回一个未完成的 Promise

#### 落地步骤

- 第一步：async/await 在事件循环里的真实执行顺序 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 async 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## proxy-reflect-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 Proxy 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [Proxy, 元编程, 追问]
parent: proxy-reflect
generated: followup-script

### 一句话

回答这题时，先给 Proxy 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 Proxy 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」结论成立，给出 Proxy 的验收路径（对应追问：在当前团队与业务约束下，为了证明这个方案在 Proxy 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在当前团队与业务约束下，为了证明这个方案在 Proxy 维度有效，你会怎么设计测试闭环和线上观测指标」作答：Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...

#### 落地步骤

- 第一步：Proxy 与 Reflect：13 种 trap 与 receiver 正确性 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Proxy。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Proxy 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## proxy-reflect-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里和 Proxy 相关的哪些环节
difficulty: 进阶
tags: [Proxy, 元编程, 追问]
parent: proxy-reflect
generated: followup-script

### 一句话

围绕「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」回答追问时，重点说清 Proxy 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里和 Proxy 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里和 Proxy 相关的哪些环节）。
- 直接围绕「结合真实业务约束，当约束变化导致成本上升时，你会先优化「Proxy 与 Reflect：13 种 trap 与 receiver 正确性」里和 Proxy 相关的哪些环节」作答：Proxy 拦截 13 种基本操作：get/set/has/deleteProperty/ownKeys/...

#### 落地步骤

- 第一步：回答 Proxy 与 Reflect：13 种 trap 与 receiver 正确性 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 Proxy 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Proxy 与 Reflect：13 种 trap 与 receiver 正确性 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## iterator-generator-followup-2

title: 追问：从工程落地角度看，你会如何围绕 迭代器 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [迭代器, 生成器, 追问]
parent: iterator-generator
generated: followup-script

### 一句话

回答这题时，先给 迭代器 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 迭代器 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 追问核心：说明如何验证「迭代器、生成器与异步迭代」结论成立，给出 迭代器 的验收路径（对应追问：从工程落地角度看，你会如何围绕 迭代器 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖）。
- 直接围绕「从工程落地角度看，你会如何围绕 迭代器 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」作答：可迭代协议：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展

#### 落地步骤

- 第一步：落地 迭代器、生成器与异步迭代 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 迭代器 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## iterator-generator-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「迭代器、生成器与异步迭代」里和 迭代器 相关的哪些环节
difficulty: 进阶
tags: [迭代器, 生成器, 追问]
parent: iterator-generator
generated: followup-script

### 一句话

回答这题时，先给 迭代器 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「迭代器、生成器与异步迭代」里和 迭代器 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「迭代器、生成器与异步迭代」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「迭代器、生成器与异步迭代」里和 迭代器 相关的哪些环节）。
- 直接围绕「结合真实业务约束，当约束变化导致成本上升时，你会先优化「迭代器、生成器与异步迭代」里和 迭代器 相关的哪些环节」作答：可迭代协议：对象拥有 [Symbol.iterator]() 方法返回迭代器（含 next()），就能被 for...of、解构、扩展

#### 落地步骤

- 第一步：迭代器、生成器与异步迭代 只有在瓶颈被数据证实时才值得推进；先确认 迭代器 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 迭代器 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 迭代器、生成器与异步迭代 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## structured-clone-followup-2

title: 追问：以「结构化克隆 vs JSON 序列化」为例，为了确认「结构化克隆 vs JSON 序列化」不是“看起来有效”，你会如何安排测试证据和观测指标
difficulty: 进阶
tags: [克隆, postMessage, 追问]
parent: structured-clone
generated: followup-script

### 一句话

围绕「结构化克隆 vs JSON 序列化」回答追问时，重点说清 克隆 的前提、动作和回退条件。

### 题目

如果面试官追问：以「结构化克隆 vs JSON 序列化」为例，为了确认「结构化克隆 vs JSON 序列化」不是“看起来有效”，你会如何安排测试证据和观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「结构化克隆 vs JSON 序列化」结论成立，给出 克隆 的验收路径（对应追问：以「结构化克隆 vs JSON 序列化」为例，为了确认「结构化克隆 vs JSON 序列化」不是“看起来有效”，你会如何安排测试证据和观测指标）。
- 直接围绕「以「结构化克隆 vs JSON 序列化」为例，为了确认「结构化克隆 vs JSON 序列化」不是“看起来有效”，你会如何安排测试证据和观测指标」作答：JSON：丢失 undefined / function / Symbol / Date / RegExp / Map / Set / BigInt / 循环引用

#### 落地步骤

- 第一步：回答 结构化克隆 vs JSON 序列化 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 克隆 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## structured-clone-followup-3

title: 追问：在「结构化克隆 vs JSON 序列化」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 克隆 拆分「结构化克隆 vs JSON 序列化」的落地路径
difficulty: 进阶
tags: [克隆, postMessage, 追问]
parent: structured-clone
generated: followup-script

### 一句话

围绕「结构化克隆 vs JSON 序列化」回答追问时，重点说清 克隆 的前提、动作和回退条件。

### 题目

如果面试官追问：在「结构化克隆 vs JSON 序列化」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 克隆 拆分「结构化克隆 vs JSON 序列化」的落地路径？

### 答案要点

#### 直答

- 追问核心：围绕「结构化克隆 vs JSON 序列化」给出可执行的落地方案，重点说明 克隆 怎么做（对应追问：在「结构化克隆 vs JSON 序列化」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 克隆 拆分「结构化克隆 vs JSON 序列化」的落地路径）。
- 直接围绕「在「结构化克隆 vs JSON 序列化」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 克隆 拆分「结构化克隆 vs JSON 序列化」的落地路径」作答：JSON：丢失 undefined / function / Symbol / Date / RegExp / Map / Set / BigInt / 循环引用

#### 落地步骤

- 第一步：先声明输入规模和内存预算，再讨论 结构化克隆 vs JSON 序列化；复杂度边界不清会导致方案失真。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 克隆 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

## tagged-template-literal-followup-2

title: 追问：以「模板字符串与标签模板的实战」为例，你会如何围绕 模板字符串 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [模板字符串, 标签模板, 追问]
parent: tagged-template-literal
generated: followup-script

### 一句话

回答这题时，先给 模板字符串 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「模板字符串与标签模板的实战」为例，你会如何围绕 模板字符串 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「模板字符串与标签模板的实战」结论成立，给出 模板字符串 的验收路径（对应追问：以「模板字符串与标签模板的实战」为例，你会如何围绕 模板字符串 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「以「模板字符串与标签模板的实战」为例，你会如何围绕 模板字符串 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：语法：tag 函数收到 (strings: TemplateStringsArray, ...values: unknown[])

#### 落地步骤

- 第一步：模板字符串与标签模板的实战 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 模板字符串。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 模板字符串 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## tagged-template-literal-followup-3

title: 追问：在「模板字符串与标签模板的实战」场景下，如果兼容性压力突然升高，你会如何围绕 模板字符串 重新划分「模板字符串与标签模板的实战」的实施阶段
difficulty: 进阶
tags: [模板字符串, 标签模板, 追问]
parent: tagged-template-literal
generated: followup-script

### 一句话

围绕「模板字符串与标签模板的实战」回答追问时，重点说清 模板字符串 的前提、动作和回退条件。

### 题目

如果面试官追问：在「模板字符串与标签模板的实战」场景下，如果兼容性压力突然升高，你会如何围绕 模板字符串 重新划分「模板字符串与标签模板的实战」的实施阶段？

### 答案要点

#### 直答

- 追问核心：围绕「模板字符串与标签模板的实战」给出可执行的落地方案，重点说明 模板字符串 怎么做（对应追问：在「模板字符串与标签模板的实战」场景下，如果兼容性压力突然升高，你会如何围绕 模板字符串 重新划分「模板字符串与标签模板的实战」的实施阶段）。
- 直接围绕「在「模板字符串与标签模板的实战」场景下，如果兼容性压力突然升高，你会如何围绕 模板字符串 重新划分「模板字符串与标签模板的实战」的实施阶段」作答：语法：tag 函数收到 (strings: TemplateStringsArray, ...values: unknown[])

#### 落地步骤

- 第一步：先定义 模板字符串与标签模板的实战 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 模板字符串 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 模板字符串 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 模板字符串 的可复现用例、线上监控指标和回退演练记录。

## weak-collection-followup-2

title: 追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，如果要让结论在 WeakMap 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [WeakMap, GC, 追问]
parent: weak-collection
generated: followup-script

### 一句话

这道追问要直接回应「WeakMap / WeakSet / WeakRef 与垃圾回收」在 WeakMap 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，如果要让结论在 WeakMap 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「WeakMap / WeakSet / WeakRef 与垃圾回收」结论成立，给出 WeakMap 的验收路径（对应追问：以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，如果要让结论在 WeakMap 上可复核，你会怎样安排测试、日志和指标的组合验证）。
- 直接围绕「以「WeakMap / WeakSet / WeakRef 与垃圾回收」为例，如果要让结论在 WeakMap 上可复核，你会怎样安排测试、日志和指标的组合验证」作答：普通 Map 强引用 key，被 Map 持有的 key 不会因为外部引用消失就自动释放，容易内存泄漏

#### 落地步骤

- 第一步：回答 WeakMap / WeakSet / WeakRef 与垃圾回收 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 WeakMap 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## weak-collection-followup-3

title: 追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 WeakMap 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [WeakMap, GC, 追问]
parent: weak-collection
generated: followup-script

### 一句话

这道追问的关键是把 WeakMap 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 WeakMap 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 追问核心：围绕「WeakMap / WeakSet / WeakRef 与垃圾回收」给出可执行的落地方案，重点说明 WeakMap 怎么做（对应追问：在当前团队与业务约束下，遇到约束变化时，你会如何围绕 WeakMap 拆分方案演进路径，而不是一次性推翻重来）。
- 直接围绕「在当前团队与业务约束下，遇到约束变化时，你会如何围绕 WeakMap 拆分方案演进路径，而不是一次性推翻重来」作答：普通 Map 强引用 key，被 Map 持有的 key 不会因为外部引用消失就自动释放，容易内存泄漏

#### 落地步骤

- 第一步：回答 WeakMap / WeakSet / WeakRef 与垃圾回收 时先锁定 WeakMap 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 WeakMap 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 WeakMap 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 WeakMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 WeakMap 的可复现用例、线上监控指标和回退演练记录。

## bind-call-apply-followup-2

title: 追问：你会如何围绕 this 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [this, 函数, 追问]
parent: bind-call-apply
generated: followup-script

### 一句话

围绕「bind / call / apply 的区别与手写实现」回答追问时，重点说清 this 的前提、动作和回退条件。

### 题目

如果面试官追问：你会如何围绕 this 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「bind / call / apply 的区别与手写实现」结论成立，给出 this 的验收路径（对应追问：你会如何围绕 this 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「你会如何围绕 this 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：call(thisArg, ...args)：立即调用，参数依次传

#### 落地步骤

- 第一步：回答 bind / call / apply 的区别与手写实现 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 this 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## bind-call-apply-followup-3

title: 追问：在「bind / call / apply 的区别与手写实现」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 this 拆分「bind / call / apply 的区别与手写实现」的落地路径
difficulty: 进阶
tags: [this, 函数, 追问]
parent: bind-call-apply
generated: followup-script

### 一句话

这道追问要直接回应「bind / call / apply 的区别与手写实现」在 this 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「bind / call / apply 的区别与手写实现」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 this 拆分「bind / call / apply 的区别与手写实现」的落地路径？

### 答案要点

#### 直答

- 追问核心：围绕「bind / call / apply 的区别与手写实现」给出可执行的落地方案，重点说明 this 怎么做（对应追问：在「bind / call / apply 的区别与手写实现」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 this 拆分「bind / call / apply 的区别与手写实现」的落地路径）。
- 直接围绕「在「bind / call / apply 的区别与手写实现」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 this 拆分「bind / call / apply 的区别与手写实现」的落地路径」作答：call(thisArg, ...args)：立即调用，参数依次传

#### 落地步骤

- 第一步：先声明输入规模和内存预算，再讨论 bind / call / apply 的区别与手写实现；复杂度边界不清会导致方案失真。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 this 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

## new-operator-followup-2

title: 追问：以「new 操作符做了哪些事，怎么手写」为例，你会如何围绕 对象 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [对象, 函数, 追问]
parent: new-operator
generated: followup-script

### 一句话

这道追问的关键是把 对象 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「new 操作符做了哪些事，怎么手写」为例，你会如何围绕 对象 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「new 操作符做了哪些事，怎么手写」结论成立，给出 对象 的验收路径（对应追问：以「new 操作符做了哪些事，怎么手写」为例，你会如何围绕 对象 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「以「new 操作符做了哪些事，怎么手写」为例，你会如何围绕 对象 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：创建一个空对象 obj

#### 落地步骤

- 第一步：new 操作符做了哪些事，怎么手写 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 对象。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 对象 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## new-operator-followup-3

title: 追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 对象 拆分「new 操作符做了哪些事，怎么手写」的落地路径
difficulty: 进阶
tags: [对象, 函数, 追问]
parent: new-operator
generated: followup-script

### 一句话

回答这题时，先给 对象 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 对象 拆分「new 操作符做了哪些事，怎么手写」的落地路径？

### 答案要点

#### 直答

- 追问核心：围绕「new 操作符做了哪些事，怎么手写」给出可执行的落地方案，重点说明 对象 怎么做（对应追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 对象 拆分「new 操作符做了哪些事，怎么手写」的落地路径）。
- 直接围绕「从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 对象 拆分「new 操作符做了哪些事，怎么手写」的落地路径」作答：创建一个空对象 obj

#### 落地步骤

- 第一步：落地 new 操作符做了哪些事，怎么手写 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 对象 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 对象 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## promise-all-allsettled-race-any-followup-2

title: 追问：以「Promise.all / allSettled / race / any 的差异和典型用法」为例，你会如何围绕 异步 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [异步, Promise, 追问]
parent: promise-all-allsettled-race-any
generated: followup-script

### 一句话

回答这题时，先给 异步 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「Promise.all / allSettled / race / any 的差异和典型用法」为例，你会如何围绕 异步 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Promise.all / allSettled / race / any 的差异和典型用法」结论成立，给出 异步 的验收路径（对应追问：以「Promise.all / allSettled / race / any 的差异和典型用法」为例，你会如何围绕 异步 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「以「Promise.all / allSettled / race / any 的差异和典型用法」为例，你会如何围绕 异步 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）

#### 落地步骤

- 第一步：Promise.all / allSettled / race / any 的差异和典型用法 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 异步。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 异步 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## promise-all-allsettled-race-any-followup-3

title: 追问：在「Promise.all / allSettled / race / any 的差异和典型用法」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 异步 拆分「Promise.all / allSettled / race / any 的差异和典型用法」的落地路径
difficulty: 进阶
tags: [异步, Promise, 追问]
parent: promise-all-allsettled-race-any
generated: followup-script

### 一句话

这道追问的关键是把 异步 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「Promise.all / allSettled / race / any 的差异和典型用法」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 异步 拆分「Promise.all / allSettled / race / any 的差异和典型用法」的落地路径？

### 答案要点

#### 直答

- 追问核心：围绕「Promise.all / allSettled / race / any 的差异和典型用法」给出可执行的落地方案，重点说明 异步 怎么做（对应追问：在「Promise.all / allSettled / race / any 的差异和典型用法」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 异步 拆分「Promise.all / allSettled / race / any 的差异和典型用法」的落地路径）。
- 直接围绕「在「Promise.all / allSettled / race / any 的差异和典型用法」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 异步 拆分「Promise.all / allSettled / race / any 的差异和典型用法」的落地路径」作答：Promise.all(iter)：全部 fulfilled 才 fulfilled，任一 rejected 立即 reject（适合并发依赖）

#### 落地步骤

- 第一步：回答 Promise.all / allSettled / race / any 的差异和典型用法 时要说明 异步 在极端输入下的行为，不要只给样例路径。
- 第二步：先把 异步 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 异步 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

回答这题时，先给 异常治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：运行时异常战情室真正落到线上前，你会先验哪三件事，确保故障来了不是临时拍脑袋？

### 答案要点

#### 直答

- 追问核心：识别「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」的高风险失败场景并给出兜底措施（对应追问：运行时异常战情室真正落到线上前，你会先验哪三件事，确保故障来了不是临时拍脑袋）。
- 直接围绕「运行时异常战情室真正落到线上前，你会先验哪三件事，确保故障来了不是临时拍脑袋」作答：先分层判定影响：按路由、浏览器版本、用户人群分桶，避免单一错误数误导决策。

#### 落地步骤

- 第一步：落地 JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：围绕 异常治理 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 异常治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## javascript-runtime-error-warroom-followup-2

title: 追问：你会怎样证明异常治理闭环真的有效
difficulty: 资深
tags: [异常治理, runtime, 决策沟通, 追问]
parent: javascript-runtime-error-warroom
generated: followup-script

### 一句话

这道追问的关键是把 异常治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：你说这个异常治理方案可落地，那你会怎样用测试、日志和线上指标证明它不是“看起来不错”？

### 答案要点

#### 直答

- 追问核心：说明如何验证「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」结论成立，给出 异常治理 的验收路径（对应追问：你说这个异常治理方案可落地，那你会怎样用测试、日志和线上指标证明它不是“看起来不错”）。
- 直接围绕「你说这个异常治理方案可落地，那你会怎样用测试、日志和线上指标证明它不是“看起来不错”」作答：先分层判定影响：按路由、浏览器版本、用户人群分桶，避免单一错误数误导决策。

#### 落地步骤

- 第一步：JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 异常治理。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 异常治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## javascript-runtime-error-warroom-followup-3

title: 追问：长期看哪些信号才知道战情室机制跑稳了
difficulty: 资深
tags: [异常治理, runtime, 决策沟通, 追问]
parent: javascript-runtime-error-warroom
generated: followup-script

### 一句话

这道追问的关键是把 异常治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：这套战情室机制不是只应急一次就结束，你会长期跟踪哪些信号来判断它是否真的稳定有效？

### 答案要点

#### 直答

- 追问核心：围绕「JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板」给出可执行的落地方案，重点说明 异常治理 怎么做（对应追问：这套战情室机制不是只应急一次就结束，你会长期跟踪哪些信号来判断它是否真的稳定有效）。
- 直接围绕「这套战情室机制不是只应急一次就结束，你会长期跟踪哪些信号来判断它是否真的稳定有效」作答：先分层判定影响：按路由、浏览器版本、用户人群分桶，避免单一错误数误导决策。

#### 落地步骤

- 第一步：落地 JavaScript 运行时异常战情室：错误激增、影响分层与止损拍板 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 异常治理 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 异常治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## javascript-polyfill-baseline-governance-followup-1

title: 追问：语法升级评审时你先验哪些兼容边界
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略, 追问]
parent: javascript-polyfill-baseline-governance
generated: followup-script

### 一句话

围绕「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」回答追问时，重点说清 兼容治理 的前提、动作和回退条件。

### 题目

如果面试官追问：语法升级方案评审时，你会先检查哪些兼容边界，避免上线后低版本用户直接踩雷？

### 答案要点

#### 直答

- 追问核心：说明「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」上线时如何灰度、观测、回滚（对应追问：语法升级方案评审时，你会先检查哪些兼容边界，避免上线后低版本用户直接踩雷）。
- 直接围绕「语法升级方案评审时，你会先检查哪些兼容边界，避免上线后低版本用户直接踩雷」作答：先定义浏览器基线：明确支持矩阵、最低版本和业务覆盖率，不用“感觉上都支持”。

#### 落地步骤

- 第一步：JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 兼容治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## javascript-polyfill-baseline-governance-followup-2

title: 追问：复盘语法升级时该拿哪些证据说服团队
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略, 追问]
parent: javascript-polyfill-baseline-governance
generated: followup-script

### 一句话

回答这题时，先给 兼容治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：复盘这次语法升级和 polyfill 治理，你会拿哪些关键证据向团队证明方案确实有效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」结论成立，给出 兼容治理 的验收路径（对应追问：复盘这次语法升级和 polyfill 治理，你会拿哪些关键证据向团队证明方案确实有效）。
- 直接围绕「复盘这次语法升级和 polyfill 治理，你会拿哪些关键证据向团队证明方案确实有效」作答：先定义浏览器基线：明确支持矩阵、最低版本和业务覆盖率，不用“感觉上都支持”。

#### 落地步骤

- 第一步：落地 JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 兼容治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## javascript-polyfill-baseline-governance-followup-3

title: 追问：怎么量化语法升级的长期收益与维护成本
difficulty: 资深
tags: [兼容治理, polyfill, 发布策略, 追问]
parent: javascript-polyfill-baseline-governance
generated: followup-script

### 一句话

这道追问要直接回应「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」在 兼容治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：半年后回头看，你会怎么量化语法升级方案的长期收益和维护成本，判断这条路还值不值得继续？

### 答案要点

#### 直答

- 追问核心：比较「JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门」在收益、成本和维护复杂度上的取舍边界（对应追问：半年后回头看，你会怎么量化语法升级方案的长期收益和维护成本，判断这条路还值不值得继续）。
- 直接围绕「半年后回头看，你会怎么量化语法升级方案的长期收益和维护成本，判断这条路还值不值得继续」作答：先定义浏览器基线：明确支持矩阵、最低版本和业务覆盖率，不用“感觉上都支持”。

#### 落地步骤

- 第一步：JavaScript 语法升级基线治理：Polyfill 成本、兼容风险与发布闸门 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 兼容治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。
