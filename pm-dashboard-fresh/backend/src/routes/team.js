const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireProjectManager } = require('../middleware/rbac');
const teamController = require('../controllers/teamController');
const { asyncHandler } = require('../middleware/errorHandler');

// Import database connection
const { query } = require('../config/database');

// Apply authentication to all routes
router.use(auth);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Team routes are working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/team/project-manager',
      'POST /api/team/assign',
      'POST /api/team/remove',
      'GET /api/team/project-manager/dashboard'
    ]
  });
});

// Simple database initialization - create tables if they don't exist
const initializeTeamTables = async () => {
  try {
    console.log('🔄 Initializing team management tables...');

    // Create team assignments table with basic structure
    await query(`
      CREATE TABLE IF NOT EXISTS team_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_manager_id INTEGER NOT NULL,
        team_member_id INTEGER NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        CONSTRAINT unique_project_manager_member UNIQUE(project_manager_id, team_member_id)
      )
    `);

    console.log('✅ Team management tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing team management tables:', error);
  }
};

// Initialize tables on module load
initializeTeamTables();

// GET /api/team/project-manager - EXACTLY matches apiService.getProjectManagerTeam()
router.get('/project-manager', 
  requireProjectManager(),
  async (req, res) => {
    try {
      const projectManagerId = req.user.id;
      
      console.log(`📋 [GET /api/team/project-manager] Loading team for project manager ${projectManagerId}`);

      // Get assigned team members
      const teamQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          COALESCE(u.current_workload, 0) as current_workload,
          u.created_at,
          ta.assigned_at,
          ta.status as assignment_status,
          ta.notes,
          COUNT(DISTINCT CASE WHEN COALESCE(ptm.status, 'active') = 'active' THEN ptm.project_id END) as active_projects,
          COUNT(DISTINCT CASE WHEN cdg.status = 'active' THEN cdg.id END) as career_goals
        FROM team_assignments ta
        JOIN users u ON ta.team_member_id = u.id
        LEFT JOIN project_team_members ptm ON ptm.user_id = u.id
        LEFT JOIN career_development_goals cdg ON cdg.user_id = u.id
        WHERE ta.project_manager_id = $1 AND ta.status = 'active'
        GROUP BY u.id, u.name, u.email, u.role, u.current_workload, u.created_at, ta.assigned_at, ta.status, ta.notes
        ORDER BY ta.assigned_at DESC
      `;

      const teamResult = await query(teamQuery, [projectManagerId]);

      // Get unassigned/available team members (not yet assigned to this project manager)
      const unassignedQuery = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          COALESCE(u.current_workload, 0) as current_workload,
          u.created_at,
          COUNT(DISTINCT CASE WHEN COALESCE(ptm.status, 'active') = 'active' THEN ptm.project_id END) as active_projects,
          COUNT(DISTINCT CASE WHEN cdg.status = 'active' THEN cdg.id END) as career_goals
        FROM users u
        LEFT JOIN team_assignments ta ON u.id = ta.team_member_id AND ta.project_manager_id = $1 AND ta.status = 'active'
        LEFT JOIN project_team_members ptm ON ptm.user_id = u.id
        LEFT JOIN career_development_goals cdg ON cdg.user_id = u.id
        WHERE ta.team_member_id IS NULL
          AND u.id != $1
          AND u.role IS NOT NULL
        GROUP BY u.id, u.name, u.email, u.role, u.current_workload, u.created_at
        ORDER BY u.name
      `;

      const unassignedResult = await query(unassignedQuery, [projectManagerId]);

      console.log(`✅ Found ${teamResult.rows.length} team members and ${unassignedResult.rows.length} unassigned`);

      // Return data in the exact format the frontend expects
      res.json({
        success: true,
        data: {
          teamMembers: teamResult.rows.map(member => ({
            ...member,
            current_workload: parseInt(member.current_workload, 10) || 0,
            active_projects: parseInt(member.active_projects) || 0,
            career_goals: parseInt(member.career_goals) || 0,
            projectCount: parseInt(member.active_projects) || 0
          })),
          unassignedMembers: unassignedResult.rows.map(member => ({
            ...member,
            current_workload: parseInt(member.current_workload, 10) || 0,
            active_projects: parseInt(member.active_projects) || 0,
            career_goals: parseInt(member.career_goals) || 0
          })),
          totalTeamSize: teamResult.rows.length
        }
      });

    } catch (error) {
      console.error('❌ Error loading project manager team:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load team data',
        error: error.message
      });
    }
  }
);

// POST /api/team/assign - EXACTLY matches apiService.assignTeamMembers(memberIds)
router.post('/assign', 
  requireProjectManager(),
  async (req, res) => {
    try {
      const projectManagerId = req.user.id;
      const { memberIds } = req.body;

      console.log(`📥 [POST /api/team/assign] Request from project manager ${projectManagerId}:`, req.body);

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to assign'
        });
      }

      // Ensure memberIds are integers
      const memberIdsAsInts = memberIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      
      if (memberIdsAsInts.length !== memberIds.length) {
        return res.status(400).json({
          success: false,
          message: 'All member IDs must be valid integers'
        });
      }

      console.log(`👥 Assigning ${memberIdsAsInts.length} members to project manager ${projectManagerId}`);

      // Process each member individually to avoid any array type issues
      const results = [];
      let assignmentCount = 0;

      for (const memberId of memberIdsAsInts) {
        try {
          // First verify user exists and is eligible
          const verifyQuery = `
            SELECT id, name, role, email
            FROM users 
            WHERE id = $1 
              AND role IS NOT NULL
          `;
          const verifyResult = await query(verifyQuery, [memberId]);
          
          if (verifyResult.rows.length === 0) {
            console.log(`⚠️ User ${memberId} not found or not eligible`);
            continue;
          }

          // Assign the team member
          const assignQuery = `
            INSERT INTO team_assignments (project_manager_id, team_member_id, assigned_at, status)
            VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')
            ON CONFLICT (project_manager_id, team_member_id) 
            DO UPDATE SET 
              status = 'active',
              assigned_at = CURRENT_TIMESTAMP
            RETURNING *
          `;
          
          await query(assignQuery, [projectManagerId, memberId]);

          // Also keep team_members table in sync
          try {
            await query(`
              INSERT INTO team_members (user_id, project_manager_id, added_by, notes, added_date, status)
              VALUES ($1, $2, $3, '', CURRENT_TIMESTAMP, 'active')
              ON CONFLICT (project_manager_id, user_id)
              DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP
            `, [memberId, projectManagerId, projectManagerId]);
          } catch (tmErr) {
            console.warn('Sync to team_members note:', tmErr.message);
          }
          
          results.push(verifyResult.rows[0]);
          assignmentCount++;
          
          console.log(`✅ Assigned member ${verifyResult.rows[0].name} (ID: ${memberId})`);
          
        } catch (assignError) {
          console.warn(`⚠️ Failed to assign member ${memberId}:`, assignError.message);
        }
      }

      console.log(`✅ Successfully assigned ${assignmentCount} team members`);

      // Return data in the exact format the frontend expects
      res.json({
        success: true,
        message: `Successfully assigned ${assignmentCount} team members`,
        data: {
          assignedMembers: results,
          assignedCount: assignmentCount,
          projectsAssigned: 0 // Simplified for now
        }
      });

    } catch (error) {
      console.error('❌ Error assigning team members:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({
          success: false,
          message: 'Some team members are already assigned'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to assign team members',
          error: error.message
        });
      }
    }
  }
);

// POST /api/team/remove - EXACTLY matches apiService.removeTeamMembers(memberIds)
router.post('/remove', 
  requireProjectManager(),
  async (req, res) => {
    try {
      const projectManagerId = req.user.id;
      const { memberIds } = req.body;

      console.log(`📤 [POST /api/team/remove] Request from project manager ${projectManagerId}:`, req.body);

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to remove'
        });
      }

      // Ensure memberIds are integers
      const memberIdsAsInts = memberIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      console.log(`🗑️ Removing ${memberIdsAsInts.length} members from project manager ${projectManagerId}`);

      const validAssignments = [];
      let removedCount = 0;

      // Process each member individually
      for (const memberId of memberIdsAsInts) {
        try {
          // Verify the assignment exists
          const checkQuery = `
            SELECT ta.*, u.name, u.email
            FROM team_assignments ta
            JOIN users u ON ta.team_member_id = u.id
            WHERE ta.project_manager_id = $1 AND ta.team_member_id = $2 AND ta.status = 'active'
          `;
          const checkResult = await query(checkQuery, [projectManagerId, memberId]);
          
          if (checkResult.rows.length === 0) {
            console.log(`⚠️ No active assignment found for member ${memberId}`);
            continue;
          }

          // Remove the assignment
          const unassignQuery = `
            UPDATE team_assignments 
            SET status = 'inactive', assigned_at = CURRENT_TIMESTAMP
            WHERE project_manager_id = $1 AND team_member_id = $2
            RETURNING *
          `;
          await query(unassignQuery, [projectManagerId, memberId]);

          // Also keep team_members table in sync
          try {
            await query(`
              UPDATE team_members
              SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
              WHERE project_manager_id = $1 AND user_id = $2
            `, [projectManagerId, memberId]);
          } catch (tmErr) {
            console.warn('Sync to team_members note:', tmErr.message);
          }

          // Cascade: remove team member from all projects owned by this PM
          await query(
            `DELETE FROM project_team_members
             WHERE user_id = $1
               AND project_id IN (SELECT id FROM projects WHERE created_by = $2)`,
            [memberId, projectManagerId]
          );

          validAssignments.push(checkResult.rows[0]);
          removedCount++;
          
          console.log(`✅ Removed member ${checkResult.rows[0].name} (ID: ${memberId})`);
          
        } catch (removeError) {
          console.warn(`⚠️ Failed to remove member ${memberId}:`, removeError.message);
        }
      }

      if (validAssignments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No team member assignments found to remove'
        });
      }

      console.log(`✅ Successfully unassigned ${removedCount} members`);

      // Return data in the exact format the frontend expects
      res.json({
        success: true,
        message: `Successfully removed ${removedCount} team members`,
        data: {
          removedMembers: validAssignments,
          removedCount: removedCount,
          projectsRemoved: 0 // Simplified for now
        }
      });

    } catch (error) {
      console.error('❌ Error removing team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove team members',
        error: error.message
      });
    }
  }
);

// GET /api/team/project-manager/dashboard - EXACTLY matches apiService.getProjectManagerDashboard()
router.get('/project-manager/dashboard', 
  requireProjectManager(),
  async (req, res) => {
    try {
      const projectManagerId = req.user.id;

      console.log(`📊 [GET /api/team/project-manager/dashboard] Loading analytics for project manager ${projectManagerId}`);

      const teamSizeQuery = `
        SELECT COUNT(DISTINCT ta.team_member_id) AS team_size
        FROM team_assignments ta
        WHERE ta.project_manager_id = $1 AND ta.status = 'active'
      `;

      const projectsQuery = `
        SELECT DISTINCT
          p.id,
          p.updated_at,
          COALESCE(p.pm_progress, 0) AS pm_progress,
          COALESCE(p.leadership_progress, 0) AS leadership_progress,
          COALESCE(p.change_mgmt_progress, 0) AS change_mgmt_progress,
          COALESCE(p.career_dev_progress, 0) AS career_dev_progress
        FROM projects p
        LEFT JOIN project_team_members ptm
          ON ptm.project_id = p.id AND ptm.user_id = $1
        WHERE p.created_by = $1
           OR p.created_by IN (
             SELECT ta.team_member_id
             FROM team_assignments ta
             WHERE ta.project_manager_id = $1 AND ta.status = 'active'
           )
           OR ptm.user_id IS NOT NULL
      `;

      const [teamSizeResult, projectsResult] = await Promise.all([
        query(teamSizeQuery, [projectManagerId]),
        query(projectsQuery, [projectManagerId])
      ]);

      const projects = projectsResult.rows;
      const teamSize = parseInt(teamSizeResult.rows[0]?.team_size || 0, 10);
      const totalProjects = projects.length;

      const averageProgress = totalProjects > 0
        ? Math.round(
            projects.reduce((sum, project) => {
              const projectAverage = (
                Number(project.pm_progress) +
                Number(project.leadership_progress) +
                Number(project.change_mgmt_progress) +
                Number(project.career_dev_progress)
              ) / 4;
              return sum + projectAverage;
            }, 0) / totalProjects
          )
        : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentActivity = projects.filter((project) => {
        if (!project.updated_at) {
          return false;
        }
        return new Date(project.updated_at) >= thirtyDaysAgo;
      }).length;

      console.log(
        `✅ Loaded analytics for project manager ${projectManagerId}: ` +
        `teamSize=${teamSize}, totalProjects=${totalProjects}, averageProgress=${averageProgress}, recentActivity=${recentActivity}`
      );

      res.json({
        success: true,
        data: {
          teamSize,
          totalProjects,
          averageProgress,
          recentActivity
        }
      });

    } catch (error) {
      console.error('❌ Error loading team analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load team analytics',
        error: error.message
      });
    }
  }
);

// EXISTING ROUTES (keeping for backward compatibility)
// These are commented out to avoid conflicts for now

/*
router.get('/', 
  requireProjectManager(),
  asyncHandler(teamController.getAllTeamMembers)
);

router.get('/my-team', 
  requireProjectManager(),
  asyncHandler(teamController.getProjectManagerTeam)
);

router.get('/available', 
  requireProjectManager(),
  asyncHandler(teamController.getAvailableTeamMembers)
);

router.post('/members', 
  requireProjectManager(),
  asyncHandler(teamController.addProjectManagerTeamMember)
);

router.get('/members/:userId', 
  requireProjectManager(),
  asyncHandler(teamController.getProjectManagerTeamMemberDetails)
);

router.put('/members/:userId', 
  requireProjectManager(),
  asyncHandler(teamController.updateProjectManagerTeamMember)
);

router.delete('/members/:userId', 
  requireProjectManager(),
  asyncHandler(teamController.removeProjectManagerTeamMember)
);
*/

module.exports = router;