import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth, clerkClient } from '@clerk/nextjs/server';

const lookupSchema = z.string().trim().toLowerCase().email();

/**
 * GET /api/users/lookup?email=… — check whether an email belongs to a
 * registered platform user and return their profile basics so the invite
 * form can populate them automatically.
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = lookupSchema.safeParse(request.nextUrl.searchParams.get('email') ?? '');
  if (!email.success) {
    return NextResponse.json({ found: false });
  }

  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({ emailAddress: [email.data] });
    const users = response.data ?? response;
    const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
    if (!user) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({
      found: true,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      contactNumber: user.phoneNumbers?.[0]?.phoneNumber ?? '',
    });
  } catch (error) {
    console.error('[api/users/lookup] failed to look up user:', error);
    return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 });
  }
}
