/**
 * Tool registry - exports all available tools
 */

import * as vscode from "vscode";
import { Tool } from "@vscode-mcp/shared";
import { renameFileTool } from "./rename-file";
import { renameSymbolTool } from "./rename-symbol";
import { getSettingTool, setSettingTool } from "./settings";
import {
  registerToolWithVSCode,
  isRegisterToolAvailable,
} from "../integrations/register-tool";

/**
 * All available tools that can be registered with both
 * registerTool and HTTP MCP server
 */
export const allTools: Tool[] = [
  renameFileTool,
  renameSymbolTool,
  getSettingTool,
  setSettingTool,
];

/**
 * Register all tools with VSCode using the registerTool API
 *
 * @param context - Extension context for managing disposables
 * @returns Object containing registration results
 */
export function registerAllTools(context: vscode.ExtensionContext): {
  registered: string[];
  failed: Array<{ name: string; error: string }>;
  skipped: boolean;
} {
  const registered: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  // Check if registerTool is available
  if (!isRegisterToolAvailable()) {
    return {
      registered: [],
      failed: [],
      skipped: true,
    };
  }

  // Register each tool, handling errors gracefully
  for (const tool of allTools) {
    try {
      registerToolWithVSCode(context, tool);
      registered.push(tool.name);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      failed.push({
        name: tool.name,
        error: errorMessage,
      });

      // Log the error but continue with other tools
      console.error(`Failed to register tool "${tool.name}":`, error);
    }
  }

  return {
    registered,
    failed,
    skipped: false,
  };
}

// Re-export individual tools for convenience
export { renameFileTool } from "./rename-file";
export { renameSymbolTool } from "./rename-symbol";
export { getSettingTool, setSettingTool } from "./settings";
