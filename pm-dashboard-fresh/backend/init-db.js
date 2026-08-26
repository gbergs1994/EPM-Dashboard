const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database setup
const dbPath = path.join(__dirname, 'database/dev.db');
const schemaPath = path.join(__dirname, 'database/schema.sql');

// remove the old dev database so we always start with a clean copy; this
// ensures running `init-db.js` multiple times won't generate confusing
// "table has more than one primary key" errors.
function removeDb(attempts = 3) {
  if (!fs.existsSync(dbPath)) return;
  try {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Removed existing dev.db');
  } catch (err) {
    if (attempts > 0 && err.code === 'EBUSY') {
      console.warn(`⚠️  dev.db busy, retrying (${attempts} attempts left)`);
      // small delay then retry synchronously
      const waitTill = Date.now() + 50;
      while (Date.now() < waitTill) {} // busy-wait, acceptable for very short delay
      return removeDb(attempts - 1);
    }
    console.warn('⚠️  Could not remove dev.db, it may be in use - will continue with existing file');
  }
}
removeDb();

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log('🔧 Setting up SQLite database...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split schema into individual statements, strip out comment lines, and filter empty results
const statements = schema
  .split(';')
  .map(stmt => {
    // remove any single-line comments that start with -- (after trimming)
    const withoutComments = stmt
      .split('\n')
      .map(line => line.replace(/--.*$/, ''))
      .join('\n');
    return withoutComments.trim();
  })
  .filter(stmt => stmt.length > 0);

console.log(`📄 Found ${statements.length} SQL statements to execute`);

let completed = 0;
const total = statements.length;

// Helper that attempts to run a statement, retrying if the database is locked
function executeStatement(statement, index) {
  return new Promise((resolve) => {
    db.run(statement, function(err) {
      if (err) {
        if (err.message.includes('database is locked')) {
          console.warn(`⚠️ Statement ${index + 1} locked, retrying shortly...`);
          // retry the same statement after a short delay
          setTimeout(() => executeStatement(statement, index).then(resolve), 100);
          return;
        }
        console.error(`❌ Error executing statement ${index + 1}:`, err.message);
        console.error('Statement:', statement);
        resolve(false);
      } else {
        console.log(`✅ Executed statement ${index + 1}/${total}`);
        resolve(true);
      }
    });
  });
}

async function runNext() {
  if (completed >= total) {
    console.log('✅ Database setup complete!');
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
      }
    });
    return;
  }

  const statement = statements[completed];
  console.log(`🔄 Executing statement ${completed + 1}/${total}: ${statement.substring(0, 50)}...`);

  await executeStatement(statement, completed);
  completed++;
  runNext();
}

runNext();