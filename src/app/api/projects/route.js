import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProject } from '@/lib/services/project-service';

/** POST /api/projects — create a project from the new-project wizard. */
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
    const result = await createProject(userId, payload);
    if (!result.ok) {
      return NextResponse.json({ step: result.step, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ project: result.project }, { status: 201 });
  } catch (error) {
    console.error('[api/projects] failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
