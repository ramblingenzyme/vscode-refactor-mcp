---
inclusion: always
---

# Product Overview

VSCode MCP Proxy is a VSCode extension that provides refactoring tools through two integration paths:

1. **Native VSCode Integration**: Uses `vscode.lm.registerTool` to register tools directly within the extension process for VSCode's built-in agent (Copilot, etc.)
2. **HTTP MCP Server**: Optionally exposes tools via an HTTP server using the Model Context Protocol for external clients

## Key Components

- **Tool Implementations**: Core refactoring logic (rename file, rename symbol, settings management)
- **registerTool Integration**: Adapter that registers tools with VSCode's native agent API
- **HTTP MCP Server**: Optional HTTP server that exposes tools via standard MCP protocol
- **Shared Types**: Common interfaces and types used by all components

## Primary Use Cases

- In-process refactoring for VSCode users with native agent support
- External client access for VSCodium users and custom MCP clients
- Accurate file/symbol renaming with automatic import updates via VSCode APIs
- Programmatic workspace configuration management
