/**
 * Git Types
 *
 * Type definitions for Git operations and worktree management.
 */

/**
 * Git worktree information
 */
export interface Worktree {
  /** Absolute path to the worktree directory */
  path: string;
  /** Current HEAD commit hash */
  head: string;
  /** Branch name (if not detached) */
  branch?: string;
  /** Whether this is the main worktree */
  isMain: boolean;
  /** Whether the worktree is locked */
  isLocked: boolean;
  /** Lock reason (if locked) */
  lockReason?: string;
  /** Whether the worktree is prunable (bare) */
  isPrunable: boolean;
}

/**
 * Git commit information
 */
export interface Commit {
  /** Commit hash (full SHA) */
  hash: string;
  /** Short commit hash */
  shortHash: string;
  /** Commit message (first line) */
  message: string;
  /** Full commit message */
  body?: string;
  /** Author name */
  author: string;
  /** Author email */
  authorEmail: string;
  /** Commit timestamp */
  timestamp: Date;
}

/**
 * Git diff statistics
 */
export interface DiffStats {
  /** Number of files changed */
  filesChanged: number;
  /** Number of insertions */
  insertions: number;
  /** Number of deletions */
  deletions: number;
}

/**
 * Git branch information
 */
export interface Branch {
  /** Branch name */
  name: string;
  /** Whether this is the current branch */
  isCurrent: boolean;
  /** Remote tracking branch (if any) */
  upstream?: string;
  /** Last commit hash */
  commit: string;
  /** Last commit message */
  commitMessage: string;
}

/**
 * Git status file entry
 */
export interface StatusFile {
  /** File path relative to repo root */
  path: string;
  /** Status in index (staged) */
  indexStatus: GitFileStatus;
  /** Status in worktree (unstaged) */
  worktreeStatus: GitFileStatus;
}

/**
 * Git file status codes
 */
export type GitFileStatus =
  | " " // Unmodified
  | "M" // Modified
  | "A" // Added
  | "D" // Deleted
  | "R" // Renamed
  | "C" // Copied
  | "U" // Unmerged
  | "?"; // Untracked

/**
 * Git repository status
 */
export interface RepoStatus {
  /** Current branch name */
  branch: string;
  /** Number of commits ahead of upstream */
  ahead: number;
  /** Number of commits behind upstream */
  behind: number;
  /** Files with changes */
  files: StatusFile[];
  /** Whether there are staged changes */
  hasStaged: boolean;
  /** Whether there are unstaged changes */
  hasUnstaged: boolean;
  /** Whether there are untracked files */
  hasUntracked: boolean;
}

/**
 * Options for creating a worktree
 */
export interface CreateWorktreeOptions {
  /** Base branch to create from */
  baseBranch: string;
  /** New branch name */
  newBranch: string;
  /** Path for the worktree */
  path: string;
  /** Force creation even if branch exists */
  force?: boolean;
}

/**
 * Options for removing a worktree
 */
export interface RemoveWorktreeOptions {
  /** Path to the worktree */
  path: string;
  /** Force removal even with uncommitted changes */
  force?: boolean;
}

/**
 * Options for committing changes
 */
export interface CommitOptions {
  /** Working directory path */
  cwd: string;
  /** Commit message */
  message: string;
  /** Add all changes before committing */
  addAll?: boolean;
  /** Allow empty commits */
  allowEmpty?: boolean;
}

/**
 * Git error with details
 */
export class GitError extends Error {
  /** Git command that failed */
  readonly command: string;
  /** Exit code */
  readonly exitCode: number;
  /** stderr output */
  readonly stderr: string;

  constructor(message: string, command: string, exitCode: number, stderr: string) {
    super(message);
    this.name = "GitError";
    this.command = command;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}
