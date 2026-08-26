-- backend/database/migrations/003_executive_team_features.sql
-- Enhanced RBAC with Project Manager Team Management

-- Add project_manager_id to users table for team hierarchy
ALTER TABLE users 
ADD COLUMN project_manager_id INTEGER,
ADD CONSTRAINT fk_users_executive_leader 
  FOREIGN KEY (project_manager_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Create index for faster lookups of team members under project managers
CREATE INDEX idx_users_project_manager_id ON users(project_manager_id);

-- Add Project Manager Oversight role to project_team table
ALTER TABLE project_team 
DROP CONSTRAINT IF EXISTS check_role_valid;

ALTER TABLE project_team 
ADD CONSTRAINT check_role_valid 
CHECK (role IN (
  'Project Manager', 
  'Team Member', 
  'Reviewer', 
  'Stakeholder', 
  'Project Manager Oversight'
));

-- Create function to auto-assign project manager to new projects
CREATE OR REPLACE FUNCTION auto_assign_executive_to_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the project creator has an project manager
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.created_by 
    AND project_manager_id IS NOT NULL
  ) THEN
    -- Insert project manager into project team with Project Manager Oversight role
    INSERT INTO project_team (project_id, user_id, role, contribution_score, joined_at)
    SELECT 
      NEW.id,
      u.project_manager_id,
      'Project Manager Oversight',
      0,
      NOW()
    FROM users u
    WHERE u.id = NEW.created_by
    AND u.project_manager_id IS NOT NULL
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign project managers to new projects
DROP TRIGGER IF EXISTS trigger_auto_assign_executive ON projects;
CREATE TRIGGER trigger_auto_assign_executive
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_executive_to_project();

-- Create function to handle team member assignment changes
CREATE OR REPLACE FUNCTION handle_team_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If project_manager_id is being set (member being assigned)
  IF OLD.project_manager_id IS NULL AND NEW.project_manager_id IS NOT NULL THEN
    -- Add project manager to all existing projects created by this user
    INSERT INTO project_team (project_id, user_id, role, contribution_score, joined_at)
    SELECT 
      p.id,
      NEW.project_manager_id,
      'Project Manager Oversight',
      0,
      NOW()
    FROM projects p
    WHERE p.created_by = NEW.id
    ON CONFLICT (project_id, user_id) DO NOTHING;
    
  -- If project_manager_id is being removed (member being unassigned)
  ELSIF OLD.project_manager_id IS NOT NULL AND NEW.project_manager_id IS NULL THEN
    -- Remove project manager from projects they were auto-assigned to
    DELETE FROM project_team 
    WHERE user_id = OLD.project_manager_id
    AND role = 'Project Manager Oversight'
    AND project_id IN (
      SELECT id FROM projects WHERE created_by = NEW.id
    );
    
  -- If project_manager_id is being changed (member reassigned)
  ELSIF OLD.project_manager_id IS NOT NULL AND NEW.project_manager_id IS NOT NULL 
    AND OLD.project_manager_id != NEW.project_manager_id THEN
    
    -- Remove old project manager
    DELETE FROM project_team 
    WHERE user_id = OLD.project_manager_id
    AND role = 'Project Manager Oversight'
    AND project_id IN (
      SELECT id FROM projects WHERE created_by = NEW.id
    );
    
    -- Add new project manager
    INSERT INTO project_team (project_id, user_id, role, contribution_score, joined_at)
    SELECT 
      p.id,
      NEW.project_manager_id,
      'Project Manager Oversight',
      0,
      NOW()
    FROM projects p
    WHERE p.created_by = NEW.id
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team assignment changes
DROP TRIGGER IF EXISTS trigger_team_assignment_change ON users;
CREATE TRIGGER trigger_team_assignment_change
  AFTER UPDATE OF project_manager_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_team_assignment_change();

-- Create view for project manager team analytics
CREATE OR REPLACE VIEW executive_team_analytics AS
SELECT 
  el.id as project_manager_id,
  el.name as project_manager_name,
  COUNT(DISTINCT tm.id) as team_size,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
  COALESCE(AVG(
    (COALESCE(p.pm_progress, 0) + 
     COALESCE(p.leadership_progress, 0) + 
     COALESCE(p.change_mgmt_progress, 0) + 
     COALESCE(p.career_dev_progress, 0)) / 4.0
  ), 0) as avg_progress,
  COUNT(DISTINCT CASE 
    WHEN p.updated_at >= NOW() - INTERVAL '30 days' THEN p.id 
  END) as recent_activity_count
FROM users el
LEFT JOIN users tm ON tm.project_manager_id = el.id
LEFT JOIN projects p ON p.created_by = tm.id
WHERE el.role = 'Project Manager'
GROUP BY el.id, el.name;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_project_team_role ON project_team(role);

-- Insert sample data for testing (optional)
-- Note: Uncomment these if you want sample data

/*
-- Update existing users to have some team relationships
UPDATE users SET project_manager_id = (
  SELECT id FROM users WHERE role = 'Project Manager' LIMIT 1
) WHERE role IN ('Team Member', 'Manager') AND id % 2 = 0;

-- Add some sample projects if none exist
INSERT INTO projects (title, description, priority, status, created_by, pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress)
SELECT 
  'Sample Project ' || generate_series,
  'This is a sample project for testing project manager oversight features',
  CASE (generate_series % 3) 
    WHEN 0 THEN 'low'
    WHEN 1 THEN 'medium'
    ELSE 'high'
  END,
  CASE (generate_series % 4)
    WHEN 0 THEN 'planning'
    WHEN 1 THEN 'active'
    WHEN 2 THEN 'on_hold'
    ELSE 'completed'
  END,
  (SELECT id FROM users WHERE role IN ('Team Member', 'Manager') ORDER BY RANDOM() LIMIT 1),
  (RANDOM() * 7)::INTEGER + 1,
  (RANDOM() * 7)::INTEGER + 1,
  (RANDOM() * 7)::INTEGER + 1,
  (RANDOM() * 7)::INTEGER + 1
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM projects LIMIT 1);
*/

-- Add comments for documentation
COMMENT ON COLUMN users.project_manager_id IS 'References the project manager responsible for this team member';
COMMENT ON FUNCTION auto_assign_executive_to_project() IS 'Automatically assigns project managers to projects created by their team members';
COMMENT ON FUNCTION handle_team_assignment_change() IS 'Handles project assignments when team members are assigned/reassigned to project managers';
COMMENT ON VIEW executive_team_analytics IS 'Provides analytics for project managers about their teams and projects';

-- Verify the migration
SELECT 'Project Manager team features migration completed successfully' as status;

-- Add project_manager_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS project_manager_id INTEGER,
ADD CONSTRAINT IF NOT EXISTS fk_users_executive_leader 
  FOREIGN KEY (project_manager_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_project_manager_id ON users(project_manager_id);