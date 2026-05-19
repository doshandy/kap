import matter from 'gray-matter';

export function categoryIdFromFrontmatter(raw: string, fileName: string): string {
  const { data } = matter(raw);
  const frontId = typeof data.id === 'string' ? data.id.trim() : '';
  return frontId || fileName.replace(/\.md$/, '');
}
