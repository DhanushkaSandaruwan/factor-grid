'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FIELDS = [
  {
    id: 'title',
    label: 'Project title',
    placeholder: 'e.g. Cockpit Redesign HF Assessment',
    hint: 'Shown across the platform as the project name.',
  },
  {
    id: 'client',
    label: 'Client',
    placeholder: 'e.g. Altair Aerospace',
    hint: 'Organisation this project is delivered for.',
  },
  {
    id: 'issueIdPrefix',
    label: 'Issue ID prefix',
    placeholder: 'e.g. CRA',
    hint: 'Issues will be numbered like CRA-001. Letters, numbers and hyphens.',
  },
];

/**
 * Wizard step 01 — project basics.
 * @param {{ values: object, errors: Record<string, string>, onChange: (field: string, value: string) => void }} props
 */
export function WizardStepBasics({ values, errors, onChange }) {
  return (
    <div className="space-y-5">
      {FIELDS.map(({ id, label, placeholder, hint }) => (
        <div key={id} className="space-y-2">
          <Label htmlFor={id}>{label}</Label>
          <Input
            id={id}
            name={id}
            placeholder={placeholder}
            value={values[id] ?? ''}
            onChange={(event) => onChange(id, event.target.value)}
            aria-invalid={Boolean(errors[id])}
          />
          {errors[id] ? (
            <p className="text-destructive text-xs">{errors[id]}</p>
          ) : (
            <p className="text-muted-foreground text-xs">{hint}</p>
          )}
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Short summary of the project scope and objectives…"
          value={values.description ?? ''}
          onChange={(event) => onChange('description', event.target.value)}
          aria-invalid={Boolean(errors.description)}
          className="resize-none"
        />
        {errors.description ? (
          <p className="text-destructive text-xs">{errors.description}</p>
        ) : (
          <p className="text-muted-foreground text-xs">Optional, but recommended.</p>
        )}
      </div>
    </div>
  );
}
