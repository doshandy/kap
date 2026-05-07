---
id: 07-engineering
title: 工程化
order: 7
icon: 🧰
description: 构建工具、包管理、Monorepo、规范治理、CI/CD 与库发布。
---

## vite-principle
title: Vite 为什么开发快、构建又能稳定
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
      proxy: { '/api': { target: env.VITE_API, changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } },
    },
    optimizeDeps: {
      include: ['vue', 'pinia'],   // 强制预构建
      exclude: ['@vueuse/core'],   // 跳过预构建（已是 ESM）
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
    transformIndexHtml: html => html.replace('</head>', `<meta name="ver" content="${v}"></head>`),
    handleHotUpdate(ctx) {
      console.log('[hmr]', ctx.file);
    },
  };
}
```

### 延伸
- "Vite 快"不只因为 esbuild，更因为开发时避免了整包重编译
- 插件通常需要分别考虑 dev transform 和 build 行为

## bundler-ecosystem
title: Webpack、Rollup、esbuild、SWC 各自擅长什么
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

### 延伸
- 工具选型要看团队心智、插件生态、兼容需求，不只是 benchmark

## package-manager
title: npm、yarn、pnpm 与 lockfile、peerDependencies 的本质
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

### 延伸
- peer 依赖不是"自动安装的一般依赖"，而是兼容契约
- monorepo 里依赖管理策略会直接影响 hoist、调试和发布体验

## semver-commit-governance
title: SemVer、Conventional Commits、Changesets 分别治理什么问题
difficulty: 进阶
tags: [SemVer, ConventionalCommits, Changesets]

### 一句话
SemVer 定义的是“版本变更对外承诺”：破坏性变更升 major，向后兼容的新功能升 minor，向后兼容修复升 patch；Conventional Commits 统一提交语义，让变更历史更易检索…。

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
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert',
    ]],
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

### 延伸
- 规范提交不该沦为背模板，核心价值是让版本治理和协作沟通更稳定
- 对应用仓库，SemVer 更多服务于发布节奏和回滚；对库仓库，它直接影响外部消费者升级成本

## source-map-polyfill
title: Source Map、Browserslist 与 Polyfill 策略
difficulty: 进阶
tags: [SourceMap, Polyfill]

### 一句话
sourcemap 帮助调试和错误回溯，但线上公开暴露可能泄露源码结构；语法降级由编译器处理，如可选链转低版本写法；API polyfill 则补运行时能力，如 Promise、Array.from；Browserslist 定义目标环境…。

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
  "browserslist": [
    "> 0.5%",
    "last 2 versions",
    "Firefox ESR",
    "not dead",
    "not ie 11"
  ]
}
```

```js
// babel.config.js：按 browserslist 自动决定 polyfill
module.exports = {
  presets: [
    ['@babel/preset-env', {
      useBuiltIns: 'usage',     // 按需注入 polyfill
      corejs: { version: 3, proposals: false },
      targets: { esmodules: true },  // 现代浏览器，跳过过度降级
    }],
  ],
};
```

```ts
// vite.config.ts：sourcemap 策略
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode === 'development'
      ? 'inline'                 // 开发：内联便于调试
      : 'hidden',                // 生产：生成但不暴露 URL
  },
}));
```

```bash
# 上传 sourcemap 给 Sentry，构建产物里再删除
sentry-cli sourcemaps upload --release=$VERSION dist/
find dist -name "*.map" -delete
```

### 延伸
- 线上更常见的是上传 hidden sourcemap 给错误平台，而不是直接对外暴露
- "支持低版本浏览器"成本不只在编译，还在测试矩阵和运行时体积

## monorepo
title: Monorepo、workspace、project references 的组合打法
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
      "dependsOn": ["^build"],          // 先构建依赖项
      "outputs": ["dist/**", ".next/**"]
    },
    "test": { "dependsOn": ["build"], "outputs": [] },
    "lint": { "outputs": [] },
    "dev": { "cache": false, "persistent": true }
  }
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

### 延伸
- Monorepo 不会自动消除复杂度，它只是把复杂度集中管理
- 若团队很小、模块边界弱，单仓单包更实用

## lint-ci
title: ESLint、Prettier、Husky、lint-staged、CI 的职责边界
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

### 延伸
- 不要把耗时过长的全量测试都塞进 pre-commit，体验会很差
- 规则过严会让团队"为了过 lint 而写代码"，治理要有边界

## package-publishing
title: 前端库的产物设计：ESM/CJS/types/exports/sideEffects
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
      "require": "./dist/index.cjs"
    },
    "./button": {
      "types": "./dist/components/button.d.ts",
      "import": "./dist/components/button.js"
    },
    "./style.css": "./dist/style.css",
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md"],
  "sideEffects": ["**/*.css"],
  "engines": { "node": ">=18" }
}
```

```ts
// 使用方
import { Button } from '@my/lib';                 // 默认入口
import Button from '@my/lib/button';              // 子路径，更小
import '@my/lib/style.css';                       // 样式独立引入
```

### 延伸
- `exports` 一旦配置，就相当于包的公开 API 面，后续变更需要当成兼容性问题处理
- 库构建的核心不是"能打出来"，而是"能被不同消费者稳定使用"

## webpack-module-federation
title: Webpack 5 Module Federation 的价值与边界
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

### 延伸
- 没有强组织边界和独立发布需求时，Module Federation 往往是过度设计
- 真正难的是治理和演进，不是把 `remoteEntry` 跑起来

## exports-subpath
title: exports、subpath imports 与现代包入口设计
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
        "default": "./dist/browser.cjs"
      },
      "node": {
        "import": "./dist/node.js",
        "default": "./dist/node.cjs"
      },
      "types": "./dist/index.d.ts"
    }
  }
}
```

```jsonc
// 包内部使用 imports 别名（仅在自己 package 内可用）
{
  "imports": {
    "#utils/*": "./src/utils/*.ts",
    "#config": {
      "development": "./src/config.dev.ts",
      "default": "./src/config.prod.ts"
    }
  }
}
```

```ts
// 包内部使用
import { format } from '#utils/date';
import config from '#config';   // 自动按环境切换
```

### 延伸
- "先随便暴露所有文件，再慢慢收口"通常会留下长期兼容债
- 包入口设计本质上是在设计你的公共契约

## ci-cd-cache
title: CI/CD 缓存、矩阵构建与门禁设计
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

### 延伸
- CI 的目标不是"把所有事都塞进去"，而是让反馈时延和可信度平衡

## monorepo-changesets
title: Monorepo 多包发版（Changesets / Nx Release / Turborepo）
difficulty: 资深
tags: [Monorepo, 发版]

### 一句话
选型：Changesets（手写 patch / minor / major 描述）、Nx Release、Lerna v7+ 重写版；流程：开发提交时附带 changeset 文件 → CI 合并后机器人开 PR → 合 PR 时统一 publish…。

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

### 延伸
- 跨包重构时，Changesets 强制写说明，能让 CHANGELOG 一目了然
- 规模到几百包后建议看 Nx Release，提供更精细的依赖图分析

## bundler-deep
title: Webpack / Rollup / Vite / Rolldown / Turbopack 比较
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

### 延伸
- 真正影响开发体验的不是打包器名字，而是依赖预构建是否稳定、HMR 是否快
- 跨版本升级 Vite / Webpack 前先在分支跑一遍生产构建产物大小对比，避免 regression

## webpack-vs-vite
title: Webpack 与 Vite 在开发态、构建态的差异
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

### 延伸
- Vite 在大型项目里第一次冷启动也可能慢，注意 `optimizeDeps.include`
- Turbopack（Next.js 自研，Rust）走的也是 ESM + 增量编译路线
- 选型核心：开发体验 > 生产产物大小 > 团队熟悉度

