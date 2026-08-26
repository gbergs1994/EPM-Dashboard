-- Fixed Team Management Migration
-- This version fixes all the issues in the previous migration

-- First, add missing columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Add foreign key constraint for created_by (safely)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_created_by_fkey'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END $$;

-- Update user roles to match expected values
UPDATE users SET role = 'Team Member' WHERE role IS NULL OR role = '';
UPDATE users SET role = 'Project Manager' WHERE role = 'Project Manager';

-- Team Members table (simplified without problematic constraints)
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Simple unique constraint
    UNIQUE(user_id)
);

-- Project ownership tracking
CREATE TABLE IF NOT EXISTS project_ownership (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ownership_type VARCHAR(20) DEFAULT 'creator',
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    
    -- One project can have one primary owner/manager
    UNIQUE(project_id, ownership_type)
);

-- Add check constraints after table creation (safer)
DO $$
BEGIN
    -- Add status check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'team_members_status_check'
    ) THEN
        ALTER TABLE team_members ADD CONSTRAINT team_members_status_check 
        CHECK (status IN ('active', 'inactive'));
    END IF;
    
    -- Add ownership type check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'project_ownership_type_check'
    ) THEN
        ALTER TABLE project_ownership ADD CONSTRAINT project_ownership_type_check 
        CHECK (ownership_type IN ('creator', 'assigned_manager'));
    END IF;
    
    -- Add progress check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'projects_progress_check'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_progress_check 
        CHECK (progress >= 0 AND progress <= 100);
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_project_manager_id ON team_members(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_project_ownership_project_id ON project_ownership(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ownership_user_id ON project_ownership(user_id);

-- Function to automatically create project ownership when project is created
CREATE OR REPLACE FUNCTION create_project_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create ownership if created_by is not null
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO project_ownership (project_id, user_id, ownership_type, assigned_date)
        VALUES (NEW.id, NEW.created_by, 'creator', CURRENT_TIMESTAMP)
        ON CONFLICT (project_id, ownership_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_create_project_ownership ON projects;
CREATE TRIGGER trigger_create_project_ownership
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_ownership();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for team_members
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing projects to have a created_by if they don't
UPDATE projects 
SET created_by = (
    SELECT id FROM users 
    WHERE role IN ('Project Manager', 'Team Member') 
    ORDER BY id LIMIT 1
)
WHERE created_by IS NULL;

-- Create views for easy querying (fixed column references)
CREATE OR REPLACE VIEW team_overview AS
SELECT 
    tm.id as team_assignment_id,
    exec.id as project_manager_id,
    exec.name as project_manager_name,
    exec.email as executive_email,
    member.id as member_id,
    member.name as member_name,
    member.email as member_email,
    member.role as member_role,
    tm.added_date,
    tm.status,
    tm.notes,
    COUNT(DISTINCT ptm.project_id) as active_projects,
    COUNT(DISTINCT cdg.id) as career_goals
FROM team_members tm
JOIN users exec ON tm.project_manager_id = exec.id
JOIN users member ON tm.user_id = member.id
LEFT JOIN project_team_members ptm ON member.id = ptm.user_id
LEFT JOIN career_development_goals cdg ON member.id = cdg.user_id AND cdg.status = 'active'
GROUP BY tm.id, exec.id, exec.name, exec.email, member.id, member.name, member.email, member.role, tm.added_date, tm.status, tm.notes;

-- Project management overview (fixed to use existing columns)
CREATE OR REPLACE VIEW project_management_overview AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    p.priority,
    p.deadline,
    owner.id as manager_id,
    owner.name as manager_name,
    owner.email as manager_email,
    po.ownership_type,
    COUNT(DISTINCT ptm.user_id) as team_size,
    COALESCE(p.progress, 0) as project_progress
FROM projects p
LEFT JOIN project_ownership po ON p.id = po.project_id
LEFT JOIN users owner ON po.user_id = owner.id
LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
GROUP BY p.id, p.name, p.status, p.priority, p.deadline, owner.id, owner.name, owner.email, po.ownership_type, p.progress;

-- Insert some sample data (only if tables are empty and we have users)
DO $$
BEGIN
    -- Only insert if we have users and no team members exist
    IF EXISTS (SELECT 1 FROM users WHERE role = 'Project Manager' LIMIT 1) 
       AND NOT EXISTS (SELECT 1 FROM team_members LIMIT 1) THEN
        
        -- Add first few team members to first project manager
        INSERT INTO team_members (user_id, project_manager_id, added_by, notes)
        SELECT 
            u1.id as user_id,
            u2.id as project_manager_id,
            u2.id as added_by,
            'Initial team setup'
        FROM users u1, users u2
        WHERE u1.role = 'Team Member' 
        AND u2.role = 'Project Manager'
        AND u1.id != u2.id
        LIMIT 3
        ON CONFLICT (user_id) DO NOTHING;
        
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Team management migration completed successfully!';
    RAISE NOTICE 'Tables created: team_members, project_ownership';
    RAISE NOTICE 'Views created: team_overview, project_management_overview';
END $$;