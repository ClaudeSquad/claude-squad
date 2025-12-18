/**
 * Worktree Entity
 *
 * Represents a Git worktree for agent isolation.
 * Worktrees provide separate filesystem workspaces for each agent,
 * preventing conflicts when multiple agents work on the same codebase.
 */

import { z } from "zod";
import type { WorktreeId, AgentId, FeatureId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema } from "../types/common";

// ============================================================================
// Worktree Status
// ============================================================================

/**
 * Worktree lifecycle states.
 */
export const WorktreeStatusSchema = z.enum(["active", "stale", "removed"]);
export type WorktreeStatus = z.infer<typeof WorktreeStatusSchema>;

/**
 * Status descriptions for UI display.
 */
export const WORKTREE_STATUS_DESCRIPTIONS: Record<WorktreeStatus, string> = {
  active: "Worktree is actively being used",
  stale: "Agent has completed; worktree awaiting cleanup",
  removed: "Worktree has been removed from the filesystem",
};

/**
 * Terminal states.
 */
export const WORKTREE_TERMINAL_STATES: WorktreeStatus[] = ["removed"];

// ============================================================================
// Worktree Entity
// ============================================================================

/**
 * ID validation patterns.
 */
const WorktreeIdPattern = createIdPattern("wkt");
const AgentIdPattern = createIdPattern("agt");
const FeatureIdPattern = createIdPattern("ftr");

/**
 * Worktree entity schema.
 */
export const WorktreeSchema = z.object({
  /** Unique worktree identifier */
  id: z.string().regex(WorktreeIdPattern, "Invalid WorktreeId format"),
  /** Owner agent ID */
  agentId: z.string().regex(AgentIdPattern, "Invalid AgentId format"),
  /** Associated feature ID */
  featureId: z.string().regex(FeatureIdPattern, "Invalid FeatureId format"),
  /** Filesystem path to the worktree */
  path: z.string().min(1, "Path is required"),
  /** Git branch name */
  branchName: z.string().min(1, "Branch name is required"),
  /** Base branch this was created from */
  baseBranch: z.string().default("main"),
  /** Lifecycle state */
  status: WorktreeStatusSchema.default("active"),
  /** Number of commits made in this worktree */
  commitCount: z.number().int().nonnegative().default(0),
  /** Whether there are uncommitted changes */
  hasUncommittedChanges: z.boolean().default(false),
  /** Last commit hash */
  lastCommitHash: z.string().optional(),
  /** Last commit message */
  lastCommitMessage: z.string().optional(),
  /** Size of the worktree in bytes (for cleanup decisions) */
  sizeBytes: z.number().int().nonnegative().optional(),
  /** Creation timestamp */
  createdAt: DateSchema,
  /** Last update timestamp */
  updatedAt: DateSchema.optional(),
});

/**
 * Worktree entity type.
 */
export type Worktree = z.infer<typeof WorktreeSchema>;

/**
 * Typed Worktree with branded IDs.
 */
export interface TypedWorktree extends Omit<Worktree, "id" | "agentId" | "featureId"> {
  id: WorktreeId;
  agentId: AgentId;
  featureId: FeatureId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial worktree schema for updates.
 */
export const PartialWorktreeSchema = WorktreeSchema.partial();
export type PartialWorktree = z.infer<typeof PartialWorktreeSchema>;

/**
 * Schema for creating a new worktree.
 */
export const CreateWorktreeSchema = WorktreeSchema.omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  createdAt: DateSchema.optional(),
});
export type CreateWorktree = z.infer<typeof CreateWorktreeSchema>;

/**
 * Schema for updating an existing worktree.
 */
export const UpdateWorktreeSchema = WorktreeSchema.partial().omit({
  id: true,
  agentId: true,
  featureId: true,
  createdAt: true,
}).extend({
  updatedAt: DateSchema.optional(),
});
export type UpdateWorktree = z.infer<typeof UpdateWorktreeSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate worktree data.
 * @throws ZodError if validation fails
 */
export function validateWorktree(data: unknown): Worktree {
  return WorktreeSchema.parse(data);
}

/**
 * Safely validate worktree data.
 */
export function safeValidateWorktree(data: unknown): {
  success: boolean;
  data?: Worktree;
  error?: z.ZodError;
} {
  const result = WorktreeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new worktree with defaults.
 */
export function createWorktree(
  data: Pick<CreateWorktree, "id" | "agentId" | "featureId" | "path" | "branchName"> &
    Partial<Omit<CreateWorktree, "id" | "agentId" | "featureId" | "path" | "branchName">>
): Worktree {
  const now = new Date();
  return WorktreeSchema.parse({
    ...data,
    baseBranch: data.baseBranch ?? "main",
    status: data.status ?? "active",
    commitCount: data.commitCount ?? 0,
    hasUncommittedChanges: data.hasUncommittedChanges ?? false,
    createdAt: now,
  });
}

/**
 * Update a worktree with new data.
 */
export function updateWorktree(worktree: Worktree, updates: UpdateWorktree): Worktree {
  return WorktreeSchema.parse({
    ...worktree,
    ...updates,
    updatedAt: new Date(),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a worktree status is terminal.
 */
export function isWorktreeTerminal(status: WorktreeStatus): boolean {
  return WORKTREE_TERMINAL_STATES.includes(status);
}

/**
 * Check if a worktree is active.
 */
export function isWorktreeActive(worktree: Worktree): boolean {
  return worktree.status === "active";
}

/**
 * Check if a worktree can be cleaned up.
 */
export function canCleanupWorktree(worktree: Worktree): boolean {
  return worktree.status === "stale" && !worktree.hasUncommittedChanges;
}

/**
 * Generate a worktree path from feature and agent info.
 */
export function generateWorktreePath(
  baseDir: string,
  featureId: string,
  agentId: string
): string {
  // Extract short IDs for path readability
  const featureShort = featureId.split("_")[1]?.slice(0, 6) ?? featureId.slice(0, 6);
  const agentShort = agentId.split("_")[1]?.slice(0, 6) ?? agentId.slice(0, 6);
  return `${baseDir}/.worktrees/${featureShort}-${agentShort}`;
}

/**
 * Generate a branch name for a worktree.
 */
export function generateWorktreeBranch(
  featureBranch: string,
  agentRole: string
): string {
  const sanitizedRole = agentRole.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `${featureBranch}-${sanitizedRole}`;
}

/**
 * Update commit info after a commit.
 */
export function recordCommit(
  worktree: Worktree,
  commitHash: string,
  commitMessage: string
): Worktree {
  return updateWorktree(worktree, {
    commitCount: worktree.commitCount + 1,
    lastCommitHash: commitHash,
    lastCommitMessage: commitMessage,
    hasUncommittedChanges: false,
  });
}

/**
 * Mark worktree as having uncommitted changes.
 */
export function markDirty(worktree: Worktree): Worktree {
  return updateWorktree(worktree, {
    hasUncommittedChanges: true,
  });
}
