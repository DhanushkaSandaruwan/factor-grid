import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/project';
import { ProjectMembership } from '@/models/project-membership';
import { UserProfile } from '@/models/user-profile';
import { Issue } from '@/models/issue';
import { Notification } from '@/models/notification';
import { matchPerson } from '@/lib/mention-match';

/** Issues due within this many days get a "due soon" reminder. */
export const DUE_SOON_DAYS = 3;
const MAX_DUE_SCAN = 500;

/** Active members and the owner of a project, as people that names can refer to. */
export async function projectPeople(project) {
  await connectToDatabase();
  const members = await ProjectMembership.find({
    project: project._id,
    status: 'active',
    user: { $ne: null },
  }).lean();
  const people = members.map((m) => ({
    userId: m.user,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    name: [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email,
  }));
  if (!people.some((p) => p.userId === project.createdBy)) {
    const owner = await UserProfile.findOne({ clerkUserId: project.createdBy }).lean();
    const name = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'Project owner';
    people.push({
      userId: project.createdBy,
      firstName: owner?.firstName ?? '',
      lastName: owner?.lastName ?? '',
      email: '',
      name,
    });
  }
  return people;
}

/**
 * Tell each person mentioned in a comment. Unknown or ambiguous names and the
 * author themselves are skipped. Never throws: a failed notification must not
 * undo the comment.
 */
export async function notifyMentions({ projectId, issueId, actor, actorName, mentions }) {
  try {
    if (!mentions?.length) return;
    await connectToDatabase();
    const project = await Project.findById(projectId).lean();
    if (!project) return;
    const people = await projectPeople(project);
    const recipients = new Set();
    for (const name of mentions) {
      const person = matchPerson(name, people);
      if (person && person.userId !== actor) recipients.add(person.userId);
    }
    if (recipients.size === 0) return;

    const issue = await Issue.findById(issueId).select('issueId').lean();
    const code = issue?.issueId ?? 'an issue';
    await Notification.insertMany(
      [...recipients].map((recipient) => ({
        recipient,
        project: projectId,
        issue: issueId,
        kind: 'mention',
        message: `${actorName} mentioned you on ${code}`,
        link: `/projects/${projectId}/registry`,
      })),
    );
  } catch (error) {
    console.error('[notifications] mention failed:', error);
  }
}

const day = (date) => date.toISOString().slice(0, 10);

/**
 * Create due-soon and overdue reminders for the issues this user is
 * responsible for (the matching assignee, or the owner when there is no match).
 * Each reminder is written once; repeat calls create nothing new.
 */
export async function refreshDueReminders(userId) {
  await connectToDatabase();
  const [owned, memberOf] = await Promise.all([
    Project.find({ createdBy: userId }).select('_id').lean(),
    ProjectMembership.find({ user: userId, status: 'active' }).distinct('project'),
  ]);
  const projectIds = [...new Set([...owned.map((p) => String(p._id)), ...memberOf.map(String)])];
  if (projectIds.length === 0) return 0;

  const now = new Date();
  const soon = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.toISOString().slice(0, 10));
  const issues = await Issue.find({
    project: { $in: projectIds.map((id) => new mongoose.Types.ObjectId(id)) },
    status: 'open',
    dueDate: { $ne: null, $lte: soon },
  })
    .select('issueId assignee assigneeId dueDate project')
    .limit(MAX_DUE_SCAN)
    .lean();
  if (issues.length === 0) return 0;

  const projects = new Map(
    (await Project.find({ _id: { $in: [...new Set(issues.map((i) => String(i.project)))] } }).lean()).map(
      (p) => [String(p._id), p],
    ),
  );
  const peopleByProject = new Map();

  const docs = [];
  for (const issue of issues) {
    const project = projects.get(String(issue.project));
    if (!project) continue;
    const pid = String(project._id);
    if (!peopleByProject.has(pid)) peopleByProject.set(pid, await projectPeople(project));
    const people = peopleByProject.get(pid);
    const responsible =
      (issue.assigneeId && people.find((p) => p.userId === issue.assigneeId)) ||
      (issue.assignee && matchPerson(issue.assignee, people)) ||
      null;
    const recipient = responsible?.userId ?? project.createdBy;
    if (recipient !== userId) continue;

    const due = new Date(issue.dueDate);
    const kind = due < startOfToday ? 'overdue' : 'due_soon';
    docs.push({
      recipient: userId,
      project: pid,
      issue: String(issue._id),
      kind,
      message:
        kind === 'overdue'
          ? `${issue.issueId} is overdue (was due ${day(due)})`
          : `${issue.issueId} is due ${day(due)}`,
      link: `/projects/${pid}/registry`,
      dedupeKey: `${kind}:${issue._id}:${day(due)}:${userId}`,
    });
  }
  if (docs.length === 0) return 0;

  // Skip reminders that already exist; the unique index on dedupeKey is the
  // safety net for two requests racing each other.
  const existing = new Set(
    await Notification.find({ dedupeKey: { $in: docs.map((d) => d.dedupeKey) } }).distinct('dedupeKey'),
  );
  const fresh = docs.filter((d) => !existing.has(d.dedupeKey));
  if (fresh.length === 0) return 0;
  try {
    const created = await Notification.insertMany(fresh, { ordered: false });
    return created.length;
  } catch (error) {
    if (error?.code === 11000) return 0;
    throw error;
  }
}

const serialize = (n) => ({
  _id: String(n._id),
  kind: n.kind,
  message: n.message,
  link: n.link,
  read: Boolean(n.readAt),
  createdAt: new Date(n.createdAt).toISOString(),
});

/** Latest notifications for a user (after refreshing due reminders), with the unread count. */
export async function listNotifications(userId, limit = 30) {
  await refreshDueReminders(userId);
  const [docs, unread] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ recipient: userId, readAt: null }),
  ]);
  return { notifications: docs.map(serialize), unread };
}

/** Mark some (or all) of a user's notifications as read. */
export async function markRead(userId, { ids, all } = {}) {
  await connectToDatabase();
  const filter = { recipient: userId, readAt: null };
  if (!all) {
    const valid = (ids ?? []).filter((id) => mongoose.isValidObjectId(id));
    if (valid.length === 0) return 0;
    filter._id = { $in: valid };
  }
  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return result.modifiedCount;
}
