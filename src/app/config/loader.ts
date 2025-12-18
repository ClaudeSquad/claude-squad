/**
 * Configuration Loader
 *
 * Loads and merges configuration from multiple sources:
 * 1. Built-in defaults
 * 2. User config (~/.config/squad/config.yaml)
 * 3. Project config (.claude/squad.yaml)
 * 4. Environment variables (SQUAD_*)
 *
 * Higher precedence sources override lower ones.
 */

import { parse as parseYaml } from "yaml";
import { homedir } from "os";
import { join, resolve } from "path";
import {
  type SquadConfig,
  type PartialSquadConfig,
  SquadConfigSchema,
  DEFAULT_CONFIG,
  ENV_PREFIX,
  CONFIG_FILES,
  formatValidationErrors,
} from "./schema.js";

// Re-export CONFIG_FILES for convenience
export { CONFIG_FILES };

/**
 * Configuration source for debugging
 */
export interface ConfigSource {
  type: "default" | "user" | "project" | "env";
  path?: string;
  loaded: boolean;
  error?: string;
}

/**
 * Result of loading configuration
 */
export interface ConfigResult {
  config: SquadConfig;
  sources: ConfigSource[];
  projectPath: string;
}

/**
 * Deep merge two objects, with source overriding target
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Read a YAML file and parse it
 */
async function readYamlFile(filePath: string): Promise<PartialSquadConfig | null> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) {
      return null;
    }
    const content = await file.text();
    return parseYaml(content) as PartialSquadConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read config file ${filePath}: ${message}`);
  }
}

/**
 * Expand ~ to home directory in path
 */
function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Convert environment variable name to config path
 * SQUAD_DEFAULTS_MODEL -> defaults.model
 */
function envToConfigPath(envName: string): string[] {
  const withoutPrefix = envName.slice(ENV_PREFIX.length);
  return withoutPrefix.toLowerCase().split("_");
}

/**
 * Set a nested value in an object using a path array
 */
function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (key === undefined) continue;
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = path[path.length - 1];
  if (lastKey !== undefined) {
    current[lastKey] = value;
  }
}

/**
 * Parse environment variable value to appropriate type
 */
function parseEnvValue(value: string): unknown {
  // Boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;

  // Array (comma-separated)
  if (value.includes(",")) {
    return value.split(",").map((v) => v.trim());
  }

  // String
  return value;
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): PartialSquadConfig {
  const config: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(ENV_PREFIX) && value !== undefined) {
      const path = envToConfigPath(key);
      const parsedValue = parseEnvValue(value);
      setNestedValue(config, path, parsedValue);
    }
  }

  return config as PartialSquadConfig;
}

/**
 * Find the project root by looking for .git or .claude directory
 */
async function findProjectRoot(startPath: string): Promise<string> {
  let currentPath = resolve(startPath);
  const root = resolve("/");

  while (currentPath !== root) {
    // Check for .git directory
    const gitPath = join(currentPath, ".git");
    const gitFile = Bun.file(gitPath);
    if (await gitFile.exists()) {
      return currentPath;
    }

    // Check for .claude directory
    const claudePath = join(currentPath, ".claude");
    const claudeFile = Bun.file(claudePath);
    if (await claudeFile.exists()) {
      return currentPath;
    }

    // Move up one directory
    const parentPath = resolve(currentPath, "..");
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }

  // Default to start path if no project root found
  return startPath;
}

/**
 * Load configuration from all sources
 */
export async function loadConfig(cwd?: string): Promise<ConfigResult> {
  const sources: ConfigSource[] = [];
  const startPath = cwd ?? process.cwd();
  const projectPath = await findProjectRoot(startPath);

  // Start with defaults
  let mergedConfig: PartialSquadConfig = { ...DEFAULT_CONFIG };
  sources.push({
    type: "default",
    loaded: true,
  });

  // Load user config
  const userConfigPath = expandPath(CONFIG_FILES.user);
  try {
    const userConfig = await readYamlFile(userConfigPath);
    if (userConfig) {
      mergedConfig = deepMerge(mergedConfig as Record<string, unknown>, userConfig as Record<string, unknown>) as PartialSquadConfig;
      sources.push({
        type: "user",
        path: userConfigPath,
        loaded: true,
      });
    } else {
      sources.push({
        type: "user",
        path: userConfigPath,
        loaded: false,
      });
    }
  } catch (error) {
    sources.push({
      type: "user",
      path: userConfigPath,
      loaded: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Load project config
  const projectConfigPath = join(projectPath, CONFIG_FILES.project);
  try {
    const projectConfig = await readYamlFile(projectConfigPath);
    if (projectConfig) {
      mergedConfig = deepMerge(mergedConfig as Record<string, unknown>, projectConfig as Record<string, unknown>) as PartialSquadConfig;
      sources.push({
        type: "project",
        path: projectConfigPath,
        loaded: true,
      });
    } else {
      sources.push({
        type: "project",
        path: projectConfigPath,
        loaded: false,
      });
    }
  } catch (error) {
    sources.push({
      type: "project",
      path: projectConfigPath,
      loaded: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Load environment variables (highest precedence)
  const envConfig = loadEnvConfig();
  if (Object.keys(envConfig).length > 0) {
    mergedConfig = deepMerge(mergedConfig as Record<string, unknown>, envConfig as Record<string, unknown>) as PartialSquadConfig;
    sources.push({
      type: "env",
      loaded: true,
    });
  } else {
    sources.push({
      type: "env",
      loaded: false,
    });
  }

  // If no projectName is set, derive from directory name
  if (!mergedConfig.projectName) {
    const dirName = projectPath.split("/").pop() ?? "unnamed-project";
    mergedConfig.projectName = dirName;
  }

  // Set projectPath if not already set
  if (!mergedConfig.projectPath) {
    mergedConfig.projectPath = projectPath;
  }

  // Validate the final config
  const result = SquadConfigSchema.safeParse(mergedConfig);
  if (!result.success) {
    throw new Error(formatValidationErrors(result.error));
  }

  return {
    config: result.data,
    sources,
    projectPath,
  };
}

/**
 * Check if Squad is initialized in the current project
 */
export async function isInitialized(cwd?: string): Promise<boolean> {
  const startPath = cwd ?? process.cwd();
  const projectPath = await findProjectRoot(startPath);
  const configPath = join(projectPath, CONFIG_FILES.project);

  const file = Bun.file(configPath);
  return file.exists();
}

/**
 * Get the path where project config should be created
 */
export async function getProjectConfigPath(cwd?: string): Promise<string> {
  const startPath = cwd ?? process.cwd();
  const projectPath = await findProjectRoot(startPath);
  return join(projectPath, CONFIG_FILES.project);
}

/**
 * Save configuration to project config file
 */
export async function saveProjectConfig(config: PartialSquadConfig, cwd?: string): Promise<void> {
  const { stringify } = await import("yaml");
  const configPath = await getProjectConfigPath(cwd);

  // Ensure .claude directory exists
  const claudeDir = configPath.replace(/\/[^/]+$/, "");
  const dir = Bun.file(claudeDir);
  if (!(await dir.exists())) {
    await Bun.write(join(claudeDir, ".keep"), "");
    // Remove the .keep file after ensuring directory creation
    // Bun.write creates directories automatically
  }

  const yamlContent = stringify(config, {
    indent: 2,
    lineWidth: 100,
  });

  await Bun.write(configPath, yamlContent);
}

/**
 * Format config sources for display
 */
export function formatConfigSources(sources: ConfigSource[]): string {
  const lines = sources.map((source) => {
    const status = source.loaded ? "✓" : "○";
    const statusColor = source.loaded ? "\x1b[32m" : "\x1b[90m";
    const reset = "\x1b[0m";

    let line = `${statusColor}${status}${reset} ${source.type}`;
    if (source.path) {
      line += ` (${source.path})`;
    }
    if (source.error) {
      line += `\n  ${"\x1b[31m"}Error: ${source.error}${reset}`;
    }
    return line;
  });

  return lines.join("\n");
}
