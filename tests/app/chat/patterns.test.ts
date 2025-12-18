/**
 * Natural Language Patterns Tests
 *
 * Tests for pattern matching and intent creation.
 */

import { describe, it, expect } from "bun:test";
import {
  matchPatterns,
  matchAllPatterns,
  extractKeywords,
  detectTopic,
  isSlashCommand,
  isEmptyInput,
  patterns,
  getPatternsByCategory,
  getExamplesForCategory,
} from "../../../src/app/chat/patterns.js";

describe("Pattern Matching", () => {
  describe("matchPatterns", () => {
    describe("Feature patterns", () => {
      it("should match 'build a login page'", () => {
        const intent = matchPatterns("build a login page");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("feature");
          expect(intent.args[0]).toContain("login page");
        }
      });

      it("should match 'create a dashboard'", () => {
        const intent = matchPatterns("create a dashboard");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("feature");
        }
      });

      it("should match 'start user authentication'", () => {
        const intent = matchPatterns("start user authentication");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("feature");
        }
      });

      it("should match 'develop a payment system'", () => {
        const intent = matchPatterns("develop a payment system");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
      });

      it("should match 'work on the API'", () => {
        const intent = matchPatterns("work on the API");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("feature");
          expect(intent.args[0]).toContain("API");
        }
      });
    });

    describe("Status patterns", () => {
      it("should match 'what\\'s the status?'", () => {
        const intent = matchPatterns("what's the status?");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("status");
        }
      });

      it("should match 'status'", () => {
        const intent = matchPatterns("status");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
      });

      it("should match 'how\\'s it going?'", () => {
        const intent = matchPatterns("how's it going?");
        expect(intent).not.toBeUndefined();
      });

      it("should match 'show me the dashboard'", () => {
        const intent = matchPatterns("show me the dashboard");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("dashboard");
        }
      });
    });

    describe("Session control patterns", () => {
      it("should match 'pause everything'", () => {
        const intent = matchPatterns("pause everything");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("pause");
        }
      });

      it("should match 'stop all work'", () => {
        const intent = matchPatterns("stop all work");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("pause");
        }
      });

      it("should match 'resume'", () => {
        const intent = matchPatterns("resume");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("resume");
        }
      });

      it("should match 'show sessions'", () => {
        const intent = matchPatterns("show sessions");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("sessions");
        }
      });
    });

    describe("Agent patterns", () => {
      it("should match 'tell the backend engineer to add validation'", () => {
        const intent = matchPatterns("tell the backend engineer to add validation");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("message_agent");
        if (intent?.type === "message_agent") {
          expect(intent.agentIdentifier).toContain("backend");
          expect(intent.message).toContain("add validation");
        }
      });

      it("should match '@backend add the API endpoint'", () => {
        const intent = matchPatterns("@backend add the API endpoint");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("message_agent");
        if (intent?.type === "message_agent") {
          expect(intent.agentIdentifier).toBe("backend");
          expect(intent.message).toBe("add the API endpoint");
        }
      });

      it("should match 'show agents'", () => {
        const intent = matchPatterns("show agents");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("agents");
        }
      });
    });

    describe("Help patterns", () => {
      it("should match 'what can you do?'", () => {
        const intent = matchPatterns("what can you do?");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("help");
        }
      });

      it("should match 'help'", () => {
        const intent = matchPatterns("help");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
        if (intent?.type === "command") {
          expect(intent.command).toBe("help");
        }
      });

      it("should match 'how do i create an agent?'", () => {
        const intent = matchPatterns("how do i create an agent?");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("question");
        if (intent?.type === "question") {
          expect(intent.topic).toBe("agents");
        }
      });

      it("should match general questions", () => {
        const intent = matchPatterns("what is a workflow?");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("question");
        if (intent?.type === "question") {
          expect(intent.topic).toBe("workflows");
        }
      });
    });

    describe("Feedback patterns", () => {
      it("should match 'great!'", () => {
        const intent = matchPatterns("great!");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("feedback");
        if (intent?.type === "feedback") {
          expect(intent.sentiment).toBe("positive");
        }
      });

      it("should match 'thanks'", () => {
        const intent = matchPatterns("thanks");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("feedback");
        if (intent?.type === "feedback") {
          expect(intent.sentiment).toBe("positive");
        }
      });

      it("should match 'that\\'s wrong'", () => {
        const intent = matchPatterns("that's wrong");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("feedback");
        if (intent?.type === "feedback") {
          expect(intent.sentiment).toBe("negative");
        }
      });
    });

    describe("Edge cases", () => {
      it("should return undefined for unmatched input", () => {
        const intent = matchPatterns("something completely random xyz123");
        expect(intent).toBeUndefined();
      });

      it("should handle whitespace trimming", () => {
        const intent = matchPatterns("  help  ");
        expect(intent).not.toBeUndefined();
        expect(intent?.type).toBe("command");
      });

      it("should be case insensitive", () => {
        const intent1 = matchPatterns("HELP");
        const intent2 = matchPatterns("Help");
        const intent3 = matchPatterns("help");

        expect(intent1?.type).toBe("command");
        expect(intent2?.type).toBe("command");
        expect(intent3?.type).toBe("command");
      });
    });
  });

  describe("matchAllPatterns", () => {
    it("should return all matching patterns", () => {
      const matches = matchAllPatterns("help");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty array for no matches", () => {
      const matches = matchAllPatterns("xyz123 random");
      expect(matches.length).toBe(0);
    });
  });
});

describe("Keyword Extraction", () => {
  describe("extractKeywords", () => {
    it("should extract known keywords", () => {
      const keywords = extractKeywords("build something with agents");
      expect(keywords).toContain("build");
      expect(keywords).toContain("agents");
    });

    it("should return empty for no keywords", () => {
      const keywords = extractKeywords("random text here");
      expect(keywords.length).toBe(0);
    });

    it("should handle multiple keywords", () => {
      const keywords = extractKeywords("help with config and skills");
      expect(keywords).toContain("help");
      expect(keywords).toContain("config");
      expect(keywords).toContain("skills");
    });
  });
});

describe("Topic Detection", () => {
  describe("detectTopic", () => {
    it("should detect agent topic", () => {
      expect(detectTopic("how do agents work?")).toBe("agents");
      expect(detectTopic("spawn a new agent")).toBe("agents");
    });

    it("should detect workflow topic", () => {
      expect(detectTopic("what is a workflow?")).toBe("workflows");
      expect(detectTopic("configure pipeline")).toBe("workflows");
    });

    it("should detect session topic", () => {
      expect(detectTopic("resume my session")).toBe("sessions");
    });

    it("should return undefined for unknown topics", () => {
      expect(detectTopic("random text")).toBeUndefined();
    });
  });
});

describe("Input Type Detection", () => {
  describe("isSlashCommand", () => {
    it("should detect slash commands", () => {
      expect(isSlashCommand("/help")).toBe(true);
      expect(isSlashCommand("/feature add login")).toBe(true);
      expect(isSlashCommand("  /help")).toBe(true);
    });

    it("should not detect non-commands", () => {
      expect(isSlashCommand("help")).toBe(false);
      expect(isSlashCommand("build something")).toBe(false);
      expect(isSlashCommand("")).toBe(false);
    });
  });

  describe("isEmptyInput", () => {
    it("should detect empty input", () => {
      expect(isEmptyInput("")).toBe(true);
      expect(isEmptyInput("   ")).toBe(true);
      expect(isEmptyInput("\t\n")).toBe(true);
    });

    it("should not detect non-empty input", () => {
      expect(isEmptyInput("a")).toBe(false);
      expect(isEmptyInput("help")).toBe(false);
    });
  });
});

describe("Pattern Registry", () => {
  describe("patterns array", () => {
    it("should have patterns", () => {
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("should be sorted by priority", () => {
      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i]!.priority).toBeGreaterThanOrEqual(patterns[i - 1]!.priority);
      }
    });

    it("should have unique IDs", () => {
      const ids = patterns.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("getPatternsByCategory", () => {
    it("should filter patterns by category", () => {
      const featurePatterns = getPatternsByCategory("feature");
      expect(featurePatterns.length).toBeGreaterThan(0);
      expect(featurePatterns.every((p) => p.category === "feature")).toBe(true);
    });
  });

  describe("getExamplesForCategory", () => {
    it("should return examples for a category", () => {
      const examples = getExamplesForCategory("help");
      expect(examples.length).toBeGreaterThan(0);
    });
  });
});
