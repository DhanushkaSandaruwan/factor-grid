'use client';

import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Wizard step 03 — packages. Two ways to end up with a selection:
 * create new packages inline (persisted immediately) and/or pick
 * existing packages for this project.
 * @param {{ packages: object[], selectedIds: string[], errors: Record<string, string>, creating: boolean, onToggle: (id: string) => void, onCreate: (packageId: string, description: string) => Promise<{ok: boolean, errors?: Record<string, string>}> }} props
 */
export function WizardStepPackages({ packages, selectedIds, errors, creating, onToggle, onCreate }) {
  const [packageId, setPackageId] = useState('');
  const [description, setDescription] = useState('');
  const [createErrors, setCreateErrors] = useState({});

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreateErrors({});
    const result = await onCreate(packageId, description);
    if (result.ok) {
      setPackageId('');
      setDescription('');
    } else {
      setCreateErrors(result.errors ?? {});
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-center gap-2">
          <PackagePlus className="text-primary size-4" />
          <p className="text-sm font-medium">Create a new package</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="new-package-id">Package ID</Label>
            <Input
              id="new-package-id"
              placeholder="e.g. PKG-CABIN"
              value={packageId}
              onChange={(event) => {
                setPackageId(event.target.value);
                setCreateErrors((prev) => ({ ...prev, packageId: undefined }));
              }}
              aria-invalid={Boolean(createErrors.packageId)}
            />
            {createErrors.packageId ? (
              <p className="text-destructive text-xs">{createErrors.packageId}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-package-description">Description</Label>
            <Textarea
              id="new-package-description"
              rows={2}
              placeholder="What this package covers…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={Boolean(createErrors.description)}
              className="resize-none"
            />
            {createErrors.description ? (
              <p className="text-destructive text-xs">{createErrors.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={creating || !packageId.trim()}>
            {creating ? 'Saving…' : 'Add package'}
          </Button>
        </div>
      </form>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium">Select packages for this project</legend>
        {packages.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No packages yet — create one above, it will be selected automatically.
          </p>
        ) : (
          <ul className="space-y-2">
            {packages.map((pkg) => {
              const id = String(pkg._id);
              const checked = selectedIds.includes(id);
              return (
                <li key={id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      checked ? 'border-primary/60 bg-accent/50' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(id)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="text-sm font-medium">{pkg.packageId}</span>
                      {pkg.description ? (
                        <span className="text-muted-foreground block text-xs">{pkg.description}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {errors.packages ? <p className="text-destructive text-xs">{errors.packages}</p> : null}
        <p className="text-muted-foreground text-xs">
          Optional — pick as many packages as this project needs.
        </p>
      </fieldset>
    </div>
  );
}
