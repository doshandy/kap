import { computed } from 'vue';
import { loadContent } from '@/lib/loadContent';

const index = loadContent();

export function useContent() {
  const categories = computed(() => index.categories);
  const allQuestions = computed(() => index.allQuestions);
  return {
    categories,
    allQuestions,
    questionMap: index.questionMap,
    getCategory: (id: string) => index.categories.find((c) => c.id === id),
    getQuestion: (catId: string, slug: string) =>
      index.questionMap.get(`${catId}/${slug}`),
  };
}

export const allTags: string[] = (() => {
  const set = new Set<string>();
  for (const q of index.allQuestions) q.tags.forEach((t) => set.add(t));
  return Array.from(set).sort();
})();
