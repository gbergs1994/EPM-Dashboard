const fs = require('fs');
const path = require('path');
const schemaPath = path.join(__dirname, '../database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
console.log('Total segments', statements.length);
statements.forEach((s, i) => {
  const starts = s.startsWith('--') ? 'STARTS_WITH_COMMENT' : 'OK';
  console.log(i + 1, starts, s.split('\n')[0]);
});
console.log('filtered count', statements.filter(s => !s.startsWith('--')).length);
