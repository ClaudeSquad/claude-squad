/**
 * Workflow Repository
 *
 * Repository implementation for Workflow entities.
 * Manages workflow definitions with their stages and review gates.
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn } from "../repository.js";
import type {
  Workflow,
  CreateWorkflow,
  UpdateWorkflow,
} from "../../../core/entities/workflow.js";
import type { Stage } from "../../../core/entities/stage.js";
import type { SourceType } from "../../../core/types/common.js";

/**
 * Database row type for workflows table
 */
interface WorkflowRow {
  id: string;
  name: string;
  type: "builtin" | "custom";
  description: string;
  stages: string; // JSON array of Stage objects
  is_default: number;
  is_builtin: number;
  source: SourceType;
  version: string;
  tags: string; // JSON array
  estimated_duration: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workflow Repository
 *
 * Manages workflow persistence including stage definitions,
 * review gates, and template management.
 *
 * @example
 * ```typescript
 * const workflowRepo = new WorkflowRepository(db);
 *
 * // Get default workflow
 * const defaultWorkflow = await workflowRepo.findDefault();
 *
 * // Find workflows by source
 * const builtinWorkflows = await workflowRepo.findBySource('builtin');
 * ```
 */
export class WorkflowRepository extends BaseRepository<Workflow, CreateWorkflow, UpdateWorkflow> {
  constructor(db: DatabaseService) {
    super(db, "workflows", "id");
  }

  /**
   * Convert database row to Workflow entity
   */
  protected rowToEntity(row: Record<string, unknown>): Workflow {
    const r = row as unknown as WorkflowRow;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      stages: JsonColumn.parse<Stage[]>(r.stages, []),
      isDefault: r.is_default === 1,
      isBuiltIn: r.is_builtin === 1,
      source: r.source,
      version: r.version,
      tags: JsonColumn.parse(r.tags, []),
      estimatedDuration: r.estimated_duration ?? undefined,
      createdAt: DateColumn.fromStorageRequired(r.created_at),
      updatedAt: DateColumn.fromStorageRequired(r.updated_at),
    };
  }

  /**
   * Convert Workflow entity to database row
   */
  protected entityToRow(
    entity: CreateWorkflow | UpdateWorkflow
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
    if ("stages" in entity && entity.stages !== undefined) {
      row.stages = JsonColumn.stringify(entity.stages);
    }
    if ("isDefault" in entity && entity.isDefault !== undefined) {
      row.is_default = entity.isDefault ? 1 : 0;
    }
    if ("isBuiltIn" in entity && entity.isBuiltIn !== undefined) {
      row.is_builtin = entity.isBuiltIn ? 1 : 0;
      row.type = entity.isBuiltIn ? "builtin" : "custom";
    }
    if ("source" in entity && entity.source !== undefined) {
      row.source = entity.source;
    }
    if ("version" in entity && entity.version !== undefined) {
      row.version = entity.version;
    }
    if ("tags" in entity && entity.tags !== undefined) {
      row.tags = JsonColumn.stringify(entity.tags);
    }
    if ("estimatedDuration" in entity) {
      row.estimated_duration = entity.estimatedDuration ?? null;
    }
    if ("createdAt" in entity && entity.createdAt !== undefined) {
      row.created_at = DateColumn.toStorage(entity.createdAt);
    }
    if ("updatedAt" in entity && entity.updatedAt !== undefined) {
      row.updated_at = DateColumn.toStorage(entity.updatedAt);
    }

    // Set type based on isBuiltIn if creating
    if ("id" in entity && !("type" in row)) {
      row.type = "custom";
    }

    return row;
  }

  /**
   * Override create to set timestamps if not provided
   */
  async create(data: CreateWorkflow): Promise<Workflow> {
    const now = new Date();
    const withDefaults: CreateWorkflow = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };
    return super.create(withDefaults);
  }

  /**
   * Override update to handle timestamps
   */
  async update(id: string, data: UpdateWorkflow): Promise<Workflow> {
    const now = new Date();
    const withTimestamp: UpdateWorkflow = {
      ...data,
      updatedAt: now,
    };
    return super.update(id, withTimestamp);
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find workflow by name
   */
  async findByName(name: string): Promise<Workflow | null> {
    const row = this.queryOne<WorkflowRow>(
      `SELECT * FROM ${this.tableName} WHERE name = ?`,
      [name]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find the default workflow
   */
  async findDefault(): Promise<Workflow | null> {
    const row = this.queryOne<WorkflowRow>(
      `SELECT * FROM ${this.tableName} WHERE is_default = 1 LIMIT 1`
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find workflows by source type
   */
  async findBySource(source: SourceType): Promise<Workflow[]> {
    const rows = this.query<WorkflowRow>(
      `SELECT * FROM ${this.tableName} WHERE source = ? ORDER BY name ASC`,
      [source]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find built-in workflows
   */
  async findBuiltin(): Promise<Workflow[]> {
    const rows = this.query<WorkflowRow>(
      `SELECT * FROM ${this.tableName} WHERE is_builtin = 1 ORDER BY name ASC`
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find custom workflows
   */
  async findCustom(): Promise<Workflow[]> {
    const rows = this.query<WorkflowRow>(
      `SELECT * FROM ${this.tableName} WHERE is_builtin = 0 ORDER BY name ASC`
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find workflows by tag
   */
  async findByTag(tag: string): Promise<Workflow[]> {
    const rows = this.query<WorkflowRow>(
      `SELECT * FROM ${this.tableName}
       WHERE tags LIKE ?
       ORDER BY name ASC`,
      [`%"${tag}"%`]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Search workflows by name or description
   */
  async search(query: string): Promise<Workflow[]> {
    const searchTerm = `%${query}%`;
    const rows = this.query<WorkflowRow>(
      `SELECT * FROM ${this.tableName}
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY name ASC`,
      [searchTerm, searchTerm]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  // ==========================================================================
  // Default Workflow Management
  // ==========================================================================

  /**
   * Set a workflow as the default (unsets all others)
   */
  async setAsDefault(id: string): Promise<void> {
    const now = new Date();
    this.transaction(() => {
      // Clear all defaults
      this.db.run(
        `UPDATE ${this.tableName} SET is_default = 0, updated_at = ?`,
        [DateColumn.toStorage(now)]
      );
      // Set the new default
      this.db.run(
        `UPDATE ${this.tableName} SET is_default = 1, updated_at = ? WHERE id = ?`,
        [DateColumn.toStorage(now), id]
      );
    });
  }

  /**
   * Clear default workflow
   */
  async clearDefault(): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET is_default = 0, updated_at = ?`,
      [DateColumn.toStorage(now)]
    );
  }

  // ==========================================================================
  // Stage Management Methods
  // ==========================================================================

  /**
   * Add a stage to a workflow
   */
  async addStage(id: string, stage: Stage): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const stages = [...workflow.stages, stage];
    return this.update(id, { stages });
  }

  /**
   * Remove a stage from a workflow
   */
  async removeStage(id: string, stageId: string): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const stages = workflow.stages.filter((s) => s.id !== stageId);
    return this.update(id, { stages });
  }

  /**
   * Update a stage in a workflow
   */
  async updateStage(
    workflowId: string,
    stageId: string,
    stageUpdates: Partial<Stage>
  ): Promise<Workflow> {
    const workflow = await this.findById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const stages = workflow.stages.map((s) =>
      s.id === stageId ? { ...s, ...stageUpdates } : s
    );
    return this.update(workflowId, { stages });
  }

  /**
   * Reorder stages in a workflow
   */
  async reorderStages(id: string, stageIds: string[]): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    // Create a map for quick lookup
    const stageMap = new Map(workflow.stages.map((s) => [s.id, s]));

    // Reorder based on provided IDs
    const stages = stageIds
      .map((stageId, index) => {
        const stage = stageMap.get(stageId);
        if (!stage) return null;
        return { ...stage, order: index + 1 };
      })
      .filter((s): s is Stage => s !== null);

    return this.update(id, { stages });
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Count workflows by source
   */
  async countBySource(): Promise<Record<SourceType, number>> {
    const rows = this.query<{ source: SourceType; count: number }>(
      `SELECT source, COUNT(*) as count FROM ${this.tableName} GROUP BY source`
    );

    const result: Record<SourceType, number> = {
      builtin: 0,
      custom: 0,
      imported: 0,
    };

    for (const row of rows) {
      result[row.source] = row.count;
    }

    return result;
  }

  /**
   * Get all unique tags across workflows
   */
  async getAllTags(): Promise<string[]> {
    const rows = this.query<{ tags: string }>(
      `SELECT DISTINCT tags FROM ${this.tableName}`
    );

    const tagSet = new Set<string>();
    for (const row of rows) {
      const tags: string[] = JsonColumn.parse(row.tags, []);
      for (const tag of tags) {
        tagSet.add(tag);
      }
    }

    return [...tagSet].sort();
  }

  /**
   * Get total stage count across all workflows
   */
  async getTotalStageCount(): Promise<number> {
    const workflows = await this.findAll();
    return workflows.reduce((total, w) => total + w.stages.length, 0);
  }
}

/**
 * Create a WorkflowRepository instance
 */
export function createWorkflowRepository(db: DatabaseService): WorkflowRepository {
  return new WorkflowRepository(db);
}
