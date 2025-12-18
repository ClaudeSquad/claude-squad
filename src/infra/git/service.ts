/**
 * Git Service
 *
 * Provides Git operations for worktree management, commits, and diffs.
 * Uses Bun.spawn for executing git commands.
 */

import type {
  Worktree,
  Commit,
  DiffStats,
  Branch,
  RepoStatus,
  StatusFile,
  CreateWorktreeOptions,
  RemoveWorktreeOptions,
  CommitOptions,
} from "./types.js";
import { GitError } from "./types.js";

/**
 * Git Service
 *
 * Wraps git CLI commands using Bun.spawn for worktree management,
 * commits, diffs, and other git operations needed by Claude Squad.
 *
 * @example
 * ```typescript
 * const git = new GitService('/path/to/repo');
 *
 * // Create a worktree for an agent
 * await git.createWorktree({
 *   baseBranch: 'main',
 *   newBranch: 'feature/agent-work',
 *   path: '/tmp/worktrees/agent-1'
 * });
 *
 * // Commit changes in the worktree
 * await git.commit({
 *   cwd: '/tmp/worktrees/agent-1',
 *   message: 'feat: implement feature X',
 *   addAll: true
 * });
 * ```
 */
export class GitService {
  private readonly repoPath: string;

  constructor(repoPath?: string) {
    this.repoPath = repoPath || process.cwd();
  }

  /**
   * Execute a git command and return stdout
   *
   * @param args - Git command arguments
   * @param options - Execution options
   * @returns Command stdout
   * @throws GitError if the command fails
   */
  private async exec(
    args: string[],
    options?: { cwd?: string; allowFailure?: boolean }
  ): Promise<string> {
    const cwd = options?.cwd || this.repoPath;
    const proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;

    if (exitCode !== 0 && !options?.allowFailure) {
      throw new GitError(
        `Git command failed: git ${args.join(" ")}`,
        `git ${args.join(" ")}`,
        exitCode,
        stderr.trim()
      );
    }

    return stdout.trim();
  }

  // ==========================================================================
  // Worktree Operations
  // ==========================================================================

  /**
   * Create a new worktree with a new branch
   *
   * @param options - Worktree creation options
   */
  async createWorktree(options: CreateWorktreeOptions): Promise<void> {
    const args = ["worktree", "add"];

    if (options.force) {
      args.push("-f");
    }

    args.push("-b", options.newBranch, options.path, options.baseBranch);

    await this.exec(args);
  }

  /**
   * Remove a worktree
   *
   * @param options - Worktree removal options
   */
  async removeWorktree(options: RemoveWorktreeOptions): Promise<void> {
    const args = ["worktree", "remove"];

    if (options.force) {
      args.push("--force");
    }

    args.push(options.path);

    await this.exec(args);
  }

  /**
   * List all worktrees
   *
   * @returns Array of worktree information
   */
  async listWorktrees(): Promise<Worktree[]> {
    const output = await this.exec(["worktree", "list", "--porcelain"]);
    return this.parseWorktreeList(output);
  }

  /**
   * Parse porcelain worktree list output
   */
  private parseWorktreeList(output: string): Worktree[] {
    const worktrees: Worktree[] = [];
    const entries = output.split("\n\n").filter(Boolean);

    for (const entry of entries) {
      const lines = entry.split("\n");
      const worktree: Partial<Worktree> = {
        isMain: false,
        isLocked: false,
        isPrunable: false,
      };

      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          worktree.path = line.slice(9);
        } else if (line.startsWith("HEAD ")) {
          worktree.head = line.slice(5);
        } else if (line.startsWith("branch ")) {
          worktree.branch = line.slice(7).replace("refs/heads/", "");
        } else if (line === "bare") {
          worktree.isMain = true;
        } else if (line === "locked") {
          worktree.isLocked = true;
        } else if (line.startsWith("locked ")) {
          worktree.isLocked = true;
          worktree.lockReason = line.slice(7);
        } else if (line === "prunable") {
          worktree.isPrunable = true;
        }
      }

      // Determine if main worktree (first entry without "branch" in detached state)
      if (!worktree.branch && worktrees.length === 0) {
        worktree.isMain = true;
      }

      if (worktree.path && worktree.head) {
        worktrees.push(worktree as Worktree);
      }
    }

    return worktrees;
  }

  /**
   * Prune stale worktree entries
   */
  async pruneWorktrees(): Promise<void> {
    await this.exec(["worktree", "prune"]);
  }

  /**
   * Lock a worktree to prevent accidental removal
   *
   * @param path - Worktree path
   * @param reason - Optional lock reason
   */
  async lockWorktree(path: string, reason?: string): Promise<void> {
    const args = ["worktree", "lock", path];
    if (reason) {
      args.push("--reason", reason);
    }
    await this.exec(args);
  }

  /**
   * Unlock a worktree
   *
   * @param path - Worktree path
   */
  async unlockWorktree(path: string): Promise<void> {
    await this.exec(["worktree", "unlock", path]);
  }

  // ==========================================================================
  // Commit Operations
  // ==========================================================================

  /**
   * Create a commit
   *
   * @param options - Commit options
   * @returns Commit hash
   */
  async commit(options: CommitOptions): Promise<string> {
    const { cwd, message, addAll, allowEmpty } = options;

    // Stage changes if requested
    if (addAll) {
      await this.exec(["add", "-A"], { cwd });
    }

    // Create commit
    const args = ["commit", "-m", message];
    if (allowEmpty) {
      args.push("--allow-empty");
    }

    await this.exec(args, { cwd });

    // Return commit hash
    return this.exec(["rev-parse", "HEAD"], { cwd });
  }

  /**
   * Get the current commit hash
   *
   * @param cwd - Working directory
   * @returns Current HEAD commit hash
   */
  async getCurrentCommit(cwd?: string): Promise<string> {
    return this.exec(["rev-parse", "HEAD"], { cwd });
  }

  /**
   * Get commit information
   *
   * @param ref - Commit reference (hash, branch, etc.)
   * @param cwd - Working directory
   * @returns Commit information
   */
  async getCommit(ref: string, cwd?: string): Promise<Commit> {
    const format = [
      "%H", // hash
      "%h", // short hash
      "%s", // subject
      "%b", // body
      "%an", // author name
      "%ae", // author email
      "%at", // author timestamp
    ].join("%x00");

    const output = await this.exec(["log", "-1", `--format=${format}`, ref], { cwd });
    const [hash, shortHash, message, body, author, authorEmail, timestamp] =
      output.split("\x00");

    return {
      hash: hash ?? "",
      shortHash: shortHash ?? "",
      message: message ?? "",
      body: body?.trim() || undefined,
      author: author ?? "",
      authorEmail: authorEmail ?? "",
      timestamp: new Date(parseInt(timestamp ?? "0", 10) * 1000),
    };
  }

  /**
   * Get recent commits
   *
   * @param count - Number of commits to return
   * @param cwd - Working directory
   * @returns Array of commits
   */
  async getRecentCommits(count: number, cwd?: string): Promise<Commit[]> {
    const format = "%H%x00%h%x00%s%x00%an%x00%ae%x00%at";
    const output = await this.exec(
      ["log", `-${count}`, `--format=${format}`],
      { cwd }
    );

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [hash, shortHash, message, author, authorEmail, timestamp] =
        line.split("\x00");
      return {
        hash: hash ?? "",
        shortHash: shortHash ?? "",
        message: message ?? "",
        author: author ?? "",
        authorEmail: authorEmail ?? "",
        timestamp: new Date(parseInt(timestamp ?? "0", 10) * 1000),
      };
    });
  }

  // ==========================================================================
  // Diff Operations
  // ==========================================================================

  /**
   * Get diff against a base reference
   *
   * @param cwd - Working directory
   * @param base - Base reference (default: HEAD~1)
   * @returns Diff output
   */
  async getDiff(cwd: string, base?: string): Promise<string> {
    return this.exec(["diff", base || "HEAD~1"], { cwd });
  }

  /**
   * Get diff statistics
   *
   * @param cwd - Working directory
   * @param base - Base reference
   * @returns Diff statistics
   */
  async getDiffStats(cwd: string, base?: string): Promise<DiffStats> {
    const output = await this.exec(
      ["diff", "--stat", "--stat-width=1000", base || "HEAD~1"],
      { cwd }
    );

    // Parse the summary line (e.g., "3 files changed, 10 insertions(+), 5 deletions(-)")
    const summaryMatch = output.match(
      /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/
    );

    return {
      filesChanged: parseInt(summaryMatch?.[1] || "0", 10),
      insertions: parseInt(summaryMatch?.[2] || "0", 10),
      deletions: parseInt(summaryMatch?.[3] || "0", 10),
    };
  }

  /**
   * Get staged diff
   *
   * @param cwd - Working directory
   * @returns Staged changes diff
   */
  async getStagedDiff(cwd?: string): Promise<string> {
    return this.exec(["diff", "--cached"], { cwd });
  }

  // ==========================================================================
  // Branch Operations
  // ==========================================================================

  /**
   * Get the current branch name
   *
   * @param cwd - Working directory
   * @returns Current branch name
   */
  async getCurrentBranch(cwd?: string): Promise<string> {
    return this.exec(["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  }

  /**
   * List all branches
   *
   * @param cwd - Working directory
   * @returns Array of branch information
   */
  async listBranches(cwd?: string): Promise<Branch[]> {
    const format = "%(refname:short)%00%(HEAD)%00%(upstream:short)%00%(objectname:short)%00%(subject)";
    const output = await this.exec(
      ["for-each-ref", "--format", format, "refs/heads/"],
      { cwd }
    );

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [name, head, upstream, commit, commitMessage] = line.split("\x00");
      return {
        name: name ?? "",
        isCurrent: head === "*",
        upstream: upstream || undefined,
        commit: commit ?? "",
        commitMessage: commitMessage ?? "",
      };
    });
  }

  /**
   * Check if a branch exists
   *
   * @param branchName - Branch name to check
   * @param cwd - Working directory
   * @returns True if branch exists
   */
  async branchExists(branchName: string, cwd?: string): Promise<boolean> {
    try {
      await this.exec(["rev-parse", "--verify", `refs/heads/${branchName}`], { cwd });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a branch
   *
   * @param branchName - Branch to delete
   * @param force - Force delete even if not merged
   * @param cwd - Working directory
   */
  async deleteBranch(branchName: string, force?: boolean, cwd?: string): Promise<void> {
    const flag = force ? "-D" : "-d";
    await this.exec(["branch", flag, branchName], { cwd });
  }

  // ==========================================================================
  // Status Operations
  // ==========================================================================

  /**
   * Get repository status
   *
   * @param cwd - Working directory
   * @returns Repository status
   */
  async getStatus(cwd?: string): Promise<RepoStatus> {
    const [branchOutput, statusOutput] = await Promise.all([
      this.exec(["status", "--branch", "--porcelain=v2"], { cwd }),
      this.exec(["status", "--porcelain=v2"], { cwd }),
    ]);

    // Parse branch info
    const branchMatch = branchOutput.match(/# branch\.head (.+)/);
    const aheadMatch = branchOutput.match(/# branch\.ab \+(\d+)/);
    const behindMatch = branchOutput.match(/# branch\.ab .+ -(\d+)/);

    // Parse file status
    const files: StatusFile[] = [];
    for (const line of statusOutput.split("\n")) {
      if (line.startsWith("1 ") || line.startsWith("2 ")) {
        // Changed or renamed file
        const parts = line.split(" ");
        const xy = parts[1] ?? "  ";
        const path = parts.slice(-1)[0] ?? "";
        files.push({
          path,
          indexStatus: (xy[0] ?? " ") as StatusFile["indexStatus"],
          worktreeStatus: (xy[1] ?? " ") as StatusFile["worktreeStatus"],
        });
      } else if (line.startsWith("? ")) {
        // Untracked file
        files.push({
          path: line.slice(2),
          indexStatus: "?",
          worktreeStatus: "?",
        });
      }
    }

    return {
      branch: branchMatch?.[1] || "HEAD",
      ahead: parseInt(aheadMatch?.[1] || "0", 10),
      behind: parseInt(behindMatch?.[1] || "0", 10),
      files,
      hasStaged: files.some((f) => f.indexStatus !== " " && f.indexStatus !== "?"),
      hasUnstaged: files.some((f) => f.worktreeStatus !== " " && f.worktreeStatus !== "?"),
      hasUntracked: files.some((f) => f.indexStatus === "?"),
    };
  }

  /**
   * Check if working directory is clean
   *
   * @param cwd - Working directory
   * @returns True if no uncommitted changes
   */
  async isClean(cwd?: string): Promise<boolean> {
    const output = await this.exec(["status", "--porcelain"], { cwd });
    return output === "";
  }

  // ==========================================================================
  // Utility Operations
  // ==========================================================================

  /**
   * Get the repository root path
   *
   * @param cwd - Starting directory
   * @returns Repository root path
   */
  async getRepoRoot(cwd?: string): Promise<string> {
    return this.exec(["rev-parse", "--show-toplevel"], { cwd });
  }

  /**
   * Check if a path is inside a git repository
   *
   * @param path - Path to check
   * @returns True if inside a git repository
   */
  async isGitRepo(path?: string): Promise<boolean> {
    try {
      await this.exec(["rev-parse", "--git-dir"], { cwd: path });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch from remote
   *
   * @param remote - Remote name (default: origin)
   * @param cwd - Working directory
   */
  async fetch(remote?: string, cwd?: string): Promise<void> {
    await this.exec(["fetch", remote || "origin"], { cwd });
  }

  /**
   * Pull from remote
   *
   * @param cwd - Working directory
   */
  async pull(cwd?: string): Promise<void> {
    await this.exec(["pull"], { cwd });
  }

  /**
   * Push to remote
   *
   * @param remote - Remote name
   * @param branch - Branch name
   * @param setUpstream - Set upstream tracking
   * @param cwd - Working directory
   */
  async push(
    remote?: string,
    branch?: string,
    setUpstream?: boolean,
    cwd?: string
  ): Promise<void> {
    const args = ["push"];
    if (setUpstream) {
      args.push("-u");
    }
    if (remote) {
      args.push(remote);
    }
    if (branch) {
      args.push(branch);
    }
    await this.exec(args, { cwd });
  }
}

/**
 * Create a Git service for the current directory
 */
export function createGitService(repoPath?: string): GitService {
  return new GitService(repoPath);
}
