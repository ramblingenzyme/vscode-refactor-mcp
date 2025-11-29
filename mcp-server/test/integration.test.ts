import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock VSCode Extension (WebSocket Server)
const wss = new WebSocketServer({ port: 3000 });
console.log('Mock VSCode WS Server started on port 3000');

wss.on('connection', (ws) => {
    console.log('MCP Server connected to Mock VSCode');
    ws.on('message', (message) => {
        console.log('Received from MCP:', message.toString());
        const data = JSON.parse(message.toString());
        if (data.command === 'renameFile') {
            // Simulate successful rename
            setTimeout(() => {
                ws.send(JSON.stringify({
                    id: data.id,
                    result: true
                }));
            }, 100);
        }
    });
});

// Run MCP Server
const mcpServerPath = path.join(__dirname, '../dist/index.js');
const mcpProcess = spawn('node', [mcpServerPath], {
    stdio: ['pipe', 'pipe', 'inherit']
});

// Send MCP Request
const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
        name: "rename_file",
        arguments: {
            oldUri: "file:///test/old.txt",
            newUri: "file:///test/new.txt"
        }
    }
};

mcpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('MCP Output:', output);

    try {
        const response = JSON.parse(output);
        if (response.result && response.result.content) {
            console.log('Test Passed: Received response from MCP server');
            console.log(response.result.content[0].text);
            cleanup();
        }
    } catch (e) {
        // Ignore partial JSON
    }
});

// Send the request after a short delay to allow startup
setTimeout(() => {
    console.log('Sending request to MCP server...');
    const input = JSON.stringify(request) + '\n';
    mcpProcess.stdin.write(input);
}, 1000);

function cleanup() {
    mcpProcess.kill();
    wss.close();
    process.exit(0);
}

// Timeout
setTimeout(() => {
    console.error('Test Timed Out');
    cleanup();
    process.exit(1);
}, 5000);
