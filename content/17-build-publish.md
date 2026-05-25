---
id: 17-build-publish
title: 构建产物与发布
order: 17
icon: 🚀
description: hash 缓存、灰度、回滚、Service Worker 更新与前端部署策略。
---

## hashing-cache

title: hash 命名、长效缓存与 HTML 短缓存是发布基础功
followups: [hashing-cache-followup-1, hashing-cache-followup-2, hashing-cache-followup-3]
difficulty: 基础
tags: [缓存, 发布]

### 一句话

这题回答要覆盖 缓存 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

为什么前端静态资源通常会带 hash，而 HTML 却常常不做长缓存？

### 答案要点

- 带 hash 的资源内容变化即 URL 变化，适合长缓存
- HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存
- 这样既能高命中缓存，又能确保用户尽快拿到新版本入口
- 面试中不要只停留在「hash 命名、长效缓存与 HTML 短缓存是发布基础功」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：回答 hash 命名、长效缓存与 HTML 短缓存是发布基础功 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：围绕 hash 命名、长效缓存与 HTML 短缓存是发布基础功 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 hash 命名、长效缓存与 HTML 短缓存是发布基础功 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

### 追问

- 你会先看哪些指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「hash 命名、长效缓存与 HTML 短缓存是发布基础功」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 缓存、发布，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- "让所有资源都长缓存"通常会把入口页面更新搞坏

## chunk-failure

title: 动态 import 失败与旧版本 chunk 被清理怎么处理
followups: [chunk-failure-followup-1, chunk-failure-followup-2, chunk-failure-followup-3]
difficulty: 进阶
tags: [动态加载, 容错]

### 一句话

讲「动态 import 失败与旧版本 chunk 被清理怎么处理」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

为什么前端发布后，偶尔会出现“刷新一下就好了”的 chunk 加载错误？怎么治理？

### 答案要点

- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新
- 面试中不要只停留在「动态 import 失败与旧版本 chunk 被清理怎么处理」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：落地 动态 import 失败与旧版本 chunk 被清理怎么处理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

### 追问

- 「动态 import 失败与旧版本 chunk 被清理怎么处理」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「动态 import 失败与旧版本 chunk 被清理怎么处理」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 动态加载、容错，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 这是典型的发布链路问题，不是简单的"前端代码写错"

## gray-release

title: 灰度发布、回滚与零停机切换
followups: [gray-release-followup-1, gray-release-followup-2, gray-release-followup-3]
difficulty: 进阶
tags: [灰度, 回滚]

### 一句话

回答「灰度发布、回滚与零停机切换」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

前端静态站点看似“发文件就行”，为什么仍然需要灰度与回滚设计？

### 答案要点

- 新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 灰度可以按用户、cookie、比例、入口域名切流
- 回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件
- 面试中不要只停留在「灰度发布、回滚与零停机切换」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：灰度发布、回滚与零停机切换 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：围绕 灰度发布、回滚与零停机切换 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

### 追问

- 推动「灰度发布、回滚与零停机切换」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「灰度发布、回滚与零停机切换」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 灰度、回滚，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 真正的发布能力，核心是"出问题时能否快速、低损恢复"

## service-worker-update

title: Service Worker 更新策略的取舍
followups: [service-worker-update-followup-1, service-worker-update-followup-2, service-worker-update-followup-3]
difficulty: 进阶
tags: [ServiceWorker, PWA]
links: [05-browser/service-worker, sw-update-strategies]

### 一句话

这题的高分关键是把 PWA 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

`skipWaiting` 和 `clients.claim` 为什么有争议？PWA 更新提示一般怎么设计？

### 答案要点

- skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为
- 更稳妥的做法常是提示用户“发现新版本，点击刷新更新”
- 面试中不要只停留在「Service Worker 更新策略的取舍」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：讨论 Service Worker 更新策略的取舍 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

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

### 追问

- 「Service Worker 更新策略的取舍」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Service Worker 更新策略的取舍」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 ServiceWorker、PWA，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 离线能力和版本一致性经常彼此拉扯，不能只追求"更新最快"
- 若项目同时使用动态 import 和 SW 缓存，还要把 chunk 更新策略和缓存失效策略一起设计

## spa-fallback

title: history 路由、404 fallback 与静态托管适配
followups: [spa-fallback-followup-1, spa-fallback-followup-2, spa-fallback-followup-3]
difficulty: 基础
tags: [路由, 静态部署]

### 一句话

这题回答要覆盖 路由 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

为什么 SPA 用 history 路由部署到静态托管平台时，刷新子路径经常 404？

### 答案要点

- 静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径
- hash 路由能绕开这个问题，但 URL 语义和分享体验较差
- 面试中不要只停留在「history 路由、404 fallback 与静态托管适配」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：先定义 history 路由、404 fallback 与静态托管适配 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 history 路由、404 fallback 与静态托管适配 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 路由 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 路由 的可复现用例、线上监控指标和回退演练记录。

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

### 追问

- 「history 路由、404 fallback 与静态托管适配」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「history 路由、404 fallback 与静态托管适配」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 路由、静态部署，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 路由模式选择本质是在"部署简单"和"URL 质量"之间权衡

## bundle-governance

title: 包体分析与发布前治理
followups: [bundle-governance-followup-1, bundle-governance-followup-2, bundle-governance-followup-3]
difficulty: 进阶
tags: [包体治理, 分析]

### 一句话

讲「包体分析与发布前治理」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

上线前为什么应该看一次 bundle 分析图？你最关注哪几类问题？

### 答案要点

- 看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包
- 看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗
- 看是否有未压缩资源（图片未优化、字体子集化、SVG 未 minify）

#### 工程化补充

- 场景前提：落地 包体分析与发布前治理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

### 追问

- 推动「包体分析与发布前治理」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「包体分析与发布前治理」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 包体治理、分析，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 很多包体问题不是"代码多"，而是依赖接入方式不对

## tree-shaking-deep

title: Tree-shaking 失效的常见原因
followups: [tree-shaking-deep-followup-1, tree-shaking-deep-followup-2, tree-shaking-deep-followup-3]
links: [07-engineering/package-publishing]
difficulty: 进阶
tags: [Tree-shaking, sideEffects]

### 一句话

这题回答要覆盖 Tree-shaking 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

明明用了 ESM 还是发现整个 lodash 被打进来，可能是哪些原因？

### 答案要点

- 库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用
- 顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留
- 动态访问：lodash[methodName] 会让所有方法被保留

#### 工程化补充

- 场景前提：先定义 Tree-shaking 失效的常见原因 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 Tree-shaking 失效的常见原因 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 Tree-shaking 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Tree-shaking 的可复现用例、线上监控指标和回退演练记录。

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

### 追问

- 「Tree-shaking 失效的常见原因」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Tree-shaking 失效的常见原因」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Tree-shaking、sideEffects，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 自家库一定要双格式导出 + 配 sideEffects，不要让用户操心
- ESLint `no-restricted-imports` 可以禁止 `import * as _ from 'lodash'`，规范全员

## sw-update-strategies

title: PWA Service Worker 升级策略
followups: [sw-update-strategies-followup-1, sw-update-strategies-followup-2, sw-update-strategies-followup-3]
links: [05-browser/service-worker, service-worker-update, 26-browser-extension/manifest-v3]
difficulty: 资深
tags: [PWA, Service Worker]

### 一句话

回答「PWA Service Worker 升级策略」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

PWA 上线后用户访问看到的是旧版怎么办？SW 升级有哪些坑？

### 答案要点

- 默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致
- clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合
- 用户提示：检测到新 SW，弹"应用已更新，点击刷新"，让用户主动刷

#### 工程化补充

- 场景前提：先说明浏览器调度与渲染阶段，再讲 PWA Service Worker 升级策略，否则容易把现象当结论。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

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

### 追问

- 「PWA Service Worker 升级策略」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「PWA Service Worker 升级策略」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 PWA、Service Worker，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不要随便上 PWA，强缓存导致的"用户看不到新功能"在大公司是高危事件
- 强制更新建议结合"最低版本"检查：发现客户端 build hash < server 最低版本 → 弹强制刷新

## semver-release

title: SemVer 与自动化发版（changeset / semantic-release）
followups: [semver-release-followup-1, semver-release-followup-2, semver-release-followup-3]
links: [07-engineering/semver-commit-governance]
difficulty: 进阶
tags: [发布, 工程化]

### 一句话

这题回答要覆盖 发布 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请描述语义化版本的规则与自动化发布流程。

### 答案要点

- MAJOR：不向后兼容的改动（删 API、改默认行为）
- MINOR：向后兼容的新功能
- PATCH：向后兼容的 bug fix
- 预发布：1.0.0-alpha.1 / -beta.1 / -rc.1

#### 工程化补充

- 场景前提：SemVer 与自动化发版（changeset / semantic-release） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

### 追问

- 推动「SemVer 与自动化发版（changeset / semantic-release）」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「SemVer 与自动化发版（changeset / semantic-release）」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 发布、工程化，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- monorepo 多包发布优先 Changesets，颗粒度更细
- npm provenance 让 `npm install` 时能验证包来源，防供应链攻击
- 大版本升级建议先发 next tag（`npm publish --tag next`）

## ci-cd-frontend-pipeline

title: 前端 CI/CD 流水线怎么设计
followups: [ci-cd-frontend-pipeline-followup-1, ci-cd-frontend-pipeline-followup-2, ci-cd-frontend-pipeline-followup-3]
difficulty: 资深
tags: [CI/CD, 工程化, 高频]

### 一句话

这题的高分关键是把 CI/CD 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

团队前端项目 CI 跑 30 分钟，开发都不愿意提 PR。怎么设计一条又快又安全的流水线？

### 答案要点

- PR 阶段（必须快，目标 < 5 min）
- 安装依赖（pnpm + 缓存 store）
- lint（eslint --cache）
- typecheck（tsc --noEmit / vue-tsc，可分布式）

#### 工程化补充

- 场景前提：前端 CI/CD 流水线怎么设计 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

### 追问

- 推动「前端 CI/CD 流水线怎么设计」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端 CI/CD 流水线怎么设计」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 CI/CD、工程化、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 自托管 runner：自己机器上跑，更快但运维成本高
- 大型 monorepo 用 Turborepo / Nx remote cache
- 部署：ArgoCD / Spinnaker 做灰度可观测

## bundle-optimization-tactics

title: 一道题打包优化全部场景
followups: [bundle-optimization-tactics-followup-1, bundle-optimization-tactics-followup-2, bundle-optimization-tactics-followup-3]
links: [08-performance/bundle-split-strategy]
difficulty: 资深
tags: [构建, 性能, 高频]

### 一句话

回答「一道题打包优化全部场景」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

你的应用打包后主包 1.5MB（gzip），怎么系统性优化到 < 300KB？

### 答案要点

- rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 找 top 10 最大依赖
- bundle size CI 化（size-limit）
- Tree-shaking 失效原因

#### 工程化补充

- 场景前提：回答 一道题打包优化全部场景 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 实施步骤：先把 构建 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 一道题打包优化全部场景 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

### 追问

- 你会先看哪些指标来判断「一道题打包优化全部场景」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「一道题打包优化全部场景」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 构建、性能、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Module Federation 把"运行时共享"做到极致（多个微应用共享 react 一份）
- HTTP/3 + brotli + 现代浏览器：典型场景下 LCP 可降 30-50%
- import maps：浏览器原生支持 bare specifier，未来"零打包"可能

## hashing-cache-followup-1

title: 追问：你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈
difficulty: 基础
tags: [缓存, 发布, 追问]
parent: hashing-cache

### 一句话

这道追问要直接回应「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 追问核心：说明如何验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」结论成立，给出 缓存 的验收路径（对应追问：你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈）。
- 直接围绕「你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈」作答：带 hash 的资源内容变化即 URL 变化，适合长缓存

#### 落地步骤

- 第一步：回答 hash 命名、长效缓存与 HTML 短缓存是发布基础功 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 缓存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 hash 命名、长效缓存与 HTML 短缓存是发布基础功 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## chunk-failure-followup-1

title: 追问：如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项
difficulty: 进阶
tags: [动态加载, 容错, 追问]
parent: chunk-failure

### 一句话

围绕「动态 import 失败与旧版本 chunk 被清理怎么处理」回答追问时，重点说清 动态加载 的前提、动作和回退条件。

### 题目

如果面试官追问：如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项？

### 答案要点

#### 直答

- 追问核心：说明「动态 import 失败与旧版本 chunk 被清理怎么处理」上线时如何灰度、观测、回滚（对应追问：如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项）。
- 直接围绕「如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项」作答：用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk

#### 落地步骤

- 第一步：先定义 动态 import 失败与旧版本 chunk 被清理怎么处理 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 动态加载 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 动态加载 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 动态加载 的可复现用例、线上监控指标和回退演练记录。

## gray-release-followup-1

title: 追问：在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [灰度, 回滚, 追问]
parent: gray-release

### 一句话

这道追问要直接回应「灰度发布、回滚与零停机切换」在 灰度 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「灰度发布、回滚与零停机切换」上线时如何灰度、观测、回滚（对应追问：在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径」作答：新版本可能引入接口不兼容、缓存污染、白屏、地区性异常

#### 落地步骤

- 第一步：灰度发布、回滚与零停机切换 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 灰度 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## service-worker-update-followup-1

title: 追问：如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项
difficulty: 进阶
tags: [ServiceWorker, PWA, 追问]
parent: service-worker-update

### 一句话

回答这题时，先给 PWA 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项？

### 答案要点

#### 直答

- 追问核心：比较「Service Worker 更新策略的取舍」在收益、成本和维护复杂度上的取舍边界（对应追问：如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项）。
- 直接围绕「如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项」作答：skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性

#### 落地步骤

- 第一步：讨论 Service Worker 更新策略的取舍 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## spa-fallback-followup-1

title: 追问：在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点
difficulty: 基础
tags: [路由, 静态部署, 追问]
parent: spa-fallback

### 一句话

围绕「history 路由、404 fallback 与静态托管适配」回答追问时，重点说清 路由 的前提、动作和回退条件。

### 题目

如果面试官追问：在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点？

### 答案要点

#### 直答

- 追问核心：识别「history 路由、404 fallback 与静态托管适配」的高风险失败场景并给出兜底措施（对应追问：在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点）。
- 直接围绕「在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点」作答：静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404

#### 落地步骤

- 第一步：先定义 history 路由、404 fallback 与静态托管适配 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 路由 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 路由 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 路由 的可复现用例、线上监控指标和回退演练记录。

## bundle-governance-followup-1

title: 追问：以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [包体治理, 分析, 追问]
parent: bundle-governance

### 一句话

这道追问的关键是把 包体治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「包体分析与发布前治理」上线时如何灰度、观测、回滚（对应追问：以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径」作答：看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入

#### 落地步骤

- 第一步：落地 包体分析与发布前治理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 包体治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## tree-shaking-deep-followup-1

title: 追问：围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真
difficulty: 进阶
tags: [Tree-shaking, sideEffects, 追问]
parent: tree-shaking-deep

### 一句话

这道追问要直接回应「Tree-shaking 失效的常见原因」在 Tree-shaking 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真？

### 答案要点

#### 直答

- 追问核心：解释「Tree-shaking 失效的常见原因」背后的因果关系，并指出 Tree-shaking 的触发条件（对应追问：围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真）。
- 直接围绕「围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真」作答：库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口

#### 落地步骤

- 第一步：先定义 Tree-shaking 失效的常见原因 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 Tree-shaking 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Tree-shaking 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Tree-shaking 的可复现用例、线上监控指标和回退演练记录。

## sw-update-strategies-followup-1

title: 追问：在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [PWA, Service Worker, 追问]
parent: sw-update-strategies

### 一句话

这道追问要直接回应「PWA Service Worker 升级策略」在 PWA 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 直答

- 追问核心：围绕「PWA Service Worker 升级策略」给出可执行的落地方案，重点说明 PWA 怎么做（对应追问：在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束是什么）。
- 直接围绕「在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束是什么」作答：默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管

#### 落地步骤

- 第一步：先说明浏览器调度与渲染阶段，再讲 PWA Service Worker 升级策略，否则容易把现象当结论。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## semver-release-followup-1

title: 追问：结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [发布, 工程化, 追问]
parent: semver-release

### 一句话

这道追问要直接回应「SemVer 与自动化发版（changeset / semantic-release）」在 发布 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「SemVer 与自动化发版（changeset / semantic-release）」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」作答：MAJOR：不向后兼容的改动（删 API、改默认行为）

#### 落地步骤

- 第一步：SemVer 与自动化发版（changeset / semantic-release） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## ci-cd-frontend-pipeline-followup-1

title: 追问：围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险
difficulty: 资深
tags: [CI/CD, 工程化, 高频, 追问]
parent: ci-cd-frontend-pipeline

### 一句话

这道追问要直接回应「前端 CI/CD 流水线怎么设计」在 CI/CD 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险？

### 答案要点

#### 直答

- 追问核心：说明「前端 CI/CD 流水线怎么设计」上线时如何灰度、观测、回滚（对应追问：围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险）。
- 直接围绕「围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险」作答：PR 阶段（必须快，目标 < 5 min）

#### 落地步骤

- 第一步：前端 CI/CD 流水线怎么设计 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 CI/CD 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## bundle-optimization-tactics-followup-1

title: 追问：真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号
difficulty: 资深
tags: [构建, 性能, 高频, 追问]
parent: bundle-optimization-tactics

### 一句话

围绕「一道题打包优化全部场景」回答追问时，重点说清 构建 的前提、动作和回退条件。

### 题目

如果面试官追问：真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号？

### 答案要点

#### 直答

- 追问核心：围绕「一道题打包优化全部场景」给出可执行的落地方案，重点说明 构建 怎么做（对应追问：真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号）。
- 直接围绕「真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号」作答：rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer

#### 落地步骤

- 第一步：回答 一道题打包优化全部场景 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 构建 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 一道题打包优化全部场景 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## web-platform-baseline-governance

title: Baseline、Browserslist 与现代浏览器兼容策略怎么治理
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性]
links: [bundle-optimization-tactics, 07-engineering/bundler-ecosystem, 04-css/selector-modern]
followups: [web-platform-baseline-governance-followup-1, web-platform-baseline-governance-followup-2, web-platform-baseline-governance-followup-3]

### 一句话

讲「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

团队想提高构建目标、减少 polyfill 和兼容代码时，Baseline、Browserslist、真实用户浏览器占比应如何一起使用？

### 答案要点

- Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板。
- Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用。
- 真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”。
- 提高目标要灰度：先在低风险入口开启现代产物、观察错误率和白屏率，再逐步删除老 polyfill 和兼容分支。

#### 工程化补充

- 场景前提：落地 Baseline、Browserslist 与现代浏览器兼容策略怎么治理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```json
{
  "browserslist": {
    "production": [
      "supports es6-module",
      "last 2 Chrome versions",
      "last 2 Edge versions",
      "last 2 Safari major versions",
      "Firefox ESR",
      "not dead"
    ],
    "legacy": ["> 0.2%", "not dead"]
  }
}
```

```ts
const supportsPopover = HTMLElement.prototype.hasOwnProperty('popover');

if (!supportsPopover) {
  await import('./legacy-floating-layer');
}
```

### 常见误区

- 只改 Browserslist，不看真实用户浏览器分布，导致低端 WebView 或企业浏览器突然白屏。
- 新 API 一律加 polyfill，结果包体和维护成本长期膨胀。
- 把 Baseline 当成强制标准；它是公共参考，最终仍要回到自己产品的用户和风险。

### 追问

- 如何判断一个 polyfill 该保留、按需加载还是删除？
- 现代产物和 legacy 产物双发时，如何监控兼容回归？
- Baseline 能解决哪些共识问题，不能替代哪些业务决策？

## hashing-cache-followup-2

title: 追问：以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 基础
tags: [缓存, 发布, 追问]
parent: hashing-cache
generated: followup-script

### 一句话

回答这题时，先给 缓存 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 直答

- 追问核心：说明如何验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」结论成立，给出 缓存 的验收路径（对应追问：以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立）。
- 直接围绕「以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立」作答：带 hash 的资源内容变化即 URL 变化，适合长缓存

#### 落地步骤

- 第一步：hash 命名、长效缓存与 HTML 短缓存是发布基础功 只有在瓶颈被数据证实时才值得推进；先确认 缓存 是否真是主耗时来源。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 缓存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 hash 命名、长效缓存与 HTML 短缓存是发布基础功 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## hashing-cache-followup-3

title: 追问：结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 基础
tags: [缓存, 发布, 追问]
parent: hashing-cache
generated: followup-script

### 一句话

围绕「hash 命名、长效缓存与 HTML 短缓存是发布基础功」回答追问时，重点说清 缓存 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 直答

- 追问核心：说明「hash 命名、长效缓存与 HTML 短缓存是发布基础功」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损）。
- 直接围绕「结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」作答：带 hash 的资源内容变化即 URL 变化，适合长缓存

#### 落地步骤

- 第一步：回答 hash 命名、长效缓存与 HTML 短缓存是发布基础功 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 缓存 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 hash 命名、长效缓存与 HTML 短缓存是发布基础功 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## gray-release-followup-2

title: 追问：在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线
difficulty: 进阶
tags: [灰度, 回滚, 追问]
parent: gray-release
generated: followup-script

### 一句话

这道追问的关键是把 灰度 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线？

### 答案要点

#### 直答

- 追问核心：说明「灰度发布、回滚与零停机切换」上线时如何灰度、观测、回滚（对应追问：在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线）。
- 直接围绕「在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线」作答：新版本可能引入接口不兼容、缓存污染、白屏、地区性异常

#### 落地步骤

- 第一步：落地 灰度发布、回滚与零停机切换 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 灰度 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## gray-release-followup-3

title: 追问：在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标
difficulty: 进阶
tags: [灰度, 回滚, 追问]
parent: gray-release
generated: followup-script

### 一句话

围绕「灰度发布、回滚与零停机切换」回答追问时，重点说清 灰度 的前提、动作和回退条件。

### 题目

如果面试官追问：在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「灰度发布、回滚与零停机切换」结论成立，给出 灰度 的验收路径（对应追问：在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标）。
- 直接围绕「在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标」作答：新版本可能引入接口不兼容、缓存污染、白屏、地区性异常

#### 落地步骤

- 第一步：灰度发布、回滚与零停机切换 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 灰度 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## bundle-governance-followup-2

title: 追问：在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界
difficulty: 进阶
tags: [包体治理, 分析, 追问]
parent: bundle-governance
generated: followup-script

### 一句话

围绕「包体分析与发布前治理」回答追问时，重点说清 包体治理 的前提、动作和回退条件。

### 题目

如果面试官追问：在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界？

### 答案要点

#### 直答

- 追问核心：比较「包体分析与发布前治理」在收益、成本和维护复杂度上的取舍边界（对应追问：在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界）。
- 直接围绕「在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界」作答：看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入

#### 落地步骤

- 第一步：包体分析与发布前治理 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 包体治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## bundle-governance-followup-3

title: 追问：在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [包体治理, 分析, 追问]
parent: bundle-governance
generated: followup-script

### 一句话

回答这题时，先给 包体治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 直答

- 追问核心：说明「包体分析与发布前治理」上线时如何灰度、观测、回滚（对应追问：在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号）。
- 直接围绕「在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号」作答：看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入

#### 落地步骤

- 第一步：落地 包体分析与发布前治理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 包体治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## semver-release-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序
difficulty: 进阶
tags: [发布, 工程化, 追问]
parent: semver-release
generated: followup-script

### 一句话

这道追问的关键是把 发布 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序？

### 答案要点

#### 直答

- 追问核心：说明「SemVer 与自动化发版（changeset / semantic-release）」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序）。
- 直接围绕「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序」作答：MAJOR：不向后兼容的改动（删 API、改默认行为）

#### 落地步骤

- 第一步：落地 SemVer 与自动化发版（changeset / semantic-release） 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## semver-release-followup-3

title: 追问：结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险
difficulty: 进阶
tags: [发布, 工程化, 追问]
parent: semver-release
generated: followup-script

### 一句话

围绕「SemVer 与自动化发版（changeset / semantic-release）」回答追问时，重点说清 发布 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险？

### 答案要点

#### 直答

- 追问核心：说明如何验证「SemVer 与自动化发版（changeset / semantic-release）」结论成立，给出 发布 的验收路径（对应追问：结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险）。
- 直接围绕「结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险」作答：MAJOR：不向后兼容的改动（删 API、改默认行为）

#### 落地步骤

- 第一步：SemVer 与自动化发版（changeset / semantic-release） 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## ci-cd-frontend-pipeline-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序
difficulty: 资深
tags: [CI/CD, 工程化, 高频, 追问]
parent: ci-cd-frontend-pipeline
generated: followup-script

### 一句话

这道追问的关键是把 CI/CD 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序？

### 答案要点

#### 直答

- 追问核心：围绕「前端 CI/CD 流水线怎么设计」给出可执行的落地方案，重点说明 CI/CD 怎么做（对应追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序）。
- 直接围绕「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序」作答：PR 阶段（必须快，目标 < 5 min）

#### 落地步骤

- 第一步：落地 前端 CI/CD 流水线怎么设计 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 CI/CD 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 CI/CD 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## ci-cd-frontend-pipeline-followup-3

title: 追问：以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 资深
tags: [CI/CD, 工程化, 高频, 追问]
parent: ci-cd-frontend-pipeline
generated: followup-script

### 一句话

围绕「前端 CI/CD 流水线怎么设计」回答追问时，重点说清 CI/CD 的前提、动作和回退条件。

### 题目

如果面试官追问：以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端 CI/CD 流水线怎么设计」结论成立，给出 CI/CD 的验收路径（对应追问：以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据）。
- 直接围绕「以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据」作答：PR 阶段（必须快，目标 < 5 min）

#### 落地步骤

- 第一步：前端 CI/CD 流水线怎么设计 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 CI/CD 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## bundle-optimization-tactics-followup-2

title: 追问：在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 资深
tags: [构建, 性能, 高频, 追问]
parent: bundle-optimization-tactics
generated: followup-script

### 一句话

回答这题时，先给 构建 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 直答

- 追问核心：比较「一道题打包优化全部场景」在收益、成本和维护复杂度上的取舍边界（对应追问：在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益）。
- 直接围绕「在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益」作答：rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer

#### 落地步骤

- 第一步：一道题打包优化全部场景 只有在瓶颈被数据证实时才值得推进；先确认 构建 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 构建 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 一道题打包优化全部场景 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## bundle-optimization-tactics-followup-3

title: 追问：在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 资深
tags: [构建, 性能, 高频, 追问]
parent: bundle-optimization-tactics
generated: followup-script

### 一句话

这道追问要直接回应「一道题打包优化全部场景」在 构建 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 直答

- 追问核心：比较「一道题打包优化全部场景」在收益、成本和维护复杂度上的取舍边界（对应追问：在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本）。
- 直接围绕「在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本」作答：rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer

#### 落地步骤

- 第一步：回答 一道题打包优化全部场景 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 构建 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 一道题打包优化全部场景 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## web-platform-baseline-governance-followup-1

title: 追问：以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性, 追问]
parent: web-platform-baseline-governance
generated: followup-script

### 一句话

这道追问的关键是把 Baseline 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除？

### 答案要点

#### 直答

- 追问核心：围绕「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」给出可执行的落地方案，重点说明 Baseline 怎么做（对应追问：以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除）。
- 直接围绕「以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除」作答：Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板。

#### 落地步骤

- 第一步：落地 Baseline、Browserslist 与现代浏览器兼容策略怎么治理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 Baseline 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 Baseline 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## web-platform-baseline-governance-followup-2

title: 追问：在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性, 追问]
parent: web-platform-baseline-governance
generated: followup-script

### 一句话

回答这题时，先给 Baseline 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」结论成立，给出 Baseline 的验收路径（对应追问：在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归）。
- 直接围绕「在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归」作答：Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板。

#### 落地步骤

- 第一步：Baseline、Browserslist 与现代浏览器兼容策略怎么治理 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Baseline。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Baseline 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## web-platform-baseline-governance-followup-3

title: 追问：从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性, 追问]
parent: web-platform-baseline-governance
generated: followup-script

### 一句话

回答这题时，先给 Baseline 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策？

### 答案要点

#### 直答

- 追问核心：围绕「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」给出可执行的落地方案，重点说明 Baseline 怎么做（对应追问：从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策）。
- 直接围绕「从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策」作答：Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板。

#### 落地步骤

- 第一步：落地 Baseline、Browserslist 与现代浏览器兼容策略怎么治理 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：先把 Baseline 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 Baseline 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## chunk-failure-followup-2

title: 追问：在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [动态加载, 容错, 追问]
parent: chunk-failure
generated: followup-script

### 一句话

这道追问的关键是把 动态加载 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 追问核心：说明如何验证「动态 import 失败与旧版本 chunk 被清理怎么处理」结论成立，给出 动态加载 的验收路径（对应追问：在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进）。
- 直接围绕「在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进」作答：用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk

#### 落地步骤

- 第一步：回答 动态 import 失败与旧版本 chunk 被清理怎么处理 时先锁定 动态加载 的边界条件，避免把经验结论当成通用规则。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作需要包含完成标准和失败处理，不要只给方向不写执行细节。
- 第三步：如果 动态加载 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 动态加载 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 动态加载 的可复现用例、线上监控指标和回退演练记录。

## chunk-failure-followup-3

title: 追问：以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏
difficulty: 进阶
tags: [动态加载, 容错, 追问]
parent: chunk-failure
generated: followup-script

### 一句话

这道追问要直接回应「动态 import 失败与旧版本 chunk 被清理怎么处理」在 动态加载 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 追问核心：识别「动态 import 失败与旧版本 chunk 被清理怎么处理」的高风险失败场景并给出兜底措施（对应追问：以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏）。
- 直接围绕「以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏」作答：用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk

#### 落地步骤

- 第一步：先定义 动态 import 失败与旧版本 chunk 被清理怎么处理 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 第三步：如果 动态加载 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 动态加载 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 动态加载 的可复现用例、线上监控指标和回退演练记录。

## service-worker-update-followup-2

title: 追问：从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 进阶
tags: [ServiceWorker, PWA, 追问]
parent: service-worker-update
generated: followup-script

### 一句话

这道追问要直接回应「Service Worker 更新策略的取舍」在 PWA 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Service Worker 更新策略的取舍」结论成立，给出 PWA 的验收路径（对应追问：从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论）。
- 直接围绕「从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论」作答：skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性

#### 落地步骤

- 第一步：回答 Service Worker 更新策略的取舍 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Service Worker 更新策略的取舍 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## service-worker-update-followup-3

title: 追问：以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏
difficulty: 进阶
tags: [ServiceWorker, PWA, 追问]
parent: service-worker-update
generated: followup-script

### 一句话

这道追问的关键是把 PWA 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏？

### 答案要点

#### 直答

- 追问核心：比较「Service Worker 更新策略的取舍」在收益、成本和维护复杂度上的取舍边界（对应追问：以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏）。
- 直接围绕「以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏」作答：skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性

#### 落地步骤

- 第一步：讨论 Service Worker 更新策略的取舍 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## spa-fallback-followup-2

title: 追问：为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标
difficulty: 基础
tags: [路由, 静态部署, 追问]
parent: spa-fallback
generated: followup-script

### 一句话

回答这题时，先给 路由 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「history 路由、404 fallback 与静态托管适配」结论成立，给出 路由 的验收路径（对应追问：为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标）。
- 直接围绕「为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标」作答：静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404

#### 落地步骤

- 第一步：history 路由、404 fallback 与静态托管适配 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 路由。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 路由 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## spa-fallback-followup-3

title: 追问：在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径
difficulty: 基础
tags: [路由, 静态部署, 追问]
parent: spa-fallback
generated: followup-script

### 一句话

回答这题时，先给 路由 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径？

### 答案要点

#### 直答

- 追问核心：围绕「history 路由、404 fallback 与静态托管适配」给出可执行的落地方案，重点说明 路由 怎么做（对应追问：在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径）。
- 直接围绕「在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径」作答：静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404

#### 落地步骤

- 第一步：回答 history 路由、404 fallback 与静态托管适配 时要说明 路由 在极端输入下的行为，不要只给样例路径。
- 第二步：先把 路由 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。
- 第三步：如果 路由 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

## tree-shaking-deep-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效
difficulty: 进阶
tags: [Tree-shaking, sideEffects, 追问]
parent: tree-shaking-deep
generated: followup-script

### 一句话

回答这题时，先给 Tree-shaking 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Tree-shaking 失效的常见原因」结论成立，给出 Tree-shaking 的验收路径（对应追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效）。
- 直接围绕「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效」作答：库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口

#### 落地步骤

- 第一步：Tree-shaking 失效的常见原因 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Tree-shaking。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Tree-shaking 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## tree-shaking-deep-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段
difficulty: 进阶
tags: [Tree-shaking, sideEffects, 追问]
parent: tree-shaking-deep
generated: followup-script

### 一句话

围绕「Tree-shaking 失效的常见原因」回答追问时，重点说清 Tree-shaking 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段？

### 答案要点

#### 直答

- 追问核心：解释「Tree-shaking 失效的常见原因」背后的因果关系，并指出 Tree-shaking 的触发条件（对应追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段）。
- 直接围绕「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段」作答：库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口

#### 落地步骤

- 第一步：先定义 Tree-shaking 失效的常见原因 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 Tree-shaking 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 Tree-shaking 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Tree-shaking 的可复现用例、线上监控指标和回退演练记录。

## sw-update-strategies-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [PWA, Service Worker, 追问]
parent: sw-update-strategies
generated: followup-script

### 一句话

回答这题时，先给 PWA 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「PWA Service Worker 升级策略」结论成立，给出 PWA 的验收路径（对应追问：在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标」作答：默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管

#### 落地步骤

- 第一步：PWA Service Worker 升级策略 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 PWA。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## sw-update-strategies-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏
difficulty: 资深
tags: [PWA, Service Worker, 追问]
parent: sw-update-strategies
generated: followup-script

### 一句话

围绕「PWA Service Worker 升级策略」回答追问时，重点说清 PWA 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏？

### 答案要点

#### 直答

- 追问核心：围绕「PWA Service Worker 升级策略」给出可执行的落地方案，重点说明 PWA 怎么做（对应追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏）。
- 直接围绕「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏」作答：默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管

#### 落地步骤

- 第一步：先说明浏览器调度与渲染阶段，再讲 PWA Service Worker 升级策略，否则容易把现象当结论。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。
- 第三步：如果 PWA 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。
- 验收信号：验收至少看主线程长任务、帧率和关键交互延迟。

## release-risk-gate-policy

title: 发布风险分级与闸门策略：高风险变更如何安全上线
followups: [release-risk-gate-policy-followup-1, release-risk-gate-policy-followup-2, release-risk-gate-policy-followup-3]
difficulty: 资深
tags: [发布治理, 风险分级, 闸门]

### 一句话

这题回答要覆盖 发布治理 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

面对日常迭代与大版本并行的发布节奏，你会如何设计风险分级与发布闸门，既保证速度又控制事故概率？

### 答案要点

- 先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分。
- 分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察。
- 闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件。
- 高风险发布要做“前置准备”：明确回滚入口、开关策略、值班安排和观测面板，避免上线后临时补救。

#### 工程化补充

- 场景前提：先限定 发布治理 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 发布风险分级与闸门策略：高风险变更如何安全上线 的结论不成立。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```ts
type ChangeRiskInput = {
  filesChanged: number;
  touchesCriticalPath: boolean;
  hasDependencyUpgrade: boolean;
  hasSchemaChange: boolean;
};

function calcRiskLevel(x: ChangeRiskInput): 'L1' | 'L2' | 'L3' {
  let score = 0;
  if (x.filesChanged > 60) score += 2;
  if (x.touchesCriticalPath) score += 3;
  if (x.hasDependencyUpgrade) score += 2;
  if (x.hasSchemaChange) score += 3;
  if (score >= 6) return 'L3';
  if (score >= 3) return 'L2';
  return 'L1';
}
```

```yaml
gate_policy:
  L1: [lint, unit_test, build]
  L2: [lint, unit_test, e2e_smoke, perf_budget]
  L3: [all_checks, canary_5_percent, oncall_approval, rollback_plan_attached]
```

### 追问

- 「发布风险分级与闸门策略：高风险变更如何安全上线」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只按“改了多少行”判断风险，忽略业务关键路径和依赖变化。
- 高低风险走同一闸门，导致要么过慢、要么失控。
- 闸门只拦不反馈，开发者不知道为何失败、如何修复。

### 延伸

- 可在 PR 模板里自动展示风险级别和必备检查项，减少沟通成本。
- 风险模型要定期回顾，用真实事故样本校准权重。

## rollback-drill-mechanism

title: 回滚演练机制：把“能回滚”从口头承诺变成可验证能力
followups: [rollback-drill-mechanism-followup-1, rollback-drill-mechanism-followup-2, rollback-drill-mechanism-followup-3]
difficulty: 资深
tags: [回滚演练, 应急, 发布]

### 一句话

讲「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

团队都说自己支持回滚，但线上事故时常常回不去。你会如何设计回滚演练机制，保证关键时刻可用？

### 答案要点

- 先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”。
- 资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”。
- 兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存。
- 演练要场景化：白屏、接口 5xx、第三方降级、错误率突增等都应有固定 drill 剧本。

#### 工程化补充

- 场景前提：落地 回滚演练机制：把“能回滚”从口头承诺变成可验证能力 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```bash
# 伪流程：入口指向切回上一个稳定版本
CURRENT=v2.3.0
PREV=v2.2.4

echo "rollback from $CURRENT to $PREV"
./ops/switch-origin.sh "$PREV"
./ops/invalidate-cdn.sh "/index.html"
./ops/check-health.sh --expect-version "$PREV"
```

```ts
type RollbackCheck = {
  versionMatched: boolean;
  errorRateRecovered: boolean;
  keyJourneyRecovered: boolean;
};

function rollbackSucceeded(c: RollbackCheck) {
  return c.versionMatched && c.errorRateRecovered && c.keyJourneyRecovered;
}
```

### 追问

- 「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只演练技术回滚，不演练值班、沟通和权限链路。
- 仅验证“版本切回”，不验证关键业务路径是否恢复。
- 演练后没有改进动作沉淀，下一次仍重复同样问题。

### 延伸

- 可以把回滚演练纳入季度质量目标，和事故复盘指标联动。
- 对高风险系统建议实施“无告警不算恢复”的验收标准。

## release-risk-gate-policy-followup-1

title: 追问：从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [发布治理, 风险分级, 闸门, 追问]
parent: release-risk-gate-policy
generated: followup-script

### 一句话

围绕「发布风险分级与闸门策略：高风险变更如何安全上线」回答追问时，重点说清 发布治理 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底？

### 答案要点

#### 直答

- 追问核心：说明「发布风险分级与闸门策略：高风险变更如何安全上线」上线时如何灰度、观测、回滚（对应追问：从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底）。
- 直接围绕「从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底」作答：先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分。

#### 落地步骤

- 第一步：先限定 发布治理 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 发布风险分级与闸门策略：高风险变更如何安全上线 的结论不成立。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## release-risk-gate-policy-followup-2

title: 追问：从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [发布治理, 风险分级, 闸门, 追问]
parent: release-risk-gate-policy
generated: followup-script

### 一句话

这道追问的关键是把 发布治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 追问核心：说明如何验证「发布风险分级与闸门策略：高风险变更如何安全上线」结论成立，给出 发布治理 的验收路径（对应追问：从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖）。
- 直接围绕「从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」作答：先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分。

#### 落地步骤

- 第一步：发布风险分级与闸门策略：高风险变更如何安全上线 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## release-risk-gate-policy-followup-3

title: 追问：从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线
difficulty: 资深
tags: [发布治理, 风险分级, 闸门, 追问]
parent: release-risk-gate-policy
generated: followup-script

### 一句话

这道追问要直接回应「发布风险分级与闸门策略：高风险变更如何安全上线」在 发布治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线？

### 答案要点

#### 直答

- 追问核心：比较「发布风险分级与闸门策略：高风险变更如何安全上线」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线）。
- 直接围绕「从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」作答：先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分。

#### 落地步骤

- 第一步：先限定 发布治理 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 发布风险分级与闸门策略：高风险变更如何安全上线 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## rollback-drill-mechanism-followup-1

title: 追问：结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [回滚演练, 应急, 发布, 追问]
parent: rollback-drill-mechanism
generated: followup-script

### 一句话

这道追问的关键是把 回滚演练 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 追问核心：说明如何验证「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」结论成立，给出 回滚演练 的验收路径（对应追问：结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素）。
- 直接围绕「结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」作答：先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”。

#### 落地步骤

- 第一步：落地 回滚演练机制：把“能回滚”从口头承诺变成可验证能力 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 回滚演练 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## rollback-drill-mechanism-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [回滚演练, 应急, 发布, 追问]
parent: rollback-drill-mechanism
generated: followup-script

### 一句话

这道追问要直接回应「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」在 回滚演练 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 追问核心：说明如何验证「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」结论成立，给出 回滚演练 的验收路径（对应追问：在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进）。
- 直接围绕「在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进」作答：先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”。

#### 落地步骤

- 第一步：回滚演练机制：把“能回滚”从口头承诺变成可验证能力 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 回滚演练 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## rollback-drill-mechanism-followup-3

title: 追问：这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话
difficulty: 资深
tags: [回滚演练, 应急, 发布, 追问]
parent: rollback-drill-mechanism
generated: followup-script

### 一句话

回答这题时，先给 回滚演练 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话？

### 答案要点

#### 直答

- 追问核心：说明如何验证「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」结论成立，给出 回滚演练 的验收路径（对应追问：这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话）。
- 直接围绕「这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话」作答：先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”。

#### 落地步骤

- 第一步：落地 回滚演练机制：把“能回滚”从口头承诺变成可验证能力 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 回滚演练 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## build-provenance-attestation-gate

title: 构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM]
followups: [build-provenance-attestation-gate-followup-1, build-provenance-attestation-gate-followup-2, build-provenance-attestation-gate-followup-3]

### 一句话

这题的高分关键是把 供应链安全 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

你的团队要把前端发布流程升级为“可审计、可追溯、可阻断”。你会如何设计产物可追溯闸门，避免被篡改包或污染依赖进入生产？

### 答案要点

- 构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要。
- 每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源。
- 产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断。
- provenance 文档要和版本强绑定，避免“版本号存在但证据链缺失”。

#### 工程化补充

- 场景前提：构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

### 代码示例

```yaml
provenance_gate:
  required:
    - sbom_generated
    - artifact_signed
    - signature_verified
    - provenance_attached
  on_fail: block_release
```

```ts
type ProvenanceCheck = {
  sbom: boolean;
  signature: boolean;
  provenance: boolean;
};

function canPublishArtifact(c: ProvenanceCheck) {
  return c.sbom && c.signature && c.provenance;
}
```

### 追问

- 「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做漏洞扫描，不做签名与 provenance，证据链仍然不完整。
- 门禁只提示不阻断，风险版本照样进入生产。
- 审计材料散落在多个系统，事故时无法快速拼接全链路。

### 延伸

- 建议把 provenance 校验结果回写到发布审批流，减少人工反复确认。
- 可按风险等级设不同强度门禁，高风险业务域默认全量开启。

## progressive-release-checkpoint-orchestration

title: 发布编排检查点：分阶段放量、自动判停与有序回退
difficulty: 资深
tags: [发布编排, 灰度, 回滚]
followups: [progressive-release-checkpoint-orchestration-followup-1, progressive-release-checkpoint-orchestration-followup-2, progressive-release-checkpoint-orchestration-followup-3]

### 一句话

回答「发布编排检查点：分阶段放量、自动判停与有序回退」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

你要设计一套前端发布编排流程，要求支持 1% -> 10% -> 50% -> 100% 渐进放量，并在异常时自动暂停或回退。你会如何实现？

### 答案要点

- 把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值。
- 阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）。
- 阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失。
- 回退顺序要预定义：先关功能开关，再回滚版本，最后处理缓存和路由残留。

#### 工程化补充

- 场景前提：发布编排检查点：分阶段放量、自动判停与有序回退 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type CheckpointSignal = { errorRate: number; whiteScreenRate: number; conversionDrop: number };

function canPromote(signal: CheckpointSignal) {
  return (
    signal.errorRate <= 0.01 && signal.whiteScreenRate <= 0.005 && signal.conversionDrop <= 0.01
  );
}
```

```yaml
release_checkpoints:
  - stage: 1_percent
    observe_minutes: 15
  - stage: 10_percent
    observe_minutes: 20
  - stage: 50_percent
    observe_minutes: 30
  - stage: 100_percent
    observe_minutes: 30
on_fail:
  - pause_rollout
  - trigger_rollback_plan
```

### 追问

- 「发布编排检查点：分阶段放量、自动判停与有序回退」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只有放量计划没有判停条件，异常时不知道何时刹车。
- 指标阈值长期不校准，导致误停和漏停并存。
- 回退只回代码不处理缓存与配置，造成“回退后问题仍在”。

### 延伸

- 可将检查点状态接入值班机器人，提升跨团队响应效率。
- 建议季度复盘一次检查点有效性，持续优化放量节奏。

## build-provenance-attestation-gate-followup-1

title: 追问：在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM, 追问]
parent: build-provenance-attestation-gate
generated: followup-script

### 一句话

回答这题时，先给 供应链安全 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 直答

- 追问核心：说明「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」上线时如何灰度、观测、回滚（对应追问：在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控）。
- 直接围绕「在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控」作答：构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要。

#### 落地步骤

- 第一步：构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## build-provenance-attestation-gate-followup-2

title: 追问：以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM, 追问]
parent: build-provenance-attestation-gate
generated: followup-script

### 一句话

这道追问要直接回应「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在 供应链安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 直答

- 追问核心：说明如何验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」结论成立，给出 供应链安全 的验收路径（对应追问：以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性）。
- 直接围绕「以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性」作答：构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要。

#### 落地步骤

- 第一步：先限定 供应链安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## build-provenance-attestation-gate-followup-3

title: 追问：结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM, 追问]
parent: build-provenance-attestation-gate
generated: followup-script

### 一句话

这道追问的关键是把 供应链安全 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 直答

- 追问核心：说明「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」上线时如何灰度、观测、回滚（对应追问：结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑）。
- 直接围绕「结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑」作答：构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要。

#### 落地步骤

- 第一步：构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## progressive-release-checkpoint-orchestration-followup-1

title: 追问：如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [发布编排, 灰度, 回滚, 追问]
parent: progressive-release-checkpoint-orchestration
generated: followup-script

### 一句话

围绕「发布编排检查点：分阶段放量、自动判停与有序回退」回答追问时，重点说清 发布编排 的前提、动作和回退条件。

### 题目

如果面试官追问：如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 直答

- 追问核心：说明「发布编排检查点：分阶段放量、自动判停与有序回退」上线时如何灰度、观测、回滚（对应追问：如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素）。
- 直接围绕「如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」作答：把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值。

#### 落地步骤

- 第一步：发布编排检查点：分阶段放量、自动判停与有序回退 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布编排 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## progressive-release-checkpoint-orchestration-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [发布编排, 灰度, 回滚, 追问]
parent: progressive-release-checkpoint-orchestration
generated: followup-script

### 一句话

回答这题时，先给 发布编排 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 追问核心：说明如何验证「发布编排检查点：分阶段放量、自动判停与有序回退」结论成立，给出 发布编排 的验收路径（对应追问：从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进）。
- 直接围绕「从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进」作答：把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值。

#### 落地步骤

- 第一步：落地 发布编排检查点：分阶段放量、自动判停与有序回退 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布编排 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## progressive-release-checkpoint-orchestration-followup-3

title: 追问：以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话
difficulty: 资深
tags: [发布编排, 灰度, 回滚, 追问]
parent: progressive-release-checkpoint-orchestration
generated: followup-script

### 一句话

这道追问要直接回应「发布编排检查点：分阶段放量、自动判停与有序回退」在 发布编排 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话？

### 答案要点

#### 直答

- 追问核心：说明「发布编排检查点：分阶段放量、自动判停与有序回退」上线时如何灰度、观测、回滚（对应追问：以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话）。
- 直接围绕「以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话」作答：把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值。

#### 落地步骤

- 第一步：发布编排检查点：分阶段放量、自动判停与有序回退 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布编排 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## release-orchestration-control-tower

title: 发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通]
followups: [release-orchestration-control-tower-followup-1, release-orchestration-control-tower-followup-2, release-orchestration-control-tower-followup-3]

### 一句话

这题回答要覆盖 发布编排 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

一次版本发布跨越预发、灰度、全量三个环境，过程中出现“预发通过但灰度异常、回滚后状态不一致”的情况。你会如何设计发布编排指挥台来保证状态一致与止损效率？

### 答案要点

- 先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构。
- 关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”。
- 卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行。
- 指挥台要同时展示技术和业务信号：错误率、白屏率、转化波动并排看。

#### 工程化补充

- 场景前提：发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type ReleaseCheckpoint = {
  env: 'staging' | 'canary' | 'production';
  status: 'pass' | 'block' | 'manual_review';
  errorRate: number;
  conversionDrop: number;
};

function shouldBlockPromotion(c: ReleaseCheckpoint) {
  return c.status === 'block' || c.errorRate > 0.01 || c.conversionDrop > 0.03;
}
```

```yaml
release_control_tower:
  checkpoints:
    - staging_verify
    - canary_health
    - production_gate
  require:
    - unified_state_snapshot
    - rollback_plan_ready
    - incident_commander_on_duty
  block_when:
    error_rate: '> 1%'
    conversion_drop: '> 3%'
```

### 追问

- 「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看流水线绿灯，不看各环境状态是否真实一致。
- 卡点异常时没有标准恢复动作，只能靠临场经验判断。
- 拍板角色不清，导致“都在同步、没人决策”。

### 延伸

- 可把卡点失败模式沉淀为自动建议动作，降低发布值班门槛。
- 建议引入“发布一致性评分”作为季度工程治理指标。

## release-freeze-exception-governance

title: 发布冻结例外治理：紧急需求放行、风险承诺与到期回收
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制]
followups: [release-freeze-exception-governance-followup-1, release-freeze-exception-governance-followup-2, release-freeze-exception-governance-followup-3]

### 一句话

这题回答要覆盖 发布治理 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

大促前进入发布冻结期，但业务提出紧急变更请求。你会如何设计例外放行机制，既保障窗口稳定又不压死关键业务机会？

### 答案要点

- 先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可。
- 放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚。
- 例外发布采用“更小流量 + 更密观测 + 更快回退”节奏。
- 冻结期例外动作要可审计：谁申请、谁审批、谁执行、谁复核全链路留痕。

#### 工程化补充

- 场景前提：发布冻结例外治理：紧急需求放行、风险承诺与到期回收 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type FreezeExceptionRequest = {
  expectedBizGain: number;
  rollbackReady: boolean;
  riskLevel: 'low' | 'medium' | 'high';
};

function canApproveFreezeException(r: FreezeExceptionRequest) {
  return r.expectedBizGain >= 0.05 && r.rollbackReady && r.riskLevel !== 'high';
}
```

```yaml
freeze_exception_policy:
  require:
    - business_gain_statement
    - rollback_drill_evidence
    - risk_owner
    - expiry_date
  rollout:
    initial_traffic: 1_percent
    observation_window_min: 30
  auto_revoke_after_days: 7
```

### 追问

- 「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看业务紧急性，不看回退可执行性和观察窗口。
- 例外放行后不做到期回收，临时策略演变成长期负担。
- 审批链条有签字但无责任闭环，事故后无法复盘归因。

### 延伸

- 可建立“例外放行黑白名单”提升审批效率与一致性。
- 建议将例外质量纳入发布治理 KPI，避免滥用特批路径。

## release-orchestration-control-tower-followup-1

title: 追问：发布指挥台上线前你会先验哪些关键卡点
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通, 追问]
parent: release-orchestration-control-tower
generated: followup-script

### 一句话

这道追问要直接回应「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」在 发布编排 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：发布指挥台真正上线前，你会先验哪些关键卡点，避免“流程很全但现场失灵”？

### 答案要点

#### 直答

- 追问核心：说明「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」上线时如何灰度、观测、回滚（对应追问：发布指挥台真正上线前，你会先验哪些关键卡点，避免“流程很全但现场失灵”）。
- 直接围绕「发布指挥台真正上线前，你会先验哪些关键卡点，避免“流程很全但现场失灵”」作答：先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构。

#### 落地步骤

- 第一步：发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布编排 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## release-orchestration-control-tower-followup-2

title: 追问：你会怎么证明发布指挥台决策是可靠的
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通, 追问]
parent: release-orchestration-control-tower
generated: followup-script

### 一句话

围绕「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」回答追问时，重点说清 发布编排 的前提、动作和回退条件。

### 题目

如果面试官追问：你说这套发布指挥台靠谱，那你会怎么用测试和线上数据证明它的决策值得信任？

### 答案要点

#### 直答

- 追问核心：说明如何验证「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」结论成立，给出 发布编排 的验收路径（对应追问：你说这套发布指挥台靠谱，那你会怎么用测试和线上数据证明它的决策值得信任）。
- 直接围绕「你说这套发布指挥台靠谱，那你会怎么用测试和线上数据证明它的决策值得信任」作答：先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构。

#### 落地步骤

- 第一步：回答 发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 发布编排 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## release-orchestration-control-tower-followup-3

title: 追问：这套发布指挥台要不要继续投入看哪些数据
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通, 追问]
parent: release-orchestration-control-tower
generated: followup-script

### 一句话

围绕「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」回答追问时，重点说清 发布编排 的前提、动作和回退条件。

### 题目

如果面试官追问：半年后评估这套发布指挥台是否继续投入，你会先看哪几组关键数据？

### 答案要点

#### 直答

- 追问核心：说明「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」上线时如何灰度、观测、回滚（对应追问：半年后评估这套发布指挥台是否继续投入，你会先看哪几组关键数据）。
- 直接围绕「半年后评估这套发布指挥台是否继续投入，你会先看哪几组关键数据」作答：先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构。

#### 落地步骤

- 第一步：发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布编排 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## release-freeze-exception-governance-followup-1

title: 追问：冻结例外评审先看哪些边界
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制, 追问]
parent: release-freeze-exception-governance
generated: followup-script

### 一句话

这道追问要直接回应「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」在 发布治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：冻结窗口里要不要放行例外需求，你会先看哪些边界，避免“救业务却伤主线”？

### 答案要点

#### 直答

- 追问核心：围绕「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」给出可执行的落地方案，重点说明 发布治理 怎么做（对应追问：冻结窗口里要不要放行例外需求，你会先看哪些边界，避免“救业务却伤主线”）。
- 直接围绕「冻结窗口里要不要放行例外需求，你会先看哪些边界，避免“救业务却伤主线”」作答：先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可。

#### 落地步骤

- 第一步：发布冻结例外治理：紧急需求放行、风险承诺与到期回收 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## release-freeze-exception-governance-followup-2

title: 追问：上线后看哪些指标判断例外机制有效
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制, 追问]
parent: release-freeze-exception-governance
generated: followup-script

### 一句话

这道追问的关键是把 发布治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：例外机制上了之后，你会看哪些日志和指标来判断它是在帮团队而不是制造新风险？

### 答案要点

#### 直答

- 追问核心：说明如何验证「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」结论成立，给出 发布治理 的验收路径（对应追问：例外机制上了之后，你会看哪些日志和指标来判断它是在帮团队而不是制造新风险）。
- 直接围绕「例外机制上了之后，你会看哪些日志和指标来判断它是在帮团队而不是制造新风险」作答：先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可。

#### 落地步骤

- 第一步：落地 发布冻结例外治理：紧急需求放行、风险承诺与到期回收 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## release-freeze-exception-governance-followup-3

title: 追问：窗口提前时如何收敛例外范围并回补技术债
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制, 追问]
parent: release-freeze-exception-governance
generated: followup-script

### 一句话

围绕「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」回答追问时，重点说清 发布治理 的前提、动作和回退条件。

### 题目

如果面试官追问：上线窗口突然提前，你会怎么收敛例外范围，并把遗留技术债的回补计划讲清楚？

### 答案要点

#### 直答

- 追问核心：说明「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」上线时如何灰度、观测、回滚（对应追问：上线窗口突然提前，你会怎么收敛例外范围，并把遗留技术债的回补计划讲清楚）。
- 直接围绕「上线窗口突然提前，你会怎么收敛例外范围，并把遗留技术债的回补计划讲清楚」作答：先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可。

#### 落地步骤

- 第一步：发布冻结例外治理：紧急需求放行、风险承诺与到期回收 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 发布治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。
