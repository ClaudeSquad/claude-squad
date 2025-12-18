/**
 * Base State Machine Utilities
 *
 * Provides generic state machine functionality that can be used
 * across different entity state machines.
 */

/**
 * Transition map type: maps from-state to allowed to-states.
 */
export type TransitionMap<S extends string> = Record<S, readonly S[]>;

/**
 * Create a state machine with the given transitions.
 */
export function createStateMachine<S extends string>(
  transitions: TransitionMap<S>,
  terminalStates: readonly S[]
) {
  /**
   * Check if a transition from one state to another is valid.
   */
  function canTransition(from: S, to: S): boolean {
    const allowed = transitions[from];
    return allowed?.includes(to) ?? false;
  }

  /**
   * Get all valid transitions from the current state.
   */
  function getValidTransitions(current: S): readonly S[] {
    return transitions[current] ?? [];
  }

  /**
   * Check if a state is terminal (cannot transition to other states).
   */
  function isTerminalState(state: S): boolean {
    return terminalStates.includes(state);
  }

  /**
   * Attempt a transition, throwing if invalid.
   */
  function assertTransition(from: S, to: S): void {
    if (!canTransition(from, to)) {
      throw new InvalidTransitionError(from, to, getValidTransitions(from) as S[]);
    }
  }

  /**
   * Perform a safe transition that returns a result object.
   */
  function safeTransition(from: S, to: S): TransitionResult<S> {
    if (canTransition(from, to)) {
      return { success: true, state: to };
    }
    return {
      success: false,
      error: `Cannot transition from '${from}' to '${to}'`,
      validTransitions: getValidTransitions(from) as S[],
    };
  }

  return {
    canTransition,
    getValidTransitions,
    isTerminalState,
    assertTransition,
    safeTransition,
  };
}

/**
 * Result of a transition attempt.
 */
export type TransitionResult<S extends string> =
  | { success: true; state: S }
  | { success: false; error: string; validTransitions: S[] };

/**
 * Error thrown when an invalid state transition is attempted.
 */
export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly validTransitions: string[]
  ) {
    const validList =
      validTransitions.length > 0
        ? `Valid transitions: ${validTransitions.join(", ")}`
        : "No valid transitions available";
    super(`Invalid transition from '${from}' to '${to}'. ${validList}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Type for an entity with a status field.
 */
export interface Stateful<S extends string> {
  status: S;
}

/**
 * Create a transition function for an entity type.
 */
export function createEntityTransition<E extends Stateful<S>, S extends string>(
  machine: ReturnType<typeof createStateMachine<S>>,
  updateFn: (entity: E, status: S) => E
) {
  /**
   * Transition an entity to a new state.
   * @throws InvalidTransitionError if the transition is invalid
   */
  function transition(entity: E, to: S): E {
    machine.assertTransition(entity.status, to);
    return updateFn(entity, to);
  }

  /**
   * Safely transition an entity, returning a result object.
   */
  function safeTransition(
    entity: E,
    to: S
  ): { success: true; entity: E } | { success: false; error: string; validTransitions: S[] } {
    const result = machine.safeTransition(entity.status, to);
    if (result.success) {
      return { success: true, entity: updateFn(entity, to) };
    }
    return result;
  }

  /**
   * Get valid next states for an entity.
   */
  function getNextStates(entity: E): readonly S[] {
    return machine.getValidTransitions(entity.status);
  }

  /**
   * Check if entity can transition to a specific state.
   */
  function canTransitionTo(entity: E, to: S): boolean {
    return machine.canTransition(entity.status, to);
  }

  /**
   * Check if entity is in a terminal state.
   */
  function isTerminal(entity: E): boolean {
    return machine.isTerminalState(entity.status);
  }

  return {
    transition,
    safeTransition,
    getNextStates,
    canTransitionTo,
    isTerminal,
  };
}
