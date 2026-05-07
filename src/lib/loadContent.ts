import type { Category, ContentIndex, Question } from '@/types/content';
import { parseCategoryMarkdown } from './parseMarkdown';

/**
 * 关键性能优化：把 28 个 markdown 文件改为按需异步 chunk。
 * - 主 bundle 不再 inline 全部内容 → 体积大幅下降
 * - 启动期 main.ts 会 await `loadContent()` 一次，并行 fetch 全部分类（仍可被 PWA precache）
 * - 读取后保留同步 cache，原有 useContent() / 路由 / 搜索等同步 API 完全不需要改
 */
const modules = import.meta.glob('/content/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

let cache: ContentIndex | null = null;
let pending: Promise<ContentIndex> | null = null;

async function buildIndex(): Promise<ContentIndex> {
  const entries = Object.entries(modules);
  const rawList = await Promise.all(
    entries.map(async ([path, loader]) => ({ path, raw: await loader() })),
  );
  const categories: Category[] = [];
  for (const { path, raw } of rawList) {
    try {
      categories.push(parseCategoryMarkdown(raw));
    } catch (e) {
      console.error('[content] failed to parse', path, e);
    }
  }
  categories.sort((a, b) => a.order - b.order);
  const allQuestions: Question[] = [];
  const questionMap = new Map<string, Question>();
  for (const c of categories) {
    for (const q of c.questions) {
      allQuestions.push(q);
      questionMap.set(q.id, q);
    }
  }
  cache = { categories, allQuestions, questionMap };
  return cache;
}

/**
 * 异步初始化（启动期调用一次，等所有 markdown 完成解析）。
 */
export async function initContent(): Promise<ContentIndex> {
  if (cache) return cache;
  if (pending) return pending;
  pending = buildIndex();
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
