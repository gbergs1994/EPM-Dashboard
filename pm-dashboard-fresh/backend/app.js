const express = require('express');
const cors = require('cors');

const app = express();

console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 __dirname:', __dirname);

console.log('🔍 Testing route files...');

try {
  console.log('🔍 Attempting to load auth routes...');
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded successfully:', typeof authRoutes);
  app.use('/api/auth', authRoutes);
} catch (error) {
  console.error('❌ Auth routes error:');
  console.error('  Error message:', error.message);
  console.error('  Error code:', error.code);
  console.error('  Full path attempted:', require.resolve('./routes/auth'));
}

// create a default project manager user if the database happens to be empty
const ensureDefaultAdmin = require('./utils/ensureDefaultAdmin');
ensureDefaultAdmin();

try {
  console.log('🔍 Attempting to load projects routes...');
  const projectRoutes = require('./routes/projects');
  console.log('✅ Projects routes loaded successfully:', typeof projectRoutes);
  app.use('/api/projects', projectRoutes);
} catch (error) {
  console.error('❌ Projects routes error:');
  console.error('  Error message:', error.message);
  console.error('  Error code:', error.code);
  console.error('  Full path attempted:', require.resolve('./routes/projects'));
}

try {
  console.log('🔍 Attempting to load users routes...');
  const userRoutes = require('./routes/users');
  console.log('✅ Users routes loaded successfully:', typeof userRoutes);
  app.use('/api/users', userRoutes);
} catch (error) {
  console.error('❌ Users routes error:');
  console.error('  Error message:', error.message);
  console.error('  Error code:', error.code);
  console.error('  Full path attempted:', require.resolve('./routes/users'));
}

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'PM Dashboard API is running'
  });
});

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.warn('⚠️ Auth routes not found:', error.message);
}

try {
  const projectRoutes = require('./routes/projects');
  app.use('/api/projects', projectRoutes);
  console.log('✅ Project routes loaded');
} catch (error) {
  console.warn('⚠️ Project routes not found:', error.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ User routes loaded');
} catch (error) {
  console.warn('⚠️ User routes not found:', error.message);
}

app.use('/api/team-management', require('./routes/teamManagement'));

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

module.exports = app;