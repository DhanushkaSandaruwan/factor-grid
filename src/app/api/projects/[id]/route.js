import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateProject, deleteProject } from '@/lib/services/project-service';

/** PUT /api/projects/[id] — update a project from the wizard (edit mode). */
export async function PUT(request, { params }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await updateProject(userId, id, payload);
    if (!result.ok) {
      if (result.code === 'not_found') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      if (result.code === 'forbidden') {
        return NextResponse.json(
          { error: 'You do not have permission to edit this project.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ step: result.step, errors: result.errors }, { status: 400 });
    }
    return NextResponse.json({ project: result.project }, { status: 200 });
  } catch (error) {
    console.error('[api/projects] failed to update project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

/** DELETE /api/projects/[id] — permanently delete a project and all its data. */
export async function DELETE(_request, { params }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteProject(userId, id);
    if (!result.ok) {
      if (result.code === 'not_found') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      if (result.code === 'forbidden') {
        return NextResponse.json(
          { error: 'Only the project owner can delete this project.' },
          { status: 403 }
        );
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/projects] failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
