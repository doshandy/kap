---
id: 19-visualization
title: 可视化与图形
order: 19
icon: 📊
description: Canvas、SVG、ECharts、D3、WebGL 与图形性能优化。
---

## canvas-svg

title: Canvas 与 SVG 如何选
followups: [canvas-svg-followup-1, canvas-svg-followup-2, canvas-svg-followup-3]
links: [canvas-vs-svg-vs-webgl, chart-export-printing, chart-interaction-tooltip]
difficulty: 基础
tags: [Canvas, SVG]

### 一句话

SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形；Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果；SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱。

### 题目

同样是画图，Canvas 和 SVG 的核心差异是什么？分别适合哪些场景？

### 答案要点

- SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果
- SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱

#### 补充说明

- 面试中不要只停留在「Canvas 与 SVG 如何选」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 Canvas、SVG 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「Canvas 与 SVG 如何选」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
// 1. SVG：声明式，每个图元都是 DOM
function renderSvg(points: { x: number; y: number }[]) {
  return `
    <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      <polyline
        fill="none" stroke="#0ea5e9" stroke-width="2"
        points="${points.map((p) => `${p.x},${p.y}`).join(' ')}"
      />
      ${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#0ea5e9" />`).join('')}
    </svg>
  `;
}
// 优势：CSS 样式化、事件绑定、可访问性、调试方便
// 劣势：图元 > 几千个时性能下降明显
```

```ts
// 2. Canvas：像素绘制，适合大量元素
function renderCanvas(canvas: HTMLCanvasElement, points: any[]) {
  const ctx = canvas.getContext('2d')!;
  // 高 DPR 适配
  const dpr = devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}
```

```ts
// 3. Canvas 上事件命中：自己实现（区域遍历或 Path2D + isPointInPath）
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left,
    y = e.clientY - rect.top;
  for (const p of points) {
    const path = new Path2D();
    path.arc(p.x, p.y, 5, 0, Math.PI * 2);
    if (ctx.isPointInPath(path, x, y)) {
      console.log('hit:', p);
      break;
    }
  }
});
```

### 追问

- 「Canvas 与 SVG 如何选」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Canvas 与 SVG 如何选」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Canvas、SVG，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不是"Canvas 一定快"，而是看图元数量、更新频率和交互复杂度

## chart-performance

title: ECharts 大数据渲染优化思路
followups: [chart-performance-followup-1, chart-performance-followup-2, chart-performance-followup-3]
links: [27-data-platform-cases/g2-charts-perf, canvas-svg, canvas-vs-svg-vs-webgl]
difficulty: 进阶
tags: [ECharts, 性能]

### 一句话

数据采样、聚合、分层展示、虚拟滚动；开启渐进式渲染、data。

### 题目

图表数据量很大时，前端有哪些常见优化手段？

### 答案要点

- **数据层**：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- **渲染层**：用 canvas 而非 svg；关闭动画 `animation: false`；隐藏每点的 symbol
- **渐进式渲染**：`progressive: 1000` + `progressiveThreshold: 3000` 让首屏先出来
- **交互层**：dataZoom 控制可见区间；tooltip 按需触发；hover 时再算细节
- **数据传输**：分块加载 + 懒加载未滚到的图表；用 typed array 减少内存
- 极端场景（百万级点）考虑 **WebGL renderer**（echarts-gl）或 deck.gl
- 衡量：用 Performance 看 long task；目标 fps 60 / TBT < 200ms

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 ECharts 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，ECharts 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「ECharts 大数据渲染优化思路」采用小步优化更稳。

### 代码示例

```ts
import * as echarts from 'echarts';

const chart = echarts.init(container, null, {
  renderer: 'canvas', // 大数据强烈推荐 canvas（svg 图元过多会卡）
});

chart.setOption({
  animation: false, // 大数据关闭动画
  dataset: { source: largeData }, // 用 dataset 减少二次拷贝

  series: [
    {
      type: 'line',
      showSymbol: false, // 不画每个点的标记
      sampling: 'lttb', // 大数据采样：保留趋势点
      progressive: 1000, // 渐进式渲染：每帧 1000 个点
      progressiveThreshold: 3000, // 超过 3000 个点开启渐进
      large: true, // canvas 大数据模式
      largeThreshold: 2000,
    },
  ],

  dataZoom: [
    { type: 'inside' },
    { type: 'slider', start: 90, end: 100 }, // 默认显示最近 10%
  ],

  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross', snap: true },
  },
});

// 容器变化时重算（必须节流）
const ro = new ResizeObserver(debounce(() => chart.resize(), 100));
ro.observe(container);
```

```ts
// 数据采样：LTTB（Largest-Triangle-Three-Buckets）
function lttbSample(data: [number, number][], threshold: number): [number, number][] {
  if (threshold >= data.length) return data;
  const sampled: [number, number][] = [data[0]];
  const every = (data.length - 2) / (threshold - 2);

  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * every) + 1;
    const rangeEnd = Math.floor((i + 2) * every) + 1;

    let avgX = 0,
      avgY = 0;
    for (let j = rangeStart; j < Math.min(rangeEnd, data.length); j++) {
      avgX += data[j][0];
      avgY += data[j][1];
    }
    const cnt = Math.min(rangeEnd, data.length) - rangeStart;
    avgX /= cnt;
    avgY /= cnt;

    let maxArea = -1,
      maxIdx = a + 1;
    for (let j = Math.floor(i * every) + 1; j < Math.floor((i + 1) * every) + 1; j++) {
      const area = Math.abs(
        (data[a][0] - avgX) * (data[j][1] - data[a][1]) -
          (data[a][0] - data[j][0]) * (avgY - data[a][1]),
      );
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }
    sampled.push(data[maxIdx]);
    a = maxIdx;
  }
  sampled.push(data[data.length - 1]);
  return sampled;
}
```

### 追问

- 你会先看哪些指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「ECharts 大数据渲染优化思路」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 ECharts、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 用户不一定需要"所有点都同时可见"，更重要的是快速读出趋势和异常

## d3-thinking

title: D3 的核心思想不是“画图库”，而是数据驱动映射
followups: [d3-thinking-followup-1, d3-thinking-followup-2, d3-thinking-followup-3]
difficulty: 进阶
tags: [D3, 数据映射]

### 一句话

D3 更底层，强调比例尺、坐标映射、数据绑定和图元组合；ECharts 更偏配置驱动，开箱快但自由度相对受约束；D3 更适合定制可视化和非标准图形。

### 题目

为什么很多人学 D3 会觉得难？它和 ECharts 的心智模型有什么不同？

### 答案要点

- D3 是**底层映射工具集**，强调"**比例尺 → 数据绑定 → 图元生成**"三段心智
- ECharts 是**高层配置驱动库**，传 option 即出图，自由度低但开发快
- D3 的核心 API：`d3.scale*`（比例尺）/ `d3.selection`（数据绑定）/ `d3.axis`（坐标轴）
- 数据绑定模式：**enter / update / exit**——数据变化时只增删差异部分（虚拟 DOM 思想的鼻祖）
- D3 适合：自定义可视化、非标准图形（force layout、地图、桑基图、网络图）
- 选型经验：**80% 业务图表用 ECharts**（性价比最高），定制图形或学术图用 D3
- 现代趋势：D3 + React（visx / react-vis）把 D3 的数学逻辑保留，渲染交给 React

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 D3 结论失真。
- 失败场景：例如忽略极端输入规模，D3 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「D3 的核心思想不是“画图库”，而是数据驱动映射」优先保证规模上限可控。

### 代码示例

```ts
import * as d3 from 'd3';

// 1. 比例尺：把数据域映射到屏幕域
const x = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d.value)!]) // 数据范围
  .range([0, 600]); // 屏幕范围

const y = d3
  .scaleBand()
  .domain(data.map((d) => d.label))
  .range([0, 400])
  .padding(0.1);

const color = d3.scaleOrdinal(d3.schemeTableau10);

// 2. Enter / Update / Exit 模式（D3 的核心思想）
const svg = d3.select('#chart');
const bars = svg.selectAll('rect').data(data, (d: any) => d.label);

// Enter：新数据进入
bars
  .enter()
  .append('rect')
  .attr('x', 0)
  .attr('y', (d) => y(d.label)!)
  .attr('height', y.bandwidth())
  .attr('width', 0) // 初始为 0
  .attr('fill', (d) => color(d.label))
  .transition()
  .duration(500)
  .attr('width', (d) => x(d.value)); // 动画到目标宽度

// Update：已存在数据更新
bars
  .transition()
  .duration(500)
  .attr('width', (d) => x(d.value));

// Exit：数据离开则移除
bars.exit().transition().duration(300).attr('width', 0).remove();
```

```ts
// 3. 配合自定义图表：力导向图
const simulation = d3
  .forceSimulation(nodes)
  .force(
    'link',
    d3
      .forceLink(links)
      .id((d: any) => d.id)
      .distance(80),
  )
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .on('tick', () => {
    // 每帧更新位置
    nodeSelection.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    linkSelection
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
  });
```

### 追问

- 「D3 的核心思想不是“画图库”，而是数据驱动映射」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「D3 的核心思想不是“画图库”，而是数据驱动映射」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 D3、数据映射，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 学 D3 的关键不是 API，而是"从数据到图形映射"的思维方式

## animation-raf

title: requestAnimationFrame 与图形动画节奏控制
followups: [animation-raf-followup-1, animation-raf-followup-2, animation-raf-followup-3]
links: [04-css/animation-compositor]
difficulty: 进阶
tags: [动画, RAF]

### 一句话

requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑；页面后台时会自动降频；可结合时间差 deltaTime 做与帧率无关的动画速度控制。

### 题目

为什么图形动画通常基于 `requestAnimationFrame` 而不是 `setInterval`？

### 答案要点

- `requestAnimationFrame` 与浏览器刷新节奏同步，更省电、更平滑
- 页面后台时会自动降频
- 可结合时间差 `deltaTime` 做与帧率无关的动画速度控制

#### 补充说明

- 面试中不要只停留在「requestAnimationFrame 与图形动画节奏控制」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 动画、RAF 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 算法题要说明复杂度、边界输入、反例构造、数据结构选择和可读性权衡。
- 验证时建议给出路径：单测覆盖边界，样例覆盖极端输入，必要时用基准测试观察耗时和内存。
- 如果答案涉及性能或可读性，要主动说明默认方案、例外输入和替代实现。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「requestAnimationFrame 与图形动画节奏控制」时要先说清输入规模、复杂度上限和内存预算，这三项决定 requestAnimationFrame 是否可行。
- 失败场景：例如漏掉重复值/越界输入，requestAnimationFrame 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

### 代码示例

```ts
// 1. 基于 deltaTime 的与帧率无关动画
class Animator {
  private rafId: number | null = null;
  private lastTime = 0;

  start(update: (dt: number) => void) {
    const tick = (now: number) => {
      const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0;
      this.lastTime = now;
      update(dt); // dt 单位：秒
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastTime = 0;
  }
}

const animator = new Animator();
let x = 0;
const SPEED = 200; // 像素 / 秒

animator.start((dt) => {
  x += SPEED * dt;
  ball.style.transform = `translateX(${x}px)`;
});
```

```ts
// 2. 缓动函数（与时间映射）
const easings = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

function tween(from: number, to: number, duration: number, ease = easings.easeOutCubic) {
  return new Promise<void>((resolve) => {
    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * ease(t);
      onUpdate(v);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}
```

```ts
// 3. 节流到 30fps（移动端省电）
let lastDraw = 0;
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

function loop(now: number) {
  if (now - lastDraw >= FRAME_MS) {
    draw();
    lastDraw = now;
  }
  requestAnimationFrame(loop);
}
```

### 追问

- 「requestAnimationFrame 与图形动画节奏控制」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「requestAnimationFrame 与图形动画节奏控制」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 动画、RAF，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 高帧率动画的关键不只是"每帧跑"，更是每帧做多少工作

## webgl-webgpu

title: WebGL 与 WebGPU 的前端视角
followups: [webgl-webgpu-followup-1, webgl-webgpu-followup-2, webgl-webgpu-followup-3]
difficulty: 进阶
tags: [WebGL, WebGPU]

### 一句话

WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染；Three.js 提供更高层抽象，适合业务快速落地；WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估。

### 题目

什么时候应该考虑 WebGL/Three.js，什么时候又要关注 WebGPU？

### 答案要点

- WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- Three.js 提供更高层抽象，适合业务快速落地
- WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估

#### 补充说明

- 面试中不要只停留在「WebGL 与 WebGPU 的前端视角」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 WebGL、WebGPU 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「WebGL 与 WebGPU 的前端视角」时要把 WebGL 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，WebGL 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「WebGL 与 WebGPU 的前端视角」里当前按阶段替换更稳。

### 代码示例

```ts
// Three.js：3D 场景的最小例子
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }),
);
scene.add(mesh);
scene.add(new THREE.DirectionalLight(0xffffff, 1).clone());

function loop() {
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();
```

```ts
// WebGPU：检测 + 最小渲染管线（简化）
async function initWebGPU(canvas: HTMLCanvasElement) {
  if (!('gpu' in navigator)) {
    console.warn('WebGPU 不可用，回退到 WebGL');
    return null;
  }
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter!.requestDevice();
  const ctx = canvas.getContext('webgpu')!;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'premultiplied' });

  const shader = device.createShaderModule({
    code: `
      @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
        let pos = array(vec2f(0,0.5), vec2f(-0.5,-0.5), vec2f(0.5,-0.5));
        return vec4f(pos[i], 0, 1);
      }
      @fragment fn fs() -> @location(0) vec4f { return vec4f(0.05, 0.65, 0.91, 1); }
    `,
  });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shader, entryPoint: 'vs' },
    fragment: { module: shader, entryPoint: 'fs', targets: [{ format }] },
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: ctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
  pass.setPipeline(pipeline);
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);
}
```

### 追问

- 「WebGL 与 WebGPU 的前端视角」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「WebGL 与 WebGPU 的前端视角」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 WebGL、WebGPU，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不是所有"炫酷"效果都值得上 GPU，维护与兼容成本要算进去

## dashboard-adaptation

title: 大屏适配与多分辨率设计
followups: [dashboard-adaptation-followup-1, dashboard-adaptation-followup-2, dashboard-adaptation-followup-3]
difficulty: 进阶
tags: [大屏, 适配]

### 一句话

大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题；更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算；需要特别处理 DPR、字体渲染和图表容器尺寸变更。

### 题目

数据大屏为什么经常在不同分辨率下变形？有哪些常见适配策略？

### 答案要点

- 大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算
- 需要特别处理 DPR、字体渲染和图表容器尺寸变更

#### 补充说明

- 面试中不要只停留在「大屏适配与多分辨率设计」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 大屏、适配 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「大屏适配与多分辨率设计」时要先定义 大屏适配与多分辨率设 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，大屏适配与多分辨率设 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 大屏适配与多分辨率设 关键链路先收敛再替换。

### 代码示例

```ts
// 1. 等比缩放方案（设计稿 1920x1080）
const DESIGN_W = 1920;
const DESIGN_H = 1080;

function scaleToFit(container: HTMLElement) {
  const scale = Math.min(innerWidth / DESIGN_W, innerHeight / DESIGN_H);
  container.style.cssText = `
    width: ${DESIGN_W}px;
    height: ${DESIGN_H}px;
    transform: translate(-50%, -50%) scale(${scale});
    transform-origin: center;
    position: absolute;
    left: 50%;
    top: 50%;
  `;
}

addEventListener(
  'resize',
  debounce(() => scaleToFit(rootEl), 100),
);
scaleToFit(rootEl);

// 优势：开发体验好（按设计稿写）
// 劣势：极端比例下会留黑边；字体在缩放后可能模糊
```

```ts
// 2. 响应式 + 局部缩放方案（推荐）
// 整体布局用 grid/flex，关键图表区域单独缩放
:root {
  --base-font: clamp(14px, 1vw, 18px);
}

.dashboard {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 16px;
  padding: 16px;
  font-size: var(--base-font);
}

.chart-block {
  container-type: size;
}

@container (min-width: 800px) {
  .chart-title { font-size: 24px; }
}
```

```ts
// 3. ECharts 容器尺寸变化时重算
const chart = echarts.init(container);
const ro = new ResizeObserver(
  debounce((entries) => {
    for (const entry of entries) {
      chart.resize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  }, 100),
);
ro.observe(container);

// 4. 高 DPR 屏幕清晰度
const dpr = devicePixelRatio || 1;
const chart2 = echarts.init(container, null, { devicePixelRatio: dpr });
```

### 追问

- 推动「大屏适配与多分辨率设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「大屏适配与多分辨率设计」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 大屏、适配，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大屏适配不是单纯缩放一层容器，信息密度和可读性同样重要

## chart-interaction-tooltip

title: 图表交互的几个关键点（联动 / hover / brush / 缩放）
followups: [chart-interaction-tooltip-followup-1, chart-interaction-tooltip-followup-2, chart-interaction-tooltip-followup-3]
links: [canvas-svg, canvas-vs-svg-vs-webgl, chart-export-printing]
difficulty: 进阶
tags: [可视化, 交互]

### 一句话

节流：mousemove / wheel 事件每秒上百次，要 rAF 节流；联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引；Brush：选区交互需要支持 keyboard ESC 取消、双击重置。

### 题目

做一个有"hover、联动、刷选、滚轮缩放"的多图表 dashboard，前端要解决什么问题？

### 答案要点

- 节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引
- Brush：选区交互需要支持 keyboard ESC 取消、双击重置
- 缩放：滚轮缩放要 cmd/ctrl 修饰，避免误触；移动端用双指
- 图层：关键交互层用 SVG 或独立 Canvas，避免重绘整图
- 性能：超过 1 万点用 WebGL（regl / pixi）或聚合采样
- 可访问性：图表也要支持键盘焦点 + screen reader 文本备份

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 图表交互的几个关键点 结论失真。
- 失败场景：例如忽略极端输入规模，图表交互的几个关键点 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「图表交互的几个关键点（联动 / hover / brush / 缩放）」优先保证规模上限可控。

### 代码示例

```ts
const charts = [chart1, chart2, chart3];

function syncHover(targetIndex: number, dataIndex: number) {
  charts.forEach((c, i) => {
    if (i === targetIndex) return;
    c.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex });
  });
}

charts.forEach((c, i) => {
  c.on('updateAxisPointer', (e) => {
    if (typeof e.dataIndex === 'number') syncHover(i, e.dataIndex);
  });
});

charts.forEach((c) => {
  c.getZr().on('mousewheel', (e) => {
    if (!e.event.ctrlKey && !e.event.metaKey) return;
    e.event.preventDefault();
    c.dispatchAction({ type: 'dataZoom', start: 0, end: 50 });
  });
});
```

### 追问

- 「图表交互的几个关键点（联动 / hover / brush / 缩放）」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「图表交互的几个关键点（联动 / hover / brush / 缩放）」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 可视化、交互，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大屏多图联动建议在外部用 RxJS / Pinia 集中状态，比让每个图自己 listen 干净
- ECharts / Highcharts / G2 都有内置的联动接口，先看官方再考虑自己造

## d3-force-network

title: D3 力导向图（Force-directed Graph）实战要点
followups: [d3-force-network-followup-1, d3-force-network-followup-2, d3-force-network-followup-3]
links: [canvas-svg, canvas-vs-svg-vs-webgl, chart-export-printing]
difficulty: 资深
tags: [D3, 力导向, 图]

### 一句话

物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛；渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点；分层：固定核心节点位置，外围节点用聚类合并展示。

### 题目

用 D3 做一张几千节点的关系图，怎么做才能不卡？

### 答案要点

- 物理仿真：`d3-force` 默认 N²，节点过千就会卡；用 `simulation.alphaDecay` 加快收敛
- 渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点
- 分层：固定核心节点位置，外围节点用聚类合并展示
- 交互：拖拽时只重启局部仿真，hover 用四叉树查询提速
- 视图：缩放层级抽稀（zoom in 才显示标签），减少标签数量
- 异步：仿真放 Web Worker，主线程只负责绘制

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「D3 力导向图（Force-directed Graph）实战要点」时要先说清输入规模、复杂度上限和内存预算，这三项决定 D3 是否可行。
- 失败场景：例如漏掉重复值/越界输入，D3 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

### 代码示例

```ts
import * as d3 from 'd3';

interface Node {
  id: string;
  group: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}
interface Link {
  source: string | Node;
  target: string | Node;
}

export function buildSimulation(nodes: Node[], links: Link[], canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const sim = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink<Node, Link>(links)
        .id((d) => d.id)
        .distance(40),
    )
    .force('charge', d3.forceManyBody().strength(-30))
    .force('center', d3.forceCenter(canvas.width / 2, canvas.height / 2))
    .alphaDecay(0.05);

  sim.on('tick', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cbd5e1';
    for (const l of links) {
      const s = l.source as Node;
      const t = l.target as Node;
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.stroke();
    }
    for (const n of nodes) {
      ctx.fillStyle = d3.schemeCategory10[n.group];
      ctx.beginPath();
      ctx.arc(n.x!, n.y!, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  return sim;
}
```

### 追问

- 「D3 力导向图（Force-directed Graph）实战要点」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「D3 力导向图（Force-directed Graph）实战要点」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 D3、力导向、图，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- "好用的图可视化"通常不是技术难，而是布局设计难，要和业务一起迭代
- 节点超过 5 万考虑 Cytoscape.js / Sigma.js / 自研 GPU 着色

## canvas-vs-svg-vs-webgl

title: Canvas / SVG / WebGL 怎么选，性能边界在哪
followups: [canvas-vs-svg-vs-webgl-followup-1, canvas-vs-svg-vs-webgl-followup-2, canvas-vs-svg-vs-webgl-followup-3]
links: [canvas-svg, chart-export-printing, chart-interaction-tooltip]
difficulty: 进阶
tags: [Canvas, SVG, WebGL]

### 一句话

图表 / 动画且元素可点击 → SVG（DOM，但 1 万节点会卡）；像素操作、游戏、大量元素 → Canvas 2D；3D / GPU 算力 → WebGL / WebGPU。

### 题目

请对比 Canvas、SVG、WebGL 在渲染模型、交互、性能上的差异。

### 答案要点

- **SVG**
  - DOM 元素，原生支持事件、CSS 样式、可访问性
  - 适合数据可视化（< 1k 节点）、图标、动画 path
  - 缺点：节点超过几千会肉眼可见卡顿
- **Canvas 2D**
  - 立即模式（绘制完无对象记忆），用 JS API 画像素
  - 适合大量元素、像素级操作（图片处理、画板）
  - 缺点：交互需自己做 hitTest（或维护一个隐藏的对象树）
  - 离屏 Canvas + Worker（OffscreenCanvas）让渲染不卡主线程
- **WebGL / WebGPU**
  - 用 GPU 着色器，可处理百万级几何
  - 适合 3D、地图、粒子、滤镜、ML 推理
  - 上手成本最高（着色器 / 矩阵 / 缓冲区），常用 Three.js / Babylon.js / PixiJS（PixiJS 8 默认 WebGPU）封装
- **性能边界经验值**：SVG 千级节点、Canvas 万级、WebGL 百万级

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Canvas / SVG / WebGL 怎么选，性能边界在哪」必须先给 Canvas 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，Canvas 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 Canvas 的计算与缓存路径。

### 代码示例

```js
const canvas = new OffscreenCanvas(800, 600);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0ea5e9';
ctx.fillRect(0, 0, 800, 600);
const blob = await canvas.convertToBlob();

import * as THREE from 'three';
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }),
);
scene.add(cube);
```

### 追问

- 你会先看哪些指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Canvas / SVG / WebGL 怎么选，性能边界在哪」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Canvas、SVG、WebGL，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- ECharts 4 默认 Canvas，5 同时支持 SVG，可在小图场景切回 SVG 节省内存
- AntV / G2 / G6 都基于 Canvas / WebGL，G2 高版本支持 GPU 加速
- WebGPU 是更现代的接口，2025 起主流浏览器全面铺开

## map-visualization

title: 地图可视化怎么做？数据点 / 热力图 / 行政区划
followups: [map-visualization-followup-1, map-visualization-followup-2, map-visualization-followup-3]
difficulty: 进阶
tags: [可视化, 地图, 高频]

### 一句话

底图选 mapbox-gl / maplibre-gl（矢量瓦片，可换样式）或国产高德 / 百度（合规）；点位 < 1 万用 Marker；> 1 万用 Canvas / WebGL 图层（deck.gl）；行政区划用 GeoJSON + topojson 压缩；热力图用 heatmap layer 内置渲染。

### 题目

要做一个全国订单分布大屏：1. 标记 5 万订单点 2. 城市级热力 3. 省级行政区划着色。技术怎么选？

### 答案要点

- **底图选型**
  - **mapbox-gl-js / maplibre-gl**：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
  - **leaflet**：轻量但栅格瓦片为主，量大较卡
  - **高德 / 百度地图 JS API**：国内合规、行政边界数据现成
  - **deck.gl**：WebGL 图层化引擎，可叠在 mapbox / google 上，海量点首选
- **点位渲染**
  - Marker DOM（< 200 点）：简单但元素多就卡
  - Canvas 自绘（< 5 万）：性能尚可
  - WebGL（deck.gl ScatterplotLayer，5 万 - 千万）：GPU 渲染，丝滑
- **聚合**
  - supercluster：客户端聚合，缩放级别变化时重算
  - 服务端聚合：拉数据时按 zoom 已经分桶
- **热力图**
  - mapbox/maplibre 的 `heatmap` layer：内置高斯模糊渲染
  - deck.gl HeatmapLayer：WebGL 实现，支持权重
  - 自定义：逐点画半透明圆，叠加形成热度
- **行政区划**
  - 数据：GeoJSON（简单）或 topojson（小 4-5 倍，需要解码）
  - 中国国家测绘局对国境线有合规要求，国内项目建议用国产地图或经审核的 GeoJSON
  - 着色：根据指标填色（choropleth），用 d3-scale 配色
- **性能 / 体验**
  - 大底图首屏延迟：用合适 zoom / center 直达目标区域
  - 上千点点击事件：用 `queryRenderedFeatures(point)` 精准 hit
  - 移动端：减少图层数 + 降级到 raster
  - 视口变化时按需 lazy 加载点（拖到哪加载哪）
- **国际化**
  - mapbox 支持多语言切换 `text-field: ['get', 'name_zh-Hant']`
  - 一些国家的边界政治敏感，按部署地区切样式

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 地图可视化怎么做 结论失真。
- 失败场景：例如忽略极端输入规模，地图可视化怎么做 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「地图可视化怎么做？数据点 / 热力图 / 行政区划」优先保证规模上限可控。

### 代码示例

```ts
import maplibregl from 'maplibre-gl';
import { ScatterplotLayer } from '@deck.gl/layers';
import { MapboxOverlay } from '@deck.gl/mapbox';

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [104, 35],
  zoom: 4,
});

const scatter = new ScatterplotLayer({
  id: 'orders',
  data: orders,
  getPosition: (d) => [d.lng, d.lat],
  getRadius: 60,
  getFillColor: [22, 119, 255, 180],
  pickable: true,
  onHover: ({ object }) => showTooltip(object),
});

map.on('load', () => {
  map.addControl(new MapboxOverlay({ layers: [scatter] }));

  map.addSource('cities', {
    type: 'geojson',
    data: cityHeatGeoJSON,
  });
  map.addLayer({
    id: 'heat',
    type: 'heatmap',
    source: 'cities',
    paint: {
      'heatmap-weight': ['get', 'value'],
      'heatmap-intensity': 1,
      'heatmap-radius': 30,
    },
  });
});
```

### 追问

- 「地图可视化怎么做？数据点 / 热力图 / 行政区划」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「地图可视化怎么做？数据点 / 热力图 / 行政区划」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 可视化、地图、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 实时点位（车辆 / 配送）：WebSocket 推 + 增量更新 layer data
- 3D 地图：deck.gl 的 ColumnLayer / TripsLayer，立体感强
- 离线场景：自部署矢量瓦片服务（Tegola / Tippecanoe）

## chart-export-printing

title: 图表 / 看板怎么导出图片 / PDF？
followups: [chart-export-printing-followup-1, chart-export-printing-followup-2, chart-export-printing-followup-3]
links: [canvas-svg, canvas-vs-svg-vs-webgl, chart-interaction-tooltip]
difficulty: 进阶
tags: [可视化, 导出, PDF]

### 一句话

**单图导出**用框架自带 API（ECharts.getDataURL / Highcharts exportChart）—— 矢量友好；**整页导出**用 html2canvas 截屏 → jsPDF 拼 PDF，或者 Puppeteer 服务端渲染（最佳质量）；移动端 / 内嵌设备性能差时只能服务端。

### 题目

看板要支持"导出当前页为 PDF / PNG"。性能 / 清晰度 / 字体 / 跨域图片各种坑怎么解？

### 答案要点

- **单图导出**
  - ECharts：`chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })`
  - 或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）
  - 复制到剪贴板：`navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`
- **整页导出（客户端方案）**
  - html2canvas：把 DOM 转 canvas → toDataURL
  - jsPDF：按 A4 比例分页拼接
  - 注意 scale：默认 1 倍清晰度差，建议 `scale: 2` （retina）
  - 避免被截断：在 export 模式下临时改样式（去掉 max-height / 滚动）
- **整页导出（服务端方案，最佳）**
  - Puppeteer / Playwright headless：访问"打印模式 URL" → `page.pdf()`
  - 优势：字体渲染完美、无浏览器差异、CSS @media print 生效
  - 劣势：要服务端资源、需要登录态（注入 cookie / token）
- **跨域图片坑**
  - html2canvas 截图会读 canvas 像素 → 跨域图必须 `crossorigin="anonymous"` + 服务端配 CORS 头
  - 否则报"tainted canvas"错误
- **字体坑**
  - Web Font 没加载完时截图字体 fallback
  - export 前 `await document.fonts.ready`
  - PDF 嵌入字体（jsPDF 默认西文，中文需要手动 addFont）
- **图表特殊处理**
  - Canvas 图表（ECharts canvas mode）：html2canvas 不会画，需要先 getDataURL → 替换成 img 元素
  - WebGL 图表：context 创建时要 `preserveDrawingBuffer: true` 才能截图
- **大尺寸 / 高清**
  - 4K 分辨率导出：scale 4-8，注意内存峰值
  - 超长页面（瀑布流）：分页截图后纵向拼接
- **印刷友好**
  - @media print 隐藏导航 / 调整间距
  - 颜色用 CMYK 不可能（浏览器只支持 RGB），但确保深色文字 + 浅色背景对比足

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 图表 结论失真。
- 失败场景：例如忽略极端输入规模，图表 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「图表 / 看板怎么导出图片 / PDF」优先保证规模上限可控。

### 代码示例

```ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function exportPdf() {
  await document.fonts.ready;

  document.querySelectorAll('canvas[data-echart]').forEach((cv: any) => {
    const chart = echarts.getInstanceByDom(cv);
    const url = chart?.getDataURL({ pixelRatio: 2, backgroundColor: '#fff' });
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = cv.style.cssText;
    cv.replaceWith(img);
  });

  const target = document.querySelector('#dashboard') as HTMLElement;
  const canvas = await html2canvas(target, {
    scale: 2,
    backgroundColor: '#fff',
    useCORS: true,
  });

  const pdf = new jsPDF('l', 'pt', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = (canvas.height * pw) / canvas.width;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, ph);
  pdf.save('dashboard.pdf');
}
```

### 追问

- 「图表 / 看板怎么导出图片 / PDF」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「图表 / 看板怎么导出图片 / PDF？」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 可视化、导出、PDF，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 服务端方案对 SEO / 邮件订阅 dashboard 截图很合适
- iText / wkhtmltopdf 老牌方案，但 CSS3 / Web Font 支持不如 Puppeteer
- Excel 导出：SheetJS / exceljs，图表导出为图片嵌入

## chart-library-choice-basic

title: ECharts、AntV、D3、Chart.js、Plotly 怎么选？
followups: [chart-library-choice-basic-followup-1, chart-library-choice-basic-followup-2, chart-library-choice-basic-followup-3]
links: [canvas-svg, canvas-vs-svg-vs-webgl, chart-export-printing]
difficulty: 基础
tags: [可视化, 选型, 基础]

### 一句话

通用图表 → ECharts / Chart.js；地图 + 大屏 + 业务图 → ECharts / AntV；自由度高 / 学术风 → D3；交互探索 → Plotly；纯前端 + 包小 → Chart.js。

### 题目

列举常见图表库的定位差异，怎么挑？

### 答案要点

- **ECharts**：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- **AntV**（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先
- **D3**：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡
- **Chart.js**：体积小（70KB+），配置简单，适合中小图表
- **Plotly.js**：交互探索（滑动、缩放、3D）一流，科学计算 / Dashboard 常用，体积大
- **Recharts / Visx**：React 生态，组件式，适合产品级 dashboard

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「ECharts、AntV、D3、Chart.js、Plotly 怎么选」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const chart = echarts.init(document.getElementById('c')!);
chart.setOption({
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [120, 200, 150] }],
});
```

### 常见误区

- 大屏用 D3 从零写——开发成本太高
- ECharts 一把梭包进 vendor —— 没按需打包，bundle 直接 +900KB
- 复杂关系图用 ECharts graph —— 不如 G6 顺手

### 追问

- 上万点散点图卡顿怎么办（WebGL / Canvas 替代 SVG / 抽样）
- 图表交互（tooltip / brush / linked view）怎么设计
- 图表性能基线（首屏渲染 200ms）怎么保

### 延伸

- 现代趋势：Apache ECharts 5 + WebGPU；Visx 2.x 在 React 19 表现良好
- D3 + Observable 是图表设计师的好工具链

## canvas-svg-followup-1

title: 追问：面对真实流量和复杂依赖时，「Canvas 与 SVG 如何选」最可能被哪些 Canvas 边界条件击穿
difficulty: 基础
tags: [Canvas, SVG, 追问]
parent: canvas-svg

### 一句话

先界定「Canvas 与 SVG 如何选」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「SVG 是声明式 DOM 图形。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「Canvas 与 SVG 如何选」最可能被哪些 Canvas 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论：SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- 机制：Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果；SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱
- 落地动作：回答「面对真实流量和复杂依赖时，「Canvas 与 SVG 如何选」最可能被哪些 Canvas 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「面对真实流量和复杂依赖时，「Canvas 与 SVG 如何选」最可能被哪些 Canvas 边界条件击穿」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果
- SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱

## chart-performance-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 ECharts 相关的指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈
difficulty: 进阶
tags: [ECharts, 性能, 追问]
parent: chart-performance

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「ECharts 大数据渲染优化思路」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 ECharts 相关的指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 机制：渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol；渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来
- 落地动作：回答「在当前团队与业务约束下，你会先看哪些与 ECharts 相关的指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 你会先看哪些与 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，你会先看哪些与 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在当前团队与业务约束下，你会先看哪些与 ECharts 相关的指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈」采用小步优化更稳。

#### 关键细节（可追问）

- 数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol
- 渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来

## d3-thinking-followup-1

title: 追问：结合真实业务约束，你会如何围绕 D3 提前识别「D3 的核心思想不是“画图库”，而是数据驱动映射」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [D3, 数据映射, 追问]
parent: d3-thinking

### 一句话

先界定「D3 的核心思想不是“画图库”，而是数据驱动映射」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「D3 是底层映射工具集。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 D3 提前识别「D3 的核心思想不是“画图库”，而是数据驱动映射」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- 机制：ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快；D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）
- 落地动作：回答「结合真实业务约束，你会如何围绕 D3 提前识别「D3 的核心思想不是“画图库”，而是数据驱动映射」中的复杂度陷阱，避免实现后期返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会如何围绕 D3 提前识别「D3 的核心思想不是“画图库”，而是数据驱动映射」中的复杂度陷阱，避免实现后期返工」时先约定 你会如何围绕 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 你会如何围绕 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快
- D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）

## animation-raf-followup-1

title: 追问：你会如何围绕 动画 提前识别「requestAnimationFrame 与图形动画节奏控制」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [动画, RAF, 追问]
parent: animation-raf

### 一句话

先界定「requestAnimationFrame 与图形动画节奏控制」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：你会如何围绕 动画 提前识别「requestAnimationFrame 与图形动画节奏控制」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 机制：页面后台时会自动降频；可结合时间差 deltaTime 做与帧率无关的动画速度控制
- 落地动作：回答「你会如何围绕 动画 提前识别「requestAnimationFrame 与图形动画节奏控制」中的复杂度陷阱，避免实现后期返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何围绕 动画 提前识别「requestAnimationFrame 与图形动画节奏控制」中的复杂度陷阱，避免实现后期返工」时先约定 你会如何围绕 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 你会如何围绕 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 页面后台时会自动降频
- 可结合时间差 deltaTime 做与帧率无关的动画速度控制

## webgl-webgpu-followup-1

title: 追问：如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项
difficulty: 进阶
tags: [WebGL, WebGPU, 追问]
parent: webgl-webgpu

### 一句话

先界定「WebGL 与 WebGPU 的前端视角」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- 机制：Three.js 提供更高层抽象，适合业务快速落地；WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估
- 落地动作：回答「如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项」时要把 WebGL 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，WebGL 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项」里当前按阶段替换更稳。

#### 关键细节（可追问）

- WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- Three.js 提供更高层抽象，适合业务快速落地
- WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估

## dashboard-adaptation-followup-1

title: 追问：真要把「大屏适配与多分辨率设计」推到线上，你会如何围绕 大屏 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [大屏, 适配, 追问]
parent: dashboard-adaptation

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「大屏适配与多分辨率设计」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：真要把「大屏适配与多分辨率设计」推到线上，你会如何围绕 大屏 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 机制：更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算；需要特别处理 DPR、字体渲染和图表容器尺寸变更
- 落地动作：回答「真要把「大屏适配与多分辨率设计」推到线上，你会如何围绕 大屏 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「真要把「大屏适配与多分辨率设计」推到线上，你会如何围绕 大屏 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- 大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算
- 需要特别处理 DPR、字体渲染和图表容器尺寸变更

## chart-interaction-tooltip-followup-1

title: 追问：如果复盘「图表交互的几个关键点（联动 / hover / brush / 缩放）」，你会优先检查哪些边界条件和复杂度坑
difficulty: 进阶
tags: [可视化, 交互, 追问]
parent: chart-interaction-tooltip

### 一句话

先界定「图表交互的几个关键点（联动 / hover / brush / 缩放）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果复盘「图表交互的几个关键点（联动 / hover / brush / 缩放）」，你会优先检查哪些边界条件和复杂度坑？

### 答案要点

#### 标准回答（直接作答）

- 结论：节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 机制：联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引；Brush：选区交互需要支持 keyboard ESC 取消、双击重置
- 落地动作：回答「如果复盘「图表交互的几个关键点（联动 / hover / brush / 缩放）」，你会优先检查哪些边界条件和复杂度坑」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果复盘「图表交互的几个关键点（联动 / hover / brush / 缩放）」，你会优先检查哪些边界条件和复杂度坑」时要先说清输入规模、复杂度上限和内存预算，这三项决定 图表交互的几个关键点 是否可行。
- 失败场景：例如漏掉重复值/越界输入，图表交互的几个关键点 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- 节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引
- Brush：选区交互需要支持 keyboard ESC 取消、双击重置

## d3-force-network-followup-1

title: 追问：如果要评估「D3 力导向图（Force-directed Graph）实战要点」的稳定性，你会优先排查哪些复杂度相关边界
difficulty: 资深
tags: [D3, 力导向, 图, 追问]
parent: d3-force-network

### 一句话

先界定「D3 力导向图（Force-directed Graph）实战要点」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「D3 力导向图（Force-directed Graph）实战要点」的稳定性，你会优先排查哪些复杂度相关边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 机制：渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点；分层：固定核心节点位置，外围节点用聚类合并展示
- 落地动作：回答「如果要评估「D3 力导向图（Force-directed Graph）实战要点」的稳定性，你会优先排查哪些复杂度相关边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「D3 力导向图（Force-directed Graph）实战要点」的稳定性，你会优先排查哪些复杂度相关边界」时要先说清输入规模、复杂度上限和内存预算，这三项决定 D3 是否可行。
- 失败场景：例如漏掉重复值/越界输入，D3 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- 物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点
- 分层：固定核心节点位置，外围节点用聚类合并展示

## canvas-vs-svg-vs-webgl-followup-1

title: 追问：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」场景下，你会先看哪些与 Canvas 相关的指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈
difficulty: 进阶
tags: [Canvas, SVG, WebGL, 追问]
parent: canvas-vs-svg-vs-webgl

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Canvas / SVG / WebGL 怎么选，性能边界在哪」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」场景下，你会先看哪些与 Canvas 相关的指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：DOM 元素，原生支持事件、CSS 样式、可访问性
- 机制：适合数据可视化（< 1k 节点）、图标、动画 path；缺点：节点超过几千会肉眼可见卡顿
- 落地动作：回答「在「Canvas / SVG / WebGL 怎么选，性能边界在哪」场景下，你会先看哪些与 Canvas 相关的指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Canvas / SVG / WebGL 怎么选，性能边界在哪」场景下，你会先看哪些与 Canvas 相关的指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈」必须先给 Canvas 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，Canvas 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 Canvas 的计算与缓存路径。

#### 关键细节（可追问）

- DOM 元素，原生支持事件、CSS 样式、可访问性
- 适合数据可视化（< 1k 节点）、图标、动画 path
- 缺点：节点超过几千会肉眼可见卡顿

## map-visualization-followup-1

title: 追问：围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱
difficulty: 进阶
tags: [可视化, 地图, 高频, 追问]
parent: map-visualization

### 一句话

先界定「地图可视化怎么做？数据点 / 热力图 / 行政区划」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱？

### 答案要点

#### 标准回答（直接作答）

- 结论：mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- 机制：leaflet：轻量但栅格瓦片为主，量大较卡；高德 / 百度地图 JS API：国内合规、行政边界数据现成
- 落地动作：回答「围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱」时要先说清输入规模、复杂度上限和内存预算，这三项决定 地图可视化怎么做 是否可行。
- 失败场景：例如漏掉重复值/越界输入，地图可视化怎么做 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- leaflet：轻量但栅格瓦片为主，量大较卡
- 高德 / 百度地图 JS API：国内合规、行政边界数据现成

## chart-export-printing-followup-1

title: 追问：围绕「图表 / 看板怎么导出图片 / PDF」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱
difficulty: 进阶
tags: [可视化, 导出, PDF, 追问]
parent: chart-export-printing

### 一句话

先界定「图表 / 看板怎么导出图片 / PDF」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「图表 / 看板怎么导出图片 / PDF」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱？

### 答案要点

#### 标准回答（直接作答）

- 结论：ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 机制：或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）；复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
- 落地动作：回答「围绕「图表 / 看板怎么导出图片 / PDF」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「图表 / 看板怎么导出图片 / PDF」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱」时要先说清输入规模、复杂度上限和内存预算，这三项决定 图表 是否可行。
- 失败场景：例如漏掉重复值/越界输入，图表 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）
- 复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])

## chart-library-choice-basic-followup-1

title: 追问：面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿
difficulty: 基础
tags: [可视化, 选型, 基础, 追问]
parent: chart-library-choice-basic

### 一句话

先界定「ECharts、AntV、D3、Chart.js、Plotly 怎么选」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论：ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- 机制：AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先；D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡
- 落地动作：回答「面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿」时要把 面对真实流量和复杂依 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，面对真实流量和复杂依 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿」里当前按阶段替换更稳。

#### 关键细节（可追问）

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡

## chart-performance-followup-2

title: 追问：以「ECharts 大数据渲染优化思路」为例，你会怎样验证「ECharts 大数据渲染优化思路」在 ECharts 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [ECharts, 性能, 追问]
parent: chart-performance
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「ECharts 大数据渲染优化思路」不是只在理想输入下成立。；再补可观测指标：围绕「ECharts 大数据渲染优化思路」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「ECharts 大数据渲染优化思路」为例，你会怎样验证「ECharts 大数据渲染优化思路」在 ECharts 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 机制：渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol；渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来
- 落地动作：回答「以「ECharts 大数据渲染优化思路」为例，你会怎样验证「ECharts 大数据渲染优化思路」在 ECharts 维度上的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「ECharts 大数据渲染优化思路」为例，你会怎样验证「ECharts 大数据渲染优化思路」在 ECharts 维度上的优化收益在真实设备和真实网络下也成立」必须先给 ECharts 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，ECharts 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 ECharts 的计算与缓存路径。

#### 关键细节（可追问）

- 数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol
- 渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来

## chart-performance-followup-3

title: 追问：如果「ECharts 大数据渲染优化思路」在 ECharts 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 进阶
tags: [ECharts, 性能, 追问]
parent: chart-performance
generated: followup-script

### 一句话

推动「ECharts 大数据渲染优化思路」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「ECharts 大数据渲染优化思路」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：如果「ECharts 大数据渲染优化思路」在 ECharts 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 机制：渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol；渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来
- 落地动作：回答「如果「ECharts 大数据渲染优化思路」在 ECharts 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 ECharts 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，ECharts 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「如果「ECharts 大数据渲染优化思路」在 ECharts 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」采用小步优化更稳。

#### 关键细节（可追问）

- 数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol
- 渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来

## d3-thinking-followup-2

title: 追问：如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [D3, 数据映射, 追问]
parent: d3-thinking
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「D3 的核心思想不是“画图库”，而是数据驱动映射」讲成只在理想输入下可用。；围绕「D3 的核心思想不是“画图库”，而是数据驱动映射」组织答案时，建议按「约束来源 -> D3 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 标准回答（直接作答）

- 结论：D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- 机制：ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快；D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）
- 落地动作：回答「如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 并发量或页面复杂度扩 结论失真。
- 失败场景：例如忽略极端输入规模，并发量或页面复杂度扩 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」优先保证规模上限可控。

#### 关键细节（可追问）

- D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快
- D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）

## d3-thinking-followup-3

title: 追问：以「D3 的核心思想不是“画图库”，而是数据驱动映射」为例，为了让团队信服「D3 的核心思想不是“画图库”，而是数据驱动映射」正确，你会先补哪几类高价值校验与断言
difficulty: 进阶
tags: [D3, 数据映射, 追问]
parent: d3-thinking
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「D3 的核心思想不是“画图库”，而是数据驱动映射」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> D3 方案动作 -> 验证结果」，并用「D3 的核心思想不是“画图库”。

### 题目

如果面试官追问：以「D3 的核心思想不是“画图库”，而是数据驱动映射」为例，为了让团队信服「D3 的核心思想不是“画图库”，而是数据驱动映射」正确，你会先补哪几类高价值校验与断言？

### 答案要点

#### 标准回答（直接作答）

- 结论：D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- 机制：ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快；D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）
- 落地动作：回答「以「D3 的核心思想不是“画图库”，而是数据驱动映射」为例，为了让团队信服「D3 的核心思想不是“画图库”，而是数据驱动映射」正确，你会先补哪几类高价值校验与断言」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 D3 结论失真。
- 失败场景：例如忽略极端输入规模，D3 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「以「D3 的核心思想不是“画图库”，而是数据驱动映射」为例，为了让团队信服「D3 的核心思想不是“画图库”，而是数据驱动映射」正确，你会先补哪几类高价值校验与断言」优先保证规模上限可控。

#### 关键细节（可追问）

- D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快
- D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）

## animation-raf-followup-2

title: 追问：以「requestAnimationFrame 与图形动画节奏控制」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [动画, RAF, 追问]
parent: animation-raf
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「requestAnimationFrame 与图形动画节奏控制」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 动画 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：以「requestAnimationFrame 与图形动画节奏控制」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 标准回答（直接作答）

- 结论：requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 机制：页面后台时会自动降频；可结合时间差 deltaTime 做与帧率无关的动画速度控制
- 落地动作：回答「以「requestAnimationFrame 与图形动画节奏控制」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「requestAnimationFrame 与图形动画节奏控制」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」时要先说清输入规模、复杂度上限和内存预算，这三项决定 requestAnimationFrame 是否可行。
- 失败场景：例如漏掉重复值/越界输入，requestAnimationFrame 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 页面后台时会自动降频
- 可结合时间差 deltaTime 做与帧率无关的动画速度控制

## animation-raf-followup-3

title: 追问：结合真实业务约束，如果要在评审里证明「requestAnimationFrame 与图形动画节奏控制」可长期维护，你会展示哪些围绕 动画 的正确性证据
difficulty: 进阶
tags: [动画, RAF, 追问]
parent: animation-raf
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「requestAnimationFrame 与图形动画节奏控制」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 动画 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：结合真实业务约束，如果要在评审里证明「requestAnimationFrame 与图形动画节奏控制」可长期维护，你会展示哪些围绕 动画 的正确性证据？

### 答案要点

#### 标准回答（直接作答）

- 结论：requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 机制：页面后台时会自动降频；可结合时间差 deltaTime 做与帧率无关的动画速度控制
- 落地动作：回答「结合真实业务约束，如果要在评审里证明「requestAnimationFrame 与图形动画节奏控制」可长期维护，你会展示哪些围绕 动画 的正确性证据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 requestAnimationFrame 结论失真。
- 失败场景：例如忽略极端输入规模，requestAnimationFrame 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「结合真实业务约束，如果要在评审里证明「requestAnimationFrame 与图形动画节奏控制」可长期维护，你会展示哪些围绕 动画 的正确性证据」优先保证规模上限可控。

#### 关键细节（可追问）

- requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 页面后台时会自动降频
- 可结合时间差 deltaTime 做与帧率无关的动画速度控制

## dashboard-adaptation-followup-2

title: 追问：以「大屏适配与多分辨率设计」为例，面对团队能力差异，你会如何围绕 大屏 把「大屏适配与多分辨率设计」拆成可并行推进的小阶段
difficulty: 进阶
tags: [大屏, 适配, 追问]
parent: dashboard-adaptation
generated: followup-script

### 一句话

推动「大屏适配与多分辨率设计」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「大屏适配与多分辨率设计」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：以「大屏适配与多分辨率设计」为例，面对团队能力差异，你会如何围绕 大屏 把「大屏适配与多分辨率设计」拆成可并行推进的小阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 机制：更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算；需要特别处理 DPR、字体渲染和图表容器尺寸变更
- 落地动作：回答「以「大屏适配与多分辨率设计」为例，面对团队能力差异，你会如何围绕 大屏 把「大屏适配与多分辨率设计」拆成可并行推进的小阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 大屏适配与多分辨率设 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 大屏适配与多分辨率设，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「大屏适配与多分辨率设计」为例，面对团队能力差异，你会如何围绕 大屏 把「大屏适配与多分辨率设计」拆成可并行推进的小阶段」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算
- 需要特别处理 DPR、字体渲染和图表容器尺寸变更

## dashboard-adaptation-followup-3

title: 追问：以「大屏适配与多分辨率设计」为例，半年后要做去留决策时，你会拿哪些数据判断「大屏适配与多分辨率设计」还值不值得继续维护
difficulty: 进阶
tags: [大屏, 适配, 追问]
parent: dashboard-adaptation
generated: followup-script

### 一句话

规模变大后先重新评估「大屏适配与多分辨率设计」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「大屏适配与多分辨率设计」对应的工程可维护性收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：以「大屏适配与多分辨率设计」为例，半年后要做去留决策时，你会拿哪些数据判断「大屏适配与多分辨率设计」还值不值得继续维护？

### 答案要点

#### 标准回答（直接作答）

- 结论：大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 机制：更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算；需要特别处理 DPR、字体渲染和图表容器尺寸变更
- 落地动作：回答「以「大屏适配与多分辨率设计」为例，半年后要做去留决策时，你会拿哪些数据判断「大屏适配与多分辨率设计」还值不值得继续维护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 大屏适配与多分辨率设 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 大屏适配与多分辨率设，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「大屏适配与多分辨率设计」为例，半年后要做去留决策时，你会拿哪些数据判断「大屏适配与多分辨率设计」还值不值得继续维护」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算
- 需要特别处理 DPR、字体渲染和图表容器尺寸变更

## chart-interaction-tooltip-followup-2

title: 追问：以「图表交互的几个关键点（联动 / hover / brush / 缩放）」为例，如果数据规模扩大一个数量级，你会如何围绕 可视化 调整数据结构或算法
difficulty: 进阶
tags: [可视化, 交互, 追问]
parent: chart-interaction-tooltip
generated: followup-script

### 一句话

规模变大后先重新评估「图表交互的几个关键点（联动 / hover / brush / 缩放）」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：以「图表交互的几个关键点（联动 / hover / brush / 缩放）」为例，如果数据规模扩大一个数量级，你会如何围绕 可视化 调整数据结构或算法？

### 答案要点

#### 标准回答（直接作答）

- 结论：节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 机制：联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引；Brush：选区交互需要支持 keyboard ESC 取消、双击重置
- 落地动作：回答「以「图表交互的几个关键点（联动 / hover / brush / 缩放）」为例，如果数据规模扩大一个数量级，你会如何围绕 可视化 调整数据结构或算法」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「图表交互的几个关键点（联动 / hover / brush / 缩放）」为例，如果数据规模扩大一个数量级，你会如何围绕 可视化 调整数据结构或算法」时要先说清输入规模、复杂度上限和内存预算，这三项决定 图表交互的几个关键点 是否可行。
- 失败场景：例如漏掉重复值/越界输入，图表交互的几个关键点 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- 节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引
- Brush：选区交互需要支持 keyboard ESC 取消、双击重置

## chart-interaction-tooltip-followup-3

title: 追问：从工程落地角度看，围绕「图表交互的几个关键点」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”
difficulty: 进阶
tags: [可视化, 交互, 追问]
parent: chart-interaction-tooltip
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「图表交互的几个关键点」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 可视化 机制 -> 取舍边界」回答，再用「图表交互的几个关键点」补一个反例，避免停在口号层。；如果涉及「图表交互的几个关键点」的技术细节。

### 题目

如果面试官追问：从工程落地角度看，围绕「图表交互的几个关键点」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”？

### 答案要点

#### 标准回答（直接作答）

- 结论：节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 机制：联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引；Brush：选区交互需要支持 keyboard ESC 取消、双击重置
- 落地动作：回答「从工程落地角度看，围绕「图表交互的几个关键点」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，围绕「图表交互的几个关键点」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引
- Brush：选区交互需要支持 keyboard ESC 取消、双击重置

## d3-force-network-followup-2

title: 追问：在当前团队与业务约束下，如果数据规模扩大一个数量级，你会如何围绕 D3 调整数据结构或算法
difficulty: 资深
tags: [D3, 力导向, 图, 追问]
parent: d3-force-network
generated: followup-script

### 一句话

规模变大后先重新评估「D3 力导向图（Force-directed Graph）实战要点」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果数据规模扩大一个数量级，你会如何围绕 D3 调整数据结构或算法？

### 答案要点

#### 标准回答（直接作答）

- 结论：物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 机制：渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点；分层：固定核心节点位置，外围节点用聚类合并展示
- 落地动作：回答「在当前团队与业务约束下，如果数据规模扩大一个数量级，你会如何围绕 D3 调整数据结构或算法」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 数量级 结论失真。
- 失败场景：例如忽略极端输入规模，数量级 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「在当前团队与业务约束下，如果数据规模扩大一个数量级，你会如何围绕 D3 调整数据结构或算法」优先保证规模上限可控。

#### 关键细节（可追问）

- 物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点
- 分层：固定核心节点位置，外围节点用聚类合并展示

## d3-force-network-followup-3

title: 追问：结合真实业务约束，如果要让「D3 力导向图（Force-directed Graph）实战要点」的正确性可复核，你会围绕 D3 设计哪些验证步骤
difficulty: 资深
tags: [D3, 力导向, 图, 追问]
parent: d3-force-network
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「D3 力导向图（Force-directed Graph）实战要点」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，如果要让「D3 力导向图（Force-directed Graph）实战要点」的正确性可复核，你会围绕 D3 设计哪些验证步骤？

### 答案要点

#### 标准回答（直接作答）

- 结论：物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 机制：渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点；分层：固定核心节点位置，外围节点用聚类合并展示
- 落地动作：回答「结合真实业务约束，如果要让「D3 力导向图（Force-directed Graph）实战要点」的正确性可复核，你会围绕 D3 设计哪些验证步骤」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果要让「D3 力导向图（Force-directed Graph）实战要点」的正确性可复核，你会围绕 D3 设计哪些验证步骤」时要先定义 D3 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，D3 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 D3 关键链路先收敛再替换。

#### 关键细节（可追问）

- 物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点
- 分层：固定核心节点位置，外围节点用聚类合并展示

## canvas-vs-svg-vs-webgl-followup-2

title: 追问：以「Canvas / SVG / WebGL 怎么选，性能边界在哪」为例，要证明「Canvas / SVG / WebGL 怎么选，性能边界在哪」确实改善体验，你会如何围绕 Canvas 设计线上观测与对照验证
difficulty: 进阶
tags: [Canvas, SVG, WebGL, 追问]
parent: canvas-vs-svg-vs-webgl
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Canvas / SVG / WebGL 怎么选，性能边界在哪」不是只在理想输入下成立。；再补可观测指标：围绕「Canvas / SVG / WebGL 怎么选。

### 题目

如果面试官追问：以「Canvas / SVG / WebGL 怎么选，性能边界在哪」为例，要证明「Canvas / SVG / WebGL 怎么选，性能边界在哪」确实改善体验，你会如何围绕 Canvas 设计线上观测与对照验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：DOM 元素，原生支持事件、CSS 样式、可访问性
- 机制：适合数据可视化（< 1k 节点）、图标、动画 path；缺点：节点超过几千会肉眼可见卡顿
- 落地动作：回答「以「Canvas / SVG / WebGL 怎么选，性能边界在哪」为例，要证明「Canvas / SVG / WebGL 怎么选，性能边界在哪」确实改善体验，你会如何围绕 Canvas 设计线上观测与对照验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 Canvas 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，Canvas 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「以「Canvas / SVG / WebGL 怎么选，性能边界在哪」为例，要证明「Canvas / SVG / WebGL 怎么选，性能边界在哪」确实改善体验，你会如何围绕 Canvas 设计线上观测与对照验证」采用小步优化更稳。

#### 关键细节（可追问）

- DOM 元素，原生支持事件、CSS 样式、可访问性
- 适合数据可视化（< 1k 节点）、图标、动画 path
- 缺点：节点超过几千会肉眼可见卡顿

## canvas-vs-svg-vs-webgl-followup-3

title: 追问：结合真实业务约束，如果「Canvas / SVG / WebGL 怎么选，性能边界在哪」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 进阶
tags: [Canvas, SVG, WebGL, 追问]
parent: canvas-vs-svg-vs-webgl
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Canvas / SVG / WebGL 怎么选，性能边界在哪」落到真实交付，而不是停在概念层。；讲「Canvas / SVG / WebGL 怎么选，性能边界在哪」时先给 Canvas 的判断口径。

### 题目

如果面试官追问：结合真实业务约束，如果「Canvas / SVG / WebGL 怎么选，性能边界在哪」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 标准回答（直接作答）

- 结论：DOM 元素，原生支持事件、CSS 样式、可访问性
- 机制：适合数据可视化（< 1k 节点）、图标、动画 path；缺点：节点超过几千会肉眼可见卡顿
- 落地动作：回答「结合真实业务约束，如果「Canvas / SVG / WebGL 怎么选，性能边界在哪」优化需要额外工程投入，你会如何证明这笔成本值得支付」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 Canvas 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，Canvas 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「结合真实业务约束，如果「Canvas / SVG / WebGL 怎么选，性能边界在哪」优化需要额外工程投入，你会如何证明这笔成本值得支付」采用小步优化更稳。

#### 关键细节（可追问）

- DOM 元素，原生支持事件、CSS 样式、可访问性
- 适合数据可视化（< 1k 节点）、图标、动画 path
- 缺点：节点超过几千会肉眼可见卡顿

## map-visualization-followup-2

title: 追问：从工程落地角度看，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [可视化, 地图, 高频, 追问]
parent: map-visualization
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「地图可视化怎么做？数据点 / 热力图 / 行政区划」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 可视化 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：从工程落地角度看，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 标准回答（直接作答）

- 结论：mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- 机制：leaflet：轻量但栅格瓦片为主，量大较卡；高德 / 百度地图 JS API：国内合规、行政边界数据现成
- 落地动作：回答「从工程落地角度看，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- leaflet：轻量但栅格瓦片为主，量大较卡
- 高德 / 百度地图 JS API：国内合规、行政边界数据现成

## map-visualization-followup-3

title: 追问：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」场景下，你会怎么证明「地图可视化怎么做？数据点 / 热力图 / 行政区划」实现正确，而不是只靠几个样例跑通
difficulty: 进阶
tags: [可视化, 地图, 高频, 追问]
parent: map-visualization
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「地图可视化怎么做？数据点 / 热力图 / 行政区划」在当前约束下为什么成立。；围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」组织答案时，建议按「约束来源 -> 可视化 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」场景下，你会怎么证明「地图可视化怎么做？数据点 / 热力图 / 行政区划」实现正确，而不是只靠几个样例跑通？

### 答案要点

#### 标准回答（直接作答）

- 结论：mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- 机制：leaflet：轻量但栅格瓦片为主，量大较卡；高德 / 百度地图 JS API：国内合规、行政边界数据现成
- 落地动作：回答「在「地图可视化怎么做？数据点 / 热力图 / 行政区划」场景下，你会怎么证明「地图可视化怎么做？数据点 / 热力图 / 行政区划」实现正确，而不是只靠几个样例跑通」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「地图可视化怎么做？数据点 / 热力图 / 行政区划」场景下，你会怎么证明「地图可视化怎么做？数据点 / 热力图 / 行政区划」实现正确，而不是只靠几个样例跑通」时先约定 地图可视化怎么做 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 地图可视化怎么做 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- leaflet：轻量但栅格瓦片为主，量大较卡
- 高德 / 百度地图 JS API：国内合规、行政边界数据现成

## chart-export-printing-followup-2

title: 追问：在「图表 / 看板怎么导出图片 / PDF」场景下，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [可视化, 导出, PDF, 追问]
parent: chart-export-printing
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「图表 / 看板怎么导出图片 / PDF」落到真实交付，而不是停在概念层。；可以按「问题背景 -> 可视化 机制 -> 取舍边界」回答，再用「图表 / 看板怎么导出图片 / PDF」补一个反例。

### 题目

如果面试官追问：在「图表 / 看板怎么导出图片 / PDF」场景下，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 标准回答（直接作答）

- 结论：ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 机制：或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）；复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
- 落地动作：回答「在「图表 / 看板怎么导出图片 / PDF」场景下，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 图表 结论失真。
- 失败场景：例如忽略极端输入规模，图表 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「在「图表 / 看板怎么导出图片 / PDF」场景下，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」优先保证规模上限可控。

#### 关键细节（可追问）

- ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）
- 复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])

## chart-export-printing-followup-3

title: 追问：在当前团队与业务约束下，当「图表 / 看板怎么导出图片 / PDF」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径
difficulty: 进阶
tags: [可视化, 导出, PDF, 追问]
parent: chart-export-printing
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「图表 / 看板怎么导出图片 / PDF」在当前约束下为什么成立。；回答结构可按「触发条件 -> 可视化 机制 -> 风险兜底」展开，并以「图表 / 看板怎么导出图片 / PDF」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：在当前团队与业务约束下，当「图表 / 看板怎么导出图片 / PDF」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 机制：或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）；复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
- 落地动作：回答「在当前团队与业务约束下，当「图表 / 看板怎么导出图片 / PDF」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 图表 结论失真。
- 失败场景：例如忽略极端输入规模，图表 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「在当前团队与业务约束下，当「图表 / 看板怎么导出图片 / PDF」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径」优先保证规模上限可控。

#### 关键细节（可追问）

- ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）
- 复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])

## chart-library-choice-basic-followup-2

title: 追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表交互怎么设计
difficulty: 基础
tags: [可视化, 选型, 基础, 追问]
parent: chart-library-choice-basic
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「ECharts、AntV、D3、Chart.js、Plotly 怎么选」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 可视化 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表交互（tooltip / brush / linked view）怎么设计？

### 答案要点

#### 标准回答（直接作答）

- 结论：ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- 机制：AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先；D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡
- 落地动作：回答「在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表交互怎么设计」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表交互怎么设计」时要先定义 ECharts 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，ECharts 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 ECharts 关键链路先收敛再替换。

#### 关键细节（可追问）

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡

## chart-library-choice-basic-followup-3

title: 追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表性能基线怎么保
difficulty: 基础
tags: [可视化, 选型, 基础, 追问]
parent: chart-library-choice-basic
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「ECharts、AntV、D3、Chart.js、Plotly 怎么选」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> 可视化 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表性能基线（首屏渲染 200ms）怎么保？

### 答案要点

#### 标准回答（直接作答）

- 结论：ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- 机制：AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先；D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡
- 落地动作：回答「在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表性能基线怎么保」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 ECharts 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，ECharts 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表性能基线怎么保」采用小步优化更稳。

#### 关键细节（可追问）

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡

## canvas-svg-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Canvas 方案有效
difficulty: 基础
tags: [Canvas, SVG, 追问]
parent: canvas-svg
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Canvas 与 SVG 如何选」讲成只在理想输入下可用。；围绕「Canvas 与 SVG 如何选」组织答案时，建议按「约束来源 -> Canvas 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Canvas 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- 机制：Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果；SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱
- 落地动作：回答「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Canvas 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Canvas 方案有效」要明确 为了避免主观判断 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 为了避免主观判断 的高风险边界。

#### 关键细节（可追问）

- SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果
- SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱

## canvas-svg-followup-3

title: 追问：在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级
difficulty: 基础
tags: [Canvas, SVG, 追问]
parent: canvas-svg
generated: followup-script

### 一句话

规模变大后先重新评估「Canvas 与 SVG 如何选」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Canvas 与 SVG 如何选」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- 机制：Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果；SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱
- 落地动作：回答「在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级」时要把 Canvas 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Canvas 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级」里当前按阶段替换更稳。

#### 关键细节（可追问）

- SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果
- SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱

## webgl-webgpu-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 WebGL 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [WebGL, WebGPU, 追问]
parent: webgl-webgpu
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「WebGL 与 WebGPU 的前端视角」落到真实交付，而不是停在概念层。；可以按「问题背景 -> WebGL 机制 -> 取舍边界」回答，再用「WebGL 与 WebGPU 的前端视角」补一个反例。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 WebGL 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- 机制：Three.js 提供更高层抽象，适合业务快速落地；WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估
- 落地动作：回答「在当前团队与业务约束下，上线后你会盯哪些与 WebGL 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Three.js 提供更高层抽象，适合业务快速落地」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，上线后你会盯哪些与 WebGL 相关的日志与指标，来确认这套方案确实带来改进」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- Three.js 提供更高层抽象，适合业务快速落地
- WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估

## webgl-webgpu-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 WebGL 调整方案边界与实施节奏
difficulty: 进阶
tags: [WebGL, WebGPU, 追问]
parent: webgl-webgpu
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「WebGL 与 WebGPU 的前端视角」讲成只在理想输入下可用。；回答结构可按「触发条件 -> WebGL 机制 -> 风险兜底」展开，并以「WebGL 与 WebGPU 的前端视角」补一条失败场景。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 WebGL 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- 机制：Three.js 提供更高层抽象，适合业务快速落地；WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估
- 落地动作：回答「当兼容性要求提升或预算收紧时，你会如何围绕 WebGL 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Three.js 提供更高层抽象，适合业务快速落地」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「当兼容性要求提升或预算收紧时，你会如何围绕 WebGL 调整方案边界与实施节奏」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- Three.js 提供更高层抽象，适合业务快速落地
- WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估

## misleading-chart-guardrail

title: 可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通]
followups: [misleading-chart-guardrail-followup-1, misleading-chart-guardrail-followup-2, misleading-chart-guardrail-followup-3]

### 一句话

图画得“好看”不等于表达“真实”：可视化治理的核心是防止误导决策，而不是追求视觉冲击。

### 题目

同一个业务数据，A 同学用截断 Y 轴强调增长，B 同学用双轴图强调“成本下降”。管理层看完给出相反决策。你会如何建立可视化护栏，降低图表误导风险？

### 答案要点

- 先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明。
- 图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见。
- 双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图。
- 对关键决策图引入“解释层”：趋势结论 + 反例说明 + 不确定性区间，避免单结论过度放大。
- 建立审查清单：展示前至少过一轮“误导风险审阅”，由数据与业务共同确认。
- 复盘追踪“图表引发的错误决策事件”，把反模式反哺模板与规范。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 可视化防误导护栏 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 可视化防误导护栏，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type ChartMeta = {
  metricId: string;
  denominator?: string;
  yAxisTruncated: boolean;
  sampleRule?: string;
};

function isHighRiskChart(meta: ChartMeta) {
  return meta.yAxisTruncated || !meta.denominator || !meta.sampleRule;
}
```

```yaml
chart_guardrail:
  require_fields:
    - metric_version
    - time_window
    - sample_rule
    - uncertainty_note
  reject_when:
    - hidden_axis_truncation
    - dual_axis_without_reason
```

### 追问

- 「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只审核样式规范，不审核数据语义和展示前提。
- 认为“图里写了注释”就足够，忽略使用者是否真正能读懂风险。
- 只关注图表组件能力，忽略决策语境和业务解释责任。

### 延伸

- 可把高风险图表自动标记为“需双人复核”。
- 建议沉淀“可视化误导案例库”，供新成员快速学习。

## dashboard-anomaly-explainer-bridge

title: 看板异常解释指挥桥：数据波动、口径核验与业务决策同步
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘]
followups: [dashboard-anomaly-explainer-bridge-followup-1, dashboard-anomaly-explainer-bridge-followup-2, dashboard-anomaly-explainer-bridge-followup-3]

### 一句话

异常出现时，组织最缺的不是“更多图”，而是“统一解释与可执行决策”。

### 题目

日运营看板早上突然出现转化暴跌 20%，但不同团队给出不同解释：埋点丢失、活动下线、渠道波动、图表口径问题。你会如何在 30 分钟内组织异常解释并输出可执行动作？

### 答案要点

- 先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）。
- 明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论。
- 统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战。
- 对“未确认异常”与“已确认异常”采用不同动作：前者先限制决策，后者立即触发止损预案。
- 解释过程中保留冲突记录：哪些假设被证伪、哪些证据有效，方便后续复盘。
- 复盘时评估解释质量：结论反转次数、确认时长、误决策次数是否下降。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」时要把 看板异常解释指挥桥 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，看板异常解释指挥桥 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里当前按阶段替换更稳。

### 代码示例

```ts
type AnomalyCheck = {
  trackingHealthy: boolean;
  metricConsistent: boolean;
  businessImpact: number;
};

function anomalyStatus(c: AnomalyCheck) {
  if (!c.trackingHealthy || !c.metricConsistent) return 'data_untrusted';
  if (c.businessImpact >= 0.1) return 'confirmed_high_impact';
  return 'needs_monitoring';
}
```

```yaml
anomaly_bridge:
  every_min: 10
  update_template:
    - current_conclusion
    - evidence_strength
    - pending_hypothesis
    - next_check_time
  decision_rule:
    data_untrusted: hold_decision
    confirmed_high_impact: trigger_stoploss
```

### 追问

- 「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 先下业务结论，后补数据核验，导致决策方向错误。
- 异常解释只停在技术层，未转译为业务可执行动作。
- 故障恢复后不复盘解释过程，导致下次仍然混乱。

### 延伸

- 建议在看板中直接展示“数据可信度状态”。
- 可把异常解释流程接入机器人，自动生成更新摘要。

## misleading-chart-guardrail-followup-1

title: 追问：可视化防误导护栏最容易在哪些场景失效
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通, 追问]
parent: misleading-chart-guardrail
generated: followup-script

### 一句话

最容易失效的场景是高压汇报、临时拉数、跨团队复用图表这三类，大家更容易跳过元信息与口径校验。；我会先补三道保险：高风险图表强制双人复核、自动检测坐标截断、双轴图必须填写使用理由。；如果没有时间做全量治理，先覆盖决策影响最大的看板与周报图，先降高价值风险。

### 题目

如果面试官追问：可视化防误导护栏在真实业务里最容易在哪些场景失效，你会优先补哪几道保险？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明
- 机制：图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见；双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图
- 落地动作：回答「可视化防误导护栏最容易在哪些场景失效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「可视化防误导护栏最容易在哪些场景失效」时要先定义 可视化防误导护栏最容 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，可视化防误导护栏最容 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 可视化防误导护栏最容 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明
- 图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见
- 双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图

## misleading-chart-guardrail-followup-2

title: 追问：你会用哪些证据证明误导风险真的下降了
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通, 追问]
parent: misleading-chart-guardrail
generated: followup-script

### 一句话

我会看三类证据：高风险图表违规率、图表解释争议工单、由图表误导导致的决策反转次数。；再补执行证据：复核通过率、强制字段完整率，判断机制是否真的被用起来。；如果流程通过率高但争议不降，说明规则抓错重点，需要重做风险分级。

### 题目

如果面试官追问：你说可视化治理有效，具体拿什么证据证明“误导风险下降”，而不是流程更复杂？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明
- 机制：图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见；双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图
- 落地动作：回答「你会用哪些证据证明误导风险真的下降了」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会用哪些证据证明误 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会用哪些证据证明误，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你会用哪些证据证明误导风险真的下降了」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明
- 图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见
- 双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图

## misleading-chart-guardrail-followup-3

title: 追问：业务催上线时你怎么在“效率”和“防误导”间取舍
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通, 追问]
parent: misleading-chart-guardrail
generated: followup-script

### 一句话

我会先划红线：坐标欺骗、缺失口径来源、关键分层被隐藏这三类不允许放行。；红线之外允许“轻治理上线”，但必须在版本内补齐元信息和复核。；取舍原则是先保障决策安全，再谈视觉完整度和开发效率。

### 题目

如果面试官追问：业务方要求本周必须上线看板，你会怎么在“交付速度”和“防误导治理”之间做取舍？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明
- 机制：图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见；双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图
- 落地动作：回答「业务催上线时你怎么在“效率”和“防误导”间取舍」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 业务催上线时你怎么在 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 业务催上线时你怎么在，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「业务催上线时你怎么在“效率”和“防误导”间取舍」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明
- 图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见
- 双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图

## dashboard-anomaly-explainer-bridge-followup-1

title: 追问：异常解释流程长期运行后最容易卡在哪些点
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘, 追问]
parent: dashboard-anomaly-explainer-bridge
generated: followup-script

### 一句话

我会优先巡检三处：数据可信度判断是否被跳过、证据更新是否按节奏、结论反转是否频繁。；长期最容易退化的是“先下结论再补证据”，流程会变快但决策风险上升。；还要检查跨团队责任是否漂移，避免异常解释变成“谁都能说、谁都不负责”。

### 题目

如果面试官追问：异常解释流程跑久了最容易卡在哪些点，你会重点巡检什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）
- 机制：明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论；统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战
- 落地动作：回答「异常解释流程长期运行后最容易卡在哪些点」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「异常解释流程长期运行后最容易卡在哪些点」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）
- 明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论
- 统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战

## dashboard-anomaly-explainer-bridge-followup-2

title: 追问：你如何定义异常解释流程“生效”并持续验证
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘, 追问]
parent: dashboard-anomaly-explainer-bridge
generated: followup-script

### 一句话

我会用三组指标判断生效：异常确认时长、结论反转率、误决策次数。；再加执行指标：更新是否按节奏、证据模板是否完整、责任人是否按时响应。；若流程执行率高但误决策不降，说明“填表合规、决策失灵”，要重构关键环节。

### 题目

如果面试官追问：异常解释流程搭好了，怎样才算真正生效？又如何持续验证不是“形式化执行”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）
- 机制：明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论；统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战
- 落地动作：回答「你如何定义异常解释流程“生效”并持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「你如何定义异常解释流程“生效”并持续验证」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）
- 明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论
- 统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战

## dashboard-anomaly-explainer-bridge-followup-3

title: 追问：产能有限时你会优先落地异常解释的哪三步
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘, 追问]
parent: dashboard-anomaly-explainer-bridge
generated: followup-script

### 一句话

我会先落三步：统一结论模板、明确责任链、建立数据可信度快速检查。；这三步能先解决“说不清、等不来、结论乱”的核心问题，性价比最高。；其余能力（自动化告警联动、复杂看板）可以分阶段补，不必一口气做完。

### 题目

如果面试官追问：团队产能有限但异常频发，你会优先落地异常解释流程的哪三步，为什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）
- 机制：明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论；统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战
- 落地动作：回答「产能有限时你会优先落地异常解释的哪三步」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「产能有限时你会优先落地异常解释的哪三步」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）
- 明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论
- 统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战
