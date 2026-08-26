// backend/src/routes/milestones.js
const express = require('express');
const router = express.Router();
const {
  getMilestonesByProject,
  getMilestone,
  createMilestone,
  createMilestones,
  updateMilestone,
  getMilestoneComments,
  deleteMilestone,
  getProjectMilestoneMetrics
} = require('../controllers/milestoneController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// All routes require authentication
router.use(auth);

// Get all milestones for a project
router.get('/project/:projectId', asyncHandler(getMilestonesByProject));

// Get project milestone aggregate metrics
router.get('/project/:projectId/metrics', asyncHandler(getProjectMilestoneMetrics));

// Get a single milestone
router.get('/:milestoneId', asyncHandler(getMilestone));

// Get comment history for a milestone
router.get('/:milestoneId/comments', asyncHandler(getMilestoneComments));

// Create a single milestone
router.post('/project/:projectId', asyncHandler(createMilestone));

// Create multiple milestones at once
router.post('/project/:projectId/batch', asyncHandler(createMilestones));

// Update a milestone
router.put('/:milestoneId', asyncHandler(updateMilestone));

// Delete a milestone
router.delete('/:milestoneId', asyncHandler(deleteMilestone));

module.exports = router;
