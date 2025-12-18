/**
 * Agent Repository
 *
 * Repository implementation for Agent entities.
 * Manages both agent definitions and running agent instances.
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn } from "../repository.js";
import type {
  Agent,
  CreateAgent,
  UpdateAgent,
  AgentRole,
  AgentStatus,
  AgentConfig,
} from "../../../core/entities/agent.js";
import type { Model } from "../../../core/types/common.js";

/**
 * Database row type for agents table
 */
interface AgentRow {
  id: string;
  session_id: string;
  name: string;
  type: "builtin" | "custom";
  role: AgentRole;
  description: string;
  system_prompt: string;
  expertise: string; // JSON array
  tools: string; // JSON array
  skills: string; // JSON array of skill IDs
  model: Model;
  config: string; // JSON
  enabled: number;
  status: AgentStatus;
  worktree_path: string | null;
  pid: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Agent Repository
 *
 * Manages agent persistence including both agent definitions
 * (templates) and running agent instances (with session, status, etc).
 *
 * @example
 * ```typescript
 * const agentRepo = new AgentRepository(db);
 *
 * // Find agents by session
 * const sessionAgents = await agentRepo.findBySession(sessionId);
 *
 * // Find agents by role
 * const architects = await agentRepo.findByRole('architecture-design');
 * ```
 */
export class AgentRepository extends BaseRepository<Agent, CreateAgent, UpdateAgent> {
  constructor(db: DatabaseService) {
    super(db, "agents", "id");
  }

  /**
   * Convert database row to Agent entity
   */
  protected rowToEntity(row: Record<string, unknown>): Agent {
    const r = row as unknown as AgentRow;
    return {
      id: r.id,
      sessionId: r.session_id,
      name: r.name,
      role: r.role,
      systemPrompt: r.system_prompt,
      status: r.status,
      worktreePath: r.worktree_path ?? undefined,
      pid: r.pid ?? undefined,
      skills: JsonColumn.parse(r.skills, []),
      tools: JsonColumn.parse(r.tools, []),
      model: r.model,
      config: JsonColumn.parse(r.config, {}) as AgentConfig,
      createdAt: DateColumn.fromStorageRequired(r.created_at),
      updatedAt: DateColumn.fromStorageRequired(r.updated_at),
    };
  }

  /**
   * Convert Agent entity to database row
   */
  protected entityToRow(
    entity: CreateAgent | UpdateAgent
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if ("id" in entity && entity.id !== undefined) {
      row.id = entity.id;
    }
    if ("sessionId" in entity && entity.sessionId !== undefined) {
      row.session_id = entity.sessionId;
    }
    if ("name" in entity && entity.name !== undefined) {
      row.name = entity.name;
    }
    if ("role" in entity && entity.role !== undefined) {
      row.role = entity.role;
    }
    if ("systemPrompt" in entity && entity.systemPrompt !== undefined) {
      row.system_prompt = entity.systemPrompt;
    }
    if ("status" in entity && entity.status !== undefined) {
      row.status = entity.status;
    }
    if ("worktreePath" in entity) {
      row.worktree_path = entity.worktreePath ?? null;
    }
    if ("pid" in entity) {
      row.pid = entity.pid ?? null;
    }
    if ("skills" in entity && entity.skills !== undefined) {
      row.skills = JsonColumn.stringify(entity.skills);
    }
    if ("tools" in entity && entity.tools !== undefined) {
      row.tools = JsonColumn.stringify(entity.tools);
    }
    if ("model" in entity && entity.model !== undefined) {
      row.model = entity.model;
    }
    if ("config" in entity && entity.config !== undefined) {
      row.config = JsonColumn.stringify(entity.config);
    }
    if ("createdAt" in entity && entity.createdAt !== undefined) {
      row.created_at = DateColumn.toStorage(entity.createdAt);
    }
    if ("updatedAt" in entity && entity.updatedAt !== undefined) {
      row.updated_at = DateColumn.toStorage(entity.updatedAt);
    }

    // Set default values for template fields not in entity
    if ("id" in entity && !("description" in row)) {
      row.description = "";
      row.type = "custom";
      row.expertise = JsonColumn.stringify([]);
      row.enabled = 1;
    }

    return row;
  }

  /**
   * Override create to set timestamps if not provided
   */
  async create(data: CreateAgent): Promise<Agent> {
    const now = new Date();
    const withDefaults: CreateAgent = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };
    return super.create(withDefaults);
  }

  /**
   * Override update to handle timestamps
   */
  async update(id: string, data: UpdateAgent): Promise<Agent> {
    const now = new Date();
    const withTimestamp: UpdateAgent = {
      ...data,
      updatedAt: now,
    };
    return super.update(id, withTimestamp);
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find agents by session ID
   */
  async findBySession(sessionId: string): Promise<Agent[]> {
    const rows = this.query<AgentRow>(
      `SELECT * FROM ${this.tableName} WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find agents by role
   */
  async findByRole(role: AgentRole): Promise<Agent[]> {
    const rows = this.query<AgentRow>(
      `SELECT * FROM ${this.tableName} WHERE role = ? ORDER BY created_at DESC`,
      [role]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find agents by status
   */
  async findByStatus(status: AgentStatus): Promise<Agent[]> {
    const rows = this.query<AgentRow>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY updated_at DESC`,
      [status]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find active agents (working or waiting)
   */
  async findActive(): Promise<Agent[]> {
    const rows = this.query<AgentRow>(
      `SELECT * FROM ${this.tableName}
       WHERE status IN ('working', 'waiting')
       ORDER BY updated_at DESC`
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find agents by model
   */
  async findByModel(model: Model): Promise<Agent[]> {
    const rows = this.query<AgentRow>(
      `SELECT * FROM ${this.tableName} WHERE model = ? ORDER BY created_at DESC`,
      [model]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find agents by skill
   */
  async findBySkill(skillId: string): Promise<Agent[]> {
    const rows = this.query<AgentRow>(
      `SELECT * FROM ${this.tableName}
       WHERE skills LIKE ?
       ORDER BY created_at DESC`,
      [`%"${skillId}"%`]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find agent by PID
   */
  async findByPid(pid: number): Promise<Agent | null> {
    const row = this.queryOne<AgentRow>(
      `SELECT * FROM ${this.tableName} WHERE pid = ?`,
      [pid]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find agent by worktree path
   */
  async findByWorktreePath(worktreePath: string): Promise<Agent | null> {
    const row = this.queryOne<AgentRow>(
      `SELECT * FROM ${this.tableName} WHERE worktree_path = ?`,
      [worktreePath]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  // ==========================================================================
  // Status Management Methods
  // ==========================================================================

  /**
   * Update agent status
   */
  async updateStatus(id: string, status: AgentStatus): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET status = ?, updated_at = ? WHERE id = ?`,
      [status, DateColumn.toStorage(now), id]
    );
  }

  /**
   * Mark agent as working
   */
  async markWorking(id: string, pid?: number): Promise<void> {
    const now = new Date();
    if (pid !== undefined) {
      this.db.run(
        `UPDATE ${this.tableName} SET status = 'working', pid = ?, updated_at = ? WHERE id = ?`,
        [pid, DateColumn.toStorage(now), id]
      );
    } else {
      await this.updateStatus(id, "working");
    }
  }

  /**
   * Mark agent as completed and clear PID
   */
  async markCompleted(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET status = 'completed', pid = NULL, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Mark agent as error and clear PID
   */
  async markError(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET status = 'error', pid = NULL, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Mark agent as waiting for user input
   */
  async markWaiting(id: string): Promise<void> {
    await this.updateStatus(id, "waiting");
  }

  /**
   * Mark agent as paused
   */
  async markPaused(id: string): Promise<void> {
    await this.updateStatus(id, "paused");
  }

  // ==========================================================================
  // Process Management Methods
  // ==========================================================================

  /**
   * Set agent PID (when spawning process)
   */
  async setPid(id: string, pid: number): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET pid = ?, updated_at = ? WHERE id = ?`,
      [pid, DateColumn.toStorage(now), id]
    );
  }

  /**
   * Clear agent PID (when process terminates)
   */
  async clearPid(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET pid = NULL, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Set agent worktree path
   */
  async setWorktreePath(id: string, worktreePath: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET worktree_path = ?, updated_at = ? WHERE id = ?`,
      [worktreePath, DateColumn.toStorage(now), id]
    );
  }

  /**
   * Clear agent worktree path
   */
  async clearWorktreePath(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET worktree_path = NULL, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  // ==========================================================================
  // Skill Management Methods
  // ==========================================================================

  /**
   * Add a skill to an agent
   */
  async addSkill(id: string, skillId: string): Promise<Agent> {
    const agent = await this.findById(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }

    if (!agent.skills.includes(skillId)) {
      const skills = [...agent.skills, skillId];
      return this.update(id, { skills });
    }
    return agent;
  }

  /**
   * Remove a skill from an agent
   */
  async removeSkill(id: string, skillId: string): Promise<Agent> {
    const agent = await this.findById(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }

    const skills = agent.skills.filter((s) => s !== skillId);
    return this.update(id, { skills });
  }

  /**
   * Set all skills for an agent
   */
  async setSkills(id: string, skills: string[]): Promise<Agent> {
    return this.update(id, { skills });
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Count agents by status
   */
  async countByStatus(): Promise<Record<AgentStatus, number>> {
    const rows = this.query<{ status: AgentStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    );

    const result: Record<AgentStatus, number> = {
      idle: 0,
      working: 0,
      waiting: 0,
      paused: 0,
      error: 0,
      completed: 0,
    };

    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }

  /**
   * Count agents by role
   */
  async countByRole(): Promise<Record<AgentRole, number>> {
    const rows = this.query<{ role: AgentRole; count: number }>(
      `SELECT role, COUNT(*) as count FROM ${this.tableName} GROUP BY role`
    );

    const result: Partial<Record<AgentRole, number>> = {};
    for (const row of rows) {
      result[row.role] = row.count;
    }

    return result as Record<AgentRole, number>;
  }

  /**
   * Count agents per session
   */
  async countBySession(sessionId: string): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE session_id = ?`,
      [sessionId]
    );
    return result?.count ?? 0;
  }

  /**
   * Count active agents in a session
   */
  async countActiveBySession(sessionId: string): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}
       WHERE session_id = ? AND status IN ('working', 'waiting')`,
      [sessionId]
    );
    return result?.count ?? 0;
  }
}

/**
 * Create an AgentRepository instance
 */
export function createAgentRepository(db: DatabaseService): AgentRepository {
  return new AgentRepository(db);
}
