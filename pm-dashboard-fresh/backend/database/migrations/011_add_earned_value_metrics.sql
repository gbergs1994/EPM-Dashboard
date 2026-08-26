-- Migration: Add Earned Value Management (EVM) metrics to projects table
-- Date: 2026-04-26

ALTER TABLE projects ADD COLUMN IF NOT EXISTS planned_value NUMERIC(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS earned_value NUMERIC(12,2) DEFAULT 0;
