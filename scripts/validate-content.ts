import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { JSDOM } from 'jsdom';

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

const errs: string[] = [];
const warns: string[] = [];

const files = readdirSync(ROOT)
  .filter((f) => f.endsWith('.md'))
  .sort();
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
  { pattern: /「[^」]{4,80} 是什么」/, hint: '题目标题被机械追加「是什么」' },
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
  hasTitle: boolean;
  hasQuestion: boolean;
  hasAnswer: boolean;
  difficulty?: string;
  tags: string[];
  parentId?: string;
  followupIds: string[];
  linkIds: string[];
  answerWordCount: number;
  hasSummary: boolean;
  codeBlocks: { lang: string; line: number }[];
  unknownSubsections: string[];
  duplicateSubsections: string[];
  misplacedMeta: { key: string; line: number }[];
  emptySections: string[];
  unclosedFenceLine?: number;
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

function scanTextQuality(file: string, content: string) {
  const lines = content.split(/\r?\n/);
  const templateHits = new Map<string, number[]>();
  let inFence = false;
  let fenceMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,})/);
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

function scanQuestions(file: string, categoryId: string, content: string): QuestionScan[] {
  const lines = content.split(/\r?\n/);
  const out: QuestionScan[] = [];
  let cur: QuestionScan | null = null;
  let curSection: string | null = null;
  let inFence = false;
  let inFenceMarker = '';
  let fenceStartLine = 0;
  let seenSubsection = false;
  let sectionContent = '';
  let seenSections = new Set<string>();

  const flush = () => {
    if (cur && curSection && !sectionContent.trim()) cur.emptySections.push(curSection);
    if (cur && inFence) cur.unclosedFenceLine = fenceStartLine;
    if (cur) out.push(cur);
    inFence = false;
    inFenceMarker = '';
    fenceStartLine = 0;
    seenSubsection = false;
    sectionContent = '';
    seenSections = new Set<string>();
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const fence = ln.match(/^(`{3,})\s*(\S*)\s*$/);
    if (fence && cur) {
      if (!inFence) {
        inFence = true;
        inFenceMarker = fence[1];
        fenceStartLine = i + 1;
        cur.codeBlocks.push({ lang: fence[2] || '', line: i + 1 });
      } else if (fence[1].length >= inFenceMarker.length && !fence[2]) {
        inFence = false;
        inFenceMarker = '';
        fenceStartLine = 0;
      }
      if (curSection) sectionContent += ln + '\n';
      continue;
    }
    if (!inFence) {
      const head = ln.match(/^##\s+([a-z][a-z0-9-]*)\s*$/);
      if (head) {
        flush();
        cur = {
          id: `${categoryId}/${head[1]}`,
          file,
          slug: head[1],
          title: '',
          hasTitle: false,
          hasQuestion: false,
          hasAnswer: false,
          tags: [],
          followupIds: [],
          linkIds: [],
          answerWordCount: 0,
          hasSummary: false,
          codeBlocks: [],
          unknownSubsections: [],
          duplicateSubsections: [],
          misplacedMeta: [],
          emptySections: [],
        };
        curSection = null;
        continue;
      }
    }
    if (!cur) continue;
    if (curSection) sectionContent += ln + '\n';

    if (!inFence && /^title\s*:/.test(ln)) {
      if (seenSubsection) cur.misplacedMeta.push({ key: 'title', line: i + 1 });
      else {
        cur.hasTitle = true;
        cur.title = ln.replace(/^title\s*:\s*/, '').trim();
      }
    }
    if (!inFence && /^difficulty\s*:/.test(ln)) {
      if (seenSubsection) cur.misplacedMeta.push({ key: 'difficulty', line: i + 1 });
      const v = ln.split(':')[1]?.trim();
      cur.difficulty = v;
    }
    if (!inFence && /^tags\s*:/.test(ln)) {
      if (seenSubsection) cur.misplacedMeta.push({ key: 'tags', line: i + 1 });
      const v = ln.replace(/^tags\s*:\s*/, '').trim();
      const m = v.match(/^\[([^\]]*)\]$/);
      if (m) {
        cur.tags = m[1]
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else if (!seenSubsection) {
        errs.push(`${file}: ${cur.slug} tags 必须使用内联数组格式，例如 tags: [Vue, 响应式]`);
      }
    }
    if (!inFence && /^(parent|parentId)\s*:/.test(ln)) {
      if (seenSubsection) cur.misplacedMeta.push({ key: 'parent', line: i + 1 });
      const v = ln
        .replace(/^(parent|parentId)\s*:\s*/, '')
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (v) cur.parentId = normalizeQuestionId(categoryId, v);
    }
    if (!inFence && /^(followups|followupQuestionIds)\s*:/.test(ln)) {
      if (seenSubsection) cur.misplacedMeta.push({ key: 'followups', line: i + 1 });
      const v = ln.replace(/^(followups|followupQuestionIds)\s*:\s*/, '').trim();
      if (!/^\[[^\]]*\]$/.test(v) && !seenSubsection) {
        errs.push(`${file}: ${cur.slug} followups 必须使用内联数组格式，例如 followups: [foo]`);
      }
      cur.followupIds = parseInlineList(v).map((id) => normalizeQuestionId(categoryId, id));
    }
    if (!inFence && /^(links|relatedQuestionIds)\s*:/.test(ln)) {
      if (seenSubsection) cur.misplacedMeta.push({ key: 'links', line: i + 1 });
      const v = ln.replace(/^(links|relatedQuestionIds)\s*:\s*/, '').trim();
      if (!/^\[[^\]]*\]$/.test(v) && !seenSubsection) {
        errs.push(`${file}: ${cur.slug} links 必须使用内联数组格式，例如 links: [foo, 03-vue/bar]`);
      }
      cur.linkIds = parseInlineList(v).map((id) => normalizeQuestionId(categoryId, id));
    }
    const sub = ln.match(/^###\s+(\S+)/);
    if (!inFence && sub) {
      if (curSection && !sectionContent.trim()) cur.emptySections.push(curSection);
      const name = sub[1];
      curSection = name;
      sectionContent = '';
      seenSubsection = true;
      if (seenSections.has(name)) cur.duplicateSubsections.push(name);
      seenSections.add(name);
      if (!VALID_SECTIONS.has(name)) cur.unknownSubsections.push(name);
      if (name === '一句话') cur.hasSummary = true;
      if (name === '题目') cur.hasQuestion = true;
      if (name === '答案要点') cur.hasAnswer = true;
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
  scanTextQuality(f, raw);
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
