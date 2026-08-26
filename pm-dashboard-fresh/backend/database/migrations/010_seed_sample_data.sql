-- Seed data migration: insert a few users and projects for local development
-- Default password for all seed users: password1234

INSERT OR IGNORE INTO users (name, email, password, role, avatar) VALUES
('John Doe',      'john.doe@company.com',     '$2a$10$kaUDO05W8Wi9K.o7LGA5KOuAlWhgGm.nMQtELqigzsRdNUfEAmvRW', 'Project Manager',     'JD'),
('Jane Smith',    'jane.smith@company.com',   '$2a$10$Xjc255Ak90xouHcjkE82i.jlB.OnSFxaiXBhBmiK7UInORKNKKsmi', 'Frontend Developer',  'JS'),
('Mike Johnson',  'mike.johnson@company.com', '$2a$10$gTnA.RpZfP4XHscW0RXp9O.ETvjFwX0ck/PVBqjsDAWJDHgoMu0WS', 'Backend Developer',   'MJ'),
('Alice Chen',    'alice.chen@company.com',   '$2a$10$uFTu2ti.fmmEvqh2J86.iOrwS1yPzUPMZuAegkMiTp3KcHlEPOnJ6', 'UX Designer',         'AC'),
('Sarah Johnson', 'sarah.johnson@company.com','$2a$10$ZzRmHWsMWSrHUJm40jiPv.84VtFTPD2V4FmeieV5P5kCQB1aMQ/BW', 'Product Manager',     'SJ'),
('Current User',  'user@company.com',         '$2a$10$CwAQovziKys3qQGonZfdg.9JjFmLGr4rZPU0clLKULX6BLmDUZ/Ce', 'Project Manager',     'CU');

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
