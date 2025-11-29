# Requirements Document

## Introduction

This feature adds two essential refactoring capabilities to the VSCode MCP Proxy: organizing imports and renaming symbols. These operations leverage VSCode's built-in language services to perform intelligent code refactoring that respects language semantics and updates all references across the workspace.

## Glossary

- **MCP Server**: The Model Context Protocol server that connects to the VSCode extension via IPC
- **IPC Server**: The Inter-Process Communication server hosted by the VSCode extension
- **Symbol**: A named entity in code (variable, function, class, interface, etc.)
- **Organize Imports**: A language service operation that sorts, groups, and removes unused imports
- **Rename Symbol**: A language service operation that renames a symbol and all its references
- **VSCode Command**: A built-in VSCode command accessible via `vscode.commands.executeCommand`
- **URI**: Uniform Resource Identifier in the format `file:///path/to/file`
- **Document Symbol**: A named entity in a document that can be located by the language service

## Requirements

### Requirement 1

**User Story:** As an MCP client, I want to organize imports in a TypeScript or JavaScript file, so that imports are properly sorted and unused imports are removed.

#### Acceptance Criteria

1. WHEN the MCP client calls the organize imports tool with a valid file URI THEN the system SHALL use vscode.executeCodeActionProvider with CodeActionKind.SourceOrganizeImports
2. WHEN code actions are retrieved THEN the system SHALL execute each returned command in sequence
3. WHEN organize imports commands are executed THEN the system SHALL sort imports alphabetically and group them by type
4. WHEN organize imports commands are executed THEN the system SHALL remove unused import statements
5. IF no organize import actions are available THEN the system SHALL return a message indicating the operation is not supported for this file
6. WHEN organize imports completes successfully THEN the system SHALL return a success message with the file URI and number of actions executed

### Requirement 2

**User Story:** As an MCP client, I want to rename a symbol by its name in a file, so that all references to that symbol are updated consistently across the workspace.

#### Acceptance Criteria

1. WHEN the MCP client calls the rename symbol tool with a file URI, original name, and new name THEN the system SHALL search for the symbol by name in the document and use VSCode's rename provider to prepare rename edits
2. WHEN rename symbol is executed THEN the system SHALL apply the WorkspaceEdit to update all references to the symbol across all files in the workspace
3. WHEN rename symbol is executed THEN the system SHALL preserve code semantics and respect language scoping rules
4. IF no symbol with the specified name exists in the document THEN the system SHALL return an error message indicating the symbol was not found
5. IF the rename operation is rejected by the language service THEN the system SHALL return an error message with the rejection reason
6. WHEN rename symbol completes successfully THEN the system SHALL return a success message with the count of files modified and total edits applied

### Requirement 3

**User Story:** As a system architect, I want the refactoring commands to use VSCode's native language services, so that operations are language-aware and respect project configuration.

#### Acceptance Criteria

1. WHEN refactoring commands are executed THEN the system SHALL use VSCode's executeCommand API
2. WHEN organize imports is invoked THEN the system SHALL use vscode.executeCodeActionProvider with CodeActionKind.SourceOrganizeImports to retrieve code actions
3. WHEN code actions are retrieved THEN the system SHALL execute the commands returned by the code action provider
4. WHEN rename symbol is invoked THEN the system SHALL use vscode.executeDocumentRenameProvider to prepare rename edits
5. WHEN language services are invoked THEN the system SHALL respect the workspace's TypeScript/JavaScript configuration
6. WHEN errors occur during command execution THEN the system SHALL capture and return descriptive error messages

### Requirement 4

**User Story:** As an MCP server developer, I want consistent command patterns in the IPC protocol, so that adding new commands follows established conventions.

#### Acceptance Criteria

1. WHEN new commands are added to the protocol THEN the system SHALL define them in the VSCodeCommand enum
2. WHEN new commands are added THEN the system SHALL include corresponding TypeScript interfaces for arguments
3. WHEN commands are processed by the IPC server THEN the system SHALL follow the existing request/response pattern
4. WHEN commands are exposed as MCP tools THEN the system SHALL include Zod schemas for input validation

### Requirement 5

**User Story:** As an MCP client, I want clear error messages when refactoring operations fail, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a refactoring command fails THEN the system SHALL return an error response with a descriptive message
2. WHEN input validation fails THEN the system SHALL return specific validation error details
3. WHEN a file does not exist THEN the system SHALL return an error indicating the file was not found
4. WHEN a symbol name does not exist in the document THEN the system SHALL return an error indicating the symbol was not found
5. WHEN VSCode command execution fails THEN the system SHALL return the underlying error message from VSCode
