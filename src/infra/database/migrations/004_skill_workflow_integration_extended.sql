-- Migration: 004_skill_workflow_integration_extended
-- Description: Add missing fields to skills, workflows, and integrations tables
-- Created: 2025-12-18

-- ============================================================================
-- Skills Table Extensions
-- ============================================================================
ALTER TABLE skills ADD COLUMN author TEXT;
ALTER TABLE skills ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active);

-- ============================================================================
-- Workflows Table Extensions
-- ============================================================================
ALTER TABLE workflows ADD COLUMN is_builtin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('builtin', 'custom', 'imported'));
ALTER TABLE workflows ADD COLUMN version TEXT NOT NULL DEFAULT '1.0.0';
ALTER TABLE workflows ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'; -- JSON array
ALTER TABLE workflows ADD COLUMN estimated_duration INTEGER;

CREATE INDEX IF NOT EXISTS idx_workflows_source ON workflows(source);
CREATE INDEX IF NOT EXISTS idx_workflows_builtin ON workflows(is_builtin);

-- ============================================================================
-- Integrations Table Extensions
-- ============================================================================
ALTER TABLE integrations ADD COLUMN last_error TEXT;
ALTER TABLE integrations ADD COLUMN metadata TEXT; -- JSON
