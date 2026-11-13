import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { checkUpload, listUploads } from '@/lib/services/registry-import-service';

/** GET — uploads for this project, newest first (any member). */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  const { id } = await params;
  const { response } = await guardProject(userId, id);
  if (response) return response;
  return NextResponse.json({ uploads: await listUploads(id) });
}

/**
 * POST — upload a registry file (.xlsx or .csv) and check it. The file is stored
 * in object storage and nothing is imported yet (editors and owner only).
 */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;
  const { project, response } = await guardProject(userId, id, { write: true });
  if (response) return response;

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Send the file as an upload.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await checkUpload({
    project,
    actor: userId,
    buffer,
    fileName: file.name || 'upload',
    contentType: file.type,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ upload: result.batch }, { status: 201 });
}
