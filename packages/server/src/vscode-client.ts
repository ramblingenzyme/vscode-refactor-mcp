import * as net from 'net';
import { VSCodeRequest, VSCodeResponse } from '@vscode-mcp/shared';
import { CLIENT_CONFIG } from './config.js';

/**
 * Persistent IPC client for communicating with VSCode extension
 */
export class VSCodeClient {
    private socket: net.Socket | null = null;
    private reconnectAttempts = 0;
    private requestId = 0;
    private pendingRequests = new Map<string, {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }>();

    /**
     * Connect to the VSCode extension IPC server
     */
    async connect(): Promise<void> {
        if (!CLIENT_CONFIG.SOCKET_PATH) {
            throw new Error('VSCODE_MCP_SOCKET_PATH environment variable is not set');
        }

        return new Promise((resolve, reject) => {
            try {
                this.socket = net.createConnection(CLIENT_CONFIG.SOCKET_PATH!);

                this.socket.on('connect', () => {
                    console.error('Connected to VSCode extension');
                    this.reconnectAttempts = 0;
                    resolve();
                });

                let buffer = '';
                this.socket.on('data', (data) => {
                    buffer += data.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim()) {
                            this.handleMessage(line);
                        }
                    }
                });

                this.socket.on('close', () => {
                    console.log('Disconnected from VSCode extension');
                    this.handleDisconnect();
                });

                this.socket.on('error', (error) => {
                    console.error('IPC error:', error);
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
        if (!this.socket || this.socket.readyState !== 'open') {
            throw new Error('IPC socket is not connected');
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
            }, CLIENT_CONFIG.REQUEST_TIMEOUT);

            // Store pending request
            this.pendingRequests.set(id, { resolve, reject, timeout });

            // Send request (newline delimited)
            this.socket!.write(JSON.stringify(request) + '\n');
        });
    }

    /**
     * Close the connection
     */
    close(): void {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
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
        this.socket = null;

        if (this.reconnectAttempts < CLIENT_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${CLIENT_CONFIG.MAX_RECONNECT_ATTEMPTS})...`);

            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }, CLIENT_CONFIG.RECONNECT_DELAY);
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
