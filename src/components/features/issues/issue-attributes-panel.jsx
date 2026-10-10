'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * A single risk attribute chip: name with a [-] value [+] stepper.
 * Values start at 0 and cannot go below 0.
 */
function AttributeChip({ name, value, onChange }) {
  const step = (delta) => onChange(Math.max(0, value + delta));

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1">
      <span className="text-xs font-medium text-foreground">{name}</span>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= 0}
        aria-label={`Decrease ${name}`}
        className="text-muted-foreground hover:bg-muted flex size-5 items-center justify-center rounded transition-colors disabled:opacity-30"
      >
        <Minus className="size-3" />
      </button>
      <span className="w-5 text-center font-mono text-xs font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label={`Increase ${name}`}
        className="text-muted-foreground hover:bg-muted flex size-5 items-center justify-center rounded transition-colors"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

/**
 * Risk Assessment row — numeric steppers on a light card.
 */
function RiskRow({ attributes, values, onStep }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <span className="text-muted-foreground mr-1 text-[0.65rem] font-semibold uppercase tracking-wide">
        Risk Assessment:
      </span>
      {attributes.map((name) => (
        <AttributeChip
          key={name}
          name={name}
          value={values[name] ?? 0}
          onChange={(next) => onStep(name, next)}
        />
      ))}
    </div>
  );
}

/**
 * Action Attributes row — text attributes edit in place, dropdown-backed
 * attributes (linked via valueCategory) render a select. Dark card treatment.
 */
function ActionRow({ attributes, values, actionValueOptions, onTextChange, onDropdownChange }) {
  const dropdownOptionsFor = (name) => actionValueOptions[name];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-obsidian-700 bg-obsidian-900 p-3">
      <span className="text-obsidian-300 mr-1 text-[0.65rem] font-semibold uppercase tracking-wide">
        Action Attributes:
      </span>
      {attributes.map((name) => {
        const options = dropdownOptionsFor(name);
        if (!options) {
          return (
            <div
              key={name}
              className="inline-flex items-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-800 px-2 py-1"
            >
              <span className="text-xs font-medium text-obsidian-100">{name}</span>
              <input
                type="text"
                value={values[name] ?? ''}
                onChange={(e) => onTextChange(name, e.target.value)}
                placeholder="Enter value…"
                aria-label={name}
                className="text-foreground placeholder:text-obsidian-500 w-32 rounded bg-transparent text-xs outline-none"
              />
            </div>
          );
        }

        return (
          <div
            key={name}
            className="inline-flex items-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-800 px-2 py-1"
          >
            <span className="text-xs font-medium text-obsidian-100">{name}</span>
            <select
              value={values[name] ?? ''}
              onChange={(e) => onDropdownChange(name, e.target.value)}
              aria-label={name}
              className="text-foreground bg-obsidian-800 rounded text-xs outline-none"
            >
              <option value="">Select…</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Two-card panel pinned to the bottom of the registry preview column.
 * Card 1: Risk Assessment steppers. Card 2: Action Attributes edited in
 * place (text inputs + dropdowns). Every change persists immediately to
 * the selected issue.
 *
 * @param {{ projectId: string, issueId: string, riskAttributes: string[], actionAttributes: string[], actionValueOptions: Record<string, string[]>, initialRiskValues: Record<string, number>, initialActionValues: Record<string, string> }} props
 */
export function IssueAttributesPanel({
  projectId,
  issueId,
  riskAttributes,
  actionAttributes,
  actionValueOptions,
  initialRiskValues,
  initialActionValues,
}) {
  const [riskValues, setRiskValues] = useState(initialRiskValues);
  const [actionValues, setActionValues] = useState(initialActionValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function persist(payload) {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save values.');
      }
    } catch {
      setError('Failed to save values.');
    } finally {
      setSaving(false);
    }
  }

  function handleRiskStep(name, next) {
    setRiskValues((prev) => ({ ...prev, [name]: next }));
    persist({ riskValues: { [name]: next } });
  }

  function handleTextChange(name, value) {
    setActionValues((prev) => ({ ...prev, [name]: value }));
    persist({ actionValues: { [name]: value } });
  }

  function handleDropdownChange(name, value) {
    setActionValues((prev) => ({ ...prev, [name]: value }));
    persist({ actionValues: { [name]: value } });
  }

  return (
    <div className="space-y-2 p-3">
      <RiskRow
        attributes={riskAttributes}
        values={riskValues}
        onStep={handleRiskStep}
      />
      <ActionRow
        attributes={actionAttributes}
        values={actionValues}
        actionValueOptions={actionValueOptions}
        onTextChange={handleTextChange}
        onDropdownChange={handleDropdownChange}
      />
      <div className="flex h-4 items-center justify-end">
        {error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : saving ? (
          <p className="text-muted-foreground text-xs">Saving…</p>
        ) : null}
      </div>
    </div>
  );
}
