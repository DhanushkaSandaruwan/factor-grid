import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { createBaseline, listBaselines } from '@/lib/services/baseline-service';
import { recordAudit } from '@/lib/services/audit-service';

/** GET — baselines of the project (any member). */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  const { id } = await params;
  const { response } = await guardProject(userId, id);
  if (response) return response;
  return NextResponse.json({ baselines: await listBaselines(id) });
}

/** POST — freeze the current registry as a named baseline (editors and owner). */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;
  const { project, response } = await guardProject(userId, id, { write: true });
  if (response) return response;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const result = await createBaseline(project, userId, body.label);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  await recordAudit({
    projectId: id,
    actor: userId,
    action: 'baseline.created',
    summary: `Created baseline “${result.baseline.label}” (${result.baseline.issueCount} issues)`,
  });
  return NextResponse.json({ baseline: result.baseline }, { status: 201 });
}
