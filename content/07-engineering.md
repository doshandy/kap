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
followups: [bundler-ecosystem-followup-1]
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
followups: [package-manager-followup-1]
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
followups: [semver-commit-governance-followup-1]
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
followups: [source-map-polyfill-followup-1]
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
followups: [monorepo-followup-1]
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
followups: [lint-ci-followup-1]
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
followups: [package-publishing-followup-1]
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
followups: [webpack-module-federation-followup-1]
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
followups: [exports-subpath-followup-1]
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
followups: [ci-cd-cache-followup-1]
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
followups: [monorepo-changesets-followup-1]
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
followups: [bundler-deep-followup-1]
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
followups: [webpack-vs-vite-followup-1]
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
followups: [vite-vs-webpack-deep-followup-1, vite-vs-webpack-deep-followup-4, vite-vs-webpack-deep-followup-5]
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
followups: [vite-go-and-rolldown-followup-1, vite-go-and-rolldown-followup-4, vite-go-and-rolldown-followup-5]
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
followups: [tsconfig-paths-to-bundler-alias-followup-1, tsconfig-paths-to-bundler-alias-followup-4, tsconfig-paths-to-bundler-alias-followup-5]
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

title: 追问：推动「Vite 为什么开发快、构建又能稳定」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 题目

如果面试官追问：推动「Vite 为什么开发快、构建又能稳定」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vite 为什么开发快、构建又能稳定」拆成可验证的小步骤，逐步替换高风险部分。

## vite-principle-followup-2

title: 追问：如果团队成员能力和历史包袱不一致，你会如何拆阶段推进
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 题目

如果面试官追问：如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Vite 为什么开发快、构建又能稳定」拆成可验证的小步骤，逐步替换高风险部分。

## vite-principle-followup-3

title: 追问：你会用哪些指标判断这个工程方案长期值得维护
difficulty: 进阶
tags: [Vite, 构建, 追问]
parent: vite-principle

### 题目

如果面试官追问：你会用哪些指标判断这个工程方案长期值得维护？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Vite 为什么开发快、构建又能稳定」不是只在理想输入下成立。
- 再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## bundler-ecosystem-followup-1

title: 追问：「Webpack、Rollup、esbuild、SWC 各自擅长什么」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Webpack, Rollup, esbuild, SWC, 追问]
parent: bundler-ecosystem

### 题目

如果面试官追问：「Webpack、Rollup、esbuild、SWC 各自擅长什么」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Webpack、Rollup、esbuild、SWC 各自擅长什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Webpack 生态庞大、能力全面，适合复杂应用与历史包袱重的项目」要进一步补到边界条件里，而不是只复述结论。

## package-manager-followup-1

title: 追问：推动「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [pnpm, 依赖管理, 追问]
parent: package-manager

### 题目

如果面试官追问：推动「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「npm、yarn、pnpm 与 lockfile、peerDependencies 的本质」拆成可验证的小步骤，逐步替换高风险部分。

## semver-commit-governance-followup-1

title: 追问：推动「SemVer、Conventional Commits、Changesets 分别治理什么问题」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets, 追问]
parent: semver-commit-governance

### 题目

如果面试官追问：推动「SemVer、Conventional Commits、Changesets 分别治理什么问题」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「SemVer、Conventional Commits、Changesets 分别治理什么问题」拆成可验证的小步骤，逐步替换高风险部分。

## source-map-polyfill-followup-1

title: 追问：「Source Map、Browserslist 与 Polyfill 策略」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [SourceMap, Polyfill, 追问]
parent: source-map-polyfill

### 题目

如果面试官追问：「Source Map、Browserslist 与 Polyfill 策略」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Source Map、Browserslist 与 Polyfill 策略」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构」要进一步补到边界条件里，而不是只复述结论。

## monorepo-followup-1

title: 追问：「Monorepo、workspace、project references 的组合打法」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Monorepo, TS, 追问]
parent: monorepo

### 题目

如果面试官追问：「Monorepo、workspace、project references 的组合打法」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Monorepo、workspace、project references 的组合打法」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Monorepo 适合多个包强协作、共享基础设施、需要原子改动和统一发布流程的团队」要进一步补到边界条件里，而不是只复述结论。

## lint-ci-followup-1

title: 追问：推动「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 基础
tags: [规范, CI, 追问]
parent: lint-ci

### 题目

如果面试官追问：推动「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「ESLint、Prettier、Husky、lint-staged、CI 的职责边界」不是只在理想输入下成立。
- 再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## package-publishing-followup-1

title: 追问：推动「前端库的产物设计：ESM/CJS/types/exports/sideEffects」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [发布, 包设计, 追问]
parent: package-publishing

### 题目

如果面试官追问：推动「前端库的产物设计：ESM/CJS/types/exports/sideEffects」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「前端库的产物设计：ESM/CJS/types/exports/sideEffects」拆成可验证的小步骤，逐步替换高风险部分。

## webpack-module-federation-followup-1

title: 追问：「Webpack 5 Module Federation 的价值与边界」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Webpack, ModuleFederation, 微前端, 追问]
parent: webpack-module-federation

### 题目

如果面试官追问：「Webpack 5 Module Federation 的价值与边界」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Webpack 5 Module Federation 的价值与边界」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Module Federation 允许多个独立构建在运行时共享和消费模块，适合独立部署的微前端架构」要进一步补到边界条件里，而不是只复述结论。

## exports-subpath-followup-1

title: 追问：推动「exports、subpath imports 与现代包入口设计」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [package.json, exports, imports, 追问]
parent: exports-subpath

### 题目

如果面试官追问：推动「exports、subpath imports 与现代包入口设计」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「exports、subpath imports 与现代包入口设计」拆成可验证的小步骤，逐步替换高风险部分。

## ci-cd-cache-followup-1

title: 追问：你会先看哪些指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈
difficulty: 进阶
tags: [CI, GitHubActions, 缓存, 追问]
parent: ci-cd-cache

### 题目

如果面试官追问：你会先看哪些指标来判断「CI/CD 缓存、矩阵构建与门禁设计」是不是当前性能瓶颈？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「CI/CD 缓存、矩阵构建与门禁设计」不是只在理想输入下成立。
- 再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## monorepo-changesets-followup-1

title: 追问：「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Monorepo, 发版, 追问]
parent: monorepo-changesets

### 题目

如果面试官追问：「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Monorepo 多包发版（Changesets / Nx Release / Turborepo）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版」要进一步补到边界条件里，而不是只复述结论。

## bundler-deep-followup-1

title: 追问：「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [打包工具, Vite, 追问]
parent: bundler-deep

### 题目

如果面试官追问：「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Webpack / Rollup / Vite / Rolldown / Turbopack 比较」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「打包器三件事：依赖图分析、转换、产出 bundle」要进一步补到边界条件里，而不是只复述结论。

## webpack-vs-vite-followup-1

title: 追问：推动「Webpack 与 Vite 在开发态、构建态的差异」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [Webpack, Vite, 构建, 追问]
parent: webpack-vs-vite

### 题目

如果面试官追问：推动「Webpack 与 Vite 在开发态、构建态的差异」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Webpack 与 Vite 在开发态、构建态的差异」拆成可验证的小步骤，逐步替换高风险部分。

## webpack-to-vite-migration-followup-1

title: 追问：推动「Webpack → Vite 迁移的工程痛点与落地策略」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 题目

如果面试官追问：推动「Webpack → Vite 迁移的工程痛点与落地策略」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Webpack → Vite 迁移的工程痛点与落地策略」拆成可验证的小步骤，逐步替换高风险部分。

## webpack-to-vite-migration-followup-2

title: 追问：如果团队成员能力和历史包袱不一致，你会如何拆阶段推进
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 题目

如果面试官追问：如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「Webpack → Vite 迁移的工程痛点与落地策略」拆成可验证的小步骤，逐步替换高风险部分。

## webpack-to-vite-migration-followup-3

title: 追问：你会用哪些指标判断这个工程方案长期值得维护
difficulty: 资深
tags: [Vite, Webpack, 迁移, 高频, 追问]
parent: webpack-to-vite-migration

### 题目

如果面试官追问：你会用哪些指标判断这个工程方案长期值得维护？

### 答案要点

#### 核心回答

- 验证要从可复现样例开始：准备正向、边界和失败用例，确认「Webpack → Vite 迁移的工程痛点与落地策略」不是只在理想输入下成立。
- 再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。
- 如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。

## vite-vs-webpack-deep-followup-1

title: 追问：「为什么 Vite 比 Webpack 快？快在哪里」上线后如何设计验证和观测指标
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep

### 题目

如果面试官追问：「为什么 Vite 比 Webpack 快？快在哪里」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「为什么 Vite 比 Webpack 快？快在哪里」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Dev 阶段（Vite 显著快）」要进一步补到边界条件里，而不是只复述结论。

## vite-vs-webpack-deep-followup-4

title: 追问：「为什么 Vite 比 Webpack 快？快在哪里」如果规模或约束变化，你会怎么调整方案
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep

### 题目

如果面试官追问：「为什么 Vite 比 Webpack 快？快在哪里」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「为什么 Vite 比 Webpack 快？快在哪里」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Dev 阶段（Vite 显著快）」要进一步补到边界条件里，而不是只复述结论。

## vite-vs-webpack-deep-followup-5

title: 追问：「为什么 Vite 比 Webpack 快？快在哪里」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Vite, Webpack, 高频, 追问]
parent: vite-vs-webpack-deep

### 题目

如果面试官追问：「为什么 Vite 比 Webpack 快？快在哪里」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「为什么 Vite 比 Webpack 快？快在哪里」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Dev 阶段（Vite 显著快）」要进一步补到边界条件里，而不是只复述结论。

## vite-go-and-rolldown-followup-1

title: 追问：「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」上线后如何设计验证和观测指标
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown

### 题目

如果面试官追问：「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform」要进一步补到边界条件里，而不是只复述结论。

## vite-go-and-rolldown-followup-4

title: 追问：「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」如果规模或约束变化，你会怎么调整方案
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown

### 题目

如果面试官追问：「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform」要进一步补到边界条件里，而不是只复述结论。

## vite-go-and-rolldown-followup-5

title: 追问：「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [Vite, esbuild, Rolldown, 追问]
parent: vite-go-and-rolldown

### 题目

如果面试官追问：「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Vite 哪部分用 Go？Rolldown 与 Vite 7 大版本变化」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「esbuild 是 Evan Wallace 写的 Go 工具，能做 bundle / minify / transform」要进一步补到边界条件里，而不是只复述结论。

## tsconfig-paths-to-bundler-alias-followup-1

title: 追问：「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」上线后如何设计验证和观测指标
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias

### 题目

如果面试官追问：「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）」要进一步补到边界条件里，而不是只复述结论。

## tsconfig-paths-to-bundler-alias-followup-4

title: 追问：「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」如果规模或约束变化，你会怎么调整方案
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias

### 题目

如果面试官追问：「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）」要进一步补到边界条件里，而不是只复述结论。

## tsconfig-paths-to-bundler-alias-followup-5

title: 追问：「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [配置, alias, monorepo, 追问]
parent: tsconfig-paths-to-bundler-alias

### 题目

如果面试官追问：「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「通过配置文件生成路径映射 / 别名（tsconfig → vite/webpack）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「同一个 alias @components/\* 在三处定义：tsconfig.json paths（IDE/tsc）、webpack/vite alias（运行时）、eslint-import-resolver（lint）」要进一步补到边界条件里，而不是只复述结论。
