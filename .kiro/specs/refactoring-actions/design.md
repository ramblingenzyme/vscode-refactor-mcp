# Design Document

## Overview

This design adds two refactoring capabilities to the VSCode MCP Proxy: organizing imports and renaming symbols. The implementation extends the existing IPC protocol with new commands that leverage VSCode's language service providers to perform intelligent, language-aware refactoring operations.

## Architecture

The solution follows the existing three-layer architecture:

1. **MCP Tools Layer** (packages/server/src/tools/): Exposes refactoring operations as MCP tools with Zod validation
2. **IPC Protocol Layer** (packages/shared/src/protocol.ts): Defines type-safe command contracts
3. **VSCode Extension Layer** (packages/extension/src/ipc/server.ts): Executes VSCode API calls and returns results

### Data Flow

```
MCP Client → MCP Tool → VSCode Client → IPC Request → IPC Server → VSCode API → Response
```

## Components and Interfaces

### 1. Protocol Extensions (packages/shared/src/protocol.ts)

Add new commands to the VSCodeCommand enum:

```typescript
export enum VSCodeCommand {
  RENAME_FILE = "renameFile",
  GET_SETTING = "getSetting",
  SET_SETTING = "setSetting",
  ORGANIZE_IMPORTS = "organizeImports",
  RENAME_SYMBOL = "renameSymbol",
}
```

Add argument interfaces:

```typescript
export interface OrganizeImportsArgs {
  uri: string;
}

export interface RenameSymbolArgs {
  uri: string;
  position: {
    line: number;
    character: number;
  };
  newName: string;
}
```

### 2. IPC Server Handler (packages/extension/src/ipc/server.ts)

Add case handlers in the `processMessage` method:

**Organize Imports Handler:**

```typescript
case VSCodeCommand.ORGANIZE_IMPORTS:
    const { uri } = request.arguments;
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
    const range = new vscode.Range(0, 0, document.lineCount, 0);

    const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        'vscode.executeCodeActionProvider',
        vscode.Uri.parse(uri),
        range,
        vscode.CodeActionKind.SourceOrganizeImports.value
    );

    if (!codeActions || codeActions.length === 0) {
        response.result = { success: false, message: 'No organize imports actions available' };
        break;
    }

    // Execute each code action command
    let actionsExecuted = 0;
    for (const action of codeActions) {
        if (action.command) {
            await vscode.commands.executeCommand(action.command.command, ...action.command.arguments || []);
            actionsExecuted++;
        }
    }

    response.result = { success: true, actionsExecuted };
    break;
```

**Rename Symbol Handler:**

```typescript
case VSCodeCommand.RENAME_SYMBOL:
    const { uri, position, newName } = request.arguments;
    const pos = new vscode.Position(position.line, position.character);

    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
        'vscode.executeDocumentRenameProvider',
        vscode.Uri.parse(uri),
        pos,
        newName
    );

    if (!workspaceEdit) {
        response.result = { success: false, message: 'No symbol found at position' };
        break;
    }

    const success = await vscode.workspace.applyEdit(workspaceEdit);
    const stats = {
        filesModified: workspaceEdit.size,
        totalEdits: Array.from(workspaceEdit.entries()).reduce((sum, [_, edits]) => sum + edits.length, 0)
    };

    response.result = { success, ...stats };
    break;
```

### 3. MCP Tools (packages/server/src/tools/)

**organize-imports.ts:**

```typescript
import { VSCodeCommand } from "@vscode-mcp/shared";
import { getVSCodeClient } from "../vscode-client.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";

const INPUT_SCHEMA = z.object({
  uri: z.string().describe("The file URI (e.g., 'file:///path/to/file.ts')"),
});

export const name = "organize_imports";

export const description = {
  description:
    "Organize imports in a TypeScript or JavaScript file by sorting and removing unused imports.",
  inputSchema: INPUT_SCHEMA,
  examples: [{ uri: "file:///home/user/project/src/index.ts" }],
  notes:
    "Uses VSCode's language service to organize imports. Supports TypeScript and JavaScript files.",
};

export async function implementation(request: {
  uri: string;
}): Promise<CallToolResult> {
  try {
    INPUT_SCHEMA.parse(request);
    const { uri } = request;

    const client = getVSCodeClient();
    const result = await client.sendRequest(VSCodeCommand.ORGANIZE_IMPORTS, {
      uri,
    });

    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to organize imports: ${result.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Organized imports in ${uri}. Actions executed: ${result.actionsExecuted}`,
        },
      ],
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid input: ${error.issues
              .map((e) => e.message)
              .join(", ")}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Error in ${name}: ${error.message}` }],
      isError: true,
    };
  }
}
```

**rename-symbol.ts:**

```typescript
import { VSCodeCommand } from "@vscode-mcp/shared";
import { getVSCodeClient } from "../vscode-client.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";

const INPUT_SCHEMA = z.object({
  uri: z.string().describe("The file URI containing the symbol"),
  position: z
    .object({
      line: z.number().describe("Zero-based line number"),
      character: z.number().describe("Zero-based character offset"),
    })
    .describe("Position of the symbol to rename"),
  newName: z.string().describe("New name for the symbol"),
});

export const name = "rename_symbol";

export const description = {
  description:
    "Rename a symbol and update all references across the workspace.",
  inputSchema: INPUT_SCHEMA,
  examples: [
    {
      uri: "file:///home/user/project/src/utils.ts",
      position: { line: 10, character: 15 },
      newName: "newFunctionName",
    },
  ],
  notes:
    "Uses VSCode's language service to find and rename all references. Position is zero-based.",
};

export async function implementation(request: {
  uri: string;
  position: { line: number; character: number };
  newName: string;
}): Promise<CallToolResult> {
  try {
    INPUT_SCHEMA.parse(request);
    const { uri, position, newName } = request;

    const client = getVSCodeClient();
    const result = await client.sendRequest(VSCodeCommand.RENAME_SYMBOL, {
      uri,
      position,
      newName,
    });

    if (!result.success) {
      return {
        content: [
          { type: "text", text: `Failed to rename symbol: ${result.message}` },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Renamed symbol to '${newName}'. Files modified: ${result.filesModified}, Total edits: ${result.totalEdits}`,
        },
      ],
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid input: ${error.issues
              .map((e) => e.message)
              .join(", ")}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Error in ${name}: ${error.message}` }],
      isError: true,
    };
  }
}
```

### 4. Tool Registration (packages/server/src/tools/index.ts)

Update to export new tools:

```typescript
import * as renameFile from "./rename-file.js";
import * as setUpdateImportsSetting from "./set-update-imports-setting.js";
import * as organizeImports from "./organize-imports.js";
import * as renameSymbol from "./rename-symbol.js";

export const tools = [
  renameFile,
  setUpdateImportsSetting,
  organizeImports,
  renameSymbol,
];
```

## Data Models

### Position

```typescript
interface Position {
  line: number; // Zero-based line number
  character: number; // Zero-based character offset
}
```

### OrganizeImportsResult

```typescript
interface OrganizeImportsResult {
  success: boolean;
  actionsExecuted?: number;
  message?: string;
}
```

### RenameSymbolResult

```typescript
interface RenameSymbolResult {
  success: boolean;
  filesModified?: number;
  totalEdits?: number;
  message?: string;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Acceptance Criteria Testing Prework

1.1 WHEN the MCP client calls the organize imports tool with a valid file URI THEN the system SHALL use vscode.executeCodeActionProvider with CodeActionKind.SourceOrganizeImports
Thoughts: This is testing that for any valid file URI, the system correctly invokes the VSCode API. We can test this by generating random valid URIs and verifying the API is called.
Testable: yes - property

1.2 WHEN code actions are retrieved THEN the system SHALL execute each returned command in sequence
Thoughts: This is about the behavior when code actions exist. We can mock code actions and verify all commands are executed.
Testable: yes - property

1.3 WHEN organize imports commands are executed THEN the system SHALL sort imports alphabetically and group them by type
Thoughts: This is testing the actual behavior of VSCode's organize imports, which is outside our control. We rely on VSCode's implementation.
Testable: no

1.4 WHEN organize imports commands are executed THEN the system SHALL remove unused import statements
Thoughts: This is testing VSCode's organize imports behavior, not our code.
Testable: no

1.5 IF no organize import actions are available THEN the system SHALL return a message indicating the operation is not supported for this file
Thoughts: This is testing error handling for a specific case. We can test this with files that don't support organize imports.
Testable: yes - example

1.6 WHEN organize imports completes successfully THEN the system SHALL return a success message with the file URI and number of actions executed
Thoughts: This is testing the response format for successful operations. We can verify this across different successful scenarios.
Testable: yes - property

2.1 WHEN the MCP client calls the rename symbol tool with a file URI, position, and new name THEN the system SHALL use vscode.executeDocumentRenameProvider to prepare rename edits
Thoughts: This is testing that the correct VSCode API is invoked for any valid input. We can generate random valid inputs and verify the API call.
Testable: yes - property

2.2 WHEN rename symbol is executed THEN the system SHALL apply the WorkspaceEdit to update all references to the symbol across all files in the workspace
Thoughts: This is testing that WorkspaceEdit is applied when returned. We can verify applyEdit is called with the returned WorkspaceEdit.
Testable: yes - property

2.3 WHEN rename symbol is executed THEN the system SHALL preserve code semantics and respect language scoping rules
Thoughts: This is testing VSCode's rename provider behavior, not our code.
Testable: no

2.4 IF no symbol exists at the specified position THEN the system SHALL return an error message indicating no symbol found
Thoughts: This is testing error handling for a specific case.
Testable: yes - example

2.5 IF the rename operation is rejected by the language service THEN the system SHALL return an error message with the rejection reason
Thoughts: This is testing error handling when VSCode returns null/undefined.
Testable: yes - example

2.6 WHEN rename symbol completes successfully THEN the system SHALL return a success message with the count of files modified and total edits applied
Thoughts: This is testing the response format includes correct statistics. We can verify this across different successful renames.
Testable: yes - property

3.1 WHEN refactoring commands are executed THEN the system SHALL use VSCode's executeCommand API
Thoughts: This is a general requirement that both commands use executeCommand. We can verify this for both operations.
Testable: yes - property

3.2 WHEN organize imports is invoked THEN the system SHALL use vscode.executeCodeActionProvider with CodeActionKind.SourceOrganizeImports to retrieve code actions
Thoughts: Duplicate of 1.1
Testable: yes - property (covered by Property 1)

3.3 WHEN code actions are retrieved THEN the system SHALL execute the commands returned by the code action provider
Thoughts: Duplicate of 1.2
Testable: yes - property (covered by Property 2)

3.4 WHEN rename symbol is invoked THEN the system SHALL use vscode.executeDocumentRenameProvider to prepare rename edits
Thoughts: Duplicate of 2.1
Testable: yes - property (covered by Property 3)

3.5 WHEN language services are invoked THEN the system SHALL respect the workspace's TypeScript/JavaScript configuration
Thoughts: This is testing VSCode's behavior, not our code.
Testable: no

3.6 WHEN errors occur during command execution THEN the system SHALL capture and return descriptive error messages
Thoughts: This is testing error handling across all operations. We can verify errors are caught and returned properly.
Testable: yes - property

4.1 WHEN new commands are added to the protocol THEN the system SHALL define them in the VSCodeCommand enum
Thoughts: This is a design requirement about code structure, not runtime behavior.
Testable: no

4.2 WHEN new commands are added THEN the system SHALL include corresponding TypeScript interfaces for arguments
Thoughts: This is a design requirement about code structure, not runtime behavior.
Testable: no

4.3 WHEN commands are processed by the IPC server THEN the system SHALL follow the existing request/response pattern
Thoughts: This is testing that the protocol format is consistent. We can verify request/response structure.
Testable: yes - property

4.4 WHEN commands are exposed as MCP tools THEN the system SHALL include Zod schemas for input validation
Thoughts: This is a design requirement about code structure, not runtime behavior.
Testable: no

5.1 WHEN a refactoring command fails THEN the system SHALL return an error response with a descriptive message
Thoughts: This is testing error responses contain messages. We can verify this across different failure scenarios.
Testable: yes - property

5.2 WHEN input validation fails THEN the system SHALL return specific validation error details
Thoughts: This is testing Zod validation error handling. We can test with invalid inputs.
Testable: yes - property

5.3 WHEN a file does not exist THEN the system SHALL return an error indicating the file was not found
Thoughts: This is testing a specific error case.
Testable: yes - example

5.4 WHEN a position is out of bounds THEN the system SHALL return an error indicating invalid position
Thoughts: This is testing a specific error case.
Testable: yes - example

5.5 WHEN VSCode command execution fails THEN the system SHALL return the underlying error message from VSCode
Thoughts: This is testing that VSCode errors are propagated. We can verify error messages are passed through.
Testable: yes - property

### Property Reflection

After reviewing all testable properties:

- Properties 3.2, 3.3, and 3.4 are duplicates of 1.1, 1.2, and 2.1 respectively
- Properties about response format (1.6, 2.6) can be combined into a single property about consistent response structure
- Properties about error handling (3.6, 5.1, 5.5) can be combined into a comprehensive error handling property

Consolidated properties:

1. API invocation correctness (1.1, 2.1, 3.1)
2. Command execution completeness (1.2)
3. Response structure consistency (1.6, 2.6, 4.3)
4. Error handling and propagation (3.6, 5.1, 5.2, 5.5)

## Correctness Properties

Property 1: VSCode API invocation correctness
_For any_ valid organize imports request, the system should invoke vscode.executeCodeActionProvider with CodeActionKind.SourceOrganizeImports, and _for any_ valid rename symbol request, the system should invoke vscode.executeDocumentRenameProvider
**Validates: Requirements 1.1, 2.1, 3.1**

Property 2: Code action execution completeness
_For any_ organize imports operation that returns code actions, all returned commands should be executed in sequence
**Validates: Requirements 1.2**

Property 3: Response structure consistency
_For any_ successful refactoring operation, the response should include a success field and operation-specific metadata (actionsExecuted for organize imports, filesModified and totalEdits for rename symbol)
**Validates: Requirements 1.6, 2.6, 4.3**

Property 4: Error handling and propagation
_For any_ refactoring operation that fails, the system should return an error response with isError: true and a descriptive error message, including validation errors from Zod and execution errors from VSCode
**Validates: Requirements 3.6, 5.1, 5.2, 5.5**

## Error Handling

### Input Validation Errors

- Invalid URI format → Zod validation error with specific field details
- Missing required fields → Zod validation error
- Invalid position (negative numbers) → Zod validation error

### VSCode API Errors

- File not found → Error message from VSCode workspace API
- No symbol at position → Return success: false with descriptive message
- No organize imports actions available → Return success: false with descriptive message
- Language service unavailable → Error from VSCode command execution

### IPC Communication Errors

- Connection lost → Handled by existing vscode-client error handling
- Timeout → Handled by existing request timeout mechanism
- Invalid response format → JSON parse error caught and returned

## Testing Strategy

### Unit Tests

- Test Zod schema validation with valid and invalid inputs
- Test tool implementation error handling
- Test protocol interface type correctness

### Property-Based Tests

We will use fast-check for property-based testing in TypeScript.

**Property Test 1: API Invocation**

- Generate random valid URIs and positions
- Verify correct VSCode API is called with correct parameters
- Mock vscode.commands.executeCommand to verify invocations

**Property Test 2: Command Execution**

- Generate random arrays of code actions with commands
- Verify all commands are executed
- Track execution order

**Property Test 3: Response Structure**

- Generate random successful operation results
- Verify response always includes required fields
- Verify field types match interfaces

**Property Test 4: Error Handling**

- Generate random error scenarios (invalid input, VSCode errors, etc.)
- Verify all errors result in proper error responses
- Verify error messages are descriptive

### Integration Tests

- Test organize imports on actual TypeScript files
- Test rename symbol on actual code with multiple references
- Verify changes are applied correctly
- Test with files that don't support operations

### Edge Cases

- Empty files
- Files with no imports
- Symbols with no references
- Position at end of file
- Very large files
- Files with syntax errors
