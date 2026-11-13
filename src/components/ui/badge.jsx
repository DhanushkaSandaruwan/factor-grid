import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] leading-none font-medium whitespace-nowrap [&_svg]:size-2.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        accent: 'bg-accent text-accent-foreground',
        primary: 'bg-primary/10 text-primary',
        open: 'bg-status-open-soft text-status-open',
        closed: 'bg-status-closed-soft text-status-closed',
        transferred: 'bg-status-transferred-soft text-status-transferred',
        danger: 'bg-destructive/10 text-destructive',
        outline: 'border-border text-muted-foreground border bg-transparent',
      },
      mono: {
        true: 'font-mono tracking-tight',
        false: '',
      },
    },
    defaultVariants: { tone: 'neutral', mono: false },
  }
);

/**
 * Compact status / identifier pill.
 * @param {React.HTMLAttributes<HTMLSpanElement> & { tone?: string, mono?: boolean }} props
 */
function Badge({ className, tone, mono, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone, mono }), className)} {...props} />;
}

export { Badge, badgeVariants };
