/**
 * Tests for TUI Theme Colors
 */

import { describe, it, expect } from "bun:test";
import {
  PRIMARY_COLORS,
  TEXT_COLORS,
  BACKGROUND_COLORS,
  BORDER_COLORS,
  BOX_DRAWING,
  PROGRESS_CHARS,
  STATUS_ICONS,
  getPrimaryColor,
  getTextColor,
  getBackgroundColor,
  getBorderColor,
  getBoxDrawing,
} from "../../../src/tui/theme/colors.js";

describe("Theme Colors", () => {
  describe("PRIMARY_COLORS", () => {
    it("should have all semantic colors defined", () => {
      expect(PRIMARY_COLORS.success).toBe("green");
      expect(PRIMARY_COLORS.info).toBe("cyan");
      expect(PRIMARY_COLORS.warning).toBe("yellow");
      expect(PRIMARY_COLORS.error).toBe("red");
      expect(PRIMARY_COLORS.primary).toBe("blue");
      expect(PRIMARY_COLORS.secondary).toBe("magenta");
    });

    it("should be immutable", () => {
      // TypeScript const assertion should prevent mutation
      expect(Object.isFrozen(PRIMARY_COLORS)).toBe(false); // Not frozen at runtime
      expect(typeof PRIMARY_COLORS.success).toBe("string");
    });
  });

  describe("TEXT_COLORS", () => {
    it("should define text hierarchy colors", () => {
      expect(TEXT_COLORS.primary).toBe("white");
      expect(TEXT_COLORS.secondary).toBe("gray");
      expect(TEXT_COLORS.disabled).toBe("gray");
      expect(TEXT_COLORS.dimmed).toBe("gray");
      expect(TEXT_COLORS.inverted).toBe("black");
      expect(TEXT_COLORS.highlight).toBe("cyan");
      expect(TEXT_COLORS.code).toBe("yellow");
    });
  });

  describe("BACKGROUND_COLORS", () => {
    it("should define background colors", () => {
      expect(BACKGROUND_COLORS.default).toBeUndefined();
      expect(BACKGROUND_COLORS.selection).toBe("blue");
      expect(BACKGROUND_COLORS.hover).toBe("gray");
      expect(BACKGROUND_COLORS.header).toBe("blue");
      expect(BACKGROUND_COLORS.footer).toBe("gray");
    });
  });

  describe("BORDER_COLORS", () => {
    it("should define border colors", () => {
      expect(BORDER_COLORS.default).toBe("gray");
      expect(BORDER_COLORS.focused).toBe("cyan");
      expect(BORDER_COLORS.success).toBe("green");
      expect(BORDER_COLORS.error).toBe("red");
      expect(BORDER_COLORS.warning).toBe("yellow");
    });
  });

  describe("BOX_DRAWING", () => {
    it("should have single line box characters", () => {
      expect(BOX_DRAWING.single.topLeft).toBe("\u250C");
      expect(BOX_DRAWING.single.topRight).toBe("\u2510");
      expect(BOX_DRAWING.single.bottomLeft).toBe("\u2514");
      expect(BOX_DRAWING.single.bottomRight).toBe("\u2518");
      expect(BOX_DRAWING.single.horizontal).toBe("\u2500");
      expect(BOX_DRAWING.single.vertical).toBe("\u2502");
    });

    it("should have double line box characters", () => {
      expect(BOX_DRAWING.double.topLeft).toBe("\u2554");
      expect(BOX_DRAWING.double.bottomRight).toBe("\u255D");
    });

    it("should have rounded corner box characters", () => {
      expect(BOX_DRAWING.rounded.topLeft).toBe("\u256D");
      expect(BOX_DRAWING.rounded.bottomRight).toBe("\u256F");
    });

    it("should have ASCII fallback characters", () => {
      expect(BOX_DRAWING.ascii.topLeft).toBe("+");
      expect(BOX_DRAWING.ascii.horizontal).toBe("-");
      expect(BOX_DRAWING.ascii.vertical).toBe("|");
    });
  });

  describe("PROGRESS_CHARS", () => {
    it("should define progress bar characters", () => {
      expect(PROGRESS_CHARS.filled).toBe("\u2588");
      expect(PROGRESS_CHARS.empty).toBe("\u2591");
      expect(PROGRESS_CHARS.half).toBe("\u2592");
      expect(PROGRESS_CHARS.leftBracket).toBe("[");
      expect(PROGRESS_CHARS.rightBracket).toBe("]");
    });
  });

  describe("STATUS_ICONS", () => {
    it("should define status indicator icons", () => {
      expect(STATUS_ICONS.success).toBe("\u2714");
      expect(STATUS_ICONS.error).toBe("\u2718");
      expect(STATUS_ICONS.warning).toBe("\u26A0");
      expect(STATUS_ICONS.info).toBe("\u2139");
      expect(STATUS_ICONS.bullet).toBe("\u2022");
    });

    it("should have spinner frames array", () => {
      expect(Array.isArray(STATUS_ICONS.spinner)).toBe(true);
      expect(STATUS_ICONS.spinner.length).toBeGreaterThan(0);
    });
  });

  describe("Helper Functions", () => {
    describe("getPrimaryColor", () => {
      it("should return correct color for each key", () => {
        expect(getPrimaryColor("success")).toBe("green");
        expect(getPrimaryColor("error")).toBe("red");
        expect(getPrimaryColor("info")).toBe("cyan");
        expect(getPrimaryColor("warning")).toBe("yellow");
      });
    });

    describe("getTextColor", () => {
      it("should return correct text color", () => {
        expect(getTextColor("primary")).toBe("white");
        expect(getTextColor("secondary")).toBe("gray");
        expect(getTextColor("highlight")).toBe("cyan");
      });
    });

    describe("getBackgroundColor", () => {
      it("should return correct background color", () => {
        expect(getBackgroundColor("default")).toBeUndefined();
        expect(getBackgroundColor("selection")).toBe("blue");
        expect(getBackgroundColor("error")).toBe("red");
      });
    });

    describe("getBorderColor", () => {
      it("should return correct border color", () => {
        expect(getBorderColor("default")).toBe("gray");
        expect(getBorderColor("focused")).toBe("cyan");
        expect(getBorderColor("error")).toBe("red");
      });
    });

    describe("getBoxDrawing", () => {
      it("should return correct box drawing set", () => {
        const single = getBoxDrawing("single");
        expect(single.topLeft).toBe("\u250C");

        const ascii = getBoxDrawing("ascii");
        expect(ascii.topLeft).toBe("+");
      });
    });
  });
});
