import { LOGGING_CONFIG } from '../config';

/**
 * Simple logger utility for the extension
 */
export class Logger {
    constructor(private prefix: string) { }

    info(message: string, ...args: any[]): void {
        console.log(`[${this.prefix}] ${message}`, ...args);
    }

    error(message: string, error?: any): void {
        console.error(`[${this.prefix}] ERROR: ${message}`, error);
    }

    debug(message: string, ...args: any[]): void {
        if (LOGGING_CONFIG.VERBOSE) {
            console.log(`[${this.prefix}] DEBUG: ${message}`, ...args);
        }
    }
}