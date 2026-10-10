'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { OptionChip } from '@/components/features/projects/option-chip';

/**
 * Dialog for adding a new issue to a project, or editing an existing one
 * when `issue` is provided. Pass `open`/`onOpenChange` to control it
 * externally (used by the Edit buttons in the details column).
 *
 * @param {{ projectId: string, projectPackages: { _id: string, packageId: string, description: string }[], nextIssueId: string, onIssueCreated?: (issue: object) => void, issue?: object, onIssueUpdated?: (issue: object) => void, open?: boolean, onOpenChange?: (open: boolean) => void }} props
 */
export function AddIssueDialog({
  projectId,
  projectPackages,
  nextIssueId,
  onIssueCreated,
  issue,
  onIssueUpdated,
  open,
  onOpenChange,
}) {
  const isEdit = Boolean(issue);
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? open : internalOpen;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedPackages, setSelectedPackages] = useState([]);

  // Pre-fill package selection (and clear stale errors) each time the
  // dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPackages(
      isEdit
        ? (issue?.packages ?? []).map((p) => (typeof p === 'object' ? p._id : p))
        : []
    );
    setErrors({});
  }, [isOpen, isEdit, issue]);

  function togglePackage(id) {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleOpenChange(next) {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const form = e.currentTarget;
    const body = {
      title: form.title.value.trim(),
      source: form.source.value.trim(),
      packageIds: selectedPackages,
      description: form.description.value.trim(),
      consequences: form.consequences.value.trim(),
    };

    try {
      const res = await fetch(
        isEdit
          ? `/api/projects/${projectId}/issues/${issue._id}`
          : `/api/projects/${projectId}/issues`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors(
          data.errors ?? {
            _form: isEdit ? 'Failed to update issue.' : 'Failed to create issue.',
          }
        );
        setLoading(false);
        return;
      }

      handleOpenChange(false);
      setSelectedPackages([]);
      if (isEdit) onIssueUpdated?.(data.issue);
      else onIssueCreated?.(data.issue);
    } catch {
      setErrors({ _form: 'Failed to save issue. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus data-icon="inline-start" />
            New Issue
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        title={isEdit ? 'Edit Issue' : 'Register New Issue'}
        description={
          isEdit
            ? `Editing ${issue.issueId}`
            : `Issue ID is auto-assigned — prefix: ${nextIssueId.split('-')[0]}`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Issue ID (auto-assigned when creating, fixed when editing) */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Issue ID
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {isEdit ? issue.issueId : (nextIssueId || '—')}
            </span>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-source">Source</Label>
            <Input
              id="issue-source"
              name="source"
              defaultValue={isEdit ? (issue.source ?? '') : ''}
              placeholder="e.g. User testing session, audit review"
              maxLength={200}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="issue-title"
              name="title"
              defaultValue={isEdit ? (issue.title ?? '') : ''}
              placeholder="Brief description of the issue"
              required
              maxLength={200}
            />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title}</p>
            )}
          </div>

          {/* Packages */}
          {projectPackages.length > 0 && (
            <div className="space-y-2">
              <Label>Related Packages</Label>
              <div className="flex flex-wrap gap-1.5">
                {projectPackages.map((pkg) => (
                  <OptionChip
                    key={pkg._id}
                    label={pkg.packageId}
                    selected={selectedPackages.includes(pkg._id)}
                    onToggle={() => togglePackage(pkg._id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea
              id="issue-description"
              name="description"
              defaultValue={isEdit ? (issue.description ?? '') : ''}
              placeholder="Detailed description of the issue…"
              rows={3}
              maxLength={4000}
            />
          </div>

          {/* Consequences */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-consequences">Consequences</Label>
            <Textarea
              id="issue-consequences"
              name="consequences"
              defaultValue={isEdit ? (issue.consequences ?? '') : ''}
              placeholder="What consequences may result from this issue…"
              rows={2}
              maxLength={2000}
            />
          </div>

          {errors._form && (
            <p className="text-destructive text-sm">{errors._form}</p>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Issue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
