import { describe, expect, it, vi } from 'vitest';

class FakeURL {
  static created: { type: string; size: number }[] = [];
  static createObjectURL(b: Blob): string {
    FakeURL.created.push({ type: b.type, size: b.size });
    return 'blob:mock';
  }
  static revokeObjectURL(): void {
    // noop
  }
}

vi.stubGlobal('URL', FakeURL);

const fakeAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
  remove: vi.fn(),
};

vi.stubGlobal('document', {
  createElement: () => fakeAnchor,
  body: { appendChild: vi.fn() },
});

import {
  exportQuestionsToAnkiTSV,
  exportQuestionsToMarkdown,
} from './useExport';
import type { Question } from '@/types/content';

function fakeQ(overrides: Partial<Question> = {}): Question {
  return {
    id: 'cat/x',
    categoryId: 'cat',
    slug: 'x',
    title: '题目 X',
    difficulty: '进阶',
    tags: ['t'],
    summary: '<p>摘要</p>',
    question: '<p>Q</p>',
    answer: '<p>A 要点</p>',
    raw: '## x\ntitle: 题目 X\n\n### 题目\nQ\n\n### 答案要点\nA 要点\n',
    ...overrides,
  };
}

describe('export functions', () => {
  it('exportQuestionsToMarkdown 生成 markdown blob', () => {
    FakeURL.created.length = 0;
    exportQuestionsToMarkdown([fakeQ()], 'test.md');
    expect(FakeURL.created.length).toBe(1);
    expect(FakeURL.created[0].type).toBe('text/markdown');
    expect(fakeAnchor.download).toBe('test.md');
  });

  it('exportQuestionsToAnkiTSV 生成 tsv blob', () => {
    FakeURL.created.length = 0;
    exportQuestionsToAnkiTSV([fakeQ(), fakeQ({ id: 'cat/y', slug: 'y' })], 't.tsv');
    expect(FakeURL.created[0].type).toBe('text/tab-separated-values');
    expect(fakeAnchor.download).toBe('t.tsv');
  });
});
