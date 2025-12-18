/**
 * Database Migrations
 *
 * Migration system for versioned database schema changes.
 * Tracks applied migrations and supports forward migrations.
 */

import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { DatabaseService } from "../connection.js";

/**
 * Migration record stored in the database
 */
export interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

/**
 * Migration file metadata
 */
export interface MigrationFile {
  name: string;
  path: string;
  version: number;
}

/**
 * Migration result
 */
export interface MigrationResult {
  applied: string[];
  skipped: string[];
  failed?: {
    name: string;
    error: string;
  };
}

/**
 * Migration Manager
 *
 * Handles database schema migrations with version tracking.
 * Migrations are SQL files named with a numeric prefix (e.g., 001_initial_schema.sql).
 *
 * @example
 * ```typescript
 * const migrator = new MigrationManager(db);
 * await migrator.migrate();
 * ```
 */
export class MigrationManager {
  private db: DatabaseService;
  private migrationsDir: string;

  constructor(db: DatabaseService, migrationsDir?: string) {
    this.db = db;
    // Default to the directory containing this file
    this.migrationsDir = migrationsDir || dirname(import.meta.path);
  }

  /**
   * Ensure the migrations tracking table exists
   */
  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      )
    `);
  }

  /**
   * Get list of applied migrations from the database
   */
  getAppliedMigrations(): MigrationRecord[] {
    this.ensureMigrationsTable();
    return this.db.query<MigrationRecord>(
      "SELECT id, name, applied_at FROM _migrations ORDER BY id"
    );
  }

  /**
   * Get list of migration files from the migrations directory
   */
  async getMigrationFiles(): Promise<MigrationFile[]> {
    const files = await readdir(this.migrationsDir);

    const migrations: MigrationFile[] = [];

    for (const file of files) {
      // Match files like 001_initial_schema.sql
      const match = file.match(/^(\d+)_.+\.sql$/);
      if (match && match[1]) {
        migrations.push({
          name: file.replace(/\.sql$/, ""),
          path: join(this.migrationsDir, file),
          version: parseInt(match[1], 10),
        });
      }
    }

    // Sort by version number
    return migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Get pending migrations (not yet applied)
   */
  async getPendingMigrations(): Promise<MigrationFile[]> {
    const applied = new Set(this.getAppliedMigrations().map((m) => m.name));
    const allMigrations = await this.getMigrationFiles();

    return allMigrations.filter((m) => !applied.has(m.name));
  }

  /**
   * Apply a single migration
   *
   * @param migration - Migration file to apply
   * @throws Error if migration fails
   */
  async applyMigration(migration: MigrationFile): Promise<void> {
    const file = Bun.file(migration.path);
    const sql = await file.text();

    // Execute the migration SQL within a transaction
    this.db.transaction(() => {
      // Split by semicolons and execute each statement
      // (SQLite exec can handle multiple statements, but we do it this way for clarity)
      this.db.exec(sql);

      // Record the migration
      this.db.run(
        "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
        [migration.name, new Date().toISOString()]
      );
    });
  }

  /**
   * Run all pending migrations
   *
   * @returns Migration result with applied, skipped, and failed migrations
   */
  async migrate(): Promise<MigrationResult> {
    this.ensureMigrationsTable();

    const pending = await this.getPendingMigrations();
    const result: MigrationResult = {
      applied: [],
      skipped: [],
    };

    if (pending.length === 0) {
      return result;
    }

    for (const migration of pending) {
      try {
        await this.applyMigration(migration);
        result.applied.push(migration.name);
      } catch (error) {
        result.failed = {
          name: migration.name,
          error: error instanceof Error ? error.message : String(error),
        };
        // Stop on first failure
        break;
      }
    }

    return result;
  }

  /**
   * Check if migrations are needed
   */
  async needsMigration(): Promise<boolean> {
    const pending = await this.getPendingMigrations();
    return pending.length > 0;
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: MigrationRecord[];
    pending: MigrationFile[];
    current: string | null;
  }> {
    const applied = this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();

    const lastApplied = applied.length > 0 ? applied[applied.length - 1] : undefined;
    return {
      applied,
      pending,
      current: lastApplied?.name ?? null,
    };
  }

  /**
   * Reset the database (drop all tables)
   *
   * WARNING: This will destroy all data!
   * Only use for testing or development.
   */
  reset(): void {
    // Get all table names
    const tables = this.db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );

    // Disable foreign keys temporarily
    this.db.exec("PRAGMA foreign_keys = OFF");

    // Drop all tables
    for (const { name } of tables) {
      this.db.exec(`DROP TABLE IF EXISTS "${name}"`);
    }

    // Re-enable foreign keys
    this.db.exec("PRAGMA foreign_keys = ON");
  }
}

/**
 * Create a migration manager for the given database
 */
export function createMigrationManager(
  db: DatabaseService,
  migrationsDir?: string
): MigrationManager {
  return new MigrationManager(db, migrationsDir);
}

/**
 * Run migrations on a database
 *
 * Convenience function that creates a migration manager and runs migrations.
 *
 * @param db - Database service
 * @param migrationsDir - Optional custom migrations directory
 * @returns Migration result
 */
export async function runMigrations(
  db: DatabaseService,
  migrationsDir?: string
): Promise<MigrationResult> {
  const manager = createMigrationManager(db, migrationsDir);
  return manager.migrate();
}
