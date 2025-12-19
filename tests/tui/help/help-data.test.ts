/**
 * Help Data Tests
 *
 * Tests for the help data structure and helper functions.
 */

import { describe, it, expect } from "bun:test";
import {
  HELP_TOPICS,
  findTopicById,
  findTopicByCommand,
  searchTopics,
  type HelpTopic,
} from "../../../src/tui/components/help/help-data.js";

describe("HELP_TOPICS structure", () => {
  it("should be a flat list of commands", () => {
    // Verify it's an array
    expect(Array.isArray(HELP_TOPICS)).toBe(true);
    expect(HELP_TOPICS.length).toBeGreaterThan(0);

    // All topics should have id, label, and command
    for (const topic of HELP_TOPICS) {
      expect(topic.id).toBeDefined();
      expect(topic.label).toBeDefined();
      expect(topic.command).toBeDefined();
    }
  });

  it("should have all slash commands starting with /", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.label.startsWith("/")).toBe(true);
    }
  });

  it("should contain essential commands", () => {
    const commands = HELP_TOPICS.map((t) => t.command);
    expect(commands).toContain("sessions");
    expect(commands).toContain("pause");
    expect(commands).toContain("resume");
    expect(commands).toContain("feature");
    expect(commands).toContain("help");
    expect(commands).toContain("exit");
  });

  it("should have content for all commands", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.content).toBeDefined();
      expect(Array.isArray(topic.content)).toBe(true);
      expect(topic.content!.length).toBeGreaterThan(0);
    }
  });

  it("should have descriptions for all commands", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.description).toBeDefined();
      expect(topic.description!.length).toBeGreaterThan(0);
    }
  });
});

describe("findTopicById", () => {
  it("should find a topic by its ID", () => {
    const result = findTopicById(HELP_TOPICS, "cmd-sessions");
    expect(result).toBeDefined();
    expect(result!.label).toBe("/sessions");
  });

  it("should find the feature command", () => {
    const result = findTopicById(HELP_TOPICS, "cmd-feature");
    expect(result).toBeDefined();
    expect(result!.command).toBe("feature");
  });

  it("should return null for non-existent topic", () => {
    const result = findTopicById(HELP_TOPICS, "non-existent");
    expect(result).toBe(null);
  });

  it("should return null for empty topic ID", () => {
    const result = findTopicById(HELP_TOPICS, "");
    expect(result).toBe(null);
  });
});

describe("findTopicByCommand", () => {
  it("should find a topic by command name", () => {
    const result = findTopicByCommand(HELP_TOPICS, "sessions");
    expect(result).toBeDefined();
    expect(result!.label).toBe("/sessions");
  });

  it("should find the help command", () => {
    const result = findTopicByCommand(HELP_TOPICS, "help");
    expect(result).toBeDefined();
    expect(result!.id).toBe("cmd-help");
  });

  it("should return null for non-existent command", () => {
    const result = findTopicByCommand(HELP_TOPICS, "nonexistent");
    expect(result).toBe(null);
  });
});

describe("searchTopics", () => {
  it("should find topics by label", () => {
    const result = searchTopics(HELP_TOPICS, "feature");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((t) => t.label.toLowerCase().includes("feature"))).toBe(
      true
    );
  });

  it("should find topics by description", () => {
    const result = searchTopics(HELP_TOPICS, "session");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should find topics by command name", () => {
    const result = searchTopics(HELP_TOPICS, "sessions");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((t) => t.command === "sessions")).toBe(true);
  });

  it("should be case-insensitive", () => {
    const lower = searchTopics(HELP_TOPICS, "feature");
    const upper = searchTopics(HELP_TOPICS, "FEATURE");
    const mixed = searchTopics(HELP_TOPICS, "Feature");

    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });

  it("should return empty array for no matches", () => {
    const result = searchTopics(HELP_TOPICS, "xyznonexistent123");
    expect(result).toEqual([]);
  });

  it("should return all topics for empty query", () => {
    // Empty string matches everything in includes()
    const result = searchTopics(HELP_TOPICS, "");
    expect(result.length).toBe(HELP_TOPICS.length);
  });
});
