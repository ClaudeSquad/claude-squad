-- Migration: 002_feature_extended_fields
-- Description: Add missing fields to features table for complete entity support
-- Created: 2025-12-18

-- Add missing columns to features table
ALTER TABLE features ADD COLUMN external_url TEXT;
ALTER TABLE features ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
ALTER TABLE features ADD COLUMN estimate REAL;
ALTER TABLE features ADD COLUMN assignees TEXT NOT NULL DEFAULT '[]'; -- JSON array
ALTER TABLE features ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'; -- JSON array

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_features_priority ON features(priority);
