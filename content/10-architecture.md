---
id: 10-architecture
title: 前端架构
order: 10
icon: 🏗️
description: 分层、解耦、状态管理、组件库、设计模式与中大型前端系统设计。
---

## layering-boundary

title: 前端架构中的分层、边界与依赖方向
followups: [layering-boundary-followup-1]
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
followups: [design-patterns-followup-1]
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
followups: [dependency-injection-followup-1]
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
followups: [state-management-followup-1]
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
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 状态管理、Signals，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 没有"永远最优"的状态库，只有"与你的问题最契合"的模型

## framework-comparison

title: Vue、React、Solid、Svelte、Qwik 应该从什么维度比较
followups: [framework-comparison-followup-1]
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

### 追问

- 在 Vue 项目里落地「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 框架选型、Vue、React，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- “选最先进的框架”通常不是目标，选“最能稳定交付业务目标的框架”才是
- 框架迁移的最大成本往往不在语法，而在生态替换、团队训练和历史资产兼容

## component-library

title: 组件库设计的关键指标：一致性、可扩展、可访问、可主题化
followups: [component-library-followup-1]
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
followups: [clean-architecture-followup-1]
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
followups: [feature-flag-followup-1]
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
followups: [sdk-docs-followup-1]
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
followups: [islands-rsc-followup-1]
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

### 追问

- 在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题？
- 你会用 Profiler、测试或线上指标如何验证这个优化有效？
- 它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？

### 常见误区

- 回答「岛屿架构、RSC、部分水合分别在优化什么」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。
- 把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。
- 混淆客户端状态、服务端缓存和 URL 状态，导致数据源重复、失效策略不一致。
- 相关标签是 Islands、RSC、SSR，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 这类架构的价值高度依赖内容型页面、商城、营销站等场景；纯重交互后台收益未必高
- RSC 已能作为应用开发模型稳定使用，但对框架/打包器作者来说，底层实现接口仍要密切跟随框架版本演进

## lowcode-platform

title: 低代码/搭建平台的核心模块是什么
followups: [lowcode-platform-followup-1]
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
followups: [design-system-engineering-followup-1]
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
followups: [error-boundaries-resilience-followup-1]
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
followups: [monorepo-vs-multirepo-followup-1]
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

title: 追问：推动「前端架构中的分层、边界与依赖方向」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 基础
tags: [分层, 边界, 追问]
parent: layering-boundary

### 题目

如果面试官追问：推动「前端架构中的分层、边界与依赖方向」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「前端架构中的分层、边界与依赖方向」拆成可验证的小步骤，逐步替换高风险部分。

## local-first-sync-crdt

title: Local-first 应用的同步引擎：离线、冲突与 CRDT 怎么设计
difficulty: 资深
tags: [LocalFirst, CRDT, 离线, 同步]
links: [21-interview-special/design-realtime-collab]

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

title: 追问：推动「前端里最常见的设计模式如何落地」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [设计模式, 实战, 追问]
parent: design-patterns

### 题目

如果面试官追问：推动「前端里最常见的设计模式如何落地」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「前端里最常见的设计模式如何落地」拆成可验证的小步骤，逐步替换高风险部分。

## dependency-injection-followup-1

title: 追问：推动「依赖注入在前端什么时候有价值，什么时候会过度设计」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe, 追问]
parent: dependency-injection

### 题目

如果面试官追问：推动「依赖注入在前端什么时候有价值，什么时候会过度设计」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「依赖注入在前端什么时候有价值，什么时候会过度设计」拆成可验证的小步骤，逐步替换高风险部分。

## state-management-followup-1

title: 追问：在 Vue 项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [状态管理, Signals, 追问]
parent: state-management

### 题目

如果面试官追问：在 Vue 项目里落地「Flux、Redux、MobX、Pinia、Signals 的核心差别」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Flux、Redux、MobX、Pinia、Signals 的核心差别」拆成可验证的小步骤，逐步替换高风险部分。

## framework-comparison-followup-1

title: 追问：在 Vue 项目里落地「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，响应式边界和组件更新时机要注意什么
difficulty: 资深
tags: [框架选型, Vue, React, Solid, 追问]
parent: framework-comparison

### 题目

如果面试官追问：在 Vue 项目里落地「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue、React、Solid、Svelte、Qwik 应该从什么维度比较」拆成可验证的小步骤，逐步替换高风险部分。

## component-library-followup-1

title: 追问：推动「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [组件库, DesignSystem, 追问]
parent: component-library

### 题目

如果面试官追问：推动「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「组件库设计的关键指标：一致性、可扩展、可访问、可主题化」不是只在理想输入下成立。
- 再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## clean-architecture-followup-1

title: 追问：「Clean Architecture、DDD 思想在前端怎么落地」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [DDD, CleanArchitecture, 追问]
parent: clean-architecture

### 题目

如果面试官追问：「Clean Architecture、DDD 思想在前端怎么落地」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Clean Architecture、DDD 思想在前端怎么落地」拆成可验证的小步骤，逐步替换高风险部分。

## feature-flag-followup-1

title: 追问：推动「Feature Flag、灰度发布与实验系统的前端视角」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [灰度, AB实验, 追问]
parent: feature-flag

### 题目

如果面试官追问：推动「Feature Flag、灰度发布与实验系统的前端视角」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Feature Flag、灰度发布与实验系统的前端视角」拆成可验证的小步骤，逐步替换高风险部分。

## sdk-docs-followup-1

title: 追问：推动「SDK 与文档站设计原则」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [SDK, 文档, 追问]
parent: sdk-docs

### 题目

如果面试官追问：推动「SDK 与文档站设计原则」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「SDK 与文档站设计原则」拆成可验证的小步骤，逐步替换高风险部分。

## microfrontend-followup-1

title: 追问：「微前端什么时候值得做，什么时候只是把复杂度前置」有哪些容易漏掉的边界输入和复杂度陷阱
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 题目

如果面试官追问：「微前端什么时候值得做，什么时候只是把复杂度前置」有哪些容易漏掉的边界输入和复杂度陷阱？

### 答案要点

#### 核心回答

- 先界定「微前端什么时候值得做，什么时候只是把复杂度前置」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「微前端适合强组织边界、独立发布节奏差异大、单仓单应用已明显失控的场景」要进一步补到边界条件里，而不是只复述结论。

## microfrontend-followup-2

title: 追问：如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 题目

如果面试官追问：如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 核心回答

- 规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。
- 如果 复杂度和正确性 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。
- 答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

## microfrontend-followup-3

title: 追问：你会怎么证明实现正确，而不是只靠几个样例跑通
difficulty: 资深
tags: [微前端, ModuleFederation, 追问]
parent: microfrontend

### 题目

如果面试官追问：你会怎么证明实现正确，而不是只靠几个样例跑通？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「微前端什么时候值得做，什么时候只是把复杂度前置」不是只在理想输入下成立。
- 再补可观测指标：复杂度和正确性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## islands-rsc-followup-1

title: 追问：在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题
difficulty: 资深
tags: [Islands, RSC, SSR, 追问]
parent: islands-rsc

### 题目

如果面试官追问：在 React 项目里应用「岛屿架构、RSC、部分水合分别在优化什么」时，哪些 state 或渲染边界最容易出问题？

### 答案要点

#### 核心回答

- 先界定「岛屿架构、RSC、部分水合分别在优化什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”」要进一步补到边界条件里，而不是只复述结论。

## lowcode-platform-followup-1

title: 追问：「低代码/搭建平台的核心模块是什么」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [低代码, Schema, 物料, 追问]
parent: lowcode-platform

### 题目

如果面试官追问：「低代码/搭建平台的核心模块是什么」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「低代码/搭建平台的核心模块是什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「schema：页面结构、组件树、属性、事件、数据源、权限等统一描述」要进一步补到边界条件里，而不是只复述结论。

## design-system-engineering-followup-1

title: 追问：推动「设计系统的工程化（tokens / multi-brand / a11y）」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [设计系统, Design Tokens, 追问]
parent: design-system-engineering

### 题目

如果面试官追问：推动「设计系统的工程化（tokens / multi-brand / a11y）」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「设计系统的工程化（tokens / multi-brand / a11y）」拆成可验证的小步骤，逐步替换高风险部分。

## error-boundaries-resilience-followup-1

title: 追问：推动「前端错误隔离与韧性设计」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [错误边界, 韧性, 追问]
parent: error-boundaries-resilience

### 题目

如果面试官追问：推动「前端错误隔离与韧性设计」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「前端错误隔离与韧性设计」拆成可验证的小步骤，逐步替换高风险部分。

## monorepo-vs-multirepo-followup-1

title: 追问：推动「Monorepo 和 Multirepo 怎么选」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [架构, Monorepo, 追问]
parent: monorepo-vs-multirepo

### 题目

如果面试官追问：推动「Monorepo 和 Multirepo 怎么选」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Monorepo 和 Multirepo 怎么选」拆成可验证的小步骤，逐步替换高风险部分。

## url-state-sync

title: URL State、搜索参数与浏览器历史怎么设计
difficulty: 进阶
tags: [URL State, 路由, 状态同步]
links: [state-management, 05-browser/navigation-api-app-history, 22-react/react-router-data-loaders]

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
