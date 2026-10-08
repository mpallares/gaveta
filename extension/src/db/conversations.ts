import {
  conversationKey,
  type ConversationKey,
  type ConversationSummary,
  type VendorId,
} from '@gaveta/shared';
import { getDb, type ConversationMeta } from './schema';

export async function listConversationMeta(vendorId?: VendorId): Promise<ConversationMeta[]> {
  const db = getDb();
  const rows = vendorId
    ? await db.conversations_meta.where('vendorId').equals(vendorId).toArray()
    : await db.conversations_meta.toArray();
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversationMeta(
  key: ConversationKey,
): Promise<ConversationMeta | undefined> {
  return getDb().conversations_meta.get(key);
}

/**
 * Merges freshly listed summaries into the table. Keeps pins, tags and index
 * markers. Returns the keys whose content is stale and needs (re)indexing.
 */
export async function upsertSummaries(
  vendorId: VendorId,
  summaries: ConversationSummary[],
): Promise<ConversationKey[]> {
  const db = getDb();
  const now = Date.now();
  const stale: ConversationKey[] = [];
  await db.transaction('rw', db.conversations_meta, async () => {
    const keys = summaries.map((s) => conversationKey(vendorId, s.id));
    const existing = await db.conversations_meta.bulkGet(keys);
    const rows: ConversationMeta[] = summaries.map((s, i) => {
      const key = keys[i] as ConversationKey;
      const prev = existing[i];
      const row: ConversationMeta = {
        id: key,
        vendorId,
        conversationId: s.id,
        title: s.title,
        createdAt: s.createdAt || prev?.createdAt || now,
        updatedAt: s.updatedAt || prev?.updatedAt || now,
        indexedUpdatedAt: prev?.indexedUpdatedAt ?? null,
        messageCount: prev?.messageCount ?? 0,
        pinned: prev?.pinned ?? 0,
        pinnedAt: prev?.pinnedAt ?? null,
        tagIds: prev?.tagIds ?? [],
        preview: prev?.preview ?? '',
        lastSeenAt: now,
      };
      if (row.indexedUpdatedAt === null || row.updatedAt > row.indexedUpdatedAt) stale.push(key);
      return row;
    });
    await db.conversations_meta.bulkPut(rows);
  });
  return stale;
}

export async function markIndexed(
  key: ConversationKey,
  info: { updatedAt: number; messageCount: number; preview: string },
): Promise<void> {
  await getDb().conversations_meta.update(key, {
    indexedUpdatedAt: info.updatedAt,
    messageCount: info.messageCount,
    preview: info.preview,
  });
}

export async function setPinned(key: ConversationKey, pinned: boolean): Promise<void> {
  await getDb().conversations_meta.update(key, {
    pinned: pinned ? 1 : 0,
    pinnedAt: pinned ? Date.now() : null,
  });
}

export async function listPinned(vendorId?: VendorId): Promise<ConversationMeta[]> {
  const db = getDb();
  const rows = vendorId
    ? await db.conversations_meta.where('[vendorId+pinned]').equals([vendorId, 1]).toArray()
    : await db.conversations_meta.where('pinned').equals(1).toArray();
  return rows.sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
}
