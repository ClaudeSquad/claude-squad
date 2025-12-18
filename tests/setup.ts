/**
 * Global Test Setup
 *
 * Configures the test environment for Claude Squad.
 * This file is loaded before all tests via bunfig.toml preload.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { mockClaudeCLI } from "./mocks/claude-cli.js";
import { mockGitService } from "./mocks/git-service.js";
import { mockFileSystem } from "./mocks/file-system.js";

// Extend global namespace for test utilities
declare global {
  var testDb: ReturnType<typeof import("./fixtures/database.js").createTestDatabase> | null;
  var testProjectPath: string;
}

/**
 * Global setup - runs once before all tests
 */
beforeAll(() => {
  // Set up test environment
  globalThis.testProjectPath = "/tmp/claude-squad-test";

  // Initialize test database (in-memory)
  // This will be implemented in Phase 2 when SQLite is added
  globalThis.testDb = null;

  // Suppress console output during tests unless DEBUG=true
  if (!process.env.DEBUG) {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    // Override with no-ops for cleaner test output
    console.log = () => {};
    console.info = () => {};

    // Keep warn and error for debugging
    if (!process.env.QUIET) {
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    }
  }
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(() => {
  // Clean up test database
  if (globalThis.testDb) {
    globalThis.testDb.close();
    globalThis.testDb = null;
  }
});

/**
 * Reset mocks before each test
 */
beforeEach(() => {
  mockClaudeCLI.reset();
  mockGitService.reset();
  mockFileSystem.reset();
});

/**
 * Clean up after each test
 */
afterEach(() => {
  // Any per-test cleanup
});

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Create a temporary test directory
   */
  async createTestDir(name: string): Promise<string> {
    const path = `${globalThis.testProjectPath}/${name}-${Date.now()}`;
    await Bun.write(`${path}/.gitkeep`, "");
    return path;
  },

  /**
   * Clean up a test directory
   */
  async cleanupTestDir(path: string): Promise<void> {
    try {
      const proc = Bun.spawn(["rm", "-rf", path]);
      await proc.exited;
    } catch {
      // Ignore cleanup errors
    }
  },

  /**
   * Wait for a condition to be true
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  },
};

export { mockClaudeCLI, mockGitService, mockFileSystem };
