/**
 * Test Database Fixtures
 *
 * Factory functions for creating test databases and seed data.
 * Uses SQLite in-memory databases for fast, isolated tests.
 */

import { Database } from "bun:sqlite";

/**
 * Test database wrapper with helper methods
 */
export interface TestDatabase {
  db: Database;
  close: () => void;
  reset: () => void;
  seed: (data: SeedData) => void;
}

/**
 * Seed data structure
 */
export interface SeedData {
  sessions?: SessionSeed[];
  features?: FeatureSeed[];
  agents?: AgentSeed[];
}

/**
 * Session seed data
 */
export interface SessionSeed {
  id: string;
  projectPath: string;
  startedAt?: Date;
  lastActiveAt?: Date;
}

/**
 * Feature seed data
 */
export interface FeatureSeed {
  id: string;
  title: string;
  description: string;
  status: string;
  workflow: string;
}

/**
 * Agent seed data
 */
export interface AgentSeed {
  id: string;
  name: string;
  type: "builtin" | "custom";
  description: string;
}

/**
 * Database schema (will be expanded in Phase 2)
 */
const SCHEMA = `
  -- Sessions table
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    started_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL
  );

  -- Features table
  CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    workflow TEXT NOT NULL,
    current_stage TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );

  -- Agents table (internal storage)
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('builtin', 'custom')),
    description TEXT NOT NULL,
    expertise TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('junior', 'senior', 'principal')),
    tools TEXT NOT NULL,
    skills TEXT NOT NULL,
    model TEXT NOT NULL CHECK (model IN ('sonnet', 'opus', 'haiku')),
    prompt TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Conversation history table
  CREATE TABLE IF NOT EXISTS conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  -- Command history table
  CREATE TABLE IF NOT EXISTS command_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    command TEXT NOT NULL,
    executed_at TEXT NOT NULL
  );

  -- Create indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_path);
  CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
  CREATE INDEX IF NOT EXISTS idx_conversation_session ON conversation_history(session_id);
`;

/**
 * Create a test database (in-memory by default)
 */
export function createTestDatabase(path: string = ":memory:"): TestDatabase {
  const db = new Database(path);

  // Enable WAL mode for better concurrent access (no effect on :memory:)
  db.exec("PRAGMA journal_mode = WAL");

  // Run schema migrations
  db.exec(SCHEMA);

  const testDb: TestDatabase = {
    db,

    close: () => {
      db.close();
    },

    reset: () => {
      // Clear all tables
      db.exec(`
        DELETE FROM command_history;
        DELETE FROM conversation_history;
        DELETE FROM features;
        DELETE FROM sessions;
        DELETE FROM agents;
      `);
    },

    seed: (data: SeedData) => {
      // Seed sessions
      if (data.sessions) {
        const insertSession = db.prepare(`
          INSERT INTO sessions (id, project_path, started_at, last_active_at)
          VALUES ($id, $projectPath, $startedAt, $lastActiveAt)
        `);

        for (const session of data.sessions) {
          insertSession.run({
            $id: session.id,
            $projectPath: session.projectPath,
            $startedAt: (session.startedAt ?? new Date()).toISOString(),
            $lastActiveAt: (session.lastActiveAt ?? new Date()).toISOString(),
          });
        }
      }

      // Seed features
      if (data.features) {
        const insertFeature = db.prepare(`
          INSERT INTO features (id, title, description, status, workflow, created_at, updated_at)
          VALUES ($id, $title, $description, $status, $workflow, $createdAt, $updatedAt)
        `);

        const now = new Date().toISOString();
        for (const feature of data.features) {
          insertFeature.run({
            $id: feature.id,
            $title: feature.title,
            $description: feature.description,
            $status: feature.status,
            $workflow: feature.workflow,
            $createdAt: now,
            $updatedAt: now,
          });
        }
      }

      // Seed agents
      if (data.agents) {
        const insertAgent = db.prepare(`
          INSERT INTO agents (id, name, type, description, expertise, level, tools, skills, model, prompt, enabled, created_at, updated_at)
          VALUES ($id, $name, $type, $description, '[]', 'senior', '[]', '[]', 'sonnet', '', 1, $createdAt, $updatedAt)
        `);

        const now = new Date().toISOString();
        for (const agent of data.agents) {
          insertAgent.run({
            $id: agent.id,
            $name: agent.name,
            $type: agent.type,
            $description: agent.description,
            $createdAt: now,
            $updatedAt: now,
          });
        }
      }
    },
  };

  return testDb;
}

/**
 * Create sample seed data for common test scenarios
 */
export const sampleData = {
  /**
   * Basic session with no features
   */
  basicSession(): SeedData {
    return {
      sessions: [
        {
          id: "test-session-1",
          projectPath: "/test/project",
        },
      ],
    };
  },

  /**
   * Session with features in different states
   */
  sessionWithFeatures(): SeedData {
    return {
      sessions: [
        {
          id: "test-session-1",
          projectPath: "/test/project",
        },
      ],
      features: [
        {
          id: "feature-1",
          title: "Add user authentication",
          description: "Implement login and registration",
          status: "running",
          workflow: "feature",
        },
        {
          id: "feature-2",
          title: "Fix navigation bug",
          description: "Menu not closing on mobile",
          status: "completed",
          workflow: "bugfix",
        },
        {
          id: "feature-3",
          title: "Optimize database queries",
          description: "Reduce query time for dashboard",
          status: "pending",
          workflow: "refactor",
        },
      ],
    };
  },

  /**
   * Session with custom agents
   */
  sessionWithAgents(): SeedData {
    return {
      sessions: [
        {
          id: "test-session-1",
          projectPath: "/test/project",
        },
      ],
      agents: [
        {
          id: "agent-architect",
          name: "architect",
          type: "builtin",
          description: "System architect for planning and design",
        },
        {
          id: "agent-backend",
          name: "backend-engineer",
          type: "builtin",
          description: "Backend development specialist",
        },
        {
          id: "agent-custom",
          name: "custom-agent",
          type: "custom",
          description: "Custom project-specific agent",
        },
      ],
    };
  },
};
