/**
 * Pure helpers for AI suggestions on an issue. The model only drafts text or
 * labels; nothing is saved until a person accepts a suggestion.
 */

export const SUGGESTION_KINDS = ['recommendations', 'classify'];

/** Pull the first JSON object out of a model reply (models sometimes add prose or code fences). */
export function parseModelJson(text) {
  const match = String(text ?? '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const clip = (value, max) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

/**
 * Keep only well-formed recommendation suggestions, capped in number and size.
 * @param {unknown} parsed
 */
export function normaliseRecommendations(parsed) {
  const list = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  return list
    .map((item) => ({
      text: clip(item?.text, 1000),
      requirements: (Array.isArray(item?.requirements) ? item.requirements : [])
        .map((r) => clip(r, 500))
        .filter(Boolean)
        .slice(0, 5),
    }))
    .filter((item) => item.text)
    .slice(0, 3);
}

/**
 * Keep the suggested issue type only when it is a known value, and only the
 * HF attribute names that exist in the project.
 * @param {unknown} parsed
 * @param {string[]} allowedHfNames
 */
export function normaliseClassification(parsed, allowedHfNames) {
  const type = String(parsed?.issueType ?? '').toLowerCase();
  // Map each suggestion to the project's own spelling; drop anything the project does not have.
  const canonical = new Map(allowedHfNames.map((n) => [n.toLowerCase(), n]));
  const names = (Array.isArray(parsed?.hfAttributes) ? parsed.hfAttributes : [])
    .map((n) => canonical.get(String(n).trim().toLowerCase()))
    .filter(Boolean);
  return {
    issueType: ['usability', 'safety', 'both'].includes(type) ? type : null,
    reasoning: clip(parsed?.reasoning, 600),
    hfAttributes: [...new Set(names)],
  };
}
