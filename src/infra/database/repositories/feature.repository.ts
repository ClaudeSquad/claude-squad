/**
 * Feature Repository
 *
 * Repository implementation for Feature entities.
 * Tracks features through workflow stages with external references.
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn } from "../repository.js";
import type {
  Feature,
  CreateFeature,
  UpdateFeature,
  FeatureStatus,
} from "../../../core/entities/feature.js";

/**
 * Database row type for features table
 */
interface FeatureRow {
  id: string;
  name: string;
  description: string;
  workflow_id: string;
  session_id: string;
  current_stage: string;
  status: FeatureStatus;
  branch_name: string;
  requirements: string;
  acceptance_criteria: string;
  external_id: string | null;
  external_url: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  estimate: number | null;
  assignees: string;
  tags: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Feature Repository
 *
 * Manages feature persistence including workflow stage tracking
 * and external integration references.
 *
 * @example
 * ```typescript
 * const featureRepo = new FeatureRepository(db);
 *
 * // Find features by status
 * const inProgress = await featureRepo.findByStatus('in_progress');
 *
 * // Find features for a workflow
 * const features = await featureRepo.findByWorkflowId(workflowId);
 * ```
 */
export class FeatureRepository extends BaseRepository<Feature, CreateFeature, UpdateFeature> {
  constructor(db: DatabaseService) {
    super(db, "features", "id");
  }

  /**
   * Convert database row to Feature entity
   */
  protected rowToEntity(row: Record<string, unknown>): Feature {
    const r = row as unknown as FeatureRow;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      workflowId: r.workflow_id,
      sessionId: r.session_id,
      currentStage: r.current_stage,
      status: r.status,
      branchName: r.branch_name,
      requirements: JsonColumn.parse(r.requirements, []),
      acceptanceCriteria: JsonColumn.parse(r.acceptance_criteria, []),
      externalId: r.external_id ?? undefined,
      externalUrl: r.external_url ?? undefined,
      priority: r.priority,
      estimate: r.estimate ?? undefined,
      assignees: JsonColumn.parse(r.assignees, []),
      tags: JsonColumn.parse(r.tags, []),
      createdAt: DateColumn.fromStorageRequired(r.created_at),
      updatedAt: DateColumn.fromStorageRequired(r.updated_at),
    };
  }

  /**
   * Convert Feature entity to database row
   */
  protected entityToRow(
    entity: CreateFeature | UpdateFeature
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if ("id" in entity && entity.id !== undefined) {
      row.id = entity.id;
    }
    if ("name" in entity && entity.name !== undefined) {
      row.name = entity.name;
    }
    if ("description" in entity && entity.description !== undefined) {
      row.description = entity.description;
    }
    if ("workflowId" in entity && entity.workflowId !== undefined) {
      row.workflow_id = entity.workflowId;
    }
    if ("sessionId" in entity && entity.sessionId !== undefined) {
      row.session_id = entity.sessionId;
    }
    if ("currentStage" in entity && entity.currentStage !== undefined) {
      row.current_stage = entity.currentStage;
    }
    if ("status" in entity && entity.status !== undefined) {
      row.status = entity.status;
    }
    if ("branchName" in entity && entity.branchName !== undefined) {
      row.branch_name = entity.branchName;
    }
    if ("requirements" in entity && entity.requirements !== undefined) {
      row.requirements = JsonColumn.stringify(entity.requirements);
    }
    if ("acceptanceCriteria" in entity && entity.acceptanceCriteria !== undefined) {
      row.acceptance_criteria = JsonColumn.stringify(entity.acceptanceCriteria);
    }
    if ("externalId" in entity) {
      row.external_id = entity.externalId ?? null;
    }
    if ("externalUrl" in entity) {
      row.external_url = entity.externalUrl ?? null;
    }
    if ("priority" in entity && entity.priority !== undefined) {
      row.priority = entity.priority;
    }
    if ("estimate" in entity) {
      row.estimate = entity.estimate ?? null;
    }
    if ("assignees" in entity && entity.assignees !== undefined) {
      row.assignees = JsonColumn.stringify(entity.assignees);
    }
    if ("tags" in entity && entity.tags !== undefined) {
      row.tags = JsonColumn.stringify(entity.tags);
    }
    if ("createdAt" in entity && entity.createdAt !== undefined) {
      row.created_at = DateColumn.toStorage(entity.createdAt);
    }
    if ("updatedAt" in entity && entity.updatedAt !== undefined) {
      row.updated_at = DateColumn.toStorage(entity.updatedAt);
    }

    return row;
  }

  /**
   * Override create to set timestamps if not provided
   */
  async create(data: CreateFeature): Promise<Feature> {
    const now = new Date();
    const withDefaults: CreateFeature = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };
    return super.create(withDefaults);
  }

  /**
   * Override update to handle timestamps
   */
  async update(id: string, data: UpdateFeature): Promise<Feature> {
    const now = new Date();
    const withTimestamp: UpdateFeature = {
      ...data,
      updatedAt: now,
    };

    // If status is being set to completed, set completed_at
    if (data.status === "completed") {
      this.db.run(
        `UPDATE features SET completed_at = ? WHERE id = ? AND completed_at IS NULL`,
        [DateColumn.toStorage(now), id]
      );
    }

    return super.update(id, withTimestamp);
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find features by status
   */
  async findByStatus(status: FeatureStatus): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY updated_at DESC`,
      [status]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find features by workflow ID
   */
  async findByWorkflowId(workflowId: string): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE workflow_id = ? ORDER BY created_at DESC`,
      [workflowId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find features by session ID
   */
  async findBySessionId(sessionId: string): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE session_id = ? ORDER BY created_at DESC`,
      [sessionId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find features by external ID (e.g., Linear ticket ID)
   */
  async findByExternalId(externalId: string): Promise<Feature | null> {
    const row = this.queryOne<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE external_id = ?`,
      [externalId]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find features by branch name
   */
  async findByBranchName(branchName: string): Promise<Feature | null> {
    const row = this.queryOne<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE branch_name = ?`,
      [branchName]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find active features (not completed or cancelled)
   */
  async findActive(): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName}
       WHERE status NOT IN ('completed', 'cancelled')
       ORDER BY priority DESC, updated_at DESC`
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find features by priority
   */
  async findByPriority(priority: Feature["priority"]): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE priority = ? ORDER BY updated_at DESC`,
      [priority]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find features by tag
   */
  async findByTag(tag: string): Promise<Feature[]> {
    // Search within JSON array for the tag
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName}
       WHERE tags LIKE ?
       ORDER BY updated_at DESC`,
      [`%"${tag}"%`]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find features assigned to a specific agent or user
   */
  async findByAssignee(assignee: string): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName}
       WHERE assignees LIKE ?
       ORDER BY priority DESC, updated_at DESC`,
      [`%"${assignee}"%`]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  // ==========================================================================
  // Stage Management Methods
  // ==========================================================================

  /**
   * Advance feature to a new stage
   */
  async advanceStage(id: string, newStageId: string): Promise<Feature> {
    return this.update(id, { currentStage: newStageId });
  }

  /**
   * Find features at a specific stage
   */
  async findByStage(stageId: string): Promise<Feature[]> {
    const rows = this.query<FeatureRow>(
      `SELECT * FROM ${this.tableName} WHERE current_stage = ? ORDER BY updated_at DESC`,
      [stageId]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  // ==========================================================================
  // Status Management Methods
  // ==========================================================================

  /**
   * Update feature status
   */
  async updateStatus(id: string, status: FeatureStatus): Promise<void> {
    const now = new Date();
    const updates: Record<string, unknown> = {
      status,
      updated_at: DateColumn.toStorage(now),
    };

    // Set completed_at if transitioning to completed
    if (status === "completed") {
      updates.completed_at = DateColumn.toStorage(now);
    }

    const columns = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = columns.map((col) => `${col} = ?`).join(", ");

    this.db.run(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
      [...(values as (string | number | null)[]), id]
    );
  }

  /**
   * Mark feature as blocked
   */
  async markBlocked(id: string): Promise<void> {
    await this.updateStatus(id, "blocked");
  }

  /**
   * Mark feature as cancelled
   */
  async markCancelled(id: string): Promise<void> {
    await this.updateStatus(id, "cancelled");
  }

  // ==========================================================================
  // Requirements Methods
  // ==========================================================================

  /**
   * Add a requirement to a feature
   */
  async addRequirement(id: string, requirement: string): Promise<Feature> {
    const feature = await this.findById(id);
    if (!feature) {
      throw new Error(`Feature not found: ${id}`);
    }

    const requirements = [...feature.requirements, requirement];
    return this.update(id, { requirements });
  }

  /**
   * Remove a requirement from a feature
   */
  async removeRequirement(id: string, requirementIndex: number): Promise<Feature> {
    const feature = await this.findById(id);
    if (!feature) {
      throw new Error(`Feature not found: ${id}`);
    }

    const requirements = feature.requirements.filter((_, i) => i !== requirementIndex);
    return this.update(id, { requirements });
  }

  /**
   * Add acceptance criteria to a feature
   */
  async addAcceptanceCriteria(id: string, criteria: string): Promise<Feature> {
    const feature = await this.findById(id);
    if (!feature) {
      throw new Error(`Feature not found: ${id}`);
    }

    const acceptanceCriteria = [...feature.acceptanceCriteria, criteria];
    return this.update(id, { acceptanceCriteria });
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Count features by status
   */
  async countByStatus(): Promise<Record<FeatureStatus, number>> {
    const rows = this.query<{ status: FeatureStatus; count: number }>(
      `SELECT status, COUNT(*) as count FROM ${this.tableName} GROUP BY status`
    );

    const result: Record<FeatureStatus, number> = {
      planning: 0,
      in_progress: 0,
      review: 0,
      testing: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      result[row.status] = row.count;
    }

    return result;
  }

  /**
   * Count features by workflow
   */
  async countByWorkflow(): Promise<Record<string, number>> {
    const rows = this.query<{ workflow_id: string; count: number }>(
      `SELECT workflow_id, COUNT(*) as count FROM ${this.tableName} GROUP BY workflow_id`
    );

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.workflow_id] = row.count;
    }

    return result;
  }

  /**
   * Get completion rate (percentage of features completed vs total)
   */
  async getCompletionRate(): Promise<number> {
    const result = this.queryOne<{ total: number; completed: number }>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM ${this.tableName}`
    );

    if (!result || result.total === 0) return 0;
    return (result.completed / result.total) * 100;
  }
}

/**
 * Create a FeatureRepository instance
 */
export function createFeatureRepository(db: DatabaseService): FeatureRepository {
  return new FeatureRepository(db);
}
