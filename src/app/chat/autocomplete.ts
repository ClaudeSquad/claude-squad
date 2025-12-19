/**
 * Autocomplete Engine
 *
 * Provides intelligent command completion with argument hints and
 * context-aware value suggestions.
 *
 * Features:
 * - Command name completion with fuzzy matching
 * - Argument hints (required vs optional, types, examples)
 * - Context-aware value suggestions (session IDs, agent names, etc.)
 * - Subcommand completion
 */

import type {
  Suggestion,
  AutocompleteResult,
  ArgumentHint,
  ConversationContext,
} from "./types.js";
import type { CommandDefinition } from "../../core/commands/types.js";
import { CommandRouter } from "../../core/commands/router.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Autocomplete engine configuration.
 */
export interface AutocompleteConfig {
  /** Maximum number of suggestions to return */
  maxSuggestions: number;
  /** Whether to use fuzzy matching */
  enableFuzzyMatching: boolean;
  /** Minimum score for fuzzy matches (0-1) */
  minFuzzyScore: number;
  /** Debounce time in milliseconds (for UI integration) */
  debounceMs: number;
}

const defaultConfig: AutocompleteConfig = {
  maxSuggestions: 10,
  enableFuzzyMatching: true,
  minFuzzyScore: 0.3,
  debounceMs: 50,
};

// ============================================================================
// Value Provider Types
// ============================================================================

/**
 * Function that provides dynamic values for autocomplete.
 */
export type ValueProvider = (
  context: ConversationContext
) => Promise<Array<{ value: string; description: string }>>;

/**
 * Value providers for different argument types.
 */
export interface ValueProviders {
  /** Session ID provider */
  sessions?: ValueProvider;
  /** Agent name provider */
  agents?: ValueProvider;
  /** Workflow name provider */
  workflows?: ValueProvider;
  /** Skill name provider */
  skills?: ValueProvider;
  /** Integration name provider */
  integrations?: ValueProvider;
}

// ============================================================================
// Fuzzy Matching
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings.
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
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate match score (0-1) for fuzzy matching.
 * Higher score = better match.
 */
function calculateMatchScore(query: string, target: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  // Exact match
  if (lowerQuery === lowerTarget) {
    return 1.0;
  }

  // Prefix match (very good)
  if (lowerTarget.startsWith(lowerQuery)) {
    return 0.9 + (0.1 * lowerQuery.length / lowerTarget.length);
  }

  // Contains match (good)
  if (lowerTarget.includes(lowerQuery)) {
    return 0.7 + (0.2 * lowerQuery.length / lowerTarget.length);
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(lowerQuery, lowerTarget);
  const maxLength = Math.max(lowerQuery.length, lowerTarget.length);
  const similarity = 1 - distance / maxLength;

  // Scale fuzzy score down
  return similarity * 0.6;
}

// ============================================================================
// Autocomplete Engine
// ============================================================================

/**
 * Autocomplete Engine
 *
 * Provides intelligent command completion with fuzzy matching and
 * context-aware suggestions.
 *
 * @example
 * ```typescript
 * const engine = new AutocompleteEngine(router);
 *
 * // Get suggestions for partial input
 * const result = await engine.getSuggestions("/fe", context);
 * // result.suggestions = [
 * //   { text: "/feature", description: "Start a new feature", ... },
 * //   { text: "/feedback", description: "Provide feedback", ... }
 * // ]
 * ```
 */
export class AutocompleteEngine {
  private router: CommandRouter;
  private config: AutocompleteConfig;
  private valueProviders: ValueProviders;

  constructor(
    router: CommandRouter,
    config: Partial<AutocompleteConfig> = {},
    valueProviders: ValueProviders = {}
  ) {
    this.router = router;
    this.config = { ...defaultConfig, ...config };
    this.valueProviders = valueProviders;
  }

  /**
   * Get autocomplete suggestions for the current input.
   *
   * @param input - Current input text
   * @param context - Conversation context
   * @param cursorPosition - Optional cursor position (defaults to end)
   * @returns Autocomplete result with suggestions
   */
  async getSuggestions(
    input: string,
    context: ConversationContext,
    cursorPosition?: number
  ): Promise<AutocompleteResult> {
    const trimmed = input.trim();
    const cursor = cursorPosition ?? input.length;

    // Not a command - no suggestions
    if (!trimmed.startsWith("/")) {
      return this.emptyResult(input);
    }

    // Parse the input to understand what we're completing
    const parsed = this.parseInput(trimmed, cursor);

    switch (parsed.completionType) {
      case "command":
        return this.completeCommand(parsed.prefix, context);

      case "subcommand":
        return this.completeSubcommand(parsed.command!, parsed.prefix, context);

      case "argument":
        return this.completeArgument(
          parsed.command!,
          parsed.prefix
        );

      case "value":
        return this.completeValue(
          parsed.command!,
          parsed.argumentName!,
          parsed.prefix,
          context
        );

      default:
        return this.emptyResult(input);
    }
  }

  /**
   * Parse input to determine what type of completion is needed.
   */
  private parseInput(
    input: string,
    _cursor: number
  ): {
    completionType: "command" | "subcommand" | "argument" | "value" | "none";
    command?: string;
    argumentName?: string;
    prefix: string;
  } {
    // Remove leading slash
    const withoutSlash = input.slice(1);
    const parts = this.tokenize(withoutSlash);

    // Just "/" - complete command
    if (parts.length === 0) {
      return { completionType: "command", prefix: "" };
    }

    // Single token - complete command name
    if (parts.length === 1 && !input.endsWith(" ")) {
      return { completionType: "command", prefix: parts[0]! };
    }

    const commandName = parts[0]!.toLowerCase();
    const command = this.router.get(commandName);

    if (!command) {
      // Unknown command, still completing command name
      return { completionType: "command", prefix: commandName };
    }

    // Check if this command has subcommands
    const hasSubcommands = this.hasSubcommands(command);
    const lastPart = parts[parts.length - 1] || "";
    const isCompletingNewPart = input.endsWith(" ");

    // Check if typing a flag
    if (lastPart.startsWith("--") && !isCompletingNewPart) {
      return {
        completionType: "argument",
        command: commandName,
        prefix: lastPart.slice(2),
      };
    }

    if (lastPart.startsWith("-") && !lastPart.startsWith("--") && !isCompletingNewPart) {
      return {
        completionType: "argument",
        command: commandName,
        prefix: lastPart.slice(1),
      };
    }

    // Check if previous part was a flag that expects a value
    if (parts.length >= 2) {
      const prevPart = parts[parts.length - 2]!;
      if (prevPart.startsWith("--")) {
        const argName = prevPart.slice(2);
        const argDef = command.arguments?.find(
          (a) => a.name === argName || a.aliases?.includes(argName)
        );
        if (argDef && argDef.type !== "boolean") {
          return {
            completionType: "value",
            command: commandName,
            argumentName: argName,
            prefix: isCompletingNewPart ? "" : lastPart,
          };
        }
      }
    }

    // If command has subcommands and we're on the second part
    if (hasSubcommands && parts.length <= 2) {
      return {
        completionType: "subcommand",
        command: commandName,
        prefix: isCompletingNewPart ? "" : lastPart,
      };
    }

    // Default to argument completion
    return {
      completionType: "argument",
      command: commandName,
      prefix: isCompletingNewPart ? "" : lastPart,
    };
  }

  /**
   * Check if a command has subcommands.
   */
  private hasSubcommands(command: CommandDefinition): boolean {
    // Commands like "sessions", "agents", "skills" have subcommands
    const commandsWithSubcommands = ["sessions", "agents", "skills", "workflows", "integrations", "config"];
    return commandsWithSubcommands.includes(command.name);
  }

  /**
   * Get subcommands for a command.
   */
  private getSubcommands(commandName: string): Array<{ name: string; description: string }> {
    const subcommands: Record<string, Array<{ name: string; description: string }>> = {
      sessions: [
        { name: "list", description: "Show all sessions" },
        { name: "resume", description: "Resume a session" },
        { name: "archive", description: "Archive a session" },
        { name: "delete", description: "Delete a session" },
      ],
      agents: [
        { name: "list", description: "Show all agents" },
        { name: "create", description: "Create a new agent" },
        { name: "edit", description: "Edit an agent" },
        { name: "delete", description: "Delete an agent" },
      ],
      skills: [
        { name: "list", description: "Show all skills" },
        { name: "create", description: "Create a new skill" },
        { name: "edit", description: "Edit a skill" },
        { name: "delete", description: "Delete a skill" },
      ],
      workflows: [
        { name: "list", description: "Show all workflows" },
        { name: "create", description: "Create a new workflow" },
        { name: "edit", description: "Edit a workflow" },
        { name: "delete", description: "Delete a workflow" },
      ],
      integrations: [
        { name: "list", description: "Show all integrations" },
        { name: "add", description: "Add an integration" },
        { name: "remove", description: "Remove an integration" },
        { name: "configure", description: "Configure an integration" },
      ],
      config: [
        { name: "show", description: "Show current configuration" },
        { name: "set", description: "Set a configuration value" },
        { name: "reset", description: "Reset to defaults" },
      ],
    };

    return subcommands[commandName] || [];
  }

  /**
   * Tokenize input string, respecting quotes.
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuote: string | null = null;

    for (let i = 0; i < input.length; i++) {
      const char = input[i]!;

      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = char;
        continue;
      }

      if (char === inQuote) {
        inQuote = null;
        continue;
      }

      if (char === " " && !inQuote) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Complete command names.
   */
  private completeCommand(
    prefix: string,
    _context: ConversationContext
  ): AutocompleteResult {
    const commands = this.router.getAllCommands();
    const suggestions: Suggestion[] = [];

    for (const cmd of commands) {
      const score = calculateMatchScore(prefix, cmd.name);

      if (score >= this.config.minFuzzyScore || prefix === "") {
        suggestions.push({
          text: `/${cmd.name}`,
          displayText: `/${cmd.name}`,
          description: cmd.description,
          type: "command",
          score,
          argumentHints: this.getArgumentHints(cmd),
          icon: this.getCommandIcon(cmd.category, cmd.name),
        });
      }
    }

    // Sort by score (descending)
    suggestions.sort((a, b) => b.score - a.score);

    return {
      suggestions: suggestions.slice(0, this.config.maxSuggestions),
      prefix: `/${prefix}`,
      startPosition: 0,
      hasMore: suggestions.length > this.config.maxSuggestions,
    };
  }

  /**
   * Complete subcommands.
   */
  private completeSubcommand(
    commandName: string,
    prefix: string,
    _context: ConversationContext
  ): AutocompleteResult {
    const subcommands = this.getSubcommands(commandName);
    const suggestions: Suggestion[] = [];

    for (const sub of subcommands) {
      const score = calculateMatchScore(prefix, sub.name);

      if (score >= this.config.minFuzzyScore || prefix === "") {
        suggestions.push({
          text: `/${commandName} ${sub.name}`,
          displayText: sub.name,
          description: sub.description,
          type: "subcommand",
          score,
        });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    return {
      suggestions: suggestions.slice(0, this.config.maxSuggestions),
      prefix,
      startPosition: commandName.length + 2,
      hasMore: suggestions.length > this.config.maxSuggestions,
    };
  }

  /**
   * Complete argument names.
   */
  private completeArgument(
    commandName: string,
    prefix: string = ""
  ): AutocompleteResult {
    const command = this.router.get(commandName);
    if (!command?.arguments) {
      return this.emptyResult(`/${commandName}`);
    }

    const suggestions: Suggestion[] = [];

    for (const arg of command.arguments) {
      if (arg.positional) continue; // Don't suggest positional args as flags

      const score = calculateMatchScore(prefix, arg.name);

      if (score >= this.config.minFuzzyScore || prefix === "") {
        suggestions.push({
          text: `--${arg.name}`,
          displayText: `--${arg.name}`,
          description: arg.description || `${arg.type} argument`,
          type: "argument",
          score: score + (arg.required ? 0.1 : 0), // Boost required args
        });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    return {
      suggestions: suggestions.slice(0, this.config.maxSuggestions),
      prefix: `--${prefix}`,
      startPosition: 0, // Will be adjusted by caller
      hasMore: suggestions.length > this.config.maxSuggestions,
    };
  }

  /**
   * Complete argument values.
   */
  private async completeValue(
    commandName: string,
    argumentName: string,
    prefix: string,
    context: ConversationContext
  ): Promise<AutocompleteResult> {
    const command = this.router.get(commandName);
    const argDef = command?.arguments?.find(
      (a) => a.name === argumentName || a.aliases?.includes(argumentName)
    );

    if (!argDef) {
      return this.emptyResult(`/${commandName}`);
    }

    // Check for choices
    if (argDef.choices) {
      return this.completeFromChoices(argDef.choices, prefix);
    }

    // Check for dynamic value provider
    const provider = this.getValueProvider(argumentName, commandName);
    if (provider) {
      try {
        const values = await provider(context);
        const suggestions: Suggestion[] = values.map((v) => ({
          text: v.value,
          displayText: v.value,
          description: v.description,
          type: "value" as const,
          score: calculateMatchScore(prefix, v.value),
        }));

        suggestions.sort((a, b) => b.score - a.score);

        return {
          suggestions: suggestions
            .filter((s) => s.score >= this.config.minFuzzyScore || prefix === "")
            .slice(0, this.config.maxSuggestions),
          prefix,
          startPosition: 0,
          hasMore: suggestions.length > this.config.maxSuggestions,
        };
      } catch {
        // Provider failed, return empty
      }
    }

    return this.emptyResult(`/${commandName}`);
  }

  /**
   * Complete from a list of choices.
   */
  private completeFromChoices(choices: string[], prefix: string): AutocompleteResult {
    const suggestions: Suggestion[] = choices.map((choice) => ({
      text: choice,
      displayText: choice,
      description: "",
      type: "value" as const,
      score: calculateMatchScore(prefix, choice),
    }));

    suggestions.sort((a, b) => b.score - a.score);

    return {
      suggestions: suggestions
        .filter((s) => s.score >= this.config.minFuzzyScore || prefix === "")
        .slice(0, this.config.maxSuggestions),
      prefix,
      startPosition: 0,
      hasMore: suggestions.length > this.config.maxSuggestions,
    };
  }

  /**
   * Get value provider for an argument.
   */
  private getValueProvider(
    argumentName: string,
    commandName: string
  ): ValueProvider | undefined {
    // Map argument names to providers
    const argToProvider: Record<string, keyof ValueProviders> = {
      session: "sessions",
      sessionId: "sessions",
      agent: "agents",
      agentId: "agents",
      workflow: "workflows",
      workflowId: "workflows",
      skill: "skills",
      skillId: "skills",
      integration: "integrations",
    };

    // Command-specific mappings
    const commandArgMappings: Record<string, keyof ValueProviders> = {
      "sessions:id": "sessions",
      "agents:id": "agents",
    };

    const key = `${commandName}:${argumentName}`;
    const providerKey =
      commandArgMappings[key] || argToProvider[argumentName];

    return providerKey ? this.valueProviders[providerKey] : undefined;
  }

  /**
   * Get argument hints for a command.
   */
  private getArgumentHints(command: CommandDefinition): ArgumentHint[] {
    if (!command.arguments) return [];

    return command.arguments.map((arg) => ({
      name: arg.positional ? arg.name : `--${arg.name}`,
      type: arg.type,
      description: arg.description || "",
      required: arg.required ?? false,
      examples: arg.choices?.slice(0, 3),
    }));
  }

  /**
   * Get icon for command - uses specific command icons first, then falls back to category.
   */
  private getCommandIcon(category?: string, commandName?: string): string {
    // Specific icons for each command (using simple Unicode to avoid width issues)
    const commandIcons: Record<string, string> = {
      // Session commands
      sessions: "\u2630", // Trigram
      pause: "\u23F8",    // Pause
      resume: "\u25B6",   // Play
      stop: "\u25A0",     // Stop
      // Feature commands
      feature: "\u2728",  // Sparkles
      complete: "\u2714", // Check
      approve: "\u2714",  // Check
      reject: "\u2718",   // X
      // Agent commands
      agents: "\u2699",   // Gear
      spawn: "\u279C",    // Arrow
      message: "\u2709",  // Envelope
      // Config commands
      config: "\u2699",   // Gear
      skills: "\u2726",   // Star
      workflows: "\u21BB", // Cycle
      integrations: "\u2194", // Double arrow
      // Info commands
      status: "\u2139",   // Info
      dashboard: "\u2302", // Home
      cost: "\u00A4",     // Currency
      help: "?",          // Simple question mark
      // System commands
      init: "\u25B6",     // Play
      exit: "\u2192",     // Arrow
      clear: "\u2327",    // Clear
    };

    // Try command-specific icon first
    if (commandName && commandIcons[commandName]) {
      return commandIcons[commandName];
    }

    // Fall back to category-based icons (using simple Unicode)
    const categoryIcons: Record<string, string> = {
      session: "\u2630", // Trigram
      feature: "\u2728", // Sparkles
      agent: "\u2699",   // Gear
      config: "\u2699",  // Gear
      info: "\u2139",    // Info
      system: "\u2692",  // Hammer
    };

    return category ? categoryIcons[category] || "\u25B8" : "\u25B8";
  }

  /**
   * Create an empty result.
   */
  private emptyResult(prefix: string): AutocompleteResult {
    return {
      suggestions: [],
      prefix,
      startPosition: 0,
      hasMore: false,
    };
  }

  /**
   * Register a value provider.
   */
  registerValueProvider(name: keyof ValueProviders, provider: ValueProvider): void {
    this.valueProviders[name] = provider;
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<AutocompleteConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an autocomplete engine with a command router.
 */
export function createAutocompleteEngine(
  router: CommandRouter,
  config?: Partial<AutocompleteConfig>,
  valueProviders?: ValueProviders
): AutocompleteEngine {
  return new AutocompleteEngine(router, config, valueProviders);
}
