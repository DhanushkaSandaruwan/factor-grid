import { recordAudit } from '@/lib/services/audit-service';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { denyUnlessAllowed } from '@/lib/api-guards';
import { updateLink, deleteLink } from '@/lib/services/link-service';

/**
 * Ensure the caller owns the project. Returns a 401/404 NextResponse or
 * null when access is granted.
 */
async function guard(userId, projectId, request) {
  return denyUnlessAllowed(request, userId, projectId);
}

/**
 * PATCH /api/projects/[id]/links/[linkId]
 * Body: { type, code, description, packages, issueIds, lead, doorsId }.
 */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  const { id, linkId } = await params;

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
    result = await updateLink(linkId, id, body);
  } catch (error) {
    console.error('[api/links] failed to update link:', error);
    return NextResponse.json({ error: 'Failed to update link.' }, { status: 500 });
  }

  if (!result) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  await recordAudit({
    projectId: id,
    actor: userId,
    action: 'link.updated',
    summary: `Updated link ${result.link.code}`,
  });
  return NextResponse.json({ link: result.link });
}

/**
 * DELETE /api/projects/[id]/links/[linkId]
 * Removes the link and pulls it from every requirement that references it.
 */
export async function DELETE(request, { params }) {
  const { userId } = await auth();
  const { id, linkId } = await params;

  const denied = await guard(userId, id, request);
  if (denied) return denied;

  let deleted;
  try {
    deleted = await deleteLink(linkId, id);
  } catch (error) {
    console.error('[api/links] failed to delete link:', error);
    return NextResponse.json({ error: 'Failed to delete link.' }, { status: 500 });
  }

  if (!deleted) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  await recordAudit({ projectId: id, actor: userId, action: 'link.deleted', summary: 'Deleted a link' });
  return NextResponse.json({ deleted: true });
}
