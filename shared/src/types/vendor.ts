export const VENDOR_IDS = ['chatgpt', 'claude', 'gemini', 'grok', 'mock'] as const;
export type VendorId = (typeof VENDOR_IDS)[number];

export function isVendorId(value: unknown): value is VendorId {
  return typeof value === 'string' && (VENDOR_IDS as readonly string[]).includes(value);
}

/** Stable cross-vendor key used everywhere in storage: `${vendorId}:${conversationId}`. */
export type ConversationKey = `${VendorId}:${string}`;

export function conversationKey(vendorId: VendorId, conversationId: string): ConversationKey {
  return `${vendorId}:${conversationId}`;
}

export function parseConversationKey(
  key: string,
): { vendorId: VendorId; conversationId: string } | null {
  const idx = key.indexOf(':');
  if (idx <= 0) return null;
  const vendorId = key.slice(0, idx);
  if (!isVendorId(vendorId)) return null;
  return { vendorId, conversationId: key.slice(idx + 1) };
}
