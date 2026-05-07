---
id: 24-fullstack-meta
title: Next.js / Nuxt 全栈
order: 24
icon: 🌟
description: Next.js App Router、Nuxt 3、Server Actions、缓存模型与边缘部署。
---

## next-app-router
title: Next.js App Router 与 Pages Router 的核心差异
difficulty: 进阶
tags: [Next.js, App Router]

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
  const posts = await fetch('https://api/posts', { next: { revalidate: 60, tags: ['posts'] } }).then((r) => r.json());
  return <PostList posts={posts} />;
}

export async function POST(req: Request) {
  const body = await req.json();
  return Response.json({ ok: true, body });
}
```

### 延伸
- 不同路由可以混用：稳定模块上 App Router，复杂遗留页留在 Pages Router 渐进迁移
- App Router 的缓存模型有 4 层（Request Memoization / Data Cache / Full Route Cache / Router Cache），出问题先排查这条线

## next-server-actions
title: Server Actions 是什么？什么时候该用
difficulty: 进阶
tags: [Server Actions, 表单]

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

### 延伸
- Action 同步抛错走 `error.tsx`；想要可控错误请返回 `{ ok: false, error }`
- 调试时打开 Next 的"server actions log"或在 action 里加 console，查看实际请求体

## next-cache-layers
title: Next App Router 的四层缓存模型
difficulty: 资深
tags: [缓存, Next.js]

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

### 延伸
- App Router 还有 `force-dynamic / force-static / revalidate` 等路由级开关，能粗粒度控制整页缓存
- 大厂常见做法：默认 `revalidate: 60`，关键写操作主动 `revalidateTag`，敏感页 `force-dynamic`

## nuxt3-overview
title: Nuxt 3 的核心特性与目录约定
difficulty: 进阶
tags: [Nuxt, Vue]

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

### 延伸
- `definePageMeta({ layout: 'admin', middleware: ['auth'] })` 把页面元数据集中声明
- Nuxt 4（已发布）调整了部分目录默认值，迁移要看官方 codemod

## edge-runtime
title: Edge Runtime 与 Node Runtime 的差异
difficulty: 资深
tags: [Edge, Cloudflare, Vercel]

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

### 延伸
- 新框架（Hono、astro DB、Drizzle）都在做 Edge 友好的方案，Edge 已经是主流选项之一
- 生产部署前先把日志 / 监控 / 错误上报和现有体系打通，否则线上排查会很痛苦

## seo-and-meta
title: 现代框架做 SEO 的关键点
difficulty: 进阶
tags: [SEO, meta]

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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
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

### 延伸
- 别把"SEO 友好的渲染"和"必须 SSR"画等号，结构化的 SSG / ISR 通常已经够了
- 真正排名靠前的还是内容质量和外链，技术只是基础线

## ssr-csr-ssg-isr
title: SSR / CSR / SSG / ISR 怎么选
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

### 延伸
- Next.js 已经把这几种模型统一到 App Router + Server Components
- Nuxt 3 用 Nitro 引擎在多个目标（Node / Edge / Cloudflare）部署
- Edge Runtime（Cloudflare Workers / Vercel Edge）让 SSR 接近 CDN 速度

