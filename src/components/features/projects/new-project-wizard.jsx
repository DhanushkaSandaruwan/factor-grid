'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from 'cn';
import { WizardStepBasics } from './wizard-step-basics';
import { WizardStepAttributes } from './wizard-step-attributes';
import { WizardStepPackages } from './wizard-step-packages';
import { ProjectPreview } from './project-preview';

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Attributes' },
  { id: 3, label: 'Packages' },
];

function validateBasics(basics) {
  const errors = {};
  if (!basics.title.trim()) errors.title = 'Project title is required';
  else if (basics.title.trim().length < 3) errors.title = 'Project title must be at least 3 characters';
  if (!basics.client.trim()) errors.client = 'Client is required';
  if (!basics.issueIdPrefix.trim()) errors.issueIdPrefix = 'Issue ID prefix is required';
  else if (!/^[A-Za-z0-9-]+$/.test(basics.issueIdPrefix.trim()))
    errors.issueIdPrefix = 'Prefix may only contain letters, numbers and hyphens';
  return errors;
}

function validateAttributes(selections) {
  const errors = {};
  for (const category of ['hf', 'risk', 'action']) {
    if (selections[category].length === 0) errors[category] = 'Select at least one option.';
  }
  return errors;
}

/**
 * Three-step project wizard (left) with a live project preview and
 * confirmation flow (right). Used for both creating a project and editing
 * an existing one (mode="edit").
 * @param {{ attributeOptions: {hf: string[], risk: string[], action: string[]}, initialPackages: object[], mode?: 'create'|'edit', projectId?: string, initialBasics?: object, initialSelections?: object, initialSelectedPackageIds?: string[] }} props
 */
export function NewProjectWizard({
  attributeOptions,
  initialPackages,
  mode = 'create',
  projectId,
  initialBasics,
  initialSelections,
  initialSelectedPackageIds,
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const [step, setStep] = useState(1);
  const [basics, setBasics] = useState(
    initialBasics ?? { title: '', client: '', description: '', issueIdPrefix: '' }
  );
  const [selections, setSelections] = useState(
    initialSelections ?? { hf: [], risk: [], action: [] }
  );
  const [packages, setPackages] = useState(initialPackages);
  const [selectedPackageIds, setSelectedPackageIds] = useState(
    initialSelectedPackageIds ?? []
  );
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [creatingPackage, setCreatingPackage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const selectedPackages = useMemo(
    () => packages.filter((pkg) => selectedPackageIds.includes(String(pkg._id))),
    [packages, selectedPackageIds]
  );

  const validateStep = (target) => {
    if (target === 1) return validateBasics(basics);
    if (target === 2) return validateAttributes(selections);
    return {};
  };

  const goTo = (target) => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep(target);
  };

  const handleBasicsChange = (field, value) => {
    setBasics((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleToggleAttribute = (category, name) => {
    setSelections((prev) => {
      const current = prev[category];
      return {
        ...prev,
        [category]: current.includes(name)
          ? current.filter((item) => item !== name)
          : [...current, name],
      };
    });
    setErrors((prev) => ({ ...prev, [category]: undefined }));
  };

  const handleTogglePackage = (id) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setErrors((prev) => ({ ...prev, packages: undefined }));
  };

  const handleCreatePackage = async (packageId, description) => {
    setCreatingPackage(true);
    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, description }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return { ok: false, errors: data?.errors ?? {} };
      }

      const created = data.package;
      setPackages((prev) =>
        [...prev, created].sort((a, b) => a.packageId.localeCompare(b.packageId))
      );
      setSelectedPackageIds((prev) => [...prev, String(created._id)]);
      return { ok: true };
    } catch {
      return { ok: false, errors: { packageId: 'Network error. Please try again.' } };
    } finally {
      setCreatingPackage(false);
    }
  };

  const handleCreateProject = async () => {
    setFormError(null);

    const basicsErrors = validateBasics(basics);
    if (Object.keys(basicsErrors).length > 0) {
      setStep(1);
      setErrors(basicsErrors);
      setConfirmed(false);
      return;
    }

    const attributeErrors = validateAttributes(selections);
    if (Object.keys(attributeErrors).length > 0) {
      setStep(2);
      setErrors(attributeErrors);
      setConfirmed(false);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(isEdit ? `/api/projects/${projectId}` : '/api/projects', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...basics,
          hfAttributes: selections.hf,
          riskAttributes: selections.risk,
          actionAttributes: selections.action,
          packageIds: selectedPackageIds,
        }),
      });

      if (response.ok) {
        router.push(isEdit ? `/projects/${projectId}` : '/dashboard');
        router.refresh();
        return;
      }

      if (response.status === 404) {
        setFormError('This project no longer exists.');
        return;
      }

      if (response.status === 403) {
        setFormError('You do not have permission to edit this project.');
        return;
      }

      const data = await response.json().catch(() => null);
      if (response.status === 400 && data?.errors) {
        setStep(Number(data.step) || 1);
        setErrors(data.errors);
        setConfirmed(false);
      } else {
        setFormError(
          isEdit
            ? 'Something went wrong while saving the project. Please try again.'
            : 'Something went wrong while creating the project. Please try again.'
        );
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="shadow-enterprise [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle className="text-xl">
            {isEdit ? 'Edit project' : 'Create a new project'}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? 'Review and update the project basics, attributes and packages.'
              : 'Configure the project basics, attributes and packages in three steps.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="flex items-center gap-2">
            {STEPS.map(({ id, label }, index) => {
              const isActive = id === step;
              const isDone = id < step;
              return (
                <li key={id} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      isActive && 'border-primary bg-primary text-primary-foreground',
                      isDone && 'border-primary/50 bg-accent text-accent-foreground',
                      !isActive && !isDone && 'text-muted-foreground'
                    )}
                  >
                    {isDone ? '✓' : `0${id}`}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span className="bg-border h-px flex-1" aria-hidden="true" />
                  ) : null}
                </li>
              );
            })}
          </ol>

          {step === 1 ? (
            <WizardStepBasics values={basics} errors={errors} onChange={handleBasicsChange} />
          ) : null}
          {step === 2 ? (
            <WizardStepAttributes
              options={attributeOptions}
              selections={selections}
              errors={errors}
              onToggle={handleToggleAttribute}
            />
          ) : null}
          {step === 3 ? (
            <WizardStepPackages
              packages={packages}
              selectedIds={selectedPackageIds}
              errors={errors}
              creating={creatingPackage}
              onToggle={handleTogglePackage}
              onCreate={handleCreatePackage}
            />
          ) : null}

          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              onClick={() => goTo(step - 1)}
              disabled={step === 1 || submitting}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
            {step < STEPS.length ? (
              <Button onClick={() => goTo(step + 1)} disabled={submitting}>
                Next
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <p className="text-muted-foreground text-xs">
                Review the preview and confirm to create the project.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-6">
        <ProjectPreview
          mode={mode}
          basics={basics}
          selections={selections}
          selectedPackages={selectedPackages}
          confirmed={confirmed}
          onConfirmedChange={setConfirmed}
          onCreate={handleCreateProject}
          submitting={submitting}
          createError={formError}
        />
      </div>
    </div>
  );
}
