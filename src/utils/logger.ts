/**
 * Logger Utility
 *
 * Provides structured logging with levels and formatting.
 * Supports debug mode via SQUAD_DEBUG environment variable.
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Log level names
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.SILENT]: "SILENT",
};

/**
 * ANSI color codes
 */
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

/**
 * Log level colors
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: colors.dim,
  [LogLevel.INFO]: colors.blue,
  [LogLevel.WARN]: colors.yellow,
  [LogLevel.ERROR]: colors.red,
  [LogLevel.SILENT]: "",
};

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamps?: boolean;
  colors?: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
  level: process.env.SQUAD_DEBUG ? LogLevel.DEBUG : LogLevel.INFO,
  timestamps: process.env.SQUAD_DEBUG === "true",
  colors: true,
};

/**
 * Current configuration
 */
let config: LoggerConfig = { ...defaultConfig };

/**
 * Format a log message
 */
function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const parts: string[] = [];

  // Timestamp
  if (config.timestamps) {
    const timestamp = new Date().toISOString();
    parts.push(config.colors ? `${colors.dim}[${timestamp}]${colors.reset}` : `[${timestamp}]`);
  }

  // Level
  const levelName = LOG_LEVEL_NAMES[level];
  if (config.colors) {
    const levelColor = LOG_LEVEL_COLORS[level];
    parts.push(`${levelColor}[${levelName}]${colors.reset}`);
  } else {
    parts.push(`[${levelName}]`);
  }

  // Prefix
  if (config.prefix) {
    parts.push(config.colors ? `${colors.cyan}[${config.prefix}]${colors.reset}` : `[${config.prefix}]`);
  }

  // Message
  parts.push(message);

  // Context
  if (context && Object.keys(context).length > 0) {
    const contextStr = JSON.stringify(context);
    parts.push(config.colors ? `${colors.dim}${contextStr}${colors.reset}` : contextStr);
  }

  return parts.join(" ");
}

/**
 * Log a message at the specified level
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (level < config.level) return;

  const formatted = formatMessage(level, message, context);

  switch (level) {
    case LogLevel.ERROR:
      console.error(formatted);
      break;
    case LogLevel.WARN:
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Logger interface type
 */
interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  configure(newConfig: Partial<LoggerConfig>): void;
  setLevel(level: LogLevel): void;
  setPrefix(prefix: string): void;
  child(prefix: string): Logger;
}

/**
 * Logger instance
 */
export const logger: Logger = {
  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.DEBUG, message, context);
  },

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.INFO, message, context);
  },

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.WARN, message, context);
  },

  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    log(LogLevel.ERROR, message, context);
  },

  /**
   * Configure the logger
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
  },

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    config.level = level;
  },

  /**
   * Set the prefix
   */
  setPrefix(prefix: string): void {
    config.prefix = prefix;
  },

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    const childConfig = { ...config, prefix };

    return {
      debug: (message: string, context?: Record<string, unknown>) => {
        const savedConfig = config;
        config = childConfig;
        log(LogLevel.DEBUG, message, context);
        config = savedConfig;
      },
      info: (message: string, context?: Record<string, unknown>) => {
        const savedConfig = config;
        config = childConfig;
        log(LogLevel.INFO, message, context);
        config = savedConfig;
      },
      warn: (message: string, context?: Record<string, unknown>) => {
        const savedConfig = config;
        config = childConfig;
        log(LogLevel.WARN, message, context);
        config = savedConfig;
      },
      error: (message: string, context?: Record<string, unknown>) => {
        const savedConfig = config;
        config = childConfig;
        log(LogLevel.ERROR, message, context);
        config = savedConfig;
      },
      configure: logger.configure,
      setLevel: logger.setLevel,
      setPrefix: logger.setPrefix,
      child: logger.child,
    };
  },
};

export default logger;
