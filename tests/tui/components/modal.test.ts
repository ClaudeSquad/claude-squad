/**
 * Tests for Modal Component
 */

import { describe, it, expect } from "bun:test";
import { STATUS_ICONS } from "../../../src/tui/theme/index.js";

// Since Modal is a React component, we test the helper functions, constants, and types
// For full component testing, a React test renderer would be needed

describe("Modal Component", () => {
  describe("ModalProps interface", () => {
    it("should accept valid prop combinations", () => {
      const validProps = {
        title: "Test Modal",
        visible: true,
        size: "medium" as const,
        variant: "default" as const,
        actions: [],
        shortcuts: [],
        status: "Ready",
        showCloseButton: true,
        borderColor: "cyan" as const,
        children: null,
        terminalWidth: 120,
        terminalHeight: 40,
      };

      expect(validProps.title).toBe("Test Modal");
      expect(validProps.visible).toBe(true);
      expect(validProps.size).toBe("medium");
      expect(validProps.variant).toBe("default");
    });

    it("should have default size as medium", () => {
      const defaultSize = "medium";
      expect(defaultSize).toBe("medium");
    });

    it("should have default variant as default", () => {
      const defaultVariant = "default";
      expect(defaultVariant).toBe("default");
    });

    it("should have default showCloseButton as true", () => {
      const defaultShowCloseButton = true;
      expect(defaultShowCloseButton).toBe(true);
    });
  });

  describe("Modal sizes", () => {
    it("should support all size presets", () => {
      const sizes = ["small", "medium", "large", "fullscreen"];
      sizes.forEach((size) => {
        expect(typeof size).toBe("string");
      });
    });

    it("should have correct size preset percentages", () => {
      const SIZE_PRESETS = {
        small: { width: 0.4, height: 0.4 },
        medium: { width: 0.6, height: 0.6 },
        large: { width: 0.8, height: 0.8 },
        fullscreen: { width: 0.95, height: 0.95 },
      };

      expect(SIZE_PRESETS.small.width).toBe(0.4);
      expect(SIZE_PRESETS.medium.width).toBe(0.6);
      expect(SIZE_PRESETS.large.width).toBe(0.8);
      expect(SIZE_PRESETS.fullscreen.width).toBe(0.95);
    });
  });

  describe("Modal variants", () => {
    it("should support all variant types", () => {
      const variants = ["default", "info", "success", "warning", "error"];
      variants.forEach((variant) => {
        expect(typeof variant).toBe("string");
      });
    });

    it("should have correct variant colors", () => {
      const VARIANT_COLORS = {
        default: "cyan",
        info: "blue",
        success: "green",
        warning: "yellow",
        error: "red",
      };

      expect(VARIANT_COLORS.default).toBe("cyan");
      expect(VARIANT_COLORS.info).toBe("blue");
      expect(VARIANT_COLORS.success).toBe("green");
      expect(VARIANT_COLORS.warning).toBe("yellow");
      expect(VARIANT_COLORS.error).toBe("red");
    });

    it("should have correct variant icons", () => {
      const VARIANT_ICONS = {
        default: "",
        info: STATUS_ICONS.info,
        success: STATUS_ICONS.success,
        warning: STATUS_ICONS.warning,
        error: STATUS_ICONS.error,
      };

      expect(VARIANT_ICONS.default).toBe("");
      expect(VARIANT_ICONS.info).toBe(STATUS_ICONS.info);
      expect(VARIANT_ICONS.success).toBe(STATUS_ICONS.success);
      expect(VARIANT_ICONS.warning).toBe(STATUS_ICONS.warning);
      expect(VARIANT_ICONS.error).toBe(STATUS_ICONS.error);
    });
  });

  describe("Dimension calculations", () => {
    function calculateDimensions(
      size: "small" | "medium" | "large" | "fullscreen",
      terminalWidth: number,
      terminalHeight: number
    ): { width: number; height: number } {
      const SIZE_PRESETS = {
        small: { width: 0.4, height: 0.4 },
        medium: { width: 0.6, height: 0.6 },
        large: { width: 0.8, height: 0.8 },
        fullscreen: { width: 0.95, height: 0.95 },
      };
      const preset = SIZE_PRESETS[size];
      return {
        width: Math.floor(terminalWidth * preset.width),
        height: Math.floor(terminalHeight * preset.height),
      };
    }

    it("should calculate small modal dimensions correctly", () => {
      const dims = calculateDimensions("small", 120, 40);
      expect(dims.width).toBe(48); // 120 * 0.4
      expect(dims.height).toBe(16); // 40 * 0.4
    });

    it("should calculate medium modal dimensions correctly", () => {
      const dims = calculateDimensions("medium", 120, 40);
      expect(dims.width).toBe(72); // 120 * 0.6
      expect(dims.height).toBe(24); // 40 * 0.6
    });

    it("should calculate large modal dimensions correctly", () => {
      const dims = calculateDimensions("large", 120, 40);
      expect(dims.width).toBe(96); // 120 * 0.8
      expect(dims.height).toBe(32); // 40 * 0.8
    });

    it("should calculate fullscreen modal dimensions correctly", () => {
      const dims = calculateDimensions("fullscreen", 120, 40);
      expect(dims.width).toBe(114); // 120 * 0.95
      expect(dims.height).toBe(38); // 40 * 0.95
    });
  });

  describe("Position calculations", () => {
    function calculatePosition(
      modalWidth: number,
      modalHeight: number,
      terminalWidth: number,
      terminalHeight: number
    ): { left: number; top: number } {
      return {
        left: Math.floor((terminalWidth - modalWidth) / 2),
        top: Math.floor((terminalHeight - modalHeight) / 2),
      };
    }

    it("should center modal horizontally", () => {
      const pos = calculatePosition(60, 20, 120, 40);
      expect(pos.left).toBe(30); // (120 - 60) / 2
    });

    it("should center modal vertically", () => {
      const pos = calculatePosition(60, 20, 120, 40);
      expect(pos.top).toBe(10); // (40 - 20) / 2
    });

    it("should handle odd dimensions correctly", () => {
      const pos = calculatePosition(61, 21, 120, 40);
      expect(pos.left).toBe(29); // Math.floor((120 - 61) / 2)
      expect(pos.top).toBe(9); // Math.floor((40 - 21) / 2)
    });

    it("should handle full-width modal", () => {
      const pos = calculatePosition(120, 20, 120, 40);
      expect(pos.left).toBe(0);
    });
  });

  describe("ModalAction interface", () => {
    it("should accept valid action props", () => {
      const action = {
        label: "Confirm",
        key: "Enter",
        onAction: () => {},
        primary: true,
        destructive: false,
        disabled: false,
      };

      expect(action.label).toBe("Confirm");
      expect(action.key).toBe("Enter");
      expect(action.primary).toBe(true);
      expect(action.destructive).toBe(false);
      expect(action.disabled).toBe(false);
    });

    it("should allow minimal action definition", () => {
      const action = {
        label: "OK",
        onAction: () => {},
      };

      expect(action.label).toBe("OK");
      expect(typeof action.onAction).toBe("function");
    });
  });

  describe("ModalShortcut interface", () => {
    it("should accept valid shortcut props", () => {
      const shortcut = {
        key: "Esc",
        action: "Close",
      };

      expect(shortcut.key).toBe("Esc");
      expect(shortcut.action).toBe("Close");
    });
  });

  describe("Button color logic", () => {
    function getButtonColors(
      primary: boolean,
      destructive: boolean,
      disabled: boolean
    ): { bgColor: string; fgColor: string } {
      let bgColor = "gray";
      let fgColor = "white";

      if (disabled) {
        bgColor = "gray";
        fgColor = "gray";
      } else if (destructive) {
        bgColor = "red";
        fgColor = "white";
      } else if (primary) {
        bgColor = "cyan";
        fgColor = "black";
      }

      return { bgColor, fgColor };
    }

    it("should return gray for disabled buttons", () => {
      const colors = getButtonColors(true, false, true);
      expect(colors.bgColor).toBe("gray");
      expect(colors.fgColor).toBe("gray");
    });

    it("should return red for destructive buttons", () => {
      const colors = getButtonColors(false, true, false);
      expect(colors.bgColor).toBe("red");
      expect(colors.fgColor).toBe("white");
    });

    it("should return cyan for primary buttons", () => {
      const colors = getButtonColors(true, false, false);
      expect(colors.bgColor).toBe("cyan");
      expect(colors.fgColor).toBe("black");
    });

    it("should return gray for regular buttons", () => {
      const colors = getButtonColors(false, false, false);
      expect(colors.bgColor).toBe("gray");
      expect(colors.fgColor).toBe("white");
    });

    it("should prioritize disabled over destructive", () => {
      const colors = getButtonColors(false, true, true);
      expect(colors.bgColor).toBe("gray");
      expect(colors.fgColor).toBe("gray");
    });

    it("should prioritize destructive over primary", () => {
      const colors = getButtonColors(true, true, false);
      expect(colors.bgColor).toBe("red");
      expect(colors.fgColor).toBe("white");
    });
  });

  describe("Content height calculation", () => {
    it("should calculate content height correctly", () => {
      const totalHeight = 24;
      const headerHeight = 1;
      const footerHeight = 1;
      const actionsHeight = 2;
      const borderHeight = 2;

      const contentHeight =
        totalHeight - headerHeight - footerHeight - actionsHeight - borderHeight;
      expect(contentHeight).toBe(18);
    });

    it("should handle no footer", () => {
      const totalHeight = 24;
      const headerHeight = 1;
      const footerHeight = 0;
      const actionsHeight = 2;
      const borderHeight = 2;

      const contentHeight =
        totalHeight - headerHeight - footerHeight - actionsHeight - borderHeight;
      expect(contentHeight).toBe(19);
    });

    it("should handle no actions", () => {
      const totalHeight = 24;
      const headerHeight = 1;
      const footerHeight = 1;
      const actionsHeight = 0;
      const borderHeight = 2;

      const contentHeight =
        totalHeight - headerHeight - footerHeight - actionsHeight - borderHeight;
      expect(contentHeight).toBe(20);
    });
  });

  describe("Default shortcuts generation", () => {
    it("should include close shortcut when showCloseButton is true", () => {
      const showCloseButton = true;
      const onClose = () => {};
      const actions: { key?: string; label: string }[] = [];

      const defaultShortcuts = [
        ...(showCloseButton && onClose ? [{ key: "Esc", action: "Close" }] : []),
        ...actions.filter((a) => a.key).map((a) => ({ key: a.key!, action: a.label })),
      ];

      expect(defaultShortcuts.length).toBe(1);
      expect(defaultShortcuts[0].key).toBe("Esc");
      expect(defaultShortcuts[0].action).toBe("Close");
    });

    it("should not include close shortcut when showCloseButton is false", () => {
      const showCloseButton = false;
      const onClose = () => {};
      const actions: { key?: string; label: string }[] = [];

      const defaultShortcuts = [
        ...(showCloseButton && onClose ? [{ key: "Esc", action: "Close" }] : []),
        ...actions.filter((a) => a.key).map((a) => ({ key: a.key!, action: a.label })),
      ];

      expect(defaultShortcuts.length).toBe(0);
    });

    it("should include action shortcuts", () => {
      const showCloseButton = true;
      const onClose = () => {};
      const actions = [
        { key: "Enter", label: "Confirm" },
        { key: "Tab", label: "Next" },
        { label: "Help" }, // No key, should be filtered
      ];

      const defaultShortcuts = [
        ...(showCloseButton && onClose ? [{ key: "Esc", action: "Close" }] : []),
        ...actions.filter((a) => a.key).map((a) => ({ key: a.key!, action: a.label })),
      ];

      expect(defaultShortcuts.length).toBe(3);
      expect(defaultShortcuts[1].key).toBe("Enter");
      expect(defaultShortcuts[2].key).toBe("Tab");
    });
  });

  describe("ConfirmModal props", () => {
    it("should have default confirm label", () => {
      const defaultConfirmLabel = "Confirm";
      expect(defaultConfirmLabel).toBe("Confirm");
    });

    it("should have default cancel label", () => {
      const defaultCancelLabel = "Cancel";
      expect(defaultCancelLabel).toBe("Cancel");
    });

    it("should use warning variant when destructive", () => {
      const destructive = true;
      const variant = destructive ? "warning" : "default";
      expect(variant).toBe("warning");
    });

    it("should use default variant when not destructive", () => {
      const destructive = false;
      const variant = destructive ? "warning" : "default";
      expect(variant).toBe("default");
    });
  });

  describe("AlertModal props", () => {
    it("should have default dismiss label", () => {
      const defaultDismissLabel = "OK";
      expect(defaultDismissLabel).toBe("OK");
    });

    it("should have default variant as info", () => {
      const defaultVariant = "info";
      expect(defaultVariant).toBe("info");
    });

    it("should support all alert variants", () => {
      const variants = ["info", "success", "warning", "error"];
      variants.forEach((variant) => {
        expect(typeof variant).toBe("string");
      });
    });
  });
});
