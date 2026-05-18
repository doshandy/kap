---
id: 24-fullstack-meta
title: Next.js / Nuxt 全栈
order: 24
icon: 🌟
description: Next.js App Router、Nuxt 3、Server Actions、缓存模型与边缘部署。
---

## next-app-router

title: Next.js App Router 与 Pages Router 的核心差异
followups: [next-app-router-followup-1]
difficulty: 进阶
tags: [Next.js, App Router]

### 一句话

文件路由：app/ 下用 page.tsx / layout.tsx / loading.tsx / error.tsx / route.ts 表达整套路由能力；默认 RSC：app/ 下组件默认服务端运行，需要交互时显式 'use client'。

### 题目

App Router (13+) 相比 Pages Router 改了哪些核心模型？迁移要注意什么？

### 答案要点

- 文件路由：`app/` 下用 `page.tsx / layout.tsx / loading.tsx / error.tsx / route.ts` 表达整套路由能力
- 默认 RSC：`app/` 下组件默认服务端运行，需要交互时显式 `'use client'`
- 数据获取：直接 `await fetch`，自带 dedupe / cache / revalidate / tags
- 嵌套布局：`layout.tsx` 自然嵌套，路由切换时只重渲染变化的子树
- 流式 + Suspense：天然支持 streaming SSR
- API：`route.ts` 取代 `pages/api/*.ts`，支持 Web Request / Response 标准
- 迁移要点：状态管理 / context / 第三方 hooks 都要在 client component；不要把 server-only 库带进 client

### 代码示例

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header>KAP</header>
        <main>{children}</main>
      </body>
    </html>
  );
}

export default async function Page() {
  const posts = await fetch('https://api/posts', {
    next: { revalidate: 60, tags: ['posts'] },
  }).then((r) => r.json());
  return <PostList posts={posts} />;
}

export async function POST(req: Request) {
  const body = await req.json();
  return Response.json({ ok: true, body });
}
```

### 常见误区

- 默认所有组件是 Server Component；想用 hooks 必须 'use client'
- 服务端获取数据用 `await fetch(url, { cache: 'force-cache' })`，但**修改后没 revalidate** 会一直拿旧数据
- middleware 跑在 edge runtime，部分 Node API 不可用

### 追问

- App Router 的四层缓存（fetch / data / route / router）
- Server Action 和 Route Handler 区别
- streaming SSR 是怎么工作的（loading.tsx）

### 延伸

- 不同路由可以混用：稳定模块上 App Router，复杂遗留页留在 Pages Router 渐进迁移
- App Router 的缓存模型有 4 层（Request Memoization / Data Cache / Full Route Cache / Router Cache），出问题先排查这条线

## next-server-actions

title: Server Actions 是什么？什么时候该用
followups: [next-server-actions-followup-1]
difficulty: 进阶
tags: [Server Actions, 表单]

### 一句话

写法：函数顶部 'use server'，前端 import 后就能 await 调用，不需要写 fetch / 路由；使用场景：表单提交、CRUD、startTransition 包裹的乐观更新。

### 题目

Server Actions 让前端可以"直接调用服务端函数"，相比 API Route 有什么优势和限制？

### 答案要点

- 写法：函数顶部 `'use server'`，前端 import 后就能 await 调用，不需要写 fetch / 路由
- 使用场景：表单提交、CRUD、`startTransition` 包裹的乐观更新
- 优势：类型自动打通、自动 revalidate（`revalidatePath / revalidateTag`）、自动序列化
- 限制：参数和返回值必须可序列化；要做鉴权 / 校验 / 日志（不能假定调用方安全）
- 安全：Action 是公网入口，等同 POST，要做 CSRF / 权限校验，不要相信来自客户端的 user id
- 不适合：需要细粒度 HTTP 控制（自定义 status / header）、第三方调用、流式接口

### 代码示例

```tsx
'use server';
import { revalidateTag } from 'next/cache';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({ title: z.string().min(1).max(100) });

export async function createPost(formData: FormData) {
  const user = await auth();
  if (!user) throw new Error('unauthorized');
  const parsed = Schema.parse(Object.fromEntries(formData));
  const post = await db.post.create({ data: { ...parsed, authorId: user.id } });
  revalidateTag('posts');
  return post;
}
```

```tsx
'use client';
import { createPost } from './actions';
import { useFormStatus } from 'react-dom';

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? '提交中…' : '发布'}</button>;
}

export function NewPostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <Submit />
    </form>
  );
}
```

### 追问

- 「Server Actions 是什么？什么时候该用」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Server Actions 是什么？什么时候该用」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Server Actions、表单，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Action 同步抛错走 `error.tsx`；想要可控错误请返回 `{ ok: false, error }`
- 调试时打开 Next 的"server actions log"或在 action 里加 console，查看实际请求体

## next-cache-layers

title: Next App Router 的四层缓存模型
followups: [next-cache-layers-followup-1]
difficulty: 资深
tags: [缓存, Next.js]

### 一句话

Request Memoization：单次渲染内同 URL 的 fetch 被自动去重（仅当请求层）；Data Cache：跨请求的服务端数据缓存，由 revalidate / tags 控制。

### 题目

fetch 看似简单，实际经过哪几层缓存？怎么排查"数据没更新"的问题？

### 答案要点

- Request Memoization：单次渲染内同 URL 的 fetch 被自动去重（仅当请求层）
- Data Cache：跨请求的服务端数据缓存，由 `revalidate` / `tags` 控制
- Full Route Cache：构建期 / 首次请求后渲染好的整页 HTML + RSC payload
- Router Cache：客户端 Router 内存里缓存最近访问过的 RSC payload，前进后退立即返回
- 排查："改了数据没更新"通常是 Data Cache 命中：检查 fetch 选项 / `revalidatePath / revalidateTag`，或换 `cache: 'no-store'` 临时验证

### 代码示例

```ts
const dynamic = await fetch(url, { cache: 'no-store' });
const ttl = await fetch(url, { next: { revalidate: 60 } });
const tagged = await fetch(url, { next: { tags: ['posts'] } });

import { revalidateTag, revalidatePath } from 'next/cache';
revalidateTag('posts');
revalidatePath('/posts/[id]', 'page');
```

### 追问

- 你会先看哪些指标来判断「Next App Router 的四层缓存模型」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Next App Router 的四层缓存模型」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 缓存、Next.js，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- App Router 还有 `force-dynamic / force-static / revalidate` 等路由级开关，能粗粒度控制整页缓存
- 大厂常见做法：默认 `revalidate: 60`，关键写操作主动 `revalidateTag`，敏感页 `force-dynamic`

## nuxt3-overview

title: Nuxt 3 的核心特性与目录约定
followups: [nuxt3-overview-followup-1]
difficulty: 进阶
tags: [Nuxt, Vue]

### 一句话

文件路由：pages/，自动生成路由表；嵌套用文件夹 / 动态路径 [id].vue；自动导入：composables/、utils/、components/ 内导出无需手动 import；数据获取：useFetch / useAsyncData。

### 题目

Nuxt 3 提供哪些开箱能力？目录约定怎么用？

### 答案要点

- 文件路由：`pages/`，自动生成路由表；嵌套用文件夹 / 动态路径 `[id].vue`
- 自动导入：`composables/`、`utils/`、`components/` 内导出无需手动 import
- 数据获取：`useFetch / useAsyncData`，SSR / SPA 一致 API，自动序列化 hydration
- 服务端：`server/api/`、`server/middleware/`，基于 Nitro，部署到 Node / Edge / Workers
- 模块系统：`@nuxt/image`、`@nuxtjs/i18n`、`@pinia/nuxt` 等做开箱即用
- 渲染模式：`ssr: true` 默认 SSR；可按页面切换 `routeRules` 做 ISR / SPA / SSG / Edge

### 代码示例

```vue
<script setup lang="ts">
const route = useRoute();
const { data, error, refresh } = await useFetch(`/api/posts/${route.params.id}`, {
  key: `post-${route.params.id}`,
});
</script>

<template>
  <article v-if="data">
    <h1>{{ data.title }}</h1>
    <p>{{ data.content }}</p>
  </article>
  <p v-else-if="error">加载失败</p>
</template>
```

```ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  return await db.post.findUnique({ where: { id } });
});
```

### 追问

- 在 Vue 项目里落地「Nuxt 3 的核心特性与目录约定」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Nuxt 3 的核心特性与目录约定」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 Nuxt、Vue，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `definePageMeta({ layout: 'admin', middleware: ['auth'] })` 把页面元数据集中声明
- Nuxt 4（已发布）调整了部分目录默认值，迁移要看官方 codemod

## edge-runtime

title: Edge Runtime 与 Node Runtime 的差异
followups: [edge-runtime-followup-1]
difficulty: 资深
tags: [Edge, Cloudflare, Vercel]

### 一句话

优势：低 cold start、离用户近、按请求计费、全球分布；API 限制：基于 V8 isolate 而非 Node，没有 fs / net / child_process，npm 包要"Edge-compatible"。

### 题目

Next / Nuxt 都支持把页面 / API 部署到 Edge Runtime（Cloudflare Workers / Vercel Edge），它和 Node 的差别是什么？

### 答案要点

- 优势：低 cold start、离用户近、按请求计费、全球分布
- API 限制：基于 V8 isolate 而非 Node，没有 fs / net / child_process，npm 包要"Edge-compatible"
- 内存 / CPU 时长有上限（如 Cloudflare Workers ~50ms 免费版，Vercel Edge ~30s）
- 生态：常用 Web 标准（fetch / Request / Response / WebCrypto）能用，Node 特有（Buffer 等）要 polyfill
- 数据：连数据库通常走 HTTP / Workers KV / D1 / Turso，传统长连接驱动不可用
- 适合：鉴权、A/B、个性化、轻 SSR、CDN 改写；不适合：CPU 密集、大文件处理

### 代码示例

```ts
export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = req.headers.get('cf-ipcountry') || 'CN';
  const res = await fetch(`https://api.example.com/promo?country=${country}`, {
    cf: { cacheTtl: 60 },
  } as RequestInit);
  return new Response(res.body, {
    headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
```

### 追问

- 「Edge Runtime 与 Node Runtime 的差异」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Edge Runtime 与 Node Runtime 的差异」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Edge、Cloudflare、Vercel，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 新框架（Hono、astro DB、Drizzle）都在做 Edge 友好的方案，Edge 已经是主流选项之一
- 生产部署前先把日志 / 监控 / 错误上报和现有体系打通，否则线上排查会很痛苦

## seo-and-meta

title: 现代框架做 SEO 的关键点
followups: [seo-and-meta-followup-1]
difficulty: 进阶
tags: [SEO, meta]

### 一句话

渲染：内容必须出现在首屏 HTML 里，避免 CSR 后才填充；meta：每页独立 <title> / <meta description> / og: / twitter:，App Router 用 generateMetadata。

### 题目

做面向 C 端的内容站，SEO 上 Next / Nuxt 有哪些必须做对的事？

### 答案要点

- 渲染：内容必须出现在首屏 HTML 里，避免 CSR 后才填充
- meta：每页独立 `<title> / <meta description> / og:* / twitter:*`，App Router 用 `generateMetadata`
- 结构化数据：JSON-LD（`Article / Product / FAQ / Breadcrumb`）放进 head，Google 富媒体卡片
- 性能：LCP / INP / CLS 是排名因子；图片用 `next/image` / `nuxt-img` 自动优化、占位
- 站点地图 / robots：自动生成 sitemap.xml、robots.txt，新内容主动 ping 搜索引擎
- 国际化：hreflang、可索引语言路径、避免重复内容
- 监控：Search Console + Web Vitals，可量化跟踪 SEO 收益

### 代码示例

```tsx
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: `${post.title} - KAP`,
    description: post.summary,
    openGraph: { images: [post.cover] },
    alternates: { canonical: `https://kap.dev/posts/${post.slug}` },
  };
}

export default function Page({ post }: { post: Post }) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <article>{post.content}</article>
    </>
  );
}
```

### 追问

- 「现代框架做 SEO 的关键点」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「现代框架做 SEO 的关键点」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SEO、meta，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 别把"SEO 友好的渲染"和"必须 SSR"画等号，结构化的 SSG / ISR 通常已经够了
- 真正排名靠前的还是内容质量和外链，技术只是基础线

## ssr-csr-ssg-isr

title: SSR / CSR / SSG / ISR 怎么选
followups: [ssr-csr-ssg-isr-followup-1]
links: [23-framework-compare/rendering-strategy]
difficulty: 进阶
tags: [SSR, SSG, ISR]

### 一句话

内容稳定（博客 / 文档）→ SSG 预渲染；高度动态（仪表盘）→ CSR；要 SEO 又有动态数据 → SSR；想要 SSG 的速度 + 动态更新 → ISR（按需重新生成）。

### 题目

请对比 SSR / CSR / SSG / ISR 在性能、SEO、运维成本和适用场景上的差异。

### 答案要点

- **CSR（Client-Side Rendering）**
  - HTML 是空壳，JS 跑起来再填内容
  - 优点：开发简单、SPA 体验好
  - 缺点：首屏慢、SEO 差（除非 prerender）
- **SSR（Server-Side Rendering）**
  - 每次请求服务端渲染 HTML 直出
  - 优点：首屏快、SEO 好、可拿到登录态做个性化
  - 缺点：服务器压力大、需要 hydration（注水）回到客户端组件
- **SSG（Static Site Generation）**
  - 构建期生成全部 HTML，CDN 直接吐
  - 优点：极快、几乎零运维
  - 缺点：内容更新需要重新构建，不适合频繁变化
- **ISR（Incremental Static Regeneration，Next.js 概念）**
  - 首次请求是 SSG，过 N 秒/手动触发再后台重新生成
  - 兼顾静态性能与动态更新
- **RSC（React Server Components）**
  - 进一步把"组件级别"的渲染拆到服务端，组件自身可读数据库
  - Next.js 14+ 默认行为
- **选型指南**
  - 营销页 / 文档 / 博客 → SSG / ISR（Astro / Next / Nuxt content）
  - 后台管理 → CSR
  - 电商 / 内容站 → SSR + ISR + RSC
  - 强动态（chat / dashboard）→ CSR + 流式数据

### 代码示例

```ts
// app/blog/[slug]/page.tsx (Next.js App Router)
export const revalidate = 60;
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}
export default async function Post({ params }) {
  const post = await getPost(params.slug);
  return <Article data={post} />;
}
```

### 追问

- 「SSR / CSR / SSG / ISR 怎么选」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「SSR / CSR / SSG / ISR 怎么选」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SSR、SSG、ISR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Next.js 已经把这几种模型统一到 App Router + Server Components
- Nuxt 3 用 Nitro 引擎在多个目标（Node / Edge / Cloudflare）部署
- Edge Runtime（Cloudflare Workers / Vercel Edge）让 SSR 接近 CDN 速度

## next-data-fetching-patterns

title: Next App Router 下数据获取的 4 种姿势
followups: [next-data-fetching-patterns-followup-1]
links: [22-react/react-server-components]
difficulty: 资深
tags: [Next, RSC, 数据获取, 高频]

### 一句话

**Server Component 直接 await fetch**（首选，自动缓存 + 类型安全）；**Server Action** 处理写入；**Route Handler** (route.ts) 暴露 REST；**Client Component**（"use client"）配合 SWR/TanStack Query 处理交互密集场景。

### 题目

Next 13+ App Router 下数据怎么取？SSR / RSC / Server Actions / Route Handler 各自定位是？

### 答案要点

- **Server Component 直 fetch（90% 场景首选）**
  - 直接 `const data = await fetch(...)`，无需 props 透传
  - Next 自动缓存 + 去重；`fetch(url, { next: { revalidate: 60 } })` 控 ISR
  - 不打包到客户端 bundle，零 JS 开销
  - 限制：不能用 hooks / 浏览器 API / 事件
- **Client Component（'use client'）**
  - 适合：表单交互、动画、本地状态
  - 数据获取走 SWR / TanStack Query / fetch on mount
  - 注意 hydration：服务端和客户端首次渲染要一致
- **Server Action（写入操作首选）**
  - `'use server'` 标记的 async 函数
  - 表单 action / 按钮调用都行
  - 自动 RPC 化，不需要写 API endpoint
  - 写入后用 `revalidatePath` / `revalidateTag` 重刷缓存
- **Route Handler（route.ts）**
  - 暴露 REST API（给第三方 / 移动端 / webhook 用）
  - 文件式路由：`app/api/foo/route.ts` → GET/POST/...
  - 也可以从 Client / Server Component 调
- **缓存四层**
  - Request 去重（同请求多次 fetch 自动合并）
  - Data Cache（持久化，跨请求共享）
  - Full Route Cache（静态化整页）
  - Router Cache（客户端 bfcache 行为）
- **常见决策**
  - 列表 / 详情页 → RSC + revalidate
  - 提交表单 → Server Action
  - 频繁交互（拖拽 / 实时） → Client Component + WebSocket / TanStack Query
  - 给外部用 → Route Handler

### 代码示例

```ts
export default async function Page({ params }: { params: { id: string } }) {
  const post = await fetch(`https://api.example.com/posts/${params.id}`, {
    next: { revalidate: 60, tags: [`post:${params.id}`] },
  }).then((r) => r.json());

  return <Article post={post} />;
}

'use server';
import { revalidateTag } from 'next/cache';

export async function likePost(postId: string) {
  await db.like.create({ data: { postId } });
  revalidateTag(`post:${postId}`);
}

import { likePost } from './actions';

export default function LikeButton({ postId }: { postId: string }) {
  return <form action={likePost.bind(null, postId)}><button>Like</button></form>;
}

export async function GET(req: Request) {
  const data = await loadAll();
  return Response.json(data, { headers: { 'Cache-Control': 's-maxage=60' } });
}
```

### 追问

- 在 React 项目里应用「Next App Router 下数据获取的 4 种姿势」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「Next App Router 下数据获取的 4 种姿势」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 混淆客户端状态、服务端缓存和 URL 状态，导致数据源重复、失效策略不一致。
- 相关标签是 Next、RSC、数据获取，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Pages Router（getServerSideProps / getStaticProps）仍受支持，老项目慢慢迁
- "use cache"（Next 15）：函数级缓存装饰器
- Partial Prerendering（PPR）：静态外壳 + 动态填充

## remix-react-router-loaders

title: Remix / React Router v6.4+ 的 loader / action 模型
followups: [remix-react-router-loaders-followup-1]
difficulty: 进阶
tags: [Remix, React Router, 数据获取]

### 一句话

路由级声明式数据：每条路由配 `loader`（读）+ `action`（写）→ 框架在导航前并行调用 → 数据通过 `useLoaderData` 拿到 → 表单走原生 `<Form>` 提交到 action。理念是**回归 web 标准**。

### 题目

Remix 的核心理念是什么？为什么大家说它把"web 基础"做对了？

### 答案要点

- **核心模型**
  - 路由 = UI + loader + action，三件套绑定
  - 切路由前并行跑所有 loader（race conditions 框架处理）
  - `<Form method="post">` 自动提交到 action，刷新页面也工作
  - 进度状态、错误边界都是路由级的
- **为什么"web 标准"**
  - JS 没加载完用户也能用（表单原生提交）
  - 只在交互时才跑 JS（progressive enhancement）
  - 处理 redirect / cookie / cache 都按 HTTP 标准
- **数据流**
  - GET 走 loader：URL 决定数据
  - POST 走 action：action 完成后自动 revalidate 当前路由的 loaders
  - 错误：loader 抛 → 最近的 errorElement 捕获
- **性能**
  - 每条路由独立 chunk（懒加载）
  - 并行 fetch 所有 loader（不像传统 SSR 串行嵌套）
  - prefetch on hover：Link `prefetch="intent"` 鼠标 hover 即拉数据
- **Server vs Client**
  - 默认 SSR；想 SSG 自己 build-time render
  - loader / action 只在 server 跑（不打到 client）
- **vs Next App Router**
  - Next：RSC + Server Actions，组件树级
  - Remix：路由级 loader/action，模型更小更纯
  - Remix v2 → React Router v7（同一团队，已合并）

### 代码示例

```tsx
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData,
  Form,
  redirect,
} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/posts/:id',
    loader: async ({ params }) => {
      const res = await fetch(`/api/posts/${params.id}`);
      if (!res.ok) throw new Response('Not Found', { status: 404 });
      return res.json();
    },
    action: async ({ request, params }) => {
      const fd = await request.formData();
      await fetch(`/api/posts/${params.id}/like`, { method: 'POST' });
      return redirect(`/posts/${params.id}`);
    },
    Component: PostPage,
    errorElement: <PostError />,
  },
]);

function PostPage() {
  const post = useLoaderData() as Post;
  return (
    <article>
      <h1>{post.title}</h1>
      <Form method="post">
        <button type="submit">Like</button>
      </Form>
    </article>
  );
}
```

### 追问

- 在 React 项目里应用「Remix / React Router v6.4+ 的 loader / action 模型」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「Remix / React Router v6.4+ 的 loader / action 模型」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 混淆客户端状态、服务端缓存和 URL 状态，导致数据源重复、失效策略不一致。
- 相关标签是 Remix、React Router、数据获取，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React Router v7（集大成）：兼容老 SPA + Remix 新模式，平滑迁移
- 与 TanStack Router 对比：后者类型安全更极致，但社区相对小

## fullstack-auth-strategy

title: SSR 应用的鉴权怎么设计？
followups: [fullstack-auth-strategy-followup-1]
links: [13-security/auth-token-jwt]
difficulty: 资深
tags: [鉴权, Next, 全栈, 高频]

### 一句话

**HttpOnly Cookie + Session ID** 是 SSR 首选（服务端可直接读，CSRF 用 SameSite=Lax + token 双保险）；分布式部署用 Redis 存 session；JWT 适合无状态/跨域 API，但配 refresh token 解决吊销问题。

### 题目

做一个 Next.js 全栈应用，登录 / 鉴权 / 权限控制怎么设计才安全又好用？

### 答案要点

- **登录流程**
  - 用户提交账密 / 手机号 → 服务端验证 → 设置 HttpOnly Cookie
  - Cookie 配置：`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...`
  - 不在 JS 里存 token（XSS 偷不到）
- **存储模型选择**
  - **Session ID + Redis**（首选）：服务端有 state，吊销直接删 redis key；用户多设备登录便于管理
  - **JWT 自包含**：服务端无状态可水平扩；但吊销难，得配 blacklist / 短 expire
  - **JWT + Refresh Token**：access 短期（15min）+ refresh 长期（7d，HttpOnly Cookie）；access 过期用 refresh 换；refresh 在 Redis 黑白名单
- **SSR 取用户**
  - Server Component：`const session = await getSession(cookies())`
  - 中间件 `middleware.ts`：所有请求前 check 后注入到 request
  - 不要 client 才知道登录态，避免 hydration 闪烁
- **CSRF 防护**
  - SameSite=Lax 阻挡大部分跨站请求（默认）
  - 关键操作（转账 / 改密）加 CSRF token：表单藏 hidden input + 服务端校验
  - 或者 Origin / Referer 校验
- **OAuth / SSO**
  - 用 NextAuth.js / Auth.js / Lucia（成熟 + 维护活跃）
  - OAuth 流程：authorize → callback → 拿 access_token + 用户信息 → 自己 set session cookie
- **权限层**
  - RBAC（角色）/ ABAC（属性）按业务复杂度选
  - 每个 server action / route handler 顶部检查
  - 敏感操作再做二次校验（密码 / 短信）
- **会话安全**
  - 登录改密后吊销其他 session
  - 异地登录提醒 / 设备列表
  - 长时间空闲自动登出
- **避免**
  - 不用 localStorage 存 token（XSS 直接拿走）
  - 不在 URL 带 token（日志 / Referer 泄露）
  - 不自己写密码 hash，用 argon2 / bcrypt

### 代码示例

```ts
import { cookies } from 'next/headers';

export async function login(email: string, password: string) {
  const user = await db.user.verify(email, password);
  const sessionId = crypto.randomUUID();
  await redis.set(`session:${sessionId}`, JSON.stringify({ userId: user.id }), 'EX', 86400);

  cookies().set('sid', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
  });
}

export async function getSession() {
  const sid = cookies().get('sid')?.value;
  if (!sid) return null;
  const raw = await redis.get(`session:${sid}`);
  return raw ? JSON.parse(raw) : null;
}

import { NextResponse } from 'next/server';
export async function middleware(req: NextRequest) {
  const sid = req.cookies.get('sid')?.value;
  if (!sid && req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
```

### 追问

- 推动「SSR 应用的鉴权怎么设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「SSR 应用的鉴权怎么设计？」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 鉴权、Next、全栈，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Passkeys / WebAuthn：无密码登录，未来趋势
- mTLS / Cloudflare Access：企业内网零信任
- 性能：session 校验放 edge middleware，命中即放行

## hydration-mismatch-debug

title: Hydration mismatch 怎么排查 / 修复
followups: [hydration-mismatch-debug-followup-1]
links: [23-framework-compare/hydration-vs-resumability]
difficulty: 资深
tags: [SSR, Hydration, React, 高频]

### 一句话

本质是"server 渲染的 HTML"与"client 首次渲染的 React/Vue 树"不一致：常见因 `Date.now()`、`Math.random()`、`window/localStorage`、用户语言/时区差异、第三方扩展改 DOM。修法：把不一致的部分用 `useEffect`/客户端 only 包起来或者 SSR 注入确定值，再客户端读取。

### 题目

React/Next 控制台报 `Hydration failed because the initial UI does not match what was rendered on the server`。常见根因和定位流程是？

### 答案要点

- **根因清单（按出现频率）**
  - 时间相关：`new Date()` / `Date.now()` / 相对时间（"3 分钟前"）服务端和客户端时刻不同
  - 随机相关：`Math.random()`、`crypto.randomUUID()` 在 server 和 client 各跑一次得不同值
  - 浏览器 API：`window`/`document`/`localStorage`/`navigator`，server 上 undefined → 用 `typeof window !== 'undefined'` 守卫但要注意此时 server 渲染的是 fallback，client 初次也得渲染 fallback
  - **用户偏好**：浏览器扩展（Grammarly、暗黑模式插件）会修改 DOM；这种 mismatch 没法根治，可在最外层加 `suppressHydrationWarning`
  - **国际化 / 时区**：服务端 UTC 渲染，客户端按本地时区显示
  - **数据时效性**：SSR 拉数据后 cache 太旧，client 立刻又拉了一次
  - **HTML 结构非法**：`<p>` 嵌 `<div>`、`<table>` 缺 `<tbody>`，浏览器自动修复 → server vs client DOM 不同
- **定位流程**
  - React 19 / Next 14 错误信息已经能直接指出 mismatch 的标签
  - 老版本：浏览器 DevTools → React DevTools → 查看具体组件
  - 用 `process.env.NODE_ENV === 'development'` 时的详细 diff
- **修复模式**
  - **Client-only 组件**
    ```tsx
    'use client';
    import dynamic from 'next/dynamic';
    const Time = dynamic(() => import('./Time'), { ssr: false });
    ```
  - **延迟渲染到 effect**
    ```tsx
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    ```
  - **服务端注入确定值**：把 `new Date().toISOString()` 在 server 决定，client 直接用这个值
  - **suppressHydrationWarning**：兜底使用，仅作用于自身节点
- **Vue (Nuxt) 同类问题**
  - 出现 `<ClientOnly>` 组件包裹
  - `useState` 在 SSR 与客户端共享同一个 key 的初值
  - hydration 警告：`Hydration node mismatch / text content mismatch`
- **避免"看似无害"的实践**
  - SSR 中调 `Math.random()` 设置 key
  - 直接 `<script>document.body.classList.add('dark')</script>` 注入主题——客户端拿到的 HTML 已是 dark，但 React 渲染的初始状态是 light
  - 用第三方 hook 内部读 window，开发时本地都正常，部署上线 SSR 才报错

### 代码示例

```tsx
'use client';
import { useEffect, useState } from 'react';

export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    return <time dateTime={iso}>{new Date(iso).toLocaleDateString('en-US')}</time>;
  }
  return <time dateTime={iso}>{format(now - new Date(iso).getTime())}</time>;
}

<html lang="zh-CN" suppressHydrationWarning>
  <body>{children}</body>
</html>;
```

### 追问

- 在 React 项目里应用「Hydration mismatch 怎么排查 / 修复」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「Hydration mismatch 怎么排查 / 修复」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 混淆客户端状态、服务端缓存和 URL 状态，导致数据源重复、失效策略不一致。
- 相关标签是 SSR、Hydration、React，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 第三方注入（暗黑模式）的标准做法：在 `<head>` 顶部塞同步 inline script 读 localStorage 加 class，server 渲染就带上这个类，client 自然一致
- partial hydration / RSC：减少 hydration 工作量，但不改变 mismatch 本质

## ssr-data-fetching-consistency

title: SSR 数据如何无缝传递到 Client，避免重复请求
followups: [ssr-data-fetching-consistency-followup-1]
difficulty: 资深
tags: [SSR, 数据获取, 高频]

### 一句话

通用模式：server 拉数据 → 渲染 HTML 时序列化数据到 `<script id="__DATA__" type="application/json">` → client 启动时把数据回填到 store / TanStack Query cache → 后续渲染直接命中缓存，不再发请求。

### 题目

SSR 拉了数据渲染 HTML，client hydration 后又请求了一次同样接口。怎么把数据"无缝过户"？

### 答案要点

- **传统方案：注入 `__INITIAL_STATE__`**
  - 服务端把 `{ users, products }` 渲染进 HTML：`<script>window.__INITIAL_STATE__ = {...}</script>`
  - 客户端 store 初始化时优先读这个对象，缺失才发请求
  - 注意 XSS：序列化要转义 `<` / `>` / `'` 等
- **TanStack Query / SWR 方案**
  - 服务端 `prefetchQuery` → `dehydrate(queryClient)` → 注入序列化数据
  - 客户端 `<HydrationBoundary state={dehydratedState}>` → cache 命中，不再请求
- **Next App Router (RSC)**
  - Server Component 直接 await fetch，渲染时数据已"在 HTML 里"
  - 不需要序列化逻辑：RSC 把组件树本身序列化成 RSC payload 给客户端
  - 客户端组件需要数据时通过 props 传入或单独 useQuery
- **Nuxt 3**
  - `useFetch` / `useAsyncData` 自动处理：服务端拉到的数据通过 payload 传到 client
  - `nuxtApp.payload.data` 内部存
- **关键陷阱**
  - **数据时效**：server 拉的数据 client 启动那一刻已经过期 → 设置合理 staleTime；关键场景客户端立即 revalidate
  - **认证态**：server 用 cookie 拿到的数据可能含敏感信息；序列化前过滤
  - **大 payload**：注入太多数据 HTML 体积爆炸 → 拆按需 chunk / 只 prefetch 关键数据
  - **循环引用**：JSON.stringify 会失败，用 superjson / devalue 处理 Date / Map / Set / undefined
- **去重**
  - 同一请求 server + client 各发一次：用全局 dedupe（一个 sessionId 内同 URL 同参数走缓存）
  - request 级别去重 vs 用户级别去重（多 tab）
- **错误处理**
  - server 拉失败：要让 client 知道，不能闷头不显示（会出现"server fail → client 重新拉成功"的闪烁）
  - 失败兜底：渲染骨架屏 + client useEffect retry

### 代码示例

```tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function Page({ params }: { params: { id: string } }) {
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: ['post', params.id],
    queryFn: () => fetch(`/api/posts/${params.id}`).then((r) => r.json()),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <PostDetail id={params.id} />
    </HydrationBoundary>
  );
}

('use client');
import { useQuery } from '@tanstack/react-query';

export function PostDetail({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetch(`/api/posts/${id}`).then((r) => r.json()),
    staleTime: 60_000,
  });
  return <article>{data?.title}</article>;
}
```

```html
<script id="__INITIAL__" type="application/json">
  { "user": { "id": "1", "name": "Tom" } }
</script>
<script>
  (function () {
    var raw = document.getElementById('__INITIAL__').textContent;
    window.__INITIAL__ = JSON.parse(raw);
  })();
</script>
```

### 追问

- 「SSR 数据如何无缝传递到 Client，避免重复请求」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「SSR 数据如何无缝传递到 Client，避免重复请求」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SSR、数据获取、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- devalue 比 JSON.stringify 强：能序列化 Date / Map / Set / undefined / 循环引用
- React Server Components 的 payload 是行级 JSON 流，比传统 `__INITIAL_STATE__` 更高效
- 大型应用按需 lazy hydration，避免一次性反序列化几百 KB 数据

## ssr-csr-spa-mpa-basic

title: SSR / CSR / SPA / MPA / SSG / ISR 这堆词到底是什么关系？
followups: [ssr-csr-spa-mpa-basic-followup-1]
difficulty: 基础
tags: [SSR, CSR, SSG, ISR, 基础]

### 一句话

按"在哪渲染"分：CSR（浏览器）/ SSR（服务器）；按"页面有多少"分：SPA（一个 HTML）/ MPA（多个 HTML）；按"何时渲染"分：SSG（构建时）/ ISR（构建 + 失效后再生）。

### 题目

请用一句话区分 CSR、SSR、SSG、ISR、SPA、MPA，并各举一个适用场景。

### 答案要点

- **CSR**（Client-Side Rendering）：HTML 是空壳，JS 拉数据再渲染。适合后台系统、富交互应用
- **SSR**（Server-Side Rendering）：服务器拼好 HTML 直接吐给浏览器；适合 SEO 敏感、首屏快需求
- **SSG**（Static Site Generation）：构建时就把 HTML 全生成好；适合博客、文档、营销页
- **ISR**（Incremental Static Regeneration）：SSG + "过期后服务端按需再生"；适合电商列表页、新闻
- **SPA**：一个 HTML，路由切换靠 JS。适合 webapp
- **MPA**：每个路由是独立 HTML，传统模式。适合内容站

### 代码示例

```tsx
// Next.js App Router 例子：路由四种行为
// app/marketing/page.tsx → 默认 SSG（构建时生成）
// app/dashboard/page.tsx + 'use client' → 客户端渲染（CSR）
// app/news/[id]/page.tsx + revalidate=60 → ISR
// app/realtime/page.tsx + dynamic='force-dynamic' → 每次请求 SSR

export const revalidate = 60;
export default async function Page() {
  const res = await fetch('https://api.example.com/news', {
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return <NewsList data={data} />;
}
```

### 常见误区

- 把 SSR = SEO 唯一解：现代搜索引擎能跑 JS，SPA + 预渲染也行
- 以为 SSG 就是"完全静态"——它仍然可以在 client 上加交互（hydration）
- ISR 不是 SSR：ISR 是"提前缓存 + 失效后再生"，访问时多数还是返回缓存

### 追问

- React Server Components 是 SSR 吗？（不是，是另一层）
- SSR 的成本（服务器算力 + 复杂度）什么时候不值
- 边缘渲染（Edge SSR）和传统 Node SSR 的差别

### 延伸

- "Streaming SSR"（边渲染边吐 HTML）+ Suspense 在 React 18 后流行
- Astro 的 Islands 模式：默认 SSG，按需 hydration

## multi-region-deploy

title: 全栈应用的多区域部署：边缘网关 / CDN / 流量切换 / 灾备 怎么做？
followups: [multi-region-deploy-followup-1, multi-region-deploy-followup-2, multi-region-deploy-followup-3]
difficulty: 资深
tags: [架构, 多区域, 灾备, 海外, 高频]

### 一句话

**用户接入就近（GeoDNS / Anycast）+ 计算分散（多 region 集群）+ 数据按法律边界落地 + 流量切换基于健康检查 + 跨 region 灾备**——五件事配齐才叫真正的多区域部署。

### 题目

你们的全栈应用部署到中国 + 东南亚 + 欧洲 + 美东 4 个区域，怎么设计接入、计算、数据、灾备？流量切换怎么做？

### 答案要点

- **接入层**：
  - **DNS 选址**：GeoDNS（按用户 IP 返回最近 region 的 IP）/ Anycast（同一 IP 全球广播，BGP 路由就近）
  - **TLS 终止**：边缘 CDN（Cloudflare / Akamai / Fastly）做 TLS、缓存静态资源、WAF 防护
  - **边缘计算**：Cloudflare Workers / AWS Lambda@Edge / Vercel Edge 跑轻量逻辑（鉴权 / AB 实验 / 重定向）
- **计算层**：
  - 每个 region 独立的 K8s 集群 / ECS / Lambda
  - 服务间通信走 region 内 VPC，跨 region 走专线（不公网）
  - 配置中心 / 服务发现按 region 部署，避免单点
- **数据层（最复杂）**：
  - 用户数据按法律边界落地：欧盟 EU / 中国 CN / 海外其他可合并
  - **跨 region 同步策略**：
    - 强一致（如全球唯一订单号）→ 中心化主库 + 多活复制（Aurora Global / TiDB / Spanner）
    - 最终一致（用户偏好 / 内容缓存）→ Kafka / DTS 异步同步
  - **跨 region 读写**：写入本 region master，读优先本 region slave；跨 region 读延迟 100-300ms
- **流量切换 / 灾备**：
  - 健康检查：每 region 独立监控 + 全局监控；失败 N 次 → DNS 摘掉这个 region
  - **金丝雀发布**：新版本先在 1 个 region 灰度，OK 了再推全球
  - **跨 region 故障转移（failover）**：region A 挂了，DNS 自动切到 region B；前提是 B 有冷 / 温备份能扛住
  - **演练**：定期"杀掉一个 region"做 chaos engineering 验证
- **前端配合**：
  - 同一份 bundle 全球可用（避免按 region 编译多份）
  - API base URL 由运行时（边缘 worker / 域名）决定，不写死
  - 错误监控按 region 分维度，能看出"是不是某 region 单点问题"

### 代码示例

```ts
const dnsConfig = {
  'api.example.com': {
    type: 'GeoDNS',
    rules: [
      { region: 'cn', record: '203.0.113.10' },
      { region: 'sea', record: '203.0.113.20' },
      { region: 'eu', record: '203.0.113.30' },
      { region: 'us', record: '203.0.113.40' },
      { region: '*', record: '203.0.113.20' },
    ],
    healthCheck: '/healthz',
  },
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const country = req.cf?.country ?? 'US';
    const region = mapToRegion(country);
    const upstream = `https://${region}.api.example.com${new URL(req.url).pathname}`;

    if (req.method === 'GET' && isCacheable(req)) {
      const cached = await caches.default.match(req);
      if (cached) return cached;
    }

    const resp = await fetch(upstream, { cf: { cacheTtl: 60 } });
    return resp;
  },
};

async function failoverFetch(url: string, regions: string[]): Promise<Response> {
  for (const r of regions) {
    try {
      const resp = await fetch(url.replace('{region}', r), { signal: AbortSignal.timeout(2000) });
      if (resp.ok) return resp;
    } catch {
      continue;
    }
  }
  throw new Error('All regions failed');
}
```

### 常见误区

- 只在一个 region 部，加几个 CDN 节点就叫"全球部署" —— 动态请求还是绕半个地球
- 跨 region 同步走公网 + 没加密 —— 中间人攻击 + 合规问题
- 流量切换全靠手工改 DNS —— 故障 1 小时才发现
- 没做 region 隔离演练 —— 真出事了切换工具突然不灵
- 前端 bundle 内嵌 API URL —— 切 region 要重打包发版

### 追问

- 全球唯一 ID 怎么生成（Snowflake / UUID / TSID）
- 海外 region 用 AWS 还是 Cloudflare R2 + Workers 哪个更适合 SaaS
- 数据出境合规的具体动作（SCC / 安全评估 / 个人同意）

### 延伸

- Cloudflare Workers + KV + Durable Objects 是轻量全球架构典型
- AWS Aurora Global Database / Google Cloud Spanner 是强一致跨 region 数据库
- 字节跳动 / Shopee / Shopify 都有公开的多 region 架构分享

## next-app-router-followup-1

title: 追问：「Next.js App Router 与 Pages Router 的核心差异」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Next.js, App Router, 追问]
parent: next-app-router

### 题目

如果面试官追问：「Next.js App Router 与 Pages Router 的核心差异」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Next.js App Router 与 Pages Router 的核心差异」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「文件路由：app/ 下用 page.tsx / layout.tsx / loading.tsx / error.tsx / route.ts 表达整套路由能力」要进一步补到边界条件里，而不是只复述结论。

## next-ppr-use-cache

title: Next.js Partial Prerendering 与 use cache 如何改变 SSR / ISR 取舍
difficulty: 资深
tags: [Next.js, PPR, 缓存, Streaming]

### 一句话

PPR 把页面拆成可静态预渲染的外壳和运行时流式填充的动态洞；`use cache` 则让数据和组件级缓存更显式，核心取舍从“整页 SSR 还是 ISR”变成“哪些边界能静态、哪些边界必须动态”。

### 题目

Next.js 的 Partial Prerendering 和 `use cache` 分别解决什么问题？它们如何影响 SSR、ISR、Streaming 和缓存失效的设计？

### 答案要点

- PPR 适合“页面大部分稳定、局部个性化或强实时”的场景：导航、营销文案、布局骨架可以预渲染，用户态、库存、权限结果放在 Suspense 动态边界里流式补齐。
- 它要求你主动设计 Suspense 边界和 fallback：边界太粗会退化成整页等待，边界太碎会增加流式片段和状态管理复杂度。
- `use cache` 更像组件/函数级缓存声明，配合 tag、revalidate 和动态 API 使用，能把“这个数据为什么能缓存、何时失效”写在代码附近。
- SSR / ISR 的取舍不再只看整页更新频率，还要看数据一致性、用户是否可见旧数据、缓存命中率、首字节时间和交互完成时间。
- 落地时要确认部署平台支持程度、动态 API 是否会让路由退出静态优化、缓存 tag 是否覆盖所有变更路径，以及预览/草稿模式是否绕过缓存。

### 常见误区

- 把 PPR 理解成“更快的 SSR”，却没有拆出稳定外壳和动态边界，最终仍然等待最慢的数据源。
- 只配置 revalidate 秒数，不设计业务事件驱动的 tag 失效，导致内容更新延迟不可控。
- fallback 只做骨架屏，不考虑权限失败、接口超时和动态洞加载失败后的可恢复体验。
- 忽略 CDN、应用缓存和数据源缓存的叠加关系，排查问题时分不清哪一层返回了旧数据。

### 追问

- 什么信号会让一个 Next.js 路由从静态渲染退回动态渲染？
- PPR 的 Suspense 边界应该按 UI 区块、数据源还是权限边界来拆？
- 你会如何验证 PPR 改善的是 TTFB、FCP、LCP 还是交互完成时间？

## next-server-actions-followup-1

title: 追问：「Server Actions 是什么？什么时候该用」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Server Actions, 表单, 追问]
parent: next-server-actions

### 题目

如果面试官追问：「Server Actions 是什么？什么时候该用」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Server Actions 是什么？什么时候该用」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「写法：函数顶部 'use server'，前端 import 后就能 await 调用，不需要写 fetch / 路由」要进一步补到边界条件里，而不是只复述结论。

## next-cache-layers-followup-1

title: 追问：你会先看哪些指标来判断「Next App Router 的四层缓存模型」是不是当前性能瓶颈
difficulty: 资深
tags: [缓存, Next.js, 追问]
parent: next-cache-layers

### 题目

如果面试官追问：你会先看哪些指标来判断「Next App Router 的四层缓存模型」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Next App Router 的四层缓存模型」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## nuxt3-overview-followup-1

title: 追问：在 Vue 项目里落地「Nuxt 3 的核心特性与目录约定」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [Nuxt, Vue, 追问]
parent: nuxt3-overview

### 题目

如果面试官追问：在 Vue 项目里落地「Nuxt 3 的核心特性与目录约定」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Nuxt 3 的核心特性与目录约定」拆成可验证的小步骤，逐步替换高风险部分。

## edge-runtime-followup-1

title: 追问：「Edge Runtime 与 Node Runtime 的差异」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Edge, Cloudflare, Vercel, 追问]
parent: edge-runtime

### 题目

如果面试官追问：「Edge Runtime 与 Node Runtime 的差异」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Edge Runtime 与 Node Runtime 的差异」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「优势：低 cold start、离用户近、按请求计费、全球分布」要进一步补到边界条件里，而不是只复述结论。

## seo-and-meta-followup-1

title: 追问：「现代框架做 SEO 的关键点」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [SEO, meta, 追问]
parent: seo-and-meta

### 题目

如果面试官追问：「现代框架做 SEO 的关键点」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「现代框架做 SEO 的关键点」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「渲染：内容必须出现在首屏 HTML 里，避免 CSR 后才填充」要进一步补到边界条件里，而不是只复述结论。

## ssr-csr-ssg-isr-followup-1

title: 追问：「SSR / CSR / SSG / ISR 怎么选」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [SSR, SSG, ISR, 追问]
parent: ssr-csr-ssg-isr

### 题目

如果面试官追问：「SSR / CSR / SSG / ISR 怎么选」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「SSR / CSR / SSG / ISR 怎么选」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「CSR（Client-Side Rendering）」要进一步补到边界条件里，而不是只复述结论。

## next-data-fetching-patterns-followup-1

title: 追问：在 React 项目里应用「Next App Router 下数据获取的 4 种姿势」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [Next, RSC, 数据获取, 高频, 追问]
parent: next-data-fetching-patterns

### 题目

如果面试官追问：在 React 项目里应用「Next App Router 下数据获取的 4 种姿势」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「Next App Router 下数据获取的 4 种姿势」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Server Component 直 fetch（90% 场景首选）」要进一步补到边界条件里，而不是只复述结论。

## remix-react-router-loaders-followup-1

title: 追问：在 React 项目里应用「Remix / React Router v6.4+ 的 loader / action 模型」时，哪些 state 或渲染边界最容易出问题
difficulty: 进阶
tags: [Remix, React Router, 数据获取, 追问]
parent: remix-react-router-loaders

### 题目

如果面试官追问：在 React 项目里应用「Remix / React Router v6.4+ 的 loader / action 模型」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「Remix / React Router v6.4+ 的 loader / action 模型」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「路由 = UI + loader + action，三件套绑定」要进一步补到边界条件里，而不是只复述结论。

## fullstack-auth-strategy-followup-1

title: 追问：推动「SSR 应用的鉴权怎么设计」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [鉴权, Next, 全栈, 高频, 追问]
parent: fullstack-auth-strategy

### 题目

如果面试官追问：推动「SSR 应用的鉴权怎么设计」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「SSR 应用的鉴权怎么设计」拆成可验证的小步骤，逐步替换高风险部分。

## hydration-mismatch-debug-followup-1

title: 追问：在 React 项目里应用「Hydration mismatch 怎么排查 / 修复」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [SSR, Hydration, React, 高频, 追问]
parent: hydration-mismatch-debug

### 题目

如果面试官追问：在 React 项目里应用「Hydration mismatch 怎么排查 / 修复」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「Hydration mismatch 怎么排查 / 修复」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「时间相关：new Date() / Date.now() / 相对时间（"3 分钟前"）服务端和客户端时刻不同」要进一步补到边界条件里，而不是只复述结论。

## ssr-data-fetching-consistency-followup-1

title: 追问：「SSR 数据如何无缝传递到 Client，避免重复请求」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [SSR, 数据获取, 高频, 追问]
parent: ssr-data-fetching-consistency

### 题目

如果面试官追问：「SSR 数据如何无缝传递到 Client，避免重复请求」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「SSR 数据如何无缝传递到 Client，避免重复请求」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「传统方案：注入 **INITIAL_STATE**」要进一步补到边界条件里，而不是只复述结论。

## ssr-csr-spa-mpa-basic-followup-1

title: 追问：「SSR / CSR / SPA / MPA / SSG / ISR 这堆词到底是什么关系」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [SSR, CSR, SSG, ISR, 追问]
parent: ssr-csr-spa-mpa-basic

### 题目

如果面试官追问：「SSR / CSR / SPA / MPA / SSG / ISR 这堆词到底是什么关系」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「SSR / CSR / SPA / MPA / SSG / ISR 这堆词到底是什么关系」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「CSR（Client-Side Rendering）：HTML 是空壳，JS 拉数据再渲染。适合后台系统、富交互应用」要进一步补到边界条件里，而不是只复述结论。

## multi-region-deploy-followup-1

title: 追问：「全栈应用的多区域部署：边缘网关 / CDN / 流量切换 / 灾备 怎么做」在弱网、代理、断连或服务端限流时会出现哪些边界问题
difficulty: 资深
tags: [架构, 多区域, 灾备, 海外, 追问]
parent: multi-region-deploy

### 题目

如果面试官追问：「全栈应用的多区域部署：边缘网关 / CDN / 流量切换 / 灾备 怎么做」在弱网、代理、断连或服务端限流时会出现哪些边界问题？

### 答案要点

#### 核心回答

- 先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「全栈应用的多区域部署：边缘网关 / CDN / 流量切换 / 灾备 怎么做」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

## multi-region-deploy-followup-2

title: 追问：你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 资深
tags: [架构, 多区域, 灾备, 海外, 追问]
parent: multi-region-deploy

### 题目

如果面试官追问：你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 核心回答

- 先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「全栈应用的多区域部署：边缘网关 / CDN / 流量切换 / 灾备 怎么做」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

## multi-region-deploy-followup-3

title: 追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 资深
tags: [架构, 多区域, 灾备, 海外, 追问]
parent: multi-region-deploy

### 题目

如果面试官追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「全栈应用的多区域部署：边缘网关 / CDN / 流量切换 / 灾备 怎么做」不是只在理想输入下成立。
- 再补可观测指标：链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## rsc-client-boundary-serialization

title: RSC 与 use client 边界：序列化、第三方库和 bundle 膨胀怎么处理
difficulty: 资深
tags: [RSC, Next.js, 边界, 性能]
links: [next-app-router, next-data-fetching-patterns, 22-react/react-server-components]

### 一句话

RSC 的关键不是“组件在服务端跑”这么简单，而是要控制服务端/客户端边界：能序列化的数据才能跨边界传递，`use client` 会把该模块及其依赖打进客户端 bundle，第三方交互组件要用薄包装隔离。

### 题目

在 Next.js App Router 中，什么时候需要写 `use client`？RSC 和 Client Component 的边界如何影响序列化、第三方库、状态管理和包体？

### 答案要点

- 默认 Server Component 适合数据读取、权限判断、静态内容拼装和减少客户端 JS；它不能使用浏览器 API、事件处理器、`useState/useEffect`。
- `use client` 是模块边界，不是单个组件开关；一个文件标记后，它 import 的客户端依赖会进入浏览器 bundle。
- 跨 RSC 边界传递的 props 必须符合 React Flight 的可序列化约束：函数、DOM 节点、class 实例和自定义原型对象不适合直接传；`Date`、`Map`、`Set` 等内建结构不能一概按 JSON-only 判断，要看当前 React / Next 版本支持和团队约定。
- 第三方库如果依赖 `window`、DOM、动画或事件，需要包在很薄的 Client Component 里，Server Component 只传必要数据。
- 状态管理要靠近交互区域：不要为了一个按钮把整页 layout 标成 `use client`，否则 RSC 的包体收益会被抵消。
- 数据获取要避免重复：Server Component 里 fetch 可利用 request memoization / cache；Client Component 里再请求同一数据要明确是否需要实时性。
- 监控上要看客户端 JS 体积、hydration 时间、RSC payload、TTFB 和交互指标，不能只看首屏 HTML。

### 代码示例

```tsx
// app/products/page.tsx - Server Component
import ProductFilters from './ProductFilters';

export default async function Page() {
  const products = await getProducts();
  return (
    <>
      <h1>商品列表</h1>
      <ProductFilters initialCategory="all" />
      <ProductList products={products} />
    </>
  );
}
```

```tsx
// app/products/ProductFilters.tsx - 只有交互薄层需要客户端运行
'use client';

import { useState } from 'react';

export default function ProductFilters({ initialCategory }: { initialCategory: string }) {
  const [category, setCategory] = useState(initialCategory);
  return <select value={category} onChange={(e) => setCategory(e.target.value)} />;
}
```

### 常见误区

- 在 `layout.tsx` 顶部随手写 `use client`，导致整棵页面依赖都进入客户端包。
- 把 RSC payload 简化理解成 JSON-only，或反过来把任意对象都当成可传；正确做法是以 React Flight / Next 当前版本支持为准。
- 从 Server Component 传函数、DOM 节点或 class 实例给 Client Component，违反序列化边界。
- 第三方图表库直接在 Server Component import，构建或运行时才发现访问了 `window`。
- 只看 RSC 是否能跑，不看客户端 bundle 是否真的下降。

### 追问

- `use client` 为什么会影响它下面 import 的整个模块依赖图？
- Date、Map、Set、class 实例、函数跨 RSC 边界分别有什么问题？哪些取决于 React / Next 版本？
- 如何把一个只能客户端运行的复杂图表库接入 RSC 页面？

### 延伸

- RSC 边界设计和组件库设计强相关：越靠近叶子节点放交互，越容易保留服务端渲染收益。
- Server Actions、缓存标签和 Client Query 缓存要统一设计，否则会出现数据刚更新但页面仍显示旧值。
