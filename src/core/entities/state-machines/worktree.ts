/**
 * Worktree State Machine
 *
 * Manages valid state transitions for Worktree entities.
 *
 * State Diagram:
 * ```
 *     ┌─────────┐
 *     │  active │
 *     └────┬────┘
 *          │
 *     ┌────┼────┐
 *     │         │
 *     ▼         │ direct removal
 * ┌───────┐     │
 * │ stale │     │
 * └───┬───┘     │
 *     │         │
 *     ▼         ▼
 * ┌─────────────────┐
 * │     removed     │ (terminal)
 * └─────────────────┘
 * ```
 */

import { createStateMachine, createEntityTransition } from "./base";
import type { Worktree, WorktreeStatus } from "../worktree";
import { updateWorktree } from "../worktree";

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid worktree state transitions.
 */
const WORKTREE_TRANSITIONS = {
  active: ["stale", "removed"] as const,
  stale: ["removed"] as const,
  removed: [] as const, // Terminal state
} as const satisfies Record<WorktreeStatus, readonly WorktreeStatus[]>;

/**
 * Terminal states that cannot transition to other states.
 */
const WORKTREE_TERMINAL_STATES = ["removed"] as const;

/**
 * Create the worktree state machine.
 */
export const worktreeStateMachine = createStateMachine<WorktreeStatus>(
  WORKTREE_TRANSITIONS,
  WORKTREE_TERMINAL_STATES
);

// ============================================================================
// Entity Transition Functions
// ============================================================================

/**
 * Update function for worktree status changes.
 */
function updateWorktreeStatus(worktree: Worktree, status: WorktreeStatus): Worktree {
  return updateWorktree(worktree, { status });
}

/**
 * Worktree entity transition functions.
 */
export const worktreeTransitions = createEntityTransition<Worktree, WorktreeStatus>(
  worktreeStateMachine,
  updateWorktreeStatus
);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a transition from one worktree status to another is valid.
 */
export function canWorktreeTransition(from: WorktreeStatus, to: WorktreeStatus): boolean {
  return worktreeStateMachine.canTransition(from, to);
}

/**
 * Get valid transitions from a worktree status.
 */
export function getValidWorktreeTransitions(current: WorktreeStatus): readonly WorktreeStatus[] {
  return worktreeStateMachine.getValidTransitions(current);
}

/**
 * Check if a worktree status is terminal.
 */
export function isWorktreeTerminalState(status: WorktreeStatus): boolean {
  return worktreeStateMachine.isTerminalState(status);
}

/**
 * Transition a worktree to a new status.
 * @throws InvalidTransitionError if the transition is invalid
 */
export function transitionWorktree(worktree: Worktree, to: WorktreeStatus): Worktree {
  return worktreeTransitions.transition(worktree, to);
}

/**
 * Safely transition a worktree to a new status.
 */
export function safeTransitionWorktree(
  worktree: Worktree,
  to: WorktreeStatus
): { success: true; entity: Worktree } | { success: false; error: string; validTransitions: WorktreeStatus[] } {
  return worktreeTransitions.safeTransition(worktree, to);
}

// ============================================================================
// Named Transition Functions (for clarity)
// ============================================================================

/**
 * Mark a worktree as stale (active → stale).
 * Typically called when the agent finishes its work.
 */
export function markWorktreeStale(worktree: Worktree): Worktree {
  return transitionWorktree(worktree, "stale");
}

/**
 * Remove an active worktree directly (active → removed).
 * Used for immediate cleanup.
 */
export function removeActiveWorktree(worktree: Worktree): Worktree {
  return transitionWorktree(worktree, "removed");
}

/**
 * Clean up a stale worktree (stale → removed).
 * Used during garbage collection.
 */
export function cleanupWorktree(worktree: Worktree): Worktree {
  return transitionWorktree(worktree, "removed");
}

/**
 * Remove a worktree regardless of current state (active/stale → removed).
 * Convenience function that handles both cases.
 */
export function removeWorktree(worktree: Worktree): Worktree {
  if (worktree.status === "removed") {
    return worktree; // Already removed
  }
  return transitionWorktree(worktree, "removed");
}
