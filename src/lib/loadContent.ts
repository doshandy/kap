import type { Category, ContentIndex, Question } from '@/types/content';
import { parseCategoryMarkdown } from './parseMarkdown';

const modules = import.meta.glob('/content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let cache: ContentIndex | null = null;

export function loadContent(): ContentIndex {
  if (cache) return cache;
  const categories: Category[] = [];
  for (const [path, raw] of Object.entries(modules)) {
    try {
      categories.push(parseCategoryMarkdown(raw));
    } catch (e) {
      console.error('[content] failed to parse', path, e);
    }
  }
  categories.sort((a, b) => a.order - b.order);
  const allQuestions: Question[] = [];
  const questionMap = new Map<string, Question>();
  for (const c of categories) {
    for (const q of c.questions) {
      allQuestions.push(q);
      questionMap.set(q.id, q);
    }
  }
  cache = { categories, allQuestions, questionMap };
  return cache;
}
