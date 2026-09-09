// backend/src/routes/teamManagement.js
// Routes that match exactly what the frontend apiService calls expect
const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Middleware to ensure authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Middleware to ensure project manager access
const requireProjectManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  if (req.user.role !== 'Project Manager') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Only Project Managers can manage teams.'
    });
  }

  next();
};

// POST /api/team/assign - EXACTLY matches apiService.assignTeamMembers(memberIds)
router.post('/assign', requireAuth, requireProjectManager, async (req, res) => {
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

    console.log(`👥 Assigning ${memberIds.length} members to project manager ${projectManagerId}`);

    // Verify all users exist and are eligible for assignment
    const placeholders = memberIds.map((_, i) => `$${i + 1}`).join(',');
    const verifyQuery = `
      SELECT id, name, role, email
      FROM users
      WHERE id IN (${placeholders})
        AND role IN ('Team Member', 'Executive Leader', 'Project Manager')
    `;
    const verifyResult = await query(verifyQuery, memberIds);

    if (verifyResult.rows.length !== memberIds.length) {
      console.log(`⚠️ Some users not found or not eligible. Expected ${memberIds.length}, found ${verifyResult.rows.length}`);
      return res.status(400).json({
        success: false,
        message: 'Some users are not eligible for team assignment'
      });
    }

    // Assign team members
    let assignmentCount = 0;
    for (const memberId of memberIds) {
      try {
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

        // Also keep team_members in sync
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

        assignmentCount++;
      } catch (assignError) {
        console.warn(`⚠️ Failed to assign member ${memberId}:`, assignError.message);
      }
    }

    // Auto-assign project manager to projects created by newly assigned team members
    const memberPlaceholders = memberIds.map((_, i) => `$${i + 2}`).join(',');
    const projectAssignQuery = `
      INSERT INTO project_team_members (project_id, user_id, role_in_project, joined_date)
      SELECT DISTINCT
        p.id,
        $1,
        'Project Manager Oversight',
        CURRENT_DATE
      FROM projects p
      WHERE p.created_by IN (${memberPlaceholders})
        AND NOT EXISTS (
          SELECT 1 FROM project_team_members ptm2
          WHERE ptm2.project_id = p.id AND ptm2.user_id = $1
        )
    `;

    const projectAssignResult = await query(projectAssignQuery, [projectManagerId, ...memberIds]);

    console.log(`✅ Successfully assigned ${assignmentCount} team members`);
    console.log(`✅ Auto-assigned project manager to ${projectAssignResult.rowCount} projects`);

    // Return data in the exact format the frontend expects
    res.json({
      success: true,
      message: `Successfully assigned ${assignmentCount} team members`,
      data: {
        assignedMembers: verifyResult.rows,
        assignedCount: assignmentCount,
        projectsAssigned: projectAssignResult.rowCount
      }
    });

  } catch (error) {
    console.error('❌ Error assigning team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign team members',
      details: error.message
    });
  }
});

// POST /api/team/remove - EXACTLY matches apiService.removeTeamMembers(memberIds)
router.post('/remove', requireAuth, requireProjectManager, async (req, res) => {
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

    console.log(`🗑️ Removing ${memberIds.length} members from project manager ${projectManagerId}`);

    // Verify the assignments exist and get member names
    const placeholders = memberIds.map((_, i) => `$${i + 2}`).join(',');
    const checkQuery = `
      SELECT ta.*, u.name, u.email
      FROM team_assignments ta
      JOIN users u ON ta.team_member_id = u.id
      WHERE ta.project_manager_id = $1 AND ta.team_member_id IN (${placeholders})
    `;
    const checkResult = await query(checkQuery, [projectManagerId, ...memberIds]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No assignments found for the specified members'
      });
    }

    // Remove assignments
    const removeQuery = `
      UPDATE team_assignments
      SET status = 'inactive', removed_at = CURRENT_TIMESTAMP
      WHERE project_manager_id = $1 AND team_member_id IN (${placeholders})
    `;
    await query(removeQuery, [projectManagerId, ...memberIds]);

    // Also update team_members table
    try {
      await query(`
        UPDATE team_members
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE project_manager_id = $1 AND user_id IN (${placeholders})
      `, [projectManagerId, ...memberIds]);
    } catch (tmErr) {
      console.warn('Sync to team_members note:', tmErr.message);
    }

    // Remove project manager from projects created by removed team members
    const projectRemoveQuery = `
      DELETE FROM project_team_members
      WHERE user_id = $1
        AND role_in_project = 'Project Manager Oversight'
        AND project_id IN (
          SELECT p.id FROM projects p WHERE p.created_by IN (${placeholders})
        )
    `;
    const projectRemoveResult = await query(projectRemoveQuery, [projectManagerId, ...memberIds]);

    console.log(`✅ Successfully removed ${checkResult.rows.length} team members`);
    console.log(`✅ Removed project manager from ${projectRemoveResult.rowCount} projects`);

    res.json({
      success: true,
      message: `Successfully removed ${checkResult.rows.length} team members`,
      data: {
        removedMembers: checkResult.rows,
        removedCount: checkResult.rows.length,
        projectsRemoved: projectRemoveResult.rowCount
      }
    });

  } catch (error) {
    console.error('❌ Error removing team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team members',
      details: error.message
    });
  }
});

// GET /api/team/project-manager - EXACTLY matches apiService.getProjectManagerTeam()
router.get('/project-manager', requireAuth, requireProjectManager, async (req, res) => {
  try {
    const projectManagerId = req.user.id;

    console.log(`👥 [GET /api/team/project-manager] Loading team for project manager ${projectManagerId}`);

    // Get assigned team members
    const teamQuery = `
      SELECT
        u.id, u.name, u.email, u.role, u.avatar,
        COALESCE(u.current_workload, 0) as current_workload,
        ta.assigned_at, ta.status,
        COALESCE(ta.notes, '') as notes,
        COUNT(DISTINCT CASE WHEN COALESCE(ptm.status, 'active') = 'active' THEN ptm.project_id END) as active_projects,
        COUNT(DISTINCT CASE WHEN cdg.status = 'active' THEN cdg.id END) as career_goals
      FROM team_assignments ta
      JOIN users u ON ta.team_member_id = u.id
      LEFT JOIN project_team_members ptm ON ptm.user_id = u.id
      LEFT JOIN career_development_goals cdg ON cdg.user_id = u.id
      WHERE ta.project_manager_id = $1 AND ta.status = 'active'
      GROUP BY u.id, u.name, u.email, u.role, u.avatar, u.current_workload, ta.assigned_at, ta.status, ta.notes
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
      WHERE u.role IN ('Team Member', 'Executive Leader', 'Project Manager')
        AND ta.team_member_id IS NULL
        AND u.id != $1
      GROUP BY u.id, u.name, u.email, u.role, u.current_workload, u.created_at
      ORDER BY u.name
    `;
    const unassignedResult = await query(unassignedQuery, [projectManagerId]);

    // Get team statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_members,
          COUNT(CASE WHEN u.role IN ('Project Manager', 'Executive Leader') THEN 1 END) as leaders,
          COUNT(CASE WHEN u.role = 'Team Member' THEN 1 END) as team_members,
        COUNT(CASE WHEN u.role = 'Business Analyst' THEN 1 END) as analysts
      FROM team_assignments ta
      JOIN users u ON ta.team_member_id = u.id
      WHERE ta.project_manager_id = $1 AND ta.status = 'active'
    `;
    const statsResult = await query(statsQuery, [projectManagerId]);

    const formattedMembers = teamResult.rows.map((member) => ({
      ...member,
      current_workload: parseInt(member.current_workload, 10) || 0,
      active_projects: parseInt(member.active_projects, 10) || 0,
      career_goals: parseInt(member.career_goals, 10) || 0,
      projectCount: parseInt(member.active_projects, 10) || 0
    }));

    const formattedUnassigned = unassignedResult.rows.map((member) => ({
      ...member,
      current_workload: parseInt(member.current_workload, 10) || 0,
      active_projects: parseInt(member.active_projects, 10) || 0,
      career_goals: parseInt(member.career_goals, 10) || 0,
      projectCount: parseInt(member.active_projects, 10) || 0
    }));

    res.json({
      success: true,
      data: {
        members: formattedMembers,
        teamMembers: formattedMembers,
        unassignedMembers: formattedUnassigned,
        totalTeamSize: formattedMembers.length,
        stats: statsResult.rows[0] || { total_members: 0, leaders: 0, developers: 0, analysts: 0 }
      }
    });

  } catch (error) {
    console.error('❌ Error loading project manager team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load project manager team',
      details: error.message
    });
  }
});

// GET /api/team/project-manager/dashboard - EXACTLY matches apiService.getProjectManagerDashboard()
router.get('/project-manager/dashboard', requireAuth, requireProjectManager, async (req, res) => {
  try {
    const projectManagerId = req.user.id;

    console.log(`📊 [GET /api/team/project-manager/dashboard] Loading analytics for project manager ${projectManagerId}`);

    // Get team member project activity
    const activityQuery = `
      SELECT
        u.name,
        COUNT(DISTINCT p.id) as active_projects,
        COUNT(DISTINCT ptm.project_id) as team_projects,
        AVG(p.pm_progress + p.leadership_progress + p.change_mgmt_progress + p.career_dev_progress) / 4.0 as avg_progress
      FROM team_assignments ta
      JOIN users u ON ta.team_member_id = u.id
      LEFT JOIN projects p ON p.created_by = u.id
      LEFT JOIN project_team_members ptm ON ptm.user_id = u.id
      WHERE ta.project_manager_id = $1 AND ta.status = 'active'
      GROUP BY u.id, u.name
      ORDER BY active_projects DESC
    `;
    const activityResult = await query(activityQuery, [projectManagerId]);

    // Get recent projects from team members
    const projectsQuery = `
      SELECT
        p.id, p.name, p.status, p.priority, p.deadline,
        u.name as creator_name,
        AVG(p.pm_progress + p.leadership_progress + p.change_mgmt_progress + p.career_dev_progress) / 4.0 as overall_progress
      FROM projects p
      JOIN users u ON p.created_by = u.id
      JOIN team_assignments ta ON ta.team_member_id = u.id AND ta.project_manager_id = $1 AND ta.status = 'active'
      WHERE p.status != 'completed'
      GROUP BY p.id, p.name, p.status, p.priority, p.deadline, u.name
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    const projectsResult = await query(projectsQuery, [projectManagerId]);

    res.json({
      success: true,
      data: {
        teamActivity: activityResult.rows,
        recentProjects: projectsResult.rows
      }
    });

  } catch (error) {
    console.error('❌ Error loading project manager dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load project manager dashboard',
      details: error.message
    });
  }
});

// Debug/Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Team management routes are working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/team/project-manager - Get team members',
      'POST /api/team/assign - Assign team members',
      'POST /api/team/remove - Remove team members',
      'GET /api/team/project-manager/dashboard - Get analytics'
    ]
  });
});

module.exports = router;