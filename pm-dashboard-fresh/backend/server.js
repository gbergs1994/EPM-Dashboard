const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./src/config/config');
const { query } = require('./src/config/database');

// Import routes
const apiRoutes = require('./src/routes/index'); // Main API router
const authRoutes = require('./src/routes/auth');
const projectRoutes = require('./src/routes/projects');
const userRoutes = require('./src/routes/users');
const careerRoutes = require('./src/routes/career');
const teamRoutes = require('./src/routes/team');
const teamManagementRoutes = require('./src/routes/teamManagement');
const leadershipRoutes = require('./src/routes/leadership');
const aiRoutes = require('./src/routes/ai');
// Add to backend/src/app.js or server.js
const documentsRoutes = require('./src/routes/documents');
const organizationalChangeRoutes = require('./src/routes/organizationalChange');
const milestoneRoutes = require('./src/routes/milestones');


// Import middleware - FIXED TYPO AND DESTRUCTURING
const { errorHandler } = require('./src/middleware/errorHandler'); // Fixed: destructure errorHandler
const asyncHandler = require('./src/middleware/asyncHandler');     // Fixed: typo in middleware

// Rate limiting setup
let rateLimiter;
try {
  const rateLimit = require('express-rate-limit');
  rateLimiter = rateLimit({
    windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes
    max: config.rateLimit?.max || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Only apply rate limiting in production
    skip: (req) => {
      // Skip rate limiting for health checks and development
      if (req.path === '/health' || req.path === '/api/health') return true;
      return config.nodeEnv === 'development';
    }
  });
} catch (error) {
  console.log('⚠️ Rate limiter not available, using fallback');
  rateLimiter = (req, res, next) => next();
}

const app = express();

// Ensure milestone table exists in long-lived dev databases where newer migrations
// may not have been applied yet.
const ensureMilestonesTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        planned_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        actual_cost NUMERIC(12,2) DEFAULT 0,
        completion_percentage NUMERIC(5,2) DEFAULT 0,
        earned_value NUMERIC(12,2) DEFAULT 0,
        start_date DATE,
        end_date DATE NOT NULL,
        status TEXT DEFAULT 'planning',
        order_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_milestones_end_date ON milestones(end_date)');

    await query(`
      CREATE TABLE IF NOT EXISTS milestone_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        completion_percentage NUMERIC(5,2),
        actual_cost NUMERIC(12,2),
        earned_value NUMERIC(12,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id ON milestone_comments(milestone_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_milestone_comments_project_id ON milestone_comments(project_id)');
    console.log('✅ Milestones table ensured');
  } catch (error) {
    console.error('❌ Failed to ensure milestones table:', error.message);
  }
};

ensureMilestonesTable();

// Trust proxy settings (needed for rate limiting and proper IP detection)
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
} else {
  app.set('trust proxy', false); // Trust all proxies in development
}

// CORS configuration
const corsAllowlist = new Set((config.corsOrigins || [config.corsOrigin]).map((o) => o.replace(/\/+$/, '')));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/+$/, '');

    if (corsAllowlist.has(cleanOrigin)) {
      return callback(null, true);
    }

    // Allow process.env.RENDER_EXTERNAL_URL if set by Render
    if (process.env.RENDER_EXTERNAL_URL && cleanOrigin === process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')) {
      return callback(null, true);
    }

    // Automatically allow any Render deployment domain (*.onrender.com)
    if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|localhost\.local)(:\d+)?$/.test(cleanOrigin);
    if (config.nodeEnv !== 'production' && isLocalDevOrigin) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Apply rate limiting
app.use(rateLimiter);

app.use('/api/documents', documentsRoutes);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Backward-compatible API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes - ADD ERROR HANDLING FOR EACH ROUTE
try {
  if (apiRoutes && typeof apiRoutes === 'function') {
    app.use('/api', apiRoutes);
    console.log('✅ API routes loaded');
  } else {
    console.log('❌ API routes invalid:', typeof apiRoutes);
  }
} catch (e) {
  console.log('❌ API routes error:', e.message);
}

try {
  if (authRoutes && typeof authRoutes === 'function') {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');
  } else {
    console.log('❌ Auth routes invalid:', typeof authRoutes);
  }
} catch (e) {
  console.log('❌ Auth routes error:', e.message);
}

try {
  if (projectRoutes && typeof projectRoutes === 'function') {
    app.use('/api/projects', projectRoutes);
    console.log('✅ Project routes loaded');
  } else {
    console.log('❌ Project routes invalid:', typeof projectRoutes);
  }
} catch (e) {
  console.log('❌ Project routes error:', e.message);
}

try {
  if (userRoutes && typeof userRoutes === 'function') {
    app.use('/api/users', userRoutes);
    console.log('✅ User routes loaded');
  } else {
    console.log('❌ User routes invalid:', typeof userRoutes);
  }
} catch (e) {
  console.log('❌ User routes error:', e.message);
}

try {
  if (careerRoutes && typeof careerRoutes === 'function') {
    app.use('/api/career', careerRoutes);
    console.log('✅ Career routes loaded');
  } else {
    console.log('❌ Career routes invalid:', typeof careerRoutes);
  }
} catch (e) {
  console.log('❌ Career routes error:', e.message);
}

try {
  if (teamRoutes && typeof teamRoutes === 'function') {
    app.use('/api/team', teamRoutes);
    console.log('✅ Team routes loaded');
  } else {
    console.log('❌ Team routes invalid:', typeof teamRoutes);
  }
} catch (e) {
  console.log('❌ Team routes error:', e.message);
}

try {
  if (teamManagementRoutes && typeof teamManagementRoutes === 'function') {
    app.use('/api/team-management', teamManagementRoutes);
    console.log('✅ Team management routes loaded');
  } else {
    console.log('❌ Team management routes invalid:', typeof teamManagementRoutes);
  }
} catch (e) {
  console.log('❌ Team management routes error:', e.message);
}

try {
  if (leadershipRoutes && typeof leadershipRoutes === 'function') {
    app.use('/api/leadership', leadershipRoutes);
    console.log('✅ Leadership routes loaded');
  } else {
    console.log('❌ Leadership routes invalid:', typeof leadershipRoutes);
  }
} catch (e) {
  console.log('❌ Leadership routes error:', e.message);
}

try {
    if (organizationalChangeRoutes && typeof organizationalChangeRoutes === 'function') {
      app.use('/api/organizational-change', organizationalChangeRoutes);
      console.log('✅ Organizational change routes loaded');
    } else {
      console.log('❌ Organizational change routes invalid:', typeof organizationalChangeRoutes);
    }
  } catch (e) {
    console.log('❌ Organizational change routes error:', e.message);
  }

  try {
    if (milestoneRoutes && typeof milestoneRoutes === 'function') {
      app.use('/api/milestones', milestoneRoutes);
      console.log('✅ Milestone routes loaded');
    } else {
      console.log('❌ Milestone routes invalid:', typeof milestoneRoutes);
    }
  } catch (e) {
    console.log('❌ Milestone routes error:', e.message);
  }

try {
  if (aiRoutes && typeof aiRoutes === 'function') {
    app.use('/api/ai', aiRoutes);
    console.log('✅ AI routes loaded');
  } else {
    console.log('❌ AI routes invalid:', typeof aiRoutes);
  }
} catch (e) {
  console.log('❌ AI routes error:', e.message);
}

// Serve static files in production
if (config.nodeEnv === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  const backendBuildPath = path.join(__dirname, 'build');
  const staticDir = fs.existsSync(frontendBuildPath)
    ? frontendBuildPath
    : fs.existsSync(backendBuildPath)
      ? backendBuildPath
      : null;

  if (staticDir) {
    app.use(express.static(staticDir));

    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
if (errorHandler && typeof errorHandler === 'function') {
  app.use(errorHandler);
  console.log('✅ Error handler loaded');
} else {
  console.log('❌ Error handler invalid, using fallback');
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, error: 'Server Error' });
  });
}

// Database connection test
const testDatabaseConnection = async () => {
  try {
    const result = await query('SELECT CURRENT_TIMESTAMP as current_time');
    console.log('✅ Database connected successfully at:', result.rows[0].current_time);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const ensureProjectEvmColumns = async () => {
  try {
    let existingColumns = [];

    try {
      // SQLite path
      const sqliteColumns = await query("SELECT name FROM pragma_table_info('projects')");
      existingColumns = sqliteColumns.rows.map((row) => row.name);
    } catch (sqliteError) {
      // PostgreSQL fallback
      const pgColumns = await query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'"
      );
      existingColumns = pgColumns.rows.map((row) => row.column_name);
    }

    const requiredColumns = [
      { name: 'planned_value', type: 'NUMERIC(12,2) DEFAULT 0' },
      { name: 'actual_cost', type: 'NUMERIC(12,2) DEFAULT 0' },
      { name: 'earned_value', type: 'NUMERIC(12,2) DEFAULT 0' }
    ];

    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        await query(`ALTER TABLE projects ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added missing projects.${column.name} column`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not ensure EVM columns on startup:', error.message);
  }
};

// Start server
const startServer = async () => {
  try {
    await testDatabaseConnection();
    await ensureProjectEvmColumns();
    // ensure the default admin user exists before accepting requests
    try {
      const ensureDefaultAdmin = require('./src/utils/ensureDefaultAdmin');
      await ensureDefaultAdmin();
    } catch (e) {
      console.warn('⚠️ could not ensure default admin on startup:', e.message);
    }
    
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 CORS origins: ${(config.corsOrigins || [config.corsOrigin]).join(', ')}`);
      console.log(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      console.log(`📡 Health check: http://localhost:${config.port}/health`);
      console.log(`🔗 API base: http://localhost:${config.port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;