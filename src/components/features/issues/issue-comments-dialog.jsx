'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

/** Render a comment body, highlighting @mentions. */
function Body({ text }) {
  const parts = String(text).split(/(@[\p{L}][\p{L}\p{N}._-]*)/u);
  return (
    <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/**
 * Discussion thread for one issue. Any member can read and comment; authors
 * (and editors) can delete comments.
 * @param {{ projectId: string, issueId: string, issueCode: string }} props
 */
export function IssueCommentsDialog({ projectId, issueId, issueCode }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const base = `/api/projects/${projectId}/issues/${issueId}/comments`;

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch(base)
      .then((res) => res.json())
      .then((data) => active && setComments(data.comments ?? []))
      .catch(() => active && setError('Could not load the discussion.'));
    return () => {
      active = false;
    };
  }, [open, base]);

  async function post() {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.errors?.body ?? data.error ?? 'Could not post the comment.');
      else {
        setComments((prev) => [...(prev ?? []), data.comment]);
        setDraft('');
      }
    } catch {
      setError('Could not post the comment.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId) {
    setError(null);
    const res = await fetch(`${base}/${commentId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not delete the comment.');
      return;
    }
    setComments((prev) => prev.filter((c) => c._id !== commentId));
  }

  return (
    <>
      <div className="px-4 py-2.5">
        <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <MessageSquare data-icon="inline-start" />
          Discussion
          {comments?.length ? (
            <span className="text-muted-foreground font-mono">{comments.length}</span>
          ) : null}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Discussion · ${issueCode}`}
          description="Comments are kept with the issue. Use @Name to mention someone."
        >
          <div className="scrollbar-refined max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {comments === null && !error ? <Spinner className="text-muted-foreground size-4" /> : null}
            {comments?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No comments yet.</p>
            ) : null}
            {(comments ?? []).map((c) => (
              <div key={c._id} className="border-border/70 rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    {c.authorName} ·{' '}
                    {new Date(c.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(c._id)}
                    aria-label="Delete comment"
                    className="text-muted-foreground hover:text-destructive focus-ring rounded p-1"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <Body text={c.body} />
              </div>
            ))}
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add a comment…"
            aria-label="New comment"
          />
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
          <DialogFooter>
            <Button onClick={post} disabled={busy || !draft.trim()}>
              {busy ? <Spinner className="size-3" /> : null}
              Post comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
