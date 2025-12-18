/**
 * Commands Module
 *
 * Exports command router, parser, types, and built-in command definitions.
 *
 * IMPORTANT: Import this module (or definitions.ts directly) early in
 * the application lifecycle to ensure commands are registered before
 * the TUI starts.
 */

export * from "./types.js";
export * from "./parser.js";
export * from "./router.js";
export * from "./definitions.js";
