---
id: 02-typescript
title: TypeScript 进阶
order: 2
icon: 🔷
description: 类型系统、泛型、类型体操、声明文件与工程实践。
---

## any-vs-unknown

title: any、unknown、never 三者的区别
followups: [any-vs-unknown-followup-1, any-vs-unknown-followup-2, any-vs-unknown-followup-3]
difficulty: 基础
tags: [类型]

### 一句话

这题回答要覆盖 类型 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

解释 `any`、`unknown`、`never` 的区别与使用场景。

### 答案要点

- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 实战：第三方/动态数据先用 unknown，配合类型守卫收窄；穷尽检查时用 never 兜底

#### 工程化补充

- 场景前提：先定义 any、unknown、never 三者的区别 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [generic-constraints-followup-1, generic-constraints-followup-2, generic-constraints-followup-3]
links: [conditional-distribution]
difficulty: 进阶
tags: [泛型]

### 一句话

这题的高分关键是把 泛型 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

设计一个 `pick<T, K>` 工具，要求 K 必须是 T 的属性键。再设计 `pickByValue<T, V>` 选出值类型为 V 的键。

### 答案要点

- 泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- extends 还支持给泛型加形状约束（如 `T extends { id: string }`）和默认值（如 `T = unknown`）
- 映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤
- 条件类型 T extends U ? X : Y 与 infer 配合可解构数组、Promise、函数返回值

#### 工程化补充

- 场景前提：回答 泛型约束、默认值与条件类型 时先锁定 泛型 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 失败风险：常见风险是只给理想路径，忽略 泛型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 泛型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [type-vs-interface-followup-1, type-vs-interface-followup-2, type-vs-interface-followup-3]
difficulty: 基础
tags: [类型]

### 一句话

这题的高分关键是把 类型 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

type 与 interface 的差异有哪些？什么时候用哪个？

### 答案要点

- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 经验：对外公共 API 用 interface（可被使用方扩展）；联合/工具类型/复杂类型用 type

#### 工程化补充

- 场景前提：回答 type 与 interface 的区别与取舍 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [utility-types-followup-1, utility-types-followup-2, utility-types-followup-3]
difficulty: 进阶
tags: [类型, 手写]

### 一句话

讲「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

手写 Partial / Required / Readonly / Pick / Omit / Record / NonNullable / ReturnType 的实现。

### 答案要点

- 全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记
- Pick 直接遍历 K；Omit = Pick >，本质是反向选
- NonNullable 用条件类型过滤 null/undefined；ReturnType 用 infer R 捕获函数返回值类型

#### 工程化补充

- 场景前提：回答 内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [template-literal-types-followup-1, template-literal-types-followup-2, template-literal-types-followup-3]
difficulty: 进阶
tags: [类型, 字符串]

### 一句话

这题的高分关键是把 类型 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

实现 `Camelize<S>` 把 `'user_name'` 转 `'userName'`，再实现 `Trim<S>`。

### 答案要点

- 模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 内置 Uppercase/Lowercase/Capitalize/Uncapitalize
- 配合分布式条件类型可以实现完整字符串变换
- 面试中不要只停留在「模板字面量类型与字符串操纵」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：回答 模板字面量类型与字符串操纵 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [discriminated-union-followup-1, discriminated-union-followup-2, discriminated-union-followup-3]
difficulty: 进阶
tags: [类型]

### 一句话

讲「判别联合（Tagged Union）的设计与穷尽性」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么推荐用 tagged union 设计领域模型？怎么保证穷尽匹配？

### 答案要点

- 用一个共有的字面量字段（如 type / kind / status）做判别
- TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言
- 默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）
- 优势：领域建模清晰、可扩展（加 case 编译期会强制找全引用点）

#### 工程化补充

- 场景前提：回答 判别联合（Tagged Union）的设计与穷尽性 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [branded-types-followup-1, branded-types-followup-2, branded-types-followup-3]
difficulty: 资深
tags: [类型, 模式]

### 一句话

这题回答要覆盖 类型 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

如何用类型让 `UserId` 和 `OrderId` 不能互换，即使底层都是 string？

### 答案要点

- 在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 编译期区分，运行时无成本（运行时仍是 string/number）
- 必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入
- 适用场景：UserId/OrderId 隔离、金额单位（Cents/USD）、已 escape 字符串、Hash 值

#### 工程化补充

- 场景前提：先定义 品牌类型（Branded Types）实现单位/ID 隔离 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [conditional-distribution-followup-1, conditional-distribution-followup-2, conditional-distribution-followup-3]
links: [generic-constraints, infer-extract]
difficulty: 资深
tags: [类型]

### 一句话

回答「分布式条件类型与 Naked Type Parameter」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么 `T extends U ? X : Y` 在 T 是联合类型时会"分布"？如何关掉这种分布？

### 答案要点

- "裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union
- 用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定
- Exclude / Extract / NonNullable 等工具类型正是利用分布实现对联合的逐项过滤

#### 工程化补充

- 场景前提：先定义 分布式条件类型与 Naked Type Parameter 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 分布式条件类型与 Naked Type Parameter 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

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
followups: [tsconfig-strict-followup-1, tsconfig-strict-followup-2, tsconfig-strict-followup-3]
links: [10-architecture/type-safe-api-contract]
difficulty: 进阶
tags: [工程]

### 一句话

回答「tsconfig 关键字段与严格模式开启策略」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

列举 tsconfig 中影响项目"安全等级"的关键字段，并给出推荐配置。

### 答案要点

- strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界
- exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined
- noFallthroughCasesInSwitch、noImplicitReturns、noImplicitOverride

#### 工程化补充

- 场景前提：先限定 工程 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 tsconfig 关键字段与严格模式开启策略 的结论不成立。
- 实施步骤：围绕 工程 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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
followups: [declaration-merging-followup-1, declaration-merging-followup-2, declaration-merging-followup-3]
difficulty: 进阶
tags: [类型, 工程]

### 一句话

回答「声明合并与模块扩展（Module Augmentation）」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

怎么给第三方库（如 `vue-router`）的类型加字段？怎么扩展全局 `Window`？

### 答案要点

- interface 自动合并；同名 namespace 也合并
- 模块扩展用 declare module 'xx' { interface X { ... } }
- 全局扩展用 declare global { interface Window { **MY**: X } }
- 面试中不要只停留在「声明合并与模块扩展（Module Augmentation）」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：声明合并与模块扩展（Module Augmentation） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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
followups: [vue-with-ts-followup-1, vue-with-ts-followup-2, vue-with-ts-followup-3]
difficulty: 进阶
tags: [Vue, 类型]

### 一句话

回答「Vue 3 中 TypeScript 的最佳实践」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

在 `<script setup lang="ts">` 中，如何为 props/emits/slots/expose/provide-inject 标注类型？

### 答案要点

- defineProps () 泛型形式（编译期擦除，零运行时成本）
- defineEmits () 调用签名
- defineSlots any }>()
- defineExpose ()

#### 工程化补充

- 场景前提：先划清 Vue 的作用域和更新时机，再展开 Vue 3 中 TypeScript 的最佳实践，避免状态边界混乱。
- 实施步骤：先把 Vue 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

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
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 Vue、类型，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 表单/校验场景结合 zod 等运行时 schema，自动 infer 类型
- 组件库的 `defineComponent` + 泛型 props，可以做出真正泛型的列表/表格组件

## infer-extract

title: 用 infer 在条件类型里抽取类型
followups: [infer-extract-followup-1, infer-extract-followup-2, infer-extract-followup-3]
links: [conditional-distribution]
difficulty: 资深
tags: [infer, 条件类型]

### 一句话

这题回答要覆盖 infer 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

条件类型中 `infer` 怎么用？常见的"从泛型中拆解"模式有哪些？

### 答案要点

- 语法：T extends Pattern ? X : never
- 用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型
- 内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType
- 多 infer：可以在同一条件里抽多个位置的类型

#### 工程化补充

- 场景前提：先定义 用 infer 在条件类型里抽取类型 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 infer 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 infer 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 infer 的可复现用例、线上监控指标和回退演练记录。

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
followups: [global-augmentation-followup-1, global-augmentation-followup-2, global-augmentation-followup-3]
difficulty: 资深
tags: [声明合并, ambient]

### 一句话

回答「全局类型扩展与模块声明合并」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

怎么给 `window`、第三方库、Vue 实例补充全局类型？三方包没有 d.ts 怎么办？

### 答案要点

- declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并
- 命名空间合并：同名 namespace 自动合并，可在自己的项目里补充
- 没有 d.ts 的包：先看 @types/pkg，没有就 declare module 'pkg-name' 写最小骨架

#### 工程化补充

- 场景前提：先划清 声明合并 的作用域和更新时机，再展开 全局类型扩展与模块声明合并，避免状态边界混乱。
- 实施步骤：先把 声明合并 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

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
followups: [branded-vs-opaque-followup-1, branded-vs-opaque-followup-2, branded-vs-opaque-followup-3]
difficulty: 资深
tags: [类型安全, Branded]

### 一句话

这题回答要覆盖 类型安全 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

TS 是结构化类型，怎么让 `UserId` 和 `OrderId` 在编译期不可互换？

### 答案要点

- TS 默认结构等价，所有 string 都互通
- 加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }
- 创建：用工厂函数做 cast，禁止外部直接 as
- 同样可以做 Email / NonEmptyString / PositiveInt 这类语义类型

#### 工程化补充

- 场景前提：先限定 类型安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 品牌类型 (Branded Types) 与不透明类型 的结论不成立。
- 实施步骤：先把 类型安全 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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
followups: [type-level-gymnastics-followup-1, type-level-gymnastics-followup-2, type-level-gymnastics-followup-3]
difficulty: 资深
tags: [类型体操, 模板字符串类型]

### 一句话

回答「类型体操实用模式（不只是为了炫技）」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

模板字符串类型 + 递归 + 分布式条件能解决哪些真实问题？

### 答案要点

- API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 表单字段：useField ('user.address.zip') 推断出嵌套字段类型
- i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错
- SQL builder：from('users').select('id, name') 返回 { id, name } 行类型

#### 工程化补充

- 场景前提：先定义 类型体操实用模式（不只是为了炫技） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 类型体操 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 失败风险：常见风险是只给理想路径，忽略 类型体操 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型体操 的可复现用例、线上监控指标和回退演练记录。

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

title: 追问：你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素
difficulty: 基础
tags: [类型, 追问]
parent: any-vs-unknown

### 一句话

围绕「any、unknown、never 三者的区别」回答追问时，重点说清 类型 的前提、动作和回退条件。

### 题目

如果面试官追问：你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素？

### 答案要点

#### 直答

- 追问核心：围绕「any、unknown、never 三者的区别」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素）。
- 直接围绕「你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素」作答：any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护

#### 落地步骤

- 第一步：先定义 any、unknown、never 三者的区别 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## generic-constraints-followup-1

title: 追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints

### 一句话

回答这题时，先给 泛型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立？

### 答案要点

#### 直答

- 追问核心：识别「泛型约束、默认值与条件类型」的高风险失败场景并给出兜底措施（对应追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立）。
- 直接围绕「如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立」作答：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键

#### 落地步骤

- 第一步：回答 泛型约束、默认值与条件类型 时先锁定 泛型 的边界条件，避免把经验结论当成通用规则。
- 第二步：围绕 泛型 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 泛型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 泛型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 泛型 的可复现用例、线上监控指标和回退演练记录。

## type-vs-interface-followup-1

title: 追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface

### 一句话

回答这题时，先给 类型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项？

### 答案要点

#### 直答

- 追问核心：比较「type 与 interface 的区别与取舍」在收益、成本和维护复杂度上的取舍边界（对应追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项）。
- 直接围绕「如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项」作答：interface 支持声明合并；type 不支持

#### 落地步骤

- 第一步：回答 type 与 interface 的区别与取舍 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## utility-types-followup-1

title: 追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types

### 一句话

回答这题时，先给 类型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立？

### 答案要点

#### 直答

- 追问核心：识别「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的高风险失败场景并给出兜底措施（对应追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立）。
- 直接围绕「如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立」作答：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制

#### 落地步骤

- 第一步：回答 内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 第二步：围绕 类型 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## template-literal-types-followup-1

title: 追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types

### 一句话

回答这题时，先给 类型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立？

### 答案要点

#### 直答

- 追问核心：识别「模板字面量类型与字符串操纵」的高风险失败场景并给出兜底措施（对应追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立）。
- 直接围绕「如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立」作答：模板字面量 ${A}_${B} 配合 infer 拆解字符串

#### 落地步骤

- 第一步：回答 模板字面量类型与字符串操纵 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 第二步：围绕 类型 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## discriminated-union-followup-1

title: 追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union

### 一句话

这道追问要直接回应「判别联合（Tagged Union）的设计与穷尽性」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「判别联合（Tagged Union）的设计与穷尽性」上线时如何灰度、观测、回滚（对应追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径」作答：用一个共有的字面量字段（如 type / kind / status）做判别

#### 落地步骤

- 第一步：判别联合（Tagged Union）的设计与穷尽性 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## branded-types-followup-1

title: 追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types

### 一句话

这道追问要直接回应「品牌类型（Branded Types）实现单位/ID 隔离」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项？

### 答案要点

#### 直答

- 追问核心：说明「品牌类型（Branded Types）实现单位/ID 隔离」上线时如何灰度、观测、回滚（对应追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项）。
- 直接围绕「在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项」作答：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"

#### 落地步骤

- 第一步：先定义 品牌类型（Branded Types）实现单位/ID 隔离 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## conditional-distribution-followup-1

title: 追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution

### 一句话

这道追问要直接回应「分布式条件类型与 Naked Type Parameter」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿？

### 答案要点

#### 直答

- 追问核心：围绕「分布式条件类型与 Naked Type Parameter」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿）。
- 直接围绕「面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿」作答："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）

#### 落地步骤

- 第一步：先定义 分布式条件类型与 Naked Type Parameter 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## tsconfig-strict-followup-1

title: 追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict

### 一句话

回答这题时，先给 工程 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「tsconfig 关键字段与严格模式开启策略」上线时如何灰度、观测、回滚（对应追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径」作答：strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization

#### 落地步骤

- 第一步：落地 tsconfig 关键字段与严格模式开启策略 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 工程 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## declaration-merging-followup-1

title: 追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging

### 一句话

这道追问要直接回应「声明合并与模块扩展（Module Augmentation）」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「声明合并与模块扩展（Module Augmentation）」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径」作答：interface 自动合并；同名 namespace 也合并

#### 落地步骤

- 第一步：声明合并与模块扩展（Module Augmentation） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## vue-with-ts-followup-1

title: 追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts

### 一句话

这道追问要直接回应「Vue 3 中 TypeScript 的最佳实践」在 Vue 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动？

### 答案要点

#### 直答

- 追问核心：围绕「Vue 3 中 TypeScript 的最佳实践」给出可执行的落地方案，重点说明 Vue 怎么做（对应追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动）。
- 直接围绕「你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动」作答：defineProps () 泛型形式（编译期擦除，零运行时成本）

#### 落地步骤

- 第一步：先划清 Vue 的作用域和更新时机，再展开 Vue 3 中 TypeScript 的最佳实践，避免状态边界混乱。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 第三步：如果 Vue 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

## infer-extract-followup-1

title: 追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract

### 一句话

这道追问要直接回应「用 infer 在条件类型里抽取类型」在 infer 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立？

### 答案要点

#### 直答

- 追问核心：识别「用 infer 在条件类型里抽取类型」的高风险失败场景并给出兜底措施（对应追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立）。
- 直接围绕「如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立」作答：语法：T extends Pattern ? X : never

#### 落地步骤

- 第一步：先定义 用 infer 在条件类型里抽取类型 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 infer 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 infer 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 infer 的可复现用例、线上监控指标和回退演练记录。

## global-augmentation-followup-1

title: 追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation

### 一句话

围绕「全局类型扩展与模块声明合并」回答追问时，重点说清 声明合并 的前提、动作和回退条件。

### 题目

如果面试官追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工？

### 答案要点

#### 直答

- 追问核心：围绕「全局类型扩展与模块声明合并」给出可执行的落地方案，重点说明 声明合并 怎么做（对应追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工）。
- 直接围绕「在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工」作答：declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局

#### 落地步骤

- 第一步：先定义 全局类型扩展与模块声明合并 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 声明合并 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 声明合并 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 声明合并 的可复现用例、线上监控指标和回退演练记录。

## branded-vs-opaque-followup-1

title: 追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque

### 一句话

围绕「品牌类型 (Branded Types) 与不透明类型」回答追问时，重点说清 类型安全 的前提、动作和回退条件。

### 题目

如果面试官追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「品牌类型 (Branded Types) 与不透明类型」的高风险失败场景并给出兜底措施（对应追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底）。
- 直接围绕「在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底」作答：TS 默认结构等价，所有 string 都互通

#### 落地步骤

- 第一步：先限定 类型安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 品牌类型 (Branded Types) 与不透明类型 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 类型安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## type-level-gymnastics-followup-1

title: 追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics

### 一句话

围绕「类型体操实用模式（不只是为了炫技）」回答追问时，重点说清 类型体操 的前提、动作和回退条件。

### 题目

如果面试官追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立？

### 答案要点

#### 直答

- 追问核心：识别「类型体操实用模式（不只是为了炫技）」的高风险失败场景并给出兜底措施（对应追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立）。
- 直接围绕「如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立」作答：API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }

#### 落地步骤

- 第一步：先定义 类型体操实用模式（不只是为了炫技） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 类型体操 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型体操 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型体操 的可复现用例、线上监控指标和回退演练记录。

## runtime-schema-validation

title: TypeScript 类型和运行时 Schema 校验如何配合
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全]
links: [tsconfig-strict, branded-types, 10-architecture/type-safe-api-contract]
followups: [runtime-schema-validation-followup-1, runtime-schema-validation-followup-2, runtime-schema-validation-followup-3]

### 一句话

回答「TypeScript 类型和运行时 Schema 校验如何配合」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么 TypeScript 不能替代运行时校验？在前端项目里，什么时候需要 Zod / Valibot / JSON Schema 这类 Schema，如何和 TS 类型配合？

### 答案要点

- TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界。
- 运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据。
- 类型最好由 Schema 推导：type User = z.infer ，避免手写 interface User 和校验规则不一致。
- 校验失败要有产品策略：丢弃字段、使用默认值、展示错误、回滚旧数据、上报异常；不能只 console.error。

#### 工程化补充

- 场景前提：先限定 TypeScript 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 TypeScript 类型和运行时 Schema 校验如何配合 的结论不成立。
- 实施步骤：围绕 TypeScript 类型和运行时 Schema 校验如何配合 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

- 回答「TypeScript 类型和运行时 Schema 校验如何配合」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 TypeScript、Zod、Schema，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 追问

- `unknown`、`any` 和 `as` 在信任边界上应该怎么用？
- Schema 校验放前端、BFF、后端各有什么价值和边界？
- 如果接口字段很多，如何避免运行时校验拖慢页面？

### 延伸

- LLM 结构化输出、工具调用参数和 RAG 引用结果都应该走 Schema 校验。
- 备份导入和 localStorage 迁移是前端最容易忽略的运行时校验场景。

## any-vs-unknown-followup-2

title: 追问：从工程落地角度看，函数签名里 unknown 和 any 怎么选
difficulty: 基础
tags: [类型, 追问]
parent: any-vs-unknown
generated: followup-script

### 一句话

围绕「any、unknown、never 三者的区别」回答追问时，重点说清 类型 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，函数签名里 `unknown` 和 `any` 怎么选？

### 答案要点

#### 直答

- 追问核心：围绕「any、unknown、never 三者的区别」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：从工程落地角度看，函数签名里 unknown 和 any 怎么选）。
- 直接围绕「从工程落地角度看，函数签名里 unknown 和 any 怎么选」作答：any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护

#### 落地步骤

- 第一步：any、unknown、never 三者的区别 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## any-vs-unknown-followup-3

title: 追问：在「any、unknown、never 三者的区别」场景下，as const 干什么用
difficulty: 基础
tags: [类型, 追问]
parent: any-vs-unknown
generated: followup-script

### 一句话

这道追问要直接回应「any、unknown、never 三者的区别」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「any、unknown、never 三者的区别」场景下，`as const` 干什么用（字面量类型 + readonly）？

### 答案要点

#### 直答

- 追问核心：围绕「any、unknown、never 三者的区别」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：在「any、unknown、never 三者的区别」场景下，as const 干什么用（字面量类型 + readonly））。
- 直接围绕「在「any、unknown、never 三者的区别」场景下，as const 干什么用（字面量类型 + readonly）」作答：any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护

#### 落地步骤

- 第一步：先定义 any、unknown、never 三者的区别 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## type-vs-interface-followup-2

title: 追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface
generated: followup-script

### 一句话

围绕「type 与 interface 的区别与取舍」回答追问时，重点说清 类型 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立？

### 答案要点

#### 直答

- 追问核心：解释「type 与 interface 的区别与取舍」背后的因果关系，并指出 类型 的触发条件（对应追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立）。
- 直接围绕「结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立」作答：interface 支持声明合并；type 不支持

#### 落地步骤

- 第一步：先定义 type 与 interface 的区别与取舍 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## type-vs-interface-followup-3

title: 追问：declare module '\.svg' 这种用法是什么原理
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface
generated: followup-script

### 一句话

这道追问的关键是把 类型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：declare module '\*.svg' 这种用法是什么原理？

### 答案要点

#### 直答

- 追问核心：围绕「type 与 interface 的区别与取舍」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：declare module '\*.svg' 这种用法是什么原理）。
- 直接围绕「declare module '\*.svg' 这种用法是什么原理」作答：interface 支持声明合并；type 不支持

#### 落地步骤

- 第一步：回答 type 与 interface 的区别与取舍 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## utility-types-followup-2

title: 追问：在当前团队与业务约束下，Required<T 和 NonNullable<T 区别
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types
generated: followup-script

### 一句话

这道追问要直接回应「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，Required<T> 和 NonNullable<T> 区别？

### 答案要点

#### 直答

- 追问核心：围绕「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：在当前团队与业务约束下，Required 和 NonNullable 区别）。
- 直接围绕「在当前团队与业务约束下，Required 和 NonNullable 区别」作答：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制

#### 落地步骤

- 第一步：先定义 内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## utility-types-followup-3

title: 追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types
generated: followup-script

### 一句话

这道追问的关键是把 类型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue（按值类型筛选 key）？

### 答案要点

#### 直答

- 追问核心：围绕「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue（按值类型筛选 key））。
- 直接围绕「在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue（按值类型筛选 key）」作答：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制

#### 落地步骤

- 第一步：回答 内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## discriminated-union-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union
generated: followup-script

### 一句话

这道追问要直接回应「判别联合（Tagged Union）的设计与穷尽性」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序？

### 答案要点

#### 直答

- 追问核心：围绕「判别联合（Tagged Union）的设计与穷尽性」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序）。
- 直接围绕「当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序」作答：用一个共有的字面量字段（如 type / kind / status）做判别

#### 落地步骤

- 第一步：先定义 判别联合（Tagged Union）的设计与穷尽性 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## discriminated-union-followup-3

title: 追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union
generated: followup-script

### 一句话

围绕「判别联合（Tagged Union）的设计与穷尽性」回答追问时，重点说清 类型 的前提、动作和回退条件。

### 题目

如果面试官追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 追问核心：说明如何验证「判别联合（Tagged Union）的设计与穷尽性」结论成立，给出 类型 的验收路径（对应追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险）。
- 直接围绕「以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险」作答：用一个共有的字面量字段（如 type / kind / status）做判别

#### 落地步骤

- 第一步：判别联合（Tagged Union）的设计与穷尽性 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## tsconfig-strict-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict
generated: followup-script

### 一句话

这道追问要直接回应「tsconfig 关键字段与严格模式开启策略」在 工程 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线？

### 答案要点

#### 直答

- 追问核心：围绕「tsconfig 关键字段与严格模式开启策略」给出可执行的落地方案，重点说明 工程 怎么做（对应追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线）。
- 直接围绕「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线」作答：strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization

#### 落地步骤

- 第一步：tsconfig 关键字段与严格模式开启策略 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 工程 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## tsconfig-strict-followup-3

title: 追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict
generated: followup-script

### 一句话

这道追问的关键是把 工程 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 追问核心：围绕「tsconfig 关键字段与严格模式开启策略」给出可执行的落地方案，重点说明 工程 怎么做（对应追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号）。
- 直接围绕「在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号」作答：strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization

#### 落地步骤

- 第一步：落地 tsconfig 关键字段与严格模式开启策略 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 工程 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 工程 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## declaration-merging-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging
generated: followup-script

### 一句话

回答这题时，先给 类型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序？

### 答案要点

#### 直答

- 追问核心：围绕「声明合并与模块扩展（Module Augmentation）」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序）。
- 直接围绕「当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序」作答：interface 自动合并；同名 namespace 也合并

#### 落地步骤

- 第一步：落地 声明合并与模块扩展（Module Augmentation） 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## declaration-merging-followup-3

title: 追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging
generated: followup-script

### 一句话

围绕「声明合并与模块扩展（Module Augmentation）」回答追问时，重点说清 类型 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 追问核心：说明如何验证「声明合并与模块扩展（Module Augmentation）」结论成立，给出 类型 的验收路径（对应追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险）。
- 直接围绕「结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险」作答：interface 自动合并；同名 namespace 也合并

#### 落地步骤

- 第一步：声明合并与模块扩展（Module Augmentation） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## vue-with-ts-followup-2

title: 追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts
generated: followup-script

### 一句话

这道追问的关键是把 Vue 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现？

### 答案要点

#### 直答

- 追问核心：围绕「Vue 3 中 TypeScript 的最佳实践」给出可执行的落地方案，重点说明 Vue 怎么做（对应追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现）。
- 直接围绕「面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现」作答：defineProps () 泛型形式（编译期擦除，零运行时成本）

#### 落地步骤

- 第一步：Vue 3 中 TypeScript 的最佳实践 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Vue。
- 第二步：先把 Vue 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Vue 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## vue-with-ts-followup-3

title: 追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts
generated: followup-script

### 一句话

围绕「Vue 3 中 TypeScript 的最佳实践」回答追问时，重点说清 Vue 的前提、动作和回退条件。

### 题目

如果面试官追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度？

### 答案要点

#### 直答

- 追问核心：比较「Vue 3 中 TypeScript 的最佳实践」在收益、成本和维护复杂度上的取舍边界（对应追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度）。
- 直接围绕「在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度」作答：defineProps () 泛型形式（编译期擦除，零运行时成本）

#### 落地步骤

- 第一步：先划清 Vue 的作用域和更新时机，再展开 Vue 3 中 TypeScript 的最佳实践，避免状态边界混乱。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 第三步：如果 Vue 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

## branded-vs-opaque-followup-2

title: 追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque
generated: followup-script

### 一句话

这道追问的关键是把 类型安全 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 直答

- 追问核心：说明如何验证「品牌类型 (Branded Types) 与不透明类型」结论成立，给出 类型安全 的验收路径（对应追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过）。
- 直接围绕「从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过」作答：TS 默认结构等价，所有 string 都互通

#### 落地步骤

- 第一步：品牌类型 (Branded Types) 与不透明类型 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 类型安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## branded-vs-opaque-followup-3

title: 追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque
generated: followup-script

### 一句话

这道追问要直接回应「品牌类型 (Branded Types) 与不透明类型」在 类型安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级？

### 答案要点

#### 直答

- 追问核心：比较「品牌类型 (Branded Types) 与不透明类型」在收益、成本和维护复杂度上的取舍边界（对应追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级）。
- 直接围绕「在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级」作答：TS 默认结构等价，所有 string 都互通

#### 落地步骤

- 第一步：先限定 类型安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 品牌类型 (Branded Types) 与不透明类型 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 类型安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## runtime-schema-validation-followup-1

title: 追问：结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

这道追问要直接回应「TypeScript 类型和运行时 Schema 校验如何配合」在 TypeScript 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，`unknown`、`any` 和 `as` 在信任边界上应该怎么用？

### 答案要点

#### 直答

- 追问核心：围绕「TypeScript 类型和运行时 Schema 校验如何配合」给出可执行的落地方案，重点说明 TypeScript 怎么做（对应追问：结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用）。
- 直接围绕「结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用」作答：TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界。

#### 落地步骤

- 第一步：先限定 TypeScript 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 TypeScript 类型和运行时 Schema 校验如何配合 的结论不成立。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 TypeScript 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## runtime-schema-validation-followup-2

title: 追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

回答这题时，先给 TypeScript 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界？

### 答案要点

#### 直答

- 追问核心：围绕「TypeScript 类型和运行时 Schema 校验如何配合」给出可执行的落地方案，重点说明 TypeScript 怎么做（对应追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界）。
- 直接围绕「在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界」作答：TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界。

#### 落地步骤

- 第一步：TypeScript 类型和运行时 Schema 校验如何配合 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：先把 TypeScript 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 TypeScript 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## runtime-schema-validation-followup-3

title: 追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

围绕「TypeScript 类型和运行时 Schema 校验如何配合」回答追问时，重点说清 TypeScript 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面？

### 答案要点

#### 直答

- 追问核心：围绕「TypeScript 类型和运行时 Schema 校验如何配合」给出可执行的落地方案，重点说明 TypeScript 怎么做（对应追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面）。
- 直接围绕「结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面」作答：TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界。

#### 落地步骤

- 第一步：先限定 TypeScript 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 TypeScript 类型和运行时 Schema 校验如何配合 的结论不成立。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 TypeScript 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## generic-constraints-followup-2

title: 追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints
generated: followup-script

### 一句话

回答这题时，先给 泛型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 追问核心：说明如何验证「泛型约束、默认值与条件类型」结论成立，给出 泛型 的验收路径（对应追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖）。
- 直接围绕「从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」作答：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键

#### 落地步骤

- 第一步：落地 泛型约束、默认值与条件类型 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 泛型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## generic-constraints-followup-3

title: 追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints
generated: followup-script

### 一句话

回答这题时，先给 泛型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「泛型约束、默认值与条件类型」在收益、成本和维护复杂度上的取舍边界（对应追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节）。
- 直接围绕「以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节」作答：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键

#### 落地步骤

- 第一步：泛型约束、默认值与条件类型 只有在瓶颈被数据证实时才值得推进；先确认 泛型 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 泛型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 泛型约束、默认值与条件类型 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## template-literal-types-followup-2

title: 追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types
generated: followup-script

### 一句话

这道追问要直接回应「模板字面量类型与字符串操纵」在 类型 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 追问核心：说明如何验证「模板字面量类型与字符串操纵」结论成立，给出 类型 的验收路径（对应追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论）。
- 直接围绕「在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论」作答：模板字面量 ${A}_${B} 配合 infer 拆解字符串

#### 落地步骤

- 第一步：回答 模板字面量类型与字符串操纵 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 模板字面量类型与字符串操纵 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## template-literal-types-followup-3

title: 追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types
generated: followup-script

### 一句话

这道追问的关键是把 类型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏？

### 答案要点

#### 直答

- 追问核心：围绕「模板字面量类型与字符串操纵」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏）。
- 直接围绕「如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏」作答：模板字面量 ${A}_${B} 配合 infer 拆解字符串

#### 落地步骤

- 第一步：回答 模板字面量类型与字符串操纵 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## branded-types-followup-2

title: 追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types
generated: followup-script

### 一句话

这道追问的关键是把 类型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「品牌类型（Branded Types）实现单位/ID 隔离」结论成立，给出 类型 的验收路径（对应追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标」作答：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"

#### 落地步骤

- 第一步：品牌类型（Branded Types）实现单位/ID 隔离 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 类型。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## branded-types-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types
generated: followup-script

### 一句话

围绕「品牌类型（Branded Types）实现单位/ID 隔离」回答追问时，重点说清 类型 的前提、动作和回退条件。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序？

### 答案要点

#### 直答

- 追问核心：围绕「品牌类型（Branded Types）实现单位/ID 隔离」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序）。
- 直接围绕「面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序」作答：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"

#### 落地步骤

- 第一步：先定义 品牌类型（Branded Types）实现单位/ID 隔离 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型 的可复现用例、线上监控指标和回退演练记录。

## conditional-distribution-followup-2

title: 追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution
generated: followup-script

### 一句话

这道追问的关键是把 类型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「分布式条件类型与 Naked Type Parameter」结论成立，给出 类型 的验收路径（对应追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证）。
- 直接围绕「结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证」作答："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）

#### 落地步骤

- 第一步：分布式条件类型与 Naked Type Parameter 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 类型。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## conditional-distribution-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution
generated: followup-script

### 一句话

回答这题时，先给 类型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 追问核心：围绕「分布式条件类型与 Naked Type Parameter」给出可执行的落地方案，重点说明 类型 怎么做（对应追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来）。
- 直接围绕「从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来」作答："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）

#### 落地步骤

- 第一步：落地 分布式条件类型与 Naked Type Parameter 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 类型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## infer-extract-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract
generated: followup-script

### 一句话

这道追问的关键是把 infer 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 追问核心：说明如何验证「用 infer 在条件类型里抽取类型」结论成立，给出 infer 的验收路径（对应追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖）。
- 直接围绕「在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」作答：语法：T extends Pattern ? X : never

#### 落地步骤

- 第一步：回答 用 infer 在条件类型里抽取类型 时先锁定 infer 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 infer 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 infer 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 infer 的可复现用例、线上监控指标和回退演练记录。

## infer-extract-followup-3

title: 追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract
generated: followup-script

### 一句话

围绕「用 infer 在条件类型里抽取类型」回答追问时，重点说清 infer 的前提、动作和回退条件。

### 题目

如果面试官追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序？

### 答案要点

#### 直答

- 追问核心：围绕「用 infer 在条件类型里抽取类型」给出可执行的落地方案，重点说明 infer 怎么做（对应追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序）。
- 直接围绕「以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序」作答：语法：T extends Pattern ? X : never

#### 落地步骤

- 第一步：先定义 用 infer 在条件类型里抽取类型 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 infer 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 infer 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 infer 的可复现用例、线上监控指标和回退演练记录。

## global-augmentation-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation
generated: followup-script

### 一句话

回答这题时，先给 声明合并 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 追问核心：说明如何验证「全局类型扩展与模块声明合并」结论成立，给出 声明合并 的验收路径（对应追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进）。
- 直接围绕「在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进」作答：declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局

#### 落地步骤

- 第一步：回答 全局类型扩展与模块声明合并 时先锁定 声明合并 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 声明合并 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 声明合并 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 声明合并 的可复现用例、线上监控指标和回退演练记录。

## global-augmentation-followup-3

title: 追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation
generated: followup-script

### 一句话

这道追问要直接回应「全局类型扩展与模块声明合并」在 声明合并 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 追问核心：围绕「全局类型扩展与模块声明合并」给出可执行的落地方案，重点说明 声明合并 怎么做（对应追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏）。
- 直接围绕「以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏」作答：declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局

#### 落地步骤

- 第一步：先定义 全局类型扩展与模块声明合并 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 声明合并 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 声明合并 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 声明合并 的可复现用例、线上监控指标和回退演练记录。

## type-level-gymnastics-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics
generated: followup-script

### 一句话

回答这题时，先给 类型体操 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「类型体操实用模式（不只是为了炫技）」结论成立，给出 类型体操 的验收路径（对应追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标」作答：API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }

#### 落地步骤

- 第一步：类型体操实用模式（不只是为了炫技） 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 类型体操。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 类型体操 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## type-level-gymnastics-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics
generated: followup-script

### 一句话

这道追问要直接回应「类型体操实用模式（不只是为了炫技）」在 类型体操 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏？

### 答案要点

#### 直答

- 追问核心：围绕「类型体操实用模式（不只是为了炫技）」给出可执行的落地方案，重点说明 类型体操 怎么做（对应追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏）。
- 直接围绕「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏」作答：API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }

#### 落地步骤

- 第一步：先定义 类型体操实用模式（不只是为了炫技） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 类型体操 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 类型体操 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 类型体操 的可复现用例、线上监控指标和回退演练记录。

## typescript-public-api-compat-gate

title: TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”
difficulty: 资深
tags: [类型治理, API 兼容, SemVer]
followups: [typescript-public-api-compat-gate-followup-1, typescript-public-api-compat-gate-followup-2, typescript-public-api-compat-gate-followup-3]

### 一句话

讲「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

做 SDK 或组件库时，你会如何给 TypeScript 公共类型 API 建立兼容闸门，避免“看起来只是重构，实际是破坏升级”？

### 答案要点

- 先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约。
- 在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化。
- 兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch。
- 变更说明要可执行：附迁移指引、codemod 或替代写法，避免下游靠猜。

#### 工程化补充

- 场景前提：落地 TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级” 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
// v1
export interface QueryOptions<T> {
  initialData?: T;
  staleTime?: number;
}

// v2（破坏变更示例）：initialData 从可选改成必选
export interface QueryOptions<T> {
  initialData: T;
  staleTime?: number;
}
// 这类变更应被兼容闸门识别并要求 major
```

```yaml
type_api_gate:
  - step: build_dts_snapshot
  - step: diff_public_types
  - rule:
      breaking_change: require_major_and_migration_guide
      non_breaking_change: allow_minor_or_patch
```

### 追问

- 「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看运行时兼容，不看类型兼容，导致下游在编译期大面积阻塞。
- 变更只写 changelog，不给迁移路径，升级成本转嫁给调用方。
- 把所有类型变更都当破坏升级，反而拖慢正常演进节奏。

### 延伸

- 可给关键公共类型设置稳定级别（stable/experimental），降低认知歧义。
- 类型契约评审可并入发布评审，减少“代码过了、契约没过”的漏网问题。

## strict-migration-playbook

title: 严格模式迁移实战：从“能编译”到“可治理”的分阶段落地
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化]
followups: [strict-migration-playbook-followup-1, strict-migration-playbook-followup-2, strict-migration-playbook-followup-3]

### 一句话

这题的高分关键是把 strict 模式 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

面对历史 TS/JS 混合仓库，你会如何推进 strict 迁移，让团队持续交付且不被类型报错“卡死”？

### 答案要点

- 先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题。
- 采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码。
- 用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零。
- 建立例外机制：确需临时 @ts-expect-error 必须写原因和过期计划，防止长期滥用。

#### 工程化补充

- 场景前提：落地 严格模式迁移实战：从“能编译”到“可治理”的分阶段落地 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```json
// tsconfig.strict-step1.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "strictNullChecks": true
  },
  "include": ["src/new-modules/**/*"]
}
```

```ts
// 临时豁免必须可追踪
// @ts-expect-error TODO(ts-migration-124): 第三方类型缺失，预计 Q3 替换依赖后移除
legacyAdapter.call(unsafeInput);
```

### 追问

- 「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 一次性全仓开启 strict，导致主线冻结和团队抵触。
- `any`/`expect-error` 无约束泛滥，迁移长期停在“表面完成”。
- 只看错误数量，不看关键链路风险，治理收益难以被业务感知。

### 延伸

- 可把迁移进度做成目录热力图，帮助团队识别高风险区域。
- strict 迁移与新人 onboarding 文档联动，能显著降低后续回退率。

## typescript-public-api-compat-gate-followup-1

title: 追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

回答这题时，先给 类型治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」上线时如何灰度、观测、回滚（对应追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径」作答：先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约。

#### 落地步骤

- 第一步：落地 TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级” 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## typescript-public-api-compat-gate-followup-2

title: 追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

回答这题时，先给 类型治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」结论成立，给出 类型治理 的验收路径（对应追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效）。
- 直接围绕「以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效」作答：先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约。

#### 落地步骤

- 第一步：TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级” 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 类型治理。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 类型治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## typescript-public-api-compat-gate-followup-3

title: 追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

这道追问的关键是把 类型治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损？

### 答案要点

#### 直答

- 追问核心：围绕「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」给出可执行的落地方案，重点说明 类型治理 怎么做（对应追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损）。
- 直接围绕「在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损」作答：先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约。

#### 落地步骤

- 第一步：落地 TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级” 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 类型治理 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 类型治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## strict-migration-playbook-followup-1

title: 追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

这道追问的关键是把 strict 模式 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 追问核心：说明「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束）。
- 直接围绕「结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束」作答：先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题。

#### 落地步骤

- 第一步：落地 严格模式迁移实战：从“能编译”到“可治理”的分阶段落地 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 strict 模式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## strict-migration-playbook-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

回答这题时，先给 strict 模式 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」结论成立，给出 strict 模式 的验收路径（对应追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标」作答：先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题。

#### 落地步骤

- 第一步：严格模式迁移实战：从“能编译”到“可治理”的分阶段落地 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 strict 模式。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 strict 模式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## strict-migration-playbook-followup-3

title: 追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

回答这题时，先给 strict 模式 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护？

### 答案要点

#### 直答

- 追问核心：说明「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」上线时如何灰度、观测、回滚（对应追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护）。
- 直接围绕「半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护」作答：先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题。

#### 落地步骤

- 第一步：落地 严格模式迁移实战：从“能编译”到“可治理”的分阶段落地 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 strict 模式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## typescript-version-upgrade-incident-bridge

title: TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通]
followups: [typescript-version-upgrade-incident-bridge-followup-1, typescript-version-upgrade-incident-bridge-followup-2, typescript-version-upgrade-incident-bridge-followup-3]

### 一句话

讲「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

升级 TypeScript 后，CI 编译错误激增，部分团队被阻塞；但降级会丢失新版本修复。你会如何组织升级事故指挥桥，兼顾止损与长期演进？

### 答案要点

- 先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理。
- 量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化。
- 确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划。
- 拍板要有双结论：短期保交付（回退/豁免）+ 中期稳升级（补类型与规则迁移）。

#### 工程化补充

- 场景前提：TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 升级治理。
- 实施步骤：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
type TsUpgradeSignal = {
  blockingErrorCount: number;
  affectedPipelines: number;
  releaseBlocked: boolean;
};

function needEmergencyFallback(s: TsUpgradeSignal) {
  return s.releaseBlocked && (s.blockingErrorCount > 80 || s.affectedPipelines > 5);
}
```

```yaml
ts_upgrade_bridge:
  classify_errors:
    - release_blocking
    - migration_backlog
    - toolchain_false_positive
  temporary_waiver:
    require_owner: true
    require_expiry_days: 14
```

### 追问

- 「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把所有报错等价处理，导致止损节奏混乱。
- 临时豁免没有到期治理，升级债务快速堆积。
- 升级沟通只在类型团队内部进行，业务团队无法形成预期。

### 延伸

- 可将 TS 版本升级接入“影子流水线”提前暴露风险。
- 建议沉淀“升级阻塞剧本”，减少跨仓库协调成本。

## typescript-type-debt-budget-governance

title: Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制
difficulty: 资深
tags: [技术债治理, strict, 工程化]
followups: [typescript-type-debt-budget-governance-followup-1, typescript-type-debt-budget-governance-followup-2, typescript-type-debt-budget-governance-followup-3]

### 一句话

这题的高分关键是把 技术债治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

业务高压期里团队大量引入 `any`、`@ts-ignore` 以赶上线，短期提速但长期风险上升。你会如何设计 Type Debt 预算治理，兼顾交付与质量？

### 答案要点

- 建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner。
- 预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间。
- 新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”。
- 发布闸门联动预算：超配额时限制发布或要求技术负责人签字确认。

#### 工程化补充

- 场景前提：落地 Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type TypeDebtSnapshot = {
  anyCount: number;
  tsIgnoreCount: number;
  overdueDebtCount: number;
};

function isDebtOutOfControl(s: TypeDebtSnapshot) {
  return s.overdueDebtCount > 10 || s.tsIgnoreCount > 50;
}
```

```yaml
type_debt_budget:
  limits:
    core_domain:
      any_max: 5
      ts_ignore_max: 3
    non_core_domain:
      any_max: 20
      ts_ignore_max: 10
  block_release_when:
    overdue_debt_count: '> 10'
```

### 追问

- 「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只统计债务总量，不区分风险等级和业务关键性。
- 放行时不写回收计划，债务默认永久化。
- 治理指标只看“新增”，不看“逾期”和“净变化”。

### 延伸

- 可把类型债务配额接入 PR 机器人自动提醒。
- 建议建立“高风险类型债务黑名单”优先清理。

## typescript-version-upgrade-incident-bridge-followup-1

title: 追问：TS 升级事故里你会怎样分阶段止损
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

这道追问的关键是把 升级治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：TS 升级已经阻塞发布了，你会怎样分阶段止损，既保交付又不给后续治理挖更大坑？

### 答案要点

#### 直答

- 追问核心：说明「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」上线时如何灰度、观测、回滚（对应追问：TS 升级已经阻塞发布了，你会怎样分阶段止损，既保交付又不给后续治理挖更大坑）。
- 直接围绕「TS 升级已经阻塞发布了，你会怎样分阶段止损，既保交付又不给后续治理挖更大坑」作答：先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理。

#### 落地步骤

- 第一步：TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 升级治理。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 升级治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## typescript-version-upgrade-incident-bridge-followup-2

title: 追问：你会怎么搭一套 TS 升级验证面板
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

这道追问要直接回应「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」在 升级治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你说升级策略有效，那会怎么搭验证面板，持续确认收益不是被短期噪声“看起来变好”？

### 答案要点

#### 直答

- 追问核心：说明如何验证「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」结论成立，给出 升级治理 的验收路径（对应追问：你说升级策略有效，那会怎么搭验证面板，持续确认收益不是被短期噪声“看起来变好”）。
- 直接围绕「你说升级策略有效，那会怎么搭验证面板，持续确认收益不是被短期噪声“看起来变好”」作答：先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理。

#### 落地步骤

- 第一步：回答 TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 升级治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## typescript-version-upgrade-incident-bridge-followup-3

title: 追问：TS 升级方案去留该看哪几组硬指标
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

回答这题时，先给 升级治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：三个月后团队讨论这条升级路线是否继续，你会给哪几组硬指标作为去留依据？

### 答案要点

#### 直答

- 追问核心：说明如何验证「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」结论成立，给出 升级治理 的验收路径（对应追问：三个月后团队讨论这条升级路线是否继续，你会给哪几组硬指标作为去留依据）。
- 直接围绕「三个月后团队讨论这条升级路线是否继续，你会给哪几组硬指标作为去留依据」作答：先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理。

#### 落地步骤

- 第一步：TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 升级治理。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 升级治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## typescript-type-debt-budget-governance-followup-1

title: 追问：上线类型债预算治理前先验哪些关键条件
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

回答这题时，先给 技术债治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：类型债预算治理听起来很好，但上线前你会先验哪些条件，确保不是“制度一上就卡死研发”？

### 答案要点

#### 直答

- 追问核心：说明「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」上线时如何灰度、观测、回滚（对应追问：类型债预算治理听起来很好，但上线前你会先验哪些条件，确保不是“制度一上就卡死研发”）。
- 直接围绕「类型债预算治理听起来很好，但上线前你会先验哪些条件，确保不是“制度一上就卡死研发”」作答：建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner。

#### 落地步骤

- 第一步：落地 Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 技术债治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## typescript-type-debt-budget-governance-followup-2

title: 追问：你会怎样证明类型债治理不是“纸面治理”
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

这道追问要直接回应「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」在 技术债治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你这套类型债治理怎么证明有效，而不是做了一堆流程却没带来真实改善？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」结论成立，给出 技术债治理 的验收路径（对应追问：你这套类型债治理怎么证明有效，而不是做了一堆流程却没带来真实改善）。
- 直接围绕「你这套类型债治理怎么证明有效，而不是做了一堆流程却没带来真实改善」作答：建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner。

#### 落地步骤

- 第一步：Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 技术债治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## typescript-type-debt-budget-governance-followup-3

title: 追问：长期看哪些信号能判断类型债治理在变好
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

这道追问的关键是把 技术债治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：这套类型债治理要长期运行，你会持续追哪些信号，判断它是真的变好而不是“指标好看”？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」结论成立，给出 技术债治理 的验收路径（对应追问：这套类型债治理要长期运行，你会持续追哪些信号，判断它是真的变好而不是“指标好看”）。
- 直接围绕「这套类型债治理要长期运行，你会持续追哪些信号，判断它是真的变好而不是“指标好看”」作答：建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner。

#### 落地步骤

- 第一步：落地 Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 技术债治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。
