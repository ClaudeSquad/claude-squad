/**
 * Configuration Loader Tests
 *
 * Tests for loading and merging configuration from multiple sources.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";

describe("Configuration Loader", () => {
  // Store original environment
  let originalEnv: NodeJS.ProcessEnv;
  let testDir: string;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    testDir = `/tmp/squad-test-${Date.now()}`;

    // Create test directory
    await Bun.write(join(testDir, ".gitkeep"), "");
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up test directory
    try {
      const proc = Bun.spawn(["rm", "-rf", testDir]);
      await proc.exited;
    } catch {
      // Ignore cleanup errors
    }
  });

  test("should load defaults when no config files exist", async () => {
    const { loadConfig } = await import("../../../src/app/config/loader.js");

    const result = await loadConfig(testDir);

    expect(result.config.projectName).toBeDefined();
    expect(result.config.defaults.workflow).toBe("feature");
    expect(result.config.defaults.model).toBe("sonnet");
  });

  test("should detect project path correctly", async () => {
    const { loadConfig } = await import("../../../src/app/config/loader.js");

    const result = await loadConfig(testDir);

    expect(result.projectPath).toBe(testDir);
  });

  test("should include sources information", async () => {
    const { loadConfig } = await import("../../../src/app/config/loader.js");

    const result = await loadConfig(testDir);

    expect(result.sources).toBeDefined();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.some((s) => s.type === "default")).toBe(true);
  });

  test("should load project config from .claude/squad.yaml", async () => {
    const { loadConfig } = await import("../../../src/app/config/loader.js");

    // Create project config
    const projectConfig = `
projectName: test-project
defaults:
  model: opus
  maxConcurrentAgents: 3
integrations:
  sourceControl: github
`;
    await Bun.write(join(testDir, ".claude", "squad.yaml"), projectConfig);

    const result = await loadConfig(testDir);

    expect(result.config.projectName).toBe("test-project");
    expect(result.config.defaults.model).toBe("opus");
    expect(result.config.defaults.maxConcurrentAgents).toBe(3);
    expect(result.config.integrations.sourceControl).toBe("github");
  });

  test("should merge config from multiple sources", async () => {
    const { loadConfig } = await import("../../../src/app/config/loader.js");

    // Create project config (partial)
    const projectConfig = `
projectName: test-project
defaults:
  model: opus
`;
    await Bun.write(join(testDir, ".claude", "squad.yaml"), projectConfig);

    const result = await loadConfig(testDir);

    // Should have project-specific value
    expect(result.config.defaults.model).toBe("opus");
    // Should have default values for unspecified fields
    expect(result.config.defaults.workflow).toBe("feature");
    expect(result.config.defaults.maxConcurrentAgents).toBe(5);
  });

  test("should override with environment variables", async () => {
    // Set environment variables
    // Note: only lowercase field names work with env vars (model, not maxConcurrentAgents)
    process.env.SQUAD_DEFAULTS_MODEL = "haiku";

    // Re-import to pick up new env vars
    const loaderModule = await import("../../../src/app/config/loader.js");

    // Create project config
    const projectConfig = `
projectName: test-project
defaults:
  model: opus
`;
    await Bun.write(join(testDir, ".claude", "squad.yaml"), projectConfig);

    const result = await loaderModule.loadConfig(testDir);

    // Environment variables should override file config
    expect(result.config.defaults.model).toBe("haiku");
    // camelCase fields like maxConcurrentAgents use default since env parsing lowercases
    expect(result.config.defaults.maxConcurrentAgents).toBe(5);
  });

  test("should derive project name from directory if not specified", async () => {
    const { loadConfig } = await import("../../../src/app/config/loader.js");

    const result = await loadConfig(testDir);

    // Project name should be derived from directory name
    expect(result.config.projectName).toContain("squad-test");
  });
});

describe("isInitialized", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = `/tmp/squad-init-test-${Date.now()}`;
    await Bun.write(join(testDir, ".gitkeep"), "");
  });

  afterEach(async () => {
    try {
      const proc = Bun.spawn(["rm", "-rf", testDir]);
      await proc.exited;
    } catch {
      // Ignore
    }
  });

  test("should return false when not initialized", async () => {
    const { isInitialized } = await import("../../../src/app/config/loader.js");

    const result = await isInitialized(testDir);

    expect(result).toBe(false);
  });

  test("should return true when config file exists", async () => {
    const { isInitialized } = await import("../../../src/app/config/loader.js");

    // Create config file
    await Bun.write(join(testDir, ".claude", "squad.yaml"), "projectName: test");

    const result = await isInitialized(testDir);

    expect(result).toBe(true);
  });
});

describe("saveProjectConfig", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = `/tmp/squad-save-test-${Date.now()}`;
    await Bun.write(join(testDir, ".gitkeep"), "");
  });

  afterEach(async () => {
    try {
      const proc = Bun.spawn(["rm", "-rf", testDir]);
      await proc.exited;
    } catch {
      // Ignore
    }
  });

  test("should save config to .claude/squad.yaml", async () => {
    const { saveProjectConfig, getProjectConfigPath } = await import(
      "../../../src/app/config/loader.js"
    );

    const config = {
      projectName: "saved-project",
      defaults: {
        model: "opus" as const,
      },
    };

    await saveProjectConfig(config, testDir);

    const configPath = await getProjectConfigPath(testDir);
    const file = Bun.file(configPath);
    const content = await file.text();

    expect(content).toContain("projectName: saved-project");
    expect(content).toContain("model: opus");
  });
});

describe("formatConfigSources", () => {
  test("should format sources with status indicators", async () => {
    const { formatConfigSources } = await import("../../../src/app/config/loader.js");

    const sources = [
      { type: "default" as const, loaded: true },
      { type: "user" as const, path: "~/.config/squad/config.yaml", loaded: false },
      { type: "project" as const, path: ".claude/squad.yaml", loaded: true },
      { type: "env" as const, loaded: false },
    ];

    const formatted = formatConfigSources(sources);

    expect(formatted).toContain("default");
    expect(formatted).toContain("user");
    expect(formatted).toContain("project");
    expect(formatted).toContain("env");
  });
});
