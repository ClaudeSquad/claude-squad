/**
 * Multi-Repository Manager
 *
 * Manages Git worktrees across multiple repositories for monorepo or
 * multi-service development scenarios. Enables coordinated branch creation,
 * commits, and PR preparation across related repositories.
 *
 * @module infra/git/multi-repo
 */

import { access } from "node:fs/promises";
import { GitService } from "./service.js";
import { WorktreeManager } from "./worktree-manager.js";
import type { Worktree as GitWorktree } from "./types.js";
import { generateId } from "../../utils/id.js";
import type { Feature } from "../../core/entities/feature.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for a single repository in a multi-repo setup
 */
export interface RepoConfig {
  /** Unique name identifier for this repository */
  name: string;
  /** Git remote URL for cloning */
  url: string;
  /** Local path where the repository is located */
  path: string;
  /** Default branch to use as base (e.g., 'main', 'master') */
  branch: string;
}

/**
 * Multi-repository workspace configuration
 */
export interface MultiRepoConfig {
  /** Primary repository path (the main project) */
  primary: string;
  /** Additional repositories that work together with the primary */
  dependencies: RepoConfig[];
}

/**
 * Represents a worktree setup across multiple repositories
 */
export interface MultiRepoWorktree {
  /** The feature branch name used across all repositories */
  featureBranch: string;
  /** Map of repository name to worktree details */
  worktrees: Map<string, GitWorktree>;
  /** Map of repository name to allocation ID for cleanup */
  allocationIds: Map<string, string>;
  /** Timestamp when this multi-repo worktree was created */
  createdAt: Date;
}

/**
 * Pull request information (stub for Phase 9 integration)
 */
export interface PR {
  /** Repository name this PR belongs to */
  repoName: string;
  /** PR number */
  number: number;
  /** PR URL */
  url: string;
  /** PR title */
  title: string;
  /** PR state */
  state: "open" | "closed" | "merged";
  /** Source branch */
  head: string;
  /** Target branch */
  base: string;
}

/**
 * Result of a multi-repo commit operation
 */
export interface MultiRepoCommitResult {
  /** Map of repository name to commit hash */
  commits: Map<string, string>;
  /** Repositories that had no changes to commit */
  skipped: string[];
  /** Repositories that failed to commit */
  failed: Map<string, Error>;
}

/**
 * Statistics for multi-repo workspace
 */
export interface MultiRepoStats {
  /** Total number of configured repositories */
  totalRepos: number;
  /** Number of active worktrees */
  activeWorktrees: number;
  /** Worktrees by repository */
  byRepo: Record<string, number>;
  /** Total disk usage estimate */
  estimatedDiskUsage?: number;
}

// ============================================================================
// MultiRepoManager Class
// ============================================================================

/**
 * Multi-Repository Manager
 *
 * Coordinates Git operations across multiple repositories for features
 * that span multiple codebases. Useful for:
 * - Monorepo setups with multiple packages
 * - Microservice architectures
 * - Frontend + Backend in separate repos
 * - Library + Consumer app development
 *
 * @example
 * ```typescript
 * const manager = new MultiRepoManager();
 *
 * // Initialize with multi-repo configuration
 * await manager.initializeWorkspace({
 *   primary: '/path/to/frontend',
 *   dependencies: [
 *     { name: 'api', url: 'git@github.com:org/api.git', path: '/path/to/api', branch: 'main' },
 *     { name: 'shared', url: 'git@github.com:org/shared.git', path: '/path/to/shared', branch: 'main' },
 *   ]
 * });
 *
 * // Create worktrees for a feature across all repos
 * const worktrees = await manager.createMultiRepoWorktree('feature/new-auth');
 *
 * // Commit changes in all repos
 * const commits = await manager.commitAll('feat: implement new auth flow');
 *
 * // Clean up when done
 * await manager.cleanupMultiRepoWorktree(worktrees);
 * ```
 */
export class MultiRepoManager {
  private config: MultiRepoConfig | null = null;
  private gitServices: Map<string, GitService> = new Map();
  private worktreeManager: WorktreeManager;
  private multiRepoWorktrees: Map<string, MultiRepoWorktree> = new Map();
  private isInitialized = false;

  /**
   * Create a new MultiRepoManager
   *
   * @param worktreeManager - Optional WorktreeManager instance for managing individual worktrees
   */
  constructor(worktreeManager?: WorktreeManager) {
    this.worktreeManager = worktreeManager ?? new WorktreeManager();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the multi-repository workspace
   *
   * Sets up Git services for all configured repositories and validates
   * that each repository exists and is accessible.
   *
   * @param config - Multi-repository configuration
   * @throws Error if any repository is not accessible or not a valid Git repo
   */
  async initializeWorkspace(config: MultiRepoConfig): Promise<void> {
    // Validate primary repository
    await this.validateRepository(config.primary, "primary");

    // Validate and setup all dependency repositories
    for (const repo of config.dependencies) {
      await this.validateRepository(repo.path, repo.name);
    }

    // Store configuration
    this.config = config;

    // Initialize Git services
    this.gitServices.set("primary", new GitService(config.primary));
    for (const repo of config.dependencies) {
      this.gitServices.set(repo.name, new GitService(repo.path));
    }

    // Initialize worktree manager
    await this.worktreeManager.initialize();

    this.isInitialized = true;
  }

  /**
   * Validate that a path is a valid Git repository
   *
   * @param path - Path to validate
   * @param name - Name for error messages
   */
  private async validateRepository(path: string, name: string): Promise<void> {
    // Check if path exists
    try {
      await access(path);
    } catch {
      throw new Error(`Repository '${name}' path does not exist: ${path}`);
    }

    // Check if it's a valid Git repository
    const git = new GitService(path);
    const isRepo = await git.isGitRepo();
    if (!isRepo) {
      throw new Error(`Path '${path}' for repository '${name}' is not a Git repository`);
    }
  }

  /**
   * Ensure the manager is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error("MultiRepoManager is not initialized. Call initializeWorkspace() first.");
    }
  }

  // ==========================================================================
  // Worktree Operations
  // ==========================================================================

  /**
   * Create worktrees across multiple repositories for a feature
   *
   * Creates a new branch and worktree in each specified repository
   * (or all repositories if none specified) for parallel development.
   *
   * @param featureBranch - The feature branch name to create
   * @param repos - Optional subset of repository names to create worktrees for
   * @returns MultiRepoWorktree with details about all created worktrees
   */
  async createMultiRepoWorktree(
    featureBranch: string,
    repos?: string[]
  ): Promise<MultiRepoWorktree> {
    this.ensureInitialized();

    const config = this.config!;
    const worktrees = new Map<string, GitWorktree>();
    const allocationIds = new Map<string, string>();

    // Determine which repos to create worktrees for
    const targetRepos = repos ?? ["primary", ...config.dependencies.map((d) => d.name)];

    // Create worktrees for each repository
    for (const repoName of targetRepos) {
      const repoPath = this.getRepoPath(repoName);
      const baseBranch = this.getBaseBranch(repoName);
      const git = this.gitServices.get(repoName);

      if (!repoPath || !git) {
        throw new Error(`Unknown repository: ${repoName}`);
      }

      try {
        // Allocate worktree through the worktree manager
        const allocation = await this.worktreeManager.allocate({
          repoPath,
          baseBranch,
          featureId: featureBranch.replace(/\//g, "-"),
          agentId: `multi-repo-${generateId(6)}`,
          branchName: featureBranch,
        });

        // Get worktree details
        const worktreeList = await git.listWorktrees();
        const worktree = worktreeList.find((w) => w.path === allocation.worktreePath);

        if (worktree) {
          worktrees.set(repoName, worktree);
          allocationIds.set(repoName, allocation.id);
        } else {
          // Worktree was created but not found in list - create a synthetic entry
          worktrees.set(repoName, {
            path: allocation.worktreePath,
            head: "", // Will be populated on next list
            branch: featureBranch,
            isMain: false,
            isLocked: false,
            isPrunable: false,
          });
          allocationIds.set(repoName, allocation.id);
        }
      } catch (error) {
        // If creation fails for any repo, clean up already created worktrees
        for (const [, allocId] of allocationIds) {
          try {
            await this.worktreeManager.release(allocId, { force: true });
          } catch {
            // Ignore cleanup errors during rollback
          }
        }
        throw new Error(
          `Failed to create worktree for repository '${repoName}': ${(error as Error).message}`
        );
      }
    }

    // Create and store the multi-repo worktree record
    const multiRepoWorktree: MultiRepoWorktree = {
      featureBranch,
      worktrees,
      allocationIds,
      createdAt: new Date(),
    };

    this.multiRepoWorktrees.set(featureBranch, multiRepoWorktree);

    return multiRepoWorktree;
  }

  /**
   * Get repository path by name
   */
  private getRepoPath(repoName: string): string | undefined {
    if (!this.config) return undefined;

    if (repoName === "primary") {
      return this.config.primary;
    }

    const repo = this.config.dependencies.find((d) => d.name === repoName);
    return repo?.path;
  }

  /**
   * Get base branch for a repository
   */
  private getBaseBranch(repoName: string): string {
    if (!this.config) return "main";

    if (repoName === "primary") {
      return "main"; // Primary repo defaults to main
    }

    const repo = this.config.dependencies.find((d) => d.name === repoName);
    return repo?.branch ?? "main";
  }

  /**
   * Clean up a multi-repo worktree setup
   *
   * @param worktree - The multi-repo worktree to clean up
   * @param options - Cleanup options
   */
  async cleanupMultiRepoWorktree(
    worktree: MultiRepoWorktree,
    options?: { keepBranches?: boolean; force?: boolean }
  ): Promise<void> {
    const errors: Map<string, Error> = new Map();

    for (const [repoName, allocationId] of worktree.allocationIds) {
      try {
        await this.worktreeManager.release(allocationId, {
          keepBranch: options?.keepBranches,
          force: options?.force,
        });
      } catch (error) {
        errors.set(repoName, error as Error);
      }
    }

    // Remove from tracking
    this.multiRepoWorktrees.delete(worktree.featureBranch);

    // Report any errors
    if (errors.size > 0) {
      const errorMessages = Array.from(errors.entries())
        .map(([repo, err]) => `${repo}: ${err.message}`)
        .join("; ");
      throw new Error(`Failed to cleanup some worktrees: ${errorMessages}`);
    }
  }

  /**
   * Get an existing multi-repo worktree by feature branch
   */
  getMultiRepoWorktree(featureBranch: string): MultiRepoWorktree | undefined {
    return this.multiRepoWorktrees.get(featureBranch);
  }

  /**
   * List all active multi-repo worktrees
   */
  listMultiRepoWorktrees(): MultiRepoWorktree[] {
    return Array.from(this.multiRepoWorktrees.values());
  }

  // ==========================================================================
  // Commit Operations
  // ==========================================================================

  /**
   * Commit changes across all repositories with the same message
   *
   * Commits staged and unstaged changes in all repositories that have
   * active worktrees for the current feature.
   *
   * @param message - Commit message to use
   * @param featureBranch - Optional feature branch to commit in (commits in all if not specified)
   * @returns Map of repository name to commit hash
   */
  async commitAll(
    message: string,
    featureBranch?: string
  ): Promise<Map<string, string>> {
    this.ensureInitialized();

    const commits = new Map<string, string>();
    const targetWorktrees = featureBranch
      ? [this.multiRepoWorktrees.get(featureBranch)].filter(Boolean)
      : Array.from(this.multiRepoWorktrees.values());

    for (const multiWorktree of targetWorktrees) {
      if (!multiWorktree) continue;

      for (const [repoName, worktree] of multiWorktree.worktrees) {
        const git = this.gitServices.get(repoName);
        if (!git) continue;

        try {
          // Check if there are changes to commit
          const isClean = await git.isClean(worktree.path);
          if (isClean) {
            continue; // Skip repos with no changes
          }

          // Commit changes
          const commitHash = await git.commit({
            cwd: worktree.path,
            message,
            addAll: true,
          });

          commits.set(repoName, commitHash);
        } catch (error) {
          // Log but don't fail - some repos may not have changes
          console.warn(
            `Failed to commit in repository '${repoName}': ${(error as Error).message}`
          );
        }
      }
    }

    return commits;
  }

  /**
   * Commit changes in a specific repository
   *
   * @param repoName - Name of the repository
   * @param message - Commit message
   * @param featureBranch - Feature branch to commit in
   * @returns Commit hash
   */
  async commitInRepo(
    repoName: string,
    message: string,
    featureBranch: string
  ): Promise<string> {
    this.ensureInitialized();

    const multiWorktree = this.multiRepoWorktrees.get(featureBranch);
    if (!multiWorktree) {
      throw new Error(`No multi-repo worktree found for branch: ${featureBranch}`);
    }

    const worktree = multiWorktree.worktrees.get(repoName);
    if (!worktree) {
      throw new Error(`Repository '${repoName}' not found in multi-repo worktree`);
    }

    const git = this.gitServices.get(repoName);
    if (!git) {
      throw new Error(`Git service not found for repository: ${repoName}`);
    }

    return git.commit({
      cwd: worktree.path,
      message,
      addAll: true,
    });
  }

  // ==========================================================================
  // PR Operations (Stub for Phase 9)
  // ==========================================================================

  /**
   * Create pull requests for all repositories
   *
   * NOTE: This is a stub implementation for Phase 9.
   * Full implementation will integrate with GitHub/GitLab APIs.
   *
   * @param feature - Feature entity with details for PR creation
   * @returns Array of created PRs
   */
  async createMultiRepoPRs(feature: Feature): Promise<PR[]> {
    this.ensureInitialized();

    // Stub implementation - returns empty array
    // Full implementation in Phase 9 will:
    // 1. Push branches to remotes
    // 2. Create PRs via GitHub/GitLab API
    // 3. Link PRs together in descriptions
    // 4. Apply labels and assign reviewers

    console.warn("createMultiRepoPRs is a stub - full implementation in Phase 9");

    const prs: PR[] = [];
    const multiWorktree = this.multiRepoWorktrees.get(feature.branchName);

    if (!multiWorktree) {
      return prs;
    }

    // Create stub PR entries for each repository
    for (const [repoName] of multiWorktree.worktrees) {
      const baseBranch = this.getBaseBranch(repoName);

      prs.push({
        repoName,
        number: 0, // Will be populated by actual PR creation
        url: "", // Will be populated by actual PR creation
        title: `[${feature.name}] ${feature.description || "Feature implementation"}`,
        state: "open",
        head: feature.branchName,
        base: baseBranch,
      });
    }

    return prs;
  }

  // ==========================================================================
  // Status & Query Operations
  // ==========================================================================

  /**
   * Get status of all repositories in a multi-repo worktree
   *
   * @param featureBranch - Feature branch to check status for
   * @returns Map of repository name to repo status
   */
  async getMultiRepoStatus(featureBranch: string): Promise<Map<string, {
    clean: boolean;
    ahead: number;
    behind: number;
    hasChanges: boolean;
  }>> {
    this.ensureInitialized();

    const statuses = new Map<string, {
      clean: boolean;
      ahead: number;
      behind: number;
      hasChanges: boolean;
    }>();

    const multiWorktree = this.multiRepoWorktrees.get(featureBranch);
    if (!multiWorktree) {
      return statuses;
    }

    for (const [repoName, worktree] of multiWorktree.worktrees) {
      const git = this.gitServices.get(repoName);
      if (!git) continue;

      try {
        const status = await git.getStatus(worktree.path);
        statuses.set(repoName, {
          clean: !status.hasStaged && !status.hasUnstaged && !status.hasUntracked,
          ahead: status.ahead,
          behind: status.behind,
          hasChanges: status.files.length > 0,
        });
      } catch {
        // Default to unknown status on error
        statuses.set(repoName, {
          clean: true,
          ahead: 0,
          behind: 0,
          hasChanges: false,
        });
      }
    }

    return statuses;
  }

  /**
   * Get statistics about the multi-repo workspace
   */
  getStats(): MultiRepoStats {
    const byRepo: Record<string, number> = {};

    for (const multiWorktree of this.multiRepoWorktrees.values()) {
      for (const [repoName] of multiWorktree.worktrees) {
        byRepo[repoName] = (byRepo[repoName] ?? 0) + 1;
      }
    }

    return {
      totalRepos: this.config
        ? 1 + this.config.dependencies.length
        : 0,
      activeWorktrees: this.multiRepoWorktrees.size,
      byRepo,
    };
  }

  /**
   * Get configured repositories
   */
  getConfiguredRepos(): string[] {
    if (!this.config) return [];
    return ["primary", ...this.config.dependencies.map((d) => d.name)];
  }

  /**
   * Get the worktree path for a specific repository in a feature branch
   *
   * @param repoName - Name of the repository
   * @param featureBranch - Feature branch
   * @returns Worktree path or undefined if not found
   */
  getWorktreePath(repoName: string, featureBranch: string): string | undefined {
    const multiWorktree = this.multiRepoWorktrees.get(featureBranch);
    return multiWorktree?.worktrees.get(repoName)?.path;
  }

  // ==========================================================================
  // Cleanup Operations
  // ==========================================================================

  /**
   * Clean up all multi-repo worktrees
   *
   * @param options - Cleanup options
   * @returns Number of worktrees cleaned up
   */
  async cleanupAll(options?: { keepBranches?: boolean; force?: boolean }): Promise<number> {
    let cleanedUp = 0;

    for (const multiWorktree of this.multiRepoWorktrees.values()) {
      try {
        await this.cleanupMultiRepoWorktree(multiWorktree, options);
        cleanedUp++;
      } catch {
        // Continue cleaning up other worktrees even if one fails
      }
    }

    return cleanedUp;
  }

  /**
   * Cleanup stale multi-repo worktrees older than specified hours
   *
   * @param staleHours - Age threshold in hours
   * @returns Number of worktrees cleaned up
   */
  async cleanupStale(staleHours: number = 24): Promise<number> {
    const threshold = Date.now() - staleHours * 60 * 60 * 1000;
    let cleanedUp = 0;

    for (const multiWorktree of this.multiRepoWorktrees.values()) {
      if (multiWorktree.createdAt.getTime() < threshold) {
        try {
          await this.cleanupMultiRepoWorktree(multiWorktree, { force: true });
          cleanedUp++;
        } catch {
          // Continue cleaning up other worktrees
        }
      }
    }

    return cleanedUp;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new MultiRepoManager instance
 *
 * @param worktreeManager - Optional WorktreeManager to use
 * @returns New MultiRepoManager instance
 */
export function createMultiRepoManager(
  worktreeManager?: WorktreeManager
): MultiRepoManager {
  return new MultiRepoManager(worktreeManager);
}
