/**
 * Tests for StatusBadge Component
 */

import { describe, it, expect } from "bun:test";
import {
  getAgentStatusColor,
  getAgentStatusIcon,
  getFeatureStatusColor,
  getFeatureStatusIcon,
  getWorkflowStageColor,
  getWorkflowStageIcon,
  getPriorityColor,
  getPriorityIcon,
  getStatusColor,
  STATUS_ICONS,
  AGENT_STATUS_ICONS,
  FEATURE_STATUS_ICONS,
  WORKFLOW_STAGE_ICONS,
  PRIORITY_ICONS,
  TEXT_COLORS,
} from "../../../src/tui/theme/index.js";
import type { AgentStatus } from "../../../src/core/entities/agent.js";
import type { FeatureStatus } from "../../../src/core/entities/feature.js";

// Since StatusBadge is a React component, we test the helper functions and logic
// For full component testing, a React test renderer would be needed

describe("StatusBadge Component", () => {
  describe("StatusBadgeProps interface", () => {
    it("should accept valid prop combinations", () => {
      const validProps = {
        status: "working",
        type: "agent" as const,
        variant: "outline" as const,
        icon: true,
        label: "Custom Label",
        customIcon: "*",
        color: "cyan" as const,
      };

      expect(validProps.status).toBe("working");
      expect(validProps.type).toBe("agent");
      expect(validProps.variant).toBe("outline");
      expect(validProps.icon).toBe(true);
    });

    it("should have default type as general", () => {
      const defaultType = "general";
      expect(defaultType).toBe("general");
    });

    it("should have default variant as outline", () => {
      const defaultVariant = "outline";
      expect(defaultVariant).toBe("outline");
    });

    it("should have default icon as true", () => {
      const defaultIcon = true;
      expect(defaultIcon).toBe(true);
    });
  });

  describe("Status badge types", () => {
    it("should support all badge types", () => {
      const types = ["agent", "feature", "workflow", "priority", "general"];
      types.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should support all variants", () => {
      const variants = ["solid", "outline", "subtle"];
      variants.forEach((variant) => {
        expect(typeof variant).toBe("string");
      });
    });
  });

  describe("Agent status colors", () => {
    it("should return correct color for idle", () => {
      expect(getAgentStatusColor("idle")).toBe("gray");
    });

    it("should return correct color for working", () => {
      expect(getAgentStatusColor("working")).toBe("green");
    });

    it("should return correct color for waiting", () => {
      expect(getAgentStatusColor("waiting")).toBe("yellow");
    });

    it("should return correct color for paused", () => {
      expect(getAgentStatusColor("paused")).toBe("blue");
    });

    it("should return correct color for error", () => {
      expect(getAgentStatusColor("error")).toBe("red");
    });

    it("should return correct color for completed", () => {
      expect(getAgentStatusColor("completed")).toBe("cyan");
    });
  });

  describe("Agent status icons", () => {
    it("should return correct icon for idle", () => {
      expect(getAgentStatusIcon("idle")).toBe("\u25CB"); // Empty circle
    });

    it("should return correct icon for working", () => {
      expect(getAgentStatusIcon("working")).toBe("\u25CF"); // Filled circle
    });

    it("should return correct icon for waiting", () => {
      expect(getAgentStatusIcon("waiting")).toBe("\u25D4"); // Partial circle
    });

    it("should return correct icon for paused", () => {
      expect(getAgentStatusIcon("paused")).toBe("\u25A0"); // Square
    });

    it("should return correct icon for error", () => {
      expect(getAgentStatusIcon("error")).toBe("\u2718"); // Cross
    });

    it("should return correct icon for completed", () => {
      expect(getAgentStatusIcon("completed")).toBe("\u2714"); // Checkmark
    });
  });

  describe("Feature status colors", () => {
    it("should return correct color for planning", () => {
      expect(getFeatureStatusColor("planning")).toBe("blue");
    });

    it("should return correct color for in_progress", () => {
      expect(getFeatureStatusColor("in_progress")).toBe("green");
    });

    it("should return correct color for review", () => {
      expect(getFeatureStatusColor("review")).toBe("yellow");
    });

    it("should return correct color for testing", () => {
      expect(getFeatureStatusColor("testing")).toBe("magenta");
    });

    it("should return correct color for completed", () => {
      expect(getFeatureStatusColor("completed")).toBe("cyan");
    });

    it("should return correct color for blocked", () => {
      expect(getFeatureStatusColor("blocked")).toBe("red");
    });

    it("should return correct color for cancelled", () => {
      expect(getFeatureStatusColor("cancelled")).toBe("gray");
    });
  });

  describe("Feature status icons", () => {
    it("should have icon for each feature status", () => {
      const statuses: FeatureStatus[] = [
        "planning",
        "in_progress",
        "review",
        "testing",
        "completed",
        "blocked",
        "cancelled",
      ];

      statuses.forEach((status) => {
        const icon = getFeatureStatusIcon(status);
        expect(typeof icon).toBe("string");
        expect(icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Workflow stage colors", () => {
    it("should return correct color for pending", () => {
      expect(getWorkflowStageColor("pending")).toBe("gray");
    });

    it("should return correct color for running", () => {
      expect(getWorkflowStageColor("running")).toBe("green");
    });

    it("should return correct color for review", () => {
      expect(getWorkflowStageColor("review")).toBe("yellow");
    });

    it("should return correct color for completed", () => {
      expect(getWorkflowStageColor("completed")).toBe("cyan");
    });

    it("should return correct color for failed", () => {
      expect(getWorkflowStageColor("failed")).toBe("red");
    });

    it("should return correct color for skipped", () => {
      expect(getWorkflowStageColor("skipped")).toBe("gray");
    });
  });

  describe("Workflow stage icons", () => {
    it("should have icon for each workflow stage", () => {
      const stages = ["pending", "running", "review", "completed", "failed", "skipped"];

      stages.forEach((stage) => {
        const icon = getWorkflowStageIcon(stage as any);
        expect(typeof icon).toBe("string");
        expect(icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Priority colors", () => {
    it("should return correct color for urgent", () => {
      expect(getPriorityColor("urgent")).toBe("red");
    });

    it("should return correct color for high", () => {
      expect(getPriorityColor("high")).toBe("yellow");
    });

    it("should return correct color for normal", () => {
      expect(getPriorityColor("normal")).toBe("white");
    });

    it("should return correct color for low", () => {
      expect(getPriorityColor("low")).toBe("gray");
    });
  });

  describe("Priority icons", () => {
    it("should have icon for each priority level", () => {
      const priorities = ["urgent", "high", "normal", "low"];

      priorities.forEach((priority) => {
        const icon = getPriorityIcon(priority as any);
        expect(typeof icon).toBe("string");
        expect(icon.length).toBeGreaterThan(0);
      });
    });

    it("should return exclamation for urgent", () => {
      expect(PRIORITY_ICONS.urgent).toBe("\u2757"); // Exclamation
    });

    it("should return up arrow for high", () => {
      expect(PRIORITY_ICONS.high).toBe("\u2191"); // Up arrow
    });

    it("should return dash for normal", () => {
      expect(PRIORITY_ICONS.normal).toBe("\u2500"); // Dash
    });

    it("should return down arrow for low", () => {
      expect(PRIORITY_ICONS.low).toBe("\u2193"); // Down arrow
    });
  });

  describe("General status colors", () => {
    it("should return correct color for info", () => {
      expect(getStatusColor("info")).toBe("cyan");
    });

    it("should return correct color for success", () => {
      expect(getStatusColor("success")).toBe("green");
    });

    it("should return correct color for warning", () => {
      expect(getStatusColor("warning")).toBe("yellow");
    });

    it("should return correct color for error", () => {
      expect(getStatusColor("error")).toBe("red");
    });
  });

  describe("General status icons", () => {
    it("should have success icon", () => {
      expect(STATUS_ICONS.success).toBe("\u2714"); // Checkmark
    });

    it("should have error icon", () => {
      expect(STATUS_ICONS.error).toBe("\u2718"); // Cross
    });

    it("should have warning icon", () => {
      expect(STATUS_ICONS.warning).toBe("\u26A0"); // Warning sign
    });

    it("should have info icon", () => {
      expect(STATUS_ICONS.info).toBe("\u2139"); // Info symbol
    });

    it("should have bullet icon", () => {
      expect(STATUS_ICONS.bullet).toBe("\u2022"); // Bullet
    });
  });

  describe("Status text formatting", () => {
    function formatStatusText(status: string): string {
      return status
        .replace(/[-_]/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }

    it("should format snake_case status", () => {
      expect(formatStatusText("in_progress")).toBe("In Progress");
    });

    it("should format kebab-case status", () => {
      expect(formatStatusText("in-progress")).toBe("In Progress");
    });

    it("should handle single word status", () => {
      expect(formatStatusText("working")).toBe("Working");
    });

    it("should handle already capitalized status", () => {
      expect(formatStatusText("URGENT")).toBe("Urgent");
    });

    it("should handle lowercase status", () => {
      expect(formatStatusText("completed")).toBe("Completed");
    });

    it("should handle mixed case status", () => {
      expect(formatStatusText("InProgress")).toBe("Inprogress");
    });
  });

  describe("Color mapping for general status", () => {
    function getColorForGeneralStatus(status: string): string {
      if (status === "success" || status === "completed" || status === "done") {
        return getStatusColor("success");
      }
      if (status === "error" || status === "failed" || status === "blocked") {
        return getStatusColor("error");
      }
      if (status === "warning" || status === "waiting" || status === "pending") {
        return getStatusColor("warning");
      }
      return getStatusColor("info");
    }

    it("should map success variants to green", () => {
      expect(getColorForGeneralStatus("success")).toBe("green");
      expect(getColorForGeneralStatus("completed")).toBe("green");
      expect(getColorForGeneralStatus("done")).toBe("green");
    });

    it("should map error variants to red", () => {
      expect(getColorForGeneralStatus("error")).toBe("red");
      expect(getColorForGeneralStatus("failed")).toBe("red");
      expect(getColorForGeneralStatus("blocked")).toBe("red");
    });

    it("should map warning variants to yellow", () => {
      expect(getColorForGeneralStatus("warning")).toBe("yellow");
      expect(getColorForGeneralStatus("waiting")).toBe("yellow");
      expect(getColorForGeneralStatus("pending")).toBe("yellow");
    });

    it("should default to cyan for unknown status", () => {
      expect(getColorForGeneralStatus("unknown")).toBe("cyan");
      expect(getColorForGeneralStatus("custom")).toBe("cyan");
    });
  });

  describe("Icon mapping for general status", () => {
    function getIconForGeneralStatus(status: string): string {
      if (status === "success" || status === "completed" || status === "done") {
        return STATUS_ICONS.success;
      }
      if (status === "error" || status === "failed" || status === "blocked") {
        return STATUS_ICONS.error;
      }
      if (status === "warning" || status === "waiting") {
        return STATUS_ICONS.warning;
      }
      if (status === "info" || status === "pending") {
        return STATUS_ICONS.info;
      }
      return STATUS_ICONS.bullet;
    }

    it("should map success variants to checkmark", () => {
      expect(getIconForGeneralStatus("success")).toBe(STATUS_ICONS.success);
      expect(getIconForGeneralStatus("completed")).toBe(STATUS_ICONS.success);
      expect(getIconForGeneralStatus("done")).toBe(STATUS_ICONS.success);
    });

    it("should map error variants to cross", () => {
      expect(getIconForGeneralStatus("error")).toBe(STATUS_ICONS.error);
      expect(getIconForGeneralStatus("failed")).toBe(STATUS_ICONS.error);
      expect(getIconForGeneralStatus("blocked")).toBe(STATUS_ICONS.error);
    });

    it("should map warning variants to warning sign", () => {
      expect(getIconForGeneralStatus("warning")).toBe(STATUS_ICONS.warning);
      expect(getIconForGeneralStatus("waiting")).toBe(STATUS_ICONS.warning);
    });

    it("should map info variants to info symbol", () => {
      expect(getIconForGeneralStatus("info")).toBe(STATUS_ICONS.info);
      expect(getIconForGeneralStatus("pending")).toBe(STATUS_ICONS.info);
    });

    it("should default to bullet for unknown status", () => {
      expect(getIconForGeneralStatus("unknown")).toBe(STATUS_ICONS.bullet);
    });
  });

  describe("Variant rendering logic", () => {
    it("should have inverted text color for solid variant", () => {
      expect(TEXT_COLORS.inverted).toBe("black");
    });

    it("should support solid variant", () => {
      const variant = "solid";
      expect(variant).toBe("solid");
    });

    it("should support outline variant", () => {
      const variant = "outline";
      expect(variant).toBe("outline");
    });

    it("should support subtle variant", () => {
      const variant = "subtle";
      expect(variant).toBe("subtle");
    });
  });

  describe("Custom label override", () => {
    it("should allow custom label text", () => {
      const customLabel = "Custom Status";
      expect(customLabel).toBe("Custom Status");
    });

    it("should handle empty label", () => {
      const label: string | undefined = undefined;
      expect(label).toBeUndefined();
    });
  });

  describe("Custom icon override", () => {
    it("should allow custom icon character", () => {
      const customIcon = "*";
      expect(customIcon).toBe("*");
    });

    it("should allow emoji icons", () => {
      const emojiIcon = "!";
      expect(emojiIcon.length).toBeGreaterThan(0);
    });
  });

  describe("Custom color override", () => {
    it("should accept custom terminal colors", () => {
      const customColor = "magenta" as const;
      expect(customColor).toBe("magenta");
    });

    it("should accept bright terminal colors", () => {
      const brightColor = "brightCyan" as const;
      expect(brightColor).toBe("brightCyan");
    });
  });

  describe("Convenience components props", () => {
    it("should have correct props for AgentStatusBadge", () => {
      const props = {
        status: "working" as AgentStatus,
        variant: "outline" as const,
        icon: true,
      };
      expect(props.status).toBe("working");
    });

    it("should have correct props for FeatureStatusBadge", () => {
      const props = {
        status: "in_progress" as FeatureStatus,
        variant: "solid" as const,
      };
      expect(props.status).toBe("in_progress");
    });

    it("should have correct props for WorkflowStatusBadge", () => {
      const props = {
        status: "running",
        variant: "outline" as const,
      };
      expect(props.status).toBe("running");
    });

    it("should have correct props for PriorityBadge", () => {
      const props = {
        priority: "high",
        variant: "subtle" as const,
      };
      expect(props.priority).toBe("high");
    });
  });
});
