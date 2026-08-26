const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');


const dbPath = path.join(__dirname, 'database/dev.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Creating essential database tables...');

db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT,
    avatar TEXT,
    project_manager_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating users table:', err);
    else console.log('✅ Users table created');
  });

  // Create projects table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    stakeholder TEXT,
    status TEXT DEFAULT 'planning',
    priority TEXT DEFAULT 'medium',
    deadline DATE,
    last_update TEXT DEFAULT 'Just now',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pm_progress INTEGER DEFAULT 0,
    leadership_progress INTEGER DEFAULT 0,
    change_mgmt_progress INTEGER DEFAULT 0,
    career_dev_progress INTEGER DEFAULT 0
  )`, (err) => {
    if (err) console.error('Error creating projects table:', err);
    else console.log('✅ Projects table created');
  });

  // Create project comments table (needed for feedback UI)
  db.run(`CREATE TABLE IF NOT EXISTS project_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating project_comments table:', err);
    else console.log('✅ Project comments table created');
  });

  // Create leadership assessments table
  db.run(`CREATE TABLE IF NOT EXISTS leadership_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    assessment_type TEXT DEFAULT 'leadership_diamond',
    vision_score REAL DEFAULT 0.0,
    reality_score REAL DEFAULT 0.0,
    ethics_score REAL DEFAULT 0.0,
    courage_score REAL DEFAULT 0.0,
    responses TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating leadership_assessments table:', err);
    else console.log('✅ Leadership assessments table created');
  });

  // Create organizational change assessments table
  db.run(`CREATE TABLE IF NOT EXISTS organizational_change_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    responses TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating organizational_change_assessments table:', err);
    else console.log('✅ Organizational change assessments table created');
  });

  // Create career development goals table
  db.run(`CREATE TABLE IF NOT EXISTS career_development_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    current_level TEXT,
    target_level TEXT,
    priority TEXT,
    current_progress INTEGER DEFAULT 0,
    status TEXT,
    target_date DATE,
    notes TEXT,
    resources TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating career_development_goals table:', err);
    else console.log('✅ Career development goals table created');
  });

  // Create goal progress history table
  db.run(`CREATE TABLE IF NOT EXISTS goal_progress_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES career_development_goals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_progress INTEGER DEFAULT 0,
    new_progress INTEGER NOT NULL,
    notes TEXT,
    is_initial_note BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating goal_progress_history table:', err);
    else console.log('✅ Goal progress history table created');
  });

  // Insert default admin user
  db.run(`INSERT OR IGNORE INTO users (name, email, role, avatar) VALUES
    ('TestAdmin', 'admin123@localhost.local', 'Executive Leader', 'TA')`, (err) => {
    if (err) console.error('Error inserting default user:', err);
    else console.log('✅ Default admin user inserted');
  });

  // Insert sample user
  db.run(`INSERT OR IGNORE INTO users (name, email, role, avatar) VALUES
    ('John Doe', 'john.doe@company.com', 'Project Manager', 'JD')`, (err) => {
    if (err) console.error('Error inserting sample user:', err);
    else console.log('✅ Sample user inserted');
  });

  console.log('✅ Database setup complete');
  db.close();
});