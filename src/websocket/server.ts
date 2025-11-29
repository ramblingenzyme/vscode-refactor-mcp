import { WebSocketServer, WebSocket } from 'ws';
import { WEBSOCKET_CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { handleMessage } from './handlers';

const logger = new Logger('WebSocket Server');

/**
 * WebSocket server for handling MCP server connections
 */
export class VSCodeWebSocketServer {
    private wss: WebSocketServer | undefined;
    private clients: Set<WebSocket> = new Set();

    /**
     * Start the WebSocket server
     */
    start(): void {
        if (this.wss) {
            logger.info('WebSocket server already running');
            return;
        }

        this.wss = new WebSocketServer({ port: WEBSOCKET_CONFIG.PORT });

        this.wss.on('connection', (ws) => {
            this.handleConnection(ws);
        });

        this.wss.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });

        logger.info(`WebSocket server started on port ${WEBSOCKET_CONFIG.PORT}`);
    }

    /**
     * Stop the WebSocket server
     */
    stop(): void {
        if (!this.wss) {
            return;
        }

        // Close all client connections
        this.clients.forEach((client) => {
            client.close();
        });
        this.clients.clear();

        // Close the server
        this.wss.close();
        this.wss = undefined;

        logger.info('WebSocket server stopped');
    }

    /**
     * Handle a new client connection
     */
    private handleConnection(ws: WebSocket): void {
        logger.info('Client connected');
        this.clients.add(ws);

        ws.on('message', async (message) => {
            await handleMessage(ws, message.toString());
        });

        ws.on('close', () => {
            logger.info('Client disconnected');
            this.clients.delete(ws);
        });

        ws.on('error', (error) => {
            logger.error('Client error:', error);
            this.clients.delete(ws);
        });
    }

    /**
     * Get the number of connected clients
     */
    getClientCount(): number {
        return this.clients.size;
    }
}
