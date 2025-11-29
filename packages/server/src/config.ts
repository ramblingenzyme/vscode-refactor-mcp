/**
 * Configuration for the MCP server
 */

import { IPC_CONFIG } from '@vscode-mcp/shared';

/**
 * IPC client configuration
 */
export const CLIENT_CONFIG = {
    /** Socket path from environment variable */
    SOCKET_PATH: process.env[IPC_CONFIG.SOCKET_PATH_ENV_VAR],
    /** Reconnection delay in milliseconds */
    RECONNECT_DELAY: 1000,
    /** Maximum reconnection attempts */
    MAX_RECONNECT_ATTEMPTS: 5,
    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT: 5000,
} as const;
