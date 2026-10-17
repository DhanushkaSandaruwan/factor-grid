import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchProjectsAndIssues } from '@/lib/services/search-service';

/** GET /api/search?q=… — search projects and issues. */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) {
    return NextResponse.json({ projects: [], issues: [] });
  }

  try {
    const results = await searchProjectsAndIssues(userId, q);
    return NextResponse.json(results);
  } catch (error) {
    console.error('[api/search] search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
