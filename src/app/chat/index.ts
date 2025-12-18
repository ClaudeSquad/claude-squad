/**
 * Chat System
 *
 * Central conversational interface for Claude Squad.
 * Exports all components needed for the REPL experience.
 */

// Types
export type {
  UIMode,
  ChatMessage,
  ConversationContext,
  UserIntent,
  IntentType,
  CommandIntent,
  QuestionIntent,
  MessageAgentIntent,
  FeedbackIntent,
  ClarificationIntent,
  UnknownIntent,
  ChatResponseType,
  ChatAction,
  ChatResponse,
  ClassificationResult,
  ArgumentHint,
  Suggestion,
  AutocompleteResult,
  ChatEventType,
  ChatInputEvent,
  ChatResponseEvent,
  IntentClassifiedEvent,
  ContextUpdatedEvent,
} from "./types.js";

// Type utilities
export {
  createDefaultContext,
  createMessageResponse,
  createErrorResponse,
  createNavigationResponse,
} from "./types.js";

// Chat Handler
export type { ChatHandlerConfig } from "./handler.js";
export {
  ChatHandler,
  getChatHandler,
  createChatHandler,
  resetChatHandler,
} from "./handler.js";

// Intent Classifier
export type { IntentClassifierConfig } from "./intent-classifier.js";
export {
  IntentClassifier,
  intentClassifier,
  createIntentClassifier,
} from "./intent-classifier.js";

// Autocomplete Engine
export type { AutocompleteConfig, ValueProvider, ValueProviders } from "./autocomplete.js";
export {
  AutocompleteEngine,
  createAutocompleteEngine,
} from "./autocomplete.js";

// Patterns
export type { PatternDefinition, PatternCategory } from "./patterns.js";
export {
  patterns,
  getPatternsByCategory,
  getExamplesForCategory,
  commandKeywords,
  extractKeywords,
  detectTopic,
  matchPatterns,
  matchAllPatterns,
  isSlashCommand,
  isEmptyInput,
} from "./patterns.js";
