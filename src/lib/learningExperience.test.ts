import { describe, expect, it } from 'vitest';
import { preInterviewPicks, weakCategories, wrongReviewQuestions } from './learningExperience';
import type { Category, Question, QuestionStatus } from '@/types/content';
import type { LearningSignals } from './learningExperience';
import type { WrongReason } from '@/stores/marks';

function makeQuestion(categoryId: string, slug: string, title = slug): Question {
  return {
    id: `${categoryId}/${slug}`,
    categoryId,
    slug,
    title,
    difficulty: '进阶',
    tags: [],
    question: 'Q',
    answer: 'A',
    raw: `## ${slug}`,
  };
}

function createSignals(
  statuses: Record<string, QuestionStatus>,
  options: {
    skipped?: string[];
    starred?: string[];
    wrongReasons?: Record<string, WrongReason[]>;
    viewedAt?: Record<string, number>;
  } = {},
): LearningSignals {
  const skipped = new Set(options.skipped ?? []);
  const starred = new Set(options.starred ?? []);
  const wrongReasons = options.wrongReasons ?? {};
  const viewedAt = options.viewedAt ?? {};
  return {
    getStatus: (id) => statuses[id] ?? 'todo',
    getRecord: (id) => ({
      status: statuses[id] ?? 'todo',
      viewedAt: viewedAt[id] ?? 0,
      reviewedTimes: 0,
    }),
    isStarred: (id) => starred.has(id),
    isSkipped: (id) => skipped.has(id),
    wrongReasonsOf: (id) => wrongReasons[id] ?? [],
  };
}

describe('learningExperience', () => {
  it('weakCategories 会排除 skipped 题目', () => {
    const c1 = makeQuestion('c1', 'q1');
    const c2 = makeQuestion('c1', 'q2');
    const c3 = makeQuestion('c2', 'q3');
    const categories: Category[] = [
      { id: 'c1', title: 'C1', order: 1, icon: '1', questions: [c1, c2] },
      { id: 'c2', title: 'C2', order: 2, icon: '2', questions: [c3] },
    ];
    const signals = createSignals(
      {
        [c1.id]: 'review',
        [c2.id]: 'review',
        [c3.id]: 'review',
      },
      {
        skipped: [c1.id],
        wrongReasons: { [c1.id]: ['概念不清'], [c3.id]: ['表达不顺'] },
      },
    );

    const weak = weakCategories(categories, signals, 5);
    const c1Stats = weak.find((item) => item.category.id === 'c1');
    const c2Stats = weak.find((item) => item.category.id === 'c2');

    expect(c1Stats?.total).toBe(1);
    expect(c1Stats?.review).toBe(1);
    expect(c1Stats?.wrong).toBe(0);
    expect(c2Stats?.total).toBe(1);
    expect(c2Stats?.review).toBe(1);
  });

  it('wrongReviewQuestions 与 preInterviewPicks 默认排除 skipped', () => {
    const q1 = makeQuestion('c1', 'q1');
    const q2 = makeQuestion('c1', 'q2');
    const questions = [q1, q2];
    const signals = createSignals(
      {
        [q1.id]: 'review',
        [q2.id]: 'review',
      },
      {
        skipped: [q1.id],
        wrongReasons: {
          [q1.id]: ['概念不清'],
          [q2.id]: ['代码不会写'],
        },
        viewedAt: {
          [q1.id]: 200,
          [q2.id]: 100,
        },
      },
    );

    expect(wrongReviewQuestions(questions, signals).map((q) => q.id)).toEqual([q2.id]);
    expect(
      wrongReviewQuestions(questions, signals, undefined, { includeSkipped: true }).map(
        (q) => q.id,
      ),
    ).toEqual([q1.id, q2.id]);
    expect(preInterviewPicks(questions, signals, 10).map((item) => item.question.id)).toEqual([
      q2.id,
    ]);
  });
});
