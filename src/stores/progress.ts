import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import type { QuestionStatus } from '@/types/content';
import { readState, writeState } from './persist';

interface ProgressRecord {
  status: QuestionStatus;
  viewedAt: number;
  reviewedTimes: number;
  /** 历史日期戳 (yyyy-mm-dd) → 完成次数（用于热力图） */
  history: Record<string, number>;
}

interface ProgressState {
  records: Record<string, ProgressRecord>;
}

const KEY = 'progress';

function defaultRecord(): ProgressRecord {
  return { status: 'todo', viewedAt: 0, reviewedTimes: 0, history: {} };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useProgressStore = defineStore('progress', () => {
  const state = reactive<ProgressState>(readState<ProgressState>(KEY, { records: {} }));

  watch(state, (v) => writeState(KEY, v), { deep: true });

  function ensure(id: string): ProgressRecord {
    if (!state.records[id]) state.records[id] = defaultRecord();
    return state.records[id];
  }

  function get(id: string): ProgressRecord {
    return state.records[id] ?? defaultRecord();
  }

  function setStatus(id: string, status: QuestionStatus): void {
    const r = ensure(id);
    r.status = status;
    r.viewedAt = Date.now();
    r.reviewedTimes += 1;
    const day = todayStr();
    r.history[day] = (r.history[day] || 0) + 1;
  }

  function reset(id: string): void {
    delete state.records[id];
  }

  const totalDone = computed(
    () => Object.values(state.records).filter((r) => r.status !== 'todo').length,
  );

  const heatmap = computed(() => {
    const map: Record<string, number> = {};
    for (const r of Object.values(state.records)) {
      for (const [d, n] of Object.entries(r.history)) {
        map[d] = (map[d] || 0) + n;
      }
    }
    return map;
  });

  function statsByCategory(allByCat: Record<string, string[]>): Record<
    string,
    { total: number; done: number; mastered: number; review: number }
  > {
    const out: Record<string, { total: number; done: number; mastered: number; review: number }> =
      {};
    for (const [cat, ids] of Object.entries(allByCat)) {
      let done = 0;
      let mastered = 0;
      let review = 0;
      for (const id of ids) {
        const r = state.records[id];
        if (!r) continue;
        if (r.status !== 'todo') done++;
        if (r.status === 'mastered') mastered++;
        if (r.status === 'review' || r.status === 'fuzzy') review++;
      }
      out[cat] = { total: ids.length, done, mastered, review };
    }
    return out;
  }

  return { state, get, setStatus, reset, totalDone, heatmap, statsByCategory };
});
