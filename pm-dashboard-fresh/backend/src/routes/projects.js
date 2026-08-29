// FIXED routes/projects.js - Replace your current version with this

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectAccess } = require('../middleware/rbac');
const projectController = require('../controllers/projectController');
const feedbackController = require('../controllers/feedbackController');
const teamController = require('../controllers/teamController');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');

// FIXED: Import all necessary functions
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  changeProjectManager,
  addComment,
  getComments,
  updateComment,
  deleteComment,
  getProjectHistory,  // ADDED
  getProjectAnalytics
} = require('../controllers/projectController');

const ALLOWED_PROJECT_MEMBER_ROLES = ['Team Member', 'Project Manager', 'Executive Leader'];


// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Project routes are working!',
    availableRoutes: [
      'GET /api/projects',
      'GET /api/projects/:id',
      'POST /api/projects',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id',
      'GET /api/projects/:id/history',     // ADDED
      'GET /api/projects/:id/team',        // ADDED
      'POST /api/projects/:id/team',
      'PUT /api/projects/:id/team/:memberId',  // ADDED
      'DELETE /api/projects/:id/team/:memberId',
      'GET /api/projects/:id/comments',
      'POST /api/projects/:id/comments',
      'PUT /api/projects/:id/comments/:commentId',
      'DELETE /api/projects/:id/comments/:commentId'
    ]
  });
});

router.get('/debug-test', (req, res) => {
  console.log('🟢 DEBUG TEST ROUTE HIT');
  res.json({ message: 'Debug route working' });
});

router.get('/users/available', auth, async (req, res) => {
  try {
    console.log(`📡 GET /api/projects/users/available`);

    const usersResult = await query(
      'SELECT id, name, email, role, COALESCE(current_workload, 0) as current_workload FROM users WHERE id != $1 ORDER BY name',
      [req.user.id]
    );

    console.log(`✅ Found ${usersResult.rows.length} available users`);

    res.json({
      success: true,
      data: usersResult.rows,
      users: usersResult.rows
    });

  } catch (error) {
    console.error('❌ Error getting users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Project CRUD routes
router.get('/', auth, getAllProjects);
router.get('/:id', auth, getProject);
router.post('/', auth, createProject);
router.put('/:id', auth, requireProjectAccess('edit'), updateProject);
router.put('/:id/project-manager', auth, changeProjectManager);
router.delete('/:id', auth, deleteProject);

// ADDED: History route
router.get('/:id/history', auth, getProjectHistory);



// ADDED: Missing team routes
router.get('/:id/team', auth, async (req, res) => {
  try {
    const projectId = req.params.id;

    const teamQuery = `
      SELECT ptm.*, u.name, u.email, u.role as user_role, u.current_workload
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      WHERE ptm.project_id = $1
    `;

    const result = await query(teamQuery, [projectId]);

    res.json({
      success: true,
      team: result.rows,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error getting team:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/team', auth, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { id, userId, role, workload_allocation } = req.body;
    const memberId = id || userId;
    const normalizedRole = String(role || 'Team Member').trim();

    if (!memberId) {
      return res.status(400).json({ success: false, error: 'Member ID required' });
    }

    const allocation = parseInt(workload_allocation, 10);
    if (isNaN(allocation) || allocation < 1 || allocation > 100) {
      return res.status(400).json({ success: false, error: 'workload_allocation must be between 1 and 100' });
    }

    if (!ALLOWED_PROJECT_MEMBER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: `role must be one of: ${ALLOWED_PROJECT_MEMBER_ROLES.join(', ')}`
      });
    }

    // Check if user exists and get current workload
    const userResult = await query('SELECT name, email, current_workload FROM users WHERE id = $1', [memberId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentWorkload = Number.parseInt(userResult.rows[0].current_workload, 10);
    const normalizedCurrentWorkload = Number.isNaN(currentWorkload) ? 0 : Math.max(0, currentWorkload);

    if (normalizedCurrentWorkload + allocation > 100) {
      return res.status(400).json({
        success: false,
        error: `This would exceed ${userResult.rows[0].name}'s workload capacity. Current workload: ${normalizedCurrentWorkload}%, requested: ${allocation}%, maximum remaining: ${100 - normalizedCurrentWorkload}%`
      });
    }

    // Check if already a member
    const existingResult = await query(
      'SELECT id FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already on team' });
    }

    // Validate that the user is assigned to the PM who owns this project.
    // Support both current and legacy assignment models.
    const assignmentCheck = await query(
      `SELECT 1
       FROM projects p
       LEFT JOIN team_assignments ta
         ON ta.project_manager_id = p.created_by
        AND ta.team_member_id = $2
        AND ta.status = 'active'
       LEFT JOIN team_members tm
         ON tm.project_manager_id = p.created_by
        AND tm.user_id = $2
        AND COALESCE(tm.status, 'active') = 'active'
       LEFT JOIN users u
         ON u.id = $2
       WHERE p.id = $1
         AND (
           ta.id IS NOT NULL
           OR tm.id IS NOT NULL
           OR u.project_manager_id = p.created_by
           OR p.created_by = $2
         )`,
      [projectId, memberId]
    );

    if (assignmentCheck.rows.length === 0) {
      // Auto-assign the user to this project manager's team
      const projectOwnerResult = await query('SELECT created_by FROM projects WHERE id = $1', [projectId]);
      const projectOwnerId = projectOwnerResult.rows[0]?.created_by || req.user.id;

      try {
        await query(`
          INSERT INTO team_assignments (project_manager_id, team_member_id, assigned_at, status)
          VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')
          ON CONFLICT (project_manager_id, team_member_id)
          DO UPDATE SET status = 'active', assigned_at = CURRENT_TIMESTAMP
        `, [projectOwnerId, memberId]);

        await query(`
          INSERT INTO team_members (user_id, project_manager_id, added_by, notes, added_date, status)
          VALUES ($1, $2, $3, '', CURRENT_TIMESTAMP, 'active')
          ON CONFLICT (project_manager_id, user_id)
          DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP
        `, [memberId, projectOwnerId, req.user.id]);
      } catch (assignErr) {
        console.warn('Auto-assignment to PM team note:', assignErr.message);
      }
    }

    // Add member with workload allocation stored in contribution_percentage
    await query(
      'INSERT INTO project_team_members (project_id, user_id, role_in_project, joined_date, status, contribution_percentage) VALUES ($1, $2, $3, $4, $5, $6)',
      [projectId, memberId, normalizedRole, new Date(), 'active', allocation]
    );

    // Update user's current workload
    await query(
      'UPDATE users SET current_workload = COALESCE(current_workload, 0) + $1 WHERE id = $2',
      [allocation, memberId]
    );

    res.json({
      success: true,
      message: `${userResult.rows[0].name} added to project`,
      data: { id: memberId, name: userResult.rows[0].name, workload_allocation: allocation }
    });

  } catch (error) {
    console.error('❌ Error adding member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/team/:memberId', auth, async (req, res) => {
  try {
    const { id: projectId, memberId } = req.params;
    const { role, skills, status, joinedDate, contribution, workload_allocation } = req.body;

    console.log(`📝 PUT /api/projects/${projectId}/team/${memberId}`);

    const existingMemberQuery = `
      SELECT ptm.id, ptm.user_id, COALESCE(ptm.contribution_percentage, 0) as existing_allocation,
             COALESCE(u.current_workload, 0) as current_workload
      FROM project_team_members ptm
      JOIN users u ON u.id = ptm.user_id
      WHERE ptm.project_id = $1 AND (ptm.user_id = $2 OR ptm.id = $2)
      LIMIT 1
    `;

    const existingMemberResult = await query(existingMemberQuery, [projectId, memberId]);
    if (existingMemberResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const existingMember = existingMemberResult.rows[0];
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (role !== undefined) {
      const normalizedRole = String(role || 'Team Member').trim();
      if (!ALLOWED_PROJECT_MEMBER_ROLES.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          error: `role must be one of: ${ALLOWED_PROJECT_MEMBER_ROLES.join(', ')}`
        });
      }

      updates.push(`role_in_project = $${valueIndex++}`);
      values.push(normalizedRole);
    }

    if (skills !== undefined) {
      updates.push(`skills = $${valueIndex++}`);
      values.push(JSON.stringify(skills || []));
    }

    if (status !== undefined) {
      updates.push(`status = $${valueIndex++}`);
      values.push(status);
    }

    if (joinedDate !== undefined) {
      updates.push(`joined_date = $${valueIndex++}`);
      values.push(joinedDate);
    }

    let nextAllocation = null;
    if (workload_allocation !== undefined || contribution !== undefined) {
      const parsedAllocation = Number.parseInt(workload_allocation ?? contribution, 10);
      if (Number.isNaN(parsedAllocation) || parsedAllocation < 1 || parsedAllocation > 100) {
        return res.status(400).json({ success: false, error: 'workload_allocation must be between 1 and 100' });
      }

      const currentWorkload = Number.parseInt(existingMember.current_workload, 10);
      const existingAllocation = Number.parseInt(existingMember.existing_allocation, 10);
      const normalizedCurrentWorkload = Number.isNaN(currentWorkload) ? 0 : Math.max(0, currentWorkload);
      const normalizedExistingAllocation = Number.isNaN(existingAllocation) ? 0 : Math.max(0, existingAllocation);

      const projectedWorkload = normalizedCurrentWorkload - normalizedExistingAllocation + parsedAllocation;

      if (projectedWorkload > 100) {
        return res.status(400).json({
          success: false,
          error: `This would exceed workload capacity. Current workload: ${normalizedCurrentWorkload}%, requested: ${parsedAllocation}%, maximum remaining for this change: ${100 - (normalizedCurrentWorkload - normalizedExistingAllocation)}%`
        });
      }

      nextAllocation = parsedAllocation;
      updates.push(`contribution_percentage = $${valueIndex++}`);
      values.push(parsedAllocation);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(projectId, memberId);

    const updateQuery = `
      UPDATE project_team_members 
      SET ${updates.join(', ')}
      WHERE project_id = $${valueIndex++} AND (user_id = $${valueIndex} OR id = $${valueIndex})
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    if (nextAllocation !== null) {
      const existingAllocation = Number.parseInt(existingMember.existing_allocation, 10);
      const normalizedExistingAllocation = Number.isNaN(existingAllocation) ? 0 : Math.max(0, existingAllocation);

      await query(
        'UPDATE users SET current_workload = MAX(0, COALESCE(current_workload, 0) - $1 + $2) WHERE id = $3',
        [normalizedExistingAllocation, nextAllocation, existingMember.user_id]
      );
    }

    console.log(`✅ Updated member ${memberId} in project ${projectId}`);

    res.json({
      success: true,
      message: 'Team member updated',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id/team/:memberId', auth, async (req, res) => {
  try {
    const { id: projectId, memberId } = req.params;
    console.log(`🗑️ DELETE /api/projects/${projectId}/team/${memberId}`);

    // Get member record and workload before deleting. Accept both user_id and team row id.
    const memberResult = await query(
      `SELECT u.name, ptm.contribution_percentage as workload_allocation, ptm.id as team_row_id, ptm.user_id
       FROM users u JOIN project_team_members ptm ON u.id = ptm.user_id
       WHERE ptm.project_id = $1 AND (ptm.user_id = $2 OR ptm.id = $2)
       LIMIT 1`,
      [projectId, memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Delete member
    await query(
      'DELETE FROM project_team_members WHERE project_id = $1 AND id = $2',
      [projectId, memberResult.rows[0].team_row_id]
    );

    // Restore workload capacity
    const alloc = memberResult.rows[0].workload_allocation || 0;
    if (alloc > 0) {
      await query(
        'UPDATE users SET current_workload = MAX(0, current_workload - $1) WHERE id = $2',
        [alloc, memberResult.rows[0].user_id]
      );
    }

    console.log(`✅ Removed member ${memberId} from project ${projectId}`);

    res.json({
      success: true,
      message: `${memberResult.rows[0].name} removed from project`
    });

  } catch (error) {
    console.error('❌ Error removing member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/:id/analytics', auth, asyncHandler(projectController.getProjectAnalytics));
router.post('/:id/feedback', auth, feedbackController.submitFeedback);
router.get('/:id/feedback', auth, feedbackController.getProjectFeedback);

// Comment routes
router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, addComment);
router.put('/:id/comments/:commentId', auth, updateComment);
router.delete('/:id/comments/:commentId', auth, deleteComment);

// Route for team member selection


module.exports = router;