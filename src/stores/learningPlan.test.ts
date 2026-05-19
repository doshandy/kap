import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLearningPlanStore } from './learningPlan';

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

describe('useLearningPlanStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T00:00:00Z'));
    setActivePinia(createPinia());
    memoryLS.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('暂停时 currentDay 冻结，恢复后按暂停时长顺延', () => {
    const plan = useLearningPlanStore();
    plan.start(7, [['q1'], ['q2']]);

    expect(plan.currentDay).toBe(1);
    vi.advanceTimersByTime(2 * 86_400_000);
    expect(plan.currentDay).toBe(3);

    plan.pause();
    vi.advanceTimersByTime(3 * 86_400_000);
    expect(plan.currentDay).toBe(3);

    plan.resume();
    expect(plan.currentDay).toBe(3);
    vi.advanceTimersByTime(86_400_000);
    expect(plan.currentDay).toBe(4);
  });

  it('schedule 会按 days 归一化并去重空值', () => {
    const plan = useLearningPlanStore();
    plan.start(7, [
      ['q1', '', 'q1'],
      ['  ', 'q2'],
    ]);

    expect(plan.state.schedule).toHaveLength(7);
    expect(plan.state.schedule[0]).toEqual(['q1']);
    expect(plan.state.schedule[1]).toEqual(['q2']);
    expect(plan.state.schedule[2]).toEqual([]);

    plan.setSchedule([['x'], ['y']]);
    expect(plan.state.schedule).toHaveLength(7);
    expect(plan.state.schedule[0]).toEqual(['x']);
    expect(plan.state.schedule[1]).toEqual(['y']);
    expect(plan.state.schedule[6]).toEqual([]);
  });
});
