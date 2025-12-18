/**
 * ID Generation Tests
 *
 * Tests for ID generation utilities.
 */

import { describe, test, expect } from "bun:test";
import {
  generateSessionId,
  generateAgentId,
  generateFeatureId,
  generateWorkflowId,
  generateSkillId,
  generateWorktreeId,
  generateHandoffId,
  generateId,
  generateShortId,
  generateNumericId,
  getIdPrefix,
  isValidId,
  isSessionId,
  isAgentId,
  isFeatureId,
  isWorkflowId,
  isSkillId,
} from "../../src/utils/id.js";

describe("ID Generation", () => {
  describe("generateSessionId", () => {
    test("should generate IDs with ses_ prefix", () => {
      const id = generateSessionId();
      expect(id.startsWith("ses_")).toBe(true);
    });

    test("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      expect(ids.size).toBe(100);
    });

    test("should generate IDs of expected length", () => {
      const id = generateSessionId();
      // ses_ (4) + 12 chars = 16
      expect(id.length).toBe(16);
    });
  });

  describe("generateAgentId", () => {
    test("should generate IDs with agt_ prefix", () => {
      const id = generateAgentId();
      expect(id.startsWith("agt_")).toBe(true);
    });

    test("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateAgentId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("generateFeatureId", () => {
    test("should generate IDs with ftr_ prefix", () => {
      const id = generateFeatureId();
      expect(id.startsWith("ftr_")).toBe(true);
    });
  });

  describe("generateWorkflowId", () => {
    test("should generate IDs with wfl_ prefix", () => {
      const id = generateWorkflowId();
      expect(id.startsWith("wfl_")).toBe(true);
    });
  });

  describe("generateSkillId", () => {
    test("should generate IDs with skl_ prefix", () => {
      const id = generateSkillId();
      expect(id.startsWith("skl_")).toBe(true);
    });
  });

  describe("generateWorktreeId", () => {
    test("should generate IDs with wkt_ prefix", () => {
      const id = generateWorktreeId();
      expect(id.startsWith("wkt_")).toBe(true);
    });
  });

  describe("generateHandoffId", () => {
    test("should generate IDs with hnd_ prefix", () => {
      const id = generateHandoffId();
      expect(id.startsWith("hnd_")).toBe(true);
    });
  });

  describe("generateId", () => {
    test("should generate ID of default length", () => {
      const id = generateId();
      expect(id.length).toBe(12);
    });

    test("should generate ID of specified length", () => {
      expect(generateId(8).length).toBe(8);
      expect(generateId(20).length).toBe(20);
    });
  });

  describe("generateShortId", () => {
    test("should generate short ID", () => {
      const id = generateShortId();
      expect(id.length).toBe(8);
    });
  });

  describe("generateNumericId", () => {
    test("should generate numeric-only ID", () => {
      const id = generateNumericId();
      expect(/^\d+$/.test(id)).toBe(true);
      expect(id.length).toBe(6);
    });
  });
});

describe("ID Utilities", () => {
  describe("getIdPrefix", () => {
    test("should extract prefix from ID", () => {
      expect(getIdPrefix("ses_abc123")).toBe("ses");
      expect(getIdPrefix("agt_xyz789")).toBe("agt");
      expect(getIdPrefix("ftr_test")).toBe("ftr");
    });

    test("should return empty string for invalid ID", () => {
      expect(getIdPrefix("noprefix")).toBe("");
      expect(getIdPrefix("")).toBe("");
    });
  });

  describe("isValidId", () => {
    test("should validate correctly formatted IDs", () => {
      expect(isValidId("ses_abc123XYZ")).toBe(true);
      expect(isValidId("agt_test123")).toBe(true);
      expect(isValidId("ftr_A1B2C3")).toBe(true);
    });

    test("should reject invalid IDs", () => {
      expect(isValidId("")).toBe(false);
      expect(isValidId("noprefix")).toBe(false);
      expect(isValidId("ses-abc123")).toBe(false);
      expect(isValidId("SES_abc123")).toBe(false);
    });

    test("should validate with expected prefix", () => {
      expect(isValidId("ses_abc123", "ses")).toBe(true);
      expect(isValidId("ses_abc123", "agt")).toBe(false);
    });
  });

  describe("Type Guards", () => {
    test("isSessionId should validate session IDs", () => {
      expect(isSessionId("ses_abc123")).toBe(true);
      expect(isSessionId("agt_abc123")).toBe(false);
    });

    test("isAgentId should validate agent IDs", () => {
      expect(isAgentId("agt_abc123")).toBe(true);
      expect(isAgentId("ses_abc123")).toBe(false);
    });

    test("isFeatureId should validate feature IDs", () => {
      expect(isFeatureId("ftr_abc123")).toBe(true);
      expect(isFeatureId("ses_abc123")).toBe(false);
    });

    test("isWorkflowId should validate workflow IDs", () => {
      expect(isWorkflowId("wfl_abc123")).toBe(true);
      expect(isWorkflowId("ses_abc123")).toBe(false);
    });

    test("isSkillId should validate skill IDs", () => {
      expect(isSkillId("skl_abc123")).toBe(true);
      expect(isSkillId("ses_abc123")).toBe(false);
    });
  });
});
