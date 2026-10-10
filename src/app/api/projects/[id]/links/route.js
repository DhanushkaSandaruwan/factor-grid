import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { getLinksByProject, createLink } from '@/lib/services/link-service';

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
 * GET /api/projects/[id]/links
 * Lists every HFDR / PSID link registered for the project.
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;

  const denied = await guard(userId, id);
  if (denied) return denied;

  try {
    const links = await getLinksByProject(id);
    return NextResponse.json({ links });
  } catch (error) {
    console.error('[api/links] failed to list links:', error);
    return NextResponse.json({ error: 'Failed to list links.' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/links
 * Body: { type, code, description, packages, issueIds, lead, doorsId }.
 */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;

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
    result = await createLink(id, userId, body);
  } catch (error) {
    console.error('[api/links] failed to create link:', error);
    return NextResponse.json({ error: 'Failed to create link.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ link: result.link }, { status: 201 });
}
