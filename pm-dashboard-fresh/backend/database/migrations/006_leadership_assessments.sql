-- backend/database/migrations/004_leadership_assessments.sql
-- Leadership Assessment System Database Migration

-- Create leadership_assessments table
CREATE TABLE IF NOT EXISTS leadership_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    assessment_type VARCHAR(50) DEFAULT 'leadership_diamond',
    
    -- Diamond scores (calculated from responses)
    vision_score DECIMAL(3,1) DEFAULT 0.0,
    reality_score DECIMAL(3,1) DEFAULT 0.0,
    ethics_score DECIMAL(3,1) DEFAULT 0.0,
    courage_score DECIMAL(3,1) DEFAULT 0.0,
    
    -- Raw responses as JSONB for flexibility
    responses JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_leadership_assessments_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_leadership_assessments_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        
    -- Score validation constraints
    CONSTRAINT check_vision_score 
        CHECK (vision_score >= 0.0 AND vision_score <= 7.0),
    CONSTRAINT check_reality_score 
        CHECK (reality_score >= 0.0 AND reality_score <= 7.0),
    CONSTRAINT check_ethics_score 
        CHECK (ethics_score >= 0.0 AND ethics_score <= 7.0),
    CONSTRAINT check_courage_score 
        CHECK (courage_score >= 0.0 AND courage_score <= 7.0),
        
    -- Assessment type constraint
    CONSTRAINT check_assessment_type 
        CHECK (assessment_type IN ('leadership_diamond', 'value', 'custom'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_user_id 
    ON leadership_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_project_id 
    ON leadership_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_created_at 
    ON leadership_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_type 
    ON leadership_assessments(assessment_type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_user_project 
    ON leadership_assessments(user_id, project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leadership_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_leadership_assessments_updated_at ON leadership_assessments;
CREATE TRIGGER trigger_leadership_assessments_updated_at
    BEFORE UPDATE ON leadership_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_leadership_assessments_updated_at();

-- View for leadership assessment analytics
CREATE OR REPLACE VIEW leadership_assessment_analytics AS
SELECT 
    la.user_id,
    u.name as user_name,
    u.role as user_role,
    COUNT(*) as total_assessments,
    AVG(la.vision_score) as avg_vision,
    AVG(la.reality_score) as avg_reality,
    AVG(la.ethics_score) as avg_ethics,
    AVG(la.courage_score) as avg_courage,
    AVG((la.vision_score + la.reality_score + la.ethics_score + la.courage_score) / 4.0) as avg_overall,
    MAX(la.created_at) as latest_assessment,
    MIN(la.created_at) as first_assessment,
    COUNT(DISTINCT la.project_id) as projects_assessed
FROM leadership_assessments la
JOIN users u ON la.user_id = u.id
GROUP BY la.user_id, u.name, u.role;

-- View for project-based leadership analytics
CREATE OR REPLACE VIEW project_leadership_analytics AS
SELECT 
    la.project_id,
    p.title as project_title,
    p.status as project_status,
    COUNT(*) as total_assessments,
    COUNT(DISTINCT la.user_id) as unique_assessors,
    AVG(la.vision_score) as avg_vision,
    AVG(la.reality_score) as avg_reality,
    AVG(la.ethics_score) as avg_ethics,
    AVG(la.courage_score) as avg_courage,
    AVG((la.vision_score + la.reality_score + la.ethics_score + la.courage_score) / 4.0) as avg_overall,
    MAX(la.created_at) as latest_assessment
FROM leadership_assessments la
JOIN projects p ON la.project_id = p.id
WHERE la.project_id IS NOT NULL
GROUP BY la.project_id, p.title, p.status;

-- Insert sample data for testing (optional)
-- Note: Uncomment these if you want sample data

/*
-- Sample leadership assessments for testing
INSERT INTO leadership_assessments (
    user_id, 
    project_id, 
    assessment_type,
    vision_score,
    reality_score,
    ethics_score,
    courage_score,
    responses
) 
SELECT 
    u.id,
    p.id,
    'leadership_diamond',
    (RANDOM() * 7)::DECIMAL(3,1),
    (RANDOM() * 7)::DECIMAL(3,1),
    (RANDOM() * 7)::DECIMAL(3,1),
    (RANDOM() * 7)::DECIMAL(3,1),
    '{"vision_clarity": 5, "vision_communication": 6, "vision_alignment": 4, "vision_inspiration": 5, "reality_assessment": 6, "reality_resource_management": 5, "reality_milestone_tracking": 4, "reality_problem_solving": 6, "ethics_fairness": 7, "ethics_transparency": 6, "ethics_integrity": 7, "ethics_responsibility": 6, "courage_difficult_decisions": 4, "courage_risk_taking": 5, "courage_innovation": 6, "courage_persistence": 5}'::JSONB
FROM users u
CROSS JOIN projects p
WHERE u.role IN ('Team Member', 'Manager', 'Project Manager')
AND p.id <= 3  -- Limit to first 3 projects
LIMIT 10;
*/

-- Add comments for documentation
COMMENT ON TABLE leadership_assessments IS 'Stores leadership diamond assessments with vision, reality, ethics, and courage scores';
COMMENT ON COLUMN leadership_assessments.vision_score IS 'Leadership vision score (0.0-7.0)';
COMMENT ON COLUMN leadership_assessments.reality_score IS 'Leadership reality score (0.0-7.0)';
COMMENT ON COLUMN leadership_assessments.ethics_score IS 'Leadership ethics score (0.0-7.0)';
COMMENT ON COLUMN leadership_assessments.courage_score IS 'Leadership courage score (0.0-7.0)';
COMMENT ON COLUMN leadership_assessments.responses IS 'JSONB containing all question responses';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON leadership_assessments TO pm_dashboard_app;
GRANT USAGE ON SEQUENCE leadership_assessments_id_seq TO pm_dashboard_app;
GRANT SELECT ON leadership_assessment_analytics TO pm_dashboard_app;
GRANT SELECT ON project_leadership_analytics TO pm_dashboard_app;

-- Verify the migration
SELECT 'Leadership assessments migration completed successfully' as status;

-- Display table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'leadership_assessments'
ORDER BY ordinal_position;