/**
 * Navigation tool — lets the AI route the user to a page. The handler
 * validates the path and returns it; the service emits a `navigate` SSE
 * event the client executes via router.push.
 */

const ALLOWED_PATHS = [
  /^\/dashboard$/,
  /^\/projects\/new$/,
  /^\/settings$/,
  /^\/projects\/[0-9a-f]{24}$/,
  /^\/projects\/[0-9a-f]{24}\/edit$/,
  /^\/projects\/[0-9a-f]{24}\/registry$/,
];

export const navigateToPageTool = {
  name: 'navigate_to_page',
  description:
    'Navigate the user to a page in the app. Use after creating or finding something ' +
    'so the user can see the result. Only navigate to pages the user can access.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description:
          'The page path, e.g. "/dashboard", "/projects/new", or "/projects/<24-char-id>".',
      },
    },
    required: ['path'],
  },
  /**
   * @param {{path: string}} args
   * @returns {{ok: boolean, path?: string, error?: string}}
   */
  handler(args) {
    const path = String(args?.path ?? '').trim();
    if (!path || !path.startsWith('/')) {
      return { ok: false, error: 'Path must start with "/".' };
    }
    if (!ALLOWED_PATHS.some((re) => re.test(path))) {
      return { ok: false, error: `Path "${path}" is not a valid destination.` };
    }
    return { ok: true, path };
  },
};
