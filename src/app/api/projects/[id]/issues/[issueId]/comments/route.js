import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { addComment, listComments } from '@/lib/services/comment-service';

/** GET — discussion on an issue (any member). */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;
  const { response } = await guardProject(userId, id);
  if (response) return response;
  return NextResponse.json({ comments: await listComments(id, issueId) });
}

/** POST — add a comment. Viewers may comment: discussion does not change the registry. */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;
  const { response } = await guardProject(userId, id);
  if (response) return response;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const result = await addComment(id, issueId, userId, body.body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ comment: result.comment }, { status: 201 });
}
