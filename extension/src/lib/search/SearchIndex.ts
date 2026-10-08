import MiniSearch, { type Options, type SearchResult } from 'minisearch';
import type { Conversation, ConversationKey, VendorId } from '@gaveta/shared';

export interface SearchDoc {
  id: ConversationKey;
  vendorId: VendorId;
  title: string;
  /** All message text joined. Indexed but not stored. */
  content: string;
}

export interface SearchHit {
  id: ConversationKey;
  vendorId: VendorId;
  title: string;
  score: number;
  /** Which fields matched, e.g. `['title']` or `['content']`. */
  matchedFields: string[];
}

const OPTIONS: Options<SearchDoc> = {
  fields: ['title', 'content'],
  storeFields: ['title', 'vendorId'],
  idField: 'id',
  searchOptions: {
    prefix: true,
    fuzzy: 0.15,
    boost: { title: 3 },
    combineWith: 'AND',
  },
};

export const INDEX_FORMAT_VERSION = 1;

/** Thin MiniSearch wrapper: upsert semantics plus (de)serialisation for Dexie. */
export class SearchIndex {
  private ms: MiniSearch<SearchDoc>;

  private constructor(ms: MiniSearch<SearchDoc>) {
    this.ms = ms;
  }

  static empty(): SearchIndex {
    return new SearchIndex(new MiniSearch<SearchDoc>(OPTIONS));
  }

  /** Returns null when the JSON is unreadable or from an older format. */
  static fromJSON(json: string): SearchIndex | null {
    try {
      const parsed: unknown = JSON.parse(json);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const wrapped = parsed as { v?: unknown; index?: unknown };
      if (wrapped.v !== INDEX_FORMAT_VERSION || typeof wrapped.index !== 'string') return null;
      return new SearchIndex(MiniSearch.loadJSON<SearchDoc>(wrapped.index, OPTIONS));
    } catch {
      return null;
    }
  }

  toJSON(): string {
    return JSON.stringify({ v: INDEX_FORMAT_VERSION, index: JSON.stringify(this.ms) });
  }

  get size(): number {
    return this.ms.documentCount;
  }

  has(id: ConversationKey): boolean {
    return this.ms.has(id);
  }

  upsert(doc: SearchDoc): void {
    if (this.ms.has(doc.id)) this.ms.discard(doc.id);
    this.ms.add(doc);
  }

  remove(id: ConversationKey): void {
    if (this.ms.has(id)) this.ms.discard(id);
  }

  search(query: string, limit = 50): SearchHit[] {
    const q = query.trim();
    if (q === '') return [];
    return this.ms
      .search(q)
      .slice(0, limit)
      .map((r: SearchResult) => ({
        id: r.id as ConversationKey,
        vendorId: r['vendorId'] as VendorId,
        title: String(r['title'] ?? ''),
        score: r.score,
        matchedFields: Array.from(new Set(Object.values(r.match).flat())),
      }));
  }
}

export function docFromConversation(
  vendorId: VendorId,
  key: ConversationKey,
  conversation: Conversation,
): SearchDoc {
  return {
    id: key,
    vendorId,
    title: conversation.title,
    content: conversation.messages.map((m) => m.text).join('\n'),
  };
}

/** First non-empty user message, trimmed for display. */
export function previewOf(conversation: Conversation, maxLen = 160): string {
  const first = conversation.messages.find((m) => m.role === 'user' && m.text.trim() !== '');
  const text = (first ?? conversation.messages[0])?.text ?? '';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > maxLen ? `${flat.slice(0, maxLen - 1)}…` : flat;
}
