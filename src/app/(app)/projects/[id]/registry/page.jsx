import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/lib/services/project-service';
import { getProjectAccess } from '@/lib/services/access-service';
import { getIssuesByProject } from '@/lib/services/issue-service';
import { projectPeople } from '@/lib/services/notification-service';
import { getLinksByProject } from '@/lib/services/link-service';
import { getAttributeOptions } from '@/lib/services/attribute-option-service';
import { isDerivedHfAttribute } from '@/lib/attribute-rules';
import { IssueRegistryClient } from '@/components/features/issues/issue-registry-client';

export async function generateMetadata({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  const project = await getProjectById(userId, id);
  return { title: project ? `Issue Registry — ${project.title}` : 'Issue Registry' };
}

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
  const access = await getProjectAccess(userId, id);
  const people = (await projectPeople(project)).map((p) => ({ userId: p.userId, name: p.name }));
  const canEdit = access?.canEdit ?? false;

  const [issues, links, { actionValueOptions }] = await Promise.all([
    getIssuesByProject(id),
    getLinksByProject(id),
    getAttributeOptions(),
  ]);

  return (
    <IssueRegistryClient
      projectId={id}
      people={people}
      canEdit={canEdit}
      projectTitle={project.title}
      issueIdPrefix={project.issueIdPrefix}
      initialIssues={issues}
      initialLinks={links}
      // Already populated (and serialized) by getProjectById, so the packages
      // chosen in the wizard are available here.
      projectPackages={project.packages}
      hfAttributes={project.hfAttributes.filter((name) => !isDerivedHfAttribute(name))}
      riskAttributes={project.riskAttributes}
      actionAttributes={project.actionAttributes}
      actionValueOptions={actionValueOptions}
    />
  );
}
