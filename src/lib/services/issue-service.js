import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';
import { collectFieldErrors } from './validation-utils';

/* -----------------------------------------------------------------------
   Zod schemas
   ----------------------------------------------------------------------- */

const createIssueSchema = z.object({
  source: z
    .string()
    .trim()
    .max(200, 'Source must be 200 characters or fewer')
    .optional()
    .default(''),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  packageIds: z.array(z.string()).optional().default([]),
  description: z
    .string()
    .trim()
    .max(4000, 'Description must be 4000 characters or fewer')
    .optional()
    .default(''),
  consequences: z
    .string()
    .trim()
    .max(2000, 'Consequences must be 2000 characters or fewer')
    .optional()
    .default(''),
});

/**
 * @typedef {z.infer<typeof createIssueSchema>} CreateIssueInput
 */

/* -----------------------------------------------------------------------
   Helpers
   ----------------------------------------------------------------------- */

/** Convert a mongoose Map (or plain object from a lean doc) to a plain object. */
function toPlainObject(map) {
  if (map instanceof Map) return Object.fromEntries(map);
  if (map && typeof map === 'object') return map;
  return {};
}

/** Map a requirement subdoc to a client-safe object. */
function serializeRequirement(requirement) {
  return {
    ...requirement,
    _id: String(requirement._id),
    linkIds: (requirement.linkIds ?? []).map(String),
    evidence: (requirement.evidence ?? []).map((e) => ({ ...e, fileId: String(e.fileId) })),
  };
}

/** Map a lean issue doc (possibly with populated packages) to a client-safe object. */
export function toSerializable(issue) {
  return {
    ...issue,
    _id: String(issue._id),
    project: String(issue.project),
    packages: (issue.packages ?? []).map((p) =>
      typeof p === 'object' ? { ...p, _id: String(p._id) } : String(p)
    ),
    riskAttributeValues: toPlainObject(issue.riskAttributeValues),
    actionAttributeValues: toPlainObject(issue.actionAttributeValues),
    recommendations: (issue.recommendations ?? []).map((r) => ({
      ...r,
      _id: String(r._id),
      requirements: (r.requirements ?? []).map(serializeRequirement),
    })),
  };
}

/* -----------------------------------------------------------------------
   Public API
   ----------------------------------------------------------------------- */

/**
 * Resolve the next auto-increment issue number for a project, then return
 * the full suggested display ID ("{prefix}-{number}").
 *
 * Runs inside the same transaction as issue creation so there is no race
 * condition on the counter.
 *
 * @param {string} projectId  - MongoDB ObjectId as string
 * @param {string} issueIdPrefix - e.g. "HF"
 * @returns {Promise<{number: number, displayId: string}>}
 */
export async function getNextIssueNumber(projectId, issueIdPrefix) {
  await connectToDatabase();

  const last = await Issue.findOne({ project: new mongoose.Types.ObjectId(projectId) })
    .sort({ issueNumber: -1 })
    .select('issueNumber')
    .lean();

  const nextNumber = last ? last.issueNumber + 1 : 1;
  return { number: nextNumber, displayId: `${issueIdPrefix}-${String(nextNumber).padStart(3, '0')}` };
}

/**
 * Create a new issue. Validates the payload, increments the counter, and
 * saves the document.
 *
 * @param {string} clerkUserId
 * @param {string} projectId  - MongoDB ObjectId as string
 * @param {string} issueIdPrefix - e.g. "HF"
 * @param {unknown} payload
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string, string>}>}
 */
export async function createIssue(clerkUserId, projectId, issueIdPrefix, payload) {
  const parsed = createIssueSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  const { number, displayId } = await getNextIssueNumber(projectId, issueIdPrefix);

  await connectToDatabase();

  const validPackageIds = (parsed.data.packageIds ?? [])
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const issue = await Issue.create({
    issueId: displayId,
    project: new mongoose.Types.ObjectId(projectId),
    issueNumber: number,
    source: parsed.data.source,
    title: parsed.data.title,
    packages: validPackageIds,
    description: parsed.data.description,
    consequences: parsed.data.consequences,
    status: 'open',
    createdBy: clerkUserId,
  });

  return { ok: true, issue: toSerializable(issue.toObject()) };
}

const updateIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be 200 characters or fewer'),
  source: z
    .string()
    .trim()
    .max(200, 'Source must be 200 characters or fewer')
    .optional()
    .default(''),
  packageIds: z.array(z.string()).optional().default([]),
  description: z
    .string()
    .trim()
    .max(4000, 'Description must be 4000 characters or fewer')
    .optional()
    .default(''),
  consequences: z
    .string()
    .trim()
    .max(2000, 'Consequences must be 2000 characters or fewer')
    .optional()
    .default(''),
});

/**
 * Update the editable fields of an existing issue (title, source, packages,
 * description, consequences). Returns the refreshed issue with packages
 * populated.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string, string>} | null>}
 */
export async function updateIssue(issueId, projectId, payload) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    project: new mongoose.Types.ObjectId(projectId),
  });
  if (!issue) return null;

  const parsed = updateIssueSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  issue.title = parsed.data.title;
  issue.source = parsed.data.source;
  issue.description = parsed.data.description;
  issue.consequences = parsed.data.consequences;
  issue.packages = parsed.data.packageIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  await issue.save();

  const fresh = await Issue.findOne({ _id: issue._id })
    .populate('packages', 'packageId description')
    .lean();
  return { ok: true, issue: toSerializable(fresh) };
}

const issueTypeSchema = z.object({
  issueType: z.enum(['usability', 'safety', 'both'], {
    error: () => ({ message: 'Issue type must be usability, safety or both.' }),
  }),
});

/**
 * Update only the issue's human-factors type (usability / safety / both).
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {unknown} payload - { issueType }
 * @returns {Promise<{ok: true, issue: object} | {ok: false, errors: Record<string, string>} | null>}
 */
export async function updateIssueType(issueId, projectId, payload) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();

  const parsed = issueTypeSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  const issue = await Issue.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(issueId), project: new mongoose.Types.ObjectId(projectId) },
    { issueType: parsed.data.issueType },
    { new: true }
  )
    .populate('packages', 'packageId description')
    .lean();
  if (!issue) return null;
  return { ok: true, issue: toSerializable(issue) };
}

/**
 * Persist stepper-adjusted attribute values for a single issue. Only keys
 * belonging to the project's selected attributes are stored.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @param {{ riskValues?: Record<string, number>, actionValues?: Record<string, number> }} values
 * @returns {Promise<object|null>} the updated issue, or null if not found
 */
export async function updateIssueAttributeValues(issueId, projectId, values = {}) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    project: new mongoose.Types.ObjectId(projectId),
  });
  if (!issue) return null;

  for (const [name, value] of Object.entries(values.riskValues ?? {})) {
    issue.riskAttributeValues.set(name, Number(value) || 0);
  }
  for (const [name, value] of Object.entries(values.actionValues ?? {})) {
    issue.actionAttributeValues.set(name, value == null ? '' : String(value));
  }

  await issue.save();
  return toSerializable(issue.toObject());
}

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

/**
 * List all issues for a project, newest first, with packages populated.
 *
 * @param {string} projectId
 * @returns {Promise<object[]>}
 */
export async function getIssuesByProject(projectId) {
  if (!mongoose.isValidObjectId(projectId)) return [];
  await connectToDatabase();

  const issues = await Issue.find({ project: new mongoose.Types.ObjectId(projectId) })
    .sort({ createdAt: -1 })
    .populate('packages', 'packageId description')
    .lean();

  return issues.map(toSerializable);
}

/**
 * Get a single issue by id (string ObjectId) for a given project.
 * Returns null if not found or mismatched project.
 *
 * @param {string} issueId
 * @param {string} projectId
 * @returns {Promise<object|null>}
 */
export async function getIssueById(issueId, projectId) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();

  const issue = await Issue.findOne({
    _id: new mongoose.Types.ObjectId(issueId),
    project: new mongoose.Types.ObjectId(projectId),
  })
    .populate('packages', 'packageId description')
    .lean();

  return issue ? toSerializable(issue) : null;
}

/**
 * Aggregate issue statistics per project for a set of project ids — used by
 * the dashboard cards. Returns a map of project id (string) to
 * { total, open, closed, transferred, recommendations, requirements }.
 * Projects without issues are absent from the map.
 * @param {string[]} projectIds
 * @returns {Promise<Record<string, object>>}
 */
export async function getIssueStatsByProject(projectIds) {
  const validIds = projectIds.filter((id) => mongoose.isValidObjectId(id));
  if (validIds.length === 0) return {};
  await connectToDatabase();

  const rows = await Issue.aggregate([
    { $match: { project: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
        recommendations: { $sum: { $size: { $ifNull: ['$recommendations', []] } } },
        requirements: {
          $sum: {
            $reduce: {
              input: { $ifNull: ['$recommendations', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $size: { $ifNull: ['$$this.requirements', []] } }] },
            },
          },
        },
      },
    },
  ]);

  return Object.fromEntries(
    rows.map((row) => [
      String(row._id),
      {
        total: row.total,
        open: row.open,
        closed: row.closed,
        transferred: row.transferred,
        recommendations: row.recommendations,
        requirements: row.requirements,
      },
    ])
  );
}
