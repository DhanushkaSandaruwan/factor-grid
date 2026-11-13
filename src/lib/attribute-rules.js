/**
 * Shared rules for project attributes. Pure functions only, so the same
 * checks run in the wizard (client) and in the project services (server).
 */

/** Built-in HF attributes. Their values are derived from each issue's content. */
export const DERIVED_HF_ATTRIBUTES = ['Recommendation', 'Requirement', 'Links', 'Evidence'];

export const CUSTOM_ATTRIBUTE_MAX_LENGTH = 60;
export const MAX_CUSTOM_ATTRIBUTES_PER_GROUP = 15;

/** Letters, digits, spaces and common punctuation used in engineering names. */
const ALLOWED_NAME = /^[\p{L}\p{N}][\p{L}\p{N} ._\-/()&,+#:%]*$/u;

const lower = (value) => String(value).trim().toLowerCase();

/** True when `name` is one of the built-in HF attributes (case-insensitive). */
export function isDerivedHfAttribute(name) {
  return DERIVED_HF_ATTRIBUTES.some((derived) => lower(derived) === lower(name));
}

/** Trim and collapse internal whitespace so "  Human   Error " becomes "Human Error". */
export function normalizeAttributeName(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Check one custom attribute name.
 * @param {string} name - already normalized
 * @returns {string|null} error message, or null when the name is valid
 */
export function validateCustomAttributeName(name) {
  if (!name) return 'Attribute name is required.';
  if (name.length > CUSTOM_ATTRIBUTE_MAX_LENGTH) {
    return `Attribute name must be ${CUSTOM_ATTRIBUTE_MAX_LENGTH} characters or fewer.`;
  }
  if (!ALLOWED_NAME.test(name)) {
    return 'Use letters, numbers, spaces and . _ - / ( ) & , + # : % only.';
  }
  return null;
}
