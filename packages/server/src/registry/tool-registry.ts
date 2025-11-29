import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";

/**
 * Interface defining the required structure for a tool module
 */
export interface ToolModule {
  name: string;
  description: {
    description: string;
    inputSchema: z.ZodSchema;
    examples?: any[];
    notes?: string;
  };
  implementation: (args: any) => Promise<CallToolResult>;
}

/**
 * Validates that a tool module has all required exports
 * 
 * @param toolModule - The tool module to validate
 * @throws Error if the tool module is missing required exports
 */
function validateToolModule(toolModule: any): asserts toolModule is ToolModule {
  if (!toolModule.name || typeof toolModule.name !== "string") {
    throw new Error("Tool module must export 'name' as a string");
  }

  if (!toolModule.description || typeof toolModule.description !== "object") {
    throw new Error(`Tool module '${toolModule.name}' must export 'description' as an object`);
  }

  if (!toolModule.description.inputSchema) {
    throw new Error(`Tool module '${toolModule.name}' must have 'description.inputSchema'`);
  }

  if (typeof toolModule.description.description !== "string") {
    throw new Error(`Tool module '${toolModule.name}' must have 'description.description' as a string`);
  }

  if (!toolModule.implementation || typeof toolModule.implementation !== "function") {
    throw new Error(`Tool module '${toolModule.name}' must export 'implementation' as a function`);
  }
}

/**
 * Registers a tool with the MCP server using a consistent pattern
 * 
 * @param server - The MCP server instance
 * @param toolModule - The tool module containing name, description, and implementation
 * @throws Error if the tool module is invalid or registration fails
 */
export function registerTool(server: McpServer, toolModule: ToolModule): void {
  // Validate the tool module structure
  validateToolModule(toolModule);

  // Register the tool with the server
  server.registerTool(
    toolModule.name,
    toolModule.description,
    toolModule.implementation
  );
}
