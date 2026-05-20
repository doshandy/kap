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

`any` 是"放弃治疗"什么都行；`unknown` 是"我不知道，你得先收窄类型才能用"；`never` 是"这里压根不可能发生"。优先用 unknown 替代 any。

### 题目

解释 `any`、`unknown`、`never` 的区别与使用场景。

### 答案要点

- `any`：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- `unknown`：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- `never`：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 实战：第三方/动态数据先用 `unknown`，配合类型守卫收窄；穷尽检查时用 `never` 兜底

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「any、unknown、never 三者的区别」时要把 any 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，any 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「any、unknown、never 三者的区别」里当前按阶段替换更稳。

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

泛型约束 K extends keyof T 限制类型参数；映射类型 + 条件类型 + key remapping 实现按值过滤。

### 题目

设计一个 `pick<T, K>` 工具，要求 K 必须是 T 的属性键。再设计 `pickByValue<T, V>` 选出值类型为 V 的键。

### 答案要点

- 泛型约束 `K extends keyof T` 限制类型参数必须是 T 的合法键
- `extends` 还支持给泛型加形状约束（如 `<T extends { id: string }>`）和默认值（`<T = unknown>`）
- 映射类型 `{ [P in K]: T[P] }` 遍历键；`as` 子句做 **key remapping**，返回 `never` 即过滤
- 条件类型 `T extends U ? X : Y` 与 `infer` 配合可解构数组、Promise、函数返回值
- `pickByValue` 思路：遍历 keyof T，仅当值类型 `extends V` 才保留键

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「泛型约束、默认值与条件类型」时要把 默认值与条件类型 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，默认值与条件类型 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「泛型约束、默认值与条件类型」里当前按阶段替换更稳。

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

两者大多数场景互通；interface 适合"对象 + 可被外部声明合并扩展"（典型如库的扩展点），type 适合联合、交叉、映射等高级运算。

### 题目

type 与 interface 的差异有哪些？什么时候用哪个？

### 答案要点

- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 经验：对外公共 API 用 interface（可被使用方扩展）；联合/工具类型/复杂类型用 type

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「interface 支持声明合并；type 不支持」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「type 与 interface 的区别与取舍」风险偏高；当前方案可验证、可灰度、可回滚。

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

Partial（全可选）、Required（全必选）、Pick（挑几个）、Omit（去几个）、Record（键值映射）、ReturnType（取返回类型）—— 内置 6 个就能覆盖日常 80% 类型操作。

### 题目

手写 Partial / Required / Readonly / Pick / Omit / Record / NonNullable / ReturnType 的实现。

### 答案要点

- 全部基于**映射类型 + 条件类型 + 修饰符 `+/-`** 三个核心机制
- `Partial / Readonly` 加 `?` 或 `readonly`；`Required` 用 `-?` 强制移除可选标记
- `Pick<T,K>` 直接遍历 K；`Omit` = `Pick<T, Exclude<keyof T, K>>`，本质是反向选
- `NonNullable` 用条件类型过滤 null/undefined；`ReturnType` 用 `infer R` 捕获函数返回值类型
- `Record<K,V>` 用映射类型按键生成对象；K 通常约束为 `keyof any` 即 string|number|symbol

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」时先约定 内置工具类型 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 内置工具类型 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

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

模板字面量 ${A}_${B} 配合 infer 拆解字符串；内置 Uppercase/Lowercase/Capitalize/Uncapitalize；配合分布式条件类型可以实现完整字符串变换。

### 题目

实现 `Camelize<S>` 把 `'user_name'` 转 `'userName'`，再实现 `Trim<S>`。

### 答案要点

- 模板字面量 `${A}_${B}` 配合 `infer` 拆解字符串
- 内置 `Uppercase/Lowercase/Capitalize/Uncapitalize`
- 配合分布式条件类型可以实现完整字符串变换

#### 补充说明

- 面试中不要只停留在「模板字面量类型与字符串操纵」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 类型、字符串 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「模板字面量类型与字符串操纵」时要把 模板字面量类型与字符 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，模板字面量类型与字符 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「模板字面量类型与字符串操纵」里当前按阶段替换更稳。

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

用一个共有的字面量字段（如 type / kind）做判别；TS 会自动收窄 → 编译期保证 switch/if 处理了所有分支；缺一个分支时 never 兜底报错。

### 题目

为什么推荐用 tagged union 设计领域模型？怎么保证穷尽匹配？

### 答案要点

- 用一个共有的**字面量字段**（如 `type` / `kind` / `status`）做判别
- TS 在 switch/if 中会自动**类型收窄**，访问字段时不必再断言
- 默认分支放 `const _: never = x;`，缺一个分支时编译期立刻报错（穷尽性）
- 优势：领域建模清晰、可扩展（加 case 编译期会强制找全引用点）
- 适用场景：Redux Action、UI 状态机、API Result 类型、AST 节点

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 判别联合 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 判别联合，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「判别联合（Tagged Union）的设计与穷尽性」按阶段灰度，每阶段可验收可撤回。

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

在原始类型上"贴一个不可访问的 brand 字段"；编译期区分，运行时无成本。

### 题目

如何用类型让 `UserId` 和 `OrderId` 不能互换，即使底层都是 string？

### 答案要点

- 在原始类型上**叠加一个不可访问的 brand 字段**（用 `&` 交叉），形成"名义类型"
- 编译期区分，运行时无成本（运行时仍是 string/number）
- 必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入
- 适用场景：UserId/OrderId 隔离、金额单位（Cents/USD）、已 escape 字符串、Hash 值

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 品牌类型 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 品牌类型 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「品牌类型（Branded Types）实现单位/ID 隔离」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

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

当 T 是裸类型参数（直接出现在 extends 左侧）且为联合时，TS 会对每个成员分别应用条件，结果再 union；用 [T] extends [U] 包裹可阻止分布。

### 题目

为什么 `T extends U ? X : Y` 在 T 是联合类型时会"分布"？如何关掉这种分布？

### 答案要点

- "**裸类型参数**"指 T 直接出现在 `extends` 左侧（不被任何 `[]` / 元组包裹）
- 裸 T 且为联合时，TS 对**每个成员分别应用条件**，结果再 union
- 用 `[T] extends [U]` 元组包裹可关闭分布行为，把整个联合作为一个整体判定
- `Exclude / Extract / NonNullable` 等工具类型**正是利用分布**实现对联合的逐项过滤
- 经验：写工具类型时务必明确"要不要分布"，否则容易写出反直觉行为

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「"裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「分布式条件类型与 Naked Type Parameter」风险偏高；当前方案可验证、可灰度、可回滚。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「tsconfig 关键字段与严格模式开启策略」时要先定义 tsconfig 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，tsconfig 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 tsconfig 关键链路先收敛再替换。

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

interface 自动合并；同名 namespace 也合并；模块扩展用 declare module 'xx' { interface X { ... } }。

### 题目

怎么给第三方库（如 `vue-router`）的类型加字段？怎么扩展全局 `Window`？

### 答案要点

- interface 自动合并；同名 namespace 也合并
- 模块扩展用 `declare module 'xx' { interface X { ... } }`
- 全局扩展用 `declare global { interface Window { __MY__: X } }`

#### 补充说明

- 面试中不要只停留在「声明合并与模块扩展（Module Augmentation）」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 类型、工程 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「声明合并与模块扩展（Module Augmentation）」时要先定义 声明合并与模块扩展 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，声明合并与模块扩展 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 声明合并与模块扩展 关键链路先收敛再替换。

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

defineProps<{ }>() 泛型形式（编译期擦除，零运行时成本）；defineEmits<{ (e: 'change', v: string): void }>() 调用签名。

### 题目

在 `<script setup lang="ts">` 中，如何为 props/emits/slots/expose/provide-inject 标注类型？

### 答案要点

- `defineProps<{ }>()` 泛型形式（编译期擦除，零运行时成本）
- `defineEmits<{ (e: 'change', v: string): void }>()` 调用签名
- `defineSlots<{ default: (p: { item: T }) => any }>()`
- `defineExpose<{ focus(): void }>()`
- 跨组件类型共享：`provide<symbol>(key, value)` 配合 `InjectionKey<T>`

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Vue 3 中 TypeScript 的最佳实践」时必须明确 Vue 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，Vue 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「用 infer 在条件类型里抽取类型」时要把 infer 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，infer 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「用 infer 在条件类型里抽取类型」里当前按阶段替换更稳。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「全局类型扩展与模块声明合并」时要把 全局类型扩展与模块声 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，全局类型扩展与模块声 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「全局类型扩展与模块声明合并」里当前按阶段替换更稳。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「品牌类型 (Branded Types) 与不透明类型」时要先确认 品牌类型 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，品牌类型 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 品牌类型 链路分层收口再逐步统一。

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

API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }；表单字段：useField<T>('user.address.zip') 推断出嵌套字段类型。

### 题目

模板字符串类型 + 递归 + 分布式条件能解决哪些真实问题？

### 答案要点

- API 路径校验：`/users/:id/posts/:postId` 自动推导出 `{ id: string; postId: string }`
- 表单字段：`useField<T>('user.address.zip')` 推断出嵌套字段类型
- i18n：根据 locale 文件 key 推导 `t('home.hero.title')`，缺 key 编译报错
- SQL builder：`from('users').select('id, name')` 返回 `{ id, name }` 行类型
- 路由参数：Next App Router 中文件结构 → 参数类型可推断

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「类型体操实用模式（不只是为了炫技）」时要把 类型体操实用模式 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，类型体操实用模式 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「类型体操实用模式（不只是为了炫技）」里当前按阶段替换更稳。

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

先界定「any、unknown、never 三者的区别」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「any：放弃类型检查。

### 题目

如果面试官追问：你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- 机制：unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全；never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 落地动作：回答「你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「你会如何识别「any、unknown、never 三者的区别」在生产环境中最容易失效的 类型 边界因素」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型

## generic-constraints-followup-1

title: 追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints

### 一句话

先界定「泛型约束、默认值与条件类型」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- 机制：extends 还支持给泛型加形状约束（如 T extends { id: string }）和默认值（如 T = unknown）；映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤
- 落地动作：回答「如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立」时要把 默认值与条件类型 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，默认值与条件类型 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要评估「泛型约束、默认值与条件类型」的落地风险，你会优先检查哪些 泛型 约束是否成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- extends 还支持给泛型加形状约束（如 `T extends { id: string }`）和默认值（如 `T = unknown`）
- 映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤

## type-vs-interface-followup-1

title: 追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface

### 一句话

先界定「type 与 interface 的区别与取舍」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「interface 支持声明合并。

### 题目

如果面试官追问：如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：interface 支持声明合并；type 不支持
- 机制：type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状；interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 落地动作：回答「如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项」时要把 type 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，type 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要让「type 与 interface 的区别与取舍」稳定上线，你会优先补齐哪些与 类型 相关的检查项」里当前按阶段替换更稳。

#### 关键细节（可追问）

- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长

## utility-types-followup-1

title: 追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types

### 一句话

先界定「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚。

### 题目

如果面试官追问：如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- 机制：Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记；Pick 直接遍历 K；Omit = `Pick<T, Exclude<keyof T, K>>`，本质是反向选
- 落地动作：回答「如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」的落地风险，你会优先检查哪些 类型 约束是否成立」时先约定 内置工具类型 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 内置工具类型 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- 全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记
- Pick 直接遍历 K；Omit = `Pick<T, Exclude<keyof T, K>>`，本质是反向选

## template-literal-types-followup-1

title: 追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types

### 一句话

先界定「模板字面量类型与字符串操纵」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 机制：内置 Uppercase/Lowercase/Capitalize/Uncapitalize；配合分布式条件类型可以实现完整字符串变换
- 落地动作：回答「如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立」时要把 模板字面量类型与字符 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，模板字面量类型与字符 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要评估「模板字面量类型与字符串操纵」的落地风险，你会优先检查哪些 类型 约束是否成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 内置 Uppercase/Lowercase/Capitalize/Uncapitalize
- 配合分布式条件类型可以实现完整字符串变换

## discriminated-union-followup-1

title: 追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「判别联合（Tagged Union）的设计与穷尽性」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：用一个共有的字面量字段（如 type / kind / status）做判别
- 机制：TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言；默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）
- 落地动作：回答「在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，真要把「判别联合（Tagged Union）的设计与穷尽性」推到线上，你会如何围绕 判别联合 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 用一个共有的字面量字段（如 type / kind / status）做判别
- TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言
- 默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）

## branded-types-followup-1

title: 追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types

### 一句话

先界定「品牌类型（Branded Types）实现单位/ID 隔离」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 机制：编译期区分，运行时无成本（运行时仍是 string/number）；必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入
- 落地动作：回答「在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，如果要让「品牌类型（Branded Types）实现单位/ID 隔离」稳定上线，你会优先补齐哪些与 模式 相关的检查项」时先约定 品牌类型 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 品牌类型 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- 在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 编译期区分，运行时无成本（运行时仍是 string/number）
- 必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入

## conditional-distribution-followup-1

title: 追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution

### 一句话

先界定「分布式条件类型与 Naked Type Parameter」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 机制：裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union；用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定
- 落地动作：回答「面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿」时要把 面对真实流量和复杂依 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，面对真实流量和复杂依 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「面对真实流量和复杂依赖时，「分布式条件类型与 Naked Type Parameter」最可能被哪些 类型 边界条件击穿」里当前按阶段替换更稳。

#### 关键细节（可追问）

- "裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union
- 用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定

## tsconfig-strict-followup-1

title: 追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「tsconfig 关键字段与严格模式开启策略」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- 机制：noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界；exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined
- 落地动作：回答「真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「真要把「tsconfig 关键字段与严格模式开启策略」推到线上，你会如何围绕 tsconfig 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界
- exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined

## declaration-merging-followup-1

title: 追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「声明合并与模块扩展（Module Augmentation）」拆成可验证的小步骤。

### 题目

如果面试官追问：结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：interface 自动合并；同名 namespace 也合并
- 机制：模块扩展用 declare module 'xx' { interface X { ... } }；全局扩展用 declare global { interface Window { **MY**: X } }
- 落地动作：回答「结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，真要把「声明合并与模块扩展（Module Augmentation）」推到线上，你会如何围绕 声明合并与模块扩展 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- interface 自动合并；同名 namespace 也合并
- 模块扩展用 declare module 'xx' { interface X { ... } }
- 全局扩展用 declare global { interface Window { **MY**: X } }

## vue-with-ts-followup-1

title: 追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Vue 3 中 TypeScript 的最佳实践」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动？

### 答案要点

#### 标准回答（直接作答）

- 结论：defineProps() 泛型形式（编译期擦除，零运行时成本）
- 机制：defineEmits() 调用签名；defineSlots any }>()
- 落地动作：回答「你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样在「Vue 3 中 TypeScript 的最佳实践」里围绕 Vue 处理组件更新顺序，避免出现时序错位和状态抖动」时必须明确 你会怎样在 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，你会怎样在 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- defineProps() 泛型形式（编译期擦除，零运行时成本）
- defineEmits() 调用签名
- defineSlots any }>()

## infer-extract-followup-1

title: 追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract

### 一句话

先界定「用 infer 在条件类型里抽取类型」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：语法：T extends Pattern ? X : never
- 机制：用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型；内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType
- 落地动作：回答「如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立」时要把 infer 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，infer 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要评估「用 infer 在条件类型里抽取类型」的落地风险，你会优先检查哪些 infer 约束是否成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 语法：T extends Pattern ? X : never
- 用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型
- 内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType

## global-augmentation-followup-1

title: 追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation

### 一句话

先界定「全局类型扩展与模块声明合并」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 机制：第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并；命名空间合并：同名 namespace 自动合并，可在自己的项目里补充
- 落地动作：回答「在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「全局类型扩展与模块声明合并」场景下，当「全局类型扩展与模块声明合并」跨团队落地时，你会先确认哪些 声明合并 前置假设，避免后续返工」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并
- 命名空间合并：同名 namespace 自动合并，可在自己的项目里补充

## branded-vs-opaque-followup-1

title: 追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：TS 默认结构等价，所有 string 都互通
- 机制：加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }；创建：用工厂函数做 cast，禁止外部直接 as
- 落地动作：回答「在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 品牌类型 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，品牌类型 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「品牌类型 (Branded Types) 与不透明类型」场景下，真把「品牌类型 (Branded Types) 与不透明类型」放到生产环境后，你会如何围绕 类型安全 划清信任边界并安排服务端兜底」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- TS 默认结构等价，所有 string 都互通
- 加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }
- 创建：用工厂函数做 cast，禁止外部直接 as

## type-level-gymnastics-followup-1

title: 追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics

### 一句话

先界定「类型体操实用模式（不只是为了炫技）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 机制：表单字段：useField('user.address.zip') 推断出嵌套字段类型；i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错
- 落地动作：回答「如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立」时要把 类型体操实用模式 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，类型体操实用模式 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要评估「类型体操实用模式（不只是为了炫技）」的落地风险，你会优先检查哪些 类型体操 约束是否成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 表单字段：useField('user.address.zip') 推断出嵌套字段类型
- i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错

## runtime-schema-validation

title: TypeScript 类型和运行时 Schema 校验如何配合
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全]
links: [tsconfig-strict, branded-types, 10-architecture/type-safe-api-contract]
followups: [runtime-schema-validation-followup-1, runtime-schema-validation-followup-2, runtime-schema-validation-followup-3]

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「TypeScript 类型和运行时 Schema 校验如何配合」时要先确认 TypeScript 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，TypeScript 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 TypeScript 链路分层收口再逐步统一。

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

先说判断标准，再说执行路径：回答「any、unknown、never 三者的区别」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> any 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，函数签名里 `unknown` 和 `any` 怎么选？

### 答案要点

#### 标准回答（直接作答）

- 结论：any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- 机制：unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全；never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 落地动作：回答「从工程落地角度看，函数签名里 unknown 和 any 怎么选」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，函数签名里 unknown 和 any 怎么选」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型

## any-vs-unknown-followup-3

title: 追问：在「any、unknown、never 三者的区别」场景下，as const 干什么用
difficulty: 基础
tags: [类型, 追问]
parent: any-vs-unknown
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「any、unknown、never 三者的区别」落到真实交付，而不是停在概念层。；可以按「问题背景 -> any 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「any、unknown、never 三者的区别」场景下，`as const` 干什么用（字面量类型 + readonly）？

### 答案要点

#### 标准回答（直接作答）

- 结论：any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- 机制：unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全；never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型
- 落地动作：回答「在「any、unknown、never 三者的区别」场景下，as const 干什么用」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「any、unknown、never 三者的区别」场景下，as const 干什么用」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- any：放弃类型检查，可被赋值给任意类型，也可接收任意类型 → 类型系统的"逃生舱"，代价是失去保护
- unknown：表示未知类型，必须先做类型守卫/断言才能使用，比 any 安全
- never：不可能存在的类型（永远抛错或死循环的函数返回值），是所有类型的子类型

## type-vs-interface-followup-2

title: 追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「type 与 interface 的区别与取舍」讲成只在理想输入下可用。；围绕「type 与 interface 的区别与取舍」组织答案时，建议按「约束来源 -> type 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：interface 支持声明合并；type 不支持
- 机制：type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状；interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 落地动作：回答「结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「interface 支持声明合并；type 不支持」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，联合类型加 discriminant 字段为什么能让 narrow 成立」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长

## type-vs-interface-followup-3

title: 追问：declare module '\.svg' 这种用法是什么原理
difficulty: 基础
tags: [类型, 追问]
parent: type-vs-interface
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「type 与 interface 的区别与取舍」在当前约束下为什么成立。；建议按「输入约束 -> type 执行链路 -> 结果验证」展开，并结合「type 与 interface 的区别与取舍」给出一条可复核结果。

### 题目

如果面试官追问：declare module '\*.svg' 这种用法是什么原理？

### 答案要点

#### 标准回答（直接作答）

- 结论：interface 支持声明合并；type 不支持
- 机制：type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状；interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长
- 落地动作：回答「declare module '\.svg' 这种用法的定义原理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「declare module '\.svg' 这种用法的定义原理」时要把 declare 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，declare 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「declare module '\.svg' 这种用法的定义原理」里当前按阶段替换更稳。

#### 关键细节（可追问）

- interface 支持声明合并；type 不支持
- type 可表示联合/交叉/原始类型/元组/映射；interface 只能描述对象/函数形状
- interface 的扩展更友好（extends 链）；类型别名嵌套交叉时容易让错误信息变长

## utility-types-followup-2

title: 追问：在当前团队与业务约束下，Required<T 和 NonNullable<T 区别
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」落到真实交付，而不是停在概念层。。

### 题目

如果面试官追问：在当前团队与业务约束下，Required<T> 和 NonNullable<T> 区别？

### 答案要点

#### 标准回答（直接作答）

- 结论：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- 机制：Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记；Pick 直接遍历 K；Omit = `Pick<T, Exclude<keyof T, K>>`，本质是反向选
- 落地动作：回答「在当前团队与业务约束下，Required<T 和 NonNullable<T 区别」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 Required 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 Required 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「在当前团队与业务约束下，Required<T 和 NonNullable<T 区别」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记
- Pick 直接遍历 K；Omit = `Pick<T, Exclude<keyof T, K>>`，本质是反向选

## utility-types-followup-3

title: 追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue
difficulty: 进阶
tags: [类型, 手写, 追问]
parent: utility-types
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」时要能同时解释收益、代价和失败信号。。

### 题目

如果面试官追问：在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue（按值类型筛选 key）？

### 答案要点

#### 标准回答（直接作答）

- 结论：全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- 机制：Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记；Pick 直接遍历 K；Omit = `Pick<T, Exclude<keyof T, K>>`，本质是反向选
- 落地动作：回答「在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 内置工具类型 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 内置工具类型 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「在「内置工具类型 Pick / Omit / Partial / Required / Readonly / Record 实现」场景下，实现 PickByValue」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 全部基于映射类型 + 条件类型 + 修饰符 +/- 三个核心机制
- Partial / Readonly 加 ? 或 readonly；Required 用 -? 强制移除可选标记
- Pick 直接遍历 K；Omit = `Pick<T, Exclude<keyof T, K>>`，本质是反向选

## discriminated-union-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union
generated: followup-script

### 一句话

推动「判别联合（Tagged Union）的设计与穷尽性」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「判别联合（Tagged Union）的设计与穷尽性」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：用一个共有的字面量字段（如 type / kind / status）做判别
- 机制：TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言；默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）
- 落地动作：回答「当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当团队成熟度不一致时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当团队成熟度不一致时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「当团队成熟度不一致时，你会如何围绕 判别联合 定义「判别联合（Tagged Union）的设计与穷尽性」的先后改造顺序」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 用一个共有的字面量字段（如 type / kind / status）做判别
- TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言
- 默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）

## discriminated-union-followup-3

title: 追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险
difficulty: 进阶
tags: [类型, 追问]
parent: discriminated-union
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「判别联合的设计与穷尽性」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 判别联合的设计与穷尽性 机制 -> 取舍边界」回答，再用「判别联合的设计与穷尽性」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：用一个共有的字面量字段（如 type / kind / status）做判别
- 机制：TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言；默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）
- 落地动作：回答「以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「判别联合的设计与穷尽性」为例，如果「判别联合的设计与穷尽性」进入维护期，你会优先围绕 判别联合的设计与穷尽性 监控哪些指标来预警风险」时要先定义 判别联合的设计与穷尽 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，判别联合的设计与穷尽 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 判别联合的设计与穷尽 关键链路先收敛再替换。

#### 关键细节（可追问）

- 用一个共有的字面量字段（如 type / kind / status）做判别
- TS 在 switch/if 中会自动类型收窄，访问字段时不必再断言
- 默认分支放 const \_: never = x;，缺一个分支时编译期立刻报错（穷尽性）

## tsconfig-strict-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「tsconfig 关键字段与严格模式开启策略」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> tsconfig 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- 机制：noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界；exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined
- 落地动作：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 老系统包袱重 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 老系统包袱重，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 tsconfig 安排「tsconfig 关键字段与严格模式开启策略」的渐进改造路线」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界
- exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined

## tsconfig-strict-followup-3

title: 追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [工程, 追问]
parent: tsconfig-strict
generated: followup-script

### 一句话

推动「tsconfig 关键字段与严格模式开启策略」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「tsconfig 关键字段与严格模式开启策略」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- 机制：noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界；exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined
- 落地动作：回答「在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，为了确认「tsconfig 关键字段与严格模式开启策略」在 tsconfig 上能持续跑稳，你会长期追哪些稳定性和效率信号」时要先定义 为了确认 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，为了确认 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 为了确认 关键链路先收敛再替换。

#### 关键细节（可追问）

- strict: true 一组：strictNullChecks / noImplicitAny / strictBindCallApply / strictFunctionTypes / strictPropertyInitialization
- noUncheckedIndexedAccess：访问索引时返回 T | undefined，避免数组越界
- exactOptionalPropertyTypes：区分 x?: T 与 x: T | undefined

## declaration-merging-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging
generated: followup-script

### 一句话

推动「声明合并与模块扩展（Module Augmentation）」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：interface 自动合并；同名 namespace 也合并
- 机制：模块扩展用 declare module 'xx' { interface X { ... } }；全局扩展用 declare global { interface Window { **MY**: X } }
- 落地动作：回答「当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「当团队成熟度不一致时，你会如何围绕 声明合并与模块扩展 定义「声明合并与模块扩展（Module Augmentation）」的先后改造顺序」时要先定义 当团队成熟度不一致时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队成熟度不一致时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队成熟度不一致时 关键链路先收敛再替换。

#### 关键细节（可追问）

- interface 自动合并；同名 namespace 也合并
- 模块扩展用 declare module 'xx' { interface X { ... } }
- 全局扩展用 declare global { interface Window { **MY**: X } }

## declaration-merging-followup-3

title: 追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险
difficulty: 进阶
tags: [类型, 工程, 追问]
parent: declaration-merging
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「声明合并与模块扩展」在当前约束下为什么成立。；围绕「声明合并与模块扩展」组织答案时，建议按「约束来源 -> 声明合并与模块扩展 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：interface 自动合并；同名 namespace 也合并
- 机制：模块扩展用 declare module 'xx' { interface X { ... } }；全局扩展用 declare global { interface Window { **MY**: X } }
- 落地动作：回答「结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果「声明合并与模块扩展」进入维护期，你会优先围绕 声明合并与模块扩展 监控哪些指标来预警风险」时要先定义 声明合并与模块扩展 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，声明合并与模块扩展 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 声明合并与模块扩展 关键链路先收敛再替换。

#### 关键细节（可追问）

- interface 自动合并；同名 namespace 也合并
- 模块扩展用 declare module 'xx' { interface X { ... } }
- 全局扩展用 declare global { interface Window { **MY**: X } }

## vue-with-ts-followup-2

title: 追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Vue 3 中 TypeScript 的最佳实践」在当前约束下为什么成立。；回答结构可按「触发条件 -> Vue 机制 -> 风险兜底」展开，并以「Vue 3 中 TypeScript 的最佳实践」补一条失败场景。

### 题目

如果面试官追问：面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现？

### 答案要点

#### 标准回答（直接作答）

- 结论：defineProps() 泛型形式（编译期擦除，零运行时成本）
- 机制：defineEmits() 调用签名；defineSlots any }>()
- 落地动作：回答「面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「面对「Vue 3 中 TypeScript 的最佳实践」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现」时先约定 面对 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 面对 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- defineProps() 泛型形式（编译期擦除，零运行时成本）
- defineEmits() 调用签名
- defineSlots any }>()

## vue-with-ts-followup-3

title: 追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度
difficulty: 进阶
tags: [Vue, 类型, 追问]
parent: vue-with-ts
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Vue 3 中 TypeScript 的最佳实践」在当前约束下为什么成立。；建议按「输入约束 -> Vue 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度？

### 答案要点

#### 标准回答（直接作答）

- 结论：defineProps() 泛型形式（编译期擦除，零运行时成本）
- 机制：defineEmits() 调用签名；defineSlots any }>()
- 落地动作：回答「在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Vue 3 中 TypeScript 的最佳实践」场景下，如果要对比「Vue 3 中 TypeScript 的最佳实践」和替代方案，你会先看学习成本、维护成本还是 Vue 相关收益速度」时必须明确 Vue 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，Vue 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- defineProps() 泛型形式（编译期擦除，零运行时成本）
- defineEmits() 调用签名
- defineSlots any }>()

## branded-vs-opaque-followup-2

title: 追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「品牌类型 (Branded Types) 与不透明类型」不是只在理想输入下成立。。

### 题目

如果面试官追问：从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 标准回答（直接作答）

- 结论：TS 默认结构等价，所有 string 都互通
- 机制：加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }；创建：用工厂函数做 cast，禁止外部直接 as
- 落地动作：回答「从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，如果要审计「品牌类型 (Branded Types) 与不透明类型」在 类型安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- TS 默认结构等价，所有 string 都互通
- 加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }
- 创建：用工厂函数做 cast，禁止外部直接 as

## branded-vs-opaque-followup-3

title: 追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级
difficulty: 资深
tags: [类型安全, Branded, 追问]
parent: branded-vs-opaque
generated: followup-script

### 一句话

规模变大后先重新评估「品牌类型 (Branded Types) 与不透明类型」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「品牌类型 (Branded Types) 与不透明类型」对应的安全边界收益被复杂度抵消。

### 题目

如果面试官追问：在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：TS 默认结构等价，所有 string 都互通
- 机制：加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }；创建：用工厂函数做 cast，禁止外部直接 as
- 落地动作：回答「在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 品牌类型 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，品牌类型 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「品牌类型 (Branded Types) 与不透明类型」场景下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 类型安全 给「品牌类型 (Branded Types) 与不透明类型」排优先级」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- TS 默认结构等价，所有 string 都互通
- 加一层"虚拟字段"做品牌：type UserId = string & { \_\_brand: 'UserId' }
- 创建：用工厂函数做 cast，禁止外部直接 as

## runtime-schema-validation-followup-1

title: 追问：结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「TypeScript 类型和运行时 Schema 校验如何配合」在当前约束下为什么成立。；建议按「输入约束 -> TypeScript 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，`unknown`、`any` 和 `as` 在信任边界上应该怎么用？

### 答案要点

#### 标准回答（直接作答）

- 结论：TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界
- 机制：运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据；类型最好由 Schema 推导：type User = z.infer，避免手写 interface User 和校验规则不一致
- 落地动作：回答「结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，unknown、any 和 as 在信任边界上应该怎么用」时要先确认 unknown 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，unknown 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 unknown 链路分层收口再逐步统一。

#### 关键细节（可追问）

- TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界
- 运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据
- 类型最好由 Schema 推导：type User = z.infer，避免手写 interface User 和校验规则不一致

## runtime-schema-validation-followup-2

title: 追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「TypeScript 类型和运行时 Schema 校验如何配合」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> TypeScript 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界
- 机制：运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据；类型最好由 Schema 推导：type User = z.infer，避免手写 interface User 和校验规则不一致
- 落地动作：回答「在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 TypeScript 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，TypeScript 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「TypeScript 类型和运行时 Schema 校验如何配合」场景下，Schema 校验放前端、BFF、后端各有什么价值和边界」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界
- 运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据
- 类型最好由 Schema 推导：type User = z.infer，避免手写 interface User 和校验规则不一致

## runtime-schema-validation-followup-3

title: 追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面
difficulty: 进阶
tags: [TypeScript, Zod, Schema, 类型安全, 追问]
parent: runtime-schema-validation
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「TypeScript 类型和运行时 Schema 校验如何配合」在当前约束下为什么成立。；回答结构可按「触发条件 -> TypeScript 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面？

### 答案要点

#### 标准回答（直接作答）

- 结论：TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界
- 机制：运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据；类型最好由 Schema 推导：type User = z.infer，避免手写 interface User 和校验规则不一致
- 落地动作：回答「结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果接口字段很多，如何避免运行时校验拖慢页面」时要先确认 如何避免运行时校验拖 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，如何避免运行时校验拖 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 如何避免运行时校验拖 链路分层收口再逐步统一。

#### 关键细节（可追问）

- TS 类型会在编译后擦除，fetch().json()、localStorage、postMessage、URL query、AI structured output 都是 unknown 边界
- 运行时 Schema 应放在信任边界：接口响应、表单提交、备份导入、配置文件、跨窗口消息、服务端渲染注水数据
- 类型最好由 Schema 推导：type User = z.infer，避免手写 interface User 和校验规则不一致

## generic-constraints-followup-2

title: 追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「泛型约束、默认值与条件类型」在当前约束下为什么成立。；回答结构可按「触发条件 -> 泛型 机制 -> 风险兜底」展开，并以「泛型约束、默认值与条件类型」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- 机制：extends 还支持给泛型加形状约束（如 T extends { id: string }）和默认值（如 T = unknown）；映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤
- 落地动作：回答「从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，你会如何围绕 泛型 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- extends 还支持给泛型加形状约束（如 `T extends { id: string }`）和默认值（如 `T = unknown`）
- 映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤

## generic-constraints-followup-3

title: 追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节
difficulty: 进阶
tags: [泛型, 追问]
parent: generic-constraints
generated: followup-script

### 一句话

规模变大后先重新评估「泛型约束、默认值与条件类型」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「泛型约束、默认值与条件类型」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节？

### 答案要点

#### 标准回答（直接作答）

- 结论：泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- 机制：extends 还支持给泛型加形状约束（如 T extends { id: string }）和默认值（如 T = unknown）；映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤
- 落地动作：回答「以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节」时要把 默认值与条件类型 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，默认值与条件类型 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「泛型约束、默认值与条件类型」为例，当约束变化导致成本上升时，你会先优化「泛型约束、默认值与条件类型」里和 泛型 相关的哪些环节」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 泛型约束 K extends keyof T 限制类型参数必须是 T 的合法键
- extends 还支持给泛型加形状约束（如 `T extends { id: string }`）和默认值（如 `T = unknown`）
- 映射类型 { [P in K]: T[P] } 遍历键；as 子句做 key remapping，返回 never 即过滤

## template-literal-types-followup-2

title: 追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「模板字面量类型与字符串操纵」在当前约束下为什么成立。；围绕「模板字面量类型与字符串操纵」组织答案时，建议按「约束来源 -> 字符串 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 标准回答（直接作答）

- 结论：模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 机制：内置 Uppercase/Lowercase/Capitalize/Uncapitalize；配合分布式条件类型可以实现完整字符串变换
- 落地动作：回答「在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论」时要把 字符串 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，字符串 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，如果要向团队复盘 字符串 相关优化，你会展示哪些关键日志和指标来支撑结论」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 内置 Uppercase/Lowercase/Capitalize/Uncapitalize
- 配合分布式条件类型可以实现完整字符串变换

## template-literal-types-followup-3

title: 追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏
difficulty: 进阶
tags: [类型, 字符串, 追问]
parent: template-literal-types
generated: followup-script

### 一句话

规模变大后先重新评估「模板字面量类型与字符串操纵」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「模板字面量类型与字符串操纵」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 机制：内置 Uppercase/Lowercase/Capitalize/Uncapitalize；配合分布式条件类型可以实现完整字符串变换
- 落地动作：回答「如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏」时要把 你会如何围绕 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何围绕 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果目标不变但约束更严，你会如何围绕 字符串 调整「模板字面量类型与字符串操纵」方案的边界和节奏」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 模板字面量 ${A}_${B} 配合 infer 拆解字符串
- 内置 Uppercase/Lowercase/Capitalize/Uncapitalize
- 配合分布式条件类型可以实现完整字符串变换

## branded-types-followup-2

title: 追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「品牌类型实现单位/ID 隔离」在当前约束下为什么成立。；围绕「品牌类型实现单位/ID 隔离」组织答案时，建议按「约束来源 -> 模式 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 机制：编译期区分，运行时无成本（运行时仍是 string/number）；必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入
- 落地动作：回答「在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 品牌类型实现单位 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 品牌类型实现单位 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「在「品牌类型实现单位/ID 隔离」场景下，为了证明这个方案在 模式 维度有效，你会怎么设计测试闭环和线上观测指标」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 编译期区分，运行时无成本（运行时仍是 string/number）
- 必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入

## branded-types-followup-3

title: 追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序
difficulty: 资深
tags: [类型, 模式, 追问]
parent: branded-types
generated: followup-script

### 一句话

规模变大后先重新评估「品牌类型（Branded Types）实现单位/ID 隔离」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「品牌类型（Branded Types）实现单位/ID 隔离」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 机制：编译期区分，运行时无成本（运行时仍是 string/number）；必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入
- 落地动作：回答「面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 面对规模与资源变化并 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 面对规模与资源变化并 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「面对规模与资源变化并存时，你会如何围绕 模式 调整「品牌类型（Branded Types）实现单位/ID 隔离」的推进顺序」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 在原始类型上叠加一个不可访问的 brand 字段（用 & 交叉），形成"名义类型"
- 编译期区分，运行时无成本（运行时仍是 string/number）
- 必须通过显式构造函数才能拿到 branded 类型，避免裸字符串混入

## conditional-distribution-followup-2

title: 追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「分布式条件类型与 Naked Type Parameter」讲成只在理想输入下可用。；围绕「分布式条件类型与 Naked Type Parameter」组织答案时。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 标准回答（直接作答）

- 结论："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 机制：裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union；用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定
- 落地动作：回答「结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果要让结论在 分布式条件类型与 上可复核，你会怎样安排测试、日志和指标的组合验证」要明确 分布式条件类型与 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 分布式条件类型与 的高风险边界。

#### 关键细节（可追问）

- "裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union
- 用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定

## conditional-distribution-followup-3

title: 追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [类型, 追问]
parent: conditional-distribution
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「分布式条件类型与 Naked Type Parameter」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 分布式条件类型与 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论："裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 机制：裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union；用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定
- 落地动作：回答「从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，遇到约束变化时，你会如何围绕 分布式条件类型与 拆分方案演进路径，而不是一次性推翻重来」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- "裸类型参数"指 T 直接出现在 extends 左侧（不被任何 [] / 元组包裹）
- 裸 T 且为联合时，TS 对每个成员分别应用条件，结果再 union
- 用 [T] extends [U] 元组包裹可关闭分布行为，把整个联合作为一个整体判定

## infer-extract-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「用 infer 在条件类型里抽取类型」落到真实交付，而不是停在概念层。；可以按「问题背景 -> infer 机制 -> 取舍边界」回答，再用「用 infer 在条件类型里抽取类型」补一个反例。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：语法：T extends Pattern ? X : never
- 机制：用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型；内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType
- 落地动作：回答「在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「语法：T extends Pattern ? X : never」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，你会如何围绕 infer 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 语法：T extends Pattern ? X : never
- 用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型
- 内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType

## infer-extract-followup-3

title: 追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序
difficulty: 资深
tags: [infer, 条件类型, 追问]
parent: infer-extract
generated: followup-script

### 一句话

规模变大后先重新评估「用 infer 在条件类型里抽取类型」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「用 infer 在条件类型里抽取类型」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：语法：T extends Pattern ? X : never
- 机制：用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型；内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType
- 落地动作：回答「以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序」时要把 infer 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，infer 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「用 infer 在条件类型里抽取类型」为例，面对规模与资源变化并存时，你会如何围绕 infer 调整「用 infer 在条件类型里抽取类型」的推进顺序」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 语法：T extends Pattern ? X : never
- 用途：从函数 / 类 / Promise / 数组中抽取参数 / 返回值 / 元素类型
- 内置 utility 几乎都是 infer 实现：ReturnType / Parameters / Awaited / ConstructorParameters / InstanceType

## global-augmentation-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「全局类型扩展与模块声明合并」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 声明合并 方案动作 -> 验证结果」，并用「全局类型扩展与模块声明合并」举一条主链路说明。。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 机制：第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并；命名空间合并：同名 namespace 自动合并，可在自己的项目里补充
- 落地动作：回答「在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进」时要把 上线后你会盯哪些与 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，上线后你会盯哪些与 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，上线后你会盯哪些与 声明合并 相关的日志与指标，来确认这套方案确实带来改进」里当前按阶段替换更稳。

#### 关键细节（可追问）

- declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并
- 命名空间合并：同名 namespace 自动合并，可在自己的项目里补充

## global-augmentation-followup-3

title: 追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏
difficulty: 资深
tags: [声明合并, ambient, 追问]
parent: global-augmentation
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「全局类型扩展与模块声明合并」时要能同时解释收益、代价和失败信号。；讲「全局类型扩展与模块声明合并」时先给 声明合并 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 机制：第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并；命名空间合并：同名 namespace 自动合并，可在自己的项目里补充
- 落地动作：回答「以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏」时要把 全局类型扩展与模块声 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，全局类型扩展与模块声 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「全局类型扩展与模块声明合并」为例，当兼容性要求提升或预算收紧时，你会如何围绕 声明合并 调整方案边界与实施节奏」里当前按阶段替换更稳。

#### 关键细节（可追问）

- declare global { interface Window { foo: Foo } } 在某模块文件里扩展全局
- 第三方包扩展：declare module 'pkg-name' { ... }，会与原始声明合并
- 命名空间合并：同名 namespace 自动合并，可在自己的项目里补充

## type-level-gymnastics-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「类型体操实用模式」落到真实交付，而不是停在概念层。；可以按「问题背景 -> 类型体操 机制 -> 取舍边界」回答，再用「类型体操实用模式」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 机制：表单字段：useField('user.address.zip') 推断出嵌套字段类型；i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错
- 落地动作：回答「从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，从工程落地角度看 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「从工程落地角度看，为了证明这个方案在 类型体操 维度有效，你会怎么设计测试闭环和线上观测指标」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 表单字段：useField('user.address.zip') 推断出嵌套字段类型
- i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错

## type-level-gymnastics-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏
difficulty: 资深
tags: [类型体操, 模板字符串类型, 追问]
parent: type-level-gymnastics
generated: followup-script

### 一句话

规模变大后先重新评估「类型体操实用模式（不只是为了炫技）」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「类型体操实用模式（不只是为了炫技）」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 机制：表单字段：useField('user.address.zip') 推断出嵌套字段类型；i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错
- 落地动作：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏」时要把 你会如何围绕 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何围绕 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 类型体操 调整「类型体操实用模式（不只是为了炫技）」方案的边界和节奏」里当前按阶段替换更稳。

#### 关键细节（可追问）

- API 路径校验：/users/:id/posts/:postId 自动推导出 { id: string; postId: string }
- 表单字段：useField('user.address.zip') 推断出嵌套字段类型
- i18n：根据 locale 文件 key 推导 t('home.hero.title')，缺 key 编译报错

## typescript-public-api-compat-gate

title: TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”
difficulty: 资深
tags: [类型治理, API 兼容, SemVer]
followups: [typescript-public-api-compat-gate-followup-1, typescript-public-api-compat-gate-followup-2, typescript-public-api-compat-gate-followup-3]

### 一句话

类型系统也会“破坏性变更”：公共类型签名一旦无提示变更，下游会在升级后批量报错；需要把类型兼容检查接入发布流程，让破坏升级在 PR 阶段就被阻断。

### 题目

做 SDK 或组件库时，你会如何给 TypeScript 公共类型 API 建立兼容闸门，避免“看起来只是重构，实际是破坏升级”？

### 答案要点

- 先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约。
- 在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化。
- 兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch。
- 变更说明要可执行：附迁移指引、codemod 或替代写法，避免下游靠猜。
- 设“灰度升级”机制：优先在内部样板仓和高价值消费方验证，再扩大升级范围。
- 线上反馈闭环：追踪下游类型报错率、升级失败率、回滚率，反校验闸门有效性。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 TypeScript 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 TypeScript，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」按阶段灰度，每阶段可验收可撤回。

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

遗留项目开启 strict 不是开关动作，而是治理工程：先做分区收敛和风险分层，再把规则、基线和回滚路径接入流水线，才能在不中断交付的前提下稳定推进。

### 题目

面对历史 TS/JS 混合仓库，你会如何推进 strict 迁移，让团队持续交付且不被类型报错“卡死”？

### 答案要点

- 先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题。
- 采用分阶段策略：先开 `noImplicitAny` / `strictNullChecks` 于新代码，再逐步收敛旧代码。
- 用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零。
- 建立例外机制：确需临时 `@ts-expect-error` 必须写原因和过期计划，防止长期滥用。
- 工具链联动：project references、增量编译、类型检查缓存，避免迁移期编译时长失控。
- 迁移过程要可回退：关键路径保留稳定分支和开关策略，避免一次性改动影响主线交付。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 严格模式迁移实战 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 严格模式迁移实战，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」按阶段灰度，每阶段可验收可撤回。

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

规模变大后先重新评估「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约
- 机制：在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化；兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch
- 落地动作：回答「以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 TypeScript 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 TypeScript，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，真要把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」推到线上，你会如何围绕 类型治理 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约
- 在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化
- 兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch

## typescript-public-api-compat-gate-followup-2

title: 追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 类型治理 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约
- 机制：在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化；兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch
- 落地动作：回答「以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 TypeScript 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，TypeScript 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「以「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」为例，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 类型治理 方案有效」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约
- 在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化
- 兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch

## typescript-public-api-compat-gate-followup-3

title: 追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损
difficulty: 资深
tags: [类型治理, API 兼容, SemVer, 追问]
parent: typescript-public-api-compat-gate
generated: followup-script

### 一句话

规模变大后先重新评估「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约
- 机制：在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化；兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch
- 落地动作：回答「在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 TypeScript 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 TypeScript，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」场景下，复盘「TypeScript 公共类型 API 兼容闸门：防止“静默破坏升级”」时，你会拿哪些数据判断这套方案该继续投入还是该止损」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先明确“公共类型面”：对外导出的类型、函数签名、泛型默认值、可选字段策略都属于兼容契约
- 在 CI 中做类型快照比对（如 dts rollup / API Extractor），识别新增、删除、窄化、可空性变化
- 兼容策略要和 SemVer 对齐：破坏变更必须 major，兼容新增走 minor，纯修复走 patch

## strict-migration-playbook-followup-1

title: 追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> strict 模式 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题
- 机制：采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码；用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零
- 落地动作：回答「结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会如何识别「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」在真实流量下最容易失效的输入与环境约束」时要先定义 你会如何识别 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会如何识别 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会如何识别 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题
- 采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码
- 用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零

## strict-migration-playbook-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」时要能同时解释收益、代价和失败信号。；讲「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」时先给 strict 模式 的判断口径，再补执行动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题
- 机制：采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码；用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零
- 落地动作：回答「在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了证明这个方案在 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了证明这个方案在 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「在当前团队与业务约束下，为了证明这个方案在 strict 模式 维度有效，你会怎么设计测试闭环和线上观测指标」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题
- 采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码
- 用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零

## strict-migration-playbook-followup-3

title: 追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护
difficulty: 资深
tags: [strict 模式, 迁移治理, 工程化, 追问]
parent: strict-migration-playbook
generated: followup-script

### 一句话

推动「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题
- 机制：采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码；用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零
- 落地动作：回答「半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 半年后要做去留决策时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 半年后要做去留决策时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「半年后要做去留决策时，你会拿哪些数据判断「严格模式迁移实战：从“能编译”到“可治理”的分阶段落地」还值不值得继续维护」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先做基线盘点：按目录/业务域统计错误类型和数量，区分阻塞型与治理型问题
- 采用分阶段策略：先开 noImplicitAny / strictNullChecks 于新代码，再逐步收敛旧代码
- 用“错误预算”治理迁移：新增 PR 禁止引入新错误，存量错误按配额持续清零

## typescript-version-upgrade-incident-bridge

title: TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通]
followups: [typescript-version-upgrade-incident-bridge-followup-1, typescript-version-upgrade-incident-bridge-followup-2, typescript-version-upgrade-incident-bridge-followup-3]

### 一句话

TS 版本升级事故常见误区是“只看编译错误数量”，忽略对发布节奏和业务链路的真实影响。

### 题目

升级 TypeScript 后，CI 编译错误激增，部分团队被阻塞；但降级会丢失新版本修复。你会如何组织升级事故指挥桥，兼顾止损与长期演进？

### 答案要点

- 先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理。
- 量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化。
- 确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划。
- 拍板要有双结论：短期保交付（回退/豁免）+ 中期稳升级（补类型与规则迁移）。
- 统一跨团队沟通口径：当前风险、允许动作、禁用动作、下一次检查点固定化。
- 复盘沉淀升级协议：版本评估清单、插件兼容矩阵、灰度策略模板。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「TypeScript 版本升级事故指挥桥：类型回归、构建阻塞与回退编排」时要先定义 TypeScript 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，TypeScript 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 TypeScript 关键链路先收敛再替换。

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

类型债务治理的关键不是“绝不允许 any”，而是“允许时有预算、有期限、有回收”。

### 题目

业务高压期里团队大量引入 `any`、`@ts-ignore` 以赶上线，短期提速但长期风险上升。你会如何设计 Type Debt 预算治理，兼顾交付与质量？

### 答案要点

- 建立债务台账：`any`、`ts-ignore`、`non-null assertion` 分类统计并绑定 owner。
- 预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间。
- 新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”。
- 发布闸门联动预算：超配额时限制发布或要求技术负责人签字确认。
- 回收采用固定节奏：每周 burn-down 与月度复盘，优先处理高风险链路。
- 绩效与治理挂钩：看“债务净变化”和“到期回收率”，防止只增不减。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Type 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Type，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「Type Debt 预算治理：any/ts-ignore 配额、豁免到期与止损机制」按阶段灰度，每阶段可验收可撤回。

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

第一阶段先保发布：只处理阻塞型错误，必要时临时豁免并绑定 owner 与到期日。；第二阶段稳恢复：补齐工具链兼容和高频类型回归，防止“今天能发、明天再炸”。；第三阶段做治理：把豁免逐步回收，并沉淀升级清单，减少下次版本切换成本。

### 题目

如果面试官追问：TS 升级已经阻塞发布了，你会怎样分阶段止损，既保交付又不给后续治理挖更大坑？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理
- 机制：量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化；确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划
- 落地动作：回答「TS 升级事故里你会怎样分阶段止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 TS 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 TS，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「TS 升级事故里你会怎样分阶段止损」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理
- 量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化
- 确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划

## typescript-version-upgrade-incident-bridge-followup-2

title: 追问：你会怎么搭一套 TS 升级验证面板
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

面板至少分三层：发布阻塞指标、迁移进度指标、业务交付影响指标。；指标要成对出现：例如“报错数下降”要配“豁免数变化”，防止靠放宽规则制造假改善。；固定复盘节奏：每日看止损、每周看回收、每月看长期趋势，避免只盯单日波动。

### 题目

如果面试官追问：你说升级策略有效，那会怎么搭验证面板，持续确认收益不是被短期噪声“看起来变好”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理
- 机制：量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化；确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划
- 落地动作：回答「你会怎么搭一套 TS 升级验证面板」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎么搭一套 TS 升级验证面板」时要先定义 你会怎么搭一套 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会怎么搭一套 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会怎么搭一套 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理
- 量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化
- 确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划

## typescript-version-upgrade-incident-bridge-followup-3

title: 追问：TS 升级方案去留该看哪几组硬指标
difficulty: 资深
tags: [升级治理, 类型系统, 决策沟通, 追问]
parent: typescript-version-upgrade-incident-bridge
generated: followup-script

### 一句话

我会看交付面：受阻流水线占比、平均恢复时长、版本发布延迟天数。；我会看质量面：阻塞型类型错误趋势、误报率、豁免到期回收率。；我会看组织面：跨团队协作时延、升级争议次数、规则复用率，判断机制是否可持续。

### 题目

如果面试官追问：三个月后团队讨论这条升级路线是否继续，你会给哪几组硬指标作为去留依据？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理
- 机制：量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化；确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划
- 落地动作：回答「TS 升级方案去留该看哪几组硬指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 TS 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 TS，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「TS 升级方案去留该看哪几组硬指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先做错误分层：阻塞发布错误、可延期治理错误、误报/工具链不兼容要分开处理
- 量化影响范围：受影响仓库、关键流水线、业务发布时间窗口必须可视化
- 确定临时止损策略：对阻塞链路可启临时豁免，但必须绑定到期和回收计划

## typescript-type-debt-budget-governance-followup-1

title: 追问：上线类型债预算治理前先验哪些关键条件
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

先验“分层配额”是否合理：核心链路和边缘链路不能用同一把尺子。；先验“审批与到期机制”是否能执行：没有 owner、到期日、回收人就不应放行。；先验“发布联动”是否清晰：超配额时是阻断发布还是升级审批，规则要提前说死。

### 题目

如果面试官追问：类型债预算治理听起来很好，但上线前你会先验哪些条件，确保不是“制度一上就卡死研发”？

### 答案要点

#### 标准回答（直接作答）

- 结论：建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner
- 机制：预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间；新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”
- 落地动作：回答「上线类型债预算治理前先验哪些关键条件」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「上线类型债预算治理前先验哪些关键条件」时要先定义 上线类型债预算治理前 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，上线类型债预算治理前 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 上线类型债预算治理前 关键链路先收敛再替换。

#### 关键细节（可追问）

- 建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner
- 预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间
- 新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”

## typescript-type-debt-budget-governance-followup-2

title: 追问：你会怎样证明类型债治理不是“纸面治理”
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

看净变化：每周新增债务与回收债务要同时下降，单看总量没有意义。；看逾期率：到期未清理占比是最关键质量信号，能直接暴露治理是否失效。；看交付影响：PR 周期和发布成功率不能明显恶化，否则治理会被团队抵触。

### 题目

如果面试官追问：你这套类型债治理怎么证明有效，而不是做了一堆流程却没带来真实改善？

### 答案要点

#### 标准回答（直接作答）

- 结论：建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner
- 机制：预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间；新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”
- 落地动作：回答「你会怎样证明类型债治理不是“纸面治理”」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样证明类型债治理不是“纸面治理”」时要先定义 你会怎样证明类型债治 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会怎样证明类型债治 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会怎样证明类型债治 关键链路先收敛再替换。

#### 关键细节（可追问）

- 建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner
- 预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间
- 新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”

## typescript-type-debt-budget-governance-followup-3

title: 追问：长期看哪些信号能判断类型债治理在变好
difficulty: 资深
tags: [技术债治理, strict, 工程化, 追问]
parent: typescript-type-debt-budget-governance
generated: followup-script

### 一句话

我会追三类趋势：逾期债务占比、核心域债务密度、回收完成率。；再追两类效率：PR 评审时长和发布稳定性，确认治理没有把交付链路拖垮。；每月看一次“风险前十债务清单”是否在收敛，避免只处理低风险、好清理的问题。

### 题目

如果面试官追问：这套类型债治理要长期运行，你会持续追哪些信号，判断它是真的变好而不是“指标好看”？

### 答案要点

#### 标准回答（直接作答）

- 结论：建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner
- 机制：预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间；新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”
- 落地动作：回答「长期看哪些信号能判断类型债治理在变好」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 长期看哪些信号能判断 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 长期看哪些信号能判断，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「长期看哪些信号能判断类型债治理在变好」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 建立债务台账：any、ts-ignore、non-null assertion 分类统计并绑定 owner
- 预算分层管理：核心域更严格，边缘域可有小额度豁免，但必须写明到期时间
- 新增债务要审批：说明业务收益、替代方案、回收计划，避免“默认放行”
