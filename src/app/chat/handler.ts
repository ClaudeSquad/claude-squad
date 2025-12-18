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
  createNavigationResponse,
} from "./types.js";
import type { SessionId, FeatureId, AgentId } from "../../core/types/id.js";
import type { CommandContext, CommandResult } from "../../core/commands/types.js";
import { CommandRouter, commandRouter } from "../../core/commands/router.js";
import { IntentClassifier, intentClassifier } from "./intent-classifier.js";
import { AutocompleteEngine, createAutocompleteEngine } from "./autocomplete.js";
import { isSlashCommand, isEmptyInput } from "./patterns.js";
import { eventBus, EventBus } from "../../infra/events/event-bus.js";

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

  constructor(
    config: Partial<ChatHandlerConfig> = {},
    deps?: {
      router?: CommandRouter;
      classifier?: IntentClassifier;
      autocomplete?: AutocompleteEngine;
      events?: EventBus;
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
      type: "CHAT_INPUT" as any,
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

    // Emit response event
    this.events.emit({
      type: "CHAT_RESPONSE" as any,
      response,
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

    // Emit classification event
    this.events.emit({
      type: "INTENT_CLASSIFIED" as any,
      result: classification,
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

    // TODO: Implement actual agent messaging when agent system is ready
    // For now, acknowledge the intent
    return {
      content: `Message to ${intent.agentIdentifier}: "${intent.message}"\n\n(Agent messaging will be available once agents are spawned)`,
      type: "agent",
      success: true,
      data: {
        agentIdentifier: intent.agentIdentifier,
        message: intent.message,
      },
    };
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

    // Emit context update event
    this.events.emit({
      type: "CONTEXT_UPDATED" as any,
      context: this.context,
      timestamp: Date.now(),
    });
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
