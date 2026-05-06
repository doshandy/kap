---
id: 19-visualization
title: 可视化与图形
order: 19
icon: 📊
description: Canvas、SVG、ECharts、D3、WebGL 与图形性能优化。
---

## canvas-svg
title: Canvas 与 SVG 如何选
difficulty: 基础
tags: [Canvas, SVG]

### 题目
同样是画图，Canvas 和 SVG 的核心差异是什么？分别适合哪些场景？

### 答案要点
- SVG 是声明式 DOM 图形，适合中小规模、可交互、可访问、样式化需求强的图形
- Canvas 是像素画布，适合频繁重绘、大量元素、游戏和复杂粒子效果
- SVG 易调试、易事件绑定；Canvas 原始性能通常更好，但语义和可访问性更弱

### 代码示例
```ts
// 1. SVG：声明式，每个图元都是 DOM
function renderSvg(points: { x: number; y: number }[]) {
  return `
    <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      <polyline
        fill="none" stroke="#0ea5e9" stroke-width="2"
        points="${points.map(p => `${p.x},${p.y}`).join(' ')}"
      />
      ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#0ea5e9" />`).join('')}
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
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
}
```

```ts
// 3. Canvas 上事件命中：自己实现（区域遍历或 Path2D + isPointInPath）
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
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

### 延伸
- 不是"Canvas 一定快"，而是看图元数量、更新频率和交互复杂度

## chart-performance
title: ECharts 大数据渲染优化思路
difficulty: 进阶
tags: [ECharts, 性能]

### 题目
图表数据量很大时，前端有哪些常见优化手段？

### 答案要点
- 数据采样、聚合、分层展示、虚拟滚动
- 开启渐进式渲染、dataZoom、按需 tooltip 和标签
- 降低初始渲染量，把细节放到交互展开阶段

### 代码示例
```ts
import * as echarts from 'echarts';

const chart = echarts.init(container, null, {
  renderer: 'canvas',          // 大数据强烈推荐 canvas（svg 图元过多会卡）
});

chart.setOption({
  animation: false,             // 大数据关闭动画
  dataset: { source: largeData }, // 用 dataset 减少二次拷贝

  series: [{
    type: 'line',
    showSymbol: false,           // 不画每个点的标记
    sampling: 'lttb',            // 大数据采样：保留趋势点
    progressive: 1000,           // 渐进式渲染：每帧 1000 个点
    progressiveThreshold: 3000,  // 超过 3000 个点开启渐进
    large: true,                 // canvas 大数据模式
    largeThreshold: 2000,
  }],

  dataZoom: [
    { type: 'inside' },
    { type: 'slider', start: 90, end: 100 },  // 默认显示最近 10%
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

    let avgX = 0, avgY = 0;
    for (let j = rangeStart; j < Math.min(rangeEnd, data.length); j++) {
      avgX += data[j][0];
      avgY += data[j][1];
    }
    const cnt = Math.min(rangeEnd, data.length) - rangeStart;
    avgX /= cnt; avgY /= cnt;

    let maxArea = -1, maxIdx = a + 1;
    for (let j = Math.floor(i * every) + 1; j < Math.floor((i + 1) * every) + 1; j++) {
      const area = Math.abs(
        (data[a][0] - avgX) * (data[j][1] - data[a][1]) -
        (data[a][0] - data[j][0]) * (avgY - data[a][1]),
      );
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    sampled.push(data[maxIdx]);
    a = maxIdx;
  }
  sampled.push(data[data.length - 1]);
  return sampled;
}
```

### 延伸
- 用户不一定需要"所有点都同时可见"，更重要的是快速读出趋势和异常

## d3-thinking
title: D3 的核心思想不是“画图库”，而是数据驱动映射
difficulty: 进阶
tags: [D3, 数据映射]

### 题目
为什么很多人学 D3 会觉得难？它和 ECharts 的心智模型有什么不同？

### 答案要点
- D3 更底层，强调比例尺、坐标映射、数据绑定和图元组合
- ECharts 更偏配置驱动，开箱快但自由度相对受约束
- D3 更适合定制可视化和非标准图形

### 代码示例
```ts
import * as d3 from 'd3';

// 1. 比例尺：把数据域映射到屏幕域
const x = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)!])      // 数据范围
  .range([0, 600]);                                // 屏幕范围

const y = d3.scaleBand()
  .domain(data.map(d => d.label))
  .range([0, 400])
  .padding(0.1);

const color = d3.scaleOrdinal(d3.schemeTableau10);

// 2. Enter / Update / Exit 模式（D3 的核心思想）
const svg = d3.select('#chart');
const bars = svg.selectAll('rect').data(data, (d: any) => d.label);

// Enter：新数据进入
bars.enter()
  .append('rect')
  .attr('x', 0)
  .attr('y', d => y(d.label)!)
  .attr('height', y.bandwidth())
  .attr('width', 0)                                // 初始为 0
  .attr('fill', d => color(d.label))
  .transition().duration(500)
  .attr('width', d => x(d.value));                 // 动画到目标宽度

// Update：已存在数据更新
bars.transition().duration(500)
  .attr('width', d => x(d.value));

// Exit：数据离开则移除
bars.exit().transition().duration(300).attr('width', 0).remove();
```

```ts
// 3. 配合自定义图表：力导向图
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .on('tick', () => {
    // 每帧更新位置
    nodeSelection.attr('cx', d => d.x).attr('cy', d => d.y);
    linkSelection.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                 .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  });
```

### 延伸
- 学 D3 的关键不是 API，而是"从数据到图形映射"的思维方式

## animation-raf
title: requestAnimationFrame 与图形动画节奏控制
difficulty: 进阶
tags: [动画, RAF]

### 题目
为什么图形动画通常基于 `requestAnimationFrame` 而不是 `setInterval`？

### 答案要点
- `requestAnimationFrame` 与浏览器刷新节奏同步，更省电、更平滑
- 页面后台时会自动降频
- 可结合时间差 `deltaTime` 做与帧率无关的动画速度控制

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
      update(dt);                  // dt 单位：秒
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

animator.start(dt => {
  x += SPEED * dt;
  ball.style.transform = `translateX(${x}px)`;
});
```

```ts
// 2. 缓动函数（与时间映射）
const easings = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

function tween(from: number, to: number, duration: number, ease = easings.easeOutCubic) {
  return new Promise<void>(resolve => {
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

### 延伸
- 高帧率动画的关键不只是"每帧跑"，更是每帧做多少工作

## webgl-webgpu
title: WebGL 与 WebGPU 的前端视角
difficulty: 进阶
tags: [WebGL, WebGPU]

### 题目
什么时候应该考虑 WebGL/Three.js，什么时候又要关注 WebGPU？

### 答案要点
- WebGL 适合 3D、地图、大规模粒子、GPU 加速渲染
- Three.js 提供更高层抽象，适合业务快速落地
- WebGPU 代表更现代的 GPU 能力模型，潜力更强，但浏览器支持、调试工具和生态成熟度仍需单独评估

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
    colorAttachments: [{
      view: ctx.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear', storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);
}
```

### 延伸
- 不是所有"炫酷"效果都值得上 GPU，维护与兼容成本要算进去

## dashboard-adaptation
title: 大屏适配与多分辨率设计
difficulty: 进阶
tags: [大屏, 适配]

### 题目
数据大屏为什么经常在不同分辨率下变形？有哪些常见适配策略？

### 答案要点
- 大屏常用固定设计稿比例缩放，但会带来字体、坐标、清晰度问题
- 更稳的方案是布局响应式 + 局部按比例缩放 + 图表自适应重算
- 需要特别处理 DPR、字体渲染和图表容器尺寸变更

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

addEventListener('resize', debounce(() => scaleToFit(rootEl), 100));
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
const ro = new ResizeObserver(debounce(entries => {
  for (const entry of entries) {
    chart.resize({
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    });
  }
}, 100));
ro.observe(container);

// 4. 高 DPR 屏幕清晰度
const dpr = devicePixelRatio || 1;
const chart2 = echarts.init(container, null, { devicePixelRatio: dpr });
```

### 延伸
- 大屏适配不是单纯缩放一层容器，信息密度和可读性同样重要
