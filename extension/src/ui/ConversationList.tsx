import { visibleConversations } from '@/store/gavetaStore';
import { useGaveta } from '@/store/context';
import { ConversationRow } from './ConversationRow';

export function ConversationList({ conversationUrl }: { conversationUrl: (id: string) => string }) {
  const query = useGaveta((s) => s.query);
  const hits = useGaveta((s) => s.hits);
  const conversations = useGaveta((s) => s.conversations);
  const view = useGaveta((s) => s.view);
  const items = useGaveta((s) => s.items);
  const folders = useGaveta((s) => s.folders);
  const status = useGaveta((s) => s.status);

  if (query.trim() !== '') {
    const byKey = new Map(conversations.map((c) => [c.id, c]));
    const rows = hits
      .map((h) => ({ hit: h, meta: byKey.get(h.id) }))
      .filter((r) => r.meta !== undefined);
    return (
      <section aria-label="Search results" data-testid="search-results">
        <p className="px-2 py-1 text-[10px] text-(--g-fg-muted)">
          {rows.length} result{rows.length === 1 ? '' : 's'}
        </p>
        {rows.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-(--g-fg-muted)">No matches.</p>
        ) : (
          <ul>
            {rows.map(({ hit, meta }) =>
              meta ? (
                <ConversationRow
                  key={hit.id}
                  meta={meta}
                  conversationUrl={conversationUrl}
                  subtitle={
                    hit.matchedFields.includes('content')
                      ? `matches in messages · ${meta.preview}`
                      : meta.preview
                  }
                />
              ) : null,
            )}
          </ul>
        )}
      </section>
    );
  }

  const rows = visibleConversations({ view, conversations, items, folders });
  const title =
    view.kind === 'all'
      ? 'All chats'
      : view.kind === 'pinned'
        ? 'Pinned'
        : view.kind === 'unfiled'
          ? 'Unfiled'
          : (folders.find((f) => f.id === view.id)?.name ?? 'Folder');

  return (
    <section aria-label={title} data-testid="conversation-list">
      <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-(--g-fg-muted) uppercase">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="px-2 py-4 text-center text-xs text-(--g-fg-muted)">
          {status === 'syncing' ? 'Loading…' : 'Nothing here yet.'}
        </p>
      ) : (
        <ul>
          {rows.map((meta) => (
            <ConversationRow key={meta.id} meta={meta} conversationUrl={conversationUrl} />
          ))}
        </ul>
      )}
    </section>
  );
}
