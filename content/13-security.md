---
id: 13-security
title: 前端安全
order: 13
icon: 🛡️
description: XSS、CSRF、CSP、鉴权、供应链安全与前端常见漏洞治理。
---

## xss

title: XSS 三种类型与前端最该做的防御
followups: [xss-followup-1, xss-followup-2, xss-followup-3]
difficulty: 基础
tags: [XSS, 输出编码]

### 一句话

存储型：恶意脚本存进数据库，访问页面时被所有用户执行；反射型：恶意参数被服务端原样拼回响应；DOM 型：前端脚本把不可信内容拼进 DOM。

### 题目

请区分存储型、反射型、DOM 型 XSS，并说明前端侧最有效的防御策略。

### 答案要点

- 存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 反射型：恶意参数被服务端原样拼回响应
- DOM 型：前端脚本把不可信内容拼进 DOM
- 防御核心：默认转义输出、禁止把不可信字符串直接塞进 `innerHTML`、富文本走白名单清洗

### 代码示例

```ts
// ❌ 危险：直接拼 innerHTML
el.innerHTML = userInput;
// ❌ 危险：v-html 绑定不可信内容
// <div v-html="comment.content" />

// ✅ 输出转义（手写）
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!,
  );
}

// ✅ 富文本场景：DOMPurify 白名单清洗
import DOMPurify from 'dompurify';
const safe = DOMPurify.sanitize(richHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'p', 'a', 'br', 'ul', 'li'],
  ALLOWED_ATTR: ['href', 'target'],
});

// ✅ Vue 中：默认 {{ }} 自动转义；要渲染 HTML 必须先 sanitize
// <div v-html="DOMPurify.sanitize(content)" />
```

### 常见误区

- 把 `innerHTML` 当成「省事的 textContent」，输入只要带 `<img onerror>` 就中招
- React/Vue 的 `dangerouslySetInnerHTML` / `v-html` 是 XSS 第一来源
- URL 参数直接 echo 到页面也算 XSS 入口（reflected）

### 追问

- 区分 stored / reflected / DOM-based XSS
- 什么是 Trusted Types，浏览器支持度
- CSP 的 `script-src 'self'` 能拦住所有 XSS 吗

### 延伸

- XSS 防御不是"靠一个库兜底"，而是模板、组件、渲染链路的整体设计

## csp-trusted-types

title: CSP 与 Trusted Types 为什么是现代前端的高阶防线
followups: [csp-trusted-types-followup-1]
difficulty: 进阶
tags: [CSP, TrustedTypes]

### 一句话

CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口；Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象…。

### 题目

为什么说 CSP 和 Trusted Types 能显著抬高 XSS 攻击门槛？

### 答案要点

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 `innerHTML`、`srcdoc` 等 sink 的路径
- 二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截

### 代码示例

```http
# 服务端响应头：基础 CSP（生产环境）
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-rAnD0m' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  require-trusted-types-for 'script';
  trusted-types default;
```

```ts
// Trusted Types：定义信任策略
const policy = trustedTypes.createPolicy('default', {
  createHTML: (input: string) => DOMPurify.sanitize(input),
  createScript: () => {
    throw new Error('禁止动态脚本');
  },
  createScriptURL: (url) => {
    if (new URL(url).origin === location.origin) return url;
    throw new Error('非法脚本来源');
  },
});

// 此后业务代码必须用 policy 包装才能写入危险 sink
el.innerHTML = policy.createHTML(userContent);
```

### 追问

- 如果把「CSP 与 Trusted Types 为什么是现代前端的高阶防线」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- CSP 配置不当也会伤害业务可用性，需要先梳理资源与脚本模型
- Trusted Types 的浏览器支持和落地成本都要评估，历史代码库通常需要渐进式改造

## csrf-clickjacking

title: CSRF、点击劫持与 SameSite 的关系
followups: [csrf-clickjacking-followup-1, csrf-clickjacking-followup-2, csrf-clickjacking-followup-3]
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking]

### 一句话

CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求；SameSite 限制第三方上下文自动带 Cookie；CSRF Token 用于证明请求确实来自受信页面。

### 题目

什么是 CSRF？`SameSite`、CSRF Token、X-Frame-Options 分别在防什么？

### 答案要点

- CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- `SameSite` 限制第三方上下文自动带 Cookie
- CSRF Token 用于证明请求确实来自受信页面
- `X-Frame-Options` / `frame-ancestors` 防点击劫持

### 代码示例

```http
# 鉴权 Cookie 的安全配置
Set-Cookie: session=abc123;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=86400

# 防点击劫持
X-Frame-Options: DENY
# 或更现代的 CSP frame-ancestors
Content-Security-Policy: frame-ancestors 'none'
```

```ts
// CSRF Token 双提交：前端在请求头额外带 Token
async function postWithCsrf(url: string, body: any) {
  const csrfToken = getCookie('csrf_token'); // 从非 HttpOnly 的 cookie 读
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(body),
  });
}

// 服务端校验 Cookie 中的 csrf_token == Header X-CSRF-Token
// 攻击者跨站发起请求时，无法读取受害者的 cookie，也就无法构造正确 Header
```

### 常见误区

- 以为 CSRF 只能对 form 发生——AJAX 也可以，只要带 Cookie
- 同站同域下也能 clickjacking——因为 iframe 本就和父页同域
- SameSite=Lax 不能完全防 CSRF（GET 仍有风险）

### 追问

- CSRF Token 双提交（cookie + header）原理
- X-Frame-Options 和 CSP frame-ancestors 区别
- SameSite=Strict 会带来什么用户体验问题

### 延伸

- SameSite 能显著降低风险，但不应替代真正的业务鉴权与幂等防护
- `SameSite=Lax` 对顶层导航等场景并非绝对阻断，敏感写操作仍应配合 Token、Fetch Metadata 或二次确认等机制

## cors-oauth-jwt

title: CORS、OAuth、JWT 是三回事，别混着讲
followups: [cors-oauth-jwt-followup-1]
difficulty: 进阶
tags: [CORS, OAuth, JWT]

### 一句话

CORS 管的是浏览器是否允许前端读取响应；OAuth 解决授权流程和第三方访问委托；JWT 是令牌格式，不等于安全方案本身。

### 题目

为什么“能跨域”和“有权限访问”是两套完全不同的问题？

### 答案要点

- CORS 管的是浏览器是否允许前端读取响应
- OAuth 解决授权流程和第三方访问委托
- JWT 是令牌格式，不等于安全方案本身
- 即使 CORS 放开，服务端仍要做身份认证和资源授权

### 代码示例

```http
# 服务端 CORS 响应头（生产环境最小化）
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type, X-CSRF-Token
Access-Control-Max-Age: 86400
```

```ts
// JWT 解析（仅展示结构，校验签名必须由服务端做）
interface JwtPayload {
  sub: string;
  exp: number;
  role: string;
}
function decodeJwt(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

// ⚠️ 前端切勿信任 JWT 内容做权限判断，必须服务端校验签名 + 过期
// ⚠️ JWT 不要存 localStorage（XSS 即被盗），优先 HttpOnly Cookie

// OAuth 2.0 + PKCE（前端应用推荐）
function genCodeVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '');
}
async function genCodeChallenge(verifier: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 追问

- 如果把「CORS、OAuth、JWT 是三回事，别混着讲」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 面试里把 CORS、鉴权、登录态混为一谈，会显得基础不牢
- OAuth 2.0 在前端应用里通常还要关注 PKCE、redirect URI 校验、token 存放位置和 refresh 策略等实际落地细节

## supply-chain

title: npm 供应链攻击与前端依赖治理
followups: [supply-chain-followup-1]
difficulty: 进阶
tags: [供应链安全, npm]

### 一句话

固定 lockfile，避免不可控漂移；审查高权限依赖、postinstall 脚本、拼写相似包；对关键依赖做来源核验、版本升级计划和漏洞响应流程。

### 题目

前端依赖越来越多，供应链安全应该如何做基本防线？

### 答案要点

- 固定 lockfile，避免不可控漂移
- 审查高权限依赖、postinstall 脚本、拼写相似包
- 对关键依赖做来源核验、版本升级计划和漏洞响应流程
- 在 CI 做依赖审计，但不要把审计结果当成唯一安全判断

### 代码示例

```bash
# 1. 锁文件 + frozen 安装
pnpm install --frozen-lockfile

# 2. 审计已知漏洞
pnpm audit --audit-level=high

# 3. 禁止 postinstall 脚本（pnpm 9+）
pnpm config set side-effects-cache false
pnpm config set ignore-scripts true
# 仅给特定包放行
pnpm config set onlyBuiltDependencies '["esbuild","sharp"]'

# 4. 自动化扫描（CI 中）
npx better-npm-audit audit
npx socket security
```

```yaml
# GitHub Actions：依赖审计 workflow
name: audit
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile --ignore-scripts
      - run: pnpm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with: { scan-type: 'fs', scan-ref: '.' }
```

### 追问

- 如果把「npm 供应链攻击与前端依赖治理」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- "官方仓库下载量高"不代表一定安全，维护权交接和依赖链污染都很常见
- 供应链治理还包括限制安装脚本执行、保护私有 registry、审查发布权限和关注依赖维护权变更

## prototype-pollution

title: 原型链污染为什么危险，如何防
followups: [prototype-pollution-followup-1]
difficulty: 进阶
tags: [原型链污染, 对象合并]

### 一句话

攻击者通过 **proto**、constructor.prototype 等路径污染全局原型；一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条…。

### 题目

什么是 prototype pollution？它为什么经常出现在工具函数和配置合并逻辑里？

### 答案要点

- 攻击者通过 `__proto__`、`constructor.prototype` 等路径污染全局原型
- 一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条
- 防御手段：限制可写路径、使用 `Object.create(null)`、过滤危险 key、升级有漏洞依赖

### 代码示例

```ts
// ❌ 不安全的 merge：未过滤 __proto__
function unsafeMerge(target: any, source: any): any {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      target[key] = target[key] ?? {};
      unsafeMerge(target[key], source[key]);
    } else target[key] = source[key];
  }
  return target;
}
// 攻击：unsafeMerge({}, JSON.parse('{"__proto__":{"isAdmin":true}}'));
// 之后 ({}).isAdmin 为 true，全局原型被污染

// ✅ 安全 merge：过滤危险键 + 使用 Object.create(null)
const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);
function safeMerge<T extends object>(target: T, source: any): T {
  for (const key of Object.keys(source)) {
    if (DANGEROUS.has(key)) continue;
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      (target as any)[key] = (target as any)[key] ?? Object.create(null);
      safeMerge((target as any)[key], source[key]);
    } else (target as any)[key] = source[key];
  }
  return target;
}

// ✅ 用 Map 替代对象做字典
const dict = new Map<string, any>();

// ✅ 冻结全局原型
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
```

### 追问

- 如果把「原型链污染为什么危险，如何防」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 原型污染往往是"低层工具库问题，高层业务全线受影响"

## source-map-secrets

title: Source Map、环境变量与前端敏感信息边界
followups: [source-map-secrets-followup-1]
difficulty: 基础
tags: [SourceMap, Secrets]

### 一句话

任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节；sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题；环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置。

### 题目

前端项目里哪些信息绝不能当成“前端也能保密”的秘密？

### 答案要点

- 任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题
- 环境变量里以 `VITE_` 等前缀暴露到前端的内容，本质就是公开配置

### 代码示例

```ts
// vite.config.ts：env 前缀控制
export default defineConfig({
  envPrefix: ['VITE_'], // 仅 VITE_ 开头的会注入到 import.meta.env
});

// .env
VITE_API_URL=https://api.example.com   // ✅ 公开 URL
VITE_PUBLIC_KEY=pk_live_xxx            // ✅ 公开 publishable key
DB_PASSWORD=secret                      // ✅ 不会进前端 bundle
JWT_SIGN_KEY=secret                     // ✅ 不会进前端 bundle

// ❌ 不要把私钥写在前端代码里
// ❌ 不要把数据库连接串放前端
// ❌ 不要靠"前端混淆"保护算法
```

```yaml
# CI 中：生产构建禁用 sourcemap，或仅上传到 Sentry 不发布到 CDN
# vite.config.ts
build:
  sourcemap: 'hidden'  # 生成 sourcemap 但不附带注释，外部无法发现

# 在 release 阶段单独上传到错误监控平台
- run: sentry-cli sourcemaps upload --release=$VERSION dist/
- run: rm -rf dist/**/*.map  # 上传后从产物中移除
```

### 追问

- 如果把「Source Map、环境变量与前端敏感信息边界」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 前端能做的是"减少暴露面和滥用成本"，不是"替后端保密"
- 真正的密钥、签名私钥、第三方管理口令只能存在受控服务端或专用密钥管理系统中

## passkeys-webauthn

title: Passkeys / WebAuthn 取代密码的工程化路径
followups: [passkeys-webauthn-followup-1]
difficulty: 资深
tags: [Passkeys, WebAuthn]

### 一句话

原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥…。

### 题目

Passkeys 怎么工作？业务接入要做哪些事，对老用户怎么平滑迁移？

### 答案要点

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 流程：注册 → `navigator.credentials.create({ publicKey })` → 把公钥送服务端；登录 → `navigator.credentials.get({ publicKey })` → 服务端校验签名
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 兼容：iOS 16+、Android 9+、主流桌面浏览器，老设备保留密码登录作为兜底
- 注册时需要 RP id（域名）、challenge、user 信息；登录时只要 challenge + allowCredentials
- 安全：challenge 必须服务端生成且一次性，origin 校验交给浏览器，不要自己实现

### 代码示例

```ts
async function registerPasskey(userId: string, name: string) {
  const challenge = new Uint8Array(await fetch('/auth/challenge').then((r) => r.arrayBuffer()));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: 'kap.dev', name: 'KAP' },
      user: { id: new TextEncoder().encode(userId), name, displayName: name },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential;
  await fetch('/auth/register', { method: 'POST', body: cred.response.toString() });
}

async function loginWithPasskey() {
  const challenge = new Uint8Array(await fetch('/auth/challenge').then((r) => r.arrayBuffer()));
  const cred = (await navigator.credentials.get({
    publicKey: { challenge, rpId: 'kap.dev', userVerification: 'preferred' },
  })) as PublicKeyCredential;
  await fetch('/auth/verify', { method: 'POST', body: cred.response.toString() });
}
```

### 追问

- 如果把「Passkeys / WebAuthn 取代密码的工程化路径」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 渐进策略：先把 Passkey 作为"二步验证"加入，让用户熟悉；再开启"无密码登录"
- 服务端接 [SimpleWebAuthn](https://simplewebauthn.dev) 等成熟库，不要自己实现 CBOR 解析

## subresource-integrity

title: Subresource Integrity 与第三方资源篡改
followups: [subresource-integrity-followup-1]
difficulty: 进阶
tags: [SRI, CDN]

### 一句话

SRI（Subresource Integrity）：在 <script> / <link> 上加 integrity 属性指定文件的 hash，浏览器校验失败就拒绝执行；哈希算法：sha256 / sha384 / sha512…。

### 题目

引入第三方 CDN 脚本时怎么避免被中间人篡改？SRI 怎么用？

### 答案要点

- SRI（Subresource Integrity）：在 `<script>` / `<link>` 上加 `integrity` 属性指定文件的 hash，浏览器校验失败就拒绝执行
- 哈希算法：sha256 / sha384 / sha512，建议 sha384 起步
- 配合 `crossorigin="anonymous"` 避免 hash 校验绕过
- 自动化：构建期对外链脚本生成 SRI，提交时锁定
- 局限：只能保护静态资源；动态生成 / 频繁更新的资源不适合 SRI
- CSP `require-sri-for` 可以强制 SRI（实验特性，兼容性需评估）

### 代码示例

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-AbCdEf012345..."
  crossorigin="anonymous"
></script>
```

```ts
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function sri(file: string, algo: 'sha256' | 'sha384' | 'sha512' = 'sha384') {
  const hash = createHash(algo).update(readFileSync(file)).digest('base64');
  return `${algo}-${hash}`;
}

console.log(sri('dist/lib.js'));
```

### 追问

- 如果把「Subresource Integrity 与第三方资源篡改」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 用了 webpack-subresource-integrity / vite-plugin-sri 可以自动注入 SRI
- 不要把第三方 CDN 当作"自己的代码"，关键脚本能内嵌就内嵌，能自托管就自托管

## xss-csrf-defense

title: XSS 与 CSRF 的区别和防御
followups: [xss-csrf-defense-followup-1]
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频]

### 一句话

XSS：坏人在你的页面里塞了一段 JS 帮自己干活（偷 cookie、改请求）→ 防御的核心是**输出转义 + CSP**。CSRF：坏人借用你已登录的 cookie 给后端发请求 → 防御靠**SameSite Cookie + CSRF Token**。

### 题目

分别解释 XSS / CSRF 的攻击原理和工程上对应的防御方案。

### 答案要点

- **XSS（Cross-Site Scripting）**：让目标用户的浏览器执行恶意脚本
  - 反射型：恶意参数随 URL 反射进页面
  - 存储型：恶意脚本存进数据库（评论、富文本）
  - DOM 型：前端用 `innerHTML` 拼接用户输入
  - 防御：
    - 输出按上下文转义（HTML/属性/JS/URL）
    - 富文本走 DOMPurify 白名单清洗
    - HttpOnly Cookie 防止 JS 读取 token
    - CSP `Content-Security-Policy: default-src 'self'`，禁止 inline script
    - Trusted Types（Chrome 83+）
- **CSRF（Cross-Site Request Forgery）**：用户登录了 A 站，访问坏人的 B 站，B 站提交了一个发到 A 站的请求，浏览器自动带上 A 站的 cookie
  - 防御：
    - SameSite=Lax/Strict（最简单有效，现代浏览器默认 Lax）
    - 双 Token：一份在 cookie 一份在 header，对比一致
    - 关键操作（转账、改密码）二次确认 + 验证码
    - 检查 Origin / Referer
- 总结：XSS 防"代码注入"、CSRF 防"被冒名提交"

### 代码示例

```js
import DOMPurify from 'dompurify';
const safeHtml = DOMPurify.sanitize(userInput);
document.querySelector('#content').innerHTML = safeHtml;
```

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'
```

```js
fetch('/api/transfer', {
  method: 'POST',
  credentials: 'include',
  headers: { 'X-CSRF-Token': getCookie('csrfToken') },
  body: JSON.stringify({ to: 'bob', amount: 100 }),
});
```

### 追问

- 如果把「XSS 与 CSRF 的区别和防御」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- XSS 还会衍生出 Self-XSS、Mutation XSS（DOM 解析容错坑）
- CSRF 与 SameSite 的过渡期（旧浏览器）需要后端兜底
- 现代框架（React、Vue）默认转义文本，所以滥用 `v-html / dangerouslySetInnerHTML` 才是 XSS 主要源头
- 安全 = 默认安全 × 防御深度，单点措施都不够

## auth-token-jwt

title: 鉴权方案 Cookie+Session vs JWT 怎么选
followups: [auth-token-jwt-followup-1]
difficulty: 进阶
tags: [鉴权, JWT, Session]

### 一句话

**Cookie + Session**：服务端有状态、可随时踢人，配合 HttpOnly + Secure + SameSite 最稳；**JWT**：无状态、可跨服务，但很难主动过期。Web 应用首选 Cookie+Session，纯 API / 微服务才用 JWT。

### 题目

请对比 Cookie + Session 与 JWT 两种鉴权方案，从安全、性能、运维角度评估。

### 答案要点

- **Cookie + Session（有状态）**
  - 服务端保存 sessionId → 用户信息（Redis / DB）
  - 前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF
  - 优点：可主动失效（踢人 / 改密码退出所有设备），权限变更立即生效
  - 缺点：分布式架构需要共享 session 存储
- **JWT（无状态）**
  - Token 自身包含信息（header.payload.signature），服务端验签
  - 优点：跨服务无状态、移动端 / 第三方接入方便
  - 缺点：
    - **难主动过期**（已签发的 token 在到期前都有效），需配合 refresh token + 黑名单
    - 不要把敏感信息放进 payload（base64 可读）
    - 必须 HTTPS（不然中间人可拿走 token）
- **混合方案（最常用）**
  - Web 用 Cookie + Session
  - 移动端 / OAuth 第三方用 access_token + refresh_token
  - access_token 短效（15min），refresh_token 长效（7 天）+ 服务端撤销列表
- **安全要点**
  - 密码用 bcrypt / argon2 加盐，永远不存明文
  - 登录限速（防暴力破解）+ 验证码（防机器）
  - Passkeys / WebAuthn 是密码的替代趋势

### 代码示例

```http
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax; Max-Age=86400
```

```js
import jwt from 'jsonwebtoken';
const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.SECRET, {
  expiresIn: '15m',
});
const decoded = jwt.verify(token, process.env.SECRET);
```

### 追问

- 如果把「鉴权方案 Cookie+Session vs JWT 怎么选」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 单点登录（SSO）多用 OAuth 2.0 + OIDC（基于 JWT）
- 大厂内部一般 Cookie + Session 主流，对 C 端用户最稳

## supply-chain-attack

title: 前端供应链攻击怎么防？
followups: [supply-chain-attack-followup-1]
difficulty: 资深
tags: [安全, 供应链, 高频]

### 一句话

锁版本（lockfile + `--frozen-lockfile`）+ 隔离构建（CI 不可信脚本不跑）+ 来源审计（npm audit / socket.dev / snyk）+ 子资源校验（SRI）+ 最小权限（npm provenance / OIDC publish）。

### 题目

某 npm 包被劫持后投毒，下载即偷取环境变量。讲讲攻击链和防御措施。

### 答案要点

- **典型攻击形态**
  - **依赖投毒**：作者账号被盗 / 卖号 → 发新版本带恶意代码
  - **typosquatting**：注册相似名字（reactt / lodahs）骗误装
  - **依赖混淆**：内部包名抢注公共 npm
  - **postinstall 脚本**：npm install 时执行任意代码（偷 .npmrc / .env / SSH key）
  - **CI 投毒**：恶意 PR 改 ci 脚本拿环境 secret
- **运行期 / 构建期防御**
  - **lockfile 严格**：`pnpm install --frozen-lockfile` / `npm ci`，不偷偷升级
  - **disable 安装脚本**：`npm config set ignore-scripts true`，需要再单独允许
  - **私有 registry**：所有包走自家镜像，避免依赖混淆 + 可缓存吊销
  - **CI 隔离**：fork PR 不接 secret；workflow 用 `permissions: read-all`
  - **secret 管理**：用 GitHub Secret / Vault；不在代码 / .env.example 里暴露真值
- **审计 / 检测**
  - npm audit / pnpm audit 定期跑
  - socket.dev / snyk：行为分析（哪些包试图读 .ssh、发外网请求）
  - dependabot / renovate：及时升级修复 CVE
  - 监控锁文件改动：CI 检查 lockfile 是否随 PR 一起改且合理
- **发布端**
  - npm 2FA 必开
  - npm provenance（OIDC + sigstore）：证明这个包是从这个仓库这次 CI 构建出来的
  - 关键包：用 ` --access=public --provenance` 发布
- **运行时（线上）**
  - SRI（Subresource Integrity）：CDN 引入第三方脚本带 hash 校验
  - CSP：限制可加载的脚本来源
  - 敏感操作再校验（不只信前端）
- **真实事件**
  - event-stream（2018）：作者把权限交给陌生人 → 加币包括 BitPay
  - ua-parser-js（2021）：作者账号被盗 → 投毒矿工
  - color.js / faker.js（2022）：作者主动 sabotage
- **应急**
  - 发现可疑：立刻锁 CI、改密钥、扫日志看是否泄漏
  - rollback 到已知干净版本
  - 通知用户 + 公告

### 代码示例

```bash
npm config set ignore-scripts true
pnpm install --frozen-lockfile

npx @socketsecurity/cli scan
pnpm audit --prod
```

```yaml
permissions:
  contents: read
  id-token: write
  pull-requests: read

jobs:
  publish:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile --ignore-scripts
      - run: pnpm build
      - run: pnpm publish --access=public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-abc..."
  crossorigin="anonymous"
></script>
```

### 追问

- 如果把「前端供应链攻击怎么防？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- SLSA（supply-chain levels for software artifacts）成熟度框架
- SBOM（Software Bill of Materials）：清晰列出所有依赖，便于事后审计

## web-crypto-fundamentals

title: 浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查
followups: [web-crypto-fundamentals-followup-1, web-crypto-fundamentals-followup-2, web-crypto-fundamentals-followup-3]
difficulty: 进阶
tags: [加密, WebCrypto, 高频]

### 一句话

浏览器自带的 `crypto.subtle` 提供 AES / RSA / ECDSA / SHA / HKDF / PBKDF2，**永远不要自己实现密码学**——直接调原生 API，安全 + 性能（可能用硬件加速）。

### 题目

请描述 Web Crypto API 的常用能力，并各举一个前端实战场景（哈希、对称加密、非对称签名、密钥派生）。

### 答案要点

- **API 入口**：`crypto.subtle`（仅在 https / localhost 可用）+ `crypto.getRandomValues`（同步随机字节）
- **常见算法分类**：
  - **哈希**：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）
  - **对称加密**：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）
  - **非对称加密**：RSA-OAEP（加密小数据）/ RSA-PSS（签名）/ ECDSA（签名，更短更快）
  - **密钥协商**：ECDH（P-256 / P-384）
  - **密钥派生**：HKDF（从已有密钥派生）/ PBKDF2（从密码派生，慢哈希）
- **前端实战场景**：
  - 文件秒传：SHA-256 算文件指纹，秒传判定
  - 密码不直传：登录时前端用 PBKDF2 + salt 派生 hash 上传（仍需 https 兜底）
  - 上传完整性：AES-GCM 加密敏感字段（如医疗 / 金融）落本地 cache
  - JWT 校验：ES256 用 ECDSA + SHA-256
  - E2EE IM：ECDH 协商 + AES-GCM 加密消息（详见 28-customer-service-im 专题）
- **密钥管理**：
  - 用 `generateKey({ extractable: false })` 防止私钥被导出
  - IndexedDB 可直接存 CryptoKey 对象，不用序列化
  - 浏览器关闭后密钥还在（除非用户清数据）

### 代码示例

```ts
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function aesEncrypt(plain: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plain),
  );
  return { salt, iv, cipher: new Uint8Array(cipher) };
}

async function ecdsaSign(privKey: CryptoKey, data: string) {
  return crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(data),
  );
}
```

### 常见误区

- 用 `crypto.getRandomValues` 生成 IV 但反复用同一个 —— AES-GCM 复用 IV 等于自杀
- AES-CBC 不加 HMAC（CBC 不带认证）—— padding oracle 攻击
- PBKDF2 迭代次数 < 10 万 —— 暴力破解友好
- 把 RSA-OAEP 用来加密大数据 —— RSA 只能加密 < 密钥长度的小数据；要 hybrid（RSA 包 AES key）
- 自己 base64 编码 ArrayBuffer：用 `btoa(String.fromCharCode(...new Uint8Array(buf)))` 在大数据时栈溢出

### 追问

- WebAuthn / Passkeys 是怎么基于 Web Crypto 工作的
- HSM / TPM 这些硬件密钥和浏览器 Web Crypto 的关系
- 为什么不能在 http 站点用 crypto.subtle（secure context 限制）

### 延伸

- W3C Web Crypto API spec：算法清单详见 [w3.org/TR/WebCryptoAPI](https://www.w3.org/TR/WebCryptoAPI/)
- 原生 API 比 sjcl / crypto-js 快几十倍，且不会因 npm 版本错误引入漏洞

## sensitive-info-leak

title: 客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些？
followups: [sensitive-info-leak-followup-1, sensitive-info-leak-followup-2, sensitive-info-leak-followup-3]
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频]

### 一句话

泄漏不只是接口暴露——**剪贴板 / 截屏 / postMessage / DevTools 暴露 / 未脱敏日志 / source map / 浏览器扩展 / 缓存**都是真实事故源。

### 题目

列出前端项目（特别是客服 / 财务 / 医疗 SaaS）中常被忽视的敏感信息泄漏点，以及对应的防护手段。

### 答案要点

- **剪贴板（Clipboard API）**：
  - 复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄
  - 防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste
- **截屏 / 屏幕分享**：
  - Web 没法完全禁截屏；但可在 visibilitychange 检测，弹"已退出敏感页面"
  - `getDisplayMedia()` 共享屏幕时检测共享开始 → 自动隐藏敏感字段
- **postMessage 跨窗口**：
  - 嵌入第三方 iframe 时 `postMessage(data, '*')` 把数据广播给任何 origin
  - 必须指定 targetOrigin、收端 `event.origin === expected` 校验
- **DevTools 暴露**：
  - `console.log(user)` 上线还在 → 任何人 F12 看到完整对象
  - 敏感字段（手机 / 邮箱 / 卡号）按位脱敏：`138****0000`、`a***@gmail.com`
  - 生产环境关 logger 或重定向到上报通道
- **Source Map**：
  - dist 上传带 .map 源码暴露 → 商业逻辑、API URL、key 都看到
  - 上线只把 .map 上传到错误监控后台，不公开访问；CDN 路径用 nginx deny
- **本地存储 / 缓存**：
  - localStorage / IndexedDB 数据 XSS 一发就读光 → 敏感信息加密存（详见 web-crypto）
  - HTTP 响应 `Cache-Control` 没 `no-store`，CDN / 代理 / 浏览器 back-cache 都可能留下
  - **bfcache** 让退后页面带 form 数据回来——共享电脑的下一个用户会看到
- **第三方脚本 / 扩展**：
  - 用户装的浏览器扩展可读 DOM、读 cookie，按"页面权限"分级
  - 第三方 SDK（埋点 / 客服 widget）读到了什么 → 用 SRI + 审计 SDK 行为
- **其他**：
  - URL query string 含 token —— 浏览器历史 / Referer 泄漏
  - alert / confirm 弹敏感数据 —— 屏幕分享时暴露
  - service worker 缓存了带敏感数据的接口

### 代码示例

```ts
function maskPhone(s: string): string {
  return s.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}
function maskEmail(s: string): string {
  return s.replace(/^(.{1,2})[^@]*(@.+)$/, '$1***$2');
}

if (import.meta.env.PROD) {
  console.log = console.info = console.debug = () => undefined;
}

window.addEventListener('message', (e) => {
  if (e.origin !== 'https://trusted.example.com') return;
  handle(e.data);
});

function shareToFrame(frame: HTMLIFrameElement, data: unknown) {
  frame.contentWindow?.postMessage(data, 'https://trusted.example.com');
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    blurSensitiveFields();
  }
});

navigator.mediaDevices.addEventListener?.('devicechange', () => {
  if ((navigator as any).mediaDevices.getDisplayMedia) {
    hideSensitiveOnScreenShare();
  }
});

function safeCopy(text: string) {
  navigator.clipboard.writeText(text);
  toast('已复制（请勿粘贴到聊天群组等不可信场景）');
}
```

### 常见误区

- 只看 OWASP Top 10 不看业务面 —— "技术上没漏洞"但用户真实场景一堆泄漏
- 日志全量上报 —— 上报通道存的是用户隐私
- bfcache 不知道存在 —— 退出页面回退后表单 / 状态全部还在
- Source map 公开放在 CDN —— 攻击者 5 秒拿到完整源码

### 追问

- "屏幕保护模式"（敏感页面 blur）是不是值得做
- 怎么知道用户装了哪些浏览器扩展（其实拿不到）
- localStorage 加密存储和不存的取舍

### 延伸

- 银行 / 医疗 / 政务等行业有专门的隐私设计规范（WCAG / HIPAA / 网安等保）
- "数据最小化"原则：能不存就不存、能不显示就不显示

## xss-followup-1

title: 追问：区分 stored / reflected / DOM-based XSS
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 题目

如果面试官追问：区分 stored / reflected / DOM-based XSS

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- React/Vue 的 dangerouslySetInnerHTML / v-html 是 XSS 第一来源
- URL 参数直接 echo 到页面也算 XSS 入口（reflected）
- XSS 防御不是"靠一个库兜底"，而是模板、组件、渲染链路的整体设计
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## xss-followup-2

title: 追问：什么是 Trusted Types，浏览器支持度
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 题目

如果面试官追问：什么是 Trusted Types，浏览器支持度

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「XSS 三种类型与前端最该做的防御」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## xss-followup-3

title: 追问：CSP 的 script-src 'self' 能拦住所有 XSS 吗
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 题目

如果面试官追问：CSP 的 `script-src 'self'` 能拦住所有 XSS 吗

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- React/Vue 的 dangerouslySetInnerHTML / v-html 是 XSS 第一来源
- URL 参数直接 echo 到页面也算 XSS 入口（reflected）
- XSS 防御不是"靠一个库兜底"，而是模板、组件、渲染链路的整体设计
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## csp-trusted-types-followup-1

title: 追问：如果把「CSP 与 Trusted Types 为什么是现代前端的高阶防线」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types

### 题目

如果面试官追问：如果把「CSP 与 Trusted Types 为什么是现代前端的高阶防线」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径
- CSP 配置不当也会伤害业务可用性，需要先梳理资源与脚本模型
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## csrf-clickjacking-followup-1

title: 追问：CSRF Token 双提交原理
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 题目

如果面试官追问：CSRF Token 双提交（cookie + header）原理

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- SameSite 限制第三方上下文自动带 Cookie
- CSRF Token 用于证明请求确实来自受信页面
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## csrf-clickjacking-followup-2

title: 追问：X-Frame-Options 和 CSP frame-ancestors 区别
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 题目

如果面试官追问：X-Frame-Options 和 CSP frame-ancestors 区别

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- X-Frame-Options / frame-ancestors 防点击劫持
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## csrf-clickjacking-followup-3

title: 追问：SameSite=Strict 会带来什么用户体验问题
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 题目

如果面试官追问：SameSite=Strict 会带来什么用户体验问题

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- SameSite 限制第三方上下文自动带 Cookie
- SameSite=Lax 不能完全防 CSRF（GET 仍有风险）
- SameSite 能显著降低风险，但不应替代真正的业务鉴权与幂等防护
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## cors-oauth-jwt-followup-1

title: 追问：如果把「CORS、OAuth、JWT 是三回事，别混着讲」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt

### 题目

如果面试官追问：如果把「CORS、OAuth、JWT 是三回事，别混着讲」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- CORS 管的是浏览器是否允许前端读取响应
- OAuth 解决授权流程和第三方访问委托
- JWT 是令牌格式，不等于安全方案本身
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## supply-chain-followup-1

title: 追问：如果把「npm 供应链攻击与前端依赖治理」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain

### 题目

如果面试官追问：如果把「npm 供应链攻击与前端依赖治理」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 审查高权限依赖、postinstall 脚本、拼写相似包
- 对关键依赖做来源核验、版本升级计划和漏洞响应流程
- 在 CI 做依赖审计，但不要把审计结果当成唯一安全判断
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## prototype-pollution-followup-1

title: 追问：如果把「原型链污染为什么危险，如何防」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution

### 题目

如果面试官追问：如果把「原型链污染为什么危险，如何防」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 攻击者通过 **proto**、constructor.prototype 等路径污染全局原型
- 防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖
- 原型污染往往是"低层工具库问题，高层业务全线受影响"
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## source-map-secrets-followup-1

title: 追问：如果把「Source Map、环境变量与前端敏感信息边界」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets

### 题目

如果面试官追问：如果把「Source Map、环境变量与前端敏感信息边界」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题
- 环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## passkeys-webauthn-followup-1

title: 追问：如果把「Passkeys / WebAuthn 取代密码的工程化路径」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn

### 题目

如果面试官追问：如果把「Passkeys / WebAuthn 取代密码的工程化路径」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 兼容：iOS 16+、Android 9+、主流桌面浏览器，老设备保留密码登录作为兜底
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## subresource-integrity-followup-1

title: 追问：如果把「Subresource Integrity 与第三方资源篡改」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity

### 题目

如果面试官追问：如果把「Subresource Integrity 与第三方资源篡改」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- SRI（Subresource Integrity）：在 / 上加 integrity 属性指定文件的 hash，浏览器校验失败就拒绝执行
- 局限：只能保护静态资源；动态生成 / 频繁更新的资源不适合 SRI
- 用了 webpack-subresource-integrity / vite-plugin-sri 可以自动注入 SRI
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## xss-csrf-defense-followup-1

title: 追问：如果把「XSS 与 CSRF 的区别和防御」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense

### 题目

如果面试官追问：如果把「XSS 与 CSRF 的区别和防御」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- CSRF（Cross-Site Request Forgery）：用户登录了 A 站，访问坏人的 B 站，B 站提交了一个发到 A 站的请求，浏览器自动带上 A 站的 cookie
- 关键操作（转账、改密码）二次确认 + 验证码
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## auth-token-jwt-followup-1

title: 追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt

### 题目

如果面试官追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 登录限速（防暴力破解）+ 验证码（防机器）
- 单点登录（SSO）多用 OAuth 2.0 + OIDC（基于 JWT）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## supply-chain-attack-followup-1

title: 追问：如果把「前端供应链攻击怎么防？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack

### 题目

如果面试官追问：如果把「前端供应链攻击怎么防？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- socket.dev / snyk：行为分析（哪些包试图读 .ssh、发外网请求）
- 敏感操作再校验（不只信前端）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## web-crypto-fundamentals-followup-1

title: 追问：WebAuthn / Passkeys 是怎么基于 Web Crypto 工作的
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 题目

如果面试官追问：WebAuthn / Passkeys 是怎么基于 Web Crypto 工作的

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- IndexedDB 可直接存 CryptoKey 对象，不用序列化
- 用 crypto.getRandomValues 生成 IV 但反复用同一个 —— AES-GCM 复用 IV 等于自杀
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## web-crypto-fundamentals-followup-2

title: 追问：HSM / TPM 这些硬件密钥和浏览器 Web Crypto 的关系
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 题目

如果面试官追问：HSM / TPM 这些硬件密钥和浏览器 Web Crypto 的关系

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 密钥协商：ECDH（P-256 / P-384）
- 密钥派生：HKDF（从已有密钥派生）/ PBKDF2（从密码派生，慢哈希）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## web-crypto-fundamentals-followup-3

title: 追问：为什么不能在 http 站点用 crypto.subtle
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 题目

如果面试官追问：为什么不能在 http 站点用 crypto.subtle（secure context 限制）

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 密码不直传：登录时前端用 PBKDF2 + salt 派生 hash 上传（仍需 https 兜底）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sensitive-info-leak-followup-1

title: 追问："屏幕保护模式"是不是值得做
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 题目

如果面试官追问："屏幕保护模式"（敏感页面 blur）是不是值得做

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste
- Web 没法完全禁截屏；但可在 visibilitychange 检测，弹"已退出敏感页面"
- getDisplayMedia() 共享屏幕时检测共享开始 → 自动隐藏敏感字段
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sensitive-info-leak-followup-2

title: 追问：怎么知道用户装了哪些浏览器扩展
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 题目

如果面试官追问：怎么知道用户装了哪些浏览器扩展（其实拿不到）

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄
- HTTP 响应 Cache-Control 没 no-store，CDN / 代理 / 浏览器 back-cache 都可能留下
- bfcache 让退后页面带 form 数据回来——共享电脑的下一个用户会看到
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sensitive-info-leak-followup-3

title: 追问：localStorage 加密存储和不存的取舍
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 题目

如果面试官追问：localStorage 加密存储和不存的取舍

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- localStorage / IndexedDB 数据 XSS 一发就读光 → 敏感信息加密存（详见 web-crypto）
- 日志全量上报 —— 上报通道存的是用户隐私
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。
