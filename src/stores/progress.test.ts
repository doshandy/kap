import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const memoryLS = (() => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => m.set(k, v),
    removeItem: (k: string) => m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  };
})();

vi.stubGlobal('localStorage', memoryLS);

import { useProgressStore } from './progress';

describe('useProgressStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    memoryLS.clear();
  });

  it('同一状态重复设置不重复累计复习次数和热力图', () => {
    const progress = useProgressStore();
    progress.setStatus('q1', 'mastered');
    progress.setStatus('q1', 'mastered');

    const record = progress.get('q1');
    expect(record.reviewedTimes).toBe(1);
    expect(Object.values(record.history)).toEqual([1]);
  });

  it('状态变更才累计一次新的学习记录', () => {
    const progress = useProgressStore();
    progress.setStatus('q1', 'fuzzy');
    progress.setStatus('q1', 'review');

    expect(progress.get('q1').reviewedTimes).toBe(2);
  });

  it('按当前题库 ID 过滤统计，避免旧题污染总进度', () => {
    const progress = useProgressStore();
    progress.setStatus('current', 'mastered');
    progress.setStatus('removed', 'mastered');

    expect(progress.totalDone).toBe(2);
    expect(progress.totalDoneFor(['current'])).toBe(1);
    expect(Object.values(progress.heatmap).reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(
      Object.values(progress.heatmapFor(['current'])).reduce((sum, count) => sum + count, 0),
    ).toBe(1);
  });
});
