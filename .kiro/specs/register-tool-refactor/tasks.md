# Implementation Plan

- [x] 1. Update shared package with new tool interface
  - Create `Tool` interface that returns `CallToolResult`
  - Export types for use by extension package
  - Remove old protocol types that are no longer needed
  - _Requirements: 2.1, 2.2_

- [x] 2. Implement tools using new interface
  - [x] 2.1 Implement rename file tool
    - Create tool with name, description, and implementation
    - Handle input validation with Zod
    - Ensure TypeScript import settings are configured
    - Return `CallToolResult` with success/error information
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write property test for rename file tool
    - **Property 5: File rename with valid URIs**
    - **Property 6: TypeScript import update setting enforcement**
    - **Property 7: File rename result includes import status**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 2.3 Implement rename symbol tool
    - Create tool with name, description, and implementation
    - Handle input validation with Zod
    - Locate symbol and execute workspace edit
    - Return `CallToolResult` with success/error information
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.4 Write property test for rename symbol tool
    - **Property 10: Symbol rename locates and updates all references**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 2.5 Implement settings tools (get/set)
    - Create tools for getting and setting workspace configuration
    - Handle input validation with Zod
    - Support workspace and user scopes
    - Return `CallToolResult` with values/errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.6 Write property test for settings tools
    - **Property 11: Setting operations retrieve and update correctly**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 3. Implement registerTool integration
  - [x] 3.1 Create registerTool adapter
    - Check if `vscode.lm.registerTool` is available
    - Convert Zod schema to JSON Schema using zod-to-json-schema
    - Register tool with VSCode passing through to tool implementation
    - Handle cancellation tokens appropriately
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 3.2 Write property test for registerTool integration
    - **Property 2: Tool result format compliance**
    - **Validates: Requirements 1.3**

  - [x] 3.3 Create tool registry for extension
    - Export all tools from a central location
    - Provide function to register all tools with VSCode
    - Handle registration errors gracefully
    - _Requirements: 1.1, 1.4, 9.4_

  - [ ]* 3.4 Write unit tests for tool registration
    - Test registration with available registerTool API
    - Test error handling when registration fails
    - Test cleanup on extension deactivation
    - _Requirements: 1.4, 9.4_

- [x] 4. Implement HTTP MCP server integration
  - [x] 4.1 Create HTTP MCP server class
    - Initialize MCP server with SSE transport
    - Register all tools using tool interface
    - Bind to localhost on configured port
    - Track actual port when using port 0
    - _Requirements: 3.1, 3.2, 4.2, 4.5, 4.6, 8.1, 8.2_

  - [ ]* 4.2 Write property test for HTTP server
    - **Property 3: HTTP server concurrent request handling**
    - **Property 15: HTTP server exposes all tools**
    - **Validates: Requirements 3.2, 3.4**

  - [x] 4.3 Implement server lifecycle management
    - Start server when enabled in configuration
    - Stop server cleanly on extension deactivation
    - Handle port conflicts with clear error messages
    - Log server URL when started
    - _Requirements: 3.5, 8.2, 8.3_

  - [ ]* 4.4 Write unit tests for server lifecycle
    - Test server starts with valid configuration
    - Test server handles port conflicts
    - Test server stops cleanly
    - Test port 0 assigns random port
    - _Requirements: 4.5, 8.2, 8.3_

- [x] 5. Implement configuration management
  - [x] 5.1 Create configuration interface and reader
    - Define `ExtensionConfig` interface
    - Read `enableHttpServer` setting (default: false)
    - Read `httpPort` setting (default: 0)
    - Validate port number is in valid range
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9_

  - [ ]* 5.2 Write property test for port validation
    - **Property 4: Port configuration validation**
    - **Validates: Requirements 4.9**

  - [x] 5.3 Add configuration schema to package.json
    - Add `configuration` contribution point
    - Define `vscode-mcp-proxy.enableHttpServer` setting
    - Define `vscode-mcp-proxy.httpPort` setting
    - Include descriptions and default values
    - Remove `mcpServerDefinitionProviders` contribution (no longer needed)
    - _Requirements: 4.1, 4.2, 4.7_

- [x] 6. Implement status bar UI
  - [x] 6.1 Create status bar item for HTTP server
    - Show server status and URL when running
    - Hide when server is not running
    - Use appropriate icon (e.g., server icon)
    - _Requirements: 8.4_

  - [x] 6.2 Implement status bar click handler
    - Show quick pick menu with options
    - Add "Copy Server URL" option
    - Add "Stop Server" option
    - Add "View Logs" option
    - _Requirements: 8.5_

  - [ ]* 6.3 Write unit tests for status bar UI
    - Test status bar shows when server running
    - Test status bar hides when server stopped
    - Test quick pick options work correctly
    - _Requirements: 8.4, 8.5_

- [x] 7. Update extension entry point
  - [x] 7.1 Refactor extension.ts activation
    - Read configuration settings
    - Register tools via registerTool when available
    - Start HTTP server when enabled
    - Create and show status bar item
    - Handle errors gracefully
    - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4, 4.8, 9.4, 9.5_

  - [ ]* 7.2 Write property test for tool execution consistency
    - **Property 1: Tool execution consistency across integration paths**
    - **Validates: Requirements 2.2**

  - [x] 7.3 Implement extension deactivation
    - Dispose all registered tools
    - Stop HTTP server if running
    - Clean up status bar item
    - _Requirements: 1.4_

  - [ ]* 7.4 Write unit tests for extension lifecycle
    - Test activation with various configurations
    - Test deactivation cleans up resources
    - Test error handling during activation
    - _Requirements: 1.1, 1.4, 9.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Remove deprecated code
  - [x] 9.1 Remove IPC server code
    - Delete `packages/extension/src/ipc/` directory
    - Remove WebSocket dependencies from package.json
    - Remove IPC-related configuration
    - _Requirements: N/A (cleanup)_

  - [x] 9.2 Remove external server package
    - Delete `packages/server/` directory
    - Update root package.json workspace configuration
    - Remove server-specific build scripts
    - _Requirements: N/A (cleanup)_

  - [x] 9.3 Remove old protocol types
    - Delete unused protocol definitions from shared package
    - Remove VSCodeCommand enum and related types
    - Clean up any remaining IPC-related code
    - _Requirements: N/A (cleanup)_

- [ ] 10. Update documentation
  - [ ] 10.1 Update README.md
    - Document new architecture (registerTool + HTTP server)
    - Explain configuration settings
    - Provide examples for VSCode and VSCodium users
    - Document how to connect external MCP clients
    - _Requirements: N/A (documentation)_

  - [ ] 10.2 Update AGENTS.md
    - Update project goals and structure
    - Document new package organization
    - Remove references to IPC bridge
    - _Requirements: N/A (documentation)_

  - [ ] 10.3 Update steering files
    - Update product.md with new architecture
    - Update structure.md with new package layout
    - Update tech.md with new dependencies
    - _Requirements: N/A (documentation)_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
