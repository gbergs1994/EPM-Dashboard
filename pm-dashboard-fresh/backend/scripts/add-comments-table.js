const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/dev.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS project_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      comment_type TEXT DEFAULT 'comment',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, err => {
      if (err) {
        console.error('Error creating project_comments table:', err.message);
      } else {
        console.log('✅ ensured project_comments exists');
      }
      db.close();
    });
});
