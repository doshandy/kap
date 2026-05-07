import { describe, expect, it } from 'vitest';
import { parseCategoryMarkdown } from './parseMarkdown';

const sample = `---
id: cat-1
title: 测试分类
order: 1
icon: 🧪
description: 单测样例
---

## sample-q
title: 这是一道样题
difficulty: 进阶
tags: [测试, 高频]

### 一句话
一句话理解：测试就是测试。

### 题目
请回答这道题。

### 答案要点
- 要点 1
- 要点 2

### 代码示例
\`\`\`ts
const x: number = 1;
\`\`\`

### 常见误区
- 误区一
- 误区二

### 追问
- 追问 1
- 追问 2

### 延伸
- 延伸阅读
`;

describe('parseCategoryMarkdown', () => {
  it('解析出题目并填充全部七段内容', () => {
    const cat = parseCategoryMarkdown(sample);
    expect(cat.id).toBe('cat-1');
    expect(cat.title).toBe('测试分类');
    expect(cat.questions).toHaveLength(1);

    const q = cat.questions[0];
    expect(q.slug).toBe('sample-q');
    expect(q.title).toBe('这是一道样题');
    expect(q.difficulty).toBe('进阶');
    expect(q.tags).toEqual(['测试', '高频']);
    expect(q.summary).toContain('一句话理解');
    expect(q.question).toContain('回答这道题');
    expect(q.answer).toContain('要点 1');
    expect(q.code).toContain('language-ts');
    expect(q.pitfall).toContain('误区一');
    expect(q.followup).toContain('追问 1');
    expect(q.extra).toContain('延伸阅读');
  });

  it('题目缺失 一句话/常见误区/追问/延伸 时不报错', () => {
    const minimal = `---\nid: c\ntitle: t\norder: 1\nicon: 🧪\ndescription: x\n---\n\n## simple\ntitle: 简单题\ndifficulty: 基础\ntags: []\n\n### 题目\nQ?\n\n### 答案要点\nA。\n`;
    const cat = parseCategoryMarkdown(minimal);
    const q = cat.questions[0];
    expect(q.summary).toBeUndefined();
    expect(q.pitfall).toBeUndefined();
    expect(q.followup).toBeUndefined();
    expect(q.extra).toBeUndefined();
  });

  it('生成稳定的 raw 文本（拼装 H2 + 子段），用于全文搜索', () => {
    const cat = parseCategoryMarkdown(sample);
    const q = cat.questions[0];
    expect(q.raw).toContain('## sample-q');
    expect(q.raw).toContain('请回答这道题');
  });
});
