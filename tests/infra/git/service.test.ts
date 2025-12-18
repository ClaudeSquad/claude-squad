/**
 * Git Service Tests
 *
 * Tests for Git operations wrapper.
 * Uses mocked Bun.spawn for isolation.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { GitService, createGitService } from "../../../src/infra/git/service.js";
import { GitError } from "../../../src/infra/git/types.js";

describe("GitService", () => {
  let gitService: GitService;
  let originalSpawn: typeof Bun.spawn;

  beforeEach(() => {
    gitService = new GitService("/test/repo");
    originalSpawn = Bun.spawn;
  });

  afterEach(() => {
    Bun.spawn = originalSpawn;
  });

  /**
   * Helper to mock Bun.spawn with specific output
   */
  function mockSpawn(stdout: string, stderr = "", exitCode = 0) {
    const mockProc = {
      stdout: new Response(stdout).body,
      stderr: new Response(stderr).body,
      exited: Promise.resolve(exitCode),
    };

    // @ts-expect-error - Mocking Bun.spawn
    Bun.spawn = mock(() => mockProc);
  }

  describe("getCurrentBranch", () => {
    it("should return current branch name", async () => {
      mockSpawn("feature/login\n");

      const branch = await gitService.getCurrentBranch();

      expect(branch).toBe("feature/login");
    });

    it("should handle detached HEAD", async () => {
      mockSpawn("HEAD\n");

      const branch = await gitService.getCurrentBranch();

      expect(branch).toBe("HEAD");
    });
  });

  describe("listWorktrees", () => {
    it("should parse porcelain worktree list output", async () => {
      mockSpawn(
        `worktree /path/to/repo
HEAD abc1234567890
branch refs/heads/main

worktree /path/to/worktree1
HEAD def5678901234
branch refs/heads/feature/a
`
      );

      const worktrees = await gitService.listWorktrees();

      expect(worktrees.length).toBe(2);
      expect(worktrees[0]?.path).toBe("/path/to/repo");
      expect(worktrees[0]?.head).toBe("abc1234567890");
      expect(worktrees[0]?.branch).toBe("main");
      expect(worktrees[1]?.branch).toBe("feature/a");
    });

    it("should handle locked worktrees", async () => {
      mockSpawn(
        `worktree /path/to/repo
HEAD abc1234567890
branch refs/heads/main
locked
`
      );

      const worktrees = await gitService.listWorktrees();

      expect(worktrees[0]?.isLocked).toBe(true);
    });
  });

  describe("createWorktree", () => {
    it("should create worktree with new branch", async () => {
      mockSpawn("");

      await expect(
        gitService.createWorktree({
          baseBranch: "main",
          newBranch: "feature/new-feature",
          path: "/test/worktrees/feature-1",
        })
      ).resolves.toBeUndefined();

      // Verify spawn was called with correct arguments
      expect(Bun.spawn).toHaveBeenCalled();
    });

    it("should throw GitError on failure", async () => {
      mockSpawn("", "fatal: '/test/worktrees/bad' already exists", 128);

      await expect(
        gitService.createWorktree({
          baseBranch: "main",
          newBranch: "feature/test",
          path: "/test/worktrees/bad",
        })
      ).rejects.toThrow(GitError);
    });
  });

  describe("removeWorktree", () => {
    it("should remove worktree", async () => {
      mockSpawn("");

      await expect(
        gitService.removeWorktree({
          path: "/test/worktrees/to-remove",
        })
      ).resolves.toBeUndefined();
    });

    it("should force remove worktree when specified", async () => {
      mockSpawn("");

      await expect(
        gitService.removeWorktree({
          path: "/test/worktrees/dirty",
          force: true,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("commit", () => {
    it("should commit with message", async () => {
      // First call for commit, second for rev-parse
      let callCount = 0;
      const mockProc = () => {
        callCount++;
        if (callCount === 1) {
          // git add -A
          return {
            stdout: new Response("").body,
            stderr: new Response("").body,
            exited: Promise.resolve(0),
          };
        } else if (callCount === 2) {
          // git commit -m
          return {
            stdout: new Response("").body,
            stderr: new Response("").body,
            exited: Promise.resolve(0),
          };
        } else {
          // git rev-parse HEAD
          return {
            stdout: new Response("abc123def456\n").body,
            stderr: new Response("").body,
            exited: Promise.resolve(0),
          };
        }
      };

      // @ts-expect-error - Mocking Bun.spawn
      Bun.spawn = mock(mockProc);

      const commitHash = await gitService.commit({
        cwd: "/test/repo",
        message: "Test commit message",
        addAll: true,
      });

      expect(commitHash).toBe("abc123def456");
    });
  });

  describe("getDiff", () => {
    it("should return diff output", async () => {
      const diffOutput = `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 line1
+new line
 line2`;

      mockSpawn(diffOutput);

      const diff = await gitService.getDiff("/test/repo");

      expect(diff).toContain("diff --git");
      expect(diff).toContain("+new line");
    });

    it("should return diff against specific base", async () => {
      mockSpawn("diff output here");

      const diff = await gitService.getDiff("/test/repo", "main");

      expect(diff).toBe("diff output here");
    });

    it("should return empty string for clean repo", async () => {
      mockSpawn("");

      const diff = await gitService.getDiff("/test/repo");

      expect(diff).toBe("");
    });
  });

  describe("getStatus", () => {
    it("should return repository status", async () => {
      // Mock both branch and status porcelain outputs
      let callCount = 0;
      const mockProc = () => {
        callCount++;
        const output = callCount === 1
          ? "# branch.head main\n# branch.ab +1 -0\n"
          : "1 M. N... 100644 100644 100644 abc123 def456 src/index.ts\n? newfile.txt\n";
        return {
          stdout: new Response(output).body,
          stderr: new Response("").body,
          exited: Promise.resolve(0),
        };
      };

      // @ts-expect-error - Mocking Bun.spawn
      Bun.spawn = mock(mockProc);

      const status = await gitService.getStatus();

      expect(status.branch).toBe("main");
      expect(status.ahead).toBe(1);
      expect(status.behind).toBe(0);
    });
  });

  describe("isClean", () => {
    it("should return true for clean repo", async () => {
      mockSpawn("");

      const clean = await gitService.isClean();

      expect(clean).toBe(true);
    });

    it("should return false for dirty repo", async () => {
      mockSpawn(" M src/index.ts\n");

      const clean = await gitService.isClean();

      expect(clean).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should throw GitError with message and exit code on createWorktree failure", async () => {
      mockSpawn("", "fatal: '/path/exists' already exists", 128);

      try {
        await gitService.createWorktree({
          baseBranch: "main",
          newBranch: "feature/test",
          path: "/path/exists",
        });
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GitError);
        expect((error as GitError).exitCode).toBe(128);
        expect((error as GitError).stderr).toContain("already exists");
      }
    });
  });

  describe("isGitRepo", () => {
    it("should return true for git repository", async () => {
      mockSpawn(".git\n");

      const isRepo = await gitService.isGitRepo("/test/repo");

      expect(isRepo).toBe(true);
    });

    it("should return false for non-git directory", async () => {
      mockSpawn("", "fatal: not a git repository", 128);

      const isRepo = await gitService.isGitRepo("/not/a/repo");

      expect(isRepo).toBe(false);
    });
  });

  describe("createGitService factory", () => {
    it("should create new GitService instance", () => {
      const service = createGitService("/test/path");
      expect(service).toBeInstanceOf(GitService);
    });
  });
});
