---
id: 03-vue
title: Vue 全家桶
order: 3
icon: 🟩
description: Vue 3 响应式、编译、渲染、Pinia、Router 与 Nuxt 的核心机制。
---

## vue2-vs-vue3

title: Vue2 与 Vue3 的设计差异总览
followups: [vue2-vs-vue3-followup-1]
links: [computed-watch, effect-track-trigger, reactivity-core]
difficulty: 基础
tags: [架构, 响应式, 迁移]

### 一句话

Vue 3 把响应式从 defineProperty 换成 Proxy（对象不再有"加属性看不到"的问题），同时把更多优化搬到编译期，并用 Composition API 做更好的逻辑复用和类型推导。

### 题目

从响应式、编译、渲染、TypeScript 友好度和生态形态五个角度，对比 Vue2 与 Vue3 的关键差异。

### 答案要点

- **响应式**：Vue2 基于 `Object.defineProperty`，无法天然拦截新增/删除属性、数组索引和 `Map/Set`；Vue3 基于 `Proxy + Reflect`
- **编译优化**：Vue3 编译期会生成 `PatchFlag`、Block Tree、静态提升、事件缓存，减少运行时 diff 成本
- **API 设计**：Vue2 以 Options API 为主，逻辑按选项分散；Vue3 用 Composition API 更利于逻辑内聚和复用
- **TS 体验**：Vue2 的类型推导靠 class-style 或额外工具，Vue3 `<script setup>` + 宏函数对类型更友好
- **生态方向**：Vue3 更适合 Tree Shaking、SSR、跨平台和大规模工程化，Nuxt 3、Vite、Pinia 都围绕它构建

### 代码示例

```ts
// Vue 2 Options API
export default {
  data() {
    return { count: 0 };
  },
  computed: {
    double() {
      return this.count * 2;
    },
  },
  methods: {
    inc() {
      this.count++;
    },
  },
  mounted() {
    console.log('mounted');
  },
};

// Vue 3 Composition API + <script setup>
import { ref, computed, onMounted } from 'vue';
const count = ref(0);
const double = computed(() => count.value * 2);
const inc = () => count.value++;
onMounted(() => console.log('mounted'));
```

```ts
// 响应式底层差异
// Vue 2：无法监听新增属性
const v2 = Vue.observable({ a: 1 });
v2.b = 2; // ❌ 不响应（必须 Vue.set）

// Vue 3：Proxy 拦截所有操作
const v3 = reactive({ a: 1 });
v3.b = 2; // ✅ 响应
delete v3.a; // ✅ 响应
```

### 追问

- 在 Vue 项目里落地「Vue2 与 Vue3 的设计差异总览」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue2 与 Vue3 的设计差异总览」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 架构、响应式、迁移，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vue3 不是简单重写，而是把很多优化前移到编译期
- 迁移时先处理 `this` 依赖、过滤器、`.sync`、`$listeners` 等兼容点

## reactivity-core

title: reactive、ref、shallow、readonly、toRef 的选择策略
followups: [reactivity-core-followup-1, reactivity-core-followup-2, reactivity-core-followup-3]
links: [effect-track-trigger, computed-watch, vue2-vs-vue3]
difficulty: 进阶
tags: [响应式, API]

### 一句话

基本类型、需要整体替换 → 用 `ref`；对象/数组深层代理 → 用 `reactive`；只想代理一层 → 用 `shallow*`；想从 reactive 解构出来仍保持响应式 → 用 `toRefs`。

### 题目

`reactive`、`ref`、`shallowRef`、`shallowReactive`、`readonly`、`toRef/toRefs` 分别适合什么场景？

### 答案要点

- `ref` 适合基本类型或需要整体替换的值，模板里自动解包
- `reactive` 适合对象/数组的深层代理，但解构后会丢失响应式链接
- `shallowRef` / `shallowReactive` 只代理第一层，适合大对象、第三方实例、编辑器对象、图表实例
- `readonly` / `shallowReadonly` 用于防止外部误改状态，常见于 provide/inject 或 store 暴露
- `toRef(obj, key)` 为单个属性创建响应式引用；`toRefs` 用于返回对象给模板/组合函数时保留响应性

### 代码示例

```ts
const state = reactive({ page: 1, user: { name: 'Ada' } });
const page = toRef(state, 'page');
const editor = shallowRef<Editor | null>(null);
const exposed = readonly(state);
```

### 常见误区

- 用 `ref` 拿到的不是值，模板里自动解包，但在 `<script setup>` 里要 `.value`
- 给 reactive 对象解构出某字段，原始字段失去响应性 → 用 `toRefs`
- shallowRef 包裹大对象，但内部某字段变化界面不更新——shallow 只追踪顶层
- 把响应式对象塞进非响应式数据结构（Map）里取出来后丢响应

### 追问

- 为什么 Vue 3 用 Proxy 而不是 defineProperty 还需要「特殊处理」集合
- ref 内部其实是怎么实现的（getter/setter + dep）
- `markRaw` 用在哪里

### 延伸

- `ref` 包对象时内部仍会走深层响应式
- 组合式函数若直接返回 `reactive` 对象，调用方解构时要么 `toRefs`，要么提醒不要裸解构

## effect-track-trigger

title: Vue3 响应式系统的 track / trigger 是怎么工作的
followups: [effect-track-trigger-followup-1]
links: [01-javascript/proxy-reflect, reactivity-core, scheduler-nexttick]
difficulty: 资深
tags: [响应式, 原理]

### 一句话

当前正在执行的副作用函数会被压入 effect 栈，getter 中 track(target, key) 记录依赖；常见依赖桶结构：WeakMap<target, Map<key, Set<effect>>>。

### 题目

请解释 `effect`、`track`、`trigger`、依赖桶的数据结构，以及为什么 Vue3 要配合 `Reflect` 使用。

### 答案要点

- 当前正在执行的副作用函数会被压入 effect 栈，getter 中 `track(target, key)` 记录依赖
- 常见依赖桶结构：`WeakMap<target, Map<key, Set<effect>>>`
- setter 中 `trigger(target, key, type)` 找到依赖集合并重新调度 effect
- `Reflect.get/set` 可保持正确返回值和 `receiver`，避免 getter/setter 中 `this` 指向错乱
- 对数组长度、`Map/Set`、迭代器依赖需要特殊 key 和触发策略

### 代码示例

```ts
const bucket = new WeakMap<object, Map<PropertyKey, Set<() => void>>>();

function track(target: object, key: PropertyKey, active?: () => void) {
  if (!active) return;
  let depsMap = bucket.get(target);
  if (!depsMap) bucket.set(target, (depsMap = new Map()));
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set()));
  deps.add(active);
}
```

### 追问

- 在 Vue 项目里落地「Vue3 响应式系统的 track / trigger 是怎么工作的」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue3 响应式系统的 track / trigger 是怎么工作的」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 响应式、原理，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- effect 还要做依赖清理，避免分支切换后保留旧依赖
- `computed` 和 `watch` 都是建立在 effect 之上的高级封装

## scheduler-nexttick

title: Scheduler、批量更新与 nextTick 的真实含义
followups: [scheduler-nexttick-followup-1]
links: [effect-track-trigger, advanced-features, nuxt3-overview]
difficulty: 进阶
tags: [渲染, 调度]

### 一句话

Vue 不会每次 set 都立刻 patch DOM，而是把 job 推入队列，按微任务批量刷新；去重后同一组件同一轮只更新一次，避免瀑布式重复渲染；nextTick 保证的是“当前这轮响应式更新对应的 DOM patch 已完成”。

### 题目

为什么 Vue 会把多次状态变更合并更新？`nextTick` 到底保证了什么？

### 答案要点

- Vue 不会每次 set 都立刻 patch DOM，而是把 job 推入队列，按微任务批量刷新
- 去重后同一组件同一轮只更新一次，避免瀑布式重复渲染
- `nextTick` 保证的是“当前这轮响应式更新对应的 DOM patch 已完成”，不是浏览器一定已经 paint
- watcher 有 `flush: 'pre' | 'post' | 'sync'`，决定执行相位

### 代码示例

```ts
count.value++;
count.value++;
await nextTick();
// 这里读到的是合并更新后的 DOM
```

### 追问

- 你会先看哪些指标来判断「Scheduler、批量更新与 nextTick 的真实含义」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Scheduler、批量更新与 nextTick 的真实含义」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 渲染、调度，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 读 DOM 布局通常用 `await nextTick()`，再结合 `requestAnimationFrame` 能更接近渲染后时机
- `sync` watcher 要慎用，容易造成递归触发和性能回退

## computed-watch

title: computed、watch、watchEffect 的区别与选型
followups: [computed-watch-followup-1, computed-watch-followup-2, computed-watch-followup-3]
links: [effect-track-trigger, reactivity-core, vue2-vs-vue3]
difficulty: 基础
tags: [响应式, API]

### 一句话

computed 是"派生值"——结果会缓存、像普通变量用；watch 是"在某个值变化时做点事"——明确源 + 拿新旧值；watchEffect 不指定源，自动追踪用到的响应式数据。

### 题目

`computed`、`watch`、`watchEffect` 分别解决什么问题？它们的依赖收集方式和执行时机有何不同？

### 答案要点

- `computed` 适合声明式派生值，带缓存和脏标记，只有依赖变了才重新求值
- `watch` 适合“监听某个明确源并做副作用”，能拿到新旧值，支持深度、立即执行、flush 和清理函数
- `watchEffect` 自动收集同步执行阶段访问到的依赖，更像“响应式 autorun”
- 异步回调里只有第一轮同步访问能被 `watchEffect` 收集，`await` 之后访问的值不会成为依赖

### 代码示例

```ts
import { computed, watch, watchEffect, ref } from 'vue';

const count = ref(0);
const userId = ref('1');

// 1. computed：派生值，懒计算 + 缓存
const double = computed(() => count.value * 2);

// 2. watch：明确源、可拿新旧值、可控制时机
watch(
  userId,
  async (newId, oldId, onCleanup) => {
    const ctrl = new AbortController();
    onCleanup(() => ctrl.abort()); // 切换时取消上次请求
    const data = await fetch(`/api/user/${newId}`, { signal: ctrl.signal });
    console.log(newId, oldId, data);
  },
  {
    immediate: true, // 立即执行一次
    flush: 'post', // DOM 更新后再触发
    deep: false,
  },
);

// 3. watch 多个源
watch([count, userId], ([c, id]) => console.log(c, id));

// 4. watchEffect：自动依赖追踪（仅同步阶段）
watchEffect(async () => {
  console.log(count.value); // ✅ 被收集
  await someAsync();
  console.log(userId.value); // ❌ await 之后不会被收集
});
```

### 常见误区

- computed 里改其他响应式数据 → 触发其他依赖的副作用，容易死循环
- watch 给数组 / 对象时默认浅监听，要 `deep: true`
- watchEffect 自动追踪，但条件分支里访问了不一定每次都跑——依赖会变化
- 在 watch 回调里再发起异步请求，没做「取消上一次」会有竞态

### 追问

- watchEffect 和 watch 何时选哪个
- 怎么实现「立即执行 + 后续异步取消」的 watch（参考 useFetch）
- computed 是 lazy 的吗？什么时候算「计算时机」

### 延伸

- 需要精确控制依赖、比对 old/new、节流防抖时优先 `watch`
- 只是模板里用到的派生值，不要用 watch 回写另一个 ref，应优先 computed

## diff-optimization

title: Vue3 diff 为什么比 Vue2 更省？LIS、PatchFlag、Block Tree 起了什么作用
followups: [diff-optimization-followup-1, diff-optimization-followup-2, diff-optimization-followup-3]
links: [vapor-mode]
difficulty: 资深
tags: [diff, 编译优化]

### 一句话

Vue 3 在编译时就标记了哪些节点会变（PatchFlag），运行时只对比这些"动态点"，再用最长递增子序列（LIS）算法找出最少的 DOM 移动，所以比 Vue 2 快。

### 题目

说明 Vue3 在运行时 diff 和编译期优化上的主要手段，并解释为什么要引入最长递增子序列。

### 答案要点

- Vue2 主要靠运行时双端 diff；Vue3 在此基础上增加了静态分析结果，减少“无意义比较”
- `PatchFlag` 标记动态文本、class、style、props、事件等，只比较真正会变的部分
- Block Tree 把节点拆成“稳定骨架 + 动态子节点数组”，更新时跳过大量静态节点
- 列表乱序更新时，Vue3 用最长递增子序列减少 DOM move 次数，只移动不在 LIS 中的节点

### 代码示例

```vue
<template>
  <!-- 编译后会带 PatchFlag：1=TEXT，2=CLASS，4=STYLE，8=PROPS... -->
  <div>
    <p>静态文本</p>
    <!-- 静态提升 -->
    <p>{{ msg }}</p>
    <!-- PatchFlag: TEXT -->
    <button :class="cls" @click="onClick">
      <!-- PatchFlag: CLASS + HYDRATE_EVENTS -->
      {{ label }}
    </button>
  </div>
</template>
```

```js
// 编译产物（简化）
import { createElementVNode as _v, openBlock as _o, createElementBlock as _b } from 'vue';

const _hoisted_1 = _v('p', null, '静态文本'); // 提升到模块顶层

export function render(_ctx) {
  return (
    _o(),
    _b('div', null, [
      _hoisted_1,
      _v('p', null, _ctx.msg, 1 /* TEXT */), // 仅 diff 文本
      _v('button', { class: _ctx.cls, onClick: _ctx.onClick }, _ctx.label, 10 /* CLASS, PROPS */, [
        'onClick',
      ]),
    ])
  );
}
```

```ts
// LIS：列表 diff 中减少 DOM move
// [a, b, c, d, e] -> [d, b, c, a, e]
// LIS = [b, c, e]（不动）
// 只 move：a, d
function getSequence(arr: number[]): number[] {
  // Vue3 源码 runtime-core/src/renderer.ts 中的 getSequence
  const result = [0],
    p = arr.slice();
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === 0) continue;
    const last = result[result.length - 1];
    if (arr[last] < arr[i]) {
      p[i] = last;
      result.push(i);
      continue;
    }
    let l = 0,
      r = result.length - 1;
    while (l < r) {
      const m = (l + r) >> 1;
      arr[result[m]] < arr[i] ? (l = m + 1) : (r = m);
    }
    if (arr[i] < arr[result[l]]) {
      if (l > 0) p[i] = result[l - 1];
      result[l] = i;
    }
  }
  let u = result.length,
    v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
```

### 常见误区

- key 用 index 当兜底——列表插入/删除时复用错位
- 给 v-for 顶层渲染条件元素而不是 fragment
- 不必要的 deep watch 让 patchFlag 优化白费

### 追问

- React 的 fiber 算法和 Vue 的 diff 思路有什么不同
- patchFlag 在编译期是怎么决定的（举几个 flag）
- LIS（最长递增子序列）在 Vue diff 里解决什么问题

### 延伸

- `key` 的语义是"稳定身份"，不是"消除 warning"
- 错误的 key（比如索引）会让组件状态复用出错，尤其在表单和动画场景

## sfc-compile

title: 模板编译、SFC 编译与 `<script setup>` 的编译产物
followups: [sfc-compile-followup-1]
difficulty: 资深
tags: [编译, SFC]

### 一句话

SFC 会被拆成 template/script/style 三块分别编译，模板被翻译成 render 函数（带 PatchFlag），`<script setup>` 是把 setup() 内顶层声明自动暴露给模板的语法糖。

### 题目

Vue SFC 从源码到浏览器能跑的 JS，大致经过哪些阶段？`<script setup>` 为什么叫语法糖？

### 答案要点

- 模板编译分三步：`parse -> transform -> generate`
- `<template>` 会被编译成 render 函数，静态节点可被 hoist
- `<script setup>` 会被编译成普通 `setup()` 函数，`defineProps/defineEmits/defineExpose/defineSlots` 等宏会在编译期擦除
- 样式块若开启 scoped，会给节点和 CSS 选择器注入 scope id

### 代码示例

```vue
<script setup lang="ts">
const props = defineProps<{ msg: string }>();
</script>

<template>{{ props.msg }}</template>
```

```ts
export default {
  props: { msg: String },
  setup(props) {
    return () => props.msg;
  },
};
```

### 常见误区

- `<script setup>` 顶层声明都自动暴露给模板，但**不带 .value**——模板里自动解包，脚本里不行
- 用了 macro（defineProps / defineEmits）后却显式 import 它们 → 编译报错
- style scoped 实现「按属性选择器隔离」，深度选择子组件用 `:deep()`

### 追问

- defineProps 在 ts 模式下和 js 模式下有什么差异
- script setup 编译产物大致长什么样
- v-bind 在 style 里的用法

### 延伸

- 宏函数不能放进条件分支里，因为编译器需要静态分析
- `defineModel` 本质上是 props + emit 的编译糖

## component-communication

title: Vue 组件通信方案怎么选
followups: [component-communication-followup-1]
difficulty: 进阶
tags: [组件通信, 设计]

### 一句话

父子之间用 props/emit；想双向就 v-model；穿层级用 provide/inject；任意两个组件之间共享状态就上 Pinia 或事件总线。

### 题目

请给出 props/emit、v-model、provide/inject、Pinia、$attrs、refs/defineExpose、Teleport 的适用边界。

### 答案要点

- 父子关系优先 `props + emit`
- 双向绑定场景优先 `v-model`，多个模型可用 `v-model:xxx`
- 跨层但具有上下文语义时用 `provide/inject`，如表单、主题、表格列注册
- 全局共享状态或跨路由状态用 Pinia
- `defineExpose` / template refs 用于命令式能力暴露，如 `focus/open/reset`
- `Teleport` 不是状态共享方案，只是把渲染位置搬到别处

### 代码示例

```vue
<!-- 1. props + emit + v-model -->
<script setup lang="ts">
const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
// v-model 简化：defineModel
const value = defineModel<string>();
</script>

<!-- 2. provide/inject + InjectionKey 类型安全 -->
<script setup lang="ts">
import type { InjectionKey } from 'vue';
import { provide, inject, readonly, ref } from 'vue';

const ThemeKey: InjectionKey<{ dark: boolean; toggle: () => void }> = Symbol('theme');

// 父组件
const dark = ref(false);
provide(ThemeKey, {
  dark: readonly(dark) as any, // 防止子组件直接改
  toggle: () => (dark.value = !dark.value),
});

// 子组件
const theme = inject(ThemeKey);
if (!theme) throw new Error('未在父级注入 Theme');
</script>
```

```vue
<!-- 3. defineExpose：父组件命令式调用 -->
<!-- 子组件 -->
<script setup lang="ts">
import { ref } from 'vue';
const inputRef = ref<HTMLInputElement>();
function focus() {
  inputRef.value?.focus();
}
defineExpose({ focus });
</script>

<!-- 父组件 -->
<script setup lang="ts">
import { ref } from 'vue';
import Child from './Child.vue';
const childRef = ref<InstanceType<typeof Child>>();
function onClick() {
  childRef.value?.focus();
}
</script>
```

### 追问

- 在 Vue 项目里落地「Vue 组件通信方案怎么选」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue 组件通信方案怎么选」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 组件通信、设计，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- EventBus 只适合很轻量、生命周期明确的临时通信，长期维护成本高
- provide/inject 默认不是严格只读，建议搭配 `readonly`

## pinia-router

title: Pinia 与 Vue Router 4 的工程实践
followups: [pinia-router-followup-1]
difficulty: 进阶
tags: [Pinia, Router]

### 一句话

Pinia = Vuex 的简化版（去掉 mutations，直接改 state，组合式 API 写起来像普通函数）；Vue Router 4 用嵌套路由 + 守卫 + 懒加载支撑大部分单页应用。

### 题目

如何设计 Pinia store，Router 的守卫执行顺序又该如何理解？

### 答案要点

- Pinia 推荐“一个领域一个 store”，状态、getter、action 边界清晰；setup store 更适合复用组合式能力
- 可用 `$subscribe` 做持久化，用插件注入审计、埋点、权限等横切能力
- Vue Router 的守卫分为全局、路由级、组件级三层：`beforeEach` 按注册顺序执行；`beforeEnter` 只在真正进入该路由记录时触发；`beforeResolve` 在导航确认前的最后阶段执行；`afterEach` 仅用于副作用，不能中断导航
- 路由元信息适合权限、标题、埋点和缓存策略，不要把大段业务逻辑塞进守卫

### 代码示例

```ts
// Pinia：setup 风格 store
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useUserStore = defineStore(
  'user',
  () => {
    const profile = ref<{ id: string; name: string } | null>(null);
    const isLoggedIn = computed(() => !!profile.value);

    async function login(payload: { name: string; password: string }) {
      profile.value = await api.login(payload);
    }
    function logout() {
      profile.value = null;
    }

    return { profile, isLoggedIn, login, logout };
  },
  {
    persist: { paths: ['profile'] }, // 配合 pinia-plugin-persistedstate
  },
);
```

```ts
// Vue Router 4：守卫执行顺序
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, role: 'admin' },
      beforeEnter: (to, from, next) => {
        // ⚠️ 路由级守卫，仅当真正进入此路由记录时触发
        next();
      },
      children: [{ path: 'users', component: UsersPage, meta: { title: '用户管理' } }],
    },
  ],
});

// 全局前置守卫：1️⃣ 最先执行
router.beforeEach(async (to, from) => {
  const user = useUserStore();
  if (to.meta.requiresAuth && !user.isLoggedIn) return '/login';
  if (to.meta.role && to.meta.role !== user.profile?.role) return '/403';
});

// 全局解析守卫：2️⃣ 在所有组件守卫之后、afterEach 之前
router.beforeResolve(async (to) => {
  if (to.meta.preload) await preloadResources(to.meta.preload);
});

// 全局后置钩子：3️⃣ 不能中断，仅副作用（埋点 / 标题）
router.afterEach((to) => {
  document.title = (to.meta.title as string) ?? 'App';
  trackPageView(to.fullPath);
});
```

### 追问

- 在 Vue 项目里落地「Pinia 与 Vue Router 4 的工程实践」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Pinia 与 Vue Router 4 的工程实践」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 Pinia、Router，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- SSR/Nuxt 场景下 Pinia 需要按请求创建实例，避免跨请求污染
- 动态路由常用于权限菜单和插件化模块
- 组件内的 `beforeRouteEnter / beforeRouteUpdate / beforeRouteLeave` 是否触发，还与组件复用、嵌套路由和参数变化有关，具体顺序应以官方导航守卫文档为准

## advanced-features

title: KeepAlive、Teleport、Suspense、异步组件分别解决什么问题
followups: [advanced-features-followup-1]
links: [nuxt3-overview, scheduler-nexttick, 08-performance/initial-load]
difficulty: 进阶
tags: [高级组件, SSR]

### 一句话

KeepAlive 用于缓存组件实例和状态，适合 tab、多页签详情；需配合 include/exclude/max；Teleport 把节点渲染到指定容器，常用于 Dialog、Popover、Toast，避免层叠上下文和 overflow 裁剪。

### 题目

请说明 KeepAlive、Teleport、Suspense、defineAsyncComponent 的核心用途与坑点。

### 答案要点

- `KeepAlive` 用于缓存组件实例和状态，适合 tab、多页签详情；需配合 `include/exclude/max`
- `Teleport` 把节点渲染到指定容器，常用于 Dialog、Popover、Toast，避免层叠上下文和 overflow 裁剪
- `Suspense` 处理异步依赖的占位与回退，在 CSR 支持较好，SSR 场景要配合框架能力
- `defineAsyncComponent` 适合懒加载大组件，支持 loading、error、timeout、retry

### 代码示例

```vue
<!-- 1. KeepAlive：缓存路由组件 -->
<template>
  <router-view v-slot="{ Component, route }">
    <KeepAlive :include="cachedViews" :max="10">
      <component :is="Component" :key="route.fullPath" />
    </KeepAlive>
  </router-view>
</template>

<!-- 缓存生命周期：onActivated / onDeactivated -->
<script setup lang="ts">
import { onActivated, onDeactivated } from 'vue';
onActivated(() => console.log('从缓存激活'));
onDeactivated(() => console.log('被缓存隐藏'));
</script>
```

```vue
<!-- 2. Teleport：渲染到 body 解决层叠问题 -->
<template>
  <Teleport to="body">
    <div v-if="show" class="modal">{{ msg }}</div>
  </Teleport>
</template>
```

```vue
<!-- 3. Suspense：异步组件 + 占位 -->
<template>
  <Suspense>
    <template #default>
      <AsyncDashboard />
    </template>
    <template #fallback>
      <div class="loading">加载中...</div>
    </template>
  </Suspense>
</template>
```

```ts
// 4. defineAsyncComponent：路由懒加载 + 错误兜底
import { defineAsyncComponent } from 'vue';
const Dashboard = defineAsyncComponent({
  loader: () => import('./Dashboard.vue'),
  loadingComponent: Loading,
  errorComponent: ErrorPage,
  delay: 200, // 200ms 内加载完不显示 loading
  timeout: 10_000,
});
```

### 追问

- 「KeepAlive、Teleport、Suspense、异步组件分别解决什么问题」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「KeepAlive、Teleport、Suspense、异步组件分别解决什么问题」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 高级组件、SSR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- KeepAlive 缓存的是组件实例，不是 DOM 快照
- Teleport 后事件冒泡按组件树而不是物理 DOM 树理解更不容易出错

## render-jsx-directive

title: render 函数、JSX 与自定义指令分别适合什么场景
followups: [render-jsx-directive-followup-1]
difficulty: 进阶
tags: [RenderFunction, JSX, 指令]

### 一句话

模板适合绝大多数声明式 UI；render 函数 / JSX 更适合高度动态结构、插槽编排、函数式抽象和需要直接操作 vnode 的场景；JSX 只是另一种书写 render 的方式，表达力更强，但也更要求团队统一风格和类型能力。

### 题目

什么时候该从模板切到 render 函数 / JSX？自定义指令又该放在什么边界内？

### 答案要点

- 模板适合绝大多数声明式 UI；render 函数 / JSX 更适合高度动态结构、插槽编排、函数式抽象和需要直接操作 vnode 的场景
- JSX 只是另一种书写 render 的方式，表达力更强，但也更要求团队统一风格和类型能力
- 自定义指令适合“直接作用于原生 DOM 元素”的低层增强，如 focus、拖拽、权限水印、交叉观察等
- 如果一个能力本质上是在复用 UI 结构或状态逻辑，通常优先组件 / composable，而不是指令

### 代码示例

```tsx
// 1. JSX 写动态组件树
import { defineComponent, h } from 'vue';

const DynamicTable = defineComponent({
  props: { columns: Array, rows: Array },
  setup(props) {
    return () => (
      <table>
        <thead>
          <tr>
            {props.columns.map((c) => (
              <th key={c.key}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.id}>
              {props.columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
});
```

```ts
// 2. 自定义指令：v-focus
const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
};

// 3. 自定义指令：v-permission（权限控制）
const vPermission = {
  mounted(el: HTMLElement, binding: { value: string }) {
    const user = useUserStore();
    if (!user.permissions.includes(binding.value)) {
      el.parentNode?.removeChild(el);
    }
  },
};

// 用法：<button v-permission="'user.delete'">删除</button>

// 4. 自定义指令：v-intersect（懒加载）
const vIntersect = {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        binding.value();
        io.disconnect();
      }
    });
    io.observe(el);
    (el as any).__io = io;
  },
  unmounted(el: HTMLElement) {
    (el as any).__io?.disconnect();
  },
};
```

### 追问

- 「render 函数、JSX 与自定义指令分别适合什么场景」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「render 函数、JSX 与自定义指令分别适合什么场景」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 RenderFunction、JSX、指令，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 在 render / JSX 中，`v-model`、插槽、事件修饰语法都要显式展开理解
- 指令是 DOM 层抽象，不适合承载复杂业务状态

## lifecycle-debug-hooks

title: 生命周期、错误边界与调试钩子怎么用
followups: [lifecycle-debug-hooks-followup-1]
difficulty: 进阶
tags: [生命周期, 调试, 错误边界]

### 一句话

onErrorCaptured 用于捕获后代组件渲染、事件、watcher 等过程中的异常，常用于局部错误降级；onRenderTracked / onRenderTriggered 更偏调试用途。

### 题目

除了常见的 mounted / updated / unmounted，`onErrorCaptured`、`onRenderTracked`、`onRenderTriggered` 这类钩子分别适合什么场景？

### 答案要点

- `onErrorCaptured` 用于捕获后代组件渲染、事件、watcher 等过程中的异常，常用于局部错误降级
- `onRenderTracked` / `onRenderTriggered` 更偏调试用途，用于分析组件渲染时到底收集了哪些依赖、又是哪些依赖触发了重渲染
- 这些钩子适合排查“不必要更新”“依赖过多”“某个状态改动牵一大片组件”的问题
- 真正线上兜底仍要配合全局错误处理和监控平台，不能只靠组件内钩子

### 代码示例

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, onErrorCaptured, onRenderTracked, onRenderTriggered } from 'vue';

// 1. 错误边界：捕获后代异常并降级
onErrorCaptured((err, instance, info) => {
  console.error('component error:', err, info);
  reportError(err, { component: instance?.$options.name, info });
  // 返回 false 阻止错误向上冒泡
  return false;
});

// 2. 调试：onRenderTracked / onRenderTriggered
onRenderTracked((e) => {
  console.log('依赖被收集:', e.type, e.key, e.target);
});
onRenderTriggered((e) => {
  console.log('触发重渲染:', e.type, e.key, e.oldValue, '->', e.newValue);
});

// 3. 副作用注册与清理
onMounted(() => {
  const handler = () => console.log('resize');
  window.addEventListener('resize', handler);
  onUnmounted(() => window.removeEventListener('resize', handler));
});
</script>
```

```ts
// 全局错误处理（main.ts）
const app = createApp(App);
app.config.errorHandler = (err, instance, info) => {
  reportError(err, { info, route: router.currentRoute.value.fullPath });
};
app.config.warnHandler = (msg, instance, trace) => {
  if (import.meta.env.PROD) return;
  console.warn(msg, trace);
};
```

### 追问

- 「生命周期、错误边界与调试钩子怎么用」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「生命周期、错误边界与调试钩子怎么用」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 生命周期、调试、错误边界，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 生命周期钩子最常见的误用是把它们当业务流程编排器，导致时序耦合严重
- 调试钩子更适合临时分析，不建议长期保留在生产业务代码里

## vue-performance-practice

title: Vue 性能优化：v-once、v-memo、shallowRef、虚拟列表怎么配合
followups: [vue-performance-practice-followup-1]
links: [08-performance/runtime-optimization]
difficulty: 资深
tags: [性能优化, v-memo, v-once]

### 一句话

v-once 适合真正静态且后续不再变化的内容；v-memo 适合某些高频列表或局部子树，把依赖比较显式化；要确保依赖数组写得准确；shallowRef / shallowReactive 适合大对象、不可变数据块、第三方实例。

### 题目

在 Vue 里做性能优化时，哪些优化是真有场景价值的，哪些只是“看起来高级”？

### 答案要点

- `v-once` 适合真正静态且后续不再变化的内容
- `v-memo` 适合某些高频列表或局部子树，把依赖比较显式化；要确保依赖数组写得准确
- `shallowRef` / `shallowReactive` 适合大对象、不可变数据块、第三方实例
- 虚拟列表、组件拆分、减少无意义响应式和稳定 props，通常比微调单个 API 更有收益

### 代码示例

```vue
<template>
  <!-- 1. v-once：只渲染一次（页面级常量配置） -->
  <header v-once>
    <Logo />
    <h1>{{ siteName }}</h1>
  </header>

  <!-- 2. v-memo：列表中按依赖跳过子树重渲染 -->
  <li v-for="item in items" :key="item.id" v-memo="[item.id, item.selected]">
    <Avatar :src="item.avatar" />
    {{ item.name }}
    <span v-if="item.selected">已选中</span>
  </li>
</template>

<script setup lang="ts">
import { shallowRef, markRaw } from 'vue';
import * as echarts from 'echarts';

// 3. shallowRef：包装大型第三方实例（不需要深层响应式）
const chart = shallowRef<echarts.ECharts | null>(null);

// 4. markRaw：彻底跳过响应式（性能敏感的常量）
const config = markRaw({
  options: {
    /* 大对象 */
  },
  schema: {
    /* 不变的元数据 */
  },
});

// 5. 大列表：先 shallowRef 再 triggerRef 控制刷新时机
import { triggerRef } from 'vue';
const list = shallowRef<Item[]>([]);
function patch(idx: number, patch: Partial<Item>) {
  Object.assign(list.value[idx], patch);
  triggerRef(list); // 手动触发更新
}
</script>
```

### 追问

- 你会先看哪些指标来判断「Vue 性能优化：v-once、v-memo、shallowRef、虚拟列表怎么配合」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Vue 性能优化：v-once、v-memo、shallowRef、虚拟列表怎么配合」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 性能优化、v-memo、v-once，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 优化前先定位瓶颈，不要把 `v-memo` 当默认写法
- Vue 官方对性能优化的建议一向是"先架构，再数据量，再微观指令"

## composables-design

title: composables 设计规范：命名、参数、返回值与副作用
followups: [composables-design-followup-1]
difficulty: 进阶
tags: [Composables, 复用, 设计]

### 一句话

composable 本质上是封装有状态逻辑的函数，命名通常以 useXxx 开头；返回多个状态时，优先返回“普通对象 + 多个 ref”，这样调用方解构后仍能保持响应性；输入参数若可能是原始值、ref 或 getter，设计时应统一归一化。

### 题目

一个高质量 composable 应该怎么设计，才能既好用又不容易埋下响应式和生命周期问题？

### 答案要点

- composable 本质上是封装有状态逻辑的函数，命名通常以 `useXxx` 开头
- 返回多个状态时，优先返回“普通对象 + 多个 ref”，这样调用方解构后仍能保持响应性
- 输入参数若可能是原始值、ref 或 getter，设计时应统一归一化；需要响应追踪时可结合 `watch`、`watchEffect` 和 `toValue()`
- 涉及 DOM、事件监听、定时器、订阅等副作用时，要在合适生命周期里注册和清理；SSR 下尤其要避免在服务端阶段直接访问 DOM

### 代码示例

```ts
// composables/useFetch.ts：高质量 composable 范式
import { ref, shallowRef, watch, toValue, type MaybeRefOrGetter } from 'vue';

interface UseFetchOptions {
  immediate?: boolean;
  retry?: number;
}

export function useFetch<T>(url: MaybeRefOrGetter<string>, opts: UseFetchOptions = {}) {
  const data = shallowRef<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);
  let ctrl: AbortController | null = null;

  async function execute() {
    ctrl?.abort();
    ctrl = new AbortController();
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(toValue(url), { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data.value = await res.json();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  // url 变化自动重新请求
  watch(() => toValue(url), execute, { immediate: opts.immediate ?? true });

  return { data, error, loading, execute, abort: () => ctrl?.abort() };
}
```

```vue
<!-- 使用：调用方解构后仍保持响应性 -->
<script setup lang="ts">
import { ref } from 'vue';
import { useFetch } from '@/composables/useFetch';

const id = ref('1');
// 传 getter 让 url 响应式
const { data, loading, error } = useFetch(() => `/api/users/${id.value}`);
</script>
```

### 追问

- 推动「composables 设计规范：命名、参数、返回值与副作用」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「composables 设计规范：命名、参数、返回值与副作用」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 Composables、复用、设计，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- composable 更像"组件内可复用服务"，不是随意拆出去的工具函数
- 如果 composable 返回整个 `reactive` 对象，调用方一旦直接解构，就容易丢失响应式连接

## nuxt3-overview

title: Nuxt 3 的核心价值：SSR、SSG、Nitro、payload
followups: [nuxt3-overview-followup-1]
links: [advanced-features, scheduler-nexttick, 08-performance/initial-load]
difficulty: 进阶
tags: [Nuxt, SSR]

### 一句话

Nuxt 3 = 基于 Vue3 的全栈元框架，解决路由、数据获取、SSR/SSG、部署适配、约定式工程结构；Nitro 统一了 Node、Edge、Serverless 等运行时抽象；页面支持 SSR、SSG、ISR 等输出模式。

### 题目

如果让你向一个只写过 SPA 的前端解释 Nuxt 3，你会如何说明它的价值与心智模型？

### 答案要点

- Nuxt 3 = 基于 Vue3 的全栈元框架，解决路由、数据获取、SSR/SSG、部署适配、约定式工程结构
- Nitro 统一了 Node、Edge、Serverless 等运行时抽象
- 页面支持 SSR、SSG、ISR 等输出模式，能兼顾 SEO、首屏和运维复杂度
- payload / hydration 负责把服务端获取的数据传给客户端，避免重复请求

### 代码示例

```vue
<!-- pages/posts/[slug].vue：约定式路由 + 服务端数据获取 -->
<script setup lang="ts">
const route = useRoute();

// 1. useFetch：SSR 自动序列化 payload，CSR 不会重复请求
const { data: post, error } = await useFetch(`/api/posts/${route.params.slug}`, {
  key: `post-${route.params.slug}`,
  transform: (res: any) => ({ ...res, viewedAt: Date.now() }),
});

// 2. SEO 元信息
useHead({
  title: () => post.value?.title ?? '文章',
  meta: [
    { name: 'description', content: () => post.value?.summary },
    { property: 'og:image', content: () => post.value?.cover },
  ],
});

// 3. ISR：定时重新生成（部署在支持的运行时上）
defineRouteRules({ swr: 600 }); // 10 分钟内复用缓存
</script>
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@vueuse/nuxt'],
  ssr: true,
  nitro: {
    preset: 'vercel-edge', // 部署到边缘
    routeRules: {
      '/': { prerender: true }, // 首页静态生成
      '/blog/**': { swr: 3600 }, // 1 小时 SWR
      '/admin/**': { ssr: false }, // 后台用 SPA
      '/api/**': { cors: true },
    },
  },
});
```

### 追问

- 在 Vue 项目里落地「Nuxt 3 的核心价值：SSR、SSG、Nitro、payload」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Nuxt 3 的核心价值：SSR、SSG、Nitro、payload」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 Nuxt、SSR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不是所有项目都该上 Nuxt；纯后台系统、重交互内网、离线优先工具型应用未必值得
- 但面向内容站、营销站、搜索流量入口时，Nuxt 往往显著降低 SSR 成本

## vapor-mode

title: Vue 3.5 Vapor Mode 与无 VDOM 渲染
followups: [vapor-mode-followup-1]
links: [diff-optimization]
difficulty: 资深
tags: [Vapor, 编译优化]

### 一句话

现状：Vue 默认使用虚拟 DOM；模板编译期已经做了大量优化（patchFlag / hoist / blockTree）；Vapor：编译目标改为"直接操作 DOM 的 imperative 代码"，类似 Solid，无 VDOM。

### 题目

Vue 团队在 3.5+ 推进的 Vapor Mode 是什么？跟 Solid 有什么相似点？

### 答案要点

- 现状：Vue 默认使用虚拟 DOM；模板编译期已经做了大量优化（patchFlag / hoist / blockTree）
- Vapor：编译目标改为"直接操作 DOM 的 imperative 代码"，类似 Solid，无 VDOM
- 收益：运行时体积更小、渲染路径更短、内存占用更低
- 渐进：可以以"组件级"开关，不强制全局切换
- 兼容：依赖 VDOM 的库（`<RouterView>`、`<Transition>`）需要适配；插件生态会逐步跟上
- 与 Composition API：响应式系统不变，只是渲染策略变了，业务代码几乎不动

### 代码示例

```vue
<script setup vapor lang="ts">
import { ref } from 'vue';

const count = ref(0);
const double = computed(() => count.value * 2);
</script>

<template>
  <button @click="count++">{{ count }} (x2 = {{ double }})</button>
</template>
```

### 追问

- 你会先看哪些指标来判断「Vue 3.5 Vapor Mode 与无 VDOM 渲染」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Vue 3.5 Vapor Mode 与无 VDOM 渲染」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Vapor、编译优化，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vapor Mode 的目标是"在保留 SFC 体验的前提下，性能贴近 Solid / Svelte"
- 大型组件库要做大改造（去掉 VDOM 假设），生态成熟会需要几个版本

## vue-perf-deep

title: Vue 项目大促前的性能体检清单
followups: [vue-perf-deep-followup-1]
difficulty: 资深
tags: [性能, Vue]

### 一句话

Bundle：看 rollup-plugin-visualizer 输出，定位巨石依赖；按路由 + 按特性切分；首屏：LCP 元素是什么、是否 SSR、关键 CSS 是否内联、字体是否阻塞。

### 题目

要给一个 Vue 大型项目做性能保障，你的检查清单怎么列？

### 答案要点

- Bundle：看 `rollup-plugin-visualizer` 输出，定位巨石依赖；按路由 + 按特性切分
- 首屏：LCP 元素是什么、是否 SSR、关键 CSS 是否内联、字体是否阻塞
- 响应式：`<script setup>` 内大对象用 `shallowRef / markRaw`；列表 item 用 `defineProps` + `withDefaults` 避免运行时合并
- 渲染：长列表 `vue-virtual-scroller`、表格 `el-table-v2`；非交互区改为 `v-once`
- 状态：Pinia store 读多写少的派生改为 `getters`，避免组件内 `computed` 重复
- 网络：接口聚合、SWR 缓存（`@tanstack/vue-query`）；关键接口加 prefetch
- 构建：升级 Vite，开启 `build.target: esnext` + `cssCodeSplit`，第三方 vendor 单独 chunk
- 监控：上线 web-vitals + Vue 错误处理器，回归看 INP / LCP

### 代码示例

```ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue(), visualizer({ filename: 'stats.html' })],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          echarts: ['echarts'],
          editor: ['monaco-editor'],
        },
      },
    },
  },
});
```

```vue
<script setup lang="ts">
import { shallowRef, markRaw } from 'vue';
import { hugeStaticDataset } from './data';

const dataset = shallowRef(markRaw(hugeStaticDataset));
</script>
```

### 追问

- 你会先看哪些指标来判断「Vue 项目大促前的性能体检清单」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Vue 项目大促前的性能体检清单」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 性能、Vue，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真实生产环境性能问题大多是"首屏阻塞 + 列表渲染过大 + 接口慢"组合，不要只盯前端
- 性能优化要立项做长期规划，加预算和监控；零散修复很快会被新需求冲掉

## vue3-vs-vue2-reactivity

title: Vue 3 的 Proxy 响应式相比 Vue 2 的 defineProperty 解决了什么
followups: [vue3-vs-vue2-reactivity-followup-1]
links: [computed-watch, effect-track-trigger, reactivity-core]
difficulty: 进阶
tags: [响应式, Vue3]

### 一句话

Vue 2 给每个属性单独装监听器（新增/删除属性、数组下标都漏），Vue 3 用 Proxy 直接拦截整个对象的读写，啥操作都能拦到。

### 题目

Vue 3 的响应式系统相比 Vue 2 的 Object.defineProperty 有哪些根本性改进？

### 答案要点

- Vue 2：递归遍历对象给每个 key 加 getter/setter；新增/删除属性需要 `Vue.set / Vue.delete`；数组靠 7 个变异方法 hack
- Vue 3：Proxy 拦截整个对象，**惰性递归**（访问到才代理子对象），新增/删除/数组下标全部可监听
- Vue 3 还把依赖结构换成 `WeakMap<target, Map<key, Set<effect>>>`，依赖收集和触发都更高效
- `ref` 处理基本类型（用 `.value` 包装）；`reactive` 处理对象（不能解构，需要 `toRefs`）
- 副作用统一为 `effect`，`computed` / `watch` 都是其上层封装

### 代码示例

```js
function reactive(obj) {
  const dep = new Map();
  return new Proxy(obj, {
    get(t, k, r) {
      track(dep, k);
      const v = Reflect.get(t, k, r);
      return v && typeof v === 'object' ? reactive(v) : v;
    },
    set(t, k, v, r) {
      const ok = Reflect.set(t, k, v, r);
      trigger(dep, k);
      return ok;
    },
  });
}

let activeEffect = null;
function effect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}
function track(dep, k) {
  if (!activeEffect) return;
  if (!dep.has(k)) dep.set(k, new Set());
  dep.get(k).add(activeEffect);
}
function trigger(dep, k) {
  dep.get(k)?.forEach((f) => f());
}
```

### 追问

- 在 Vue 项目里落地「Vue 3 的 Proxy 响应式相比 Vue 2 的 defineProperty 解决了什么」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue 3 的 Proxy 响应式相比 Vue 2 的 defineProperty 解决了什么」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 响应式、Vue3，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Proxy 不能监听到原始类型的赋值，所以才需要 ref
- `shallowRef` / `shallowReactive` 用于性能场景，避免深层代理开销
- Vue 3.4+ 引入更高效的 v-bind 优化与基于编译时的响应式追踪

## vue-component-communication

title: Vue 3 组件之间通信有哪些方式
followups: [vue-component-communication-followup-1]
difficulty: 基础
tags: [组件, Vue3]

### 一句话

父→子用 props，子→父用 emit，双向用 v-model，跨层级用 provide/inject，任意组件用 Pinia / 事件总线。

### 题目

父子、兄弟、跨层级组件分别怎么通信，各自适合什么场景？

### 答案要点

- **父→子**：`props`（推荐）
- **子→父**：`emit`（声明式 `defineEmits` 强类型）
- **双向**：`v-model`（默认 modelValue + update:modelValue，可定义多个）
- **跨层级（祖→后代）**：`provide / inject`（适合主题、i18n、表单）
- **任意组件**：Pinia / 全局事件总线（mitt） / `useGlobalState`
- **组件实例引用**：`ref` + `defineExpose`（适合命令式调用，如表单 validate）
- **插槽**：作用域插槽传数据给父组件渲染

### 代码示例

```vue
<script setup lang="ts">
const props = defineProps<{ value: number }>();
const emit = defineEmits<{ 'update:value': [v: number] }>();

import { provide } from 'vue';
provide('theme', { color: 'blue' });

import { useGlobalStore } from '@/stores';
const store = useGlobalStore();

defineExpose({ focus: () => inputEl.value?.focus() });
</script>
```

### 追问

- 在 Vue 项目里落地「Vue 3 组件之间通信有哪些方式」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue 3 组件之间通信有哪些方式」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 组件、Vue3，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Pinia 是 Vuex 4 的官方继任者，组合式 API 设计
- 组件库通常用 provide/inject 共享配置（如 ConfigProvider）
- 大量跨组件状态用 mitt 比事件总线更轻量

## vue-async-component-suspense

title: Vue 3 异步组件 + Suspense 怎么做骨架屏与错误兜底
followups: [vue-async-component-suspense-followup-1]
difficulty: 进阶
tags: [异步, 性能]

### 一句话

`defineAsyncComponent` 包动态 import，配合 `<Suspense>` 在异步组件加载时显示骨架屏，加载失败显示错误兜底——开箱即用的优雅 loading 体验。

### 题目

defineAsyncComponent 和 Suspense 如何配合实现优雅的加载体验？

### 答案要点

- `defineAsyncComponent` 包装动态 import，可指定 loading / error / delay / timeout
- `<Suspense>` 内置组件，等待异步 setup() 完成；提供 `#default` 与 `#fallback`
- Suspense 适配 SSR 流式渲染（streaming hydration）
- 错误边界用 `onErrorCaptured` 或 `<Suspense @resolve @fallback>` 事件
- 路由级懒加载：`component: () => import('./X.vue')` 已自动支持

### 代码示例

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import Skeleton from './Skeleton.vue';
import ErrorBox from './ErrorBox.vue';

const Heavy = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  loadingComponent: Skeleton,
  errorComponent: ErrorBox,
  delay: 200,
  timeout: 5000,
});
</script>

<template>
  <Suspense>
    <template #default>
      <Heavy />
    </template>
    <template #fallback>
      <Skeleton />
    </template>
  </Suspense>
</template>
```

### 追问

- 你会先看哪些指标来判断「Vue 3 异步组件 + Suspense 怎么做骨架屏与错误兜底」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Vue 3 异步组件 + Suspense 怎么做骨架屏与错误兜底」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 异步、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Suspense 仍是 experimental，但生产中已被广泛使用
- Nuxt 3 完全基于 Suspense + asyncData
- 大型路由可结合 webpack/vite 的 prefetch / preload 提示

## vue2-vs-vue3-followup-1

title: 追问：在 Vue 项目里落地「Vue2 与 Vue3 的设计差异总览」时，响应式边界和组件更新时机要注意什么
difficulty: 基础
tags: [架构, 响应式, 迁移, 追问]
parent: vue2-vs-vue3

### 题目

如果面试官追问：在 Vue 项目里落地「Vue2 与 Vue3 的设计差异总览」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue2 与 Vue3 的设计差异总览」拆成可验证的小步骤，逐步替换高风险部分。

## reactivity-core-followup-1

title: 追问：在 Vue 项目里落地「reactive、ref、shallow、readonly、toRef 的选择策略」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [响应式, API, 追问]
parent: reactivity-core

### 题目

如果面试官追问：在 Vue 项目里落地「reactive、ref、shallow、readonly、toRef 的选择策略」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「reactive、ref、shallow、readonly、toRef 的选择策略」拆成可验证的小步骤，逐步替换高风险部分。

## reactivity-core-followup-2

title: 追问：如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证
difficulty: 进阶
tags: [响应式, API, 追问]
parent: reactivity-core

### 题目

如果面试官追问：如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「reactive、ref、shallow、readonly、toRef 的选择策略」不是只在理想输入下成立。
- 再补可观测指标：响应式与组件边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## reactivity-core-followup-3

title: 追问：它和常见替代方案相比，适合什么团队规模和业务复杂度
difficulty: 进阶
tags: [响应式, API, 追问]
parent: reactivity-core

### 题目

如果面试官追问：它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「reactive、ref、shallow、readonly、toRef 的选择策略」拆成可验证的小步骤，逐步替换高风险部分。

## effect-track-trigger-followup-1

title: 追问：在 Vue 项目里落地「Vue3 响应式系统的 track / trigger 是怎么工作的」时，响应式边界和组件更新时机要注意什么
difficulty: 资深
tags: [响应式, 原理, 追问]
parent: effect-track-trigger

### 题目

如果面试官追问：在 Vue 项目里落地「Vue3 响应式系统的 track / trigger 是怎么工作的」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue3 响应式系统的 track / trigger 是怎么工作的」拆成可验证的小步骤，逐步替换高风险部分。

## scheduler-nexttick-followup-1

title: 追问：你会先看哪些指标来判断「Scheduler、批量更新与 nextTick 的真实含义」是不是当前性能瓶颈
difficulty: 进阶
tags: [渲染, 调度, 追问]
parent: scheduler-nexttick

### 题目

如果面试官追问：你会先看哪些指标来判断「Scheduler、批量更新与 nextTick 的真实含义」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Scheduler、批量更新与 nextTick 的真实含义」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## computed-watch-followup-1

title: 追问：在 Vue 项目里落地「computed、watch、watchEffect 的区别与选型」时，响应式边界和组件更新时机要注意什么
difficulty: 基础
tags: [响应式, API, 追问]
parent: computed-watch

### 题目

如果面试官追问：在 Vue 项目里落地「computed、watch、watchEffect 的区别与选型」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「computed、watch、watchEffect 的区别与选型」拆成可验证的小步骤，逐步替换高风险部分。

## computed-watch-followup-2

title: 追问：如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证
difficulty: 基础
tags: [响应式, API, 追问]
parent: computed-watch

### 题目

如果面试官追问：如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「computed、watch、watchEffect 的区别与选型」不是只在理想输入下成立。
- 再补可观测指标：响应式与组件边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## computed-watch-followup-3

title: 追问：它和常见替代方案相比，适合什么团队规模和业务复杂度
difficulty: 基础
tags: [响应式, API, 追问]
parent: computed-watch

### 题目

如果面试官追问：它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「computed、watch、watchEffect 的区别与选型」拆成可验证的小步骤，逐步替换高风险部分。

## diff-optimization-followup-1

title: 追问：在 Vue 项目里落地「Vue3 diff 为什么比 Vue2 更省？LIS、PatchFlag、Block Tree 起了什么作用」时，响应式边界和组件更新时机要注意什么
difficulty: 资深
tags: [diff, 编译优化, 追问]
parent: diff-optimization

### 题目

如果面试官追问：在 Vue 项目里落地「Vue3 diff 为什么比 Vue2 更省？LIS、PatchFlag、Block Tree 起了什么作用」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue3 diff 为什么比 Vue2 更省？LIS、PatchFlag、Block Tree 起了什么作用」拆成可验证的小步骤，逐步替换高风险部分。

## diff-optimization-followup-2

title: 追问：如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证
difficulty: 资深
tags: [diff, 编译优化, 追问]
parent: diff-optimization

### 题目

如果面试官追问：如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vue3 diff 为什么比 Vue2 更省？LIS、PatchFlag、Block Tree 起了什么作用」不是只在理想输入下成立。
- 再补可观测指标：响应式与组件边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## diff-optimization-followup-3

title: 追问：它和常见替代方案相比，适合什么团队规模和业务复杂度
difficulty: 资深
tags: [diff, 编译优化, 追问]
parent: diff-optimization

### 题目

如果面试官追问：它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue3 diff 为什么比 Vue2 更省？LIS、PatchFlag、Block Tree 起了什么作用」拆成可验证的小步骤，逐步替换高风险部分。

## sfc-compile-followup-1

title: 追问：「模板编译、SFC 编译与 `<script setup>` 的编译产物」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [编译, SFC, 追问]
parent: sfc-compile

### 题目

如果面试官追问：「模板编译、SFC 编译与 `<script setup>` 的编译产物」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「模板编译、SFC 编译与 `<script setup>` 的编译产物」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「模板编译分三步：parse -> transform -> generate」要进一步补到边界条件里，而不是只复述结论。

## component-communication-followup-1

title: 追问：在 Vue 项目里落地「Vue 组件通信方案怎么选」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [组件通信, 设计, 追问]
parent: component-communication

### 题目

如果面试官追问：在 Vue 项目里落地「Vue 组件通信方案怎么选」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue 组件通信方案怎么选」拆成可验证的小步骤，逐步替换高风险部分。

## pinia-router-followup-1

title: 追问：在 Vue 项目里落地「Pinia 与 Vue Router 4 的工程实践」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [Pinia, Router, 追问]
parent: pinia-router

### 题目

如果面试官追问：在 Vue 项目里落地「Pinia 与 Vue Router 4 的工程实践」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Pinia 与 Vue Router 4 的工程实践」拆成可验证的小步骤，逐步替换高风险部分。

## advanced-features-followup-1

title: 追问：「KeepAlive、Teleport、Suspense、异步组件分别解决什么问题」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [高级组件, SSR, 追问]
parent: advanced-features

### 题目

如果面试官追问：「KeepAlive、Teleport、Suspense、异步组件分别解决什么问题」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「KeepAlive、Teleport、Suspense、异步组件分别解决什么问题」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「KeepAlive 用于缓存组件实例和状态，适合 tab、多页签详情；需配合 include/exclude/max」要进一步补到边界条件里，而不是只复述结论。

## render-jsx-directive-followup-1

title: 追问：「render 函数、JSX 与自定义指令分别适合什么场景」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [RenderFunction, JSX, 指令, 追问]
parent: render-jsx-directive

### 题目

如果面试官追问：「render 函数、JSX 与自定义指令分别适合什么场景」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「render 函数、JSX 与自定义指令分别适合什么场景」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「模板适合绝大多数声明式 UI；render 函数 / JSX 更适合高度动态结构、插槽编排、函数式抽象和需要直接操作 vnode 的场景」要进一步补到边界条件里，而不是只复述结论。

## lifecycle-debug-hooks-followup-1

title: 追问：「生命周期、错误边界与调试钩子怎么用」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [生命周期, 调试, 错误边界, 追问]
parent: lifecycle-debug-hooks

### 题目

如果面试官追问：「生命周期、错误边界与调试钩子怎么用」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「生命周期、错误边界与调试钩子怎么用」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「onErrorCaptured 用于捕获后代组件渲染、事件、watcher 等过程中的异常，常用于局部错误降级」要进一步补到边界条件里，而不是只复述结论。

## vue-performance-practice-followup-1

title: 追问：你会先看哪些指标来判断「Vue 性能优化：v-once、v-memo、shallowRef、虚拟列表怎么配合」是不是当前性能瓶颈
difficulty: 资深
tags: [性能优化, v-memo, v-once, 追问]
parent: vue-performance-practice

### 题目

如果面试官追问：你会先看哪些指标来判断「Vue 性能优化：v-once、v-memo、shallowRef、虚拟列表怎么配合」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vue 性能优化：v-once、v-memo、shallowRef、虚拟列表怎么配合」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## composables-design-followup-1

title: 追问：推动「composables 设计规范：命名、参数、返回值与副作用」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [Composables, 复用, 设计, 追问]
parent: composables-design

### 题目

如果面试官追问：推动「composables 设计规范：命名、参数、返回值与副作用」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「composables 设计规范：命名、参数、返回值与副作用」拆成可验证的小步骤，逐步替换高风险部分。

## nuxt3-overview-followup-1

title: 追问：在 Vue 项目里落地「Nuxt 3 的核心价值：SSR、SSG、Nitro、payload」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [Nuxt, SSR, 追问]
parent: nuxt3-overview

### 题目

如果面试官追问：在 Vue 项目里落地「Nuxt 3 的核心价值：SSR、SSG、Nitro、payload」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Nuxt 3 的核心价值：SSR、SSG、Nitro、payload」拆成可验证的小步骤，逐步替换高风险部分。

## vapor-mode-followup-1

title: 追问：你会先看哪些指标来判断「Vue 3.5 Vapor Mode 与无 VDOM 渲染」是不是当前性能瓶颈
difficulty: 资深
tags: [Vapor, 编译优化, 追问]
parent: vapor-mode

### 题目

如果面试官追问：你会先看哪些指标来判断「Vue 3.5 Vapor Mode 与无 VDOM 渲染」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vue 3.5 Vapor Mode 与无 VDOM 渲染」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## vue-perf-deep-followup-1

title: 追问：你会先看哪些指标来判断「Vue 项目大促前的性能体检清单」是不是当前性能瓶颈
difficulty: 资深
tags: [性能, Vue, 追问]
parent: vue-perf-deep

### 题目

如果面试官追问：你会先看哪些指标来判断「Vue 项目大促前的性能体检清单」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vue 项目大促前的性能体检清单」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## vue3-vs-vue2-reactivity-followup-1

title: 追问：在 Vue 项目里落地「Vue 3 的 Proxy 响应式相比 Vue 2 的 defineProperty 解决了什么」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [响应式, Vue3, 追问]
parent: vue3-vs-vue2-reactivity

### 题目

如果面试官追问：在 Vue 项目里落地「Vue 3 的 Proxy 响应式相比 Vue 2 的 defineProperty 解决了什么」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue 3 的 Proxy 响应式相比 Vue 2 的 defineProperty 解决了什么」拆成可验证的小步骤，逐步替换高风险部分。

## vue-component-communication-followup-1

title: 追问：在 Vue 项目里落地「Vue 3 组件之间通信有哪些方式」时，响应式边界和组件更新时机要注意什么
difficulty: 基础
tags: [组件, Vue3, 追问]
parent: vue-component-communication

### 题目

如果面试官追问：在 Vue 项目里落地「Vue 3 组件之间通信有哪些方式」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue 3 组件之间通信有哪些方式」拆成可验证的小步骤，逐步替换高风险部分。

## vue-async-component-suspense-followup-1

title: 追问：你会先看哪些指标来判断「Vue 3 异步组件 + Suspense 怎么做骨架屏与错误兜底」是不是当前性能瓶颈
difficulty: 进阶
tags: [异步, 性能, 追问]
parent: vue-async-component-suspense

### 题目

如果面试官追问：你会先看哪些指标来判断「Vue 3 异步组件 + Suspense 怎么做骨架屏与错误兜底」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vue 3 异步组件 + Suspense 怎么做骨架屏与错误兜底」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。
