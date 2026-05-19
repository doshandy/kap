import { describe, expect, it } from 'vitest';
import {
  findInvalidQuestionHeadings,
  formatInlineList,
  parseInlineList,
  parseSections,
  readMeta,
  splitQuestionBlocks,
} from './contentBlockParser';

describe('contentBlockParser', () => {
  it('splitQuestionBlocks 会跳过代码块里的 ## 标题', () => {
    const source = `## real-question
title: 真题
tags: [A, B]

### 题目
\`\`\`md
## fake-question
\`\`\`

### 答案要点
- ok

## second-question
title: 第二题

### 题目
text
`;
    const { blocks } = splitQuestionBlocks(source);
    expect(blocks.map((block) => block.slug)).toEqual(['real-question', 'second-question']);
    expect(readMeta(blocks[0].metaText, 'title')).toBe('真题');
  });

  it('parseSections 会跳过代码块里的 ### 子标题', () => {
    const raw = `## q
title: demo

### 题目
\`\`\`md
### 答案要点
\`\`\`

### 答案要点
真实答案
`;
    const sections = parseSections(raw);
    expect(Object.keys(sections)).toEqual(['题目', '答案要点']);
    expect(sections['答案要点']).toBe('真实答案');
  });

  it('会识别并拒绝非法题目 H2 slug', () => {
    const source = `## good-slug
title: 合法

### 题目
ok

## Invalid Slug
title: 非法

### 题目
bad
`;
    expect(findInvalidQuestionHeadings(source)).toEqual([{ line: 7, text: 'Invalid Slug' }]);
    expect(() => splitQuestionBlocks(source)).toThrow(/非法题目标题/);
  });

  it('inline list 读写保持一致', () => {
    expect(parseInlineList('[A, B, C]')).toEqual(['A', 'B', 'C']);
    expect(parseInlineList('single')).toEqual(['single']);
    expect(formatInlineList(['A', 'B'])).toBe('[A, B]');
  });
});
