'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RequirementRow, REQUIREMENT_GRID } from './requirement-row';
import { cn } from 'cn';

/**
 * Add / edit dialog for a requirement's text. In add mode the parent
 * recommendation is chosen from the issue's recommendations.
 *
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, mode: 'add'|'edit', recommendations: object[], initial: object|null, defaultRecommendationId: string | null, projectId: string, issueId: string, onIssueUpdated: (issue: object) => void }} props
 */
function RequirementDialog({ open, onOpenChange, mode, recommendations, initial, defaultRecommendationId, projectId, issueId, onIssueUpdated }) {
  const [text, setText] = useState(initial?.text ?? '');
  const [recommendationId, setRecommendationId] = useState(
    initial?.recommendationId ?? defaultRecommendationId ?? recommendations[0]?._id ?? ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Requirement text is required.');
      return;
    }
    if (mode === 'add' && !recommendationId) {
      setError('Select a recommendation first.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const isEdit = mode === 'edit';
      const response = await fetch(
        isEdit
          ? `/api/projects/${projectId}/issues/${issueId}/requirements/${initial._id}`
          : `/api/projects/${projectId}/issues/${issueId}/requirements`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isEdit
              ? { recommendationId: initial.recommendationId, text }
              : { recommendationId, text }
          ),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.errors?.text ?? data.error ?? 'Failed to save requirement.');
        return;
      }
      onIssueUpdated(data.issue);
      onOpenChange(false);
    } catch (error_) {
      console.error('Failed to save requirement:', error_);
      setError('Failed to save requirement.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={mode === 'add' ? 'Add Requirement' : 'Edit Requirement'}
        description={
          mode === 'add'
            ? 'Record a requirement under one of this issue\'s recommendations.'
            : 'Update the requirement text.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'add' && (
            <div className="space-y-1.5">
              <Label htmlFor="requirement-recommendation" className="text-sm">
                Recommendation
              </Label>
              <select
                id="requirement-recommendation"
                value={recommendationId}
                onChange={(e) => setRecommendationId(e.target.value)}
                className="bg-background border-input text-foreground h-9 w-full rounded-md border px-3 text-sm shadow-xs"
              >
                {recommendations.map((rec, index) => (
                  <option key={rec._id} value={rec._id}>
                    {String(index + 1).padStart(2, '0')} — {rec.text.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="requirement-text" className="text-sm">
              Requirement
            </Label>
            <Textarea
              id="requirement-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the requirement…"
              rows={4}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : mode === 'add' ? 'Add' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Requirements section — a four-column grid (Requirement | Links | Evidence |
 * Status) where each row shows everything about one requirement. Only the
 * selected recommendation's requirements are listed.
 *
 * @param {{ projectId: string, issueId: string, recommendations: object[], links: object[], projectPackages: object[], projectIssues: object[], selectedRecommendationId: string | null, onIssueUpdated: (issue: object) => void, onLinksChanged: (links: object[]) => void }} props
 */
export function IssueRequirementsPanel({
  projectId,
  issueId,
  recommendations,
  links,
  projectPackages,
  projectIssues,
  selectedRecommendationId,
  onIssueUpdated,
  onLinksChanged,
}) {
  const [dialog, setDialog] = useState(null); // null | { mode, requirement? }
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Rows for the selected recommendation only: one entry per requirement.
  // The index is taken from the full list so numbering matches the
  // recommendations column.
  const rows = useMemo(
    () =>
      recommendations.flatMap((rec, recIndex) =>
        rec._id === selectedRecommendationId
          ? (rec.requirements ?? []).map((requirement) => ({
              key: requirement._id,
              recommendationId: rec._id,
              recommendationNumber: String(recIndex + 1).padStart(2, '0'),
              requirement,
            }))
          : []
      ),
    [recommendations, selectedRecommendationId]
  );

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/requirements/${confirmTarget.requirement._id}` +
          `?recommendationId=${confirmTarget.recommendationId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete requirement.');
      const data = await response.json();
      onIssueUpdated(data.issue);
      setConfirmTarget(null);
    } catch (error) {
      console.error('Failed to delete requirement:', error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border bg-card flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-foreground text-sm font-semibold">Requirements</p>
          <p className="text-muted-foreground text-xs">{rows.length} registered</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={recommendations.length === 0}
          title={
            recommendations.length === 0
              ? 'Add a recommendation first.'
              : 'Add a requirement'
          }
          onClick={() => setDialog({ mode: 'add' })}
        >
          <Plus className="size-3.5" /> New Requirement
        </Button>
      </div>

      {/* Column headers */}
      <div
        className={cn(
          REQUIREMENT_GRID,
          'text-muted-foreground bg-muted/40 border-border border-b px-3 py-1.5 text-[0.65rem] font-semibold tracking-wider uppercase'
        )}
      >
        <span>Requirement</span>
        <span>Links</span>
        <span>Evidence</span>
        <span className="text-center">Status</span>
      </div>

      {/* Rows */}
      <div className="scrollbar-refined flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="text-muted-foreground px-4 py-6 text-center text-xs">
            {recommendations.length === 0
              ? 'No recommendations yet — add one first, then record its requirements.'
              : !selectedRecommendationId
                ? 'Select a recommendation to view its requirements.'
                : 'No requirements yet for this recommendation. Use "New Requirement" to add one.'}
          </div>
        ) : (
          rows.map((row) => (
            <RequirementRow
              key={row.key}
              projectId={projectId}
              issueId={issueId}
              recommendationId={row.recommendationId}
              recommendationNumber={row.recommendationNumber}
              requirement={row.requirement}
              links={links}
              projectPackages={projectPackages}
              projectIssues={projectIssues}
              onIssueUpdated={onIssueUpdated}
              onLinksChanged={onLinksChanged}
              onEdit={() => setDialog({ mode: 'edit', requirement: row })}
              onDelete={() => setConfirmTarget(row)}
            />
          ))
        )}
      </div>

      {/* Add / edit dialog */}
      {dialog && (
        <RequirementDialog
          open
          onOpenChange={(next) => {
            if (!next) setDialog(null);
          }}
          mode={dialog.mode}
          recommendations={recommendations}
          defaultRecommendationId={selectedRecommendationId}
          initial={
            dialog.mode === 'edit'
              ? {
                  _id: dialog.requirement.requirement._id,
                  text: dialog.requirement.requirement.text,
                  recommendationId: dialog.requirement.recommendationId,
                }
              : null
          }
          projectId={projectId}
          issueId={issueId}
          onIssueUpdated={onIssueUpdated}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={Boolean(confirmTarget)} onOpenChange={(next) => !next && setConfirmTarget(null)}>
        <DialogContent title="Delete Requirement" description="This requirement, its links and evidence references will be permanently removed. Continue?">
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
