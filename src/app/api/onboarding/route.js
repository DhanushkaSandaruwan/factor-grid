import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { saveUserProfile } from '@/lib/services/user-profile-service';

/** POST /api/onboarding — save the signed-in user's onboarding profile. */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await saveUserProfile(userId, payload);
    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ profile: result.profile }, { status: 200 });
  } catch (error) {
    console.error('[api/onboarding] failed to save profile:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
