/**
 * Help State Tests
 *
 * Tests for the help state management system.
 */

import { describe, it, expect } from "bun:test";
import {
  HelpScreen,
  DEFAULT_HELP_STATE,
  getScreenLabel,
  getScreenFromTopicId,
  type HelpState,
} from "../../../src/tui/state/help-state.js";

describe("HelpScreen enum", () => {
  it("should define all expected screen types", () => {
    expect(HelpScreen.OVERVIEW).toBe("overview");
    expect(HelpScreen.COMMANDS).toBe("commands");
    expect(HelpScreen.CONCEPT_AGENTS).toBe("concept-agents");
    expect(HelpScreen.CONCEPT_SKILLS).toBe("concept-skills");
    expect(HelpScreen.CONCEPT_STAGES).toBe("concept-stages");
    expect(HelpScreen.CONCEPT_GATES).toBe("concept-gates");
    expect(HelpScreen.CONCEPT_WORKTREES).toBe("concept-worktrees");
    expect(HelpScreen.SHORTCUTS).toBe("shortcuts");
    expect(HelpScreen.GETTING_STARTED).toBe("getting-started");
    expect(HelpScreen.QUICK_START).toBe("quick-start");
    expect(HelpScreen.FIRST_FEATURE).toBe("first-feature");
    expect(HelpScreen.UNDERSTANDING_WORKFLOWS).toBe("understanding-workflows");
  });
});

describe("DEFAULT_HELP_STATE", () => {
  it("should have correct initial values", () => {
    expect(DEFAULT_HELP_STATE.isOpen).toBe(false);
    expect(DEFAULT_HELP_STATE.currentScreen).toBe(HelpScreen.OVERVIEW);
    expect(DEFAULT_HELP_STATE.selectedTopic).toBe(null);
    expect(DEFAULT_HELP_STATE.breadcrumb).toEqual(["Help"]);
    expect(DEFAULT_HELP_STATE.scrollPosition).toBe(0);
    expect(DEFAULT_HELP_STATE.selectedIndex).toBe(0);
    expect(DEFAULT_HELP_STATE.isTreeFocused).toBe(true);
  });

  it("should be a valid HelpState object", () => {
    const state: HelpState = DEFAULT_HELP_STATE;
    expect(state).toBeDefined();
    expect(typeof state.isOpen).toBe("boolean");
    expect(typeof state.currentScreen).toBe("string");
  });
});

describe("getScreenLabel", () => {
  it("should return correct labels for all screens", () => {
    expect(getScreenLabel(HelpScreen.OVERVIEW)).toBe("Help Overview");
    expect(getScreenLabel(HelpScreen.COMMANDS)).toBe("Commands Reference");
    expect(getScreenLabel(HelpScreen.CONCEPT_AGENTS)).toBe("Agents & Roles");
    expect(getScreenLabel(HelpScreen.CONCEPT_SKILLS)).toBe("Skills");
    expect(getScreenLabel(HelpScreen.CONCEPT_STAGES)).toBe("Workflow Stages");
    expect(getScreenLabel(HelpScreen.CONCEPT_GATES)).toBe("Review Gates");
    expect(getScreenLabel(HelpScreen.CONCEPT_WORKTREES)).toBe("Git Worktrees");
    expect(getScreenLabel(HelpScreen.SHORTCUTS)).toBe("Keyboard Shortcuts");
    expect(getScreenLabel(HelpScreen.GETTING_STARTED)).toBe("Getting Started");
    expect(getScreenLabel(HelpScreen.QUICK_START)).toBe("Quick Start Guide");
    expect(getScreenLabel(HelpScreen.FIRST_FEATURE)).toBe("Your First Feature");
    expect(getScreenLabel(HelpScreen.UNDERSTANDING_WORKFLOWS)).toBe("Understanding Workflows");
  });

  it("should return the screen value for unknown screens", () => {
    expect(getScreenLabel("unknown" as HelpScreen)).toBe("unknown");
  });
});

describe("getScreenFromTopicId", () => {
  it("should map topic IDs to correct screens", () => {
    expect(getScreenFromTopicId("overview")).toBe(HelpScreen.OVERVIEW);
    expect(getScreenFromTopicId("commands")).toBe(HelpScreen.COMMANDS);
    expect(getScreenFromTopicId("concept-agents")).toBe(HelpScreen.CONCEPT_AGENTS);
    expect(getScreenFromTopicId("concept-skills")).toBe(HelpScreen.CONCEPT_SKILLS);
    expect(getScreenFromTopicId("concept-stages")).toBe(HelpScreen.CONCEPT_STAGES);
    expect(getScreenFromTopicId("concept-gates")).toBe(HelpScreen.CONCEPT_GATES);
    expect(getScreenFromTopicId("concept-worktrees")).toBe(HelpScreen.CONCEPT_WORKTREES);
    expect(getScreenFromTopicId("shortcuts")).toBe(HelpScreen.SHORTCUTS);
    expect(getScreenFromTopicId("getting-started")).toBe(HelpScreen.GETTING_STARTED);
    expect(getScreenFromTopicId("quick-start")).toBe(HelpScreen.QUICK_START);
    expect(getScreenFromTopicId("first-feature")).toBe(HelpScreen.FIRST_FEATURE);
    expect(getScreenFromTopicId("understanding-workflows")).toBe(HelpScreen.UNDERSTANDING_WORKFLOWS);
  });

  it("should return null for unknown topic IDs", () => {
    expect(getScreenFromTopicId("unknown")).toBe(null);
    expect(getScreenFromTopicId("")).toBe(null);
    expect(getScreenFromTopicId("random-topic")).toBe(null);
  });
});
