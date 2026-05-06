import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { exportAll, importAll } from '@/stores/persist';
import type { Question } from '@/types/content';

export async function exportElementToPDF(el: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / canvas.height;
  let imgW = pageW - 16;
  let imgH = imgW / ratio;
  if (imgH > pageH - 16) {
    imgH = pageH - 16;
    imgW = imgH * ratio;
  }
  pdf.addImage(imgData, 'PNG', 8, 8, imgW, imgH);
  pdf.save(filename);
}

export function exportQuestionMarkdown(q: Question): void {
  const md = q.raw;
  const blob = new Blob([md], { type: 'text/markdown' });
  triggerDownload(blob, `${q.categoryId}-${q.slug}.md`);
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
