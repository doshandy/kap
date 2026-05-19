import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
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

    expect(progress.totalLearned).toBe(2);
    expect(progress.totalDone).toBe(2);
    expect(progress.totalLearnedFor(['current'])).toBe(1);
    expect(progress.totalDoneFor(['current'])).toBe(1);
    expect(Object.values(progress.heatmap).reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(
      Object.values(progress.heatmapFor(['current'])).reduce((sum, count) => sum + count, 0),
    ).toBe(1);
  });

  it('statsByCategory 同时返回 learned 与兼容 done', () => {
    const progress = useProgressStore();
    progress.setStatus('cat/a', 'review');
    progress.setStatus('cat/b', 'mastered');
    const stats = progress.statsByCategory({ cat: ['cat/a', 'cat/b', 'cat/c'] });
    expect(stats.cat.learned).toBe(2);
    expect(stats.cat.done).toBe(2);
    expect(stats.cat.mastered).toBe(1);
    expect(stats.cat.review).toBe(1);
  });

  it('markViewed 记录浏览时间，并按间隔写入 view 事件', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const progress = useProgressStore();

    progress.markViewed('q1', '题目详情');
    const first = progress.get('q1');
    const firstViewedAt = first.viewedAt;
    expect(first.viewedAt).toBeGreaterThan(0);
    expect(first.events?.[0]?.type).toBe('view');
    expect(first.events?.[0]?.detail).toBe('题目详情');

    vi.setSystemTime(new Date(first.viewedAt + 5_000));
    progress.markViewed('q1', '题目详情');
    const second = progress.get('q1');
    expect(second.viewedAt).toBe(firstViewedAt);
    expect(second.events?.length).toBe(1);

    vi.setSystemTime(new Date(firstViewedAt + 31 * 60_000));
    progress.markViewed('q1', '题目详情');
    const third = progress.get('q1');
    expect(third.viewedAt).toBeGreaterThan(firstViewedAt);
    expect(third.events?.length).toBe(2);
  });
});
