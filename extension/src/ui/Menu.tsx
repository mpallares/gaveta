import { useEffect, useRef, useState, type ReactNode } from 'react';

interface MenuProps {
  trigger: (open: () => void, isOpen: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  testId?: string;
}

/** Minimal popover menu. Closes on outside click or Escape. */
export function Menu({ trigger, children, align = 'right', testId }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event): void => {
      const path = e.composedPath();
      if (ref.current && !path.includes(ref.current)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger(() => setOpen((v) => !v), open)}
      {open && (
        <div
          data-testid={testId}
          role="menu"
          className={`absolute top-full z-20 mt-1 min-w-40 rounded-md border border-(--g-border) bg-(--g-bg-elevated) p-1 text-xs shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
  testId,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      onClick={onClick}
      className={`block w-full rounded px-2 py-1.5 text-left hover:bg-(--g-bg-hover) ${danger ? 'text-red-500' : ''}`}
    >
      {children}
    </button>
  );
}
