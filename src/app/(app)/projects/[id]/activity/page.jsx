import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getProjectAccess } from '@/lib/services/access-service';
import { listAuditEvents } from '@/lib/services/audit-service';
import { BackButton } from '@/components/features/projects/back-button';
import { Badge } from '@/components/ui/badge';
import { BaselinesCard } from '@/components/features/projects/baselines-card';

export const metadata = {
  title: 'Activity',
};

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Project activity log — who changed what and when. Read-only for every member. */
export default async function ProjectActivityPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  const access = await getProjectAccess(userId, id);
  if (!access) notFound();

  const events = await listAuditEvents(id, { limit: 300 });

  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center gap-3">
          <BackButton fallbackHref={`/projects/${id}`} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{access.project.title}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          </div>
        </header>

        <BaselinesCard projectId={id} canEdit={access.canEdit} />

        <p className="text-muted-foreground text-sm">
          Every change made to this project, newest first. Entries are recorded automatically and cannot be
          edited.
        </p>

        {events.length === 0 ? (
          <div className="bg-card ring-foreground/[0.07] text-muted-foreground rounded-xl p-8 text-center text-sm ring-1">
            No activity yet.
          </div>
        ) : (
          <ol className="bg-card ring-foreground/[0.07] divide-border/70 shadow-soft divide-y rounded-xl ring-1">
            {events.map((event) => (
              <li
                key={event._id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <time
                  dateTime={event.createdAt}
                  className="text-muted-foreground font-mono text-xs whitespace-nowrap sm:w-40"
                >
                  {formatWhen(event.createdAt)}
                </time>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">{event.summary}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">{event.actorName}</span>
                    <Badge tone="neutral" mono>
                      {event.action}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
