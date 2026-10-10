import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { getIssuesByProject, createIssue } from '@/lib/services/issue-service';

/**
 * GET /api/projects/[id]/issues
 * List all issues for the project (any authenticated member may view).
 *
 * POST /api/projects/[id]/issues
 * Create a new issue for the project (any authenticated member may create).
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const project = await getProjectById(userId, id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const issues = await getIssuesByProject(id);
  return NextResponse.json({ issues });
}

export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
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

  let result;
  try {
    result = await createIssue(userId, id, project.issueIdPrefix, body);
  } catch (err) {
    console.error('Failed to create issue:', err);
    return NextResponse.json({ error: 'Failed to create issue.' }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  return NextResponse.json({ issue: result.issue }, { status: 201 });
}
