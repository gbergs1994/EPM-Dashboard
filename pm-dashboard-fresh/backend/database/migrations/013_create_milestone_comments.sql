-- Migration: Create milestone_comments table for save-history notes on milestone updates

CREATE TABLE IF NOT EXISTS milestone_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    completion_percentage NUMERIC(5,2),
    actual_cost NUMERIC(12,2),
    earned_value NUMERIC(12,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id ON milestone_comments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_project_id ON milestone_comments(project_id);
