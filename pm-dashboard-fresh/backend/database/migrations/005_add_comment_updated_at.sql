-- Migration: Add updated_at column to project_comments table
-- This enables proper tracking of comment edits

-- Add updated_at column if it doesn't exist
ALTER TABLE project_comments 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_comments_updated_at ON project_comments;
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON project_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_comment_updated_at();

-- Set updated_at for existing records to match created_at
UPDATE project_comments 
SET updated_at = created_at 
WHERE updated_at IS NULL;