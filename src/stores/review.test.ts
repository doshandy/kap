import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

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

import { useReviewStore } from './review';

describe('useReviewStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T08:00:00Z'));
    setActivePinia(createPinia());
    memoryLS.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('到期题目会随时间推进自动刷新', async () => {
    const review = useReviewStore();
    review.state.items.q1 = {
      ef: 2.5,
      interval: 1,
      reps: 1,
      due: Date.now() + 30_000,
      lastReviewed: Date.now(),
    };

    expect(review.dueIds).toEqual([]);

    vi.advanceTimersByTime(60_000);
    await nextTick();

    expect(review.dueIds).toEqual(['q1']);
  });
});
