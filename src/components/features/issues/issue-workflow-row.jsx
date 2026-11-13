'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'transferred', label: 'Transferred' },
];

/** Value for <input type="date">: YYYY-MM-DD from a Date or ISO string. */
function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function formatDay(value) {
  return value
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
}

/**
 * Sign-off dialog shown when closing an issue. The closer types their full
 * name; that name, the time and the closer are stored with the issue.
 */
function SignOffDialog({ open, onOpenChange, issueId, onConfirm, busy, serverError }) {
  const [name, setName] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Close ${issueId}`}
        description="Closing records your sign-off. Every requirement must already be closed. Type your full name to confirm."
      >
        <div className="space-y-1.5">
          <Label htmlFor="signoff-name">Full name</Label>
          <Input
            id="signoff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amanda Perera"
            autoComplete="name"
            aria-invalid={Boolean(serverError)}
          />
          {serverError ? <p className="text-destructive text-xs">{serverError}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(name)} disabled={busy}>
            {busy ? <Spinner className="size-3" /> : null}
            Sign and close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Workflow controls for the selected issue: status (closing needs sign-off),
 * assignee (chosen from the project's members) and due date. Changes save
 * immediately; errors show beside the field.
 * @param {{ issue: object, projectId: string, people?: {userId: string, name: string}[], onIssueUpdated: (issue: object) => void }} props
 */
export function IssueWorkflowRow({ issue, projectId, people = [], onIssueUpdated }) {
  const [dueDate, setDueDate] = useState(toDateInput(issue.dueDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [signOffError, setSignOffError] = useState(null);

  async function save(payload) {
    const res = await fetch(`/api/projects/${projectId}/issues/${issue._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function changeStatus(next) {
    if (next === 'closed') {
      setSignOffError(null);
      setSignOffOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await save({ status: next });
      if (!ok) setError(data.errors?.status ?? data.error ?? 'Could not change the status.');
      else onIssueUpdated(data.issue);
    } catch {
      setError('Could not change the status.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmClose(signature) {
    setBusy(true);
    setSignOffError(null);
    try {
      const { ok, data } = await save({ status: 'closed', signature });
      if (!ok) {
        setSignOffError(
          data.errors?.signature ?? data.errors?.status ?? data.error ?? 'Could not close the issue.',
        );
        return;
      }
      setSignOffOpen(false);
      onIssueUpdated(data.issue);
    } catch {
      setSignOffError('Could not close the issue.');
    } finally {
      setBusy(false);
    }
  }

  async function saveField(payload) {
    setError(null);
    try {
      const { ok, data } = await save(payload);
      if (!ok) setError(Object.values(data.errors ?? {})[0] ?? data.error ?? 'Could not save.');
      else onIssueUpdated(data.issue);
    } catch {
      setError('Could not save.');
    }
  }

  const overdue = issue.status === 'open' && issue.dueDate && new Date(issue.dueDate).getTime() < Date.now();
  const assigneeKnown = !issue.assigneeId || people.some((p) => p.userId === issue.assigneeId);

  return (
    <div className="border-border/70 space-y-2 border-b px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">Status</span>
        <span className="flex items-center gap-2">
          {busy && <Spinner className="text-muted-foreground size-3" />}
          <Select
            size="sm"
            aria-label="Issue status"
            value={issue.status}
            disabled={busy}
            onChange={(e) => changeStatus(e.target.value)}
            className="w-36"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </span>
      </div>

      {issue.status === 'closed' && issue.closedAt ? (
        <p className="text-muted-foreground text-[0.7rem] leading-relaxed">
          Closed {formatDay(issue.closedAt)} by {issue.closedByName || 'a team member'}
          {issue.signedName ? `, signed “${issue.signedName}”` : ''}.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`assignee-${issue._id}`} className="text-muted-foreground text-[0.7rem]">
            Assignee
          </Label>
          <Select
            id={`assignee-${issue._id}`}
            size="sm"
            className="w-full"
            value={assigneeKnown ? (issue.assigneeId ?? '') : ''}
            onChange={(e) => saveField({ assigneeId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {!assigneeKnown && issue.assignee ? (
              <option value="" disabled>
                {issue.assignee} (no longer a member)
              </option>
            ) : null}
            {people.map((person) => (
              <option key={person.userId} value={person.userId}>
                {person.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`due-${issue._id}`} className="text-muted-foreground text-[0.7rem]">
            Due date{overdue ? ' · overdue' : ''}
          </Label>
          <Input
            id={`due-${issue._id}`}
            type="date"
            className={`h-7 text-xs ${overdue ? 'border-destructive text-destructive' : ''}`}
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              saveField({ dueDate: e.target.value || null });
            }}
          />
        </div>
      </div>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      <SignOffDialog
        open={signOffOpen}
        onOpenChange={setSignOffOpen}
        issueId={issue.issueId}
        busy={busy}
        serverError={signOffError}
        onConfirm={confirmClose}
      />
    </div>
  );
}
