import type { Conversation, MessageRole } from '@gaveta/shared';

const ROLE_LABEL: Record<MessageRole, string> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
};

function fmtDate(ms: number | null): string {
  if (!ms) return '';
  return new Date(ms).toISOString();
}

export function toMarkdown(conversation: Conversation, vendorName: string): string {
  const lines: string[] = [];
  lines.push(`# ${conversation.title.trim() || 'Untitled conversation'}`);
  lines.push('');
  lines.push(`- Source: ${vendorName}`);
  lines.push(`- Conversation id: ${conversation.id}`);
  if (conversation.createdAt) lines.push(`- Created: ${fmtDate(conversation.createdAt)}`);
  if (conversation.updatedAt) lines.push(`- Updated: ${fmtDate(conversation.updatedAt)}`);
  lines.push(`- Messages: ${conversation.messages.length}`);
  lines.push('');
  for (const m of conversation.messages) {
    const when = m.ts ? ` (${fmtDate(m.ts)})` : '';
    lines.push(`## ${ROLE_LABEL[m.role]}${when}`);
    lines.push('');
    lines.push(m.text.trimEnd());
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
