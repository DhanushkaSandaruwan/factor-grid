import { connectToDatabase } from '@/lib/db';
import { AttributeOption } from '@/models/attribute-option';
import { DERIVED_HF_ATTRIBUTES, normalizeAttributeName } from '@/lib/attribute-rules';

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
    names.map((name, order) => ({ category, name, order, active: true })),
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

  const docs = await AttributeOption.find({ active: true }).sort({ category: 1, order: 1, name: 1 }).lean();

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
 * Check a wizard attribute selection against the lists the administrator
 * maintains. Each name must be an offered option (matched case-insensitively
 * and stored under its offered spelling). A name already on the project being
 * edited is also accepted, so an existing project can still be saved.
 *
 * @param {{hf?: string[], risk?: string[], action?: string[]}} selections
 * @param {{hf?: string[], risk?: string[], action?: string[]}} [existing] - attributes the project already has
 * @returns {Promise<{selections: {hf: string[], risk: string[], action: string[]}, errors: Record<string, string>}>}
 */
export async function resolveAttributeSelections(selections, existing = {}) {
  await connectToDatabase();
  const offered = await AttributeOption.find({
    category: { $in: WIZARD_CATEGORIES },
    active: true,
  }).lean();

  const resolved = { hf: [], risk: [], action: [] };
  const errors = {};

  for (const category of WIZARD_CATEGORIES) {
    const canonicalByKey = new Map(
      offered.filter((doc) => doc.category === category).map((doc) => [doc.name.toLowerCase(), doc.name]),
    );
    if (category === 'hf') {
      DERIVED_HF_ATTRIBUTES.forEach((name) => canonicalByKey.set(name.toLowerCase(), name));
    }
    const kept = new Map((existing[category] ?? []).map((name) => [name.toLowerCase(), name]));

    const seen = new Set();
    const names = [];
    const unknown = [];
    for (const raw of selections[category] ?? []) {
      const name = normalizeAttributeName(raw);
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      const canonical = canonicalByKey.get(key) ?? kept.get(key);
      if (canonical) names.push(canonical);
      else unknown.push(name);
    }

    if (unknown.length > 0) {
      errors[category] = `Not offered: ${unknown.join(', ')}. Choose from the list.`;
    } else if (names.length === 0) {
      errors[category] = 'Select at least one option.';
    }
    resolved[category] = names;
  }

  return { selections: resolved, errors };
}
