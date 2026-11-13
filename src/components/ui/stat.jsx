import { cn } from 'cn';

const TONE_CLASS = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent text-accent-foreground',
  open: 'bg-status-open-soft text-status-open',
  closed: 'bg-status-closed-soft text-status-closed',
  transferred: 'bg-status-transferred-soft text-status-transferred',
  neutral: 'bg-muted text-muted-foreground',
};

/**
 * Labelled figure with an optional icon and hint. Used for KPI tiles on
 * dashboards and inline metrics in toolbars.
 * @param {{ label: string, value: string|number, hint?: string, icon?: React.ComponentType<{className?: string}>, tone?: keyof typeof TONE_CLASS, className?: string }} props
 */
export function StatTile({ label, value, hint, icon: Icon, tone = 'accent', className }) {
  return (
    <div
      className={cn(
        'bg-card ring-foreground/[0.07] flex min-w-0 items-center gap-3 rounded-xl p-3 shadow-soft ring-1',
        className
      )}
    >
      {Icon ? (
        <span
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE_CLASS[tone])}
        >
          <Icon className="size-4" />
        </span>
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <p className="eyebrow truncate">{label}</p>
        <p className="flex items-baseline gap-1.5">
          <span className="font-mono text-lg leading-none font-semibold tabular-nums">{value}</span>
          {hint ? <span className="text-muted-foreground truncate text-[0.68rem]">{hint}</span> : null}
        </p>
      </div>
    </div>
  );
}

/**
 * Inline label/value pair for dense toolbars (no card chrome).
 * @param {{ label: string, value: string|number, className?: string }} props
 */
export function InlineStat({ label, value, className }) {
  return (
    <span className={cn('flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
    </span>
  );
}
