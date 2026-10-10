import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createFileViewUrl, deleteFileForUser, getFileForUser } from '@/lib/services/media-file-service';

/**
 * GET /api/storage/files/[id]
 * File metadata plus a fresh presigned URL for viewing it inline. The URL is
 * short-lived, so clients should re-request it whenever they render a file.
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const file = await getFileForUser(userId, id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const view = await createFileViewUrl(file);
    return NextResponse.json({ file, url: view.url, urlExpiresAt: view.expiresAt });
  } catch (error) {
    console.error('[api/storage/files] failed to read file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

/**
 * DELETE /api/storage/files/[id]
 * Remove the object from R2 and delete its metadata record. Allowed for the
 * uploader and, on project-scoped files, the project owner or an editor.
 */
export async function DELETE(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await deleteFileForUser(userId, id);
    if (!result.ok) {
      if (result.code === 'forbidden') {
        return NextResponse.json(
          { error: 'You do not have permission to delete this file.' },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[api/storage/files] failed to delete file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
