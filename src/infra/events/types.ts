/**
 * Event Types
 *
 * Domain event definitions for the Claude Squad event bus.
 * Events enable reactive communication between components.
 */

/**
 * Agent lifecycle events
 */
export interface AgentStartedEvent {
  type: "AGENT_STARTED";
  agentId: string;
  pid: number;
  worktreePath?: string;
  timestamp: number;
}

export interface AgentOutputEvent {
  type: "AGENT_OUTPUT";
  agentId: string;
  message: string;
  stream: "stdout" | "stderr";
  timestamp: number;
}

export interface AgentCompletedEvent {
  type: "AGENT_COMPLETED";
  agentId: string;
  exitCode: number;
  duration: number;
  timestamp: number;
}

export interface AgentErrorEvent {
  type: "AGENT_ERROR";
  agentId: string;
  error: string;
  stack?: string;
  timestamp: number;
}

export interface AgentPausedEvent {
  type: "AGENT_PAUSED";
  agentId: string;
  reason?: string;
  timestamp: number;
}

export interface AgentResumedEvent {
  type: "AGENT_RESUMED";
  agentId: string;
  timestamp: number;
}

/**
 * Session lifecycle events
 */
export interface SessionCreatedEvent {
  type: "SESSION_CREATED";
  sessionId: string;
  projectPath: string;
  timestamp: number;
}

export interface SessionPausedEvent {
  type: "SESSION_PAUSED";
  sessionId: string;
  reason?: string;
  timestamp: number;
}

export interface SessionResumedEvent {
  type: "SESSION_RESUMED";
  sessionId: string;
  timestamp: number;
}

export interface SessionEndedEvent {
  type: "SESSION_ENDED";
  sessionId: string;
  duration: number;
  timestamp: number;
}

/**
 * Workflow events
 */
export interface WorkflowStageStartedEvent {
  type: "WORKFLOW_STAGE_STARTED";
  stageId: string;
  workflowId: string;
  stageName: string;
  timestamp: number;
}

export interface WorkflowStageCompletedEvent {
  type: "WORKFLOW_STAGE_COMPLETED";
  stageId: string;
  workflowId: string;
  stageName: string;
  duration: number;
  timestamp: number;
}

export interface WorkflowReviewRequiredEvent {
  type: "WORKFLOW_REVIEW_REQUIRED";
  stageId: string;
  workflowId: string;
  stageName: string;
  timestamp: number;
}

/**
 * Cost tracking events
 */
export interface CostUpdatedEvent {
  type: "COST_UPDATED";
  sessionId: string;
  agentId?: string;
  cost: number;
  totalCost: number;
  tokens: {
    input: number;
    output: number;
  };
  timestamp: number;
}

/**
 * Handoff events
 */
export interface HandoffCreatedEvent {
  type: "HANDOFF_CREATED";
  path: string;
  fromAgentId?: string;
  toAgentId?: string;
  timestamp: number;
}

export interface HandoffReadEvent {
  type: "HANDOFF_READ";
  path: string;
  agentId: string;
  timestamp: number;
}

/**
 * Feature events
 */
export interface FeatureStartedEvent {
  type: "FEATURE_STARTED";
  featureId: string;
  description: string;
  timestamp: number;
}

export interface FeatureCompletedEvent {
  type: "FEATURE_COMPLETED";
  featureId: string;
  prUrl?: string;
  timestamp: number;
}

/**
 * Git events
 */
export interface GitWorktreeCreatedEvent {
  type: "GIT_WORKTREE_CREATED";
  path: string;
  branch: string;
  agentId?: string;
  timestamp: number;
}

export interface GitWorktreeRemovedEvent {
  type: "GIT_WORKTREE_REMOVED";
  path: string;
  timestamp: number;
}

export interface GitCommitCreatedEvent {
  type: "GIT_COMMIT_CREATED";
  path: string;
  commitHash: string;
  message: string;
  agentId?: string;
  timestamp: number;
}

/**
 * UI events
 */
export interface ScreenChangedEvent {
  type: "SCREEN_CHANGED";
  screen: string;
  previousScreen?: string;
  timestamp: number;
}

export interface UserInputEvent {
  type: "USER_INPUT";
  input: string;
  isCommand: boolean;
  timestamp: number;
}

/**
 * Chat events
 */
export interface ChatInputEvent {
  type: "CHAT_INPUT";
  input: string;
  timestamp: number;
}

export interface ChatResponseEvent {
  type: "CHAT_RESPONSE";
  input: string;
  response: {
    content: string;
    type: string;
    success: boolean;
  };
  timestamp: number;
}

export interface IntentClassifiedEvent {
  type: "INTENT_CLASSIFIED";
  input: string;
  result: {
    intentType: string;
    method: string;
    classificationTimeMs: number;
    cached: boolean;
  };
  timestamp: number;
}

/**
 * Agent intervention events
 */
export interface AgentInterventionRequestedEvent {
  type: "AGENT_INTERVENTION_REQUESTED";
  agentId: string;
  requestId: string;
  interventionType: "question" | "approval" | "input" | "choice";
  prompt: string;
  options?: string[];
  timestamp: number;
}

export interface AgentInterventionRespondedEvent {
  type: "AGENT_INTERVENTION_RESPONDED";
  agentId: string;
  requestId: string;
  response: string;
  timestamp: number;
}

/**
 * System events
 */
export interface SystemErrorEvent {
  type: "SYSTEM_ERROR";
  error: string;
  stack?: string;
  component?: string;
  timestamp: number;
}

export interface SystemShutdownEvent {
  type: "SYSTEM_SHUTDOWN";
  reason?: string;
  timestamp: number;
}

/**
 * Union type of all domain events
 */
export type DomainEvent =
  // Agent events
  | AgentStartedEvent
  | AgentOutputEvent
  | AgentCompletedEvent
  | AgentErrorEvent
  | AgentPausedEvent
  | AgentResumedEvent
  // Session events
  | SessionCreatedEvent
  | SessionPausedEvent
  | SessionResumedEvent
  | SessionEndedEvent
  // Workflow events
  | WorkflowStageStartedEvent
  | WorkflowStageCompletedEvent
  | WorkflowReviewRequiredEvent
  // Cost events
  | CostUpdatedEvent
  // Handoff events
  | HandoffCreatedEvent
  | HandoffReadEvent
  // Feature events
  | FeatureStartedEvent
  | FeatureCompletedEvent
  // Git events
  | GitWorktreeCreatedEvent
  | GitWorktreeRemovedEvent
  | GitCommitCreatedEvent
  // UI events
  | ScreenChangedEvent
  | UserInputEvent
  // Chat events
  | ChatInputEvent
  | ChatResponseEvent
  | IntentClassifiedEvent
  // Agent intervention events
  | AgentInterventionRequestedEvent
  | AgentInterventionRespondedEvent
  // System events
  | SystemErrorEvent
  | SystemShutdownEvent;

/**
 * Event type literals for type-safe filtering
 */
export type DomainEventType = DomainEvent["type"];

/**
 * Extract event by type
 */
export type EventOfType<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;

/**
 * Helper to create a timestamped event
 */
export function createEvent<T extends Omit<DomainEvent, "timestamp">>(
  event: T
): T & { timestamp: number } {
  return {
    ...event,
    timestamp: Date.now(),
  };
}
