import { connectToDatabase } from '@/lib/db';
import { AttributeOption } from '@/models/attribute-option';

export const ATTRIBUTE_CATEGORIES = ['hf', 'risk', 'action', 'action_type'];

/** Categories the project wizard lets users pick from. */
export const WIZARD_CATEGORIES = ['hf', 'risk', 'action'];

// Initial seed data, inserted once on first use. After seeding, the
// database is the single source of truth — admins edit it directly.
const DEFAULT_OPTIONS = {
  hf: ['Recommendation', 'Requirement', 'Links', 'Evidence'],
  risk: ['Usability', 'Safety', 'Consequences', 'Likelihood', 'Risk rating'],
  action: ['SSRD ID', 'Source', 'Action Owner', 'Action Type', 'Artifact Type'],
  action_type: [
    'Architecture',
    'Civil',
    'Safety Check Requirement',
    'Design case out evidence requirement',
    'duplicate HFI to be struck through',
  ],
};

async function seedDefaultOptions() {
  const count = await AttributeOption.estimatedDocumentCount();
  if (count > 0) return;

  const docs = Object.entries(DEFAULT_OPTIONS).flatMap(([category, names]) =>
    names.map((name, order) => ({ category, name, order, active: true }))
  );

  // The "Action Type" action attribute draws its dropdown values from the
  // action_type category.
  const actionType = docs.find((doc) => doc.category === 'action' && doc.name === 'Action Type');
  if (actionType) actionType.valueCategory = 'action_type';

  try {
    await AttributeOption.insertMany(docs, { ordered: false });
  } catch (error) {
    // Ignore duplicate-key races between concurrent first requests.
    const isDuplicateKey = error?.code === 11000 || Array.isArray(error?.writeErrors);
    if (!isDuplicateKey) throw error;
  }
}

/**
 * Load active attribute options grouped by wizard category, plus a mapping
 * of action attribute names to their dropdown value options (when the
 * attribute's valueCategory points at another category).
 * @returns {Promise<{hf: string[], risk: string[], action: string[], action_type: string[], actionValueOptions: Record<string, string[]>}>}
 */
export async function getAttributeOptions() {
  await connectToDatabase();
  await seedDefaultOptions();

  const docs = await AttributeOption.find({ active: true })
    .sort({ category: 1, order: 1, name: 1 })
    .lean();

  const grouped = { hf: [], risk: [], action: [], action_type: [] };
  for (const doc of docs) {
    grouped[doc.category]?.push(doc.name);
  }

  const actionValueOptions = {};
  for (const doc of docs) {
    if (doc.category === 'action' && doc.valueCategory) {
      actionValueOptions[doc.name] = grouped[doc.valueCategory] ?? [];
    }
  }

  return { ...grouped, actionValueOptions };
}

/**
 * Validate a wizard attribute selection against the database.
 * @param {{hf?: string[], risk?: string[], action?: string[]}} selections
 * @returns {Promise<Record<string, string>>} errors keyed by category
 */
export async function validateAttributeSelections(selections) {
  await connectToDatabase();
  const errors = {};

  for (const category of WIZARD_CATEGORIES) {
    const names = [...new Set(selections[category] ?? [])];
    if (names.length === 0) {
      errors[category] = 'Select at least one option.';
      continue;
    }
    const found = await AttributeOption.countDocuments({
      category,
      name: { $in: names },
      active: true,
    });
    if (found !== names.length) {
      errors[category] = 'One or more selected options are no longer available.';
    }
  }

  return errors;
}
