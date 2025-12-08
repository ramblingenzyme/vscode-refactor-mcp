# VSCode MCP Proxy

## Project Overview

This repository contains a VSCode extension that hosts an IPC (Inter-Process Communication) server using Unix Domain Sockets/Named Pipes. This server allows an MCP (Model Context Protocol) server to connect and proxy VSCode API calls for code refactoring and manipulation.

## Structure

- **packages/extension**: Contains the VSCode extension source code with the IPC server.
- **packages/server**: Contains the MCP server implementation that connects to the VSCode extension via IPC.
- **packages/shared**: Shared protocol definitions and configuration.

## Goals

- Host an IPC server within the VSCode extension using Unix Domain Sockets (Linux/macOS) or Named Pipes (Windows).
- Allow MCP server to register capabilities and communicate securely.
- Proxy VSCode API calls (e.g., `vscode.WorkspaceEdit.renameFile`) from the MCP server to VSCode.
- Support multiple VSCode workspace instances running simultaneously with isolated IPC connections.
