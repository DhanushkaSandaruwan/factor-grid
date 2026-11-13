import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { commitUpload } from '@/lib/services/registry-import-service';

/** POST — import an upload that passed its check (editors and owner only). */
export async function POST(_request, { params }) {
  const { userId } = await auth();
  const { id, batchId } = await params;
  const { project, response } = await guardProject(userId, id, { write: true });
  if (response) return response;
  const result = await commitUpload({ project, actor: userId, batchId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  return NextResponse.json({ created: result.created, upload: result.batch });
}
