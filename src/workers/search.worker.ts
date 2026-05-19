/// <reference lib="webworker" />

import Fuse from 'fuse.js';

interface SearchDoc {
  id: string;
  title: string;
  tags: string[];
  raw: string;
}

interface SearchResultItem {
  id: string;
  matchedField: 'title' | 'tags' | 'raw';
  titleIndices: Array<[number, number]>;
  rawIndices: Array<[number, number]>;
}

type IncomingMessage =
  | { type: 'init'; signature: string; docs: SearchDoc[] }
  | { type: 'search'; requestId: number; keyword: string };

type OutgoingMessage =
  | { type: 'ready'; signature: string }
  | { type: 'search-result'; requestId: number; results: SearchResultItem[] }
  | { type: 'error'; requestId?: number; message: string };

let fuse: Fuse<SearchDoc> | null = null;
let currentSignature = '';
const SEARCH_CACHE_LIMIT = 80;
const queryCache = new Map<string, SearchResultItem[]>();

function cacheGet(keyword: string): SearchResultItem[] | null {
  const value = queryCache.get(keyword);
  if (!value) return null;
  queryCache.delete(keyword);
  queryCache.set(keyword, value);
  return value;
}

function cacheSet(keyword: string, results: SearchResultItem[]): void {
  queryCache.set(keyword, results);
  if (queryCache.size <= SEARCH_CACHE_LIMIT) return;
  const oldest = queryCache.keys().next().value as string | undefined;
  if (oldest) queryCache.delete(oldest);
}

function toPairs(indices: readonly [number, number][] | undefined): Array<[number, number]> {
  if (!indices?.length) return [];
  return indices.map(([start, end]) => [start, end]);
}

function post(message: OutgoingMessage): void {
  self.postMessage(message);
}

function initIndex(signature: string, docs: SearchDoc[]): void {
  fuse = new Fuse(docs, {
    keys: [
      { name: 'title', weight: 4 },
      { name: 'tags', weight: 2 },
      { name: 'raw', weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeMatches: true,
    minMatchCharLength: 2,
  });
  currentSignature = signature;
  queryCache.clear();
  post({ type: 'ready', signature });
}

function search(keyword: string): SearchResultItem[] {
  if (!fuse || !keyword.trim()) return [];
  const query = keyword.trim();
  const cached = cacheGet(query);
  if (cached) return cached;
  const results = fuse.search(query, { limit: 30 }).map((result) => {
    const matches = result.matches ?? [];
    const titleMatch = matches.find((match) => match.key === 'title');
    const rawMatch = matches.find((match) => match.key === 'raw');
    const tagsMatch = matches.find((match) => match.key === 'tags');
    const matchedField: SearchResultItem['matchedField'] = titleMatch
      ? 'title'
      : tagsMatch
        ? 'tags'
        : 'raw';
    return {
      id: result.item.id,
      matchedField,
      titleIndices: toPairs(titleMatch?.indices as readonly [number, number][] | undefined),
      rawIndices: toPairs(rawMatch?.indices as readonly [number, number][] | undefined),
    };
  });
  cacheSet(query, results);
  return results;
}

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  try {
    const payload = event.data;
    if (payload.type === 'init') {
      initIndex(payload.signature, payload.docs);
      return;
    }
    if (!fuse || !currentSignature) {
      post({ type: 'error', requestId: payload.requestId, message: '搜索索引尚未初始化' });
      return;
    }
    const results = search(payload.keyword);
    post({ type: 'search-result', requestId: payload.requestId, results });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
