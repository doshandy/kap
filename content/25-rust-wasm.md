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

