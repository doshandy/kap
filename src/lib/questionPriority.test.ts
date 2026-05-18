import { describe, expect, it } from 'vitest';
import { questionPriority } from './questionPriority';
import type { Question } from '@/types/content';

function question(partial: Partial<Question> = {}): Question {
  return {
    id: '01/a',
    categoryId: '01',
    slug: 'a',
    title: 'A',
    difficulty: '基础',
    tags: [],
    question: '',
    answer: '',
    raw: '',
    ...partial,
  };
}

describe('questionPriority', () => {
  it('优先薄弱、高频、收藏和高难度题', () => {
    const base = questionPriority(question(), { status: 'todo', starred: false });
    const important = questionPriority(question({ difficulty: '资深', tags: ['高频'] }), {
      status: 'review',
      starred: true,
    });

    expect(important).toBeGreaterThan(base);
  });

  it('追问题默认低于主体题，避免计划被追问淹没', () => {
    const parent = questionPriority(question(), { status: 'todo', starred: false });
    const child = questionPriority(question({ parentId: '01/root' }), {
      status: 'todo',
      starred: false,
    });

    expect(child).toBeLessThan(parent);
  });
});
