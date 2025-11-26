# VSCode MCP Proxy

## Project Overview
This repository contains a VSCode extension that hosts a WebSocket server. This server is designed to allow an MCP (Multi-Client Protocol) server to connect, register, and proxy VSCode API calls.

## Structure
- **Root**: Contains the VSCode extension source code (`src/extension.ts`).
- **mcp-server/**: Contains the MCP server implementation that connects to the VSCode extension.

## Goals
- Host a WebSocket server within the VSCode extension.
- Allow MCP server to register capabilities.
- Proxy VSCode API calls (e.g., `vscode.WorkspaceEdit.renameFile`) from the MCP server to VSCode.
