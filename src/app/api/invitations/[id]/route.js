import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { respondToInvitation } from '@/lib/services/membership-service';

/** PATCH /api/invitations/[id] — accept or decline a pending invitation. */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!['accept', 'decline'].includes(payload.action)) {
    return NextResponse.json({ error: 'Action must be "accept" or "decline".' }, { status: 400 });
  }

  try {
    const result = await respondToInvitation(userId, id, payload.action);
    if (!result.ok) {
      if (result.code === 'bad_request') {
        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/invitations] failed to respond to invitation:', error);
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
}
