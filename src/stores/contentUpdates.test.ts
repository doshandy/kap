import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { buildContentFingerprint, useContentUpdatesStore } from './contentUpdates';
import type { Question } from '@/types/content';

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

const baseQuestion: Question = {
  id: '01/a',
  categoryId: '01',
  slug: 'a',
  title: 'A',
  difficulty: '基础',
  tags: ['高频'],
  question: '<p>q</p>',
  answer: '<p>a</p>',
  raw: '',
};

describe('contentUpdates', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    memoryLS.clear();
  });

  it('首访不提示更新，标记后内容变化才提示', () => {
    const store = useContentUpdatesStore();
    const first = buildContentFingerprint([baseQuestion]);
    const second = buildContentFingerprint([{ ...baseQuestion, title: 'A updated' }]);

    expect(store.hasUpdates(first)).toBe(false);
    store.markSeen(first);
    expect(store.hasUpdates(first)).toBe(false);
    expect(store.hasUpdates(second)).toBe(true);
  });
});
