-- 003_user_account_enhancements.sql
-- Database migration for enhanced user account functionality

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create user_activities table for activity tracking
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_user_activities_user_id (user_id),
    INDEX idx_user_activities_type (activity_type),
    INDEX idx_user_activities_created_at (created_at)
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_token (session_token),
    INDEX idx_user_sessions_expires_at (expires_at)
);

-- Create user_security_events table for security audit log
CREATE TABLE IF NOT EXISTS user_security_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- login, logout, password_change, etc.
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    failure_reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_security_events_user_id (user_id),
    INDEX idx_security_events_type (event_type),
    INDEX idx_security_events_created_at (created_at)
);

-- Create user_preferences_history table for preference change tracking
CREATE TABLE IF NOT EXISTS user_preferences_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_preferences_history_user_id (user_id),
    INDEX idx_preferences_history_key (preference_key)
);

-- Update existing users with default preferences
UPDATE users 
SET preferences = '{
    "notifications": {
        "email": true,
        "push": true,
        "projectUpdates": true,
        "teamUpdates": true,
        "weeklyDigest": false,
        "securityAlerts": true
    },
    "privacy": {
        "profileVisibility": "team",
        "showEmail": false,
        "showPhone": false,
        "activityVisibility": "team"
    },
    "interface": {
        "theme": "light",
        "language": "en",
        "timezone": "UTC",
        "dateFormat": "MM/DD/YYYY"
    }
}'::jsonb
WHERE preferences IS NULL OR preferences = '{}';

-- Update existing users with empty skills array
UPDATE users 
SET skills = '[]'::jsonb
WHERE skills IS NULL;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to log user activities automatically
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log user profile updates
    IF TG_TABLE_NAME = 'users' AND TG_OP = 'UPDATE' THEN
        IF OLD.name != NEW.name OR OLD.email != NEW.email OR OLD.phone != NEW.phone THEN
            INSERT INTO user_activities (user_id, activity_type, description, metadata)
            VALUES (NEW.id, 'profile_updated', 'Profile information updated', 
                   json_build_object('changes', json_build_object(
                       'name', CASE WHEN OLD.name != NEW.name THEN json_build_object('old', OLD.name, 'new', NEW.name) END,
                       'email', CASE WHEN OLD.email != NEW.email THEN json_build_object('old', OLD.email, 'new', NEW.email) END,
                       'phone', CASE WHEN OLD.phone != NEW.phone THEN json_build_object('old', OLD.phone, 'new', NEW.phone) END
                   )));
        END IF;
        
        IF OLD.skills != NEW.skills THEN
            INSERT INTO user_activities (user_id, activity_type, description, metadata)
            VALUES (NEW.id, 'skills_updated', 'Skills updated', 
                   json_build_object('old_skills', OLD.skills, 'new_skills', NEW.skills));
        END IF;
        
        IF OLD.preferences != NEW.preferences THEN
            INSERT INTO user_activities (user_id, activity_type, description, metadata)
            VALUES (NEW.id, 'preferences_updated', 'Preferences updated', 
                   json_build_object('timestamp', CURRENT_TIMESTAMP));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic activity logging
DROP TRIGGER IF EXISTS auto_log_user_activity ON users;
CREATE TRIGGER auto_log_user_activity
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_skills_gin ON users USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_users_preferences_gin ON users USING GIN(preferences);

-- Create view for user profile with computed fields
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.location,
    u.bio,
    u.title,
    u.department,
    u.role,
    u.avatar,
    u.skills,
    u.preferences,
    u.created_at,
    u.updated_at,
    u.last_login,
    
    -- Computed fields
    (SELECT COUNT(*) FROM project_team_members ptm WHERE ptm.user_id = u.id) as project_count,
    (SELECT COUNT(*) FROM user_activities ua WHERE ua.user_id = u.id) as activity_count,
    (SELECT MAX(created_at) FROM user_activities ua WHERE ua.user_id = u.id) as last_activity,
    
    -- Skills count
    CASE 
        WHEN u.skills IS NULL THEN 0
        ELSE jsonb_array_length(u.skills)
    END as skills_count,
    
    -- Account age in days
    EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - u.created_at)) as account_age_days,
    
    -- Active status
    CASE 
        WHEN u.deleted_at IS NOT NULL THEN false
        WHEN u.last_login IS NOT NULL AND u.last_login > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN true
        WHEN u.updated_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN true
        ELSE false
    END as is_active
    
FROM users u
WHERE u.deleted_at IS NULL;

-- Create view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(ua.id) as total_activities,
    COUNT(CASE WHEN ua.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as activities_last_week,
    COUNT(CASE WHEN ua.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as activities_last_month,
    MAX(ua.created_at) as last_activity_at,
    
    -- Activity breakdown by type
    COUNT(CASE WHEN ua.activity_type = 'profile_updated' THEN 1 END) as profile_updates,
    COUNT(CASE WHEN ua.activity_type = 'password_changed' THEN 1 END) as password_changes,
    COUNT(CASE WHEN ua.activity_type = 'skills_updated' THEN 1 END) as skill_updates,
    COUNT(CASE WHEN ua.activity_type = 'preferences_updated' THEN 1 END) as preference_updates
    
FROM users u
LEFT JOIN user_activities ua ON u.id = ua.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name, u.email;

-- Insert some sample activity data for existing users
INSERT INTO user_activities (user_id, activity_type, description, metadata)
SELECT 
    id,
    'account_created',
    'User account created',
    json_build_object('registration_date', created_at)
FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_activities ua 
    WHERE ua.user_id = users.id AND ua.activity_type = 'account_created'
);

-- Create function to clean up old activities (keep last 1000 per user)
CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS void AS $$
BEGIN
    DELETE FROM user_activities 
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM user_activities
        ) ranked
        WHERE rn > 1000
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR (is_active = false AND updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Add some useful constraints
ALTER TABLE users ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE user_activities ADD CONSTRAINT check_activity_type_length
    CHECK (length(activity_type) >= 3 AND length(activity_type) <= 50);

ALTER TABLE user_sessions ADD CONSTRAINT check_expires_at_future
    CHECK (expires_at > created_at);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_activities TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_security_events TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences_history TO your_app_user;
-- GRANT SELECT ON user_profiles TO your_app_user;
-- GRANT SELECT ON user_activity_summary TO your_app_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'User account enhancements migration completed successfully!';
    RAISE NOTICE 'New tables created: user_activities, user_sessions, user_security_events, user_preferences_history';
    RAISE NOTICE 'New views created: user_profiles, user_activity_summary';
    RAISE NOTICE 'New columns added to users table: phone, location, bio, title, department, avatar, skills, preferences, last_login, deleted_at';
    RAISE NOTICE 'Triggers and functions created for automatic activity logging and timestamp updates';
END $$;