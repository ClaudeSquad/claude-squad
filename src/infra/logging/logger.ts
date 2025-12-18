/**
 * Squad Logger
 *
 * Structured logging with support for JSON output, colored console output,
 * child loggers for context propagation, and debug mode via environment.
 */

import type { LogLevel, LogContext, Logger, LoggerConfig, LogEntry } from "./types.js";
import { shouldLog, parseLogLevel } from "./types.js";

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

/**
 * Color mapping for log levels
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
};

/**
 * Level badge text
 */
const LEVEL_BADGES: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
};

/**
 * Squad Logger Implementation
 *
 * Provides structured logging with multiple output formats and
 * context propagation through child loggers.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const log = new SquadLogger();
 * log.info("Application started", { component: "app" });
 *
 * // Child logger with context
 * const agentLog = log.child({ agentId: "agt_123" });
 * agentLog.debug("Processing task");
 *
 * // Error logging
 * try {
 *   // ...
 * } catch (err) {
 *   log.error("Operation failed", err as Error, { operation: "save" });
 * }
 * ```
 */
export class SquadLogger implements Logger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(options: Partial<LoggerConfig> & { context?: LogContext } = {}) {
    // Determine log level from environment or options
    const envLevel = parseLogLevel(process.env.SQUAD_LOG_LEVEL || "");
    const debugMode = process.env.SQUAD_DEBUG === "1" || process.env.SQUAD_DEBUG === "true";

    this.config = {
      level: options.level || envLevel || (debugMode ? "debug" : "info"),
      format: options.format || (process.env.SQUAD_LOG_FORMAT === "json" ? "json" : "pretty"),
      timestamps: options.timestamps ?? true,
      colors: options.colors ?? process.stdout.isTTY ?? false,
      defaultContext: options.defaultContext,
    };

    this.context = options.context || {};
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log an error message with optional Error object
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error
      ? {
          ...context,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: (error as NodeJS.ErrnoException).code,
          },
        }
      : context;

    this.log("error", message, errorContext);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new SquadLogger({
      ...this.config,
      context: { ...this.context, ...context },
    });
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Check if this level should be logged
    if (!shouldLog(level, this.config.level)) {
      return;
    }

    // Merge contexts
    const mergedContext = {
      ...this.config.defaultContext,
      ...this.context,
      ...context,
    };

    // Extract error from context if present
    const errorInfo = mergedContext.error as LogEntry["error"] | undefined;
    // biome-ignore lint/performance/noDelete: Need to remove error from context
    delete mergedContext.error;

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(mergedContext).length > 0 ? mergedContext : undefined,
      error: errorInfo,
    };

    // Output based on format
    if (this.config.format === "json") {
      this.outputJson(entry);
    } else {
      this.outputPretty(entry);
    }
  }

  /**
   * Output log entry as JSON
   */
  private outputJson(entry: LogEntry): void {
    // Flatten for JSON output
    const output: Record<string, unknown> = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
    };

    // Spread context properties at top level
    if (entry.context) {
      Object.assign(output, entry.context);
    }

    // Add error details
    if (entry.error) {
      output.error = entry.error.message;
      if (entry.error.stack) {
        output.stack = entry.error.stack;
      }
    }

    console.log(JSON.stringify(output));
  }

  /**
   * Output log entry in pretty format
   */
  private outputPretty(entry: LogEntry): void {
    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamps) {
      const timestamp = entry.timestamp.slice(11, 23); // HH:MM:SS.mmm
      parts.push(
        this.colorize(COLORS.dim, `[${timestamp}]`)
      );
    }

    // Level badge
    const levelBadge = LEVEL_BADGES[entry.level];
    parts.push(
      this.colorize(LEVEL_COLORS[entry.level], `[${levelBadge}]`)
    );

    // Component (if present)
    if (entry.context?.component) {
      parts.push(
        this.colorize(COLORS.magenta, `[${entry.context.component}]`)
      );
    }

    // Message
    parts.push(entry.message);

    // Context (excluding component which is shown as badge)
    const contextToShow = entry.context
      ? Object.fromEntries(
          Object.entries(entry.context).filter(([key]) => key !== "component")
        )
      : undefined;

    if (contextToShow && Object.keys(contextToShow).length > 0) {
      parts.push(
        this.colorize(COLORS.dim, JSON.stringify(contextToShow))
      );
    }

    // Output the main line
    const output = parts.join(" ");

    switch (entry.level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }

    // Output stack trace for errors
    if (entry.error?.stack) {
      const stackLines = entry.error.stack.split("\n").slice(1);
      for (const line of stackLines) {
        console.error(this.colorize(COLORS.dim, line));
      }
    }
  }

  /**
   * Apply color to text (if colors enabled)
   */
  private colorize(color: string, text: string): string {
    if (!this.config.colors) {
      return text;
    }
    return `${color}${text}${COLORS.reset}`;
  }
}

/**
 * Global logger instance
 *
 * Default logger for application-wide use.
 *
 * @example
 * ```typescript
 * import { logger } from "@squad/infra/logging";
 *
 * logger.info("Application started");
 * logger.debug("Debug info", { key: "value" });
 * ```
 */
export const logger = new SquadLogger();

/**
 * Create a new logger instance
 *
 * @param options - Logger configuration options
 * @returns New logger instance
 */
export function createLogger(
  options?: Partial<LoggerConfig> & { context?: LogContext }
): Logger {
  return new SquadLogger(options);
}

/**
 * Create a component-scoped logger
 *
 * @param component - Component name
 * @returns Logger with component context
 *
 * @example
 * ```typescript
 * const log = componentLogger("GitService");
 * log.info("Creating worktree"); // Shows [GitService] prefix
 * ```
 */
export function componentLogger(component: string): Logger {
  return logger.child({ component });
}
