import { useState } from 'react';
import { folderLimit } from '@gaveta/shared';
import { childrenOf } from '@/store/gavetaStore';
import { useGaveta } from '@/store/context';
import { isConversationDrag, readDragKey } from './dnd';
import { FolderNode } from './FolderNode';
import { IconPin, IconPlus } from './icons';
import { InlineInput } from './InlineInput';

export function FolderTree() {
  const folders = useGaveta((s) => s.folders);
  const items = useGaveta((s) => s.items);
  const conversations = useGaveta((s) => s.conversations);
  const view = useGaveta((s) => s.view);
  const setView = useGaveta((s) => s.setView);
  const createFolder = useGaveta((s) => s.createFolder);
  const moveToFolder = useGaveta((s) => s.moveToFolder);
  const tier = useGaveta((s) => s.license.tier);
  const [creating, setCreating] = useState(false);
  const [unfiledOver, setUnfiledOver] = useState(false);

  const roots = childrenOf(folders, null);
  const pinnedCount = conversations.filter((c) => c.pinned === 1).length;
  const unfiledCount =
    conversations.length - items.filter((i) => conversations.some((c) => c.id === i.id)).length;
  const limit = folderLimit(tier);
  const limitLabel = Number.isFinite(limit) ? `${folders.length}/${limit}` : `${folders.length}`;

  const navButton = (
    active: boolean,
    label: string,
    count: number,
    onClick: () => void,
    testId: string,
    extra?: React.HTMLAttributes<HTMLButtonElement>,
  ) => (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs ${
        active ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
      }`}
      {...extra}
    >
      <span className="flex-1 text-left">{label}</span>
      <span className="text-[10px] text-(--g-fg-muted)">{count}</span>
    </button>
  );

  return (
    <nav aria-label="Folders" className="flex flex-col gap-0.5" data-testid="folder-tree">
      {navButton(
        view.kind === 'all',
        'All chats',
        conversations.length,
        () => setView({ kind: 'all' }),
        'view-all',
      )}
      <button
        type="button"
        data-testid="view-pinned"
        onClick={() => setView({ kind: 'pinned' })}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs ${
          view.kind === 'pinned' ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
        }`}
      >
        <IconPin filled />
        <span className="flex-1 text-left">Pinned</span>
        <span className="text-[10px] text-(--g-fg-muted)">{pinnedCount}</span>
      </button>
      {navButton(
        view.kind === 'unfiled',
        'Unfiled',
        unfiledCount,
        () => setView({ kind: 'unfiled' }),
        'view-unfiled',
        {
          className: `flex w-full items-center gap-1.5 rounded px-2 py-1 text-xs ${
            view.kind === 'unfiled' ? 'bg-(--g-bg-selected)' : 'hover:bg-(--g-bg-hover)'
          } ${unfiledOver ? 'ring-2 ring-(--g-accent)' : ''}`,
          onDragOver: (e) => {
            if (!isConversationDrag(e)) return;
            e.preventDefault();
            setUnfiledOver(true);
          },
          onDragLeave: () => setUnfiledOver(false),
          onDrop: (e) => {
            e.preventDefault();
            setUnfiledOver(false);
            const key = readDragKey(e);
            if (key) void moveToFolder(key, null);
          },
        },
      )}

      <div className="mt-2 flex items-center justify-between px-2 text-[10px] font-semibold tracking-wide text-(--g-fg-muted) uppercase">
        <span>Folders</span>
        <span className="flex items-center gap-1">
          <span data-testid="folder-limit">{limitLabel}</span>
          <button
            type="button"
            aria-label="New folder"
            data-testid="new-folder-button"
            onClick={() => setCreating(true)}
            className="rounded p-0.5 hover:bg-(--g-bg-hover) hover:text-(--g-fg)"
          >
            <IconPlus />
          </button>
        </span>
      </div>

      {creating && (
        <div className="px-1 py-1">
          <InlineInput
            placeholder="Folder name"
            testId="new-folder-input"
            onSubmit={(v) => {
              void createFolder(v, null);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {roots.length === 0 && !creating ? (
        <p className="px-2 py-1 text-[11px] text-(--g-fg-muted)">
          No folders yet. Drag a chat onto a folder to file it.
        </p>
      ) : (
        <ul>
          {roots.map((f) => (
            <FolderNode key={f.id} folder={f} depth={0} />
          ))}
        </ul>
      )}
    </nav>
  );
}
