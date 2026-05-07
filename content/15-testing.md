---
id: 15-testing
title: 前端测试
order: 15
icon: ✅
description: 单元、组件、E2E、视觉回归、性能测试与测试策略设计。
---

## test-pyramid
title: 测试金字塔为什么不是“多写单测”这么简单
difficulty: 基础
tags: [测试策略, 金字塔]

### 一句话
单元测试验证纯逻辑和边界，反馈最快；组件测试验证组件在近真实环境中的交互和渲染语义；集成测试验证模块协作。

### 题目
如何理解单元测试、组件测试、集成测试、E2E 测试的分工？

### 答案要点
- 单元测试验证纯逻辑和边界，反馈最快
- 组件测试验证组件在近真实环境中的交互和渲染语义
- 集成测试验证模块协作
- E2E 从用户路径验证真实环境下的关键业务流

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

### 延伸
- 不是每一层越多越好，而是要让风险在合适的层被最早发现
- "组件测试"和"集成测试"在不同团队里的命名可能略有差异，关键是明确测试边界而不是纠结术语

## unit-mock-spy
title: Mock、Spy、Stub 在前端测试中的边界
difficulty: 进阶
tags: [Mock, 单元测试]

### 一句话
Mock 太多会让测试验证的只是你自己写的假世界；纯逻辑依赖、时间、随机数、网络边界适合 mock；UI 行为和领域规则尽量少 mock，保持更真实的协作关系。

### 题目
为什么测试里“什么都 mock”会让测试脆弱？什么时候该 mock，什么时候不该？

### 答案要点
- Mock 太多会让测试验证的只是你自己写的假世界
- 纯逻辑依赖、时间、随机数、网络边界适合 mock
- UI 行为和领域规则尽量少 mock，保持更真实的协作关系

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
const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
  new Response(JSON.stringify({ ok: true }), { status: 200 }),
);

// 5. 异步定时器测试
it('防抖只触发一次', () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 200);
  debounced(); debounced(); debounced();
  vi.advanceTimersByTime(200);
  expect(fn).toHaveBeenCalledTimes(1);
});
```

### 延伸
- 好测试不是最隔离，而是在稳定性和真实性之间找到平衡

## component-testing
title: 组件测试应该站在用户视角还是实现视角
difficulty: 进阶
tags: [组件测试, TestingLibrary]

### 一句话
用户视角的测试对重构更稳定；按 role、label、text 查询能同时逼近无障碍语义；如果测试过度依赖实现细节，组件一重构就会大面积误报。

### 题目
为什么越来越多团队强调“按可见文本和可访问角色查询元素”，而不是按 class 和内部状态断言？

### 答案要点
- 用户视角的测试对重构更稳定
- 按 role、label、text 查询能同时逼近无障碍语义
- 如果测试过度依赖实现细节，组件一重构就会大面积误报

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

### 延伸
- 测试本身也在塑造组件 API 与语义质量

## e2e-visual
title: E2E 与视觉回归分别覆盖什么风险
difficulty: 进阶
tags: [E2E, 视觉回归]

### 一句话
E2E 更擅长发现流程断裂、接口联动、权限跳转、真实浏览器行为问题；视觉回归更擅长发现样式错位、主题回退、响应式破版、字号变化等 UI 偏差；两者互补，不应互相替代。

### 题目
Playwright/Cypress 和 Percy/Chromatic 这类视觉对比工具，分别更擅长发现什么问题？

### 答案要点
- E2E 更擅长发现流程断裂、接口联动、权限跳转、真实浏览器行为问题
- 视觉回归更擅长发现样式错位、主题回退、响应式破版、字号变化等 UI 偏差
- 两者互补，不应互相替代

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
  await page.route('**/api/orders', r => r.fulfill({ status: 500 }));
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

### 延伸
- 视觉回归要控制截图环境，否则噪音会很大

## msw-contract
title: MSW、契约测试与前后端协作
difficulty: 进阶
tags: [MSW, 契约测试]

### 一句话
MSW 可以在浏览器和 Node 层模拟真实 HTTP，保留调用链路；契约测试让前后端围绕 schema/协议做一致性校验；关键是把 mock 数据也当成需要维护的"契约资产"。

### 题目
在接口经常变动的团队里，如何让前端测试既不完全依赖真后端，又不脱离真实协议？

### 答案要点
- MSW 可以在浏览器和 Node 层模拟真实 HTTP，保留调用链路
- 契约测试让前后端围绕 schema/协议做一致性校验
- 关键是把 mock 数据也当成需要维护的"契约资产"

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
    if (body.password === 'wrong')
      return new HttpResponse(null, { status: 401 });
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

### 延伸
- 最差的情况是：开发用一套 mock，线上协议又是一套

## coverage-ci
title: 覆盖率、稳定性与 CI 中的测试门禁
difficulty: 进阶
tags: [覆盖率, CI]

### 一句话
覆盖率只说明“执行过”，不说明“断言有价值”；更应关注关键路径、边界情况、异常处理是否被覆盖；CI 里通常分层：快速单测必须过，重型 E2E 可按主干或定时跑。

### 题目
为什么覆盖率高不等于测试质量高？CI 测试门禁应如何设计？

### 答案要点
- 覆盖率只说明“执行过”，不说明“断言有价值”
- 更应关注关键路径、边界情况、异常处理是否被覆盖
- CI 里通常分层：快速单测必须过，重型 E2E 可按主干或定时跑

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
    if: github.event.pull_request.base.ref == 'main'  # 仅主干 PR
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

### 延伸
- 稳定性差的测试比没有测试更伤团队信心

## playwright-tips
title: Playwright 高级用法（trace / fixtures / projects）
difficulty: 进阶
tags: [Playwright, E2E]

### 一句话
Trace Viewer：失败用例自动录制 dom + 网络 + 截图，定位问题极快；Fixtures：把登录态 / 测试数据封装成 fixture，跨用例复用；Projects：同一套用例在多浏览器 / 多分辨率 / 多 locale 跑。

### 题目
用 Playwright 跑 E2E 时有哪些被忽视但极有用的能力？

### 答案要点
- Trace Viewer：失败用例自动录制 dom + 网络 + 截图，定位问题极快
- Fixtures：把登录态 / 测试数据封装成 fixture，跨用例复用
- Projects：同一套用例在多浏览器 / 多分辨率 / 多 locale 跑
- API + UI 混合：用 API 准备数据，UI 只验关键路径
- 网络拦截：`page.route` 模拟接口慢 / 错误 / 异常 payload
- Auth state：登录一次保存 cookie，后续用例直接 `storageState` 复用

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

### 延伸
- CI 里把 trace 上传成 artifact，PR 失败时点开就能看完整复现
- 用 Playwright 跑组件测试（@playwright/experimental-ct-vue）也越来越成熟

## flaky-tests
title: Flaky 测试是怎么来的，怎么治理
difficulty: 资深
tags: [Flaky, 稳定性]

### 一句话
来源：异步未等待、定时器、动画、网络抖动、并发用例数据互相污染、随机数；自动检测：CI 上做 retry，记录哪些用例频繁 retry，标记成 flaky；排查：本地 --repeat-each=20、加详细 log；隔离运行确认是不是用例间污染。

### 题目
跑十次有两次失败的测试就是 flaky test，怎么定位和根治？

### 答案要点
- 来源：异步未等待、定时器、动画、网络抖动、并发用例数据互相污染、随机数
- 自动检测：CI 上做 retry，记录哪些用例频繁 retry，标记成 flaky
- 排查：本地 `--repeat-each=20`、加详细 log；隔离运行确认是不是用例间污染
- 修复：用 `await expect.poll()` 替代 setTimeout；用 fixture 隔离数据；时间相关用 `vi.useFakeTimers`
- 治理：flaky 用例先 quarantine 不阻塞主干，但必须有 owner + 截止时间，避免长期堆积
- 度量：dashboard 展示 flaky 比例，作为质量指标对外可见

### 代码示例
```ts
import { expect } from '@playwright/test';

await expect.poll(async () => fetch('/api/order/1').then((r) => r.status), {
  timeout: 10_000,
}).toBe(200);

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

### 延伸
- Flaky 治理的关键不是技术，而是文化：让团队认可"红色 = 必须立刻处理"
- Code review 时关注新增用例是否依赖时间 / 顺序 / 网络

## test-pyramid-vs-trophy
title: 测试金字塔 / 测试奖杯 怎么选
difficulty: 进阶
tags: [测试, 架构]

### 一句话
传统金字塔：单测多 + 集成中 + E2E 少；前端时代变成奖杯：**集成测试**（组件测试）才是性价比最高的——既覆盖真实场景又比 E2E 快。

### 题目
单元测试、集成测试、E2E 各应该怎么投入？前端有什么自己的特殊性？

### 答案要点
- **单元测试**：纯函数 / Hook / 工具库；快、稳定、易定位 bug；适合纯逻辑
- **集成 / 组件测试**：用 React Testing Library / Vue Test Utils 渲染真实组件树并模拟用户交互——前端核心战场
- **E2E（Playwright / Cypress）**：跑真浏览器，覆盖关键用户流程（登录 / 下单 / 支付）；慢、不稳定，控制数量
- **视觉回归**：Percy / Chromatic / Playwright snapshot，UI 重构必备
- **类型 / lint** 是免费的"零成本测试"，代价低收益高
- Kent C. Dodds 的"Testing Trophy"：静态(类型) + 单测 + **集成（最厚）** + E2E
- 经验：组件测试用 RTL 强调"按用户行为测"——不要测实现细节

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

### 延伸
- Vitest 是 Vite 项目的首选，比 Jest 快、配置简单
- 集成测试可以 mock 网络（MSW），单测 mock 函数调用
- 关键页面 E2E 跑在 CI，可视化回归差异自动评论 PR


## test-data-strategy
title: 测试数据怎么造？怎么避免脏数据互相干扰
difficulty: 进阶
tags: [测试, 数据, 高频]

### 一句话
单测用 factory 函数（`makeUser({ name: 'x' })`）按需造；集成 / E2E 用每条用例独立的"种子前缀 + 随机后缀"避免冲突；运行后回滚或单独环境；不要共用线下"测试账号"。

### 题目
你团队的 E2E 测试经常因为"昨天的数据没清"而挂；写单测又有人造一份巨大的 fixture，怎么治理？

### 答案要点
- **分层造数据**
  - 单元 / 组件测试：用 factory 函数（builder 模式），按需覆盖字段
  - 集成 / E2E：直接调 API 造数据，跑完调 API 删；不要写死 SQL
- **隔离策略**
  - 用例级别：`name = 'kap-test-' + uuid()`，跑完按前缀清理
  - suite 级别：beforeAll 造、afterAll 清
  - 环境级别：每个 PR 起独立 namespace（k8s）/ schema（db）
- **fixture 别变化石**
  - 大 JSON fixture 容易腐烂，没人敢动
  - 只放"骨架数据"，差异字段用 builder 覆盖
  - 每个测试只声明它关心的字段，其他用合理默认
- **时间相关**
  - 用 fake timer / 固定时间：`vi.setSystemTime(new Date('2024-01-01'))`
  - 不要用 `new Date()`、`Date.now()` 直接进断言
- **网络与外部依赖**
  - 单测：mock fetch 或用 MSW
  - 集成：用 testcontainers 起真实 DB / Redis
  - E2E：mock 外部第三方（支付、短信），不真实调用
- **数据库回滚**
  - 单测：每个用例事务包裹，结束 ROLLBACK
  - 集成：truncate 表 / 重置 schema
  - E2E：按前缀清理，或定期清理 job

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

### 延伸
- snapshot 测试要小，超过 50 行要警惕；只对关键 DOM 树快照
- 共享数据库环境：CI 并发跑测试时锁同一行就死锁，建议每个 worker 独立 schema

## test-async-tricks
title: 异步代码 / 定时器 / Stream 怎么测？
difficulty: 进阶
tags: [测试, 异步, 高频]

### 一句话
Promise / async 直接 `await`；setTimeout / setInterval 用 fake timer + `vi.advanceTimersByTime`；Stream 用真实流 + 收集结果再断言；DOM 异步用 `findBy*` / `waitFor`。

### 题目
怎么写出**稳定**的异步测试？带 setTimeout 的代码、流式接口、组件里的 useEffect，分别什么写法？

### 答案要点
- **Promise / async**
  - 直接 await，断言异常用 `await expect(fn()).rejects.toThrow()`
  - 不要 `setTimeout(done, 100)` 等异步，会 flaky
- **fake timer**
  - `vi.useFakeTimers()` / `jest.useFakeTimers()`
  - `vi.advanceTimersByTime(1000)` 推进时间
  - `vi.runAllTimers()` 跑完所有
  - 注意：fake timer 不会让真实 Promise 变快，需要 microtask flush（`await Promise.resolve()`）
- **DOM 异步（React Testing Library / Vue Test Utils）**
  - `findByText('xxx')`：自带 retry 直到出现或超时
  - `await waitFor(() => expect(...).toBe(...))`：自定义断言重试
  - 不要 `await sleep(100)` 后再断言，flaky
- **Stream**
  - 真实 ReadableStream：在测试里 push 已知 chunk，收集 reader 输出再断言
  - 用 web-streams-polyfill 或 Node 的 `Readable.from`
- **网络请求**
  - mock fetch：MSW（推荐，最贴近真实）
  - axios mock adapter / vi.mock('axios')
- **组件副作用**
  - useEffect 异步：`await waitFor(...)` 等 effect 跑完
  - cleanup 验证：`unmount()` 后断言副作用被清
- **常见 flaky 因素**
  - 用真定时器 + setTimeout(done, 100)
  - 测试间共享全局状态
  - 顺序依赖（用 `test.concurrent` 暴露问题）
  - 时区 / 语言：测试环境锁定 TZ='UTC' / LANG='en_US'

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

### 延伸
- Playwright 等 E2E 默认 retry，重要 case 写清等待条件
- "时间旅行"调试 flaky：本地循环跑 100 次（`vitest --repeat 100`）

## visual-regression
title: 视觉回归测试怎么做？
difficulty: 进阶
tags: [测试, 视觉, UI]

### 一句话
渲染目标组件 / 页面截图 → 与基线对比 → 像素 diff 超阈值就 fail。本地预览 diff 后人工 review，确认是有意改动则 update baseline。常用工具：Playwright `toHaveScreenshot` / Chromatic / Percy。

### 题目
组件库改了一行 CSS，哪些页面受影响很难肉眼覆盖。视觉回归怎么落地？

### 答案要点
- **核心原理**
  - 第一次跑：生成 baseline 截图存 git
  - 后续跑：对比当前渲染 vs baseline，逐像素 diff
  - 容忍：可设阈值（0.1% 像素），抗 antialiasing
- **工具选型**
  - **Playwright** 内置：`expect(page).toHaveScreenshot()`，本地友好，CI 易用
  - **Chromatic**（Storybook 公司）：每个 story 自动截图，PR 评论里看 diff
  - **Percy**（BrowserStack）：CI 服务，支持响应式、跨浏览器
  - **reg-suit / loki**：开源方案
- **稳定性技巧**
  - 锁定字体（系统字体差异会触发 diff）→ 用自托管字体
  - 锁定时间（动画 / 时钟组件）→ `await page.evaluate(() => Date.now = () => 0)`
  - 等待加载完成 → `waitForLoadState('networkidle')` + 关键元素 `waitFor`
  - 关闭动画 → 注入 `* { animation: none !important; transition: none !important; }`
  - 屏蔽随机内容（avatar、广告位）→ `mask: [page.locator('.ad')]`
- **集成 Storybook**
  - 每个 story 自动生成截图：`storybook test-runner` + Playwright
  - 多 viewport / 多主题：`@storybook/addon-themes`
- **审核 / 更新流程**
  - PR 触发 → 上传 diff 报告
  - 设计师 / FE leader review → 接受新基线（按钮 update）
  - baseline 进 git；用 LFS 防仓库暴涨
- **覆盖面**
  - 不能只测核心页面，覆盖：组件库每个 story、关键页面 5-8 张、典型边界（空 / 错误 / 长文本）
  - 响应式：mobile + desktop 至少两个 viewport
- **失败时**
  - 输出三张图：actual / expected / diff（高亮像素差异）
  - 在 PR 里贴评论方便 review

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

### 延伸
- 视觉回归不能替代功能测试，互补
- 大型组件库会自动生成几千张图，CI 时长变长 → 用 sharding 并行
- 跨浏览器（Chromium / Firefox / WebKit）渲染差异大，按平台分别管理 baseline

