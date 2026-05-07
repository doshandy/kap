import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import { readState, writeState } from './persist';

interface MarksState {
  starred: Record<string, boolean>;
  skipped: Record<string, boolean>;
}

const KEY = 'marks';

/**
 * 收藏 / 跳过 这两个独立状态，跟 progress 解耦：
 * - starred：用户标星，方便集中复习
 * - skipped：用户主动跳过，列表可隐藏
 */
export const useMarksStore = defineStore('marks', () => {
  const state = reactive<MarksState>(
    readState<MarksState>(KEY, { starred: {}, skipped: {} }),
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

  const starredCount = computed(() => Object.keys(state.starred).length);
  const skippedCount = computed(() => Object.keys(state.skipped).length);

  return {
    state,
    isStarred,
    isSkipped,
    toggleStar,
    toggleSkip,
    starredCount,
    skippedCount,
  };
});
