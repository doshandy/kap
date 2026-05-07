import Fuse from 'fuse.js';
import type { FuseResult } from 'fuse.js';
import { computed, ref } from 'vue';
import { useContent } from './useContent';
import type { Question } from '@/types/content';

let fuse: Fuse<Question> | null = null;

function getFuse() {
  if (fuse) return fuse;
  const { allQuestions } = useContent();
  fuse = new Fuse(allQuestions.value, {
    keys: [
      { name: 'title', weight: 4 },
      { name: 'tags', weight: 2 },
      { name: 'raw', weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeMatches: true,
  });
  return fuse;
}

export interface SearchHit {
  item: Question;
  matchedField: 'title' | 'tags' | 'raw';
  /** 命中片段（< 120 字），用于在面板里展示带高亮的上下文 */
  excerpt?: string;
  /** 用 <mark> 包裹关键词后的高亮 HTML */
  excerptHtml?: string;
  titleHtml?: string;
}

const HISTORY_KEY = 'kap.v1.searchHistory';
const HISTORY_MAX = 8;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushSearchHistory(keyword: string): void {
  const trimmed = keyword.trim();
  if (!trimmed || trimmed.length < 2) return;
  const old = getSearchHistory().filter((s) => s !== trimmed);
  const next = [trimmed, ...old].slice(0, HISTORY_MAX);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  );
}

function highlightFromIndices(text: string, indices: readonly [number, number][]): string {
  if (!indices.length) return escapeHtml(text);
  const segments: string[] = [];
  let cursor = 0;
  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  for (const [start, end] of sorted) {
    if (start > cursor) segments.push(escapeHtml(text.slice(cursor, start)));
    segments.push('<mark>' + escapeHtml(text.slice(start, end + 1)) + '</mark>');
    cursor = end + 1;
  }
  if (cursor < text.length) segments.push(escapeHtml(text.slice(cursor)));
  return segments.join('');
}

function makeExcerpt(raw: string, indices: readonly [number, number][]): {
  excerpt: string;
  excerptHtml: string;
} {
  if (!indices.length) {
    const head = raw.slice(0, 120);
    return { excerpt: head, excerptHtml: escapeHtml(head) };
  }
  const [s, e] = indices[0];
  const ctxLen = 50;
  const start = Math.max(0, s - ctxLen);
  const end = Math.min(raw.length, e + ctxLen);
  const slice = (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
  const offset = start > 0 ? 1 - start : -start;
  const shifted = indices
    .filter(([is, ie]) => is >= start && ie <= end)
    .map(([is, ie]) => [is + offset, ie + offset] as [number, number]);
  return {
    excerpt: slice,
    excerptHtml: highlightFromIndices(slice, shifted),
  };
}

function toHit(r: FuseResult<Question>): SearchHit {
  const matches = r.matches ?? [];
  const titleMatch = matches.find((m) => m.key === 'title');
  const tagsMatch = matches.find((m) => m.key === 'tags');
  const rawMatch = matches.find((m) => m.key === 'raw');

  let matchedField: SearchHit['matchedField'] = 'raw';
  if (titleMatch) matchedField = 'title';
  else if (tagsMatch) matchedField = 'tags';

  const titleHtml = titleMatch?.indices?.length
    ? highlightFromIndices(r.item.title, titleMatch.indices as readonly [number, number][])
    : escapeHtml(r.item.title);

  let excerpt: string | undefined;
  let excerptHtml: string | undefined;
  if (rawMatch?.indices?.length) {
    const ex = makeExcerpt(r.item.raw, rawMatch.indices as readonly [number, number][]);
    excerpt = ex.excerpt;
    excerptHtml = ex.excerptHtml;
  } else if (matchedField === 'tags') {
    excerpt = r.item.tags.join(' / ');
    excerptHtml = escapeHtml(excerpt);
  }

  return { item: r.item, matchedField, excerpt, excerptHtml, titleHtml };
}

export function useSearch() {
  const keyword = ref('');
  const hits = computed<SearchHit[]>(() => {
    const k = keyword.value.trim();
    if (!k) return [];
    return getFuse()
      .search(k, { limit: 30 })
      .map(toHit);
  });

  const results = computed<Question[]>(() => hits.value.map((h) => h.item));

  return { keyword, results, hits };
}
