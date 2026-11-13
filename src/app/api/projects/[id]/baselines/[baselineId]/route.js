import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { getBaseline } from '@/lib/services/baseline-service';

/** GET — download one baseline as JSON (any member). */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  const { id, baselineId } = await params;
  const { response } = await guardProject(userId, id);
  if (response) return response;
  const baseline = await getBaseline(id, baselineId);
  if (!baseline) return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
  const safe =
    baseline.label
      .replace(/[^A-Za-z0-9 _-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'baseline';
  return new NextResponse(JSON.stringify(baseline, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safe}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
