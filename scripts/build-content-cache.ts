import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = fileURLToPath(new URL('../content/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/content-cache.json', import.meta.url));

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
  parseCategoryMarkdown(raw: string): unknown;
};
const { parseCategoryMarkdown } = parserModule;

function hashText(text: string, seed = 2166136261): number {
  let hash = seed;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const files = readdirSync(ROOT)
  .filter((f) => f.endsWith('.md'))
  .sort();

const categories: unknown[] = [];
const parseErrors: string[] = [];
let signatureHash = 2166136261;

for (const file of files) {
  const path = join(ROOT, file);
  const raw = readFileSync(path, 'utf-8');
  signatureHash = hashText(file, signatureHash);
  signatureHash = hashText('\n', signatureHash);
  signatureHash = hashText(raw, signatureHash);
  signatureHash = hashText('\n', signatureHash);
  try {
    categories.push(parseCategoryMarkdown(raw));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    parseErrors.push(`${file}: ${reason}`);
  }
}

if (parseErrors.length) {
  console.error(`❌ 内容缓存构建失败：${parseErrors.length} 个文件解析异常`);
  for (const message of parseErrors) {
    console.error('  - ' + message);
  }
  process.exit(1);
}

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  signature: `${files.length}:${signatureHash.toString(16)}`,
  categories,
};

writeFileSync(OUT, JSON.stringify(payload), 'utf-8');
console.log(`✅ 内容缓存已生成：${files.length} 个分类 -> ${OUT}`);
