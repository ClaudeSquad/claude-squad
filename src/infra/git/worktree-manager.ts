/**
 * Worktree Manager
 *
 * High-level service for managing Git worktrees across multiple repositories.
 * Provides pool-based allocation, cleanup, and tracking of worktrees.
 */

import { join, basename } from "node:path";
import { rm, mkdir, access } from "node:fs/promises";
import { GitService } from "./service.js";
import type { Worktree as GitWorktree } from "./types.js";
import { generateId } from "../../utils/id.js";

/**
 * Worktree allocation information
 */
export interface WorktreeAllocation {
  /** Unique allocation ID */
  id: string;
  /** Repository path this worktree belongs to */
  repoPath: string;
  /** Worktree path on disk */
  worktreePath: string;
  /** Branch name for this worktree */
  branch: string;
  /** Agent ID using this worktree (if allocated) */
  agentId?: string;
  /** Feature ID this worktree is for */
  featureId?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActiveAt: Date;
  /** Whether worktree is currently allocated */
  isAllocated: boolean;
  /** Whether worktree has uncommitted changes */
  isDirty?: boolean;
}

/**
 * Options for creating a worktree
 */
export interface CreateWorktreeOptions {
  /** Repository path to create worktree from */
  repoPath: string;
  /** Base branch to start from */
  baseBranch: string;
  /** Feature ID for naming */
  featureId: string;
  /** Agent ID being allocated to */
  agentId: string;
  /** Optional custom branch name */
  branchName?: string;
  /** Optional custom worktree path */
  worktreePath?: string;
}

/**
 * Worktree pool configuration
 */
export interface WorktreePoolConfig {
  /** Base directory for worktrees */
  baseDir: string;
  /** Maximum worktrees per repository */
  maxPerRepo: number;
  /** Age in hours before a stale worktree is cleaned up */
  staleHours: number;
  /** Whether to auto-cleanup stale worktrees on startup */
  autoCleanup: boolean;
}

/**
 * Worktree Manager
 *
 * Manages a pool of Git worktrees across multiple repositories for
 * parallel agent work. Handles allocation, deallocation, and cleanup.
 *
 * @example
 * ```typescript
 * const manager = new WorktreeManager({
 *   baseDir: '/tmp/claude-squad/worktrees',
 *   maxPerRepo: 10,
 *   staleHours: 24,
 *   autoCleanup: true
 * });
 *
 * // Initialize (runs cleanup if configured)
 * await manager.initialize();
 *
 * // Allocate a worktree for an agent
 * const allocation = await manager.allocate({
 *   repoPath: '/path/to/project',
 *   baseBranch: 'main',
 *   featureId: 'ftr_123',
 *   agentId: 'agt_456'
 * });
 *
 * // Later, release the worktree
 * await manager.release(allocation.id);
 * ```
 */
export class WorktreeManager {
  private readonly config: WorktreePoolConfig;
  private readonly allocations: Map<string, WorktreeAllocation> = new Map();
  private readonly gitServices: Map<string, GitService> = new Map();

  constructor(config: Partial<WorktreePoolConfig> = {}) {
    this.config = {
      baseDir: config.baseDir ?? join(process.env.HOME ?? "/tmp", ".claude-squad", "worktrees"),
      maxPerRepo: config.maxPerRepo ?? 10,
      staleHours: config.staleHours ?? 24,
      autoCleanup: config.autoCleanup ?? true,
    };
  }

  /**
   * Initialize the worktree manager
   *
   * Creates the base directory and optionally cleans up stale worktrees.
   */
  async initialize(): Promise<void> {
    // Ensure base directory exists
    await mkdir(this.config.baseDir, { recursive: true });

    // Run cleanup if configured
    if (this.config.autoCleanup) {
      await this.cleanupStaleWorktrees();
    }
  }

  /**
   * Get or create a GitService for a repository
   */
  private getGitService(repoPath: string): GitService {
    let service = this.gitServices.get(repoPath);
    if (!service) {
      service = new GitService(repoPath);
      this.gitServices.set(repoPath, service);
    }
    return service;
  }

  /**
   * Generate a worktree path for a feature/agent
   */
  private generateWorktreePath(repoPath: string, featureId: string, agentId: string): string {
    const repoName = basename(repoPath);
    const timestamp = Date.now().toString(36);
    return join(this.config.baseDir, repoName, `${featureId}-${agentId}-${timestamp}`);
  }

  /**
   * Generate a branch name for a worktree
   */
  private generateBranchName(featureId: string, agentId: string): string {
    return `feature/${featureId}/${agentId}`;
  }

  // ==========================================================================
  // Allocation Operations
  // ==========================================================================

  /**
   * Allocate a new worktree for an agent
   *
   * @param options - Allocation options
   * @returns Worktree allocation
   */
  async allocate(options: CreateWorktreeOptions): Promise<WorktreeAllocation> {
    const { repoPath, baseBranch, featureId, agentId } = options;

    // Check allocation limit
    const repoAllocations = this.getAllocationsForRepo(repoPath);
    if (repoAllocations.length >= this.config.maxPerRepo) {
      throw new Error(
        `Maximum worktrees (${this.config.maxPerRepo}) reached for repository: ${repoPath}`
      );
    }

    const git = this.getGitService(repoPath);

    // Generate paths and names
    const worktreePath = options.worktreePath ??
      this.generateWorktreePath(repoPath, featureId, agentId);
    const branch = options.branchName ??
      this.generateBranchName(featureId, agentId);

    // Create the worktree directory
    await mkdir(worktreePath, { recursive: true });

    // Create the worktree
    await git.createWorktree({
      baseBranch,
      newBranch: branch,
      path: worktreePath,
    });

    // Create allocation record
    const allocation: WorktreeAllocation = {
      id: generateId("wta"), // worktree allocation
      repoPath,
      worktreePath,
      branch,
      agentId,
      featureId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      isAllocated: true,
      isDirty: false,
    };

    this.allocations.set(allocation.id, allocation);

    return allocation;
  }

  /**
   * Release a worktree allocation
   *
   * @param allocationId - Allocation ID
   * @param options - Release options
   */
  async release(
    allocationId: string,
    options?: { keepBranch?: boolean; force?: boolean }
  ): Promise<void> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Worktree allocation not found: ${allocationId}`);
    }

    const git = this.getGitService(allocation.repoPath);

    // Check if dirty and not forcing
    if (!options?.force) {
      const isClean = await git.isClean(allocation.worktreePath);
      if (!isClean) {
        throw new Error(
          `Worktree has uncommitted changes. Use force: true to release anyway.`
        );
      }
    }

    // Remove the worktree
    await git.removeWorktree({
      path: allocation.worktreePath,
      force: options?.force,
    });

    // Optionally delete the branch
    if (!options?.keepBranch) {
      try {
        await git.deleteBranch(allocation.branch, true);
      } catch {
        // Branch might already be deleted or merged
      }
    }

    // Remove allocation record
    this.allocations.delete(allocationId);
  }

  /**
   * Update allocation activity timestamp
   */
  touch(allocationId: string): void {
    const allocation = this.allocations.get(allocationId);
    if (allocation) {
      allocation.lastActiveAt = new Date();
    }
  }

  /**
   * Mark allocation as dirty (has uncommitted changes)
   */
  markDirty(allocationId: string, isDirty: boolean): void {
    const allocation = this.allocations.get(allocationId);
    if (allocation) {
      allocation.isDirty = isDirty;
    }
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get an allocation by ID
   */
  getAllocation(allocationId: string): WorktreeAllocation | undefined {
    return this.allocations.get(allocationId);
  }

  /**
   * Get all allocations
   */
  getAllAllocations(): WorktreeAllocation[] {
    return Array.from(this.allocations.values());
  }

  /**
   * Get allocations for a specific repository
   */
  getAllocationsForRepo(repoPath: string): WorktreeAllocation[] {
    return this.getAllAllocations().filter((a) => a.repoPath === repoPath);
  }

  /**
   * Get allocations for a specific agent
   */
  getAllocationsForAgent(agentId: string): WorktreeAllocation[] {
    return this.getAllAllocations().filter((a) => a.agentId === agentId);
  }

  /**
   * Get allocations for a specific feature
   */
  getAllocationsForFeature(featureId: string): WorktreeAllocation[] {
    return this.getAllAllocations().filter((a) => a.featureId === featureId);
  }

  /**
   * Find allocation by worktree path
   */
  findByPath(worktreePath: string): WorktreeAllocation | undefined {
    return this.getAllAllocations().find((a) => a.worktreePath === worktreePath);
  }

  /**
   * Check if path exists
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Cleanup Operations
  // ==========================================================================

  /**
   * Clean up stale worktrees across all repositories
   *
   * @returns Number of worktrees cleaned up
   */
  async cleanupStaleWorktrees(): Promise<number> {
    let cleanedUp = 0;
    const staleThreshold = Date.now() - this.config.staleHours * 60 * 60 * 1000;

    // Find stale allocations
    const staleAllocations = this.getAllAllocations().filter(
      (a) => a.lastActiveAt.getTime() < staleThreshold && !a.isDirty
    );

    // Release stale allocations
    for (const allocation of staleAllocations) {
      try {
        await this.release(allocation.id, { force: true, keepBranch: false });
        cleanedUp++;
      } catch (error) {
        console.error(
          `Failed to clean up stale worktree ${allocation.worktreePath}:`,
          error
        );
      }
    }

    // Prune worktree entries from git for each known repo
    for (const repoPath of this.gitServices.keys()) {
      try {
        const git = this.getGitService(repoPath);
        await git.pruneWorktrees();
      } catch {
        // Ignore prune errors
      }
    }

    return cleanedUp;
  }

  /**
   * Clean up all worktrees for a specific feature
   *
   * @param featureId - Feature ID to clean up
   * @returns Number of worktrees cleaned up
   */
  async cleanupFeature(featureId: string): Promise<number> {
    const allocations = this.getAllocationsForFeature(featureId);
    let cleanedUp = 0;

    for (const allocation of allocations) {
      try {
        await this.release(allocation.id, { force: true, keepBranch: false });
        cleanedUp++;
      } catch (error) {
        console.error(
          `Failed to clean up worktree for feature ${featureId}:`,
          error
        );
      }
    }

    return cleanedUp;
  }

  /**
   * Clean up all worktrees for a specific agent
   *
   * @param agentId - Agent ID to clean up
   * @returns Number of worktrees cleaned up
   */
  async cleanupAgent(agentId: string): Promise<number> {
    const allocations = this.getAllocationsForAgent(agentId);
    let cleanedUp = 0;

    for (const allocation of allocations) {
      try {
        await this.release(allocation.id, { force: true, keepBranch: true });
        cleanedUp++;
      } catch (error) {
        console.error(`Failed to clean up worktree for agent ${agentId}:`, error);
      }
    }

    return cleanedUp;
  }

  /**
   * Sync allocations with actual worktrees on disk
   *
   * Removes allocations for worktrees that no longer exist,
   * and adds allocations for orphaned worktrees.
   */
  async syncWithDisk(): Promise<{
    removed: number;
    orphaned: string[];
  }> {
    let removed = 0;
    const orphaned: string[] = [];

    // Remove allocations for non-existent worktrees
    for (const allocation of this.getAllAllocations()) {
      const exists = await this.pathExists(allocation.worktreePath);
      if (!exists) {
        this.allocations.delete(allocation.id);
        removed++;
      }
    }

    // Find orphaned worktrees (exist on disk but not tracked)
    for (const repoPath of this.gitServices.keys()) {
      const git = this.getGitService(repoPath);
      const worktrees = await git.listWorktrees();

      for (const worktree of worktrees) {
        if (worktree.isMain) continue;

        const isTracked = this.getAllAllocations().some(
          (a) => a.worktreePath === worktree.path
        );

        if (!isTracked) {
          orphaned.push(worktree.path);
        }
      }
    }

    return { removed, orphaned };
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get statistics about worktree usage
   */
  getStats(): {
    totalAllocations: number;
    activeAllocations: number;
    dirtyAllocations: number;
    byRepo: Record<string, number>;
    byFeature: Record<string, number>;
  } {
    const allocations = this.getAllAllocations();
    const byRepo: Record<string, number> = {};
    const byFeature: Record<string, number> = {};

    for (const allocation of allocations) {
      byRepo[allocation.repoPath] = (byRepo[allocation.repoPath] ?? 0) + 1;
      if (allocation.featureId) {
        byFeature[allocation.featureId] =
          (byFeature[allocation.featureId] ?? 0) + 1;
      }
    }

    return {
      totalAllocations: allocations.length,
      activeAllocations: allocations.filter((a) => a.isAllocated).length,
      dirtyAllocations: allocations.filter((a) => a.isDirty).length,
      byRepo,
      byFeature,
    };
  }
}

/**
 * Create a worktree manager instance
 */
export function createWorktreeManager(
  config?: Partial<WorktreePoolConfig>
): WorktreeManager {
  return new WorktreeManager(config);
}
