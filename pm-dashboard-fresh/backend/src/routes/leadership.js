// backend/src/routes/leadership.js
// CORRECTED VERSION - Uses proper authentication instead of test middleware

const express = require('express');
const {
  getLeadershipAssessments,
  submitLeadershipAssessment,
  getLeadershipAssessmentById,
  getLeadershipMetrics,
  deleteLeadershipAssessment
} = require('../controllers/leadershipController');

// Import your authentication middleware
const auth = require('../middleware/auth');

const router = express.Router();

// Use your proper authentication middleware (not the test one)
router.use(auth);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Leadership service is running',
    timestamp: new Date().toISOString(),
    authenticatedUser: req.user ? req.user.name : 'None'
  });
});

// Routes
router.get('/assessments', getLeadershipAssessments);
router.post('/assessments', submitLeadershipAssessment);
router.get('/assessments/:id', getLeadershipAssessmentById);
router.delete('/assessments/:id', deleteLeadershipAssessment);
router.get('/metrics', getLeadershipMetrics);

// Framework info
router.get('/framework', (req, res) => {
  res.json({
    success: true,
    framework: {
      name: 'Leadership Diamond',
      dimensions: ['Vision', 'Reality', 'Ethics', 'Courage']
    },
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    } : null
  });
});

module.exports = router;