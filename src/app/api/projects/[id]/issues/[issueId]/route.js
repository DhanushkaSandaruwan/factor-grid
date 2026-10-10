import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { updateIssue, updateIssueAttributeValues, updateIssueType } from '@/lib/services/issue-service';

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
  const project = await getProjectById(userId, id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

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
    return NextResponse.json({ issue: result.issue });
  }

  const isFieldUpdate = [
    'title',
    'source',
    'description',
    'consequences',
    'packageIds',
  ].some((key) => body[key] !== undefined);

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
    return NextResponse.json({ issue: result.issue });
  }

  const pickAllowed = (values, allowed) =>
    Object.fromEntries(
      Object.entries(values ?? {}).filter(([name]) => allowed.includes(name))
    );

  const riskValues = pickAllowed(body.riskValues, project.riskAttributes);
  const actionValues = pickAllowed(body.actionValues, project.actionAttributes);

  let issue;
  try {
    issue = await updateIssueAttributeValues(issueId, id, { riskValues, actionValues });
  } catch (err) {
    console.error('Failed to update issue attribute values:', err);
    return NextResponse.json({ error: 'Failed to update issue.' }, { status: 500 });
  }

  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  return NextResponse.json({ issue });
}
