import { useGaveta } from '@/store/context';
import { IconClose, IconSearch } from './icons';

export function SearchBox() {
  const query = useGaveta((s) => s.query);
  const setQuery = useGaveta((s) => s.setQuery);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-(--g-fg-muted)">
        <IconSearch />
      </span>
      <input
        type="search"
        role="searchbox"
        aria-label="Search conversations"
        data-testid="search-input"
        placeholder="Search titles and messages"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-(--g-border) bg-(--g-bg) py-1.5 pr-7 pl-7 text-xs outline-none focus:border-(--g-accent)"
      />
      {query !== '' && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery('')}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-(--g-fg-muted) hover:text-(--g-fg)"
        >
          <IconClose />
        </button>
      )}
    </div>
  );
}
