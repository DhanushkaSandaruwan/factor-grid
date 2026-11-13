import { NextResponse } from 'next/server';
import { getProjectAccess } from '@/lib/services/access-service';

/**
 * Route-level access check. Returns a ready-made error response when the
 * request must stop, or `{ project, access }` when it may continue.
 *
 * - No signed-in user → 401.
 * - No active access to the project → 404 (do not reveal that it exists).
 * - Write request without edit rights → 403.
 *
 * @param {string|null} userId
 * @param {string} projectId
 * @param {{ write?: boolean }} [options]
 */
export async function guardProject(userId, projectId, { write = false } = {}) {
  if (!userId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const access = await getProjectAccess(userId, projectId);
  if (!access) {
    return { response: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  }
  if (write && !access.canEdit) {
    return {
      response: NextResponse.json(
        { error: 'Read-only access: only the project owner or an editor can make changes.' },
        { status: 403 }
      ),
    };
  }
  return { project: access.project, access };
}

/**
 * Convenience for handlers that gate by HTTP method: anything other than
 * GET/HEAD is a write. Returns a response to send, or null to continue.
 * @param {Request} request
 * @param {string|null} userId
 * @param {string} projectId
 */
export async function denyUnlessAllowed(request, userId, projectId) {
  const write = !['GET', 'HEAD'].includes(request.method);
  const { response } = await guardProject(userId, projectId, { write });
  return response ?? null;
}
