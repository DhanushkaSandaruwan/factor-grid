import mongoose from 'mongoose';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/project';
import { ProjectMembership } from '@/models/project-membership';
import { collectFieldErrors } from './validation-utils';

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(['editor', 'viewer'], { message: 'Select a project role' }),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  contactNumber: z.string().trim().min(1, 'Contact number is required').max(30),
  personalMessage: z.string().trim().max(1000).optional().default(''),
});

/** Map a membership document to a plain object with string ids. */
function toSerializableMembership(membership) {
  return {
    ...membership,
    _id: String(membership._id),
    project: String(membership.project),
  };
}

/** Fetch a Clerk user's display summary, or null when unavailable. */
async function getClerkUserSummary(clerkUserId) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    return {
      id: user.id,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.primaryEmailAddress?.emailAddress ?? '',
    };
  } catch (error) {
    console.error('[membership-service] failed to load Clerk user:', error);
    return null;
  }
}

/** Find the registered Clerk user for an email address, or null. */
async function findClerkUserByEmail(email) {
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({ emailAddress: [email] });
    const users = response.data ?? response;
    return Array.isArray(users) && users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('[membership-service] failed to look up Clerk user by email:', error);
    return null;
  }
}

/**
 * Does the user have an active membership on the project (optionally
 * restricted to the given roles)?
 * @param {string} clerkUserId
 * @param {string} projectId
 * @param {string[]=} roles
 */
export async function hasActiveMembership(clerkUserId, projectId, roles) {
  if (!mongoose.isValidObjectId(projectId)) return false;
  await connectToDatabase();
  const count = await ProjectMembership.countDocuments({
    project: projectId,
    user: clerkUserId,
    status: 'active',
    ...(roles ? { role: { $in: roles } } : {}),
  });
  return count > 0;
}

/**
 * List the project team: the owner plus all invited and active members.
 * @param {object} project - lean project document
 */
export async function getProjectTeam(project) {
  await connectToDatabase();
  const [owner, memberships] = await Promise.all([
    getClerkUserSummary(project.createdBy),
    ProjectMembership.find({ project: project._id, status: { $in: ['invited', 'active'] } })
      .sort({ createdAt: 1 })
      .lean(),
  ]);
  return {
    owner: owner ?? { id: project.createdBy, firstName: 'Unknown', lastName: 'owner', email: '' },
    members: memberships.map(toSerializableMembership),
  };
}

/**
 * Invite a team member. Only the project owner or an active editor can
 * invite. Registered invitees are linked to their Clerk user so they get an
 * in-platform notification; unregistered ones are stored for the future
 * email-invitation flow.
 * @param {string} clerkUserId
 * @param {string} projectId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, member: object, registered: boolean} |
 *   {ok: false, errors?: Record<string,string>, code?: string}>}
 */
export async function inviteMember(clerkUserId, projectId, payload) {
  const parsed = inviteMemberSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  if (!mongoose.isValidObjectId(projectId)) {
    return { ok: false, code: 'not_found' };
  }
  await connectToDatabase();
  const project = await Project.findById(projectId).lean();
  if (!project) {
    return { ok: false, code: 'not_found' };
  }

  const canManage =
    project.createdBy === clerkUserId ||
    (await hasActiveMembership(clerkUserId, projectId, ['editor']));
  if (!canManage) {
    return { ok: false, code: 'forbidden' };
  }

  const { email, role, firstName, lastName, contactNumber, personalMessage } = parsed.data;

  const owner = await getClerkUserSummary(project.createdBy);
  if (owner?.email?.toLowerCase() === email) {
    return { ok: false, errors: { email: 'The project owner is already part of the project.' } };
  }

  const existing = await ProjectMembership.findOne({ project: project._id, email }).lean();
  if (existing && existing.status !== 'declined') {
    return {
      ok: false,
      errors: {
        email:
          existing.status === 'active'
            ? 'This user is already a member of the project.'
            : 'This user has already been invited to the project.',
      },
    };
  }

  const clerkUser = await findClerkUserByEmail(email);
  const membershipData = {
    project: project._id,
    user: clerkUser?.id ?? null,
    email,
    role,
    firstName,
    lastName,
    contactNumber,
    personalMessage,
    invitedBy: clerkUserId,
    status: 'invited',
    acceptedAt: null,
  };

  // A previously declined invitation is re-sent by updating the same record.
  const membership = existing
    ? await ProjectMembership.findByIdAndUpdate(existing._id, membershipData, { new: true }).lean()
    : await ProjectMembership.create(membershipData).then((doc) => doc.toObject());

  return {
    ok: true,
    member: toSerializableMembership(membership),
    registered: Boolean(clerkUser),
  };
}

/**
 * List the user's pending project invitations (matched by Clerk user id or
 * account email), newest first, with project and inviter details.
 * @param {string} clerkUserId
 */
export async function getMyInvitations(clerkUserId) {
  const me = await getClerkUserSummary(clerkUserId);
  await connectToDatabase();

  const query = { status: 'invited' };
  if (me?.email) {
    query.$or = [{ user: clerkUserId }, { email: me.email.toLowerCase() }];
  } else {
    query.user = clerkUserId;
  }

  const invitations = await ProjectMembership.find(query)
    .sort({ createdAt: -1 })
    .populate({ path: 'project', select: 'title client issueIdPrefix createdBy' })
    .lean();

  const inviterSummaries = await Promise.all(
    [...new Set(invitations.map((invitation) => invitation.invitedBy))].map(getClerkUserSummary)
  );
  const inviterNames = new Map(
    inviterSummaries
      .filter(Boolean)
      .map((summary) => [summary.id, `${summary.firstName} ${summary.lastName}`.trim()])
  );

  return invitations
    .filter((invitation) => invitation.project)
    .map((invitation) => ({
      ...toSerializableMembership(invitation),
      project: {
        _id: String(invitation.project._id),
        title: invitation.project.title,
        client: invitation.project.client,
        issueIdPrefix: invitation.project.issueIdPrefix,
      },
      invitedByName: inviterNames.get(invitation.invitedBy) || 'A project member',
    }));
}

/**
 * Accept or decline a pending invitation. Accepting activates the
 * membership (granting project access) and links the Clerk user id.
 * @param {string} clerkUserId
 * @param {string} invitationId
 * @param {'accept' | 'decline'} action
 */
export async function respondToInvitation(clerkUserId, invitationId, action) {
  if (!['accept', 'decline'].includes(action)) {
    return { ok: false, code: 'bad_request' };
  }
  if (!mongoose.isValidObjectId(invitationId)) {
    return { ok: false, code: 'not_found' };
  }

  const me = await getClerkUserSummary(clerkUserId);
  await connectToDatabase();
  const invitation = await ProjectMembership.findById(invitationId).lean();
  if (!invitation || invitation.status !== 'invited') {
    return { ok: false, code: 'not_found' };
  }

  const isMine =
    invitation.user === clerkUserId ||
    (me?.email && invitation.email === me.email.toLowerCase());
  if (!isMine) {
    return { ok: false, code: 'not_found' };
  }

  await ProjectMembership.updateOne(
    { _id: invitation._id },
    action === 'accept'
      ? { $set: { status: 'active', user: clerkUserId, acceptedAt: new Date() } }
      : { $set: { status: 'declined' } }
  );
  return { ok: true };
}
