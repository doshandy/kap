import { computed } from 'vue';
import { loadContent } from '@/lib/loadContent';

/**
 * 注意：必须在 `initContent()` resolve 之后调用（main.ts 已在 mount 之前 await）。
 * 不能在模块顶层调用 loadContent()，否则模块求值会先于 initContent() 完成而抛错。
 */
export function useContent() {
  const index = loadContent();
  const categories = computed(() => index.categories);
  const allQuestions = computed(() => index.allQuestions);
  return {
    categories,
    allQuestions,
    questionMap: index.questionMap,
    getCategory: (id: string) => index.categories.find((c) => c.id === id),
    getQuestion: (catId: string, slug: string) => index.questionMap.get(`${catId}/${slug}`),
  };
}
