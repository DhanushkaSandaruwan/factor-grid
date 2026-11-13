import { notifyMentions } from './notification-service';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { IssueComment } from '@/models/issue-comment';
import { extractMentions, validateComment } from '@/lib/comment-rules';
import { getUserProfile } from './user-profile-service';

async function displayName(clerkUserId) {
  try {
    const profile = await getUserProfile(clerkUserId);
    return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'Team member';
  } catch {
    return 'Team member';
  }
}

const serialize = (c) => ({
  _id: String(c._id),
  body: c.body,
  authorName: c.authorName || 'Team member',
  author: c.author,
  mentions: c.mentions ?? [],
  createdAt: new Date(c.createdAt).toISOString(),
});

/** Comments on one issue, oldest first. */
export async function listComments(projectId, issueId) {
  if (!mongoose.isValidObjectId(issueId)) return [];
  await connectToDatabase();
  const docs = await IssueComment.find({ project: projectId, issue: issueId }).sort({ createdAt: 1 }).lean();
  return docs.map(serialize);
}

/** Post a comment. Returns { ok, comment } or { ok: false, errors }. */
export async function addComment(projectId, issueId, clerkUserId, raw) {
  const { body, error } = validateComment(raw);
  if (error) return { ok: false, errors: { body: error } };
  await connectToDatabase();
  const doc = await IssueComment.create({
    project: projectId,
    issue: issueId,
    author: clerkUserId,
    authorName: await displayName(clerkUserId),
    body,
    mentions: extractMentions(body),
  });
  await notifyMentions({
    projectId,
    issueId,
    actor: clerkUserId,
    actorName: doc.authorName,
    mentions: doc.mentions,
  });
  return { ok: true, comment: serialize(doc.toObject()) };
}

/**
 * Delete a comment. Allowed for its author and for project editors or the owner.
 * @param {{ canModerate: boolean }} access - whether the caller may delete any comment
 */
export async function deleteComment(projectId, issueId, commentId, clerkUserId, access) {
  if (!mongoose.isValidObjectId(commentId)) return { ok: false, code: 'not_found' };
  await connectToDatabase();
  const doc = await IssueComment.findOne({ _id: commentId, project: projectId, issue: issueId });
  if (!doc) return { ok: false, code: 'not_found' };
  if (doc.author !== clerkUserId && !access?.canModerate) return { ok: false, code: 'forbidden' };
  await doc.deleteOne();
  return { ok: true };
}
