import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { readState, writeState } from './persist';

/** SM-2 简化版状态 */
interface ReviewItem {
  ef: number;
  interval: number;
  reps: number;
  due: number;
  lastReviewed: number;
}

type Quality = 0 | 1 | 2; // 0 忘了 / 1 模糊 / 2 记得

const KEY = 'review';
const DAY = 86400_000;

function defaultItem(): ReviewItem {
  return {
    ef: 2.5,
    interval: 0,
    reps: 0,
    due: Date.now(),
    lastReviewed: 0,
  };
}

function update(item: ReviewItem, q: Quality): ReviewItem {
  let { ef, interval, reps } = item;
  if (q === 0) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = q === 2 ? 3 : 2;
    else interval = Math.round(interval * ef);
    const qScore = q === 2 ? 5 : 3;
    ef = Math.max(1.3, ef + (0.1 - (5 - qScore) * (0.08 + (5 - qScore) * 0.02)));
  }
  const now = Date.now();
  return {
    ef,
    interval,
    reps,
    due: now + interval * DAY,
    lastReviewed: now,
  };
}

export const useReviewStore = defineStore('review', () => {
  const state = reactive<{ items: Record<string, ReviewItem> }>(
    readState<{ items: Record<string, ReviewItem> }>(KEY, { items: {} }),
  );
  const now = ref(Date.now());
  if (typeof window !== 'undefined') {
    window.setInterval(() => {
      now.value = Date.now();
    }, 60_000);
  }
  watch(state, (v) => writeState(KEY, v), { deep: true });

  function rate(id: string, q: Quality): void {
    const cur = state.items[id] || defaultItem();
    state.items[id] = update(cur, q);
  }

  /**
   * 手动标记“需复习/模糊”时，应该立即进入待处理队列，
   * 以避免“状态已改但首页待复习仍为 0”的语义割裂。
   */
  function queueNow(id: string, q: Quality): void {
    const cur = state.items[id] || defaultItem();
    const next = update(cur, q);
    next.due = Date.now();
    state.items[id] = next;
  }

  function remove(id: string): void {
    delete state.items[id];
  }

  const dueIds = computed(() => {
    return Object.entries(state.items)
      .filter(([, v]) => v.due <= now.value)
      .sort((a, b) => a[1].due - b[1].due)
      .map(([k]) => k);
  });

  function dueIdsFor(ids: Iterable<string>): string[] {
    const allowed = new Set(ids);
    return Object.entries(state.items)
      .filter(([id, item]) => allowed.has(id) && item.due <= now.value)
      .sort((a, b) => a[1].due - b[1].due)
      .map(([id]) => id);
  }

  return { state, rate, queueNow, remove, dueIds, dueIdsFor };
});
