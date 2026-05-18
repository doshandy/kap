import { describe, expect, it } from 'vitest';
import { scoreAnswer } from './answerScoring';

describe('scoreAnswer', () => {
  it('空答案得到低分和改进建议', () => {
    const result = scoreAnswer('');

    expect(result.total).toBe(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('结构完整的答案得分更高', () => {
    const weak = scoreAnswer('这是一个缓存问题。');
    const strong = scoreAnswer(
      '结论：核心是缓存失效和数据一致性。第一，说明请求流程和缓存机制；第二，结合线上项目场景看命中率、错误率和回滚；第三，补充边界、异常、性能风险和替代方案取舍。最后总结监控指标。',
    );

    expect(strong.total).toBeGreaterThan(weak.total);
    expect(strong.level).not.toBe('还需重构答案');
  });
});
