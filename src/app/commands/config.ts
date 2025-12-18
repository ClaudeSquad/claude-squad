/**
 * Config Command
 *
 * Displays and manages Claude Squad configuration.
 *
 * Usage:
 *   squad config show       Display current configuration
 *   squad config set <key> <value>  Set a configuration value
 *   squad config get <key>  Get a specific configuration value
 *   squad config path       Show config file locations
 */

import { stringify as yamlStringify } from "yaml";
import { loadConfig, formatConfigSources, isInitialized, CONFIG_FILES } from "../config/loader.js";
import { homedir } from "os";

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown, indent = 0): string {
  const prefix = "  ".repeat(indent);

  if (value === null || value === undefined) {
    return `${colors.dim}(not set)${colors.reset}`;
  }

  if (typeof value === "boolean") {
    return value ? `${colors.green}true${colors.reset}` : `${colors.red}false${colors.reset}`;
  }

  if (typeof value === "number") {
    return `${colors.cyan}${value}${colors.reset}`;
  }

  if (typeof value === "string") {
    return `${colors.yellow}"${value}"${colors.reset}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${colors.dim}[]${colors.reset}`;
    }
    const items = value.map((v) => `${prefix}  - ${formatValue(v)}`).join("\n");
    return `\n${items}`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return `${colors.dim}{}${colors.reset}`;
    }
    const formatted = entries
      .map(([k, v]) => `${prefix}  ${colors.bold}${k}${colors.reset}: ${formatValue(v, indent + 1)}`)
      .join("\n");
    return `\n${formatted}`;
  }

  return String(value);
}

/**
 * Show current configuration
 */
async function showConfig(): Promise<void> {
  const initialized = await isInitialized();

  if (!initialized) {
    console.log(`${colors.yellow}⚠${colors.reset} Claude Squad is not initialized in this project.`);
    console.log(`Run ${colors.cyan}squad init${colors.reset} to set up the project.\n`);
  }

  try {
    const { config, sources, projectPath } = await loadConfig();

    console.log(`\n${colors.bold}${colors.cyan}Claude Squad Configuration${colors.reset}\n`);
    console.log(`${colors.dim}Project: ${projectPath}${colors.reset}\n`);

    // Show config sources
    console.log(`${colors.bold}Configuration Sources:${colors.reset}`);
    console.log(formatConfigSources(sources));
    console.log();

    // Show configuration as YAML
    console.log(`${colors.bold}Current Configuration:${colors.reset}`);
    const yaml = yamlStringify(config, { indent: 2 });
    // Add syntax highlighting to YAML output
    const highlighted = yaml
      .split("\n")
      .map((line) => {
        // Highlight keys
        if (line.includes(":")) {
          const [key, ...rest] = line.split(":");
          const value = rest.join(":");
          return `${colors.cyan}${key}${colors.reset}:${value}`;
        }
        return line;
      })
      .join("\n");
    console.log(highlighted);
  } catch (error) {
    console.error(`${colors.red}Error loading configuration:${colors.reset}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Get a specific configuration value
 */
async function getConfigValue(key: string): Promise<void> {
  try {
    const { config } = await loadConfig();
    const value = getNestedValue(config as unknown as Record<string, unknown>, key);

    if (value === undefined) {
      console.log(`${colors.yellow}⚠${colors.reset} Configuration key not found: ${key}`);
      console.log(`\nAvailable top-level keys:`);
      const keys = Object.keys(config);
      keys.forEach((k) => console.log(`  - ${k}`));
      process.exit(1);
    }

    console.log(`${colors.bold}${key}${colors.reset}: ${formatValue(value)}`);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Set a configuration value
 */
async function setConfigValue(_key: string, _value: string): Promise<void> {
  // This will be implemented in Phase 2 when we have full config management
  console.log(`${colors.yellow}⚠${colors.reset} Setting configuration values is not yet implemented.`);
  console.log(`\nTo change configuration, edit the config file directly:`);
  console.log(`  Project: ${colors.cyan}.claude/squad.yaml${colors.reset}`);
  console.log(`  User:    ${colors.cyan}~/.config/squad/config.yaml${colors.reset}`);
  console.log(`\nOr use environment variables:`);
  console.log(`  ${colors.dim}SQUAD_DEFAULTS_MODEL=opus${colors.reset}`);
  console.log(`  ${colors.dim}SQUAD_DEFAULTS_MAXCONCURRENTAGENTS=3${colors.reset}`);
}

/**
 * Show config file paths
 */
async function showPaths(): Promise<void> {
  const projectPath = process.cwd();
  const userPath = homedir();

  console.log(`\n${colors.bold}Configuration File Locations${colors.reset}\n`);

  console.log(`${colors.cyan}Project Config${colors.reset} (highest priority for project-specific settings)`);
  console.log(`  ${projectPath}/${CONFIG_FILES.project}`);

  console.log(`\n${colors.cyan}User Config${colors.reset} (user-level defaults)`);
  console.log(`  ${userPath}/.config/squad/config.yaml`);

  console.log(`\n${colors.cyan}Environment Variables${colors.reset} (highest priority overall)`);
  console.log(`  Prefix: ${colors.yellow}SQUAD_${colors.reset}`);
  console.log(`  Example: ${colors.dim}SQUAD_DEFAULTS_MODEL=opus${colors.reset}`);

  console.log(`\n${colors.bold}Priority Order (highest to lowest):${colors.reset}`);
  console.log(`  1. Environment variables (SQUAD_*)`);
  console.log(`  2. Project config (.claude/squad.yaml)`);
  console.log(`  3. User config (~/.config/squad/config.yaml)`);
  console.log(`  4. Built-in defaults`);
}

/**
 * Main config command handler
 */
export async function configCommand(args: string[]): Promise<void> {
  const action = args[0];

  switch (action) {
    case "show":
    case undefined:
      await showConfig();
      break;

    case "get":
      if (!args[1]) {
        console.error(`${colors.red}Error:${colors.reset} Missing key argument.`);
        console.log(`Usage: squad config get <key>`);
        console.log(`Example: squad config get defaults.model`);
        process.exit(1);
      }
      await getConfigValue(args[1]);
      break;

    case "set":
      if (!args[1] || !args[2]) {
        console.error(`${colors.red}Error:${colors.reset} Missing key or value argument.`);
        console.log(`Usage: squad config set <key> <value>`);
        console.log(`Example: squad config set defaults.model opus`);
        process.exit(1);
      }
      await setConfigValue(args[1], args[2]);
      break;

    case "path":
    case "paths":
      await showPaths();
      break;

    default:
      console.error(`${colors.red}Error:${colors.reset} Unknown config action: ${action}`);
      console.log(`\nAvailable actions:`);
      console.log(`  show   Display current configuration`);
      console.log(`  get    Get a specific configuration value`);
      console.log(`  set    Set a configuration value`);
      console.log(`  path   Show config file locations`);
      process.exit(1);
  }
}
