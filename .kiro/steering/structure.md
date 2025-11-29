---
inclusion: always
---

# Project Structure

## Monorepo Layout

```
vscode-mcp-monorepo/
├── packages/
│   ├── extension/     # VSCode extension with IPC server
│   ├── server/        # MCP server implementation
│   └── shared/        # Shared protocol definitions
├── .yarn/             # Yarn Berry cache and releases
├── package.json       # Root workspace configuration
└── tsconfig.json      # Base TypeScript configuration
```

## Package: extension

VSCode extension that hosts the IPC server.

```
packages/extension/
├── src/
│   ├── ipc/           # IPC server implementation
│   ├── utils/         # Utility functions
│   ├── config.ts      # Configuration management
│   └── extension.ts   # Extension entry point
├── out/               # Compiled output (CommonJS)
├── package.json       # Extension manifest
└── tsconfig.json      # TypeScript config
```

**Key Details:**
- Entry point: `extension.ts` (activated on `onStartupFinished`)
- Output: `out/extension.js` (CommonJS)
- Contributes: `mcpServerDefinitionProviders` for VSCode MCP integration

## Package: server

MCP server that connects to the extension via IPC.

```
packages/server/
├── src/
│   ├── tools/         # MCP tool implementations
│   ├── config.ts      # Server configuration
│   ├── index.ts       # Server entry point
│   └── vscode-client.ts  # IPC client for VSCode communication
├── test/
│   └── integration.test.ts
├── dist/              # Compiled output (ES modules)
└── package.json
```

**Key Details:**
- Entry point: `index.ts`
- Output: `dist/` (ES modules)
- Uses MCP SDK for protocol implementation
- Connects to extension's IPC server via WebSocket

## Package: shared

Shared type definitions and protocol specifications.

```
packages/shared/
├── src/
│   ├── config.ts      # Shared configuration types
│   ├── protocol.ts    # IPC protocol definitions
│   └── index.ts       # Public exports
├── dist/              # Compiled output
└── package.json
```

**Key Details:**
- Published as `@vscode-mcp/shared`
- Contains `VSCodeRequest`, `VSCodeResponse`, and command enums
- Used by both extension and server packages

## Architecture Patterns

### IPC Communication
- Extension hosts WebSocket server on Unix Domain Socket/Named Pipe
- Server connects as WebSocket client
- Request/response pattern with unique IDs
- Type-safe protocol defined in `shared/protocol.ts`

### Workspace Isolation
- Each VSCode workspace instance has isolated IPC connection
- Socket/pipe paths include workspace identifiers
- Multiple workspaces can run simultaneously

### Build Dependencies
1. Build `shared` first (provides types)
2. Build `extension` and `server` (depend on `shared`)
3. Extension copies server dist during `compile` script
