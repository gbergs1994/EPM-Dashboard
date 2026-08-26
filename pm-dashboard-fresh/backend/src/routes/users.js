const express = require('express');
const userController = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Put specific routes BEFORE parameterized routes
router.get('/search', asyncHandler(userController.searchUsers));

// Put the root route BEFORE the /:id route
router.get('/', asyncHandler(userController.getAllUsers));

// Parameterized routes go AFTER specific routes
router.get('/:id', asyncHandler(userController.getUser));
router.post('/', asyncHandler(userController.createUser));
router.put('/:id', asyncHandler(userController.updateUser));
router.delete('/:id', asyncHandler(userController.deleteUser));

router.get('/:id/profile', asyncHandler(userController.getUserProfile));
router.put('/:id/profile', asyncHandler(userController.updateUserProfile));

router.put('/:id/password', asyncHandler(userController.changePassword));

router.put('/:id/preferences', asyncHandler(userController.updateUserPreferences));

router.get('/:id/skills', asyncHandler(userController.getUserSkills));
router.post('/:id/skills', asyncHandler(userController.addUserSkill));
router.delete('/:id/skills/:skillId', asyncHandler(userController.removeUserSkill));

module.exports = router;