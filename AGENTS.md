# VSCode MCP Proxy

## Project Overview

This repository contains a VSCode extension that provides refactoring tools through two integration paths:

1. **Native VSCode Integration**: Uses `vscode.lm.registerTool` to register tools directly within the extension process for VSCode's built-in agent (Copilot, etc.)
2. **HTTP MCP Server**: Optionally exposes tools via an HTTP server using the Model Context Protocol, allowing external clients (VSCodium, fastmcp, custom MCP clients) to connect

Both integration paths share the same tool implementations, ensuring consistent behavior and eliminating code duplication.

## Structure

- **packages/extension**: Contains the VSCode extension with tool implementations and integration adapters
  - `src/tools/`: Tool implementations (rename file, rename symbol, settings)
  - `src/integrations/`: Integration adapters (registerTool, HTTP server)
  - `src/config.ts`: Configuration management
  - `src/extension.ts`: Extension entry point
- **packages/shared**: Shared type definitions and tool interfaces

## Goals

- Provide refactoring tools that leverage VSCode APIs for accurate code manipulation
- Support both in-process tool execution (via `registerTool`) and external client access (via HTTP MCP server)
- Ensure language servers automatically update imports and references when files/symbols are renamed
- Allow users to configure the HTTP server through VSCode settings
- Maintain security by binding the HTTP server to localhost only
