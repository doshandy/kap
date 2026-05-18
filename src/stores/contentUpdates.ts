import { computed, reactive, watch } from 'vue';
import { defineStore } from 'pinia';
import type { Question } from '@/types/content';
import { readState, writeState } from './persist';

interface ContentUpdatesState {
  seenFingerprint: string;
  seenAt: number;
}

const KEY = 'content-updates';

export function buildContentFingerprint(questions: Question[]): string {
  const source = questions
    .map((q) => `${q.id}|${q.title}|${q.difficulty}|${q.tags.join(',')}`)
    .sort()
    .join('\n');
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return `${questions.length}:${hash.toString(36)}`;
}

export const useContentUpdatesStore = defineStore('content-updates', () => {
  const state = reactive<ContentUpdatesState>(
    readState<ContentUpdatesState>(KEY, { seenFingerprint: '', seenAt: 0 }),
  );

  watch(state, (value) => writeState(KEY, value), { deep: true });

  const hasSeenAnyVersion = computed(() => Boolean(state.seenFingerprint));

  function hasUpdates(fingerprint: string): boolean {
    return Boolean(fingerprint && state.seenFingerprint) && state.seenFingerprint !== fingerprint;
  }

  function markSeen(fingerprint: string): void {
    state.seenFingerprint = fingerprint;
    state.seenAt = Date.now();
  }

  return { state, hasSeenAnyVersion, hasUpdates, markSeen };
});
