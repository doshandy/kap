import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = new URL('../content/', import.meta.url).pathname;
const OUT = new URL('../public/sitemap.xml', import.meta.url).pathname;
const SITE = 'https://doshandy.github.io/kap';

const staticPaths = ['/', '/learn', '/quiz', '/review', '/roadmap', '/changelog', '/settings'];

const files = readdirSync(ROOT).filter((file) => file.endsWith('.md')).sort();

const questionPaths: string[] = [];
const categoryPaths: string[] = [];

for (const file of files) {
  const raw = readFileSync(join(ROOT, file), 'utf-8');
  const { data, content } = matter(raw);
  const categoryId = (data as { id?: string }).id;
  if (!categoryId) continue;
  categoryPaths.push(`/c/${categoryId}`);

  for (const line of content.split(/\r?\n/)) {
    const matched = line.match(/^##\s+([a-z][a-z0-9-]*)\s*$/);
    if (matched) {
      questionPaths.push(`/q/${categoryId}/${matched[1]}`);
    }
  }
}

const urls = [...new Set([...staticPaths, ...categoryPaths, ...questionPaths])];
const lastmod = new Date().toISOString().slice(0, 10);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (path) => `  <url><loc>${SITE}${path}</loc><lastmod>${lastmod}</lastmod></url>`,
  ),
  '</urlset>',
  '',
].join('\n');

writeFileSync(OUT, xml, 'utf-8');
console.log(`✅ sitemap 已生成：${urls.length} 个 URL`);
