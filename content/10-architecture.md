---
id: 10-architecture
title: 前端架构
order: 10
icon: 🏗️
description: 分层、解耦、状态管理、组件库、设计模式与中大型前端系统设计。
---

## layering-boundary
title: 前端架构中的分层、边界与依赖方向
difficulty: 基础
tags: [分层, 边界]

### 题目
一个中大型前端项目为什么要谈“分层”和“边界”？如果不设边界，最常见的问题是什么？

### 答案要点
- 分层让职责清晰：页面编排、领域逻辑、数据访问、基础设施各管各的
- 依赖方向要尽量单向，避免 UI 组件直接操作接口层、埋点层、全局配置
- 没边界时最常见的问题是：改一个需求牵一片、复用困难、测试困难、认知负担飙升

### 延伸
- 架构不是追求“层数多”，而是让变化在局部闭合

## design-patterns
title: 前端里最常见的设计模式如何落地
difficulty: 进阶
tags: [设计模式, 实战]

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
  subscribe(fn: (v: T) => void) { this.subs.push(fn); return () => this.unsubscribe(fn); }
  unsubscribe(fn: (v: T) => void) { this.subs = this.subs.filter(s => s !== fn); }
  notify(v: T) { this.subs.forEach(fn => fn(v)); }
}

// 2. 策略：表单校验
type Validator = (v: any) => string | null;
const validators: Record<string, Validator> = {
  required: v => v ? null : '必填',
  email: v => /\S+@\S+\.\S+/.test(v) ? null : '邮箱格式不对',
  phone: v => /^1\d{10}$/.test(v) ? null : '手机号不对',
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
interface User { id: string; name: string; }
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

### 延伸
- 设计模式不是背诵题，关键是你能否说清"它解决了哪个变化点"

## dependency-injection
title: 依赖注入在前端什么时候有价值，什么时候会过度设计
difficulty: 资深
tags: [DI, InversifyJS, Tsyringe]

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

interface ILogger { log(msg: string): void; }
interface IUserRepo { getById(id: string): Promise<{ id: string; name: string }>; }

@injectable()
class ConsoleLogger implements ILogger {
  log(msg: string) { console.log('[log]', msg); }
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

### 延伸
- DI 的价值更多体现在复杂后台、设计器、插件系统、低代码平台，而不是简单页面应用
- 很多团队真正需要的是"清晰的组合根和依赖边界"，不一定非要重型容器

## state-management
title: Flux、Redux、MobX、Pinia、Signals 的核心差别
difficulty: 进阶
tags: [状态管理, Signals]

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
    const found = items.value.find(i => i.id === item.id);
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
      const found = state.items.find(i => i.id === action.payload.id);
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

### 延伸
- 没有"永远最优"的状态库，只有"与你的问题最契合"的模型

## framework-comparison
title: Vue、React、Solid、Svelte、Qwik 应该从什么维度比较
difficulty: 资深
tags: [框架选型, Vue, React, Solid, Svelte, Qwik]

### 题目
如果团队在做新项目选型，应该如何比较 Vue、React、Solid、Svelte、Qwik，而不是只看“谁更快”？

### 答案要点
- 先看编程模型与团队心智：Vue 偏模板 + 响应式；React 偏 JSX + 组合式生态；Solid 更细粒度响应式；Svelte 把更多工作前移到编译期；Qwik 强调可恢复性与极低 hydration 成本
- 再看生态与组织能力：设计系统、路由、SSR、测试、招聘市场、现有代码沉淀、DevTools 体验都比跑分更影响长期成本
- 内容站、营销站更看重 SSR/SSG 与首屏；重后台更看状态治理、组件生态和团队熟练度；多团队协作还要考虑规范统一与可维护性
- 性能对比必须带业务前提。框架基准测试能说明某些模型差异，但不能直接替代真实业务压测与可维护性评估

### 延伸
- “选最先进的框架”通常不是目标，选“最能稳定交付业务目标的框架”才是
- 框架迁移的最大成本往往不在语法，而在生态替换、团队训练和历史资产兼容

## component-library
title: 组件库设计的关键指标：一致性、可扩展、可访问、可主题化
difficulty: 资深
tags: [组件库, DesignSystem]

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

### 延伸
- 组件库不是"把页面组件抽出来"，而是提供稳定、长期可演进的抽象

## clean-architecture
title: Clean Architecture、DDD 思想在前端怎么落地
difficulty: 资深
tags: [DDD, CleanArchitecture]

### 题目
很多人说前端没必要谈 DDD/整洁架构，你怎么看？

### 答案要点
- 前端同样会有复杂业务规则、权限、流程编排和多端适配问题
- DDD/整洁架构的价值不在“照搬后端分层”，而在于把领域规则从 UI 和基础设施中拆出来
- 适合高复杂度后台、运营平台、设计器、低代码等场景；简单内容站不必过度设计

### 延伸
- 架构风格要和复杂度匹配，过度抽象会伤害交付效率

## feature-flag
title: Feature Flag、灰度发布与实验系统的前端视角
difficulty: 进阶
tags: [灰度, AB实验]

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
  rollout?: number;          // 0~100 灰度百分比
  segments?: string[];       // 用户分群
  expiresAt?: number;        // 过期时间，强制提醒清理
  owner: string;
}

class FeatureFlags {
  private flags = new Map<string, FlagConfig>();
  private user: { id: string; segments: string[] } = { id: '', segments: [] };

  async loadFromServer() {
    const res = await fetch('/api/flags');
    const list = await res.json() as FlagConfig[];
    list.forEach(f => this.flags.set(f.key, f));
  }

  isOn(key: string): boolean {
    const f = this.flags.get(key);
    if (!f || !f.enabled) return false;
    if (f.expiresAt && f.expiresAt < Date.now()) {
      console.warn(`Flag ${key} 已过期，请清理`);
      return false;
    }
    if (f.segments?.length && !f.segments.some(s => this.user.segments.includes(s))) return false;
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

### 延伸
- 最危险的不是"没有灰度"，而是"有一堆永远不清理的灰度分支"

## sdk-docs
title: SDK 与文档站设计原则
difficulty: 进阶
tags: [SDK, 文档]

### 题目
为什么很多团队技术能力不差，但做出来的 SDK 和文档却难用？

### 答案要点
- SDK 设计要优先考虑接入体验、错误提示、版本兼容、最小心智负担
- 文档要面向受众分层：快速开始、概念、API、FAQ、最佳实践、迁移指南
- 失败案例通常不是功能不够，而是“入口不清晰、约束不稳定、示例不可信”

### 延伸
- 好的 SDK 文档本身就是架构的一部分，因为它决定能力如何被团队消费

## microfrontend
title: 微前端什么时候值得做，什么时候只是把复杂度前置
difficulty: 资深
tags: [微前端, ModuleFederation]

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
export async function bootstrap() { console.log('bootstrap'); }
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

### 延伸
- 如果一个团队只是想"代码分模块"，通常组件化、monorepo、模块化路由就够了

## islands-rsc
title: 岛屿架构、RSC、部分水合分别在优化什么
difficulty: 资深
tags: [Islands, RSC, SSR]

### 题目
岛屿架构、React Server Components、部分水合这些概念经常一起出现，它们各自在解决什么问题？

### 答案要点
- 岛屿架构强调“大部分页面先输出静态 HTML，只给少量交互岛注入 JS”
- 部分水合关注的是减少整页统一 hydration 的成本
- RSC 把一部分组件逻辑放在服务端环境中执行，减少客户端 JS 和数据搬运量；它不是传统 SSR 的简单别名
- 三者共同目标都与降低首屏 JS、减少客户端工作量有关，但抽象层级和框架实现方式不同

### 延伸
- 这类架构的价值高度依赖内容型页面、商城、营销站等场景；纯重交互后台收益未必高
- RSC 已能作为应用开发模型稳定使用，但对框架/打包器作者来说，底层实现接口仍要密切跟随框架版本演进

## lowcode-platform
title: 低代码/搭建平台的核心模块是什么
difficulty: 资深
tags: [低代码, Schema, 物料]

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
  type: string;          // 物料类型 'Button' / 'Form' / 'Table'
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
    schema.children?.map(c => renderSchema(c)) ?? [],
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
  const propsStr = Object.entries(s.props).map(([k, v]) => `${k}="${v}"`).join(' ');
  const children = s.children?.map(renderTemplate).join('') ?? '';
  return `<${s.type} ${propsStr}>${children}</${s.type}>`;
}
```

### 延伸
- 低代码平台本质上是在设计一套"可长期演进的 UI DSL"
- 最大难点通常不是拖拽，而是 schema 稳定性与物料治理

## design-system-engineering
title: 设计系统的工程化（tokens / multi-brand / a11y）
difficulty: 资深
tags: [设计系统, Design Tokens]

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
    css: { transformGroup: 'css', buildPath: 'dist/css/', files: [{ destination: 'tokens.css', format: 'css/variables' }] },
    js: { transformGroup: 'js', buildPath: 'dist/js/', files: [{ destination: 'tokens.ts', format: 'javascript/es6' }] },
    ios: { transformGroup: 'ios', buildPath: 'dist/ios/', files: [{ destination: 'Tokens.swift', format: 'ios-swift/class.swift' }] },
  },
}).buildAllPlatforms();
```

### 延伸
- 多品牌切换可在运行时通过 CSS 自定义属性切换 token，无需重新构建
- 设计系统的核心收益是"减少决策次数"，比强加约束更重要

## error-boundaries-resilience
title: 前端错误隔离与韧性设计
difficulty: 资深
tags: [错误边界, 韧性]

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
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
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
        <Suspense fallback={<Skeleton />}><Comments /></Suspense>
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

### 延伸
- 韧性设计的关键是"假设任何子模块都可能挂"，把隔离点提前规划好
- 关键页面要做混沌测试：故意让某个 API 返回错误，验证降级是否生效

## monorepo-vs-multirepo
title: Monorepo 和 Multirepo 怎么选
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

### 延伸
- 大厂自研：字节 Vesna、阿里 Bigfish、Google google3（含整个公司代码）
- Monorepo 的关键是"远程缓存"——Turborepo Remote Cache / Nx Cloud
- 不管哪种方案，CI 速度和构建可缓存性是核心生产力

