const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/dev.db');

const tables = ['leadership_assessments','project_comments','organizational_change_assessments'];

db.serialize(() => {
  let remaining = tables.length;
  tables.forEach(tbl => {
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tbl], (err,row) => {
      if (err) console.error(err);
      else console.log(tbl, row ? 'exists' : 'missing');
      remaining--;
      if (remaining === 0) {
        db.close();
      }
    });
  });
});
