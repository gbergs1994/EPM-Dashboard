// Ensures a fallback project manager account exists in the database.  This
// runs once on server start; if a user with the configured email is missing
// it will be created with a securely hashed password.  You can change the
// credentials here or move them into environment variables if desired.
async function ensureDefaultAdmin() {
  try {
    const { query } = require('../config/database');
    const email = 'admin123@localhost.local';
    const rawPassword = 'password123';
    const name = 'TestAdmin';
    const role = 'Executive Leader';

    // normalise and look for existing record
    const { rows } = await query('SELECT id, password FROM users WHERE email = $1', [
      email.toLowerCase()
    ]);

    if (rows.length > 0) {
      // Check if user has a password, if not, update it
      if (!rows[0].password) {
        console.log('🔧 Updating password for existing admin user...');
        const bcrypt = require('bcryptjs');
        const saltRounds = 10;
        const hashed = await bcrypt.hash(rawPassword, saltRounds);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, rows[0].id]);
        console.log('✅ Admin user password updated.');
      } else {
        console.log('✅ Default admin user already present.');
      }
      return;
    }

    // hash the password before storing
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const hashed = await bcrypt.hash(rawPassword, saltRounds);
    const avatar = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const insertSql = `
      INSERT INTO users (name, email, password, role, avatar, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await query(insertSql, [name, email.toLowerCase(), hashed, role, avatar]);
    console.log('✅ Default admin account created:', email);
  } catch (error) {
    console.warn('⚠️ Could not ensure default admin user (database may not be set up yet):', error.message);
  }
}

module.exports = ensureDefaultAdmin;
