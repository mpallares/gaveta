import { useGaveta } from '@/store/context';

const TEXT: Partial<Record<ReturnType<typeof useStatus>, string>> = {
  'needs-update':
    'Gaveta needs an update for this site. Folders and search still work on what is already indexed.',
  unauthenticated: 'Log in to the chat app so Gaveta can read your conversations.',
  network: 'Network problem while syncing. Will retry on next navigation.',
  disabled: 'This site is temporarily disabled by the Gaveta team.',
};

function useStatus() {
  return useGaveta((s) => s.status);
}

export function StatusBanner() {
  const status = useStatus();
  const notice = useGaveta((s) => s.notice);
  const progress = useGaveta((s) => s.progress);
  const limitHit = useGaveta((s) => s.limitHit);
  const dismissLimit = useGaveta((s) => s.dismissLimit);
  const lastError = useGaveta((s) => s.lastError);
  const dismissError = useGaveta((s) => s.dismissError);

  const text = TEXT[status];
  return (
    <div className="flex flex-col gap-1" data-testid="status" data-status={status}>
      {notice && <p className="rounded bg-(--g-bg-hover) px-2 py-1 text-[11px]">{notice}</p>}
      {text && (
        <p
          className="rounded bg-amber-500/15 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300"
          role="status"
        >
          {text}
        </p>
      )}
      {status === 'syncing' && progress && progress.total > 0 && (
        <p className="px-2 text-[10px] text-(--g-fg-muted)" role="status">
          Indexing {progress.done}/{progress.total}
        </p>
      )}
      {limitHit && (
        <div
          className="rounded border border-(--g-accent) bg-(--g-bg-elevated) px-2 py-2 text-[11px]"
          role="alert"
          data-testid="upgrade-state"
        >
          <p className="font-semibold">Free plan: 5 folders</p>
          <p className="text-(--g-fg-muted)">
            Upgrade to Pro for unlimited folders. Payments are coming soon.
          </p>
          <button type="button" onClick={dismissLimit} className="mt-1 text-(--g-accent) underline">
            Got it
          </button>
        </div>
      )}
      {lastError && (
        <p
          className="flex items-start gap-2 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-600"
          role="alert"
        >
          <span className="flex-1">{lastError}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}
    </div>
  );
}
