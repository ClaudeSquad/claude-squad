/**
 * Handoff Repository Tests
 *
 * Tests for handoff persistence and query methods.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { HandoffRepository } from "../../../../src/infra/database/repositories/handoff.repository.js";
import { createTestDatabase, testId, type TestDatabaseContext } from "../test-helpers.js";
import type { CreateHandoff, HandoffType, HandoffContent } from "../../../../src/core/entities/handoff.js";
import type { DatabaseService } from "../../../../src/infra/database/connection.js";

/**
 * Helper to create a feature in the database (for foreign key constraint)
 */
function createTestFeature(db: DatabaseService, featureId: string): void {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO features (id, name, description, status, workflow_id, branch_name, requirements, acceptance_criteria, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [featureId, "Test Feature", "Test description", "planning", "wfl_test123", "feature/test", "[]", "[]", now, now]
  );
}

/**
 * Helper to create a CreateHandoff object with defaults.
 */
function createTestHandoffData(overrides: {
  id: string;
  fromAgent?: string;
  toAgent?: string;
  featureId: string;
  stageId?: string;
  type?: HandoffType;
  content?: Partial<HandoffContent>;
  isRead?: boolean;
}): CreateHandoff {
  return {
    id: overrides.id,
    fromAgent: overrides.fromAgent ?? "agt_from123abc",
    toAgent: overrides.toAgent ?? "agt_to456def",
    featureId: overrides.featureId,
    stageId: overrides.stageId ?? "stg_test123",
    type: overrides.type ?? "implementation",
    content: {
      architectureSummary: "Test architecture summary",
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      implementationNotes: [],
      ...overrides.content,
    },
    isRead: overrides.isRead ?? false,
  };
}

describe("HandoffRepository", () => {
  let ctx: TestDatabaseContext;
  let repo: HandoffRepository;

  beforeEach(async () => {
    ctx = await createTestDatabase("handoff-repo");
    repo = new HandoffRepository(ctx.db);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe("create", () => {
    it("should create a new handoff", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const data = createTestHandoffData({
        id: testId("hnd"),
        featureId,
      });

      const handoff = await repo.create(data);

      expect(handoff.id).toBe(data.id);
      expect(handoff.fromAgent).toBe(data.fromAgent);
      expect(handoff.toAgent).toBe(data.toAgent);
      expect(handoff.featureId).toBe(data.featureId);
      expect(handoff.type).toBe("implementation");
      expect(handoff.isRead).toBe(false);
      expect(handoff.createdAt).toBeInstanceOf(Date);
    });

    it("should store content as JSON", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const data = createTestHandoffData({
        id: testId("hnd"),
        featureId,
        content: {
          architectureSummary: "Custom summary",
          filesCreated: ["src/new.ts"],
          filesModified: ["package.json"],
          implementationNotes: ["Note 1", "Note 2"],
        },
      });

      const handoff = await repo.create(data);

      expect(handoff.content.architectureSummary).toBe("Custom summary");
      expect(handoff.content.filesCreated).toEqual(["src/new.ts"]);
      expect(handoff.content.filesModified).toEqual(["package.json"]);
      expect(handoff.content.implementationNotes).toEqual(["Note 1", "Note 2"]);
    });

    it("should create handoff with all types", async () => {
      const types: HandoffType[] = [
        "architecture",
        "implementation",
        "review_feedback",
        "test_plan",
        "deployment",
      ];

      for (const type of types) {
        const featureId = testId("ftr");
        createTestFeature(ctx.db, featureId);

        const data = createTestHandoffData({
          id: testId("hnd"),
          featureId,
          type,
        });

        const handoff = await repo.create(data);
        expect(handoff.type).toBe(type);
      }
    });
  });

  describe("findById", () => {
    it("should find existing handoff", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const created = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));

      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it("should return null for non-existent handoff", async () => {
      const found = await repo.findById("hnd_nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findByFeatureId", () => {
    it("should find all handoffs for a feature", async () => {
      const featureId = testId("ftr");
      const otherFeatureId = testId("ftr");
      createTestFeature(ctx.db, featureId);
      createTestFeature(ctx.db, otherFeatureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "architecture",
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId: otherFeatureId, // Different feature
      }));

      const handoffs = await repo.findByFeatureId(featureId);

      expect(handoffs.length).toBe(2);
      expect(handoffs.every((h) => h.featureId === featureId)).toBe(true);
    });

    it("should return chronological order", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const first = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));

      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      const second = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));

      const handoffs = await repo.findByFeatureId(featureId);

      expect(handoffs[0]!.id).toBe(first.id);
      expect(handoffs[1]!.id).toBe(second.id);
    });
  });

  describe("findByFromAgent", () => {
    it("should find handoffs from a specific agent", async () => {
      const fromAgentId = testId("agt");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        fromAgent: fromAgentId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        fromAgent: fromAgentId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        fromAgent: testId("agt"), // Different agent
      }));

      const handoffs = await repo.findByFromAgent(fromAgentId);

      expect(handoffs.length).toBe(2);
      expect(handoffs.every((h) => h.fromAgent === fromAgentId)).toBe(true);
    });
  });

  describe("findByToAgent", () => {
    it("should find handoffs to a specific agent", async () => {
      const toAgentId = testId("agt");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
      }));

      const handoffs = await repo.findByToAgent(toAgentId);

      expect(handoffs.length).toBe(2);
      expect(handoffs.every((h) => h.toAgent === toAgentId)).toBe(true);
    });
  });

  describe("findChain", () => {
    it("should return handoffs in chronological order", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const h1 = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "architecture",
      }));

      await new Promise((r) => setTimeout(r, 10));

      const h2 = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
      }));

      await new Promise((r) => setTimeout(r, 10));

      const h3 = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "review_feedback",
      }));

      const chain = await repo.findChain(featureId);

      expect(chain.length).toBe(3);
      expect(chain[0]!.id).toBe(h1.id);
      expect(chain[1]!.id).toBe(h2.id);
      expect(chain[2]!.id).toBe(h3.id);
    });
  });

  describe("findUnread", () => {
    it("should find unread handoffs for an agent", async () => {
      const toAgentId = testId("agt");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: false,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: true, // Already read
      }));

      const unread = await repo.findUnread(toAgentId);

      expect(unread.length).toBe(1);
      expect(unread[0]!.isRead).toBe(false);
    });
  });

  describe("markAsRead", () => {
    it("should mark handoff as read", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const handoff = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        isRead: false,
      }));

      expect(handoff.isRead).toBe(false);
      expect(handoff.readAt).toBeUndefined();

      await repo.markAsRead(handoff.id);

      const updated = await repo.findById(handoff.id);
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeInstanceOf(Date);
    });
  });

  describe("findByStageId", () => {
    it("should find handoffs by stage", async () => {
      const stageId = testId("stg");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        stageId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        stageId: testId("stg"), // Different stage
      }));

      const handoffs = await repo.findByStageId(stageId);

      expect(handoffs.length).toBe(1);
      expect(handoffs[0]!.stageId).toBe(stageId);
    });
  });

  describe("findByType", () => {
    it("should find handoffs by type", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "architecture",
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "architecture",
      }));

      const handoffs = await repo.findByType("architecture");

      expect(handoffs.length).toBe(2);
      expect(handoffs.every((h) => h.type === "architecture")).toBe(true);
    });
  });

  describe("findLatestForFeature", () => {
    it("should find the most recent handoff", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));

      await new Promise((r) => setTimeout(r, 10));

      const latest = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        content: { architectureSummary: "Latest" },
      }));

      const found = await repo.findLatestForFeature(featureId);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(latest.id);
      expect(found?.content.architectureSummary).toBe("Latest");
    });

    it("should return null when no handoffs exist", async () => {
      const found = await repo.findLatestForFeature("ftr_nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findBetweenAgents", () => {
    it("should find handoffs between two specific agents", async () => {
      const fromAgent = testId("agt");
      const toAgent = testId("agt");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        fromAgent,
        toAgent,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        fromAgent,
        toAgent: testId("agt"), // Different recipient
      }));

      const handoffs = await repo.findBetweenAgents(fromAgent, toAgent);

      expect(handoffs.length).toBe(1);
    });
  });

  describe("countByFeature", () => {
    it("should count handoffs for a feature", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));

      const count = await repo.countByFeature(featureId);
      expect(count).toBe(2);
    });
  });

  describe("countUnread", () => {
    it("should count unread handoffs for an agent", async () => {
      const toAgentId = testId("agt");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: false,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: false,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: true,
      }));

      const count = await repo.countUnread(toAgentId);
      expect(count).toBe(2);
    });
  });

  describe("countByType", () => {
    it("should count handoffs by type", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "architecture",
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
      }));

      const counts = await repo.countByType();

      expect(counts.architecture).toBeGreaterThanOrEqual(1);
      expect(counts.implementation).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getFeatureStats", () => {
    it("should return statistics for a feature", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "architecture",
        isRead: true,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
        isRead: false,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        type: "implementation",
        isRead: false,
      }));

      const stats = await repo.getFeatureStats(featureId);

      expect(stats.total).toBe(3);
      expect(stats.read).toBe(1);
      expect(stats.unread).toBe(2);
      expect(stats.byType.architecture).toBe(1);
      expect(stats.byType.implementation).toBe(2);
    });
  });

  describe("deleteByFeature", () => {
    it("should delete all handoffs for a feature", async () => {
      const featureId = testId("ftr");
      const otherFeatureId = testId("ftr");
      createTestFeature(ctx.db, featureId);
      createTestFeature(ctx.db, otherFeatureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId: otherFeatureId,
      }));

      const deleted = await repo.deleteByFeature(featureId);

      expect(deleted).toBe(2);

      const remaining = await repo.findByFeatureId(featureId);
      expect(remaining.length).toBe(0);

      // Other feature should be unaffected
      const otherRemaining = await repo.findByFeatureId(otherFeatureId);
      expect(otherRemaining.length).toBe(1);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all handoffs for an agent as read", async () => {
      const toAgentId = testId("agt");
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: false,
      }));
      await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
        toAgent: toAgentId,
        isRead: false,
      }));

      const updated = await repo.markAllAsRead(toAgentId);

      expect(updated).toBe(2);

      const unread = await repo.countUnread(toAgentId);
      expect(unread).toBe(0);
    });
  });

  describe("delete", () => {
    it("should delete a handoff", async () => {
      const featureId = testId("ftr");
      createTestFeature(ctx.db, featureId);

      const handoff = await repo.create(createTestHandoffData({
        id: testId("hnd"),
        featureId,
      }));

      await repo.delete(handoff.id);

      const found = await repo.findById(handoff.id);
      expect(found).toBeNull();
    });
  });
});
