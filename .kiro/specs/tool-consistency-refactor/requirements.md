# Requirements Document

## Introduction

This document outlines the requirements for refactoring the MCP server tool setup to achieve consistency across all tools and improve maintainability. Currently, the codebase has inconsistencies in how tools are defined, registered, and structured, with some tools defined inline in `index.ts` and others in separate files with varying patterns.

## Glossary

- **MCP Server**: The Model Context Protocol server that exposes tools to clients
- **Tool**: A callable function exposed through the MCP protocol with defined input schemas and implementations
- **Tool Module**: A TypeScript file that exports tool metadata and implementation
- **Tool Registry**: The mechanism in `index.ts` that registers tools with the MCP server
- **Input Schema**: A Zod schema defining the expected parameters for a tool
- **VSCode Client**: The IPC client that communicates with the VSCode extension

## Requirements

### Requirement 1

**User Story:** As a developer, I want all tools to follow a consistent file structure, so that I can easily understand and maintain the codebase.

#### Acceptance Criteria

1. WHEN a new tool is created THEN the system SHALL place it in a separate file under `packages/server/src/tools/`
2. WHEN examining tool files THEN the system SHALL ensure each file exports `name`, `description`, and `implementation` properties
3. WHEN a tool file is created THEN the system SHALL define the input schema using Zod within the `description` object
4. WHEN multiple tools exist THEN the system SHALL ensure all tools follow the same export pattern

### Requirement 2

**User Story:** As a developer, I want tool registration to be consistent and automated, so that adding new tools requires minimal boilerplate.

#### Acceptance Criteria

1. WHEN the server starts THEN the system SHALL register all tools using a consistent pattern in `index.ts`
2. WHEN a tool is registered THEN the system SHALL use the tool's exported `name`, `description.inputSchema`, and `implementation`
3. WHEN tools are defined inline in `index.ts` THEN the system SHALL extract them to separate tool modules
4. WHEN registering tools THEN the system SHALL validate that all required exports are present

### Requirement 3

**User Story:** As a developer, I want tool implementations to handle errors consistently, so that clients receive predictable error responses.

#### Acceptance Criteria

1. WHEN a tool encounters an error THEN the system SHALL return a CallToolResult with `isError: true`
2. WHEN a tool succeeds THEN the system SHALL return a CallToolResult with content describing the result
3. WHEN input validation fails THEN the system SHALL catch the Zod validation error and return a formatted error message
4. WHEN all tools handle errors THEN the system SHALL ensure they follow the same error response structure

### Requirement 4

**User Story:** As a developer, I want tool descriptions to be comprehensive and well-documented, so that clients understand how to use each tool.

#### Acceptance Criteria

1. WHEN a tool is defined THEN the system SHALL include a clear description of its purpose
2. WHEN a tool has parameters THEN the system SHALL describe each parameter in the Zod schema
3. WHEN a tool has usage notes THEN the system SHALL include them in the description object
4. WHEN a tool has examples THEN the system SHALL include them in the description object
5. WHEN examining tool descriptions THEN the system SHALL ensure they follow a consistent format

### Requirement 5

**User Story:** As a developer, I want resources to be separated from tools, so that the codebase organization is clear.

#### Acceptance Criteria

1. WHEN resources are defined THEN the system SHALL place them in a separate directory `packages/server/src/resources/`
2. WHEN a resource is created THEN the system SHALL follow a consistent export pattern similar to tools
3. WHEN the server starts THEN the system SHALL register resources separately from tools
4. WHEN resources exist THEN the system SHALL ensure they do not mix with tool definitions in the same file

### Requirement 6

**User Story:** As a developer, I want the tool registration code to be clean and maintainable, so that the main server file remains focused on initialization.

#### Acceptance Criteria

1. WHEN the server initializes THEN the system SHALL keep `index.ts` focused on server setup and registration
2. WHEN tools are registered THEN the system SHALL use a consistent registration helper or pattern
3. WHEN examining `index.ts` THEN the system SHALL ensure no tool implementations are defined inline
4. WHEN the codebase grows THEN the system SHALL support easy addition of new tools without modifying registration logic significantly
