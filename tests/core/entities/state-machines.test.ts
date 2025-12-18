/**
 * State Machine Tests
 *
 * Tests for all entity state machines - Agent, Feature, Session, Worktree.
 */

import { describe, test, expect } from "bun:test";

// Agent state machine
import {
  agentStateMachine,
  canAgentTransition,
  getValidAgentTransitions,
  isAgentTerminal,
  transitionAgent,
  safeTransitionAgent,
  startAgent,
  pauseAgent,
  resumeAgent,
  waitForInput,
  inputReceived,
  completeAgent,
  errorAgent,
  retryAgent,
} from "../../../src/core/entities/state-machines/agent";

// Feature state machine
import {
  featureStateMachine,
  canFeatureTransition,
  getValidFeatureTransitions,
  isFeatureTerminalState,
  transitionFeature,
  startDevelopment,
  submitForReview,
  requestChanges,
  moveToTesting,
  failTests,
  completeFeature,
  blockFeature,
  unblockFeature,
  cancelFeature,
} from "../../../src/core/entities/state-machines/feature";

// Session state machine
import {
  sessionStateMachine,
  canSessionTransition,
  getValidSessionTransitions,
  isSessionTerminalState,
  pauseSession,
  resumeSession,
  completeSession,
  crashSession,
  recoverSession,
  archiveSession,
} from "../../../src/core/entities/state-machines/session";

// Worktree state machine
import {
  worktreeStateMachine,
  canWorktreeTransition,
  getValidWorktreeTransitions,
  isWorktreeTerminalState,
  markWorktreeStale,
  removeActiveWorktree,
  cleanupWorktree,
  removeWorktree,
} from "../../../src/core/entities/state-machines/worktree";

import { InvalidTransitionError } from "../../../src/core/entities/state-machines/base";
import { createAgent } from "../../../src/core/entities/agent";
import { createFeature } from "../../../src/core/entities/feature";
import { createSession } from "../../../src/core/entities/session";
import { createWorktree } from "../../../src/core/entities/worktree";
import {
  generateAgentId,
  generateSessionId,
  generateFeatureId,
  generateWorkflowId,
  generateStageId,
  generateWorktreeId,
} from "../../../src/core/types/id";

// ============================================================================
// Agent State Machine Tests
// ============================================================================

describe("Agent State Machine", () => {
  describe("canAgentTransition", () => {
    test("allows valid transitions from idle", () => {
      expect(canAgentTransition("idle", "working")).toBe(true);
    });

    test("allows valid transitions from working", () => {
      expect(canAgentTransition("working", "waiting")).toBe(true);
      expect(canAgentTransition("working", "paused")).toBe(true);
      expect(canAgentTransition("working", "error")).toBe(true);
      expect(canAgentTransition("working", "completed")).toBe(true);
    });

    test("allows valid transitions from waiting", () => {
      expect(canAgentTransition("waiting", "working")).toBe(true);
      expect(canAgentTransition("waiting", "error")).toBe(true);
    });

    test("allows valid transitions from paused", () => {
      expect(canAgentTransition("paused", "working")).toBe(true);
      expect(canAgentTransition("paused", "error")).toBe(true);
    });

    test("allows valid transitions from error", () => {
      expect(canAgentTransition("error", "working")).toBe(true);
    });

    test("rejects invalid transitions", () => {
      expect(canAgentTransition("idle", "waiting")).toBe(false);
      expect(canAgentTransition("idle", "completed")).toBe(false);
      expect(canAgentTransition("completed", "working")).toBe(false);
      expect(canAgentTransition("completed", "idle")).toBe(false);
    });

    test("completed is terminal", () => {
      expect(canAgentTransition("completed", "working")).toBe(false);
      expect(canAgentTransition("completed", "idle")).toBe(false);
      expect(canAgentTransition("completed", "error")).toBe(false);
    });
  });

  describe("getValidAgentTransitions", () => {
    test("returns correct transitions for each state", () => {
      expect(getValidAgentTransitions("idle")).toContain("working");
      expect(getValidAgentTransitions("working")).toContain("waiting");
      expect(getValidAgentTransitions("working")).toContain("completed");
      expect(getValidAgentTransitions("completed")).toHaveLength(0);
    });
  });

  describe("isAgentTerminal", () => {
    test("completed is terminal", () => {
      expect(isAgentTerminal("completed")).toBe(true);
    });

    test("other states are not terminal", () => {
      expect(isAgentTerminal("idle")).toBe(false);
      expect(isAgentTerminal("working")).toBe(false);
      expect(isAgentTerminal("waiting")).toBe(false);
      expect(isAgentTerminal("paused")).toBe(false);
      expect(isAgentTerminal("error")).toBe(false);
    });
  });

  describe("Agent entity transitions", () => {
    const createTestAgent = (status: "idle" | "working" | "waiting" | "paused" | "error" | "completed" = "idle") => {
      return createAgent({
        id: generateAgentId(),
        sessionId: generateSessionId(),
        name: "Test Agent",
        role: "engineering",
        model: "sonnet",
        status,
      });
    };

    test("startAgent transitions idle to working", () => {
      const agent = createTestAgent("idle");
      const started = startAgent(agent);
      expect(started.status).toBe("working");
    });

    test("pauseAgent transitions working to paused", () => {
      const agent = createTestAgent("working");
      const paused = pauseAgent(agent);
      expect(paused.status).toBe("paused");
    });

    test("resumeAgent transitions paused to working", () => {
      const agent = createTestAgent("paused");
      const resumed = resumeAgent(agent);
      expect(resumed.status).toBe("working");
    });

    test("waitForInput transitions working to waiting", () => {
      const agent = createTestAgent("working");
      const waiting = waitForInput(agent);
      expect(waiting.status).toBe("waiting");
    });

    test("inputReceived transitions waiting to working", () => {
      const agent = createTestAgent("waiting");
      const working = inputReceived(agent);
      expect(working.status).toBe("working");
    });

    test("completeAgent transitions working to completed", () => {
      const agent = createTestAgent("working");
      const completed = completeAgent(agent);
      expect(completed.status).toBe("completed");
    });

    test("errorAgent transitions working to error", () => {
      const agent = createTestAgent("working");
      const errored = errorAgent(agent);
      expect(errored.status).toBe("error");
    });

    test("retryAgent transitions error to working", () => {
      const agent = createTestAgent("error");
      const retried = retryAgent(agent);
      expect(retried.status).toBe("working");
    });

    test("invalid transition throws", () => {
      const agent = createTestAgent("completed");
      expect(() => startAgent(agent)).toThrow(InvalidTransitionError);
    });

    test("safeTransitionAgent returns error for invalid transition", () => {
      const agent = createTestAgent("completed");
      const result = safeTransitionAgent(agent, "working");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Cannot transition");
      }
    });
  });
});

// ============================================================================
// Feature State Machine Tests
// ============================================================================

describe("Feature State Machine", () => {
  describe("canFeatureTransition", () => {
    test("allows valid transitions from planning", () => {
      expect(canFeatureTransition("planning", "in_progress")).toBe(true);
      expect(canFeatureTransition("planning", "cancelled")).toBe(true);
    });

    test("allows valid transitions from in_progress", () => {
      expect(canFeatureTransition("in_progress", "review")).toBe(true);
      expect(canFeatureTransition("in_progress", "blocked")).toBe(true);
      expect(canFeatureTransition("in_progress", "cancelled")).toBe(true);
    });

    test("allows valid transitions from review", () => {
      expect(canFeatureTransition("review", "in_progress")).toBe(true);
      expect(canFeatureTransition("review", "testing")).toBe(true);
    });

    test("allows valid transitions from testing", () => {
      expect(canFeatureTransition("testing", "in_progress")).toBe(true);
      expect(canFeatureTransition("testing", "completed")).toBe(true);
    });

    test("allows valid transitions from blocked", () => {
      expect(canFeatureTransition("blocked", "in_progress")).toBe(true);
      expect(canFeatureTransition("blocked", "cancelled")).toBe(true);
    });

    test("rejects invalid transitions", () => {
      expect(canFeatureTransition("planning", "review")).toBe(false);
      expect(canFeatureTransition("planning", "completed")).toBe(false);
      expect(canFeatureTransition("completed", "in_progress")).toBe(false);
      expect(canFeatureTransition("cancelled", "planning")).toBe(false);
    });
  });

  describe("isFeatureTerminalState", () => {
    test("completed and cancelled are terminal", () => {
      expect(isFeatureTerminalState("completed")).toBe(true);
      expect(isFeatureTerminalState("cancelled")).toBe(true);
    });

    test("other states are not terminal", () => {
      expect(isFeatureTerminalState("planning")).toBe(false);
      expect(isFeatureTerminalState("in_progress")).toBe(false);
      expect(isFeatureTerminalState("review")).toBe(false);
      expect(isFeatureTerminalState("testing")).toBe(false);
      expect(isFeatureTerminalState("blocked")).toBe(false);
    });
  });

  describe("Feature entity transitions", () => {
    const createTestFeature = (status: "planning" | "in_progress" | "review" | "testing" | "blocked" | "completed" | "cancelled" = "planning") => {
      return createFeature({
        id: generateFeatureId(),
        name: "Test Feature",
        workflowId: generateWorkflowId(),
        sessionId: generateSessionId(),
        currentStage: generateStageId(),
        branchName: "feature/test",
        status,
      });
    };

    test("startDevelopment transitions planning to in_progress", () => {
      const feature = createTestFeature("planning");
      const started = startDevelopment(feature);
      expect(started.status).toBe("in_progress");
    });

    test("submitForReview transitions in_progress to review", () => {
      const feature = createTestFeature("in_progress");
      const reviewed = submitForReview(feature);
      expect(reviewed.status).toBe("review");
    });

    test("requestChanges transitions review to in_progress", () => {
      const feature = createTestFeature("review");
      const changed = requestChanges(feature);
      expect(changed.status).toBe("in_progress");
    });

    test("moveToTesting transitions review to testing", () => {
      const feature = createTestFeature("review");
      const testing = moveToTesting(feature);
      expect(testing.status).toBe("testing");
    });

    test("failTests transitions testing to in_progress", () => {
      const feature = createTestFeature("testing");
      const failed = failTests(feature);
      expect(failed.status).toBe("in_progress");
    });

    test("completeFeature transitions testing to completed", () => {
      const feature = createTestFeature("testing");
      const completed = completeFeature(feature);
      expect(completed.status).toBe("completed");
    });

    test("blockFeature transitions in_progress to blocked", () => {
      const feature = createTestFeature("in_progress");
      const blocked = blockFeature(feature);
      expect(blocked.status).toBe("blocked");
    });

    test("unblockFeature transitions blocked to in_progress", () => {
      const feature = createTestFeature("blocked");
      const unblocked = unblockFeature(feature);
      expect(unblocked.status).toBe("in_progress");
    });

    test("cancelFeature from planning", () => {
      const feature = createTestFeature("planning");
      const cancelled = cancelFeature(feature);
      expect(cancelled.status).toBe("cancelled");
    });

    test("cannot skip stages", () => {
      const feature = createTestFeature("planning");
      expect(() => transitionFeature(feature, "review")).toThrow(InvalidTransitionError);
    });
  });
});

// ============================================================================
// Session State Machine Tests
// ============================================================================

describe("Session State Machine", () => {
  describe("canSessionTransition", () => {
    test("allows valid transitions from active", () => {
      expect(canSessionTransition("active", "paused")).toBe(true);
      expect(canSessionTransition("active", "completed")).toBe(true);
      expect(canSessionTransition("active", "crashed")).toBe(true);
    });

    test("allows valid transitions from paused", () => {
      expect(canSessionTransition("paused", "active")).toBe(true);
      expect(canSessionTransition("paused", "archived")).toBe(true);
    });

    test("allows valid transitions from crashed", () => {
      expect(canSessionTransition("crashed", "active")).toBe(true);
      expect(canSessionTransition("crashed", "archived")).toBe(true);
    });

    test("allows completed to archived", () => {
      expect(canSessionTransition("completed", "archived")).toBe(true);
    });

    test("archived is terminal", () => {
      expect(canSessionTransition("archived", "active")).toBe(false);
      expect(canSessionTransition("archived", "paused")).toBe(false);
    });
  });

  describe("isSessionTerminalState", () => {
    test("archived is terminal", () => {
      expect(isSessionTerminalState("archived")).toBe(true);
    });

    test("completed is not terminal (can archive)", () => {
      expect(isSessionTerminalState("completed")).toBe(false);
    });
  });

  describe("Session entity transitions", () => {
    const createTestSession = (status: "active" | "paused" | "completed" | "crashed" | "archived" = "active") => {
      return createSession({
        id: generateSessionId(),
        name: "Test Session",
        projectPath: "/tmp/project",
        status,
      });
    };

    test("pauseSession transitions active to paused", () => {
      const session = createTestSession("active");
      const paused = pauseSession(session);
      expect(paused.status).toBe("paused");
    });

    test("resumeSession transitions paused to active", () => {
      const session = createTestSession("paused");
      const resumed = resumeSession(session);
      expect(resumed.status).toBe("active");
    });

    test("completeSession transitions active to completed", () => {
      const session = createTestSession("active");
      const completed = completeSession(session);
      expect(completed.status).toBe("completed");
    });

    test("crashSession transitions active to crashed", () => {
      const session = createTestSession("active");
      const crashed = crashSession(session);
      expect(crashed.status).toBe("crashed");
    });

    test("recoverSession transitions crashed to active", () => {
      const session = createTestSession("crashed");
      const recovered = recoverSession(session);
      expect(recovered.status).toBe("active");
    });

    test("archiveSession from completed", () => {
      const session = createTestSession("completed");
      const archived = archiveSession(session);
      expect(archived.status).toBe("archived");
    });
  });
});

// ============================================================================
// Worktree State Machine Tests
// ============================================================================

describe("Worktree State Machine", () => {
  describe("canWorktreeTransition", () => {
    test("allows valid transitions from active", () => {
      expect(canWorktreeTransition("active", "stale")).toBe(true);
      expect(canWorktreeTransition("active", "removed")).toBe(true);
    });

    test("allows stale to removed", () => {
      expect(canWorktreeTransition("stale", "removed")).toBe(true);
    });

    test("removed is terminal", () => {
      expect(canWorktreeTransition("removed", "active")).toBe(false);
      expect(canWorktreeTransition("removed", "stale")).toBe(false);
    });
  });

  describe("isWorktreeTerminalState", () => {
    test("removed is terminal", () => {
      expect(isWorktreeTerminalState("removed")).toBe(true);
    });

    test("other states are not terminal", () => {
      expect(isWorktreeTerminalState("active")).toBe(false);
      expect(isWorktreeTerminalState("stale")).toBe(false);
    });
  });

  describe("Worktree entity transitions", () => {
    const createTestWorktree = (status: "active" | "stale" | "removed" = "active") => {
      return createWorktree({
        id: generateWorktreeId(),
        agentId: generateAgentId(),
        featureId: generateFeatureId(),
        path: "/tmp/worktree",
        branchName: "feature/test",
        status,
      });
    };

    test("markWorktreeStale transitions active to stale", () => {
      const worktree = createTestWorktree("active");
      const stale = markWorktreeStale(worktree);
      expect(stale.status).toBe("stale");
    });

    test("removeActiveWorktree transitions active to removed", () => {
      const worktree = createTestWorktree("active");
      const removed = removeActiveWorktree(worktree);
      expect(removed.status).toBe("removed");
    });

    test("cleanupWorktree transitions stale to removed", () => {
      const worktree = createTestWorktree("stale");
      const cleaned = cleanupWorktree(worktree);
      expect(cleaned.status).toBe("removed");
    });

    test("removeWorktree handles both active and stale", () => {
      const active = createTestWorktree("active");
      const stale = createTestWorktree("stale");
      const removed = createTestWorktree("removed");

      expect(removeWorktree(active).status).toBe("removed");
      expect(removeWorktree(stale).status).toBe("removed");
      expect(removeWorktree(removed).status).toBe("removed"); // Already removed
    });
  });
});

// ============================================================================
// InvalidTransitionError Tests
// ============================================================================

describe("InvalidTransitionError", () => {
  test("contains transition information", () => {
    const error = new InvalidTransitionError("idle", "completed", ["working"]);
    expect(error.from).toBe("idle");
    expect(error.to).toBe("completed");
    expect(error.validTransitions).toContain("working");
    expect(error.message).toContain("idle");
    expect(error.message).toContain("completed");
  });

  test("handles empty valid transitions", () => {
    const error = new InvalidTransitionError("completed", "working", []);
    expect(error.message).toContain("No valid transitions available");
  });
});
