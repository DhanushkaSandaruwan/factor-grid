import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isDeploymentAdmin } from '@/lib/services/admin-service';
import { addPresetOptions } from '@/lib/services/attribute-admin-service';
import { ATTRIBUTE_PRESETS } from '@/lib/attribute-presets';

/** POST — add an industry preset's names to the attribute lists (administrators only). Body: { presetId }. */
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
  const preset = ATTRIBUTE_PRESETS.find((p) => p.id === body.presetId);
  if (!preset) return NextResponse.json({ error: 'Unknown preset.' }, { status: 400 });
  return NextResponse.json(await addPresetOptions(preset));
}
