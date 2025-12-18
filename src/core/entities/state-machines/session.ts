/**
 * Session State Machine
 *
 * Manages valid state transitions for Session entities.
 *
 * State Diagram:
 * ```
 *                    ┌─────────┐
 *         ┌─────────►│  active │◄─────────┐
 *         │          └────┬────┘          │
 *         │               │               │
 *    resume│         ┌────┼────┐          │ recover
 *         │         │    │    │          │
 *         │         ▼    ▼    ▼          │
 *     ┌───┴────┐  ┌────┐ │ ┌───────┐  ┌──┴─────┐
 *     │ paused │  │done│ │ │crashed├──►│archived│
 *     └────┬───┘  └─┬──┘ │ └───┬───┘  └────────┘
 *         │        │    │     │           ▲
 *         │        │    │     │           │
 *         │        └────┼─────┴───────────┘
 *         │             │ archive
 *         └─────────────┘
 *
 * done = completed
 * ```
 */

import { createStateMachine, createEntityTransition } from "./base";
import type { Session, SessionStatus } from "../session";
import { updateSession } from "../session";

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid session state transitions.
 */
const SESSION_TRANSITIONS = {
  active: ["paused", "completed", "crashed"] as const,
  paused: ["active", "archived"] as const,
  completed: ["archived"] as const,
  crashed: ["active", "archived"] as const,
  archived: [] as const, // Terminal state
} as const satisfies Record<SessionStatus, readonly SessionStatus[]>;

/**
 * Terminal states that cannot transition to other states.
 */
const SESSION_TERMINAL_STATES = ["archived"] as const;

/**
 * Create the session state machine.
 */
export const sessionStateMachine = createStateMachine<SessionStatus>(
  SESSION_TRANSITIONS,
  SESSION_TERMINAL_STATES
);

// ============================================================================
// Entity Transition Functions
// ============================================================================

/**
 * Update function for session status changes.
 */
function updateSessionStatus(session: Session, status: SessionStatus): Session {
  return updateSession(session, { status });
}

/**
 * Session entity transition functions.
 */
export const sessionTransitions = createEntityTransition<Session, SessionStatus>(
  sessionStateMachine,
  updateSessionStatus
);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a transition from one session status to another is valid.
 */
export function canSessionTransition(from: SessionStatus, to: SessionStatus): boolean {
  return sessionStateMachine.canTransition(from, to);
}

/**
 * Get valid transitions from a session status.
 */
export function getValidSessionTransitions(current: SessionStatus): readonly SessionStatus[] {
  return sessionStateMachine.getValidTransitions(current);
}

/**
 * Check if a session status is terminal.
 */
export function isSessionTerminalState(status: SessionStatus): boolean {
  return sessionStateMachine.isTerminalState(status);
}

/**
 * Transition a session to a new status.
 * @throws InvalidTransitionError if the transition is invalid
 */
export function transitionSession(session: Session, to: SessionStatus): Session {
  return sessionTransitions.transition(session, to);
}

/**
 * Safely transition a session to a new status.
 */
export function safeTransitionSession(
  session: Session,
  to: SessionStatus
): { success: true; entity: Session } | { success: false; error: string; validTransitions: SessionStatus[] } {
  return sessionTransitions.safeTransition(session, to);
}

// ============================================================================
// Named Transition Functions (for clarity)
// ============================================================================

/**
 * Pause an active session (active → paused).
 */
export function pauseSession(session: Session): Session {
  return transitionSession(session, "paused");
}

/**
 * Resume a paused session (paused → active).
 */
export function resumeSession(session: Session): Session {
  return transitionSession(session, "active");
}

/**
 * Complete a session (active → completed).
 */
export function completeSession(session: Session): Session {
  return transitionSession(session, "completed");
}

/**
 * Mark a session as crashed (active → crashed).
 */
export function crashSession(session: Session): Session {
  return transitionSession(session, "crashed");
}

/**
 * Recover a crashed session (crashed → active).
 */
export function recoverSession(session: Session): Session {
  return transitionSession(session, "active");
}

/**
 * Archive a session (paused/completed/crashed → archived).
 */
export function archiveSession(session: Session): Session {
  return transitionSession(session, "archived");
}
