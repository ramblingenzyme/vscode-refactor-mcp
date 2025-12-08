/**
 * Rename symbol tool - renames a symbol and updates all references
 */

import { z } from 'zod';
import { Tool } from '@vscode-mcp/shared';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as vscode from 'vscode';

const inputSchema = z.object({
  fileUri: z.string().describe('The file URI containing the symbol'),
  originalName: z.string().describe('The current name of the symbol'),
  newName: z.string().describe('The new name for the symbol'),
});

export const renameSymbolTool: Tool = {
  name: 'rename_symbol',
  
  description: {
    description: 'Rename a symbol (function, class, variable) and update all references',
    inputSchema,
    examples: [{
      fileUri: 'file:///workspace/src/utils.ts',
      originalName: 'oldFunctionName',
      newName: 'newFunctionName',
    }],
    notes: 'Locates the symbol in the specified file and renames all references across the workspace',
  },
  
  async implementation(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = inputSchema.parse(args);
      
      // Parse URI
      let fileUri: vscode.Uri;
      
      try {
        fileUri = vscode.Uri.parse(input.fileUri);
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Invalid URI format: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
      
      // Open the document
      let document: vscode.TextDocument;
      try {
        document = await vscode.workspace.openTextDocument(fileUri);
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to open document at ${input.fileUri}: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
      
      // Find the symbol in the document
      const text = document.getText();
      const symbolIndex = text.indexOf(input.originalName);
      
      if (symbolIndex === -1) {
        return {
          content: [{
            type: 'text',
            text: `Symbol "${input.originalName}" not found in ${input.fileUri}`,
          }],
          isError: true,
        };
      }
      
      // Create position for the symbol
      const position = document.positionAt(symbolIndex);
      
      // Execute rename command
      const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
        'vscode.executeDocumentRenameProvider',
        fileUri,
        position,
        input.newName
      );
      
      if (!workspaceEdit) {
        return {
          content: [{
            type: 'text',
            text: `Failed to generate rename edits for symbol "${input.originalName}" at ${input.fileUri}. The symbol may not be renameable at this location.`,
          }],
          isError: true,
        };
      }
      
      // Apply the workspace edit
      const success = await vscode.workspace.applyEdit(workspaceEdit);
      
      if (!success) {
        return {
          content: [{
            type: 'text',
            text: `Failed to apply rename edits for symbol "${input.originalName}". The workspace edit was not applied.`,
          }],
          isError: true,
        };
      }
      
      // Count the number of changes
      let changeCount = 0;
      workspaceEdit.entries().forEach(([uri, edits]) => {
        changeCount += edits.length;
      });
      
      return {
        content: [{
          type: 'text',
          text: `Successfully renamed symbol "${input.originalName}" to "${input.newName}". Updated ${changeCount} reference(s) across ${workspaceEdit.size} file(s).`,
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
