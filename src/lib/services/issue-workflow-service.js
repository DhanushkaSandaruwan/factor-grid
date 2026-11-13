import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';
import { ISSUE_STATUSES, closureBlocker, validateSignature } from '@/lib/issue-workflow-rules';
import { toSerializable } from './issue-service';
import { getUserProfile } from './user-profile-service';
import { projectPeople } from './notification-service';
import { Project } from '@/models/project';

async function displayName(clerkUserId) {
  try {
    const profile = await getUserProfile(clerkUserId);
    return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'Team member';
  } catch {
    return 'Team member';
  }
}

/**
 * Change an issue's status, assignee or due date.
 *
 * - Closing requires every requirement to be closed (see closureBlocker) and a
 *   typed name as sign-off. The closer, time and name are stored on the issue.
 * - Reopening or moving to another status clears the sign-off.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} actor - Clerk user id of the person making the change
 * @param {{ status?: string, signature?: string, assignee?: string, dueDate?: string|null }} body
 * @returns {Promise<null | {ok: true, issue: object, summary: string} | {ok: false, errors: Record<string, string>}>}
 */
export async function updateIssueWorkflow(issueId, projectId, actor, body) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    project: new mongoose.Types.ObjectId(projectId),
  });
  if (!issue) return null;

  const errors = {};
  const summaries = [];

  if (body.status !== undefined) {
    const next = String(body.status);
    if (!ISSUE_STATUSES.includes(next)) {
      errors.status = 'Choose a valid status.';
    } else if (next === 'closed') {
      const blocker = closureBlocker(issue.toObject());
      const { name, error } = validateSignature(body.signature);
      if (blocker) errors.status = blocker;
      if (error) errors.signature = error;
      if (!blocker && !error) {
        issue.status = 'closed';
        issue.closedAt = new Date();
        issue.closedBy = actor;
        issue.closedByName = await displayName(actor);
        issue.signedName = name;
        summaries.push(`Closed the issue (signed by ${name})`);
      }
    } else if (issue.status !== next) {
      issue.status = next;
      issue.closedAt = null;
      issue.closedBy = '';
      issue.closedByName = '';
      issue.signedName = '';
      summaries.push(`Set status to ${next}`);
    }
  }

  if (body.assigneeId !== undefined) {
    const chosen = String(body.assigneeId ?? '');
    if (chosen === '') {
      if (issue.assigneeId || issue.assignee) summaries.push('Unassigned the issue');
      issue.assigneeId = '';
      issue.assignee = '';
    } else {
      const project = await Project.findById(issue.project).lean();
      const person = project ? (await projectPeople(project)).find((p) => p.userId === chosen) : null;
      if (!person) {
        errors.assigneeId = 'Choose someone who is a member of this project.';
      } else if (issue.assigneeId !== chosen) {
        issue.assigneeId = person.userId;
        issue.assignee = person.name;
        summaries.push(`Assigned to ${person.name}`);
      }
    }
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === '') {
      issue.dueDate = null;
      summaries.push('Cleared the due date');
    } else {
      const date = new Date(body.dueDate);
      if (Number.isNaN(date.getTime())) {
        errors.dueDate = 'Enter a valid date.';
      } else {
        issue.dueDate = date;
        summaries.push(`Set due date to ${date.toISOString().slice(0, 10)}`);
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  await issue.save();
  return { ok: true, issue: toSerializable(issue.toObject()), summary: summaries.join('; ') || 'No change' };
}
