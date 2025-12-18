/**
 * Agent Manager Service
 *
 * High-level agent lifecycle management service that coordinates agent spawning,
 * process management, and event emission. Integrates with:
 * - ProcessPool for concurrency control
 * - EventBus for domain event emission
 * - Stream parser for output processing
 *
 * @module core/agent/manager
 *
 * @example
 * ```typescript
 * const manager = new AgentManager({ maxConcurrent: 5 });
 *
 * // Start an agent
 * await manager.startAgent(agent, {
 *   task: "Implement the authentication feature",
 *   worktreePath: "/path/to/worktree",
 *   priority: 10,
 * });
 *
 * // Monitor via events
 * eventBus.on('AGENT_OUTPUT').subscribe(event => {
 *   console.log(`[${event.agentId}]: ${event.message}`);
 * });
 *
 * // Stop an agent
 * await manager.stopAgent(agentId);
 *
 * // Get metrics
 * const metrics = manager.getTotalMetrics();
 * console.log(`Total cost: $${metrics.costUsd.toFixed(4)}`);
 * ```
 */

import { spawn, type Subprocess } from "bun";
import { Subject } from "rxjs";

import type { Agent } from "../entities/agent.js";
import type { AgentId } from "../types/id.js";
import { eventBus, createEvent } from "../../infra/events/index.js";
import type {
  AgentMetrics,
  ManagedAgent,
  AgentProcess,
  AgentOutput,
  SpawnOptions,
} from "./types.js";
import { createManagedAgent } from "./types.js";
import { ProcessPool } from "./pool.js";
import { buildClaudeArgs } from "./args.js";
import {
  parseJsonStream,
  toAgentOutput,
  extractSessionId,
} from "./stream-parser.js";

// ============================================================================
// Start Options Interface
// ============================================================================

/**
 * Options for starting an agent.
 */
export interface StartOptions {
  /** The task/prompt for the agent to execute */
  task: string;
  /** Working directory (typically a worktree path) */
  worktreePath?: string;
  /** Priority for queue ordering (higher = more urgent) */
  priority?: number;
  /** Session ID for tracking purposes */
  sessionId?: string;
  /** Override the model from agent config */
  model?: string;
  /** Whitelist of allowed tools */
  allowedTools?: string[];
  /** Blacklist of disallowed tools */
  disallowedTools?: string[];
  /** Maximum conversation turns */
  maxTurns?: number;
  /** Resume an existing Claude session by ID */
  resumeSessionId?: string;
  /** Additional system prompt to append */
  appendSystemPrompt?: string;
}

// ============================================================================
// Agent Manager Configuration
// ============================================================================

/**
 * Configuration options for the AgentManager.
 */
export interface AgentManagerConfig {
  /** Maximum concurrent agents (default: 5) */
  maxConcurrent?: number;
  /** Queue strategy for pending agents */
  queueStrategy?: "fifo" | "priority";
  /** Default timeout for agent operations in milliseconds */
  defaultTimeout?: number;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Default configuration for the AgentManager.
 */
const DEFAULT_AGENT_MANAGER_CONFIG: Required<AgentManagerConfig> = {
  maxConcurrent: 5,
  queueStrategy: "fifo",
  defaultTimeout: 300000, // 5 minutes
  verbose: false,
};

// ============================================================================
// AgentManager Class
// ============================================================================

/**
 * Agent Manager Service
 *
 * Provides high-level agent lifecycle management including:
 * - Starting agents with task prompts
 * - Stopping running agents
 * - Tracking agent metrics (cost, duration, tool calls)
 * - Emitting domain events for UI updates
 * - Coordinating with ProcessPool for concurrency control
 *
 * The manager maintains a registry of ManagedAgent entries that track
 * the full lifecycle of each agent from creation to completion.
 */
export class AgentManager {
  /** Map of agent ID to managed agent entry */
  private agents = new Map<string, ManagedAgent>();

  /** Map of agent ID to running subprocess */
  private processes = new Map<string, Subprocess>();

  /** Process pool for concurrency control */
  private pool: ProcessPool;

  /** Manager configuration */
  private config: Required<AgentManagerConfig>;

  /**
   * Creates a new AgentManager instance.
   *
   * @param config - Optional configuration options
   *
   * @example
   * ```typescript
   * // Create with defaults
   * const manager = new AgentManager();
   *
   * // Create with custom config
   * const manager = new AgentManager({
   *   maxConcurrent: 10,
   *   queueStrategy: 'priority',
   *   defaultTimeout: 600000,
   * });
   * ```
   */
  constructor(config?: AgentManagerConfig) {
    this.config = {
      ...DEFAULT_AGENT_MANAGER_CONFIG,
      ...config,
    };

    this.pool = new ProcessPool({
      maxConcurrent: this.config.maxConcurrent,
      queueStrategy: this.config.queueStrategy,
    });
  }

  // ==========================================================================
  // Agent Lifecycle Methods
  // ==========================================================================

  /**
   * Start an agent with a task.
   *
   * Acquires a slot from the process pool, spawns the Claude CLI process,
   * and begins processing output. Emits AGENT_STARTED event when the
   * process begins and AGENT_COMPLETED when it finishes.
   *
   * @param agent - The agent entity to start
   * @param options - Start options including task and working directory
   * @throws Error if agent is already running
   *
   * @example
   * ```typescript
   * await manager.startAgent(myAgent, {
   *   task: "Implement user authentication",
   *   worktreePath: "/project/worktrees/feature-auth",
   *   priority: 10,
   *   sessionId: "ses_abc123",
   * });
   * ```
   */
  async startAgent(agent: Agent, options: StartOptions): Promise<void> {
    const agentId = agent.id as AgentId;

    // Check if agent is already running
    if (this.agents.has(agentId) && this.agents.get(agentId)?.process !== null) {
      throw new Error(`Agent ${agentId} is already running`);
    }

    // Create or update managed agent entry
    const managedAgent = this.agents.get(agentId) ?? createManagedAgent(agent, {
      priority: options.priority,
    });

    managedAgent.enqueuedAt = new Date();
    managedAgent.priority = options.priority ?? 0;
    this.agents.set(agentId, managedAgent);

    // Acquire a slot from the pool (blocks if pool is full)
    await this.pool.acquire(options.priority ?? 0);

    try {
      // Determine working directory
      const cwd = options.worktreePath ?? process.cwd();

      // Build spawn options
      const spawnOptions: SpawnOptions = {
        agent,
        task: options.task,
        cwd,
        model: options.model,
        allowedTools: options.allowedTools,
        disallowedTools: options.disallowedTools,
        maxTurns: options.maxTurns,
        sessionId: options.resumeSessionId,
        appendSystemPrompt: options.appendSystemPrompt,
        verbose: this.config.verbose,
      };

      // Build CLI arguments
      const args = buildClaudeArgs(spawnOptions);

      // Spawn the Claude CLI process
      const proc = spawn(["claude", ...args], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          NO_COLOR: "1",
        },
      });

      // Store the process reference
      this.processes.set(agentId, proc);

      // Create agent process tracking object
      const startedAt = new Date();
      const output$ = new Subject<AgentOutput>();

      const agentProcess: AgentProcess = {
        id: `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        agentId,
        pid: proc.pid,
        state: "working",
        output$: output$.asObservable(),
        worktreePath: cwd,
        startedAt,
      };

      managedAgent.process = agentProcess;
      managedAgent.worktreeAllocationId = options.worktreePath;

      // Emit AGENT_STARTED event
      eventBus.emit(
        createEvent({
          type: "AGENT_STARTED",
          agentId,
          pid: proc.pid,
          worktreePath: cwd,
        })
      );

      // Emit queue changed event
      this.emitQueueChanged();

      // Process the output stream
      this.processOutputStream(agentId, managedAgent, proc, output$, startedAt);
    } catch (error) {
      // Release the pool slot on error
      this.pool.release();

      // Emit error event
      eventBus.emit(
        createEvent({
          type: "AGENT_ERROR",
          agentId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      );

      throw error;
    }
  }

  /**
   * Process the output stream from a running agent.
   *
   * @internal
   */
  private async processOutputStream(
    agentId: string,
    managedAgent: ManagedAgent,
    proc: Subprocess,
    output$: Subject<AgentOutput>,
    startedAt: Date
  ): Promise<void> {
    try {
      // Ensure stdout is a readable stream
      const stdout = proc.stdout;
      if (!stdout || typeof stdout === "number") {
        throw new Error("Process stdout is not a readable stream");
      }

      // Parse and process the stream
      for await (const message of parseJsonStream(stdout)) {
        // Convert to AgentOutput
        const agentOutput = toAgentOutput(message);

        // Update metrics based on output type
        this.updateMetrics(managedAgent, agentOutput, message);

        // Extract and store session ID if present
        const sessionId = extractSessionId(message);
        if (sessionId && managedAgent.process) {
          managedAgent.process.sessionId = sessionId;
        }

        // Update last activity timestamp
        if (managedAgent.process) {
          managedAgent.process.lastActivity = new Date();
        }

        // Emit the output to subscribers
        output$.next(agentOutput);

        // Emit AGENT_OUTPUT event
        eventBus.emit(
          createEvent({
            type: "AGENT_OUTPUT",
            agentId,
            message: agentOutput.content ?? "",
            stream: "stdout",
          })
        );
      }

      // Wait for process to exit
      const exitCode = await proc.exited;

      // Calculate final duration
      const durationMs = Date.now() - startedAt.getTime();
      managedAgent.metrics.durationMs = durationMs;

      // Complete the output subject
      output$.complete();

      // Emit AGENT_COMPLETED event
      eventBus.emit(
        createEvent({
          type: "AGENT_COMPLETED",
          agentId,
          exitCode,
          duration: durationMs,
        })
      );
    } catch (error) {
      // Emit error event
      eventBus.emit(
        createEvent({
          type: "AGENT_ERROR",
          agentId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
      );

      // Complete the output subject with error
      output$.error(error);
    } finally {
      // Clean up
      this.processes.delete(agentId);

      // Mark process as null (completed)
      if (managedAgent.process) {
        managedAgent.process.state = "completed";
        managedAgent.process = null;
      }

      // Release the pool slot
      this.pool.release();

      // Emit queue changed event
      this.emitQueueChanged();
    }
  }

  /**
   * Update agent metrics based on output.
   *
   * @internal
   */
  private updateMetrics(
    managedAgent: ManagedAgent,
    agentOutput: AgentOutput,
    _rawMessage: unknown
  ): void {
    // Update cost if present
    if (agentOutput.type === "cost" && agentOutput.costUsd !== undefined) {
      managedAgent.metrics.costUsd += agentOutput.costUsd;
    }

    // Increment tool calls count
    if (agentOutput.type === "tool_use") {
      managedAgent.metrics.toolCalls++;
    }

    // Note: Token counting would require additional parsing from the raw message
    // The Claude CLI doesn't directly expose token counts in stream-json output
  }

  /**
   * Stop a running agent.
   *
   * Kills the subprocess if running and cleans up resources.
   * Emits AGENT_COMPLETED event with exit code.
   *
   * @param agentId - The ID of the agent to stop
   *
   * @example
   * ```typescript
   * await manager.stopAgent("agt_abc123xyz456" as AgentId);
   * ```
   */
  async stopAgent(agentId: AgentId): Promise<void> {
    const proc = this.processes.get(agentId);

    if (proc) {
      // Kill the process
      proc.kill();

      // Wait for it to exit
      await proc.exited;

      // Clean up is handled in processOutputStream's finally block
    }

    // Clean up managed agent
    const managedAgent = this.agents.get(agentId);
    if (managedAgent && managedAgent.process) {
      managedAgent.process.state = "completed";
      managedAgent.process = null;
    }
  }

  /**
   * Pause an agent (placeholder - not fully implemented).
   *
   * Agent pausing requires cooperation from the Claude CLI,
   * which currently doesn't support pause/resume. This method
   * is a placeholder for future implementation.
   *
   * @param agentId - The ID of the agent to pause
   */
  pauseAgent(agentId: AgentId): void {
    const managedAgent = this.agents.get(agentId);

    if (managedAgent?.process) {
      managedAgent.process.state = "paused";

      // Emit pause event
      eventBus.emit(
        createEvent({
          type: "AGENT_PAUSED",
          agentId,
          reason: "User requested pause",
        })
      );
    }

    // Note: Actual process pausing would require SIGSTOP/SIGCONT on Unix
    // or suspending the process on Windows, which may not work reliably
    // with the Claude CLI. For now, this just updates the state.
  }

  /**
   * Resume a paused agent (placeholder - not fully implemented).
   *
   * @param agentId - The ID of the agent to resume
   */
  resumeAgent(agentId: AgentId): void {
    const managedAgent = this.agents.get(agentId);

    if (managedAgent?.process) {
      managedAgent.process.state = "working";

      // Emit resume event
      eventBus.emit(
        createEvent({
          type: "AGENT_RESUMED",
          agentId,
        })
      );
    }

    // Note: Actual process resuming would require SIGCONT on Unix.
    // See pauseAgent for limitations.
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get a managed agent by ID.
   *
   * @param agentId - The ID of the agent to get
   * @returns The managed agent entry, or undefined if not found
   *
   * @example
   * ```typescript
   * const managed = manager.getAgent("agt_abc123" as AgentId);
   * if (managed?.process) {
   *   console.log(`Agent is ${managed.process.state}`);
   * }
   * ```
   */
  getAgent(agentId: AgentId): ManagedAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all managed agents.
   *
   * @returns Array of all managed agent entries
   *
   * @example
   * ```typescript
   * const agents = manager.getAllAgents();
   * const running = agents.filter(a => a.process !== null);
   * console.log(`${running.length} agents running`);
   * ```
   */
  getAllAgents(): ManagedAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all currently running agents.
   *
   * @returns Array of managed agents that have an active process
   */
  getRunningAgents(): ManagedAgent[] {
    return this.getAllAgents().filter((a) => a.process !== null);
  }

  /**
   * Get metrics for a specific agent.
   *
   * @param agentId - The ID of the agent
   * @returns The agent's metrics, or undefined if agent not found
   *
   * @example
   * ```typescript
   * const metrics = manager.getMetrics("agt_abc123" as AgentId);
   * if (metrics) {
   *   console.log(`Cost: $${metrics.costUsd.toFixed(4)}`);
   *   console.log(`Tool calls: ${metrics.toolCalls}`);
   * }
   * ```
   */
  getMetrics(agentId: AgentId): AgentMetrics | undefined {
    return this.agents.get(agentId)?.metrics;
  }

  /**
   * Get aggregated metrics across all agents.
   *
   * Sums up all metrics from all managed agents, including
   * both running and completed agents.
   *
   * @returns Aggregated metrics object
   *
   * @example
   * ```typescript
   * const total = manager.getTotalMetrics();
   * console.log(`Total cost: $${total.costUsd.toFixed(4)}`);
   * console.log(`Total tool calls: ${total.toolCalls}`);
   * console.log(`Total duration: ${total.durationMs}ms`);
   * ```
   */
  getTotalMetrics(): AgentMetrics {
    const total: AgentMetrics = {
      tokensUsed: 0,
      costUsd: 0,
      durationMs: 0,
      toolCalls: 0,
    };

    for (const agent of this.agents.values()) {
      total.tokensUsed += agent.metrics.tokensUsed;
      total.costUsd += agent.metrics.costUsd;
      total.durationMs += agent.metrics.durationMs;
      total.toolCalls += agent.metrics.toolCalls;
    }

    return total;
  }

  // ==========================================================================
  // Pool Management
  // ==========================================================================

  /**
   * Get the current pool statistics.
   *
   * @returns Pool statistics including running, queued, and available counts
   */
  getPoolStats(): {
    running: number;
    queued: number;
    available: number;
    maxConcurrent: number;
  } {
    const stats = this.pool.getStats();
    return {
      running: stats.running,
      queued: stats.queued,
      available: stats.available,
      maxConcurrent: stats.maxConcurrent,
    };
  }

  /**
   * Update the maximum concurrent agent limit.
   *
   * @param max - New maximum concurrent agents
   */
  setMaxConcurrent(max: number): void {
    this.pool.setLimit(max);
    this.config.maxConcurrent = max;
  }

  // ==========================================================================
  // Cleanup Methods
  // ==========================================================================

  /**
   * Stop all running agents and clean up resources.
   *
   * Kills all running processes, clears the queue, and resets
   * the manager state. Use this for graceful shutdown.
   *
   * @example
   * ```typescript
   * // During application shutdown
   * await manager.stopAll();
   * ```
   */
  async stopAll(): Promise<void> {
    // Clear the queue first
    this.pool.clearQueue();

    // Stop all running processes
    const stopPromises: Promise<void>[] = [];

    for (const [agentId, proc] of this.processes) {
      proc.kill();
      stopPromises.push(
        proc.exited.then(() => {
          this.processes.delete(agentId);
        })
      );
    }

    await Promise.all(stopPromises);

    // Clean up managed agents
    for (const agent of this.agents.values()) {
      if (agent.process) {
        agent.process = null;
      }
    }

    this.emitQueueChanged();
  }

  /**
   * Remove a managed agent from the registry.
   *
   * Only removes agents that are not currently running.
   *
   * @param agentId - The ID of the agent to remove
   * @returns True if the agent was removed
   */
  removeAgent(agentId: AgentId): boolean {
    const agent = this.agents.get(agentId);

    if (agent && agent.process === null) {
      this.agents.delete(agentId);
      return true;
    }

    return false;
  }

  /**
   * Clear all completed agents from the registry.
   *
   * Removes agents that are not currently running, keeping
   * only active agents in the registry.
   *
   * @returns Number of agents removed
   */
  clearCompleted(): number {
    let removed = 0;

    for (const [agentId, agent] of this.agents) {
      if (agent.process === null) {
        this.agents.delete(agentId);
        removed++;
      }
    }

    return removed;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Emit a queue changed event.
   *
   * @internal
   */
  private emitQueueChanged(): void {
    // The ProcessManagerEvents type expects this format
    // We emit via the domain event bus instead
    // Note: There's no specific QUEUE_CHANGED event type in the domain events,
    // so consumers should use getPoolStats() for queue information
    // Stats available via: this.pool.getStats()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AgentManager instance.
 *
 * @param config - Optional configuration options
 * @returns A new AgentManager instance
 *
 * @example
 * ```typescript
 * const manager = createAgentManager({ maxConcurrent: 10 });
 * ```
 */
export function createAgentManager(config?: AgentManagerConfig): AgentManager {
  return new AgentManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default global agent manager instance.
 *
 * Use this singleton for application-wide agent management.
 * For isolated testing or subsystems, create a new instance instead.
 */
export const agentManager = new AgentManager();
