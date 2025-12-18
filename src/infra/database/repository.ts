/**
 * Base Repository Interface
 *
 * Provides a generic repository pattern for database operations.
 * All entity repositories extend this base interface.
 */

import type { DatabaseService } from "./connection.js";

/**
 * Query options for list operations
 */
export interface QueryOptions {
  /** Maximum number of results */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
  /** Field to order by */
  orderBy?: string;
  /** Sort direction */
  orderDirection?: "ASC" | "DESC";
}

/**
 * Pagination result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Base Repository Interface
 *
 * Defines common CRUD operations that all repositories must implement.
 *
 * @typeParam T - Entity type
 * @typeParam CreateInput - Input type for create operations
 * @typeParam UpdateInput - Input type for update operations
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  /**
   * Find an entity by its ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   */
  findAll(options?: QueryOptions): Promise<T[]>;

  /**
   * Create a new entity
   */
  create(data: CreateInput): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, data: UpdateInput): Promise<T>;

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if an entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count total entities
   */
  count(): Promise<number>;
}

/**
 * Base Repository Implementation
 *
 * Provides common CRUD operations for entities stored in SQLite.
 * Subclasses should override methods to add entity-specific logic.
 *
 * @example
 * ```typescript
 * class SessionRepository extends BaseRepository<Session, CreateSession, UpdateSession> {
 *   constructor(db: DatabaseService) {
 *     super(db, 'sessions');
 *   }
 *
 *   // Add custom methods
 *   async findActive(): Promise<Session[]> {
 *     return this.db.query<Session>(
 *       "SELECT * FROM sessions WHERE status = ?",
 *       ["active"]
 *     );
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput>
  implements IRepository<T, CreateInput, UpdateInput>
{
  protected readonly db: DatabaseService;
  protected readonly tableName: string;
  protected readonly idColumn: string;

  constructor(db: DatabaseService, tableName: string, idColumn: string = "id") {
    this.db = db;
    this.tableName = tableName;
    this.idColumn = idColumn;
  }

  /**
   * Convert a database row to an entity
   * Subclasses must implement this to handle type conversion
   */
  protected abstract rowToEntity(row: Record<string, unknown>): T;

  /**
   * Convert an entity to database columns
   * Subclasses must implement this to handle type conversion
   */
  protected abstract entityToRow(entity: CreateInput | UpdateInput): Record<string, unknown>;

  /**
   * Find an entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const row = this.db.queryOne<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id]
    );

    return row ? this.rowToEntity(row) : null;
  }

  /**
   * Find all entities with optional pagination
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    const {
      limit,
      offset,
      orderBy = "created_at",
      orderDirection = "DESC",
    } = options;

    let sql = `SELECT * FROM ${this.tableName}`;
    const params: (string | number)[] = [];

    // Add ordering
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    // Add pagination
    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);

      if (offset !== undefined) {
        sql += " OFFSET ?";
        params.push(offset);
      }
    }

    const rows = this.db.query<Record<string, unknown>>(sql, params);
    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * Create a new entity
   */
  async create(data: CreateInput): Promise<T> {
    const row = this.entityToRow(data);
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map(() => "?").join(", ");

    const sql = `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
    this.db.run(sql, values as (string | number | null)[]);

    // Retrieve the created entity
    const id = (row as Record<string, unknown>)[this.idColumn] as string;
    const created = await this.findById(id);

    if (!created) {
      throw new Error(`Failed to create entity in ${this.tableName}`);
    }

    return created;
  }

  /**
   * Update an existing entity
   */
  async update(id: string, data: UpdateInput): Promise<T> {
    const row = this.entityToRow(data);
    const columns = Object.keys(row);
    const values = Object.values(row);

    if (columns.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Entity not found: ${id}`);
      }
      return existing;
    }

    const setClause = columns.map((col) => `${col} = ?`).join(", ");
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.idColumn} = ?`;

    this.db.run(sql, [...(values as (string | number | null)[]), id]);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Entity not found after update: ${id}`);
    }

    return updated;
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string): Promise<void> {
    const changes = this.db.run(
      `DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id]
    );

    if (changes === 0) {
      throw new Error(`Entity not found: ${id}`);
    }
  }

  /**
   * Check if an entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      [id]
    );

    return (result?.count ?? 0) > 0;
  }

  /**
   * Count total entities
   */
  async count(): Promise<number> {
    const result = this.db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );

    return result?.count ?? 0;
  }

  /**
   * Find with pagination and return total count
   */
  async findPaginated(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const { limit = 50, offset = 0 } = options;

    const [data, total] = await Promise.all([
      this.findAll({ ...options, limit, offset }),
      this.count(),
    ]);

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Execute a custom query
   */
  protected query<R>(sql: string, params?: (string | number | null)[]): R[] {
    return this.db.query<R>(sql, params);
  }

  /**
   * Execute a custom query returning a single result
   */
  protected queryOne<R>(sql: string, params?: (string | number | null)[]): R | undefined {
    return this.db.queryOne<R>(sql, params);
  }

  /**
   * Execute within a transaction
   */
  protected transaction<R>(fn: () => R): R {
    return this.db.transaction(fn);
  }
}

/**
 * JSON column helpers
 *
 * Utilities for serializing/deserializing JSON columns
 */
export const JsonColumn = {
  /**
   * Parse a JSON column value
   */
  parse<T>(value: string | null | undefined, defaultValue: T): T {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Stringify a value for JSON column storage
   */
  stringify(value: unknown): string {
    return JSON.stringify(value);
  },
};

/**
 * Date column helpers
 *
 * Utilities for handling ISO date strings in SQLite
 */
export const DateColumn = {
  /**
   * Convert a Date to ISO string for storage
   */
  toStorage(date: Date): string {
    return date.toISOString();
  },

  /**
   * Parse an ISO string from storage to Date
   */
  fromStorage(value: string | null | undefined): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  },

  /**
   * Parse a required ISO string from storage to Date
   */
  fromStorageRequired(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return date;
  },
};
