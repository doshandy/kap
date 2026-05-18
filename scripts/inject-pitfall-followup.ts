/**
 * 给指定 categoryId/slug 的题目插入「常见误区」+「追问」段落。
 * 写法：
 *   pnpm tsx scripts/inject-pitfall-followup.ts --write < data.json
 *   data.json 是 { 'cat-id/slug': { pitfall?: string, followup?: string } } 的 dict
 *
 * 默认 dry-run，只预览影响范围；传入 --write 才落盘。
 * 重要：本脚本不会重复插入，已有同名段会跳过。
 * 段落插入位置：紧贴 `### 延伸` 前（若没有延伸，则追加到题块末尾）。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Patch {
  pitfall?: string;
  followup?: string;
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const dryRun = !write || args.includes('--dry') || args.includes('--dry-run');
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length) : '';

const stdinData = readFileSync(0, 'utf8');
if (!stdinData.trim()) {
  console.error(
    '请通过 stdin 传入 JSON patch，例如：pnpm tsx scripts/inject-pitfall-followup.ts --write < data.json',
  );
  process.exit(1);
}

let patches: Record<string, Patch>;
try {
  patches = JSON.parse(stdinData) as Record<string, Patch>;
} catch (e) {
  console.error('JSON 解析失败：' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}

const CONTENT_DIR = join(process.cwd(), 'content');
const files = readdirSync(CONTENT_DIR)
  .filter((f) => /^\d.*\.md$/.test(f))
  .filter((f) => (only ? f === only || f.replace(/\.md$/, '') === only : true));

interface Stat {
  added: number;
  skipped: number;
  touchedFiles: number;
}
const stat: Stat = { added: 0, skipped: 0, touchedFiles: 0 };
const seen = new Set<string>();

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  const text = readFileSync(filePath, 'utf8');

  const headRE = /^## ([a-z][\w-]*)\s*$/gm;
  const heads: { slug: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headRE.exec(text)) !== null) heads.push({ slug: m[1], index: m.index });
  if (!heads.length) continue;

  const categoryId = file.replace(/\.md$/, '');
  let out = '';
  let cursor = 0;

  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const block = text.slice(start, end);
    const key = `${categoryId}/${heads[i].slug}`;
    const patch = patches[key];

    out += text.slice(cursor, start);
    cursor = end;

    if (!patch) {
      out += block;
      continue;
    }
    seen.add(key);

    let work = block;
    const segments: string[] = [];

    if (patch.pitfall && !/^### 常见误区\s*$/m.test(block)) {
      segments.push(`### 常见误区\n${patch.pitfall.trim()}\n`);
      stat.added++;
    } else if (patch.pitfall) {
      stat.skipped++;
    }

    if (patch.followup && !/^### 追问\s*$/m.test(block)) {
      segments.push(`### 追问\n${patch.followup.trim()}\n`);
      stat.added++;
    } else if (patch.followup) {
      stat.skipped++;
    }

    if (!segments.length) {
      out += block;
      continue;
    }

    const inject = '\n' + segments.join('\n') + '\n';
    const extraIdx = work.search(/^### 延伸\s*$/m);
    if (extraIdx >= 0) {
      work = work.slice(0, extraIdx) + inject + work.slice(extraIdx);
    } else {
      work = work.replace(/\s*$/, '') + '\n' + inject;
    }
    out += work;
  }
  out += text.slice(cursor);
  if (out !== text) {
    stat.touchedFiles++;
    if (!dryRun) writeFileSync(filePath, out);
  }
}

const missing = Object.keys(patches).filter((k) => !seen.has(k));
console.log(
  `已${dryRun ? '预览' : '写入'}段落数：${stat.added}，跳过（已有）：${stat.skipped}，影响文件：${stat.touchedFiles}`,
);
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
if (missing.length) {
  console.log('未匹配到的题：');
  missing.forEach((k) => console.log('  ' + k));
  process.exitCode = 1;
}
