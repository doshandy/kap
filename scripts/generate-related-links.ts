import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const write = args.includes('--write');
const dryRun = !write || args.includes('--dry') || args.includes('--dry-run');
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const onlyFile = onlyArg ? onlyArg.slice('--only='.length) : '';
const CONTENT_DIR = join(process.cwd(), 'content');
const MAX_LINKS_PER_QUESTION = 3;

interface Block {
  file: string;
  categoryId: string;
  slug: string;
  id: string;
  raw: string;
  metaText: string;
  title: string;
  difficulty: string;
  tags: string[];
  isFollowup: boolean;
  links: string[];
}

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

function normalizeId(categoryId: string, value: string): string {
  const trimmed = value.trim();
  return trimmed.includes('/') ? trimmed : `${categoryId}/${trimmed}`;
}

function categoryIdFromFrontmatter(raw: string, file: string): string {
  return raw.match(/^id\s*:\s*(.+)$/m)?.[1]?.trim() || file.replace(/\.md$/, '');
}

function splitBlocks(file: string, content: string): { before: string; blocks: Block[] } {
  const categoryId = categoryIdFromFrontmatter(content, file);
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
    const links = parseInlineList(
      readMeta(metaText, 'links') || readMeta(metaText, 'relatedQuestionIds') || '[]',
    ).map((id) => normalizeId(categoryId, id));
    blocks.push({
      file,
      categoryId,
      slug: heads[i].slug,
      id: `${categoryId}/${heads[i].slug}`,
      raw,
      metaText,
      title: readMeta(metaText, 'title') || heads[i].slug,
      difficulty: readMeta(metaText, 'difficulty') || '进阶',
      tags: parseInlineList(readMeta(metaText, 'tags') || '[]'),
      isFollowup: /^parent(Id)?\s*:/m.test(metaText),
      links,
    });
  }

  return { before: heads.length ? content.slice(0, heads[0].index) : content, blocks };
}

function hasStrongKeyword(block: Block, patterns: RegExp[]): boolean {
  const hay = `${block.slug} ${block.title} ${block.tags.join(' ')}`.toLowerCase();
  return patterns.some((pattern) => pattern.test(hay));
}

function withLinksMeta(block: Block, links: string[]): string {
  const shortLinks = links.map((id) =>
    id.startsWith(`${block.categoryId}/`) ? id.slice(block.categoryId.length + 1) : id,
  );
  const line = `links: ${formatInlineList(shortLinks)}`;
  const existing =
    block.raw.match(/^links\s*:.*$/m) || block.raw.match(/^relatedQuestionIds\s*:.*$/m);
  if (existing?.index != null) {
    return block.raw.replace(/^links\s*:.*$/m, line).replace(/^relatedQuestionIds\s*:.*$/m, line);
  }

  const anchors = [
    /^followups\s*:.*$/m,
    /^followupQuestionIds\s*:.*$/m,
    /^tags\s*:.*$/m,
    /^difficulty\s*:.*$/m,
    /^title\s*:.*$/m,
  ];
  for (const anchor of anchors) {
    const match = block.raw.match(anchor);
    if (match?.index != null) {
      const insertAt = match.index + match[0].length;
      return `${block.raw.slice(0, insertAt)}\n${line}${block.raw.slice(insertAt)}`;
    }
  }
  const firstLineEnd = block.raw.indexOf('\n') + 1;
  return `${block.raw.slice(0, firstLineEnd)}${line}\n${block.raw.slice(firstLineEnd)}`;
}

const seedPairs: [string, string][] = [
  ['01-javascript/promise-all-allsettled-race-any', '20-algorithm/promise-all-impl'],
  ['01-javascript/debounce-throttle', '20-algorithm/debounce-throttle-handwritten'],
  ['01-javascript/deep-clone', '21-interview-special/handwrite-deep-clone-circular'],
  ['01-javascript/structured-clone', '01-javascript/deep-clone'],
  ['01-javascript/proxy-reflect', '03-vue/effect-track-trigger'],
  ['02-typescript/generic-constraints', '02-typescript/conditional-distribution'],
  ['02-typescript/conditional-distribution', '02-typescript/infer-extract'],
  ['02-typescript/tsconfig-strict', '10-architecture/type-safe-api-contract'],
  ['03-vue/reactivity-core', '03-vue/effect-track-trigger'],
  ['03-vue/effect-track-trigger', '03-vue/scheduler-nexttick'],
  ['03-vue/diff-optimization', '03-vue/vapor-mode'],
  ['03-vue/vue-performance-practice', '08-performance/runtime-optimization'],
  ['04-css/animation-compositor', '19-visualization/animation-raf'],
  ['04-css/native-popover-dialog-anchor', '14-a11y-i18n/focus-keyboard'],
  ['05-browser/render-pipeline', '08-performance/core-web-vitals'],
  ['05-browser/reflow-vs-repaint', '04-css/animation-compositor'],
  ['05-browser/browser-cache-strategy', '06-network/caching'],
  ['05-browser/service-worker', '17-build-publish/sw-update-strategies'],
  ['06-network/tcp-tls-http', '06-network/http1-http2-http3'],
  ['06-network/upload-download', '21-interview-special/design-upload-system'],
  ['06-network/websocket-sse', '11-ai-frontend/llm-streaming-protocols'],
  [
    '06-network/websocket-vs-sse-vs-polling',
    '28-customer-service-im/websocket-heartbeat-reconnect',
  ],
  ['07-engineering/vite-principle', '07-engineering/webpack-vs-vite'],
  ['07-engineering/package-publishing', '17-build-publish/tree-shaking-deep'],
  ['07-engineering/semver-commit-governance', '17-build-publish/semver-release'],
  ['08-performance/core-web-vitals', '16-observability/rum-web-vitals'],
  ['08-performance/long-task-scheduling', '16-observability/tbt-and-long-task-collection'],
  ['08-performance/bundle-split-strategy', '17-build-publish/bundle-optimization-tactics'],
  ['10-architecture/component-library', '14-a11y-i18n/form-accessibility'],
  ['10-architecture/feature-flag', '16-observability/frontend-feature-flag'],
  ['10-architecture/islands-rsc', '22-react/react-server-components'],
  ['11-ai-frontend/llm-basic-concepts', '11-ai-frontend/llm-token-and-pricing'],
  [
    '11-ai-frontend/llm-context-window-and-truncation',
    '11-ai-frontend/llm-multi-turn-memory-pattern',
  ],
  ['11-ai-frontend/prompt-injection', '13-security/xss'],
  ['11-ai-frontend/llm-eval-pipeline', '15-testing/test-pyramid'],
  ['13-security/xss', '13-security/csp-trusted-types'],
  ['13-security/auth-token-jwt', '24-fullstack-meta/fullstack-auth-strategy'],
  ['16-observability/error-capture', '21-interview-special/design-monitoring-sdk'],
  ['19-visualization/canvas-svg', '19-visualization/canvas-vs-svg-vs-webgl'],
  ['19-visualization/chart-performance', '27-data-platform-cases/g2-charts-perf'],
  ['20-algorithm/frontend-real-world', '21-interview-special/design-virtual-list'],
  ['21-interview-special/design-realtime-collab', '10-architecture/local-first-sync-crdt'],
  ['22-react/react-hooks-rules', '22-react/use-effect-pitfalls'],
  ['22-react/react-server-components', '24-fullstack-meta/next-data-fetching-patterns'],
  ['22-react/react-key-warning', '22-react/react-keys-list-basic'],
  ['23-framework-compare/rendering-strategy', '24-fullstack-meta/ssr-csr-ssg-isr'],
  ['23-framework-compare/hydration-vs-resumability', '24-fullstack-meta/hydration-mismatch-debug'],
  ['25-rust-wasm/wasm-fundamentals', '25-rust-wasm/js-wasm-data-bridge'],
  ['26-browser-extension/manifest-v3', '26-browser-extension/extension-csp-remote-code'],
  [
    '27-data-platform-cases/big-table-virtualization',
    '28-customer-service-im/chat-perf-virtual-list',
  ],
  ['28-customer-service-im/chat-rich-text-safe-render', '13-security/xss'],
  ['28-customer-service-im/e2ee-web-crypto', '13-security/web-crypto-fundamentals'],
];

const keywordGroups: RegExp[][] = [
  [/event[- ]?loop|事件循环/],
  [/promise(?!.*prompt)|allsettled|race|any/],
  [/debounce|throttle|防抖|节流/],
  [/deep[- ]?clone|structured[- ]?clone|深拷贝/],
  [/proxy|reflect/],
  [/reactivity/],
  [/scheduler|nexttick|批量更新/],
  [/service[- ]?worker|sw[- ]?update|bfcache/],
  [/websocket|sse|stream|流式|heartbeat|reconnect/],
  [/vite|webpack|rolldown|esbuild/],
  [/core[- ]?web[- ]?vitals|lcp|inp|cls|rum|long[- ]?task|tbt/],
  [/xss|csp|trusted[- ]?types|sanitize|富文本/],
  [/jwt|auth|鉴权|oauth|cookie|csrf/],
  [/rsc|server[- ]?components|next|hydration|ssr|isr|ppr/],
  [/virtual[- ]?list|虚拟列表|virtualization/],
  [/crdt|local[- ]?first|协作|collab/],
  [/web[- ]?crypto|e2ee|加密/],
  [/popover|dialog|focus|keyboard|a11y|无障碍/],
  [/canvas|svg|webgl|echarts|d3|图表|可视化/],
  [/openapi|trpc|graphql|契约|codegen/],
  [/token|pricing|成本|模型路由|eval|prompt|rag|embedding|agent/],
];

const files = readdirSync(CONTENT_DIR)
  .filter((file) => /^\d.*\.md$/.test(file))
  .filter((file) => (onlyFile ? file === onlyFile : true))
  .sort();

const parsed = files.map((file) => {
  const raw = readFileSync(join(CONTENT_DIR, file), 'utf8');
  return { file, raw, ...splitBlocks(file, raw) };
});
const allBlocks = parsed.flatMap((item) => item.blocks);
const byId = new Map(allBlocks.map((block) => [block.id, block]));
const linksById = new Map<string, Set<string>>();

function ensure(id: string): Set<string> {
  let set = linksById.get(id);
  if (!set) {
    set = new Set(byId.get(id)?.links || []);
    linksById.set(id, set);
  }
  return set;
}

function addLink(from: string, to: string): void {
  const source = byId.get(from);
  const target = byId.get(to);
  if (!source || !target || source.isFollowup || target.isFollowup || from === to) return;
  const set = ensure(from);
  if (set.size >= MAX_LINKS_PER_QUESTION && !set.has(to)) return;
  set.add(to);
}

for (const [a, b] of seedPairs) {
  addLink(a, b);
  addLink(b, a);
}

for (const patterns of keywordGroups) {
  const matches = allBlocks
    .filter((block) => !block.isFollowup && hasStrongKeyword(block, patterns))
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.slug.localeCompare(b.slug))
    .slice(0, 8);
  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      const a = matches[i];
      const b = matches[j];
      if (a.categoryId === b.categoryId || a.tags.some((tag) => b.tags.includes(tag))) {
        addLink(a.id, b.id);
        addLink(b.id, a.id);
      }
    }
  }
}

let filesTouched = 0;
let questionsTouched = 0;
let linksWritten = 0;

for (const item of parsed) {
  const rewritten = item.blocks.map((block) => {
    const links = [...(linksById.get(block.id) || new Set(block.links))]
      .filter((id) => byId.has(id) && id !== block.id)
      .slice(0, MAX_LINKS_PER_QUESTION);
    if (!links.length) return block.raw;
    linksWritten += links.length;
    if (links.join('|') !== block.links.join('|')) questionsTouched++;
    return withLinksMeta(block, links);
  });
  const output = `${item.before}${rewritten.join('\n')}`;
  if (output !== item.raw) {
    filesTouched++;
    if (!dryRun) writeFileSync(join(CONTENT_DIR, item.file), output);
  }
}

console.log(
  `已${dryRun ? '预览' : '写入'}相关题目关联：影响 ${filesTouched} 个文件、${questionsTouched} 道题、${linksWritten} 条 links。`,
);
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
