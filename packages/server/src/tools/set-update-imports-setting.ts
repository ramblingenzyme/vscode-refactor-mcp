import { getVSCodeClient } from "../vscode-client.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";

const INPUT_SCHEMA = z.object({
  value: z.enum(["always", "prompt", "never"]).describe(
    "The value to set for the setting ('always', 'prompt', or 'never')"
  ),
});

export const name = "set_update_imports_setting";

export const description = {
  description:
    "Set the workspace setting 'typescript.updateImportsOnFileMove.enabled' to a specified value ('always', 'prompt', or 'never').",
  inputSchema: INPUT_SCHEMA,
  examples: [
    {
      value: "always",
    },
    {
      value: "prompt",
    },
    {
      value: "never",
    },
  ],
  notes:
    "This setting controls whether TypeScript/JavaScript imports are automatically updated when files are moved or renamed. 'always' updates imports automatically, 'prompt' asks the user, and 'never' does not update imports.",
};

export async function implementation(
  request: { value: "always" | "prompt" | "never" }
): Promise<CallToolResult> {
  try {
    INPUT_SCHEMA.parse(request);
    const { value } = request;

    const client = getVSCodeClient();
    const res = await client.sendRequest("setSetting", {
      key: "typescript.updateImportsOnFileMove.enabled",
      value,
      scope: "workspace",
    });

    return {
      content: [
        {
          type: "text",
          text: `Set workspace setting 'typescript.updateImportsOnFileMove.enabled' to '${value}': ${JSON.stringify(res)}`,
        },
      ],
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid input: ${error.issues.map((e) => e.message).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error setting workspace setting: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}
