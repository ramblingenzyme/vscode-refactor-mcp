import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Tool } from "@vscode-mcp/shared";
import { randomUUID } from "crypto";
import type { Server as HttpServer } from "http";
import type { Express, Request, Response } from "express";

interface McpSession {
    transport: StreamableHTTPServerTransport;
    server: McpServer;
}

class SessionManager {
    private transports = new Map<string, StreamableHTTPServerTransport>();

    constructor(private mcpServer: McpServer) { }

    getSession(sessionId?: string) {
        if (sessionId && this.transports.has(sessionId)) {
            return this.transports.get(sessionId) as StreamableHTTPServerTransport;
        }

        return this.createSession();
    }

    private createSession() {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessionclosed: (closedSessionId) => {
                this.transports.delete(closedSessionId);
            },
            onsessioninitialized: (sessionId) => {
                this.transports.set(sessionId, transport);
            },
        });

        this.mcpServer.connect(transport);

        return transport;
    }
}

// Helper to check if request is initialize
const isInitializeRequest = (body: unknown): boolean => {
    return (
        typeof body === "object" &&
        body !== null &&
        "method" in body &&
        (body as { method: string }).method === "initialize"
    );
};

export class HttpMcpServer {
    private sessions = new Map<string, McpSession>();
    private app?: Express;
    private httpServer?: HttpServer;
    private tools: Tool[] = [];
    private configuredPort: number;
    private actualPort = 0;
    private isRunning = false;
    private sessionManager: SessionManager;

    constructor(port: number) {
        this.configuredPort = port;
        this.sessionManager = new SessionManager(this.createMcpServer());
    }

    async start(tools: Tool[]): Promise<number> {
        if (this.httpServer) {
            return this.actualPort;
        }

        this.tools = tools;

        try {
            this.app = createMcpExpressApp({ host: "localhost" });

            this.app.route("/mcp").all(async (req, res) => {
                const sessionId = req.headers["mcp-session-id"] as string | undefined;
                if (!sessionId && !isInitializeRequest(req.body)) {
                    return this.sendError(res, 400, "Bad Request: No valid session ID");
                }

                try {
                    const transport = this.sessionManager.getSession(sessionId);
                    await transport.handleRequest(req, res, req.body);
                } catch (e) {
                    console.error(e);
                    this.sendError(
                        res,
                        500,
                        e instanceof Error ? e.message : "Unknown error",
                    );
                }
            });

            await new Promise<void>((resolve, reject) => {
                this.httpServer = this.app!.listen(
                    this.configuredPort,
                    "localhost",
                    () => {
                        const addr = this.httpServer!.address();
                        this.actualPort =
                            typeof addr === "object" && addr !== null
                                ? addr.port
                                : this.configuredPort;
                        this.isRunning = true;
                        resolve();
                    },
                );

                this.httpServer!.on("error", (error: NodeJS.ErrnoException) => {
                    const message =
                        error.code === "EADDRINUSE"
                            ? `Port ${this.configuredPort} is already in use. Please choose a different port or use port 0 for automatic assignment.`
                            : error.message;
                    reject(new Error(message));
                });
            });

            return this.actualPort;
        } catch (error) {
            await this.cleanup();
            throw error;
        }
    }

    private createMcpServer(): McpServer {
        const mcpServer = new McpServer(
            { name: "vscode-refactoring-tools", version: "1.0.0" },
            { capabilities: { tools: {} } },
        );

        for (const tool of this.tools) {
            mcpServer.registerTool(
                tool.name,
                {
                    description: tool.description.description,
                    inputSchema: tool.description.inputSchema,
                },
                async (args: any) => await tool.implementation(args),
            );
        }

        return mcpServer;
    }

    private sendError(res: Response, status: number, message: string): void {
        res.status(status).json({
            jsonrpc: "2.0",
            error: { code: -32000, message },
            id: null,
        });
    }

    getPort(): number {
        return this.actualPort;
    }

    isServerRunning(): boolean {
        return this.isRunning;
    }

    getServerUrl(): string | null {
        return this.isRunning && this.actualPort > 0
            ? `http://localhost:${this.actualPort}`
            : null;
    }

    async stop(): Promise<void> {
        if (this.isRunning) {
            await this.cleanup();
        }
    }

    private async cleanup(): Promise<void> {
        this.isRunning = false;

        for (const [sessionId, session] of this.sessions.entries()) {
            try {
                await session.transport.close();
                await session.server.close();
            } catch (error) {
                console.error(`Error closing session ${sessionId}:`, error);
            }
        }
        this.sessions.clear();

        if (this.httpServer) {
            await new Promise<void>((resolve) => {
                this.httpServer!.close(() => resolve());
            });
            this.httpServer = undefined;
        }

        this.app = undefined;
        this.actualPort = 0;
    }
}
