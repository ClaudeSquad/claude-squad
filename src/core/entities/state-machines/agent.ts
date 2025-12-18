/**
 * Agent State Machine
 *
 * Manages valid state transitions for Agent entities.
 *
 * State Diagram:
 * ```
 *                    ┌─────────┐
 *                    │  idle   │
 *                    └────┬────┘
 *                         │ start
 *                         ▼
 *                    ┌─────────┐
 *         ┌─────────►│ working │◄─────────┐
 *         │          └────┬────┘          │
 *         │               │               │
 *    resume│    ┌─────────┼─────────┐     │ respond/retry
 *         │    │         │         │     │
 *         │    ▼         ▼         ▼     │
 *     ┌───┴────┐   ┌─────────┐   ┌─┴─────┴─┐
 *     │ paused │   │ waiting │   │  error  │
 *     └────────┘   └─────────┘   └─────────┘
 *                        │
 *                        │ complete
 *                        ▼
 *                  ┌───────────┐
 *                  │ completed │ (terminal)
 *                  └───────────┘
 * ```
 */

import { createStateMachine, createEntityTransition } from "./base";
import type { Agent, AgentStatus } from "../agent";
import { updateAgent } from "../agent";

// ============================================================================
// State Machine Definition
// ============================================================================

/**
 * Valid agent state transitions.
 */
const AGENT_TRANSITIONS = {
  idle: ["working"] as const,
  working: ["waiting", "paused", "error", "completed"] as const,
  waiting: ["working", "error"] as const,
  paused: ["working", "error"] as const,
  error: ["working"] as const,
  completed: [] as const, // Terminal state
} as const satisfies Record<AgentStatus, readonly AgentStatus[]>;

/**
 * Terminal states that cannot transition to other states.
 */
const AGENT_TERMINAL_STATES = ["completed"] as const;

/**
 * Create the agent state machine.
 */
export const agentStateMachine = createStateMachine<AgentStatus>(
  AGENT_TRANSITIONS,
  AGENT_TERMINAL_STATES
);

// ============================================================================
// Entity Transition Functions
// ============================================================================

/**
 * Update function for agent status changes.
 */
function updateAgentStatus(agent: Agent, status: AgentStatus): Agent {
  return updateAgent(agent, { status });
}

/**
 * Agent entity transition functions.
 */
export const agentTransitions = createEntityTransition<Agent, AgentStatus>(
  agentStateMachine,
  updateAgentStatus
);

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a transition from one agent status to another is valid.
 */
export function canAgentTransition(from: AgentStatus, to: AgentStatus): boolean {
  return agentStateMachine.canTransition(from, to);
}

/**
 * Get valid transitions from an agent status.
 */
export function getValidAgentTransitions(current: AgentStatus): readonly AgentStatus[] {
  return agentStateMachine.getValidTransitions(current);
}

/**
 * Check if an agent status is terminal.
 */
export function isAgentTerminal(status: AgentStatus): boolean {
  return agentStateMachine.isTerminalState(status);
}

/**
 * Transition an agent to a new status.
 * @throws InvalidTransitionError if the transition is invalid
 */
export function transitionAgent(agent: Agent, to: AgentStatus): Agent {
  return agentTransitions.transition(agent, to);
}

/**
 * Safely transition an agent to a new status.
 */
export function safeTransitionAgent(
  agent: Agent,
  to: AgentStatus
): { success: true; entity: Agent } | { success: false; error: string; validTransitions: AgentStatus[] } {
  return agentTransitions.safeTransition(agent, to);
}

// ============================================================================
// Named Transition Functions (for clarity)
// ============================================================================

/**
 * Start an idle agent (idle → working).
 */
export function startAgent(agent: Agent): Agent {
  return transitionAgent(agent, "working");
}

/**
 * Pause a working agent (working → paused).
 */
export function pauseAgent(agent: Agent): Agent {
  return transitionAgent(agent, "paused");
}

/**
 * Resume a paused agent (paused → working).
 */
export function resumeAgent(agent: Agent): Agent {
  return transitionAgent(agent, "working");
}

/**
 * Mark agent as waiting for input (working → waiting).
 */
export function waitForInput(agent: Agent): Agent {
  return transitionAgent(agent, "waiting");
}

/**
 * Resume after input received (waiting → working).
 */
export function inputReceived(agent: Agent): Agent {
  return transitionAgent(agent, "working");
}

/**
 * Mark agent as completed (working → completed).
 */
export function completeAgent(agent: Agent): Agent {
  return transitionAgent(agent, "completed");
}

/**
 * Mark agent as errored (working/waiting/paused → error).
 */
export function errorAgent(agent: Agent): Agent {
  return transitionAgent(agent, "error");
}

/**
 * Retry a failed agent (error → working).
 */
export function retryAgent(agent: Agent): Agent {
  return transitionAgent(agent, "working");
}
