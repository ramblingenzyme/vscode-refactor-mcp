import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getVSCodeClient } from "./vscode-client.js";
import * as renameFileTool from "./tools/rename-file.js";

const server = new Server(
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

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "rename_file",
                description: "Rename a file in VSCode",
                inputSchema: {
                    type: "object",
                    properties: {
                        oldUri: {
                            type: "string",
                            description: "The current URI of the file",
                        },
                        newUri: {
                            type: "string",
                            description: "The new URI of the file",
                        },
                    },
                    required: ["oldUri", "newUri"],
                },
            },
        ],
    };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "rename_file") {
        const { oldUri, newUri } = request.params.arguments as {
            oldUri: string;
            newUri: string;
        };

        try {
            const result = await renameFileTool.renameFile(oldUri, newUri);
            return {
                content: [
                    {
                        type: "text",
                        text: `Renamed file from ${oldUri} to ${newUri}. Result: ${result}`,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error renaming file: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error("Tool not found");
});

/**
 * Main entry point
 */
async function main() {
    // Connect to VSCode extension
    const client = getVSCodeClient();
    try {
        await client.connect();
        console.log("Connected to VSCode extension WebSocket server");
    } catch (error) {
        console.error("Failed to connect to VSCode extension:", error);
        console.error("Make sure the VSCode extension is running");
        process.exit(1);
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCP server started");
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
