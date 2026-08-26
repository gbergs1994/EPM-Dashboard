# Setup Instructions

## Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

## Installation
1. Clone the repository
2. Run `npm run install:all`
3. Set up PostgreSQL database
4. Copy .env.example files and configure
5. Run `npm run dev`

### SQLite development

The project maintains PostgreSQL-style migrations, but the local SQLite database uses a hand-edited `schema.sql` file.
A helper check script warns when migrations define tables that are not yet included; you should then manually update `schema.sql`.
To run the check:

```bash
npm run check-schema     # exits non-zero if schema.sql is missing tables
```

You can still rebuild the database from `schema.sql` with:

```bash
node init-db.js        # or `node setup-db.js`
```

If you ever see `SQLITE_ERROR: no such table: <name>` while developing, stop
any running server, then either:

* run one of the provided helpers (`node scripts/add-comments-table.js` or
  `node scripts/add-leadership-table.js`) to patch the database in place, or
* delete `backend/database/dev.db` and re-run `node init-db.js`/`node setup-db.js`.

The quick start install script now runs the check automatically so you'll see a warning early.
