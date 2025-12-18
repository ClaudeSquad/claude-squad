/**
 * Agent Spawner & Process Management Types
 *
 * Type definitions for the agent spawning and process management system.
 * These types define the interfaces for:
 * - Running agent processes and their lifecycle
 * - Spawn options for Claude CLI
 * - Output parsing and stream handling
 * - User intervention requests
 * - Process pool management
 *
 * @module core/agent/types
 */

import { z } from "zod";
import type { Observable } from "rxjs";
import type { Agent, AgentStatus } from "../entities/agent.js";
import type { AgentId } from "../types/id.js";

// ============================================================================
// Agent Output Types
// ============================================================================

/**
 * Types of output that can be received from an agent.
 */
export const AgentOutputTypeSchema = z.enum([
  "text",
  "tool_use",
  "tool_result",
  "error",
  "cost",
  "system",
]);
export type AgentOutputType = z.infer<typeof AgentOutputTypeSchema>;

/**
 * Output from a running agent.
 *
 * Represents a single output message from the Claude CLI,
 * which can be text content, tool usage, tool results,
 * errors, cost information, or system messages.
 */
export interface AgentOutput {
  /** Type of output */
  type: AgentOutputType;
  /** Text content (for text and error types) */
  content?: string;
  /** Tool name (for tool_use type) */
  toolName?: string;
  /** Tool input parameters (for tool_use type) */
  toolInput?: unknown;
  /** Tool execution result (for tool_result type) */
  toolOutput?: unknown;
  /** API cost in USD (for cost type) */
  costUsd?: number;
  /** When this output occurred */
  timestamp: Date;
}

/**
 * Zod schema for AgentOutput validation.
 */
export const AgentOutputSchema = z.object({
  type: AgentOutputTypeSchema,
  content: z.string().optional(),
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolOutput: z.unknown().optional(),
  costUsd: z.number().nonnegative().optional(),
  timestamp: z.coerce.date(),
});

// ============================================================================
// Stream Message Types (Claude CLI stream-json format)
// ============================================================================

/**
 * Message types from Claude CLI stream-json output.
 */
export const StreamMessageTypeSchema = z.enum([
  "assistant",
  "user",
  "tool_use",
  "tool_result",
  "error",
  "result",
  "system",
]);
export type StreamMessageType = z.infer<typeof StreamMessageTypeSchema>;

/**
 * Content block within a message.
 */
export interface ContentBlock {
  /** Block type */
  type: string;
  /** Text content (for text blocks) */
  text?: string;
  /** Tool name (for tool_use blocks) */
  name?: string;
  /** Tool input (for tool_use blocks) */
  input?: unknown;
}

/**
 * Raw message from Claude CLI stream-json output.
 *
 * This interface represents the raw JSON messages emitted by the Claude CLI
 * when running with `--output-format stream-json`. Messages include
 * assistant responses, tool usage, tool results, and session metadata.
 */
export interface StreamMessage {
  /** Message type */
  type: StreamMessageType;
  /** Additional type information */
  subtype?: string;
  /** Message content structure */
  message?: {
    /** Array of content blocks */
    content?: ContentBlock[];
  };
  /** Direct text content (for some message types) */
  content?: string;
  /** API cost in USD */
  cost_usd?: number;
  /** Session ID (in result messages) */
  session_id?: string;
  /** Total duration in milliseconds (in result messages) */
  duration_ms?: number;
  /** API call duration in milliseconds */
  duration_api_ms?: number;
  /** Number of turns in the conversation */
  num_turns?: number;
}

/**
 * Zod schema for StreamMessage validation.
 */
export const StreamMessageSchema = z.object({
  type: StreamMessageTypeSchema,
  subtype: z.string().optional(),
  message: z
    .object({
      content: z
        .array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
            name: z.string().optional(),
            input: z.unknown().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  content: z.string().optional(),
  cost_usd: z.number().optional(),
  session_id: z.string().optional(),
  duration_ms: z.number().optional(),
  duration_api_ms: z.number().optional(),
  num_turns: z.number().optional(),
});

// ============================================================================
// Agent Process Types
// ============================================================================

/**
 * Represents a running agent process.
 *
 * Tracks the state of a spawned Claude CLI process, including its
 * system process ID, output stream, session information, and timing.
 */
export interface AgentProcess {
  /** Unique process identifier (internal tracking) */
  id: string;
  /** Reference to the agent entity */
  agentId: AgentId;
  /** System process ID */
  pid: number;
  /** Current process state */
  state: AgentStatus;
  /** Observable stream of output events */
  output$: Observable<AgentOutput>;
  /** Claude CLI session ID for resume capability */
  sessionId?: string;
  /** Git worktree path where agent is working */
  worktreePath?: string;
  /** When the process was started */
  startedAt: Date;
  /** When output was last received */
  lastActivity?: Date;
}

// ============================================================================
// Spawn Options
// ============================================================================

/**
 * Permission handling modes for tool execution.
 */
export const PermissionModeSchema = z.enum(["default", "strict", "permissive"]);
export type PermissionMode = z.infer<typeof PermissionModeSchema>;

/**
 * Options for spawning a new agent process.
 *
 * Configures how the Claude CLI should be invoked, including
 * the task prompt, working directory, model, tool permissions,
 * and conversation limits.
 */
export interface SpawnOptions {
  /** Agent configuration */
  agent: Agent;
  /** Initial prompt/task for the agent */
  task: string;
  /** Working directory (typically a worktree path) */
  cwd: string;
  /** Override the model from agent config */
  model?: string;
  /** Whitelist of allowed tools */
  allowedTools?: string[];
  /** Blacklist of disallowed tools */
  disallowedTools?: string[];
  /** Maximum conversation turns before stopping */
  maxTurns?: number;
  /** Resume an existing session by ID */
  sessionId?: string;
  /** Override the system prompt entirely */
  systemPrompt?: string;
  /** Append additional instructions to system prompt */
  appendSystemPrompt?: string;
  /** Enable verbose CLI output */
  verbose?: boolean;
  /** Skip permission prompts (dangerous) */
  dangerouslySkipPermissions?: boolean;
  /** Permission handling mode */
  permissionMode?: PermissionMode;
}

/**
 * Zod schema for SpawnOptions validation.
 */
export const SpawnOptionsSchema = z.object({
  agent: z.any(), // Agent schema is complex, validated separately
  task: z.string().min(1, "Task is required"),
  cwd: z.string().min(1, "Working directory is required"),
  model: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  maxTurns: z.number().int().positive().optional(),
  sessionId: z.string().optional(),
  systemPrompt: z.string().optional(),
  appendSystemPrompt: z.string().optional(),
  verbose: z.boolean().optional(),
  dangerouslySkipPermissions: z.boolean().optional(),
  permissionMode: PermissionModeSchema.optional(),
});

// ============================================================================
// Intervention Types
// ============================================================================

/**
 * Types of intervention requests from an agent.
 */
export const InterventionTypeSchema = z.enum([
  "question",
  "approval",
  "input",
  "choice",
]);
export type InterventionType = z.infer<typeof InterventionTypeSchema>;

/**
 * Status of an intervention request.
 */
export const InterventionStatusSchema = z.enum([
  "pending",
  "answered",
  "timeout",
]);
export type InterventionStatus = z.infer<typeof InterventionStatusSchema>;

/**
 * A request for user intervention from an agent.
 *
 * When an agent needs user input (question, approval, selection),
 * it creates an intervention request that pauses the agent until
 * the user responds.
 */
export interface InterventionRequest {
  /** Unique request identifier */
  id: string;
  /** Agent requesting intervention */
  agentId: AgentId;
  /** Type of intervention needed */
  type: InterventionType;
  /** Prompt/question for the user */
  prompt: string;
  /** Available options (for choice type) */
  options?: string[];
  /** Context about what the agent was doing */
  context: string;
  /** When the request was created */
  timestamp: Date;
  /** Current status of the request */
  status: InterventionStatus;
  /** User's response (when answered) */
  response?: string;
}

/**
 * Zod schema for InterventionRequest validation.
 */
export const InterventionRequestSchema = z.object({
  id: z.string().min(1),
  agentId: z.string(), // Branded type, validated at runtime
  type: InterventionTypeSchema,
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  context: z.string(),
  timestamp: z.coerce.date(),
  status: InterventionStatusSchema,
  response: z.string().optional(),
});

// ============================================================================
// Process Pool Types
// ============================================================================

/**
 * Queue strategy for the process pool.
 */
export const QueueStrategySchema = z.enum(["fifo", "priority"]);
export type QueueStrategy = z.infer<typeof QueueStrategySchema>;

/**
 * Configuration for the agent process pool.
 *
 * Controls how many agents can run simultaneously and
 * how queued agents are prioritized.
 */
export interface ProcessPoolConfig {
  /** Maximum simultaneous agent processes (default: 5) */
  maxConcurrent: number;
  /** Queue ordering strategy */
  queueStrategy: QueueStrategy;
}

/**
 * Zod schema for ProcessPoolConfig validation.
 */
export const ProcessPoolConfigSchema = z.object({
  maxConcurrent: z.number().int().min(1).max(20).default(5),
  queueStrategy: QueueStrategySchema.default("fifo"),
});

/**
 * Default process pool configuration.
 */
export const DEFAULT_PROCESS_POOL_CONFIG: ProcessPoolConfig = {
  maxConcurrent: 5,
  queueStrategy: "fifo",
};

// ============================================================================
// Managed Agent Types
// ============================================================================

/**
 * Metrics tracked for a running agent.
 */
export interface AgentMetrics {
  /** Total tokens consumed */
  tokensUsed: number;
  /** Total API cost in USD */
  costUsd: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Number of tool calls made */
  toolCalls: number;
}

/**
 * Default metrics for a new agent.
 */
export const DEFAULT_AGENT_METRICS: AgentMetrics = {
  tokensUsed: 0,
  costUsd: 0,
  durationMs: 0,
  toolCalls: 0,
};

/**
 * Internal tracking of an agent in the process manager.
 *
 * Combines the running process with the agent configuration
 * and worktree allocation for full lifecycle management.
 */
export interface ManagedAgent {
  /** The running process (null if not started) */
  process: AgentProcess | null;
  /** Agent configuration */
  agent: Agent;
  /** Worktree allocation reference */
  worktreeAllocationId?: string;
  /** Cumulative metrics for this agent */
  metrics: AgentMetrics;
  /** Priority for queue ordering (higher = more urgent) */
  priority: number;
  /** When the agent was enqueued (if queued) */
  enqueuedAt?: Date;
}

// ============================================================================
// Spawned Process Types
// ============================================================================

/**
 * Result of spawning a Claude CLI process.
 *
 * Provides handles to the process, its streams, and control functions.
 * This is the low-level interface returned by the spawn function.
 */
export interface SpawnedProcess {
  /** System process ID */
  pid: number;
  /** Stdout readable stream */
  stdout: ReadableStream<Uint8Array>;
  /** Stderr readable stream */
  stderr: ReadableStream<Uint8Array>;
  /** Kill the process */
  kill: () => void;
  /** Wait for process to exit, returns exit code */
  wait: () => Promise<number>;
}

// ============================================================================
// Process Events
// ============================================================================

/**
 * Events emitted by the process manager.
 */
export interface ProcessManagerEvents {
  /** Agent process started */
  started: { agentId: AgentId; pid: number };
  /** Agent process output received */
  output: { agentId: AgentId; output: AgentOutput };
  /** Agent process completed */
  completed: { agentId: AgentId; exitCode: number; metrics: AgentMetrics };
  /** Agent process errored */
  error: { agentId: AgentId; error: Error };
  /** Agent waiting for intervention */
  intervention: { agentId: AgentId; request: InterventionRequest };
  /** Pool queue changed */
  queueChanged: { queued: number; running: number };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid AgentOutput.
 */
export function isAgentOutput(value: unknown): value is AgentOutput {
  return AgentOutputSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid StreamMessage.
 */
export function isStreamMessage(value: unknown): value is StreamMessage {
  return StreamMessageSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid InterventionRequest.
 */
export function isInterventionRequest(
  value: unknown
): value is InterventionRequest {
  return InterventionRequestSchema.safeParse(value).success;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new AgentOutput with current timestamp.
 */
export function createAgentOutput(
  data: Omit<AgentOutput, "timestamp">
): AgentOutput {
  return {
    ...data,
    timestamp: new Date(),
  };
}

/**
 * Create a new InterventionRequest with defaults.
 */
export function createInterventionRequest(
  data: Omit<InterventionRequest, "id" | "timestamp" | "status">
): InterventionRequest {
  return {
    ...data,
    id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    status: "pending",
  };
}

/**
 * Create default metrics for a new agent.
 */
export function createAgentMetrics(): AgentMetrics {
  return { ...DEFAULT_AGENT_METRICS };
}

/**
 * Create a ManagedAgent entry.
 */
export function createManagedAgent(
  agent: Agent,
  options?: { worktreeAllocationId?: string; priority?: number }
): ManagedAgent {
  return {
    process: null,
    agent,
    worktreeAllocationId: options?.worktreeAllocationId,
    metrics: createAgentMetrics(),
    priority: options?.priority ?? 0,
  };
}
