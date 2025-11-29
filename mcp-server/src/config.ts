/**
 * Configuration for the MCP server
 */

/**
 * WebSocket client configuration
 */
export const WEBSOCKET_CONFIG = {
    /** WebSocket server URL */
    URL: process.env.VSCODE_WS_URL || 'ws://localhost:3000',
    /** Reconnection delay in milliseconds */
    RECONNECT_DELAY: 1000,
    /** Maximum reconnection attempts */
    MAX_RECONNECT_ATTEMPTS: 5,
    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT: 5000,
} as const;
