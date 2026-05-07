---
id: 18-crossplatform
title: 跨端
order: 18
icon: 📱
description: WebView、Electron、Tauri、PWA、小程序与跨端架构取舍。
---

## hybrid-jsbridge
title: Hybrid WebView 与 JSBridge 的核心设计点
difficulty: 进阶
tags: [Hybrid, JSBridge]

### 一句话
约定调用协议：方法名、参数、回调、超时、版本兼容；做好白名单和来源校验，避免任意页面调用原生敏感能力；统一错误码和降级策略，避免“原生没回调就永远卡住”。

### 题目
WebView + JSBridge 方案里，前端最需要关注哪些协议与安全问题？

### 答案要点
- 约定调用协议：方法名、参数、回调、超时、版本兼容
- 做好白名单和来源校验，避免任意页面调用原生敏感能力
- 统一错误码和降级策略，避免“原生没回调就永远卡住”
- 对 URL Scheme、桥接注入对象、消息通道都要限制暴露面，避免把过多系统能力直接交给 H5

### 代码示例
```ts
// 通用 JSBridge 封装
interface BridgeRequest {
  method: string;
  params?: any;
  callbackId: string;
}

class JSBridge {
  private callbacks = new Map<string, { resolve: Function; reject: Function; timer: any }>();
  private seq = 0;

  // H5 → Native：调用原生方法（返回 Promise）
  invoke(method: string, params?: any, timeout = 10_000): Promise<any> {
    return new Promise((resolve, reject) => {
      const callbackId = `cb_${++this.seq}_${Date.now()}`;
      const timer = setTimeout(() => {
        this.callbacks.delete(callbackId);
        reject(new Error(`Bridge timeout: ${method}`));
      }, timeout);

      this.callbacks.set(callbackId, { resolve, reject, timer });

      const req: BridgeRequest = { method, params, callbackId };
      // iOS：window.webkit.messageHandlers / Android：window.AndroidBridge.postMessage
      if ((window as any).webkit?.messageHandlers?.bridge) {
        (window as any).webkit.messageHandlers.bridge.postMessage(req);
      } else if ((window as any).AndroidBridge) {
        (window as any).AndroidBridge.postMessage(JSON.stringify(req));
      } else {
        reject(new Error('Bridge not available'));
      }
    });
  }

  // Native → H5：原生回调
  onCallback(callbackId: string, data: { ok: boolean; result?: any; error?: string }) {
    const cb = this.callbacks.get(callbackId);
    if (!cb) return;
    clearTimeout(cb.timer);
    this.callbacks.delete(callbackId);
    data.ok ? cb.resolve(data.result) : cb.reject(new Error(data.error));
  }
}

const bridge = new JSBridge();
(window as any).__onBridgeCallback = bridge.onCallback.bind(bridge);

// 业务侧：调用原生
const photo = await bridge.invoke('takePhoto', { quality: 0.8 });
const userInfo = await bridge.invoke('getUserInfo');
```

### 延伸
- JSBridge 真正难的是演进与兼容，不是最初跑通 demo

## electron-tauri
title: Electron 与 Tauri 的差异和取舍
difficulty: 进阶
tags: [Electron, Tauri]

### 一句话
Electron 生态成熟、Node 集成强、开发体验完整，但包体和内存普遍更高；Tauri 体积小、资源占用低，后端由 Rust 驱动，但生态和团队门槛更高；选型要看功能需求、团队技能、自动更新、原生集成深度和发布时间。

### 题目
如果团队要做桌面端工具，Electron 和 Tauri 应该怎么选？

### 答案要点
- Electron 生态成熟、Node 集成强、开发体验完整，但包体和内存普遍更高
- Tauri 体积小、资源占用低，后端由 Rust 驱动，但生态和团队门槛更高
- 选型要看功能需求、团队技能、自动更新、原生集成深度和发布时间
- Electron 通常围绕主进程、渲染进程、preload、IPC 建模；Tauri 则更强调 Web 前端 + Rust command/plugin 的边界

### 代码示例
```ts
// Electron：主进程 / 渲染进程 / preload 三件套
// main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,           // ✅ 必须开启
      nodeIntegration: false,           // ✅ 渲染进程不能直接访问 Node
      sandbox: true,
    },
  });
  win.loadURL('http://localhost:5173');
});

ipcMain.handle('app:read-config', async () => {
  return { theme: 'dark', lang: 'zh' };
});

// preload.ts：白名单暴露 API 给渲染进程
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('app:read-config'),
  onUpdate: (cb: (v: any) => void) => ipcRenderer.on('update', (_, v) => cb(v)),
});

// 渲染进程（Vue/React）：通过 window.api 调用
const cfg = await (window as any).api.readConfig();
```

```rust
// Tauri：用 Rust 写命令，前端通过 invoke 调用
// src-tauri/src/main.rs
#[tauri::command]
fn read_config() -> serde_json::Value {
    serde_json::json!({ "theme": "dark", "lang": "zh" })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```ts
// 前端调用 Tauri 命令
import { invoke } from '@tauri-apps/api/core';
const cfg = await invoke('read_config');
```

### 延伸
- 桌面端方案的差异，常常不在 UI，而在系统能力与运维工具链

## electron-security-ipc
title: Electron 安全边界为什么离不开 preload、contextIsolation、IPC
difficulty: 资深
tags: [Electron, 安全, IPC]

### 一句话
渲染进程展示的是网页内容，不应直接拿到完整 Node/Electron 能力；更安全的做法是通过 preload 暴露最小必要 API；contextIsolation 的目的，是把 preload 和页面脚本放进隔离上下文…。

### 题目
为什么 Electron 项目里经常强调 `preload`、`contextIsolation`、`contextBridge` 和 IPC？这些东西分别在防什么风险？

### 答案要点
- 渲染进程展示的是网页内容，不应直接拿到完整 Node/Electron 能力；更安全的做法是通过 preload 暴露最小必要 API
- `contextIsolation` 的目的，是把 preload 和页面脚本放进隔离上下文，减少页面直接碰到高权限对象的机会
- `contextBridge` 用于把受控、白名单化的能力桥接到页面；IPC 则负责渲染进程与主进程之间的受控通信
- 高危误区通常是直接暴露 `fs`、`shell`、任意命令执行或宽泛 IPC 通道，让 XSS 进一步升级成系统层能力滥用

### 代码示例
```ts
// ❌ 反例：开启 nodeIntegration，渲染进程直接拿到 Node
const win = new BrowserWindow({
  webPreferences: { nodeIntegration: true, contextIsolation: false },
});
// 后果：页面里 require('fs').unlinkSync('/important')

// ✅ 正解：preload 白名单
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED_CHANNELS = ['app:save-file', 'app:read-config'] as const;
type Channel = typeof ALLOWED_CHANNELS[number];

contextBridge.exposeInMainWorld('safeApi', {
  invoke(channel: Channel, ...args: any[]) {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`Channel not allowed: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});

// main.ts：参数校验
ipcMain.handle('app:save-file', async (_e, path: string, content: string) => {
  // ✅ 校验路径合法性
  const resolved = require('node:path').resolve(path);
  const userData = app.getPath('userData');
  if (!resolved.startsWith(userData)) {
    throw new Error('禁止写入 userData 目录之外');
  }
  if (typeof content !== 'string' || content.length > 10 * 1024 * 1024) {
    throw new Error('内容超限');
  }
  await fs.writeFile(resolved, content);
});

// ⚠️ 不加载不可信远程内容
win.webContents.on('will-navigate', (e, url) => {
  if (!url.startsWith('http://localhost') && !url.startsWith('app://')) {
    e.preventDefault();           // 拒绝跳转
  }
});
```

### 延伸
- Electron 安全不是"打开 contextIsolation 就结束了"，关键还在 API 最小化、参数校验和不加载不可信远程内容
- 跨端桌面应用一旦把 Web 安全和本地系统能力叠在一起，攻击面会显著放大

## pwa-capacitor
title: PWA、Capacitor、H5 容器化各自适合什么业务
difficulty: 基础
tags: [PWA, Capacitor]

### 一句话
PWA 适合分发轻、安装轻、离线可用、原生能力需求不深的场景；Capacitor 用原生壳包裹 Web 应用，提供更稳定的原生能力接入；对强推送、复杂后台保活、深系统集成要求高的应用，纯 PWA 仍有限制。

### 题目
PWA 能替代原生 App 吗？Capacitor 这类方案又处在什么位置？

### 答案要点
- PWA 适合分发轻、安装轻、离线可用、原生能力需求不深的场景
- Capacitor 用原生壳包裹 Web 应用，提供更稳定的原生能力接入
- 对强推送、复杂后台保活、深系统集成要求高的应用，纯 PWA 仍有限制
- PWA 的可用能力上限会随操作系统、浏览器和分发方式变化；涉及推送、文件系统、蓝牙、后台能力时，都应按目标平台逐项验证

### 代码示例
```json
// PWA：manifest.webmanifest 让网页可"安装"
{
  "name": "知识库",
  "short_name": "KB",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fff",
  "theme_color": "#0ea5e9",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#0ea5e9" />
```

```ts
// Capacitor：原生壳调用相机
import { Camera, CameraResultType } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 80,
  resultType: CameraResultType.Uri,
  allowEditing: false,
});
console.log('photo:', photo.webPath);
```

```ts
// Web Push（PWA 通知）
async function subscribePush() {
  const reg = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
}
```

### 延伸
- "能不能替代"不是绝对题，关键看业务对原生能力的依赖强度

## mini-program
title: 小程序与多端框架的本质是“多宿主适配”
difficulty: 进阶
tags: [小程序, Taro, uni-app]

### 一句话
不同宿主平台的组件集、路由、生命周期、渲染模型、权限能力并不完全一致；跨端框架主要是在编译、运行时和组件适配层做“求交集 + 补差异”；真正复杂的地方往往是样式细节、性能边界和平台特性差异。

### 题目
为什么小程序跨端框架很难做到 100% 一次编写到处运行？

### 答案要点
- 不同宿主平台的组件集、路由、生命周期、渲染模型、权限能力并不完全一致
- 跨端框架主要是在编译、运行时和组件适配层做“求交集 + 补差异”
- 真正复杂的地方往往是样式细节、性能边界和平台特性差异

### 代码示例
```vue
<!-- uni-app：一份代码多端编译 -->
<template>
  <view class="page">
    <text class="title">{{ title }}</text>
    <button @click="onTap">点击</button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
const title = ref('Hello');

function onTap() {
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '微信小程序' });
  // #endif

  // #ifdef H5
  alert('H5 浏览器');
  // #endif

  // #ifdef APP-PLUS
  uni.showModal({ title: '原生 App' });
  // #endif
}
</script>

<style lang="scss">
/* rpx 自动适配不同分辨率 */
.title { font-size: 32rpx; }
</style>
```

```ts
// Taro：用 React 写多端
import { View, Text, Button } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';

export default function Index() {
  const [count, setCount] = useState(0);
  return (
    <View>
      <Text>Count: {count}</Text>
      <Button onClick={() => {
        setCount(c => c + 1);
        // 平台差异
        if (process.env.TARO_ENV === 'weapp') {
          Taro.showToast({ title: '微信' });
        }
      }}>+</Button>
    </View>
  );
}
```

### 延伸
- 跨端的成本不会消失，只是从"多写代码"转移到了"维护抽象层"

## native-crossplatform-choice
title: React Native、Flutter、KMP 各自解决哪一层跨端问题
difficulty: 进阶
tags: [ReactNative, Flutter, KMP]

### 一句话
React Native 用 JavaScript/TypeScript 驱动原生组件树，优势在前端团队转入成本较低，但复杂原生能力仍常需要桥接与原生协作；Flutter 用 Dart 和自绘渲染体系追求跨平台一致性，UI 控制力强…。

### 题目
如果业务已经不满足 WebView / 容器化方案，React Native、Flutter、KMP 这几条路应该怎么理解？

### 答案要点
- React Native 用 JavaScript/TypeScript 驱动原生组件树，优势在前端团队转入成本较低，但复杂原生能力仍常需要桥接与原生协作
- Flutter 用 Dart 和自绘渲染体系追求跨平台一致性，UI 控制力强，但与原生生态、包体和团队学习成本要一起评估
- KMP 更偏“共享业务逻辑与数据层”，UI 往往仍由各端自己实现，因此它解决的不是整套前端 UI 统一，而是跨端逻辑复用
- 选型关键不在“谁更先进”，而在你要共享的是 Web UI、原生 UI、还是跨端业务逻辑

### 代码示例
```tsx
// React Native：原生组件 + JS/TS 驱动
import { View, Text, FlatList, Pressable } from 'react-native';

export function Inbox({ items }: { items: any[] }) {
  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigate('Detail', { id: item.id })}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 16 }}>{item.title}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
```

```dart
// Flutter：自绘 UI，统一一致性
import 'package:flutter/material.dart';

class Counter extends StatefulWidget {
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text('Count: $_count'),
      ElevatedButton(
        onPressed: () => setState(() => _count++),
        child: const Text('+'),
      ),
    ]);
  }
}
```

```kotlin
// KMP：共享业务逻辑（commonMain）
expect class Platform() { val name: String }

class Greeting {
  fun greet(): String = "Hello, ${Platform().name}"
}

// 各端 UI 自己实现：iOS 用 SwiftUI，Android 用 Compose，Web 用 React/Vue
```

### 延伸
- 跨端技术路线的核心其实是"共享哪一层"，而不是"是否只写一份代码"
- 如果团队缺少原生能力，再好的跨端框架也很难覆盖复杂设备能力与发布链路

## desktop-mobile-debug
title: 跨端调试、自动更新与发布链路
difficulty: 进阶
tags: [调试, 自动更新]

### 一句话
不同宿主环境的日志、网络、存储、权限、热更新方式都不一样；桌面端自动更新要处理签名、增量包、版本回滚、灰度推送；移动端容器化应用还要考虑商店审核、原生壳版本与 H5 版本兼容。

### 题目
跨端项目为什么经常不是写功能最难，而是调试和发布最难？

### 答案要点
- 不同宿主环境的日志、网络、存储、权限、热更新方式都不一样
- 桌面端自动更新要处理签名、增量包、版本回滚、灰度推送
- 移动端容器化应用还要考虑商店审核、原生壳版本与 H5 版本兼容

### 代码示例
```ts
// Electron：自动更新（electron-updater）
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => log('发现新版本'));
autoUpdater.on('update-downloaded', () => {
  // 提示用户重启
  dialog.showMessageBox({
    type: 'info',
    title: '更新已下载',
    message: '是否立即重启安装？',
    buttons: ['立即重启', '稍后'],
  }).then(r => {
    if (r.response === 0) autoUpdater.quitAndInstall();
  });
});
```

```yaml
# electron-builder.yml：分平台打包配置
appId: com.example.app
productName: MyApp
publish:
  provider: github
  owner: example
  repo: app
mac:
  category: public.app-category.productivity
  hardenedRuntime: true
  notarize: true
win:
  target: [nsis]
  signingHashAlgorithms: [sha256]
linux:
  target: [AppImage, deb]
```

```ts
// 移动端 Hybrid：H5 热更新（绕开商店）
async function checkH5Update() {
  const res = await fetch('https://cdn/h5-version.json');
  const { version, zipUrl } = await res.json();
  const local = await getLocalVersion();
  if (version !== local) {
    await downloadAndExtract(zipUrl);
    await setLocalVersion(version);
    bridge.invoke('reloadWebView');
  }
}
```

### 延伸
- 跨端交付能力的一半在工具链，不在业务代码

## crossplatform-performance
title: 跨端性能与一致性为什么总在拉扯
difficulty: 进阶
tags: [性能, 一致性]

### 一句话
渲染引擎、硬件能力、宿主限制、输入方式、网络策略都不同；一致性的代价通常是放弃部分平台最优能力；真正好的跨端方案会为不同平台保留局部差异化优化空间。

### 题目
为什么同一套前端在浏览器、WebView、桌面壳里表现会差很多？

### 答案要点
- 渲染引擎、硬件能力、宿主限制、输入方式、网络策略都不同
- 一致性的代价通常是放弃部分平台最优能力
- 真正好的跨端方案会为不同平台保留局部差异化优化空间

### 代码示例
```ts
// 平台特性检测：按能力差异化优化
const ua = navigator.userAgent;
const platform = {
  isiOS: /iPhone|iPad/.test(ua),
  isAndroid: /Android/.test(ua),
  isWeChat: /MicroMessenger/i.test(ua),
  isElectron: !!(window as any).process?.versions?.electron,
  isWebView: !!(window as any).webkit?.messageHandlers || !!(window as any).AndroidBridge,
};

// iOS WebView 滚动卡顿优化
if (platform.isiOS) {
  document.body.style.cssText += `-webkit-overflow-scrolling: touch;`;
}

// Electron 中可启用更激进的本地缓存
if (platform.isElectron) {
  fetch.defaults = { cache: 'force-cache' };
}

// 小程序里关闭某些 H5 专属能力
if (platform.isWeChat) {
  disableFeature('shareToOthers');
}

// 网络质量自适应
const conn = (navigator as any).connection;
if (conn?.effectiveType === '2g' || conn?.saveData) {
  document.documentElement.classList.add('low-end');
  // CSS 中：.low-end .heavy-anim { animation: none }
}
```

### 延伸
- 跨端不是"抹平所有差异"，而是"在大部分一致和少量特化之间取平衡"

## miniapp-architecture
title: 微信小程序的双线程架构与性能边界
difficulty: 进阶
tags: [小程序, 双线程]

### 一句话
渲染层：WebView 跑 WXML/WXSS，每个页面独立 WebView；逻辑层：JsCore（iOS） / V8（Android），不能访问 DOM；通信：通过 Native 桥接做 setData，所有数据都要 JSON 序列化跨进程。

### 题目
小程序的逻辑层和渲染层为什么是两个线程？这种架构带来了哪些性能限制？

### 答案要点
- 渲染层：WebView 跑 WXML/WXSS，每个页面独立 WebView
- 逻辑层：JsCore（iOS） / V8（Android），不能访问 DOM
- 通信：通过 Native 桥接做 setData，所有数据都要 JSON 序列化跨进程
- 优化：减少 setData 频次和体积；列表用 `wx:key` + 局部更新；图片用懒加载
- API：`wx.request` 受白名单限制；`wx.canIUse` 做能力检测
- 包大小：主包 < 2MB（旧版），分包按场景拆；首屏关键资源放主包
- 高级能力：`wxs` 在渲染层执行少量计算（避免跨线程往返）；自定义组件提速

### 代码示例
```js
Page({
  data: { list: [] },

  onLoad() {
    this._buf = [];
    this._timer = null;
  },

  pushItem(item) {
    this._buf.push(item);
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this.setData({ [`list[${this.data.list.length}]`]: this._buf.shift() });
      this._buf.forEach((it, i) => {
        this.setData({ [`list[${this.data.list.length + i}]`]: it });
      });
      this._buf = [];
      this._timer = null;
    }, 16);
  },
});
```

```js
function format(value) {
  return value < 10 ? '0' + value : '' + value;
}
module.exports = { format };
```

### 延伸
- Skyline 渲染引擎正在替代 WebView，提升性能但兼容性需评估
- 跨平台框架（Taro / uni-app）会自动处理 setData 节流，但仍要关注大列表

## taro-uniapp-choice
title: Taro / uni-app 与原生小程序如何选择
difficulty: 进阶
tags: [Taro, uni-app, 跨端]

### 一句话
原生：性能最好、API 直接、调试方便；只能跑微信，不能复用 Web；Taro：基于 React/Vue 写一套、编译到多端（微信/支付宝/抖音/H5/RN），生态偏 React；uni-app：基于 Vue 语法，国内生态成熟、组件库多、文档中文化好。

### 题目
做小程序业务时是直接写原生还是用 Taro / uni-app？各自的取舍是什么？

### 答案要点
- 原生：性能最好、API 直接、调试方便；只能跑微信，不能复用 Web
- Taro：基于 React/Vue 写一套、编译到多端（微信/支付宝/抖音/H5/RN），生态偏 React
- uni-app：基于 Vue 语法，国内生态成熟、组件库多、文档中文化好
- 性能：编译产物体积大于原生，setData 优化需要跟踪框架版本
- 适合 Taro / uni-app：需要多端覆盖、团队熟 Web 框架
- 适合原生：核心业务、对性能/体积敏感、只投放单端
- 真实策略：复杂功能模块原生，常规页面跨端框架

### 代码示例
```tsx
import { View, Text, Button } from '@tarojs/components';
import Taro, { useState } from '@tarojs/taro';

export default function Index() {
  const [count, setCount] = useState(0);
  return (
    <View className="page">
      <Text>{count}</Text>
      <Button onClick={() => setCount((c) => c + 1)}>+1</Button>
    </View>
  );
}
```

```vue
<template>
  <view class="page">
    <text>{{ count }}</text>
    <button @click="count++">+1</button>
  </view>
</template>

<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>
```

### 延伸
- 跨端框架升级要紧跟，落后版本可能踩到平台 API 变更的坑
- "技术统一、产品差异化"是常见策略：核心代码跨端、关键页定制

## webview-jsbridge
title: WebView / JSBridge 怎么实现
difficulty: 进阶
tags: [JSBridge, Hybrid]

### 一句话
JSBridge 是 H5 与 Native 互相调用的"通信总线"。常见三种实现：URL Scheme（已淘汰）、`prompt`/`alert` 拦截（仅 Android）、**WebView 注入对象**（推荐：Android `addJavascriptInterface`、iOS `WKScriptMessageHandler`）。

### 题目
请描述 H5 与 Native 之间通信的几种方案，以及典型的 JSBridge 调用流程。

### 答案要点
- **方案演进**
  - URL Scheme：H5 触发 `iframe.src = 'app://method?params'`，Native 拦截 → 兼容性好但有 8KB URL 限制
  - `prompt` / `console.log` / 截图扫描：仅个别平台可行，已不推荐
  - **JS 接口注入（主流）**：
    - Android：`webView.addJavascriptInterface(obj, 'AndroidBridge')` → JS 直接调 `window.AndroidBridge.callXxx(json)`
    - iOS：`userContentController.add(handler, name: 'iOSBridge')` → `window.webkit.messageHandlers.iOSBridge.postMessage(json)`
- **典型协议**
  - JS → Native：`{ method, params, callbackId }`
  - Native → JS：执行 `window.JSBridge._callback(callbackId, result)` 完成回调
- **设计要点**
  - 统一封装一个 `bridge.invoke(method, params)`，返回 Promise
  - 双端先约定方法清单 + 版本兼容矩阵
  - 错误码标准化：success / fail / not_supported
  - 超时机制（避免 native 不回调导致 promise pending）
- **进阶**
  - 鉴权：每次调用带 token，Native 校验
  - 桥接性能瓶颈：iOS WKWebView 的 messageHandler 是异步且有序列化开销，频繁调用要批处理
  - WebView Pool：预创建 + 缓存提升加载速度

### 代码示例
```ts
class JSBridge {
  private callbacks = new Map<string, (res: unknown) => void>();
  invoke<T>(method: string, params?: unknown): Promise<T> {
    const callbackId = `cb_${Date.now()}_${Math.random()}`;
    return new Promise((resolve) => {
      this.callbacks.set(callbackId, resolve as (r: unknown) => void);
      const payload = JSON.stringify({ method, params, callbackId });
      const w = window as unknown as {
        AndroidBridge?: { call: (s: string) => void };
        webkit?: { messageHandlers: { iOSBridge: { postMessage: (s: string) => void } } };
      };
      if (w.AndroidBridge) w.AndroidBridge.call(payload);
      else if (w.webkit) w.webkit.messageHandlers.iOSBridge.postMessage(payload);
    });
  }
  _callback(id: string, res: unknown) {
    this.callbacks.get(id)?.(res);
    this.callbacks.delete(id);
  }
}

const bridge = new JSBridge();
const user = await bridge.invoke<{ name: string }>('getUserInfo');
```

### 延伸
- 字节、阿里、美团都开源过 JSBridge 库（`dsbridge`、`webank/JsBridge`）
- 离线包 + JSBridge 是 Hybrid 性能优化的两驾马车
- Web 端的 `postMessage` 通讯模型其实和 JSBridge 思想一致

