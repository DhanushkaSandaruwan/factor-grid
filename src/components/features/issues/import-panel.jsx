'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const STATUS = {
  checked: { label: 'Ready to import', tone: 'primary' },
  rejected: { label: 'Needs fixes', tone: 'danger' },
  imported: { label: 'Imported', tone: 'closed' },
  failed: { label: 'Undone', tone: 'danger' },
};

const RULES = [
  'Use the template for this project so the column names match exactly.',
  'Project must be this project’s name on every row.',
  'Each issue starts on a row with a Title. Its other rows leave the issue columns blank.',
  'A new recommendation starts where Recommendation is filled in; its requirements follow on the rows below.',
  'Assignee must be a member of this project, by name or email.',
  'Packages are separated by “;”. Packages that do not exist yet are created. Packages already in the project stay as they are.',
  'Status can be open or transferred. Close issues in the app with a sign-off.',
  'Attribute columns (HF, Risk, Action) must match this project’s attributes. Risk values are whole numbers; HF values are Yes or No.',
  'Links and evidence are read-only in the export and are not imported.',
];

function ProblemList({ errors }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground text-left">
          <tr>
            <th className="py-1 pr-3 font-medium">Line</th>
            <th className="py-1 pr-3 font-medium">Column</th>
            <th className="py-1 font-medium">What to fix</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((e, i) => (
            <tr key={i} className="border-border/60 border-t align-top">
              <td className="py-1.5 pr-3 font-mono">{e.line}</td>
              <td className="py-1.5 pr-3">{e.column || '—'}</td>
              <td className="py-1.5">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Registry import: download the template, upload a file, read the check
 * result, then import. Every upload is kept and can be downloaded again.
 * @param {{ projectId: string }} props
 */
export function ImportPanel({ projectId }) {
  const base = `/api/projects/${projectId}`;
  const [file, setFile] = useState(null);
  const [current, setCurrent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadUploads = useCallback(async () => {
    const res = await fetch(`${base}/imports`);
    if (res.ok) setUploads((await res.json()).uploads ?? []);
  }, [base]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  async function check() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setCurrent(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${base}/imports`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'The file could not be checked.');
      else setCurrent(data.upload);
      await loadUploads();
    } catch {
      setError('The file could not be uploaded. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function importNow() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${base}/imports/${current._id}/commit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'The import did not finish.');
      else setCurrent(data.upload);
      await loadUploads();
    } catch {
      setError('The import did not finish. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const summary = current?.summary ?? {};

  return (
    <div className="space-y-5">
      <Card className="[--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>Format</CardTitle>
          <CardDescription>
            The file has the same layout as the registry export. Start from the template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <a
              href={`${base}/import/template?format=xlsx`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              download
            >
              <FileSpreadsheet data-icon="inline-start" />
              Excel template
            </a>
            <a
              href={`${base}/import/template?format=csv`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              download
            >
              <Download data-icon="inline-start" />
              CSV template
            </a>
          </div>
          <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>Upload and check</CardTitle>
          <CardDescription>
            The file is stored first, then checked. Nothing is imported until the check passes. Your file is
            kept for audit either way.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'cursor-pointer' })}
            >
              <Upload data-icon="inline-start" />
              {file ? 'Change file' : 'Choose file'}
              <input
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setCurrent(null);
                  setError(null);
                }}
              />
            </label>
            {file ? <span className="text-muted-foreground text-xs">{file.name}</span> : null}
            <Button size="sm" onClick={check} disabled={!file || busy}>
              {busy ? <Spinner className="size-3" /> : null}
              Check file
            </Button>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          {current?.status === 'rejected' ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {current.errors.length} problem{current.errors.length === 1 ? '' : 's'} to fix. Correct them
                in your file and upload it again.
              </p>
              <ProblemList errors={current.errors} />
            </div>
          ) : null}

          {current?.status === 'checked' ? (
            <div className="space-y-3">
              <p className="text-sm">
                {current.issueCount} issue{current.issueCount === 1 ? '' : 's'} ready
              </p>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>
                  Packages to create:{' '}
                  {summary.packagesToCreate?.length ? summary.packagesToCreate.join(', ') : 'none'}
                </li>
                <li>
                  Packages to add to this project:{' '}
                  {summary.packagesToAdd?.length ? summary.packagesToAdd.join(', ') : 'none'}
                </li>
              </ul>
              <Button onClick={importNow} disabled={busy}>
                {busy ? <Spinner className="size-3" /> : null}
                Import {current.issueCount} issues
              </Button>
            </div>
          ) : null}

          {current?.status === 'imported' ? (
            <p className="text-sm text-emerald-700">Imported {current.issueCount} issues.</p>
          ) : null}
          {current?.status === 'failed' ? (
            <p className="text-destructive text-sm">{current.message}</p>
          ) : null}

          {current?.warnings?.length ? (
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              {current.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle>Upload history</CardTitle>
          <CardDescription>
            Every uploaded file is kept. Download any of them again for an audit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="text-muted-foreground text-sm">No uploads yet.</p>
          ) : (
            <ul className="divide-border/70 divide-y text-sm">
              {uploads.map((u) => (
                <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.fileName}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {u.uploadedByName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS[u.status]?.tone ?? 'neutral'}>
                      {STATUS[u.status]?.label ?? u.status}
                    </Badge>
                    <a
                      href={`${base}/imports/${u._id}/file`}
                      className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                      download
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Original
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
