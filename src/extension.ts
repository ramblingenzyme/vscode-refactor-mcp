import * as vscode from 'vscode';
import * as path from 'path';
import { VSCodeWebSocketServer } from './websocket/server';
import { Logger } from './utils/logger';

const logger = new Logger('Extension');
let wsServer: VSCodeWebSocketServer | undefined;

/**
 * MCP Server Definition Provider for VSCode refactoring tools
 */
class RefactoringMcpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
    provideMcpServerDefinitions(): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
        const serverPath = path.join(__dirname, 'mcp-server/dist/index.js');

        const serverDefinition = new vscode.McpStdioServerDefinition(
            'VSCode Refactoring Tools',
            process.execPath, // Use VSCode's Node.js
            [serverPath]
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
export function activate(context: vscode.ExtensionContext) {
    logger.info('VSCode MCP Proxy extension is now active!');

    // Register MCP Server Definition Provider
    const mcpProvider = new RefactoringMcpServerProvider();
    const mcpDisposable = vscode.lm.registerMcpServerDefinitionProvider(
        'vscode-mcp-proxy.refactoring',
        mcpProvider
    );
    context.subscriptions.push(mcpDisposable);

    // Start WebSocket Server
    wsServer = new VSCodeWebSocketServer();
    wsServer.start();

    // Register cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            if (wsServer) {
                wsServer.stop();
            }
        }
    });
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    if (wsServer) {
        wsServer.stop();
        wsServer = undefined;
    }
    logger.info('Extension deactivated');
}
