'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ATTRIBUTE_PRESETS } from '@/lib/attribute-presets';

const LISTS = [
  { category: 'hf', title: 'Attributes Type (HF)', hint: 'Built-in HF names keep their derived behaviour.' },
  { category: 'risk', title: 'Attributes Type (Risk Assessment)', hint: 'Numeric per issue.' },
  { category: 'action', title: 'Action Attributes', hint: 'Free text per issue.' },
  {
    category: 'action_type',
    title: 'Action type choices',
    hint: 'Dropdown values for the "Action Type" attribute.',
  },
];

/** One option row: inline rename, position arrows and an active switch. */
function OptionRow({ option, siblings, onSave }) {
  const [name, setName] = useState(option.name);
  const index = siblings.findIndex((s) => s._id === option._id);

  return (
    <li className="flex items-center gap-2 py-1.5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== option.name && onSave(option._id, { name })}
        aria-label={`Name of ${option.name}`}
        className={`h-7 flex-1 text-sm ${option.active ? '' : 'text-muted-foreground line-through'}`}
        maxLength={100}
      />
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Move up"
        disabled={index <= 0}
        onClick={() => onSave(option._id, { order: siblings[index - 1].order })}
      >
        <ChevronUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Move down"
        disabled={index >= siblings.length - 1}
        onClick={() => onSave(option._id, { order: siblings[index + 1].order })}
      >
        <ChevronDown />
      </Button>
      <Switch
        checked={option.active}
        onCheckedChange={(checked) => onSave(option._id, { active: checked })}
        aria-label={
          option.active ? `Hide ${option.name} from the wizard` : `Show ${option.name} in the wizard`
        }
      />
    </li>
  );
}

/**
 * Administration screen for the shared attribute lists. Changes apply to new
 * projects only; existing projects keep the names they were created with.
 * @param {{ initialOptions: object[] }} props
 */
export function AttributeOptionsAdmin({ initialOptions }) {
  const [options, setOptions] = useState(initialOptions);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState(null);

  async function send(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(Object.values(data.errors ?? {})[0] ?? data.error ?? 'Could not save.');
    return data.option;
  }

  async function save(id, changes) {
    setError(null);
    try {
      const updated = await send(`/api/admin/attribute-options/${id}`, 'PATCH', changes);
      setOptions((prev) => prev.map((o) => (o._id === id ? updated : o)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadPreset(presetId) {
    setError(null);
    try {
      const res = await fetch('/api/admin/attribute-options/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId }),
      });
      if (!res.ok) throw new Error('Could not add the preset.');
      const fresh = await fetch('/api/admin/attribute-options').then((r) => r.json());
      setOptions(fresh.options ?? []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function add(category) {
    const name = (drafts[category] ?? '').trim();
    if (!name) return;
    setError(null);
    try {
      const created = await send('/api/admin/attribute-options', 'POST', { category, name });
      setOptions((prev) => [...prev, created]);
      setDrafts((prev) => ({ ...prev, [category]: '' }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Attribute lists</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          These lists feed the project wizard. Renaming or hiding an option affects new projects only;
          existing projects keep their attributes.
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Card className="[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>Industry presets</CardTitle>
          <CardDescription className="text-xs">
            Add a preset&apos;s attribute names to these lists. Names already offered are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ATTRIBUTE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              title={preset.description}
              onClick={() => loadPreset(preset.id)}
            >
              Add “{preset.label}”
            </Button>
          ))}
        </CardContent>
      </Card>

      {LISTS.map(({ category, title, hint }) => {
        const rows = options
          .filter((o) => o.category === category)
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        return (
          <Card key={category} className="[--card-spacing:--spacing(4)]">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="text-xs">{hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-border/70 divide-y">
                {rows.map((option) => (
                  <OptionRow key={option._id} option={option} siblings={rows} onSave={save} />
                ))}
                {rows.length === 0 ? (
                  <li className="text-muted-foreground py-2 text-xs">No options yet.</li>
                ) : null}
              </ul>
              <div className="flex items-center gap-2">
                <Input
                  value={drafts[category] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [category]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add(category))}
                  placeholder="Add an option…"
                  aria-label={`Add to ${title}`}
                  maxLength={100}
                  className="h-8 max-w-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => add(category)}
                  disabled={!(drafts[category] ?? '').trim()}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
                <Badge tone="neutral">{rows.filter((r) => r.active).length} active</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
