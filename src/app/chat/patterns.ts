/**
 * Natural Language Pattern Registry
 *
 * Defines regex patterns for mapping natural language input to structured intents.
 * Patterns are matched in priority order (lower index = higher priority).
 *
 * The pattern matching strategy:
 * 1. Exact phrase patterns (most specific)
 * 2. Verb + object patterns (e.g., "build a login page")
 * 3. Keyword patterns (fallback)
 */

import type { UserIntent } from "./types.js";

// ============================================================================
// Pattern Definition Types
// ============================================================================

/**
 * Pattern definition for natural language matching.
 */
export interface PatternDefinition {
  /** Unique identifier for this pattern */
  id: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Function to create intent from match groups */
  createIntent: (match: RegExpMatchArray, input: string) => UserIntent;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Example phrases that match this pattern */
  examples: string[];
  /** Category for organization */
  category: PatternCategory;
}

/**
 * Pattern categories.
 */
export type PatternCategory =
  | "feature"
  | "status"
  | "session"
  | "agent"
  | "help"
  | "feedback";

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Feature development patterns.
 * Examples: "build a login page", "create a dashboard", "start user auth"
 */
const featurePatterns: PatternDefinition[] = [
  {
    id: "feature-build",
    pattern: /^(?:build|create|make|start|develop|implement|add)\s+(?:a\s+)?(?:new\s+)?(.+?)(?:\s+feature)?$/i,
    createIntent: (match, input) => ({
      type: "command",
      command: "feature",
      args: [match[1]!.trim()],
      confidence: 0.9,
      originalInput: input,
    }),
    priority: 10,
    examples: [
      "build a login page",
      "create a dashboard",
      "start user authentication",
      "develop a payment system",
      "implement dark mode",
      "add a search feature",
    ],
    category: "feature",
  },
  {
    id: "feature-work-on",
    pattern: /^(?:work on|let's work on|i want to work on)\s+(.+)$/i,
    createIntent: (match, input) => ({
      type: "command",
      command: "feature",
      args: [match[1]!.trim()],
      confidence: 0.85,
      originalInput: input,
    }),
    priority: 11,
    examples: ["work on the API", "let's work on user profiles", "i want to work on notifications"],
    category: "feature",
  },
  {
    id: "feature-start-fresh",
    pattern: /^(?:start\s+)?(?:fresh|new|a new project|over)$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "feature",
      args: [],
      confidence: 0.75,
      originalInput: input,
    }),
    priority: 12,
    examples: ["start fresh", "fresh", "new", "start over"],
    category: "feature",
  },
];

/**
 * Status query patterns.
 * Examples: "what's the status?", "how are things going?"
 */
const statusPatterns: PatternDefinition[] = [
  {
    id: "status-whats",
    pattern: /^(?:what(?:'s| is)?\s+)?(?:the\s+)?(?:status|progress|state)(?:\?)?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "status",
      args: [],
      confidence: 0.95,
      originalInput: input,
    }),
    priority: 20,
    examples: ["what's the status?", "status", "what is the progress?", "show status"],
    category: "status",
  },
  {
    id: "status-how-going",
    pattern: /^(?:how(?:'s| is)?\s+)?(?:it|everything|things?|work|the project)\s+(?:going|progressing|coming along)(?:\?)?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "status",
      args: [],
      confidence: 0.85,
      originalInput: input,
    }),
    priority: 21,
    examples: ["how's it going?", "how is everything going?", "how are things progressing?"],
    category: "status",
  },
  {
    id: "status-done-yet",
    pattern: /^(?:are we\s+)?(?:done|finished|complete)(?:\s+yet)?(?:\?)?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "status",
      args: [],
      confidence: 0.8,
      originalInput: input,
    }),
    priority: 22,
    examples: ["are we done yet?", "done?", "finished?", "are we complete?"],
    category: "status",
  },
  {
    id: "status-show",
    pattern: /^(?:show|display|get|view)\s+(?:me\s+)?(?:the\s+)?(?:status|progress|dashboard)$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "dashboard",
      args: [],
      confidence: 0.9,
      originalInput: input,
    }),
    priority: 23,
    examples: ["show me the status", "display progress", "view dashboard", "get status"],
    category: "status",
  },
];

/**
 * Session control patterns.
 * Examples: "pause everything", "stop working", "resume"
 */
const sessionPatterns: PatternDefinition[] = [
  {
    id: "session-pause",
    pattern: /^(?:pause|stop|halt)\s+(?:everything|all(?:\s+work)?|work(?:ing)?|agents?)$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "pause",
      args: [],
      confidence: 0.95,
      originalInput: input,
    }),
    priority: 30,
    examples: ["pause everything", "stop all work", "halt agents", "stop working"],
    category: "session",
  },
  {
    id: "session-resume",
    pattern: /^(?:resume|continue|unpause|restart)\s*(?:work(?:ing)?|everything|all)?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "resume",
      args: [],
      confidence: 0.9,
      originalInput: input,
    }),
    priority: 31,
    examples: ["resume", "continue", "resume work", "unpause", "restart"],
    category: "session",
  },
  {
    id: "session-stop",
    pattern: /^(?:stop|quit|exit|end)\s*(?:session|work)?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "stop",
      args: [],
      confidence: 0.85,
      originalInput: input,
    }),
    priority: 32,
    examples: ["stop", "quit", "exit", "end session"],
    category: "session",
  },
  {
    id: "session-list",
    pattern: /^(?:show|list|view|get)\s+(?:all\s+)?(?:my\s+)?sessions?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "sessions",
      args: ["list"],
      confidence: 0.9,
      originalInput: input,
    }),
    priority: 33,
    examples: ["show sessions", "list my sessions", "view all sessions"],
    category: "session",
  },
];

/**
 * Agent communication patterns.
 * Examples: "tell the backend engineer to...", "ask the architect about..."
 */
const agentPatterns: PatternDefinition[] = [
  {
    id: "agent-tell",
    pattern: /^(?:tell|ask|notify|message|ping)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:to|that|about)\s+(.+)$/i,
    createIntent: (match, input) => ({
      type: "message_agent",
      agentIdentifier: match[1]!.trim(),
      message: match[2]!.trim(),
      confidence: 0.85,
      originalInput: input,
    }),
    priority: 40,
    examples: [
      "tell the backend engineer to add validation",
      "ask the architect about database design",
      "notify QA that the feature is ready",
      "message frontend to update the UI",
    ],
    category: "agent",
  },
  {
    id: "agent-message-direct",
    // Only match single-word agent names for @ mentions (e.g., @backend, @frontend)
    pattern: /^@(\w+)\s+(.+)$/i,
    createIntent: (match, input) => ({
      type: "message_agent",
      agentIdentifier: match[1]!.trim(),
      message: match[2]!.trim(),
      confidence: 0.95,
      originalInput: input,
    }),
    priority: 41,
    examples: ["@backend add the API endpoint", "@architect review the design"],
    category: "agent",
  },
  {
    id: "agent-list",
    pattern: /^(?:show|list|view|get)\s+(?:all\s+)?(?:the\s+)?agents?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "agents",
      args: ["list"],
      confidence: 0.9,
      originalInput: input,
    }),
    priority: 42,
    examples: ["show agents", "list all agents", "view the agents"],
    category: "agent",
  },
];

/**
 * Help and discovery patterns.
 * Examples: "what can you do?", "help", "show commands"
 */
const helpPatterns: PatternDefinition[] = [
  {
    id: "help-capabilities",
    pattern: /^(?:what\s+can\s+(?:you|squad)\s+do|what\s+are\s+(?:your|the)\s+capabilities|capabilities)(?:\?)?$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "help",
      args: [],
      confidence: 0.95,
      originalInput: input,
    }),
    priority: 50,
    examples: ["what can you do?", "what are your capabilities?", "capabilities"],
    category: "help",
  },
  {
    id: "help-commands",
    pattern: /^(?:help|show\s+(?:me\s+)?(?:all\s+)?commands?|commands?|list\s+commands?)$/i,
    createIntent: (_, input) => ({
      type: "command",
      command: "help",
      args: [],
      confidence: 0.95,
      originalInput: input,
    }),
    priority: 51,
    examples: ["help", "show commands", "commands", "list commands"],
    category: "help",
  },
  {
    id: "help-specific",
    pattern: /^(?:help\s+(?:me\s+)?(?:with\s+)?|how\s+(?:do\s+i|to|can\s+i)\s+)(.+?)(?:\?)?$/i,
    createIntent: (match, input) => ({
      type: "question",
      question: match[1]!.trim(),
      topic: detectTopic(match[1]!.trim()),
      confidence: 0.8,
      originalInput: input,
    }),
    priority: 52,
    examples: [
      "help me with agents",
      "how do i create an agent?",
      "how to start a feature",
      "how can i manage sessions?",
    ],
    category: "help",
  },
  {
    id: "help-question",
    pattern: /^(?:what|how|why|where|when|who|which)\s+.+\?$/i,
    createIntent: (_, input) => ({
      type: "question",
      question: input.replace(/\?$/, "").trim(),
      topic: detectTopic(input),
      confidence: 0.7,
      originalInput: input,
    }),
    priority: 60,
    examples: ["what is a workflow?", "how does handoff work?", "where are skills stored?"],
    category: "help",
  },
];

/**
 * Feedback patterns.
 * Examples: "great job!", "that's wrong", "looks good"
 */
const feedbackPatterns: PatternDefinition[] = [
  {
    id: "feedback-positive",
    pattern: /^(?:great|good|nice|awesome|excellent|perfect|thanks?|thank\s+you|well\s+done|looks?\s+good)(?:!|\.)?$/i,
    createIntent: (_, input) => ({
      type: "feedback",
      sentiment: "positive",
      content: input,
      confidence: 0.85,
      originalInput: input,
    }),
    priority: 70,
    examples: ["great!", "good job", "thanks", "looks good", "well done"],
    category: "feedback",
  },
  {
    id: "feedback-negative",
    pattern: /^(?:that'?s?\s+)?(?:wrong|incorrect|not\s+right|bad|no(?:pe)?|undo|revert)(?:!|\.)?$/i,
    createIntent: (_, input) => ({
      type: "feedback",
      sentiment: "negative",
      content: input,
      confidence: 0.8,
      originalInput: input,
    }),
    priority: 71,
    examples: ["that's wrong", "incorrect", "no", "undo", "revert"],
    category: "feedback",
  },
];

// ============================================================================
// Pattern Registry
// ============================================================================

/**
 * All registered patterns, sorted by priority.
 */
export const patterns: PatternDefinition[] = [
  ...featurePatterns,
  ...statusPatterns,
  ...sessionPatterns,
  ...agentPatterns,
  ...helpPatterns,
  ...feedbackPatterns,
].sort((a, b) => a.priority - b.priority);

/**
 * Get patterns by category.
 */
export function getPatternsByCategory(category: PatternCategory): PatternDefinition[] {
  return patterns.filter((p) => p.category === category);
}

/**
 * Get all pattern examples for a category.
 */
export function getExamplesForCategory(category: PatternCategory): string[] {
  return getPatternsByCategory(category).flatMap((p) => p.examples);
}

// ============================================================================
// Keyword Detection
// ============================================================================

/**
 * Keywords that suggest specific commands.
 */
export const commandKeywords: Record<string, { command: string; args: string[] }> = {
  // Feature keywords
  build: { command: "feature", args: [] },
  create: { command: "feature", args: [] },
  develop: { command: "feature", args: [] },
  implement: { command: "feature", args: [] },

  // Status keywords
  status: { command: "status", args: [] },
  progress: { command: "status", args: [] },
  dashboard: { command: "dashboard", args: [] },

  // Session keywords
  pause: { command: "pause", args: [] },
  resume: { command: "resume", args: [] },
  stop: { command: "stop", args: [] },
  quit: { command: "exit", args: [] },
  exit: { command: "exit", args: [] },

  // Agent keywords
  agents: { command: "agents", args: [] },
  spawn: { command: "spawn", args: [] },

  // Config keywords
  config: { command: "config", args: [] },
  settings: { command: "config", args: [] },
  skills: { command: "skills", args: [] },
  workflows: { command: "workflows", args: [] },

  // Help keywords
  help: { command: "help", args: [] },
  commands: { command: "help", args: [] },

  // Session keywords
  sessions: { command: "sessions", args: [] },
  init: { command: "init", args: [] },
  initialize: { command: "init", args: [] },
};

/**
 * Extract keywords from input.
 */
export function extractKeywords(input: string): string[] {
  const words = input.toLowerCase().split(/\s+/);
  return words.filter((word) => word in commandKeywords);
}

// ============================================================================
// Topic Detection
// ============================================================================

/**
 * Topic keywords for classifying questions.
 */
const topicKeywords: Record<string, string[]> = {
  agents: ["agent", "agents", "spawn", "worker", "engineer", "architect"],
  skills: ["skill", "skills", "capability", "capabilities"],
  workflows: ["workflow", "workflows", "stage", "stages", "pipeline"],
  sessions: ["session", "sessions", "history", "resume"],
  features: ["feature", "features", "task", "tasks", "project"],
  integrations: ["integration", "integrations", "github", "linear", "slack"],
  config: ["config", "configuration", "settings", "setup"],
  commands: ["command", "commands", "slash", "/"],
};

/**
 * Detect the topic of a question or input.
 */
export function detectTopic(input: string): string | undefined {
  const lowerInput = input.toLowerCase();
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((keyword) => lowerInput.includes(keyword))) {
      return topic;
    }
  }
  return undefined;
}

// ============================================================================
// Pattern Matching
// ============================================================================

/**
 * Match input against all patterns.
 * Returns the first matching pattern's intent, or undefined if no match.
 */
export function matchPatterns(input: string): UserIntent | undefined {
  const trimmed = input.trim();

  for (const pattern of patterns) {
    const match = trimmed.match(pattern.pattern);
    if (match) {
      return pattern.createIntent(match, trimmed);
    }
  }

  return undefined;
}

/**
 * Match input against patterns and return all matches.
 * Useful for disambiguation when multiple patterns match.
 */
export function matchAllPatterns(
  input: string
): Array<{ pattern: PatternDefinition; intent: UserIntent }> {
  const trimmed = input.trim();
  const matches: Array<{ pattern: PatternDefinition; intent: UserIntent }> = [];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern.pattern);
    if (match) {
      matches.push({
        pattern,
        intent: pattern.createIntent(match, trimmed),
      });
    }
  }

  return matches;
}

/**
 * Check if input looks like a slash command.
 */
export function isSlashCommand(input: string): boolean {
  return input.trim().startsWith("/");
}

/**
 * Check if input is empty or whitespace only.
 */
export function isEmptyInput(input: string): boolean {
  return input.trim().length === 0;
}
