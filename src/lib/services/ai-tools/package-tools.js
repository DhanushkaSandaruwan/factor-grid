import { getPackages, createPackage } from '@/lib/services/package-service';

/**
 * Package tools — list and create reusable analysis packages.
 */

export const listPackagesTool = {
  name: 'list_packages',
  description: 'List all available analysis packages.',
  parameters: { type: 'object', properties: {} },
  async handler() {
    const packages = await getPackages();
    return {
      ok: true,
      packages: packages.map((p) => ({
        id: String(p._id),
        packageId: p.packageId,
        description: p.description,
      })),
    };
  },
};

export const createPackageTool = {
  name: 'create_package',
  description: 'Create a new reusable analysis package with a unique ID and description.',
  parameters: {
    type: 'object',
    properties: {
      packageId: { type: 'string', description: 'Unique package ID, e.g. "HF-ANA-01".' },
      description: { type: 'string', description: 'Optional description.' },
    },
    required: ['packageId'],
  },
  /**
   * @param {{packageId: string, description?: string}} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const result = await createPackage(ctx.userId, {
      packageId: args.packageId,
      description: args.description ?? '',
    });
    if (!result?.ok) return { ok: false, errors: result?.errors ?? 'Failed to create package.' };
    return { ok: true, package: { ...result.package, _id: String(result.package._id) } };
  },
};
