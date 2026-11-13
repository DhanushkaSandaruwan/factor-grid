'use client';

import { Button } from '@/components/ui/button';
import { ATTRIBUTE_PRESETS } from '@/lib/attribute-presets';
import { OptionChip } from './option-chip';

const GROUPS = [
  { category: 'hf', title: 'Attributes Type (HF)' },
  { category: 'risk', title: 'Attributes Type (Risk Assessment)' },
  { category: 'action', title: 'Action Attributes' },
];

/** One attribute group: the options the administrator maintains, shown as toggles. */
function AttributeGroup({ title, category, options, selected, error, onToggle }) {
  // A name on an existing project that is no longer offered stays visible so it can be removed.
  const offered = new Set(options.map((name) => name.toLowerCase()));
  const retired = selected.filter((name) => !offered.has(name.toLowerCase()));

  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((name) => (
          <OptionChip
            key={name}
            label={name}
            selected={selected.includes(name)}
            onToggle={() => onToggle(category, name)}
          />
        ))}
        {retired.map((name) => (
          <OptionChip
            key={name}
            label={`${name} (no longer offered)`}
            selected
            onToggle={() => onToggle(category, name)}
          />
        ))}
        {options.length === 0 && retired.length === 0 ? (
          <p className="text-muted-foreground text-xs">No options yet. Ask the administrator to add them.</p>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        <p className="text-muted-foreground text-xs">Select all that apply.</p>
      )}
    </fieldset>
  );
}

/**
 * Wizard step 02 — attribute selection. Options come from the lists the
 * installation administrator maintains; presets pre-select the ones offered.
 * @param {{ options: {hf: string[], risk: string[], action: string[]}, selections: object, errors: Record<string, string>, onToggle: Function, onApplyPreset: (preset: object) => void, presetNotice?: string | null }} props
 */
export function WizardStepAttributes({ options, selections, errors, onToggle, onApplyPreset, presetNotice }) {
  return (
    <div className="space-y-6">
      <div className="bg-muted/50 border-border/70 space-y-2 rounded-lg border p-3">
        <p className="eyebrow">Start from an industry preset</p>
        <div className="flex flex-wrap gap-2">
          {ATTRIBUTE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              title={preset.description}
              onClick={() => onApplyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        {presetNotice ? <p className="text-muted-foreground text-xs">{presetNotice}</p> : null}
      </div>
      {GROUPS.map(({ category, title }) => (
        <AttributeGroup
          key={category}
          title={title}
          category={category}
          options={options[category] ?? []}
          selected={selections[category] ?? []}
          error={errors[category]}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
