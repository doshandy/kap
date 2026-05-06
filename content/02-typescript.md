---
id: 02-typescript
title: TypeScript 进阶
order: 2
icon: 🔷
description: 类型系统、泛型、类型体操、声明文件与工程实践。
---

## any-vs-unknown
title: any、unknown、never 三者的区别
difficulty: 基础
tags: [类型]

### 题目
解释 `any`、`unknown`、`never` 的区别与使用场景。

### 答案要点
- `any`：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- `unknown`：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- `never`：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 实战：第三方/动态数据先用 `unknown`，配合类型守卫收窄；穷尽检查时用 `never` 兜底

### 代码示例
```ts
function ensureNever(x: never): never { throw new Error('exhaustive: ' + x); }
type Shape = { kind: 'circle' } | { kind: 'square' };
function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return 1;
    case 'square': return 2;
    default: return ensureNever(s); // 新增 kind 时编译报错
  }
}
```

### 延伸
- `--noImplicitAny`、`strict`、`exactOptionalPropertyTypes` 是工程必开
- `unknown` + 运行时校验（zod / valibot）才是真正可靠的边界

## generic-constraints
title: 泛型约束、默认值与条件类型
difficulty: 进阶
tags: [泛型]

### 题目
设计一个 `pick<T, K>` 工具，要求 K 必须是 T 的属性键。再设计 `pickByValue<T, V>` 选出值类型为 V 的键。

### 答案要点
- 泛型约束 `K extends keyof T` 限制类型参数
- 映射类型 + 条件类型 + key remapping 实现按值过滤

### 代码示例
```ts
type Pick2<T, K extends keyof T> = { [P in K]: T[P] };

type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface User { id: number; name: string; admin: boolean; }
type Strs = PickByValue<User, string>; // { name: string }
```

### 延伸
- `infer` 在条件类型里取出元素类型：`type Item<T> = T extends Array<infer U> ? U : never`
- 协变/逆变：函数参数逆变，返回值协变；`strictFunctionTypes` 控制此行为

## type-vs-interface
title: type 与 interface 的区别与取舍
difficulty: 基础
tags: [类型]

### 题目
type 与 interface 的差异有哪些？什么时候用哪个？

### 答案要点
- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 经验：对外公共 API 用 interface（可被使用方扩展）；联合/工具类型/复杂类型用 type

### 代码示例
```ts
interface Box { x: number }
interface Box { y: number } // 合并
const b: Box = { x: 1, y: 2 };

type Result<T> = { ok: true; data: T } | { ok: false; err: Error };
```

### 延伸
- `satisfies` 可保留字面量类型同时验证形状
- 推荐尽量"声明对象用 interface，组合用 type"

## utility-types
title: 内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现
difficulty: 进阶
tags: [类型, 手写]

### 题目
手写 Partial / Required / Readonly / Pick / Omit / Record / NonNullable / ReturnType 的实现。

### 答案要点
- 全部基于映射类型 + 条件类型 + 修饰符 `+/-`

### 代码示例
```ts
type Partial2<T> = { [K in keyof T]?: T[K] };
type Required2<T> = { [K in keyof T]-?: T[K] };
type Readonly2<T> = { readonly [K in keyof T]: T[K] };
type Pick2<T, K extends keyof T> = { [P in K]: T[P] };
type Omit2<T, K extends keyof any> = Pick2<T, Exclude<keyof T, K>>;
type Record2<K extends keyof any, V> = { [P in K]: V };
type NonNullable2<T> = T extends null | undefined ? never : T;
type ReturnType2<F> = F extends (...a: any[]) => infer R ? R : never;
```

### 延伸
- `DeepPartial`、`DeepReadonly` 需要递归映射
- `Awaited<T>` 解出 Promise 的最终值类型，是类型体操中的递归经典

## template-literal-types
title: 模板字面量类型与字符串操纵
difficulty: 进阶
tags: [类型, 字符串]

### 题目
实现 `Camelize<S>` 把 `'user_name'` 转 `'userName'`，再实现 `Trim<S>`。

### 答案要点
- 模板字面量 `${A}_${B}` 配合 `infer` 拆解字符串
- 内置 `Uppercase/Lowercase/Capitalize/Uncapitalize`
- 配合分布式条件类型可以实现完整字符串变换

### 代码示例
```ts
type Camelize<S extends string> =
  S extends `${infer A}_${infer B}${infer C}`
    ? `${A}${Uppercase<B>}${Camelize<C>}`
    : S;

type X = Camelize<'user_first_name'>; // 'userFirstName'

type Trim<S extends string> =
  S extends ` ${infer R}` ? Trim<R> :
  S extends `${infer L} ` ? Trim<L> : S;
```

### 延伸
- 可结合 `as const` 推导出精确字面量
- React Router / API 类型可基于此做 URL 解析

## discriminated-union
title: 判别联合（Tagged Union）的设计与穷尽性
difficulty: 进阶
tags: [类型]

### 题目
为什么推荐用 tagged union 设计领域模型？怎么保证穷尽匹配？

### 答案要点
- 用一个共有的字面量字段（如 `type` / `kind`）做判别
- TS 会自动收窄 → 编译期保证 switch/if 处理了所有分支
- 缺一个分支时 `never` 兜底报错

### 代码示例
```ts
type Action =
  | { type: 'add'; payload: number }
  | { type: 'reset' }
  | { type: 'set'; payload: { value: number } };

function reduce(s: number, a: Action): number {
  switch (a.type) {
    case 'add': return s + a.payload;
    case 'reset': return 0;
    case 'set': return a.payload.value;
    default: { const _: never = a; return s; }
  }
}
```

### 延伸
- Pinia / Redux Toolkit 推荐用 tagged union
- Result 模式 `{ ok: true; data: T } | { ok: false; err: E }`

## branded-types
title: 品牌类型（Branded Types）实现单位/ID 隔离
difficulty: 资深
tags: [类型, 模式]

### 题目
如何用类型让 `UserId` 和 `OrderId` 不能互换，即使底层都是 string？

### 答案要点
- 在原始类型上"贴一个不可访问的 brand 字段"
- 编译期区分，运行时无成本

### 代码示例
```ts
type Brand<K, B extends string> = K & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

const asUserId = (s: string) => s as UserId;
const u: UserId = asUserId('u_1');
const o: OrderId = u; // ❌ 类型错误，brand 不同
```

### 延伸
- 适合金额（`Cents`）、单位（`Meters`）、加密后的字符串（`Hashed<T>`）
- 与 zod 配合：`schema.brand<'UserId'>()`

## conditional-distribution
title: 分布式条件类型与 Naked Type Parameter
difficulty: 资深
tags: [类型]

### 题目
为什么 `T extends U ? X : Y` 在 T 是联合类型时会"分布"？如何关掉这种分布？

### 答案要点
- 当 T 是裸类型参数（直接出现在 extends 左侧）且为联合时，TS 会对每个成员分别应用条件，结果再 union
- 用 `[T] extends [U]` 包裹可阻止分布

### 代码示例
```ts
type ToArray<T> = T extends any ? T[] : never;
type A = ToArray<string | number>; // string[] | number[]

type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type B = ToArrayNonDist<string | number>; // (string | number)[]
```

### 延伸
- 工具类型 `Exclude/Extract/NonNullable` 都依赖分布式条件类型
- 想合并联合 → `UnionToIntersection`（基于函数参数逆变）

## tsconfig-strict
title: tsconfig 关键字段与严格模式开启策略
difficulty: 进阶
tags: [工程]

### 题目
列举 tsconfig 中影响项目"安全等级"的关键字段，并给出推荐配置。

### 答案要点
- `strict: true` 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- `noUncheckedIndexedAccess`：访问索引时返回 `T | undefined`，避免数组越界
- `exactOptionalPropertyTypes`：区分 `x?: T` 与 `x: T | undefined`
- `noFallthroughCasesInSwitch`、`noImplicitReturns`、`noImplicitOverride`
- `isolatedModules`：保证每个文件可独立编译（与 Vite/SWC 协作）
- `verbatimModuleSyntax`：更接近“按你写的模块语法原样保留/检查”，并要求类型导入导出显式使用 `type` 修饰符
- 对前端 bundler 项目，常见推荐是 `moduleResolution: "Bundler"` 搭配 `module: "ESNext"`；但 Node 原生运行时项目更常见 `node16` / `nodenext`

### 代码示例
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleResolution": "Bundler"
  }
}
```

### 延伸
- 大型仓库建议拆 `tsconfig.base.json` + project references，加速增量编译
- `moduleResolution: "Bundler"` 的特点之一是支持 package.json `imports` / `exports`，且相对导入通常不强制写文件扩展名，更贴近 Vite、Rspack 等构建工具环境

## declaration-merging
title: 声明合并与模块扩展（Module Augmentation）
difficulty: 进阶
tags: [类型, 工程]

### 题目
怎么给第三方库（如 `vue-router`）的类型加字段？怎么扩展全局 `Window`？

### 答案要点
- interface 自动合并；同名 namespace 也合并
- 模块扩展用 `declare module 'xx' { interface X { ... } }`
- 全局扩展用 `declare global { interface Window { __MY__: X } }`

### 代码示例
```ts
// types/router.d.ts
import 'vue-router';
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    title?: string;
  }
}

declare global {
  interface Window { __APP_VERSION__: string }
}
export {};
```

### 延伸
- 声明文件若要同时写 `declare global` 与其他导入导出，通常应把它做成一个模块（例如保留 `export {}`）；真正是否需要额外 import，取决于 tsconfig 的 `include` 范围和该声明文件是否被编译器纳入程序

## vue-with-ts
title: Vue 3 中 TypeScript 的最佳实践
difficulty: 进阶
tags: [Vue, 类型]

### 题目
在 `<script setup lang="ts">` 中，如何为 props/emits/slots/expose/provide-inject 标注类型？

### 答案要点
- `defineProps<{ }>()` 泛型形式（编译期擦除，零运行时成本）
- `defineEmits<{ (e: 'change', v: string): void }>()` 调用签名
- `defineSlots<{ default: (p: { item: T }) => any }>()`
- `defineExpose<{ focus(): void }>()`
- 跨组件类型共享：`provide<symbol>(key, value)` 配合 `InjectionKey<T>`

### 代码示例
```ts
import type { InjectionKey } from 'vue';
const ThemeKey: InjectionKey<{ dark: boolean }> = Symbol('theme');
provide(ThemeKey, { dark: true });
const t = inject(ThemeKey); // 类型自动推断
```

### 延伸
- 表单/校验场景结合 zod 等运行时 schema，自动 infer 类型
- 组件库的 `defineComponent` + 泛型 props，可以做出真正泛型的列表/表格组件
