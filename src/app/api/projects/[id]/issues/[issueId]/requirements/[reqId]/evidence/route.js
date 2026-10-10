import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import {
  attachRequirementEvidence,
  detachRequirementEvidence,
} from '@/lib/services/requirement-service';
import { deleteFileForUser } from '@/lib/services/media-file-service';

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
 * POST /api/projects/[id]/issues/[issueId]/requirements/[reqId]/evidence
 * Body: { recommendationId, fileId, filename, contentType, size } — attaches
 * an already-uploaded media file to the requirement.
 */
export async function POST(request, { params }) {
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
    result = await attachRequirementEvidence(issueId, id, reqId, body);
  } catch (error) {
    console.error('[api/evidence] failed to attach evidence:', error);
    return NextResponse.json({ error: 'Failed to attach evidence.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ issue: result.issue }, { status: 201 });
}

/**
 * DELETE /api/projects/[id]/issues/[issueId]/requirements/[reqId]/evidence
 *   ?recommendationId=…&fileId=…
 * Detaches the file from the requirement and removes it from storage.
 */
export async function DELETE(request, { params }) {
  const { userId } = await auth();
  const { id, issueId, reqId } = await params;

  const denied = await guard(userId, id);
  if (denied) return denied;

  const searchParams = new URL(request.url).searchParams;
  const recommendationId = searchParams.get('recommendationId');
  const fileId = searchParams.get('fileId');
  if (!recommendationId || !fileId) {
    return NextResponse.json(
      { error: 'recommendationId and fileId are required' },
      { status: 400 }
    );
  }

  let issue;
  try {
    issue = await detachRequirementEvidence(issueId, id, recommendationId, reqId, fileId);
  } catch (error) {
    console.error('[api/evidence] failed to detach evidence:', error);
    return NextResponse.json({ error: 'Failed to detach evidence.' }, { status: 500 });
  }

  if (!issue) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

  // Evidence files belong to their requirement — remove the stored object too.
  try {
    await deleteFileForUser(userId, fileId);
  } catch (error) {
    console.error('[api/evidence] failed to delete stored file:', error);
  }

  return NextResponse.json({ issue });
}
