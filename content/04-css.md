---
id: 04-css
title: CSS 进阶
order: 4
icon: 🎨
description: 盒模型、布局、层叠、动画、响应式、现代 CSS 与打印样式。
---

## box-bfc

title: 盒模型、BFC 与格式化上下文的真实作用
followups: [box-bfc-followup-1]
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
followups: [stacking-context-followup-1]
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
followups: [flex-grid-followup-1]
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
followups: [responsive-container-query-followup-1]
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
- 只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。
- 把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。
- 相关标签是 响应式、容器查询，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 容器查询通常比“写很多全局断点”更利于组件复用
- 移动端 1px 问题可用 `transform: scale(.5)`、高 DPR 边框图或直接接受物理像素差异

## variables-theme

title: CSS Variables、深色模式与设计令牌
followups: [variables-theme-followup-1]
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
followups: [selector-modern-followup-1]
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
followups: [animation-compositor-followup-1]
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
followups: [print-css-followup-1]
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
followups: [modern-css-features-followup-1]
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
followups: [css-architecture-followup-1]
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
followups: [center-element-followup-1]
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
followups: [position-stacking-followup-1]
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
followups: [css-layout-systems-followup-1]
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
followups: [css-typography-rhythm-followup-1]
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

title: 追问：「盒模型、BFC 与格式化上下文的真实作用」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [盒模型, BFC, 布局, 追问]
parent: box-bfc

### 题目

如果面试官追问：「盒模型、BFC 与格式化上下文的真实作用」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「盒模型、BFC 与格式化上下文的真实作用」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发」要进一步补到边界条件里，而不是只复述结论。

## view-transitions-api

title: View Transitions API 如何让 SPA / MPA 路由切换更顺滑
difficulty: 进阶
tags: [ViewTransition, 动效, UX]

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

title: 追问：「层叠上下文与 z-index 为什么经常“不生效”」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context

### 题目

如果面试官追问：「层叠上下文与 z-index 为什么经常“不生效”」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「层叠上下文与 z-index 为什么经常“不生效”」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「z-index 只在同一层叠上下文中比较」要进一步补到边界条件里，而不是只复述结论。

## flex-grid-followup-1

title: 追问：「Flex 与 Grid 的边界和常见坑」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid

### 题目

如果面试官追问：「Flex 与 Grid 的边界和常见坑」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Flex 与 Grid 的边界和常见坑」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Flex 更适合一维布局；Grid 更适合二维布局」要进一步补到边界条件里，而不是只复述结论。

## responsive-container-query-followup-1

title: 追问：在 Vue 项目里落地「移动端适配、媒体查询与容器查询」时，响应式边界和组件更新时机要注意什么
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query

### 题目

如果面试官追问：在 Vue 项目里落地「移动端适配、媒体查询与容器查询」时，响应式边界和组件更新时机要注意什么？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「移动端适配、媒体查询与容器查询」拆成可验证的小步骤，逐步替换高风险部分。

## variables-theme-followup-1

title: 追问：推动「CSS Variables、深色模式与设计令牌」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme

### 题目

如果面试官追问：推动「CSS Variables、深色模式与设计令牌」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「CSS Variables、深色模式与设计令牌」拆成可验证的小步骤，逐步替换高风险部分。

## selector-modern-followup-1

title: 追问：「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern

### 题目

如果面试官追问：「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「:has() 是“父选择器能力”，可根据后代状态反向选中父元素」要进一步补到边界条件里，而不是只复述结论。

## animation-compositor-followup-1

title: 追问：你会先看哪些指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor

### 题目

如果面试官追问：你会先看哪些指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「transition、animation、合成层与性能优化」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## print-css-followup-1

title: 追问：「打印样式与网页内容导出友好性」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css

### 题目

如果面试官追问：「打印样式与网页内容导出友好性」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「打印样式与网页内容导出友好性」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「隐藏导航、侧栏、浮层、按钮等非内容元素」要进一步补到边界条件里，而不是只复述结论。

## modern-css-features-followup-1

title: 追问：「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features

### 题目

如果面试官追问：「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack」要进一步补到边界条件里，而不是只复述结论。

## css-architecture-followup-1

title: 追问：推动「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture

### 题目

如果面试官追问：推动「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」拆成可验证的小步骤，逐步替换高风险部分。

## center-element-followup-1

title: 追问：「元素水平垂直居中的 N 种姿势」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element

### 题目

如果面试官追问：「元素水平垂直居中的 N 种姿势」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「元素水平垂直居中的 N 种姿势」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Flex（首选）：display: flex; align-items: center; justify-content: center 或简写 place-items: center」要进一步补到边界条件里，而不是只复述结论。

## position-stacking-followup-1

title: 追问：「position 五个值的差别和层叠上下文是怎么形成的」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking

### 题目

如果面试官追问：「position 五个值的差别和层叠上下文是怎么形成的」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「position 五个值的差别和层叠上下文是怎么形成的」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「static：默认值，正常文档流，top/left 无效」要进一步补到边界条件里，而不是只复述结论。

## css-layout-systems-followup-1

title: 追问：「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems

### 题目

如果面试官追问：「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「main axis 控对齐（justify-content）+ cross axis 控对齐（align-items）」要进一步补到边界条件里，而不是只复述结论。

## css-typography-rhythm-followup-1

title: 追问：「CSS 字体与排版怎么做才显专业」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm

### 题目

如果面试官追问：「CSS 字体与排版怎么做才显专业」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「CSS 字体与排版怎么做才显专业」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「系统字体优先：-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif」要进一步补到边界条件里，而不是只复述结论。

## scroll-driven-animations

title: Scroll-driven Animations：scroll-timeline / view-timeline 解决什么
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能]
links: [animation-compositor, 08-performance/inp-deep, view-transitions-api]

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
