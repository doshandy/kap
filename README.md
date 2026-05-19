# KAP — 前端工程师知识自查站

> 把"资深 Vue 前端"应该懂的那些东西，做成一套可交互、可复习、可搜索的题库。
> 在线访问：<https://doshandy.github.io/kap/>

## ✨ 特性

- **28 个分类 / 1000+ 题（含追问链）**：覆盖 JS / TS / Vue / React / CSS / 浏览器 / 网络 / 性能 / 工程化 / Node / 架构 / 安全 / 测试 / 可观测 / 构建发布 / 跨端 / 可视化 / 算法 / **AI 前端工程化** / 面试专题 / 软技能 / a11y-i18n / 全栈 Meta / Rust+WASM / 浏览器扩展 / 数据平台案例 / 客服 IM 实战
- **AI 前端专题（持续扩展）**：基础（Token / Embedding / 采样参数）→ 进阶（流式 / 重试 / Cache / Memory）→ 资深（Agent / RAG / 模型路由 / 状态机）→ 工程化（Eval / A/B / Cost / Trace / 多租户 / Guardrails / CI·CD / 数据回流）
- **目录与跳转**：侧边栏分类目录，点击题号直达详情，URL 可深链接分享
- **隐藏 / 展示答案**：默认折叠，Space 一键展开
- **状态分类**：未做 / 已掌握 / 模糊 / 需复习，本地持久化
- **多维筛选**：难度 ∩ 标签 ∩ 状态，筛选条件写入 URL，可分享
- **全文搜索**：`/` 或 `⌘K` 命令面板风格
- **进度看板**：总进度环、分类柱状图、复习热力图（GitHub 风格）
- **SM-2 间隔复习**：基于"记得 / 模糊 / 忘了"三态计算下次复习日期
- **模拟面试**：随机抽题 + 倒计时 + 答题报告
- **代码沙盒**：Worker 沙盒在线运行 JS/TS 片段（超时自动终止，默认禁用网络请求）
- **个人笔记**：每题可写笔记，本地存储
- **题目分享**：复制链接 + 二维码
- **朗读题目**：原生 SpeechSynthesis
- **AI 讲解**：一键跳转 ChatGPT，自动附题目 prompt；站内 AI Key 默认仅会话保存，可显式选择本地记住
- **数据备份**：JSON 一键导入导出，换设备无痛迁移
- **PWA 离线**：装到桌面，断网也能查
- **打印友好**：`@media print` 单独优化，可打印为纸质资料
- **快捷键**：`j/k` 切题、`h/l` 切类、`Space` 展开、`m/r/n` 标记/复习/笔记、`?` 查看
- **亮 / 暗 / 跟随系统** 主题
- **学习路线图**：临阵磨枪 / 系统复习 / 深度研究 三种路径

### 学习闭环增强

- **继续学习入口**：首页自动定位上次学习题或今日待复习题
- **错因复盘模式**：按错因（概念不清/代码不会写/边界遗漏等）聚合复盘
- **弱点专项训练**：自动识别薄弱分类并组题训练
- **面试官追问链**：从主问题进入连续追问流程
- **面试前小抄**：按当前状态生成优先复习清单
- **学习计划快照**：计划启用后固定每日题单，避免中途漂移

## 🆕 最近内容升级（2026-05）

- **全量人类化升级**：已对 28 个分类统一完成“补盲 + 提质 + 追问口语化”治理，重点降低模板腔，增强面试实战表达。
- **系统底层与决策沟通补盲**：新增多批“发布闸门/回滚编排/SLO 止损/安全供应链/架构契约/跨团队协同”主问题与追问链。
- **回答结构统一**：强化“目标与约束 -> 方案与证据 -> 风险与止损 -> 复盘与切换条件”的可执行答题框架。
- **脚本链路已覆盖全量**：支持按分类与全库执行追问生成和内容增强，便于持续迭代。

```bash
# 按分类生成/刷新追问
pnpm content:followups:write -- --only=22-react

# 按分类执行内容增强（含人类化表达）
tsx scripts/enhance-content-quality.ts --write --only=22-react

# 全量执行内容增强
tsx scripts/enhance-content-quality.ts --write
```

## 🛠 技术栈

- 构建：Vite 6 + Vue 3.5 + TypeScript
- 状态：Pinia
- 路由：Vue Router 4（history 模式 + 404.html SPA fallback）
- 内容：Markdown（自定义 frontmatter 解析 + markdown-it + Prism + DOMPurify，按需异步 chunk）
- 运行沙盒：Web Worker（禁网 API + 执行超时 + 输出预算）
- 搜索：Fuse.js
- 图表：ECharts 5（懒加载，仅 Home 用）
- 二维码：qrcode
- PWA：vite-plugin-pwa
- 测试：Vitest + jsdom
- 内容脚本：tsx + gray-matter

> 部署侧安全说明（GitHub Pages / Cloudflare / Netlify）：
>
> - **GitHub Pages**：当前官方流程不支持自定义安全响应头，本仓库已在 `index.html` / `404.html` 提供 **meta CSP 兜底**。
> - **Cloudflare Pages / Netlify 等可配头平台**：仓库已提供 `public/_headers`，可直接生效 CSP、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。
> - 推荐 CSP 基线：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://api.anthropic.com; worker-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`。
>
> 如果你要接入自定义 AI 域名，请同步修改 `public/_headers`、`index.html`、`public/404.html`、`netlify.toml` 中的 `connect-src` 白名单。

## 🎯 学习路径推荐（7 / 14 / 30 天）

| 路径          | 适合人群               | 每日重点                         | 推荐入口                                                         |
| ------------- | ---------------------- | -------------------------------- | ---------------------------------------------------------------- |
| 7 天突击      | 面试临近、时间有限     | 高频题 + 错因复盘 + 临考抽题     | `/plan`（7 天）→ `/wrong-review` → `/exam`                       |
| 14 天面试准备 | 有基础，想系统补齐短板 | 计划学习 + 间隔复习 + 弱点专项   | `/plan`（14 天）→ `/review` → `/weak-training`                   |
| 30 天系统复习 | 想长期巩固、建立知识网 | 分类推进 + 关系图谱 + 追问链演练 | `/plan`（30 天）→ `/graph` → `/followup-chain/:categoryId/:slug` |

建议节奏：工作日完成计划任务，周末优先做 `review` 和 `exam`，并把新错因沉淀到 `wrong-review`。

## 📍 页面导航

- `/`：首页仪表盘（继续学习、周报、就绪度、图表）
- `/learn`：顺序学习
- `/c/:categoryId`：分类列表学习
- `/q/:categoryId/:slug`：题目详情
- `/review`：间隔复习
- `/wrong-review`：错因复盘
- `/weak-training`：弱点专项训练
- `/followup-chain/:categoryId/:slug`：追问链面试模拟
- `/plan`：学习计划 / 冲刺模式
- `/quiz`：抽题模拟
- `/exam`：临考模式
- `/cheatsheet`：面试前小抄
- `/marks`：收藏 / 跳过管理
- `/graph`：题目关系图谱
- `/interview-guide`：面试技巧
- `/settings`：设置与数据管理

## 🚀 启动步骤

### 一、本地开发

```bash
# 1. 克隆仓库
git clone git@github.com:doshandy/kap.git
cd kap

# 2. 安装依赖（推荐 pnpm，需要 Node 20+）
pnpm install

# 3. 启动开发服务器
pnpm dev

# 浏览器打开提示的地址（默认 http://localhost:5173/kap/）
```

### 二、本地校验与构建

```bash
pnpm validate:content   # 校验 content/*.md 的格式与必填字段
pnpm validate:security  # 校验 CSP 与安全头（_headers / meta / netlify）一致性
pnpm lint               # ESLint
pnpm lint:style         # Stylelint
pnpm typecheck          # vue-tsc
pnpm typecheck:node     # Vite 配置与 scripts 类型检查
pnpm generate:sitemap   # 生成 public/sitemap.xml
pnpm generate:content-cache # 生成 public/content-cache.json（生产首屏加速缓存）
pnpm generate:search-index # 生成 public/search-index.json（搜索预构建索引）
pnpm build              # 上述校验 + Vite 构建（默认已开启 STRICT_VALIDATE=1）
pnpm build:soft         # 软校验构建（警告不视为失败）

# 严格模式（与 CI 一致）
pnpm build
```

### 三、本地预览构建产物

```bash
pnpm preview
```

### 四、内容维护脚本（可选）

```bash
# 一句话摘要补全
pnpm content:summary
pnpm content:summary:write

# 常见误区 / 追问增强
pnpm content:pitfall
pnpm content:pitfall:write
pnpm content:followups
pnpm content:followups:write

# 相关题链接与文本润色
pnpm content:links
pnpm content:links:write
pnpm content:polish
pnpm content:polish:write
```

`content:pitfall` 需要通过 stdin 提供 patch JSON，例如：

```bash
pnpm content:pitfall < data.json
pnpm content:pitfall:write < data.json
```

### 五、部署（GitHub Pages / Netlify）

仓库已内置 `.github/workflows/deploy.yml`，**push 到 master 自动构建并发布**。

**首次部署需要手动开启 Pages Source（仅一次）：**

1. 打开 GitHub 仓库 → Settings → Pages
2. 在 **Build and deployment** 中：
   - Source 选择 **GitHub Actions**
3. 回到 Actions 页面，触发一次工作流（或 push 任意提交到 master）
4. 等待 Actions 跑完，访问 <https://doshandy.github.io/kap/>

> 选用 history 路由 + `public/404.html` SPA fallback，因此分享链接、刷新、回退都能正常工作。
>
> 安全提示：
>
> - GitHub Pages 不支持自定义响应头，线上主要依赖 `index.html` / `404.html` 中的 meta CSP。
> - 若部署到支持自定义 header 的平台（如 Cloudflare Pages / Netlify），请保留 `public/_headers` 以启用响应头级 CSP（优先级高于 meta）。

#### 可选：部署到 Netlify（推荐用于更严格安全头）

仓库已提供 `netlify.toml`（含 SPA fallback + CSP 等响应头，默认使用 `VITE_APP_BASE=/` 且自动注入 `VITE_SITE_URL`），在 Netlify 导入仓库后可直接使用：

- Build command: `VITE_APP_BASE=/ VITE_SITE_URL=${URL:-https://doshandy.github.io} pnpm build`
- Publish directory: `dist`
- Node 建议：`>=20`

若你使用自定义域名，请把 `VITE_SITE_URL` 设置为最终站点 Origin（不带尾部 `/`），用于 `canonical` / `og:url` / `sitemap` 统一生成。

若你优先考虑头级 CSP 与更细粒度安全控制，建议生产环境使用 Netlify / Cloudflare Pages，而非 GitHub Pages。

## 🗺 分类清单

当前题库按以下 28 个分类组织（题量会随内容更新持续变化，建议以 `pnpm validate:content` 与 `pnpm generate:sitemap` 的结果为准）：

1. `01-javascript` JavaScript 核心
2. `02-typescript` TypeScript 进阶
3. `03-vue` Vue 全家桶
4. `04-css` CSS 进阶
5. `05-browser` 浏览器原理
6. `06-network` 网络协议
7. `07-engineering` 工程化
8. `08-performance` 性能优化
9. `09-node` Node.js / BFF / SSR
10. `10-architecture` 前端架构
11. `11-ai-frontend` AI 前端
12. `12-softskills` 软技能与资深经验
13. `13-security` 前端安全
14. `14-a11y-i18n` 无障碍与国际化
15. `15-testing` 前端测试
16. `16-observability` 可观测性
17. `17-build-publish` 构建产物与发布
18. `18-crossplatform` 跨端
19. `19-visualization` 可视化与图形
20. `20-algorithm` 算法与数据结构
21. `21-interview-special` 面试专题
22. `22-react` React 重点
23. `23-framework-compare` 框架横向对比
24. `24-fullstack-meta` Next.js / Nuxt 全栈
25. `25-rust-wasm` Rust 工具链与 WASM
26. `26-browser-extension` 浏览器插件
27. `27-data-platform-cases` 数据平台业务场景
28. `28-customer-service-im` 客服 / IM 实战（长连接 / 消息可靠性 / E2EE / 海外部署）

## 📝 添加 / 修改题目

题目以 Markdown 存储在 `content/` 下，每个分类一个 `.md` 文件。

**分类文件格式：**

```markdown
---
id: 03-vue
title: Vue 全家桶
order: 3
icon: 🟩
description: 可选的简短描述
---

## proxy-vs-defineproperty

title: Vue3 为什么用 Proxy 替代 Object.defineProperty
difficulty: 进阶
tags: [响应式, 原理]

### 题目

请说明 Vue3 响应式系统替换为 Proxy 的核心动机与代价。

### 答案要点

- defineProperty 无法监听新增/删除、数组索引、Map/Set
- Proxy 拦截 13 种操作，配合 Reflect 保证 receiver
- 代价：IE 不兼容；嵌套对象按需代理（Lazy）

### 代码示例

\`\`\`ts
const reactive = <T extends object>(t: T) => new Proxy(t, {
get(t, k, r) { track(t, k); return Reflect.get(t, k, r) },
set(t, k, v, r) { const ok = Reflect.set(t, k, v, r); trigger(t, k); return ok }
})
\`\`\`

### 延伸

- 与 React useState immutable 模型对比
- ref 与 reactive 的取舍
```

**约定：**

- `## <slug>` 起一题，slug 即题目稳定 ID（决定分享链接、复习数据迁移）
- slug 后紧跟元数据：`title:`、`difficulty:`（基础/进阶/资深）、`tags: [..]`
- 子小节固定：`### 题目`、`### 答案要点`、`### 代码示例`（可选）、`### 延伸`（可选）

更完整的维护说明见 [docs/adding-questions.md](docs/adding-questions.md)。

提交前可以先跑：

```bash
pnpm validate:content
pnpm validate:security
pnpm lint
pnpm typecheck
```

## ⌨️ 快捷键

| 按键        | 作用                |
| ----------- | ------------------- |
| `j` / `k`   | 上一题 / 下一题     |
| `h` / `l`   | 上一类 / 下一类     |
| `/` 或 `⌘K` | 打开搜索面板        |
| `Space`     | 展开 / 收起当前答案 |
| `m`         | 标记为已掌握        |
| `r`         | 标记为需复习        |
| `n`         | 编辑笔记            |
| `?`         | 显示快捷键帮助      |

## 🗂 项目结构

```
kap/
├── content/                  # 分类 Markdown 题库源文件
├── docs/
│   └── adding-questions.md   # 加题规范与维护说明
├── src/
│   ├── pages/                # 路由页面
│   ├── components/           # 各类组件
│   ├── stores/               # Pinia stores
│   ├── composables/          # 组合式函数
│   ├── lib/                  # 内容解析、AI 工具
│   ├── styles/               # 主题、Prism、打印样式
│   └── types/                # TS 类型
├── scripts/
│   ├── validate-content.ts   # 内容格式校验
│   └── gen-sitemap.ts        # 构建期生成 sitemap.xml
├── public/                   # 静态资源（含 404.html SPA fallback）
└── .github/workflows/deploy.yml  # CI/CD
```

## 🤝 贡献建议

- 先保证题目结构合法，再追求题量扩展
- 新增内容时优先补“知识图谱缺口”，再考虑细枝末节
- 修改既有题目时，尽量保留稳定 slug，避免影响深链接与本地复习记录
- 如果要调整构建、路由、持久化等底层逻辑，建议同步更新 README 和 `docs/adding-questions.md`

## ⚡ 首次贡献者 5 分钟流程

```bash
# 1) 创建分支
git checkout -b docs-or-content-update

# 2) 安装依赖并启动
pnpm install
pnpm dev

# 3) 修改内容后做最小校验
pnpm validate:content
pnpm validate:security
pnpm lint
pnpm typecheck

# 4) 提交前跑完整链路（推荐）
STRICT_VALIDATE=1 pnpm build
```

提交流程建议：

1. 优先小步提交（一次只改一个主题：例如“补 11-ai-frontend 的追问链”）。
2. 标题直写意图（如：`docs: 完善 README 学习路径指引`、`content: 补充 xx 分类错因复盘样例`）。
3. 如果改了题目结构或脚本行为，请在 PR 描述里附验证命令和结果。

## 🧯 常见问题排障（dev/build/test 失败处理）

### 1) `pnpm install` 失败

- 确认 Node 版本：`node -v`（建议 `>= 20`）。
- 确认 pnpm 版本：`pnpm -v`（建议 `>= 9`）。
- 如果本机没启用 Corepack：

```bash
corepack enable
corepack prepare pnpm@9 --activate
```

### 2) `pnpm dev` 启动后白屏 / 路由异常

- 按终端提示地址访问（本项目本地默认带 `/kap/` 前缀）。
- 打开浏览器控制台看首个报错（依赖缺失、语法错误、路由参数错误最常见）。
- 如果之前访问过线上站点，先在浏览器里清掉旧 Service Worker 与站点缓存，再重试。

### 3) `pnpm validate:content` 失败

- 先看报错里的文件和行号，优先修这几类：
  - frontmatter 缺 `id/title/order`
  - `## slug` 不规范
  - `### 题目 / 答案要点` 缺失
  - `tags/followups/links` 不是内联数组格式
- 可先用维护脚本预处理，再人工复核：

```bash
pnpm content:summary:write
pnpm content:pitfall:write
pnpm content:followups:write
pnpm content:links:write
pnpm content:polish:write
```

### 4) `lint / typecheck` 失败

- JS/TS/Vue 语法与规范：`pnpm lint`
- 样式规范：`pnpm lint:style`
- 类型问题：`pnpm typecheck` + `pnpm typecheck:node`
- 常用修复命令：

```bash
pnpm lint:fix
pnpm lint:style:fix
```

### 5) `test` 失败

- 全量测试：`pnpm test`
- 本地调试建议先跑单文件：

```bash
pnpm vitest run src/xxx/yyy.test.ts
```

- 连续调试可用：`pnpm test:watch`

### 6) `build` 失败，如何快速定位

- 严格链路（推荐，和 CI 一致）：

```bash
STRICT_VALIDATE=1 pnpm build
```

- 分段定位（看是哪一步先挂）：

```bash
pnpm validate:content && pnpm validate:security && pnpm lint && pnpm lint:style && pnpm typecheck && pnpm typecheck:node && pnpm test && pnpm generate:sitemap && pnpm generate:content-cache && pnpm generate:search-index && pnpm build:only
```

### 7) 仍然异常（缓存/环境脏）

```bash
rm -rf node_modules dist
pnpm install
pnpm dev --force
```

## ❓ FAQ

**Q：所有进度数据存在哪？**
A：100% 本地（localStorage）。换浏览器请用「设置 → 数据备份」导出 JSON，再到新浏览器导入。

**Q：AI 讲解是怎么实现的？**
A：完全无后端。点按钮会拼接题目 prompt 跳转 ChatGPT 网页版，也支持复制 prompt 给其他 AI 工具使用。

**Q：代码沙盒安全吗？**
A：代码在 Worker 沙盒中运行，无法访问父页 DOM/Cookie；默认禁用 `fetch/WebSocket/XMLHttpRequest/importScripts`、`caches`，阻止创建子 `Worker/SharedWorker`，限制动态 `import()`，并禁用 `eval/Function`，同时设置超时自动终止。该沙盒用于教学演示，不等价于服务端强隔离执行环境。

**Q：能 PWA 离线访问吗？**
A：可以。第二次访问之后由 Service Worker 接管，断网仍可浏览之前缓存的内容。

**Q：为什么使用 history 路由而不是 hash 路由？**
A：为了让题目链接和分类链接更适合分享与打印展示。GitHub Pages 不原生支持 SPA fallback，所以仓库通过 `public/404.html` + `index.html` 的路径还原脚本兼容深链接刷新。

## 📜 License

MIT © doshandy
