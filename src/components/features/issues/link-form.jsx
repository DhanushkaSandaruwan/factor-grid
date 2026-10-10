'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from 'cn';

/**
 * Toggle chip used for multi-selecting packages and issue IDs.
 * @param {{ selected: boolean, onClick: () => void, children: React.ReactNode }} props
 */
function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
        selected
          ? 'bg-primary/10 text-primary ring-primary/40'
          : 'text-muted-foreground ring-border hover:bg-accent hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Create / edit form for one HFDR or PSID link.
 *
 * @param {{ type: 'hfdr'|'psid', initial: object|null, projectPackages: object[], projectIssues: object[], saving: boolean, errors: Record<string,string>, onSave: (payload: object) => void, onCancel: () => void }} props
 */
export function LinkForm({ type, initial, projectPackages, projectIssues, saving, errors, onSave, onCancel }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [packages, setPackages] = useState([]);
  const [issueIds, setIssueIds] = useState([]);
  const [lead, setLead] = useState('');
  const [doorsId, setDoorsId] = useState('');

  useEffect(() => {
    setCode(initial?.code ?? '');
    setDescription(initial?.description ?? '');
    setPackages((initial?.packages ?? []).map((p) => (typeof p === 'object' ? p._id : p)));
    setIssueIds(initial?.issueIds ?? []);
    setLead(initial?.lead ?? '');
    setDoorsId(initial?.doorsId ?? '');
  }, [initial]);

  function toggleValue(list, value) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({ type, code, description, packages, issueIds, lead, doorsId });
  }

  const idLabel = type === 'hfdr' ? 'HFDR ID' : 'PSID';

  return (
    <form onSubmit={handleSubmit} className="bg-muted/40 space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="link-code" className="text-xs">{idLabel}</Label>
          <Input
            id="link-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Enter ${idLabel}…`}
            className="h-8 text-sm"
          />
          {errors.code && <p className="text-destructive text-xs">{errors.code}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="link-lead" className="text-xs">Lead</Label>
          <Input
            id="link-lead"
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            placeholder="Enter lead…"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="link-description" className="text-xs">Description</Label>
        <Textarea
          id="link-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this linked record cover?"
          rows={2}
          className="text-sm"
        />
        {errors.description && <p className="text-destructive text-xs">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="link-doors" className="text-xs">Doors ID</Label>
          <Input
            id="link-doors"
            value={doorsId}
            onChange={(e) => setDoorsId(e.target.value)}
            placeholder="Enter Doors ID…"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Packages</Label>
          <div className="flex flex-wrap gap-1.5">
            {projectPackages.length === 0 && (
              <p className="text-muted-foreground text-xs">No packages in this project.</p>
            )}
            {projectPackages.map((pkg) => (
              <Chip
                key={pkg._id}
                selected={packages.includes(pkg._id)}
                onClick={() => setPackages((prev) => toggleValue(prev, pkg._id))}
              >
                {pkg.packageId}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Issue IDs</Label>
        <div className="flex flex-wrap gap-1.5">
          {projectIssues.length === 0 && (
            <p className="text-muted-foreground text-xs">No issues registered yet.</p>
          )}
          {projectIssues.map((issue) => (
            <Chip
              key={issue._id}
              selected={issueIds.includes(issue.issueId)}
              onClick={() => setIssueIds((prev) => toggleValue(prev, issue.issueId))}
            >
              {issue.issueId}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Link'}
        </Button>
      </div>
    </form>
  );
}
