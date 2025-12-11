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

  constructor(private mcpServer: McpServer) {}

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
  private httpServer?: HttpServer;
  private configuredPort: number;
  private sessionManager: SessionManager;

  constructor(tools: Tool[], port: number) {
    this.configuredPort = port;
    this.sessionManager = new SessionManager(this.createMcpServer(tools));
  }

  private createMcpServer(tools: Tool[]): McpServer {
    const mcpServer = new McpServer(
      { name: "vscode-refactoring-tools", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );

    for (const tool of tools) {
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

  private createExpressApp() {
    const app = createMcpExpressApp({ host: "localhost" });

    app.route("/mcp").all(async (req, res) => {
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

    return app;
  }

  async start(): Promise<void> {
    if (this.httpServer) {
      return;
    }

    try {
      const app = this.createExpressApp();

      this.httpServer = app.listen(
        this.configuredPort,
        "localhost",
        (error) => {
          // TODO: handle properly
          if (error) {
            throw error;
          }
        },
      );
    } catch (error) {
      await this.dispose();
      throw error;
    }
  }

  private sendError(res: Response, status: number, message: string): void {
    res.status(status).json({
      jsonrpc: "2.0",
      error: { code: -32000, message },
      id: null,
    });
  }

  getPort(): number {
    return this.configuredPort;
  }

  isServerRunning(): boolean {
    return !!this.httpServer;
  }

  getServerUrl(): string | null {
    const addr = this.httpServer?.address();
    return addr?.toString() || null;
  }

  async dispose(): Promise<void> {
    if (this.httpServer) {
      this.httpServer!.close(() => {
        this.httpServer = undefined;
      });
    }
  }
}
