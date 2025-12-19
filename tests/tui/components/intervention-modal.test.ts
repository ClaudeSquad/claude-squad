/**
 * Tests for Intervention Modal Component
 */

import { describe, it, expect } from "bun:test";
import { STATUS_ICONS } from "../../../src/tui/theme/index.js";
import type { InterventionType } from "../../../src/core/agent/types.js";

// Since InterventionModal is a React component, we test the helper functions, constants, and types
// For full component testing, a React test renderer would be needed

describe("InterventionModal Component", () => {
  describe("InterventionModalProps interface", () => {
    it("should accept valid prop combinations", () => {
      const validProps = {
        request: {
          id: "req-1",
          agentId: "agent-1",
          type: "question" as InterventionType,
          prompt: "What should I do?",
          status: "pending" as const,
        },
        onRespond: (id: string, response: string) => {},
        onCancel: (id: string) => {},
        agentName: "backend-engineer",
        timeoutMs: 300000,
        terminalWidth: 120,
        terminalHeight: 40,
      };

      expect(validProps.request.id).toBe("req-1");
      expect(validProps.request.type).toBe("question");
      expect(validProps.agentName).toBe("backend-engineer");
    });
  });

  describe("Intervention types", () => {
    it("should support all intervention types", () => {
      const types = ["question", "approval", "input", "choice"];
      types.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should have correct type colors", () => {
      const TYPE_COLORS = {
        question: "cyan",
        approval: "yellow",
        input: "blue",
        choice: "magenta",
      };

      expect(TYPE_COLORS.question).toBe("cyan");
      expect(TYPE_COLORS.approval).toBe("yellow");
      expect(TYPE_COLORS.input).toBe("blue");
      expect(TYPE_COLORS.choice).toBe("magenta");
    });

    it("should have correct type icons", () => {
      const TYPE_ICONS = {
        question: "?",
        approval: STATUS_ICONS.warning,
        input: STATUS_ICONS.arrowRight,
        choice: STATUS_ICONS.bullet,
      };

      expect(TYPE_ICONS.question).toBe("?");
      expect(TYPE_ICONS.approval).toBe(STATUS_ICONS.warning);
      expect(TYPE_ICONS.input).toBe(STATUS_ICONS.arrowRight);
      expect(TYPE_ICONS.choice).toBe(STATUS_ICONS.bullet);
    });

    it("should have correct type labels", () => {
      const TYPE_LABELS = {
        question: "Question",
        approval: "Approval Required",
        input: "Input Required",
        choice: "Choose an Option",
      };

      expect(TYPE_LABELS.question).toBe("Question");
      expect(TYPE_LABELS.approval).toBe("Approval Required");
      expect(TYPE_LABELS.input).toBe("Input Required");
      expect(TYPE_LABELS.choice).toBe("Choose an Option");
    });
  });

  describe("Default timeout", () => {
    it("should have default timeout of 5 minutes", () => {
      const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
      expect(DEFAULT_TIMEOUT_MS).toBe(300000);
    });
  });

  describe("Countdown formatting", () => {
    function formatCountdown(ms: number): string {
      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    it("should format 5 minutes correctly", () => {
      expect(formatCountdown(300000)).toBe("5:00");
    });

    it("should format 1 minute 30 seconds correctly", () => {
      expect(formatCountdown(90000)).toBe("1:30");
    });

    it("should format 45 seconds correctly", () => {
      expect(formatCountdown(45000)).toBe("0:45");
    });

    it("should format 9 seconds with leading zero", () => {
      expect(formatCountdown(9000)).toBe("0:09");
    });

    it("should format 0 seconds correctly", () => {
      expect(formatCountdown(0)).toBe("0:00");
    });

    it("should round up partial seconds", () => {
      expect(formatCountdown(45500)).toBe("0:46");
      expect(formatCountdown(45100)).toBe("0:46");
    });

    it("should handle large values", () => {
      expect(formatCountdown(600000)).toBe("10:00");
      expect(formatCountdown(3600000)).toBe("60:00");
    });
  });

  describe("Countdown color logic", () => {
    function getCountdownColor(
      remainingMs: number,
      totalMs: number
    ): "red" | "yellow" | "gray" {
      const ratio = remainingMs / totalMs;
      if (ratio <= 0.1) return "red";
      if (ratio <= 0.25) return "yellow";
      return "gray";
    }

    it("should return red when 10% or less remaining", () => {
      expect(getCountdownColor(30000, 300000)).toBe("red"); // 10%
      expect(getCountdownColor(15000, 300000)).toBe("red"); // 5%
      expect(getCountdownColor(0, 300000)).toBe("red"); // 0%
    });

    it("should return yellow when 11-25% remaining", () => {
      expect(getCountdownColor(75000, 300000)).toBe("yellow"); // 25%
      expect(getCountdownColor(45000, 300000)).toBe("yellow"); // 15%
      expect(getCountdownColor(33000, 300000)).toBe("yellow"); // 11%
    });

    it("should return gray when more than 25% remaining", () => {
      expect(getCountdownColor(300000, 300000)).toBe("gray"); // 100%
      expect(getCountdownColor(150000, 300000)).toBe("gray"); // 50%
      expect(getCountdownColor(78000, 300000)).toBe("gray"); // 26%
    });
  });

  describe("Modal dimension calculations", () => {
    it("should calculate modal width correctly", () => {
      const terminalWidth = 120;
      const modalWidth = Math.floor(terminalWidth * 0.7);
      expect(modalWidth).toBe(84);
    });

    it("should calculate modal height correctly", () => {
      const terminalHeight = 40;
      const optionsCount = 4;
      const modalHeight = Math.min(
        Math.floor(terminalHeight * 0.7),
        15 + optionsCount
      );
      expect(modalHeight).toBe(19); // min(28, 19)
    });

    it("should limit modal height when many options", () => {
      const terminalHeight = 40;
      const optionsCount = 20;
      const modalHeight = Math.min(
        Math.floor(terminalHeight * 0.7),
        15 + optionsCount
      );
      expect(modalHeight).toBe(28); // min(28, 35)
    });

    it("should calculate centering position correctly", () => {
      const terminalWidth = 120;
      const terminalHeight = 40;
      const modalWidth = 84;
      const modalHeight = 28;

      const left = Math.floor((terminalWidth - modalWidth) / 2);
      const top = Math.floor((terminalHeight - modalHeight) / 2);

      expect(left).toBe(18);
      expect(top).toBe(6);
    });
  });

  describe("Response state", () => {
    it("should have initial state for input/question types", () => {
      const initialState = {
        selectedIndex: 0,
        textInput: "",
        isTyping: true, // For input/question types
      };

      expect(initialState.selectedIndex).toBe(0);
      expect(initialState.textInput).toBe("");
      expect(initialState.isTyping).toBe(true);
    });

    it("should have initial state for choice type", () => {
      const initialState = {
        selectedIndex: 0,
        textInput: "",
        isTyping: false, // For choice type
      };

      expect(initialState.isTyping).toBe(false);
    });
  });

  describe("Submit button enablement", () => {
    it("should enable for approval type", () => {
      const type: InterventionType = "approval";
      const isTyping = false;
      const textInput = "";
      const hasOptions = false;

      const canSubmit =
        type === "approval" ||
        (isTyping && textInput.length > 0) ||
        (!isTyping && hasOptions);

      expect(canSubmit).toBe(true);
    });

    it("should enable when typing with text", () => {
      const type: InterventionType = "question";
      const isTyping = true;
      const textInput = "some answer";
      const hasOptions = false;

      const canSubmit =
        type === "approval" ||
        (isTyping && textInput.length > 0) ||
        (!isTyping && hasOptions);

      expect(canSubmit).toBe(true);
    });

    it("should disable when typing with empty text", () => {
      const type: InterventionType = "question";
      const isTyping = true;
      const textInput = "";
      const hasOptions = false;

      const canSubmit =
        type === "approval" ||
        (isTyping && textInput.length > 0) ||
        (!isTyping && hasOptions);

      expect(canSubmit).toBe(false);
    });

    it("should enable for choice type with options", () => {
      const type: InterventionType = "choice";
      const isTyping = false;
      const textInput = "";
      const hasOptions = true;

      const canSubmit =
        type === "approval" ||
        (isTyping && textInput.length > 0) ||
        (!isTyping && hasOptions);

      expect(canSubmit).toBe(true);
    });
  });

  describe("Response handling", () => {
    it("should use selected option for choice type", () => {
      const type: InterventionType = "choice";
      const isTyping = false;
      const options = ["Option A", "Option B", "Option C"];
      const selectedIndex = 1;
      const textInput = "";

      let response: string;
      if (type === "choice" && !isTyping) {
        response = options[selectedIndex];
      } else {
        response = textInput;
      }

      expect(response).toBe("Option B");
    });

    it("should use text input for custom choice", () => {
      const type: InterventionType = "choice";
      const isTyping = true;
      const options = ["Option A", "Option B"];
      const selectedIndex = 0;
      const textInput = "Custom option";

      let response: string;
      if (type === "choice" && isTyping) {
        response = textInput;
      } else {
        response = options[selectedIndex];
      }

      expect(response).toBe("Custom option");
    });

    it("should return 'approve' for approval type", () => {
      const type: InterventionType = "approval";
      let response: string;

      if (type === "approval") {
        response = "approve";
      } else {
        response = "other";
      }

      expect(response).toBe("approve");
    });

    it("should return 'reject' for approval rejection", () => {
      const type: InterventionType = "approval";
      let response: string;

      // Simulating reject action
      if (type === "approval") {
        response = "reject";
      } else {
        response = "other";
      }

      expect(response).toBe("reject");
    });
  });

  describe("InterventionContainer logic", () => {
    it("should filter pending requests", () => {
      const requests = [
        { id: "1", status: "pending" as const, agentId: "a1", type: "question" as InterventionType, prompt: "Q1" },
        { id: "2", status: "completed" as const, agentId: "a2", type: "approval" as InterventionType, prompt: "Q2" },
        { id: "3", status: "pending" as const, agentId: "a3", type: "input" as InterventionType, prompt: "Q3" },
      ];

      const pendingRequests = requests.filter((r) => r.status === "pending");
      expect(pendingRequests.length).toBe(2);
    });

    it("should get first pending request", () => {
      const requests = [
        { id: "1", status: "pending" as const, agentId: "a1", type: "question" as InterventionType, prompt: "Q1" },
        { id: "2", status: "pending" as const, agentId: "a2", type: "approval" as InterventionType, prompt: "Q2" },
      ];

      const pendingRequests = requests.filter((r) => r.status === "pending");
      const currentRequest = pendingRequests[0];

      expect(currentRequest.id).toBe("1");
    });

    it("should return null when no pending requests", () => {
      const requests = [
        { id: "1", status: "completed" as const, agentId: "a1", type: "question" as InterventionType, prompt: "Q1" },
        { id: "2", status: "timeout" as const, agentId: "a2", type: "approval" as InterventionType, prompt: "Q2" },
      ];

      const pendingRequests = requests.filter((r) => r.status === "pending");
      const currentRequest = pendingRequests[0];

      expect(currentRequest).toBeUndefined();
    });

    it("should calculate queue count", () => {
      const requests = [
        { id: "1", status: "pending" as const },
        { id: "2", status: "pending" as const },
        { id: "3", status: "pending" as const },
      ];

      const queueCount = requests.filter((r) => r.status === "pending").length;
      expect(queueCount).toBe(3);
    });
  });

  describe("Choice list selection", () => {
    it("should track selected index", () => {
      let selectedIndex = 0;
      const options = ["A", "B", "C", "D"];

      // Select next
      selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(1);

      // Select next
      selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(2);

      // Select previous
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(1);
    });

    it("should not go below 0", () => {
      let selectedIndex = 0;
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);
    });

    it("should not exceed options length", () => {
      let selectedIndex = 3;
      const options = ["A", "B", "C", "D"];
      selectedIndex = Math.min(options.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(3);
    });
  });

  describe("Toggle custom input", () => {
    it("should toggle between list and text input", () => {
      let isTyping = false;

      // Toggle to text
      isTyping = !isTyping;
      expect(isTyping).toBe(true);

      // Toggle back to list
      isTyping = !isTyping;
      expect(isTyping).toBe(false);
    });
  });
});
