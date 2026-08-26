-- Migration: Add created_by column to projects table
-- Date: 2026-03-04

-- Add created_by column to projects table
ALTER TABLE projects ADD COLUMN created_by INTEGER REFERENCES users(id);

-- Update existing projects to have a default creator (first user or admin)
UPDATE projects SET created_by = (SELECT id FROM users WHERE role = 'Project Manager' LIMIT 1)
WHERE created_by IS NULL;

-- If no project manager exists, use the first user
UPDATE projects SET created_by = (SELECT id FROM users LIMIT 1)
WHERE created_by IS NULL;