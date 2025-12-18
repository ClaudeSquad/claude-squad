/**
 * Git Module
 *
 * Exports Git service, types, worktree manager, and multi-repo manager
 * for repository management.
 */

export * from "./types.js";
export * from "./service.js";
// Re-export worktree-manager, excluding CreateWorktreeOptions which is already exported from types.js
export type {
  WorktreeAllocation,
  WorktreePoolConfig,
} from "./worktree-manager.js";
export {
  WorktreeManager,
  createWorktreeManager,
} from "./worktree-manager.js";
export * from "./multi-repo.js";
