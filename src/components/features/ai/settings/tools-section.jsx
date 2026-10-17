'use client';

import { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

/**
 * Tools section — enable or disable individual AI tools.
 */
export function ToolsSection({ settings, onSettingsChange }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTools();
  }, []);

  async function fetchTools() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/tools');
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleTool(name, enabled) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { [name]: enabled } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setTools(data.tools ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function setAll(enabled) {
    setSaving(true);
    setError(null);
    const updates = {};
    for (const t of tools) updates[t.name] = enabled;
    try {
      const res = await fetch('/api/ai/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setTools(data.tools ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="text-primary size-4" />
            Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">Loading tools…</p>
        </CardContent>
      </Card>
    );
  }

  const enabledCount = tools.filter((t) => t.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="text-primary size-4" />
          Tools
        </CardTitle>
        <CardDescription>
          Enable or disable what the AI assistant can do. {enabledCount} of {tools.length} tools enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-destructive text-xs">{error}</p>}

        <div className="flex items-center gap-2">
          <Button onClick={() => setAll(true)} variant="outline" size="sm" disabled={saving}>
            Enable All
          </Button>
          <Button onClick={() => setAll(false)} variant="outline" size="sm" disabled={saving}>
            Disable All
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-medium">{tool.name}</p>
                <p className="text-muted-foreground line-clamp-2 text-xs">{tool.description}</p>
              </div>
              <Switch
                checked={tool.enabled}
                onCheckedChange={(checked) => toggleTool(tool.name, checked)}
                disabled={saving}
                aria-label={`Toggle ${tool.name}`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
