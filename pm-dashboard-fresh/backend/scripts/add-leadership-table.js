const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/dev.db');

const ddl = `CREATE TABLE IF NOT EXISTS leadership_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    assessment_type TEXT DEFAULT 'leadership_diamond',
    vision_score REAL DEFAULT 0.0,
    reality_score REAL DEFAULT 0.0,
    ethics_score REAL DEFAULT 0.0,
    courage_score REAL DEFAULT 0.0,
    responses TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

db.serialize(() => {
  db.run(ddl, (err) => {
    if (err) {
      console.error('Error creating leadership_assessments table:', err.message);
    } else {
      console.log('✅ ensured leadership_assessments exists');
    }
    db.close();
  });
});
