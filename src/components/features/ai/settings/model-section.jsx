'use client';

import { useState } from 'react';
import { Cpu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Model section — base URL, model name, temperature, and max tokens.
 */
export function ModelSection({ settings, onSettingsChange }) {
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? '');
  const [model, setModel] = useState(settings?.model ?? '');
  const [temperature, setTemperature] = useState(settings?.temperature ?? 0.3);
  const [maxTokens, setMaxTokens] = useState(settings?.maxTokens ?? 2048);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, model, temperature, maxTokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSettingsChange(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="text-primary size-4" />
          Model Configuration
        </CardTitle>
        <CardDescription>
          Configure the AI provider endpoint, model, and sampling parameters.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-destructive text-xs">{error}</p>}
        {saved && <p className="text-green-600 dark:text-green-400 text-xs">Saved.</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.groq.com/openai/v1"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">Model</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="openai/gpt-oss-120b"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">
              Temperature — {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="accent-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-xs font-medium">Max Tokens</label>
            <Input
              type="number"
              min="1"
              max="8192"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Button onClick={save} disabled={loading} size="sm">
            {loading ? 'Saving…' : 'Save Model Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
