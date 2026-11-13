/**
 * Match a free-text name (an @mention or an assignee) to a project person.
 * Pure functions, so the rules can be tested without a database.
 *
 * A person can be written as first.last, firstlast, first_last, first-last,
 * their first name, their full email address or the part before the @ in it.
 * A text that fits more than one person matches nobody, so nobody is
 * notified by mistake.
 */

const clean = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/** Every spelling under which a person can be referred to. */
export function personKeys(person) {
  const keys = new Set();
  const first = clean(person.firstName);
  const last = clean(person.lastName);
  const email = clean(person.email);
  if (first && last) {
    keys.add(`${first}.${last}`);
    keys.add(`${first}${last}`);
    keys.add(`${first}_${last}`);
    keys.add(`${first}-${last}`);
  }
  if (first) keys.add(first);
  if (email) {
    keys.add(email);
    keys.add(email.split('@')[0]);
  }
  return keys;
}

/**
 * Find the one person a name refers to.
 * @param {string} text - as typed after @, or the assignee field
 * @param {{ userId: string, firstName?: string, lastName?: string, email?: string }[]} people
 * @returns {object | null} the matching person, or null when none or several match
 */
export function matchPerson(text, people) {
  const key = clean(text).replace(/\s+/g, '.');
  if (!key) return null;
  const matches = people.filter((person) => personKeys(person).has(key));
  return matches.length === 1 ? matches[0] : null;
}
