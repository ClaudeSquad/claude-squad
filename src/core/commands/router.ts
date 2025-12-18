/**
 * Command Router
 *
 * Routes slash commands to their handlers and manages command registration.
 */

import type {
  CommandDefinition,
  CommandContext,
  CommandResult,
  CommandHelp,
  CommandCategory,
  ParsedArgs,
} from "./types.js";
import { COMMAND_CATEGORIES } from "./types.js";
import { CommandParser } from "./parser.js";

/**
 * Find similar strings using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Command Router
 *
 * Central registry for slash commands with routing and help generation.
 *
 * @example
 * ```typescript
 * const router = new CommandRouter();
 *
 * // Register a command
 * router.register({
 *   name: 'feature',
 *   description: 'Start a new feature',
 *   arguments: [
 *     { name: 'description', type: 'string', required: true, positional: true }
 *   ],
 *   handler: async (args) => {
 *     console.log('Starting feature:', args.positional[0]);
 *     return { success: true };
 *   }
 * });
 *
 * // Route a command
 * const result = await router.route('/feature "Add login"', context);
 * ```
 */
export class CommandRouter {
  private commands = new Map<string, CommandDefinition>();
  private parser = new CommandParser();

  /**
   * Register a command
   *
   * @param command - Command definition to register
   */
  register(command: CommandDefinition): void {
    // Register by primary name
    this.commands.set(command.name.toLowerCase(), command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias.toLowerCase(), command);
      }
    }
  }

  /**
   * Register multiple commands at once
   *
   * @param commands - Array of command definitions
   */
  registerAll(commands: CommandDefinition[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Unregister a command
   *
   * @param name - Command name or alias to unregister
   * @returns True if a command was unregistered
   */
  unregister(name: string): boolean {
    const command = this.commands.get(name.toLowerCase());
    if (!command) return false;

    // Remove primary name
    this.commands.delete(command.name.toLowerCase());

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.delete(alias.toLowerCase());
      }
    }

    return true;
  }

  /**
   * Check if a command exists
   *
   * @param name - Command name or alias
   * @returns True if command is registered
   */
  has(name: string): boolean {
    return this.commands.has(name.toLowerCase());
  }

  /**
   * Get a command definition
   *
   * @param name - Command name or alias
   * @returns Command definition or undefined
   */
  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Route an input string to the appropriate command handler
   *
   * @param input - Raw command input (e.g., "/feature add login")
   * @param context - Command execution context
   * @returns Command result
   */
  async route(input: string, context: CommandContext): Promise<CommandResult> {
    // Check if input starts with /
    if (!input.startsWith("/")) {
      return {
        success: false,
        error: "Commands must start with /",
      };
    }

    // Parse the input
    const { command, args } = this.parser.parse(input);

    // Look up the command
    const definition = this.commands.get(command);

    if (!definition) {
      return this.unknownCommandResult(command);
    }

    // Validate arguments
    let validatedArgs: ParsedArgs;
    try {
      const validated = this.parser.validate(args, definition.arguments);
      validatedArgs = {
        ...args,
        named: validated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Invalid arguments",
      };
    }

    // Execute the handler
    try {
      return await definition.handler(validatedArgs, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Command failed",
      };
    }
  }

  /**
   * Generate result for unknown command with suggestions
   */
  private unknownCommandResult(command: string): CommandResult {
    const suggestions = this.findSimilarCommands(command, 3);

    let error = `Unknown command: /${command}`;
    if (suggestions.length > 0) {
      error += `\n\nDid you mean?\n${suggestions.map((s) => `  /${s}`).join("\n")}`;
    }

    return {
      success: false,
      error,
      suggestions,
    };
  }

  /**
   * Find similar commands for suggestions
   */
  private findSimilarCommands(input: string, limit: number): string[] {
    const scored = new Map<string, number>();

    // Get unique command names (not aliases)
    const uniqueCommands = new Set<string>();
    for (const cmd of this.commands.values()) {
      if (!cmd.hidden) {
        uniqueCommands.add(cmd.name);
      }
    }

    // Score each command
    for (const name of uniqueCommands) {
      const distance = levenshteinDistance(input.toLowerCase(), name.toLowerCase());
      // Only include if reasonably similar (distance less than half the longer string)
      const maxLength = Math.max(input.length, name.length);
      if (distance <= maxLength / 2) {
        scored.set(name, distance);
      }
    }

    // Sort by score and return top matches
    return Array.from(scored.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([name]) => name);
  }

  /**
   * Get all registered commands (unique, excluding aliases)
   *
   * @param includeHidden - Include hidden commands
   * @returns Array of command definitions
   */
  getAllCommands(includeHidden = false): CommandDefinition[] {
    const seen = new Set<string>();
    const commands: CommandDefinition[] = [];

    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        if (includeHidden || !cmd.hidden) {
          commands.push(cmd);
        }
      }
    }

    return commands;
  }

  /**
   * Get commands grouped by category
   *
   * @returns Map of category to commands
   */
  getCommandsByCategory(): Map<CommandCategory, CommandDefinition[]> {
    const grouped = new Map<CommandCategory, CommandDefinition[]>();

    // Initialize all categories
    for (const category of Object.keys(COMMAND_CATEGORIES) as CommandCategory[]) {
      grouped.set(category, []);
    }

    // Group commands
    for (const cmd of this.getAllCommands()) {
      const category = cmd.category || "system";
      const list = grouped.get(category) || [];
      list.push(cmd);
      grouped.set(category, list);
    }

    return grouped;
  }

  /**
   * Generate help information for a command
   *
   * @param name - Command name
   * @returns Command help or undefined
   */
  getHelp(name: string): CommandHelp | undefined {
    const cmd = this.get(name);
    if (!cmd) return undefined;

    // Build usage string
    const usageParts = [`/${cmd.name}`];
    if (cmd.arguments) {
      for (const arg of cmd.arguments) {
        if (arg.positional) {
          usageParts.push(arg.required ? `<${arg.name}>` : `[${arg.name}]`);
        } else {
          usageParts.push(arg.required ? `--${arg.name} <value>` : `[--${arg.name}]`);
        }
      }
    }

    return {
      name: cmd.name,
      description: cmd.longDescription || cmd.description,
      usage: usageParts.join(" "),
      arguments:
        cmd.arguments?.map((arg) => ({
          name: arg.positional ? arg.name : `--${arg.name}`,
          type: arg.type,
          required: arg.required ?? false,
          description: arg.description,
        })) || [],
      examples: cmd.examples || [],
      category: cmd.category,
    };
  }

  /**
   * Generate full help text
   *
   * @returns Formatted help string
   */
  generateHelpText(): string {
    const lines: string[] = ["Available commands:", ""];

    const grouped = this.getCommandsByCategory();
    const categories = Object.entries(COMMAND_CATEGORIES)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key]) => key as CommandCategory);

    for (const category of categories) {
      const commands = grouped.get(category) || [];
      if (commands.length === 0) continue;

      const { label } = COMMAND_CATEGORIES[category];
      lines.push(`${label}:`);

      for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
        const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(", ")})` : "";
        lines.push(`  /${cmd.name}${aliases}`);
        lines.push(`    ${cmd.description}`);
      }

      lines.push("");
    }

    lines.push('Type "/help <command>" for more information about a specific command.');

    return lines.join("\n");
  }
}

/**
 * Global command router instance
 */
export const commandRouter = new CommandRouter();

/**
 * Create a new command router instance
 */
export function createCommandRouter(): CommandRouter {
  return new CommandRouter();
}
