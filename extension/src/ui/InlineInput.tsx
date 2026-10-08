import { useEffect, useRef, useState } from 'react';

interface Props {
  initial?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  testId?: string;
}

export function InlineInput({ initial = '', placeholder, onSubmit, onCancel, testId }: Props) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <form
      className="flex gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() !== '') onSubmit(value.trim());
      }}
    >
      <input
        ref={ref}
        data-testid={testId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => {
          if (value.trim() === '') onCancel();
        }}
        className="min-w-0 flex-1 rounded border border-(--g-border) bg-(--g-bg) px-2 py-1 text-xs outline-none focus:border-(--g-accent)"
      />
    </form>
  );
}
