'use client';

import { BadgeCheck, Boxes, FileText, ShieldCheck, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="text-primary size-4" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ChipList({ items, emptyLabel }) {
  if (!items || items.length === 0) {
    return <p className="text-muted-foreground text-xs">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="bg-secondary text-secondary-foreground inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Field({ label, value, fallback = '—' }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="text-sm break-words">{value?.trim() ? value : fallback}</dd>
    </div>
  );
}

/**
 * Live preview of the project being configured in the wizard, plus the
 * confirmation checkbox that unlocks the create/save action.
 */
export function ProjectPreview({
  mode = 'create',
  basics,
  selections,
  selectedPackages,
  confirmed,
  onConfirmedChange,
  onCreate,
  submitting,
  createError,
}) {
  const isEdit = mode === 'edit';
  const prefix = basics.issueIdPrefix?.trim() ? basics.issueIdPrefix.trim().toUpperCase() : null;

  return (
    <Card className="shadow-enterprise [--card-spacing:--spacing(5)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="text-primary size-4" />
          Project preview
        </CardTitle>
        <CardDescription>Everything you configure in the wizard, at a glance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section icon={Target} title="Overview">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Project title" value={basics.title} />
            <Field label="Client" value={basics.client} />
            <div className="space-y-0.5">
              <dt className="text-muted-foreground text-xs font-medium">Issue ID prefix</dt>
              <dd className="text-sm">
                {prefix ? (
                  <span className="bg-accent text-accent-foreground inline-flex h-6 items-center rounded-md px-2 font-mono text-xs font-semibold">
                    {prefix}-001
                  </span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        </Section>

        <Section icon={FileText} title="Description">
          <p className="text-muted-foreground text-sm break-words">
            {basics.description?.trim() || 'No description provided.'}
          </p>
        </Section>

        <Section icon={ShieldCheck} title="Attributes Type (HF)">
          <ChipList items={selections.hf} emptyLabel="None selected yet." />
        </Section>

        <Section icon={ShieldCheck} title="Attributes Type (Risk Assessment)">
          <ChipList items={selections.risk} emptyLabel="None selected yet." />
        </Section>

        <Section icon={ShieldCheck} title="Action Attributes">
          <ChipList items={selections.action} emptyLabel="None selected yet." />
        </Section>

        <Section icon={Boxes} title="Packages">
          {selectedPackages.length === 0 ? (
            <p className="text-muted-foreground text-xs">No packages selected.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedPackages.map((pkg) => (
                <li key={String(pkg._id)} className="rounded-lg border p-2.5">
                  <p className="text-sm font-medium">{pkg.packageId}</p>
                  {pkg.description ? (
                    <p className="text-muted-foreground text-xs">{pkg.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="space-y-3 border-t pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(checked) => onConfirmedChange(checked === true)}
            />
            <span className="text-sm">
              I confirm the information above is correct and want to create this project.
            </span>
          </label>
          <Button className="w-full" disabled={!confirmed || submitting} onClick={onCreate}>
            {submitting
              ? isEdit
                ? 'Saving changes…'
                : 'Creating project…'
              : isEdit
                ? 'Save Changes'
                : 'Create Project'}
          </Button>
          {createError ? <p className="text-destructive text-xs">{createError}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
