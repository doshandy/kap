import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFilterStore } from '@/stores/filter';
import type { Difficulty, QuestionStatus } from '@/types/content';

export function useFilterSync() {
  const route = useRoute();
  const router = useRouter();
  const filter = useFilterStore();

  function readFromQuery() {
    const q = route.query;
    filter.state.keyword = (q.k as string) || '';
    filter.state.difficulties = q.d
      ? (String(q.d).split(',').filter(Boolean) as Difficulty[])
      : [];
    filter.state.tags = q.t ? String(q.t).split(',').filter(Boolean) : [];
    filter.state.statuses = q.s
      ? (String(q.s).split(',').filter(Boolean) as QuestionStatus[])
      : [];
  }

  function writeToQuery() {
    const q: Record<string, string> = {};
    if (filter.state.keyword) q.k = filter.state.keyword;
    if (filter.state.difficulties.length) q.d = filter.state.difficulties.join(',');
    if (filter.state.tags.length) q.t = filter.state.tags.join(',');
    if (filter.state.statuses.length) q.s = filter.state.statuses.join(',');
    router.replace({ query: q });
  }

  readFromQuery();
  watch(
    () => [
      filter.state.keyword,
      filter.state.difficulties.slice(),
      filter.state.tags.slice(),
      filter.state.statuses.slice(),
    ],
    writeToQuery,
    { deep: true },
  );
}
