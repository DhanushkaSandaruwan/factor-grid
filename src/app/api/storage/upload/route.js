import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadFileDirectly } from '@/lib/services/media-file-service';

/**
 * POST /api/storage/upload
 * Upload a file straight through the API in one request — simplest path for
 * small files. Large files should use the presigned flow instead:
 * POST /api/storage/files, PUT to the returned URL, then confirm.
 *
 * Body: multipart/form-data with a `file` field plus optional `projectId`
 * and `label` fields.
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'A file field is required' }, { status: 400 });
  }

  const projectId = form.get('projectId');
  const label = form.get('label');

  try {
    const result = await uploadFileDirectly(userId, {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      body: Buffer.from(await file.arrayBuffer()),
      projectId: typeof projectId === 'string' ? projectId : undefined,
      label: typeof label === 'string' ? label : undefined,
    });

    if (!result.ok) {
      if (result.code === 'not_configured') {
        return NextResponse.json(
          { error: 'File storage is not configured on this server.' },
          { status: 503 },
        );
      }
      if (result.code === 'forbidden') {
        return NextResponse.json(
          { error: 'You do not have permission to upload to this project.' },
          { status: 403 },
        );
      }
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({ file: result.file }, { status: 201 });
  } catch (error) {
    console.error('[api/storage/upload] failed to upload file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
