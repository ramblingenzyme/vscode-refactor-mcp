import { VSCodeCommand } from '../../../shared/protocol.js';
import { getVSCodeClient } from '../vscode-client.js';

/**
 * Rename a file in VSCode
 */
export async function renameFile(oldUri: string, newUri: string): Promise<boolean> {
    const client = getVSCodeClient();

    const result = await client.sendRequest(VSCodeCommand.RENAME_FILE, {
        oldUri,
        newUri,
    });

    return result;
}
