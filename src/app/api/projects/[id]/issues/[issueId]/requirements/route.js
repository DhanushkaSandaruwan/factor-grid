import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { addRequirement } from '@/lib/services/requirement-service';

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
 * POST /api/projects/[id]/issues/[issueId]/requirements
 * Body: { recommendationId, text } — adds a requirement under a recommendation.
 */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;

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
    result = await addRequirement(issueId, id, body);
  } catch (error) {
    console.error('[api/requirements] failed to add requirement:', error);
    return NextResponse.json({ error: 'Failed to add requirement.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ issue: result.issue }, { status: 201 });
}
