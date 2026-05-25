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

回答「Vite 为什么开发快、构建又能稳定」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

请解释 Vite 在 dev 和 build 两个阶段分别做了什么，为什么它的启动体验比传统打包器更快。

### 答案要点

- 开发期基于原生 ESM 按需提供模块，不先把整个项目打成 bundle
- 依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM
- 业务代码按请求即时转换，HMR 粒度细、回流范围小
- 当前稳定版 Vite 的生产构建仍以 Rollup 为核心，负责 chunk 拆分、Tree Shaking 和产物输出

#### 工程化补充

- 场景前提：先定义 Vite 为什么开发快、构建又能稳定 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 Vite 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Vite 的可复现用例、线上监控指标和回退演练记录。

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

讲「Webpack、Rollup、esbuild、SWC 各自擅长什么」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

如何从“应用构建”和“库构建”两个角度对比主流构建工具？

### 答案要点

- Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目
- Rollup 天然偏向 ESM 和库构建，产物更干净
- esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建
- Babel 仍是兼容性和语法变换生态里的重要角色，尤其在复杂插件链、实验语法和细粒度 polyfill 控制场景

#### 工程化补充

- 场景前提：回答 Webpack、Rollup、esbuild、SWC 各自擅长什么 时先锁定 Webpack 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Webpack 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Webpack 的可复现用例、线上监控指标和回退演练记录。

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

讲「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么大型前端团队越来越倾向 pnpm？`peerDependencies` 又是在解决什么问题？

### 答案要点

- pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性
- lockfile 锁定依赖树，保证 CI/本地一致
- peerDependencies 表达“宿主必须提供某依赖且版本要兼容”，常用于插件、组件库、适配器
- overrides（npm/pnpm）或 resolutions（Yarn）可用于强制收敛依赖版本，修复安全漏洞或兼容问题

#### 工程化补充

- 场景前提：落地 npm、yarn、pnpm 与 lockfile、peerDependencies 的本质 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

讲「SemVer、Conventional Commits、Changesets 分别治理什么问题」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么成熟团队会同时引入语义化版本、规范化提交和发布说明工具？这三者各自解决什么问题？

### 答案要点

- SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch
- Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断
- Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明
- 真正重要的不是工具本身，而是团队是否能稳定遵守“什么算 breaking change、谁来审批、如何回滚”

#### 工程化补充

- 场景前提：落地 SemVer、Conventional Commits、Changesets 分别治理什么问题 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

回答「Source Map、Browserslist 与 Polyfill 策略」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

前端为什么需要区分开发 sourcemap、线上 sourcemap，以及“语法降级”和“API polyfill”？

### 答案要点

- sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构
- 语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from
- Browserslist 定义目标环境，构建工具据此决定转译和兼容策略

#### 工程化补充

- 场景前提：先定义 Source Map、Browserslist 与 Polyfill 策略 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 SourceMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SourceMap 的可复现用例、线上监控指标和回退演练记录。

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

讲「Monorepo、workspace、project references 的组合打法」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

什么样的团队适合 Monorepo？pnpm workspace、Turborepo/Nx、TS Project References 各负责哪一层问题？

### 答案要点

- Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队
- workspace 解决依赖链接与本地开发
- Turborepo/Nx 解决任务缓存、增量执行、依赖图调度
- TS Project References 解决类型增量编译和大型项目编辑器性能

#### 工程化补充

- 场景前提：回答 Monorepo、workspace、project references 的组合打法 时要明确 Monorepo 在高并发和错误恢复下的表现。
- 失败风险：常见风险是事件循环阻塞与资源未释放，导致吞吐退化。
- 验收信号：验收至少看事件循环延迟、吞吐和资源占用趋势。

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

回答「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

代码质量工具应该如何分层，避免“本地一套、CI 一套”的混乱？

### 答案要点

- Prettier 负责格式，不负责业务正确性
- ESLint 负责可疑模式、最佳实践和团队约束
- Stylelint 负责样式层一致性与可疑模式；commitlint 则更偏提交语义治理
- Husky + lint-staged 把高频、快速检查前置到提交前

#### 工程化补充

- 场景前提：ESLint、Prettier、Husky、lint-staged、CI 的职责边界 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

讲「前端库的产物设计：ESM/CJS/types/exports/sideEffects」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

如果你要发布一个前端工具库，`package.json` 里最关键的几个字段该怎么设计？

### 答案要点

- 明确入口：exports、types、必要时 main/module
- 标注 Tree Shaking 语义：sideEffects
- 提供子路径导出时，要确保运行时代码和类型定义都能对上
- 产物通常至少包括 ESM 和类型声明；是否保留 CJS 取决于目标使用方

#### 工程化补充

- 场景前提：落地 前端库的产物设计：ESM/CJS/types/exports/sideEffects 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题的高分关键是把 Webpack 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

Module Federation 为什么会被称为微前端的重要能力？它真正解决了什么，又带来了什么新复杂度？

### 答案要点

- Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构
- 核心角色通常包括 host、remote、shared 依赖，以及远程容器入口
- 它解决的是“独立发布 + 运行时共享代码”的问题，而不是自动消除架构边界成本
- 新复杂度主要在版本兼容、共享依赖策略、错误隔离、远程加载失败、类型同步和运行时可观测性

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

讲「exports、subpath imports 与现代包入口设计」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么现代包更推荐用 `exports` 管理公开入口？`imports` 和子路径导入又适合什么场景？

### 答案要点

- exports 明确包的公开 API 面，能限制未声明路径被直接 import
- 子路径导出适合暴露稳定的细粒度入口，如 pkg/button、pkg/server
- imports 更偏包内部别名和条件映射，通常服务于包自身源码组织
- 一旦引入条件导出（如 browser/node/import/require），就要格外注意类型声明和运行时入口保持一致

#### 工程化补充

- 场景前提：回答 exports、subpath imports 与现代包入口设计 时先锁定 package.json 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 package.json 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 package.json 的可复现用例、线上监控指标和回退演练记录。

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

这题的高分关键是把 CI 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端 CI 为什么经常既慢又不稳定？缓存和矩阵构建该怎么设计才靠谱？

### 答案要点

- 常见瓶颈在依赖安装、浏览器下载、构建产物分析、E2E 启动与等待
- 缓存要围绕 lockfile、包管理器 store、测试浏览器和构建中间产物设计，避免缓存污染
- 矩阵构建适合多 Node 版本、多操作系统或多浏览器验证，但不该无脑展开
- 门禁应分层：PR 快速反馈优先，重型任务可放主干或定时流水线

#### 工程化补充

- 场景前提：CI/CD 缓存、矩阵构建与门禁设计 只有在瓶颈被数据证实时才值得推进；先确认 CI 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 CI/CD 缓存、矩阵构建与门禁设计 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

这题的高分关键是把 Monorepo 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

一个仓库里有几十个 package，怎么处理版本号、CHANGELOG 和发布顺序？

### 答案要点

- 选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版
- 流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish
- 依赖：被依赖的包先发版，依赖方自动升 caret 范围
- Changelog：自动生成 + 人工补充重要说明，遵循 Conventional Commits

#### 工程化补充

- 场景前提：落地 Monorepo 多包发版（Changesets / Nx Release / Turborepo） 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

这题的高分关键是把 打包工具 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

打包器都在做什么？为什么 Vite 在 dev 上能秒开，prod 却仍然要打包？

### 答案要点

- 打包器三件事：依赖图分析、转换、产出 bundle
- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包
- Vite：开发模式下用 esbuild 预构建依赖 + 浏览器原生 ESM 直接加载；生产仍 Rollup

#### 工程化补充

- 场景前提：回答 Webpack / Rollup / Vite / Rolldown / Turbopack 比较 时先锁定 打包工具 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 打包工具 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 打包工具 的可复现用例、线上监控指标和回退演练记录。

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

这题回答要覆盖 Webpack 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请说明 Webpack 与 Vite 在开发服务器与生产构建上的工作原理差异。

### 答案要点

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块
- Webpack：可定制度极高，loader / plugin 生态最丰富
- Vite：底层用 Rollup 打包，输出更精简；生态接近 Webpack 但仍在追赶

#### 工程化补充

- 场景前提：先定义 Webpack 与 Vite 在开发态、构建态的差异 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 Webpack 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Webpack 的可复现用例、线上监控指标和回退演练记录。

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

讲「Webpack → Vite 迁移的工程痛点与落地策略」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

团队的项目从 Webpack 5 迁移到 Vite，你们遇到了哪些痛点？是怎么解决的？

### 答案要点

- CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob
- 第三方 CJS 包：用 optimizeDeps.include / ssr.noExternal 让 esbuild 预构建为 ESM；某些 lib 需 patch（patch-package）
- CSS / 资源处理差异：
- postcss 配置兼容但语法可能不同

#### 工程化补充

- 场景前提：落地 Webpack → Vite 迁移的工程痛点与落地策略 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

讲「为什么 Vite 比 Webpack 快？快在哪里」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么 Vite 比 Webpack 快？是 dev 快还是 prod 快？快在哪里？

### 答案要点

- Dev 阶段（Vite 显著快）
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk
- 依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）
- 源码不预打包，直接走 ，浏览器请求 → Vite 按文件按需 transform（svelte/vue/jsx）→ 304 缓存

#### 工程化补充

- 场景前提：回答 为什么 Vite 比 Webpack 快？快在哪里 时先锁定 Vite 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Vite 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Vite 的可复现用例、线上监控指标和回退演练记录。

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

这题的高分关键是把 Vite 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你提到 Vite 底层有用 Go 编写的部分，具体是哪部分？Vite 7 / Rolldown 这些新东西你了解吗？

### 答案要点

- Go 部分：esbuild
- esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform
- Vite 用 esbuild 来：
- 依赖预构建：把 node_modules 里的 CJS / ESM 都转成统一 ESM，砍掉冗余 import

#### 工程化补充

- 场景前提：回答 Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化 时先锁定 Vite 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Vite 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Vite 的可复现用例、线上监控指标和回退演练记录。

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

这题的高分关键是把 配置 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你提到通过配置文件生成路径映射和别名，减少人工维护成本，具体怎么做的？是不是解析 tsconfig 然后映射到 webpack 配置？用 Node.js 实现？

### 答案要点

- 同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）
- 任一处忘改 → IDE 跳转/构建/lint 中至少一个挂
- 统一来源：tsconfig.json
- 让 tsc 的 paths 成为 single source of truth

#### 工程化补充

- 场景前提：回答 通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack） 时要明确 配置 在高并发和错误恢复下的表现。
- 实施步骤：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要交代事件循环影响、资源释放和错误恢复策略。
- 失败风险：常见风险是事件循环阻塞与资源未释放，导致吞吐退化。
- 验收信号：验收至少看事件循环延迟、吞吐和资源占用趋势。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Vite 为什么开发快、构建又能稳定」场景下，真要把「Vite 为什么开发快、构建又能稳定」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「Vite 为什么开发快、构建又能稳定」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：围绕 构建又能稳定 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Vite：当前稳定版 Vite 的生产构建仍以 Rollup 为核心，负责 chunk 拆分、Tree Shaking 和产物输出。
- 构建：依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM。

#### 风险与验收

- 主要风险：构建又能稳定 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 构建又能稳定 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## vite-principle-followup-2

title: 追问：在当前团队与业务约束下，你会怎样围绕 Vite 拆分「Vite 为什么开发快、构建又能稳定」的推进节奏，兼顾短期交付和长期治理
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎样围绕 Vite 拆分「Vite 为什么开发快、构建又能稳定」的推进节奏，兼顾短期交付和长期治理？

### 答案要点

#### 直答

- 结论：先把 构建又能稳定 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 构建又能稳定 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Vite：当前稳定版 Vite 的生产构建仍以 Rollup 为核心，负责 chunk 拆分、Tree Shaking 和产物输出。
- 构建：依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM。

#### 风险与验收

- 主要风险：构建又能稳定 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「Vite 为什么开发快、构建又能稳定」里 构建又能稳定 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## vite-principle-followup-3

title: 追问：围绕「Vite 为什么开发快、构建又能稳定」做去留决策，你会拿哪些指标说服团队
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「Vite 为什么开发快、构建又能稳定」做去留决策，你会拿哪些指标说服团队？

### 答案要点

#### 直答

- 结论：验证 构建又能稳定 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「Vite 为什么开发快、构建又能稳定」里的 构建又能稳定 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Vite：当前稳定版 Vite 的生产构建仍以 Rollup 为核心，负责 chunk 拆分、Tree Shaking 和产物输出。
- 构建：依赖预构建通常用 esbuild，把 CJS/多文件依赖转换成更适合浏览器消费的 ESM。

#### 风险与验收

- 主要风险：在「Vite 为什么开发快、构建又能稳定」里，构建又能稳定 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Vite 为什么开发快、构建又能稳定」里，构建又能稳定 至少要给一组指标阈值、一条日志证据和一组测试结果。

## bundler-ecosystem-followup-1

title: 追问：围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「Webpack、Rollup、esbuild、SWC 各自擅长什么」做方案评审时，哪些 Webpack 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先画出 Webpack 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 Webpack 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Webpack：Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目。
- Rollup：Rollup 天然偏向 ESM 和库构建，产物更干净。
- esbuild：esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建。

#### 风险与验收

- 主要风险：Webpack 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Webpack、Rollup、esbuild、SWC 各自擅长什么」里，验收 Webpack 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## package-manager-followup-1

title: 追问：在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」场景下，真要把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」推到线上，你会如何围绕 pnpm 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」场景下，真要把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」推到线上，你会如何围绕 pnpm 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：npm 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- npm：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性。
- yarn：在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」里，yarn 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- pnpm：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性。

#### 风险与验收

- 主要风险：若 npm 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：发布验收至少看 npm 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## semver-commit-governance-followup-1

title: 追问：从工程落地角度看，真要把「SemVer、Conventional Commits、Changesets 分别治理什么问题」推到线上，你会如何围绕 SemVer 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，真要把「SemVer、Conventional Commits、Changesets 分别治理什么问题」推到线上，你会如何围绕 SemVer 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「SemVer、Conventional Commits、Changesets 分别治理什么问题」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：真正重要的不是工具本身，而是团队是否能稳定遵守“什么算 breaking change、谁来审批、如何回滚”。

#### 术语解释

- SemVer：SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch。
- Conventional Commits：Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断。
- Changesets：Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明。

#### 风险与验收

- 主要风险：SemVer 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 SemVer 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## source-map-polyfill-followup-1

title: 追问：如果要评估「Source Map、Browserslist 与 Polyfill 策略」的落地风险，你会优先检查哪些 SourceMap 约束是否成立
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「Source Map、Browserslist 与 Polyfill 策略」的落地风险，你会优先检查哪些 SourceMap 约束是否成立？

### 答案要点

#### 直答

- 结论：先列「Source Map、Browserslist 与 Polyfill 策略」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先识别 Source Map 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- Source Map：Source Map 是「Source Map、Browserslist 与 Polyfill 策略」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- Browserslist：Browserslist 定义目标环境，构建工具据此决定转译和兼容策略。
- Polyfill：Polyfill 是「Source Map、Browserslist 与 Polyfill 策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from。
- 验收信号：围绕 Source Map 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## monorepo-followup-1

title: 追问：结合真实业务约束，面对真实流量和复杂依赖时，「Monorepo、workspace、project references 的组合打法」最可能被哪些 Monorepo 边界条件击穿
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，面对真实流量和复杂依赖时，「Monorepo、workspace、project references 的组合打法」最可能被哪些 Monorepo 边界条件击穿？

### 答案要点

#### 直答

- 结论：「Monorepo、workspace、project references 的组合打法」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。
- 关键动作：围绕 Monorepo 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- Monorepo：Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队。
- workspace：workspace 解决依赖链接与本地开发。
- project references：围绕「Monorepo、workspace、project references 的组合打法」里的 project references 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：Monorepo 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：Monorepo 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## lint-ci-followup-1

title: 追问：围绕「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」做迁移时，你会怎样拆分批次，降低回滚风险
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」做迁移时，你会怎样拆分批次，降低回滚风险？

### 答案要点

#### 直答

- 结论：先让 ESLint 走小流量灰度，观察成功率与告警，再决定是否继续扩量。
- 关键动作：围绕 ESLint 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- ESLint：ESLint 负责可疑模式、最佳实践和团队约束。
- Prettier：Prettier 负责格式，不负责业务正确性。
- Husky：Husky + lint-staged 把高频、快速检查前置到提交前。

#### 风险与验收

- 主要风险：围绕 ESLint 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 ESLint 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## package-publishing-followup-1

title: 追问：结合真实业务约束，真要把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：先小流量验证「前端库的产物设计：ESM/CJS/types/exports/sideEffects」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：前端库的产物设计 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- 发布：围绕「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的 发布 推进上线时，要明确每个批次的放量门槛和回退条件。
- 包设计：围绕「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的 包设计 推进上线时，要明确每个批次的放量门槛和回退条件。
- ESM/CJS/types/expor：ESM/CJS/types/expor 是「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：前端库的产物设计 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 前端库的产物设计 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## webpack-module-federation-followup-1

title: 追问：从工程落地角度看，当「Webpack 5 Module Federation 的价值与边界」跨团队落地时，你会先确认哪些 Webpack 前置假设，避免后续返工
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「Webpack 5 Module Federation 的价值与边界」跨团队落地时，你会先确认哪些 Webpack 前置假设，避免后续返工？

### 答案要点

#### 直答

- 结论：先画出 Webpack 5 Module Federation 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 Webpack 5 Module Federation 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Webpack：Webpack 是「Webpack 5 Module Federation 的价值与边界」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Module Federation：Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构。
- ModuleFederation：ModuleFederation 是「Webpack 5 Module Federation 的价值与边界」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Webpack 5 Module Federation 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Webpack 5 Module Federation 的价值与边界」里，验收 Webpack 5 Module Federation 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## exports-subpath-followup-1

title: 追问：在当前团队与业务约束下，真要把「exports、subpath imports 与现代包入口设计」推到线上，你会如何围绕 package.json 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「exports、subpath imports 与现代包入口设计」推到线上，你会如何围绕 package.json 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「exports、subpath imports 与现代包入口设计」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：围绕 exports 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- exports：exports 明确包的公开 API 面，能限制未声明路径被直接 import。
- subpath imports：在「exports、subpath imports 与现代包入口设计」里，subpath imports 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- package.json：围绕「exports、subpath imports 与现代包入口设计」里的 package.json 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：exports 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：发布验收至少看 exports 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## ci-cd-cache-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 CI 相关的指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 CI 相关的指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 CI/CD 缓存 矩阵构建与门禁设计 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先统一 CI/CD 缓存 矩阵构建与门禁设计 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- CI/CD：CI/CD 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CI：CI 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- GitHubActions：GitHubActions 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「CI/CD 缓存、矩阵构建与门禁设计」里，CI/CD 缓存 矩阵构建与门禁设计 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：CI/CD 缓存 矩阵构建与门禁设计 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## monorepo-changesets-followup-1

title: 追问：在真实业务里落地「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时，你会先排查哪些与 Monorepo 相关的边界假设
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在真实业务里落地「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」时，你会先排查哪些与 Monorepo 相关的边界假设？

### 答案要点

#### 直答

- 结论：先排查 Monorepo 多包发版（Changesets 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先梳理 Monorepo 多包发版（Changesets 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Monorepo：Monorepo 是「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Changesets：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版。
- Nx Release：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版。

#### 风险与验收

- 主要风险：围绕 Monorepo 多包发版（Changesets 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Monorepo 多包发版（Changesets 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## bundler-deep-followup-1

title: 追问：围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」做方案评审时，哪些 打包工具 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 结论：先梳理 Webpack 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 Webpack 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好。
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包。
- Vite：开发模式下用 esbuild 预构建依赖 + 浏览器原生 ESM 直接加载；生产仍 Rollup。

#### 风险与验收

- 主要风险：围绕 Webpack 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Webpack 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## webpack-vs-vite-followup-1

title: 追问：从工程落地角度看，真要把「Webpack 与 Vite 在开发态、构建态的差异」推到线上，你会如何围绕 Webpack 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，真要把「Webpack 与 Vite 在开发态、构建态的差异」推到线上，你会如何围绕 Webpack 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：把「Webpack 与 Vite 在开发态、构建态的差异」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。
- 关键动作：围绕 Webpack 与 Vite 在开发态 构建态的差异 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢。
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块。
- 构建：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块。

#### 风险与验收

- 主要风险：Webpack 与 Vite 在开发态 构建态的差异 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：发布验收至少看 Webpack 与 Vite 在开发态 构建态的差异 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## webpack-to-vite-migration-followup-1

title: 追问：从工程落地角度看，真要把「Webpack → Vite 迁移的工程痛点与落地策略」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，真要把「Webpack → Vite 迁移的工程痛点与落地策略」推到线上，你会如何围绕 Vite 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「Webpack → Vite 迁移的工程痛点与落地策略」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：围绕 Webpack → Vite 迁移的工程痛点与落地策略 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。

#### 术语解释

- Webpack：Webpack 是「Webpack → Vite 迁移的工程痛点与落地策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Vite：CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob。
- 迁移：围绕「Webpack → Vite 迁移的工程痛点与落地策略」里的 迁移 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：Webpack → Vite 迁移的工程痛点与落地策略 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 Webpack → Vite 迁移的工程痛点与落地策略 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## webpack-to-vite-migration-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 Vite 安排「Webpack → Vite 迁移的工程痛点与落地策略」的渐进改造路线
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 Vite 安排「Webpack → Vite 迁移的工程痛点与落地策略」的渐进改造路线？

### 答案要点

#### 直答

- 结论：先把 Webpack → Vite 迁移的工程痛点与落地策略 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「Webpack → Vite 迁移的工程痛点与落地策略」里的 Webpack → Vite 迁移的工程痛点与落地策略 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Webpack：Webpack 是「Webpack → Vite 迁移的工程痛点与落地策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Vite：CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob。
- 迁移：围绕「Webpack → Vite 迁移的工程痛点与落地策略」里的 迁移 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：Webpack → Vite 迁移的工程痛点与落地策略 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：Webpack → Vite 迁移的工程痛点与落地策略 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## webpack-to-vite-migration-followup-3

title: 追问：评估「Webpack → Vite 迁移的工程痛点与落地策略」长期维护价值时，你最看重哪些稳定性和效率信号
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：评估「Webpack → Vite 迁移的工程痛点与落地策略」长期维护价值时，你最看重哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：验证 Webpack → Vite 迁移的工程痛点与落地策略 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「Webpack → Vite 迁移的工程痛点与落地策略」里的 Webpack → Vite 迁移的工程痛点与落地策略 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Webpack：Webpack 是「Webpack → Vite 迁移的工程痛点与落地策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Vite：CommonJS / 动态 require：Vite 默认 ESM，require(...) / require.context 直接报错；要换 import.meta.glob。
- 迁移：在「Webpack → Vite 迁移的工程痛点与落地策略」里，迁移 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「Webpack → Vite 迁移的工程痛点与落地策略」里，Webpack → Vite 迁移的工程痛点与落地策略 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Webpack → Vite 迁移的工程痛点与落地策略」里，Webpack → Vite 迁移的工程痛点与落地策略 至少要给一组指标阈值、一条日志证据和一组测试结果。

## vite-vs-webpack-deep-followup-1

title: 追问：以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「为什么 Vite 比 Webpack 快？快在哪里」为例，在真实业务里落地「为什么 Vite 比 Webpack 快？快在哪里」时，你会先排查哪些与 Vite 相关的边界假设？

### 答案要点

#### 直答

- 结论：先排查 Vite 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：先梳理 Vite 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Vite：Dev 阶段（Vite 显著快）。
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk。

#### 风险与验收

- 主要风险：在「为什么 Vite 比 Webpack 快？快在哪里」里，Vite 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Vite 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## vite-go-and-rolldown-followup-1

title: 追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」进入长周期维护后，你会重点巡检哪些与 Vite 相关的高风险边界点
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」进入长周期维护后，你会重点巡检哪些与 Vite 相关的高风险边界点？

### 答案要点

#### 直答

- 结论：先列出 Rolldown 与 Vite 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先识别 Rolldown 与 Vite 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- Vite：Vite 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Go：Go 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Rolldown：Rolldown 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Rolldown 与 Vite 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：Rolldown 与 Vite 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## tsconfig-paths-to-bundler-alias-followup-1

title: 追问：把「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」放到真实业务里，围绕 配置 最容易被低估的边界条件和前置约束是什么
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：把「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」放到真实业务里，围绕 配置 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 结论：上线 通过配置文件生成路径映射 / 别名 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先识别 通过配置文件生成路径映射 / 别名 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- tsconfig：tsconfig.json。
- vite/webpack：围绕「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」里的 vite/webpack 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 配置：在「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」里，配置 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 通过配置文件生成路径映射 / 别名 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：围绕 通过配置文件生成路径映射 / 别名 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## package-manager-followup-2

title: 追问：结合真实业务约束，如果部分模块技术债很重，你会如何围绕 pnpm 调整「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」的分阶段策略
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果部分模块技术债很重，你会如何围绕 pnpm 调整「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」的分阶段策略？

### 答案要点

#### 直答

- 结论：把 npm 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先梳理 npm 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- npm：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性。
- yarn：围绕「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」里的 yarn 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- pnpm：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性。

#### 风险与验收

- 主要风险：npm 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」里 npm 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## package-manager-followup-3

title: 追问：你会如何用可观测数据衡量「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」在 pnpm 上的维护成本和收益平衡
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何用可观测数据衡量「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」在 pnpm 上的维护成本和收益平衡？

### 答案要点

#### 直答

- 结论：验证 npm 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 npm 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- npm：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性。
- yarn：围绕「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」里的 yarn 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- pnpm：pnpm 通过内容寻址存储和符号链接减少磁盘占用、提升安装一致性。

#### 风险与验收

- 主要风险：在「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」里，npm 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：npm 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## semver-commit-governance-followup-2

title: 追问：在当前团队与业务约束下，面对跨团队协作成本，你会如何围绕 SemVer 规划「SemVer、Conventional Commits、Changesets 分别治理什么问题」的阶段目标与交付边界
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，面对跨团队协作成本，你会如何围绕 SemVer 规划「SemVer、Conventional Commits、Changesets 分别治理什么问题」的阶段目标与交付边界？

### 答案要点

#### 直答

- 结论：SemVer 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：真正重要的不是工具本身，而是团队是否能稳定遵守“什么算 breaking change、谁来审批、如何回滚”。

#### 术语解释

- SemVer：SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch。
- Conventional Commits：Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断。
- Changesets：Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明。

#### 风险与验收

- 主要风险：围绕 SemVer 取舍不量化时，常见风险是短期收益被长期维护成本抵消。
- 验收信号：验收看 SemVer 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## semver-commit-governance-followup-3

title: 追问：从工程落地角度看，为了确认「SemVer、Conventional Commits、Changesets 分别治理什么问题」在 SemVer 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，为了确认「SemVer、Conventional Commits、Changesets 分别治理什么问题」在 SemVer 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：把 SemVer 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：真正重要的不是工具本身，而是团队是否能稳定遵守“什么算 breaking change、谁来审批、如何回滚”。

#### 术语解释

- SemVer：SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch。
- Conventional Commits：Conventional Commits 统一提交语义，让变更历史更易检索，也便于自动生成 changelog 和发布流程判断。
- Changesets：Changesets / semantic-release 等工具负责把“提交与版本策略”落到实际发布动作上，减少人工漏改版本和漏写变更说明。

#### 风险与验收

- 主要风险：在「SemVer、Conventional Commits、Changesets 分别治理什么问题」里，SemVer 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「SemVer、Conventional Commits、Changesets 分别治理什么问题」里，SemVer 至少要给一组指标阈值、一条日志证据和一组测试结果。

## lint-ci-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 规范 定义「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」的先后改造顺序
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 规范 定义「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」的先后改造顺序？

### 答案要点

#### 直答

- 结论：把 ESLint 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：把「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」里的 ESLint 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- ESLint：ESLint 负责可疑模式、最佳实践和团队约束。
- Prettier：Prettier 负责格式，不负责业务正确性。
- Husky：Husky + lint-staged 把高频、快速检查前置到提交前。

#### 风险与验收

- 主要风险：在「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」里，ESLint 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：ESLint 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## lint-ci-followup-3

title: 追问：以「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」为例，你会如何用可观测数据衡量「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」在 规范 上的维护成本和收益平衡
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」为例，你会如何用可观测数据衡量「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」在 规范 上的维护成本和收益平衡？

### 答案要点

#### 直答

- 结论：把 ESLint 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 ESLint 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- ESLint：ESLint 负责可疑模式、最佳实践和团队约束。
- Prettier：Prettier 负责格式，不负责业务正确性。
- Husky：Husky + lint-staged 把高频、快速检查前置到提交前。

#### 风险与验收

- 主要风险：若 ESLint 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：ESLint 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## package-publishing-followup-2

title: 追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，当团队成熟度不一致时，你会如何围绕 发布 定义「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的先后改造顺序
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，当团队成熟度不一致时，你会如何围绕 发布 定义「前端库的产物设计：ESM/CJS/types/exports/sideEffects」的先后改造顺序？

### 答案要点

#### 直答

- 结论：前端库的产物设计 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。
- 关键动作：前端库的产物设计 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- 发布：围绕「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的 发布 推进上线时，要明确每个批次的放量门槛和回退条件。
- 包设计：围绕「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的 包设计 推进上线时，要明确每个批次的放量门槛和回退条件。
- ESM/CJS/types/expor：ESM/CJS/types/expor 是「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：围绕 前端库的产物设计 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：发布验收至少看 前端库的产物设计 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## package-publishing-followup-3

title: 追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，半年后要做去留决策时，你会拿哪些数据判断「前端库的产物设计：ESM/CJS/types/exports/sideEffects」还值不值得继续维护
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端库的产物设计：ESM/CJS/types/exports/sideEffects」为例，半年后要做去留决策时，你会拿哪些数据判断「前端库的产物设计：ESM/CJS/types/exports/sideEffects」还值不值得继续维护？

### 答案要点

#### 直答

- 结论：先锁定 前端库的产物设计 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 前端库的产物设计 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 发布：围绕「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的 发布 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 包设计：围绕「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的 包设计 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- ESM/CJS/types/expor：ESM/CJS/types/expor 是「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：前端库的产物设计 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「前端库的产物设计：ESM/CJS/types/exports/sideEffects」里，验收 前端库的产物设计 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## exports-subpath-followup-2

title: 追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 package.json 规划「exports、subpath imports 与现代包入口设计」的阶段目标与交付边界
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，面对跨团队协作成本，你会如何围绕 package.json 规划「exports、subpath imports 与现代包入口设计」的阶段目标与交付边界？

### 答案要点

#### 直答

- 结论：exports 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先排查 exports 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- exports：exports 明确包的公开 API 面，能限制未声明路径被直接 import。
- subpath imports：在「exports、subpath imports 与现代包入口设计」里，subpath imports 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- package.json：围绕「exports、subpath imports 与现代包入口设计」里的 package.json 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 exports 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：验收看 exports 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。

## exports-subpath-followup-3

title: 追问：在当前团队与业务约束下，为了确认「exports、subpath imports 与现代包入口设计」在 package.json 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「exports、subpath imports 与现代包入口设计」在 package.json 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 结论：先定义 exports 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先定义 exports 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- exports：exports 明确包的公开 API 面，能限制未声明路径被直接 import。
- subpath imports：在「exports、subpath imports 与现代包入口设计」里，subpath imports 是验收对象，必须给可量化指标、日志信号和测试证据。
- package.json：围绕「exports、subpath imports 与现代包入口设计」里的 package.json 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：exports 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「exports、subpath imports 与现代包入口设计」里，exports 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## ci-cd-cache-followup-2

title: 追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，要证明「CI/CD 缓存、矩阵构建与门禁设计」确实改善体验，你会如何围绕 CI 设计线上观测与对照验证
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，要证明「CI/CD 缓存、矩阵构建与门禁设计」确实改善体验，你会如何围绕 CI 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 CI/CD 缓存 矩阵构建与门禁设计 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先把「CI/CD 缓存、矩阵构建与门禁设计」里的 CI/CD 缓存 矩阵构建与门禁设计 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- CI/CD：CI/CD 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CI：CI 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- GitHubActions：GitHubActions 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「CI/CD 缓存、矩阵构建与门禁设计」里，CI/CD 缓存 矩阵构建与门禁设计 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「CI/CD 缓存、矩阵构建与门禁设计」里，CI/CD 缓存 矩阵构建与门禁设计 至少要给一组指标阈值、一条日志证据和一组测试结果。

## ci-cd-cache-followup-3

title: 追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，如果「CI/CD 缓存、矩阵构建与门禁设计」优化需要额外工程投入，你会如何证明这笔成本值得支付
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「CI/CD 缓存、矩阵构建与门禁设计」为例，如果「CI/CD 缓存、矩阵构建与门禁设计」优化需要额外工程投入，你会如何证明这笔成本值得支付？

### 答案要点

#### 直答

- 结论：验证 CI/CD 缓存 矩阵构建与门禁设计 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 CI/CD 缓存 矩阵构建与门禁设计 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- CI/CD：CI/CD 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- CI：CI 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- GitHubActions：GitHubActions 是「CI/CD 缓存、矩阵构建与门禁设计」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：CI/CD 缓存 矩阵构建与门禁设计 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「CI/CD 缓存、矩阵构建与门禁设计」里，CI/CD 缓存 矩阵构建与门禁设计 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## webpack-vs-vite-followup-2

title: 追问：以「Webpack 与 Vite 在开发态、构建态的差异」为例，如果部分模块技术债很重，你会如何围绕 Webpack 调整「Webpack 与 Vite 在开发态、构建态的差异」的分阶段策略
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Webpack 与 Vite 在开发态、构建态的差异」为例，如果部分模块技术债很重，你会如何围绕 Webpack 调整「Webpack 与 Vite 在开发态、构建态的差异」的分阶段策略？

### 答案要点

#### 直答

- 结论：把 Webpack 与 Vite 在开发态 构建态的差异 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先定位 Webpack 与 Vite 在开发态 构建态的差异 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢。
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块。
- 构建：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块。

#### 风险与验收

- 主要风险：在「Webpack 与 Vite 在开发态、构建态的差异」场景下，Webpack 与 Vite 在开发态 构建态的差异 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「Webpack 与 Vite 在开发态、构建态的差异」里，Webpack 与 Vite 在开发态 构建态的差异 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## webpack-vs-vite-followup-3

title: 追问：结合真实业务约束，如果「Webpack 与 Vite 在开发态、构建态的差异」进入维护期，你会优先围绕 Webpack 监控哪些指标来预警风险
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果「Webpack 与 Vite 在开发态、构建态的差异」进入维护期，你会优先围绕 Webpack 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 结论：验证 Webpack 与 Vite 在开发态 构建态的差异 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先把「Webpack 与 Vite 在开发态、构建态的差异」里的 Webpack 与 Vite 在开发态 构建态的差异 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Webpack：启动时 bundle 整个项目，HMR 走 webpack-dev-server；项目越大启动越慢。
- Vite：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块。
- 构建：用 esbuild 预构建第三方依赖（200x 快），源代码直接以 ESM 形式按需加载，浏览器请求到再编译；HMR 只重传改动模块。

#### 风险与验收

- 主要风险：在「Webpack 与 Vite 在开发态、构建态的差异」里，Webpack 与 Vite 在开发态 构建态的差异 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Webpack 与 Vite 在开发态、构建态的差异」里，Webpack 与 Vite 在开发态 构建态的差异 至少要给一组指标阈值、一条日志证据和一组测试结果。

## vite-vs-webpack-deep-followup-2

title: 追问：结合真实业务约束，Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，Go 原生并发；汇编级解析器；不做 babel 那种 plugin AST 多次重写；牺牲了部分语法兼容性？

### 答案要点

#### 直答

- 结论：先把 Vite 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 Vite 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Vite：Dev 阶段（Vite 显著快）。
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk。
- Go：依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）。

#### 风险与验收

- 主要风险：在「为什么 Vite 比 Webpack 快？快在哪里」里，Vite 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：Vite 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## vite-vs-webpack-deep-followup-3

title: 追问：从工程落地角度看，Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，Vite 用 esbuild 处理依赖，为什么源码不也用 esbuild 而是各自插件？

### 答案要点

#### 直答

- 结论：esbuild 适合快编译，但生产构建还需要成熟插件生态、产物优化与兼容控制，所以通常由 Rollup 或 Rolldown 承担。
- 关键动作：先复盘 Vite 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- Vite：Dev 阶段（Vite 显著快）。
- Webpack：先把所有 source + 依赖打成 bundle → 启 dev server → 改文件全量重打 / HMR 重新构建受影响 chunk。
- esbuild：依赖用 esbuild 预构建（Go，并发原生编译，cold 几百到几千 ms）。

#### 风险与验收

- 主要风险：若 Vite 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：围绕 Vite 归因结果至少给复现步骤、日志证据和回归指标，防止误判。

## vite-go-and-rolldown-followup-2

title: 追问：结合真实业务约束，大部分插件兼容；某些钩子和 source map 处理有差异
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，大部分插件兼容（按 plugin API 接入）；某些钩子和 source map 处理有差异？

### 答案要点

#### 直答

- 结论：先锁定 某些钩子 与 source 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先明确 某些钩子 与 source 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Vite：Vite 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- esbuild：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」这题里，esbuild 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- Rolldown：Rolldown 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：某些钩子 与 source 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里，验收 某些钩子 与 source 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## vite-go-and-rolldown-followup-3

title: 追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」场景下，为什么不直接用 esbuild 做 prod？

### 答案要点

#### 直答

- 结论：esbuild 适合快编译，但生产构建还需要成熟插件生态、产物优化与兼容控制，所以通常由 Rollup 或 Rolldown 承担。
- 关键动作：先复盘 Rolldown 与 Vite 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- Vite：Vite 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Go：Go 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Rolldown：Rolldown 是「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 Rolldown 与 Vite 缺少反例验证，容易把偶发结果误判成稳定规律。
- 验收信号：验收要能复现 Rolldown 与 Vite 问题并证明原因链成立，再观察修复后指标是否回归。

## tsconfig-paths-to-bundler-alias-followup-2

title: 追问：从工程落地角度看，根 tsconfig.base.json + 子包 extends；alias 基于 root 解析
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，根 tsconfig.base.json + 子包 extends；alias 基于 root 解析？

### 答案要点

#### 直答

- 结论：先拆分 通过配置文件生成路径映射 与 别名 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 通过配置文件生成路径映射 与 别名 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 配置：围绕「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」里的 配置 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- alias：在「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」这题里，alias 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- monorepo：围绕「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」里的 monorepo 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：在「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」场景下，通过配置文件生成路径映射 与 别名 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」里，通过配置文件生成路径映射 与 别名 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## tsconfig-paths-to-bundler-alias-followup-3

title: 追问：结合真实业务约束，alias 如何和 Node.js 运行时保持一致
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，alias 如何和 Node.js 运行时（如 SSR / vitest）保持一致？

### 答案要点

#### 直答

- 结论：先把 Node.js 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 Node.js 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 配置：在「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」这题里，配置 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- alias：围绕「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」里的 alias 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- monorepo：在「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」这题里，monorepo 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：Node.js 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：Node.js 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## bundler-ecosystem-followup-2

title: 追问：结合真实业务约束，如果要让结论在 Webpack 上可复核，你会怎样安排测试、日志和指标的组合验证
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要让结论在 Webpack 上可复核，你会怎样安排测试、日志和指标的组合验证？

### 答案要点

#### 直答

- 结论：先约定「Webpack、Rollup、esbuild、SWC 各自擅长什么」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 指标的组合验证 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Webpack：Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目。
- Rollup：Rollup 天然偏向 ESM 和库构建，产物更干净。
- esbuild：esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建。

#### 风险与验收

- 主要风险：指标的组合验证 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Webpack、Rollup、esbuild、SWC 各自擅长什么」里，指标的组合验证 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## bundler-ecosystem-followup-3

title: 追问：在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Webpack、Rollup、esbuild、SWC 各自擅长什么」场景下，遇到约束变化时，你会如何围绕 Webpack 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先画出 Webpack 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先定位 Webpack 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Webpack：Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目。
- Rollup：Rollup 天然偏向 ESM 和库构建，产物更干净。
- esbuild：esbuild / SWC 目标是极致速度，常被用于转译、压缩、预构建。

#### 风险与验收

- 主要风险：Webpack 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：验收看 Webpack 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## source-map-polyfill-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 SourceMap 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 SourceMap 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：验证「Source Map、Browserslist 与 Polyfill 策略」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 SourceMap 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- SourceMap：SourceMap 是「Source Map、Browserslist 与 Polyfill 策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Polyfill：Polyfill 是「Source Map、Browserslist 与 Polyfill 策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：在「Source Map、Browserslist 与 Polyfill 策略」里，SourceMap 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：SourceMap 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## source-map-polyfill-followup-3

title: 追问：以「Source Map、Browserslist 与 Polyfill 策略」为例，当兼容性要求提升或预算收紧时，你会如何围绕 SourceMap 调整方案边界与实施节奏
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「Source Map、Browserslist 与 Polyfill 策略」为例，当兼容性要求提升或预算收紧时，你会如何围绕 SourceMap 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：先冻结「Source Map、Browserslist 与 Polyfill 策略」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。
- 关键动作：先定位 Source Map 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Source Map：在「Source Map、Browserslist 与 Polyfill 策略」这道追问里，Source Map 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- Browserslist：Browserslist 定义目标环境，构建工具据此决定转译和兼容策略。
- Polyfill：Polyfill 是「Source Map、Browserslist 与 Polyfill 策略」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from。
- 验收信号：在「Source Map、Browserslist 与 Polyfill 策略」里，Source Map 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## monorepo-followup-2

title: 追问：你会如何围绕 Monorepo 定义「Monorepo、workspace、project references 的组合打法」生效的判据，并用测试与监控长期验证
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 Monorepo 定义「Monorepo、workspace、project references 的组合打法」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 直答

- 结论：先定「Monorepo、workspace、project references 的组合打法」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先定义 Monorepo 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Monorepo：Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队。
- workspace：workspace 解决依赖链接与本地开发。
- project references：在「Monorepo、workspace、project references 的组合打法」里，project references 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：Monorepo 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Monorepo、workspace、project references 的组合打法」里，Monorepo 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## monorepo-followup-3

title: 追问：在当前团队与业务约束下，当需求复杂度增长但团队产能有限时，你会如何围绕 Monorepo 拆分「Monorepo、workspace、project references 的组合打法」的落地路径
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当需求复杂度增长但团队产能有限时，你会如何围绕 Monorepo 拆分「Monorepo、workspace、project references 的组合打法」的落地路径？

### 答案要点

#### 直答

- 结论：先梳理 Monorepo 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：把「Monorepo、workspace、project references 的组合打法」里的 Monorepo 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- Monorepo：Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队。
- workspace：workspace 解决依赖链接与本地开发。
- project references：在「Monorepo、workspace、project references 的组合打法」这题里，project references 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：围绕 Monorepo 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：Monorepo 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## webpack-module-federation-followup-2

title: 追问：在「Webpack 5 Module Federation 的价值与边界」场景下，你会如何围绕 Webpack 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Webpack 5 Module Federation 的价值与边界」场景下，你会如何围绕 Webpack 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先约定「Webpack 5 Module Federation 的价值与边界」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先定义 Webpack 5 Module Federation 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Webpack：Webpack 是「Webpack 5 Module Federation 的价值与边界」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Module Federation：Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构。
- ModuleFederation：ModuleFederation 是「Webpack 5 Module Federation 的价值与边界」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Webpack 5 Module Federation 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「Webpack 5 Module Federation 的价值与边界」里，Webpack 5 Module Federation 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## webpack-module-federation-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Webpack 调整「Webpack 5 Module Federation 的价值与边界」方案的边界和节奏？

### 答案要点

#### 直答

- 结论：先锁定 Webpack 5 Module Federation 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 Webpack 5 Module Federation 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Webpack：Webpack 是「Webpack 5 Module Federation 的价值与边界」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Module Federation：Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构。
- ModuleFederation：ModuleFederation 是「Webpack 5 Module Federation 的价值与边界」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：Webpack 5 Module Federation 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Webpack 5 Module Federation 的价值与边界」里，验收 Webpack 5 Module Federation 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## monorepo-changesets-followup-2

title: 追问：结合真实业务约束，你会如何围绕 Monorepo 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 Monorepo 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先定「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 Changesets 与 Nx 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Monorepo：Monorepo 是「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 发版：被依赖的包先发版，依赖方自动升 caret 范围。

#### 风险与验收

- 主要风险：若 Changesets 与 Nx 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：Changesets 与 Nx 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## monorepo-changesets-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Monorepo 重新划分「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的实施阶段
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Monorepo 重新划分「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的实施阶段？

### 答案要点

#### 直答

- 结论：先小流量验证「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：先定位 Monorepo 多包发版（Changesets 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- Monorepo：Monorepo 是「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Changesets：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版。
- Nx Release：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版。

#### 风险与验收

- 主要风险：在「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」场景下，Monorepo 多包发版（Changesets 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」里，Monorepo 多包发版（Changesets 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## bundler-deep-followup-2

title: 追问：结合真实业务约束，为了确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是“看起来有效”，你会如何安排测试证据和观测指标
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，为了确认「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」不是“看起来有效”，你会如何安排测试证据和观测指标？

### 答案要点

#### 直答

- 结论：验证「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」里的 Webpack 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好。
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包。
- Vite：开发模式下用 esbuild 预构建依赖 + 浏览器原生 ESM 直接加载；生产仍 Rollup。

#### 风险与验收

- 主要风险：在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」里，Webpack 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」里，Webpack 至少要给一组指标阈值、一条日志证据和一组测试结果。

## bundler-deep-followup-3

title: 追问：在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 打包工具 拆分「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的落地路径
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 打包工具 拆分「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的落地路径？

### 答案要点

#### 直答

- 结论：先梳理 Webpack 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 Webpack 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Webpack：CommonJS/ESM 都吃，生态最丰富；启动慢，对大型项目升级不友好。
- Rollup：纯 ESM 优化好，tree-shaking 极佳，组件库首选；不擅长应用代码分包。
- Vite：开发模式下用 esbuild 预构建依赖 + 浏览器原生 ESM 直接加载；生产仍 Rollup。

#### 风险与验收

- 主要风险：Webpack 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」里 Webpack 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## git-bisect-reflog-worktree

title: Git 事故恢复：reflog、bisect、worktree 怎么配合
difficulty: 资深
tags: [Git, 排障, 发布]
followups: [git-bisect-reflog-worktree-followup-1, git-bisect-reflog-worktree-followup-2, git-bisect-reflog-worktree-followup-3]

### 一句话

讲「Git 事故恢复：reflog、bisect、worktree 怎么配合」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

线上发布后出现回归，你怀疑是最近两周某次提交引入的。请给出一个可执行流程：如何用 `reflog`、`bisect`、`worktree` 在尽量短时间内定位根因并准备修复/回滚。

### 答案要点

- 先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。
- reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据。
- bisect 适合在“已知一个好版本 + 一个坏版本”之间二分定位；每一步都要跑同一套最小复现脚本，最终输出“首次引入问题”的 commit 作为根因证据。
- worktree 让你在同一仓库同时开“回滚验证分支”“修复候选分支”“主线分支”，避免反复 stash/切分支污染现场，也减少误操作概率。

#### 工程化补充

- 场景前提：Git 事故恢复：reflog、bisect、worktree 怎么配合 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Git。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

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

这题的高分关键是把 Linux 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

一个 Node BFF 服务出现“偶发 502 + 超时”，前端同学被拉去协查。请说明你会如何用 Linux 工具快速定位问题边界，并给出可执行的排查顺序。

### 答案要点

- 先明确症状口径：是连接建立慢、请求处理中卡住、还是下游响应慢；没有统一口径就会在不同方向上盲查，时间消耗很大。
- 用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- 用 tcpdump 在服务节点抓包，判断请求是否真正到达、响应是否发出、是否有重传/丢包/中途被网关断开，快速划分“应用层 vs 网络层”责任边界。
- 用 strace -p 观察进程系统调用，如果长期卡在 futex、epoll_wait、read 等调用，可进一步判断是锁竞争、事件循环阻塞还是下游 I/O 卡住。

#### 工程化补充

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果回归问题只在生产流量下出现、测试环境复现不稳定，你会怎么改造 bisect 判定脚本？

### 答案要点

#### 直答

- 结论：验证 Git 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。

#### 术语解释

- Git：Git 是「Git 事故恢复：reflog、bisect、worktree 怎么配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 排障：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」里，排障 是验收对象，必须给可量化指标、日志信号和测试证据。
- 发布：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」里，发布 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」里，Git 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：Git 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## git-bisect-reflog-worktree-followup-2

title: 追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，当问题跨多个仓库时，你会怎么组织“跨仓根因定位”流程
difficulty: 资深
tags: [Git, 排障, 发布, 追问]
parent: git-bisect-reflog-worktree
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，当问题跨多个仓库（前端 + BFF + 配置仓）时，你会怎么组织“跨仓根因定位”流程？

### 答案要点

#### 直答

- 结论：先画出 Git 事故恢复 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。

#### 术语解释

- Git：Git 是「Git 事故恢复：reflog、bisect、worktree 怎么配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- reflog：reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据。
- bisect：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。

#### 风险与验收

- 主要风险：Git 事故恢复 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」里，验收 Git 事故恢复 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## git-bisect-reflog-worktree-followup-3

title: 追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制
difficulty: 资深
tags: [Git, 排障, 发布, 追问]
parent: git-bisect-reflog-worktree
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「Git 事故恢复：reflog、bisect、worktree 怎么配合」场景下，如何把这次 Git 事故恢复流程沉淀成团队可复用的应急手册和演练机制？

### 答案要点

#### 直答

- 结论：先锁定 Git 事故恢复 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先止血再定位：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。

#### 术语解释

- Git：Git 是「Git 事故恢复：reflog、bisect、worktree 怎么配合」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- reflog：reflog 用来找回“误 reset / 误 rebase / 误删分支”后的历史指针，先把可能丢失的提交恢复到安全分支，防止排查过程中二次丢失证据。
- bisect：确认是否需要立即回滚，保证用户影响先收敛；定位阶段要固定复现步骤和判定标准，避免“每次测试口径不一样”导致 bisect 结果不可信。

#### 风险与验收

- 主要风险：Git 事故恢复 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 Git 事故恢复 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## linux-network-debug-playbook-followup-1

title: 追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如果是 HTTPS 流量，抓包看不到明文，你会怎么结合应用日志与网关日志定位问题
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作, 追问]
parent: linux-network-debug-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如果是 HTTPS 流量，抓包看不到明文，你会怎么结合应用日志与网关日志定位问题？

### 答案要点

#### 直答

- 结论：验证 前端工程师的 Linux 排障工具链 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 前端工程师的 Linux 排障工具链 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Linux：Linux 是「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- lsof：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- ss：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。

#### 风险与验收

- 主要风险：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- 验收信号：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」里，前端工程师的 Linux 排障工具链 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## linux-network-debug-playbook-followup-2

title: 追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作, 追问]
parent: linux-network-debug-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，当问题只在高峰时段出现、平峰无法复现时，你会怎么设计“低风险观测”方案？

### 答案要点

#### 直答

- 结论：验证 前端工程师的 Linux 排障工具链 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 前端工程师的 Linux 排障工具链 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- Linux：Linux 是「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- lsof：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- ss：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。

#### 风险与验收

- 主要风险：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- 验收信号：前端工程师的 Linux 排障工具链 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## linux-network-debug-playbook-followup-3

title: 追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如何把这套排障动作沉淀成“前端值班手册”，让新同学也能按步骤执行
difficulty: 进阶
tags: [Linux, 网络排障, 运维协作, 追问]
parent: linux-network-debug-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」场景下，如何把这套排障动作沉淀成“前端值班手册”，让新同学也能按步骤执行？

### 答案要点

#### 直答

- 结论：把 前端工程师的 Linux 排障工具链 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 前端工程师的 Linux 排障工具链 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Linux：Linux 是「前端工程师的 Linux 排障工具链：lsof、ss、tcpdump、strace」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- lsof：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- ss：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。

#### 风险与验收

- 主要风险：用 lsof -i / ss -tnlp 先确认端口是否正确监听、连接是否异常堆积（例如大量 SYN_RECV、CLOSE_WAIT），先把“服务没起来/端口冲突”这种低级问题排掉。
- 验收信号：前端工程师的 Linux 排障工具链 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## release-train-cross-team-gate

title: 跨团队发布列车：依赖冻结窗口、并行联调与止损闸门
difficulty: 资深
tags: [发布治理, 协同, CI/CD]
followups: [release-train-cross-team-gate-followup-1, release-train-cross-team-gate-followup-2, release-train-cross-team-gate-followup-3]

### 一句话

这题的高分关键是把 发布治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

一个大型前端平台有 6 个业务团队共享组件库和 BFF，每周固定两次发布。你会如何设计跨团队发布列车，既保证交付速度又控制联动风险？

### 答案要点

- 先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点。
- 依赖变更分级治理：breaking change 强制升级演练，普通变更走自动兼容校验，热修复走快车道。
- 联调要按关键链路编排：支付、登录、推荐等高风险链路优先过门，再放开低风险模块。
- 门禁不仅看构建通过，还要看跨团队契约测试、端到端冒烟、关键指标基线是否退化。

#### 工程化补充

- 场景前提：落地 跨团队发布列车：依赖冻结窗口、并行联调与止损闸门 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

讲「分层回滚手册：包版本、配置开关与基础设施如何协同回退」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

线上出现高优事故：新发布版本导致部分页面白屏，且同时涉及组件库升级、网关规则变更和 feature flag 调整。你会如何设计分层回滚手册？

### 答案要点

- 先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。
- 每一层都要有独立可执行脚本和验收信号，避免“回滚动作互相等待”造成时间损耗。
- 包回滚要考虑依赖兼容：锁定可回退版本矩阵，防止应用回退后依赖仍停留在新协议。
- 网关和缓存策略需配套回退：避免代码回退了但 CDN/边缘缓存仍命中新产物。

#### 工程化补充

- 场景前提：落地 分层回滚手册：包版本、配置开关与基础设施如何协同回退 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 直答

- 结论：上线前先按 跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 风险分级做演练，配置降级与回滚开关，确认故障可止损后再放量。
- 关键动作：先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点。

#### 术语解释

- 发布治理：在「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里，发布治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 协同：在「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里，协同 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- CI/CD：CI/CD 是「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## release-train-cross-team-gate-followup-2

title: 追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 发布治理 把「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [发布治理, 协同, CI/CD, 追问]
parent: release-train-cross-team-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 发布治理 把「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 直答

- 结论：把 跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点。

#### 术语解释

- 发布治理：在「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里，发布治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 协同：在「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里，协同 是验收对象，必须给可量化指标、日志信号和测试证据。
- CI/CD：CI/CD 是「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里，跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## release-train-cross-team-gate-followup-3

title: 追问：在当前团队与业务约束下，要判断「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」值不值得长期维护，你会先盯哪些和 发布治理 相关的核心指标
difficulty: 资深
tags: [发布治理, 协同, CI/CD, 追问]
parent: release-train-cross-team-gate
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」值不值得长期维护，你会先盯哪些和 发布治理 相关的核心指标？

### 答案要点

#### 直答

- 结论：验证 跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义发布列车节奏：提测截止、依赖冻结、联调窗口、灰度窗口、回滚观察期各自有明确时间点。

#### 术语解释

- 发布治理：围绕「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里的 发布治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 协同：围绕「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里的 协同 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- CI/CD：CI/CD 是「跨团队发布列车：依赖冻结窗口、并行联调与止损闸门」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：若 跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：跨团队发布列车 依赖冻结窗口 并行联调与止损闸门 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## layered-rollback-runbook-followup-1

title: 追问：结合真实业务约束，真要把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」推到线上，你会如何围绕 回滚 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [回滚, 运维协作, 工程治理, 追问]
parent: layered-rollback-runbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「分层回滚手册：包版本、配置开关与基础设施如何协同回退」推到线上，你会如何围绕 回滚 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「分层回滚手册：包版本、配置开关与基础设施如何协同回退」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。

#### 术语解释

- 回滚：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。
- 运维协作：在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」里，运维协作 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 工程治理：在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」里，工程治理 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。

#### 风险与验收

- 主要风险：若 分层回滚手册 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：验收看 分层回滚手册 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## layered-rollback-runbook-followup-2

title: 追问：在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」场景下，你会如何围绕 回滚 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [回滚, 运维协作, 工程治理, 追问]
parent: layered-rollback-runbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「分层回滚手册：包版本、配置开关与基础设施如何协同回退」场景下，你会如何围绕 回滚 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：验证「分层回滚手册：包版本、配置开关与基础设施如何协同回退」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。

#### 术语解释

- 回滚：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。
- 运维协作：围绕「分层回滚手册：包版本、配置开关与基础设施如何协同回退」里的 运维协作 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 工程治理：围绕「分层回滚手册：包版本、配置开关与基础设施如何协同回退」里的 工程治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 分层回滚手册 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：分层回滚手册 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## layered-rollback-runbook-followup-3

title: 追问：遇到约束变化时，你会如何围绕 回滚 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [回滚, 运维协作, 工程治理, 追问]
parent: layered-rollback-runbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：遇到约束变化时，你会如何围绕 回滚 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：配置开关 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。
- 关键动作：先定义回滚层级和顺序：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。

#### 术语解释

- 回滚：开关回退最快，其次路由/网关策略，再到应用版本，最后才是依赖包回退。
- 运维协作：围绕「分层回滚手册：包版本、配置开关与基础设施如何协同回退」里的 运维协作 推进上线时，要明确每个批次的放量门槛和回退条件。
- 工程治理：围绕「分层回滚手册：包版本、配置开关与基础设施如何协同回退」里的 工程治理 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：配置开关 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：围绕 配置开关 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## frontend-build-regression-warroom

title: 前端构建回归战情室：包体突增、构建超时与发布止损编排
difficulty: 资深
tags: [构建治理, 发布止损, 战情室]
followups: [frontend-build-regression-warroom-followup-1, frontend-build-regression-warroom-followup-2, frontend-build-regression-warroom-followup-3]

### 一句话

这题的高分关键是把 构建治理 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

某次工具链升级后，CI 构建时长翻倍、主包体积上涨 35%、线上首屏指标开始回退。你会如何组织构建回归战情室，给出止损决策并推进恢复？

### 答案要点

- 先冻结高风险发布：定义临时闸门，防止回归继续扩散到更多业务线。
- 快速做差异归因：按依赖升级、构建配置、产物分包三维做对比定位。
- 回退策略分层：优先回退配置和插件版本，必要时回退整套工具链。
- 指标闭环统一：构建耗时、包体增量、关键 Web Vitals 必须同屏联动。

#### 工程化补充

- 场景前提：前端构建回归战情室：包体突增、构建超时与发布止损编排 只有在瓶颈被数据证实时才值得推进；先确认 构建治理 是否真是主耗时来源。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 前端构建回归战情室：包体突增、构建超时与发布止损编排 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

回答「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

团队计划升级一组核心依赖（例如构建器、路由或状态库）到大版本。你会如何设计影子流水线和回退矩阵，做到“可灰度、可止损、可复盘”？

### 答案要点

- 先梳理兼容契约：API 变更、配置语义、运行时行为三类差异要明确。
- 建立影子流水线：老版本与新版本并行跑构建、测试、关键业务回放。
- 分批推进升级：先低风险业务，再中风险业务，最后核心链路。
- 回退矩阵要先写好：版本组合、配置回退顺序、影响面评估一并固化。

#### 工程化补充

- 场景前提：依赖大版本升级治理：影子流水线、兼容契约与回退矩阵 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：构建回归已经发生时，你会先验哪些边界条件，确保后续止损动作不会误伤主线发布？

### 答案要点

#### 直答

- 结论：把 构建超时 与 发布止损编排 上线拆成试点、扩量、全量三阶段，每阶段都绑定错误率门槛和回滚动作。
- 关键动作：回退策略分层：优先回退配置和插件版本，必要时回退整套工具链。

#### 术语解释

- 构建治理：围绕「前端构建回归战情室：包体突增、构建超时与发布止损编排」里的 构建治理 推进上线时，要明确每个批次的放量门槛和回退条件。
- 发布止损：围绕「前端构建回归战情室：包体突增、构建超时与发布止损编排」里的 发布止损 推进上线时，要明确每个批次的放量门槛和回退条件。
- 战情室：围绕「前端构建回归战情室：包体突增、构建超时与发布止损编排」里的 战情室 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：构建超时 与 发布止损编排 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：发布验收至少看 构建超时 与 发布止损编排 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。

## frontend-build-regression-warroom-followup-2

title: 追问：你会怎么拆分构建回归的短期止损与长期治理
difficulty: 资深
tags: [构建治理, 发布止损, 战情室, 追问]
parent: frontend-build-regression-warroom
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：构建回归治理不能只有救火，你会如何拆分短期止损和长期治理节奏？

### 答案要点

#### 直答

- 结论：上线 长期治理节奏 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：回退策略分层：优先回退配置和插件版本，必要时回退整套工具链。

#### 术语解释

- 构建治理：在「前端构建回归战情室：包体突增、构建超时与发布止损编排」里，构建治理 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 发布止损：在「前端构建回归战情室：包体突增、构建超时与发布止损编排」里，发布止损 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 战情室：在「前端构建回归战情室：包体突增、构建超时与发布止损编排」里，战情室 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：围绕 长期治理节奏 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 长期治理节奏 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## frontend-build-regression-warroom-followup-3

title: 追问：长期看哪些指标能证明构建治理在变好
difficulty: 资深
tags: [构建治理, 发布止损, 战情室, 追问]
parent: frontend-build-regression-warroom
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：这套构建回归治理是否值得长期维护，你会用哪些核心指标来判断？

### 答案要点

#### 直答

- 结论：验证 构建超时 与 发布止损编排 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：回退策略分层：优先回退配置和插件版本，必要时回退整套工具链。

#### 术语解释

- 构建治理：围绕「前端构建回归战情室：包体突增、构建超时与发布止损编排」里的 构建治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 发布止损：围绕「前端构建回归战情室：包体突增、构建超时与发布止损编排」里的 发布止损 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 战情室：围绕「前端构建回归战情室：包体突增、构建超时与发布止损编排」里的 战情室 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「前端构建回归战情室：包体突增、构建超时与发布止损编排」里，构建超时 与 发布止损编排 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：构建超时 与 发布止损编排 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## dependency-upgrade-shadow-release-governance-followup-1

title: 追问：大版本升级你会如何做灰度和回退设计
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化, 追问]
parent: dependency-upgrade-shadow-release-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：大版本升级真要上线时，你会如何设计灰度节奏和回退条件，避免一次性放量翻车？

### 答案要点

#### 直答

- 结论：「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：分批推进升级：先低风险业务，再中风险业务，最后核心链路。

#### 术语解释

- 依赖治理：围绕「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里的 依赖治理 推进上线时，要明确每个批次的放量门槛和回退条件。
- 升级策略：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，升级策略 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。
- 工程化：围绕「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里的 工程化 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：回退条件 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。
- 验收信号：验收看 回退条件 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。

## dependency-upgrade-shadow-release-governance-followup-2

title: 追问：你会怎么搭依赖升级验证面板
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化, 追问]
parent: dependency-upgrade-shadow-release-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：依赖升级方案要持续评估收益，你会怎么搭验证面板，避免被噪声带偏？

### 答案要点

#### 直答

- 结论：先约定「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：分批推进升级：先低风险业务，再中风险业务，最后核心链路。

#### 术语解释

- 依赖治理：围绕「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里的 依赖治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 升级策略：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，升级策略 是验收对象，必须给可量化指标、日志信号和测试证据。
- 工程化：围绕「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里的 工程化 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，兼容契约 与 回退矩阵 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，兼容契约 与 回退矩阵 至少要给一组指标阈值、一条日志证据和一组测试结果。

## dependency-upgrade-shadow-release-governance-followup-3

title: 追问：依赖升级去留决策该看哪几组硬指标
difficulty: 资深
tags: [依赖治理, 升级策略, 工程化, 追问]
parent: dependency-upgrade-shadow-release-governance
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：团队要决定这条依赖升级路线继续还是暂停，你会给出哪几组硬指标做依据？

### 答案要点

#### 直答

- 结论：验证 兼容契约 与 回退矩阵 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：分批推进升级：先低风险业务，再中风险业务，最后核心链路。

#### 术语解释

- 依赖治理：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，依赖治理 是验收对象，必须给可量化指标、日志信号和测试证据。
- 升级策略：围绕「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里的 升级策略 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 工程化：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，工程化 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「依赖大版本升级治理：影子流水线、兼容契约与回退矩阵」里，兼容契约 与 回退矩阵 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：兼容契约 与 回退矩阵 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。
