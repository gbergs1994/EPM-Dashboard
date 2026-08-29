-- Project Management Database Schema (SQLite version)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT,
    avatar TEXT,
    project_manager_id INTEGER,
    current_workload INTEGER DEFAULT 0 CHECK(current_workload >= 0 AND current_workload <= 100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    stakeholder TEXT,
    status TEXT DEFAULT 'planning',
    priority TEXT DEFAULT 'medium',
    deadline DATE,
    created_by INTEGER REFERENCES users(id),
    last_update TEXT DEFAULT 'Just now',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Progress tracking (0-7 scale)
    pm_progress INTEGER DEFAULT 0,
    leadership_progress INTEGER DEFAULT 0,
    change_mgmt_progress INTEGER DEFAULT 0,
    career_dev_progress INTEGER DEFAULT 0,

    -- Earned Value Management (EVM) core metrics
    planned_value NUMERIC(12,2) DEFAULT 0,
    actual_cost NUMERIC(12,2) DEFAULT 0,
    earned_value NUMERIC(12,2) DEFAULT 0
);

-- Project milestones (phase-level EVM tracking)
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    planned_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    actual_cost NUMERIC(12,2) DEFAULT 0,
    completion_percentage NUMERIC(5,2) DEFAULT 0,
    earned_value NUMERIC(12,2) DEFAULT 0,
    start_date DATE,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'planning',
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_end_date ON milestones(end_date);

-- Milestone update comments history
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

-- Project team members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_date DATE DEFAULT CURRENT_DATE,
    role_in_project TEXT,
    contribution_percentage INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    skills TEXT, -- JSON array of skills
    status TEXT DEFAULT 'active',
    UNIQUE(project_id, user_id)
);

-- Team members (simpler copy of migration)
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'active',
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_manager_id, user_id)
);

-- PM-to-team-member assignments (used by /api/team routes)
CREATE TABLE IF NOT EXISTS team_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_manager_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    notes TEXT,
    UNIQUE(project_manager_id, team_member_id)
);

-- Project ownership tracking
CREATE TABLE IF NOT EXISTS project_ownership (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ownership_type TEXT DEFAULT 'creator',
    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(project_id, ownership_type)
);

-- Project history/activity log
CREATE TABLE IF NOT EXISTS project_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'created', 'team_change', 'status_change', etc.
    details TEXT, -- Store flexible details about the action
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project feedback (Likert scale responses)
CREATE TABLE IF NOT EXISTS project_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),

    -- Project Management feedback (1-7 scale)
    pm_vision INTEGER,
    pm_time INTEGER,
    pm_quality INTEGER,
    pm_cost INTEGER,

    -- Leadership feedback (1-7 scale)
    leadership_vision INTEGER,
    leadership_reality INTEGER,
    leadership_ethics INTEGER,
    leadership_courage INTEGER,

    -- Change Management feedback (1-7 scale)
    change_mgmt_alignment INTEGER,
    change_mgmt_understand INTEGER,
    change_mgmt_enact INTEGER,

    -- Career Development feedback (1-7 scale)
    career_dev_know_yourself INTEGER,
    career_dev_know_market INTEGER,
    career_dev_tell_story INTEGER,

    -- Calculated averages for quick access
    pm_average REAL,
    leadership_average REAL,
    change_mgmt_average REAL,
    career_dev_average REAL,
    overall_average REAL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id) -- One feedback per user per project
);

-- Project comments
CREATE TABLE IF NOT EXISTS project_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment', -- 'comment', 'system'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User account enhancement tables (from migrations)
CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    activity_type TEXT,
    description TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    session_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    event_type TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    preferences TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leadership assessments (diamond) table
CREATE TABLE IF NOT EXISTS leadership_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    assessment_type TEXT DEFAULT 'leadership_diamond',
    vision_score REAL DEFAULT 0.0,
    reality_score REAL DEFAULT 0.0,
    ethics_score REAL DEFAULT 0.0,
    courage_score REAL DEFAULT 0.0,
    responses TEXT DEFAULT '{}',
    overall_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Organizational Change Assessments table
CREATE TABLE IF NOT EXISTS organizational_change_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    assessment_type TEXT DEFAULT 'organizational_change',
    vision_score REAL DEFAULT 0.0,
    alignment_score REAL DEFAULT 0.0,
    understanding_score REAL DEFAULT 0.0,
    enactment_score REAL DEFAULT 0.0,
    responses TEXT DEFAULT '{}',
    overall_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User skills (for team member profiles)
CREATE TABLE IF NOT EXISTS user_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    UNIQUE(user_id, skill_name)
);

-- Insert sample data (default password for demo users: password123, GunnyRittz: Password123!)
INSERT OR IGNORE INTO users (name, email, password, role, avatar) VALUES
('Gunny Rittz', 'GunnyRittz@gmail.com', '$2a$10$E.Cf/G/Yjs.kBbYcLBicZO9DLlmVcdSa2v4xF75Se3v4hmbrAxBHC', 'Executive Leader', 'GR'),
('TestAdmin', 'admin123@localhost.local', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Executive Leader', 'TA'),
('John Doe', 'john.doe@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Project Manager', 'JD'),
('Jane Smith', 'jane.smith@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Frontend Developer', 'JS'),
('Mike Johnson', 'mike.johnson@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Backend Developer', 'MJ'),
('Alice Chen', 'alice.chen@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'UX Designer', 'AC'),
('Sarah Johnson', 'sarah.johnson@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Product Manager', 'SJ'),
('Current User', 'user@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Project Manager', 'CU');

INSERT OR IGNORE INTO projects (name, description, status, priority, deadline, pm_progress, leadership_progress, change_mgmt_progress, career_dev_progress, created_by) VALUES
('Website Redesign', 'Complete overhaul of company website', 'active', 'high', '2025-03-15', 7, 6, 7, 2, 1),
('AI Integration Project', 'Implementing StorAI across all modules', 'planning', 'critical', '2025-05-20', 4, 5, 4, 0, 1);

CREATE TABLE IF NOT EXISTS career_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES career_development_goals(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN ('certification', 'promotion', 'skill_milestone', 'project_completion', 'leadership', 'training', 'other')),
    skill_category VARCHAR(50) CHECK (skill_category IN ('technical', 'management', 'communication', 'design', 'analytics', 'business strategy', 'team building', 'leadership', 'innovation')),
    date_completed DATE NOT NULL DEFAULT CURRENT_DATE,
    evidence_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, goal_id)
);

-- User Skills Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_skills_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'management', 'communication', 'design', 'analytics', 'business strategy', 'team building', 'leadership', 'innovation')),
    proficiency_level VARCHAR(20) NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience DECIMAL(3,1) DEFAULT 0,
    last_used DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- Mentorship Relationships Table
CREATE TABLE IF NOT EXISTS mentorship_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('formal', 'informal', 'peer', 'reverse')),
    focus_area VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (mentor_user_id != mentee_user_id)
);

-- Learning Resources Table
CREATE TABLE IF NOT EXISTS learning_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES career_development_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('book', 'course', 'article', 'video', 'podcast', 'workshop', 'certification', 'other')),
    url VARCHAR(500),
    completion_status VARCHAR(20) DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'bookmarked')),
    completion_date DATE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goal Progress History Table
CREATE TABLE IF NOT EXISTS goal_progress_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES career_development_goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_progress INTEGER DEFAULT 0,
    new_progress INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, goal_id)
);

-- AI interaction tables
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    query TEXT,
    response TEXT,
    model_used TEXT,
    tokens_used INTEGER,
    context_data TEXT,
    document_context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    insight TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents table for file storage and vectorization
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT,
    content TEXT,
    file_type TEXT,
    file_size INTEGER,
    vector_data TEXT,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
