/**
 * Database Service Tests
 *
 * Tests for SQLite database operations with WAL mode.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseService, createDatabase } from "../../../src/infra/database/connection.js";
import { unlink } from "node:fs/promises";

describe("DatabaseService", () => {
  let db: DatabaseService;
  const testDbPath = "/tmp/test-squad.db";

  beforeEach(() => {
    db = new DatabaseService({
      path: testDbPath,
      walMode: true,
      foreignKeys: true,
    });
  });

  afterEach(async () => {
    db.close();
    // Clean up test database files
    try {
      await unlink(testDbPath);
      await unlink(`${testDbPath}-wal`);
      await unlink(`${testDbPath}-shm`);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("initialization", () => {
    it("should create database with WAL mode", () => {
      const result = db.queryOne<{ journal_mode: string }>(
        "PRAGMA journal_mode"
      );
      expect(result?.journal_mode).toBe("wal");
    });

    it("should enable foreign keys", () => {
      const result = db.queryOne<{ foreign_keys: number }>(
        "PRAGMA foreign_keys"
      );
      expect(result?.foreign_keys).toBe(1);
    });

    it("should report correct path", () => {
      expect(db.path).toBe(testDbPath);
    });

    it("should report open status", () => {
      expect(db.isOpen).toBe(true);
    });
  });

  describe("query operations", () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          active INTEGER DEFAULT 1
        )
      `);
    });

    it("should execute SELECT queries with results", () => {
      db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
        "Alice",
        "alice@test.com",
      ]);
      db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
        "Bob",
        "bob@test.com",
      ]);

      interface User {
        id: number;
        name: string;
        email: string;
        active: number;
      }

      const users = db.query<User>("SELECT * FROM users ORDER BY name");

      expect(users.length).toBe(2);
      expect(users[0]?.name).toBe("Alice");
      expect(users[1]?.name).toBe("Bob");
    });

    it("should execute parameterized queries", () => {
      db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
        "Charlie",
        "charlie@test.com",
      ]);

      interface User {
        id: number;
        name: string;
      }

      const users = db.query<User>(
        "SELECT * FROM users WHERE name = ?",
        ["Charlie"]
      );

      expect(users.length).toBe(1);
      expect(users[0]?.name).toBe("Charlie");
    });

    it("should return single row with queryOne", () => {
      db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
        "Diana",
        "diana@test.com",
      ]);

      interface User {
        name: string;
        email: string;
      }

      const user = db.queryOne<User>(
        "SELECT name, email FROM users WHERE email = ?",
        ["diana@test.com"]
      );

      expect(user?.name).toBe("Diana");
    });

    it("should return null for non-existent row", () => {
      // Note: Bun's SQLite returns null, not undefined
      const result = db.queryOne("SELECT * FROM users WHERE id = ?", [999]);
      expect(result).toBeNull();
    });
  });

  describe("write operations", () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER DEFAULT 0
        )
      `);
    });

    it("should return affected rows count from run", () => {
      db.run("INSERT INTO items (name) VALUES (?)", ["Item 1"]);
      db.run("INSERT INTO items (name) VALUES (?)", ["Item 2"]);

      const changes = db.run("UPDATE items SET value = ?", [100]);

      expect(changes).toBe(2);
    });

    it("should return last insert rowid from insert", () => {
      const id1 = db.insert("INSERT INTO items (name) VALUES (?)", ["First"]);
      const id2 = db.insert("INSERT INTO items (name) VALUES (?)", ["Second"]);

      expect(id1).toBe(1);
      expect(id2).toBe(2);
    });

    it("should handle DELETE operations", () => {
      db.run("INSERT INTO items (name) VALUES (?)", ["ToDelete"]);
      db.run("INSERT INTO items (name) VALUES (?)", ["ToKeep"]);

      const deleted = db.run("DELETE FROM items WHERE name = ?", ["ToDelete"]);

      expect(deleted).toBe(1);

      interface Item {
        name: string;
      }
      const remaining = db.query<Item>("SELECT * FROM items");
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.name).toBe("ToKeep");
    });
  });

  describe("transactions", () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          balance INTEGER DEFAULT 0
        )
      `);
    });

    it("should commit successful transactions", () => {
      db.transaction(() => {
        db.run("INSERT INTO accounts (name, balance) VALUES (?, ?)", ["Account1", 100]);
        db.run("INSERT INTO accounts (name, balance) VALUES (?, ?)", ["Account2", 200]);
      });

      interface Account {
        name: string;
        balance: number;
      }

      const accounts = db.query<Account>("SELECT * FROM accounts");
      expect(accounts.length).toBe(2);
    });

    it("should rollback failed transactions", () => {
      try {
        db.transaction(() => {
          db.run("INSERT INTO accounts (name, balance) VALUES (?, ?)", ["Account1", 100]);
          throw new Error("Simulated failure");
        });
      } catch {
        // Expected
      }

      interface Account {
        name: string;
      }

      const accounts = db.query<Account>("SELECT * FROM accounts");
      expect(accounts.length).toBe(0);
    });

    it("should return value from transaction", () => {
      const result = db.transaction(() => {
        db.run("INSERT INTO accounts (name, balance) VALUES (?, ?)", ["Test", 500]);
        return { inserted: true };
      });

      expect(result.inserted).toBe(true);
    });
  });

  describe("tableExists", () => {
    it("should return true for existing table", () => {
      db.exec("CREATE TABLE test_table (id INTEGER)");
      expect(db.tableExists("test_table")).toBe(true);
    });

    it("should return false for non-existing table", () => {
      expect(db.tableExists("nonexistent")).toBe(false);
    });
  });

  describe("close", () => {
    it("should close the database connection", async () => {
      const testPath = "/tmp/close-test.db";
      const testDb = createDatabase(testPath);
      expect(testDb.isOpen).toBe(true);

      testDb.close();

      // After close, operations should fail
      expect(() => testDb.query("SELECT 1")).toThrow();

      // Cleanup
      try {
        await unlink(testPath);
        await unlink(`${testPath}-wal`);
        await unlink(`${testPath}-shm`);
      } catch {
        // Ignore
      }
    });
  });

  describe("createDatabase factory", () => {
    it("should create database with default configuration", async () => {
      const testPath = "/tmp/factory-test.db";
      const factoryDb = createDatabase(testPath);

      expect(factoryDb).toBeInstanceOf(DatabaseService);
      expect(factoryDb.isOpen).toBe(true);

      factoryDb.close();

      // Cleanup
      try {
        await unlink(testPath);
        await unlink(`${testPath}-wal`);
        await unlink(`${testPath}-shm`);
      } catch {
        // Ignore
      }
    });
  });
});
