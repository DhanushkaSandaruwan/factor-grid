import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { listAuditEvents } from '@/lib/services/audit-service';

/**
 * GET /api/projects/[id]/audit?issueId=…
 * Activity log for a project (any member can read it), newest first.
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;

  const { response } = await guardProject(userId, id);
  if (response) return response;

  const issueId = new URL(request.url).searchParams.get('issueId') ?? undefined;
  const events = await listAuditEvents(id, { issueId });
  return NextResponse.json({ events });
}
