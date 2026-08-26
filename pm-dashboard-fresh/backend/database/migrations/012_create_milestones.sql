-- Migration: Create Milestones table for Project Earned Value Management
-- Date: 2026-05-19
-- Purpose: Add support for project milestones with individual Earned Value tracking

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    planned_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    actual_cost NUMERIC(12,2) DEFAULT 0,
    completion_percentage NUMERIC(5,2) DEFAULT 0, -- 0-100, percentage of milestone completion
    earned_value NUMERIC(12,2) DEFAULT 0,
    start_date DATE,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'planning', -- planning, in_progress, completed, on_hold
    order_index INTEGER DEFAULT 0, -- Display order among milestones
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_end_date ON milestones(end_date);
