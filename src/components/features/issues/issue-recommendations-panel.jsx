'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Add/Edit dialog form. Rendered inside DialogContent so it mounts fresh
 * each time the dialog opens and the initial text re-applies.
 */
function RecommendationForm({ initialText, submitLabel, onSubmit, onClose, submitting }) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Recommendation text is required.');
      return;
    }
    onSubmit(text);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder="Enter recommendation text…"
        rows={5}
        maxLength={4000}
        aria-label="Recommendation text"
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Scrollable Recommendation column shown above the attributes cards in
 * the registry's right panel. Supports adding, editing, viewing and
 * deleting multiple free-text recommendations for the selected issue.
 * Items are clickable — the selected one is highlighted so it is clear
 * which recommendation is being worked on.
 *
 * @param {{ projectId: string, issueId: string, recommendations: object[], selectedRecommendationId: string | null, onSelectRecommendation: (id: string | null) => void, onIssueUpdated: (issue: object) => void }} props
 */
export function IssueRecommendationsPanel({
  projectId,
  issueId,
  recommendations,
  selectedRecommendationId,
  onSelectRecommendation,
  onIssueUpdated,
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const endpoint = `/api/projects/${projectId}/issues/${issueId}/recommendations`;

  async function send(method, body, query) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(query ? `${endpoint}?${query}` : endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.errors?.text ?? data.error ?? 'Failed to save recommendation.');
        return null;
      }
      return data.issue;
    } catch {
      setError('Failed to save recommendation.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(text) {
    const issue = editing
      ? await send('PATCH', { recommendationId: editing._id, text })
      : await send('POST', { text });
    if (issue) {
      setDialogOpen(false);
      onIssueUpdated(issue);
    }
  }

  async function handleDelete() {
    const issue = await send('DELETE', null, `recommendationId=${deleting._id}`);
    if (issue) {
      setDeleting(null);
      onIssueUpdated(issue);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Recommendations
          </span>
          <span className="text-muted-foreground text-[0.65rem]">
            {recommendations.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          aria-label="Add recommendation"
          title="Add recommendation"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 items-center justify-center rounded transition-colors"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Scrollable list */}
      <div className="scrollbar-refined min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {recommendations.length === 0 ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-xs">
            No recommendations yet. Use the + button to add one.
          </p>
        ) : (
          recommendations.map((rec, index) => {
            const selected = rec._id === selectedRecommendationId;
            return (
              <div
                key={rec._id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRecommendation(selected ? null : rec._id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRecommendation(selected ? null : rec._id);
                  }
                }}
                aria-pressed={selected}
                className={`rounded-lg border p-2.5 transition-colors ${
                  selected
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-muted/30 hover:border-border hover:bg-muted/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-foreground/90 text-xs leading-relaxed break-words whitespace-pre-wrap">
                    <span
                      className={`mr-1.5 font-mono text-[0.65rem] ${
                        selected ? 'text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {rec.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(rec);
                        setDialogOpen(true);
                      }}
                      aria-label={`Edit recommendation ${index + 1}`}
                      className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(rec);
                      }}
                      aria-label={`Delete recommendation ${index + 1}`}
                      className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {error && <p className="text-destructive px-1 text-xs">{error}</p>}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title={editing ? 'Edit Recommendation' : 'Add Recommendation'}
          description={editing ? 'Update the recommendation text.' : 'Record a new recommendation for this issue.'}
        >
          <RecommendationForm
            key={editing?._id ?? 'new'}
            initialText={editing?.text ?? ''}
            submitLabel={editing ? 'Save Changes' : 'Add'}
            onSubmit={handleSave}
            onClose={() => setDialogOpen(false)}
            submitting={busy}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title="Delete Recommendation">
          <p className="text-muted-foreground text-sm">
            This recommendation will be permanently removed. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={busy} onClick={handleDelete}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
