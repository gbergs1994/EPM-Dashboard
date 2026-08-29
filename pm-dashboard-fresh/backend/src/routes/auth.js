const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { query } = require('../config/database');

const router = express.Router();

console.log('🔍 Auth routes file loaded successfully');

// delegate to the controller implementations which include proper hashing and
// consistent error handling.  previously the routes file redefined the logic,
// leading to duplication and an un-hashed password path that could return
// unexpected database errors.
const {
  register,
  login,
  logout
} = require('../controllers/authController');

console.log('🔗 Setting up auth routes...');

router.post('/register', asyncHandler(register));
console.log('✅ POST /register route configured');

router.post('/login', asyncHandler(login));
console.log('✅ POST /login route configured');

router.post('/logout', asyncHandler(logout));
console.log('✅ POST /logout route configured');

router.get('/me', (req, res) => {
  res.status(501).json({ 
    success: false,
    message: 'Get current user - Coming soon (requires JWT implementation)' 
  });
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'GET /api/auth/test'
    ]
  });
});

console.log('✅ Auth routes setup complete');

module.exports = router;