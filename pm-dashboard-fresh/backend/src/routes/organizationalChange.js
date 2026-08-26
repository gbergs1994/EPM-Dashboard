// backend/routes/organizationalChange.js - FIXED VERSION WITH CUSTOM AUTH
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Import the controller
const organizationalChangeController = require('../controllers/organizationalChangeController');

// CUSTOM AUTH MIDDLEWARE - specifically for organizational change routes
const orgChangeAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 OrgChange Auth - Headers:', {
      authorization: authHeader ? 'Present' : 'Missing',
      route: req.path
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing'
      });
    }

    const token = authHeader.substring(7); 
    console.log('🔍 OrgChange token received:', token?.substring(0, 15) + '...');
    
    let userId = null;
    
    // Handle "user_19" format from frontend
    if (token.startsWith('user_')) {
      userId = parseInt(token.substring(5));
      console.log('🔍 OrgChange extracted user ID:', userId);
    } else if (!isNaN(token)) {
      userId = parseInt(token);
      console.log('🔍 OrgChange using numeric token:', userId);
    }
    
    if (!userId || userId <= 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    // Look up user
    const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    console.log('✅ OrgChange auth success:', user.name, 'ID:', user.id);
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('❌ OrgChange auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Apply our custom authentication to all routes
router.use(orgChangeAuth);

// Define routes using the controller
router.get('/assessments', organizationalChangeController.getOrganizationalChangeAssessments);
router.post('/assessments', organizationalChangeController.submitOrganizationalChangeAssessment);
router.get('/analytics', organizationalChangeController.getOrganizationalChangeAnalytics);
router.get('/team-metrics', organizationalChangeController.getTeamMetrics);
router.get('/assessments/:id', organizationalChangeController.getAssessmentDetails);
router.put('/assessments/:id', organizationalChangeController.updateAssessment);
router.delete('/assessments/:id', organizationalChangeController.deleteAssessment);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Organizational change routes with CUSTOM authentication working!',
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      email: req.user.email
    } : 'No user',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Organizational change routes configured with CUSTOM auth');

module.exports = router;