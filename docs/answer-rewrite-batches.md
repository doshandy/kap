# 全模块答案改写批次清单

本文档用于执行“主问题 + 追问题”全量改写时的批次管理与复核。

## 批次划分

### Batch A（语言与框架基础）

- `content/01-javascript.md`
- `content/02-typescript.md`
- `content/03-vue.md`
- `content/22-react.md`

### Batch B（前端底层与工程）

- `content/04-css.md`
- `content/05-browser.md`
- `content/06-network.md`
- `content/07-engineering.md`
- `content/17-build-publish.md`

### Batch C（性能、架构、Node）

- `content/08-performance.md`
- `content/09-node.md`
- `content/10-architecture.md`
- `content/16-observability.md`

### Batch D（AI、安全、测试与可访问性）

- `content/11-ai-frontend.md`
- `content/12-softskills.md`
- `content/13-security.md`
- `content/14-a11y-i18n.md`
- `content/15-testing.md`

### Batch E（算法与跨端专题）

- `content/18-crossplatform.md`
- `content/19-visualization.md`
- `content/20-algorithm.md`
- `content/21-interview-special.md`
- `content/25-rust-wasm.md`

### Batch F（产品化与行业案例）

- `content/23-framework-compare.md`
- `content/24-fullstack-meta.md`
- `content/26-browser-extension.md`
- `content/27-data-platform-cases.md`
- `content/28-customer-service-im.md`

## 每批执行步骤

1. 对批次文件执行答案改写脚本（先小批抽查，再写入）。
2. 抽查每个文件至少 3 道主问题 + 3 道追问题，确认不复读、可执行、可验收。
3. 运行内容校验：
   - `STRICT_VALIDATE=1 pnpm validate:content`
4. 运行代码与构建校验：
   - `pnpm typecheck`
   - `pnpm typecheck:node`
   - `pnpm test`
   - `pnpm build`（至少在批次收尾时执行）

## 抽查重点

- 是否仍有模板句或机械流程口号。
- 追问题是否直接回应追问意图，而不是复述父题答案。
- 是否包含风险场景和验收信号。
- 是否出现语义截断、主语缺失、无对象抽象描述。
