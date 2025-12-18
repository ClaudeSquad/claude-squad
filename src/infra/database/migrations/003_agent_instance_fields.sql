-- Migration: 003_agent_instance_fields
-- Description: Add instance-related fields to agents table for runtime tracking
-- Note: The agents table now serves dual purpose - agent definitions and running instances
-- Created: 2025-12-18

-- Add session reference for running agent instances
ALTER TABLE agents ADD COLUMN session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL;

-- Add runtime status tracking
ALTER TABLE agents ADD COLUMN status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'waiting', 'paused', 'error', 'completed'));

-- Add worktree path for isolated working directory
ALTER TABLE agents ADD COLUMN worktree_path TEXT;

-- Add process ID for running agents
ALTER TABLE agents ADD COLUMN pid INTEGER;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
