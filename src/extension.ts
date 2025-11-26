import * as vscode from 'vscode';
import { WebSocketServer, WebSocket } from 'ws';
import * as path from 'path';

let wss: WebSocketServer | undefined;

class RefactoringMcpServerProvider implements vscode.McpServerDefinitionProvider<vscode.McpStdioServerDefinition> {
    provideMcpServerDefinitions(): vscode.ProviderResult<vscode.McpStdioServerDefinition[]> {
        const serverPath = path.join(__dirname, '../mcp-server/dist/index.js');

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

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-mcp-proxy" is now active!');

    // Register MCP Server Definition Provider
    const mcpProvider = new RefactoringMcpServerProvider();
    const mcpDisposable = vscode.lm.registerMcpServerDefinitionProvider(
        'vscode-mcp-proxy.refactoring',
        mcpProvider
    );
    context.subscriptions.push(mcpDisposable);

    // Start WebSocket Server
    const port = 3000;
    wss = new WebSocketServer({ port });

    wss.on('connection', (ws) => {
        console.log('Client connected');

        ws.on('message', async (message) => {
            console.log('Received:', message.toString());
            try {
                const data = JSON.parse(message.toString());
                if (data.command === 'renameFile') {
                    await handleRenameFile(ws, data);
                } else {
                    ws.send(JSON.stringify({ id: data.id, error: 'Unknown command' }));
                }
            } catch (error: any) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({ error: error.message }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    console.log(`WebSocket server started on port ${port} `);
}

async function handleRenameFile(ws: WebSocket, data: any) {
    try {
        const { oldUri, newUri } = data.arguments;
        if (!oldUri || !newUri) {
            throw new Error('Missing oldUri or newUri');
        }

        const oldUriParsed = vscode.Uri.parse(oldUri);
        const newUriParsed = vscode.Uri.parse(newUri);

        const edit = new vscode.WorkspaceEdit();
        edit.renameFile(oldUriParsed, newUriParsed);

        const success = await vscode.workspace.applyEdit(edit);

        ws.send(JSON.stringify({ id: data.id, result: success }));
    } catch (error: any) {
        ws.send(JSON.stringify({ id: data.id, error: error.message }));
    }
}

export function deactivate() {
    if (wss) {
        wss.close();
    }
}
