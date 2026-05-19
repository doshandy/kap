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
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';

const parserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  splitQuestionBlocks(content: string): {
    before: string;
    blocks: Array<{
      slug: string;
      raw: string;
      sections: Record<string, string>;
    }>;
  };
};
const { splitQuestionBlocks } = parserModule;

interface Patch {
  pitfall?: string;
  followup?: string;
}

const { dryRun, onlyFile } = parseCommonScriptArgs(process.argv.slice(2));

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
const files = resolveOnlyContentFiles(
  readdirSync(CONTENT_DIR).filter((f) => /^\d.*\.md$/.test(f)),
  onlyFile,
);

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
  const parsed = splitQuestionBlocks(text);
  if (!parsed.blocks.length) continue;

  const categoryId = file.replace(/\.md$/, '');
  const rewritten = parsed.blocks.map((block) => {
    const key = `${categoryId}/${block.slug}`;
    const patch = patches[key];
    if (!patch) {
      return block.raw;
    }
    seen.add(key);

    let work = block.raw;
    const segments: string[] = [];

    if (patch.pitfall && !block.sections['常见误区']) {
      segments.push(`### 常见误区\n${patch.pitfall.trim()}\n`);
      stat.added++;
    } else if (patch.pitfall) {
      stat.skipped++;
    }

    if (patch.followup && !block.sections['追问']) {
      segments.push(`### 追问\n${patch.followup.trim()}\n`);
      stat.added++;
    } else if (patch.followup) {
      stat.skipped++;
    }

    if (!segments.length) {
      return block.raw;
    }

    const inject = '\n' + segments.join('\n') + '\n';
    const extraIdx = work.search(/^### 延伸\s*$/m);
    if (extraIdx >= 0) {
      work = work.slice(0, extraIdx) + inject + work.slice(extraIdx);
    } else {
      work = work.replace(/\s*$/, '') + '\n' + inject;
    }
    return work;
  });
  const out = `${parsed.before}${rewritten.join('\n')}`;
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
