# VSCode MCP Proxy

A VSCode extension that provides refactoring tools through two integration paths:

1. **Native VSCode Integration**: Uses `vscode.lm.registerTool` to register tools directly within the extension process for VSCode's built-in agent (Copilot, etc.)
2. **HTTP MCP Server**: Optionally exposes tools via an HTTP server using the Model Context Protocol for external clients

## Features

- **Rename File**: Rename files with automatic import updates
- **Rename Symbol**: Rename symbols with automatic reference updates
- **Settings Management**: Get and update VSCode workspace settings

## Configuration

- `vscode-mcp-proxy.enableHttpServer`: Enable the HTTP MCP server for external clients (default: false)
- `vscode-mcp-proxy.httpPort`: Port for the HTTP MCP server (default: 0 for random port)

## Usage

The extension automatically activates on startup and registers tools with VSCode's native agent API when available. Optionally enable the HTTP server to allow external MCP clients to connect.
