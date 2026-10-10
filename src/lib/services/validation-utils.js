/**
 * Reduce a Zod error to a flat { field: firstMessage } map, keeping the
 * first message per field so forms can render one error per input.
 * @param {import('zod').ZodError} error
 * @returns {Record<string, string>}
 */
export function collectFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ?? '_form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
