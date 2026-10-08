import Dexie, { type EntityTable } from 'dexie';
import type { ConversationKey, VendorId } from '@gaveta/shared';

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  /** Hex colour like `#3b82f6`. */
  color: string;
  /** Sort position among siblings. */
  order: number;
  createdAt: number;
  updatedAt: number;
}

/** A conversation placed in a folder. One row per conversation (a chat lives in at most one folder). */
export interface FolderItem {
  /** Same as the conversation key, so it is unique per conversation. */
  id: ConversationKey;
  folderId: string;
  vendorId: VendorId;
  conversationId: string;
  order: number;
  addedAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface ConversationMeta {
  id: ConversationKey;
  vendorId: VendorId;
  conversationId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** `updatedAt` value at the time the content was last indexed; null if never. */
  indexedUpdatedAt: number | null;
  messageCount: number;
  /** 1 or 0 rather than boolean so Dexie can index it. */
  pinned: 0 | 1;
  pinnedAt: number | null;
  tagIds: string[];
  /** Short, non-sensitive preview shown in search results. Chat content, so never log it. */
  preview: string;
  lastSeenAt: number;
}

export interface SearchIndexRow {
  id: 'main';
  json: string;
  docCount: number;
  updatedAt: number;
}

export class GavetaDB extends Dexie {
  folders!: EntityTable<Folder, 'id'>;
  folder_items!: EntityTable<FolderItem, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  conversations_meta!: EntityTable<ConversationMeta, 'id'>;
  search_index!: EntityTable<SearchIndexRow, 'id'>;

  constructor(name = 'gaveta') {
    super(name);
    this.version(1).stores({
      folders: 'id, parentId, order, name',
      folder_items: 'id, folderId, vendorId, conversationId',
      tags: 'id, name',
      conversations_meta: 'id, vendorId, updatedAt, pinned, *tagIds, [vendorId+pinned]',
      search_index: 'id',
    });
  }
}

let instance: GavetaDB | null = null;

export function getDb(): GavetaDB {
  instance ??= new GavetaDB();
  return instance;
}

/** Test helper: swap the singleton (e.g. for a fresh in-memory db per test). */
export function setDb(db: GavetaDB | null): void {
  instance = db;
}
