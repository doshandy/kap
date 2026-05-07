# Changelog

## 0.4.0

- 修复：复习热力图在路由切换 / 容器尺寸变化后错位、留白；改用 `ResizeObserver` + `onActivated` 自动 resize，并对实例 `dispose` 做健壮处理
- 新增分类（5 个）：
  - `22-react` React 重点（12 题，含 Hooks 规则、Fiber、RSC、Suspense、Server Actions、状态管理选型、Router data loaders、性能优化、React 19、TS 模式、测试）
  - `23-framework-compare` 框架横向对比（8 题，Vue/React/Svelte/Solid/Qwik/Angular 心智模型、渲染策略、运行时体积、生态团队、迁移共存、Resumability）
  - `24-fullstack-meta` Next.js / Nuxt 全栈（6 题，App Router、Server Actions、四层缓存、Nuxt 3、Edge Runtime、SEO/meta）
  - `25-rust-wasm` Rust 工具链与 WASM（6 题，工具链趋势、WASM 基础、wasm-bindgen 流程、性能场景、WASI / Edge、JS↔Rust 互操作）
  - `26-browser-extension` 浏览器插件（6 题，整体架构、MV3、Content Script 通信、最小权限、Tampermonkey、发布与企业分发）
- AI 前端深化到 15 题：补充上下文窗口、function calling、RAG、多模态、成本/延迟、评测、内容审核、表单 Copilot、可观测性
- 现有分类批量增量（每个分类 +2 题，全部带可参考代码）：
  - `01-javascript` 迭代器/生成器、structured clone、标签模板、WeakMap/WeakRef
  - `02-typescript` infer 抽取、全局扩展、Branded Types、类型体操实战
  - `03-vue` Vapor Mode、大促性能体检
  - `04-css` 现代 CSS（has/nesting/layers/scope/container）、CSS 架构选型
  - `05-browser` V8 引擎机制、WebGPU
  - `06-network` WebRTC 基础、HTTP/3 工程影响
  - `07-engineering` Monorepo Changesets、打包器横向对比
  - `08-performance` INP 优化、现代图片流水线
  - `09-node` `node:test`、Stream + 背压
  - `10-architecture` 设计系统工程化、错误边界与韧性
  - `12-softskills` AI 协作最佳实践、技术 Leadership
  - `13-security` Passkeys/WebAuthn、SRI
  - `14-a11y-i18n` 屏幕阅读器测试、Intl 标准 API
  - `15-testing` Playwright 高级用法、Flaky 治理
  - `16-observability` OpenTelemetry 前端接入、Feature Flag / A/B
  - `17-build-publish` Tree-shaking 失效、Service Worker 升级策略
  - `18-crossplatform` 小程序双线程架构、Taro/uni-app 选择
  - `19-visualization` 图表交互联动、D3 力导向图
  - `20-algorithm` 图 BFS/DFS、位运算技巧
  - `21-interview-special` 富文本编辑器设计、实时协作系统设计
- 题库总数：177 → **268**（+91）；分类总数：21 → **26**（+5）
- 解析器：题目 slug 限定为 ASCII，避免代码块中的中文 `## 标题`（如 RFC 模板）被误判为新题
- 工程化：sitemap 增加 `/learn`，并按新 slug 规则统一生成
- 文档：`README` / `CHANGELOG` 同步更新

## 0.3.0

- 修复：浏览器侧 `gray-matter` 依赖 Node `Buffer` 报错导致**所有分类无法加载**（生产环境出现「分类不存在」「系统复习无内容」），改用内置轻量 frontmatter 解析器
- 新增 `/learn` 顺序学习模式：从第 1 题到最后一题全量逐题攻克，支持 ←/→、j/k 快捷键，进度可视化、跳到下一道未掌握、分类一键定位
- 学习路线图新增「📖 从第 1 题开始顺序学习」「🎯 直接抽题模拟」CTA，路径下方加上空态兜底
- 顶栏新增「📖 顺序学习」入口；首页主按钮替换为「顺序学习」
- 文案：移除全部「十年」相关字样，统一为「前端」/「资深 Vue 前端」
- 主 bundle 体积从 610KB 降至 532KB（去掉浏览器侧 `gray-matter`）

## 0.2.0

- 补齐 21 个 `content/*.md` 分类题库，覆盖 JS / TS / Vue / CSS / 浏览器 / 网络 / 工程化 / 性能 / Node / 架构 / AI 前端 / 安全 / 测试 / 可观测 / 发布 / 跨端 / 可视化 / 算法 / 面试专题 / 软技能 / a11y-i18n
- 新增 `scripts/gen-sitemap.ts`，构建期生成 `public/sitemap.xml`
- 完善 README、加题指南与仓库结构说明
- CI 部署流程补齐 lint、typecheck、内容校验与构建门禁

## 0.1.0

- 初始化 Vue 3 + Vite + TypeScript + Pinia + Vue Router 4 项目骨架
- 完成内容解析、知识库页面、复习、搜索、分享、导出、PWA、主题与移动端适配等核心功能
