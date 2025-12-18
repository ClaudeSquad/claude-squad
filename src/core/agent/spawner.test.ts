/**
 * Tests for AgentSpawner
 *
 * @module core/agent/spawner.test
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { spawn } from "bun";
import { AgentSpawner, createAgentSpawner, spawnClaudeProcess } from "./spawner.js";
import type { SpawnOptions, AgentOutput } from "./types.js";
import type { Agent } from "../entities/agent.js";
import type { AgentId, SessionId } from "../types/id.js";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agt_test123456" as AgentId,
    sessionId: "ses_test123456" as SessionId,
    name: "test-agent",
    role: "engineering",
    systemPrompt: "",
    status: "idle",
    skills: [],
    tools: [],
    model: "sonnet",
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Agent;
}

function createTestSpawnOptions(overrides: Partial<SpawnOptions> = {}): SpawnOptions {
  return {
    agent: createTestAgent(),
    task: "Test task",
    cwd: process.cwd(),
    ...overrides,
  };
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("AgentSpawner", () => {
  let spawner: AgentSpawner;

  beforeEach(() => {
    spawner = new AgentSpawner();
  });

  describe("constructor", () => {
    it("should create with default options", () => {
      const s = new AgentSpawner();
      expect(s).toBeInstanceOf(AgentSpawner);
    });

    it("should create with custom replay buffer size", () => {
      const s = new AgentSpawner({ replayBufferSize: 50 });
      expect(s).toBeInstanceOf(AgentSpawner);
    });
  });

  describe("getProcess", () => {
    it("should return undefined for unknown process ID", () => {
      const result = spawner.getProcess("proc_nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getAllProcesses", () => {
    it("should return empty array when no processes", () => {
      const result = spawner.getAllProcesses();
      expect(result).toEqual([]);
    });
  });

  describe("getProcessesByAgent", () => {
    it("should return empty array when no processes for agent", () => {
      const result = spawner.getProcessesByAgent("agt_unknown123" as AgentId);
      expect(result).toEqual([]);
    });
  });

  describe("kill", () => {
    it("should return false for unknown process ID", () => {
      const result = spawner.kill("proc_nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("sendInput", () => {
    it("should return false for unknown process ID", () => {
      const result = spawner.sendInput("proc_nonexistent", "test input");
      expect(result).toBe(false);
    });
  });

  describe("waitForProcess", () => {
    it("should return null for unknown process ID", async () => {
      const result = await spawner.waitForProcess("proc_nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("removeProcess", () => {
    it("should return false for unknown process ID", () => {
      const result = spawner.removeProcess("proc_nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getSessionId", () => {
    it("should return undefined for unknown process ID", () => {
      const result = spawner.getSessionId("proc_nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getTotalCost", () => {
    it("should return 0 for unknown process ID", () => {
      const result = spawner.getTotalCost("proc_nonexistent");
      expect(result).toBe(0);
    });
  });

  describe("clearCompleted", () => {
    it("should return 0 when no processes", () => {
      const result = spawner.clearCompleted();
      expect(result).toBe(0);
    });
  });
});

describe("createAgentSpawner", () => {
  it("should create an AgentSpawner instance", () => {
    const spawner = createAgentSpawner();
    expect(spawner).toBeInstanceOf(AgentSpawner);
  });

  it("should pass options through", () => {
    const spawner = createAgentSpawner({ replayBufferSize: 200 });
    expect(spawner).toBeInstanceOf(AgentSpawner);
  });
});

// ============================================================================
// Integration Tests (require claude CLI)
// ============================================================================

describe("AgentSpawner integration", () => {
  let spawner: AgentSpawner;

  beforeEach(() => {
    spawner = new AgentSpawner();
  });

  afterEach(() => {
    // Clean up any running processes
    spawner.clearCompleted();
  });

  // Skip integration tests if claude CLI is not available
  const checkClaudeAvailable = async (): Promise<boolean> => {
    try {
      const proc = spawn(["which", "claude"], { stdout: "pipe" });
      await proc.exited;
      return proc.exitCode === 0;
    } catch {
      return false;
    }
  };

  it.skip("should spawn a claude process (requires claude CLI)", async () => {
    const isAvailable = await checkClaudeAvailable();
    if (!isAvailable) {
      console.log("Skipping: claude CLI not available");
      return;
    }

    const options = createTestSpawnOptions({
      task: "Say hello",
      maxTurns: 1,
    });

    const agentProcess = await spawner.spawn(options);

    expect(agentProcess.id).toMatch(/^proc_/);
    expect(agentProcess.agentId).toBe(options.agent.id);
    expect(agentProcess.pid).toBeGreaterThan(0);
    expect(agentProcess.state).toBe("working");
    expect(agentProcess.startedAt).toBeInstanceOf(Date);

    // Verify we can get the process
    const retrieved = spawner.getProcess(agentProcess.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(agentProcess.id);

    // Kill it
    const killed = spawner.kill(agentProcess.id);
    expect(killed).toBe(true);
  });
});

describe("spawnClaudeProcess", () => {
  it("should create a SpawnedProcess structure (mocked)", () => {
    // This is a basic structure test - actual spawning would require claude CLI
    const options = createTestSpawnOptions();

    // We can't actually spawn without claude CLI, but we can test the function signature
    expect(typeof spawnClaudeProcess).toBe("function");
  });
});
