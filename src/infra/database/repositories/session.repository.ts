/**
 * Session Repository
 *
 * Repository implementation for Session entities.
 * Handles session persistence with separate conversation and command history tables.
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn, type QueryOptions } from "../repository.js";
import type {
  Session,
  CreateSession,
  UpdateSession,
  SessionStatus,
} from "../../../core/entities/session.js";
import type { ConversationMessage } from "../../../core/types/common.js";

/**
 * Database row type for sessions table
 */
interface SessionRow {
  id: string;
  name: string;
  project_path: string;
  feature_id: string | null;
  status: SessionStatus;
  agent_count: number;
  total_cost: number;
  total_tokens_input: number;
  total_tokens_output: number;
  config: string | null;
  error_message: string | null;
  error_stack: string | null;
  started_at: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for conversation_history table
 */
interface ConversationRow {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

/**
 * Database row type for command_history table
 */
interface CommandRow {
  id: number;
  session_id: string;
  command: string;
  executed_at: string;
}

/**
 * Session Repository
 *
 * Manages session persistence including separate handling of
 * conversation history and command history in linked tables.
 *
 * @example
 * ```typescript
 * const sessionRepo = new SessionRepository(db);
 *
 * // Find active sessions
 * const active = await sessionRepo.findActive();
 *
 * // Get session with conversation history
 * const session = await sessionRepo.findById(id);
 * const messages = await sessionRepo.getConversationHistory(id, 50);
 * ```
 */
export class SessionRepository extends BaseRepository<Session, CreateSession, UpdateSession> {
  constructor(db: DatabaseService) {
    super(db, "sessions", "id");
  }

  /**
   * Convert database row to Session entity
   */
  protected rowToEntity(row: Record<string, unknown>): Session {
    const r = row as SessionRow;
    return {
      id: r.id,
      name: r.name,
      projectPath: r.project_path,
      featureId: r.feature_id ?? undefined,
      status: r.status,
      agentCount: r.agent_count,
      totalCost: r.total_cost,
      totalTokens: {
        input: r.total_tokens_input,
        output: r.total_tokens_output,
      },
      config: JsonColumn.parse(r.config, {}),
      errorMessage: r.error_message ?? undefined,
      errorStack: r.error_stack ?? undefined,
      conversationHistory: [], // Loaded separately
      commandHistory: [], // Loaded separately
      createdAt: DateColumn.fromStorageRequired(r.created_at),
      updatedAt: DateColumn.fromStorageRequired(r.updated_at),
      lastActiveAt: DateColumn.fromStorageRequired(r.last_active_at),
    };
  }

  /**
   * Convert Session entity to database row
   */
  protected entityToRow(
    entity: CreateSession | UpdateSession
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if ("id" in entity && entity.id !== undefined) {
      row.id = entity.id;
    }
    if ("name" in entity && entity.name !== undefined) {
      row.name = entity.name;
    }
    if ("projectPath" in entity && entity.projectPath !== undefined) {
      row.project_path = entity.projectPath;
    }
    if ("featureId" in entity) {
      row.feature_id = entity.featureId ?? null;
    }
    if ("status" in entity && entity.status !== undefined) {
      row.status = entity.status;
    }
    if ("agentCount" in entity && entity.agentCount !== undefined) {
      row.agent_count = entity.agentCount;
    }
    if ("totalCost" in entity && entity.totalCost !== undefined) {
      row.total_cost = entity.totalCost;
    }
    if ("totalTokens" in entity && entity.totalTokens !== undefined) {
      row.total_tokens_input = entity.totalTokens.input;
      row.total_tokens_output = entity.totalTokens.output;
    }
    if ("config" in entity && entity.config !== undefined) {
      row.config = JsonColumn.stringify(entity.config);
    }
    if ("errorMessage" in entity) {
      row.error_message = entity.errorMessage ?? null;
    }
    if ("errorStack" in entity) {
      row.error_stack = entity.errorStack ?? null;
    }
    if ("createdAt" in entity && entity.createdAt !== undefined) {
      row.created_at = DateColumn.toStorage(entity.createdAt);
      row.started_at = row.created_at; // started_at = createdAt
    }
    if ("updatedAt" in entity && entity.updatedAt !== undefined) {
      row.updated_at = DateColumn.toStorage(entity.updatedAt);
    }
    if ("lastActiveAt" in entity && entity.lastActiveAt !== undefined) {
      row.last_active_at = DateColumn.toStorage(entity.lastActiveAt);
    }

    return row;
  }

  /**
   * Override create to set timestamps if not provided
   */
  async create(data: CreateSession): Promise<Session> {
    const now = new Date();
    const withDefaults: CreateSession = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      lastActiveAt: data.lastActiveAt ?? now,
    };

    const session = await super.create(withDefaults);

    // Insert conversation history if provided
    if (data.conversationHistory && data.conversationHistory.length > 0) {
      for (const msg of data.conversationHistory) {
        await this.addMessage(session.id, msg);
      }
      session.conversationHistory = data.conversationHistory;
    }

    // Insert command history if provided
    if (data.commandHistory && data.commandHistory.length > 0) {
      for (const cmd of data.commandHistory) {
        await this.addCommand(session.id, cmd);
      }
      session.commandHistory = data.commandHistory;
    }

    return session;
  }

  /**
   * Override update to handle timestamps
   */
  async update(id: string, data: UpdateSession): Promise<Session> {
    const now = new Date();
    const withTimestamp: UpdateSession = {
      ...data,
      updatedAt: now,
    };

    return super.update(id, withTimestamp);
  }

  /**
   * Find by ID and load conversation/command history
   */
  async findByIdWithHistory(id: string): Promise<Session | null> {
    const session = await this.findById(id);
    if (!session) return null;

    // Load conversation history
    session.conversationHistory = await this.getConversationHistory(id);

    // Load command history
    session.commandHistory = await this.getCommandHistory(id);

    return session;
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find all active sessions
   */
  async findActive(): Promise<Session[]> {
    const rows = this.query<SessionRow>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY last_active_at DESC`,
      ["active"]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find sessions by project path
   */
  async findByProjectPath(path: string): Promise<Session[]> {
    const rows = this.query<SessionRow>(
      `SELECT * FROM ${this.tableName} WHERE project_path = ? ORDER BY last_active_at DESC`,
      [path]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find sessions by status
   */
  async findByStatus(status: SessionStatus): Promise<Session[]> {
    const rows = this.query<SessionRow>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY last_active_at DESC`,
      [status]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find sessions by feature ID
   */
  async findByFeatureId(featureId: string): Promise<Session[]> {
    const rows = this.query<SessionRow>(
      `SELECT * FROM ${this.tableName} WHERE feature_id = ? ORDER BY created_at DESC`,
      [featureId]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET last_active_at = ?, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), DateColumn.toStorage(now), id]
    );
  }

  /**
   * Update session status
   */
  async updateStatus(id: string, status: SessionStatus): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET status = ?, updated_at = ? WHERE id = ?`,
      [status, DateColumn.toStorage(now), id]
    );
  }

  /**
   * Increment agent count
   */
  async incrementAgentCount(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET agent_count = agent_count + 1, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Decrement agent count
   */
  async decrementAgentCount(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET agent_count = MAX(0, agent_count - 1), updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Update cost and token usage
   */
  async addCost(
    id: string,
    cost: number,
    tokens: { input: number; output: number }
  ): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName}
       SET total_cost = total_cost + ?,
           total_tokens_input = total_tokens_input + ?,
           total_tokens_output = total_tokens_output + ?,
           updated_at = ?
       WHERE id = ?`,
      [cost, tokens.input, tokens.output, DateColumn.toStorage(now), id]
    );
  }

  // ==========================================================================
  // Conversation History Methods
  // ==========================================================================

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(
    sessionId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    let sql = `SELECT * FROM conversation_history WHERE session_id = ? ORDER BY timestamp ASC`;
    const params: (string | number)[] = [sessionId];

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const rows = this.query<ConversationRow>(sql, params);
    return rows.map((row) => ({
      role: row.role,
      content: row.content,
      timestamp: DateColumn.fromStorageRequired(row.timestamp),
    }));
  }

  /**
   * Get recent conversation history (last N messages)
   */
  async getRecentConversationHistory(
    sessionId: string,
    limit: number
  ): Promise<ConversationMessage[]> {
    // Get most recent messages by using ORDER BY DESC, then reverse
    const rows = this.query<ConversationRow>(
      `SELECT * FROM conversation_history
       WHERE session_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [sessionId, limit]
    );

    return rows
      .reverse()
      .map((row) => ({
        role: row.role,
        content: row.content,
        timestamp: DateColumn.fromStorageRequired(row.timestamp),
      }));
  }

  /**
   * Add a message to conversation history
   */
  async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    this.db.run(
      `INSERT INTO conversation_history (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)`,
      [
        sessionId,
        message.role,
        message.content,
        DateColumn.toStorage(message.timestamp),
      ]
    );

    // Update last active timestamp
    await this.updateLastActive(sessionId);
  }

  /**
   * Clear conversation history for a session
   */
  async clearConversationHistory(sessionId: string): Promise<void> {
    this.db.run(`DELETE FROM conversation_history WHERE session_id = ?`, [
      sessionId,
    ]);
  }

  // ==========================================================================
  // Command History Methods
  // ==========================================================================

  /**
   * Get command history for a session
   */
  async getCommandHistory(sessionId: string, limit?: number): Promise<string[]> {
    let sql = `SELECT * FROM command_history WHERE session_id = ? ORDER BY executed_at ASC`;
    const params: (string | number)[] = [sessionId];

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const rows = this.query<CommandRow>(sql, params);
    return rows.map((row) => row.command);
  }

  /**
   * Get recent command history (last N commands)
   */
  async getRecentCommands(sessionId: string, limit: number): Promise<string[]> {
    const rows = this.query<CommandRow>(
      `SELECT * FROM command_history
       WHERE session_id = ?
       ORDER BY executed_at DESC
       LIMIT ?`,
      [sessionId, limit]
    );

    return rows.reverse().map((row) => row.command);
  }

  /**
   * Add a command to history
   */
  async addCommand(sessionId: string, command: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `INSERT INTO command_history (session_id, command, executed_at) VALUES (?, ?, ?)`,
      [sessionId, command, DateColumn.toStorage(now)]
    );

    // Update last active timestamp
    await this.updateLastActive(sessionId);
  }

  /**
   * Clear command history for a session
   */
  async clearCommandHistory(sessionId: string): Promise<void> {
    this.db.run(`DELETE FROM command_history WHERE session_id = ?`, [sessionId]);
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Count active sessions
   */
  async countActive(): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = ?`,
      ["active"]
    );
    return result?.count ?? 0;
  }

  /**
   * Count sessions by status
   */
  async countByStatus(): Promise<Record<SessionStatus, number>> {
    const rows = this.query<{ status: SessionStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    );

    const result: Record<SessionStatus, number> = {
      active: 0,
      paused: 0,
      completed: 0,
      archived: 0,
      crashed: 0,
    };

    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }

  /**
   * Get total cost across all sessions
   */
  async getTotalCost(): Promise<number> {
    const result = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(total_cost), 0) as total FROM ${this.tableName}`
    );
    return result?.total ?? 0;
  }

  /**
   * Get total cost for a specific project
   */
  async getProjectCost(projectPath: string): Promise<number> {
    const result = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(total_cost), 0) as total FROM ${this.tableName} WHERE project_path = ?`,
      [projectPath]
    );
    return result?.total ?? 0;
  }

  /**
   * Get sessions with conversation count
   */
  async findWithMessageCount(options: QueryOptions = {}): Promise<
    Array<Session & { messageCount: number }>
  > {
    const { limit, offset, orderBy = "last_active_at", orderDirection = "DESC" } = options;

    let sql = `
      SELECT s.*, COALESCE(c.message_count, 0) as message_count
      FROM ${this.tableName} s
      LEFT JOIN (
        SELECT session_id, COUNT(*) as message_count
        FROM conversation_history
        GROUP BY session_id
      ) c ON s.id = c.session_id
      ORDER BY ${orderBy} ${orderDirection}
    `;

    const params: (string | number)[] = [];

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);

      if (offset !== undefined) {
        sql += " OFFSET ?";
        params.push(offset);
      }
    }

    const rows = this.query<SessionRow & { message_count: number }>(sql, params);
    return rows.map((row) => ({
      ...this.rowToEntity(row as Record<string, unknown>),
      messageCount: row.message_count,
    }));
  }
}

/**
 * Create a SessionRepository instance
 */
export function createSessionRepository(db: DatabaseService): SessionRepository {
  return new SessionRepository(db);
}
