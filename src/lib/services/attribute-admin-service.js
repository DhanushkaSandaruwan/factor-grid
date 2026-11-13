import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AttributeOption } from '@/models/attribute-option';
import { ATTRIBUTE_CATEGORIES } from './attribute-option-service';
import { normalizeAttributeName, validateCustomAttributeName } from '@/lib/attribute-rules';

const serialize = (doc) => ({
  _id: String(doc._id),
  category: doc.category,
  name: doc.name,
  order: doc.order ?? 0,
  active: doc.active !== false,
  valueCategory: doc.valueCategory ?? null,
});

/** Every option, including inactive ones, for the administration screen. */
export async function listAllOptions() {
  await connectToDatabase();
  const docs = await AttributeOption.find().sort({ category: 1, order: 1, name: 1 }).lean();
  return docs.map(serialize);
}

/** Check a name is usable and not already taken in its category (case-insensitive). */
async function validateName(category, rawName, exceptId) {
  const name = normalizeAttributeName(rawName);
  const problem = validateCustomAttributeName(name);
  if (problem) return { error: problem };
  const clash = await AttributeOption.findOne({
    category,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  }).lean();
  if (clash) return { error: 'An option with this name already exists in this list.' };
  return { name };
}

/**
 * Add an option to one of the lists the project wizard offers.
 * @param {{ category: string, name: string, valueCategory?: string|null }} input
 */
export async function createOption({ category, name, valueCategory }) {
  if (!ATTRIBUTE_CATEGORIES.includes(category)) {
    return { ok: false, errors: { category: 'Choose a list.' } };
  }
  await connectToDatabase();
  const checked = await validateName(category, name);
  if (checked.error) return { ok: false, errors: { name: checked.error } };

  const last = await AttributeOption.findOne({ category }).sort({ order: -1 }).lean();
  const doc = await AttributeOption.create({
    category,
    name: checked.name,
    order: (last?.order ?? -1) + 1,
    active: true,
    valueCategory: category === 'action' && valueCategory ? valueCategory : null,
  });
  return { ok: true, option: serialize(doc.toObject()) };
}

/**
 * Rename, reorder, activate/deactivate or re-point an option. Existing projects
 * keep the names they were created with; only the wizard offers the new ones.
 * @param {string} id
 * @param {{ name?: string, order?: number, active?: boolean }} changes
 */
export async function updateOption(id, changes) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectToDatabase();
  const doc = await AttributeOption.findById(id);
  if (!doc) return null;

  const errors = {};
  if (changes.name !== undefined) {
    const checked = await validateName(doc.category, changes.name, doc._id);
    if (checked.error) errors.name = checked.error;
    else doc.name = checked.name;
  }
  if (changes.order !== undefined) {
    const order = Number(changes.order);
    if (!Number.isInteger(order) || order < 0 || order > 9999)
      errors.order = 'Enter a position from 0 to 9999.';
    else doc.order = order;
  }
  if (changes.active !== undefined) doc.active = changes.active === true;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  await doc.save();
  return { ok: true, option: serialize(doc.toObject()) };
}

/**
 * Add a preset's names to the administrator's lists. Names already offered are
 * skipped, so running it again is harmless.
 * @param {{ hf: string[], risk: string[], action: string[] }} preset
 * @returns {Promise<{ added: number }>}
 */
export async function addPresetOptions(preset) {
  await connectToDatabase();
  let added = 0;
  for (const category of ['hf', 'risk', 'action']) {
    const existing = new Set(
      (await AttributeOption.find({ category }).lean()).map((doc) => doc.name.toLowerCase()),
    );
    const last = await AttributeOption.findOne({ category }).sort({ order: -1 }).lean();
    let order = (last?.order ?? -1) + 1;
    for (const name of preset[category] ?? []) {
      const key = normalizeAttributeName(name).toLowerCase();
      if (!key || existing.has(key)) continue;
      existing.add(key);
      await AttributeOption.create({
        category,
        name: normalizeAttributeName(name),
        order: order++,
        active: true,
      });
      added += 1;
    }
  }
  return { added };
}
