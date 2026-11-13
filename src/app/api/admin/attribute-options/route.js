import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isDeploymentAdmin } from '@/lib/services/admin-service';
import { createOption, listAllOptions } from '@/lib/services/attribute-admin-service';

/** GET /api/admin/attribute-options — every attribute option (administrators only). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isDeploymentAdmin(userId))) {
    return NextResponse.json({ error: 'Administrators only.' }, { status: 403 });
  }
  return NextResponse.json({ options: await listAllOptions() });
}

/** POST /api/admin/attribute-options — add an option to a list (administrators only). */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isDeploymentAdmin(userId))) {
    return NextResponse.json({ error: 'Administrators only.' }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const result = await createOption(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ option: result.option }, { status: 201 });
}
