'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const TYPE_LABEL = { usability: 'Usability', safety: 'Safety', both: 'Both' };

/**
 * AI drafts for the selected issue. Nothing is saved until a person clicks
 * Add or Apply. The issue text is sent to the AI provider configured for this installation.
 * @param {{ projectId: string, issue: object, readOnly?: boolean, onIssueUpdated: (issue: object) => void }} props
 */
export function IssueAiDialog({ projectId, issue, readOnly = false, onIssueUpdated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const base = `/api/projects/${projectId}/issues/${issue._id}`;

  async function call(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? Object.values(data.errors ?? {})[0] ?? 'Could not save.');
    return data;
  }

  async function generate(kind) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await call(`${base}/suggestions`, 'POST', { kind }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addRecommendation(suggestion) {
    setBusy(true);
    setError(null);
    try {
      const { issue: updated } = await call(`${base}/recommendations`, 'POST', { text: suggestion.text });
      const recs = updated.recommendations ?? [];
      const recommendationId = String(recs[recs.length - 1]._id);
      for (const text of suggestion.requirements) {
        const next = await call(`${base}/requirements`, 'POST', { recommendationId, text });
        onIssueUpdated(next.issue);
      }
      onIssueUpdated(updated);
      setResult((prev) => ({
        ...prev,
        recommendations: prev.recommendations.filter((r) => r !== suggestion),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyClassification(field, value) {
    setBusy(true);
    setError(null);
    try {
      const body = field === 'issueType' ? { issueType: value } : { hfValues: { [value]: true } };
      const data = await call(base, 'PATCH', body);
      onIssueUpdated(data.issue);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="px-4 py-2.5">
        <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <Sparkles data-icon="inline-start" />
          Suggest with AI
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`AI suggestions · ${issue.issueId}`}
          description="Drafts for a person to review. Nothing is saved until you accept it. The issue text is sent to your configured AI provider."
        >
          {readOnly ? (
            <p className="text-muted-foreground text-sm">
              Read-only access: you can view suggestions but not apply them.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => generate('recommendations')}>
              Draft recommendations
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => generate('classify')}>
              Suggest classification
            </Button>
            {busy ? <Spinner className="text-muted-foreground size-4" /> : null}
          </div>

          {error ? <p className="text-destructive text-xs">{error}</p> : null}

          {result?.recommendations ? (
            <div className="space-y-3">
              {result.recommendations.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No usable suggestions. Try again or add your own.
                </p>
              ) : null}
              {result.recommendations.map((s, i) => (
                <div key={i} className="border-border/70 space-y-2 rounded-lg border p-3">
                  <p className="text-sm">{s.text}</p>
                  {s.requirements.length > 0 ? (
                    <ul className="text-muted-foreground list-disc pl-5 text-xs">
                      {s.requirements.map((r, j) => (
                        <li key={j}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Button size="sm" disabled={busy || readOnly} onClick={() => addRecommendation(s)}>
                    Add as recommendation
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {result?.classification ? (
            <div className="border-border/70 space-y-3 rounded-lg border p-3">
              {result.classification.reasoning ? (
                <p className="text-muted-foreground text-xs">{result.classification.reasoning}</p>
              ) : null}
              {result.classification.issueType ? (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>Issue type: {TYPE_LABEL[result.classification.issueType]}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || readOnly}
                    onClick={() => applyClassification('issueType', result.classification.issueType)}
                  >
                    Apply
                  </Button>
                </div>
              ) : null}
              {result.classification.hfAttributes.map((name) => (
                <div key={name} className="flex items-center justify-between gap-2 text-sm">
                  <span>Mark “{name}”</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || readOnly}
                    onClick={() => applyClassification('hf', name)}
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
