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
    .map((q) =>
      [
        q.id,
        q.title,
        q.difficulty,
        q.tags.join(','),
        q.parentId || '',
        (q.followupQuestionIds || []).join(','),
        (q.relatedQuestionIds || []).join(','),
        compactText(q.summary),
        compactText(q.question),
        compactText(q.answer),
        compactText(q.code),
        compactText(q.pitfall),
        compactText(q.followup),
        compactText(q.extra),
      ].join('|'),
    )
    .sort()
    .join('\n');
  let hash = 0;
  let hash2 = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    hash2 ^= source.charCodeAt(i);
    hash2 = Math.imul(hash2, 16777619) >>> 0;
  }
  return `${questions.length}:${hash.toString(36)}:${hash2.toString(36)}`;
}

function compactText(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
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
