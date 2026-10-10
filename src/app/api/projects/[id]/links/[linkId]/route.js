import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { updateLink, deleteLink } from '@/lib/services/link-service';

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
 * PATCH /api/projects/[id]/links/[linkId]
 * Body: { type, code, description, packages, issueIds, lead, doorsId }.
 */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  const { id, linkId } = await params;

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
    result = await updateLink(linkId, id, body);
  } catch (error) {
    console.error('[api/links] failed to update link:', error);
    return NextResponse.json({ error: 'Failed to update link.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ link: result.link });
}

/**
 * DELETE /api/projects/[id]/links/[linkId]
 * Removes the link and pulls it from every requirement that references it.
 */
export async function DELETE(request, { params }) {
  const { userId } = await auth();
  const { id, linkId } = await params;

  const denied = await guard(userId, id);
  if (denied) return denied;

  let deleted;
  try {
    deleted = await deleteLink(linkId, id);
  } catch (error) {
    console.error('[api/links] failed to delete link:', error);
    return NextResponse.json({ error: 'Failed to delete link.' }, { status: 500 });
  }

  if (!deleted) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
