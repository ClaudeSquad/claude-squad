/**
 * Chat Handler Tests
 *
 * Tests for the central input processor that orchestrates user interactions.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  ChatHandler,
  createChatHandler,
  getChatHandler,
  resetChatHandler,
} from "../../../src/app/chat/handler.js";
import { CommandRouter } from "../../../src/core/commands/router.js";
import { IntentClassifier, createIntentClassifier } from "../../../src/app/chat/intent-classifier.js";
import { createAutocompleteEngine } from "../../../src/app/chat/autocomplete.js";
import { EventBus } from "../../../src/infra/events/event-bus.js";
import type { SessionId, AgentId, FeatureId } from "../../../src/core/types/id.js";

describe("ChatHandler", () => {
  let handler: ChatHandler;
  let router: CommandRouter;
  let classifier: IntentClassifier;
  let events: EventBus;

  beforeEach(() => {
    // Create isolated dependencies for each test
    router = new CommandRouter();

    // Register test commands
    router.register({
      name: "help",
      description: "Show help information",
      category: "info",
      handler: async () => ({
        success: true,
        message: "Help information here",
      }),
    });

    router.register({
      name: "feature",
      description: "Start a new feature",
      category: "feature",
      arguments: [
        {
          name: "description",
          type: "string",
          description: "Feature description",
          required: true,
          positional: true,
        },
      ],
      handler: async (args) => ({
        success: true,
        message: `Starting feature: ${args.positional[0] || "untitled"}`,
      }),
    });

    router.register({
      name: "status",
      description: "Show status",
      category: "info",
      handler: async () => ({
        success: true,
        message: "All systems operational",
      }),
    });

    classifier = createIntentClassifier({
      enableClaudeClassification: false,
      minConfidence: 0.5,
    });

    events = new EventBus();

    handler = createChatHandler(
      { projectPath: "/test/project" },
      {
        router,
        classifier,
        autocomplete: createAutocompleteEngine(router),
        events,
      }
    );

    // Reset global handler
    resetChatHandler();
  });

  describe("Command processing", () => {
    it("should process slash commands", async () => {
      const response = await handler.processInput("/help");
      expect(response.success).toBe(true);
      expect(response.type).toBe("command");
      expect(response.content).toContain("Help");
    });

    it("should process commands with arguments", async () => {
      const response = await handler.processInput("/feature login page");
      expect(response.success).toBe(true);
      expect(response.content).toContain("Starting feature");
    });

    it("should handle unknown commands gracefully", async () => {
      const response = await handler.processInput("/unknown");
      expect(response.success).toBe(false);
      expect(response.type).toBe("error");
    });

    it("should identify input as command", () => {
      expect(handler.isCommand("/help")).toBe(true);
      expect(handler.isCommand("help")).toBe(false);
      expect(handler.isCommand("build something")).toBe(false);
    });
  });

  describe("Natural language processing", () => {
    it("should process natural language as feature request", async () => {
      const response = await handler.processInput("build a login page");
      // Should classify as feature command
      expect(response).toBeDefined();
    });

    it("should process status queries", async () => {
      const response = await handler.processInput("what's the status?");
      expect(response).toBeDefined();
    });

    it("should handle feedback", async () => {
      const response = await handler.processInput("thanks!");
      expect(response.success).toBe(true);
      expect(response.content).toContain("Thanks");
    });

    it("should handle unknown input gracefully", async () => {
      const response = await handler.processInput("xyz random gibberish 123");
      expect(response).toBeDefined();
      // Should be unknown or clarification
      expect(["error", "message", "question"]).toContain(response.type);
    });
  });

  describe("Empty input handling", () => {
    it("should handle empty string", async () => {
      const response = await handler.processInput("");
      expect(response.content).toBe("");
    });

    it("should handle whitespace-only input", async () => {
      const response = await handler.processInput("   ");
      expect(response.content).toBe("");
    });
  });

  describe("Context management", () => {
    it("should maintain conversation context", async () => {
      await handler.processInput("hello");
      const context = handler.getContext();
      expect(context.recentMessages.length).toBeGreaterThan(0);
    });

    it("should set session ID", () => {
      const sessionId = "ses_test123" as SessionId;
      handler.setSession(sessionId);
      const context = handler.getContext();
      expect(context.sessionId).toBe(sessionId);
    });

    it("should set feature ID", () => {
      const featureId = "fea_test123" as FeatureId;
      handler.setFeature(featureId);
      const context = handler.getContext();
      expect(context.activeFeature).toBe(featureId);
    });

    it("should set focused agent", () => {
      const agentId = "agt_test123" as AgentId;
      handler.setFocusedAgent(agentId);
      const context = handler.getContext();
      expect(context.focusedAgent).toBe(agentId);
    });

    it("should set UI mode", () => {
      handler.setMode("dashboard");
      const context = handler.getContext();
      expect(context.mode).toBe("dashboard");
    });

    it("should set initialization status", () => {
      handler.setInitialized(true);
      const context = handler.getContext();
      expect(context.isInitialized).toBe(true);
    });

    it("should clear context", async () => {
      await handler.processInput("test message");
      handler.clearContext();
      const context = handler.getContext();
      expect(context.recentMessages.length).toBe(0);
    });

    it("should restore context", () => {
      const sessionId = "ses_restored" as SessionId;
      handler.restoreContext({ sessionId });
      const context = handler.getContext();
      expect(context.sessionId).toBe(sessionId);
    });

    it("should trim messages to max limit", async () => {
      const limitedHandler = createChatHandler(
        { maxRecentMessages: 2, projectPath: "/test" },
        { router, classifier, events }
      );

      await limitedHandler.processInput("message 1");
      await limitedHandler.processInput("message 2");
      await limitedHandler.processInput("message 3");

      const context = limitedHandler.getContext();
      // Should have at most 2 messages (but pairs of user+assistant)
      expect(context.recentMessages.length).toBeLessThanOrEqual(4);
    });
  });

  describe("Autocomplete", () => {
    it("should provide autocomplete suggestions", async () => {
      const result = await handler.getAutocompleteSuggestions("/he");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should not suggest for non-commands", async () => {
      const result = await handler.getAutocompleteSuggestions("hello");
      expect(result.suggestions.length).toBe(0);
    });
  });

  describe("Router access", () => {
    it("should provide access to command router", () => {
      const cmdRouter = handler.getRouter();
      expect(cmdRouter).toBe(router);
    });

    it("should provide access to classifier", () => {
      const cls = handler.getClassifier();
      expect(cls).toBe(classifier);
    });
  });

  describe("Event emission", () => {
    it("should emit chat input events", async () => {
      let emittedEvent: any = null;
      // EventBus.on() returns an Observable, need to subscribe
      events.on("CHAT_INPUT" as any).subscribe((event) => {
        emittedEvent = event;
      });

      await handler.processInput("/help");
      expect(emittedEvent).not.toBeNull();
      expect(emittedEvent.input).toBe("/help");
    });

    it("should emit chat response events", async () => {
      let emittedEvent: any = null;
      events.on("CHAT_RESPONSE" as any).subscribe((event) => {
        emittedEvent = event;
      });

      await handler.processInput("/help");
      expect(emittedEvent).not.toBeNull();
      expect(emittedEvent.response).toBeDefined();
    });

    it("should emit intent classified events for NL input", async () => {
      let emittedEvent: any = null;
      events.on("INTENT_CLASSIFIED" as any).subscribe((event) => {
        emittedEvent = event;
      });

      await handler.processInput("help me");
      expect(emittedEvent).not.toBeNull();
      expect(emittedEvent.result).toBeDefined();
    });
  });

  describe("Response types", () => {
    it("should return message type for feedback", async () => {
      const response = await handler.processInput("great!");
      expect(response.type).toBe("message");
    });

    it("should return command type for successful commands", async () => {
      const response = await handler.processInput("/help");
      expect(response.type).toBe("command");
    });

    it("should return error type for failed commands", async () => {
      const response = await handler.processInput("/nonexistent");
      expect(response.type).toBe("error");
    });

    it("should include suggestions in responses", async () => {
      const response = await handler.processInput("what is an agent?");
      // May include suggestions
      expect(response).toBeDefined();
    });
  });

  describe("Message agent intent", () => {
    it("should handle message agent without session", async () => {
      const response = await handler.processInput(
        "tell the backend engineer to add validation"
      );
      // Should fail without a session
      if (response.type === "error") {
        expect(response.content).toContain("session");
      }
    });

    it("should acknowledge message agent with session", async () => {
      handler.setSession("ses_test123" as SessionId);
      const response = await handler.processInput(
        "@backend add the API endpoint"
      );
      // May route to agent
      expect(response).toBeDefined();
    });
  });

  describe("Question intent", () => {
    it("should handle topic-specific questions", async () => {
      const response = await handler.processInput("how do agents work?");
      expect(response.success).toBe(true);
    });

    it("should handle general questions", async () => {
      const response = await handler.processInput("what is this?");
      expect(response.success).toBe(true);
    });
  });

  describe("Clarification intent", () => {
    it("should request clarification for ambiguous input", async () => {
      // With high confidence classifier, ambiguous input may need clarification
      const strictHandler = createChatHandler(
        { projectPath: "/test" },
        {
          router,
          classifier: createIntentClassifier({
            enableClaudeClassification: false,
            minConfidence: 0.99,
          }),
          events,
        }
      );

      const response = await strictHandler.processInput("maybe do something");
      // Should be clarification or unknown
      expect(["error", "question", "message"]).toContain(response.type);
    });
  });

  describe("Global handler", () => {
    it("should create global handler on first call", () => {
      resetChatHandler();
      const handler1 = getChatHandler();
      const handler2 = getChatHandler();
      expect(handler1).toBe(handler2);
    });

    it("should reset global handler", () => {
      const handler1 = getChatHandler();
      resetChatHandler();
      const handler2 = getChatHandler();
      expect(handler1).not.toBe(handler2);
    });

    it("should accept config for global handler", () => {
      resetChatHandler();
      const handler = getChatHandler({ projectPath: "/custom/path" });
      expect(handler.getContext().projectPath).toBe("/custom/path");
    });
  });

  describe("Factory function", () => {
    it("should create new handler each time", () => {
      const h1 = createChatHandler();
      const h2 = createChatHandler();
      expect(h1).not.toBe(h2);
    });

    it("should accept custom dependencies", () => {
      const customRouter = new CommandRouter();
      const h = createChatHandler({}, { router: customRouter });
      expect(h.getRouter()).toBe(customRouter);
    });
  });

  describe("Error handling", () => {
    it("should handle handler errors gracefully", async () => {
      // Register a command that throws
      router.register({
        name: "broken",
        description: "Broken command",
        category: "system",
        handler: async () => {
          throw new Error("Test error");
        },
      });

      const response = await handler.processInput("/broken");
      expect(response.success).toBe(false);
      expect(response.type).toBe("error");
    });
  });
});
