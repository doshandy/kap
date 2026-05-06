import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Difficulty, FilterState, QuestionStatus } from '@/types/content';

export const useFilterStore = defineStore('filter', () => {
  const state = reactive<FilterState>({
    keyword: '',
    difficulties: [],
    tags: [],
    statuses: [],
  });

  function reset(): void {
    state.keyword = '';
    state.difficulties = [];
    state.tags = [];
    state.statuses = [];
  }

  function toggleArray<T>(arr: T[], v: T): void {
    const i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(v);
  }

  function toggleDifficulty(v: Difficulty): void {
    toggleArray(state.difficulties, v);
  }
  function toggleTag(v: string): void {
    toggleArray(state.tags, v);
  }
  function toggleStatus(v: QuestionStatus): void {
    toggleArray(state.statuses, v);
  }

  return { state, reset, toggleDifficulty, toggleTag, toggleStatus };
});
