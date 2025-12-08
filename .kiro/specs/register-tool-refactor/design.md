# Design Document

## Overview

This design document outlines the refactoring of the VSCode MCP Proxy extension to use VSCode's native `registerTool` API for in-process tool execution, while also providing an HTTP MCP server for clients that cannot use `registerTool` (such as VSCodium or external MCP clients).

The refactoring eliminates all custom IPC code and replaces it with two clean integration paths:
1. **In-process tools** via `vscode.lm.registerTool` for VSCode's native agent
2. **HTTP MCP server** using standard MCP SSE transport for external clients

Both integration paths share the same tool implementations, ensuring consistency and reducing code duplication.

### Key Design Simplifications

After research into the MCP SDK and VSCode APIs, the design has been simplified significantly:

1. **Single Tool Interface**: Tools directly return `CallToolResult` from the MCP SDK, eliminating the need for format conversion between integration paths

2. **No Duplicate Validation**: Tool implementations handle their own validation and error handling, so integration adapters are just thin wrappers

3. **Direct Registration**: Both `registerTool` and HTTP server can register tools directly without transformation:
   ```typescript
   // registerTool
   vscode.lm.registerTool(tool.name, tool.description, tool.implementation);
   
   // HTTP server
   mcpServer.registerTool(tool.name, tool.description, tool.implementation);
   ```

4. **Standard MCP Types**: Using `CallToolResult` from the MCP SDK means we don't need custom result types

5. **SSE Transport**: Using the standard SSE (Server-Sent Events) transport for HTTP instead of custom protocols

These simplifications reduce code complexity, improve maintainability, and ensure both integration paths behave identically.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                          │
│                                                              │
│  ┌────────────────────┐      ┌─────────────────────────┐   │
│  │  registerTool      │      │  HTTP MCP Server        │   │
│  │  Integration       │      │  (Optional)             │   │
│  └────────┬───────────┘      └──────────┬──────────────┘   │
│           │                              │                   │
│           └──────────┬───────────────────┘                   │
│                      │                                       │
│           ┌──────────▼──────────┐                           │
│           │  Shared Tool        │                           │
│           │  Implementations    │                           │
│           └──────────┬──────────┘                           │
│                      │                                       │
│           ┌──────────▼──────────┐                           │
│           │  VSCode API Layer   │                           │
│           │  (WorkspaceEdit,    │                           │
│           │   Settings, etc.)   │                           │
│           └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ HTTP (when enabled)
                      ▼
         ┌────────────────────────┐
         │  External MCP Clients  │
         │  (fastmcp, VSCodium,   │
         │   custom clients)      │
         └────────────────────────┘
```

### Component Responsibilities

1. **Extension Entry Point** (`extension.ts`)
   - Reads configuration settings
   - Conditionally registers tools via `registerTool` (when available)
   - Conditionally starts HTTP MCP server (when enabled)
   - Manages lifecycle and cleanup

2. **Tool Registry** (`tools/`)
   - Defines tool metadata (name, description, schema)
   - Implements tool logic using VSCode APIs
   - Exports tools in a format compatible with both integration paths

3. **registerTool Integration** (`integrations/register-tool.ts`)
   - Adapts tool definitions for `vscode.lm.registerTool`
   - Handles tool invocation from VSCode agent
   - Converts between MCP and VSCode tool formats

4. **HTTP MCP Server** (`integrations/http-server.ts`)
   - Starts HTTP server using MCP SDK
   - Registers tools with MCP server
   - Handles HTTP transport and MCP protocol

5. **VSCode API Adapter** (`vscode-api/`)
   - Provides abstraction over VSCode APIs
   - Used by tool implementations
   - Ensures consistent behavior across integration paths

## Components and Interfaces

### Tool Definition Interface

We'll simplify by reusing the existing pattern from the current codebase, which already works well with the MCP SDK:

```typescript
// packages/shared/src/tool.ts
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * A tool that can be registered with both registerTool and HTTP MCP server
 */
export interface Tool {
  /** Unique tool identifier */
  name: string;
  
  /** Tool metadata */
  description: {
    description: string;
    inputSchema: z.ZodSchema;
    examples?: any[];
    notes?: string;
  };
  
  /** Tool implementation - returns MCP CallToolResult */
  implementation: (args: any) => Promise<CallToolResult>;
}
```

This interface is simpler because:
1. It directly returns `CallToolResult` which both integration paths can use
2. It matches the existing tool registry pattern
3. No need for separate input/output generics
4. No need for format conversion between integration paths

### Tool Implementation Pattern

```typescript
// packages/extension/src/tools/rename-file.ts
import { z } from 'zod';
import { Tool } from '@vscode-mcp/shared';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as vscode from 'vscode';

const inputSchema = z.object({
  oldUri: z.string().describe('The current file URI'),
  newUri: z.string().describe('The new file URI'),
});

export const renameFileTool: Tool = {
  name: 'rename_file',
  
  description: {
    description: 'Rename a file and update all imports',
    inputSchema,
    examples: [{
      oldUri: 'file:///workspace/old.ts',
      newUri: 'file:///workspace/new.ts',
    }],
  },
  
  async implementation(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = inputSchema.parse(args);
      
      // Ensure imports will be updated
      const config = vscode.workspace.getConfiguration('typescript');
      const currentValue = config.get('updateImportsOnFileMove.enabled');
      
      if (currentValue !== 'always') {
        await config.update('updateImportsOnFileMove.enabled', 'always', false);
      }
      
      // Perform the rename
      const edit = new vscode.WorkspaceEdit();
      edit.renameFile(
        vscode.Uri.parse(input.oldUri),
        vscode.Uri.parse(input.newUri)
      );
      
      const success = await vscode.workspace.applyEdit(edit);
      
      return {
        content: [{
          type: 'text',
          text: `Renamed file from ${input.oldUri} to ${input.newUri}. Success: ${success}. Imports updated: ${currentValue === 'always'}`,
        }],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [{
            type: 'text',
            text: `Validation error: ${error.issues.map(i => i.message).join(', ')}`,
          }],
          isError: true,
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  },
};
```

This pattern is simpler because:
1. Tool directly returns `CallToolResult` - no conversion needed
2. Validation and error handling are built into the implementation
3. Same code works for both registerTool and HTTP server
4. Matches the existing codebase pattern

### registerTool Integration

```typescript
// packages/extension/src/integrations/register-tool.ts
import * as vscode from 'vscode';
import { Tool } from '@vscode-mcp/shared';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function registerToolWithVSCode(
  context: vscode.ExtensionContext,
  tool: Tool
): void {
  // Check if registerTool is available
  if (!vscode.lm?.registerTool) {
    throw new Error('vscode.lm.registerTool is not available');
  }
  
  const disposable = vscode.lm.registerTool(
    tool.name,
    {
      description: tool.description.description,
      inputSchema: zodToJsonSchema(tool.description.inputSchema),
    },
    async (input: any, token: vscode.CancellationToken) => {
      // Tool implementation already handles validation and error handling
      // Just call it directly and return the result
      return await tool.implementation(input);
    }
  );
  
  context.subscriptions.push(disposable);
}
```

This is much simpler because:
1. No duplicate validation - tool implementation handles it
2. No format conversion - tool already returns `CallToolResult`
3. Just a thin adapter that passes through to the tool implementation

### HTTP MCP Server Integration

```typescript
// packages/extension/src/integrations/http-server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Tool } from '@vscode-mcp/shared';
import * as http from 'http';

export class HttpMcpServer {
  private server: McpServer | undefined;
  private httpServer: http.Server | undefined;
  private port: number = 0;
  private actualPort: number = 0;
  
  constructor(port: number) {
    this.port = port;
  }
  
  async start(tools: Tool[]): Promise<number> {
    this.server = new McpServer({
      name: 'vscode-refactoring-tools',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });
    
    // Register all tools - much simpler now!
    for (const tool of tools) {
      this.server.registerTool(
        tool.name,
        tool.description,
        tool.implementation
      );
    }
    
    // Create HTTP server with SSE transport
    this.httpServer = http.createServer();
    const transport = new SSEServerTransport('/message', this.httpServer);
    
    await this.server.connect(transport);
    
    // Start listening
    await new Promise<void>((resolve) => {
      this.httpServer!.listen(this.port, 'localhost', () => {
        const addr = this.httpServer!.address();
        this.actualPort = typeof addr === 'object' ? addr!.port : this.port;
        resolve();
      });
    });
    
    return this.actualPort;
  }
  
  getPort(): number {
    return this.actualPort;
  }
  
  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
      this.server = undefined;
    }
    
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = undefined;
    }
  }
}
```

This is dramatically simpler because:
1. Tools are registered directly - no conversion needed
2. Tool implementation already returns `CallToolResult`
3. No duplicate validation or error handling
4. Uses SSE transport which is standard for MCP HTTP servers

### Configuration Management

```typescript
// packages/extension/src/config.ts
import * as vscode from 'vscode';

export interface ExtensionConfig {
  enableHttpServer: boolean;
  httpPort: number;
}

export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('vscode-mcp-proxy');
  
  return {
    enableHttpServer: config.get('enableHttpServer', false),
    httpPort: config.get('httpPort', 0),
  };
}
```

## Data Models

### Tool Result Format

We use the MCP SDK's `CallToolResult` type directly - no custom types needed:

```typescript
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// CallToolResult from MCP SDK:
// {
//   content: Array<{
//     type: 'text' | 'image' | 'resource';
//     text?: string;
//     data?: string;
//     mimeType?: string;
//   }>;
//   isError?: boolean;
// }
```

This simplification means:
1. No custom result types to maintain
2. Direct compatibility with both integration paths
3. Standard MCP protocol compliance
4. Less code to test and maintain

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, we identified several properties that can be tested across all inputs, and some specific examples/edge cases. Here are the key correctness properties:

### Property 1: Tool execution consistency across integration paths

*For any* tool and valid input, executing the tool via `registerTool` should produce the same result as executing it via the HTTP MCP server.

**Validates: Requirements 2.2, 3.3**

### Property 2: Tool result format compliance

*For any* tool execution result, the output should conform to the MCP tool response schema with content array and optional isError flag.

**Validates: Requirements 1.3**

### Property 3: HTTP server concurrent request handling

*For any* set of concurrent HTTP requests to different tools, each request should complete independently and return correct results without interference.

**Validates: Requirements 3.4**

### Property 4: Port configuration validation

*For any* configured port number, if it's not 0, the system should validate it's within the range 1-65535 before attempting to bind.

**Validates: Requirements 4.9**

### Property 5: File rename with valid URIs

*For any* pair of valid file URIs (source and destination), the rename file tool should successfully execute a workspace edit.

**Validates: Requirements 5.1**

### Property 6: TypeScript import update setting enforcement

*For any* TypeScript or JavaScript file rename operation, the system should ensure the `typescript.updateImportsOnFileMove.enabled` setting is checked and set to 'always' if needed.

**Validates: Requirements 5.2**

### Property 7: File rename result includes import status

*For any* file rename operation result, the response should include information about whether imports were updated.

**Validates: Requirements 5.3**

### Property 8: Failed operations return errors

*For any* tool operation that fails (file rename, symbol rename, setting operation), the system should return an error message with details.

**Validates: Requirements 5.4, 6.4, 7.4**

### Property 9: Input validation errors are descriptive

*For any* invalid tool input that fails schema validation, the system should return a structured error response with validation details.

**Validates: Requirements 5.5, 6.5, 9.1**

### Property 10: Symbol rename locates and updates all references

*For any* valid symbol rename request (file URI, original name, new name), the system should locate the symbol and update all references in the workspace.

**Validates: Requirements 6.1, 6.2**

### Property 11: Setting operations retrieve and update correctly

*For any* setting key and scope (workspace or user), get operations should retrieve the current value and set operations should persist the new value.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 12: Runtime errors are caught and returned

*For any* runtime error during tool execution, the system should catch the error and return a descriptive error message without crashing.

**Validates: Requirements 9.2**

### Property 13: Tool registration failures don't crash extension

*For any* tool that fails to register, the system should log the error and continue registering other tools.

**Validates: Requirements 9.4**

### Property 14: Extension stability under errors

*For any* error condition (validation, runtime, registration), the extension should remain in a consistent state and not crash.

**Validates: Requirements 9.5**

### Property 15: HTTP server exposes all tools

*For any* HTTP client connection, the MCP protocol should expose all registered tools with their complete definitions.

**Validates: Requirements 3.2**

## Error Handling

### Error Categories

1. **Validation Errors**
   - Invalid input schema
   - Invalid port numbers
   - Invalid URIs
   - Response: Structured error with validation details

2. **Runtime Errors**
   - File not found
   - Symbol not found
   - Permission denied
   - Workspace edit failed
   - Response: Descriptive error message

3. **Configuration Errors**
   - Port already in use
   - Invalid configuration values
   - Response: Log error, use fallback or disable feature

4. **Registration Errors**
   - Tool registration fails
   - HTTP server fails to start
   - Response: Log error, continue with partial functionality

### Error Handling Strategy

All error handling is centralized in the tool implementation:

```typescript
async implementation(args: any): Promise<CallToolResult> {
  try {
    // Validate input
    const input = inputSchema.parse(args);
    
    // Perform operation
    const result = await performOperation(input);
    
    // Return success
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (error) {
    // Validation errors
    if (error instanceof z.ZodError) {
      return {
        content: [{
          type: 'text',
          text: `Validation error: ${error.issues.map(i => i.message).join(', ')}`,
        }],
        isError: true,
      };
    }
    
    // Runtime errors
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
```

Registration errors are handled at the integration layer:

```typescript
// In extension.ts
for (const tool of tools) {
  try {
    registerToolWithVSCode(context, tool);
  } catch (error) {
    logger.error(`Failed to register tool ${tool.name}:`, error);
    // Continue with other tools
  }
}
```

This approach is simpler because:
1. Single error handling location per tool
2. Both integration paths get the same error handling
3. No duplicate error handling code
4. Clear separation between tool errors and registration errors

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

1. **Configuration Loading**
   - Test default values
   - Test workspace vs user settings
   - Test invalid configuration handling

2. **Tool Registration**
   - Test registerTool integration
   - Test HTTP server tool registration
   - Test registration error handling

3. **Error Handling**
   - Test validation error formatting
   - Test runtime error catching
   - Test error response structure

4. **Port Allocation**
   - Test port 0 (random port)
   - Test specific port binding
   - Test port conflict handling

### Property-Based Testing

Property-based tests will verify universal properties across many inputs:

1. **Tool Execution Consistency (Property 1)**
   - Generate random tool inputs
   - Execute via both registerTool and HTTP server
   - Verify results are equivalent

2. **Concurrent Request Handling (Property 3)**
   - Generate random sets of concurrent requests
   - Execute all requests simultaneously
   - Verify each completes independently with correct results

3. **Input Validation (Property 9)**
   - Generate invalid inputs (wrong types, missing fields, etc.)
   - Verify all return structured validation errors
   - Verify error messages are descriptive

4. **File Rename Operations (Property 5, 6, 7)**
   - Generate random valid file URIs
   - Execute rename operations
   - Verify workspace edits are created
   - Verify import settings are checked
   - Verify results include import status

5. **Symbol Rename Operations (Property 10)**
   - Generate random symbol rename requests
   - Verify symbols are located
   - Verify all references are updated

6. **Setting Operations (Property 11)**
   - Generate random setting keys and values
   - Verify get operations retrieve correct values
   - Verify set operations persist values
   - Verify round-trip consistency

7. **Error Stability (Property 14)**
   - Generate various error conditions
   - Verify extension remains stable
   - Verify no crashes or inconsistent state

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Extension Activation**
   - Verify tools are registered when registerTool is available
   - Verify HTTP server starts when enabled
   - Verify status bar updates

2. **HTTP Server Lifecycle**
   - Start server with various configurations
   - Connect external clients
   - Execute tools via HTTP
   - Stop server cleanly

3. **Tool Execution Workflows**
   - Rename file and verify imports updated
   - Rename symbol and verify references updated
   - Modify settings and verify persistence

## Implementation Notes

### Package Structure Changes

The refactoring will reorganize the codebase:

```
packages/
├── extension/
│   ├── src/
│   │   ├── extension.ts              # Entry point
│   │   ├── config.ts                 # Configuration management
│   │   ├── integrations/
│   │   │   ├── register-tool.ts      # registerTool integration
│   │   │   └── http-server.ts        # HTTP MCP server
│   │   ├── tools/
│   │   │   ├── index.ts              # Tool exports
│   │   │   ├── rename-file.ts        # Rename file tool
│   │   │   ├── rename-symbol.ts      # Rename symbol tool
│   │   │   └── settings.ts           # Settings tools
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── zod-to-json-schema.ts
│   └── package.json
├── shared/
│   ├── src/
│   │   ├── tool.ts                   # Tool interfaces
│   │   └── index.ts
│   └── package.json
└── server/                            # DEPRECATED - to be removed
```

### Dependencies

New dependencies needed:

```json
{
  "@modelcontextprotocol/sdk": "^1.23.0",
  "zod": "^4.1.13",
  "zod-to-json-schema": "^3.25.0"
}
```

### Migration Path

1. **Phase 1: Create new tool structure**
   - Define Tool interface in shared package
   - Implement tools using new pattern
   - Keep old IPC code functional

2. **Phase 2: Implement registerTool integration**
   - Create registerTool adapter
   - Register tools when available
   - Test with VSCode agent

3. **Phase 3: Implement HTTP MCP server**
   - Create HTTP server integration
   - Add configuration settings
   - Add status bar UI

4. **Phase 4: Remove old code**
   - Remove IPC server code
   - Remove external server package
   - Update documentation

### Configuration Schema

```json
{
  "vscode-mcp-proxy.enableHttpServer": {
    "type": "boolean",
    "default": false,
    "description": "Enable the HTTP MCP server for external clients"
  },
  "vscode-mcp-proxy.httpPort": {
    "type": ["number", "null"],
    "default": 0,
    "description": "Port for HTTP MCP server (0 = random port, null = disabled)"
  }
}
```

### Status Bar UI

The extension will show a status bar item when the HTTP server is running:

```
┌─────────────────────────────┐
│ $(server) MCP: localhost:3000 │
└─────────────────────────────┘
```

Clicking the status bar item shows a quick pick menu:
- Copy Server URL
- Stop Server
- View Logs
