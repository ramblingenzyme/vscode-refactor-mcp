import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Interface defining the required structure for a resource module
 */
export interface ResourceModule {
  name: string;
  template: ResourceTemplate;
  metadata: {
    description: string;
  };
  handler: (url: URL) => Promise<ReadResourceResult>;
}

/**
 * Validates that a resource module has all required exports
 * 
 * @param resourceModule - The resource module to validate
 * @throws Error if the resource module is missing required exports
 */
function validateResourceModule(resourceModule: any): asserts resourceModule is ResourceModule {
  if (!resourceModule.name || typeof resourceModule.name !== "string") {
    throw new Error("Resource module must export 'name' as a string");
  }

  if (!resourceModule.template || !(resourceModule.template instanceof ResourceTemplate)) {
    throw new Error(`Resource module '${resourceModule.name}' must export 'template' as a ResourceTemplate`);
  }

  if (!resourceModule.metadata || typeof resourceModule.metadata !== "object") {
    throw new Error(`Resource module '${resourceModule.name}' must export 'metadata' as an object`);
  }

  if (typeof resourceModule.metadata.description !== "string") {
    throw new Error(`Resource module '${resourceModule.name}' must have 'metadata.description' as a string`);
  }

  if (!resourceModule.handler || typeof resourceModule.handler !== "function") {
    throw new Error(`Resource module '${resourceModule.name}' must export 'handler' as a function`);
  }
}

/**
 * Registers a resource with the MCP server using a consistent pattern
 * 
 * @param server - The MCP server instance
 * @param resourceModule - The resource module containing name, template, metadata, and handler
 * @throws Error if the resource module is invalid or registration fails
 */
export function registerResource(server: McpServer, resourceModule: ResourceModule): void {
  // Validate the resource module structure
  validateResourceModule(resourceModule);

  // Register the resource with the server
  server.registerResource(
    resourceModule.name,
    resourceModule.template,
    resourceModule.metadata,
    resourceModule.handler
  );
}