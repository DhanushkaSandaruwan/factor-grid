import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isDeploymentAdmin } from '@/lib/services/admin-service';
import { updateOption } from '@/lib/services/attribute-admin-service';

/** PATCH /api/admin/attribute-options/[id] — rename, reorder or (de)activate (administrators only). */
export async function PATCH(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isDeploymentAdmin(userId))) {
    return NextResponse.json({ error: 'Administrators only.' }, { status: 403 });
  }
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const result = await updateOption(id, body);
  if (!result) return NextResponse.json({ error: 'Option not found' }, { status: 404 });
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json({ option: result.option });
}
