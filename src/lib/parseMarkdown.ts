import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import type { Category, Difficulty, Question } from '@/types/content';
import { parseInlineList, splitQuestionBlocks } from './contentBlockParser';
import { normalizeQuestionId } from './questionId';

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(str: string, lang: string): string {
    const language = lang === 'vue' ? 'markup' : lang;
    if (language && Prism.languages[language]) {
      try {
        const code = Prism.highlight(str, Prism.languages[language], language);
        return `<pre class="language-${language}"><code class="language-${language}">${code}</code></pre>`;
      } catch {
        // ignore
      }
    }
    return `<pre><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});
md.use(anchor, { permalink: false });

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName !== 'A') return;
  const el = node as HTMLAnchorElement;
  if (el.getAttribute('target') === '_blank') {
    el.setAttribute('rel', 'noopener noreferrer');
  }
});

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href') || '';
  const isExternal = /^(https?:)?\/\//i.test(href);
  const isUnsafe = /^\s*javascript:/i.test(href);
  if (isUnsafe) {
    token.attrSet('href', '#');
  }
  if (isExternal) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
    ADD_ATTR: ['target'],
  });
}

export function renderMarkdown(src: string): string {
  return sanitizeHtml(md.render(src));
}

interface RawCategoryFront {
  id: string;
  title: string;
  order: number;
  icon?: string;
  description?: string;
}

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val: unknown = m[2].trim();
    if (typeof val === 'string') {
      const s = val as string;
      if (s.startsWith('[') && s.endsWith(']')) {
        val = s
          .slice(1, -1)
          .split(',')
          .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else if (/^-?\d+(\.\d+)?$/.test(s)) {
        val = Number(s);
      } else {
        val = s.replace(/^['"]|['"]$/g, '');
      }
    }
    data[key] = val;
  }
  return { data, content: match[2] };
}

interface RawQuestionFront {
  title: string;
  difficulty?: Difficulty;
  tags?: string[];
  parent?: string;
  parentId?: string;
  followups?: string[];
  followupQuestionIds?: string[];
  links?: string[];
  relatedQuestionIds?: string[];
}

interface ParsedQuestionBlock {
  slug: string;
  meta: RawQuestionFront;
  sections: Record<string, string>;
  raw: string;
}

function normalizeQuestionIds(
  categoryId: string,
  value: string[] | undefined,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value.map((item) => normalizeQuestionId(categoryId, item)).filter(Boolean);
  return ids.length ? ids : undefined;
}

function parseQuestionMeta(metaText: string): RawQuestionFront {
  const meta: Record<string, unknown> = {};
  for (const line of metaText.split(/\r?\n/)) {
    const match = line.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2].trim();
    meta[key] =
      rawValue.startsWith('[') && rawValue.endsWith(']')
        ? parseInlineList(rawValue)
        : rawValue.replace(/^['"]|['"]$/g, '');
  }
  return { title: '', ...(meta as Partial<RawQuestionFront>) };
}

function splitQuestions(body: string): ParsedQuestionBlock[] {
  const { blocks } = splitQuestionBlocks(body);
  return blocks.map((block) => ({
    slug: block.slug,
    meta: parseQuestionMeta(block.metaText),
    sections: block.sections,
    raw: block.raw,
  }));
}

export function parseCategoryMarkdown(raw: string): Category {
  const { data, content } = parseFrontmatter(raw);
  const front = data as unknown as RawCategoryFront;
  if (!front.id || !front.title || front.order == null) {
    throw new Error(`分类 frontmatter 缺少 id/title/order: ${JSON.stringify(front)}`);
  }
  const blocks = splitQuestions(content);
  const questions: Question[] = blocks.map((b) => {
    if (!b.meta.title) {
      throw new Error(`题目 ${front.id}/${b.slug} 缺少 title`);
    }
    const difficulty: Difficulty = (b.meta.difficulty as Difficulty) || '进阶';
    const tags = Array.isArray(b.meta.tags) ? b.meta.tags : [];
    const parentValue = b.meta.parentId || b.meta.parent;
    const followupValues = b.meta.followupQuestionIds || b.meta.followups;
    const relatedValues = b.meta.relatedQuestionIds || b.meta.links;
    return {
      id: `${front.id}/${b.slug}`,
      categoryId: front.id,
      slug: b.slug,
      title: b.meta.title,
      difficulty,
      tags,
      summary: b.sections['一句话'] ? renderMarkdown(b.sections['一句话']) : undefined,
      question: renderMarkdown(b.sections['题目'] || ''),
      answer: renderMarkdown(b.sections['答案要点'] || ''),
      code: b.sections['代码示例'] ? renderMarkdown(b.sections['代码示例']) : undefined,
      pitfall: b.sections['常见误区'] ? renderMarkdown(b.sections['常见误区']) : undefined,
      followup: b.sections['追问'] ? renderMarkdown(b.sections['追问']) : undefined,
      parentId: parentValue ? normalizeQuestionId(front.id, parentValue) : undefined,
      followupQuestionIds: normalizeQuestionIds(front.id, followupValues),
      relatedQuestionIds: normalizeQuestionIds(front.id, relatedValues),
      extra: b.sections['延伸'] ? renderMarkdown(b.sections['延伸']) : undefined,
      raw: b.raw,
    };
  });

  return {
    id: front.id,
    title: front.title,
    order: front.order,
    icon: front.icon || '📘',
    description: front.description,
    questions,
  };
}

export { md as markdown };
