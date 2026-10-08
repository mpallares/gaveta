import type { ConversationKey } from '@gaveta/shared';

export const DND_MIME = 'application/x-gaveta-conversation';

export function setDragKey(e: React.DragEvent, key: ConversationKey): void {
  e.dataTransfer.setData(DND_MIME, key);
  e.dataTransfer.setData('text/plain', key);
  e.dataTransfer.effectAllowed = 'move';
}

export function readDragKey(e: React.DragEvent): ConversationKey | null {
  const v = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData('text/plain');
  return v && v.includes(':') ? (v as ConversationKey) : null;
}

export function isConversationDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(DND_MIME);
}
