# VSCode MCP Monorepo

VSCode extension with an included MCP server that exposes tools to enable efficient refactoring via LLMs.

The original tool/idea was to rename/move files via the underlying VSCode editor API so that language servers would automatically update imports just the same as if I was moving the files around in the sidebar and avoid an agent going through the slow and error prone loop of trying to update the imports itself.

Primarily focused on VSCode/Copilot ATM as it's the only editor which seems to integrate with MCP servers declared by VSCode extensions.

## Project Structure

- **[packages/extension](./packages/extension)**: The VSCode extension that hosts the IPC server.
- **[packages/server](./packages/server)**: The MCP server implementation that connects to the extension via IPC.
- **[packages/shared](./packages/shared)**: Shared code and protocol definitions used by both components.

## Getting Started

### Prerequisites

- Node.js v20+
- npm v9+

### Installation

1.  Install dependencies for all packages:
    ```bash
    npm install
    ```

### Building

Build all packages:

```bash
npm run build
```

Or build specific packages:

```bash
npm run build -w packages/extension
npm run build -w packages/server
```

## Development

This project uses [npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) to manage dependencies.

- Shared code in `packages/shared` is linked locally to `@vscode-mcp/shared`.
- Changes in `shared` require a rebuild (`npm run build -w @vscode-mcp/shared`) to be picked up by other packages.
