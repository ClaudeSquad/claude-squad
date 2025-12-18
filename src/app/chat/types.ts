/**
 * Chat System Types
 *
 * Core type definitions for the conversational interface.
 * This module defines the foundational types used across the chat handler,
 * intent classifier, and autocomplete systems.
 */

import type { SessionId, FeatureId, AgentId } from "../../core/types/id.js";

// ============================================================================
// UI Modes
// ============================================================================

/**
 * Current UI mode determines context for intent classification
 * and autocomplete suggestions.
 */
export type UIMode = "welcome" | "dashboard" | "feature" | "agent-detail" | "chat";

// ============================================================================
// Conversation Context
// ============================================================================

/**
 * Message in conversation history.
 */
export interface ChatMessage {
  /** Message role */
  role: "user" | "assistant" | "system";
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Optional metadata */
  metadata?: {
    /** Command that was executed (if any) */
    command?: string;
    /** Intent that was classified (if natural language) */
    intent?: UserIntent;
  };
}

/**
 * Conversation context tracks state across interactions.
 * Used by intent classifier to resolve ambiguity and provide defaults.
 */
export interface ConversationContext {
  /** Currently active session (if any) */
  sessionId?: SessionId;
  /** Feature being worked on (if any) */
  activeFeature?: FeatureId;
  /** Agent user is currently interacting with (if any) */
  focusedAgent?: AgentId;
  /** Last N messages for context (default: 10) */
  recentMessages: ChatMessage[];
  /** Current UI mode */
  mode: UIMode;
  /** Project root path */
  projectPath: string;
  /** Whether Squad is initialized for this project */
  isInitialized: boolean;
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Create a default conversation context.
 */
export function createDefaultContext(projectPath: string): ConversationContext {
  return {
    recentMessages: [],
    mode: "welcome",
    projectPath,
    isInitialized: false,
    lastUpdated: new Date(),
  };
}

// ============================================================================
// User Intents
// ============================================================================

/**
 * Base intent properties.
 */
interface BaseIntent {
  /** Confidence score (0-1) */
  confidence: number;
  /** Original input text */
  originalInput: string;
}

/**
 * Intent to execute a slash command.
 */
export interface CommandIntent extends BaseIntent {
  type: "command";
  /** Command name (without slash) */
  command: string;
  /** Command arguments */
  args: string[];
}

/**
 * Intent to ask a question.
 */
export interface QuestionIntent extends BaseIntent {
  type: "question";
  /** The question being asked */
  question: string;
  /** Topic of the question (if detected) */
  topic?: string;
}

/**
 * Intent to message a specific agent.
 */
export interface MessageAgentIntent extends BaseIntent {
  type: "message_agent";
  /** Agent identifier or name */
  agentIdentifier: string;
  /** Message to send */
  message: string;
}

/**
 * Intent providing feedback.
 */
export interface FeedbackIntent extends BaseIntent {
  type: "feedback";
  /** Feedback sentiment */
  sentiment: "positive" | "negative" | "neutral";
  /** Feedback content */
  content: string;
}

/**
 * Intent requiring clarification.
 */
export interface ClarificationIntent extends BaseIntent {
  type: "clarification";
  /** What needs clarification */
  ambiguousInput: string;
  /** Possible interpretations */
  possibleIntents: UserIntent[];
}

/**
 * Unknown intent - couldn't classify.
 */
export interface UnknownIntent extends BaseIntent {
  type: "unknown";
  /** Reason classification failed */
  reason: string;
}

/**
 * Discriminated union of all intent types.
 */
export type UserIntent =
  | CommandIntent
  | QuestionIntent
  | MessageAgentIntent
  | FeedbackIntent
  | ClarificationIntent
  | UnknownIntent;

/**
 * Intent type discriminator values.
 */
export type IntentType = UserIntent["type"];

// ============================================================================
// Chat Response
// ============================================================================

/**
 * Response type determines how the response is displayed.
 */
export type ChatResponseType =
  | "message"      // Plain text message
  | "command"      // Command execution result
  | "error"        // Error message
  | "question"     // Question that needs user input
  | "navigation"   // Navigate to a screen
  | "agent";       // Agent communication

/**
 * Action to perform after displaying the response.
 */
export interface ChatAction {
  /** Action type */
  type: "navigate" | "execute" | "prompt" | "focus_agent";
  /** Action payload */
  payload: unknown;
}

/**
 * Structured chat response.
 */
export interface ChatResponse {
  /** Response content */
  content: string;
  /** Response type */
  type: ChatResponseType;
  /** Whether the operation succeeded */
  success: boolean;
  /** Actions to perform */
  actions?: ChatAction[];
  /** Suggestions for next steps */
  suggestions?: string[];
  /** Related data */
  data?: unknown;
}

/**
 * Create a simple message response.
 */
export function createMessageResponse(content: string): ChatResponse {
  return {
    content,
    type: "message",
    success: true,
  };
}

/**
 * Create an error response.
 */
export function createErrorResponse(error: string, suggestions?: string[]): ChatResponse {
  return {
    content: error,
    type: "error",
    success: false,
    suggestions,
  };
}

/**
 * Create a navigation response.
 */
export function createNavigationResponse(
  screen: string,
  message?: string
): ChatResponse {
  return {
    content: message || `Navigating to ${screen}...`,
    type: "navigation",
    success: true,
    actions: [
      {
        type: "navigate",
        payload: { screen },
      },
    ],
  };
}

// ============================================================================
// Classification Result
// ============================================================================

/**
 * Result from intent classification.
 */
export interface ClassificationResult {
  /** Classified intent */
  intent: UserIntent;
  /** Classification method used */
  method: "pattern" | "keyword" | "claude" | "fallback";
  /** Time taken to classify (ms) */
  classificationTimeMs: number;
  /** Whether the result was cached */
  cached: boolean;
}

// ============================================================================
// Autocomplete Types
// ============================================================================

/**
 * Argument hint for command autocomplete.
 */
export interface ArgumentHint {
  /** Argument name */
  name: string;
  /** Argument type */
  type: "string" | "number" | "boolean" | "array";
  /** Description */
  description: string;
  /** Whether required */
  required: boolean;
  /** Example values */
  examples?: string[];
}

/**
 * Autocomplete suggestion.
 */
export interface Suggestion {
  /** Suggestion text */
  text: string;
  /** Display text (may differ from text) */
  displayText: string;
  /** Short description */
  description: string;
  /** Suggestion type */
  type: "command" | "subcommand" | "argument" | "value";
  /** Match score (higher = better match) */
  score: number;
  /** Argument hints (for commands) */
  argumentHints?: ArgumentHint[];
  /** Icon or symbol */
  icon?: string;
}

/**
 * Autocomplete result.
 */
export interface AutocompleteResult {
  /** Matching suggestions */
  suggestions: Suggestion[];
  /** The prefix being completed */
  prefix: string;
  /** Position where completion starts */
  startPosition: number;
  /** Whether more suggestions are available */
  hasMore: boolean;
}

// ============================================================================
// Chat Handler Events
// ============================================================================

/**
 * Events emitted by the chat system.
 */
export type ChatEventType =
  | "CHAT_INPUT"
  | "CHAT_RESPONSE"
  | "INTENT_CLASSIFIED"
  | "COMMAND_EXECUTED"
  | "CONTEXT_UPDATED"
  | "AUTOCOMPLETE_TRIGGERED";

/**
 * Chat input event payload.
 */
export interface ChatInputEvent {
  type: "CHAT_INPUT";
  input: string;
  timestamp: number;
}

/**
 * Chat response event payload.
 */
export interface ChatResponseEvent {
  type: "CHAT_RESPONSE";
  response: ChatResponse;
  timestamp: number;
}

/**
 * Intent classified event payload.
 */
export interface IntentClassifiedEvent {
  type: "INTENT_CLASSIFIED";
  result: ClassificationResult;
  timestamp: number;
}

/**
 * Context updated event payload.
 */
export interface ContextUpdatedEvent {
  type: "CONTEXT_UPDATED";
  context: ConversationContext;
  timestamp: number;
}
