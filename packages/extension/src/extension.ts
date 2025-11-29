import * as vscode from 'vscode';
import * as path from 'path';
import { IpcServer } from './ipc/server';
import { Logger } from './utils/logger';
import { IPC_CONFIG } from './config';

const logger = new Logger('Extension');
let ipcServer: IpcServer | undefined;

/**
 * MCP Server Definition Provider for VSCode refactoring tools
 */
class RefactoringMcpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
    constructor(private socketPath: string) { }

    provideMcpServerDefinitions(): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
        const serverPath = path.join(__dirname, 'mcp-server/dist/index.js');

        const serverDefinition = new vscode.McpStdioServerDefinition(
            'VSCode Refactoring Tools',
            process.execPath, // Use VSCode's Node.js
            [serverPath],
            {
                [IPC_CONFIG.SOCKET_PATH_ENV_VAR]: this.socketPath
            }
        );

        return [serverDefinition];
    }

    resolveMcpServerDefinition(
        server: vscode.McpStdioServerDefinition,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.McpStdioServerDefinition> {
        return server;
    }
}

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext) {
    logger.info('VSCode MCP Proxy extension is activating...');

    // Start IPC Server
    ipcServer = new IpcServer();
    try {
        const socketPath = await ipcServer.start();

        // Register MCP Server Definition Provider
        const mcpProvider = new RefactoringMcpServerProvider(socketPath);
        const mcpDisposable = vscode.lm.registerMcpServerDefinitionProvider(
            'vscode-mcp-proxy.refactoring',
            mcpProvider
        );
        context.subscriptions.push(mcpDisposable);

        logger.info('VSCode MCP Proxy extension is now active!');
    } catch (error) {
        logger.error('Failed to start IPC server:', error);
        vscode.window.showErrorMessage('VSCode MCP Proxy: Failed to start IPC server');
    }

    logger.info((await vscode.commands.getCommands(true)).join(", "));

    // Register cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            if (ipcServer) {
                ipcServer.stop();
            }
        }
    });
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    if (ipcServer) {
        ipcServer.stop();
        ipcServer = undefined;
    }
    logger.info('Extension deactivated');
}
