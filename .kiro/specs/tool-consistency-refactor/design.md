# Design Document

## Overview

This design establishes a consistent pattern for defining, organizing, and registering MCP tools and resources in the VSCode MCP Proxy server. The refactoring will extract inline tool definitions, standardize the tool module structure, and separate concerns between tools, resources, and server initialization.

## Architecture

### Current State

- `rename-file.ts`: Properly structured tool module with exports
- `set_update_imports_setting`: Inline tool definition in `index.ts`
- `update-imports-enabled`: Inline resource definition in `index.ts`
- Inconsistent registration patterns

### Target State

```
packages/server/src/
├── tools/
│   ├── rename-file.ts
│   ├── set-update-imports-setting.ts
│   └── index.ts (tool registry helper)
├── resources/
│   ├── update-imports-enabled.ts
│   └── index.ts (resource registry helper)
├── index.ts (server initialization)
└── vscode-client.ts
```

## Components and Interfaces

### Tool Module Structure

Each tool module SHALL export the following:

```typescript
// Tool identifier
export const name: string;

// Tool metadata
export const description: {
  description: string;
  inputSchema: z.ZodSchema;
  examples?: any[];
  notes?: string;
};

// Tool implementation
export async function implementation(args: any): Promise<CallToolResult>;
```

### Resource Module Structure

Each resource module SHALL export the following:

```typescript
// Resource identifier
export const name: string;

// Resource template
export const template: ResourceTemplate;

// Resource metadata
export const metadata: {
  description: string;
};

// Resource handler
export async function handler(url: URL): Promise<ResourceContents>;
```

### Tool Registry Helper

A helper function to register tools consistently:

```typescript
function registerTool(
  server: McpServer,
  toolModule: {
    name: string;
    description: { inputSchema: z.ZodSchema };
    implementation: (args: any) => Promise<CallToolResult>;
  }
): void;
```

## Data Models

### Tool Module Interface

```typescript
interface ToolModule {
  name: string;
  description: {
    description: string;
    inputSchema: z.ZodSchema;
    examples?: any[];
    notes?: string;
  };
  implementation: (args: any) => Promise<CallToolResult>;
}
```

### Resource Module Interface

```typescript
interface ResourceModule {
  name: string;
  template: ResourceTemplate;
  metadata: {
    description: string;
  };
  handler: (url: URL) => Promise<ResourceContents>;
}
```

### Error Response Structure

```typescript
interface ToolErrorResult {
  content: [{
    type: "text";
    text: string; // Error message with context
  }];
  isError: true;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Tool module structure consistency
*For any* tool file in `packages/server/src/tools/`, the module should export `name` (string), `description` (object with inputSchema), and `implementation` (async function)
**Validates: Requirements 1.2, 1.4**

Property 2: Zod schema presence
*For any* tool module, the `description.inputSchema` property should be a valid Zod schema
**Validates: Requirements 1.3**

Property 3: Tool registration consistency
*For any* tool module, when registered with the server, the registration should use the module's exported `name`, `description.inputSchema`, and `implementation`
**Validates: Requirements 2.2**

Property 4: Error response structure
*For any* tool implementation and any error condition, the returned CallToolResult should have `isError: true` and a content array with error details
**Validates: Requirements 3.1, 3.4**

Property 5: Success response structure
*For any* tool implementation and any successful execution, the returned CallToolResult should have a content array describing the result
**Validates: Requirements 3.2**

Property 6: Validation error handling
*For any* tool and any invalid input that fails Zod validation, the tool should catch the error and return a formatted CallToolResult with `isError: true`
**Validates: Requirements 3.3**

Property 7: Tool description completeness
*For any* tool module, the `description.description` property should exist and be a non-empty string
**Validates: Requirements 4.1, 4.5**

Property 8: Parameter documentation
*For any* tool with parameters, each parameter in the Zod schema should include a `.describe()` call
**Validates: Requirements 4.2**

Property 9: Resource module structure consistency
*For any* resource file in `packages/server/src/resources/`, the module should export `name`, `template`, `metadata`, and `handler`
**Validates: Requirements 5.2**

Property 10: Tool-resource separation
*For any* file in the tools directory, it should not contain resource definitions, and vice versa
**Validates: Requirements 5.4**

Property 11: Registration helper consistency
*For any* tool registration in `index.ts`, the registration should use the same helper function or pattern
**Validates: Requirements 6.2**

## Error Handling

### Input Validation Errors

All tools SHALL wrap their implementation in a try-catch block that handles Zod validation errors:

```typescript
export async function implementation(args: any): Promise<CallToolResult> {
  try {
    INPUT_SCHEMA.parse(args);
    // ... implementation
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        content: [{
          type: "text",
          text: `Invalid input: ${error.errors.map(e => e.message).join(', ')}`
        }],
        isError: true
      };
    }
    // ... other error handling
  }
}
```

### Runtime Errors

All tools SHALL catch runtime errors and return structured error responses:

```typescript
catch (error: any) {
  return {
    content: [{
      type: "text",
      text: `Error in ${name}: ${error.message}`
    }],
    isError: true
  };
}
```

### VSCode Client Errors

When VSCode client operations fail, tools SHALL include context about the operation:

```typescript
catch (error: any) {
  return {
    content: [{
      type: "text",
      text: `Failed to ${operation}: ${error.message}`
    }],
    isError: true
  };
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify:
- Tool module exports have correct structure
- Input schemas validate expected inputs and reject invalid inputs
- Error handling returns properly formatted error responses
- Success cases return properly formatted success responses

### Property-Based Testing

Property-based tests will verify:
- All tool modules in the tools directory follow the same structure (Property 1)
- All tool registrations use consistent patterns (Property 3, 11)
- All error responses have the required structure (Property 4, 6)
- All success responses have the required structure (Property 5)
- All tool descriptions are complete (Property 7, 8)
- All resource modules follow consistent structure (Property 9)

We will use **fast-check** as the property-based testing library for TypeScript/Node.js. Each property-based test will run a minimum of 100 iterations.

### Integration Testing

Integration tests will verify:
- Tools can be successfully registered with the MCP server
- Tools can be invoked through the MCP protocol
- Resources can be accessed through the MCP protocol
- The VSCode client integration works correctly

### Test Organization

```
packages/server/test/
├── unit/
│   ├── tools/
│   │   ├── rename-file.test.ts
│   │   └── set-update-imports-setting.test.ts
│   └── resources/
│       └── update-imports-enabled.test.ts
├── property/
│   ├── tool-structure.test.ts
│   ├── error-handling.test.ts
│   └── registration.test.ts
└── integration/
    └── server.test.ts
```

## Implementation Notes

### Migration Strategy

1. Create the resources directory and extract the resource
2. Create the set-update-imports-setting tool module
3. Create tool and resource registry helpers
4. Update index.ts to use the helpers
5. Fix the typo in rename-file.ts ('alweys' → 'always')
6. Add comprehensive error handling to all tools
7. Add tests for all properties

### Backward Compatibility

This refactoring maintains backward compatibility:
- Tool names remain unchanged
- Tool input schemas remain unchanged
- Tool behavior remains unchanged
- Only internal organization changes

### Performance Considerations

- Tool registration happens once at server startup
- No runtime performance impact
- Slightly improved maintainability may lead to faster development cycles
