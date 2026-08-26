const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use SQLite for development (much simpler than PostgreSQL setup)
const dbPath = path.join(__dirname, '../../database/dev.db');
const schemaPath = path.join(__dirname, '../../database/schema.sql');

// Ensure the database directory exists before sqlite3 tries to create the file
// (Render's disk is ephemeral, so dev.db won't exist on a fresh deploy).
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    // avoid logging during Jest runs (which may finish before callback executes)
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    if (!isTest) {
      console.log('✅ Connected to SQLite database');
    }
  }
});

// Splits schema.sql into runnable statements the same way init-db.js does.
function loadSchemaStatements() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  return schema
    .split(';')
    .map((stmt) => stmt.split('\n').map((line) => line.replace(/--.*$/, '')).join('\n').trim())
    .filter((stmt) => stmt.length > 0);
}

// Runs schema.sql against the current database when core tables are missing,
// which happens on every fresh deploy since dev.db is not committed to git.
function bootstrapSchema() {
  return new Promise((resolve, reject) => {
    const statements = loadSchemaStatements();
    let index = 0;

    function runNext() {
      if (index >= statements.length) {
        console.log('✅ Bootstrapped SQLite schema from schema.sql');
        resolve();
        return;
      }
      const statement = statements[index++];
      db.run(statement, (runErr) => {
        if (runErr) {
          reject(runErr);
          return;
        }
        runNext();
      });
    }

    runNext();
  });
}

const schemaReady = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'", [], (err, tables) => {
      if (err) {
        reject(err);
        return;
      }

      const ensureStakeholderColumn = () => {
        db.all('PRAGMA table_info(projects)', [], (columnErr, rows) => {
          if (columnErr) {
            reject(columnErr);
            return;
          }

          const hasStakeholderColumn = rows.some((column) => column.name === 'stakeholder');
          if (hasStakeholderColumn) {
            resolve();
            return;
          }

          db.run('ALTER TABLE projects ADD COLUMN stakeholder TEXT', (alterErr) => {
            if (alterErr) {
              reject(alterErr);
              return;
            }

            console.log('✅ Added missing projects.stakeholder column');
            resolve();
          });
        });
      };

      if (tables.length === 0) {
        bootstrapSchema().then(ensureStakeholderColumn).catch(reject);
        return;
      }

      ensureStakeholderColumn();
    });
  });
});

// Convert PostgreSQL-style queries to SQLite
const query = async (text, params = []) => {
  await schemaReady;

  return new Promise((resolve, reject) => {
    // Convert PostgreSQL $1, $2, etc. to SQLite ? placeholders
    let sqliteQuery = text;
    const sqliteParams = [];

    // Find all $N parameters and replace with ?
    const paramRegex = /\$(\d+)/g;
    let match;
    const usedIndices = new Set();

    while ((match = paramRegex.exec(text)) !== null) {
      const paramIndex = parseInt(match[1]) - 1; // $1 -> index 0, $2 -> index 1, etc.
      if (paramIndex < params.length) {
        usedIndices.add(paramIndex);
        sqliteParams.push(params[paramIndex]);
      }
    }

    // Replace all $N with ?
    sqliteQuery = text.replace(paramRegex, '?');

    // Convert NOW() to SQLite-compatible CURRENT_TIMESTAMP so tests and queries
    // using Postgres syntax continue to work with SQLite.
    sqliteQuery = sqliteQuery.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

    const normalizedQuery = sqliteQuery.trim().toUpperCase();
    const hasReturningClause = /\bRETURNING\b/i.test(sqliteQuery);

    // Handle SELECT queries and DML queries that return rows (e.g., UPDATE ... RETURNING *)
    if (normalizedQuery.startsWith('SELECT') || hasReturningClause) {
      db.all(sqliteQuery, sqliteParams, (err, rows) => {
        if (err) {
          console.error('SQL Error:', err.message);
          console.error('Query:', sqliteQuery);
          console.error('Params:', sqliteParams);
          reject(err);
        } else {
          resolve({ rows });
        }
      });
    }
    // Handle INSERT, UPDATE, DELETE queries
    else {
      db.run(sqliteQuery, sqliteParams, function(err) {
        if (err) {
          console.error('SQL Error:', err.message);
          console.error('Query:', sqliteQuery);
          console.error('Params:', sqliteParams);
          reject(err);
        } else {
          // For INSERT queries, return the inserted row
          if (normalizedQuery.startsWith('INSERT') && hasReturningClause) {
            // SQLite doesn't support RETURNING, so we need to get the last inserted row
            const tableName = sqliteQuery.match(/INSERT INTO (\w+)/i)?.[1];
            if (tableName) {
              db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [this.lastID], (err, row) => {
                if (err) reject(err);
                else {
                  // return empty array if no row was found
                  resolve({ rows: row ? [row] : [] });
                }
              });
            } else {
              resolve({ rows: [] });
            }
          } else {
            resolve({ rows: [] });
          }
        }
      });
    }
  });
};

module.exports = { db, query };