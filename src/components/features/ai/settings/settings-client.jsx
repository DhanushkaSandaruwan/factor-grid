'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiKeysSection } from './api-keys-section';
import { ModelSection } from './model-section';
import { SystemPromptSection } from './system-prompt-section';
import { ToolsSection } from './tools-section';

/**
 * AI Settings client component — fetches settings and renders all sections.
 */
export function SettingsClient() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading settings…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-destructive text-sm">{error}</p>
        <Button onClick={fetchSettings} variant="outline">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">AI Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure the AI assistant — API keys, model, system prompt, and tools.
          </p>
        </div>
      </header>

      <ApiKeysSection />
      <ModelSection settings={settings} onSettingsChange={setSettings} />
      <SystemPromptSection settings={settings} onSettingsChange={setSettings} />
      <ToolsSection settings={settings} onSettingsChange={setSettings} />
    </div>
  );
}
