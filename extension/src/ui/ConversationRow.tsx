import type { ConversationMeta } from '@/db';
import { keyOf } from '@/store/gavetaStore';
import { useGaveta } from '@/store/context';
import { relativeTime } from '@/lib/time';
import { setDragKey } from './dnd';
import { IconDownload, IconPin } from './icons';
import { Menu, MenuItem } from './Menu';

interface Props {
  meta: ConversationMeta;
  /** Shown under the title (search preview or folder name). */
  subtitle?: string | undefined;
  conversationUrl: (id: string) => string;
}

export function ConversationRow({ meta, subtitle, conversationUrl }: Props) {
  const key = keyOf(meta);
  const folders = useGaveta((s) => s.folders);
  const items = useGaveta((s) => s.items);
  const current = useGaveta((s) => s.currentConversationId);
  const togglePinned = useGaveta((s) => s.togglePinned);
  const moveToFolder = useGaveta((s) => s.moveToFolder);
  const exportConversation = useGaveta((s) => s.exportConversation);

  const item = items.find((i) => i.id === key);
  const folder = item ? folders.find((f) => f.id === item.folderId) : undefined;
  const isCurrent = current === meta.conversationId;

  return (
    <li
      draggable
      data-testid={`conversation-${meta.conversationId}`}
      data-conversation-key={key}
      onDragStart={(e) => setDragKey(e, key)}
      className={`group flex cursor-grab items-start gap-1 rounded px-2 py-1.5 text-xs active:cursor-grabbing ${
        isCurrent ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
      }`}
    >
      <a
        href={conversationUrl(meta.conversationId)}
        className="min-w-0 flex-1"
        title={meta.title}
        data-testid="conversation-link"
      >
        <span className="block truncate font-medium">{meta.title || 'Untitled'}</span>
        <span className="block truncate text-[10px] text-(--g-fg-muted)">
          {subtitle ?? meta.preview}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-(--g-fg-muted)">
          {folder && (
            <span
              className="inline-flex items-center gap-1 rounded bg-(--g-bg-hover) px-1"
              data-testid="row-folder"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: folder.color }}
              />
              {folder.name}
            </span>
          )}
          <span>{relativeTime(meta.updatedAt)}</span>
        </span>
      </a>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100">
        <button
          type="button"
          aria-label={meta.pinned ? 'Unpin' : 'Pin'}
          aria-pressed={meta.pinned === 1}
          data-testid="pin-button"
          onClick={() => void togglePinned(key)}
          className={`rounded p-1 hover:bg-(--g-bg-hover) ${meta.pinned ? 'text-(--g-accent)' : 'text-(--g-fg-muted)'}`}
        >
          <IconPin filled={meta.pinned === 1} />
        </button>
        <Menu
          testId="export-menu"
          trigger={(open) => (
            <button
              type="button"
              aria-label="Export"
              data-testid="export-button"
              onClick={open}
              className="rounded p-1 text-(--g-fg-muted) hover:bg-(--g-bg-hover)"
            >
              <IconDownload />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                testId="export-markdown"
                onClick={() => {
                  void exportConversation(key, 'markdown');
                  close();
                }}
              >
                Export as Markdown
              </MenuItem>
              <MenuItem
                testId="export-json"
                onClick={() => {
                  void exportConversation(key, 'json');
                  close();
                }}
              >
                Export as JSON
              </MenuItem>
              <div className="my-1 border-t border-(--g-border)" />
              <label className="block px-2 py-1 text-[10px] text-(--g-fg-muted)">
                Move to folder
                <select
                  data-testid="move-select"
                  className="mt-1 block w-full rounded border border-(--g-border) bg-(--g-bg) px-1 py-0.5 text-xs"
                  value={item?.folderId ?? ''}
                  onChange={(e) => {
                    void moveToFolder(key, e.target.value === '' ? null : e.target.value);
                    close();
                  }}
                >
                  <option value="">Unfiled</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </Menu>
      </div>
    </li>
  );
}
