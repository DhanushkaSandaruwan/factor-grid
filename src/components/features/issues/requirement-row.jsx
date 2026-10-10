'use client';

import { useState } from 'react';
import { Link2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { EvidenceCell } from './evidence-cell';
import { RequirementLinksDialog } from './requirement-links-dialog';
import { cn } from 'cn';

/** Shared grid template so the header row and every requirement row align. */
export const REQUIREMENT_GRID =
  'grid grid-cols-[minmax(0,1fr)_9.5rem_7.5rem_5rem] items-center gap-2';

/**
 * One requirement row — text, attached links, evidence files and status
 * switch, all aligned on the shared grid.
 *
 * @param {{ projectId: string, issueId: string, recommendationId: string, recommendationNumber: string, requirement: object, links: object[], projectPackages: object[], projectIssues: object[], onIssueUpdated: (issue: object) => void, onLinksChanged: (links: object[]) => void, onEdit: () => void, onDelete: () => void }} props
 */
export function RequirementRow({
  projectId,
  issueId,
  recommendationId,
  recommendationNumber,
  requirement,
  links,
  projectPackages,
  projectIssues,
  onIssueUpdated,
  onLinksChanged,
  onEdit,
  onDelete,
}) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const linkById = new Map(links.map((link) => [link._id, link]));
  const attachedLinks = (requirement.linkIds ?? [])
    .map((id) => linkById.get(id))
    .filter(Boolean);

  async function handleStatusChange(checked) {
    setStatusBusy(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/requirements/${requirement._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendationId,
            status: checked ? 'closed' : 'open',
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to update status.');
      const data = await response.json();
      onIssueUpdated(data.issue);
    } catch (error) {
      console.error('Failed to toggle requirement status:', error);
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div className={cn(REQUIREMENT_GRID, 'border-border hover:bg-muted/30 border-b px-3 py-2')}>
      {/* Requirement text */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground/70 shrink-0 font-mono text-[0.65rem] font-semibold">
          {recommendationNumber}
        </span>
        <button
          type="button"
          onClick={onEdit}
          title={requirement.text}
          className="text-foreground min-w-0 flex-1 truncate text-left text-xs"
        >
          {requirement.text}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label="Edit requirement"
            title="Edit requirement"
            onClick={onEdit}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive size-6"
            aria-label="Delete requirement"
            title="Delete requirement"
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Links */}
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {attachedLinks.map((link) => (
          <span
            key={link._id}
            title={`${link.type === 'hfdr' ? 'HFDR' : 'PSID'} — ${link.code}`}
            className={cn(
              'rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold',
              link.type === 'hfdr'
                ? 'bg-primary/10 text-primary'
                : 'bg-teal-500/10 text-teal-500'
            )}
          >
            {link.type === 'hfdr' ? 'HF:' : 'PS:'}
            {link.code}
          </span>
        ))}
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground size-6"
          aria-label="Manage links"
          title="Manage links"
          onClick={() => setLinksOpen(true)}
        >
          <Link2 className="size-3" />
        </Button>
      </div>

      {/* Evidence */}
      <EvidenceCell
        projectId={projectId}
        issueId={issueId}
        recommendationId={recommendationId}
        requirement={requirement}
        onIssueUpdated={onIssueUpdated}
      />

      {/* Status */}
      <div className="flex flex-col items-center gap-0.5">
        <Switch
          checked={requirement.status === 'closed'}
          disabled={statusBusy}
          onCheckedChange={handleStatusChange}
          aria-label={`Requirement status — ${requirement.status}`}
        />
        <span
          className={cn(
            'text-[0.6rem] font-semibold tracking-wide uppercase',
            requirement.status === 'closed' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {requirement.status === 'closed' ? 'Closed' : 'Open'}
        </span>
      </div>

      <RequirementLinksDialog
        open={linksOpen}
        onOpenChange={setLinksOpen}
        projectId={projectId}
        issueId={issueId}
        recommendationId={recommendationId}
        requirement={requirement}
        links={links}
        projectPackages={projectPackages}
        projectIssues={projectIssues}
        onLinksChanged={onLinksChanged}
        onIssueUpdated={onIssueUpdated}
      />
    </div>
  );
}
