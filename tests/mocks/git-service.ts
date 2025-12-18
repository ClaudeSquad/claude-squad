/**
 * Git Service Mock
 *
 * Mock implementation of Git operations for testing.
 * Simulates worktree operations, branch management, and commits.
 */

/**
 * Mock worktree data
 */
export interface MockWorktree {
  path: string;
  branch: string;
  base: string;
  createdAt: Date;
}

/**
 * Mock branch data
 */
export interface MockBranch {
  name: string;
  commit: string;
  isHead: boolean;
}

/**
 * Mock commit data
 */
export interface MockCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  branch: string;
}

/**
 * Git operation record
 */
export interface GitOperation {
  type: "worktree-add" | "worktree-remove" | "branch-create" | "checkout" | "commit" | "push" | "pull" | "merge";
  args: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Git Service Mock
 */
export const mockGitService = {
  /** Mock worktrees */
  worktrees: new Map<string, MockWorktree>(),

  /** Mock branches */
  branches: new Map<string, MockBranch>(),

  /** Mock commits */
  commits: [] as MockCommit[],

  /** Operation history */
  operations: [] as GitOperation[],

  /** Current branch */
  currentBranch: "main",

  /** Repository root path */
  repoRoot: "/mock/repo",

  /**
   * Reset mock state
   */
  reset(): void {
    this.worktrees.clear();
    this.branches.clear();
    this.commits = [];
    this.operations = [];
    this.currentBranch = "main";

    // Add default main branch
    this.branches.set("main", {
      name: "main",
      commit: "abc123",
      isHead: true,
    });
  },

  /**
   * Record an operation
   */
  recordOperation(type: GitOperation["type"], args: Record<string, unknown>): void {
    this.operations.push({
      type,
      args,
      timestamp: new Date(),
    });
  },

  /**
   * Create a mock worktree
   */
  async createWorktree(base: string, branch: string, path: string): Promise<MockWorktree> {
    this.recordOperation("worktree-add", { base, branch, path });

    const worktree: MockWorktree = {
      path,
      branch,
      base,
      createdAt: new Date(),
    };

    this.worktrees.set(path, worktree);

    // Also create the branch
    if (!this.branches.has(branch)) {
      this.branches.set(branch, {
        name: branch,
        commit: `${branch}-initial`,
        isHead: false,
      });
    }

    return worktree;
  },

  /**
   * Remove a mock worktree
   */
  async removeWorktree(path: string): Promise<void> {
    this.recordOperation("worktree-remove", { path });
    this.worktrees.delete(path);
  },

  /**
   * Get a worktree by path
   */
  getWorktree(path: string): MockWorktree | undefined {
    return this.worktrees.get(path);
  },

  /**
   * List all worktrees
   */
  listWorktrees(): MockWorktree[] {
    return Array.from(this.worktrees.values());
  },

  /**
   * Create a mock branch
   */
  async createBranch(name: string, from?: string): Promise<MockBranch> {
    this.recordOperation("branch-create", { name, from });

    const baseBranch = from ? this.branches.get(from) : this.branches.get(this.currentBranch);
    const branch: MockBranch = {
      name,
      commit: baseBranch?.commit ?? "new-commit",
      isHead: false,
    };

    this.branches.set(name, branch);
    return branch;
  },

  /**
   * Checkout a branch
   */
  async checkout(branch: string): Promise<void> {
    this.recordOperation("checkout", { branch });

    // Update isHead flags
    for (const [name, b] of this.branches) {
      b.isHead = name === branch;
    }

    this.currentBranch = branch;
  },

  /**
   * Create a mock commit
   */
  async commit(message: string, author = "Test User"): Promise<MockCommit> {
    const hash = `commit-${Date.now().toString(36)}`;

    this.recordOperation("commit", { message, hash });

    const commit: MockCommit = {
      hash,
      message,
      author,
      date: new Date(),
      branch: this.currentBranch,
    };

    this.commits.push(commit);

    // Update branch commit
    const branch = this.branches.get(this.currentBranch);
    if (branch) {
      branch.commit = hash;
    }

    return commit;
  },

  /**
   * Get operations of a specific type
   */
  getOperationsByType(type: GitOperation["type"]): GitOperation[] {
    return this.operations.filter((op) => op.type === type);
  },

  /**
   * Check if an operation was performed
   */
  wasOperationPerformed(type: GitOperation["type"], args?: Partial<Record<string, unknown>>): boolean {
    return this.operations.some((op) => {
      if (op.type !== type) return false;
      if (!args) return true;
      return Object.entries(args).every(([key, value]) => op.args[key] === value);
    });
  },

  /**
   * Get the current HEAD commit
   */
  getHead(): string {
    const branch = this.branches.get(this.currentBranch);
    return branch?.commit ?? "unknown";
  },

  /**
   * Simulate a merge
   */
  async merge(source: string, target?: string): Promise<void> {
    const targetBranch = target ?? this.currentBranch;
    this.recordOperation("merge", { source, target: targetBranch });

    // Create a merge commit
    await this.commit(`Merge ${source} into ${targetBranch}`);
  },
};

export type MockGitService = typeof mockGitService;
