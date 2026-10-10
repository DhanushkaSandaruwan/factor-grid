'use client';

import { OptionChip } from './option-chip';

const GROUPS = [
  { category: 'hf', title: 'Attributes Type (HF)' },
  { category: 'risk', title: 'Attributes Type (Risk Assessment)' },
  { category: 'action', title: 'Action Attributes' },
];

/**
 * Wizard step 02 — attribute selection. Options are loaded from the
 * database, so the list reflects admin-managed data.
 * @param {{ options: {hf: string[], risk: string[], action: string[]}, selections: {hf: string[], risk: string[], action: string[]}, errors: Record<string, string>, onToggle: (category: string, name: string) => void }} props
 */
export function WizardStepAttributes({ options, selections, errors, onToggle }) {
  return (
    <div className="space-y-6">
      {GROUPS.map(({ category, title }) => (
        <fieldset key={category} className="space-y-2.5">
          <legend className="text-sm font-medium">{title}</legend>
          <div className="flex flex-wrap gap-2">
            {options[category]?.map((name) => (
              <OptionChip
                key={name}
                label={name}
                selected={selections[category]?.includes(name) ?? false}
                onToggle={() => onToggle(category, name)}
              />
            ))}
            {options[category]?.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No options configured. Ask an administrator to add options.
              </p>
            ) : null}
          </div>
          {errors[category] ? (
            <p className="text-destructive text-xs">{errors[category]}</p>
          ) : (
            <p className="text-muted-foreground text-xs">Select all that apply.</p>
          )}
        </fieldset>
      ))}
    </div>
  );
}
