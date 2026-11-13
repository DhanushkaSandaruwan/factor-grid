import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getProjectAccess } from '@/lib/services/access-service';
import { getIssuesByProject } from '@/lib/services/issue-service';
import { getLinksByProject } from '@/lib/services/link-service';
import { recordAudit } from '@/lib/services/audit-service';
import { PrintButton } from '@/components/features/projects/print-button';
import { BackButton } from '@/components/features/projects/back-button';

export const metadata = {
  title: 'Registry report',
};

function day(value) {
  return value
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
}

/**
 * Printable registry report: a summary followed by every issue with its
 * recommendations, requirements, linked records and evidence. Use the Print
 * button and choose "Save as PDF" to produce a document for sign-off or audit.
 */
export default async function ProjectReportPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  const access = await getProjectAccess(userId, id);
  if (!access) notFound();

  const { project } = access;
  const [issues, links] = await Promise.all([getIssuesByProject(id), getLinksByProject(id)]);
  const linkById = new Map(links.map((link) => [String(link._id), link]));

  await recordAudit({
    projectId: id,
    actor: userId,
    action: 'project.report',
    summary: `Opened the printable report (${issues.length} issues)`,
  });

  const counts = { open: 0, closed: 0, transferred: 0 };
  for (const issue of issues) counts[issue.status] = (counts[issue.status] ?? 0) + 1;

  return (
    <div className="bg-background text-foreground h-full overflow-y-auto">
      <article className="mx-auto w-full max-w-4xl space-y-6 p-6 print:max-w-none print:p-0 print:text-black">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4 print:border-black">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="print:hidden">
              <BackButton fallbackHref={`/projects/${id}`} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="eyebrow">Issue registry report</p>
              <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
              <p className="text-muted-foreground text-sm">
                {project.client} · Prefix {project.issueIdPrefix} · Generated {day(new Date())}
              </p>
            </div>
          </div>
          <div className="print:hidden">
            <PrintButton />
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Total issues" value={issues.length} />
          <Stat label="Open" value={counts.open} />
          <Stat label="Closed" value={counts.closed} />
          <Stat label="Transferred" value={counts.transferred} />
        </section>

        {issues.length === 0 ? (
          <p className="text-muted-foreground text-sm">No issues registered in this project.</p>
        ) : null}

        {issues.map((issue) => (
          <section key={issue._id} className="break-inside-avoid space-y-3 border-t pt-4 print:border-black">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-mono text-base font-semibold">{issue.issueId}</h2>
              <span className="text-base font-medium">{issue.title}</span>
              <span className="text-muted-foreground text-xs uppercase">{issue.status}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              <Meta label="Assignee" value={issue.assignee || '—'} />
              <Meta label="Due" value={day(issue.dueDate)} />
              <Meta
                label="Closed"
                value={issue.closedAt ? `${day(issue.closedAt)} · ${issue.closedByName}` : '—'}
              />
              <Meta label="Signed" value={issue.signedName || '—'} />
              <Meta label="Source" value={issue.source || '—'} />
              <Meta label="Type" value={issue.issueType || '—'} />
              <Meta
                label="Packages"
                value={
                  (issue.packages ?? []).map((p) => (typeof p === 'object' ? p.packageId : p)).join(', ') ||
                  '—'
                }
              />
            </dl>
            {issue.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{issue.description}</p>
            ) : null}
            {issue.consequences ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                <span className="font-medium">Consequences: </span>
                {issue.consequences}
              </p>
            ) : null}

            {(issue.recommendations ?? []).map((rec, index) => (
              <div
                key={rec._id}
                className="border-border/70 space-y-2 rounded-md border p-3 print:border-black"
              >
                <p className="text-sm">
                  <span className="font-mono text-xs">R{String(index + 1).padStart(2, '0')}</span> {rec.text}
                </p>
                {(rec.requirements ?? []).length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground text-left">
                      <tr>
                        <th className="py-1 font-medium">Requirement</th>
                        <th className="py-1 font-medium">Status</th>
                        <th className="py-1 font-medium">Linked records</th>
                        <th className="py-1 font-medium">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.requirements.map((req) => (
                        <tr key={req._id} className="border-border/60 border-t align-top">
                          <td className="py-1.5 pr-3">{req.text}</td>
                          <td className="py-1.5 pr-3 font-medium capitalize">{req.status}</td>
                          <td className="py-1.5 pr-3 font-mono">
                            {(req.linkIds ?? [])
                              .map((linkId) => linkById.get(String(linkId)))
                              .filter(Boolean)
                              .map((link) => `${link.type === 'hfdr' ? 'HF' : 'PS'}:${link.code}`)
                              .join(', ') || '—'}
                          </td>
                          <td className="py-1.5">
                            {(req.evidence ?? []).map((file) => file.filename).join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground text-xs">No requirements recorded.</p>
                )}
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border-border/70 rounded-lg border p-3 print:border-black">
      <p className="eyebrow">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
