'use client';

import { useEffect, useState } from 'react';
import { Download, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

/**
 * Baselines: frozen copies of the registry for reviews and audits. Editors can
 * create one; everyone can download them as JSON.
 * @param {{ projectId: string, canEdit: boolean }} props
 */
export function BaselinesCard({ projectId, canEdit }) {
  const [baselines, setBaselines] = useState(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const base = `/api/projects/${projectId}/baselines`;

  useEffect(() => {
    let active = true;
    fetch(base)
      .then((res) => res.json())
      .then((data) => active && setBaselines(data.baselines ?? []))
      .catch(() => active && setError('Could not load baselines.'));
    return () => {
      active = false;
    };
  }, [base]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.errors?.label ?? data.error ?? 'Could not create the baseline.');
      else {
        setBaselines((prev) => [data.baseline, ...(prev ?? [])]);
        setLabel('');
      }
    } catch {
      setError('Could not create the baseline.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="[--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="text-primary size-4" aria-hidden="true" />
          Baselines
        </CardTitle>
        <CardDescription className="text-xs">
          Frozen copies of the registry for reviews and audits. Each one can be downloaded as JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Pre-review, Rev B"
              maxLength={120}
              aria-label="Baseline name"
              className="h-8 max-w-xs"
            />
            <Button size="sm" onClick={create} disabled={busy || label.trim().length < 3}>
              {busy ? <Spinner className="size-3" /> : null}
              Create baseline
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        {baselines === null ? <Spinner className="text-muted-foreground size-4" /> : null}
        {baselines?.length === 0 ? <p className="text-muted-foreground text-xs">No baselines yet.</p> : null}
        <ul className="divide-border/70 divide-y">
          {(baselines ?? []).map((b) => (
            <li key={b._id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{b.label}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(b.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · {b.createdByName} · {b.issueCount} issues
                </p>
              </div>
              <a
                href={`${base}/${b._id}`}
                download
                className="text-primary hover:text-primary/80 focus-ring inline-flex items-center gap-1 rounded text-xs font-medium"
              >
                <Download className="size-3.5" aria-hidden="true" />
                JSON
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
