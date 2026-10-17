'use client';

import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const DEFAULT_PROMPT =
  'You are FactorGrid AI, an analytical assistant embedded in the FactorGrid human-factors platform. ' +
  'Answer concisely, use clear formatting, and stay focused on the user’s questions.';

/**
 * System Prompt section — edit the AI's persona and behavior instructions.
 */
export function SystemPromptSection({ settings, onSettingsChange }) {
  const [prompt, setPrompt] = useState(settings?.systemPrompt ?? DEFAULT_PROMPT);
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
        body: JSON.stringify({ systemPrompt: prompt }),
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

  function reset() {
    setPrompt(DEFAULT_PROMPT);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="text-primary size-4" />
          System Prompt
        </CardTitle>
        <CardDescription>
          Define the AI assistant's persona and behavior. This is sent as the first message in every conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-destructive text-xs">{error}</p>}
        {saved && <p className="text-green-600 dark:text-green-400 text-xs">Saved.</p>}

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="resize-y font-mono text-xs"
          aria-label="System prompt"
        />

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={loading} size="sm">
            {loading ? 'Saving…' : 'Save Prompt'}
          </Button>
          <Button onClick={reset} variant="outline" size="sm">
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
