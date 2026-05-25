---
id: 10-architecture
title: 前端架构
order: 10
icon: 🏗️
description: 分层、解耦、状态管理、组件库、设计模式与中大型前端系统设计。
---

## layering-boundary

title: 前端架构中的分层、边界与依赖方向
followups: [layering-boundary-followup-1, layering-boundary-followup-2, layering-boundary-followup-3]
difficulty: 基础
tags: [分层, 边界]

### 一句话

这题的高分关键是把 分层 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

一个中大型前端项目为什么要谈“分层”和“边界”？如果不设边界，最常见的问题是什么？

### 答案要点

- 分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置
- 没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升

#### 工程化补充

- 场景前提：落地 前端架构中的分层、边界与依赖方向 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 追问

- 推动「前端架构中的分层、边界与依赖方向」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端架构中的分层、边界与依赖方向」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 分层、边界，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 架构不是追求“层数多”，而是让变化在局部闭合

## design-patterns

title: 前端里最常见的设计模式如何落地
followups: [design-patterns-followup-1, design-patterns-followup-2, design-patterns-followup-3]
difficulty: 进阶
tags: [设计模式, 实战]

### 一句话

回答「前端里最常见的设计模式如何落地」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请举例说明观察者、发布订阅、策略、装饰器、适配器、工厂在前端中的真实落地场景。

### 答案要点

- 观察者：响应式系统、状态订阅
- 发布订阅：事件总线、埋点中心、插件系统
- 策略：表单校验、排序规则、支付/登录方式选择
- 装饰器：埋点增强、权限校验、缓存包装

#### 工程化补充

- 场景前提：前端里最常见的设计模式如何落地 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
// 1. 观察者：响应式系统的简化版
class Observer<T> {
  private subs: Array<(v: T) => void> = [];
  subscribe(fn: (v: T) => void) {
    this.subs.push(fn);
    return () => this.unsubscribe(fn);
  }
  unsubscribe(fn: (v: T) => void) {
    this.subs = this.subs.filter((s) => s !== fn);
  }
  notify(v: T) {
    this.subs.forEach((fn) => fn(v));
  }
}

// 2. 策略：表单校验
type Validator = (v: any) => string | null;
const validators: Record<string, Validator> = {
  required: (v) => (v ? null : '必填'),
  email: (v) => (/\S+@\S+\.\S+/.test(v) ? null : '邮箱格式不对'),
  phone: (v) => (/^1\d{10}$/.test(v) ? null : '手机号不对'),
};
function validate(value: any, rules: string[]) {
  for (const r of rules) {
    const err = validators[r]?.(value);
    if (err) return err;
  }
  return null;
}

// 3. 装饰器：埋点 + 缓存
function track(event: string) {
  return function (_t: any, _k: string, desc: PropertyDescriptor) {
    const original = desc.value;
    desc.value = function (...args: any[]) {
      reportTrack(event, args);
      return original.apply(this, args);
    };
  };
}

// 4. 适配器：统一不同接口
interface User {
  id: string;
  name: string;
}
const adaptOldApi = (raw: any): User => ({ id: String(raw.user_id), name: raw.user_name });
const adaptNewApi = (raw: any): User => ({ id: raw.id, name: raw.profile.displayName });

// 5. 工厂：按 type 创建图表
const chartFactory = {
  create(type: 'pie' | 'bar' | 'line', container: HTMLElement, data: any) {
    const chart = echarts.init(container);
    chart.setOption(presets[type](data));
    return chart;
  },
};
```

### 追问

- 推动「前端里最常见的设计模式如何落地」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端里最常见的设计模式如何落地」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 设计模式、实战，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 设计模式不是背诵题，关键是你能否说清"它解决了哪个变化点"

## dependency-injection

title: 依赖注入在前端什么时候有价值，什么时候会过度设计
followups: [dependency-injection-followup-1, dependency-injection-followup-2, dependency-injection-followup-3]
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe]

### 一句话

回答「依赖注入在前端什么时候有价值，什么时候会过度设计」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

前端项目什么时候值得引入依赖注入容器？它能解决什么问题，又容易带来什么代价？

### 答案要点

- 当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现
- 代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接
- 前端引入 DI 时，应优先保证依赖方向清晰和接口稳定，而不是为了“像后端架构”而引入容器

#### 工程化补充

- 场景前提：先限定 DI 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 依赖注入在前端什么时候有价值，什么时候会过度设计 的结论不成立。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```ts
// Tsyringe + reflect-metadata
import 'reflect-metadata';
import { container, injectable, inject } from 'tsyringe';

interface ILogger {
  log(msg: string): void;
}
interface IUserRepo {
  getById(id: string): Promise<{ id: string; name: string }>;
}

@injectable()
class ConsoleLogger implements ILogger {
  log(msg: string) {
    console.log('[log]', msg);
  }
}

@injectable()
class UserRepo implements IUserRepo {
  constructor(@inject('ILogger') private logger: ILogger) {}
  async getById(id: string) {
    this.logger.log(`getById ${id}`);
    return { id, name: 'alice' };
  }
}

// 组合根（应用入口注册）
container.register<ILogger>('ILogger', { useClass: ConsoleLogger });
container.register<IUserRepo>('IUserRepo', { useClass: UserRepo });

// 业务侧
const repo = container.resolve<IUserRepo>('IUserRepo');

// 测试时替换实现
container.register<ILogger>('ILogger', { useValue: { log: vi.fn() } });
```

```ts
// 轻量替代：Vue 3 provide/inject + InjectionKey
import type { InjectionKey, App } from 'vue';
const LoggerKey: InjectionKey<ILogger> = Symbol('logger');

export function setupLogger(app: App, impl: ILogger) {
  app.provide(LoggerKey, impl);
}

// 组件中
const logger = inject(LoggerKey)!;
logger.log('hello');
```

### 追问

- 推动「依赖注入在前端什么时候有价值，什么时候会过度设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「依赖注入在前端什么时候有价值，什么时候会过度设计」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 DI、InversifyJS、Tsyringe，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- DI 的价值更多体现在复杂后台、设计器、插件系统、低代码平台，而不是简单页面应用
- 很多团队真正需要的是"清晰的组合根和依赖边界"，不一定非要重型容器

## state-management

title: Flux、Redux、MobX、Pinia、Signals 的核心差别
followups: [state-management-followup-1, state-management-followup-2, state-management-followup-3]
difficulty: 进阶
tags: [状态管理, Signals]

### 一句话

回答「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

如何向团队解释“状态管理并不只是换个库”，而是不同的更新模型？

### 答案要点

- Flux/Redux 倾向单向数据流、显式更新和可追踪性
- MobX/Pinia 更强调开发体验和细粒度响应式
- Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”
- 选型要看调试能力、团队心智、跨页面共享程度和生态配套

#### 工程化补充

- 场景前提：先划清 状态管理 的作用域和更新时机，再展开 Flux、Redux、MobX、Pinia、Signals 的核心差别，避免状态边界混乱。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

### 代码示例

```ts
// Pinia：组合式风格 store
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useCart = defineStore('cart', () => {
  const items = ref<Array<{ id: string; price: number; qty: number }>>([]);
  const total = computed(() => items.value.reduce((s, i) => s + i.price * i.qty, 0));

  function add(item: { id: string; price: number }) {
    const found = items.value.find((i) => i.id === item.id);
    if (found) found.qty++;
    else items.value.push({ ...item, qty: 1 });
  }
  return { items, total, add };
});
```

```ts
// Redux Toolkit：单向数据流 + 不可变更新
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as any[] },
  reducers: {
    add(state, action: PayloadAction<{ id: string; price: number }>) {
      const found = state.items.find((i) => i.id === action.payload.id);
      if (found) found.qty++;
      else state.items.push({ ...action.payload, qty: 1 });
    },
  },
});
```

```ts
// Signals (Preact / Solid 风格)：细粒度更新
import { signal, computed, effect } from '@preact/signals';

const count = signal(0);
const double = computed(() => count.value * 2);
effect(() => console.log('count:', count.value, 'double:', double.value));
count.value++; // 仅依赖 count 的副作用被触发，不会引起整组件重渲染
```

### 追问

- 在 Vue 项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Flux、Redux、MobX、Pinia、Signals 的核心差别」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 状态管理、Signals，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 没有"永远最优"的状态库，只有"与你的问题最契合"的模型

## framework-comparison

title: Vue、React、Solid、Svelte、Qwik 应该从什么维度比较
followups: [framework-comparison-followup-1, framework-comparison-followup-2, framework-comparison-followup-3]
difficulty: 资深
tags: [框架选型, Vue, React, Solid, Svelte, Qwik]

### 一句话

讲「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

如果团队在做新项目选型，应该如何比较 Vue、React、Solid、Svelte、Qwik，而不是只看“谁更快”？

### 答案要点

- 先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本
- 内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性
- 性能对比必须带业务前提。框架基准测试能说明某些模型差异，但不能直接替代真实业务压测与可维护性评估

#### 工程化补充

- 场景前提：讨论 Vue、React、Solid、Svelte、Qwik 应该从什么维度比较 时要交代响应式依赖怎么收集、何时触发更新、如何清理副作用。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

### 追问

- 在 Vue 项目里落地「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 框架选型、Vue、React，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- “选最先进的框架”通常不是目标，选“最能稳定交付业务目标的框架”才是
- 框架迁移的最大成本往往不在语法，而在生态替换、团队训练和历史资产兼容

## component-library

title: 组件库设计的关键指标：一致性、可扩展、可访问、可主题化
followups: [component-library-followup-1, component-library-followup-2, component-library-followup-3]
links: [14-a11y-i18n/form-accessibility]
difficulty: 资深
tags: [组件库, DesignSystem]

### 一句话

回答「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

如果让你从零做一套组件库，你会优先建立哪些设计原则？

### 答案要点

- API 一致：命名、事件、插槽、受控/非受控模式统一
- 主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展
- 可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义
- 工程友好：Tree Shaking、样式隔离、SSR 兼容、文档与示例完善

#### 工程化补充

- 场景前提：先定义 组件库设计的关键指标：一致性、可扩展、可访问、可主题化 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 组件库 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 组件库 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```ts
// 1. 受控/非受控双模式
import { computed, ref } from 'vue';
const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
const inner = ref(props.modelValue ?? '');
const value = computed({
  get: () => props.modelValue ?? inner.value,
  set: v => {
    inner.value = v;
    emit('update:modelValue', v);
  },
});

// 2. Design Token：CSS 变量 + JS 同源
// tokens.ts
export const tokens = {
  colorPrimary: '#0ea5e9',
  spacingMd: '16px',
  radiusMd: '8px',
} as const;

// tokens.css（构建期生成）
:root {
  --color-primary: #0ea5e9;
  --spacing-md: 16px;
  --radius-md: 8px;
}
```

```json
// package.json：Tree Shaking 友好的 ESM + CJS 双产物
{
  "name": "@my/ui",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./style.css": "./dist/style.css",
    "./components/*": "./dist/components/*.js"
  },
  "sideEffects": ["**/*.css"]
}
```

### 追问

- 推动「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 组件库、DesignSystem，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 组件库不是"把页面组件抽出来"，而是提供稳定、长期可演进的抽象

## clean-architecture

title: Clean Architecture、DDD 思想在前端怎么落地
followups: [clean-architecture-followup-1, clean-architecture-followup-2, clean-architecture-followup-3]
difficulty: 资深
tags: [DDD, CleanArchitecture]

### 一句话

这题回答要覆盖 DDD 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

很多人说前端没必要谈 DDD/整洁架构，你怎么看？

### 答案要点

- 前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来
- 适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计

#### 工程化补充

- 场景前提：Clean Architecture、DDD 思想在前端怎么落地 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 追问

- 「Clean Architecture、DDD 思想在前端怎么落地」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Clean Architecture、DDD 思想在前端怎么落地」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 DDD、CleanArchitecture，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 架构风格要和复杂度匹配，过度抽象会伤害交付效率

## feature-flag

title: Feature Flag、灰度发布与实验系统的前端视角
followups: [feature-flag-followup-1, feature-flag-followup-2, feature-flag-followup-3]
links: [16-observability/frontend-feature-flag]
difficulty: 进阶
tags: [灰度, AB实验]

### 一句话

这题的高分关键是把 灰度 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端如何做灰度与实验，不让代码里到处都是 `if (flag)`？

### 答案要点

- Flag 要有明确归属、过期时间和回收流程
- 能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断
- 灰度策略可按用户、组织、比例、环境、地区等维度下发

#### 工程化补充

- 场景前提：落地 Feature Flag、灰度发布与实验系统的前端视角 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
// 集中式 Feature Flag 服务
interface FlagConfig {
  key: string;
  enabled: boolean;
  rollout?: number; // 0~100 灰度百分比
  segments?: string[]; // 用户分群
  expiresAt?: number; // 过期时间，强制提醒清理
  owner: string;
}

class FeatureFlags {
  private flags = new Map<string, FlagConfig>();
  private user: { id: string; segments: string[] } = { id: '', segments: [] };

  async loadFromServer() {
    const res = await fetch('/api/flags');
    const list = (await res.json()) as FlagConfig[];
    list.forEach((f) => this.flags.set(f.key, f));
  }

  isOn(key: string): boolean {
    const f = this.flags.get(key);
    if (!f || !f.enabled) return false;
    if (f.expiresAt && f.expiresAt < Date.now()) {
      console.warn(`Flag ${key} 已过期，请清理`);
      return false;
    }
    if (f.segments?.length && !f.segments.some((s) => this.user.segments.includes(s))) return false;
    if (f.rollout != null) {
      const hash = this.hashUserId(this.user.id) % 100;
      if (hash >= f.rollout) return false;
    }
    return true;
  }

  private hashUserId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
}

// Vue 中使用
const flags = inject(FlagsKey)!;
const showNew = computed(() => flags.isOn('new-checkout'));
```

```vue
<!-- 模板里集中判断，曝光埋点统一处理 -->
<template>
  <NewCheckout v-if="showNew" @mounted="trackExposure('new-checkout')" />
  <OldCheckout v-else />
</template>
```

### 追问

- 推动「Feature Flag、灰度发布与实验系统的前端视角」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Feature Flag、灰度发布与实验系统的前端视角」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 灰度、AB实验，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 最危险的不是"没有灰度"，而是"有一堆永远不清理的灰度分支"

## sdk-docs

title: SDK 与文档站设计原则
followups: [sdk-docs-followup-1, sdk-docs-followup-2, sdk-docs-followup-3]
difficulty: 进阶
tags: [SDK, 文档]

### 一句话

回答「SDK 与文档站设计原则」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么很多团队技术能力不差，但做出来的 SDK 和文档却难用？

### 答案要点

- SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南
- 失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”

#### 工程化补充

- 场景前提：先定义 SDK 与文档站设计原则 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 SDK 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SDK 的可复现用例、线上监控指标和回退演练记录。

### 追问

- 推动「SDK 与文档站设计原则」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「SDK 与文档站设计原则」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 SDK、文档，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 好的 SDK 文档本身就是架构的一部分，因为它决定能力如何被团队消费

## microfrontend

title: 微前端什么时候值得做，什么时候只是把复杂度前置
followups: [microfrontend-followup-1, microfrontend-followup-2, microfrontend-followup-3]
difficulty: 资深
tags: [微前端, ModuleFederation]

### 一句话

讲「微前端什么时候值得做，什么时候只是把复杂度前置」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你会在什么情况下建议团队使用微前端？它真正的收益和代价分别是什么？

### 答案要点

- 微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移
- 代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度
- 真正能否落地，取决于团队是否愿意维护宿主契约，例如路由协议、鉴权上下文、埋点规范、公共依赖版本和故障隔离策略

#### 工程化补充

- 实施步骤：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

### 代码示例

```ts
// qiankun 主应用注册子应用
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'react-app',
    entry: '//localhost:7100',
    container: '#sub-container',
    activeRule: '/react',
    props: { user: getCurrentUser(), token: getToken() },
  },
  {
    name: 'vue-app',
    entry: '//localhost:7200',
    container: '#sub-container',
    activeRule: '/vue',
  },
]);
start({ sandbox: { strictStyleIsolation: true } });
```

```ts
// 子应用导出 lifecycle
let appInstance: any;
export async function bootstrap() {
  console.log('bootstrap');
}
export async function mount(props: any) {
  appInstance = createApp(App);
  appInstance.provide('hostProps', props);
  appInstance.mount(props.container.querySelector('#app'));
}
export async function unmount() {
  appInstance.unmount();
}
```

```ts
// Module Federation (Webpack 5 / Vite plugin) 替代方案
// vite.config.ts
import federation from '@originjs/vite-plugin-federation';
export default {
  plugins: [
    federation({
      name: 'host',
      remotes: {
        remoteApp: 'http://localhost:5001/assets/remoteEntry.js',
      },
      shared: ['vue', 'pinia'],
    }),
  ],
};
// 业务侧
const RemoteWidget = defineAsyncComponent(() => import('remoteApp/Widget'));
```

### 常见误区

- 上来就上 qiankun / Module Federation，但其实只是几个独立路由——是过度工程
- 多个子应用各自带自己的 React → 体积爆炸；MF 用 shared 配置共享 vendor
- 子应用 CSS 互相污染——用 CSS Modules / Shadow DOM 隔离

### 追问

- single-spa、qiankun、Module Federation 区别
- 微前端最容易出问题的是哪一块（路由 / 共享状态 / 样式）
- 子应用之间通信方案（自定义 Event / Pub-Sub / 全局 store）

### 延伸

- 如果一个团队只是想"代码分模块"，通常组件化、monorepo、模块化路由就够了

## islands-rsc

title: 岛屿架构、RSC、部分水合分别在优化什么
followups: [islands-rsc-followup-1, islands-rsc-followup-2, islands-rsc-followup-3]
links: [22-react/react-server-components, 03-vue/advanced-features, 03-vue/nuxt3-overview]
difficulty: 资深
tags: [Islands, RSC, SSR]

### 一句话

回答「岛屿架构、RSC、部分水合分别在优化什么」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

岛屿架构、React Server Components、部分水合这些概念经常一起出现，它们各自在解决什么问题？

### 答案要点

- 岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 部分水合关注的是减少整页统一 hydration 的成本
- RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名
- 三者共同目标都与降低首屏 JS、减少客户端工作量有关，但抽象层级和框架实现方式不同

#### 工程化补充

- 场景前提：回答 岛屿架构、RSC、部分水合分别在优化什么 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 岛屿架构、RSC、部分水合分别在优化什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 追问

- 在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「岛屿架构、RSC、部分水合分别在优化什么」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。
- 相关标签是 Islands、RSC、SSR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 这类架构的价值高度依赖内容型页面、商城、营销站等场景；纯重交互后台收益未必高
- RSC 已能作为应用开发模型稳定使用，但对框架/打包器作者来说，底层实现接口仍要密切跟随框架版本演进

## lowcode-platform

title: 低代码/搭建平台的核心模块是什么
followups: [lowcode-platform-followup-1, lowcode-platform-followup-2, lowcode-platform-followup-3]
difficulty: 资深
tags: [低代码, Schema, 物料]

### 一句话

这题的高分关键是把 低代码 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

如果让你设计一个低代码页面搭建平台，你会把系统拆成哪些核心模块？

### 答案要点

- schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 物料体系：组件元数据、属性面板、默认配置、版本与兼容策略
- 编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统
- 出码 / 运行时：实时预览、渲染引擎、代码生成、部署与发布能力

#### 工程化补充

- 场景前提：回答 低代码/搭建平台的核心模块 时先锁定 低代码 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 低代码 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 低代码 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```ts
// 1. Schema 描述：组件树 + 属性 + 事件 + 数据源
interface ComponentSchema {
  id: string;
  type: string; // 物料类型 'Button' / 'Form' / 'Table'
  props: Record<string, any>;
  events?: Record<string, ActionSchema>;
  children?: ComponentSchema[];
  dataSource?: { type: 'static' | 'api'; value: any };
}

interface ActionSchema {
  type: 'navigate' | 'request' | 'setState';
  params: Record<string, any>;
}

// 2. 渲染引擎：递归把 Schema 渲染为真实组件
import { h, defineComponent } from 'vue';
const materials: Record<string, any> = {
  Button: () => import('./materials/Button.vue'),
  Form: () => import('./materials/Form.vue'),
  Table: () => import('./materials/Table.vue'),
};

function renderSchema(schema: ComponentSchema): any {
  const Cmp = materials[schema.type];
  return h(
    Cmp,
    {
      ...schema.props,
      ...mapEvents(schema.events),
    },
    schema.children?.map((c) => renderSchema(c)) ?? [],
  );
}

function mapEvents(events?: Record<string, ActionSchema>) {
  if (!events) return {};
  const out: Record<string, Function> = {};
  for (const [name, action] of Object.entries(events)) {
    out[`on${name}`] = () => executeAction(action);
  }
  return out;
}
```

```ts
// 3. 出码：把 Schema 转为 Vue 单文件
function generateVue(schema: ComponentSchema): string {
  const template = renderTemplate(schema);
  const script = `<script setup lang="ts">\nimport ${schema.type} from '@/materials/${schema.type}.vue';\n</script>`;
  return `<template>${template}</template>\n${script}`;
}

function renderTemplate(s: ComponentSchema): string {
  const propsStr = Object.entries(s.props)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const children = s.children?.map(renderTemplate).join('') ?? '';
  return `<${s.type} ${propsStr}>${children}</${s.type}>`;
}
```

### 追问

- 「低代码/搭建平台的核心模块是什么」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「低代码/搭建平台的核心模块是什么」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 低代码、Schema、物料，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 低代码平台本质上是在设计一套"可长期演进的 UI DSL"
- 最大难点通常不是拖拽，而是 schema 稳定性与物料治理

## design-system-engineering

title: 设计系统的工程化（tokens / multi-brand / a11y）
followups: [design-system-engineering-followup-1, design-system-engineering-followup-2, design-system-engineering-followup-3]
difficulty: 资深
tags: [设计系统, Design Tokens]

### 一句话

回答「设计系统的工程化（tokens / multi-brand / a11y）」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

搭一个能撑起大公司多产品线的设计系统，工程上要做对哪些事？

### 答案要点

- Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色
- 组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）
- 文档：Storybook + a11y addon + 视觉回归（Chromatic / Playwright + 截图）

#### 工程化补充

- 场景前提：先限定 设计系统 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 设计系统的工程化（tokens / multi-brand / a11y） 的结论不成立。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```json
{
  "color": {
    "primary": {
      "50": { "value": "#eff6ff" },
      "500": { "value": "#3b82f6" },
      "900": { "value": "#1e3a8a" }
    },
    "text": {
      "default": { "value": "{color.primary.900.value}" }
    }
  }
}
```

```ts
import StyleDictionary from 'style-dictionary';

StyleDictionary.extend({
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [{ destination: 'tokens.css', format: 'css/variables' }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [{ destination: 'tokens.ts', format: 'javascript/es6' }],
    },
    ios: {
      transformGroup: 'ios',
      buildPath: 'dist/ios/',
      files: [{ destination: 'Tokens.swift', format: 'ios-swift/class.swift' }],
    },
  },
}).buildAllPlatforms();
```

### 追问

- 推动「设计系统的工程化（tokens / multi-brand / a11y）」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「设计系统的工程化（tokens / multi-brand / a11y）」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 设计系统、Design Tokens，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 多品牌切换可在运行时通过 CSS 自定义属性切换 token，无需重新构建
- 设计系统的核心收益是"减少决策次数"，比强加约束更重要

## error-boundaries-resilience

title: 前端错误隔离与韧性设计
followups: [error-boundaries-resilience-followup-1, error-boundaries-resilience-followup-2, error-boundaries-resilience-followup-3]
difficulty: 资深
tags: [错误边界, 韧性]

### 一句话

讲「前端错误隔离与韧性设计」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

某个独立模块挂了不应该让整个页面白屏，工程上怎么做"错误隔离"？

### 答案要点

- React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局
- 第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹
- Iframe 隔离：第三方 widget 用 sandbox iframe，挂了不影响主框架

#### 工程化补充

- 场景前提：落地 前端错误隔离与韧性设计 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```tsx
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, info);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function Page() {
  return (
    <Layout>
      <ErrorBoundary fallback={<ModuleFallback name="商品推荐" />}>
        <Recommendation />
      </ErrorBoundary>
      <ErrorBoundary fallback={<ModuleFallback name="评论列表" />}>
        <Suspense fallback={<Skeleton />}>
          <Comments />
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
```

```ts
async function loadWithRetry<T>(loader: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await loader();
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 2 ** i * 200 + Math.random() * 100));
    }
  }
  throw new Error('unreachable');
}
```

### 追问

- 推动「前端错误隔离与韧性设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端错误隔离与韧性设计」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 错误边界、韧性，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 韧性设计的关键是"假设任何子模块都可能挂"，把隔离点提前规划好
- 关键页面要做混沌测试：故意让某个 API 返回错误，验证降级是否生效

## monorepo-vs-multirepo

title: Monorepo 和 Multirepo 怎么选
followups: [monorepo-vs-multirepo-followup-1, monorepo-vs-multirepo-followup-2, monorepo-vs-multirepo-followup-3]
difficulty: 进阶
tags: [架构, Monorepo]

### 一句话

这题的高分关键是把 架构 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

请说明 Monorepo 与 Multirepo 的优缺点，以及前端常见的 Monorepo 工具栈。

### 答案要点

- Monorepo 的优点
- 跨包重构成本低、原子提交
- 共享 lint / tsconfig / CI 配置
- 发版可以联动（changeset 一次 PR 多包升级）

#### 工程化补充

- 场景前提：落地 Monorepo 和 Multirepo 怎么选 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"] },
    "lint": {}
  }
}
```

### 追问

- 推动「Monorepo 和 Multirepo 怎么选」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Monorepo 和 Multirepo 怎么选」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 架构、Monorepo，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大厂自研：字节 Vesna、阿里 Bigfish、Google google3（含整个公司代码）
- Monorepo 的关键是"远程缓存"——Turborepo Remote Cache / Nx Cloud
- 不管哪种方案，CI 速度和构建可缓存性是核心生产力

## layering-boundary-followup-1

title: 追问：结合真实业务约束，真要把「前端架构中的分层、边界与依赖方向」推到线上，你会如何围绕 分层 设计灰度节奏、回滚条件和迁移路径
difficulty: 基础
tags: [分层, 边界, 追问]
parent: layering-boundary

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「前端架构中的分层、边界与依赖方向」推到线上，你会如何围绕 分层 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「前端架构中的分层、边界与依赖方向」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：前端架构中的分层 边界与依赖方向 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- 分层：页面编排、领域逻辑、数据访问、基础设施各管各的。
- 边界：改一个需求牵一片、复用困难、测试困难、认知负担飙升。

#### 风险与验收

- 主要风险：若 前端架构中的分层 边界与依赖方向 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：发布验收至少看 前端架构中的分层 边界与依赖方向 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## local-first-sync-crdt

title: Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步]
links: [21-interview-special/design-realtime-collab]
followups: [local-first-sync-crdt-followup-1, local-first-sync-crdt-followup-2, local-first-sync-crdt-followup-3]

### 一句话

这题的高分关键是把 LocalFirst 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

如果要设计一个类似文档、白板、任务管理或客服工作台的 local-first 前端应用，同步引擎应该如何处理离线、冲突和多端一致性？

### 答案要点

- 本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备。
- 数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化。
- 冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并。
- 前端要显式展示同步状态：已保存、本地待同步、冲突待处理、权限失败、设备离线，不能只在控制台报错。

#### 工程化补充

- 场景前提：回答 Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计 时先锁定 LocalFirst 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 LocalFirst 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 LocalFirst 的可复现用例、线上监控指标和回退演练记录。

### 常见误区

- 把 CRDT 当银弹，忽略业务语义；很多冲突需要产品规则或人工确认，不是算法自动合并就结束。
- 服务端只做消息转发，不校验权限和操作合法性，导致离线操作重放时越权。
- 没有日志压缩和快照机制，操作越多启动越慢，同步也越来越重。
- UI 不展示同步状态，用户以为已保存，实际还停留在本地队列里。

### 追问

- CRDT、OT、last-write-wins 分别适合哪些数据类型？
- 离线操作恢复联网后如何保证幂等和顺序？
- local-first 应用如何处理权限变化和本地敏感数据？

## type-safe-api-contract

title: OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全]
links: [02-typescript/tsconfig-strict]
followups: [type-safe-api-contract-followup-1, type-safe-api-contract-followup-2, type-safe-api-contract-followup-3]

### 一句话

讲「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

OpenAPI、tRPC 和 GraphQL Codegen 分别如何帮助前后端契约类型化？团队该如何选择并落地到开发、测试和发布流程里？

### 答案要点

- OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步。
- tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计。
- GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进。
- 运行时仍要校验：TypeScript 类型只在编译期有效，边界处需要 zod、valibot、JSON Schema 或服务端校验兜底。

#### 工程化补充

- 场景前提：OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 常见误区

- 只生成 TypeScript 类型，不生成请求层和 mock，结果类型和真实响应仍可能漂移。
- 把 tRPC 当作所有团队的默认答案，忽略跨语言、移动端、外部开放平台和 API 网关治理。
- GraphQL 只关注灵活查询，不治理 operation、缓存 key 和 schema 弃用流程。
- 没有运行时校验，后端异常数据穿过类型系统后在 UI 层才爆。

### 追问

- OpenAPI schema 和后端实现如何防止漂移？
- tRPC 适合拆分成多个服务或开放给第三方吗？
- 类型化契约如何和契约测试、mock 服务、灰度发布结合？

## design-patterns-followup-1

title: 追问：在当前团队与业务约束下，真要把「前端里最常见的设计模式如何落地」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [设计模式, 实战, 追问]
parent: design-patterns

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「前端里最常见的设计模式如何落地」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「前端里最常见的设计模式如何落地」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：前端里最常见 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- 设计模式：围绕「前端里最常见的设计模式如何落地」里的 设计模式 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：围绕 前端里最常见 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 前端里最常见 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## dependency-injection-followup-1

title: 追问：结合真实业务约束，真要把「依赖注入在前端什么时候有价值，什么时候会过度设计」推到线上，你会如何围绕 DI 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「依赖注入在前端什么时候有价值，什么时候会过度设计」推到线上，你会如何围绕 DI 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「依赖注入在前端什么时候有价值，什么时候会过度设计」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：回滚条件 与 迁移路径 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- DI：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关。
- InversifyJS：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。
- Tsyringe：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。

#### 风险与验收

- 主要风险：若 回滚条件 与 迁移路径 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关。

## state-management-followup-1

title: 追问：结合真实业务约束，真在项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，你会如何划分 状态管理 并控制更新时机
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真在项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，你会如何划分 状态管理 并控制更新时机？

### 答案要点

#### 直答

- 结论：回答 Flux 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先定位 Flux 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Flux：Flux/Redux 倾向单向数据流、显式更新和可追踪性。
- Redux：Flux/Redux 倾向单向数据流、显式更新和可追踪性。
- MobX：MobX/Pinia 更强调开发体验和细粒度响应式。

#### 风险与验收

- 主要风险：Flux 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 Flux 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## framework-comparison-followup-1

title: 追问：在当前团队与业务约束下，当「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」牵涉跨组件状态时，你会如何围绕 框架选型 设计响应式边界，保证后续好维护
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」牵涉跨组件状态时，你会如何围绕 框架选型 设计响应式边界，保证后续好维护？

### 答案要点

#### 直答

- 结论：先量化 Vue 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先拆分 Vue 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- Vue：Vue 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React：React 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Solid：Solid 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Vue 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 Vue 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## component-library-followup-1

title: 追问：如果「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」涉及历史数据兼容，你会如何安排迁移与回退链路
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」涉及历史数据兼容，你会如何安排迁移与回退链路？

### 答案要点

#### 直答

- 结论：一致性 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。
- 关键动作：一致性 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- 组件库：围绕「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里的 组件库 推进上线时，要明确每个批次的放量门槛和回退条件。
- DesignSystem：DesignSystem 是「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 一致性 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：验收看 一致性 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## clean-architecture-followup-1

title: 追问：你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素？

### 答案要点

#### 直答

- 结论：「Clean Architecture、DDD 思想在前端怎么落地」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先梳理 Clean Architecture 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Clean Architecture：Clean Architecture 是「Clean Architecture、DDD 思想在前端怎么落地」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- DDD：DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来。
- CleanArchitecture：CleanArchitecture 是「Clean Architecture、DDD 思想在前端怎么落地」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Clean Architecture、DDD 思想在前端怎么落地」里，Clean Architecture 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Clean Architecture 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## feature-flag-followup-1

title: 追问：在「Feature Flag、灰度发布与实验系统的前端视角」场景下，真要把「Feature Flag、灰度发布与实验系统的前端视角」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Feature Flag、灰度发布与实验系统的前端视角」场景下，真要把「Feature Flag、灰度发布与实验系统的前端视角」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「Feature Flag、灰度发布与实验系统的前端视角」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：灰度策略可按用户、组织、比例、环境、地区等维度下发。

#### 术语解释

- Feature Flag：围绕「Feature Flag、灰度发布与实验系统的前端视角」里的 Feature Flag 推进上线时，要明确每个批次的放量门槛和回退条件。
- 灰度：灰度策略可按用户、组织、比例、环境、地区等维度下发。
- AB实验：在「Feature Flag、灰度发布与实验系统的前端视角」里，AB实验 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：Feature Flag 灰度发布与实验系统的前端视角 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 Feature Flag 灰度发布与实验系统的前端视角 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## sdk-docs-followup-1

title: 追问：以「SDK 与文档站设计原则」为例，真要把「SDK 与文档站设计原则」推到线上，你会如何围绕 SDK 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「SDK 与文档站设计原则」为例，真要把「SDK 与文档站设计原则」推到线上，你会如何围绕 SDK 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「SDK 与文档站设计原则」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南。

#### 术语解释

- SDK：SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担。
- 文档：快速开始、概念、API、FAQ、最佳实践、迁移指南。

#### 风险与验收

- 主要风险：若 SDK 与文档站设计原则 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：验收看 SDK 与文档站设计原则 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## microfrontend-followup-1

title: 追问：如果回头看「微前端什么时候值得做，什么时候只是把复杂度前置」这题，你会优先排查哪些复杂度陷阱和异常输入
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果回头看「微前端什么时候值得做，什么时候只是把复杂度前置」这题，你会优先排查哪些复杂度陷阱和异常输入？

### 答案要点

#### 直答

- 结论：先排查 异常输入 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度。

#### 术语解释

- 微前端：微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景。
- ModuleFederation：ModuleFederation 是「微前端什么时候值得做，什么时候只是把复杂度前置」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 异常输入 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：异常输入 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## microfrontend-followup-2

title: 追问：以「微前端什么时候值得做，什么时候只是把复杂度前置」为例，如果数据规模扩大一个数量级，你会如何围绕 微前端 调整数据结构或算法
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「微前端什么时候值得做，什么时候只是把复杂度前置」为例，如果数据规模扩大一个数量级，你会如何围绕 微前端 调整数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 微前端 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度。

#### 术语解释

- 微前端：微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景。
- ModuleFederation：ModuleFederation 是「微前端什么时候值得做，什么时候只是把复杂度前置」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：微前端 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：微前端 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## microfrontend-followup-3

title: 追问：如果要向团队说明「微前端什么时候值得做，什么时候只是把复杂度前置」实现可信，你会展示哪些围绕 微前端 的正确性证据
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要向团队说明「微前端什么时候值得做，什么时候只是把复杂度前置」实现可信，你会展示哪些围绕 微前端 的正确性证据？

### 答案要点

#### 直答

- 结论：先定「微前端什么时候值得做，什么时候只是把复杂度前置」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度。

#### 术语解释

- 微前端：微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景。
- ModuleFederation：ModuleFederation 是「微前端什么时候值得做，什么时候只是把复杂度前置」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「微前端什么时候值得做，什么时候只是把复杂度前置」里，微前端 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：微前端 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## islands-rsc-followup-1

title: 追问：从工程落地角度看，在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 直答

- 结论：先画出 岛屿架构 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 岛屿架构 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- RSC：RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。
- Islands：Islands 是「岛屿架构、RSC、部分水合分别在优化什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SSR：RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。

#### 风险与验收

- 主要风险：岛屿架构 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「岛屿架构、RSC、部分水合分别在优化什么」里，岛屿架构 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## lowcode-platform-followup-1

title: 追问：围绕「低代码/搭建平台的核心模块」做方案评审时，哪些 低代码 边界输入最容易导致结论失真
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「低代码/搭建平台的核心模块」做方案评审时，哪些 低代码 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先锁定 低代码/搭建平台的核心模块 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 低代码/搭建平台的核心模块 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 低代码：围绕「低代码/搭建平台的核心模块」里的 低代码 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- Schema：Schema 是「低代码/搭建平台的核心模块」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 物料：组件元数据、属性面板、默认配置、版本与兼容策略。

#### 风险与验收

- 主要风险：低代码/搭建平台的核心模块 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 低代码/搭建平台的核心模块 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## design-system-engineering-followup-1

title: 追问：从工程落地角度看，真要把「设计系统的工程化（tokens / multi-brand / a11y）」推到线上，你会如何围绕 设计系统 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，真要把「设计系统的工程化（tokens / multi-brand / a11y）」推到线上，你会如何围绕 设计系统 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「设计系统的工程化（tokens / multi-brand / a11y）」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：设计系统的工程化（tokens 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- tokens：在「设计系统的工程化（tokens / multi-brand / a11y）」里，tokens 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- multi-brand：围绕「设计系统的工程化（tokens / multi-brand / a11y）」里的 multi-brand 推进上线时，要明确每个批次的放量门槛和回退条件。
- a11y：Storybook + a11y addon + 视觉回归（Chromatic / Playwright + 截图）。

#### 风险与验收

- 主要风险：设计系统的工程化（tokens 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 设计系统的工程化（tokens 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## error-boundaries-resilience-followup-1

title: 追问：以「前端错误隔离与韧性设计」为例，真要把「前端错误隔离与韧性设计」推到线上，你会如何围绕 错误边界 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端错误隔离与韧性设计」为例，真要把「前端错误隔离与韧性设计」推到线上，你会如何围绕 错误边界 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「前端错误隔离与韧性设计」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：围绕 前端错误隔离与韧性设计 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- 错误边界：在「前端错误隔离与韧性设计」里，错误边界 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 韧性：围绕「前端错误隔离与韧性设计」里的 韧性 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：前端错误隔离与韧性设计 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 前端错误隔离与韧性设计 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## monorepo-vs-multirepo-followup-1

title: 追问：在当前团队与业务约束下，真要把「Monorepo 和 Multirepo 怎么选」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「Monorepo 和 Multirepo 怎么选」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「Monorepo 和 Multirepo 怎么选」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：Monorepo 与 Multirepo 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- Monorepo：Monorepo 的优点。
- Multirepo：Multirepo 是「Monorepo 和 Multirepo 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 架构：围绕「Monorepo 和 Multirepo 怎么选」里的 架构 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：Monorepo 与 Multirepo 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 Monorepo 与 Multirepo 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## url-state-sync

title: URL State、搜索参数与浏览器历史怎么设计
difficulty: 进阶
tags: [URL State, 路由, 状态同步]
links: [state-management, 05-browser/navigation-api-app-history, 22-react/react-router-data-loaders]
followups: [url-state-sync-followup-1, url-state-sync-followup-2, url-state-sync-followup-3]

### 一句话

讲「URL State、搜索参数与浏览器历史怎么设计」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

列表筛选、搜索、分页、Tab、详情返回时，哪些状态应该同步到 URL？如何避免 URL、组件 state、全局 store 三份状态互相打架？

### 答案要点

- 适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人。
- 不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入。
- 设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新。
- URL 写入要做 debounce 和 replace/push 区分：输入中用 replace，用户提交搜索或翻页可用 push 形成历史记录。

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

### 代码示例

```ts
const VALID_SORT = new Set(['created-desc', 'created-asc', 'priority']);

function readListState(search: URLSearchParams) {
  const sort = search.get('sort') || 'created-desc';
  const pageNumber = Number(search.get('page') || 1);
  const page =
    Number.isFinite(pageNumber) && Number.isInteger(pageNumber) && pageNumber > 0
      ? Math.min(pageNumber, 500)
      : 1;
  return {
    keyword: search.get('q')?.trim() || '',
    page,
    tags: search.get('tags')?.split(',').filter(Boolean) ?? [],
    sort: VALID_SORT.has(sort) ? sort : 'created-desc',
  };
}

function writeListState(state: ListState) {
  const params = new URLSearchParams();
  if (state.keyword) params.set('q', state.keyword);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.tags.length) params.set('tags', state.tags.join(','));
  if (state.sort !== 'created-desc') params.set('sort', state.sort);
  history.replaceState(null, '', `?${params.toString()}`);
}
```

### 常见误区

- 每次输入一个字符都 `pushState`，导致浏览器后退要退几十次。
- URL 和 store 双向 watch，缺少同步标记，形成循环更新或闪烁。
- 把敏感搜索词、草稿内容、临时 token 放到 query，进入日志、截图和分享链接。
- query 不做白名单，非法参数直接 cast 成业务状态。

### 追问

- 什么时候用 `push`，什么时候用 `replace`？
- URL 状态和服务端数据缓存 key 有什么关系？
- 如果筛选条件很多，URL 太长该怎么处理？

### 延伸

- React Router loaders、Next searchParams、Vue Router query 都在鼓励把可恢复页面状态显式建模。
- URL State 的价值不只是刷新恢复，也包括客服排障、埋点分析和可复现 bug。

## web-components-design-system

title: Web Components / Shadow DOM 在组件库和微前端里什么时候值得用
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端]
links: [component-library, microfrontend, 04-css/css-style-queries-and-scope]
followups: [web-components-design-system-followup-1, web-components-design-system-followup-2, web-components-design-system-followup-3]

### 一句话

回答「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

在设计系统、低代码物料、第三方 widget 或微前端场景中，什么时候应该考虑 Web Components / Shadow DOM？它们的收益和代价是什么？

### 答案要点

- 适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives。
- Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影。
- 样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通。
- 与框架集成要处理属性/事件差异：布尔属性、对象属性、custom event、受控值和 ref 都需要 wrapper。

#### 工程化补充

- 场景前提：先说明浏览器调度与渲染阶段，再讲 Web Components / Shadow DOM 在组件库和微前端里什么时候值得用，否则容易把现象当结论。
- 实施步骤：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

### 代码示例

```ts
class KapRating extends HTMLElement {
  static observedAttributes = ['value'];

  #root = this.attachShadow({ mode: 'open' });

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const raw = Number(this.getAttribute('value') || 0);
    // clamp 到 repeat() 可接受的范围，避免非法 attribute 让渲染抛错。
    const value = Number.isFinite(raw) ? Math.max(0, Math.min(5, Math.round(raw))) : 0;
    this.#root.innerHTML = `
      <style>
        button { color: var(--kap-primary, #0ea5e9); }
      </style>
      <button aria-label="当前评分 ${value} 分">${'★'.repeat(value)}${'☆'.repeat(5 - value)}</button>
    `;
  }
}

customElements.define('kap-rating', KapRating);
```

### 常见误区

- 以为 Shadow DOM 自动解决所有样式问题，结果主题、弹层和全局字体变得更难管理。
- 直接把复杂业务组件做成 Web Component，导致状态、路由、表单和调试都绕远路。
- 只测 Chrome，不测 Safari、移动 WebView 和框架 wrapper。
- 忽略可访问性，Shadow DOM 内外 label、focus 和 aria 关系断开。

### 追问

- Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别？
- Web Component 如何和 React 的受控表单模型配合？
- 微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题？

### 延伸

- 很多设计系统会选择“核心 token + 多框架 wrapper”，不一定直接把所有组件做成 Web Components。
- 如果组件需要深度依赖业务状态和路由，框架原生组件往往更合适。

## layering-boundary-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 分层 定义「前端架构中的分层、边界与依赖方向」的先后改造顺序
difficulty: 基础
tags: [分层, 边界, 追问]
parent: layering-boundary
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 分层 定义「前端架构中的分层、边界与依赖方向」的先后改造顺序？

### 答案要点

#### 直答

- 结论：先拆分 前端架构中的分层 边界与依赖方向 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 前端架构中的分层 边界与依赖方向 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 分层：页面编排、领域逻辑、数据访问、基础设施各管各的。
- 边界：改一个需求牵一片、复用困难、测试困难、认知负担飙升。

#### 风险与验收

- 主要风险：前端架构中的分层 边界与依赖方向 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 前端架构中的分层 边界与依赖方向 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## layering-boundary-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「前端架构中的分层、边界与依赖方向」还值不值得继续维护
difficulty: 基础
tags: [分层, 边界, 追问]
parent: layering-boundary
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「前端架构中的分层、边界与依赖方向」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：先锁定 前端架构中的分层 边界与依赖方向 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 前端架构中的分层 边界与依赖方向 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 分层：页面编排、领域逻辑、数据访问、基础设施各管各的。
- 边界：改一个需求牵一片、复用困难、测试困难、认知负担飙升。

#### 风险与验收

- 主要风险：在「前端架构中的分层、边界与依赖方向」场景下，前端架构中的分层 边界与依赖方向 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：验收看 前端架构中的分层 边界与依赖方向 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## design-patterns-followup-2

title: 追问：以「前端里最常见的设计模式如何落地」为例，面对团队能力差异，你会如何围绕 设计模式 把「前端里最常见的设计模式如何落地」拆成可并行推进的小阶段
difficulty: 进阶
tags: [设计模式, 实战, 追问]
parent: design-patterns
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端里最常见的设计模式如何落地」为例，面对团队能力差异，你会如何围绕 设计模式 把「前端里最常见的设计模式如何落地」拆成可并行推进的小阶段？

### 答案要点

#### 直答

- 结论：先梳理 前端里最常见 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 前端里最常见 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 设计模式：在「前端里最常见的设计模式如何落地」这题里，设计模式 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 前端里最常见 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「前端里最常见的设计模式如何落地」里 前端里最常见 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## design-patterns-followup-3

title: 追问：以「前端里最常见的设计模式如何落地」为例，如果「前端里最常见的设计模式如何落地」进入维护期，你会优先围绕 设计模式 监控哪些指标来预警风险
difficulty: 进阶
tags: [设计模式, 实战, 追问]
parent: design-patterns
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端里最常见的设计模式如何落地」为例，如果「前端里最常见的设计模式如何落地」进入维护期，你会优先围绕 设计模式 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：先定义 前端里最常见 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 前端里最常见 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 设计模式：围绕「前端里最常见的设计模式如何落地」里的 设计模式 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 前端里最常见 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：前端里最常见 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## dependency-injection-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 DI 安排「依赖注入在前端什么时候有价值，什么时候会过度设计」的渐进改造路线
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 DI 安排「依赖注入在前端什么时候有价值，什么时候会过度设计」的渐进改造路线？

### 答案要点

#### 直答

- 结论：先画出 价值 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 价值 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- DI：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关。
- InversifyJS：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。
- Tsyringe：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。

#### 风险与验收

- 主要风险：在「依赖注入在前端什么时候有价值，什么时候会过度设计」场景下，价值 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关。

## dependency-injection-followup-3

title: 追问：从工程落地角度看，为了确认「依赖注入在前端什么时候有价值，什么时候会过度设计」在 DI 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了确认「依赖注入在前端什么时候有价值，什么时候会过度设计」在 DI 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：验证 效率信号 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 效率信号 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- DI：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关。
- InversifyJS：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。
- Tsyringe：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。

#### 风险与验收

- 主要风险：若 效率信号 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关。

## state-management-followup-2

title: 追问：当「Flux、Redux、MobX、Pinia、Signals 的核心差别」让联调成本持续升高时，你会先拆哪条关键链路来止损
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「Flux、Redux、MobX、Pinia、Signals 的核心差别」让联调成本持续升高时，你会先拆哪条关键链路来止损？

### 答案要点

#### 直答

- 结论：回答 Flux 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先量化 Flux 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- Flux：Flux/Redux 倾向单向数据流、显式更新和可追踪性。
- Redux：Flux/Redux 倾向单向数据流、显式更新和可追踪性。
- MobX：MobX/Pinia 更强调开发体验和细粒度响应式。

#### 风险与验收

- 主要风险：围绕 Flux 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 Flux 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## state-management-followup-3

title: 追问：在当前团队与业务约束下，如果比较「Flux、Redux、MobX、Pinia、Signals 的核心差别」与替代方案，你会如何基于 状态管理 判断不同团队阶段的最佳选择
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果比较「Flux、Redux、MobX、Pinia、Signals 的核心差别」与替代方案，你会如何基于 状态管理 判断不同团队阶段的最佳选择？

### 答案要点

#### 直答

- 结论：做 Flux 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。
- 关键动作：先排查 Flux 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Flux：Flux/Redux 倾向单向数据流、显式更新和可追踪性。
- Redux：Flux/Redux 倾向单向数据流、显式更新和可追踪性。
- MobX：MobX/Pinia 更强调开发体验和细粒度响应式。

#### 风险与验收

- 主要风险：若 Flux 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 Flux 收益提升和维护成本变化，确保取舍结论可持续。

## framework-comparison-followup-2

title: 追问：从工程落地角度看，如果团队反馈「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」不好维护，你会如何围绕 框架选型 做分层重构和验证
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果团队反馈「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」不好维护，你会如何围绕 框架选型 做分层重构和验证？

### 答案要点

#### 直答

- 结论：先定义 Vue 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 Vue 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Vue：Vue 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React：React 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Solid：Solid 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Vue 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Vue 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## framework-comparison-followup-3

title: 追问：在评审「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，你会如何围绕 框架选型 向团队解释“什么时候值得用，什么时候别硬上”
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在评审「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，你会如何围绕 框架选型 向团队解释“什么时候值得用，什么时候别硬上”？

### 答案要点

#### 直答

- 结论：评估 Vue 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先排查 Vue 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- Vue：Vue 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- React：React 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Solid：Solid 是「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 Vue 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：围绕 Vue 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## component-library-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 组件库 把「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 组件库 把「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 结论：把 一致性 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先统一 一致性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 组件库：在「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里，组件库 是验收对象，必须给可量化指标、日志信号和测试证据。
- DesignSystem：DesignSystem 是「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里，一致性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：一致性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## component-library-followup-3

title: 追问：从工程落地角度看，你会怎样定义「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的长期健康度，并通过指标持续校准
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会怎样定义「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的长期健康度，并通过指标持续校准？

### 答案要点

#### 直答

- 结论：验证 一致性 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 一致性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 组件库：在「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里，组件库 是验收对象，必须给可量化指标、日志信号和测试证据。
- DesignSystem：DesignSystem 是「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」里，一致性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：一致性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## feature-flag-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「Feature Flag、灰度发布与实验系统的前端视角」的渐进改造路线
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「Feature Flag、灰度发布与实验系统的前端视角」的渐进改造路线？

### 答案要点

#### 直答

- 结论：Feature Flag 灰度发布与实验系统的前端视角 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。
- 关键动作：灰度策略可按用户、组织、比例、环境、地区等维度下发。

#### 术语解释

- Feature Flag：围绕「Feature Flag、灰度发布与实验系统的前端视角」里的 Feature Flag 推进上线时，要明确每个批次的放量门槛和回退条件。
- 灰度：灰度策略可按用户、组织、比例、环境、地区等维度下发。
- AB实验：在「Feature Flag、灰度发布与实验系统的前端视角」里，AB实验 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：围绕 Feature Flag 灰度发布与实验系统的前端视角 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 Feature Flag 灰度发布与实验系统的前端视角 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## feature-flag-followup-3

title: 追问：在当前团队与业务约束下，你会怎样定义「Feature Flag、灰度发布与实验系统的前端视角」的长期健康度，并通过指标持续校准
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样定义「Feature Flag、灰度发布与实验系统的前端视角」的长期健康度，并通过指标持续校准？

### 答案要点

#### 直答

- 结论：验证 Feature Flag 灰度发布与实验系统的前端视角 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：灰度策略可按用户、组织、比例、环境、地区等维度下发。

#### 术语解释

- Feature Flag：围绕「Feature Flag、灰度发布与实验系统的前端视角」里的 Feature Flag 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 灰度：灰度策略可按用户、组织、比例、环境、地区等维度下发。
- AB实验：在「Feature Flag、灰度发布与实验系统的前端视角」里，AB实验 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 Feature Flag 灰度发布与实验系统的前端视角 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Feature Flag 灰度发布与实验系统的前端视角 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## sdk-docs-followup-2

title: 追问：以「SDK 与文档站设计原则」为例，面对团队能力差异，你会如何围绕 SDK 把「SDK 与文档站设计原则」拆成可并行推进的小阶段
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「SDK 与文档站设计原则」为例，面对团队能力差异，你会如何围绕 SDK 把「SDK 与文档站设计原则」拆成可并行推进的小阶段？

### 答案要点

#### 直答

- 结论：先把 SDK 与文档站设计原则 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南。

#### 术语解释

- SDK：SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担。
- 文档：快速开始、概念、API、FAQ、最佳实践、迁移指南。

#### 风险与验收

- 主要风险：在「SDK 与文档站设计原则」里，SDK 与文档站设计原则 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「SDK 与文档站设计原则」里 SDK 与文档站设计原则 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## sdk-docs-followup-3

title: 追问：以「SDK 与文档站设计原则」为例，如果「SDK 与文档站设计原则」进入维护期，你会优先围绕 SDK 监控哪些指标来预警风险
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「SDK 与文档站设计原则」为例，如果「SDK 与文档站设计原则」进入维护期，你会优先围绕 SDK 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：把 SDK 与文档站设计原则 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南。

#### 术语解释

- SDK：SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担。
- 文档：快速开始、概念、API、FAQ、最佳实践、迁移指南。

#### 风险与验收

- 主要风险：若 SDK 与文档站设计原则 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：SDK 与文档站设计原则 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## islands-rsc-followup-2

title: 追问：以「岛屿架构、RSC、部分水合分别在优化什么」为例，你会如何围绕 Islands 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「岛屿架构、RSC、部分水合分别在优化什么」为例，你会如何围绕 Islands 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先定「岛屿架构、RSC、部分水合分别在优化什么」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先定义 岛屿架构 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- RSC：RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。
- Islands：Islands 是「岛屿架构、RSC、部分水合分别在优化什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SSR：RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。

#### 风险与验收

- 主要风险：岛屿架构 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「岛屿架构、RSC、部分水合分别在优化什么」里，岛屿架构 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## islands-rsc-followup-3

title: 追问：在「岛屿架构、RSC、部分水合分别在优化什么」场景下，如果要对比「岛屿架构、RSC、部分水合分别在优化什么」和替代方案，你会先看学习成本、维护成本还是 Islands 相关收益速度
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「岛屿架构、RSC、部分水合分别在优化什么」场景下，如果要对比「岛屿架构、RSC、部分水合分别在优化什么」和替代方案，你会先看学习成本、维护成本还是 Islands 相关收益速度？

### 答案要点

#### 直答

- 结论：先量化 岛屿架构 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先拆分 岛屿架构 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- RSC：RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。
- Islands：Islands 是「岛屿架构、RSC、部分水合分别在优化什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SSR：RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。

#### 风险与验收

- 主要风险：若 岛屿架构 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 岛屿架构 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## design-system-engineering-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 设计系统 定义「设计系统的工程化（tokens / multi-brand / a11y）」的先后改造顺序
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 设计系统 定义「设计系统的工程化（tokens / multi-brand / a11y）」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 设计系统的工程化（tokens 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 设计系统的工程化（tokens 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- tokens：围绕「设计系统的工程化（tokens / multi-brand / a11y）」里的 tokens 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- multi-brand：在「设计系统的工程化（tokens / multi-brand / a11y）」这题里，multi-brand 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- a11y：Storybook + a11y addon + 视觉回归（Chromatic / Playwright + 截图）。

#### 风险与验收

- 主要风险：在「设计系统的工程化（tokens / multi-brand / a11y）」里，设计系统的工程化（tokens 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「设计系统的工程化（tokens / multi-brand / a11y）」里 设计系统的工程化（tokens 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## design-system-engineering-followup-3

title: 追问：以「设计系统的工程化」为例，如果「设计系统的工程化」进入维护期，你会优先围绕 设计系统 监控哪些指标来预警风险
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「设计系统的工程化」为例，如果「设计系统的工程化」进入维护期，你会优先围绕 设计系统 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：验证 设计系统的工程化 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 设计系统的工程化 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 设计系统的工程化：设计系统的工程化 是「设计系统的工程化（tokens / multi-brand / a11y）」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 设计系统：在「设计系统的工程化（tokens / multi-brand / a11y）」里，设计系统 是验收对象，必须给可量化指标、日志信号和测试证据。
- Design Tokens：围绕「设计系统的工程化（tokens / multi-brand / a11y）」里的 Design Tokens 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「设计系统的工程化（tokens / multi-brand / a11y）」里，设计系统的工程化 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：设计系统的工程化 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## error-boundaries-resilience-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 错误边界 规划「前端错误隔离与韧性设计」的阶段目标与交付边界
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 错误边界 规划「前端错误隔离与韧性设计」的阶段目标与交付边界？

### 答案要点

#### 直答

- 结论：前端错误隔离与韧性设计 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先量化 前端错误隔离与韧性设计 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 错误边界：围绕「前端错误隔离与韧性设计」里的 错误边界 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 韧性：在「前端错误隔离与韧性设计」里，韧性 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 前端错误隔离与韧性设计 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：验收需同时对比 前端错误隔离与韧性设计 收益提升和维护成本变化，确保取舍结论可持续。

## error-boundaries-resilience-followup-3

title: 追问：从工程落地角度看，为了确认「前端错误隔离与韧性设计」在 错误边界 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了确认「前端错误隔离与韧性设计」在 错误边界 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：先定义 前端错误隔离与韧性设计 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先统一 前端错误隔离与韧性设计 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 错误边界：围绕「前端错误隔离与韧性设计」里的 错误边界 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 韧性：在「前端错误隔离与韧性设计」里，韧性 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「前端错误隔离与韧性设计」里，前端错误隔离与韧性设计 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：前端错误隔离与韧性设计 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## monorepo-vs-multirepo-followup-2

title: 追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 架构 把「Monorepo 和 Multirepo 怎么选」拆成几段推进，确保每段都能独立验收
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 架构 把「Monorepo 和 Multirepo 怎么选」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 结论：把 Monorepo 与 Multirepo 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先定义 Monorepo 与 Multirepo 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Monorepo：Monorepo 的优点。
- Multirepo：Multirepo 是「Monorepo 和 Multirepo 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 架构：在「Monorepo 和 Multirepo 怎么选」里，架构 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：Monorepo 与 Multirepo 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Monorepo 和 Multirepo 怎么选」里，Monorepo 与 Multirepo 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## monorepo-vs-multirepo-followup-3

title: 追问：从工程落地角度看，要判断「Monorepo 和 Multirepo 怎么选」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，要判断「Monorepo 和 Multirepo 怎么选」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标？

### 答案要点

#### 直答

- 结论：先定义 Monorepo 与 Multirepo 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 Monorepo 与 Multirepo 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Monorepo：Monorepo 的优点。
- Multirepo：Multirepo 是「Monorepo 和 Multirepo 怎么选」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 架构：围绕「Monorepo 和 Multirepo 怎么选」里的 架构 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 Monorepo 与 Multirepo 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Monorepo 与 Multirepo 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## local-first-sync-crdt-followup-1

title: 追问：在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步, 追问]
parent: local-first-sync-crdt
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型？

### 答案要点

#### 直答

- 结论：回答 冲突 与 CRDT 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 冲突 与 CRDT 先做归因再做验证，避免把现象当原因。

#### 术语解释

- LocalFirst：LocalFirst 是「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CRDT：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并。
- 离线：已保存、本地待同步、冲突待处理、权限失败、设备离线，不能只在控制台报错。

#### 风险与验收

- 主要风险：围绕 冲突 与 CRDT 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：围绕 冲突 与 CRDT 归因结果至少给复现步骤、日志证据和回归指标，防止误判。

## local-first-sync-crdt-followup-2

title: 追问：从工程落地角度看，离线操作恢复联网后如何保证幂等和顺序
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步, 追问]
parent: local-first-sync-crdt
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，离线操作恢复联网后如何保证幂等和顺序？

### 答案要点

#### 直答

- 结论：先锁定 顺序 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 顺序 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- LocalFirst：LocalFirst 是「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CRDT：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并。
- 离线：已保存、本地待同步、冲突待处理、权限失败、设备离线，不能只在控制台报错。

#### 风险与验收

- 主要风险：顺序 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」里，顺序 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## local-first-sync-crdt-followup-3

title: 追问：在当前团队与业务约束下，local-first 应用如何处理权限变化和本地敏感数据
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步, 追问]
parent: local-first-sync-crdt
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，local-first 应用如何处理权限变化和本地敏感数据？

### 答案要点

#### 直答

- 结论：把 本地敏感数据 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 本地敏感数据 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- LocalFirst：LocalFirst 是「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CRDT：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并。
- 离线：已保存、本地待同步、冲突待处理、权限失败、设备离线，不能只在控制台报错。

#### 风险与验收

- 主要风险：在「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」里，本地敏感数据 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」里 本地敏感数据 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## type-safe-api-contract-followup-1

title: 追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，OpenAPI schema 和后端实现如何防止漂移
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全, 追问]
parent: type-safe-api-contract
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，OpenAPI schema 和后端实现如何防止漂移？

### 答案要点

#### 直答

- 结论：先锁定 OpenAPI 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 OpenAPI 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- OpenAPI：OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步。
- tRPC：tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计。
- GraphQL Codegen：GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进。

#### 风险与验收

- 主要风险：运行时仍要校验：TypeScript 类型只在编译期有效，边界处需要 zod、valibot、JSON Schema 或服务端校验兜底。
- 验收信号：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」里，验收 OpenAPI 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## type-safe-api-contract-followup-2

title: 追问：结合真实业务约束，tRPC 适合拆分成多个服务或开放给第三方吗
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全, 追问]
parent: type-safe-api-contract
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，tRPC 适合拆分成多个服务或开放给第三方吗？

### 答案要点

#### 直答

- 结论：回答 OpenAPI 与 tRPC 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 OpenAPI 与 tRPC 先做归因再做验证，避免把现象当原因。

#### 术语解释

- OpenAPI：OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步。
- tRPC：tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计。
- GraphQL：GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进。

#### 风险与验收

- 主要风险：围绕 OpenAPI 与 tRPC 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收要能复现 OpenAPI 与 tRPC 问题并证明原因链成立，再观察修复后指标是否回归。

## type-safe-api-contract-followup-3

title: 追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，类型化契约如何和契约测试、mock 服务、灰度发布结合
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全, 追问]
parent: type-safe-api-contract
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，类型化契约如何和契约测试、mock 服务、灰度发布结合？

### 答案要点

#### 直答

- 结论：先定义 OpenAPI 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 OpenAPI 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- OpenAPI：OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步。
- tRPC：tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计。
- GraphQL Codegen：GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进。

#### 风险与验收

- 主要风险：若 OpenAPI 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：OpenAPI 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## url-state-sync-followup-1

title: 追问：以「URL State、搜索参数与浏览器历史怎么设计」为例，什么时候用 push，什么时候用 replace
difficulty: 进阶
tags: [URL State, 路由, 状态同步, 追问]
parent: url-state-sync
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「URL State、搜索参数与浏览器历史怎么设计」为例，什么时候用 `push`，什么时候用 `replace`？

### 答案要点

#### 直答

- 结论：先锁定 URL State 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 URL State 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- URL State：URL State 是「URL State、搜索参数与浏览器历史怎么设计」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 路由：围绕「URL State、搜索参数与浏览器历史怎么设计」里的 路由 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 状态同步：围绕「URL State、搜索参数与浏览器历史怎么设计」里的 状态同步 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：URL State 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「URL State、搜索参数与浏览器历史怎么设计」里，验收 URL State 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## url-state-sync-followup-2

title: 追问：结合真实业务约束，URL 状态和服务端数据缓存 key 有什么关系
difficulty: 进阶
tags: [URL State, 路由, 状态同步, 追问]
parent: url-state-sync
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，URL 状态和服务端数据缓存 key 有什么关系？

### 答案要点

#### 直答

- 结论：回答 状态 与 服务端数据缓存 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 状态 与 服务端数据缓存 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- URL State：URL State 决定「URL State、搜索参数与浏览器历史怎么设计」为什么会这样，回答时要把原因和失效前提讲清楚。
- 路由：路由 决定「URL State、搜索参数与浏览器历史怎么设计」为什么会这样，回答时要把原因和失效前提讲清楚。
- 状态同步：状态同步 决定「URL State、搜索参数与浏览器历史怎么设计」为什么会这样，回答时要把原因和失效前提讲清楚。

#### 风险与验收

- 主要风险：围绕 状态 与 服务端数据缓存 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收标准是 状态 与 服务端数据缓存 因果链可复现：输入触发、机制命中、修复后指标回稳。

## url-state-sync-followup-3

title: 追问：结合真实业务约束，如果筛选条件很多，URL 太长该怎么处理
difficulty: 进阶
tags: [URL State, 路由, 状态同步, 追问]
parent: url-state-sync
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果筛选条件很多，URL 太长该怎么处理？

### 答案要点

#### 直答

- 结论：先画出 搜索参数 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 搜索参数 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- URL State：围绕「URL State、搜索参数与浏览器历史怎么设计」里的 URL State 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 路由：围绕「URL State、搜索参数与浏览器历史怎么设计」里的 路由 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 状态同步：围绕「URL State、搜索参数与浏览器历史怎么设计」里的 状态同步 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「URL State、搜索参数与浏览器历史怎么设计」场景下，搜索参数 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：验收看 搜索参数 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## web-components-design-system-followup-1

title: 追问：结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端, 追问]
parent: web-components-design-system
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别？

### 答案要点

#### 直答

- 结论：回答 的样式隔离 与 CSS 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 的样式隔离 与 CSS 先做归因再做验证，避免把现象当原因。

#### 术语解释

- WebComponents：WebComponents 是「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- ShadowDOM：ShadowDOM 是「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 组件库：在「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里，组件库 是因果链关键变量，需要说明触发条件、机制和反例。

#### 风险与验收

- 主要风险：的样式隔离 与 CSS 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：验收标准是 的样式隔离 与 CSS 因果链可复现：输入触发、机制命中、修复后指标回稳。

## web-components-design-system-followup-2

title: 追问：Web Component 如何和 React 的受控表单模型配合
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端, 追问]
parent: web-components-design-system
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：Web Component 如何和 React 的受控表单模型配合？

### 答案要点

#### 直答

- 结论：先梳理 React 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里的 React 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- WebComponents：WebComponents 是「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- ShadowDOM：ShadowDOM 是「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 组件库：在「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」这题里，组件库 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 React 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里 React 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## web-components-design-system-followup-3

title: 追问：以「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」为例，微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端, 追问]
parent: web-components-design-system
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」为例，微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题？

### 答案要点

#### 直答

- 结论：先把 Web Components 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 Web Components 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Web Components：在「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」这道追问里，Web Components 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- Shadow DOM：Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影。
- WebComponents：WebComponents 是「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Web Components 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：Web Components 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## clean-architecture-followup-2

title: 追问：结合真实业务约束，你会如何围绕 DDD 定义「Clean Architecture、DDD 思想在前端怎么落地」生效的判据，并用测试与监控长期验证
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 DDD 定义「Clean Architecture、DDD 思想在前端怎么落地」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 直答

- 结论：验证「Clean Architecture、DDD 思想在前端怎么落地」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 Clean Architecture 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Clean Architecture：Clean Architecture 是「Clean Architecture、DDD 思想在前端怎么落地」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- DDD：DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来。
- CleanArchitecture：CleanArchitecture 是「Clean Architecture、DDD 思想在前端怎么落地」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Clean Architecture 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Clean Architecture、DDD 思想在前端怎么落地」里，Clean Architecture 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## clean-architecture-followup-3

title: 追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 DDD 拆分「Clean Architecture、DDD 思想在前端怎么落地」的落地路径
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 DDD 拆分「Clean Architecture、DDD 思想在前端怎么落地」的落地路径？

### 答案要点

#### 直答

- 结论：先梳理 Clean Architecture 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 Clean Architecture 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Clean Architecture：围绕「Clean Architecture、DDD 思想在前端怎么落地」里的 Clean Architecture 作答时，要给可落地动作，并说明异常处理与验收阈值。
- DDD：DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来。
- CleanArchitecture：CleanArchitecture 是「Clean Architecture、DDD 思想在前端怎么落地」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 Clean Architecture 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Clean Architecture 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## lowcode-platform-followup-2

title: 追问：结合真实业务约束，如果要让结论在 低代码 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 低代码 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：验证「低代码/搭建平台的核心模块」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 指标的组合验证 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 低代码：围绕「低代码/搭建平台的核心模块」里的 低代码 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- Schema：Schema 是「低代码/搭建平台的核心模块」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 物料：组件元数据、属性面板、默认配置、版本与兼容策略。

#### 风险与验收

- 主要风险：指标的组合验证 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「低代码/搭建平台的核心模块」里，指标的组合验证 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## lowcode-platform-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 低代码 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 低代码 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先画出 低代码 与 搭建平台的核心模块 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 低代码 与 搭建平台的核心模块 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 低代码：在「低代码/搭建平台的核心模块」这题里，低代码 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Schema：Schema 是「低代码/搭建平台的核心模块」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 物料：组件元数据、属性面板、默认配置、版本与兼容策略。

#### 风险与验收

- 主要风险：低代码 与 搭建平台的核心模块 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 低代码 与 搭建平台的核心模块 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## architecture-adr

title: 架构决策记录（ADR）怎么写，怎么在团队里真正生效
difficulty: 资深
tags: [ADR, 架构决策, 协作]
followups: [architecture-adr-followup-1, architecture-adr-followup-2, architecture-adr-followup-3]

### 一句话

回答「架构决策记录（ADR）怎么写，怎么在团队里真正生效」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

前端架构演进中，经常会遇到“当时为什么这样选没人记得”。你会如何设计 ADR 机制，让决策可追溯、可复盘、可执行？

### 答案要点

- ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件。
- ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新。
- 评审机制要轻量可执行：重大改动必须附 ADR 链接，PR/设计评审里检查是否满足决策前提，避免“文档和代码两张皮”。

#### 工程化补充

- 场景前提：架构决策记录（ADR）怎么写，怎么在团队里真正生效 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```markdown
# ADR-012: 采用 BFF 分层网关而非页面直连聚合

## Context

- 现状：多端页面各自拼接口，字段不一致，发布耦合严重
- 约束：3 个端并行迭代，后端接口变更频繁，QPS 峰值 8k

## Options

1. 继续页面直连（改动小，但重复逻辑持续增加）
2. 引入 BFF 分层（增加中间层复杂度，但统一聚合与鉴权）

## Decision

- 选择方案 2：引入 BFF 分层

## Consequences

- 正向：接口收敛、端侧逻辑简化、灰度更可控
- 负向：新增运维和可观测成本

## Rollback

- 保留旧直连路径开关 2 个版本周期，异常可 10 分钟内切回

## Review Trigger

- 下游接口稳定后，若 BFF 维护成本连续 2 个季度高于阈值，重审该决策
```

### 追问

- 「架构决策记录（ADR）怎么写，怎么在团队里真正生效」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把 ADR 写成“技术方案说明书”，没有取舍与回滚条件，遇到争议仍无法决策。
- ADR 写完就归档，不设复审机制，导致决策过期后还被机械沿用。
- 只记录“选了什么”，不记录“为什么不选别的”，后续团队无法复盘判断过程。

### 延伸

- 建议给 ADR 编号并建立索引页，方便新人按时间线理解架构演进脉络。
- 重大事故复盘可反查对应 ADR，判断是执行偏差还是决策本身需要更新。

## technical-debt-governance

title: 技术债治理：如何量化优先级、排期节奏与业务共识
difficulty: 资深
tags: [技术债, 治理, ROI]
followups: [technical-debt-governance-followup-1, technical-debt-governance-followup-2, technical-debt-governance-followup-3]

### 一句话

回答「技术债治理：如何量化优先级、排期节奏与业务共识」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

团队都认同技术债很多，但业务总觉得“先上线再说”。你会如何建立一套技术债治理机制，让业务愿意持续投入而不是一次性运动式整治？

### 答案要点

- 先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”。
- 优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋。
- 采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除。
- 对业务要讲 ROI：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。

#### 工程化补充

- 场景前提：技术债治理：如何量化优先级、排期节奏与业务共识 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type DebtItem = {
  id: string;
  impact: number; // 1-5
  risk: number; // 1-5
  fixCost: number; // 1-5（越高越难）
  opportunityCost: number; // 1-5
};

// 越高越优先（示例权重）
function debtScore(item: DebtItem) {
  return item.impact * 0.35 + item.risk * 0.3 + item.opportunityCost * 0.25 - item.fixCost * 0.1;
}

const backlog = debts.map((d) => ({ ...d, score: debtScore(d) })).sort((a, b) => b.score - a.score);
```

### 追问

- 「技术债治理：如何量化优先级、排期节奏与业务共识」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把技术债治理做成“年度一次性重构”，短期热度高但缺少持续机制，很快回到原状。
- 只讲技术痛点不讲业务影响，导致资源申请长期拿不到支持。
- 没有退出条件，治理项目超期后继续投入，反而影响主线交付。

### 延伸

- 技术债不是“要不要还”，而是“用什么节奏、在什么约束下还”。
- 把技术债台账和季度目标联动，能显著提升跨团队协同和预算稳定性。

## architecture-adr-followup-1

title: 追问：在当前团队与业务约束下，当「架构决策记录怎么写，怎么在团队里真正生效」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [ADR, 架构决策, 协作, 追问]
parent: architecture-adr
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当「架构决策记录怎么写，怎么在团队里真正生效」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 直答

- 结论：上线 架构决策记录 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。

#### 术语解释

- ADR：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 架构决策：在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」里，架构决策 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 协作：在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」里，协作 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 架构决策记录 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 架构决策记录 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## architecture-adr-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 ADR 安排「架构决策记录（ADR）怎么写，怎么在团队里真正生效」的渐进改造路线
difficulty: 资深
tags: [ADR, 架构决策, 协作, 追问]
parent: architecture-adr
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 ADR 安排「架构决策记录（ADR）怎么写，怎么在团队里真正生效」的渐进改造路线？

### 答案要点

#### 直答

- 结论：把 架构决策记录 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。

#### 术语解释

- ADR：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 架构决策：围绕「架构决策记录（ADR）怎么写，怎么在团队里真正生效」里的 架构决策 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 协作：围绕「架构决策记录（ADR）怎么写，怎么在团队里真正生效」里的 协作 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 验收信号：架构决策记录 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## architecture-adr-followup-3

title: 追问：在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」场景下，要判断「架构决策记录（ADR）怎么写，怎么在团队里真正生效」值不值得长期维护，你会先盯哪些和 ADR 相关的核心指标
difficulty: 资深
tags: [ADR, 架构决策, 协作, 追问]
parent: architecture-adr
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」场景下，要判断「架构决策记录（ADR）怎么写，怎么在团队里真正生效」值不值得长期维护，你会先盯哪些和 ADR 相关的核心指标？

### 答案要点

#### 直答

- 结论：把 ADR 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。

#### 术语解释

- ADR：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 架构决策：围绕「架构决策记录（ADR）怎么写，怎么在团队里真正生效」里的 架构决策 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 协作：围绕「架构决策记录（ADR）怎么写，怎么在团队里真正生效」里的 协作 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 验收信号：ADR 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## technical-debt-governance-followup-1

title: 追问：如果要做「技术债治理：如何量化优先级、排期节奏与业务共识」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [技术债, 治理, ROI, 追问]
parent: technical-debt-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要做「技术债治理：如何量化优先级、排期节奏与业务共识」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 结论：把 排期节奏与业务共识 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 排期节奏与业务共识 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 技术债：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”。
- 治理：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。
- ROI：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。

#### 风险与验收

- 主要风险：围绕 排期节奏与业务共识 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「技术债治理：如何量化优先级、排期节奏与业务共识」里 排期节奏与业务共识 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## technical-debt-governance-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 技术债 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [技术债, 治理, ROI, 追问]
parent: technical-debt-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 技术债 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先约定「技术债治理：如何量化优先级、排期节奏与业务共识」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先把「技术债治理：如何量化优先级、排期节奏与业务共识」里的 技术债 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 技术债：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”。
- 治理：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。
- ROI：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。

#### 风险与验收

- 主要风险：先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”。
- 验收信号：在「技术债治理：如何量化优先级、排期节奏与业务共识」里，技术债 至少要给一组指标阈值、一条日志证据和一组测试结果。

## technical-debt-governance-followup-3

title: 追问：结合真实业务约束，这套「技术债治理：如何量化优先级、排期节奏与业务共识」要不要继续投人投钱，你会盯哪几组和 技术债 相关的数据先说话
difficulty: 资深
tags: [技术债, 治理, ROI, 追问]
parent: technical-debt-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，这套「技术债治理：如何量化优先级、排期节奏与业务共识」要不要继续投人投钱，你会盯哪几组和 技术债 相关的数据先说话？

### 答案要点

#### 直答

- 结论：先锁定 排期节奏与业务共识 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 排期节奏与业务共识 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 技术债：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”。
- 治理：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。
- ROI：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。

#### 风险与验收

- 主要风险：排期节奏与业务共识 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「技术债治理：如何量化优先级、排期节奏与业务共识」里，验收 排期节奏与业务共识 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## architecture-fitness-function-gate

title: 架构 Fitness Function：把架构原则变成可执行发布闸门
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门]
followups: [architecture-fitness-function-gate-followup-1, architecture-fitness-function-gate-followup-2, architecture-fitness-function-gate-followup-3]

### 一句话

讲「架构 Fitness Function：把架构原则变成可执行发布闸门」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你会如何设计前端架构的 Fitness Function，并把它接入 CI/CD，防止系统在迭代中悄悄劣化？

### 答案要点

- 先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值。
- 规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）。
- 规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付。
- Fitness Function 要有例外机制：紧急场景可临时豁免，但必须记录 owner、过期时间和补偿计划。

#### 工程化补充

- 场景前提：落地 架构 Fitness Function：把架构原则变成可执行发布闸门 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type GateResult = { ok: boolean; reason?: string };

function architectureGate(input: {
  crossLayerDeps: number;
  cycleCount: number;
  entryJsKb: number;
  p75ErrorRate: number;
}): GateResult {
  if (input.crossLayerDeps > 0) return { ok: false, reason: '存在跨层依赖' };
  if (input.cycleCount > 0) return { ok: false, reason: '存在循环依赖' };
  if (input.entryJsKb > 260) return { ok: false, reason: '入口包体超预算' };
  if (input.p75ErrorRate > 0.01) return { ok: false, reason: '线上错误率超阈值' };
  return { ok: true };
}
```

```yaml
fitness_gates:
  - name: dependency-boundary
    phase: ci
    action: block
  - name: bundle-budget
    phase: ci
    action: block
  - name: runtime-slo
    phase: cd
    action: require_oncall_approval
```

### 追问

- 「架构 Fitness Function：把架构原则变成可执行发布闸门」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做静态规则，不接线上指标，导致“代码规范很漂亮，系统仍在抖动”。
- 把所有规则都设为阻断级，团队很快绕过流程或关闭规则。
- 规则没有过期治理，临时豁免长期存在，治理效果被侵蚀。

### 延伸

- 可把规则失败原因映射到修复手册，降低团队学习成本。
- 建议按季度复盘规则命中质量，淘汰低价值噪声规则。

## strangler-migration-playbook

title: 前端绞杀式迁移：旧架构双轨运行与安全下线
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚]
followups: [strangler-migration-playbook-followup-1, strangler-migration-playbook-followup-2, strangler-migration-playbook-followup-3]

### 一句话

回答「前端绞杀式迁移：旧架构双轨运行与安全下线」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

面对历史包袱重、业务连续迭代的前端系统，你会如何做绞杀式迁移，既不停业务又避免长期双轨失控？

### 答案要点

- 先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写。
- 设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换。
- 数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态。
- 迁移每一步都要可观测：比较新旧路径的成功率、时延、错误类型和业务转化，防止“功能看似一致、体验悄悄下滑”。

#### 工程化补充

- 场景前提：先限定 架构迁移 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端绞杀式迁移：旧架构双轨运行与安全下线 的结论不成立。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```ts
function pickRuntime(userId: string, ratio: number) {
  const bucket = hash(userId) % 100;
  return bucket < ratio ? 'new-shell' : 'legacy-shell';
}

export async function bootstrap(userId: string) {
  const runtime = pickRuntime(userId, featureFlag('migration_ratio'));
  try {
    return runtime === 'new-shell' ? startNewShell() : startLegacyShell();
  } catch {
    // 新链路异常立即回退旧链路
    return startLegacyShell();
  }
}
```

```yaml
migration_rollout:
  - stage: canary
    ratio: 5
    checks: [error_rate, key_journey_success, p95_latency]
  - stage: ramp_up
    ratio: 30
    checks: [same_as_above]
  - stage: full
    ratio: 100
    require: rollback_drill_passed
```

### 追问

- 「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把“双轨”当长期常态，导致认知和维护成本持续翻倍。
- 迁移只看技术完成度，不看关键业务路径是否受损。
- 没有明确下线时间表，旧链路长期残留并反向拖累新架构。

### 延伸

- 迁移过程建议同步维护“能力对照表”，减少跨团队沟通摩擦。
- 复杂系统可先迁“高频低风险”模块，快速建立团队信心和模板。

## architecture-fitness-function-gate-followup-1

title: 追问：结合真实业务约束，真要把「架构 Fitness Function：把架构原则变成可执行发布闸门」推到线上，你会如何围绕 架构治理 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门, 追问]
parent: architecture-fitness-function-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「架构 Fitness Function：把架构原则变成可执行发布闸门」推到线上，你会如何围绕 架构治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「架构 Fitness Function：把架构原则变成可执行发布闸门」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：架构 Fitness Function 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- Fitness Function：Fitness Function 要有例外机制：紧急场景可临时豁免，但必须记录 owner、过期时间和补偿计划。
- 架构治理：围绕「架构 Fitness Function：把架构原则变成可执行发布闸门」里的 架构治理 推进上线时，要明确每个批次的放量门槛和回退条件。
- 发布闸门：在「架构 Fitness Function：把架构原则变成可执行发布闸门」里，发布闸门 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：架构 Fitness Function 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：发布验收至少看 架构 Fitness Function 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## architecture-fitness-function-gate-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构治理 方案有效
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门, 追问]
parent: architecture-fitness-function-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构治理 方案有效？

### 答案要点

#### 直答

- 结论：先约定「架构 Fitness Function：把架构原则变成可执行发布闸门」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 Fitness 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 架构治理：围绕「架构 Fitness Function：把架构原则变成可执行发布闸门」里的 架构治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- Fitness Function：Fitness Function 要有例外机制：紧急场景可临时豁免，但必须记录 owner、过期时间和补偿计划。
- 发布闸门：在「架构 Fitness Function：把架构原则变成可执行发布闸门」里，发布闸门 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「架构 Fitness Function：把架构原则变成可执行发布闸门」里，Fitness 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Fitness 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## architecture-fitness-function-gate-followup-3

title: 追问：在「架构 Fitness Function：把架构原则变成可执行发布闸门」场景下，复盘「架构 Fitness Function：把架构原则变成可执行发布闸门」时，你会拿哪些数据判断这套方案该继续投入还是该止损
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门, 追问]
parent: architecture-fitness-function-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「架构 Fitness Function：把架构原则变成可执行发布闸门」场景下，复盘「架构 Fitness Function：把架构原则变成可执行发布闸门」时，你会拿哪些数据判断这套方案该继续投入还是该止损？

### 答案要点

#### 直答

- 结论：上线前先按 架构 Fitness Function 风险分级做演练，配置降级与回滚开关，确认故障可止损后再放量。
- 关键动作：围绕 架构 Fitness Function 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Fitness Function：Fitness Function 要有例外机制：紧急场景可临时豁免，但必须记录 owner、过期时间和补偿计划。
- 架构治理：在「架构 Fitness Function：把架构原则变成可执行发布闸门」里，架构治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 发布闸门：围绕「架构 Fitness Function：把架构原则变成可执行发布闸门」里的 发布闸门 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 架构 Fitness Function 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 架构 Fitness Function 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## strangler-migration-playbook-followup-1

title: 追问：从工程落地角度看，当「前端绞杀式迁移：旧架构双轨运行与安全下线」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚, 追问]
parent: strangler-migration-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「前端绞杀式迁移：旧架构双轨运行与安全下线」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 直答

- 结论：先列出 前端绞杀式迁移 旧架构双轨运行与安全下线 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写。

#### 术语解释

- 架构迁移：围绕「前端绞杀式迁移：旧架构双轨运行与安全下线」里的 架构迁移 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 双轨运行：围绕「前端绞杀式迁移：旧架构双轨运行与安全下线」里的 双轨运行 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 回滚：围绕「前端绞杀式迁移：旧架构双轨运行与安全下线」里的 回滚 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：前端绞杀式迁移 旧架构双轨运行与安全下线 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 前端绞杀式迁移 旧架构双轨运行与安全下线 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## strangler-migration-playbook-followup-2

title: 追问：结合真实业务约束，你会怎样验证「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚, 追问]
parent: strangler-migration-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 直答

- 结论：先定义 前端绞杀式迁移 旧架构双轨运行与安全下线 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写。

#### 术语解释

- 架构迁移：围绕「前端绞杀式迁移：旧架构双轨运行与安全下线」里的 架构迁移 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 双轨运行：围绕「前端绞杀式迁移：旧架构双轨运行与安全下线」里的 双轨运行 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 回滚：围绕「前端绞杀式迁移：旧架构双轨运行与安全下线」里的 回滚 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：前端绞杀式迁移 旧架构双轨运行与安全下线 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「前端绞杀式迁移：旧架构双轨运行与安全下线」里，前端绞杀式迁移 旧架构双轨运行与安全下线 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## strangler-migration-playbook-followup-3

title: 追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「前端绞杀式迁移：旧架构双轨运行与安全下线」范围，并把 架构迁移 相关技术债回补计划讲清楚
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚, 追问]
parent: strangler-migration-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「前端绞杀式迁移：旧架构双轨运行与安全下线」范围，并把 架构迁移 相关技术债回补计划讲清楚？

### 答案要点

#### 直答

- 结论：先让 前端绞杀式迁移 旧架构双轨运行与安全下线 走小流量灰度，观察成功率与告警，再决定是否继续扩量。
- 关键动作：先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写。

#### 术语解释

- 架构迁移：在「前端绞杀式迁移：旧架构双轨运行与安全下线」里，架构迁移 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 双轨运行：在「前端绞杀式迁移：旧架构双轨运行与安全下线」里，双轨运行 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 回滚：在「前端绞杀式迁移：旧架构双轨运行与安全下线」里，回滚 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：围绕 前端绞杀式迁移 旧架构双轨运行与安全下线 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 前端绞杀式迁移 旧架构双轨运行与安全下线 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## architecture-contract-acceptance-gate

title: 架构契约验收闸门：接口、事件与依赖变更如何跨团队落地
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门]
followups: [architecture-contract-acceptance-gate-followup-1, architecture-contract-acceptance-gate-followup-2, architecture-contract-acceptance-gate-followup-3]

### 一句话

这题回答要覆盖 架构治理 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

你负责一个由多前端域团队协作的系统，公共 BFF 与事件总线由平台组维护。若某团队要升级契约（字段语义、事件 schema、依赖版本），你会如何设计架构契约验收机制？

### 答案要点

- 先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程。
- 契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可。
- 所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则。
- 发布门禁必须自动化：OpenAPI/AsyncAPI diff、契约测试、关键链路冒烟统一进入 CI。

#### 工程化补充

- 场景前提：回答 架构契约验收闸门：接口、事件与依赖变更如何跨团队落地 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
type ContractChangeLevel = 'compatible' | 'risky' | 'breaking';

function requiresArchitectureReview(level: ContractChangeLevel) {
  return level === 'risky' || level === 'breaking';
}
```

```yaml
contract_gate:
  checks:
    - openapi_diff
    - consumer_replay
    - e2e_smoke
  breaking:
    approval: required
    compatibility_window_days: 14
```

### 追问

- 「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做 provider 自测，不做 consumer 回放，导致发布后才暴露兼容断裂。
- 契约版本只写文档不进门禁流程，变更可追踪性很差。
- 旧版本无限期保留，最终形成多套协议长期并存的维护债。

### 延伸

- 建议建设跨团队契约看板，实时展示迁移进度和风险热区。
- 高风险域可引入“模拟流量回放门禁”，提前暴露灰度后问题。

## architecture-blast-radius-rollback-matrix

title: 架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排
difficulty: 资深
tags: [架构治理, 灰度, 回滚]
followups: [architecture-blast-radius-rollback-matrix-followup-1, architecture-blast-radius-rollback-matrix-followup-2, architecture-blast-radius-rollback-matrix-followup-3]

### 一句话

这题的高分关键是把 架构治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你要推动一次涉及路由编排、鉴权中间件和埋点链路的架构升级。如何在发布前设计“爆炸半径矩阵”，确保异常时能快速止损而不是全站回退？

### 答案要点

- 先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。
- 明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合。
- 每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退。
- 触发条件要量化：错误率、慢请求、关键转化下降、告警连续时间共同决定止损动作。

#### 工程化补充

- 场景前提：落地 架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type Layer = 'entry' | 'flow' | 'foundation';
type Signal = { errorRate: number; p95Ms: number; conversionDrop: number };

function shouldRollbackLayer(layer: Layer, s: Signal) {
  if (layer === 'entry') return s.errorRate > 0.01 || s.conversionDrop > 0.015;
  if (layer === 'flow') return s.errorRate > 0.015 || s.p95Ms > 1200;
  return s.errorRate > 0.02 || s.p95Ms > 1500;
}
```

```yaml
blast_radius_matrix:
  entry:
    canary: [1, 5, 20]
    rollback: feature_flag
  flow:
    canary: [5, 15, 40]
    rollback: route_policy
  foundation:
    canary: [10, 30, 100]
    rollback: app_version
```

### 追问

- 「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做全局灰度，不做分层灰度，异常时缺少精准止损能力。
- 回滚顺序没有预案，导致事故处理中“先做什么”现场争议。
- 忽略边界隔离验证，单点故障轻易穿透主流程。

### 延伸

- 可把爆炸半径矩阵接入发布平台，自动推荐回滚层级。
- 建议将重大架构变更前置“故障注入演练”作为准入条件。

## architecture-contract-acceptance-gate-followup-1

title: 追问：结合真实业务约束，你会如何识别「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门, 追问]
parent: architecture-contract-acceptance-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 结论：围绕「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则。

#### 术语解释

- 架构治理：在「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」这题里，架构治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 契约测试：OpenAPI/AsyncAPI diff、契约测试、关键链路冒烟统一进入 CI。
- 发布闸门：围绕「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」里的 发布闸门 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」里，架构契约验收闸门 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：架构契约验收闸门 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## architecture-contract-acceptance-gate-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 架构治理 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门, 追问]
parent: architecture-contract-acceptance-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 架构治理 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先约定「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则。

#### 术语解释

- 架构治理：在「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」里，架构治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 契约测试：OpenAPI/AsyncAPI diff、契约测试、关键链路冒烟统一进入 CI。
- 发布闸门：围绕「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」里的 发布闸门 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」里，事件 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：事件 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## architecture-contract-acceptance-gate-followup-3

title: 追问：以「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」为例，当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门, 追问]
parent: architecture-contract-acceptance-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」为例，当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则。

#### 术语解释

- 架构治理：围绕「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」里的 架构治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 契约测试：OpenAPI/AsyncAPI diff、契约测试、关键链路冒烟统一进入 CI。
- 发布闸门：在「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」这题里，发布闸门 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：架构契约验收闸门 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 架构契约验收闸门 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## architecture-blast-radius-rollback-matrix-followup-1

title: 追问：如果要做「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [架构治理, 灰度, 回滚, 追问]
parent: architecture-blast-radius-rollback-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要做「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 结论：先梳理 架构变更爆炸半径矩阵 分层灰度 隔离边界与回滚编排 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。

#### 术语解释

- 架构治理：围绕「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」里的 架构治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 灰度：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。
- 回滚：配置开关、路由策略、应用版本、依赖版本分层回退。

#### 风险与验收

- 主要风险：架构变更爆炸半径矩阵 分层灰度 隔离边界与回滚编排 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：架构变更爆炸半径矩阵 分层灰度 隔离边界与回滚编排 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## architecture-blast-radius-rollback-matrix-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 架构治理 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [架构治理, 灰度, 回滚, 追问]
parent: architecture-blast-radius-rollback-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 架构治理 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先定「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。

#### 术语解释

- 架构治理：架构治理 是「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 灰度：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。
- 回滚：配置开关、路由策略、应用版本、依赖版本分层回退。

#### 风险与验收

- 主要风险：架构治理 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」里，架构治理 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## architecture-blast-radius-rollback-matrix-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏
difficulty: 资深
tags: [架构治理, 灰度, 回滚, 追问]
parent: architecture-blast-radius-rollback-matrix
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。

#### 术语解释

- 架构治理：围绕「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」里的 架构治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 灰度：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。
- 回滚：配置开关、路由策略、应用版本、依赖版本分层回退。

#### 风险与验收

- 主要风险：调整方案边界 与 实施节奏 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」里，调整方案边界 与 实施节奏 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。
