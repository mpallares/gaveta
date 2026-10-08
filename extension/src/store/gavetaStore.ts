import {
  conversationKey,
  DEFAULT_LICENSE_STATE,
  folderLimit,
  type AdapterErrorCode,
  type Conversation,
  type ConversationKey,
  type ExportFile,
  type ExportFormat,
  type LicenseState,
  type RemoteConfig,
  type VendorAdapter,
} from '@gaveta/shared';
import { createStore, type StoreApi } from 'zustand/vanilla';
import * as db from '@/db';
import type { ConversationMeta, Folder, FolderItem } from '@/db';
import { errorKind, log } from '@/lib/log';
import { syncVendor, type SyncProgress } from '@/lib/search/indexer';
import { SearchIndex, type SearchHit } from '@/lib/search/SearchIndex';

export type AdapterStatus =
  'booting' | 'ready' | 'syncing' | 'needs-update' | 'unauthenticated' | 'network' | 'disabled';

export type View =
  { kind: 'all' } | { kind: 'pinned' } | { kind: 'unfiled' } | { kind: 'folder'; id: string };

export interface GavetaDeps {
  adapter: VendorAdapter;
  getLicense: () => Promise<LicenseState>;
  getRemoteConfig: () => Promise<RemoteConfig>;
  /** Builds the export file (normally in the background worker). */
  buildExport: (conversation: Conversation, format: ExportFormat) => Promise<ExportFile>;
  download: (file: ExportFile) => void;
  readPanelOpen: () => Promise<boolean>;
  writePanelOpen: (open: boolean) => Promise<void>;
}

export interface GavetaState {
  status: AdapterStatus;
  notice: string | null;
  license: LicenseState;
  folders: Folder[];
  items: FolderItem[];
  conversations: ConversationMeta[];
  view: View;
  expanded: Record<string, boolean>;
  query: string;
  hits: SearchHit[];
  panelOpen: boolean;
  currentConversationId: string | null;
  progress: SyncProgress | null;
  /** Set when the user hit the free-tier folder cap. */
  limitHit: boolean;
  lastError: string | null;

  init: () => Promise<void>;
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
  setQuery: (q: string) => void;
  setView: (view: View) => void;
  toggleExpanded: (folderId: string) => void;
  setPanelOpen: (open: boolean) => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  setFolderColor: (id: string, color: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveToFolder: (key: ConversationKey, folderId: string | null) => Promise<void>;
  togglePinned: (key: ConversationKey) => Promise<void>;
  exportConversation: (key: ConversationKey, format: ExportFormat) => Promise<void>;
  dismissLimit: () => void;
  dismissError: () => void;
}

const STATUS_FOR_ERROR: Record<AdapterErrorCode, AdapterStatus> = {
  'needs-update': 'needs-update',
  unauthenticated: 'unauthenticated',
  network: 'network',
  'not-found': 'ready',
  disabled: 'disabled',
  unknown: 'needs-update',
};

export type GavetaStore = StoreApi<GavetaState>;

export function createGavetaStore(deps: GavetaDeps): GavetaStore {
  const { adapter } = deps;
  let index = SearchIndex.empty();
  let syncing: Promise<void> | null = null;

  return createStore<GavetaState>()((set, get) => {
    const runSearch = (): void => {
      const q = get().query;
      set({ hits: q.trim() === '' ? [] : index.search(q) });
    };

    const guard = async (label: string, fn: () => Promise<void>): Promise<void> => {
      try {
        await fn();
      } catch (e) {
        log.error('store', `${label}-failed`, { kind: errorKind(e) });
        set({ lastError: e instanceof Error ? e.message : 'Something went wrong' });
      }
    };

    return {
      status: 'booting',
      notice: null,
      license: DEFAULT_LICENSE_STATE,
      folders: [],
      items: [],
      conversations: [],
      view: { kind: 'all' },
      expanded: {},
      query: '',
      hits: [],
      panelOpen: true,
      currentConversationId: adapter.getCurrentConversationId(),
      progress: null,
      limitHit: false,
      lastError: null,

      async init() {
        const [license, config, panelOpen, stored] = await Promise.all([
          deps.getLicense().catch(() => DEFAULT_LICENSE_STATE),
          deps.getRemoteConfig(),
          deps.readPanelOpen().catch(() => true),
          db.loadSerializedIndex(),
        ]);
        const restored = stored ? SearchIndex.fromJSON(stored.json) : null;
        if (stored && !restored) {
          log.warn('store', 'index-unreadable-rebuilding');
          await db.clearSerializedIndex();
        }
        index = restored ?? SearchIndex.empty();
        set({ license, notice: config.notice ?? null, panelOpen });
        await get().refresh();
        if (!config.adapters[adapter.id]?.enabled) {
          set({ status: 'disabled' });
          return;
        }
        set({ status: 'ready' });
        await get().sync();
      },

      async sync() {
        if (syncing) return syncing;
        syncing = (async () => {
          set({ status: 'syncing', progress: null });
          const outcome = await syncVendor(adapter, index, {
            onProgress: (progress) => set({ progress }),
          });
          await get().refresh();
          if (outcome.ok) {
            set({ status: 'ready', progress: null });
          } else {
            set({ status: STATUS_FOR_ERROR[outcome.error.code], progress: null });
          }
          runSearch();
        })().finally(() => {
          syncing = null;
        });
        return syncing;
      },

      async refresh() {
        const [folders, items, conversations] = await Promise.all([
          db.listFolders(),
          db.listItems(),
          db.listConversationMeta(adapter.id),
        ]);
        set({
          folders,
          items,
          conversations,
          currentConversationId: adapter.getCurrentConversationId(),
        });
      },

      setQuery(query) {
        set({ query });
        runSearch();
      },

      setView(view) {
        set({ view });
      },

      toggleExpanded(folderId) {
        const expanded = { ...get().expanded };
        expanded[folderId] = !(expanded[folderId] ?? true);
        set({ expanded });
      },

      async setPanelOpen(open) {
        set({ panelOpen: open });
        await deps.writePanelOpen(open).catch(() => undefined);
      },

      async createFolder(name, parentId = null) {
        const limit = folderLimit(get().license.tier);
        try {
          const folder = await db.createFolder({ name, parentId, limit });
          await get().refresh();
          if (parentId) set({ expanded: { ...get().expanded, [parentId]: true } });
          return folder;
        } catch (e) {
          if (e instanceof db.FolderLimitError) {
            set({ limitHit: true });
            return null;
          }
          set({ lastError: e instanceof Error ? e.message : 'Could not create folder' });
          return null;
        }
      },

      renameFolder: (id, name) =>
        guard('rename-folder', async () => {
          await db.renameFolder(id, name);
          await get().refresh();
        }),

      setFolderColor: (id, color) =>
        guard('set-folder-color', async () => {
          await db.setFolderColor(id, color);
          await get().refresh();
        }),

      deleteFolder: (id) =>
        guard('delete-folder', async () => {
          await db.deleteFolder(id);
          const { view } = get();
          if (view.kind === 'folder' && view.id === id) set({ view: { kind: 'all' } });
          await get().refresh();
        }),

      moveToFolder: (key, folderId) =>
        guard('move-to-folder', async () => {
          if (folderId === null) {
            await db.removeFromFolder(key);
          } else {
            const conversationId = key.slice(adapter.id.length + 1);
            await db.addToFolder(adapter.id, conversationId, folderId);
          }
          await get().refresh();
        }),

      togglePinned: (key) =>
        guard('toggle-pinned', async () => {
          const meta = get().conversations.find((c) => c.id === key);
          if (!meta) return;
          await db.setPinned(key, meta.pinned === 0);
          await get().refresh();
        }),

      exportConversation: (key, format) =>
        guard('export', async () => {
          const conversationId = key.slice(adapter.id.length + 1);
          const result = await adapter.getConversation(conversationId);
          if (!result.ok) {
            set({ lastError: `Could not load the conversation (${result.error.code})` });
            return;
          }
          const file = await deps.buildExport(result.value, format);
          deps.download(file);
        }),

      dismissLimit() {
        set({ limitHit: false });
      },
      dismissError() {
        set({ lastError: null });
      },
    };
  });
}

/** Helpers used by the UI. */
export function keyOf(meta: ConversationMeta): ConversationKey {
  return conversationKey(meta.vendorId, meta.conversationId);
}

export function childrenOf(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export function descendantIds(folders: Folder[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Conversations visible under the current view, newest first. */
export function visibleConversations(
  state: Pick<GavetaState, 'view' | 'conversations' | 'items' | 'folders'>,
): ConversationMeta[] {
  const { view, conversations, items, folders } = state;
  const folderOf = new Map(items.map((i) => [i.id, i.folderId]));
  switch (view.kind) {
    case 'all':
      return conversations;
    case 'pinned':
      return conversations.filter((c) => c.pinned === 1);
    case 'unfiled':
      return conversations.filter((c) => !folderOf.has(c.id));
    case 'folder': {
      const ids = descendantIds(folders, view.id);
      return conversations.filter((c) => {
        const fid = folderOf.get(c.id);
        return fid !== undefined && ids.has(fid);
      });
    }
  }
}
