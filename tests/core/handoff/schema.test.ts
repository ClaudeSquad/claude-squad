/**
 * HandoffYaml Schema Tests
 *
 * Tests for the YAML schema validation and utility functions.
 */

import { describe, test, expect } from "bun:test";
import {
  validateHandoffYaml,
  safeValidateHandoffYaml,
  createHandoffYaml,
  getHandoffYamlPath,
  getHandoffDirPath,
  getStageHandoffPath,
  hasBlockers,
  hasCriticalBlockers,
  getHighPrioritySteps,
  countFilesChanged,
  countLinesChanged,
  HANDOFF_YAML_VERSION,
  type HandoffYaml,
  type HandoffAgentInfo,
  type HandoffContext,
  type FileModified,
  type NextStep,
  type Blocker,
} from "../../../src/core/handoff/schema.js";

// ============================================================================
// Test Data Factories
// ============================================================================

function createTestAgentInfo(overrides?: Partial<HandoffAgentInfo>): HandoffAgentInfo {
  return {
    id: "agt_test123abc",
    name: "Test Agent",
    role: "tester",
    ...overrides,
  };
}

function createTestContext(overrides?: Partial<HandoffContext>): HandoffContext {
  return {
    summary: "Test summary of completed work",
    decisions: [],
    currentState: {
      phase: "testing",
      progress: 50,
      status: "in-progress",
    },
    ...overrides,
  };
}

function createValidHandoffYaml(overrides?: Partial<HandoffYaml>): HandoffYaml {
  return {
    version: HANDOFF_YAML_VERSION,
    fromAgent: createTestAgentInfo(),
    toAgent: "any",
    context: createTestContext(),
    filesModified: [],
    nextSteps: [],
    blockers: [],
    metadata: {
      timestamp: new Date().toISOString(),
      featureId: "ftr_test123abc",
      urgency: "normal",
    },
    ...overrides,
  };
}

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("HandoffYaml Schema", () => {
  describe("validateHandoffYaml", () => {
    test("should validate a minimal valid handoff", () => {
      const handoff = createValidHandoffYaml();
      const result = validateHandoffYaml(handoff);
      expect(result.version).toBe(HANDOFF_YAML_VERSION);
      expect(result.fromAgent.id).toBe("agt_test123abc");
    });

    test("should validate handoff with specific destination agent", () => {
      const handoff = createValidHandoffYaml({
        toAgent: {
          id: "agt_dest456def",
          name: "Destination Agent",
        },
      });
      const result = validateHandoffYaml(handoff);
      expect(result.toAgent).toEqual({
        id: "agt_dest456def",
        name: "Destination Agent",
      });
    });

    test("should validate handoff with decisions", () => {
      const handoff = createValidHandoffYaml({
        context: createTestContext({
          decisions: [
            {
              title: "Architecture Choice",
              decision: "Use microservices",
              rationale: "Better scalability",
              alternatives: ["Monolith", "Serverless"],
            },
          ],
        }),
      });
      const result = validateHandoffYaml(handoff);
      expect(result.context.decisions).toHaveLength(1);
      expect(result.context.decisions[0].title).toBe("Architecture Choice");
    });

    test("should validate handoff with files modified", () => {
      const filesModified: FileModified[] = [
        {
          path: "src/main.ts",
          description: "Added main entry point",
          changeType: "created",
          linesAdded: 50,
        },
        {
          path: "package.json",
          description: "Updated dependencies",
          changeType: "modified",
          linesAdded: 5,
          linesRemoved: 2,
        },
      ];
      const handoff = createValidHandoffYaml({ filesModified });
      const result = validateHandoffYaml(handoff);
      expect(result.filesModified).toHaveLength(2);
    });

    test("should validate handoff with next steps", () => {
      const nextSteps: NextStep[] = [
        {
          priority: "urgent",
          description: "Fix critical bug",
          estimatedEffort: "2 hours",
        },
        {
          priority: "normal",
          description: "Implement feature",
          assignedTo: "frontend",
        },
      ];
      const handoff = createValidHandoffYaml({ nextSteps });
      const result = validateHandoffYaml(handoff);
      expect(result.nextSteps).toHaveLength(2);
      expect(result.nextSteps[0].priority).toBe("urgent");
    });

    test("should validate handoff with blockers", () => {
      const blockers: Blocker[] = [
        {
          severity: "critical",
          description: "API endpoint not available",
          suggestedResolution: "Contact backend team",
        },
      ];
      const handoff = createValidHandoffYaml({ blockers });
      const result = validateHandoffYaml(handoff);
      expect(result.blockers).toHaveLength(1);
    });

    test("should validate handoff with git state", () => {
      const handoff = createValidHandoffYaml({
        metadata: {
          timestamp: new Date().toISOString(),
          featureId: "ftr_test123abc",
          urgency: "normal",
          gitState: {
            branch: "feature/test",
            commit: "abc123def456",
            shortCommit: "abc123d",
            isDirty: false,
            ahead: 3,
            behind: 0,
          },
        },
      });
      const result = validateHandoffYaml(handoff);
      expect(result.metadata.gitState?.branch).toBe("feature/test");
    });

    test("should reject invalid version", () => {
      const handoff = createValidHandoffYaml();
      (handoff as Record<string, unknown>).version = "2.0";
      expect(() => validateHandoffYaml(handoff)).toThrow();
    });

    test("should reject missing required fields", () => {
      const handoff = createValidHandoffYaml();
      delete (handoff as Record<string, unknown>).fromAgent;
      expect(() => validateHandoffYaml(handoff)).toThrow();
    });

    test("should reject invalid progress value", () => {
      const handoff = createValidHandoffYaml({
        context: createTestContext({
          currentState: {
            phase: "test",
            progress: 150, // Invalid: > 100
            status: "test",
          },
        }),
      });
      expect(() => validateHandoffYaml(handoff)).toThrow();
    });

    test("should reject summary exceeding max length", () => {
      const longSummary = "a".repeat(600);
      const handoff = createValidHandoffYaml({
        context: createTestContext({
          summary: longSummary,
        }),
      });
      expect(() => validateHandoffYaml(handoff)).toThrow();
    });
  });

  describe("safeValidateHandoffYaml", () => {
    test("should return success for valid handoff", () => {
      const handoff = createValidHandoffYaml();
      const result = safeValidateHandoffYaml(handoff);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test("should return error for invalid handoff", () => {
      const invalid = { version: "invalid" };
      const result = safeValidateHandoffYaml(invalid);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createHandoffYaml", () => {
  test("should create handoff with required fields", () => {
    const result = createHandoffYaml({
      fromAgent: createTestAgentInfo(),
      context: createTestContext(),
      featureId: "ftr_abc123xyz",
    });

    expect(result.version).toBe(HANDOFF_YAML_VERSION);
    expect(result.fromAgent.id).toBe("agt_test123abc");
    expect(result.metadata.featureId).toBe("ftr_abc123xyz");
    expect(result.toAgent).toBe("any"); // Default
  });

  test("should create handoff with optional fields", () => {
    const result = createHandoffYaml({
      fromAgent: createTestAgentInfo(),
      toAgent: { id: "agt_dest", name: "Destination" },
      context: createTestContext(),
      featureId: "ftr_abc123xyz",
      stageId: "stg_test123",
      sessionId: "ses_test123",
      durationMs: 5000,
      tokensUsed: 1000,
      costUsd: 0.05,
    });

    expect(result.toAgent).toEqual({ id: "agt_dest", name: "Destination" });
    expect(result.metadata.stageId).toBe("stg_test123");
    expect(result.metadata.sessionId).toBe("ses_test123");
    expect(result.metadata.durationMs).toBe(5000);
  });

  test("should set timestamp automatically", () => {
    const before = new Date().toISOString();
    const result = createHandoffYaml({
      fromAgent: createTestAgentInfo(),
      context: createTestContext(),
      featureId: "ftr_abc123xyz",
    });
    const after = new Date().toISOString();

    expect(result.metadata.timestamp >= before).toBe(true);
    expect(result.metadata.timestamp <= after).toBe(true);
  });

  test("should include git state when provided", () => {
    const result = createHandoffYaml({
      fromAgent: createTestAgentInfo(),
      context: createTestContext(),
      featureId: "ftr_abc123xyz",
      gitState: {
        branch: "main",
        commit: "abc123",
        isDirty: true,
      },
    });

    expect(result.metadata.gitState?.branch).toBe("main");
    expect(result.metadata.gitState?.isDirty).toBe(true);
  });
});

// ============================================================================
// Path Utility Tests
// ============================================================================

describe("Path Utilities", () => {
  describe("getHandoffYamlPath", () => {
    test("should return correct path for worktree", () => {
      const path = getHandoffYamlPath("/path/to/worktree");
      expect(path).toBe("/path/to/worktree/HANDOFF.yaml");
    });

    test("should handle trailing slash", () => {
      const path = getHandoffYamlPath("/path/to/worktree/");
      expect(path).toBe("/path/to/worktree//HANDOFF.yaml");
    });
  });

  describe("getHandoffDirPath", () => {
    test("should return correct directory path", () => {
      const path = getHandoffDirPath("/path/to/worktree");
      expect(path).toBe("/path/to/worktree/.claude/handoffs");
    });
  });

  describe("getStageHandoffPath", () => {
    test("should return stage-specific path", () => {
      const path = getStageHandoffPath("/path/to/worktree", "stg_test123");
      expect(path).toBe("/path/to/worktree/.claude/handoffs/HANDOFF-stg_test123.yaml");
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("hasBlockers", () => {
    test("should return true when blockers exist", () => {
      const handoff = createValidHandoffYaml({
        blockers: [{ severity: "medium", description: "Test blocker" }],
      });
      expect(hasBlockers(handoff)).toBe(true);
    });

    test("should return false when no blockers", () => {
      const handoff = createValidHandoffYaml({ blockers: [] });
      expect(hasBlockers(handoff)).toBe(false);
    });
  });

  describe("hasCriticalBlockers", () => {
    test("should return true when critical blockers exist", () => {
      const handoff = createValidHandoffYaml({
        blockers: [{ severity: "critical", description: "Critical blocker" }],
      });
      expect(hasCriticalBlockers(handoff)).toBe(true);
    });

    test("should return false when only non-critical blockers", () => {
      const handoff = createValidHandoffYaml({
        blockers: [
          { severity: "high", description: "High severity" },
          { severity: "medium", description: "Medium severity" },
        ],
      });
      expect(hasCriticalBlockers(handoff)).toBe(false);
    });

    test("should return false when no blockers", () => {
      const handoff = createValidHandoffYaml({ blockers: [] });
      expect(hasCriticalBlockers(handoff)).toBe(false);
    });
  });

  describe("getHighPrioritySteps", () => {
    test("should return urgent and high priority steps", () => {
      const handoff = createValidHandoffYaml({
        nextSteps: [
          { priority: "urgent", description: "Urgent step" },
          { priority: "high", description: "High priority step" },
          { priority: "normal", description: "Normal step" },
          { priority: "low", description: "Low priority step" },
        ],
      });
      const highPriority = getHighPrioritySteps(handoff);
      expect(highPriority).toHaveLength(2);
      expect(highPriority.map((s) => s.priority)).toEqual(["urgent", "high"]);
    });

    test("should return empty array when no high priority steps", () => {
      const handoff = createValidHandoffYaml({
        nextSteps: [
          { priority: "normal", description: "Normal step" },
          { priority: "low", description: "Low step" },
        ],
      });
      expect(getHighPrioritySteps(handoff)).toHaveLength(0);
    });
  });

  describe("countFilesChanged", () => {
    test("should count files by change type", () => {
      const handoff = createValidHandoffYaml({
        filesModified: [
          { path: "a.ts", description: "Created", changeType: "created" },
          { path: "b.ts", description: "Created", changeType: "created" },
          { path: "c.ts", description: "Modified", changeType: "modified" },
          { path: "d.ts", description: "Deleted", changeType: "deleted" },
          { path: "e.ts", description: "Renamed", changeType: "renamed" },
        ],
      });
      const counts = countFilesChanged(handoff);
      expect(counts.created).toBe(2);
      expect(counts.modified).toBe(1);
      expect(counts.deleted).toBe(1);
      expect(counts.renamed).toBe(1);
      expect(counts.total).toBe(5);
    });

    test("should return zeros for empty files", () => {
      const handoff = createValidHandoffYaml({ filesModified: [] });
      const counts = countFilesChanged(handoff);
      expect(counts.total).toBe(0);
    });
  });

  describe("countLinesChanged", () => {
    test("should count lines added and removed", () => {
      const handoff = createValidHandoffYaml({
        filesModified: [
          {
            path: "a.ts",
            description: "Test",
            changeType: "modified",
            linesAdded: 100,
            linesRemoved: 20,
          },
          {
            path: "b.ts",
            description: "Test",
            changeType: "created",
            linesAdded: 50,
          },
        ],
      });
      const counts = countLinesChanged(handoff);
      expect(counts.added).toBe(150);
      expect(counts.removed).toBe(20);
      expect(counts.net).toBe(130);
    });

    test("should handle missing line counts", () => {
      const handoff = createValidHandoffYaml({
        filesModified: [
          { path: "a.ts", description: "Test", changeType: "modified" },
        ],
      });
      const counts = countLinesChanged(handoff);
      expect(counts.added).toBe(0);
      expect(counts.removed).toBe(0);
      expect(counts.net).toBe(0);
    });
  });
});
