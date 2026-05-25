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

#### 工程化补充

- 场景前提：讨论 移动端适配、媒体查询与容器查询 时要交代响应式依赖怎么收集、何时触发更新、如何清理副作用。
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

#### 工程化补充

- 场景前提：回答 `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用 时先锁定 选择器 的边界条件，避免把经验结论当成通用规则。
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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「盒模型、BFC 与格式化上下文的真实作用」在生产环境中最容易失效的 盒模型 边界因素？

### 答案要点

#### 直答

- 结论：「盒模型、BFC 与格式化上下文的真实作用」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：先明确 盒模型 BFC 与格式化上下文的真实作用 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- BFC：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等。
- 盒模型：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发。
- 布局：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等。

#### 风险与验收

- 主要风险：盒模型 BFC 与格式化上下文的真实作用 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 盒模型 BFC 与格式化上下文的真实作用 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「层叠上下文与 z-index 为什么经常“不生效”」稳定上线，你会优先补齐哪些与 z-index 相关的检查项？

### 答案要点

#### 直答

- 结论：「层叠上下文与 z-index 为什么经常“不生效”」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：层叠上下文 与 z-index 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- z-index：z-index 只在同一层叠上下文中比较。
- 层叠：z-index 只在同一层叠上下文中比较。

#### 风险与验收

- 主要风险：围绕 层叠上下文 与 z-index 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 层叠上下文 与 z-index 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## flex-grid-followup-1

title: 追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「Flex 与 Grid 的边界和常见坑」跨团队落地时，你会先确认哪些 Flex 前置假设，避免后续返工？

### 答案要点

#### 直答

- 结论：先把 Flex 与 Grid 的边界和常见坑 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 Flex 与 Grid 的边界和常见坑 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Flex：Flex 更适合一维布局；Grid 更适合二维布局。
- Grid：Flex 更适合一维布局；Grid 更适合二维布局。

#### 风险与验收

- 主要风险：在「Flex 与 Grid 的边界和常见坑」里，Flex 与 Grid 的边界和常见坑 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Flex 与 Grid 的边界和常见坑 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## responsive-container-query-followup-1

title: 追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真在项目里落地「移动端适配、媒体查询与容器查询」时，你会如何划分 响应式 并控制更新时机？

### 答案要点

#### 直答

- 结论：先拆分 移动端适配 媒体查询与容器查询 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 移动端适配 媒体查询与容器查询 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 响应式：弹性布局、rem、流式栅格、视口单位、响应式图片。
- 容器查询：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应。

#### 风险与验收

- 主要风险：在「移动端适配、媒体查询与容器查询」场景下，移动端适配 媒体查询与容器查询 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「移动端适配、媒体查询与容器查询」里，验收 移动端适配 媒体查询与容器查询 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## variables-theme-followup-1

title: 追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CSS Variables、深色模式与设计令牌」为例，真要把「CSS Variables、深色模式与设计令牌」推到线上，你会如何围绕 主题 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「CSS Variables、深色模式与设计令牌」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：CSS Variables 深色模式与设计令牌 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- CSS Variables：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖。
- 主题：围绕「CSS Variables、深色模式与设计令牌」里的 主题 推进上线时，要明确每个批次的放量门槛和回退条件。
- 变量：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖。

#### 风险与验收

- 主要风险：CSS Variables 深色模式与设计令牌 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 CSS Variables 深色模式与设计令牌 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## selector-modern-followup-1

title: 追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」进入长周期维护后，你会重点巡检哪些高风险边界点？

### 答案要点

#### 直答

- 结论：has 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先识别 has 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- :has()：:has() 是“父选择器能力”，可根据后代状态反向选中父元素。
- has：:has() 是“父选择器能力”，可根据后代状态反向选中父元素。
- :is()：:is() 降低选择器重复；:where() 与其类似，但权重为 0。

#### 风险与验收

- 主要风险：若 has 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 has 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## animation-compositor-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 动画 相关的指标来判断「transition、animation、合成层与性能优化」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 transition 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 transition 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- transition：transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效。
- animation：transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效。
- 动画：围绕「transition、animation、合成层与性能优化」里的 动画 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 transition 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：transition 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## print-css-followup-1

title: 追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「打印样式与网页内容导出友好性」最可能被哪些 打印 边界条件击穿？

### 答案要点

#### 直答

- 结论：先列「打印样式与网页内容导出友好性」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先演练 打印样式与网页内容导出友好性 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 打印：围绕「打印样式与网页内容导出友好性」里的 打印 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 导出：在「打印样式与网页内容导出友好性」里，导出 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 打印样式与网页内容导出友好性 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 打印样式与网页内容导出友好性 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## modern-css-features-followup-1

title: 追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」为例，面对真实流量和复杂依赖时，「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最可能被哪些 现代 CSS 边界条件击穿？

### 答案要点

#### 直答

- 结论：先列「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先识别 现代 CSS 必备特性 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- CSS：原生嵌套，去掉 Sass / Less 依赖。
- has：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack。
- nesting：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」里，nesting 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 现代 CSS 必备特性 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 现代 CSS 必备特性 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## css-architecture-followup-1

title: 追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，真要把「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：围绕 CSS 架构方案 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- CSS：构建期局部作用域，类名 hash，配合 Vue/React 都好用。
- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多。
- CSS-in-JS：CSS-in-JS 是「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 CSS 架构方案 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 CSS 架构方案 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## center-element-followup-1

title: 追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「元素水平垂直居中的 N 种姿势」场景下，当「元素水平垂直居中的 N 种姿势」跨团队落地时，你会先确认哪些 布局 前置假设，避免后续返工？

### 答案要点

#### 直答

- 结论：先锁定 元素水平垂直居中的 N 种姿势 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 元素水平垂直居中的 N 种姿势 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 布局：围绕「元素水平垂直居中的 N 种姿势」里的 布局 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 居中：在「元素水平垂直居中的 N 种姿势」这题里，居中 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：元素水平垂直居中的 N 种姿势 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「元素水平垂直居中的 N 种姿势」里，验收 元素水平垂直居中的 N 种姿势 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## position-stacking-followup-1

title: 追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：把「position 五个值的差别和层叠上下文是怎么形成的」放到真实业务里，围绕 定位 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：回答 position 五个值 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先演练 position 五个值 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- position：在「position 五个值的差别和层叠上下文是怎么形成的」里，position 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 定位：脱离文档流，相对最近的非 static 祖先定位。
- 层叠：围绕「position 五个值的差别和层叠上下文是怎么形成的」里的 层叠 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 position 五个值 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：position 五个值 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## css-layout-systems-followup-1

title: 追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在生产环境中最容易失效的边界因素？

### 答案要点

#### 直答

- 结论：先列「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先明确 一道题讲清 Flex 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Flex：Flex 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Grid：Grid 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Float：Float 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」场景下，一道题讲清 Flex 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里，验收 一道题讲清 Flex 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## css-typography-rhythm-followup-1

title: 追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「CSS 字体与排版怎么做才显专业」进入复杂场景后，你会先验证哪些 CSS 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 结论：把 字体 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 字体 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- CSS：CSS 是「CSS 字体与排版怎么做才显专业」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）。
- 排版：在「CSS 字体与排版怎么做才显专业」里，排版 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：字体 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「CSS 字体与排版怎么做才显专业」里，字体 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，inline-block 之间的「鬼影空白」如何消除？

### 答案要点

#### 直答

- 结论：把 鬼影空白 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：把「盒模型、BFC 与格式化上下文的真实作用」里的 鬼影空白 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 鬼影空白：在「盒模型、BFC 与格式化上下文的真实作用」这道追问里，鬼影空白 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 盒模型：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发。
- BFC：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等。

#### 风险与验收

- 主要风险：在「盒模型、BFC 与格式化上下文的真实作用」里，鬼影空白 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：鬼影空白 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## box-bfc-followup-3

title: 追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗
difficulty: 基础
tags: [盒模型, BFC, 布局, 追问]
parent: box-bfc
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「盒模型、BFC 与格式化上下文的真实作用」场景下，圣杯布局 / 双飞翼布局现在还有意义吗（vs Flex/Grid）？

### 答案要点

#### 直答

- 结论：先拆分 盒模型 BFC 与格式化上下文的真实作用 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 盒模型 BFC 与格式化上下文的真实作用 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- BFC：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等。
- 盒模型：标准盒模型下 width/height 只算 content；border-box 把 padding/border 算进尺寸，更适合组件化开发。
- 布局：BFC 是独立布局上下文，常见触发：overflow 非 visible、display: flow-root、浮动、绝对定位等。

#### 风险与验收

- 主要风险：盒模型 BFC 与格式化上下文的真实作用 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「盒模型、BFC 与格式化上下文的真实作用」里，盒模型 BFC 与格式化上下文的真实作用 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## flex-grid-followup-2

title: 追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Flex 与 Grid 的边界和常见坑」场景下，subgrid 解决了什么问题（Firefox 早就支持，Chrome 117+）？

### 答案要点

#### 直答

- 结论：先锁定 Flex 与 Grid 的边界和常见坑 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 Flex 与 Grid 的边界和常见坑 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Flex：Flex 更适合一维布局；Grid 更适合二维布局。
- Grid：Flex 更适合一维布局；Grid 更适合二维布局。
- subgrid：围绕「Flex 与 Grid 的边界和常见坑」里的 subgrid 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「Flex 与 Grid 的边界和常见坑」场景下，Flex 与 Grid 的边界和常见坑 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「Flex 与 Grid 的边界和常见坑」里，验收 Flex 与 Grid 的边界和常见坑 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## flex-grid-followup-3

title: 追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性
difficulty: 基础
tags: [Flex, Grid, 追问]
parent: flex-grid
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，gap 是 Flex 还是 Grid 的属性？

### 答案要点

#### 直答

- 结论：先拆分 Flex 与 Grid 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 Flex 与 Grid 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Flex：Flex 更适合一维布局；Grid 更适合二维布局。
- Grid：Flex 更适合一维布局；Grid 更适合二维布局。
- gap：在「Flex 与 Grid 的边界和常见坑」这题里，gap 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「Flex 与 Grid 的边界和常见坑」场景下，Flex 与 Grid 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「Flex 与 Grid 的边界和常见坑」里，Flex 与 Grid 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## responsive-container-query-followup-2

title: 追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当「移动端适配、媒体查询与容器查询」让联调成本持续升高时，你会先拆哪条关键链路来止损？

### 答案要点

#### 直答

- 结论：评估 移动端适配 媒体查询与容器查询 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先量化 移动端适配 媒体查询与容器查询 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 响应式：弹性布局、rem、流式栅格、视口单位、响应式图片。
- 容器查询：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应。

#### 风险与验收

- 主要风险：若 移动端适配 媒体查询与容器查询 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收需同时对比 移动端适配 媒体查询与容器查询 收益提升和维护成本变化，确保取舍结论可持续。

## responsive-container-query-followup-3

title: 追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度
difficulty: 进阶
tags: [响应式, 容器查询, 追问]
parent: responsive-container-query
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，和常见替代方案相比，「移动端适配、媒体查询与容器查询」在 响应式 这个维度更适合什么团队规模与业务复杂度？

### 答案要点

#### 直答

- 结论：回答 移动端适配 媒体查询与容器查询 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先列出 移动端适配 媒体查询与容器查询 的前提假设，再解释机制，最后补失效场景，形成因果闭环，并推进排查、实施与回退验证。

#### 术语解释

- 响应式：弹性布局、rem、流式栅格、视口单位、响应式图片。
- 容器查询：媒体查询关注 viewport，适合整页断点；容器查询关注组件容器尺寸，适合组件自适应。

#### 风险与验收

- 主要风险：移动端适配 媒体查询与容器查询 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：验收标准是 移动端适配 媒体查询与容器查询 因果链可复现：输入触发、机制命中、修复后指标回稳。

## variables-theme-followup-2

title: 追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，老系统包袱重、牵一发而动全身时，你会怎么围绕 主题 安排「CSS Variables、深色模式与设计令牌」的渐进改造路线？

### 答案要点

#### 直答

- 结论：先把 CSS Variables 深色模式与设计令牌 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「CSS Variables、深色模式与设计令牌」里的 CSS Variables 深色模式与设计令牌 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- CSS Variables：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖。
- 主题：围绕「CSS Variables、深色模式与设计令牌」里的 主题 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 变量：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖。

#### 风险与验收

- 主要风险：在「CSS Variables、深色模式与设计令牌」里，CSS Variables 深色模式与设计令牌 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：CSS Variables 深色模式与设计令牌 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## variables-theme-followup-3

title: 追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准
difficulty: 进阶
tags: [主题, 变量, 追问]
parent: variables-theme
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「CSS Variables、深色模式与设计令牌」场景下，你会怎样定义「CSS Variables、深色模式与设计令牌」的长期健康度，并通过指标持续校准？

### 答案要点

#### 直答

- 结论：把 CSS Variables 深色模式与设计令牌 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「CSS Variables、深色模式与设计令牌」里的 CSS Variables 深色模式与设计令牌 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- CSS Variables：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖。
- 主题：在「CSS Variables、深色模式与设计令牌」里，主题 是验收对象，必须给可量化指标、日志信号和测试证据。
- 变量：Sass 变量在编译期展开，运行时无法动态切换；CSS Variables 可在运行时被覆盖。

#### 风险与验收

- 主要风险：在「CSS Variables、深色模式与设计令牌」里，CSS Variables 深色模式与设计令牌 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「CSS Variables、深色模式与设计令牌」里，CSS Variables 深色模式与设计令牌 至少要给一组指标阈值、一条日志证据和一组测试结果。

## animation-compositor-followup-2

title: 追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「transition、animation、合成层与性能优化」场景下，当「transition、animation、合成层与性能优化」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 直答

- 结论：把 transition 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 transition 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- transition：transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效。
- animation：transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效。
- 动画：在「transition、animation、合成层与性能优化」里，动画 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：transition 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「transition、animation、合成层与性能优化」里，transition 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## animation-compositor-followup-3

title: 追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [动画, 性能, 追问]
parent: animation-compositor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，围绕「transition、animation、合成层与性能优化」在 动画 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 结论：先量化 transition 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：先排查 transition 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- transition：transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效。
- animation：transition 适合状态过渡；animation 适合自动播放、关键帧、多阶段动效。
- 动画：围绕「transition、animation、合成层与性能优化」里的 动画 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：围绕 transition 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收需同时对比 transition 收益提升和维护成本变化，确保取舍结论可持续。

## css-architecture-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 架构方案 规划「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」的阶段目标与交付边界？

### 答案要点

#### 直答

- 结论：CSS 架构方案 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先拆分 CSS 架构方案 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- CSS：构建期局部作用域，类名 hash，配合 Vue/React 都好用。
- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多。
- CSS-in-JS：CSS-in-JS 是「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 CSS 架构方案 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：围绕 CSS 架构方案 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## css-architecture-followup-3

title: 追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS, 追问]
parent: css-architecture
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了确认「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」在 架构方案 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：先定义 CSS 架构方案 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先统一 CSS 架构方案 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- CSS：构建期局部作用域，类名 hash，配合 Vue/React 都好用。
- BEM：传统命名约定，零运行时，跨技术栈通用，但样板多。
- CSS-in-JS：CSS-in-JS 是「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules」里，CSS 架构方案 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：CSS 架构方案 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## view-transitions-api-followup-1

title: 追问：View Transitions 和普通 CSS transition / animation 的区别是什么
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：View Transitions 和普通 CSS transition / animation 的区别是什么？

### 答案要点

#### 直答

- 结论：回答 Transitions 与 普通 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 Transitions 与 普通 先做归因再做验证，避免把现象当原因。

#### 术语解释

- ViewTransition：ViewTransition 是「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 动效：在「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里，动效 是因果链关键变量，需要说明触发条件、机制和反例。
- UX：UX 是「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Transitions 与 普通 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收要能复现 Transitions 与 普通 问题并证明原因链成立，再观察修复后指标是否回归。

## view-transitions-api-followup-2

title: 追问：列表到详情的共享元素动画如何避免闪烁和布局跳变
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：列表到详情的共享元素动画如何避免闪烁和布局跳变？

### 答案要点

#### 直答

- 结论：先梳理 布局跳变 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的 布局跳变 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- ViewTransition：ViewTransition 是「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 动效：在「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」这题里，动效 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- UX：UX 是「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 布局跳变 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里 布局跳变 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## view-transitions-api-followup-3

title: 追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级
difficulty: 进阶
tags: [ViewTransition, 动效, UX, 追问]
parent: view-transitions-api
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何为不支持该 API 的浏览器做降级？

### 答案要点

#### 直答

- 结论：SPA 与 MPA 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先识别 SPA 与 MPA 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- ViewTransition：ViewTransition 是「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 动效：在「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里，动效 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- UX：UX 是「View Transitions API 如何让 SPA / MPA 路由切换更顺滑」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 SPA 与 MPA 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 SPA 与 MPA 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## native-popover-dialog-anchor-followup-1

title: 追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，top layer 为什么能绕开普通层叠上下文问题？

### 答案要点

#### 直答

- 结论：回答 dialog 与 popover 的原理时要同时给成因、影响范围和替代方案，才算可落地。
- 关键动作：先复盘 dialog 与 popover 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- Popover：Popover 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Dialog：Dialog 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TopLayer：TopLayer 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 dialog 与 popover 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收标准是 dialog 与 popover 因果链可复现：输入触发、机制命中、修复后指标回稳。

## native-popover-dialog-anchor-followup-2

title: 追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，dialog 和 popover 在语义、焦点和关闭行为上有什么差别？

### 答案要点

#### 直答

- 结论：回答 dialog 与 popover 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 dialog 与 popover 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- Popover：Popover 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Dialog：Dialog 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TopLayer：TopLayer 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 dialog 与 popover 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：验收要能复现 dialog 与 popover 问题并证明原因链成立，再观察修复后指标是否回归。

## native-popover-dialog-anchor-followup-3

title: 追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里
difficulty: 进阶
tags: [Popover, Dialog, TopLayer, AnchorPositioning, 追问]
parent: native-popover-dialog-anchor
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，anchor positioning 能替代 Popper.js / Floating UI 吗，边界在哪里？

### 答案要点

#### 直答

- 结论：回答 Popper.js 与 Floating 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 Popper.js 与 Floating 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- Popover：Popover 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Dialog：Dialog 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- TopLayer：TopLayer 是「原生 dialog / popover、top layer 与 anchor positioning 解决了什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Popper.js 与 Floating 若只讲结论不讲因果，会导致排障方向错误并放大风险。
- 验收信号：验收标准是 Popper.js 与 Floating 因果链可复现：输入触发、机制命中、修复后指标回稳。

## scroll-driven-animations-followup-1

title: 追问：结合真实业务约束，scroll-timeline 和 view-timeline 的触发对象有什么不同
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，`scroll-timeline` 和 `view-timeline` 的触发对象有什么不同？

### 答案要点

#### 直答

- 结论：先梳理 scroll-timeline 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 scroll-timeline 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- CSS：CSS 是「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 动画：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。
- scroll-timeline：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。

#### 风险与验收

- 主要风险：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」里，scroll-timeline 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：scroll-timeline 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## scroll-driven-animations-followup-2

title: 追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，哪些动画属性适合滚动驱动，哪些属性应该避免？

### 答案要点

#### 直答

- 结论：回答 scroll-timeline 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：围绕 scroll-timeline 先做归因再做验证，避免把现象当原因。

#### 术语解释

- CSS：CSS 是「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 动画：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。
- scroll-timeline：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。

#### 风险与验收

- 主要风险：围绕 scroll-timeline 归因不完整时，团队会在错误方向反复优化，风险持续累积。
- 验收信号：围绕 scroll-timeline 归因结果至少给复现步骤、日志证据和回归指标，防止误判。

## scroll-driven-animations-followup-3

title: 追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级
difficulty: 进阶
tags: [CSS, 动画, scroll-timeline, 性能, 追问]
parent: scroll-driven-animations
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」场景下，不支持新 API 的浏览器上你会怎么降级？

### 答案要点

#### 直答

- 结论：Scroll-driven Animations 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：围绕 Scroll-driven Animations 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Scroll-driven Animations：Scroll-driven Animations 是「Scroll-driven Animations：scroll-timeline / view-timeline 解决什么」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- scroll-timeline：scroll-timeline 把动画进度绑定到滚动容器，适合阅读进度条、横向滚动进度、视差背景。
- view-timeline：view-timeline 把动画进度绑定到某个元素进入/离开视口的过程，适合卡片 reveal、章节标题吸附、列表项渐入。

#### 风险与验收

- 主要风险：若 Scroll-driven Animations 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：围绕 Scroll-driven Animations 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## css-style-queries-and-scope-followup-1

title: 追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CSS Style Queries、@scope 与组件样式边界怎么用」为例，什么时候用容器查询，什么时候仍然应该用媒体查询？

### 答案要点

#### 直答

- 结论：组件内部随容器尺寸变化用容器查询；全局断点和页面级布局切换仍用媒体查询。
- 关键动作：组件库落地时可以把尺寸适配交给 @container，把语义状态交给变量，把作用域交给 CSS Modules / Shadow DOM / @scope 的组合。

#### 术语解释

- CSS Style Queries：围绕「CSS Style Queries、@scope 与组件样式边界怎么用」里的 CSS Style Queries 作答时，要给可落地动作，并说明异常处理与验收阈值。
- scope：@scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局。
- CSS：Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式。

#### 风险与验收

- 主要风险：CSS Style Queries 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「CSS Style Queries、@scope 与组件样式边界怎么用」里，CSS Style Queries 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## css-style-queries-and-scope-followup-2

title: 追问：Style Queries 和 CSS Variables 的关系是什么
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：Style Queries 和 CSS Variables 的关系是什么？

### 答案要点

#### 直答

- 结论：CSS Variables 负责承载可变设计 token，Style Queries 负责读取样式状态做条件分支，两者组合实现“变量驱动 + 条件选择”。
- 关键动作：组件库落地时可以把尺寸适配交给 @container，把语义状态交给变量，把作用域交给 CSS Modules / Shadow DOM / @scope 的组合。

#### 术语解释

- CSS：Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式。
- ContainerQueries：ContainerQueries 是「CSS Style Queries、@scope 与组件样式边界怎么用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- @scope：@scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局。

#### 风险与验收

- 主要风险：若 Queries 与 CSS 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收标准是 Queries 与 CSS 因果链可复现：输入触发、机制命中、修复后指标回稳。

## css-style-queries-and-scope-followup-3

title: 追问：从工程落地角度看，@scope、CSS Modules、Shadow DOM 在样式隔离上各有什么边界
difficulty: 进阶
tags: [CSS, ContainerQueries, @scope, 组件化, 追问]
parent: css-style-queries-and-scope
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，`@scope`、CSS Modules、Shadow DOM 在样式隔离上各有什么边界？

### 答案要点

#### 直答

- 结论：先锁定 scope 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：组件库落地时可以把尺寸适配交给 @container，把语义状态交给变量，把作用域交给 CSS Modules / Shadow DOM / @scope 的组合。

#### 术语解释

- CSS：Style Queries 关注容器样式状态，常见做法是用 CSS 自定义属性表达密度、主题、危险态，再让内部子组件按状态切换样式。
- ContainerQueries：ContainerQueries 是「CSS Style Queries、@scope 与组件样式边界怎么用」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- @scope：@scope 限制选择器的匹配范围，适合文档内容、主题片段、低侵入迁移老样式，避免 .title 这类通用类名污染全局。

#### 风险与验收

- 主要风险：scope 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「CSS Style Queries、@scope 与组件样式边界怎么用」里，scope 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## stacking-context-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 z-index 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先定「层叠上下文与 z-index 为什么经常“不生效”」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 层叠上下文 与 z-index 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- z-index：z-index 只在同一层叠上下文中比较。
- 层叠：z-index 只在同一层叠上下文中比较。

#### 风险与验收

- 主要风险：在「层叠上下文与 z-index 为什么经常“不生效”」里，层叠上下文 与 z-index 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：层叠上下文 与 z-index 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## stacking-context-followup-3

title: 追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序
difficulty: 进阶
tags: [z-index, 层叠, 追问]
parent: stacking-context
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「层叠上下文与 z-index 为什么经常“不生效”」为例，面对规模与资源变化并存时，你会如何围绕 z-index 调整「层叠上下文与 z-index 为什么经常“不生效”」的推进顺序？

### 答案要点

#### 直答

- 结论：「层叠上下文与 z-index 为什么经常“不生效”」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：把「层叠上下文与 z-index 为什么经常“不生效”」里的 层叠上下文 与 z-index 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- z-index：z-index 只在同一层叠上下文中比较。
- 层叠：z-index 只在同一层叠上下文中比较。

#### 风险与验收

- 主要风险：围绕 层叠上下文 与 z-index 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：层叠上下文 与 z-index 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## selector-modern-followup-2

title: 追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「:has、:is、:where、:focus-visible 怎么用」为例，你会如何围绕 选择器 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先定「:has()、:is()、:where()、:focus-visible 怎么用」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 has 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- :has()：:has() 是“父选择器能力”，可根据后代状态反向选中父元素。
- has：:has() 是“父选择器能力”，可根据后代状态反向选中父元素。
- :is()：:is() 降低选择器重复；:where() 与其类似，但权重为 0。

#### 风险与验收

- 主要风险：若 has 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：has 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## selector-modern-followup-3

title: 追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段
difficulty: 进阶
tags: [选择器, 现代 CSS, 追问]
parent: selector-modern
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」场景下，如果兼容性压力突然升高，你会如何围绕 选择器 重新划分「`:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用」的实施阶段？

### 答案要点

#### 直答

- 结论：把「:has()、:is()、:where()、:focus-visible 怎么用」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：先明确 has 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- :has()：:has() 是“父选择器能力”，可根据后代状态反向选中父元素。
- has：:has() 是“父选择器能力”，可根据后代状态反向选中父元素。
- :is()：:is() 降低选择器重复；:where() 与其类似，但权重为 0。

#### 风险与验收

- 主要风险：has 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「:has()、:is()、:where()、:focus-visible 怎么用」里，验收 has 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## print-css-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 打印 方案有效？

### 答案要点

#### 直答

- 结论：先定「打印样式与网页内容导出友好性」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 打印样式 与 网页内容导出友好性 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 打印：围绕「打印样式与网页内容导出友好性」里的 打印 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 导出：在「打印样式与网页内容导出友好性」里，导出 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「打印样式与网页内容导出友好性」里，打印样式 与 网页内容导出友好性 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：打印样式 与 网页内容导出友好性 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## print-css-followup-3

title: 追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段
difficulty: 基础
tags: [打印, 导出, 追问]
parent: print-css
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 打印 重新划分「打印样式与网页内容导出友好性」的实施阶段？

### 答案要点

#### 直答

- 结论：先小流量验证「打印样式与网页内容导出友好性」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：先明确 打印样式与网页内容导出友好性 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 打印：在「打印样式与网页内容导出友好性」这题里，打印 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 导出：围绕「打印样式与网页内容导出友好性」里的 导出 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：打印样式与网页内容导出友好性 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「打印样式与网页内容导出友好性」里，验收 打印样式与网页内容导出友好性 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## modern-css-features-followup-2

title: 追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让结论在 现代 CSS 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：先定「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先定义 指标的组合验证 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 现代 CSS：围绕「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」里的 现代 CSS 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- has：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack。
- layers：围绕「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」里的 layers 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：指标的组合验证 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」里，指标的组合验证 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## modern-css-features-followup-3

title: 追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [现代 CSS, has, layers, 追问]
parent: modern-css-features
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」场景下，遇到约束变化时，你会如何围绕 现代 CSS 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先锁定 现代 CSS 必备特性 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 现代 CSS 必备特性 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- CSS：原生嵌套，去掉 Sass / Less 依赖。
- has：:has()：终于有了"父选择器"，可基于子节点状态选父，替代过去的 JS hack。
- nesting：围绕「现代 CSS 必备特性：has / nesting / cascade-layers / color-mix」里的 nesting 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：现代 CSS 必备特性 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 现代 CSS 必备特性 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## center-element-followup-2

title: 追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「元素水平垂直居中的 N 种姿势」场景下，如果要向团队复盘 布局 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 结论：先定「元素水平垂直居中的 N 种姿势」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先把「元素水平垂直居中的 N 种姿势」里的 元素水平垂直居中的 N 种姿势 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 布局：围绕「元素水平垂直居中的 N 种姿势」里的 布局 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 居中：在「元素水平垂直居中的 N 种姿势」里，居中 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「元素水平垂直居中的 N 种姿势」里，元素水平垂直居中的 N 种姿势 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「元素水平垂直居中的 N 种姿势」里，元素水平垂直居中的 N 种姿势 至少要给一组指标阈值、一条日志证据和一组测试结果。

## center-element-followup-3

title: 追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节
difficulty: 基础
tags: [布局, 居中, 高频, 追问]
parent: center-element
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当约束变化导致成本上升时，你会先优化「元素水平垂直居中的 N 种姿势」里和 布局 相关的哪些环节？

### 答案要点

#### 直答

- 结论：先处理 元素水平垂直居中的 N 种姿势 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：先排查 元素水平垂直居中的 N 种姿势 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- 布局：围绕「元素水平垂直居中的 N 种姿势」里的 布局 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 居中：在「元素水平垂直居中的 N 种姿势」里，居中 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 元素水平垂直居中的 N 种姿势 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：围绕 元素水平垂直居中的 N 种姿势 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## position-stacking-followup-2

title: 追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，上线后你会盯哪些与 定位 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先约定「position 五个值的差别和层叠上下文是怎么形成的」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 position 五个值 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- position：在「position 五个值的差别和层叠上下文是怎么形成的」里，position 是验收对象，必须给可量化指标、日志信号和测试证据。
- 定位：脱离文档流，相对最近的非 static 祖先定位。
- 层叠：围绕「position 五个值的差别和层叠上下文是怎么形成的」里的 层叠 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「position 五个值的差别和层叠上下文是怎么形成的」里，position 五个值 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：position 五个值 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## position-stacking-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏
difficulty: 进阶
tags: [定位, 层叠, 追问]
parent: position-stacking
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 定位 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「position 五个值的差别和层叠上下文是怎么形成的」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。
- 关键动作：先定位 调整方案边界 与 实施节奏 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 定位：脱离文档流，相对最近的非 static 祖先定位。
- 层叠：在「position 五个值的差别和层叠上下文是怎么形成的」这题里，层叠 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「position 五个值的差别和层叠上下文是怎么形成的」场景下，调整方案边界 与 实施节奏 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：验收看 调整方案边界 与 实施节奏 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## css-layout-systems-followup-2

title: 追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」为例，上线后你会盯哪些和 CSS 相关的指标，来判断「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」的收益是否持续成立？

### 答案要点

#### 直答

- 结论：把 一道题讲清 Flex 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 一道题讲清 Flex 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Flex：Flex 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Grid：Grid 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Float：Float 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里，一道题讲清 Flex 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：一道题讲清 Flex 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## css-layout-systems-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级
difficulty: 进阶
tags: [CSS, 布局, 高频, 追问]
parent: css-layout-systems
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 CSS 重排「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」方案优先级？

### 答案要点

#### 直答

- 结论：「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：先定位 一道题讲清 Flex 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Flex：Flex 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Grid：Grid 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Float：Float 是「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：一道题讲清 Flex 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「一道题讲清 Flex / Grid / 多列 / Float 各自适用场景」里，一道题讲清 Flex 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## css-typography-rhythm-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 CSS 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：验证「CSS 字体与排版怎么做才显专业」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 CSS 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- CSS：CSS 是「CSS 字体与排版怎么做才显专业」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）。
- 排版：围绕「CSS 字体与排版怎么做才显专业」里的 排版 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：CSS 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「CSS 字体与排版怎么做才显专业」里，CSS 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## css-typography-rhythm-followup-3

title: 追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏
difficulty: 进阶
tags: [CSS, 字体, 排版, 追问]
parent: css-typography-rhythm
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，当兼容性要求提升或预算收紧时，你会如何围绕 CSS 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「CSS 字体与排版怎么做才显专业」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：先明确 调整方案边界 与 实施节奏 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- CSS：CSS 是「CSS 字体与排版怎么做才显专业」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 字体：@font-face + font-display: swap（FOIT → FOUT，避免空白）。
- 排版：在「CSS 字体与排版怎么做才显专业」这题里，排版 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：调整方案边界 与 实施节奏 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「CSS 字体与排版怎么做才显专业」里，调整方案边界 与 实施节奏 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何识别「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 结论：围绕「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：把「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」里的 CSS 渲染路径预算 关键样式体积 阻塞链路与发布闸门 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- CSS：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。
- 性能预算：在「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」这题里，性能预算 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 渲染路径：围绕「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」里的 渲染路径 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：围绕 CSS 渲染路径预算 关键样式体积 阻塞链路与发布闸门 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。

## css-render-path-budget-gate-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 CSS 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 结论：先约定「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先统一 阻塞链路 与 发布闸门 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- CSS：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。
- 性能预算：围绕「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」里的 性能预算 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 渲染路径：在「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」里，渲染路径 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」里，阻塞链路 与 发布闸门 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。

## css-render-path-budget-gate-followup-3

title: 追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [CSS, 性能预算, 渲染路径, 追问]
parent: css-render-path-budget-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」为例，遇到约束变化时，你会如何围绕 CSS 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先拆分 CSS 渲染路径预算 关键样式体积 阻塞链路与发布闸门 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 CSS 渲染路径预算 关键样式体积 阻塞链路与发布闸门 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- CSS：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。
- 性能预算：围绕「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」里的 性能预算 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 渲染路径：在「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」这题里，渲染路径 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「CSS 渲染路径预算：关键样式体积、阻塞链路与发布闸门」场景下，CSS 渲染路径预算 关键样式体积 阻塞链路与发布闸门 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：先定义预算维度：关键 CSS 体积、阻塞请求数、首屏样式计算耗时、渲染稳定性指标。

## css-change-safety-guardrail-followup-1

title: 追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 直答

- 结论：样式改动安全护栏 回归范围评估 灰度放量与回滚预案 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容。

#### 术语解释

- CSS：CSS 是「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 发布安全：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，发布安全 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 回归治理：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，回归治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 样式改动安全护栏 回归范围评估 灰度放量与回滚预案 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：样式改动安全护栏 回归范围评估 灰度放量与回滚预案 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## css-change-safety-guardrail-followup-2

title: 追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」为例，你会如何围绕 CSS 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先定「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容。

#### 术语解释

- CSS：CSS 是「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 发布安全：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，发布安全 是验收对象，必须给可量化指标、日志信号和测试证据。
- 回归治理：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，回归治理 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，样式改动安全护栏 回归范围评估 灰度放量与回滚预案 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：样式改动安全护栏 回归范围评估 灰度放量与回滚预案 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## css-change-safety-guardrail-followup-3

title: 追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界
difficulty: 资深
tags: [CSS, 发布安全, 回归治理, 追问]
parent: css-change-safety-guardrail
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对安全与体验拉扯时，你会怎样为「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」设定可接受的成本边界？

### 答案要点

#### 直答

- 结论：先量化 样式改动安全护栏 回归范围评估 灰度放量与回滚预案 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。
- 关键动作：发布策略采用灰度：按用户群或页面路由逐步放量，观察异常再扩容。

#### 术语解释

- CSS：CSS 是「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 发布安全：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，发布安全 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 回归治理：在「样式改动安全护栏：回归范围评估、灰度放量与回滚预案」里，回归治理 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 样式改动安全护栏 回归范围评估 灰度放量与回滚预案 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：围绕 样式改动安全护栏 回归范围评估 灰度放量与回滚预案 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。
