import Fuse from 'fuse.js';
import { computed, ref } from 'vue';
import { useContent } from './useContent';
import type { Question } from '@/types/content';

let fuse: Fuse<Question> | null = null;

function getFuse() {
  if (fuse) return fuse;
  const { allQuestions } = useContent();
  fuse = new Fuse(allQuestions.value, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'tags', weight: 2 },
      { name: 'raw', weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  });
  return fuse;
}

export function useSearch() {
  const keyword = ref('');
  const results = computed<Question[]>(() => {
    const k = keyword.value.trim();
    if (!k) return [];
    return getFuse()
      .search(k, { limit: 30 })
      .map((r) => r.item);
  });
  return { keyword, results };
}
