-- Seed data migration: insert a few users and projects for local development
-- Default password for all seed users: password123

INSERT OR IGNORE INTO users (name, email, password, role, avatar) VALUES
('John Doe',      'john.doe@company.com',     '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Project Manager',     'JD'),
('Jane Smith',    'jane.smith@company.com',   '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Frontend Developer',  'JS'),
('Mike Johnson',  'mike.johnson@company.com', '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Backend Developer',   'MJ'),
('Alice Chen',    'alice.chen@company.com',   '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'UX Designer',         'AC'),
('Sarah Johnson', 'sarah.johnson@company.com','$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Product Manager',     'SJ'),
('Current User',  'user@company.com',         '$2a$10$gCYp1JrLTzoZ3RZiTjLjEO7bvtPthffYYGl6xTnHEbogdRkG.FrHS', 'Project Manager',     'CU');

INSERT OR IGNORE INTO projects (
	name,
	description,
	status,
	priority,
	deadline,
	pm_progress,
	leadership_progress,
	change_mgmt_progress,
	career_dev_progress,
	planned_value,
	actual_cost,
	earned_value,
	created_by
) VALUES
('Website Redesign', 'Complete overhaul of company website', 'active', 'high', '2025-03-15', 7, 6, 7, 2, 250000, 220000, 235000, 1),
('AI Integration Project', 'Implementing StorAI across all modules', 'planning', 'critical', '2025-05-20', 4, 5, 4, 0, 180000, 95000, 90000, 1);
