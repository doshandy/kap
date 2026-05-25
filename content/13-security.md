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

这题回答要覆盖 XSS 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请区分存储型、反射型、DOM 型 XSS，并说明前端侧最有效的防御策略。

### 答案要点

- 存储型：恶意脚本存进数据库，访问页面时被所有用户执行
- 反射型：恶意参数被服务端原样拼回响应
- DOM 型：前端脚本把不可信内容拼进 DOM
- 防御核心：默认转义输出、禁止把不可信字符串直接塞进 innerHTML、富文本走白名单清洗

#### 工程化补充

- 场景前提：先限定 XSS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 XSS 三种类型与前端最该做的防御 的结论不成立。
- 实施步骤：先把 XSS 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题的高分关键是把 CSP 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么说 CSP 和 Trusted Types 能显著抬高 XSS 攻击门槛？

### 答案要点

- CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口
- Trusted Types 在启用相应 CSP 指令后，可要求危险 DOM injection sink 只接收受信对象，减少把任意字符串直接送进 innerHTML、srcdoc 等 sink 的路径
- 二者结合，可让很多 DOM XSS 在运行时被浏览器直接拦截

#### 工程化补充

- 场景前提：CSP 与 Trusted Types 为什么是现代前端的高阶防线 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题回答要覆盖 CSRF 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

什么是 CSRF？`SameSite`、CSRF Token、X-Frame-Options 分别在防什么？

### 答案要点

- CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求
- SameSite 限制第三方上下文自动带 Cookie
- CSRF Token 用于证明请求确实来自受信页面
- X-Frame-Options / frame-ancestors 防点击劫持

#### 工程化补充

- 场景前提：先限定 CSRF 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CSRF、点击劫持与 SameSite 的关系 的结论不成立。
- 实施步骤：先把 CSRF 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

回答「CORS、OAuth、JWT 是三回事，别混着讲」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么“能跨域”和“有权限访问”是两套完全不同的问题？

### 答案要点

- CORS 管的是浏览器是否允许前端读取响应
- OAuth 解决授权流程和第三方访问委托
- JWT 是令牌格式，不等于安全方案本身
- 即使 CORS 放开，服务端仍要做身份认证和资源授权

#### 工程化补充

- 场景前提：先限定 CORS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CORS、OAuth、JWT 是三回事，别混着讲 的结论不成立。
- 实施步骤：围绕 CORS、OAuth、JWT 是三回事，别混着讲 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题的高分关键是把 供应链安全 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端依赖越来越多，供应链安全应该如何做基本防线？

### 答案要点

- 固定 lockfile，避免不可控漂移
- 审查高权限依赖、postinstall 脚本、拼写相似包
- 对关键依赖做来源核验、版本升级计划和漏洞响应流程
- 在 CI 做依赖审计，但不要把审计结果当成唯一安全判断

#### 工程化补充

- 场景前提：npm 供应链攻击与前端依赖治理 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题回答要覆盖 原型链污染 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

什么是 prototype pollution？它为什么经常出现在工具函数和配置合并逻辑里？

### 答案要点

- 攻击者通过 **proto**、constructor.prototype 等路径污染全局原型
- 一旦成功，可能影响权限判断、请求配置、模板渲染甚至 RCE 链条
- 防御手段：限制可写路径、使用 Object.create(null)、过滤危险 key、升级有漏洞依赖

#### 工程化补充

- 场景前提：先定义 原型链污染为什么危险，如何防 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 实施步骤：围绕 原型链污染为什么危险，如何防 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 失败风险：常见风险是只给理想路径，忽略 原型链污染 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 原型链污染 的可复现用例、线上监控指标和回退演练记录。

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

这题的高分关键是把 SourceMap 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

前端项目里哪些信息绝不能当成“前端也能保密”的秘密？

### 答案要点

- 任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节
- sourcemap 若公开暴露，会放大逆向分析和漏洞利用难度下降的问题
- 环境变量里以 VITE\_ 等前缀暴露到前端的内容，本质就是公开配置
- 面试中不要只停留在「Source Map、环境变量与前端敏感信息边界」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：回答 Source Map、环境变量与前端敏感信息边界 时先锁定 SourceMap 的边界条件，避免把经验结论当成通用规则。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要能被他人复现：步骤清晰、信号可观测、异常可回退。
- 失败风险：常见风险是只给理想路径，忽略 SourceMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SourceMap 的可复现用例、线上监控指标和回退演练记录。

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

这题回答要覆盖 Passkeys 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

Passkeys 怎么工作？业务接入要做哪些事，对老用户怎么平滑迁移？

### 答案要点

- 原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥
- 流程：注册 → navigator.credentials.create({ publicKey }) → 把公钥送服务端；登录 → navigator.credentials.get({ publicKey }) → 服务端校验签名
- 优势：免密码、抗钓鱼、跨设备同步、内置生物识别
- 兼容：iOS 16+、Android 9+、主流桌面浏览器，老设备保留密码登录作为兜底

#### 工程化补充

- 场景前提：先限定 Passkeys 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Passkeys / WebAuthn 取代密码的工程化路径 的结论不成立。
- 实施步骤：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这题的高分关键是把 SRI 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

引入第三方 CDN 脚本时怎么避免被中间人篡改？SRI 怎么用？

### 答案要点

- SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行
- 哈希算法：sha256 / sha384 / sha512，建议 sha384 起步
- 配合 crossorigin="anonymous" 避免 hash 校验绕过
- 自动化：构建期对外链脚本生成 SRI，提交时锁定

#### 工程化补充

- 场景前提：Subresource Integrity 与第三方资源篡改 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

讲「XSS 与 CSRF 的区别和防御」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

分别解释 XSS / CSRF 的攻击原理和工程上对应的防御方案。

### 答案要点

- XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本
- 反射型：恶意参数随 URL 反射进页面
- 存储型：恶意脚本存进数据库（评论、富文本）
- DOM 型：前端用 innerHTML 拼接用户输入

#### 工程化补充

- 场景前提：XSS 与 CSRF 的区别和防御 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

讲「鉴权方案 Cookie+Session vs JWT 怎么选」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请对比 Cookie + Session 与 JWT 两种鉴权方案，从安全、性能、运维角度评估。

### 答案要点

- Cookie + Session（有状态）
- 服务端保存 sessionId → 用户信息（Redis / DB）
- 前端浏览器自动带 cookie；HttpOnly 防 XSS、Secure 防降级、SameSite 防 CSRF
- 优点：可主动失效（踢人 / 改密码退出所有设备），权限变更立即生效

#### 工程化补充

- 场景前提：鉴权方案 Cookie+Session vs JWT 怎么选 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

回答「前端供应链攻击怎么防」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

某 npm 包被劫持后投毒，下载即偷取环境变量。讲讲攻击链和防御措施。

### 答案要点

- 依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码
- typosquatting：注册相似名字（reactt / lodahs）骗误装
- 依赖混淆：内部包名抢注公共 npm
- postinstall 脚本：npm install 时执行任意代码（偷 .npmrc / .env / SSH key）

#### 工程化补充

- 场景前提：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端供应链攻击怎么防 的结论不成立。
- 实施步骤：先把 安全 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

讲「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请描述 Web Crypto API 的常用能力，并各举一个前端实战场景（哈希、对称加密、非对称签名、密钥派生）。

### 答案要点

- API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）
- 哈希：SHA-256 / SHA-384 / SHA-512（不要再用 MD5 / SHA-1）
- 对称加密：AES-GCM（推荐，自带认证）/ AES-CBC（要自己 HMAC）
- 非对称加密：RSA-OAEP（加密小数据）/ RSA-PSS（签名）/ ECDSA（签名，更短更快）

#### 工程化补充

- 场景前提：浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

回答「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

列出前端项目（特别是客服 / 财务 / 医疗 SaaS）中常被忽视的敏感信息泄漏点，以及对应的防护手段。

### 答案要点

- 剪贴板（Clipboard API）：
- 复制订单号 / 卡号到剪贴板，用户粘到 IM 群 → 数据外泄
- 防护：复制时弹提示、敏感字段不提供"一键复制"、关键页面禁用 paste
- 截屏 / 屏幕分享：

#### 工程化补充

- 场景前提：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些 的结论不成立。
- 实施步骤：先把 安全 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这道追问要直接回应「XSS 三种类型与前端最该做的防御」在 XSS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「XSS 三种类型与前端最该做的防御」的高风险失败场景并给出兜底措施（对应追问：在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底）。
- 直接围绕「在「XSS 三种类型与前端最该做的防御」场景下，真把「XSS 三种类型与前端最该做的防御」放到生产环境后，你会如何围绕 XSS 划清信任边界并安排服务端兜底」作答：存储型：恶意脚本存进数据库，访问页面时被所有用户执行

#### 落地步骤

- 第一步：先限定 XSS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 XSS 三种类型与前端最该做的防御 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 XSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## third-party-cookie-privacy-sandbox

title: 第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox]
links: [05-browser/storage-cookie, auth-token-jwt, cors-oauth-jwt]
followups: [third-party-cookie-privacy-sandbox-followup-1, third-party-cookie-privacy-sandbox-followup-2, third-party-cookie-privacy-sandbox-followup-3]

### 一句话

这题回答要覆盖 Cookie 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

浏览器限制第三方 Cookie 后，前端和全栈应用会受哪些影响？CHIPS、FedCM、Storage Access API 分别适合解决什么问题？

### 答案要点

- 受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面。
- CHIPS（Partitioned Cookie）让第三方上下文中的 Cookie 按顶级站点分区，适合“同一个第三方服务嵌入多个站点，但不需要跨站共享身份”的场景。
- FedCM 面向联合身份登录，减少重定向和第三方 Cookie 依赖，让浏览器参与身份提供方和依赖方之间的登录确认。
- Storage Access API 更像受控例外：嵌入式内容在用户交互后请求访问未分区存储，适合确实需要继承已有登录态的 iframe。

#### 工程化补充

- 场景前提：先限定 Cookie 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选 的结论不成立。
- 实施步骤：先把 Cookie 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这道追问的关键是把 XSS 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 直答

- 追问核心：说明如何验证「XSS 三种类型与前端最该做的防御」结论成立，给出 XSS 的验收路径（对应追问：如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过）。
- 直接围绕「如果要审计「XSS 三种类型与前端最该做的防御」安全性，你会用哪些证据证明方案不可轻易绕过」作答：存储型：恶意脚本存进数据库，访问页面时被所有用户执行

#### 落地步骤

- 第一步：XSS 三种类型与前端最该做的防御 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 XSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## xss-followup-3

title: 追问：如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗
difficulty: 基础
tags: [XSS, 输出编码, 追问]
parent: xss

### 一句话

围绕「XSS 三种类型与前端最该做的防御」回答追问时，重点说清 XSS 的前提、动作和回退条件。

### 题目

如果面试官追问：如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗？

### 答案要点

#### 直答

- 追问核心：识别「XSS 三种类型与前端最该做的防御」的高风险失败场景并给出兜底措施（对应追问：如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗）。
- 直接围绕「如果「XSS 三种类型与前端最该做的防御」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」作答：存储型：恶意脚本存进数据库，访问页面时被所有用户执行

#### 落地步骤

- 第一步：先限定 XSS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 XSS 三种类型与前端最该做的防御 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 XSS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## csp-trusted-types-followup-1

title: 追问：如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types

### 一句话

回答这题时，先给 CSP 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立？

### 答案要点

#### 直答

- 追问核心：解释「CSP 与 Trusted Types 为什么是现代前端的高阶防线」背后的因果关系，并指出 CSP 的触发条件（对应追问：如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立）。
- 直接围绕「如果要评估「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的落地风险，你会优先检查哪些 CSP 约束是否成立」作答：CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口

#### 落地步骤

- 第一步：CSP 与 Trusted Types 为什么是现代前端的高阶防线 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 CSP 与 Trusted Types 为什么是现代前端的高阶防线 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSP 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## csrf-clickjacking-followup-1

title: 追问：在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 一句话

围绕「CSRF、点击劫持与 SameSite 的关系」回答追问时，重点说清 CSRF 的前提、动作和回退条件。

### 题目

如果面试官追问：在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界？

### 答案要点

#### 直答

- 追问核心：识别「CSRF、点击劫持与 SameSite 的关系」的高风险失败场景并给出兜底措施（对应追问：在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界）。
- 直接围绕「在「CSRF、点击劫持与 SameSite 的关系」场景下，如果要评审「CSRF、点击劫持与 SameSite 的关系」在 CSRF 维度的安全方案，你会如何划分客户端与服务端责任边界」作答：CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求

#### 落地步骤

- 第一步：先限定 CSRF 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CSRF、点击劫持与 SameSite 的关系 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSRF 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## csrf-clickjacking-followup-2

title: 追问：要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 一句话

这道追问的关键是把 CSRF 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CSRF、点击劫持与 SameSite 的关系」结论成立，给出 CSRF 的验收路径（对应追问：要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值）。
- 直接围绕「要证明「CSRF、点击劫持与 SameSite 的关系」防护可信，你会如何结合攻击样例、审计日志和告警阈值」作答：CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求

#### 落地步骤

- 第一步：CSRF、点击劫持与 SameSite 的关系 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSRF 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## csrf-clickjacking-followup-3

title: 追问：在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级
difficulty: 基础
tags: [CSRF, SameSite, Clickjacking, 追问]
parent: csrf-clickjacking

### 一句话

这道追问要直接回应「CSRF、点击劫持与 SameSite 的关系」在 CSRF 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级？

### 答案要点

#### 直答

- 追问核心：比较「CSRF、点击劫持与 SameSite 的关系」在收益、成本和维护复杂度上的取舍边界（对应追问：在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级）。
- 直接围绕「在当前团队与业务约束下，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 CSRF 给「CSRF、点击劫持与 SameSite 的关系」排优先级」作答：CSRF 利用浏览器会自动带 Cookie 的特性，诱导用户在已登录状态下发起恶意请求

#### 落地步骤

- 第一步：先限定 CSRF 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CSRF、点击劫持与 SameSite 的关系 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSRF 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## cors-oauth-jwt-followup-1

title: 追问：你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt

### 一句话

这道追问要直接回应「CORS、OAuth、JWT 是三回事，别混着讲」在 CORS 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环？

### 答案要点

#### 直答

- 追问核心：识别「CORS、OAuth、JWT 是三回事，别混着讲」的高风险失败场景并给出兜底措施（对应追问：你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环）。
- 直接围绕「你会怎样把「CORS、OAuth、JWT 是三回事，别混着讲」的前端防护与服务端兜底串成完整安全闭环」作答：CORS 管的是浏览器是否允许前端读取响应

#### 落地步骤

- 第一步：先限定 CORS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CORS、OAuth、JWT 是三回事，别混着讲 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CORS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## supply-chain-followup-1

title: 追问：你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain

### 一句话

回答这题时，先给 供应链安全 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环？

### 答案要点

#### 直答

- 追问核心：识别「npm 供应链攻击与前端依赖治理」的高风险失败场景并给出兜底措施（对应追问：你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环）。
- 直接围绕「你会怎样把「npm 供应链攻击与前端依赖治理」的前端防护与服务端兜底串成完整安全闭环」作答：固定 lockfile，避免不可控漂移

#### 落地步骤

- 第一步：npm 供应链攻击与前端依赖治理 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 供应链安全 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## prototype-pollution-followup-1

title: 追问：在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution

### 一句话

围绕「原型链污染为什么危险，如何防」回答追问时，重点说清 原型链污染 的前提、动作和回退条件。

### 题目

如果面试官追问：在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点？

### 答案要点

#### 直答

- 追问核心：解释「原型链污染为什么危险，如何防」背后的因果关系，并指出 原型链污染 的触发条件（对应追问：在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点）。
- 直接围绕「在「原型链污染为什么危险，如何防」进入长周期维护后，你会重点巡检哪些与 原型链污染 相关的高风险边界点」作答：攻击者通过 **proto**、constructor.prototype 等路径污染全局原型

#### 落地步骤

- 第一步：先定义 原型链污染为什么危险，如何防 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。
- 第三步：如果 原型链污染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 原型链污染 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 原型链污染 的可复现用例、线上监控指标和回退演练记录。

## source-map-secrets-followup-1

title: 追问：如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets

### 一句话

回答这题时，先给 SourceMap 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项？

### 答案要点

#### 直答

- 追问核心：说明「Source Map、环境变量与前端敏感信息边界」上线时如何灰度、观测、回滚（对应追问：如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项）。
- 直接围绕「如果要让「Source Map、环境变量与前端敏感信息边界」稳定上线，你会优先补齐哪些与 SourceMap 相关的检查项」作答：任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节

#### 落地步骤

- 第一步：回答 Source Map、环境变量与前端敏感信息边界 时先锁定 SourceMap 的边界条件，避免把经验结论当成通用规则。
- 第二步：发布按批次推进：每批次都有观测窗口、验收条件和回退动作，并且动作必须对应明确输入、执行人和结果判定，避免停在口头建议。
- 第三步：如果 SourceMap 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是只给理想路径，忽略 SourceMap 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 SourceMap 的可复现用例、线上监控指标和回退演练记录。

## passkeys-webauthn-followup-1

title: 追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn

### 一句话

这道追问要直接回应「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「Passkeys / WebAuthn 取代密码的工程化路径」的高风险失败场景并给出兜底措施（对应追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底）。
- 直接围绕「在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果把「Passkeys / WebAuthn 取代密码的工程化路径」放到真实业务里，你会如何划分信任边界和服务端兜底」作答：原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥

#### 落地步骤

- 第一步：先限定 Passkeys 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Passkeys / WebAuthn 取代密码的工程化路径 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 Passkeys 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## subresource-integrity-followup-1

title: 追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity

### 一句话

这道追问的关键是把 SRI 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题？

### 答案要点

#### 直答

- 追问核心：围绕「Subresource Integrity 与第三方资源篡改」给出可执行的落地方案，重点说明 SRI 怎么做（对应追问：结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题）。
- 直接围绕「结合真实业务约束，在弱网、代理、断连或服务端限流场景下，你会围绕 SRI 重点排查「Subresource Integrity 与第三方资源篡改」的哪些边界问题」作答：SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行

#### 落地步骤

- 第一步：Subresource Integrity 与第三方资源篡改 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：先把 SRI 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 SRI 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## xss-csrf-defense-followup-1

title: 追问：在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense

### 一句话

回答这题时，先给 安全 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「XSS 与 CSRF 的区别和防御」的高风险失败场景并给出兜底措施（对应追问：在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底）。
- 直接围绕「在「XSS 与 CSRF 的区别和防御」场景下，真把「XSS 与 CSRF 的区别和防御」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底」作答：XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本

#### 落地步骤

- 第一步：XSS 与 CSRF 的区别和防御 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 安全 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## auth-token-jwt-followup-1

title: 追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt

### 一句话

这道追问的关键是把 鉴权 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「鉴权方案 Cookie+Session vs JWT 怎么选」的高风险失败场景并给出兜底措施（对应追问：如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底）。
- 直接围绕「如果把「鉴权方案 Cookie+Session vs JWT 怎么选」放到真实业务里，你会如何划分信任边界和服务端兜底」作答：Cookie + Session（有状态）

#### 落地步骤

- 第一步：鉴权方案 Cookie+Session vs JWT 怎么选 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 鉴权 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 鉴权 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## supply-chain-attack-followup-1

title: 追问：在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack

### 一句话

围绕「前端供应链攻击怎么防」回答追问时，重点说清 安全 的前提、动作和回退条件。

### 题目

如果面试官追问：在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「前端供应链攻击怎么防」的高风险失败场景并给出兜底措施（对应追问：在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底）。
- 直接围绕「在「前端供应链攻击怎么防」场景下，真把「前端供应链攻击怎么防」放到生产环境后，你会如何围绕 安全 划清信任边界并安排服务端兜底」作答：依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码

#### 落地步骤

- 第一步：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端供应链攻击怎么防 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## web-crypto-fundamentals-followup-1

title: 追问：在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 一句话

这道追问的关键是把 加密 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？

### 答案要点

#### 直答

- 追问核心：识别「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」的高风险失败场景并给出兜底措施（对应追问：在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理）。
- 直接围绕「在「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理」作答：API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）

#### 落地步骤

- 第一步：浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 加密 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 加密 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## web-crypto-fundamentals-followup-2

title: 追问：围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 一句话

围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」回答追问时，重点说清 加密 的前提、动作和回退条件。

### 题目

如果面试官追问：围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」结论成立，给出 加密 的验收路径（对应追问：围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效）。
- 直接围绕「围绕「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」你会怎样设计绕过验证与异常流量监控，确认防护真正生效」作答：API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）

#### 落地步骤

- 第一步：先限定 加密 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 加密 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## web-crypto-fundamentals-followup-3

title: 追问：结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 进阶
tags: [加密, WebCrypto, 高频, 追问]
parent: web-crypto-fundamentals

### 一句话

回答这题时，先给 加密 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 直答

- 追问核心：识别「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」的高风险失败场景并给出兜底措施（对应追问：结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑）。
- 直接围绕「结合真实业务约束，你会怎样给「浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查」定义分层策略，让高风险场景更严格、低风险场景更顺滑」作答：API 入口：crypto.subtle（仅在 https / localhost 可用）+ crypto.getRandomValues（同步随机字节）

#### 落地步骤

- 第一步：浏览器原生 Web Crypto API 怎么用？哈希 / 对称 / 非对称 / 签名场景速查 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 加密 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 加密 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## sensitive-info-leak-followup-1

title: 追问：结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 一句话

这道追问要直接回应「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」在 安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界？

### 答案要点

#### 直答

- 追问核心：围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」给出可执行的落地方案，重点说明 安全 怎么做（对应追问：结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界）。
- 直接围绕「结合真实业务约束，围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」落地时，你会怎样定义前端可信范围与服务端强校验边界」作答：剪贴板（Clipboard API）：

#### 落地步骤

- 第一步：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些 的结论不成立。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## sensitive-info-leak-followup-2

title: 追问：围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 一句话

这道追问的关键是把 安全 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？

### 答案要点

#### 直答

- 追问核心：说明如何验证「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」结论成立，给出 安全 的验收路径（对应追问：围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效）。
- 直接围绕「围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」你会怎样设计绕过验证与异常流量监控，确认防护真正生效」作答：剪贴板（Clipboard API）：

#### 落地步骤

- 第一步：客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## sensitive-info-leak-followup-3

title: 追问：以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑
difficulty: 进阶
tags: [安全, 隐私, 数据泄漏, 高频, 追问]
parent: sensitive-info-leak

### 一句话

围绕「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」回答追问时，重点说清 安全 的前提、动作和回退条件。

### 题目

如果面试官追问：以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑？

### 答案要点

#### 直答

- 追问核心：识别「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」的高风险失败场景并给出兜底措施（对应追问：以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑）。
- 直接围绕「以「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」为例，你会怎样给「客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些」定义分层策略，让高风险场景更严格、低风险场景更顺滑」作答：剪贴板（Clipboard API）：

#### 落地步骤

- 第一步：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 客服 / SaaS 场景里前端常被忽视的"敏感信息泄漏面"有哪些 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## cors-oauth-jwt-followup-2

title: 追问：结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt
generated: followup-script

### 一句话

这道追问的关键是把 CORS 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CORS、OAuth、JWT 是三回事，别混着讲」结论成立，给出 CORS 的验收路径（对应追问：结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性）。
- 直接围绕「结合真实业务约束，你会怎样验证「CORS、OAuth、JWT 是三回事，别混着讲」在真实攻击流量下仍能维持防护效果与可观测性」作答：CORS 管的是浏览器是否允许前端读取响应

#### 落地步骤

- 第一步：CORS、OAuth、JWT 是三回事，别混着讲 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CORS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## cors-oauth-jwt-followup-3

title: 追问：以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线
difficulty: 进阶
tags: [CORS, OAuth, JWT, 追问]
parent: cors-oauth-jwt
generated: followup-script

### 一句话

围绕「CORS、OAuth、JWT 是三回事，别混着讲」回答追问时，重点说清 CORS 的前提、动作和回退条件。

### 题目

如果面试官追问：以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线？

### 答案要点

#### 直答

- 追问核心：比较「CORS、OAuth、JWT 是三回事，别混着讲」在收益、成本和维护复杂度上的取舍边界（对应追问：以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线）。
- 直接围绕「以「CORS、OAuth、JWT 是三回事，别混着讲」为例，如果「CORS、OAuth、JWT 是三回事，别混着讲」必须在安全和体验之间做权衡，你会先守住哪些底线」作答：CORS 管的是浏览器是否允许前端读取响应

#### 落地步骤

- 第一步：先限定 CORS 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CORS、OAuth、JWT 是三回事，别混着讲 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CORS 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## supply-chain-followup-2

title: 追问：结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain
generated: followup-script

### 一句话

这道追问要直接回应「npm 供应链攻击与前端依赖治理」在 供应链安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为？

### 答案要点

#### 直答

- 追问核心：说明如何验证「npm 供应链攻击与前端依赖治理」结论成立，给出 供应链安全 的验收路径（对应追问：结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为）。
- 直接围绕「结合真实业务约束，你会如何搭建「npm 供应链攻击与前端依赖治理」的攻击监控面板，及时识别绕过尝试与异常行为」作答：固定 lockfile，避免不可控漂移

#### 落地步骤

- 第一步：先限定 供应链安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 npm 供应链攻击与前端依赖治理 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## supply-chain-followup-3

title: 追问：以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线
difficulty: 进阶
tags: [供应链安全, npm, 追问]
parent: supply-chain
generated: followup-script

### 一句话

这道追问的关键是把 供应链安全 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线？

### 答案要点

#### 直答

- 追问核心：比较「npm 供应链攻击与前端依赖治理」在收益、成本和维护复杂度上的取舍边界（对应追问：以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线）。
- 直接围绕「以「npm 供应链攻击与前端依赖治理」为例，如果「npm 供应链攻击与前端依赖治理」必须在安全和体验之间做权衡，你会先守住哪些底线」作答：固定 lockfile，避免不可控漂移

#### 落地步骤

- 第一步：npm 供应链攻击与前端依赖治理 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## passkeys-webauthn-followup-2

title: 追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn
generated: followup-script

### 一句话

这道追问的关键是把 Passkeys 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Passkeys / WebAuthn 取代密码的工程化路径」结论成立，给出 Passkeys 的验收路径（对应追问：在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过）。
- 直接围绕「在「Passkeys / WebAuthn 取代密码的工程化路径」场景下，如果要审计「Passkeys / WebAuthn 取代密码的工程化路径」在 Passkeys 维度的安全性，你会用哪些证据证明方案不可轻易绕过」作答：原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥

#### 落地步骤

- 第一步：Passkeys / WebAuthn 取代密码的工程化路径 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 Passkeys 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## passkeys-webauthn-followup-3

title: 追问：从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案
difficulty: 资深
tags: [Passkeys, WebAuthn, 追问]
parent: passkeys-webauthn
generated: followup-script

### 一句话

围绕「Passkeys / WebAuthn 取代密码的工程化路径」回答追问时，重点说清 Passkeys 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案？

### 答案要点

#### 直答

- 追问核心：比较「Passkeys / WebAuthn 取代密码的工程化路径」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案）。
- 直接围绕「从工程落地角度看，面对「Passkeys / WebAuthn 取代密码的工程化路径」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」作答：原理：基于公私钥的 WebAuthn 协议，私钥存设备 / iCloud Keychain / Google Password Manager，服务端只存公钥

#### 落地步骤

- 第一步：先限定 Passkeys 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Passkeys / WebAuthn 取代密码的工程化路径 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 Passkeys 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## subresource-integrity-followup-2

title: 追问：当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity
generated: followup-script

### 一句话

围绕「Subresource Integrity 与第三方资源篡改」回答追问时，重点说清 SRI 的前提、动作和回退条件。

### 题目

如果面试官追问：当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大？

### 答案要点

#### 直答

- 追问核心：识别「Subresource Integrity 与第三方资源篡改」的高风险失败场景并给出兜底措施（对应追问：当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大）。
- 直接围绕「当「Subresource Integrity 与第三方资源篡改」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大」作答：SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行

#### 落地步骤

- 第一步：先限定 SRI 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 Subresource Integrity 与第三方资源篡改 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 SRI 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## subresource-integrity-followup-3

title: 追问：在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标
difficulty: 进阶
tags: [SRI, CDN, 追问]
parent: subresource-integrity
generated: followup-script

### 一句话

回答这题时，先给 SRI 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Subresource Integrity 与第三方资源篡改」结论成立，给出 SRI 的验收路径（对应追问：在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标）。
- 直接围绕「在「Subresource Integrity 与第三方资源篡改」场景下，如果要在线上证明「Subresource Integrity 与第三方资源篡改」稳定，你会优先看哪些和 SRI 相关的日志与指标」作答：SRI（Subresource Integrity）：在 script 标签 / link 标签上加 integrity 属性指定文件 hash，浏览器校验失败就拒绝执行

#### 落地步骤

- 第一步：Subresource Integrity 与第三方资源篡改 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 SRI 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## xss-csrf-defense-followup-2

title: 追问：在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense
generated: followup-script

### 一句话

这道追问要直接回应「XSS 与 CSRF 的区别和防御」在 安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值？

### 答案要点

#### 直答

- 追问核心：说明如何验证「XSS 与 CSRF 的区别和防御」结论成立，给出 安全 的验收路径（对应追问：在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值）。
- 直接围绕「在「XSS 与 CSRF 的区别和防御」场景下，要证明「XSS 与 CSRF 的区别和防御」防护可信，你会如何结合攻击样例、审计日志和告警阈值」作答：XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本

#### 落地步骤

- 第一步：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 XSS 与 CSRF 的区别和防御 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## xss-csrf-defense-followup-3

title: 追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级
difficulty: 进阶
tags: [安全, XSS, CSRF, 高频, 追问]
parent: xss-csrf-defense
generated: followup-script

### 一句话

这道追问的关键是把 安全 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级？

### 答案要点

#### 直答

- 追问核心：比较「XSS 与 CSRF 的区别和防御」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级）。
- 直接围绕「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「XSS 与 CSRF 的区别和防御」排优先级」作答：XSS（Cross-Site Scripting）：让目标用户的浏览器执行恶意脚本

#### 落地步骤

- 第一步：XSS 与 CSRF 的区别和防御 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## auth-token-jwt-followup-2

title: 追问：从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt
generated: followup-script

### 一句话

这道追问要直接回应「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 直答

- 追问核心：说明如何验证「鉴权方案 Cookie+Session vs JWT 怎么选」结论成立，给出 鉴权 的验收路径（对应追问：从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过）。
- 直接围绕「从工程落地角度看，如果要审计「鉴权方案 Cookie+Session vs JWT 怎么选」在 鉴权 维度的安全性，你会用哪些证据证明方案不可轻易绕过」作答：Cookie + Session（有状态）

#### 落地步骤

- 第一步：先限定 鉴权 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 鉴权方案 Cookie+Session vs JWT 怎么选 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 鉴权 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## auth-token-jwt-followup-3

title: 追问：从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案
difficulty: 进阶
tags: [鉴权, JWT, Session, 追问]
parent: auth-token-jwt
generated: followup-script

### 一句话

回答这题时，先给 鉴权 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案？

### 答案要点

#### 直答

- 追问核心：比较「鉴权方案 Cookie+Session vs JWT 怎么选」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案）。
- 直接围绕「从工程落地角度看，面对「鉴权方案 Cookie+Session vs JWT 怎么选」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」作答：Cookie + Session（有状态）

#### 落地步骤

- 第一步：鉴权方案 Cookie+Session vs JWT 怎么选 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 鉴权 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## supply-chain-attack-followup-2

title: 追问：在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack
generated: followup-script

### 一句话

回答这题时，先给 安全 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端供应链攻击怎么防」结论成立，给出 安全 的验收路径（对应追问：在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过）。
- 直接围绕「在「前端供应链攻击怎么防」场景下，如果要审计「前端供应链攻击怎么防」在 安全 维度的安全性，你会用哪些证据证明方案不可轻易绕过」作答：依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码

#### 落地步骤

- 第一步：前端供应链攻击怎么防 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## supply-chain-attack-followup-3

title: 追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级
difficulty: 资深
tags: [安全, 供应链, 高频, 追问]
parent: supply-chain-attack
generated: followup-script

### 一句话

这道追问要直接回应「前端供应链攻击怎么防」在 安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级？

### 答案要点

#### 直答

- 追问核心：比较「前端供应链攻击怎么防」在收益、成本和维护复杂度上的取舍边界（对应追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级）。
- 直接围绕「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 安全 给「前端供应链攻击怎么防」排优先级」作答：依赖投毒：作者账号被盗 / 卖号 → 发新版本带恶意代码

#### 落地步骤

- 第一步：先限定 安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端供应链攻击怎么防 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## third-party-cookie-privacy-sandbox-followup-1

title: 追问：CHIPS 和普通第三方 Cookie 的安全边界有什么不同
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox, 追问]
parent: third-party-cookie-privacy-sandbox
generated: followup-script

### 一句话

围绕「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」回答追问时，重点说清 Cookie 的前提、动作和回退条件。

### 题目

如果面试官追问：CHIPS 和普通第三方 Cookie 的安全边界有什么不同？

### 答案要点

#### 直答

- 追问核心：识别「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」的高风险失败场景并给出兜底措施（对应追问：CHIPS 和普通第三方 Cookie 的安全边界有什么不同）。
- 直接围绕「CHIPS 和普通第三方 Cookie 的安全边界有什么不同」作答：受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面。

#### 落地步骤

- 第一步：先限定 Cookie 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 Cookie 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## third-party-cookie-privacy-sandbox-followup-2

title: 追问：从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox, 追问]
parent: third-party-cookie-privacy-sandbox
generated: followup-script

### 一句话

这道追问的关键是把 Cookie 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路？

### 答案要点

#### 直答

- 追问核心：识别「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」的高风险失败场景并给出兜底措施（对应追问：从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路）。
- 直接围绕「从工程落地角度看，嵌入式 SaaS 要在客户域名里保持登录态，你会设计哪些降级链路」作答：受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面。

#### 落地步骤

- 第一步：第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 Cookie 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 Cookie 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## third-party-cookie-privacy-sandbox-followup-3

title: 追问：以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化
difficulty: 资深
tags: [Cookie, CHIPS, FedCM, PrivacySandbox, 追问]
parent: third-party-cookie-privacy-sandbox
generated: followup-script

### 一句话

这道追问要直接回应「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」在 Cookie 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化？

### 答案要点

#### 直答

- 追问核心：说明如何验证「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」结论成立，给出 Cookie 的验收路径（对应追问：以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化）。
- 直接围绕「以「第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选」为例，如何验证第三方 Cookie 退场不会影响登录、埋点和支付转化」作答：受影响最大的不是普通同站登录，而是跨站 iframe、嵌入式客服/BI/SaaS、统一登录态、广告归因、第三方埋点和支付/风控页面。

#### 落地步骤

- 第一步：先限定 Cookie 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 第三方 Cookie 退场后，CHIPS、FedCM、Storage Access 怎么选 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 Cookie 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## csp-trusted-types-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types
generated: followup-script

### 一句话

围绕「CSP 与 Trusted Types 为什么是现代前端的高阶防线」回答追问时，重点说清 CSP 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「CSP 与 Trusted Types 为什么是现代前端的高阶防线」结论成立，给出 CSP 的验收路径（对应追问：从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「从工程落地角度看，为了证明这个方案在 CSP 维度有效，你会怎么设计测试闭环和线上观测指标」作答：CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口

#### 落地步骤

- 第一步：先限定 CSP 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 CSP 与 Trusted Types 为什么是现代前端的高阶防线 的结论不成立。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSP 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## csp-trusted-types-followup-3

title: 追问：以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序
difficulty: 进阶
tags: [CSP, TrustedTypes, 追问]
parent: csp-trusted-types
generated: followup-script

### 一句话

这道追问的关键是把 CSP 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序？

### 答案要点

#### 直答

- 追问核心：解释「CSP 与 Trusted Types 为什么是现代前端的高阶防线」背后的因果关系，并指出 CSP 的触发条件（对应追问：以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序）。
- 直接围绕「以「CSP 与 Trusted Types 为什么是现代前端的高阶防线」为例，面对规模与资源变化并存时，你会如何围绕 CSP 调整「CSP 与 Trusted Types 为什么是现代前端的高阶防线」的推进顺序」作答：CSP 可以限制脚本来源、禁止内联脚本、配合 nonce/hash 管控执行入口

#### 落地步骤

- 第一步：CSP 与 Trusted Types 为什么是现代前端的高阶防线 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：围绕 CSP 与 Trusted Types 为什么是现代前端的高阶防线 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 CSP 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## prototype-pollution-followup-2

title: 追问：以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution
generated: followup-script

### 一句话

回答这题时，先给 原型链污染 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证？

### 答案要点

#### 直答

- 追问核心：解释「原型链污染为什么危险，如何防」背后的因果关系，并指出 原型链污染 的触发条件（对应追问：以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证）。
- 直接围绕「以「原型链污染为什么危险，如何防」为例，你会如何围绕 原型链污染 定义「原型链污染为什么危险，如何防」生效的判据，并用测试与监控长期验证」作答：攻击者通过 **proto**、constructor.prototype 等路径污染全局原型

#### 落地步骤

- 第一步：原型链污染为什么危险，如何防 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 原型链污染。
- 第二步：围绕 原型链污染为什么危险，如何防 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 原型链污染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## prototype-pollution-followup-3

title: 追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级
difficulty: 进阶
tags: [原型链污染, 对象合并, 追问]
parent: prototype-pollution
generated: followup-script

### 一句话

这道追问的关键是把 原型链污染 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级？

### 答案要点

#### 直答

- 追问核心：解释「原型链污染为什么危险，如何防」背后的因果关系，并指出 原型链污染 的触发条件（对应追问：从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级）。
- 直接围绕「从工程落地角度看，当需求规模、团队资源或兼容性要求变化时，你会如何围绕 原型链污染 重排「原型链污染为什么危险，如何防」方案优先级」作答：攻击者通过 **proto**、constructor.prototype 等路径污染全局原型

#### 落地步骤

- 第一步：落地 原型链污染为什么危险，如何防 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。
- 第二步：围绕 原型链污染为什么危险，如何防 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 原型链污染 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## source-map-secrets-followup-2

title: 追问：从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets
generated: followup-script

### 一句话

围绕「Source Map、环境变量与前端敏感信息边界」回答追问时，重点说清 SourceMap 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Source Map、环境变量与前端敏感信息边界」结论成立，给出 SourceMap 的验收路径（对应追问：从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「从工程落地角度看，为了证明这个方案在 SourceMap 维度有效，你会怎么设计测试闭环和线上观测指标」作答：任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节

#### 落地步骤

- 第一步：回答 Source Map、环境变量与前端敏感信息边界 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 SourceMap 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## source-map-secrets-followup-3

title: 追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节
difficulty: 基础
tags: [SourceMap, Secrets, 追问]
parent: source-map-secrets
generated: followup-script

### 一句话

回答这题时，先给 SourceMap 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节？

### 答案要点

#### 直答

- 追问核心：比较「Source Map、环境变量与前端敏感信息边界」在收益、成本和维护复杂度上的取舍边界（对应追问：结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节）。
- 直接围绕「结合真实业务约束，当约束变化导致成本上升时，你会先优化「Source Map、环境变量与前端敏感信息边界」里和 SourceMap 相关的哪些环节」作答：任何下发到浏览器的值都不能视为真正机密，包括 JS 里的 token、密钥、算法细节

#### 落地步骤

- 第一步：Source Map、环境变量与前端敏感信息边界 只有在瓶颈被数据证实时才值得推进；先确认 SourceMap 是否真是主耗时来源。
- 第二步：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 第三步：如果 SourceMap 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 Source Map、环境变量与前端敏感信息边界 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

## security-sbom-signing-gate

title: 供应链准入闸门：SBOM、依赖签名与高危包阻断
difficulty: 资深
tags: [供应链安全, SBOM, 签名]
followups: [security-sbom-signing-gate-followup-1, security-sbom-signing-gate-followup-2, security-sbom-signing-gate-followup-3]

### 一句话

这题回答要覆盖 供应链安全 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

你会如何给前端依赖建立“准入闸门”，把 SBOM、签名校验和漏洞策略接进 CI/CD，而不是事后被动救火？

### 答案要点

- 先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档。
- 对关键依赖做完整性与来源校验：校验 lockfile、一致性哈希、签名或可验证 provenance，防止镜像污染和投毒包。
- 漏洞策略要分级：Critical 直接阻断，High 需安全审批并给时限，Medium/Low 纳入治理计划，避免“全红即全放行”。
- 准入策略要覆盖安装脚本风险：默认禁用高风险 postinstall，白名单放行必要包并审计。

#### 工程化补充

- 场景前提：先限定 供应链安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 供应链准入闸门：SBOM、依赖签名与高危包阻断 的结论不成立。
- 实施步骤：先把 供应链安全 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

回答「前端安全事故止损：密钥轮换、会话失效与用户保护」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

如果线上发生前端安全事故（如 token 泄漏、脚本被篡改、敏感接口被滥用），你会如何设计止损流程，兼顾安全与业务连续性？

### 答案要点

- 先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”。
- 密钥与凭证轮换要自动化：支持快速吊销、版本化切换与回退，避免人工串行操作拖慢响应。
- 会话策略要可控：按风险分层做强制登出、二次验证、敏感操作冻结，不是“一键踢全量用户”。
- 前端侧要有应急开关：可快速关闭高风险入口、禁用可疑第三方能力、切换只读模式。

#### 工程化补充

- 场景前提：先限定 安全应急 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端安全事故止损：密钥轮换、会话失效与用户保护 的结论不成立。
- 实施步骤：围绕 安全应急 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

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

这道追问要直接回应「供应链准入闸门：SBOM、依赖签名与高危包阻断」在 供应链安全 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 直答

- 追问核心：识别「供应链准入闸门：SBOM、依赖签名与高危包阻断」的高风险失败场景并给出兜底措施（对应追问：在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底）。
- 直接围绕「在当前团队与业务约束下，如果把「供应链准入闸门：SBOM、依赖签名与高危包阻断」放到真实业务里，你会如何划分信任边界和服务端兜底」作答：先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档。

#### 落地步骤

- 第一步：先限定 供应链安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 供应链准入闸门：SBOM、依赖签名与高危包阻断 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## security-sbom-signing-gate-followup-2

title: 追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [供应链安全, SBOM, 签名, 追问]
parent: security-sbom-signing-gate
generated: followup-script

### 一句话

这道追问的关键是把 供应链安全 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 追问核心：说明如何验证「供应链准入闸门：SBOM、依赖签名与高危包阻断」结论成立，给出 供应链安全 的验收路径（对应追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖）。
- 直接围绕「在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，你会如何围绕 供应链安全 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」作答：先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档。

#### 落地步骤

- 第一步：供应链准入闸门：SBOM、依赖签名与高危包阻断 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## security-sbom-signing-gate-followup-3

title: 追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗
difficulty: 资深
tags: [供应链安全, SBOM, 签名, 追问]
parent: security-sbom-signing-gate
generated: followup-script

### 一句话

围绕「供应链准入闸门：SBOM、依赖签名与高危包阻断」回答追问时，重点说清 供应链安全 的前提、动作和回退条件。

### 题目

如果面试官追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗？

### 答案要点

#### 直答

- 追问核心：识别「供应链准入闸门：SBOM、依赖签名与高危包阻断」的高风险失败场景并给出兜底措施（对应追问：在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗）。
- 直接围绕「在「供应链准入闸门：SBOM、依赖签名与高危包阻断」场景下，如果「供应链准入闸门：SBOM、依赖签名与高危包阻断」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」作答：先建立资产视图：每次构建产出 SBOM（含直接/传递依赖、版本、来源、许可证）并做版本留档。

#### 落地步骤

- 第一步：先限定 供应链安全 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 供应链准入闸门：SBOM、依赖签名与高危包阻断 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 供应链安全 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## security-incident-key-rotation-followup-1

title: 追问：结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全, 追问]
parent: security-incident-key-rotation
generated: followup-script

### 一句话

这道追问要直接回应「前端安全事故止损：密钥轮换、会话失效与用户保护」在 安全应急 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 追问核心：识别「前端安全事故止损：密钥轮换、会话失效与用户保护」的高风险失败场景并给出兜底措施（对应追问：结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束）。
- 直接围绕「结合真实业务约束，你会如何识别「前端安全事故止损：密钥轮换、会话失效与用户保护」在真实流量下最容易失效的输入与环境约束」作答：先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”。

#### 落地步骤

- 第一步：先限定 安全应急 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端安全事故止损：密钥轮换、会话失效与用户保护 的结论不成立。
- 第二步：先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全应急 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## security-incident-key-rotation-followup-2

title: 追问：在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全, 追问]
parent: security-incident-key-rotation
generated: followup-script

### 一句话

回答这题时，先给 安全应急 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端安全事故止损：密钥轮换、会话失效与用户保护」结论成立，给出 安全应急 的验收路径（对应追问：在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在「前端安全事故止损：密钥轮换、会话失效与用户保护」场景下，为了证明这个方案在 安全应急 维度有效，你会怎么设计测试闭环和线上观测指标」作答：先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”。

#### 落地步骤

- 第一步：前端安全事故止损：密钥轮换、会话失效与用户保护 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全应急 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。

## security-incident-key-rotation-followup-3

title: 追问：在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线
difficulty: 资深
tags: [安全应急, 密钥轮换, 会话安全, 追问]
parent: security-incident-key-rotation
generated: followup-script

### 一句话

围绕「前端安全事故止损：密钥轮换、会话失效与用户保护」回答追问时，重点说清 安全应急 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线？

### 答案要点

#### 直答

- 追问核心：比较「前端安全事故止损：密钥轮换、会话失效与用户保护」在收益、成本和维护复杂度上的取舍边界（对应追问：在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线）。
- 直接围绕「在当前团队与业务约束下，当「前端安全事故止损：密钥轮换、会话失效与用户保护」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」作答：先做分级与判定：确认影响资产、受影响用户范围、可疑行为特征，避免“全局停服式过度响应”。

#### 落地步骤

- 第一步：先限定 安全应急 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 前端安全事故止损：密钥轮换、会话失效与用户保护 的结论不成立。
- 第二步：先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价，并且动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。
- 第三步：如果 安全应急 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。
- 验收信号：验收至少包含攻击样例回放、审计日志核对和异常告警命中。
