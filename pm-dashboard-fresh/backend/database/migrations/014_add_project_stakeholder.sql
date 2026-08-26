-- Add beneficiary/stakeholder field for project intent
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS stakeholder TEXT;