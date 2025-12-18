/**
 * Chat Handler
 *
 * Central input processor that orchestrates all user interactions.
 * This is the main entry point for processing user input in the REPL.
 *
 * Responsibilities:
 * - Process incoming user input (slash commands and natural language)
 * - Route slash commands to the Command Router
 * - Route natural language to the Intent Classifier
 * - Execute classified intents and return formatted responses
 * - Maintain conversation context across interactions
 */

import type { Subscription } from "rxjs";
import type {
  ConversationContext,
  ChatResponse,
  ChatMessage,
  UserIntent,
  UIMode,
  AutocompleteResult,
} from "./types.js";
import {
  createDefaultContext,
  createMessageResponse,
  createErrorResponse,
} from "./types.js";
import type { SessionId, FeatureId, AgentId } from "../../core/types/id.js";
import type { CommandContext, CommandResult } from "../../core/commands/types.js";
import { CommandRouter, commandRouter } from "../../core/commands/router.js";
import { IntentClassifier, intentClassifier } from "./intent-classifier.js";
import { AutocompleteEngine, createAutocompleteEngine } from "./autocomplete.js";
import { isSlashCommand, isEmptyInput } from "./patterns.js";
import { eventBus, EventBus } from "../../infra/events/event-bus.js";
import {
  AgentManager,
  agentManager as globalAgentManager,
} from "../../core/agent/manager.js";
import {
  InterventionHandler,
  createInterventionHandler,
  type InterventionEvent,
} from "../../core/agent/intervention.js";
import { AgentSpawner, createAgentSpawner } from "../../core/agent/spawner.js";
import type { InterventionRequest, ManagedAgent } from "../../core/agent/types.js";
import { createEvent } from "../../infra/events/index.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Chat handler configuration.
 */
export interface ChatHandlerConfig {
  /** Maximum messages to keep in context */
  maxRecentMessages: number;
  /** Project root path */
  projectPath: string;
  /** Whether Squad is initialized */
  isInitialized: boolean;
}

const defaultConfig: ChatHandlerConfig = {
  maxRecentMessages: 10,
  projectPath: process.cwd(),
  isInitialized: false,
};

// ============================================================================
// Chat Handler
// ============================================================================

/**
 * Chat Handler
 *
 * Central processor for all user input in Claude Squad.
 * Orchestrates command routing, intent classification, and context management.
 *
 * @example
 * ```typescript
 * const handler = new ChatHandler({ projectPath: "/my/project" });
 *
 * // Process user input
 * const response = await handler.processInput("build a login page");
 * console.log(response.content); // "Starting feature: a login page"
 *
 * // Process slash command
 * const response2 = await handler.processInput("/help");
 * console.log(response2.content); // Shows help text
 * ```
 */
export class ChatHandler {
  private config: ChatHandlerConfig;
  private context: ConversationContext;
  private router: CommandRouter;
  private classifier: IntentClassifier;
  private autocomplete: AutocompleteEngine;
  private events: EventBus;

  // Agent system integration
  private agentManager: AgentManager;
  private interventionHandler: InterventionHandler;
  private agentSpawner: AgentSpawner;
  private interventionSubscription: Subscription | null = null;

  // Pending intervention requests awaiting user response
  private pendingInterventions: Map<string, InterventionRequest> = new Map();

  constructor(
    config: Partial<ChatHandlerConfig> = {},
    deps?: {
      router?: CommandRouter;
      classifier?: IntentClassifier;
      autocomplete?: AutocompleteEngine;
      events?: EventBus;
      agentManager?: AgentManager;
      interventionHandler?: InterventionHandler;
      agentSpawner?: AgentSpawner;
    }
  ) {
    this.config = { ...defaultConfig, ...config };
    this.context = createDefaultContext(this.config.projectPath);
    this.context.isInitialized = this.config.isInitialized;

    // Use injected dependencies or defaults
    this.router = deps?.router ?? commandRouter;
    this.classifier = deps?.classifier ?? intentClassifier;
    this.autocomplete =
      deps?.autocomplete ?? createAutocompleteEngine(this.router);
    this.events = deps?.events ?? eventBus;

    // Agent system dependencies
    this.agentManager = deps?.agentManager ?? globalAgentManager;
    this.interventionHandler = deps?.interventionHandler ?? createInterventionHandler();
    this.agentSpawner = deps?.agentSpawner ?? createAgentSpawner();

    // Subscribe to intervention events
    this.setupInterventionSubscription();
  }

  /**
   * Set up subscription to intervention events from agents.
   * @private
   */
  private setupInterventionSubscription(): void {
    this.interventionSubscription = this.interventionHandler.intervention$.subscribe(
      (event: InterventionEvent) => {
        this.handleInterventionEvent(event);
      }
    );
  }

  /**
   * Handle intervention events from agents.
   * @private
   */
  private handleInterventionEvent(event: InterventionEvent): void {
    const { agentId, request } = event;

    if (request.status === "pending") {
      // Store pending intervention
      this.pendingInterventions.set(request.id, request);

      // Emit event for UI notification
      this.events.emit(
        createEvent({
          type: "AGENT_INTERVENTION_REQUESTED",
          agentId,
          requestId: request.id,
          interventionType: request.type,
          prompt: request.prompt,
          options: request.options,
        })
      );
    } else {
      // Intervention was answered or timed out - remove from pending
      this.pendingInterventions.delete(request.id);

      if (request.status === "answered" && request.response) {
        // Emit response event
        this.events.emit(
          createEvent({
            type: "AGENT_INTERVENTION_RESPONDED",
            agentId,
            requestId: request.id,
            response: request.response,
          })
        );
      }
    }
  }

  /**
   * Process user input and return a response.
   *
   * @param input - Raw user input
   * @returns Chat response with content and actions
   */
  async processInput(input: string): Promise<ChatResponse> {
    // Emit input event
    this.events.emit({
      type: "CHAT_INPUT",
      input,
      timestamp: Date.now(),
    });

    // Handle empty input
    if (isEmptyInput(input)) {
      return createMessageResponse("");
    }

    // Add user message to context
    this.addMessage("user", input);

    let response: ChatResponse;

    try {
      // Route based on input type
      if (isSlashCommand(input)) {
        response = await this.processCommand(input);
      } else {
        response = await this.processNaturalLanguage(input);
      }
    } catch (error) {
      response = createErrorResponse(
        error instanceof Error ? error.message : "An error occurred"
      );
    }

    // Add assistant response to context
    this.addMessage("assistant", response.content, {
      intent: response.data as UserIntent | undefined,
    });

    // Emit chat response event
    this.events.emit({
      type: "CHAT_RESPONSE",
      input,
      response: {
        content: response.content,
        type: response.type,
        success: response.success,
      },
      timestamp: Date.now(),
    });

    return response;
  }

  /**
   * Process a slash command.
   */
  private async processCommand(input: string): Promise<ChatResponse> {
    const commandContext = this.createCommandContext();
    const result = await this.router.route(input, commandContext);

    return this.commandResultToResponse(result);
  }

  /**
   * Process natural language input.
   */
  private async processNaturalLanguage(input: string): Promise<ChatResponse> {
    // Classify the intent
    const classification = await this.classifier.classify(input, this.context);

    // Emit intent classified event
    this.events.emit({
      type: "INTENT_CLASSIFIED",
      input,
      result: {
        intentType: classification.intent.type,
        method: classification.method,
        classificationTimeMs: classification.classificationTimeMs,
        cached: classification.cached,
      },
      timestamp: Date.now(),
    });

    // Execute based on intent type
    return this.executeIntent(classification.intent);
  }

  /**
   * Execute a classified intent.
   */
  private async executeIntent(intent: UserIntent): Promise<ChatResponse> {
    switch (intent.type) {
      case "command":
        return this.executeCommandIntent(intent);

      case "question":
        return this.executeQuestionIntent(intent);

      case "message_agent":
        return this.executeMessageAgentIntent(intent);

      case "feedback":
        return this.executeFeedbackIntent(intent);

      case "clarification":
        return this.executeClarificationIntent(intent);

      case "unknown":
        return this.executeUnknownIntent(intent);

      default:
        return createErrorResponse("Unknown intent type");
    }
  }

  /**
   * Execute a command intent.
   */
  private async executeCommandIntent(
    intent: UserIntent & { type: "command" }
  ): Promise<ChatResponse> {
    // Build command string
    const commandStr = `/${intent.command}${
      intent.args.length > 0 ? " " + intent.args.join(" ") : ""
    }`;

    // Route to command handler
    const commandContext = this.createCommandContext();
    const result = await this.router.route(commandStr, commandContext);

    return this.commandResultToResponse(result, intent);
  }

  /**
   * Execute a question intent.
   */
  private async executeQuestionIntent(
    intent: UserIntent & { type: "question" }
  ): Promise<ChatResponse> {
    // For now, provide basic help based on topic
    // In the future, this could use Claude to generate contextual answers
    const topic = intent.topic;

    if (topic) {
      // Direct to relevant help
      const helpCommands: Record<string, string> = {
        agents: "Use /agents to manage agents. See /help agents for details.",
        skills: "Use /skills to manage skills. See /help skills for details.",
        workflows: "Use /workflows to manage workflows. See /help workflows for details.",
        sessions: "Use /sessions to manage sessions. See /help sessions for details.",
        features: "Use /feature <description> to start a new feature.",
        integrations: "Use /integrations to manage integrations.",
        config: "Use /config to manage configuration.",
        commands: "Use /help to see all available commands.",
      };

      if (helpCommands[topic]) {
        return {
          content: helpCommands[topic]!,
          type: "message",
          success: true,
          suggestions: [`/help ${topic}`, "/help"],
        };
      }
    }

    // Generic response for questions
    return {
      content: `I understand you're asking about: "${intent.question}"\n\nTry /help for available commands, or rephrase your question.`,
      type: "message",
      success: true,
      suggestions: ["/help"],
    };
  }

  /**
   * Execute a message agent intent.
   *
   * Sends a message to a running agent. The message can be:
   * 1. A response to a pending intervention request
   * 2. Direct input to the agent's stdin
   */
  private async executeMessageAgentIntent(
    intent: UserIntent & { type: "message_agent" }
  ): Promise<ChatResponse> {
    // Check if we have an active session
    if (!this.context.sessionId) {
      return createErrorResponse(
        "No active session. Start a feature first with /feature <description>",
        ["/feature", "/sessions"]
      );
    }

    const { agentIdentifier, message } = intent;

    // Find the target agent
    const targetAgent = this.findAgentByIdentifier(agentIdentifier);

    if (!targetAgent) {
      // No agent found with that identifier
      const runningAgents = this.agentManager.getRunningAgents();
      if (runningAgents.length === 0) {
        return createErrorResponse(
          "No agents are currently running. Start a feature first.",
          ["/feature", "/agents"]
        );
      }

      const agentNames = runningAgents
        .map((a) => a.agent.name || a.agent.id)
        .join(", ");
      return createErrorResponse(
        `Agent "${agentIdentifier}" not found. Running agents: ${agentNames}`,
        ["/agents"]
      );
    }

    // Check if agent has a running process
    if (!targetAgent.process) {
      return createErrorResponse(
        `Agent "${targetAgent.agent.name}" is not currently running.`,
        ["/agents"]
      );
    }

    // Check if there's a pending intervention for this agent
    const pendingIntervention = this.findPendingInterventionForAgent(
      targetAgent.agent.id as string
    );

    if (pendingIntervention) {
      // Respond to the pending intervention
      this.interventionHandler.respond(pendingIntervention.id, message);

      // Remove from pending map
      this.pendingInterventions.delete(pendingIntervention.id);

      return {
        content: `Responded to ${targetAgent.agent.name}'s ${pendingIntervention.type}: "${message}"`,
        type: "agent",
        success: true,
        data: {
          agentId: targetAgent.agent.id,
          agentName: targetAgent.agent.name,
          interventionId: pendingIntervention.id,
          response: message,
        },
      };
    }

    // No pending intervention - try to send direct input via stdin
    const processId = targetAgent.process.id;
    const sent = this.agentSpawner.sendInput(processId, message);

    if (sent) {
      return {
        content: `Message sent to ${targetAgent.agent.name}: "${message}"`,
        type: "agent",
        success: true,
        data: {
          agentId: targetAgent.agent.id,
          agentName: targetAgent.agent.name,
          message,
        },
      };
    } else {
      return createErrorResponse(
        `Failed to send message to ${targetAgent.agent.name}. The agent may not accept input at this time.`,
        ["/agents"]
      );
    }
  }

  /**
   * Find an agent by identifier (name, ID, or index).
   * @private
   */
  private findAgentByIdentifier(identifier: string): ManagedAgent | undefined {
    const runningAgents = this.agentManager.getRunningAgents();

    // Try to match by exact ID
    const byId = runningAgents.find(
      (a) => a.agent.id === identifier
    );
    if (byId) return byId;

    // Try to match by name (case-insensitive)
    const lowerIdentifier = identifier.toLowerCase();
    const byName = runningAgents.find(
      (a) => a.agent.name?.toLowerCase() === lowerIdentifier
    );
    if (byName) return byName;

    // Try to match by partial name
    const byPartialName = runningAgents.find(
      (a) => a.agent.name?.toLowerCase().includes(lowerIdentifier)
    );
    if (byPartialName) return byPartialName;

    // Try to match by numeric index (1-based for user friendliness)
    const index = parseInt(identifier, 10);
    if (!isNaN(index) && index >= 1 && index <= runningAgents.length) {
      return runningAgents[index - 1];
    }

    return undefined;
  }

  /**
   * Find a pending intervention for a specific agent.
   * @private
   */
  private findPendingInterventionForAgent(
    agentId: string
  ): InterventionRequest | undefined {
    // Check if this agent has pending interventions via the handler
    const typedAgentId = agentId as AgentId;
    if (this.interventionHandler.hasPending(typedAgentId)) {
      const pending = this.interventionHandler.getPending(typedAgentId);
      if (pending.length > 0) {
        return pending[0];
      }
    }
    return undefined;
  }

  /**
   * Execute a feedback intent.
   */
  private executeFeedbackIntent(
    intent: UserIntent & { type: "feedback" }
  ): ChatResponse {
    const responses: Record<string, string> = {
      positive: "Thanks for the feedback! Glad I could help.",
      negative: "I'm sorry that wasn't helpful. How can I improve?",
      neutral: "Thanks for the feedback.",
    };

    return createMessageResponse(responses[intent.sentiment] || "Thanks!");
  }

  /**
   * Execute a clarification intent.
   */
  private executeClarificationIntent(
    intent: UserIntent & { type: "clarification" }
  ): ChatResponse {
    const options = intent.possibleIntents
      .map((i, idx) => {
        if (i.type === "command") {
          return `${idx + 1}. Run command: /${i.command}${i.args.length > 0 ? " " + i.args.join(" ") : ""}`;
        }
        return `${idx + 1}. ${i.type}`;
      })
      .join("\n");

    return {
      content: `I'm not sure what you mean by "${intent.ambiguousInput}".\n\nDid you mean:\n${options}\n\nPlease clarify or try a slash command.`,
      type: "question",
      success: true,
      suggestions: intent.possibleIntents
        .filter((i) => i.type === "command")
        .map((i) => `/${(i as any).command}`),
    };
  }

  /**
   * Execute an unknown intent.
   */
  private executeUnknownIntent(
    intent: UserIntent & { type: "unknown" }
  ): ChatResponse {
    return createErrorResponse(
      `${intent.reason}\n\nType /help to see available commands.`,
      ["/help"]
    );
  }

  /**
   * Convert command result to chat response.
   */
  private commandResultToResponse(
    result: CommandResult,
    intent?: UserIntent
  ): ChatResponse {
    return {
      content: result.success
        ? result.message || "Command executed successfully"
        : result.error || "Command failed",
      type: result.success ? "command" : "error",
      success: result.success,
      suggestions: result.suggestions,
      data: intent || result.data,
    };
  }

  /**
   * Create command context from current state.
   */
  private createCommandContext(): CommandContext {
    return {
      sessionId: this.context.sessionId as string | undefined,
      cwd: this.context.projectPath,
      isTui: true,
      services: {
        emit: (event) => this.events.emit(event as any),
      },
    };
  }

  /**
   * Add a message to conversation history.
   */
  private addMessage(
    role: ChatMessage["role"],
    content: string,
    metadata?: ChatMessage["metadata"]
  ): void {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    this.context.recentMessages.push(message);

    // Trim to max size
    if (this.context.recentMessages.length > this.config.maxRecentMessages) {
      this.context.recentMessages = this.context.recentMessages.slice(
        -this.config.maxRecentMessages
      );
    }

    this.context.lastUpdated = new Date();
    // Note: Context updates are internal and don't need event emission
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  /**
   * Get the current conversation context.
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Set the active session.
   */
  setSession(sessionId: SessionId | undefined): void {
    this.context.sessionId = sessionId;
    this.context.lastUpdated = new Date();
  }

  /**
   * Set the active feature.
   */
  setFeature(featureId: FeatureId | undefined): void {
    this.context.activeFeature = featureId;
    this.context.lastUpdated = new Date();
  }

  /**
   * Set the focused agent.
   */
  setFocusedAgent(agentId: AgentId | undefined): void {
    this.context.focusedAgent = agentId;
    this.context.lastUpdated = new Date();
  }

  /**
   * Set the UI mode.
   */
  setMode(mode: UIMode): void {
    this.context.mode = mode;
    this.context.lastUpdated = new Date();
  }

  /**
   * Set initialization status.
   */
  setInitialized(isInitialized: boolean): void {
    this.context.isInitialized = isInitialized;
    this.context.lastUpdated = new Date();
  }

  /**
   * Clear conversation context.
   */
  clearContext(): void {
    this.context = createDefaultContext(this.config.projectPath);
    this.context.isInitialized = this.config.isInitialized;
  }

  /**
   * Restore context from persisted data.
   */
  restoreContext(context: Partial<ConversationContext>): void {
    this.context = {
      ...this.context,
      ...context,
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // Autocomplete
  // ============================================================================

  /**
   * Get autocomplete suggestions for input.
   */
  async getAutocompleteSuggestions(
    input: string,
    cursorPosition?: number
  ): Promise<AutocompleteResult> {
    return this.autocomplete.getSuggestions(input, this.context, cursorPosition);
  }

  // ============================================================================
  // Command Registration
  // ============================================================================

  /**
   * Get the command router for registration.
   */
  getRouter(): CommandRouter {
    return this.router;
  }

  // ============================================================================
  // Agent System
  // ============================================================================

  /**
   * Get all currently running agents.
   *
   * @returns Array of managed agents that have an active process
   *
   * @example
   * ```typescript
   * const running = handler.getRunningAgents();
   * running.forEach(agent => {
   *   console.log(`${agent.agent.name}: ${agent.process?.state}`);
   * });
   * ```
   */
  getRunningAgents(): ManagedAgent[] {
    return this.agentManager.getRunningAgents();
  }

  /**
   * Get all pending intervention requests.
   *
   * @returns Array of pending intervention requests awaiting user response
   */
  getPendingInterventions(): InterventionRequest[] {
    return Array.from(this.pendingInterventions.values());
  }

  /**
   * Respond to a pending intervention request.
   *
   * @param requestId - The ID of the intervention request
   * @param response - The user's response
   * @returns True if the response was sent successfully
   */
  respondToIntervention(requestId: string, response: string): boolean {
    const intervention = this.pendingInterventions.get(requestId);
    if (!intervention) {
      return false;
    }

    this.interventionHandler.respond(requestId, response);
    this.pendingInterventions.delete(requestId);
    return true;
  }

  /**
   * Check if there are any pending intervention requests.
   */
  hasPendingInterventions(): boolean {
    return this.pendingInterventions.size > 0;
  }

  /**
   * Get the agent manager for direct access.
   *
   * @returns The AgentManager instance
   */
  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  /**
   * Get the agent spawner for direct access.
   *
   * @returns The AgentSpawner instance
   */
  getAgentSpawner(): AgentSpawner {
    return this.agentSpawner;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Check if input is a slash command.
   */
  isCommand(input: string): boolean {
    return isSlashCommand(input);
  }

  /**
   * Get the classifier for testing/configuration.
   */
  getClassifier(): IntentClassifier {
    return this.classifier;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources when the handler is no longer needed.
   *
   * Unsubscribes from intervention events and cleans up pending state.
   * Call this when shutting down or switching sessions.
   */
  dispose(): void {
    // Unsubscribe from intervention events
    if (this.interventionSubscription) {
      this.interventionSubscription.unsubscribe();
      this.interventionSubscription = null;
    }

    // Clear pending interventions
    this.pendingInterventions.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global chat handler instance.
 */
let globalChatHandler: ChatHandler | undefined;

/**
 * Get or create the global chat handler.
 */
export function getChatHandler(config?: Partial<ChatHandlerConfig>): ChatHandler {
  if (!globalChatHandler) {
    globalChatHandler = new ChatHandler(config);
  }
  return globalChatHandler;
}

/**
 * Create a new chat handler instance.
 */
export function createChatHandler(
  config?: Partial<ChatHandlerConfig>,
  deps?: {
    router?: CommandRouter;
    classifier?: IntentClassifier;
    autocomplete?: AutocompleteEngine;
    events?: EventBus;
    agentManager?: AgentManager;
    interventionHandler?: InterventionHandler;
    agentSpawner?: AgentSpawner;
  }
): ChatHandler {
  return new ChatHandler(config, deps);
}

/**
 * Reset the global chat handler.
 */
export function resetChatHandler(): void {
  globalChatHandler = undefined;
}
