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

const args = process.argv.slice(2);
const write = args.includes('--write');
const dry = !write || args.includes('--dry') || args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const onlyFile = onlyArg ? onlyArg.slice(7) : null;

const CONTENT_DIR = join(process.cwd(), 'content');
const files = readdirSync(CONTENT_DIR)
  .filter((f) => /^\d.*\.md$/.test(f))
  .filter((f) => (onlyFile ? f === onlyFile : true));

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
    summary = (last > 60 ? trimmed.slice(0, last) : trimmed) + '…';
  }
  return summary + '。';
}

function processFile(file: string): Stat {
  const filePath = join(CONTENT_DIR, file);
  const text = readFileSync(filePath, 'utf8');

  const stat: Stat = { total: 0, filled: 0, skipped: 0 };

  const headRE = /^## ([a-z][\w-]*)\s*$/gm;
  const heads: { slug: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headRE.exec(text)) !== null) {
    heads.push({ slug: match[1], index: match.index });
  }
  if (!heads.length) return stat;

  const replacements: { from: number; to: number; replacement: string }[] = [];

  for (let i = 0; i < heads.length; i++) {
    stat.total++;
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const block = text.slice(start, end);

    if (/^### 一句话\s*$/m.test(block)) {
      stat.skipped++;
      continue;
    }

    const titleMatch = block.match(/^### 题目\s*$/m);
    const answerMatch = block.match(/^### 答案要点\s*\n([\s\S]*?)(?=^### |$)/m);
    if (!answerMatch) {
      stat.skipped++;
      continue;
    }
    const summary = pickSentences(answerMatch[1]);
    if (!summary) {
      stat.skipped++;
      continue;
    }
    if (!titleMatch) {
      stat.skipped++;
      continue;
    }

    const titleIdx = block.indexOf(titleMatch[0]);
    const insertOffset = start + titleIdx;
    const inject = `### 一句话\n${summary}\n\n`;
    replacements.push({ from: insertOffset, to: insertOffset, replacement: inject });
    stat.filled++;
  }

  if (!replacements.length) return stat;

  let out = '';
  let cursor = 0;
  for (const r of replacements.sort((a, b) => a.from - b.from)) {
    out += text.slice(cursor, r.from);
    out += r.replacement;
    cursor = r.to;
  }
  out += text.slice(cursor);

  if (!dry) writeFileSync(filePath, out);

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
if (dry) console.log('(dry 模式，未写入)');
