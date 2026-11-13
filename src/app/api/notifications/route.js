import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listNotifications } from '@/lib/services/notification-service';

/** GET — the signed-in user's notifications, newest first, with the unread count. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await listNotifications(userId));
}
