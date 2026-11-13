'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

/**
 * Owner-only danger zone. Deleting removes the project, its issues, comments,
 * files, baselines, notifications and activity log. The owner must type the
 * project title to confirm.
 * @param {{ projectId: string, title: string }} props
 */
export function DeleteProjectZone({ projectId, title }) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const matches = typed.trim() === title.trim();

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not delete the project.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Could not delete the project. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/30 [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <Trash2 className="size-4" aria-hidden="true" />
          Delete project
        </CardTitle>
        <CardDescription className="text-xs">
          Permanently removes this project with its issues, comments, files, baselines, notifications and
          activity log. This cannot be undone. Only the owner can do this.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirm" className="text-xs">
            Type <span className="font-semibold">{title}</span> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="h-8 max-w-sm"
            autoComplete="off"
          />
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        <Button variant="destructive" size="sm" disabled={!matches || busy} onClick={remove}>
          {busy ? <Spinner className="size-3" /> : null}
          Delete this project permanently
        </Button>
      </CardContent>
    </Card>
  );
}
