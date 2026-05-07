import { exportAll, importAll } from '@/stores/persist';
import type { Question } from '@/types/content';

export function exportQuestionMarkdown(q: Question): void {
  const md = q.raw;
  const blob = new Blob([md], { type: 'text/markdown' });
  triggerDownload(blob, `${q.categoryId}-${q.slug}.md`);
}

/**
 * 把若干题目合并导出为单个 markdown 文件（"面试小抄"）。
 */
export function exportQuestionsToMarkdown(qs: Question[], filename = 'kap-cheatsheet.md'): void {
  const head = `# KAP 面试小抄\n\n生成于 ${new Date().toLocaleString()}，共 ${qs.length} 道题\n\n---\n\n`;
  const body = qs.map((q) => q.raw).join('\n\n---\n\n');
  const blob = new Blob([head + body], { type: 'text/markdown' });
  triggerDownload(blob, filename);
}

/**
 * 导出 Anki TSV：第一列正面（题面），第二列背面（答案 + 一句话）
 * 用 \t 分隔列、\n 分隔行；卡片内部换行用 <br>
 */
export function exportQuestionsToAnkiTSV(qs: Question[], filename = 'kap-anki.tsv'): void {
  const escape = (s: string) => s.replace(/\r?\n/g, '<br>').replace(/\t/g, ' ').replace(/"/g, '""');
  const lines = qs.map((q) => {
    const front = `${q.title}（${q.categoryId}）`;
    const back = [q.summary ? '【一句话】' + stripTags(q.summary) : '', stripTags(q.answer)]
      .filter(Boolean)
      .join('<br><br>');
    return `"${escape(front)}"\t"${escape(back)}"`;
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/tab-separated-values' });
  triggerDownload(blob, filename);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function backupJSON(): void {
  const data = exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const dt = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `kap-backup-${dt}.json`);
}

export async function restoreJSON(file: File): Promise<boolean> {
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    return importAll(data);
  } catch {
    return false;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
