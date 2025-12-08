# Requirements Document

## Introduction

This document specifies the requirements for refactoring the VSCode MCP Proxy extension to use VSCode's native `registerTool` API for in-process tool execution, while also providing an HTTP MCP server for VSCodium-based editors and other clients that don't support `registerTool`.

The current architecture uses a custom IPC bridge where the extension hosts a WebSocket server and an external MCP server connects to proxy VSCode API calls. The new architecture will eliminate all custom IPC code. Instead, tools will register directly within the extension process using `vscode.lm.registerTool` for VSCode users, while the extension will also host a standard HTTP MCP server that exposes the same tools. Users can connect to this HTTP server using standard MCP clients like fastmcp, eliminating the need for any custom external server code.

## Glossary

- **Extension**: The VSCode extension package that runs within the VSCode process
- **HTTP MCP Server**: An HTTP server running in the extension process that implements the Model Context Protocol
- **Tool**: A callable function exposed through MCP that performs operations (e.g., rename file, rename symbol)
- **registerTool API**: VSCode's native API (`vscode.lm.registerTool`) for registering tools that run in-process
- **VSCodium**: Open-source builds of VSCode that may not support all proprietary VSCode APIs
- **Tool Implementation**: The core logic that performs a tool's operation (e.g., file renaming)
- **Workspace Edit**: VSCode's API for making changes to files and symbols across the workspace
- **HTTP Port**: The TCP port number on which the HTTP MCP server listens for connections
- **Extension Setting**: A VSCode configuration value stored in settings.json that controls extension behavior
- **fastmcp**: A Python library for creating MCP clients that can connect to HTTP MCP servers

## Requirements

### Requirement 1

**User Story:** As a VSCode user, I want refactoring tools to execute directly within the extension process, so that I benefit from reduced latency and simplified architecture.

#### Acceptance Criteria

1. WHEN the extension activates in VSCode THEN the system SHALL register all refactoring tools using `vscode.lm.registerTool`
2. WHEN a tool is invoked through the VSCode agent THEN the system SHALL execute the tool implementation directly within the extension process without IPC communication
3. WHEN a tool completes execution THEN the system SHALL return results in the format expected by the VSCode agent
4. WHEN the extension deactivates THEN the system SHALL properly dispose of all registered tools

### Requirement 2

**User Story:** As a developer maintaining the codebase, I want tool implementations to be shared between in-process and external server modes, so that I don't duplicate business logic.

#### Acceptance Criteria

1. WHEN implementing a new tool THEN the system SHALL use a single implementation that works in both in-process and external server contexts
2. WHEN a tool needs VSCode API access THEN the system SHALL provide a consistent interface regardless of execution context
3. WHEN tool code is modified THEN the system SHALL require changes in only one location
4. WHEN building the project THEN the system SHALL compile shared tool implementations for use by both extension and server packages

### Requirement 3

**User Story:** As a VSCodium user or MCP client developer, I want to connect to an HTTP MCP server running in the extension, so that I can access refactoring tools using standard MCP protocols.

#### Acceptance Criteria

1. WHEN the extension activates with HTTP server mode enabled THEN the system SHALL start an HTTP MCP server on a configurable port
2. WHEN a client connects to the HTTP MCP server THEN the system SHALL expose all available tools through the standard MCP protocol
3. WHEN a tool is invoked through the HTTP server THEN the system SHALL execute using the shared tool implementation
4. WHEN multiple clients connect to the HTTP server THEN the system SHALL handle concurrent requests without interference
5. WHEN the HTTP server is running THEN the system SHALL log the server URL for users to configure their MCP clients

### Requirement 4

**User Story:** As a user, I want to configure the HTTP MCP server through extension settings, so that my team can check in a consistent workspace configuration that works for everyone.

#### Acceptance Criteria

1. WHEN the extension activates THEN the system SHALL read the `vscode-mcp-proxy.enableHttpServer` setting from workspace or user configuration
2. WHEN the `vscode-mcp-proxy.enableHttpServer` setting is not configured THEN the system SHALL default to false and not start the HTTP MCP server
3. WHEN the `vscode-mcp-proxy.enableHttpServer` setting is set to false THEN the system SHALL not start the HTTP MCP server
4. WHEN the `vscode-mcp-proxy.enableHttpServer` setting is set to true THEN the system SHALL read the `vscode-mcp-proxy.httpPort` setting to determine the port
5. WHEN the `vscode-mcp-proxy.httpPort` setting is set to 0 THEN the system SHALL start the HTTP MCP server on a random available port
6. WHEN the `vscode-mcp-proxy.httpPort` setting is set to a specific port number THEN the system SHALL start the HTTP MCP server on that port
7. WHEN the `vscode-mcp-proxy.httpPort` setting is not configured THEN the system SHALL default to 0 and use a random port
8. WHEN `vscode.lm.registerTool` is available THEN the system SHALL always register tools using it regardless of HTTP server configuration
9. WHEN a specific port is configured THEN the system SHALL validate the port number is within valid range (1-65535)

### Requirement 5

**User Story:** As a user, I want the rename file tool to work correctly, so that I can refactor my codebase by moving files while maintaining import references.

#### Acceptance Criteria

1. WHEN the rename file tool is invoked with valid source and destination URIs THEN the system SHALL execute a workspace edit to rename the file
2. WHEN renaming a TypeScript or JavaScript file THEN the system SHALL ensure the `typescript.updateImportsOnFileMove.enabled` setting is configured to update imports
3. WHEN the file rename completes THEN the system SHALL return a success message indicating whether imports were updated
4. WHEN the rename operation fails THEN the system SHALL return an error message with details about the failure
5. WHEN input validation fails THEN the system SHALL return a descriptive error message

### Requirement 6

**User Story:** As a user, I want the rename symbol tool to work correctly, so that I can refactor my codebase by renaming functions, classes, and variables across all references.

#### Acceptance Criteria

1. WHEN the rename symbol tool is invoked with a file URI, original name, and new name THEN the system SHALL locate the symbol in the specified file
2. WHEN the symbol is found THEN the system SHALL execute a workspace edit to rename all references to the symbol
3. WHEN the rename completes successfully THEN the system SHALL return a success message
4. WHEN the symbol cannot be found THEN the system SHALL return an error message
5. WHEN input validation fails THEN the system SHALL return a descriptive error message

### Requirement 7

**User Story:** As a user, I want to query and modify workspace settings through tools, so that I can configure my environment programmatically.

#### Acceptance Criteria

1. WHEN a tool requests a workspace setting THEN the system SHALL retrieve the setting value from the specified scope (workspace or user)
2. WHEN a tool modifies a workspace setting THEN the system SHALL update the setting in the specified scope
3. WHEN a setting operation completes THEN the system SHALL return the result or updated value
4. WHEN a setting operation fails THEN the system SHALL return an error message

### Requirement 8

**User Story:** As a user, I want the HTTP MCP server to be secure and provide feedback, so that I can safely use it and know when it's running.

#### Acceptance Criteria

1. WHEN the HTTP server starts THEN the system SHALL bind to localhost only to prevent external network access
2. WHEN the HTTP server starts on a random port THEN the system SHALL log the actual port number assigned by the operating system
3. WHEN the HTTP server fails to start due to port conflicts THEN the system SHALL log a clear error message
4. WHEN the HTTP server is running THEN the system SHALL display a status bar item showing the server status and URL
5. WHEN the user clicks the status bar item THEN the system SHALL show options to copy the server URL or stop the server

### Requirement 9

**User Story:** As a developer, I want comprehensive error handling, so that tool failures are reported clearly and don't crash the extension or server.

#### Acceptance Criteria

1. WHEN a tool encounters a validation error THEN the system SHALL return a structured error response with validation details
2. WHEN a tool encounters a runtime error THEN the system SHALL catch the error and return a descriptive error message
3. WHEN the communication connection fails THEN the system SHALL log the error and attempt graceful degradation
4. WHEN tool registration fails THEN the system SHALL log the error and continue with partial functionality
5. WHEN an error occurs THEN the system SHALL never crash the extension or leave it in an inconsistent state

### Requirement 10

**User Story:** As a developer, I want clear separation between tool registration and tool implementation, so that the codebase is maintainable and testable.

#### Acceptance Criteria

1. WHEN examining the codebase THEN tool registration logic SHALL be separate from tool implementation logic
2. WHEN testing tools THEN the system SHALL allow testing tool implementations without requiring full extension activation
3. WHEN adding a new tool THEN the system SHALL require minimal changes to registration code
4. WHEN the architecture is reviewed THEN the system SHALL demonstrate clear boundaries between concerns

### Requirement 11

**User Story:** As a developer, I want the build system to handle the new architecture, so that compilation and packaging work correctly for both deployment modes.

#### Acceptance Criteria

1. WHEN building the extension THEN the system SHALL compile tool implementations for in-process use
2. WHEN building the server THEN the system SHALL compile tool implementations for external server use
3. WHEN packaging the extension THEN the system SHALL include both in-process tools and the external server bundle
4. WHEN the build completes THEN the system SHALL produce artifacts that work in both VSCode and VSCodium environments
