/**
 * Intent Classifier
 *
 * AI-powered classification of natural language input to determine user intent.
 * Uses a multi-level strategy:
 * 1. Pattern matching (fast path)
 * 2. Keyword detection (medium path)
 * 3. Claude API (slow path for ambiguous input)
 * 4. Clarification request (when confidence is too low)
 */

import type {
  UserIntent,
  ConversationContext,
  ClassificationResult,
  CommandIntent,
  ClarificationIntent,
  UnknownIntent,
} from "./types.js";
import {
  matchPatterns,
  matchAllPatterns,
  extractKeywords,
  commandKeywords,
  isSlashCommand,
  isEmptyInput,
  detectTopic,
} from "./patterns.js";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Intent classifier configuration.
 */
export interface IntentClassifierConfig {
  /** Minimum confidence to accept an intent (0-1) */
  minConfidence: number;
  /** Whether to use Claude API for ambiguous cases */
  enableClaudeClassification: boolean;
  /** Claude API timeout in milliseconds */
  claudeTimeout: number;
  /** Maximum cache entries */
  maxCacheEntries: number;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
}

const defaultConfig: IntentClassifierConfig = {
  minConfidence: 0.7,
  enableClaudeClassification: true,
  claudeTimeout: 5000,
  maxCacheEntries: 100,
  cacheTTL: 3600000, // 1 hour
};

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  result: ClassificationResult;
  timestamp: number;
}

/**
 * Simple LRU-style cache for classification results.
 */
class ClassificationCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Generate cache key from input and context.
   */
  private getKey(input: string, context: ConversationContext): string {
    // Include mode in key since same input may mean different things in different modes
    return `${context.mode}:${input.toLowerCase().trim()}`;
  }

  /**
   * Get cached result if available and not expired.
   */
  get(input: string, context: ConversationContext): ClassificationResult | undefined {
    const key = this.getKey(input, context);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Mark as cached
    return {
      ...entry.result,
      cached: true,
    };
  }

  /**
   * Store a result in the cache.
   */
  set(input: string, context: ConversationContext, result: ClassificationResult): void {
    // Enforce max size (simple LRU: delete oldest)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const key = this.getKey(input, context);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  get stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// ============================================================================
// Intent Classifier
// ============================================================================

/**
 * Intent Classifier
 *
 * Classifies natural language input into structured intents using
 * a multi-level strategy for optimal performance.
 *
 * @example
 * ```typescript
 * const classifier = new IntentClassifier();
 *
 * const result = await classifier.classify("build a login page", context);
 * // result.intent.type === "command"
 * // result.intent.command === "feature"
 * // result.intent.args === ["a login page"]
 * ```
 */
export class IntentClassifier {
  private config: IntentClassifierConfig;
  private cache: ClassificationCache;

  constructor(config: Partial<IntentClassifierConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.cache = new ClassificationCache(
      this.config.maxCacheEntries,
      this.config.cacheTTL
    );
  }

  /**
   * Classify user input into a structured intent.
   *
   * @param input - Raw user input
   * @param context - Current conversation context
   * @returns Classification result with intent and metadata
   */
  async classify(
    input: string,
    context: ConversationContext
  ): Promise<ClassificationResult> {
    const startTime = performance.now();

    // Handle empty input
    if (isEmptyInput(input)) {
      return this.createResult(
        {
          type: "unknown",
          reason: "Empty input",
          confidence: 0,
          originalInput: input,
        },
        "fallback",
        startTime,
        false
      );
    }

    // Slash commands are handled by CommandRouter, not classified
    if (isSlashCommand(input)) {
      return this.createResult(
        {
          type: "command",
          command: input.slice(1).split(/\s+/)[0] || "",
          args: [],
          confidence: 1.0,
          originalInput: input,
        },
        "pattern",
        startTime,
        false
      );
    }

    // Check cache
    const cached = this.cache.get(input, context);
    if (cached) {
      return cached;
    }

    // Level 1: Pattern matching
    const patternIntent = matchPatterns(input);
    if (patternIntent && patternIntent.confidence >= this.config.minConfidence) {
      const result = this.createResult(patternIntent, "pattern", startTime, false);
      this.cache.set(input, context, result);
      return result;
    }

    // Level 2: Keyword detection
    const keywordIntent = this.classifyByKeywords(input, context);
    if (keywordIntent && keywordIntent.confidence >= this.config.minConfidence) {
      const result = this.createResult(keywordIntent, "keyword", startTime, false);
      this.cache.set(input, context, result);
      return result;
    }

    // Level 3: Claude API classification (if enabled)
    if (this.config.enableClaudeClassification) {
      try {
        const claudeIntent = await this.classifyWithClaude(input, context);
        if (claudeIntent && claudeIntent.confidence >= this.config.minConfidence) {
          const result = this.createResult(claudeIntent, "claude", startTime, false);
          this.cache.set(input, context, result);
          return result;
        }
      } catch (error) {
        // Claude classification failed, fall through to clarification
        console.warn("Claude classification failed:", error);
      }
    }

    // Level 4: Request clarification or return best guess
    const clarificationIntent = this.createClarificationIntent(input, context);
    const result = this.createResult(clarificationIntent, "fallback", startTime, false);
    return result;
  }

  /**
   * Classify using keyword detection.
   */
  private classifyByKeywords(
    input: string,
    context: ConversationContext
  ): UserIntent | undefined {
    const keywords = extractKeywords(input);

    if (keywords.length === 0) {
      return undefined;
    }

    // Use first matching keyword
    const keyword = keywords[0]!;
    const mapping = commandKeywords[keyword];

    if (!mapping) {
      return undefined;
    }

    // Extract any remaining text as arguments
    const lowerInput = input.toLowerCase();
    const keywordIndex = lowerInput.indexOf(keyword);
    const afterKeyword = input.slice(keywordIndex + keyword.length).trim();
    const args = afterKeyword ? [afterKeyword, ...mapping.args] : mapping.args;

    return {
      type: "command",
      command: mapping.command,
      args,
      confidence: 0.6, // Lower confidence for keyword-only matches
      originalInput: input,
    };
  }

  /**
   * Classify using Claude API.
   * This is a stub that can be implemented when Claude API integration is available.
   */
  private async classifyWithClaude(
    input: string,
    context: ConversationContext
  ): Promise<UserIntent | undefined> {
    // Build context summary for Claude
    const _contextSummary = this.buildContextSummary(context);

    // TODO: Implement actual Claude API call
    // For now, return undefined to fall through to clarification
    // This will be implemented when the Claude CLI integration is complete

    // Stub implementation - try to make a reasonable guess based on context
    return this.makeContextualGuess(input, context);
  }

  /**
   * Build a context summary for Claude classification.
   */
  private buildContextSummary(context: ConversationContext): string {
    const parts: string[] = [];

    if (context.sessionId) {
      parts.push(`Active session: ${context.sessionId}`);
    }

    if (context.activeFeature) {
      parts.push(`Working on feature: ${context.activeFeature}`);
    }

    if (context.focusedAgent) {
      parts.push(`Focused on agent: ${context.focusedAgent}`);
    }

    parts.push(`UI mode: ${context.mode}`);
    parts.push(`Initialized: ${context.isInitialized}`);

    if (context.recentMessages.length > 0) {
      const recentConversation = context.recentMessages
        .slice(-3)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      parts.push(`Recent conversation:\n${recentConversation}`);
    }

    return parts.join("\n");
  }

  /**
   * Make a contextual guess when other methods fail.
   */
  private makeContextualGuess(
    input: string,
    context: ConversationContext
  ): UserIntent | undefined {
    // If in dashboard mode and asking about progress
    if (context.mode === "dashboard" && /progress|status|done/i.test(input)) {
      return {
        type: "command",
        command: "status",
        args: [],
        confidence: 0.65,
        originalInput: input,
      };
    }

    // If focused on an agent, assume message is for them
    if (context.focusedAgent) {
      return {
        type: "message_agent",
        agentIdentifier: context.focusedAgent,
        message: input,
        confidence: 0.6,
        originalInput: input,
      };
    }

    // If it looks like a question
    if (/\?$/.test(input) || /^(what|how|why|where|when|who|which|can|could|would|should)/i.test(input)) {
      return {
        type: "question",
        question: input,
        topic: detectTopic(input),
        confidence: 0.65,
        originalInput: input,
      };
    }

    // If not initialized and mentions setup/start
    if (!context.isInitialized && /init|setup|start|begin/i.test(input)) {
      return {
        type: "command",
        command: "init",
        args: [],
        confidence: 0.7,
        originalInput: input,
      };
    }

    return undefined;
  }

  /**
   * Create a clarification intent when we can't confidently classify.
   */
  private createClarificationIntent(
    input: string,
    context: ConversationContext
  ): ClarificationIntent | UnknownIntent {
    // Gather all possible matches with lower confidence threshold
    const allMatches = matchAllPatterns(input);

    if (allMatches.length > 1) {
      // Multiple possible interpretations
      return {
        type: "clarification",
        ambiguousInput: input,
        possibleIntents: allMatches.map((m) => m.intent),
        confidence: 0.5,
        originalInput: input,
      };
    }

    if (allMatches.length === 1) {
      // Single match but low confidence
      const match = allMatches[0]!;
      return {
        type: "clarification",
        ambiguousInput: input,
        possibleIntents: [match.intent],
        confidence: match.intent.confidence * 0.7,
        originalInput: input,
      };
    }

    // Suggest based on context
    const suggestions = this.getSuggestions(input, context);
    if (suggestions.length > 0) {
      return {
        type: "clarification",
        ambiguousInput: input,
        possibleIntents: suggestions,
        confidence: 0.4,
        originalInput: input,
      };
    }

    // Complete failure to classify
    return {
      type: "unknown",
      reason: "Could not understand input. Try a slash command or rephrase.",
      confidence: 0,
      originalInput: input,
    };
  }

  /**
   * Get suggestions based on context when classification fails.
   */
  private getSuggestions(input: string, context: ConversationContext): UserIntent[] {
    const suggestions: UserIntent[] = [];

    // Always suggest help
    suggestions.push({
      type: "command",
      command: "help",
      args: [],
      confidence: 0.5,
      originalInput: input,
    });

    // Context-specific suggestions
    if (!context.isInitialized) {
      suggestions.push({
        type: "command",
        command: "init",
        args: [],
        confidence: 0.6,
        originalInput: input,
      });
    } else if (!context.sessionId) {
      suggestions.push({
        type: "command",
        command: "feature",
        args: [input],
        confidence: 0.5,
        originalInput: input,
      });
    }

    return suggestions;
  }

  /**
   * Create a classification result with metadata.
   */
  private createResult(
    intent: UserIntent,
    method: ClassificationResult["method"],
    startTime: number,
    cached: boolean
  ): ClassificationResult {
    return {
      intent,
      method,
      classificationTimeMs: performance.now() - startTime,
      cached,
    };
  }

  /**
   * Clear the classification cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.cache.stats;
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<IntentClassifierConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global intent classifier instance.
 */
export const intentClassifier = new IntentClassifier();

/**
 * Create a new intent classifier instance.
 */
export function createIntentClassifier(
  config?: Partial<IntentClassifierConfig>
): IntentClassifier {
  return new IntentClassifier(config);
}
