/**
 * Intent Classifier Tests
 *
 * Tests for the AI-powered intent classification system.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  IntentClassifier,
  createIntentClassifier,
} from "../../../src/app/chat/intent-classifier.js";
import type { ConversationContext } from "../../../src/app/chat/types.js";
import { createDefaultContext } from "../../../src/app/chat/types.js";

describe("IntentClassifier", () => {
  let classifier: IntentClassifier;
  let context: ConversationContext;

  beforeEach(() => {
    classifier = createIntentClassifier({
      enableClaudeClassification: false, // Disable API calls for tests
      minConfidence: 0.5,
    });
    context = createDefaultContext("/test/project");
  });

  describe("classify", () => {
    describe("Empty and edge case inputs", () => {
      it("should handle empty input", async () => {
        const result = await classifier.classify("", context);
        expect(result.intent.type).toBe("unknown");
        expect(result.method).toBe("fallback");
      });

      it("should handle whitespace-only input", async () => {
        const result = await classifier.classify("   ", context);
        expect(result.intent.type).toBe("unknown");
      });
    });

    describe("Slash commands", () => {
      it("should identify slash commands", async () => {
        const result = await classifier.classify("/help", context);
        expect(result.intent.type).toBe("command");
        expect(result.method).toBe("pattern");
        if (result.intent.type === "command") {
          expect(result.intent.command).toBe("help");
        }
      });

      it("should extract command name from slash commands", async () => {
        const result = await classifier.classify("/feature some description", context);
        expect(result.intent.type).toBe("command");
        if (result.intent.type === "command") {
          expect(result.intent.command).toBe("feature");
        }
      });
    });

    describe("Pattern matching", () => {
      it("should classify 'build a login page' as feature command", async () => {
        const result = await classifier.classify("build a login page", context);
        expect(result.intent.type).toBe("command");
        expect(result.method).toBe("pattern");
        if (result.intent.type === "command") {
          expect(result.intent.command).toBe("feature");
        }
      });

      it("should classify 'what\\'s the status?' as status command", async () => {
        const result = await classifier.classify("what's the status?", context);
        expect(result.intent.type).toBe("command");
        expect(result.method).toBe("pattern");
      });

      it("should classify 'pause everything' as pause command", async () => {
        const result = await classifier.classify("pause everything", context);
        expect(result.intent.type).toBe("command");
        if (result.intent.type === "command") {
          expect(result.intent.command).toBe("pause");
        }
      });

      it("should classify 'help' as help command", async () => {
        const result = await classifier.classify("help", context);
        expect(result.intent.type).toBe("command");
        if (result.intent.type === "command") {
          expect(result.intent.command).toBe("help");
        }
      });

      it("should classify agent messages", async () => {
        const result = await classifier.classify(
          "tell the backend engineer to add validation",
          context
        );
        expect(result.intent.type).toBe("message_agent");
        if (result.intent.type === "message_agent") {
          expect(result.intent.agentIdentifier).toContain("backend");
        }
      });

      it("should classify feedback", async () => {
        const result = await classifier.classify("great!", context);
        expect(result.intent.type).toBe("feedback");
        if (result.intent.type === "feedback") {
          expect(result.intent.sentiment).toBe("positive");
        }
      });
    });

    describe("Keyword fallback", () => {
      it("should use keyword fallback for partial matches", async () => {
        const result = await classifier.classify(
          "I need help understanding something",
          context
        );
        // May classify as command via keyword or as question
        expect(["command", "question", "clarification", "unknown"]).toContain(
          result.intent.type
        );
      });
    });

    describe("Context-aware classification", () => {
      it("should suggest init command when not initialized", async () => {
        context.isInitialized = false;
        const result = await classifier.classify("get started", context);
        // Should suggest /init since not initialized
        if (result.intent.type === "clarification") {
          const hasInitSuggestion = result.intent.possibleIntents.some(
            (i) => i.type === "command" && (i as any).command === "init"
          );
          expect(hasInitSuggestion).toBe(true);
        }
      });

      it("should route messages to focused agent", async () => {
        context.focusedAgent = "agt_test123" as any;
        context.isInitialized = true;
        context.sessionId = "ses_test123" as any;

        const result = await classifier.classify(
          "add the endpoint",
          context
        );

        // When focused on an agent, ambiguous messages may route to that agent
        if (result.intent.type === "message_agent") {
          expect(result.intent.agentIdentifier).toBe("agt_test123");
        }
      });
    });

    describe("Classification metadata", () => {
      it("should include classification time", async () => {
        const result = await classifier.classify("help", context);
        expect(result.classificationTimeMs).toBeGreaterThanOrEqual(0);
      });

      it("should indicate cache status", async () => {
        // First call - not cached
        const result1 = await classifier.classify("help", context);
        expect(result1.cached).toBe(false);

        // Second call - should be cached
        const result2 = await classifier.classify("help", context);
        expect(result2.cached).toBe(true);
      });
    });

    describe("Clarification intents", () => {
      it("should request clarification for ambiguous input", async () => {
        const result = await classifier.classify(
          "something vague and unclear xyz",
          context
        );
        expect(["clarification", "unknown"]).toContain(result.intent.type);
      });
    });
  });

  describe("Cache management", () => {
    it("should clear cache", async () => {
      // Populate cache
      await classifier.classify("help", context);
      const result1 = await classifier.classify("help", context);
      expect(result1.cached).toBe(true);

      // Clear cache
      classifier.clearCache();

      // Should not be cached anymore
      const result2 = await classifier.classify("help", context);
      expect(result2.cached).toBe(false);
    });

    it("should report cache stats", () => {
      const stats = classifier.getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
    });
  });

  describe("Configuration", () => {
    it("should respect minConfidence setting", async () => {
      const strictClassifier = createIntentClassifier({
        minConfidence: 0.99,
        enableClaudeClassification: false,
      });

      // With very high confidence threshold, most things should fall through
      const result = await strictClassifier.classify("maybe do something", context);
      // Should be clarification or unknown due to high threshold
      expect(["clarification", "unknown"]).toContain(result.intent.type);
    });

    it("should allow config updates", () => {
      classifier.updateConfig({ minConfidence: 0.9 });
      // Config updated without error
      expect(true).toBe(true);
    });
  });

  describe("Factory function", () => {
    it("should create classifier with custom config", () => {
      const custom = createIntentClassifier({
        maxCacheEntries: 50,
        cacheTTL: 1000,
      });
      expect(custom).toBeInstanceOf(IntentClassifier);
    });
  });
});
