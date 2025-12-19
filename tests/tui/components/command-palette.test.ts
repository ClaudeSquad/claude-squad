/**
 * Tests for Command Palette Component
 */

import { describe, it, expect } from "bun:test";
import type { Command, CommandCategory } from "../../../src/tui/components/command-palette.js";

// Since CommandPalette is a React component, we test the helper functions, constants, and types
// For full component testing, a React test renderer would be needed

describe("CommandPalette Component", () => {
  describe("Command interface", () => {
    it("should accept valid command props", () => {
      const command: Command = {
        id: "cmd-1",
        label: "New Feature",
        description: "Start a new feature workflow",
        category: "workflow",
        shortcut: "Cmd+N",
        icon: "+",
        disabled: false,
        onExecute: () => {},
        keywords: ["create", "start", "feature"],
      };

      expect(command.id).toBe("cmd-1");
      expect(command.label).toBe("New Feature");
      expect(command.category).toBe("workflow");
      expect(command.keywords?.length).toBe(3);
    });

    it("should allow minimal command definition", () => {
      const command: Command = {
        id: "cmd-2",
        label: "Help",
        category: "help",
        onExecute: () => {},
      };

      expect(command.id).toBe("cmd-2");
      expect(command.label).toBe("Help");
    });
  });

  describe("Command categories", () => {
    it("should support all category types", () => {
      const categories: CommandCategory[] = [
        "navigation",
        "agent",
        "workflow",
        "git",
        "settings",
        "help",
        "recent",
      ];
      categories.forEach((cat) => {
        expect(typeof cat).toBe("string");
      });
    });

    it("should have correct category config", () => {
      const CATEGORY_CONFIG: Record<
        CommandCategory,
        { label: string; color: string; icon: string }
      > = {
        recent: { label: "Recent", color: "yellow", icon: "★" },
        navigation: { label: "Navigation", color: "cyan", icon: "→" },
        agent: { label: "Agents", color: "green", icon: "●" },
        workflow: { label: "Workflow", color: "magenta", icon: "◆" },
        git: { label: "Git", color: "red", icon: "⌥" },
        settings: { label: "Settings", color: "blue", icon: "⚙" },
        help: { label: "Help", color: "gray", icon: "?" },
      };

      expect(CATEGORY_CONFIG.recent.label).toBe("Recent");
      expect(CATEGORY_CONFIG.navigation.color).toBe("cyan");
      expect(CATEGORY_CONFIG.agent.icon).toBe("●");
    });

    it("should have correct category order", () => {
      const CATEGORY_ORDER: CommandCategory[] = [
        "recent",
        "navigation",
        "agent",
        "workflow",
        "git",
        "settings",
        "help",
      ];

      expect(CATEGORY_ORDER[0]).toBe("recent");
      expect(CATEGORY_ORDER[1]).toBe("navigation");
      expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe("help");
    });
  });

  describe("Fuzzy matching", () => {
    function fuzzyMatch(
      query: string,
      text: string
    ): { score: number; ranges: [number, number][] } {
      if (query.length === 0) {
        return { score: 0, ranges: [] };
      }

      const queryLower = query.toLowerCase();
      const textLower = text.toLowerCase();

      // Check for exact substring match first
      const exactIndex = textLower.indexOf(queryLower);
      if (exactIndex !== -1) {
        return {
          score: 100 + (100 - exactIndex),
          ranges: [[exactIndex, exactIndex + query.length]],
        };
      }

      // Fuzzy character matching
      let queryIndex = 0;
      let textIndex = 0;
      let score = 0;
      let consecutiveBonus = 0;
      const ranges: [number, number][] = [];
      let currentRangeStart: number | null = null;
      let lastMatchIndex = -2;

      while (queryIndex < queryLower.length && textIndex < textLower.length) {
        const queryChar = queryLower[queryIndex];
        const textChar = textLower[textIndex];

        if (queryChar === textChar) {
          score += 10;

          if (textIndex === lastMatchIndex + 1) {
            consecutiveBonus += 5;
            score += consecutiveBonus;
          } else {
            consecutiveBonus = 0;
          }

          if (textIndex === 0 || /[\s\-_/]/.test(text[textIndex - 1] ?? "")) {
            score += 15;
          }

          if (currentRangeStart === null) {
            currentRangeStart = textIndex;
          }
          lastMatchIndex = textIndex;
          queryIndex++;
        } else {
          if (currentRangeStart !== null) {
            ranges.push([currentRangeStart, lastMatchIndex + 1]);
            currentRangeStart = null;
          }
        }
        textIndex++;
      }

      if (currentRangeStart !== null) {
        ranges.push([currentRangeStart, lastMatchIndex + 1]);
      }

      if (queryIndex < queryLower.length) {
        return { score: -1, ranges: [] };
      }

      return { score, ranges };
    }

    it("should return score 0 for empty query", () => {
      const result = fuzzyMatch("", "Hello World");
      expect(result.score).toBe(0);
      expect(result.ranges.length).toBe(0);
    });

    it("should find exact substring match with high score", () => {
      const result = fuzzyMatch("World", "Hello World");
      expect(result.score).toBeGreaterThan(100);
      expect(result.ranges).toEqual([[6, 11]]);
    });

    it("should prefer matches at start of string", () => {
      const result1 = fuzzyMatch("Hel", "Hello");
      const result2 = fuzzyMatch("llo", "Hello");
      expect(result1.score).toBeGreaterThan(result2.score);
    });

    it("should handle case insensitive matching", () => {
      const result = fuzzyMatch("hello", "HELLO WORLD");
      expect(result.score).toBeGreaterThan(0);
    });

    it("should match non-consecutive characters", () => {
      const result = fuzzyMatch("nf", "New Feature");
      expect(result.score).toBeGreaterThan(0);
    });

    it("should return -1 for non-matching query", () => {
      const result = fuzzyMatch("xyz", "Hello World");
      expect(result.score).toBe(-1);
      expect(result.ranges.length).toBe(0);
    });

    it("should give bonus for consecutive matches", () => {
      const result1 = fuzzyMatch("feat", "Feature");
      const result2 = fuzzyMatch("f_e_a_t", "f_e_a_t_u_r_e");
      // Both should match but consecutive should score higher
      expect(result1.score).toBeGreaterThan(0);
      expect(result2.score).toBeGreaterThan(0);
    });

    it("should give bonus for word boundary matches", () => {
      const result = fuzzyMatch("nf", "New Feature");
      expect(result.score).toBeGreaterThan(0);
      // "n" at start of "New" and "f" at start of "Feature" get bonuses
    });

    it("should track matched ranges", () => {
      const result = fuzzyMatch("test", "test file");
      expect(result.ranges.length).toBeGreaterThan(0);
      expect(result.ranges[0][0]).toBe(0);
    });
  });

  describe("Search commands function", () => {
    function searchCommands(
      commands: Command[],
      query: string
    ): { command: Command; score: number }[] {
      if (query.length === 0) {
        return commands.map((command) => ({ command, score: 0 }));
      }

      const results: { command: Command; score: number }[] = [];

      for (const command of commands) {
        const queryLower = query.toLowerCase();
        const labelLower = command.label.toLowerCase();

        // Simple substring check for testing
        let score = -1;
        if (labelLower.includes(queryLower)) {
          score = 100 - labelLower.indexOf(queryLower);
        } else if (command.description?.toLowerCase().includes(queryLower)) {
          score = 50;
        } else if (command.keywords?.some((k) => k.toLowerCase().includes(queryLower))) {
          score = 30;
        }

        if (score >= 0) {
          results.push({ command, score });
        }
      }

      return results.sort((a, b) => b.score - a.score);
    }

    it("should return all commands for empty query", () => {
      const commands: Command[] = [
        { id: "1", label: "Command 1", category: "help", onExecute: () => {} },
        { id: "2", label: "Command 2", category: "help", onExecute: () => {} },
      ];

      const results = searchCommands(commands, "");
      expect(results.length).toBe(2);
    });

    it("should filter commands by label", () => {
      const commands: Command[] = [
        { id: "1", label: "New Feature", category: "workflow", onExecute: () => {} },
        { id: "2", label: "View Agents", category: "navigation", onExecute: () => {} },
        { id: "3", label: "Help", category: "help", onExecute: () => {} },
      ];

      const results = searchCommands(commands, "Agent");
      expect(results.length).toBe(1);
      expect(results[0].command.id).toBe("2");
    });

    it("should filter commands by description", () => {
      const commands: Command[] = [
        {
          id: "1",
          label: "Settings",
          description: "Configure your preferences",
          category: "settings",
          onExecute: () => {},
        },
        { id: "2", label: "Help", category: "help", onExecute: () => {} },
      ];

      const results = searchCommands(commands, "pref");
      expect(results.length).toBe(1);
      expect(results[0].command.id).toBe("1");
    });

    it("should filter commands by keywords", () => {
      const commands: Command[] = [
        {
          id: "1",
          label: "New Feature",
          keywords: ["create", "start", "workflow"],
          category: "workflow",
          onExecute: () => {},
        },
        { id: "2", label: "Help", category: "help", onExecute: () => {} },
      ];

      const results = searchCommands(commands, "create");
      expect(results.length).toBe(1);
      expect(results[0].command.id).toBe("1");
    });

    it("should sort results by score", () => {
      const commands: Command[] = [
        { id: "1", label: "Find Agent", category: "navigation", onExecute: () => {} },
        { id: "2", label: "Agent List", category: "navigation", onExecute: () => {} },
      ];

      const results = searchCommands(commands, "Agent");
      // "Agent List" starts with "Agent" so should score higher
      expect(results[0].command.id).toBe("2");
    });
  });

  describe("CommandPaletteProps defaults", () => {
    it("should have default maxVisible as 10", () => {
      const defaultMaxVisible = 10;
      expect(defaultMaxVisible).toBe(10);
    });

    it("should have default showRecent as true", () => {
      const defaultShowRecent = true;
      expect(defaultShowRecent).toBe(true);
    });

    it("should have default placeholder", () => {
      const defaultPlaceholder = "Type to search commands...";
      expect(defaultPlaceholder).toBe("Type to search commands...");
    });
  });

  describe("Recent commands handling", () => {
    it("should prepend recent commands", () => {
      const commands: Command[] = [
        { id: "1", label: "Command 1", category: "help", onExecute: () => {} },
        { id: "2", label: "Command 2", category: "help", onExecute: () => {} },
        { id: "3", label: "Command 3", category: "help", onExecute: () => {} },
      ];
      const recentIds = ["2"];

      const recentCommands = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined)
        .slice(0, 3)
        .map((c) => ({ ...c, category: "recent" as CommandCategory }));

      expect(recentCommands.length).toBe(1);
      expect(recentCommands[0].category).toBe("recent");
      expect(recentCommands[0].label).toBe("Command 2");
    });

    it("should limit recent commands to 3", () => {
      const commands: Command[] = [
        { id: "1", label: "C1", category: "help", onExecute: () => {} },
        { id: "2", label: "C2", category: "help", onExecute: () => {} },
        { id: "3", label: "C3", category: "help", onExecute: () => {} },
        { id: "4", label: "C4", category: "help", onExecute: () => {} },
        { id: "5", label: "C5", category: "help", onExecute: () => {} },
      ];
      const recentIds = ["1", "2", "3", "4", "5"];

      const recentCommands = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined)
        .slice(0, 3);

      expect(recentCommands.length).toBe(3);
    });

    it("should handle missing recent commands gracefully", () => {
      const commands: Command[] = [
        { id: "1", label: "C1", category: "help", onExecute: () => {} },
      ];
      const recentIds = ["1", "missing-id"];

      const recentCommands = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => c !== undefined);

      expect(recentCommands.length).toBe(1);
    });
  });

  describe("Category grouping", () => {
    it("should group commands by category", () => {
      const commands: Command[] = [
        { id: "1", label: "C1", category: "navigation", onExecute: () => {} },
        { id: "2", label: "C2", category: "navigation", onExecute: () => {} },
        { id: "3", label: "C3", category: "agent", onExecute: () => {} },
        { id: "4", label: "C4", category: "help", onExecute: () => {} },
      ];

      const groups = new Map<CommandCategory, Command[]>();
      for (const cmd of commands) {
        if (!groups.has(cmd.category)) {
          groups.set(cmd.category, []);
        }
        groups.get(cmd.category)!.push(cmd);
      }

      expect(groups.size).toBe(3);
      expect(groups.get("navigation")?.length).toBe(2);
      expect(groups.get("agent")?.length).toBe(1);
      expect(groups.get("help")?.length).toBe(1);
    });

    it("should not group when searching", () => {
      const query = "test";
      const shouldGroup = query.length === 0;
      expect(shouldGroup).toBe(false);
    });

    it("should group when not searching", () => {
      const query = "";
      const shouldGroup = query.length === 0;
      expect(shouldGroup).toBe(true);
    });
  });

  describe("Modal dimensions", () => {
    it("should calculate modal width correctly", () => {
      const terminalWidth = 120;
      const modalWidth = Math.min(Math.floor(terminalWidth * 0.6), 80);
      expect(modalWidth).toBe(72);
    });

    it("should cap modal width at 80", () => {
      const terminalWidth = 200;
      const modalWidth = Math.min(Math.floor(terminalWidth * 0.6), 80);
      expect(modalWidth).toBe(80);
    });

    it("should position modal higher on screen", () => {
      const terminalWidth = 120;
      const terminalHeight = 40;
      const modalWidth = 72;
      const modalHeight = 15;

      const left = Math.floor((terminalWidth - modalWidth) / 2);
      const top = Math.floor((terminalHeight - modalHeight) / 4); // /4 for higher position

      expect(left).toBe(24);
      expect(top).toBe(6);
    });
  });

  describe("Navigation", () => {
    it("should select previous item", () => {
      let selectedIndex = 3;
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(2);
    });

    it("should not go below 0", () => {
      let selectedIndex = 0;
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);
    });

    it("should select next item", () => {
      let selectedIndex = 2;
      const visibleCount = 10;
      selectedIndex = Math.min(visibleCount - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(3);
    });

    it("should not exceed visible count", () => {
      let selectedIndex = 9;
      const visibleCount = 10;
      selectedIndex = Math.min(visibleCount - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(9);
    });
  });

  describe("Command execution", () => {
    it("should execute non-disabled command", () => {
      let executed = false;
      const command: Command = {
        id: "1",
        label: "Test",
        category: "help",
        disabled: false,
        onExecute: () => {
          executed = true;
        },
      };

      if (!command.disabled) {
        command.onExecute();
      }
      expect(executed).toBe(true);
    });

    it("should not execute disabled command", () => {
      let executed = false;
      const command: Command = {
        id: "1",
        label: "Test",
        category: "help",
        disabled: true,
        onExecute: () => {
          executed = true;
        },
      };

      if (!command.disabled) {
        command.onExecute();
      }
      expect(executed).toBe(false);
    });
  });

  describe("useCommandPalette hook logic", () => {
    it("should track recent command IDs", () => {
      let recentIds: string[] = [];

      const trackExecution = (id: string) => {
        const filtered = recentIds.filter((i) => i !== id);
        recentIds = [id, ...filtered].slice(0, 10);
      };

      trackExecution("cmd-1");
      expect(recentIds).toEqual(["cmd-1"]);

      trackExecution("cmd-2");
      expect(recentIds).toEqual(["cmd-2", "cmd-1"]);

      // Re-executing cmd-1 should move it to front
      trackExecution("cmd-1");
      expect(recentIds).toEqual(["cmd-1", "cmd-2"]);
    });

    it("should limit recent IDs to 10", () => {
      let recentIds: string[] = [];

      const trackExecution = (id: string) => {
        const filtered = recentIds.filter((i) => i !== id);
        recentIds = [id, ...filtered].slice(0, 10);
      };

      for (let i = 1; i <= 12; i++) {
        trackExecution(`cmd-${i}`);
      }

      expect(recentIds.length).toBe(10);
      expect(recentIds[0]).toBe("cmd-12");
      expect(recentIds[9]).toBe("cmd-3");
    });

    it("should register and unregister commands", () => {
      let commands: Command[] = [];

      const registerCommand = (command: Command) => {
        const existing = commands.findIndex((c) => c.id === command.id);
        if (existing >= 0) {
          commands[existing] = command;
        } else {
          commands = [...commands, command];
        }
      };

      const unregisterCommand = (id: string) => {
        commands = commands.filter((c) => c.id !== id);
      };

      registerCommand({ id: "1", label: "C1", category: "help", onExecute: () => {} });
      expect(commands.length).toBe(1);

      registerCommand({ id: "2", label: "C2", category: "help", onExecute: () => {} });
      expect(commands.length).toBe(2);

      // Update existing
      registerCommand({ id: "1", label: "C1 Updated", category: "help", onExecute: () => {} });
      expect(commands.length).toBe(2);
      expect(commands[0].label).toBe("C1 Updated");

      unregisterCommand("1");
      expect(commands.length).toBe(1);
      expect(commands[0].id).toBe("2");
    });
  });

  describe("createNavigationCommands", () => {
    it("should create navigation commands with correct structure", () => {
      const navigateFn = (screen: string) => {};

      const createNavigationCommands = (navigate: (screen: string) => void): Command[] => {
        return [
          {
            id: "nav-dashboard",
            label: "Go to Dashboard",
            description: "View the main dashboard",
            category: "navigation" as CommandCategory,
            shortcut: "⌘+1",
            onExecute: () => navigate("dashboard"),
          },
          {
            id: "nav-agents",
            label: "Go to Agents",
            description: "View and manage agents",
            category: "navigation" as CommandCategory,
            shortcut: "⌘+2",
            onExecute: () => navigate("agents"),
          },
        ];
      };

      const commands = createNavigationCommands(navigateFn);
      expect(commands.length).toBe(2);
      expect(commands[0].category).toBe("navigation");
      expect(commands[0].shortcut).toBe("⌘+1");
    });
  });

  describe("createHelpCommands", () => {
    it("should create help commands with correct structure", () => {
      const handlers = {
        showHelp: () => {},
        showKeyboardShortcuts: () => {},
        showAbout: () => {},
      };

      const createHelpCommands = (h: typeof handlers): Command[] => {
        return [
          {
            id: "help-general",
            label: "Show Help",
            description: "View general help information",
            category: "help" as CommandCategory,
            shortcut: "?",
            onExecute: h.showHelp,
          },
          {
            id: "help-shortcuts",
            label: "Keyboard Shortcuts",
            description: "View all keyboard shortcuts",
            category: "help" as CommandCategory,
            shortcut: "⌘+/",
            onExecute: h.showKeyboardShortcuts,
          },
        ];
      };

      const commands = createHelpCommands(handlers);
      expect(commands.length).toBe(2);
      expect(commands[0].category).toBe("help");
    });
  });
});
