/**
 * 给指定 categoryId/slug 的题目插入「常见误区」+「追问」段落。
 * 写法：
 *   pnpm tsx scripts/inject-pitfall-followup.ts < data.json
 *   data.json 是 { 'cat-id/slug': { pitfall?: string, followup?: string } } 的 dict
 *
 * 重要：本脚本不会重复插入，已有同名段会跳过。
 * 段落插入位置：紧贴 `### 延伸` 前（若没有延伸，则追加到题块末尾）。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Patch {
  pitfall?: string;
  followup?: string;
}

const stdinData = readFileSync(0, 'utf8');
const patches = JSON.parse(stdinData) as Record<string, Patch>;

const CONTENT_DIR = join(process.cwd(), 'content');
const files = readdirSync(CONTENT_DIR).filter((f) => /^\d.*\.md$/.test(f));

interface Stat { added: number; skipped: number; missing: string[] }
const stat: Stat = { added: 0, skipped: 0, missing: [] };
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
  if (out !== text) writeFileSync(filePath, out);
}

const missing = Object.keys(patches).filter((k) => !seen.has(k));
console.log(`已写入段落数：${stat.added}，跳过（已有）：${stat.skipped}`);
if (missing.length) {
  console.log('未匹配到的题：');
  missing.forEach((k) => console.log('  ' + k));
}
