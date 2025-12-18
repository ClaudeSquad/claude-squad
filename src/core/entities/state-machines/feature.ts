/**
 * Feature State Machine
 *
 * Manages valid state transitions for Feature entities.
 *
 * State Diagram:
 * ```
 *                    ┌──────────┐
 *                    │ planning │
 *                    └────┬─────┘
 *                         │ start
 *              ┌──────────┼──────────┐
 *              │          │          │
 *              │          ▼          │
 *              │    ┌───────────┐    │
 *         cancel    │in_progress│◄───┼──────┐
 *              │    └─────┬─────┘    │      │
 *              │          │          │      │
 *              │    ┌─────┼─────┐    │      │ changes requested
 *              │    │     │     │    │      │ / tests failed
 *              │    ▼     ▼     ▼    │      │
 *              │ ┌──────┐ │ ┌───────┐│      │
 *              │ │review│ │ │blocked││      │
 *              │ └──┬───┘ │ └───┬───┘│      │
 *              │    │     │     │    │      │
 *              │    ▼     │     │    │      │
 *              │ ┌───────┐│     │    │      │
 *              │ │testing├┼─────┼────┼──────┘
 *              │ └───┬───┘│     │    │
 *              │     │    │     │    │
 *              ▼     ▼    ▼     ▼    ▼
 *         ┌─────────────────────────────┐
 *         │    completed / cancelled    │ (terminal)
 *         └─────────────────────────────┘
 * ```
 */

import { createStateMachine, createEntityTransition } from "./base";
import type { Feature, FeatureStatus } from "../feature";
import { updateFeature } from "../feature";

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid feature state transitions.
 */
const FEATURE_TRANSITIONS = {
  planning: ["in_progress", "cancelled"] as const,
  in_progress: ["review", "blocked", "cancelled"] as const,
  review: ["in_progress", "testing"] as const,
  testing: ["in_progress", "completed"] as const,
  blocked: ["in_progress", "cancelled"] as const,
  completed: [] as const, // Terminal state
  cancelled: [] as const, // Terminal state
} as const satisfies Record<FeatureStatus, readonly FeatureStatus[]>;

/**
 * Terminal states that cannot transition to other states.
 */
const FEATURE_TERMINAL_STATES = ["completed", "cancelled"] as const;

/**
 * Create the feature state machine.
 */
export const featureStateMachine = createStateMachine<FeatureStatus>(
  FEATURE_TRANSITIONS,
  FEATURE_TERMINAL_STATES
);

// ============================================================================
// Entity Transition Functions
// ============================================================================

/**
 * Update function for feature status changes.
 */
function updateFeatureStatus(feature: Feature, status: FeatureStatus): Feature {
  return updateFeature(feature, { status });
}

/**
 * Feature entity transition functions.
 */
export const featureTransitions = createEntityTransition<Feature, FeatureStatus>(
  featureStateMachine,
  updateFeatureStatus
);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a transition from one feature status to another is valid.
 */
export function canFeatureTransition(from: FeatureStatus, to: FeatureStatus): boolean {
  return featureStateMachine.canTransition(from, to);
}

/**
 * Get valid transitions from a feature status.
 */
export function getValidFeatureTransitions(current: FeatureStatus): readonly FeatureStatus[] {
  return featureStateMachine.getValidTransitions(current);
}

/**
 * Check if a feature status is terminal.
 */
export function isFeatureTerminalState(status: FeatureStatus): boolean {
  return featureStateMachine.isTerminalState(status);
}

/**
 * Transition a feature to a new status.
 * @throws InvalidTransitionError if the transition is invalid
 */
export function transitionFeature(feature: Feature, to: FeatureStatus): Feature {
  return featureTransitions.transition(feature, to);
}

/**
 * Safely transition a feature to a new status.
 */
export function safeTransitionFeature(
  feature: Feature,
  to: FeatureStatus
): { success: true; entity: Feature } | { success: false; error: string; validTransitions: FeatureStatus[] } {
  return featureTransitions.safeTransition(feature, to);
}

// ============================================================================
// Named Transition Functions (for clarity)
// ============================================================================

/**
 * Start development on a feature (planning → in_progress).
 */
export function startDevelopment(feature: Feature): Feature {
  return transitionFeature(feature, "in_progress");
}

/**
 * Submit feature for review (in_progress → review).
 */
export function submitForReview(feature: Feature): Feature {
  return transitionFeature(feature, "review");
}

/**
 * Request changes during review (review → in_progress).
 */
export function requestChanges(feature: Feature): Feature {
  return transitionFeature(feature, "in_progress");
}

/**
 * Move to testing after review (review → testing).
 */
export function moveToTesting(feature: Feature): Feature {
  return transitionFeature(feature, "testing");
}

/**
 * Return from testing due to failures (testing → in_progress).
 */
export function failTests(feature: Feature): Feature {
  return transitionFeature(feature, "in_progress");
}

/**
 * Complete the feature (testing → completed).
 */
export function completeFeature(feature: Feature): Feature {
  return transitionFeature(feature, "completed");
}

/**
 * Block a feature (in_progress → blocked).
 */
export function blockFeature(feature: Feature): Feature {
  return transitionFeature(feature, "blocked");
}

/**
 * Unblock a feature (blocked → in_progress).
 */
export function unblockFeature(feature: Feature): Feature {
  return transitionFeature(feature, "in_progress");
}

/**
 * Cancel a feature (planning/in_progress/blocked → cancelled).
 */
export function cancelFeature(feature: Feature): Feature {
  return transitionFeature(feature, "cancelled");
}
