'use client';

import { Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

/**
 * Floating action button that toggles the AI assistant chat panel.
 * Fixed to the bottom-right corner above all page content.
 */
export function AiFab({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      aria-expanded={open}
      className={cn(
        buttonVariants({ variant: 'default', size: 'icon-lg' }),
        'bg-primary text-primary-foreground hover:bg-primary/90 fixed right-4 bottom-6 z-50 rounded-full shadow-enterprise'
      )}
    >
      <Sparkles className="size-5" />
    </button>
  );
}
