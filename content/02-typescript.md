---
id: 02-typescript
title: TypeScript 进阶
order: 2
icon: 🔷
description: 类型系统、泛型、类型体操、声明文件与工程实践。
---

## any-vs-unknown

title: any、unknown、never 三者的区别
followups: [any-vs-unknown-followup-1]
difficulty: 基础
tags: [类型]

### 一句话

`any` 是"放弃治疗"什么都行；`unknown` 是"我不知道，你得先收窄类型才能用"；`never` 是"这里压根不可能发生"。优先用 unknown 替代 any。

### 题目

解释 `any`、`unknown`、`never` 的区别与使用场景。

### 答案要点

- `any`：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- `unknown`：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- `never`：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 实战：第三方/动态数据先用 `unknown`，配合类型守卫收窄；穷尽检查时用 `never` 兜底

### 代码示例

```ts
function ensureNever(x: never): never {
  throw new Error('exhaustive: ' + x);
}
type Shape = { kind: 'circle' } | { kind: 'square' };
function area(s: Shape) {
  switch (s.kind) {
    case 'circle':
      return 1;
    case 'square':
      return 2;
    default:
      return ensureNever(s); // 新增 kind 时编译报错
  }
}
```

### 常见误区

- 全用 `any` 把类型系统当摆设，等于回到 JS
- `unknown` 想当成 any 用：必须先 narrow 才能访问属性
- `as` 断言滥用，把错误硬塞过去——上线就 NPE

### 追问

- never 是什么？什么场景会用到
- 函数签名里 `unknown` 和 `any` 怎么选
- `as const` 干什么用（字面量类型 + readonly）

### 延伸

- `--noImplicitAny`、`strict`、`exactOptionalPropertyTypes` 是工程必开
- `unknown` + 运行时校验（zod / valibot）才是真正可靠的边界

## generic-constraints

title: 泛型约束、默认值与条件类型
followups: [generic-constraints-followup-1]
links: [conditional-distribution]
difficulty: 进阶
tags: [泛型]

### 一句话

泛型约束 K extends keyof T 限制类型参数；映射类型 + 条件类型 + key remapping 实现按值过滤。

### 题目

设计一个 `pick<T, K>` 工具，要求 K 必须是 T 的属性键。再设计 `pickByValue<T, V>` 选出值类型为 V 的键。

### 答案要点

- 泛型约束 `K extends keyof T` 限制类型参数必须是 T 的合法键
- `extends` 还支持给泛型加形状约束（如 `<T extends { id: string }>`）和默认值（`<T = unknown>`）
- 映射类型 `{ [P in K]: T[P] }` 遍历键；`as` 子句做 **key remapping**，返回 `never` 即过滤
- 条件类型 `T extends U ? X : Y` 与 `infer` 配合可解构数组、Promise、函数返回值
- `pickByValue` 思路：遍历 keyof T，仅当值类型 `extends V` 才保留键

### 代码示例

```ts
type Pick2<T, K extends keyof T> = { [P in K]: T[P] };

type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface User {
  id: number;
  name: string;
  admin: boolean;
}
type Strs = PickByValue<User, string>; // { name: string }
```

### 追问

- 「泛型约束、默认值与条件类型」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「泛型约束、默认值与条件类型」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 泛型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `infer` 在条件类型里取出元素类型：`type Item<T> = T extends Array<infer U> ? U : never`
- 协变/逆变：函数参数逆变，返回值协变；`strictFunctionTypes` 控制此行为

## type-vs-interface

title: type 与 interface 的区别与取舍
followups: [type-vs-interface-followup-1]
difficulty: 基础
tags: [类型]

### 一句话

两者大多数场景互通；interface 适合"对象 + 可被外部声明合并扩展"（典型如库的扩展点），type 适合联合、交叉、映射等高级运算。

### 题目

type 与 interface 的差异有哪些？什么时候用哪个？

### 答案要点

- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 经验：对外公共 API 用 interface（可被使用方扩展）；联合/工具类型/复杂类型用 type

### 代码示例

```ts
interface Box {
  x: number;
}
interface Box {
  y: number;
} // 合并
const b: Box = { x: 1, y: 2 };

type Result<T> = { ok: true; data: T } | { ok: false; err: Error };
```

### 常见误区

- 以为 interface 不能写联合类型——其实是 type 才能；interface 不能直接 `interface A = B | C`
- interface 同名声明会**自动合并**，type 不会；做 module augmentation 必须用 interface
- 性能上：长链 type 别名会拖慢 tsc，interface 更友好

### 追问

- 给一个第三方库的 module 加属性怎么做
- 联合类型加 discriminant 字段为什么能让 narrow 成立
- declare module '\*.svg' 这种用法是什么原理

### 延伸

- `satisfies` 可保留字面量类型同时验证形状
- 推荐尽量"声明对象用 interface，组合用 type"

## utility-types

title: 内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现
followups: [utility-types-followup-1]
difficulty: 进阶
tags: [类型, 手写]

### 一句话

Partial（全可选）、Required（全必选）、Pick（挑几个）、Omit（去几个）、Record（键值映射）、ReturnType（取返回类型）—— 内置 6 个就能覆盖日常 80% 类型操作。

### 题目

手写 Partial / Required / Readonly / Pick / Omit / Record / NonNullable / ReturnType 的实现。

### 答案要点

- 全部基于**映射类型 + 条件类型 + 修饰符 `+/-`** 三个核心机制
- `Partial / Readonly` 加 `?` 或 `readonly`；`Required` 用 `-?` 强制移除可选标记
- `Pick<T,K>` 直接遍历 K；`Omit` = `Pick<T, Exclude<keyof T, K>>`，本质是反向选
- `NonNullable` 用条件类型过滤 null/undefined；`ReturnType` 用 `infer R` 捕获函数返回值类型
- `Record<K,V>` 用映射类型按键生成对象；K 通常约束为 `keyof any` 即 string|number|symbol

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

### 常见误区

- `Partial<T>` 不会递归 → 嵌套对象的字段还是必填；要 `DeepPartial`
- `Pick / Omit` 用错 key 名编译期能提示，但运行时还是要严格
- `Record<K, V>` 当 K 是 string 时会被认为「key 全可枚举」，可能不是你想要的

### 追问

- 实现 DeepPartial / DeepReadonly
- Required<T> 和 NonNullable<T> 区别
- 实现 PickByValue（按值类型筛选 key）

### 延伸

- `DeepPartial`、`DeepReadonly` 需要递归映射
- `Awaited<T>` 解出 Promise 的最终值类型，是类型体操中的递归经典

## template-literal-types

title: 模板字面量类型与字符串操纵
followups: [template-literal-types-followup-1]
difficulty: 进阶
tags: [类型, 字符串]

### 一句话

模板字面量 ${A}_${B} 配合 infer 拆解字符串；内置 Uppercase/Lowercase/Capitalize/Uncapitalize；配合分布式条件类型可以实现完整字符串变换。

### 题目

实现 `Camelize<S>` 把 `'user_name'` 转 `'userName'`，再实现 `Trim<S>`。

### 答案要点

- 模板字面量 `${A}_${B}` 配合 `infer` 拆解字符串
- 内置 `Uppercase/Lowercase/Capitalize/Uncapitalize`
- 配合分布式条件类型可以实现完整字符串变换

### 代码示例

```ts
type Camelize<S extends string> = S extends `${infer A}_${infer B}${infer C}`
  ? `${A}${Uppercase<B>}${Camelize<C>}`
  : S;

type X = Camelize<'user_first_name'>; // 'userFirstName'

type Trim<S extends string> = S extends ` ${infer R}`
  ? Trim<R>
  : S extends `${infer L} `
    ? Trim<L>
    : S;
```

### 追问

- 「模板字面量类型与字符串操纵」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「模板字面量类型与字符串操纵」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 类型、字符串，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 可结合 `as const` 推导出精确字面量
- React Router / API 类型可基于此做 URL 解析

## discriminated-union

title: 判别联合（Tagged Union）的设计与穷尽性
followups: [discriminated-union-followup-1]
difficulty: 进阶
tags: [类型]

### 一句话

用一个共有的字面量字段（如 type / kind）做判别；TS 会自动收窄 → 编译期保证 switch/if 处理了所有分支；缺一个分支时 never 兜底报错。

### 题目

为什么推荐用 tagged union 设计领域模型？怎么保证穷尽匹配？

### 答案要点

- 用一个共有的**字面量字段**（如 `type` / `kind` / `status`）做判别
- TS 在 switch/if 中会自动**类型收窄**，访问字段时不必再断言
- 默认分支放 `const _: never = x;`，缺一个分支时编译期立刻报错（穷尽性）
- 优势：领域建模清晰、可扩展（加 case 编译期会强制找全引用点）
- 适用场景：Redux Action、UI 状态机、API Result 类型、AST 节点

### 代码示例

```ts
type Action =
  | { type: 'add'; payload: number }
  | { type: 'reset' }
  | { type: 'set'; payload: { value: number } };

function reduce(s: number, a: Action): number {
  switch (a.type) {
    case 'add':
      return s + a.payload;
    case 'reset':
      return 0;
    case 'set':
      return a.payload.value;
    default: {
      const _: never = a;
      return s;
    }
  }
}
```

### 追问

- 推动「判别联合（Tagged Union）的设计与穷尽性」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「判别联合（Tagged Union）的设计与穷尽性」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 类型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Pinia / Redux Toolkit 推荐用 tagged union
- Result 模式 `{ ok: true; data: T } | { ok: false; err: E }`

## branded-types

title: 品牌类型（Branded Types）实现单位/ID 隔离
followups: [branded-types-followup-1]
difficulty: 资深
tags: [类型, 模式]

### 一句话

在原始类型上"贴一个不可访问的 brand 字段"；编译期区分，运行时无成本。

### 题目

如何用类型让 `UserId` 和 `OrderId` 不能互换，即使底层都是 string？

### 答案要点

- 在原始类型上**叠加一个不可访问的 brand 字段**（用 `&` 交叉），形成"名义类型"
- 编译期区分，运行时无成本（运行时仍是 string/number）
- 必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入
- 适用场景：UserId/OrderId 隔离、金额单位（Cents/USD）、已 escape 字符串、Hash 值

### 代码示例

```ts
type Brand<K, B extends string> = K & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

const asUserId = (s: string) => s as UserId;
const u: UserId = asUserId('u_1');
const o: OrderId = u; // ❌ 类型错误，brand 不同
```

### 追问

- 「品牌类型（Branded Types）实现单位/ID 隔离」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「品牌类型（Branded Types）实现单位/ID 隔离」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 类型、模式，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 适合金额（`Cents`）、单位（`Meters`）、加密后的字符串（`Hashed<T>`）
- 与 zod 配合：`schema.brand<'UserId'>()`

## conditional-distribution

title: 分布式条件类型与 Naked Type Parameter
followups: [conditional-distribution-followup-1]
links: [generic-constraints, infer-extract]
difficulty: 资深
tags: [类型]

### 一句话

当 T 是裸类型参数（直接出现在 extends 左侧）且为联合时，TS 会对每个成员分别应用条件，结果再 union；用 [T] extends [U] 包裹可阻止分布。

### 题目

为什么 `T extends U ? X : Y` 在 T 是联合类型时会"分布"？如何关掉这种分布？

### 答案要点

- "**裸类型参数**"指 T 直接出现在 `extends` 左侧（不被任何 `[]` / 元组包裹）
- 裸 T 且为联合时，TS 对**每个成员分别应用条件**，结果再 union
- 用 `[T] extends [U]` 元组包裹可关闭分布行为，把整个联合作为一个整体判定
- `Exclude / Extract / NonNullable` 等工具类型**正是利用分布**实现对联合的逐项过滤
- 经验：写工具类型时务必明确"要不要分布"，否则容易写出反直觉行为

### 代码示例

```ts
type ToArray<T> = T extends any ? T[] : never;
type A = ToArray<string | number>; // string[] | number[]

type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type B = ToArrayNonDist<string | number>; // (string | number)[]
```

### 追问

- 「分布式条件类型与 Naked Type Parameter」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「分布式条件类型与 Naked Type Parameter」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 类型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 工具类型 `Exclude/Extract/NonNullable` 都依赖分布式条件类型
- 想合并联合 → `UnionToIntersection`（基于函数参数逆变）

## tsconfig-strict

title: tsconfig 关键字段与严格模式开启策略
followups: [tsconfig-strict-followup-1]
links: [10-architecture/type-safe-api-contract]
difficulty: 进阶
tags: [工程]

### 一句话

strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization。

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
    "moduleResolution": "Bundler",
  },
}
```

### 追问

- 推动「tsconfig 关键字段与严格模式开启策略」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「tsconfig 关键字段与严格模式开启策略」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 工程，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大型仓库建议拆 `tsconfig.base.json` + project references，加速增量编译
- `moduleResolution: "Bundler"` 的特点之一是支持 package.json `imports` / `exports`，且相对导入通常不强制写文件扩展名，更贴近 Vite、Rspack 等构建工具环境

## declaration-merging

title: 声明合并与模块扩展（Module Augmentation）
followups: [declaration-merging-followup-1]
difficulty: 进阶
tags: [类型, 工程]

### 一句话

interface 自动合并；同名 namespace 也合并；模块扩展用 declare module 'xx' { interface X { ... } }。

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
  interface Window {
    __APP_VERSION__: string;
  }
}
export {};
```

### 追问

- 推动「声明合并与模块扩展（Module Augmentation）」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「声明合并与模块扩展（Module Augmentation）」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 类型、工程，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 声明文件若要同时写 `declare global` 与其他导入导出，通常应把它做成一个模块（例如保留 `export {}`）；真正是否需要额外 import，取决于 tsconfig 的 `include` 范围和该声明文件是否被编译器纳入程序

## vue-with-ts

title: Vue 3 中 TypeScript 的最佳实践
followups: [vue-with-ts-followup-1]
difficulty: 进阶
tags: [Vue, 类型]

### 一句话

defineProps<{ }>() 泛型形式（编译期擦除，零运行时成本）；defineEmits<{ (e: 'change', v: string): void }>() 调用签名。

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

### 追问

- 在 Vue 项目里落地「Vue 3 中 TypeScript 的最佳实践」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「Vue 3 中 TypeScript 的最佳实践」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 Vue、类型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 表单/校验场景结合 zod 等运行时 schema，自动 infer 类型
- 组件库的 `defineComponent` + 泛型 props，可以做出真正泛型的列表/表格组件

## infer-extract

title: 用 infer 在条件类型里抽取类型
followups: [infer-extract-followup-1]
links: [conditional-distribution]
difficulty: 资深
tags: [infer, 条件类型]

### 一句话

语法：T extends Pattern<infer X> ? X : never；用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型。

### 题目

条件类型中 `infer` 怎么用？常见的"从泛型中拆解"模式有哪些？

### 答案要点

- 语法：`T extends Pattern<infer X> ? X : never`
- 用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型
- 内置 utility 几乎都是 infer 实现：`ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType`
- 多 infer：可以在同一条件里抽多个位置的类型
- 配合分布式条件类型可以遍历联合类型每一项
- 注意：`infer` 只能用在 `extends` 子句的右侧，不能在普通类型注解里用

### 代码示例

```ts
type First<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]] ? F : never;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type F = First<[1, 2, 3]>; // 1
type L = Last<[1, 2, 3]>; // 3

type DeepReturn<T> = T extends (...a: never[]) => infer R
  ? R extends Promise<infer U>
    ? U
    : R
  : never;

type StoreState<S> = S extends { state: () => infer R } ? R : never;

type EventName<T extends string> = T extends `on${infer Name}` ? Lowercase<Name> : never;
type N = EventName<'onClick' | 'onMouseDown'>; // "click" | "mousedown"
```

### 追问

- 「用 infer 在条件类型里抽取类型」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「用 infer 在条件类型里抽取类型」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 infer、条件类型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `infer` 名称可以重复，但不同分支的同名 infer 互不影响
- 配合 `extends infer U & U` 可以做"分布式 → 单体"控制（trick）

## global-augmentation

title: 全局类型扩展与模块声明合并
followups: [global-augmentation-followup-1]
difficulty: 资深
tags: [声明合并, ambient]

### 一句话

declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局；第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并。

### 题目

怎么给 `window`、第三方库、Vue 实例补充全局类型？三方包没有 d.ts 怎么办？

### 答案要点

- `declare global { interface Window { foo: Foo } }` 在某模块文件里扩展全局
- 第三方包扩展：`declare module 'pkg-name' { ... }`，会与原始声明合并
- 命名空间合并：同名 namespace 自动合并，可在自己的项目里补充
- 没有 d.ts 的包：先看 `@types/pkg`，没有就 `declare module 'pkg-name'` 写最小骨架
- Vue 3 全局属性：`declare module 'vue' { interface ComponentCustomProperties { $api: ApiClient } }`
- React Router meta：`declare module 'react-router' { interface IndexRouteObject { meta?: Meta } }`

### 代码示例

```ts
declare global {
  interface Window {
    __APP__?: { user: { id: string; name: string } };
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: { get: <T>(url: string) => Promise<T> };
  }
}

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    apiBase: string;
  }
}

declare module 'no-types-pkg' {
  export function doStuff(input: string): Promise<{ ok: boolean }>;
  const _default: { doStuff: typeof doStuff };
  export default _default;
}

export {};
```

### 追问

- 「全局类型扩展与模块声明合并」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「全局类型扩展与模块声明合并」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 声明合并、ambient，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 全局扩展文件必须能被 tsconfig 的 `include` 找到，且不能没有 `import/export`（否则会被当成脚本而不是模块）
- 多团队共用扩展点（meta、permissions、i18n key）建议放共享 d.ts，避免类型重复定义

## branded-vs-opaque

title: 品牌类型 (Branded Types) 与不透明类型
followups: [branded-vs-opaque-followup-1]
difficulty: 资深
tags: [类型安全, Branded]

### 一句话

TS 默认结构等价，所有 string 都互通；加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }；创建：用工厂函数做 cast，禁止外部直接 as。

### 题目

TS 是结构化类型，怎么让 `UserId` 和 `OrderId` 在编译期不可互换？

### 答案要点

- TS 默认结构等价，所有 string 都互通
- 加一层"虚拟字段"做品牌：`type UserId = string & { __brand: 'UserId' }`
- 创建：用工厂函数做 cast，禁止外部直接 as
- 同样可以做 `Email / NonEmptyString / PositiveInt` 这类语义类型
- 优势：避免参数顺序错误（把 orderId 传给 userId 参数）、强制走校验
- 类似概念：Effect-TS 的 `Brand`、io-ts 的 newtype、F# 的单一成员 union

### 代码示例

```ts
declare const brand: unique symbol;
type Brand<T, B> = T & { [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;

export function userId(s: string): UserId {
  if (!/^u_[\w-]+$/.test(s)) throw new Error('invalid user id');
  return s as UserId;
}

export function email(s: string): Email {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('invalid email');
  return s as Email;
}

function sendEmail(to: Email, body: string) {}

const u: UserId = userId('u_001');
sendEmail(u, 'hi');
```

### 追问

- 如果把「品牌类型 (Branded Types) 与不透明类型」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「品牌类型 (Branded Types) 与不透明类型」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 类型安全、Branded，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 后台 API 边界（zod / valibot 解析）就是创建品牌类型的最好场景，"进了核心域就不许再是裸 string"
- Branded 类型在序列化（JSON.stringify）时品牌字段消失，但运行期没影响

## type-level-gymnastics

title: 类型体操实用模式（不只是为了炫技）
followups: [type-level-gymnastics-followup-1]
difficulty: 资深
tags: [类型体操, 模板字符串类型]

### 一句话

API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }；表单字段：useField<T>('user.address.zip') 推断出嵌套字段类型。

### 题目

模板字符串类型 + 递归 + 分布式条件能解决哪些真实问题？

### 答案要点

- API 路径校验：`/users/:id/posts/:postId` 自动推导出 `{ id: string; postId: string }`
- 表单字段：`useField<T>('user.address.zip')` 推断出嵌套字段类型
- i18n：根据 locale 文件 key 推导 `t('home.hero.title')`，缺 key 编译报错
- SQL builder：`from('users').select('id, name')` 返回 `{ id, name }` 行类型
- 路由参数：Next App Router 中文件结构 → 参数类型可推断

### 代码示例

```ts
type Path = '/users/:id/posts/:postId';

type ParseParams<S extends string> = S extends `${string}:${infer P}/${infer Rest}`
  ? { [K in P | keyof ParseParams<`/${Rest}`>]: string }
  : S extends `${string}:${infer P}`
    ? { [K in P]: string }
    : Record<string, never>;

type Params = ParseParams<Path>; // { id: string; postId: string }

type DotKeys<T, P extends string = ''> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: T[K] extends Record<string, unknown>
          ? DotKeys<T[K], `${P}${K}.`>
          : `${P}${K}`;
      }[keyof T & string]
    : never;

type En = {
  home: { hero: { title: string; sub: string }; cta: string };
  about: { title: string };
};
type Keys = DotKeys<En>;
```

### 追问

- 「类型体操实用模式（不只是为了炫技）」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「类型体操实用模式（不只是为了炫技）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 类型体操、模板字符串类型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 类型体操写多了项目编译会变慢，敏感处用 `// @inferType` 缓存
- TS 有递归深度限制（默认 50），超出就要 unfold 或者放弃静态推导

## any-vs-unknown-followup-1

title: 追问：「any、unknown、never 三者的区别」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [类型, 追问]
parent: any-vs-unknown

### 题目

如果面试官追问：「any、unknown、never 三者的区别」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「any、unknown、never 三者的区别」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护」要进一步补到边界条件里，而不是只复述结论。

## generic-constraints-followup-1

title: 追问：「泛型约束、默认值与条件类型」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints

### 题目

如果面试官追问：「泛型约束、默认值与条件类型」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「泛型约束、默认值与条件类型」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键」要进一步补到边界条件里，而不是只复述结论。

## type-vs-interface-followup-1

title: 追问：「type 与 interface 的区别与取舍」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface

### 题目

如果面试官追问：「type 与 interface 的区别与取舍」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「type 与 interface 的区别与取舍」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「interface 支持声明合并；type 不支持」要进一步补到边界条件里，而不是只复述结论。

## utility-types-followup-1

title: 追问：「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types

### 题目

如果面试官追问：「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制」要进一步补到边界条件里，而不是只复述结论。

## template-literal-types-followup-1

title: 追问：「模板字面量类型与字符串操纵」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types

### 题目

如果面试官追问：「模板字面量类型与字符串操纵」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「模板字面量类型与字符串操纵」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「模板字面量 ${A}_${B} 配合 infer 拆解字符串」要进一步补到边界条件里，而不是只复述结论。

## discriminated-union-followup-1

title: 追问：推动「判别联合（Tagged Union）的设计与穷尽性」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union

### 题目

如果面试官追问：推动「判别联合（Tagged Union）的设计与穷尽性」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「判别联合（Tagged Union）的设计与穷尽性」拆成可验证的小步骤，逐步替换高风险部分。

## branded-types-followup-1

title: 追问：「品牌类型（Branded Types）实现单位/ID 隔离」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types

### 题目

如果面试官追问：「品牌类型（Branded Types）实现单位/ID 隔离」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「品牌类型（Branded Types）实现单位/ID 隔离」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"」要进一步补到边界条件里，而不是只复述结论。

## conditional-distribution-followup-1

title: 追问：「分布式条件类型与 Naked Type Parameter」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution

### 题目

如果面试官追问：「分布式条件类型与 Naked Type Parameter」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「分布式条件类型与 Naked Type Parameter」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「"裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）」要进一步补到边界条件里，而不是只复述结论。

## tsconfig-strict-followup-1

title: 追问：推动「tsconfig 关键字段与严格模式开启策略」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict

### 题目

如果面试官追问：推动「tsconfig 关键字段与严格模式开启策略」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「tsconfig 关键字段与严格模式开启策略」拆成可验证的小步骤，逐步替换高风险部分。

## declaration-merging-followup-1

title: 追问：推动「声明合并与模块扩展（Module Augmentation）」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging

### 题目

如果面试官追问：推动「声明合并与模块扩展（Module Augmentation）」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「声明合并与模块扩展（Module Augmentation）」拆成可验证的小步骤，逐步替换高风险部分。

## vue-with-ts-followup-1

title: 追问：在 Vue 项目里落地「Vue 3 中 TypeScript 的最佳实践」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts

### 题目

如果面试官追问：在 Vue 项目里落地「Vue 3 中 TypeScript 的最佳实践」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vue 3 中 TypeScript 的最佳实践」拆成可验证的小步骤，逐步替换高风险部分。

## infer-extract-followup-1

title: 追问：「用 infer 在条件类型里抽取类型」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract

### 题目

如果面试官追问：「用 infer 在条件类型里抽取类型」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「用 infer 在条件类型里抽取类型」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「语法：T extends Pattern ? X : never」要进一步补到边界条件里，而不是只复述结论。

## global-augmentation-followup-1

title: 追问：「全局类型扩展与模块声明合并」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation

### 题目

如果面试官追问：「全局类型扩展与模块声明合并」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「全局类型扩展与模块声明合并」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局」要进一步补到边界条件里，而不是只复述结论。

## branded-vs-opaque-followup-1

title: 追问：如果把「品牌类型 (Branded Types) 与不透明类型」放到真实业务里，你会怎么划分信任边界和服务端兜底
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque

### 题目

如果面试官追问：如果把「品牌类型 (Branded Types) 与不透明类型」放到真实业务里，你会怎么划分信任边界和服务端兜底？

### 答案要点

#### 核心回答

- 先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。
- 证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。
- 一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

## type-level-gymnastics-followup-1

title: 追问：「类型体操实用模式（不只是为了炫技）」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics

### 题目

如果面试官追问：「类型体操实用模式（不只是为了炫技）」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「类型体操实用模式（不只是为了炫技）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }」要进一步补到边界条件里，而不是只复述结论。

## runtime-schema-validation

title: TypeScript 类型和运行时 Schema 校验如何配合
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全]
links: [tsconfig-strict, branded-types, 10-architecture/type-safe-api-contract]

### 一句话

TypeScript 只在编译期工作，运行时不会阻止后端、localStorage、URL、第三方 SDK 或模型输出给你脏数据；可靠的工程做法是“静态类型负责开发期约束，Schema 负责运行时入口校验”，并让类型从 Schema 推导出来避免两套定义漂移。

### 题目

为什么 TypeScript 不能替代运行时校验？在前端项目里，什么时候需要 Zod / Valibot / JSON Schema 这类 Schema，如何和 TS 类型配合？

### 答案要点

- TS 类型会在编译后擦除，`fetch().json()`、`localStorage`、`postMessage`、URL query、AI structured output 都是 `unknown` 边界。
- 运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据。
- 类型最好由 Schema 推导：`type User = z.infer<typeof UserSchema>`，避免手写 `interface User` 和校验规则不一致。
- 校验失败要有产品策略：丢弃字段、使用默认值、展示错误、回滚旧数据、上报异常；不能只 `console.error`。
- 对性能敏感的热路径不要过度深校验，可只在入口校验一次，内部使用已收窄的类型。
- 与 OpenAPI / tRPC / GraphQL Codegen 配合时，要明确“契约类型”来自服务端，但浏览器仍需要处理版本不一致和脏数据。

### 代码示例

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.enum(['admin', 'member', 'guest']),
  profile: z
    .object({
      avatarUrl: z.string().url().optional(),
    })
    .default({}),
});

type User = z.infer<typeof UserSchema>;

async function fetchCurrentUser(): Promise<User> {
  const json: unknown = await fetch('/api/me').then((r) => r.json());
  const parsed = UserSchema.safeParse(json);
  if (!parsed.success) {
    reportSchemaError('current_user_invalid', parsed.error.flatten());
    throw new Error('用户数据格式异常，请刷新后重试');
  }
  return parsed.data;
}
```

### 常见误区

- 把 `as User` 当作校验；它只是告诉编译器“相信我”，不会检查任何字段。
- Schema 和 TypeScript interface 各写一份，字段新增后只改了一边，线上悄悄漂移。
- 只校验表单，不校验接口响应、备份导入、URL 参数和模型输出这些更容易脏的数据源。
- 校验失败直接白屏，没有兜底、恢复路径和异常上报。

### 追问

- `unknown`、`any` 和 `as` 在信任边界上应该怎么用？
- Schema 校验放前端、BFF、后端各有什么价值和边界？
- 如果接口字段很多，如何避免运行时校验拖慢页面？

### 延伸

- LLM 结构化输出、工具调用参数和 RAG 引用结果都应该走 Schema 校验。
- 备份导入和 localStorage 迁移是前端最容易忽略的运行时校验场景。
