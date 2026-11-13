import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { isR2Configured } from '@/lib/r2';
import { Project } from '@/models/project';
import { Package } from '@/models/package';
import { Issue } from '@/models/issue';
import { ImportBatch } from '@/models/import-batch';
import { readTable, MAX_IMPORT_BYTES } from '@/lib/import/read-table';
import { validateRegistryRows } from '@/lib/import/registry-validate';
import { formatColumns } from '@/lib/import/registry-format';
import { putObject, getObjectBuffer } from './storage-service';
import { projectPeople } from './notification-service';
import { createPackage } from './package-service';
import { createIssue, updateIssueType, updateIssueAttributeValues } from './issue-service';
import { addIssueRecommendation } from './issue-recommendation-service';
import { addRequirement, updateRequirement } from './requirement-service';
import { updateIssueWorkflow } from './issue-workflow-service';
import { recordAudit } from './audit-service';
import { getUserProfile } from './user-profile-service';

async function displayName(clerkUserId) {
  try {
    const profile = await getUserProfile(clerkUserId);
    return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || 'Team member';
  } catch {
    return 'Team member';
  }
}

const safeName = (name) =>
  String(name)
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 120) || 'upload';

/** Everything the checker needs to know about the project, read once. */
async function buildContext(project) {
  await connectToDatabase();
  const [people, populated, catalogDocs, issueIds] = await Promise.all([
    projectPeople(project),
    Project.findById(project._id).populate('packages', 'packageId').lean(),
    Package.find({}).select('packageId').lean(),
    Issue.distinct('issueId', { project: project._id }),
  ]);
  return {
    people,
    projectPackages: (populated?.packages ?? []).map((p) => ({ _id: String(p._id), packageId: p.packageId })),
    catalog: new Map(
      catalogDocs.map((d) => [d.packageId.toLowerCase(), { _id: String(d._id), packageId: d.packageId }]),
    ),
    existingIssueIds: new Set(issueIds),
  };
}

function serializeBatch(b) {
  return {
    _id: String(b._id),
    fileName: b.fileName,
    size: b.size,
    status: b.status,
    issueCount: b.issueCount ?? 0,
    uploadedByName: b.uploadedByName || 'Team member',
    createdAt: new Date(b.createdAt).toISOString(),
    errors: b.problems ?? [],
    warnings: b.warnings ?? [],
    summary: b.summary ?? {},
    message: b.message ?? '',
  };
}

/**
 * Store an uploaded file and check it against the project. The file is kept
 * whether or not it passes, so every upload can be found again for an audit.
 * Nothing is created in the registry at this step.
 */
export async function checkUpload({ project, actor, buffer, fileName, contentType }) {
  if (!isR2Configured()) {
    return {
      ok: false,
      status: 503,
      error:
        'File storage is not configured, so uploads cannot be kept for audit. Ask your administrator to set it up.',
    };
  }
  if (buffer.length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `The file is larger than ${MAX_IMPORT_BYTES / (1024 * 1024)} MB.`,
    };
  }
  await connectToDatabase();
  const projectId = String(project._id);
  const batchId = new mongoose.Types.ObjectId();
  const key = `imports/${projectId}/${batchId}/${safeName(fileName)}`;
  await putObject({ key, body: buffer, contentType: contentType || 'application/octet-stream' });

  const table = await readTable(buffer, fileName);
  let result;
  if (table.error) {
    result = {
      ok: false,
      errors: [{ line: 1, column: '', message: table.error }],
      warnings: [],
      issues: [],
      packagesToCreate: [],
      packagesToAdd: [],
      counts: {},
    };
  } else {
    result = validateRegistryRows(table.rows, project, await buildContext(project));
  }

  const batch = await ImportBatch.create({
    _id: batchId,
    project: projectId,
    fileName,
    contentType,
    size: buffer.length,
    key,
    uploadedBy: actor,
    uploadedByName: await displayName(actor),
    status: result.ok ? 'checked' : 'rejected',
    issueCount: result.issues.length,
    problems: result.errors.slice(0, 300),
    warnings: result.warnings,
    summary: {
      packagesToCreate: result.packagesToCreate,
      packagesToAdd: result.packagesToAdd,
      counts: result.counts ?? {},
    },
    message: result.ok
      ? `${result.issues.length} issues ready to import`
      : `${result.errors.length} problem(s) to fix`,
  });

  await recordAudit({
    projectId,
    actor,
    action: 'import.checked',
    summary: result.ok
      ? `Checked “${fileName}”: ${result.issues.length} issues ready`
      : `Checked “${fileName}”: ${result.errors.length} problem(s), not imported`,
  });
  return { ok: true, batch: serializeBatch(batch.toObject()) };
}

/**
 * Import a file that passed its check. The stored original is read again, so
 * what is imported is exactly what was checked. If anything fails part-way,
 * the issues created by this import are removed again.
 */
export async function commitUpload({ project, actor, batchId }) {
  await connectToDatabase();
  const projectId = String(project._id);
  if (!mongoose.isValidObjectId(batchId)) return { ok: false, status: 404, error: 'Upload not found.' };
  const batch = await ImportBatch.findOne({ _id: batchId, project: projectId });
  if (!batch) return { ok: false, status: 404, error: 'Upload not found.' };
  if (batch.status !== 'checked') {
    return {
      ok: false,
      status: 409,
      error:
        batch.status === 'imported'
          ? 'This file has already been imported.'
          : 'Only a file that passed the check can be imported. Upload a corrected file.',
    };
  }

  const buffer = await getObjectBuffer(batch.key);
  const table = await readTable(buffer, batch.fileName);
  const result = table.error
    ? { ok: false }
    : validateRegistryRows(table.rows, project, await buildContext(project));
  if (!result.ok) {
    return {
      ok: false,
      status: 409,
      error: 'The project changed since this file was checked. Upload the file again.',
    };
  }

  // Packages: attach the ones that exist, create the rest, and attach them too.
  const packageIdByName = new Map();
  const populated = await Project.findById(projectId).populate('packages', 'packageId').lean();
  for (const p of populated?.packages ?? [])
    packageIdByName.set(String(p.packageId).toLowerCase(), String(p._id));
  const catalog = await Package.find({}).select('packageId').lean();
  for (const doc of catalog) {
    const key = String(doc.packageId).toLowerCase();
    if (!packageIdByName.has(key) && result.packagesToAdd.some((n) => n.toLowerCase() === key)) {
      packageIdByName.set(key, String(doc._id));
    }
  }
  const attached = [];
  const created = [];
  for (const name of result.packagesToCreate) {
    const made = await createPackage(actor, { packageId: name, description: '' });
    if (made.ok) {
      packageIdByName.set(name.toLowerCase(), String(made.package._id));
      created.push(name);
    }
  }
  for (const name of result.packagesToAdd) attached.push(name);
  const packageIds = [...new Set(packageIdByName.values())];
  if (packageIds.length > 0) {
    await Project.updateOne(
      { _id: projectId },
      { $addToSet: { packages: { $each: packageIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    );
  }

  const createdIssueIds = [];
  try {
    for (const issue of result.issues) {
      const made = await createIssue(actor, projectId, project.issueIdPrefix, {
        title: issue.title,
        source: issue.source,
        description: issue.description,
        consequences: issue.consequences,
        packageIds: issue.packageNames.map((n) => packageIdByName.get(n.toLowerCase())).filter(Boolean),
      });
      if (!made.ok) throw new Error(`“${issue.title}” could not be saved.`);
      const issueId = String(made.issue._id);
      createdIssueIds.push(issueId);

      if (issue.issueType) await updateIssueType(issueId, projectId, { issueType: issue.issueType });
      const workflow = {};
      if (issue.assigneeId) workflow.assigneeId = issue.assigneeId;
      if (issue.dueDate) workflow.dueDate = issue.dueDate;
      if (issue.status === 'transferred') workflow.status = 'transferred';
      if (Object.keys(workflow).length > 0) {
        const set = await updateIssueWorkflow(issueId, projectId, actor, workflow);
        if (!set?.ok) throw new Error(`Workflow for “${issue.title}” could not be saved.`);
      }
      const hasValues = [issue.attributes.hf, issue.attributes.risk, issue.attributes.action].some(
        (v) => Object.keys(v).length > 0,
      );
      if (hasValues) {
        await updateIssueAttributeValues(issueId, projectId, {
          hfValues: issue.attributes.hf,
          riskValues: issue.attributes.risk,
          actionValues: issue.attributes.action,
        });
      }

      for (const rec of issue.recommendations) {
        const withRec = await addIssueRecommendation(issueId, projectId, rec.text);
        if (!withRec?.ok) throw new Error(`A recommendation for “${issue.title}” could not be saved.`);
        const recommendationId = String(withRec.issue.recommendations.at(-1)._id);
        for (const req of rec.requirements) {
          const withReq = await addRequirement(issueId, projectId, { recommendationId, text: req.text });
          if (!withReq?.ok) throw new Error(`A requirement for “${issue.title}” could not be saved.`);
          if (req.status === 'closed') {
            const target = withReq.issue.recommendations.find((r) => String(r._id) === recommendationId);
            const requirementId = String(target.requirements.at(-1)._id);
            await updateRequirement(issueId, projectId, requirementId, {
              recommendationId,
              status: 'closed',
            });
          }
        }
      }
    }
  } catch (error) {
    await Issue.deleteMany({ _id: { $in: createdIssueIds } });
    batch.status = 'failed';
    batch.message = `Import stopped and was undone: ${error.message}`;
    await batch.save();
    await recordAudit({
      projectId,
      actor,
      action: 'import.failed',
      summary: `Import of “${batch.fileName}” was undone: ${error.message}`,
    });
    return { ok: false, status: 500, error: batch.message };
  }

  batch.status = 'imported';
  batch.issueCount = createdIssueIds.length;
  batch.summary = { ...batch.summary, createdIssueIds, packagesCreated: created, packagesAttached: attached };
  batch.message = `${createdIssueIds.length} issues imported`;
  await batch.save();
  await recordAudit({
    projectId,
    actor,
    action: 'registry.imported',
    summary: `Imported ${createdIssueIds.length} issues from “${batch.fileName}”`,
  });
  return { ok: true, created: createdIssueIds.length, batch: serializeBatch(batch.toObject()) };
}

/** Uploads for a project, newest first. */
export async function listUploads(projectId) {
  await connectToDatabase();
  const docs = await ImportBatch.find({ project: projectId }).sort({ createdAt: -1 }).limit(100).lean();
  return docs.map(serializeBatch);
}

/** One stored upload: its metadata and the original bytes. */
export async function getUploadFile(projectId, batchId) {
  if (!mongoose.isValidObjectId(batchId)) return null;
  await connectToDatabase();
  const batch = await ImportBatch.findOne({ _id: batchId, project: projectId }).lean();
  if (!batch) return null;
  const buffer = await getObjectBuffer(batch.key);
  return { buffer, fileName: batch.fileName, contentType: batch.contentType || 'application/octet-stream' };
}

/** The import template for this project: the header plus one example row. */
export function templateRows(project) {
  const columns = formatColumns(project);
  const example = {
    project: project.title,
    title: 'Mode confusion on approach',
    status: 'open',
    issueType: 'safety',
    source: 'Flight test 3',
    description: 'Crew misread the autopilot mode during descent.',
    consequences: 'Missed altitude constraint.',
    recommendation: 'Add a persistent mode indicator',
    requirement: 'Indicator visible from both crew seats',
    requirementStatus: 'open',
  };
  const header = columns.map((c) => c.header);
  const row = columns.map((c) => example[c.key] ?? '');
  return [header, row];
}
