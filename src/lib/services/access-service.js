/**
 * Project access rules, enforced on the server. Every write path must go
 * through `getProjectAccess` (or the route guard built on it) so that viewers
 * can read a project but never change it.
 *
 * Roles:
 * - owner:  the user who created the project (full control, including delete).
 * - editor: an active member with the editor role (can change project content).
 * - viewer: an active member with the viewer role (read-only).
 */

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/project';
import { ProjectMembership } from '@/models/project-membership';

/**
 * Resolve what a user may do in a project.
 * @param {string|null} clerkUserId
 * @param {string} projectId
 * @returns {Promise<null | {project: object, role: 'owner'|'editor'|'viewer', canEdit: boolean, isOwner: boolean}>}
 *   null when the project does not exist or the user has no active access.
 */
export async function getProjectAccess(clerkUserId, projectId) {
  if (!clerkUserId || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();

  const project = await Project.findById(projectId).lean();
  if (!project) return null;

  if (project.createdBy === clerkUserId) {
    return { project, role: 'owner', canEdit: true, isOwner: true };
  }

  const membership = await ProjectMembership.findOne({
    project: project._id,
    user: clerkUserId,
    status: 'active',
  }).lean();
  if (!membership) return null;

  const role = membership.role === 'editor' ? 'editor' : 'viewer';
  return { project, role, canEdit: role === 'editor', isOwner: false };
}
