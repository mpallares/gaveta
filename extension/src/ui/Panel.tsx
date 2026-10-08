import { useGaveta } from '@/store/context';
import { ConversationList } from './ConversationList';
import { FolderTree } from './FolderTree';
import { IconClose, IconDrawer, IconRefresh } from './icons';
import { SearchBox } from './SearchBox';
import { StatusBanner } from './StatusBanner';

interface Props {
  vendorName: string;
  conversationUrl: (id: string) => string;
}

export function Panel({ vendorName, conversationUrl }: Props) {
  const open = useGaveta((s) => s.panelOpen);
  const setPanelOpen = useGaveta((s) => s.setPanelOpen);
  const sync = useGaveta((s) => s.sync);
  const status = useGaveta((s) => s.status);

  if (!open) {
    return (
      <button
        type="button"
        data-testid="panel-toggle"
        data-gaveta-root
        aria-label="Open Gaveta"
        onClick={() => void setPanelOpen(true)}
        className="fixed top-1/2 right-0 z-[2147483000] flex -translate-y-1/2 items-center gap-1 rounded-l-md border border-r-0 border-(--g-border) bg-(--g-bg-elevated) px-2 py-3 text-xs text-(--g-fg) shadow-md"
      >
        <IconDrawer />
      </button>
    );
  }

  return (
    <aside
      data-testid="panel"
      data-gaveta-root
      aria-label="Gaveta"
      className="fixed top-0 right-0 z-[2147483000] flex h-screen w-80 max-w-[90vw] flex-col border-l border-(--g-border) bg-(--g-bg) text-(--g-fg) shadow-xl"
    >
      <header className="flex items-center gap-2 border-b border-(--g-border) px-3 py-2">
        <IconDrawer />
        <h1 className="flex-1 text-sm font-semibold">Gaveta</h1>
        <span className="text-[10px] text-(--g-fg-muted)">{vendorName}</span>
        <button
          type="button"
          aria-label="Sync now"
          data-testid="sync-button"
          disabled={status === 'syncing' || status === 'disabled'}
          onClick={() => void sync()}
          className="rounded p-1 text-(--g-fg-muted) hover:bg-(--g-bg-hover) hover:text-(--g-fg) disabled:opacity-40"
        >
          <IconRefresh className={status === 'syncing' ? 'animate-spin' : ''} />
        </button>
        <button
          type="button"
          aria-label="Collapse Gaveta"
          data-testid="panel-collapse"
          onClick={() => void setPanelOpen(false)}
          className="rounded p-1 text-(--g-fg-muted) hover:bg-(--g-bg-hover) hover:text-(--g-fg)"
        >
          <IconClose />
        </button>
      </header>

      <div className="flex flex-col gap-2 px-3 py-2">
        <StatusBanner />
        <SearchBox />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="max-h-[45%] overflow-y-auto border-b border-(--g-border) px-2 pb-2">
          <FolderTree />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          <ConversationList conversationUrl={conversationUrl} />
        </div>
      </div>

      <footer className="border-t border-(--g-border) px-3 py-1 text-[10px] text-(--g-fg-muted)">
        Local-first. Nothing leaves this browser.
      </footer>
    </aside>
  );
}
