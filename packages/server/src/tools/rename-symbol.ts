import { VSCodeCommand } from "@vscode-mcp/shared";
import { getVSCodeClient } from "../vscode-client.js";
import z from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types";

export const name = "rename_symbol";

const INPUT_SCHEMA = z.object({
  uri: z.string().describe("The URI of the file containing the symbol"),
  originalName: z.string().describe("The current name of the symbol"),
  newName: z.string().describe("The new name for the symbol"),
});

export const description = {
  description:
    "Rename a symbol in VSCode and update all references to it in the workspace.",
  inputSchema: INPUT_SCHEMA,
  examples: [
    {
      uri: "file:///home/user/project/foo.ts",
      originalName: "oldFunction",
      newName: "newFunction",
    },
  ],
  notes:
    "The operation will fail if the symbol cannot be found or if renaming is not possible due to conflicts.",
};

export async function implementation(request: {
  uri: string;
  originalName: string;
  newName: string;
}): Promise<CallToolResult> {
  INPUT_SCHEMA.parse(request);

  const client = getVSCodeClient();

  const result = await client.sendRequest(VSCodeCommand.RENAME_SYMBOL, {
    uri: request.uri,
    originalName: request.originalName,
    newName: request.newName,
  });

  return {
    content: [{ type: "text", text: `Symbol renamed: ${result}` }],
  };
}
