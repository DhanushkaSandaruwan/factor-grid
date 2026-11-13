import { auth } from '@clerk/nextjs/server';
import { isDeploymentAdmin } from '@/lib/services/admin-service';
import { listAllOptions } from '@/lib/services/attribute-admin-service';
import { AttributeOptionsAdmin } from '@/components/features/admin/attribute-options-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Attribute lists',
};

/** Deployment-wide attribute lists offered by the project wizard. Administrators only. */
export default async function AttributeListsPage() {
  const { userId } = await auth();
  const admin = await isDeploymentAdmin(userId);

  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl p-6">
        {admin ? (
          <AttributeOptionsAdmin initialOptions={await listAllOptions()} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Attribute lists</CardTitle>
              <CardDescription>
                Only the administrator of this installation can change the shared attribute lists.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Ask your administrator to add or change attribute options.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
