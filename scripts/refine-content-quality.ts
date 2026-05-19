import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import { categoryIdFromFrontmatter } from './shared/contentMeta';
import { replaceOrInsertMetaLine } from './shared/metaLine';
import { normalizeQuestionId, shortenQuestionId } from './shared/questionId';

const parserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  formatInlineList(values: string[]): string;
  parseInlineList(value: string): string[];
  readMeta(metaText: string, key: string): string | undefined;
  splitQuestionBlocks(content: string): {
    before: string;
    blocks: Array<{
      slug: string;
      raw: string;
      metaText: string;
    }>;
  };
};
const { formatInlineList, parseInlineList, readMeta, splitQuestionBlocks } = parserModule;

const args = process.argv.slice(2);
const { dryRun, onlyFile } = parseCommonScriptArgs(args);
const prune = args.includes('--prune') || args.includes('--remove-orphans');
const CONTENT_DIR = join(process.cwd(), 'content');
const MAX_FOLLOWUPS = 3;
const MAX_LINKS = 3;

interface Block {
  file: string;
  categoryId: string;
  slug: string;
  id: string;
  raw: string;
  metaText: string;
  title: string;
  parentId?: string;
  followups: string[];
  links: string[];
}

function splitBlocks(file: string, content: string): { before: string; blocks: Block[] } {
  const categoryId = categoryIdFromFrontmatter(content, file);
  const parsed = splitQuestionBlocks(content);
  return {
    before: parsed.before,
    blocks: parsed.blocks.map((block) => {
      const parent = readMeta(block.metaText, 'parent') || readMeta(block.metaText, 'parentId');
      return {
        file,
        categoryId,
        slug: block.slug,
        id: `${categoryId}/${block.slug}`,
        raw: block.raw,
        metaText: block.metaText,
        title: readMeta(block.metaText, 'title') || block.slug,
        parentId: parent ? normalizeQuestionId(categoryId, parent) : undefined,
        followups: parseInlineList(
          readMeta(block.metaText, 'followups') ||
            readMeta(block.metaText, 'followupQuestionIds') ||
            '[]',
        ).map((id) => normalizeQuestionId(categoryId, id)),
        links: parseInlineList(
          readMeta(block.metaText, 'links') ||
            readMeta(block.metaText, 'relatedQuestionIds') ||
            '[]',
        ).map((id) => normalizeQuestionId(categoryId, id)),
      };
    }),
  };
}

function updateInlineList(
  raw: string,
  key: 'followups' | 'links',
  categoryId: string,
  values: string[],
): string {
  return replaceOrInsertMetaLine(
    raw,
    key,
    formatInlineList(values.map((id) => shortenQuestionId(categoryId, id))),
    key === 'followups' ? ['followupQuestionIds'] : ['relatedQuestionIds'],
  );
}

function removeSubheadingSection(raw: string, heading: string): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (line.trim() === heading) {
      skipping = true;
      continue;
    }
    if (skipping && /^#{3,4}\s+/.test(line)) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function stripTemplateLines(raw: string): string {
  const noisyLinePatterns = [
    /面试中不要只回答「.*? 是什么」/,
    /^- 可以围绕 .+ 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。$/,
    /^- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。$/,
    /^- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。$/,
    /^- 至少准备一个可验证动作：写一个边界用例、打开一次调试面板、观察一个指标，或描述一次线上排障路径。$/,
    /^- 最后主动比较替代方案，说明为什么当前约束下选择它，而不是停在工具名或概念定义。$/,
  ];

  return raw
    .split('\n')
    .filter((line) => !noisyLinePatterns.some((pattern) => pattern.test(line.trim())))
    .join('\n');
}

function polishRaw(raw: string): string {
  return stripTemplateLines(
    removeSubheadingSection(removeSubheadingSection(raw, '#### 补充说明'), '#### 学习抓手'),
  )
    .replace(/…([。；])/g, '$1')
    .replace(/「([^」]{4,80}) 是什么」/g, '「$1」')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '\n');
}

function shouldRemoveFollowup(block: Block): boolean {
  if (!block.parentId) return false;
  return (
    block.title === '追问：你会用哪些测试、日志或指标证明这个方案有效' ||
    block.title === '追问：如果需求规模、团队成本或兼容性要求变化，你会如何调整方案'
  );
}

function pruneLinks(block: Block): string[] {
  const weak = (linkId: string) => {
    if (block.id.startsWith('03-vue/') && linkId === '04-css/responsive-container-query')
      return true;
    if (block.id === '04-css/responsive-container-query' && linkId.startsWith('03-vue/'))
      return true;
    if (block.id === '06-network/caching' && /^(07-engineering|11-ai-frontend)\//.test(linkId))
      return true;
    if (block.id === '07-engineering/ci-cd-cache' && linkId.startsWith('11-ai-frontend/'))
      return true;
    if (
      block.id === '11-ai-frontend/llm-prompt-caching-and-prefix' &&
      !linkId.startsWith('11-ai-frontend/')
    ) {
      return true;
    }
    return false;
  };

  return [...new Set(block.links.filter((id) => !weak(id)))].slice(0, MAX_LINKS);
}

const files = resolveOnlyContentFiles(
  readdirSync(CONTENT_DIR)
    .filter((file) => /^\d.*\.md$/.test(file))
    .sort(),
  onlyFile,
);
const parsed = files.map((file) => {
  const raw = readFileSync(join(CONTENT_DIR, file), 'utf8');
  return { file, raw, ...splitBlocks(file, raw) };
});
const allBlocks = parsed.flatMap((item) => item.blocks);
const removeCandidates = allBlocks.filter(shouldRemoveFollowup).map((block) => block.id);
const removeIds = new Set(prune ? removeCandidates : []);
const referencedFollowups = new Set<string>();

for (const block of allBlocks) {
  if (block.followups.length) {
    block.followups
      .filter((id) => !removeIds.has(id))
      .slice(0, MAX_FOLLOWUPS)
      .forEach((id) => referencedFollowups.add(id));
  }
}

let filesTouched = 0;
let blocksTouched = 0;
let blocksRemoved = 0;

for (const item of parsed) {
  const rewrittenBlocks: string[] = [];
  for (const block of item.blocks) {
    if (removeIds.has(block.id)) {
      blocksRemoved++;
      continue;
    }
    if (prune && block.parentId && !referencedFollowups.has(block.id)) {
      blocksRemoved++;
      continue;
    }

    let next = polishRaw(block.raw);
    if (block.followups.length) {
      const followups = block.followups.filter((id) => !removeIds.has(id)).slice(0, MAX_FOLLOWUPS);
      next = updateInlineList(next, 'followups', block.categoryId, followups);
    }
    if (block.links.length) {
      next = updateInlineList(next, 'links', block.categoryId, pruneLinks(block));
    }
    if (next !== block.raw) blocksTouched++;
    rewrittenBlocks.push(next);
  }

  const output = `${item.before}${rewrittenBlocks.join('\n')}`;
  if (output !== item.raw) {
    filesTouched++;
    if (!dryRun) writeFileSync(join(CONTENT_DIR, item.file), output);
  }
}

console.log(
  `已${dryRun ? '预览' : '写入'}题库精修：影响 ${filesTouched} 个文件，更新 ${blocksTouched} 个题块，移除 ${blocksRemoved} 个题块。`,
);
if (!prune && removeCandidates.length) {
  console.log(
    `检测到 ${removeCandidates.length} 个可移除的泛化追问题；默认不删除，传入 --prune 才会移除。`,
  );
}
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
