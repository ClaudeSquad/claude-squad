/**
 * Agent Spawner
 *
 * Spawns Claude CLI processes and manages their lifecycle.
 * This module provides the core functionality for:
 * - Starting Claude CLI processes with proper arguments
 * - Streaming and parsing real-time output
 * - Creating AgentProcess objects with RxJS Observable output streams
 * - Managing process lifecycle (spawn, kill, wait)
 * - Tracking session IDs and costs
 *
 * @module core/agent/spawner
 *
 * @example
 * ```typescript
 * const spawner = new AgentSpawner();
 *
 * const process = await spawner.spawn({
 *   agent: myAgent,
 *   task: "Implement the authentication feature",
 *   cwd: "/path/to/worktree"
 * });
 *
 * // Subscribe to output
 * process.output$.subscribe(output => {
 *   console.log(`[${output.type}] ${output.content}`);
 * });
 *
 * // Wait for completion
 * spawner.waitForProcess(process.id);
 * ```
 */

import { spawn, type Subprocess } from "bun";
import { ReplaySubject } from "rxjs";

import type { AgentId } from "../types/id.js";
import type { AgentStatus } from "../entities/agent.js";
import type {
  SpawnOptions,
  SpawnedProcess,
  AgentProcess,
  AgentOutput,
} from "./types.js";
import { createAgentOutput } from "./types.js";
import { buildClaudeArgs } from "./args.js";
import {
  parseJsonStream,
  toAgentOutput,
  extractSessionId,
  extractCost,
} from "./stream-parser.js";

// ============================================================================
// Constants
// ============================================================================

/** Prefix for generated process IDs */
const PROCESS_ID_PREFIX = "proc_";

/** Default buffer size for the ReplaySubject (number of recent items to replay) */
const DEFAULT_REPLAY_BUFFER_SIZE = 100;

// ============================================================================
// Process ID Generation
// ============================================================================

/**
 * Generate a unique process ID.
 *
 * Format: proc_<timestamp>_<random>
 *
 * @returns A unique process ID string
 */
function generateProcessId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${PROCESS_ID_PREFIX}${timestamp}_${random}`;
}

// ============================================================================
// AgentSpawner Class
// ============================================================================

/**
 * Spawns and manages Claude CLI agent processes.
 *
 * The AgentSpawner is responsible for:
 * - Spawning Claude CLI processes with proper configuration
 * - Parsing real-time stream-json output
 * - Creating Observable output streams for UI consumption
 * - Tracking process metadata (session ID, timing, etc.)
 * - Managing process lifecycle (spawn, kill, wait)
 *
 * Each spawned process is tracked internally and can be retrieved by ID.
 * Output is streamed via RxJS Observables for reactive UI updates.
 *
 * @example
 * ```typescript
 * const spawner = new AgentSpawner();
 *
 * // Spawn an agent
 * const process = await spawner.spawn({
 *   agent: myAgent,
 *   task: "Build the login page",
 *   cwd: "/path/to/worktree"
 * });
 *
 * // Monitor output
 * process.output$.subscribe(output => {
 *   if (output.type === 'text') {
 *     console.log(output.content);
 *   }
 * });
 *
 * // Kill if needed
 * spawner.kill(process.id);
 *
 * // List all processes
 * const all = spawner.getAllProcesses();
 * ```
 */
export class AgentSpawner {
  /** Map of tracked processes by ID */
  private processes: Map<string, TrackedProcess>;

  /** Size of the replay buffer for output streams */
  private replayBufferSize: number;

  /**
   * Creates a new AgentSpawner instance.
   *
   * @param options - Optional configuration options
   * @param options.replayBufferSize - Number of recent output items to buffer
   *                                   for late subscribers (default: 100)
   */
  constructor(options?: { replayBufferSize?: number }) {
    this.processes = new Map();
    this.replayBufferSize = options?.replayBufferSize ?? DEFAULT_REPLAY_BUFFER_SIZE;
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Spawn a new Claude CLI agent process.
   *
   * Creates a new subprocess running the Claude CLI with the specified
   * configuration. The process output is parsed in real-time and emitted
   * through the returned AgentProcess's output$ Observable.
   *
   * @param options - Spawn configuration including agent, task, and cwd
   * @returns Promise resolving to the AgentProcess with output stream
   * @throws Error if spawn fails or if the working directory doesn't exist
   *
   * @example
   * ```typescript
   * const process = await spawner.spawn({
   *   agent: {
   *     id: "agt_abc123",
   *     name: "backend-dev",
   *     role: "engineering",
   *     // ... other agent properties
   *   },
   *   task: "Implement the user authentication API",
   *   cwd: "/path/to/worktree",
   *   allowedTools: ["Read", "Write", "Edit", "Bash"],
   *   maxTurns: 100
   * });
   *
   * // Subscribe to outputs
   * process.output$.subscribe(output => {
   *   console.log(`[${output.type}] ${output.content ?? output.toolName}`);
   * });
   * ```
   */
  async spawn(options: SpawnOptions): Promise<AgentProcess> {
    // Build CLI arguments
    const args = buildClaudeArgs(options);

    // Create output subject with replay buffer for late subscribers
    const outputSubject = new ReplaySubject<AgentOutput>(this.replayBufferSize);

    // Spawn the Claude CLI process
    let proc: Subprocess;
    try {
      proc = spawn(["claude", ...args], {
        cwd: options.cwd,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
        env: {
          ...process.env,
          // Disable color codes for easier parsing
          FORCE_COLOR: "0",
          NO_COLOR: "1",
          // Pass through any custom env from agent config
          ...options.agent.config?.env,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to spawn Claude CLI: ${errorMessage}`);
    }

    // Generate process ID
    const processId = generateProcessId();
    const startedAt = new Date();

    // Create the tracked process entry
    const tracked: TrackedProcess = {
      id: processId,
      agentId: options.agent.id as AgentId,
      pid: proc.pid,
      state: "working",
      outputSubject,
      subprocess: proc,
      worktreePath: options.cwd,
      startedAt,
      sessionId: options.sessionId,
      totalCostUsd: 0,
    };

    // Store in map
    this.processes.set(processId, tracked);

    // Start processing output streams asynchronously
    // Note: With stdout: "pipe" these are guaranteed to be ReadableStream
    if (proc.stdout && typeof proc.stdout !== "number") {
      this.processOutputStream(tracked, proc.stdout);
    }
    if (proc.stderr && typeof proc.stderr !== "number") {
      this.processErrorStream(tracked, proc.stderr);
    }

    // Handle process exit
    this.handleProcessExit(tracked, proc);

    // Create the public AgentProcess interface
    const agentProcess: AgentProcess = {
      id: processId,
      agentId: options.agent.id as AgentId,
      pid: proc.pid,
      state: "working",
      output$: outputSubject.asObservable(),
      sessionId: options.sessionId,
      worktreePath: options.cwd,
      startedAt,
    };

    return agentProcess;
  }

  /**
   * Kill a running process.
   *
   * Sends a kill signal to the process if it exists and is still running.
   * The process will be marked as completed and its output stream will be closed.
   *
   * @param processId - The ID of the process to kill
   * @returns True if the process was found and killed, false otherwise
   *
   * @example
   * ```typescript
   * const killed = spawner.kill("proc_abc123");
   * if (killed) {
   *   console.log("Process terminated");
   * }
   * ```
   */
  kill(processId: string): boolean {
    const tracked = this.processes.get(processId);
    if (!tracked) {
      return false;
    }

    try {
      tracked.subprocess.kill();
      tracked.state = "completed";

      // Emit a system message indicating the process was killed
      tracked.outputSubject.next(
        createAgentOutput({
          type: "system",
          content: "Process terminated by user",
        })
      );

      return true;
    } catch (error) {
      console.warn(
        `[AgentSpawner] Failed to kill process ${processId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Send input to a running process's stdin.
   *
   * Use this to provide responses to intervention requests or
   * send arbitrary input to the Claude CLI process.
   *
   * @param processId - The ID of the process to send input to
   * @param input - The string input to send (will have newline appended)
   * @returns True if input was sent successfully, false otherwise
   *
   * @example
   * ```typescript
   * // Respond to an intervention request
   * spawner.sendInput(process.id, "yes");
   * ```
   */
  sendInput(processId: string, input: string): boolean {
    const tracked = this.processes.get(processId);
    if (!tracked) {
      console.warn(`[AgentSpawner] Process not found: ${processId}`);
      return false;
    }

    const stdin = tracked.subprocess.stdin;
    if (!stdin || typeof stdin === "number") {
      console.warn(`[AgentSpawner] Process ${processId} has no stdin pipe`);
      return false;
    }

    try {
      // Bun's stdin is a FileSink - use write() directly
      const encoder = new TextEncoder();
      stdin.write(encoder.encode(input + "\n"));
      stdin.flush();
      return true;
    } catch (error) {
      console.warn(
        `[AgentSpawner] Failed to write to stdin for ${processId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get a process by its ID.
   *
   * Returns the current state of the process as an AgentProcess object.
   * The output$ Observable will include recent buffered items.
   *
   * @param processId - The ID of the process to retrieve
   * @returns The AgentProcess if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const process = spawner.getProcess("proc_abc123");
   * if (process) {
   *   console.log(`Status: ${process.state}`);
   * }
   * ```
   */
  getProcess(processId: string): AgentProcess | undefined {
    const tracked = this.processes.get(processId);
    if (!tracked) {
      return undefined;
    }

    return this.toAgentProcess(tracked);
  }

  /**
   * Get all tracked processes.
   *
   * Returns an array of all processes (running and completed)
   * that are still being tracked by the spawner.
   *
   * @returns Array of all tracked AgentProcess objects
   *
   * @example
   * ```typescript
   * const processes = spawner.getAllProcesses();
   * const running = processes.filter(p => p.state === 'working');
   * console.log(`${running.length} agents currently running`);
   * ```
   */
  getAllProcesses(): AgentProcess[] {
    return Array.from(this.processes.values()).map((tracked) =>
      this.toAgentProcess(tracked)
    );
  }

  /**
   * Get all processes for a specific agent.
   *
   * Useful for tracking multiple spawns of the same agent configuration.
   *
   * @param agentId - The agent ID to filter by
   * @returns Array of AgentProcess objects for the specified agent
   *
   * @example
   * ```typescript
   * const agentProcesses = spawner.getProcessesByAgent("agt_abc123");
   * ```
   */
  getProcessesByAgent(agentId: AgentId): AgentProcess[] {
    return Array.from(this.processes.values())
      .filter((tracked) => tracked.agentId === agentId)
      .map((tracked) => this.toAgentProcess(tracked));
  }

  /**
   * Wait for a process to complete.
   *
   * Returns a promise that resolves when the process exits,
   * with the exit code.
   *
   * @param processId - The ID of the process to wait for
   * @returns Promise resolving to the exit code, or null if process not found
   *
   * @example
   * ```typescript
   * const exitCode = await spawner.waitForProcess(process.id);
   * if (exitCode === 0) {
   *   console.log("Process completed successfully");
   * }
   * ```
   */
  async waitForProcess(processId: string): Promise<number | null> {
    const tracked = this.processes.get(processId);
    if (!tracked) {
      return null;
    }

    try {
      await tracked.subprocess.exited;
      return tracked.subprocess.exitCode ?? 1;
    } catch (error) {
      console.warn(`[AgentSpawner] Error waiting for process ${processId}:`, error);
      return null;
    }
  }

  /**
   * Remove a completed process from tracking.
   *
   * Frees resources associated with the process. Only removes
   * processes that are no longer running.
   *
   * @param processId - The ID of the process to remove
   * @returns True if the process was removed, false otherwise
   *
   * @example
   * ```typescript
   * // After process completes
   * await spawner.waitForProcess(process.id);
   * spawner.removeProcess(process.id);
   * ```
   */
  removeProcess(processId: string): boolean {
    const tracked = this.processes.get(processId);
    if (!tracked) {
      return false;
    }

    // Only remove if completed
    if (tracked.state === "working") {
      console.warn(
        `[AgentSpawner] Cannot remove running process ${processId}. Kill it first.`
      );
      return false;
    }

    // Complete the subject if not already
    if (!tracked.outputSubject.closed) {
      tracked.outputSubject.complete();
    }

    this.processes.delete(processId);
    return true;
  }

  /**
   * Get the session ID for a process.
   *
   * The session ID is extracted from Claude CLI result messages
   * and can be used to resume conversations.
   *
   * @param processId - The ID of the process
   * @returns The session ID if available, undefined otherwise
   */
  getSessionId(processId: string): string | undefined {
    const tracked = this.processes.get(processId);
    return tracked?.sessionId;
  }

  /**
   * Get the total cost accumulated for a process.
   *
   * @param processId - The ID of the process
   * @returns The total cost in USD, or 0 if process not found
   */
  getTotalCost(processId: string): number {
    const tracked = this.processes.get(processId);
    return tracked?.totalCostUsd ?? 0;
  }

  /**
   * Clear all completed processes from tracking.
   *
   * Useful for cleanup after a batch of agents complete.
   * Running processes are not affected.
   *
   * @returns Number of processes cleared
   */
  clearCompleted(): number {
    let cleared = 0;

    for (const [id, tracked] of this.processes) {
      if (tracked.state !== "working") {
        if (!tracked.outputSubject.closed) {
          tracked.outputSubject.complete();
        }
        this.processes.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Convert a TrackedProcess to the public AgentProcess interface.
   * @internal
   */
  private toAgentProcess(tracked: TrackedProcess): AgentProcess {
    return {
      id: tracked.id,
      agentId: tracked.agentId,
      pid: tracked.pid,
      state: tracked.state,
      output$: tracked.outputSubject.asObservable(),
      sessionId: tracked.sessionId,
      worktreePath: tracked.worktreePath,
      startedAt: tracked.startedAt,
      lastActivity: tracked.lastActivity,
    };
  }

  /**
   * Process the stdout stream from the Claude CLI.
   *
   * Parses stream-json output and emits AgentOutput events.
   * Also extracts session ID and cost information.
   * @internal
   */
  private async processOutputStream(
    tracked: TrackedProcess,
    stream: ReadableStream<Uint8Array>
  ): Promise<void> {
    try {
      for await (const message of parseJsonStream(stream)) {
        // Update last activity timestamp
        tracked.lastActivity = new Date();

        // Extract session ID if present
        const sessionId = extractSessionId(message);
        if (sessionId) {
          tracked.sessionId = sessionId;
        }

        // Extract and accumulate cost if present
        const cost = extractCost(message);
        if (cost !== undefined) {
          tracked.totalCostUsd += cost;
        }

        // Convert to AgentOutput and emit
        const output = toAgentOutput(message);
        tracked.outputSubject.next(output);
      }
    } catch (error) {
      // Stream closed or error - emit error output
      const errorMessage = error instanceof Error ? error.message : String(error);
      tracked.outputSubject.next(
        createAgentOutput({
          type: "error",
          content: `Stream processing error: ${errorMessage}`,
        })
      );
    }
  }

  /**
   * Process the stderr stream from the Claude CLI.
   *
   * Captures error output and emits it as error AgentOutput events.
   * @internal
   */
  private async processErrorStream(
    tracked: TrackedProcess,
    stream: ReadableStream<Uint8Array>
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            tracked.outputSubject.next(
              createAgentOutput({
                type: "error",
                content: trimmed,
              })
            );
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        tracked.outputSubject.next(
          createAgentOutput({
            type: "error",
            content: buffer.trim(),
          })
        );
      }
    } catch (error) {
      // Stream closed - ignore
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle process exit and cleanup.
   * @internal
   */
  private async handleProcessExit(
    tracked: TrackedProcess,
    proc: Subprocess
  ): Promise<void> {
    try {
      await proc.exited;

      const exitCode = proc.exitCode ?? 1;
      tracked.state = exitCode === 0 ? "completed" : "error";

      // Emit completion message
      tracked.outputSubject.next(
        createAgentOutput({
          type: "system",
          content:
            exitCode === 0
              ? "Process completed successfully"
              : `Process exited with code ${exitCode}`,
        })
      );

      // Complete the subject
      tracked.outputSubject.complete();
    } catch (error) {
      tracked.state = "error";

      const errorMessage = error instanceof Error ? error.message : String(error);
      tracked.outputSubject.next(
        createAgentOutput({
          type: "error",
          content: `Process exit error: ${errorMessage}`,
        })
      );

      tracked.outputSubject.complete();
    }
  }
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal tracking structure for spawned processes.
 * Contains additional mutable state not exposed in the public interface.
 * @internal
 */
interface TrackedProcess {
  /** Unique process ID */
  id: string;
  /** Agent ID this process belongs to */
  agentId: AgentId;
  /** System process ID */
  pid: number;
  /** Current process state */
  state: AgentStatus;
  /** Subject for emitting output events */
  outputSubject: ReplaySubject<AgentOutput>;
  /** The underlying Bun subprocess */
  subprocess: Subprocess;
  /** Working directory (worktree path) */
  worktreePath?: string;
  /** When the process was started */
  startedAt: Date;
  /** When output was last received */
  lastActivity?: Date;
  /** Claude CLI session ID (for resume) */
  sessionId?: string;
  /** Accumulated API cost */
  totalCostUsd: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new AgentSpawner instance.
 *
 * Factory function for creating spawner instances with optional configuration.
 *
 * @param options - Optional configuration options
 * @returns A new AgentSpawner instance
 *
 * @example
 * ```typescript
 * const spawner = createAgentSpawner({
 *   replayBufferSize: 200
 * });
 * ```
 */
export function createAgentSpawner(options?: {
  replayBufferSize?: number;
}): AgentSpawner {
  return new AgentSpawner(options);
}

// ============================================================================
// Low-Level Spawn Function
// ============================================================================

/**
 * Low-level function to spawn a Claude CLI process.
 *
 * Use this when you need direct access to the process streams
 * without the AgentProcess abstraction. For most use cases,
 * prefer AgentSpawner.spawn() instead.
 *
 * @param options - Spawn options containing agent, task, and cwd
 * @returns SpawnedProcess with streams and control functions
 *
 * @example
 * ```typescript
 * const spawned = spawnClaudeProcess(options);
 *
 * // Process output directly
 * for await (const chunk of spawned.stdout) {
 *   // Handle raw bytes
 * }
 *
 * // Clean up
 * const exitCode = await spawned.wait();
 * ```
 */
export function spawnClaudeProcess(options: SpawnOptions): SpawnedProcess {
  const args = buildClaudeArgs(options);

  const proc = spawn(["claude", ...args], {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "pipe",
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      NO_COLOR: "1",
      ...options.agent.config?.env,
    },
  });

  return {
    pid: proc.pid,
    stdout: proc.stdout,
    stderr: proc.stderr,
    kill: () => proc.kill(),
    wait: async () => {
      await proc.exited;
      return proc.exitCode ?? 1;
    },
  };
}
