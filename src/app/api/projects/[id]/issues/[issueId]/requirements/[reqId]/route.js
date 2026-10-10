import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { updateRequirement, deleteRequirement } from '@/lib/services/requirement-service';

/**
 * Ensure the caller owns the project. Returns a 401/404 NextResponse or
 * null when access is granted.
 */
async function guard(userId, projectId) {
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = await getProjectById(userId, projectId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return null;
}

/**
 * PATCH /api/projects/[id]/issues/[issueId]/requirements/[reqId]
 * Body: { recommendationId, text?, status?, linkIds? }.
 */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  const { id, issueId, reqId } = await params;

  const denied = await guard(userId, id);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let result;
  try {
    result = await updateRequirement(issueId, id, reqId, body);
  } catch (error) {
    console.error('[api/requirements] failed to update requirement:', error);
    return NextResponse.json({ error: 'Failed to update requirement.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ issue: result.issue });
}

/**
 * DELETE /api/projects/[id]/issues/[issueId]/requirements/[reqId]?recommendationId=…
 */
export async function DELETE(request, { params }) {
  const { userId } = await auth();
  const { id, issueId, reqId } = await params;

  const denied = await guard(userId, id);
  if (denied) return denied;

  const recommendationId = new URL(request.url).searchParams.get('recommendationId');
  if (!recommendationId) {
    return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 });
  }

  let issue;
  try {
    issue = await deleteRequirement(issueId, id, recommendationId, reqId);
  } catch (error) {
    console.error('[api/requirements] failed to delete requirement:', error);
    return NextResponse.json({ error: 'Failed to delete requirement.' }, { status: 500 });
  }

  if (!issue) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
  return NextResponse.json({ issue });
}
