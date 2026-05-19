import { computed, onScopeDispose, reactive, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { readState, writeState } from './persist';

interface LearningPlanState {
  days: 0 | 7 | 14 | 30;
  startedAt: number;
  pausedAt?: number;
  schedule: string[][];
}

const KEY = 'learning-plan';

export const useLearningPlanStore = defineStore('learning-plan', () => {
  const state = reactive<LearningPlanState>(
    readState<LearningPlanState>(KEY, { days: 0, startedAt: 0, schedule: [] }),
  );
  const now = ref(Date.now());
  const timer = setInterval(() => {
    now.value = Date.now();
  }, 60_000);

  onScopeDispose(() => {
    clearInterval(timer);
  });

  watch(state, (value) => writeState(KEY, value), { deep: true });

  const active = computed(() => state.days > 0 && !state.pausedAt);
  const currentDay = computed(() => {
    if (!state.days || !state.startedAt) return 1;
    const diff = (state.pausedAt ?? now.value) - state.startedAt;
    return Math.min(state.days, Math.max(1, Math.floor(diff / 86_400_000) + 1));
  });

  function normalizeSchedule(days: number, schedule: string[][]): string[][] {
    if (!days) return [];
    return Array.from({ length: days }, (_, index) => {
      const day = schedule[index];
      if (!Array.isArray(day)) return [];
      return [
        ...new Set(
          day.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
        ),
      ];
    });
  }

  function start(days: 7 | 14 | 30, schedule: string[][] = []): void {
    now.value = Date.now();
    state.days = days;
    state.startedAt = now.value;
    state.schedule = normalizeSchedule(days, schedule);
    delete state.pausedAt;
  }

  function pause(): void {
    if (!state.days) return;
    now.value = Date.now();
    state.pausedAt = now.value;
  }

  function resume(): void {
    if (!state.pausedAt) return;
    now.value = Date.now();
    const pausedFor = now.value - state.pausedAt;
    state.startedAt += pausedFor;
    delete state.pausedAt;
  }

  function setSchedule(schedule: string[][]): void {
    state.schedule = normalizeSchedule(state.days, schedule);
  }

  function clear(): void {
    now.value = Date.now();
    state.days = 0;
    state.startedAt = 0;
    state.schedule = [];
    delete state.pausedAt;
  }

  return { state, active, currentDay, start, pause, resume, setSchedule, clear };
});
