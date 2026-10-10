import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAttributeOptions } from '@/lib/services/attribute-option-service';
import { getPackages } from '@/lib/services/package-service';
import { getProjectById } from '@/lib/services/project-service';
import { hasActiveMembership } from '@/lib/services/membership-service';
import { BackButton } from '@/components/features/projects/back-button';
import { NewProjectWizard } from '@/components/features/projects/new-project-wizard';

export const metadata = {
  title: 'Edit Project',
};

/** Edit project page — the same wizard as creation, prefilled with the project. */
export default async function EditProjectPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  const [project, attributeOptions, packages] = await Promise.all([
    getProjectById(userId, id),
    getAttributeOptions(),
    getPackages(),
  ]);
  if (!project) notFound();

  // Only the owner or an active editor may edit the project.
  const isOwner = String(project.createdBy) === userId;
  const canEdit =
    isOwner || (await hasActiveMembership(userId, id, ['editor']));
  if (!canEdit) notFound();

  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl p-6">
        <div className="mb-4">
          <BackButton fallbackHref={`/projects/${String(project._id)}`} />
        </div>
        <NewProjectWizard
          mode="edit"
          projectId={String(project._id)}
          attributeOptions={attributeOptions}
          initialPackages={packages}
          initialBasics={{
            title: project.title,
            client: project.client,
            description: project.description ?? '',
            issueIdPrefix: project.issueIdPrefix,
          }}
          initialSelections={{
            hf: project.hfAttributes ?? [],
            risk: project.riskAttributes ?? [],
            action: project.actionAttributes ?? [],
          }}
          initialSelectedPackageIds={(project.packages ?? []).map((pkg) => String(pkg._id))}
        />
      </div>
    </div>
  );
}
