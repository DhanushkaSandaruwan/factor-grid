'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OptionChip } from './option-chip';

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const EMPTY_FORM = {
  email: '',
  role: 'viewer',
  firstName: '',
  lastName: '',
  contactNumber: '',
  personalMessage: '',
};

function RoleBadge({ role }) {
  return (
    <span className="bg-accent text-accent-foreground inline-flex h-5 items-center rounded-md px-1.5 text-[0.7rem] font-medium capitalize">
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md px-1.5 text-[0.7rem] font-medium ${
        status === 'active'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {status === 'active' ? 'Active' : 'Invited'}
    </span>
  );
}

function MemberRow({ name, email, badges }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0 last:pb-0">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground truncate text-xs">{email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{badges}</div>
    </li>
  );
}

/**
 * Project team section — owner and members with an invite dialog. The
 * invite form auto-populates the member's details when the email belongs
 * to a registered platform user.
 * @param {{ projectId: string, team: {owner: object, members: object[]}, canManage: boolean }} props
 */
export function ProjectTeam({ projectId, team, canManage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [registeredHint, setRegisteredHint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Look up the email against registered users and populate the details.
  const handleEmailBlur = async () => {
    const email = form.email.trim();
    if (!email || !email.includes('@')) return;
    try {
      const response = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (response.ok && data.found) {
        setForm((current) => ({
          ...current,
          firstName: data.firstName || current.firstName,
          lastName: data.lastName || current.lastName,
          contactNumber: data.contactNumber || current.contactNumber,
        }));
        setRegisteredHint('Registered user — details populated automatically.');
      } else {
        setRegisteredHint('');
      }
    } catch {
      setRegisteredHint('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (response.ok) {
        setOpen(false);
        setForm(EMPTY_FORM);
        setRegisteredHint('');
        router.refresh();
        return;
      }
      if (response.status === 400 && data?.errors) {
        setFieldErrors(data.errors);
      } else {
        setFormError(data?.error ?? 'Failed to send the invitation.');
      }
    } catch {
      setFormError('Failed to send the invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-enterprise [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle>Team members</CardTitle>
        <CardDescription>People with access to this project.</CardDescription>
        {canManage && (
          <CardAction>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus data-icon="inline-start" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Invite a team member</DialogTitle>
                  <DialogDescription>
                    They will get an in-platform notification to accept or decline. If the email
                    belongs to a registered user, their details are filled in automatically.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="invite-email">Email address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        required
                        placeholder="member@company.com"
                        value={form.email}
                        onChange={setField('email')}
                        onBlur={handleEmailBlur}
                        aria-invalid={Boolean(fieldErrors.email)}
                      />
                      {fieldErrors.email ? (
                        <p className="text-destructive text-xs">{fieldErrors.email}</p>
                      ) : (
                        registeredHint && (
                          <p className="text-primary flex items-center gap-1 text-xs">
                            <Check className="size-3" />
                            {registeredHint}
                          </p>
                        )
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label>Project role</Label>
                      <div className="flex gap-2">
                        {ROLE_OPTIONS.map((option) => (
                          <OptionChip
                            key={option.value}
                            label={option.label}
                            selected={form.role === option.value}
                            onToggle={() =>
                              setForm((current) => ({ ...current, role: option.value }))
                            }
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Editors can update the project; viewers have read-only access.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-first-name">First name</Label>
                      <Input
                        id="invite-first-name"
                        required
                        value={form.firstName}
                        onChange={setField('firstName')}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                      />
                      {fieldErrors.firstName && (
                        <p className="text-destructive text-xs">{fieldErrors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invite-last-name">Last name</Label>
                      <Input
                        id="invite-last-name"
                        required
                        value={form.lastName}
                        onChange={setField('lastName')}
                        aria-invalid={Boolean(fieldErrors.lastName)}
                      />
                      {fieldErrors.lastName && (
                        <p className="text-destructive text-xs">{fieldErrors.lastName}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="invite-contact">Contact number</Label>
                      <Input
                        id="invite-contact"
                        type="tel"
                        required
                        placeholder="+94 77 123 4567"
                        value={form.contactNumber}
                        onChange={setField('contactNumber')}
                        aria-invalid={Boolean(fieldErrors.contactNumber)}
                      />
                      {fieldErrors.contactNumber && (
                        <p className="text-destructive text-xs">{fieldErrors.contactNumber}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="invite-message">Personal message (optional)</Label>
                      <Textarea
                        id="invite-message"
                        rows={3}
                        placeholder="A short note the member will see with the invitation…"
                        value={form.personalMessage}
                        onChange={setField('personalMessage')}
                      />
                    </div>
                  </div>

                  {formError && <p className="text-destructive text-sm">{formError}</p>}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      <Mail data-icon="inline-start" />
                      {submitting ? 'Sending…' : 'Send invitation'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-0">
          <MemberRow
            name={`${team.owner.firstName} ${team.owner.lastName}`.trim() || 'Project owner'}
            email={team.owner.email || '—'}
            badges={<RoleBadge role="owner" />}
          />
          {team.members.map((member) => (
            <MemberRow
              key={member._id}
              name={`${member.firstName} ${member.lastName}`.trim()}
              email={member.email}
              badges={
                <>
                  <RoleBadge role={member.role} />
                  <StatusBadge status={member.status} />
                </>
              }
            />
          ))}
          {team.members.length === 0 && (
            <li className="text-muted-foreground py-2.5 text-sm">
              No additional members yet. Invite teammates to collaborate on this project.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
