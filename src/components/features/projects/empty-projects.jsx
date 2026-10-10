import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Empty-state prompt shown on the dashboard when the user has no projects. */
export function EmptyProjects() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md text-center shadow-enterprise [--card-spacing:--spacing(6)]">
        <CardHeader>
          <div className="bg-accent text-accent-foreground mx-auto flex size-12 items-center justify-center rounded-xl">
            <FolderPlus className="size-6" />
          </div>
          <CardTitle className="text-xl">No projects yet</CardTitle>
          <CardDescription>
            Create your first project to start tracking human factors issues, attributes and
            packages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/projects/new" className={buttonVariants({ className: 'w-full' })}>
            <FolderPlus data-icon="inline-start" />
            Create your first project
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
