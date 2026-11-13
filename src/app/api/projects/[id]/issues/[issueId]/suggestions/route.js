import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { getIssueById } from '@/lib/services/issue-service';
import { suggestForIssue } from '@/lib/services/issue-suggestion-service';
import { SUGGESTION_KINDS } from '@/lib/ai-suggestion-rules';

/**
 * POST — AI drafts for one issue (any member). Suggestions are returned only;
 * the client saves one only when a person accepts it.
 * Body: { kind: 'recommendations' | 'classify' }
 */
export async function POST(request, { params }) {
  const { userId } = await auth();
  const { id, issueId } = await params;
  const { project, response } = await guardProject(userId, id);
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!SUGGESTION_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: 'Choose recommendations or classify.' }, { status: 400 });
  }

  const issue = await getIssueById(issueId, id);
  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

  try {
    return NextResponse.json(await suggestForIssue(body.kind, issue, project));
  } catch (error) {
    console.error('[ai-suggestions]', error);
    return NextResponse.json({ error: error.message || 'The AI assistant is unavailable.' }, { status: 503 });
  }
}
