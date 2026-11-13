import { recordAudit } from '@/lib/services/audit-service';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { denyUnlessAllowed } from '@/lib/api-guards';
import {
  addIssueRecommendation,
  updateIssueRecommendation,
  deleteIssueRecommendation,
} from '@/lib/services/issue-recommendation-service';

/**
 * Ensure the caller owns the project. Returns a 401/404 NextResponse or
 * null when access is granted.
 */
async function guard(userId, projectId, request) {
  return denyUnlessAllowed(request, userId, projectId);
}

/**
 * POST /api/projects/[id]/issues/[issueId]/recommendations
 * Body: { text } — appends a new recommendation to the issue.
 */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;

  const denied = await guard(userId, id, request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let result;
  try {
    result = await addIssueRecommendation(issueId, id, body.text);
  } catch (err) {
    console.error('Failed to add recommendation:', err);
    return NextResponse.json({ error: 'Failed to add recommendation.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  await recordAudit({
    projectId: id,
    issueId: issueId,
    actor: userId,
    action: 'recommendation.added',
    summary: 'Added a recommendation',
  });
  return NextResponse.json({ issue: result.issue }, { status: 201 });
}

/**
 * PATCH /api/projects/[id]/issues/[issueId]/recommendations
 * Body: { recommendationId, text } — updates one recommendation's text.
 */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;

  const denied = await guard(userId, id, request);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let result;
  try {
    result = await updateIssueRecommendation(issueId, id, body.recommendationId, body.text);
  } catch (err) {
    console.error('Failed to update recommendation:', err);
    return NextResponse.json({ error: 'Failed to update recommendation.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  await recordAudit({
    projectId: id,
    issueId: issueId,
    actor: userId,
    action: 'recommendation.updated',
    summary: 'Edited a recommendation',
  });
  return NextResponse.json({ issue: result.issue });
}

/**
 * DELETE /api/projects/[id]/issues/[issueId]/recommendations?recommendationId=…
 * Removes one recommendation from the issue.
 */
export async function DELETE(request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;

  const denied = await guard(userId, id, request);
  if (denied) return denied;

  const recommendationId = new URL(request.url).searchParams.get('recommendationId');
  if (!recommendationId) {
    return NextResponse.json({ error: 'recommendationId is required' }, { status: 400 });
  }

  let issue;
  try {
    issue = await deleteIssueRecommendation(issueId, id, recommendationId);
  } catch (err) {
    console.error('Failed to delete recommendation:', err);
    return NextResponse.json({ error: 'Failed to delete recommendation.' }, { status: 500 });
  }

  if (!issue) return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  await recordAudit({
    projectId: id,
    issueId: issueId,
    actor: userId,
    action: 'recommendation.deleted',
    summary: 'Deleted a recommendation',
  });
  return NextResponse.json({ issue });
}
