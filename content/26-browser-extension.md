---
id: 26-browser-extension
title: 浏览器插件
order: 26
icon: 🧩
description: Chrome/Edge 插件、Manifest V3、Service Worker、Tampermonkey 与企业内推广。
---

## extension-architecture
title: 浏览器扩展的整体架构
difficulty: 进阶
tags: [扩展, MV3]

### 题目
一个 Chrome 扩展由哪些部分组成？它们的进程边界和通信方式是什么？

### 答案要点
- Background / Service Worker：长期任务、网络代理、定时器、消息中枢；MV3 中是 SW，无法常驻
- Content Script：注入到页面，与页面共享 DOM，但运行在隔离世界，不能直接访问页面 JS 变量
- Popup / Options：插件 UI 页面，独立 origin (chrome-extension://...)
- Side Panel / DevTools：可选 UI 形态
- 通信：`chrome.runtime.sendMessage`、`chrome.tabs.sendMessage`、长连接 `chrome.runtime.connect`
- 数据：`chrome.storage.local / sync / session`，支持配额提醒和跨设备同步

### 代码示例
```json
{
  "manifest_version": 3,
  "name": "KAP Helper",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["https://*.example.com/*"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "sw.js", "type": "module" },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options.html"
}
```

```ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'fetch') {
    fetch(msg.url).then((r) => r.text()).then((text) => sendResponse({ text }));
    return true;
  }
});

chrome.runtime.sendMessage({ type: 'fetch', url: 'https://api.example.com/me' }, (res) => {
  console.log(res.text);
});
```

### 延伸
- Firefox 用 WebExtensions API 与 Chrome 大体兼容，Safari 走 App Extension，构建脚本要分别打包
- 插件本身也是 Web 应用，建议用 Vite + crxjs 这类成熟脚手架，不要手搓

## manifest-v3
title: Manifest V3 带来的关键变化与坑
difficulty: 资深
tags: [MV3, Service Worker]

### 题目
MV2 → MV3 最大的几个变化是什么？为什么很多扩展抱怨"被砍"？

### 答案要点
- 持久 background page → Service Worker：无法常驻，事件触发执行，定时器 / WebSocket 都要重新设计
- `webRequest` blocking → `declarativeNetRequest`：请求拦截改为声明式规则，不能任意改 body / header
- 远程代码执行受限：`eval / new Function` 默认禁止，第三方脚本不能远程加载
- Permissions：默认收紧，要尽量用 `optional_permissions` 按需申请
- 影响最大的是广告拦截类扩展，因为不能再用 webRequest 自由拦截
- 调试：SW 闲置会被回收，可以用 `chrome://serviceworker-internals` 查看状态

### 代码示例
```ts
chrome.alarms.create('refresh', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refresh') {
    const data = await fetch('/api').then((r) => r.json());
    await chrome.storage.local.set({ data, ts: Date.now() });
  }
});
```

```json
{
  "declarative_net_request": {
    "rule_resources": [
      { "id": "ruleset_1", "enabled": true, "path": "rules.json" }
    ]
  },
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"]
}
```

### 延伸
- Safari Web Extension 长期不支持 declarativeNetRequest 全集，跨平台扩展要做能力降级
- Firefox 在 MV3 中保留了非阻塞 webRequest，对内容拦截类扩展更友好

## content-script-isolation
title: Content Script 与页面 JS 怎么互通
difficulty: 进阶
tags: [Content Script, 通信]

### 题目
Content Script 跑在隔离世界，访问不了页面 JS 的全局变量，怎么和宿主页双向通信？

### 答案要点
- 注入 `<script>` 到主世界：`chrome.scripting.executeScript({ world: 'MAIN' })`（MV3 117+）
- 老办法：动态创建 `<script>` 标签把字符串注入，runtime 拿到后清理
- 双向消息：用 `window.postMessage` + 自定义协议字段（`__kap_ext__`）
- DOM 数据可以直接读，但页面给 DOM 设的 expando（自定义属性）要注意 cross-origin 限制
- 安全：插件必须假定页面 JS 不可信，对消息来源做严格校验，避免注入漏洞

### 代码示例
```ts
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data?.__kap_ext__ !== 'response') return;
  console.log('[ext] got from page:', e.data.payload);
});

window.postMessage({ __kap_ext__: 'request', action: 'getUserId' }, '*');
```

```ts
window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data?.__kap_ext__ !== 'request') return;
  if (e.data.action === 'getUserId') {
    window.postMessage(
      { __kap_ext__: 'response', payload: window.__APP__?.user?.id ?? null },
      '*',
    );
  }
});
```

### 延伸
- 频繁 postMessage 会变成性能瓶颈，能 batch 就 batch
- 公司内部插件如果 host 页面可控，更稳的方式是页面侧主动暴露 `window.__BRIDGE__` API

## extension-permissions
title: 权限申请最小化与 host_permissions
difficulty: 进阶
tags: [安全, 权限]

### 题目
怎么把扩展权限做到"按需 + 最小"，避免商店审核打回？

### 答案要点
- 权限分类：API 权限（`storage`, `tabs`, `scripting`）和 host 权限（要访问的域名）
- `optional_permissions` 在 popup / options 里 `chrome.permissions.request` 动态申请
- `activeTab`：用户点击 action 时临时拥有当前 tab 权限，比通配符 `<all_urls>` 安全得多
- host_permissions 列表越具体越好，避免 `*://*/*`，这是审核重点
- Content Security Policy：MV3 默认 `script-src 'self'`，插件不能加载远程 JS
- 上架要写清楚每个权限的"用途说明"，否则会被拒

### 代码示例
```ts
async function ensureGithubAccess() {
  const granted = await chrome.permissions.request({
    origins: ['https://*.github.com/*'],
  });
  if (!granted) throw new Error('user_denied');
}

document.querySelector('#enable')!.addEventListener('click', ensureGithubAccess);
```

### 延伸
- Chrome Web Store 对 broad host 权限的审核越来越严，建议从 v1 起就走 activeTab + optional
- 企业内推广可以用 EMM policy 远程下发权限，不用每个用户手动同意

## userscript-tampermonkey
title: Tampermonkey / 用户脚本与扩展的边界
difficulty: 进阶
tags: [Tampermonkey, 用户脚本]

### 题目
什么时候选用户脚本，什么时候做正式扩展？两者能力差异是什么？

### 答案要点
- 用户脚本：单文件 `.user.js`，开发部署成本极低，依赖 Tampermonkey / Violentmonkey 这类宿主
- 能力：可以用 `GM_*` API（跨域请求、菜单、存储），但本质上仍受宿主沙箱限制
- 正式扩展：可以走 Web Store 分发、自动更新、企业策略下发；能用完整 chrome.* API
- 用户脚本适合个人 / 小团队的"小工具"，扩展适合产品级
- 协议：用户脚本可以从 `https://greasyfork.org` 这类站点直接安装，但要警惕脚本来源
- 用户脚本可以反向写：`@require` 加载 ESM CDN，相当于"页面级油猴"

### 代码示例
```js
// ==UserScript==
// @name         KAP - GitHub PR 高亮
// @namespace    https://kap.dev/
// @version      1.0.0
// @match        https://github.com/*/*/pull/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
  'use strict';
  const author = document.querySelector('.author')?.textContent?.trim();
  if (!author) return;
  const liked = GM_getValue('liked', []);
  if (liked.includes(author)) {
    document.body.style.backgroundColor = '#f0fdf4';
  }
})();
```

### 延伸
- 公司内推广建议直接做扩展 + EMM 策略；用户脚本无法保证更新一致性
- 用户脚本写得好可以转成扩展，反之扩展逻辑也常常先用油猴快速验证

## extension-publishing
title: 扩展发布、自动更新与企业内分发
difficulty: 资深
tags: [发布, EMM]

### 题目
扩展怎么打包发布到 Chrome Web Store？企业内部如何强制下发？

### 答案要点
- 商店发布：注册开发者账号（含一次性 $5）→ 上传 zip → 隐私说明 → 审核 → 发布
- 版本：manifest 中的 `version` 单调递增；`update_url` 默认指向 store
- 自动更新：商店自动推送新版本，渠道分稳定 / 测试 / dev
- 灰度：用 `percentage rollout` 或者按渠道发布
- 企业分发：通过 GPO / Intune 配置 `ExtensionInstallForcelist` + `ExtensionSettings`
- 自托管：用 `update_manifest.xml` + 静态服务器，给企业 SaaS 站点搞内部插件
- 安全：所有上线版本要源码可追溯，秘钥 / API key 不要打到 manifest 或代码里

### 代码示例
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'>
    <updatecheck codebase='https://internal.example.com/kap-ext.crx' version='1.2.3' />
  </app>
</gupdate>
```

```json
{
  "ExtensionInstallForcelist": [
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa;https://internal.example.com/update.xml"
  ],
  "ExtensionSettings": {
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": {
      "installation_mode": "force_installed",
      "update_url": "https://internal.example.com/update.xml"
    }
  }
}
```

### 延伸
- Edge / Brave 等 Chromium 衍生浏览器多数兼容 Chrome 扩展，但商店和企业策略各自独立
- 内部插件最好做"版本灰度 + 健康监控 + 自动回滚"，因为强推安装意味着炸了影响所有员工
