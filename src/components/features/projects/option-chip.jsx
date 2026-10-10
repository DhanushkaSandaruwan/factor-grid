'use client';

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
        'inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {label}
    </button>
  );
}
