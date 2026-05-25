---
id: 15-testing
title: 前端测试
order: 15
icon: ✅
description: 单元、组件、E2E、视觉回归、性能测试与测试策略设计。
---

## test-pyramid

title: 测试金字塔为什么不是“多写单测”这么简单
followups: [test-pyramid-followup-1, test-pyramid-followup-2, test-pyramid-followup-3]
links: [11-ai-frontend/llm-eval-pipeline]
difficulty: 基础
tags: [测试策略, 金字塔]

### 一句话

回答「测试金字塔为什么不是“多写单测”这么简单」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

如何理解单元测试、组件测试、集成测试、E2E 测试的分工？

### 答案要点

- 单元测试：验证纯逻辑和边界，反馈最快（毫秒级），适合算法、reducer、format
- 组件测试：用 jsdom + Testing Library 在近真实环境验证组件交互/渲染语义
- 集成测试：验证多模块协作（路由、store、网络层），通常仍跑在 jsdom
- E2E：用 Playwright/Cypress 从用户路径验证真实浏览器关键业务流，但慢且脆弱

#### 工程化补充

- 场景前提：回答 测试金字塔为什么不是“多写单测”这么简单 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
// 单元测试：纯函数，不依赖 DOM
import { describe, it, expect } from 'vitest';
import { calcTax } from '@/utils/tax';

describe('calcTax', () => {
  it('低收入免税', () => expect(calcTax(3000)).toBe(0));
  it('递进区间正确', () => expect(calcTax(10000)).toBe(290));
  it('边界：恰好临界值', () => expect(calcTax(5000)).toBe(0));
  it.each([
    [-1, 0],
    [Number.MAX_SAFE_INTEGER, expect.any(Number)],
  ])('异常输入 %i', (input, expected) => expect(calcTax(input)).toEqual(expected));
});
```

### 追问

- 针对「测试金字塔为什么不是“多写单测”这么简单」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「测试金字塔为什么不是“多写单测”这么简单」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 测试策略、金字塔，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 不是每一层越多越好，而是要让风险在合适的层被最早发现
- "组件测试"和"集成测试"在不同团队里的命名可能略有差异，关键是明确测试边界而不是纠结术语

## unit-mock-spy

title: Mock、Spy、Stub 在前端测试中的边界
followups: [unit-mock-spy-followup-1, unit-mock-spy-followup-2, unit-mock-spy-followup-3]
difficulty: 进阶
tags: [Mock, 单元测试]

### 一句话

这题回答要覆盖 Mock 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

为什么测试里“什么都 mock”会让测试脆弱？什么时候该 mock，什么时候不该？

### 答案要点

- 概念区分：Mock（替换实现）/ Spy（监视真实函数）/ Stub（仅返回固定值）
- Mock 太多会让测试只验证"你自己写的假世界"，重构时大量误报或漏报
- 适合 mock 的：外部依赖（网络、时间、随机数、文件系统、第三方 SDK）
- 不适合 mock 的：自家组件交互、领域规则、内部模块协作 —— 应让真实代码跑

#### 工程化补充

- 场景前提：回答 Mock、Spy、Stub 在前端测试中的边界 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：围绕 Mock、Spy、Stub 在前端测试中的边界 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { reportError } from '@/lib/monitor';

// 1. Spy：监视真实函数被调用
it('错误时上报监控', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  doSomethingWrong();
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('failed'));
  spy.mockRestore();
});

// 2. Mock：替换整个模块
vi.mock('@/lib/monitor', () => ({
  reportError: vi.fn(),
}));

// 3. Stub：固定时间/随机数
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01'));
});

// 4. Mock 网络：fetch
const fetchSpy = vi
  .spyOn(globalThis, 'fetch')
  .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

// 5. 异步定时器测试
it('防抖只触发一次', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 200);
  debounced();
  debounced();
  debounced();
  vi.advanceTimersByTime(200);
  expect(fn).toHaveBeenCalledTimes(1);
});
```

### 追问

- 针对「Mock、Spy、Stub 在前端测试中的边界」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「Mock、Spy、Stub 在前端测试中的边界」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 Mock、单元测试，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 好测试不是最隔离，而是在稳定性和真实性之间找到平衡

## component-testing

title: 组件测试应该站在用户视角还是实现视角
followups: [component-testing-followup-1, component-testing-followup-2, component-testing-followup-3]
difficulty: 进阶
tags: [组件测试, TestingLibrary]

### 一句话

回答「组件测试应该站在用户视角还是实现视角」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么越来越多团队强调“按可见文本和可访问角色查询元素”，而不是按 class 和内部状态断言？

### 答案要点

- 用户视角的测试对重构更稳定：HTML 结构变了，但 button/input 仍可见 → 测试不挂
- 按 role / label / text 查询能同时逼近无障碍语义，一举两得
- 实现视角（class 选择器、internal state）一重构就大面积误报，反过来阻碍重构
- Testing Library 的 priority 顺序：getByRole > getByLabelText > getByText > getByTestId

#### 工程化补充

- 场景前提：回答 组件测试应该站在用户视角还是实现视角 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：围绕 组件测试应该站在用户视角还是实现视角 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
// Vue Test Utils + Testing Library 风格
import { mount } from '@vue/test-utils';
import { render, screen, fireEvent } from '@testing-library/vue';
import LoginForm from '@/components/LoginForm.vue';

// ❌ 实现视角：依赖 class 与内部状态
it('点击登录', async () => {
  const wrapper = mount(LoginForm);
  await wrapper.find('.btn-submit').trigger('click');
  expect(wrapper.vm.loading).toBe(true); // 重构改名就挂
});

// ✅ 用户视角：按 role + label
it('用户点击登录按钮后看到加载态', async () => {
  render(LoginForm);
  await fireEvent.update(screen.getByLabelText('用户名'), 'alice');
  await fireEvent.update(screen.getByLabelText('密码'), '123');
  await fireEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(await screen.findByText('登录中...')).toBeInTheDocument();
});

// 表单校验
it('密码为空时按钮禁用', () => {
  render(LoginForm);
  expect(screen.getByRole('button', { name: '登录' })).toBeDisabled();
});
```

### 追问

- 针对「组件测试应该站在用户视角还是实现视角」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「组件测试应该站在用户视角还是实现视角」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 组件测试、TestingLibrary，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 测试本身也在塑造组件 API 与语义质量

## e2e-visual

title: E2E 与视觉回归分别覆盖什么风险
followups: [e2e-visual-followup-1, e2e-visual-followup-2, e2e-visual-followup-3]
difficulty: 进阶
tags: [E2E, 视觉回归]

### 一句话

回答「E2E 与视觉回归分别覆盖什么风险」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

Playwright/Cypress 和 Percy/Chromatic 这类视觉对比工具，分别更擅长发现什么问题？

### 答案要点

- E2E 更擅长发现流程断裂、接口联动、权限跳转、真实浏览器行为问题
- 视觉回归更擅长发现样式错位、主题回退、响应式破版、字号变化等 UI 偏差
- 两者互补，不应互相替代
- 面试中不要只停留在「E2E 与视觉回归分别覆盖什么风险」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：回答 E2E 与视觉回归分别覆盖什么风险 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：先把 E2E 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
// Playwright E2E：覆盖关键业务流
import { test, expect } from '@playwright/test';

test('用户登录后能看到订单列表', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('用户名').fill('alice');
  await page.getByLabel('密码').fill('123');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: '我的订单' })).toBeVisible();
  await expect(page.locator('.order-item')).toHaveCount(3);
});

// 网络拦截
test('接口失败时显示错误提示', async ({ page }) => {
  await page.route('**/api/orders', (r) => r.fulfill({ status: 500 }));
  await page.goto('/orders');
  await expect(page.getByRole('alert')).toContainText('加载失败');
});

// 视觉回归（Playwright 内置）
test('首页快照', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home.png', { maxDiffPixels: 100 });
});
```

```ts
// playwright.config.ts：稳定性配置
export default defineConfig({
  use: {
    actionTimeout: 5000,
    navigationTimeout: 10000,
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
});
```

### 追问

- 针对「E2E 与视觉回归分别覆盖什么风险」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「E2E 与视觉回归分别覆盖什么风险」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 E2E、视觉回归，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 视觉回归要控制截图环境，否则噪音会很大

## msw-contract

title: MSW、契约测试与前后端协作
followups: [msw-contract-followup-1, msw-contract-followup-2, msw-contract-followup-3]
difficulty: 进阶
tags: [MSW, 契约测试]

### 一句话

这题的高分关键是把 MSW 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

在接口经常变动的团队里，如何让前端测试既不完全依赖真后端，又不脱离真实协议？

### 答案要点

- MSW 可以在浏览器和 Node 层模拟真实 HTTP，保留调用链路
- 契约测试让前后端围绕 schema/协议做一致性校验
- 关键是把 mock 数据也当成需要维护的"契约资产"
- 面试中不要只停留在「MSW、契约测试与前后端协作」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。

#### 工程化补充

- 场景前提：MSW、契约测试与前后端协作 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 MSW。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
// MSW (Mock Service Worker)：拦截真实 fetch
import { setupWorker, http, HttpResponse } from 'msw';

const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'alice' });
  }),
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    if (body.password === 'wrong') return new HttpResponse(null, { status: 401 });
    return HttpResponse.json({ token: 'mock-token' });
  }),
];

// 浏览器环境（开发 / 测试）
const worker = setupWorker(...handlers);
worker.start();

// Node 环境（Vitest）
import { setupServer } from 'msw/node';
export const server = setupServer(...handlers);

// vitest.setup.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```ts
// 配合 Zod schema 做契约校验
import { z } from 'zod';
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return UserSchema.parse(await res.json()); // 协议不符立即抛错
}
```

### 追问

- 针对「MSW、契约测试与前后端协作」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「MSW、契约测试与前后端协作」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 MSW、契约测试，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 最差的情况是：开发用一套 mock，线上协议又是一套

## coverage-ci

title: 覆盖率、稳定性与 CI 中的测试门禁
followups: [coverage-ci-followup-1, coverage-ci-followup-2, coverage-ci-followup-3]
difficulty: 进阶
tags: [覆盖率, CI]

### 一句话

回答「覆盖率、稳定性与 CI 中的测试门禁」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么覆盖率高不等于测试质量高？CI 测试门禁应如何设计？

### 答案要点

- 覆盖率只说明"执行过"，不说明"断言有价值"——一行代码不写断言也能 100% 覆盖
- 关注 mutation testing（如 Stryker）：能否检测出代码被故意改坏，比单纯行覆盖率有意义
- 更应关注关键路径、边界、异常分支是否被有效覆盖，而非追求总数
- CI 分层门禁：快速单测必须过，组件测试 PR 上跑，重型 E2E 主干 / 定时 / 灰度跑

#### 工程化补充

- 场景前提：回答 覆盖率、稳定性与 CI 中的测试门禁 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：围绕 覆盖率、稳定性与 CI 中的测试门禁 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```yaml
# .github/workflows/test.yml
name: test
on: [pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with: { fail_ci_if_error: true }

  e2e:
    runs-on: ubuntu-latest
    if: github.event.pull_request.base.ref == 'main' # 仅主干 PR
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report }
```

```ts
// vitest.config.ts：覆盖率门禁
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 75,
        lines: 80,
        functions: 80,
        // 关键路径单独提高
        '**/utils/**': { statements: 95, branches: 90 },
      },
    },
  },
});
```

### 追问

- 针对「覆盖率、稳定性与 CI 中的测试门禁」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「覆盖率、稳定性与 CI 中的测试门禁」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 覆盖率、CI，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 稳定性差的测试比没有测试更伤团队信心

## playwright-tips

title: Playwright 高级用法（trace / fixtures / projects）
followups: [playwright-tips-followup-1, playwright-tips-followup-2, playwright-tips-followup-3]
difficulty: 进阶
tags: [Playwright, E2E]

### 一句话

回答「Playwright 高级用法（trace / fixtures / projects）」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

用 Playwright 跑 E2E 时有哪些被忽视但极有用的能力？

### 答案要点

- Trace Viewer：失败用例自动录制 dom + 网络 + 截图，定位问题极快
- Fixtures：把登录态 / 测试数据封装成 fixture，跨用例复用
- Projects：同一套用例在多浏览器 / 多分辨率 / 多 locale 跑
- API + UI 混合：用 API 准备数据，UI 只验关键路径

#### 工程化补充

- 场景前提：回答 Playwright 高级用法（trace / fixtures / projects） 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：先把 Playwright 拆成可执行子步骤，再逐步落地并记录每一步的输入输出，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { test as base, expect } from '@playwright/test';

type Fixtures = { authedPage: import('@playwright/test').Page };

const test = base.extend<Fixtures>({
  authedPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: '.auth/state.json' });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

test.describe('订单流程', () => {
  test('下单 → 支付 → 完成', async ({ authedPage }) => {
    await authedPage.goto('/cart');
    await authedPage.getByRole('button', { name: '结算' }).click();
    await expect(authedPage.getByText('订单创建成功')).toBeVisible();
  });
});
```

```ts
export default {
  use: { trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
  retries: 2,
};
```

### 追问

- 针对「Playwright 高级用法（trace / fixtures / projects）」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「Playwright 高级用法（trace / fixtures / projects）」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 Playwright、E2E，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- CI 里把 trace 上传成 artifact，PR 失败时点开就能看完整复现
- 用 Playwright 跑组件测试（@playwright/experimental-ct-vue）也越来越成熟

## flaky-tests

title: Flaky 测试是怎么来的，怎么治理
followups: [flaky-tests-followup-1, flaky-tests-followup-2, flaky-tests-followup-3]
difficulty: 资深
tags: [Flaky, 稳定性]

### 一句话

回答「Flaky 测试是怎么来的，怎么治理」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

跑十次有两次失败的测试就是 flaky test，怎么定位和根治？

### 答案要点

- 来源：异步未等待、定时器、动画、网络抖动、并发用例数据互相污染、随机数
- 自动检测：CI 上做 retry，记录哪些用例频繁 retry，标记成 flaky
- 排查：本地 --repeat-each=20、加详细 log；隔离运行确认是不是用例间污染
- 修复：用 await expect.poll() 替代 setTimeout；用 fixture 隔离数据；时间相关用 vi.useFakeTimers

#### 工程化补充

- 场景前提：回答 Flaky 测试是怎么来的，怎么治理 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { expect } from '@playwright/test';

await expect
  .poll(async () => fetch('/api/order/1').then((r) => r.status), {
    timeout: 10_000,
  })
  .toBe(200);

await expect(page.getByRole('alert')).toHaveText('成功');
```

```ts
const knownFlaky = new Set(['order-flow > pay']);
test.describe('orders', () => {
  test('pay', async ({ page }) => {
    test.skip(knownFlaky.has('order-flow > pay'), 'tracked in JIRA-1234');
  });
});
```

### 追问

- 针对「Flaky 测试是怎么来的，怎么治理」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「Flaky 测试是怎么来的，怎么治理」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 Flaky、稳定性，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Flaky 治理的关键不是技术，而是文化：让团队认可"红色 = 必须立刻处理"
- Code review 时关注新增用例是否依赖时间 / 顺序 / 网络

## test-pyramid-vs-trophy

title: 测试金字塔 / 测试奖杯 怎么选
followups: [test-pyramid-vs-trophy-followup-1, test-pyramid-vs-trophy-followup-2, test-pyramid-vs-trophy-followup-3]
difficulty: 进阶
tags: [测试, 架构]

### 一句话

这题的高分关键是把 测试 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

单元测试、集成测试、E2E 各应该怎么投入？前端有什么自己的特殊性？

### 答案要点

- 单元测试：纯函数 / Hook / 工具库；快、稳定、易定位 bug；适合纯逻辑
- 集成 / 组件测试：用 React Testing Library / Vue Test Utils 渲染真实组件树并模拟用户交互——前端核心战场
- E2E（Playwright / Cypress）：跑真浏览器，覆盖关键用户流程（登录 / 下单 / 支付）；慢、不稳定，控制数量
- 视觉回归：Percy / Chromatic / Playwright snapshot，UI 重构必备

#### 工程化补充

- 场景前提：测试金字塔 / 测试奖杯 怎么选 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

test('计数 +1', async () => {
  render(<Counter />);
  const btn = screen.getByRole('button', { name: /\+/ });
  await userEvent.click(btn);
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

```ts
import { test, expect } from '@playwright/test';

test('登录跳转', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('账号').fill('alice');
  await page.getByLabel('密码').fill('***');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL('/');
});
```

### 追问

- 针对「测试金字塔 / 测试奖杯 怎么选」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「测试金字塔 / 测试奖杯 怎么选」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 测试、架构，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vitest 是 Vite 项目的首选，比 Jest 快、配置简单
- 集成测试可以 mock 网络（MSW），单测 mock 函数调用
- 关键页面 E2E 跑在 CI，可视化回归差异自动评论 PR

## test-data-strategy

title: 测试数据怎么造？怎么避免脏数据互相干扰
followups: [test-data-strategy-followup-1, test-data-strategy-followup-2, test-data-strategy-followup-3]
difficulty: 进阶
tags: [测试, 数据, 高频]

### 一句话

讲「测试数据怎么造？怎么避免脏数据互相干扰」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你团队的 E2E 测试经常因为"昨天的数据没清"而挂；写单测又有人造一份巨大的 fixture，怎么治理？

### 答案要点

- 单元 / 组件测试：用 factory 函数（builder 模式），按需覆盖字段
- 集成 / E2E：直接调 API 造数据，跑完调 API 删；不要写死 SQL
- 用例级别：name = 'kap-test-' + uuid()，跑完按前缀清理
- suite 级别：beforeAll 造、afterAll 清

#### 工程化补充

- 场景前提：测试数据怎么造？怎么避免脏数据互相干扰 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { faker } from '@faker-js/faker';

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  name: 'kap-test-' + faker.person.firstName(),
  email: faker.internet.email(),
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

test('admin can edit', async () => {
  const admin = makeUser({ role: 'admin' });
  const target = makeUser();
  await canEdit(admin, target);
});

test('order placed at 9am', async () => {
  vi.setSystemTime(new Date('2024-01-01T09:00:00Z'));
  const order = await placeOrder({ userId: 'u1' });
  expect(order.createdAt).toBe('2024-01-01T09:00:00.000Z');
});

afterAll(async () => {
  await api.delete('/test-data?prefix=kap-test-');
});
```

### 追问

- 针对「测试数据怎么造？怎么避免脏数据互相干扰」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「测试数据怎么造？怎么避免脏数据互相干扰」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 测试、数据、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- snapshot 测试要小，超过 50 行要警惕；只对关键 DOM 树快照
- 共享数据库环境：CI 并发跑测试时锁同一行就死锁，建议每个 worker 独立 schema

## test-async-tricks

title: 异步代码 / 定时器 / Stream 怎么测？
followups: [test-async-tricks-followup-1, test-async-tricks-followup-2, test-async-tricks-followup-3]
difficulty: 进阶
tags: [测试, 异步, 高频]

### 一句话

回答「异步代码 / 定时器 / Stream 怎么测」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

怎么写出**稳定**的异步测试？带 setTimeout 的代码、流式接口、组件里的 useEffect，分别什么写法？

### 答案要点

- Promise / async
- 直接 await，断言异常用 await expect(fn()).rejects.toThrow()
- 不要 setTimeout(done, 100) 等异步，会 flaky
- fake timer

#### 工程化补充

- 场景前提：回答 异步代码 / 定时器 / Stream 怎么测 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 实施步骤：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { vi, test, expect } from 'vitest';

test('debounce 只调一次', () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const d = debounce(fn, 100);
  d(); d(); d();
  vi.advanceTimersByTime(99);
  expect(fn).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('async 异常', async () => {
  await expect(loadUser('bad-id')).rejects.toThrow('not found');
});

test('button 点击后异步显示文案', async () => {
  render(<Demo />);
  await userEvent.click(screen.getByRole('button'));
  expect(await screen.findByText('已加载')).toBeInTheDocument();
});

test('ReadableStream 切片读取', async () => {
  const stream = new ReadableStream({
    start(c) { c.enqueue('a'); c.enqueue('b'); c.close(); },
  });
  const reader = stream.getReader();
  const chunks: any[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  expect(chunks).toEqual(['a', 'b']);
});
```

### 追问

- 针对「异步代码 / 定时器 / Stream 怎么测」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「异步代码 / 定时器 / Stream 怎么测？」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 测试、异步、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Playwright 等 E2E 默认 retry，重要 case 写清等待条件
- "时间旅行"调试 flaky：本地循环跑 100 次（`vitest --repeat 100`）

## visual-regression

title: 视觉回归测试怎么做？
followups: [visual-regression-followup-1, visual-regression-followup-2, visual-regression-followup-3]
difficulty: 进阶
tags: [测试, 视觉, UI]

### 一句话

这题的高分关键是把 测试 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

组件库改了一行 CSS，哪些页面受影响很难肉眼覆盖。视觉回归怎么落地？

### 答案要点

- 第一次跑：生成 baseline 截图存 git
- 后续跑：对比当前渲染 vs baseline，逐像素 diff
- 容忍：可设阈值（0.1% 像素），抗 antialiasing
- Playwright 内置：expect(page).toHaveScreenshot()，本地友好，CI 易用

#### 工程化补充

- 场景前提：视觉回归测试怎么做 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 实施步骤：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { test, expect } from '@playwright/test';

test('product card visual', async ({ page }) => {
  await page.goto('/components/card?theme=light');
  await page.addStyleTag({
    content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
  });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.card')).toHaveScreenshot('card-light.png', {
    maxDiffPixelRatio: 0.001,
    mask: [page.locator('[data-mask]')],
  });
});
```

### 追问

- 针对「视觉回归测试怎么做」，你会优先补哪些边界用例和回归用例？
- 如何避免测试过度耦合实现细节，导致重构时大量误报？
- 这类测试在 CI 中如何分层运行，兼顾速度和信心？

### 常见误区

- 回答「视觉回归测试怎么做？」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。
- 只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。
- 测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。
- 相关标签是 测试、视觉、UI，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 视觉回归不能替代功能测试，互补
- 大型组件库会自动生成几千张图，CI 时长变长 → 用 sharding 并行
- 跨浏览器（Chromium / Firefox / WebKit）渲染差异大，按平台分别管理 baseline

## what-to-test-basic

title: 前端到底应该测什么？测多深？
followups: [what-to-test-basic-followup-1, what-to-test-basic-followup-2, what-to-test-basic-followup-3]
difficulty: 基础
tags: [测试策略, 基础]

### 一句话

讲「前端到底应该测什么？测多深」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

作为前端，应该测什么、不测什么？测试粒度怎么选？

### 答案要点

- 必测：核心业务路径（注册 / 支付 / 提交订单），通用工具函数（日期、金额、url 解析），自研组件库的关键交互
- 少测：UI 像素细节（用 visual regression），第三方库内部行为（信任就行）
- 不测：ts 类型本身（编译期就保了），简单 getter/setter，纯标记性 jsx
- 粒度：测行为不是测实现。例如"点了登录按钮 → 看到 dashboard"，不是"调用了 fetch 一次"

#### 工程化补充

- 场景前提：前端到底应该测什么？测多深 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试策略。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
import { test, expect } from '@playwright/test';

test('user can login and reach dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid=username]', 'alice');
  await page.fill('[data-testid=password]', 'secret');
  await page.click('text=登录');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid=user-name]')).toHaveText('Alice');
});
```

### 常见误区

- 沉迷追求 100% 行覆盖：80% 行 + 关键路径 100% 才是性价比最高的
- 测了实现细节："这个 hook 一定调用了 useState 3 次"——重构就崩
- E2E 太多导致 CI 慢、flaky；其实大部分应该下沉成组件测

### 追问

- 怎么处理 flaky 测试（重试、隔离、稳态等待）
- TDD 真的能在前端业务里跑吗
- 怎么衡量测试 ROI

### 延伸

- React Testing Library 的核心理念："测用户怎么用，不测组件怎么写"
- contract test / API mock（MSW）能取代很多 E2E

## test-pyramid-followup-1

title: 追问：从工程落地角度看，围绕「测试金字塔为什么不是“多写单测”这么简单」测试策略，你会如何排序边界用例与回归用例优先级
difficulty: 基础
tags: [测试策略, 金字塔, 追问]
parent: test-pyramid

### 一句话

围绕「测试金字塔为什么不是“多写单测”这么简单」回答追问时，重点说清 测试策略 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，围绕「测试金字塔为什么不是“多写单测”这么简单」测试策略，你会如何排序边界用例与回归用例优先级？

### 答案要点

#### 直答

- 追问核心：解释「测试金字塔为什么不是“多写单测”这么简单」背后的因果关系，并指出 测试策略 的触发条件（对应追问：从工程落地角度看，围绕「测试金字塔为什么不是“多写单测”这么简单」测试策略，你会如何排序边界用例与回归用例优先级）。
- 直接围绕「从工程落地角度看，围绕「测试金字塔为什么不是“多写单测”这么简单」测试策略，你会如何排序边界用例与回归用例优先级」作答：单元测试：验证纯逻辑和边界，反馈最快（毫秒级），适合算法、reducer、format

#### 落地步骤

- 第一步：回答 测试金字塔为什么不是“多写单测”这么简单 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试策略 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## unit-mock-spy-followup-1

title: 追问：以「Mock、Spy、Stub 在前端测试中的边界」为例，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例
difficulty: 进阶
tags: [Mock, 单元测试, 追问]
parent: unit-mock-spy

### 一句话

这道追问要直接回应「Mock、Spy、Stub 在前端测试中的边界」在 Mock 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「Mock、Spy、Stub 在前端测试中的边界」为例，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Mock、Spy、Stub 在前端测试中的边界」结论成立，给出 Mock 的验收路径（对应追问：以「Mock、Spy、Stub 在前端测试中的边界」为例，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例）。
- 直接围绕「以「Mock、Spy、Stub 在前端测试中的边界」为例，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例」作答：概念区分：Mock（替换实现）/ Spy（监视真实函数）/ Stub（仅返回固定值）

#### 落地步骤

- 第一步：回答 Mock、Spy、Stub 在前端测试中的边界 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Mock 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## component-testing-followup-1

title: 追问：当「组件测试应该站在用户视角还是实现视角」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 进阶
tags: [组件测试, TestingLibrary, 追问]
parent: component-testing

### 一句话

这道追问要直接回应「组件测试应该站在用户视角还是实现视角」在 组件测试 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：当「组件测试应该站在用户视角还是实现视角」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「组件测试应该站在用户视角还是实现视角」结论成立，给出 组件测试 的验收路径（对应追问：当「组件测试应该站在用户视角还是实现视角」需求频繁变更时，你会优先完善哪些回归和边界测试）。
- 直接围绕「当「组件测试应该站在用户视角还是实现视角」需求频繁变更时，你会优先完善哪些回归和边界测试」作答：用户视角的测试对重构更稳定：HTML 结构变了，但 button/input 仍可见 → 测试不挂

#### 落地步骤

- 第一步：回答 组件测试应该站在用户视角还是实现视角 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 组件测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## e2e-visual-followup-1

title: 追问：从工程落地角度看，针对「E2E 与视觉回归分别覆盖什么风险」线上故障高发点，你会先补哪些定向回归与边界验证
difficulty: 进阶
tags: [E2E, 视觉回归, 追问]
parent: e2e-visual

### 一句话

围绕「E2E 与视觉回归分别覆盖什么风险」回答追问时，重点说清 E2E 的前提、动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，针对「E2E 与视觉回归分别覆盖什么风险」线上故障高发点，你会先补哪些定向回归与边界验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「E2E 与视觉回归分别覆盖什么风险」结论成立，给出 E2E 的验收路径（对应追问：从工程落地角度看，针对「E2E 与视觉回归分别覆盖什么风险」线上故障高发点，你会先补哪些定向回归与边界验证）。
- 直接围绕「从工程落地角度看，针对「E2E 与视觉回归分别覆盖什么风险」线上故障高发点，你会先补哪些定向回归与边界验证」作答：E2E 更擅长发现流程断裂、接口联动、权限跳转、真实浏览器行为问题

#### 落地步骤

- 第一步：回答 E2E 与视觉回归分别覆盖什么风险 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 E2E 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## msw-contract-followup-1

title: 追问：结合真实业务约束，如果要提升「MSW、契约测试与前后端协作」的回归信心，你会先补哪几类边界与回归用例
difficulty: 进阶
tags: [MSW, 契约测试, 追问]
parent: msw-contract

### 一句话

回答这题时，先给 MSW 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，如果要提升「MSW、契约测试与前后端协作」的回归信心，你会先补哪几类边界与回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「MSW、契约测试与前后端协作」结论成立，给出 MSW 的验收路径（对应追问：结合真实业务约束，如果要提升「MSW、契约测试与前后端协作」的回归信心，你会先补哪几类边界与回归用例）。
- 直接围绕「结合真实业务约束，如果要提升「MSW、契约测试与前后端协作」的回归信心，你会先补哪几类边界与回归用例」作答：MSW 可以在浏览器和 Node 层模拟真实 HTTP，保留调用链路

#### 落地步骤

- 第一步：MSW、契约测试与前后端协作 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 MSW。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 MSW 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## coverage-ci-followup-1

title: 追问：在「覆盖率、稳定性与 CI 中的测试门禁」场景下，你会怎样为「覆盖率、稳定性与 CI 中的测试门禁」建立高价值用例集，覆盖关键边界和高风险回归场景
difficulty: 进阶
tags: [覆盖率, CI, 追问]
parent: coverage-ci

### 一句话

这道追问要直接回应「覆盖率、稳定性与 CI 中的测试门禁」在 覆盖率 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「覆盖率、稳定性与 CI 中的测试门禁」场景下，你会怎样为「覆盖率、稳定性与 CI 中的测试门禁」建立高价值用例集，覆盖关键边界和高风险回归场景？

### 答案要点

#### 直答

- 追问核心：说明如何验证「覆盖率、稳定性与 CI 中的测试门禁」结论成立，给出 覆盖率 的验收路径（对应追问：在「覆盖率、稳定性与 CI 中的测试门禁」场景下，你会怎样为「覆盖率、稳定性与 CI 中的测试门禁」建立高价值用例集，覆盖关键边界和高风险回归场景）。
- 直接围绕「在「覆盖率、稳定性与 CI 中的测试门禁」场景下，你会怎样为「覆盖率、稳定性与 CI 中的测试门禁」建立高价值用例集，覆盖关键边界和高风险回归场景」作答：覆盖率只说明"执行过"，不说明"断言有价值"——一行代码不写断言也能 100% 覆盖

#### 落地步骤

- 第一步：回答 覆盖率、稳定性与 CI 中的测试门禁 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 覆盖率 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## playwright-tips-followup-1

title: 追问：如果测试资源有限，你会如何选择「Playwright 高级用法（trace / fixtures / projects）」最值得先补的边界与回归用例
difficulty: 进阶
tags: [Playwright, E2E, 追问]
parent: playwright-tips

### 一句话

这道追问要直接回应「Playwright 高级用法（trace / fixtures / projects）」在 Playwright 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：如果测试资源有限，你会如何选择「Playwright 高级用法（trace / fixtures / projects）」最值得先补的边界与回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Playwright 高级用法（trace / fixtures / projects）」结论成立，给出 Playwright 的验收路径（对应追问：如果测试资源有限，你会如何选择「Playwright 高级用法（trace / fixtures / projects）」最值得先补的边界与回归用例）。
- 直接围绕「如果测试资源有限，你会如何选择「Playwright 高级用法（trace / fixtures / projects）」最值得先补的边界与回归用例」作答：Trace Viewer：失败用例自动录制 dom + 网络 + 截图，定位问题极快

#### 落地步骤

- 第一步：回答 Playwright 高级用法（trace / fixtures / projects） 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Playwright 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## flaky-tests-followup-1

title: 追问：在「Flaky 测试是怎么来的，怎么治理」场景下，你会怎样为「Flaky 测试是怎么来的，怎么治理」建立高价值用例集，覆盖关键边界和高风险回归场景
difficulty: 资深
tags: [Flaky, 稳定性, 追问]
parent: flaky-tests

### 一句话

这道追问要直接回应「Flaky 测试是怎么来的，怎么治理」在 Flaky 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「Flaky 测试是怎么来的，怎么治理」场景下，你会怎样为「Flaky 测试是怎么来的，怎么治理」建立高价值用例集，覆盖关键边界和高风险回归场景？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Flaky 测试是怎么来的，怎么治理」结论成立，给出 Flaky 的验收路径（对应追问：在「Flaky 测试是怎么来的，怎么治理」场景下，你会怎样为「Flaky 测试是怎么来的，怎么治理」建立高价值用例集，覆盖关键边界和高风险回归场景）。
- 直接围绕「在「Flaky 测试是怎么来的，怎么治理」场景下，你会怎样为「Flaky 测试是怎么来的，怎么治理」建立高价值用例集，覆盖关键边界和高风险回归场景」作答：来源：异步未等待、定时器、动画、网络抖动、并发用例数据互相污染、随机数

#### 落地步骤

- 第一步：回答 Flaky 测试是怎么来的，怎么治理 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Flaky 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-pyramid-vs-trophy-followup-1

title: 追问：结合真实业务约束，当「测试金字塔 / 测试奖杯 怎么选」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 进阶
tags: [测试, 架构, 追问]
parent: test-pyramid-vs-trophy

### 一句话

这道追问的关键是把 测试 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，当「测试金字塔 / 测试奖杯 怎么选」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试金字塔 / 测试奖杯 怎么选」结论成立，给出 测试 的验收路径（对应追问：结合真实业务约束，当「测试金字塔 / 测试奖杯 怎么选」需求频繁变更时，你会优先完善哪些回归和边界测试）。
- 直接围绕「结合真实业务约束，当「测试金字塔 / 测试奖杯 怎么选」需求频繁变更时，你会优先完善哪些回归和边界测试」作答：单元测试：纯函数 / Hook / 工具库；快、稳定、易定位 bug；适合纯逻辑

#### 落地步骤

- 第一步：测试金字塔 / 测试奖杯 怎么选 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-data-strategy-followup-1

title: 追问：在「测试数据怎么造？怎么避免脏数据互相干扰」场景下，针对「测试数据怎么造？怎么避免脏数据互相干扰」，你会优先补哪些边界用例和回归用例
difficulty: 进阶
tags: [测试, 数据, 高频, 追问]
parent: test-data-strategy

### 一句话

回答这题时，先给 测试 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「测试数据怎么造？怎么避免脏数据互相干扰」场景下，针对「测试数据怎么造？怎么避免脏数据互相干扰」，你会优先补哪些边界用例和回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试数据怎么造？怎么避免脏数据互相干扰」结论成立，给出 测试 的验收路径（对应追问：在「测试数据怎么造？怎么避免脏数据互相干扰」场景下，针对「测试数据怎么造？怎么避免脏数据互相干扰」，你会优先补哪些边界用例和回归用例）。
- 直接围绕「在「测试数据怎么造？怎么避免脏数据互相干扰」场景下，针对「测试数据怎么造？怎么避免脏数据互相干扰」，你会优先补哪些边界用例和回归用例」作答：单元 / 组件测试：用 factory 函数（builder 模式），按需覆盖字段

#### 落地步骤

- 第一步：测试数据怎么造？怎么避免脏数据互相干扰 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-async-tricks-followup-1

title: 追问：以「异步代码 / 定时器 / Stream 怎么测」为例，如果要提升「异步代码 / 定时器 / Stream 怎么测」的回归信心，你会先补哪几类边界与回归用例
difficulty: 进阶
tags: [测试, 异步, 高频, 追问]
parent: test-async-tricks

### 一句话

围绕「异步代码 / 定时器 / Stream 怎么测」回答追问时，重点说清 测试 的前提、动作和回退条件。

### 题目

如果面试官追问：以「异步代码 / 定时器 / Stream 怎么测」为例，如果要提升「异步代码 / 定时器 / Stream 怎么测」的回归信心，你会先补哪几类边界与回归用例？

### 答案要点

#### 直答

- 追问核心：围绕「异步代码 / 定时器 / Stream 怎么测」给出可执行的落地方案，重点说明 测试 怎么做（对应追问：以「异步代码 / 定时器 / Stream 怎么测」为例，如果要提升「异步代码 / 定时器 / Stream 怎么测」的回归信心，你会先补哪几类边界与回归用例）。
- 直接围绕「以「异步代码 / 定时器 / Stream 怎么测」为例，如果要提升「异步代码 / 定时器 / Stream 怎么测」的回归信心，你会先补哪几类边界与回归用例」作答：Promise / async

#### 落地步骤

- 第一步：回答 异步代码 / 定时器 / Stream 怎么测 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## visual-regression-followup-1

title: 追问：结合真实业务约束，想让「视觉回归测试怎么做」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入
difficulty: 进阶
tags: [测试, 视觉, UI, 追问]
parent: visual-regression

### 一句话

回答这题时，先给 测试 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，想让「视觉回归测试怎么做」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入？

### 答案要点

#### 直答

- 追问核心：说明如何验证「视觉回归测试怎么做」结论成立，给出 测试 的验收路径（对应追问：结合真实业务约束，想让「视觉回归测试怎么做」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入）。
- 直接围绕「结合真实业务约束，想让「视觉回归测试怎么做」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入」作答：第一次跑：生成 baseline 截图存 git

#### 落地步骤

- 第一步：视觉回归测试怎么做 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## what-to-test-basic-followup-1

title: 追问：结合真实业务约束，当「前端到底应该测什么？测多深」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 基础
tags: [测试策略, 基础, 追问]
parent: what-to-test-basic

### 一句话

这道追问的关键是把 测试策略 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，当「前端到底应该测什么？测多深」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端到底应该测什么？测多深」结论成立，给出 测试策略 的验收路径（对应追问：结合真实业务约束，当「前端到底应该测什么？测多深」需求频繁变更时，你会优先完善哪些回归和边界测试）。
- 直接围绕「结合真实业务约束，当「前端到底应该测什么？测多深」需求频繁变更时，你会优先完善哪些回归和边界测试」作答：必测：核心业务路径（注册 / 支付 / 提交订单），通用工具函数（日期、金额、url 解析），自研组件库的关键交互

#### 落地步骤

- 第一步：前端到底应该测什么？测多深 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试策略。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试策略 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## what-to-test-basic-followup-2

title: 追问：以「前端到底应该测什么？测多深」为例，如果要提升「前端到底应该测什么？测多深」的回归信心，你会先补哪几类边界与回归用例
difficulty: 基础
tags: [测试策略, 基础, 追问]
parent: what-to-test-basic

### 一句话

这道追问要直接回应「前端到底应该测什么？测多深」在 测试策略 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「前端到底应该测什么？测多深」为例，如果要提升「前端到底应该测什么？测多深」的回归信心，你会先补哪几类边界与回归用例？

### 答案要点

#### 直答

- 追问核心：围绕「前端到底应该测什么？测多深」给出可执行的落地方案，重点说明 测试策略 怎么做（对应追问：以「前端到底应该测什么？测多深」为例，如果要提升「前端到底应该测什么？测多深」的回归信心，你会先补哪几类边界与回归用例）。
- 直接围绕「以「前端到底应该测什么？测多深」为例，如果要提升「前端到底应该测什么？测多深」的回归信心，你会先补哪几类边界与回归用例」作答：必测：核心业务路径（注册 / 支付 / 提交订单），通用工具函数（日期、金额、url 解析），自研组件库的关键交互

#### 落地步骤

- 第一步：回答 前端到底应该测什么？测多深 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试策略 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## what-to-test-basic-followup-3

title: 追问：在「前端到底应该测什么？测多深」里测试资源有限时，你会怎么分配新边界用例和历史回归投入
difficulty: 基础
tags: [测试策略, 基础, 追问]
parent: what-to-test-basic

### 一句话

回答这题时，先给 测试策略 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：在「前端到底应该测什么？测多深」里测试资源有限时，你会怎么分配新边界用例和历史回归投入？

### 答案要点

#### 直答

- 追问核心：说明如何验证「前端到底应该测什么？测多深」结论成立，给出 测试策略 的验收路径（对应追问：在「前端到底应该测什么？测多深」里测试资源有限时，你会怎么分配新边界用例和历史回归投入）。
- 直接围绕「在「前端到底应该测什么？测多深」里测试资源有限时，你会怎么分配新边界用例和历史回归投入」作答：必测：核心业务路径（注册 / 支付 / 提交订单），通用工具函数（日期、金额、url 解析），自研组件库的关键交互

#### 落地步骤

- 第一步：前端到底应该测什么？测多深 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试策略。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试策略 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-pyramid-followup-2

title: 追问：在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「测试金字塔为什么不是“多写单测”这么简单」一重构就误报一片
difficulty: 基础
tags: [测试策略, 金字塔, 追问]
parent: test-pyramid
generated: followup-script

### 一句话

这道追问的关键是把 测试策略 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「测试金字塔为什么不是“多写单测”这么简单」一重构就误报一片？

### 答案要点

#### 直答

- 追问核心：解释「测试金字塔为什么不是“多写单测”这么简单」背后的因果关系，并指出 测试策略 的触发条件（对应追问：在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「测试金字塔为什么不是“多写单测”这么简单」一重构就误报一片）。
- 直接围绕「在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「测试金字塔为什么不是“多写单测”这么简单」一重构就误报一片」作答：单元测试：验证纯逻辑和边界，反馈最快（毫秒级），适合算法、reducer、format

#### 落地步骤

- 第一步：测试金字塔为什么不是“多写单测”这么简单 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试策略。
- 第二步：围绕 测试金字塔为什么不是“多写单测”这么简单 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试策略 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-pyramid-followup-3

title: 追问：以「测试金字塔为什么不是“多写单测”这么简单」为例，如果测试资源有限，你会如何选择「测试金字塔为什么不是“多写单测”这么简单」最值得先补的边界与回归用例
difficulty: 基础
tags: [测试策略, 金字塔, 追问]
parent: test-pyramid
generated: followup-script

### 一句话

这道追问要直接回应「测试金字塔为什么不是“多写单测”这么简单」在 测试策略 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：以「测试金字塔为什么不是“多写单测”这么简单」为例，如果测试资源有限，你会如何选择「测试金字塔为什么不是“多写单测”这么简单」最值得先补的边界与回归用例？

### 答案要点

#### 直答

- 追问核心：解释「测试金字塔为什么不是“多写单测”这么简单」背后的因果关系，并指出 测试策略 的触发条件（对应追问：以「测试金字塔为什么不是“多写单测”这么简单」为例，如果测试资源有限，你会如何选择「测试金字塔为什么不是“多写单测”这么简单」最值得先补的边界与回归用例）。
- 直接围绕「以「测试金字塔为什么不是“多写单测”这么简单」为例，如果测试资源有限，你会如何选择「测试金字塔为什么不是“多写单测”这么简单」最值得先补的边界与回归用例」作答：单元测试：验证纯逻辑和边界，反馈最快（毫秒级），适合算法、reducer、format

#### 落地步骤

- 第一步：回答 测试金字塔为什么不是“多写单测”这么简单 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试策略 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## unit-mock-spy-followup-2

title: 追问：结合真实业务约束，为了让回归更稳，你会如何重写「Mock、Spy、Stub 在前端测试中的边界」里依赖实现细节的测试
difficulty: 进阶
tags: [Mock, 单元测试, 追问]
parent: unit-mock-spy
generated: followup-script

### 一句话

这道追问的关键是把 Mock 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：结合真实业务约束，为了让回归更稳，你会如何重写「Mock、Spy、Stub 在前端测试中的边界」里依赖实现细节的测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Mock、Spy、Stub 在前端测试中的边界」结论成立，给出 Mock 的验收路径（对应追问：结合真实业务约束，为了让回归更稳，你会如何重写「Mock、Spy、Stub 在前端测试中的边界」里依赖实现细节的测试）。
- 直接围绕「结合真实业务约束，为了让回归更稳，你会如何重写「Mock、Spy、Stub 在前端测试中的边界」里依赖实现细节的测试」作答：概念区分：Mock（替换实现）/ Spy（监视真实函数）/ Stub（仅返回固定值）

#### 落地步骤

- 第一步：Mock、Spy、Stub 在前端测试中的边界 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Mock。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Mock 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## unit-mock-spy-followup-3

title: 追问：结合真实业务约束，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例
difficulty: 进阶
tags: [Mock, 单元测试, 追问]
parent: unit-mock-spy
generated: followup-script

### 一句话

围绕「Mock、Spy、Stub 在前端测试中的边界」回答追问时，重点说清 Mock 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Mock、Spy、Stub 在前端测试中的边界」结论成立，给出 Mock 的验收路径（对应追问：结合真实业务约束，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例）。
- 直接围绕「结合真实业务约束，如果测试资源有限，你会如何选择「Mock、Spy、Stub 在前端测试中的边界」最值得先补的边界与回归用例」作答：概念区分：Mock（替换实现）/ Spy（监视真实函数）/ Stub（仅返回固定值）

#### 落地步骤

- 第一步：回答 Mock、Spy、Stub 在前端测试中的边界 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Mock 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## component-testing-followup-2

title: 追问：当你准备重构「组件测试应该站在用户视角还是实现视角」时，怎么判断现有测试是在保护行为还是绑死实现
difficulty: 进阶
tags: [组件测试, TestingLibrary, 追问]
parent: component-testing
generated: followup-script

### 一句话

回答这题时，先给 组件测试 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：当你准备重构「组件测试应该站在用户视角还是实现视角」时，怎么判断现有测试是在保护行为还是绑死实现？

### 答案要点

#### 直答

- 追问核心：说明如何验证「组件测试应该站在用户视角还是实现视角」结论成立，给出 组件测试 的验收路径（对应追问：当你准备重构「组件测试应该站在用户视角还是实现视角」时，怎么判断现有测试是在保护行为还是绑死实现）。
- 直接围绕「当你准备重构「组件测试应该站在用户视角还是实现视角」时，怎么判断现有测试是在保护行为还是绑死实现」作答：用户视角的测试对重构更稳定：HTML 结构变了，但 button/input 仍可见 → 测试不挂

#### 落地步骤

- 第一步：组件测试应该站在用户视角还是实现视角 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 组件测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 组件测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## component-testing-followup-3

title: 追问：以「组件测试应该站在用户视角还是实现视角」为例，想让「组件测试应该站在用户视角还是实现视角」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入
difficulty: 进阶
tags: [组件测试, TestingLibrary, 追问]
parent: component-testing
generated: followup-script

### 一句话

围绕「组件测试应该站在用户视角还是实现视角」回答追问时，重点说清 组件测试 的前提、动作和回退条件。

### 题目

如果面试官追问：以「组件测试应该站在用户视角还是实现视角」为例，想让「组件测试应该站在用户视角还是实现视角」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入？

### 答案要点

#### 直答

- 追问核心：说明如何验证「组件测试应该站在用户视角还是实现视角」结论成立，给出 组件测试 的验收路径（对应追问：以「组件测试应该站在用户视角还是实现视角」为例，想让「组件测试应该站在用户视角还是实现视角」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入）。
- 直接围绕「以「组件测试应该站在用户视角还是实现视角」为例，想让「组件测试应该站在用户视角还是实现视角」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入」作答：用户视角的测试对重构更稳定：HTML 结构变了，但 button/input 仍可见 → 测试不挂

#### 落地步骤

- 第一步：回答 组件测试应该站在用户视角还是实现视角 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 组件测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## e2e-visual-followup-2

title: 追问：在当前团队与业务约束下，你会用什么约束避免「E2E 与视觉回归分别覆盖什么风险」测试和实现代码一起“共振”，导致后续维护脆弱
difficulty: 进阶
tags: [E2E, 视觉回归, 追问]
parent: e2e-visual
generated: followup-script

### 一句话

这道追问的关键是把 E2E 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，你会用什么约束避免「E2E 与视觉回归分别覆盖什么风险」测试和实现代码一起“共振”，导致后续维护脆弱？

### 答案要点

#### 直答

- 追问核心：说明如何验证「E2E 与视觉回归分别覆盖什么风险」结论成立，给出 E2E 的验收路径（对应追问：在当前团队与业务约束下，你会用什么约束避免「E2E 与视觉回归分别覆盖什么风险」测试和实现代码一起“共振”，导致后续维护脆弱）。
- 直接围绕「在当前团队与业务约束下，你会用什么约束避免「E2E 与视觉回归分别覆盖什么风险」测试和实现代码一起“共振”，导致后续维护脆弱」作答：E2E 更擅长发现流程断裂、接口联动、权限跳转、真实浏览器行为问题

#### 落地步骤

- 第一步：E2E 与视觉回归分别覆盖什么风险 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 E2E。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 E2E 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## e2e-visual-followup-3

title: 追问：从工程落地角度看，结合「E2E 与视觉回归分别覆盖什么风险」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现
difficulty: 进阶
tags: [E2E, 视觉回归, 追问]
parent: e2e-visual
generated: followup-script

### 一句话

这道追问要直接回应「E2E 与视觉回归分别覆盖什么风险」在 E2E 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：从工程落地角度看，结合「E2E 与视觉回归分别覆盖什么风险」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现？

### 答案要点

#### 直答

- 追问核心：说明如何验证「E2E 与视觉回归分别覆盖什么风险」结论成立，给出 E2E 的验收路径（对应追问：从工程落地角度看，结合「E2E 与视觉回归分别覆盖什么风险」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现）。
- 直接围绕「从工程落地角度看，结合「E2E 与视觉回归分别覆盖什么风险」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现」作答：E2E 更擅长发现流程断裂、接口联动、权限跳转、真实浏览器行为问题

#### 落地步骤

- 第一步：回答 E2E 与视觉回归分别覆盖什么风险 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 E2E 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## msw-contract-followup-2

title: 追问：结合真实业务约束，如果 CI 在「MSW、契约测试与前后端协作」改造期频繁误报，你会怎么拆测试层次来降噪
difficulty: 进阶
tags: [MSW, 契约测试, 追问]
parent: msw-contract
generated: followup-script

### 一句话

围绕「MSW、契约测试与前后端协作」回答追问时，重点说清 MSW 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果 CI 在「MSW、契约测试与前后端协作」改造期频繁误报，你会怎么拆测试层次来降噪？

### 答案要点

#### 直答

- 追问核心：说明如何验证「MSW、契约测试与前后端协作」结论成立，给出 MSW 的验收路径（对应追问：结合真实业务约束，如果 CI 在「MSW、契约测试与前后端协作」改造期频繁误报，你会怎么拆测试层次来降噪）。
- 直接围绕「结合真实业务约束，如果 CI 在「MSW、契约测试与前后端协作」改造期频繁误报，你会怎么拆测试层次来降噪」作答：MSW 可以在浏览器和 Node 层模拟真实 HTTP，保留调用链路

#### 落地步骤

- 第一步：回答 MSW、契约测试与前后端协作 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 MSW 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## msw-contract-followup-3

title: 追问：以「MSW、契约测试与前后端协作」为例，当「MSW、契约测试与前后端协作」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 进阶
tags: [MSW, 契约测试, 追问]
parent: msw-contract
generated: followup-script

### 一句话

这道追问的关键是把 MSW 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「MSW、契约测试与前后端协作」为例，当「MSW、契约测试与前后端协作」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「MSW、契约测试与前后端协作」结论成立，给出 MSW 的验收路径（对应追问：以「MSW、契约测试与前后端协作」为例，当「MSW、契约测试与前后端协作」需求频繁变更时，你会优先完善哪些回归和边界测试）。
- 直接围绕「以「MSW、契约测试与前后端协作」为例，当「MSW、契约测试与前后端协作」需求频繁变更时，你会优先完善哪些回归和边界测试」作答：MSW 可以在浏览器和 Node 层模拟真实 HTTP，保留调用链路

#### 落地步骤

- 第一步：MSW、契约测试与前后端协作 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 MSW。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 MSW 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## coverage-ci-followup-2

title: 追问：在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「覆盖率、稳定性与 CI 中的测试门禁」一重构就误报一片
difficulty: 进阶
tags: [覆盖率, CI, 追问]
parent: coverage-ci
generated: followup-script

### 一句话

这道追问的关键是把 覆盖率 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「覆盖率、稳定性与 CI 中的测试门禁」一重构就误报一片？

### 答案要点

#### 直答

- 追问核心：说明如何验证「覆盖率、稳定性与 CI 中的测试门禁」结论成立，给出 覆盖率 的验收路径（对应追问：在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「覆盖率、稳定性与 CI 中的测试门禁」一重构就误报一片）。
- 直接围绕「在当前团队与业务约束下，测试怎么写才能不绑死实现细节，避免「覆盖率、稳定性与 CI 中的测试门禁」一重构就误报一片」作答：覆盖率只说明"执行过"，不说明"断言有价值"——一行代码不写断言也能 100% 覆盖

#### 落地步骤

- 第一步：覆盖率、稳定性与 CI 中的测试门禁 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 覆盖率。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 覆盖率 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## coverage-ci-followup-3

title: 追问：在「覆盖率、稳定性与 CI 中的测试门禁」场景下，围绕「覆盖率、稳定性与 CI 中的测试门禁」测试策略，你会如何排序边界用例与回归用例优先级
difficulty: 进阶
tags: [覆盖率, CI, 追问]
parent: coverage-ci
generated: followup-script

### 一句话

围绕「覆盖率、稳定性与 CI 中的测试门禁」回答追问时，重点说清 覆盖率 的前提、动作和回退条件。

### 题目

如果面试官追问：在「覆盖率、稳定性与 CI 中的测试门禁」场景下，围绕「覆盖率、稳定性与 CI 中的测试门禁」测试策略，你会如何排序边界用例与回归用例优先级？

### 答案要点

#### 直答

- 追问核心：说明如何验证「覆盖率、稳定性与 CI 中的测试门禁」结论成立，给出 覆盖率 的验收路径（对应追问：在「覆盖率、稳定性与 CI 中的测试门禁」场景下，围绕「覆盖率、稳定性与 CI 中的测试门禁」测试策略，你会如何排序边界用例与回归用例优先级）。
- 直接围绕「在「覆盖率、稳定性与 CI 中的测试门禁」场景下，围绕「覆盖率、稳定性与 CI 中的测试门禁」测试策略，你会如何排序边界用例与回归用例优先级」作答：覆盖率只说明"执行过"，不说明"断言有价值"——一行代码不写断言也能 100% 覆盖

#### 落地步骤

- 第一步：回答 覆盖率、稳定性与 CI 中的测试门禁 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 覆盖率 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## playwright-tips-followup-2

title: 追问：如果 CI 在「Playwright 高级用法」改造期频繁误报，你会怎么拆测试层次来降噪
difficulty: 进阶
tags: [Playwright, E2E, 追问]
parent: playwright-tips
generated: followup-script

### 一句话

回答这题时，先给 Playwright 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：如果 CI 在「Playwright 高级用法」改造期频繁误报，你会怎么拆测试层次来降噪？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Playwright 高级用法（trace / fixtures / projects）」结论成立，给出 Playwright 的验收路径（对应追问：如果 CI 在「Playwright 高级用法」改造期频繁误报，你会怎么拆测试层次来降噪）。
- 直接围绕「如果 CI 在「Playwright 高级用法」改造期频繁误报，你会怎么拆测试层次来降噪」作答：Trace Viewer：失败用例自动录制 dom + 网络 + 截图，定位问题极快

#### 落地步骤

- 第一步：Playwright 高级用法（trace / fixtures / projects） 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Playwright。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Playwright 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## playwright-tips-followup-3

title: 追问：在「Playwright 高级用法」场景下，围绕「Playwright 高级用法」测试策略，你会如何排序边界用例与回归用例优先级
difficulty: 进阶
tags: [Playwright, E2E, 追问]
parent: playwright-tips
generated: followup-script

### 一句话

围绕「Playwright 高级用法（trace / fixtures / projects）」回答追问时，重点说清 Playwright 的前提、动作和回退条件。

### 题目

如果面试官追问：在「Playwright 高级用法」场景下，围绕「Playwright 高级用法」测试策略，你会如何排序边界用例与回归用例优先级？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Playwright 高级用法（trace / fixtures / projects）」结论成立，给出 Playwright 的验收路径（对应追问：在「Playwright 高级用法」场景下，围绕「Playwright 高级用法」测试策略，你会如何排序边界用例与回归用例优先级）。
- 直接围绕「在「Playwright 高级用法」场景下，围绕「Playwright 高级用法」测试策略，你会如何排序边界用例与回归用例优先级」作答：Trace Viewer：失败用例自动录制 dom + 网络 + 截图，定位问题极快

#### 落地步骤

- 第一步：回答 Playwright 高级用法（trace / fixtures / projects） 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Playwright 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## flaky-tests-followup-2

title: 追问：在「Flaky 测试是怎么来的，怎么治理」场景下，你会用什么约束避免「Flaky 测试是怎么来的，怎么治理」测试和实现代码一起“共振”，导致后续维护脆弱
difficulty: 资深
tags: [Flaky, 稳定性, 追问]
parent: flaky-tests
generated: followup-script

### 一句话

这道追问的关键是把 Flaky 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：在「Flaky 测试是怎么来的，怎么治理」场景下，你会用什么约束避免「Flaky 测试是怎么来的，怎么治理」测试和实现代码一起“共振”，导致后续维护脆弱？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Flaky 测试是怎么来的，怎么治理」结论成立，给出 Flaky 的验收路径（对应追问：在「Flaky 测试是怎么来的，怎么治理」场景下，你会用什么约束避免「Flaky 测试是怎么来的，怎么治理」测试和实现代码一起“共振”，导致后续维护脆弱）。
- 直接围绕「在「Flaky 测试是怎么来的，怎么治理」场景下，你会用什么约束避免「Flaky 测试是怎么来的，怎么治理」测试和实现代码一起“共振”，导致后续维护脆弱」作答：来源：异步未等待、定时器、动画、网络抖动、并发用例数据互相污染、随机数

#### 落地步骤

- 第一步：Flaky 测试是怎么来的，怎么治理 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 Flaky。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Flaky 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## flaky-tests-followup-3

title: 追问：在「Flaky 测试是怎么来的，怎么治理」场景下，围绕「Flaky 测试是怎么来的，怎么治理」测试策略，你会如何排序边界用例与回归用例优先级
difficulty: 资深
tags: [Flaky, 稳定性, 追问]
parent: flaky-tests
generated: followup-script

### 一句话

围绕「Flaky 测试是怎么来的，怎么治理」回答追问时，重点说清 Flaky 的前提、动作和回退条件。

### 题目

如果面试官追问：在「Flaky 测试是怎么来的，怎么治理」场景下，围绕「Flaky 测试是怎么来的，怎么治理」测试策略，你会如何排序边界用例与回归用例优先级？

### 答案要点

#### 直答

- 追问核心：说明如何验证「Flaky 测试是怎么来的，怎么治理」结论成立，给出 Flaky 的验收路径（对应追问：在「Flaky 测试是怎么来的，怎么治理」场景下，围绕「Flaky 测试是怎么来的，怎么治理」测试策略，你会如何排序边界用例与回归用例优先级）。
- 直接围绕「在「Flaky 测试是怎么来的，怎么治理」场景下，围绕「Flaky 测试是怎么来的，怎么治理」测试策略，你会如何排序边界用例与回归用例优先级」作答：来源：异步未等待、定时器、动画、网络抖动、并发用例数据互相污染、随机数

#### 落地步骤

- 第一步：回答 Flaky 测试是怎么来的，怎么治理 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 Flaky 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-pyramid-vs-trophy-followup-2

title: 追问：以「测试金字塔 / 测试奖杯 怎么选」为例，为了让回归更稳，你会如何重写「测试金字塔 / 测试奖杯 怎么选」里依赖实现细节的测试
difficulty: 进阶
tags: [测试, 架构, 追问]
parent: test-pyramid-vs-trophy
generated: followup-script

### 一句话

围绕「测试金字塔 / 测试奖杯 怎么选」回答追问时，重点说清 测试 的前提、动作和回退条件。

### 题目

如果面试官追问：以「测试金字塔 / 测试奖杯 怎么选」为例，为了让回归更稳，你会如何重写「测试金字塔 / 测试奖杯 怎么选」里依赖实现细节的测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试金字塔 / 测试奖杯 怎么选」结论成立，给出 测试 的验收路径（对应追问：以「测试金字塔 / 测试奖杯 怎么选」为例，为了让回归更稳，你会如何重写「测试金字塔 / 测试奖杯 怎么选」里依赖实现细节的测试）。
- 直接围绕「以「测试金字塔 / 测试奖杯 怎么选」为例，为了让回归更稳，你会如何重写「测试金字塔 / 测试奖杯 怎么选」里依赖实现细节的测试」作答：单元测试：纯函数 / Hook / 工具库；快、稳定、易定位 bug；适合纯逻辑

#### 落地步骤

- 第一步：回答 测试金字塔 / 测试奖杯 怎么选 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-pyramid-vs-trophy-followup-3

title: 追问：结合真实业务约束，想让「测试金字塔 / 测试奖杯 怎么选」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入
difficulty: 进阶
tags: [测试, 架构, 追问]
parent: test-pyramid-vs-trophy
generated: followup-script

### 一句话

回答这题时，先给 测试 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：结合真实业务约束，想让「测试金字塔 / 测试奖杯 怎么选」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试金字塔 / 测试奖杯 怎么选」结论成立，给出 测试 的验收路径（对应追问：结合真实业务约束，想让「测试金字塔 / 测试奖杯 怎么选」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入）。
- 直接围绕「结合真实业务约束，想让「测试金字塔 / 测试奖杯 怎么选」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入」作答：单元测试：纯函数 / Hook / 工具库；快、稳定、易定位 bug；适合纯逻辑

#### 落地步骤

- 第一步：测试金字塔 / 测试奖杯 怎么选 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-data-strategy-followup-2

title: 追问：在当前团队与业务约束下，你会用什么约束避免「测试数据怎么造？怎么避免脏数据互相干扰」测试和实现代码一起“共振”，导致后续维护脆弱
difficulty: 进阶
tags: [测试, 数据, 高频, 追问]
parent: test-data-strategy
generated: followup-script

### 一句话

围绕「测试数据怎么造？怎么避免脏数据互相干扰」回答追问时，重点说清 测试 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，你会用什么约束避免「测试数据怎么造？怎么避免脏数据互相干扰」测试和实现代码一起“共振”，导致后续维护脆弱？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试数据怎么造？怎么避免脏数据互相干扰」结论成立，给出 测试 的验收路径（对应追问：在当前团队与业务约束下，你会用什么约束避免「测试数据怎么造？怎么避免脏数据互相干扰」测试和实现代码一起“共振”，导致后续维护脆弱）。
- 直接围绕「在当前团队与业务约束下，你会用什么约束避免「测试数据怎么造？怎么避免脏数据互相干扰」测试和实现代码一起“共振”，导致后续维护脆弱」作答：单元 / 组件测试：用 factory 函数（builder 模式），按需覆盖字段

#### 落地步骤

- 第一步：回答 测试数据怎么造？怎么避免脏数据互相干扰 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-data-strategy-followup-3

title: 追问：从工程落地角度看，结合「测试数据怎么造？怎么避免脏数据互相干扰」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现
difficulty: 进阶
tags: [测试, 数据, 高频, 追问]
parent: test-data-strategy
generated: followup-script

### 一句话

这道追问的关键是把 测试 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：从工程落地角度看，结合「测试数据怎么造？怎么避免脏数据互相干扰」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试数据怎么造？怎么避免脏数据互相干扰」结论成立，给出 测试 的验收路径（对应追问：从工程落地角度看，结合「测试数据怎么造？怎么避免脏数据互相干扰」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现）。
- 直接围绕「从工程落地角度看，结合「测试数据怎么造？怎么避免脏数据互相干扰」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现」作答：单元 / 组件测试：用 factory 函数（builder 模式），按需覆盖字段

#### 落地步骤

- 第一步：测试数据怎么造？怎么避免脏数据互相干扰 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-async-tricks-followup-2

title: 追问：以「异步代码 / 定时器 / Stream 怎么测」为例，为了让回归更稳，你会如何重写「异步代码 / 定时器 / Stream 怎么测」里依赖实现细节的测试
difficulty: 进阶
tags: [测试, 异步, 高频, 追问]
parent: test-async-tricks
generated: followup-script

### 一句话

回答这题时，先给 测试 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「异步代码 / 定时器 / Stream 怎么测」为例，为了让回归更稳，你会如何重写「异步代码 / 定时器 / Stream 怎么测」里依赖实现细节的测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「异步代码 / 定时器 / Stream 怎么测」结论成立，给出 测试 的验收路径（对应追问：以「异步代码 / 定时器 / Stream 怎么测」为例，为了让回归更稳，你会如何重写「异步代码 / 定时器 / Stream 怎么测」里依赖实现细节的测试）。
- 直接围绕「以「异步代码 / 定时器 / Stream 怎么测」为例，为了让回归更稳，你会如何重写「异步代码 / 定时器 / Stream 怎么测」里依赖实现细节的测试」作答：Promise / async

#### 落地步骤

- 第一步：异步代码 / 定时器 / Stream 怎么测 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-async-tricks-followup-3

title: 追问：结合真实业务约束，当「异步代码 / 定时器 / Stream 怎么测」需求频繁变更时，你会优先完善哪些回归和边界测试
difficulty: 进阶
tags: [测试, 异步, 高频, 追问]
parent: test-async-tricks
generated: followup-script

### 一句话

这道追问要直接回应「异步代码 / 定时器 / Stream 怎么测」在 测试 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：结合真实业务约束，当「异步代码 / 定时器 / Stream 怎么测」需求频繁变更时，你会优先完善哪些回归和边界测试？

### 答案要点

#### 直答

- 追问核心：说明如何验证「异步代码 / 定时器 / Stream 怎么测」结论成立，给出 测试 的验收路径（对应追问：结合真实业务约束，当「异步代码 / 定时器 / Stream 怎么测」需求频繁变更时，你会优先完善哪些回归和边界测试）。
- 直接围绕「结合真实业务约束，当「异步代码 / 定时器 / Stream 怎么测」需求频繁变更时，你会优先完善哪些回归和边界测试」作答：Promise / async

#### 落地步骤

- 第一步：回答 异步代码 / 定时器 / Stream 怎么测 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## visual-regression-followup-2

title: 追问：结合真实业务约束，如果 CI 在「视觉回归测试怎么做」改造期频繁误报，你会怎么拆测试层次来降噪
difficulty: 进阶
tags: [测试, 视觉, UI, 追问]
parent: visual-regression
generated: followup-script

### 一句话

围绕「视觉回归测试怎么做」回答追问时，重点说清 测试 的前提、动作和回退条件。

### 题目

如果面试官追问：结合真实业务约束，如果 CI 在「视觉回归测试怎么做」改造期频繁误报，你会怎么拆测试层次来降噪？

### 答案要点

#### 直答

- 追问核心：说明如何验证「视觉回归测试怎么做」结论成立，给出 测试 的验收路径（对应追问：结合真实业务约束，如果 CI 在「视觉回归测试怎么做」改造期频繁误报，你会怎么拆测试层次来降噪）。
- 直接围绕「结合真实业务约束，如果 CI 在「视觉回归测试怎么做」改造期频繁误报，你会怎么拆测试层次来降噪」作答：第一次跑：生成 baseline 截图存 git

#### 落地步骤

- 第一步：回答 视觉回归测试怎么做 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## visual-regression-followup-3

title: 追问：如果测试资源有限，你会如何选择「视觉回归测试怎么做」最值得先补的边界与回归用例
difficulty: 进阶
tags: [测试, 视觉, UI, 追问]
parent: visual-regression
generated: followup-script

### 一句话

这道追问的关键是把 测试 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：如果测试资源有限，你会如何选择「视觉回归测试怎么做」最值得先补的边界与回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「视觉回归测试怎么做」结论成立，给出 测试 的验收路径（对应追问：如果测试资源有限，你会如何选择「视觉回归测试怎么做」最值得先补的边界与回归用例）。
- 直接围绕「如果测试资源有限，你会如何选择「视觉回归测试怎么做」最值得先补的边界与回归用例」作答：第一次跑：生成 baseline 截图存 git

#### 落地步骤

- 第一步：视觉回归测试怎么做 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## release-quality-gate-matrix

title: 发布质量门禁矩阵：按风险等级动态决定测什么、拦什么
difficulty: 资深
tags: [质量门禁, 风险分级, 发布]
followups: [release-quality-gate-matrix-followup-1, release-quality-gate-matrix-followup-2, release-quality-gate-matrix-followup-3]

### 一句话

回答「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

你会如何设计发布质量门禁矩阵，让低风险改动快速放行、高风险改动严格验证？

### 答案要点

- 先定义风险输入：改动范围、关键路径触达、依赖升级、历史故障画像、回滚复杂度。
- 建立分级门禁矩阵：L1（基础检查）、L2（加组件/集成回归）、L3（加 E2E/视觉/性能与人工审批）。
- 门禁策略要动态：同一测试在高峰期或核心业务窗口可以升为阻断级。
- 失败反馈要可操作：明确失败原因、归属模块、建议修复路径，避免“红灯但无行动信息”。

#### 工程化补充

- 场景前提：发布质量门禁矩阵：按风险等级动态决定测什么、拦什么 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type RiskLevel = 'L1' | 'L2' | 'L3';

function requiredChecks(level: RiskLevel) {
  if (level === 'L3') return ['unit', 'component', 'contract', 'e2e', 'visual', 'perf'];
  if (level === 'L2') return ['unit', 'component', 'contract'];
  return ['unit', 'lint', 'build'];
}
```

```yaml
quality_gate_matrix:
  L1: [lint, unit, build]
  L2: [lint, unit, component, contract]
  L3: [all_above, e2e_smoke, visual_regression, perf_budget, oncall_approval]
```

### 追问

- 「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 所有改动都跑全量测试，导致 CI 长期拥堵和绕过心态。
- 门禁只拦截不分级，无法体现业务风险差异。
- 没有应急与回补机制，紧急场景下流程容易失控。

### 延伸

- 可把风险分级与 PR 模板联动，提前透明展示必过检查项。
- 建议按季度校准矩阵，避免“历史规则不再匹配当前架构”。

## test-failure-command-runbook

title: 测试红灯应急机制：失败分流、止损决策与回归闭环
difficulty: 资深
tags: [测试治理, 应急响应, Runbook]
followups: [test-failure-command-runbook-followup-1, test-failure-command-runbook-followup-2, test-failure-command-runbook-followup-3]

### 一句话

讲「测试红灯应急机制：失败分流、止损决策与回归闭环」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

当 CI 测试大面积红灯时，你会如何组织应急处理，既快速恢复交付，又不放过真实质量问题？

### 答案要点

- 先做失败分流：按测试类型、失败签名、影响范围区分为回归缺陷、环境问题、flaky 抖动。
- 建立指挥角色：值班 owner 决策是否冻结发布，模块 owner 负责定位，测试 owner 负责门禁策略调整。
- 定义止损动作：高风险失败立即阻断，低风险 flaky 可短期 quarantine 但必须绑定截止时间。
- 要有证据链：失败日志、trace、截图、commit diff、依赖版本变化要能串联定位。

#### 工程化补充

- 场景前提：测试红灯应急机制：失败分流、止损决策与回归闭环 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试治理。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

### 代码示例

```ts
type FailureKind = 'regression' | 'infra' | 'flaky';

function classifyFailure(signal: {
  sameTestFailedNBuilds: number;
  infraErrorRate: number;
  deterministic: boolean;
}): FailureKind {
  if (signal.infraErrorRate > 0.3) return 'infra';
  if (!signal.deterministic && signal.sameTestFailedNBuilds < 2) return 'flaky';
  return 'regression';
}
```

```yaml
failure_runbook:
  regression:
    action: [freeze_release, assign_module_owner, require_fix_or_revert]
  infra:
    action: [switch_runner_pool, retry_with_trace, notify_devops]
  flaky:
    action: [temporary_quarantine, create_ticket_with_deadline, add_stability_metrics]
```

### 追问

- 「测试红灯应急机制：失败分流、止损决策与回归闭环」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 所有红灯都直接 retry，导致真实回归被延迟发现。
- quarantine 没有过期治理，flaky 用例长期堆积。
- “恢复交付”后不做回补，主干可信度持续下降。

### 延伸

- 建议把失败模式做成知识库，缩短新人排障时间。
- 关键流水线可建立“失败模式看板”，支持趋势预警和容量规划。

## release-quality-gate-matrix-followup-1

title: 追问：在「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」场景下，真要把「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」推到线上，你会如何围绕 质量门禁 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [质量门禁, 风险分级, 发布, 追问]
parent: release-quality-gate-matrix
generated: followup-script

### 一句话

这道追问要直接回应「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」在 质量门禁 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」场景下，真要把「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」推到线上，你会如何围绕 质量门禁 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 追问核心：说明「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」上线时如何灰度、观测、回滚（对应追问：在「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」场景下，真要把「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」推到线上，你会如何围绕 质量门禁 设计灰度节奏、回滚条件和迁移路径）。
- 直接围绕「在「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」场景下，真要把「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」推到线上，你会如何围绕 质量门禁 设计灰度节奏、回滚条件和迁移路径」作答：先定义风险输入：改动范围、关键路径触达、依赖升级、历史故障画像、回滚复杂度。

#### 落地步骤

- 第一步：发布质量门禁矩阵：按风险等级动态决定测什么、拦什么 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先选低风险流量灰度，再按指标放量，异常时按预案快速回滚，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 质量门禁 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## release-quality-gate-matrix-followup-2

title: 追问：你会如何围绕 质量门禁 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [质量门禁, 风险分级, 发布, 追问]
parent: release-quality-gate-matrix
generated: followup-script

### 一句话

这道追问要直接回应「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」在 质量门禁 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：你会如何围绕 质量门禁 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 追问核心：说明如何验证「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」结论成立，给出 质量门禁 的验收路径（对应追问：你会如何围绕 质量门禁 定义“方案生效”的判据，并通过测试与观测数据持续验证）。
- 直接围绕「你会如何围绕 质量门禁 定义“方案生效”的判据，并通过测试与观测数据持续验证」作答：先定义风险输入：改动范围、关键路径触达、依赖升级、历史故障画像、回滚复杂度。

#### 落地步骤

- 第一步：回答 发布质量门禁矩阵：按风险等级动态决定测什么、拦什么 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 质量门禁 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## release-quality-gate-matrix-followup-3

title: 追问：在当前团队与业务约束下，如果团队要评估「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」的长期维护价值，你会优先看哪些指标再下结论
difficulty: 资深
tags: [质量门禁, 风险分级, 发布, 追问]
parent: release-quality-gate-matrix
generated: followup-script

### 一句话

围绕「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」回答追问时，重点说清 质量门禁 的前提、动作和回退条件。

### 题目

如果面试官追问：在当前团队与业务约束下，如果团队要评估「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」的长期维护价值，你会优先看哪些指标再下结论？

### 答案要点

#### 直答

- 追问核心：说明如何验证「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」结论成立，给出 质量门禁 的验收路径（对应追问：在当前团队与业务约束下，如果团队要评估「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」的长期维护价值，你会优先看哪些指标再下结论）。
- 直接围绕「在当前团队与业务约束下，如果团队要评估「发布质量门禁矩阵：按风险等级动态决定测什么、拦什么」的长期维护价值，你会优先看哪些指标再下结论」作答：先定义风险输入：改动范围、关键路径触达、依赖升级、历史故障画像、回滚复杂度。

#### 落地步骤

- 第一步：发布质量门禁矩阵：按风险等级动态决定测什么、拦什么 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 第三步：如果 质量门禁 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

## test-failure-command-runbook-followup-1

title: 追问：以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，你会如何识别「测试红灯应急机制：失败分流、止损决策与回归闭环」在真实流量下最容易失效的输入与环境约束
difficulty: 资深
tags: [测试治理, 应急响应, Runbook, 追问]
parent: test-failure-command-runbook
generated: followup-script

### 一句话

这道追问的关键是把 测试治理 讲成可执行方案，并补风险与验收闭环。

### 题目

如果面试官追问：以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，你会如何识别「测试红灯应急机制：失败分流、止损决策与回归闭环」在真实流量下最容易失效的输入与环境约束？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试红灯应急机制：失败分流、止损决策与回归闭环」结论成立，给出 测试治理 的验收路径（对应追问：以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，你会如何识别「测试红灯应急机制：失败分流、止损决策与回归闭环」在真实流量下最容易失效的输入与环境约束）。
- 直接围绕「以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，你会如何识别「测试红灯应急机制：失败分流、止损决策与回归闭环」在真实流量下最容易失效的输入与环境约束」作答：先做失败分流：按测试类型、失败签名、影响范围区分为回归缺陷、环境问题、flaky 抖动。

#### 落地步骤

- 第一步：测试红灯应急机制：失败分流、止损决策与回归闭环 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试治理。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-failure-command-runbook-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 测试治理 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 资深
tags: [测试治理, 应急响应, Runbook, 追问]
parent: test-failure-command-runbook
generated: followup-script

### 一句话

这道追问要直接回应「测试红灯应急机制：失败分流、止损决策与回归闭环」在 测试治理 上的执行动作、风险边界和验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 测试治理 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试红灯应急机制：失败分流、止损决策与回归闭环」结论成立，给出 测试治理 的验收路径（对应追问：在当前团队与业务约束下，为了证明这个方案在 测试治理 维度有效，你会怎么设计测试闭环和线上观测指标）。
- 直接围绕「在当前团队与业务约束下，为了证明这个方案在 测试治理 维度有效，你会怎么设计测试闭环和线上观测指标」作答：先做失败分流：按测试类型、失败签名、影响范围区分为回归缺陷、环境问题、flaky 抖动。

#### 落地步骤

- 第一步：回答 测试红灯应急机制：失败分流、止损决策与回归闭环 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。
- 第二步：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。

## test-failure-command-runbook-followup-3

title: 追问：以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，如果测试资源有限，你会如何选择「测试红灯应急机制：失败分流、止损决策与回归闭环」最值得先补的边界与回归用例
difficulty: 资深
tags: [测试治理, 应急响应, Runbook, 追问]
parent: test-failure-command-runbook
generated: followup-script

### 一句话

回答这题时，先给 测试治理 的结论，再给落地步骤，最后给可验证的验收标准。

### 题目

如果面试官追问：以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，如果测试资源有限，你会如何选择「测试红灯应急机制：失败分流、止损决策与回归闭环」最值得先补的边界与回归用例？

### 答案要点

#### 直答

- 追问核心：说明如何验证「测试红灯应急机制：失败分流、止损决策与回归闭环」结论成立，给出 测试治理 的验收路径（对应追问：以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，如果测试资源有限，你会如何选择「测试红灯应急机制：失败分流、止损决策与回归闭环」最值得先补的边界与回归用例）。
- 直接围绕「以「测试红灯应急机制：失败分流、止损决策与回归闭环」为例，如果测试资源有限，你会如何选择「测试红灯应急机制：失败分流、止损决策与回归闭环」最值得先补的边界与回归用例」作答：先做失败分流：按测试类型、失败签名、影响范围区分为回归缺陷、环境问题、flaky 抖动。

#### 落地步骤

- 第一步：测试红灯应急机制：失败分流、止损决策与回归闭环 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 测试治理。
- 第二步：把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核，并且动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。
- 第三步：如果 测试治理 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。

#### 风险与验收

- 失败风险：常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。
- 验收信号：验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。
