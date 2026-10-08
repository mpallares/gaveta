import type { Conversation, VendorId } from '@gaveta/shared';

export interface ConversationExportJson {
  format: 'gaveta.conversation';
  version: 1;
  exportedAt: string;
  vendor: VendorId;
  conversation: Conversation;
}

export function toJson(conversation: Conversation, vendorId: VendorId, now = new Date()): string {
  const payload: ConversationExportJson = {
    format: 'gaveta.conversation',
    version: 1,
    exportedAt: now.toISOString(),
    vendor: vendorId,
    conversation,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
