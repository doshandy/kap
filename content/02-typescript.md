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

#### 工程化补充

- 场景前提：回答 模板字面量类型与字符串操纵 时先锁定 类型 的边界条件，避免把经验结论当成通用规则。
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

#### 工程化补充

- 场景前提：声明合并与模块扩展（Module Augmentation） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素？

### 答案要点

#### 直答

- 结论：「any、unknown、never 三者的区别」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先明确 any unknown never 三者的区别 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护。
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全。
- never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型。

#### 风险与验收

- 主要风险：实战：第三方/动态数据先用 unknown，配合类型守卫收窄；穷尽检查时用 never 兜底。
- 验收信号：在「any、unknown、never 三者的区别」里，验收 any unknown never 三者的区别 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## generic-constraints-followup-1

title: 追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立？

### 答案要点

#### 直答

- 结论：「泛型约束、默认值与条件类型」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先识别 泛型约束 默认值与条件类型 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 泛型：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键。

#### 风险与验收

- 主要风险：泛型约束 默认值与条件类型 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 泛型约束 默认值与条件类型 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## type-vs-interface-followup-1

title: 追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项？

### 答案要点

#### 直答

- 结论：「type 与 interface 的区别与取舍」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：type 与 interface 的区别与取舍 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- type：interface 支持声明合并；type 不支持。
- interface：interface 支持声明合并；type 不支持。
- 类型：type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状。

#### 风险与验收

- 主要风险：围绕 type 与 interface 的区别与取舍 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 type 与 interface 的区别与取舍 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## utility-types-followup-1

title: 追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立？

### 答案要点

#### 直答

- 结论：围绕「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：先演练 内置工具类型 Pick 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- Pick：Pick 直接遍历 K；Omit = Pick >，本质是反向选。
- Omit：Pick 直接遍历 K；Omit = Pick >，本质是反向选。
- Partial：Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记。

#### 风险与验收

- 主要风险：若 内置工具类型 Pick 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 内置工具类型 Pick 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## template-literal-types-followup-1

title: 追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立？

### 答案要点

#### 直答

- 结论：「模板字面量类型与字符串操纵」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先演练 模板字面量类型与字符串操纵 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 类型：配合分布式条件类型可以实现完整字符串变换。
- 字符串：模板字面量 ${A}_${B} 配合 infer 拆解字符串。

#### 风险与验收

- 主要风险：若 模板字面量类型与字符串操纵 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：模板字面量类型与字符串操纵 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## discriminated-union-followup-1

title: 追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「判别联合（Tagged Union）的设计与穷尽性」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：围绕 判别联合 的设计与穷尽性 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Tagged Union：围绕「判别联合（Tagged Union）的设计与穷尽性」里的 Tagged Union 推进上线时，要明确每个批次的放量门槛和回退条件。
- 类型：TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言。
- Tagged：Tagged 是「判别联合（Tagged Union）的设计与穷尽性」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 判别联合 的设计与穷尽性 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：围绕 判别联合 的设计与穷尽性 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## branded-types-followup-1

title: 追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项？

### 答案要点

#### 直答

- 结论：「品牌类型（Branded Types）实现单位/ID 隔离」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：围绕 品牌类型 实现单位/ID 隔离 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Branded Types：围绕「品牌类型（Branded Types）实现单位/ID 隔离」里的 Branded Types 推进上线时，要明确每个批次的放量门槛和回退条件。
- ID：ID 是「品牌类型（Branded Types）实现单位/ID 隔离」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 类型：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"。

#### 风险与验收

- 主要风险：围绕 品牌类型 实现单位/ID 隔离 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 品牌类型 实现单位/ID 隔离 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## conditional-distribution-followup-1

title: 追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿？

### 答案要点

#### 直答

- 结论：围绕「分布式条件类型与 Naked Type Parameter」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：先演练 面对真实流量 与 复杂依赖时 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- Naked Type Parameter：围绕「分布式条件类型与 Naked Type Parameter」里的 Naked Type Parameter 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 类型："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）。
- Naked：Naked 是「分布式条件类型与 Naked Type Parameter」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：面对真实流量 与 复杂依赖时 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 面对真实流量 与 复杂依赖时 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## tsconfig-strict-followup-1

title: 追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「tsconfig 关键字段与严格模式开启策略」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：围绕 tsconfig 关键字段与严格模式开启策略 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- tsconfig：围绕「tsconfig 关键字段与严格模式开启策略」里的 tsconfig 推进上线时，要明确每个批次的放量门槛和回退条件。
- 工程：在「tsconfig 关键字段与严格模式开启策略」里，工程 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：若 tsconfig 关键字段与严格模式开启策略 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：验收看 tsconfig 关键字段与严格模式开启策略 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## declaration-merging-followup-1

title: 追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「声明合并与模块扩展（Module Augmentation）」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：围绕 声明合并与模块扩展 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Module Augmentation：围绕「声明合并与模块扩展（Module Augmentation）」里的 Module Augmentation 推进上线时，要明确每个批次的放量门槛和回退条件。
- 类型：围绕「声明合并与模块扩展（Module Augmentation）」里的 类型 推进上线时，要明确每个批次的放量门槛和回退条件。
- 工程：围绕「声明合并与模块扩展（Module Augmentation）」里的 工程 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：围绕 声明合并与模块扩展 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 声明合并与模块扩展 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## vue-with-ts-followup-1

title: 追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动？

### 答案要点

#### 直答

- 结论：上线 Vue 3 中 TypeScript 的最佳实践 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：围绕 Vue 3 中 TypeScript 的最佳实践 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Vue：Vue 是「Vue 3 中 TypeScript 的最佳实践」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TypeScript：TypeScript 是「Vue 3 中 TypeScript 的最佳实践」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 类型：在「Vue 3 中 TypeScript 的最佳实践」里，类型 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 Vue 3 中 TypeScript 的最佳实践 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：Vue 3 中 TypeScript 的最佳实践 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## infer-extract-followup-1

title: 追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立？

### 答案要点

#### 直答

- 结论：围绕「用 infer 在条件类型里抽取类型」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：先识别 用 infer 在条件类型里抽取类型 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- infer：可以在同一条件里抽多个位置的类型。
- 条件类型：在「用 infer 在条件类型里抽取类型」里，条件类型 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：用 infer 在条件类型里抽取类型 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：用 infer 在条件类型里抽取类型 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## global-augmentation-followup-1

title: 追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工？

### 答案要点

#### 直答

- 结论：先把 全局类型扩展与模块声明合并 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 全局类型扩展与模块声明合并 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 声明合并：declare module 'pkg-name' { ... }，会与原始声明合并。
- ambient：在「全局类型扩展与模块声明合并」这题里，ambient 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 全局类型扩展与模块声明合并 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「全局类型扩展与模块声明合并」里 全局类型扩展与模块声明合并 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## branded-vs-opaque-followup-1

title: 追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 直答

- 结论：上线 品牌类型 与不透明类型 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先识别 品牌类型 与不透明类型 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- Branded Types：围绕「品牌类型 (Branded Types) 与不透明类型」里的 Branded Types 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 类型安全：围绕「品牌类型 (Branded Types) 与不透明类型」里的 类型安全 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- Branded：Branded 是「品牌类型 (Branded Types) 与不透明类型」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 品牌类型 与不透明类型 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：品牌类型 与不透明类型 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## type-level-gymnastics-followup-1

title: 追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立？

### 答案要点

#### 直答

- 结论：先列「类型体操实用模式（不只是为了炫技）」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：围绕 类型体操实用模式 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- 类型体操：围绕「类型体操实用模式（不只是为了炫技）」里的 类型体操 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 模板字符串类型：在「类型体操实用模式（不只是为了炫技）」里，模板字符串类型 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 类型体操实用模式 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：类型体操实用模式 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，函数签名里 `unknown` 和 `any` 怎么选？

### 答案要点

#### 直答

- 结论：把 unknown 与 any 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 unknown 与 any 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 类型：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护。
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全。
- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护。

#### 风险与验收

- 主要风险：实战：第三方/动态数据先用 unknown，配合类型守卫收窄；穷尽检查时用 never 兜底。
- 验收信号：unknown 与 any 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## any-vs-unknown-followup-3

title: 追问：在「any、unknown、never 三者的区别」场景下，as const 干什么用
difficulty: 基础
tags: [类型, 追问]
parent: any-vs-unknown
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「any、unknown、never 三者的区别」场景下，`as const` 干什么用（字面量类型 + readonly）？

### 答案要点

#### 直答

- 结论：回答 any unknown never 三者的区别 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先明确 any unknown never 三者的区别 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护。
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全。
- never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型。

#### 风险与验收

- 主要风险：实战：第三方/动态数据先用 unknown，配合类型守卫收窄；穷尽检查时用 never 兜底。
- 验收信号：在「any、unknown、never 三者的区别」里，any unknown never 三者的区别 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## type-vs-interface-followup-2

title: 追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立？

### 答案要点

#### 直答

- 结论：回答 type 与 interface 的原理时要同时给成因、影响范围和替代方案，才算可落地。
- 关键动作：先列出 type 与 interface 的前提假设，再解释机制，最后补失效场景，形成因果闭环，并推进排查、实施与回退验证。

#### 术语解释

- 类型：type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状。
- discriminant：discriminant 决定「type 与 interface 的区别与取舍」为什么会这样，回答时要把原因和失效前提讲清楚。
- narrow：narrow 决定「type 与 interface 的区别与取舍」为什么会这样，回答时要把原因和失效前提讲清楚。

#### 风险与验收

- 主要风险：围绕 type 与 interface 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：围绕 type 与 interface 归因结果至少给复现步骤、日志证据和回归指标，防止误判。

## type-vs-interface-followup-3

title: 追问：declare module '\.svg' 这种用法是什么原理
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：declare module '\*.svg' 这种用法是什么原理？

### 答案要点

#### 直答

- 结论：declare module 的作用是给非 TS 资源补类型声明，让编译器知道导入值的形状并通过类型检查。
- 关键动作：先复盘 type 与 interface 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- 类型：type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状。
- declare：在「type 与 interface 的区别与取舍」里，declare 是因果链关键变量，需要说明触发条件、机制和反例。
- module：在「type 与 interface 的区别与取舍」里，module 是因果链关键变量，需要说明触发条件、机制和反例。

#### 风险与验收

- 主要风险：若 type 与 interface 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收要能复现 type 与 interface 问题并证明原因链成立，再观察修复后指标是否回归。

## utility-types-followup-2

title: 追问：在当前团队与业务约束下，Required<T 和 NonNullable<T 区别
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，Required<T> 和 NonNullable<T> 区别？

### 答案要点

#### 直答

- 结论：回答 Required 与 NonNullable 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 Required 与 NonNullable 先做归因再做验证，避免把现象当原因。

#### 术语解释

- 类型：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制。
- 手写：手写 决定「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」为什么会这样，回答时要把原因和失效前提讲清楚。
- Required：Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记。

#### 风险与验收

- 主要风险：若 Required 与 NonNullable 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收标准是 Required 与 NonNullable 因果链可复现：输入触发、机制命中、修复后指标回稳。

## utility-types-followup-3

title: 追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue（按值类型筛选 key）？

### 答案要点

#### 直答

- 结论：先画出 内置工具类型 Pick 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 内置工具类型 Pick 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Pick：Pick 直接遍历 K；Omit = Pick >，本质是反向选。
- Omit：Pick 直接遍历 K；Omit = Pick >，本质是反向选。
- Partial：Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记。

#### 风险与验收

- 主要风险：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，内置工具类型 Pick 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」里，验收 内置工具类型 Pick 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## discriminated-union-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序？

### 答案要点

#### 直答

- 结论：先把 判别联合 的设计与穷尽性 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 判别联合 的设计与穷尽性 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Tagged Union：在「判别联合（Tagged Union）的设计与穷尽性」这题里，Tagged Union 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 类型：TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言。
- Tagged：Tagged 是「判别联合（Tagged Union）的设计与穷尽性」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：判别联合 的设计与穷尽性 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「判别联合（Tagged Union）的设计与穷尽性」里 判别联合 的设计与穷尽性 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## discriminated-union-followup-3

title: 追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：验证 判别联合的设计与穷尽性 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 判别联合的设计与穷尽性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 类型：TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言。

#### 风险与验收

- 主要风险：在「判别联合（Tagged Union）的设计与穷尽性」里，判别联合的设计与穷尽性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：判别联合的设计与穷尽性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## tsconfig-strict-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线？

### 答案要点

#### 直答

- 结论：先画出 tsconfig 关键字段与严格模式开启策略 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 tsconfig 关键字段与严格模式开启策略 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- tsconfig：围绕「tsconfig 关键字段与严格模式开启策略」里的 tsconfig 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 工程：在「tsconfig 关键字段与严格模式开启策略」这题里，工程 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：tsconfig 关键字段与严格模式开启策略 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 tsconfig 关键字段与严格模式开启策略 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## tsconfig-strict-followup-3

title: 追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：验证 tsconfig 关键字段与严格模式开启策略 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「tsconfig 关键字段与严格模式开启策略」里的 tsconfig 关键字段与严格模式开启策略 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- tsconfig：围绕「tsconfig 关键字段与严格模式开启策略」里的 tsconfig 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 工程：在「tsconfig 关键字段与严格模式开启策略」里，工程 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「tsconfig 关键字段与严格模式开启策略」里，tsconfig 关键字段与严格模式开启策略 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「tsconfig 关键字段与严格模式开启策略」里，tsconfig 关键字段与严格模式开启策略 至少要给一组指标阈值、一条日志证据和一组测试结果。

## declaration-merging-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 声明合并与模块扩展 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 声明合并与模块扩展 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Module Augmentation：在「声明合并与模块扩展（Module Augmentation）」这题里，Module Augmentation 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 类型：在「声明合并与模块扩展（Module Augmentation）」这题里，类型 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 工程：在「声明合并与模块扩展（Module Augmentation）」这题里，工程 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 声明合并与模块扩展 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：声明合并与模块扩展 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## declaration-merging-followup-3

title: 追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：验证 声明合并与模块扩展 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 声明合并与模块扩展 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 声明合并与模块扩展：围绕「声明合并与模块扩展（Module Augmentation）」里的 声明合并与模块扩展 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 类型：围绕「声明合并与模块扩展（Module Augmentation）」里的 类型 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 工程：围绕「声明合并与模块扩展（Module Augmentation）」里的 工程 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 声明合并与模块扩展 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：声明合并与模块扩展 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## vue-with-ts-followup-2

title: 追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现？

### 答案要点

#### 直答

- 结论：把 Vue 3 中 TypeScript 的最佳实践 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 Vue 3 中 TypeScript 的最佳实践 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Vue：Vue 是「Vue 3 中 TypeScript 的最佳实践」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TypeScript：TypeScript 是「Vue 3 中 TypeScript 的最佳实践」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 类型：围绕「Vue 3 中 TypeScript 的最佳实践」里的 类型 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「Vue 3 中 TypeScript 的最佳实践」里，Vue 3 中 TypeScript 的最佳实践 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Vue 3 中 TypeScript 的最佳实践 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## vue-with-ts-followup-3

title: 追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度？

### 答案要点

#### 直答

- 结论：先量化 Vue 3 中 TypeScript 的最佳实践 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先拆分 Vue 3 中 TypeScript 的最佳实践 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- Vue：Vue 是「Vue 3 中 TypeScript 的最佳实践」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TypeScript：TypeScript 是「Vue 3 中 TypeScript 的最佳实践」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 类型：围绕「Vue 3 中 TypeScript 的最佳实践」里的 类型 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 Vue 3 中 TypeScript 的最佳实践 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 Vue 3 中 TypeScript 的最佳实践 收益提升和维护成本变化，确保取舍结论可持续。

## branded-vs-opaque-followup-2

title: 追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 直答

- 结论：先定「品牌类型 (Branded Types) 与不透明类型」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 品牌类型 与不透明类型 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Branded Types：在「品牌类型 (Branded Types) 与不透明类型」里，Branded Types 是验收对象，必须给可量化指标、日志信号和测试证据。
- 类型安全：在「品牌类型 (Branded Types) 与不透明类型」里，类型安全 是验收对象，必须给可量化指标、日志信号和测试证据。
- Branded：Branded 是「品牌类型 (Branded Types) 与不透明类型」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「品牌类型 (Branded Types) 与不透明类型」里，品牌类型 与不透明类型 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：品牌类型 与不透明类型 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## branded-vs-opaque-followup-3

title: 追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级？

### 答案要点

#### 直答

- 结论：评估 品牌类型 与不透明类型 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先量化 品牌类型 与不透明类型 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- Branded Types：围绕「品牌类型 (Branded Types) 与不透明类型」里的 Branded Types 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 类型安全：围绕「品牌类型 (Branded Types) 与不透明类型」里的 类型安全 评估时，不能只讲优点，还要给切换条件和止损阈值。
- Branded：Branded 是「品牌类型 (Branded Types) 与不透明类型」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 品牌类型 与不透明类型 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 品牌类型 与不透明类型 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## runtime-schema-validation-followup-1

title: 追问：结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，`unknown`、`any` 和 `as` 在信任边界上应该怎么用？

### 答案要点

#### 直答

- 结论：先把 any 与 as 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：校验失败要有产品策略：丢弃字段、使用默认值、展示错误、回滚旧数据、上报异常；不能只 console.error。

#### 术语解释

- TypeScript：TypeScript 是「TypeScript 类型和运行时 Schema 校验如何配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Zod：Zod 是「TypeScript 类型和运行时 Schema 校验如何配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Schema：运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据。

#### 风险与验收

- 主要风险：在「TypeScript 类型和运行时 Schema 校验如何配合」里，any 与 as 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：any 与 as 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## runtime-schema-validation-followup-2

title: 追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界？

### 答案要点

#### 直答

- 结论：先拆分 类型 与 运行时 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：校验失败要有产品策略：丢弃字段、使用默认值、展示错误、回滚旧数据、上报异常；不能只 console.error。

#### 术语解释

- TypeScript：TypeScript 是「TypeScript 类型和运行时 Schema 校验如何配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Schema：运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据。
- Zod：Zod 是「TypeScript 类型和运行时 Schema 校验如何配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：类型 与 运行时 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 类型 与 运行时 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## runtime-schema-validation-followup-3

title: 追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面？

### 答案要点

#### 直答

- 结论：先把 类型 与 运行时 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：校验失败要有产品策略：丢弃字段、使用默认值、展示错误、回滚旧数据、上报异常；不能只 console.error。

#### 术语解释

- TypeScript：TypeScript 是「TypeScript 类型和运行时 Schema 校验如何配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Zod：Zod 是「TypeScript 类型和运行时 Schema 校验如何配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Schema：运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据。

#### 风险与验收

- 主要风险：围绕 类型 与 运行时 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：类型 与 运行时 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## generic-constraints-followup-2

title: 追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先定「泛型约束、默认值与条件类型」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 默认值 与 条件类型 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 泛型：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键。

#### 风险与验收

- 主要风险：若 默认值 与 条件类型 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：默认值 与 条件类型 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## generic-constraints-followup-3

title: 追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节？

### 答案要点

#### 直答

- 结论：先处理 泛型约束 默认值与条件类型 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：先拆分 泛型约束 默认值与条件类型 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 泛型：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键。

#### 风险与验收

- 主要风险：若 泛型约束 默认值与条件类型 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 泛型约束 默认值与条件类型 收益提升和维护成本变化，确保取舍结论可持续。

## template-literal-types-followup-2

title: 追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 结论：验证「模板字面量类型与字符串操纵」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 指标来支撑结论 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 类型：配合分布式条件类型可以实现完整字符串变换。
- 字符串：模板字面量 ${A}_${B} 配合 infer 拆解字符串。

#### 风险与验收

- 主要风险：在「模板字面量类型与字符串操纵」里，指标来支撑结论 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：指标来支撑结论 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## template-literal-types-followup-3

title: 追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏？

### 答案要点

#### 直答

- 结论：先画出 模板字面量类型与字符串操纵 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 模板字面量类型与字符串操纵 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 类型：配合分布式条件类型可以实现完整字符串变换。
- 字符串：模板字面量 ${A}_${B} 配合 infer 拆解字符串。

#### 风险与验收

- 主要风险：在「模板字面量类型与字符串操纵」场景下，模板字面量类型与字符串操纵 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「模板字面量类型与字符串操纵」里，模板字面量类型与字符串操纵 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## branded-types-followup-2

title: 追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「品牌类型（Branded Types）实现单位/ID 隔离」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 品牌类型实现单位/ID 隔离 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- ID：ID 是「品牌类型（Branded Types）实现单位/ID 隔离」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 类型：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"。
- 模式：在「品牌类型（Branded Types）实现单位/ID 隔离」里，模式 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「品牌类型（Branded Types）实现单位/ID 隔离」里，品牌类型实现单位/ID 隔离 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：品牌类型实现单位/ID 隔离 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## branded-types-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序？

### 答案要点

#### 直答

- 结论：先冻结「品牌类型（Branded Types）实现单位/ID 隔离」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。
- 关键动作：把「品牌类型（Branded Types）实现单位/ID 隔离」里的 品牌类型 实现单位/ID 隔离 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Branded Types：围绕「品牌类型（Branded Types）实现单位/ID 隔离」里的 Branded Types 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- ID：ID 是「品牌类型（Branded Types）实现单位/ID 隔离」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 类型：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"。

#### 风险与验收

- 主要风险：围绕 品牌类型 实现单位/ID 隔离 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「品牌类型（Branded Types）实现单位/ID 隔离」里 品牌类型 实现单位/ID 隔离 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## conditional-distribution-followup-2

title: 追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：先约定「分布式条件类型与 Naked Type Parameter」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 分布式条件类型 与 上可复核 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 类型："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）。

#### 风险与验收

- 主要风险：分布式条件类型 与 上可复核 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「分布式条件类型与 Naked Type Parameter」里，分布式条件类型 与 上可复核 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## conditional-distribution-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先把 分布式条件类型 与 拆分方案演进路径 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「分布式条件类型与 Naked Type Parameter」里的 分布式条件类型 与 拆分方案演进路径 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 类型："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）。

#### 风险与验收

- 主要风险：在「分布式条件类型与 Naked Type Parameter」里，分布式条件类型 与 拆分方案演进路径 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：分布式条件类型 与 拆分方案演进路径 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## infer-extract-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先定「用 infer 在条件类型里抽取类型」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 infer 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- infer：可以在同一条件里抽多个位置的类型。
- 条件类型：在「用 infer 在条件类型里抽取类型」里，条件类型 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 infer 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：infer 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## infer-extract-followup-3

title: 追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序？

### 答案要点

#### 直答

- 结论：「用 infer 在条件类型里抽取类型」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：先明确 用 infer 在条件类型里抽取类型 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- infer：可以在同一条件里抽多个位置的类型。
- 条件类型：在「用 infer 在条件类型里抽取类型」这题里，条件类型 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「用 infer 在条件类型里抽取类型」场景下，用 infer 在条件类型里抽取类型 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「用 infer 在条件类型里抽取类型」里，验收 用 infer 在条件类型里抽取类型 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## global-augmentation-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先定「全局类型扩展与模块声明合并」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 声明合并 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 声明合并：declare module 'pkg-name' { ... }，会与原始声明合并。
- ambient：围绕「全局类型扩展与模块声明合并」里的 ambient 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 声明合并 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：声明合并 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## global-augmentation-followup-3

title: 追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「全局类型扩展与模块声明合并」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：先定位 全局类型扩展与模块声明合并 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 声明合并：declare module 'pkg-name' { ... }，会与原始声明合并。
- ambient：围绕「全局类型扩展与模块声明合并」里的 ambient 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「全局类型扩展与模块声明合并」场景下，全局类型扩展与模块声明合并 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：验收看 全局类型扩展与模块声明合并 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## type-level-gymnastics-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「类型体操实用模式（不只是为了炫技）」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：围绕 类型体操实用模式 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 类型体操：围绕「类型体操实用模式（不只是为了炫技）」里的 类型体操 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 模板字符串类型：在「类型体操实用模式（不只是为了炫技）」里，模板字符串类型 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 类型体操实用模式 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：类型体操实用模式 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## type-level-gymnastics-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏？

### 答案要点

#### 直答

- 结论：先锁定 类型体操实用模式 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 类型体操实用模式 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 类型体操：围绕「类型体操实用模式（不只是为了炫技）」里的 类型体操 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 模板字符串类型：在「类型体操实用模式（不只是为了炫技）」这题里，模板字符串类型 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：类型体操实用模式 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 类型体操实用模式 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：变更说明要可执行：附迁移指引、codemod 或替代写法，避免下游靠猜。

#### 术语解释

- TypeScript：TypeScript 是「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- API：在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化。
- 类型治理：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里，类型治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：TypeScript 公共类型 API 兼容闸门 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 TypeScript 公共类型 API 兼容闸门 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## typescript-public-api-compat-gate-followup-2

title: 追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效？

### 答案要点

#### 直答

- 结论：先定「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：变更说明要可执行：附迁移指引、codemod 或替代写法，避免下游靠猜。

#### 术语解释

- TypeScript：TypeScript 是「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- API：在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化。
- 类型治理：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里，类型治理 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里，TypeScript 公共类型 API 兼容闸门 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：TypeScript 公共类型 API 兼容闸门 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## typescript-public-api-compat-gate-followup-3

title: 追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损？

### 答案要点

#### 直答

- 结论：先列出 TypeScript 公共类型 API 兼容闸门 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：变更说明要可执行：附迁移指引、codemod 或替代写法，避免下游靠猜。

#### 术语解释

- TypeScript：TypeScript 是「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- API：在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化。
- 类型治理：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」里，类型治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 TypeScript 公共类型 API 兼容闸门 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 TypeScript 公共类型 API 兼容闸门 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## strict-migration-playbook-followup-1

title: 追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 结论：先列「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零。

#### 术语解释

- strict 模式：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」这题里，strict 模式 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 迁移治理：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」这题里，迁移治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 工程化：围绕「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里的 工程化 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：严格模式迁移实战 从“能编译”到“可治理”的分阶段落地 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：严格模式迁移实战 从“能编译”到“可治理”的分阶段落地 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## strict-migration-playbook-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：验证「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零。

#### 术语解释

- strict 模式：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里，strict 模式 是验收对象，必须给可量化指标、日志信号和测试证据。
- 迁移治理：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里，迁移治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 工程化：围绕「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里的 工程化 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：严格模式迁移实战 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里，严格模式迁移实战 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## strict-migration-playbook-followup-3

title: 追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：把 严格模式迁移实战 从“能编译”到“可治理”的分阶段落地 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零。

#### 术语解释

- strict 模式：围绕「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里的 strict 模式 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 迁移治理：围绕「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里的 迁移治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 工程化：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」这题里，工程化 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：严格模式迁移实战 从“能编译”到“可治理”的分阶段落地 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」里，验收 严格模式迁移实战 从“能编译”到“可治理”的分阶段落地 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：TS 升级已经阻塞发布了，你会怎样分阶段止损，既保交付又不给后续治理挖更大坑？

### 答案要点

#### 直答

- 结论：把「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：拍板要有双结论：短期保交付（回退/豁免）+ 中期稳升级（补类型与规则迁移）。

#### 术语解释

- 升级治理：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，升级治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 类型系统：围绕「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里的 类型系统 推进上线时，要明确每个批次的放量门槛和回退条件。
- 决策沟通：围绕「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里的 决策沟通 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：围绕 构建阻塞 与 回退编排 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：围绕 构建阻塞 与 回退编排 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## typescript-version-upgrade-incident-bridge-followup-2

title: 追问：你会怎么搭一套 TS 升级验证面板
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说升级策略有效，那会怎么搭验证面板，持续确认收益不是被短期噪声“看起来变好”？

### 答案要点

#### 直答

- 结论：验证「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：拍板要有双结论：短期保交付（回退/豁免）+ 中期稳升级（补类型与规则迁移）。

#### 术语解释

- 升级治理：围绕「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里的 升级治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 类型系统：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，类型系统 是验收对象，必须给可量化指标、日志信号和测试证据。
- 决策沟通：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，决策沟通 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，构建阻塞 与 回退编排 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，构建阻塞 与 回退编排 至少要给一组指标阈值、一条日志证据和一组测试结果。

## typescript-version-upgrade-incident-bridge-followup-3

title: 追问：TS 升级方案去留该看哪几组硬指标
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：三个月后团队讨论这条升级路线是否继续，你会给哪几组硬指标作为去留依据？

### 答案要点

#### 直答

- 结论：把 构建阻塞 与 回退编排 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：拍板要有双结论：短期保交付（回退/豁免）+ 中期稳升级（补类型与规则迁移）。

#### 术语解释

- 升级治理：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，升级治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 类型系统：围绕「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里的 类型系统 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 决策沟通：围绕「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里的 决策沟通 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」里，构建阻塞 与 回退编排 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：构建阻塞 与 回退编排 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## typescript-type-debt-budget-governance-followup-1

title: 追问：上线类型债预算治理前先验哪些关键条件
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：类型债预算治理听起来很好，但上线前你会先验哪些条件，确保不是“制度一上就卡死研发”？

### 答案要点

#### 直答

- 结论：先列「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：围绕 any 与 ts-ignore 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- 技术债治理：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，技术债治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- strict：围绕「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里的 strict 推进上线时，要明确每个批次的放量门槛和回退条件。
- 工程化：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，工程化 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：any 与 ts-ignore 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 any 与 ts-ignore 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## typescript-type-debt-budget-governance-followup-2

title: 追问：你会怎样证明类型债治理不是“纸面治理”
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你这套类型债治理怎么证明有效，而不是做了一堆流程却没带来真实改善？

### 答案要点

#### 直答

- 结论：先约定「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 any 与 ts-ignore 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 技术债治理：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，技术债治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- strict：围绕「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里的 strict 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 工程化：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，工程化 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，any 与 ts-ignore 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：any 与 ts-ignore 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## typescript-type-debt-budget-governance-followup-3

title: 追问：长期看哪些信号能判断类型债治理在变好
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：这套类型债治理要长期运行，你会持续追哪些信号，判断它是真的变好而不是“指标好看”？

### 答案要点

#### 直答

- 结论：先定义 any 与 ts-ignore 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里的 any 与 ts-ignore 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 技术债治理：围绕「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里的 技术债治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- strict：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，strict 是验收对象，必须给可量化指标、日志信号和测试证据。
- 工程化：围绕「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里的 工程化 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，any 与 ts-ignore 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」里，any 与 ts-ignore 至少要给一组指标阈值、一条日志证据和一组测试结果。
