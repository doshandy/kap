import type { default as FuseType } from 'fuse.js';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useContent } from './useContent';
import type { Question } from '@/types/content';

interface SearchDoc {
  id: string;
  title: string;
  tags: string[];
  raw: string;
}

interface SearchIndexPayload {
  version: number;
  signature: string;
  contentSignature?: string;
  docs: SearchDoc[];
}

interface WorkerSearchResult {
  id: string;
  matchedField: 'title' | 'tags' | 'raw';
  titleIndices: Array<[number, number]>;
  rawIndices: Array<[number, number]>;
}

type SearchWorkerOutgoing =
  | { type: 'ready'; signature: string }
  | { type: 'search-result'; requestId: number; results: WorkerSearchResult[] }
  | { type: 'error'; requestId?: number; message: string };

type SearchWorkerIncoming =
  | { type: 'init'; signature: string; docs: SearchDoc[] }
  | { type: 'search'; requestId: number; keyword: string };

const SEARCH_STATIC_INDEX_URL = `${import.meta.env.BASE_URL}search-index.json`;
const SEARCH_STATIC_INDEX_TIMEOUT_MS = 1500;
const SEARCH_INDEX_STORAGE_KEY = 'kap-search-index-v1';
const SEARCH_QUERY_DEBOUNCE_MS = 80;
const SEARCH_RESULT_CACHE_LIMIT = 60;

let fuse: FuseType<SearchDoc> | null = null;
let fusePending: Promise<FuseType<SearchDoc>> | null = null;
let fuseSignature = '';

let prebuiltIndexPromise: Promise<SearchIndexPayload | null> | null = null;

let searchWorker: Worker | null = null;
let workerSignature = '';
let workerReadyPromise: Promise<void> | null = null;
let workerReadyResolve: (() => void) | null = null;
let workerReadyReject: ((error: Error) => void) | null = null;
let requestSeq = 0;
const pendingWorkerRequests = new Map<
  number,
  { resolve: (results: WorkerSearchResult[]) => void; reject: (error: Error) => void }
>();
const searchResultCache = new Map<string, WorkerSearchResult[]>();

function cacheKey(signature: string, keyword: string): string {
  return `${signature}::${keyword}`;
}

function getCachedSearchResult(signature: string, keyword: string): WorkerSearchResult[] | null {
  const key = cacheKey(signature, keyword);
  const value = searchResultCache.get(key);
  if (!value) return null;
  // LRU: 命中后提升到末尾
  searchResultCache.delete(key);
  searchResultCache.set(key, value);
  return value;
}

function setCachedSearchResult(
  signature: string,
  keyword: string,
  results: WorkerSearchResult[],
): void {
  const key = cacheKey(signature, keyword);
  searchResultCache.set(key, results);
  if (searchResultCache.size <= SEARCH_RESULT_CACHE_LIMIT) return;
  const firstKey = searchResultCache.keys().next().value as string | undefined;
  if (firstKey) searchResultCache.delete(firstKey);
}

function compactSearchText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 420);
}

function hashText(text: string, seed = 2166136261): number {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function questionSignature(questions: Question[]): string {
  let hash = 2166136261;
  for (const question of questions) {
    hash = hashText(question.id, hash);
    hash = hashText(question.title, hash);
    hash = hashText(question.tags.join(','), hash);
    hash = hashText(String(question.raw.length), hash);
  }
  return `${questions.length}:${hash.toString(16)}`;
}

function buildDocs(questions: Question[]): SearchDoc[] {
  return questions.map((question) => ({
    id: question.id,
    title: question.title,
    tags: question.tags,
    raw: compactSearchText(question.raw),
  }));
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStoredSearchIndex(): SearchIndexPayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SEARCH_INDEX_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSearchIndexPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSearchIndex(payload: SearchIndexPayload): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(SEARCH_INDEX_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 忽略 localStorage 空间不足或不可用异常
  }
}

function isSearchDoc(value: unknown): value is SearchDoc {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<SearchDoc>;
  return (
    typeof doc.id === 'string' &&
    typeof doc.title === 'string' &&
    Array.isArray(doc.tags) &&
    doc.tags.every((item) => typeof item === 'string') &&
    typeof doc.raw === 'string'
  );
}

function isSearchIndexPayload(value: unknown): value is SearchIndexPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<SearchIndexPayload>;
  return (
    typeof payload.version === 'number' &&
    typeof payload.signature === 'string' &&
    (payload.contentSignature == null || typeof payload.contentSignature === 'string') &&
    Array.isArray(payload.docs) &&
    payload.docs.every((item) => isSearchDoc(item))
  );
}

async function loadPrebuiltSearchIndex(): Promise<SearchIndexPayload | null> {
  if (import.meta.env.DEV || typeof fetch !== 'function') return null;
  if (!prebuiltIndexPromise) {
    prebuiltIndexPromise = (async () => {
      let timeoutId: number | null = null;
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        timeoutId =
          controller != null
            ? window.setTimeout(() => controller.abort(), SEARCH_STATIC_INDEX_TIMEOUT_MS)
            : null;
        const response = await fetch(SEARCH_STATIC_INDEX_URL, {
          cache: 'no-cache',
          signal: controller?.signal,
        });
        if (!response.ok) return null;
        const payload: unknown = await response.json();
        if (!isSearchIndexPayload(payload)) return null;
        writeStoredSearchIndex(payload);
        return payload;
      } catch {
        return null;
      } finally {
        if (timeoutId != null) window.clearTimeout(timeoutId);
      }
    })();
  }
  const payload = await prebuiltIndexPromise;
  if (!payload) {
    prebuiltIndexPromise = null;
  }
  return payload;
}

function hasPrebuiltCoverage(docs: SearchDoc[], questions: Question[]): boolean {
  if (!docs.length || !questions.length) return false;
  const ids = new Set(docs.map((doc) => doc.id));
  return questions.every((question) => ids.has(question.id));
}

async function resolveSearchSource(
  questions: Question[],
): Promise<{ docs: SearchDoc[]; signature: string }> {
  const runtimeSignature = questionSignature(questions);
  const stored = readStoredSearchIndex();
  if (
    stored &&
    stored.contentSignature === runtimeSignature &&
    hasPrebuiltCoverage(stored.docs, questions)
  ) {
    return { docs: stored.docs, signature: `stored:${stored.signature}` };
  }

  const prebuilt = await loadPrebuiltSearchIndex();
  if (
    prebuilt &&
    prebuilt.contentSignature === runtimeSignature &&
    hasPrebuiltCoverage(prebuilt.docs, questions)
  ) {
    return { docs: prebuilt.docs, signature: `prebuilt:${prebuilt.signature}` };
  }
  return { docs: buildDocs(questions), signature: `runtime:${runtimeSignature}` };
}

async function ensureFuse(docs: SearchDoc[], signature: string): Promise<FuseType<SearchDoc>> {
  if (fuse && fuseSignature === signature) return fuse;
  if (fusePending && fuseSignature === signature) return fusePending;
  fuseSignature = signature;
  fusePending = (async () => {
    const { default: Fuse } = await import('fuse.js');
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
    return fuse;
  })().catch((error) => {
    fusePending = null;
    throw error;
  });
  return fusePending;
}

async function fallbackSearch(
  keyword: string,
  docs: SearchDoc[],
  signature: string,
): Promise<WorkerSearchResult[]> {
  const fuseInstance = await ensureFuse(docs, signature);
  return fuseInstance.search(keyword, { limit: 30 }).map((result) => {
    const matches = result.matches ?? [];
    const titleMatch = matches.find((item) => item.key === 'title');
    const rawMatch = matches.find((item) => item.key === 'raw');
    const tagsMatch = matches.find((item) => item.key === 'tags');
    const matchedField: WorkerSearchResult['matchedField'] = titleMatch
      ? 'title'
      : tagsMatch
        ? 'tags'
        : 'raw';
    return {
      id: result.item.id,
      matchedField,
      titleIndices: (titleMatch?.indices as Array<[number, number]>) || [],
      rawIndices: (rawMatch?.indices as Array<[number, number]>) || [],
    };
  });
}

function clearWorkerState(error?: Error): void {
  for (const pending of pendingWorkerRequests.values()) {
    pending.reject(error || new Error('搜索 Worker 已重置'));
  }
  pendingWorkerRequests.clear();

  if (workerReadyReject) {
    workerReadyReject(error || new Error('搜索索引初始化失败'));
  }
  workerReadyPromise = null;
  workerReadyResolve = null;
  workerReadyReject = null;

  if (searchWorker) {
    searchWorker.onmessage = null;
    searchWorker.onerror = null;
    searchWorker.terminate();
  }
  searchWorker = null;
  workerSignature = '';
}

function onWorkerMessage(event: MessageEvent<SearchWorkerOutgoing>): void {
  const message = event.data;
  if (!message) return;

  if (message.type === 'ready') {
    if (message.signature !== workerSignature) return;
    workerReadyResolve?.();
    workerReadyPromise = null;
    workerReadyResolve = null;
    workerReadyReject = null;
    return;
  }

  if (message.type === 'search-result') {
    const pending = pendingWorkerRequests.get(message.requestId);
    if (!pending) return;
    pending.resolve(message.results);
    pendingWorkerRequests.delete(message.requestId);
    return;
  }

  if (message.type === 'error') {
    if (message.requestId != null) {
      const pending = pendingWorkerRequests.get(message.requestId);
      if (pending) {
        pending.reject(new Error(message.message));
        pendingWorkerRequests.delete(message.requestId);
        return;
      }
    }
    clearWorkerState(new Error(message.message));
  }
}

function ensureWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (searchWorker) return searchWorker;
  const worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = onWorkerMessage;
  worker.onerror = (event) => {
    clearWorkerState(new Error(event.message || '搜索 Worker 运行失败'));
  };
  searchWorker = worker;
  return searchWorker;
}

async function initWorkerIndex(signature: string, docs: SearchDoc[]): Promise<void> {
  const worker = ensureWorker();
  if (!worker) return;
  if (workerSignature === signature && !workerReadyPromise) return;
  if (workerSignature === signature && workerReadyPromise) {
    await workerReadyPromise;
    return;
  }

  if (workerReadyReject) {
    workerReadyReject(new Error('搜索索引初始化已被更新请求替换'));
  }
  workerSignature = signature;
  workerReadyPromise = new Promise<void>((resolve, reject) => {
    workerReadyResolve = resolve;
    workerReadyReject = reject;
  });
  const payload: SearchWorkerIncoming = { type: 'init', signature, docs };
  worker.postMessage(payload);
  await workerReadyPromise;
}

async function searchByWorker(
  keyword: string,
  signature: string,
  docs: SearchDoc[],
): Promise<WorkerSearchResult[]> {
  const worker = ensureWorker();
  if (!worker) throw new Error('当前环境不支持搜索 Worker');
  await initWorkerIndex(signature, docs);
  return new Promise<WorkerSearchResult[]>((resolve, reject) => {
    const requestId = ++requestSeq;
    pendingWorkerRequests.set(requestId, { resolve, reject });
    const payload: SearchWorkerIncoming = { type: 'search', requestId, keyword };
    worker.postMessage(payload);
  });
}

/** 提前预热搜索索引，避免首次输入卡顿 */
export async function prewarmSearch(): Promise<void> {
  const { allQuestions } = useContent();
  const { docs, signature } = await resolveSearchSource(allQuestions.value);
  if (ensureWorker()) {
    await initWorkerIndex(signature, docs);
    return;
  }
  await ensureFuse(docs, signature);
}

export interface SearchHit {
  item: Question;
  matchedField: 'title' | 'tags' | 'raw';
  excerpt?: string;
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
  const old = getSearchHistory().filter((item) => item !== trimmed);
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

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
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
): { excerpt: string; excerptHtml: string } {
  if (!indices.length) {
    const head = raw.slice(0, 120);
    return { excerpt: head, excerptHtml: escapeHtml(head) };
  }
  const [startIndex, endIndex] = indices[0];
  const contextLength = 50;
  const start = Math.max(0, startIndex - contextLength);
  const end = Math.min(raw.length, endIndex + contextLength);
  const slice = (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
  const offset = start > 0 ? 1 - start : -start;
  const shifted = indices
    .filter(([itemStart, itemEnd]) => itemStart >= start && itemEnd <= end)
    .map(([itemStart, itemEnd]) => [itemStart + offset, itemEnd + offset] as [number, number]);
  return {
    excerpt: slice,
    excerptHtml: highlightFromIndices(slice, shifted),
  };
}

function toHit(question: Question, result: WorkerSearchResult, rawSource?: string): SearchHit {
  const titleHtml = result.titleIndices.length
    ? highlightFromIndices(question.title, result.titleIndices)
    : escapeHtml(question.title);

  let excerpt: string | undefined;
  let excerptHtml: string | undefined;
  if (result.rawIndices.length) {
    const compactRaw = rawSource || compactSearchText(question.raw);
    const value = makeExcerpt(compactRaw, result.rawIndices);
    excerpt = value.excerpt;
    excerptHtml = value.excerptHtml;
  } else if (result.matchedField === 'tags') {
    excerpt = question.tags.join(' / ');
    excerptHtml = escapeHtml(excerpt);
  }

  return {
    item: question,
    matchedField: result.matchedField,
    excerpt,
    excerptHtml,
    titleHtml,
  };
}

export function useSearch() {
  const { allQuestions, questionMap } = useContent();
  const keyword = ref('');
  const debouncedKeyword = ref('');
  const ready = ref(Boolean(fuse || searchWorker));
  const error = ref<string | null>(null);
  const hitsState = ref<SearchHit[]>([]);
  const runtimeSignature = computed(() => questionSignature(allQuestions.value));
  const docsState = ref<SearchDoc[]>([]);
  const docsById = computed(() => new Map(docsState.value.map((doc) => [doc.id, doc])));
  const signatureState = ref('');
  let debounceTimer: number | null = null;
  let sourceTaskId = 0;
  let activeTaskId = 0;

  watch(
    keyword,
    (value) => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debouncedKeyword.value = value;
        debounceTimer = null;
      }, SEARCH_QUERY_DEBOUNCE_MS);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    if (debounceTimer != null) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  });

  watch(
    runtimeSignature,
    async () => {
      const taskId = ++sourceTaskId;
      searchResultCache.clear();
      const questions = allQuestions.value;
      const currentRuntimeSignature = questionSignature(questions);
      const stored = readStoredSearchIndex();
      if (
        stored &&
        stored.contentSignature === currentRuntimeSignature &&
        hasPrebuiltCoverage(stored.docs, questions)
      ) {
        docsState.value = stored.docs;
        signatureState.value = `stored:${stored.signature}`;
      } else {
        docsState.value = buildDocs(questions);
        signatureState.value = `runtime:${currentRuntimeSignature}`;
      }
      ready.value = true;

      const prebuilt = await loadPrebuiltSearchIndex();
      if (taskId !== sourceTaskId) return;
      if (
        !prebuilt ||
        prebuilt.contentSignature !== currentRuntimeSignature ||
        !hasPrebuiltCoverage(prebuilt.docs, questions)
      ) {
        return;
      }
      docsState.value = prebuilt.docs;
      signatureState.value = `prebuilt:${prebuilt.signature}`;
    },
    { immediate: true },
  );

  watch(
    () => [debouncedKeyword.value, signatureState.value] as const,
    async ([rawKeyword, currentSignature]) => {
      const taskId = ++activeTaskId;
      const query = rawKeyword.trim();
      const activeDocs = docsState.value;
      if (!query || !currentSignature || !activeDocs.length) {
        hitsState.value = [];
        error.value = null;
        return;
      }

      const mapResultsToHits = (results: WorkerSearchResult[]): SearchHit[] =>
        results
          .map((result) => {
            const question = questionMap.get(result.id);
            const rawSource = docsById.value.get(result.id)?.raw;
            return question ? toHit(question, result, rawSource) : null;
          })
          .filter((item): item is SearchHit => Boolean(item));

      const cachedResults = getCachedSearchResult(currentSignature, query);
      if (cachedResults) {
        hitsState.value = mapResultsToHits(cachedResults);
        error.value = null;
        ready.value = true;
        return;
      }

      try {
        const workerResults = ensureWorker()
          ? await searchByWorker(query, currentSignature, activeDocs)
          : await fallbackSearch(query, activeDocs, currentSignature);
        if (taskId !== activeTaskId) return;
        setCachedSearchResult(currentSignature, query, workerResults);
        hitsState.value = mapResultsToHits(workerResults);
        ready.value = true;
        error.value = null;
      } catch (workerError) {
        if (taskId !== activeTaskId) return;
        try {
          const fallbackResults = await fallbackSearch(query, activeDocs, currentSignature);
          if (taskId !== activeTaskId) return;
          setCachedSearchResult(currentSignature, query, fallbackResults);
          hitsState.value = mapResultsToHits(fallbackResults);
          ready.value = true;
          error.value = null;
        } catch (fallbackError) {
          if (taskId !== activeTaskId) return;
          hitsState.value = [];
          const fallbackMessage =
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          const workerMessage =
            workerError instanceof Error ? workerError.message : String(workerError);
          error.value = `${fallbackMessage}（worker: ${workerMessage}）`;
        }
      }
    },
    { immediate: true },
  );

  const hits = computed(() => hitsState.value);
  const results = computed(() => hitsState.value.map((hit) => hit.item));

  return { keyword, results, hits, ready, error };
}
