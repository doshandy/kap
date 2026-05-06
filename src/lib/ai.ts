import type { Question } from '@/types/content';
import { stripHtml } from '@/composables/useSpeech';

export function buildPrompt(q: Question): string {
  const lines = [
    '请作为一位资深前端面试官，针对以下题目给出更加深入、结构化的讲解。',
    '请覆盖：核心原理、常见陷阱、生产实战、面试官追问、对比方案。',
    '',
    `题目（${q.categoryId} / ${q.title}）：`,
    stripHtml(q.question),
    '',
    '我已掌握的答案要点：',
    stripHtml(q.answer).slice(0, 800),
  ];
  return lines.join('\n');
}

export function chatGptUrl(prompt: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
