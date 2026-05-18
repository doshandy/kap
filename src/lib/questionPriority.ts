import type { Question } from '@/types/content';

interface PriorityContext {
  status: 'todo' | 'mastered' | 'fuzzy' | 'review';
  starred: boolean;
}

export function questionPriority(q: Question, ctx: PriorityContext): number {
  let score = 0;
  if (ctx.status === 'review' || ctx.status === 'fuzzy') score += 60;
  if (ctx.status === 'todo') score += 30;
  if (ctx.starred) score += 18;
  if (q.tags.some((tag) => /高频|核心|面试/.test(tag))) score += 14;
  if (q.difficulty === '资深') score += 10;
  if (q.difficulty === '进阶') score += 6;
  if (q.parentId) score -= 8;
  return score;
}
