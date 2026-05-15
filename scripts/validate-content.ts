import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = new URL('../content/', import.meta.url).pathname;

const errs: string[] = [];
const warns: string[] = [];

const files = readdirSync(ROOT).filter((f) => f.endsWith('.md'));
if (!files.length) {
  errs.push(`content/ 目录为空，没有任何 *.md`);
}

const VALID_DIFFICULTY = new Set(['基础', '进阶', '资深']);
const VALID_SECTIONS = new Set([
  '一句话',
  '题目',
  '答案要点',
  '代码示例',
  '常见误区',
  '追问',
  '延伸',
]);
const VALID_LANGS = new Set([
  'js',
  'javascript',
  'ts',
  'typescript',
  'jsx',
  'tsx',
  'vue',
  'html',
  'markup',
  'css',
  'scss',
  'sass',
  'less',
  'bash',
  'shell',
  'sh',
  'zsh',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'xml',
  'rust',
  'go',
  'python',
  'py',
  'java',
  'kotlin',
  'swift',
  'wgsl',
  'glsl',
  'dart',
  'svelte',
  'astro',
  'sql',
  'graphql',
  'diff',
  'plaintext',
  'text',
  'plain',
  'md',
  'markdown',
  'dockerfile',
  'nginx',
  'http',
  'mermaid',
  'env',
  'ini',
]);

const seenIds = new Set<string>();
const tagFrequency: Record<string, number> = {};
const questionsById = new Map<string, QuestionScan>();
const declaredRelations: { parentId: string; childId: string }[] = [];

interface QuestionScan {
  id: string;
  file: string;
  slug: string;
  hasTitle: boolean;
  hasQuestion: boolean;
  hasAnswer: boolean;
  difficulty?: string;
  tags: string[];
  parentId?: string;
  followupIds: string[];
  answerWordCount: number;
  hasSummary: boolean;
  codeBlocks: { lang: string; line: number }[];
  unknownSubsections: string[];
}

function parseInlineList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const match = trimmed.match(/^\[([^\]]*)\]$/);
  if (!match) return [trimmed.replace(/^['"]|['"]$/g, '')].filter(Boolean);
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function normalizeQuestionId(categoryId: string, value: string): string {
  return value.includes('/') ? value : `${categoryId}/${value}`;
}

function scanQuestions(file: string, categoryId: string, content: string): QuestionScan[] {
  const lines = content.split(/\r?\n/);
  const out: QuestionScan[] = [];
  let cur: QuestionScan | null = null;
  let curSection: string | null = null;
  let inFence = false;
  let inFenceMarker = '';

  const flush = () => {
    if (cur) out.push(cur);
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const head = ln.match(/^##\s+([a-z][a-z0-9-]*)\s*$/);
    if (head) {
      flush();
      cur = {
        id: `${categoryId}/${head[1]}`,
        file,
        slug: head[1],
        hasTitle: false,
        hasQuestion: false,
        hasAnswer: false,
        tags: [],
        followupIds: [],
        answerWordCount: 0,
        hasSummary: false,
        codeBlocks: [],
        unknownSubsections: [],
      };
      curSection = null;
      continue;
    }
    if (!cur) continue;
    if (/^title\s*:/.test(ln)) cur.hasTitle = true;
    if (/^difficulty\s*:/.test(ln)) {
      const v = ln.split(':')[1]?.trim();
      cur.difficulty = v;
    }
    if (/^tags\s*:/.test(ln)) {
      const v = ln.replace(/^tags\s*:\s*/, '').trim();
      const m = v.match(/^\[([^\]]*)\]$/);
      if (m) {
        cur.tags = m[1]
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
    }
    if (/^(parent|parentId)\s*:/.test(ln)) {
      const v = ln
        .replace(/^(parent|parentId)\s*:\s*/, '')
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (v) cur.parentId = normalizeQuestionId(categoryId, v);
    }
    if (/^(followups|followupQuestionIds)\s*:/.test(ln)) {
      const v = ln.replace(/^(followups|followupQuestionIds)\s*:\s*/, '').trim();
      cur.followupIds = parseInlineList(v).map((id) => normalizeQuestionId(categoryId, id));
    }
    const sub = ln.match(/^###\s+(\S+)/);
    if (sub) {
      const name = sub[1];
      curSection = name;
      if (!VALID_SECTIONS.has(name)) cur.unknownSubsections.push(name);
      if (name === '一句话') cur.hasSummary = true;
      if (name === '题目') cur.hasQuestion = true;
      if (name === '答案要点') cur.hasAnswer = true;
      continue;
    }
    const fence = ln.match(/^(`{3,})\s*(\S*)\s*$/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        inFenceMarker = fence[1];
        cur.codeBlocks.push({ lang: fence[2] || '', line: i + 1 });
      } else if (fence[1].length >= inFenceMarker.length && !fence[2]) {
        inFence = false;
        inFenceMarker = '';
      }
      continue;
    }
    if (curSection === '答案要点' && !inFence) {
      cur.answerWordCount += ln.replace(/\s+/g, '').length;
    }
  }
  flush();
  return out;
}

for (const f of files) {
  const raw = readFileSync(join(ROOT, f), 'utf-8');
  const { data, content } = matter(raw);
  const front = data as { id?: string; title?: string; order?: number };
  const categoryId = front.id || f.replace(/\.md$/, '');
  if (!front.id) errs.push(`${f}: frontmatter 缺少 id`);
  if (!front.title) errs.push(`${f}: frontmatter 缺少 title`);
  if (front.order == null) errs.push(`${f}: frontmatter 缺少 order`);
  if (front.id) {
    if (seenIds.has(front.id)) errs.push(`${f}: 分类 id 重复: ${front.id}`);
    seenIds.add(front.id);
  }

  const slugs = new Set<string>();
  const questions = scanQuestions(f, categoryId, content);
  for (const q of questions) {
    questionsById.set(q.id, q);
    if (slugs.has(q.slug)) errs.push(`${f}: slug 重复 → ${q.slug}`);
    slugs.add(q.slug);
    if (!q.hasTitle) errs.push(`${f}: ${q.slug} 缺少 title 元数据`);
    if (!q.hasQuestion) errs.push(`${f}: ${q.slug} 缺少 ### 题目`);
    if (!q.hasAnswer) errs.push(`${f}: ${q.slug} 缺少 ### 答案要点`);
    if (q.difficulty && !VALID_DIFFICULTY.has(q.difficulty)) {
      errs.push(`${f}: ${q.slug} difficulty 非法 → ${q.difficulty}`);
    }
    if (q.unknownSubsections.length) {
      errs.push(`${f}: ${q.slug} 出现未识别 ### 段落 → ${q.unknownSubsections.join(', ')}`);
    }
    if (q.parentId) declaredRelations.push({ parentId: q.parentId, childId: q.id });
    for (const childId of q.followupIds) {
      declaredRelations.push({ parentId: q.id, childId });
    }
    if (q.answerWordCount < 80) {
      warns.push(`${f}: ${q.slug} 答案要点字数偏少 (${q.answerWordCount} 字)，建议扩充`);
    }
    for (const cb of q.codeBlocks) {
      if (!cb.lang) {
        warns.push(`${f}: ${q.slug} 第 ${cb.line} 行代码块缺少语言标识 → \`\`\`xxx`);
      } else if (!VALID_LANGS.has(cb.lang.toLowerCase())) {
        warns.push(`${f}: ${q.slug} 第 ${cb.line} 行代码块语言未知 → ${cb.lang}`);
      }
    }
    for (const t of q.tags) {
      tagFrequency[t] = (tagFrequency[t] || 0) + 1;
    }
  }
}

const TAG_NORMALIZE_HINTS: [RegExp, string][] = [
  [/^高频题$/i, '高频'],
  [/^面试高频$/i, '高频'],
];

for (const [pattern, suggest] of TAG_NORMALIZE_HINTS) {
  for (const tag of Object.keys(tagFrequency)) {
    if (pattern.test(tag) && tag !== suggest) {
      warns.push(`tag 不规范：「${tag}」建议统一为「${suggest}」`);
    }
  }
}

for (const { parentId, childId } of declaredRelations) {
  const parent = questionsById.get(parentId);
  const child = questionsById.get(childId);
  if (!parent) {
    errs.push(`${childId}: parent/followups 指向不存在的原题 → ${parentId}`);
    continue;
  }
  if (!child) {
    errs.push(`${parent.file}: ${parent.slug} followups 指向不存在的追问题 → ${childId}`);
    continue;
  }
  if (child.parentId && child.parentId !== parentId) {
    errs.push(
      `${child.file}: ${child.slug} parent 与父题声明不一致 → ${child.parentId} != ${parentId}`,
    );
  }
  if (parent.followupIds.length && !parent.followupIds.includes(childId)) {
    warns.push(`${parent.file}: ${parent.slug} 未在 followups 中回链追问题 → ${childId}`);
  }
}

if (errs.length) {
  console.error('❌ 内容校验失败：');
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
if (warns.length && process.env.STRICT_VALIDATE) {
  console.error('⚠ 严格模式下警告即失败：');
  for (const w of warns) console.error('  - ' + w);
  process.exit(1);
}
if (warns.length) {
  console.warn(`⚠ 校验通过但有 ${warns.length} 条提示（设 STRICT_VALIDATE=1 严格模式）：`);
  warns.slice(0, 30).forEach((w) => console.warn('  - ' + w));
  if (warns.length > 30) console.warn(`  ... 另有 ${warns.length - 30} 条省略`);
}
console.log(`✅ 内容校验通过：${files.length} 个分类文件`);
