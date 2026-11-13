/**
 * Pure workflow rules for issues. Kept free of database code so they can be
 * tested directly and reused by both the API and the UI.
 */

export const ISSUE_STATUSES = ['open', 'closed', 'transferred'];

/** Minimum length of the typed name used to sign off a closure. */
export const MIN_SIGNATURE_LENGTH = 3;

/**
 * An issue may be closed only when it has at least one requirement and every
 * requirement is closed. Returns an error message, or null when closure is allowed.
 * @param {{ recommendations?: { requirements?: { status: string }[] }[] }} issue
 */
export function closureBlocker(issue) {
  const requirements = (issue.recommendations ?? []).flatMap((rec) => rec.requirements ?? []);
  if (requirements.length === 0) {
    return 'Add at least one requirement before closing this issue.';
  }
  const open = requirements.filter((req) => req.status !== 'closed').length;
  if (open > 0) {
    return `${open} requirement${open === 1 ? ' is' : 's are'} still open. Close every requirement first.`;
  }
  return null;
}

/**
 * Validate the typed name used to sign off a closure.
 * @param {unknown} value
 * @returns {{ name: string, error: string | null }}
 */
export function validateSignature(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < MIN_SIGNATURE_LENGTH) {
    return { name, error: `Type your full name (at least ${MIN_SIGNATURE_LENGTH} characters) to sign off.` };
  }
  return { name, error: null };
}
