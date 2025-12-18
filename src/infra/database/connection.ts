/**
 * Database Service
 *
 * SQLite connection with WAL mode for high-performance concurrent access.
 * Provides type-safe query and run methods with parameterized queries.
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";

/**
 * SQL parameter type - subset of SQLQueryBindings for common use cases
 */
export type SQLParam = SQLQueryBindings;

/**
 * Database configuration options
 */
export interface DatabaseConfig {
  /** Path to the SQLite database file */
  path: string;
  /** Create the database if it doesn't exist (default: true) */
  create?: boolean;
  /** Enable WAL journal mode for better concurrency (default: true) */
  walMode?: boolean;
  /** Enable foreign key constraints (default: true) */
  foreignKeys?: boolean;
  /** Busy timeout in milliseconds (default: 5000) */
  busyTimeout?: number;
}

/**
 * Query result with metadata
 */
export interface QueryResult<T> {
  rows: T[];
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * Database Service
 *
 * Provides a type-safe wrapper around Bun's SQLite database with
 * optimized settings for concurrent access and data integrity.
 */
export class DatabaseService {
  private db: Database;
  private readonly config: Required<DatabaseConfig>;

  constructor(config: DatabaseConfig) {
    this.config = {
      path: config.path,
      create: config.create ?? true,
      walMode: config.walMode ?? true,
      foreignKeys: config.foreignKeys ?? true,
      busyTimeout: config.busyTimeout ?? 5000,
    };

    // Initialize database connection
    this.db = new Database(this.config.path, {
      create: this.config.create,
    });

    // Configure database settings
    this.configure();
  }

  /**
   * Configure database pragmas for optimal performance
   */
  private configure(): void {
    // Enable WAL mode for concurrent reads/writes
    if (this.config.walMode) {
      this.db.exec("PRAGMA journal_mode = WAL");
    }

    // Enable foreign key constraint enforcement
    if (this.config.foreignKeys) {
      this.db.exec("PRAGMA foreign_keys = ON");
    }

    // Set busy timeout for concurrent access
    this.db.exec(`PRAGMA busy_timeout = ${this.config.busyTimeout}`);

    // Optimize for performance
    this.db.exec("PRAGMA synchronous = NORMAL");
    this.db.exec("PRAGMA cache_size = -64000"); // 64MB cache
    this.db.exec("PRAGMA temp_store = MEMORY");
  }

  /**
   * Execute a SELECT query and return typed results
   *
   * @param sql - SQL query string with ? placeholders
   * @param params - Query parameters (prevents SQL injection)
   * @returns Array of typed result rows
   *
   * @example
   * ```typescript
   * interface User { id: number; name: string; }
   * const users = db.query<User>("SELECT * FROM users WHERE active = ?", [true]);
   * ```
   */
  query<T>(sql: string, params?: SQLParam[]): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  /**
   * Execute a SELECT query and return a single row
   *
   * @param sql - SQL query string with ? placeholders
   * @param params - Query parameters
   * @returns Single result row or undefined
   */
  queryOne<T>(sql: string, params?: SQLParam[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...(params || [])) as T | undefined;
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE statement
   *
   * @param sql - SQL statement with ? placeholders
   * @param params - Statement parameters (prevents SQL injection)
   * @returns Number of affected rows
   *
   * @example
   * ```typescript
   * const changes = db.run("UPDATE users SET name = ? WHERE id = ?", ["Alice", 1]);
   * ```
   */
  run(sql: string, params?: SQLParam[]): number {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...(params || []));
    return result.changes;
  }

  /**
   * Execute an INSERT statement and return the last inserted row ID
   *
   * @param sql - INSERT statement with ? placeholders
   * @param params - Statement parameters
   * @returns The last inserted row ID
   */
  insert(sql: string, params?: SQLParam[]): number | bigint {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...(params || []));
    return result.lastInsertRowid;
  }

  /**
   * Execute raw SQL (use with caution - no parameterization)
   *
   * @param sql - Raw SQL to execute
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Execute multiple statements in a transaction
   *
   * @param fn - Function containing database operations
   * @returns Result of the transaction function
   *
   * @example
   * ```typescript
   * db.transaction(() => {
   *   db.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);
   *   db.run("INSERT INTO users (name) VALUES (?)", ["Bob"]);
   * });
   * ```
   */
  transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  /**
   * Check if a table exists in the database
   *
   * @param tableName - Name of the table to check
   * @returns True if the table exists
   */
  tableExists(tableName: string): boolean {
    const result = this.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table' AND name = ?",
      [tableName]
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get the database file path
   */
  get path(): string {
    return this.config.path;
  }

  /**
   * Check if the database connection is open
   */
  get isOpen(): boolean {
    try {
      this.db.exec("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the database connection
   *
   * Should be called when the application shuts down to ensure
   * all data is flushed and resources are released.
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Default database path for Claude Squad
 */
export function getDefaultDatabasePath(): string {
  const dataDir = process.env.SQUAD_DATA_DIR || `${process.env.HOME}/.claude-squad`;
  return `${dataDir}/squad.db`;
}

/**
 * Create a database service with default configuration
 */
export function createDatabase(path?: string): DatabaseService {
  return new DatabaseService({
    path: path || getDefaultDatabasePath(),
  });
}
