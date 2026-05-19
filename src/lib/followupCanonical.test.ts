import { beforeAll, describe, expect, it } from 'vitest';

let canonicalizeFollowupQuestionPattern: (pattern: string) => string;

beforeAll(async () => {
  const modulePath = '../../scripts/shared/' + 'followupCanonical.ts';
  const mod = (await import(modulePath)) as {
    canonicalizeFollowupQuestionPattern: typeof canonicalizeFollowupQuestionPattern;
  };
  canonicalizeFollowupQuestionPattern = mod.canonicalizeFollowupQuestionPattern;
});

describe('canonicalizeFollowupQuestionPattern', () => {
  it('normalizes performance variants to one canonical pattern', () => {
    const input = '围绕「X」做性能排查时，你会优先看哪些核心指标与分位数据';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '你会先看哪些指标来判断「X」是不是当前性能瓶颈',
    );
  });

  it('normalizes rollout variants to rollout canonical pattern', () => {
    const input = '结合真实业务约束，在「X」落地过程中，你会如何设计发布开关和故障回退策略';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '推动「X」落地时，你会如何设计灰度、回滚和迁移路径',
    );
  });

  it('strips wrapper prefixes before matching map keys', () => {
    const input = '在当前团队与业务约束下，围绕「X」做方案评审时，哪些边界输入最容易导致结论失真';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '把「X」放到真实项目时，最容易忽略的边界条件和前置约束是什么',
    );
  });

  it('normalizes security boundary variants', () => {
    const input = '当「X」进入生产环境，你会如何设计信任边界并安排服务端兜底策略';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果把「X」放到真实业务里，你会怎么划分信任边界和服务端兜底',
    );
  });

  it('normalizes CI layered-testing variants', () => {
    const input = '这类测试在 CI 中如何分层运行，兼顾速度和信心';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '针对「X」，你会优先补哪些边界用例和回归用例',
    );
  });

  it('normalizes staged-rollout team mismatch variants', () => {
    const input = '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进「X」';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进',
    );
  });

  it('normalizes colloquial staged-rollout wording', () => {
    const input =
      '团队里有人熟有人新时，你会怎么围绕发布链路把「X」拆成几段推进，确保每段都能独立验收';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进',
    );
  });

  it('normalizes colloquial testing-coupling variants', () => {
    const input = '测试怎么写才能不绑死实现细节，避免重构时误报一片';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如何避免测试过度耦合实现细节，导致重构时大量误报',
    );
  });

  it('normalizes maintenance-metrics colloquial variants', () => {
    const input = '要判断「X」值不值得长期维护，你会先盯哪些和发布链路相关的核心指标';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '你会用哪些指标判断这个工程方案长期值得维护',
    );
  });

  it('normalizes focus-term performance-priority variants', () => {
    const input = '为了定位「X」在渲染链路上的瓶颈优先级，你会先拉哪些观测指标作为依据';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '你会先看哪些指标来判断「X」是不是当前性能瓶颈',
    );
  });

  it('normalizes online-stability logs variants', () => {
    const input = '如果要在线上证明「X」稳定，你会优先看哪些和发布链路相关的日志与指标';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果要在线上证明这个方案稳定，你会看哪些日志和指标',
    );
  });

  it('normalizes reprioritize variants with focus term', () => {
    const input = '当需求规模、团队资源或兼容性要求变化时，你会如何围绕发布链路重排「X」方案优先级';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '当需求规模、团队资源或兼容性要求变化时，你会如何重排方案优先级',
    );
  });

  it('normalizes team-capability split variants with focus term', () => {
    const input = '面对团队能力差异，你会如何围绕发布链路把「X」拆成可并行推进的小阶段';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进',
    );
  });

  it('normalizes react tradeoff wording with focus term', () => {
    const input = '它和服务端数据缓存、并发渲染或状态边界拆分之间有什么取舍';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '它和常见替代方案相比，适合什么团队规模和业务复杂度',
    );
  });

  it('normalizes compatibility-gate wording with focus term', () => {
    const input = '当「X」在发布链路优化上可能影响兼容性时，你会如何设定推进与回退门槛';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做',
    );
  });

  it('normalizes security-review wording with focus term', () => {
    const input = '如果要评审「X」在鉴权链路维度的安全方案，你会如何划分客户端与服务端责任边界';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(
      '如果把「X」放到真实业务里，你会怎么划分信任边界和服务端兜底',
    );
  });

  it('keeps unmatched patterns unchanged', () => {
    const input = '你会如何规划这个方案的沟通节奏';
    expect(canonicalizeFollowupQuestionPattern(input)).toBe(input);
  });
});
