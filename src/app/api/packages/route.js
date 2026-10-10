import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPackages, createPackage } from '@/lib/services/package-service';

/** GET /api/packages — list all packages. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json({ packages: await getPackages() });
  } catch (error) {
    console.error('[api/packages] failed to list packages:', error);
    return NextResponse.json({ error: 'Failed to load packages' }, { status: 500 });
  }
}

/** POST /api/packages — create a package from the project wizard. */
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
    const result = await createPackage(userId, payload);
    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ package: result.package }, { status: 201 });
  } catch (error) {
    console.error('[api/packages] failed to create package:', error);
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
