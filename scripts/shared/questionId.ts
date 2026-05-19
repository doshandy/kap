const questionIdModule = (await import(
  new URL('../../src/lib/questionId.ts', import.meta.url).href
)) as {
  normalizeQuestionId(categoryId: string, value: string): string;
  shortenQuestionId(categoryId: string, value: string): string;
};

export const normalizeQuestionId = questionIdModule.normalizeQuestionId;
export const shortenQuestionId = questionIdModule.shortenQuestionId;
