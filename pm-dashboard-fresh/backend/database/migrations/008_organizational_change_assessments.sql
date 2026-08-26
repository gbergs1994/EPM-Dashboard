-- backend/database/migrations/008_organizational_change_assessments.sql
-- Organizational Change Management Assessment System Database Migration

-- Create organizational_change_assessments table
CREATE TABLE IF NOT EXISTS organizational_change_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    assessment_type VARCHAR(50) DEFAULT 'organizational_change',
    
    -- Change Management scores (calculated from responses)
    vision_score DECIMAL(3,1) DEFAULT 0.0,
    alignment_score DECIMAL(3,1) DEFAULT 0.0,
    understanding_score DECIMAL(3,1) DEFAULT 0.0,
    enactment_score DECIMAL(3,1) DEFAULT 0.0,
    
    -- Raw responses as JSONB for flexibility
    responses JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_org_change_assessments_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_org_change_assessments_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        
    -- Score validation constraints
    CONSTRAINT check_vision_score 
        CHECK (vision_score >= 0.0 AND vision_score <= 7.0),
    CONSTRAINT check_alignment_score 
        CHECK (alignment_score >= 0.0 AND alignment_score <= 7.0),
    CONSTRAINT check_understanding_score 
        CHECK (understanding_score >= 0.0 AND understanding_score <= 7.0),
    CONSTRAINT check_enactment_score 
        CHECK (enactment_score >= 0.0 AND enactment_score <= 7.0),
        
    -- Assessment type constraint
    CONSTRAINT check_org_change_assessment_type 
        CHECK (assessment_type IN ('organizational_change', 'custom'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_org_change_assessments_user_id ON organizational_change_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_org_change_assessments_project_id ON organizational_change_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_org_change_assessments_created_at ON organizational_change_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_org_change_assessments_type ON organizational_change_assessments(assessment_type);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_org_change_assessments_updated_at ON organizational_change_assessments;
CREATE TRIGGER update_org_change_assessments_updated_at
    BEFORE UPDATE ON organizational_change_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create analytics view for organizational change assessments
CREATE OR REPLACE VIEW organizational_change_analytics AS
SELECT 
    oca.user_id,
    oca.project_id,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    p.name as project_name,
    oca.vision_score,
    oca.alignment_score,
    oca.understanding_score,
    oca.enactment_score,
    (oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0 as overall_score,
    oca.responses,
    oca.created_at,
    oca.updated_at,
    ROW_NUMBER() OVER (PARTITION BY oca.user_id, oca.project_id ORDER BY oca.created_at DESC) as assessment_rank
FROM organizational_change_assessments oca
LEFT JOIN users u ON oca.user_id = u.id
LEFT JOIN projects p ON oca.project_id = p.id
ORDER BY oca.created_at DESC;

-- Create project-level analytics view
CREATE OR REPLACE VIEW project_organizational_change_analytics AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(DISTINCT oca.user_id) as total_participants,
    COUNT(oca.id) as total_assessments,
    ROUND(AVG(oca.vision_score), 2) as avg_vision_score,
    ROUND(AVG(oca.alignment_score), 2) as avg_alignment_score,
    ROUND(AVG(oca.understanding_score), 2) as avg_understanding_score,
    ROUND(AVG(oca.enactment_score), 2) as avg_enactment_score,
    ROUND(AVG((oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0), 2) as avg_overall_score,
    MIN(oca.created_at) as first_assessment_date,
    MAX(oca.created_at) as latest_assessment_date
FROM projects p
LEFT JOIN organizational_change_assessments oca ON p.id = oca.project_id
WHERE oca.id IS NOT NULL
GROUP BY p.id, p.name
ORDER BY avg_overall_score DESC NULLS LAST;

-- Insert assessment type if it doesn't exist
INSERT INTO assessment_types (name, description) VALUES 
('organizational_change', 'Organizational Change Management Assessment - Vision, Alignment, Understanding, Enactment')
ON CONFLICT (name) DO NOTHING;

-- Sample data for testing (commented out for production)
/*
INSERT INTO organizational_change_assessments (user_id, project_id, assessment_type, vision_score, alignment_score, understanding_score, enactment_score, responses)
SELECT 
    u.id,
    p.id,
    'organizational_change',
    4.5 + (random() * 2.5),  -- Vision score between 4.5-7.0
    4.0 + (random() * 2.0),  -- Alignment score between 4.0-6.0  
    3.5 + (random() * 2.5),  -- Understanding score between 3.5-6.0
    4.0 + (random() * 2.0),  -- Enactment score between 4.0-6.0
    '{"vision": {"clarity_compelling": 6, "communication_effectiveness": 5, "organizational_alignment": 6, "inspiring_motivating": 5}, "alignment": {"process_support": 4, "structure_enablement": 5, "resource_allocation": 4, "communication_systems": 5}, "understanding": {"stakeholder_needs": 5, "resistance_management": 4, "cultural_factors": 5, "team_dynamics": 6}, "enactment": {"action_consistency": 5, "adaptive_approach": 6, "progress_measurement": 4, "feedback_incorporation": 5}}'::JSONB
FROM users u
CROSS JOIN projects p
WHERE u.role IN ('Team Member', 'Manager', 'Project Manager')
AND p.id <= 3  -- Limit to first 3 projects
LIMIT 8;
*/

-- Add comments for documentation
COMMENT ON TABLE organizational_change_assessments IS 'Stores organizational change management assessments with vision, alignment, understanding, and enactment scores';
COMMENT ON COLUMN organizational_change_assessments.vision_score IS 'Vision dimension score (0.0-7.0)';
COMMENT ON COLUMN organizational_change_assessments.alignment_score IS 'Alignment dimension score (0.0-7.0)';
COMMENT ON COLUMN organizational_change_assessments.understanding_score IS 'Understanding dimension score (0.0-7.0)';
COMMENT ON COLUMN organizational_change_assessments.enactment_score IS 'Enactment dimension score (0.0-7.0)';
COMMENT ON COLUMN organizational_change_assessments.responses IS 'JSONB containing all question responses';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organizational_change_assessments TO pm_dashboard_app;
GRANT USAGE ON SEQUENCE organizational_change_assessments_id_seq TO pm_dashboard_app;
GRANT SELECT ON organizational_change_analytics TO pm_dashboard_app;
GRANT SELECT ON project_organizational_change_analytics TO pm_dashboard_app;

-- Verify the migration
SELECT 'Organizational change assessments migration completed successfully' as status;

-- Display table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'organizational_change_assessments'
ORDER BY ordinal_position;