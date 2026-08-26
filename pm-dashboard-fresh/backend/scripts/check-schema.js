const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../database/migrations');
const schemaPath = path.join(__dirname, '../database/schema.sql');

if (!fs.existsSync(migrationsDir) || !fs.existsSync(schemaPath)) {
  console.error('Migrations directory or schema.sql not found');
  process.exit(1);
}

const migFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'));

const tables = new Set();
migFiles.forEach(file => {
  const text = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    .replace(/--.*$/gm, '');
  let m;
  const regex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/gi;
  while ((m = regex.exec(text)) !== null) {
    tables.add(m[1]);
  }
});

const schema = fs.readFileSync(schemaPath, 'utf8');
const missing = [];
for (const tbl of tables) {
  const re = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${tbl}`,'i');
  if (!re.test(schema)) {
    missing.push(tbl);
  }
}

if (missing.length) {
  console.warn('⚠️  schema.sql is missing definitions for tables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ schema.sql includes all migration tables');
}
