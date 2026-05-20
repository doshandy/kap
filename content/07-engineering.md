---
id: 07-engineering
title: 工程化
order: 7
icon: 🧰
description: 构建工具、包管理、Monorepo、规范治理、CI/CD 与库发布。
---

## vite-principle

title: Vite 为什么开发快、构建又能稳定
followups: [vite-principle-followup-1, vite-principle-followup-2, vite-principle-followup-3]
links: [webpack-vs-vite, bundler-deep, bundler-ecosystem]
difficulty: 进阶
tags: [Vite, 构建]

### 一句话

开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle；依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM；业务代码按请求即时转换，HMR 粒度细、回流范围小。

### 题目

请解释 Vite 在 dev 和 build 两个阶段分别做了什么，为什么它的启动体验比传统打包器更快。

### 答案要点

- 开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM
- 业务代码按请求即时转换，HMR 粒度细、回流范围小
- 当前稳定版 Vite 的生产构建仍以 Rollup 为核心，负责 chunk 拆分、Tree Shaking 和产物输出

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Vite 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Vite，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「Vite 为什么开发快、构建又能稳定」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
// vite.config.ts：常用配置（dev/build 双阶段）
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE || '/',
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    optimizeDeps: {
      include: ['vue', 'pinia'], // 强制预构建
      exclude: ['@vueuse/core'], // 跳过预构建（已是 ESM）
    },
    build: {
      target: 'es2022',
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          manualChunks: { vendor: ['vue', 'vue-router', 'pinia'] },
        },
      },
    },
  };
});
```

```ts
// 自定义 Vite 插件：开发期日志、构建期注入版本号
import type { Plugin } from 'vite';
export default function versionInject(): Plugin {
  const v = `${Date.now()}`;
  return {
    name: 'version-inject',
    transformIndexHtml: (html) =>
      html.replace('</head>', `<meta name="ver" content="${v}"></head>`),
    handleHotUpdate(ctx) {
      console.log('[hmr]', ctx.file);
    },
  };
}
```

### 常见误区

- 把 dev 表现照搬到 prod：dev 用 ESM 直接喂浏览器没打包，prod 走 Rollup 打包
- 大量裸 import 会触发 Vite 的依赖预构建（esbuild）—— 第一次启动慢是正常
- 配 alias 后没在 tsconfig.paths 同步 → tsc 报错

### 追问

- 为什么 Vite 的 HMR 比 Webpack 快
- Rolldown / Rspack / Turbopack 各自定位
- esbuild 比 swc 快还是慢？哪个用得多

### 延伸

- "Vite 快"不只因为 esbuild，更因为开发时避免了整包重编译
- 插件通常需要分别考虑 dev transform 和 build 行为

## bundler-ecosystem

title: Webpack、Rollup、esbuild、SWC 各自擅长什么
followups: [bundler-ecosystem-followup-1, bundler-ecosystem-followup-2, bundler-ecosystem-followup-3]
links: [bundler-deep, tsconfig-paths-to-bundler-alias, vite-go-and-rolldown]
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC]

### 一句话

Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目；Rollup 天然偏向 ESM 和库构建，产物更干净；esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建。

### 题目

如何从“应用构建”和“库构建”两个角度对比主流构建工具？

### 答案要点

- Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- Rollup 天然偏向 ESM 和库构建，产物更干净
- esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建
- Babel 仍是兼容性和语法变换生态里的重要角色，尤其在复杂插件链、实验语法和细粒度 polyfill 控制场景
- 现实里经常是“组合拳”：Vite dev + Rollup build + esbuild 压缩/预构建

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Rollup 天然偏向 ESM 和库构建，产物更干净」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「Webpack、Rollup、esbuild、SWC 各自擅长什么」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```js
// rollup.config.js：库构建（更适合发布 npm 包）
import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';

export default defineConfig([
  {
    input: 'src/index.ts',
    external: ['vue'],
    output: [
      { file: 'dist/index.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    ],
    plugins: [esbuild({ minify: true, target: 'es2020' })],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
]);
```

```js
// webpack.config.js：复杂应用（带 Module Federation）
import { ModuleFederationPlugin } from '@module-federation/enhanced/webpack';
export default {
  mode: 'production',
  output: { filename: '[name].[contenthash:8].js', clean: true },
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: { remote: 'remote@http://cdn.com/remoteEntry.js' },
      shared: { vue: { singleton: true, requiredVersion: '^3.5' } },
    }),
  ],
};
```

### 追问

- 「Webpack、Rollup、esbuild、SWC 各自擅长什么」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Webpack、Rollup、esbuild、SWC 各自擅长什么」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Webpack、Rollup、esbuild，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 工具选型要看团队心智、插件生态、兼容需求，不只是 benchmark

## package-manager

title: npm、yarn、pnpm 与 lockfile、peerDependencies 的本质
followups: [package-manager-followup-1, package-manager-followup-2, package-manager-followup-3]
difficulty: 进阶
tags: [pnpm, 依赖管理]

### 一句话

pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性；lockfile 锁定依赖树，保证 CI/本地一致；peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器。

### 题目

为什么大型前端团队越来越倾向 pnpm？`peerDependencies` 又是在解决什么问题？

### 答案要点

- pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- lockfile 锁定依赖树，保证 CI/本地一致
- `peerDependencies` 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器
- `overrides`（npm/pnpm）或 `resolutions`（Yarn）可用于强制收敛依赖版本，修复安全漏洞或兼容问题

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 npm 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 npm，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```json
// 组件库 package.json：声明 peer 依赖
{
  "name": "@my/vue-table",
  "version": "1.0.0",
  "peerDependencies": {
    "vue": "^3.5.0"
  },
  "peerDependenciesMeta": {
    "vue": { "optional": false }
  },
  "devDependencies": {
    "vue": "^3.5.0"
  }
}
```

```json
// 应用侧 package.json：用 overrides 强制收敛版本
{
  "name": "my-app",
  "pnpm": {
    "overrides": {
      "lodash@<4.17.21": "^4.17.21",
      "minimatch@<3.0.5": "^3.0.5"
    },
    "peerDependencyRules": {
      "ignoreMissing": ["@types/react"],
      "allowedVersions": { "vue": "^3.5.0" }
    }
  }
}
```

```yaml
# pnpm-workspace.yaml：声明 workspace
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/dist/**'
```

```bash
# pnpm 命令
pnpm install                    # 安装全部
pnpm --filter @my/web dev       # 仅在某 workspace 跑
pnpm --filter "...@my/ui" build # 包含所有依赖 @my/ui 的包一起构建
pnpm add lodash --filter @my/web
```

### 追问

- 推动「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 pnpm、依赖管理，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- peer 依赖不是"自动安装的一般依赖"，而是兼容契约
- monorepo 里依赖管理策略会直接影响 hoist、调试和发布体验

## semver-commit-governance

title: SemVer、Conventional Commits、Changesets 分别治理什么问题
followups: [semver-commit-governance-followup-1, semver-commit-governance-followup-2, semver-commit-governance-followup-3]
links: [17-build-publish/semver-release]
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets]

### 一句话

SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch；Conventional Commits 统一提交语义，让变更历史更易检索。

### 题目

为什么成熟团队会同时引入语义化版本、规范化提交和发布说明工具？这三者各自解决什么问题？

### 答案要点

- SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断
- Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明
- 真正重要的不是工具本身，而是团队是否能稳定遵守“什么算 breaking change、谁来审批、如何回滚”

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 SemVer 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 SemVer，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「SemVer、Conventional Commits、Changesets 分别治理什么问题」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```js
// commitlint.config.cjs：规范化提交
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-max-length': [2, 'always', 100],
  },
};
```

```bash
# 典型 Conventional Commits 用法
git commit -m "feat(table): 支持虚拟滚动"
git commit -m "fix(form): 修正校验在 IE 上失效"
git commit -m "feat(api)!: 移除 deprecated /v1 接口"  # ! 表示 breaking
git commit -m "chore: 升级 vite 到 6.0"
```

```bash
# Changesets 工作流
pnpm changeset                  # 交互式创建 changeset
pnpm changeset version          # 根据 changeset 更新版本与 changelog
pnpm changeset publish          # 发布到 npm
```

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 追问

- 推动「SemVer、Conventional Commits、Changesets 分别治理什么问题」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「SemVer、Conventional Commits、Changesets 分别治理什么问题」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 SemVer、ConventionalCommits、Changesets，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 规范提交不该沦为背模板，核心价值是让版本治理和协作沟通更稳定
- 对应用仓库，SemVer 更多服务于发布节奏和回滚；对库仓库，它直接影响外部消费者升级成本

## source-map-polyfill

title: Source Map、Browserslist 与 Polyfill 策略
followups: [source-map-polyfill-followup-1, source-map-polyfill-followup-2, source-map-polyfill-followup-3]
difficulty: 进阶
tags: [SourceMap, Polyfill]

### 一句话

sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构；语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from；Browserslist 定义目标环境。

### 题目

前端为什么需要区分开发 sourcemap、线上 sourcemap，以及“语法降级”和“API polyfill”？

### 答案要点

- sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 `Promise`、`Array.from`
- Browserslist 定义目标环境，构建工具据此决定转译和兼容策略

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Source Map、Browserslist 与 Polyfill 策略」时先约定 Source 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 Source 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

### 代码示例

```json
// .browserslistrc 或 package.json
{
  "browserslist": ["> 0.5%", "last 2 versions", "Firefox ESR", "not dead", "not ie 11"]
}
```

```js
// babel.config.js：按 browserslist 自动决定 polyfill
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage', // 按需注入 polyfill
        corejs: { version: 3, proposals: false },
        targets: { esmodules: true }, // 现代浏览器，跳过过度降级
      },
    ],
  ],
};
```

```ts
// vite.config.ts：sourcemap 策略
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap:
      mode === 'development'
        ? 'inline' // 开发：内联便于调试
        : 'hidden', // 生产：生成但不暴露 URL
  },
}));
```

```bash
# 上传 sourcemap 给 Sentry，构建产物里再删除
sentry-cli sourcemaps upload --release=$VERSION dist/
find dist -name "*.map" -delete
```

### 追问

- 「Source Map、Browserslist 与 Polyfill 策略」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Source Map、Browserslist 与 Polyfill 策略」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SourceMap、Polyfill，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 线上更常见的是上传 hidden sourcemap 给错误平台，而不是直接对外暴露
- "支持低版本浏览器"成本不只在编译，还在测试矩阵和运行时体积

## monorepo

title: Monorepo、workspace、project references 的组合打法
followups: [monorepo-followup-1, monorepo-followup-2, monorepo-followup-3]
difficulty: 资深
tags: [Monorepo, TS]

### 一句话

Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队；workspace 解决依赖链接与本地开发；Turborepo/Nx 解决任务缓存、增量执行、依赖图调度。

### 题目

什么样的团队适合 Monorepo？pnpm workspace、Turborepo/Nx、TS Project References 各负责哪一层问题？

### 答案要点

- Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- workspace 解决依赖链接与本地开发
- Turborepo/Nx 解决任务缓存、增量执行、依赖图调度
- TS Project References 解决类型增量编译和大型项目编辑器性能

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「workspace 解决依赖链接与本地开发」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「Monorepo、workspace、project references 的组合打法」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```jsonc
// turbo.json：任务编排 + 远程缓存
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"], // 先构建依赖项
      "outputs": ["dist/**", ".next/**"],
    },
    "test": { "dependsOn": ["build"], "outputs": [] },
    "lint": { "outputs": [] },
    "dev": { "cache": false, "persistent": true },
  },
}
```

```jsonc
// tsconfig.json：根项目 + Project References
{
  "files": [],
  "references": [
    { "path": "./packages/ui" },
    { "path": "./packages/utils" },
    { "path": "./apps/web" }
  ]
}

// packages/ui/tsconfig.json
{
  "compilerOptions": {
    "composite": true,                  // 必须，开启增量
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [{ "path": "../utils" }]
}
```

```bash
# 增量编译
tsc --build              # 仅编译变化的项目
tsc --build --watch
tsc --build --clean      # 清理输出
```

### 追问

- 「Monorepo、workspace、project references 的组合打法」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Monorepo、workspace、project references 的组合打法」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Monorepo、TS，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Monorepo 不会自动消除复杂度，它只是把复杂度集中管理
- 若团队很小、模块边界弱，单仓单包更实用

## lint-ci

title: ESLint、Prettier、Husky、lint-staged、CI 的职责边界
followups: [lint-ci-followup-1, lint-ci-followup-2, lint-ci-followup-3]
difficulty: 基础
tags: [规范, CI]

### 一句话

Prettier 负责格式，不负责业务正确性；ESLint 负责可疑模式、最佳实践和团队约束；Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理。

### 题目

代码质量工具应该如何分层，避免“本地一套、CI 一套”的混乱？

### 答案要点

- Prettier 负责格式，不负责业务正确性
- ESLint 负责可疑模式、最佳实践和团队约束
- Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理
- Husky + lint-staged 把高频、快速检查前置到提交前
- CI 负责最终可信门禁：lint、typecheck、test、build、内容校验

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」时要先定义 ESLint 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，ESLint 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 ESLint 关键链路先收敛再替换。

### 代码示例

```js
// eslint.config.js（ESLint 9 Flat Config）
import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { parser: tsParser, extraFileExtensions: ['.vue'] },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/**', 'node_modules/**'] },
];
```

```json
// package.json：lint-staged + husky 一条龙
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,vue}": ["eslint --fix"],
    "*.{ts,vue,css,md,json}": ["prettier --write"]
  }
}
```

```bash
# 一次性安装 hooks
pnpm husky add .husky/pre-commit "pnpm lint-staged"
pnpm husky add .husky/commit-msg "npx --no -- commitlint --edit $1"
```

### 追问

- 推动「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 规范、CI，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要把耗时过长的全量测试都塞进 pre-commit，体验会很差
- 规则过严会让团队"为了过 lint 而写代码"，治理要有边界

## package-publishing

title: 前端库的产物设计：ESM/CJS/types/exports/sideEffects
followups: [package-publishing-followup-1, package-publishing-followup-2, package-publishing-followup-3]
links: [17-build-publish/tree-shaking-deep]
difficulty: 资深
tags: [发布, 包设计]

### 一句话

明确入口：exports、types、必要时 main/module；标注 Tree Shaking 语义：sideEffects；提供子路径导出时，要确保运行时代码和类型定义都能对上。

### 题目

如果你要发布一个前端工具库，`package.json` 里最关键的几个字段该怎么设计？

### 答案要点

- 明确入口：`exports`、`types`、必要时 `main/module`
- 标注 Tree Shaking 语义：`sideEffects`
- 提供子路径导出时，要确保运行时代码和类型定义都能对上
- 产物通常至少包括 ESM 和类型声明；是否保留 CJS 取决于目标使用方

#### 补充说明

- 面试中不要只停留在「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 发布、包设计 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端库的产物设计 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端库的产物设计，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端库的产物设计：ESM/CJS/types/exports/sideEffects」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```jsonc
// 现代库的 package.json 入口（双产物 + 子路径）
{
  "name": "@my/lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
    },
    "./button": {
      "types": "./dist/components/button.d.ts",
      "import": "./dist/components/button.js",
    },
    "./style.css": "./dist/style.css",
    "./package.json": "./package.json",
  },
  "files": ["dist", "README.md"],
  "sideEffects": ["**/*.css"],
  "engines": { "node": ">=18" },
}
```

```ts
// 使用方
import { Button } from '@my/lib'; // 默认入口
import Button from '@my/lib/button'; // 子路径，更小
import '@my/lib/style.css'; // 样式独立引入
```

### 追问

- 推动「前端库的产物设计：ESM/CJS/types/exports/sideEffects」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端库的产物设计：ESM/CJS/types/exports/sideEffects」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 发布、包设计，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- `exports` 一旦配置，就相当于包的公开 API 面，后续变更需要当成兼容性问题处理
- 库构建的核心不是"能打出来"，而是"能被不同消费者稳定使用"

## webpack-module-federation

title: Webpack 5 Module Federation 的价值与边界
followups: [webpack-module-federation-followup-1, webpack-module-federation-followup-2, webpack-module-federation-followup-3]
links: [bundler-deep, bundler-ecosystem, tsconfig-paths-to-bundler-alias]
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端]

### 一句话

Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构；核心角色通常包括 host、remote、shared 依赖，以及远程容器入口；它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本。

### 题目

Module Federation 为什么会被称为微前端的重要能力？它真正解决了什么，又带来了什么新复杂度？

### 答案要点

- Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 核心角色通常包括 host、remote、shared 依赖，以及远程容器入口
- 它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本
- 新复杂度主要在版本兼容、共享依赖策略、错误隔离、远程加载失败、类型同步和运行时可观测性

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Webpack 5 Module Federation 的价值与边界」时要把 Webpack 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Webpack 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Webpack 5 Module Federation 的价值与边界」里当前按阶段替换更稳。

### 代码示例

```js
// host webpack 配置
import { ModuleFederationPlugin } from '@module-federation/enhanced/webpack';
new ModuleFederationPlugin({
  name: 'host',
  remotes: {
    profile: 'profile@https://cdn.example.com/profile/remoteEntry.js',
  },
  shared: {
    vue: { singleton: true, requiredVersion: '^3.5' },
    pinia: { singleton: true },
  },
});

// remote webpack 配置
new ModuleFederationPlugin({
  name: 'profile',
  filename: 'remoteEntry.js',
  exposes: {
    './Widget': './src/Widget.vue',
    './store': './src/store.ts',
  },
  shared: { vue: { singleton: true } },
});
```

```ts
// 业务侧：远程加载 + 失败兜底
import { defineAsyncComponent } from 'vue';

const RemoteWidget = defineAsyncComponent({
  loader: () => import('profile/Widget'),
  loadingComponent: () => h('div', '加载中...'),
  errorComponent: () => h('div', '加载失败，请刷新'),
  timeout: 10_000,
});
```

### 追问

- 「Webpack 5 Module Federation 的价值与边界」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Webpack 5 Module Federation 的价值与边界」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Webpack、ModuleFederation、微前端，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 没有强组织边界和独立发布需求时，Module Federation 往往是过度设计
- 真正难的是治理和演进，不是把 `remoteEntry` 跑起来

## exports-subpath

title: exports、subpath imports 与现代包入口设计
followups: [exports-subpath-followup-1, exports-subpath-followup-2, exports-subpath-followup-3]
difficulty: 资深
tags: [package.json, exports, imports]

### 一句话

exports 明确包的公开 API 面，能限制未声明路径被直接 import；子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server；imports 更偏包内部别名和条件映射，通常服务于包自身源码组织。

### 题目

为什么现代包更推荐用 `exports` 管理公开入口？`imports` 和子路径导入又适合什么场景？

### 答案要点

- `exports` 明确包的公开 API 面，能限制未声明路径被直接 import
- 子路径导出适合暴露稳定的细粒度入口，如 `pkg/button`、`pkg/server`
- `imports` 更偏包内部别名和条件映射，通常服务于包自身源码组织
- 一旦引入条件导出（如 browser/node/import/require），就要格外注意类型声明和运行时入口保持一致

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 exports 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 exports，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「exports、subpath imports 与现代包入口设计」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```jsonc
// 条件导出：浏览器/Node、import/require 不同入口
{
  "exports": {
    ".": {
      "browser": {
        "import": "./dist/browser.js",
        "default": "./dist/browser.cjs",
      },
      "node": {
        "import": "./dist/node.js",
        "default": "./dist/node.cjs",
      },
      "types": "./dist/index.d.ts",
    },
  },
}
```

```jsonc
// 包内部使用 imports 别名（仅在自己 package 内可用）
{
  "imports": {
    "#utils/*": "./src/utils/*.ts",
    "#config": {
      "development": "./src/config.dev.ts",
      "default": "./src/config.prod.ts",
    },
  },
}
```

```ts
// 包内部使用
import { format } from '#utils/date';
import config from '#config'; // 自动按环境切换
```

### 追问

- 推动「exports、subpath imports 与现代包入口设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「exports、subpath imports 与现代包入口设计」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 package.json、exports、imports，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- "先随便暴露所有文件，再慢慢收口"通常会留下长期兼容债
- 包入口设计本质上是在设计你的公共契约

## ci-cd-cache

title: CI/CD 缓存、矩阵构建与门禁设计
followups: [ci-cd-cache-followup-1, ci-cd-cache-followup-2, ci-cd-cache-followup-3]
links: [05-browser/browser-cache-strategy, 06-network/caching]
difficulty: 进阶
tags: [CI, GitHubActions, 缓存]

### 一句话

常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待；缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染；矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开。

### 题目

前端 CI 为什么经常既慢又不稳定？缓存和矩阵构建该怎么设计才靠谱？

### 答案要点

- 常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染
- 矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开
- 门禁应分层：PR 快速反馈优先，重型任务可放主干或定时流水线

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 CI/CD 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，CI/CD 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「CI/CD 缓存、矩阵构建与门禁设计」采用小步优化更稳。

### 代码示例

```yaml
# .github/workflows/ci.yml：分层 + 缓存 + 矩阵
name: ci
on: [pull_request]

jobs:
  fast:
    name: 快速反馈
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test:unit

  matrix-build:
    name: 多 Node 版本构建
    needs: fast
    strategy:
      fail-fast: false
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  e2e:
    name: E2E（仅主分支 PR）
    if: github.event.pull_request.base.ref == 'main'
    needs: fast
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ hashFiles('pnpm-lock.yaml') }}
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
```

### 追问

- 你会先看哪些指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「CI/CD 缓存、矩阵构建与门禁设计」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 CI、GitHubActions、缓存，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- CI 的目标不是"把所有事都塞进去"，而是让反馈时延和可信度平衡

## monorepo-changesets

title: Monorepo 多包发版（Changesets / Nx Release / Turborepo）
followups: [monorepo-changesets-followup-1, monorepo-changesets-followup-2, monorepo-changesets-followup-3]
difficulty: 资深
tags: [Monorepo, 发版]

### 一句话

选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版；流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish。

### 题目

一个仓库里有几十个 package，怎么处理版本号、CHANGELOG 和发布顺序？

### 答案要点

- 选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish
- 依赖：被依赖的包先发版，依赖方自动升 caret 范围
- Changelog：自动生成 + 人工补充重要说明，遵循 Conventional Commits
- 私有仓 / 内网 npm：配置 `publishConfig` registry，避免误传公网
- 灰度：beta / next dist-tag，先发预发，回归通过再 promote 到 latest
- 回滚：deprecate 而不是 unpublish；保留 24 小时窗口

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时要把 Monorepo 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Monorepo 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」里当前按阶段替换更稳。

### 代码示例

```bash
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 追问

- 「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Monorepo、发版，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 跨包重构时，Changesets 强制写说明，能让 CHANGELOG 一目了然
- 规模到几百包后建议看 Nx Release，提供更精细的依赖图分析

## bundler-deep

title: Webpack / Rollup / Vite / Rolldown / Turbopack 比较
followups: [bundler-deep-followup-1, bundler-deep-followup-2, bundler-deep-followup-3]
links: [bundler-ecosystem, tsconfig-paths-to-bundler-alias, vite-go-and-rolldown]
difficulty: 资深
tags: [打包工具, Vite]

### 一句话

打包器三件事：依赖图分析、转换、产出 bundle；Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好；Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包。

### 题目

打包器都在做什么？为什么 Vite 在 dev 上能秒开，prod 却仍然要打包？

### 答案要点

- 打包器三件事：依赖图分析、转换、产出 bundle
- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包
- Vite：开发模式下用 esbuild 预构建依赖 + 浏览器原生 ESM 直接加载；生产仍 Rollup
- Rolldown：Vite 团队 Rust 重写 Rollup 的项目，打通 dev / prod 同一管线
- Turbopack：Vercel 出的 Rust 打包器，主要服务 Next.js
- esbuild：极快，但 plugin 生态弱，常作为 transformer 而非完整打包器

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」时要把 Webpack 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Webpack 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」里当前按阶段替换更稳。

### 代码示例

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['lodash-es', 'date-fns'],
    exclude: ['big-wasm-pkg'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'echarts';
            if (id.includes('@vue/repl')) return 'repl';
            return 'vendor';
          }
        },
      },
    },
  },
});
```

### 追问

- 「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 打包工具、Vite，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真正影响开发体验的不是打包器名字，而是依赖预构建是否稳定、HMR 是否快
- 跨版本升级 Vite / Webpack 前先在分支跑一遍生产构建产物大小对比，避免 regression

## webpack-vs-vite

title: Webpack 与 Vite 在开发态、构建态的差异
followups: [webpack-vs-vite-followup-1, webpack-vs-vite-followup-2, webpack-vs-vite-followup-3]
links: [vite-principle]
difficulty: 进阶
tags: [Webpack, Vite, 构建]

### 一句话

开发态：Vite 利用浏览器原生 ESM + esbuild 预构建，秒开 + 改文件秒级热更；Webpack 仍要打整个 bundle，项目越大越慢。生产态都做 Tree shaking、代码分割，差异不大。

### 题目

请说明 Webpack 与 Vite 在开发服务器与生产构建上的工作原理差异。

### 答案要点

- **开发态**
  - Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
  - Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块
- **生产态**
  - Webpack：可定制度极高，loader / plugin 生态最丰富
  - Vite：底层用 Rollup 打包，输出更精简；生态接近 Webpack 但仍在追赶
- **配置心智**：Webpack 配置门槛高、灵活度强；Vite 大量约定优于配置（plugins 形式接入）
- **使用建议**：新项目无脑选 Vite；老的复杂 Webpack 项目迁移成本要评估
- **趋势**：Rspack（字节用 Rust 重写 Webpack 兼容版）、Rolldown（Vite 团队的 Rust Rollup 替代）正在收敛差异

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Webpack 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Webpack，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「Webpack 与 Vite 在开发态、构建态的差异」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2018',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia', 'vue-router'],
        },
      },
    },
  },
  server: { hmr: true },
});
```

### 追问

- 推动「Webpack 与 Vite 在开发态、构建态的差异」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「Webpack 与 Vite 在开发态、构建态的差异」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 Webpack、Vite、构建，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vite 在大型项目里第一次冷启动也可能慢，注意 `optimizeDeps.include`
- Turbopack（Next.js 自研，Rust）走的也是 ESM + 增量编译路线
- 选型核心：开发体验 > 生产产物大小 > 团队熟悉度

## webpack-to-vite-migration

title: Webpack → Vite 迁移的工程痛点与落地策略
followups: [webpack-to-vite-migration-followup-1, webpack-to-vite-migration-followup-2, webpack-to-vite-migration-followup-3]
links: [bundler-deep, bundler-ecosystem, tsconfig-paths-to-bundler-alias]
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频]

### 一句话

迁移痛点集中在：CommonJS / 动态 require、loader 生态差异（thread-loader / cache-loader 没有等价物）、SSR 模式差异、CSS Modules / 别名/postcss 配置不兼容、第三方库 ESM 化不彻底；策略是"双产物并行 + 渐进剥离 + 关键 chunk 验证 + 性能 / 构建体积双红线"。

### 题目

团队的项目从 Webpack 5 迁移到 Vite，你们遇到了哪些痛点？是怎么解决的？

### 答案要点

**典型痛点（按频次）**

- **CommonJS / 动态 require**：Vite 默认 ESM，`require(...)` / `require.context` 直接报错；要换 `import.meta.glob`
- **第三方 CJS 包**：用 `optimizeDeps.include` / `ssr.noExternal` 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）
- **CSS / 资源处理差异**：
  - postcss 配置兼容但语法可能不同
  - CSS Modules 命名规则差异（Vite 默认 `[name]_[local]_[hash:5]`）
  - file-loader / url-loader → Vite 用 `?url` `?inline` `?raw` query
- **SSR**：Webpack SSR 写法（require.cache）和 Vite SSR (loadHttps) 完全不同
- **dev 行为差异**：Webpack 全量编译；Vite 按请求按需编译；某些第三方插件 dev/prod 行为分裂
- **环境变量**：`process.env.X` → `import.meta.env.X`（必须 `VITE_` 前缀）
- **多入口**：Webpack `entry: { a, b }` → Vite `build.rollupOptions.input`
- **代码分割**：Webpack `splitChunks` → Vite/Rollup `manualChunks`，策略思维不同

**策略**

- **不一次性切换**：保留 Webpack 主分支，开 `pnpm dev:vite` / `pnpm build:vite` 平行配置
- **核心 chunk 验证**：用 visualizer 看新旧产物 chunk 分布、首屏大小、关键依赖位置
- **CI 双产物对比**：构建时间、dist 大小、关键 LCP 资源 byte 数
- **灰度发布**：Vite 产物先小流量验证，对 RUM 做 AB 看 LCP / TBT 是否回退
- **保留回退能力**：CDN 部署既有 webpack 版本又有 vite 版本，配置切换

**指标**

- 冷启动：从分钟级 → 秒级（典型 30-60x 提升）
- HMR：从秒级 → 50-200ms
- 但 prod build 时间不一定更快（Vite 用 Rollup 打包，量大时和 Webpack 持平甚至慢）

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Webpack → Vite 迁移的工程痛点与落地策略」时要先定义 Webpack 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，Webpack 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 Webpack 关键链路先收敛再替换。

### 代码示例

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [vue(), legacy({ targets: ['defaults', 'not IE 11'] })],
  resolve: {
    alias: {
      '@': '/src',
      '~': '/src',
    },
  },
  optimizeDeps: {
    include: ['lodash-es', 'some-cjs-pkg'],
  },
  ssr: {
    noExternal: ['some-pkg-needs-bundle'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lodash')) return 'vendor-lodash';
            if (id.includes('react')) return 'vendor-react';
          }
        },
      },
    },
  },
});

const ctx = import.meta.glob('./pages/*.vue');
```

### 常见误区

- 直接复用 webpack 的 alias / postcss / babel 配置不验证
- CSS Modules 类名变化导致样式丢失
- `process.env.NODE_ENV` 直接换不到 import.meta.env，运行时变量缺失
- 没看 manualChunks 输出，主 bundle 反而变大

### 追问

- 哪些场景**不该**迁 Vite？
  - 强依赖 webpack-only 插件（如某些联邦模块方案）；超大 monorepo 且 prod build 已优化到极限的；微前端框架强绑定 webpack 的（旧 qiankun + webpack-loader 体系）
- 性能数据怎么量化、什么是足够好的提升？
  - dev cold start P95 < 5s；HMR P95 < 300ms；CI 构建 -20% 以上视为成功
- 第三方 lib 不发 ESM 怎么办？
  - `optimizeDeps.include` 让 esbuild 预构建；patch-package 改 main field；最差自己 fork 发 ESM 版

### 延伸

- 进阶：rolldown（Rust 写的 Rollup 替代）即将取代 Vite 内部的 Rollup，prod build 性能再翻几倍
- 工程：迁移 PR 一定要带"构建产物体积变化"自动评论（visualizer + size-limit）

## vite-vs-webpack-deep

title: 为什么 Vite 比 Webpack 快？快在哪里
followups: [vite-vs-webpack-deep-followup-1, vite-vs-webpack-deep-followup-2, vite-vs-webpack-deep-followup-3]
links: [bundler-deep, bundler-ecosystem, tsconfig-paths-to-bundler-alias]
difficulty: 进阶
tags: [Vite, Webpack, 高频]

### 一句话

Vite dev 不打包，依赖用 esbuild（Go 写的，10-100x 快于 webpack 的 babel/loader 链）预构建为 ESM，源码直接交给浏览器原生 ESM 按需编译；Webpack dev 必须先把整图打成 bundle 才能起服务。生产构建 Vite 用 Rollup 打包，速度未必比 webpack 快。

### 题目

为什么 Vite 比 Webpack 快？是 dev 快还是 prod 快？快在哪里？

### 答案要点

**Dev 阶段（Vite 显著快）**

- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk
- Vite：
  - **依赖用 esbuild 预构建**（Go，并发原生编译，cold 几百到几千 ms）
  - **源码不预打包**，直接走 `<script type="module">`，浏览器请求 → Vite 按文件按需 transform（svelte/vue/jsx）→ 304 缓存
  - HMR 只 invalidate 改的模块和它的边界，不重新打包
- 结果：cold start 从分钟级 → 秒级；HMR 从秒级 → 100ms 级

**Prod 阶段（Vite 不一定快）**

- Vite prod 用 **Rollup**（Node.js）打包，做 tree-shake / code-split / 压缩
- 大型项目（数千模块）Rollup 可能比 Webpack 持平甚至慢
- 但 chunk 划分通常更好（rollup 默认 chunk 体积更小）

**核心差异点**

- **目标**：Webpack 早期是 bundler-only；Vite dev 借浏览器原生 ESM 直接服务
- **语言**：esbuild = Go；Rollup = Node.js；Webpack = Node.js
- **依赖处理**：Vite 把 node_modules 一次预构建，使用强缓存
- **HMR 模型**：Vite 基于 ESM module graph，更精准
- **TS 支持**：Vite 用 esbuild 转译，不做类型检查（业务侧用 vue-tsc / tsc --noEmit 单独跑）

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Dev 阶段（Vite 显著快）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「为什么 Vite 比 Webpack 快？快在哪里」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
// Vite 依赖预构建
{
  optimizeDeps: {
    include: ['vue', 'pinia', 'lodash-es'],
    exclude: ['some-esm-pkg'],
  },
}

// 源码 ESM：浏览器直接 import
// 浏览器：GET /src/pages/Home.vue → Vite transform → 返回 JS

// HMR
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    console.log('module updated', mod);
  });
}
```

### 常见误区

- 以为 Vite prod 也快：大项目可能不如 webpack
- 以为 esbuild 会做类型检查：不做，要 tsc 兜底
- 以为 Vite dev 不会预构建：实际首次启动有几秒"optimizing dependencies"
- 拿 webpack v4 做对比：webpack 5 持久化缓存后已快很多，差距没那么夸张

### 追问

- esbuild 为什么这么快？
  - Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性
- Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件？
  - 源码要走 vue / svelte / jsx 编译，esbuild 不直接支持；esbuild 做依赖即可
- HMR 为什么快？
  - 文件级 invalidation；不需要 rebundle；websocket 推送精确边界
- Vite prod 慢怎么优化？
  - 关闭 sourcemap；manualChunks 控制 chunk 数；预构建大依赖（rolldown 即将主线）

### 延伸

- 进阶：Rolldown（Rust 重写 Rollup）将让 Vite prod build 也大幅加速
- 工程：CI 上 Vite cache（`.vite/deps`）持久化能再砍 30%+ 启动时间

## vite-go-and-rolldown

title: Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化
followups: [vite-go-and-rolldown-followup-1, vite-go-and-rolldown-followup-2, vite-go-and-rolldown-followup-3]
links: [bundler-deep, bundler-ecosystem, tsconfig-paths-to-bundler-alias]
difficulty: 资深
tags: [Vite, esbuild, Rolldown]

### 一句话

Vite 现在用 Go（esbuild）做依赖预构建和单文件 transform；用 Node.js（Rollup）做 prod 打包；新一代用 Rust（Rolldown）取代 Rollup 让 prod 也飞快；Vite 7+ 在向 Rolldown / Oxc / Rust 工具链全面切换。

### 题目

你提到 Vite 底层有用 Go 编写的部分，具体是哪部分？Vite 7 / Rolldown 这些新东西你了解吗？

### 答案要点

**Go 部分：esbuild**

- esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform
- Vite 用 esbuild 来：
  - **依赖预构建**：把 node_modules 里的 CJS / ESM 都转成统一 ESM，砍掉冗余 import
  - **单文件 transform**：dev 时把 .ts / .tsx / .jsx 文件转成 .js（不做类型检查）
  - **prod 阶段的 minify**：Vite 6 默认用 esbuild 替代 terser

**Rust 部分：未来**

- **Rolldown**：尤雨溪团队用 Rust 重写的 Rollup 兼容打包器，性能 10-30x
- **Oxc**：Rust 写的 JS/TS parser/linter，比 babel 快几十倍；可能替代 babel parser
- **Vite 7+** 路线：把 prod build 从 Rollup 切到 Rolldown，整个 dev/build 全 Rust 化
- 兼容性：Rolldown 兼容 Rollup 插件，迁移成本低

**Vite 大版本变化**

- **Vite 5**（2023）：默认 ESM、Node ≥ 18、优化 chunk 算法
- **Vite 6**（2024）：Environment API（多环境构建可定制）、`html-rewrite`、CSS chunking 改进
- **Vite 7**（2025-2026）：Node ≥ 20.19/22.12、默认 baseline-widely-available（不再为老 Safari 兼容打补丁）、Rolldown 集成更深、Vitest 4 / vitejs 7 / esbuild 0.27

**Node 版本要求变化**

- Vite 6 → Node ≥ 18，Vite 7 → 20.19+ / 22.12+
- 升级前先看 release note

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Go 部分：esbuild」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```bash
node -p 'require("vite/package.json").version'

pnpm install vite@latest
pnpm add -D rolldown-vite

cat > vite.config.ts << 'EOF'
import { defineConfig } from 'rolldown-vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({ plugins: [vue()] });
EOF
```

### 常见误区

- 以为 Vite 整个底层都是 Go：实际只是 esbuild
- 把 esbuild 当 bundler 用：Vite prod 还是 Rollup
- 升 Vite 7 不看 Node 版本：CI 直接挂

### 追问

- Rolldown 跟 Rollup 兼容到什么程度？
  - 大部分插件兼容（按 plugin API 接入）；某些钩子和 source map 处理有差异
- 为什么不直接用 esbuild 做 prod？
  - esbuild tree-shake / chunk 优化不如 Rollup；ecosystem 插件不够；体积优化弱
- Oxc 和 Rolldown 是同一团队吗？
  - 都在 VoidZero（尤雨溪牵头）下，但 Oxc 主要由 Boshen 推动，定位是 babel 替代

### 延伸

- 进阶：Bun 也想做相似的事（runtime + bundler 一体），但与 Vite 路线不同
- 工程：跟踪 vitejs/rolldown-vite 仓库，提前在内部分支做兼容验证

## tsconfig-paths-to-bundler-alias

title: 通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）
followups: [tsconfig-paths-to-bundler-alias-followup-1, tsconfig-paths-to-bundler-alias-followup-2, tsconfig-paths-to-bundler-alias-followup-3]
links: [bundler-deep, bundler-ecosystem, vite-go-and-rolldown]
difficulty: 进阶
tags: [配置, alias, monorepo]

### 一句话

tsconfig.json 的 `paths` 是 IDE / tsc 唯一可信来源；用 vite-tsconfig-paths / tsconfig-paths-webpack-plugin 把它一键映射到打包器，避免 alias 在三处（tsc / bundler / lint）漂移；monorepo 自动从 workspace 列出。

### 题目

你提到通过配置文件生成路径映射和别名，减少人工维护成本，具体怎么做的？是不是解析 tsconfig 然后映射到 webpack 配置？用 Node.js 实现？

### 答案要点

**问题背景**

- 同一个 alias `@components/*` 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 任一处忘改 → IDE 跳转/构建/lint 中至少一个挂

**统一来源：tsconfig.json**

- 让 tsc 的 paths 成为 single source of truth
- 在打包器配置里**读 tsconfig** → 映射到自家 alias

**社区现成方案**

- Vite：`vite-tsconfig-paths` 插件
- Webpack：`tsconfig-paths-webpack-plugin`
- ESLint：`eslint-import-resolver-typescript` 配合 `import/resolver: { typescript: { project: './tsconfig.json' } }`
- jest / vitest：`pathsToModuleNameMapper` from `ts-jest/utils`

**自己实现要点**

- 用 `jsonc-parser` / 简单 JSON.parse 读 tsconfig（注意 JSONC 注释 + extends 链 + glob baseUrl）
- 解析 paths object：`{ "@/*": ["src/*"] }` → `{ "@": resolve(__dirname, 'src') }`（去掉 /\*）
- 处理 `extends` 递归合并

**Monorepo 进阶**

- 在根 tsconfig.base.json 集中定义；各包用 `extends` 继承
- 用 `pnpm-workspace.yaml` + 自动生成 paths：脚本扫子包 package.json 名 + main 路径，写入 tsconfig

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「任一处忘改 → IDE 跳转/构建/lint 中至少一个挂」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { parse } from 'jsonc-parser';

interface TsConfig {
  extends?: string;
  compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
}

export function resolveAlias(tsconfigPath = './tsconfig.json'): Record<string, string> {
  const root = dirname(resolve(tsconfigPath));
  const cfg = parse(readFileSync(tsconfigPath, 'utf-8')) as TsConfig;
  const baseUrl = cfg.compilerOptions?.baseUrl ?? '.';
  const paths = cfg.compilerOptions?.paths ?? {};
  const alias: Record<string, string> = {};
  for (const [k, v] of Object.entries(paths)) {
    const key = k.replace(/\/\*$/, '');
    const target = resolve(root, baseUrl, v[0].replace(/\/\*$/, ''));
    alias[key] = target;
  }
  return alias;
}

import { defineConfig } from 'vite';
import { resolveAlias } from './scripts/alias';

export default defineConfig({
  resolve: { alias: resolveAlias() },
});
```

### 常见误区

- 忘记 `extends` 链：扩展继承的 paths 漏掉
- baseUrl 没拼：直接 resolve 路径错
- 把 alias 写在三处：人工保持一致几乎不可能

### 追问

- monorepo 里 tsconfig 多达几十个，怎么不重复？
  - 根 tsconfig.base.json + 子包 extends；alias 基于 root 解析
- alias 如何和 Node.js 运行时（如 SSR / vitest）保持一致？
  - 用 `tsx` / `tsconfig-paths/register` 让 Node 也认 tsconfig paths
- IDE 不识别新 alias 怎么排查？
  - 重启 ts server；检查 baseUrl + paths 拼接

### 延伸

- 进阶：用 `tsconfck` 库做完整 extends / globs 解析
- 工程：CI 上跑一致性检查脚本，对比 tsconfig.paths / vite.alias / eslint resolver 是否一致

## vite-principle-followup-1

title: 追问：在「Vite 为什么开发快、构建又能稳定」场景下，真要把「Vite 为什么开发快、构建又能稳定」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Vite 为什么开发快、构建又能稳定」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在「Vite 为什么开发快、构建又能稳定」场景下，真要把「Vite 为什么开发快、构建又能稳定」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 机制：依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM；业务代码按请求即时转换，HMR 粒度细、回流范围小
- 落地动作：回答「在「Vite 为什么开发快、构建又能稳定」场景下，真要把「Vite 为什么开发快、构建又能稳定」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Vite 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Vite，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「Vite 为什么开发快、构建又能稳定」场景下，真要把「Vite 为什么开发快、构建又能稳定」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM
- 业务代码按请求即时转换，HMR 粒度细、回流范围小

## vite-principle-followup-2

title: 追问：在当前团队与业务约束下，你会怎样围绕 Vite 拆分「Vite 为什么开发快、构建又能稳定」的推进节奏，兼顾短期交付和长期治理
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Vite 为什么开发快、构建又能稳定」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样围绕 Vite 拆分「Vite 为什么开发快、构建又能稳定」的推进节奏，兼顾短期交付和长期治理？

### 答案要点

#### 标准回答（直接作答）

- 结论：开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 机制：依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM；业务代码按请求即时转换，HMR 粒度细、回流范围小
- 落地动作：回答「在当前团队与业务约束下，你会怎样围绕 Vite 拆分「Vite 为什么开发快、构建又能稳定」的推进节奏，兼顾短期交付和长期治理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会怎样围绕 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会怎样围绕，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，你会怎样围绕 Vite 拆分「Vite 为什么开发快、构建又能稳定」的推进节奏，兼顾短期交付和长期治理」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM
- 业务代码按请求即时转换，HMR 粒度细、回流范围小

## vite-principle-followup-3

title: 追问：围绕「Vite 为什么开发快、构建又能稳定」做去留决策，你会拿哪些指标说服团队
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vite 为什么开发快、构建又能稳定」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：围绕「Vite 为什么开发快、构建又能稳定」做去留决策，你会拿哪些指标说服团队？

### 答案要点

#### 标准回答（直接作答）

- 结论：开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 机制：依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM；业务代码按请求即时转换，HMR 粒度细、回流范围小
- 落地动作：回答「围绕「Vite 为什么开发快、构建又能稳定」做去留决策，你会拿哪些指标说服团队」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Vite 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Vite，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「围绕「Vite 为什么开发快、构建又能稳定」做去留决策，你会拿哪些指标说服团队」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM
- 业务代码按请求即时转换，HMR 粒度细、回流范围小

## bundler-ecosystem-followup-1

title: 追问：围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem

### 一句话

先界定「Webpack、Rollup、esbuild、SWC 各自擅长什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- 机制：Rollup 天然偏向 ESM 和库构建，产物更干净；esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建
- 落地动作：回答「围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真」时要把 Webpack 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Webpack 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- Rollup 天然偏向 ESM 和库构建，产物更干净
- esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建

## package-manager-followup-1

title: 追问：在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」场景下，真要把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」推到线上，你会如何围绕 pnpm 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」场景下，真要把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」推到线上，你会如何围绕 pnpm 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- 机制：lockfile 锁定依赖树，保证 CI/本地一致；peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器
- 落地动作：回答「在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」场景下，真要把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」推到线上，你会如何围绕 pnpm 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」场景下，真要把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」推到线上，你会如何围绕 pnpm 设计灰度节奏、回滚条件和迁移路径」时要先定义 npm 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，npm 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 npm 关键链路先收敛再替换。

#### 关键细节（可追问）

- pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- lockfile 锁定依赖树，保证 CI/本地一致
- peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器

## semver-commit-governance-followup-1

title: 追问：从工程落地角度看，真要把「SemVer、Conventional Commits、Changesets 分别治理什么问题」推到线上，你会如何围绕 SemVer 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：从工程落地角度看，真要把「SemVer、Conventional Commits、Changesets 分别治理什么问题」推到线上，你会如何围绕 SemVer 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- 机制：Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断；Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明
- 落地动作：回答「从工程落地角度看，真要把「SemVer、Conventional Commits、Changesets 分别治理什么问题」推到线上，你会如何围绕 SemVer 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，真要把「SemVer、Conventional Commits、Changesets 分别治理什么问题」推到线上，你会如何围绕 SemVer 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断
- Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明

## source-map-polyfill-followup-1

title: 追问：如果要评估「Source Map、Browserslist 与 Polyfill 策略」的落地风险，你会优先检查哪些 SourceMap 约束是否成立
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill

### 一句话

先界定「Source Map、Browserslist 与 Polyfill 策略」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「Source Map、Browserslist 与 Polyfill 策略」的落地风险，你会优先检查哪些 SourceMap 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 机制：语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from；Browserslist 定义目标环境，构建工具据此决定转译和兼容策略
- 落地动作：回答「如果要评估「Source Map、Browserslist 与 Polyfill 策略」的落地风险，你会优先检查哪些 SourceMap 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 Source 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 Source 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「如果要评估「Source Map、Browserslist 与 Polyfill 策略」的落地风险，你会优先检查哪些 SourceMap 约束是否成立」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from
- Browserslist 定义目标环境，构建工具据此决定转译和兼容策略

## monorepo-followup-1

title: 追问：结合真实业务约束，面对真实流量和复杂依赖时，「Monorepo、workspace、project references 的组合打法」最可能被哪些 Monorepo 边界条件击穿
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo

### 一句话

先界定「Monorepo、workspace、project references 的组合打法」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：结合真实业务约束，面对真实流量和复杂依赖时，「Monorepo、workspace、project references 的组合打法」最可能被哪些 Monorepo 边界条件击穿？

### 答案要点

#### 标准回答（直接作答）

- 结论：Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- 机制：workspace 解决依赖链接与本地开发；Turborepo/Nx 解决任务缓存、增量执行、依赖图调度
- 落地动作：回答「结合真实业务约束，面对真实流量和复杂依赖时，「Monorepo、workspace、project references 的组合打法」最可能被哪些 Monorepo 边界条件击穿」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「workspace 解决依赖链接与本地开发」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，面对真实流量和复杂依赖时，「Monorepo、workspace、project references 的组合打法」最可能被哪些 Monorepo 边界条件击穿」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- workspace 解决依赖链接与本地开发
- Turborepo/Nx 解决任务缓存、增量执行、依赖图调度

## lint-ci-followup-1

title: 追问：围绕「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」做迁移时，你会怎样拆分批次，降低回滚风险
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」不是只在理想输入下成立。。

### 题目

如果面试官追问：围绕「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」做迁移时，你会怎样拆分批次，降低回滚风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：Prettier 负责格式，不负责业务正确性
- 机制：ESLint 负责可疑模式、最佳实践和团队约束；Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理
- 落地动作：回答「围绕「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」做迁移时，你会怎样拆分批次，降低回滚风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」做迁移时，你会怎样拆分批次，降低回滚风险」时要先定义 ESLint 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，ESLint 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 ESLint 关键链路先收敛再替换。

#### 关键细节（可追问）

- Prettier 负责格式，不负责业务正确性
- ESLint 负责可疑模式、最佳实践和团队约束
- Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理

## package-publishing-followup-1

title: 追问：结合真实业务约束，真要把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：结合真实业务约束，真要把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：明确入口：exports、types、必要时 main/module
- 机制：标注 Tree Shaking 语义：sideEffects；提供子路径导出时，要确保运行时代码和类型定义都能对上
- 落地动作：回答「结合真实业务约束，真要把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，真要把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 明确入口：exports、types、必要时 main/module
- 标注 Tree Shaking 语义：sideEffects
- 提供子路径导出时，要确保运行时代码和类型定义都能对上

## webpack-module-federation-followup-1

title: 追问：从工程落地角度看，当「Webpack 5 Module Federation 的价值与边界」跨团队落地时，你会先确认哪些 Webpack 前置假设，避免后续返工
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation

### 一句话

先界定「Webpack 5 Module Federation 的价值与边界」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：从工程落地角度看，当「Webpack 5 Module Federation 的价值与边界」跨团队落地时，你会先确认哪些 Webpack 前置假设，避免后续返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 机制：核心角色通常包括 host、remote、shared 依赖，以及远程容器入口；它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本
- 落地动作：回答「从工程落地角度看，当「Webpack 5 Module Federation 的价值与边界」跨团队落地时，你会先确认哪些 Webpack 前置假设，避免后续返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，当「Webpack 5 Module Federation 的价值与边界」跨团队落地时，你会先确认哪些 Webpack 前置假设，避免后续返工」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 核心角色通常包括 host、remote、shared 依赖，以及远程容器入口
- 它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本

## exports-subpath-followup-1

title: 追问：在当前团队与业务约束下，真要把「exports、subpath imports 与现代包入口设计」推到线上，你会如何围绕 package.json 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「exports、subpath imports 与现代包入口设计」拆成可验证的小步骤。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「exports、subpath imports 与现代包入口设计」推到线上，你会如何围绕 package.json 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 机制：子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server；imports 更偏包内部别名和条件映射，通常服务于包自身源码组织
- 落地动作：回答「在当前团队与业务约束下，真要把「exports、subpath imports 与现代包入口设计」推到线上，你会如何围绕 package.json 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，真要把「exports、subpath imports 与现代包入口设计」推到线上，你会如何围绕 package.json 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server
- imports 更偏包内部别名和条件映射，通常服务于包自身源码组织

## ci-cd-cache-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 CI 相关的指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「CI/CD 缓存、矩阵构建与门禁设计」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 CI 相关的指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 机制：缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染；矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开
- 落地动作：回答「从工程落地角度看，你会先看哪些与 CI 相关的指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 从工程落地角度看 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，从工程落地角度看 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「从工程落地角度看，你会先看哪些与 CI 相关的指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈」采用小步优化更稳。

#### 关键细节（可追问）

- 常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染
- 矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开

## monorepo-changesets-followup-1

title: 追问：在真实业务里落地「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时，你会先排查哪些与 Monorepo 相关的边界假设
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets

### 一句话

先界定「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚。

### 题目

如果面试官追问：在真实业务里落地「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时，你会先排查哪些与 Monorepo 相关的边界假设？

### 答案要点

#### 标准回答（直接作答）

- 结论：选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 机制：流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish；依赖：被依赖的包先发版，依赖方自动升 caret 范围
- 落地动作：回答「在真实业务里落地「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时，你会先排查哪些与 Monorepo 相关的边界假设」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在真实业务里落地「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时，你会先排查哪些与 Monorepo 相关的边界假设」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish
- 依赖：被依赖的包先发版，依赖方自动升 caret 范围

## bundler-deep-followup-1

title: 追问：围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep

### 一句话

先界定「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚。

### 题目

如果面试官追问：围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：打包器三件事：依赖图分析、转换、产出 bundle
- 机制：Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好；Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包
- 落地动作：回答「围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真」时要把 Webpack 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Webpack 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 打包器三件事：依赖图分析、转换、产出 bundle
- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包

## webpack-vs-vite-followup-1

title: 追问：从工程落地角度看，真要把「Webpack 与 Vite 在开发态、构建态的差异」推到线上，你会如何围绕 Webpack 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Webpack 与 Vite 在开发态、构建态的差异」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：从工程落地角度看，真要把「Webpack 与 Vite 在开发态、构建态的差异」推到线上，你会如何围绕 Webpack 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- 机制：Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块；Webpack：可定制度极高，loader / plugin 生态最丰富
- 落地动作：回答「从工程落地角度看，真要把「Webpack 与 Vite 在开发态、构建态的差异」推到线上，你会如何围绕 Webpack 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，真要把「Webpack 与 Vite 在开发态、构建态的差异」推到线上，你会如何围绕 Webpack 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块
- Webpack：可定制度极高，loader / plugin 生态最丰富

## webpack-to-vite-migration-followup-1

title: 追问：从工程落地角度看，真要把「Webpack → Vite 迁移的工程痛点与落地策略」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Webpack → Vite 迁移的工程痛点与落地策略」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：从工程落地角度看，真要把「Webpack → Vite 迁移的工程痛点与落地策略」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 机制：第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）；CSS / 资源处理差异：
- 落地动作：回答「从工程落地角度看，真要把「Webpack → Vite 迁移的工程痛点与落地策略」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，真要把「Webpack → Vite 迁移的工程痛点与落地策略」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）
- CSS / 资源处理差异：

## webpack-to-vite-migration-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 Vite 安排「Webpack → Vite 迁移的工程痛点与落地策略」的渐进改造路线
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「Webpack → Vite 迁移的工程痛点与落地策略」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 Vite 安排「Webpack → Vite 迁移的工程痛点与落地策略」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 机制：第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）；CSS / 资源处理差异：
- 落地动作：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 Vite 安排「Webpack → Vite 迁移的工程痛点与落地策略」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 Vite 安排「Webpack → Vite 迁移的工程痛点与落地策略」的渐进改造路线」时要先定义 老系统包袱重 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，老系统包袱重 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 老系统包袱重 关键链路先收敛再替换。

#### 关键细节（可追问）

- CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）
- CSS / 资源处理差异：

## webpack-to-vite-migration-followup-3

title: 追问：评估「Webpack → Vite 迁移的工程痛点与落地策略」长期维护价值时，你最看重哪些稳定性和效率信号
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Webpack → Vite 迁移的工程痛点与落地策略」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：评估「Webpack → Vite 迁移的工程痛点与落地策略」长期维护价值时，你最看重哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 机制：第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）；CSS / 资源处理差异：
- 落地动作：回答「评估「Webpack → Vite 迁移的工程痛点与落地策略」长期维护价值时，你最看重哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「评估「Webpack → Vite 迁移的工程痛点与落地策略」长期维护价值时，你最看重哪些稳定性和效率信号」时要先定义 评估 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，评估 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 评估 关键链路先收敛再替换。

#### 关键细节（可追问）

- CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）
- CSS / 资源处理差异：

## vite-vs-webpack-deep-followup-1

title: 追问：以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep

### 一句话

先界定「为什么 Vite 比 Webpack 快？快在哪里」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设？

### 答案要点

#### 标准回答（直接作答）

- 结论：Dev 阶段（Vite 显著快）
- 机制：Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk；依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）
- 落地动作：回答「以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设」时要把 Vite 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Vite 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Dev 阶段（Vite 显著快）
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk
- 依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）

## vite-go-and-rolldown-followup-1

title: 追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」进入长周期维护后，你会重点巡检哪些与 Vite 相关的高风险边界点
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown

### 一句话

先界定「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」进入长周期维护后，你会重点巡检哪些与 Vite 相关的高风险边界点？

### 答案要点

#### 标准回答（直接作答）

- 结论：Go 部分：esbuild
- 机制：esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform；Vite 用 esbuild 来：
- 落地动作：回答「在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」进入长周期维护后，你会重点巡检哪些与 Vite 相关的高风险边界点」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Go 部分：esbuild」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」进入长周期维护后，你会重点巡检哪些与 Vite 相关的高风险边界点」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Go 部分：esbuild
- esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform
- Vite 用 esbuild 来：

## tsconfig-paths-to-bundler-alias-followup-1

title: 追问：把「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」放到真实业务里，围绕 配置 最容易被低估的边界条件和前置约束是什么
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias

### 一句话

先界定「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：把「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」放到真实业务里，围绕 配置 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 机制：任一处忘改 → IDE 跳转/构建/lint 中至少一个挂；统一来源：tsconfig.json
- 落地动作：回答「把「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」放到真实业务里，围绕 配置 最容易被低估的边界条件和前置约束的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「任一处忘改 → IDE 跳转/构建/lint 中至少一个挂」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「把「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」放到真实业务里，围绕 配置 最容易被低估的边界条件和前置约束的定义」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 任一处忘改 → IDE 跳转/构建/lint 中至少一个挂
- 统一来源：tsconfig.json

## package-manager-followup-2

title: 追问：结合真实业务约束，如果部分模块技术债很重，你会如何围绕 pnpm 调整「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」的分阶段策略
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager
generated: followup-script

### 一句话

规模变大后先重新评估「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：结合真实业务约束，如果部分模块技术债很重，你会如何围绕 pnpm 调整「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」的分阶段策略？

### 答案要点

#### 标准回答（直接作答）

- 结论：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- 机制：lockfile 锁定依赖树，保证 CI/本地一致；peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器
- 落地动作：回答「结合真实业务约束，如果部分模块技术债很重，你会如何围绕 pnpm 调整「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」的分阶段策略」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会如何围绕 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会如何围绕，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，如果部分模块技术债很重，你会如何围绕 pnpm 调整「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」的分阶段策略」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- lockfile 锁定依赖树，保证 CI/本地一致
- peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器

## package-manager-followup-3

title: 追问：你会如何用可观测数据衡量「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」在 pnpm 上的维护成本和收益平衡
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> pnpm 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：你会如何用可观测数据衡量「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」在 pnpm 上的维护成本和收益平衡？

### 答案要点

#### 标准回答（直接作答）

- 结论：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- 机制：lockfile 锁定依赖树，保证 CI/本地一致；peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器
- 落地动作：回答「你会如何用可观测数据衡量「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」在 pnpm 上的维护成本和收益平衡」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会如何用可观测数据 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会如何用可观测数据，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你会如何用可观测数据衡量「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」在 pnpm 上的维护成本和收益平衡」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- lockfile 锁定依赖树，保证 CI/本地一致
- peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器

## semver-commit-governance-followup-2

title: 追问：在当前团队与业务约束下，面对跨团队协作成本，你会如何围绕 SemVer 规划「SemVer、Conventional Commits、Changesets 分别治理什么问题」的阶段目标与交付边界
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「SemVer、Conventional Commits、Changesets 分别治理什么问题」讲成只在理想输入下可用。。

### 题目

如果面试官追问：在当前团队与业务约束下，面对跨团队协作成本，你会如何围绕 SemVer 规划「SemVer、Conventional Commits、Changesets 分别治理什么问题」的阶段目标与交付边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- 机制：Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断；Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明
- 落地动作：回答「在当前团队与业务约束下，面对跨团队协作成本，你会如何围绕 SemVer 规划「SemVer、Conventional Commits、Changesets 分别治理什么问题」的阶段目标与交付边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 面对跨团队协作成本 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 面对跨团队协作成本，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，面对跨团队协作成本，你会如何围绕 SemVer 规划「SemVer、Conventional Commits、Changesets 分别治理什么问题」的阶段目标与交付边界」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断
- Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明

## semver-commit-governance-followup-3

title: 追问：从工程落地角度看，为了确认「SemVer、Conventional Commits、Changesets 分别治理什么问题」在 SemVer 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「SemVer、Conventional Commits、Changesets 分别治理什么问题」讲成只在理想输入下可用。。

### 题目

如果面试官追问：从工程落地角度看，为了确认「SemVer、Conventional Commits、Changesets 分别治理什么问题」在 SemVer 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- 机制：Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断；Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明
- 落地动作：回答「从工程落地角度看，为了确认「SemVer、Conventional Commits、Changesets 分别治理什么问题」在 SemVer 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，为了确认「SemVer、Conventional Commits、Changesets 分别治理什么问题」在 SemVer 上能持续跑稳，你会长期追哪些稳定性和效率信号」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断
- Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明

## lint-ci-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 规范 定义「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」的先后改造顺序
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 规范 方案动作 -> 验证结果」。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 规范 定义「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：Prettier 负责格式，不负责业务正确性
- 机制：ESLint 负责可疑模式、最佳实践和团队约束；Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理
- 落地动作：回答「当团队成熟度不一致时，你会如何围绕 规范 定义「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「当团队成熟度不一致时，你会如何围绕 规范 定义「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」的先后改造顺序」时要先定义 当团队成熟度不一致时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队成熟度不一致时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队成熟度不一致时 关键链路先收敛再替换。

#### 关键细节（可追问）

- Prettier 负责格式，不负责业务正确性
- ESLint 负责可疑模式、最佳实践和团队约束
- Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理

## lint-ci-followup-3

title: 追问：以「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」为例，你会如何用可观测数据衡量「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」在 规范 上的维护成本和收益平衡
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」为例，你会如何用可观测数据衡量「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」在 规范 上的维护成本和收益平衡？

### 答案要点

#### 标准回答（直接作答）

- 结论：Prettier 负责格式，不负责业务正确性
- 机制：ESLint 负责可疑模式、最佳实践和团队约束；Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理
- 落地动作：回答「以「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」为例，你会如何用可观测数据衡量「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」在 规范 上的维护成本和收益平衡」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 ESLint 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 ESLint，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」为例，你会如何用可观测数据衡量「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」在 规范 上的维护成本和收益平衡」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Prettier 负责格式，不负责业务正确性
- ESLint 负责可疑模式、最佳实践和团队约束
- Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理

## package-publishing-followup-2

title: 追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，当团队成熟度不一致时，你会如何围绕 发布 定义「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的先后改造顺序
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing
generated: followup-script

### 一句话

推动「前端库的产物设计：ESM/CJS/types/exports/sideEffects」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，当团队成熟度不一致时，你会如何围绕 发布 定义「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：明确入口：exports、types、必要时 main/module
- 机制：标注 Tree Shaking 语义：sideEffects；提供子路径导出时，要确保运行时代码和类型定义都能对上
- 落地动作：回答「以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，当团队成熟度不一致时，你会如何围绕 发布 定义「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，当团队成熟度不一致时，你会如何围绕 发布 定义「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的先后改造顺序」时要先定义 前端库的产物设计 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端库的产物设计 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端库的产物设计 关键链路先收敛再替换。

#### 关键细节（可追问）

- 明确入口：exports、types、必要时 main/module
- 标注 Tree Shaking 语义：sideEffects
- 提供子路径导出时，要确保运行时代码和类型定义都能对上

## package-publishing-followup-3

title: 追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，半年后要做去留决策时，你会拿哪些数据判断「前端库的产物设计：ESM/CJS/types/exports/sideEffects」还值不值得继续维护
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing
generated: followup-script

### 一句话

规模变大后先重新评估「前端库的产物设计：ESM/CJS/types/exports/sideEffects」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，半年后要做去留决策时，你会拿哪些数据判断「前端库的产物设计：ESM/CJS/types/exports/sideEffects」还值不值得继续维护？

### 答案要点

#### 标准回答（直接作答）

- 结论：明确入口：exports、types、必要时 main/module
- 机制：标注 Tree Shaking 语义：sideEffects；提供子路径导出时，要确保运行时代码和类型定义都能对上
- 落地动作：回答「以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，半年后要做去留决策时，你会拿哪些数据判断「前端库的产物设计：ESM/CJS/types/exports/sideEffects」还值不值得继续维护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端库的产物设计 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端库的产物设计，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，半年后要做去留决策时，你会拿哪些数据判断「前端库的产物设计：ESM/CJS/types/exports/sideEffects」还值不值得继续维护」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 明确入口：exports、types、必要时 main/module
- 标注 Tree Shaking 语义：sideEffects
- 提供子路径导出时，要确保运行时代码和类型定义都能对上

## exports-subpath-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 package.json 规划「exports、subpath imports 与现代包入口设计」的阶段目标与交付边界
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「exports、subpath imports 与现代包入口设计」讲成只在理想输入下可用。；建议按「输入约束 -> package.json 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 package.json 规划「exports、subpath imports 与现代包入口设计」的阶段目标与交付边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 机制：子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server；imports 更偏包内部别名和条件映射，通常服务于包自身源码组织
- 落地动作：回答「从工程落地角度看，面对跨团队协作成本，你会如何围绕 package.json 规划「exports、subpath imports 与现代包入口设计」的阶段目标与交付边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，面对跨团队协作成本，你会如何围绕 package.json 规划「exports、subpath imports 与现代包入口设计」的阶段目标与交付边界」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server
- imports 更偏包内部别名和条件映射，通常服务于包自身源码组织

## exports-subpath-followup-3

title: 追问：在当前团队与业务约束下，为了确认「exports、subpath imports 与现代包入口设计」在 package.json 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「exports、subpath imports 与现代包入口设计」讲成只在理想输入下可用。；围绕「exports、subpath imports 与现代包入口设计」组织答案时。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「exports、subpath imports 与现代包入口设计」在 package.json 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 机制：子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server；imports 更偏包内部别名和条件映射，通常服务于包自身源码组织
- 落地动作：回答「在当前团队与业务约束下，为了确认「exports、subpath imports 与现代包入口设计」在 package.json 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，为了确认「exports、subpath imports 与现代包入口设计」在 package.json 上能持续跑稳，你会长期追哪些稳定性和效率信号」时要先定义 为了确认 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，为了确认 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 为了确认 关键链路先收敛再替换。

#### 关键细节（可追问）

- exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server
- imports 更偏包内部别名和条件映射，通常服务于包自身源码组织

## ci-cd-cache-followup-2

title: 追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，要证明「CI/CD 缓存、矩阵构建与门禁设计」确实改善体验，你会如何围绕 CI 设计线上观测与对照验证
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「CI/CD 缓存、矩阵构建与门禁设计」不是只在理想输入下成立。；再补可观测指标：围绕「CI/CD 缓存、矩阵构建与门禁设计」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变。

### 题目

如果面试官追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，要证明「CI/CD 缓存、矩阵构建与门禁设计」确实改善体验，你会如何围绕 CI 设计线上观测与对照验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 机制：缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染；矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开
- 落地动作：回答「以「CI/CD 缓存、矩阵构建与门禁设计」为例，要证明「CI/CD 缓存、矩阵构建与门禁设计」确实改善体验，你会如何围绕 CI 设计线上观测与对照验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 CI/CD 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，CI/CD 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「以「CI/CD 缓存、矩阵构建与门禁设计」为例，要证明「CI/CD 缓存、矩阵构建与门禁设计」确实改善体验，你会如何围绕 CI 设计线上观测与对照验证」采用小步优化更稳。

#### 关键细节（可追问）

- 常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染
- 矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开

## ci-cd-cache-followup-3

title: 追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，如果「CI/CD 缓存、矩阵构建与门禁设计」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「CI/CD 缓存、矩阵构建与门禁设计」在当前约束下为什么成立。；围绕「CI/CD 缓存、矩阵构建与门禁设计」组织答案时，建议按「约束来源 -> CI 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，如果「CI/CD 缓存、矩阵构建与门禁设计」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 标准回答（直接作答）

- 结论：常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 机制：缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染；矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开
- 落地动作：回答「以「CI/CD 缓存、矩阵构建与门禁设计」为例，如果「CI/CD 缓存、矩阵构建与门禁设计」优化需要额外工程投入，你会如何证明这笔成本值得支付」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 CI/CD 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，CI/CD 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「以「CI/CD 缓存、矩阵构建与门禁设计」为例，如果「CI/CD 缓存、矩阵构建与门禁设计」优化需要额外工程投入，你会如何证明这笔成本值得支付」采用小步优化更稳。

#### 关键细节（可追问）

- 常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染
- 矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开

## webpack-vs-vite-followup-2

title: 追问：以「Webpack 与 Vite 在开发态、构建态的差异」为例，如果部分模块技术债很重，你会如何围绕 Webpack 调整「Webpack 与 Vite 在开发态、构建态的差异」的分阶段策略
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite
generated: followup-script

### 一句话

规模变大后先重新评估「Webpack 与 Vite 在开发态、构建态的差异」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Webpack 与 Vite 在开发态、构建态的差异」对应的工程可维护性收益被复杂度抵消。

### 题目

如果面试官追问：以「Webpack 与 Vite 在开发态、构建态的差异」为例，如果部分模块技术债很重，你会如何围绕 Webpack 调整「Webpack 与 Vite 在开发态、构建态的差异」的分阶段策略？

### 答案要点

#### 标准回答（直接作答）

- 结论：Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- 机制：Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块；Webpack：可定制度极高，loader / plugin 生态最丰富
- 落地动作：回答「以「Webpack 与 Vite 在开发态、构建态的差异」为例，如果部分模块技术债很重，你会如何围绕 Webpack 调整「Webpack 与 Vite 在开发态、构建态的差异」的分阶段策略」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「Webpack 与 Vite 在开发态、构建态的差异」为例，如果部分模块技术债很重，你会如何围绕 Webpack 调整「Webpack 与 Vite 在开发态、构建态的差异」的分阶段策略」时要先定义 Webpack 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，Webpack 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 Webpack 关键链路先收敛再替换。

#### 关键细节（可追问）

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块
- Webpack：可定制度极高，loader / plugin 生态最丰富

## webpack-vs-vite-followup-3

title: 追问：结合真实业务约束，如果「Webpack 与 Vite 在开发态、构建态的差异」进入维护期，你会优先围绕 Webpack 监控哪些指标来预警风险
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Webpack 与 Vite 在开发态、构建态的差异」落到真实交付，而不是停在概念层。；讲「Webpack 与 Vite 在开发态、构建态的差异」时先给 Webpack 的判断口径。

### 题目

如果面试官追问：结合真实业务约束，如果「Webpack 与 Vite 在开发态、构建态的差异」进入维护期，你会优先围绕 Webpack 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- 机制：Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块；Webpack：可定制度极高，loader / plugin 生态最丰富
- 落地动作：回答「结合真实业务约束，如果「Webpack 与 Vite 在开发态、构建态的差异」进入维护期，你会优先围绕 Webpack 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Webpack 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Webpack，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，如果「Webpack 与 Vite 在开发态、构建态的差异」进入维护期，你会优先围绕 Webpack 监控哪些指标来预警风险」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块
- Webpack：可定制度极高，loader / plugin 生态最丰富

## vite-vs-webpack-deep-followup-2

title: 追问：结合真实业务约束，Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「为什么 Vite 比 Webpack 快？快在哪里」落到真实交付，而不是停在概念层。；可以按「问题背景 -> Vite 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：结合真实业务约束，Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性？

### 答案要点

#### 标准回答（直接作答）

- 结论：Dev 阶段（Vite 显著快）
- 机制：Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk；依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）
- 落地动作：回答「结合真实业务约束，Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Dev 阶段（Vite 显著快）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Dev 阶段（Vite 显著快）
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk
- 依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）

## vite-vs-webpack-deep-followup-3

title: 追问：从工程落地角度看，Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「为什么 Vite 比 Webpack 快？快在哪里」在当前约束下为什么成立。；围绕「为什么 Vite 比 Webpack 快？快在哪里」组织答案时，建议按「约束来源 -> Vite 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：从工程落地角度看，Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件？

### 答案要点

#### 标准回答（直接作答）

- 结论：Dev 阶段（Vite 显著快）
- 机制：Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk；依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）
- 落地动作：回答「从工程落地角度看，Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 从工程落地角度看 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 从工程落地角度看 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「从工程落地角度看，Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- Dev 阶段（Vite 显著快）
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk
- 依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）

## vite-go-and-rolldown-followup-2

title: 追问：结合真实业务约束，大部分插件兼容；某些钩子和 source map 处理有差异
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> Vite 方案动作 -> 验证结果」。

### 题目

如果面试官追问：结合真实业务约束，大部分插件兼容（按 plugin API 接入）；某些钩子和 source map 处理有差异？

### 答案要点

#### 标准回答（直接作答）

- 结论：Go 部分：esbuild
- 机制：esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform；Vite 用 esbuild 来：
- 落地动作：回答「结合真实业务约束，大部分插件兼容；某些钩子和 source map 处理有差异」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，大部分插件兼容；某些钩子和 source map 处理有差异」时要把 大部分插件兼容 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，大部分插件兼容 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，大部分插件兼容；某些钩子和 source map 处理有差异」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Go 部分：esbuild
- esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform
- Vite 用 esbuild 来：

## vite-go-and-rolldown-followup-3

title: 追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」时要能同时解释收益、代价和失败信号。；讲「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」时先给 Vite 的判断口径。

### 题目

如果面试官追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod？

### 答案要点

#### 标准回答（直接作答）

- 结论：Go 部分：esbuild
- 机制：esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform；Vite 用 esbuild 来：
- 落地动作：回答「在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod」时要把 Vite 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Vite 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Go 部分：esbuild
- esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform
- Vite 用 esbuild 来：

## tsconfig-paths-to-bundler-alias-followup-2

title: 追问：从工程落地角度看，根 tsconfig.base.json + 子包 extends；alias 基于 root 解析
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「通过配置文件生成路径映射 / 别名」在当前约束下为什么成立。；回答结构可按「触发条件 -> 配置 机制 -> 风险兜底」展开，并以「通过配置文件生成路径映射 / 别名」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：从工程落地角度看，根 tsconfig.base.json + 子包 extends；alias 基于 root 解析？

### 答案要点

#### 标准回答（直接作答）

- 结论：同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 机制：任一处忘改 → IDE 跳转/构建/lint 中至少一个挂；统一来源：tsconfig.json
- 落地动作：回答「从工程落地角度看，根 tsconfig.base.json + 子包 extends；alias 基于 root 解析」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，根 tsconfig.base.json + 子包 extends；alias 基于 root 解析」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 任一处忘改 → IDE 跳转/构建/lint 中至少一个挂
- 统一来源：tsconfig.json

## tsconfig-paths-to-bundler-alias-followup-3

title: 追问：结合真实业务约束，alias 如何和 Node.js 运行时保持一致
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「通过配置文件生成路径映射 / 别名」落到真实交付，而不是停在概念层。；讲「通过配置文件生成路径映射 / 别名」时先给 配置 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：结合真实业务约束，alias 如何和 Node.js 运行时（如 SSR / vitest）保持一致？

### 答案要点

#### 标准回答（直接作答）

- 结论：同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 机制：任一处忘改 → IDE 跳转/构建/lint 中至少一个挂；统一来源：tsconfig.json
- 落地动作：回答「结合真实业务约束，alias 如何和 Node.js 运行时保持一致」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「任一处忘改 → IDE 跳转/构建/lint 中至少一个挂」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，alias 如何和 Node.js 运行时保持一致」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 任一处忘改 → IDE 跳转/构建/lint 中至少一个挂
- 统一来源：tsconfig.json

## bundler-ecosystem-followup-2

title: 追问：结合真实业务约束，如果要让结论在 Webpack 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Webpack、Rollup、esbuild、SWC 各自擅长什么」在当前约束下为什么成立。；建议按「输入约束 -> Webpack 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 Webpack 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- 机制：Rollup 天然偏向 ESM 和库构建，产物更干净；esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建
- 落地动作：回答「结合真实业务约束，如果要让结论在 Webpack 上可复核，你会怎样安排测试、日志和指标的组合验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果要让结论在 Webpack 上可复核，你会怎样安排测试、日志和指标的组合验证」要明确 Webpack 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 Webpack 的高风险边界。

#### 关键细节（可追问）

- Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- Rollup 天然偏向 ESM 和库构建，产物更干净
- esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建

## bundler-ecosystem-followup-3

title: 追问：在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Webpack、Rollup、esbuild、SWC 各自擅长什么」落到真实交付，而不是停在概念层。；可以按「问题背景 -> Webpack 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- 机制：Rollup 天然偏向 ESM 和库构建，产物更干净；esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建
- 落地动作：回答「在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来」时要把 Webpack 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Webpack 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- Rollup 天然偏向 ESM 和库构建，产物更干净
- esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建

## source-map-polyfill-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 SourceMap 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Source Map、Browserslist 与 Polyfill 策略」落到真实交付，而不是停在概念层。；可以按「问题背景 -> SourceMap 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 SourceMap 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 机制：语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from；Browserslist 定义目标环境，构建工具据此决定转译和兼容策略
- 落地动作：回答「在当前团队与业务约束下，上线后你会盯哪些与 SourceMap 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 上线后你会盯哪些与 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 上线后你会盯哪些与 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「在当前团队与业务约束下，上线后你会盯哪些与 SourceMap 相关的日志与指标，来确认这套方案确实带来改进」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from
- Browserslist 定义目标环境，构建工具据此决定转译和兼容策略

## source-map-polyfill-followup-3

title: 追问：以「Source Map、Browserslist 与 Polyfill 策略」为例，当兼容性要求提升或预算收紧时，你会如何围绕 SourceMap 调整方案边界与实施节奏
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Source Map、Browserslist 与 Polyfill 策略」在当前约束下为什么成立。；围绕「Source Map、Browserslist 与 Polyfill 策略」组织答案时。

### 题目

如果面试官追问：以「Source Map、Browserslist 与 Polyfill 策略」为例，当兼容性要求提升或预算收紧时，你会如何围绕 SourceMap 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 机制：语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from；Browserslist 定义目标环境，构建工具据此决定转译和兼容策略
- 落地动作：回答「以「Source Map、Browserslist 与 Polyfill 策略」为例，当兼容性要求提升或预算收紧时，你会如何围绕 SourceMap 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 Source 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 Source 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「以「Source Map、Browserslist 与 Polyfill 策略」为例，当兼容性要求提升或预算收紧时，你会如何围绕 SourceMap 调整方案边界与实施节奏」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from
- Browserslist 定义目标环境，构建工具据此决定转译和兼容策略

## monorepo-followup-2

title: 追问：你会如何围绕 Monorepo 定义「Monorepo、workspace、project references 的组合打法」生效的判据，并用测试与监控长期验证
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Monorepo、workspace、project references 的组合打法」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会如何围绕 Monorepo 定义「Monorepo、workspace、project references 的组合打法」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- 机制：workspace 解决依赖链接与本地开发；Turborepo/Nx 解决任务缓存、增量执行、依赖图调度
- 落地动作：回答「你会如何围绕 Monorepo 定义「Monorepo、workspace、project references 的组合打法」生效的判据，并用测试与监控长期验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会如何围绕 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，你会如何围绕 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「你会如何围绕 Monorepo 定义「Monorepo、workspace、project references 的组合打法」生效的判据，并用测试与监控长期验证」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- workspace 解决依赖链接与本地开发
- Turborepo/Nx 解决任务缓存、增量执行、依赖图调度

## monorepo-followup-3

title: 追问：在当前团队与业务约束下，当需求复杂度增长但团队产能有限时，你会如何围绕 Monorepo 拆分「Monorepo、workspace、project references 的组合打法」的落地路径
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo
generated: followup-script

### 一句话

推动「Monorepo、workspace、project references 的组合打法」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：在当前团队与业务约束下，当需求复杂度增长但团队产能有限时，你会如何围绕 Monorepo 拆分「Monorepo、workspace、project references 的组合打法」的落地路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- 机制：workspace 解决依赖链接与本地开发；Turborepo/Nx 解决任务缓存、增量执行、依赖图调度
- 落地动作：回答「在当前团队与业务约束下，当需求复杂度增长但团队产能有限时，你会如何围绕 Monorepo 拆分「Monorepo、workspace、project references 的组合打法」的落地路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当需求复杂度增长但团队产能有限时，你会如何围绕 Monorepo 拆分「Monorepo、workspace、project references 的组合打法」的落地路径」时要先说清输入规模、复杂度上限和内存预算，这三项决定 当需求复杂度增长但团 是否可行。
- 失败场景：例如漏掉重复值/越界输入，当需求复杂度增长但团 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- workspace 解决依赖链接与本地开发
- Turborepo/Nx 解决任务缓存、增量执行、依赖图调度

## webpack-module-federation-followup-2

title: 追问：在「Webpack 5 Module Federation 的价值与边界」场景下，你会如何围绕 Webpack 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Webpack 5 Module Federation 的价值与边界」落到真实交付，而不是停在概念层。；可以按「问题背景 -> Webpack 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「Webpack 5 Module Federation 的价值与边界」场景下，你会如何围绕 Webpack 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 机制：核心角色通常包括 host、remote、shared 依赖，以及远程容器入口；它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本
- 落地动作：回答「在「Webpack 5 Module Federation 的价值与边界」场景下，你会如何围绕 Webpack 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「核心角色通常包括 host、remote、shared 依赖，以及远程容器入口」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「Webpack 5 Module Federation 的价值与边界」场景下，你会如何围绕 Webpack 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 核心角色通常包括 host、remote、shared 依赖，以及远程容器入口
- 它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本

## webpack-module-federation-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation
generated: followup-script

### 一句话

规模变大后先重新评估「Webpack 5 Module Federation 的价值与边界」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 机制：核心角色通常包括 host、remote、shared 依赖，以及远程容器入口；它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本
- 落地动作：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏」时要把 你会如何围绕 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何围绕 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏」里当前按阶段替换更稳。

#### 关键细节（可追问）

- Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 核心角色通常包括 host、remote、shared 依赖，以及远程容器入口
- 它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本

## monorepo-changesets-followup-2

title: 追问：结合真实业务约束，你会如何围绕 Monorepo 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Monorepo 多包发版」讲成只在理想输入下可用。；回答结构可按「触发条件 -> Monorepo 机制 -> 风险兜底」展开，并以「Monorepo 多包发版」补一条失败场景，能体现工程拆解能力。。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 Monorepo 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 机制：流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish；依赖：被依赖的包先发版，依赖方自动升 caret 范围
- 落地动作：回答「结合真实业务约束，你会如何围绕 Monorepo 定义“方案生效”的判据，并通过测试与观测数据持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会如何围绕 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，你会如何围绕 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，你会如何围绕 Monorepo 定义“方案生效”的判据，并通过测试与观测数据持续验证」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish
- 依赖：被依赖的包先发版，依赖方自动升 caret 范围

## monorepo-changesets-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Monorepo 重新划分「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的实施阶段
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets
generated: followup-script

### 一句话

规模变大后先重新评估「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Monorepo 重新划分「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的实施阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 机制：流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish；依赖：被依赖的包先发版，依赖方自动升 caret 范围
- 落地动作：回答「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Monorepo 重新划分「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的实施阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Monorepo 重新划分「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的实施阶段」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish
- 依赖：被依赖的包先发版，依赖方自动升 caret 范围

## bundler-deep-followup-2

title: 追问：结合真实业务约束，为了确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是“看起来有效”，你会如何安排测试证据和观测指标
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是只在理想输入下成立。。

### 题目

如果面试官追问：结合真实业务约束，为了确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是“看起来有效”，你会如何安排测试证据和观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：打包器三件事：依赖图分析、转换、产出 bundle
- 机制：Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好；Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包
- 落地动作：回答「结合真实业务约束，为了确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是“看起来有效”，你会如何安排测试证据和观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 为了确认 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，为了确认 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，为了确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是“看起来有效”，你会如何安排测试证据和观测指标」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 打包器三件事：依赖图分析、转换、产出 bundle
- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包

## bundler-deep-followup-3

title: 追问：在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 打包工具 拆分「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的落地路径
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep
generated: followup-script

### 一句话

推动「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 打包工具 拆分「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的落地路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：打包器三件事：依赖图分析、转换、产出 bundle
- 机制：Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好；Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包
- 落地动作：回答「在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 打包工具 拆分「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的落地路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 Webpack 结论失真。
- 失败场景：例如忽略极端输入规模，Webpack 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 打包工具 拆分「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的落地路径」优先保证规模上限可控。

#### 关键细节（可追问）

- 打包器三件事：依赖图分析、转换、产出 bundle
- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包

## git-bisect-reflog-worktree

title: Git 事故恢复：reflog、bisect、worktree 怎么配合
difficulty: 资深
tags: [Git, 排障, 发布]
followups: [git-bisect-reflog-worktree-followup-1, git-bisect-reflog-worktree-followup-2, git-bisect-reflog-worktree-followup-3]

### 一句话

`reflog` 负责找回“看起来丢了”的提交，`bisect` 负责二分定位引入问题的 commit，`worktree` 负责并行验证修复与回滚方案，三者组合能把线上回归排查从拍脑袋变成可复现流程。

### 题目

线上发布后出现回归，你怀疑是最近两周某次提交引入的。请给出一个可执行流程：如何用 `reflog`、`bisect`、`worktree` 在尽量短时间内定位根因并准备修复/回滚。

### 答案要点

- 先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。
- `reflog` 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据。
- `bisect` 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据。
- `worktree` 让你在同一仓库同时开“回滚验证分支”“修复候选分支”“主线分支”，避免反复 stash/切分支污染现场，也减少误操作概率。
- 输出结果不止是“找到谁写的”：还要给出可回滚 commit、临时缓解策略、正式修复方案、补充测试和监控项，形成可复盘的 RCA 闭环。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Git 事故恢复：reflog、bisect、worktree 怎么配合」时要先定义 Git 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，Git 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 Git 关键链路先收敛再替换。

### 代码示例

```bash
# 1) 先找回误操作前的 HEAD
git reflog --date=local | head -n 20
git checkout -b rescue-branch <reflog-sha>

# 2) 二分定位回归提交
git bisect start
git bisect bad <current-bad-sha>
git bisect good <last-known-good-sha>
# 每次切到中间提交后运行同一复现脚本
pnpm test:e2e:smoke && git bisect good || git bisect bad
git bisect reset

# 3) 并行验证修复与回滚
git worktree add ../kap-hotfix hotfix/bisect-fix
git worktree add ../kap-rollback rollback/quick-revert
```

### 常见误区

- 直接在主分支上来回切提交排查，不留现场，最后既找不准根因也说不清改了什么。
- bisect 每一步用不同复现口径（有时本地缓存开着、有时关掉），会把“环境噪声”误判成代码问题。
- 定位到问题提交后只做热修，不补回归测试和告警，导致同类事故反复出现。

### 追问

- 如果回归问题只在生产流量下出现、测试环境复现不稳定，你会怎么改造 bisect 判定脚本？
- 当问题跨多个仓库（前端 + BFF + 配置仓）时，你会怎么组织“跨仓根因定位”流程？
- 如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制？

### 延伸

- 建议为高风险仓库约定“发布前可回滚基线标签”和“事故排查脚本模板”。
- 团队层面可定期演练一次 `reflog + bisect + worktree`，把经验从“少数人会”变成“流程可复制”。

## linux-network-debug-playbook

title: 前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作]
followups: [linux-network-debug-playbook-followup-1, linux-network-debug-playbook-followup-2, linux-network-debug-playbook-followup-3]

### 一句话

`lsof/ss` 先确认端口与连接状态，`tcpdump` 抓真实网络包看链路是否通，`strace` 追系统调用看进程在“卡什么”，这套组合能快速区分“代码问题、网络问题、环境问题”。

### 题目

一个 Node BFF 服务出现“偶发 502 + 超时”，前端同学被拉去协查。请说明你会如何用 Linux 工具快速定位问题边界，并给出可执行的排查顺序。

### 答案要点

- 先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大。
- 用 `lsof -i` / `ss -tnlp` 先确认端口是否正确监听、连接是否异常堆积（例如大量 `SYN_RECV`、`CLOSE_WAIT`），先把“服务没起来/端口冲突”这种低级问题排掉。
- 用 `tcpdump` 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界。
- 用 `strace -p <pid>` 观察进程系统调用，如果长期卡在 `futex`、`epoll_wait`、`read` 等调用，可进一步判断是锁竞争、事件循环阻塞还是下游 I/O 卡住。
- 把排查结果结构化输出给后端/SRE：现象、时间窗、证据（命令输出/抓包摘要）、临时止血动作、后续修复项，避免跨团队沟通只停在“感觉是网络问题”。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」时必须说明 前端工程师的 在弱网、限流、断连三种场景下的处理差异，否则属于不完整答案。
- 失败场景：例如弱网重试未做幂等，前端工程师的 请求会重复写入并造成状态错乱；修复需要补幂等键、指数退避和用户可见兜底提示。
- 替代方案与取舍：可选“失败就无限重试”，实现简单但会放大故障；当前在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」里采用限次重试 + 降级。

### 代码示例

```bash
# 1) 端口与连接状态
lsof -i :8080
ss -tnlp | rg 8080
ss -tan | rg 'SYN_RECV|CLOSE_WAIT|ESTAB' | wc -l

# 2) 抓包看请求是否到达与返回
sudo tcpdump -i any host 10.0.2.15 and port 8080 -nn -vv -c 100

# 3) 追踪进程系统调用（短时）
sudo strace -tt -p <pid> -f -o /tmp/bff.strace
```

### 常见误区

- 一上来就改代码或重启服务，导致关键现场（连接状态、错误上下文）被清空，后续无法复盘。
- 抓包不限定 host/port/time window，拿到大量噪声数据却提炼不出结论。
- 只贴命令截图不给结论，跨团队协作时无法形成可执行行动项。

### 追问

- 如果是 HTTPS 流量，抓包看不到明文，你会怎么结合应用日志与网关日志定位问题？
- 当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案？
- 如何把这套排障动作沉淀成“前端值班手册”，让新同学也能按步骤执行？

### 延伸

- 对前端团队来说，目标不是替代 SRE，而是能用证据快速缩小问题边界，提升跨团队排障效率。
- 建议把常用排障命令做成“场景化清单”（端口异常、DNS 异常、超时重传、进程阻塞）并定期演练。

## git-bisect-reflog-worktree-followup-1

title: 追问：结合真实业务约束，如果回归问题只在生产流量下出现、测试环境复现不稳定，你会怎么改造 bisect 判定脚本
difficulty: 资深
tags: [Git, 排障, 发布, 追问]
parent: git-bisect-reflog-worktree
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Git 事故恢复：reflog、bisect、worktree 怎么配合」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> Git 方案动作 -> 验证结果」。

### 题目

如果面试官追问：结合真实业务约束，如果回归问题只在生产流量下出现、测试环境复现不稳定，你会怎么改造 bisect 判定脚本？

### 答案要点

#### 标准回答（直接作答）

- 结论：先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信
- 机制：reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据；bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据
- 落地动作：回答「结合真实业务约束，如果回归问题只在生产流量下出现、测试环境复现不稳定，你会怎么改造 bisect 判定脚本」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 流量下出现 对应的测试数据可复现、环境稳定、失败信号可观测。
- 失败场景：例如只测主路径，流量下出现 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。
- 替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「结合真实业务约束，如果回归问题只在生产流量下出现、测试环境复现不稳定，你会怎么改造 bisect 判定脚本」采用单测+集成+少量 e2e 的分层组合。

#### 关键细节（可追问）

- 先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信
- reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据
- bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据

## git-bisect-reflog-worktree-followup-2

title: 追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，当问题跨多个仓库时，你会怎么组织“跨仓根因定位”流程
difficulty: 资深
tags: [Git, 排障, 发布, 追问]
parent: git-bisect-reflog-worktree
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Git 事故恢复：reflog、bisect、worktree 怎么配合」时要能同时解释收益、代价和失败信号。；讲「Git 事故恢复：reflog、bisect、worktree 怎么配合」时先给 Git 的判断口径。

### 题目

如果面试官追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，当问题跨多个仓库（前端 + BFF + 配置仓）时，你会怎么组织“跨仓根因定位”流程？

### 答案要点

#### 标准回答（直接作答）

- 结论：先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信
- 机制：reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据；bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据
- 落地动作：回答「在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，当问题跨多个仓库时，你会怎么组织“跨仓根因定位”流程」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Git 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Git，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，当问题跨多个仓库时，你会怎么组织“跨仓根因定位”流程」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信
- reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据
- bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据

## git-bisect-reflog-worktree-followup-3

title: 追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制
difficulty: 资深
tags: [Git, 排障, 发布, 追问]
parent: git-bisect-reflog-worktree
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Git 事故恢复：reflog、bisect、worktree 怎么配合」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> Git 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制？

### 答案要点

#### 标准回答（直接作答）

- 结论：先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信
- 机制：reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据；bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据
- 落地动作：回答「在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 Git 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 Git，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信
- reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据
- bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据

## linux-network-debug-playbook-followup-1

title: 追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如果是 HTTPS 流量，抓包看不到明文，你会怎么结合应用日志与网关日志定位问题
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作, 追问]
parent: linux-network-debug-playbook
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> Linux 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如果是 HTTPS 流量，抓包看不到明文，你会怎么结合应用日志与网关日志定位问题？

### 答案要点

#### 标准回答（直接作答）

- 结论：先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大
- 机制：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉；用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界
- 落地动作：回答「在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如果是 HTTPS 流量，抓包看不到明文，你会怎么结合应用日志与网关日志定位问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题默认 前端工程师的 链路已定义超时、重试和幂等规则；若服务端语义不稳定，先补协议契约再谈优化。
- 失败场景：例如网关限流时仍持续重试，前端工程师的 会放大故障并拖垮下游；应立即降级并限制重试窗口。
- 替代方案与取舍：也可吞掉错误换表面成功率，但定位成本极高；当前保留错误语义和回滚开关。

#### 关键细节（可追问）

- 先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大
- 用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉
- 用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界

## linux-network-debug-playbook-followup-2

title: 追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作, 追问]
parent: linux-network-debug-playbook
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> Linux 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案？

### 答案要点

#### 标准回答（直接作答）

- 结论：先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大
- 机制：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉；用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界
- 落地动作：回答「在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案」时必须说明 前端工程师的 在弱网、限流、断连三种场景下的处理差异，否则属于不完整答案。
- 失败场景：例如弱网重试未做幂等，前端工程师的 请求会重复写入并造成状态错乱；修复需要补幂等键、指数退避和用户可见兜底提示。
- 替代方案与取舍：可选“失败就无限重试”，实现简单但会放大故障；当前在「在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案」里采用限次重试 + 降级。

#### 关键细节（可追问）

- 先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大
- 用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉
- 用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界

## linux-network-debug-playbook-followup-3

title: 追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如何把这套排障动作沉淀成“前端值班手册”，让新同学也能按步骤执行
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作, 追问]
parent: linux-network-debug-playbook
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> Linux 方案动作 -> 验证结果」。

### 题目

如果面试官追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如何把这套排障动作沉淀成“前端值班手册”，让新同学也能按步骤执行？

### 答案要点

#### 标准回答（直接作答）

- 结论：先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大
- 机制：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉；用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界
- 落地动作：回答「在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如何把这套排障动作沉淀成“前端值班手册”，让新同学也能按步骤执行」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题默认 前端工程师的 链路已定义超时、重试和幂等规则；若服务端语义不稳定，先补协议契约再谈优化。
- 失败场景：例如网关限流时仍持续重试，前端工程师的 会放大故障并拖垮下游；应立即降级并限制重试窗口。
- 替代方案与取舍：也可吞掉错误换表面成功率，但定位成本极高；当前保留错误语义和回滚开关。

#### 关键细节（可追问）

- 先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大
- 用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉
- 用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界

## release-train-cross-team-gate

title: 跨团队发布列车：依赖冻结窗口、并行联调与止损闸门
difficulty: 资深
tags: [发布治理, 协同, CI/CD]
followups: [release-train-cross-team-gate-followup-1, release-train-cross-team-gate-followup-2, release-train-cross-team-gate-followup-3]

### 一句话

多团队并行交付时，发布事故往往不是“代码有错”，而是“协同失序”：要靠发布列车机制把依赖节奏、冻结窗口和止损阈值前置。

### 题目

一个大型前端平台有 6 个业务团队共享组件库和 BFF，每周固定两次发布。你会如何设计跨团队发布列车，既保证交付速度又控制联动风险？

### 答案要点

- 先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点。
- 依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道。
- 联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块。
- 门禁不仅看构建通过，还要看跨团队契约测试、端到端冒烟、关键指标基线是否退化。
- 事故止损要有统一指挥：谁有权暂停列车、谁批准放量、谁触发回滚要提前明确。
- 每次发布后复盘“计划偏差”：延期原因、冲突类型、回滚触发条件沉淀为下一轮治理规则。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」时要先定义 跨团队发布列车 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，跨团队发布列车 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 跨团队发布列车 关键链路先收敛再替换。

### 代码示例

```yaml
release_train:
  cutoff: 'Tue 16:00'
  freeze: 'Wed 10:00'
  canary: 'Wed 14:00'
  full_rollout: 'Thu 11:00'
  rollback_guard_minutes: 30
```

```ts
type GateResult = { contractPass: boolean; smokePass: boolean; kpiRegression: boolean };

function canDepartTrain(g: GateResult) {
  return g.contractPass && g.smokePass && !g.kpiRegression;
}
```

### 追问

- 「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 把发布列车当会议流程，不把门禁阈值和责任边界落到系统里。
- 冻结窗口只冻代码不冻依赖，临发版仍引入高风险变更。
- 灰度异常后缺少统一决策机制，团队各自止血导致扩大影响面。

### 延伸

- 可将发布列车状态接入 ChatOps，让风险和阻塞透明化。
- 建议维护“跨团队高风险变更清单”，提前预约联调资源。

## layered-rollback-runbook

title: 分层回滚手册：包版本、配置开关与基础设施如何协同回退
difficulty: 资深
tags: [回滚, 运维协作, 工程治理]
followups: [layered-rollback-runbook-followup-1, layered-rollback-runbook-followup-2, layered-rollback-runbook-followup-3]

### 一句话

真正可执行的回滚不是“一键回到上个版本”，而是按包、应用、配置、网关分层回退，确保每一层都能在可控时间内止损。

### 题目

线上出现高优事故：新发布版本导致部分页面白屏，且同时涉及组件库升级、网关规则变更和 feature flag 调整。你会如何设计分层回滚手册？

### 答案要点

- 先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。
- 每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗。
- 包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议。
- 网关和缓存策略需配套回退：避免代码回退了但 CDN/边缘缓存仍命中新产物。
- 回滚后必须做二次验证：核心链路可用性、错误率回落、关键业务指标恢复到阈值内。
- 复盘要评估“回滚成本”：耗时、误操作、覆盖范围，并把高频问题转化成自动化脚本。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「分层回滚手册：包版本、配置开关与基础设施如何协同回退」时要先定义 分层回滚手册 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，分层回滚手册 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 分层回滚手册 关键链路先收敛再替换。

### 代码示例

```ts
type RollbackLayer = 'feature_flag' | 'gateway_policy' | 'app_release' | 'package_version';

function rollbackOrder(): RollbackLayer[] {
  return ['feature_flag', 'gateway_policy', 'app_release', 'package_version'];
}
```

```bash
# 示例：先切配置，再切版本
pnpm run ops:flag -- --set new_checkout=false
pnpm run ops:deploy -- --version v2026.05.19-rc2
pnpm run ops:purge-cdn -- --tag checkout-page
```

### 追问

- 「分层回滚手册：包版本、配置开关与基础设施如何协同回退」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只有应用层回滚预案，忽略配置与网关层的联动状态。
- 回滚后不做二次验收，误把“错误日志变少”当成“业务已恢复”。
- 没有固定回滚演练，关键时刻靠临场记忆操作。

### 延伸

- 建议将回滚 runbook 接入值班平台，降低夜间事故处理门槛。
- 对高风险域可按季度做“盲演”验证回滚脚本可靠性。

## release-train-cross-team-gate-followup-1

title: 追问：从工程落地角度看，当「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [发布治理, 协同, CI/CD, 追问]
parent: release-train-cross-team-gate
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」在当前约束下为什么成立。；围绕「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」组织答案时，建议按「约束来源 -> 发布治理 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：从工程落地角度看，当「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点
- 机制：依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道；联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块
- 落地动作：回答「从工程落地角度看，当「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点
- 依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道
- 联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块

## release-train-cross-team-gate-followup-2

title: 追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 发布治理 把「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [发布治理, 协同, CI/CD, 追问]
parent: release-train-cross-team-gate
generated: followup-script

### 一句话

推动「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 发布治理 把「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点
- 机制：依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道；联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块
- 落地动作：回答「从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 发布治理 把「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」拆成几段推进，确保每段都能独立验收」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 发布治理 把「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」拆成几段推进，确保每段都能独立验收」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点
- 依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道
- 联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块

## release-train-cross-team-gate-followup-3

title: 追问：在当前团队与业务约束下，要判断「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」值不值得长期维护，你会先盯哪些和 发布治理 相关的核心指标
difficulty: 资深
tags: [发布治理, 协同, CI/CD, 追问]
parent: release-train-cross-team-gate
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」不是只在理想输入下成立。。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」值不值得长期维护，你会先盯哪些和 发布治理 相关的核心指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点
- 机制：依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道；联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块
- 落地动作：回答「在当前团队与业务约束下，要判断「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」值不值得长期维护，你会先盯哪些和 发布治理 相关的核心指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 要判断 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 要判断，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，要判断「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」值不值得长期维护，你会先盯哪些和 发布治理 相关的核心指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点
- 依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道
- 联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块

## layered-rollback-runbook-followup-1

title: 追问：结合真实业务约束，真要把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」推到线上，你会如何围绕 回滚 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [回滚, 运维协作, 工程治理, 追问]
parent: layered-rollback-runbook
generated: followup-script

### 一句话

推动「分层回滚手册：包版本、配置开关与基础设施如何协同回退」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「分层回滚手册：包版本、配置开关与基础设施如何协同回退」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：结合真实业务约束，真要把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」推到线上，你会如何围绕 回滚 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退
- 机制：每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗；包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议
- 落地动作：回答「结合真实业务约束，真要把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」推到线上，你会如何围绕 回滚 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，真要把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」推到线上，你会如何围绕 回滚 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退
- 每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗
- 包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议

## layered-rollback-runbook-followup-2

title: 追问：在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」场景下，你会如何围绕 回滚 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [回滚, 运维协作, 工程治理, 追问]
parent: layered-rollback-runbook
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」讲成只在理想输入下可用。；建议按「输入约束 -> 回滚 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」场景下，你会如何围绕 回滚 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退
- 机制：每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗；包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议
- 落地动作：回答「在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」场景下，你会如何围绕 回滚 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」场景下，你会如何围绕 回滚 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时要先定义 分层回滚手册 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，分层回滚手册 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 分层回滚手册 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退
- 每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗
- 包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议

## layered-rollback-runbook-followup-3

title: 追问：遇到约束变化时，你会如何围绕 回滚 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [回滚, 运维协作, 工程治理, 追问]
parent: layered-rollback-runbook
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 回滚 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：遇到约束变化时，你会如何围绕 回滚 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退
- 机制：每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗；包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议
- 落地动作：回答「遇到约束变化时，你会如何围绕 回滚 拆分方案演进路径，而不是一次性推翻重来」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「遇到约束变化时，你会如何围绕 回滚 拆分方案演进路径，而不是一次性推翻重来」时要先定义 遇到约束变化时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，遇到约束变化时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 遇到约束变化时 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退
- 每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗
- 包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议

## frontend-build-regression-warroom

title: 前端构建回归战情室：包体突增、构建超时与发布止损编排
difficulty: 资深
tags: [构建治理, 发布止损, 战情室]
followups: [frontend-build-regression-warroom-followup-1, frontend-build-regression-warroom-followup-2, frontend-build-regression-warroom-followup-3]

### 一句话

构建回归处理的核心不是“先修哪个插件”，而是“先稳发布，再精确定位回归来源”。

### 题目

某次工具链升级后，CI 构建时长翻倍、主包体积上涨 35%、线上首屏指标开始回退。你会如何组织构建回归战情室，给出止损决策并推进恢复？

### 答案要点

- 先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线。
- 快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位。
- 回退策略分层：优先回退配置和插件版本，必要时回退整套工具链。
- 指标闭环统一：构建耗时、包体增量、关键 Web Vitals 必须同屏联动。
- 跨团队分工清晰：平台组负责定位与修复，业务组负责验证与风险沟通。
- 复盘沉淀“回归清单”：把高频回归模式做成上线前自动检查项。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端构建回归战情室：包体突增、构建超时与发布止损编排」时要先定义 前端构建回归战情室 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端构建回归战情室 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端构建回归战情室 关键链路先收敛再替换。

### 代码示例

```ts
type BuildRegressionSignal = {
  buildTimeDeltaPct: number;
  bundleSizeDeltaPct: number;
  lcpDeltaMs: number;
};

function shouldFreezeRelease(s: BuildRegressionSignal) {
  return s.buildTimeDeltaPct > 60 || s.bundleSizeDeltaPct > 20 || s.lcpDeltaMs > 200;
}
```

```yaml
build_regression_bridge:
  block_when:
    build_time_delta_pct: '> 60'
    bundle_size_delta_pct: '> 20'
    lcp_delta_ms: '> 200'
  require:
    - baseline_diff_report
    - rollback_plan_ready
    - owner_and_eta
  update_interval_min: 10
```

### 追问

- 「前端构建回归战情室：包体突增、构建超时与发布止损编排」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只盯构建耗时，不看产物变化和真实用户体验回归。
- 没有明确冻结规则，导致“边修边发”放大事故半径。
- 修完问题不沉淀检查项，下次升级重复踩坑。

### 延伸

- 可建立“升级前后产物体检”自动报告，作为发布前置闸门。
- 建议维护工具链升级回归样本库，减少定位时间。

## dependency-upgrade-shadow-release-governance

title: 依赖大版本升级治理：影子流水线、兼容契约与回退矩阵
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化]
followups: [dependency-upgrade-shadow-release-governance-followup-1, dependency-upgrade-shadow-release-governance-followup-2, dependency-upgrade-shadow-release-governance-followup-3]

### 一句话

大版本升级真正要治理的不是“改了多少代码”，而是“兼容契约和回退路径是否可执行”。

### 题目

团队计划升级一组核心依赖（例如构建器、路由或状态库）到大版本。你会如何设计影子流水线和回退矩阵，做到“可灰度、可止损、可复盘”？

### 答案要点

- 先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确。
- 建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放。
- 分批推进升级：先低风险业务，再中风险业务，最后核心链路。
- 回退矩阵要先写好：版本组合、配置回退顺序、影响面评估一并固化。
- 决策门槛数据化：通过率、回归率、修复时长到阈值才允许推进。
- 每轮升级都做 ADR：记录取舍理由、失败样本和后续治理计划。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 依赖大版本升级治理 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 依赖大版本升级治理，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type UpgradeReadiness = {
  shadowPassRate: number;
  regressionRate: number;
  rollbackReady: boolean;
};

function canPromoteDependencyUpgrade(u: UpgradeReadiness) {
  return u.shadowPassRate >= 0.98 && u.regressionRate <= 0.01 && u.rollbackReady;
}
```

```yaml
dependency_upgrade_policy:
  stages:
    - shadow_pipeline
    - low_risk_rollout
    - core_path_rollout
  promote_when:
    shadow_pass_rate: '>= 98%'
    regression_rate: '<= 1%'
    rollback_ready: true
  require:
    - compatibility_contract_doc
    - rollback_matrix
    - adr_record
```

### 追问

- 「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做代码适配，不做并行验证，导致上线后暴露行为差异。
- 回退矩阵写在文档里却从未演练，关键时刻不可执行。
- 升级结论只看测试通过率，不看真实业务链路回归。

### 延伸

- 建议把“依赖契约检查”纳入 PR 与 CI 的常驻检查项。
- 可设立季度升级窗口，统一治理跨项目大版本升级成本。

## frontend-build-regression-warroom-followup-1

title: 追问：构建回归事故里你会先验哪些边界条件
difficulty: 资深
tags: [构建治理, 发布止损, 战情室, 追问]
parent: frontend-build-regression-warroom
generated: followup-script

### 一句话

我会先验三件事：回归是否可稳定复现、影响面是否可量化、回退路径是否可执行。；优先核对环境差异（Node 版本、缓存命中、依赖锁定），排除“伪回归”噪声。；在边界未确认前先冻结高风险发布，避免问题扩大到更多业务线。

### 题目

如果面试官追问：构建回归已经发生时，你会先验哪些边界条件，确保后续止损动作不会误伤主线发布？

### 答案要点

#### 标准回答（直接作答）

- 结论：先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线
- 机制：快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位；回退策略分层：优先回退配置和插件版本，必要时回退整套工具链
- 落地动作：回答「构建回归事故里你会先验哪些边界条件」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「构建回归事故里你会先验哪些边界条件」时要先定义 构建回归事故里你会先 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，构建回归事故里你会先 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 构建回归事故里你会先 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线
- 快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位
- 回退策略分层：优先回退配置和插件版本，必要时回退整套工具链

## frontend-build-regression-warroom-followup-2

title: 追问：你会怎么拆分构建回归的短期止损与长期治理
difficulty: 资深
tags: [构建治理, 发布止损, 战情室, 追问]
parent: frontend-build-regression-warroom
generated: followup-script

### 一句话

0-24 小时先止损：冻结发布、回退高风险改动、恢复核心业务产物稳定性。；1 周内做根因闭环：补差异报告、修复配置与依赖、重跑关键回归链路。；1 个月内做机制化：把高频回归规则沉淀成 CI 闸门和升级前检查清单。

### 题目

如果面试官追问：构建回归治理不能只有救火，你会如何拆分短期止损和长期治理节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线
- 机制：快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位；回退策略分层：优先回退配置和插件版本，必要时回退整套工具链
- 落地动作：回答「你会怎么拆分构建回归的短期止损与长期治理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎么拆分构建回归的短期止损与长期治理」时要先定义 你会怎么拆分构建回归 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会怎么拆分构建回归 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会怎么拆分构建回归 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线
- 快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位
- 回退策略分层：优先回退配置和插件版本，必要时回退整套工具链

## frontend-build-regression-warroom-followup-3

title: 追问：长期看哪些指标能证明构建治理在变好
difficulty: 资深
tags: [构建治理, 发布止损, 战情室, 追问]
parent: frontend-build-regression-warroom
generated: followup-script

### 一句话

我会看四类趋势：构建时长稳定性、包体回归率、发布阻塞时长、同类事故复发率。；同时看治理效率：从发现到止损的平均时长是否持续缩短。；若指标长期不改善，就要重构流程而不是继续叠加规则。

### 题目

如果面试官追问：这套构建回归治理是否值得长期维护，你会用哪些核心指标来判断？

### 答案要点

#### 标准回答（直接作答）

- 结论：先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线
- 机制：快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位；回退策略分层：优先回退配置和插件版本，必要时回退整套工具链
- 落地动作：回答「长期看哪些指标能证明构建治理在变好」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 长期看哪些指标能证明 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 长期看哪些指标能证明，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「长期看哪些指标能证明构建治理在变好」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线
- 快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位
- 回退策略分层：优先回退配置和插件版本，必要时回退整套工具链

## dependency-upgrade-shadow-release-governance-followup-1

title: 追问：大版本升级你会如何做灰度和回退设计
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化, 追问]
parent: dependency-upgrade-shadow-release-governance
generated: followup-script

### 一句话

先跑影子流水线，通过后再从低风险业务灰度，最后才进入核心链路。；每一阶段都要绑定明确回退条件：回归率、修复时长、业务指标跌幅任一触线就停。；回退矩阵必须提前演练，确保不是“文档可回退、现场不可回退”。

### 题目

如果面试官追问：大版本升级真要上线时，你会如何设计灰度节奏和回退条件，避免一次性放量翻车？

### 答案要点

#### 标准回答（直接作答）

- 结论：先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确
- 机制：建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放；分批推进升级：先低风险业务，再中风险业务，最后核心链路
- 落地动作：回答「大版本升级你会如何做灰度和回退设计」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 大版本升级你会如何做 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 大版本升级你会如何做，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「大版本升级你会如何做灰度和回退设计」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确
- 建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放
- 分批推进升级：先低风险业务，再中风险业务，最后核心链路

## dependency-upgrade-shadow-release-governance-followup-2

title: 追问：你会怎么搭依赖升级验证面板
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化, 追问]
parent: dependency-upgrade-shadow-release-governance
generated: followup-script

### 一句话

面板至少要有三层：契约破坏指标、影子流水线差异指标、业务回归指标。；指标需要前后对照窗口，避免只看单次发布结论。；结论要可执行：每个指标都要对应“继续推进 / 暂停 / 回退”的动作规则。

### 题目

如果面试官追问：依赖升级方案要持续评估收益，你会怎么搭验证面板，避免被噪声带偏？

### 答案要点

#### 标准回答（直接作答）

- 结论：先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确
- 机制：建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放；分批推进升级：先低风险业务，再中风险业务，最后核心链路
- 落地动作：回答「你会怎么搭依赖升级验证面板」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会怎么搭依赖升级验 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会怎么搭依赖升级验，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你会怎么搭依赖升级验证面板」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确
- 建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放
- 分批推进升级：先低风险业务，再中风险业务，最后核心链路

## dependency-upgrade-shadow-release-governance-followup-3

title: 追问：依赖升级去留决策该看哪几组硬指标
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化, 追问]
parent: dependency-upgrade-shadow-release-governance
generated: followup-script

### 一句话

我会看质量面：契约破坏率、回归率、升级后事故率。；我会看效率面：从发现问题到恢复稳定的平均时长，以及升级迭代周期。；我会看成本面：维护开销是否持续上升，是否挤压业务交付节奏。

### 题目

如果面试官追问：团队要决定这条依赖升级路线继续还是暂停，你会给出哪几组硬指标做依据？

### 答案要点

#### 标准回答（直接作答）

- 结论：先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确
- 机制：建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放；分批推进升级：先低风险业务，再中风险业务，最后核心链路
- 落地动作：回答「依赖升级去留决策该看哪几组硬指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「依赖升级去留决策该看哪几组硬指标」时要先定义 依赖升级去留决策该看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，依赖升级去留决策该看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 依赖升级去留决策该看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确
- 建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放
- 分批推进升级：先低风险业务，再中风险业务，最后核心链路
