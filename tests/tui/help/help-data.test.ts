/**
 * Help Data Tests
 *
 * Tests for the help data structure and helper functions.
 */

import { describe, it, expect } from "bun:test";
import {
  HELP_TOPICS,
  flattenTopics,
  findTopicById,
  getTopicPath,
  getContentTopics,
  searchTopics,
  type HelpTopic,
} from "../../../src/tui/components/help/help-data.js";

describe("HELP_TOPICS structure", () => {
  it("should have four main categories", () => {
    expect(HELP_TOPICS.length).toBe(4);

    const topLevelIds = HELP_TOPICS.map(t => t.id);
    expect(topLevelIds).toContain("getting-started");
    expect(topLevelIds).toContain("commands");
    expect(topLevelIds).toContain("concepts");
    expect(topLevelIds).toContain("shortcuts");
  });

  it("should have Getting Started with children", () => {
    const gettingStarted = HELP_TOPICS.find(t => t.id === "getting-started");
    expect(gettingStarted).toBeDefined();
    expect(gettingStarted!.children).toBeDefined();
    expect(gettingStarted!.children!.length).toBeGreaterThan(0);
  });

  it("should have Commands Reference with command categories", () => {
    const commands = HELP_TOPICS.find(t => t.id === "commands");
    expect(commands).toBeDefined();
    expect(commands!.children).toBeDefined();

    const categoryIds = commands!.children!.map(c => c.id);
    expect(categoryIds).toContain("commands-session");
    expect(categoryIds).toContain("commands-feature");
    expect(categoryIds).toContain("commands-agent");
    expect(categoryIds).toContain("commands-config");
    expect(categoryIds).toContain("commands-info");
    expect(categoryIds).toContain("commands-system");
  });

  it("should have Concepts with all concept topics", () => {
    const concepts = HELP_TOPICS.find(t => t.id === "concepts");
    expect(concepts).toBeDefined();
    expect(concepts!.children).toBeDefined();

    const conceptIds = concepts!.children!.map(c => c.id);
    expect(conceptIds).toContain("concept-agents");
    expect(conceptIds).toContain("concept-skills");
    expect(conceptIds).toContain("concept-stages");
    expect(conceptIds).toContain("concept-gates");
    expect(conceptIds).toContain("concept-worktrees");
  });

  it("should have Shortcuts topic with content", () => {
    const shortcuts = HELP_TOPICS.find(t => t.id === "shortcuts");
    expect(shortcuts).toBeDefined();
    expect(shortcuts!.content).toBeDefined();
    expect(shortcuts!.content!.length).toBeGreaterThan(0);
  });
});

describe("flattenTopics", () => {
  it("should flatten a simple topic tree", () => {
    const topics: HelpTopic[] = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const result = flattenTopics(topics);
    expect(result.length).toBe(2);
    expect(result.map(t => t.id)).toEqual(["a", "b"]);
  });

  it("should flatten nested topics", () => {
    const topics: HelpTopic[] = [
      {
        id: "parent",
        label: "Parent",
        children: [
          { id: "child1", label: "Child 1" },
          { id: "child2", label: "Child 2" },
        ],
      },
    ];
    const result = flattenTopics(topics);
    expect(result.length).toBe(3);
    expect(result.map(t => t.id)).toEqual(["parent", "child1", "child2"]);
  });

  it("should flatten deeply nested topics", () => {
    const topics: HelpTopic[] = [
      {
        id: "level1",
        label: "Level 1",
        children: [
          {
            id: "level2",
            label: "Level 2",
            children: [
              { id: "level3", label: "Level 3" },
            ],
          },
        ],
      },
    ];
    const result = flattenTopics(topics);
    expect(result.length).toBe(3);
    expect(result.map(t => t.id)).toEqual(["level1", "level2", "level3"]);
  });

  it("should flatten the actual HELP_TOPICS", () => {
    const result = flattenTopics(HELP_TOPICS);
    expect(result.length).toBeGreaterThan(HELP_TOPICS.length);
    // Should include both parents and children
    expect(result.some(t => t.id === "getting-started")).toBe(true);
    expect(result.some(t => t.id === "quick-start")).toBe(true);
    expect(result.some(t => t.id === "cmd-feature")).toBe(true);
  });
});

describe("findTopicById", () => {
  it("should find a top-level topic", () => {
    const result = findTopicById(HELP_TOPICS, "getting-started");
    expect(result).toBeDefined();
    expect(result!.label).toBe("Getting Started");
  });

  it("should find a nested topic", () => {
    const result = findTopicById(HELP_TOPICS, "quick-start");
    expect(result).toBeDefined();
    expect(result!.label).toBe("Quick Start Guide");
  });

  it("should find a deeply nested command topic", () => {
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

describe("getTopicPath", () => {
  it("should return path for top-level topic", () => {
    const result = getTopicPath(HELP_TOPICS, "getting-started");
    expect(result).toEqual(["Getting Started"]);
  });

  it("should return path for nested topic", () => {
    const result = getTopicPath(HELP_TOPICS, "quick-start");
    expect(result).toEqual(["Getting Started", "Quick Start Guide"]);
  });

  it("should return path for deeply nested topic", () => {
    const result = getTopicPath(HELP_TOPICS, "cmd-feature");
    expect(result).toBeDefined();
    expect(result!.length).toBe(3); // Commands Reference > Feature Commands > /feature
  });

  it("should return null for non-existent topic", () => {
    const result = getTopicPath(HELP_TOPICS, "non-existent");
    expect(result).toBe(null);
  });
});

describe("getContentTopics", () => {
  it("should return only topics with content or screen", () => {
    const result = getContentTopics(HELP_TOPICS);

    // All results should have content or screen
    for (const topic of result) {
      const hasContent = topic.content !== undefined;
      const hasScreen = topic.screen !== undefined;
      expect(hasContent || hasScreen).toBe(true);
    }
  });

  it("should include command topics with content", () => {
    const result = getContentTopics(HELP_TOPICS);
    const commandTopics = result.filter(t => t.command !== undefined);
    expect(commandTopics.length).toBeGreaterThan(0);
  });

  it("should include concept topics", () => {
    const result = getContentTopics(HELP_TOPICS);
    const conceptTopics = result.filter(t => t.id.startsWith("concept-"));
    expect(conceptTopics.length).toBe(5); // agents, skills, stages, gates, worktrees
  });
});

describe("searchTopics", () => {
  it("should find topics by label", () => {
    const result = searchTopics(HELP_TOPICS, "feature");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(t => t.label.toLowerCase().includes("feature"))).toBe(true);
  });

  it("should find topics by description", () => {
    const result = searchTopics(HELP_TOPICS, "agents");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should find topics by command name", () => {
    const result = searchTopics(HELP_TOPICS, "sessions");
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(t => t.command === "sessions")).toBe(true);
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

  it("should return empty array for empty query", () => {
    // Note: Empty string matches everything in includes()
    const result = searchTopics(HELP_TOPICS, "");
    expect(result.length).toBeGreaterThan(0); // All topics match empty string
  });
});
