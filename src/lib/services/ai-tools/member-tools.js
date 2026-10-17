import { getProjectTeam, inviteMember } from '@/lib/services/membership-service';
import { getProjectById } from '@/lib/services/project-service';

/**
 * Member tools — list and invite team members on projects.
 */

export const listMembersTool = {
  name: 'list_members',
  description: 'List all team members of a project with their roles and status.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
    },
    required: ['projectId'],
  },
  /**
   * @param {{projectId: string}} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };
    const team = await getProjectTeam(project);
    return { ok: true, members: team };
  },
};

export const inviteMemberTool = {
  name: 'invite_member',
  description:
    'Invite a person to a project by email. They receive an invitation they can ' +
    'accept or decline. Role is "editor" or "viewer".',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      email: { type: 'string', description: 'The invitee’s email address.' },
      firstName: { type: 'string', description: 'The invitee’s first name.' },
      lastName: { type: 'string', description: 'The invitee’s last name.' },
      role: { type: 'string', enum: ['editor', 'viewer'], description: 'Their project role.' },
      personalMessage: { type: 'string', description: 'Optional message to include.' },
    },
    required: ['projectId', 'email', 'firstName', 'lastName', 'role'],
  },
  /**
   * @param {Record<string, unknown>} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };

    const canManage =
      project.createdBy === ctx.userId ||
      (await getProjectTeam(project)).some(
        (m) => m.user === ctx.userId && m.role === 'editor' && m.status === 'active'
      );
    if (!canManage) return { ok: false, error: 'Only project owners and editors can invite members.' };

    const result = await inviteMember(ctx.userId, String(args.projectId), {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      contactNumber: args.contactNumber ?? '',
      personalMessage: args.personalMessage ?? '',
    });
    if (!result?.ok) {
      return { ok: false, error: result?.errors?.email ?? result?.code ?? 'Invitation failed.' };
    }
    return { ok: true, member: result.member, registered: result.registered };
  },
};
