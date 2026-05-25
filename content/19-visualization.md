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

这题回答要覆盖 Canvas 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

同样是画图，Canvas 和 SVG 的核心差异是什么？分别适合哪些场景？

### 答案要点

- SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果
- SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 Canvas 与 SVG 如何选；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

讲「ECharts 大数据渲染优化思路」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

图表数据量很大时，前端有哪些常见优化手段？

### 答案要点

- 数据层：采样（LTTB 算法保趋势）、按时间聚合、分层（缩放级别越大越粗）
- 渲染层：用 canvas 而非 svg；关闭动画 animation: false；隐藏每点的 symbol
- 渐进式渲染：progressive: 1000 + progressiveThreshold: 3000 让首屏先出来
- 交互层：dataZoom 控制可见区间；tooltip 按需触发；hover 时再算细节

#### 工程化补充

- 场景前提：ECharts 大数据渲染优化思路 只有在瓶颈被数据证实时才值得推进；先确认 ECharts 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 ECharts 大数据渲染优化思路 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

讲「D3 的核心思想不是“画图库”，而是数据驱动映射」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么很多人学 D3 会觉得难？它和 ECharts 的心智模型有什么不同？

### 答案要点

- D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智
- ECharts 是高层配置驱动库，传 option 即出图，自由度低但开发快
- D3 的核心 API：d3.scale\*（比例尺）/ d3.selection（数据绑定）/ d3.axis（坐标轴）
- 数据绑定模式：enter / update / exit——数据变化时只增删差异部分（虚拟 DOM 思想的鼻祖）

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

回答「requestAnimationFrame 与图形动画节奏控制」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么图形动画通常基于 `requestAnimationFrame` 而不是 `setInterval`？

### 答案要点

- requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑
- 页面后台时会自动降频
- 可结合时间差 deltaTime 做与帧率无关的动画速度控制

#### 工程化补充

- 场景前提：回答 requestAnimationFrame 与图形动画节奏控制 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 requestAnimationFrame 与图形动画节奏控制 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题回答要覆盖 WebGL 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

什么时候应该考虑 WebGL/Three.js，什么时候又要关注 WebGPU？

### 答案要点

- WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- Three.js 提供更高层抽象，适合业务快速落地
- WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估

#### 工程化补充

- 场景前提：先定义 WebGL 与 WebGPU 的前端视角 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 WebGL 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 WebGL 的可复现用例、线上监控指标和回退演练记录。

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

这题的高分关键是把 大屏 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

数据大屏为什么经常在不同分辨率下变形？有哪些常见适配策略？

### 答案要点

- 大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算
- 需要特别处理 DPR、字体渲染和图表容器尺寸变更

#### 工程化补充

- 场景前提：回答 大屏适配与多分辨率设计 时先锁定 大屏 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 大屏 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 大屏 的可复现用例、线上监控指标和回退演练记录。

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

这题回答要覆盖 可视化 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

做一个有"hover、联动、刷选、滚轮缩放"的多图表 dashboard，前端要解决什么问题？

### 答案要点

- 节流：mousemove / wheel 事件每秒上百次，要 rAF 节流
- 联动：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引
- Brush：选区交互需要支持 keyboard ESC 取消、双击重置
- 缩放：滚轮缩放要 cmd/ctrl 修饰，避免误触；移动端用双指

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 图表交互的几个关键点（联动 / hover / brush / 缩放）；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

回答「D3 力导向图（Force-directed Graph）实战要点」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

用 D3 做一张几千节点的关系图，怎么做才能不卡？

### 答案要点

- 物理仿真：d3-force 默认 N²，节点过千就会卡；用 simulation.alphaDecay 加快收敛
- 渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点
- 分层：固定核心节点位置，外围节点用聚类合并展示
- 交互：拖拽时只重启局部仿真，hover 用四叉树查询提速

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 D3 力导向图（Force-directed Graph）实战要点；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

回答「Canvas / SVG / WebGL 怎么选，性能边界在哪」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请对比 Canvas、SVG、WebGL 在渲染模型、交互、性能上的差异。

### 答案要点

- DOM 元素，原生支持事件、CSS 样式、可访问性
- 适合数据可视化（< 1k 节点）、图标、动画 path
- 缺点：节点超过几千会肉眼可见卡顿
- 立即模式（绘制完无对象记忆），用 JS API 画像素

#### 工程化补充

- 场景前提：回答 Canvas / SVG / WebGL 怎么选，性能边界在哪 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Canvas / SVG / WebGL 怎么选，性能边界在哪 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 可视化 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

要做一个全国订单分布大屏：1. 标记 5 万订单点 2. 城市级热力 3. 省级行政区划着色。技术怎么选？

### 答案要点

- mapbox-gl-js / maplibre-gl：矢量瓦片、样式可定制、性能好；mapbox 收费，maplibre 是其开源 fork
- leaflet：轻量但栅格瓦片为主，量大较卡
- 高德 / 百度地图 JS API：国内合规、行政边界数据现成
- deck.gl：WebGL 图层化引擎，可叠在 mapbox / google 上，海量点首选

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

这题的高分关键是把 可视化 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

看板要支持"导出当前页为 PDF / PNG"。性能 / 清晰度 / 字体 / 跨域图片各种坑怎么解？

### 答案要点

- ECharts：chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
- 或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）
- 复制到剪贴板：navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
- 整页导出（客户端方案）

#### 工程化补充

- 场景前提：图表 / 看板怎么导出图片 / PDF 只有在瓶颈被数据证实时才值得推进；先确认 可视化 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 图表 / 看板怎么导出图片 / PDF 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 可视化 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

列举常见图表库的定位差异，怎么挑？

### 答案要点

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）
- AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡
- Chart.js：体积小（70KB+），配置简单，适合中小图表

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「Canvas 与 SVG 如何选」最可能被哪些 Canvas 边界条件击穿？

### 答案要点

#### 直答

- 结论：先列「Canvas 与 SVG 如何选」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先演练 面对真实流量 与 复杂依赖时 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- Canvas：Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果。
- SVG：SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形。

#### 风险与验收

- 主要风险：若 面对真实流量 与 复杂依赖时 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：围绕 面对真实流量 与 复杂依赖时 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## chart-performance-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 ECharts 相关的指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈
difficulty: 进阶
tags: [ECharts, 性能, 追问]
parent: chart-performance

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 ECharts 相关的指标来判断「ECharts 大数据渲染优化思路」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 ECharts 大数据渲染优化思路 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 ECharts 大数据渲染优化思路 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- ECharts：ECharts 是「ECharts 大数据渲染优化思路」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能：围绕「ECharts 大数据渲染优化思路」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 ECharts 大数据渲染优化思路 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：ECharts 大数据渲染优化思路 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## d3-thinking-followup-1

title: 追问：结合真实业务约束，你会如何围绕 D3 提前识别「D3 的核心思想不是“画图库”，而是数据驱动映射」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [D3, 数据映射, 追问]
parent: d3-thinking

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 D3 提前识别「D3 的核心思想不是“画图库”，而是数据驱动映射」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 结论：上线 D3 的核心思想不是“画图库” 而是数据驱动映射 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先识别 D3 的核心思想不是“画图库” 而是数据驱动映射 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- D3：D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智。
- 数据映射：在「D3 的核心思想不是“画图库”，而是数据驱动映射」里，数据映射 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 D3 的核心思想不是“画图库” 而是数据驱动映射 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 D3 的核心思想不是“画图库” 而是数据驱动映射 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## animation-raf-followup-1

title: 追问：你会如何围绕 动画 提前识别「requestAnimationFrame 与图形动画节奏控制」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [动画, RAF, 追问]
parent: animation-raf

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 动画 提前识别「requestAnimationFrame 与图形动画节奏控制」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 结论：上线 requestAnimationFrame 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先演练 requestAnimationFrame 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- requestAnimationFrame：requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑。
- 动画：可结合时间差 deltaTime 做与帧率无关的动画速度控制。
- RAF：RAF 是「requestAnimationFrame 与图形动画节奏控制」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 requestAnimationFrame 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：requestAnimationFrame 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## webgl-webgpu-followup-1

title: 追问：如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项
difficulty: 进阶
tags: [WebGL, WebGPU, 追问]
parent: webgl-webgpu

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「WebGL 与 WebGPU 的前端视角」稳定上线，你会优先补齐哪些与 WebGL 相关的检查项？

### 答案要点

#### 直答

- 结论：先列「WebGL 与 WebGPU 的前端视角」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：Three.js 提供更高层抽象，适合业务快速落地。

#### 术语解释

- WebGL：WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染。
- WebGPU：WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估。

#### 风险与验收

- 主要风险：围绕 WebGL 与 WebGPU 的前端视角 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 WebGL 与 WebGPU 的前端视角 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## dashboard-adaptation-followup-1

title: 追问：真要把「大屏适配与多分辨率设计」推到线上，你会如何围绕 大屏 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [大屏, 适配, 追问]
parent: dashboard-adaptation

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「大屏适配与多分辨率设计」推到线上，你会如何围绕 大屏 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「大屏适配与多分辨率设计」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：围绕 大屏适配与多分辨率设计 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- 大屏：大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题。
- 适配：在「大屏适配与多分辨率设计」里，适配 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：围绕 大屏适配与多分辨率设计 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：验收看 大屏适配与多分辨率设计 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## chart-interaction-tooltip-followup-1

title: 追问：如果复盘「图表交互的几个关键点（联动 / hover / brush / 缩放）」，你会优先检查哪些边界条件和复杂度坑
difficulty: 进阶
tags: [可视化, 交互, 追问]
parent: chart-interaction-tooltip

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果复盘「图表交互的几个关键点（联动 / hover / brush / 缩放）」，你会优先检查哪些边界条件和复杂度坑？

### 答案要点

#### 直答

- 结论：上线 图表交互的几个关键点 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：围绕 图表交互的几个关键点 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- hover：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引。
- brush：在「图表交互的几个关键点（联动 / hover / brush / 缩放）」里，brush 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 可视化：围绕「图表交互的几个关键点（联动 / hover / brush / 缩放）」里的 可视化 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：图表交互的几个关键点 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 图表交互的几个关键点 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## d3-force-network-followup-1

title: 追问：如果要评估「D3 力导向图（Force-directed Graph）实战要点」的稳定性，你会优先排查哪些复杂度相关边界
difficulty: 资深
tags: [D3, 力导向, 图, 追问]
parent: d3-force-network

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「D3 力导向图（Force-directed Graph）实战要点」的稳定性，你会优先排查哪些复杂度相关边界？

### 答案要点

#### 直答

- 结论：优先排查 D3 力导向图 实战要点 的最坏输入规模、重复访问热点和队列峰值，确认时间与空间复杂度不会击穿预算。
- 关键动作：把「D3 力导向图（Force-directed Graph）实战要点」里的 D3 力导向图 实战要点 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- D3：D3 是「D3 力导向图（Force-directed Graph）实战要点」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Force-directed Graph：围绕「D3 力导向图（Force-directed Graph）实战要点」里的 Force-directed Graph 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 力导向：围绕「D3 力导向图（Force-directed Graph）实战要点」里的 力导向 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：D3 力导向图 实战要点 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「D3 力导向图（Force-directed Graph）实战要点」里 D3 力导向图 实战要点 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## canvas-vs-svg-vs-webgl-followup-1

title: 追问：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」场景下，你会先看哪些与 Canvas 相关的指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈
difficulty: 进阶
tags: [Canvas, SVG, WebGL, 追问]
parent: canvas-vs-svg-vs-webgl

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」场景下，你会先看哪些与 Canvas 相关的指标来判断「Canvas / SVG / WebGL 怎么选，性能边界在哪」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 Canvas 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先把「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的 Canvas 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Canvas：Canvas 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SVG：SVG 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- WebGL：WebGL 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」里，Canvas 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」里，Canvas 至少要给一组指标阈值、一条日志证据和一组测试结果。

## map-visualization-followup-1

title: 追问：围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱
difficulty: 进阶
tags: [可视化, 地图, 高频, 追问]
parent: map-visualization

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱？

### 答案要点

#### 直答

- 结论：先列出 热力图 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先识别 热力图 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 可视化：围绕「地图可视化怎么做？数据点 / 热力图 / 行政区划」里的 可视化 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 地图：国内合规、行政边界数据现成。

#### 风险与验收

- 主要风险：围绕 热力图 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 热力图 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## chart-export-printing-followup-1

title: 追问：围绕「图表 / 看板怎么导出图片 / PDF」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱
difficulty: 进阶
tags: [可视化, 导出, PDF, 追问]
parent: chart-export-printing

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「图表 / 看板怎么导出图片 / PDF」，你会先提醒哪些最容易被忽略的边界输入和复杂度陷阱？

### 答案要点

#### 直答

- 结论：上线 图表 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先演练 图表 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- PDF：PDF 是「图表 / 看板怎么导出图片 / PDF」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 可视化：围绕「图表 / 看板怎么导出图片 / PDF」里的 可视化 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 导出：或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）。

#### 风险与验收

- 主要风险：围绕 图表 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 图表 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## chart-library-choice-basic-followup-1

title: 追问：面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿
difficulty: 基础
tags: [可视化, 选型, 基础, 追问]
parent: chart-library-choice-basic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「ECharts、AntV、D3、Chart.js、Plotly 怎么选」最可能被哪些 可视化 边界条件击穿？

### 答案要点

#### 直答

- 结论：围绕「ECharts、AntV、D3、Chart.js、Plotly 怎么选」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：先识别 ECharts 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）。
- AntV：AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先。
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡。

#### 风险与验收

- 主要风险：ECharts 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：ECharts 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## chart-performance-followup-2

title: 追问：以「ECharts 大数据渲染优化思路」为例，你会怎样验证「ECharts 大数据渲染优化思路」在 ECharts 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [ECharts, 性能, 追问]
parent: chart-performance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「ECharts 大数据渲染优化思路」为例，你会怎样验证「ECharts 大数据渲染优化思路」在 ECharts 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 ECharts 大数据渲染优化思路 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先把「ECharts 大数据渲染优化思路」里的 ECharts 大数据渲染优化思路 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- ECharts：ECharts 是「ECharts 大数据渲染优化思路」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能：围绕「ECharts 大数据渲染优化思路」里的 性能 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「ECharts 大数据渲染优化思路」里，ECharts 大数据渲染优化思路 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「ECharts 大数据渲染优化思路」里，ECharts 大数据渲染优化思路 至少要给一组指标阈值、一条日志证据和一组测试结果。

## chart-performance-followup-3

title: 追问：如果「ECharts 大数据渲染优化思路」在 ECharts 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 进阶
tags: [ECharts, 性能, 追问]
parent: chart-performance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果「ECharts 大数据渲染优化思路」在 ECharts 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 直答

- 结论：先列出 ECharts 大数据渲染优化思路 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：围绕 ECharts 大数据渲染优化思路 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- ECharts：ECharts 是「ECharts 大数据渲染优化思路」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 性能：围绕「ECharts 大数据渲染优化思路」里的 性能 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 ECharts 大数据渲染优化思路 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 ECharts 大数据渲染优化思路 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## d3-thinking-followup-2

title: 追问：如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [D3, 数据映射, 追问]
parent: d3-thinking
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 直答

- 结论：规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。
- 关键动作：先定位 D3 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- D3：D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智。
- 数据映射：在「D3 的核心思想不是“画图库”，而是数据驱动映射」这题里，数据映射 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：D3 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 D3 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## d3-thinking-followup-3

title: 追问：以「D3 的核心思想不是“画图库”，而是数据驱动映射」为例，为了让团队信服「D3 的核心思想不是“画图库”，而是数据驱动映射」正确，你会先补哪几类高价值校验与断言
difficulty: 进阶
tags: [D3, 数据映射, 追问]
parent: d3-thinking
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「D3 的核心思想不是“画图库”，而是数据驱动映射」为例，为了让团队信服「D3 的核心思想不是“画图库”，而是数据驱动映射」正确，你会先补哪几类高价值校验与断言？

### 答案要点

#### 直答

- 结论：先补 D3 的核心思想不是“画图库” 而是数据驱动映射 的边界输入断言、随机对拍和回归用例三类证据，确保结论可复核而不是样例跑通。
- 关键动作：先梳理 D3 的核心思想不是“画图库” 而是数据驱动映射 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- D3：D3 是底层映射工具集，强调"比例尺 → 数据绑定 → 图元生成"三段心智。
- 数据映射：围绕「D3 的核心思想不是“画图库”，而是数据驱动映射」里的 数据映射 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：D3 的核心思想不是“画图库” 而是数据驱动映射 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：D3 的核心思想不是“画图库” 而是数据驱动映射 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## animation-raf-followup-2

title: 追问：以「requestAnimationFrame 与图形动画节奏控制」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [动画, RAF, 追问]
parent: animation-raf
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「requestAnimationFrame 与图形动画节奏控制」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 直答

- 结论：规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。
- 关键动作：把「requestAnimationFrame 与图形动画节奏控制」里的 requestAnimationFrame 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- requestAnimationFrame：requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑。
- 动画：可结合时间差 deltaTime 做与帧率无关的动画速度控制。
- RAF：RAF 是「requestAnimationFrame 与图形动画节奏控制」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 requestAnimationFrame 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：requestAnimationFrame 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## animation-raf-followup-3

title: 追问：结合真实业务约束，如果要在评审里证明「requestAnimationFrame 与图形动画节奏控制」可长期维护，你会展示哪些围绕 动画 的正确性证据
difficulty: 进阶
tags: [动画, RAF, 追问]
parent: animation-raf
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要在评审里证明「requestAnimationFrame 与图形动画节奏控制」可长期维护，你会展示哪些围绕 动画 的正确性证据？

### 答案要点

#### 直答

- 结论：验证「requestAnimationFrame 与图形动画节奏控制」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 requestAnimationFrame 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- requestAnimationFrame：requestAnimationFrame 与浏览器刷新节奏同步，更省电、更平滑。
- 动画：可结合时间差 deltaTime 做与帧率无关的动画速度控制。
- RAF：RAF 是「requestAnimationFrame 与图形动画节奏控制」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：requestAnimationFrame 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「requestAnimationFrame 与图形动画节奏控制」里，requestAnimationFrame 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## dashboard-adaptation-followup-2

title: 追问：以「大屏适配与多分辨率设计」为例，面对团队能力差异，你会如何围绕 大屏 把「大屏适配与多分辨率设计」拆成可并行推进的小阶段
difficulty: 进阶
tags: [大屏, 适配, 追问]
parent: dashboard-adaptation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「大屏适配与多分辨率设计」为例，面对团队能力差异，你会如何围绕 大屏 把「大屏适配与多分辨率设计」拆成可并行推进的小阶段？

### 答案要点

#### 直答

- 结论：把 大屏适配与多分辨率设计 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 大屏适配与多分辨率设计 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 大屏：大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题。
- 适配：在「大屏适配与多分辨率设计」这题里，适配 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 大屏适配与多分辨率设计 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：大屏适配与多分辨率设计 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## dashboard-adaptation-followup-3

title: 追问：以「大屏适配与多分辨率设计」为例，半年后要做去留决策时，你会拿哪些数据判断「大屏适配与多分辨率设计」还值不值得继续维护
difficulty: 进阶
tags: [大屏, 适配, 追问]
parent: dashboard-adaptation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「大屏适配与多分辨率设计」为例，半年后要做去留决策时，你会拿哪些数据判断「大屏适配与多分辨率设计」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：先拆分 大屏适配与多分辨率设计 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 大屏适配与多分辨率设计 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 大屏：大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题。
- 适配：围绕「大屏适配与多分辨率设计」里的 适配 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：大屏适配与多分辨率设计 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「大屏适配与多分辨率设计」里，验收 大屏适配与多分辨率设计 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## chart-interaction-tooltip-followup-2

title: 追问：以「图表交互的几个关键点（联动 / hover / brush / 缩放）」为例，如果数据规模扩大一个数量级，你会如何围绕 可视化 调整数据结构或算法
difficulty: 进阶
tags: [可视化, 交互, 追问]
parent: chart-interaction-tooltip
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「图表交互的几个关键点（联动 / hover / brush / 缩放）」为例，如果数据规模扩大一个数量级，你会如何围绕 可视化 调整数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 图表交互的几个关键点 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：先定位 图表交互的几个关键点 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- hover：跨图表共享 cursor 状态，建议用 store / EventBus 广播 hover 索引。
- brush：围绕「图表交互的几个关键点（联动 / hover / brush / 缩放）」里的 brush 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 可视化：在「图表交互的几个关键点（联动 / hover / brush / 缩放）」这题里，可视化 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：图表交互的几个关键点 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「图表交互的几个关键点（联动 / hover / brush / 缩放）」里，图表交互的几个关键点 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## chart-interaction-tooltip-followup-3

title: 追问：从工程落地角度看，围绕「图表交互的几个关键点」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”
difficulty: 进阶
tags: [可视化, 交互, 追问]
parent: chart-interaction-tooltip
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，围绕「图表交互的几个关键点」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”？

### 答案要点

#### 直答

- 结论：先锁定 图表交互的几个关键点 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 图表交互的几个关键点 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 图表交互的几个关键点：图表交互的几个关键点 是「图表交互的几个关键点（联动 / hover / brush / 缩放）」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 可视化：在「图表交互的几个关键点（联动 / hover / brush / 缩放）」这题里，可视化 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 交互：选区交互需要支持 keyboard ESC 取消、双击重置。

#### 风险与验收

- 主要风险：在「图表交互的几个关键点（联动 / hover / brush / 缩放）」场景下，图表交互的几个关键点 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「图表交互的几个关键点（联动 / hover / brush / 缩放）」里，验收 图表交互的几个关键点 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## d3-force-network-followup-2

title: 追问：在当前团队与业务约束下，如果数据规模扩大一个数量级，你会如何围绕 D3 调整数据结构或算法
difficulty: 资深
tags: [D3, 力导向, 图, 追问]
parent: d3-force-network
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果数据规模扩大一个数量级，你会如何围绕 D3 调整数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 D3 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：先定位 D3 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- D3：D3 是「D3 力导向图（Force-directed Graph）实战要点」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 力导向：在「D3 力导向图（Force-directed Graph）实战要点」这题里，力导向 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：D3 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「D3 力导向图（Force-directed Graph）实战要点」里，D3 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## d3-force-network-followup-3

title: 追问：结合真实业务约束，如果要让「D3 力导向图（Force-directed Graph）实战要点」的正确性可复核，你会围绕 D3 设计哪些验证步骤
difficulty: 资深
tags: [D3, 力导向, 图, 追问]
parent: d3-force-network
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要让「D3 力导向图（Force-directed Graph）实战要点」的正确性可复核，你会围绕 D3 设计哪些验证步骤？

### 答案要点

#### 直答

- 结论：验证「D3 力导向图（Force-directed Graph）实战要点」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义 D3 力导向图 实战要点 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- D3：D3 是「D3 力导向图（Force-directed Graph）实战要点」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Force-directed Graph：围绕「D3 力导向图（Force-directed Graph）实战要点」里的 Force-directed Graph 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 力导向：围绕「D3 力导向图（Force-directed Graph）实战要点」里的 力导向 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：D3 力导向图 实战要点 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「D3 力导向图（Force-directed Graph）实战要点」里，D3 力导向图 实战要点 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## canvas-vs-svg-vs-webgl-followup-2

title: 追问：以「Canvas / SVG / WebGL 怎么选，性能边界在哪」为例，要证明「Canvas / SVG / WebGL 怎么选，性能边界在哪」确实改善体验，你会如何围绕 Canvas 设计线上观测与对照验证
difficulty: 进阶
tags: [Canvas, SVG, WebGL, 追问]
parent: canvas-vs-svg-vs-webgl
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Canvas / SVG / WebGL 怎么选，性能边界在哪」为例，要证明「Canvas / SVG / WebGL 怎么选，性能边界在哪」确实改善体验，你会如何围绕 Canvas 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 Canvas 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：围绕 Canvas 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Canvas：Canvas 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SVG：SVG 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- WebGL：WebGL 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Canvas 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Canvas 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## canvas-vs-svg-vs-webgl-followup-3

title: 追问：结合真实业务约束，如果「Canvas / SVG / WebGL 怎么选，性能边界在哪」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 进阶
tags: [Canvas, SVG, WebGL, 追问]
parent: canvas-vs-svg-vs-webgl
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果「Canvas / SVG / WebGL 怎么选，性能边界在哪」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 直答

- 结论：验证 Canvas 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 Canvas 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Canvas：Canvas 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- SVG：SVG 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- WebGL：WebGL 是「Canvas / SVG / WebGL 怎么选，性能边界在哪」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Canvas / SVG / WebGL 怎么选，性能边界在哪」里，Canvas 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Canvas 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## map-visualization-followup-2

title: 追问：从工程落地角度看，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [可视化, 地图, 高频, 追问]
parent: map-visualization
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 直答

- 结论：规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。
- 关键动作：把「地图可视化怎么做？数据点 / 热力图 / 行政区划」里的 数据点 与 热力图 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 可视化：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」这题里，可视化 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 地图：国内合规、行政边界数据现成。

#### 风险与验收

- 主要风险：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」里，数据点 与 热力图 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：数据点 与 热力图 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## map-visualization-followup-3

title: 追问：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」场景下，你会怎么证明「地图可视化怎么做？数据点 / 热力图 / 行政区划」实现正确，而不是只靠几个样例跑通
difficulty: 进阶
tags: [可视化, 地图, 高频, 追问]
parent: map-visualization
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」场景下，你会怎么证明「地图可视化怎么做？数据点 / 热力图 / 行政区划」实现正确，而不是只靠几个样例跑通？

### 答案要点

#### 直答

- 结论：先定义 热力图 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：围绕 热力图 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 可视化：在「地图可视化怎么做？数据点 / 热力图 / 行政区划」里，可视化 是验收对象，必须给可量化指标、日志信号和测试证据。
- 地图：国内合规、行政边界数据现成。

#### 风险与验收

- 主要风险：若 热力图 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：热力图 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## chart-export-printing-followup-2

title: 追问：在「图表 / 看板怎么导出图片 / PDF」场景下，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 进阶
tags: [可视化, 导出, PDF, 追问]
parent: chart-export-printing
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「图表 / 看板怎么导出图片 / PDF」场景下，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 直答

- 结论：规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。
- 关键动作：把「图表 / 看板怎么导出图片 / PDF」里的 图表 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- PDF：PDF 是「图表 / 看板怎么导出图片 / PDF」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 可视化：围绕「图表 / 看板怎么导出图片 / PDF」里的 可视化 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 导出：或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）。

#### 风险与验收

- 主要风险：围绕 图表 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：图表 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## chart-export-printing-followup-3

title: 追问：在当前团队与业务约束下，当「图表 / 看板怎么导出图片 / PDF」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径
difficulty: 进阶
tags: [可视化, 导出, PDF, 追问]
parent: chart-export-printing
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当「图表 / 看板怎么导出图片 / PDF」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径？

### 答案要点

#### 直答

- 结论：验证 图表 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：围绕 图表 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- PDF：PDF 是「图表 / 看板怎么导出图片 / PDF」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 可视化：在「图表 / 看板怎么导出图片 / PDF」里，可视化 是验收对象，必须给可量化指标、日志信号和测试证据。
- 导出：或 SVG 模式直接导出 svg 字符串（矢量，缩放无损）。

#### 风险与验收

- 主要风险：若 图表 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：图表 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## chart-library-choice-basic-followup-2

title: 追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表交互怎么设计
difficulty: 基础
tags: [可视化, 选型, 基础, 追问]
parent: chart-library-choice-basic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表交互（tooltip / brush / linked view）怎么设计？

### 答案要点

#### 直答

- 结论：把 ECharts 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 ECharts 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）。
- AntV：AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先。
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡。

#### 风险与验收

- 主要风险：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」里，ECharts 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「ECharts、AntV、D3、Chart.js、Plotly 怎么选」里 ECharts 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## chart-library-choice-basic-followup-3

title: 追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表性能基线怎么保
difficulty: 基础
tags: [可视化, 选型, 基础, 追问]
parent: chart-library-choice-basic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「ECharts、AntV、D3、Chart.js、Plotly 怎么选」场景下，图表性能基线（首屏渲染 200ms）怎么保？

### 答案要点

#### 直答

- 结论：先把 ECharts 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「ECharts、AntV、D3、Chart.js、Plotly 怎么选」里的 ECharts 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- ECharts：百度/Apache 出品，国产业务大屏标配；地图、3D、热力图、关系图全；体积偏大（按需打包通常仍在 200KB+）。
- AntV：AntV（@antv/g2 / g6 / x6）：蚂蚁出品，组合性好，关系图（G6）和流程图（X6）领先。
- D3：低层 SVG/Canvas 工具集，从坐标轴到颜色都自己拼，自由度极高，曲线学陡。

#### 风险与验收

- 主要风险：围绕 ECharts 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：ECharts 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## canvas-svg-followup-2

title: 追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Canvas 方案有效
difficulty: 基础
tags: [Canvas, SVG, 追问]
parent: canvas-svg
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Canvas 方案有效？

### 答案要点

#### 直答

- 结论：先定「Canvas 与 SVG 如何选」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 Canvas 与 SVG 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Canvas：Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果。
- SVG：SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形。

#### 风险与验收

- 主要风险：若 Canvas 与 SVG 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Canvas 与 SVG 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## canvas-svg-followup-3

title: 追问：在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级
difficulty: 基础
tags: [Canvas, SVG, 追问]
parent: canvas-svg
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Canvas 与 SVG 如何选」场景下，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 Canvas 重排「Canvas 与 SVG 如何选」方案优先级？

### 答案要点

#### 直答

- 结论：「Canvas 与 SVG 如何选」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：把「Canvas 与 SVG 如何选」里的 Canvas 与 SVG 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Canvas：Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果。
- SVG：SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形。

#### 风险与验收

- 主要风险：在「Canvas 与 SVG 如何选」里，Canvas 与 SVG 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Canvas 与 SVG 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## webgl-webgpu-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 WebGL 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [WebGL, WebGPU, 追问]
parent: webgl-webgpu
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 WebGL 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：先定「WebGL 与 WebGPU 的前端视角」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：Three.js 提供更高层抽象，适合业务快速落地。

#### 术语解释

- WebGL：WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染。
- WebGPU：WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估。

#### 风险与验收

- 主要风险：WebGL 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「WebGL 与 WebGPU 的前端视角」里，WebGL 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## webgl-webgpu-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 WebGL 调整方案边界与实施节奏
difficulty: 进阶
tags: [WebGL, WebGPU, 追问]
parent: webgl-webgpu
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 WebGL 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：先冻结「WebGL 与 WebGPU 的前端视角」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。
- 关键动作：Three.js 提供更高层抽象，适合业务快速落地。

#### 术语解释

- WebGL：WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染。
- WebGPU：WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估。

#### 风险与验收

- 主要风险：在「WebGL 与 WebGPU 的前端视角」场景下，调整方案边界 与 实施节奏 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「WebGL 与 WebGPU 的前端视角」里，调整方案边界 与 实施节奏 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## misleading-chart-guardrail

title: 可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通]
followups: [misleading-chart-guardrail-followup-1, misleading-chart-guardrail-followup-2, misleading-chart-guardrail-followup-3]

### 一句话

回答「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

同一个业务数据，A 同学用截断 Y 轴强调增长，B 同学用双轴图强调“成本下降”。管理层看完给出相反决策。你会如何建立可视化护栏，降低图表误导风险？

### 答案要点

- 先定义“误导高风险模式”：坐标截断、双轴混淆、分母缺失、样本被筛选但未声明。
- 图表必须带上下文元信息：时间范围、采样规则、口径版本、是否去极值要可见。
- 双轴图要有使用前提：仅在量纲差异且相关性验证通过时允许，否则强制拆图。
- 对关键决策图引入“解释层”：趋势结论 + 反例说明 + 不确定性区间，避免单结论过度放大。

#### 工程化补充

- 场景前提：可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题回答要覆盖 异常解释 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

日运营看板早上突然出现转化暴跌 20%，但不同团队给出不同解释：埋点丢失、活动下线、渠道波动、图表口径问题。你会如何在 30 分钟内组织异常解释并输出可执行动作？

### 答案要点

- 先做三段式判断：数据是否可信（采集链路）、波动是否真实（口径对比）、影响是否可控（业务阈值）。
- 明确解释责任分工：埋点 owner、指标 owner、业务 owner 各自给出可证据结论。
- 统一输出模板：当前结论、证据强度、待验证假设、下一次更新时间，避免群聊口水战。
- 对“未确认异常”与“已确认异常”采用不同动作：前者先限制决策，后者立即触发止损预案。

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 看板异常解释指挥桥：数据波动、口径核验与业务决策同步；复杂度边界不清会导致方案失真。
- 实施步骤：围绕 异常解释 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：可视化防误导护栏在真实业务里最容易在哪些场景失效，你会优先补哪几道保险？

### 答案要点

#### 直答

- 结论：把 双轴滥用 与 采样偏差治理 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：把「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里的 双轴滥用 与 采样偏差治理 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 可视化治理：围绕「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里的 可视化治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 指标解释：在「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」这题里，指标解释 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 决策沟通：围绕「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里的 决策沟通 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：双轴滥用 与 采样偏差治理 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：双轴滥用 与 采样偏差治理 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## misleading-chart-guardrail-followup-2

title: 追问：你会用哪些证据证明误导风险真的下降了
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通, 追问]
parent: misleading-chart-guardrail
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你说可视化治理有效，具体拿什么证据证明“误导风险下降”，而不是流程更复杂？

### 答案要点

#### 直答

- 结论：先定「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先定义 双轴滥用 与 采样偏差治理 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 可视化治理：围绕「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里的 可视化治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 指标解释：在「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里，指标解释 是验收对象，必须给可量化指标、日志信号和测试证据。
- 决策沟通：围绕「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里的 决策沟通 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：双轴滥用 与 采样偏差治理 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里，双轴滥用 与 采样偏差治理 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## misleading-chart-guardrail-followup-3

title: 追问：业务催上线时你怎么在“效率”和“防误导”间取舍
difficulty: 资深
tags: [可视化治理, 指标解释, 决策沟通, 追问]
parent: misleading-chart-guardrail
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：业务方要求本周必须上线看板，你会怎么在“交付速度”和“防误导治理”之间做取舍？

### 答案要点

#### 直答

- 结论：先量化 双轴滥用 与 采样偏差治理 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先拆分 双轴滥用 与 采样偏差治理 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 可视化治理：在「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里，可视化治理 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 指标解释：围绕「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里的 指标解释 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 决策沟通：在「可视化防误导护栏：坐标截断、双轴滥用与采样偏差治理」里，决策沟通 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 双轴滥用 与 采样偏差治理 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 双轴滥用 与 采样偏差治理 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## dashboard-anomaly-explainer-bridge-followup-1

title: 追问：异常解释流程长期运行后最容易卡在哪些点
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘, 追问]
parent: dashboard-anomaly-explainer-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：异常解释流程跑久了最容易卡在哪些点，你会重点巡检什么？

### 答案要点

#### 直答

- 结论：先处理 口径核验 与 业务决策同步 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。
- 关键动作：围绕 口径核验 与 业务决策同步 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- 异常解释：围绕「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里的 异常解释 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 决策沟通：在「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里，决策沟通 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 复盘：围绕「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里的 复盘 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 口径核验 与 业务决策同步 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 口径核验 与 业务决策同步 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## dashboard-anomaly-explainer-bridge-followup-2

title: 追问：你如何定义异常解释流程“生效”并持续验证
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘, 追问]
parent: dashboard-anomaly-explainer-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：异常解释流程搭好了，怎样才算真正生效？又如何持续验证不是“形式化执行”？

### 答案要点

#### 直答

- 结论：先定义 口径核验 与 业务决策同步 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先定义 口径核验 与 业务决策同步 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 异常解释：围绕「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里的 异常解释 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 决策沟通：在「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里，决策沟通 是验收对象，必须给可量化指标、日志信号和测试证据。
- 复盘：围绕「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里的 复盘 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：口径核验 与 业务决策同步 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里，口径核验 与 业务决策同步 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## dashboard-anomaly-explainer-bridge-followup-3

title: 追问：产能有限时你会优先落地异常解释的哪三步
difficulty: 资深
tags: [异常解释, 决策沟通, 复盘, 追问]
parent: dashboard-anomaly-explainer-bridge
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：团队产能有限但异常频发，你会优先落地异常解释流程的哪三步，为什么？

### 答案要点

#### 直答

- 结论：先列出 口径核验 与 业务决策同步 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：围绕 口径核验 与 业务决策同步 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- 异常解释：在「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里，异常解释 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 决策沟通：围绕「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里的 决策沟通 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 复盘：在「看板异常解释指挥桥：数据波动、口径核验与业务决策同步」里，复盘 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 口径核验 与 业务决策同步 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：口径核验 与 业务决策同步 风险验收至少包含告警触发、降级执行和恢复达标三项信号。
