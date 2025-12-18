/**
 * CLI Entry Point Tests
 *
 * Tests for the main CLI argument parsing and command routing.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";

// Mock console methods
let consoleLogSpy: ReturnType<typeof spyOn>;
let consoleErrorSpy: ReturnType<typeof spyOn>;
let processExitSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  processExitSpy = spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit called");
  });
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  processExitSpy.mockRestore();
});

describe("CLI Argument Parsing", () => {
  test("should parse --help flag", async () => {
    const { parseArguments } = await import("../../src/cli/index.js");

    // Save original argv
    const originalArgv = Bun.argv;

    // Mock argv
    (Bun as any).argv = ["bun", "script.ts", "--help"];

    const parsed = parseArguments();

    expect(parsed.options.help).toBe(true);
    expect(parsed.command).toBe(null);

    // Restore argv
    (Bun as any).argv = originalArgv;
  });

  test("should parse --version flag", async () => {
    const { parseArguments } = await import("../../src/cli/index.js");

    const originalArgv = Bun.argv;
    (Bun as any).argv = ["bun", "script.ts", "--version"];

    const parsed = parseArguments();

    expect(parsed.options.version).toBe(true);

    (Bun as any).argv = originalArgv;
  });

  test("should parse -h short flag", async () => {
    const { parseArguments } = await import("../../src/cli/index.js");

    const originalArgv = Bun.argv;
    (Bun as any).argv = ["bun", "script.ts", "-h"];

    const parsed = parseArguments();

    expect(parsed.options.help).toBe(true);

    (Bun as any).argv = originalArgv;
  });

  test("should parse command with arguments", async () => {
    const { parseArguments } = await import("../../src/cli/index.js");

    const originalArgv = Bun.argv;
    (Bun as any).argv = ["bun", "script.ts", "config", "show"];

    const parsed = parseArguments();

    expect(parsed.command).toBe("config");
    expect(parsed.args).toEqual(["show"]);

    (Bun as any).argv = originalArgv;
  });

  test("should parse --cwd option", async () => {
    const { parseArguments } = await import("../../src/cli/index.js");

    const originalArgv = Bun.argv;
    (Bun as any).argv = ["bun", "script.ts", "--cwd", "/some/path", "start"];

    const parsed = parseArguments();

    expect(parsed.options.cwd).toBe("/some/path");
    expect(parsed.command).toBe("start");

    (Bun as any).argv = originalArgv;
  });

  test("should parse --debug flag", async () => {
    const { parseArguments } = await import("../../src/cli/index.js");

    const originalArgv = Bun.argv;
    (Bun as any).argv = ["bun", "script.ts", "-d", "start"];

    const parsed = parseArguments();

    expect(parsed.options.debug).toBe(true);

    (Bun as any).argv = originalArgv;
  });
});

describe("CLI Help Display", () => {
  test("showHelp should output help text", async () => {
    const { showHelp } = await import("../../src/cli/index.js");

    showHelp();

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("Claude Squad");
    expect(output).toContain("COMMANDS");
    expect(output).toContain("start");
    expect(output).toContain("init");
    expect(output).toContain("analyze");
  });

  test("showHelp should output command-specific help", async () => {
    const { showHelp } = await import("../../src/cli/index.js");

    showHelp("init");

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("squad init");
    expect(output).toContain("Initialize");
  });
});

describe("CLI Version Display", () => {
  test("showVersion should output version", async () => {
    const { showVersion } = await import("../../src/cli/index.js");

    showVersion();

    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("claude-squad");
  });
});
