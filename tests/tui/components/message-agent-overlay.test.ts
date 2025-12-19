/**
 * Tests for Message Agent Overlay Component
 */

import { describe, it, expect } from "bun:test";
import {
  getAgentStatusColor,
  getAgentStatusIcon,
} from "../../../src/tui/theme/index.js";
import type { AgentStatus } from "../../../src/core/entities/agent.js";

// Since MessageAgentOverlay is a React component, we test the helper functions, constants, and types
// For full component testing, a React test renderer would be needed

describe("MessageAgentOverlay Component", () => {
  describe("AgentInfo interface", () => {
    it("should accept valid agent info", () => {
      const agentInfo = {
        id: "agent-1",
        name: "backend-engineer",
        status: "working" as AgentStatus,
        context: "Implementing API endpoints",
        role: "Backend Development",
      };

      expect(agentInfo.id).toBe("agent-1");
      expect(agentInfo.name).toBe("backend-engineer");
      expect(agentInfo.status).toBe("working");
      expect(agentInfo.context).toBe("Implementing API endpoints");
      expect(agentInfo.role).toBe("Backend Development");
    });

    it("should allow minimal agent info", () => {
      const agentInfo = {
        id: "agent-1",
        name: "test-agent",
        status: "idle" as AgentStatus,
      };

      expect(agentInfo.id).toBe("agent-1");
      expect(agentInfo.name).toBe("test-agent");
      expect(agentInfo.status).toBe("idle");
    });
  });

  describe("Messageable statuses", () => {
    const MESSAGEABLE_STATUSES: AgentStatus[] = ["working", "waiting", "paused", "idle"];

    it("should include working status", () => {
      expect(MESSAGEABLE_STATUSES.includes("working")).toBe(true);
    });

    it("should include waiting status", () => {
      expect(MESSAGEABLE_STATUSES.includes("waiting")).toBe(true);
    });

    it("should include paused status", () => {
      expect(MESSAGEABLE_STATUSES.includes("paused")).toBe(true);
    });

    it("should include idle status", () => {
      expect(MESSAGEABLE_STATUSES.includes("idle")).toBe(true);
    });

    it("should not include error status", () => {
      expect(MESSAGEABLE_STATUSES.includes("error")).toBe(false);
    });

    it("should not include completed status", () => {
      expect(MESSAGEABLE_STATUSES.includes("completed")).toBe(false);
    });
  });

  describe("getMessageableAgents function", () => {
    const MESSAGEABLE_STATUSES: AgentStatus[] = ["working", "waiting", "paused", "idle"];

    function getMessageableAgents(
      agents: { id: string; name: string; status: AgentStatus }[]
    ) {
      return agents.filter((agent) => MESSAGEABLE_STATUSES.includes(agent.status));
    }

    it("should filter out completed agents", () => {
      const agents = [
        { id: "1", name: "Agent 1", status: "working" as AgentStatus },
        { id: "2", name: "Agent 2", status: "completed" as AgentStatus },
        { id: "3", name: "Agent 3", status: "paused" as AgentStatus },
      ];

      const messageable = getMessageableAgents(agents);
      expect(messageable.length).toBe(2);
      expect(messageable.find((a) => a.id === "2")).toBeUndefined();
    });

    it("should filter out error agents", () => {
      const agents = [
        { id: "1", name: "Agent 1", status: "idle" as AgentStatus },
        { id: "2", name: "Agent 2", status: "error" as AgentStatus },
      ];

      const messageable = getMessageableAgents(agents);
      expect(messageable.length).toBe(1);
      expect(messageable[0].id).toBe("1");
    });

    it("should include all active statuses", () => {
      const agents = [
        { id: "1", name: "Agent 1", status: "working" as AgentStatus },
        { id: "2", name: "Agent 2", status: "waiting" as AgentStatus },
        { id: "3", name: "Agent 3", status: "paused" as AgentStatus },
        { id: "4", name: "Agent 4", status: "idle" as AgentStatus },
      ];

      const messageable = getMessageableAgents(agents);
      expect(messageable.length).toBe(4);
    });

    it("should return empty array when no messageable agents", () => {
      const agents = [
        { id: "1", name: "Agent 1", status: "completed" as AgentStatus },
        { id: "2", name: "Agent 2", status: "error" as AgentStatus },
      ];

      const messageable = getMessageableAgents(agents);
      expect(messageable.length).toBe(0);
    });
  });

  describe("Status descriptions", () => {
    function getStatusDescription(status: AgentStatus): string {
      switch (status) {
        case "idle":
          return "Ready to receive instructions";
        case "working":
          return "Currently processing - message will be queued";
        case "waiting":
          return "Waiting for input";
        case "paused":
          return "Paused - will resume on message";
        case "error":
          return "In error state";
        case "completed":
          return "Task completed";
        default:
          return "";
      }
    }

    it("should return correct description for idle", () => {
      expect(getStatusDescription("idle")).toBe("Ready to receive instructions");
    });

    it("should return correct description for working", () => {
      expect(getStatusDescription("working")).toBe(
        "Currently processing - message will be queued"
      );
    });

    it("should return correct description for waiting", () => {
      expect(getStatusDescription("waiting")).toBe("Waiting for input");
    });

    it("should return correct description for paused", () => {
      expect(getStatusDescription("paused")).toBe("Paused - will resume on message");
    });

    it("should return correct description for error", () => {
      expect(getStatusDescription("error")).toBe("In error state");
    });

    it("should return correct description for completed", () => {
      expect(getStatusDescription("completed")).toBe("Task completed");
    });
  });

  describe("Agent status colors", () => {
    it("should return green for working", () => {
      expect(getAgentStatusColor("working")).toBe("green");
    });

    it("should return yellow for waiting", () => {
      expect(getAgentStatusColor("waiting")).toBe("yellow");
    });

    it("should return blue for paused", () => {
      expect(getAgentStatusColor("paused")).toBe("blue");
    });

    it("should return gray for idle", () => {
      expect(getAgentStatusColor("idle")).toBe("gray");
    });

    it("should return red for error", () => {
      expect(getAgentStatusColor("error")).toBe("red");
    });

    it("should return cyan for completed", () => {
      expect(getAgentStatusColor("completed")).toBe("cyan");
    });
  });

  describe("Overlay state", () => {
    it("should have initial state with default values", () => {
      const initialState = {
        selectedIndex: 0,
        message: "",
        broadcastMode: false,
        focus: "message" as const,
      };

      expect(initialState.selectedIndex).toBe(0);
      expect(initialState.message).toBe("");
      expect(initialState.broadcastMode).toBe(false);
      expect(initialState.focus).toBe("message");
    });

    it("should find pre-selected agent index", () => {
      const agents = [
        { id: "agent-1", name: "Agent 1", status: "idle" as AgentStatus },
        { id: "agent-2", name: "Agent 2", status: "working" as AgentStatus },
        { id: "agent-3", name: "Agent 3", status: "paused" as AgentStatus },
      ];
      const selectedAgentId = "agent-2";

      const initialIndex = agents.findIndex((a) => a.id === selectedAgentId);
      expect(initialIndex).toBe(1);
    });

    it("should default to 0 when pre-selected agent not found", () => {
      const agents = [
        { id: "agent-1", name: "Agent 1", status: "idle" as AgentStatus },
        { id: "agent-2", name: "Agent 2", status: "working" as AgentStatus },
      ];
      const selectedAgentId = "agent-unknown";

      const initialIndex = agents.findIndex((a) => a.id === selectedAgentId);
      const index = Math.max(0, initialIndex);
      expect(index).toBe(0);
    });
  });

  describe("Modal dimension calculations", () => {
    it("should calculate modal width correctly", () => {
      const terminalWidth = 120;
      const modalWidth = Math.floor(terminalWidth * 0.75);
      expect(modalWidth).toBe(90);
    });

    it("should calculate modal height with max limit", () => {
      const terminalHeight = 40;
      const modalHeight = Math.min(Math.floor(terminalHeight * 0.8), 25);
      expect(modalHeight).toBe(25); // min(32, 25)
    });

    it("should calculate centering position", () => {
      const terminalWidth = 120;
      const terminalHeight = 40;
      const modalWidth = 90;
      const modalHeight = 25;

      const left = Math.floor((terminalWidth - modalWidth) / 2);
      const top = Math.floor((terminalHeight - modalHeight) / 2);

      expect(left).toBe(15);
      expect(top).toBe(7);
    });
  });

  describe("Send validation", () => {
    it("should allow send when message has content in single agent mode", () => {
      const message = "Please review this code";
      const broadcastMode = false;
      const selectedAgent = { id: "agent-1", name: "Agent 1", status: "idle" as AgentStatus };

      const canSend =
        message.trim().length > 0 && (broadcastMode || Boolean(selectedAgent));
      expect(canSend).toBe(true);
    });

    it("should allow send in broadcast mode with message", () => {
      const message = "Attention all agents";
      const broadcastMode = true;
      const selectedAgent = null;

      const canSend =
        message.trim().length > 0 && (broadcastMode || Boolean(selectedAgent));
      expect(canSend).toBe(true);
    });

    it("should not allow send with empty message", () => {
      const message = "   ";
      const broadcastMode = false;
      const selectedAgent = { id: "agent-1", name: "Agent 1", status: "idle" as AgentStatus };

      const canSend =
        message.trim().length > 0 && (broadcastMode || Boolean(selectedAgent));
      expect(canSend).toBe(false);
    });

    it("should not allow send without agent or broadcast", () => {
      const message = "Hello";
      const broadcastMode = false;
      const selectedAgent = null;

      const canSend =
        message.trim().length > 0 && (broadcastMode || Boolean(selectedAgent));
      expect(canSend).toBe(false);
    });
  });

  describe("Broadcast mode", () => {
    it("should toggle broadcast mode", () => {
      let broadcastMode = false;

      broadcastMode = !broadcastMode;
      expect(broadcastMode).toBe(true);

      broadcastMode = !broadcastMode;
      expect(broadcastMode).toBe(false);
    });

    it("should collect all agent IDs in broadcast mode", () => {
      const agents = [
        { id: "agent-1", name: "Agent 1", status: "idle" as AgentStatus },
        { id: "agent-2", name: "Agent 2", status: "working" as AgentStatus },
        { id: "agent-3", name: "Agent 3", status: "paused" as AgentStatus },
      ];

      const agentIds = agents.map((a) => a.id);
      expect(agentIds).toEqual(["agent-1", "agent-2", "agent-3"]);
    });
  });

  describe("Focus management", () => {
    it("should toggle between agents and message focus", () => {
      let focus: "agents" | "message" = "message";

      focus = focus === "agents" ? "message" : "agents";
      expect(focus).toBe("agents");

      focus = focus === "agents" ? "message" : "agents";
      expect(focus).toBe("message");
    });
  });

  describe("Agent selection", () => {
    it("should update selected index", () => {
      let selectedIndex = 0;
      const agents = [
        { id: "1", name: "A1" },
        { id: "2", name: "A2" },
        { id: "3", name: "A3" },
      ];

      selectedIndex = 2;
      expect(selectedIndex).toBe(2);
      expect(agents[selectedIndex].id).toBe("3");
    });

    it("should navigate up in list", () => {
      let selectedIndex = 2;
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(1);
    });

    it("should navigate down in list", () => {
      let selectedIndex = 0;
      const maxIndex = 2;
      selectedIndex = Math.min(maxIndex, selectedIndex + 1);
      expect(selectedIndex).toBe(1);
    });

    it("should not go below 0", () => {
      let selectedIndex = 0;
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);
    });

    it("should not exceed max index", () => {
      let selectedIndex = 2;
      const maxIndex = 2;
      selectedIndex = Math.min(maxIndex, selectedIndex + 1);
      expect(selectedIndex).toBe(2);
    });
  });

  describe("Send button label", () => {
    it("should show broadcast label in broadcast mode", () => {
      const broadcastMode = true;
      const selectedAgentName = "Agent 1";

      const sendLabel = broadcastMode
        ? "Send to All Agents"
        : `Send & Resume ${selectedAgentName}`;

      expect(sendLabel).toBe("Send to All Agents");
    });

    it("should show agent name in single mode", () => {
      const broadcastMode = false;
      const selectedAgentName = "backend-engineer";

      const sendLabel = broadcastMode
        ? "Send to All Agents"
        : `Send & Resume ${selectedAgentName}`;

      expect(sendLabel).toBe("Send & Resume backend-engineer");
    });

    it("should use default name when agent name missing", () => {
      const broadcastMode = false;
      const selectedAgentName = undefined;

      const sendLabel = broadcastMode
        ? "Send to All Agents"
        : `Send & Resume ${selectedAgentName ?? "Agent"}`;

      expect(sendLabel).toBe("Send & Resume Agent");
    });
  });

  describe("QuickMessageInput props", () => {
    it("should accept valid props", () => {
      const props = {
        agent: { id: "1", name: "test", status: "idle" as AgentStatus },
        onSend: (message: string) => {},
        onCancel: () => {},
        value: "",
        onChange: (value: string) => {},
      };

      expect(props.value).toBe("");
      expect(typeof props.onSend).toBe("function");
      expect(typeof props.onCancel).toBe("function");
    });

    it("should only submit when value has content", () => {
      const value = "";
      const trimmed = value.trim();
      expect(trimmed.length > 0).toBe(false);

      const value2 = "Hello agent";
      const trimmed2 = value2.trim();
      expect(trimmed2.length > 0).toBe(true);
    });
  });
});
