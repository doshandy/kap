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
links: [11-ai-frontend/prompt-injection, csp-trusted-types, 28-customer-service-im/chat-rich-text-safe-render]
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

#### 补充说明

- 面试中不要只停留在「XSS 三种类型与前端最该做的防御」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 XSS、输出编码 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 安全题要补威胁模型、信任边界、攻击路径和服务端兜底，不能只停留在前端 API。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「XSS 三种类型与前端最该做的防御」时要先确认 XSS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，XSS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 XSS 链路分层收口再逐步统一。

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
followups: [csp-trusted-types-followup-1, csp-trusted-types-followup-2, csp-trusted-types-followup-3]
links: [xss, xss-csrf-defense]
difficulty: 进阶
tags: [CSP, TrustedTypes]

### 一句话

CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口；Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象。

### 题目

为什么说 CSP 和 Trusted Types 能显著抬高 XSS 攻击门槛？

### 答案要点

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 `innerHTML`、`srcdoc` 等 sink 的路径
- 二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 CSP 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，CSP 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「CSP 与 Trusted Types 为什么是现代前端的高阶防线」风险不足；当前优先服务端强校验，因为可审计、可回滚。

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

- 「CSP 与 Trusted Types 为什么是现代前端的高阶防线」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「CSP 与 Trusted Types 为什么是现代前端的高阶防线」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 CSP、TrustedTypes，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- CSP 配置不当也会伤害业务可用性，需要先梳理资源与脚本模型
- Trusted Types 的浏览器支持和落地成本都要评估，历史代码库通常需要渐进式改造

## csrf-clickjacking

title: CSRF、点击劫持与 SameSite 的关系
followups: [csrf-clickjacking-followup-1, csrf-clickjacking-followup-2, csrf-clickjacking-followup-3]
links: [auth-token-jwt, cors-oauth-jwt, passkeys-webauthn]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「CSRF、点击劫持与 SameSite 的关系」时要先确认 CSRF 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，CSRF 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 CSRF 链路分层收口再逐步统一。

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
followups: [cors-oauth-jwt-followup-1, cors-oauth-jwt-followup-2, cors-oauth-jwt-followup-3]
links: [auth-token-jwt, csrf-clickjacking, passkeys-webauthn]
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

#### 补充说明

- 面试中不要只停留在「CORS、OAuth、JWT 是三回事，别混着讲」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 CORS、OAuth、JWT 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 安全题要补威胁模型、信任边界、攻击路径和服务端兜底，不能只停留在前端 API。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「CORS、OAuth、JWT 是三回事，别混着讲」时要先确认 CORS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，CORS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 CORS 链路分层收口再逐步统一。

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

- 如果把「CORS、OAuth、JWT 是三回事，别混着讲」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「CORS、OAuth、JWT 是三回事，别混着讲」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 CORS、OAuth、JWT，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 面试里把 CORS、鉴权、登录态混为一谈，会显得基础不牢
- OAuth 2.0 在前端应用里通常还要关注 PKCE、redirect URI 校验、token 存放位置和 refresh 策略等实际落地细节

## supply-chain

title: npm 供应链攻击与前端依赖治理
followups: [supply-chain-followup-1, supply-chain-followup-2, supply-chain-followup-3]
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

#### 补充说明

- 面试中不要只停留在「npm 供应链攻击与前端依赖治理」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 供应链安全、npm 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 安全题要补威胁模型、信任边界、攻击路径和服务端兜底，不能只停留在前端 API。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「npm 供应链攻击与前端依赖治理」时要先确认 npm 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，npm 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 npm 链路分层收口再逐步统一。

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

- 如果把「npm 供应链攻击与前端依赖治理」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「npm 供应链攻击与前端依赖治理」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 供应链安全、npm，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- "官方仓库下载量高"不代表一定安全，维护权交接和依赖链污染都很常见
- 供应链治理还包括限制安装脚本执行、保护私有 registry、审查发布权限和关注依赖维护权变更

## prototype-pollution

title: 原型链污染为什么危险，如何防
followups: [prototype-pollution-followup-1, prototype-pollution-followup-2, prototype-pollution-followup-3]
difficulty: 进阶
tags: [原型链污染, 对象合并]

### 一句话

攻击者通过 `__proto__`、`constructor.prototype` 等路径污染全局原型；一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条。

### 题目

什么是 prototype pollution？它为什么经常出现在工具函数和配置合并逻辑里？

### 答案要点

- 攻击者通过 `__proto__`、`constructor.prototype` 等路径污染全局原型
- 一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条
- 防御手段：限制可写路径、使用 `Object.create(null)`、过滤危险 key、升级有漏洞依赖

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「原型链污染为什么危险，如何防」时要把 原型链污染为什么危险 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，原型链污染为什么危险 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「原型链污染为什么危险，如何防」里当前按阶段替换更稳。

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

- 「原型链污染为什么危险，如何防」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「原型链污染为什么危险，如何防」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 原型链污染、对象合并，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 原型污染往往是"低层工具库问题，高层业务全线受影响"

## source-map-secrets

title: Source Map、环境变量与前端敏感信息边界
followups: [source-map-secrets-followup-1, source-map-secrets-followup-2, source-map-secrets-followup-3]
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

#### 补充说明

- 面试中不要只停留在「Source Map、环境变量与前端敏感信息边界」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 SourceMap、Secrets 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 回答时要从定义、机制、边界、落地和验证五个层面展开。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「Source Map、环境变量与前端敏感信息边界」风险偏高；当前方案可验证、可灰度、可回滚。

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

- 「Source Map、环境变量与前端敏感信息边界」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「Source Map、环境变量与前端敏感信息边界」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 SourceMap、Secrets，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 前端能做的是"减少暴露面和滥用成本"，不是"替后端保密"
- 真正的密钥、签名私钥、第三方管理口令只能存在受控服务端或专用密钥管理系统中

## passkeys-webauthn

title: Passkeys / WebAuthn 取代密码的工程化路径
followups: [passkeys-webauthn-followup-1, passkeys-webauthn-followup-2, passkeys-webauthn-followup-3]
links: [auth-token-jwt, cors-oauth-jwt, csrf-clickjacking]
difficulty: 资深
tags: [Passkeys, WebAuthn]

### 一句话

原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥。

### 题目

Passkeys 怎么工作？业务接入要做哪些事，对老用户怎么平滑迁移？

### 答案要点

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 流程：注册 → `navigator.credentials.create({ publicKey })` → 把公钥送服务端；登录 → `navigator.credentials.get({ publicKey })` → 服务端校验签名
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 兼容：iOS 16+、Android 9+、主流桌面浏览器，老设备保留密码登录作为兜底
- 注册时需要 RP id（域名）、challenge、user 信息；登录时只要 challenge + allowCredentials
- 安全：challenge 必须服务端生成且一次性，origin 校验交给浏览器，不要自己实现

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Passkeys / WebAuthn 取代密码的工程化路径」时要先确认 Passkeys 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，Passkeys 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 Passkeys 链路分层收口再逐步统一。

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

- 如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「Passkeys / WebAuthn 取代密码的工程化路径」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 Passkeys、WebAuthn，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 渐进策略：先把 Passkey 作为"二步验证"加入，让用户熟悉；再开启"无密码登录"
- 服务端接 [SimpleWebAuthn](https://simplewebauthn.dev) 等成熟库，不要自己实现 CBOR 解析

## subresource-integrity

title: Subresource Integrity 与第三方资源篡改
followups: [subresource-integrity-followup-1, subresource-integrity-followup-2, subresource-integrity-followup-3]
difficulty: 进阶
tags: [SRI, CDN]

### 一句话

SRI（Subresource Integrity）：在 <script> / <link> 上加 integrity 属性指定文件的 hash，浏览器校验失败就拒绝执行；哈希算法：sha256 / sha384 / sha512。

### 题目

引入第三方 CDN 脚本时怎么避免被中间人篡改？SRI 怎么用？

### 答案要点

- SRI（Subresource Integrity）：在 `<script>` / `<link>` 上加 `integrity` 属性指定文件的 hash，浏览器校验失败就拒绝执行
- 哈希算法：sha256 / sha384 / sha512，建议 sha384 起步
- 配合 `crossorigin="anonymous"` 避免 hash 校验绕过
- 自动化：构建期对外链脚本生成 SRI，提交时锁定
- 局限：只能保护静态资源；动态生成 / 频繁更新的资源不适合 SRI
- CSP `require-sri-for` 可以强制 SRI（实验特性，兼容性需评估）

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 Subresource 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，Subresource 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「Subresource Integrity 与第三方资源篡改」风险不足；当前优先服务端强校验，因为可审计、可回滚。

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

- 「Subresource Integrity 与第三方资源篡改」在弱网、代理、断连或服务端限流时会出现哪些边界问题？
- 你会如何设计超时、重试、幂等和降级来保证链路可靠？
- 如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 常见误区

- 回答「Subresource Integrity 与第三方资源篡改」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。
- 只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。
- 忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。
- 相关标签是 SRI、CDN，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 用了 webpack-subresource-integrity / vite-plugin-sri 可以自动注入 SRI
- 不要把第三方 CDN 当作"自己的代码"，关键脚本能内嵌就内嵌，能自托管就自托管

## xss-csrf-defense

title: XSS 与 CSRF 的区别和防御
followups: [xss-csrf-defense-followup-1, xss-csrf-defense-followup-2, xss-csrf-defense-followup-3]
links: [11-ai-frontend/llm-frontend-security-checklist, csp-trusted-types, xss]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「XSS 与 CSRF 的区别和防御」时要先确认 XSS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，XSS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 XSS 链路分层收口再逐步统一。

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

- 如果把「XSS 与 CSRF 的区别和防御」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「XSS 与 CSRF 的区别和防御」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 安全、XSS、CSRF，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- XSS 还会衍生出 Self-XSS、Mutation XSS（DOM 解析容错坑）
- CSRF 与 SameSite 的过渡期（旧浏览器）需要后端兜底
- 现代框架（React、Vue）默认转义文本，所以滥用 `v-html / dangerouslySetInnerHTML` 才是 XSS 主要源头
- 安全 = 默认安全 × 防御深度，单点措施都不够

## auth-token-jwt

title: 鉴权方案 Cookie+Session vs JWT 怎么选
followups: [auth-token-jwt-followup-1, auth-token-jwt-followup-2, auth-token-jwt-followup-3]
links: [24-fullstack-meta/fullstack-auth-strategy, cors-oauth-jwt, csrf-clickjacking]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「鉴权方案 Cookie+Session vs JWT 怎么选」时要先确认 鉴权方案 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，鉴权方案 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 鉴权方案 链路分层收口再逐步统一。

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

- 如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「鉴权方案 Cookie+Session vs JWT 怎么选」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 鉴权、JWT、Session，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 单点登录（SSO）多用 OAuth 2.0 + OIDC（基于 JWT）
- 大厂内部一般 Cookie + Session 主流，对 C 端用户最稳

## supply-chain-attack

title: 前端供应链攻击怎么防？
followups: [supply-chain-attack-followup-1, supply-chain-attack-followup-2, supply-chain-attack-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端供应链攻击怎么防」时要先确认 前端供应链攻击怎么防 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，前端供应链攻击怎么防 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 前端供应链攻击怎么防 链路分层收口再逐步统一。

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

- 如果把「前端供应链攻击怎么防」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「前端供应链攻击怎么防？」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 安全、供应链、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- SLSA（supply-chain levels for software artifacts）成熟度框架
- SBOM（Software Bill of Materials）：清晰列出所有依赖，便于事后审计

## web-crypto-fundamentals

title: 浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查
followups: [web-crypto-fundamentals-followup-1, web-crypto-fundamentals-followup-2, web-crypto-fundamentals-followup-3]
links: [28-customer-service-im/e2ee-web-crypto]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」时要先确认 浏览器原生 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，浏览器原生 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 浏览器原生 链路分层收口再逐步统一。

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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」时要先确认 客服 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，客服 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 客服 链路分层收口再逐步统一。

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

title: 追问：在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 机制：反射型：恶意参数被服务端原样拼回响应；DOM 型：前端脚本把不可信内容拼进 DOM
- 落地动作：回答「在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 XSS 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，XSS 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 反射型：恶意参数被服务端原样拼回响应
- DOM 型：前端脚本把不可信内容拼进 DOM

## third-party-cookie-privacy-sandbox

title: 第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox]
links: [05-browser/storage-cookie, auth-token-jwt, cors-oauth-jwt]
followups: [third-party-cookie-privacy-sandbox-followup-1, third-party-cookie-privacy-sandbox-followup-2, third-party-cookie-privacy-sandbox-followup-3]

### 一句话

第三方 Cookie 退场后，跨站登录、嵌入式 SaaS、广告归因和埋点不能再默认依赖共享 Cookie；CHIPS、FedCM、Storage Access API 分别面向分区 Cookie、联合登录和受控访问，需要按场景组合。

### 题目

浏览器限制第三方 Cookie 后，前端和全栈应用会受哪些影响？CHIPS、FedCM、Storage Access API 分别适合解决什么问题？

### 答案要点

- 受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面。
- CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景。
- FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认。
- Storage Access API 更像受控例外：嵌入式内容在用户交互后请求访问未分区存储，适合确实需要继承已有登录态的 iframe。
- 工程迁移要先盘点所有跨站 Cookie，用 SameSite / Secure / Partitioned 标注意图，再为不支持浏览器保留重定向登录、一次性 token 或后端会话交换方案。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」时要把 第三方 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，第三方 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」里当前按阶段替换更稳。

### 常见误区

- 以为 SameSite=None; Secure 就能长期解决第三方 Cookie 问题，忽略浏览器和平台策略正在收紧。
- 把 CHIPS 当作跨站共享登录方案；它是分区，不是共享。
- iframe 内直接静默读登录态，没有用户交互和降级路径，结果在 Safari、Firefox 或企业 WebView 中失效。
- 只让前端改 Cookie 属性，没有同步更新后端会话、CSRF、防重放和风控逻辑。

### 追问

- CHIPS 和普通第三方 Cookie 的安全边界有什么不同？
- 嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路？
- 如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化？

## xss-followup-2

title: 追问：如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「XSS 三种类型与前端最该做的防御」不是只在理想输入下成立。；再补可观测指标：安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 标准回答（直接作答）

- 结论：存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 机制：反射型：恶意参数被服务端原样拼回响应；DOM 型：前端脚本把不可信内容拼进 DOM
- 落地动作：回答「如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过」时要先确认 XSS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，XSS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 XSS 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 反射型：恶意参数被服务端原样拼回响应
- DOM 型：前端脚本把不可信内容拼进 DOM

## xss-followup-3

title: 追问：如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗？

### 答案要点

#### 标准回答（直接作答）

- 结论：存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 机制：反射型：恶意参数被服务端原样拼回响应；DOM 型：前端脚本把不可信内容拼进 DOM
- 落地动作：回答「如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」时要先确认 XSS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，XSS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 XSS 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 反射型：恶意参数被服务端原样拼回响应
- DOM 型：前端脚本把不可信内容拼进 DOM

## csp-trusted-types-followup-1

title: 追问：如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types

### 一句话

先界定「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- 机制：Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径；二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截
- 落地动作：回答「如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 CSP 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，CSP 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径
- 二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截

## csrf-clickjacking-followup-1

title: 追问：在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- 机制：SameSite 限制第三方上下文自动带 Cookie；CSRF Token 用于证明请求确实来自受信页面
- 落地动作：回答「在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界」时要先确认 CSRF 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，CSRF 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 CSRF 链路分层收口再逐步统一。

#### 关键细节（可追问）

- CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- SameSite 限制第三方上下文自动带 Cookie
- CSRF Token 用于证明请求确实来自受信页面

## csrf-clickjacking-followup-2

title: 追问：要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「CSRF、点击劫持与 SameSite 的关系」不是只在理想输入下成立。；再补可观测指标：安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值？

### 答案要点

#### 标准回答（直接作答）

- 结论：CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- 机制：SameSite 限制第三方上下文自动带 Cookie；CSRF Token 用于证明请求确实来自受信页面
- 落地动作：回答「要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值」时要先确认 要证明 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，要证明 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 要证明 链路分层收口再逐步统一。

#### 关键细节（可追问）

- CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- SameSite 限制第三方上下文自动带 Cookie
- CSRF Token 用于证明请求确实来自受信页面

## csrf-clickjacking-followup-3

title: 追问：在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- 机制：SameSite 限制第三方上下文自动带 Cookie；CSRF Token 用于证明请求确实来自受信页面
- 落地动作：回答「在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 当安全性 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，当安全性 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- SameSite 限制第三方上下文自动带 Cookie
- CSRF Token 用于证明请求确实来自受信页面

## cors-oauth-jwt-followup-1

title: 追问：你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环？

### 答案要点

#### 标准回答（直接作答）

- 结论：CORS 管的是浏览器是否允许前端读取响应
- 机制：OAuth 解决授权流程和第三方访问委托；JWT 是令牌格式，不等于安全方案本身
- 落地动作：回答「你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环」时要先确认 你会怎样把 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会怎样把 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会怎样把 链路分层收口再逐步统一。

#### 关键细节（可追问）

- CORS 管的是浏览器是否允许前端读取响应
- OAuth 解决授权流程和第三方访问委托
- JWT 是令牌格式，不等于安全方案本身

## supply-chain-followup-1

title: 追问：你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环？

### 答案要点

#### 标准回答（直接作答）

- 结论：固定 lockfile，避免不可控漂移
- 机制：审查高权限依赖、postinstall 脚本、拼写相似包；对关键依赖做来源核验、版本升级计划和漏洞响应流程
- 落地动作：回答「你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环」时要先确认 你会怎样把 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会怎样把 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会怎样把 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 固定 lockfile，避免不可控漂移
- 审查高权限依赖、postinstall 脚本、拼写相似包
- 对关键依赖做来源核验、版本升级计划和漏洞响应流程

## prototype-pollution-followup-1

title: 追问：在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution

### 一句话

先界定「原型链污染为什么危险，如何防」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点？

### 答案要点

#### 标准回答（直接作答）

- 结论：攻击者通过 `__proto__`、constructor.prototype 等路径污染全局原型
- 机制：一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条；防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖
- 落地动作：回答「在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点」时要把 原型链污染为什么危险 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，原型链污染为什么危险 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 攻击者通过 `__proto__`、constructor.prototype 等路径污染全局原型
- 一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条
- 防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖

## source-map-secrets-followup-1

title: 追问：如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets

### 一句话

先界定「Source Map、环境变量与前端敏感信息边界」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项？

### 答案要点

#### 标准回答（直接作答）

- 结论：任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- 机制：sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题；环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置
- 落地动作：回答「如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题
- 环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置

## passkeys-webauthn-followup-1

title: 追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 机制：流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名；优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 落地动作：回答「在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底」时要先确认 Passkeys 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，Passkeys 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 Passkeys 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别

## subresource-integrity-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「Subresource Integrity 与第三方资源篡改」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题？

### 答案要点

#### 标准回答（直接作答）

- 结论：SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 机制：哈希算法：sha256 / sha384 / sha512，建议 sha384 起步；配合 crossorigin="anonymous" 避免 hash 校验绕过
- 落地动作：回答「结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题」时要先确认 代理 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，代理 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 代理 链路分层收口再逐步统一。

#### 关键细节（可追问）

- SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 哈希算法：sha256 / sha384 / sha512，建议 sha384 起步
- 配合 crossorigin="anonymous" 避免 hash 校验绕过

## xss-csrf-defense-followup-1

title: 追问：在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 机制：反射型：恶意参数随 URL 反射进页面；存储型：恶意脚本存进数据库（评论、富文本）
- 落地动作：回答「在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底」时要先确认 XSS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，XSS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 XSS 链路分层收口再逐步统一。

#### 关键细节（可追问）

- XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 反射型：恶意参数随 URL 反射进页面
- 存储型：恶意脚本存进数据库（评论、富文本）

## auth-token-jwt-followup-1

title: 追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：Cookie + Session（有状态）
- 机制：服务端保存 sessionId → 用户信息（Redis / DB）；前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF
- 落地动作：回答「如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底」时要先确认 鉴权方案 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，鉴权方案 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 鉴权方案 链路分层收口再逐步统一。

#### 关键细节（可追问）

- Cookie + Session（有状态）
- 服务端保存 sessionId → 用户信息（Redis / DB）
- 前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF

## supply-chain-attack-followup-1

title: 追问：在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- 机制：typosquatting：注册相似名字（reactt / lodahs）骗误装；依赖混淆：内部包名抢注公共 npm
- 落地动作：回答「在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 前端供应链攻击怎么防 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，前端供应链攻击怎么防 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- typosquatting：注册相似名字（reactt / lodahs）骗误装
- 依赖混淆：内部包名抢注公共 npm

## web-crypto-fundamentals-followup-1

title: 追问：在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 机制：哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）；对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）
- 落地动作：回答「在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理」时要先确认 浏览器原生 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，浏览器原生 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 浏览器原生 链路分层收口再逐步统一。

#### 关键细节（可追问）

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）
- 对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）

## web-crypto-fundamentals-followup-2

title: 追问：围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」不是只在理想输入下成立。。

### 题目

如果面试官追问：围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 机制：哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）；对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）
- 落地动作：回答「围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效」时要先确认 浏览器原生 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，浏览器原生 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 浏览器原生 链路分层收口再逐步统一。

#### 关键细节（可追问）

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）
- 对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）

## web-crypto-fundamentals-followup-3

title: 追问：结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 标准回答（直接作答）

- 结论：API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 机制：哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）；对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）
- 落地动作：回答「结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 你会怎样给 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，你会怎样给 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）
- 对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）

## sensitive-info-leak-followup-1

title: 追问：结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：剪贴板（Clipboard API）：
- 机制：复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄；防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste
- 落地动作：回答「结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界」时要先确认 客服 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，客服 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 客服 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 剪贴板（Clipboard API）：
- 复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄
- 防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste

## sensitive-info-leak-followup-2

title: 追问：围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」不是只在理想输入下成立。；再补可观测指标：安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 标准回答（直接作答）

- 结论：剪贴板（Clipboard API）：
- 机制：复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄；防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste
- 落地动作：回答「围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效」时要先确认 客服 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，客服 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 客服 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 剪贴板（Clipboard API）：
- 复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄
- 防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste

## sensitive-info-leak-followup-3

title: 追问：以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 标准回答（直接作答）

- 结论：剪贴板（Clipboard API）：
- 机制：复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄；防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste
- 落地动作：回答「以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 客服 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，客服 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 剪贴板（Clipboard API）：
- 复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄
- 防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste

## cors-oauth-jwt-followup-2

title: 追问：结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「CORS、OAuth、JWT 是三回事，别混着讲」不是只在理想输入下成立。；再补可观测指标：围绕「CORS、OAuth、JWT 是三回事。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 标准回答（直接作答）

- 结论：CORS 管的是浏览器是否允许前端读取响应
- 机制：OAuth 解决授权流程和第三方访问委托；JWT 是令牌格式，不等于安全方案本身
- 落地动作：回答「结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性」时要先确认 你会怎样验证 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会怎样验证 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会怎样验证 链路分层收口再逐步统一。

#### 关键细节（可追问）

- CORS 管的是浏览器是否允许前端读取响应
- OAuth 解决授权流程和第三方访问委托
- JWT 是令牌格式，不等于安全方案本身

## cors-oauth-jwt-followup-3

title: 追问：以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「CORS、OAuth、JWT 是三回事，别混着讲」在当前约束下为什么成立。；围绕「CORS、OAuth、JWT 是三回事，别混着讲」组织答案时，建议按「约束来源 -> CORS 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线？

### 答案要点

#### 标准回答（直接作答）

- 结论：CORS 管的是浏览器是否允许前端读取响应
- 机制：OAuth 解决授权流程和第三方访问委托；JWT 是令牌格式，不等于安全方案本身
- 落地动作：回答「以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线」时要先确认 CORS 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，CORS 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 CORS 链路分层收口再逐步统一。

#### 关键细节（可追问）

- CORS 管的是浏览器是否允许前端读取响应
- OAuth 解决授权流程和第三方访问委托
- JWT 是令牌格式，不等于安全方案本身

## supply-chain-followup-2

title: 追问：结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「npm 供应链攻击与前端依赖治理」不是只在理想输入下成立。；再补可观测指标：围绕「npm 供应链攻击与前端依赖治理」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为？

### 答案要点

#### 标准回答（直接作答）

- 结论：固定 lockfile，避免不可控漂移
- 机制：审查高权限依赖、postinstall 脚本、拼写相似包；对关键依赖做来源核验、版本升级计划和漏洞响应流程
- 落地动作：回答「结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为」时要先确认 你会如何搭建 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会如何搭建 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会如何搭建 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 固定 lockfile，避免不可控漂移
- 审查高权限依赖、postinstall 脚本、拼写相似包
- 对关键依赖做来源核验、版本升级计划和漏洞响应流程

## supply-chain-followup-3

title: 追问：以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「npm 供应链攻击与前端依赖治理」讲成只在理想输入下可用。；围绕「npm 供应链攻击与前端依赖治理」组织答案时，建议按「约束来源 -> 供应链安全 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线？

### 答案要点

#### 标准回答（直接作答）

- 结论：固定 lockfile，避免不可控漂移
- 机制：审查高权限依赖、postinstall 脚本、拼写相似包；对关键依赖做来源核验、版本升级计划和漏洞响应流程
- 落地动作：回答「以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线」时要先确认 npm 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，npm 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 npm 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 固定 lockfile，避免不可控漂移
- 审查高权限依赖、postinstall 脚本、拼写相似包
- 对关键依赖做来源核验、版本升级计划和漏洞响应流程

## passkeys-webauthn-followup-2

title: 追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Passkeys / WebAuthn 取代密码的工程化路径」不是只在理想输入下成立。。

### 题目

如果面试官追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 标准回答（直接作答）

- 结论：原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 机制：流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名；优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 落地动作：回答「在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 Passkeys 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，Passkeys 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别

## passkeys-webauthn-followup-3

title: 追问：从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Passkeys / WebAuthn 取代密码的工程化路径」讲成只在理想输入下可用。；围绕「Passkeys / WebAuthn 取代密码的工程化路径」组织答案时。

### 题目

如果面试官追问：从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案？

### 答案要点

#### 标准回答（直接作答）

- 结论：原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 机制：流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名；优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 落地动作：回答「从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别

## subresource-integrity-followup-2

title: 追问：当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「Subresource Integrity 与第三方资源篡改」讲成只在理想输入下可用。；建议按「输入约束 -> SRI 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大？

### 答案要点

#### 标准回答（直接作答）

- 结论：SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 机制：哈希算法：sha256 / sha384 / sha512，建议 sha384 起步；配合 crossorigin="anonymous" 避免 hash 校验绕过
- 落地动作：回答「当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 Subresource 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，Subresource 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 哈希算法：sha256 / sha384 / sha512，建议 sha384 起步
- 配合 crossorigin="anonymous" 避免 hash 校验绕过

## subresource-integrity-followup-3

title: 追问：在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Subresource Integrity 与第三方资源篡改」在当前约束下为什么成立。；回答结构可按「触发条件 -> SRI 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 机制：哈希算法：sha256 / sha384 / sha512，建议 sha384 起步；配合 crossorigin="anonymous" 避免 hash 校验绕过
- 落地动作：回答「在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标」时要先确认 Subresource 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，Subresource 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 Subresource 链路分层收口再逐步统一。

#### 关键细节（可追问）

- SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 哈希算法：sha256 / sha384 / sha512，建议 sha384 起步
- 配合 crossorigin="anonymous" 避免 hash 校验绕过

## xss-csrf-defense-followup-2

title: 追问：在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「XSS 与 CSRF 的区别和防御」不是只在理想输入下成立。；再补可观测指标：围绕「XSS 与 CSRF 的区别和防御」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值？

### 答案要点

#### 标准回答（直接作答）

- 结论：XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 机制：反射型：恶意参数随 URL 反射进页面；存储型：恶意脚本存进数据库（评论、富文本）
- 落地动作：回答「在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 XSS 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，XSS 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 反射型：恶意参数随 URL 反射进页面
- 存储型：恶意脚本存进数据库（评论、富文本）

## xss-csrf-defense-followup-3

title: 追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense
generated: followup-script

### 一句话

规模变大后先重新评估「XSS 与 CSRF 的区别和防御」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「XSS 与 CSRF 的区别和防御」对应的安全边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 机制：反射型：恶意参数随 URL 反射进页面；存储型：恶意脚本存进数据库（评论、富文本）
- 落地动作：回答「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，从工程落地角度看 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 反射型：恶意参数随 URL 反射进页面
- 存储型：恶意脚本存进数据库（评论、富文本）

## auth-token-jwt-followup-2

title: 追问：从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「鉴权方案 Cookie+Session vs JWT 怎么选」不是只在理想输入下成立。。

### 题目

如果面试官追问：从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 标准回答（直接作答）

- 结论：Cookie + Session（有状态）
- 机制：服务端保存 sessionId → 用户信息（Redis / DB）；前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF
- 落地动作：回答「从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，从工程落地角度看 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- Cookie + Session（有状态）
- 服务端保存 sessionId → 用户信息（Redis / DB）
- 前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF

## auth-token-jwt-followup-3

title: 追问：从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「鉴权方案 Cookie+Session vs JWT 怎么选」在当前约束下为什么成立。；回答结构可按「触发条件 -> 鉴权 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案？

### 答案要点

#### 标准回答（直接作答）

- 结论：Cookie + Session（有状态）
- 机制：服务端保存 sessionId → 用户信息（Redis / DB）；前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF
- 落地动作：回答「从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，从工程落地角度看 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- Cookie + Session（有状态）
- 服务端保存 sessionId → 用户信息（Redis / DB）
- 前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF

## supply-chain-attack-followup-2

title: 追问：在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「前端供应链攻击怎么防」不是只在理想输入下成立。；再补可观测指标：围绕「前端供应链攻击怎么防」的安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 标准回答（直接作答）

- 结论：依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- 机制：typosquatting：注册相似名字（reactt / lodahs）骗误装；依赖混淆：内部包名抢注公共 npm
- 落地动作：回答「在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 前端供应链攻击怎么防 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，前端供应链攻击怎么防 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- typosquatting：注册相似名字（reactt / lodahs）骗误装
- 依赖混淆：内部包名抢注公共 npm

## supply-chain-attack-followup-3

title: 追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack
generated: followup-script

### 一句话

规模变大后先重新评估「前端供应链攻击怎么防」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「前端供应链攻击怎么防」对应的安全边界收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- 机制：typosquatting：注册相似名字（reactt / lodahs）骗误装；依赖混淆：内部包名抢注公共 npm
- 落地动作：回答「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- typosquatting：注册相似名字（reactt / lodahs）骗误装
- 依赖混淆：内部包名抢注公共 npm

## third-party-cookie-privacy-sandbox-followup-1

title: 追问：CHIPS 和普通第三方 Cookie 的安全边界有什么不同
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox, 追问]
parent: third-party-cookie-privacy-sandbox
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」落到真实交付，而不是停在概念层。；讲「第三方 Cookie 退场后。

### 题目

如果面试官追问：CHIPS 和普通第三方 Cookie 的安全边界有什么不同？

### 答案要点

#### 标准回答（直接作答）

- 结论：受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面
- 机制：CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景；FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认
- 落地动作：回答「CHIPS 和普通第三方 Cookie 的安全边界有什么不同」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 CHIPS 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，CHIPS 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「CHIPS 和普通第三方 Cookie 的安全边界有什么不同」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面
- CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景
- FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认

## third-party-cookie-privacy-sandbox-followup-2

title: 追问：从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox, 追问]
parent: third-party-cookie-privacy-sandbox
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」讲成只在理想输入下可用。；围绕「第三方 Cookie 退场后。

### 题目

如果面试官追问：从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路？

### 答案要点

#### 标准回答（直接作答）

- 结论：受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面
- 机制：CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景；FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认
- 落地动作：回答「从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面
- CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景
- FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认

## third-party-cookie-privacy-sandbox-followup-3

title: 追问：以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox, 追问]
parent: third-party-cookie-privacy-sandbox
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」讲成只在理想输入下可用。；回答结构可按「触发条件 -> Cookie 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化？

### 答案要点

#### 标准回答（直接作答）

- 结论：受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面
- 机制：CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景；FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认
- 落地动作：回答「以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面
- CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景
- FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认

## csp-trusted-types-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「CSP 与 Trusted Types 为什么是现代前端的高阶防线」在当前约束下为什么成立。；建议按「输入约束 -> CSP 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- 机制：Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径；二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截
- 落地动作：回答「从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，从工程落地角度看 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径
- 二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截

## csp-trusted-types-followup-3

title: 追问：以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types
generated: followup-script

### 一句话

规模变大后先重新评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- 机制：Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径；二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截
- 落地动作：回答「以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序」时要先确认 CSP 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，CSP 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 CSP 链路分层收口再逐步统一。

#### 关键细节（可追问）

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径
- 二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截

## prototype-pollution-followup-2

title: 追问：以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「原型链污染为什么危险，如何防」不是只在理想输入下成立。；再补可观测指标：围绕「原型链污染为什么危险，如何防」的核心机制应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：攻击者通过 `__proto__`、constructor.prototype 等路径污染全局原型
- 机制：一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条；防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖
- 落地动作：回答「以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证」要明确 原型链污染为什么危险 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 原型链污染为什么危险 的高风险边界。

#### 关键细节（可追问）

- 攻击者通过 `__proto__`、constructor.prototype 等路径污染全局原型
- 一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条
- 防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖

## prototype-pollution-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution
generated: followup-script

### 一句话

规模变大后先重新评估「原型链污染为什么危险，如何防」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「原型链污染为什么危险，如何防」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：攻击者通过 `__proto__`、constructor.prototype 等路径污染全局原型
- 机制：一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条；防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖
- 落地动作：回答「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 攻击者通过 `__proto__`、constructor.prototype 等路径污染全局原型
- 一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条
- 防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖

## source-map-secrets-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Source Map、环境变量与前端敏感信息边界」在当前约束下为什么成立。；建议按「输入约束 -> SourceMap 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- 机制：sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题；环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置
- 落地动作：回答「从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标」要明确 从工程落地角度看 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 从工程落地角度看 的高风险边界。

#### 关键细节（可追问）

- 任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题
- 环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置

## source-map-secrets-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets
generated: followup-script

### 一句话

规模变大后先重新评估「Source Map、环境变量与前端敏感信息边界」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Source Map、环境变量与前端敏感信息边界」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节？

### 答案要点

#### 标准回答（直接作答）

- 结论：任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- 机制：sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题；环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置
- 落地动作：回答「结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题
- 环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置

## security-sbom-signing-gate

title: 供应链准入闸门：SBOM、依赖签名与高危包阻断
difficulty: 资深
tags: [供应链安全, SBOM, 签名]
followups: [security-sbom-signing-gate-followup-1, security-sbom-signing-gate-followup-2, security-sbom-signing-gate-followup-3]

### 一句话

供应链治理不能只靠“发现漏洞后补丁”，而要把依赖准入前置：用 SBOM 建账、用签名验真、用策略闸门阻断高风险包进入主干。

### 题目

你会如何给前端依赖建立“准入闸门”，把 SBOM、签名校验和漏洞策略接进 CI/CD，而不是事后被动救火？

### 答案要点

- 先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档。
- 对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包。
- 漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”。
- 准入策略要覆盖安装脚本风险：默认禁用高风险 postinstall，白名单放行必要包并审计。
- 发布前做差异审计：新旧构建比较依赖漂移、许可证变化、维护权变更，防止“无感升级”。
- 结合运行时观测：上线后持续看异常请求、脚本完整性失败、来源域漂移，形成闭环。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「供应链准入闸门：SBOM、依赖签名与高危包阻断」时要先确认 供应链准入闸门 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，供应链准入闸门 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 供应链准入闸门 链路分层收口再逐步统一。

### 代码示例

```yaml
dependency_gate:
  steps:
    - generate_sbom: 'cyclonedx-npm --output-file sbom.json'
    - verify_lockfile: 'npm ci --ignore-scripts'
    - audit_policy:
        critical: block
        high: security_approval_required
        medium: warn
    - script_policy:
        default: deny_postinstall
        allowlist: ['esbuild', 'sharp']
```

```ts
type Vuln = { severity: 'critical' | 'high' | 'medium' | 'low'; package: string };

function gateByVulns(vulns: Vuln[]) {
  if (vulns.some((v) => v.severity === 'critical')) return 'block';
  if (vulns.some((v) => v.severity === 'high')) return 'need_security_approval';
  return 'allow_with_tracking';
}
```

### 追问

- 「供应链准入闸门：SBOM、依赖签名与高危包阻断」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只扫漏洞分数，不看依赖来源与安装脚本行为，仍会漏掉高风险攻击面。
- 发现问题只“临时放行”，没有追踪闭环，风险长期累积。
- 供应链策略只在 CI 生效，开发机和私有镜像链路没有统一约束。

### 延伸

- 建议把 SBOM 与版本发布记录绑定，提升合规和审计效率。
- 对核心业务线可引入“依赖变更双人审批”，降低高风险漂移。

## security-incident-key-rotation

title: 前端安全事故止损：密钥轮换、会话失效与用户保护
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全]
followups: [security-incident-key-rotation-followup-1, security-incident-key-rotation-followup-2, security-incident-key-rotation-followup-3]

### 一句话

安全事故处理的核心是“缩短暴露窗口”：一旦发生 token 泄漏或第三方脚本投毒，要在分钟级完成密钥轮换、会话失效和高风险能力降级，而不是等全量修复后再响应。

### 题目

如果线上发生前端安全事故（如 token 泄漏、脚本被篡改、敏感接口被滥用），你会如何设计止损流程，兼顾安全与业务连续性？

### 答案要点

- 先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”。
- 密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应。
- 会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”。
- 前端侧要有应急开关：可快速关闭高风险入口、禁用可疑第三方能力、切换只读模式。
- 用户沟通要透明：明确告知影响范围、已采取措施、用户需要执行的动作（改密/重新登录/设备检查）。
- 事故后闭环要工程化：补检测规则、演练脚本、告警阈值和审计字段，减少下次响应时间。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「前端安全事故止损：密钥轮换、会话失效与用户保护」时要先确认 前端安全事故止损 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，前端安全事故止损 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 前端安全事故止损 链路分层收口再逐步统一。

### 代码示例

```ts
type RiskLevel = 'low' | 'medium' | 'high';

function incidentPolicy(level: RiskLevel) {
  if (level === 'high') {
    return {
      forceReauth: true,
      disableSensitiveActions: true,
      readonlyMode: true,
    };
  }
  if (level === 'medium') {
    return { forceReauth: true, disableSensitiveActions: false, readonlyMode: false };
  }
  return { forceReauth: false, disableSensitiveActions: false, readonlyMode: false };
}
```

```ts
// 会话版本校验：服务端提升 tokenVersion 后，旧会话自动失效
function isSessionValid(userTokenVersion: number, serverTokenVersion: number) {
  return userTokenVersion >= serverTokenVersion;
}
```

### 追问

- 「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只修技术问题，不做用户侧保护动作，导致风险持续暴露。
- 事故期没有预置开关和脚本，临时人工操作导致二次故障。
- 复盘没有沉淀可执行改进，下一次仍然“靠经验救火”。

### 延伸

- 建议把密钥轮换与会话失效演练纳入季度安全演习。
- 关键业务可设置“安全降级模式”默认模板，提升应急一致性。

## security-sbom-signing-gate-followup-1

title: 追问：在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底
difficulty: 资深
tags: [供应链安全, SBOM, 签名, 追问]
parent: security-sbom-signing-gate
generated: followup-script

### 一句话

推动「供应链准入闸门：SBOM、依赖签名与高危包阻断」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「供应链准入闸门：SBOM、依赖签名与高危包阻断」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档
- 机制：对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包；漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”
- 落地动作：回答「在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底」时要先确认 供应链准入闸门 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，供应链准入闸门 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 供应链准入闸门 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档
- 对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包
- 漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”

## security-sbom-signing-gate-followup-2

title: 追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [供应链安全, SBOM, 签名, 追问]
parent: security-sbom-signing-gate
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「供应链准入闸门：SBOM、依赖签名与高危包阻断」讲成只在理想输入下可用。；围绕「供应链准入闸门：SBOM、依赖签名与高危包阻断」组织答案时，建议按「约束来源 -> 供应链安全 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档
- 机制：对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包；漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”
- 落地动作：回答「在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时要先确认 供应链准入闸门 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，供应链准入闸门 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 供应链准入闸门 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档
- 对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包
- 漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”

## security-sbom-signing-gate-followup-3

title: 追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗
difficulty: 资深
tags: [供应链安全, SBOM, 签名, 追问]
parent: security-sbom-signing-gate
generated: followup-script

### 一句话

先画清「供应链准入闸门：SBOM、依赖签名与高危包阻断」信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明「供应链准入闸门：SBOM、依赖签名与高危包阻断」没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限。

### 题目

如果面试官追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档
- 机制：对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包；漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”
- 落地动作：回答「在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 供应链准入闸门 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，供应链准入闸门 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档
- 对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包
- 漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”

## security-incident-key-rotation-followup-1

title: 追问：结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全, 追问]
parent: security-incident-key-rotation
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「前端安全事故止损：密钥轮换、会话失效与用户保护」落到真实交付，而不是停在概念层。；讲「前端安全事故止损：密钥轮换、会话失效与用户保护」时先给 安全应急 的判断口径，再补执行动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”
- 机制：密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应；会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”
- 落地动作：回答「结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束」时要先确认 你会如何识别 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会如何识别 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会如何识别 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”
- 密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应
- 会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”

## security-incident-key-rotation-followup-2

title: 追问：在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全, 追问]
parent: security-incident-key-rotation
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「前端安全事故止损：密钥轮换、会话失效与用户保护」在当前约束下为什么成立。；建议按「输入约束 -> 安全应急 执行链路 -> 结果验证」展开，并结合「前端安全事故止损：密钥轮换、会话失效与用户保护」给出一条可复核结果。

### 题目

如果面试官追问：在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”
- 机制：密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应；会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”
- 落地动作：回答「在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标」时要先确认 前端安全事故止损 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，前端安全事故止损 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 前端安全事故止损 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”
- 密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应
- 会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”

## security-incident-key-rotation-followup-3

title: 追问：在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全, 追问]
parent: security-incident-key-rotation
generated: followup-script

### 一句话

推动「前端安全事故止损：密钥轮换、会话失效与用户保护」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「前端安全事故止损：密钥轮换、会话失效与用户保护」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线？

### 答案要点

#### 标准回答（直接作答）

- 结论：先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”
- 机制：密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应；会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”
- 落地动作：回答「在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 前端安全事故止损 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，前端安全事故止损 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”
- 密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应
- 会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”
