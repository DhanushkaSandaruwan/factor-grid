import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { getProjectTeam, inviteMember } from '@/lib/services/membership-service';

/** GET /api/projects/[id]/members — list the project team. */
export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const project = await getProjectById(userId, id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const team = await getProjectTeam(project);
    return NextResponse.json({ team }, { status: 200 });
  } catch (error) {
    console.error('[api/projects/members] failed to list team:', error);
    return NextResponse.json({ error: 'Failed to load team' }, { status: 500 });
  }
}

/** POST /api/projects/[id]/members — invite a team member to the project. */
export async function POST(request, { params }) {
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
    const result = await inviteMember(userId, id, payload);
    if (!result.ok) {
      if (result.code === 'not_found') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      if (result.code === 'forbidden') {
        return NextResponse.json(
          { error: 'You do not have permission to invite members to this project.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }
    return NextResponse.json(
      { member: result.member, registered: result.registered },
      { status: 201 }
    );
  } catch (error) {
    console.error('[api/projects/members] failed to invite member:', error);
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
  }
}
