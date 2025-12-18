/**
 * Handoff Repository
 *
 * Repository implementation for Handoff entities.
 * Handles handoff persistence with JSON content serialization.
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn, type QueryOptions } from "../repository.js";
import type {
  Handoff,
  CreateHandoff,
  UpdateHandoff,
  HandoffType,
  HandoffContent,
} from "../../../core/entities/handoff.js";

/**
 * Database row type for handoffs table
 */
interface HandoffRow {
  id: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  feature_id: string;
  stage_id: string | null;
  type: HandoffType;
  content: string; // JSON serialized HandoffContent
  file_path: string | null;
  is_read: number; // SQLite boolean (0 or 1)
  read_at: string | null;
  created_at: string;
}

/**
 * Handoff Repository
 *
 * Manages handoff persistence including JSON content serialization.
 * Provides methods for querying handoffs by feature, agent, and read status.
 *
 * @example
 * ```typescript
 * const handoffRepo = new HandoffRepository(db);
 *
 * // Find all handoffs for a feature
 * const handoffs = await handoffRepo.findByFeatureId(featureId);
 *
 * // Get the handoff chain in chronological order
 * const chain = await handoffRepo.findChain(featureId);
 *
 * // Find unread handoffs for an agent
 * const unread = await handoffRepo.findUnread(agentId);
 * ```
 */
export class HandoffRepository extends BaseRepository<Handoff, CreateHandoff, UpdateHandoff> {
  constructor(db: DatabaseService) {
    super(db, "handoffs", "id");
  }

  /**
   * Convert database row to Handoff entity
   */
  protected rowToEntity(row: Record<string, unknown>): Handoff {
    const r = row as unknown as HandoffRow;
    return {
      id: r.id,
      fromAgent: r.from_agent_id ?? "",
      toAgent: r.to_agent_id ?? "",
      featureId: r.feature_id,
      stageId: r.stage_id ?? "",
      type: r.type,
      content: JsonColumn.parse<HandoffContent>(r.content, {}),
      filePath: r.file_path ?? undefined,
      isRead: r.is_read === 1,
      readAt: DateColumn.fromStorage(r.read_at ?? undefined),
      createdAt: DateColumn.fromStorageRequired(r.created_at),
    };
  }

  /**
   * Convert Handoff entity to database row
   */
  protected entityToRow(
    entity: CreateHandoff | UpdateHandoff
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if ("id" in entity && entity.id !== undefined) {
      row.id = entity.id;
    }
    if ("fromAgent" in entity && entity.fromAgent !== undefined) {
      row.from_agent_id = entity.fromAgent || null;
    }
    if ("toAgent" in entity && entity.toAgent !== undefined) {
      row.to_agent_id = entity.toAgent || null;
    }
    if ("featureId" in entity && entity.featureId !== undefined) {
      row.feature_id = entity.featureId;
    }
    if ("stageId" in entity && entity.stageId !== undefined) {
      row.stage_id = entity.stageId || null;
    }
    if ("type" in entity && entity.type !== undefined) {
      row.type = entity.type;
    }
    if ("content" in entity && entity.content !== undefined) {
      row.content = JsonColumn.stringify(entity.content);
    }
    if ("filePath" in entity) {
      row.file_path = entity.filePath ?? null;
    }
    if ("isRead" in entity && entity.isRead !== undefined) {
      row.is_read = entity.isRead ? 1 : 0;
    }
    if ("readAt" in entity) {
      row.read_at = entity.readAt ? DateColumn.toStorage(entity.readAt) : null;
    }
    if ("createdAt" in entity && entity.createdAt !== undefined) {
      row.created_at = DateColumn.toStorage(entity.createdAt);
    }

    return row;
  }

  /**
   * Override create to set timestamps if not provided
   */
  async create(data: CreateHandoff): Promise<Handoff> {
    const now = new Date();
    const withDefaults: CreateHandoff = {
      ...data,
      createdAt: data.createdAt ?? now,
      isRead: data.isRead ?? false,
    };

    return super.create(withDefaults);
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find all handoffs for a feature
   *
   * @param featureId - Feature ID to filter by
   * @returns Array of handoffs for the feature
   */
  async findByFeatureId(featureId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE feature_id = ? ORDER BY created_at ASC`,
      [featureId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find all handoffs from a specific agent
   *
   * @param agentId - Source agent ID
   * @returns Array of handoffs from the agent
   */
  async findByFromAgent(agentId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE from_agent_id = ? ORDER BY created_at DESC`,
      [agentId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find all handoffs to a specific agent
   *
   * @param agentId - Destination agent ID
   * @returns Array of handoffs to the agent
   */
  async findByToAgent(agentId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE to_agent_id = ? ORDER BY created_at DESC`,
      [agentId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find all handoffs for a feature in chronological order (the handoff chain)
   *
   * @param featureId - Feature ID
   * @returns Array of handoffs in chronological order
   */
  async findChain(featureId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE feature_id = ? ORDER BY created_at ASC`,
      [featureId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find all unread handoffs for a specific agent
   *
   * @param toAgentId - Destination agent ID
   * @returns Array of unread handoffs for the agent
   */
  async findUnread(toAgentId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE to_agent_id = ? AND is_read = 0 ORDER BY created_at ASC`,
      [toAgentId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Mark a handoff as read
   *
   * @param id - Handoff ID
   */
  async markAsRead(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET is_read = 1, read_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Find handoffs by stage ID
   *
   * @param stageId - Stage ID to filter by
   * @returns Array of handoffs for the stage
   */
  async findByStageId(stageId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE stage_id = ? ORDER BY created_at ASC`,
      [stageId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find handoffs by type
   *
   * @param type - Handoff type
   * @param options - Query options
   * @returns Array of handoffs of the specified type
   */
  async findByType(type: HandoffType, options: QueryOptions = {}): Promise<Handoff[]> {
    const { limit, offset, orderBy = "created_at", orderDirection = "DESC" } = options;

    let sql = `SELECT * FROM ${this.tableName} WHERE type = ? ORDER BY ${orderBy} ${orderDirection}`;
    const params: (string | number)[] = [type];

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);

      if (offset !== undefined) {
        sql += " OFFSET ?";
        params.push(offset);
      }
    }

    const rows = this.query<HandoffRow>(sql, params);
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find the most recent handoff for a feature
   *
   * @param featureId - Feature ID
   * @returns Most recent handoff or null
   */
  async findLatestForFeature(featureId: string): Promise<Handoff | null> {
    const row = this.queryOne<HandoffRow>(
      `SELECT * FROM ${this.tableName} WHERE feature_id = ? ORDER BY created_at DESC LIMIT 1`,
      [featureId]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find handoffs between two agents
   *
   * @param fromAgentId - Source agent ID
   * @param toAgentId - Destination agent ID
   * @returns Array of handoffs between the agents
   */
  async findBetweenAgents(fromAgentId: string, toAgentId: string): Promise<Handoff[]> {
    const rows = this.query<HandoffRow>(
      `SELECT * FROM ${this.tableName}
       WHERE from_agent_id = ? AND to_agent_id = ?
       ORDER BY created_at ASC`,
      [fromAgentId, toAgentId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Count handoffs by feature
   *
   * @param featureId - Feature ID
   * @returns Number of handoffs for the feature
   */
  async countByFeature(featureId: string): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE feature_id = ?`,
      [featureId]
    );
    return result?.count ?? 0;
  }

  /**
   * Count unread handoffs for an agent
   *
   * @param toAgentId - Destination agent ID
   * @returns Number of unread handoffs
   */
  async countUnread(toAgentId: string): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE to_agent_id = ? AND is_read = 0`,
      [toAgentId]
    );
    return result?.count ?? 0;
  }

  /**
   * Count handoffs by type
   *
   * @returns Record of handoff type to count
   */
  async countByType(): Promise<Record<HandoffType, number>> {
    const rows = this.query<{ type: HandoffType; count: number }>(
      `SELECT type, COUNT(*) as count FROM ${this.tableName} GROUP BY type`
    );

    const result: Record<HandoffType, number> = {
      architecture: 0,
      implementation: 0,
      review_feedback: 0,
      test_plan: 0,
      deployment: 0,
    };

    for (const row of rows) {
      result[row.type] = row.count;
    }

    return result;
  }

  /**
   * Get handoff statistics for a feature
   *
   * @param featureId - Feature ID
   * @returns Statistics object
   */
  async getFeatureStats(featureId: string): Promise<{
    total: number;
    read: number;
    unread: number;
    byType: Record<HandoffType, number>;
  }> {
    const totalResult = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE feature_id = ?`,
      [featureId]
    );

    const readResult = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE feature_id = ? AND is_read = 1`,
      [featureId]
    );

    const typeRows = this.query<{ type: HandoffType; count: number }>(
      `SELECT type, COUNT(*) as count FROM ${this.tableName} WHERE feature_id = ? GROUP BY type`,
      [featureId]
    );

    const byType: Record<HandoffType, number> = {
      architecture: 0,
      implementation: 0,
      review_feedback: 0,
      test_plan: 0,
      deployment: 0,
    };

    for (const row of typeRows) {
      byType[row.type] = row.count;
    }

    const total = totalResult?.count ?? 0;
    const read = readResult?.count ?? 0;

    return {
      total,
      read,
      unread: total - read,
      byType,
    };
  }

  /**
   * Delete all handoffs for a feature
   *
   * @param featureId - Feature ID
   * @returns Number of deleted handoffs
   */
  async deleteByFeature(featureId: string): Promise<number> {
    return this.db.run(
      `DELETE FROM ${this.tableName} WHERE feature_id = ?`,
      [featureId]
    );
  }

  /**
   * Mark all handoffs for an agent as read
   *
   * @param toAgentId - Destination agent ID
   * @returns Number of updated handoffs
   */
  async markAllAsRead(toAgentId: string): Promise<number> {
    const now = new Date();
    return this.db.run(
      `UPDATE ${this.tableName} SET is_read = 1, read_at = ? WHERE to_agent_id = ? AND is_read = 0`,
      [DateColumn.toStorage(now), toAgentId]
    );
  }
}

/**
 * Create a HandoffRepository instance
 */
export function createHandoffRepository(db: DatabaseService): HandoffRepository {
  return new HandoffRepository(db);
}
