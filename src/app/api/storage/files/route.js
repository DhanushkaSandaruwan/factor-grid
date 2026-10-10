import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUploadTicket, listFilesForUser } from '@/lib/services/media-file-service';

/**
 * GET /api/storage/files?projectId=
 * List media files visible to the caller — their own files plus files of
 * every project they are an active member of, or just one project's files
 * when `projectId` is given.
 */
export async function GET(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = new URL(request.url).searchParams.get('projectId') ?? undefined;

  try {
    const files = await listFilesForUser(userId, { projectId });
    return NextResponse.json({ files });
  } catch (error) {
    console.error('[api/storage/files] failed to list files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

/**
 * POST /api/storage/files
 * Reserve an object key and return a presigned PUT URL. The client uploads
 * the bytes straight to Cloudflare R2 with that URL, then confirms via
 * POST /api/storage/files/[id]/confirm.
 *
 * Body: { filename, contentType, size, projectId?, label? }
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await createUploadTicket(userId, payload);
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
    return NextResponse.json({ file: result.file, upload: result.upload }, { status: 201 });
  } catch (error) {
    console.error('[api/storage/files] failed to create upload ticket:', error);
    return NextResponse.json({ error: 'Failed to create upload' }, { status: 500 });
  }
}
