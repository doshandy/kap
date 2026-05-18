---
id: 25-rust-wasm
title: Rust 工具链与 WASM
order: 25
icon: 🦀
description: Rust 重构前端工具链、WebAssembly 在浏览器与 Node 中的工程化实践。
---

## why-rust-tooling

title: 为什么前端工具链都在被 Rust 重写
followups: [why-rust-tooling-followup-1]
difficulty: 进阶
tags: [Rust, 工具链]

### 一句话

Rust 重写工具链的核心收益是更可控的性能、内存安全和跨平台二进制分发；它常在解析、转换、压缩、lint 这类 CPU 密集任务上明显快于 JS 实现，但收益取决于任务类型、插件生态和团队维护能力。

### 题目

Vite 5 默认仍是 esbuild，但 SWC、Rolldown、Turbopack、Biome、Lightning CSS 等都用 Rust，它们的核心收益是什么？

### 答案要点

- 性能：原生编译、零 GC、并行更彻底，在解析、转换、压缩、lint 等 CPU 密集任务上常比 JS 实现更快
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

### 追问

- 「为什么前端工具链都在被 Rust 重写」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「为什么前端工具链都在被 Rust 重写」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Rust、工具链，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 选型时考虑"现有插件是否齐全"，新工具往往要 6-12 个月才追上老生态
- 自研基础设施是否用 Rust，要看热点是否真在 CPU、插件生态是否可控、团队是否能长期维护；不是所有脚手架 / lint 都值得用 Rust 重写

## wasm-fundamentals

title: WebAssembly 基础与运行模型
followups: [wasm-fundamentals-followup-1]
links: [js-wasm-data-bridge]
difficulty: 进阶
tags: [WASM, 浏览器]

### 一句话

二进制指令格式，跑在浏览器 / Node 内的栈机虚拟机里，与 JS 共享同一事件循环；优势是可预测的性能、接近原生速度，以及可由 Rust/C/C++/Go/Zig/AssemblyScript 等多语言编译生成。

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

### 追问

- WASM 加载失败时，`instantiateStreaming`、MIME、缓存和 fallback 要怎么处理？
- JS/WASM 之间频繁调用、内存拷贝和 TypedArray 视图失效分别有什么坑？
- 如果要在线上证明 WASM 方案稳定，你会看哪些加载、编译、执行和降级指标？

### 常见误区

- 把 WASM 当成“自动更快”的黑盒，忽略 JS/WASM 调用边界、内存拷贝和主线程阻塞。
- 只写 `instantiateStreaming`，没有处理服务器 MIME 不正确、旧浏览器或本地文件场景下的 `arrayBuffer + instantiate` fallback。
- 忽略 COOP/COEP、SharedArrayBuffer、Worker、缓存版本和降级路径，导致多线程或大模块上线后不稳定。
- 只看算法执行耗时，不看 WASM 下载、编译、实例化、内存增长和错误率。

### 延伸

- WASM 不是用来"取代 JS"的，而是给计算密集型部分（图像 / 加解密 / 编辑器内核 / 编译器）加速
- WASI 让 WASM 走出浏览器，作为可移植的服务器 / Edge 运行时

## rust-wasm-toolchain

title: 用 Rust 写浏览器 WASM 模块的完整流程
followups: [rust-wasm-toolchain-followup-1]
difficulty: 资深
tags: [Rust, wasm-bindgen]

### 一句话

cargo new --lib，Cargo.toml 添加 crate-type = ["cdylib"]，依赖 wasm-bindgen；用 wasm-pack build --target web 生成 ESM + .wasm。

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

### 追问

- 「用 Rust 写浏览器 WASM 模块的完整流程」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「用 Rust 写浏览器 WASM 模块的完整流程」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Rust、wasm-bindgen，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 体积控制目标：业务模块 50–200KB gzip 可接受；超过就要拆功能 / 懒加载
- AssemblyScript 学习曲线低（语法接近 TS），适合不想学 Rust 的团队入门 WASM

## wasm-perf-cases

title: 哪些场景上 WASM 真的能提速
followups: [wasm-perf-cases-followup-1]
difficulty: 资深
tags: [WASM, 性能]

### 一句话

适合：图像/视频处理、加解密 / 哈希、PDF / Office / Excel 解析、CAD / 仿真、压缩 / 转码、游戏物理；不太适合：字符串 / DOM 操作密集、调用频繁但计算量小的（互操作开销大于 JS 自身）。

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

### 追问

- 你会先看哪些指标来判断「哪些场景上 WASM 真的能提速」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「哪些场景上 WASM 真的能提速」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 WASM、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 上 WASM 前先做 JS 优化（typed array、避免 GC、批量化），很多时候已经够了
- 真要落地，用 Web Worker 跑 WASM 不堵主线程，用户体感差异最大

## wasm-runtime-server

title: 服务端 / Edge 跑 WASM 的现状
followups: [wasm-runtime-server-followup-1]
difficulty: 资深
tags: [WASM, Edge, WASI]

### 一句话

三大优势：启动毫秒级、内存隔离强、跨语言安全沙箱；WASI（WebAssembly System Interface）让 WASM 能访问文件 / 网络 / 时钟，逼近 Node。

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

### 追问

- 「服务端 / Edge 跑 WASM 的现状」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「服务端 / Edge 跑 WASM 的现状」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 WASM、Edge、WASI，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Component Model 标准化跨语言互操作，未来 WASM 模块可以像 npm 包一样组合
- 不要为了用 WASM 而用 WASM，没有清晰收益（性能、隔离、跨语言）就别上

## js-rust-interop

title: JS 与 Rust/WASM 的数据互操作模式
followups: [js-rust-interop-followup-1]
difficulty: 资深
tags: [互操作, WASM]

### 一句话

零拷贝：直接把 Uint8Array 视图建在 wasm memory.buffer 上，原地处理；池化：复用 wasm memory 中的 buffer，避免反复 alloc / free；分块：超大输入分块送进去。

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

### 追问

- 「JS 与 Rust/WASM 的数据互操作模式」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「JS 与 Rust/WASM 的数据互操作模式」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 互操作、WASM，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 多线程场景下要用 SAB + Atomics 做 lock，否则数据竞争会挂掉整个 wasm instance
- 复杂数据结构（图、树）尽量在 wasm 内构建，对外只暴露不可变快照

## rust-frontend-tooling

title: 前端工具链为什么开始用 Rust 重写
followups: [rust-frontend-tooling-followup-1]
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

### 追问

- 「前端工具链为什么开始用 Rust 重写」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「前端工具链为什么开始用 Rust 重写」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Rust、工具链，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不是所有工具都需要 Rust，业务规模 < 万行项目用 ESLint / Prettier 完全够
- Rust 工具链最大风险是"插件生态滞后"，迁移要做 PoC
- 长期看 JS / Rust 分层共生：上层逻辑 JS、底层基建 Rust

## wasm-when-not-to-use

title: WebAssembly 什么场景不该用？常见误区
followups: [wasm-when-not-to-use-followup-1]
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

const items = [
  /* ... */
];
const out = items.map((x) => simpleProcess(x));

import init, { batchProcess } from './wasm/dsp.js';
const buf = new Float32Array(items.flat());
const out = batchProcess(buf);
```

### 追问

- 你会先看哪些指标来判断「WebAssembly 什么场景不该用？常见误区」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「WebAssembly 什么场景不该用？常见误区」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 WASM、架构、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 体积优化：wasm-opt -Oz、wee_alloc 替代 std allocator
- 加载优化：streaming compile（`WebAssembly.instantiateStreaming`）+ 拆 chunk
- 真实指标：WebAssembly 启动时间在低端机可能 200ms+，要 lazy

## js-wasm-data-bridge

title: JS 和 WASM 之间数据怎么高效传递
followups: [js-wasm-data-bridge-followup-1]
links: [wasm-fundamentals]
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

### 追问

- 你会先看哪些指标来判断「JS 和 WASM 之间数据怎么高效传递」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「JS 和 WASM 之间数据怎么高效传递」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 WASM、性能、互操作，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- WASI 让 WASM 跑出浏览器（CLI / 服务端 / Edge）
- Component Model：WASM 模块间标准化数据交换
- AssemblyScript：用 TS 风格语法写 WASM，门槛低但生态没 Rust 大

## wasm-when-to-use-basic

title: 什么场景下前端值得用 WebAssembly？什么场景不值得？
followups: [wasm-when-to-use-basic-followup-1, wasm-when-to-use-basic-followup-2, wasm-when-to-use-basic-followup-3]
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
const { instance } = await WebAssembly.instantiateStreaming(fetch('/img-resize.wasm'));
const { resize, memory } = instance.exports as any;
const ptr = (resize as Function)(width, height);
const out = new Uint8ClampedArray((memory as WebAssembly.Memory).buffer, ptr, width * height * 4);
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

## why-rust-tooling-followup-1

title: 追问：「为什么前端工具链都在被 Rust 重写」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Rust, 工具链, 追问]
parent: why-rust-tooling

### 题目

如果面试官追问：「为什么前端工具链都在被 Rust 重写」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「为什么前端工具链都在被 Rust 重写」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Rust 常在 CPU 密集工具链任务上更快」要进一步补到边界条件里：插件生态、二进制分发、调试成本和团队维护能力都会影响最终收益。

## wasm-fundamentals-followup-1

title: 追问：「WebAssembly 基础与运行模型」加载、实例化和 JS 互操作有哪些边界问题
difficulty: 进阶
tags: [WASM, 浏览器, 追问]
parent: wasm-fundamentals

### 题目

如果面试官追问：「WebAssembly 基础与运行模型」加载、实例化和 JS 互操作有哪些边界问题？

### 答案要点

#### 核心回答

- 先把 WASM 生命周期拆开：下载、MIME 校验、编译/实例化、导入对象、线性内存、JS/WASM 调用边界和 Worker 调度分别可能出问题。
- `instantiateStreaming` 要求服务端返回正确 `application/wasm`，否则要 fallback 到 `arrayBuffer + WebAssembly.instantiate`；大模块还要考虑缓存版本、CDN 命中和首次编译耗时。
- 互操作上要控制调用频率和数据拷贝：频繁小调用可能抵消计算收益，`memory.grow()` 后旧 TypedArray 视图可能失效，复杂对象通常要编码成指针、长度或共享缓冲。
- 多线程能力依赖 cross-origin isolation、SharedArrayBuffer、Worker 和 Atomics；不满足条件时要降级为单线程或 JS 实现，并上报加载/实例化/执行错误率。

## rust-wasm-toolchain-followup-1

title: 追问：「用 Rust 写浏览器 WASM 模块的完整流程」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Rust, wasm-bindgen, 追问]
parent: rust-wasm-toolchain

### 题目

如果面试官追问：「用 Rust 写浏览器 WASM 模块的完整流程」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「用 Rust 写浏览器 WASM 模块的完整流程」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「cargo new --lib，Cargo.toml 添加 crate-type = ["cdylib"]，依赖 wasm-bindgen」要进一步补到边界条件里，而不是只复述结论。

## wasm-perf-cases-followup-1

title: 追问：你会先看哪些指标来判断「哪些场景上 WASM 真的能提速」是不是当前性能瓶颈
difficulty: 资深
tags: [WASM, 性能, 追问]
parent: wasm-perf-cases

### 题目

如果面试官追问：你会先看哪些指标来判断「哪些场景上 WASM 真的能提速」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「哪些场景上 WASM 真的能提速」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## wasm-runtime-server-followup-1

title: 追问：「服务端 / Edge 跑 WASM 的现状」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [WASM, Edge, WASI, 追问]
parent: wasm-runtime-server

### 题目

如果面试官追问：「服务端 / Edge 跑 WASM 的现状」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「服务端 / Edge 跑 WASM 的现状」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「三大优势：启动毫秒级、内存隔离强、跨语言安全沙箱」要进一步补到边界条件里，而不是只复述结论。

## js-rust-interop-followup-1

title: 追问：「JS 与 Rust/WASM 的数据互操作模式」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [互操作, WASM, 追问]
parent: js-rust-interop

### 题目

如果面试官追问：「JS 与 Rust/WASM 的数据互操作模式」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「JS 与 Rust/WASM 的数据互操作模式」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「零拷贝：直接把 Uint8Array 视图建在 wasm memory.buffer 上，原地处理」要进一步补到边界条件里，而不是只复述结论。

## rust-frontend-tooling-followup-1

title: 追问：「前端工具链为什么开始用 Rust 重写」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Rust, 工具链, 追问]
parent: rust-frontend-tooling

### 题目

如果面试官追问：「前端工具链为什么开始用 Rust 重写」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「前端工具链为什么开始用 Rust 重写」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「单线程 + V8 GC，编译大型项目时 CPU 用不满」要进一步补到边界条件里，而不是只复述结论。

## wasm-when-not-to-use-followup-1

title: 追问：你会先看哪些指标来判断「WebAssembly 什么场景不该用？常见误区」是不是当前性能瓶颈
difficulty: 资深
tags: [WASM, 架构, 性能, 追问]
parent: wasm-when-not-to-use

### 题目

如果面试官追问：你会先看哪些指标来判断「WebAssembly 什么场景不该用？常见误区」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「WebAssembly 什么场景不该用？常见误区」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## js-wasm-data-bridge-followup-1

title: 追问：你会先看哪些指标来判断「JS 和 WASM 之间数据怎么高效传递」是不是当前性能瓶颈
difficulty: 资深
tags: [WASM, 性能, 互操作, 追问]
parent: js-wasm-data-bridge

### 题目

如果面试官追问：你会先看哪些指标来判断「JS 和 WASM 之间数据怎么高效传递」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「JS 和 WASM 之间数据怎么高效传递」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## wasm-when-to-use-basic-followup-1

title: 追问：「什么场景下前端值得用 WebAssembly？什么场景不值得」在弱网、代理、断连或服务端限流时会出现哪些边界问题
difficulty: 基础
tags: [WASM, 选型, 基础, 追问]
parent: wasm-when-to-use-basic

### 题目

如果面试官追问：「什么场景下前端值得用 WebAssembly？什么场景不值得」在弱网、代理、断连或服务端限流时会出现哪些边界问题？

### 答案要点

#### 核心回答

- 先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「什么场景下前端值得用 WebAssembly？什么场景不值得」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

## wasm-when-to-use-basic-followup-2

title: 追问：你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 基础
tags: [WASM, 选型, 基础, 追问]
parent: wasm-when-to-use-basic

### 题目

如果面试官追问：你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 核心回答

- 先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。
- 弱网、重试和超时会放大「什么场景下前端值得用 WebAssembly？什么场景不值得」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。
- 降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。

## wasm-when-to-use-basic-followup-3

title: 追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 基础
tags: [WASM, 选型, 基础, 追问]
parent: wasm-when-to-use-basic

### 题目

如果面试官追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「什么场景下前端值得用 WebAssembly？什么场景不值得」不是只在理想输入下成立。
- 再补可观测指标：链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## wasm-component-model-wasi-preview2

title: WebAssembly Component Model 与 WASI Preview 2 解决什么
difficulty: 资深
tags: [WASM, ComponentModel, WASI, Edge]
links: [wasm-runtime-server, wasm-fundamentals, js-wasm-data-bridge]

### 一句话

WASM Component Model 试图把“一个 wasm 模块怎么导入/导出类型化接口、怎么跨语言组合”标准化；WASI Preview 2 则把文件、网络、时钟、随机数等系统能力变成 capability-based 的接口，更适合服务端和边缘运行时。

### 题目

浏览器前端常把 WASM 当作性能模块，但服务端/Edge 场景开始讨论 Component Model 和 WASI Preview 2。它们分别解决什么问题？和传统 JS 调 wasm 有什么差别？

### 答案要点

- 传统 wasm 核心模块主要暴露数字、内存和函数，复杂类型要靠 JS 胶水代码、线性内存约定和序列化协议手写。
- Component Model 引入更高层的组件边界和接口类型，让字符串、record、list、result 等跨语言数据更标准，方便 Rust、Go、C#、JS 等语言产物组合。
- WASI Preview 2 以 capability 为核心：模块只能访问显式传入的文件、网络、环境等能力，比“进程默认拥有系统权限”更适合沙箱和多租户。
- 前端影响主要在工具链和边缘架构：同一业务规则可编译成组件，在 Edge、服务端、插件系统里复用，浏览器侧仍要看运行时支持和包体成本。
- 当前落地要看运行时成熟度、组件化工具链、调试能力和生态库支持，不应把它当成立刻替换 Node/浏览器 JS 的通用方案。

### 代码示例

```wit
package app:pricing;

interface price {
  record item {
    sku: string,
    cents: u32,
  }

  discount: func(items: list<item>) -> result<u32, string>;
}

world pricing-plugin {
  export price;
}
```

### 常见误区

- 以为 Component Model 只是“wasm 打包格式”，忽略它真正解决的是接口类型、跨语言组合和组件边界。
- 把 WASI 理解成浏览器 API；WASI 更偏服务器、CLI、边缘和插件沙箱，不直接给 DOM 能力。
- 忽略运行时差异：Wasmtime、Wasmer、边缘平台和浏览器对组件模型的支持程度不同。

### 追问

- Component Model 为什么比手写 JS glue 更适合跨语言插件？
- WASI 的 capability-based 权限模型和传统进程权限有什么差别？
- 在前端团队里，什么业务规则适合沉到 WASM 组件复用？
