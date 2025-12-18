/**
 * Intervention Handler
 *
 * Manages user intervention requests from running agents. When an agent needs
 * user input (questions, approvals, choices), this handler detects the request,
 * queues it, and manages the response flow.
 *
 * The handler detects intervention patterns in agent output:
 * - Questions ending with "?"
 * - Approval requests (approve, permission, allow, confirm)
 * - Choice prompts with numbered options (1., 2., etc.)
 * - Input prompts asking for user input
 *
 * @module core/agent/intervention
 *
 * @example
 * ```typescript
 * const handler = new InterventionHandler({ defaultTimeoutMs: 300000 });
 *
 * // Subscribe to intervention events
 * handler.intervention$.subscribe(({ agentId, request }) => {
 *   console.log(`Agent ${agentId} needs: ${request.prompt}`);
 *   showInterventionUI(request);
 * });
 *
 * // Detect and queue interventions from agent output
 * const request = handler.detectIntervention(agentId, agentOutput);
 * if (request) {
 *   handler.queueIntervention(request);
 * }
 *
 * // Respond to an intervention
 * handler.respond(requestId, 'yes');
 * ```
 */

import { Subject } from "rxjs";
import type { AgentId } from "../types/id.js";
import type {
  InterventionRequest,
  InterventionType,
  InterventionStatus,
  AgentOutput,
} from "./types.js";
import { createInterventionRequest } from "./types.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration options for the InterventionHandler.
 */
export interface InterventionHandlerConfig {
  /** Default timeout for interventions in milliseconds (default: 5 minutes) */
  defaultTimeoutMs: number;
  /** Maximum number of pending interventions per agent (default: 10) */
  maxPendingPerAgent: number;
  /** Enable automatic timeout cleanup (default: true) */
  enableTimeouts: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_INTERVENTION_CONFIG: InterventionHandlerConfig = {
  defaultTimeoutMs: 5 * 60 * 1000, // 5 minutes
  maxPendingPerAgent: 10,
  enableTimeouts: true,
};

// ============================================================================
// Intervention Event Types
// ============================================================================

/**
 * Event emitted when an intervention is detected or status changes.
 */
export interface InterventionEvent {
  /** The agent ID that triggered the intervention */
  agentId: AgentId;
  /** The intervention request */
  request: InterventionRequest;
}

// ============================================================================
// Detection Patterns
// ============================================================================

/**
 * Patterns for detecting different types of interventions in agent output.
 * @internal
 */
const INTERVENTION_PATTERNS = {
  /**
   * Question patterns - questions ending with "?"
   * Matches sentences that appear to be asking for user input.
   */
  question: [
    /(?:^|\n)([^.!?\n]*\?)\s*$/i,
    /(?:would you|do you|can you|should I|shall I|may I)[^.!?\n]*\?/i,
    /(?:what|which|where|when|why|how)[^.!?\n]*\?/i,
  ],

  /**
   * Approval patterns - requests for permission or confirmation.
   */
  approval: [
    /(?:approve|confirm|allow|permit|authorize|grant permission)/i,
    /(?:proceed with|continue with|go ahead with)\s+(?:this|the|these)/i,
    /(?:is this okay|is that okay|is this acceptable)/i,
    /(?:do you want me to|should I proceed|shall I continue)/i,
    /(?:waiting for (?:your )?(?:approval|confirmation|permission))/i,
    /(?:requires? (?:your )?(?:approval|confirmation|permission))/i,
  ],

  /**
   * Choice patterns - numbered or bulleted options.
   */
  choice: [
    /(?:choose|select|pick)\s+(?:one|an option|from)/i,
    /(?:options?|choices?):\s*$/i,
    /(?:^|\n)\s*(?:[1-9][\.\)]\s+.+\n?){2,}/m,
    /(?:^|\n)\s*(?:[-*]\s+.+\n?){2,}/m,
    /(?:which (?:one|option) (?:would you|do you) (?:prefer|want))/i,
  ],

  /**
   * Input patterns - requests for user input.
   */
  input: [
    /(?:enter|provide|specify|type|input)\s+(?:a |the |your )/i,
    /(?:please (?:enter|provide|specify|type|give))/i,
    /(?:what is your|what's your)/i,
    /(?:waiting for (?:user )?input)/i,
    /(?:input required|user input needed)/i,
  ],
};

// ============================================================================
// InterventionHandler Class
// ============================================================================

/**
 * Manages intervention requests from running agents.
 *
 * The InterventionHandler is responsible for:
 * - Detecting intervention patterns in agent output
 * - Queuing pending intervention requests
 * - Managing timeouts for unanswered requests
 * - Providing responses back to agents
 * - Emitting events for UI updates
 *
 * Each intervention request has a unique ID and tracks its status
 * (pending, answered, timeout). The handler ensures only one pending
 * intervention per agent is typically active at a time.
 */
export class InterventionHandler {
  /** Configuration for this handler */
  private config: InterventionHandlerConfig;

  /** Map of all intervention requests by ID */
  private requests: Map<string, InterventionRequest>;

  /** Map of timeout handles by request ID */
  private timeouts: Map<string, ReturnType<typeof setTimeout>>;

  /** Subject for emitting intervention events */
  readonly intervention$: Subject<InterventionEvent>;

  /**
   * Creates a new InterventionHandler.
   *
   * @param config - Optional configuration overrides
   *
   * @example
   * ```typescript
   * // With defaults (5 minute timeout)
   * const handler = new InterventionHandler();
   *
   * // Custom timeout
   * const handler = new InterventionHandler({
   *   defaultTimeoutMs: 10 * 60 * 1000, // 10 minutes
   * });
   * ```
   */
  constructor(config?: Partial<InterventionHandlerConfig>) {
    this.config = { ...DEFAULT_INTERVENTION_CONFIG, ...config };
    this.requests = new Map();
    this.timeouts = new Map();
    this.intervention$ = new Subject<InterventionEvent>();
  }

  /**
   * Detect an intervention pattern in agent output.
   *
   * Analyzes the content of an AgentOutput to determine if the agent
   * is requesting user intervention. Returns a new InterventionRequest
   * if a pattern is detected, or null if no intervention is needed.
   *
   * Detection priority (first match wins):
   * 1. Choice prompts (numbered/bulleted options)
   * 2. Approval requests (permission, confirmation)
   * 3. Input requests (enter, provide, specify)
   * 4. Questions (sentences ending with ?)
   *
   * @param agentId - The ID of the agent producing the output
   * @param output - The agent output to analyze
   * @returns InterventionRequest if detected, null otherwise
   *
   * @example
   * ```typescript
   * const output: AgentOutput = {
   *   type: 'text',
   *   content: 'Should I proceed with the database migration?',
   *   timestamp: new Date()
   * };
   *
   * const request = handler.detectIntervention(agentId, output);
   * if (request) {
   *   console.log(`Detected ${request.type}: ${request.prompt}`);
   *   handler.queueIntervention(request);
   * }
   * ```
   */
  detectIntervention(
    agentId: AgentId,
    output: AgentOutput
  ): InterventionRequest | null {
    // Only analyze text output
    if (output.type !== "text" || !output.content) {
      return null;
    }

    const content = output.content;

    // Detect intervention type based on patterns
    const detectionResult = this.detectInterventionType(content);
    if (!detectionResult) {
      return null;
    }

    const { type, prompt, options } = detectionResult;

    // Create the intervention request
    return createInterventionRequest({
      agentId,
      type,
      prompt,
      options,
      context: this.extractContext(content, prompt),
    });
  }

  /**
   * Detect the type of intervention from content.
   * @internal
   */
  private detectInterventionType(
    content: string
  ): { type: InterventionType; prompt: string; options?: string[] } | null {
    // Check for choice patterns first (most specific)
    for (const pattern of INTERVENTION_PATTERNS.choice) {
      if (pattern.test(content)) {
        const options = this.extractOptions(content);
        if (options.length >= 2) {
          return {
            type: "choice",
            prompt: this.extractPrompt(content),
            options,
          };
        }
      }
    }

    // Check for approval patterns
    for (const pattern of INTERVENTION_PATTERNS.approval) {
      if (pattern.test(content)) {
        return {
          type: "approval",
          prompt: this.extractPrompt(content),
        };
      }
    }

    // Check for input patterns
    for (const pattern of INTERVENTION_PATTERNS.input) {
      if (pattern.test(content)) {
        return {
          type: "input",
          prompt: this.extractPrompt(content),
        };
      }
    }

    // Check for question patterns (least specific)
    for (const pattern of INTERVENTION_PATTERNS.question) {
      const match = content.match(pattern);
      if (match) {
        return {
          type: "question",
          prompt: match[1] || this.extractPrompt(content),
        };
      }
    }

    return null;
  }

  /**
   * Extract numbered or bulleted options from content.
   * @internal
   */
  private extractOptions(content: string): string[] {
    const options: string[] = [];

    // Try numbered options (1. Option, 2. Option, etc.)
    const numberedPattern = /(?:^|\n)\s*([1-9][\.\)])\s+(.+?)(?=\n|$)/gm;
    let match;
    while ((match = numberedPattern.exec(content)) !== null) {
      const optionText = match[2];
      if (optionText) {
        options.push(optionText.trim());
      }
    }

    if (options.length >= 2) {
      return options;
    }

    // Try bulleted options (- Option, * Option)
    const bulletedPattern = /(?:^|\n)\s*[-*]\s+(.+?)(?=\n|$)/gm;
    while ((match = bulletedPattern.exec(content)) !== null) {
      const optionText = match[1];
      if (optionText) {
        options.push(optionText.trim());
      }
    }

    return options;
  }

  /**
   * Extract the main prompt from content.
   * @internal
   */
  private extractPrompt(content: string): string {
    // Get the last meaningful line or paragraph
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      return content.trim();
    }

    // Find the last line that looks like a prompt
    for (let i = lines.length - 1; i >= 0; i--) {
      const currentLine = lines[i];
      if (!currentLine) continue;

      const line = currentLine.trim();
      // Skip option lines
      if (/^[1-9][\.\)]/.test(line) || /^[-*]\s/.test(line)) {
        continue;
      }
      // Return the first non-option line from the end
      if (line.length > 0) {
        return line;
      }
    }

    // Safe fallback - we already checked lines.length > 0 above
    const lastLine = lines[lines.length - 1];
    return lastLine ? lastLine.trim() : content.trim();
  }

  /**
   * Extract context around the prompt.
   * @internal
   */
  private extractContext(content: string, prompt: string): string {
    // Get content before the prompt as context
    const promptIndex = content.lastIndexOf(prompt);
    if (promptIndex > 0) {
      const context = content.slice(0, promptIndex).trim();
      // Limit context length
      if (context.length > 500) {
        return "..." + context.slice(-497);
      }
      return context;
    }
    return "";
  }

  /**
   * Queue an intervention request.
   *
   * Adds the request to the pending queue and sets up a timeout
   * if configured. Emits an intervention event for UI handling.
   *
   * @param request - The intervention request to queue
   *
   * @example
   * ```typescript
   * const request = handler.detectIntervention(agentId, output);
   * if (request) {
   *   handler.queueIntervention(request);
   *   // UI will be notified via intervention$ observable
   * }
   * ```
   */
  queueIntervention(request: InterventionRequest): void {
    // Check max pending per agent
    const agentPending = this.getPending(request.agentId);
    if (agentPending.length >= this.config.maxPendingPerAgent) {
      console.warn(
        `[intervention] Max pending interventions (${this.config.maxPendingPerAgent}) ` +
          `reached for agent ${request.agentId}. Ignoring new request.`
      );
      return;
    }

    // Store the request
    this.requests.set(request.id, request);

    // Set up timeout if enabled
    if (this.config.enableTimeouts) {
      const timeoutHandle = setTimeout(() => {
        this.timeout(request.id);
      }, this.config.defaultTimeoutMs);

      this.timeouts.set(request.id, timeoutHandle);
    }

    // Emit event for subscribers
    this.intervention$.next({
      agentId: request.agentId,
      request,
    });
  }

  /**
   * Respond to a pending intervention request.
   *
   * Marks the request as answered with the provided response.
   * Clears any pending timeout and emits an updated event.
   *
   * @param requestId - The ID of the intervention request
   * @param response - The user's response
   * @returns The updated InterventionRequest
   * @throws Error if the request is not found or not pending
   *
   * @example
   * ```typescript
   * // User approves the request
   * const updated = handler.respond(requestId, 'yes');
   * console.log(`Request ${updated.id} answered: ${updated.response}`);
   *
   * // Send the response back to the agent
   * agent.sendInput(updated.response);
   * ```
   */
  respond(requestId: string, response: string): InterventionRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Intervention request not found: ${requestId}`);
    }

    if (request.status !== "pending") {
      throw new Error(
        `Cannot respond to intervention with status: ${request.status}`
      );
    }

    // Clear timeout
    this.clearTimeout(requestId);

    // Update request
    const updatedRequest: InterventionRequest = {
      ...request,
      status: "answered" as InterventionStatus,
      response,
    };

    this.requests.set(requestId, updatedRequest);

    // Emit updated event
    this.intervention$.next({
      agentId: request.agentId,
      request: updatedRequest,
    });

    return updatedRequest;
  }

  /**
   * Mark an intervention request as timed out.
   *
   * Called automatically when the timeout expires, or can be
   * called manually to force a timeout. Emits an updated event.
   *
   * @param requestId - The ID of the intervention request
   *
   * @example
   * ```typescript
   * // Force timeout on a request
   * handler.timeout(requestId);
   * ```
   */
  timeout(requestId: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      return; // Already removed
    }

    if (request.status !== "pending") {
      return; // Already answered or timed out
    }

    // Clear any existing timeout handle
    this.clearTimeout(requestId);

    // Update request status
    const updatedRequest: InterventionRequest = {
      ...request,
      status: "timeout" as InterventionStatus,
    };

    this.requests.set(requestId, updatedRequest);

    // Emit updated event
    this.intervention$.next({
      agentId: request.agentId,
      request: updatedRequest,
    });

    console.warn(
      `[intervention] Request ${requestId} timed out after ${this.config.defaultTimeoutMs}ms`
    );
  }

  /**
   * Get all pending intervention requests.
   *
   * Optionally filter by agent ID to get only requests from
   * a specific agent.
   *
   * @param agentId - Optional agent ID filter
   * @returns Array of pending intervention requests
   *
   * @example
   * ```typescript
   * // Get all pending requests
   * const allPending = handler.getPending();
   *
   * // Get pending requests for a specific agent
   * const agentPending = handler.getPending(agentId);
   *
   * // Show intervention UI if any are pending
   * if (allPending.length > 0) {
   *   showInterventionPanel(allPending);
   * }
   * ```
   */
  getPending(agentId?: AgentId): InterventionRequest[] {
    const pending: InterventionRequest[] = [];

    for (const request of this.requests.values()) {
      if (request.status !== "pending") {
        continue;
      }

      if (agentId !== undefined && request.agentId !== agentId) {
        continue;
      }

      pending.push(request);
    }

    // Sort by timestamp (oldest first)
    return pending.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  /**
   * Get an intervention request by ID.
   *
   * @param requestId - The intervention request ID
   * @returns The intervention request, or undefined if not found
   *
   * @example
   * ```typescript
   * const request = handler.getById(requestId);
   * if (request && request.status === 'pending') {
   *   showInterventionDialog(request);
   * }
   * ```
   */
  getById(requestId: string): InterventionRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Check if an agent has any pending interventions.
   *
   * @param agentId - The agent ID to check
   * @returns True if the agent has pending interventions
   *
   * @example
   * ```typescript
   * if (handler.hasPending(agentId)) {
   *   // Show "waiting for input" indicator in UI
   *   setAgentStatus(agentId, 'waiting');
   * }
   * ```
   */
  hasPending(agentId: AgentId): boolean {
    for (const request of this.requests.values()) {
      if (request.agentId === agentId && request.status === "pending") {
        return true;
      }
    }
    return false;
  }

  /**
   * Cancel a pending intervention request.
   *
   * Removes the request from the queue and clears any timeout.
   * Does not emit an event.
   *
   * @param requestId - The intervention request ID to cancel
   * @returns True if the request was found and cancelled
   *
   * @example
   * ```typescript
   * // Cancel if agent is stopped
   * handler.cancel(requestId);
   * ```
   */
  cancel(requestId: string): boolean {
    const request = this.requests.get(requestId);
    if (!request) {
      return false;
    }

    this.clearTimeout(requestId);
    this.requests.delete(requestId);
    return true;
  }

  /**
   * Cancel all pending interventions for an agent.
   *
   * Useful when an agent is stopped or encounters an error.
   *
   * @param agentId - The agent ID
   * @returns Number of cancelled requests
   *
   * @example
   * ```typescript
   * // When agent stops, cancel all pending interventions
   * const cancelled = handler.cancelAllForAgent(agentId);
   * console.log(`Cancelled ${cancelled} pending interventions`);
   * ```
   */
  cancelAllForAgent(agentId: AgentId): number {
    let cancelled = 0;

    for (const [id, request] of this.requests.entries()) {
      if (request.agentId === agentId && request.status === "pending") {
        this.clearTimeout(id);
        this.requests.delete(id);
        cancelled++;
      }
    }

    return cancelled;
  }

  /**
   * Get statistics about interventions.
   *
   * @returns Object with intervention statistics
   */
  getStats(): {
    total: number;
    pending: number;
    answered: number;
    timedOut: number;
  } {
    let pending = 0;
    let answered = 0;
    let timedOut = 0;

    for (const request of this.requests.values()) {
      switch (request.status) {
        case "pending":
          pending++;
          break;
        case "answered":
          answered++;
          break;
        case "timeout":
          timedOut++;
          break;
      }
    }

    return {
      total: this.requests.size,
      pending,
      answered,
      timedOut,
    };
  }

  /**
   * Clear all intervention requests and timeouts.
   *
   * Use for cleanup during shutdown.
   */
  clear(): void {
    // Clear all timeouts
    for (const timeoutHandle of this.timeouts.values()) {
      clearTimeout(timeoutHandle);
    }
    this.timeouts.clear();

    // Clear all requests
    this.requests.clear();
  }

  /**
   * Complete the handler and clean up resources.
   *
   * Completes the intervention$ Subject and clears all state.
   */
  dispose(): void {
    this.clear();
    this.intervention$.complete();
  }

  /**
   * Clear a timeout for a request.
   * @internal
   */
  private clearTimeout(requestId: string): void {
    const timeoutHandle = this.timeouts.get(requestId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.timeouts.delete(requestId);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new InterventionHandler with optional configuration.
 *
 * @param config - Optional configuration overrides
 * @returns A new InterventionHandler instance
 *
 * @example
 * ```typescript
 * // With defaults
 * const handler = createInterventionHandler();
 *
 * // With custom config
 * const handler = createInterventionHandler({
 *   defaultTimeoutMs: 10 * 60 * 1000,
 *   maxPendingPerAgent: 5,
 * });
 * ```
 */
export function createInterventionHandler(
  config?: Partial<InterventionHandlerConfig>
): InterventionHandler {
  return new InterventionHandler(config);
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type { InterventionRequest, InterventionType, InterventionStatus } from "./types.js";
