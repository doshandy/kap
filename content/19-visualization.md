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

## chart-interaction-tooltip
title: 图表交互的几个关键点（联动 / hover / brush / 缩放）
difficulty: 进阶
tags: [可视化, 交互]

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

### 延伸
- 大屏多图联动建议在外部用 RxJS / Pinia 集中状态，比让每个图自己 listen 干净
- ECharts / Highcharts / G2 都有内置的联动接口，先看官方再考虑自己造

## d3-force-network
title: D3 力导向图（Force-directed Graph）实战要点
difficulty: 资深
tags: [D3, 力导向, 图]

### 题目
用 D3 做一张几千节点的关系图，怎么做才能不卡？

### 答案要点
- 物理仿真：`d3-force` 默认 N²，节点过千就会卡；用 `simulation.alphaDecay` 加快收敛
- 渲染：节点多用 Canvas / WebGL（pixi）替代 SVG，节省 DOM 节点
- 分层：固定核心节点位置，外围节点用聚类合并展示
- 交互：拖拽时只重启局部仿真，hover 用四叉树查询提速
- 视图：缩放层级抽稀（zoom in 才显示标签），减少标签数量
- 异步：仿真放 Web Worker，主线程只负责绘制

### 代码示例
```ts
import * as d3 from 'd3';

interface Node { id: string; group: number; x?: number; y?: number; vx?: number; vy?: number }
interface Link { source: string | Node; target: string | Node }

export function buildSimulation(nodes: Node[], links: Link[], canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const sim = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink<Node, Link>(links).id((d) => d.id).distance(40))
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

### 延伸
- "好用的图可视化"通常不是技术难，而是布局设计难，要和业务一起迭代
- 节点超过 5 万考虑 Cytoscape.js / Sigma.js / 自研 GPU 着色

## canvas-vs-svg-vs-webgl
title: Canvas / SVG / WebGL 怎么选，性能边界在哪
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

### 代码示例
```js
const canvas = new OffscreenCanvas(800, 600);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0ea5e9';
ctx.fillRect(0, 0, 800, 600);
const blob = await canvas.convertToBlob();

import * as THREE from 'three';
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(75, 16/9, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }),
);
scene.add(cube);
```

### 延伸
- ECharts 4 默认 Canvas，5 同时支持 SVG，可在小图场景切回 SVG 节省内存
- AntV / G2 / G6 都基于 Canvas / WebGL，G2 高版本支持 GPU 加速
- WebGPU 是更现代的接口，2025 起主流浏览器全面铺开


## map-visualization
title: 地图可视化怎么做？数据点 / 热力图 / 行政区划
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

### 延伸
- 实时点位（车辆 / 配送）：WebSocket 推 + 增量更新 layer data
- 3D 地图：deck.gl 的 ColumnLayer / TripsLayer，立体感强
- 离线场景：自部署矢量瓦片服务（Tegola / Tippecanoe）

## chart-export-printing
title: 图表 / 看板怎么导出图片 / PDF？
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

### 延伸
- 服务端方案对 SEO / 邮件订阅 dashboard 截图很合适
- iText / wkhtmltopdf 老牌方案，但 CSS3 / Web Font 支持不如 Puppeteer
- Excel 导出：SheetJS / exceljs，图表导出为图片嵌入

