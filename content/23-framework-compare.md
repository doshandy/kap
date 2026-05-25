---
id: 23-framework-compare
title: 框架横向对比
order: 23
icon: ⚖️
description: Vue / React / Svelte / Solid / Qwik / Angular 的设计哲学、性能模型与选型决策。
---

## reactivity-models

title: 主流框架的响应式模型对比
followups: [reactivity-models-followup-1, reactivity-models-followup-2, reactivity-models-followup-3]
links: [03-vue/computed-watch, 03-vue/effect-track-trigger, 03-vue/reactivity-core]
difficulty: 资深
tags: [响应式, 框架]

### 一句话

回答「主流框架的响应式模型对比」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

React、Vue、Svelte、Solid、Qwik、Angular 的响应式模型分别是什么？各自的性能边界在哪？

### 答案要点

- React：状态变更触发整个子树重新执行函数 + diff，靠 memo 减少；React Compiler 自动 memo
- Vue 3：基于 Proxy 的细粒度依赖追踪，组件级 patchFlag + 子树 hoist；3.5 Vapor Mode 朝向无 VDOM
- Svelte：编译期把响应式编译成"赋值即更新"的 imperative 代码，运行时极小，无 VDOM
- Solid：JSX 但运行时是 fine-grained Signals，组件函数只跑一次，依赖变更只更新对应节点

#### 工程化补充

- 场景前提：回答 主流框架的响应式模型对比 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 主流框架的响应式模型对比 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
const c = $state(0);
$: double = c * 2;

const [c, setC] = createSignal(0);
const double = createMemo(() => c() * 2);

const c = ref(0);
const double = computed(() => c.value * 2);
```

### 追问

- 在 Vue 项目里落地「主流框架的响应式模型对比」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「主流框架的响应式模型对比」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 响应式、框架，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 响应式的本质都是"变更 -> 影响范围最小化 -> 更新 DOM"，差异只在编译期还是运行期解决
- React Compiler、Vue Vapor 都在向 Solid / Svelte 的细粒度方向收敛

## rendering-strategy

title: SPA / SSR / SSG / ISR / RSC / Streaming / Resumability
followups: [rendering-strategy-followup-1, rendering-strategy-followup-2, rendering-strategy-followup-3]
links: [24-fullstack-meta/ssr-csr-ssg-isr]
difficulty: 资深
tags: [渲染策略, SSR]

### 一句话

这题的高分关键是把 渲染策略 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

做一个新项目时，怎么选 SPA、SSR、SSG、ISR、RSC、Streaming SSR、Resumability？

### 答案要点

- SPA：纯客户端渲染，简单、易部署；首屏慢、SEO 弱，适合后台 / 工具站
- SSR：每次请求服务端渲染，首屏快 + SEO 好，但服务器成本高
- SSG：构建期生成静态 HTML，CDN 直接吐，性价比高但内容更新需要重建
- ISR（Incremental Static Regeneration）：SSG + 后台按需重建，兼顾静态性能和动态性

#### 工程化补充

- 场景前提：SPA / SSR / SSG / ISR / RSC / Streaming / Resumability 只有在瓶颈被数据证实时才值得推进；先确认 渲染策略 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 SPA / SSR / SSG / ISR / RSC / Streaming / Resumability 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

### 追问

- 你会先看哪些指标来判断「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 渲染策略、SSR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不必非要二选一：核心页 RSC + ISR、运营页 SSG、后台 SPA 是常见组合
- Edge Runtime（Cloudflare Workers / Vercel Edge）让 SSR 离用户更近，是新方向

## bundle-runtime-cost

title: 各框架运行时体积与启动成本对比
followups: [bundle-runtime-cost-followup-1, bundle-runtime-cost-followup-2, bundle-runtime-cost-followup-3]
difficulty: 进阶
tags: [体积, 性能]

### 一句话

这题的高分关键是把 体积 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

关心首屏 TTI 时，框架本身的运行时大小、解析 / 执行成本怎么对比？

### 答案要点

- 运行时体积（gzip 大约）：Svelte ~2KB、Solid ~7KB、Vue 3 ~30KB、Preact ~3KB、React+ReactDOM ~40KB、Angular 较大
- Hydration 成本：React / Vue 都需要把 VDOM 重建一遍；Qwik 接近 0、Astro Islands 局部 hydration
- 首屏关键链路：HTML → Critical CSS → 关键 JS（router + framework + page）
- 编译期优化：Svelte / Solid 的"消失的框架"，让客户端代码最小

#### 工程化补充

- 场景前提：各框架运行时体积与启动成本对比 只有在瓶颈被数据证实时才值得推进；先确认 体积 是否真是主耗时来源。
- 实施步骤：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 各框架运行时体积与启动成本对比 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

### 追问

- 你会先看哪些指标来判断「各框架运行时体积与启动成本对比」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「各框架运行时体积与启动成本对比」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 体积、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 业务代码体积通常远大于框架本身，不要为了省 30KB 框架而上 Svelte，要看整体投入产出
- 移动端 / 低端机占比高的产品，体积差异会被放大

## ecosystem-team

title: 生态、招聘和团队工程化的取舍
followups: [ecosystem-team-followup-1, ecosystem-team-followup-2, ecosystem-team-followup-3]
difficulty: 进阶
tags: [选型, 团队]

### 一句话

讲「生态、招聘和团队工程化的取舍」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

技术选型不只看技术指标，怎么把生态成熟度、招聘难度、上下游配套也考虑进去？

### 答案要点

- 生态广度：组件库 / 状态管理 / 路由 / SSR 框架 / IDE 插件是否齐全
- 招聘市场：Vue 在国内招聘量大，React 全球范围更通用，Svelte / Solid 招聘困难
- 学习曲线：React + TypeScript 模式多、心智重；Vue 模板上手快，但项目大了模板复杂度也高
- 长期维护：核心团队是否活跃、企业背书（Meta/Google/Vercel）、版本节奏

#### 工程化补充

- 场景前提：落地 生态、招聘和团队工程化的取舍 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

### 追问

- 推动「生态、招聘和团队工程化的取舍」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「生态、招聘和团队工程化的取舍」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 选型、团队，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 对组织来说"统一一种主框架 + 允许局部尝试新东西"通常比"全员追潮流"更稳健
- 内部基础设施（脚手架、组件库、监控、发布平台）和框架同样重要，甚至更重要

## migration-strategy

title: 老项目迁移 / 多框架共存怎么做
followups: [migration-strategy-followup-1, migration-strategy-followup-2, migration-strategy-followup-3]
difficulty: 资深
tags: [迁移, 微前端]

### 一句话

这题的高分关键是把 迁移 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

公司里有 Vue 2、Vue 3、React 多套框架，怎么平稳迁移而不停业务？

### 答案要点

- 评估收益：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移
- 分阶段：先抽公共能力（API、设计系统、登录态）成框架无关包，再按页迁移
- 多框架共存：用 qiankun / Module Federation / iframe 把不同栈隔离到子应用
- 数据双写：路由 / 用户态在迁移中要双向兼容，避免功能缺失

#### 工程化补充

- 场景前提：落地 老项目迁移 / 多框架共存怎么做 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

### 追问

- 「老项目迁移 / 多框架共存怎么做」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「老项目迁移 / 多框架共存怎么做」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 迁移、微前端，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 微前端不是银弹，团队组织和发布节奏才是真正驱动因素
- 设计系统统一比框架统一更重要，能让多框架共存的视觉体验保持一致

## angular-distinct

title: Angular 的核心差异和适合场景
followups: [angular-distinct-followup-1, angular-distinct-followup-2, angular-distinct-followup-3]
difficulty: 进阶
tags: [Angular, DI]

### 一句话

这题的高分关键是把 Angular 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么 Angular 在国内偏冷但在企业 / 银行场景仍然主流？它的关键特性是什么？

### 答案要点

- 模块化 + DI：依赖注入是一等公民，适合大型业务的解耦
- 全家桶：CLI、Router、Forms、HttpClient、RxJS、i18n、SSR (Universal) 都官方提供
- TS-first：从 v2 起就是 TS，类型体系完整
- Signals（v17+）补齐细粒度响应式，逐步告别 Zone.js

#### 工程化补充

- 场景前提：回答 Angular 的核心差异和适合场景 时先锁定 Angular 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Angular 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Angular 的可复现用例、线上监控指标和回退演练记录。

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

### 追问

- 「Angular 的核心差异和适合场景」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Angular 的核心差异和适合场景」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Angular、DI，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Angular 的"约束"在小项目里是负担，在大项目里却是优势
- Standalone Components + Signals 让新项目门槛大幅降低，值得重新评估

## qwik-resumability

title: Qwik 与 Resumability 模型
followups: [qwik-resumability-followup-1, qwik-resumability-followup-2, qwik-resumability-followup-3]
difficulty: 资深
tags: [Qwik, Resumability]

### 一句话

这题的高分关键是把 Qwik 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

Qwik 主张"零 hydration"是怎么做到的？跟 Islands Architecture 有什么不同？

### 答案要点

- Hydration 慢的根本原因：要把整个组件树在客户端再跑一次绑定事件
- Resumability：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）
- 浏览器不需要像传统 hydration 那样整棵树统一重跑；通常在用户交互、可见性或预取策略触发时按需下载和恢复对应 chunk
- Islands（Astro）也减少 JS，但岛之间还是 hydration；Qwik 则是组件级别按需 wake

#### 工程化补充

- 场景前提：回答 Qwik 与 Resumability 模型 时先锁定 Qwik 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Qwik 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Qwik 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```tsx
import { component$, useSignal, $ } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);
  return <button onClick$={() => count.value++}>Clicks: {count.value}</button>;
});
```

### 追问

- 「Qwik 与 Resumability 模型」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Qwik 与 Resumability 模型」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Qwik、Resumability，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Resumability 适合首屏要求极致、交互密度中等的内容站
- 复杂强交互产品（编辑器、Dashboard）用 Qwik 不一定划算，因为按需下载的 chunk 太碎

## svelte-solid-philosophy

title: Svelte 5 与 Solid 的设计哲学
followups: [svelte-solid-philosophy-followup-1, svelte-solid-philosophy-followup-2, svelte-solid-philosophy-followup-3]
difficulty: 资深
tags: [Svelte, Solid, Signals]

### 一句话

这题回答要覆盖 Svelte 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

Svelte 5（Runes）和 Solid 都是"消失的框架"，它们的实现方式有什么不同？

### 答案要点

- Solid：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained
- Svelte 5：Runes（$state / $derived / $effect）让响应式从语法糖回到显式，编译目标接近 Solid
- 共同点：无 VDOM、增量 DOM 更新、运行时极小
- 差异：Solid 仍然是 JSX + JS 一切皆函数；Svelte 是 SFC，模板语法对设计师 / 后端更友好

#### 工程化补充

- 场景前提：先定义 Svelte 5 与 Solid 的设计哲学 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 Svelte 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Svelte 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```svelte
<script>
  let count = $state(0);
  let double = $derived(count * 2);
  $effect(() => console.log('count =', count));
</script>

<button onclick={() => count++}>{count} (x2 = {double})</button>
```

### 追问

- 推动「Svelte 5 与 Solid 的设计哲学」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Svelte 5 与 Solid 的设计哲学」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 Svelte、Solid、Signals，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vue 3.5 的 Vapor Mode 思路与 Solid / Svelte 5 一致，未来三家会越来越像
- 真要在生产里大量使用，先评估生态（路由、表单、SSR、组件库）是否够用

## solid-signal-finegrained

title: Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势
followups: [solid-signal-finegrained-followup-1, solid-signal-finegrained-followup-2, solid-signal-finegrained-followup-3]
difficulty: 资深
tags: [响应式, 框架]

### 一句话

这题回答要覆盖 响应式 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

什么是 Signal / 细粒度响应式？相比 React 的渲染模型有什么优势和成本？

### 答案要点

- 传统 React：state 改变 → 组件重新执行 → diff → 更新 DOM。组件粒度的"重新执行"
- Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：
- 创建时就建立 "依赖图"
- 值变化时直接通知用到它的"最小订阅者"（具体一行 textContent / class）

#### 工程化补充

- 场景前提：回答 Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

### 追问

- 在 Vue 项目里落地「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 响应式、框架，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vue 3 早就有响应式核心（reactive/ref），Vue Vapor 取消 VDOM 进一步细粒度
- React Forget / React Compiler：编译期插入 memo，让作者无需手写优化
- 选型：极致性能 / 嵌入式 / 视觉应用 → Solid；生态 + 招聘 → React

## hydration-vs-resumability

title: Hydration vs Resumability：Qwik 为什么"不需要 hydration"
followups: [hydration-vs-resumability-followup-1, hydration-vs-resumability-followup-2, hydration-vs-resumability-followup-3]
links: [24-fullstack-meta/hydration-mismatch-debug]
difficulty: 资深
tags: [Qwik, 渲染, SSR, 高频]

### 一句话

这题回答要覆盖 Qwik 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

React 18 / Vue / Solid 都做了 hydration 优化，Qwik 直接说"我不需要 hydration"。底层差异在哪？

### 答案要点

- 传统 hydration 的问题
- 服务端渲染 HTML → 客户端拿到 HTML 后重新执行整棵组件树
- 重跑是为了：建组件实例、绑定事件、初始化 state
- 大型应用 hydration 时间可能 1-3 秒，期间 INP 很差

#### 工程化补充

- 场景前提：回答 Hydration vs Resumability：Qwik 为什么"不需要 hydration" 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Hydration vs Resumability：Qwik 为什么"不需要 hydration" 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```tsx
import { component$, useSignal, $ } from '@builder.io/qwik';

export const Counter = component$(() => {
  const count = useSignal(0);

  const onClick = $(() => {
    count.value++;
  });

  return <button onClick$={onClick}>{count.value}</button>;
});
```

### 追问

- 你会先看哪些指标来判断「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Qwik、渲染、SSR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Marko、Astro、Qwik 都在探索 islands / partial / resumability
- 性能预算视角：传统框架 TTI 300-1000ms；Qwik 几乎瞬时 interactive

## meta-framework-choice

title: 同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选
followups: [meta-framework-choice-followup-1, meta-framework-choice-followup-2, meta-framework-choice-followup-3]
difficulty: 资深
tags: [元框架, 选型, 高频]

### 一句话

这题的高分关键是把 元框架 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

团队要做新项目（中大型 SaaS 产品 + 营销页 + 文档站），列举主流元框架的关键差异，做技术选型。

### 答案要点

- Next.js（React 生态默认）
- 优势：生态最广、Vercel 部署一流、App Router + RSC + Server Actions 体系完善
- 劣势：心智模型重（缓存四层）、文档迭代快易学迷
- 适合：复杂 SaaS、电商、需要 Edge / Serverless

#### 工程化补充

- 场景前提：讨论 同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选 时要交代响应式依赖怎么收集、何时触发更新、如何清理副作用。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

### 追问

- 在 Vue 项目里落地「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 元框架、选型、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要为了"新"换框架；React Router v7 + Remix 思想合并是个稳健选择
- AI / Edge 是下一阶段竞争点：Cloudflare Workers / Vercel Edge / Deno Deploy

## react-vs-vue-positioning-basic

title: 老板让你选 React 还是 Vue 做新项目，你怎么答？
followups: [react-vs-vue-positioning-basic-followup-1, react-vs-vue-positioning-basic-followup-2, react-vs-vue-positioning-basic-followup-3]
difficulty: 基础
tags: [选型, 框架, 基础]

### 一句话

回答「老板让你选 React 还是 Vue 做新项目，你怎么答」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

作为前端 lead，怎么在 React 和 Vue 3 之间做技术选型？

### 答案要点

- 团队成本：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然
- 生态：React 社区更大、招聘更容易，企业级 SDK（Stripe / Algolia 等）多 React 优先
- 学习曲线：Vue 模板对新人 / 设计师更友好；React 的 JSX + hooks 心智负担稍高
- 类型友好度：两者现在 TS 体验都很好（Vue 3.5 + Volar / React + Type Inference）

#### 工程化补充

- 场景前提：先划清 选型 的作用域和更新时机，再展开 老板让你选 React 还是 Vue 做新项目，你怎么答，避免状态边界混乱。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

### 代码示例

```ts
const decision = {
  '团队 80% React 经验': 'React',
  '团队主要做后台系统 / 国内业务': 'Vue 3',
  '需要 SSR + 全栈': 'Next.js (React)',
  '需要快速搭原型 / 设计师参与': 'Vue 3',
  '极致性能 / 体积': 'Solid / Svelte',
  '渐进增强 / 多页混入': 'Vue 或 Astro Islands',
};
```

### 常见误区

- 用"哪个先进 / 哪个流行"替代"哪个适合团队"
- 把 Vue 当成"简单版 React" —— 它响应式模型完全不同（getter/setter/Proxy vs immutable + diff）
- 选了 React 又用 Pinia / Composition API 风格的 store —— 不是不行，但混合方案心智负担高

### 追问

- 选了之后怎么定团队规范（lint / 目录 / 组件粒度）
- 渐进迁移老项目（jQuery → React vs Vue）
- 选 SolidJS 适合什么场景

### 延伸

- 招聘市场：2025 年 React 仍占 60%+，Vue 国内 30%+
- 大厂内部经常 React + Vue 并存，看 BU 历史

## reactivity-models-followup-1

title: 追问：以「主流框架的响应式模型对比」为例，真在项目里落地「主流框架的响应式模型对比」时，你会如何划分 响应式 并控制更新时机
difficulty: 资深
tags: [响应式, 框架, 追问]
parent: reactivity-models

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「主流框架的响应式模型对比」为例，真在项目里落地「主流框架的响应式模型对比」时，你会如何划分 响应式 并控制更新时机？

### 答案要点

#### 直答

- 结论：先拆分 主流框架的响应式模型对比 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 主流框架的响应式模型对比 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 响应式：编译期把响应式编译成"赋值即更新"的 imperative 代码，运行时极小，无 VDOM。
- 框架：在「主流框架的响应式模型对比」这题里，框架 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：主流框架的响应式模型对比 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「主流框架的响应式模型对比」里，验收 主流框架的响应式模型对比 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## rendering-strategy-followup-1

title: 追问：围绕「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」做瓶颈归因，你会先用哪些指标完成“定位-验证”闭环
difficulty: 资深
tags: [渲染策略, SSR, 追问]
parent: rendering-strategy

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」做瓶颈归因，你会先用哪些指标完成“定位-验证”闭环？

### 答案要点

#### 直答

- 结论：把 SPA 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 SPA 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- SPA：纯客户端渲染，简单、易部署；首屏慢、SEO 弱，适合后台 / 工具站。
- SSR：每次请求服务端渲染，首屏快 + SEO 好，但服务器成本高。
- SSG：构建期生成静态 HTML，CDN 直接吐，性价比高但内容更新需要重建。

#### 风险与验收

- 主要风险：若 SPA 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：SPA 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## bundle-runtime-cost-followup-1

title: 追问：在「各框架运行时体积与启动成本对比」场景下，你会先看哪些与 体积 相关的指标来判断「各框架运行时体积与启动成本对比」是不是当前性能瓶颈
difficulty: 进阶
tags: [体积, 性能, 追问]
parent: bundle-runtime-cost

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「各框架运行时体积与启动成本对比」场景下，你会先看哪些与 体积 相关的指标来判断「各框架运行时体积与启动成本对比」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证 各框架运行时体积与启动成本对比 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 各框架运行时体积与启动成本对比 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 体积：在「各框架运行时体积与启动成本对比」里，体积 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「各框架运行时体积与启动成本对比」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：各框架运行时体积与启动成本对比 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「各框架运行时体积与启动成本对比」里，各框架运行时体积与启动成本对比 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## ecosystem-team-followup-1

title: 追问：结合真实业务约束，真要把「生态、招聘和团队工程化的取舍」推到线上，你会如何围绕 选型 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [选型, 团队, 追问]
parent: ecosystem-team

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「生态、招聘和团队工程化的取舍」推到线上，你会如何围绕 选型 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「生态、招聘和团队工程化的取舍」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：先量化 生态 招聘和团队工程化的取舍 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 选型：围绕「生态、招聘和团队工程化的取舍」里的 选型 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 生态 招聘和团队工程化的取舍 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 生态 招聘和团队工程化的取舍 收益提升和维护成本变化，确保取舍结论可持续。

## migration-strategy-followup-1

title: 追问：如果要评估「老项目迁移 / 多框架共存怎么做」的落地风险，你会优先检查哪些 迁移 约束是否成立
difficulty: 资深
tags: [迁移, 微前端, 追问]
parent: migration-strategy

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「老项目迁移 / 多框架共存怎么做」的落地风险，你会优先检查哪些 迁移 约束是否成立？

### 答案要点

#### 直答

- 结论：「老项目迁移 / 多框架共存怎么做」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：评估收益：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移。

#### 术语解释

- 迁移：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移。
- 微前端：围绕「老项目迁移 / 多框架共存怎么做」里的 微前端 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：老项目迁移 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 老项目迁移 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## angular-distinct-followup-1

title: 追问：结合真实业务约束，围绕「Angular 的核心差异和适合场景」做方案评审时，哪些 Angular 边界输入最容易导致结论失真
difficulty: 进阶
tags: [Angular, DI, 追问]
parent: angular-distinct

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「Angular 的核心差异和适合场景」做方案评审时，哪些 Angular 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：回答 Angular 的核心差异和适合场景 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先明确 Angular 的核心差异和适合场景 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Angular：Angular 是「Angular 的核心差异和适合场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- DI：依赖注入是一等公民，适合大型业务的解耦。

#### 风险与验收

- 主要风险：Angular 的核心差异和适合场景 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「Angular 的核心差异和适合场景」里，验收 Angular 的核心差异和适合场景 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## qwik-resumability-followup-1

title: 追问：结合真实业务约束，面对真实流量和复杂依赖时，「Qwik 与 Resumability 模型」最可能被哪些 Qwik 边界条件击穿
difficulty: 资深
tags: [Qwik, Resumability, 追问]
parent: qwik-resumability

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，面对真实流量和复杂依赖时，「Qwik 与 Resumability 模型」最可能被哪些 Qwik 边界条件击穿？

### 答案要点

#### 直答

- 结论：围绕「Qwik 与 Resumability 模型」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：围绕 Qwik 与 Resumability 模型 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Qwik：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）。
- Resumability：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）。

#### 风险与验收

- 主要风险：Qwik 与 Resumability 模型 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 Qwik 与 Resumability 模型 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## svelte-solid-philosophy-followup-1

title: 追问：结合真实业务约束，真要把「Svelte 5 与 Solid 的设计哲学」推到线上，你会如何围绕 Svelte 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [Svelte, Solid, Signals, 追问]
parent: svelte-solid-philosophy

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「Svelte 5 与 Solid 的设计哲学」推到线上，你会如何围绕 Svelte 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「Svelte 5 与 Solid 的设计哲学」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：围绕 Svelte 5 与 Solid 的设计哲学 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Svelte：Runes（$state / $derived / $effect）让响应式从语法糖回到显式，编译目标接近 Solid。
- Solid：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained。
- Signals：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained。

#### 风险与验收

- 主要风险：若 Svelte 5 与 Solid 的设计哲学 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：发布验收至少看 Svelte 5 与 Solid 的设计哲学 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## solid-signal-finegrained-followup-1

title: 追问：结合真实业务约束，真在项目里落地「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」时，你会如何划分 响应式 并控制更新时机
difficulty: 资深
tags: [响应式, 框架, 追问]
parent: solid-signal-finegrained

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真在项目里落地「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」时，你会如何划分 响应式 并控制更新时机？

### 答案要点

#### 直答

- 结论：先把 Signal / 细粒度响应式 的本质优势 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 Signal / 细粒度响应式 的本质优势 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Signal：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。
- Solid：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。
- Vue Vapor：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。

#### 风险与验收

- 主要风险：围绕 Signal / 细粒度响应式 的本质优势 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Signal / 细粒度响应式 的本质优势 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## hydration-vs-resumability-followup-1

title: 追问：在「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」场景下，你会先看哪些与 Qwik 相关的指标来判断「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」是不是当前性能瓶颈
difficulty: 资深
tags: [Qwik, 渲染, SSR, 高频, 追问]
parent: hydration-vs-resumability

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」场景下，你会先看哪些与 Qwik 相关的指标来判断「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 Hydration vs Resumability 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 Hydration vs Resumability 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Hydration vs Resumability：围绕「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里的 Hydration vs Resumability 作答时，要给可落地动作，并说明异常处理与验收阈值。
- Qwik：Qwik 是「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- hydration：传统 hydration 的问题。

#### 风险与验收

- 主要风险：Hydration vs Resumability 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里，Hydration vs Resumability 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## meta-framework-choice-followup-1

title: 追问：选择 Nuxt / Next / Astro / SvelteKit / Remix 时，你会如何评估渲染模式、数据获取和团队约束
difficulty: 资深
tags: [元框架, 选型, 高频, 追问]
parent: meta-framework-choice

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：选择 Nuxt / Next / Astro / SvelteKit / Remix 时，你会如何评估渲染模式、数据获取和团队约束？

### 答案要点

#### 直答

- 结论：先锁定 Nuxt 与 Next 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 Nuxt 与 Next 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 元框架：在「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」这题里，元框架 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 选型：围绕「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里的 选型 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- Nuxt：Nuxt 是「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Nuxt 与 Next 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 Nuxt 与 Next 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## react-vs-vue-positioning-basic-followup-1

title: 追问：你会怎样在「老板让你选 React 还是 Vue 做新项目，你怎么答」里围绕 选型 处理组件更新顺序，避免出现时序错位和状态抖动
difficulty: 基础
tags: [选型, 框架, 基础, 追问]
parent: react-vs-vue-positioning-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样在「老板让你选 React 还是 Vue 做新项目，你怎么答」里围绕 选型 处理组件更新顺序，避免出现时序错位和状态抖动？

### 答案要点

#### 直答

- 结论：老板让你选 React 还是 Vue 做新项目 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先量化 老板让你选 React 还是 Vue 做新项目 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- React：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然。
- Vue：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然。
- 选型：在「老板让你选 React 还是 Vue 做新项目，你怎么答」里，选型 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：若 老板让你选 React 还是 Vue 做新项目 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 老板让你选 React 还是 Vue 做新项目 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## react-vs-vue-positioning-basic-followup-2

title: 追问：当「老板让你选 React 还是 Vue 做新项目，你怎么答」出现状态纠缠时，你会如何拆解边界并降低调试复杂度
difficulty: 基础
tags: [选型, 框架, 基础, 追问]
parent: react-vs-vue-positioning-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「老板让你选 React 还是 Vue 做新项目，你怎么答」出现状态纠缠时，你会如何拆解边界并降低调试复杂度？

### 答案要点

#### 直答

- 结论：先按“页面路由状态、服务端数据状态、本地交互状态”三层拆边界，再为每层定义单向数据流，调试复杂度会明显下降。
- 关键动作：先定位 老板让你选 React 还是 Vue 做新项目 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- React：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然。
- Vue：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然。
- 选型：在「老板让你选 React 还是 Vue 做新项目，你怎么答」这题里，选型 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：老板让你选 React 还是 Vue 做新项目 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「老板让你选 React 还是 Vue 做新项目，你怎么答」里，老板让你选 React 还是 Vue 做新项目 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## react-vs-vue-positioning-basic-followup-3

title: 追问：从工程落地角度看，如果比较「老板让你选 React 还是 Vue 做新项目，你怎么答」与替代方案，你会如何基于 选型 判断不同团队阶段的最佳选择
difficulty: 基础
tags: [选型, 框架, 基础, 追问]
parent: react-vs-vue-positioning-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果比较「老板让你选 React 还是 Vue 做新项目，你怎么答」与替代方案，你会如何基于 选型 判断不同团队阶段的最佳选择？

### 答案要点

#### 直答

- 结论：做 老板让你选 React 还是 Vue 做新项目 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。
- 关键动作：先拆分 老板让你选 React 还是 Vue 做新项目 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- React：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然。
- Vue：现有人员熟悉度是首要因素。让一个 React 老兵学 Vue3 一周能上手，反之亦然。
- 选型：围绕「老板让你选 React 还是 Vue 做新项目，你怎么答」里的 选型 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 老板让你选 React 还是 Vue 做新项目 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 老板让你选 React 还是 Vue 做新项目 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## reactivity-models-followup-2

title: 追问：结合真实业务约束，当「主流框架的响应式模型对比」让联调成本持续升高时，你会先拆哪条关键链路来止损
difficulty: 资深
tags: [响应式, 框架, 追问]
parent: reactivity-models
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当「主流框架的响应式模型对比」让联调成本持续升高时，你会先拆哪条关键链路来止损？

### 答案要点

#### 直答

- 结论：评估 主流框架的响应式模型对比 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先量化 主流框架的响应式模型对比 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 响应式：编译期把响应式编译成"赋值即更新"的 imperative 代码，运行时极小，无 VDOM。
- 框架：在「主流框架的响应式模型对比」里，框架 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 主流框架的响应式模型对比 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：围绕 主流框架的响应式模型对比 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## reactivity-models-followup-3

title: 追问：从工程落地角度看，如果比较「主流框架的响应式模型对比」与替代方案，你会如何基于 响应式 判断不同团队阶段的最佳选择
difficulty: 资深
tags: [响应式, 框架, 追问]
parent: reactivity-models
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果比较「主流框架的响应式模型对比」与替代方案，你会如何基于 响应式 判断不同团队阶段的最佳选择？

### 答案要点

#### 直答

- 结论：做 主流框架的响应式模型对比 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。
- 关键动作：先拆分 主流框架的响应式模型对比 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 响应式：编译期把响应式编译成"赋值即更新"的 imperative 代码，运行时极小，无 VDOM。
- 框架：围绕「主流框架的响应式模型对比」里的 框架 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 主流框架的响应式模型对比 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收看 主流框架的响应式模型对比 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## rendering-strategy-followup-2

title: 追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 渲染策略 重新评估「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」优化效果
difficulty: 资深
tags: [渲染策略, SSR, 追问]
parent: rendering-strategy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果实验室分数变好但线上反馈一般，你会如何围绕 渲染策略 重新评估「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」优化效果？

### 答案要点

#### 直答

- 结论：先锁定 SPA 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 SPA 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- SPA：纯客户端渲染，简单、易部署；首屏慢、SEO 弱，适合后台 / 工具站。
- SSR：每次请求服务端渲染，首屏快 + SEO 好，但服务器成本高。
- SSG：构建期生成静态 HTML，CDN 直接吐，性价比高但内容更新需要重建。

#### 风险与验收

- 主要风险：在「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」场景下，SPA 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：验收看 SPA 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## rendering-strategy-followup-3

title: 追问：在当前团队与业务约束下，你会怎样比较「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」在 渲染策略 优化上的短期收益和长期负担，决定是否落地
difficulty: 资深
tags: [渲染策略, SSR, 追问]
parent: rendering-strategy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样比较「SPA / SSR / SSG / ISR / RSC / Streaming / Resumability」在 渲染策略 优化上的短期收益和长期负担，决定是否落地？

### 答案要点

#### 直答

- 结论：SPA 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先量化 SPA 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- SPA：纯客户端渲染，简单、易部署；首屏慢、SEO 弱，适合后台 / 工具站。
- SSR：每次请求服务端渲染，首屏快 + SEO 好，但服务器成本高。
- SSG：构建期生成静态 HTML，CDN 直接吐，性价比高但内容更新需要重建。

#### 风险与验收

- 主要风险：围绕 SPA 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 SPA 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## bundle-runtime-cost-followup-2

title: 追问：你会怎样验证「各框架运行时体积与启动成本对比」在 体积 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [体积, 性能, 追问]
parent: bundle-runtime-cost
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样验证「各框架运行时体积与启动成本对比」在 体积 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 各框架运行时体积与启动成本对比 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先定义 各框架运行时体积与启动成本对比 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 体积：在「各框架运行时体积与启动成本对比」里，体积 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「各框架运行时体积与启动成本对比」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：各框架运行时体积与启动成本对比 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「各框架运行时体积与启动成本对比」里，各框架运行时体积与启动成本对比 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## bundle-runtime-cost-followup-3

title: 追问：以「各框架运行时体积与启动成本对比」为例，如果「各框架运行时体积与启动成本对比」在 体积 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [体积, 性能, 追问]
parent: bundle-runtime-cost
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「各框架运行时体积与启动成本对比」为例，如果「各框架运行时体积与启动成本对比」在 体积 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 各框架运行时体积与启动成本对比 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先拆分 各框架运行时体积与启动成本对比 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 体积：围绕「各框架运行时体积与启动成本对比」里的 体积 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 性能：围绕「各框架运行时体积与启动成本对比」里的 性能 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 各框架运行时体积与启动成本对比 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 各框架运行时体积与启动成本对比 收益提升和维护成本变化，确保取舍结论可持续。

## ecosystem-team-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 选型 定义「生态、招聘和团队工程化的取舍」的先后改造顺序
difficulty: 进阶
tags: [选型, 团队, 追问]
parent: ecosystem-team
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 选型 定义「生态、招聘和团队工程化的取舍」的先后改造顺序？

### 答案要点

#### 直答

- 结论：先量化 生态 招聘和团队工程化的取舍 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先排查 生态 招聘和团队工程化的取舍 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- 选型：在「生态、招聘和团队工程化的取舍」里，选型 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 生态 招聘和团队工程化的取舍 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 生态 招聘和团队工程化的取舍 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## ecosystem-team-followup-3

title: 追问：当团队讨论「生态、招聘和团队工程化的取舍」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 进阶
tags: [选型, 团队, 追问]
parent: ecosystem-team
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队讨论「生态、招聘和团队工程化的取舍」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 直答

- 结论：先量化 生态 招聘和团队工程化的取舍 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先定义 生态 招聘和团队工程化的取舍 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 选型：围绕「生态、招聘和团队工程化的取舍」里的 选型 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：生态 招聘和团队工程化的取舍 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「生态、招聘和团队工程化的取舍」里，生态 招聘和团队工程化的取舍 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## svelte-solid-philosophy-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 Svelte 规划「Svelte 5 与 Solid 的设计哲学」的阶段目标与交付边界
difficulty: 资深
tags: [Svelte, Solid, Signals, 追问]
parent: svelte-solid-philosophy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 Svelte 规划「Svelte 5 与 Solid 的设计哲学」的阶段目标与交付边界？

### 答案要点

#### 直答

- 结论：Svelte 5 与 Solid 的设计哲学 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先排查 Svelte 5 与 Solid 的设计哲学 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Svelte：Runes（$state / $derived / $effect）让响应式从语法糖回到显式，编译目标接近 Solid。
- Solid：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained。
- Signals：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained。

#### 风险与验收

- 主要风险：围绕 Svelte 5 与 Solid 的设计哲学 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收需同时对比 Svelte 5 与 Solid 的设计哲学 收益提升和维护成本变化，确保取舍结论可持续。

## svelte-solid-philosophy-followup-3

title: 追问：在「Svelte 5 与 Solid 的设计哲学」场景下，为了确认「Svelte 5 与 Solid 的设计哲学」在 Svelte 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [Svelte, Solid, Signals, 追问]
parent: svelte-solid-philosophy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Svelte 5 与 Solid 的设计哲学」场景下，为了确认「Svelte 5 与 Solid 的设计哲学」在 Svelte 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：把 Svelte 5 与 Solid 的设计哲学 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「Svelte 5 与 Solid 的设计哲学」里的 Svelte 5 与 Solid 的设计哲学 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Svelte：Runes（$state / $derived / $effect）让响应式从语法糖回到显式，编译目标接近 Solid。
- Solid：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained。
- Signals：运行时基于 Signals + 编译 JSX，组件函数只执行一次，依赖追踪是真正的 fine-grained。

#### 风险与验收

- 主要风险：在「Svelte 5 与 Solid 的设计哲学」里，Svelte 5 与 Solid 的设计哲学 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Svelte 5 与 Solid 的设计哲学」里，Svelte 5 与 Solid 的设计哲学 至少要给一组指标阈值、一条日志证据和一组测试结果。

## solid-signal-finegrained-followup-2

title: 追问：以「Signal / 细粒度响应式的本质优势」为例，当「Signal / 细粒度响应式的本质优势」的链路越来越难调试时，你会先改哪一层，再怎么验证风险可控
difficulty: 资深
tags: [响应式, 框架, 追问]
parent: solid-signal-finegrained
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Signal / 细粒度响应式的本质优势」为例，当「Signal / 细粒度响应式的本质优势」的链路越来越难调试时，你会先改哪一层，再怎么验证风险可控？

### 答案要点

#### 直答

- 结论：先定义 Signal / 细粒度响应式的本质优势 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先统一 Signal / 细粒度响应式的本质优势 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Signal：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。
- 响应式：在「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」里，响应式 是验收对象，必须给可量化指标、日志信号和测试证据。
- 框架：在「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」里，框架 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」里，Signal / 细粒度响应式的本质优势 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Signal / 细粒度响应式的本质优势 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## solid-signal-finegrained-followup-3

title: 追问：在当前团队与业务约束下，围绕「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」选型时，你会怎样按 响应式 与业务复杂度给出分层推荐
difficulty: 资深
tags: [响应式, 框架, 追问]
parent: solid-signal-finegrained
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势」选型时，你会怎样按 响应式 与业务复杂度给出分层推荐？

### 答案要点

#### 直答

- 结论：先量化 Signal / 细粒度响应式 的本质优势 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先排查 Signal / 细粒度响应式 的本质优势 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Signal：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。
- Solid：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。
- Vue Vapor：Signal（Solid / Preact Signals / Vue Vapor / Angular Signals）：。

#### 风险与验收

- 主要风险：围绕 Signal / 细粒度响应式 的本质优势 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 Signal / 细粒度响应式 的本质优势 收益提升和维护成本变化，确保取舍结论可持续。

## hydration-vs-resumability-followup-2

title: 追问：要证明「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」确实改善体验，你会如何围绕 Qwik 设计线上观测与对照验证
difficulty: 资深
tags: [Qwik, 渲染, SSR, 高频, 追问]
parent: hydration-vs-resumability
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：要证明「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」确实改善体验，你会如何围绕 Qwik 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 Hydration vs Resumability 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先统一 Hydration vs Resumability 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Hydration vs Resumability：围绕「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里的 Hydration vs Resumability 作答时，要给可落地动作，并说明异常处理与验收阈值。
- Qwik：Qwik 是「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- hydration：传统 hydration 的问题。

#### 风险与验收

- 主要风险：在「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里，Hydration vs Resumability 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Hydration vs Resumability 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## hydration-vs-resumability-followup-3

title: 追问：以「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」为例，如果「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 资深
tags: [Qwik, 渲染, SSR, 高频, 追问]
parent: hydration-vs-resumability
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」为例，如果「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 直答

- 结论：把 Hydration vs Resumability 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 Hydration vs Resumability 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Hydration vs Resumability：在「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」这道追问里，Hydration vs Resumability 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- Qwik：Qwik 是「Hydration vs Resumability：Qwik 为什么"不需要 hydration"」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- hydration：传统 hydration 的问题。

#### 风险与验收

- 主要风险：若 Hydration vs Resumability 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Hydration vs Resumability 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## meta-framework-choice-followup-2

title: 追问：在当前团队与业务约束下，如果团队反馈「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」不好维护，你会如何围绕 元框架 做分层重构和验证
difficulty: 资深
tags: [元框架, 选型, 高频, 追问]
parent: meta-framework-choice
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果团队反馈「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」不好维护，你会如何围绕 元框架 做分层重构和验证？

### 答案要点

#### 直答

- 结论：把 同样是 Vue 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 同样是 Vue 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Vue/React：Vue/React 是「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Nuxt：Nuxt 是「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Next：Next.js（React 生态默认）。

#### 风险与验收

- 主要风险：同样是 Vue 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里，同样是 Vue 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## meta-framework-choice-followup-3

title: 追问：结合真实业务约束，当业务复杂度升级时，你会如何判断「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」在 元框架 上还能不能继续扛住
difficulty: 资深
tags: [元框架, 选型, 高频, 追问]
parent: meta-framework-choice
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当业务复杂度升级时，你会如何判断「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」在 元框架 上还能不能继续扛住？

### 答案要点

#### 直答

- 结论：把 同样是 Vue 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 同样是 Vue 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Vue/React：Vue/React 是「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Nuxt：Nuxt 是「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Next：Next.js（React 生态默认）。

#### 风险与验收

- 主要风险：在「同样是 Vue/React 全家桶，Nuxt / Next / Astro / SvelteKit / Remix 怎么选」里，同样是 Vue 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：同样是 Vue 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## migration-strategy-followup-2

title: 追问：在「老项目迁移 / 多框架共存怎么做」场景下，你会如何围绕 迁移 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [迁移, 微前端, 追问]
parent: migration-strategy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「老项目迁移 / 多框架共存怎么做」场景下，你会如何围绕 迁移 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：验证「老项目迁移 / 多框架共存怎么做」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：评估收益：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移。

#### 术语解释

- 迁移：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移。
- 微前端：在「老项目迁移 / 多框架共存怎么做」里，微前端 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：老项目迁移 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「老项目迁移 / 多框架共存怎么做」里，老项目迁移 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## migration-strategy-followup-3

title: 追问：以「老项目迁移 / 多框架共存怎么做」为例，当约束变化导致成本上升时，你会先优化「老项目迁移 / 多框架共存怎么做」里和 迁移 相关的哪些环节
difficulty: 资深
tags: [迁移, 微前端, 追问]
parent: migration-strategy
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「老项目迁移 / 多框架共存怎么做」为例，当约束变化导致成本上升时，你会先优化「老项目迁移 / 多框架共存怎么做」里和 迁移 相关的哪些环节？

### 答案要点

#### 直答

- 结论：先处理 老项目迁移 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：评估收益：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移。

#### 术语解释

- 迁移：迁移要算成本（人月）和收益（性能 / 可维护 / 招聘），别为迁移而迁移。
- 微前端：在「老项目迁移 / 多框架共存怎么做」里，微前端 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：若 老项目迁移 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 老项目迁移 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## angular-distinct-followup-2

title: 追问：以「Angular 的核心差异和适合场景」为例，你会如何围绕 Angular 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [Angular, DI, 追问]
parent: angular-distinct
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Angular 的核心差异和适合场景」为例，你会如何围绕 Angular 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：验证「Angular 的核心差异和适合场景」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 Angular 的核心差异和适合场景 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Angular：Angular 是「Angular 的核心差异和适合场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- DI：依赖注入是一等公民，适合大型业务的解耦。

#### 风险与验收

- 主要风险：在「Angular 的核心差异和适合场景」里，Angular 的核心差异和适合场景 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Angular 的核心差异和适合场景 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## angular-distinct-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Angular 重排「Angular 的核心差异和适合场景」方案优先级
difficulty: 进阶
tags: [Angular, DI, 追问]
parent: angular-distinct
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Angular 重排「Angular 的核心差异和适合场景」方案优先级？

### 答案要点

#### 直答

- 结论：「Angular 的核心差异和适合场景」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：先定位 Angular 的核心差异和适合场景 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Angular：Angular 是「Angular 的核心差异和适合场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- DI：依赖注入是一等公民，适合大型业务的解耦。

#### 风险与验收

- 主要风险：在「Angular 的核心差异和适合场景」场景下，Angular 的核心差异和适合场景 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「Angular 的核心差异和适合场景」里，验收 Angular 的核心差异和适合场景 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## qwik-resumability-followup-2

title: 追问：以「Qwik 与 Resumability 模型」为例，你会如何围绕 Qwik 定义「Qwik 与 Resumability 模型」生效的判据，并用测试与监控长期验证
difficulty: 资深
tags: [Qwik, Resumability, 追问]
parent: qwik-resumability
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Qwik 与 Resumability 模型」为例，你会如何围绕 Qwik 定义「Qwik 与 Resumability 模型」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 直答

- 结论：验证「Qwik 与 Resumability 模型」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 Qwik 与 Resumability 模型 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Qwik：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）。
- Resumability：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）。

#### 风险与验收

- 主要风险：若 Qwik 与 Resumability 模型 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Qwik 与 Resumability 模型 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## qwik-resumability-followup-3

title: 追问：在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Qwik 重排「Qwik 与 Resumability 模型」方案优先级
difficulty: 资深
tags: [Qwik, Resumability, 追问]
parent: qwik-resumability
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Qwik 重排「Qwik 与 Resumability 模型」方案优先级？

### 答案要点

#### 直答

- 结论：先冻结「Qwik 与 Resumability 模型」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。
- 关键动作：先明确 Qwik 与 Resumability 模型 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Qwik：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）。
- Resumability：Qwik 在 SSR 时把"序列化的状态机 + 事件监听描述"塞进 HTML（attributes）。

#### 风险与验收

- 主要风险：在「Qwik 与 Resumability 模型」场景下，Qwik 与 Resumability 模型 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「Qwik 与 Resumability 模型」里，验收 Qwik 与 Resumability 模型 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## framework-decision-experiment-matrix

title: 框架选型实验矩阵：避免被 benchmark 与主观偏好带偏
difficulty: 资深
tags: [选型, 决策治理, 实验设计]
followups: [framework-decision-experiment-matrix-followup-1, framework-decision-experiment-matrix-followup-2, framework-decision-experiment-matrix-followup-3]

### 一句话

回答「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

当团队在 React/Vue/Svelte/Solid 等方案间争论不休时，你会如何设计选型实验，确保结论可复核、可执行？

### 答案要点

- 先定义决策维度：首屏体验、交互性能、包体成本、开发效率、招聘供给、维护风险。
- 统一实验样本：用同一业务页面与数据规模，避免“不同 demo 比不同框架”造成偏差。
- 指标分层评估：实验室指标（LCP/INP/包体）+ 真实流量指标（错误率、转化、回滚率）。
- 设置最低可接受阈值：只比“谁更快”不够，要先满足可维护与可交付底线。

#### 工程化补充

- 场景前提：框架选型实验矩阵：避免被 benchmark 与主观偏好带偏 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type Candidate = 'react' | 'vue' | 'svelte' | 'solid';
type Score = { perf: number; devEx: number; ecosystem: number; migrationRisk: number };

function weightedScore(s: Score) {
  return s.perf * 0.35 + s.devEx * 0.25 + s.ecosystem * 0.2 + (10 - s.migrationRisk) * 0.2;
}
```

```yaml
decision_experiment:
  sample_pages: [dashboard, checkout, content-detail]
  metrics:
    lab: [bundle_size, lcp, inp]
    prod: [error_rate, conversion, rollback_rate]
  rollout:
    - canary_module
    - core_flow_trial
    - decision_review
```

### 追问

- 「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把“微基准跑分”直接等同于线上业务收益。
- 只看性能，不看招聘与治理成本，后续维护压力失真。
- 没有试点与回退机制，选型失败代价一次性暴露。

### 延伸

- 选型结论建议设置复审窗口（如每 6-12 个月）。
- 可保留第二候选方案的最小可行样板，降低未来切换成本。

## framework-lockin-boundary-governance

title: 框架锁定风险治理：用边界层与契约隔离降低迁移成本
difficulty: 资深
tags: [架构边界, 锁定风险, 迁移治理]
followups: [framework-lockin-boundary-governance-followup-1, framework-lockin-boundary-governance-followup-2, framework-lockin-boundary-governance-followup-3]

### 一句话

回答「框架锁定风险治理：用边界层与契约隔离降低迁移成本」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

你会如何设计前端架构边界，减少对单一框架的深度绑定，让未来迁移成本可控？

### 答案要点

- 先识别高锁定区域：状态管理、路由、表单体系、组件库、构建插件、测试生态。
- 抽离框架无关层：领域逻辑、API schema、校验规则、埋点协议、权限模型统一放到共享层。
- 用适配器封装框架差异：UI 事件、路由跳转、生命周期钩子通过桥接层统一接口。
- 契约优先于实现：以 TypeScript 类型/JSON Schema/测试契约约束上下游，而非依赖框架私有能力。

#### 工程化补充

- 场景前提：框架锁定风险治理：用边界层与契约隔离降低迁移成本 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
// 框架无关导航契约
export interface NavigationPort {
  push(path: string): void;
  replace(path: string): void;
}

// React 适配器
export function createReactNavigationPort(
  navigate: (path: string, opts?: { replace?: boolean }) => void,
): NavigationPort {
  return {
    push: (path) => navigate(path),
    replace: (path) => navigate(path, { replace: true }),
  };
}
```

```ts
// 业务层只依赖契约，不依赖具体框架
export function goToOrderDetail(nav: NavigationPort, orderId: string) {
  nav.push(`/orders/${orderId}`);
}
```

### 追问

- 「框架锁定风险治理：用边界层与契约隔离降低迁移成本」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 追求“零锁定”导致过度抽象，日常开发复杂度反而上升。
- 只抽象接口不验证可迁移性，迁移时才发现契约不可用。
- 没有治理流程，强绑定能力持续累积却无人追踪。

### 延伸

- 可把“锁定风险”纳入架构评审清单，和性能预算并列。
- 高风险模块建议保留跨框架最小实现样例，作为应急切换基线。

## framework-decision-experiment-matrix-followup-1

title: 追问：在当前团队与业务约束下，当「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [选型, 决策治理, 实验设计, 追问]
parent: framework-decision-experiment-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 直答

- 结论：框架选型实验矩阵 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：指标分层评估：实验室指标（LCP/INP/包体）+ 真实流量指标（错误率、转化、回滚率）。

#### 术语解释

- benchmark：在「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里，benchmark 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 选型：围绕「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里的 选型 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 决策治理：围绕「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里的 决策治理 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：框架选型实验矩阵 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：框架选型实验矩阵 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## framework-decision-experiment-matrix-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 选型 安排「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」的渐进改造路线
difficulty: 资深
tags: [选型, 决策治理, 实验设计, 追问]
parent: framework-decision-experiment-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 选型 安排「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」的渐进改造路线？

### 答案要点

#### 直答

- 结论：评估 框架选型实验矩阵 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：指标分层评估：实验室指标（LCP/INP/包体）+ 真实流量指标（错误率、转化、回滚率）。

#### 术语解释

- benchmark：在「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里，benchmark 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 选型：围绕「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里的 选型 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 决策治理：围绕「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里的 决策治理 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 框架选型实验矩阵 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 框架选型实验矩阵 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## framework-decision-experiment-matrix-followup-3

title: 追问：在当前团队与业务约束下，要判断「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」值不值得长期维护，你会先盯哪些和 选型 相关的核心指标
difficulty: 资深
tags: [选型, 决策治理, 实验设计, 追问]
parent: framework-decision-experiment-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」值不值得长期维护，你会先盯哪些和 选型 相关的核心指标？

### 答案要点

#### 直答

- 结论：先定义 框架选型实验矩阵 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：指标分层评估：实验室指标（LCP/INP/包体）+ 真实流量指标（错误率、转化、回滚率）。

#### 术语解释

- benchmark：在「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里，benchmark 是验收对象，必须给可量化指标、日志信号和测试证据。
- 选型：围绕「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里的 选型 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 决策治理：围绕「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里的 决策治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里，框架选型实验矩阵 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「框架选型实验矩阵：避免被 benchmark 与主观偏好带偏」里，框架选型实验矩阵 至少要给一组指标阈值、一条日志证据和一组测试结果。

## framework-lockin-boundary-governance-followup-1

title: 追问：结合真实业务约束，真要把「框架锁定风险治理：用边界层与契约隔离降低迁移成本」推到线上，你会如何围绕 架构边界 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [架构边界, 锁定风险, 迁移治理, 追问]
parent: framework-lockin-boundary-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「框架锁定风险治理：用边界层与契约隔离降低迁移成本」推到线上，你会如何围绕 架构边界 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「框架锁定风险治理：用边界层与契约隔离降低迁移成本」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：框架锁定风险治理 用边界层与契约隔离降低迁移成本 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- 架构边界：围绕「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里的 架构边界 推进上线时，要明确每个批次的放量门槛和回退条件。
- 锁定风险：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里，锁定风险 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 迁移治理：围绕「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里的 迁移治理 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：围绕 框架锁定风险治理 用边界层与契约隔离降低迁移成本 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 框架锁定风险治理 用边界层与契约隔离降低迁移成本 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## framework-lockin-boundary-governance-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构边界 方案有效
difficulty: 资深
tags: [架构边界, 锁定风险, 迁移治理, 追问]
parent: framework-lockin-boundary-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构边界 方案有效？

### 答案要点

#### 直答

- 结论：验证「框架锁定风险治理：用边界层与契约隔离降低迁移成本」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 用边界层 与 契约隔离降低迁移成本 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 架构边界：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里，架构边界 是验收对象，必须给可量化指标、日志信号和测试证据。
- 锁定风险：围绕「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里的 锁定风险 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 迁移治理：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里，迁移治理 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 用边界层 与 契约隔离降低迁移成本 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：用边界层 与 契约隔离降低迁移成本 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## framework-lockin-boundary-governance-followup-3

title: 追问：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」场景下，如果上线窗口突然提前到下个月，你会怎么收敛「框架锁定风险治理：用边界层与契约隔离降低迁移成本」范围，并把 架构边界 相关技术债回补计划讲清楚
difficulty: 资深
tags: [架构边界, 锁定风险, 迁移治理, 追问]
parent: framework-lockin-boundary-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」场景下，如果上线窗口突然提前到下个月，你会怎么收敛「框架锁定风险治理：用边界层与契约隔离降低迁移成本」范围，并把 架构边界 相关技术债回补计划讲清楚？

### 答案要点

#### 直答

- 结论：把 框架锁定风险治理 用边界层与契约隔离降低迁移成本 上线拆成试点、扩量、全量三阶段，每阶段都绑定错误率门槛和回滚动作。
- 关键动作：框架锁定风险治理 用边界层与契约隔离降低迁移成本 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- 架构边界：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里，架构边界 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 锁定风险：围绕「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里的 锁定风险 推进上线时，要明确每个批次的放量门槛和回退条件。
- 迁移治理：在「框架锁定风险治理：用边界层与契约隔离降低迁移成本」里，迁移治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：围绕 框架锁定风险治理 用边界层与契约隔离降低迁移成本 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 框架锁定风险治理 用边界层与契约隔离降低迁移成本 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## framework-migration-stakeholder-communication

title: 框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事
difficulty: 资深
tags: [框架迁移, 沟通协作, 决策治理]
followups: [framework-migration-stakeholder-communication-followup-1, framework-migration-stakeholder-communication-followup-2, framework-migration-stakeholder-communication-followup-3]

### 一句话

这题的高分关键是把 框架迁移 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你准备推动一条业务线从旧框架迁移到新栈。管理层关心 ROI，业务方关心节奏，研发关心可维护性。你会如何设计一套沟通剧本，保证三方对齐而不是各说各话？

### 答案要点

- 先统一“北极星目标”：迁移到底是为提效、降风险，还是支持新业务形态，避免目标漂移。
- 面向管理层讲 ROI 与风险敞口：成本、收益、回收周期、失败兜底要有数字。
- 面向业务方讲节奏与影响面：哪些功能先迁、哪些冻结、哪些体验可能波动。
- 面向研发讲实现边界：契约层、桥接层、测试基线与代码 owner 怎么划分。

#### 工程化补充

- 场景前提：落地 框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type StakeholderView = 'management' | 'business' | 'engineering';

function messageTemplate(view: StakeholderView) {
  if (view === 'management') return '成本/收益/风险/回收周期';
  if (view === 'business') return '影响范围/上线节奏/用户体验变化';
  return '技术边界/迁移路径/测试与回滚';
}
```

```yaml
migration_communication_plan:
  weekly_sync:
    - facts
    - decisions_needed
    - risk_changes
  shared_milestones:
    - stage_name
    - acceptance_criteria
    - rollback_condition
    - owner
```

### 追问

- 「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只讲技术方案，不讲组织成本和业务窗口。
- 面向不同角色使用不同口径，导致目标不一致。
- 周会汇报只有进度，没有决策请求，问题被延后爆发。

### 延伸

- 可以为不同角色准备 5 分钟与 30 分钟两个版本，适配不同会议场景。
- 建议沉淀“迁移沟通 FAQ”，降低重复解释成本。

## framework-poc-stoploss-governance

title: 框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环
difficulty: 资深
tags: [选型治理, POC, 止损策略]
followups: [framework-poc-stoploss-governance-followup-1, framework-poc-stoploss-governance-followup-2, framework-poc-stoploss-governance-followup-3]

### 一句话

回答「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

团队准备对新框架做 4 周 POC，但成员意见分裂严重。你会如何设计止损机制，确保试点结束后能做出可执行且可服众的决策？

### 答案要点

- 先锁定评估维度：开发效率、运行性能、稳定性、学习曲线、迁移成本至少五项。
- 每项维度都有量化阈值：达标继续、临界补证据、不达标撤退，减少“解释空间”。
- 规定 POC 时间盒和预算上限：到点必须交结论，避免持续占用核心资源。
- 设计“反证”环节：要求支持方案和反对方案都提交失败场景，防止单边叙事。

#### 工程化补充

- 场景前提：框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type PocScore = {
  devEfficiency: number;
  runtimePerf: number;
  stability: number;
  migrationCost: number;
};

function shouldContinue(s: PocScore) {
  const score =
    s.devEfficiency * 0.3 + s.runtimePerf * 0.3 + s.stability * 0.25 - s.migrationCost * 0.15;
  return score >= 70;
}
```

```yaml
poc_governance:
  duration_weeks: 4
  must_have:
    - success_thresholds
    - stoploss_conditions
    - fallback_plan
    - postmortem_doc
```

### 追问

- 「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- POC 目标过大，最后只得到“都没做完”的结论。
- 指标在过程中不断修改，导致结果不可比较。
- 试点结束只给倾向性结论，不给撤退预案和复盘证据。

### 延伸

- 建议把 POC 评分表纳入技术决策模板，形成组织记忆。
- 可将失败 POC 也纳入知识库，避免重复踩坑。

## framework-migration-stakeholder-communication-followup-1

title: 追问：这套迁移沟通剧本最容易在哪些组织边界上失效
difficulty: 资深
tags: [框架迁移, 沟通协作, 决策治理, 追问]
parent: framework-migration-stakeholder-communication
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：这套迁移沟通剧本在真实组织里最容易在哪些边界上失效，你会如何提前兜底？

### 答案要点

#### 直答

- 结论：先让 业务方 与 研发团队说清同一件事 走小流量灰度，观察成功率与告警，再决定是否继续扩量。
- 关键动作：先统一“北极星目标”：迁移到底是为提效、降风险，还是支持新业务形态，避免目标漂移。

#### 术语解释

- 框架迁移：围绕「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里的 框架迁移 推进上线时，要明确每个批次的放量门槛和回退条件。
- 沟通协作：围绕「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里的 沟通协作 推进上线时，要明确每个批次的放量门槛和回退条件。
- 决策治理：围绕「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里的 决策治理 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：若 业务方 与 研发团队说清同一件事 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：围绕 业务方 与 研发团队说清同一件事 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## framework-migration-stakeholder-communication-followup-2

title: 追问：你怎么判断迁移沟通成本在下降而不是继续内耗
difficulty: 资深
tags: [框架迁移, 沟通协作, 决策治理, 追问]
parent: framework-migration-stakeholder-communication
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说沟通剧本有效，你会怎么判断团队沟通成本真的在下降，而不是换了个表述继续内耗？

### 答案要点

#### 直答

- 结论：评估 业务方 与 研发团队说清同一件事 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先统一“北极星目标”：迁移到底是为提效、降风险，还是支持新业务形态，避免目标漂移。

#### 术语解释

- 框架迁移：在「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里，框架迁移 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 沟通协作：在「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里，沟通协作 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 决策治理：在「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里，决策治理 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 业务方 与 研发团队说清同一件事 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收需同时对比 业务方 与 研发团队说清同一件事 收益提升和维护成本变化，确保取舍结论可持续。

## framework-migration-stakeholder-communication-followup-3

title: 追问：复盘迁移时你会拿哪些数据决定继续投入还是止损
difficulty: 资深
tags: [框架迁移, 沟通协作, 决策治理, 追问]
parent: framework-migration-stakeholder-communication
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：迁移走到一半，你会拿哪些关键数据判断“继续投入”还是“及时止损”？

### 答案要点

#### 直答

- 结论：先让 业务方 与 研发团队说清同一件事 走小流量灰度，观察成功率与告警，再决定是否继续扩量。
- 关键动作：先统一“北极星目标”：迁移到底是为提效、降风险，还是支持新业务形态，避免目标漂移。

#### 术语解释

- 框架迁移：围绕「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里的 框架迁移 推进上线时，要明确每个批次的放量门槛和回退条件。
- 沟通协作：围绕「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里的 沟通协作 推进上线时，要明确每个批次的放量门槛和回退条件。
- 决策治理：围绕「框架迁移沟通剧本：对管理层、业务方和研发团队说清同一件事」里的 决策治理 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：若 业务方 与 研发团队说清同一件事 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：验收看 业务方 与 研发团队说清同一件事 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## framework-poc-stoploss-governance-followup-1

title: 追问：POC 止损机制最容易被哪些前置假设击穿
difficulty: 资深
tags: [选型治理, POC, 止损策略, 追问]
parent: framework-poc-stoploss-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：框架 POC 的止损机制最容易被哪些前置假设击穿，你会怎么提前识别？

### 答案要点

#### 直答

- 结论：上线 撤退条件 与 复盘闭环 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先锁定评估维度：开发效率、运行性能、稳定性、学习曲线、迁移成本至少五项。

#### 术语解释

- 选型治理：在「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里，选型治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- POC：到点必须交结论，避免持续占用核心资源。
- 止损策略：围绕「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里的 止损策略 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 撤退条件 与 复盘闭环 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：撤退条件 与 复盘闭环 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## framework-poc-stoploss-governance-followup-2

title: 追问：你如何证明 POC 结论可信而不是样本偏差
difficulty: 资深
tags: [选型治理, POC, 止损策略, 追问]
parent: framework-poc-stoploss-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你怎么证明 POC 结论可信，不是因为挑了简单样本或只看了有利指标？

### 答案要点

#### 直答

- 结论：验证 撤退条件 与 复盘闭环 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先锁定评估维度：开发效率、运行性能、稳定性、学习曲线、迁移成本至少五项。

#### 术语解释

- 选型治理：围绕「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里的 选型治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- POC：到点必须交结论，避免持续占用核心资源。
- 止损策略：在「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里，止损策略 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：撤退条件 与 复盘闭环 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里，撤退条件 与 复盘闭环 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## framework-poc-stoploss-governance-followup-3

title: 追问：约束变化后你会怎么调整 POC 路径而不推倒重来
difficulty: 资深
tags: [选型治理, POC, 止损策略, 追问]
parent: framework-poc-stoploss-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：POC 进行中约束突然变化（预算缩减、上线窗口提前），你会怎么调整路径而不是推倒重来？

### 答案要点

#### 直答

- 结论：先让 撤退条件 与 复盘闭环 走小流量灰度，观察成功率与告警，再决定是否继续扩量。
- 关键动作：先锁定评估维度：开发效率、运行性能、稳定性、学习曲线、迁移成本至少五项。

#### 术语解释

- 选型治理：在「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里，选型治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- POC：到点必须交结论，避免持续占用核心资源。
- 止损策略：围绕「框架 POC 止损机制：试点成功定义、撤退条件与复盘闭环」里的 止损策略 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：围绕 撤退条件 与 复盘闭环 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：围绕 撤退条件 与 复盘闭环 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。
