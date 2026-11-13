import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getProjectAccess } from '@/lib/services/access-service';
import { BackButton } from '@/components/features/projects/back-button';
import { ImportPanel } from '@/components/features/issues/import-panel';

export const metadata = {
  title: 'Import issues',
};

/** Bulk import of issues from a CSV file. Editors and the owner only. */
export default async function ImportIssuesPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  const access = await getProjectAccess(userId, id);
  if (!access) notFound();

  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
        <header className="flex items-center gap-3">
          <BackButton fallbackHref={`/projects/${id}/registry`} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{access.project.title}</p>
            <h1 className="text-2xl font-semibold tracking-tight">Import issues</h1>
          </div>
        </header>
        {access.canEdit ? (
          <ImportPanel projectId={id} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Only the project owner or an editor can import issues.
          </p>
        )}
      </div>
    </div>
  );
}
