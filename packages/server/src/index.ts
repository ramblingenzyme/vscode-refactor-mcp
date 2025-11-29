import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getVSCodeClient } from "./vscode-client.js";
import * as renameFileTool from "./tools/rename-file.js";
import z from "zod";

const server = new McpServer(
    {
        name: "vscode-mcp-server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.registerTool(renameFileTool.name, {
    inputSchema: renameFileTool.description.inputSchema,
}, (args) => {
    return renameFileTool.implementation(args);
});

server.registerResource(
    "update-imports-enabled",
    new ResourceTemplate("settings://update-imports", { list: undefined }),
    {
        description: "Workspace setting for 'typescript.updateImportsOnFileMove.enabled'",
    },
    async (url) => {
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
)

server.registerTool(
    "set_update_imports_setting",
    {
        description: "Set the workspace setting 'typescript.updateImportsOnFileMove.enabled' to a specified value ('always', 'prompt', or 'never').",
        inputSchema: z.enum(["always", "prompt", "never"]).describe("The value to set for the setting ('always', 'prompt', or 'never')."),
    },
    async (value: "always" | "prompt" | "never") => {
        try {
            const client = getVSCodeClient();
            const res = await client.sendRequest('setSetting', {
                key: 'typescript.updateImportsOnFileMove.enabled',
                value,
                scope: 'workspace',
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: `Set workspace setting to ${value}: ${JSON.stringify(res)}`,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error setting value: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
)

/**
 * Main entry point
 */
async function main() {
    // Connect to VSCode extension
    const client = getVSCodeClient();
    try {
        await client.connect();
        console.error("Connected to VSCode extension");
    } catch (error) {
        console.error("Failed to connect to VSCode extension:", error);
        console.error("Make sure the VSCode extension is running");
        process.exit(1);
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server started");
}

// Handle shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    const client = getVSCodeClient();
    client.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down...');
    const client = getVSCodeClient();
    client.close();
    process.exit(0);
});

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
