/**
 * Command Types
 *
 * Type definitions for the slash command system.
 */

/**
 * Argument type for command definitions
 */
export type ArgumentType = "string" | "number" | "boolean" | "array";

/**
 * Argument definition for commands
 */
export interface ArgumentDefinition {
  /** Argument name */
  name: string;
  /** Argument type */
  type: ArgumentType;
  /** Whether the argument is required */
  required?: boolean;
  /** Default value if not provided */
  default?: unknown;
  /** Description for help text */
  description?: string;
  /** Aliases (e.g., -n for --name) */
  aliases?: string[];
  /** Valid choices for enum-like arguments */
  choices?: string[];
  /** Whether this is a positional argument */
  positional?: boolean;
}

/**
 * Parsed arguments from a command
 */
export interface ParsedArgs {
  /** Named arguments (--key value) */
  named: Record<string, unknown>;
  /** Positional arguments */
  positional: string[];
  /** Flags (--flag without value) */
  flags: Set<string>;
  /** Raw input string */
  raw: string;
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** Current session ID (if in a session) */
  sessionId?: string;
  /** Current working directory */
  cwd: string;
  /** Whether running in TUI mode */
  isTui: boolean;
  /** Access to services */
  services: {
    /** Event bus for emitting events */
    emit: (event: unknown) => void;
  };
}

/**
 * Command result
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;
  /** Result message to display */
  message?: string;
  /** Error message (if success is false) */
  error?: string;
  /** Structured output data */
  data?: unknown;
  /** Suggested commands (for unknown command errors) */
  suggestions?: string[];
}

/**
 * Command handler function
 */
export type CommandHandler = (
  args: ParsedArgs,
  context: CommandContext
) => Promise<CommandResult>;

/**
 * Command definition
 */
export interface CommandDefinition {
  /** Command name (without slash) */
  name: string;
  /** Command aliases */
  aliases?: string[];
  /** Short description for help */
  description: string;
  /** Long description for detailed help */
  longDescription?: string;
  /** Argument definitions */
  arguments?: ArgumentDefinition[];
  /** Example usages */
  examples?: string[];
  /** Command handler */
  handler: CommandHandler;
  /** Category for help organization */
  category?: CommandCategory;
  /** Whether the command is hidden from help */
  hidden?: boolean;
}

/**
 * Command categories for organization
 */
export type CommandCategory =
  | "session"    // Session management (/start, /pause, /resume)
  | "feature"    // Feature workflow (/feature, /complete)
  | "agent"      // Agent management (/agents, /spawn)
  | "config"     // Configuration (/config, /skills, /workflows)
  | "info"       // Information (/status, /cost, /help)
  | "system";    // System commands (/exit, /clear)

/**
 * Category metadata for help display
 */
export const COMMAND_CATEGORIES: Record<CommandCategory, { label: string; order: number }> = {
  session: { label: "Session", order: 1 },
  feature: { label: "Feature", order: 2 },
  agent: { label: "Agent", order: 3 },
  config: { label: "Configuration", order: 4 },
  info: { label: "Information", order: 5 },
  system: { label: "System", order: 6 },
};

/**
 * Help info for a command
 */
export interface CommandHelp {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Usage syntax */
  usage: string;
  /** Arguments info */
  arguments: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  /** Example usages */
  examples: string[];
  /** Category */
  category?: CommandCategory;
}
