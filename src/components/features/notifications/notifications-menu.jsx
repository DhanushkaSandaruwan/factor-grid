'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlarmClock, AtSign, BellRing, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

const POLL_MS = 60_000;
const ICONS = { mention: AtSign, due_soon: AlarmClock, overdue: AlarmClock };

/** Project invitations waiting for an answer, with accept and decline. */
function InvitationList({ invitations, busyId, onRespond }) {
  if (invitations.length === 0) return null;
  return (
    <div className="space-y-1.5 p-1.5">
      <p className="eyebrow px-1.5 pt-1">Invitations</p>
      {invitations.map((invitation) => (
        <div key={invitation._id} className="space-y-2 rounded-lg p-2.5">
          <p className="text-sm">
            <span className="font-medium">{invitation.invitedByName}</span> invited you to{' '}
            <Link href={`/projects/${invitation.project._id}`} className="text-primary hover:underline">
              {invitation.project.title}
            </Link>{' '}
            as {invitation.role}.
          </p>
          {invitation.personalMessage ? (
            <p className="text-muted-foreground bg-muted rounded-md p-2 text-xs italic">
              “{invitation.personalMessage}”
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1"
              disabled={busyId === invitation._id}
              onClick={() => onRespond(invitation._id, 'accept')}
            >
              {busyId === invitation._id ? (
                <Spinner className="size-3" />
              ) : (
                <Check data-icon="inline-start" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1"
              disabled={busyId === invitation._id}
              onClick={() => onRespond(invitation._id, 'decline')}
            >
              <X data-icon="inline-start" />
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The one bell in the top bar: project invitations (answerable here), mentions
 * and due-date reminders. Refreshes every minute and when opened.
 */
export function NotificationsMenu() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [invitations, setInvitations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [notes, invites] = await Promise.all([
        fetch('/api/notifications').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/invitations').then((r) => (r.ok ? r.json() : null)),
      ]);
      if (notes) {
        setItems(notes.notifications ?? []);
        setUnread(notes.unread ?? 0);
      }
      if (invites) setInvitations(invites.invitations ?? []);
    } catch {
      // Best-effort; the next poll tries again.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function markRead(body) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  }

  async function respond(invitationId, action) {
    setBusyId(invitationId);
    try {
      await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await load();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const badge = unread + invitations.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <BellRing />
          {badge > 0 ? (
            <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums">
              {badge > 9 ? '9+' : badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border/70 flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => markRead({ all: true })}
              className="text-primary hover:text-primary/80 text-xs font-medium"
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="scrollbar-refined max-h-96 overflow-y-auto">
          <InvitationList invitations={invitations} busyId={busyId} onRespond={respond} />
          <div className="p-1.5">
            {!loaded ? (
              <p className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <Spinner className="size-3.5" /> Loading…
              </p>
            ) : items.length === 0 && invitations.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">You&apos;re all caught up.</p>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.kind] ?? AtSign;
                return (
                  <Link
                    key={n._id}
                    href={n.link}
                    onClick={() => {
                      if (!n.read) markRead({ ids: [n._id] });
                      setOpen(false);
                    }}
                    className={`focus-ring hover:bg-muted/60 flex gap-3 rounded-lg p-2.5 transition-colors ${n.read ? 'opacity-70' : ''}`}
                  >
                    <Icon
                      className={`mt-0.5 size-4 shrink-0 ${n.kind === 'overdue' ? 'text-destructive' : 'text-primary'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-muted-foreground text-[0.7rem]">
                        {new Date(n.createdAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!n.read ? (
                      <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-label="Unread" />
                    ) : null}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
