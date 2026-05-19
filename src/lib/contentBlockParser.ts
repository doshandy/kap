export const DEFAULT_SECTION_NAMES = [
  '一句话',
  '题目',
  '答案要点',
  '代码示例',
  '常见误区',
  '追问',
  '延伸',
] as const;

const QUESTION_HEADING_RE = /^##\s+([a-z][a-z0-9-]*)\s*$/;
const QUESTION_HEADING_CANDIDATE_RE = /^##(?!#)\s+(.+?)\s*$/;
const LINE_RE = /.*(?:\r?\n|$)/g;
const FENCE_RE = /^(`{3,}|~{3,})/;

export interface ContentQuestionBlock {
  slug: string;
  raw: string;
  metaText: string;
  sections: Record<string, string>;
}

export interface InvalidQuestionHeading {
  line: number;
  text: string;
}

interface SectionHeading {
  name: string;
  start: number;
  end: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseLine(raw: string): string {
  return raw.replace(/\r?\n$/, '');
}

function scanQuestionHeadings(content: string): {
  valid: { slug: string; index: number }[];
  invalid: InvalidQuestionHeading[];
} {
  const valid: { slug: string; index: number }[] = [];
  const invalid: InvalidQuestionHeading[] = [];
  let inFence = false;
  let fenceMarker = '';
  let lineNumber = 0;

  for (const match of content.matchAll(LINE_RE)) {
    const full = match[0];
    if (!full) continue;
    lineNumber++;
    const index = match.index || 0;
    const line = parseLine(full);

    if (!inFence) {
      const validHeading = line.match(QUESTION_HEADING_RE);
      if (validHeading) {
        valid.push({ slug: validHeading[1], index });
      } else {
        const invalidHeading = line.match(QUESTION_HEADING_CANDIDATE_RE);
        if (invalidHeading) {
          invalid.push({ line: lineNumber, text: invalidHeading[1].trim() });
        }
      }
    }

    const fence = line.match(FENCE_RE);
    if (!fence) continue;
    if (!inFence) {
      inFence = true;
      fenceMarker = fence[1];
    } else if (fence[1].length >= fenceMarker.length) {
      inFence = false;
      fenceMarker = '';
    }
  }

  return { valid, invalid };
}

export function findInvalidQuestionHeadings(content: string): InvalidQuestionHeading[] {
  return scanQuestionHeadings(content).invalid;
}

function scanSectionHeadings(raw: string, sectionNames: readonly string[]): SectionHeading[] {
  const escaped = sectionNames.map((name) => escapeRegExp(name)).join('|');
  const headingRe = new RegExp(`^###\\s+(${escaped})\\s*$`);
  const headings: SectionHeading[] = [];
  let inFence = false;
  let fenceMarker = '';

  for (const match of raw.matchAll(LINE_RE)) {
    const full = match[0];
    if (!full) continue;
    const index = match.index || 0;
    const line = parseLine(full);
    if (!inFence) {
      const head = line.match(headingRe);
      if (head) headings.push({ name: head[1], start: index, end: index + full.length });
    }
    const fence = line.match(FENCE_RE);
    if (!fence) continue;
    if (!inFence) {
      inFence = true;
      fenceMarker = fence[1];
    } else if (fence[1].length >= fenceMarker.length) {
      inFence = false;
      fenceMarker = '';
    }
  }

  return headings;
}

export function parseSections(
  raw: string,
  sectionNames: readonly string[] = DEFAULT_SECTION_NAMES,
): Record<string, string> {
  const headings = scanSectionHeadings(raw, sectionNames);
  const sections: Record<string, string> = {};
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const end = i + 1 < headings.length ? headings[i + 1].start : raw.length;
    sections[current.name] = raw.slice(current.end, end).trim();
  }
  return sections;
}

export function splitQuestionBlocks(
  content: string,
  sectionNames: readonly string[] = DEFAULT_SECTION_NAMES,
): { before: string; blocks: ContentQuestionBlock[] } {
  const { valid: headings, invalid } = scanQuestionHeadings(content);
  if (invalid.length) {
    const first = invalid[0];
    throw new Error(
      `检测到非法题目标题（仅允许小写 slug，如 "## vue-reactivity"）：第 ${first.line} 行 "## ${first.text}"`,
    );
  }

  const blocks: ContentQuestionBlock[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : content.length;
    const raw = content.slice(start, end).replace(/\s+$/, '\n');
    const sectionHeadings = scanSectionHeadings(raw, sectionNames);
    const firstSectionIndex = sectionHeadings[0]?.start ?? raw.length;
    blocks.push({
      slug: headings[i].slug,
      raw,
      metaText: raw.slice(0, firstSectionIndex),
      sections: parseSections(raw, sectionNames),
    });
  }

  return {
    before: headings.length ? content.slice(0, headings[0].index) : content,
    blocks,
  };
}

export function parseInlineList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const match = trimmed.match(/^\[([^\]]*)\]$/);
  if (!match) return [trimmed.replace(/^['"]|['"]$/g, '')].filter(Boolean);
  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

export function formatInlineList(values: string[]): string {
  return `[${values.join(', ')}]`;
}

export function readMeta(metaText: string, key: string): string | undefined {
  const match = metaText.match(new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
}
