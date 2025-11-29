/**
 * Configuration constants for the VSCode MCP Proxy extension
 */

/**
 * WebSocket server configuration
 */
export const WEBSOCKET_CONFIG = {
    /** Port for the WebSocket server */
    PORT: 3000,
    /** Host for the WebSocket server */
    HOST: 'localhost',
} as const;

/**
 * Get the WebSocket URL
 */
export function getWebSocketUrl(): string {
    return `ws://${WEBSOCKET_CONFIG.HOST}:${WEBSOCKET_CONFIG.PORT}`;
}

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
    /** Whether to enable verbose logging */
    VERBOSE: true,
} as const;
