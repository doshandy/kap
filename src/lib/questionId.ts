export function normalizeQuestionId(categoryId: string, value: string): string {
  const trimmed = value.trim();
  return trimmed.includes('/') ? trimmed : `${categoryId}/${trimmed}`;
}

export function shortenQuestionId(categoryId: string, value: string): string {
  return value.startsWith(`${categoryId}/`) ? value.slice(categoryId.length + 1) : value;
}
