import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/lib/services/project-service';
import { getIssuesByProject } from '@/lib/services/issue-service';
import { getLinksByProject } from '@/lib/services/link-service';
import { getPackagesForProject } from '@/lib/services/package-service';
import { getAttributeOptions } from '@/lib/services/attribute-option-service';
import { IssueRegistryClient } from '@/components/features/issues/issue-registry-client';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Issue Registry — ${id}` };
};

/**
 * Issue Registry page for a project.
 * Toolbar: back button, project stats and issue list filters.
 * Body: issue list, selected issue details, recommendations, requirements
 * and attribute cards.
 */
export default async function IssueRegistryPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) notFound();

  const project = await getProjectById(userId, id);
  if (!project) notFound();

  const [issues, packages, links, { actionValueOptions }] = await Promise.all([
    getIssuesByProject(id),
    getPackagesForProject(id),
    getLinksByProject(id),
    getAttributeOptions(),
  ]);

  return (
    <IssueRegistryClient
      projectId={id}
      projectTitle={project.title}
      issueIdPrefix={project.issueIdPrefix}
      initialIssues={issues}
      initialLinks={links}
      projectPackages={packages}
      riskAttributes={project.riskAttributes}
      actionAttributes={project.actionAttributes}
      actionValueOptions={actionValueOptions}
    />
  );
}
