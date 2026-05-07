---
id: 22-react
title: React 重点
order: 22
icon: ⚛️
description: Hooks、并发渲染、Suspense、RSC、状态管理与 React 生态核心机制。
---

## react-vs-vue-mental-model
title: React 和 Vue 的心智模型本质差异
difficulty: 进阶
tags: [React, Vue, 框架]

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

### 延伸
- React Compiler（原 React Forget）和 Vue 3.5 的 Vapor Mode 都在向"自动 memo"演进
- 选型不是非此即彼，团队熟悉度、生态、招聘市场比技术细节更重要

## react-hooks-rules
title: Hooks 的核心规则与原理
difficulty: 进阶
tags: [Hooks, 原理]

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

### 延伸
- React 19 的 `use(promise)` 让 hook 能"从条件中读取"，但仅限于 use，并基于 Suspense 协议
- React Compiler 会自动插入 `useMemo / useCallback`，未来手写 memo 的需求会越来越少

## use-effect-pitfalls
title: useEffect 常见陷阱与依赖管理
difficulty: 进阶
tags: [useEffect, 陷阱]

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

### 延伸
- React 官方的「You Might Not Need an Effect」是必读，大量场景其实不需要 effect
- 数据请求建议交给 React Query / SWR / RSC，比手写 effect 稳定得多

## react-reconciler-fiber
title: Fiber 架构与并发渲染
difficulty: 资深
tags: [Fiber, Concurrent]

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

### 延伸
- 并发不是"多线程"，仍然是单线程时间分片，长任务依然会卡，只是 React 给了一种"分批"能力
- 真正的多线程方案是 Web Worker / OffscreenCanvas，React 19 也在探索 React in Worker

## react-server-components
title: React Server Components (RSC) 的本质和价值
difficulty: 资深
tags: [RSC, Next.js]

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
  return (
    <button onClick={() => setOpen((v) => !v)}>{open ? '收起' : '展开评论'}</button>
  );
}
```

### 延伸
- RSC 在大型应用收益更明显（电商详情页、Dashboard），小型站点提升不一定超过复杂度成本
- Vue 阵营对应的探索是 Nuxt 的 island components 与 server components

## state-management-react
title: React 状态管理选型：Context / Redux / Zustand / Jotai / Recoil
difficulty: 进阶
tags: [状态管理, Redux, Zustand]

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

### 延伸
- 状态管理库不解决业务复杂度，只是组织方式；先把"哪些是服务端状态、哪些是客户端状态、哪些是 URL 状态"分清楚
- React 19 的 `useOptimistic / useFormState` 让一部分场景可以不用外部库

## react-suspense-data
title: Suspense 与异步数据加载
difficulty: 资深
tags: [Suspense, 数据加载]

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
  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}

export default function Page() {
  const promise = fetch('/api/posts').then((r) => r.json() as Promise<Post[]>);
  return (
    <Suspense fallback={<Skeleton />}>
      <ErrorBoundary fallback={<p>加载失败，<button>重试</button></p>}>
        <Posts promise={promise} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

### 延伸
- 不要把 promise 创建放在组件里直接 use，每次渲染都会新建 promise；要么 RSC 中创建，要么用支持 cache 的 hook
- React Query 的 suspense mode 能直接让所有 query 走 Suspense + ErrorBoundary

## react-router-data-loaders
title: React Router v6.4+ 的 Data Router 与 loaders
difficulty: 进阶
tags: [Router, 数据加载]

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
        <Await resolve={comments}>
          {(list: Comment[]) => <CommentList items={list} />}
        </Await>
      </Suspense>
    </>
  );
}
```

### 延伸
- Remix 把这套理念发扬光大，App Router 后来也借鉴了
- Vue 阵营对应的是 Nuxt 的 `useAsyncData` / `definePageMeta` 数据钩子

## react-perf
title: React 性能优化清单
difficulty: 进阶
tags: [性能, memo, 虚拟化]

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

### 延伸
- React Compiler 落地后，绝大多数手动 memo 会被自动化，但理解原理仍然必要
- profile production build：`react-dom/profiling`，开发版本性能数据偏离实际

## react-19-features
title: React 19 关键特性速览
difficulty: 资深
tags: [React 19, Actions]

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
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (cur, draft: Comment) => [...cur, draft],
  );

  async function action(formData: FormData) {
    const text = String(formData.get('text') || '');
    addOptimistic({ id: 'temp', author: 'me', text });
    await fetch(`/api/posts/${postId}/comments`, { method: 'POST', body: formData });
  }

  return (
    <>
      <ul>{optimistic.map((c) => <li key={c.id}>{c.text}</li>)}</ul>
      <form action={action}>
        <input name="text" />
        <SubmitBtn />
      </form>
    </>
  );
}
```

### 延伸
- 大部分 19 新特性需要 React + 框架（Next / Remix）配合才能体现完整价值
- React Compiler 与 19 配套使用，大量减少 memo / callback 心智

## react-typescript-patterns
title: React + TypeScript 常用类型模式
difficulty: 进阶
tags: [TypeScript, 泛型]

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

### 延伸
- 复杂泛型出错时优先看"传入的实参是否被推导成 unknown"，加约束 `extends` 通常就好
- `satisfies` 让对象字面量在保持窄类型的同时被验证形状

## react-testing
title: React 组件测试要测什么、怎么测
difficulty: 进阶
tags: [测试, RTL]

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

const server = setupServer(
  http.post('/api/login', () => HttpResponse.json({ ok: true })),
);
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

### 延伸
- 不要追求 100% 行覆盖，要看"关键业务分支覆盖"
- 视觉回归交给 Playwright + 截图比对，单测层不要做像素比较
