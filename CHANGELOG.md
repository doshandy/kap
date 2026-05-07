# Changelog

## 0.18.0

- feat（PWA）：**新增可见的「应用更新」机制**，告别看到旧版本只能开无痕的尴尬
  - 新组件 `UpdateToast.vue`：检测到新版本时屏幕右下角弹出「立即更新 / 稍后」浮层（同时也显示一次性的「离线就绪」提示）
  - 设置页新增「应用更新」区块：
    - **检查更新**：手动触发 SW `registration.update()`，命中新版本会自动唤起上面的更新 toast
    - **强制更新（清缓存）**：卸载所有 SW + 清空 Cache Storage + 用 `?_v=ts` 强刷，覆盖"内容已更新但页面停在旧版"的极端情况
  - PWA 注册由"自动 skipWaiting"改为 **prompt 模式**：内容更新后 SW 进入 waiting 等用户确认，避免在你写笔记 / 答题时页面突然刷新
  - `useAppUpdate` composable：把 `needRefresh / offlineReady / applyUpdate / forceReload / checkForUpdates` 全部 ref 化，便于其他页面接入
  - 注册时启动 30 分钟一次的轻量 `registration.update()` 轮询，让长时间挂着标签页的用户也能收到新版本

## 0.17.0

- feat：**面试真题（PCG 腾讯视频一面）题型补齐 12 题**
  - 性能 / 监控（5）：`lcp-rum-collection` LCP 线上采集与 AB 验证 / `tbt-and-long-task-collection` Long Task + TBT + rIC 上报权衡 / `source-map-stack-trace` 栈→源码反解 / `white-screen-detection-deep` 多信号白屏检测 / `rrweb-on-demand-recording` 大依赖按需下发与录屏时机
  - 工程化（4）：`webpack-to-vite-migration` 迁移痛点 / `vite-vs-webpack-deep` 为什么快 / `vite-go-and-rolldown` Go 部分 + Vite 7 + Rolldown / `tsconfig-paths-to-bundler-alias` 路径映射统一来源
  - i18n（1）：`i18n-async-locale-routing` 多语言资源拆分 + 路由懒加载 + 切换策略
  - AI（1）：`smart-search-with-embedding-intent` 智能搜索 + 概率分布 / 分组结果消费
  - 网络（1）：`http1-vs-http2-multiplex` HTTP/1.1 vs HTTP/2 多路复用专题 + HPACK / Server Push / TCP 队头阻塞 / HTTP/3 升级
  - 算法（1）：`merge-intervals-deep` 合并区间进阶（复杂度 / 边界 / 变体 / 扫描线引申）
- chore：题库总数 435 → **447**

## 0.16.0

- fix（运行时）：修复 `loadContent() called before initContent() resolved` 报错
  - `useContent.ts` 模块顶层不再调用 `loadContent()`，改为函数体内调用
  - 删除模块级 `allTags` 求值（实际未被任何 .vue 引用）
- feat：**AI 前端题库工程化升级（18 → 48 题）**
  - 新增基础 8 题：Token / 计费 / 采样参数 / 上下文窗口 / 三种 role / Embedding / 流式协议 / 幻觉 / Chat·Completion·Reasoning
  - 新增进阶 6 题：重试退避 / 限流配额 / 流式中断与续写 / Prompt Caching / JSON 输出容错 / 多轮记忆模式
  - 新增资深 6 题：Agent 架构 / 工具设计与路由 / RAG 召回质量 / 多模型路由 / 流式 + 工具协同 / UI 状态机
  - 新增工程化 10 题：Prompt 版本管理 / Eval Pipeline / A/B 测试灰度 / 成本治理 / 可观测性 trace/log/metric / 故障分类与回放 / Guardrails / 数据回流 fine-tune / 多租户隔离 / CI·CD canary / AI 前端安全清单
  - 每题完整 7 段（一句话 / 题目 / 答案要点 / 代码示例 / 常见误区 / 追问 / 延伸），代码示例真实可跑
  - AI 分类难度分布：基础 9 / 进阶 16 / 资深 23（覆盖入门到架构师全梯度）
- chore：validate-content 脚本支持 4 个反引号嵌套 fence

## 0.15.0

- perf：**首屏主 bundle 392KB → 11.5KB gzip（–97%）**
  - markdown 内容改为按需异步 chunk（`import.meta.glob` 不再 eager），主 bundle 不再 inline 全量 880KB markdown
  - ECharts 改为 Home `onMounted` 时懒加载，未访问 Home 不会下载 1MB 的 vendor-echarts
  - 所有 markdown 在 `main.ts` 启动期 Promise.all 并行加载完后再 mount，业务页面无感知
- chore：清理依赖
  - 删除完全未使用的 `@vueuse/core` / `@vue/repl` / `jspdf` / `html2canvas`
  - 删除未使用导出 `exportElementToPDF`；收紧 `speak` / `streamChat` 等内部函数为非 export
  - 补全 `@eslint/js` 显式声明
- fix（安全）：CodeRunner postMessage 新增 `e.source === iframe.contentWindow` 校验，避免任意窗口注入日志
- fix（健壮性）：
  - `main.ts` 增加 `app.config.errorHandler` + `unhandledrejection` 全局兜底
  - 路由 `onError` 捕获 ChunkLoadError 自动 reload（解决发布期间用户白屏问题）
  - `index.html` 元数据更新（28 大分类 / 405 题）+ 新增 `<link rel=canonical>` / `referrer-policy` / `Permissions-Policy` / `X-Content-Type-Options`
- feat：UX
  - 路由 `meta.title` + `afterEach` 动态更新浏览器 tab 标题
  - 题目 / 分类页用各自标题做 `document.title`
  - `prefers-reduced-motion: reduce` 全局适配（关闭动画 / 平滑滚动）
  - SearchPalette 增加 `role="combobox/listbox/option"` + `aria-activedescendant` 等 a11y 语义
  - CodeRunner iframe / textarea 完善 title / aria-label
- feat：CI/工程
  - 拆分 `.github/workflows/ci.yml`（PR 跑全检）+ `deploy.yml`（master 仅部署）
  - 新增 `.github/dependabot.yml`：每周 npm + 月度 actions 自动 PR，按生态分组
  - 重新接通 husky pre-commit hook → lint-staged 自动跑
  - `package.json` 注册被遗忘的 `content:summary` / `content:pitfall` 脚本
- feat：API Key UI 加固（autocomplete=off、一键清除按钮、生产代理建议）
- docs：22 题答案要点字数偏少警告全部清零（02-typescript / 11-ai-frontend / 12-softskills / 14-a11y-i18n / 15-testing / 17-build-publish / 18-crossplatform / 19-visualization / 20-algorithm 共 22 题补充至少 4-7 条要点 + 实战场景）

## 0.14.0

- feat：客服 / IM 实战专题（针对客服平台 / IM / 智能客服 / 海外业务岗位）
  - 新分类 `28-customer-service-im`（14 题）：
    - IM 协议设计 / 心跳保活 + 断线重连 / 消息可靠性（不丢、不重、有序）
    - 多端未读同步 / 历史消息分页 / 输入中 + 在线状态 + 已读回执
    - 富文本聊天安全渲染 / 文件上传断点续传 + 缩略图 + 安全 / 智能客服路由
    - 端到端加密（ECDH + AES-GCM + Web Crypto）/ 海外多区域部署 + GDPR
    - 多时区 + 多语言客服会话 / 海量消息虚拟列表 / 客服系统可观测性
  - 13-security +2：Web Crypto API 实战速查、客服 / SaaS 敏感信息泄漏面
  - 24-fullstack-meta +1：全栈应用多区域部署（边缘网关 / GeoDNS / 跨 region 灾备）
  - 总题数：388 → **405**；分类数：27 → **28**
  - 每题完整 7 段（一句话 / 题目 / 答案要点 / 代码示例 / 常见误区 / 追问 / 延伸）

## 0.13.0

- feat：站内 AI 讲解 / 模拟面试官（用户自带 Key）
  - 新 store `useAIStore`：可选启用，支持 OpenAI 兼容 / Anthropic / 自定义 baseUrl
  - 新 composable `useAIChat`：流式 SSE 解析（OpenAI 协议 + Anthropic 协议自动适配）、可中断、错误兜底
  - 新组件 `AIChatPanel`：嵌入题卡，预设 4 种问法（简单讲讲 / 面试官追问 / 极简要点 / 反例）+ 自由输入
  - QuestionCard 区分「站内 AI 讲解」和「外部 ChatGPT 讲解」两个按钮，前者出现在配置完毕后
  - 三种系统角色：资深导师 / 严格面试官 / 极简助手
  - **隐私**：所有请求由用户浏览器直接发送目标 API；KAP 服务端不经手 Key 或对话内容
  - Settings 新增 AI 配置区（Provider / BaseURL / Key / Model / Role / Temperature）

## 0.12.0

- feat：高频题段落补全 + Quiz/Dashboard 升级 + 单元测试体系建立
  - **常见误区 + 追问 段落**：37 道高频核心题各补 2 段，共 74 段（覆盖 JS / TS / Vue / React / CSS / 浏览器 / 网络 / 性能 / 安全 / 算法 / 工程 / Node / 全栈）
  - **Quiz 升级**：限时模考（每题倒计时）、错题本（结束自动整理）、按题源组卷（未做 / 仅收藏 / 仅复习）、按分类难度多维筛选、"只练错题"一键复练、4 维结果卡（准确率 / 掌握 / 错题 / 用时）
  - **Dashboard 增强**：
    - 面试就绪度评分（圆环图，0-100，含 5 档评级）
    - 最近 14 天学习节奏曲线（柱状图 + 活跃天数）
    - 薄弱分类 TOP 5 排行（mastered/total + 复习率）
  - **收藏 / 跳过 列表页 `/marks`**：Tab 切换 + 状态过滤 + 关键词搜索 + 一键清空，AppHeader 加入口
  - **设置页：导出题库**：把"仅收藏 / 仅复习 / 仅掌握 / 全部"的题导出为 Markdown 小抄或 Anki TSV 卡片
  - **内容校验加强**：检测代码块语言（白名单 30+）、答案要点字数（< 80 字告警）、未识别 ### 段落、tag 规范化建议
  - **单元测试**：vitest + jsdom，覆盖 parseMarkdown / marks store / useExport，build 流程加入 test 阶段
  - 总题数：372

## 0.11.0

- feat：题目结构升级 + 一句话理解全覆盖 + 搜索 / 收藏 / 工程优化
  - **「一句话理解」覆盖率 35% → 100%**：新增 `scripts/fill-summary.ts` 半自动化补全 226 道题
  - **新题型段落支持**：parseMarkdown 支持 `### 常见误区` / `### 追问` 两段，QuestionCard 渲染独立卡片样式
  - **收藏 / 跳过 状态独立化**（新 store `marks.ts`）：标星与跳过和进度状态解耦
  - **搜索增强**：
    - 命中关键词高亮（`<mark>`），按字段（标题 / 标签 / 正文）显示来源
    - 搜索历史 chips（最多 8 条），可一键清空
    - 命中片段上下文截取（前后 50 字 + 省略号）
    - 全局 `Cmd/Ctrl+K` 重新聚焦输入
  - **导出能力扩展**（函数层）：
    - `exportQuestionsToMarkdown`：批量"面试小抄"单文件
    - `exportQuestionsToAnkiTSV`：Anki 卡片 TSV 导出
    - jspdf / html2canvas 改为按需懒加载，避免主 bundle 引入
  - **Bundle 拆分**：vite manualChunks 细分 echarts / repl / icons / markdown / search / share / vue / export
    - 主 bundle 不再拖 useExport 系列；首屏 precache 2688KB → 2029KB（−25%）

## 0.10.0

- feat：少而精专题题库 +11，361 → 372，重点补"算法专项 + 前沿 Web 平台能力"
  - **算法 +4**
    - 位运算高频技巧一题打尽（popcount / 子集枚举 / lowbit / 状态压缩）
    - 滑动窗口进阶：变长窗口 + 不变量维护（最长不重复 / 最小覆盖 / 至多 K / 乘积小于 K）
    - 单调栈 / 单调队列高频题（接雨水 / 柱状图最大矩形 / 滑动窗口最大值）
    - 前缀和 / 差分进阶：二维 + 区间更新（多次区间加 + 矩阵区域和）
  - **SSR/CSR 边界 +2**（24-fullstack-meta）
    - Hydration mismatch 排查与修复（time/random/window/扩展）
    - SSR 数据无缝过户到 Client（dehydrate/HydrationBoundary/devalue）
  - **前沿 Web 平台 +3**（05-browser）
    - WebGPU 渲染管线最小可用（compute shader / pipeline / WGSL）
    - WebTransport vs WebSocket（HTTP/3 + QUIC，streams + datagrams）
    - WebCodecs + Streams 浏览器内视频处理（VideoFrame 零拷贝管道）
  - **网络性能 +2**（06-network）
    - HTTP 103 Early Hints 提前预加载关键资源
    - bfcache 前进后退缓存的命中条件与典型坑

## 0.9.0

- feat：题库覆盖面夯实 +25，336 → 361，重点补"高频但偏薄"分类
  - **CSS** +2：Flex/Grid/multi-column/Float 选型对比、字体与排版专业实践
  - **性能** +1：前端内存泄漏排查（三次 Heap snapshot 对比 + 常见根因）
  - **Node** +2：cluster/worker_threads/pm2 多核扩展、流式响应（SSE/ReadableStream）
  - **测试** +3：测试数据治理（factory + 隔离）、异步/定时器/Stream 测试技巧、视觉回归
  - **可观测性** +2：白屏多信号检测、A/B 实验前端落地
  - **a11y** +1：表单无障碍完整 checklist
  - **构建发版** +2：CI/CD 流水线设计、bundle 优化全场景
  - **可视化** +2：地图可视化（mapbox/deck.gl）、图表/看板导出 PDF/PNG
  - **安全** +1：前端供应链攻击与防御
  - **框架对比** +2：Hydration vs Resumability、元框架（Next/Nuxt/Astro/Remix/SvelteKit）选型
  - **全栈 Meta** +3：Next App Router 数据获取四种姿势、Remix loader/action、SSR 鉴权设计
  - **Rust/WASM** +2：WASM 不该用的场景、JS↔WASM 数据高效传递
  - **浏览器插件** +3：四类上下文消息通信、MV3 远程代码限制、storage 跨设备同步
  - **软技能** +4：需求评审、技术债治理、跨团队推进、OKR 拆解

## 0.8.0

- feat：新增「数据平台业务场景」分类，挑选自真实数据平台的复杂业务问题，模拟资深面试常问流程
  - SQL 工作台整体架构拆分（编辑器 / 状态 / 数据服务 / 执行通道）
  - Monaco 多 Tab 编辑器实例隔离（URI / model / Provider 注册 / viewState）
  - SQL 自动补全 + 校验（Web Worker 解析、防抖、业务变量等长替换）
  - 元数据接口高并发去重（TTL + inflight Promise 池）
  - 多 Tab 编辑器 IndexedDB 投影持久化（瞬态字段排除、僵尸态防护）
  - 长 SQL 异步执行 + 指数退避轮询、可取消、可后台运行
  - AI Agent 流式对话渲染（SSE + 节流式 markdown + AbortController）
  - SQL Copilot Diff 接受 / 拒绝交互（Monaco decorator + executeEdits）
  - 任务调度 DAG 依赖图（dagre 布局 + 虚拟化 + 上下游高亮）
  - 多国 / 多环境部署差异管理（**STAGE** + 配置中心 + useStage）
  - 复杂权限矩阵前端落地（路由 guard + 指令 + 后端二次校验）
  - 几十万行结果集表格不卡（行 / 列虚拟化 + Object.freeze + 服务端排序）
  - 大文件分片上传（hash 秒传 + 并发池 + 断点续传）
  - 看板多图表性能（IntersectionObserver 懒加载 + ResizeObserver 节流）
  - 前端版本灰度 + 回滚（HTML no-cache + 静态 immutable + ChunkLoadError 兜底）
  - 系统设计：从 0 设计数据平台前端（分层架构 + 横切关注点 + 演进路线）
- 总题量：320 → 336（+16）

## 0.7.0

- 题库扩充 +22 道，总数 298 → 320，补强各分类
  - **CSS** +2：水平垂直居中 N 种姿势、position 五个值与层叠上下文
  - **浏览器** +1：Chrome 多进程多线程架构（Browser/Renderer/GPU/Network）
  - **网络** +1：HTTP 状态码分类与高频码（200/201/204/301/302/304/400/401/403/404/422/429/500/502/503/504）
  - **a11y / i18n** +2：ARIA role/state/property、Intl 多语言数字日期复数
  - **测试** +1：测试金字塔 vs 奖杯模型选型
  - **构建发版** +1：SemVer + Changesets / semantic-release 自动化发版
  - **可视化** +1：Canvas / SVG / WebGL 选型与性能边界
  - **框架对比** +1：Signal / 细粒度响应式（Solid / Vue Vapor）的本质优势
  - **Node** +1：事件循环六阶段（timers / pending / poll / check / close）
  - **可观测性** +1：前端错误五条线全链路捕获与上报
  - **安全** +1：Cookie+Session vs JWT 鉴权方案选型
  - **跨端** +1：WebView / JSBridge 三种实现与协议设计
  - **性能** +1：bundle 拆分 / 路由懒加载 / vendor / preload 实战
  - **面试专项** +1：用 STAR 框架讲"最难调的 bug"
  - **算法** +2：手写 Promise.all、第 K 大的元素（堆 / 快速选择）
  - **全栈 Meta** +1：SSR / CSR / SSG / ISR / RSC 完整对比
  - **架构** +1：Monorepo vs Multirepo + Turborepo / Changesets
  - **AI 前端** +1：Prompt Engineering 实战（few-shot / CoT / 结构化输出 / 自我修正）
  - **Rust / WASM** +1：前端工具链 Rust 化趋势（SWC / Rolldown / Turbopack / Biome / Oxc / Rspack）

## 0.6.0

- feat：题目卡顶部新增"一句话理解"高亮区
  - 新增可选 markdown 段 `### 一句话`，渲染为题目顶部的醒目标签
  - 给 JS / Vue / React / 浏览器 / 网络 / CSS / TS 共 30+ 道核心高频题补充了白话总结
- feat：朗读 / 暂停合并为一个按钮
  - 新增 `useSpeechController` 管理朗读状态；按钮根据当前状态在"朗读 / 停止朗读"切换
  - 切换路由 / 卸载组件时自动停止朗读
- a11y：所有图标按钮（包括 icon-only）补齐 `title` 提示
  - 题目卡操作（记得 / 模糊 / 复习 / 笔记 / AI 讲解 / 复制 Prompt / 沙盒 / 分享 / 导出）
  - 顶部栏 / 代码沙盒 / 分享对话框
- 内容扩展（+10 题，总数 288 → 298）：
  - JavaScript：数组扁平化、手写 EventEmitter、防抖 immediate 模式
  - 性能：Core Web Vitals (LCP / INP / CLS) 解读与优化、Long Task 拆分
  - 浏览器：Web Worker 三种类型与适用场景
  - 算法：LRU Cache（Map 实现）、合并区间
  - 工程化：Webpack vs Vite 完整对比
  - 安全：XSS / CSRF 区别与工程化防御

## 0.5.0

- 修复：复习热力图在小屏 / 切页时空白
  - 改用近 12 个月滚动窗口（更紧凑，月份齐全可见）
  - 固定 cellSize、加大最小宽度，避免 visualMap 单独显示而方块全无
- 修复：分享链接拼错路径
  - 旧逻辑用 `window.location.pathname`，在分类页生成链接时会出现 `/c/xx/q/yy/zz` 错路径
  - 改为 `import.meta.env.BASE_URL`，永远生成 `/kap/q/<categoryId>/<slug>` 这样的稳定深链
- 修复：代码沙盒"运行"按钮无效
  - 重写 CodeRunner：用 DOM 解析获取代码（而非乱去标签），支持 JS/TS/JSX/TSX
  - 加了轻量 TS→JS 转译（去掉 import / 类型注解 / 泛型），TS 题也能直接跑
  - 检测语言、不可执行时给提示而不是无声失败；多代码块可选择
  - 控制台 log/info/warn/error 都能转发到运行面板
- 全站 Ant Design Icons 化（用 `@ant-design/icons-vue`）
  - 顶栏、侧栏、问题卡操作、设置、Quiz/Review/Learn/Roadmap/Changelog 主图标全部替换
  - emoji 仅在分类自身的视觉标识、Hero 图标等少量场景保留
- 内容扩展（+20 题，总数从 268 → 288）：
  - JavaScript：bind/call/apply 与手写 myBind、new 操作符与手写 myNew、Promise.all/allSettled/race/any
  - Vue：Vue3 Proxy 响应式 vs Vue2、组件通信全景、异步组件 + Suspense
  - React：列表 key 陷阱、受控/非受控与大表单性能、Portal/ErrorBoundary/Suspense 协作
  - 浏览器：reflow/repaint、完整缓存链路、Cookie/localStorage/IndexedDB 选型
  - 网络：HTTPS 握手与 TLS 1.2/1.3、长轮询/SSE/WebSocket/WebTransport、CORS 与预检

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
