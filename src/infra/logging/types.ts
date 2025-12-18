/**
 * Logging Types
 *
 * Type definitions for the structured logging system.
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log context for structured logging
 *
 * Provides contextual information that can be attached to log entries
 * for filtering and correlation.
 */
export interface LogContext {
  /** Session identifier */
  sessionId?: string;
  /** Agent identifier */
  agentId?: string;
  /** Feature identifier */
  featureId?: string;
  /** Component or module name */
  component?: string;
  /** Workflow identifier */
  workflowId?: string;
  /** Stage identifier */
  stageId?: string;
  /** Additional custom properties */
  [key: string]: unknown;
}

/**
 * Log entry structure
 *
 * Represents a single log entry with all metadata.
 */
export interface LogEntry {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Contextual information */
  context?: LogContext;
  /** Error details (for error level logs) */
  error?: {
    /** Error message */
    message: string;
    /** Error name/type */
    name?: string;
    /** Stack trace */
    stack?: string;
    /** Error code (if applicable) */
    code?: string | number;
  };
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Output format: 'json' for structured, 'pretty' for human-readable */
  format: "json" | "pretty";
  /** Whether to include timestamps */
  timestamps: boolean;
  /** Whether to use colors (for pretty format) */
  colors: boolean;
  /** Default context to include in all log entries */
  defaultContext?: LogContext;
}

/**
 * Logger interface
 *
 * Defines the contract for logger implementations.
 */
export interface Logger {
  /**
   * Log a debug message
   *
   * @param message - Log message
   * @param context - Optional context
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log an info message
   *
   * @param message - Log message
   * @param context - Optional context
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log a warning message
   *
   * @param message - Log message
   * @param context - Optional context
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log an error message
   *
   * @param message - Log message
   * @param error - Optional error object
   * @param context - Optional context
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * Create a child logger with additional context
   *
   * @param context - Context to add to all logs from the child logger
   * @returns New logger instance with merged context
   */
  child(context: LogContext): Logger;

  /**
   * Set the minimum log level
   *
   * @param level - New minimum level
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current log level
   *
   * @returns Current minimum level
   */
  getLevel(): LogLevel;
}

/**
 * Log level numeric values for comparison
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Check if a level should be logged given a minimum level
 *
 * @param level - Level to check
 * @param minLevel - Minimum level threshold
 * @returns True if the level should be logged
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[minLevel];
}

/**
 * Parse a log level string
 *
 * @param level - String to parse
 * @returns Parsed log level or undefined
 */
export function parseLogLevel(level: string): LogLevel | undefined {
  const normalized = level.toLowerCase();
  if (normalized in LOG_LEVEL_VALUES) {
    return normalized as LogLevel;
  }
  return undefined;
}
