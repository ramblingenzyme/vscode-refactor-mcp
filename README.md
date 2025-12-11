# VSCode MCP Proxy

VSCode extension that provides refactoring tools through two integration paths:

1. **Native VSCode integration** via `vscode.lm.registerTool` for VSCode's built-in agent
2. **HTTP MCP server** for external clients (VSCodium, fastmcp, custom MCP clients)

The extension exposes tools that leverage VSCode's editor APIs to perform refactoring operations like renaming files and symbols, ensuring that language servers automatically update imports and references - avoiding the slow and error-prone process of manual import updates.

## Architecture

The extension uses a dual-integration architecture:

- **In-Process Tools (VSCode)**: When `vscode.lm.registerTool` is available, tools are registered directly within the extension process for use by VSCode's native agent (Copilot, etc.)
- **HTTP MCP Server (Optional)**: An optional HTTP server exposes the same tools via the Model Context Protocol, allowing external clients to connect using standard MCP protocols

Both integration paths share the same tool implementations, ensuring consistent behavior.

## Project Structure

- **[packages/extension](./packages/extension)**: The VSCode extension with tool implementations and integration adapters
- **[packages/shared](./packages/shared)**: Shared type definitions and tool interfaces

## Available Tools

The extension provides the following refactoring tools:

- **rename_file**: Rename/move files with automatic import updates
- **rename_symbol**: Rename functions, classes, variables across all references
- **get_setting**: Query workspace configuration settings
- **set_setting**: Modify workspace configuration settings

## Configuration

The extension can be configured through VSCode settings:

### `vscode-mcp-proxy.enableHttpServer`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enable the HTTP MCP server for external clients

When enabled, the extension starts an HTTP server that exposes tools via the Model Context Protocol.

### `vscode-mcp-proxy.httpPort`

- **Type**: `number`
- **Default**: `0` (random port)
- **Range**: `0-65535`
- **Description**: Port for the HTTP MCP server

Use `0` to automatically assign a random available port, or specify a specific port number.

## Usage

### For VSCode Users

If you're using VSCode with Copilot or other agents that support `vscode.lm.registerTool`, the tools are automatically available - no configuration needed! The extension registers tools in-process when it activates.

### For VSCodium Users

VSCodium and other editors may not support `vscode.lm.registerTool`. To use the tools:

1. Enable the HTTP MCP server in your settings:

   ```json
   {
     "vscode-mcp-proxy.enableHttpServer": true,
     "vscode-mcp-proxy.httpPort": 0
   }
   ```

2. When the extension activates, check the status bar for the server URL (e.g., `MCP: localhost:3000`)

3. Click the status bar item to:
   - Copy the server URL
   - Stop the server
   - View logs

4. Connect your MCP client to the displayed URL

### For External MCP Clients

You can connect any MCP client (like fastmcp) to the HTTP server:

**Example with fastmcp (Python):**

```python
from fastmcp import FastMCP

# Connect to the VSCode MCP Proxy HTTP server
client = FastMCP("http://localhost:3000")

# Use the tools
result = await client.call_tool("rename_file", {
    "oldUri": "file:///workspace/old.ts",
    "newUri": "file:///workspace/new.ts"
})
```

**Example MCP client configuration:**

```json
{
  "mcpServers": {
    "vscode-refactoring": {
      "url": "http://localhost:3000",
      "transport": "sse"
    }
  }
}
```

## Getting Started

### Prerequisites

- Node.js v20+
- Yarn 4.12.0 (Berry)

### Installation

1. Install dependencies:
   ```bash
   yarn install
   ```

### Building

Build all packages:

```bash
yarn build
```

Or build specific packages:

```bash
yarn workspace vscode-mcp-proxy build
yarn workspace @vscode-mcp/shared build
```

### Packaging

Package the extension as a .vsix file:

```bash
yarn workspace vscode-mcp-proxy package
```

## Development

This project uses [Yarn workspaces](https://yarnpkg.com/features/workspaces) to manage dependencies.

- Shared code in `packages/shared` is linked locally as `@vscode-mcp/shared`
- Changes in `shared` require a rebuild (`yarn workspace @vscode-mcp/shared build`) to be picked up by the extension

### Watch Mode

For active development:

```bash
# Watch extension
yarn workspace vscode-mcp-proxy watch

# Watch shared package
yarn workspace @vscode-mcp/shared watch
```

## Security

The HTTP MCP server binds to `localhost` only, preventing external network access. This ensures that only local processes can connect to the server.
