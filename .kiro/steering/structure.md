---
inclusion: always
---

# Project Structure

## Monorepo Layout

```
vscode-mcp-monorepo/
├── packages/
│   ├── extension/     # VSCode extension with tool implementations
│   └── shared/        # Shared type definitions
├── .yarn/             # Yarn Berry cache and releases
├── package.json       # Root workspace configuration
└── tsconfig.json      # Base TypeScript configuration
```

## Package: extension

VSCode extension with tool implementations and integration adapters.

```
packages/extension/
├── src/
│   ├── tools/         # Tool implementations
│   │   ├── index.ts           # Tool registry
│   │   ├── rename-file.ts     # File rename tool
│   │   ├── rename-symbol.ts   # Symbol rename tool
│   │   └── settings.ts        # Settings tools
│   ├── integrations/  # Integration adapters
│   │   ├── register-tool.ts   # registerTool adapter
│   │   └── http-server.ts     # HTTP MCP server
│   ├── utils/         # Utility functions
│   │   └── logger.ts
│   ├── config.ts      # Configuration management
│   └── extension.ts   # Extension entry point
├── out/               # Compiled output (CommonJS)
├── package.json       # Extension manifest
└── tsconfig.json      # TypeScript config
```

**Key Details:**
- Entry point: `extension.ts` (activated on `onStartupFinished`)
- Output: `out/extension.js` (CommonJS)
- Contributes: Configuration settings for HTTP server
- Dual integration: registerTool (in-process) + HTTP server (optional)

## Package: shared

Shared type definitions and tool interfaces.

```
packages/shared/
├── src/
│   ├── tool.ts        # Tool interface definition
│   └── index.ts       # Public exports
├── dist/              # Compiled output
└── package.json
```

**Key Details:**
- Published as `@vscode-mcp/shared`
- Contains `Tool` interface used by extension
- Provides common types for tool implementations

## Architecture Patterns

### Dual Integration
- **registerTool**: Tools registered in-process when `vscode.lm.registerTool` is available
- **HTTP Server**: Optional HTTP server exposes tools via MCP protocol
- Both paths share the same tool implementations

### Tool Implementation
- Tools return `CallToolResult` from MCP SDK
- Input validation using Zod schemas
- Error handling centralized in tool implementations
- No format conversion needed between integration paths

### Configuration
- Settings stored in VSCode configuration
- `enableHttpServer`: Enable/disable HTTP server (default: false)
- `httpPort`: Port for HTTP server (default: 0 for random port)

### Build Dependencies
1. Build `shared` first (provides types)
2. Build `extension` (depends on `shared`)
