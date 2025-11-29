# Implementation Plan

- [x] 1. Create resources directory and extract update-imports-enabled resource





  - Create `packages/server/src/resources/` directory
  - Create `packages/server/src/resources/update-imports-enabled.ts` with consistent exports
  - Extract the resource definition from `index.ts` to the new file
  - _Requirements: 5.1, 5.2_

- [x] 2. Create set-update-imports-setting tool module





  - Create `packages/server/src/tools/set-update-imports-setting.ts`
  - Extract the inline tool definition from `index.ts`
  - Follow the same structure as `rename-file.ts` with name, description, and implementation exports
  - Add proper error handling with try-catch blocks
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3_

- [x] 3. Fix typo in rename-file.ts






  - Change 'alweys' to 'always' in the setSetting call
  - Improve error handling to be more consistent
  - _Requirements: 3.1, 3.4_

- [x] 4. Create tool registry helper




  - Create `packages/server/src/tools/index.ts` with a `registerTool` helper function
  - The helper should accept the server and a tool module
  - The helper should validate that the tool module has required exports
  - _Requirements: 2.1, 2.2, 2.4, 6.2_

- [x] 5. Create resource registry helper





  - Create `packages/server/src/resources/index.ts` with a `registerResource` helper function
  - The helper should accept the server and a resource module
  - The helper should validate that the resource module has required exports
  - _Requirements: 5.3, 6.2_

- [x] 6. Update server index.ts to use helpers






  - Import tool modules (rename-file, set-update-imports-setting)
  - Import resource modules (update-imports-enabled)
  - Use the registry helpers to register tools and resources
  - Remove all inline tool and resource definitions
  - Keep index.ts focused on server initialization
  - _Requirements: 2.1, 2.3, 5.3, 6.1, 6.3_

- [ ]* 7. Write property test for tool module structure
  - **Property 1: Tool module structure consistency**
  - **Validates: Requirements 1.2, 1.4**
  - Test that all tool files export name, description, and implementation
  - Use fast-check to generate test cases
  - _Requirements: 1.2, 1.4_

- [ ]* 8. Write property test for error handling consistency
  - **Property 4: Error response structure**
  - **Validates: Requirements 3.1, 3.4**
  - Test that all tools return properly formatted errors
  - Use fast-check to generate error scenarios
  - _Requirements: 3.1, 3.4_

- [ ]* 9. Write property test for success response structure
  - **Property 5: Success response structure**
  - **Validates: Requirements 3.2**
  - Test that all tools return properly formatted success responses
  - Use fast-check to generate success scenarios
  - _Requirements: 3.2_

- [ ]* 10. Write property test for tool registration consistency
  - **Property 3: Tool registration consistency**
  - **Validates: Requirements 2.2**
  - Test that tool registration uses correct exports
  - Use fast-check to generate tool modules
  - _Requirements: 2.2_

- [ ]* 11. Write property test for resource module structure
  - **Property 9: Resource module structure consistency**
  - **Validates: Requirements 5.2**
  - Test that all resource files have required exports
  - Use fast-check to generate test cases
  - _Requirements: 5.2_

- [ ]* 12. Write unit tests for set-update-imports-setting tool
  - Test valid inputs ('always', 'prompt', 'never')
  - Test error handling when VSCode client fails
  - Test response format
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 13. Write unit tests for update-imports-enabled resource
  - Test successful resource retrieval
  - Test error handling when VSCode client fails
  - Test response format
  - _Requirements: 5.2_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
