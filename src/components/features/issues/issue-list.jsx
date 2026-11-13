'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  open: { label: 'Open', icon: AlertTriangle, tone: 'open', dot: 'bg-status-open' },
  closed: { label: 'Closed', icon: CheckCircle, tone: 'closed', dot: 'bg-status-closed' },
  transferred: {
    label: 'Transferred',
    icon: ArrowRightLeft,
    tone: 'transferred',
    dot: 'bg-status-transferred',
  },
};

/** Small uppercase label above a detail block. */
function DetailLabel({ children }) {
  return <p className="eyebrow text-[0.6rem]">{children}</p>;
}

function IssueRow({ issue, isSelected, onSelectIssue }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;

  return (
    <div className="border-border/70 relative border-b last:border-0">
      {/* Selected accent edge */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-0.5 rounded-r transition-opacity',
          isSelected ? 'bg-primary opacity-100' : 'opacity-0'
        )}
      />
      {/* Summary row — always visible. A div (not button) so the expand
          toggle can be a real <button> inside it (buttons can't nest). */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={() => onSelectIssue(issue)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectIssue(issue);
          }
        }}
        className={cn(
          'group focus-ring flex w-full cursor-pointer items-start gap-3 py-3 pr-3 pl-4 text-left transition-colors outline-none focus-visible:ring-inset',
          isSelected ? 'bg-accent/50' : 'hover:bg-muted/50'
        )}
      >
        <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', cfg.dot)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-[0.72rem] font-semibold">{issue.issueId}</span>
            <Badge tone={cfg.tone}>
              <StatusIcon aria-hidden="true" />
              {cfg.label}
            </Badge>
          </div>
          <p
            className={cn(
              'mt-1 text-sm leading-snug font-medium',
              isSelected ? 'text-foreground' : 'text-foreground/85 group-hover:text-foreground'
            )}
          >
            {issue.title}
          </p>
          {issue.source && <p className="text-muted-foreground mt-0.5 truncate text-xs">{issue.source}</p>}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-ring mt-0.5 shrink-0 cursor-pointer rounded-md p-1 transition-colors outline-none"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="bg-muted/40 border-border/60 space-y-2.5 border-t py-3 pr-3 pl-4">
          {issue.packages?.length > 0 && (
            <div>
              <DetailLabel>Packages</DetailLabel>
              <div className="mt-1 flex flex-wrap gap-1">
                {issue.packages.map((pkg) => (
                  <Badge key={pkg._id ?? pkg} tone="primary">
                    {typeof pkg === 'object' ? pkg.packageId : pkg}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {issue.description && (
            <div>
              <DetailLabel>Description</DetailLabel>
              <p className="text-foreground/90 mt-0.5 text-xs leading-relaxed">{issue.description}</p>
            </div>
          )}
          {issue.consequences && (
            <div>
              <DetailLabel>Consequences</DetailLabel>
              <p className="text-foreground/90 mt-0.5 text-xs leading-relaxed">{issue.consequences}</p>
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
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="bg-muted mb-3 flex size-11 items-center justify-center rounded-xl">
          <AlertTriangle className="text-muted-foreground size-5" />
        </div>
        <p className="text-foreground text-sm font-medium">No issues registered</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Click &quot;New Issue&quot; to register the first issue for this project.
        </p>
      </div>
    );
  }

  return (
    <div>
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
