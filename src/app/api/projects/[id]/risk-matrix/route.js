import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { getRiskMatrix } from '@/lib/services/risk-matrix-service';

/**
 * GET /api/projects/[id]/risk-matrix?x=<risk attribute>&y=<risk attribute>
 * Issue counts for each pair of values of two risk attributes. Any member may read.
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;

  const { project, response } = await guardProject(userId, id);
  if (response) return response;

  const url = new URL(request.url);
  const result = await getRiskMatrix(
    project,
    url.searchParams.get('x') ?? '',
    url.searchParams.get('y') ?? '',
  );
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
