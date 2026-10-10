import { getAttributeOptions } from '@/lib/services/attribute-option-service';
import { getPackages } from '@/lib/services/package-service';
import { BackButton } from '@/components/features/projects/back-button';
import { NewProjectWizard } from '@/components/features/projects/new-project-wizard';

export const metadata = {
  title: 'New Project',
};

/** New project page — wizard on the left, live preview on the right. */
export default async function NewProjectPage() {
  const [attributeOptions, packages] = await Promise.all([
    getAttributeOptions(),
    getPackages(),
  ]);

  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl p-6">
        <div className="mb-4">
          <BackButton fallbackHref="/dashboard" />
        </div>
        <NewProjectWizard attributeOptions={attributeOptions} initialPackages={packages} />
      </div>
    </div>
  );
}
