import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Logger } from "../utils/logger";
import * as vscode from "vscode";
import {
  VSCodeRequest,
  VSCodeResponse,
  VSCodeCommand,
} from "../../../shared/dist/protocol";

const logger = new Logger("IPC Server");

/**
 * IPC Server for handling MCP server connections
 */
export class IpcServer {
  private server: net.Server | undefined;
  private sockets: Set<net.Socket> = new Set();
  private socketPath: string | undefined;

  /**
   * Start the IPC server
   */
  async start(): Promise<string> {
    if (this.server) {
      logger.info("IPC server already running");
      return this.socketPath!;
    }

    this.socketPath = this.getSocketPath();

    // Ensure socket file doesn't exist
    if (process.platform !== "win32" && fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.on("error", (error) => {
        logger.error("IPC server error:", error);
        reject(error);
      });

      this.server.listen(this.socketPath, () => {
        logger.info(`IPC server started on ${this.socketPath}`);

        // Log to Output Channel for manual connection
        const outputChannel =
          vscode.window.createOutputChannel("VSCode MCP Proxy");
        outputChannel.appendLine(`IPC Server listening on: ${this.socketPath}`);
        outputChannel.appendLine(
          `To connect manually: export VSCODE_MCP_SOCKET_PATH=${this.socketPath}`
        );

        resolve(this.socketPath!);
      });
    });
  }

  /**
   * Stop the IPC server
   */
  stop(): void {
    if (!this.server) {
      return;
    }

    // Close all client connections
    this.sockets.forEach((socket) => {
      socket.destroy();
    });
    this.sockets.clear();

    // Close the server
    this.server.close();
    this.server = undefined;

    // Clean up socket file
    if (
      this.socketPath &&
      process.platform !== "win32" &&
      fs.existsSync(this.socketPath)
    ) {
      fs.unlinkSync(this.socketPath);
    }

    logger.info("IPC server stopped");
  }

  /**
   * Handle a new client connection
   */
  private handleConnection(socket: net.Socket): void {
    logger.info("Client connected");
    this.sockets.add(socket);

    let buffer = "";

    socket.on("data", async (data) => {
      buffer += data.toString();

      // Process line-by-line
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last partial line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            // We reuse the existing handler which expects a string
            // Note: handleMessage might need adaptation if it expects a WebSocket
            // For now, we'll assume we can adapt it or it just sends back via a callback
            // But wait, handleMessage in websocket/server.ts took (ws, message)
            // We need to check handleMessage signature.
            await this.processMessage(socket, line);
          } catch (error) {
            logger.error("Error processing message:", error);
          }
        }
      }
    });

    socket.on("close", () => {
      logger.info("Client disconnected");
      this.sockets.delete(socket);
    });

    socket.on("error", (error) => {
      logger.error("Client error:", error);
      this.sockets.delete(socket);
    });
  }

  private async processMessage(socket: net.Socket, message: string) {
    try {
      const request: VSCodeRequest = JSON.parse(message);
      const response: VSCodeResponse = {
        id: request.id,
      };

      try {
        switch (request.command) {
          case VSCodeCommand.RENAME_FILE:
            const { oldUri, newUri } = request.arguments;
            const edit = new vscode.WorkspaceEdit();
            edit.renameFile(vscode.Uri.parse(oldUri), vscode.Uri.parse(newUri));
            const success = await vscode.workspace.applyEdit(edit);
            response.result = { success };
            break;
          case VSCodeCommand.GET_SETTING:
            try {
              const { key, scope } = request.arguments;
              const [section, ...rest] = key.split(".");
              const config = vscode.workspace.getConfiguration(section);
              const value = config.get(rest.join("."));
              response.result = { value };
            } catch (error) {
              response.error =
                error instanceof Error ? error.message : String(error);
            }
            break;
          case VSCodeCommand.SET_SETTING:
            try {
              const { key, value, scope } = request.arguments;
              const [section, ...rest] = key.split(".");
              const config = vscode.workspace.getConfiguration(section);
              const property = rest.join(".");
              const isWorkspace = scope === "workspace";
              await config.update(property, value, isWorkspace);
              response.result = { success: true };
            } catch (error) {
              response.error =
                error instanceof Error ? error.message : String(error);
            }
            break;
          case VSCodeCommand.RENAME_SYMBOL:
            try {
              const { uri, originalName, newName } = request.arguments;
              const fileUri = vscode.Uri.parse(uri);
              const symbols = await vscode.commands.executeCommand<
                Array<vscode.SymbolInformation>
              >("vscode.executeWorkspaceSymbolProvider", originalName);
              const targetSymbol = symbols?.find(
                (sym) => sym.name === originalName && sym.location.uri.toString() === fileUri.toString()
              );
              if (!targetSymbol) {
                response.error = "Could not find symbol";
                break;
              }
              const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
                "vscode.executeDocumentRenameProvider",
                fileUri,
                targetSymbol.location.range.start,
                newName
              );

              if (!workspaceEdit) {
                response.error = "Rename provider did not return a WorkspaceEdit.";
                break;
              }
              const success = await vscode.workspace.applyEdit(workspaceEdit);

              if (!success) {
                response.error = "Failed to apply WorkspaceEdit for renaming.";
                break;
              }

              const files = workspaceEdit.entries().map(([uri]) => uri);

              await Promise.allSettled(
                files.map((uri) => vscode.workspace.save(uri))
              );

              response.result = { success, files: files.map((uri) => uri.toString()) };
            } catch (error) {
              response.error = error instanceof Error ? error.message : String(error);
            }
            break;
          default:
            response.error = `Unknown command: ${request.command}`;
        }
      } catch (error) {
        response.error = error instanceof Error ? error.message : String(error);
      }

      socket.write(JSON.stringify(response) + "\n");
    } catch (error) {
      logger.error("Error parsing message:", error);
    }
  }

  /**
   * Generate a unique socket path
   */
  private getSocketPath(): string {
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    if (process.platform === "win32") {
      return `\\\\.\\pipe\\vscode-mcp-${randomSuffix}`;
    } else {
      const tmpDir = os.tmpdir();
      return path.join(tmpDir, `vscode-mcp-${randomSuffix}.sock`);
    }
  }
}
