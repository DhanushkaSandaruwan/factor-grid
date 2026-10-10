'use client';

import { useState } from 'react';
import { Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LinkForm } from './link-form';
import { cn } from 'cn';

const TABS = [
  { value: 'hfdr', label: 'HFDR' },
  { value: 'psid', label: 'PSID' },
];

/**
 * Link manager dialog — HFDR / PSID tables with add / edit / delete plus an
 * "Attached" checkbox that ties a link to the requirement it was opened for.
 *
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, projectId: string, issueId: string, recommendationId: string, requirement: object, links: object[], projectPackages: object[], projectIssues: object[], onLinksChanged: (links: object[]) => void, onIssueUpdated: (issue: object) => void }} props
 */
export function RequirementLinksDialog({
  open,
  onOpenChange,
  projectId,
  issueId,
  recommendationId,
  requirement,
  links,
  projectPackages,
  projectIssues,
  onLinksChanged,
  onIssueUpdated,
}) {
  const [tab, setTab] = useState('hfdr');
  const [editing, setEditing] = useState(null); // null | { mode: 'create' } | { mode: 'edit', link }
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const attachedIds = new Set(requirement?.linkIds ?? []);
  const tabLinks = links.filter((link) => link.type === tab);

  function switchTab(value) {
    setTab(value);
    setEditing(null);
    setErrors({});
    setConfirmId(null);
  }

  async function saveLink(payload) {
    setSaving(true);
    setErrors({});
    try {
      const isEdit = editing?.mode === 'edit';
      const response = await fetch(
        isEdit
          ? `/api/projects/${projectId}/links/${editing.link._id}`
          : `/api/projects/${projectId}/links`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? {});
        return;
      }
      onLinksChanged(
        isEdit
          ? links.map((l) => (l._id === data.link._id ? data.link : l))
          : [data.link, ...links]
      );
      setEditing(null);
    } catch (error) {
      console.error('Failed to save link:', error);
      setErrors({ code: 'Failed to save link.' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteLink(linkId) {
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/links/${linkId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete link.');
      onLinksChanged(links.filter((l) => l._id !== linkId));
      setConfirmId(null);
    } catch (error) {
      console.error('Failed to delete link:', error);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAttach(linkId) {
    const next = attachedIds.has(linkId)
      ? [...requirement.linkIds].filter((id) => id !== linkId)
      : [...(requirement.linkIds ?? []), linkId];

    setBusy(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/issues/${issueId}/requirements/${requirement._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendationId, linkIds: next }),
        }
      );
      if (!response.ok) throw new Error('Failed to update links.');
      const data = await response.json();
      onIssueUpdated(data.issue);
    } catch (error) {
      console.error('Failed to toggle link attachment:', error);
    } finally {
      setBusy(false);
    }
  }

  const idColumn = tab === 'hfdr' ? 'HFDR ID' : 'PSID';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Manage Links"
        description="Attach HFDR / PSID links to this requirement, or maintain the project's link registry."
        className="max-w-5xl gap-3 p-4"
      >
        {/* Tab switch + add button */}
        <div className="flex items-center justify-between">
          <div className="bg-muted inline-flex rounded-lg p-1">
            {TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => switchTab(value)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                  tab === value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing({ mode: 'create' });
              setErrors({});
            }}
          >
            <Plus className="size-3.5" /> Add {tab === 'hfdr' ? 'HFDR' : 'PSID'} Link
          </Button>
        </div>

        {/* Create / edit form */}
        {editing && (
          <LinkForm
            type={tab}
            initial={editing.mode === 'edit' ? editing.link : null}
            projectPackages={projectPackages}
            projectIssues={projectIssues}
            saving={saving}
            errors={errors}
            onSave={saveLink}
            onCancel={() => setEditing(null)}
          />
        )}

        {/* Links table */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Attached</th>
                <th className="px-3 py-2 font-semibold">{idColumn}</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 font-semibold">Packages</th>
                <th className="px-3 py-2 font-semibold">Issue IDs</th>
                <th className="px-3 py-2 font-semibold">Lead</th>
                <th className="px-3 py-2 font-semibold">Doors ID</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tabLinks.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-3 py-6 text-center">
                    No {tab === 'hfdr' ? 'HFDR' : 'PSID'} links yet. Use "Add" to create one.
                  </td>
                </tr>
              )}
              {tabLinks.map((link) => (
                <tr key={link._id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Checkbox
                      aria-label={`Attach ${link.code}`}
                      checked={attachedIds.has(link._id)}
                      disabled={busy}
                      onCheckedChange={() => toggleAttach(link._id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold">{link.code}</td>
                  <td className="text-muted-foreground max-w-[180px] truncate px-3 py-2" title={link.description}>
                    {link.description || '—'}
                  </td>
                  <td className="text-muted-foreground max-w-[120px] truncate px-3 py-2">
                    {link.packages.map((p) => p.packageId ?? p).join(', ') || '—'}
                  </td>
                  <td className="text-muted-foreground max-w-[120px] truncate px-3 py-2">
                    {link.issueIds.join(', ') || '—'}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">{link.lead || '—'}</td>
                  <td className="text-muted-foreground px-3 py-2">{link.doorsId || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {confirmId === link._id ? (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() => deleteLink(link._id)}
                          >
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label={`Edit ${link.code}`}
                            onClick={() => {
                              setEditing({ mode: 'edit', link });
                              setErrors({});
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive size-7"
                            aria-label={`Delete ${link.code}`}
                            onClick={() => setConfirmId(link._id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Link2 className="size-3.5" />
          Attached links show as HF: / PS: references on the requirement row.
        </p>
      </DialogContent>
    </Dialog>
  );
}
