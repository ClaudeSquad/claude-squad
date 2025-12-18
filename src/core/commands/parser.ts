/**
 * Command Parser
 *
 * Parses slash command input strings into structured arguments.
 */

import type { ArgumentDefinition, ParsedArgs } from "./types.js";

/**
 * Parse error with details
 */
export class ParseError extends Error {
  readonly argument?: string;
  readonly expected?: string;
  readonly received?: string;

  constructor(
    message: string,
    options?: { argument?: string; expected?: string; received?: string }
  ) {
    super(message);
    this.name = "ParseError";
    this.argument = options?.argument;
    this.expected = options?.expected;
    this.received = options?.received;
  }
}

/**
 * Command Parser
 *
 * Handles parsing of slash command input into structured arguments.
 * Supports:
 * - Named arguments: --name value, --name=value
 * - Short flags: -n value, -n=value
 * - Positional arguments: arg1 arg2
 * - Boolean flags: --verbose, -v
 * - Quoted strings: "value with spaces"
 *
 * @example
 * ```typescript
 * const parser = new CommandParser();
 *
 * // Parse a command string
 * const result = parser.parse('/feature "Add login page" --workflow web-app');
 * // {
 * //   named: { workflow: "web-app" },
 * //   positional: ["Add login page"],
 * //   flags: new Set(),
 * //   raw: '/feature "Add login page" --workflow web-app'
 * // }
 * ```
 */
export class CommandParser {
  /**
   * Parse a command input string
   *
   * @param input - Raw command input
   * @returns Parsed arguments
   */
  parse(input: string): { command: string; args: ParsedArgs } {
    const trimmed = input.trim();

    // Extract command name
    const parts = this.tokenize(trimmed);
    const commandPart = parts[0] || "";

    // Remove leading slash if present
    const command = commandPart.startsWith("/")
      ? commandPart.slice(1).toLowerCase()
      : commandPart.toLowerCase();

    // Parse remaining tokens
    const args = this.parseTokens(parts.slice(1), trimmed);

    return { command, args };
  }

  /**
   * Tokenize input string, respecting quotes
   */
  private tokenize(input: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuote: string | null = null;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i]!;

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

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
   * Parse tokens into structured arguments
   */
  private parseTokens(tokens: string[], raw: string): ParsedArgs {
    const named: Record<string, unknown> = {};
    const positional: string[] = [];
    const flags = new Set<string>();

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i]!;

      // Long option: --name or --name=value
      if (token.startsWith("--")) {
        const withoutDashes = token.slice(2);

        if (withoutDashes.includes("=")) {
          const [name, ...valueParts] = withoutDashes.split("=");
          const value = valueParts.join("=");
          named[name!] = this.parseValue(value);
        } else {
          // Check if next token is a value or another flag
          const nextToken = tokens[i + 1];
          if (nextToken && !nextToken.startsWith("-")) {
            named[withoutDashes] = this.parseValue(nextToken);
            i++;
          } else {
            // It's a boolean flag
            flags.add(withoutDashes);
          }
        }
        i++;
        continue;
      }

      // Short option: -n or -n=value or -abc (multiple flags)
      if (token.startsWith("-") && token.length > 1) {
        const withoutDash = token.slice(1);

        if (withoutDash.includes("=")) {
          const [name, ...valueParts] = withoutDash.split("=");
          const value = valueParts.join("=");
          named[name!] = this.parseValue(value);
        } else if (withoutDash.length === 1) {
          // Single short option
          const nextToken = tokens[i + 1];
          if (nextToken && !nextToken.startsWith("-")) {
            named[withoutDash] = this.parseValue(nextToken);
            i++;
          } else {
            flags.add(withoutDash);
          }
        } else {
          // Multiple short flags: -abc = -a -b -c
          for (const char of withoutDash) {
            flags.add(char);
          }
        }
        i++;
        continue;
      }

      // Positional argument
      positional.push(token);
      i++;
    }

    return { named, positional, flags, raw };
  }

  /**
   * Parse a string value to appropriate type
   */
  private parseValue(value: string): unknown {
    // Boolean
    if (value === "true") return true;
    if (value === "false") return false;

    // Number
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Array (comma-separated)
    if (value.includes(",") && !value.includes(" ")) {
      return value.split(",").map((v) => this.parseValue(v.trim()));
    }

    // String
    return value;
  }

  /**
   * Validate parsed args against argument definitions
   *
   * @param args - Parsed arguments
   * @param definitions - Argument definitions
   * @returns Validated and typed arguments
   */
  validate(
    args: ParsedArgs,
    definitions?: ArgumentDefinition[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (!definitions || definitions.length === 0) {
      // Return named args and positional as 'args' array
      return {
        ...args.named,
        _: args.positional,
        _flags: Array.from(args.flags),
      };
    }

    // Separate positional and named definitions
    const positionalDefs = definitions.filter((d) => d.positional);
    const namedDefs = definitions.filter((d) => !d.positional);

    // Process positional arguments
    for (let i = 0; i < positionalDefs.length; i++) {
      const def = positionalDefs[i]!;
      const value = args.positional[i];

      if (value !== undefined) {
        result[def.name] = this.coerceType(value, def.type);
      } else if (def.required) {
        throw new ParseError(`Missing required argument: ${def.name}`, {
          argument: def.name,
        });
      } else if (def.default !== undefined) {
        result[def.name] = def.default;
      }
    }

    // Process named arguments
    for (const def of namedDefs) {
      // Check named args
      let value = args.named[def.name];

      // Check aliases
      if (value === undefined && def.aliases) {
        for (const alias of def.aliases) {
          if (args.named[alias] !== undefined) {
            value = args.named[alias];
            break;
          }
          if (args.flags.has(alias)) {
            value = true;
            break;
          }
        }
      }

      // Check flags for boolean args
      if (value === undefined && def.type === "boolean") {
        if (args.flags.has(def.name)) {
          value = true;
        } else if (def.aliases?.some((a) => args.flags.has(a))) {
          value = true;
        }
      }

      if (value !== undefined) {
        result[def.name] = this.coerceType(value, def.type);

        // Validate choices
        if (def.choices && !def.choices.includes(String(result[def.name]))) {
          throw new ParseError(
            `Invalid value for ${def.name}: must be one of ${def.choices.join(", ")}`,
            {
              argument: def.name,
              expected: def.choices.join(", "),
              received: String(result[def.name]),
            }
          );
        }
      } else if (def.required) {
        throw new ParseError(`Missing required argument: --${def.name}`, {
          argument: def.name,
        });
      } else if (def.default !== undefined) {
        result[def.name] = def.default;
      }
    }

    // Include remaining positional args
    result._ = args.positional.slice(positionalDefs.length);
    result._flags = Array.from(args.flags);

    return result;
  }

  /**
   * Coerce a value to the expected type
   */
  private coerceType(value: unknown, type: ArgumentDefinition["type"]): unknown {
    switch (type) {
      case "string":
        return String(value);

      case "number": {
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new ParseError(`Expected number but got: ${value}`);
        }
        return num;
      }

      case "boolean":
        if (typeof value === "boolean") return value;
        if (value === "true" || value === "1") return true;
        if (value === "false" || value === "0") return false;
        return Boolean(value);

      case "array":
        if (Array.isArray(value)) return value;
        return [value];

      default:
        return value;
    }
  }
}

/**
 * Global parser instance
 */
export const parser = new CommandParser();
