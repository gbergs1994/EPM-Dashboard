// backend/debug-routes.js
// Simple script to test if routes are working
// Run this with: node backend/debug-routes.js

const express = require('express');
const app = express();

app.use(express.json());

// Test basic route
app.get('/test', (req, res) => {
  res.json({ message: 'Basic route works!' });
});

// Test team management route mounting
try {
  const teamRoutes = require('./src/routes/teamManagement');
  app.use('/api/team-management', teamRoutes);
  console.log('✅ Team management routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading team management routes:', error.message);
}

// Test the actual endpoint
app.get('/api/team-management/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Team management test route works!',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3001; // Different port to avoid conflicts

app.listen(PORT, () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/api/team-management/test`);
  console.log(`🔗 Basic test: http://localhost:${PORT}/test`);
});