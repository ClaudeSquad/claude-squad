/**
 * Skill Repository
 *
 * Repository implementation for Skill entities.
 * Manages reusable skills that can be assigned to agents.
 */

import type { DatabaseService } from "../connection.js";
import { BaseRepository, DateColumn, JsonColumn } from "../repository.js";
import type {
  Skill,
  CreateSkill,
  UpdateSkill,
} from "../../../core/entities/skill.js";
import type { SourceType } from "../../../core/types/common.js";

/**
 * Database row type for skills table
 */
interface SkillRow {
  id: string;
  name: string;
  description: string;
  content: string;
  version: string;
  source: SourceType;
  allowed_tools: string | null; // JSON array
  tags: string; // JSON array
  author: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Skill Repository
 *
 * Manages skill persistence with support for markdown content,
 * version tracking, and tag-based organization.
 *
 * @example
 * ```typescript
 * const skillRepo = new SkillRepository(db);
 *
 * // Find skills by tag
 * const reactSkills = await skillRepo.findByTag('react');
 *
 * // Find active skills
 * const active = await skillRepo.findActive();
 * ```
 */
export class SkillRepository extends BaseRepository<Skill, CreateSkill, UpdateSkill> {
  constructor(db: DatabaseService) {
    super(db, "skills", "id");
  }

  /**
   * Convert database row to Skill entity
   */
  protected rowToEntity(row: Record<string, unknown>): Skill {
    const r = row as unknown as SkillRow;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      content: r.content,
      version: r.version,
      source: r.source,
      allowedTools: r.allowed_tools ? JsonColumn.parse(r.allowed_tools, []) : undefined,
      tags: JsonColumn.parse(r.tags, []),
      author: r.author ?? undefined,
      isActive: r.is_active === 1,
      createdAt: DateColumn.fromStorageRequired(r.created_at),
      updatedAt: DateColumn.fromStorageRequired(r.updated_at),
    };
  }

  /**
   * Convert Skill entity to database row
   */
  protected entityToRow(
    entity: CreateSkill | UpdateSkill
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
    if ("content" in entity && entity.content !== undefined) {
      row.content = entity.content;
    }
    if ("version" in entity && entity.version !== undefined) {
      row.version = entity.version;
    }
    if ("source" in entity && entity.source !== undefined) {
      row.source = entity.source;
    }
    if ("allowedTools" in entity) {
      row.allowed_tools = entity.allowedTools
        ? JsonColumn.stringify(entity.allowedTools)
        : null;
    }
    if ("tags" in entity && entity.tags !== undefined) {
      row.tags = JsonColumn.stringify(entity.tags);
    }
    if ("author" in entity) {
      row.author = entity.author ?? null;
    }
    if ("isActive" in entity && entity.isActive !== undefined) {
      row.is_active = entity.isActive ? 1 : 0;
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
  async create(data: CreateSkill): Promise<Skill> {
    const now = new Date();
    const withDefaults: CreateSkill = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    };
    return super.create(withDefaults);
  }

  /**
   * Override update to handle timestamps
   */
  async update(id: string, data: UpdateSkill): Promise<Skill> {
    const now = new Date();
    const withTimestamp: UpdateSkill = {
      ...data,
      updatedAt: now,
    };
    return super.update(id, withTimestamp);
  }

  // ==========================================================================
  // Custom Query Methods
  // ==========================================================================

  /**
   * Find skill by name
   */
  async findByName(name: string): Promise<Skill | null> {
    const row = this.queryOne<SkillRow>(
      `SELECT * FROM ${this.tableName} WHERE name = ?`,
      [name]
    );
    return row ? this.rowToEntity(row as unknown as Record<string, unknown>) : null;
  }

  /**
   * Find active skills
   */
  async findActive(): Promise<Skill[]> {
    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName} WHERE is_active = 1 ORDER BY name ASC`
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find skills by source type
   */
  async findBySource(source: SourceType): Promise<Skill[]> {
    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName} WHERE source = ? ORDER BY name ASC`,
      [source]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find built-in skills
   */
  async findBuiltin(): Promise<Skill[]> {
    return this.findBySource("builtin");
  }

  /**
   * Find custom skills
   */
  async findCustom(): Promise<Skill[]> {
    return this.findBySource("custom");
  }

  /**
   * Find skills by tag
   */
  async findByTag(tag: string): Promise<Skill[]> {
    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName}
       WHERE tags LIKE ?
       ORDER BY name ASC`,
      [`%"${tag}"%`]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find skills by multiple tags (any match)
   */
  async findByAnyTag(tags: string[]): Promise<Skill[]> {
    if (tags.length === 0) return [];

    const conditions = tags.map(() => `tags LIKE ?`).join(" OR ");
    const params = tags.map((tag) => `%"${tag}"%`);

    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName}
       WHERE ${conditions}
       ORDER BY name ASC`,
      params
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Search skills by name or description
   */
  async search(query: string): Promise<Skill[]> {
    const searchTerm = `%${query}%`;
    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName}
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY name ASC`,
      [searchTerm, searchTerm]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  /**
   * Find skills by author
   */
  async findByAuthor(author: string): Promise<Skill[]> {
    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName} WHERE author = ? ORDER BY name ASC`,
      [author]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  // ==========================================================================
  // Status Management Methods
  // ==========================================================================

  /**
   * Activate a skill
   */
  async activate(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET is_active = 1, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  /**
   * Deactivate a skill
   */
  async deactivate(id: string): Promise<void> {
    const now = new Date();
    this.db.run(
      `UPDATE ${this.tableName} SET is_active = 0, updated_at = ? WHERE id = ?`,
      [DateColumn.toStorage(now), id]
    );
  }

  // ==========================================================================
  // Version Management Methods
  // ==========================================================================

  /**
   * Update skill version
   */
  async updateVersion(id: string, version: string): Promise<Skill> {
    return this.update(id, { version });
  }

  /**
   * Get all versions of skills with the same name (for imported skills)
   */
  async getVersions(name: string): Promise<Skill[]> {
    const rows = this.query<SkillRow>(
      `SELECT * FROM ${this.tableName}
       WHERE name = ?
       ORDER BY version DESC`,
      [name]
    );
    return rows.map((row) => this.rowToEntity(row as unknown as Record<string, unknown>));
  }

  // ==========================================================================
  // Tag Management Methods
  // ==========================================================================

  /**
   * Add a tag to a skill
   */
  async addTag(id: string, tag: string): Promise<Skill> {
    const skill = await this.findById(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }

    if (!skill.tags.includes(tag)) {
      const tags = [...skill.tags, tag];
      return this.update(id, { tags });
    }
    return skill;
  }

  /**
   * Remove a tag from a skill
   */
  async removeTag(id: string, tag: string): Promise<Skill> {
    const skill = await this.findById(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }

    const tags = skill.tags.filter((t) => t !== tag);
    return this.update(id, { tags });
  }

  // ==========================================================================
  // Aggregate Methods
  // ==========================================================================

  /**
   * Get all unique tags
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
   * Count skills by source
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
   * Count active skills
   */
  async countActive(): Promise<number> {
    const result = this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = 1`
    );
    return result?.count ?? 0;
  }
}

/**
 * Create a SkillRepository instance
 */
export function createSkillRepository(db: DatabaseService): SkillRepository {
  return new SkillRepository(db);
}
