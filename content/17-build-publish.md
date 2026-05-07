---
id: 17-build-publish
title: 构建产物与发布
order: 17
icon: 🚀
description: hash 缓存、灰度、回滚、Service Worker 更新与前端部署策略。
---

## hashing-cache

title: hash 命名、长效缓存与 HTML 短缓存是发布基础功
difficulty: 基础
tags: [缓存, 发布]

### 一句话

带 hash 的资源内容变化即 URL 变化，适合长缓存；HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存；这样既能高命中缓存，又能确保用户尽快拿到新版本入口。

### 题目

为什么前端静态资源通常会带 hash，而 HTML 却常常不做长缓存？

### 答案要点

- 带 hash 的资源内容变化即 URL 变化，适合长缓存
- HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存
- 这样既能高命中缓存，又能确保用户尽快拿到新版本入口

### 代码示例

```nginx
# Nginx：差异化缓存策略
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  expires 1y;
  try_files $uri =404;
}

location = /index.html {
  add_header Cache-Control "no-cache, must-revalidate";
  expires 0;
}

# SPA fallback
location / {
  try_files $uri $uri/ /index.html;
}
```

```ts
// vite.config.ts：默认产物自带 hash
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
```

### 延伸

- "让所有资源都长缓存"通常会把入口页面更新搞坏

## chunk-failure

title: 动态 import 失败与旧版本 chunk 被清理怎么处理
difficulty: 进阶
tags: [动态加载, 容错]

### 一句话

用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk；页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败；解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新。

### 题目

为什么前端发布后，偶尔会出现“刷新一下就好了”的 chunk 加载错误？怎么治理？

### 答案要点

- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新

### 代码示例

```ts
// 1. 全局监听 chunk 加载失败，提示用户刷新
window.addEventListener(
  'error',
  (e) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
      if (await isVersionChanged()) showRefreshTip();
    }
  },
  true,
);

// 2. 路由懒加载兜底重试
function lazyWithRetry<T>(loader: () => Promise<T>, retries = 2): () => Promise<T> {
  return async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await loader();
      } catch (e) {
        if (i === retries) throw e;
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    throw new Error('unreachable');
  };
}

const Heavy = defineAsyncComponent({
  loader: lazyWithRetry(() => import('./Heavy.vue')),
  errorComponent: { template: `<button @click="reload">加载失败，点此刷新</button>` },
});

// 3. 检测版本是否漂移
async function isVersionChanged(): Promise<boolean> {
  try {
    const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
    const { version } = await res.json();
    return version !== import.meta.env.VITE_APP_VERSION;
  } catch {
    return false;
  }
}
```

```yaml
# 部署脚本：保留最近 N 个历史版本，避免旧 chunk 被立即删
# 同步上传到 CDN 时使用：
aws s3 sync ./dist s3://app-bucket/ --delete-removed=false
# 定期清理超过 30 天的 hash 文件
```

### 延伸

- 这是典型的发布链路问题，不是简单的"前端代码写错"

## gray-release

title: 灰度发布、回滚与零停机切换
difficulty: 进阶
tags: [灰度, 回滚]

### 一句话

新版本可能引入接口不兼容、缓存污染、白屏、地区性异常；灰度可以按用户、cookie、比例、入口域名切流；回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件。

### 题目

前端静态站点看似“发文件就行”，为什么仍然需要灰度与回滚设计？

### 答案要点

- 新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 灰度可以按用户、cookie、比例、入口域名切流
- 回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件

### 代码示例

```nginx
# 灰度按 cookie 分流
map $cookie_release $upstream_pool {
  default     "stable";
  ~*canary    "canary";
}

upstream stable { server stable.internal:80; }
upstream canary { server canary.internal:80; }

server {
  location / {
    proxy_pass http://$upstream_pool;
  }
}
```

```ts
// 服务端按 userId hash 分桶（10% 流量进灰度）
function isCanary(userId: string): boolean {
  const hash = [...userId].reduce((a, c) => a * 31 + c.charCodeAt(0), 0) >>> 0;
  return hash % 100 < 10;
}

app.use((req, res, next) => {
  if (isCanary(req.user.id)) {
    res.setHeader('Set-Cookie', 'release=canary; Path=/; Max-Age=86400');
  }
  next();
});
```

```bash
# 蓝绿部署（保留旧版本 30 分钟以便回滚）
# 上传新版本到 /releases/v2.0.0/
aws s3 sync ./dist s3://app/releases/v2.0.0/

# 切流量：把 CDN 源指向新版本
aws cloudfront update-distribution \
  --distribution-id E123 \
  --origin-path /releases/v2.0.0

# 出问题立即回滚（不需要重新构建）
aws cloudfront update-distribution \
  --distribution-id E123 \
  --origin-path /releases/v1.9.0
```

### 延伸

- 真正的发布能力，核心是"出问题时能否快速、低损恢复"

## service-worker-update

title: Service Worker 更新策略的取舍
difficulty: 进阶
tags: [ServiceWorker, PWA]

### 一句话

skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性；clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为；更稳妥的做法常是提示用户“发现新版本，点击刷新更新”。

### 题目

`skipWaiting` 和 `clients.claim` 为什么有争议？PWA 更新提示一般怎么设计？

### 答案要点

- `skipWaiting` 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- `clients.claim` 让新 SW 立即接管现有页面，也可能改变用户当前会话行为
- 更稳妥的做法常是提示用户“发现新版本，点击刷新更新”

### 代码示例

```ts
// SW 内：检测到新版本但不立即接管
self.addEventListener('install', () => {
  // 不调用 skipWaiting()，等待用户确认
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

```ts
// 主线程：检测到 SW 更新就提示用户
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // 弹出"发现新版本"提示
    showToast({
      message: '发现新版本',
      action: '立即更新',
      onAction: () => updateSW(true), // 触发 SKIP_WAITING + reload
    });
  },
  onOfflineReady() {
    showToast({ message: '已可离线访问' });
  },
});
```

```ts
// vite-plugin-pwa：配置更新策略
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'prompt', // 'prompt' 提示用户 / 'autoUpdate' 自动更新
  workbox: {
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',
        options: { cacheName: 'api', expiration: { maxAgeSeconds: 60 } },
      },
    ],
  },
});
```

### 延伸

- 离线能力和版本一致性经常彼此拉扯，不能只追求"更新最快"
- 若项目同时使用动态 import 和 SW 缓存，还要把 chunk 更新策略和缓存失效策略一起设计

## spa-fallback

title: history 路由、404 fallback 与静态托管适配
difficulty: 基础
tags: [路由, 静态部署]

### 一句话

静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404；需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径；hash 路由能绕开这个问题，但 URL 语义和分享体验较差。

### 题目

为什么 SPA 用 history 路由部署到静态托管平台时，刷新子路径经常 404？

### 答案要点

- 静态托管默认按物理文件查找路径，`/q/foo` 不存在就直接 404
- 需要服务器重写到 `index.html`，或像 GitHub Pages 这样用 404 fallback 技巧还原路径
- hash 路由能绕开这个问题，但 URL 语义和分享体验较差

### 代码示例

```nginx
# Nginx：所有未匹配路径回退到 index.html
location / {
  try_files $uri $uri/ /index.html;
}
```

```toml
# Netlify _redirects 或 netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

```json
// Vercel vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

```html
<!-- GitHub Pages 不支持 rewrite，用 404.html 兜底 -->
<!-- public/404.html -->
<script>
  // 把 /q/foo 编码成 /?p=/q/foo 重定向到 index.html
  var path = location.pathname + location.search;
  location.replace('/?p=' + encodeURIComponent(path));
</script>

<!-- index.html 头部还原 -->
<script>
  var p = new URL(location.href).searchParams.get('p');
  if (p) history.replaceState(null, '', p);
</script>
```

### 延伸

- 路由模式选择本质是在"部署简单"和"URL 质量"之间权衡

## bundle-governance

title: 包体分析与发布前治理
difficulty: 进阶
tags: [包体治理, 分析]

### 一句话

看是否有大依赖被整包引入；看是否存在多版本重复依赖；看异步 chunk 切分是否合理，首屏是否把低频页面代码打进主包。

### 题目

上线前为什么应该看一次 bundle 分析图？你最关注哪几类问题？

### 答案要点

- 看是否有**大依赖被整包引入**（如 lodash、moment、整 echarts），需切按需导入
- 看是否存在**多版本重复依赖**（npm/pnpm dedupe），同一库不同版本会双倍打包
- 看异步 **chunk 切分**：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗
- 看是否有**未压缩资源**（图片未优化、字体子集化、SVG 未 minify）
- 关注**包预算（performance budget）**：在 CI 里设置阈值（如主 chunk gzip < 200KB），超出报错
- 工具：`rollup-plugin-visualizer`、`source-map-explorer`、Lighthouse Treemap
- 治理动作：**懒加载、按需导入、Tree-shaking 友好的写法、polyfill 收敛**

### 代码示例

```ts
// vite.config.ts：开启可视化分析
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'treemap' / 'sunburst' / 'network'
    }),
  ],
});
```

```bash
# 包体诊断三件套
pnpm build
npx source-map-explorer 'dist/assets/*.js'    # 按源码看体积
npx vite-bundle-visualizer                     # 交互式
npx are-the-types-wrong .                      # 检查类型导出

# 检查重复依赖
pnpm dedupe --check
pnpm why react                                 # 看谁在引入
```

```ts
// 优化策略：手动分包 + 按需引入
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts/')) return 'echarts';
          if (id.includes('node_modules/lodash')) return 'lodash';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
```

### 延伸

- 很多包体问题不是"代码多"，而是依赖接入方式不对

## tree-shaking-deep

title: Tree-shaking 失效的常见原因
difficulty: 进阶
tags: [Tree-shaking, sideEffects]

### 一句话

库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口…。

### 题目

明明用了 ESM 还是发现整个 lodash 被打进来，可能是哪些原因？

### 答案要点

- 库不是 ESM：CJS 不能 tree-shake，要看 `package.json` 是否有 `"type": "module"` 或 `exports` 提供 ESM 入口
- 副作用：`package.json` 里 `"sideEffects": false` 才能让打包器认为 import 无副作用
- 顶层副作用：`import 'foo/style.css'` / `Object.assign(window, ...)` 都是副作用，必须保留
- 动态访问：`lodash[methodName]` 会让所有方法被保留
- 重新导出：`export * from './big'` 比命名导出更难 shake
- Babel/SWC 配置：转译目标过低（CommonJS）会破坏静态分析
- 实战工具：`webpack-bundle-analyzer` / `rollup-plugin-visualizer` 是定位的关键

### 代码示例

```js
import _ from 'lodash';
_.debounce(fn, 200);

import { debounce } from 'lodash-es';
debounce(fn, 200);

{
  "name": "my-lib",
  "version": "1.0.0",
  "sideEffects": ["./src/setup-polyfill.ts", "*.css"],
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### 延伸

- 自家库一定要双格式导出 + 配 sideEffects，不要让用户操心
- ESLint `no-restricted-imports` 可以禁止 `import * as _ from 'lodash'`，规范全员

## sw-update-strategies

title: PWA Service Worker 升级策略
difficulty: 资深
tags: [PWA, Service Worker]

### 一句话

默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管；skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致；clientsClaim：activate 后立即接管所有 client…。

### 题目

PWA 上线后用户访问看到的是旧版怎么办？SW 升级有哪些坑？

### 答案要点

- 默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致
- clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合
- 用户提示：检测到新 SW，弹"应用已更新，点击刷新"，让用户主动刷
- 缓存版本：每次发布换 cache name，旧缓存在 activate 时清理
- chunk 旧引用：HTML 引用旧 hash 的 JS 已经被新发布删除 → 404，需要保留 N 个版本或 SW 兜底
- 离线导航：navigateFallback 指向 index.html

### 代码示例

```ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({ cacheName: 'assets' }),
);
```

```ts
import { Workbox } from 'workbox-window';

const wb = new Workbox('/sw.js');
wb.addEventListener('waiting', () => {
  if (confirm('应用已更新，是否刷新？')) {
    wb.addEventListener('controlling', () => location.reload());
    wb.messageSkipWaiting();
  }
});
wb.register();
```

### 延伸

- 不要随便上 PWA，强缓存导致的"用户看不到新功能"在大公司是高危事件
- 强制更新建议结合"最低版本"检查：发现客户端 build hash < server 最低版本 → 弹强制刷新

## semver-release

title: SemVer 与自动化发版（changeset / semantic-release）
difficulty: 进阶
tags: [发布, 工程化]

### 一句话

SemVer = MAJOR.MINOR.PATCH。`MAJOR` 改了破坏性 API、`MINOR` 加新功能、`PATCH` 修 bug。配合 changeset / semantic-release 让 commit message 自动决定下一个版本号 + 写 CHANGELOG。

### 题目

请描述语义化版本的规则与自动化发布流程。

### 答案要点

- **MAJOR**：不向后兼容的改动（删 API、改默认行为）
- **MINOR**：向后兼容的新功能
- **PATCH**：向后兼容的 bug fix
- **预发布**：`1.0.0-alpha.1` / `-beta.1` / `-rc.1`
- 自动化方案：
  - **Changesets**（pnpm 推荐）：开发者写 `.changeset/*.md` 描述影响，CI 聚合发版 PR
  - **semantic-release**：根据 commit message（feat / fix / BREAKING CHANGE）自动决定版本
  - **Release Please**（Google）：在 GitHub PR 上自动维护 release PR
- 配套：
  - Conventional Commits（`feat: ...` / `fix: ...` / `chore: ...`）
  - commitlint + husky 强制规范
  - npm publish + provenance（npm 9+）
  - 公司内部 npm 用 verdaccio / Nexus

### 代码示例

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
pnpm changeset
pnpm changeset version
pnpm publish -r
```

```yaml
name: Release
on: { push: { branches: [master] } }
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, registry-url: https://registry.npmjs.org }
      - run: pnpm install
      - uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 延伸

- monorepo 多包发布优先 Changesets，颗粒度更细
- npm provenance 让 `npm install` 时能验证包来源，防供应链攻击
- 大版本升级建议先发 next tag（`npm publish --tag next`）

## ci-cd-frontend-pipeline

title: 前端 CI/CD 流水线怎么设计
difficulty: 资深
tags: [CI/CD, 工程化, 高频]

### 一句话

PR 阶段：lint + typecheck + 单测 + 单测覆盖率 + build + 视觉回归 + size 报告；merge 主干：产物上传 → 灰度部署 → E2E 冒烟 → 监控护栏。每步可缓存（pnpm store / build cache），分钟级可达。

### 题目

团队前端项目 CI 跑 30 分钟，开发都不愿意提 PR。怎么设计一条又快又安全的流水线？

### 答案要点

- **PR 阶段（必须快，目标 < 5 min）**
  - 安装依赖（pnpm + 缓存 store）
  - lint（eslint --cache）
  - typecheck（tsc --noEmit / vue-tsc，可分布式）
  - 单元测试（vitest，并发 + 覆盖率）
  - build（仅产物校验、不部署）
  - 关键 E2E 冒烟（< 1 min）
  - bundle size diff（与 main 对比，超阈值警告）
  - **并行化**：每个 job 独立 runner，并发跑
- **合并到主干**
  - 重新跑全量测试（PR 时可能 skip 一些重测试）
  - 完整 E2E（playwright shard 多机并发）
  - 视觉回归（Chromatic / Percy）
  - 上传产物到 OSS / CDN
  - 触发部署到 staging
- **部署阶段**
  - staging 自动化部署 + 自动跑 smoke 测试
  - 灰度发布（手工 trigger or 定时）：5% → 50% → 100%
  - 每个阶段观察护栏（错误率、性能），异常自动暂停
- **缓存策略（核心提速点）**
  - pnpm store：`actions/cache` 缓存 ~/.pnpm-store
  - eslint / tsc 增量：`.eslintcache` / `tsbuildinfo`
  - build cache：vite / webpack 持久化缓存
  - turbo / nx 增量构建（只重跑改动的包）
- **发版**
  - changesets：自动版本号 + changelog
  - npm publish 走 OIDC 免 token
  - GitHub Release 自动生成
- **观测 CI**
  - Datadog / Honeycomb CI tracing 找慢步骤
  - 失败原因聚合分析（哪个 test 经常 flaky）
  - 周度 / 月度 CI 时长趋势报告
- **避坑**
  - 不要在 PR 跑全量 E2E（用专门的 nightly job）
  - 不要把 secret 写进配置（用 secret manager）
  - 不要用 self-hosted runner 跑不可信 PR（fork 攻击风险）

### 代码示例

```yaml
name: CI
on:
  pull_request:
  push: { branches: [main] }

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test build
      - uses: codecov/codecov-action@v4
      - name: Bundle size
        run: pnpm size-limit --json > size.json
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }

  e2e:
    if: github.event_name == 'push'
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix: { shard: [1, 2, 3, 4] }
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright test --shard=${{ matrix.shard }}/4
```

### 延伸

- 自托管 runner：自己机器上跑，更快但运维成本高
- 大型 monorepo 用 Turborepo / Nx remote cache
- 部署：ArgoCD / Spinnaker 做灰度可观测

## bundle-optimization-tactics

title: 一道题打包优化全部场景
difficulty: 资深
tags: [构建, 性能, 高频]

### 一句话

四类手段叠加：① **Tree-shaking + 副作用标记**（package.json sideEffects）；② **代码分割**（路由 / 库 / vendor 三段拆）；③ **依赖换体积小的**（dayjs 替 moment / lodash-es 替 lodash / preact 替 react）；④ **压缩**（terser + 现代浏览器 ES2022 + brotli + 图片现代格式）。

### 题目

你的应用打包后主包 1.5MB（gzip），怎么系统性优化到 < 300KB？

### 答案要点

- **测量先行**
  - rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
  - 找 top 10 最大依赖
  - bundle size CI 化（size-limit）
- **Tree-shaking 失效原因**
  - CommonJS 包不能 tree-shake → 装 ESM 版本
  - 没标 sideEffects: false → 全量打包
  - 副作用 import：`import 'antd/dist/antd.css'` 这种是必要副作用
  - import 整个对象：`import lodash from 'lodash'` 改成 `import map from 'lodash/map'`
- **代码分割策略**
  - 路由级懒加载：`const Foo = lazy(() => import('./Foo'))`
  - 库级别 chunk：vite manualChunks 把 echarts / monaco 单独分
  - 第三方 vendor 单独：长期缓存友好
  - 注意：过度分割导致小文件多，HTTP/2 下还行，HTTP/1.1 反而慢
- **依赖瘦身**
  - moment 670KB → dayjs 7KB
  - lodash 70KB → lodash-es 按需 / 自己写
  - antd 全量 → 按需 import + babel-plugin-import / unplugin-vue-components
  - react 130KB → preact 10KB（小项目可考虑）
  - 大型 SDK 拆 lazy：地图 / 富文本 / 视频
- **现代输出**
  - target ES2022（覆盖 95% 用户），少 polyfill
  - 双 bundle（modern + legacy）：modern 给新浏览器
  - terser + esbuild 混合：esbuild 压更快，terser 压更小
  - brotli > gzip：减小 15-20%
- **资源类**
  - 图片：webp / avif，lazy loading
  - 字体：子集化（中文必做）+ woff2 + font-display
  - SVG：svgo 优化 + sprite 合并
- **代码层面**
  - 删除死代码（未使用的 feature flag 分支）
  - 重型功能转动态 import
  - polyfill 按需（core-js + browserslist）
- **运行时优化**
  - preload 关键 chunk
  - prefetch 下一步可能用到的 chunk（路由跳转预测）

### 代码示例

```js
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  build: {
    target: 'es2022',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('echarts')) return 'echarts';
          if (id.includes('monaco-editor')) return 'monaco';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  plugins: [
    visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true }),
    legacy({ targets: ['defaults', 'not IE 11'] }),
  ],
});
```

```json
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "200 KB" },
    { "path": "dist/assets/vendor-*.js", "limit": "150 KB" }
  ]
}
```

### 延伸

- Module Federation 把"运行时共享"做到极致（多个微应用共享 react 一份）
- HTTP/3 + brotli + 现代浏览器：典型场景下 LCP 可降 30-50%
- import maps：浏览器原生支持 bare specifier，未来"零打包"可能
