import {
  conversationKey,
  type AdapterError,
  type ConversationKey,
  type VendorAdapter,
} from '@gaveta/shared';
import { markIndexed, saveSerializedIndex, upsertSummaries } from '@/db';
import { log } from '@/lib/log';
import { docFromConversation, previewOf, type SearchIndex } from './SearchIndex';

export interface SyncProgress {
  done: number;
  total: number;
}

export interface SyncOptions {
  /** Max conversations to fetch per run, to stay polite with vendor APIs. */
  maxFetch?: number;
  concurrency?: number;
  onProgress?: (p: SyncProgress) => void;
  signal?: AbortSignal;
}

export type SyncOutcome =
  | { ok: true; listed: number; indexed: number; failed: number }
  | { ok: false; error: AdapterError };

/**
 * Lists conversations through the adapter, upserts metadata, then fetches and
 * indexes only the ones whose `updatedAt` moved since they were last indexed.
 */
export async function syncVendor(
  adapter: VendorAdapter,
  index: SearchIndex,
  opts: SyncOptions = {},
): Promise<SyncOutcome> {
  const listed = await adapter.listConversations();
  if (!listed.ok) return { ok: false, error: listed.error };

  const stale = await upsertSummaries(adapter.id, listed.value);
  const queue = stale.slice(0, opts.maxFetch ?? 200);
  const total = queue.length;
  let done = 0;
  let indexed = 0;
  let failed = 0;
  opts.onProgress?.({ done, total });

  const worker = async (): Promise<void> => {
    for (;;) {
      if (opts.signal?.aborted) return;
      const key = queue.shift();
      if (key === undefined) return;
      const ok = await indexOne(adapter, index, key);
      if (ok) indexed += 1;
      else failed += 1;
      done += 1;
      opts.onProgress?.({ done, total });
    }
  };
  const workers = Array.from({ length: Math.max(1, opts.concurrency ?? 2) }, worker);
  await Promise.all(workers);

  if (indexed > 0) await saveSerializedIndex(index.toJSON(), index.size);
  log.info('indexer', 'sync-complete', {
    vendor: adapter.id,
    listed: listed.value.length,
    indexed,
    failed,
  });
  return { ok: true, listed: listed.value.length, indexed, failed };
}

async function indexOne(
  adapter: VendorAdapter,
  index: SearchIndex,
  key: ConversationKey,
): Promise<boolean> {
  const conversationId = key.slice(adapter.id.length + 1);
  const result = await adapter.getConversation(conversationId);
  if (!result.ok) {
    log.warn('indexer', 'fetch-failed', { vendor: adapter.id, code: result.error.code });
    return false;
  }
  const conversation = result.value;
  index.upsert(docFromConversation(adapter.id, key, conversation));
  await markIndexed(conversationKey(adapter.id, conversationId), {
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    preview: previewOf(conversation),
  });
  return true;
}
