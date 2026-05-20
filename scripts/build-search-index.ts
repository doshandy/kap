import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import prettier from 'prettier';

const ROOT = fileURLToPath(new URL('../content/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/search-index.json', import.meta.url));

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
});

type ParsedCategory = {
  questions: Array<{ id: string; title: string; tags: string[]; raw: string }>;
};

const parserModule = (await import(
  new URL('../src/lib/parseMarkdown.ts', import.meta.url).href
)) as {
  parseCategoryMarkdown(raw: string): ParsedCategory;
};
const { parseCategoryMarkdown } = parserModule;

interface SearchDoc {
  id: string;
  title: string;
  tags: string[];
  raw: string;
}

interface SearchQuestionFingerprint {
  id: string;
  title: string;
  tags: string[];
  rawLength: number;
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

function buildSignature(docs: SearchDoc[]): string {
  let hash = 2166136261;
  for (const doc of docs) {
    hash = hashText(doc.id, hash);
    hash = hashText('\n', hash);
    hash = hashText(doc.title, hash);
    hash = hashText('\n', hash);
    hash = hashText(doc.tags.join(','), hash);
    hash = hashText('\n', hash);
    hash = hashText(doc.raw, hash);
    hash = hashText('\n', hash);
  }
  return `${docs.length}:${hash.toString(16)}`;
}

function buildContentSignature(questions: SearchQuestionFingerprint[]): string {
  let hash = 2166136261;
  for (const question of questions) {
    hash = hashText(question.id, hash);
    hash = hashText(question.title, hash);
    hash = hashText(question.tags.join(','), hash);
    hash = hashText(String(question.rawLength), hash);
  }
  return `${questions.length}:${hash.toString(16)}`;
}

const files = readdirSync(ROOT)
  .filter((file) => file.endsWith('.md'))
  .sort();

const docs: SearchDoc[] = [];
const fingerprints: SearchQuestionFingerprint[] = [];
const parseErrors: string[] = [];

for (const file of files) {
  const raw = readFileSync(join(ROOT, file), 'utf-8');
  try {
    const category = parseCategoryMarkdown(raw);
    for (const question of category.questions) {
      docs.push({
        id: question.id,
        title: question.title,
        tags: question.tags,
        raw: compactSearchText(question.raw),
      });
      fingerprints.push({
        id: question.id,
        title: question.title,
        tags: question.tags,
        rawLength: question.raw.length,
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    parseErrors.push(`${file}: ${reason}`);
  }
}

if (parseErrors.length) {
  console.error(`❌ 搜索索引构建失败：${parseErrors.length} 个文件解析异常`);
  for (const message of parseErrors) {
    console.error('  - ' + message);
  }
  process.exit(1);
}

const payload = {
  version: 2,
  signature: buildSignature(docs),
  contentSignature: buildContentSignature(fingerprints),
  docs,
};

const formatted = await prettier.format(JSON.stringify(payload), { parser: 'json' });
writeFileSync(OUT, formatted, 'utf-8');
console.log(`✅ 搜索索引已生成：${docs.length} 道题 -> ${OUT}`);
