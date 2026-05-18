---
id: 26-browser-extension
title: 浏览器插件
order: 26
icon: 🧩
description: Chrome/Edge 插件、Manifest V3、Service Worker、Tampermonkey 与企业内推广。
---

## extension-architecture

title: 浏览器扩展的整体架构
followups: [extension-architecture-followup-1]
difficulty: 进阶
tags: [扩展, MV3]

### 一句话

Background / Service Worker：长期任务、网络代理、定时器、消息中枢；MV3 中是 SW，无法常驻；Content Script：注入到页面，与页面共享 DOM，但运行在隔离世界，不能直接访问页面 JS 变量。

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
    fetch(msg.url)
      .then((r) => r.text())
      .then((text) => sendResponse({ text }));
    return true;
  }
});

chrome.runtime.sendMessage({ type: 'fetch', url: 'https://api.example.com/me' }, (res) => {
  console.log(res.text);
});
```

### 追问

- 推动「浏览器扩展的整体架构」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「浏览器扩展的整体架构」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 扩展、MV3，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Firefox 用 WebExtensions API 与 Chrome 大体兼容，Safari 走 App Extension，构建脚本要分别打包
- 插件本身也是 Web 应用，建议用 Vite + crxjs 这类成熟脚手架，不要手搓

## manifest-v3

title: Manifest V3 带来的关键变化与坑
followups: [manifest-v3-followup-1]
links: [extension-csp-remote-code]
difficulty: 资深
tags: [MV3, Service Worker]

### 一句话

持久 background page → Service Worker：无法常驻，事件触发执行，定时器 / WebSocket 都要重新设计；webRequest blocking → declarativeNetRequest：请求拦截改为声明式规则。

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
    "rule_resources": [{ "id": "ruleset_1", "enabled": true, "path": "rules.json" }]
  },
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"]
}
```

### 追问

- 「Manifest V3 带来的关键变化与坑」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Manifest V3 带来的关键变化与坑」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 MV3、Service Worker，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Safari Web Extension 长期不支持 declarativeNetRequest 全集，跨平台扩展要做能力降级
- Firefox 在 MV3 中保留了非阻塞 webRequest，对内容拦截类扩展更友好

## content-script-isolation

title: Content Script 与页面 JS 怎么互通
followups: [content-script-isolation-followup-1]
difficulty: 进阶
tags: [Content Script, 通信]

### 一句话

需要访问页面 JS 全局变量时，要明确 content script 的隔离世界边界：Chrome 可用 `chrome.scripting.executeScript({ world: 'MAIN' })` 注入到主世界；跨浏览器或旧环境仍常用页面 `<script>` 桥接，再通过 `postMessage` 做受控通信。

### 题目

Content Script 跑在隔离世界，访问不了页面 JS 的全局变量，怎么和宿主页双向通信？

### 答案要点

- Chrome 可用 `chrome.scripting.executeScript({ world: 'MAIN' })` 注入到主世界；不同浏览器和版本支持不完全一致，要做能力检测和降级
- 兼容做法：动态创建 `<script src={chrome.runtime.getURL(...) }>` 注入预打包文件，执行后清理节点，避免远程字符串代码
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
    window.postMessage({ __kap_ext__: 'response', payload: window.__APP__?.user?.id ?? null }, '*');
  }
});
```

### 追问

- 「Content Script 与页面 JS 怎么互通」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Content Script 与页面 JS 怎么互通」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Content Script、通信，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 频繁 postMessage 会变成性能瓶颈，能 batch 就 batch
- 公司内部插件如果 host 页面可控，更稳的方式是页面侧主动暴露 `window.__BRIDGE__` API

## extension-permissions

title: 权限申请最小化与 host_permissions
followups: [extension-permissions-followup-1]
difficulty: 进阶
tags: [安全, 权限]

### 一句话

权限分类：API 权限（storage, tabs, scripting）和 host 权限（要访问的域名）；optional_permissions 在 popup / options 里 chrome.permissions.request 动态申请。

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

### 追问

- 如果把「权限申请最小化与 host_permissions」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「权限申请最小化与 host_permissions」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 安全、权限，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Chrome Web Store 对 broad host 权限的审核越来越严，建议从 v1 起就走 activeTab + optional
- 企业内推广可以用 EMM policy 远程下发权限，不用每个用户手动同意

## userscript-tampermonkey

title: Tampermonkey / 用户脚本与扩展的边界
followups: [userscript-tampermonkey-followup-1]
difficulty: 进阶
tags: [Tampermonkey, 用户脚本]

### 一句话

用户脚本：单文件 .user.js，开发部署成本极低，依赖 Tampermonkey / Violentmonkey 这类宿主；能力：可以用 GM\_\* API（跨域请求、菜单、存储），但本质上仍受宿主沙箱限制。

### 题目

什么时候选用户脚本，什么时候做正式扩展？两者能力差异是什么？

### 答案要点

- 用户脚本：单文件 `.user.js`，开发部署成本极低，依赖 Tampermonkey / Violentmonkey 这类宿主
- 能力：可以用 `GM_*` API（跨域请求、菜单、存储），但本质上仍受宿主沙箱限制
- 正式扩展：可以走 Web Store 分发、自动更新、企业策略下发；能用完整 chrome.\* API
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

### 追问

- 「Tampermonkey / 用户脚本与扩展的边界」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Tampermonkey / 用户脚本与扩展的边界」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 Tampermonkey、用户脚本，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 公司内推广建议直接做扩展 + EMM 策略；用户脚本无法保证更新一致性
- 用户脚本写得好可以转成扩展，反之扩展逻辑也常常先用油猴快速验证

## extension-publishing

title: 扩展发布、自动更新与企业内分发
followups: [extension-publishing-followup-1]
difficulty: 资深
tags: [发布, EMM]

### 一句话

商店发布：注册开发者账号（含一次性 $5）→ 上传 zip → 隐私说明 → 审核 → 发布；版本：manifest 中的 version 单调递增；update_url 默认指向 store；自动更新：商店自动推送新版本，渠道分稳定 / 测试 / dev。

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

### 追问

- 推动「扩展发布、自动更新与企业内分发」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「扩展发布、自动更新与企业内分发」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 发布、EMM，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Edge / Brave 等 Chromium 衍生浏览器多数兼容 Chrome 扩展，但商店和企业策略各自独立
- 内部插件最好做"版本灰度 + 健康监控 + 自动回滚"，因为强推安装意味着炸了影响所有员工

## extension-message-passing

title: 浏览器扩展不同上下文之间怎么通信？
followups: [extension-message-passing-followup-1]
difficulty: 进阶
tags: [浏览器插件, 通信, 高频]

### 一句话

四类上下文（background SW / content script / popup / 页面 main world）通信走两条总线：扩展内部用 `chrome.runtime.sendMessage` + `chrome.tabs.sendMessage`；与页面 main world 用 `window.postMessage` 经 content script 中转。

### 题目

扩展里有 background、content script、popup、injected script 四种代码，分别可以访问什么 API？它们之间怎么互相发消息？

### 答案要点

- **运行环境差异**
  - background（MV3 是 Service Worker）：`chrome.*` 全权限，但**不能**访问 DOM、`window`
  - content script：在页面里跑，能访问 DOM；`chrome.*` 只有部分（runtime / storage 等）；和页面 JS **隔离 world**（变量不共享）
  - popup / options：标准 web 页面，能用 `chrome.*`，关闭就销毁
  - injected（page main world）：直接挂到目标页面 window 上，能访问页面变量；但拿不到 `chrome.*`
- **三条通信路径**
  1. **扩展内部（背景 ↔ popup ↔ content）**
     - `chrome.runtime.sendMessage(msg)`：发往 background
     - `chrome.tabs.sendMessage(tabId, msg)`：发往指定 tab 的 content script
     - 接收方：`chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => { ... return true; })`，return true 表示异步回包
  2. **content script ↔ 页面 main world**
     - 隔离 world 不能直接访问页面变量 → 用 `window.postMessage` + `window.addEventListener('message')`
     - 务必校验 `event.source === window && event.data?.from === 'mySafeMark'`
  3. **长连接**：`chrome.runtime.connect()` 返回 `Port`，适合长流式数据
- **常见坑**
  - MV3 background 是 SW，会被空闲回收 → 状态要存 `chrome.storage.session`，回包要快
  - sendMessage 在没有 listener 时会报"Receiving end does not exist" → try / catch
  - content script 注入时机：`document_start` 早注入但 DOM 没好；`document_idle` 默认时机
- **跨域 fetch**：放到 background 发（content script 受页面 CSP 约束）

### 代码示例

```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'fetchProxy') {
    fetch(msg.url, { credentials: 'omit' })
      .then((r) => r.text())
      .then((text) => sendResponse({ ok: true, text }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});

const inject = document.createElement('script');
inject.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).append(inject);

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data?.from !== 'kap-inject') return;
  chrome.runtime.sendMessage({ type: 'pageEvent', payload: e.data.payload });
});

window.postMessage({ from: 'kap-inject', payload: { user: window.__USER__ } }, '*');

const port = chrome.runtime.connect({ name: 'logs' });
port.onMessage.addListener((m) => console.log(m));
port.postMessage({ hello: 1 });
```

### 追问

- 「浏览器扩展不同上下文之间怎么通信」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「浏览器扩展不同上下文之间怎么通信？」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 浏览器插件、通信、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Firefox 是 `browser.*`（promise 化），可用 webextension-polyfill 统一 API
- 长链接 vs 一次性：日志流走 Port，命令走 sendMessage
- 跨扩展通信用 `chrome.runtime.sendMessage(extensionId, msg)`，需 `externally_connectable`

## extension-csp-remote-code

title: MV3 为什么禁止远程代码？常见踩坑怎么解
followups: [extension-csp-remote-code-followup-1]
links: [manifest-v3, 11-ai-frontend/llm-frontend-security-checklist, 13-security/xss-csrf-defense]
difficulty: 进阶
tags: [浏览器插件, 安全, MV3, 高频]

### 一句话

MV3 默认 CSP 是 `script-src 'self'`，不允许 eval / 远程脚本 / 内联 onclick，避免插件被远程注入恶意代码污染上千万用户；要动态行为只能打包到本地，或者用 declarativeNet / userScripts API。

### 题目

你写的扩展用了 eval / 加载远程 SDK，MV3 商店审核没过。分析原因，以及哪些常见模式需要重写？

### 答案要点

- **MV3 安全收紧**
  - 默认 `script-src 'self'; object-src 'self';` —— 不能 eval、Function('...')、远程 `<script src>`、setTimeout 字符串、内联 onclick
  - 不允许声明放宽 CSP（MV2 时还可以改 `content_security_policy`，MV3 限制成只能添加 sandbox 页）
  - 商店审核机器扫描 + 人工审核，命中就拒
- **典型踩坑 → 改写**
  - 用 webpack runtime eval → 改 webpack.config 用 `devtool: false` / 'source-map'，禁 eval-source-map
  - 用第三方 CDN SDK（如 GA、Sentry CDN 版）→ 用 npm 安装 + 打包到本地 dist
  - 用 `new Function('return ...')` 动态求值 → 改成 JSON 配置 + 解释器，或 sandbox iframe
  - 内联 `<button onclick="...">` → 改成 addEventListener 绑定
  - `<script src="https://...">` 注入到页面 → 改成把脚本打进扩展资源 + content script 注 `chrome.runtime.getURL('inject.js')`
- **合法的"动态行为"**
  - sandbox 页：在 manifest 里声明 `"sandbox": { "pages": ["sandbox.html"] }`，里面可以 eval；通过 postMessage 与主扩展通信
  - userScripts API（MV3 后期版本）：用户主动启用油猴式脚本
  - `chrome.scripting.executeScript`：动态注入预定义文件（不是远程字符串）
- **网络请求拦截**
  - MV2 的 `chrome.webRequest.onBeforeRequest` 改写请求 → MV3 改用 `declarativeNetRequest`（声明式规则文件，性能好且不能看用户流量）

### 代码示例

```json
{
  "manifest_version": 3,
  "name": "kap-ext",
  "version": "1.0.0",
  "permissions": ["scripting", "storage"],
  "host_permissions": ["https://example.com/*"],
  "background": { "service_worker": "background.js" },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "sandbox": {
    "pages": ["sandbox.html"]
  }
}
```

```js
const iframe = document.querySelector('iframe#sandbox');
iframe.contentWindow.postMessage({ type: 'eval', expr: '1 + 2' }, '*');
window.addEventListener('message', (e) => {
  if (e.data.type === 'evalResult') console.log(e.data.value);
});
```

### 追问

- 如果把「MV3 为什么禁止远程代码？常见踩坑怎么解」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「MV3 为什么禁止远程代码？常见踩坑怎么解」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 浏览器插件、安全、MV3，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Edge / Firefox 也跟进 MV3
- 想做"用户脚本"只能改用油猴扩展（Tampermonkey 自己是有特殊豁免的）
- Sentry / GA 等都已经提供 npm 包；记得关闭遥测数据收集，避免商店判违规

## extension-storage-sync

title: 扩展持久化数据用哪个 API？跨设备同步呢？
followups: [extension-storage-sync-followup-1]
difficulty: 进阶
tags: [浏览器插件, 存储]

### 一句话

小数据用 `chrome.storage.local`（10MB）；要跨设备登录后同步用 `chrome.storage.sync`（100KB，自动 Google 同步）；MV3 SW 内存即用即弃用 `chrome.storage.session`；大数据走 IndexedDB。

### 题目

扩展要保存用户偏好、登录 token、操作历史。分别选什么存储，注意点是什么？

### 答案要点

- **API 对比**
  - `chrome.storage.local`：~10MB，本设备；扩展卸载即删；最常用
  - `chrome.storage.sync`：~100KB（每项 8KB），跟随 Google 账号跨设备同步；适合用户偏好（主题、快捷键）
  - `chrome.storage.session`：MV3 新增；存内存，扩展进程销毁就丢；适合 SW 唤醒间共享 token / state
  - `chrome.storage.managed`：企业策略下发的只读配置
  - IndexedDB：大数据（几十 MB+）走这；扩展可在 background / content script 用
- **注意**
  - storage API 是**异步**的，`get/set` 都返回 Promise（MV3）或回调
  - 全部用 JSON 序列化（没法存 Map/Set/Function）
  - sync 有配额，超了 set 直接报错；要捕获并降级到 local
- **变更监听**：`chrome.storage.onChanged.addListener((changes, area) => {...})`，可以在多上下文同步状态
- **隐私敏感数据**
  - 别存明文 token / 密码到 sync（理论上 Google 会同步到云）
  - 高敏走 native messaging + OS keychain，或仅 session
- **数据迁移**：版本号字段，启动时跑 migrate（旧字段重命名 / 字段拆分）

### 代码示例

```js
async function getPref() {
  const { theme = 'auto', shortcuts = {} } = await chrome.storage.sync.get(['theme', 'shortcuts']);
  return { theme, shortcuts };
}

async function saveToken(token) {
  await chrome.storage.session.set({ token });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.theme) applyTheme(changes.theme.newValue);
});

const STORAGE_VERSION = 3;
async function migrate() {
  const { __v = 0, ...rest } = await chrome.storage.local.get();
  if (__v < 3) {
    if (rest.user_name) {
      rest.profile = { name: rest.user_name };
      delete rest.user_name;
    }
    await chrome.storage.local.set({ ...rest, __v: STORAGE_VERSION });
  }
}
```

### 追问

- 「扩展持久化数据用哪个 API？跨设备同步呢」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「扩展持久化数据用哪个 API？跨设备同步呢？」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 浏览器插件、存储，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大量历史日志（操作记录）放 IndexedDB；按日期分桶，只保留近 30 天
- 跨扩展共享：用 `externally_connectable` + 消息传递，不直接共享 storage

## extension-mv2-vs-mv3-basic

title: MV2 和 MV3 关键差异，搬迁要注意什么？
followups: [extension-mv2-vs-mv3-basic-followup-1]
difficulty: 基础
tags: [扩展, MV3, 基础]

### 一句话

MV3 把 background 从持久 page 换成短生命的 service worker；远程代码不能再加载；webRequest 改为 declarativeNetRequest（声明式规则）；权限粒度更细。

### 题目

MV2 → MV3 主要变了哪些点？前端开发要注意什么？

### 答案要点

- **背景脚本**：persistent background page → `service_worker`（按需启动、可休眠）
- **远程代码**：不能再 `eval` / `<script src="远程">`，所有逻辑必须打进扩展内
- **网络拦截**：`webRequest` blocking 模式被禁，要用 `declarativeNetRequest` 声明规则（更安全但表达力差）
- **host_permissions**：从 `permissions` 拆出来；用户能更细粒度授权
- **action API 合一**：browser_action / page_action → `action`
- **CSP**：MV3 默认禁内联 + 远程脚本

### 代码示例

```json
{
  "manifest_version": 3,
  "name": "MyExt",
  "version": "1.0.0",
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "permissions": ["storage", "tabs"],
  "host_permissions": ["https://example.com/*"],
  "content_scripts": [
    {
      "matches": ["https://example.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### 常见误区

- service worker 里写全局变量保存状态——它会被 GC 销毁，要用 `chrome.storage`
- content script 想直接调页面变量——拿不到，要靠 `window.postMessage` + injected script
- 用 alarms 触发"5 秒后做事"——MV3 alarms 最小周期 30s

### 追问

- content script 和 page world 的隔离机制
- 怎么调试 service worker（chrome://extensions → service worker 链接）
- 上线节奏（Chrome MV2 已弃用窗口）

### 延伸

- Firefox / Safari / Edge 各有 MV3 兼容差异
- 浏览器扩展商店审核重点：权限合理 + 没远程脚本 + 隐私声明

## extension-architecture-followup-1

title: 追问：推动「浏览器扩展的整体架构」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 进阶
tags: [扩展, MV3, 追问]
parent: extension-architecture

### 题目

如果面试官追问：推动「浏览器扩展的整体架构」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「浏览器扩展的整体架构」拆成可验证的小步骤，逐步替换高风险部分。

## manifest-v3-followup-1

title: 追问：「Manifest V3 带来的关键变化与坑」在真实项目里最容易踩到哪些边界条件
difficulty: 资深
tags: [MV3, Service Worker, 追问]
parent: manifest-v3

### 题目

如果面试官追问：「Manifest V3 带来的关键变化与坑」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Manifest V3 带来的关键变化与坑」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「持久 background page → Service Worker：无法常驻，事件触发执行，定时器 / WebSocket 都要重新设计」要进一步补到边界条件里，而不是只复述结论。

## content-script-isolation-followup-1

title: 追问：「Content Script 与页面 JS 怎么互通」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Content Script, 通信, 追问]
parent: content-script-isolation

### 题目

如果面试官追问：「Content Script 与页面 JS 怎么互通」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Content Script 与页面 JS 怎么互通」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「Content Script 与页面 JS 处在不同执行世界」要进一步补到边界条件里：主世界注入能力、跨浏览器支持、消息协议校验和降级路径都要说明。

## extension-permissions-followup-1

title: 追问：如果把「权限申请最小化与 host_permissions」放到真实业务里，你会怎么划分信任边界和服务端兜底
difficulty: 进阶
tags: [安全, 权限, 追问]
parent: extension-permissions

### 题目

如果面试官追问：如果把「权限申请最小化与 host_permissions」放到真实业务里，你会怎么划分信任边界和服务端兜底？

### 答案要点

#### 核心回答

- 先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。
- 证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。
- 一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

## userscript-tampermonkey-followup-1

title: 追问：「Tampermonkey / 用户脚本与扩展的边界」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [Tampermonkey, 用户脚本, 追问]
parent: userscript-tampermonkey

### 题目

如果面试官追问：「Tampermonkey / 用户脚本与扩展的边界」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「Tampermonkey / 用户脚本与扩展的边界」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「用户脚本：单文件 .user.js，开发部署成本极低，依赖 Tampermonkey / Violentmonkey 这类宿主」要进一步补到边界条件里，而不是只复述结论。

## extension-publishing-followup-1

title: 追问：推动「扩展发布、自动更新与企业内分发」落地时，你会如何设计灰度、回滚和迁移路径
difficulty: 资深
tags: [发布, EMM, 追问]
parent: extension-publishing

### 题目

如果面试官追问：推动「扩展发布、自动更新与企业内分发」落地时，你会如何设计灰度、回滚和迁移路径？

### 答案要点

#### 核心回答

- 落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。
- 迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。
- 团队推进重点不是一次性重写，而是把「扩展发布、自动更新与企业内分发」拆成可验证的小步骤，逐步替换高风险部分。

## extension-message-passing-followup-1

title: 追问：「浏览器扩展不同上下文之间怎么通信」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [浏览器插件, 通信, 高频, 追问]
parent: extension-message-passing

### 题目

如果面试官追问：「浏览器扩展不同上下文之间怎么通信」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「浏览器扩展不同上下文之间怎么通信」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「background（MV3 是 Service Worker）：chrome.\* 全权限，但不能访问 DOM、window」要进一步补到边界条件里，而不是只复述结论。

## extension-csp-remote-code-followup-1

title: 追问：如果把「MV3 为什么禁止远程代码？常见踩坑怎么解」放到真实业务里，你会怎么划分信任边界和服务端兜底
difficulty: 进阶
tags: [浏览器插件, 安全, MV3, 高频, 追问]
parent: extension-csp-remote-code

### 题目

如果面试官追问：如果把「MV3 为什么禁止远程代码？常见踩坑怎么解」放到真实业务里，你会怎么划分信任边界和服务端兜底？

### 答案要点

#### 核心回答

- 先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。
- 证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。
- 一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

## extension-storage-sync-followup-1

title: 追问：「扩展持久化数据用哪个 API？跨设备同步呢」在真实项目里最容易踩到哪些边界条件
difficulty: 进阶
tags: [浏览器插件, 存储, 追问]
parent: extension-storage-sync

### 题目

如果面试官追问：「扩展持久化数据用哪个 API？跨设备同步呢」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「扩展持久化数据用哪个 API？跨设备同步呢」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「chrome.storage.local：~10MB，本设备；扩展卸载即删；最常用」要进一步补到边界条件里，而不是只复述结论。

## extension-mv2-vs-mv3-basic-followup-1

title: 追问：「MV2 和 MV3 关键差异，搬迁要注意什么」在真实项目里最容易踩到哪些边界条件
difficulty: 基础
tags: [扩展, MV3, 基础, 追问]
parent: extension-mv2-vs-mv3-basic

### 题目

如果面试官追问：「MV2 和 MV3 关键差异，搬迁要注意什么」在真实项目里最容易踩到哪些边界条件？

### 答案要点

#### 核心回答

- 先界定「MV2 和 MV3 关键差异，搬迁要注意什么」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。
- 围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。
- 原题中的关键点「背景脚本：persistent background page → service_worker（按需启动、可休眠）」要进一步补到边界条件里，而不是只复述结论。
