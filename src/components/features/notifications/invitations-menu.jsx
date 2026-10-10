'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Top-bar notifications — pending project invitations with accept and
 * decline actions. Accepting activates the membership and grants access
 * to the project.
 */
export function InvitationsMenu() {
  const router = useRouter();
  const [invitations, setInvitations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/invitations');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations ?? []);
      }
    } catch {
      // Notifications are non-critical; ignore load failures.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const respond = async (invitationId, action) => {
    setRespondingId(invitationId);
    try {
      await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await loadInvitations();
      router.refresh();
    } catch {
      // Keep the invitation listed if the action fails.
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <Bell />
          {invitations.length > 0 && (
            <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full text-[0.6rem] font-semibold tabular-nums">
              {invitations.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {invitations.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              {loaded ? 'No pending invitations.' : 'Loading…'}
            </p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation._id}
                className="space-y-2 rounded-lg p-2.5 transition-colors hover:bg-accent/50"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    Project invitation:{' '}
                    <Link
                      href={`/projects/${invitation.project._id}`}
                      className="text-primary hover:underline"
                    >
                      {invitation.project.title}
                    </Link>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {invitation.invitedByName} invited you as {invitation.role}.
                  </p>
                  {invitation.personalMessage && (
                    <p className="text-muted-foreground rounded-md bg-muted p-2 text-xs italic">
                      “{invitation.personalMessage}”
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 flex-1"
                    disabled={respondingId === invitation._id}
                    onClick={() => respond(invitation._id, 'accept')}
                  >
                    <Check data-icon="inline-start" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1"
                    disabled={respondingId === invitation._id}
                    onClick={() => respond(invitation._id, 'decline')}
                  >
                    <X data-icon="inline-start" />
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
