/**
 * Rename file tool - renames a file and updates all imports
 */

import { z } from 'zod';
import { Tool } from '@vscode-mcp/shared';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as vscode from 'vscode';

const inputSchema = z.object({
  oldUri: z.string().describe('The current file URI'),
  newUri: z.string().describe('The new file URI'),
});

export const renameFileTool: Tool = {
  name: 'rename_file',
  
  description: {
    description: 'Rename a file and update all imports',
    inputSchema,
    examples: [{
      oldUri: 'file:///workspace/old.ts',
      newUri: 'file:///workspace/new.ts',
    }],
    notes: 'Automatically configures TypeScript to update imports when moving files',
  },
  
  async implementation(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = inputSchema.parse(args);
      
      // Parse URIs
      let oldUriObj: vscode.Uri;
      let newUriObj: vscode.Uri;
      
      try {
        oldUriObj = vscode.Uri.parse(input.oldUri);
        newUriObj = vscode.Uri.parse(input.newUri);
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Invalid URI format: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
      
      // Ensure TypeScript import settings are configured
      const config = vscode.workspace.getConfiguration('typescript');
      const currentValue = config.get<string>('updateImportsOnFileMove.enabled');
      
      let importsWillBeUpdated = currentValue === 'always';
      
      if (currentValue !== 'always') {
        try {
          await config.update('updateImportsOnFileMove.enabled', 'always', false);
          importsWillBeUpdated = true;
        } catch (error) {
          // Log but continue - the rename might still work
          console.warn('Failed to update TypeScript import settings:', error);
        }
      }
      
      // Perform the rename
      const edit = new vscode.WorkspaceEdit();
      edit.renameFile(oldUriObj, newUriObj);
      
      const success = await vscode.workspace.applyEdit(edit);
      
      if (!success) {
        return {
          content: [{
            type: 'text',
            text: `Failed to rename file from ${input.oldUri} to ${input.newUri}. The workspace edit was not applied.`,
          }],
          isError: true,
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `Successfully renamed file from ${input.oldUri} to ${input.newUri}. Imports updated: ${importsWillBeUpdated}`,
        }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [{
            type: 'text',
            text: `Validation error: ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
          }],
          isError: true,
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  },
};
