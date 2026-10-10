import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';
import { toSerializable } from './issue-service';
import { collectFieldErrors } from './validation-utils';

/**
 * Requirement service — CRUD for the requirements nested under an issue's
 * recommendations, plus evidence file attach/detach. Every mutation returns
 * the full serialized issue so clients can refresh their state in one call.
 */

const objectIdString = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid identifier.');

const addRequirementSchema = z.object({
  recommendationId: objectIdString,
  text: z.string().trim().min(1, 'Requirement text is required').max(4000, 'Requirement text must be 4000 characters or fewer'),
});

const updateRequirementSchema = z.object({
  recommendationId: objectIdString,
  text: z.string().trim().min(1, 'Requirement text is required').max(4000, 'Requirement text must be 4000 characters or fewer').optional(),
  status: z.enum(['open', 'closed']).optional(),
  linkIds: z.array(objectIdString).max(100, 'Too many links attached.').optional(),
});

const evidenceSchema = z.object({
  recommendationId: objectIdString,
  fileId: objectIdString,
  filename: z.string().trim().min(1, 'File name is required').max(255),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().min(0),
});

/**
 * Load an issue scoped to a project and resolve one of its recommendations.
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} recommendationId
 * @returns {Promise<{issue: object, recommendation: object}|null>}
 */
async function loadRecommendation(issueId, projectId, recommendationId) {
  if (
    !mongoose.isValidObjectId(issueId) ||
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(recommendationId)
  ) {
    return null;
  }

  await connectToDatabase();
  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    project: new mongoose.Types.ObjectId(projectId),
  }).populate('packages', 'packageId description');
  if (!issue) return null;

  const recommendation = issue.recommendations.id(recommendationId);
  if (!recommendation) return null;

  // Subdocuments created before these paths existed (or with unpersisted
  // empty defaults) hydrate without the arrays — normalize so callers can
  // push safely. The assignment marks the path modified so it persists.
  if (!recommendation.requirements) recommendation.requirements = [];

  return { issue, recommendation };
}

/**
 * Add a requirement under a recommendation.
 * @param {string} issueId
 * @param {string} projectId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string,string>} | null>}
 */
export async function addRequirement(issueId, projectId, payload) {
  const parsed = addRequirementSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: collectFieldErrors(parsed.error) };

  const found = await loadRecommendation(issueId, projectId, parsed.data.recommendationId);
  if (!found) return null;

  found.recommendation.requirements.push({ text: parsed.data.text });
  await found.issue.save();
  return { ok: true, issue: toSerializable(found.issue.toObject({ virtuals: false })) };
}

/**
 * Update a requirement's text, status and/or attached links.
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} requirementId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string,string>} | null>}
 */
export async function updateRequirement(issueId, projectId, requirementId, payload) {
  const parsed = updateRequirementSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: collectFieldErrors(parsed.error) };

  const { recommendationId, ...changes } = parsed.data;
  const found = await loadRecommendation(issueId, projectId, recommendationId);
  if (!found) return null;

  const requirement = found.recommendation.requirements.id(requirementId);
  if (!requirement) return null;

  if (changes.text !== undefined) requirement.text = changes.text;
  if (changes.status !== undefined) requirement.status = changes.status;
  if (changes.linkIds !== undefined) {
    requirement.linkIds = changes.linkIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  await found.issue.save();
  return { ok: true, issue: toSerializable(found.issue.toObject({ virtuals: false })) };
}

/**
 * Delete a requirement from its recommendation.
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} recommendationId
 * @param {string} requirementId
 * @returns {Promise<object|null>} the updated serialized issue, or null when not found
 */
export async function deleteRequirement(issueId, projectId, recommendationId, requirementId) {
  const found = await loadRecommendation(issueId, projectId, recommendationId);
  if (!found) return null;

  const requirement = found.recommendation.requirements.id(requirementId);
  if (!requirement) return null;

  requirement.deleteOne();
  await found.issue.save();
  return toSerializable(found.issue.toObject({ virtuals: false }));
}

/**
 * Attach an uploaded media file to a requirement as evidence.
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} requirementId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string,string>} | null>}
 */
export async function attachRequirementEvidence(issueId, projectId, requirementId, payload) {
  const parsed = evidenceSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: collectFieldErrors(parsed.error) };

  const { recommendationId, ...file } = parsed.data;
  const found = await loadRecommendation(issueId, projectId, recommendationId);
  if (!found) return null;

  const requirement = found.recommendation.requirements.id(requirementId);
  if (!requirement) return null;

  if (!requirement.evidence) requirement.evidence = [];
  requirement.evidence.push({
    fileId: new mongoose.Types.ObjectId(file.fileId),
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
  });
  await found.issue.save();
  return { ok: true, issue: toSerializable(found.issue.toObject({ virtuals: false })) };
}

/**
 * Detach an evidence file from a requirement.
 * @param {string} issueId
 * @param {string} projectId
 * @param {string} recommendationId
 * @param {string} requirementId
 * @param {string} fileId
 * @returns {Promise<object|null>} the updated serialized issue, or null when not found
 */
export async function detachRequirementEvidence(
  issueId,
  projectId,
  recommendationId,
  requirementId,
  fileId
) {
  const found = await loadRecommendation(issueId, projectId, recommendationId);
  if (!found) return null;

  const requirement = found.recommendation.requirements.id(requirementId);
  if (!requirement) return null;

  requirement.evidence = (requirement.evidence ?? []).filter(
    (e) => String(e.fileId) !== fileId
  );
  await found.issue.save();
  return toSerializable(found.issue.toObject({ virtuals: false }));
}
