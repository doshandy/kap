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

### 题目
为什么前端发布后，偶尔会出现“刷新一下就好了”的 chunk 加载错误？怎么治理？

### 答案要点
- 用户打开旧页面停留较久，后台已发布新版本并清掉旧 chunk
- 页面可能继续按旧 HTML 或旧运行时记录的 chunk URL 请求已不存在的文件，于是加载失败
- 解决思路：保留多版本静态资源、失败重试、检测版本漂移后引导刷新

### 代码示例
```ts
// 1. 全局监听 chunk 加载失败，提示用户刷新
window.addEventListener('error', e => {
  const target = e.target as HTMLElement;
  if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
    if (await isVersionChanged()) showRefreshTip();
  }
}, true);

// 2. 路由懒加载兜底重试
function lazyWithRetry<T>(loader: () => Promise<T>, retries = 2): () => Promise<T> {
  return async () => {
    for (let i = 0; i <= retries; i++) {
      try { return await loader(); }
      catch (e) {
        if (i === retries) throw e;
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
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
  } catch { return false; }
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
  return (hash % 100) < 10;
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

self.addEventListener('message', e => {
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
      onAction: () => updateSW(true),    // 触发 SKIP_WAITING + reload
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
  registerType: 'prompt',         // 'prompt' 提示用户 / 'autoUpdate' 自动更新
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
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
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

### 题目
上线前为什么应该看一次 bundle 分析图？你最关注哪几类问题？

### 答案要点
- 看是否有大依赖被整包引入
- 看是否存在多版本重复依赖
- 看异步 chunk 切分是否合理，首屏是否把低频页面代码打进主包

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
      template: 'treemap',     // 'treemap' / 'sunburst' / 'network'
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
