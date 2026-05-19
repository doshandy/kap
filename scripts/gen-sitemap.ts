import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

function normalizeBase(raw: string | undefined): string {
  const value = (raw || '/kap/').trim() || '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function normalizeSiteUrl(raw: string | undefined): string {
  const value = (raw || 'https://doshandy.github.io').trim() || 'https://doshandy.github.io';
  return value.replace(/\/+$/, '');
}

const ROOT = fileURLToPath(new URL('../content/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));
const SITE_URL = normalizeSiteUrl(process.env.VITE_SITE_URL);
const APP_BASE = normalizeBase(process.env.VITE_APP_BASE);
const SITE = `${SITE_URL}${APP_BASE === '/' ? '' : APP_BASE.slice(0, -1)}`;
const skipInvalid = process.argv.includes('--skip-invalid');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
});
const parserModule = (await import(
  new URL('../src/lib/parseMarkdown.ts', import.meta.url).href
)) as {
  parseCategoryMarkdown(raw: string): {
    id: string;
    questions: { slug: string; followupQuestionIds?: string[] }[];
  };
};
const { parseCategoryMarkdown } = parserModule;

const staticPaths = [
  '/',
  '/learn',
  '/plan',
  '/quiz',
  '/exam',
  '/review',
  '/wrong-review',
  '/weak-training',
  '/cheatsheet',
  '/marks',
  '/roadmap',
  '/interview-guide',
  '/graph',
  '/changelog',
  '/settings',
];

const files = readdirSync(ROOT)
  .filter((file) => file.endsWith('.md'))
  .sort();

const questionPaths: string[] = [];
const categoryPaths: string[] = [];
const followupChainPaths: string[] = [];
const parseErrors: string[] = [];

for (const file of files) {
  const raw = readFileSync(join(ROOT, file), 'utf-8');
  let category: {
    id: string;
    questions: { slug: string; followupQuestionIds?: string[] }[];
  } | null = null;
  try {
    category = parseCategoryMarkdown(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    parseErrors.push(`${file}: ${reason}`);
    continue;
  }
  if (!category?.id) continue;
  categoryPaths.push(`/c/${category.id}`);
  category.questions.forEach((question) => {
    questionPaths.push(`/q/${category.id}/${question.slug}`);
    if (question.followupQuestionIds?.length) {
      followupChainPaths.push(`/followup-chain/${category.id}/${question.slug}`);
    }
  });
}

if (parseErrors.length && !skipInvalid) {
  console.error('❌ sitemap 生成失败：存在无法解析的内容文件。');
  for (const message of parseErrors) {
    console.error('  - ' + message);
  }
  console.error('提示：如需容错生成，可使用 `pnpm generate:sitemap -- --skip-invalid`。');
  process.exit(1);
}

const urls = [
  ...new Set([...staticPaths, ...categoryPaths, ...questionPaths, ...followupChainPaths]),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((path) => `  <url><loc>${SITE}${path}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

writeFileSync(OUT, xml, 'utf-8');
if (parseErrors.length) {
  console.warn(`⚠ 已跳过 ${parseErrors.length} 个解析失败文件（--skip-invalid）：`);
  parseErrors.forEach((message) => console.warn('  - ' + message));
}
console.log(`✅ sitemap 已生成：${urls.length} 个 URL`);
