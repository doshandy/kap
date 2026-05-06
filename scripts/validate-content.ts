import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = new URL('../content/', import.meta.url).pathname;

const errs: string[] = [];

const files = readdirSync(ROOT).filter((f) => f.endsWith('.md'));
if (!files.length) {
  errs.push(`content/ 目录为空，没有任何 *.md`);
}

const seenIds = new Set<string>();

for (const f of files) {
  const raw = readFileSync(join(ROOT, f), 'utf-8');
  const { data, content } = matter(raw);
  const front = data as { id?: string; title?: string; order?: number };
  if (!front.id) errs.push(`${f}: frontmatter 缺少 id`);
  if (!front.title) errs.push(`${f}: frontmatter 缺少 title`);
  if (front.order == null) errs.push(`${f}: frontmatter 缺少 order`);
  if (front.id) {
    if (seenIds.has(front.id)) errs.push(`${f}: 分类 id 重复: ${front.id}`);
    seenIds.add(front.id);
  }

  const lines = content.split(/\r?\n/);
  let inBlock = false;
  let curSlug = '';
  let hasTitleMeta = false;
  let hasQuestion = false;
  let hasAnswer = false;
  const slugs = new Set<string>();

  for (const ln of lines) {
    const m = ln.match(/^##\s+([\w\u4e00-\u9fa5-]+)\s*$/);
    if (m) {
      if (inBlock) {
        if (!hasTitleMeta) errs.push(`${f}: ${curSlug} 缺少 title 元数据`);
        if (!hasQuestion) errs.push(`${f}: ${curSlug} 缺少 ### 题目`);
        if (!hasAnswer) errs.push(`${f}: ${curSlug} 缺少 ### 答案要点`);
      }
      curSlug = m[1];
      if (slugs.has(curSlug)) errs.push(`${f}: slug 重复: ${curSlug}`);
      slugs.add(curSlug);
      inBlock = true;
      hasTitleMeta = false;
      hasQuestion = false;
      hasAnswer = false;
      continue;
    }
    if (!inBlock) continue;
    if (/^title\s*:/.test(ln)) hasTitleMeta = true;
    if (/^###\s+题目/.test(ln)) hasQuestion = true;
    if (/^###\s+答案要点/.test(ln)) hasAnswer = true;
  }
  if (inBlock) {
    if (!hasTitleMeta) errs.push(`${f}: ${curSlug} 缺少 title 元数据`);
    if (!hasQuestion) errs.push(`${f}: ${curSlug} 缺少 ### 题目`);
    if (!hasAnswer) errs.push(`${f}: ${curSlug} 缺少 ### 答案要点`);
  }
}

if (errs.length) {
  console.error('❌ 内容校验失败：');
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✅ 内容校验通过：${files.length} 个分类文件`);
