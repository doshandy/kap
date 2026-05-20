import type { Category, ContentIndex, Question } from '@/types/content';

/**
 * 内容加载策略（优先级从高到低）：
 * 1) 生产环境优先读取预构建的 `public/content-cache.json`（避免首次冷启动全量 markdown 解析）
 * 2) 若静态缓存不可用，再回退到 markdown chunk 运行时解析（dev / 本地调试友好）
 * 3) 同步把解析结果写入 localStorage，降低后续启动成本
 */
const modules = import.meta.glob('/content/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const CONTENT_CACHE_KEY = 'kap-content-index-v1';
const CONTENT_CACHE_SIGNATURE_KEY = 'kap-content-signature-v1';
const CONTENT_STATIC_CACHE_URL = `${import.meta.env.BASE_URL}content-cache.json`;
const CONTENT_STATIC_CACHE_TIMEOUT_MS = 1500;
const CONTENT_STATIC_CACHE_COLD_START_TIMEOUT_MS = 5000;
const PARSE_YIELD_BATCH = 4;

let cache: ContentIndex | null = null;
let pending: Promise<ContentIndex> | null = null;
let cacheSignature = '';
let hydratedFromStorage = false;

export type ContentInitStage =
  | 'bootstrap'
  | 'fetch-static-cache'
  | 'load-static-cache'
  | 'load-markdown'
  | 'finalize';

export interface ContentInitProgress {
  stage: ContentInitStage;
  percent: number;
  message: string;
  loaded?: number;
  total?: number;
}

interface InitContentOptions {
  onProgress?: (progress: ContentInitProgress) => void;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reportProgress(
  onProgress: InitContentOptions['onProgress'],
  payload: ContentInitProgress,
): void {
  if (!onProgress) return;
  onProgress({
    ...payload,
    percent: clampPercent(payload.percent),
  });
}

function hashText(text: string, seed = 2166136261): number {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSignature(rawList: { path: string; raw: string }[]): string {
  let hash = 2166136261;
  const sorted = [...rawList].sort((a, b) => a.path.localeCompare(b.path));
  for (const item of sorted) {
    hash = hashText(item.path, hash);
    hash = hashText('\n', hash);
    hash = hashText(item.raw, hash);
    hash = hashText('\n', hash);
  }
  return `${sorted.length}:${hash.toString(16)}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isQuestionLike(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false;
  const question = value as Partial<Question>;
  return (
    typeof question.id === 'string' &&
    typeof question.categoryId === 'string' &&
    typeof question.slug === 'string' &&
    typeof question.title === 'string' &&
    typeof question.difficulty === 'string' &&
    isStringArray(question.tags) &&
    typeof question.question === 'string' &&
    typeof question.answer === 'string' &&
    typeof question.raw === 'string'
  );
}

function isCategoryLike(value: unknown): value is Category {
  if (!value || typeof value !== 'object') return false;
  const category = value as Partial<Category>;
  return (
    typeof category.id === 'string' &&
    typeof category.title === 'string' &&
    typeof category.order === 'number' &&
    typeof category.icon === 'string' &&
    Array.isArray(category.questions) &&
    category.questions.every((question) => isQuestionLike(question))
  );
}

function isCachePayload(value: unknown): value is { signature: string; categories: Category[] } {
  if (!value || typeof value !== 'object') return false;
  const payload = value as { signature?: unknown; categories?: unknown };
  return (
    typeof payload.signature === 'string' &&
    Array.isArray(payload.categories) &&
    payload.categories.every((item) => isCategoryLike(item))
  );
}

function buildIndexFromCategories(categories: Category[]): ContentIndex {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const allQuestions: Question[] = [];
  const questionMap = new Map<string, Question>();
  for (const category of sorted) {
    for (const question of category.questions) {
      allQuestions.push(question);
      questionMap.set(question.id, question);
    }
  }
  return { categories: sorted, allQuestions, questionMap };
}

function readCachedIndex(signature: string): ContentIndex | null {
  if (!canUseStorage()) return null;
  try {
    const storedSignature = window.localStorage.getItem(CONTENT_CACHE_SIGNATURE_KEY);
    if (!storedSignature || storedSignature !== signature) return null;
    const raw = window.localStorage.getItem(CONTENT_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const categoriesRaw =
      parsed && typeof parsed === 'object' && 'categories' in parsed
        ? (parsed as { categories?: unknown }).categories
        : null;
    if (!Array.isArray(categoriesRaw) || !categoriesRaw.every((item) => isCategoryLike(item))) {
      return null;
    }
    return buildIndexFromCategories(categoriesRaw as Category[]);
  } catch {
    return null;
  }
}

function readAnyCachedIndex(): { index: ContentIndex; signature: string } | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(CONTENT_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const categoriesRaw =
      parsed && typeof parsed === 'object' && 'categories' in parsed
        ? (parsed as { categories?: unknown }).categories
        : null;
    if (!Array.isArray(categoriesRaw) || !categoriesRaw.every((item) => isCategoryLike(item))) {
      return null;
    }
    return {
      index: buildIndexFromCategories(categoriesRaw as Category[]),
      signature: window.localStorage.getItem(CONTENT_CACHE_SIGNATURE_KEY) || '',
    };
  } catch {
    return null;
  }
}

function writeCachedIndex(signature: string, categories: Category[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify({ categories }));
    window.localStorage.setItem(CONTENT_CACHE_SIGNATURE_KEY, signature);
  } catch {
    // localStorage 容量不足或不可用时，忽略缓存写入即可。
  }
}

async function yieldToMainThread(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(() => resolve(), 0);
  });
}

async function loadFromStaticCache(
  onProgress?: InitContentOptions['onProgress'],
): Promise<ContentIndex | null> {
  if (import.meta.env.DEV || typeof fetch !== 'function') return null;
  const fallback = readAnyCachedIndex();
  const fallbackIndex = fallback?.index ?? null;
  if (fallback?.signature) cacheSignature = fallback.signature;
  const timeoutMs = fallbackIndex
    ? CONTENT_STATIC_CACHE_TIMEOUT_MS
    : CONTENT_STATIC_CACHE_COLD_START_TIMEOUT_MS;
  let timeoutId: number | null = null;
  try {
    reportProgress(onProgress, {
      stage: 'fetch-static-cache',
      percent: fallbackIndex ? 30 : 10,
      message: fallbackIndex ? '正在后台同步最新题库…' : '正在下载题库缓存…',
    });
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    timeoutId = controller != null ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    const response = await fetch(CONTENT_STATIC_CACHE_URL, {
      cache: 'default',
      signal: controller?.signal,
    });
    if (!response.ok) return fallbackIndex;
    reportProgress(onProgress, {
      stage: 'load-static-cache',
      percent: fallbackIndex ? 50 : 40,
      message: '题库缓存下载完成，正在校验…',
    });
    const payload: unknown = await response.json();
    if (!isCachePayload(payload)) return fallbackIndex;

    const cached = readCachedIndex(payload.signature);
    if (cached) {
      cacheSignature = payload.signature;
      reportProgress(onProgress, {
        stage: 'load-static-cache',
        percent: 90,
        message: '命中本地题库索引缓存',
      });
      return cached;
    }

    const index = buildIndexFromCategories(payload.categories);
    reportProgress(onProgress, {
      stage: 'load-static-cache',
      percent: 92,
      message: '正在写入本地题库缓存…',
    });
    writeCachedIndex(payload.signature, index.categories);
    cacheSignature = payload.signature;
    return index;
  } catch {
    return fallbackIndex;
  } finally {
    if (timeoutId != null) window.clearTimeout(timeoutId);
  }
}

async function buildIndex(onProgress?: InitContentOptions['onProgress']): Promise<ContentIndex> {
  reportProgress(onProgress, {
    stage: 'bootstrap',
    percent: 5,
    message: '准备加载题库…',
  });
  const staticIndex = await loadFromStaticCache(onProgress);
  if (staticIndex) {
    cache = staticIndex;
    hydratedFromStorage = false;
    reportProgress(onProgress, {
      stage: 'finalize',
      percent: 100,
      message: '题库加载完成',
    });
    return staticIndex;
  }

  const entries = Object.entries(modules);
  reportProgress(onProgress, {
    stage: 'load-markdown',
    percent: 18,
    message: '静态缓存不可用，正在读取题库文件…',
  });
  const rawList = await Promise.all(
    entries.map(async ([path, loader]) => ({ path, raw: await loader() })),
  );
  reportProgress(onProgress, {
    stage: 'load-markdown',
    percent: 35,
    message: '题库文件读取完成，正在校验缓存签名…',
  });
  const signature = buildSignature(rawList);
  const cachedIndex = readCachedIndex(signature);
  if (cachedIndex) {
    cacheSignature = signature;
    cache = cachedIndex;
    hydratedFromStorage = false;
    reportProgress(onProgress, {
      stage: 'finalize',
      percent: 100,
      message: '已恢复本地题库缓存',
    });
    return cachedIndex;
  }

  reportProgress(onProgress, {
    stage: 'load-markdown',
    percent: 45,
    message: '正在解析题库内容…',
    loaded: 0,
    total: rawList.length,
  });
  const parser = await import('./parseMarkdown');
  const categories: Category[] = [];
  const errors: Error[] = [];
  const parseTotal = rawList.length || 1;
  for (let index = 0; index < rawList.length; index++) {
    const { path, raw } = rawList[index];
    try {
      categories.push(parser.parseCategoryMarkdown(raw));
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      errors.push(new Error(`${path}: ${reason}`));
    }
    reportProgress(onProgress, {
      stage: 'load-markdown',
      percent: 45 + ((index + 1) / parseTotal) * 50,
      message: `正在解析题库内容（${index + 1}/${rawList.length}）…`,
      loaded: index + 1,
      total: rawList.length,
    });
    if ((index + 1) % PARSE_YIELD_BATCH === 0) {
      await yieldToMainThread();
    }
  }
  if (errors.length) {
    throw new AggregateError(errors, `[content] ${errors.length} markdown file(s) failed to parse`);
  }
  const index = buildIndexFromCategories(categories);
  reportProgress(onProgress, {
    stage: 'finalize',
    percent: 97,
    message: '正在写入本地缓存…',
  });
  writeCachedIndex(signature, index.categories);
  cacheSignature = signature;
  cache = index;
  hydratedFromStorage = false;
  reportProgress(onProgress, {
    stage: 'finalize',
    percent: 100,
    message: '题库加载完成',
  });
  return cache;
}

/**
 * 尝试同步使用本地缓存快速恢复内容索引。
 * 返回 true 代表已经有可用内容，可先渲染页面再异步做全量校验/更新。
 */
export function hydrateContentFromStorage(): boolean {
  if (cache) return true;
  const fallback = readAnyCachedIndex();
  if (!fallback) return false;
  cache = fallback.index;
  cacheSignature = fallback.signature;
  hydratedFromStorage = true;
  return true;
}

export function getContentSignature(): string {
  return cacheSignature;
}

/**
 * 异步初始化（启动期调用一次，等所有 markdown 完成解析）。
 */
export async function initContent(options?: InitContentOptions): Promise<ContentIndex> {
  if (cache && !hydratedFromStorage) return cache;
  if (pending) return pending;
  pending = buildIndex(options?.onProgress).catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}

/**
 * 同步访问（必须在 initContent() resolve 之后调用，否则抛错）。
 * 保持原有 API 兼容，避免大面积改造同步组件。
 */
export function loadContent(): ContentIndex {
  if (!cache) {
    throw new Error('[content] loadContent() called before initContent() resolved');
  }
  return cache;
}
