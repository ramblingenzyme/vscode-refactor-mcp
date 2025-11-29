import WebSocket from 'ws';
import { VSCodeRequest, VSCodeResponse } from '../../shared/protocol.js';
import { WEBSOCKET_CONFIG } from './config.js';

/**
 * Persistent WebSocket client for communicating with VSCode extension
 */
export class VSCodeClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private requestId = 0;
    private pendingRequests = new Map<string, {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }>();

    /**
     * Connect to the VSCode WebSocket server
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(WEBSOCKET_CONFIG.URL);

                this.ws.on('open', () => {
                    console.log('Connected to VSCode extension');
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', () => {
                    console.log('Disconnected from VSCode extension');
                    this.handleDisconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    if (this.reconnectAttempts === 0) {
                        reject(error);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send a request to VSCode and wait for response
     */
    async sendRequest(command: string, args: Record<string, any>): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        const id = this.generateRequestId();
        const request: VSCodeRequest = {
            id,
            command,
            arguments: args,
        };

        return new Promise((resolve, reject) => {
            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, WEBSOCKET_CONFIG.REQUEST_TIMEOUT);

            // Store pending request
            this.pendingRequests.set(id, { resolve, reject, timeout });

            // Send request
            this.ws!.send(JSON.stringify(request));
        });
    }

    /**
     * Close the connection
     */
    close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Reject all pending requests
        this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(message: string): void {
        try {
            const response: VSCodeResponse = JSON.parse(message);
            const pending = this.pendingRequests.get(response.id);

            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.id);

                if (response.error) {
                    pending.reject(new Error(response.error));
                } else {
                    pending.resolve(response.result);
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Handle disconnection and attempt reconnection
     */
    private handleDisconnect(): void {
        this.ws = null;

        if (this.reconnectAttempts < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS})...`);

            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }, WEBSOCKET_CONFIG.RECONNECT_DELAY);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    /**
     * Generate a unique request ID
     */
    private generateRequestId(): string {
        return `req_${++this.requestId}_${Date.now()}`;
    }
}

// Singleton instance
let clientInstance: VSCodeClient | null = null;

/**
 * Get the singleton VSCode client instance
 */
export function getVSCodeClient(): VSCodeClient {
    if (!clientInstance) {
        clientInstance = new VSCodeClient();
    }
    return clientInstance;
}
