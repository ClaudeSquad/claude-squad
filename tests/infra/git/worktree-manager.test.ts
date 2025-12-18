/**
 * Worktree Manager Tests
 *
 * Tests for the multi-repo worktree management system.
 * Uses mocked Git operations to avoid actual git commands.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  WorktreeManager,
  createWorktreeManager,
  type WorktreePoolConfig,
} from "../../../src/infra/git/worktree-manager.js";
import { rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

describe("WorktreeManager", () => {
  const testBaseDir = "/tmp/claude-squad-test-worktrees";
  let manager: WorktreeManager;

  beforeEach(async () => {
    // Clean up any previous test artifacts
    try {
      await rm(testBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }

    manager = createWorktreeManager({
      baseDir: testBaseDir,
      maxPerRepo: 5,
      staleHours: 1,
      autoCleanup: false, // Disable auto-cleanup for testing
    });
  });

  afterEach(async () => {
    // Clean up
    try {
      await rm(testBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe("constructor", () => {
    it("should use provided configuration", () => {
      const config: Partial<WorktreePoolConfig> = {
        baseDir: "/custom/path",
        maxPerRepo: 20,
        staleHours: 48,
        autoCleanup: true,
      };

      const customManager = new WorktreeManager(config);
      const stats = customManager.getStats();

      expect(stats.totalAllocations).toBe(0);
    });

    it("should use default configuration when not provided", () => {
      const defaultManager = new WorktreeManager();
      const stats = defaultManager.getStats();

      expect(stats.totalAllocations).toBe(0);
    });
  });

  describe("initialize", () => {
    it("should create base directory", async () => {
      await manager.initialize();

      // Check that the directory exists - access() doesn't throw if it exists
      let exists = false;
      try {
        await access(testBaseDir);
        exists = true;
      } catch {
        exists = false;
      }
      expect(exists).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return empty stats initially", () => {
      const stats = manager.getStats();

      expect(stats.totalAllocations).toBe(0);
      expect(stats.activeAllocations).toBe(0);
      expect(stats.dirtyAllocations).toBe(0);
      expect(stats.byRepo).toEqual({});
      expect(stats.byFeature).toEqual({});
    });
  });

  describe("getAllocation", () => {
    it("should return undefined for non-existent allocation", () => {
      const allocation = manager.getAllocation("wta_nonexistent");
      expect(allocation).toBeUndefined();
    });
  });

  describe("getAllAllocations", () => {
    it("should return empty array initially", () => {
      const allocations = manager.getAllAllocations();
      expect(allocations).toEqual([]);
    });
  });

  describe("getAllocationsForRepo", () => {
    it("should return empty array for repo with no allocations", () => {
      const allocations = manager.getAllocationsForRepo("/some/repo");
      expect(allocations).toEqual([]);
    });
  });

  describe("getAllocationsForAgent", () => {
    it("should return empty array for agent with no allocations", () => {
      const allocations = manager.getAllocationsForAgent("agt_123");
      expect(allocations).toEqual([]);
    });
  });

  describe("getAllocationsForFeature", () => {
    it("should return empty array for feature with no allocations", () => {
      const allocations = manager.getAllocationsForFeature("ftr_123");
      expect(allocations).toEqual([]);
    });
  });

  describe("findByPath", () => {
    it("should return undefined for unknown path", () => {
      const allocation = manager.findByPath("/unknown/path");
      expect(allocation).toBeUndefined();
    });
  });

  describe("touch", () => {
    it("should not throw for non-existent allocation", () => {
      expect(() => manager.touch("wta_nonexistent")).not.toThrow();
    });
  });

  describe("markDirty", () => {
    it("should not throw for non-existent allocation", () => {
      expect(() => manager.markDirty("wta_nonexistent", true)).not.toThrow();
    });
  });

  describe("cleanupStaleWorktrees", () => {
    it("should return 0 when no stale worktrees", async () => {
      const cleaned = await manager.cleanupStaleWorktrees();
      expect(cleaned).toBe(0);
    });
  });

  describe("cleanupFeature", () => {
    it("should return 0 for feature with no worktrees", async () => {
      const cleaned = await manager.cleanupFeature("ftr_nonexistent");
      expect(cleaned).toBe(0);
    });
  });

  describe("cleanupAgent", () => {
    it("should return 0 for agent with no worktrees", async () => {
      const cleaned = await manager.cleanupAgent("agt_nonexistent");
      expect(cleaned).toBe(0);
    });
  });

  describe("syncWithDisk", () => {
    it("should return empty results when no allocations", async () => {
      const result = await manager.syncWithDisk();

      expect(result.removed).toBe(0);
      expect(result.orphaned).toEqual([]);
    });
  });
});

describe("createWorktreeManager factory", () => {
  it("should create a WorktreeManager instance", () => {
    const manager = createWorktreeManager();
    expect(manager).toBeInstanceOf(WorktreeManager);
  });

  it("should accept configuration", () => {
    const manager = createWorktreeManager({
      baseDir: "/custom",
      maxPerRepo: 15,
    });

    expect(manager).toBeInstanceOf(WorktreeManager);
  });
});
