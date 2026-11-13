'use client';

import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

/**
 * A single risk attribute chip: name with a [-] value [+] stepper.
 * Values start at 0 and cannot go below 0.
 */
function AttributeChip({ name, value, onChange }) {
  const step = (delta) => onChange(Math.max(0, value + delta));

  return (
    <div className="border-border/80 bg-card shadow-soft inline-flex items-center gap-1 rounded-md border px-2 py-1">
      <span className="text-foreground text-xs font-medium">{name}</span>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= 0}
        aria-label={`Decrease ${name}`}
        className="text-muted-foreground hover:bg-muted focus-ring flex size-5 cursor-pointer items-center justify-center rounded transition-colors disabled:opacity-30"
      >
        <Minus className="size-3" />
      </button>
      <span className="text-foreground w-5 text-center font-mono text-xs font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label={`Increase ${name}`}
        className="text-muted-foreground hover:bg-muted focus-ring flex size-5 cursor-pointer items-center justify-center rounded transition-colors"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

/** Project-specific HF attributes: each one is an on/off flag for this issue. */
function HfRow({ attributes, values, onToggle }) {
  return (
    <div className="border-border/80 bg-card flex flex-wrap items-center gap-2 rounded-lg border p-3 shadow-soft">
      <span className="eyebrow mr-1">HF attributes:</span>
      {attributes.map((name) => {
        const on = values[name] === true;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(name, !on)}
            className={`focus-ring inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors ${
              on
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {on ? <Check className="size-3" aria-hidden="true" /> : null}
            {name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Risk Assessment row — numeric steppers on a light card.
 */
function RiskRow({ attributes, values, onStep }) {
  return (
    <div className="border-border/80 bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <span className="eyebrow mr-1">Risk assessment:</span>
      {attributes.map((name) => (
        <AttributeChip key={name} name={name} value={values[name] ?? 0} onChange={(next) => onStep(name, next)} />
      ))}
    </div>
  );
}

/**
 * Action Attributes row — text attributes edit in place (saved on blur),
 * dropdown-backed attributes render a select. Dark card treatment.
 */
function ActionRow({ attributes, values, actionValueOptions, onTextChange, onTextBlur, onDropdownChange }) {
  return (
    <div className="border-obsidian-700 bg-obsidian-900 scrollbar-refined flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border p-3 shadow-soft">
      <span className="text-obsidian-300 mr-1 shrink-0 text-[0.65rem] font-semibold tracking-[0.08em] uppercase whitespace-nowrap">
        Action attributes:
      </span>
      {attributes.map((name) => {
        const options = actionValueOptions[name];
        if (!options) {
          return (
            <div
              key={name}
              className="border-obsidian-700 bg-obsidian-800 inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1"
            >
              <span className="text-obsidian-100 text-xs font-medium">{name}</span>
              <input
                type="text"
                value={values[name] ?? ''}
                onChange={(e) => onTextChange(name, e.target.value)}
                onBlur={(e) => onTextBlur(name, e.target.value)}
                placeholder="Enter value…"
                aria-label={name}
                className="text-obsidian-50 placeholder:text-obsidian-500 w-24 rounded bg-transparent text-xs outline-none"
              />
            </div>
          );
        }

        return (
          <div
            key={name}
            className="border-obsidian-700 bg-obsidian-800 inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1"
          >
            <span className="text-obsidian-100 text-xs font-medium">{name}</span>
            <select
              value={values[name] ?? ''}
              onChange={(e) => onDropdownChange(name, e.target.value)}
              aria-label={name}
              className="text-obsidian-50 bg-obsidian-800 cursor-pointer rounded text-xs outline-none"
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
 * Attribute cards pinned to the bottom of the registry's right column:
 * project HF flags, risk steppers and action attributes. Every change
 * persists to the selected issue (text inputs save on blur).
 *
 * @param {{ projectId: string, issueId: string, hfAttributes?: string[], riskAttributes: string[], actionAttributes: string[], actionValueOptions: Record<string, string[]>, initialHfValues?: Record<string, boolean>, initialRiskValues: Record<string, number>, initialActionValues: Record<string, string> }} props
 */
export function IssueAttributesPanel({
  projectId,
  issueId,
  hfAttributes = [],
  riskAttributes,
  actionAttributes,
  actionValueOptions,
  initialHfValues = {},
  initialRiskValues,
  initialActionValues,
}) {
  const [hfValues, setHfValues] = useState(initialHfValues);
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

  function handleHfToggle(name, next) {
    setHfValues((prev) => ({ ...prev, [name]: next }));
    persist({ hfValues: { [name]: next } });
  }

  function handleRiskStep(name, next) {
    setRiskValues((prev) => ({ ...prev, [name]: next }));
    persist({ riskValues: { [name]: next } });
  }

  // Text attributes update locally while typing and save once on blur,
  // instead of sending one request per keystroke.
  function handleTextChange(name, value) {
    setActionValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleTextBlur(name, value) {
    persist({ actionValues: { [name]: value } });
  }

  function handleDropdownChange(name, value) {
    setActionValues((prev) => ({ ...prev, [name]: value }));
    persist({ actionValues: { [name]: value } });
  }

  return (
    <div className="space-y-2 p-3">
      {hfAttributes.length > 0 && (
        <HfRow attributes={hfAttributes} values={hfValues} onToggle={handleHfToggle} />
      )}
      {riskAttributes.length > 0 && (
        <RiskRow attributes={riskAttributes} values={riskValues} onStep={handleRiskStep} />
      )}
      {actionAttributes.length > 0 && (
        <ActionRow
          attributes={actionAttributes}
          values={actionValues}
          actionValueOptions={actionValueOptions}
          onTextChange={handleTextChange}
          onTextBlur={handleTextBlur}
          onDropdownChange={handleDropdownChange}
        />
      )}
      <div className="flex h-4 items-center justify-end">
        {error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : saving ? (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Spinner className="size-3" />
            Saving…
          </span>
        ) : null}
      </div>
    </div>
  );
}
