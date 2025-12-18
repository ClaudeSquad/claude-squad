/**
 * Agent Entity Tests
 *
 * Tests for Agent entity schema validation, factory functions, and utilities.
 */

import { describe, test, expect } from "bun:test";
import {
  AgentSchema,
  AgentRoleSchema,
  AgentStatusSchema,
  AgentConfigSchema,
  validateAgent,
  safeValidateAgent,
  createAgent,
  updateAgent,
  AGENT_ROLE_DESCRIPTIONS,
  AGENT_STATUS_DESCRIPTIONS,
  type AgentRole,
  type AgentStatus,
} from "../../../src/core/entities/agent";
import { generateAgentId, generateSessionId, generateSkillId } from "../../../src/core/types/id";

describe("AgentRoleSchema", () => {
  test("accepts valid roles", () => {
    const validRoles: AgentRole[] = [
      "engineering",
      "architecture-design",
      "quality-assurance",
      "security",
      "infrastructure-devops",
      "data-ai-ml",
      "design-ux",
      "documentation-knowledge",
      "strategic-planning",
    ];

    for (const role of validRoles) {
      expect(AgentRoleSchema.parse(role)).toBe(role);
    }
  });

  test("rejects invalid roles", () => {
    expect(() => AgentRoleSchema.parse("invalid-role")).toThrow();
    expect(() => AgentRoleSchema.parse("")).toThrow();
    expect(() => AgentRoleSchema.parse(123)).toThrow();
  });

  test("all roles have descriptions", () => {
    const roles = AgentRoleSchema.options;
    for (const role of roles) {
      expect(AGENT_ROLE_DESCRIPTIONS[role]).toBeDefined();
      expect(typeof AGENT_ROLE_DESCRIPTIONS[role]).toBe("string");
    }
  });
});

describe("AgentStatusSchema", () => {
  test("accepts valid statuses", () => {
    const validStatuses: AgentStatus[] = [
      "idle",
      "working",
      "waiting",
      "paused",
      "error",
      "completed",
    ];

    for (const status of validStatuses) {
      expect(AgentStatusSchema.parse(status)).toBe(status);
    }
  });

  test("rejects invalid statuses", () => {
    expect(() => AgentStatusSchema.parse("invalid")).toThrow();
    expect(() => AgentStatusSchema.parse("")).toThrow();
  });

  test("all statuses have descriptions", () => {
    const statuses = AgentStatusSchema.options;
    for (const status of statuses) {
      expect(AGENT_STATUS_DESCRIPTIONS[status]).toBeDefined();
    }
  });
});

describe("AgentConfigSchema", () => {
  test("accepts valid config", () => {
    const config = {
      maxTurns: 100,
      timeout: 600000,
      verbose: true,
      env: { NODE_ENV: "test" },
      permissionMode: "strict" as const,
    };

    const result = AgentConfigSchema.parse(config);
    expect(result.maxTurns).toBe(100);
    expect(result.timeout).toBe(600000);
    expect(result.verbose).toBe(true);
    expect(result.env).toEqual({ NODE_ENV: "test" });
    expect(result.permissionMode).toBe("strict");
  });

  test("applies defaults", () => {
    const result = AgentConfigSchema.parse({});
    expect(result.maxTurns).toBe(50);
    expect(result.timeout).toBe(300000);
    expect(result.verbose).toBe(false);
    expect(result.permissionMode).toBe("default");
  });

  test("rejects invalid values", () => {
    expect(() => AgentConfigSchema.parse({ maxTurns: -1 })).toThrow();
    expect(() => AgentConfigSchema.parse({ timeout: 0 })).toThrow();
    expect(() => AgentConfigSchema.parse({ permissionMode: "invalid" })).toThrow();
  });
});

describe("AgentSchema", () => {
  const validAgent = {
    id: generateAgentId(),
    sessionId: generateSessionId(),
    name: "Test Agent",
    role: "engineering" as AgentRole,
    systemPrompt: "You are a helpful assistant.",
    status: "idle" as AgentStatus,
    skills: [],
    tools: ["Read", "Write", "Bash"],
    model: "sonnet" as const,
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  test("validates complete agent", () => {
    const result = AgentSchema.parse(validAgent);
    expect(result.id).toBe(validAgent.id);
    expect(result.name).toBe("Test Agent");
    expect(result.role).toBe("engineering");
  });

  test("validates agent with skills", () => {
    const agentWithSkills = {
      ...validAgent,
      skills: [generateSkillId(), generateSkillId()],
    };

    const result = AgentSchema.parse(agentWithSkills);
    expect(result.skills.length).toBe(2);
  });

  test("validates optional worktreePath", () => {
    const agentWithWorktree = {
      ...validAgent,
      worktreePath: "/tmp/worktree/agent-123",
    };

    const result = AgentSchema.parse(agentWithWorktree);
    expect(result.worktreePath).toBe("/tmp/worktree/agent-123");
  });

  test("validates optional pid", () => {
    const agentWithPid = {
      ...validAgent,
      pid: 12345,
    };

    const result = AgentSchema.parse(agentWithPid);
    expect(result.pid).toBe(12345);
  });

  test("rejects invalid agent ID format", () => {
    const invalidAgent = { ...validAgent, id: "invalid-id" };
    expect(() => AgentSchema.parse(invalidAgent)).toThrow();
  });

  test("rejects invalid session ID format", () => {
    const invalidAgent = { ...validAgent, sessionId: "invalid-id" };
    expect(() => AgentSchema.parse(invalidAgent)).toThrow();
  });

  test("rejects empty name", () => {
    const invalidAgent = { ...validAgent, name: "" };
    expect(() => AgentSchema.parse(invalidAgent)).toThrow();
  });

  test("rejects name too long", () => {
    const invalidAgent = { ...validAgent, name: "a".repeat(101) };
    expect(() => AgentSchema.parse(invalidAgent)).toThrow();
  });

  test("rejects invalid model", () => {
    const invalidAgent = { ...validAgent, model: "invalid-model" };
    expect(() => AgentSchema.parse(invalidAgent)).toThrow();
  });

  test("rejects invalid skill IDs", () => {
    const invalidAgent = { ...validAgent, skills: ["invalid-skill-id"] };
    expect(() => AgentSchema.parse(invalidAgent)).toThrow();
  });
});

describe("validateAgent", () => {
  test("returns validated agent for valid input", () => {
    const input = {
      id: generateAgentId(),
      sessionId: generateSessionId(),
      name: "Test Agent",
      role: "engineering",
      status: "idle",
      model: "sonnet",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = validateAgent(input);
    expect(result.name).toBe("Test Agent");
  });

  test("throws for invalid input", () => {
    expect(() => validateAgent({})).toThrow();
    expect(() => validateAgent({ name: "Test" })).toThrow();
  });
});

describe("safeValidateAgent", () => {
  test("returns success for valid input", () => {
    const input = {
      id: generateAgentId(),
      sessionId: generateSessionId(),
      name: "Test Agent",
      role: "engineering",
      status: "idle",
      model: "sonnet",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = safeValidateAgent(input);
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Test Agent");
  });

  test("returns error for invalid input", () => {
    const result = safeValidateAgent({});
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("createAgent", () => {
  test("creates agent with required fields", () => {
    const agent = createAgent({
      id: generateAgentId(),
      sessionId: generateSessionId(),
      name: "New Agent",
      role: "engineering",
      model: "sonnet",
    });

    expect(agent.name).toBe("New Agent");
    expect(agent.role).toBe("engineering");
    expect(agent.status).toBe("idle");
    expect(agent.skills).toEqual([]);
    expect(agent.tools).toEqual([]);
    expect(agent.systemPrompt).toBe("");
    expect(agent.createdAt).toBeInstanceOf(Date);
    expect(agent.updatedAt).toBeInstanceOf(Date);
  });

  test("creates agent with optional fields", () => {
    const skills = [generateSkillId()];
    const tools = ["Read", "Write"];

    const agent = createAgent({
      id: generateAgentId(),
      sessionId: generateSessionId(),
      name: "Custom Agent",
      role: "architecture-design",
      model: "opus",
      status: "working",
      skills,
      tools,
      systemPrompt: "Custom prompt",
      config: { maxTurns: 100, verbose: true, timeout: 600000, permissionMode: "strict" },
    });

    expect(agent.status).toBe("working");
    expect(agent.skills).toEqual(skills);
    expect(agent.tools).toEqual(tools);
    expect(agent.systemPrompt).toBe("Custom prompt");
    expect(agent.config.maxTurns).toBe(100);
    expect(agent.config.verbose).toBe(true);
    expect(agent.config.permissionMode).toBe("strict");
  });
});

describe("updateAgent", () => {
  test("updates agent fields", () => {
    const original = createAgent({
      id: generateAgentId(),
      sessionId: generateSessionId(),
      name: "Original Agent",
      role: "engineering",
      model: "sonnet",
    });

    const updated = updateAgent(original, {
      name: "Updated Agent",
      status: "working",
    });

    expect(updated.name).toBe("Updated Agent");
    expect(updated.status).toBe("working");
    expect(updated.id).toBe(original.id);
    expect(updated.sessionId).toBe(original.sessionId);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  test("preserves unchanged fields", () => {
    const original = createAgent({
      id: generateAgentId(),
      sessionId: generateSessionId(),
      name: "Test Agent",
      role: "engineering",
      model: "sonnet",
      systemPrompt: "Original prompt",
    });

    const updated = updateAgent(original, { status: "paused" });

    expect(updated.name).toBe("Test Agent");
    expect(updated.systemPrompt).toBe("Original prompt");
    expect(updated.status).toBe("paused");
  });
});
