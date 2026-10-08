import type { ExportFile } from '@gaveta/shared';

/** Triggers a browser download from the page context. No `downloads` permission needed. */
export function downloadFile(file: ExportFile, doc: Document = document): void {
  const blob = new Blob([file.content], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = file.filename;
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
