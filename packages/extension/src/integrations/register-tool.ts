/**
 * registerTool integration - adapts tools for VSCode's native registerTool API
 */

import * as vscode from 'vscode';
import { Tool } from '@vscode-mcp/shared';
import { z } from 'zod';

/**
 * Register a tool with VSCode's native registerTool API
 * 
 * @param context - Extension context for managing disposables
 * @param tool - Tool to register
 * @throws Error if vscode.lm.registerTool is not available
 */
export function registerToolWithVSCode(
  context: vscode.ExtensionContext,
  tool: Tool
): void {
  // Check if registerTool is available
  if (!vscode.lm?.registerTool) {
    throw new Error('vscode.lm.registerTool is not available');
  }
  
  // Note: Zod schema can be converted to JSON Schema if needed in the future:
  // const jsonSchema = z.toJSONSchema(tool.description.inputSchema);
  // However, the tool implementation already handles validation internally,
  // so we don't need to pass the schema to registerTool.
  
  // Register tool with VSCode
  // registerTool expects (name, LanguageModelTool)
  const disposable = vscode.lm.registerTool(
    tool.name,
    {
      invoke: async (input: any, token: vscode.CancellationToken) => {
        // Check for cancellation before executing
        if (token.isCancellationRequested) {
          return {
            content: [{
              type: 'text',
              text: 'Operation cancelled',
            }],
            isError: true,
          };
        }
        
        // Tool implementation already handles validation and error handling
        // Just call it directly and return the result
        const result = await tool.implementation(input);
        
        // Check for cancellation after execution
        if (token.isCancellationRequested) {
          return {
            content: [{
              type: 'text',
              text: 'Operation cancelled',
            }],
            isError: true,
          };
        }
        
        return result;
      },
    }
  );
  
  // Add to context subscriptions for cleanup
  context.subscriptions.push(disposable);
}

/**
 * Check if VSCode's registerTool API is available
 * 
 * @returns true if registerTool is available, false otherwise
 */
export function isRegisterToolAvailable(): boolean {
  return typeof vscode.lm?.registerTool === 'function';
}
