/**
 * Configuration constants for the VSCode MCP Proxy extension
 */

import { IPC_CONFIG } from '@vscode-mcp/shared';

export { IPC_CONFIG };

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
    /** Whether to enable verbose logging */
    VERBOSE: true,
} as const;
