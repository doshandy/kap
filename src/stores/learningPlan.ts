import { computed, reactive, watch } from 'vue';
import { defineStore } from 'pinia';
import { readState, writeState } from './persist';

interface LearningPlanState {
  days: 0 | 7 | 14 | 30;
  startedAt: number;
  pausedAt?: number;
}

const KEY = 'learning-plan';

export const useLearningPlanStore = defineStore('learning-plan', () => {
  const state = reactive<LearningPlanState>(
    readState<LearningPlanState>(KEY, { days: 0, startedAt: 0 }),
  );

  watch(state, (value) => writeState(KEY, value), { deep: true });

  const active = computed(() => state.days > 0 && !state.pausedAt);
  const currentDay = computed(() => {
    if (!state.days || !state.startedAt) return 1;
    const diff = Date.now() - state.startedAt;
    return Math.min(state.days, Math.max(1, Math.floor(diff / 86_400_000) + 1));
  });

  function start(days: 7 | 14 | 30): void {
    state.days = days;
    state.startedAt = Date.now();
    delete state.pausedAt;
  }

  function pause(): void {
    if (!state.days) return;
    state.pausedAt = Date.now();
  }

  function resume(): void {
    if (!state.pausedAt) return;
    const pausedFor = Date.now() - state.pausedAt;
    state.startedAt += pausedFor;
    delete state.pausedAt;
  }

  function clear(): void {
    state.days = 0;
    state.startedAt = 0;
    delete state.pausedAt;
  }

  return { state, active, currentDay, start, pause, resume, clear };
});
