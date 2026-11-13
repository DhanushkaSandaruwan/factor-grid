import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { markRead } from '@/lib/services/notification-service';

/** POST — mark notifications read. Body: { ids: string[] } or { all: true }. */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const updated = await markRead(userId, {
    ids: Array.isArray(body.ids) ? body.ids : [],
    all: body.all === true,
  });
  return NextResponse.json({ updated });
}
