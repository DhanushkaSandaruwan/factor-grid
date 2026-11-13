'use client';

import { Check } from 'lucide-react';
import { cn } from 'cn';

/**
 * Toggleable chip used for multi-select attribute options.
 * @param {{ label: string, selected: boolean, onToggle: () => void }} props
 */
export function OptionChip({ label, selected, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'focus-ring inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-[background-color,border-color,color] duration-150 outline-none',
        selected
          ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-border bg-card text-foreground shadow-soft hover:border-primary/40 hover:bg-accent/60 hover:text-accent-foreground'
      )}
    >
      {selected ? <Check className="size-3" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}
