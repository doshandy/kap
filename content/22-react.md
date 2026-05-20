---
id: 22-react
title: React 重点
order: 22
icon: ⚛️
description: Hooks、并发渲染、Suspense、RSC、状态管理与 React 生态核心机制。
---

## react-vs-vue-mental-model

title: React 和 Vue 的心智模型本质差异
followups: [react-vs-vue-mental-model-followup-1, react-vs-vue-mental-model-followup-2, react-vs-vue-mental-model-followup-3]
difficulty: 进阶
tags: [React, Vue, 框架]

### 一句话

React 是"重新跑一遍组件函数"，靠不可变状态 + diff 来更新；Vue 是"响应式数据驱动局部更新"，编译期就知道哪里会变。前者更显式，后者更自动。

### 题目

都是组件化框架，React 和 Vue 在响应式、渲染策略、数据流上的核心差异是什么？

### 答案要点

- 响应式：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"
- 渲染：Vue 模板可静态分析做编译期优化（hoist、patchFlag）；React JSX 是 JS 表达式，运行时全靠 diff + memo
- 数据流：Vue 双向（v-model 是糖）；React 单向（受控/非受控两种风格）
- 副作用：Vue `watch / watchEffect` 自动追踪；React `useEffect` 必须手动列依赖
- 共性：都向 Signals 形态靠拢（Vue 3.4+ ref / React Forget），背后都是细粒度依赖

### 代码示例

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const double = useMemo(() => count * 2, [count]);
  useEffect(() => {
    document.title = `count = ${count}`;
  }, [count]);

  return (
    <button onClick={() => setCount((c) => c + 1)}>
      {count} (x2 = {double})
    </button>
  );
}
```

```vue
<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
const count = ref(0);
const double = computed(() => count.value * 2);
watchEffect(() => {
  document.title = `count = ${count.value}`;
});
</script>

<template>
  <button @click="count++">{{ count }} (x2 = {{ double }})</button>
</template>
```

### 追问

- 在 Vue 项目里落地「React 和 Vue 的心智模型本质差异」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「React 和 Vue 的心智模型本质差异」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 React、Vue、框架，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React Compiler（原 React Forget）和 Vue 3.5 的 Vapor Mode 都在向"自动 memo"演进
- 选型不是非此即彼，团队熟悉度、生态、招聘市场比技术细节更重要

## react-hooks-rules

title: Hooks 的核心规则与原理
followups: [react-hooks-rules-followup-1, react-hooks-rules-followup-2, react-hooks-rules-followup-3]
links: [use-effect-pitfalls]
difficulty: 进阶
tags: [Hooks, 原理]

### 一句话

Hooks 必须按相同顺序调用（不能在 if/循环里），React 靠"调用顺序"区分谁是哪个 state；每次渲染都是一次函数重跑，闭包里看到的是当时那一帧的值。

### 题目

为什么 Hooks 必须在组件顶层、不能在条件分支里调用？React 内部是怎么实现的？

### 答案要点

- Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位
- React 在每次渲染时维护 `currentlyRenderingFiber.memoizedState` 单链表，按调用顺序遍历
- 自定义 Hook 是普通函数，但同样受顺序约束，因为它内部调用了其他 Hooks
- 错误用法（条件 / 循环里调用）在 dev 模式由 `react-hooks/rules-of-hooks` 静态检查

### 代码示例

```tsx
function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function Search() {
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 300);
  useEffect(() => {
    if (debounced) fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
  }, [debounced]);
  return <input value={q} onChange={(e) => setQ(e.target.value)} />;
}
```

### 追问

- 在 React 项目里应用「Hooks 的核心规则与原理」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「Hooks 的核心规则与原理」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 Hooks、原理，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React 19 的 `use(promise)` 让 hook 能"从条件中读取"，但仅限于 use，并基于 Suspense 协议
- React Compiler 会自动插入 `useMemo / useCallback`，未来手写 memo 的需求会越来越少

## use-effect-pitfalls

title: useEffect 常见陷阱与依赖管理
followups: [use-effect-pitfalls-followup-1, use-effect-pitfalls-followup-2, use-effect-pitfalls-followup-3]
links: [react-hooks-rules]
difficulty: 进阶
tags: [useEffect, 陷阱]

### 一句话

useEffect 不是"组件挂载/更新生命周期"，是"和外部世界同步"。派生值用 `useMemo`、事件用 handler，能不写 effect 就别写。

### 题目

为什么人们说"`useEffect` 是 React 里最难用的 hook"？常见坑有哪些？

### 答案要点

- 依赖数组不全：导致捕获旧值（stale closure），看似"没起效"
- 依赖太多：函数 / 对象每次新建会触发死循环，常见解法是 `useCallback / useMemo` 或 ref
- 副作用本不该用 effect：派生数据用 `useMemo`，事件处理用 handler，不要塞进 effect
- StrictMode 双调用：开发期 effect 会跑两次，必须保证副作用幂等并清理
- 异步陷阱：effect 里 await 后 setState 时组件可能已卸载，要用 ignore 标志或 AbortController

### 代码示例

```tsx
function User({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/users/${id}`, { signal: ac.signal })
      .then((r) => r.json())
      .then(setUser)
      .catch((e) => {
        if (e.name !== 'AbortError') console.error(e);
      });
    return () => ac.abort();
  }, [id]);
  return user ? <pre>{JSON.stringify(user)}</pre> : <p>Loading...</p>;
}
```

### 常见误区

- 依赖数组少写 → 闭包持有过期的 state（「stale closure」）
- 在 effect 里 setState 触发死循环——条件没收敛
- 把异步函数直接传给 useEffect（return 不是 cleanup 而是 Promise）
- 严格模式下 effect 跑两次，是 React 主动让你发现幂等问题，不是 bug

### 追问

- useEffect 和 useLayoutEffect 何时选哪个
- React 18 自动批处理对 effect 的影响
- useRef + useEffect 模拟「上一次值」的写法

### 延伸

- React 官方的「You Might Not Need an Effect」是必读，大量场景其实不需要 effect
- 数据请求建议交给 React Query / SWR / RSC，比手写 effect 稳定得多

## react-reconciler-fiber

title: Fiber 架构与并发渲染
followups: [react-reconciler-fiber-followup-1, react-reconciler-fiber-followup-2, react-reconciler-fiber-followup-3]
difficulty: 资深
tags: [Fiber, Concurrent]

### 一句话

Fiber 把组件树的协调过程拆成"可中断 + 可恢复的小任务"，让浏览器可以先处理用户输入、动画再回来渲染——这是 startTransition / useDeferredValue 能"插队不卡顿"的底层基础。

### 题目

Fiber 是什么？React 18 的并发渲染解决了什么问题？

### 答案要点

- Fiber 是 React 16+ 的渲染单元，把组件树拆成可中断、可恢复的工作单元链表
- 并发渲染：渲染分 render 阶段（可中断）和 commit 阶段（同步原子），高优更新可以打断低优
- 优先级 Lane 模型替代旧的 expirationTime，支持多任务交错
- 关键 API：`startTransition`（标记低优）、`useDeferredValue`（延迟读取）、`Suspense`（声明加载边界）
- 用户输入永远高优，列表 / 大图渲染可降级为 transition，避免阻塞输入

### 代码示例

```tsx
function SearchPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    startTransition(() => {
      setList(filterHugeList(e.target.value));
    });
  }
  return (
    <>
      <input value={q} onChange={onChange} />
      {pending && <Spinner />}
      <List items={list} />
    </>
  );
}
```

### 追问

- 你会先看哪些指标来判断「Fiber 架构与并发渲染」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Fiber 架构与并发渲染」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Fiber、Concurrent，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 并发不是"多线程"，仍然是单线程时间分片，长任务依然会卡，只是 React 给了一种"分批"能力
- 真正的多线程方案是 Web Worker / OffscreenCanvas，React 19 也在探索 React in Worker

## react-server-components

title: React Server Components
followups: [react-server-components-followup-1, react-server-components-followup-2, react-server-components-followup-3]
links: [10-architecture/islands-rsc, 24-fullstack-meta/next-data-fetching-patterns]
difficulty: 资深
tags: [RSC, Next.js]

### 一句话

RSC 让一部分组件只在服务端跑（直接读数据库、不打包到客户端），客户端组件按需 hydrate——结果是首屏更快、bundle 更小、数据请求更少。 (RSC) 的本质和价值

### 题目

RSC 跟 SSR 有什么区别？为什么说它"零 JS 包"是革命性的？

### 答案要点

- SSR：服务端渲出 HTML 再 hydration，组件代码仍要打到客户端 bundle
- RSC：组件分服务端组件 (`.server.tsx`) 和客户端组件，服务端组件的代码不下发到浏览器
- 服务端组件可以直接 await 数据库、读文件、调密钥，输出"序列化的 React 树"通过流式传给客户端
- 客户端组件需要 `'use client'` 标记，承担交互；两者可以无缝嵌套
- 收益：bundle 更小、首屏更快、数据请求更近、避免接口蔓延
- 限制：服务端组件不能用 useState / useEffect / 浏览器 API；要靠框架（Next App Router）做编排

### 代码示例

```tsx
// app/posts/page.tsx (Server Component)
import { Comments } from './Comments'; // Client Component

async function getPosts() {
  return fetch('https://api/posts', { next: { revalidate: 60 } }).then((r) => r.json());
}

export default async function Page() {
  const posts = await getPosts();
  return (
    <div>
      {posts.map((p: Post) => (
        <article key={p.id}>
          <h2>{p.title}</h2>
          <Comments postId={p.id} />
        </article>
      ))}
    </div>
  );
}
```

```tsx
// app/posts/Comments.tsx
'use client';
import { useState } from 'react';

export function Comments({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen((v) => !v)}>{open ? '收起' : '展开评论'}</button>;
}
```

### 常见误区

- RSC 里不能用 `useState`、`useEffect`、`window`——它在服务端跑
- 把 'use client' 写到入口反而把整个子树都 client 化
- RSC payload 不是 JSON 是行级流（避免字符串解析阻塞）

### 追问

- Server Action 和 RSC 关系
- 为什么 RSC 能减小 client bundle
- 老 SPA 怎么平滑迁移到 RSC

### 延伸

- RSC 在大型应用收益更明显（电商详情页、Dashboard），小型站点提升不一定超过复杂度成本
- Vue 阵营对应的探索是 Nuxt 的 island components 与 server components

## state-management-react

title: React 状态管理选型
followups: [state-management-react-followup-1, state-management-react-followup-2, state-management-react-followup-3]
difficulty: 进阶
tags: [状态管理, Redux, Zustand]

### 一句话

组件内：useState；父子穿透：Context；跨组件全局：Redux Toolkit / Zustand / Jotai；服务端数据：React Query / SWR——别把后端缓存塞进 Redux。：Context / Redux / Zustand / Jotai / Recoil

### 题目

什么时候用 Context，什么时候上 Redux / Zustand / Jotai？这些库的设计取舍是什么？

### 答案要点

- Context：只适合"低频变更 + 全局静态值"（主题、locale），频繁变更会让所有 consumer 重渲染
- Redux：可预测、可调试，适合复杂业务、需要中间件 / DevTools / 时间旅行
- Zustand：轻量、无样板、selector 自动避免无关重渲染，是 90% 中小型应用的最优解
- Jotai / Recoil：原子化模型，状态拆成最小单元，依赖自动派生，适合大表单、画布
- 服务端状态：交给 React Query / SWR / RTK Query，不要混进客户端状态库

### 代码示例

```ts
import { create } from 'zustand';

interface CartStore {
  items: { id: string; qty: number }[];
  add: (id: string) => void;
  remove: (id: string) => void;
  total: () => number;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  add: (id) =>
    set((s) => {
      const item = s.items.find((i) => i.id === id);
      return item
        ? { items: s.items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) }
        : { items: [...s.items, { id, qty: 1 }] };
    }),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  total: () => get().items.reduce((s, i) => s + i.qty, 0),
}));

function Cart() {
  const total = useCart((s) => s.total());
  return <span>共 {total} 件</span>;
}
```

### 追问

- 在 React 项目里应用「React 状态管理选型」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「React 状态管理选型」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 状态管理、Redux、Zustand，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 状态管理库不解决业务复杂度，只是组织方式；先把"哪些是服务端状态、哪些是客户端状态、哪些是 URL 状态"分清楚
- React 19 的 `useOptimistic / useFormState` 让一部分场景可以不用外部库

## react-suspense-data

title: Suspense 与异步数据加载
followups: [react-suspense-data-followup-1, react-suspense-data-followup-2, react-suspense-data-followup-3]
difficulty: 资深
tags: [Suspense, 数据加载]

### 一句话

Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支；配合 use(promise) / RSC / React Query suspense mode / Relay 等。

### 题目

Suspense 怎么和数据请求结合？为什么说它会成为未来的主流数据加载方式？

### 答案要点

- Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支
- 配合 `use(promise)` / RSC / React Query suspense mode / Relay 等
- 错误边界 (`<ErrorBoundary>`) 处理 reject，形成"加载、错误、内容"声明式三态
- 配合 `startTransition` 可以避免每次切换都闪烁，保留旧数据直到新数据就绪
- 在 RSC 中天然适配流式 HTML，浏览器边收边渲染

### 代码示例

```tsx
import { Suspense, use } from 'react';

function Posts({ promise }: { promise: Promise<Post[]> }) {
  const posts = use(promise);
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

export default function Page() {
  const promise = fetch('/api/posts').then((r) => r.json() as Promise<Post[]>);
  return (
    <Suspense fallback={<Skeleton />}>
      <ErrorBoundary
        fallback={
          <p>
            加载失败，<button>重试</button>
          </p>
        }
      >
        <Posts promise={promise} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

### 追问

- 「Suspense 与异步数据加载」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Suspense 与异步数据加载」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Suspense、数据加载，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要把 promise 创建放在组件里直接 use，每次渲染都会新建 promise；要么 RSC 中创建，要么用支持 cache 的 hook
- React Query 的 suspense mode 能直接让所有 query 走 Suspense + ErrorBoundary

## react-router-data-loaders

title: React Router v6.4+ 的 Data Router 与 loaders
followups: [react-router-data-loaders-followup-1, react-router-data-loaders-followup-2, react-router-data-loaders-followup-3]
difficulty: 进阶
tags: [Router, 数据加载]

### 一句话

路由级 loader 在切换前并行发起请求，配合 defer / Await 可以做"先关键内容 + 流式补齐"；action 接管表单提交，自动 revalidate 当前路由 loader，写后立即看到最新数据。

### 题目

React Router 的 loader / action 模式解决了什么？相比传统在组件里 fetch 有什么优势？

### 答案要点

- 路由级 loader 在切换前并行发起请求，配合 defer / Await 可以做"先关键内容 + 流式补齐"
- action 接管表单提交，自动 revalidate 当前路由 loader，写后立即看到最新数据
- errorElement 让每条路由有自己的错误兜底
- 与 RSC 思路一致：把数据获取靠近路由层，避免组件里散落的 useEffect fetch
- 支持滚动恢复、并发预加载、`useNavigation()` 获取过渡状态

### 代码示例

```tsx
import { createBrowserRouter, defer, Await } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/posts/:id',
    loader: async ({ params }) => {
      const post = await fetch(`/api/posts/${params.id}`).then((r) => r.json());
      const comments = fetch(`/api/posts/${params.id}/comments`).then((r) => r.json());
      return defer({ post, comments });
    },
    element: <PostPage />,
    errorElement: <ErrorPage />,
  },
]);

function PostPage() {
  const { post, comments } = useLoaderData() as { post: Post; comments: Promise<Comment[]> };
  return (
    <>
      <h1>{post.title}</h1>
      <Suspense fallback={<p>加载评论...</p>}>
        <Await resolve={comments}>{(list: Comment[]) => <CommentList items={list} />}</Await>
      </Suspense>
    </>
  );
}
```

### 追问

- 在 React 项目里应用「React Router v6.4+ 的 Data Router 与 loaders」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「React Router v6.4+ 的 Data Router 与 loaders」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 Router、数据加载，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Remix 把这套理念发扬光大，App Router 后来也借鉴了
- Vue 阵营对应的是 Nuxt 的 `useAsyncData` / `definePageMeta` 数据钩子

## react-perf

title: React 性能优化清单
followups: [react-perf-followup-1, react-perf-followup-2, react-perf-followup-3]
difficulty: 进阶
tags: [性能, memo, 虚拟化]

### 一句话

React 卡顿基本就两类：渲染次数太多（memo / 拆组件 / 把 state 下沉）、单次渲染太重（useMemo / 虚拟列表 / startTransition 把昂贵的部分延后）。

### 题目

组件多、列表长、动画卡顿时，React 应用怎么排查和优化？

### 答案要点

- 首先用 React DevTools Profiler 录一段，看哪个组件 commit 时间长、commit 次数多
- 重渲染源：父组件渲染、context 更新、新建对象 / 函数 prop 引用变了
- 解法：组件 split + `React.memo` + 稳定引用（useMemo / useCallback）；context 拆细
- 长列表用 `react-virtual` / `react-window`，图片懒加载 + LQIP；图表 / 复杂计算丢 Web Worker
- 受控大表单：把每个字段拆成独立组件 + 局部状态，或用 react-hook-form 的 uncontrolled 模式
- 关键交互用 `useTransition` 把非紧急更新降级，保证输入响应

### 代码示例

```tsx
const Row = memo(function Row({ item, onClick }: { item: Item; onClick: (id: string) => void }) {
  return <div onClick={() => onClick(item.id)}>{item.name}</div>;
});

function List({ items }: { items: Item[] }) {
  const handleClick = useCallback((id: string) => {
    console.log('click', id);
  }, []);
  return (
    <FixedSizeList height={400} width="100%" itemCount={items.length} itemSize={36}>
      {({ index, style }) => (
        <div style={style}>
          <Row item={items[index]} onClick={handleClick} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 追问

- 你会先看哪些指标来判断「React 性能优化清单」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「React 性能优化清单」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 性能、memo、虚拟化，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React Compiler 落地后，绝大多数手动 memo 会被自动化，但理解原理仍然必要
- profile production build：`react-dom/profiling`，开发版本性能数据偏离实际

## react-19-features

title: React 19 关键特性速览
followups: [react-19-features-followup-1, react-19-features-followup-2, react-19-features-followup-3]
difficulty: 资深
tags: [React 19, Actions]

### 一句话

Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button；useFormStatus：在子组件里读取上层 form 的 pending / data。

### 题目

React 19 新增了 Actions、`useOptimistic`、`useFormStatus`、`use(promise)`、`<form action>` 直接绑定函数等，使用场景是什么？

### 答案要点

- Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button
- `useFormStatus`：在子组件里读取上层 form 的 pending / data，写按钮 loading 不再需要状态提升
- `useOptimistic`：声明式乐观 UI，自动在 server 返回失败时回滚
- `use(promise)`：在条件 / 循环里读 promise，由 Suspense 处理 pending
- `ref` 作为 prop：函数组件可以直接接收 ref，无需 forwardRef
- 资源元数据：组件可以渲染 `<title> / <meta> / <link>`，自动提升到 head（SSR / RSC 友好）

### 代码示例

```tsx
'use client';
import { useOptimistic, useFormStatus } from 'react';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? '提交中…' : '发送'}</button>;
}

export function CommentBox({ postId, comments }: { postId: string; comments: Comment[] }) {
  const [optimistic, addOptimistic] = useOptimistic(comments, (cur, draft: Comment) => [
    ...cur,
    draft,
  ]);

  async function action(formData: FormData) {
    const text = String(formData.get('text') || '');
    addOptimistic({ id: 'temp', author: 'me', text });
    await fetch(`/api/posts/${postId}/comments`, { method: 'POST', body: formData });
  }

  return (
    <>
      <ul>
        {optimistic.map((c) => (
          <li key={c.id}>{c.text}</li>
        ))}
      </ul>
      <form action={action}>
        <input name="text" />
        <SubmitBtn />
      </form>
    </>
  );
}
```

### 追问

- 在 React 项目里应用「React 19 关键特性速览」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「React 19 关键特性速览」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 React 19、Actions，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大部分 19 新特性需要 React + 框架（Next / Remix）配合才能体现完整价值
- React Compiler 与 19 配套使用，大量减少 memo / callback 心智

## react-typescript-patterns

title: React + TypeScript 常用类型模式
followups: [react-typescript-patterns-followup-1, react-typescript-patterns-followup-2, react-typescript-patterns-followup-3]
difficulty: 进阶
tags: [TypeScript, 泛型]

### 一句话

as prop（多态组件）：让组件可以渲染成不同标签 / 组件；泛型 hook：useFetch<T> 返回 T 类型数据；受控 / 非受控判别式：value & onChange 必须同时出现，可用条件类型。

### 题目

写组件库 / 复杂 hooks 时，常用的 TS 模式有哪些？

### 答案要点

- `as` prop（多态组件）：让组件可以渲染成不同标签 / 组件
- 泛型 hook：`useFetch<T>` 返回 `T` 类型数据
- 受控 / 非受控判别式：`value & onChange` 必须同时出现，可用条件类型
- `Awaited<>` / `ReturnType<>` 取异步函数返回类型
- `ComponentProps<typeof X>` 抽组件的 props 类型，做 wrapper 时类型安全

### 代码示例

```tsx
import { ComponentPropsWithoutRef, ElementType, forwardRef } from 'react';

type PolymorphicProps<E extends ElementType> = {
  as?: E;
  children?: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<E>, 'as'>;

export function Box<E extends ElementType = 'div'>({ as, children, ...rest }: PolymorphicProps<E>) {
  const Tag = as || 'div';
  return <Tag {...rest}>{children}</Tag>;
}

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    fetch(url)
      .then((r) => r.json() as Promise<T>)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e));
    return () => {
      active = false;
    };
  }, [url]);
  return { data, error };
}

const { data } = useFetch<User>('/api/user');
```

### 追问

- 在 React 项目里应用「React + TypeScript 常用类型模式」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「React + TypeScript 常用类型模式」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 TypeScript、泛型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 复杂泛型出错时优先看"传入的实参是否被推导成 unknown"，加约束 `extends` 通常就好
- `satisfies` 让对象字面量在保持窄类型的同时被验证形状

## react-testing

title: React 组件测试要测什么、怎么测
followups: [react-testing-followup-1, react-testing-followup-2, react-testing-followup-3]
difficulty: 进阶
tags: [测试, RTL]

### 一句话

"像用户一样测试"：不要测实现细节（state、私有方法），要测可见行为；优先选择器顺序：getByRole > getByLabelText > getByPlaceholderText > getByText > getByTestId。

### 题目

单测 / 组件测的边界在哪？React Testing Library 的核心理念和常见 API？

### 答案要点

- "像用户一样测试"：不要测实现细节（state、私有方法），要测可见行为
- 优先选择器顺序：`getByRole > getByLabelText > getByPlaceholderText > getByText > getByTestId`
- 异步：`findBy*` 自动等待出现；`waitFor` 等任意条件
- 用户事件用 `@testing-library/user-event`，模拟更真实（focus / blur / 键盘）
- Mock 网络请求用 MSW，比 jest.mock fetch 更接近真实
- 覆盖关键路径：渲染、交互、错误态、空态、a11y

### 代码示例

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { LoginForm } from './LoginForm';

const server = setupServer(http.post('/api/login', () => HttpResponse.json({ ok: true })));
beforeAll(() => server.listen());
afterAll(() => server.close());

test('登录成功后展示欢迎语', async () => {
  render(<LoginForm />);
  await userEvent.type(screen.getByLabelText('用户名'), 'kap');
  await userEvent.type(screen.getByLabelText('密码'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(await screen.findByText(/欢迎.*kap/)).toBeInTheDocument();
});
```

### 追问

- 在 React 项目里应用「React 组件测试要测什么、怎么测」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「React 组件测试要测什么、怎么测」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 测试、RTL，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要追求 100% 行覆盖，要看"关键业务分支覆盖"
- 视觉回归交给 Playwright + 截图比对，单测层不要做像素比较

## react-key-warning

title: 列表渲染中 key 的作用与使用陷阱
followups: [react-key-warning-followup-1, react-key-warning-followup-2, react-key-warning-followup-3]
links: [react-keys-list-basic]
difficulty: 基础
tags: [Diff, key]

### 一句话

key 让 React 知道"这一项还是同一项"，决定是复用还是重建。用 index 当 key，在排序/插入/删除时会让里面的 state（比如输入框文字）跑到错误的行上。

### 题目

React 中的 key 是干什么用的，为什么不要用 index？

### 答案要点

- key 帮助 React 在 reconcile 时识别哪些元素是「同一个」，决定复用、移动还是销毁
- 同层 key 必须唯一且稳定，跨层级无要求
- 用数组 index 作为 key 在「插入/删除/排序」时会导致状态错位（输入框内容跑到错误的行上）
- 静态、不可重排的列表用 index 没问题，但建议用业务 ID
- key 改变会触发组件销毁重建，可用于强制重置（如重置表单）

### 代码示例

```jsx
function Bad({ items }) {
  return items.map((it, i) => <Row key={i} item={it} />);
}

function Good({ items }) {
  return items.map((it) => <Row key={it.id} item={it} />);
}

function ResetForm() {
  const [seed, setSeed] = useState(0);
  return (
    <>
      <Form key={seed} />
      <button onClick={() => setSeed((s) => s + 1)}>Reset</button>
    </>
  );
}
```

### 追问

- 你会先看哪些指标来判断「列表渲染中 key 的作用与使用陷阱」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「列表渲染中 key 的作用与使用陷阱」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Diff、key，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React 19 起，列表 diff 性能进一步优化但 key 仍然必须
- key 不会作为 prop 传给组件，需自己再传一份
- 与 Vue 的 key 行为一致

## react-controlled-vs-uncontrolled

title: 受控组件 vs 非受控组件，性能边界在哪
followups: [react-controlled-vs-uncontrolled-followup-1, react-controlled-vs-uncontrolled-followup-2, react-controlled-vs-uncontrolled-followup-3]
difficulty: 进阶
tags: [表单, 性能]

### 一句话

受控 = state 是唯一真源（输入触发 setState 触发 re-render）；非受控 = DOM 自己管自己，靠 ref 取值。大表单避免 setState 风暴 → 用 react-hook-form 这种非受控库。

### 题目

什么时候用受控、什么时候用非受控？大表单怎么避免每次输入都重渲染整个页面？

### 答案要点

- 受控：value + onChange，组件自身不存储状态，便于校验/联动
- 非受控：用 ref + defaultValue，性能好，但无法实时联动
- 大表单优化：拆分组件 + memo / useFormState（react-hook-form）非受控、状态外包至库
- React 19 新增 `<form action>` + useActionState，简化提交流程
- `useDeferredValue` / `useTransition` 把昂贵渲染降级

### 代码示例

```jsx
function Controlled() {
  const [v, setV] = useState('');
  return <input value={v} onChange={(e) => setV(e.target.value)} />;
}

function Uncontrolled() {
  const ref = useRef(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        console.log(ref.current.value);
      }}
    >
      <input ref={ref} defaultValue="" />
      <button>提交</button>
    </form>
  );
}

import { useForm } from 'react-hook-form';
function FastForm() {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('email')} />
    </form>
  );
}
```

### 追问

- 你会先看哪些指标来判断「受控组件 vs 非受控组件，性能边界在哪」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「受控组件 vs 非受控组件，性能边界在哪」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 表单、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- react-hook-form / formik 都基于非受控思想
- `useDeferredValue` 适合昂贵的下游渲染（图表、大列表）
- React Compiler（实验中）可自动 memoize，未来可能改变受控开销

## react-portal-error-boundary

title: Portal、Error Boundary、Suspense 的协作方式
followups: [react-portal-error-boundary-followup-1, react-portal-error-boundary-followup-2, react-portal-error-boundary-followup-3]
difficulty: 进阶
tags: [架构, 错误处理]

### 一句话

Portal 把渲染塞到任意 DOM 位置（弹窗）；Error Boundary 捕获子树渲染错误（兜底）；Suspense 等待异步组件 / 数据（loading）。三者常嵌套：ErrorBoundary > Suspense > 业务组件。

### 题目

渲染弹窗、捕获组件错误、处理异步 loading，这三个能力分别怎么用？

### 答案要点

- **Portal**：`createPortal(children, document.body)`，把子树渲染到任意 DOM，但事件冒泡仍按 React 树
- **Error Boundary**：class 组件实现 `getDerivedStateFromError` + `componentDidCatch`；只能捕获子树渲染错误，事件 / 异步要 try-catch
- **Suspense**：用于异步组件 / 数据加载（与 React Query / Relay / RSC 配合），fallback 显示骨架屏
- 推荐组合：Suspense → 包裹 ErrorBoundary → 包裹业务组件
- React 19 提供 `useErrorBoundary`（计划），也支持 onCaughtError / onUncaughtError 回调

### 代码示例

```jsx
class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    reportError(err, info);
  }
  render() {
    if (this.state.err) return this.props.fallback ?? <p>出错了</p>;
    return this.props.children;
  }
}

function Modal({ children }) {
  return createPortal(<div className="overlay">{children}</div>, document.body);
}

function App() {
  return (
    <ErrorBoundary fallback={<Crash />}>
      <Suspense fallback={<Skeleton />}>
        <UserPanel />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### 追问

- 推动「Portal、Error Boundary、Suspense 的协作方式」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Portal、Error Boundary、Suspense 的协作方式」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 架构、错误处理，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 第三方库 react-error-boundary 提供 hook 风格 API
- Next.js 自带 error.tsx / loading.tsx 文件级约定
- Sentry 可以一键接入 ErrorBoundary 上报错误

## react-keys-list-basic

title: React 列表为什么必须给 key？
followups: [react-keys-list-basic-followup-1, react-keys-list-basic-followup-2, react-keys-list-basic-followup-3]
links: [react-key-warning]
difficulty: 基础
tags: [list, key, 基础]

### 一句话

key 让 React 在一组兄弟节点里准确识别"谁还在 / 谁是新加 / 谁被删"，避免把状态/DOM 错位复用到错误的元素上。

### 题目

为什么 React 列表必须写 key？key 用 index 有什么坑？

### 答案要点

- diff 算法靠 key 在同层之间做"身份匹配"。没 key 就只能按位置匹配，插入/删除前面的元素会让后面所有节点的状态错位
- 用 index 当 key 看起来能消除警告，但只在"列表只追加、永不插入/删除"时才安全
- key 必须在同一组兄弟里唯一；不同列表的 key 互不干扰
- key 不会作为 props 传给子组件——读 `props.key` 拿不到

### 代码示例

```tsx
type Item = { id: string; text: string };

function TodoList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((it) => (
        <li key={it.id}>{it.text}</li>
      ))}
    </ul>
  );
}
```

### 常见误区

- 用 `Math.random()` 做 key —— 每次渲染都不同，等于"全部都被销毁重建"
- 用 index 当 key 还把表单 input 放在 `<li>` 里：插入新行后输入框值会错位
- 给 fragment（`<>...</>`）加 key 用 `<React.Fragment key={x}>`，不能直接 `<>...</>`

### 追问

- 为什么 React 不强制要求 key 在所有数组里？
- 写一个 demo 演示 index-as-key 导致的 bug
- key 变化时组件会发生什么（卸载 + 重新挂载，state 丢失）

### 延伸

- key 也是 transition / animation 重新触发的 trick
- React 19 的 useTransition 中 key 变化和 isPending 的关系

## react-vs-vue-mental-model-followup-1

title: 追问：在「React 和 Vue 的心智模型本质差异」场景下，当「React 和 Vue 的心智模型本质差异」牵涉跨组件状态时，你会如何围绕 React 设计响应式边界，保证后续好维护
difficulty: 进阶
tags: [React, Vue, 框架, 追问]
parent: react-vs-vue-mental-model

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「React 和 Vue 的心智模型本质差异」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在「React 和 Vue 的心智模型本质差异」场景下，当「React 和 Vue 的心智模型本质差异」牵涉跨组件状态时，你会如何围绕 React 设计响应式边界，保证后续好维护？

### 答案要点

#### 核心回答

- 先界定「React 和 Vue 的心智模型本质差异」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「React 和 Vue 的心智模型本质差异」的响应式与组件边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「响应式：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先用一句话给出「React 和 Vue 的心智模型本质差异」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「React 和 Vue 的心智模型本质差异」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「React 和 Vue 的心智模型本质差异」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## react-compiler-boundaries

title: React Compiler 自动 memo 的原理、限制与落地边界
difficulty: 资深
tags: [React Compiler, 性能, 编译优化]
followups: [react-compiler-boundaries-followup-1, react-compiler-boundaries-followup-2, react-compiler-boundaries-followup-3]

### 一句话

React Compiler 通过静态分析把组件中的稳定计算、props 和闭包自动缓存，减少手写 `memo` / `useMemo` / `useCallback`，但它依赖纯渲染、可分析数据流和明确的副作用边界。

### 题目

React Compiler 能自动做哪些 memo 优化？真实项目里应该如何判断它能不能替代手写 `memo`、`useMemo` 和 `useCallback`？

### 答案要点

- React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- 它要求组件渲染保持纯函数语义：不能在 render 中读写可变全局状态、修改 props、依赖不稳定的时间/随机值，副作用仍应放到 Effect 或事件处理里。
- 它不能替代所有性能设计：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。
- 迁移时不要一次性删除所有 `memo`：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。
- 对外部库、复杂 mutable store、手写 hook 和低层动画组件要更谨慎；一旦 Compiler 无法证明安全，宁可保留显式 memo 或重构数据流。

### 常见误区

- 以为开启 Compiler 后性能问题都会消失，结果真正瓶颈在网络瀑布、超大列表或昂贵 DOM 操作。
- 在 render 中偷偷修改对象、读 `Date.now()` / `Math.random()`，导致编译器无法安全缓存或缓存语义不符合预期。
- 把所有 `useCallback` 一次性删除，没有用 Profiler 验证子组件是否真的减少了渲染。
- 只看本地开发体验，不看生产构建是否启用、哪些文件被跳过、CI 是否把编译诊断纳入检查。

### 追问

- 什么情况下 React Compiler 会跳过某个组件或 hook？
- 它和 React.memo、useMemo、useCallback 的迁移顺序怎么安排？
- 你会用哪些 Profiler 指标证明 Compiler 真的带来了收益？

## react-hooks-rules-followup-1

title: 追问：结合真实业务约束，在 React 项目里应用「Hooks 的核心规则与原理」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [Hooks, 原理, 追问]
parent: react-hooks-rules

### 一句话

先界定「Hooks 的核心规则与原理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：结合真实业务约束，在 React 项目里应用「Hooks 的核心规则与原理」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「Hooks 的核心规则与原理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「Hooks 的核心规则与原理」的渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 准备这道追问时，先画出「Hooks 的核心规则与原理」从输入到输出的关键路径，再补异常路径。
- 准备一个「Hooks 的核心规则与原理」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「Hooks 的核心规则与原理」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## use-effect-pitfalls-followup-1

title: 追问：在「useEffect 常见陷阱与依赖管理」进入长周期维护后，你会重点巡检哪些与 useEffect 相关的高风险边界点
difficulty: 进阶
tags: [useEffect, 陷阱, 追问]
parent: use-effect-pitfalls

### 一句话

先界定「useEffect 常见陷阱与依赖管理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「useEffect 常见陷阱与依赖管理」进入长周期维护后，你会重点巡检哪些与 useEffect 相关的高风险边界点？

### 答案要点

#### 核心回答

- 先界定「useEffect 常见陷阱与依赖管理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「useEffect 常见陷阱与依赖管理」的核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「依赖数组不全：导致捕获旧值（stale closure），看似"没起效"」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 复盘时先确认「useEffect 常见陷阱与依赖管理」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「useEffect 常见陷阱与依赖管理」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「useEffect 常见陷阱与依赖管理」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-reconciler-fiber-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Fiber 相关的指标来判断「Fiber 架构与并发渲染」是不是当前性能瓶颈
difficulty: 资深
tags: [Fiber, Concurrent, 追问]
parent: react-reconciler-fiber

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Fiber 架构与并发渲染」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善，要能回到原题机制定位原因。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Fiber 相关的指标来判断「Fiber 架构与并发渲染」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Fiber 架构与并发渲染」不是只在理想输入下成立。
- 再补可观测指标：围绕「Fiber 架构与并发渲染」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Fiber 架构与并发渲染」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先把「Fiber 架构与并发渲染」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「Fiber 架构与并发渲染」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「Fiber 架构与并发渲染」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## react-server-components-followup-1

title: 追问：在 React 项目里应用「React Server Components」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [追问]
parent: react-server-components

### 一句话

先界定「React Server Components」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在 React 项目里应用「React Server Components」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「React Server Components」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「React Server Components」的渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「SSR：服务端渲出 HTML 再 hydration，组件代码仍要打到客户端 bundle」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「React Server Components」的核心机制，再补一个会失败的具体场景。
- 准备一个与「React Server Components」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「React Server Components」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## react-server-components-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 RSC 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [追问]
parent: react-server-components

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「React Server Components」不是只在理想输入下成立。；再补可观测指标：渲染与状态边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 RSC 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「React Server Components」不是只在理想输入下成立。
- 再补可观测指标：围绕「React Server Components」的渲染与状态边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「React Server Components」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 准备这道追问时，先画出「React Server Components」从输入到输出的关键路径，再补异常路径。
- 准备一个「React Server Components」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「React Server Components」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## react-server-components-followup-3

title: 追问：别只看 benchmark，你会怎么比较「React Server Components」和替代方案在 RSC 上的学习成本、交付速度与维护负担
difficulty: 进阶
tags: [追问]
parent: react-server-components

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 渲染与状态边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做。

### 题目

如果面试官追问：别只看 benchmark，你会怎么比较「React Server Components」和替代方案在 RSC 上的学习成本、交付速度与维护负担？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「React Server Components」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「React Server Components」对应的渲染与状态边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「React Server Components」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 回答前先列出「React Server Components」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「React Server Components」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「React Server Components」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## react-server-state-query-cache

title: React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存]
links: [state-management-react, use-effect-pitfalls, 06-network/request-race-cancel-dedupe]
followups: [react-server-state-query-cache-followup-1, react-server-state-query-cache-followup-2, react-server-state-query-cache-followup-3]

### 一句话

服务端状态不是 Redux 里的一份普通全局变量，而是“远端数据在客户端的缓存视图”：要管理 staleTime、请求去重、后台刷新、乐观更新、错误回滚、失效范围和 SSR hydration。

### 题目

为什么很多 React 项目会用 TanStack Query / SWR 管接口数据，而不是把接口数据都塞进 Redux / Zustand？缓存失效、乐观更新和 SSR hydration 应该怎么设计？

### 答案要点

- 服务端状态有来源权威：真正的数据在服务端，前端只缓存快照；它会过期、被别人修改、需要重新验证。
- Query key 是缓存边界，必须包含资源类型、过滤条件、分页、用户身份等影响结果的维度；key 设计错会串数据或无法失效。
- `staleTime` 控制“多久内认为新鲜”，`gcTime/cacheTime` 控制“多久不用后清理”；两者不等同。
- 读取类请求可自动去重、后台刷新、窗口聚焦刷新；写操作要用 mutation，成功后 invalidate 或直接更新缓存。
- 乐观更新要能 rollback：先保存旧缓存，立即更新 UI，失败时回滚并提示，成功后再用服务端结果对齐。
- SSR / RSC / hydration 场景要避免客户端重复请求：服务端预取后 dehydrate，客户端 hydrate 同一 query key。
- 不要把所有接口数据复制进组件 state，否则会出现多份缓存、重复请求、状态不同步和手写 loading/error/retry。

### 代码示例

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const todoKeys = {
  list: (projectId: string) => ['todos', { projectId }] as const,
};

function TodoList({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const todos = useQuery({
    queryKey: todoKeys.list(projectId),
    queryFn: () => fetchJSON(`/api/projects/${projectId}/todos`),
    staleTime: 30_000,
  });

  const toggle = useMutation({
    mutationFn: (id: string) => fetchJSON(`/api/todos/${id}/toggle`, { method: 'POST' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: todoKeys.list(projectId) });
      const previous = qc.getQueryData<Todo[]>(todoKeys.list(projectId));
      qc.setQueryData<Todo[]>(todoKeys.list(projectId), (old = []) =>
        old.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(todoKeys.list(projectId), ctx?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: todoKeys.list(projectId) });
    },
  });

  // render...
}
```

### 常见误区

- Query key 不包含过滤条件或用户身份，导致不同页面共享了错误缓存。
- mutation 成功后全量 invalidate 所有 query，简单但会造成请求风暴。
- 乐观更新只改 UI，不保留 previous，失败后无法回滚。
- 把接口数据同时放 Query 和 Redux，两套缓存互相打架。

### 追问

- `staleTime` 和 `gcTime` 分别解决什么问题？
- 乐观更新失败时，如何保证 UI、缓存和服务端最终一致？
- SSR 预取后，如何避免客户端 hydration 又请求一遍？

### 延伸

- Redux/Zustand 更适合客户端状态：弹窗、编辑草稿、局部偏好、复杂交互流程。
- 服务端状态库解决的是缓存和网络协调，不等于替代所有状态管理。

## react-use-sync-external-store

title: useSyncExternalStore 如何保证外部 Store 与并发渲染一致性
difficulty: 资深
tags: [React, 并发渲染, Store]
links: [state-management-react, use-effect-pitfalls, react-hooks-rules]
followups: [react-use-sync-external-store-followup-1, react-use-sync-external-store-followup-2, react-use-sync-external-store-followup-3]

### 一句话

`useSyncExternalStore` 是 React 给外部 store 的一致性协议：组件通过 `getSnapshot` 读取不可变快照，通过 `subscribe` 订阅变更，React 在并发渲染中可以检查快照是否一致，避免 tearing。

### 题目

Zustand、Redux、自研 store 为什么需要适配 `useSyncExternalStore`？它如何解决并发渲染下外部状态和 React 渲染不一致的问题？

### 答案要点

- 外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。
- `getSnapshot` 必须返回当前状态快照；如果状态没变，返回值引用也应稳定，否则会导致无限重渲染。
- `subscribe` 负责在 store 变化时通知 React；React 再重新读取 snapshot，而不是让外部 store 直接驱动 DOM。
- 并发渲染中 React 可能多次调用 `getSnapshot`，确认提交前后快照一致；不一致就重新渲染。
- SSR 需要 `getServerSnapshot`，保证服务端输出和客户端 hydration 初始值一致。
- selector 场景要注意引用稳定和浅比较，否则一个小字段变化可能导致大量组件重渲染。

### 代码示例

```tsx
import { useSyncExternalStore } from 'react';

type Listener = () => void;

function createCounterStore() {
  let state = { count: 0 };
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    inc: () => {
      state = { count: state.count + 1 }; // 新引用表示快照变化
      listeners.forEach((listener) => listener());
    },
  };
}

const counterStore = createCounterStore();

function Counter() {
  const snapshot = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getSnapshot,
    counterStore.getSnapshot,
  );
  return <button onClick={counterStore.inc}>{snapshot.count}</button>;
}
```

### 常见误区

- `getSnapshot` 每次都返回新对象，哪怕状态没变，也会触发重复渲染甚至报错。
- 在 render 里直接读外部可变对象，不通过订阅协议，遇到并发渲染就可能不一致。
- 以为 `useSyncExternalStore` 自带 selector 优化；selector、浅比较和派生数据缓存仍要自己设计或交给库。
- SSR 没有稳定的 server snapshot，导致 hydration 首屏值不一致。

### 追问

- tearing 是什么，为什么 React 并发渲染会放大这个问题？
- `getSnapshot` 的返回值为什么需要引用稳定？
- Zustand / Redux 这类库在 React 18 之后为什么要适配这个 Hook？

### 延伸

- `useSyncExternalStore` 不是给普通组件 state 用的，它解决的是 React 外部数据源订阅。
- 浏览器 API 如 `matchMedia`、`navigator.onLine`、localStorage 广播也可以用同样模型封装。

## react-complex-form-architecture

title: React 复杂表单：校验、异步默认值、联动和提交状态怎么设计
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod]
links: [react-controlled-vs-uncontrolled, react-server-components, 02-typescript/runtime-schema-validation]
followups: [react-complex-form-architecture-followup-1, react-complex-form-architecture-followup-2, react-complex-form-architecture-followup-3]

### 一句话

复杂表单的难点不在“输入框绑定 state”，而在默认值异步加载、字段联动、局部校验、脏状态、草稿恢复、重复提交、服务端错误回填和大表单性能。

### 题目

在 React 中实现一个中后台复杂表单时，如何设计表单状态、校验、联动、异步默认值和提交流程？什么时候选择 React Hook Form / Zod？

### 答案要点

- 简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 默认值异步加载要区分“初始加载”和“用户已编辑”：数据回来后不要直接覆盖用户正在输入的脏字段。
- 校验分层：字段级同步校验、跨字段校验、异步唯一性校验、提交后的服务端错误都要有展示位置。
- Schema 适合定义运行时输入边界，Zod 可和 TS 类型联动，但服务端仍要重复校验。
- 字段联动要明确依赖关系：`watch` 少量关键字段，避免每个字段变化都让整个表单重渲染。
- 提交流程要处理 pending、重复提交、乐观提示、错误回填、成功后重置或保留草稿。
- 大表单要考虑分步、虚拟化、懒加载子表单和保存草稿，否则移动端体验会很差。

### 代码示例

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const ProfileSchema = z
  .object({
    name: z.string().min(1, '请输入姓名'),
    email: z.string().email('邮箱格式不正确'),
    companyType: z.enum(['personal', 'enterprise']),
    taxId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.companyType === 'enterprise' && !value.taxId) {
      ctx.addIssue({ code: 'custom', path: ['taxId'], message: '企业账号需要填写税号' });
    }
  });

type ProfileForm = z.infer<typeof ProfileSchema>;

function ProfileEditor({ initialValue }: { initialValue: ProfileForm }) {
  const form = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: initialValue,
  });

  const companyType = form.watch('companyType');

  async function onSubmit(value: ProfileForm) {
    const result = await saveProfile(value);
    if (!result.ok) {
      form.setError('email', { message: result.fieldErrors.email });
      return;
    }
    form.reset(result.data);
  }

  // render fields...
}
```

### 常见误区

- 所有字段都放到父组件 state，任意输入都会让整张表单重渲染。
- 异步默认值回来后无条件 `reset`，覆盖了用户已经输入的内容。
- 只做前端校验，服务端错误无法回填到对应字段。
- 字段联动全靠 `useEffect` 串起来，依赖关系越来越难维护。

### 追问

- React Hook Form 为什么在大表单里通常比全受控 state 更省渲染？
- 异步唯一性校验如何避免慢响应覆盖新输入？
- 分步表单里，草稿保存和最终提交校验如何协调？

### 延伸

- React 19 Actions 能改善表单提交体验，但复杂客户端联动和草稿状态仍需要表单状态管理。
- Zod / Valibot 适合边界校验，不应承载全部业务流程逻辑。

## state-management-react-followup-1

title: 追问：在当前团队与业务约束下，在 React 项目里应用「React 状态管理选型」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [追问]
parent: state-management-react

### 一句话

先界定「React 状态管理选型」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在当前团队与业务约束下，在 React 项目里应用「React 状态管理选型」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 推动「React 状态管理选型」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「React 状态管理选型」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「React 状态管理选型」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 先用一句话给出「React 状态管理选型」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「React 状态管理选型」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「React 状态管理选型」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## react-suspense-data-followup-1

title: 追问：在「Suspense 与异步数据加载」进入长周期维护后，你会重点巡检哪些与 Suspense 相关的高风险边界点
difficulty: 资深
tags: [Suspense, 数据加载, 追问]
parent: react-suspense-data

### 一句话

先界定「Suspense 与异步数据加载」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「Suspense 让组件在数据未就绪时"挂起"。

### 题目

如果面试官追问：在「Suspense 与异步数据加载」进入长周期维护后，你会重点巡检哪些与 Suspense 相关的高风险边界点？

### 答案要点

#### 核心回答

- 先界定「Suspense 与异步数据加载」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「Suspense 与异步数据加载」的核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先把「Suspense 与异步数据加载」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「Suspense 与异步数据加载」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「Suspense 与异步数据加载」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## react-router-data-loaders-followup-1

title: 追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，在 React 项目里应用「React Router v6.4+ 的 Data Router 与 loaders」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [Router, 数据加载, 追问]
parent: react-router-data-loaders

### 一句话

先界定「React Router v6.4+ 的 Data Router 与 loaders」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，在 React 项目里应用「React Router v6.4+ 的 Data Router 与 loaders」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「React Router v6.4+ 的 Data Router 与 loaders」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「React Router v6.4+ 的 Data Router 与 loaders」的渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「路由级 loader 在切换前并行发起请求，配合 defer / Await 可以做"先关键内容 + 流式补齐"」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先解释「React Router v6.4+ 的 Data Router 与 loaders」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「React Router v6.4+ 的 Data Router 与 loaders」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「React Router v6.4+ 的 Data Router 与 loaders」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## react-perf-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 性能 相关的指标来判断「React 性能优化清单」是不是当前性能瓶颈
difficulty: 进阶
tags: [追问]
parent: react-perf

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 性能优化清单」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善，要能回到原题机制定位原因。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 性能 相关的指标来判断「React 性能优化清单」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 性能优化清单」不是只在理想输入下成立。
- 再补可观测指标：围绕「React 性能优化清单」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「React 性能优化清单」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先解释「React 性能优化清单」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「React 性能优化清单」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「React 性能优化清单」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## react-19-features-followup-1

title: 追问：在 React 项目里应用「React 19 关键特性速览」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [React 19, Actions, 追问]
parent: react-19-features

### 一句话

先界定「React 19 关键特性速览」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在 React 项目里应用「React 19 关键特性速览」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「React 19 关键特性速览」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「React 19 关键特性速览」的渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 回答前先列出「React 19 关键特性速览」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「React 19 关键特性速览」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「React 19 关键特性速览」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## react-typescript-patterns-followup-1

title: 追问：在当前团队与业务约束下，在 React 项目里应用「React + TypeScript 常用类型模式」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [TypeScript, 泛型, 追问]
parent: react-typescript-patterns

### 一句话

先界定「React + TypeScript 常用类型模式」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在当前团队与业务约束下，在 React 项目里应用「React + TypeScript 常用类型模式」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 推动「React + TypeScript 常用类型模式」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「React + TypeScript 常用类型模式」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「React + TypeScript 常用类型模式」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 复盘时先确认「React + TypeScript 常用类型模式」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「React + TypeScript 常用类型模式」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「React + TypeScript 常用类型模式」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-testing-followup-1

title: 追问：在 React 项目里应用「React 组件测试要测什么、怎么测」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [测试, RTL, 追问]
parent: react-testing

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 组件测试要测什么、怎么测」不是只在理想输入下成立。；再补可观测指标：渲染与状态边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在 React 项目里应用「React 组件测试要测什么、怎么测」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 组件测试要测什么、怎么测」不是只在理想输入下成立。
- 再补可观测指标：围绕「React 组件测试要测什么、怎么测」的渲染与状态边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「React 组件测试要测什么、怎么测」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 先把「React 组件测试要测什么、怎么测」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「React 组件测试要测什么、怎么测」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「React 组件测试要测什么、怎么测」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## react-key-warning-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Diff 相关的指标来判断「列表渲染中 key 的作用与使用陷阱」是不是当前性能瓶颈
difficulty: 基础
tags: [Diff, key, 追问]
parent: react-key-warning

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「列表渲染中 key 的作用与使用陷阱」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Diff 相关的指标来判断「列表渲染中 key 的作用与使用陷阱」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「列表渲染中 key 的作用与使用陷阱」不是只在理想输入下成立。
- 再补可观测指标：围绕「列表渲染中 key 的作用与使用陷阱」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「列表渲染中 key 的作用与使用陷阱」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复盘时先确认「列表渲染中 key 的作用与使用陷阱」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「列表渲染中 key 的作用与使用陷阱」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「列表渲染中 key 的作用与使用陷阱」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-controlled-vs-uncontrolled-followup-1

title: 追问：排查「受控组件 vs 非受控组件，性能边界在哪」性能瓶颈时，你会先看哪些指标来判断它是不是主矛盾
difficulty: 进阶
tags: [表单, 性能, 追问]
parent: react-controlled-vs-uncontrolled

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「受控组件 vs 非受控组件，性能边界在哪」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：排查「受控组件 vs 非受控组件，性能边界在哪」性能瓶颈时，你会先看哪些指标来判断它是不是主矛盾？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「受控组件 vs 非受控组件，性能边界在哪」不是只在理想输入下成立。
- 再补可观测指标：围绕「受控组件 vs 非受控组件，性能边界在哪」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「受控组件 vs 非受控组件，性能边界在哪」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「受控组件 vs 非受控组件，性能边界在哪」的核心机制，再补一个会失败的具体场景。
- 准备一个与「受控组件 vs 非受控组件，性能边界在哪」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「受控组件 vs 非受控组件，性能边界在哪」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## react-portal-error-boundary-followup-1

title: 追问：真要把「Portal、Error Boundary、Suspense 的协作方式」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, 错误处理, 追问]
parent: react-portal-error-boundary

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：真要把「Portal、Error Boundary、Suspense 的协作方式」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 核心回答

- 推动「Portal、Error Boundary、Suspense 的协作方式」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「Portal、Error Boundary、Suspense 的协作方式」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Portal、Error Boundary、Suspense 的协作方式」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 准备这道追问时，先画出「Portal、Error Boundary、Suspense 的协作方式」从输入到输出的关键路径，再补异常路径。
- 准备一个「Portal、Error Boundary、Suspense 的协作方式」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「Portal、Error Boundary、Suspense 的协作方式」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## react-keys-list-basic-followup-1

title: 追问：结合真实业务约束，在 React 项目里应用「React 列表为什么必须给 key」时，哪些 state 或渲染边界最容易出问题
difficulty: 基础
tags: [list, key, 基础, 追问]
parent: react-keys-list-basic

### 一句话

先界定「React 列表为什么必须给 key」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：结合真实业务约束，在 React 项目里应用「React 列表为什么必须给 key」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「React 列表为什么必须给 key」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕「React 列表为什么必须给 key」的渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「diff 算法靠 key 在同层之间做"身份匹配"。没 key 就只能按位置匹配，插入/删除前面的元素会让后面所有节点的状态错位」要进一步补到边界条件里，而不是只复述结论。

#### 学习抓手

- 先用一句话给出「React 列表为什么必须给 key」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「React 列表为什么必须给 key」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「React 列表为什么必须给 key」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## react-keys-list-basic-followup-2

title: 追问：在「React 列表为什么必须给 key」场景下，为了证明这个方案在 list 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 基础
tags: [list, key, 基础, 追问]
parent: react-keys-list-basic

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 列表为什么必须给 key」不是只在理想输入下成立。；再补可观测指标：渲染与状态边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在「React 列表为什么必须给 key」场景下，为了证明这个方案在 list 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 列表为什么必须给 key」不是只在理想输入下成立。
- 再补可观测指标：围绕「React 列表为什么必须给 key」的渲染与状态边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「React 列表为什么必须给 key」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复盘时先确认「React 列表为什么必须给 key」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「React 列表为什么必须给 key」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「React 列表为什么必须给 key」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-keys-list-basic-followup-3

title: 追问：如果团队能力结构变化，你会怎样围绕 list 调整「React 列表为什么必须给 key」与替代方案的选型结论
difficulty: 基础
tags: [list, key, 基础, 追问]
parent: react-keys-list-basic

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 渲染与状态边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做。

### 题目

如果面试官追问：如果团队能力结构变化，你会怎样围绕 list 调整「React 列表为什么必须给 key」与替代方案的选型结论？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「React 列表为什么必须给 key」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「React 列表为什么必须给 key」对应的渲染与状态边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「React 列表为什么必须给 key」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 先把「React 列表为什么必须给 key」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「React 列表为什么必须给 key」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「React 列表为什么必须给 key」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## react-vs-vue-mental-model-followup-2

title: 追问：在当前团队与业务约束下，你会如何把「React 和 Vue 的心智模型本质差异」拆成可观测、可回滚的小单元，避免一次性大改
difficulty: 进阶
tags: [React, Vue, 框架, 追问]
parent: react-vs-vue-mental-model
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「React 和 Vue 的心智模型本质差异」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 和 Vue 的心智模型本质差异」补一个反例。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何把「React 和 Vue 的心智模型本质差异」拆成可观测、可回滚的小单元，避免一次性大改？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「React 和 Vue 的心智模型本质差异」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 和 Vue 的心智模型本质差异」补一个反例，避免停在口号层。
- 如果涉及「React 和 Vue 的心智模型本质差异」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 响应式：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"
- 渲染：Vue 模板可静态分析做编译期优化（hoist、patchFlag）；React JSX 是 JS 表达式，运行时全靠 diff + memo
- 数据流：Vue 双向（v-model 是糖）；React 单向（受控/非受控两种风格）
- 补一个你真实处理过的「React 和 Vue 的心智模型本质差异」相似场景：说明 React 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「React 和 Vue 的心智模型本质差异」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 React 设计测试与回归流程。
- 围绕「React 和 Vue 的心智模型本质差异」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 React 的真实收益是否稳定。
- 围绕「React 和 Vue 的心智模型本质差异」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「React 和 Vue 的心智模型本质差异」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 另一个问题是缺少失败预案：若「React 和 Vue 的心智模型本质差异」里的 React 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 保持「React 和 Vue 的心智模型本质差异」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-vs-vue-mental-model-followup-3

title: 追问：结合真实业务约束，在评审「React 和 Vue 的心智模型本质差异」时，你会如何围绕 React 向团队解释“什么时候值得用，什么时候别硬上”
difficulty: 进阶
tags: [React, Vue, 框架, 追问]
parent: react-vs-vue-mental-model
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「React 和 Vue 的心智模型本质差异」落到真实交付，而不是停在概念层。；可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 和 Vue 的心智模型本质差异」补一个反例。

### 题目

如果面试官追问：结合真实业务约束，在评审「React 和 Vue 的心智模型本质差异」时，你会如何围绕 React 向团队解释“什么时候值得用，什么时候别硬上”？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「React 和 Vue 的心智模型本质差异」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 和 Vue 的心智模型本质差异」补一个反例，避免停在口号层。
- 讲「React 和 Vue 的心智模型本质差异」时实现侧重点应放在 React 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 响应式：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"
- 渲染：Vue 模板可静态分析做编译期优化（hoist、patchFlag）；React JSX 是 JS 表达式，运行时全靠 diff + memo
- 数据流：Vue 双向（v-model 是糖）；React 单向（受控/非受控两种风格）
- 结合一次「React 和 Vue 的心智模型本质差异」线上案例说明 React 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「React 和 Vue 的心智模型本质差异」的最小可复现样例，再扩展到主链路回归，这样能更快确认 React 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「React 和 Vue 的心智模型本质差异」里的 React，否则很难证明变化来自这次改动。
- 涉及「React 和 Vue 的心智模型本质差异」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「React 和 Vue 的心智模型本质差异」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「React 和 Vue 的心智模型本质差异」里 React 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「React 和 Vue 的心智模型本质差异」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-hooks-rules-followup-2

title: 追问：在「Hooks 的核心规则与原理」场景下，为了证明这个方案在 Hooks 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [Hooks, 原理, 追问]
parent: react-hooks-rules
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Hooks 的核心规则与原理」在当前约束下为什么成立。；围绕「Hooks 的核心规则与原理」组织答案时，建议按「约束来源 -> Hooks 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：在「Hooks 的核心规则与原理」场景下，为了证明这个方案在 Hooks 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「Hooks 的核心规则与原理」在当前约束下为什么成立。
- 围绕「Hooks 的核心规则与原理」组织答案时，建议按「约束来源 -> Hooks 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「Hooks 的核心规则与原理」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位
- 自定义 Hook 是普通函数，但同样受顺序约束，因为它内部调用了其他 Hooks
- 错误用法（条件 / 循环里调用）在 dev 模式由 react-hooks/rules-of-hooks 静态检查
- 若能补一段「Hooks 的核心规则与原理」复盘片段，解释 Hooks 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「Hooks 的核心规则与原理」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 Hooks 的预期结果写成可复核标准。
- 在「Hooks 的核心规则与原理」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 Hooks 的问题定位闭环。
- 如果「Hooks 的核心规则与原理」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「Hooks 的核心规则与原理」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没说明「Hooks 的核心规则与原理」在 Hooks 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 不要把「Hooks 的核心规则与原理」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-hooks-rules-followup-3

title: 追问：以「Hooks 的核心规则与原理」为例，如果团队人数、交付节奏和业务复杂度不同，你会怎么基于 Hooks 判断该不该选「Hooks 的核心规则与原理」
difficulty: 进阶
tags: [Hooks, 原理, 追问]
parent: react-hooks-rules
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Hooks 的核心规则与原理」讲成只在理想输入下可用。；围绕「Hooks 的核心规则与原理」组织答案时，建议按「约束来源 -> Hooks 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：以「Hooks 的核心规则与原理」为例，如果团队人数、交付节奏和业务复杂度不同，你会怎么基于 Hooks 判断该不该选「Hooks 的核心规则与原理」？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「Hooks 的核心规则与原理」讲成只在理想输入下可用。
- 围绕「Hooks 的核心规则与原理」组织答案时，建议按「约束来源 -> Hooks 关键决策 -> 验证闭环」展开。
- 在「Hooks 的核心规则与原理」回答里，实现层面要解释 Hooks 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位
- 自定义 Hook 是普通函数，但同样受顺序约束，因为它内部调用了其他 Hooks
- 错误用法（条件 / 循环里调用）在 dev 模式由 react-hooks/rules-of-hooks 静态检查
- 补一个你真实处理过的「Hooks 的核心规则与原理」相似场景：说明 Hooks 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「Hooks 的核心规则与原理」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 Hooks 设计测试与回归流程。
- 围绕「Hooks 的核心规则与原理」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 Hooks 的真实收益是否稳定。
- 「Hooks 的核心规则与原理」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「Hooks 的核心规则与原理」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 另一个问题是缺少失败预案：若「Hooks 的核心规则与原理」里的 Hooks 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 避免把「Hooks 的核心规则与原理」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## use-effect-pitfalls-followup-2

title: 追问：从工程落地角度看，React 18 自动批处理对 effect 的影响
difficulty: 进阶
tags: [useEffect, 陷阱, 追问]
parent: use-effect-pitfalls
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「useEffect 常见陷阱与依赖管理」落到真实交付，而不是停在概念层。；讲「useEffect 常见陷阱与依赖管理」时先给 useEffect 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：从工程落地角度看，React 18 自动批处理对 effect 的影响？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「useEffect 常见陷阱与依赖管理」落到真实交付，而不是停在概念层。
- 讲「useEffect 常见陷阱与依赖管理」时先给 useEffect 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 讲「useEffect 常见陷阱与依赖管理」时实现侧重点应放在 useEffect 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 副作用本不该用 effect：派生数据用 useMemo，事件处理用 handler，不要塞进 effect
- StrictMode 双调用：开发期 effect 会跑两次，必须保证副作用幂等并清理
- 异步陷阱：effect 里 await 后 setState 时组件可能已卸载，要用 ignore 标志或 AbortController
- 若能补一段「useEffect 常见陷阱与依赖管理」复盘片段，解释 useEffect 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「useEffect 常见陷阱与依赖管理」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 useEffect 的预期结果写成可复核标准。
- 在「useEffect 常见陷阱与依赖管理」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 useEffect 的问题定位闭环。
- 涉及「useEffect 常见陷阱与依赖管理」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「useEffect 常见陷阱与依赖管理」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没说明「useEffect 常见陷阱与依赖管理」在 useEffect 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 表达「useEffect 常见陷阱与依赖管理」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## use-effect-pitfalls-followup-3

title: 追问：useRef + useEffect 模拟「上一次值」的写法
difficulty: 进阶
tags: [useEffect, 陷阱, 追问]
parent: use-effect-pitfalls
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「useEffect 常见陷阱与依赖管理」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> useEffect 机制 -> 取舍边界」回答，再用「useEffect 常见陷阱与依赖管理」补一个反例。

### 题目

如果面试官追问：useRef + useEffect 模拟「上一次值」的写法？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「useEffect 常见陷阱与依赖管理」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> useEffect 机制 -> 取舍边界」回答，再用「useEffect 常见陷阱与依赖管理」补一个反例，避免停在口号层。
- 如果涉及「useEffect 常见陷阱与依赖管理」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 把异步函数直接传给 useEffect（return 不是 cleanup 而是 Promise）
- 把原题观点放进「useEffect 常见陷阱与依赖管理」的一个具体版本迭代里，讲清 useEffect 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「useEffect 常见陷阱与依赖管理」在 useEffect 上的优化不是只在 demo 数据下成立。
- 围绕「useEffect 常见陷阱与依赖管理」建监控时，建议把 useEffect 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「useEffect 常见陷阱与依赖管理」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「useEffect 常见陷阱与依赖管理」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「useEffect 常见陷阱与依赖管理」里 useEffect 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「useEffect 常见陷阱与依赖管理」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-reconciler-fiber-followup-2

title: 追问：围绕「Fiber 架构与并发渲染」上线效果，你会优先看哪些和 Fiber 相关的真实用户指标来佐证体验提升
difficulty: 资深
tags: [Fiber, Concurrent, 追问]
parent: react-reconciler-fiber
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Fiber 架构与并发渲染」不是只在理想输入下成立。；再补可观测指标：围绕「Fiber 架构与并发渲染」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：围绕「Fiber 架构与并发渲染」上线效果，你会优先看哪些和 Fiber 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Fiber 架构与并发渲染」不是只在理想输入下成立。
- 再补可观测指标：围绕「Fiber 架构与并发渲染」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「Fiber 架构与并发渲染」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 准备这道追问时，先画出「Fiber 架构与并发渲染」从输入到输出的关键路径，再补异常路径。
- 准备一个「Fiber 架构与并发渲染」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「Fiber 架构与并发渲染」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## react-reconciler-fiber-followup-3

title: 追问：以「Fiber 架构与并发渲染」为例，如果「Fiber 架构与并发渲染」在 Fiber 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [Fiber, Concurrent, 追问]
parent: react-reconciler-fiber
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Fiber 架构与并发渲染」在当前约束下为什么成立。；围绕「Fiber 架构与并发渲染」组织答案时，建议按「约束来源 -> Fiber 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：以「Fiber 架构与并发渲染」为例，如果「Fiber 架构与并发渲染」在 Fiber 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「Fiber 架构与并发渲染」在当前约束下为什么成立。
- 围绕「Fiber 架构与并发渲染」组织答案时，建议按「约束来源 -> Fiber 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「Fiber 架构与并发渲染」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- Fiber 是 React 16+ 的渲染单元，把组件树拆成可中断、可恢复的工作单元链表
- 并发渲染：渲染分 render 阶段（可中断）和 commit 阶段（同步原子），高优更新可以打断低优
- 回答「Fiber 架构与并发渲染」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 补一个你真实处理过的「Fiber 架构与并发渲染」相似场景：说明 Fiber 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「Fiber 架构与并发渲染」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 Fiber 设计测试与回归流程。
- 围绕「Fiber 架构与并发渲染」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 Fiber 的真实收益是否稳定。
- 如果「Fiber 架构与并发渲染」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「Fiber 架构与并发渲染」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「Fiber 架构与并发渲染」里的 Fiber 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「Fiber 架构与并发渲染」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## state-management-react-followup-2

title: 追问：结合真实业务约束，你会如何围绕 状态管理 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [状态管理, Redux, Zustand, 追问]
parent: state-management-react
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「React 状态管理选型」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 状态管理 方案动作 -> 验证结果」，并用「React 状态管理选型」举一条主链路说明。。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 状态管理 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「React 状态管理选型」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> 状态管理 方案动作 -> 验证结果」，并用「React 状态管理选型」举一条主链路说明。
- 如果涉及「React 状态管理选型」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- Redux：可预测、可调试，适合复杂业务、需要中间件 / DevTools / 时间旅行
- Jotai / Recoil：原子化模型，状态拆成最小单元，依赖自动派生，适合大表单、画布
- 服务端状态：交给 React Query / SWR / RTK Query，不要混进客户端状态库
- 结合一次「React 状态管理选型」线上案例说明 状态管理 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「React 状态管理选型」的最小可复现样例，再扩展到主链路回归，这样能更快确认 状态管理 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「React 状态管理选型」里的 状态管理，否则很难证明变化来自这次改动。
- 围绕「React 状态管理选型」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「React 状态管理选型」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 如果没说明「React 状态管理选型」里 状态管理 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 保持「React 状态管理选型」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## state-management-react-followup-3

title: 追问：在当前团队与业务约束下，围绕「React 状态管理选型」选型时，你会怎样按 状态管理 与业务复杂度给出分层推荐
difficulty: 进阶
tags: [状态管理, Redux, Zustand, 追问]
parent: state-management-react
generated: followup-script

### 一句话

推动「React 状态管理选型」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「React 状态管理选型」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「React 状态管理选型」选型时，你会怎样按 状态管理 与业务复杂度给出分层推荐？

### 答案要点

#### 核心回答

- 推动「React 状态管理选型」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「React 状态管理选型」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「React 状态管理选型」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「React 状态管理选型」的核心机制，再补一个会失败的具体场景。
- 准备一个与「React 状态管理选型」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「React 状态管理选型」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## react-router-data-loaders-followup-2

title: 追问：结合真实业务约束，你会如何围绕 Router 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [Router, 数据加载, 追问]
parent: react-router-data-loaders
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「React Router v6.4+ 的 Data Router 与 loaders」落到真实交付，而不是停在概念层。；可以按「问题背景 -> Router 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 Router 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「React Router v6.4+ 的 Data Router 与 loaders」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> Router 机制 -> 取舍边界」回答，再用「React Router v6.4+ 的 Data Router 与 loaders」补一个反例，避免停在口号层。
- 讲「React Router v6.4+ 的 Data Router 与 loaders」时实现侧重点应放在 Router 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- action 接管表单提交，自动 revalidate 当前路由 loader，写后立即看到最新数据
- 与 RSC 思路一致：把数据获取靠近路由层，避免组件里散落的 useEffect fetch
- 回答「React Router v6.4+ 的 Data Router 与 loaders」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 给出与「React Router v6.4+ 的 Data Router 与 loaders」相关的业务上下文，说明 Router 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「React Router v6.4+ 的 Data Router 与 loaders」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 Router 的缺口。
- 围绕「React Router v6.4+ 的 Data Router 与 loaders」的观测层要绑定 Router 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 涉及「React Router v6.4+ 的 Data Router 与 loaders」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「React Router v6.4+ 的 Data Router 与 loaders」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没有针对「React Router v6.4+ 的 Data Router 与 loaders」里的 Router 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 表达「React Router v6.4+ 的 Data Router 与 loaders」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-router-data-loaders-followup-3

title: 追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，围绕「React Router v6.4+ 的 Data Router 与 loaders」选型时，你会怎样按 Router 与业务复杂度给出分层推荐
difficulty: 进阶
tags: [Router, 数据加载, 追问]
parent: react-router-data-loaders
generated: followup-script

### 一句话

规模变大后先重新评估「React Router v6.4+ 的 Data Router 与 loaders」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，围绕「React Router v6.4+ 的 Data Router 与 loaders」选型时，你会怎样按 Router 与业务复杂度给出分层推荐？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「React Router v6.4+ 的 Data Router 与 loaders」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「React Router v6.4+ 的 Data Router 与 loaders」对应的渲染与状态边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「React Router v6.4+ 的 Data Router 与 loaders」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 先把「React Router v6.4+ 的 Data Router 与 loaders」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。
- 回答「React Router v6.4+ 的 Data Router 与 loaders」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。
- 回答「React Router v6.4+ 的 Data Router 与 loaders」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。

## react-perf-followup-2

title: 追问：以「React 性能优化清单」为例，要证明「React 性能优化清单」确实改善体验，你会如何围绕 性能 设计线上观测与对照验证
difficulty: 进阶
tags: [性能, memo, 虚拟化, 追问]
parent: react-perf
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 性能优化清单」不是只在理想输入下成立。；再补可观测指标：围绕「React 性能优化清单」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「React 性能优化清单」为例，要证明「React 性能优化清单」确实改善体验，你会如何围绕 性能 设计线上观测与对照验证？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「React 性能优化清单」不是只在理想输入下成立。
- 再补可观测指标：围绕「React 性能优化清单」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「React 性能优化清单」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 开口先讲「React 性能优化清单」的核心取舍，再补一个反例说明为什么不能照搬默认做法。
- 围绕「React 性能优化清单」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。
- 结束前补一句「React 性能优化清单」取舍结论：这个方案适合哪些约束，不适合哪些场景。

## react-perf-followup-3

title: 追问：结合真实业务约束，围绕「React 性能优化清单」在 性能 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [性能, memo, 虚拟化, 追问]
parent: react-perf
generated: followup-script

### 一句话

规模变大后先重新评估「React 性能优化清单」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「React 性能优化清单」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：结合真实业务约束，围绕「React 性能优化清单」在 性能 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「React 性能优化清单」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「React 性能优化清单」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「React 性能优化清单」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 复盘时先确认「React 性能优化清单」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「React 性能优化清单」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「React 性能优化清单」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-19-features-followup-2

title: 追问：在「React 19 关键特性速览」场景下，为了证明这个方案在 React 19 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [React 19, Actions, 追问]
parent: react-19-features
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「React 19 关键特性速览」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> React 19 方案动作 -> 验证结果」，并用「React 19 关键特性速览」举一条主链路说明。。

### 题目

如果面试官追问：在「React 19 关键特性速览」场景下，为了证明这个方案在 React 19 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「React 19 关键特性速览」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> React 19 方案动作 -> 验证结果」，并用「React 19 关键特性速览」举一条主链路说明。
- 讲「React 19 关键特性速览」时实现侧重点应放在 React 19 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 回答「React 19 关键特性速览」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 相关标签是 React 19、Actions，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 大部分 19 新特性需要 React + 框架（Next / Remix）配合才能体现完整价值
- 若能补一段「React 19 关键特性速览」复盘片段，解释 React 19 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「React 19 关键特性速览」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React 19 的预期结果写成可复核标准。
- 在「React 19 关键特性速览」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React 19 的问题定位闭环。
- 涉及「React 19 关键特性速览」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「React 19 关键特性速览」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没说明「React 19 关键特性速览」在 React 19 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 表达「React 19 关键特性速览」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-19-features-followup-3

title: 追问：在评审「React 19 关键特性速览」时，你会如何围绕 React 19 向团队解释“什么时候值得用，什么时候别硬上”
difficulty: 资深
tags: [React 19, Actions, 追问]
parent: react-19-features
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「React 19 关键特性速览」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> React 19 方案动作 -> 验证结果」，并用「React 19 关键特性速览」举一条主链路说明。。

### 题目

如果面试官追问：在评审「React 19 关键特性速览」时，你会如何围绕 React 19 向团队解释“什么时候值得用，什么时候别硬上”？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「React 19 关键特性速览」时要能同时解释收益、代价和失败信号。
- 回答顺序可用「现状问题 -> React 19 方案动作 -> 验证结果」，并用「React 19 关键特性速览」举一条主链路说明。
- 如果涉及「React 19 关键特性速览」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 回答「React 19 关键特性速览」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 相关标签是 React 19、Actions，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 大部分 19 新特性需要 React + 框架（Next / Remix）配合才能体现完整价值
- 把原题观点放进「React 19 关键特性速览」的一个具体版本迭代里，讲清 React 19 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「React 19 关键特性速览」在 React 19 上的优化不是只在 demo 数据下成立。
- 围绕「React 19 关键特性速览」建监控时，建议把 React 19 指标和业务转化指标并排展示，避免只看技术侧信号。
- 围绕「React 19 关键特性速览」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「React 19 关键特性速览」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 只关注「React 19 关键特性速览」里 React 19 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 保持「React 19 关键特性速览」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-typescript-patterns-followup-2

title: 追问：结合真实业务约束，如果要让结论在 TypeScript 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [TypeScript, 泛型, 追问]
parent: react-typescript-patterns
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React + TypeScript 常用类型模式」在当前约束下为什么成立。；回答结构可按「触发条件 -> TypeScript 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 TypeScript 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React + TypeScript 常用类型模式」在当前约束下为什么成立。
- 回答结构可按「触发条件 -> TypeScript 机制 -> 风险兜底」展开，并以「React + TypeScript 常用类型模式」补一条失败场景，能体现工程拆解能力。
- 不要只罗列工具名或 API，最好把「React + TypeScript 常用类型模式」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 回答「React + TypeScript 常用类型模式」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 相关标签是 TypeScript、泛型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 复杂泛型出错时优先看"传入的实参是否被推导成 unknown"，加约束 extends 通常就好
- 补一个你真实处理过的「React + TypeScript 常用类型模式」相似场景：说明 TypeScript 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「React + TypeScript 常用类型模式」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 TypeScript 设计测试与回归流程。
- 围绕「React + TypeScript 常用类型模式」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 TypeScript 的真实收益是否稳定。
- 如果「React + TypeScript 常用类型模式」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React + TypeScript 常用类型模式」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「React + TypeScript 常用类型模式」里的 TypeScript 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「React + TypeScript 常用类型模式」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-typescript-patterns-followup-3

title: 追问：从工程落地角度看，和常见替代方案相比，「React + TypeScript 常用类型模式」在 TypeScript 这个维度更适合什么团队规模与业务复杂度
difficulty: 进阶
tags: [TypeScript, 泛型, 追问]
parent: react-typescript-patterns
generated: followup-script

### 一句话

规模变大后先重新评估「React + TypeScript 常用类型模式」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「React + TypeScript 常用类型模式」对应的渲染与状态边界收益被复杂度抵消。

### 题目

如果面试官追问：从工程落地角度看，和常见替代方案相比，「React + TypeScript 常用类型模式」在 TypeScript 这个维度更适合什么团队规模与业务复杂度？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「React + TypeScript 常用类型模式」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「React + TypeScript 常用类型模式」对应的渲染与状态边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「React + TypeScript 常用类型模式」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「React + TypeScript 常用类型模式」的核心机制，再补一个会失败的具体场景。
- 准备一个与「React + TypeScript 常用类型模式」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「React + TypeScript 常用类型模式」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## react-testing-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 测试链路 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [测试, RTL, 追问]
parent: react-testing
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「React 组件测试要测什么、怎么测」时要能同时解释收益、代价和失败信号。；讲「React 组件测试要测什么、怎么测」时先给 测试链路 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 测试链路 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「React 组件测试要测什么、怎么测」时要能同时解释收益、代价和失败信号。
- 讲「React 组件测试要测什么、怎么测」时先给 测试链路 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「React 组件测试要测什么、怎么测」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- "像用户一样测试"：不要测实现细节（state、私有方法），要测可见行为
- 回答「React 组件测试要测什么、怎么测」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 相关标签是 测试、RTL，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 补一个你真实处理过的「React 组件测试要测什么、怎么测」相似场景：说明 测试链路 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「React 组件测试要测什么、怎么测」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 测试链路 设计测试与回归流程。
- 围绕「React 组件测试要测什么、怎么测」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 测试链路 的真实收益是否稳定。
- 围绕「React 组件测试要测什么、怎么测」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「React 组件测试要测什么、怎么测」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 另一个问题是缺少失败预案：若「React 组件测试要测什么、怎么测」里的 测试链路 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 保持「React 组件测试要测什么、怎么测」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-testing-followup-3

title: 追问：以「React 组件测试要测什么、怎么测」为例，当业务复杂度升级时，你会如何判断「React 组件测试要测什么、怎么测」在 测试链路 上还能不能继续扛住
difficulty: 进阶
tags: [测试, RTL, 追问]
parent: react-testing
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React 组件测试要测什么、怎么测」在当前约束下为什么成立。；建议按「输入约束 -> 测试链路 执行链路 -> 结果验证」展开，并结合「React 组件测试要测什么、怎么测」给出一条可复核结果。

### 题目

如果面试官追问：以「React 组件测试要测什么、怎么测」为例，当业务复杂度升级时，你会如何判断「React 组件测试要测什么、怎么测」在 测试链路 上还能不能继续扛住？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React 组件测试要测什么、怎么测」在当前约束下为什么成立。
- 建议按「输入约束 -> 测试链路 执行链路 -> 结果验证」展开，并结合「React 组件测试要测什么、怎么测」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 不要只罗列工具名或 API，最好把「React 组件测试要测什么、怎么测」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- "像用户一样测试"：不要测实现细节（state、私有方法），要测可见行为
- 回答「React 组件测试要测什么、怎么测」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 相关标签是 测试、RTL，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。
- 补一个你真实处理过的「React 组件测试要测什么、怎么测」相似场景：说明 测试链路 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「React 组件测试要测什么、怎么测」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 测试链路 设计测试与回归流程。
- 围绕「React 组件测试要测什么、怎么测」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 测试链路 的真实收益是否稳定。
- 如果「React 组件测试要测什么、怎么测」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React 组件测试要测什么、怎么测」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「React 组件测试要测什么、怎么测」里的 测试链路 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「React 组件测试要测什么、怎么测」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-key-warning-followup-2

title: 追问：在当前团队与业务约束下，如果实验室分数变好但线上反馈一般，你会如何围绕 Diff 重新评估「列表渲染中 key 的作用与使用陷阱」优化效果
difficulty: 基础
tags: [Diff, key, 追问]
parent: react-key-warning
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「列表渲染中 key 的作用与使用陷阱」不是只在理想输入下成立。；再补可观测指标：围绕「列表渲染中 key 的作用与使用陷阱」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变。

### 题目

如果面试官追问：在当前团队与业务约束下，如果实验室分数变好但线上反馈一般，你会如何围绕 Diff 重新评估「列表渲染中 key 的作用与使用陷阱」优化效果？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「列表渲染中 key 的作用与使用陷阱」不是只在理想输入下成立。
- 再补可观测指标：围绕「列表渲染中 key 的作用与使用陷阱」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「列表渲染中 key 的作用与使用陷阱」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 准备这道追问时，先画出「列表渲染中 key 的作用与使用陷阱」从输入到输出的关键路径，再补异常路径。
- 准备一个「列表渲染中 key 的作用与使用陷阱」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「列表渲染中 key 的作用与使用陷阱」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## react-key-warning-followup-3

title: 追问：在「列表渲染中 key 的作用与使用陷阱」场景下，你会怎样评估「列表渲染中 key 的作用与使用陷阱」在性能收益与兼容性风险之间的平衡点
difficulty: 基础
tags: [Diff, key, 追问]
parent: react-key-warning
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「列表渲染中 key 的作用与使用陷阱」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> Diff 方案动作 -> 验证结果」，并用「列表渲染中 key 的作用与使用陷阱」举一条主链路说明。。

### 题目

如果面试官追问：在「列表渲染中 key 的作用与使用陷阱」场景下，你会怎样评估「列表渲染中 key 的作用与使用陷阱」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「列表渲染中 key 的作用与使用陷阱」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> Diff 方案动作 -> 验证结果」，并用「列表渲染中 key 的作用与使用陷阱」举一条主链路说明。
- 讲「列表渲染中 key 的作用与使用陷阱」时实现侧重点应放在 Diff 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- key 帮助 React 在 reconcile 时识别哪些元素是「同一个」，决定复用、移动还是销毁
- 同层 key 必须唯一且稳定，跨层级无要求
- 用数组 index 作为 key 在「插入/删除/排序」时会导致状态错位（输入框内容跑到错误的行上）
- 把原题观点放进「列表渲染中 key 的作用与使用陷阱」的一个具体版本迭代里，讲清 Diff 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「列表渲染中 key 的作用与使用陷阱」在 Diff 上的优化不是只在 demo 数据下成立。
- 围绕「列表渲染中 key 的作用与使用陷阱」建监控时，建议把 Diff 指标和业务转化指标并排展示，避免只看技术侧信号。
- 涉及「列表渲染中 key 的作用与使用陷阱」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「列表渲染中 key 的作用与使用陷阱」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 只关注「列表渲染中 key 的作用与使用陷阱」里 Diff 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 表达「列表渲染中 key 的作用与使用陷阱」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-controlled-vs-uncontrolled-followup-2

title: 追问：在当前团队与业务约束下，你会如何结合 表单 指标，避免把「受控组件 vs 非受控组件，性能边界在哪」的实验室提升误判为真实用户体验改善
difficulty: 进阶
tags: [表单, 性能, 追问]
parent: react-controlled-vs-uncontrolled
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「受控组件 vs 非受控组件，性能边界在哪」不是只在理想输入下成立。；再补可观测指标：围绕「受控组件 vs 非受控组件。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何结合 表单 指标，避免把「受控组件 vs 非受控组件，性能边界在哪」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「受控组件 vs 非受控组件，性能边界在哪」不是只在理想输入下成立。
- 再补可观测指标：围绕「受控组件 vs 非受控组件，性能边界在哪」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果「受控组件 vs 非受控组件，性能边界在哪」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

#### 学习抓手

- 复盘时先确认「受控组件 vs 非受控组件，性能边界在哪」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「受控组件 vs 非受控组件，性能边界在哪」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「受控组件 vs 非受控组件，性能边界在哪」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-controlled-vs-uncontrolled-followup-3

title: 追问：在当前团队与业务约束下，你会怎样评估「受控组件 vs 非受控组件，性能边界在哪」在性能收益与兼容性风险之间的平衡点
difficulty: 进阶
tags: [表单, 性能, 追问]
parent: react-controlled-vs-uncontrolled
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「受控组件 vs 非受控组件，性能边界在哪」落到真实交付，而不是停在概念层。；讲「受控组件 vs 非受控组件，性能边界在哪」时先给 表单 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样评估「受控组件 vs 非受控组件，性能边界在哪」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「受控组件 vs 非受控组件，性能边界在哪」落到真实交付，而不是停在概念层。
- 讲「受控组件 vs 非受控组件，性能边界在哪」时先给 表单 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 讲「受控组件 vs 非受控组件，性能边界在哪」时实现侧重点应放在 表单 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 受控：value + onChange，组件自身不存储状态，便于校验/联动
- 非受控：用 ref + defaultValue，性能好，但无法实时联动
- 大表单优化：拆分组件 + memo / useFormState（react-hook-form）非受控、状态外包至库
- 把原题观点放进「受控组件 vs 非受控组件，性能边界在哪」的一个具体版本迭代里，讲清 表单 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「受控组件 vs 非受控组件，性能边界在哪」在 表单 上的优化不是只在 demo 数据下成立。
- 围绕「受控组件 vs 非受控组件，性能边界在哪」建监控时，建议把 表单 指标和业务转化指标并排展示，避免只看技术侧信号。
- 涉及「受控组件 vs 非受控组件，性能边界在哪」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「受控组件 vs 非受控组件，性能边界在哪」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 只关注「受控组件 vs 非受控组件，性能边界在哪」里 表单 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 表达「受控组件 vs 非受控组件，性能边界在哪」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-portal-error-boundary-followup-2

title: 追问：以「Portal、Error Boundary、Suspense 的协作方式」为例，面对团队能力差异，你会如何围绕 架构 把「Portal、Error Boundary、Suspense 的协作方式」拆成可并行推进的小阶段
difficulty: 进阶
tags: [架构, 错误处理, 追问]
parent: react-portal-error-boundary
generated: followup-script

### 一句话

推动「Portal、Error Boundary、Suspense 的协作方式」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：以「Portal、Error Boundary、Suspense 的协作方式」为例，面对团队能力差异，你会如何围绕 架构 把「Portal、Error Boundary、Suspense 的协作方式」拆成可并行推进的小阶段？

### 答案要点

#### 核心回答

- 推动「Portal、Error Boundary、Suspense 的协作方式」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「Portal、Error Boundary、Suspense 的协作方式」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Portal、Error Boundary、Suspense 的协作方式」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 先用一句话给出「Portal、Error Boundary、Suspense 的协作方式」的判断标准，再补一个会导致方案失效的真实约束。
- 回答时最好给出你在「Portal、Error Boundary、Suspense 的协作方式」里做过的验证动作，证明结论不是“理论上可行”。
- 收尾时把「Portal、Error Boundary、Suspense 的协作方式」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。

## react-portal-error-boundary-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「Portal、Error Boundary、Suspense 的协作方式」还值不值得继续维护
difficulty: 进阶
tags: [架构, 错误处理, 追问]
parent: react-portal-error-boundary
generated: followup-script

### 一句话

规模变大后先重新评估「Portal、Error Boundary、Suspense 的协作方式」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「Portal、Error Boundary、Suspense 的协作方式」还值不值得继续维护？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「Portal、Error Boundary、Suspense 的协作方式」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「Portal、Error Boundary、Suspense 的协作方式」对应的工程可维护性收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「Portal、Error Boundary、Suspense 的协作方式」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 先解释「Portal、Error Boundary、Suspense 的协作方式」在你项目里的目标，再说明最容易踩坑的边界条件。
- 把「Portal、Error Boundary、Suspense 的协作方式」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。
- 收尾时对比「Portal、Error Boundary、Suspense 的协作方式」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。

## react-compiler-boundaries-followup-1

title: 追问：在「React Compiler 自动 memo 的原理、限制与落地边界」场景下，什么情况下 React Compiler 会跳过某个组件或 hook
difficulty: 资深
tags: [React Compiler, 性能, 编译优化, 追问]
parent: react-compiler-boundaries
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「React Compiler 自动 memo 的原理、限制与落地边界」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> React Compiler 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「React Compiler 自动 memo 的原理、限制与落地边界」场景下，什么情况下 React Compiler 会跳过某个组件或 hook？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「React Compiler 自动 memo 的原理、限制与落地边界」落到真实交付，而不是停在概念层。
- 回答顺序可用「现状问题 -> React Compiler 方案动作 -> 验证结果」，并用「React Compiler 自动 memo 的原理、限制与落地边界」举一条主链路说明。
- 讲「React Compiler 自动 memo 的原理、限制与落地边界」时实现侧重点应放在 React Compiler 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- 它不能替代所有性能设计：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。
- 迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。
- 若能补一段「React Compiler 自动 memo 的原理、限制与落地边界」复盘片段，解释 React Compiler 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「React Compiler 自动 memo 的原理、限制与落地边界」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React Compiler 的预期结果写成可复核标准。
- 在「React Compiler 自动 memo 的原理、限制与落地边界」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React Compiler 的问题定位闭环。
- 涉及「React Compiler 自动 memo 的原理、限制与落地边界」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「React Compiler 自动 memo 的原理、限制与落地边界」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 若没说明「React Compiler 自动 memo 的原理、限制与落地边界」在 React Compiler 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 表达「React Compiler 自动 memo 的原理、限制与落地边界」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-compiler-boundaries-followup-2

title: 追问：以「React Compiler 自动 memo 的原理、限制与落地边界」为例，它和 React.memo、useMemo、useCallback 的迁移顺序怎么安排
difficulty: 资深
tags: [React Compiler, 性能, 编译优化, 追问]
parent: react-compiler-boundaries
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React Compiler 自动 memo 的原理、限制与落地边界」在当前约束下为什么成立。；围绕「React Compiler 自动 memo 的原理、限制与落地边界」组织答案时。

### 题目

如果面试官追问：以「React Compiler 自动 memo 的原理、限制与落地边界」为例，它和 React.memo、useMemo、useCallback 的迁移顺序怎么安排？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React Compiler 自动 memo 的原理、限制与落地边界」在当前约束下为什么成立。
- 围绕「React Compiler 自动 memo 的原理、限制与落地边界」组织答案时，建议按「约束来源 -> React Compiler 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「React Compiler 自动 memo 的原理、限制与落地边界」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- 它不能替代所有性能设计：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。
- 迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。
- 结合一次「React Compiler 自动 memo 的原理、限制与落地边界」线上案例说明 React Compiler 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「React Compiler 自动 memo 的原理、限制与落地边界」的最小可复现样例，再扩展到主链路回归，这样能更快确认 React Compiler 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「React Compiler 自动 memo 的原理、限制与落地边界」里的 React Compiler，否则很难证明变化来自这次改动。
- 如果「React Compiler 自动 memo 的原理、限制与落地边界」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React Compiler 自动 memo 的原理、限制与落地边界」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 如果没说明「React Compiler 自动 memo 的原理、限制与落地边界」里 React Compiler 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 不要把「React Compiler 自动 memo 的原理、限制与落地边界」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-compiler-boundaries-followup-3

title: 追问：在当前团队与业务约束下，你会用哪些 Profiler 指标证明 Compiler 真的带来了收益
difficulty: 资深
tags: [React Compiler, 性能, 编译优化, 追问]
parent: react-compiler-boundaries
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React Compiler 自动 memo 的原理、限制与落地边界」在当前约束下为什么成立。；围绕「React Compiler 自动 memo 的原理、限制与落地边界」组织答案时。

### 题目

如果面试官追问：在当前团队与业务约束下，你会用哪些 Profiler 指标证明 Compiler 真的带来了收益？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React Compiler 自动 memo 的原理、限制与落地边界」在当前约束下为什么成立。
- 围绕「React Compiler 自动 memo 的原理、限制与落地边界」组织答案时，建议按「约束来源 -> React Compiler 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「React Compiler 自动 memo 的原理、限制与落地边界」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- 它不能替代所有性能设计：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。
- 迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。
- 补一个你真实处理过的「React Compiler 自动 memo 的原理、限制与落地边界」相似场景：说明 React Compiler 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「React Compiler 自动 memo 的原理、限制与落地边界」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 React Compiler 设计测试与回归流程。
- 围绕「React Compiler 自动 memo 的原理、限制与落地边界」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 React Compiler 的真实收益是否稳定。
- 如果「React Compiler 自动 memo 的原理、限制与落地边界」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React Compiler 自动 memo 的原理、限制与落地边界」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「React Compiler 自动 memo 的原理、限制与落地边界」里的 React Compiler 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「React Compiler 自动 memo 的原理、限制与落地边界」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-server-state-query-cache-followup-1

title: 追问：结合真实业务约束，staleTime 和 gcTime 分别解决什么问题
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存, 追问]
parent: react-server-state-query-cache
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」讲成只在理想输入下可用。；建议按「输入约束 -> React 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，`staleTime` 和 `gcTime` 分别解决什么问题？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」讲成只在理想输入下可用。
- 建议按「输入约束 -> React 执行链路 -> 结果验证」展开，并结合「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」回答里，实现层面要解释 React 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- staleTime 控制“多久内认为新鲜”，gcTime/cacheTime 控制“多久不用后清理”；两者不等同。
- 服务端状态库解决的是缓存和网络协调，不等于替代所有状态管理。
- 若能补一段「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」复盘片段，解释 React 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React 的预期结果写成可复核标准。
- 在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React 的问题定位闭环。
- 「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 若没说明「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」在 React 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 避免把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## react-server-state-query-cache-followup-2

title: 追问：以「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」为例，乐观更新失败时，如何保证 UI、缓存和服务端最终一致
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存, 追问]
parent: react-server-state-query-cache
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」在当前约束下为什么成立。。

### 题目

如果面试官追问：以「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」为例，乐观更新失败时，如何保证 UI、缓存和服务端最终一致？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」在当前约束下为什么成立。
- 围绕「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」组织答案时，建议按「约束来源 -> React 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 服务端状态有来源权威：真正的数据在服务端，前端只缓存快照；它会过期、被别人修改、需要重新验证。
- Query key 是缓存边界，必须包含资源类型、过滤条件、分页、用户身份等影响结果的维度；key 设计错会串数据或无法失效。
- 读取类请求可自动去重、后台刷新、窗口聚焦刷新；写操作要用 mutation，成功后 invalidate 或直接更新缓存。
- 给出与「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」相关的业务上下文，说明 React 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 React 的缺口。
- 围绕「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」的观测层要绑定 React 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 如果「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没有针对「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的 React 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 不要把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-server-state-query-cache-followup-3

title: 追问：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」场景下，SSR 预取后，如何避免客户端 hydration 又请求一遍
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存, 追问]
parent: react-server-state-query-cache
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」落到真实交付，而不是停在概念层。；可以按「问题背景 -> React 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」场景下，SSR 预取后，如何避免客户端 hydration 又请求一遍？

### 答案要点

#### 回答思路

- 先给可验证结论，再补证据链：面试官想确认你是否能把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」落到真实交付，而不是停在概念层。
- 可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」补一个反例，避免停在口号层。
- 讲「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」时实现侧重点应放在 React 与边界输入，决策侧重点应放在收益与维护成本平衡。

#### 结合原题展开

- 服务端状态有来源权威：真正的数据在服务端，前端只缓存快照；它会过期、被别人修改、需要重新验证。
- Query key 是缓存边界，必须包含资源类型、过滤条件、分页、用户身份等影响结果的维度；key 设计错会串数据或无法失效。
- 读取类请求可自动去重、后台刷新、窗口聚焦刷新；写操作要用 mutation，成功后 invalidate 或直接更新缓存。
- 结合一次「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」线上案例说明 React 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。

#### 工程落地

- 建议先准备「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」的最小可复现样例，再扩展到主链路回归，这样能更快确认 React 的改动是否真的生效。
- 观测口径要前后一致：上线前后使用同一组指标观察「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的 React，否则很难证明变化来自这次改动。
- 涉及「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。

#### 易错点

- 不要把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。
- 如果没说明「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里 React 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。
- 表达「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。

## react-use-sync-external-store-followup-1

title: 追问：tearing 是什么，为什么 React 并发渲染会放大这个问题
difficulty: 资深
tags: [React, 并发渲染, Store, 追问]
parent: react-use-sync-external-store
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」讲成只在理想输入下可用。；回答结构可按「触发条件 -> React 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：tearing 是什么，为什么 React 并发渲染会放大这个问题？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」讲成只在理想输入下可用。
- 回答结构可按「触发条件 -> React 机制 -> 风险兜底」展开，并以「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」补一条失败场景，能体现工程拆解能力。
- 在「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」回答里，实现层面要解释 React 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。
- getSnapshot 必须返回当前状态快照；如果状态没变，返回值引用也应稳定，否则会导致无限重渲染。
- subscribe 负责在 store 变化时通知 React；React 再重新读取 snapshot，而不是让外部 store 直接驱动 DOM。
- 补一个你真实处理过的「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」相似场景：说明 React 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 React 设计测试与回归流程。
- 围绕「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 React 的真实收益是否稳定。
- 「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 另一个问题是缺少失败预案：若「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」里的 React 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 避免把「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## react-use-sync-external-store-followup-2

title: 追问：在当前团队与业务约束下，getSnapshot 的返回值为什么需要引用稳定
difficulty: 资深
tags: [React, 并发渲染, Store, 追问]
parent: react-use-sync-external-store
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」时要能同时解释收益、代价和失败信号。。

### 题目

如果面试官追问：在当前团队与业务约束下，`getSnapshot` 的返回值为什么需要引用稳定？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」时要能同时解释收益、代价和失败信号。
- 讲「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」时先给 React 的判断口径，再补执行动作和回退条件，会更像真实评审发言。
- 如果涉及「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- getSnapshot 必须返回当前状态快照；如果状态没变，返回值引用也应稳定，否则会导致无限重渲染。
- 并发渲染中 React 可能多次调用 getSnapshot，确认提交前后快照一致；不一致就重新渲染。
- selector 场景要注意引用稳定和浅比较，否则一个小字段变化可能导致大量组件重渲染。
- 若能补一段「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」复盘片段，解释 React 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React 的预期结果写成可复核标准。
- 在「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React 的问题定位闭环。
- 围绕「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没说明「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」在 React 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 保持「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-use-sync-external-store-followup-3

title: 追问：以「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」为例，Zustand / Redux 这类库在 React 18 之后为什么要适配这个 Hook
difficulty: 资深
tags: [React, 并发渲染, Store, 追问]
parent: react-use-sync-external-store
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」在当前约束下为什么成立。；围绕「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」组织答案时。

### 题目

如果面试官追问：以「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」为例，Zustand / Redux 这类库在 React 18 之后为什么要适配这个 Hook？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」在当前约束下为什么成立。
- 围绕「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」组织答案时，建议按「约束来源 -> React 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。
- subscribe 负责在 store 变化时通知 React；React 再重新读取 snapshot，而不是让外部 store 直接驱动 DOM。
- 并发渲染中 React 可能多次调用 getSnapshot，确认提交前后快照一致；不一致就重新渲染。
- 补一个你真实处理过的「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」相似场景：说明 React 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。

#### 工程落地

- 落地「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 React 设计测试与回归流程。
- 围绕「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 React 的真实收益是否稳定。
- 如果「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 另一个问题是缺少失败预案：若「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」里的 React 异常时没有降级与回滚说明，答案会显得工程成熟度不足。
- 不要把「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-complex-form-architecture-followup-1

title: 追问：在当前团队与业务约束下，React Hook Form 为什么在大表单里通常比全受控 state 更省渲染
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod, 追问]
parent: react-complex-form-architecture
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> React 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在当前团队与业务约束下，React Hook Form 为什么在大表单里通常比全受控 state 更省渲染？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」补一个反例，避免停在口号层。
- 如果涉及「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 字段联动要明确依赖关系：watch 少量关键字段，避免每个字段变化都让整个表单重渲染。
- 大表单要考虑分步、虚拟化、懒加载子表单和保存草稿，否则移动端体验会很差。
- 若能补一段「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」复盘片段，解释 React 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React 的预期结果写成可复核标准。
- 在「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React 的问题定位闭环。
- 围绕「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没说明「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」在 React 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 保持「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-complex-form-architecture-followup-2

title: 追问：异步唯一性校验如何避免慢响应覆盖新输入
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod, 追问]
parent: react-complex-form-architecture
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」在当前约束下为什么成立。；建议按「输入约束 -> React 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：异步唯一性校验如何避免慢响应覆盖新输入？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」在当前约束下为什么成立。
- 建议按「输入约束 -> React 执行链路 -> 结果验证」展开，并结合「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 不要只罗列工具名或 API，最好把「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 默认值异步加载要区分“初始加载”和“用户已编辑”：数据回来后不要直接覆盖用户正在输入的脏字段。
- 校验分层：字段级同步校验、跨字段校验、异步唯一性校验、提交后的服务端错误都要有展示位置。
- 异步默认值回来后无条件 reset，覆盖了用户已经输入的内容。
- 若能补一段「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」复盘片段，解释 React 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React 的预期结果写成可复核标准。
- 在「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React 的问题定位闭环。
- 如果「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没说明「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」在 React 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 不要把「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-complex-form-architecture-followup-3

title: 追问：在当前团队与业务约束下，分步表单里，草稿保存和最终提交校验如何协调
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod, 追问]
parent: react-complex-form-architecture
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> React 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在当前团队与业务约束下，分步表单里，草稿保存和最终提交校验如何协调？

### 答案要点

#### 回答思路

- 先说判断标准，再说执行路径：回答「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」时要能同时解释收益、代价和失败信号。
- 可以按「问题背景 -> React 机制 -> 取舍边界」回答，再用「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」补一个反例，避免停在口号层。
- 如果涉及「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。

#### 结合原题展开

- 简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 字段联动要明确依赖关系：watch 少量关键字段，避免每个字段变化都让整个表单重渲染。
- 提交流程要处理 pending、重复提交、乐观提示、错误回填、成功后重置或保留草稿。
- 给出与「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」相关的业务上下文，说明 React 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。

#### 工程落地

- 针对「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 React 的缺口。
- 围绕「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」的观测层要绑定 React 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。
- 围绕「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。

#### 易错点

- 最容易失分的是只说「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。
- 若没有针对「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」里的 React 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。
- 保持「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。

## react-suspense-data-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Suspense 方案有效
difficulty: 资深
tags: [Suspense, 数据加载, 追问]
parent: react-suspense-data
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Suspense 与异步数据加载」在当前约束下为什么成立。；回答结构可按「触发条件 -> Suspense 机制 -> 风险兜底」展开，并以「Suspense 与异步数据加载」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Suspense 方案有效？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「Suspense 与异步数据加载」在当前约束下为什么成立。
- 回答结构可按「触发条件 -> Suspense 机制 -> 风险兜底」展开，并以「Suspense 与异步数据加载」补一条失败场景，能体现工程拆解能力。
- 不要只罗列工具名或 API，最好把「Suspense 与异步数据加载」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支
- 配合 use(promise) / RSC / React Query suspense mode / Relay 等
- 配合 startTransition 可以避免每次切换都闪烁，保留旧数据直到新数据就绪
- 若能补一段「Suspense 与异步数据加载」复盘片段，解释 Suspense 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「Suspense 与异步数据加载」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 Suspense 的预期结果写成可复核标准。
- 在「Suspense 与异步数据加载」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 Suspense 的问题定位闭环。
- 如果「Suspense 与异步数据加载」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「Suspense 与异步数据加载」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没说明「Suspense 与异步数据加载」在 Suspense 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 不要把「Suspense 与异步数据加载」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-suspense-data-followup-3

title: 追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 Suspense 重新划分「Suspense 与异步数据加载」的实施阶段
difficulty: 资深
tags: [Suspense, 数据加载, 追问]
parent: react-suspense-data
generated: followup-script

### 一句话

规模变大后先重新评估「Suspense 与异步数据加载」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Suspense 与异步数据加载」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 Suspense 重新划分「Suspense 与异步数据加载」的实施阶段？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「Suspense 与异步数据加载」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「Suspense 与异步数据加载」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「Suspense 与异步数据加载」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 复盘时先确认「Suspense 与异步数据加载」的关键假设，再举一个违背假设后的失败案例。
- 建议准备「Suspense 与异步数据加载」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。
- 结尾把「Suspense 与异步数据加载」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。

## react-render-budget-gate

title: React 渲染预算治理：把重渲染风险前置到发布闸门
difficulty: 资深
tags: [React, 性能预算, 渲染治理]
followups: [react-render-budget-gate-followup-1, react-render-budget-gate-followup-2, react-render-budget-gate-followup-3]

### 一句话

React 性能问题多数不是“某个组件慢”，而是“重渲染失控”：给关键页面建立渲染预算并接入 CI/CD，能在上线前拦截性能回归。

### 题目

你会如何给 React 应用建立渲染预算体系，避免功能迭代时出现隐性重渲染和交互卡顿？

### 答案要点

- 先定义预算对象：关键页面渲染次数、提交耗时分位、长任务占比、交互延迟阈值。
- 预算分层执行：本地开发告警、PR 阶段阻断、灰度阶段动态观测。
- 预算评估要结合用户场景：输入密集、列表滚动、复杂表单和弱设备分开测量。
- 对高风险改动做专项护栏：context 扩散、列表 key 变化、依赖误配导致的无效重算。
- 引入自动回退策略：关键指标连续劣化触发降级开关或回滚路径。
- 复盘沉淀可复用规则：高频回归模式写入 lint/测试模板，减少重复踩坑。

### 代码示例

```ts
type RenderBudget = {
  maxRendersPerAction: number;
  maxCommitP95Ms: number;
  maxLongTaskRate: number;
};

function checkRenderBudget(
  actual: { renders: number; commitP95Ms: number; longTaskRate: number },
  budget: RenderBudget,
) {
  return (
    actual.renders <= budget.maxRendersPerAction &&
    actual.commitP95Ms <= budget.maxCommitP95Ms &&
    actual.longTaskRate <= budget.maxLongTaskRate
  );
}
```

```yaml
react_perf_gate:
  profile_build: required
  thresholds:
    commit_p95_ms: 120
    long_task_rate: 0.03
  on_fail: block_release
```

### 追问

- 「React 渲染预算治理：把重渲染风险前置到发布闸门」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看首屏指标，不看高频交互链路的渲染抖动。
- 预算阈值不分页面类型，导致误报或漏报并存。
- 发现回归后只“临时修补”，不沉淀治理规则。

### 延伸

- 可将预算结果与 PR 评论联动，提升团队反馈速度。
- 推荐对关键链路保留历史基线，便于识别趋势性退化。

## react-hydration-mismatch-playbook

title: React 水合不一致排障手册：从告警定位到稳定回退
difficulty: 资深
tags: [React, Hydration, SSR]
followups: [react-hydration-mismatch-playbook-followup-1, react-hydration-mismatch-playbook-followup-2, react-hydration-mismatch-playbook-followup-3]

### 一句话

SSR/RSC 项目中，hydration mismatch 往往是“偶发且难复现”问题：要通过一致性约束、观测埋点与分级回退，把排障从玄学变成流程化能力。

### 题目

当 React 应用上线后出现 hydration mismatch 告警与白屏投诉时，你会如何快速定位并稳定止损？

### 答案要点

- 先按类型分流：结构不一致、数据不一致、环境差异（时区/随机数/客户端 API）分别处理。
- 建立最小复现链路：固定请求参数、固定时区与语言、记录服务端快照和客户端首帧状态。
- 对高风险节点加守护：时间相关字段、随机 id、浏览器专属逻辑必须延后到客户端执行。
- 观测体系要可关联：错误日志带 route、buildId、组件边界、服务端渲染摘要，便于快速聚类。
- 止损策略分层：局部禁用 SSR、切回 CSR fallback、限制灰度流量，优先恢复可用性。
- 复盘后沉淀规范：禁止不稳定输出进入首屏 SSR，新增 hydration 检查清单与回归用例。

### 代码示例

```ts
// 避免服务端/客户端首帧不一致：将不稳定值延后
function ClientOnlyTime() {
  const [text, setText] = useState<string>('loading...');
  useEffect(() => {
    setText(new Date().toLocaleString());
  }, []);
  return <span>{text}</span>;
}
```

```ts
type HydrationSignal = { mismatchRate: number; whiteScreenRate: number };

function shouldDegrade(signal: HydrationSignal) {
  return signal.mismatchRate > 0.005 || signal.whiteScreenRate > 0.002;
}
```

### 追问

- 「React 水合不一致排障手册：从告警定位到稳定回退」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把所有 mismatch 都归因为 React bug，忽略业务层不稳定输出。
- 只有报错日志没有上下文标签，定位链路耗时过长。
- 止损只靠全量回滚，缺少局部降级能力。

### 延伸

- 建议对核心路由建立 hydration 健康看板，持续跟踪风险。
- 高风险改动可要求“SSR 一致性专项回归”后再放量。

## react-render-budget-gate-followup-1

title: 追问：结合真实业务约束，如果要做「React 渲染预算治理：把重渲染风险前置到发布闸门」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [React, 性能预算, 渲染治理, 追问]
parent: react-render-budget-gate
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React 渲染预算治理：把重渲染风险前置到发布闸门」在当前约束下为什么成立。；回答结构可按「触发条件 -> React 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：结合真实业务约束，如果要做「React 渲染预算治理：把重渲染风险前置到发布闸门」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React 渲染预算治理：把重渲染风险前置到发布闸门」在当前约束下为什么成立。
- 回答结构可按「触发条件 -> React 机制 -> 风险兜底」展开，并以「React 渲染预算治理：把重渲染风险前置到发布闸门」补一条失败场景，能体现工程拆解能力。
- 不要只罗列工具名或 API，最好把「React 渲染预算治理：把重渲染风险前置到发布闸门」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 先定义预算对象：关键页面渲染次数、提交耗时分位、长任务占比、交互延迟阈值。
- 预算分层执行：本地开发告警、PR 阶段阻断、灰度阶段动态观测。
- 预算评估要结合用户场景：输入密集、列表滚动、复杂表单和弱设备分开测量。
- 若能补一段「React 渲染预算治理：把重渲染风险前置到发布闸门」复盘片段，解释 React 如何从告警到定位再到修复，可信度会明显上升。

#### 工程落地

- 围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 React 的预期结果写成可复核标准。
- 在「React 渲染预算治理：把重渲染风险前置到发布闸门」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 React 的问题定位闭环。
- 如果「React 渲染预算治理：把重渲染风险前置到发布闸门」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React 渲染预算治理：把重渲染风险前置到发布闸门」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 若没说明「React 渲染预算治理：把重渲染风险前置到发布闸门」在 React 失效时的回退策略，面试官通常会质疑方案是否可上线。
- 不要把「React 渲染预算治理：把重渲染风险前置到发布闸门」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-render-budget-gate-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 React 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [React, 性能预算, 渲染治理, 追问]
parent: react-render-budget-gate
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「React 渲染预算治理：把重渲染风险前置到发布闸门」在当前约束下为什么成立。；围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」组织答案时。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 React 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 回答思路

- 先明确这道追问要解决的业务目标，再说明「React 渲染预算治理：把重渲染风险前置到发布闸门」在当前约束下为什么成立。
- 围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」组织答案时，建议按「约束来源 -> React 关键决策 -> 验证闭环」展开。
- 不要只罗列工具名或 API，最好把「React 渲染预算治理：把重渲染风险前置到发布闸门」的机制、约束和落地步骤串成完整叙事线。

#### 结合原题展开

- 引入自动回退策略：关键指标连续劣化触发降级开关或回滚路径。
- 预算评估要结合用户场景：输入密集、列表滚动、复杂表单和弱设备分开测量。
- 把原题观点放进「React 渲染预算治理：把重渲染风险前置到发布闸门」的一个具体版本迭代里，讲清 React 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「React 渲染预算治理：把重渲染风险前置到发布闸门」在 React 上的优化不是只在 demo 数据下成立。
- 围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」建监控时，建议把 React 指标和业务转化指标并排展示，避免只看技术侧信号。
- 如果「React 渲染预算治理：把重渲染风险前置到发布闸门」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。

#### 易错点

- 常见误区是把「React 渲染预算治理：把重渲染风险前置到发布闸门」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。
- 只关注「React 渲染预算治理：把重渲染风险前置到发布闸门」里 React 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 不要把「React 渲染预算治理：把重渲染风险前置到发布闸门」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。

## react-render-budget-gate-followup-3

title: 追问：在「React 渲染预算治理：把重渲染风险前置到发布闸门」场景下，如果「React 渲染预算治理：把重渲染风险前置到发布闸门」在 React 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [React, 性能预算, 渲染治理, 追问]
parent: react-render-budget-gate
generated: followup-script

### 一句话

规模变大后先重新评估「React 渲染预算治理：把重渲染风险前置到发布闸门」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「React 渲染预算治理：把重渲染风险前置到发布闸门」对应的性能收益被复杂度抵消。

### 题目

如果面试官追问：在「React 渲染预算治理：把重渲染风险前置到发布闸门」场景下，如果「React 渲染预算治理：把重渲染风险前置到发布闸门」在 React 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 核心回答

- 规模变大后先重新评估「React 渲染预算治理：把重渲染风险前置到发布闸门」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果「React 渲染预算治理：把重渲染风险前置到发布闸门」对应的性能收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 「React 渲染预算治理：把重渲染风险前置到发布闸门」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

#### 学习抓手

- 准备这道追问时，先画出「React 渲染预算治理：把重渲染风险前置到发布闸门」从输入到输出的关键路径，再补异常路径。
- 准备一个「React 渲染预算治理：把重渲染风险前置到发布闸门」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。
- 把「React 渲染预算治理：把重渲染风险前置到发布闸门」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。

## react-hydration-mismatch-playbook-followup-1

title: 追问：从工程落地角度看，在 React 项目里应用「React 水合不一致排障手册：从告警定位到稳定回退」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [React, Hydration, SSR, 追问]
parent: react-hydration-mismatch-playbook
generated: followup-script

### 一句话

推动「React 水合不一致排障手册：从告警定位到稳定回退」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「React 水合不一致排障手册：从告警定位到稳定回退」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，在 React 项目里应用「React 水合不一致排障手册：从告警定位到稳定回退」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 推动「React 水合不一致排障手册：从告警定位到稳定回退」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「React 水合不一致排障手册：从告警定位到稳定回退」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「React 水合不一致排障手册：从告警定位到稳定回退」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 复习这道追问时，先用一句话讲清「React 水合不一致排障手册：从告警定位到稳定回退」的核心机制，再补一个会失败的具体场景。
- 准备一个与「React 水合不一致排障手册：从告警定位到稳定回退」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。
- 最后给出「React 水合不一致排障手册：从告警定位到稳定回退」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。

## react-hydration-mismatch-playbook-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 React 方案有效
difficulty: 资深
tags: [React, Hydration, SSR, 追问]
parent: react-hydration-mismatch-playbook
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「React 水合不一致排障手册：从告警定位到稳定回退」讲成只在理想输入下可用。；建议按「输入约束 -> React 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 React 方案有效？

### 答案要点

#### 回答思路

- 先把目标和约束说清楚，再展开实现：这能避免把「React 水合不一致排障手册：从告警定位到稳定回退」讲成只在理想输入下可用。
- 建议按「输入约束 -> React 执行链路 -> 结果验证」展开，并结合「React 水合不一致排障手册：从告警定位到稳定回退」给出一条可复核结果，能更快体现你对复杂场景的掌控力。
- 在「React 水合不一致排障手册：从告警定位到稳定回退」回答里，实现层面要解释 React 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。

#### 结合原题展开

- 先按类型分流：结构不一致、数据不一致、环境差异（时区/随机数/客户端 API）分别处理。
- 把原题观点放进「React 水合不一致排障手册：从告警定位到稳定回退」的一个具体版本迭代里，讲清 React 在发布前后如何验证，会显著提升可信度。

#### 工程落地

- 把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「React 水合不一致排障手册：从告警定位到稳定回退」在 React 上的优化不是只在 demo 数据下成立。
- 围绕「React 水合不一致排障手册：从告警定位到稳定回退」建监控时，建议把 React 指标和业务转化指标并排展示，避免只看技术侧信号。
- 「React 水合不一致排障手册：从告警定位到稳定回退」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。

#### 易错点

- 很多回答会忽略「React 水合不一致排障手册：从告警定位到稳定回退」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。
- 只关注「React 水合不一致排障手册：从告警定位到稳定回退」里 React 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。
- 避免把「React 水合不一致排障手册：从告警定位到稳定回退」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。

## react-hydration-mismatch-playbook-followup-3

title: 追问：从工程落地角度看，如果比较「React 水合不一致排障手册：从告警定位到稳定回退」与替代方案，你会如何基于 React 判断不同团队阶段的最佳选择
difficulty: 资深
tags: [React, Hydration, SSR, 追问]
parent: react-hydration-mismatch-playbook
generated: followup-script

### 一句话

推动「React 水合不一致排障手册：从告警定位到稳定回退」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「React 水合不一致排障手册：从告警定位到稳定回退」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，如果比较「React 水合不一致排障手册：从告警定位到稳定回退」与替代方案，你会如何基于 React 判断不同团队阶段的最佳选择？

### 答案要点

#### 核心回答

- 推动「React 水合不一致排障手册：从告警定位到稳定回退」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 「React 水合不一致排障手册：从告警定位到稳定回退」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「React 水合不一致排障手册：从告警定位到稳定回退」拆成可验证的小步骤，逐步替换高风险部分。

#### 学习抓手

- 回答前先列出「React 水合不一致排障手册：从告警定位到稳定回退」的主链路与兜底链路，确保追问时能快速切换视角。
- 验证「React 水合不一致排障手册：从告警定位到稳定回退」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。
- 最后补一个「React 水合不一致排障手册：从告警定位到稳定回退」反向判断：在什么情况下你会放弃当前路径，改走替代方案。

## react-compiler-rollout-command-bridge

title: React Compiler 升级指挥桥：收益验证、风险分层与一键止损
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通]
followups: [react-compiler-rollout-command-bridge-followup-1, react-compiler-rollout-command-bridge-followup-2, react-compiler-rollout-command-bridge-followup-3]

### 一句话

React Compiler 不是“开了就快”，而是“可验证地快、可回退地快”。

### 题目

团队准备在核心业务逐步启用 React Compiler，小流量测试有收益，但部分复杂页面出现交互抖动与重渲染回归。你会如何组织升级指挥桥，保证发布节奏和风险可控？

### 答案要点

- 先做风险分层：按页面复杂度、交互密度、历史事故频率拆出高/中/低风险域。
- 明确放量闸门：渲染次数、交互时延、错误率三组指标任一超阈值就暂停扩量。
- 开关粒度要足够细：路由级、组件簇级、用户分群级开关，避免“一刀切”回退。
- 保留一键回退路径：旧产物和开关配置双保险，确保 10 分钟内完成止损。
- 战情室沟通固定模板：当前结论、风险等级、下一动作、下一检查点统一对外口径。
- 复盘沉淀“收益失败样本库”：哪些场景适合编译器、哪些场景先不要开。

### 代码示例

```ts
type CompilerRolloutSignal = {
  interactionLatencyP95: number;
  renderCountDelta: number;
  runtimeErrorRate: number;
};

function shouldDisableCompiler(s: CompilerRolloutSignal) {
  return s.interactionLatencyP95 > 120 || s.renderCountDelta > 0.3 || s.runtimeErrorRate > 0.01;
}
```

```yaml
compiler_rollout_gate:
  rollout_steps: [5_percent, 20_percent, 50_percent, 100_percent]
  block_when:
    interaction_latency_p95_ms: '> 120'
    render_count_delta: '> 30%'
    runtime_error_rate: '> 1%'
  require:
    - fallback_bundle_ready
    - route_level_kill_switch
    - owner_and_shift_schedule
```

### 追问

- 「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看平均性能收益，不看高交互场景里的尾部时延回归。
- 把编译器开关做成全局开关，导致局部问题也要全站回退。
- 没有准备旧产物与回退剧本，故障时只能“边查边猜”。

### 延伸

- 建议把编译器收益和事故数据纳入季度技术决策回顾。
- 可沉淀“编译器适配白名单/黑名单”降低后续评估成本。

## react-optimistic-ui-stoploss-playbook

title: React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置]
followups: [react-optimistic-ui-stoploss-playbook-followup-1, react-optimistic-ui-stoploss-playbook-followup-2, react-optimistic-ui-stoploss-playbook-followup-3]

### 一句话

乐观更新的难点不在“先显示成功”，而在“失败时能否有序回滚并解释清楚”。

### 题目

你在 React 19 的 Action + `useOptimistic` 场景里遇到线上事故：部分用户看到“操作成功”但服务端实际失败，还出现重复提交。你会如何止损并恢复用户信任？

### 答案要点

- 先切断扩散：临时关闭高风险乐观路径，优先恢复“真实写后再展示”的保守策略。
- 快速识别影响范围：按用户、操作类型、时间窗口建立可回放清单。
- 前后端同时补幂等：请求 id、重放保护、状态校验三层防重复提交。
- 回滚策略要可解释：哪些状态自动修正、哪些需要人工确认，要有统一口径。
- 对外沟通分层：用户提示、客服话术、运营公告分别给出明确动作与时点。
- 复盘关注“误成功链路”：从 UI 提示到状态落库逐段补验证与告警。

### 代码示例

```ts
type OptimisticIncidentSignal = {
  successMismatchRate: number;
  duplicateSubmitRate: number;
  rollbackFailRate: number;
};

function needOptimisticStoploss(s: OptimisticIncidentSignal) {
  return s.successMismatchRate > 0.01 || s.duplicateSubmitRate > 0.02 || s.rollbackFailRate > 0.005;
}
```

```yaml
optimistic_incident_runbook:
  first_15min:
    - disable_high_risk_optimistic_paths
    - freeze_batch_retry_jobs
    - open_repair_queue
  require:
    - idempotency_key_check
    - user_impact_audit
    - cs_communication_template
  reopen_when:
    success_mismatch_rate: '< 0.1%'
    duplicate_submit_rate: '< 0.2%'
```

### 追问

- 「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只修 UI 提示，不修后端幂等和状态一致性，事故会反复出现。
- 把用户修复动作留到事后人工处理，没有自动补偿和排队机制。
- 对外口径过于技术化，用户和客服无法执行具体动作。

### 延伸

- 建议为关键乐观链路建立“误成功演练”机制。
- 可引入“提交可信度分层”，高风险动作默认不走乐观更新。

## react-compiler-rollout-command-bridge-followup-1

title: 追问：React Compiler 上线前你会先验哪些高风险边界
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通, 追问]
parent: react-compiler-rollout-command-bridge
generated: followup-script

### 一句话

先验三类边界：高频交互组件、重依赖闭包状态组件、历史上有渲染事故的页面。；把“可编译但不稳定”的模块先列入观察名单，默认小流量并保留单路由回退。；每个试点页面都要有基线数据和降级开关，确保问题出现时 10 分钟内止损。

### 题目

如果面试官追问：React Compiler 真正上线前，你会先验哪些高风险边界，避免“测得好、线上抖”？

### 答案要点

#### 核心回答

- 先验三类边界：高频交互组件、重依赖闭包状态组件、历史上有渲染事故的页面。
- 把“可编译但不稳定”的模块先列入观察名单，默认小流量并保留单路由回退。
- 每个试点页面都要有基线数据和降级开关，确保问题出现时 10 分钟内止损。

#### 学习抓手

- 先说“我优先验证什么”，再说“为什么是这些”，结构会更像真实评审。
- 最好补一个你见过的反例，比如编译后 memo 语义变化导致输入抖动。
- 结尾讲清触发回退的阈值，比只说“持续观察”更有执行力。

## react-compiler-rollout-command-bridge-followup-2

title: 追问：怎么定义 React Compiler 方案真的生效
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通, 追问]
parent: react-compiler-rollout-command-bridge
generated: followup-script

### 一句话

先定生效判据：交互时延下降、重渲染次数下降、运行时错误不升是最小三指标。；再定观测窗口：小流量阶段看日内波动，扩大流量后看周趋势，避免单天噪声误判。；最后定动作规则：指标触线立刻暂停扩量并切回旧产物，避免“带病推进”。

### 题目

如果面试官追问：你说 Compiler 升级有收益，那你怎么定义“真的生效”，并持续验证不是偶然波动？

### 答案要点

#### 核心回答

- 先定生效判据：交互时延下降、重渲染次数下降、运行时错误不升是最小三指标。
- 再定观测窗口：小流量阶段看日内波动，扩大流量后看周趋势，避免单天噪声误判。
- 最后定动作规则：指标触线立刻暂停扩量并切回旧产物，避免“带病推进”。

#### 学习抓手

- 回答里最好带一个具体阈值示例，体现你会把原则落到数字。
- 指标要成组出现，不要只看性能不看稳定性。
- 若能补一次“误判后修正规则”的经历，可信度会很高。

## react-compiler-rollout-command-bridge-followup-3

title: 追问：不同业务复杂度下你会如何分层启用 Compiler
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通, 追问]
parent: react-compiler-rollout-command-bridge
generated: followup-script

### 一句话

低风险页面可先全开验证收益，中风险页面按路由灰度，高风险页面仅做影子验证。；对强动态渲染或历史回归高发模块，先保守策略，待规则稳定再纳入升级计划。；每月复盘一次分层策略：收益持续稳定再扩面，收益不稳就缩面并回收配置。

### 题目

如果面试官追问：业务复杂度差异很大时，你会怎么分层启用 React Compiler，而不是全站一把梭？

### 答案要点

#### 核心回答

- 低风险页面可先全开验证收益，中风险页面按路由灰度，高风险页面仅做影子验证。
- 对强动态渲染或历史回归高发模块，先保守策略，待规则稳定再纳入升级计划。
- 每月复盘一次分层策略：收益持续稳定再扩面，收益不稳就缩面并回收配置。

#### 学习抓手

- 用“低/中/高风险三层法”回答，面试官能快速判断你的治理能力。
- 最好补一句“什么场景我明确不启用”，体现边界意识。
- 收尾讲清“何时扩大、何时暂停”，闭环会更完整。

## react-optimistic-ui-stoploss-playbook-followup-1

title: 追问：乐观更新在什么场景最容易失效
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置, 追问]
parent: react-optimistic-ui-stoploss-playbook
generated: followup-script

### 一句话

最容易失效的是跨端并发写入、弱网重试、外部系统异步回执这三类场景。；出现“前端成功、后端失败”时要优先排查幂等键、重试策略和状态对账链路。；对高风险动作先降级为保守提交流程，待一致性校验稳定后再恢复乐观路径。

### 题目

如果面试官追问：这套乐观更新方案在真实流量下最容易在哪些场景失效，你会怎么判断？

### 答案要点

#### 核心回答

- 最容易失效的是跨端并发写入、弱网重试、外部系统异步回执这三类场景。
- 出现“前端成功、后端失败”时要优先排查幂等键、重试策略和状态对账链路。
- 对高风险动作先降级为保守提交流程，待一致性校验稳定后再恢复乐观路径。

#### 学习抓手

- 不要只说“有风险”，要明确“哪类输入最危险”。
- 可补一个你处理过的误成功案例，说明定位顺序。
- 结尾讲清“哪些动作不该走乐观更新”，会很加分。

## react-optimistic-ui-stoploss-playbook-followup-2

title: 追问：你会怎样证明乐观更新止损策略有效
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置, 追问]
parent: react-optimistic-ui-stoploss-playbook
generated: followup-script

### 一句话

测试侧至少覆盖三类：重复提交、服务端失败、回滚中断，确保关键异常都能复现。；线上侧盯三组指标：误成功率、重复提交率、自动修复完成率，并设告警阈值。；每次变更都做小范围演练，验证“告警 -> 止损 -> 修复 -> 对外同步”链路可执行。

### 题目

如果面试官追问：你这套乐观更新止损策略不是纸面方案，你会怎样用测试和线上数据证明它有效？

### 答案要点

#### 核心回答

- 测试侧至少覆盖三类：重复提交、服务端失败、回滚中断，确保关键异常都能复现。
- 线上侧盯三组指标：误成功率、重复提交率、自动修复完成率，并设告警阈值。
- 每次变更都做小范围演练，验证“告警 -> 止损 -> 修复 -> 对外同步”链路可执行。

#### 学习抓手

- 回答时把“离线验证”和“线上验证”分开讲，逻辑会更清楚。
- 最好给一条阈值规则，例如误成功率超过多少立即关闭乐观路径。
- 如果能讲到客服和运营口径同步，说明你考虑了全链路。

## react-optimistic-ui-stoploss-playbook-followup-3

title: 追问：团队规模变化后如何调整乐观更新治理策略
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置, 追问]
parent: react-optimistic-ui-stoploss-playbook
generated: followup-script

### 一句话

小团队阶段优先少量关键场景，规则简单但必须有止损开关和人工兜底。；多团队阶段要平台化：统一幂等规范、回滚组件、风险分级和对外沟通模板。；当治理成本高于收益时，要主动缩减乐观覆盖面，把高风险动作改为保守流程。

### 题目

如果面试官追问：团队从小团队扩到多团队协作后，你会怎么调整乐观更新策略，避免治理成本失控？

### 答案要点

#### 核心回答

- 小团队阶段优先少量关键场景，规则简单但必须有止损开关和人工兜底。
- 多团队阶段要平台化：统一幂等规范、回滚组件、风险分级和对外沟通模板。
- 当治理成本高于收益时，要主动缩减乐观覆盖面，把高风险动作改为保守流程。

#### 学习抓手

- 用“阶段化治理”回答，比一次性大而全方案更可信。
- 给出一条触发缩面的条件，体现你的止损意识。
- 结尾补一句下一阶段治理计划，显示你有长期视角。
