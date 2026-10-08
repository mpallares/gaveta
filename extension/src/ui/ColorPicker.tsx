import { FOLDER_COLORS } from '@/db';

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1" role="radiogroup" aria-label="Folder colour">
      {FOLDER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          data-testid={`color-${c.slice(1)}`}
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
          style={{ background: c, borderColor: c === value ? 'var(--g-fg)' : 'transparent' }}
        />
      ))}
    </div>
  );
}
