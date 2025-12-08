/**
 * Settings tools - get and set workspace configuration
 */

import { z } from "zod";
import { Tool } from "@vscode-mcp/shared";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as vscode from "vscode";

// Schema for getting a setting
const getSettingSchema = z.object({
  key: z.string().describe('The configuration key (e.g., "editor.fontSize")'),
  scope: z
    .enum(["workspace", "user"])
    .optional()
    .describe("The configuration scope (defaults to workspace)"),
});

// Schema for setting a setting
const setSettingSchema = z.object({
  key: z.string().describe('The configuration key (e.g., "editor.fontSize")'),
  value: z.any().describe("The value to set"),
  scope: z
    .enum(["workspace", "user"])
    .optional()
    .describe("The configuration scope (defaults to workspace)"),
});

export const getSettingTool: Tool = {
  name: "get_setting",

  description: {
    description: "Get a workspace or user configuration setting",
    inputSchema: getSettingSchema,
    examples: [
      {
        key: "editor.fontSize",
        scope: "workspace",
      },
    ],
    notes: "Retrieves configuration values from VSCode settings",
  },

  async implementation(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = getSettingSchema.parse(args);

      // Parse the configuration key
      const parts = input.key.split(".");
      if (parts.length < 2) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid configuration key format: "${input.key}". Expected format: "section.key"`,
            },
          ],
          isError: true,
        };
      }

      const section = parts[0];
      const key = parts.slice(1).join(".");

      // Get the configuration
      const config = vscode.workspace.getConfiguration(section);

      // Determine the scope
      const isWorkspaceScope = input.scope !== "user";

      // Get the value
      const inspect = config.inspect(key);

      if (!inspect) {
        return {
          content: [
            {
              type: "text",
              text: `Configuration key "${input.key}" not found`,
            },
          ],
          isError: true,
        };
      }

      let value: any;
      if (isWorkspaceScope) {
        value =
          inspect.workspaceValue ?? inspect.globalValue ?? inspect.defaultValue;
      } else {
        value = inspect.globalValue ?? inspect.defaultValue;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                key: input.key,
                value: value,
                scope: input.scope ?? "workspace",
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: "text",
              text: `Validation error: ${error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

export const setSettingTool: Tool = {
  name: "set_setting",

  description: {
    description: "Set a workspace or user configuration setting",
    inputSchema: setSettingSchema,
    examples: [
      {
        key: "editor.fontSize",
        value: 14,
        scope: "workspace",
      },
    ],
    notes: "Updates configuration values in VSCode settings",
  },

  async implementation(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = setSettingSchema.parse(args);

      // Parse the configuration key
      const parts = input.key.split(".");
      if (parts.length < 2) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid configuration key format: "${input.key}". Expected format: "section.key"`,
            },
          ],
          isError: true,
        };
      }

      const section = parts[0];
      const key = parts.slice(1).join(".");

      // Get the configuration
      const config = vscode.workspace.getConfiguration(section);

      // Determine the target (true = user/global, false = workspace)
      const isUserScope = input.scope === "user";

      // Update the setting
      try {
        await config.update(key, input.value, isUserScope);
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to update setting "${input.key}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                key: input.key,
                value: input.value,
                scope: input.scope ?? "workspace",
                success: true,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: "text",
              text: `Validation error: ${error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
