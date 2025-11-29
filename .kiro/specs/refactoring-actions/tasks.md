# Implementation Plan

- [x] 1. Update shared protocol definitions

  - Add ORGANIZE_IMPORTS and RENAME_SYMBOL to VSCodeCommand enum
  - Add OrganizeImportsArgs and RenameSymbolArgs interfaces
  - _Requirements: 4.1, 4.2_

- [ ] 2. Implement organize imports in IPC server

  - [ ] 2.1 Add ORGANIZE_IMPORTS case handler in processMessage

    - Open document using vscode.workspace.openTextDocument
    - Execute vscode.executeCodeActionProvider with CodeActionKind.SourceOrganizeImports
    - Execute each returned code action command
    - Return success result with actionsExecuted count
    - _Requirements: 1.1, 1.2, 3.2, 3.3_

  - [ ]\* 2.2 Write property test for organize imports handler

    - **Property 1: VSCode API invocation correctness**
    - **Validates: Requirements 1.1, 3.1**

  - [ ] 2.3 Handle error cases for organize imports
    - Return appropriate error when no actions are available
    - Catch and return VSCode command execution errors
    - _Requirements: 1.5, 3.6, 5.1_

- [ ] 3. Implement rename symbol in IPC server (already prototyped)

  - [ ] 3.1 Verify RENAME_SYMBOL case handler implementation

    - Ensure it uses vscode.executeDocumentSymbolProvider
    - Ensure it finds symbol by originalName
    - Ensure it calls vscode.executeDocumentRenameProvider
    - Ensure it applies the WorkspaceEdit
    - _Requirements: 2.1, 2.2, 3.4_

  - [ ]\* 3.2 Write property test for rename symbol handler

    - **Property 3: Response structure consistency**
    - **Validates: Requirements 2.6, 4.3**

  - [ ] 3.3 Add error handling for rename symbol
    - Handle case when symbol is not found
    - Handle case when rename is rejected
    - Catch and return VSCode errors
    - _Requirements: 2.4, 2.5, 3.6, 5.1, 5.4_

- [ ] 4. Create organize imports MCP tool

  - [ ] 4.1 Create organize-imports.ts in packages/server/src/tools/

    - Define INPUT_SCHEMA with Zod validation for uri
    - Implement tool that calls VSCodeCommand.ORGANIZE_IMPORTS
    - Handle success and error responses
    - _Requirements: 1.1, 4.4, 5.2_

  - [ ]\* 4.2 Write property test for organize imports tool

    - **Property 2: Code action execution completeness**
    - **Validates: Requirements 1.2**

  - [ ] 4.3 Add examples and documentation
    - Add usage examples in description
    - Document supported file types
    - _Requirements: 1.6_

- [ ] 5. Create rename symbol MCP tool

  - [ ] 5.1 Create rename-symbol.ts in packages/server/src/tools/

    - Define INPUT_SCHEMA with Zod validation for uri, originalName, newName
    - Implement tool that calls VSCodeCommand.RENAME_SYMBOL
    - Handle success and error responses
    - _Requirements: 2.1, 4.4, 5.2_

  - [ ]\* 5.2 Write property test for rename symbol tool

    - **Property 4: Error handling and propagation**
    - **Validates: Requirements 3.6, 5.1, 5.2, 5.5**

  - [ ] 5.3 Add examples and documentation
    - Add usage examples in description
    - Document symbol name requirements
    - _Requirements: 2.6_

- [ ] 6. Register new tools

  - [ ] 6.1 Update packages/server/src/tools/index.ts
    - Import organizeImports and renameSymbol tools
    - Add to tools array export
    - _Requirements: 4.3_

- [ ] 7. Build and test integration

  - [ ] 7.1 Build all packages

    - Build shared package first
    - Build extension and server packages
    - Verify no TypeScript errors

  - [ ]\* 7.2 Write integration tests

    - Test organize imports on actual TypeScript file
    - Test rename symbol with multiple references
    - Test error cases (file not found, symbol not found)
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.4, 2.5_

  - [ ] 7.3 Manual testing
    - Start extension in debug mode
    - Connect MCP server
    - Test organize_imports tool with sample files
    - Test rename_symbol tool with sample code
    - Verify changes are applied correctly

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
