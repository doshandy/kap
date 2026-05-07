# KAP — 前端工程师知识自查站

> 把"资深 Vue 前端"应该懂的那些东西，做成一套可交互、可复习、可搜索的题库。
> 在线访问：<https://doshandy.github.io/kap/>

## ✨ 特性

- **21 个分类**：覆盖 JS / TS / Vue / CSS / 浏览器 / 网络 / 性能 / 工程化 / Node / 架构 / 安全 / 测试 / 可观测 / 构建发布 / 跨端 / 可视化 / 算法 / AI 前端 / 面试专题 / 软技能 / a11y-i18n
- **目录与跳转**：侧边栏分类目录，点击题号直达详情，URL 可深链接分享
- **隐藏 / 展示答案**：默认折叠，Space 一键展开
- **状态分类**：未做 / 已掌握 / 模糊 / 需复习，本地持久化
- **多维筛选**：难度 ∩ 标签 ∩ 状态，筛选条件写入 URL，可分享
- **全文搜索**：`/` 或 `⌘K` 命令面板风格
- **进度看板**：总进度环、分类柱状图、复习热力图（GitHub 风格）
- **SM-2 间隔复习**：基于"记得 / 模糊 / 忘了"三态计算下次复习日期
- **模拟面试**：随机抽题 + 倒计时 + 答题报告
- **代码沙盒**：iframe sandbox 在线运行 JS 片段
- **个人笔记**：每题可写笔记，本地存储
- **题目分享**：复制链接 + 二维码
- **朗读题目**：原生 SpeechSynthesis
- **AI 讲解**：一键跳转 ChatGPT，自动附题目 prompt，并支持复制给 Cursor / 其他 AI 工具
- **数据备份**：JSON 一键导入导出，换设备无痛迁移
- **PWA 离线**：装到桌面，断网也能查
- **打印友好**：`@media print` 单独优化，可打印为纸质资料
- **快捷键**：`j/k` 切题、`h/l` 切类、`Space` 展开、`m/r/n` 标记/复习/笔记、`?` 查看
- **亮 / 暗 / 跟随系统** 主题
- **学习路线图**：临阵磨枪 / 系统复习 / 深度研究 三种路径

## 🛠 技术栈

- 构建：Vite 6 + Vue 3.5 + TypeScript
- 状态：Pinia
- 路由：Vue Router 4（history 模式 + 404.html SPA fallback）
- 内容：Markdown（gray-matter + markdown-it + Prism）
- 搜索：Fuse.js
- 图表：ECharts 5（Pie / Bar / Heatmap）
- PDF / 截图导出：html2canvas + jspdf
- 二维码：qrcode
- PWA：vite-plugin-pwa
- 内容脚本：tsx + gray-matter

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
pnpm validate:content   # 校验 21 个 content/*.md 的格式与必填字段
pnpm lint               # ESLint
pnpm typecheck          # vue-tsc
pnpm generate:sitemap   # 生成 public/sitemap.xml
pnpm build              # 上述校验 + Vite 构建
```

### 三、本地预览构建产物

```bash
pnpm preview
```

### 四、部署到 GitHub Pages

仓库已内置 `.github/workflows/deploy.yml`，**push 到 master 自动构建并发布**。

**首次部署需要手动开启 Pages Source（仅一次）：**

1. 打开 GitHub 仓库 → Settings → Pages
2. 在 **Build and deployment** 中：
   - Source 选择 **GitHub Actions**
3. 回到 Actions 页面，触发一次工作流（或 push 任意提交到 master）
4. 等待 Actions 跑完，访问 <https://doshandy.github.io/kap/>

> 选用 history 路由 + `public/404.html` SPA fallback，因此分享链接、刷新、回退都能正常工作。

## 🗺 分类清单

当前题库按以下 27 个分类组织（合计 372 题，并对核心高频题补充了"一句话理解"）：

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

更完整的维护说明见 [docs/adding-questions.md](/Users/csh/work/kap/docs/adding-questions.md)。

提交前可以先跑：

```bash
pnpm validate:content
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
├── content/                  # 21 个分类的 Markdown 题库源文件
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

## ❓ FAQ

**Q：所有进度数据存在哪？**
A：100% 本地（localStorage）。换浏览器请用「设置 → 数据备份」导出 JSON，再到新浏览器导入。

**Q：AI 讲解是怎么实现的？**
A：完全无后端。点按钮会拼接题目 prompt 跳转 ChatGPT 网页版，也支持复制 prompt 给其他 AI 工具使用。

**Q：代码沙盒安全吗？**
A：通过 iframe `sandbox="allow-scripts"` 隔离，无法访问父页 DOM/Cookie。

**Q：能 PWA 离线访问吗？**
A：可以。第二次访问之后由 Service Worker 接管，断网仍可浏览之前缓存的内容。

**Q：为什么使用 history 路由而不是 hash 路由？**
A：为了让题目链接和分类链接更适合分享与打印展示。GitHub Pages 不原生支持 SPA fallback，所以仓库通过 `public/404.html` + `index.html` 的路径还原脚本兼容深链接刷新。

## 📜 License

MIT © doshandy
