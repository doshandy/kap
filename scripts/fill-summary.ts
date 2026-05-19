/**
 * 给所有缺 `### 一句话` 的题目自动注入一段简短摘要：
 * 取答案要点里的"第一段含信息密度的内容"作为 draft，去除 markdown 强调标记，
 * 控制在 90-120 字。脚本支持幂等：已有「一句话」段的题目跳过。
 *
 * 使用：
 *   pnpm tsx scripts/fill-summary.ts              # 只预览，不写入
 *   pnpm tsx scripts/fill-summary.ts --write      # 写入文件
 *   pnpm tsx scripts/fill-summary.ts --only=03-vue.md   # 只处理某个文件
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';

const parserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  splitQuestionBlocks(content: string): {
    before: string;
    blocks: Array<{
      raw: string;
      sections: Record<string, string>;
    }>;
  };
};
const { splitQuestionBlocks } = parserModule;

const { dryRun, onlyFile } = parseCommonScriptArgs(process.argv.slice(2));

const CONTENT_DIR = join(process.cwd(), 'content');
const files = resolveOnlyContentFiles(
  readdirSync(CONTENT_DIR).filter((f) => /^\d.*\.md$/.test(f)),
  onlyFile,
);

interface Stat {
  total: number;
  filled: number;
  skipped: number;
}

function clean(line: string): string {
  return line
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickSentences(answer: string): string {
  const lines = answer.split(/\r?\n/);
  const buf: string[] = [];
  for (const ln of lines) {
    const m = ln.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      const s = clean(m[1]);
      if (s) buf.push(s);
      if (buf.length >= 3) break;
    } else if (ln.trim() && !ln.startsWith('#') && !ln.startsWith('```')) {
      buf.push(clean(ln));
      if (buf.length >= 3) break;
    }
  }
  if (!buf.length) return '';
  let summary = buf.join('；');
  summary = summary.replace(/[；。]+$/g, '');
  if (summary.length > 130) {
    const trimmed = summary.slice(0, 128);
    const last = Math.max(trimmed.lastIndexOf('；'), trimmed.lastIndexOf('，'));
    summary = last > 60 ? trimmed.slice(0, last) : trimmed;
  }
  summary = summary.replace(/「([^」]{4,80}) 是什么」/g, '「$1」');
  return summary + '。';
}

function processFile(file: string): Stat {
  const filePath = join(CONTENT_DIR, file);
  const text = readFileSync(filePath, 'utf8');

  const stat: Stat = { total: 0, filled: 0, skipped: 0 };
  const parsed = splitQuestionBlocks(text);
  if (!parsed.blocks.length) return stat;

  const rewritten = parsed.blocks.map((block) => {
    stat.total++;
    if (block.sections['一句话']) {
      stat.skipped++;
      return block.raw;
    }
    const answer = block.sections['答案要点'];
    if (!answer) {
      stat.skipped++;
      return block.raw;
    }
    const summary = pickSentences(answer);
    if (!summary) {
      stat.skipped++;
      return block.raw;
    }
    const titleMatch = block.raw.match(/^### 题目\s*$/m);
    if (!titleMatch?.index && titleMatch?.index !== 0) {
      stat.skipped++;
      return block.raw;
    }
    stat.filled++;
    const inject = `### 一句话\n${summary}\n\n`;
    return `${block.raw.slice(0, titleMatch.index)}${inject}${block.raw.slice(titleMatch.index)}`;
  });

  const out = `${parsed.before}${rewritten.join('\n')}`;
  if (out !== text && !dryRun) writeFileSync(filePath, out);

  return stat;
}

let g = { total: 0, filled: 0, skipped: 0 };
for (const file of files) {
  const s = processFile(file);
  g.total += s.total;
  g.filled += s.filled;
  g.skipped += s.skipped;
  if (s.filled > 0) {
    console.log(`${file.padEnd(40)} 共 ${s.total}，新填 ${s.filled}，跳过 ${s.skipped}`);
  }
}

console.log('---');
console.log(`总计 ${g.total} 题，本次自动补充 ${g.filled} 题，原已有/跳过 ${g.skipped} 题。`);
if (dryRun) console.log('(dry 模式，未写入)');
