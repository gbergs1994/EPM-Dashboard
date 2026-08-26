const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// simple guard to prevent test from running in production environments
if (process.env.NODE_ENV === 'production') {
  console.warn('Skipping schema sync test in production');
} else {
  describe('schema synchronization', () => {
    it('ensures schema.sql includes all migration tables', () => {
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      // run the helper script; init-db wipes and rebuilds the sqlite file from schema.sql
      execSync('node init-db.js', { cwd: path.join(__dirname, '../../') });
      const content = fs.readFileSync(schemaPath, 'utf8');
      expect(content).toMatch(/leadership_assessments/);
      expect(content).toMatch(/CREATE TABLE IF NOT EXISTS users/);

      // also ensure every CREATE TABLE in migrations appears in the schema
      const migrationsDir = path.join(__dirname, '../../database/migrations');
      const migFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'));
      const missing = [];
      migFiles.forEach(file => {
        const text = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
          .replace(/--.*$/gm, '');
        let m;
        const regex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)/gi;
        while ((m = regex.exec(text)) !== null) {
          const table = m[1];
          const re = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}`, 'i');
          if (!re.test(content)) missing.push(table);
        }
      });
      expect(missing).toHaveLength(0);
    });
  });
}
