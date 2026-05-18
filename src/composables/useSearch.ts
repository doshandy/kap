import type { FuseResult, default as FuseType } from 'fuse.js';
import { computed, ref } from 'vue';
import { useContent } from './useContent';
import type { Question } from '@/types/content';

let fuse: FuseType<Question> | null = null;
let fusePending: Promise<FuseType<Question>> | null = null;

/**
 * fuse.js 是搜索专属依赖（gzip 约 6KB），通过动态 import 让它仅在
 * 用户首次打开搜索面板时加载，避免进入主入口 chunk。
 */
async function ensureFuse(): Promise<FuseType<Question>> {
  if (fuse) return fuse;
  if (fusePending) return fusePending;
  fusePending = (async () => {
    const { default: Fuse } = await import('fuse.js');
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
  })().catch((e) => {
    fusePending = null;
    throw e;
  });
  return fusePending;
}

/** 由 SearchPalette 在打开时主动调用，提前预热 fuse 索引，避免首次输入卡顿 */
export function prewarmSearch(): Promise<void> {
  return ensureFuse().then(() => undefined);
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
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && !!item.trim())
      .slice(0, HISTORY_MAX);
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
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
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

function makeExcerpt(
  raw: string,
  indices: readonly [number, number][],
): {
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
  const ready = ref(!!fuse);
  const error = ref<string | null>(null);

  /**
   * 搜索结果是 computed：它会跟随 keyword 变化，但在 fuse 未就绪时输出空数组。
   * 首次输入时调度一次异步加载并把 ready 翻成 true，触发响应式重新计算。
   */
  const hits = computed<SearchHit[]>(() => {
    if (!ready.value) {
      void ensureFuse()
        .then(() => {
          error.value = null;
          ready.value = true;
        })
        .catch((e) => {
          error.value = e instanceof Error ? e.message : String(e);
        });
    }
    const k = keyword.value.trim();
    if (!k || !fuse) return [];
    return fuse.search(k, { limit: 30 }).map(toHit);
  });

  const results = computed<Question[]>(() => hits.value.map((h) => h.item));

  return { keyword, results, hits, ready, error };
}
