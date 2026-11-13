/** Pure rules for issue comments. */

export const COMMENT_MAX_LENGTH = 2000;

/**
 * Names mentioned with @ in a comment, e.g. "@amanda.perera" → "amanda.perera".
 * A mention is one word (letters, digits and . _ -) after the @.
 * @param {string} text
 * @returns {string[]} unique names in order of appearance
 */
export function extractMentions(text) {
  const found = [];
  const pattern = /@([\p{L}][\p{L}\p{N}._-]*)/gu;
  for (const match of String(text ?? '').matchAll(pattern)) {
    const name = match[1].trim();
    if (!found.includes(name)) found.push(name);
  }
  return found;
}

/**
 * Validate a comment body.
 * @param {unknown} raw
 * @returns {{ body: string, error: string | null }}
 */
export function validateComment(raw) {
  const body = String(raw ?? '').trim();
  if (!body) return { body, error: 'Write a comment before posting.' };
  if (body.length > COMMENT_MAX_LENGTH) {
    return { body, error: `Comments can be ${COMMENT_MAX_LENGTH} characters or fewer.` };
  }
  return { body, error: null };
}
