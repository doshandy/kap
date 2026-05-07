---
id: 23-framework-compare
title: 框架横向对比
order: 23
icon: ⚖️
description: Vue / React / Svelte / Solid / Qwik / Angular 的设计哲学、性能模型与选型决策。
---

## reactivity-models
title: 主流框架的响应式模型对比
difficulty: 资深
tags: [响应式, 框架]

### 题目
React、Vue、Svelte、Solid、Qwik、Angular 的响应式模型分别是什么？各自的性能边界在哪？

### 答案要点
- React：状态变更触发整个子树重新执行函数 + diff，靠 memo 减少；React Compiler 自动 memo
- Vue 3：基于 Proxy 的细粒度依赖追踪，组件级 patchFlag + 子树 hoist；3.5 Vapor Mode 朝向无 VDOM
- Svelte：编译期把响应式编译成"赋值即更新"的 imperative 代码，运行时极小，无 VDOM
- Solid：JSX 但运行时是 fine-grained Signals，组件函数只跑一次，依赖变更只更新对应节点
- Qwik：Resumability，HTML 序列化整个状态机，按需下载组件代码，首屏 0 hydration
- Angular：基于 RxJS / Zone.js（旧）和 Signals（新），变更检测有清晰的 Zone 边界

### 代码示例
```ts
const c = $state(0);
$: double = c * 2;

const [c, setC] = createSignal(0);
const double = createMemo(() => c() * 2);

const c = ref(0);
const double = computed(() => c.value * 2);
```

### 延伸
- 响应式的本质都是"变更 -> 影响范围最小化 -> 更新 DOM"，差异只在编译期还是运行期解决
- React Compiler、Vue Vapor 都在向 Solid / Svelte 的细粒度方向收敛

## rendering-strategy
title: SPA / SSR / SSG / ISR / RSC / Streaming / Resumability
difficulty: 资深
tags: [渲染策略, SSR]

### 题目
做一个新项目时，怎么选 SPA、SSR、SSG、ISR、RSC、Streaming SSR、Resumability？

### 答案要点
- SPA：纯客户端渲染，简单、易部署；首屏慢、SEO 弱，适合后台 / 工具站
- SSR：每次请求服务端渲染，首屏快 + SEO 好，但服务器成本高
- SSG：构建期生成静态 HTML，CDN 直接吐，性价比高但内容更新需要重建
- ISR（Incremental Static Regeneration）：SSG + 后台按需重建，兼顾静态性能和动态性
- RSC：服务端组件 + 客户端组件混合，bundle 更小、可直接访问数据源
- Streaming SSR：HTML 流式吐出，配合 Suspense，TTFB 极低
- Qwik 的 Resumability：把状态序列化进 HTML，浏览器无需 hydration 直接续跑

### 代码示例
```ts
export const revalidate = 60;
export default async function Page() {
  const data = await fetch('https://api/posts').then((r) => r.json());
  return <PostList posts={data} />;
}

export const config = { runtime: 'edge' };
export default async function Page() {
  const data = await db.posts.findMany();
  return <PostList posts={data} />;
}
```

### 延伸
- 不必非要二选一：核心页 RSC + ISR、运营页 SSG、后台 SPA 是常见组合
- Edge Runtime（Cloudflare Workers / Vercel Edge）让 SSR 离用户更近，是新方向

## bundle-runtime-cost
title: 各框架运行时体积与启动成本对比
difficulty: 进阶
tags: [体积, 性能]

### 题目
关心首屏 TTI 时，框架本身的运行时大小、解析 / 执行成本怎么对比？

### 答案要点
- 运行时体积（gzip 大约）：Svelte ~2KB、Solid ~7KB、Vue 3 ~30KB、Preact ~3KB、React+ReactDOM ~40KB、Angular 较大
- Hydration 成本：React / Vue 都需要把 VDOM 重建一遍；Qwik 接近 0、Astro Islands 局部 hydration
- 首屏关键链路：HTML → Critical CSS → 关键 JS（router + framework + page）
- 编译期优化：Svelte / Solid 的"消失的框架"，让客户端代码最小
- 度量工具：Lighthouse + WebPageTest + 自定义 Performance Observer，关注 LCP、INP、TBT、TTI

### 代码示例
```ts
new PerformanceObserver((list) => {
  list.getEntries().forEach((e) => {
    console.log(e.name, (e as PerformanceMeasure).duration);
  });
}).observe({ type: 'measure', buffered: true });

performance.mark('framework-start');
import('./bootstrap').then(() => {
  performance.mark('framework-ready');
  performance.measure('framework-init', 'framework-start', 'framework-ready');
});
```

### 延伸
- 业务代码体积通常远大于框架本身，不要为了省 30KB 框架而上 Svelte，要看整体投入产出
- 移动端 / 低端机占比高的产品，体积差异会被放大

## ecosystem-team
title: 生态、招聘和团队工程化的取舍
difficulty: 进阶
tags: [选型, 团队]

### 题目
技术选型不只看技术指标，怎么把生态成熟度、招聘难度、上下游配套也考虑进去？

### 答案要点
- 生态广度：组件库 / 状态管理 / 路由 / SSR 框架 / IDE 插件是否齐全
- 招聘市场：Vue 在国内招聘量大，React 全球范围更通用，Svelte / Solid 招聘困难
- 学习曲线：React + TypeScript 模式多、心智重；Vue 模板上手快，但项目大了模板复杂度也高
- 长期维护：核心团队是否活跃、企业背书（Meta/Google/Vercel）、版本节奏
- 工程化生态：监控、可视化搭建、低代码、SSR 平台、组件库内部沉淀

### 代码示例
```ts
const decisionMatrix = {
  short_term_pilot: 'React',
  team_familiar_vue_chinese_market: 'Vue 3',
  bundle_size_critical_iot: 'Svelte / Solid',
  enterprise_admin_with_dependency_injection: 'Angular',
  i_o_heavy_b2c_with_seo: 'Next (RSC) / Nuxt 3',
  zero_hydration_marketing_site: 'Qwik / Astro',
};
```

### 延伸
- 对组织来说"统一一种主框架 + 允许局部尝试新东西"通常比"全员追潮流"更稳健
- 内部基础设施（脚手架、组件库、监控、发布平台）和框架同样重要，甚至更重要

## migration-strategy
title: 老项目迁移 / 多框架共存怎么做
difficulty: 资深
tags: [迁移, 微前端]

### 题目
公司里有 Vue 2、Vue 3、React 多套框架，怎么平稳迁移而不停业务？

### 答案要点
- 评估收益：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移
- 分阶段：先抽公共能力（API、设计系统、登录态）成框架无关包，再按页迁移
- 多框架共存：用 qiankun / Module Federation / iframe 把不同栈隔离到子应用
- 数据双写：路由 / 用户态在迁移中要双向兼容，避免功能缺失
- 灰度：小流量先放新版，关键指标（错误率、性能、转化）持平再放量
- 工具：Vue 2 → Vue 3 用官方迁移构建；Vue → React / 反向需要逐组件重写

### 代码示例
```ts
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'order-react',
    entry: '//order.example.com',
    container: '#sub',
    activeRule: '/order',
  },
  {
    name: 'profile-vue3',
    entry: '//profile.example.com',
    container: '#sub',
    activeRule: '/profile',
  },
]);

start({ sandbox: { strictStyleIsolation: true } });
```

### 延伸
- 微前端不是银弹，团队组织和发布节奏才是真正驱动因素
- 设计系统统一比框架统一更重要，能让多框架共存的视觉体验保持一致

## angular-distinct
title: Angular 的核心差异和适合场景
difficulty: 进阶
tags: [Angular, DI]

### 题目
为什么 Angular 在国内偏冷但在企业 / 银行场景仍然主流？它的关键特性是什么？

### 答案要点
- 模块化 + DI：依赖注入是一等公民，适合大型业务的解耦
- 全家桶：CLI、Router、Forms、HttpClient、RxJS、i18n、SSR (Universal) 都官方提供
- TS-first：从 v2 起就是 TS，类型体系完整
- Signals（v17+）补齐细粒度响应式，逐步告别 Zone.js
- 学习曲线陡，但规范统一，跨项目人员切换成本低
- 适合后台 / Dashboard / 银行 / 医疗等需求重、生命周期长的项目

### 代码示例
```ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  load(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    @if (user()) {
      <h1>{{ user()!.name }}</h1>
    }
  `,
})
export class ProfileComponent {
  private svc = inject(UserService);
  user = signal<User | null>(null);
  ngOnInit() {
    this.svc.load('me').subscribe((u) => this.user.set(u));
  }
}
```

### 延伸
- Angular 的"约束"在小项目里是负担，在大项目里却是优势
- Standalone Components + Signals 让新项目门槛大幅降低，值得重新评估

## qwik-resumability
title: Qwik 与 Resumability 模型
difficulty: 资深
tags: [Qwik, Resumability]

### 题目
Qwik 主张"零 hydration"是怎么做到的？跟 Islands Architecture 有什么不同？

### 答案要点
- Hydration 慢的根本原因：要把整个组件树在客户端再跑一次绑定事件
- Resumability：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）
- 浏览器无需重新执行组件代码，只在用户交互时按需下载对应 component chunk
- Islands（Astro）也减少 JS，但岛之间还是 hydration；Qwik 则是组件级别按需 wake
- 代价：所有组件函数必须支持序列化（不能闭包捕获不可序列化引用），心智负担更高

### 代码示例
```tsx
import { component$, useSignal, $ } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);
  return (
    <button onClick$={() => count.value++}>
      Clicks: {count.value}
    </button>
  );
});
```

### 延伸
- Resumability 适合首屏要求极致、交互密度中等的内容站
- 复杂强交互产品（编辑器、Dashboard）用 Qwik 不一定划算，因为按需下载的 chunk 太碎

## svelte-solid-philosophy
title: Svelte 5 与 Solid 的设计哲学
difficulty: 资深
tags: [Svelte, Solid, Signals]

### 题目
Svelte 5（Runes）和 Solid 都是"消失的框架"，它们的实现方式有什么不同？

### 答案要点
- Solid：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained
- Svelte 5：Runes（`$state / $derived / $effect`）让响应式从语法糖回到显式，编译目标接近 Solid
- 共同点：无 VDOM、增量 DOM 更新、运行时极小
- 差异：Solid 仍然是 JSX + JS 一切皆函数；Svelte 是 SFC，模板语法对设计师 / 后端更友好
- 性能：极致场景下 Solid > Svelte > Vue > React，但实际差距一般在毫秒级

### 代码示例
```svelte
<script>
  let count = $state(0);
  let double = $derived(count * 2);
  $effect(() => console.log('count =', count));
</script>

<button onclick={() => count++}>{count} (x2 = {double})</button>
```

### 延伸
- Vue 3.5 的 Vapor Mode 思路与 Solid / Svelte 5 一致，未来三家会越来越像
- 真要在生产里大量使用，先评估生态（路由、表单、SSR、组件库）是否够用

## solid-signal-finegrained
title: Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势
difficulty: 资深
tags: [响应式, 框架]

### 一句话
传统 React 是"组件级 re-render"，Signal 派是"只更新真正用到这个值的那一行 DOM"——更新粒度从组件级别下沉到具体的 DOM 节点。

### 题目
什么是 Signal / 细粒度响应式？相比 React 的渲染模型有什么优势和成本？

### 答案要点
- **传统 React**：state 改变 → 组件重新执行 → diff → 更新 DOM。组件粒度的"重新执行"
- **Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）**：
  - 创建时就建立 "依赖图"
  - 值变化时直接通知用到它的"最小订阅者"（具体一行 textContent / class）
  - 跳过组件函数重跑、跳过虚拟 DOM diff
- **优势**：
  - 性能更好（运行时开销 < diff）
  - 心智更稳：不需要 useMemo / useCallback / memo
  - 包体更小（没有 VDOM diff 算法）
- **代价**：
  - 不再支持"组件函数每次重跑"——心智模型变了
  - 调试栈不像 React 那样清晰（深依赖图）
  - 生态规模仍远不及 React
- **趋势**：React 19 + React Compiler 试图通过编译期优化达到接近的效果，没切到 Signal 但理念在收敛

### 代码示例
```jsx
// SolidJS
import { createSignal, createEffect } from 'solid-js';

function Counter() {
  const [count, setCount] = createSignal(0);
  const double = () => count() * 2;
  createEffect(() => console.log('count is', count()));
  return <button onClick={() => setCount(count() + 1)}>{double()}</button>;
}
```

```ts
import { signal, computed, effect } from '@preact/signals';
const n = signal(0);
const square = computed(() => n.value * n.value);
effect(() => console.log(square.value));
n.value = 3;
```

### 延伸
- Vue 3 早就有响应式核心（reactive/ref），Vue Vapor 取消 VDOM 进一步细粒度
- React Forget / React Compiler：编译期插入 memo，让作者无需手写优化
- 选型：极致性能 / 嵌入式 / 视觉应用 → Solid；生态 + 招聘 → React

