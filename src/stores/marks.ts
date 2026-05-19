import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import { readState, writeState } from './persist';

interface MarksState {
  starred: Record<string, boolean>;
  skipped: Record<string, boolean>;
  wrongReasons: Record<string, string[]>;
}

const KEY = 'marks';

export const WRONG_REASON_OPTIONS = [
  '概念不清',
  '代码不会写',
  '边界遗漏',
  '表达不顺',
  '性能/安全没答到',
] as const;

export type WrongReason = (typeof WRONG_REASON_OPTIONS)[number];

/**
 * 收藏 / 跳过 这两个独立状态，跟 progress 解耦：
 * - starred：用户标星，方便集中复习
 * - skipped：用户主动跳过，列表可隐藏
 */
export const useMarksStore = defineStore('marks', () => {
  const state = reactive<MarksState>(
    readState<MarksState>(KEY, { starred: {}, skipped: {}, wrongReasons: {} }),
  );

  watch(state, (v) => writeState(KEY, v), { deep: true });

  function isStarred(id: string): boolean {
    return !!state.starred[id];
  }
  function isSkipped(id: string): boolean {
    return !!state.skipped[id];
  }
  function toggleStar(id: string): void {
    if (state.starred[id]) delete state.starred[id];
    else state.starred[id] = true;
  }
  function toggleSkip(id: string): void {
    if (state.skipped[id]) delete state.skipped[id];
    else state.skipped[id] = true;
  }
  function wrongReasonsOf(id: string): WrongReason[] {
    return (state.wrongReasons[id] || []).filter((item): item is WrongReason =>
      WRONG_REASON_OPTIONS.includes(item as WrongReason),
    );
  }
  function hasWrongReason(id: string, reason: WrongReason): boolean {
    return wrongReasonsOf(id).includes(reason);
  }
  function toggleWrongReason(id: string, reason: WrongReason): void {
    const next = new Set(wrongReasonsOf(id));
    if (next.has(reason)) next.delete(reason);
    else next.add(reason);
    const values = [...next];
    if (values.length) state.wrongReasons[id] = values;
    else delete state.wrongReasons[id];
  }
  function clearWrongReasons(id: string): void {
    delete state.wrongReasons[id];
  }

  const starredCount = computed(() => Object.keys(state.starred).length);
  const skippedCount = computed(() => Object.keys(state.skipped).length);
  const wrongCount = computed(
    () => Object.keys(state.wrongReasons).filter((id) => wrongReasonsOf(id).length > 0).length,
  );

  function starredCountFor(ids: Iterable<string>): number {
    let total = 0;
    for (const id of new Set(ids)) {
      if (state.starred[id]) total++;
    }
    return total;
  }

  function skippedCountFor(ids: Iterable<string>): number {
    let total = 0;
    for (const id of new Set(ids)) {
      if (state.skipped[id]) total++;
    }
    return total;
  }

  function wrongCountFor(ids: Iterable<string>): number {
    let total = 0;
    for (const id of new Set(ids)) {
      if (wrongReasonsOf(id).length > 0) total++;
    }
    return total;
  }

  function pruneTo(ids: Iterable<string>): void {
    const allowed = new Set(ids);
    for (const id of Object.keys(state.starred)) {
      if (!allowed.has(id)) delete state.starred[id];
    }
    for (const id of Object.keys(state.skipped)) {
      if (!allowed.has(id)) delete state.skipped[id];
    }
    for (const id of Object.keys(state.wrongReasons)) {
      if (!allowed.has(id)) delete state.wrongReasons[id];
    }
  }

  return {
    state,
    isStarred,
    isSkipped,
    toggleStar,
    toggleSkip,
    wrongReasonsOf,
    hasWrongReason,
    toggleWrongReason,
    clearWrongReasons,
    starredCount,
    skippedCount,
    wrongCount,
    starredCountFor,
    skippedCountFor,
    wrongCountFor,
    pruneTo,
  };
});
