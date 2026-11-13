import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AuditEvent } from '@/models/audit-event';
import { getUserProfile } from './user-profile-service';

/** Name shown in the activity log for a user, falling back to a neutral label. */
async function resolveActorName(clerkUserId) {
  try {
    const profile = await getUserProfile(clerkUserId);
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
    return name || 'Team member';
  } catch {
    return 'Team member';
  }
}

/**
 * Append an activity-log entry. Never throws: a failed audit write is logged
 * and must not undo or fail the change the user just made.
 * @param {{ projectId: string, issueId?: string, actor: string, action: string, summary: string }} event
 */
export async function recordAudit({ projectId, issueId, actor, action, summary }) {
  try {
    if (!mongoose.isValidObjectId(projectId)) return;
    await connectToDatabase();
    const actorName = await resolveActorName(actor);
    await AuditEvent.create({
      project: projectId,
      issue: issueId && mongoose.isValidObjectId(issueId) ? issueId : undefined,
      actor,
      actorName,
      action,
      summary: String(summary).slice(0, 500),
    });
  } catch (error) {
    console.error('[audit] failed to record event:', action, error);
  }
}

/**
 * Newest-first activity for a project, optionally limited to one issue.
 * @param {string} projectId
 * @param {{ issueId?: string, limit?: number }} [options]
 */
export async function listAuditEvents(projectId, { issueId, limit = 200 } = {}) {
  await connectToDatabase();
  const filter = { project: projectId };
  if (issueId && mongoose.isValidObjectId(issueId)) filter.issue = issueId;

  const events = await AuditEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 500))
    .lean();

  return events.map((event) => ({
    _id: String(event._id),
    action: event.action,
    summary: event.summary,
    actorName: event.actorName || 'Team member',
    issue: event.issue ? String(event.issue) : null,
    createdAt: new Date(event.createdAt).toISOString(),
  }));
}
