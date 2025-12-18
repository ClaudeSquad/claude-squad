/**
 * State Machines Barrel Export
 *
 * Re-exports all state machine utilities and entity-specific state machines.
 */

// Base utilities
export {
  createStateMachine,
  createEntityTransition,
  InvalidTransitionError,
  type TransitionMap,
  type TransitionResult,
  type Stateful,
} from "./base";

// Agent state machine
export {
  agentStateMachine,
  agentTransitions,
  canAgentTransition,
  getValidAgentTransitions,
  isAgentTerminal,
  transitionAgent,
  safeTransitionAgent,
  startAgent,
  pauseAgent,
  resumeAgent,
  waitForInput,
  inputReceived,
  completeAgent,
  errorAgent,
  retryAgent,
} from "./agent";

// Feature state machine
export {
  featureStateMachine,
  featureTransitions,
  canFeatureTransition,
  getValidFeatureTransitions,
  isFeatureTerminalState,
  transitionFeature,
  safeTransitionFeature,
  startDevelopment,
  submitForReview,
  requestChanges,
  moveToTesting,
  failTests,
  completeFeature,
  blockFeature,
  unblockFeature,
  cancelFeature,
} from "./feature";

// Session state machine
export {
  sessionStateMachine,
  sessionTransitions,
  canSessionTransition,
  getValidSessionTransitions,
  isSessionTerminalState,
  transitionSession,
  safeTransitionSession,
  pauseSession,
  resumeSession,
  completeSession,
  crashSession,
  recoverSession,
  archiveSession,
} from "./session";

// Worktree state machine
export {
  worktreeStateMachine,
  worktreeTransitions,
  canWorktreeTransition,
  getValidWorktreeTransitions,
  isWorktreeTerminalState,
  transitionWorktree,
  safeTransitionWorktree,
  markWorktreeStale,
  removeActiveWorktree,
  cleanupWorktree,
  removeWorktree,
} from "./worktree";
