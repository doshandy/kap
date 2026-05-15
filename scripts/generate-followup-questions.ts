import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Block {
  slug: string;
  raw: string;
  metaText: string;
  title: string;
  difficulty: string;
  tags: string[];
  isFollowup: boolean;
  parent?: string;
  followups: string[];
  sections: Record<string, string>;
}

const CONTENT_DIR = join(process.cwd(), 'content');
const files = readdirSync(CONTENT_DIR)
  .filter((file) => /^\d.*\.md$/.test(file))
  .sort();

const stat = {
  parentsTouched: 0,
  followupSectionsAdded: 0,
  childQuestionsAdded: 0,
  childQuestionsSkipped: 0,
  childQuestionsRefreshed: 0,
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseInlineList(value: string): string[] {
  const match = value.trim().match(/^\[([^\]]*)\]$/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function formatInlineList(values: string[]): string {
  return `[${values.join(', ')}]`;
}

function readMeta(metaText: string, key: string): string | undefined {
  const match = metaText.match(new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
}

function parseSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const re = /^###\s+(一句话|题目|答案要点|代码示例|常见误区|追问|延伸)\s*$/gm;
  const matches = [...raw.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = (matches[i].index || 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index || raw.length : raw.length;
    sections[name] = raw.slice(start, end).trim();
  }
  return sections;
}

function splitBlocks(content: string): { before: string; blocks: Block[] } {
  const headRe = /^##\s+([a-z][a-z0-9-]*)\s*$/gm;
  const heads = [...content.matchAll(headRe)].map((match) => ({
    slug: match[1],
    index: match.index || 0,
  }));
  const blocks: Block[] = [];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : content.length;
    const raw = content.slice(start, end).replace(/\s+$/, '\n');
    const firstSection = raw.search(/^###\s+/m);
    const metaText = firstSection >= 0 ? raw.slice(0, firstSection) : raw;
    const sections = parseSections(raw);
    blocks.push({
      slug: heads[i].slug,
      raw,
      metaText,
      title: readMeta(metaText, 'title') || heads[i].slug,
      difficulty: readMeta(metaText, 'difficulty') || '进阶',
      tags: parseInlineList(readMeta(metaText, 'tags') || '[]'),
      isFollowup: /^parent\s*:/m.test(metaText) || /^parentId\s*:/m.test(metaText),
      parent: readMeta(metaText, 'parent') || readMeta(metaText, 'parentId'),
      followups: parseInlineList(
        readMeta(metaText, 'followups') || readMeta(metaText, 'followupQuestionIds') || '[]',
      ),
      sections,
    });
  }
  return {
    before: heads.length ? content.slice(0, heads[0].index) : content,
    blocks,
  };
}

function extractFollowupQuestions(section: string | undefined, parentTitle: string): string[] {
  if (!section?.trim()) {
    return [`如果把「${parentTitle}」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？`];
  }
  const bullets = section
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+?)\s*$/)?.[1])
    .filter((line): line is string => Boolean(line))
    .map((line) => line.replace(/\s+/g, ' ').trim());
  if (bullets.length) return bullets;
  return section
    .split(/[？?。]\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/[？?]$/.test(line) ? line : `${line}？`));
}

function cleanTitle(value: string): string {
  return value
    .replace(/[\]`*_#>[]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[？?。；;，,：:]$/, '');
}

function markdownText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const match of question.matchAll(/`([^`]+)`/g)) terms.add(match[1]);
  for (const match of question.matchAll(/[A-Za-z][A-Za-z0-9_+#./-]{1,}/g)) terms.add(match[0]);
  for (const match of question.matchAll(/[\u4e00-\u9fa5]{2,}/g)) {
    const text = match[0];
    for (let i = 0; i < text.length - 1; i += 2) terms.add(text.slice(i, i + 2));
  }
  return [...terms].filter((term) => term.length > 1);
}

function relevantLines(block: Block, question: string): string[] {
  const source = [
    block.sections['答案要点'] || '',
    block.sections['常见误区'] || '',
    block.sections['延伸'] || '',
  ].join('\n');
  const terms = extractTerms(question);
  return source
    .split(/\r?\n/)
    .map((line) => markdownText(line.replace(/^\s*[-*]\s*/, '')))
    .filter((line) => line.length >= 12)
    .filter((line) => terms.some((term) => line.toLowerCase().includes(term.toLowerCase())))
    .slice(0, 3);
}

function answerFor(block: Block, question: string): string {
  const related = relevantLines(block, question);
  const relatedPart = related.length
    ? related.map((line) => `- ${line}`).join('\n')
    : `- 先把问题拉回「${block.title}」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。`;
  return `#### 回答思路
- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开
${relatedPart}
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地
- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点
- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。`;
}

function childBlock(parent: Block, slug: string, question: string): string {
  const tags = [...new Set([...parent.tags.slice(0, 4), '追问'])];
  return `## ${slug}
title: 追问：${cleanTitle(question)}
difficulty: ${parent.difficulty}
tags: ${formatInlineList(tags)}
parent: ${parent.slug}

### 题目
如果面试官追问：${question}

### 答案要点
${answerFor(parent, question)}
`;
}

function replaceOrInsertMeta(raw: string, key: string, value: string): string {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${escapeRegExp(key)}\\s*:.*$`, 'm');
  if (re.test(raw)) return raw.replace(re, line);
  const firstSection = raw.search(/^###\s+/m);
  const insertAt = firstSection >= 0 ? firstSection : raw.length;
  return `${raw.slice(0, insertAt).replace(/\s+$/, '')}\n${line}\n\n${raw.slice(insertAt)}`;
}

function replaceSection(raw: string, name: string, body: string): string {
  const re = new RegExp(`^###\\s+${escapeRegExp(name)}\\s*$`, 'm');
  const match = raw.match(re);
  if (!match?.index && match?.index !== 0)
    return `${raw.replace(/\s+$/, '')}\n\n### ${name}\n${body.trim()}\n`;
  const start = match.index + match[0].length;
  const rest = raw.slice(start);
  const next = rest.search(/^###\s+/m);
  const end = next >= 0 ? start + next : raw.length;
  return `${raw.slice(0, start)}\n${body.trim()}\n\n${raw.slice(end).replace(/^\s+/, '')}`;
}

function rewriteFollowupBlock(block: Block, parent: Block, question: string): string {
  let next = block.raw;
  next = replaceOrInsertMeta(next, 'title', `追问：${cleanTitle(question)}`);
  next = replaceOrInsertMeta(next, 'difficulty', parent.difficulty);
  next = replaceOrInsertMeta(
    next,
    'tags',
    formatInlineList([...new Set([...parent.tags.slice(0, 4), '追问'])]),
  );
  next = replaceOrInsertMeta(next, 'parent', parent.slug);
  next = replaceSection(next, '题目', `如果面试官追问：${question}`);
  next = replaceSection(next, '答案要点', answerFor(parent, question));
  return next;
}

function withFollowupsMeta(block: Block, followups: string[]): string {
  if (!followups.length) return block.raw;
  const line = `followups: ${formatInlineList(followups)}`;
  if (/^followups\s*:/m.test(block.raw)) {
    return block.raw.replace(/^followups\s*:.*$/m, line);
  }
  if (/^followupQuestionIds\s*:/m.test(block.raw)) {
    return block.raw.replace(/^followupQuestionIds\s*:.*$/m, line);
  }
  const titleLine = block.raw.match(/^title\s*:.*$/m);
  const insertAt = titleLine
    ? (titleLine.index || 0) + titleLine[0].length
    : block.raw.indexOf('\n') + 1;
  return `${block.raw.slice(0, insertAt)}\n${line}${block.raw.slice(insertAt)}`;
}

function withFollowupSection(block: Block, questions: string[]): string {
  if (block.sections['追问']?.trim()) return block.raw;
  const section = `### 追问\n${questions.map((question) => `- ${question}`).join('\n')}\n\n`;
  const extraMatch = block.raw.match(/^###\s+延伸\s*$/m);
  if (extraMatch?.index != null) {
    return `${block.raw.slice(0, extraMatch.index)}${section}${block.raw.slice(extraMatch.index)}`;
  }
  return `${block.raw.replace(/\s+$/, '\n\n')}${section}`;
}

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  const raw = readFileSync(filePath, 'utf8');
  const { before, blocks } = splitBlocks(raw);
  const knownSlugs = new Set(blocks.map((block) => block.slug));
  const blockBySlug = new Map(blocks.map((block) => [block.slug, block]));
  const generated: string[] = [];
  const rewritten = blocks.map((block) => {
    if (block.isFollowup) {
      const parentSlug = (block.parent || '').replace(/^.*\//, '');
      const parent = blockBySlug.get(parentSlug);
      if (!parent) return block.raw;
      const questions = extractFollowupQuestions(parent.sections['追问'], parent.title);
      const index = parent.followups.indexOf(block.slug);
      const fallbackQuestion = block.sections['题目']?.replace(/^如果面试官追问：?/, '').trim();
      const question =
        questions[index] || fallbackQuestion || cleanTitle(block.title.replace(/^追问：/, ''));
      stat.childQuestionsRefreshed++;
      return rewriteFollowupBlock(block, parent, question);
    }
    const questions = extractFollowupQuestions(block.sections['追问'], block.title);
    const childSlugs = questions.map((_, index) => `${block.slug}-followup-${index + 1}`);
    let next = block.raw;
    if (!block.sections['追问']?.trim()) {
      next = withFollowupSection({ ...block, raw: next }, questions);
      stat.followupSectionsAdded++;
    }
    next = withFollowupsMeta({ ...block, raw: next }, childSlugs);
    stat.parentsTouched++;

    for (let i = 0; i < questions.length; i++) {
      const slug = childSlugs[i];
      if (knownSlugs.has(slug)) {
        stat.childQuestionsSkipped++;
        continue;
      }
      knownSlugs.add(slug);
      generated.push(childBlock(block, slug, questions[i]));
      stat.childQuestionsAdded++;
    }
    return next;
  });

  const output = `${before}${rewritten.join('\n')}${generated.length ? `\n${generated.join('\n')}` : ''}`;
  if (output !== raw) writeFileSync(filePath, output);
}

console.log(
  `已处理父题 ${stat.parentsTouched} 道，新增追问段 ${stat.followupSectionsAdded} 个，新增追问题 ${stat.childQuestionsAdded} 道，刷新追问题 ${stat.childQuestionsRefreshed} 道，跳过已有追问题 ${stat.childQuestionsSkipped} 道。`,
);
