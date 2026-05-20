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

盒模型 = 内容 + padding + border + margin；`border-box` 让"宽度包括 padding 和 border"。BFC 是一个独立的渲染容器，里面元素的布局不会影响外面（清浮动、防 margin 折叠就靠它）。

### 题目

请解释标准盒模型与 `box-sizing: border-box` 的区别，并说明 BFC 能解决哪些问题。

### 答案要点

- 标准盒模型下 width/height 只算 content；`border-box` 把 padding/border 算进尺寸，更适合组件化开发
- BFC 是独立布局上下文，常见触发：`overflow` 非 visible、`display: flow-root`、浮动、绝对定位等
- BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素

#### 标准补充（边界/失败/取舍）

- 界定条件：该题结论成立前提是 盒模型 的评估集稳定、失败样例可追踪，并且有可降级兜底。
- 失败场景：例如模型在 盒模型 场景出现幻觉但无兜底，错误结果会直接影响业务决策；应启用规则校验与人工复核降级。
- 替代方案与取舍：可直接换更大模型提升效果，但时延和成本不可控；当前对「盒模型、BFC 与格式化上下文的真实作用」采用模型路由与降级。

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

z-index 只在同一层叠上下文中比较；常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate；一旦父元素形成新层叠上下文。

### 题目

解释层叠上下文的创建条件，并说明为什么子元素的 `z-index: 9999` 也可能盖不过别的元素。

### 答案要点

- `z-index` 只在同一层叠上下文中比较
- 常见创建条件：定位元素且有 z-index、`opacity < 1`、`transform`、`filter`、`will-change`、`isolation: isolate`
- 一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「z-index 只在同一层叠上下文中比较」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「层叠上下文与 z-index 为什么经常“不生效”」风险偏高；当前方案可验证、可灰度、可回滚。

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

一维布局（一行 / 一列）用 Flex；二维布局（行列同时控制）用 Grid。两者可以嵌套，不互斥。

### 题目

什么时候该用 Flex，什么时候该用 Grid？`flex: 1`、`min-width: 0`、`auto-fit/auto-fill` 各是什么意思？

### 答案要点

- Flex 更适合一维布局；Grid 更适合二维布局
- `flex: 1` 实际是 `1 1 0%`，表示可增长、可收缩、基础尺寸为 0
- Flex 子项默认 `min-width: auto`，会导致长文本撑破布局，所以常要显式写 `min-width: 0`
- Grid 中 `repeat(auto-fit, minmax(240px, 1fr))` 适合响应式卡片流

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Flex 更适合一维布局；Grid 更适合二维布局」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「Flex 与 Grid 的边界和常见坑」风险偏高；当前方案可验证、可灰度、可回滚。

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

媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应；移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片；@container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形。

### 题目

媒体查询和容器查询分别解决什么问题？移动端适配有哪些主流策略？

### 答案要点

- 媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 移动端常见策略：弹性布局、`rem`、流式栅格、视口单位、响应式图片
- `@container` 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形

#### 补充说明

- 面试中不要只停留在「移动端适配、媒体查询与容器查询」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 响应式、容器查询 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- Vue 题要把响应式、组件更新、生命周期和工程组织串起来，不要只罗列 API。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「移动端适配、媒体查询与容器查询」时必须明确 移动端适配 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，移动端适配 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

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

Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖；可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token。

### 题目

为什么现代前端常用 CSS Variables 做主题系统，而不是 Sass 变量？

### 答案要点

- Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token
- 深色模式可基于 `:root.dark`、`data-theme` 或 `prefers-color-scheme`

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「CSS Variables、深色模式与设计令牌」时要先定义 CSS 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，CSS 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 CSS 关键链路先收敛再替换。

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

:has() 是“父选择器能力”，可根据后代状态反向选中父元素；:is() 降低选择器重复；:where() 与其类似，但权重为 0；:focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感。

### 题目

说明几个现代 CSS 选择器的价值，并给出一个能真正减少 JS 的场景。

### 答案要点

- `:has()` 是“父选择器能力”，可根据后代状态反向选中父元素
- `:is()` 降低选择器重复；`:where()` 与其类似，但权重为 0
- `:focus-visible` 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感

#### 补充说明

- 面试中不要只停留在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 选择器、现代 CSS 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「:has() 是“父选择器能力”，可根据后代状态反向选中父元素」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「:is() 降低选择器重复；:where() 与其类似，但权重为 0」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」风险偏高；当前方案可验证、可灰度、可回滚。

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

通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint；改 width/height/top/left 更容易触发布局与重绘；will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量。

### 题目

哪些 CSS 动画更容易跑在合成线程？`will-change` 为什么不能乱开？

### 答案要点

- 通常 `transform` 和 `opacity` 更容易只触发 composite，不走 layout/paint
- 改 `width/height/top/left` 更容易触发布局与重绘
- `will-change` 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量
- `transition` 适合状态过渡；`animation` 适合自动播放、关键帧、多阶段动效

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「transition、animation、合成层与性能优化」必须先给 transition 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，transition 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 transition 的计算与缓存路径。

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

隐藏导航、侧栏、浮层、按钮等非内容元素；把背景、阴影、固定定位元素转为适合纸面的排版；避免代码块和长表格被截断，善用 page-break-inside: avoid。

### 题目

给一个知识库网站做 `@media print` 时，应该优先处理哪些问题？

### 答案要点

- 隐藏导航、侧栏、浮层、按钮等非内容元素
- 把背景、阴影、固定定位元素转为适合纸面的排版
- 避免代码块和长表格被截断，善用 `page-break-inside: avoid`
- 链接、时间、章节标题等在纸面上应保留足够语义

#### 补充说明

- 面试中不要只停留在「打印样式与网页内容导出友好性」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 打印、导出 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「打印样式与网页内容导出友好性」时要把 打印样式与网页内容导 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，打印样式与网页内容导 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「打印样式与网页内容导出友好性」里当前按阶段替换更稳。

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

:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack；CSS Nesting：原生嵌套，去掉 Sass / Less 依赖；@layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖。

### 题目

2024 年起浏览器对 `:has()`、CSS Nesting、`@layer`、`color-mix()`、`@scope` 等特性的支持已成熟，它们解决了哪些真实问题？

### 答案要点

- `:has()`：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- CSS Nesting：原生嵌套，去掉 Sass / Less 依赖
- `@layer`：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖
- `color-mix() / oklch()`：基于感知均匀色彩空间做派生色，主题色更自然
- `@scope`：限定样式作用域，避免 BEM 命名冲突，对组件库有用
- `@container`：容器查询，按父元素宽度而不是视口适配，做卡片 / 模块更灵活

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」时要把 现代 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，现代 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」里当前按阶段替换更稳。

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

BEM：传统命名约定，零运行时，跨技术栈通用，但样板多；CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用。

### 题目

不同 CSS 组织方式各自的取舍是什么？大型团队怎么选？

### 答案要点

- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用
- CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成
- Tailwind：原子类，约定统一、不用命名、可复用 design tokens；但 HTML 拥挤、协作要建组件库
- Sass / Less：变量、嵌套、mixin，过去主流；现代 CSS 已逐步替代它们的功能
- 选型建议：design tokens 先定 → 视组件复杂度选实现 → 业务侧统一一种风格

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 CSS 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 CSS，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」按阶段灰度，每阶段可验收可撤回。

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

能用 Flex / Grid 就别用其他——`display: flex; place-items: center` 或 `display: grid; place-items: center` 一句话搞定，剩下 absolute + transform、margin auto 都是辅助。

### 题目

请列出实现"水平 + 垂直居中"的常见方案，并指出各自的限制。

### 答案要点

- **Flex（首选）**：`display: flex; align-items: center; justify-content: center` 或简写 `place-items: center`
- **Grid（一行最简）**：`display: grid; place-items: center`
- **绝对定位 + transform**：`position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`，不知道子元素尺寸时通用
- **绝对定位 + margin auto**：父级 `position: relative`，子级 `position: absolute; inset: 0; margin: auto`，子元素必须有宽高
- **行内元素**：`text-align: center` + `line-height = height`（仅单行文本）
- **table-cell**：兼容老浏览器（IE 时代遗留）

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Grid（一行最简）：display: grid; place-items: center」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「元素水平垂直居中的 N 种姿势」风险偏高；当前方案可验证、可灰度、可回滚。

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

position：`static`（默认）/ `relative`（相对自己原位偏移、保留占位）/ `absolute`（找最近 positioned 父级定位、脱离文档流）/ `fixed`（相对视口）/ `sticky`（滚动到阈值就吸住）。z-index 只在层叠上下文内部比较。

### 题目

请说明 position 5 个值的差别，以及哪些情况会形成新的层叠上下文。

### 答案要点

- `static`：默认值，正常文档流，`top/left` 无效
- `relative`：相对自己原本位置偏移，**仍占据原位**
- `absolute`：脱离文档流，相对最近的非 static 祖先定位
- `fixed`：相对视口；但若祖先有 `transform / filter / will-change`，会变成相对该祖先（常见坑）
- `sticky`：在指定阈值之前是 relative，达到阈值就 fixed
- 层叠上下文（Stacking Context）触发条件：根元素、`position` 非 static + `z-index` 非 auto、`opacity < 1`、`transform/filter/perspective`、`isolation: isolate`、`will-change` 含上述属性
- z-index 的"局部世界"：父级形成层叠上下文后，子元素的 z-index 再大也只在父级内部比较

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「position 五个值的差别和层叠上下文是怎么形成的」时要把 position 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，position 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「position 五个值的差别和层叠上下文是怎么形成的」里当前按阶段替换更稳。

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

**一维**用 Flex（行或列其一），**二维**用 Grid（行列同时控），**报刊式分栏**用 multi-column，**文字环绕图片**才用 Float；现代项目里 Float 几乎只剩"图文混排"一个用途。

### 题目

对比 Flex / Grid / multi-column / Float 的核心定位、典型场景，以及搭配使用的最佳实践。

### 答案要点

- **Flex（一维）**
  - main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
  - 子项可伸缩：`flex: 1 1 200px` = grow shrink basis
  - 典型场景：导航栏、卡片列表、按钮组、垂直居中
  - 不适合：复杂栅格（不能精确控制行列对齐）
- **Grid（二维）**
  - 行列同时定义：`grid-template-columns: repeat(12, 1fr)`
  - 强大的命名区域：`grid-template-areas`
  - 子项可跨行跨列：`grid-column: span 3`
  - 典型场景：整页布局、Dashboard、复杂卡片排列
- **Multi-column**
  - `column-count: 3; column-gap: 20px`
  - 自动把内容流到多栏，像报纸杂志
  - 典型场景：长文章、新闻列表、图片瀑布流（配合 column-fill）
  - 注意：列内顺序是从上到下再到下一列，不能跨越
- **Float**
  - 现代项目几乎不用了；唯一保留场景：**文字环绕图片**
  - 清除浮动：`.clearfix::after { content: ''; display: block; clear: both; }`
- **组合用法**
  - 整页 Grid + 卡片内部 Flex：最常见且合理
  - Flex 嵌套 Flex：注意 main axis 方向不要混乱
  - 不要 Grid 嵌 Grid 嵌 Grid，可读性差

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「子项可伸缩：flex: 1 1 200px = grow shrink basis」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」风险偏高；当前方案可验证、可灰度、可回滚。

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

字体栈 fallback 完整 + font-display: swap 防 FOIT；用相对单位（rem / em）保留用户缩放；行高用无单位（line-height: 1.5）继承友好；中英文混排留空（letter-spacing 或 padding）；变量字体一份文件搞定多字重。

### 题目

怎么做出"舒服又专业"的中文 / 英文混合排版？字体怎么选、加载怎么不闪、阅读怎么不累？

### 答案要点

- **字体栈**
  - 系统字体优先：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`
  - 自托管字体：`@font-face` + `font-display: swap`（FOIT → FOUT，避免空白）
  - 多字重 / 多斜体：用变量字体（`Inter.var.woff2`）一份文件解决
- **字号 / 行高 / 字距**
  - 字号 16px 起步（移动端可 14-15px），不要 < 12px
  - 行高 1.5-1.7（中文需要更大 line-height，英文相对小）
  - letter-spacing 极少调；中英文混排可在中英之间塞 0.05em
  - paragraph 之间用 margin（1em）而不是 `<br>`
- **可读宽度**
  - 一行最佳 60-80 字符（`max-width: 70ch`）
  - 中文每行 35-40 个字
- **可访问**
  - 用相对单位（rem / em），不要 `font-size: 14px` 硬死，否则用户缩放无效
  - 颜色对比度 ≥ 4.5:1（WCAG AA）
  - 标题层级清晰：h1 → h6 不要跳级
- **加载性能**
  - 子集化：只打包实际用到的字符（中文必做，否则 4MB 起步）
  - preload：`<link rel="preload" as="font" type="font/woff2" crossorigin>`
  - font-display: swap：先用 fallback 渲染，字体到了再切；避免闪屏先显示空白
- **现代特性**
  - `font-feature-settings: 'tnum'`：等宽数字，表格/价格用
  - `text-wrap: balance`：标题/段落自动平衡换行
  - `line-clamp` / `-webkit-line-clamp`：多行省略号

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「CSS 字体与排版怎么做才显专业」时要把 CSS 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，CSS 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「CSS 字体与排版怎么做才显专业」里当前按阶段替换更稳。

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

先界定「盒模型、BFC 与格式化上下文的真实作用」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- 机制：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等；BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素
- 落地动作：回答「你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素」时要先定义 你会如何识别 的效果阈值、延迟预算、成本上限和安全红线，四项缺一不可。
- 失败场景：例如成本阈值被击穿，你会如何识别 请求被限流导致体验抖动；应切轻量模型并启用缓存回退。
- 替代方案与取舍：也可全规则化避免幻觉，但覆盖有限；当前采用“模型 + 规则校验 + 人工兜底”。

#### 关键细节（可追问）

- 标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等
- BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素

## view-transitions-api

title: View Transitions API 如何让 SPA / MPA 路由切换更顺滑
difficulty: 进阶
tags: [ViewTransition, 动效, UX]
followups: [view-transitions-api-followup-1, view-transitions-api-followup-2, view-transitions-api-followup-3]

### 一句话

View Transitions API 让浏览器在旧视图和新视图之间截取快照并做过渡动画，适合路由切换、列表到详情和状态切换；关键是渐进增强、命名元素、避免布局抖动和尊重 reduced motion。

### 题目

View Transitions API 的基本机制是什么？在 SPA 和 MPA 中分别怎么接入，哪些场景不适合使用？

### 答案要点

- SPA 中通常用 `document.startViewTransition(() => updateRoute())` 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 `::view-transition-*` 伪元素控制动画。
- MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致。
- 适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入。
- 动画只解决“感知连续性”，不能掩盖慢接口；慢数据仍要有骨架屏、流式渲染或缓存策略。
- 工程上要处理 `prefers-reduced-motion`、浏览器兼容、滚动位置、焦点恢复和转场期间的交互禁用。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」时要把 View 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，View 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里当前按阶段替换更稳。

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

原生 `dialog`、popover 和 top layer 把弹层的层级、焦点、关闭行为交给浏览器处理，anchor positioning 进一步解决“相对触发器定位”的问题；工程价值在于少造轮子，但仍要补兼容和设计系统约束。

### 题目

为什么现代前端开始重新关注原生 `dialog`、popover、top layer 和 anchor positioning？它们相比自研弹层组件有什么优势和限制？

### 答案要点

- top layer 让弹层脱离普通 stacking context，避免 `z-index: 9999` 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI。
- `dialog.showModal()` 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联。
- anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作。
- 限制包括浏览器支持差异、动画控制细节、嵌套弹层策略、设计系统统一 API，以及复杂碰撞避让仍可能需要库辅助。
- 落地时可以先让组件库内部使用原生能力，对外仍保持稳定 Props；不支持时降级到现有定位库。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」风险偏高；当前方案可验证、可灰度、可回滚。

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

先界定「层叠上下文与 z-index 为什么经常“不生效”」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：z-index 只在同一层叠上下文中比较
- 机制：常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate；一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级
- 落地动作：回答「如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「z-index 只在同一层叠上下文中比较」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- z-index 只在同一层叠上下文中比较
- 常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate
- 一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级

## flex-grid-followup-1

title: 追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid

### 一句话

先界定「Flex 与 Grid 的边界和常见坑」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「Flex 更适合一维布局。

### 题目

如果面试官追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flex 更适合一维布局；Grid 更适合二维布局
- 机制：flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0；Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0
- 落地动作：回答「从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- Flex 更适合一维布局；Grid 更适合二维布局
- flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0
- Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0

## responsive-container-query-followup-1

title: 追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「移动端适配、媒体查询与容器查询」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机？

### 答案要点

#### 标准回答（直接作答）

- 结论：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 机制：移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片；@container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形
- 落地动作：回答「结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题只有在 真在项目里落地 的响应式依赖可追踪、组件边界清晰时才成立。
- 失败场景：例如跨组件共享状态无边界，真在项目里落地 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。
- 替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 真在项目里落地 会快速耦合；当前按作用域分层更稳。

#### 关键细节（可追问）

- 媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片
- @container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形

## variables-theme-followup-1

title: 追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「CSS Variables、深色模式与设计令牌」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 机制：可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token；深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme
- 落地动作：回答「以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 CSS 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 CSS，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token
- 深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme

## selector-modern-followup-1

title: 追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern

### 一句话

先界定「:has()、:is()、:where()、:focus-visible 怎么用」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点？

### 答案要点

#### 标准回答（直接作答）

- 结论：:has() 是“父选择器能力”，可根据后代状态反向选中父元素
- 机制：:is() 降低选择器重复；:where() 与其类似，但权重为 0；:focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感
- 落地动作：回答「在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点」时要把 has 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，has 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点」里当前按阶段替换更稳。

#### 关键细节（可追问）

- :has() 是“父选择器能力”，可根据后代状态反向选中父元素
- :is() 降低选择器重复；:where() 与其类似，但权重为 0
- :focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感

## animation-compositor-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「transition、animation、合成层与性能优化」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 机制：改 width/height/top/left 更容易触发布局与重绘；will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量
- 落地动作：回答「从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈」必须先给 从工程落地角度看 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，从工程落地角度看 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 从工程落地角度看 的计算与缓存路径。

#### 关键细节（可追问）

- 通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 改 width/height/top/left 更容易触发布局与重绘
- will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量

## print-css-followup-1

title: 追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css

### 一句话

先界定「打印样式与网页内容导出友好性」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论：隐藏导航、侧栏、浮层、按钮等非内容元素
- 机制：把背景、阴影、固定定位元素转为适合纸面的排版；避免代码块和长表格被截断，善用 page-break-inside: avoid
- 落地动作：回答「面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿」时要把 面对真实流量和复杂依 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，面对真实流量和复杂依 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 隐藏导航、侧栏、浮层、按钮等非内容元素
- 把背景、阴影、固定定位元素转为适合纸面的排版
- 避免代码块和长表格被截断，善用 page-break-inside: avoid

## modern-css-features-followup-1

title: 追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features

### 一句话

先界定「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚。

### 题目

如果面试官追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- 机制：CSS Nesting：原生嵌套，去掉 Sass / Less 依赖；@layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖
- 落地动作：回答「以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「CSS Nesting：原生嵌套，去掉 Sass / Less 依赖」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- :has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- CSS Nesting：原生嵌套，去掉 Sass / Less 依赖
- @layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖

## css-architecture-followup-1

title: 追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- 机制：CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用；CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成
- 落地动作：回答「从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用
- CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成

## center-element-followup-1

title: 追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element

### 一句话

先界定「元素水平垂直居中的 N 种姿势」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- 机制：Grid（一行最简）：display: grid; place-items: center；绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用
- 落地动作：回答「在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工」时要把 元素水平垂直居中的 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，元素水平垂直居中的 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- Grid（一行最简）：display: grid; place-items: center
- 绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用

## position-stacking-followup-1

title: 追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking

### 一句话

先界定「position 五个值的差别和层叠上下文是怎么形成的」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「static：默认值。

### 题目

如果面试官追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：static：默认值，正常文档流，top/left 无效
- 机制：relative：相对自己原本位置偏移，仍占据原位；absolute：脱离文档流，相对最近的非 static 祖先定位
- 落地动作：回答「把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束的定义」时要把 position 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，position 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束的定义」里当前按阶段替换更稳。

#### 关键细节（可追问）

- static：默认值，正常文档流，top/left 无效
- relative：相对自己原本位置偏移，仍占据原位
- absolute：脱离文档流，相对最近的非 static 祖先定位

## css-layout-systems-followup-1

title: 追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems

### 一句话

先界定「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 机制：子项可伸缩：flex: 1 1 200px = grow shrink basis；典型场景：导航栏、卡片列表、按钮组、垂直居中
- 落地动作：回答「你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素」时要把 你会如何识别 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何识别 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素」里当前按阶段替换更稳。

#### 关键细节（可追问）

- main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 子项可伸缩：flex: 1 1 200px = grow shrink basis
- 典型场景：导航栏、卡片列表、按钮组、垂直居中

## css-typography-rhythm-followup-1

title: 追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm

### 一句话

先界定「CSS 字体与排版怎么做才显专业」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑？

### 答案要点

#### 标准回答（直接作答）

- 结论：系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 机制：自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）；多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决
- 落地动作：回答「当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）
- 多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决

## scroll-driven-animations

title: Scroll-driven Animations：scroll-timeline / view-timeline 解决什么
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能]
links: [animation-compositor, 08-performance/inp-deep, view-transitions-api]
followups: [scroll-driven-animations-followup-1, scroll-driven-animations-followup-2, scroll-driven-animations-followup-3]

### 一句话

Scroll-driven Animations 用 CSS 把动画进度绑定到滚动位置或元素进入视口的进度，减少滚动监听、手写 rAF 和布局测量，更适合进度条、视差和进入视口动画这类场景。

### 题目

为什么滚动驱动动画不建议默认用 `scroll` 事件手写？`scroll-timeline` 和 `view-timeline` 分别适合什么场景？

### 答案要点

- 手写 `scroll` 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算。
- `scroll-timeline` 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。
- `view-timeline` 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入。
- 性能收益来自声明式动画和浏览器调度，但不代表所有属性都能上合成线程；优先动画 `transform`、`opacity`，避免让布局属性每帧变化。
- 落地要处理兼容和无障碍：不支持时降级为静态样式或 IntersectionObserver，尊重 `prefers-reduced-motion`。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」必须先给 Scroll-driven 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，Scroll-driven 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 Scroll-driven 的计算与缓存路径。

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

容器尺寸查询解决“组件根据父容器宽度变形”，Style Queries 更进一步让组件根据容器上的样式变量/状态做分支；`@scope` 则把选择器影响范围限制在局部，减少全局样式串扰。

### 题目

现代 CSS 里，尺寸容器查询、Style Queries 和 `@scope` 分别解决什么问题？它们在组件库里怎么配合？

### 答案要点

- 尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点。
- Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式。
- `@scope` 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 `.title` 这类通用类名污染全局。
- 组件库落地时可以把尺寸适配交给 `@container`，把语义状态交给变量，把作用域交给 CSS Modules / Shadow DOM / `@scope` 的组合。
- 边界是兼容性、调试成本和设计约束：状态太复杂时应回到组件 props 或状态机，不要把业务逻辑塞进 CSS。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「CSS Style Queries、@scope 与组件样式边界怎么用」时要把 CSS 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，CSS 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「CSS Style Queries、@scope 与组件样式边界怎么用」里当前按阶段替换更稳。

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

先说判断标准，再说执行路径：回答「盒模型、BFC 与格式化上下文的真实作用」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 盒模型 方案动作 -> 验证结果」，并用「盒模型、BFC 与格式化上下文的真实作用」举一条主链路说明。。

### 题目

如果面试官追问：结合真实业务约束，inline-block 之间的「鬼影空白」如何消除？

### 答案要点

#### 标准回答（直接作答）

- 结论：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- 机制：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等；BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素
- 落地动作：回答「结合真实业务约束，inline-block 之间的「鬼影空白」如何消除」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，inline-block 之间的「鬼影空白」如何消除」时要先定义 inline-block 的效果阈值、延迟预算、成本上限和安全红线，四项缺一不可。
- 失败场景：例如成本阈值被击穿，inline-block 请求被限流导致体验抖动；应切轻量模型并启用缓存回退。
- 替代方案与取舍：也可全规则化避免幻觉，但覆盖有限；当前采用“模型 + 规则校验 + 人工兜底”。

#### 关键细节（可追问）

- 标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等
- BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素

## box-bfc-followup-3

title: 追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗
difficulty: 基础
tags: [盒模型, BFC, 布局, 追问]
parent: box-bfc
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「盒模型、BFC 与格式化上下文的真实作用」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 盒模型 机制 -> 取舍边界」回答，再用「盒模型、BFC 与格式化上下文的真实作用」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗（vs Flex/Grid）？

### 答案要点

#### 标准回答（直接作答）

- 结论：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- 机制：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等；BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素
- 落地动作：回答「在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗」时要先定义 盒模型 的效果阈值、延迟预算、成本上限和安全红线，四项缺一不可。
- 失败场景：例如成本阈值被击穿，盒模型 请求被限流导致体验抖动；应切轻量模型并启用缓存回退。
- 替代方案与取舍：也可全规则化避免幻觉，但覆盖有限；当前采用“模型 + 规则校验 + 人工兜底”。

#### 关键细节（可追问）

- 标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发
- BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等
- BFC 能解决：清除内部浮动、阻止 margin 折叠、避免文字环绕浮动元素

## flex-grid-followup-2

title: 追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Flex 与 Grid 的边界和常见坑」落到真实交付，而不是停在概念层。；讲「Flex 与 Grid 的边界和常见坑」时先给 Flex 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题（Firefox 早就支持，Chrome 117+）？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flex 更适合一维布局；Grid 更适合二维布局
- 机制：flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0；Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0
- 落地动作：回答「在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题」时要把 Flex 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Flex 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Flex 更适合一维布局；Grid 更适合二维布局
- flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0
- Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0

## flex-grid-followup-3

title: 追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Flex 与 Grid 的边界和常见坑」讲成只在理想输入下可用。；围绕「Flex 与 Grid 的边界和常见坑」组织答案时，建议按「约束来源 -> Flex 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flex 更适合一维布局；Grid 更适合二维布局
- 机制：flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0；Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0
- 落地动作：回答「在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Flex 更适合一维布局；Grid 更适合二维布局」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Flex 更适合一维布局；Grid 更适合二维布局
- flex: 1 实际是 1 1 0%，表示可增长、可收缩、基础尺寸为 0
- Flex 子项默认 min-width: auto，会导致长文本撑破布局，所以常要显式写 min-width: 0

## responsive-container-query-followup-2

title: 追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「移动端适配、媒体查询与容器查询」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 响应式 方案动作 -> 验证结果」，并用「移动端适配、媒体查询与容器查询」举一条主链路说明。。

### 题目

如果面试官追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 机制：移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片；@container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形
- 落地动作：回答「结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损」时必须明确 移动端适配 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，移动端适配 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- 媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片
- @container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形

## responsive-container-query-followup-3

title: 追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query
generated: followup-script

### 一句话

规模变大后先重新评估「移动端适配、媒体查询与容器查询」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「移动端适配、媒体查询与容器查询」对应的响应式与组件边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度？

### 答案要点

#### 标准回答（直接作答）

- 结论：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 机制：移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片；@container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形
- 落地动作：回答「从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度」时必须明确 从工程落地角度看 的状态边界、更新时机和副作用释放点，否则答案不可落地。
- 失败场景：例如 watch 链路过深，从工程落地角度看 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。
- 替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。

#### 关键细节（可追问）

- 媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应
- 移动端常见策略：弹性布局、rem、流式栅格、视口单位、响应式图片
- @container 能让卡片在侧栏/主栏复用同一组件时根据父容器宽度自动变形

## variables-theme-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme
generated: followup-script

### 一句话

推动「CSS Variables、深色模式与设计令牌」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「CSS Variables、深色模式与设计令牌」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 机制：可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token；深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme
- 落地动作：回答「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token
- 深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme

## variables-theme-followup-3

title: 追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「CSS Variables、深色模式与设计令牌」在当前约束下为什么成立。；建议按「输入约束 -> 主题 执行链路 -> 结果验证」展开，并结合「CSS Variables、深色模式与设计令牌」给出一条可复核结果。

### 题目

如果面试官追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准？

### 答案要点

#### 标准回答（直接作答）

- 结论：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 机制：可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token；深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme
- 落地动作：回答「在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准」时要先定义 CSS 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，CSS 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 CSS 关键链路先收敛再替换。

#### 关键细节（可追问）

- Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖
- 可以把颜色、圆角、阴影、间距抽成 design tokens，组件只消费 token
- 深色模式可基于 :root.dark、data-theme 或 prefers-color-scheme

## animation-compositor-followup-2

title: 追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「transition、animation、合成层与性能优化」落到真实交付，而不是停在概念层。；可以按「问题背景 -> 动画 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 标准回答（直接作答）

- 结论：通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 机制：改 width/height/top/left 更容易触发布局与重绘；will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量
- 落地动作：回答「在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 transition 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，transition 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益」采用小步优化更稳。

#### 关键细节（可追问）

- 通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 改 width/height/top/left 更容易触发布局与重绘
- will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量

## animation-compositor-followup-3

title: 追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「transition、animation、合成层与性能优化」讲成只在理想输入下可用。；建议按「输入约束 -> 动画 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 标准回答（直接作答）

- 结论：通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 机制：改 width/height/top/left 更容易触发布局与重绘；will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量
- 落地动作：回答「从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本」必须先给 从工程落地角度看 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，从工程落地角度看 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 从工程落地角度看 的计算与缓存路径。

#### 关键细节（可追问）

- 通常 transform 和 opacity 更容易只触发 composite，不走 layout/paint
- 改 width/height/top/left 更容易触发布局与重绘
- will-change 是提前向浏览器申请优化资源，滥用会增加内存和合成层数量

## css-architecture-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 架构方案 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- 机制：CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用；CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成
- 落地动作：回答「从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用
- CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成

## css-architecture-followup-3

title: 追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」落到真实交付，而不是停在概念层。；可以按「问题背景 -> 架构方案 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- 机制：CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用；CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成
- 落地动作：回答「从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多
- CSS Modules：构建期局部作用域，类名 hash，配合 Vue/React 都好用
- CSS-in-JS（styled-components / Emotion / vanilla-extract）：JS 表达力强、动态主题方便；运行时方案有性能开销，零运行时方案（vanilla-extract）需要构建集成

## view-transitions-api-followup-1

title: 追问：View Transitions 和普通 CSS transition / animation 的区别是什么
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> ViewTransition 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：View Transitions 和普通 CSS transition / animation 的区别是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画
- 机制：MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致；适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入
- 落地动作：回答「View Transitions 和普通 CSS transition / animation 的区别的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「View Transitions 和普通 CSS transition / animation 的区别的定义」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画
- MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致
- 适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入

## view-transitions-api-followup-2

title: 追问：列表到详情的共享元素动画如何避免闪烁和布局跳变
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」时要能同时解释收益、代价和失败信号。。

### 题目

如果面试官追问：列表到详情的共享元素动画如何避免闪烁和布局跳变？

### 答案要点

#### 标准回答（直接作答）

- 结论：SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画
- 机制：MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致；适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入
- 落地动作：回答「列表到详情的共享元素动画如何避免闪烁和布局跳变」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「列表到详情的共享元素动画如何避免闪烁和布局跳变」时要把 列表到详情的共享元素 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，列表到详情的共享元素 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「列表到详情的共享元素动画如何避免闪烁和布局跳变」里当前按阶段替换更稳。

#### 关键细节（可追问）

- SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画
- MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致
- 适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入

## view-transitions-api-followup-3

title: 追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」落到真实交付，而不是停在概念层。；可以按「问题背景 -> ViewTransition 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级？

### 答案要点

#### 标准回答（直接作答）

- 结论：SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画
- 机制：MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致；适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入
- 落地动作：回答「结合真实业务约束，你会如何为不支持该 API 的浏览器做降级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，你会如何为不支持该 API 的浏览器做降级」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- SPA 中通常用 document.startViewTransition(() => updateRoute()) 包住状态或路由更新，浏览器捕获更新前后的视图快照，再通过 ::view-transition-\* 伪元素控制动画
- MPA 中依赖浏览器跨文档 View Transition 支持，页面需要同源、开启对应声明，并保证新旧页面的共享元素命名一致
- 适合视觉连续性强的跳转：卡片到详情、图片预览、tab 切换、列表排序；不适合数据大量变化、布局差异巨大或需要立即反馈的高频输入

## native-popover-dialog-anchor-followup-1

title: 追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」落到真实交付，而不是停在概念层。。

### 题目

如果面试官追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题？

### 答案要点

#### 标准回答（直接作答）

- 结论：top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI
- 机制：dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联；anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作
- 落地动作：回答「在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题」时要把 top 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，top 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题」里当前按阶段替换更稳。

#### 关键细节（可追问）

- top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI
- dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联
- anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作

## native-popover-dialog-anchor-followup-2

title: 追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」讲成只在理想输入下可用。。

### 题目

如果面试官追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别？

### 答案要点

#### 标准回答（直接作答）

- 结论：top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI
- 机制：dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联；anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作
- 落地动作：回答「结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI
- dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联
- anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作

## native-popover-dialog-anchor-followup-3

title: 追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」在当前约束下为什么成立。；建议按「输入约束 -> Popover 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里？

### 答案要点

#### 标准回答（直接作答）

- 结论：top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI
- 机制：dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联；anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作
- 落地动作：回答「结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- top layer 让弹层脱离普通 stacking context，避免 z-index: 9999 互相压制，适合 modal、popover、select list、tooltip 这类需要浮在页面最上层的 UI
- dialog.showModal() 提供模态语义、背景 inert、Esc 关闭和焦点约束；popover 更适合轻量非模态浮层，可通过触发器属性建立关联
- anchor positioning 用 CSS 表达“浮层相对哪个锚点定位”，减少 JS 测量、滚动监听和 resize 计算，适合菜单、气泡卡片、上下文操作

## scroll-driven-animations-followup-1

title: 追问：结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」时要能同时解释收益、代价和失败信号。。

### 题目

如果面试官追问：结合真实业务约束，`scroll-timeline` 和 `view-timeline` 的触发对象有什么不同？

### 答案要点

#### 标准回答（直接作答）

- 结论：手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算
- 机制：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景；view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入
- 落地动作：回答「结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 scroll-timeline 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，scroll-timeline 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同」采用小步优化更稳。

#### 关键细节（可追问）

- 手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算
- scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景
- view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入

## scroll-driven-animations-followup-2

title: 追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」落到真实交付，而不是停在概念层。。

### 题目

如果面试官追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免？

### 答案要点

#### 标准回答（直接作答）

- 结论：手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算
- 机制：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景；view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入
- 落地动作：回答「结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免」必须先给 哪些动画属性适合滚动 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，哪些动画属性适合滚动 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 哪些动画属性适合滚动 的计算与缓存路径。

#### 关键细节（可追问）

- 手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算
- scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景
- view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入

## scroll-driven-animations-followup-3

title: 追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」落到真实交付，而不是停在概念层。。

### 题目

如果面试官追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级？

### 答案要点

#### 标准回答（直接作答）

- 结论：手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算
- 机制：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景；view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入
- 落地动作：回答「在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级」必须先给 Scroll-driven 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，Scroll-driven 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 Scroll-driven 的计算与缓存路径。

#### 关键细节（可追问）

- 手写 scroll 监听容易高频触发、读写布局混杂、造成主线程压力；即使用 rAF 节流，也要自己处理边界、方向和进度计算
- scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景
- view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入

## css-style-queries-and-scope-followup-1

title: 追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「CSS Style Queries、@scope 与组件样式边界怎么用」在当前约束下为什么成立。；回答结构可按「触发条件 -> CSS 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询？

### 答案要点

#### 标准回答（直接作答）

- 结论：尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点
- 机制：Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式；@scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局
- 落地动作：回答「以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询」时要把 CSS 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，CSS 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点
- Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式
- @scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局

## css-style-queries-and-scope-followup-2

title: 追问：Style Queries 和 CSS Variables 的关系是什么
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「CSS Style Queries、@scope 与组件样式边界怎么用」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> CSS 方案动作 -> 验证结果」。

### 题目

如果面试官追问：Style Queries 和 CSS Variables 的关系是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点
- 机制：Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式；@scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局
- 落地动作：回答「Style Queries 和 CSS Variables 的关系的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Style Queries 和 CSS Variables 的关系的定义」时要把 Style 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Style 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Style Queries 和 CSS Variables 的关系的定义」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点
- Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式
- @scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局

## css-style-queries-and-scope-followup-3

title: 追问：从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「CSS Style Queries、@scope 与组件样式边界怎么用」在当前约束下为什么成立。；建议按「输入约束 -> CSS 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，`@scope`、CSS Modules、Shadow DOM 在样式隔离上各有什么边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点
- 机制：Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式；@scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局
- 落地动作：回答「从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 尺寸容器查询关注容器尺寸，例如卡片在窄容器里单列、宽容器里双列，不再只依赖 viewport 断点
- Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式
- @scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局

## stacking-context-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「层叠上下文与 z-index 为什么经常“不生效”」时要能同时解释收益、代价和失败信号。；讲「层叠上下文与 z-index 为什么经常“不生效”」时先给 z-index 的判断口径，再补执行动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：z-index 只在同一层叠上下文中比较
- 机制：常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate；一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级
- 落地动作：回答「从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标」要明确 从工程落地角度看 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 从工程落地角度看 的高风险边界。

#### 关键细节（可追问）

- z-index 只在同一层叠上下文中比较
- 常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate
- 一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级

## stacking-context-followup-3

title: 追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context
generated: followup-script

### 一句话

规模变大后先重新评估「层叠上下文与 z-index 为什么经常“不生效”」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「层叠上下文与 z-index 为什么经常“不生效”」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：z-index 只在同一层叠上下文中比较
- 机制：常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate；一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级
- 落地动作：回答「以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「z-index 只在同一层叠上下文中比较」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- z-index 只在同一层叠上下文中比较
- 常见创建条件：定位元素且有 z-index、opacity < 1、transform、filter、will-change、isolation: isolate
- 一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级

## selector-modern-followup-2

title: 追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「:has、:is、:where、:focus-visible 怎么用」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 选择器 方案动作 -> 验证结果」。

### 题目

如果面试官追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：:has() 是“父选择器能力”，可根据后代状态反向选中父元素
- 机制：:is() 降低选择器重复；:where() 与其类似，但权重为 0；:focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感
- 落地动作：回答「以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证」要明确 has 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 has 的高风险边界。

#### 关键细节（可追问）

- :has() 是“父选择器能力”，可根据后代状态反向选中父元素
- :is() 降低选择器重复；:where() 与其类似，但权重为 0
- :focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感

## selector-modern-followup-3

title: 追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern
generated: followup-script

### 一句话

规模变大后先重新评估「:has()、:is()、:where()、:focus-visible 怎么用」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：:has() 是“父选择器能力”，可根据后代状态反向选中父元素
- 机制：:is() 降低选择器重复；:where() 与其类似，但权重为 0；:focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感
- 落地动作：回答「在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「:has() 是“父选择器能力”，可根据后代状态反向选中父元素」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「:is() 降低选择器重复；:where() 与其类似，但权重为 0」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- :has() 是“父选择器能力”，可根据后代状态反向选中父元素
- :is() 降低选择器重复；:where() 与其类似，但权重为 0
- :focus-visible 只在键盘导航等真正需要时显示 focus ring，兼顾可访问性与观感

## print-css-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「打印样式与网页内容导出友好性」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 打印 方案动作 -> 验证结果」，并用「打印样式与网页内容导出友好性」举一条主链路说明。。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：隐藏导航、侧栏、浮层、按钮等非内容元素
- 机制：把背景、阴影、固定定位元素转为适合纸面的排版；避免代码块和长表格被截断，善用 page-break-inside: avoid
- 落地动作：回答「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了避免主观判断 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了避免主观判断 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 隐藏导航、侧栏、浮层、按钮等非内容元素
- 把背景、阴影、固定定位元素转为适合纸面的排版
- 避免代码块和长表格被截断，善用 page-break-inside: avoid

## print-css-followup-3

title: 追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css
generated: followup-script

### 一句话

规模变大后先重新评估「打印样式与网页内容导出友好性」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「打印样式与网页内容导出友好性」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：隐藏导航、侧栏、浮层、按钮等非内容元素
- 机制：把背景、阴影、固定定位元素转为适合纸面的排版；避免代码块和长表格被截断，善用 page-break-inside: avoid
- 落地动作：回答「从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 隐藏导航、侧栏、浮层、按钮等非内容元素
- 把背景、阴影、固定定位元素转为适合纸面的排版
- 避免代码块和长表格被截断，善用 page-break-inside: avoid

## modern-css-features-followup-2

title: 追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」在当前约束下为什么成立。。

### 题目

如果面试官追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- 机制：CSS Nesting：原生嵌套，去掉 Sass / Less 依赖；@layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖
- 落地动作：回答「如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 现代 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，现代 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- :has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- CSS Nesting：原生嵌套，去掉 Sass / Less 依赖
- @layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖

## modern-css-features-followup-3

title: 追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」讲成只在理想输入下可用。。

### 题目

如果面试官追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- 机制：CSS Nesting：原生嵌套，去掉 Sass / Less 依赖；@layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖
- 落地动作：回答「在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来」时要把 现代 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，现代 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来」里当前按阶段替换更稳。

#### 关键细节（可追问）

- :has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack
- CSS Nesting：原生嵌套，去掉 Sass / Less 依赖
- @layer：层叠层，让设计系统、组件库、业务 CSS 优先级可控、可覆盖

## center-element-followup-2

title: 追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「元素水平垂直居中的 N 种姿势」讲成只在理想输入下可用。；建议按「输入约束 -> 布局 执行链路 -> 结果验证」展开，并结合「元素水平垂直居中的 N 种姿势」给出一条可复核结果。

### 题目

如果面试官追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- 机制：Grid（一行最简）：display: grid; place-items: center；绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用
- 落地动作：回答「在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Grid（一行最简）：display: grid; place-items: center」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- Grid（一行最简）：display: grid; place-items: center
- 绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用

## center-element-followup-3

title: 追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element
generated: followup-script

### 一句话

规模变大后先重新评估「元素水平垂直居中的 N 种姿势」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「元素水平垂直居中的 N 种姿势」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节？

### 答案要点

#### 标准回答（直接作答）

- 结论：Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- 机制：Grid（一行最简）：display: grid; place-items: center；绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用
- 落地动作：回答「当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节」时要把 当约束变化导致成本上 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，当约束变化导致成本上 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center
- Grid（一行最简）：display: grid; place-items: center
- 绝对定位 + transform：position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)，不知道子元素尺寸时通用

## position-stacking-followup-2

title: 追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「position 五个值的差别和层叠上下文是怎么形成的」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 定位 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：static：默认值，正常文档流，top/left 无效
- 机制：relative：相对自己原本位置偏移，仍占据原位；absolute：脱离文档流，相对最近的非 static 祖先定位
- 落地动作：回答「在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「static：默认值，正常文档流，top/left 无效」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「relative：相对自己原本位置偏移，仍占据原位」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- static：默认值，正常文档流，top/left 无效
- relative：相对自己原本位置偏移，仍占据原位
- absolute：脱离文档流，相对最近的非 static 祖先定位

## position-stacking-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「position 五个值的差别和层叠上下文是怎么形成的」讲成只在理想输入下可用。；建议按「输入约束 -> 定位 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：static：默认值，正常文档流，top/left 无效
- 机制：relative：相对自己原本位置偏移，仍占据原位；absolute：脱离文档流，相对最近的非 static 祖先定位
- 落地动作：回答「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「static：默认值，正常文档流，top/left 无效」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「relative：相对自己原本位置偏移，仍占据原位」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- static：默认值，正常文档流，top/left 无效
- relative：相对自己原本位置偏移，仍占据原位
- absolute：脱离文档流，相对最近的非 static 祖先定位

## css-layout-systems-followup-2

title: 追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 机制：子项可伸缩：flex: 1 1 200px = grow shrink basis；典型场景：导航栏、卡片列表、按钮组、垂直居中
- 落地动作：回答「以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立」时要把 一道题讲清 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，一道题讲清 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 子项可伸缩：flex: 1 1 200px = grow shrink basis
- 典型场景：导航栏、卡片列表、按钮组、垂直居中

## css-layout-systems-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems
generated: followup-script

### 一句话

规模变大后先重新评估「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 机制：子项可伸缩：flex: 1 1 200px = grow shrink basis；典型场景：导航栏、卡片列表、按钮组、垂直居中
- 落地动作：回答「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）
- 子项可伸缩：flex: 1 1 200px = grow shrink basis
- 典型场景：导航栏、卡片列表、按钮组、垂直居中

## css-typography-rhythm-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「CSS 字体与排版怎么做才显专业」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> CSS 机制 -> 取舍边界」回答，再用「CSS 字体与排版怎么做才显专业」补一个反例，避免停在口号层。。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 机制：自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）；多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决
- 落地动作：回答「在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）
- 多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决

## css-typography-rhythm-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「CSS 字体与排版怎么做才显专业」讲成只在理想输入下可用。；回答结构可按「触发条件 -> CSS 机制 -> 风险兜底」展开，并以「CSS 字体与排版怎么做才显专业」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 机制：自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）；多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决
- 落地动作：回答「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif
- 自托管字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）
- 多字重 / 多斜体：用变量字体（Inter.var.woff2）一份文件解决

## css-render-path-budget-gate

title: CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径]
followups: [css-render-path-budget-gate-followup-1, css-render-path-budget-gate-followup-2, css-render-path-budget-gate-followup-3]

### 一句话

样式性能优化不能停在“感觉更快”：把关键 CSS 体积、阻塞资源和渲染时延设成可执行预算，才能在持续发布中避免样式链路悄悄劣化。

### 题目

你会如何给 CSS 渲染路径建立性能预算，并把预算接入发布流程，确保样式迭代不拖慢首屏和交互？

### 答案要点

- 先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。
- 预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置。
- 构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批。
- 结合真实用户指标复核：只看 Lighthouse 不够，要看线上分位数据与设备分层。
- 出现回退时可快速止损：保留旧样式包路径与开关，支持分钟级回滚。
- 周期复盘预算有效性：避免阈值过松失去约束，或过紧拖慢业务交付。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 CSS 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，CSS 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」采用小步优化更稳。

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

CSS 改动看似局部，常常全局连锁：通过影响面评估、重点页面回归与分阶段放量，才能避免“改一处样式，炸一片页面”。

### 题目

当你要上线一次影响基础样式系统的改动（如 tokens、reset、组件基类），如何设计安全护栏让风险可控？

### 答案要点

- 先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流。
- 变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯。
- 发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容。
- 异常判据要量化：布局破版率、关键交互失败率、样式报错与用户投诉趋势。
- 回滚路径要提前验证：样式包版本切回、feature flag 关闭、缓存刷新策略同步准备。
- 变更后做闭环复盘：记录误伤范围、定位效率和修复耗时，持续优化样式治理流程。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」时要先确认 样式改动安全护栏 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，样式改动安全护栏 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 样式改动安全护栏 链路分层收口再逐步统一。

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

先说判断标准，再说执行路径：回答「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> CSS 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标
- 机制：预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置；构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批
- 落地动作：回答「你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束」必须先给 你会如何识别 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会如何识别 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会如何识别 的计算与缓存路径。

#### 关键细节（可追问）

- 先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标
- 预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置
- 构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批

## css-render-path-budget-gate-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」讲成只在理想输入下可用。；围绕「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」组织答案时。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标
- 机制：预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置；构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批
- 落地动作：回答「从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标」必须先给 从工程落地角度看 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，从工程落地角度看 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 从工程落地角度看 的计算与缓存路径。

#### 关键细节（可追问）

- 先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标
- 预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置
- 构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批

## css-render-path-budget-gate-followup-3

title: 追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」讲成只在理想输入下可用。；围绕「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」组织答案时。

### 题目

如果面试官追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标
- 机制：预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置；构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批
- 落地动作：回答「以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来」必须先给 CSS 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，CSS 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 CSS 的计算与缓存路径。

#### 关键细节（可追问）

- 先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标
- 预算要分场景：营销页、后台页、组件库文档页的阈值应分开配置
- 构建阶段自动守门：超过预算直接阻断或至少触发强提醒与审批

## css-change-safety-guardrail-followup-1

title: 追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」不是只在理想输入下成立。。

### 题目

如果面试官追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流
- 机制：变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯；发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容
- 落地动作：回答「在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理」时要先确认 样式改动安全护栏 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，样式改动安全护栏 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 样式改动安全护栏 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流
- 变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯
- 发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容

## css-change-safety-guardrail-followup-2

title: 追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」在当前约束下为什么成立。；建议按「输入约束 -> CSS 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流
- 机制：变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯；发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容
- 落地动作：回答「以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 样式改动安全护栏 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，样式改动安全护栏 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流
- 变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯
- 发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容

## css-change-safety-guardrail-followup-3

title: 追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」不是只在理想输入下成立。。

### 题目

如果面试官追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流
- 机制：变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯；发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容
- 落地动作：回答「面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界」时要先确认 面对安全与体验拉扯时 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，面对安全与体验拉扯时 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 面对安全与体验拉扯时 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先做影响面分层：基础组件、核心页面、低频页面分组验证，优先保护关键业务流
- 变更前建立对照基线：关键页面截图、交互录屏与核心样式快照确保可回溯
- 发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容
