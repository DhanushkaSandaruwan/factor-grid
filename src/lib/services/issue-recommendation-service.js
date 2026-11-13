import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';
import { collectFieldErrors } from './validation-utils';
import { toSerializable } from './issue-service';

/* -----------------------------------------------------------------------
   Recommendations
   ----------------------------------------------------------------------- */

const recommendationTextSchema = z
  .string()
  .trim()
  .min(1, 'Recommendation text is required')
  .max(4000, 'Recommendation must be 4000 characters or fewer');

/** Find an issue scoped to a project, or null. */
async function findIssue(issueId, projectId) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();
  return Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    project: new mongoose.Types.ObjectId(projectId),
  });
}

/**
 * Append a new free-text recommendation to an issue.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {unknown} text
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string, string>} | null>}
 */
export async function addIssueRecommendation(issueId, projectId, text) {
  const issue = await findIssue(issueId, projectId);
  if (!issue) return null;

  const parsed = recommendationTextSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  issue.recommendations.push({ text: parsed.data });
  await issue.save();
  return { ok: true, issue: toSerializable(issue.toObject()) };
}

/**
 * Update the text of a single recommendation on an issue.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} recommendationId - subdocument id
 * @param {unknown} text
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string, string>} | null>}
 */
export async function updateIssueRecommendation(issueId, projectId, recommendationId, text) {
  const issue = await findIssue(issueId, projectId);
  if (!issue) return null;

  const sub = issue.recommendations.id(recommendationId);
  if (!sub) return null;

  const parsed = recommendationTextSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  sub.text = parsed.data;
  await issue.save();
  return { ok: true, issue: toSerializable(issue.toObject()) };
}

/**
 * Remove a single recommendation from an issue.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} recommendationId - subdocument id
 * @returns {Promise<object|null>} the updated issue, or null if not found
 */
export async function deleteIssueRecommendation(issueId, projectId, recommendationId) {
  const issue = await findIssue(issueId, projectId);
  if (!issue) return null;

  const sub = issue.recommendations.id(recommendationId);
  if (!sub) return null;

  sub.deleteOne();
  await issue.save();
  return toSerializable(issue.toObject());
}
