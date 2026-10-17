import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/project';
import { Issue } from '@/models/issue';
import { ProjectMembership } from '@/models/project-membership';

/**
 * Get the project IDs the user can access (owned or active member).
 * @param {string} clerkUserId
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
async function getAccessibleProjectIds(clerkUserId) {
  await connectToDatabase();
  const memberProjectIds = await ProjectMembership.find({
    user: clerkUserId,
    status: 'active',
  }).distinct('project');
  const ownedProjects = await Project.find({ createdBy: clerkUserId }).distinct('_id');
  return [...ownedProjects, ...memberProjectIds];
}

/**
 * Search across projects and issues the user can access.
 * Returns grouped results limited to 10 per type.
 * @param {string} clerkUserId
 * @param {string} query
 * @returns {Promise<{projects: object[], issues: object[]}>}
 */
export async function searchProjectsAndIssues(clerkUserId, query) {
  const trimmed = query.trim();
  if (!trimmed) return { projects: [], issues: [] };

  await connectToDatabase();
  const projectIds = await getAccessibleProjectIds(clerkUserId);

  if (projectIds.length === 0) return { projects: [], issues: [] };

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const [projects, issues] = await Promise.all([
    Project.find({
      _id: { $in: projectIds },
      $or: [
        { title: regex },
        { client: regex },
        { description: regex },
        { issueIdPrefix: regex },
      ],
    })
      .limit(10)
      .lean(),
    Issue.find({
      project: { $in: projectIds },
      $or: [{ issueId: regex }, { title: regex }, { description: regex }],
    })
      .populate('project', 'title')
      .limit(10)
      .lean(),
  ]);

  return {
    projects: projects.map((p) => ({
      id: String(p._id),
      type: 'project',
      title: p.title,
      subtitle: p.client,
      target: `/projects/${String(p._id)}`,
    })),
    issues: issues.map((i) => ({
      id: String(i._id),
      type: 'issue',
      title: i.issueId,
      subtitle: i.title,
      target: `/projects/${String(i.project._id)}/registry`,
    })),
  };
}
