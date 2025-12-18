/**
 * ID Types Tests
 *
 * Tests for branded ID types, generation, validation, and type guards.
 */

import { describe, test, expect } from "bun:test";
import {
  // Generation functions
  generateSessionId,
  generateAgentId,
  generateFeatureId,
  generateSkillId,
  generateWorkflowId,
  generateWorktreeId,
  generateStageId,
  generateHandoffId,
  generateIntegrationId,
  generateId,
  generateShortId,
  generateNumericId,
  // Validation & utilities
  getIdPrefix,
  isValidId,
  createIdPattern,
  // Type guards
  isSessionId,
  isAgentId,
  isFeatureId,
  isWorkflowId,
  isSkillId,
  isWorktreeId,
  isStageId,
  isHandoffId,
  isIntegrationId,
  // Conversion utilities
  toSessionId,
  toAgentId,
  toFeatureId,
  toWorkflowId,
  toSkillId,
  toWorktreeId,
  toStageId,
  toHandoffId,
  toIntegrationId,
  // Constants
  ID_PREFIXES,
} from "../../../src/core/types/id";

describe("ID Generation", () => {
  describe("generateSessionId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateSessionId();
      expect(id.startsWith("ses_")).toBe(true);
    });

    test("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
      expect(ids.size).toBe(100);
    });

    test("generates ID with correct format", () => {
      const id = generateSessionId();
      expect(id).toMatch(/^ses_[A-Za-z0-9]+$/);
    });
  });

  describe("generateAgentId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateAgentId();
      expect(id.startsWith("agt_")).toBe(true);
    });

    test("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateAgentId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("generateFeatureId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateFeatureId();
      expect(id.startsWith("ftr_")).toBe(true);
    });
  });

  describe("generateSkillId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateSkillId();
      expect(id.startsWith("skl_")).toBe(true);
    });
  });

  describe("generateWorkflowId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateWorkflowId();
      expect(id.startsWith("wfl_")).toBe(true);
    });
  });

  describe("generateWorktreeId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateWorktreeId();
      expect(id.startsWith("wkt_")).toBe(true);
    });
  });

  describe("generateStageId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateStageId();
      expect(id.startsWith("stg_")).toBe(true);
    });
  });

  describe("generateHandoffId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateHandoffId();
      expect(id.startsWith("hnd_")).toBe(true);
    });
  });

  describe("generateIntegrationId", () => {
    test("generates ID with correct prefix", () => {
      const id = generateIntegrationId();
      expect(id.startsWith("int_")).toBe(true);
    });
  });

  describe("generateId", () => {
    test("generates ID with default length", () => {
      const id = generateId();
      expect(id.length).toBe(12);
    });

    test("generates ID with custom length", () => {
      const id = generateId(20);
      expect(id.length).toBe(20);
    });
  });

  describe("generateShortId", () => {
    test("generates short ID", () => {
      const id = generateShortId();
      expect(id.length).toBe(8);
    });
  });

  describe("generateNumericId", () => {
    test("generates numeric-only ID", () => {
      const id = generateNumericId();
      expect(id).toMatch(/^\d+$/);
      expect(id.length).toBe(6);
    });
  });
});

describe("ID Validation", () => {
  describe("getIdPrefix", () => {
    test("extracts prefix from valid ID", () => {
      expect(getIdPrefix("ses_abc123")).toBe("ses");
      expect(getIdPrefix("agt_xyz789")).toBe("agt");
      expect(getIdPrefix("ftr_def456")).toBe("ftr");
    });

    test("returns empty string for invalid format", () => {
      expect(getIdPrefix("invalid")).toBe("");
      expect(getIdPrefix("")).toBe("");
      expect(getIdPrefix("no-prefix-here")).toBe("");
    });
  });

  describe("isValidId", () => {
    test("validates correct format", () => {
      expect(isValidId("ses_abc123")).toBe(true);
      expect(isValidId("agt_XYZ789")).toBe(true);
      expect(isValidId("ftr_ABC123def456")).toBe(true);
    });

    test("validates with expected prefix", () => {
      expect(isValidId("ses_abc123", "ses")).toBe(true);
      expect(isValidId("ses_abc123", "agt")).toBe(false);
    });

    test("rejects invalid formats", () => {
      expect(isValidId("")).toBe(false);
      expect(isValidId("invalid")).toBe(false);
      expect(isValidId("_abc123")).toBe(false);
      expect(isValidId("ses_")).toBe(false);
      expect(isValidId("SES_abc123")).toBe(false); // uppercase prefix
      expect(isValidId("ses-abc123")).toBe(false); // wrong separator
    });

    test("handles non-string input", () => {
      expect(isValidId(null as unknown as string)).toBe(false);
      expect(isValidId(undefined as unknown as string)).toBe(false);
      expect(isValidId(123 as unknown as string)).toBe(false);
    });
  });

  describe("createIdPattern", () => {
    test("creates correct regex pattern", () => {
      const pattern = createIdPattern("ses");
      expect(pattern.test("ses_abc123")).toBe(true);
      expect(pattern.test("ses_XYZ789ABC")).toBe(true);
      expect(pattern.test("agt_abc123")).toBe(false);
      expect(pattern.test("ses-abc123")).toBe(false);
    });
  });
});

describe("Type Guards", () => {
  test("isSessionId validates session IDs", () => {
    expect(isSessionId("ses_abc123")).toBe(true);
    expect(isSessionId("agt_abc123")).toBe(false);
    expect(isSessionId("invalid")).toBe(false);
  });

  test("isAgentId validates agent IDs", () => {
    expect(isAgentId("agt_abc123")).toBe(true);
    expect(isAgentId("ses_abc123")).toBe(false);
  });

  test("isFeatureId validates feature IDs", () => {
    expect(isFeatureId("ftr_abc123")).toBe(true);
    expect(isFeatureId("ses_abc123")).toBe(false);
  });

  test("isWorkflowId validates workflow IDs", () => {
    expect(isWorkflowId("wfl_abc123")).toBe(true);
    expect(isWorkflowId("ftr_abc123")).toBe(false);
  });

  test("isSkillId validates skill IDs", () => {
    expect(isSkillId("skl_abc123")).toBe(true);
    expect(isSkillId("wfl_abc123")).toBe(false);
  });

  test("isWorktreeId validates worktree IDs", () => {
    expect(isWorktreeId("wkt_abc123")).toBe(true);
    expect(isWorktreeId("skl_abc123")).toBe(false);
  });

  test("isStageId validates stage IDs", () => {
    expect(isStageId("stg_abc123")).toBe(true);
    expect(isStageId("wkt_abc123")).toBe(false);
  });

  test("isHandoffId validates handoff IDs", () => {
    expect(isHandoffId("hnd_abc123")).toBe(true);
    expect(isHandoffId("stg_abc123")).toBe(false);
  });

  test("isIntegrationId validates integration IDs", () => {
    expect(isIntegrationId("int_abc123")).toBe(true);
    expect(isIntegrationId("hnd_abc123")).toBe(false);
  });
});

describe("Conversion Utilities", () => {
  test("toSessionId converts valid string", () => {
    const id = "ses_abc123xyz789";
    expect(() => toSessionId(id)).not.toThrow();
    expect(toSessionId(id) as string).toBe(id);
  });

  test("toSessionId throws for invalid string", () => {
    expect(() => toSessionId("invalid")).toThrow("Invalid SessionId format");
    expect(() => toSessionId("agt_abc123")).toThrow("Invalid SessionId format");
  });

  test("toAgentId converts valid string", () => {
    const id = "agt_abc123xyz789";
    expect(() => toAgentId(id)).not.toThrow();
    expect(toAgentId(id) as string).toBe(id);
  });

  test("toAgentId throws for invalid string", () => {
    expect(() => toAgentId("invalid")).toThrow("Invalid AgentId format");
  });

  test("toFeatureId converts valid string", () => {
    const id = "ftr_abc123xyz789";
    expect(toFeatureId(id) as string).toBe(id);
  });

  test("toWorkflowId converts valid string", () => {
    const id = "wfl_abc123xyz789";
    expect(toWorkflowId(id) as string).toBe(id);
  });

  test("toSkillId converts valid string", () => {
    const id = "skl_abc123xyz789";
    expect(toSkillId(id) as string).toBe(id);
  });

  test("toWorktreeId converts valid string", () => {
    const id = "wkt_abc123xyz789";
    expect(toWorktreeId(id) as string).toBe(id);
  });

  test("toStageId converts valid string", () => {
    const id = "stg_abc123xyz789";
    expect(toStageId(id) as string).toBe(id);
  });

  test("toHandoffId converts valid string", () => {
    const id = "hnd_abc123xyz789";
    expect(toHandoffId(id) as string).toBe(id);
  });

  test("toIntegrationId converts valid string", () => {
    const id = "int_abc123xyz789";
    expect(toIntegrationId(id) as string).toBe(id);
  });
});

describe("ID_PREFIXES constant", () => {
  test("contains all expected prefixes", () => {
    expect(ID_PREFIXES.ses).toBe("SessionId");
    expect(ID_PREFIXES.agt).toBe("AgentId");
    expect(ID_PREFIXES.ftr).toBe("FeatureId");
    expect(ID_PREFIXES.skl).toBe("SkillId");
    expect(ID_PREFIXES.wfl).toBe("WorkflowId");
    expect(ID_PREFIXES.wkt).toBe("WorktreeId");
    expect(ID_PREFIXES.stg).toBe("StageId");
    expect(ID_PREFIXES.hnd).toBe("HandoffId");
    expect(ID_PREFIXES.int).toBe("IntegrationId");
  });
});
