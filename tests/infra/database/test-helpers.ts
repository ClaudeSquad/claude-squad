/**
 * Database Test Helpers
 *
 * Utilities for setting up test databases with migrations.
 */

import { DatabaseService } from "../../../src/infra/database/connection.js";
import { MigrationManager } from "../../../src/infra/database/migrations/index.js";
import { join, dirname } from "node:path";
import { unlink } from "node:fs/promises";

/**
 * Test database context with cleanup
 */
export interface TestDatabaseContext {
  db: DatabaseService;
  cleanup: () => Promise<void>;
}

/**
 * Create a test database with all migrations applied
 *
 * @param testName - Name for the test database file
 * @returns Database context with cleanup function
 */
export async function createTestDatabase(
  testName: string = "test"
): Promise<TestDatabaseContext> {
  const timestamp = Date.now();
  const testDbPath = `/tmp/claude-squad-test-${testName}-${timestamp}.db`;

  const db = new DatabaseService({
    path: testDbPath,
    walMode: true,
    foreignKeys: true,
  });

  // Get the migrations directory (relative to source)
  const migrationsDir = join(
    dirname(import.meta.path),
    "../../../src/infra/database/migrations"
  );

  // Run migrations
  const migrator = new MigrationManager(db, migrationsDir);
  const result = await migrator.migrate();

  if (result.failed) {
    db.close();
    throw new Error(`Migration failed: ${result.failed.name} - ${result.failed.error}`);
  }

  return {
    db,
    cleanup: async () => {
      db.close();
      try {
        await unlink(testDbPath);
        await unlink(`${testDbPath}-wal`);
        await unlink(`${testDbPath}-shm`);
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**
 * Generate a unique ID for testing
 */
export function testId(prefix: string = "test"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
