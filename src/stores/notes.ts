import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { readState, writeState } from './persist';

const KEY = 'notes';

export const useNotesStore = defineStore('notes', () => {
  const state = reactive<{ map: Record<string, string> }>(
    readState<{ map: Record<string, string> }>(KEY, { map: {} }),
  );
  watch(state, (v) => writeState(KEY, v), { deep: true });

  function get(id: string): string {
    return state.map[id] || '';
  }
  function set(id: string, content: string): void {
    if (content) state.map[id] = content;
    else delete state.map[id];
  }
  return { state, get, set };
});
