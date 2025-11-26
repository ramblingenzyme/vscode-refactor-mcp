import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import WebSocket from "ws";

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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "rename_file") {
        const { oldUri, newUri } = request.params.arguments as {
            oldUri: string;
            newUri: string;
        };

        try {
            const result = await callVsCodeRename(oldUri, newUri);
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

async function callVsCodeRename(oldUri: string, newUri: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket("ws://localhost:3000");

        ws.on("open", () => {
            const command = {
                command: "renameFile",
                arguments: { oldUri, newUri },
                id: "1", // Simple ID for now
            };
            ws.send(JSON.stringify(command));
        });

        ws.on("message", (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.id === "1") {
                    if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.result);
                    }
                    ws.close();
                }
            } catch (e) {
                reject(e);
                ws.close();
            }
        });

        ws.on("error", (error) => {
            reject(error);
        });
    });
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
