/**
 * Session Repository Tests
 *
 * Tests for session persistence and conversation history.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SessionRepository } from "../../../../src/infra/database/repositories/session.repository.js";
import { createTestDatabase, testId, type TestDatabaseContext } from "../test-helpers.js";
import type { CreateSession } from "../../../../src/core/entities/session.js";

describe("SessionRepository", () => {
  let ctx: TestDatabaseContext;
  let repo: SessionRepository;

  beforeEach(async () => {
    ctx = await createTestDatabase("session-repo");
    repo = new SessionRepository(ctx.db);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe("create", () => {
    it("should create a new session", async () => {
      const data: CreateSession = {
        id: testId("ses"),
        projectPath: "/path/to/project",
        name: "Test Session",
      };

      const session = await repo.create(data);

      expect(session.id).toBe(data.id);
      expect(session.projectPath).toBe(data.projectPath);
      expect(session.name).toBe(data.name);
      expect(session.status).toBe("active");
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it("should set default values", async () => {
      const data: CreateSession = {
        id: testId("ses"),
        projectPath: "/path/to/project",
        name: "Minimal Session",
      };

      const session = await repo.create(data);

      expect(session.conversationHistory).toEqual([]);
      expect(session.commandHistory).toEqual([]);
      expect(session.config).toEqual({});
    });

    it("should store custom config", async () => {
      const data: CreateSession = {
        id: testId("ses"),
        projectPath: "/path/to/project",
        name: "Configured Session",
        config: {
          theme: "dark",
          verbose: true,
        },
      };

      const session = await repo.create(data);

      expect(session.config).toEqual({
        theme: "dark",
        verbose: true,
      });
    });
  });

  describe("findById", () => {
    it("should find existing session", async () => {
      const created = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "FindById Test",
      });

      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe("FindById Test");
    });

    it("should return null for non-existent session", async () => {
      const found = await repo.findById("ses_nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("findByIdWithHistory", () => {
    it("should include conversation history", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "History Test",
      });

      await repo.addMessage(session.id, {
        role: "user",
        content: "Hello",
        timestamp: new Date(),
      });
      await repo.addMessage(session.id, {
        role: "assistant",
        content: "Hi there!",
        timestamp: new Date(),
      });

      const found = await repo.findByIdWithHistory(session.id);

      expect(found?.conversationHistory.length).toBe(2);
      expect(found?.conversationHistory[0].role).toBe("user");
      expect(found?.conversationHistory[0].content).toBe("Hello");
    });
  });

  describe("findActive", () => {
    it("should find active sessions", async () => {
      await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Active 1",
      });
      await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Active 2",
      });

      const active = await repo.findActive();

      expect(active.length).toBeGreaterThanOrEqual(2);
      expect(active.every((s) => s.status === "active")).toBe(true);
    });
  });

  describe("findByProjectPath", () => {
    it("should find sessions for a project", async () => {
      const projectPath = "/unique/project/path";

      await repo.create({
        id: testId("ses"),
        projectPath,
        name: "Project Session 1",
      });
      await repo.create({
        id: testId("ses"),
        projectPath,
        name: "Project Session 2",
      });
      await repo.create({
        id: testId("ses"),
        projectPath: "/different/path",
        name: "Different Project",
      });

      const sessions = await repo.findByProjectPath(projectPath);

      expect(sessions.length).toBe(2);
      expect(sessions.every((s) => s.projectPath === projectPath)).toBe(true);
    });
  });

  describe("update", () => {
    it("should update session name", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Original Name",
      });

      const updated = await repo.update(session.id, { name: "Updated Name" });

      expect(updated.name).toBe("Updated Name");

      const found = await repo.findById(session.id);
      expect(found?.name).toBe("Updated Name");
    });

    it("should update session status", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Status Test",
      });

      await repo.update(session.id, { status: "completed" });

      const found = await repo.findById(session.id);
      expect(found?.status).toBe("completed");
    });
  });

  describe("updateLastActive", () => {
    it("should update lastActiveAt timestamp", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Activity Test",
      });

      const before = session.lastActiveAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repo.updateLastActive(session.id);

      const found = await repo.findById(session.id);
      expect(found?.lastActiveAt.getTime()).toBeGreaterThan(before.getTime());
    });
  });

  describe("conversation history", () => {
    it("should add messages", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Message Test",
      });

      await repo.addMessage(session.id, {
        role: "user",
        content: "Question?",
        timestamp: new Date(),
      });

      const history = await repo.getConversationHistory(session.id);
      expect(history.length).toBe(1);
      expect(history[0].content).toBe("Question?");
    });

    it("should respect limit parameter", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Limit Test",
      });

      for (let i = 0; i < 10; i++) {
        await repo.addMessage(session.id, {
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const limited = await repo.getConversationHistory(session.id, 5);
      expect(limited.length).toBe(5);
    });

    it("should store messages with all roles", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Roles Test",
      });

      await repo.addMessage(session.id, {
        role: "user",
        content: "Question?",
        timestamp: new Date(),
      });
      await repo.addMessage(session.id, {
        role: "assistant",
        content: "Answer!",
        timestamp: new Date(),
      });
      await repo.addMessage(session.id, {
        role: "system",
        content: "Context",
        timestamp: new Date(),
      });

      const history = await repo.getConversationHistory(session.id);
      expect(history.length).toBe(3);
      expect(history.map(m => m.role)).toEqual(["user", "assistant", "system"]);
    });
  });

  describe("command history", () => {
    it("should add commands", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Command Test",
      });

      await repo.addCommand(session.id, "/help");
      await repo.addCommand(session.id, "/status");

      const commands = await repo.getCommandHistory(session.id);
      expect(commands.length).toBe(2);
      expect(commands).toContain("/help");
      expect(commands).toContain("/status");
    });

    it("should respect limit on command history", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Command Limit Test",
      });

      for (let i = 0; i < 20; i++) {
        await repo.addCommand(session.id, `/cmd${i}`);
      }

      const limited = await repo.getCommandHistory(session.id, 5);
      expect(limited.length).toBe(5);
    });
  });

  describe("delete", () => {
    it("should delete session", async () => {
      const session = await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Delete Test",
      });

      await repo.delete(session.id);

      const found = await repo.findById(session.id);
      expect(found).toBeNull();
    });
  });

  describe("count", () => {
    it("should count sessions", async () => {
      const initialCount = await repo.count();

      await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Count Test 1",
      });
      await repo.create({
        id: testId("ses"),
        projectPath: "/test/path",
        name: "Count Test 2",
      });

      const newCount = await repo.count();
      expect(newCount).toBe(initialCount + 2);
    });
  });
});
