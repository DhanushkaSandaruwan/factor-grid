import {
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
  getAttributeOptionsTool,
  getPackagesTool,
} from './project-tools';
import {
  listIssuesTool,
  getIssueTool,
  createIssueTool,
  updateIssueTool,
} from './issue-tools';
import {
  listLinksTool,
  createLinkTool,
  updateLinkTool,
  deleteLinkTool,
} from './link-tools';
import { listMembersTool, inviteMemberTool } from './member-tools';
import { searchTool } from './search-tools';
import { listPackagesTool, createPackageTool } from './package-tools';
import { navigateToPageTool } from './navigation-tools';

/**
 * Central tool registry. Each tool is `{ name, description, parameters, handler }`.
 * The registry assembles all tools and provides lookup + execution.
 */

export const ALL_TOOLS = [
  // Projects
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
  getAttributeOptionsTool,
  getPackagesTool,
  // Issues
  listIssuesTool,
  getIssueTool,
  createIssueTool,
  updateIssueTool,
  // Links
  listLinksTool,
  createLinkTool,
  updateLinkTool,
  deleteLinkTool,
  // Members
  listMembersTool,
  inviteMemberTool,
  // Search
  searchTool,
  // Packages
  listPackagesTool,
  createPackageTool,
  // Navigation
  navigateToPageTool,
];

/**
 * Get the tool definitions to send to the AI provider.
 * @param {object[]} tools
 * @returns {Array<{type: string, function: {name: string, description: string, parameters: object}}>}
 */
export function toProviderTools(tools) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Get the tools that are enabled for the user, defaulting to all enabled.
 * @param {object} settings - The AI settings document (may have enabledTools map)
 * @returns {object[]}
 */
export function getEnabledTools(settings) {
  const enabledMap = settings?.enabledTools;
  if (!enabledMap || typeof enabledMap !== 'object') return ALL_TOOLS;
  return ALL_TOOLS.filter((tool) => enabledMap.get(tool.name) !== false);
}

/**
 * Execute a tool call by name.
 * @param {string} name
 * @param {Record<string, unknown>} args
 * @param {{userId: string}} ctx
 * @returns {Promise<{ok: boolean, tool: string, result?: object, navigate?: string}>}
 */
export async function executeToolCall(name, args, ctx) {
  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { ok: false, tool: name, result: { ok: false, error: `Unknown tool "${name}".` } };
  }

  try {
    const result = await tool.handler(args ?? {}, ctx);
    if (name === 'navigate_to_page' && result?.ok && result?.path) {
      return { ok: true, tool: name, result: { ok: true, navigated: true }, navigate: result.path };
    }
    return { ok: true, tool: name, result };
  } catch (error) {
    return {
      ok: false,
      tool: name,
      result: {
        ok: false,
        error: error instanceof Error ? error.message : 'Tool execution failed.',
      },
    };
  }
}
