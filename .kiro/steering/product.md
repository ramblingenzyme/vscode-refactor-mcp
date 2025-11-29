---
inclusion: always
---

# Product Overview

VSCode MCP Proxy is a VSCode extension that enables Model Context Protocol (MCP) servers to interact with VSCode APIs through an IPC bridge. The extension hosts an IPC server using Unix Domain Sockets (Linux/macOS) or Named Pipes (Windows), allowing external MCP servers to perform code refactoring and manipulation operations within VSCode.

## Key Components

- **VSCode Extension**: Hosts the IPC server and exposes VSCode API capabilities
- **MCP Server**: Connects to the extension via IPC and provides MCP tools for code manipulation
- **Shared Protocol**: Type-safe communication protocol between extension and server

## Primary Use Cases

- Remote code refactoring through MCP tools
- VSCode API proxying for external automation
- Multi-workspace support with isolated IPC connections
