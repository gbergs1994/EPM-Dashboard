-- Seed script for additional users or test data

-- Insert a default project manager account (will not duplicate if email exists)
INSERT INTO users (name, email, password, role, avatar, created_at, updated_at)
VALUES (
    'TestAdmin',
    'admin123@localhost.local',
    -- bcrypt hash for "password123"
    '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS',
    'Executive Leader',
    'TA',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;
