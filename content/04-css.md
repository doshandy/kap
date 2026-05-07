---
id: 04-css
title: CSS 进阶
order: 4
icon: 🎨
description: 盒模型、布局、层叠、动画、响应式、现代 CSS 与打印样式。
---

## box-bfc
title: 盒模型、BFC 与格式化上下文的真实作用
difficulty: 基础
tags: [盒模型, BFC, 布局]

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

### 延伸
- `flow-root` 是现代语义化触发 BFC 的首选
- 不要滥用 `overflow: hidden` 只为清浮动，容易裁掉阴影和 popover

## stacking-context
title: 层叠上下文与 z-index 为什么经常“不生效”
difficulty: 进阶
tags: [z-index, 层叠]

### 题目
解释层叠上下文的创建条件，并说明为什么子元素的 `z-index: 9999` 也可能盖不过别的元素。

### 答案要点
- `z-index` 只在同一层叠上下文中比较
- 常见创建条件：定位元素且有 z-index、`opacity < 1`、`transform`、`filter`、`will-change`、`isolation: isolate`
- 一旦父元素形成新层叠上下文，子元素再高的 z-index 也无法越过父级上下文的整体层级

### 代码示例
```css
/* ❌ 父级 transform 创建了新层叠上下文，子级再高也盖不过外面的元素 */
.parent { transform: translate(0); }   /* 创建上下文 */
.child  { position: absolute; z-index: 9999; }
.outer  { position: relative; z-index: 1; } /* child 永远在 outer 之下 */

/* ✅ 用 isolation 显式隔离层叠 */
.card {
  isolation: isolate;       /* 创建独立层叠上下文，避免影响外部 */
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
.modal { z-index: var(--z-modal); }
.toast { z-index: var(--z-toast); }
```

### 延伸
- 调试层级问题先画"上下文边界"，不是一味调大 z-index
- Modal/Tooltip 常配合 Teleport 直接挂到 body，绕开业务容器的层叠限制

## flex-grid
title: Flex 与 Grid 的边界和常见坑
difficulty: 基础
tags: [Flex, Grid]

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

### 延伸
- `auto-fill` 保留空轨道，`auto-fit` 会把空轨道折叠
- Grid 的 `subgrid` 很适合复杂内容对齐，但浏览器支持要确认

## responsive-container-query
title: 移动端适配、媒体查询与容器查询
difficulty: 进阶
tags: [响应式, 容器查询]

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

### 延伸
- 容器查询通常比“写很多全局断点”更利于组件复用
- 移动端 1px 问题可用 `transform: scale(.5)`、高 DPR 边框图或直接接受物理像素差异

## variables-theme
title: CSS Variables、深色模式与设计令牌
difficulty: 进阶
tags: [主题, 变量]

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

### 延伸
- CSS 变量天然支持级联，局部主题覆盖很方便
- 设计令牌最好按"语义层"命名，如 `--color-surface`，不要直接写 `--blue-500`

## selector-modern
title: `:has()`、`:is()`、`:where()`、`:focus-visible` 怎么用
difficulty: 进阶
tags: [选择器, 现代 CSS]

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

### 延伸
- `:has()` 很强，但复杂选择器可能有性能成本，优先用于局部组件树
- `:where()` 很适合写低优先级基础样式

## animation-compositor
title: transition、animation、合成层与性能优化
difficulty: 进阶
tags: [动画, 性能]

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
  transition: opacity 200ms, transform 200ms;
}
.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
}

/* ❌ 反例：改 top/left 触发 layout */
.bad {
  transition: top 200ms, left 200ms;
}

/* will-change 仅在动画期间使用 */
.btn:hover { will-change: transform; }
.btn:not(:hover) { will-change: auto; }

/* 关键帧动画 */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

/* 尊重用户偏好：减少动效 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 延伸
- 动效设计要考虑 `prefers-reduced-motion`
- 并不是"用了 transform 就一定快"，过多大图层也会卡

## print-css
title: 打印样式与网页内容导出友好性
difficulty: 基础
tags: [打印, 导出]

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
  body { background: #fff; color: #000; }
  .card {
    box-shadow: none !important;
    border: 1px solid #ccc;
    page-break-inside: avoid;        /* 卡片不被截断 */
  }

  /* 3. 标题级别避免页中断 */
  h1, h2, h3 {
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

### 延伸
- 先把网页内容语义结构做好，打印样式才容易稳定
- "可打印"与"PDF 截图导出"不是一回事，前者更接近文档排版

## modern-css-features
title: 现代 CSS 必备特性：has / nesting / cascade-layers / color-mix
difficulty: 进阶
tags: [现代 CSS, has, layers]

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
  &:hover { filter: brightness(1.05); }
  &.ghost {
    background: transparent;
    color: var(--c-primary);
  }
}

@layer reset, base, components, utilities;
@layer base {
  body { font-family: system-ui; }
}

:root {
  --primary: oklch(0.7 0.18 250);
  --primary-soft: color-mix(in oklch, var(--primary) 18%, white);
}

@scope (.card) to (.actions) {
  h3 { font-size: 16px; }
}
```

### 延伸
- 老项目可以让 PostCSS / Lightning CSS 把现代语法降级到兼容旧浏览器
- 设计系统团队尤其要拥抱 layers，可以让"业务覆盖组件库"变得可预期

## css-architecture
title: CSS 架构方案：BEM / CSS-in-JS / Tailwind / CSS Modules
difficulty: 进阶
tags: [架构, Tailwind, CSS-in-JS]

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

### 延伸
- 不同方案可以混用，但一个仓库内统一基本盘很重要，否则维护成本爆炸
- 最重要的是把 design tokens（颜色、间距、圆角、阴影）做成单一来源
