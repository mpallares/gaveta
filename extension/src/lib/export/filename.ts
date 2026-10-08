import type { ExportFormat } from '@gaveta/shared';

const EXT: Record<ExportFormat, string> = { markdown: 'md', json: 'json' };
export const MIME: Record<ExportFormat, string> = {
  markdown: 'text/markdown;charset=utf-8',
  json: 'application/json;charset=utf-8',
};

/** Filesystem-safe slug. Keeps unicode letters, collapses everything else to `-`. */
export function slugify(title: string, maxLen = 60): string {
  const slug = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, maxLen)
    .replace(/-+$/g, '');
  return slug === '' ? 'conversation' : slug;
}

export function exportFilename(title: string, format: ExportFormat, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `${day}-${slugify(title)}.${EXT[format]}`;
}
