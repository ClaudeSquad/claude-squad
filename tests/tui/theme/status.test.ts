/**
 * Tests for TUI Theme Status Colors
 */

import { describe, it, expect } from "bun:test";
import {
  STATUS_COLORS,
  AGENT_STATUS_COLORS,
  AGENT_STATUS_ICONS,
  FEATURE_STATUS_COLORS,
  FEATURE_STATUS_ICONS,
  WORKFLOW_STAGE_COLORS,
  WORKFLOW_STAGE_ICONS,
  PRIORITY_COLORS,
  PRIORITY_ICONS,
  PROGRESS_COLORS,
  REVIEW_GATE_COLORS,
  REVIEW_GATE_ICONS,
  getStatusColor,
  getAgentStatusColor,
  getAgentStatusIcon,
  getFeatureStatusColor,
  getFeatureStatusIcon,
  getWorkflowStageColor,
  getWorkflowStageIcon,
  getPriorityColor,
  getPriorityIcon,
  getProgressColor,
  getReviewGateColor,
  getReviewGateIcon,
} from "../../../src/tui/theme/status.js";

describe("Theme Status Colors", () => {
  describe("STATUS_COLORS", () => {
    it("should define general status colors", () => {
      expect(STATUS_COLORS.info).toBe("cyan");
      expect(STATUS_COLORS.success).toBe("green");
      expect(STATUS_COLORS.warning).toBe("yellow");
      expect(STATUS_COLORS.error).toBe("red");
    });
  });

  describe("AGENT_STATUS_COLORS", () => {
    it("should define all agent status colors", () => {
      expect(AGENT_STATUS_COLORS.idle).toBe("gray");
      expect(AGENT_STATUS_COLORS.working).toBe("green");
      expect(AGENT_STATUS_COLORS.waiting).toBe("yellow");
      expect(AGENT_STATUS_COLORS.paused).toBe("blue");
      expect(AGENT_STATUS_COLORS.error).toBe("red");
      expect(AGENT_STATUS_COLORS.completed).toBe("cyan");
    });
  });

  describe("AGENT_STATUS_ICONS", () => {
    it("should define all agent status icons", () => {
      expect(AGENT_STATUS_ICONS.idle).toBe("\u25CB"); // empty circle
      expect(AGENT_STATUS_ICONS.working).toBe("\u25CF"); // filled circle
      expect(AGENT_STATUS_ICONS.waiting).toBe("\u25D4"); // partial circle
      expect(AGENT_STATUS_ICONS.paused).toBe("\u25A0"); // square
      expect(AGENT_STATUS_ICONS.error).toBe("\u2718"); // cross
      expect(AGENT_STATUS_ICONS.completed).toBe("\u2714"); // checkmark
    });
  });

  describe("FEATURE_STATUS_COLORS", () => {
    it("should define all feature status colors", () => {
      expect(FEATURE_STATUS_COLORS.planning).toBe("blue");
      expect(FEATURE_STATUS_COLORS.in_progress).toBe("green");
      expect(FEATURE_STATUS_COLORS.review).toBe("yellow");
      expect(FEATURE_STATUS_COLORS.testing).toBe("magenta");
      expect(FEATURE_STATUS_COLORS.completed).toBe("cyan");
      expect(FEATURE_STATUS_COLORS.blocked).toBe("red");
      expect(FEATURE_STATUS_COLORS.cancelled).toBe("gray");
    });
  });

  describe("FEATURE_STATUS_ICONS", () => {
    it("should define icons for feature states", () => {
      expect(typeof FEATURE_STATUS_ICONS.planning).toBe("string");
      expect(typeof FEATURE_STATUS_ICONS.completed).toBe("string");
      expect(typeof FEATURE_STATUS_ICONS.blocked).toBe("string");
    });
  });

  describe("WORKFLOW_STAGE_COLORS", () => {
    it("should define workflow stage colors", () => {
      expect(WORKFLOW_STAGE_COLORS.pending).toBe("gray");
      expect(WORKFLOW_STAGE_COLORS.running).toBe("green");
      expect(WORKFLOW_STAGE_COLORS.review).toBe("yellow");
      expect(WORKFLOW_STAGE_COLORS.completed).toBe("cyan");
      expect(WORKFLOW_STAGE_COLORS.failed).toBe("red");
      expect(WORKFLOW_STAGE_COLORS.skipped).toBe("gray");
    });
  });

  describe("PRIORITY_COLORS", () => {
    it("should define priority colors", () => {
      expect(PRIORITY_COLORS.urgent).toBe("red");
      expect(PRIORITY_COLORS.high).toBe("yellow");
      expect(PRIORITY_COLORS.normal).toBe("white");
      expect(PRIORITY_COLORS.low).toBe("gray");
    });
  });

  describe("PRIORITY_ICONS", () => {
    it("should define priority icons", () => {
      expect(PRIORITY_ICONS.urgent).toBe("\u2757"); // exclamation
      expect(PRIORITY_ICONS.high).toBe("\u2191"); // up arrow
      expect(PRIORITY_ICONS.normal).toBe("\u2500"); // dash
      expect(PRIORITY_ICONS.low).toBe("\u2193"); // down arrow
    });
  });

  describe("PROGRESS_COLORS", () => {
    it("should define progress milestone colors", () => {
      expect(PROGRESS_COLORS.low).toBe("red");
      expect(PROGRESS_COLORS.medium).toBe("yellow");
      expect(PROGRESS_COLORS.high).toBe("cyan");
      expect(PROGRESS_COLORS.complete).toBe("green");
      expect(PROGRESS_COLORS.background).toBe("gray");
    });
  });

  describe("REVIEW_GATE_COLORS", () => {
    it("should define review gate colors", () => {
      expect(REVIEW_GATE_COLORS.human).toBe("yellow");
      expect(REVIEW_GATE_COLORS.automated).toBe("cyan");
      expect(REVIEW_GATE_COLORS.none).toBe("gray");
    });
  });

  describe("Helper Functions", () => {
    describe("getStatusColor", () => {
      it("should return correct status color", () => {
        expect(getStatusColor("info")).toBe("cyan");
        expect(getStatusColor("success")).toBe("green");
        expect(getStatusColor("warning")).toBe("yellow");
        expect(getStatusColor("error")).toBe("red");
      });
    });

    describe("getAgentStatusColor", () => {
      it("should return correct agent status color", () => {
        expect(getAgentStatusColor("idle")).toBe("gray");
        expect(getAgentStatusColor("working")).toBe("green");
        expect(getAgentStatusColor("error")).toBe("red");
        expect(getAgentStatusColor("completed")).toBe("cyan");
      });
    });

    describe("getAgentStatusIcon", () => {
      it("should return correct agent status icon", () => {
        expect(getAgentStatusIcon("idle")).toBe("\u25CB");
        expect(getAgentStatusIcon("working")).toBe("\u25CF");
        expect(getAgentStatusIcon("completed")).toBe("\u2714");
      });
    });

    describe("getFeatureStatusColor", () => {
      it("should return correct feature status color", () => {
        expect(getFeatureStatusColor("planning")).toBe("blue");
        expect(getFeatureStatusColor("in_progress")).toBe("green");
        expect(getFeatureStatusColor("blocked")).toBe("red");
      });
    });

    describe("getWorkflowStageColor", () => {
      it("should return correct workflow stage color", () => {
        expect(getWorkflowStageColor("pending")).toBe("gray");
        expect(getWorkflowStageColor("running")).toBe("green");
        expect(getWorkflowStageColor("failed")).toBe("red");
      });
    });

    describe("getPriorityColor", () => {
      it("should return correct priority color", () => {
        expect(getPriorityColor("urgent")).toBe("red");
        expect(getPriorityColor("high")).toBe("yellow");
        expect(getPriorityColor("normal")).toBe("white");
        expect(getPriorityColor("low")).toBe("gray");
      });
    });

    describe("getProgressColor", () => {
      it("should return red for low percentage (0-24)", () => {
        expect(getProgressColor(0)).toBe("red");
        expect(getProgressColor(10)).toBe("red");
        expect(getProgressColor(24)).toBe("red");
      });

      it("should return yellow for medium percentage (25-49)", () => {
        expect(getProgressColor(25)).toBe("yellow");
        expect(getProgressColor(35)).toBe("yellow");
        expect(getProgressColor(49)).toBe("yellow");
      });

      it("should return cyan for high percentage (50-74)", () => {
        expect(getProgressColor(50)).toBe("cyan");
        expect(getProgressColor(60)).toBe("cyan");
        expect(getProgressColor(74)).toBe("cyan");
      });

      it("should return green for complete percentage (75-100)", () => {
        expect(getProgressColor(75)).toBe("green");
        expect(getProgressColor(90)).toBe("green");
        expect(getProgressColor(100)).toBe("green");
      });
    });

    describe("getReviewGateColor", () => {
      it("should return correct review gate color", () => {
        expect(getReviewGateColor("human")).toBe("yellow");
        expect(getReviewGateColor("automated")).toBe("cyan");
        expect(getReviewGateColor("none")).toBe("gray");
      });
    });

    describe("getReviewGateIcon", () => {
      it("should return correct review gate icon", () => {
        expect(typeof getReviewGateIcon("human")).toBe("string");
        expect(typeof getReviewGateIcon("automated")).toBe("string");
        expect(typeof getReviewGateIcon("none")).toBe("string");
      });
    });
  });
});
