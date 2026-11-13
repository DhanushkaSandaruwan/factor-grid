import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectAccess } from '@/lib/services/access-service';
import { deleteComment } from '@/lib/services/comment-service';

/** DELETE — the comment's author, or any editor or the owner, may remove it. */
export async function DELETE(_request, { params }) {
  const { userId } = await auth();
  const { id, issueId, commentId } = await params;
  const access = await getProjectAccess(userId, id);
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const result = await deleteComment(id, issueId, commentId, userId, { canModerate: access.canEdit });
  if (!result.ok) {
    const status = result.code === 'forbidden' ? 403 : 404;
    return NextResponse.json(
      { error: result.code === 'forbidden' ? 'You can only delete your own comments.' : 'Comment not found' },
      { status },
    );
  }
  return NextResponse.json({ ok: true });
}
