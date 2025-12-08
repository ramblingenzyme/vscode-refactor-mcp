/**
 * Tool interface for MCP tools that can be registered with both
 * registerTool and HTTP MCP server
 */

import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * A tool that can be registered with both registerTool and HTTP MCP server
 */
export interface Tool {
  /** Unique tool identifier */
  name: string;

  /** Tool metadata */
  description: {
    /** Human-readable description of what the tool does */
    description: string;
    /** Zod schema for input validation */
    inputSchema: z.ZodSchema;
    /** Optional usage examples */
    examples?: any[];
    /** Optional additional notes */
    notes?: string;
  };

  /**
   * Tool implementation - returns MCP CallToolResult
   * @param args - Tool arguments (will be validated against inputSchema)
   * @returns Promise resolving to CallToolResult with content and optional error flag
   */
  implementation: (args: any) => Promise<CallToolResult>;
}
