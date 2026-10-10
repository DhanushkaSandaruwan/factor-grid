'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from 'cn';

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    icon: AlertTriangle,
    className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  closed: {
    label: 'Closed',
    icon: CheckCircle,
    className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  transferred: {
    label: 'Transferred',
    icon: ArrowRightLeft,
    className: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
};

function IssueRow({ issue, isSelected, onSelectIssue }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;

  return (
    <div className="border-b border-border last:border-0">
      {/* Summary row — always visible. A div (not button) so the expand
          toggle can be a real <button> inside it (buttons can't nest). */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectIssue(issue)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectIssue(issue);
          }
        }}
        className={cn(
          'group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-inset',
          isSelected
            ? 'bg-accent/60'
            : 'hover:bg-muted/50'
        )}
      >
        {/* Status dot */}
        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', cfg.dot)} />

        {/* ID + title */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.75rem] font-semibold text-muted-foreground">
              {issue.issueId}
            </span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium', cfg.className)}>
              <StatusIcon data-icon="inline-start" className="size-2.5" />
              {cfg.label}
            </span>
          </div>
          <p className={cn(
            'mt-0.5 text-sm font-medium leading-snug',
            isSelected ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
          )}>
            {issue.title}
          </p>
          {issue.source && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {issue.source}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-muted-foreground hover:text-foreground mt-1 shrink-0 rounded p-0.5 transition-colors"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-4 pb-3 pt-2">
          {issue.packages?.length > 0 && (
            <div className="mb-2">
              <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
                Packages
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {issue.packages.map((pkg) => (
                  <span
                    key={pkg._id ?? pkg}
                    className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium"
                  >
                    {typeof pkg === 'object' ? pkg.packageId : pkg}
                  </span>
                ))}
              </div>
            </div>
          )}
          {issue.description && (
            <div className="mb-2">
              <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
                Description
              </p>
              <p className="text-foreground mt-0.5 text-xs leading-relaxed">{issue.description}</p>
            </div>
          )}
          {issue.consequences && (
            <div>
              <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
                Consequences
              </p>
              <p className="text-foreground mt-0.5 text-xs leading-relaxed">{issue.consequences}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Issue list panel (left column). Clicking an issue selects it and shows
 * the preview panel on the right.
 *
 * @param {{ issues: object[], selectedIssue: object|null, onSelectIssue: (issue) => void }} props
 */
export function IssueList({ issues, selectedIssue, onSelectIssue }) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
          <AlertTriangle className="text-muted-foreground size-5" />
        </div>
        <p className="text-foreground text-sm font-medium">No issues registered</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Click "New Issue" to register the first issue for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {issues.map((issue) => (
        <IssueRow
          key={issue._id}
          issue={issue}
          isSelected={selectedIssue?._id === issue._id}
          onSelectIssue={onSelectIssue}
        />
      ))}
    </div>
  );
}
