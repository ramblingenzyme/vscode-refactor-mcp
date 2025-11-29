---
inclusion: always
---

# Technology Stack

## Build System

- **Package Manager**: Yarn 4.12.0 (Berry) with workspace support
- **Monorepo**: npm/yarn workspaces managing 3 packages
- **Compiler**: TypeScript 5.4.5+ with strict mode enabled

## Core Technologies

- **VSCode Extension API**: v1.90.0+
- **MCP SDK**: @modelcontextprotocol/sdk v1.23.0
- **IPC Transport**: WebSocket (ws v8.17.0)
- **Validation**: Zod v4.1.13
- **Node.js**: v20.x

## Module Systems

- **Extension Package**: CommonJS (`"module": "commonjs"`)
- **Server Package**: ES Modules (`"type": "module"`)
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
yarn workspace mcp-server build
yarn workspace @vscode-mcp/shared build
```

### Development
```bash
# Watch mode for extension
yarn workspace vscode-mcp-proxy watch

# Watch mode for shared package
yarn workspace @vscode-mcp/shared watch
```

### Testing
```bash
# Run all tests
yarn test

# Test specific package
yarn workspace mcp-server test
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
- Server: `packages/server/dist/`
- Shared: `packages/shared/dist/`
