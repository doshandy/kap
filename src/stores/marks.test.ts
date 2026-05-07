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

import { useMarksStore } from './marks';

describe('useMarksStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    memoryLS.clear();
  });

  it('toggleStar 切换并持久化', () => {
    const m = useMarksStore();
    expect(m.isStarred('q1')).toBe(false);
    m.toggleStar('q1');
    expect(m.isStarred('q1')).toBe(true);
    expect(m.starredCount).toBe(1);
    m.toggleStar('q1');
    expect(m.isStarred('q1')).toBe(false);
    expect(m.starredCount).toBe(0);
  });

  it('收藏和跳过互不影响', () => {
    const m = useMarksStore();
    m.toggleStar('q1');
    m.toggleSkip('q2');
    expect(m.starredCount).toBe(1);
    expect(m.skippedCount).toBe(1);
    expect(m.isStarred('q2')).toBe(false);
    expect(m.isSkipped('q1')).toBe(false);
  });

  it('从 localStorage 恢复 starred 状态', () => {
    memoryLS.setItem(
      'kap.v1.marks',
      JSON.stringify({ starred: { q1: true }, skipped: {} }),
    );
    const m = useMarksStore();
    expect(m.isStarred('q1')).toBe(true);
  });
});
