import { recordAudit } from '@/lib/services/audit-service';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { updateIssueWorkflow } from '@/lib/services/issue-workflow-service';
import {
  updateIssue,
  updateIssueAttributeValues,
  updateIssueType,
  deleteIssue,
} from '@/lib/services/issue-service';
import { isDerivedHfAttribute } from '@/lib/attribute-rules';

/**
 * PATCH /api/projects/[id]/issues/[issueId]
 * Three update kinds, distinguished by body keys:
 * - Issue type (issueType): sets the human-factors category selector.
 * - Field update (title, source, description, consequences, packageIds):
 *   edits the issue via the same form used to create it.
 * - Attribute values (riskValues, actionValues): stepper-adjusted Risk
 *   Assessment / Action Attribute values. Only keys matching the project's
 *   selected attributes are stored — anything else is silently dropped.
 */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, issueId } = await params;
  const { project, response } = await guardProject(userId, id, { write: true });
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.issueType !== undefined) {
    let result;
    try {
      result = await updateIssueType(issueId, id, body);
    } catch (err) {
      console.error('Failed to update issue type:', err);
      return NextResponse.json({ error: 'Failed to update issue.' }, { status: 500 });
    }
    if (!result) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }
    await recordAudit({
      projectId: id,
      issueId: issueId,
      actor: userId,
      action: 'issue.type_changed',
      summary: `Set issue type to ${body.issueType}`,
    });
    return NextResponse.json({ issue: result.issue });
  }

  // Workflow: status (with close rule and sign-off), assignee and due date.
  if (body.status !== undefined || body.assigneeId !== undefined || body.dueDate !== undefined) {
    let result;
    try {
      result = await updateIssueWorkflow(issueId, id, userId, body);
    } catch (err) {
      console.error('Failed to update issue workflow:', err);
      return NextResponse.json({ error: 'Failed to update issue.' }, { status: 500 });
    }
    if (!result) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
    await recordAudit({
      projectId: id,
      issueId,
      actor: userId,
      action: 'issue.workflow',
      summary: result.summary,
    });
    return NextResponse.json({ issue: result.issue });
  }

  const isFieldUpdate = ['title', 'source', 'description', 'consequences', 'packageIds'].some(
    (key) => body[key] !== undefined,
  );

  if (isFieldUpdate) {
    let result;
    try {
      result = await updateIssue(issueId, id, body);
    } catch (err) {
      console.error('Failed to update issue:', err);
      return NextResponse.json({ error: 'Failed to update issue.' }, { status: 500 });
    }
    if (!result) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }
    await recordAudit({
      projectId: id,
      issueId: issueId,
      actor: userId,
      action: 'issue.updated',
      summary: `Updated ${Object.keys(body)
        .filter((k) => ['title', 'source', 'description', 'consequences', 'packageIds'].includes(k))
        .join(', ')}`,
    });
    return NextResponse.json({ issue: result.issue });
  }

  const pickAllowed = (values, allowed) =>
    Object.fromEntries(Object.entries(values ?? {}).filter(([name]) => allowed.includes(name)));

  const riskValues = pickAllowed(body.riskValues, project.riskAttributes);
  const actionValues = pickAllowed(body.actionValues, project.actionAttributes);
  // Only project-specific HF attributes are stored per issue; the built-in
  // ones are derived from the issue's content.
  const customHf = (project.hfAttributes ?? []).filter((name) => !isDerivedHfAttribute(name));
  const hfValues = pickAllowed(body.hfValues, customHf);

  let issue;
  try {
    issue = await updateIssueAttributeValues(issueId, id, { riskValues, actionValues, hfValues });
  } catch (err) {
    console.error('Failed to update issue attribute values:', err);
    return NextResponse.json({ error: 'Failed to update issue.' }, { status: 500 });
  }

  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  await recordAudit({
    projectId: id,
    issueId: issueId,
    actor: userId,
    action: 'issue.values_changed',
    summary: `Updated ${Object.keys({ ...body.riskValues, ...body.actionValues, ...body.hfValues }).join(', ') || 'attribute values'}`,
  });
  return NextResponse.json({ issue });
}

/** DELETE /api/projects/[id]/issues/[issueId] — permanently delete an issue. */
export async function DELETE(_request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, issueId } = await params;

  try {
    const result = await deleteIssue(userId, id, issueId);
    if (!result.ok) {
      if (result.code === 'not_found') {
        return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      }
      if (result.code === 'forbidden') {
        return NextResponse.json(
          { error: 'You do not have permission to delete this issue.' },
          { status: 403 },
        );
      }
    }
    await recordAudit({
      projectId: id,
      issueId: issueId,
      actor: userId,
      action: 'issue.deleted',
      summary: 'Deleted the issue',
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/issues] failed to delete issue:', error);
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 });
  }
}
