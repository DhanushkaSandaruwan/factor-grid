import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMyInvitations } from '@/lib/services/membership-service';

/** GET /api/invitations — the signed-in user's pending project invitations. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invitations = await getMyInvitations(userId);
    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error) {
    console.error('[api/invitations] failed to list invitations:', error);
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }
}
