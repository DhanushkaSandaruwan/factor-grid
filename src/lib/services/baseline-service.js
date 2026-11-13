import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ProjectBaseline } from '@/models/project-baseline';
import { getIssuesByProject } from './issue-service';
import { getLinksByProject } from './link-service';
import { getUserProfile } from './user-profile-service';

/** Upper bound so a single baseline document stays well inside the database limit. */
export const MAX_BASELINE_ISSUES = 2000;

const summary = (b) => ({
  _id: String(b._id),
  label: b.label,
  createdByName: b.createdByName || 'Team member',
  issueCount: b.issueCount,
  createdAt: new Date(b.createdAt).toISOString(),
});

/**
 * Freeze the current registry of a project.
 * @param {{ _id: unknown, title: string, client: string, issueIdPrefix: string, hfAttributes: string[], riskAttributes: string[], actionAttributes: string[] }} project
 */
export async function createBaseline(project, actor, label) {
  const name = String(label ?? '').trim();
  if (name.length < 3 || name.length > 120) {
    return { ok: false, errors: { label: 'Give the baseline a name of 3 to 120 characters.' } };
  }
  await connectToDatabase();
  const projectId = String(project._id);
  const [issues, links] = await Promise.all([getIssuesByProject(projectId), getLinksByProject(projectId)]);
  if (issues.length > MAX_BASELINE_ISSUES) {
    return { ok: false, errors: { label: `A baseline can hold up to ${MAX_BASELINE_ISSUES} issues.` } };
  }

  let createdByName = 'Team member';
  try {
    const profile = await getUserProfile(actor);
    createdByName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || createdByName;
  } catch {
    // keep the neutral label
  }

  const data = {
    takenAt: new Date().toISOString(),
    project: {
      title: project.title,
      client: project.client,
      issueIdPrefix: project.issueIdPrefix,
      hfAttributes: project.hfAttributes ?? [],
      riskAttributes: project.riskAttributes ?? [],
      actionAttributes: project.actionAttributes ?? [],
    },
    issues,
    links,
  };
  const doc = await ProjectBaseline.create({
    project: projectId,
    label: name,
    createdBy: actor,
    createdByName,
    issueCount: issues.length,
    data: JSON.parse(JSON.stringify(data)),
  });
  return { ok: true, baseline: summary(doc.toObject()) };
}

/** Baselines of a project, newest first (metadata only). */
export async function listBaselines(projectId) {
  await connectToDatabase();
  const docs = await ProjectBaseline.find({ project: projectId }).sort({ createdAt: -1 }).lean();
  return docs.map(summary);
}

/** One baseline with its full content, or null. */
export async function getBaseline(projectId, baselineId) {
  if (!mongoose.isValidObjectId(baselineId)) return null;
  await connectToDatabase();
  const doc = await ProjectBaseline.findOne({ _id: baselineId, project: projectId }).lean();
  return doc ? { ...summary(doc), data: doc.data } : null;
}
