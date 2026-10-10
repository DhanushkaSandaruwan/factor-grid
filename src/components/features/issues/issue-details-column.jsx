'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AddIssueDialog } from './add-issue-dialog';

/**
 * Detects whether the row's content is taller than its fixed-height
 * container, so a "View More" option can be offered only when needed.
 */
function useOverflow(content) {
  const ref = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [content]);

  return [ref, overflows];
}

/**
 * One detail row: header with label, View More (only when the content
 * overflows) and an Edit button that opens the shared issue dialog.
 */
function DetailRow({ label, content, onEdit }) {
  const [ref, overflows] = useOverflow(content);
  const [viewOpen, setViewOpen] = useState(false);
  const hasContent = Boolean(content && content.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {overflows && hasContent && (
            <button
              type="button"
              onClick={() => setViewOpen(true)}
              className="text-xs font-medium text-cobalt-600 hover:underline dark:text-cobalt-400"
            >
              View More
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>

      <div ref={ref} className="min-h-0 flex-1 overflow-hidden px-3 py-2">
        <p className="text-foreground/90 text-xs leading-relaxed break-words whitespace-pre-wrap">
          {hasContent ? content : '—'}
        </p>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent title={label}>
          <div className="scrollbar-refined max-h-[60vh] overflow-y-auto">
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Compact selector row for the issue's human-factors type. Saves immediately
 * on change via the issue PATCH endpoint.
 */
function IssueTypeRow({ issue, projectId, onIssueUpdated }) {
  const [value, setValue] = useState(issue.issueType ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleChange(next) {
    setValue(next);
    setError(null);
    if (!next) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/issues/${issue._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.errors?.issueType ?? 'Failed to update issue type.');
        return;
      }
      onIssueUpdated(data.issue);
    } catch {
      setError('Failed to update issue type.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          Issue Type
        </span>
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          aria-label="Issue type"
          className="bg-background text-foreground border-input focus:border-ring focus:ring-ring/10 h-7 w-36 rounded-md border px-2 text-xs shadow-xs transition-colors outline-none"
        >
          <option value="">Select…</option>
          <option value="usability">Usability</option>
          <option value="safety">Safety</option>
          <option value="both">Both</option>
        </select>
      </div>
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  );
}

/**
 * Middle column of the registry: the selected issue's type selector,
 * Description and Consequences in stacked rows. Each text row offers
 * View More (when the content overflows) and Edit (opens the shared
 * create/edit issue dialog).
 *
 * @param {{ issue: object | null, projectId: string, projectPackages: object[], onIssueUpdated: (issue: object) => void }} props
 */
export function IssueDetailsColumn({ issue, projectId, projectPackages, onIssueUpdated }) {
  const [editOpen, setEditOpen] = useState(false);

  if (!issue) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <div>
          <p className="text-foreground text-sm font-medium">No issue selected</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Select an issue from the list to view its details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <IssueTypeRow
        key={issue._id}
        issue={issue}
        projectId={projectId}
        onIssueUpdated={onIssueUpdated}
      />
      <DetailRow
        label="Description"
        content={issue.description}
        onEdit={() => setEditOpen(true)}
      />
      <div className="border-t border-border" />
      <DetailRow
        label="Consequences"
        content={issue.consequences}
        onEdit={() => setEditOpen(true)}
      />
      <AddIssueDialog
        projectId={projectId}
        projectPackages={projectPackages}
        issue={issue}
        onIssueUpdated={onIssueUpdated}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
