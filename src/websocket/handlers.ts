import * as vscode from 'vscode';
import { WebSocket } from 'ws';
import { VSCodeRequest, VSCodeResponse, VSCodeCommand, RenameFileArgs } from './types';
import { Logger } from '../utils/logger';

const logger = new Logger('WebSocket Handlers');

/**
 * Handle incoming WebSocket messages
 */
export async function handleMessage(ws: WebSocket, message: string): Promise<void> {
    logger.debug('Received message:', message);

    try {
        const data: VSCodeRequest = JSON.parse(message);

        switch (data.command) {
            case VSCodeCommand.RENAME_FILE:
                await handleRenameFile(ws, data);
                break;
            default:
                sendError(ws, data.id, `Unknown command: ${data.command}`);
        }
    } catch (error: any) {
        logger.error('Error processing message:', error);
        sendError(ws, 'unknown', error.message);
    }
}

/**
 * Handle the renameFile command
 */
async function handleRenameFile(ws: WebSocket, request: VSCodeRequest): Promise<void> {
    try {
        const args = request.arguments as RenameFileArgs;

        if (!args.oldUri || !args.newUri) {
            throw new Error('Missing oldUri or newUri');
        }

        const oldUriParsed = vscode.Uri.parse(args.oldUri);
        const newUriParsed = vscode.Uri.parse(args.newUri);

        const edit = new vscode.WorkspaceEdit();
        edit.renameFile(oldUriParsed, newUriParsed);

        const success = await vscode.workspace.applyEdit(edit);

        sendResponse(ws, request.id, success);
        logger.info(`Renamed file: ${args.oldUri} -> ${args.newUri}`);
    } catch (error: any) {
        logger.error('Error renaming file:', error);
        sendError(ws, request.id, error.message);
    }
}

/**
 * Send a successful response
 */
function sendResponse(ws: WebSocket, id: string, result: any): void {
    const response: VSCodeResponse = { id, result };
    ws.send(JSON.stringify(response));
}

/**
 * Send an error response
 */
function sendError(ws: WebSocket, id: string, error: string): void {
    const response: VSCodeResponse = { id, error };
    ws.send(JSON.stringify(response));
}
