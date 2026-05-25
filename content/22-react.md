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

这题的高分关键是把 React 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

都是组件化框架，React 和 Vue 在响应式、渲染策略、数据流上的核心差异是什么？

### 答案要点

- 响应式：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"
- 渲染：Vue 模板可静态分析做编译期优化（hoist、patchFlag）；React JSX 是 JS 表达式，运行时全靠 diff + memo
- 数据流：Vue 双向（v-model 是糖）；React 单向（受控/非受控两种风格）
- 副作用：Vue watch / watchEffect 自动追踪；React useEffect 必须手动列依赖

#### 工程化补充

- 场景前提：React 和 Vue 的心智模型本质差异 只有在瓶颈被数据证实时才值得推进；先确认 React 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 React 和 Vue 的心智模型本质差异 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题回答要覆盖 Hooks 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

为什么 Hooks 必须在组件顶层、不能在条件分支里调用？React 内部是怎么实现的？

### 答案要点

- Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位
- React 在每次渲染时维护 currentlyRenderingFiber.memoizedState 单链表，按调用顺序遍历
- 自定义 Hook 是普通函数，但同样受顺序约束，因为它内部调用了其他 Hooks
- 错误用法（条件 / 循环里调用）在 dev 模式由 react-hooks/rules-of-hooks 静态检查

#### 工程化补充

- 场景前提：Hooks 的核心规则与原理 要先拆分状态来源：本地状态、缓存状态、路由状态边界不能混用。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

讲「useEffect 常见陷阱与依赖管理」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么人们说"`useEffect` 是 React 里最难用的 hook"？常见坑有哪些？

### 答案要点

- 依赖数组不全：导致捕获旧值（stale closure），看似"没起效"
- 依赖太多：函数 / 对象每次新建会触发死循环，常见解法是 useCallback / useMemo 或 ref
- 副作用本不该用 effect：派生数据用 useMemo，事件处理用 handler，不要塞进 effect
- StrictMode 双调用：开发期 effect 会跑两次，必须保证副作用幂等并清理

#### 工程化补充

- 场景前提：回答 useEffect 常见陷阱与依赖管理 时要说明 useEffect 在并发渲染下的行为差异和回归策略。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

这题的高分关键是把 Fiber 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

Fiber 是什么？React 18 的并发渲染解决了什么问题？

### 答案要点

- Fiber 是 React 16+ 的渲染单元，把组件树拆成可中断、可恢复的工作单元链表
- 并发渲染：渲染分 render 阶段（可中断）和 commit 阶段（同步原子），高优更新可以打断低优
- 优先级 Lane 模型替代旧的 expirationTime，支持多任务交错
- 关键 API：startTransition（标记低优）、useDeferredValue（延迟读取）、Suspense（声明加载边界）

#### 工程化补充

- 场景前提：Fiber 架构与并发渲染 只有在瓶颈被数据证实时才值得推进；先确认 Fiber 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Fiber 架构与并发渲染 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 RSC 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

RSC 跟 SSR 有什么区别？为什么说它"零 JS 包"是革命性的？

### 答案要点

- SSR：服务端渲出 HTML 再 hydration，组件代码仍要打到客户端 bundle
- RSC：组件分服务端组件 (.server.tsx) 和客户端组件，服务端组件的代码不下发到浏览器
- 服务端组件可以直接 await 数据库、读文件、调密钥，输出"序列化的 React 树"通过流式传给客户端
- 客户端组件需要 'use client' 标记，承担交互；两者可以无缝嵌套

#### 工程化补充

- 场景前提：回答 React Server Components 时要说明 RSC 在并发渲染下的行为差异和回归策略。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

讲「React 状态管理选型」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

什么时候用 Context，什么时候上 Redux / Zustand / Jotai？这些库的设计取舍是什么？

### 答案要点

- Context：只适合"低频变更 + 全局静态值"（主题、locale），频繁变更会让所有 consumer 重渲染
- Redux：可预测、可调试，适合复杂业务、需要中间件 / DevTools / 时间旅行
- Zustand：轻量、无样板、selector 自动避免无关重渲染，是 90% 中小型应用的最优解
- Jotai / Recoil：原子化模型，状态拆成最小单元，依赖自动派生，适合大表单、画布

#### 工程化补充

- 场景前提：回答 React 状态管理选型 时要说明 状态管理 在并发渲染下的行为差异和回归策略。
- 实施步骤：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要交代渲染边界、状态分层和失效策略。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

讲「Suspense 与异步数据加载」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

Suspense 怎么和数据请求结合？为什么说它会成为未来的主流数据加载方式？

### 答案要点

- Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支
- 配合 use(promise) / RSC / React Query suspense mode / Relay 等
- 错误边界 ( ) 处理 reject，形成"加载、错误、内容"声明式三态
- 配合 startTransition 可以避免每次切换都闪烁，保留旧数据直到新数据就绪

#### 工程化补充

- 场景前提：回答 Suspense 与异步数据加载 时先锁定 Suspense 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Suspense 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Suspense 的可复现用例、线上监控指标和回退演练记录。

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

这题的高分关键是把 Router 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

React Router 的 loader / action 模式解决了什么？相比传统在组件里 fetch 有什么优势？

### 答案要点

- 路由级 loader 在切换前并行发起请求，配合 defer / Await 可以做"先关键内容 + 流式补齐"
- action 接管表单提交，自动 revalidate 当前路由 loader，写后立即看到最新数据
- errorElement 让每条路由有自己的错误兜底
- 与 RSC 思路一致：把数据获取靠近路由层，避免组件里散落的 useEffect fetch

#### 工程化补充

- 场景前提：回答 React Router v6.4+ 的 Data Router 与 loaders 时要说明 Router 在并发渲染下的行为差异和回归策略。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

回答「React 性能优化清单」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

组件多、列表长、动画卡顿时，React 应用怎么排查和优化？

### 答案要点

- 首先用 React DevTools Profiler 录一段，看哪个组件 commit 时间长、commit 次数多
- 重渲染源：父组件渲染、context 更新、新建对象 / 函数 prop 引用变了
- 解法：组件 split + React.memo + 稳定引用（useMemo / useCallback）；context 拆细
- 长列表用 react-virtual / react-window，图片懒加载 + LQIP；图表 / 复杂计算丢 Web Worker

#### 工程化补充

- 场景前提：回答 React 性能优化清单 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 React 性能优化清单 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「React 19 关键特性速览」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

React 19 新增了 Actions、`useOptimistic`、`useFormStatus`、`use(promise)`、`<form action>` 直接绑定函数等，使用场景是什么？

### 答案要点

- Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button
- useFormStatus：在子组件里读取上层 form 的 pending / data，写按钮 loading 不再需要状态提升
- useOptimistic：声明式乐观 UI，自动在 server 返回失败时回滚
- use(promise)：在条件 / 循环里读 promise，由 Suspense 处理 pending

#### 工程化补充

- 场景前提：回答 React 19 关键特性速览 时要说明 React 19 在并发渲染下的行为差异和回归策略。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

这题回答要覆盖 TypeScript 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

写组件库 / 复杂 hooks 时，常用的 TS 模式有哪些？

### 答案要点

- as prop（多态组件）：让组件可以渲染成不同标签 / 组件
- 泛型 hook：useFetch 返回 T 类型数据
- 受控 / 非受控判别式：value & onChange 必须同时出现，可用条件类型
- Awaited<> / ReturnType<> 取异步函数返回类型

#### 工程化补充

- 场景前提：React + TypeScript 常用类型模式 要先拆分状态来源：本地状态、缓存状态、路由状态边界不能混用。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

这题的高分关键是把 测试 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

单测 / 组件测的边界在哪？React Testing Library 的核心理念和常见 API？

### 答案要点

- "像用户一样测试"：不要测实现细节（state、私有方法），要测可见行为
- 优先选择器顺序：getByRole > getByLabelText > getByPlaceholderText > getByText > getByTestId
- 异步：findBy\* 自动等待出现；waitFor 等任意条件
- 用户事件用 @testing-library/user-event，模拟更真实（focus / blur / 键盘）

#### 工程化补充

- 场景前提：React 组件测试要测什么、怎么测 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

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

回答「列表渲染中 key 的作用与使用陷阱」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

React 中的 key 是干什么用的，为什么不要用 index？

### 答案要点

- key 帮助 React 在 reconcile 时识别哪些元素是「同一个」，决定复用、移动还是销毁
- 同层 key 必须唯一且稳定，跨层级无要求
- 用数组 index 作为 key 在「插入/删除/排序」时会导致状态错位（输入框内容跑到错误的行上）
- 静态、不可重排的列表用 index 没问题，但建议用业务 ID

#### 工程化补充

- 场景前提：回答 列表渲染中 key 的作用与使用陷阱 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 列表渲染中 key 的作用与使用陷阱 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 表单 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

什么时候用受控、什么时候用非受控？大表单怎么避免每次输入都重渲染整个页面？

### 答案要点

- 受控：value + onChange，组件自身不存储状态，便于校验/联动
- 非受控：用 ref + defaultValue，性能好，但无法实时联动
- 大表单优化：拆分组件 + memo / useFormState（react-hook-form）非受控、状态外包至库
- React 19 新增 + useActionState，简化提交流程

#### 工程化补充

- 场景前提：受控组件 vs 非受控组件，性能边界在哪 只有在瓶颈被数据证实时才值得推进；先确认 表单 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 受控组件 vs 非受控组件，性能边界在哪 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 架构 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

渲染弹窗、捕获组件错误、处理异步 loading，这三个能力分别怎么用？

### 答案要点

- Portal：createPortal(children, document.body)，把子树渲染到任意 DOM，但事件冒泡仍按 React 树
- Error Boundary：class 组件实现 getDerivedStateFromError + componentDidCatch；只能捕获子树渲染错误，事件 / 异步要 try-catch
- Suspense：用于异步组件 / 数据加载（与 React Query / Relay / RSC 配合），fallback 显示骨架屏
- 推荐组合：Suspense → 包裹 ErrorBoundary → 包裹业务组件

#### 工程化补充

- 场景前提：Portal、Error Boundary、Suspense 的协作方式 只有在瓶颈被数据证实时才值得推进；先确认 架构 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Portal、Error Boundary、Suspense 的协作方式 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 list 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么 React 列表必须写 key？key 用 index 有什么坑？

### 答案要点

- diff 算法靠 key 在同层之间做"身份匹配"。没 key 就只能按位置匹配，插入/删除前面的元素会让后面所有节点的状态错位
- 用 index 当 key 看起来能消除警告，但只在"列表只追加、永不插入/删除"时才安全
- key 必须在同一组兄弟里唯一；不同列表的 key 互不干扰
- key 不会作为 props 传给子组件——读 props.key 拿不到

#### 工程化补充

- 场景前提：回答 React 列表为什么必须给 key 时要说明 list 在并发渲染下的行为差异和回归策略。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React 和 Vue 的心智模型本质差异」场景下，当「React 和 Vue 的心智模型本质差异」牵涉跨组件状态时，你会如何围绕 React 设计响应式边界，保证后续好维护？

### 答案要点

#### 直答

- 结论：先拆分 React 和 Vue 的心智模型本质差异 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 React 和 Vue 的心智模型本质差异 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- React：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"。
- Vue：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"。
- 框架：围绕「React 和 Vue 的心智模型本质差异」里的 框架 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：React 和 Vue 的心智模型本质差异 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「React 和 Vue 的心智模型本质差异」里，React 和 Vue 的心智模型本质差异 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## react-compiler-boundaries

title: React Compiler 自动 memo 的原理、限制与落地边界
difficulty: 资深
tags: [React Compiler, 性能, 编译优化]
followups: [react-compiler-boundaries-followup-1, react-compiler-boundaries-followup-2, react-compiler-boundaries-followup-3]

### 一句话

回答「React Compiler 自动 memo 的原理、限制与落地边界」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

React Compiler 能自动做哪些 memo 优化？真实项目里应该如何判断它能不能替代手写 `memo`、`useMemo` 和 `useCallback`？

### 答案要点

- React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- 它要求组件渲染保持纯函数语义：不能在 render 中读写可变全局状态、修改 props、依赖不稳定的时间/随机值，副作用仍应放到 Effect 或事件处理里。
- 它不能替代所有性能设计：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。
- 迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。

#### 工程化补充

- 场景前提：回答 React Compiler 自动 memo 的原理、限制与落地边界 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 React Compiler 自动 memo 的原理、限制与落地边界 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在 React 项目里应用「Hooks 的核心规则与原理」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：Hooks 场景优先排查条件渲染里的状态漂移、闭包旧值和副作用依赖遗漏，这三类最容易触发错位更新。
- 关键动作：先梳理 Hooks 的核心规则与原理 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Hooks：Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位。
- React：React 在每次渲染时维护 currentlyRenderingFiber.memoizedState 单链表，按调用顺序遍历。
- state：在「Hooks 的核心规则与原理」这题里，state 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 Hooks 的核心规则与原理 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Hooks 的核心规则与原理 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## use-effect-pitfalls-followup-1

title: 追问：在「useEffect 常见陷阱与依赖管理」进入长周期维护后，你会重点巡检哪些与 useEffect 相关的高风险边界点
difficulty: 进阶
tags: [useEffect, 陷阱, 追问]
parent: use-effect-pitfalls

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「useEffect 常见陷阱与依赖管理」进入长周期维护后，你会重点巡检哪些与 useEffect 相关的高风险边界点？

### 答案要点

#### 直答

- 结论：上线 useEffect 常见陷阱与依赖管理 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：围绕 useEffect 常见陷阱与依赖管理 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- useEffect：围绕「useEffect 常见陷阱与依赖管理」里的 useEffect 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 陷阱：围绕「useEffect 常见陷阱与依赖管理」里的 陷阱 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：useEffect 常见陷阱与依赖管理 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 useEffect 常见陷阱与依赖管理 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## react-reconciler-fiber-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Fiber 相关的指标来判断「Fiber 架构与并发渲染」是不是当前性能瓶颈
difficulty: 资深
tags: [Fiber, Concurrent, 追问]
parent: react-reconciler-fiber

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Fiber 相关的指标来判断「Fiber 架构与并发渲染」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证 Fiber 架构与并发渲染 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 Fiber 架构与并发渲染 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Fiber：Fiber 是 React 16+ 的渲染单元，把组件树拆成可中断、可恢复的工作单元链表。
- Concurrent：Concurrent 是「Fiber 架构与并发渲染」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Fiber 架构与并发渲染 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Fiber 架构与并发渲染 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-server-components-followup-1

title: 追问：在 React 项目里应用「React Server Components」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [追问]
parent: react-server-components

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在 React 项目里应用「React Server Components」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先画出 React Server Components 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 React Server Components 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- React Server Components：围绕「React Server Components」里的 React Server Components 作答时，要给可落地动作，并说明异常处理与验收阈值。
- RSC：组件分服务端组件 (.server.tsx) 和客户端组件，服务端组件的代码不下发到浏览器。
- Next.js：Next.js 是「React Server Components」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「React Server Components」场景下，React Server Components 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「React Server Components」里，React Server Components 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## react-server-components-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 RSC 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [追问]
parent: react-server-components

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 RSC 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：验证「React Server Components」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 RSC 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- RSC：组件分服务端组件 (.server.tsx) 和客户端组件，服务端组件的代码不下发到浏览器。
- Next.js：Next.js 是「React Server Components」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 RSC 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：RSC 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-server-components-followup-3

title: 追问：别只看 benchmark，你会怎么比较「React Server Components」和替代方案在 RSC 上的学习成本、交付速度与维护负担
difficulty: 进阶
tags: [追问]
parent: react-server-components

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：别只看 benchmark，你会怎么比较「React Server Components」和替代方案在 RSC 上的学习成本、交付速度与维护负担？

### 答案要点

#### 直答

- 结论：评估 React Server Components 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先排查 React Server Components 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- React Server Components：React Server Components 是「React Server Components」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- RSC：组件分服务端组件 (.server.tsx) 和客户端组件，服务端组件的代码不下发到浏览器。
- Next.js：Next.js 是「React Server Components」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 React Server Components 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 React Server Components 收益提升和维护成本变化，确保取舍结论可持续。

## react-server-state-query-cache

title: React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存]
links: [state-management-react, use-effect-pitfalls, 06-network/request-race-cancel-dedupe]
followups: [react-server-state-query-cache-followup-1, react-server-state-query-cache-followup-2, react-server-state-query-cache-followup-3]

### 一句话

这题的高分关键是把 React 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么很多 React 项目会用 TanStack Query / SWR 管接口数据，而不是把接口数据都塞进 Redux / Zustand？缓存失效、乐观更新和 SSR hydration 应该怎么设计？

### 答案要点

- 服务端状态有来源权威：真正的数据在服务端，前端只缓存快照；它会过期、被别人修改、需要重新验证。
- Query key 是缓存边界，必须包含资源类型、过滤条件、分页、用户身份等影响结果的维度；key 设计错会串数据或无法失效。
- staleTime 控制“多久内认为新鲜”，gcTime/cacheTime 控制“多久不用后清理”；两者不等同。
- 读取类请求可自动去重、后台刷新、窗口聚焦刷新；写操作要用 mutation，成功后 invalidate 或直接更新缓存。

#### 工程化补充

- 场景前提：React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计 只有在瓶颈被数据证实时才值得推进；先确认 React 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 React 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

Zustand、Redux、自研 store 为什么需要适配 `useSyncExternalStore`？它如何解决并发渲染下外部状态和 React 渲染不一致的问题？

### 答案要点

- 外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。
- getSnapshot 必须返回当前状态快照；如果状态没变，返回值引用也应稳定，否则会导致无限重渲染。
- subscribe 负责在 store 变化时通知 React；React 再重新读取 snapshot，而不是让外部 store 直接驱动 DOM。
- 并发渲染中 React 可能多次调用 getSnapshot，确认提交前后快照一致；不一致就重新渲染。

#### 工程化补充

- 场景前提：useSyncExternalStore 如何保证外部 Store 与并发渲染一致性 只有在瓶颈被数据证实时才值得推进；先确认 React 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 useSyncExternalStore 如何保证外部 Store 与并发渲染一致性 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题回答要覆盖 React 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

在 React 中实现一个中后台复杂表单时，如何设计表单状态、校验、联动、异步默认值和提交流程？什么时候选择 React Hook Form / Zod？

### 答案要点

- 简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 默认值异步加载要区分“初始加载”和“用户已编辑”：数据回来后不要直接覆盖用户正在输入的脏字段。
- 校验分层：字段级同步校验、跨字段校验、异步唯一性校验、提交后的服务端错误都要有展示位置。
- Schema 适合定义运行时输入边界，Zod 可和 TS 类型联动，但服务端仍要重复校验。

#### 工程化补充

- 场景前提：React 复杂表单：校验、异步默认值、联动和提交状态怎么设计 要先拆分状态来源：本地状态、缓存状态、路由状态边界不能混用。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在 React 项目里应用「React 状态管理选型」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先把 React 状态管理选型 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 React 状态管理选型 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- React：React 是「React 状态管理选型」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 状态管理：围绕「React 状态管理选型」里的 状态管理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- Redux：可预测、可调试，适合复杂业务、需要中间件 / DevTools / 时间旅行。

#### 风险与验收

- 主要风险：React 状态管理选型 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「React 状态管理选型」里 React 状态管理选型 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## react-suspense-data-followup-1

title: 追问：在「Suspense 与异步数据加载」进入长周期维护后，你会重点巡检哪些与 Suspense 相关的高风险边界点
difficulty: 资深
tags: [Suspense, 数据加载, 追问]
parent: react-suspense-data

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Suspense 与异步数据加载」进入长周期维护后，你会重点巡检哪些与 Suspense 相关的高风险边界点？

### 答案要点

#### 直答

- 结论：先列出 Suspense 与异步数据加载 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：围绕 Suspense 与异步数据加载 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Suspense：Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支。
- 数据加载：在「Suspense 与异步数据加载」里，数据加载 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 Suspense 与异步数据加载 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：Suspense 与异步数据加载 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## react-router-data-loaders-followup-1

title: 追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，在 React 项目里应用「React Router v6.4+ 的 Data Router 与 loaders」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [Router, 数据加载, 追问]
parent: react-router-data-loaders

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，在 React 项目里应用「React Router v6.4+ 的 Data Router 与 loaders」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先拆分 React Router v6.4+ 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 React Router v6.4+ 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- React Router v6.4+：围绕「React Router v6.4+ 的 Data Router 与 loaders」里的 React Router v6.4+ 作答时，要给可落地动作，并说明异常处理与验收阈值。
- Data Router：围绕「React Router v6.4+ 的 Data Router 与 loaders」里的 Data Router 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- loaders：在「React Router v6.4+ 的 Data Router 与 loaders」这题里，loaders 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：React Router v6.4+ 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「React Router v6.4+ 的 Data Router 与 loaders」里，验收 React Router v6.4+ 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## react-perf-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 性能 相关的指标来判断「React 性能优化清单」是不是当前性能瓶颈
difficulty: 进阶
tags: [追问]
parent: react-perf

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 性能 相关的指标来判断「React 性能优化清单」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 React 性能优化清单 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先统一 React 性能优化清单 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- React：首先用 React DevTools Profiler 录一段，看哪个组件 commit 时间长、commit 次数多。
- 性能：围绕「React 性能优化清单」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- memo：组件 split + React.memo + 稳定引用（useMemo / useCallback）；context 拆细。

#### 风险与验收

- 主要风险：在「React 性能优化清单」里，React 性能优化清单 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：React 性能优化清单 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## react-19-features-followup-1

title: 追问：在 React 项目里应用「React 19 关键特性速览」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [React 19, Actions, 追问]
parent: react-19-features

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在 React 项目里应用「React 19 关键特性速览」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先梳理 React 19 关键特性速览 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：useOptimistic：声明式乐观 UI，自动在 server 返回失败时回滚。

#### 术语解释

- React：React 是「React 19 关键特性速览」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React 19：在「React 19 关键特性速览」这题里，React 19 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button。

#### 风险与验收

- 主要风险：React 19 关键特性速览 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：React 19 关键特性速览 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-typescript-patterns-followup-1

title: 追问：在当前团队与业务约束下，在 React 项目里应用「React + TypeScript 常用类型模式」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [TypeScript, 泛型, 追问]
parent: react-typescript-patterns

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在 React 项目里应用「React + TypeScript 常用类型模式」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：把 React + TypeScript 常用类型模式 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 React + TypeScript 常用类型模式 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- React：React 是「React + TypeScript 常用类型模式」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TypeScript：TypeScript 是「React + TypeScript 常用类型模式」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 泛型：useFetch 返回 T 类型数据。

#### 风险与验收

- 主要风险：围绕 React + TypeScript 常用类型模式 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：React + TypeScript 常用类型模式 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-testing-followup-1

title: 追问：在 React 项目里应用「React 组件测试要测什么、怎么测」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [测试, RTL, 追问]
parent: react-testing

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在 React 项目里应用「React 组件测试要测什么、怎么测」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先梳理 React 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「React 组件测试要测什么、怎么测」里的 React 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- React：React 是「React 组件测试要测什么、怎么测」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 测试：不要测实现细节（state、私有方法），要测可见行为。
- RTL：RTL 是「React 组件测试要测什么、怎么测」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 React 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：React 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## react-key-warning-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 Diff 相关的指标来判断「列表渲染中 key 的作用与使用陷阱」是不是当前性能瓶颈
difficulty: 基础
tags: [Diff, key, 追问]
parent: react-key-warning

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 Diff 相关的指标来判断「列表渲染中 key 的作用与使用陷阱」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 列表渲染中 key 的作用与使用陷阱 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「列表渲染中 key 的作用与使用陷阱」里的 列表渲染中 key 的作用与使用陷阱 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- key：key 帮助 React 在 reconcile 时识别哪些元素是「同一个」，决定复用、移动还是销毁。
- Diff：Diff 是「列表渲染中 key 的作用与使用陷阱」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「列表渲染中 key 的作用与使用陷阱」里，列表渲染中 key 的作用与使用陷阱 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「列表渲染中 key 的作用与使用陷阱」里，列表渲染中 key 的作用与使用陷阱 至少要给一组指标阈值、一条日志证据和一组测试结果。

## react-controlled-vs-uncontrolled-followup-1

title: 追问：排查「受控组件 vs 非受控组件，性能边界在哪」性能瓶颈时，你会先看哪些指标来判断它是不是主矛盾
difficulty: 进阶
tags: [表单, 性能, 追问]
parent: react-controlled-vs-uncontrolled

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：排查「受控组件 vs 非受控组件，性能边界在哪」性能瓶颈时，你会先看哪些指标来判断它是不是主矛盾？

### 答案要点

#### 直答

- 结论：把 受控组件 vs 非受控组件 性能边界在哪 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 受控组件 vs 非受控组件 性能边界在哪 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- vs：围绕「受控组件 vs 非受控组件，性能边界在哪」里的 vs 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 表单：拆分组件 + memo / useFormState（react-hook-form）非受控、状态外包至库。
- 性能：用 ref + defaultValue，性能好，但无法实时联动。

#### 风险与验收

- 主要风险：受控组件 vs 非受控组件 性能边界在哪 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「受控组件 vs 非受控组件，性能边界在哪」里，受控组件 vs 非受控组件 性能边界在哪 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## react-portal-error-boundary-followup-1

title: 追问：真要把「Portal、Error Boundary、Suspense 的协作方式」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, 错误处理, 追问]
parent: react-portal-error-boundary

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「Portal、Error Boundary、Suspense 的协作方式」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「Portal、Error Boundary、Suspense 的协作方式」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：Portal 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- Portal：createPortal(children, document.body)，把子树渲染到任意 DOM，但事件冒泡仍按 React 树。
- Error Boundary：围绕「Portal、Error Boundary、Suspense 的协作方式」里的 Error Boundary 推进上线时，要明确每个批次的放量门槛和回退条件。
- Suspense：用于异步组件 / 数据加载（与 React Query / Relay / RSC 配合），fallback 显示骨架屏。

#### 风险与验收

- 主要风险：围绕 Portal 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 Portal 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## react-keys-list-basic-followup-1

title: 追问：结合真实业务约束，在 React 项目里应用「React 列表为什么必须给 key」时，哪些 state 或渲染边界最容易出问题
difficulty: 基础
tags: [list, key, 基础, 追问]
parent: react-keys-list-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在 React 项目里应用「React 列表为什么必须给 key」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先梳理 React 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「React 列表为什么必须给 key」里的 React 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- React：React 是「React 列表为什么必须给 key」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- key：diff 算法靠 key 在同层之间做"身份匹配"。没 key 就只能按位置匹配，插入/删除前面的元素会让后面所有节点的状态错位。
- list：围绕「React 列表为什么必须给 key」里的 list 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：React 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：React 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-keys-list-basic-followup-2

title: 追问：在「React 列表为什么必须给 key」场景下，为了证明这个方案在 list 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 基础
tags: [list, key, 基础, 追问]
parent: react-keys-list-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React 列表为什么必须给 key」场景下，为了证明这个方案在 list 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先约定「React 列表为什么必须给 key」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：围绕 React 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- React：React 是「React 列表为什么必须给 key」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- key：diff 算法靠 key 在同层之间做"身份匹配"。没 key 就只能按位置匹配，插入/删除前面的元素会让后面所有节点的状态错位。
- list：在「React 列表为什么必须给 key」里，list 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 React 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：React 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-keys-list-basic-followup-3

title: 追问：如果团队能力结构变化，你会怎样围绕 list 调整「React 列表为什么必须给 key」与替代方案的选型结论
difficulty: 基础
tags: [list, key, 基础, 追问]
parent: react-keys-list-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果团队能力结构变化，你会怎样围绕 list 调整「React 列表为什么必须给 key」与替代方案的选型结论？

### 答案要点

#### 直答

- 结论：React 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先拆分 React 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- React：React 是「React 列表为什么必须给 key」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- key：diff 算法靠 key 在同层之间做"身份匹配"。没 key 就只能按位置匹配，插入/删除前面的元素会让后面所有节点的状态错位。
- list：在「React 列表为什么必须给 key」里，list 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 React 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收看 React 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## react-vs-vue-mental-model-followup-2

title: 追问：在当前团队与业务约束下，你会如何把「React 和 Vue 的心智模型本质差异」拆成可观测、可回滚的小单元，避免一次性大改
difficulty: 进阶
tags: [React, Vue, 框架, 追问]
parent: react-vs-vue-mental-model
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何把「React 和 Vue 的心智模型本质差异」拆成可观测、可回滚的小单元，避免一次性大改？

### 答案要点

#### 直答

- 结论：验证 React 和 Vue 的心智模型本质差异 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「React 和 Vue 的心智模型本质差异」里的 React 和 Vue 的心智模型本质差异 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- React：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"。
- Vue：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"。
- 框架：围绕「React 和 Vue 的心智模型本质差异」里的 框架 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「React 和 Vue 的心智模型本质差异」里，React 和 Vue 的心智模型本质差异 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「React 和 Vue 的心智模型本质差异」里，React 和 Vue 的心智模型本质差异 至少要给一组指标阈值、一条日志证据和一组测试结果。

## react-vs-vue-mental-model-followup-3

title: 追问：结合真实业务约束，在评审「React 和 Vue 的心智模型本质差异」时，你会如何围绕 React 向团队解释“什么时候值得用，什么时候别硬上”
difficulty: 进阶
tags: [React, Vue, 框架, 追问]
parent: react-vs-vue-mental-model
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在评审「React 和 Vue 的心智模型本质差异」时，你会如何围绕 React 向团队解释“什么时候值得用，什么时候别硬上”？

### 答案要点

#### 直答

- 结论：先拆分 React 和 Vue 的心智模型本质差异 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 React 和 Vue 的心智模型本质差异 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- React：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"。
- Vue：Vue 基于依赖追踪（Proxy / getter），自动收集依赖；React 基于"状态变化触发整个子树重渲染 + 用 memo / hooks 控制"。
- 框架：围绕「React 和 Vue 的心智模型本质差异」里的 框架 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「React 和 Vue 的心智模型本质差异」场景下，React 和 Vue 的心智模型本质差异 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「React 和 Vue 的心智模型本质差异」里，React 和 Vue 的心智模型本质差异 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## react-hooks-rules-followup-2

title: 追问：在「Hooks 的核心规则与原理」场景下，为了证明这个方案在 Hooks 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [Hooks, 原理, 追问]
parent: react-hooks-rules
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Hooks 的核心规则与原理」场景下，为了证明这个方案在 Hooks 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「Hooks 的核心规则与原理」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 Hooks 的核心规则与原理 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Hooks：Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位。

#### 风险与验收

- 主要风险：若 Hooks 的核心规则与原理 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Hooks 的核心规则与原理 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-hooks-rules-followup-3

title: 追问：以「Hooks 的核心规则与原理」为例，如果团队人数、交付节奏和业务复杂度不同，你会怎么基于 Hooks 判断该不该选「Hooks 的核心规则与原理」
difficulty: 进阶
tags: [Hooks, 原理, 追问]
parent: react-hooks-rules
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Hooks 的核心规则与原理」为例，如果团队人数、交付节奏和业务复杂度不同，你会怎么基于 Hooks 判断该不该选「Hooks 的核心规则与原理」？

### 答案要点

#### 直答

- 结论：做 Hooks 的核心规则与原理 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。
- 关键动作：先排查 Hooks 的核心规则与原理 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Hooks：Hooks 依靠"调用顺序"在内部链表里定位每个 hook 的状态槽，跳过会错位。

#### 风险与验收

- 主要风险：若 Hooks 的核心规则与原理 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 Hooks 的核心规则与原理 收益提升和维护成本变化，确保取舍结论可持续。

## use-effect-pitfalls-followup-2

title: 追问：从工程落地角度看，React 18 自动批处理对 effect 的影响
difficulty: 进阶
tags: [useEffect, 陷阱, 追问]
parent: use-effect-pitfalls
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，React 18 自动批处理对 effect 的影响？

### 答案要点

#### 直答

- 结论：先锁定 常见陷阱 与 依赖管理 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 常见陷阱 与 依赖管理 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- useEffect：在「useEffect 常见陷阱与依赖管理」这题里，useEffect 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 陷阱：在「useEffect 常见陷阱与依赖管理」这题里，陷阱 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- React：React 是「useEffect 常见陷阱与依赖管理」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：常见陷阱 与 依赖管理 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「useEffect 常见陷阱与依赖管理」里，常见陷阱 与 依赖管理 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## use-effect-pitfalls-followup-3

title: 追问：useRef + useEffect 模拟「上一次值」的写法
difficulty: 进阶
tags: [useEffect, 陷阱, 追问]
parent: use-effect-pitfalls
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：useRef + useEffect 模拟「上一次值」的写法？

### 答案要点

#### 直答

- 结论：先画出 上一次值 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 上一次值 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 上一次值：在「useEffect 常见陷阱与依赖管理」这道追问里，上一次值 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- useEffect：在「useEffect 常见陷阱与依赖管理」这题里，useEffect 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 陷阱：在「useEffect 常见陷阱与依赖管理」这题里，陷阱 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「useEffect 常见陷阱与依赖管理」场景下，上一次值 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「useEffect 常见陷阱与依赖管理」里，验收 上一次值 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## react-reconciler-fiber-followup-2

title: 追问：围绕「Fiber 架构与并发渲染」上线效果，你会优先看哪些和 Fiber 相关的真实用户指标来佐证体验提升
difficulty: 资深
tags: [Fiber, Concurrent, 追问]
parent: react-reconciler-fiber
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「Fiber 架构与并发渲染」上线效果，你会优先看哪些和 Fiber 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 直答

- 结论：把 Fiber 架构与并发渲染 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 Fiber 架构与并发渲染 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Fiber：Fiber 是 React 16+ 的渲染单元，把组件树拆成可中断、可恢复的工作单元链表。
- Concurrent：Concurrent 是「Fiber 架构与并发渲染」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Fiber 架构与并发渲染」里，Fiber 架构与并发渲染 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Fiber 架构与并发渲染 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## react-reconciler-fiber-followup-3

title: 追问：以「Fiber 架构与并发渲染」为例，如果「Fiber 架构与并发渲染」在 Fiber 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [Fiber, Concurrent, 追问]
parent: react-reconciler-fiber
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Fiber 架构与并发渲染」为例，如果「Fiber 架构与并发渲染」在 Fiber 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 Fiber 架构与并发渲染 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先拆分 Fiber 架构与并发渲染 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- Fiber：Fiber 是 React 16+ 的渲染单元，把组件树拆成可中断、可恢复的工作单元链表。
- Concurrent：Concurrent 是「Fiber 架构与并发渲染」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 Fiber 架构与并发渲染 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 Fiber 架构与并发渲染 收益提升和维护成本变化，确保取舍结论可持续。

## state-management-react-followup-2

title: 追问：结合真实业务约束，你会如何围绕 状态管理 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [状态管理, Redux, Zustand, 追问]
parent: state-management-react
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 状态管理 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：验证「React 状态管理选型」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「React 状态管理选型」里的 React 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 状态管理：在「React 状态管理选型」里，状态管理 是验收对象，必须给可量化指标、日志信号和测试证据。
- Redux：可预测、可调试，适合复杂业务、需要中间件 / DevTools / 时间旅行。
- Zustand：轻量、无样板、selector 自动避免无关重渲染，是 90% 中小型应用的最优解。

#### 风险与验收

- 主要风险：在「React 状态管理选型」里，React 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「React 状态管理选型」里，React 至少要给一组指标阈值、一条日志证据和一组测试结果。

## state-management-react-followup-3

title: 追问：在当前团队与业务约束下，围绕「React 状态管理选型」选型时，你会怎样按 状态管理 与业务复杂度给出分层推荐
difficulty: 进阶
tags: [状态管理, Redux, Zustand, 追问]
parent: state-management-react
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「React 状态管理选型」选型时，你会怎样按 状态管理 与业务复杂度给出分层推荐？

### 答案要点

#### 直答

- 结论：评估 React 状态管理选型 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先量化 React 状态管理选型 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- React：React 是「React 状态管理选型」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 状态管理：围绕「React 状态管理选型」里的 状态管理 评估时，不能只讲优点，还要给切换条件和止损阈值。
- Redux：可预测、可调试，适合复杂业务、需要中间件 / DevTools / 时间旅行。

#### 风险与验收

- 主要风险：若 React 状态管理选型 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 React 状态管理选型 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## react-router-data-loaders-followup-2

title: 追问：结合真实业务约束，你会如何围绕 Router 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [Router, 数据加载, 追问]
parent: react-router-data-loaders
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 Router 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先定「React Router v6.4+ 的 Data Router 与 loaders」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先把「React Router v6.4+ 的 Data Router 与 loaders」里的 Router 与 loaders 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Router：Router 是「React Router v6.4+ 的 Data Router 与 loaders」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 数据加载：围绕「React Router v6.4+ 的 Data Router 与 loaders」里的 数据加载 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「React Router v6.4+ 的 Data Router 与 loaders」里，Router 与 loaders 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「React Router v6.4+ 的 Data Router 与 loaders」里，Router 与 loaders 至少要给一组指标阈值、一条日志证据和一组测试结果。

## react-router-data-loaders-followup-3

title: 追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，围绕「React Router v6.4+ 的 Data Router 与 loaders」选型时，你会怎样按 Router 与业务复杂度给出分层推荐
difficulty: 进阶
tags: [Router, 数据加载, 追问]
parent: react-router-data-loaders
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React Router v6.4+ 的 Data Router 与 loaders」场景下，围绕「React Router v6.4+ 的 Data Router 与 loaders」选型时，你会怎样按 Router 与业务复杂度给出分层推荐？

### 答案要点

#### 直答

- 结论：评估 React Router v6.4+ 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先排查 React Router v6.4+ 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- React Router v6.4+：围绕「React Router v6.4+ 的 Data Router 与 loaders」里的 React Router v6.4+ 作答时，要给可落地动作，并说明异常处理与验收阈值。
- Data Router：在「React Router v6.4+ 的 Data Router 与 loaders」里，Data Router 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- loaders：围绕「React Router v6.4+ 的 Data Router 与 loaders」里的 loaders 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 React Router v6.4+ 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 React Router v6.4+ 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## react-perf-followup-2

title: 追问：以「React 性能优化清单」为例，要证明「React 性能优化清单」确实改善体验，你会如何围绕 性能 设计线上观测与对照验证
difficulty: 进阶
tags: [性能, memo, 虚拟化, 追问]
parent: react-perf
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「React 性能优化清单」为例，要证明「React 性能优化清单」确实改善体验，你会如何围绕 性能 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 React 性能优化清单 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先定义 React 性能优化清单 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- React：首先用 React DevTools Profiler 录一段，看哪个组件 commit 时间长、commit 次数多。
- 性能：围绕「React 性能优化清单」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- memo：组件 split + React.memo + 稳定引用（useMemo / useCallback）；context 拆细。

#### 风险与验收

- 主要风险：React 性能优化清单 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「React 性能优化清单」里，React 性能优化清单 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## react-perf-followup-3

title: 追问：结合真实业务约束，围绕「React 性能优化清单」在 性能 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [性能, memo, 虚拟化, 追问]
parent: react-perf
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「React 性能优化清单」在 性能 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 结论：评估 React 性能优化清单 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先排查 React 性能优化清单 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- React：首先用 React DevTools Profiler 录一段，看哪个组件 commit 时间长、commit 次数多。
- 性能：围绕「React 性能优化清单」里的 性能 评估时，不能只讲优点，还要给切换条件和止损阈值。
- memo：组件 split + React.memo + 稳定引用（useMemo / useCallback）；context 拆细。

#### 风险与验收

- 主要风险：若 React 性能优化清单 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 React 性能优化清单 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## react-19-features-followup-2

title: 追问：在「React 19 关键特性速览」场景下，为了证明这个方案在 React 19 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [React 19, Actions, 追问]
parent: react-19-features
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React 19 关键特性速览」场景下，为了证明这个方案在 React 19 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先定「React 19 关键特性速览」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：useOptimistic：声明式乐观 UI，自动在 server 返回失败时回滚。

#### 术语解释

- React：React 是「React 19 关键特性速览」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React 19：在「React 19 关键特性速览」里，React 19 是验收对象，必须给可量化指标、日志信号和测试证据。
- Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button。

#### 风险与验收

- 主要风险：React 19 关键特性速览 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「React 19 关键特性速览」里，React 19 关键特性速览 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## react-19-features-followup-3

title: 追问：在评审「React 19 关键特性速览」时，你会如何围绕 React 19 向团队解释“什么时候值得用，什么时候别硬上”
difficulty: 资深
tags: [React 19, Actions, 追问]
parent: react-19-features
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在评审「React 19 关键特性速览」时，你会如何围绕 React 19 向团队解释“什么时候值得用，什么时候别硬上”？

### 答案要点

#### 直答

- 结论：先把 React 19 关键特性速览 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：useOptimistic：声明式乐观 UI，自动在 server 返回失败时回滚。

#### 术语解释

- React：React 是「React 19 关键特性速览」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React 19：在「React 19 关键特性速览」这题里，React 19 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Actions：把"提交 + pending + error + revalidate"封装成约定，配合 form / button。

#### 风险与验收

- 主要风险：React 19 关键特性速览 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：React 19 关键特性速览 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-typescript-patterns-followup-2

title: 追问：结合真实业务约束，如果要让结论在 TypeScript 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [TypeScript, 泛型, 追问]
parent: react-typescript-patterns
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 TypeScript 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：先定「React + TypeScript 常用类型模式」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先定义 指标的组合验证 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- TypeScript：TypeScript 是「React + TypeScript 常用类型模式」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 泛型：useFetch 返回 T 类型数据。

#### 风险与验收

- 主要风险：指标的组合验证 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「React + TypeScript 常用类型模式」里，指标的组合验证 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## react-typescript-patterns-followup-3

title: 追问：从工程落地角度看，和常见替代方案相比，「React + TypeScript 常用类型模式」在 TypeScript 这个维度更适合什么团队规模与业务复杂度
difficulty: 进阶
tags: [TypeScript, 泛型, 追问]
parent: react-typescript-patterns
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，和常见替代方案相比，「React + TypeScript 常用类型模式」在 TypeScript 这个维度更适合什么团队规模与业务复杂度？

### 答案要点

#### 直答

- 结论：回答 React + TypeScript 常用类型模式 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 React + TypeScript 常用类型模式 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- React：React 是「React + TypeScript 常用类型模式」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TypeScript：TypeScript 是「React + TypeScript 常用类型模式」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 泛型：useFetch 返回 T 类型数据。

#### 风险与验收

- 主要风险：围绕 React + TypeScript 常用类型模式 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收要能复现 React + TypeScript 常用类型模式 问题并证明原因链成立，再观察修复后指标是否回归。

## react-testing-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 测试链路 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [测试, RTL, 追问]
parent: react-testing
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 测试链路 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先约定「React 组件测试要测什么、怎么测」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 测试链路 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 测试：不要测实现细节（state、私有方法），要测可见行为。
- RTL：RTL 是「React 组件测试要测什么、怎么测」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：测试链路 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「React 组件测试要测什么、怎么测」里，测试链路 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## react-testing-followup-3

title: 追问：以「React 组件测试要测什么、怎么测」为例，当业务复杂度升级时，你会如何判断「React 组件测试要测什么、怎么测」在 测试链路 上还能不能继续扛住
difficulty: 进阶
tags: [测试, RTL, 追问]
parent: react-testing
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「React 组件测试要测什么、怎么测」为例，当业务复杂度升级时，你会如何判断「React 组件测试要测什么、怎么测」在 测试链路 上还能不能继续扛住？

### 答案要点

#### 直答

- 结论：验证 React 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 React 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- React：React 是「React 组件测试要测什么、怎么测」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 测试：不要测实现细节（state、私有方法），要测可见行为。
- RTL：RTL 是「React 组件测试要测什么、怎么测」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 React 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：React 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-key-warning-followup-2

title: 追问：在当前团队与业务约束下，如果实验室分数变好但线上反馈一般，你会如何围绕 Diff 重新评估「列表渲染中 key 的作用与使用陷阱」优化效果
difficulty: 基础
tags: [Diff, key, 追问]
parent: react-key-warning
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果实验室分数变好但线上反馈一般，你会如何围绕 Diff 重新评估「列表渲染中 key 的作用与使用陷阱」优化效果？

### 答案要点

#### 直答

- 结论：先拆分 列表渲染中 key 的作用与使用陷阱 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 列表渲染中 key 的作用与使用陷阱 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- key：key 帮助 React 在 reconcile 时识别哪些元素是「同一个」，决定复用、移动还是销毁。
- Diff：Diff 是「列表渲染中 key 的作用与使用陷阱」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：列表渲染中 key 的作用与使用陷阱 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「列表渲染中 key 的作用与使用陷阱」里，列表渲染中 key 的作用与使用陷阱 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## react-key-warning-followup-3

title: 追问：在「列表渲染中 key 的作用与使用陷阱」场景下，你会怎样评估「列表渲染中 key 的作用与使用陷阱」在性能收益与兼容性风险之间的平衡点
difficulty: 基础
tags: [Diff, key, 追问]
parent: react-key-warning
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「列表渲染中 key 的作用与使用陷阱」场景下，你会怎样评估「列表渲染中 key 的作用与使用陷阱」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 直答

- 结论：列表渲染中 key 的作用与使用陷阱 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先拆分 列表渲染中 key 的作用与使用陷阱 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- key：key 帮助 React 在 reconcile 时识别哪些元素是「同一个」，决定复用、移动还是销毁。
- Diff：Diff 是「列表渲染中 key 的作用与使用陷阱」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 列表渲染中 key 的作用与使用陷阱 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 列表渲染中 key 的作用与使用陷阱 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## react-controlled-vs-uncontrolled-followup-2

title: 追问：在当前团队与业务约束下，你会如何结合 表单 指标，避免把「受控组件 vs 非受控组件，性能边界在哪」的实验室提升误判为真实用户体验改善
difficulty: 进阶
tags: [表单, 性能, 追问]
parent: react-controlled-vs-uncontrolled
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何结合 表单 指标，避免把「受控组件 vs 非受控组件，性能边界在哪」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 直答

- 结论：验证 受控组件 vs 非受控组件 性能边界在哪 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 受控组件 vs 非受控组件 性能边界在哪 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- vs：围绕「受控组件 vs 非受控组件，性能边界在哪」里的 vs 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 表单：拆分组件 + memo / useFormState（react-hook-form）非受控、状态外包至库。
- 性能：用 ref + defaultValue，性能好，但无法实时联动。

#### 风险与验收

- 主要风险：受控组件 vs 非受控组件 性能边界在哪 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「受控组件 vs 非受控组件，性能边界在哪」里，受控组件 vs 非受控组件 性能边界在哪 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## react-controlled-vs-uncontrolled-followup-3

title: 追问：在当前团队与业务约束下，你会怎样评估「受控组件 vs 非受控组件，性能边界在哪」在性能收益与兼容性风险之间的平衡点
difficulty: 进阶
tags: [表单, 性能, 追问]
parent: react-controlled-vs-uncontrolled
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样评估「受控组件 vs 非受控组件，性能边界在哪」在性能收益与兼容性风险之间的平衡点？

### 答案要点

#### 直答

- 结论：受控组件 vs 非受控组件 性能边界在哪 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先量化 受控组件 vs 非受控组件 性能边界在哪 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- vs：在「受控组件 vs 非受控组件，性能边界在哪」里，vs 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 表单：拆分组件 + memo / useFormState（react-hook-form）非受控、状态外包至库。
- 性能：用 ref + defaultValue，性能好，但无法实时联动。

#### 风险与验收

- 主要风险：若 受控组件 vs 非受控组件 性能边界在哪 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 受控组件 vs 非受控组件 性能边界在哪 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## react-portal-error-boundary-followup-2

title: 追问：以「Portal、Error Boundary、Suspense 的协作方式」为例，面对团队能力差异，你会如何围绕 架构 把「Portal、Error Boundary、Suspense 的协作方式」拆成可并行推进的小阶段
difficulty: 进阶
tags: [架构, 错误处理, 追问]
parent: react-portal-error-boundary
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Portal、Error Boundary、Suspense 的协作方式」为例，面对团队能力差异，你会如何围绕 架构 把「Portal、Error Boundary、Suspense 的协作方式」拆成可并行推进的小阶段？

### 答案要点

#### 直答

- 结论：先拆分 Portal 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 Portal 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Portal：createPortal(children, document.body)，把子树渲染到任意 DOM，但事件冒泡仍按 React 树。
- Error Boundary：围绕「Portal、Error Boundary、Suspense 的协作方式」里的 Error Boundary 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- Suspense：用于异步组件 / 数据加载（与 React Query / Relay / RSC 配合），fallback 显示骨架屏。

#### 风险与验收

- 主要风险：Portal 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Portal、Error Boundary、Suspense 的协作方式」里，验收 Portal 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## react-portal-error-boundary-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「Portal、Error Boundary、Suspense 的协作方式」还值不值得继续维护
difficulty: 进阶
tags: [架构, 错误处理, 追问]
parent: react-portal-error-boundary
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「Portal、Error Boundary、Suspense 的协作方式」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：把 Portal 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：把「Portal、Error Boundary、Suspense 的协作方式」里的 Portal 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Portal：createPortal(children, document.body)，把子树渲染到任意 DOM，但事件冒泡仍按 React 树。
- Error Boundary：在「Portal、Error Boundary、Suspense 的协作方式」这题里，Error Boundary 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Suspense：用于异步组件 / 数据加载（与 React Query / Relay / RSC 配合），fallback 显示骨架屏。

#### 风险与验收

- 主要风险：Portal 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：Portal 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-compiler-boundaries-followup-1

title: 追问：在「React Compiler 自动 memo 的原理、限制与落地边界」场景下，什么情况下 React Compiler 会跳过某个组件或 hook
difficulty: 资深
tags: [React Compiler, 性能, 编译优化, 追问]
parent: react-compiler-boundaries
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React Compiler 自动 memo 的原理、限制与落地边界」场景下，什么情况下 React Compiler 会跳过某个组件或 hook？

### 答案要点

#### 直答

- 结论：先梳理 React Compiler 自动 memo 的原理 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。

#### 术语解释

- React Compiler：React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- memo：围绕「React Compiler 自动 memo 的原理、限制与落地边界」里的 memo 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 性能：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。

#### 风险与验收

- 主要风险：React Compiler 自动 memo 的原理 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「React Compiler 自动 memo 的原理、限制与落地边界」里 React Compiler 自动 memo 的原理 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## react-compiler-boundaries-followup-2

title: 追问：以「React Compiler 自动 memo 的原理、限制与落地边界」为例，它和 React.memo、useMemo、useCallback 的迁移顺序怎么安排
difficulty: 资深
tags: [React Compiler, 性能, 编译优化, 追问]
parent: react-compiler-boundaries
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「React Compiler 自动 memo 的原理、限制与落地边界」为例，它和 React.memo、useMemo、useCallback 的迁移顺序怎么安排？

### 答案要点

#### 直答

- 结论：React Compiler 自动 memo 的原理 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。
- 关键动作：迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。

#### 术语解释

- React Compiler：React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- memo：在「React Compiler 自动 memo 的原理、限制与落地边界」里，memo 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 性能：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。

#### 风险与验收

- 主要风险：React Compiler 自动 memo 的原理 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 React Compiler 自动 memo 的原理 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## react-compiler-boundaries-followup-3

title: 追问：在当前团队与业务约束下，你会用哪些 Profiler 指标证明 Compiler 真的带来了收益
difficulty: 资深
tags: [React Compiler, 性能, 编译优化, 追问]
parent: react-compiler-boundaries
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会用哪些 Profiler 指标证明 Compiler 真的带来了收益？

### 答案要点

#### 直答

- 结论：先定义 限制 与 落地边界 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：迁移时不要一次性删除所有 memo：先打开 lint/编译诊断，查看哪些组件被跳过，再用 React Profiler 对比 commit 次数、render duration 和交互延迟。

#### 术语解释

- React Compiler：React Compiler 的核心不是“运行时更聪明”，而是编译阶段识别组件渲染中的稳定表达式、闭包和 JSX 子树，插入等价缓存逻辑，降低父组件重渲染时的无效计算与子树重渲染。
- 性能：列表虚拟化、状态下沉、组件拆分、数据缓存、网络并发控制仍然要手工做；Compiler 主要减少“稳定引用维护”的样板成本。
- 编译优化：围绕「React Compiler 自动 memo 的原理、限制与落地边界」里的 编译优化 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「React Compiler 自动 memo 的原理、限制与落地边界」里，限制 与 落地边界 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：限制 与 落地边界 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## react-server-state-query-cache-followup-1

title: 追问：结合真实业务约束，staleTime 和 gcTime 分别解决什么问题
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存, 追问]
parent: react-server-state-query-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，`staleTime` 和 `gcTime` 分别解决什么问题？

### 答案要点

#### 直答

- 结论：先把 staleTime 与 gcTime 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的 staleTime 与 gcTime 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- React：React 是「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TanStack Query：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」这题里，TanStack Query 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Server State：围绕「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的 Server State 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里，staleTime 与 gcTime 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里 staleTime 与 gcTime 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## react-server-state-query-cache-followup-2

title: 追问：以「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」为例，乐观更新失败时，如何保证 UI、缓存和服务端最终一致
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存, 追问]
parent: react-server-state-query-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」为例，乐观更新失败时，如何保证 UI、缓存和服务端最终一致？

### 答案要点

#### 直答

- 结论：React 服务端状态管理 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先识别 React 服务端状态管理 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- React：React 是「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TanStack Query：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里，TanStack Query 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- SWR：SWR 是「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Query key 是缓存边界，必须包含资源类型、过滤条件、分页、用户身份等影响结果的维度；key 设计错会串数据或无法失效。
- 验收信号：验收看 React 服务端状态管理 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## react-server-state-query-cache-followup-3

title: 追问：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」场景下，SSR 预取后，如何避免客户端 hydration 又请求一遍
difficulty: 资深
tags: [React, TanStack Query, Server State, 缓存, 追问]
parent: react-server-state-query-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」场景下，SSR 预取后，如何避免客户端 hydration 又请求一遍？

### 答案要点

#### 直答

- 结论：先把 React 服务端状态管理 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 React 服务端状态管理 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- React：React 是「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TanStack Query：围绕「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的 TanStack Query 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- SWR：SWR 是「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Query key 是缓存边界，必须包含资源类型、过滤条件、分页、用户身份等影响结果的维度；key 设计错会串数据或无法失效。
- 验收信号：验收至少包含「React 服务端状态管理：TanStack Query / SWR 缓存失效怎么设计」里 React 服务端状态管理 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## react-use-sync-external-store-followup-1

title: 追问：tearing 是什么，为什么 React 并发渲染会放大这个问题
difficulty: 资深
tags: [React, 并发渲染, Store, 追问]
parent: react-use-sync-external-store
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：tearing 是什么，为什么 React 并发渲染会放大这个问题？

### 答案要点

#### 直答

- 结论：回答 Store 与 并发渲染一致性 的原理时要同时给成因、影响范围和替代方案，才算可落地。
- 关键动作：围绕 Store 与 并发渲染一致性 先做归因再做验证，避免把现象当原因。

#### 术语解释

- React：外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。
- 并发渲染：并发渲染中 React 可能多次调用 getSnapshot，确认提交前后快照一致；不一致就重新渲染。
- Store：Store 是「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Store 与 并发渲染一致性 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收要能复现 Store 与 并发渲染一致性 问题并证明原因链成立，再观察修复后指标是否回归。

## react-use-sync-external-store-followup-2

title: 追问：在当前团队与业务约束下，getSnapshot 的返回值为什么需要引用稳定
difficulty: 资深
tags: [React, 并发渲染, Store, 追问]
parent: react-use-sync-external-store
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，`getSnapshot` 的返回值为什么需要引用稳定？

### 答案要点

#### 直答

- 结论：回答 Store 与 并发渲染一致性 的原理时要同时给成因、影响范围和替代方案，才算可落地。
- 关键动作：围绕 Store 与 并发渲染一致性 先做归因再做验证，避免把现象当原因。

#### 术语解释

- React：外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。
- 并发渲染：并发渲染中 React 可能多次调用 getSnapshot，确认提交前后快照一致；不一致就重新渲染。
- Store：Store 是「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Store 与 并发渲染一致性 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收标准是 Store 与 并发渲染一致性 因果链可复现：输入触发、机制命中、修复后指标回稳。

## react-use-sync-external-store-followup-3

title: 追问：以「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」为例，Zustand / Redux 这类库在 React 18 之后为什么要适配这个 Hook
difficulty: 资深
tags: [React, 并发渲染, Store, 追问]
parent: react-use-sync-external-store
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」为例，Zustand / Redux 这类库在 React 18 之后为什么要适配这个 Hook？

### 答案要点

#### 直答

- 结论：回答 Store 与 并发渲染一致性 的原理时要同时给成因、影响范围和替代方案，才算可落地。
- 关键动作：围绕 Store 与 并发渲染一致性 先做归因再做验证，避免把现象当原因。

#### 术语解释

- useSyncExternalStore：useSyncExternalStore 决定「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」为什么会这样，回答时要把原因和失效前提讲清楚。
- Store：Store 是「useSyncExternalStore 如何保证外部 Store 与并发渲染一致性」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React：外部 store 不受 React 管理，如果组件在渲染过程中 store 变化，可能出现同一屏不同组件读到不同版本的状态，这就是 tearing。

#### 风险与验收

- 主要风险：若 Store 与 并发渲染一致性 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收要能复现 Store 与 并发渲染一致性 问题并证明原因链成立，再观察修复后指标是否回归。

## react-complex-form-architecture-followup-1

title: 追问：在当前团队与业务约束下，React Hook Form 为什么在大表单里通常比全受控 state 更省渲染
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod, 追问]
parent: react-complex-form-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，React Hook Form 为什么在大表单里通常比全受控 state 更省渲染？

### 答案要点

#### 直答

- 结论：联动 的原因要落到“为什么会发生、何时会失效、如何规避”三点，缺一都不完整。
- 关键动作：先复盘 联动 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- React：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 表单：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- React Hook Form：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。

#### 风险与验收

- 主要风险：联动 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：验收标准是 联动 因果链可复现：输入触发、机制命中、修复后指标回稳。

## react-complex-form-architecture-followup-2

title: 追问：异步唯一性校验如何避免慢响应覆盖新输入
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod, 追问]
parent: react-complex-form-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：异步唯一性校验如何避免慢响应覆盖新输入？

### 答案要点

#### 直答

- 结论：先拆分 联动 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 联动 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- React：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 表单：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- React Hook Form：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。

#### 风险与验收

- 主要风险：联动 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 联动 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## react-complex-form-architecture-followup-3

title: 追问：在当前团队与业务约束下，分步表单里，草稿保存和最终提交校验如何协调
difficulty: 进阶
tags: [React, 表单, React Hook Form, Zod, 追问]
parent: react-complex-form-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，分步表单里，草稿保存和最终提交校验如何协调？

### 答案要点

#### 直答

- 结论：先画出 草稿保存 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 草稿保存 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- React：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- 表单：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。
- React Hook Form：简单表单可用受控组件；字段多、联动多、性能敏感时，React Hook Form 这类基于 uncontrolled + subscription 的方案更适合。

#### 风险与验收

- 主要风险：草稿保存 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「React 复杂表单：校验、异步默认值、联动和提交状态怎么设计」里，草稿保存 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## react-suspense-data-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Suspense 方案有效
difficulty: 资深
tags: [Suspense, 数据加载, 追问]
parent: react-suspense-data
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Suspense 方案有效？

### 答案要点

#### 直答

- 结论：先约定「Suspense 与异步数据加载」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：围绕 Suspense 与 异步数据加载 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Suspense：Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支。
- 数据加载：在「Suspense 与异步数据加载」里，数据加载 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 Suspense 与 异步数据加载 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Suspense 与 异步数据加载 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-suspense-data-followup-3

title: 追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 Suspense 重新划分「Suspense 与异步数据加载」的实施阶段
difficulty: 资深
tags: [Suspense, 数据加载, 追问]
parent: react-suspense-data
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 Suspense 重新划分「Suspense 与异步数据加载」的实施阶段？

### 答案要点

#### 直答

- 结论：「Suspense 与异步数据加载」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：把「Suspense 与异步数据加载」里的 Suspense 与异步数据加载 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Suspense：Suspense 让组件在数据未就绪时"挂起"，由父级 fallback 渲染 spinner，无需手写 isLoading 分支。
- 数据加载：围绕「Suspense 与异步数据加载」里的 数据加载 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：围绕 Suspense 与异步数据加载 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Suspense 与异步数据加载 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## react-render-budget-gate

title: React 渲染预算治理：把重渲染风险前置到发布闸门
difficulty: 资深
tags: [React, 性能预算, 渲染治理]
followups: [react-render-budget-gate-followup-1, react-render-budget-gate-followup-2, react-render-budget-gate-followup-3]

### 一句话

这题的高分关键是把 React 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你会如何给 React 应用建立渲染预算体系，避免功能迭代时出现隐性重渲染和交互卡顿？

### 答案要点

- 先定义预算对象：关键页面渲染次数、提交耗时分位、长任务占比、交互延迟阈值。
- 预算分层执行：本地开发告警、PR 阶段阻断、灰度阶段动态观测。
- 预算评估要结合用户场景：输入密集、列表滚动、复杂表单和弱设备分开测量。
- 对高风险改动做专项护栏：context 扩散、列表 key 变化、依赖误配导致的无效重算。

#### 工程化补充

- 场景前提：React 渲染预算治理：把重渲染风险前置到发布闸门 只有在瓶颈被数据证实时才值得推进；先确认 React 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 React 渲染预算治理：把重渲染风险前置到发布闸门 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

回答「React 水合不一致排障手册：从告警定位到稳定回退」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

当 React 应用上线后出现 hydration mismatch 告警与白屏投诉时，你会如何快速定位并稳定止损？

### 答案要点

- 先按类型分流：结构不一致、数据不一致、环境差异（时区/随机数/客户端 API）分别处理。
- 建立最小复现链路：固定请求参数、固定时区与语言、记录服务端快照和客户端首帧状态。
- 对高风险节点加守护：时间相关字段、随机 id、浏览器专属逻辑必须延后到客户端执行。
- 观测体系要可关联：错误日志带 route、buildId、组件边界、服务端渲染摘要，便于快速聚类。

#### 工程化补充

- 场景前提：React 水合不一致排障手册：从告警定位到稳定回退 要先拆分状态来源：本地状态、缓存状态、路由状态边界不能混用。
- 失败风险：常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。
- 验收信号：验收至少看渲染次数、请求重复率和状态一致性告警。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要做「React 渲染预算治理：把重渲染风险前置到发布闸门」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 结论：先梳理 React 渲染预算治理 把重渲染风险前置到发布闸门 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：预算分层执行：本地开发告警、PR 阶段阻断、灰度阶段动态观测。

#### 术语解释

- React：React 是「React 渲染预算治理：把重渲染风险前置到发布闸门」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能预算：围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」里的 性能预算 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 渲染治理：在「React 渲染预算治理：把重渲染风险前置到发布闸门」这题里，渲染治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「React 渲染预算治理：把重渲染风险前置到发布闸门」里，React 渲染预算治理 把重渲染风险前置到发布闸门 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：React 渲染预算治理 把重渲染风险前置到发布闸门 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-render-budget-gate-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 React 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [React, 性能预算, 渲染治理, 追问]
parent: react-render-budget-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 React 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先约定「React 渲染预算治理：把重渲染风险前置到发布闸门」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：预算分层执行：本地开发告警、PR 阶段阻断、灰度阶段动态观测。

#### 术语解释

- React：React 是「React 渲染预算治理：把重渲染风险前置到发布闸门」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能预算：围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」里的 性能预算 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 渲染治理：在「React 渲染预算治理：把重渲染风险前置到发布闸门」里，渲染治理 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「React 渲染预算治理：把重渲染风险前置到发布闸门」里，React 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「React 渲染预算治理：把重渲染风险前置到发布闸门」里，React 至少要给一组指标阈值、一条日志证据和一组测试结果。

## react-render-budget-gate-followup-3

title: 追问：在「React 渲染预算治理：把重渲染风险前置到发布闸门」场景下，如果「React 渲染预算治理：把重渲染风险前置到发布闸门」在 React 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [React, 性能预算, 渲染治理, 追问]
parent: react-render-budget-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「React 渲染预算治理：把重渲染风险前置到发布闸门」场景下，如果「React 渲染预算治理：把重渲染风险前置到发布闸门」在 React 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 React 渲染预算治理 把重渲染风险前置到发布闸门 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：预算分层执行：本地开发告警、PR 阶段阻断、灰度阶段动态观测。

#### 术语解释

- React：React 是「React 渲染预算治理：把重渲染风险前置到发布闸门」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能预算：围绕「React 渲染预算治理：把重渲染风险前置到发布闸门」里的 性能预算 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 渲染治理：在「React 渲染预算治理：把重渲染风险前置到发布闸门」里，渲染治理 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 React 渲染预算治理 把重渲染风险前置到发布闸门 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：围绕 React 渲染预算治理 把重渲染风险前置到发布闸门 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## react-hydration-mismatch-playbook-followup-1

title: 追问：从工程落地角度看，在 React 项目里应用「React 水合不一致排障手册：从告警定位到稳定回退」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [React, Hydration, SSR, 追问]
parent: react-hydration-mismatch-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，在 React 项目里应用「React 水合不一致排障手册：从告警定位到稳定回退」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先把 React 水合不一致排障手册 从告警定位到稳定回退 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 React 水合不一致排障手册 从告警定位到稳定回退 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- React：React 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Hydration：Hydration 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SSR：SSR 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「React 水合不一致排障手册：从告警定位到稳定回退」里，React 水合不一致排障手册 从告警定位到稳定回退 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：React 水合不一致排障手册 从告警定位到稳定回退 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## react-hydration-mismatch-playbook-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 React 方案有效
difficulty: 资深
tags: [React, Hydration, SSR, 追问]
parent: react-hydration-mismatch-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 React 方案有效？

### 答案要点

#### 直答

- 结论：先定「React 水合不一致排障手册：从告警定位到稳定回退」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 React 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- React：React 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Hydration：Hydration 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SSR：SSR 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「React 水合不一致排障手册：从告警定位到稳定回退」里，React 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：React 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## react-hydration-mismatch-playbook-followup-3

title: 追问：从工程落地角度看，如果比较「React 水合不一致排障手册：从告警定位到稳定回退」与替代方案，你会如何基于 React 判断不同团队阶段的最佳选择
difficulty: 资深
tags: [React, Hydration, SSR, 追问]
parent: react-hydration-mismatch-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果比较「React 水合不一致排障手册：从告警定位到稳定回退」与替代方案，你会如何基于 React 判断不同团队阶段的最佳选择？

### 答案要点

#### 直答

- 结论：做 React 水合不一致排障手册 从告警定位到稳定回退 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。
- 关键动作：先排查 React 水合不一致排障手册 从告警定位到稳定回退 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- React：React 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Hydration：Hydration 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SSR：SSR 是「React 水合不一致排障手册：从告警定位到稳定回退」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 React 水合不一致排障手册 从告警定位到稳定回退 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 React 水合不一致排障手册 从告警定位到稳定回退 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## react-compiler-rollout-command-bridge

title: React Compiler 升级指挥桥：收益验证、风险分层与一键止损
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通]
followups: [react-compiler-rollout-command-bridge-followup-1, react-compiler-rollout-command-bridge-followup-2, react-compiler-rollout-command-bridge-followup-3]

### 一句话

这题的高分关键是把 发布治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

团队准备在核心业务逐步启用 React Compiler，小流量测试有收益，但部分复杂页面出现交互抖动与重渲染回归。你会如何组织升级指挥桥，保证发布节奏和风险可控？

### 答案要点

- 先做风险分层：按页面复杂度、交互密度、历史事故频率拆出高/中/低风险域。
- 明确放量闸门：渲染次数、交互时延、错误率三组指标任一超阈值就暂停扩量。
- 开关粒度要足够细：路由级、组件簇级、用户分群级开关，避免“一刀切”回退。
- 保留一键回退路径：旧产物和开关配置双保险，确保 10 分钟内完成止损。

#### 工程化补充

- 场景前提：React Compiler 升级指挥桥：收益验证、风险分层与一键止损 只有在瓶颈被数据证实时才值得推进；先确认 发布治理 是否真是主耗时来源。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 React Compiler 升级指挥桥：收益验证、风险分层与一键止损 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题回答要覆盖 React 19 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

你在 React 19 的 Action + `useOptimistic` 场景里遇到线上事故：部分用户看到“操作成功”但服务端实际失败，还出现重复提交。你会如何止损并恢复用户信任？

### 答案要点

- 先切断扩散：临时关闭高风险乐观路径，优先恢复“真实写后再展示”的保守策略。
- 快速识别影响范围：按用户、操作类型、时间窗口建立可回放清单。
- 前后端同时补幂等：请求 id、重放保护、状态校验三层防重复提交。
- 回滚策略要可解释：哪些状态自动修正、哪些需要人工确认，要有统一口径。

#### 工程化补充

- 场景前提：React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：围绕 React 19 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：React Compiler 真正上线前，你会先验哪些高风险边界，避免“测得好、线上抖”？

### 答案要点

#### 直答

- 结论：围绕「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：开关粒度要足够细：路由级、组件簇级、用户分群级开关，避免“一刀切”回退。

#### 术语解释

- React Compiler：在「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里，React Compiler 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 发布治理：围绕「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里的 发布治理 推进上线时，要明确每个批次的放量门槛和回退条件。
- 决策沟通：在「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里，决策沟通 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：开关粒度要足够细：路由级、组件簇级、用户分群级开关，避免“一刀切”回退。
- 验收信号：围绕 风险分层 与 一键止损 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## react-compiler-rollout-command-bridge-followup-2

title: 追问：怎么定义 React Compiler 方案真的生效
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通, 追问]
parent: react-compiler-rollout-command-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说 Compiler 升级有收益，那你怎么定义“真的生效”，并持续验证不是偶然波动？

### 答案要点

#### 直答

- 结论：验证 风险分层 与 一键止损 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：开关粒度要足够细：路由级、组件簇级、用户分群级开关，避免“一刀切”回退。

#### 术语解释

- React Compiler：围绕「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里的 React Compiler 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 发布治理：在「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里，发布治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 决策沟通：围绕「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里的 决策沟通 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 风险分层 与 一键止损 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：风险分层 与 一键止损 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## react-compiler-rollout-command-bridge-followup-3

title: 追问：不同业务复杂度下你会如何分层启用 Compiler
difficulty: 资深
tags: [React Compiler, 发布治理, 决策沟通, 追问]
parent: react-compiler-rollout-command-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：业务复杂度差异很大时，你会怎么分层启用 React Compiler，而不是全站一把梭？

### 答案要点

#### 直答

- 结论：先锁定 风险分层 与 一键止损 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：开关粒度要足够细：路由级、组件簇级、用户分群级开关，避免“一刀切”回退。

#### 术语解释

- React Compiler：围绕「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里的 React Compiler 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 发布治理：在「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」这题里，发布治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 决策沟通：围绕「React Compiler 升级指挥桥：收益验证、风险分层与一键止损」里的 决策沟通 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：风险分层 与 一键止损 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 风险分层 与 一键止损 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## react-optimistic-ui-stoploss-playbook-followup-1

title: 追问：乐观更新在什么场景最容易失效
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置, 追问]
parent: react-optimistic-ui-stoploss-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：这套乐观更新方案在真实流量下最容易在哪些场景失效，你会怎么判断？

### 答案要点

#### 直答

- 结论：先把 重复提交 与 回滚沟通 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：回滚策略要可解释：哪些状态自动修正、哪些需要人工确认，要有统一口径。

#### 术语解释

- React 19：在「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」这题里，React 19 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 乐观更新：围绕「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里的 乐观更新 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 事故处置：围绕「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里的 事故处置 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：围绕 重复提交 与 回滚沟通 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里 重复提交 与 回滚沟通 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## react-optimistic-ui-stoploss-playbook-followup-2

title: 追问：你会怎样证明乐观更新止损策略有效
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置, 追问]
parent: react-optimistic-ui-stoploss-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你这套乐观更新止损策略不是纸面方案，你会怎样用测试和线上数据证明它有效？

### 答案要点

#### 直答

- 结论：先约定「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：回滚策略要可解释：哪些状态自动修正、哪些需要人工确认，要有统一口径。

#### 术语解释

- React 19：围绕「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里的 React 19 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 乐观更新：在「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里，乐观更新 是验收对象，必须给可量化指标、日志信号和测试证据。
- 事故处置：在「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里，事故处置 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里，线上数据证明它有效 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：线上数据证明它有效 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## react-optimistic-ui-stoploss-playbook-followup-3

title: 追问：团队规模变化后如何调整乐观更新治理策略
difficulty: 资深
tags: [React 19, 乐观更新, 事故处置, 追问]
parent: react-optimistic-ui-stoploss-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：团队从小团队扩到多团队协作后，你会怎么调整乐观更新策略，避免治理成本失控？

### 答案要点

#### 直答

- 结论：评估 重复提交 与 回滚沟通 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：回滚策略要可解释：哪些状态自动修正、哪些需要人工确认，要有统一口径。

#### 术语解释

- React 19：在「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里，React 19 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 乐观更新：围绕「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里的 乐观更新 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 事故处置：围绕「React 乐观更新止损手册：误成功反馈、重复提交与回滚沟通」里的 事故处置 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 重复提交 与 回滚沟通 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：围绕 重复提交 与 回滚沟通 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。
