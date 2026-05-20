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

分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的；依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置；没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升。

### 题目

一个中大型前端项目为什么要谈“分层”和“边界”？如果不设边界，最常见的问题是什么？

### 答案要点

- 分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置
- 没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升

#### 补充说明

- 面试中不要只停留在「前端架构中的分层、边界与依赖方向」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 分层、边界 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端架构中的分层、边界与依赖方向」时要先定义 前端架构中的分层 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端架构中的分层 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端架构中的分层 关键链路先收敛再替换。

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

观察者：响应式系统、状态订阅；发布订阅：事件总线、埋点中心、插件系统；策略：表单校验、排序规则、支付/登录方式选择。

### 题目

请举例说明观察者、发布订阅、策略、装饰器、适配器、工厂在前端中的真实落地场景。

### 答案要点

- 观察者：响应式系统、状态订阅
- 发布订阅：事件总线、埋点中心、插件系统
- 策略：表单校验、排序规则、支付/登录方式选择
- 装饰器：埋点增强、权限校验、缓存包装
- 适配器：统一不同后端接口或第三方 SDK 的差异
- 工厂：按配置生产组件、图表实例、请求客户端

#### 补充说明

- 面试中不要只停留在「前端里最常见的设计模式如何落地」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 设计模式、实战 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端里最常见的设计模式如何落地」时要先定义 前端里最常见的设计模 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端里最常见的设计模 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端里最常见的设计模 关键链路先收敛再替换。

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

当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关；InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现。

### 题目

前端项目什么时候值得引入依赖注入容器？它能解决什么问题，又容易带来什么代价？

### 答案要点

- 当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现
- 代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接
- 前端引入 DI 时，应优先保证依赖方向清晰和接口稳定，而不是为了“像后端架构”而引入容器

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「依赖注入在前端什么时候有价值，什么时候会过度设计」时要先定义 依赖注入在前端什么时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，依赖注入在前端什么时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 依赖注入在前端什么时 关键链路先收敛再替换。

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

Flux/Redux 倾向单向数据流、显式更新和可追踪性；MobX/Pinia 更强调开发体验和细粒度响应式；Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”。

### 题目

如何向团队解释“状态管理并不只是换个库”，而是不同的更新模型？

### 答案要点

- Flux/Redux 倾向单向数据流、显式更新和可追踪性
- MobX/Pinia 更强调开发体验和细粒度响应式
- Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”
- 选型要看调试能力、团队心智、跨页面共享程度和生态配套

#### 标准补充（边界/失败/取舍）

- 界定条件：这题只有在 Flux 的响应式依赖可追踪、组件边界清晰时才成立。
- 失败场景：例如跨组件共享状态无边界，Flux 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。
- 替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 Flux 会快速耦合；当前按作用域分层更稳。

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

先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本。

### 题目

如果团队在做新项目选型，应该如何比较 Vue、React、Solid、Svelte、Qwik，而不是只看“谁更快”？

### 答案要点

- 先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本
- 内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性
- 性能对比必须带业务前提。框架基准测试能说明某些模型差异，但不能直接替代真实业务压测与可维护性评估

#### 标准补充（边界/失败/取舍）

- 界定条件：这题只有在 Vue 的响应式依赖可追踪、组件边界清晰时才成立。
- 失败场景：例如跨组件共享状态无边界，Vue 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。
- 替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 Vue 会快速耦合；当前按作用域分层更稳。

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

API 一致：命名、事件、插槽、受控/非受控模式统一；主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展；可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义。

### 题目

如果让你从零做一套组件库，你会优先建立哪些设计原则？

### 答案要点

- API 一致：命名、事件、插槽、受控/非受控模式统一
- 主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展
- 可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义
- 工程友好：Tree Shaking、样式隔离、SSR 兼容、文档与示例完善

#### 补充说明

- 面试中不要只停留在「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 组件库、DesignSystem 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 组件库设计的关键指标 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 组件库设计的关键指标，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」按阶段灰度，每阶段可验收可撤回。

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

前端同样会有复杂业务规则、权限、流程编排和多端适配问题；DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来；适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计。

### 题目

很多人说前端没必要谈 DDD/整洁架构，你怎么看？

### 答案要点

- 前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来
- 适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计

#### 补充说明

- 面试中不要只停留在「Clean Architecture、DDD 思想在前端怎么落地」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 DDD、CleanArchitecture 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Clean Architecture、DDD 思想在前端怎么落地」时要把 Clean 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Clean 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Clean Architecture、DDD 思想在前端怎么落地」里当前按阶段替换更稳。

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

Flag 要有明确归属、过期时间和回收流程；能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断；灰度策略可按用户、组织、比例、环境、地区等维度下发。

### 题目

前端如何做灰度与实验，不让代码里到处都是 `if (flag)`？

### 答案要点

- Flag 要有明确归属、过期时间和回收流程
- 能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断
- 灰度策略可按用户、组织、比例、环境、地区等维度下发

#### 补充说明

- 面试中不要只停留在「Feature Flag、灰度发布与实验系统的前端视角」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 灰度、AB实验 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Feature 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Feature，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「Feature Flag、灰度发布与实验系统的前端视角」按阶段灰度，每阶段可验收可撤回。

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

SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担；文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南；失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”。

### 题目

为什么很多团队技术能力不差，但做出来的 SDK 和文档却难用？

### 答案要点

- SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南
- 失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”

#### 补充说明

- 面试中不要只停留在「SDK 与文档站设计原则」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 SDK、文档 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 SDK 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 SDK，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「SDK 与文档站设计原则」按阶段灰度，每阶段可验收可撤回。

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

微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景；收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移；代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度。

### 题目

你会在什么情况下建议团队使用微前端？它真正的收益和代价分别是什么？

### 答案要点

- 微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移
- 代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度
- 真正能否落地，取决于团队是否愿意维护宿主契约，例如路由协议、鉴权上下文、埋点规范、公共依赖版本和故障隔离策略
- 微前端解决的是组织与交付边界问题，不是页面拆分本身

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 微前端什么时候值得做 结论失真。
- 失败场景：例如忽略极端输入规模，微前端什么时候值得做 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「微前端什么时候值得做，什么时候只是把复杂度前置」优先保证规模上限可控。

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

岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”；部分水合关注的是减少整页统一 hydration 的成本；RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名。

### 题目

岛屿架构、React Server Components、部分水合这些概念经常一起出现，它们各自在解决什么问题？

### 答案要点

- 岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 部分水合关注的是减少整页统一 hydration 的成本
- RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名
- 三者共同目标都与降低首屏 JS、减少客户端工作量有关，但抽象层级和框架实现方式不同

#### 标准补充（边界/失败/取舍）

- 界定条件：该题成立前提是 岛屿架构 的渲染热点可观测、失效策略可验证，并且能做回归。
- 失败场景：例如把缓存状态和本地状态混用，岛屿架构 会出现重复请求与 UI 闪烁；应拆分数据源并统一失效策略。
- 替代方案与取舍：可把状态都上提到全局仓库，但 岛屿架构 易失控；当前按本地/缓存/路由分层可维护性更好。

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

schema：页面结构、组件树、属性、事件、数据源、权限等统一描述；物料体系：组件元数据、属性面板、默认配置、版本与兼容策略；编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统。

### 题目

如果让你设计一个低代码页面搭建平台，你会把系统拆成哪些核心模块？

### 答案要点

- schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 物料体系：组件元数据、属性面板、默认配置、版本与兼容策略
- 编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统
- 出码 / 运行时：实时预览、渲染引擎、代码生成、部署与发布能力

#### 补充说明

- 面试中不要只停留在「低代码/搭建平台的核心模块是什么」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 低代码、Schema、物料 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「低代码/搭建平台的核心模块的定义」时要把 低代码 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，低代码 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「低代码/搭建平台的核心模块的定义」里当前按阶段替换更稳。

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

Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android。

### 题目

搭一个能撑起大公司多产品线的设计系统，工程上要做对哪些事？

### 答案要点

- Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色
- 组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）
- 文档：Storybook + a11y addon + 视觉回归（Chromatic / Playwright + 截图）
- 兼容承诺：semver + RFC + Codemod，破坏性升级要 codemod 自动迁移
- 治理：组件 owner 制度，新增 / 修改要走评审，避免设计系统失控

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 设计系统的工程化 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 设计系统的工程化，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「设计系统的工程化（tokens / multi-brand / a11y）」按阶段灰度，每阶段可验收可撤回。

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

React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI；分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局。

### 题目

某个独立模块挂了不应该让整个页面白屏，工程上怎么做"错误隔离"？

### 答案要点

- React 用 ErrorBoundary，Vue 用 `errorCaptured` 钩子；模块外裹一层兜底 UI
- 分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局
- 第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹
- Iframe 隔离：第三方 widget 用 sandbox iframe，挂了不影响主框架
- 服务端错误重试：fetch 失败做指数退避，配合 SWR / React Query
- 监控：错误率超过阈值自动触发 alert，避免靠用户反馈才发现

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端错误隔离与韧性设 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端错误隔离与韧性设，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端错误隔离与韧性设计」按阶段灰度，每阶段可验收可撤回。

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

组件库 / 多端共享代码 / 多包同步发版 → Monorepo（pnpm + Turborepo）；业务相互独立、团队规模大 → Multirepo + 私有 npm。

### 题目

请说明 Monorepo 与 Multirepo 的优缺点，以及前端常见的 Monorepo 工具栈。

### 答案要点

- **Monorepo 的优点**
  - 跨包重构成本低、原子提交
  - 共享 lint / tsconfig / CI 配置
  - 发版可以联动（changeset 一次 PR 多包升级）
- **Monorepo 的缺点**
  - 仓库变大、克隆慢
  - CI 时间膨胀（需要按依赖图增量构建 / 缓存）
  - 权限管理不如多仓灵活
- **典型工具栈**
  - 包管理：**pnpm workspaces**（性价比最高）/ Yarn Berry / npm workspaces
  - 任务编排：**Turborepo**（Vercel）/ Nx（功能多）/ Rush（微软，适合企业）
  - 发版：**Changesets**（颗粒度细）/ semantic-release
  - 代码所有权：CODEOWNERS 文件 + GitHub branch protection
- **Multirepo 的适用场景**
  - 业务高度独立（各团队自治）
  - 依赖关系简单
  - 国际化大型公司常见，一个团队一个仓
- **混合方案**
  - 公司核心包（设计系统、工具库）放 Monorepo
  - 业务应用各自仓库
  - 前端基建（CLI / 脚手架 / 代码生成）独立仓

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Monorepo 和 Multirepo 怎么选」时要先定义 Monorepo 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，Monorepo 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 Monorepo 关键链路先收敛再替换。

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

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端架构中的分层、边界与依赖方向」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，真要把「前端架构中的分层、边界与依赖方向」推到线上，你会如何围绕 分层 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 机制：依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置；没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升
- 落地动作：回答「结合真实业务约束，真要把「前端架构中的分层、边界与依赖方向」推到线上，你会如何围绕 分层 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，真要把「前端架构中的分层、边界与依赖方向」推到线上，你会如何围绕 分层 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置
- 没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升

## local-first-sync-crdt

title: Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步]
links: [21-interview-special/design-realtime-collab]
followups: [local-first-sync-crdt-followup-1, local-first-sync-crdt-followup-2, local-first-sync-crdt-followup-3]

### 一句话

Local-first 把可用性和响应速度放在本地，网络同步变成后台协议；难点不在“离线缓存”，而在操作日志、冲突合并、权限校验、跨端一致性和可观测性。

### 题目

如果要设计一个类似文档、白板、任务管理或客服工作台的 local-first 前端应用，同步引擎应该如何处理离线、冲突和多端一致性？

### 答案要点

- 本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备。
- 数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化。
- 冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并。
- 前端要显式展示同步状态：已保存、本地待同步、冲突待处理、权限失败、设备离线，不能只在控制台报错。
- 质量保障要覆盖断网重连、乱序消息、重复投递、设备时钟不准、schema 迁移、超大日志压缩和敏感数据本地加密。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Local-first 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Local-first，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」按阶段灰度，每阶段可验收可撤回。

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

类型化契约的目标是让接口 schema、请求客户端、mock、运行时校验和兼容性检查围绕同一份事实来源演进，减少“后端改了字段、前端上线才发现”的问题。

### 题目

OpenAPI、tRPC 和 GraphQL Codegen 分别如何帮助前后端契约类型化？团队该如何选择并落地到开发、测试和发布流程里？

### 答案要点

- OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步。
- tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计。
- GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进。
- 运行时仍要校验：TypeScript 类型只在编译期有效，边界处需要 zod、valibot、JSON Schema 或服务端校验兜底。
- 发布流程要包含契约 diff、breaking change 检查、mock 回归、消费者通知和版本策略，避免“类型生成成功但线上旧客户端崩掉”。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 OpenAPI 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，OpenAPI 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」风险不足；当前优先服务端强校验，因为可审计、可回滚。

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

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端里最常见的设计模式如何落地」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「前端里最常见的设计模式如何落地」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：观察者：响应式系统、状态订阅
- 机制：发布订阅：事件总线、埋点中心、插件系统；策略：表单校验、排序规则、支付/登录方式选择
- 落地动作：回答「在当前团队与业务约束下，真要把「前端里最常见的设计模式如何落地」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，真要把「前端里最常见的设计模式如何落地」推到线上，你会如何围绕 设计模式 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- 观察者：响应式系统、状态订阅
- 发布订阅：事件总线、埋点中心、插件系统
- 策略：表单校验、排序规则、支付/登录方式选择

## dependency-injection-followup-1

title: 追问：结合真实业务约束，真要把「依赖注入在前端什么时候有价值，什么时候会过度设计」推到线上，你会如何围绕 DI 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「依赖注入在前端什么时候有价值，什么时候会过度设计」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，真要把「依赖注入在前端什么时候有价值，什么时候会过度设计」推到线上，你会如何围绕 DI 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- 机制：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现；代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接
- 落地动作：回答「结合真实业务约束，真要把「依赖注入在前端什么时候有价值，什么时候会过度设计」推到线上，你会如何围绕 DI 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，真要把「依赖注入在前端什么时候有价值，什么时候会过度设计」推到线上，你会如何围绕 DI 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现
- 代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接

## state-management-followup-1

title: 追问：结合真实业务约束，真在项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，你会如何划分 状态管理 并控制更新时机
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：结合真实业务约束，真在项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，你会如何划分 状态管理 并控制更新时机？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flux/Redux 倾向单向数据流、显式更新和可追踪性
- 机制：MobX/Pinia 更强调开发体验和细粒度响应式；Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”
- 落地动作：回答「结合真实业务约束，真在项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，你会如何划分 状态管理 并控制更新时机」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，真在项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，你会如何划分 状态管理 并控制更新时机」时必须明确 真在项目里落地 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，真在项目里落地 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- Flux/Redux 倾向单向数据流、显式更新和可追踪性
- MobX/Pinia 更强调开发体验和细粒度响应式
- Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”

## framework-comparison-followup-1

title: 追问：在当前团队与业务约束下，当「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」牵涉跨组件状态时，你会如何围绕 框架选型 设计响应式边界，保证后续好维护
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：在当前团队与业务约束下，当「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」牵涉跨组件状态时，你会如何围绕 框架选型 设计响应式边界，保证后续好维护？

### 答案要点

#### 标准回答（直接作答）

- 结论：先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 机制：再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本；内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性
- 落地动作：回答「在当前团队与业务约束下，当「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」牵涉跨组件状态时，你会如何围绕 框架选型 设计响应式边界，保证后续好维护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题只有在 Vue 的响应式依赖可追踪、组件边界清晰时才成立。
- 失败场景：例如跨组件共享状态无边界，Vue 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。
- 替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 Vue 会快速耦合；当前按作用域分层更稳。

#### 关键细节（可追问）

- 先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本
- 内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性

## component-library-followup-1

title: 追问：如果「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」涉及历史数据兼容，你会如何安排迁移与回退链路
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：如果「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」涉及历史数据兼容，你会如何安排迁移与回退链路？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 一致：命名、事件、插槽、受控/非受控模式统一
- 机制：主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展；可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义
- 落地动作：回答「如果「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」涉及历史数据兼容，你会如何安排迁移与回退链路」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」涉及历史数据兼容，你会如何安排迁移与回退链路」时要先定义 组件库设计的关键指标 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，组件库设计的关键指标 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 组件库设计的关键指标 关键链路先收敛再替换。

#### 关键细节（可追问）

- API 一致：命名、事件、插槽、受控/非受控模式统一
- 主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展
- 可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义

## clean-architecture-followup-1

title: 追问：你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Clean Architecture、DDD 思想在前端怎么落地」拆成可验证的小步骤。

### 题目

如果面试官追问：你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- 机制：DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来；适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计
- 落地动作：回答「你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素」时要把 你会如何识别 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何识别 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「你会如何识别「Clean Architecture、DDD 思想在前端怎么落地」在生产环境中最容易失效的 DDD 边界因素」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来
- 适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计

## feature-flag-followup-1

title: 追问：在「Feature Flag、灰度发布与实验系统的前端视角」场景下，真要把「Feature Flag、灰度发布与实验系统的前端视角」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Feature Flag、灰度发布与实验系统的前端视角」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在「Feature Flag、灰度发布与实验系统的前端视角」场景下，真要把「Feature Flag、灰度发布与实验系统的前端视角」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flag 要有明确归属、过期时间和回收流程
- 机制：能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断；灰度策略可按用户、组织、比例、环境、地区等维度下发
- 落地动作：回答「在「Feature Flag、灰度发布与实验系统的前端视角」场景下，真要把「Feature Flag、灰度发布与实验系统的前端视角」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Feature 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Feature，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「Feature Flag、灰度发布与实验系统的前端视角」场景下，真要把「Feature Flag、灰度发布与实验系统的前端视角」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Flag 要有明确归属、过期时间和回收流程
- 能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断
- 灰度策略可按用户、组织、比例、环境、地区等维度下发

## sdk-docs-followup-1

title: 追问：以「SDK 与文档站设计原则」为例，真要把「SDK 与文档站设计原则」推到线上，你会如何围绕 SDK 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「SDK 与文档站设计原则」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「SDK 与文档站设计原则」为例，真要把「SDK 与文档站设计原则」推到线上，你会如何围绕 SDK 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 机制：文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南；失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”
- 落地动作：回答「以「SDK 与文档站设计原则」为例，真要把「SDK 与文档站设计原则」推到线上，你会如何围绕 SDK 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「SDK 与文档站设计原则」为例，真要把「SDK 与文档站设计原则」推到线上，你会如何围绕 SDK 设计灰度节奏、回滚条件和迁移路径」时要先定义 SDK 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，SDK 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 SDK 关键链路先收敛再替换。

#### 关键细节（可追问）

- SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南
- 失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”

## microfrontend-followup-1

title: 追问：如果回头看「微前端什么时候值得做，什么时候只是把复杂度前置」这题，你会优先排查哪些复杂度陷阱和异常输入
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 一句话

先界定「微前端什么时候值得做，什么时候只是把复杂度前置」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果回头看「微前端什么时候值得做，什么时候只是把复杂度前置」这题，你会优先排查哪些复杂度陷阱和异常输入？

### 答案要点

#### 标准回答（直接作答）

- 结论：微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 机制：收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移；代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度
- 落地动作：回答「如果回头看「微前端什么时候值得做，什么时候只是把复杂度前置」这题，你会优先排查哪些复杂度陷阱和异常输入」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果回头看「微前端什么时候值得做，什么时候只是把复杂度前置」这题，你会优先排查哪些复杂度陷阱和异常输入」时要先说清输入规模、复杂度上限和内存预算，这三项决定 微前端什么时候值得做 是否可行。
- 失败场景：例如漏掉重复值/越界输入，微前端什么时候值得做 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- 微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移
- 代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度

## microfrontend-followup-2

title: 追问：以「微前端什么时候值得做，什么时候只是把复杂度前置」为例，如果数据规模扩大一个数量级，你会如何围绕 微前端 调整数据结构或算法
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 复杂度和正确性 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做。

### 题目

如果面试官追问：以「微前端什么时候值得做，什么时候只是把复杂度前置」为例，如果数据规模扩大一个数量级，你会如何围绕 微前端 调整数据结构或算法？

### 答案要点

#### 标准回答（直接作答）

- 结论：微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 机制：收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移；代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度
- 落地动作：回答「以「微前端什么时候值得做，什么时候只是把复杂度前置」为例，如果数据规模扩大一个数量级，你会如何围绕 微前端 调整数据结构或算法」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 微前端什么时候值得做 结论失真。
- 失败场景：例如忽略极端输入规模，微前端什么时候值得做 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「以「微前端什么时候值得做，什么时候只是把复杂度前置」为例，如果数据规模扩大一个数量级，你会如何围绕 微前端 调整数据结构或算法」优先保证规模上限可控。

#### 关键细节（可追问）

- 微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移
- 代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度

## microfrontend-followup-3

title: 追问：如果要向团队说明「微前端什么时候值得做，什么时候只是把复杂度前置」实现可信，你会展示哪些围绕 微前端 的正确性证据
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「微前端什么时候值得做，什么时候只是把复杂度前置」不是只在理想输入下成立。；再补可观测指标：复杂度和正确性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：如果要向团队说明「微前端什么时候值得做，什么时候只是把复杂度前置」实现可信，你会展示哪些围绕 微前端 的正确性证据？

### 答案要点

#### 标准回答（直接作答）

- 结论：微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 机制：收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移；代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度
- 落地动作：回答「如果要向团队说明「微前端什么时候值得做，什么时候只是把复杂度前置」实现可信，你会展示哪些围绕 微前端 的正确性证据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 微前端什么时候值得做 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 微前端什么时候值得做 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「如果要向团队说明「微前端什么时候值得做，什么时候只是把复杂度前置」实现可信，你会展示哪些围绕 微前端 的正确性证据」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景
- 收益包括独立部署、技术栈局部自治、团队解耦、渐进式迁移
- 代价包括运行时性能、重复依赖、样式隔离、路由通信、监控统一、权限一致性和调试复杂度

## islands-rsc-followup-1

title: 追问：从工程落地角度看，在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc

### 一句话

先界定「岛屿架构、RSC、部分水合分别在优化什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：从工程落地角度看，在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 标准回答（直接作答）

- 结论：岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 机制：部分水合关注的是减少整页统一 hydration 的成本；RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名
- 落地动作：回答「从工程落地角度看，在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题成立前提是 从工程落地角度看 的渲染热点可观测、失效策略可验证，并且能做回归。
- 失败场景：例如把缓存状态和本地状态混用，从工程落地角度看 会出现重复请求与 UI 闪烁；应拆分数据源并统一失效策略。
- 替代方案与取舍：可把状态都上提到全局仓库，但 从工程落地角度看 易失控；当前按本地/缓存/路由分层可维护性更好。

#### 关键细节（可追问）

- 岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 部分水合关注的是减少整页统一 hydration 的成本
- RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名

## lowcode-platform-followup-1

title: 追问：围绕「低代码/搭建平台的核心模块」做方案评审时，哪些 低代码 边界输入最容易导致结论失真
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform

### 一句话

先界定「低代码/搭建平台的核心模块是什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「低代码/搭建平台的核心模块」做方案评审时，哪些 低代码 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 机制：物料体系：组件元数据、属性面板、默认配置、版本与兼容策略；编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统
- 落地动作：回答「围绕「低代码/搭建平台的核心模块」做方案评审时，哪些 低代码 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「schema：页面结构、组件树、属性、事件、数据源、权限等统一描述」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「物料体系：组件元数据、属性面板、默认配置、版本与兼容策略」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「围绕「低代码/搭建平台的核心模块」做方案评审时，哪些 低代码 边界输入最容易导致结论失真」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 物料体系：组件元数据、属性面板、默认配置、版本与兼容策略
- 编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统

## design-system-engineering-followup-1

title: 追问：从工程落地角度看，真要把「设计系统的工程化（tokens / multi-brand / a11y）」推到线上，你会如何围绕 设计系统 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：从工程落地角度看，真要把「设计系统的工程化（tokens / multi-brand / a11y）」推到线上，你会如何围绕 设计系统 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 机制：多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色；组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）
- 落地动作：回答「从工程落地角度看，真要把「设计系统的工程化（tokens / multi-brand / a11y）」推到线上，你会如何围绕 设计系统 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，真要把「设计系统的工程化（tokens / multi-brand / a11y）」推到线上，你会如何围绕 设计系统 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色
- 组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）

## error-boundaries-resilience-followup-1

title: 追问：以「前端错误隔离与韧性设计」为例，真要把「前端错误隔离与韧性设计」推到线上，你会如何围绕 错误边界 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端错误隔离与韧性设计」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「前端错误隔离与韧性设计」为例，真要把「前端错误隔离与韧性设计」推到线上，你会如何围绕 错误边界 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 机制：分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局；第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹
- 落地动作：回答「以「前端错误隔离与韧性设计」为例，真要把「前端错误隔离与韧性设计」推到线上，你会如何围绕 错误边界 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端错误隔离与韧性设 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端错误隔离与韧性设，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端错误隔离与韧性设计」为例，真要把「前端错误隔离与韧性设计」推到线上，你会如何围绕 错误边界 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局
- 第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹

## monorepo-vs-multirepo-followup-1

title: 追问：在当前团队与业务约束下，真要把「Monorepo 和 Multirepo 怎么选」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Monorepo 和 Multirepo 怎么选」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「Monorepo 和 Multirepo 怎么选」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Monorepo 的优点
- 机制：跨包重构成本低、原子提交；共享 lint / tsconfig / CI 配置
- 落地动作：回答「在当前团队与业务约束下，真要把「Monorepo 和 Multirepo 怎么选」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，真要把「Monorepo 和 Multirepo 怎么选」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Monorepo 的优点
- 跨包重构成本低、原子提交
- 共享 lint / tsconfig / CI 配置

## url-state-sync

title: URL State、搜索参数与浏览器历史怎么设计
difficulty: 进阶
tags: [URL State, 路由, 状态同步]
links: [state-management, 05-browser/navigation-api-app-history, 22-react/react-router-data-loaders]
followups: [url-state-sync-followup-1, url-state-sync-followup-2, url-state-sync-followup-3]

### 一句话

URL 是最适合承载“可分享、可刷新恢复、可前进后退”的状态源；但不是所有状态都该进 URL，筛选、分页、排序、Tab 可以进，临时输入、弹窗草稿和敏感信息不应该进。

### 题目

列表筛选、搜索、分页、Tab、详情返回时，哪些状态应该同步到 URL？如何避免 URL、组件 state、全局 store 三份状态互相打架？

### 答案要点

- 适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人。
- 不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入。
- 设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新。
- URL 写入要做 debounce 和 replace/push 区分：输入中用 `replace`，用户提交搜索或翻页可用 `push` 形成历史记录。
- 解析 query 要有白名单和默认值，非法分享链接不能污染应用状态。
- 多值参数要约定格式：重复 key、逗号分隔、JSON 编码各有取舍；复杂筛选建议用稳定 schema。
- SSR/数据路由场景下，URL 状态还会影响缓存 key 和数据预取，必须保持序列化稳定。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「URL State、搜索参数与浏览器历史怎么设计」时要先定义 URL 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，URL 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 URL 关键链路先收敛再替换。

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

Web Components 的价值在于跨框架分发和浏览器原生封装，Shadow DOM 能隔离 DOM 与样式；但它不是 React/Vue 组件的全面替代，表单、主题、SSR、可访问性和调试成本都要提前评估。

### 题目

在设计系统、低代码物料、第三方 widget 或微前端场景中，什么时候应该考虑 Web Components / Shadow DOM？它们的收益和代价是什么？

### 答案要点

- 适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives。
- Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影。
- 样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通。
- 与框架集成要处理属性/事件差异：布尔属性、对象属性、custom event、受控值和 ref 都需要 wrapper。
- SSR 和 hydration 不如主流框架组件顺滑，Declarative Shadow DOM 可缓解但仍要看浏览器和框架支持。
- 组件库不一定全量 Web Components 化，可把跨框架核心组件下沉，业务复杂组件仍保留框架实现。
- 需要重点测试 a11y：label 关联、focus delegation、键盘导航、aria 属性穿透和弹层 top layer。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」时要把 Web 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Web 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」里当前按阶段替换更稳。

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

推动「前端架构中的分层、边界与依赖方向」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「前端架构中的分层、边界与依赖方向」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 分层 定义「前端架构中的分层、边界与依赖方向」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 机制：依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置；没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升
- 落地动作：回答「当团队成熟度不一致时，你会如何围绕 分层 定义「前端架构中的分层、边界与依赖方向」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当团队成熟度不一致时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当团队成熟度不一致时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「当团队成熟度不一致时，你会如何围绕 分层 定义「前端架构中的分层、边界与依赖方向」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置
- 没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升

## layering-boundary-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「前端架构中的分层、边界与依赖方向」还值不值得继续维护
difficulty: 基础
tags: [分层, 边界, 追问]
parent: layering-boundary
generated: followup-script

### 一句话

先界定「前端架构中的分层、边界与依赖方向」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕「前端架构中的分层、边界与依赖方向」的工程可维护性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「前端架构中的分层、边界与依赖方向」还值不值得继续维护？

### 答案要点

#### 标准回答（直接作答）

- 结论：分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 机制：依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置；没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升
- 落地动作：回答「结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「前端架构中的分层、边界与依赖方向」还值不值得继续维护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「前端架构中的分层、边界与依赖方向」还值不值得继续维护」时要先定义 半年后要做去留决策时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，半年后要做去留决策时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 半年后要做去留决策时 关键链路先收敛再替换。

#### 关键细节（可追问）

- 分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置
- 没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升

## design-patterns-followup-2

title: 追问：以「前端里最常见的设计模式如何落地」为例，面对团队能力差异，你会如何围绕 设计模式 把「前端里最常见的设计模式如何落地」拆成可并行推进的小阶段
difficulty: 进阶
tags: [设计模式, 实战, 追问]
parent: design-patterns
generated: followup-script

### 一句话

推动「前端里最常见的设计模式如何落地」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「前端里最常见的设计模式如何落地」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：以「前端里最常见的设计模式如何落地」为例，面对团队能力差异，你会如何围绕 设计模式 把「前端里最常见的设计模式如何落地」拆成可并行推进的小阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：观察者：响应式系统、状态订阅
- 机制：发布订阅：事件总线、埋点中心、插件系统；策略：表单校验、排序规则、支付/登录方式选择
- 落地动作：回答「以「前端里最常见的设计模式如何落地」为例，面对团队能力差异，你会如何围绕 设计模式 把「前端里最常见的设计模式如何落地」拆成可并行推进的小阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端里最常见的设计模 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端里最常见的设计模，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端里最常见的设计模式如何落地」为例，面对团队能力差异，你会如何围绕 设计模式 把「前端里最常见的设计模式如何落地」拆成可并行推进的小阶段」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 观察者：响应式系统、状态订阅
- 发布订阅：事件总线、埋点中心、插件系统
- 策略：表单校验、排序规则、支付/登录方式选择

## design-patterns-followup-3

title: 追问：以「前端里最常见的设计模式如何落地」为例，如果「前端里最常见的设计模式如何落地」进入维护期，你会优先围绕 设计模式 监控哪些指标来预警风险
difficulty: 进阶
tags: [设计模式, 实战, 追问]
parent: design-patterns
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「前端里最常见的设计模式如何落地」讲成只在理想输入下可用。；围绕「前端里最常见的设计模式如何落地」组织答案时，建议按「约束来源 -> 设计模式 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：以「前端里最常见的设计模式如何落地」为例，如果「前端里最常见的设计模式如何落地」进入维护期，你会优先围绕 设计模式 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：观察者：响应式系统、状态订阅
- 机制：发布订阅：事件总线、埋点中心、插件系统；策略：表单校验、排序规则、支付/登录方式选择
- 落地动作：回答「以「前端里最常见的设计模式如何落地」为例，如果「前端里最常见的设计模式如何落地」进入维护期，你会优先围绕 设计模式 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端里最常见的设计模 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端里最常见的设计模，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端里最常见的设计模式如何落地」为例，如果「前端里最常见的设计模式如何落地」进入维护期，你会优先围绕 设计模式 监控哪些指标来预警风险」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 观察者：响应式系统、状态订阅
- 发布订阅：事件总线、埋点中心、插件系统
- 策略：表单校验、排序规则、支付/登录方式选择

## dependency-injection-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 DI 安排「依赖注入在前端什么时候有价值，什么时候会过度设计」的渐进改造路线
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「依赖注入在前端什么时候有价值，什么时候会过度设计」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> DI 机制 -> 取舍边界」回答，再用「依赖注入在前端什么时候有价值，什么时候会过度设计」补一个反例。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 DI 安排「依赖注入在前端什么时候有价值，什么时候会过度设计」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- 机制：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现；代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接
- 落地动作：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 DI 安排「依赖注入在前端什么时候有价值，什么时候会过度设计」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 DI 安排「依赖注入在前端什么时候有价值，什么时候会过度设计」的渐进改造路线」时要先定义 老系统包袱重 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，老系统包袱重 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 老系统包袱重 关键链路先收敛再替换。

#### 关键细节（可追问）

- 当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现
- 代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接

## dependency-injection-followup-3

title: 追问：从工程落地角度看，为了确认「依赖注入在前端什么时候有价值，什么时候会过度设计」在 DI 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection
generated: followup-script

### 一句话

推动「依赖注入在前端什么时候有价值，什么时候会过度设计」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「依赖注入在前端什么时候有价值，什么时候会过度设计」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，为了确认「依赖注入在前端什么时候有价值，什么时候会过度设计」在 DI 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- 机制：InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现；代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接
- 落地动作：回答「从工程落地角度看，为了确认「依赖注入在前端什么时候有价值，什么时候会过度设计」在 DI 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，为了确认「依赖注入在前端什么时候有价值，什么时候会过度设计」在 DI 上能持续跑稳，你会长期追哪些稳定性和效率信号」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 当系统存在大量可替换基础设施能力时，DI 有助于解耦业务逻辑与具体实现，例如日志、埋点、权限服务、数据访问层、实验开关
- InversifyJS、Tsyringe 这类容器能统一对象创建和依赖装配，也便于测试时替换 mock 实现
- 代价是抽象层增加、调试链路变长、类型与运行时装配都更复杂；如果只是普通组件树和少量服务对象，手工组合往往更直接

## state-management-followup-2

title: 追问：当「Flux、Redux、MobX、Pinia、Signals 的核心差别」让联调成本持续升高时，你会先拆哪条关键链路来止损
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Flux、Redux、MobX、Pinia、Signals 的核心差别」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 状态管理 方案动作 -> 验证结果」。

### 题目

如果面试官追问：当「Flux、Redux、MobX、Pinia、Signals 的核心差别」让联调成本持续升高时，你会先拆哪条关键链路来止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flux/Redux 倾向单向数据流、显式更新和可追踪性
- 机制：MobX/Pinia 更强调开发体验和细粒度响应式；Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”
- 落地动作：回答「当「Flux、Redux、MobX、Pinia、Signals 的核心差别」让联调成本持续升高时，你会先拆哪条关键链路来止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题只有在 Flux 的响应式依赖可追踪、组件边界清晰时才成立。
- 失败场景：例如跨组件共享状态无边界，Flux 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。
- 替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 Flux 会快速耦合；当前按作用域分层更稳。

#### 关键细节（可追问）

- Flux/Redux 倾向单向数据流、显式更新和可追踪性
- MobX/Pinia 更强调开发体验和细粒度响应式
- Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”

## state-management-followup-3

title: 追问：在当前团队与业务约束下，如果比较「Flux、Redux、MobX、Pinia、Signals 的核心差别」与替代方案，你会如何基于 状态管理 判断不同团队阶段的最佳选择
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management
generated: followup-script

### 一句话

推动「Flux、Redux、MobX、Pinia、Signals 的核心差别」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果比较「Flux、Redux、MobX、Pinia、Signals 的核心差别」与替代方案，你会如何基于 状态管理 判断不同团队阶段的最佳选择？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flux/Redux 倾向单向数据流、显式更新和可追踪性
- 机制：MobX/Pinia 更强调开发体验和细粒度响应式；Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”
- 落地动作：回答「在当前团队与业务约束下，如果比较「Flux、Redux、MobX、Pinia、Signals 的核心差别」与替代方案，你会如何基于 状态管理 判断不同团队阶段的最佳选择」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题只有在 Flux 的响应式依赖可追踪、组件边界清晰时才成立。
- 失败场景：例如跨组件共享状态无边界，Flux 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。
- 替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 Flux 会快速耦合；当前按作用域分层更稳。

#### 关键细节（可追问）

- Flux/Redux 倾向单向数据流、显式更新和可追踪性
- MobX/Pinia 更强调开发体验和细粒度响应式
- Signals 直接围绕“值依赖图”更新，往往能减少无关子树工作量，但并不等于“完全没有渲染成本”

## framework-comparison-followup-2

title: 追问：从工程落地角度看，如果团队反馈「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」不好维护，你会如何围绕 框架选型 做分层重构和验证
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 框架选型 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：从工程落地角度看，如果团队反馈「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」不好维护，你会如何围绕 框架选型 做分层重构和验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 机制：再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本；内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性
- 落地动作：回答「从工程落地角度看，如果团队反馈「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」不好维护，你会如何围绕 框架选型 做分层重构和验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，如果团队反馈「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」不好维护，你会如何围绕 框架选型 做分层重构和验证」时必须明确 从工程落地角度看 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，从工程落地角度看 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- 先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本
- 内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性

## framework-comparison-followup-3

title: 追问：在评审「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，你会如何围绕 框架选型 向团队解释“什么时候值得用，什么时候别硬上”
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」讲成只在理想输入下可用。；围绕「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」组织答案时。

### 题目

如果面试官追问：在评审「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，你会如何围绕 框架选型 向团队解释“什么时候值得用，什么时候别硬上”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 机制：再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本；内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性
- 落地动作：回答「在评审「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，你会如何围绕 框架选型 向团队解释“什么时候值得用，什么时候别硬上”」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在评审「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，你会如何围绕 框架选型 向团队解释“什么时候值得用，什么时候别硬上”」时必须明确 Vue 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，Vue 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- 先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本
- 内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性

## component-library-followup-2

title: 追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 组件库 把「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」不是只在理想输入下成立。。

### 题目

如果面试官追问：在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 组件库 把「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 一致：命名、事件、插槽、受控/非受控模式统一
- 机制：主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展；可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义
- 落地动作：回答「在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 组件库 把「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」拆成几段推进，确保每段都能独立验收」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 团队里有人熟有人新时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 团队里有人熟有人新时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，团队里有人熟有人新时，你会怎么围绕 组件库 把「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」拆成几段推进，确保每段都能独立验收」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- API 一致：命名、事件、插槽、受控/非受控模式统一
- 主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展
- 可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义

## component-library-followup-3

title: 追问：从工程落地角度看，你会怎样定义「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的长期健康度，并通过指标持续校准
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」在当前约束下为什么成立。；围绕「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」组织答案时。

### 题目

如果面试官追问：从工程落地角度看，你会怎样定义「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的长期健康度，并通过指标持续校准？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 一致：命名、事件、插槽、受控/非受控模式统一
- 机制：主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展；可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义
- 落地动作：回答「从工程落地角度看，你会怎样定义「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的长期健康度，并通过指标持续校准」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，你会怎样定义「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」的长期健康度，并通过指标持续校准」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- API 一致：命名、事件、插槽、受控/非受控模式统一
- 主题能力：设计令牌、尺寸、颜色、暗黑模式、品牌化扩展
- 可访问性：键盘导航、ARIA、焦点管理、屏幕阅读器语义

## feature-flag-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「Feature Flag、灰度发布与实验系统的前端视角」的渐进改造路线
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag
generated: followup-script

### 一句话

推动「Feature Flag、灰度发布与实验系统的前端视角」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「Feature Flag、灰度发布与实验系统的前端视角」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「Feature Flag、灰度发布与实验系统的前端视角」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flag 要有明确归属、过期时间和回收流程
- 机制：能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断；灰度策略可按用户、组织、比例、环境、地区等维度下发
- 落地动作：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「Feature Flag、灰度发布与实验系统的前端视角」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「Feature Flag、灰度发布与实验系统的前端视角」的渐进改造路线」时要先定义 老系统包袱重 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，老系统包袱重 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 老系统包袱重 关键链路先收敛再替换。

#### 关键细节（可追问）

- Flag 要有明确归属、过期时间和回收流程
- 能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断
- 灰度策略可按用户、组织、比例、环境、地区等维度下发

## feature-flag-followup-3

title: 追问：在当前团队与业务约束下，你会怎样定义「Feature Flag、灰度发布与实验系统的前端视角」的长期健康度，并通过指标持续校准
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Feature Flag、灰度发布与实验系统的前端视角」讲成只在理想输入下可用。；建议按「输入约束 -> 灰度 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样定义「Feature Flag、灰度发布与实验系统的前端视角」的长期健康度，并通过指标持续校准？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flag 要有明确归属、过期时间和回收流程
- 机制：能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断；灰度策略可按用户、组织、比例、环境、地区等维度下发
- 落地动作：回答「在当前团队与业务约束下，你会怎样定义「Feature Flag、灰度发布与实验系统的前端视角」的长期健康度，并通过指标持续校准」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会怎样定义 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会怎样定义，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，你会怎样定义「Feature Flag、灰度发布与实验系统的前端视角」的长期健康度，并通过指标持续校准」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Flag 要有明确归属、过期时间和回收流程
- 能力层要集中：统一取值、缓存、埋点、曝光控制，而不是业务代码各自判断
- 灰度策略可按用户、组织、比例、环境、地区等维度下发

## sdk-docs-followup-2

title: 追问：以「SDK 与文档站设计原则」为例，面对团队能力差异，你会如何围绕 SDK 把「SDK 与文档站设计原则」拆成可并行推进的小阶段
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs
generated: followup-script

### 一句话

推动「SDK 与文档站设计原则」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「SDK 与文档站设计原则」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：以「SDK 与文档站设计原则」为例，面对团队能力差异，你会如何围绕 SDK 把「SDK 与文档站设计原则」拆成可并行推进的小阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 机制：文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南；失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”
- 落地动作：回答「以「SDK 与文档站设计原则」为例，面对团队能力差异，你会如何围绕 SDK 把「SDK 与文档站设计原则」拆成可并行推进的小阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 SDK 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 SDK，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「SDK 与文档站设计原则」为例，面对团队能力差异，你会如何围绕 SDK 把「SDK 与文档站设计原则」拆成可并行推进的小阶段」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南
- 失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”

## sdk-docs-followup-3

title: 追问：以「SDK 与文档站设计原则」为例，如果「SDK 与文档站设计原则」进入维护期，你会优先围绕 SDK 监控哪些指标来预警风险
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「SDK 与文档站设计原则」落到真实交付，而不是停在概念层。；讲「SDK 与文档站设计原则」时先给 SDK 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「SDK 与文档站设计原则」为例，如果「SDK 与文档站设计原则」进入维护期，你会优先围绕 SDK 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 机制：文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南；失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”
- 落地动作：回答「以「SDK 与文档站设计原则」为例，如果「SDK 与文档站设计原则」进入维护期，你会优先围绕 SDK 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 SDK 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 SDK，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「SDK 与文档站设计原则」为例，如果「SDK 与文档站设计原则」进入维护期，你会优先围绕 SDK 监控哪些指标来预警风险」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南
- 失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”

## islands-rsc-followup-2

title: 追问：以「岛屿架构、RSC、部分水合分别在优化什么」为例，你会如何围绕 Islands 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「岛屿架构、RSC、部分水合分别在优化什么」落到真实交付，而不是停在概念层。；讲「岛屿架构、RSC、部分水合分别在优化什么」时先给 Islands 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「岛屿架构、RSC、部分水合分别在优化什么」为例，你会如何围绕 Islands 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 机制：部分水合关注的是减少整页统一 hydration 的成本；RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名
- 落地动作：回答「以「岛屿架构、RSC、部分水合分别在优化什么」为例，你会如何围绕 Islands 定义“方案生效”的判据，并通过测试与观测数据持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题成立前提是 岛屿架构 的渲染热点可观测、失效策略可验证，并且能做回归。
- 失败场景：例如把缓存状态和本地状态混用，岛屿架构 会出现重复请求与 UI 闪烁；应拆分数据源并统一失效策略。
- 替代方案与取舍：可把状态都上提到全局仓库，但 岛屿架构 易失控；当前按本地/缓存/路由分层可维护性更好。

#### 关键细节（可追问）

- 岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 部分水合关注的是减少整页统一 hydration 的成本
- RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名

## islands-rsc-followup-3

title: 追问：在「岛屿架构、RSC、部分水合分别在优化什么」场景下，如果要对比「岛屿架构、RSC、部分水合分别在优化什么」和替代方案，你会先看学习成本、维护成本还是 Islands 相关收益速度
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「岛屿架构、RSC、部分水合分别在优化什么」讲成只在理想输入下可用。；建议按「输入约束 -> Islands 执行链路 -> 结果验证」展开，并结合「岛屿架构、RSC、部分水合分别在优化什么」给出一条可复核结果。

### 题目

如果面试官追问：在「岛屿架构、RSC、部分水合分别在优化什么」场景下，如果要对比「岛屿架构、RSC、部分水合分别在优化什么」和替代方案，你会先看学习成本、维护成本还是 Islands 相关收益速度？

### 答案要点

#### 标准回答（直接作答）

- 结论：岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 机制：部分水合关注的是减少整页统一 hydration 的成本；RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名
- 落地动作：回答「在「岛屿架构、RSC、部分水合分别在优化什么」场景下，如果要对比「岛屿架构、RSC、部分水合分别在优化什么」和替代方案，你会先看学习成本、维护成本还是 Islands 相关收益速度」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题成立前提是 岛屿架构 的渲染热点可观测、失效策略可验证，并且能做回归。
- 失败场景：例如把缓存状态和本地状态混用，岛屿架构 会出现重复请求与 UI 闪烁；应拆分数据源并统一失效策略。
- 替代方案与取舍：可把状态都上提到全局仓库，但 岛屿架构 易失控；当前按本地/缓存/路由分层可维护性更好。

#### 关键细节（可追问）

- 岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 部分水合关注的是减少整页统一 hydration 的成本
- RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名

## design-system-engineering-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 设计系统 定义「设计系统的工程化（tokens / multi-brand / a11y）」的先后改造顺序
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering
generated: followup-script

### 一句话

推动「设计系统的工程化（tokens / multi-brand / a11y）」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 设计系统 定义「设计系统的工程化（tokens / multi-brand / a11y）」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 机制：多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色；组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）
- 落地动作：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 设计系统 定义「设计系统的工程化（tokens / multi-brand / a11y）」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当团队成熟度不一致时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当团队成熟度不一致时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 设计系统 定义「设计系统的工程化（tokens / multi-brand / a11y）」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色
- 组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）

## design-system-engineering-followup-3

title: 追问：以「设计系统的工程化」为例，如果「设计系统的工程化」进入维护期，你会优先围绕 设计系统 监控哪些指标来预警风险
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「设计系统的工程化」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 设计系统 方案动作 -> 验证结果」，并用「设计系统的工程化」举一条主链路说明。。

### 题目

如果面试官追问：以「设计系统的工程化」为例，如果「设计系统的工程化」进入维护期，你会优先围绕 设计系统 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 机制：多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色；组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）
- 落地动作：回答「以「设计系统的工程化」为例，如果「设计系统的工程化」进入维护期，你会优先围绕 设计系统 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 设计系统的工程化 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 设计系统的工程化，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「设计系统的工程化」为例，如果「设计系统的工程化」进入维护期，你会优先围绕 设计系统 监控哪些指标来预警风险」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Tokens 单一来源：颜色 / 间距 / 字体 / 阴影 / 动效用 W3C Design Tokens 格式存 JSON，工具（Style Dictionary）转 CSS / iOS / Android
- 多主题：dark / 高对比 / 多品牌 通过 token 派生，不在组件里写死颜色
- 组件库分层：base（无样式逻辑）/ styled（有 token 装配）/ business（业务封装）

## error-boundaries-resilience-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 错误边界 规划「前端错误隔离与韧性设计」的阶段目标与交付边界
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端错误隔离与韧性设计」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 错误边界 方案动作 -> 验证结果」，并用「前端错误隔离与韧性设计」举一条主链路说明。。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 错误边界 规划「前端错误隔离与韧性设计」的阶段目标与交付边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 机制：分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局；第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹
- 落地动作：回答「从工程落地角度看，面对跨团队协作成本，你会如何围绕 错误边界 规划「前端错误隔离与韧性设计」的阶段目标与交付边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，面对跨团队协作成本，你会如何围绕 错误边界 规划「前端错误隔离与韧性设计」的阶段目标与交付边界」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局
- 第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹

## error-boundaries-resilience-followup-3

title: 追问：从工程落地角度看，为了确认「前端错误隔离与韧性设计」在 错误边界 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「前端错误隔离与韧性设计」时要能同时解释收益、代价和失败信号。；讲「前端错误隔离与韧性设计」时先给 错误边界 的判断口径，再补执行动作和回退条件，会更像真实评审发言。；如果涉及「前端错误隔离与韧性设计」的技术细节。

### 题目

如果面试官追问：从工程落地角度看，为了确认「前端错误隔离与韧性设计」在 错误边界 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 机制：分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局；第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹
- 落地动作：回答「从工程落地角度看，为了确认「前端错误隔离与韧性设计」在 错误边界 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，为了确认「前端错误隔离与韧性设计」在 错误边界 上能持续跑稳，你会长期追哪些稳定性和效率信号」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- React 用 ErrorBoundary，Vue 用 errorCaptured 钩子；模块外裹一层兜底 UI
- 分块加载（dynamic import）失败要捕获并提示用户重试，而不是抛到全局
- 第三方库挂了要降级而不是炸：广告 / 客服 / 埋点 用 try/catch 包裹

## monorepo-vs-multirepo-followup-2

title: 追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 架构 把「Monorepo 和 Multirepo 怎么选」拆成几段推进，确保每段都能独立验收
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo
generated: followup-script

### 一句话

推动「Monorepo 和 Multirepo 怎么选」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「Monorepo 和 Multirepo 怎么选」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 架构 把「Monorepo 和 Multirepo 怎么选」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 标准回答（直接作答）

- 结论：Monorepo 的优点
- 机制：跨包重构成本低、原子提交；共享 lint / tsconfig / CI 配置
- 落地动作：回答「从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 架构 把「Monorepo 和 Multirepo 怎么选」拆成几段推进，确保每段都能独立验收」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 架构 把「Monorepo 和 Multirepo 怎么选」拆成几段推进，确保每段都能独立验收」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Monorepo 的优点
- 跨包重构成本低、原子提交
- 共享 lint / tsconfig / CI 配置

## monorepo-vs-multirepo-followup-3

title: 追问：从工程落地角度看，要判断「Monorepo 和 Multirepo 怎么选」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Monorepo 和 Multirepo 怎么选」不是只在理想输入下成立。。

### 题目

如果面试官追问：从工程落地角度看，要判断「Monorepo 和 Multirepo 怎么选」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：Monorepo 的优点
- 机制：跨包重构成本低、原子提交；共享 lint / tsconfig / CI 配置
- 落地动作：回答「从工程落地角度看，要判断「Monorepo 和 Multirepo 怎么选」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，要判断「Monorepo 和 Multirepo 怎么选」值不值得长期维护，你会先盯哪些和 架构 相关的核心指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Monorepo 的优点
- 跨包重构成本低、原子提交
- 共享 lint / tsconfig / CI 配置

## local-first-sync-crdt-followup-1

title: 追问：在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步, 追问]
parent: local-first-sync-crdt
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」在当前约束下为什么成立。；围绕「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」组织答案时。

### 题目

如果面试官追问：在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型？

### 答案要点

#### 标准回答（直接作答）

- 结论：本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备
- 机制：数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化；冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并
- 落地动作：回答「在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型」时要把 CRDT 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，CRDT 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，CRDT、OT、last-write-wins 分别适合哪些数据类型」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备
- 数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化
- 冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并

## local-first-sync-crdt-followup-2

title: 追问：从工程落地角度看，离线操作恢复联网后如何保证幂等和顺序
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步, 追问]
parent: local-first-sync-crdt
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」在当前约束下为什么成立。；围绕「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」组织答案时。

### 题目

如果面试官追问：从工程落地角度看，离线操作恢复联网后如何保证幂等和顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备
- 机制：数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化；冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并
- 落地动作：回答「从工程落地角度看，离线操作恢复联网后如何保证幂等和顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，离线操作恢复联网后如何保证幂等和顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备
- 数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化
- 冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并

## local-first-sync-crdt-followup-3

title: 追问：在当前团队与业务约束下，local-first 应用如何处理权限变化和本地敏感数据
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步, 追问]
parent: local-first-sync-crdt
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计」讲成只在理想输入下可用。；回答结构可按「触发条件 -> LocalFirst 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，local-first 应用如何处理权限变化和本地敏感数据？

### 答案要点

#### 标准回答（直接作答）

- 结论：本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备
- 机制：数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化；冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并
- 落地动作：回答「在当前团队与业务约束下，local-first 应用如何处理权限变化和本地敏感数据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 local-first 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，local-first 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在当前团队与业务约束下，local-first 应用如何处理权限变化和本地敏感数据」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 本地优先不是简单 localStorage 缓存，而是本地数据库承载主要读写路径，用户操作先落本地，再异步同步到服务端和其他设备
- 数据建模通常围绕 operation log、版本向量、逻辑时钟、服务端确认和幂等重放；服务端既要做广播，也要做权限和最终持久化
- 冲突策略要按业务选择：文本/白板适合 CRDT，表单字段可能用 last-write-wins 加人工提示，库存/余额这类强一致数据不适合完全本地合并

## type-safe-api-contract-followup-1

title: 追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，OpenAPI schema 和后端实现如何防止漂移
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全, 追问]
parent: type-safe-api-contract
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」落到真实交付，而不是停在概念层。。

### 题目

如果面试官追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，OpenAPI schema 和后端实现如何防止漂移？

### 答案要点

#### 标准回答（直接作答）

- 结论：OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步
- 机制：tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计；GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进
- 落地动作：回答「在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，OpenAPI schema 和后端实现如何防止漂移」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 OpenAPI 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 OpenAPI 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，OpenAPI schema 和后端实现如何防止漂移」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步
- tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计
- GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进

## type-safe-api-contract-followup-2

title: 追问：结合真实业务约束，tRPC 适合拆分成多个服务或开放给第三方吗
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全, 追问]
parent: type-safe-api-contract
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」在当前约束下为什么成立。；建议按「输入约束 -> OpenAPI 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，tRPC 适合拆分成多个服务或开放给第三方吗？

### 答案要点

#### 标准回答（直接作答）

- 结论：OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步
- 机制：tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计；GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进
- 落地动作：回答「结合真实业务约束，tRPC 适合拆分成多个服务或开放给第三方吗」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，tRPC 适合拆分成多个服务或开放给第三方吗」时要先确认 tRPC 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，tRPC 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 tRPC 链路分层收口再逐步统一。

#### 关键细节（可追问）

- OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步
- tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计
- GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进

## type-safe-api-contract-followup-3

title: 追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，类型化契约如何和契约测试、mock 服务、灰度发布结合
difficulty: 进阶
tags: [OpenAPI, tRPC, GraphQL, 类型安全, 追问]
parent: type-safe-api-contract
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」落到真实交付，而不是停在概念层。；可以按「问题背景 -> OpenAPI 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，类型化契约如何和契约测试、mock 服务、灰度发布结合？

### 答案要点

#### 标准回答（直接作答）

- 结论：OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步
- 机制：tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计；GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进
- 落地动作：回答「在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，类型化契约如何和契约测试、mock 服务、灰度发布结合」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 OpenAPI 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，OpenAPI 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「OpenAPI / tRPC / GraphQL Codegen 如何把前后端契约类型化」场景下，类型化契约如何和契约测试、mock 服务、灰度发布结合」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- OpenAPI 适合 REST 和多语言团队：后端产出 schema，前端生成类型、请求客户端、mock 数据和文档；关键是保证 schema 与真实实现同步
- tRPC 适合 TypeScript 全栈同仓或强协作团队：服务端 router 类型直接推导到客户端，开发体验好，但跨语言、公开 API 和长期版本治理要额外设计
- GraphQL Codegen 适合客户端按需查询和多端复用：schema + operation 生成精确类型，能减少过取/欠取，但需要治理 N+1、缓存规范和 schema 演进

## url-state-sync-followup-1

title: 追问：以「URL State、搜索参数与浏览器历史怎么设计」为例，什么时候用 push，什么时候用 replace
difficulty: 进阶
tags: [URL State, 路由, 状态同步, 追问]
parent: url-state-sync
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「URL State、搜索参数与浏览器历史怎么设计」讲成只在理想输入下可用。；回答结构可按「触发条件 -> URL State 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：以「URL State、搜索参数与浏览器历史怎么设计」为例，什么时候用 `push`，什么时候用 `replace`？

### 答案要点

#### 标准回答（直接作答）

- 结论：适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人
- 机制：不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入；设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新
- 落地动作：回答「以「URL State、搜索参数与浏览器历史怎么设计」为例，什么时候用 push，什么时候用 replace」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「URL State、搜索参数与浏览器历史怎么设计」为例，什么时候用 push，什么时候用 replace」时要先定义 URL 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，URL 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 URL 关键链路先收敛再替换。

#### 关键细节（可追问）

- 适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人
- 不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入
- 设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新

## url-state-sync-followup-2

title: 追问：结合真实业务约束，URL 状态和服务端数据缓存 key 有什么关系
difficulty: 进阶
tags: [URL State, 路由, 状态同步, 追问]
parent: url-state-sync
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「URL State、搜索参数与浏览器历史怎么设计」在当前约束下为什么成立。；围绕「URL State、搜索参数与浏览器历史怎么设计」组织答案时。

### 题目

如果面试官追问：结合真实业务约束，URL 状态和服务端数据缓存 key 有什么关系？

### 答案要点

#### 标准回答（直接作答）

- 结论：适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人
- 机制：不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入；设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新
- 落地动作：回答「结合真实业务约束，URL 状态和服务端数据缓存 key 有什么关系」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，URL 状态和服务端数据缓存 key 有什么关系」必须先给 URL 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，URL 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 URL 的计算与缓存路径。

#### 关键细节（可追问）

- 适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人
- 不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入
- 设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新

## url-state-sync-followup-3

title: 追问：结合真实业务约束，如果筛选条件很多，URL 太长该怎么处理
difficulty: 进阶
tags: [URL State, 路由, 状态同步, 追问]
parent: url-state-sync
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「URL State、搜索参数与浏览器历史怎么设计」讲成只在理想输入下可用。；回答结构可按「触发条件 -> URL State 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：结合真实业务约束，如果筛选条件很多，URL 太长该怎么处理？

### 答案要点

#### 标准回答（直接作答）

- 结论：适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人
- 机制：不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入；设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新
- 落地动作：回答「结合真实业务约束，如果筛选条件很多，URL 太长该怎么处理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，如果筛选条件很多，URL 太长该怎么处理」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 适合放 URL 的状态：筛选条件、搜索词、分页、排序、Tab、选中的资源 ID，这些状态刷新后应恢复，也适合分享给别人
- 不适合放 URL 的状态：密码、token、未提交草稿、临时弹窗开关、过大的复杂对象、会泄露隐私的用户输入
- 设计上要明确单一事实源：要么 URL 驱动 store，要么 store 写回 URL；不要两边同时 watch 互相更新

## web-components-design-system-followup-1

title: 追问：结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端, 追问]
parent: web-components-design-system
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> WebComponents 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别？

### 答案要点

#### 标准回答（直接作答）

- 结论：适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives
- 机制：Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影；样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通
- 落地动作：回答「结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别」时要把 Shadow 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Shadow 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，Shadow DOM 的样式隔离和 CSS Modules / scoped CSS 有什么本质区别」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives
- Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影
- 样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通

## web-components-design-system-followup-2

title: 追问：Web Component 如何和 React 的受控表单模型配合
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端, 追问]
parent: web-components-design-system
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> WebComponents 方案动作 -> 验证结果」。

### 题目

如果面试官追问：Web Component 如何和 React 的受控表单模型配合？

### 答案要点

#### 标准回答（直接作答）

- 结论：适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives
- 机制：Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影；样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通
- 落地动作：回答「Web Component 如何和 React 的受控表单模型配合」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Web Component 如何和 React 的受控表单模型配合」时要先区分 Web 的本地状态、缓存状态和路由状态；混在一起会导致错误结论。
- 失败场景：例如并发渲染下闭包拿到旧值，Web 交互出现脏读；要使用稳定引用并补并发场景测试。
- 替代方案与取舍：也可过度 memo 追求性能，但调试复杂；当前只优化热点路径并保留清晰数据流。

#### 关键细节（可追问）

- 适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives
- Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影
- 样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通

## web-components-design-system-followup-3

title: 追问：以「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」为例，微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题
difficulty: 资深
tags: [WebComponents, ShadowDOM, 组件库, 微前端, 追问]
parent: web-components-design-system
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」在当前约束下为什么成立。。

### 题目

如果面试官追问：以「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」为例，微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题？

### 答案要点

#### 标准回答（直接作答）

- 结论：适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives
- 机制：Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影；样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通
- 落地动作：回答「以「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」为例，微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「Web Components / Shadow DOM 在组件库和微前端里什么时候值得用」为例，微前端里用 Web Components 做边界，能解决哪些问题，解决不了哪些问题」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 适合场景：跨 React/Vue/Angular 复用的基础组件、嵌入第三方页面的 widget、低代码物料、微前端边界、设计系统底层 primitives
- Custom Elements 提供标准生命周期和自定义标签，Shadow DOM 提供样式和 DOM 封装，slots 提供内容投影
- 样式隔离是收益也是成本：外部 CSS 不容易污染内部，但主题变量、字体、弹层、表单状态、无障碍关联也更难贯通

## clean-architecture-followup-2

title: 追问：结合真实业务约束，你会如何围绕 DDD 定义「Clean Architecture、DDD 思想在前端怎么落地」生效的判据，并用测试与监控长期验证
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Clean Architecture、DDD 思想在前端怎么落地」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 DDD 定义「Clean Architecture、DDD 思想在前端怎么落地」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- 机制：DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来；适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计
- 落地动作：回答「结合真实业务约束，你会如何围绕 DDD 定义「Clean Architecture、DDD 思想在前端怎么落地」生效的判据，并用测试与监控长期验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会如何围绕 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，你会如何围绕 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，你会如何围绕 DDD 定义「Clean Architecture、DDD 思想在前端怎么落地」生效的判据，并用测试与监控长期验证」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来
- 适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计

## clean-architecture-followup-3

title: 追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 DDD 拆分「Clean Architecture、DDD 思想在前端怎么落地」的落地路径
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture
generated: followup-script

### 一句话

推动「Clean Architecture、DDD 思想在前端怎么落地」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 DDD 拆分「Clean Architecture、DDD 思想在前端怎么落地」的落地路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- 机制：DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来；适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计
- 落地动作：回答「从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 DDD 拆分「Clean Architecture、DDD 思想在前端怎么落地」的落地路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，当需求复杂度增长但团队产能有限时，你会如何围绕 DDD 拆分「Clean Architecture、DDD 思想在前端怎么落地」的落地路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来
- 适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计

## lowcode-platform-followup-2

title: 追问：结合真实业务约束，如果要让结论在 低代码 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「低代码/搭建平台的核心模块」讲成只在理想输入下可用。；建议按「输入约束 -> 低代码 执行链路 -> 结果验证」展开，并结合「低代码/搭建平台的核心模块」给出一条可复核结果，能更快体现你对复杂场景的掌控力。。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 低代码 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 机制：物料体系：组件元数据、属性面板、默认配置、版本与兼容策略；编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统
- 落地动作：回答「结合真实业务约束，如果要让结论在 低代码 上可复核，你会怎样安排测试、日志和指标的组合验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果要让结论在 低代码 上可复核，你会怎样安排测试、日志和指标的组合验证」要明确 低代码 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 低代码 的高风险边界。

#### 关键细节（可追问）

- schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 物料体系：组件元数据、属性面板、默认配置、版本与兼容策略
- 编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统

## lowcode-platform-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 低代码 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「低代码/搭建平台的核心模块」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 低代码 机制 -> 取舍边界」回答，再用「低代码/搭建平台的核心模块」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 低代码 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 机制：物料体系：组件元数据、属性面板、默认配置、版本与兼容策略；编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统
- 落地动作：回答「从工程落地角度看，遇到约束变化时，你会如何围绕 低代码 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，遇到约束变化时，你会如何围绕 低代码 拆分方案演进路径，而不是一次性推翻重来」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- schema：页面结构、组件树、属性、事件、数据源、权限等统一描述
- 物料体系：组件元数据、属性面板、默认配置、版本与兼容策略
- 编排器：拖拽、选中、对齐、图层树、撤销重做、快捷键系统

## architecture-adr

title: 架构决策记录（ADR）怎么写，怎么在团队里真正生效
difficulty: 资深
tags: [ADR, 架构决策, 协作]
followups: [architecture-adr-followup-1, architecture-adr-followup-2, architecture-adr-followup-3]

### 一句话

ADR 的价值不是“多写一篇文档”，而是把关键决策的背景、取舍、后果和回滚条件沉淀成可追溯资产，避免团队在同一个问题上反复争论和重复踩坑。

### 题目

前端架构演进中，经常会遇到“当时为什么这样选没人记得”。你会如何设计 ADR 机制，让决策可追溯、可复盘、可执行？

### 答案要点

- ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写。
- 文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件。
- ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新。
- 评审机制要轻量可执行：重大改动必须附 ADR 链接，PR/设计评审里检查是否满足决策前提，避免“文档和代码两张皮”。
- ADR 成效要量化：重复争论次数、决策回溯耗时、架构返工率、跨团队对齐成本是否下降。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 架构决策记录 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 架构决策记录，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「架构决策记录（ADR）怎么写，怎么在团队里真正生效」按阶段灰度，每阶段可验收可撤回。

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

技术债治理的关键不是“喊口号还债”，而是把风险、收益和机会成本量化成业务能理解的语言，用分层台账和节奏化偿还机制把债务控制在可管理范围内。

### 题目

团队都认同技术债很多，但业务总觉得“先上线再说”。你会如何建立一套技术债治理机制，让业务愿意持续投入而不是一次性运动式整治？

### 答案要点

- 先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”。
- 优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋。
- 采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除。
- 对业务要讲 ROI：这项债务治理能减少多少故障、节省多少人天、提升哪些关键指标（转化/留存/投诉率），并给出可验证里程碑。
- 建立止损和退出机制：治理项超过预算或收益不达预期时，允许降级目标或阶段收敛，避免沉没成本持续扩大。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 技术债治理 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 技术债治理，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「技术债治理：如何量化优先级、排期节奏与业务共识」按阶段灰度，每阶段可验收可撤回。

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

先把目标和约束说清楚，再展开实现：这能避免把「架构决策记录怎么写，怎么在团队里真正生效」讲成只在理想输入下可用。；围绕「架构决策记录怎么写，怎么在团队里真正生效」组织答案时，建议按「约束来源 -> ADR 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：在当前团队与业务约束下，当「架构决策记录怎么写，怎么在团队里真正生效」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 标准回答（直接作答）

- 结论：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写
- 机制：文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件；ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新
- 落地动作：回答「在当前团队与业务约束下，当「架构决策记录怎么写，怎么在团队里真正生效」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当「架构决策记录怎么写，怎么在团队里真正生效」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时要先定义 架构决策记录怎么写 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，架构决策记录怎么写 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 架构决策记录怎么写 关键链路先收敛再替换。

#### 关键细节（可追问）

- ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写
- 文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件
- ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新

## architecture-adr-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 ADR 安排「架构决策记录（ADR）怎么写，怎么在团队里真正生效」的渐进改造路线
difficulty: 资深
tags: [ADR, 架构决策, 协作, 追问]
parent: architecture-adr
generated: followup-script

### 一句话

推动「架构决策记录（ADR）怎么写，怎么在团队里真正生效」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「架构决策记录（ADR）怎么写，怎么在团队里真正生效」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 ADR 安排「架构决策记录（ADR）怎么写，怎么在团队里真正生效」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写
- 机制：文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件；ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新
- 落地动作：回答「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 ADR 安排「架构决策记录（ADR）怎么写，怎么在团队里真正生效」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 ADR 安排「架构决策记录（ADR）怎么写，怎么在团队里真正生效」的渐进改造路线」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写
- 文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件
- ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新

## architecture-adr-followup-3

title: 追问：在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」场景下，要判断「架构决策记录（ADR）怎么写，怎么在团队里真正生效」值不值得长期维护，你会先盯哪些和 ADR 相关的核心指标
difficulty: 资深
tags: [ADR, 架构决策, 协作, 追问]
parent: architecture-adr
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「架构决策记录（ADR）怎么写，怎么在团队里真正生效」不是只在理想输入下成立。；再补可观测指标：围绕「架构决策记录（ADR）怎么写。

### 题目

如果面试官追问：在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」场景下，要判断「架构决策记录（ADR）怎么写，怎么在团队里真正生效」值不值得长期维护，你会先盯哪些和 ADR 相关的核心指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写
- 机制：文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件；ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新
- 落地动作：回答「在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」场景下，要判断「架构决策记录（ADR）怎么写，怎么在团队里真正生效」值不值得长期维护，你会先盯哪些和 ADR 相关的核心指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「架构决策记录（ADR）怎么写，怎么在团队里真正生效」场景下，要判断「架构决策记录（ADR）怎么写，怎么在团队里真正生效」值不值得长期维护，你会先盯哪些和 ADR 相关的核心指标」时要先定义 架构决策记录 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，架构决策记录 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 架构决策记录 关键链路先收敛再替换。

#### 关键细节（可追问）

- ADR 要只记录“高影响且难回退”的决策（如状态模型、构建体系、微前端边界），不是所有技术选项都写
- 文档结构必须固定：背景、约束、候选方案、决策结论、取舍理由、风险与回滚、验收指标、触发重审条件
- ADR 不是一次性归档：要绑定负责人、复审时间和状态（proposed/accepted/superseded），让决策能随约束变化更新

## technical-debt-governance-followup-1

title: 追问：如果要做「技术债治理：如何量化优先级、排期节奏与业务共识」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [技术债, 治理, ROI, 追问]
parent: technical-debt-governance
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「技术债治理：如何量化优先级、排期节奏与业务共识」讲成只在理想输入下可用。；建议按「输入约束 -> 技术债 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：如果要做「技术债治理：如何量化优先级、排期节奏与业务共识」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”
- 机制：优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋；采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除
- 落地动作：回答「如果要做「技术债治理：如何量化优先级、排期节奏与业务共识」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要做「技术债治理：如何量化优先级、排期节奏与业务共识」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时要先定义 技术债治理 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，技术债治理 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 技术债治理 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”
- 优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋
- 采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除

## technical-debt-governance-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 技术债 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [技术债, 治理, ROI, 追问]
parent: technical-debt-governance
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「技术债治理：如何量化优先级、排期节奏与业务共识」在当前约束下为什么成立。；建议按「输入约束 -> 技术债 执行链路 -> 结果验证」展开，并结合「技术债治理：如何量化优先级、排期节奏与业务共识」给出一条可复核结果。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 技术债 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”
- 机制：优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋；采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除
- 落地动作：回答「从工程落地角度看，上线后你会盯哪些与 技术债 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，上线后你会盯哪些与 技术债 相关的日志与指标，来确认这套方案确实带来改进」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”
- 优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋
- 采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除

## technical-debt-governance-followup-3

title: 追问：结合真实业务约束，这套「技术债治理：如何量化优先级、排期节奏与业务共识」要不要继续投人投钱，你会盯哪几组和 技术债 相关的数据先说话
difficulty: 资深
tags: [技术债, 治理, ROI, 追问]
parent: technical-debt-governance
generated: followup-script

### 一句话

规模变大后先重新评估「技术债治理：如何量化优先级、排期节奏与业务共识」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「技术债治理：如何量化优先级、排期节奏与业务共识」对应的工程可维护性收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，这套「技术债治理：如何量化优先级、排期节奏与业务共识」要不要继续投人投钱，你会盯哪几组和 技术债 相关的数据先说话？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”
- 机制：优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋；采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除
- 落地动作：回答「结合真实业务约束，这套「技术债治理：如何量化优先级、排期节奏与业务共识」要不要继续投人投钱，你会盯哪几组和 技术债 相关的数据先说话」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 这套 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 这套，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，这套「技术债治理：如何量化优先级、排期节奏与业务共识」要不要继续投人投钱，你会盯哪几组和 技术债 相关的数据先说话」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先建立债务台账分层：稳定性债（事故风险）、效率债（研发效能）、体验债（用户损耗）、合规债（安全/审计），避免“所有问题都叫技术债”
- 优先级要可量化：影响范围、事故概率、修复成本、机会成本、回本周期联合评分，形成透明排序而不是拍脑袋
- 采用“增量偿还”策略：每个迭代预留固定容量（如 15%-20%）处理高优债务，避免只在事故后大扫除

## architecture-fitness-function-gate

title: 架构 Fitness Function：把架构原则变成可执行发布闸门
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门]
followups: [architecture-fitness-function-gate-followup-1, architecture-fitness-function-gate-followup-2, architecture-fitness-function-gate-followup-3]

### 一句话

架构原则如果只能写在文档里，迟早会失效；要把“依赖方向、边界约束、性能预算、可靠性底线”转成自动化检查，才能在持续交付下长期守住架构质量。

### 题目

你会如何设计前端架构的 Fitness Function，并把它接入 CI/CD，防止系统在迭代中悄悄劣化？

### 答案要点

- 先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值。
- 规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）。
- 规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付。
- Fitness Function 要有例外机制：紧急场景可临时豁免，但必须记录 owner、过期时间和补偿计划。
- 用趋势看治理效果：架构违规数、跨层调用数、回滚率、故障恢复时长是否持续改善。
- 评审机制要联动：重大 PR 必须附规则结果和风险说明，避免“本地能过、线上失控”。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「架构 Fitness Function：把架构原则变成可执行发布闸门」时要先定义 架构 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，架构 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 架构 关键链路先收敛再替换。

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

老系统迁移失败往往不是“技术方案错”，而是“切换节奏错”：通过双轨运行、可观测分流和可回退边界，才能把高风险重构拆成可验证的小步快跑。

### 题目

面对历史包袱重、业务连续迭代的前端系统，你会如何做绞杀式迁移，既不停业务又避免长期双轨失控？

### 答案要点

- 先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写。
- 设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换。
- 数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态。
- 迁移每一步都要可观测：比较新旧路径的成功率、时延、错误类型和业务转化，防止“功能看似一致、体验悄悄下滑”。
- 设退出条件：当新路径稳定达标后，限制旧路径只读并计划性下线，避免双轨长期并存。
- 回滚预案必须演练：明确触发阈值、切回动作、沟通流程与责任人，确保分钟级止损。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 前端绞杀式迁移 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，前端绞杀式迁移 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「前端绞杀式迁移：旧架构双轨运行与安全下线」风险不足；当前优先服务端强校验，因为可审计、可回滚。

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

推动「架构 Fitness Function：把架构原则变成可执行发布闸门」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：结合真实业务约束，真要把「架构 Fitness Function：把架构原则变成可执行发布闸门」推到线上，你会如何围绕 架构治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值
- 机制：规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）；规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付
- 落地动作：回答「结合真实业务约束，真要把「架构 Fitness Function：把架构原则变成可执行发布闸门」推到线上，你会如何围绕 架构治理 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，真要把「架构 Fitness Function：把架构原则变成可执行发布闸门」推到线上，你会如何围绕 架构治理 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值
- 规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）
- 规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付

## architecture-fitness-function-gate-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构治理 方案有效
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门, 追问]
parent: architecture-fitness-function-gate
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「架构 Fitness Function：把架构原则变成可执行发布闸门」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 架构治理 方案动作 -> 验证结果」。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构治理 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值
- 机制：规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）；规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付
- 落地动作：回答「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构治理 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了避免主观判断 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了避免主观判断 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 架构治理 方案有效」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值
- 规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）
- 规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付

## architecture-fitness-function-gate-followup-3

title: 追问：在「架构 Fitness Function：把架构原则变成可执行发布闸门」场景下，复盘「架构 Fitness Function：把架构原则变成可执行发布闸门」时，你会拿哪些数据判断这套方案该继续投入还是该止损
difficulty: 资深
tags: [架构治理, Fitness Function, 发布闸门, 追问]
parent: architecture-fitness-function-gate
generated: followup-script

### 一句话

规模变大后先重新评估「架构 Fitness Function：把架构原则变成可执行发布闸门」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：在「架构 Fitness Function：把架构原则变成可执行发布闸门」场景下，复盘「架构 Fitness Function：把架构原则变成可执行发布闸门」时，你会拿哪些数据判断这套方案该继续投入还是该止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值
- 机制：规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）；规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付
- 落地动作：回答「在「架构 Fitness Function：把架构原则变成可执行发布闸门」场景下，复盘「架构 Fitness Function：把架构原则变成可执行发布闸门」时，你会拿哪些数据判断这套方案该继续投入还是该止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「架构 Fitness Function：把架构原则变成可执行发布闸门」场景下，复盘「架构 Fitness Function：把架构原则变成可执行发布闸门」时，你会拿哪些数据判断这套方案该继续投入还是该止损」时要先定义 架构 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，架构 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 架构 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先把“原则”转成“可判定规则”：例如禁止跨层依赖、限制循环引用、限制入口包体、关键链路错误率阈值
- 规则分三层：提交时静态检查（lint/依赖图）、构建时质量闸门（体积/性能回归）、线上运行时守护（SLO/burn rate）
- 规则要支持分级处置：阻断级（必须修复）、告警级（限期治理）、观察级（先采样），避免“一刀切”拖慢交付

## strangler-migration-playbook-followup-1

title: 追问：从工程落地角度看，当「前端绞杀式迁移：旧架构双轨运行与安全下线」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚, 追问]
parent: strangler-migration-playbook
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「前端绞杀式迁移：旧架构双轨运行与安全下线」在当前约束下为什么成立。；回答结构可按「触发条件 -> 架构迁移 机制 -> 风险兜底」展开，并以「前端绞杀式迁移：旧架构双轨运行与安全下线」补一条失败场景。

### 题目

如果面试官追问：从工程落地角度看，当「前端绞杀式迁移：旧架构双轨运行与安全下线」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 标准回答（直接作答）

- 结论：先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写
- 机制：设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换；数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态
- 落地动作：回答「从工程落地角度看，当「前端绞杀式迁移：旧架构双轨运行与安全下线」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当「前端绞杀式迁移：旧架构双轨运行与安全下线」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写
- 设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换
- 数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态

## strangler-migration-playbook-followup-2

title: 追问：结合真实业务约束，你会怎样验证「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚, 追问]
parent: strangler-migration-playbook
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端绞杀式迁移：旧架构双轨运行与安全下线」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 标准回答（直接作答）

- 结论：先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写
- 机制：设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换；数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态
- 落地动作：回答「结合真实业务约束，你会怎样验证「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实攻击流量下仍能维持防护效果与可观测性」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会怎样验证 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，你会怎样验证 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「结合真实业务约束，你会怎样验证「前端绞杀式迁移：旧架构双轨运行与安全下线」在真实攻击流量下仍能维持防护效果与可观测性」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写
- 设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换
- 数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态

## strangler-migration-playbook-followup-3

title: 追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「前端绞杀式迁移：旧架构双轨运行与安全下线」范围，并把 架构迁移 相关技术债回补计划讲清楚
difficulty: 资深
tags: [架构迁移, 双轨运行, 回滚, 追问]
parent: strangler-migration-playbook
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端绞杀式迁移：旧架构双轨运行与安全下线」落到真实交付，而不是停在概念层。；讲「前端绞杀式迁移：旧架构双轨运行与安全下线」时先给 架构迁移 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「前端绞杀式迁移：旧架构双轨运行与安全下线」范围，并把 架构迁移 相关技术债回补计划讲清楚？

### 答案要点

#### 标准回答（直接作答）

- 结论：先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写
- 机制：设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换；数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态
- 落地动作：回答「从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「前端绞杀式迁移：旧架构双轨运行与安全下线」范围，并把 架构迁移 相关技术债回补计划讲清楚」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，从工程落地角度看 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「从工程落地角度看，如果上线窗口突然提前到下个月，你会怎么收敛「前端绞杀式迁移：旧架构双轨运行与安全下线」范围，并把 架构迁移 相关技术债回补计划讲清楚」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 先划迁移单元：按路由、业务域或能力模块切片，避免全站一次性重写
- 设计双轨入口：新旧路径都可独立运行，并可基于用户分群/流量比例进行灰度切换
- 数据与契约要前置兼容：接口、埋点、权限、缓存键统一版本策略，保证回退时不破坏状态

## architecture-contract-acceptance-gate

title: 架构契约验收闸门：接口、事件与依赖变更如何跨团队落地
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门]
followups: [architecture-contract-acceptance-gate-followup-1, architecture-contract-acceptance-gate-followup-2, architecture-contract-acceptance-gate-followup-3]

### 一句话

架构治理最容易失效在“口头契约”：只有把接口、事件和依赖协议变成可执行验收闸门，跨团队协作才不会在发布时互相踩雷。

### 题目

你负责一个由多前端域团队协作的系统，公共 BFF 与事件总线由平台组维护。若某团队要升级契约（字段语义、事件 schema、依赖版本），你会如何设计架构契约验收机制？

### 答案要点

- 先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程。
- 契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可。
- 所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则。
- 发布门禁必须自动化：OpenAPI/AsyncAPI diff、契约测试、关键链路冒烟统一进入 CI。
- 观测要按版本维度分桶：错误率、4xx/5xx、事件消费失败率、业务转化分版本看。
- 下线旧契约前做流量清点：确认调用方收敛后再执行 sunset，防止“僵尸调用”。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」要明确 架构契约验收闸门 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 架构契约验收闸门 的高风险边界。

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

架构升级失败时，真正决定事故规模的不是 bug 本身，而是爆炸半径是否被提前约束：先分层灰度、再隔离边界、最后编排回滚，才能把风险关在可控范围。

### 题目

你要推动一次涉及路由编排、鉴权中间件和埋点链路的架构升级。如何在发布前设计“爆炸半径矩阵”，确保异常时能快速止损而不是全站回退？

### 答案要点

- 先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值。
- 明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合。
- 每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退。
- 触发条件要量化：错误率、慢请求、关键转化下降、告警连续时间共同决定止损动作。
- 演练要覆盖“局部故障扩散”场景：验证单点异常不会穿透到全链路。
- 回滚后复盘矩阵有效性：比较预估影响面与真实影响面，持续修正边界定义。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」时要先定义 架构变更爆炸半径矩阵 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，架构变更爆炸半径矩阵 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 架构变更爆炸半径矩阵 关键链路先收敛再替换。

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

先给可验证结论，再补证据链：面试官想确认你是否能把「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」落到真实交付，而不是停在概念层。；讲「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」时先给 架构治理 的判断口径，再补执行动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程
- 机制：契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可；所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则
- 落地动作：回答「结合真实业务约束，你会如何识别「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」在真实流量下最容易失效的输入与环境约束」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会如何识别 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，你会如何识别 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，你会如何识别「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」在真实流量下最容易失效的输入与环境约束」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程
- 契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可
- 所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则

## architecture-contract-acceptance-gate-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 架构治理 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门, 追问]
parent: architecture-contract-acceptance-gate
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 架构治理 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 架构治理 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程
- 机制：契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可；所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则
- 落地动作：回答「在当前团队与业务约束下，为了证明这个方案在 架构治理 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了证明这个方案在 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了证明这个方案在 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「在当前团队与业务约束下，为了证明这个方案在 架构治理 维度有效，你会怎么设计测试闭环和线上观测指标」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程
- 契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可
- 所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则

## architecture-contract-acceptance-gate-followup-3

title: 追问：以「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」为例，当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏
difficulty: 资深
tags: [架构治理, 契约测试, 发布闸门, 追问]
parent: architecture-contract-acceptance-gate
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」讲成只在理想输入下可用。；建议按「输入约束 -> 架构治理 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：以「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」为例，当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程
- 机制：契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可；所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则
- 落地动作：回答「以「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」为例，当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 架构契约验收闸门 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，架构契约验收闸门 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「以「架构契约验收闸门：接口、事件与依赖变更如何跨团队落地」为例，当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先定义契约分级：兼容变更、风险变更、破坏性变更分别绑定不同审批和发布流程
- 契约变更要“双向验证”：provider 侧 schema 校验 + consumer 侧回放验证缺一不可
- 所有变更都要给兼容窗口：旧版保留周期、迁移截止时间、下线门槛提前写入规则

## architecture-blast-radius-rollback-matrix-followup-1

title: 追问：如果要做「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [架构治理, 灰度, 回滚, 追问]
parent: architecture-blast-radius-rollback-matrix
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」讲成只在理想输入下可用。；建议按「输入约束 -> 架构治理 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：如果要做「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值
- 机制：明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合；每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退
- 落地动作：回答「如果要做「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 架构变更爆炸半径矩阵 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 架构变更爆炸半径矩阵，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「如果要做「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值
- 明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合
- 每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退

## architecture-blast-radius-rollback-matrix-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 架构治理 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [架构治理, 灰度, 回滚, 追问]
parent: architecture-blast-radius-rollback-matrix
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 架构治理 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 架构治理 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值
- 机制：明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合；每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退
- 落地动作：回答「从工程落地角度看，上线后你会盯哪些与 架构治理 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，上线后你会盯哪些与 架构治理 相关的日志与指标，来确认这套方案确实带来改进」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值
- 明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合
- 每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退

## architecture-blast-radius-rollback-matrix-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏
difficulty: 资深
tags: [架构治理, 灰度, 回滚, 追问]
parent: architecture-blast-radius-rollback-matrix
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「架构变更爆炸半径矩阵：分层灰度、隔离边界与回滚编排」在当前约束下为什么成立。；回答结构可按「触发条件 -> 架构治理 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值
- 机制：明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合；每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退
- 落地动作：回答「当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「当兼容性要求提升或预算收紧时，你会如何围绕 架构治理 调整方案边界与实施节奏」时要先定义 当兼容性要求提升或预 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当兼容性要求提升或预 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当兼容性要求提升或预 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先按影响面分层：用户入口层、业务流程层、基础能力层分别设独立灰度策略与阈值
- 明确隔离边界：高风险能力必须可单独熔断，不得与核心主流程强耦合
- 每层都要有回滚优先级：配置开关、路由策略、应用版本、依赖版本分层回退
