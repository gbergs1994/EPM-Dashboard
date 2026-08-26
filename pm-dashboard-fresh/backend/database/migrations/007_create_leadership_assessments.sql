-- backend/db/migrations/create_leadership_assessments.sql

-- Create leadership assessments table
CREATE TABLE IF NOT EXISTS leadership_assessments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    assessment_type VARCHAR(50) NOT NULL DEFAULT 'leadership_diamond',
    responses JSONB NOT NULL,
    vision_score DECIMAL(3,2) CHECK (vision_score >= 0.0 AND vision_score <= 7.0),
    reality_score DECIMAL(3,2) CHECK (reality_score >= 0.0 AND reality_score <= 7.0),
    ethics_score DECIMAL(3,2) CHECK (ethics_score >= 0.0 AND ethics_score <= 7.0),
    courage_score DECIMAL(3,2) CHECK (courage_score >= 0.0 AND courage_score <= 7.0),
    overall_score DECIMAL(3,2) CHECK (overall_score >= 0.0 AND overall_score <= 7.0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_leadership_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_leadership_project 
        FOREIGN KEY (project_id) 
        REFERENCES projects(id) 
        ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_user_id 
    ON leadership_assessments(user_id);

CREATE INDEX IF NOT EXISTS idx_leadership_assessments_project_id 
    ON leadership_assessments(project_id);

CREATE INDEX IF NOT EXISTS idx_leadership_assessments_created_at 
    ON leadership_assessments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leadership_assessments_type 
    ON leadership_assessments(assessment_type);

-- Create index for JSONB responses for efficient querying
CREATE INDEX IF NOT EXISTS idx_leadership_assessments_responses 
    ON leadership_assessments USING GIN(responses);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leadership_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_leadership_assessments_updated_at ON leadership_assessments;

CREATE TRIGGER trigger_update_leadership_assessments_updated_at
    BEFORE UPDATE ON leadership_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_leadership_assessments_updated_at();

-- Create view for leadership assessment analytics
CREATE OR REPLACE VIEW leadership_assessment_analytics AS
SELECT 
    la.user_id,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    la.project_id,
    p.title as project_title,
    COUNT(la.id) as total_assessments,
    AVG(la.vision_score) as avg_vision_score,
    AVG(la.reality_score) as avg_reality_score,
    AVG(la.ethics_score) as avg_ethics_score,
    AVG(la.courage_score) as avg_courage_score,
    AVG(la.overall_score) as avg_overall_score,
    MIN(la.created_at) as first_assessment,
    MAX(la.created_at) as latest_assessment,
    DATE_PART('day', MAX(la.created_at) - MIN(la.created_at)) as assessment_span_days
FROM leadership_assessments la
JOIN users u ON la.user_id = u.id
LEFT JOIN projects p ON la.project_id = p.id
GROUP BY la.user_id, u.name, u.email, u.role, la.project_id, p.title;

-- Create view for project leadership analytics
CREATE OR REPLACE VIEW project_leadership_analytics AS
SELECT 
    p.id as project_id,
    p.title as project_title,
    p.description as project_description,
    COUNT(DISTINCT la.user_id) as team_members_assessed,
    COUNT(la.id) as total_assessments,
    AVG(la.vision_score) as team_avg_vision,
    AVG(la.reality_score) as team_avg_reality,
    AVG(la.ethics_score) as team_avg_ethics,
    AVG(la.courage_score) as team_avg_courage,
    AVG(la.overall_score) as team_avg_overall,
    MIN(la.created_at) as first_assessment,
    MAX(la.created_at) as latest_assessment
FROM projects p
LEFT JOIN leadership_assessments la ON p.id = la.project_id
GROUP BY p.id, p.title, p.description;

-- Insert sample assessment types if they don't exist
INSERT INTO assessment_types (name, description) VALUES 
('leadership_diamond', 'Leadership Diamond Assessment - Vision, Reality, Ethics, Courage')
ON CONFLICT (name) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON leadership_assessments TO your_app_user;
GRANT SELECT ON leadership_assessment_analytics TO your_app_user;
GRANT SELECT ON project_leadership_analytics TO your_app_user;
GRANT USAGE, SELECT ON SEQUENCE leadership_assessments_id_seq TO your_app_user;

-- Add comments for documentation
COMMENT ON TABLE leadership_assessments IS 'Stores Leadership Diamond assessment responses and calculated scores';
COMMENT ON COLUMN leadership_assessments.responses IS 'JSONB field containing structured assessment responses by dimension';
COMMENT ON COLUMN leadership_assessments.assessment_type IS 'Assessment type identifier (default: leadership_diamond)';
COMMENT ON VIEW leadership_assessment_analytics IS 'Aggregated view of leadership assessment data by user and project';
COMMENT ON VIEW project_leadership_analytics IS 'Aggregated view of leadership assessment data by project for team analytics';

-- Validate the table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leadership_assessments' 
ORDER BY ordinal_position;

-- Test data integrity constraints
DO $$
BEGIN
    -- Test score range constraints
    PERFORM 1 WHERE (
        SELECT COUNT(*) = 5 
        FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%leadership_assessments%'
        AND constraint_name LIKE '%score%'
    );
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Score range constraints may not be properly applied';
    ELSE
        RAISE NOTICE 'Score range constraints validated successfully';
    END IF;
END $$;

RAISE NOTICE 'Leadership assessments table and related objects created successfully!';