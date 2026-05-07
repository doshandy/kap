---
id: 25-rust-wasm
title: Rust 工具链与 WASM
order: 25
icon: 🦀
description: Rust 重构前端工具链、WebAssembly 在浏览器与 Node 中的工程化实践。
---

## why-rust-tooling
title: 为什么前端工具链都在被 Rust 重写
difficulty: 进阶
tags: [Rust, 工具链]

### 一句话
性能：原生编译、零 GC、并行更彻底，10× ~ 100× 于 Node 实现；稳定：内存安全 + 强类型，比 JS 更适合写编译器 / lexer / linter；跨平台：单一二进制，CI / Docker 容易分发…。

### 题目
Vite 5 默认仍是 esbuild，但 SWC、Rolldown、Turbopack、Biome、Lightning CSS 等都用 Rust，它们的核心收益是什么？

### 答案要点
- 性能：原生编译、零 GC、并行更彻底，10× ~ 100× 于 Node 实现
- 稳定：内存安全 + 强类型，比 JS 更适合写编译器 / lexer / linter
- 跨平台：单一二进制，CI / Docker 容易分发；通过 napi-rs 暴露 Node 绑定
- 工具栈正在收敛：SWC 替代 Babel、Rolldown 替代 Rollup、Biome 替代 ESLint+Prettier、Oxc 是新势力
- 风险：Rust 生态门槛高，二进制升级和补丁周期更长；老生态插件缺失

### 代码示例
```ts
import swc from '@swc/core';

const { code } = await swc.transform(source, {
  jsc: {
    parser: { syntax: 'typescript', tsx: true },
    transform: { react: { runtime: 'automatic' } },
    target: 'es2022',
  },
});
```

```bash
biome check --apply src/
biome format --write src/
oxlint --fix src/
```

### 延伸
- 选型时考虑"现有插件是否齐全"，新工具往往要 6-12 个月才追上老生态
- 自研基础设施（脚手架 / lint）建议优先 Rust，长期收益更大

## wasm-fundamentals
title: WebAssembly 基础与运行模型
difficulty: 进阶
tags: [WASM, 浏览器]

### 一句话
二进制指令格式，跑在浏览器 / Node 内的栈机虚拟机里，与 JS 共享同一事件循环；优势：可预测的性能、接近原生速度、多语言（Rust/C/C++/Go/。

### 题目
WASM 是什么？它和 JS 的关系如何，浏览器是怎么加载和运行的？

### 答案要点
- 二进制指令格式，跑在浏览器 / Node 内的栈机虚拟机里，与 JS 共享同一事件循环
- 优势：可预测的性能、接近原生速度、多语言（Rust/C/C++/Go/Zig/AssemblyScript）
- 限制：不能直接访问 DOM；通过 JS 互操作，调用代价不可忽略
- 加载：`fetch + WebAssembly.instantiate(Streaming)`，可与 JS 并行解析
- 内存模型：连续 `Memory`（线性）+ JS 通过 TypedArray 视图读写，所有权要清晰
- 多线程：`SharedArrayBuffer` + Web Worker + Atomics，需要 cross-origin isolation

### 代码示例
```ts
const { instance } = await WebAssembly.instantiateStreaming(fetch('/img.wasm'), {
  env: { abort: () => {}, log: (n: number) => console.log(n) },
});

const { resize, memory } = instance.exports as {
  resize: (ptr: number, len: number, w: number, h: number) => number;
  memory: WebAssembly.Memory;
};

function blurImage(rgba: Uint8ClampedArray, w: number, h: number) {
  const ptr = (instance.exports.alloc as (n: number) => number)(rgba.byteLength);
  new Uint8Array(memory.buffer, ptr, rgba.byteLength).set(rgba);
  resize(ptr, rgba.byteLength, w, h);
  return new Uint8ClampedArray(memory.buffer.slice(ptr, ptr + rgba.byteLength));
}
```

### 延伸
- WASM 不是用来"取代 JS"的，而是给计算密集型部分（图像 / 加解密 / 编辑器内核 / 编译器）加速
- WASI 让 WASM 走出浏览器，作为可移植的服务器 / Edge 运行时

## rust-wasm-toolchain
title: 用 Rust 写浏览器 WASM 模块的完整流程
difficulty: 资深
tags: [Rust, wasm-bindgen]

### 一句话
cargo new --lib，Cargo.toml 添加 crate-type = ["cdylib"]，依赖 wasm-bindgen；用 wasm-pack build --target web 生成 ESM + .wasm…。

### 题目
从 0 写一个 Rust 模块给前端调用，工具链和工程化如何组织？

### 答案要点
- `cargo new --lib`，`Cargo.toml` 添加 `crate-type = ["cdylib"]`，依赖 `wasm-bindgen`
- 用 `wasm-pack build --target web` 生成 ESM + .wasm
- `wasm-bindgen` 自动生成 JS 绑定，TypedArray、字符串自动序列化
- 优化：`wasm-opt -O3`、移除 panic 信息、`lto = true`、`opt-level = 's'` 控体积
- 工程化：Vite/Webpack 用 `vite-plugin-wasm` / asset/resource 直接 import
- 调试：浏览器原生支持 wasm 断点，配合 source map

### 代码示例
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fib(n: u32) -> u64 {
    if n < 2 { n as u64 } else { fib(n - 1) + fib(n - 2) }
}

#[wasm_bindgen]
pub fn process(buf: &mut [u8]) {
    for b in buf.iter_mut() {
        *b = 255 - *b;
    }
}
```

```ts
import init, { fib, process } from './pkg/myalgo';

await init();
console.log(fib(40));

const data = new Uint8Array([1, 2, 3, 4]);
process(data);
console.log(data);
```

### 延伸
- 体积控制目标：业务模块 50–200KB gzip 可接受；超过就要拆功能 / 懒加载
- AssemblyScript 学习曲线低（语法接近 TS），适合不想学 Rust 的团队入门 WASM

## wasm-perf-cases
title: 哪些场景上 WASM 真的能提速
difficulty: 资深
tags: [WASM, 性能]

### 一句话
适合：图像/视频处理、加解密 / 哈希、PDF / Office / Excel 解析、CAD / 仿真、压缩 / 转码、游戏物理；不太适合：字符串 / DOM 操作密集、调用频繁但计算量小的（互操作开销大于 JS 自身）…。

### 题目
什么样的前端任务用 WASM 才能拿到明显收益？哪些反而会变慢？

### 答案要点
- 适合：图像/视频处理、加解密 / 哈希、PDF / Office / Excel 解析、CAD / 仿真、压缩 / 转码、游戏物理
- 不太适合：字符串 / DOM 操作密集、调用频繁但计算量小的（互操作开销大于 JS 自身）
- 互操作开销：每次 JS<->WASM 跨界 ~微秒级，频繁短调用就被开销吞掉
- 内存复制：把数据复制进 WASM 线性内存是大头，能直接传 buffer 就别 copy
- 多线程：SAB + Worker 让真正的 CPU 密集任务并行，但需要 COOP/COEP header
- 真实案例：Figma、Photoshop Web、ffmpeg.wasm、SQLite WASM、Skia、PDFium

### 代码示例
```ts
performance.mark('js-start');
const out1 = blurInJs(rgba, 1920, 1080);
performance.mark('js-end');
performance.measure('js-blur', 'js-start', 'js-end');

performance.mark('wasm-start');
const out2 = blurInWasm(rgba, 1920, 1080);
performance.mark('wasm-end');
performance.measure('wasm-blur', 'wasm-start', 'wasm-end');

console.table(performance.getEntriesByType('measure'));
```

### 延伸
- 上 WASM 前先做 JS 优化（typed array、避免 GC、批量化），很多时候已经够了
- 真要落地，用 Web Worker 跑 WASM 不堵主线程，用户体感差异最大

## wasm-runtime-server
title: 服务端 / Edge 跑 WASM 的现状
difficulty: 资深
tags: [WASM, Edge, WASI]

### 一句话
三大优势：启动毫秒级、内存隔离强、跨语言安全沙箱；WASI（WebAssembly System Interface）让 WASM 能访问文件 / 网络 / 时钟，逼近 Node…。

### 题目
WASM 不只是浏览器技术，它在服务端有什么落地场景？为什么 Cloudflare / Fastly / Shopify 都在押注？

### 答案要点
- 三大优势：启动毫秒级、内存隔离强、跨语言安全沙箱
- WASI（WebAssembly System Interface）让 WASM 能访问文件 / 网络 / 时钟，逼近 Node
- 边缘计算：Cloudflare Workers / Fastly Compute@Edge 跑 WASM 模块，比容器轻几个数量级
- 插件系统：Shopify、Envoy、Istio 用 WASM 做用户自定义插件，安全又跨语言
- 数据库 UDF：用 WASM 写自定义函数，避免 fork 进程
- 工具链：Wasmtime、WasmEdge、wasi-sdk、wasmCloud

### 代码示例
```rust
use std::io::{self, Read, Write};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let upper = input.to_uppercase();
    io::stdout().write_all(upper.as_bytes()).unwrap();
}
```

```bash
cargo build --target wasm32-wasi --release
wasmtime run target/wasm32-wasi/release/upper.wasm < input.txt
```

### 延伸
- Component Model 标准化跨语言互操作，未来 WASM 模块可以像 npm 包一样组合
- 不要为了用 WASM 而用 WASM，没有清晰收益（性能、隔离、跨语言）就别上

## js-rust-interop
title: JS 与 Rust/WASM 的数据互操作模式
difficulty: 资深
tags: [互操作, WASM]

### 一句话
零拷贝：直接把 Uint8Array 视图建在 wasm memory.buffer 上，原地处理；池化：复用 wasm memory 中的 buffer，避免反复 alloc / free；分块：超大输入分块送进去…。

### 题目
图像 / 大数组传给 WASM 处理后再回到 JS，怎么做能既快又不爆内存？

### 答案要点
- 零拷贝：直接把 `Uint8Array` 视图建在 wasm `memory.buffer` 上，原地处理
- 池化：复用 wasm memory 中的 buffer，避免反复 alloc / free
- 分块：超大输入分块送进去，避免 wasm linear memory 增长（grow 不可缩）
- 结构化数据：用 wasm-bindgen 的 `serde-wasm-bindgen` 序列化，但要警惕开销
- 错误处理：返回 Result，JS 侧把 wasm panic 转成可恢复异常，避免整个 instance 不可用

### 代码示例
```ts
let cachedBuf: Uint8Array | null = null;

function getOrAllocBuffer(size: number) {
  if (cachedBuf && cachedBuf.byteLength >= size) {
    return cachedBuf.subarray(0, size);
  }
  const ptr = (wasm.exports.alloc as (n: number) => number)(size);
  cachedBuf = new Uint8Array((wasm.exports.memory as WebAssembly.Memory).buffer, ptr, size);
  return cachedBuf;
}

export function blur(rgba: Uint8Array, w: number, h: number) {
  const buf = getOrAllocBuffer(rgba.byteLength);
  buf.set(rgba);
  (wasm.exports.blur as (ptr: number, w: number, h: number) => void)(buf.byteOffset, w, h);
  return buf.slice();
}
```

### 延伸
- 多线程场景下要用 SAB + Atomics 做 lock，否则数据竞争会挂掉整个 wasm instance
- 复杂数据结构（图、树）尽量在 wasm 内构建，对外只暴露不可变快照

## rust-frontend-tooling
title: 前端工具链为什么开始用 Rust 重写
difficulty: 进阶
tags: [Rust, 工具链]

### 一句话
Rust 编译到 native，单线程比 JS 快 10-100 倍 + 可放心多线程，所以编译 / 打包 / lint 这种 CPU 密集任务越来越多换成 Rust：SWC、Rolldown、Turbopack、Biome、Rspack。

### 题目
为什么 Rust / Go 这些原生语言开始大量出现在前端工具链中？哪些工具值得关注？

### 答案要点
- **Node.js 工具链的瓶颈**
  - 单线程 + V8 GC，编译大型项目时 CPU 用不满
  - 一些需要 AST 操作的工具（Babel / ESLint / Prettier）耗时占据 CI 大头
- **Rust 的优势**
  - native 速度 + 零成本抽象
  - 内存安全，不需要 GC 暂停
  - 多线程容易写得安全（borrow checker）
  - WASM 输出友好，可在 Node / 浏览器 / Edge 共用
- **代表项目**
  - **SWC**（@swc/core）：Babel 替代品，10-70x；Next.js / Vite / Rspack 都用它
  - **esbuild**（Go 写的）：开发态打包，启动飞快；Vite 预构建用它
  - **Rolldown**：Vite 团队的 Rust Rollup 替代，目标兼容 Rollup 插件
  - **Turbopack**：Next.js 自研，Webpack 替代
  - **Rspack**：字节 Webpack 兼容版，迁移成本最低
  - **Biome**：Rust 写的 lint + format，目标替代 ESLint + Prettier
  - **Oxc**：JS 解析器 / linter / minifier 全栈 Rust 工具
- **WASM 的角色**
  - 大型库的核心算法（图像处理、加解密、AI 推理）可写成 Rust → WASM
  - 浏览器和 Edge runtime 都能跑同一份代码
- **趋势**
  - 工具链的"硬功能"（解析 / 类型 / 打包）会越来越向 Rust 收敛
  - 应用层（业务逻辑）仍是 JS / TS 的主场

### 代码示例
```ts
import { defineConfig } from 'vite';
import { rollup } from 'rolldown';

const bundle = await rollup({ input: 'src/index.ts' });
await bundle.write({ dir: 'dist', format: 'esm' });
```

```toml
[lint]
rules.recommended = true
[formatter]
indentStyle = "space"
```

### 延伸
- 不是所有工具都需要 Rust，业务规模 < 万行项目用 ESLint / Prettier 完全够
- Rust 工具链最大风险是"插件生态滞后"，迁移要做 PoC
- 长期看 JS / Rust 分层共生：上层逻辑 JS、底层基建 Rust


## wasm-when-not-to-use
title: WebAssembly 什么场景不该用？常见误区
difficulty: 资深
tags: [WASM, 架构, 性能]

### 一句话
DOM 操作密集 / 简单计算 / 启动时间敏感的小工具，**用 WASM 反而慢**——WASM 的强项是计算密集 + 复用现成 C/Rust 生态，不是"什么都能加速"。

### 题目
团队听说 WASM 很快，想把所有热点逻辑都用 Rust 重写。哪些场景其实不该用 WASM？

### 答案要点
- **WASM 的真实优势**
  - CPU 密集计算（codec / 加密 / 物理仿真 / 解析 AST）
  - 复用现成的 C / C++ / Rust 库（FFmpeg / SQLite / OpenCV）
  - 性能可预测（无 GC 抖动）
  - 安全沙盒（适合不可信代码执行）
- **不该用 WASM 的场景**
  - **DOM 操作多**：WASM 没法直接操作 DOM，每次得 JS bridge，调用开销大
  - **简单计算**：JS V8 优化后跟 WASM 差距很小，但你多了 200KB+ wasm 体积 + 加载时间
  - **首屏 / 启动敏感**：编译 + 实例化需要时间（几十到几百 ms），首屏用反而慢
  - **频繁与 JS 交互**：每次跨界调用有成本（JS ↔ WASM 数据拷贝、字符串编码）
  - **小型工具函数**：debounce / throttle / 简单解析，没必要
- **常见性能反模式**
  - 在循环里频繁调用 WASM 导出函数：每次跨界开销累加 > 节省的计算时间
  - 大字符串 / Object 跨界：序列化开销远超 WASM 内部计算
  - 没用 SharedArrayBuffer 就在 WASM 和 JS 间复制大数组
- **正确用法**
  - 一次跨界处理一大块数据
  - 用 SharedArrayBuffer / Memory.buffer 共享，避免拷贝
  - 把整个"业务流"塞进 WASM（如 Excel parser），而不是把零碎函数搬过去
- **典型成功案例**
  - Figma：渲染引擎 C++ → WASM
  - Photoshop Web：核心图像处理
  - SQLite WASM：浏览器内直接跑 SQL
  - SWC / Rolldown / Lightning CSS：构建工具用 Rust 编译到 native，不是 WASM
- **决策清单**
  - 你的瓶颈是 CPU 还是 IO / DOM？
  - 复用现成库比自己写更值得吗？
  - 跨界调用频率高吗？
  - 体积 / 加载时间能接受吗？

### 代码示例
```ts
import init, { fft } from './wasm/dsp.js';
await init();

const samples = new Float32Array(8192);
const result = fft(samples);

const items = [/* ... */];
const out = items.map((x) => simpleProcess(x));

import init, { batchProcess } from './wasm/dsp.js';
const buf = new Float32Array(items.flat());
const out = batchProcess(buf);
```

### 延伸
- 体积优化：wasm-opt -Oz、wee_alloc 替代 std allocator
- 加载优化：streaming compile（`WebAssembly.instantiateStreaming`）+ 拆 chunk
- 真实指标：WebAssembly 启动时间在低端机可能 200ms+，要 lazy

## js-wasm-data-bridge
title: JS 和 WASM 之间数据怎么高效传递
difficulty: 资深
tags: [WASM, 性能, 互操作]

### 一句话
WASM 内存就是一块 ArrayBuffer；**只能传数字**，复杂数据（字符串 / 对象）要先序列化到这块内存里 → 把指针 + 长度传过去；用 wasm-bindgen / Emscripten 自动生成 binding，但理解底层有助于性能调优。

### 题目
你想从 JS 把一个 100MB 的图片像素 buffer 给 Rust 处理。怎么传才不会复制开销巨大？

### 答案要点
- **WASM 内存模型**
  - WASM 实例有一块线性 Memory（默认 16MB，可增长）
  - JS 通过 `instance.exports.memory.buffer` 拿到 ArrayBuffer
  - 这块 buffer JS 和 WASM 直接共享（同一片内存）
- **基础 API（手写）**
  - 分配：调 wasm 导出的 alloc(size) → 拿 ptr
  - 写入：JS 用 `new Uint8Array(memory.buffer, ptr, size).set(data)`
  - 调函数：`process(ptr, size)`
  - 读结果：从指定 ptr 读 buffer
  - 释放：调 free(ptr)
- **wasm-bindgen 自动化**
  - 标 `#[wasm_bindgen]` 函数，参数 / 返回值类型自动桥接
  - `&[u8]` / `Vec<u8>` 自动复制；想零拷贝用 `js_sys::Uint8Array::view`
  - 字符串：自动 UTF-8 编码 / 解码（有开销）
- **零拷贝技巧**
  - 大 buffer：JS 把数据写进 WASM memory，传 ptr；处理完直接读
  - SharedArrayBuffer：跨 worker 真共享，不需要拷贝（要 COOP/COEP 头）
  - WebGPU / WebCodecs：直接在 GPU buffer 上跑，跳过 CPU 拷贝
- **跨界调用成本**
  - 单次调用 ~微秒级；高频调用累加成性能瓶颈
  - 把"循环 + 数据"整体扔进 WASM，比 JS 循环里调 WASM 快得多
- **字符串处理**
  - JS 是 UTF-16，WASM / Rust 通常是 UTF-8 → 编码转换有成本
  - 大量字符串处理建议在 WASM 内闭环

### 代码示例
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn invert_pixels(data: &mut [u8]) {
    for chunk in data.chunks_mut(4) {
        chunk[0] = 255 - chunk[0];
        chunk[1] = 255 - chunk[1];
        chunk[2] = 255 - chunk[2];
    }
}
```

```ts
import init, { invert_pixels, __wbindgen_malloc, __wbindgen_free } from './pkg/dsp.js';

await init();

const memory = (init as any).__wbindgen_export_2.buffer as ArrayBuffer;
const u8 = new Uint8Array(imageData.data);
const ptr = __wbindgen_malloc(u8.length, 1);
new Uint8Array(memory, ptr, u8.length).set(u8);
invert_pixels_raw(ptr, u8.length);

const out = new Uint8Array(memory, ptr, u8.length).slice();
__wbindgen_free(ptr, u8.length, 1);
```

### 延伸
- WASI 让 WASM 跑出浏览器（CLI / 服务端 / Edge）
- Component Model：WASM 模块间标准化数据交换
- AssemblyScript：用 TS 风格语法写 WASM，门槛低但生态没 Rust 大


## wasm-when-to-use-basic
title: 什么场景下前端值得用 WebAssembly？什么场景不值得？
difficulty: 基础
tags: [WASM, 选型, 基础]

### 一句话
WASM 适合 CPU 密集 + 算法稳定的场景（图像 / 音视频 / 编解码 / 几何计算），不适合频繁调 DOM 的业务逻辑——JS-WASM 边界跨越成本不低。

### 题目
什么样的前端需求适合用 WebAssembly 改写？什么不适合？

### 答案要点
- **适合**：图像处理（resize / filter）、音视频编解码（FFmpeg.wasm）、加密 / 哈希、3D 几何运算、压缩 / 解压（zstd / brotli）、SQL 解析器、CRDT 引擎
- **不适合**：表单业务逻辑、DOM 操作密集（每次跨边界都有开销）、数据量小但调用频次高的场景
- **关键约束**：JS ↔ WASM 之间通过 ArrayBuffer 复制 / 共享，复杂对象要序列化，结构化对象用 wasm-bindgen 包一层
- **包体积**：WASM 二进制不小（几百 KB+），首屏要权衡是否值得

### 代码示例
```ts
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/img-resize.wasm'),
);
const { resize, memory } = instance.exports as any;
const ptr = (resize as Function)(width, height);
const out = new Uint8ClampedArray(
  (memory as WebAssembly.Memory).buffer,
  ptr,
  width * height * 4,
);
```

### 常见误区
- 以为"WASM 一定比 JS 快"——简单算 JIT 后的 V8 也很快，WASM 优势在固定路径热代码
- 在 main thread 跑大 WASM 任务，仍然会卡 UI；应放 Worker
- 拉来一个 几 MB 的 WASM 替代 50KB 的 JS lib，得不偿失

### 追问
- WASI 是什么，能跑 Node 上吗
- WebGPU 和 WASM 的关系
- 为什么 Figma 选了 C++ → WASM 而不是 JS

### 延伸
- ffmpeg.wasm / image-magick wasm / sql.js 都是经典
- Rust / Zig / AssemblyScript / Tinygo 是几大主流编译来源

