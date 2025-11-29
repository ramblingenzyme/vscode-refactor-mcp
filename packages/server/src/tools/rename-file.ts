import { VSCodeCommand } from "@vscode-mcp/shared";
import { getVSCodeClient } from "../vscode-client.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod"

/**
 * Rename a file in VSCode
 */
async function renameFile(
  oldUri: string,
  newUri: string
): Promise<boolean> {
  const client = getVSCodeClient();

  const result = await client.sendRequest(VSCodeCommand.RENAME_FILE, {
    oldUri,
    newUri,
  });

  return result;
}

const INPUT_SCHEMA = z.object({
  oldUri: z.string().describe(
    "The current URI of the file to rename (e.g., 'file:///path/to/oldFile.ts')"
  ),
  newUri: z.string().describe(
    "The new URI for the file (e.g., 'file:///path/to/newFile.ts')"
  ),
});

export const name = "rename_file";

export const description = {
  description:
`Rename a file in VSCode and update all imports referencing it in the workspace.
Call with an object containing 'oldUri' and 'newUri' as absolute file URIs.`,
  inputSchema: INPUT_SCHEMA,
  examples: [
    {
      oldUri: "file:///home/user/project/foo.txt",
      newUri: "file:///home/user/project/bar.txt",
    },
  ],
  notes:
`Both URIs must be absolute and use the 'file://' scheme. The operation will fail if the target file already exists or the source file does not exist.
  
Before calling this tool, you may call 'get_update_imports_setting' to inspect the workspace value of 'typescript.updateImportsOnFileMove.enabled', and call 'set_update_imports_setting' with value 'always' to ensure imports are updated.
The server will also attempt to set the workspace value automatically, but calling the get/set tools gives you explicit control.
`,
};

export async function implementation(request: { oldUri: string; newUri: string; }): Promise<CallToolResult> {
    INPUT_SCHEMA.parse(request);
    const { oldUri, newUri } = request;

    try {
        const client = getVSCodeClient();
        let importsUpdated = false;

        // Ensure workspace setting is set to 'always' so imports are updated
        try {
            const current = await client.sendRequest('getSetting', {
                key: 'typescript.updateImportsOnFileMove.enabled',
                scope: 'workspace',
            });

            importsUpdated = current?.value === 'always';

            if (current?.value !== 'always') {
                await client.sendRequest('setSetting', {
                    key: 'typescript.updateImportsOnFileMove.enabled',
                    value: 'alweys',
                    scope: 'workspace',
                });
            }
        } catch (settingError) {
            // If we fail to read/set the setting, proceed but warn the caller
            console.error('Warning: could not ensure updateImports setting:', settingError);
        }

        const result = await renameFile(oldUri, newUri);
        return {
            content: [
                {
                    type: "text",
                    text: `Renamed file from ${oldUri} to ${newUri}. Result: ${result}. Imports updated: ${importsUpdated}`,
                },
            ],
        };
    } catch (error: any) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error renaming file: ${error.message}. Imports updated: false}`,
                },
            ],
            isError: true,
        };
    }
}