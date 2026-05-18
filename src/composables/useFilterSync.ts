import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFilterStore } from '@/stores/filter';
import type { Difficulty, QuestionStatus } from '@/types/content';

const VALID_DIFFICULTIES = new Set<Difficulty>(['基础', '进阶', '资深']);
const VALID_STATUSES = new Set<QuestionStatus>(['todo', 'mastered', 'fuzzy', 'review']);

function parseList<T extends string>(value: unknown, allowed?: Set<T>): T[] {
  const items = typeof value === 'string' ? value.split(',').filter(Boolean) : [];
  return allowed ? items.filter((item): item is T => allowed.has(item as T)) : (items as T[]);
}

export function useFilterSync() {
  const route = useRoute();
  const router = useRouter();
  const filter = useFilterStore();
  let syncingFromRoute = false;

  function readFromQuery() {
    syncingFromRoute = true;
    const q = route.query;
    filter.state.keyword = (q.k as string) || '';
    filter.state.difficulties = parseList(q.d, VALID_DIFFICULTIES);
    filter.state.tags = parseList(q.t);
    filter.state.statuses = parseList(q.s, VALID_STATUSES);
    queueMicrotask(() => {
      syncingFromRoute = false;
    });
  }

  function writeToQuery() {
    if (syncingFromRoute) return;
    const q: Record<string, string> = {};
    if (filter.state.keyword) q.k = filter.state.keyword;
    if (filter.state.difficulties.length) q.d = filter.state.difficulties.join(',');
    if (filter.state.tags.length) q.t = filter.state.tags.join(',');
    if (filter.state.statuses.length) q.s = filter.state.statuses.join(',');
    if (
      q.k === route.query.k &&
      q.d === route.query.d &&
      q.t === route.query.t &&
      q.s === route.query.s
    ) {
      return;
    }
    router.replace({ query: q });
  }

  readFromQuery();
  watch(
    () => [route.params.categoryId, route.query.k, route.query.d, route.query.t, route.query.s],
    readFromQuery,
  );
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
