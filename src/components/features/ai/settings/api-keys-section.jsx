'use client';

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * API Keys section — list, add, delete, and reset rate-limited keys.
 */
export function ApiKeysSection() {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);

  async function fetchKeys() {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/ai/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } finally {
      setKeysLoading(false);
    }
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function addKey() {
    if (!name.trim() || !key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), key: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add key');
      setName('');
      setKey('');
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
    } finally {
      setLoading(false);
    }
  }

  async function deleteKey(id) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete key');
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key');
    } finally {
      setLoading(false);
    }
  }

  async function resetKey(id) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/keys/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to reset key');
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset key');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="text-primary size-4" />
          API Keys
        </CardTitle>
        <CardDescription>
          Manage Groq API keys. Keys are encrypted at rest and rotated automatically on rate limits.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-destructive text-xs">{error}</p>}

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <Input
              placeholder="Key name (e.g. Primary)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Key name"
            />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <Input
              type="password"
              placeholder="gsk_…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              aria-label="API key"
            />
          </div>
          <Button onClick={addKey} disabled={loading || !name.trim() || !key.trim()} size="sm">
            <Plus className="mr-1 size-3.5" />
            Add Key
          </Button>
        </div>

        {keysLoading ? (
          <p className="text-muted-foreground text-xs">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No keys stored yet. Add one above, or use the GROQ_API_KEYS environment variable.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate text-sm font-medium">{k.name}</span>
                    <span
                      className={`inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium ${
                        k.status === 'active'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {k.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {k.provider} · Last used {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'never'}
                    {k.status === 'rate-limited' && k.rateLimitedUntil && (
                      <> · Limited until {new Date(k.rateLimitedUntil).toLocaleTimeString()}</>
                    )}
                  </p>
                </div>
                {k.status === 'rate-limited' && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => resetKey(k.id)}
                    disabled={loading}
                    aria-label="Reset rate limit"
                    title="Reset rate limit"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteKey(k.id)}
                  disabled={loading}
                  aria-label="Delete key"
                  title="Delete key"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
