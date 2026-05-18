import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
import { readState, writeState } from './persist';

const KEY = 'settings';

export type Theme = 'light' | 'dark' | 'auto';

interface SettingsState {
  theme: Theme;
  shortcutsEnabled: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  showAnswerByDefault: boolean;
}

export const useSettingsStore = defineStore('settings', () => {
  const state = reactive<SettingsState>(
    readState<SettingsState>(KEY, {
      theme: 'auto',
      shortcutsEnabled: true,
      fontSize: 'md',
      showAnswerByDefault: false,
    }),
  );
  watch(
    state,
    (v) => {
      writeState(KEY, v);
      if (typeof document !== 'undefined') applyTheme();
    },
    { deep: true },
  );

  function applyTheme(): void {
    const root = document.documentElement;
    const useDark =
      state.theme === 'dark' ||
      (state.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', useDark);
    root.dataset.fontSize = state.fontSize;
  }
  function toggleTheme(): void {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = next;
    applyTheme();
  }
  function setTheme(t: Theme): void {
    state.theme = t;
    applyTheme();
  }
  return { state, applyTheme, toggleTheme, setTheme };
});
