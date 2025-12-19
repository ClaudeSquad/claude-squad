/**
 * Tests for TUI Theme Index exports
 */

import { describe, it, expect } from "bun:test";
import {
  // Color exports
  PRIMARY_COLORS,
  TEXT_COLORS,
  BACKGROUND_COLORS,
  BORDER_COLORS,
  BOX_DRAWING,
  // Status exports
  STATUS_COLORS,
  AGENT_STATUS_COLORS,
  FEATURE_STATUS_COLORS,
  WORKFLOW_STAGE_COLORS,
  PRIORITY_COLORS,
  // Helper function exports
  getStatusColor,
  getAgentStatusColor,
  getPriorityColor,
  getProgressColor,
  // Theme config exports
  DEFAULT_THEME_CONFIG,
  ASCII_THEME_CONFIG,
  getBoxChars,
  getFocusedBoxChars,
} from "../../../src/tui/theme/index.js";

describe("Theme Index Exports", () => {
  describe("Color palette exports", () => {
    it("should export PRIMARY_COLORS", () => {
      expect(PRIMARY_COLORS).toBeDefined();
      expect(PRIMARY_COLORS.success).toBe("green");
    });

    it("should export TEXT_COLORS", () => {
      expect(TEXT_COLORS).toBeDefined();
      expect(TEXT_COLORS.primary).toBe("white");
    });

    it("should export BACKGROUND_COLORS", () => {
      expect(BACKGROUND_COLORS).toBeDefined();
      expect(BACKGROUND_COLORS.selection).toBe("blue");
    });

    it("should export BORDER_COLORS", () => {
      expect(BORDER_COLORS).toBeDefined();
      expect(BORDER_COLORS.focused).toBe("cyan");
    });

    it("should export BOX_DRAWING", () => {
      expect(BOX_DRAWING).toBeDefined();
      expect(BOX_DRAWING.single).toBeDefined();
      expect(BOX_DRAWING.double).toBeDefined();
      expect(BOX_DRAWING.ascii).toBeDefined();
    });
  });

  describe("Status color exports", () => {
    it("should export STATUS_COLORS", () => {
      expect(STATUS_COLORS).toBeDefined();
      expect(STATUS_COLORS.info).toBe("cyan");
    });

    it("should export AGENT_STATUS_COLORS", () => {
      expect(AGENT_STATUS_COLORS).toBeDefined();
      expect(AGENT_STATUS_COLORS.working).toBe("green");
    });

    it("should export FEATURE_STATUS_COLORS", () => {
      expect(FEATURE_STATUS_COLORS).toBeDefined();
      expect(FEATURE_STATUS_COLORS.in_progress).toBe("green");
    });

    it("should export WORKFLOW_STAGE_COLORS", () => {
      expect(WORKFLOW_STAGE_COLORS).toBeDefined();
      expect(WORKFLOW_STAGE_COLORS.completed).toBe("cyan");
    });

    it("should export PRIORITY_COLORS", () => {
      expect(PRIORITY_COLORS).toBeDefined();
      expect(PRIORITY_COLORS.urgent).toBe("red");
    });
  });

  describe("Helper function exports", () => {
    it("should export getStatusColor", () => {
      expect(typeof getStatusColor).toBe("function");
      expect(getStatusColor("success")).toBe("green");
    });

    it("should export getAgentStatusColor", () => {
      expect(typeof getAgentStatusColor).toBe("function");
      expect(getAgentStatusColor("working")).toBe("green");
    });

    it("should export getPriorityColor", () => {
      expect(typeof getPriorityColor).toBe("function");
      expect(getPriorityColor("urgent")).toBe("red");
    });

    it("should export getProgressColor", () => {
      expect(typeof getProgressColor).toBe("function");
      expect(getProgressColor(100)).toBe("green");
    });
  });

  describe("Theme Configuration", () => {
    describe("DEFAULT_THEME_CONFIG", () => {
      it("should have unicode enabled", () => {
        expect(DEFAULT_THEME_CONFIG.useUnicode).toBe(true);
      });

      it("should have bright colors enabled", () => {
        expect(DEFAULT_THEME_CONFIG.useBrightColors).toBe(true);
      });

      it("should have status icons enabled", () => {
        expect(DEFAULT_THEME_CONFIG.showStatusIcons).toBe(true);
      });
    });

    describe("ASCII_THEME_CONFIG", () => {
      it("should have unicode disabled", () => {
        expect(ASCII_THEME_CONFIG.useUnicode).toBe(false);
      });

      it("should have bright colors disabled", () => {
        expect(ASCII_THEME_CONFIG.useBrightColors).toBe(false);
      });

      it("should have status icons disabled", () => {
        expect(ASCII_THEME_CONFIG.showStatusIcons).toBe(false);
      });
    });

    describe("getBoxChars", () => {
      it("should return single box chars for default config", () => {
        const chars = getBoxChars(DEFAULT_THEME_CONFIG);
        expect(chars.topLeft).toBe("\u250C");
      });

      it("should return ASCII box chars when unicode disabled", () => {
        const chars = getBoxChars(ASCII_THEME_CONFIG);
        expect(chars.topLeft).toBe("+");
      });

      it("should use default config when no argument provided", () => {
        const chars = getBoxChars();
        expect(chars.topLeft).toBe("\u250C");
      });
    });

    describe("getFocusedBoxChars", () => {
      it("should return double box chars for default config", () => {
        const chars = getFocusedBoxChars(DEFAULT_THEME_CONFIG);
        expect(chars.topLeft).toBe("\u2554");
      });

      it("should return ASCII box chars when unicode disabled", () => {
        const chars = getFocusedBoxChars(ASCII_THEME_CONFIG);
        expect(chars.topLeft).toBe("+");
      });

      it("should use default config when no argument provided", () => {
        const chars = getFocusedBoxChars();
        expect(chars.topLeft).toBe("\u2554");
      });
    });
  });
});
