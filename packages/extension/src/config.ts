/**
 * Configuration constants for the VSCode MCP Proxy extension
 */

import * as vscode from "vscode";

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  /** Whether to enable verbose logging */
  VERBOSE: true,
} as const;

/**
 * Extension configuration interface
 */
export interface ExtensionConfig {
  /** Whether to enable the HTTP MCP server */
  enableHttpServer: boolean;
  /** Port for HTTP MCP server (0 = random port) */
  httpPort: number;
}

/**
 * Get the current extension configuration
 *
 * @returns The extension configuration
 */
export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration("vscode-mcp-proxy");

  return {
    enableHttpServer: config.get("enableHttpServer", false),
    httpPort: config.get("httpPort", 0),
  };
}

/**
 * Validate port number is in valid range
 *
 * @param port - Port number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPort(port: number): boolean {
  return port === 0 || (port >= 1 && port <= 65535);
}
