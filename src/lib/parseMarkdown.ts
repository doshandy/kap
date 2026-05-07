import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
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
}

const QUESTION_HEADING_RE = /^##\s+([a-z][a-z0-9-]*)\s*$/;
const SUBSECTION_RE = /^###\s+(一句话|题目|答案要点|代码示例|常见误区|追问|延伸)\s*$/;

interface ParsedQuestionBlock {
  slug: string;
  meta: RawQuestionFront;
  sections: Record<string, string>;
  raw: string;
}

function splitQuestions(body: string): ParsedQuestionBlock[] {
  const lines = body.split(/\r?\n/);
  const blocks: ParsedQuestionBlock[] = [];
  let current: ParsedQuestionBlock | null = null;
  let currentSection: string | null = null;
  let metaBuffer: string[] = [];
  let collectingMeta = false;

  const flushMeta = () => {
    if (!current) return;
    const obj: Record<string, unknown> = {};
    for (const ln of metaBuffer) {
      const m = ln.match(/^([\w-]+)\s*:\s*(.+)$/);
      if (!m) continue;
      const key = m[1];
      let val: unknown = m[2].trim();
      if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
        val = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
      obj[key] = val;
    }
    current.meta = { ...current.meta, ...(obj as unknown as RawQuestionFront) };
    metaBuffer = [];
    collectingMeta = false;
  };

  for (const line of lines) {
    const headMatch = line.match(QUESTION_HEADING_RE);
    if (headMatch) {
      if (current) {
        flushMeta();
        blocks.push(current);
      }
      current = {
        slug: headMatch[1],
        meta: { title: '' },
        sections: {},
        raw: line + '\n',
      };
      currentSection = null;
      collectingMeta = true;
      metaBuffer = [];
      continue;
    }
    if (!current) continue;
    current.raw += line + '\n';

    const subMatch = line.match(SUBSECTION_RE);
    if (subMatch) {
      flushMeta();
      currentSection = subMatch[1];
      current.sections[currentSection] = '';
      continue;
    }
    if (collectingMeta) {
      if (line.trim() === '') {
        if (metaBuffer.length > 0) flushMeta();
        continue;
      }
      metaBuffer.push(line);
      continue;
    }
    if (currentSection) {
      current.sections[currentSection] += line + '\n';
    }
  }
  if (current) {
    flushMeta();
    blocks.push(current);
  }
  return blocks;
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
    return {
      id: `${front.id}/${b.slug}`,
      categoryId: front.id,
      slug: b.slug,
      title: b.meta.title,
      difficulty,
      tags,
      summary: b.sections['一句话'] ? md.render(b.sections['一句话']) : undefined,
      question: md.render(b.sections['题目'] || ''),
      answer: md.render(b.sections['答案要点'] || ''),
      code: b.sections['代码示例'] ? md.render(b.sections['代码示例']) : undefined,
      pitfall: b.sections['常见误区'] ? md.render(b.sections['常见误区']) : undefined,
      followup: b.sections['追问'] ? md.render(b.sections['追问']) : undefined,
      extra: b.sections['延伸'] ? md.render(b.sections['延伸']) : undefined,
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
