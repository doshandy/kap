import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';
import { normalizeQuestionId } from './shared/questionId';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import {
  BANNED_TEMPLATE_PHRASES,
  FOLLOWUP_ACTION_KEYWORDS,
  FOLLOWUP_RISK_KEYWORDS,
  FOLLOWUP_VERIFY_KEYWORDS,
  containsAnyKeyword,
  jaccardSimilarity,
  normalizeQualityText,
} from './shared/answerQuality';

const ROOT = fileURLToPath(new URL('../content/', import.meta.url));
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
const contentParserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  DEFAULT_SECTION_NAMES: readonly string[];
  parseInlineList(value: string): string[];
  readMeta(metaText: string, key: string): string | undefined;
  splitQuestionBlocks(
    content: string,
    sectionNames?: readonly string[],
  ): {
    before: string;
    blocks: ContentQuestionBlockLike[];
  };
};
const { DEFAULT_SECTION_NAMES, parseInlineList, readMeta, splitQuestionBlocks } =
  contentParserModule;

const errs: string[] = [];
const warns: string[] = [];
const { onlyFile } = parseCommonScriptArgs(process.argv.slice(2));

const files = readdirSync(ROOT)
  .filter((f) => f.endsWith('.md'))
  .sort();
let selectedFiles: string[] = files;
try {
  selectedFiles = resolveOnlyContentFiles(files, onlyFile);
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`❌ 内容校验失败：${reason}`);
  process.exit(1);
}
const selectedSet = onlyFile ? new Set(selectedFiles) : null;
if (!files.length) {
  errs.push(`content/ 目录为空，没有任何 *.md`);
}

function shouldReportMessage(message: string): boolean {
  if (!selectedSet) return true;
  const fileMatch = message.match(/^([^:]+\.md):/);
  if (!fileMatch) return true;
  return selectedSet.has(fileMatch[1]);
}

const VALID_DIFFICULTY = new Set(['基础', '进阶', '资深']);
const VALID_SECTIONS = new Set<string>(DEFAULT_SECTION_NAMES);
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
  'wit',
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

const BROKEN_TEXT_PATTERNS: { pattern: RegExp; hint: string }[] = [
  { pattern: /如\s*）/, hint: '示例内容缺失，例如「如 `T extends ...`）」' },
  { pattern: /默认值（）/, hint: '默认值示例缺失' },
  { pattern: /Pick>/, hint: '类型示例疑似被 Markdown 吞掉尖括号' },
  { pattern: /200KB-）/, hint: '数值范围残缺' },
  { pattern: /在 \/ 上加 integrity/, hint: 'HTML 标签名缺失' },
  { pattern: /→\s*，/, hint: '实体渲染示例缺失' },
  { pattern: /\*\*proto\*\*/, hint: '__proto__ 被错误转成加粗文本' },
  { pattern: /\$\{\*\*STAGE\*\*\}/, hint: '模板变量被错误转义' },
  { pattern: /…[。；]$/, hint: '句尾省略号疑似生成截断，请补全或删除省略号' },
];

const TEMPLATE_PHRASES = [
  '先把追问落回原题',
  '结合原题答案中的关键点',
  '回答时最好给一个真实项目语境',
  '如果这些条件不满足，应说明替代方案',
  '验证上至少包含边界输入',
  '发布上建议用灰度',
  '取舍上不要说“最佳实践”',
  '至少准备一个可验证动作',
  '最后主动比较替代方案',
];

const seenIds = new Set<string>();
const seenOrders = new Map<number, string>();
const tagFrequency: Record<string, number> = {};
const questionsById = new Map<string, QuestionScan>();
const declaredRelations: { parentId: string; childId: string }[] = [];

interface QuestionScan {
  id: string;
  file: string;
  slug: string;
  title: string;
  questionText: string;
  answerText: string;
  hasTitle: boolean;
  hasQuestion: boolean;
  hasAnswer: boolean;
  difficulty?: string;
  tags: string[];
  parentId?: string;
  followupIds: string[];
  linkIds: string[];
  answerWordCount: number;
  answerBulletLines: string[];
  hasSummary: boolean;
  codeBlocks: { lang: string; line: number }[];
  unknownSubsections: string[];
  duplicateSubsections: string[];
  misplacedMeta: { key: string; line: number }[];
  emptySections: string[];
  unclosedFenceLine?: number;
}

interface ContentQuestionBlockLike {
  slug: string;
  raw: string;
  metaText: string;
  sections: Record<string, string>;
}

interface BlockSectionHeading {
  name: string;
  line: number;
  lineIndex: number;
}

function normalizeMetaValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function isInlineArrayLiteral(value: string | undefined): boolean {
  return typeof value === 'string' && /^\[[^\]]*\]$/.test(value.trim());
}

function blockStartLine(
  content: string,
  blockRaw: string,
  cursor: number,
): { line: number; cursor: number } {
  const start = content.indexOf(blockRaw, cursor);
  const safeStart = start >= 0 ? start : cursor;
  const line = content.slice(0, safeStart).split(/\r?\n/).length;
  return { line, cursor: safeStart + blockRaw.length };
}

function extractAnswerBulletLines(answer: string): string[] {
  if (!answer.trim()) return [];
  const lines = answer.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;
  let fenceMarker = '';
  for (const line of lines) {
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1].length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;
    const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!bullet) continue;
    const text = bullet[1].replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}

function scanBlockStructure(
  blockRaw: string,
  baseLine: number,
): {
  headings: BlockSectionHeading[];
  codeBlocks: { lang: string; line: number }[];
  emptySections: string[];
  misplacedMeta: { key: string; line: number }[];
  unclosedFenceLine?: number;
} {
  const lines = blockRaw.split(/\r?\n/);
  const headings: BlockSectionHeading[] = [];
  const codeBlocks: { lang: string; line: number }[] = [];
  const misplacedMeta: { key: string; line: number }[] = [];

  let inFence = false;
  let fenceMarker = '';
  let fenceStartLine = -1;
  let seenSubsection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,}|~{3,})\s*(\S*)\s*$/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
        fenceStartLine = baseLine + i;
        codeBlocks.push({ lang: fence[2] || '', line: baseLine + i });
      } else if (fence[1].length >= fenceMarker.length && !fence[2]) {
        inFence = false;
        fenceMarker = '';
        fenceStartLine = -1;
      }
      continue;
    }
    if (inFence) continue;

    const sub = line.match(/^###\s+(\S+)/);
    if (sub) {
      seenSubsection = true;
      headings.push({ name: sub[1], line: baseLine + i, lineIndex: i });
      continue;
    }

    if (
      seenSubsection &&
      /^(title|difficulty|tags|parent|parentId|followups|followupQuestionIds|links|relatedQuestionIds)\s*:/.test(
        line,
      )
    ) {
      const key = line.split(':')[0].trim();
      misplacedMeta.push({ key, line: baseLine + i });
    }
  }

  const emptySections: string[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].lineIndex + 1;
    const end = i + 1 < headings.length ? headings[i + 1].lineIndex : lines.length;
    const content = lines.slice(start, end).join('\n').trim();
    if (!content) emptySections.push(headings[i].name);
  }

  return {
    headings,
    codeBlocks,
    emptySections,
    misplacedMeta,
    unclosedFenceLine: inFence && fenceStartLine > 0 ? fenceStartLine : undefined,
  };
}

function scanTextQuality(file: string, content: string) {
  const lines = content.split(/\r?\n/);
  const templateHits = new Map<string, number[]>();
  let inFence = false;
  let fenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1].length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;

    for (const item of BROKEN_TEXT_PATTERNS) {
      if (item.pattern.test(line)) {
        errs.push(`${file}: 第 ${i + 1} 行疑似生成损坏文本：${item.hint}`);
      }
    }
    for (const phrase of TEMPLATE_PHRASES) {
      if (line.includes(phrase)) {
        const hits = templateHits.get(phrase) || [];
        hits.push(i + 1);
        templateHits.set(phrase, hits);
      }
    }
  }

  const repeatedTemplates = [...templateHits.entries()].filter(
    ([, hitLines]) => hitLines.length >= 3,
  );
  if (repeatedTemplates.length) {
    const total = repeatedTemplates.reduce((sum, [, hitLines]) => sum + hitLines.length, 0);
    const phrases = repeatedTemplates.map(([phrase]) => `「${phrase}」`).join('、');
    errs.push(
      `${file}: 追问题模板化短语集中出现 ${total} 次（${phrases}），请先运行内容增强脚本修复`,
    );
  }
}

function scanInvalidQuestionHeadings(file: string, content: string): void {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1].length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;

    const candidate = line.match(/^##(?!#)\s+(.+?)\s*$/);
    if (!candidate) continue;
    const valid = /^##\s+([a-z][a-z0-9-]*)\s*$/.test(line);
    if (valid) continue;
    errs.push(
      `${file}: 第 ${i + 1} 行题目标题 slug 非法 → "## ${candidate[1]}"（仅允许小写字母/数字/连字符）`,
    );
  }
}

function scanQuestions(file: string, categoryId: string, content: string): QuestionScan[] {
  const { blocks } = splitQuestionBlocks(content, DEFAULT_SECTION_NAMES);
  const out: QuestionScan[] = [];
  let cursor = 0;

  for (const block of blocks) {
    const { line: startLine, cursor: nextCursor } = blockStartLine(content, block.raw, cursor);
    cursor = nextCursor;
    const structure = scanBlockStructure(block.raw, startLine);

    const title = normalizeMetaValue(readMeta(block.metaText, 'title')) || '';
    const difficulty = normalizeMetaValue(readMeta(block.metaText, 'difficulty'));
    const tagsRaw = readMeta(block.metaText, 'tags');
    const parentRaw = normalizeMetaValue(
      readMeta(block.metaText, 'parentId') ?? readMeta(block.metaText, 'parent'),
    );
    const followupsRaw =
      readMeta(block.metaText, 'followupQuestionIds') ?? readMeta(block.metaText, 'followups');
    const linksRaw =
      readMeta(block.metaText, 'relatedQuestionIds') ?? readMeta(block.metaText, 'links');

    if (tagsRaw && !isInlineArrayLiteral(tagsRaw)) {
      errs.push(`${file}: ${block.slug} tags 必须使用内联数组格式，例如 tags: [Vue, 响应式]`);
    }
    if (followupsRaw && !isInlineArrayLiteral(followupsRaw)) {
      errs.push(`${file}: ${block.slug} followups 必须使用内联数组格式，例如 followups: [foo]`);
    }
    if (linksRaw && !isInlineArrayLiteral(linksRaw)) {
      errs.push(`${file}: ${block.slug} links 必须使用内联数组格式，例如 links: [foo, 03-vue/bar]`);
    }

    const sections = block.sections;
    const headings = structure.headings.map((item) => item.name);
    const seenSubsections = new Set<string>();
    const duplicateSubsections: string[] = [];
    for (const name of headings) {
      if (seenSubsections.has(name)) duplicateSubsections.push(name);
      seenSubsections.add(name);
    }

    out.push({
      id: `${categoryId}/${block.slug}`,
      file,
      slug: block.slug,
      title,
      questionText: sections['题目'] || '',
      answerText: sections['答案要点'] || '',
      hasTitle: Boolean(title),
      hasQuestion: headings.includes('题目'),
      hasAnswer: headings.includes('答案要点'),
      difficulty,
      tags: tagsRaw ? parseInlineList(tagsRaw) : [],
      parentId: parentRaw ? normalizeQuestionId(categoryId, parentRaw) : undefined,
      followupIds: followupsRaw
        ? parseInlineList(followupsRaw).map((id) => normalizeQuestionId(categoryId, id))
        : [],
      linkIds: linksRaw
        ? parseInlineList(linksRaw).map((id) => normalizeQuestionId(categoryId, id))
        : [],
      answerWordCount: (sections['答案要点'] || '').replace(/\s+/g, '').length,
      answerBulletLines: extractAnswerBulletLines(sections['答案要点'] || ''),
      hasSummary: headings.includes('一句话'),
      codeBlocks: structure.codeBlocks,
      unknownSubsections: headings.filter((name) => !VALID_SECTIONS.has(name)),
      duplicateSubsections,
      misplacedMeta: structure.misplacedMeta,
      emptySections: structure.emptySections,
      unclosedFenceLine: structure.unclosedFenceLine,
    });
  }

  return out;
}

for (const f of files) {
  const raw = readFileSync(join(ROOT, f), 'utf-8');
  scanTextQuality(f, raw);
  scanInvalidQuestionHeadings(f, raw);
  try {
    parseCategoryMarkdown(raw);
  } catch (e) {
    errs.push(`${f}: 运行时解析失败 → ${e instanceof Error ? e.message : String(e)}`);
  }
  const { data, content } = matter(raw);
  const front = data as { id?: string; title?: string; order?: number };
  const categoryId = front.id || f.replace(/\.md$/, '');
  if (!front.id) errs.push(`${f}: frontmatter 缺少 id`);
  if (!front.title) errs.push(`${f}: frontmatter 缺少 title`);
  if (front.order == null) errs.push(`${f}: frontmatter 缺少 order`);
  if (front.id) {
    const expectedId = f.replace(/\.md$/, '');
    if (front.id !== expectedId)
      errs.push(`${f}: frontmatter id 应与文件名一致 → ${front.id} != ${expectedId}`);
    if (seenIds.has(front.id)) errs.push(`${f}: 分类 id 重复: ${front.id}`);
    seenIds.add(front.id);
  }
  if (front.order != null) {
    if (!Number.isInteger(front.order) || front.order < 1) {
      errs.push(`${f}: order 必须是正整数 → ${front.order}`);
    } else if (seenOrders.has(front.order)) {
      errs.push(`${f}: order 与 ${seenOrders.get(front.order)} 重复 → ${front.order}`);
    } else {
      seenOrders.set(front.order, f);
    }
  }

  const slugs = new Set<string>();
  const questions = scanQuestions(f, categoryId, content);
  if (!questions.length) errs.push(`${f}: 至少需要包含 1 道题`);
  for (const q of questions) {
    if (questionsById.has(q.id)) errs.push(`${f}: 全局题目 ID 重复 → ${q.id}`);
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
    if (q.duplicateSubsections.length) {
      errs.push(`${f}: ${q.slug} 出现重复 ### 段落 → ${q.duplicateSubsections.join(', ')}`);
    }
    if (q.emptySections.length) {
      errs.push(`${f}: ${q.slug} 存在空段落 → ${q.emptySections.join(', ')}`);
    }
    if (q.unclosedFenceLine) {
      errs.push(`${f}: ${q.slug} 第 ${q.unclosedFenceLine} 行代码块未闭合`);
    }
    if (q.misplacedMeta.length) {
      errs.push(
        `${f}: ${q.slug} 元数据必须写在第一个 ### 前 → ${q.misplacedMeta
          .map((item) => `${item.key}@${item.line}`)
          .join(', ')}`,
      );
    }
    if (new Set(q.followupIds).size !== q.followupIds.length) {
      errs.push(`${f}: ${q.slug} followups 存在重复项`);
    }
    if (new Set(q.linkIds).size !== q.linkIds.length) {
      errs.push(`${f}: ${q.slug} links 存在重复项`);
    }
    if (q.followupIds.length > 3) {
      warns.push(`${f}: ${q.slug} followups 超过 3 个，建议只保留最高价值追问`);
    }
    if (q.linkIds.length > 3) {
      errs.push(`${f}: ${q.slug} links 超过 3 个，相关题目入口会显得过密`);
    }
    if (q.parentId === q.id || q.followupIds.includes(q.id)) {
      errs.push(`${f}: ${q.slug} parent/followups 不能自引用`);
    }
    if (q.linkIds.includes(q.id)) {
      errs.push(`${f}: ${q.slug} links 不能自引用`);
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
    errs.push(`${child?.file || childId}: parent/followups 指向不存在的原题 → ${parentId}`);
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

const followupTitlesByParent = new Map<string, Map<string, string[]>>();
for (const q of questionsById.values()) {
  if (!q.parentId || !q.title) continue;
  const byTitle = followupTitlesByParent.get(q.parentId) || new Map<string, string[]>();
  const ids = byTitle.get(q.title) || [];
  ids.push(q.id);
  byTitle.set(q.title, ids);
  followupTitlesByParent.set(q.parentId, byTitle);
}
for (const [parentId, byTitle] of followupTitlesByParent) {
  for (const [title, ids] of byTitle) {
    if (ids.length > 1) {
      errs.push(`${parentId}: 追问题标题重复「${title}」→ ${ids.join(', ')}`);
    }
  }
}

for (const q of questionsById.values()) {
  for (const linkId of q.linkIds) {
    if (!questionsById.has(linkId)) {
      errs.push(`${q.file}: ${q.slug} links 指向不存在的题目 → ${linkId}`);
    }
  }
}

for (const q of questionsById.values()) {
  const normalizedAnswer = normalizeQualityText(q.answerText);
  if (!normalizedAnswer) continue;
  for (const phrase of BANNED_TEMPLATE_PHRASES) {
    if (normalizedAnswer.includes(phrase)) {
      errs.push(`${q.file}: ${q.slug} 答案包含禁用模板句 → ${phrase}`);
    }
  }
  if (!q.parentId) continue;
  if (!containsAnyKeyword(normalizedAnswer, FOLLOWUP_ACTION_KEYWORDS)) {
    errs.push(`${q.file}: ${q.slug} 追问题答案缺少动作化描述（如排查/实施/迁移/回滚）`);
  }
  if (!containsAnyKeyword(normalizedAnswer, FOLLOWUP_RISK_KEYWORDS)) {
    errs.push(`${q.file}: ${q.slug} 追问题答案缺少风险或失败场景描述`);
  }
  if (!containsAnyKeyword(normalizedAnswer, FOLLOWUP_VERIFY_KEYWORDS)) {
    errs.push(`${q.file}: ${q.slug} 追问题答案缺少验证信号（指标/日志/测试/验收）`);
  }
  const parent = questionsById.get(q.parentId);
  if (!parent) continue;
  const similarity = jaccardSimilarity(normalizedAnswer, normalizeQualityText(parent.answerText));
  if (similarity >= 0.72) {
    errs.push(
      `${q.file}: ${q.slug} 追问题答案与父题相似度过高 (${similarity.toFixed(2)})，请避免复述`,
    );
  }
}

const followupAnswerLineStats = new Map<
  string,
  { count: number; sampleFile: string; sampleSlug: string; text: string }
>();
for (const q of questionsById.values()) {
  if (!q.parentId) continue;
  for (const line of q.answerBulletLines) {
    if (line.length < 14) continue;
    const key = line.replace(/\s+/g, ' ').trim();
    if (/^(第[一二三]步：|场景前提：|实施步骤：|失败风险：|验收信号：|追问核心：)/.test(key)) {
      continue;
    }
    const prev = followupAnswerLineStats.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      followupAnswerLineStats.set(key, {
        count: 1,
        sampleFile: q.file,
        sampleSlug: q.slug,
        text: key,
      });
    }
  }
}
const FOLLOWUP_REPEAT_WARN_THRESHOLD = 140;
for (const stat of followupAnswerLineStats.values()) {
  if (stat.count < FOLLOWUP_REPEAT_WARN_THRESHOLD) continue;
  const preview = stat.text.length > 80 ? `${stat.text.slice(0, 80)}...` : stat.text;
  warns.push(
    `${stat.sampleFile}: ${stat.sampleSlug} 追问答案出现高频重复句（${stat.count} 次）→ ${preview}`,
  );
}

const scopedErrs = errs.filter(shouldReportMessage);
const scopedWarns = warns.filter(shouldReportMessage);

if (scopedErrs.length) {
  console.error('❌ 内容校验失败：');
  for (const e of scopedErrs) console.error('  - ' + e);
  process.exit(1);
}
if (scopedWarns.length && process.env.STRICT_VALIDATE) {
  console.error('⚠ 严格模式下警告即失败：');
  for (const w of scopedWarns) console.error('  - ' + w);
  process.exit(1);
}
if (scopedWarns.length) {
  console.warn(`⚠ 校验通过但有 ${scopedWarns.length} 条提示（设 STRICT_VALIDATE=1 严格模式）：`);
  scopedWarns.slice(0, 30).forEach((w) => console.warn('  - ' + w));
  if (scopedWarns.length > 30) console.warn(`  ... 另有 ${scopedWarns.length - 30} 条省略`);
}
const checkedCount = selectedSet ? selectedFiles.length : files.length;
console.log(`✅ 内容校验通过：${checkedCount} 个分类文件${selectedSet ? '（--only）' : ''}`);
