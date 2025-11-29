/**
 * Shared type definitions for the IPC protocol between
 * the VSCode extension and the MCP server.
 */

/**
 * Request message sent from MCP Server to VSCode Extension
 */
export interface VSCodeRequest {
    /** Unique identifier for this request */
    id: string;
    /** Command to execute (e.g., 'renameFile') */
    command: string;
    /** Command-specific arguments */
    arguments: Record<string, any>;
}

/**
 * Response message sent from VSCode Extension to MCP Server
 */
export interface VSCodeResponse {
    /** Request ID this response corresponds to */
    id: string;
    /** Result of the command execution (if successful) */
    result?: any;
    /** Error message (if failed) */
    error?: string;
}

/**
 * Supported commands
 */
export enum VSCodeCommand {
    RENAME_FILE = 'renameFile',
    GET_SETTING = 'getSetting',
    SET_SETTING = 'setSetting',
    RENAME_SYMBOL = 'renameSymbol'
}

/**
 * Arguments for the renameFile command
 */
export interface RenameFileArgs {
    oldUri: string;
    newUri: string;
}

export interface GetSettingArgs {
    key: string;
    scope?: 'workspace' | 'user';
}

export interface SetSettingArgs {
    key: string;
    value: any;
    scope?: 'workspace' | 'user';
}
