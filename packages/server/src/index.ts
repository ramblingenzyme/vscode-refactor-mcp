import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getVSCodeClient } from "./vscode-client.js";
import { registerTool } from "./registry/tool-registry.js";
import { registerResource } from "./registry/resource-registry.js";
import * as tools from "./tools/index.js";
import * as resources from "./resources/index.js";

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

// Register tools using the registry helper
registerTool(server, tools.renameFile);
registerTool(server, tools.setUpdateImportsSetting);

// Register resources using the registry helper
registerResource(server, resources.updateImportsEnabled);

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
