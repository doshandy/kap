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

带 hash 的资源内容变化即 URL 变化，适合长缓存；HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存；这样既能高命中缓存，又能确保用户尽快拿到新版本入口。

### 题目

为什么前端静态资源通常会带 hash，而 HTML 却常常不做长缓存？

### 答案要点

- 带 hash 的资源内容变化即 URL 变化，适合长缓存
- HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存
- 这样既能高命中缓存，又能确保用户尽快拿到新版本入口

#### 补充说明

- 面试中不要只停留在「hash 命名、长效缓存与 HTML 短缓存是发布基础功」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 缓存、发布 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 性能题要先度量再优化，区分实验室指标和真实用户指标，并说明收益与副作用。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 hash 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，hash 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「hash 命名、长效缓存与 HTML 短缓存是发布基础功」采用小步优化更稳。

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

用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk；页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败；解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新。

### 题目

为什么前端发布后，偶尔会出现“刷新一下就好了”的 chunk 加载错误？怎么治理？

### 答案要点

- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新

#### 补充说明

- 面试中不要只停留在「动态 import 失败与旧版本 chunk 被清理怎么处理」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 动态加载、容错 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「动态 import 失败与旧版本 chunk 被清理怎么处理」风险偏高；当前方案可验证、可灰度、可回滚。

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

新版本可能引入接口不兼容、缓存污染、白屏、地区性异常；灰度可以按用户、cookie、比例、入口域名切流；回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件。

### 题目

前端静态站点看似“发文件就行”，为什么仍然需要灰度与回滚设计？

### 答案要点

- 新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 灰度可以按用户、cookie、比例、入口域名切流
- 回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件

#### 补充说明

- 面试中不要只停留在「灰度发布、回滚与零停机切换」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 灰度、回滚 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「灰度发布、回滚与零停机切换」时要先定义 灰度发布 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，灰度发布 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 灰度发布 关键链路先收敛再替换。

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

skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性；clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为；更稳妥的做法常是提示用户“发现新版本，点击刷新更新”。

### 题目

`skipWaiting` 和 `clients.claim` 为什么有争议？PWA 更新提示一般怎么设计？

### 答案要点

- `skipWaiting` 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- `clients.claim` 让新 SW 立即接管现有页面，也可能改变用户当前会话行为
- 更稳妥的做法常是提示用户“发现新版本，点击刷新更新”

#### 补充说明

- 面试中不要只停留在「Service Worker 更新策略的取舍」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 ServiceWorker、PWA 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Service Worker 更新策略的取舍」时要把 Service 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Service 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Service Worker 更新策略的取舍」里当前按阶段替换更稳。

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

静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404；需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径；hash 路由能绕开这个问题，但 URL 语义和分享体验较差。

### 题目

为什么 SPA 用 history 路由部署到静态托管平台时，刷新子路径经常 404？

### 答案要点

- 静态托管默认按物理文件查找路径，`/q/foo` 不存在就直接 404
- 需要服务器重写到 `index.html`，或像 GitHub Pages 这样用 404 fallback 技巧还原路径
- hash 路由能绕开这个问题，但 URL 语义和分享体验较差

#### 补充说明

- 面试中不要只停留在「history 路由、404 fallback 与静态托管适配」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 路由、静态部署 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「history 路由、404 fallback 与静态托管适配」时要把 history 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，history 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「history 路由、404 fallback 与静态托管适配」里当前按阶段替换更稳。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「包体分析与发布前治理」时要先定义 包体分析与发布前治理 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，包体分析与发布前治理 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 包体分析与发布前治理 关键链路先收敛再替换。

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

库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Tree-shaking 失效的常见原因」时要把 Tree-shaking 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Tree-shaking 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「Tree-shaking 失效的常见原因」里当前按阶段替换更稳。

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

默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管；skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致；clientsClaim：activate 后立即接管所有 client。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「PWA Service Worker 升级策略」时要把 PWA 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，PWA 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「PWA Service Worker 升级策略」里当前按阶段替换更稳。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「SemVer 与自动化发版（changeset / semantic-release）」时要先定义 SemVer 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，SemVer 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 SemVer 关键链路先收敛再替换。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端 CI/CD 流水线怎么设计」时要先定义 前端 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端 关键链路先收敛再替换。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 一道题打包优化全部场 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，一道题打包优化全部场 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「一道题打包优化全部场景」采用小步优化更稳。

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

验证要从可复现样例开始：准备正向、边界和失败用例，确认「hash 命名、长效缓存与 HTML 短缓存是发布基础功」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：带 hash 的资源内容变化即 URL 变化，适合长缓存
- 机制：HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存；这样既能高命中缓存，又能确保用户尽快拿到新版本入口
- 落地动作：回答「你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会先看哪些与 缓存 相关的指标来判断「hash 命名、长效缓存与 HTML 短缓存是发布基础功」是不是当前性能瓶颈」必须先给 你会先看哪些与 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会先看哪些与 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会先看哪些与 的计算与缓存路径。

#### 关键细节（可追问）

- 带 hash 的资源内容变化即 URL 变化，适合长缓存
- HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存
- 这样既能高命中缓存，又能确保用户尽快拿到新版本入口

## chunk-failure-followup-1

title: 追问：如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项
difficulty: 进阶
tags: [动态加载, 容错, 追问]
parent: chunk-failure

### 一句话

先界定「动态 import 失败与旧版本 chunk 被清理怎么处理」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 机制：页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败；解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新
- 落地动作：回答「如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项」时要把 动态 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，动态 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要让「动态 import 失败与旧版本 chunk 被清理怎么处理」稳定上线，你会优先补齐哪些与 动态加载 相关的检查项」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新

## gray-release-followup-1

title: 追问：在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [灰度, 回滚, 追问]
parent: gray-release

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「灰度发布、回滚与零停机切换」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 机制：灰度可以按用户、cookie、比例、入口域名切流；回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件
- 落地动作：回答「在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，真要把「灰度发布、回滚与零停机切换」推到线上，你会如何围绕 灰度 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- 新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 灰度可以按用户、cookie、比例、入口域名切流
- 回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件

## service-worker-update-followup-1

title: 追问：如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项
difficulty: 进阶
tags: [ServiceWorker, PWA, 追问]
parent: service-worker-update

### 一句话

先界定「Service Worker 更新策略的取舍」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- 机制：clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为；更稳妥的做法常是提示用户“发现新版本，点击刷新更新”
- 落地动作：回答「如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「如果要让「Service Worker 更新策略的取舍」稳定上线，你会优先补齐哪些与 PWA 相关的检查项」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为
- 更稳妥的做法常是提示用户“发现新版本，点击刷新更新”

## spa-fallback-followup-1

title: 追问：在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点
difficulty: 基础
tags: [路由, 静态部署, 追问]
parent: spa-fallback

### 一句话

先界定「history 路由、404 fallback 与静态托管适配」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点？

### 答案要点

#### 标准回答（直接作答）

- 结论：静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 机制：需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径；hash 路由能绕开这个问题，但 URL 语义和分享体验较差
- 落地动作：回答「在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点」时要把 history 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，history 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「history 路由、404 fallback 与静态托管适配」进入长周期维护后，你会重点巡检哪些与 路由 相关的高风险边界点」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径
- hash 路由能绕开这个问题，但 URL 语义和分享体验较差

## bundle-governance-followup-1

title: 追问：以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [包体治理, 分析, 追问]
parent: bundle-governance

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「包体分析与发布前治理」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 机制：看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包；看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗
- 落地动作：回答「以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「包体分析与发布前治理」为例，真要把「包体分析与发布前治理」推到线上，你会如何围绕 包体治理 设计灰度节奏、回滚条件和迁移路径」时要先定义 包体分析与发布前治理 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，包体分析与发布前治理 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 包体分析与发布前治理 关键链路先收敛再替换。

#### 关键细节（可追问）

- 看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包
- 看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗

## tree-shaking-deep-followup-1

title: 追问：围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真
difficulty: 进阶
tags: [Tree-shaking, sideEffects, 追问]
parent: tree-shaking-deep

### 一句话

先界定「Tree-shaking 失效的常见原因」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 机制：副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用；顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留
- 落地动作：回答「围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真」时要把 Tree-shaking 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Tree-shaking 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「围绕「Tree-shaking 失效的常见原因」做方案评审时，哪些 Tree-shaking 边界输入最容易导致结论失真」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用
- 顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留

## sw-update-strategies-followup-1

title: 追问：在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束是什么
difficulty: 资深
tags: [PWA, Service Worker, 追问]
parent: sw-update-strategies

### 一句话

先界定「PWA Service Worker 升级策略」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- 机制：skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致；clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合
- 落地动作：回答「在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束的定义」时要把 PWA 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，PWA 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「PWA Service Worker 升级策略」场景下，把「PWA Service Worker 升级策略」放到真实业务里，围绕 PWA 最容易被低估的边界条件和前置约束的定义」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致
- clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合

## semver-release-followup-1

title: 追问：结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [发布, 工程化, 追问]
parent: semver-release

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：MAJOR：不向后兼容的改动（删 API、改默认行为）
- 机制：MINOR：向后兼容的新功能；PATCH：向后兼容的 bug fix
- 落地动作：回答「结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，真要把「SemVer 与自动化发版（changeset / semantic-release）」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- MAJOR：不向后兼容的改动（删 API、改默认行为）
- MINOR：向后兼容的新功能
- PATCH：向后兼容的 bug fix

## ci-cd-frontend-pipeline-followup-1

title: 追问：围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险
difficulty: 资深
tags: [CI/CD, 工程化, 高频, 追问]
parent: ci-cd-frontend-pipeline

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端 CI/CD 流水线怎么设计」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：PR 阶段（必须快，目标 < 5 min）
- 机制：安装依赖（pnpm + 缓存 store）；lint（eslint --cache）
- 落地动作：回答「围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「前端 CI/CD 流水线怎么设计」做迁移时，你会怎样拆分批次，降低回滚风险」时要先定义 前端 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端 关键链路先收敛再替换。

#### 关键细节（可追问）

- PR 阶段（必须快，目标 < 5 min）
- 安装依赖（pnpm + 缓存 store）
- lint（eslint --cache）

## bundle-optimization-tactics-followup-1

title: 追问：真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号
difficulty: 资深
tags: [构建, 性能, 高频, 追问]
parent: bundle-optimization-tactics

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「一道题打包优化全部场景」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善，要能回到原题机制定位原因。

### 题目

如果面试官追问：真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 机制：找 top 10 最大依赖；bundle size CI 化（size-limit）
- 落地动作：回答「真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 真要定位 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，真要定位 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「真要定位「一道题打包优化全部场景」的性能主矛盾，你会先看哪几组关键观测信号」采用小步优化更稳。

#### 关键细节（可追问）

- rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 找 top 10 最大依赖
- bundle size CI 化（size-limit）

## web-platform-baseline-governance

title: Baseline、Browserslist 与现代浏览器兼容策略怎么治理
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性]
links: [bundle-optimization-tactics, 07-engineering/bundler-ecosystem, 04-css/selector-modern]
followups: [web-platform-baseline-governance-followup-1, web-platform-baseline-governance-followup-2, web-platform-baseline-governance-followup-3]

### 一句话

兼容策略不是“永远支持尽可能多浏览器”，而是用业务用户数据、Web Platform Baseline、Browserslist、polyfill 成本和降级方案共同决定构建目标，定期删除已经不划算的兼容包袱。

### 题目

团队想提高构建目标、减少 polyfill 和兼容代码时，Baseline、Browserslist、真实用户浏览器占比应如何一起使用？

### 答案要点

- Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板。
- Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用。
- 真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”。
- 提高目标要灰度：先在低风险入口开启现代产物、观察错误率和白屏率，再逐步删除老 polyfill 和兼容分支。
- 兼容策略要文档化：哪些浏览器算 SLO 内、哪些只保证核心链路、哪些需要升级提示，避免每个项目重复争论。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」时先约定 Baseline 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 Baseline 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

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

验证要从可复现样例开始：准备正向、边界和失败用例，确认「hash 命名、长效缓存与 HTML 短缓存是发布基础功」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：带 hash 的资源内容变化即 URL 变化，适合长缓存
- 机制：HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存；这样既能高命中缓存，又能确保用户尽快拿到新版本入口
- 落地动作：回答「以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 hash 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，hash 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「以「hash 命名、长效缓存与 HTML 短缓存是发布基础功」为例，你会怎样验证「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 维度上的优化收益在真实设备和真实网络下也成立」采用小步优化更稳。

#### 关键细节（可追问）

- 带 hash 的资源内容变化即 URL 变化，适合长缓存
- HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存
- 这样既能高命中缓存，又能确保用户尽快拿到新版本入口

## hashing-cache-followup-3

title: 追问：结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 基础
tags: [缓存, 发布, 追问]
parent: hashing-cache
generated: followup-script

### 一句话

推动「hash 命名、长效缓存与 HTML 短缓存是发布基础功」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「hash 命名、长效缓存与 HTML 短缓存是发布基础功」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：带 hash 的资源内容变化即 URL 变化，适合长缓存
- 机制：HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存；这样既能高命中缓存，又能确保用户尽快拿到新版本入口
- 落地动作：回答「结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果「hash 命名、长效缓存与 HTML 短缓存是发布基础功」在 缓存 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」必须先给 hash 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，hash 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 hash 的计算与缓存路径。

#### 关键细节（可追问）

- 带 hash 的资源内容变化即 URL 变化，适合长缓存
- HTML 是资源入口，负责引用最新 chunk，因此应短缓存甚至不缓存
- 这样既能高命中缓存，又能确保用户尽快拿到新版本入口

## gray-release-followup-2

title: 追问：在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线
difficulty: 进阶
tags: [灰度, 回滚, 追问]
parent: gray-release
generated: followup-script

### 一句话

推动「灰度发布、回滚与零停机切换」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「灰度发布、回滚与零停机切换」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 机制：灰度可以按用户、cookie、比例、入口域名切流；回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件
- 落地动作：回答「在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「灰度发布、回滚与零停机切换」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 灰度 安排「灰度发布、回滚与零停机切换」的渐进改造路线」时要先定义 灰度发布 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，灰度发布 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 灰度发布 关键链路先收敛再替换。

#### 关键细节（可追问）

- 新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 灰度可以按用户、cookie、比例、入口域名切流
- 回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件

## gray-release-followup-3

title: 追问：在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标
difficulty: 进阶
tags: [灰度, 回滚, 追问]
parent: gray-release
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「灰度发布、回滚与零停机切换」不是只在理想输入下成立。；再补可观测指标：围绕「灰度发布、回滚与零停机切换」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 机制：灰度可以按用户、cookie、比例、入口域名切流；回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件
- 落地动作：回答「在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 灰度发布 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 灰度发布，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「灰度发布、回滚与零停机切换」场景下，要判断「灰度发布、回滚与零停机切换」值不值得长期维护，你会先盯哪些和 灰度 相关的核心指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 新版本可能引入接口不兼容、缓存污染、白屏、地区性异常
- 灰度可以按用户、cookie、比例、入口域名切流
- 回滚要保证旧入口和旧静态资源仍可访问，而不是只覆盖新文件

## bundle-governance-followup-2

title: 追问：在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界
difficulty: 进阶
tags: [包体治理, 分析, 追问]
parent: bundle-governance
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「包体分析与发布前治理」在当前约束下为什么成立。；回答结构可按「触发条件 -> 包体治理 机制 -> 风险兜底」展开，并以「包体分析与发布前治理」补一条失败场景，能体现工程拆解能力。；不要只罗列工具名或 API。

### 题目

如果面试官追问：在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 机制：看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包；看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗
- 落地动作：回答「在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 包体分析与发布前治理 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 包体分析与发布前治理，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「包体分析与发布前治理」场景下，面对跨团队协作成本，你会如何围绕 包体治理 规划「包体分析与发布前治理」的阶段目标与交付边界」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包
- 看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗

## bundle-governance-followup-3

title: 追问：在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [包体治理, 分析, 追问]
parent: bundle-governance
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「包体分析与发布前治理」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 包体治理 方案动作 -> 验证结果」，并用「包体分析与发布前治理」举一条主链路说明。；如果涉及「包体分析与发布前治理」的技术细节。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 机制：看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包；看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗
- 落地动作：回答「在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 为了确认 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 为了确认，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，为了确认「包体分析与发布前治理」在 包体治理 上能持续跑稳，你会长期追哪些稳定性和效率信号」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 看是否有大依赖被整包引入（如 lodash、moment、整 echarts），需切按需导入
- 看是否存在多版本重复依赖（npm/pnpm dedupe），同一库不同版本会双倍打包
- 看异步 chunk 切分：首屏是否把低频页面代码打进主包；vendor 是否过细或过粗

## semver-release-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序
difficulty: 进阶
tags: [发布, 工程化, 追问]
parent: semver-release
generated: followup-script

### 一句话

推动「SemVer 与自动化发版（changeset / semantic-release）」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：MAJOR：不向后兼容的改动（删 API、改默认行为）
- 机制：MINOR：向后兼容的新功能；PATCH：向后兼容的 bug fix
- 落地动作：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 发布 定义「SemVer 与自动化发版（changeset / semantic-release）」的先后改造顺序」时要先定义 当团队成熟度不一致时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队成熟度不一致时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队成熟度不一致时 关键链路先收敛再替换。

#### 关键细节（可追问）

- MAJOR：不向后兼容的改动（删 API、改默认行为）
- MINOR：向后兼容的新功能
- PATCH：向后兼容的 bug fix

## semver-release-followup-3

title: 追问：结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险
difficulty: 进阶
tags: [发布, 工程化, 追问]
parent: semver-release
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「SemVer 与自动化发版」落到真实交付，而不是停在概念层。；讲「SemVer 与自动化发版」时先给 发布链路 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：MAJOR：不向后兼容的改动（删 API、改默认行为）
- 机制：MINOR：向后兼容的新功能；PATCH：向后兼容的 bug fix
- 落地动作：回答「结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果「SemVer 与自动化发版」进入维护期，你会优先围绕 发布链路 监控哪些指标来预警风险」时要先定义 SemVer 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，SemVer 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 SemVer 关键链路先收敛再替换。

#### 关键细节（可追问）

- MAJOR：不向后兼容的改动（删 API、改默认行为）
- MINOR：向后兼容的新功能
- PATCH：向后兼容的 bug fix

## ci-cd-frontend-pipeline-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序
difficulty: 资深
tags: [CI/CD, 工程化, 高频, 追问]
parent: ci-cd-frontend-pipeline
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「前端 CI/CD 流水线怎么设计」讲成只在理想输入下可用。；围绕「前端 CI/CD 流水线怎么设计」组织答案时，建议按「约束来源 -> CI/CD 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：PR 阶段（必须快，目标 < 5 min）
- 机制：安装依赖（pnpm + 缓存 store）；lint（eslint --cache）
- 落地动作：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 CI/CD 定义「前端 CI/CD 流水线怎么设计」的先后改造顺序」时要先定义 当团队成熟度不一致时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队成熟度不一致时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队成熟度不一致时 关键链路先收敛再替换。

#### 关键细节（可追问）

- PR 阶段（必须快，目标 < 5 min）
- 安装依赖（pnpm + 缓存 store）
- lint（eslint --cache）

## ci-cd-frontend-pipeline-followup-3

title: 追问：以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据
difficulty: 资深
tags: [CI/CD, 工程化, 高频, 追问]
parent: ci-cd-frontend-pipeline
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端 CI/CD 流水线怎么设计」不是只在理想输入下成立。；再补可观测指标：围绕「前端 CI/CD 流水线怎么设计」的工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据？

### 答案要点

#### 标准回答（直接作答）

- 结论：PR 阶段（必须快，目标 < 5 min）
- 机制：安装依赖（pnpm + 缓存 store）；lint（eslint --cache）
- 落地动作：回答「以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「前端 CI/CD 流水线怎么设计」为例，当团队讨论「前端 CI/CD 流水线怎么设计」去留时，你会给出哪几组关键指标作为决策依据」时要先定义 前端 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，前端 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 前端 关键链路先收敛再替换。

#### 关键细节（可追问）

- PR 阶段（必须快，目标 < 5 min）
- 安装依赖（pnpm + 缓存 store）
- lint（eslint --cache）

## bundle-optimization-tactics-followup-2

title: 追问：在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 资深
tags: [构建, 性能, 高频, 追问]
parent: bundle-optimization-tactics
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「一道题打包优化全部场景」时要能同时解释收益、代价和失败信号。；讲「一道题打包优化全部场景」时先给 构建 的判断口径，再补执行动作和回退条件，会更像真实评审发言。；如果涉及「一道题打包优化全部场景」的技术细节。

### 题目

如果面试官追问：在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 标准回答（直接作答）

- 结论：rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 机制：找 top 10 最大依赖；bundle size CI 化（size-limit）
- 落地动作：回答「在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当「一道题打包优化全部场景」优化后，你会优先看哪些真实用户信号来确认收益」必须先给 一道题打包优化全部场 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，一道题打包优化全部场 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 一道题打包优化全部场 的计算与缓存路径。

#### 关键细节（可追问）

- rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 找 top 10 最大依赖
- bundle size CI 化（size-limit）

## bundle-optimization-tactics-followup-3

title: 追问：在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 资深
tags: [构建, 性能, 高频, 追问]
parent: bundle-optimization-tactics
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「一道题打包优化全部场景」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 构建 方案动作 -> 验证结果」，并用「一道题打包优化全部场景」举一条主链路说明。。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 标准回答（直接作答）

- 结论：rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 机制：找 top 10 最大依赖；bundle size CI 化（size-limit）
- 落地动作：回答「在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 一道题打包优化全部场 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，一道题打包优化全部场 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在当前团队与业务约束下，围绕「一道题打包优化全部场景」在 构建 上的优化决策，你会如何量化收益、风险和长期维护成本」采用小步优化更稳。

#### 关键细节（可追问）

- rollup-plugin-visualizer / vite-bundle-visualizer / webpack-bundle-analyzer
- 找 top 10 最大依赖
- bundle size CI 化（size-limit）

## web-platform-baseline-governance-followup-1

title: 追问：以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性, 追问]
parent: web-platform-baseline-governance
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」在当前约束下为什么成立。；建议按「输入约束 -> Baseline 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除？

### 答案要点

#### 标准回答（直接作答）

- 结论：Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板
- 机制：Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用；真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”
- 落地动作：回答「以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」为例，如何判断一个 polyfill 该保留、按需加载还是删除」时先约定 Baseline 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 Baseline 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板
- Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用
- 真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”

## web-platform-baseline-governance-followup-2

title: 追问：在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性, 追问]
parent: web-platform-baseline-governance
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」落到真实交付，而不是停在概念层。；可以按「问题背景 -> Baseline 机制 -> 取舍边界」回答。

### 题目

如果面试官追问：在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归？

### 答案要点

#### 标准回答（直接作答）

- 结论：Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板
- 机制：Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用；真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”
- 落地动作：回答「在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」场景下，现代产物和 legacy 产物双发时，如何监控兼容回归」时先约定 Baseline 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 Baseline 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板
- Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用
- 真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”

## web-platform-baseline-governance-followup-3

title: 追问：从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策
difficulty: 进阶
tags: [Baseline, Browserslist, Polyfill, 兼容性, 追问]
parent: web-platform-baseline-governance
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Baseline、Browserslist 与现代浏览器兼容策略怎么治理」在当前约束下为什么成立。；建议按「输入约束 -> Baseline 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策？

### 答案要点

#### 标准回答（直接作答）

- 结论：Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板
- 机制：Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用；真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”
- 落地动作：回答「从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 从工程落地角度看 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 从工程落地角度看 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「从工程落地角度看，Baseline 能解决哪些共识问题，不能替代哪些业务决策」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- Browserslist 决定 Babel、Autoprefixer、打包工具的转译目标；它应该来自业务用户数据，而不是直接复制模板
- Web Platform Baseline 提供“某个 Web 能力在主流浏览器中是否稳定可用”的公共参考，适合辅助判断新 API 是否能默认使用
- 真实治理流程：先看 RUM/日志里的浏览器和 WebView 分布，再评估 polyfill/转译成本，最后分层制定“默认支持、降级支持、不支持提示”

## chunk-failure-followup-2

title: 追问：在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [动态加载, 容错, 追问]
parent: chunk-failure
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「动态 import 失败与旧版本 chunk 被清理怎么处理」在当前约束下为什么成立。；建议按「输入约束 -> 动态加载 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 机制：页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败；解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新
- 落地动作：回答「在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「动态 import 失败与旧版本 chunk 被清理怎么处理」场景下，上线后你会盯哪些与 动态加载 相关的日志与指标，来确认这套方案确实带来改进」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新

## chunk-failure-followup-3

title: 追问：以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏
difficulty: 进阶
tags: [动态加载, 容错, 追问]
parent: chunk-failure
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「动态 import 失败与旧版本 chunk 被清理怎么处理」落到真实交付，而不是停在概念层。；讲「动态 import 失败与旧版本 chunk 被清理怎么处理」时先给 动态加载 的判断口径。

### 题目

如果面试官追问：以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 机制：页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败；解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新
- 落地动作：回答「以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「动态 import 失败与旧版本 chunk 被清理怎么处理」为例，当兼容性要求提升或预算收紧时，你会如何围绕 动态加载 调整方案边界与实施节奏」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新

## service-worker-update-followup-2

title: 追问：从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 进阶
tags: [ServiceWorker, PWA, 追问]
parent: service-worker-update
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Service Worker 更新策略的取舍」讲成只在理想输入下可用。；建议按「输入约束 -> ServiceWorker 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 标准回答（直接作答）

- 结论：skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- 机制：clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为；更稳妥的做法常是提示用户“发现新版本，点击刷新更新”
- 落地动作：回答「从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，如果要向团队复盘 ServiceWorker 相关优化，你会展示哪些关键日志和指标来支撑结论」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为
- 更稳妥的做法常是提示用户“发现新版本，点击刷新更新”

## service-worker-update-followup-3

title: 追问：以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏
difficulty: 进阶
tags: [ServiceWorker, PWA, 追问]
parent: service-worker-update
generated: followup-script

### 一句话

规模变大后先重新评估「Service Worker 更新策略的取舍」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Service Worker 更新策略的取舍」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- 机制：clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为；更稳妥的做法常是提示用户“发现新版本，点击刷新更新”
- 落地动作：回答「以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「Service Worker 更新策略的取舍」为例，如果目标不变但约束更严，你会如何围绕 ServiceWorker 调整「Service Worker 更新策略的取舍」方案的边界和节奏」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- skipWaiting 能让新 SW 更快生效，但可能打断旧页面运行中的资源一致性
- clients.claim 让新 SW 立即接管现有页面，也可能改变用户当前会话行为
- 更稳妥的做法常是提示用户“发现新版本，点击刷新更新”

## spa-fallback-followup-2

title: 追问：为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标
difficulty: 基础
tags: [路由, 静态部署, 追问]
parent: spa-fallback
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「history 路由、404 fallback 与静态托管适配」不是只在理想输入下成立。。

### 题目

如果面试官追问：为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 机制：需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径；hash 路由能绕开这个问题，但 URL 语义和分享体验较差
- 落地动作：回答「为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「为了确认「history 路由、404 fallback 与静态托管适配」不是“看起来有效”，你会如何安排测试证据和观测指标」要明确 为了确认 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 为了确认 的高风险边界。

#### 关键细节（可追问）

- 静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径
- hash 路由能绕开这个问题，但 URL 语义和分享体验较差

## spa-fallback-followup-3

title: 追问：在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径
difficulty: 基础
tags: [路由, 静态部署, 追问]
parent: spa-fallback
generated: followup-script

### 一句话

推动「history 路由、404 fallback 与静态托管适配」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 机制：需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径；hash 路由能绕开这个问题，但 URL 语义和分享体验较差
- 落地动作：回答「在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「history 路由、404 fallback 与静态托管适配」场景下，当需求复杂度增长但团队产能有限时，你会如何围绕 路由 拆分「history 路由、404 fallback 与静态托管适配」的落地路径」时要先说清输入规模、复杂度上限和内存预算，这三项决定 history 是否可行。
- 失败场景：例如漏掉重复值/越界输入，history 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- 静态托管默认按物理文件查找路径，/q/foo 不存在就直接 404
- 需要服务器重写到 index.html，或像 GitHub Pages 这样用 404 fallback 技巧还原路径
- hash 路由能绕开这个问题，但 URL 语义和分享体验较差

## tree-shaking-deep-followup-2

title: 追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效
difficulty: 进阶
tags: [Tree-shaking, sideEffects, 追问]
parent: tree-shaking-deep
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「Tree-shaking 失效的常见原因」时要能同时解释收益、代价和失败信号。；可以按「问题背景 -> Tree-shaking 机制 -> 取舍边界」回答，再用「Tree-shaking 失效的常见原因」补一个反例。

### 题目

如果面试官追问：结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效？

### 答案要点

#### 标准回答（直接作答）

- 结论：库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 机制：副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用；顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留
- 落地动作：回答「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，为了避免主观判断，你会怎样用测试证据和线上指标共同证明 Tree-shaking 方案有效」要明确 为了避免主观判断 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 为了避免主观判断 的高风险边界。

#### 关键细节（可追问）

- 库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用
- 顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留

## tree-shaking-deep-followup-3

title: 追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段
difficulty: 进阶
tags: [Tree-shaking, sideEffects, 追问]
parent: tree-shaking-deep
generated: followup-script

### 一句话

规模变大后先重新评估「Tree-shaking 失效的常见原因」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Tree-shaking 失效的常见原因」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 机制：副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用；顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留
- 落地动作：回答「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，如果兼容性压力突然升高，你会如何围绕 Tree-shaking 重新划分「Tree-shaking 失效的常见原因」的实施阶段」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 库不是 ESM：CJS 不能 tree-shake，要看 package.json 是否有 "type": "module" 或 exports 提供 ESM 入口
- 副作用：package.json 里 "sideEffects": false 才能让打包器认为 import 无副作用
- 顶层副作用：import 'foo/style.css' / Object.assign(window, ...) 都是副作用，必须保留

## sw-update-strategies-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [PWA, Service Worker, 追问]
parent: sw-update-strategies
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「PWA Service Worker 升级策略」时要能同时解释收益、代价和失败信号。；讲「PWA Service Worker 升级策略」时先给 PWA 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- 机制：skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致；clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合
- 落地动作：回答「在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，为了证明这个方案在 PWA 维度有效，你会怎么设计测试闭环和线上观测指标」要明确 为了证明这个方案在 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 为了证明这个方案在 的高风险边界。

#### 关键细节（可追问）

- 默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致
- clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合

## sw-update-strategies-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏
difficulty: 资深
tags: [PWA, Service Worker, 追问]
parent: sw-update-strategies
generated: followup-script

### 一句话

规模变大后先重新评估「PWA Service Worker 升级策略」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「PWA Service Worker 升级策略」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- 机制：skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致；clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合
- 落地动作：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏」时要把 你会如何围绕 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何围绕 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，如果目标不变但约束更严，你会如何围绕 PWA 调整「PWA Service Worker 升级策略」方案的边界和节奏」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 默认行为：新 SW 安装完后处于 waiting 状态，老 SW 关闭所有标签后才接管
- skipWaiting：在 install 里调用，立即激活，但要小心新旧资源版本不一致
- clientsClaim：activate 后立即接管所有 client，和 skipWaiting 配合

## release-risk-gate-policy

title: 发布风险分级与闸门策略：高风险变更如何安全上线
followups: [release-risk-gate-policy-followup-1, release-risk-gate-policy-followup-2, release-risk-gate-policy-followup-3]
difficulty: 资深
tags: [发布治理, 风险分级, 闸门]

### 一句话

发布治理的关键不是“流程多”，而是“风险可量化”：按变更风险分级绑定不同闸门，才能让高风险变更慢下来、低风险变更快起来。

### 题目

面对日常迭代与大版本并行的发布节奏，你会如何设计风险分级与发布闸门，既保证速度又控制事故概率？

### 答案要点

- 先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分。
- 分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察。
- 闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件。
- 高风险发布要做“前置准备”：明确回滚入口、开关策略、值班安排和观测面板，避免上线后临时补救。
- 设立发布窗口与冻结规则：大促、结算、活动期间提升闸门等级，减少关键时段非必要变更。
- 保留紧急修复通道：允许在受控条件下快速放行，但要附带事后审计和补测义务。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 发布风险分级与闸门策 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，发布风险分级与闸门策 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「发布风险分级与闸门策略：高风险变更如何安全上线」风险不足；当前优先服务端强校验，因为可审计、可回滚。

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

真正可靠的发布不是“看起来能回滚”，而是“定期演练过回滚”：路径、权限、数据兼容、观测和沟通都要在平时被验证。

### 题目

团队都说自己支持回滚，但线上事故时常常回不去。你会如何设计回滚演练机制，保证关键时刻可用？

### 答案要点

- 先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”。
- 资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”。
- 兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存。
- 演练要场景化：白屏、接口 5xx、第三方降级、错误率突增等都应有固定 drill 剧本。
- 演练结果要量化：回滚耗时、恢复成功率、误操作率、告警收敛时间作为持续改进指标。
- 演练后要闭环：更新 Runbook、自动化脚本和权限体系，避免下次仍靠“手工记忆”执行。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 回滚演练机制 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 回滚演练机制，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」按阶段灰度，每阶段可验收可撤回。

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

推动「发布风险分级与闸门策略：高风险变更如何安全上线」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「发布风险分级与闸门策略：高风险变更如何安全上线」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分
- 机制：分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察；闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件
- 落地动作：回答「从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，真把「发布风险分级与闸门策略：高风险变更如何安全上线」放到生产环境后，你会如何围绕 发布治理 划清信任边界并安排服务端兜底」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分
- 分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察
- 闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件

## release-risk-gate-policy-followup-2

title: 追问：从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [发布治理, 风险分级, 闸门, 追问]
parent: release-risk-gate-policy
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「发布风险分级与闸门策略：高风险变更如何安全上线」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> 发布治理 方案动作 -> 验证结果」。

### 题目

如果面试官追问：从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分
- 机制：分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察；闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件
- 落地动作：回答「从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，你会如何围绕 发布治理 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分
- 分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察
- 闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件

## release-risk-gate-policy-followup-3

title: 追问：从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线
difficulty: 资深
tags: [发布治理, 风险分级, 闸门, 追问]
parent: release-risk-gate-policy
generated: followup-script

### 一句话

推动「发布风险分级与闸门策略：高风险变更如何安全上线」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「发布风险分级与闸门策略：高风险变更如何安全上线」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分
- 机制：分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察；闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件
- 落地动作：回答「从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当「发布风险分级与闸门策略：高风险变更如何安全上线」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先定义风险分级模型：改动面、依赖变化、关键路径影响、数据兼容性、回滚复杂度共同打分
- 分级后绑定不同发布路径：低风险走自动化快车道，高风险必须通过额外审批、演练和灰度观察
- 闸门要自动执行：质量检查、E2E、性能回归、bundle 漂移、错误预算状态都应作为阻断条件

## rollback-drill-mechanism-followup-1

title: 追问：结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [回滚演练, 应急, 发布, 追问]
parent: rollback-drill-mechanism
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」在当前约束下为什么成立。；回答结构可按「触发条件 -> 回滚演练 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”
- 机制：资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”；兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存
- 落地动作：回答「结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果要做「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时要先定义 回滚演练机制 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，回滚演练机制 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 回滚演练机制 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”
- 资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”
- 兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存

## rollback-drill-mechanism-followup-2

title: 追问：在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [回滚演练, 应急, 发布, 追问]
parent: rollback-drill-mechanism
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」时要能同时解释收益、代价和失败信号。；讲「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」时先给 回滚演练 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”
- 机制：资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”；兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存
- 落地动作：回答「在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，上线后你会盯哪些与 回滚演练 相关的日志与指标，来确认这套方案确实带来改进」时要先定义 上线后你会盯哪些与 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，上线后你会盯哪些与 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 上线后你会盯哪些与 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”
- 资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”
- 兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存

## rollback-drill-mechanism-followup-3

title: 追问：这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话
difficulty: 资深
tags: [回滚演练, 应急, 发布, 追问]
parent: rollback-drill-mechanism
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」不是只在理想输入下成立。。

### 题目

如果面试官追问：这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”
- 机制：资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”；兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存
- 落地动作：回答「这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「这套「回滚演练机制：把“能回滚”从口头承诺变成可验证能力」要不要继续投人投钱，你会盯哪几组和 回滚演练 相关的数据先说话」时要先定义 这套 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，这套 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 这套 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义回滚目标：明确 RTO（恢复时长）和关键业务恢复标准，不要只说“尽快恢复”
- 资产要可回退：静态资源多版本保留、入口可切换、特性开关可关闭，避免“代码回了资源没回”
- 兼容策略要前置：前后端协议、配置、缓存和数据结构要支持短期双版本共存

## build-provenance-attestation-gate

title: 构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM]
followups: [build-provenance-attestation-gate-followup-1, build-provenance-attestation-gate-followup-2, build-provenance-attestation-gate-followup-3]

### 一句话

前端发布的高风险不只在业务逻辑，还在供应链来源：把 SBOM、产物签名与 provenance 做成发布闸门，才能回答“这份产物到底从哪来、能否信任”。

### 题目

你的团队要把前端发布流程升级为“可审计、可追溯、可阻断”。你会如何设计产物可追溯闸门，避免被篡改包或污染依赖进入生产？

### 答案要点

- 构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要。
- 每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源。
- 产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断。
- provenance 文档要和版本强绑定，避免“版本号存在但证据链缺失”。
- 安全门禁与业务门禁并行：通过功能测试但供应链不合格也不能放行。
- 发布后保留审计证据最小集，支持事故期间快速定位“受影响版本范围”。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」时要先确认 构建产物可追溯闸门 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，构建产物可追溯闸门 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 构建产物可追溯闸门 链路分层收口再逐步统一。

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

发布失败常见于“放量节奏失控”：用检查点编排把每一段放量都绑定验收与判停条件，才能在异常扩散前精准止损。

### 题目

你要设计一套前端发布编排流程，要求支持 1% -> 10% -> 50% -> 100% 渐进放量，并在异常时自动暂停或回退。你会如何实现？

### 答案要点

- 把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值。
- 阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）。
- 阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失。
- 回退顺序要预定义：先关功能开关，再回滚版本，最后处理缓存和路由残留。
- 所有阶段动作要可审计：谁触发、何时触发、为何通过/阻断必须可追踪。
- 发布后自动生成阶段报告，沉淀下次放量阈值与策略调整依据。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「发布编排检查点：分阶段放量、自动判停与有序回退」时要先定义 发布编排检查点 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，发布编排检查点 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 发布编排检查点 关键链路先收敛再替换。

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

先把目标和约束说清楚，再展开实现：这能避免把「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 供应链安全 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 标准回答（直接作答）

- 结论：构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要
- 机制：每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源；产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断
- 落地动作：回答「在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时要先确认 构建产物可追溯闸门 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，构建产物可追溯闸门 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 构建产物可追溯闸门 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要
- 每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源
- 产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断

## build-provenance-attestation-gate-followup-2

title: 追问：以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM, 追问]
parent: build-provenance-attestation-gate
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 标准回答（直接作答）

- 结论：构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要
- 机制：每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源；产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断
- 落地动作：回答「以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」为例，你会怎样验证「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」在真实攻击流量下仍能维持防护效果与可观测性」时要先确认 构建产物可追溯闸门 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，构建产物可追溯闸门 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 构建产物可追溯闸门 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要
- 每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源
- 产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断

## build-provenance-attestation-gate-followup-3

title: 追问：结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 资深
tags: [供应链安全, 发布闸门, SBOM, 追问]
parent: build-provenance-attestation-gate
generated: followup-script

### 一句话

规模变大后先重新评估「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 标准回答（直接作答）

- 结论：构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要
- 机制：每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源；产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断
- 落地动作：回答「结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会怎样给 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，你会怎样给 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「结合真实业务约束，你会怎样给「构建产物可追溯闸门：SBOM、签名与 provenance 如何接入发布」定义分层策略，让高风险场景更严格、低风险场景更顺滑」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 构建链路必须可证明：记录源码提交、构建环境、依赖锁文件和构建命令摘要
- 每次发布产物都要生成并附带 SBOM，便于漏洞扫描和后续溯源
- 产物签名与校验前置到发布流水线，签名缺失或验签失败直接阻断

## progressive-release-checkpoint-orchestration-followup-1

title: 追问：如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素
difficulty: 资深
tags: [发布编排, 灰度, 回滚, 追问]
parent: progressive-release-checkpoint-orchestration
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「发布编排检查点：分阶段放量、自动判停与有序回退」讲成只在理想输入下可用。；建议按「输入约束 -> 发布编排 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？

### 答案要点

#### 标准回答（直接作答）

- 结论：把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值
- 机制：阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）；阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失
- 落地动作：回答「如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 发布编排检查点 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 发布编排检查点，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「如果要做「发布编排检查点：分阶段放量、自动判停与有序回退」的稳定性评审，你会先盘点哪些容易被忽视的边界因素」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值
- 阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）
- 阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失

## progressive-release-checkpoint-orchestration-followup-2

title: 追问：从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 资深
tags: [发布编排, 灰度, 回滚, 追问]
parent: progressive-release-checkpoint-orchestration
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「发布编排检查点：分阶段放量、自动判停与有序回退」在当前约束下为什么成立。；回答结构可按「触发条件 -> 发布编排 机制 -> 风险兜底」展开，并以「发布编排检查点：分阶段放量、自动判停与有序回退」补一条失败场景。

### 题目

如果面试官追问：从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 标准回答（直接作答）

- 结论：把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值
- 机制：阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）；阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失
- 落地动作：回答「从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，上线后你会盯哪些与 发布编排 相关的日志与指标，来确认这套方案确实带来改进」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值
- 阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）
- 阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失

## progressive-release-checkpoint-orchestration-followup-3

title: 追问：以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话
difficulty: 资深
tags: [发布编排, 灰度, 回滚, 追问]
parent: progressive-release-checkpoint-orchestration
generated: followup-script

### 一句话

规模变大后先重新评估「发布编排检查点：分阶段放量、自动判停与有序回退」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「发布编排检查点：分阶段放量、自动判停与有序回退」对应的工程可维护性收益被复杂度抵消。

### 题目

如果面试官追问：以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话？

### 答案要点

#### 标准回答（直接作答）

- 结论：把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值
- 机制：阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）；阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失
- 落地动作：回答「以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 发布编排检查点 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 发布编排检查点，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「发布编排检查点：分阶段放量、自动判停与有序回退」为例，这套「发布编排检查点：分阶段放量、自动判停与有序回退」要不要继续投人投钱，你会盯哪几组和 发布编排 相关的数据先说话」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 把发布拆成检查点阶段，每阶段都有固定观测窗口和通过阈值
- 阈值应双维度判断：技术指标（错误率、TTFB、白屏）+ 业务指标（转化、支付成功率）
- 阶段失败时优先判停再诊断，避免“边排障边继续放量”放大损失

## release-orchestration-control-tower

title: 发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通]
followups: [release-orchestration-control-tower-followup-1, release-orchestration-control-tower-followup-2, release-orchestration-control-tower-followup-3]

### 一句话

发布编排真正难的不是“有流水线”，而是“每个卡点状态都可对齐、可恢复、可拍板”。

### 题目

一次版本发布跨越预发、灰度、全量三个环境，过程中出现“预发通过但灰度异常、回滚后状态不一致”的情况。你会如何设计发布编排指挥台来保证状态一致与止损效率？

### 答案要点

- 先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构。
- 关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”。
- 卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行。
- 指挥台要同时展示技术和业务信号：错误率、白屏率、转化波动并排看。
- 拍板机制固定：谁有权放量、谁有权冻结、谁负责跨团队同步要前置约定。
- 每次发布后沉淀“卡点失败样本库”，持续收敛误判与漏判规则。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「发布编排指挥台：多环境状态一致性、卡点恢复与最终拍板」时要先定义 发布编排指挥台 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，发布编排指挥台 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 发布编排指挥台 关键链路先收敛再替换。

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

冻结窗口里的例外放行不是“特批一次”，而是“可审计、可回收、可追责”的工程决策。

### 题目

大促前进入发布冻结期，但业务提出紧急变更请求。你会如何设计例外放行机制，既保障窗口稳定又不压死关键业务机会？

### 答案要点

- 先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可。
- 放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚。
- 例外发布采用“更小流量 + 更密观测 + 更快回退”节奏。
- 冻结期例外动作要可审计：谁申请、谁审批、谁执行、谁复核全链路留痕。
- 到期后必须做债务回收：临时开关、绕过校验、补丁策略要限时清理。
- 每次例外都要复盘“是否值得放行”，反哺下一轮冻结规则。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 发布冻结例外治理 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 发布冻结例外治理，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「发布冻结例外治理：紧急需求放行、风险承诺与到期回收」按阶段灰度，每阶段可验收可撤回。

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

我会先验三件事：多环境状态是否一致、卡点失败后能否快速恢复、回退链路是否真实可跑。；每个卡点都要有清晰责任人和下一动作，不允许出现“有人发现、没人拍板”。；对高风险卡点先做演练，把恢复时间和误判率压到可接受范围再放量。

### 题目

如果面试官追问：发布指挥台真正上线前，你会先验哪些关键卡点，避免“流程很全但现场失灵”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构
- 机制：关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”；卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行
- 落地动作：回答「发布指挥台上线前你会先验哪些关键卡点」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 发布指挥台上线前你会 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 发布指挥台上线前你会，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「发布指挥台上线前你会先验哪些关键卡点」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构
- 关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”
- 卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行

## release-orchestration-control-tower-followup-2

title: 追问：你会怎么证明发布指挥台决策是可靠的
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通, 追问]
parent: release-orchestration-control-tower
generated: followup-script

### 一句话

验证分两层：离线压测验证卡点逻辑，线上灰度验证决策效果。；指标要成组看：技术侧看错误率与白屏，业务侧看转化与关键流程成功率。；关键在“动作可追溯”：每次判停或放量都能回溯到证据和责任人。

### 题目

如果面试官追问：你说这套发布指挥台靠谱，那你会怎么用测试和线上数据证明它的决策值得信任？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构
- 机制：关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”；卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行
- 落地动作：回答「你会怎么证明发布指挥台决策是可靠的」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会怎么证明发布指挥 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会怎么证明发布指挥，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你会怎么证明发布指挥台决策是可靠的」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构
- 关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”
- 卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行

## release-orchestration-control-tower-followup-3

title: 追问：这套发布指挥台要不要继续投入看哪些数据
difficulty: 资深
tags: [发布编排, 多环境一致性, 决策沟通, 追问]
parent: release-orchestration-control-tower
generated: followup-script

### 一句话

我会看稳定性：发布事故率、回退成功率、同类卡点复发率是否持续下降。；我会看效率：从发现异常到完成止损的时长是否明显缩短。；我会看成本：维护复杂度是否超过收益，若超过就要收敛流程而非继续叠加规则。

### 题目

如果面试官追问：半年后评估这套发布指挥台是否继续投入，你会先看哪几组关键数据？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构
- 机制：关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”；卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行
- 落地动作：回答「这套发布指挥台要不要继续投入看哪些数据」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 这套发布指挥台要不要 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 这套发布指挥台要不要，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「这套发布指挥台要不要继续投入看哪些数据」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义统一状态模型：同一发布在各环境的阶段、结论、阻塞原因必须同构
- 关键卡点要有“通过/阻断/人工复核”三态，避免流程只能“过或不过”
- 卡点失败恢复要模板化：重试条件、跳过条件、回滚条件先写清再执行

## release-freeze-exception-governance-followup-1

title: 追问：冻结例外评审先看哪些边界
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制, 追问]
parent: release-freeze-exception-governance
generated: followup-script

### 一句话

我先看三条底线：业务收益是否可量化、回退是否可执行、观测窗口是否足够。；没有明确责任人和风险承诺的申请，不进入放行流程。；高风险例外只能走更小流量和更密观测，不允许直接全量。

### 题目

如果面试官追问：冻结窗口里要不要放行例外需求，你会先看哪些边界，避免“救业务却伤主线”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可
- 机制：放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚；例外发布采用“更小流量 + 更密观测 + 更快回退”节奏
- 落地动作：回答「冻结例外评审先看哪些边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 冻结例外评审先看哪些 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 冻结例外评审先看哪些，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「冻结例外评审先看哪些边界」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可
- 放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚
- 例外发布采用“更小流量 + 更密观测 + 更快回退”节奏

## release-freeze-exception-governance-followup-2

title: 追问：上线后看哪些指标判断例外机制有效
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制, 追问]
parent: release-freeze-exception-governance
generated: followup-script

### 一句话

我会看三组指标：例外发布成功率、例外触发事故率、例外回退平均时长。；再看治理质量：到期回收完成率和临时策略残留量是否持续下降。；如果指标“看起来成功”但复发率上升，说明机制在透支未来稳定性。

### 题目

如果面试官追问：例外机制上了之后，你会看哪些日志和指标来判断它是在帮团队而不是制造新风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可
- 机制：放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚；例外发布采用“更小流量 + 更密观测 + 更快回退”节奏
- 落地动作：回答「上线后看哪些指标判断例外机制有效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 上线后看哪些指标判断 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 上线后看哪些指标判断，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「上线后看哪些指标判断例外机制有效」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可
- 放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚
- 例外发布采用“更小流量 + 更密观测 + 更快回退”节奏

## release-freeze-exception-governance-followup-3

title: 追问：窗口提前时如何收敛例外范围并回补技术债
difficulty: 资深
tags: [发布治理, 风险承诺, 例外机制, 追问]
parent: release-freeze-exception-governance
generated: followup-script

### 一句话

先做例外分级：仅保留“必须放行”的动作，其他需求顺延到冻结后。；同步给出债务回补计划：临时开关、绕过校验、补丁代码都要写到期清单。；对未回补项设硬截止日期和责任人，避免“临时方案永久化”。

### 题目

如果面试官追问：上线窗口突然提前，你会怎么收敛例外范围，并把遗留技术债的回补计划讲清楚？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可
- 机制：放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚；例外发布采用“更小流量 + 更密观测 + 更快回退”节奏
- 落地动作：回答「窗口提前时如何收敛例外范围并回补技术债」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 窗口提前时如何收敛例 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 窗口提前时如何收敛例，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「窗口提前时如何收敛例外范围并回补技术债」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义例外准入门槛：业务收益、风险等级、回退可行性三项缺一不可
- 放行申请必须附带风险承诺：影响面、失败信号、止损动作、责任人写清楚
- 例外发布采用“更小流量 + 更密观测 + 更快回退”节奏
