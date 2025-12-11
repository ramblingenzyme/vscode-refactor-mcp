---
inclusion: always
---

# Technology Stack

## Build System

- **Package Manager**: Yarn 4.12.0 (Berry) with workspace support
- **Monorepo**: Yarn workspaces managing 2 packages
- **Compiler**: TypeScript 5.4.5+ with strict mode enabled

## Core Technologies

- **VSCode Extension API**: v1.90.0+
  - `vscode.lm.registerTool`: Native tool registration API
  - `vscode.workspace`: Workspace edit and configuration APIs
- **MCP SDK**: @modelcontextprotocol/sdk v1.24.3
  - Server-side MCP implementation
  - SSE (Server-Sent Events) transport for HTTP
- **Validation**: Zod v4.1.13
  - Input schema validation
  - Type-safe tool parameters
- **Node.js**: v20.x

## Module Systems

- **Extension Package**: CommonJS (`"module": "commonjs"`)
- **Shared Package**: CommonJS (compiled output)

## Common Commands

### Installation
```bash
yarn install
```

### Build
```bash
# Build all packages
yarn build

# Build specific workspace
yarn workspace vscode-mcp-proxy build
yarn workspace @vscode-mcp/shared build
```

### Development
```bash
# Watch mode for extension
yarn workspace vscode-mcp-proxy watch

# Watch mode for shared package
yarn workspace @vscode-mcp/shared watch
```

### Extension Packaging
```bash
# Package extension as .vsix
yarn workspace vscode-mcp-proxy package
```

### Clean
```bash
yarn clean
```

## Build Output

- Extension: `packages/extension/out/`
- Shared: `packages/shared/dist/`

## Key Dependencies

### Extension Package
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `@vscode-mcp/shared`: Shared tool interfaces
- `zod`: Schema validation

### Integration Paths
- **registerTool**: Uses `vscode.lm.registerTool` when available
- **HTTP Server**: Uses MCP SDK's SSE transport over HTTP
- **Schema Conversion**: Zod schemas converted to JSON Schema for registerTool
