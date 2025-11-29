import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { getVSCodeClient } from "../vscode-client.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Resource identifier
 */
export const name = "update-imports-enabled";

/**
 * Resource template
 */
export const template = new ResourceTemplate("settings://update-imports", { list: undefined });

/**
 * Resource metadata
 */
export const metadata = {
    description: "Workspace setting for 'typescript.updateImportsOnFileMove.enabled'",
};

/**
 * Resource handler
 * 
 * Retrieves the current workspace setting for 'typescript.updateImportsOnFileMove.enabled'
 * and returns it as a text resource.
 */
export async function handler(url: URL): Promise<ReadResourceResult> {
    try {
        const client = getVSCodeClient();
        const res = await client.sendRequest('getSetting', {
            key: 'typescript.updateImportsOnFileMove.enabled',
            scope: 'workspace',
        });

        return {
            contents: [
                {
                    uri: url.href,
                    text: `Current workspace setting 'typescript.updateImportsOnFileMove.enabled': ${JSON.stringify(res?.value)}`,
                    mimeType: "text/plain"
                },
            ],
        };
    } catch (error: any) {
        return {
            contents: [
                {
                    uri: url.href,
                    text: `Error getting setting: ${error.message}`,
                    mimeType: "text/plain"
                },
            ],
            _meta: { isError: true }
        };
    }
}
