-- Migration: 001_initial_schema
-- Description: Initial database schema for Claude Squad
-- Created: 2025-12-18

-- ============================================================================
-- Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_path TEXT NOT NULL,
    feature_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived', 'crashed')),
    agent_count INTEGER NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    total_tokens_input INTEGER NOT NULL DEFAULT 0,
    total_tokens_output INTEGER NOT NULL DEFAULT 0,
    config TEXT, -- JSON
    error_message TEXT,
    error_stack TEXT,
    started_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ============================================================================
-- Conversation History Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_session ON conversation_history(session_id);

-- ============================================================================
-- Command History Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS command_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    command TEXT NOT NULL,
    executed_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_command_session ON command_history(session_id);

-- ============================================================================
-- Features Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    external_id TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'testing', 'completed', 'blocked', 'cancelled')),
    workflow_id TEXT NOT NULL,
    session_id TEXT,
    current_stage TEXT,
    branch_name TEXT NOT NULL,
    requirements TEXT NOT NULL DEFAULT '[]', -- JSON array
    acceptance_criteria TEXT NOT NULL DEFAULT '[]', -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_features_workflow ON features(workflow_id);
CREATE INDEX IF NOT EXISTS idx_features_session ON features(session_id);

-- ============================================================================
-- Agent States Table (tracks agent state per feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'waiting')),
    progress INTEGER DEFAULT 0,
    current_task TEXT,
    worktree TEXT,
    pid INTEGER,
    started_at TEXT,
    completed_at TEXT,
    error TEXT,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
    UNIQUE(feature_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_states_feature ON agent_states(feature_id);
CREATE INDEX IF NOT EXISTS idx_agent_states_agent ON agent_states(agent_id);

-- ============================================================================
-- Worktrees Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS worktrees (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL,
    feature_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'removed')),
    base_branch TEXT,
    last_commit TEXT,
    is_dirty INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worktrees_feature ON worktrees(feature_id);
CREATE INDEX IF NOT EXISTS idx_worktrees_agent ON worktrees(agent_id);
CREATE INDEX IF NOT EXISTS idx_worktrees_status ON worktrees(status);

-- ============================================================================
-- Agents Table (agent definitions, not instances)
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('builtin', 'custom')),
    role TEXT NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL DEFAULT '',
    expertise TEXT NOT NULL DEFAULT '[]', -- JSON array
    tools TEXT NOT NULL DEFAULT '[]', -- JSON array
    skills TEXT NOT NULL DEFAULT '[]', -- JSON array of skill IDs
    model TEXT NOT NULL DEFAULT 'sonnet' CHECK (model IN ('sonnet', 'opus', 'haiku')),
    config TEXT NOT NULL DEFAULT '{}', -- JSON
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);

-- ============================================================================
-- Skills Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('builtin', 'custom', 'imported')),
    allowed_tools TEXT, -- JSON array
    tags TEXT NOT NULL DEFAULT '[]', -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);

-- ============================================================================
-- Workflows Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('builtin', 'custom')),
    description TEXT NOT NULL,
    stages TEXT NOT NULL DEFAULT '[]', -- JSON array of Stage objects
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(type);
CREATE INDEX IF NOT EXISTS idx_workflows_default ON workflows(is_default);

-- ============================================================================
-- Projects Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    initialized INTEGER NOT NULL DEFAULT 0,
    tech_stack TEXT, -- JSON
    default_workflow TEXT DEFAULT 'feature',
    settings TEXT, -- JSON
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ============================================================================
-- Integrations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('github', 'linear', 'jira', 'slack', 'discord', 'email')),
    status TEXT NOT NULL DEFAULT 'untested' CHECK (status IN ('healthy', 'unhealthy', 'untested')),
    enabled INTEGER NOT NULL DEFAULT 1,
    config TEXT, -- JSON (non-sensitive only)
    configured_at TEXT,
    last_tested_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_path) REFERENCES projects(path) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_integrations_project ON integrations(project_path);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);

-- ============================================================================
-- Handoffs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY,
    from_agent_id TEXT,
    to_agent_id TEXT,
    feature_id TEXT NOT NULL,
    stage_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('architecture', 'implementation', 'review_feedback', 'test_plan', 'deployment')),
    content TEXT NOT NULL, -- JSON HandoffContent
    file_path TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handoffs_feature ON handoffs(feature_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_from_agent ON handoffs(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_to_agent ON handoffs(to_agent_id);

-- ============================================================================
-- Migrations Table (tracks applied migrations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
);
