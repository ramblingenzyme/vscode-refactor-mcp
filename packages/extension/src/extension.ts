import * as vscode from "vscode";
import { Logger } from "./utils/logger";
import { getConfig, isValidPort } from "./config";
import { HttpMcpServer } from "./integrations/http-server";
import { allTools, registerAllTools } from "./tools";

const logger = new Logger("Extension");
let httpMcpServer: HttpMcpServer | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Create a status bar item for the HTTP MCP server
 *
 * @param serverUrl - The URL of the running server
 * @returns A configured status bar item
 */
function createStatusBarItem(serverUrl: string): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );

  // Extract port from URL for display
  const port = serverUrl.split(":").pop();

  // Use server icon and show URL
  item.text = `$(server) MCP: localhost:${port}`;
  item.tooltip = `MCP HTTP Server running at ${serverUrl}\nClick for options`;
  item.command = "vscode-mcp-proxy.showServerOptions";

  return item;
}

/**
 * Show quick pick menu with server options
 */
async function showServerOptions(): Promise<void> {
  if (!httpMcpServer || !httpMcpServer.isServerRunning()) {
    vscode.window.showInformationMessage("HTTP MCP server is not running");
    return;
  }

  const serverUrl = httpMcpServer.getServerUrl();
  if (!serverUrl) {
    vscode.window.showErrorMessage("Unable to get server URL");
    return;
  }

  const options = [
    {
      label: "$(copy) Copy Server URL",
      description: serverUrl,
      action: "copy",
    },
    {
      label: "$(stop) Stop Server",
      description: "Stop the HTTP MCP server",
      action: "stop",
    },
    {
      label: "$(output) View Logs",
      description: "Open the extension output channel",
      action: "logs",
    },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: "Select an action",
  });

  if (!selected) {
    return;
  }

  switch (selected.action) {
    case "copy":
      await vscode.env.clipboard.writeText(serverUrl);
      vscode.window.showInformationMessage(`Copied ${serverUrl} to clipboard`);
      break;

    case "stop":
      try {
        await httpMcpServer.dispose();
        httpMcpServer = undefined;

        // Hide status bar item
        if (statusBarItem) {
          statusBarItem.hide();
          statusBarItem.dispose();
          statusBarItem = undefined;
        }

        logger.info("HTTP MCP server stopped by user");
        vscode.window.showInformationMessage("HTTP MCP server stopped");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("Failed to stop HTTP MCP server:", error);
        vscode.window.showErrorMessage(
          `Failed to stop server: ${errorMessage}`,
        );
      }
      break;

    case "logs":
      // Show the output channel (VSCode will create it if it doesn't exist)
      vscode.commands.executeCommand("workbench.action.output.toggleOutput");
      break;
  }
}

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext) {
  logger.info("VSCode MCP Proxy extension is activating...");

  try {
    // Read configuration settings
    const config = getConfig();

    // Register command for status bar click handler
    const showServerOptionsCommand = vscode.commands.registerCommand(
      "vscode-mcp-proxy.showServerOptions",
      showServerOptions,
    );
    context.subscriptions.push(showServerOptionsCommand);

    // Register tools via registerTool when available
    const registrationResult = registerAllTools(context);

    if (registrationResult.skipped) {
      logger.info("registerTool API not available, skipping tool registration");
    } else {
      if (registrationResult.registered.length > 0) {
        logger.info(
          `Registered ${registrationResult.registered.length} tools: ${registrationResult.registered.join(", ")}`,
        );
      }

      if (registrationResult.failed.length > 0) {
        logger.error(
          `Failed to register ${registrationResult.failed.length} tools:`,
        );
        registrationResult.failed.forEach(({ name, error }) => {
          logger.error(`  - ${name}: ${error}`);
        });

        // Show error notification but don't block activation
        vscode.window.showWarningMessage(
          `VSCode MCP Proxy: Failed to register ${registrationResult.failed.length} tool(s). Check logs for details.`,
        );
      }
    }

    // Start HTTP MCP server when enabled
    if (config.enableHttpServer) {
      try {
        // Validate port configuration
        if (!isValidPort(config.httpPort)) {
          throw new Error(
            `Invalid port number: ${config.httpPort}. Port must be 0 or between 1 and 65535.`,
          );
        }

        httpMcpServer = new HttpMcpServer(allTools, config.httpPort);
        await httpMcpServer.start();
        context.subscriptions.push(httpMcpServer);

        const serverUrl = httpMcpServer.getServerUrl();
        logger.info(`HTTP MCP server started on ${serverUrl}`);

        // Show information message to user
        vscode.window.showInformationMessage(
          `MCP HTTP Server running at ${serverUrl}`,
        );

        // Create and show status bar item
        statusBarItem = createStatusBarItem(serverUrl!);
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("Failed to start HTTP MCP server:", error);

        // Provide clear error message for port conflicts
        if (errorMessage.includes("already in use")) {
          vscode.window.showErrorMessage(`VSCode MCP Proxy: ${errorMessage}`);
        } else {
          vscode.window.showErrorMessage(
            `VSCode MCP Proxy: Failed to start HTTP MCP server - ${errorMessage}`,
          );
        }
      }
    }

    logger.info("VSCode MCP Proxy extension is now active!");
  } catch (error) {
    // Handle any unexpected errors during activation
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Extension activation failed:", error);
    vscode.window.showErrorMessage(
      `VSCode MCP Proxy: Extension activation failed - ${errorMessage}`,
    );

    // Don't throw - allow extension to remain in a degraded state
    // rather than completely failing to activate
  }
}
