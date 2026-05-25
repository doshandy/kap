---
id: 04-css
title: CSS 进阶
order: 4
icon: 🎨
description: 盒模型、布局、层叠、动画、响应式、现代 CSS 与打印样式。
---

## box-bfc

title: 盒模型、BFC 与格式化上下文的真实作用
followups: [box-bfc-followup-1, box-bfc-followup-2, box-bfc-followup-3]
difficulty: 基础
tags: [盒模型, BFC, 布局]

### 一句话

讲「盒模型、BFC 与格式化上下文的真实作用」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请解释标准盒模型与 `box-sizing: border-box` 的区别，并说明 BFC 能解决哪些问题。

### 答案要点

- 标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等
- BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素

#### 工程化补充

- 场景前提：回答 盒模型、BFC 与格式化上下文的真实作用 时先锁定 盒模型 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 盒模型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 盒模型 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
.card {
  box-sizing: border-box;
  display: flow-root;
}
```

### 常见误区

- margin 折叠场景多到怀疑人生：父子之间、相邻兄弟、空块也会折叠
- 高度坍塌（浮动子元素 → 父没高度），可用 `overflow: hidden` 触发 BFC
- box-sizing 不写默认 content-box，padding 会撑大盒子

### 追问

- 写 5 种触发 BFC 的方式
- inline-block 之间的「鬼影空白」如何消除
- 圣杯布局 / 双飞翼布局现在还有意义吗（vs Flex/Grid）

### 延伸

- `flow-root` 是现代语义化触发 BFC 的首选
- 不要滥用 `overflow: hidden` 只为清浮动，容易裁掉阴影和 popover

## stacking-context

title: 层叠上下文与 z-index 为什么经常“不生效”
followups: [stacking-context-followup-1, stacking-context-followup-2, stacking-context-followup-3]
difficulty: 进阶
tags: [z-index, 层叠]

### 一句话

回答「层叠上下文与 z-index 为什么经常“不生效”」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

解释层叠上下文的创建条件，并说明为什么子元素的 `z-index: 9999` 也可能盖不过别的元素。

### 答案要点

- z-index 只在同一层叠上下文中比较
- 常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate
- 一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级

#### 工程化补充

- 场景前提：先定义 层叠上下文与 z-index 为什么经常“不生效” 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 层叠上下文与 z-index 为什么经常“不生效” 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 失败风险：常见风险是只给理想路径，忽略 z-index 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 z-index 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
/* ❌ 父级 transform 创建了新层叠上下文，子级再高也盖不过外面的元素 */
.parent {
  transform: translate(0);
} /* 创建上下文 */
.child {
  position: absolute;
  z-index: 9999;
}
.outer {
  position: relative;
  z-index: 1;
} /* child 永远在 outer 之下 */

/* ✅ 用 isolation 显式隔离层叠 */
.card {
  isolation: isolate; /* 创建独立层叠上下文，避免影响外部 */
}

/* ✅ 全局 z-index 规范化（避免魔法数字） */
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 1000;
  --z-toast: 1100;
  --z-tooltip: 1200;
}
.modal {
  z-index: var(--z-modal);
}
.toast {
  z-index: var(--z-toast);
}
```

### 追问

- 「层叠上下文与 z-index 为什么经常“不生效”」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「层叠上下文与 z-index 为什么经常“不生效”」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 z-index、层叠，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 调试层级问题先画"上下文边界"，不是一味调大 z-index
- Modal/Tooltip 常配合 Teleport 直接挂到 body，绕开业务容器的层叠限制

## flex-grid

title: Flex 与 Grid 的边界和常见坑
followups: [flex-grid-followup-1, flex-grid-followup-2, flex-grid-followup-3]
difficulty: 基础
tags: [Flex, Grid]

### 一句话

讲「Flex 与 Grid 的边界和常见坑」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

什么时候该用 Flex，什么时候该用 Grid？`flex: 1`、`min-width: 0`、`auto-fit/auto-fill` 各是什么意思？

### 答案要点

- Flex 更适合一维布局；Grid 更适合二维布局
- flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0
- Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0
- Grid 中 repeat(auto-fit, minmax(240px, 1fr)) 适合响应式卡片流

#### 工程化补充

- 场景前提：回答 Flex 与 Grid 的边界和常见坑 时先锁定 Flex 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 Flex 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Flex 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
.list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
```

### 常见误区

- flex: 1 = `flex: 1 1 0`（basis 0），不是 `1 1 auto`，用错会出现「内容长就撑满」
- justify-content 控的是 main 轴，align-items 控 cross 轴，方向反了一切失灵
- Grid 里 minmax(0, 1fr) 才能让长内容收缩；只写 `1fr` 大长字符串会撑爆

### 追问

- Grid 的 implicit vs explicit grid
- subgrid 解决了什么问题（Firefox 早就支持，Chrome 117+）
- gap 是 Flex 还是 Grid 的属性

### 延伸

- `auto-fill` 保留空轨道，`auto-fit` 会把空轨道折叠
- Grid 的 `subgrid` 很适合复杂内容对齐，但浏览器支持要确认

## responsive-container-query

title: 移动端适配、媒体查询与容器查询
followups: [responsive-container-query-followup-1, responsive-container-query-followup-2, responsive-container-query-followup-3]
links: []
difficulty: 进阶
tags: [响应式, 容器查询]

### 一句话

这题的高分关键是把 响应式 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

媒体查询和容器查询分别解决什么问题？移动端适配有哪些主流策略？

### 答案要点

- 媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片
- @container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形
- 面试中不要只停留在「移动端适配、媒体查询与容器查询」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：讨论 移动端适配、媒体查询与容器查询 时要交代响应式依赖怎么收集、何时触发更新、如何清理副作用。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

### 代码示例

```css
.panel {
  container-type: inline-size;
}

@container (min-width: 520px) {
  .panel-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

### 追问

- 在 Vue 项目里落地「移动端适配、媒体查询与容器查询」时，响应式边界和组件更新时机要注意什么？
- 如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？
- 它和常见替代方案相比，适合什么团队规模和业务复杂度？

### 常见误区

- 回答「移动端适配、媒体查询与容器查询」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。
- 只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 响应式、容器查询，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 容器查询通常比“写很多全局断点”更利于组件复用
- 移动端 1px 问题可用 `transform: scale(.5)`、高 DPR 边框图或直接接受物理像素差异

## variables-theme

title: CSS Variables、深色模式与设计令牌
followups: [variables-theme-followup-1, variables-theme-followup-2, variables-theme-followup-3]
difficulty: 进阶
tags: [主题, 变量]

### 一句话

这题的高分关键是把 主题 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么现代前端常用 CSS Variables 做主题系统，而不是 Sass 变量？

### 答案要点

- Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token
- 深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme

#### 工程化补充

- 场景前提：回答 CSS Variables、深色模式与设计令牌 时先锁定 主题 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 失败风险：常见风险是只给理想路径，忽略 主题 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 主题 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
/* tokens.css：基础令牌 + 语义令牌（双层） */
:root {
  /* 基础调色板 */
  --blue-500: #3b82f6;
  --gray-100: #f3f4f6;
  --gray-900: #111827;

  /* 语义令牌：业务侧只用语义层 */
  --color-bg: var(--gray-100);
  --color-text: var(--gray-900);
  --color-primary: var(--blue-500);

  /* 间距 / 圆角 / 阴影 */
  --space-1: 4px;
  --space-4: 16px;
  --radius-md: 8px;
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.08);
}

/* 暗色模式 */
:root.dark {
  --color-bg: var(--gray-900);
  --color-text: var(--gray-100);
}

/* 跟随系统偏好 */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --color-bg: var(--gray-900);
    --color-text: var(--gray-100);
  }
}

/* 局部主题覆盖：仅作用于该子树 */
.brand-card {
  --color-primary: #f59e0b;
}
```

```ts
// JS 切换主题（写到 HTML 根节点 + localStorage）
function setTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme !== 'system') root.classList.add(theme);
  localStorage.setItem('theme', theme);
}
```

### 追问

- 推动「CSS Variables、深色模式与设计令牌」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「CSS Variables、深色模式与设计令牌」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 主题、变量，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- CSS 变量天然支持级联，局部主题覆盖很方便
- 设计令牌最好按"语义层"命名，如 `--color-surface`，不要直接写 `--blue-500`

## selector-modern

title: `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用
followups: [selector-modern-followup-1, selector-modern-followup-2, selector-modern-followup-3]
links: [native-popover-dialog-anchor]
difficulty: 进阶
tags: [选择器, 现代 CSS]

### 一句话

这题的高分关键是把 选择器 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

说明几个现代 CSS 选择器的价值，并给出一个能真正减少 JS 的场景。

### 答案要点

- :has() 是“父选择器能力”，可根据后代状态反向选中父元素
- :is() 降低选择器重复；:where() 与其类似，但权重为 0
- :focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感
- 面试中不要只停留在「:has()、:is()、:where()、:focus-visible 怎么用」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：回答 `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用 时先锁定 选择器 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 失败风险：常见风险是只给理想路径，忽略 选择器 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 选择器 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
.field:has(input:invalid) {
  border-color: #ef4444;
}

:where(.markdown-body h1, .markdown-body h2, .markdown-body h3) {
  scroll-margin-top: 72px;
}
```

### 追问

- 「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 选择器、现代 CSS，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `:has()` 很强，但复杂选择器可能有性能成本，优先用于局部组件树
- `:where()` 很适合写低优先级基础样式

## animation-compositor

title: transition、animation、合成层与性能优化
followups: [animation-compositor-followup-1, animation-compositor-followup-2, animation-compositor-followup-3]
links: [19-visualization/animation-raf, 05-browser/reflow-vs-repaint]
difficulty: 进阶
tags: [动画, 性能]

### 一句话

这题回答要覆盖 动画 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

哪些 CSS 动画更容易跑在合成线程？`will-change` 为什么不能乱开？

### 答案要点

- 通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 改 width/height/top/left 更容易触发布局与重绘
- will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量
- transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效

#### 工程化补充

- 场景前提：回答 transition、animation、合成层与性能优化 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：围绕 transition、animation、合成层与性能优化 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 transition、animation、合成层与性能优化 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```css
/* ✅ 推荐：transform + opacity，仅触发 composite */
.fade-enter {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 200ms,
    transform 200ms;
}
.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
}

/* ❌ 反例：改 top/left 触发 layout */
.bad {
  transition:
    top 200ms,
    left 200ms;
}

/* will-change 仅在动画期间使用 */
.btn:hover {
  will-change: transform;
}
.btn:not(:hover) {
  will-change: auto;
}

/* 关键帧动画 */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
.skeleton {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

/* 尊重用户偏好：减少动效 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 追问

- 你会先看哪些指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「transition、animation、合成层与性能优化」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 动画、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 动效设计要考虑 `prefers-reduced-motion`
- 并不是"用了 transform 就一定快"，过多大图层也会卡

## print-css

title: 打印样式与网页内容导出友好性
followups: [print-css-followup-1, print-css-followup-2, print-css-followup-3]
difficulty: 基础
tags: [打印, 导出]

### 一句话

回答「打印样式与网页内容导出友好性」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

给一个知识库网站做 `@media print` 时，应该优先处理哪些问题？

### 答案要点

- 隐藏导航、侧栏、浮层、按钮等非内容元素
- 把背景、阴影、固定定位元素转为适合纸面的排版
- 避免代码块和长表格被截断，善用 page-break-inside: avoid
- 链接、时间、章节标题等在纸面上应保留足够语义

#### 工程化补充

- 场景前提：先定义 打印样式与网页内容导出友好性 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 打印 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 失败风险：常见风险是只给理想路径，忽略 打印 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 打印 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
@media print {
  /* 1. 隐藏交互元素 */
  .app-header,
  .app-sidebar,
  .toolbar,
  .modal,
  button,
  [role='dialog'] {
    display: none !important;
  }

  /* 2. 取消固定定位与暗色背景 */
  body {
    background: #fff;
    color: #000;
  }
  .card {
    box-shadow: none !important;
    border: 1px solid #ccc;
    page-break-inside: avoid; /* 卡片不被截断 */
  }

  /* 3. 标题级别避免页中断 */
  h1,
  h2,
  h3 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }

  /* 4. 链接显示 URL */
  a[href^='http']::after {
    content: ' (' attr(href) ')';
    font-size: 0.85em;
    color: #666;
  }

  /* 5. 代码块允许换页 */
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    page-break-inside: auto;
  }

  /* 6. 控制页边距 */
  @page {
    margin: 18mm 14mm;
  }
}
```

### 追问

- 「打印样式与网页内容导出友好性」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「打印样式与网页内容导出友好性」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 打印、导出，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 先把网页内容语义结构做好，打印样式才容易稳定
- "可打印"与"PDF 截图导出"不是一回事，前者更接近文档排版

## modern-css-features

title: 现代 CSS 必备特性：has / nesting / cascade-layers / color-mix
followups: [modern-css-features-followup-1, modern-css-features-followup-2, modern-css-features-followup-3]
difficulty: 进阶
tags: [现代 CSS, has, layers]

### 一句话

这题的高分关键是把 现代 CSS 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

2024 年起浏览器对 `:has()`、CSS Nesting、`@layer`、`color-mix()`、`@scope` 等特性的支持已成熟，它们解决了哪些真实问题？

### 答案要点

- :has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- CSS Nesting：原生嵌套，去掉 Sass / Less 依赖
- @layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖
- color-mix() / oklch()：基于感知均匀色彩空间做派生色，主题色更自然

#### 工程化补充

- 场景前提：讨论 现代 CSS 必备特性：has / nesting / cascade-layers / color-mix 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

### 代码示例

```css
.card:has(img) {
  padding-top: 0;
}

.btn {
  background: var(--c-primary);
  &:hover {
    filter: brightness(1.05);
  }
  &.ghost {
    background: transparent;
    color: var(--c-primary);
  }
}

@layer reset, base, components, utilities;
@layer base {
  body {
    font-family: system-ui;
  }
}

:root {
  --primary: oklch(0.7 0.18 250);
  --primary-soft: color-mix(in oklch, var(--primary) 18%, white);
}

@scope (.card) to (.actions) {
  h3 {
    font-size: 16px;
  }
}
```

### 追问

- 「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 现代 CSS、has、layers，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 老项目可以让 PostCSS / Lightning CSS 把现代语法降级到兼容旧浏览器
- 设计系统团队尤其要拥抱 layers，可以让"业务覆盖组件库"变得可预期

## css-architecture

title: CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules
followups: [css-architecture-followup-1, css-architecture-followup-2, css-architecture-followup-3]
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS]

### 一句话

这题回答要覆盖 架构 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

不同 CSS 组织方式各自的取舍是什么？大型团队怎么选？

### 答案要点

- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用
- CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成
- Tailwind：原子类，约定统一、不用命名、可复用 design tokens；但 HTML 拥挤、协作要建组件库

#### 工程化补充

- 场景前提：CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```vue
<script setup lang="ts">
import styles from './card.module.css';
defineProps<{ active: boolean }>();
</script>

<template>
  <div :class="[styles.card, $props.active && styles.active]">
    <slot />
  </div>
</template>
```

```tsx
import { recipe } from '@vanilla-extract/recipes';

export const button = recipe({
  base: { borderRadius: 8, padding: '8px 14px' },
  variants: {
    intent: {
      primary: { background: 'var(--c-primary)', color: '#fff' },
      ghost: { background: 'transparent', color: 'var(--c-primary)' },
    },
    size: {
      sm: { fontSize: 12 },
      md: { fontSize: 14 },
    },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
});
```

### 追问

- 推动「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 架构、Tailwind、CSS-in-JS，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不同方案可以混用，但一个仓库内统一基本盘很重要，否则维护成本爆炸
- 最重要的是把 design tokens（颜色、间距、圆角、阴影）做成单一来源

## center-element

title: 元素水平垂直居中的 N 种姿势
followups: [center-element-followup-1, center-element-followup-2, center-element-followup-3]
difficulty: 基础
tags: [布局, 居中, 高频]

### 一句话

这题回答要覆盖 布局 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请列出实现"水平 + 垂直居中"的常见方案，并指出各自的限制。

### 答案要点

- Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- Grid（一行最简）：display: grid; place-items: center
- 绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用
- 绝对定位 + margin auto：父级 position: relative，子级 position: absolute; inset: 0; margin: auto，子元素必须有宽高

#### 工程化补充

- 场景前提：先定义 元素水平垂直居中的 N 种姿势 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 布局 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 布局 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 布局 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
.parent {
  display: flex;
  place-items: center;
  height: 100vh;
}

.parent {
  display: grid;
  place-items: center;
  height: 100vh;
}

.parent {
  position: relative;
}
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.parent {
  position: relative;
}
.child {
  position: absolute;
  inset: 0;
  width: 200px;
  height: 200px;
  margin: auto;
}
```

### 追问

- 「元素水平垂直居中的 N 种姿势」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「元素水平垂直居中的 N 种姿势」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 布局、居中、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `place-items` 是 Grid 速记，但在 Flex 里一样可用
- `gap` 在 Flex 也已可用（safari 14.1+），不再需要 margin hack
- 居中文字别忘了 `line-height` 与字体度量差异（不同字体上下空隙不同）

## position-stacking

title: position 五个值的差别和层叠上下文是怎么形成的
followups: [position-stacking-followup-1, position-stacking-followup-2, position-stacking-followup-3]
difficulty: 进阶
tags: [定位, 层叠]

### 一句话

回答「position 五个值的差别和层叠上下文是怎么形成的」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请说明 position 5 个值的差别，以及哪些情况会形成新的层叠上下文。

### 答案要点

- static：默认值，正常文档流，top/left 无效
- relative：相对自己原本位置偏移，仍占据原位
- absolute：脱离文档流，相对最近的非 static 祖先定位
- fixed：相对视口；但若祖先有 transform / filter / will-change，会变成相对该祖先（常见坑）

#### 工程化补充

- 场景前提：先定义 position 五个值的差别和层叠上下文是怎么形成的 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 定位 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 失败风险：常见风险是只给理想路径，忽略 定位 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 定位 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```html
<div class="parent">
  <div class="child"></div>
</div>
<style>
  .parent {
    position: relative;
    opacity: 0.99;
  }
  .child {
    position: absolute;
    z-index: 999;
  }
</style>
```

```css
.scope {
  isolation: isolate;
}
```

### 追问

- 「position 五个值的差别和层叠上下文是怎么形成的」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「position 五个值的差别和层叠上下文是怎么形成的」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 定位、层叠，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `isolation: isolate` 是显式创建层叠上下文的现代写法，避免 z-index 大战
- 移动端 webview 中 `position: fixed` 在键盘弹起时会有奇怪表现，改用 sticky 或 viewport units

## css-layout-systems

title: 一道题讲清 Flex / Grid / 多列 / Float 各自适用场景
followups: [css-layout-systems-followup-1, css-layout-systems-followup-2, css-layout-systems-followup-3]
difficulty: 进阶
tags: [CSS, 布局, 高频]

### 一句话

这题回答要覆盖 CSS 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

对比 Flex / Grid / multi-column / Float 的核心定位、典型场景，以及搭配使用的最佳实践。

### 答案要点

- main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 子项可伸缩：flex: 1 1 200px = grow shrink basis
- 典型场景：导航栏、卡片列表、按钮组、垂直居中
- 不适合：复杂栅格（不能精确控制行列对齐）

#### 工程化补充

- 场景前提：先定义 一道题讲清 Flex / Grid / 多列 / Float 各自适用场景 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 56px 1fr;
  grid-template-areas:
    'header header'
    'sidebar main';
  height: 100vh;
}
.header {
  grid-area: header;
}
.sidebar {
  grid-area: sidebar;
}
.main {
  grid-area: main;
}

.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}
.card .actions {
  margin-left: auto;
}

.article {
  column-count: 3;
  column-gap: 24px;
  column-rule: 1px solid #eee;
}

figure {
  float: right;
  margin: 0 0 8px 16px;
  shape-outside: circle();
}
```

### 追问

- 「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 CSS、布局、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- subgrid（Firefox 全支持，Chrome 117+）：嵌套 Grid 的子项继承父 Grid 列轨道
- aspect-ratio：保证宽高比的现代写法（替代 padding 顶部 hack）
- container query：把响应式从"窗口"换到"容器"

## css-typography-rhythm

title: CSS 字体与排版怎么做才显专业
followups: [css-typography-rhythm-followup-1, css-typography-rhythm-followup-2, css-typography-rhythm-followup-3]
difficulty: 进阶
tags: [CSS, 字体, 排版]

### 一句话

回答「CSS 字体与排版怎么做才显专业」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

怎么做出"舒服又专业"的中文 / 英文混合排版？字体怎么选、加载怎么不闪、阅读怎么不累？

### 答案要点

- 系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）
- 多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决
- 字号 / 行高 / 字距

#### 工程化补充

- 场景前提：先定义 CSS 字体与排版怎么做才显专业 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
:root {
  --font-sans:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.var.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}

body {
  font-family: 'Inter', var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  color: #1a1a1a;
}
article {
  max-width: 70ch;
  margin: 0 auto;
}
article p {
  margin: 1em 0;
}
article h1 {
  text-wrap: balance;
}
.price {
  font-feature-settings: 'tnum';
}
```

### 追问

- 「CSS 字体与排版怎么做才显专业」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「CSS 字体与排版怎么做才显专业」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 CSS、字体、排版，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 中文字体推荐：思源黑体 / 苹方 / 鸿蒙体
- 等宽字体推荐：JetBrains Mono / Fira Code（带连字）
- 字体加载库：fontfaceobserver 监听加载完成做切换动画

## box-bfc-followup-1

title: 追问：你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素
difficulty: 基础
tags: [盒模型, BFC, 布局, 追问]
parent: box-bfc

### 一句话

回答这题时，先给 盒模型 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素？

### 答案要点

#### 直答

- 追问核心：围绕「盒模型、BFC 与格式化上下文的真实作用」给出可执行的落地方案，重点说明 盒模型 怎么做（对应追问：你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素）。
- 直接围绕「你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素」作答：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发

#### 落地步骤

- 第一步：回答 盒模型、BFC 与格式化上下文的真实作用 时先锁定 盒模型 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 盒模型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 盒模型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 盒模型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 盒模型 的可复现用例、线上监控指标和回退演练记录。

## view-transitions-api

title: View Transitions API 如何让 SPA / MPA 路由切换更顺滑
difficulty: 进阶
tags: [ViewTransition, 动效, UX]
followups: [view-transitions-api-followup-1, view-transitions-api-followup-2, view-transitions-api-followup-3]

### 一句话

讲「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

View Transitions API 的基本机制是什么？在 SPA 和 MPA 中分别怎么接入，哪些场景不适合使用？

### 答案要点

- SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画。
- MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致。
- 适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入。
- 动画只解决“感知连续性”，不能掩盖慢接口；慢数据仍要有骨架屏、流式渲染或缓存策略。

#### 工程化补充

- 场景前提：回答 View Transitions API 如何让 SPA / MPA 路由切换更顺滑 时先锁定 动效 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 失败风险：常见风险是只给理想路径，忽略 动效 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 动效 的可复现用例、线上监控指标和回退演练记录。

### 常见误区

- 把转场当性能优化，实际只是视觉过渡；接口慢、主线程卡仍然会被用户感知。
- 给太多元素设置 `view-transition-name`，快照层过多导致动画卡顿和调试困难。
- 忽略无障碍偏好，用户设置减少动态效果后仍强制播放复杂动画。
- 路由切换后不恢复焦点，键盘和读屏用户会迷失在新页面中。

### 追问

- View Transitions 和普通 CSS transition / animation 的区别是什么？
- 列表到详情的共享元素动画如何避免闪烁和布局跳变？
- 你会如何为不支持该 API 的浏览器做降级？

## native-popover-dialog-anchor

title: 原生 dialog / popover、top layer 与 anchor positioning 解决了什么
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, a11y]
links: [14-a11y-i18n/focus-keyboard, selector-modern, 14-a11y-i18n/a11y-quick-wins-basic]
followups: [native-popover-dialog-anchor-followup-1, native-popover-dialog-anchor-followup-2, native-popover-dialog-anchor-followup-3]

### 一句话

这题回答要覆盖 Popover 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

为什么现代前端开始重新关注原生 `dialog`、popover、top layer 和 anchor positioning？它们相比自研弹层组件有什么优势和限制？

### 答案要点

- top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI。
- dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联。
- anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作。
- 限制包括浏览器支持差异、动画控制细节、嵌套弹层策略、设计系统统一 API，以及复杂碰撞避让仍可能需要库辅助。

#### 工程化补充

- 场景前提：先定义 原生 dialog / popover、top layer 与 anchor positioning 解决了什么 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 原生 dialog / popover、top layer 与 anchor positioning 解决了什么 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 Popover 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Popover 的可复现用例、线上监控指标和回退演练记录。

### 常见误区

- 认为原生弹层就自动满足所有 a11y，结果没有设置标题、描述、初始焦点和关闭后的焦点恢复。
- 只解决 `z-index`，不处理滚动锁定、背景 inert、移动端虚拟键盘和视口边界。
- 对 tooltip、popover、modal 使用同一套交互规则，导致点击外部关闭、Esc、hover/focus 行为混乱。
- 未做兼容检测，直接替换成熟组件导致旧浏览器或 WebView 内浮层不可用。

### 追问

- top layer 为什么能绕开普通层叠上下文问题？
- dialog 和 popover 在语义、焦点和关闭行为上有什么差别？
- anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里？

## stacking-context-followup-1

title: 追问：如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context

### 一句话

这道追问要直接回应「层叠上下文与 z-index 为什么经常“不生效”」在 z-index 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项？

### 答案要点

#### 直答

- 追问核心：解释「层叠上下文与 z-index 为什么经常“不生效”」背后的因果关系，并指出 z-index 的触发条件（对应追问：如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项）。
- 直接围绕「如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项」作答：z-index 只在同一层叠上下文中比较

#### 落地步骤

- 第一步：先定义 层叠上下文与 z-index 为什么经常“不生效” 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 z-index 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 z-index 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 z-index 的可复现用例、线上监控指标和回退演练记录。

## flex-grid-followup-1

title: 追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid

### 一句话

这道追问要直接回应「Flex 与 Grid 的边界和常见坑」在 Flex 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工？

### 答案要点

#### 直答

- 追问核心：围绕「Flex 与 Grid 的边界和常见坑」给出可执行的落地方案，重点说明 Flex 怎么做（对应追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工）。
- 直接围绕「从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工」作答：Flex 更适合一维布局；Grid 更适合二维布局

#### 落地步骤

- 第一步：Flex 与 Grid 的边界和常见坑 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 Flex 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## responsive-container-query-followup-1

title: 追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query

### 一句话

回答这题时，先给 响应式 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机？

### 答案要点

#### 直答

- 追问核心：围绕「移动端适配、媒体查询与容器查询」给出可执行的落地方案，重点说明 响应式 怎么做（对应追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机）。
- 直接围绕「结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机」作答：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应

#### 落地步骤

- 第一步：讨论 移动端适配、媒体查询与容器查询 时要交代响应式依赖怎么收集、何时触发更新、如何清理副作用。
- 第二步：先把 响应式 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 第三步：如果 响应式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

## variables-theme-followup-1

title: 追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme

### 一句话

这道追问要直接回应「CSS Variables、深色模式与设计令牌」在 主题 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「CSS Variables、深色模式与设计令牌」上线时如何灰度、观测、回滚（对应追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径」作答：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖

#### 落地步骤

- 第一步：CSS Variables、深色模式与设计令牌 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 主题 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## selector-modern-followup-1

title: 追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern

### 一句话

这道追问的关键是把 选择器 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点？

### 答案要点

#### 直答

- 追问核心：识别「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的高风险失败场景并给出兜底措施（对应追问：在「:has()、:is()、:where()、:focus-visible 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点）。
- 直接围绕「在「:has()、:is()、:where()、:focus-visible 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点」作答：:has() 是“父选择器能力”，可根据后代状态反向选中父元素

#### 落地步骤

- 第一步：回答 `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用 时先锁定 选择器 的边界条件，避免把经验结论当成通用规则。
- 第二步：围绕 选择器 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 选择器 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 选择器 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 选择器 的可复现用例、线上监控指标和回退演练记录。

## animation-compositor-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor

### 一句话

这道追问要直接回应「transition、animation、合成层与性能优化」在 动画 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「transition、animation、合成层与性能优化」结论成立，给出 动画 的验收路径（对应追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈）。
- 直接围绕「从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈」作答：通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint

#### 落地步骤

- 第一步：回答 transition、animation、合成层与性能优化 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 动画 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 transition、animation、合成层与性能优化 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## print-css-followup-1

title: 追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css

### 一句话

围绕「打印样式与网页内容导出友好性」回答追问时，重点说清 打印 的前提、动作和回退条件。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿？

### 答案要点

#### 直答

- 追问核心：围绕「打印样式与网页内容导出友好性」给出可执行的落地方案，重点说明 打印 怎么做（对应追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿）。
- 直接围绕「面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿」作答：隐藏导航、侧栏、浮层、按钮等非内容元素

#### 落地步骤

- 第一步：先定义 打印样式与网页内容导出友好性 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 打印 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 打印 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 打印 的可复现用例、线上监控指标和回退演练记录。

## modern-css-features-followup-1

title: 追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features

### 一句话

回答这题时，先给 现代 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿？

### 答案要点

#### 直答

- 追问核心：围绕「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」给出可执行的落地方案，重点说明 现代 CSS 怎么做（对应追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿）。
- 直接围绕「以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿」作答：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack

#### 落地步骤

- 第一步：回答 现代 CSS 必备特性：has / nesting / cascade-layers / color-mix 时先锁定 现代 CSS 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 现代 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 现代 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 现代 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 现代 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-architecture-followup-1

title: 追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture

### 一句话

围绕「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」回答追问时，重点说清 架构 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」上线时如何灰度、观测、回滚（对应追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」作答：BEM：传统命名约定，零运行时，跨技术栈通用，但样板多

#### 落地步骤

- 第一步：CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 架构 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## center-element-followup-1

title: 追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element

### 一句话

这道追问要直接回应「元素水平垂直居中的 N 种姿势」在 布局 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工？

### 答案要点

#### 直答

- 追问核心：围绕「元素水平垂直居中的 N 种姿势」给出可执行的落地方案，重点说明 布局 怎么做（对应追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工）。
- 直接围绕「在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工」作答：Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center

#### 落地步骤

- 第一步：先定义 元素水平垂直居中的 N 种姿势 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 布局 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 布局 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 布局 的可复现用例、线上监控指标和回退演练记录。

## position-stacking-followup-1

title: 追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking

### 一句话

围绕「position 五个值的差别和层叠上下文是怎么形成的」回答追问时，重点说清 定位 的前提、动作和回退条件。

### 题目

如果面试官追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 追问核心：围绕「position 五个值的差别和层叠上下文是怎么形成的」给出可执行的落地方案，重点说明 定位 怎么做（对应追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么）。
- 直接围绕「把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么」作答：static：默认值，正常文档流，top/left 无效

#### 落地步骤

- 第一步：先定义 position 五个值的差别和层叠上下文是怎么形成的 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 定位 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 定位 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 定位 的可复现用例、线上监控指标和回退演练记录。

## css-layout-systems-followup-1

title: 追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems

### 一句话

这道追问要直接回应「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在 CSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素？

### 答案要点

#### 直答

- 追问核心：围绕「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素）。
- 直接围绕「你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素」作答：main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）

#### 落地步骤

- 第一步：先定义 一道题讲清 Flex / Grid / 多列 / Float 各自适用场景 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-typography-rhythm-followup-1

title: 追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm

### 一句话

围绕「CSS 字体与排版怎么做才显专业」回答追问时，重点说清 CSS 的前提、动作和回退条件。

### 题目

如果面试官追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CSS 字体与排版怎么做才显专业」结论成立，给出 CSS 的验收路径（对应追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑）。
- 直接围绕「当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑」作答：系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif

#### 落地步骤

- 第一步：先定义 CSS 字体与排版怎么做才显专业 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## scroll-driven-animations

title: Scroll-driven Animations：scroll-timeline / view-timeline 解决什么
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能]
links: [animation-compositor, 08-performance/inp-deep, view-transitions-api]
followups: [scroll-driven-animations-followup-1, scroll-driven-animations-followup-2, scroll-driven-animations-followup-3]

### 一句话

这题的高分关键是把 CSS 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么滚动驱动动画不建议默认用 `scroll` 事件手写？`scroll-timeline` 和 `view-timeline` 分别适合什么场景？

### 答案要点

- 手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算。
- scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。
- view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入。
- 性能收益来自声明式动画和浏览器调度，但不代表所有属性都能上合成线程；优先动画 transform、opacity，避免让布局属性每帧变化。

#### 工程化补充

- 场景前提：Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 只有在瓶颈被数据证实时才值得推进；先确认 CSS 是否真是主耗时来源。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```css
@supports (animation-timeline: scroll()) {
  .reading-progress {
    transform-origin: left;
    animation: grow linear both;
    animation-timeline: scroll(root block);
  }

  .card {
    animation: fade-up linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 35%;
  }
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 常见误区

- 以为 CSS 滚动动画一定更快；如果动画的是 `height`、`top`、`width`，仍可能触发布局和绘制。
- 不做 `@supports` 和 reduced motion，导致旧 WebView 或无障碍用户体验变差。
- 把复杂业务状态也塞进 CSS timeline，结果调试和可测试性都变差。

### 追问

- `scroll-timeline` 和 `view-timeline` 的触发对象有什么不同？
- 哪些动画属性适合滚动驱动，哪些属性应该避免？
- 不支持新 API 的浏览器上你会怎么降级？

## css-style-queries-and-scope

title: CSS Style Queries、@scope 与组件样式边界怎么用
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化]
links: [responsive-container-query, selector-modern, 10-architecture/component-library]
followups: [css-style-queries-and-scope-followup-1, css-style-queries-and-scope-followup-2, css-style-queries-and-scope-followup-3]

### 一句话

这题回答要覆盖 CSS 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

现代 CSS 里，尺寸容器查询、Style Queries 和 `@scope` 分别解决什么问题？它们在组件库里怎么配合？

### 答案要点

- 尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点。
- Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式。
- @scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局。
- 组件库落地时可以把尺寸适配交给 @container，把语义状态交给变量，把作用域交给 CSS Modules / Shadow DOM / @scope 的组合。

#### 工程化补充

- 场景前提：先定义 CSS Style Queries、@scope 与组件样式边界怎么用 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

### 代码示例

```css
.card-shell {
  container-type: inline-size;
  --density: comfortable;
}

@container style(--density: compact) {
  .card-content {
    padding: 8px;
    font-size: 14px;
  }
}

@scope (.article-body) {
  h2 {
    margin-block: 2em 0.8em;
  }

  a {
    text-decoration-thickness: 0.08em;
  }
}
```

### 常见误区

- 把 Style Queries 当成 JS 状态管理替代品，结果样式状态和业务状态难以同步。
- `@scope` 只能减少选择器影响范围，不能自动解决优先级、主题继承和运行时状态问题。
- 容器查询没有设置 `container-type`，规则永远不生效。

### 追问

- 什么时候用容器查询，什么时候仍然应该用媒体查询？
- Style Queries 和 CSS Variables 的关系是什么？
- `@scope`、CSS Modules、Shadow DOM 在样式隔离上各有什么边界？

## box-bfc-followup-2

title: 追问：结合真实业务约束，inline-block 之间的「鬼影空白」如何消除
difficulty: 基础
tags: [盒模型, BFC, 布局, 追问]
parent: box-bfc
generated: followup-script

### 一句话

围绕「盒模型、BFC 与格式化上下文的真实作用」回答追问时，重点说清 盒模型 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，inline-block 之间的「鬼影空白」如何消除？

### 答案要点

#### 直答

- 追问核心：围绕「盒模型、BFC 与格式化上下文的真实作用」给出可执行的落地方案，重点说明 盒模型 怎么做（对应追问：结合真实业务约束，inline-block 之间的「鬼影空白」如何消除）。
- 直接围绕「结合真实业务约束，inline-block 之间的「鬼影空白」如何消除」作答：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发

#### 落地步骤

- 第一步：先定义 盒模型、BFC 与格式化上下文的真实作用 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 盒模型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 盒模型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 盒模型 的可复现用例、线上监控指标和回退演练记录。

## box-bfc-followup-3

title: 追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗
difficulty: 基础
tags: [盒模型, BFC, 布局, 追问]
parent: box-bfc
generated: followup-script

### 一句话

这道追问的关键是把 盒模型 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗（vs Flex/Grid）？

### 答案要点

#### 直答

- 追问核心：围绕「盒模型、BFC 与格式化上下文的真实作用」给出可执行的落地方案，重点说明 盒模型 怎么做（对应追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗（vs Flex/Grid））。
- 直接围绕「在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗（vs Flex/Grid）」作答：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发

#### 落地步骤

- 第一步：回答 盒模型、BFC 与格式化上下文的真实作用 时先锁定 盒模型 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 盒模型 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 盒模型 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 盒模型 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 盒模型 的可复现用例、线上监控指标和回退演练记录。

## flex-grid-followup-2

title: 追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid
generated: followup-script

### 一句话

这道追问要直接回应「Flex 与 Grid 的边界和常见坑」在 Flex 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题（Firefox 早就支持，Chrome 117+）？

### 答案要点

#### 直答

- 追问核心：围绕「Flex 与 Grid 的边界和常见坑」给出可执行的落地方案，重点说明 Flex 怎么做（对应追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题（Firefox 早就支持，Chrome 117+））。
- 直接围绕「在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题（Firefox 早就支持，Chrome 117+）」作答：Flex 更适合一维布局；Grid 更适合二维布局

#### 落地步骤

- 第一步：先定义 Flex 与 Grid 的边界和常见坑 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 Flex 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Flex 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Flex 的可复现用例、线上监控指标和回退演练记录。

## flex-grid-followup-3

title: 追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid
generated: followup-script

### 一句话

回答这题时，先给 Flex 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性？

### 答案要点

#### 直答

- 追问核心：围绕「Flex 与 Grid 的边界和常见坑」给出可执行的落地方案，重点说明 Flex 怎么做（对应追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性）。
- 直接围绕「在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性」作答：Flex 更适合一维布局；Grid 更适合二维布局

#### 落地步骤

- 第一步：回答 Flex 与 Grid 的边界和常见坑 时先锁定 Flex 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 Flex 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 Flex 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Flex 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Flex 的可复现用例、线上监控指标和回退演练记录。

## responsive-container-query-followup-2

title: 追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query
generated: followup-script

### 一句话

这道追问要直接回应「移动端适配、媒体查询与容器查询」在 响应式 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损？

### 答案要点

#### 直答

- 追问核心：比较「移动端适配、媒体查询与容器查询」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损）。
- 直接围绕「结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损」作答：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应

#### 落地步骤

- 第一步：先划清 响应式 的作用域和更新时机，再展开 移动端适配、媒体查询与容器查询，避免状态边界混乱。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要交代响应式依赖和组件更新时机，避免副作用漂移。
- 第三步：如果 响应式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是响应式边界不清导致连锁重渲染和状态抖动。
- 验收信号：验收至少看组件重渲染次数、关键交互耗时和状态一致性。

## responsive-container-query-followup-3

title: 追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query
generated: followup-script

### 一句话

这道追问要直接回应「移动端适配、媒体查询与容器查询」在 响应式 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度？

### 答案要点

#### 直答

- 追问核心：围绕「移动端适配、媒体查询与容器查询」给出可执行的落地方案，重点说明 响应式 怎么做（对应追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度）。
- 直接围绕「从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度」作答：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应

#### 落地步骤

- 第一步：移动端适配、媒体查询与容器查询 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 响应式 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## variables-theme-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme
generated: followup-script

### 一句话

这道追问的关键是把 主题 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线？

### 答案要点

#### 直答

- 追问核心：围绕「CSS Variables、深色模式与设计令牌」给出可执行的落地方案，重点说明 主题 怎么做（对应追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线）。
- 直接围绕「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线」作答：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖

#### 落地步骤

- 第一步：落地 CSS Variables、深色模式与设计令牌 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 主题 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 主题 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## variables-theme-followup-3

title: 追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme
generated: followup-script

### 一句话

回答这题时，先给 主题 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CSS Variables、深色模式与设计令牌」结论成立，给出 主题 的验收路径（对应追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准）。
- 直接围绕「在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准」作答：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖

#### 落地步骤

- 第一步：回答 CSS Variables、深色模式与设计令牌 时先锁定 主题 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 主题 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 主题 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 主题 的可复现用例、线上监控指标和回退演练记录。

## animation-compositor-followup-2

title: 追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor
generated: followup-script

### 一句话

这道追问的关键是把 动画 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 直答

- 追问核心：比较「transition、animation、合成层与性能优化」在收益、成本和维护复杂度上的取舍边界（对应追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益）。
- 直接围绕「在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益」作答：通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint

#### 落地步骤

- 第一步：transition、animation、合成层与性能优化 只有在瓶颈被数据证实时才值得推进；先确认 动画 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 动画 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 transition、animation、合成层与性能优化 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## animation-compositor-followup-3

title: 追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor
generated: followup-script

### 一句话

围绕「transition、animation、合成层与性能优化」回答追问时，重点说清 动画 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 追问核心：比较「transition、animation、合成层与性能优化」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本）。
- 直接围绕「从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本」作答：通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint

#### 落地步骤

- 第一步：回答 transition、animation、合成层与性能优化 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 动画 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 transition、animation、合成层与性能优化 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## css-architecture-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture
generated: followup-script

### 一句话

回答这题时，先给 架构 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界？

### 答案要点

#### 直答

- 追问核心：比较「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界）。
- 直接围绕「从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界」作答：BEM：传统命名约定，零运行时，跨技术栈通用，但样板多

#### 落地步骤

- 第一步：落地 CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 架构 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## css-architecture-followup-3

title: 追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture
generated: followup-script

### 一句话

这道追问要直接回应「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 追问核心：围绕「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」给出可执行的落地方案，重点说明 架构 怎么做（对应追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号）。
- 直接围绕「从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号」作答：BEM：传统命名约定，零运行时，跨技术栈通用，但样板多

#### 落地步骤

- 第一步：CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 架构 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## view-transitions-api-followup-1

title: 追问：View Transitions 和普通 CSS transition / animation 的区别是什么
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

这道追问的关键是把 动效 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：View Transitions 和普通 CSS transition / animation 的区别是什么？

### 答案要点

#### 直答

- 追问核心：围绕「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」给出可执行的落地方案，重点说明 动效 怎么做（对应追问：View Transitions 和普通 CSS transition / animation 的区别是什么）。
- 直接围绕「View Transitions 和普通 CSS transition / animation 的区别是什么」作答：SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画。

#### 落地步骤

- 第一步：回答 View Transitions API 如何让 SPA / MPA 路由切换更顺滑 时先锁定 动效 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 动效 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 动效 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 动效 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 动效 的可复现用例、线上监控指标和回退演练记录。

## view-transitions-api-followup-2

title: 追问：列表到详情的共享元素动画如何避免闪烁和布局跳变
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

围绕「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」回答追问时，重点说清 动效 的前提、动作和回退条件。

### 题目

如果面试官追问：列表到详情的共享元素动画如何避免闪烁和布局跳变？

### 答案要点

#### 直答

- 追问核心：围绕「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」给出可执行的落地方案，重点说明 动效 怎么做（对应追问：列表到详情的共享元素动画如何避免闪烁和布局跳变）。
- 直接围绕「列表到详情的共享元素动画如何避免闪烁和布局跳变」作答：SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画。

#### 落地步骤

- 第一步：先定义 View Transitions API 如何让 SPA / MPA 路由切换更顺滑 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 动效 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 动效 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 动效 的可复现用例、线上监控指标和回退演练记录。

## view-transitions-api-followup-3

title: 追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

回答这题时，先给 动效 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级？

### 答案要点

#### 直答

- 追问核心：识别「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」的高风险失败场景并给出兜底措施（对应追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级）。
- 直接围绕「结合真实业务约束，你会如何为不支持该 API 的浏览器做降级」作答：SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画。

#### 落地步骤

- 第一步：讨论 View Transitions API 如何让 SPA / MPA 路由切换更顺滑 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：围绕 动效 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 动效 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## native-popover-dialog-anchor-followup-1

title: 追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

这道追问要直接回应「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」在 Popover 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题？

### 答案要点

#### 直答

- 追问核心：解释「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」背后的因果关系，并指出 Popover 的触发条件（对应追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题）。
- 直接围绕「在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题」作答：top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI。

#### 落地步骤

- 第一步：先定义 原生 dialog / popover、top layer 与 anchor positioning 解决了什么 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 Popover 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Popover 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Popover 的可复现用例、线上监控指标和回退演练记录。

## native-popover-dialog-anchor-followup-2

title: 追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

这道追问的关键是把 Popover 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别？

### 答案要点

#### 直答

- 追问核心：围绕「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」给出可执行的落地方案，重点说明 Popover 怎么做（对应追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别）。
- 直接围绕「结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别」作答：top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI。

#### 落地步骤

- 第一步：回答 原生 dialog / popover、top layer 与 anchor positioning 解决了什么 时先锁定 Popover 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 Popover 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 Popover 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Popover 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Popover 的可复现用例、线上监控指标和回退演练记录。

## native-popover-dialog-anchor-followup-3

title: 追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

围绕「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」回答追问时，重点说清 Popover 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里？

### 答案要点

#### 直答

- 追问核心：围绕「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」给出可执行的落地方案，重点说明 Popover 怎么做（对应追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里）。
- 直接围绕「结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里」作答：top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI。

#### 落地步骤

- 第一步：先定义 原生 dialog / popover、top layer 与 anchor positioning 解决了什么 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 Popover 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Popover 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Popover 的可复现用例、线上监控指标和回退演练记录。

## scroll-driven-animations-followup-1

title: 追问：结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

这道追问的关键是把 CSS 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，`scroll-timeline` 和 `view-timeline` 的触发对象有什么不同？

### 答案要点

#### 直答

- 追问核心：围绕「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同）。
- 直接围绕「结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同」作答：手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算。

#### 落地步骤

- 第一步：Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 只有在瓶颈被数据证实时才值得推进；先确认 CSS 是否真是主耗时来源。
- 第二步：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## scroll-driven-animations-followup-2

title: 追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

围绕「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」回答追问时，重点说清 CSS 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免？

### 答案要点

#### 直答

- 追问核心：围绕「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免）。
- 直接围绕「结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免」作答：手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算。

#### 落地步骤

- 第一步：回答 Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## scroll-driven-animations-followup-3

title: 追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级？

### 答案要点

#### 直答

- 追问核心：识别「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」的高风险失败场景并给出兜底措施（对应追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级）。
- 直接围绕「在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级」作答：手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算。

#### 落地步骤

- 第一步：Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 只有在瓶颈被数据证实时才值得推进；先确认 CSS 是否真是主耗时来源。
- 第二步：围绕 CSS 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Scroll-driven Animations：scroll-timeline / view-timeline 解决什么 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## css-style-queries-and-scope-followup-1

title: 追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

这道追问要直接回应「CSS Style Queries、@scope 与组件样式边界怎么用」在 CSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询？

### 答案要点

#### 直答

- 追问核心：围绕「CSS Style Queries、@scope 与组件样式边界怎么用」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询）。
- 直接围绕「以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询」作答：尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点。

#### 落地步骤

- 第一步：先定义 CSS Style Queries、@scope 与组件样式边界怎么用 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-style-queries-and-scope-followup-2

title: 追问：Style Queries 和 CSS Variables 的关系是什么
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：Style Queries 和 CSS Variables 的关系是什么？

### 答案要点

#### 直答

- 追问核心：围绕「CSS Style Queries、@scope 与组件样式边界怎么用」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：Style Queries 和 CSS Variables 的关系是什么）。
- 直接围绕「Style Queries 和 CSS Variables 的关系是什么」作答：尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点。

#### 落地步骤

- 第一步：回答 CSS Style Queries、@scope 与组件样式边界怎么用 时先锁定 CSS 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-style-queries-and-scope-followup-3

title: 追问：从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，`@scope`、CSS Modules、Shadow DOM 在样式隔离上各有什么边界？

### 答案要点

#### 直答

- 追问核心：围绕「CSS Style Queries、@scope 与组件样式边界怎么用」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界）。
- 直接围绕「从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界」作答：尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点。

#### 落地步骤

- 第一步：落地 CSS Style Queries、@scope 与组件样式边界怎么用 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## stacking-context-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context
generated: followup-script

### 一句话

回答这题时，先给 z-index 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「层叠上下文与 z-index 为什么经常“不生效”」结论成立，给出 z-index 的验收路径（对应追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标」作答：z-index 只在同一层叠上下文中比较

#### 落地步骤

- 第一步：层叠上下文与 z-index 为什么经常“不生效” 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 z-index。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 z-index 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## stacking-context-followup-3

title: 追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context
generated: followup-script

### 一句话

围绕「层叠上下文与 z-index 为什么经常“不生效”」回答追问时，重点说清 z-index 的前提、动作和回退条件。

### 题目

如果面试官追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序？

### 答案要点

#### 直答

- 追问核心：解释「层叠上下文与 z-index 为什么经常“不生效”」背后的因果关系，并指出 z-index 的触发条件（对应追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序）。
- 直接围绕「以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序」作答：z-index 只在同一层叠上下文中比较

#### 落地步骤

- 第一步：先定义 层叠上下文与 z-index 为什么经常“不生效” 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 z-index 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 z-index 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 z-index 的可复现用例、线上监控指标和回退演练记录。

## selector-modern-followup-2

title: 追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern
generated: followup-script

### 一句话

这道追问要直接回应「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」在 选择器 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」结论成立，给出 选择器 的验收路径（对应追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：:has() 是“父选择器能力”，可根据后代状态反向选中父元素

#### 落地步骤

- 第一步：回答 `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 选择器 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## selector-modern-followup-3

title: 追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern
generated: followup-script

### 一句话

回答这题时，先给 选择器 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段？

### 答案要点

#### 直答

- 追问核心：围绕「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」给出可执行的落地方案，重点说明 选择器 怎么做（对应追问：在「:has()、:is()、:where()、:focus-visible 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「:has()、:is()、:where()、:focus-visible 怎么用」的实施阶段）。
- 直接围绕「在「:has()、:is()、:where()、:focus-visible 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「:has()、:is()、:where()、:focus-visible 怎么用」的实施阶段」作答：:has() 是“父选择器能力”，可根据后代状态反向选中父元素

#### 落地步骤

- 第一步：回答 `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用 时先锁定 选择器 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 选择器 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 选择器 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 选择器 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 选择器 的可复现用例、线上监控指标和回退演练记录。

## print-css-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css
generated: followup-script

### 一句话

这道追问的关键是把 打印 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「打印样式与网页内容导出友好性」结论成立，给出 打印 的验收路径（对应追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效）。
- 直接围绕「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效」作答：隐藏导航、侧栏、浮层、按钮等非内容元素

#### 落地步骤

- 第一步：打印样式与网页内容导出友好性 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 打印。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 打印 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## print-css-followup-3

title: 追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css
generated: followup-script

### 一句话

这道追问的关键是把 打印 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段？

### 答案要点

#### 直答

- 追问核心：围绕「打印样式与网页内容导出友好性」给出可执行的落地方案，重点说明 打印 怎么做（对应追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段）。
- 直接围绕「从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段」作答：隐藏导航、侧栏、浮层、按钮等非内容元素

#### 落地步骤

- 第一步：落地 打印样式与网页内容导出友好性 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 打印 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 打印 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## modern-css-features-followup-2

title: 追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features
generated: followup-script

### 一句话

这道追问要直接回应「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」在 现代 CSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」结论成立，给出 现代 CSS 的验收路径（对应追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证）。
- 直接围绕「如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证」作答：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack

#### 落地步骤

- 第一步：回答 现代 CSS 必备特性：has / nesting / cascade-layers / color-mix 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 现代 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## modern-css-features-followup-3

title: 追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features
generated: followup-script

### 一句话

这道追问的关键是把 现代 CSS 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 追问核心：围绕「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」给出可执行的落地方案，重点说明 现代 CSS 怎么做（对应追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来）。
- 直接围绕「在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来」作答：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack

#### 落地步骤

- 第一步：回答 现代 CSS 必备特性：has / nesting / cascade-layers / color-mix 时先锁定 现代 CSS 的边界条件，避免把经验结论当成通用规则。
- 第二步：先把 现代 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 现代 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 现代 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 现代 CSS 的可复现用例、线上监控指标和回退演练记录。

## center-element-followup-2

title: 追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element
generated: followup-script

### 一句话

回答这题时，先给 布局 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 追问核心：说明如何验证「元素水平垂直居中的 N 种姿势」结论成立，给出 布局 的验收路径（对应追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论）。
- 直接围绕「在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论」作答：Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center

#### 落地步骤

- 第一步：元素水平垂直居中的 N 种姿势 只有在瓶颈被数据证实时才值得推进；先确认 布局 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 布局 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 元素水平垂直居中的 N 种姿势 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## center-element-followup-3

title: 追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element
generated: followup-script

### 一句话

这道追问要直接回应「元素水平垂直居中的 N 种姿势」在 布局 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「元素水平垂直居中的 N 种姿势」在收益、成本和维护复杂度上的取舍边界（对应追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节）。
- 直接围绕「当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节」作答：Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center

#### 落地步骤

- 第一步：回答 元素水平垂直居中的 N 种姿势 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 布局 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 元素水平垂直居中的 N 种姿势 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## position-stacking-followup-2

title: 追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking
generated: followup-script

### 一句话

回答这题时，先给 定位 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 追问核心：说明如何验证「position 五个值的差别和层叠上下文是怎么形成的」结论成立，给出 定位 的验收路径（对应追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进）。
- 直接围绕「在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进」作答：static：默认值，正常文档流，top/left 无效

#### 落地步骤

- 第一步：回答 position 五个值的差别和层叠上下文是怎么形成的 时先锁定 定位 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 定位 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 定位 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 定位 的可复现用例、线上监控指标和回退演练记录。

## position-stacking-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking
generated: followup-script

### 一句话

这道追问要直接回应「position 五个值的差别和层叠上下文是怎么形成的」在 定位 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 追问核心：围绕「position 五个值的差别和层叠上下文是怎么形成的」给出可执行的落地方案，重点说明 定位 怎么做（对应追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏）。
- 直接围绕「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏」作答：static：默认值，正常文档流，top/left 无效

#### 落地步骤

- 第一步：先定义 position 五个值的差别和层叠上下文是怎么形成的 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 定位 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 定位 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 定位 的可复现用例、线上监控指标和回退演练记录。

## css-layout-systems-followup-2

title: 追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」结论成立，给出 CSS 的验收路径（对应追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立）。
- 直接围绕「以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立」作答：main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）

#### 落地步骤

- 第一步：回答 一道题讲清 Flex / Grid / 多列 / Float 各自适用场景 时先锁定 CSS 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-layout-systems-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级？

### 答案要点

#### 直答

- 追问核心：围绕「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级）。
- 直接围绕「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级」作答：main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）

#### 落地步骤

- 第一步：落地 一道题讲清 Flex / Grid / 多列 / Float 各自适用场景 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 CSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## css-typography-rhythm-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CSS 字体与排版怎么做才显专业」结论成立，给出 CSS 的验收路径（对应追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进）。
- 直接围绕「在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进」作答：系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif

#### 落地步骤

- 第一步：回答 CSS 字体与排版怎么做才显专业 时先锁定 CSS 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-typography-rhythm-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm
generated: followup-script

### 一句话

这道追问要直接回应「CSS 字体与排版怎么做才显专业」在 CSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 追问核心：围绕「CSS 字体与排版怎么做才显专业」给出可执行的落地方案，重点说明 CSS 怎么做（对应追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏）。
- 直接围绕「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏」作答：系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif

#### 落地步骤

- 第一步：先定义 CSS 字体与排版怎么做才显专业 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 CSS 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 CSS 的可复现用例、线上监控指标和回退演练记录。

## css-render-path-budget-gate

title: CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径]
followups: [css-render-path-budget-gate-followup-1, css-render-path-budget-gate-followup-2, css-render-path-budget-gate-followup-3]

### 一句话

讲「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你会如何给 CSS 渲染路径建立性能预算，并把预算接入发布流程，确保样式迭代不拖慢首屏和交互？

### 答案要点

- 先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。
- 预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置。
- 构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批。
- 结合真实用户指标复核：只看 Lighthouse 不够，要看线上分位数据与设备分层。

#### 工程化补充

- 场景前提：CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 只有在瓶颈被数据证实时才值得推进；先确认 CSS 是否真是主耗时来源。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```json
{
  "cssBudget": {
    "criticalCssKb": 45,
    "totalCssKb": 180,
    "renderBlockingCssRequests": 2
  }
}
```

```ts
function checkCssBudget(report: { criticalCssKb: number; blocking: number }) {
  if (report.criticalCssKb > 45) throw new Error('critical CSS 超预算');
  if (report.blocking > 2) throw new Error('阻塞样式请求过多');
}
```

### 追问

- 「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做一次性优化，不把预算纳入日常发布守门。
- 只关注体积，不关注阻塞顺序和关键路径影响。
- 阈值长期不校准，导致预算形同虚设。

### 延伸

- 预算可按页面类型建立多套策略，减少一刀切误判。
- 可把超预算原因映射到修复建议，提升团队执行效率。

## css-change-safety-guardrail

title: 样式改动安全护栏：回归范围评估、灰度放量与回滚预案
difficulty: 资深
tags: [CSS, 发布安全, 回归治理]
followups: [css-change-safety-guardrail-followup-1, css-change-safety-guardrail-followup-2, css-change-safety-guardrail-followup-3]

### 一句话

这题回答要覆盖 CSS 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

当你要上线一次影响基础样式系统的改动（如 tokens、reset、组件基类），如何设计安全护栏让风险可控？

### 答案要点

- 先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流。
- 变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯。
- 发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容。
- 异常判据要量化：布局破版率、关键交互失败率、样式报错与用户投诉趋势。

#### 工程化补充

- 场景前提：先限定 CSS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 样式改动安全护栏：回归范围评估、灰度放量与回滚预案 的结论不成立。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```ts
type CssRolloutConfig = {
  enabledRoutes: string[];
  tokenVersion: string;
  safeMode: boolean;
};

function isRouteEnabled(route: string, cfg: CssRolloutConfig) {
  return cfg.enabledRoutes.includes(route) && !cfg.safeMode;
}
```

```ts
function shouldRollback(signal: { layoutBreakRate: number; criticalFlowDrop: number }) {
  return signal.layoutBreakRate > 0.01 || signal.criticalFlowDrop > 0.02;
}
```

### 追问

- 「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做局部页面验证，忽略全局样式连锁效应。
- 灰度放量无明确停止条件，异常时反应滞后。
- 回滚只切代码不管缓存，导致“回滚后仍显示旧问题”。

### 延伸

- 关键样式改动可要求双人审阅与专项回归。
- 建议沉淀“高风险 CSS 改动清单”作为发布前检查项。

## css-render-path-budget-gate-followup-1

title: 追问：你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 追问核心：说明「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」上线时如何灰度、观测、回滚（对应追问：你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束）。
- 直接围绕「你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束」作答：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。

#### 落地步骤

- 第一步：CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 只有在瓶颈被数据证实时才值得推进；先确认 CSS 是否真是主耗时来源。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## css-render-path-budget-gate-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

这道追问要直接回应「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在 CSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」结论成立，给出 CSS 的验收路径（对应追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标」作答：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。

#### 落地步骤

- 第一步：回答 CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## css-render-path-budget-gate-followup-3

title: 追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

这道追问的关键是把 CSS 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 追问核心：说明「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」上线时如何灰度、观测、回滚（对应追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来）。
- 直接围绕「以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来」作答：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。

#### 落地步骤

- 第一步：CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 只有在瓶颈被数据证实时才值得推进；先确认 CSS 是否真是主耗时来源。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## css-change-safety-guardrail-followup-1

title: 追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

围绕「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」回答追问时，重点说清 CSS 的前提、动作和回退条件。

### 题目

如果面试官追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 直答

- 追问核心：说明「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」上线时如何灰度、观测、回滚（对应追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理）。
- 直接围绕「在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理」作答：先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流。

#### 落地步骤

- 第一步：先限定 CSS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 样式改动安全护栏：回归范围评估、灰度放量与回滚预案 的结论不成立。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## css-change-safety-guardrail-followup-2

title: 追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

回答这题时，先给 CSS 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」结论成立，给出 CSS 的验收路径（对应追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流。

#### 落地步骤

- 第一步：样式改动安全护栏：回归范围评估、灰度放量与回滚预案 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## css-change-safety-guardrail-followup-3

title: 追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

这道追问要直接回应「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」在 CSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界？

### 答案要点

#### 直答

- 追问核心：比较「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」在收益、成本和维护复杂度上的取舍边界（对应追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界）。
- 直接围绕「面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界」作答：先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流。

#### 落地步骤

- 第一步：先限定 CSS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 样式改动安全护栏：回归范围评估、灰度放量与回滚预案 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。
