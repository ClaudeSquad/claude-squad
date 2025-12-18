/**
 * Integration Repository
 *
 * Repository implementation for Integration entities.
 * Manages external service connections (GitHub, Linear, Slack, etc.).
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn, type QueryOptions } from "../repository.js";
import type {
  Integration,
  CreateIntegration,
  UpdateIntegration,
  IntegrationType,
  IntegrationStatus,
} from "../../../core/entities/integration.js";

/**
 * Database row type for integrations table
 */
interface IntegrationRow {
  id: string;
  project_path: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  enabled: number;
  config: string | null; // JSON
  configured_at: string;
  last_tested_at: string | null;
  last_error: string | null;
  metadata: string | null; // JSON
  created_at: string;
  updated_at: string;
}

/**
 * Integration Repository
 *
 * Manages integration persistence including health status tracking,
 * configuration storage, and project associations.
 *
 * @example
 * ```typescript
 * const integrationRepo = new IntegrationRepository(db);
 *
 * // Find integrations by type
 * const github = await integrationRepo.findByType('github');
 *
 * // Find healthy integrations
 * const healthy = await integrationRepo.findHealthy();
 * ```
 */
export class IntegrationRepository extends BaseRepository<
  Integration,
  CreateIntegration,
  UpdateIntegration
> {
  constructor(db: DatabaseService) {
    super(db, "integrations", "id");
  }

  /**
   * Convert database row to Integration entity
   */
  protected rowToEntity(row: Record<string, unknown>): Integration {
    const r = row as IntegrationRow;
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      enabled: r.enabled === 1,
      config: r.config ? JsonColumn.parse(r.config, {}) : {},
      configuredAt: DateColumn.fromStorageRequired(r.configured_at),
      lastTestedAt: r.last_tested_at
        ? DateColumn.fromStorage(r.last_tested_at)
        : undefined,
      status: r.status,
      lastError: r.last_error ?? undefined,
      metadata: r.metadata ? JsonColumn.parse(r.metadata, {}) : undefined,
    };
  }

  /**
   * Convert Integration entity to database row
   */
  protected entityToRow(
    entity: CreateIntegration | UpdateIntegration
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if ("id" in entity && entity.id !== undefined) {
      row.id = entity.id;
    }
    if ("name" in entity && entity.name !== undefined) {
      row.name = entity.name;
    }
    if ("type" in entity && entity.type !== undefined) {
      row.type = entity.type;
    }
    if ("enabled" in entity && entity.enabled !== undefined) {
      row.enabled = entity.enabled ? 1 : 0;
    }
    if ("config" in entity && entity.config !== undefined) {
      row.config = JsonColumn.stringify(entity.config);
    }
    if ("configuredAt" in entity && entity.configuredAt !== undefined) {
      row.configured_at = DateColumn.toStorage(entity.configuredAt);
    }
    if ("lastTestedAt" in entity) {
      row.last_tested_at = entity.lastTestedAt
        ? DateColumn.toStorage(entity.lastTestedAt)
        : null;
    }
    if ("status" in entity && entity.status !== undefined) {
      row.status = entity.status;
    }
    if ("lastError" in entity) {
      row.last_error = entity.lastError ?? null;
    }
    if ("metadata" in entity) {
      row.metadata = entity.metadata
        ? JsonColumn.stringify(entity.metadata)
        : null;
    }

    return row;
  }

  /**
   * Override create to set timestamps if not provided
   */
  async create(data: CreateIntegration): Promise<Integration> {
    const now = new Date();
    const withDefaults: CreateIntegration = {
      ...data,
      configuredAt: data.configuredAt ?? now,
    };

    // Set created_at and updated_at for the DB
    const row = this.entityToRow(withDefaults);
    row.created_at = DateColumn.toStorage(now);
    row.updated_at = DateColumn.toStorage(now);

    // Need to handle the project_path requirement
    // For now, set a default empty project path
    if (!row.project_path) {
      row.project_path = "";
    }

    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map(() => "?").join(", ");

    const sql = `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
    this.db.run(sql, values as (string | number | null)[]);

    const id = (row as Record<string, unknown>).id as string;
    const created = await this.findById(id);

    if (!created) {
      throw new Error(`Failed to create integration`);
    }

    return created;
  }

  /**
   * Override update to handle timestamps
   */
  async update(id: string, data: UpdateIntegration): Promise<Integration> {
    const now = new Date();
    const row = this.entityToRow(data);
    row.updated_at = DateColumn.toStorage(now);

    const columns = Object.keys(row);
    const values = Object.values(row);

    if (columns.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Integration not found: ${id}`);
      }
      return existing;
    }

    const setClause = columns.map((col) => `${col} = ?`).join(", ");
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;

    this.db.run(sql, [...(values as (string | number | null)[]), id]);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Integration not found after update: ${id}`);
    }

    return updated;
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find integration by name
   */
  async findByName(name: string): Promise<Integration | null> {
    const row = this.queryOne<IntegrationRow>(
      `SELECT * FROM ${this.tableName} WHERE name = ?`,
      [name]
    );
    return row ? this.rowToEntity(row as Record<string, unknown>) : null;
  }

  /**
   * Find integrations by type
   */
  async findByType(type: IntegrationType): Promise<Integration[]> {
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName} WHERE type = ? ORDER BY name ASC`,
      [type]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find integrations by status
   */
  async findByStatus(status: IntegrationStatus): Promise<Integration[]> {
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY name ASC`,
      [status]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find healthy integrations
   */
  async findHealthy(): Promise<Integration[]> {
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'healthy' AND enabled = 1
       ORDER BY name ASC`
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find unhealthy integrations
   */
  async findUnhealthy(): Promise<Integration[]> {
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'unhealthy'
       ORDER BY name ASC`
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find enabled integrations
   */
  async findEnabled(): Promise<Integration[]> {
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName} WHERE enabled = 1 ORDER BY name ASC`
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find integrations by project path
   */
  async findByProjectPath(projectPath: string): Promise<Integration[]> {
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName} WHERE project_path = ? ORDER BY name ASC`,
      [projectPath]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  /**
   * Find integrations needing test (untested or stale)
   */
  async findNeedingTest(staleDays: number = 1): Promise<Integration[]> {
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    const rows = this.query<IntegrationRow>(
      `SELECT * FROM ${this.tableName}
       WHERE status = 'untested'
          OR last_tested_at IS NULL
          OR last_tested_at < ?
       ORDER BY last_tested_at ASC`,
      [DateColumn.toStorage(staleDate)]
    );
    return rows.map((row) => this.rowToEntity(row as Record<string, unknown>));
  }

  // ==========================================================================
  // Status Management Methods
  // ==========================================================================

  /**
   * Update integration status
   */
  async updateStatus(id: string, status: IntegrationStatus): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET status = ?, updated_at = ? WHERE id = ?`,
      [status, DateColumn.toStorage(now), id]
    );
  }

  /**
   * Record health check result
   */
  async recordHealthCheck(
    id: string,
    healthy: boolean,
    error?: string
  ): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName}
       SET status = ?,
           last_tested_at = ?,
           last_error = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        healthy ? "healthy" : "unhealthy",
        DateColumn.toStorage(now),
        error ?? null,
        DateColumn.toStorage(now),
        id,
      ]
    );
  }

  /**
   * Enable an integration
   */
  async enable(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET enabled = 1, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Disable an integration
   */
  async disable(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET enabled = 0, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  // ==========================================================================
  // Configuration Management Methods
  // ==========================================================================

  /**
   * Update integration configuration
   */
  async updateConfig(
    id: string,
    config: Record<string, unknown>
  ): Promise<Integration> {
    return this.update(id, { config });
  }

  /**
   * Merge config (adds/updates keys without removing existing ones)
   */
  async mergeConfig(
    id: string,
    configUpdates: Record<string, unknown>
  ): Promise<Integration> {
    const integration = await this.findById(id);
    if (!integration) {
      throw new Error(`Integration not found: ${id}`);
    }

    const config = {
      ...integration.config,
      ...configUpdates,
    };

    return this.update(id, { config });
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Count integrations by type
   */
  async countByType(): Promise<Record<IntegrationType, number>> {
    const rows = this.query<{ type: IntegrationType; count: number }>(
      `SELECT type, COUNT(*) as count FROM ${this.tableName} GROUP BY type`
    );

    const result: Partial<Record<IntegrationType, number>> = {};
    for (const row of rows) {
      result[row.type] = row.count;
    }

    return result as Record<IntegrationType, number>;
  }

  /**
   * Count integrations by status
   */
  async countByStatus(): Promise<Record<IntegrationStatus, number>> {
    const rows = this.query<{ status: IntegrationStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    );

    const result: Record<IntegrationStatus, number> = {
      healthy: 0,
      unhealthy: 0,
      untested: 0,
    };

    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }

  /**
   * Count enabled integrations
   */
  async countEnabled(): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE enabled = 1`
    );
    return result?.count ?? 0;
  }

  /**
   * Get integration health summary
   */
  async getHealthSummary(): Promise<{
    total: number;
    healthy: number;
    unhealthy: number;
    untested: number;
    enabled: number;
  }> {
    const [byStatus, enabled, total] = await Promise.all([
      this.countByStatus(),
      this.countEnabled(),
      this.count(),
    ]);

    return {
      total,
      healthy: byStatus.healthy,
      unhealthy: byStatus.unhealthy,
      untested: byStatus.untested,
      enabled,
    };
  }
}

/**
 * Create an IntegrationRepository instance
 */
export function createIntegrationRepository(
  db: DatabaseService
): IntegrationRepository {
  return new IntegrationRepository(db);
}
