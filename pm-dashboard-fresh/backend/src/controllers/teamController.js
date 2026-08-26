// backend/src/controllers/teamController.js
const { query } = require('../config/database');

// ========================================
// PROJECT TEAM MANAGEMENT (Existing functionality)
// ========================================

// Add team member to project
const addTeamMember = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { userId, id, role, contribution } = req.body;
    const memberId = userId || id; 

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user exists
    const userCheck = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is already a team member
    const existingMember = await query(
      'SELECT id FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already a team member'
      });
    }

    // Add team member
    const addMemberQuery = `
      INSERT INTO project_team_members (project_id, user_id, role_in_project, contribution_percentage, tasks_completed)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING id
    `;

    await query(addMemberQuery, [
      projectId,
      userId,
      role || 'Team Member',
      contribution || 0
    ]);

    const user = userCheck.rows[0];
    console.log(`âœ… Added ${user.name} to project ${projectId} team`);

    res.json({
      success: true,
      message: `${user.name} has been added to the project team`
    });

  } catch (error) {
    console.error('âŒ Error adding team member to project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add team member'
    });
  }
};

// Remove team member from project
const removeTeamMember = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.params.userId || req.params.memberId;

    // Get member info before removing
    const memberQuery = `
      SELECT u.name 
      FROM users u
      JOIN project_team_members ptm ON u.id = ptm.user_id
      WHERE ptm.project_id = $1 AND ptm.user_id = $2
    `;

    const memberResult = await query(memberQuery, [projectId, userId]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team member not found in this project'
      });
    }

    const memberName = memberResult.rows[0].name;

    // Remove team member
    await query(
      'DELETE FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    console.log(`âœ… Removed ${memberName} from project ${projectId} team`);

    res.json({
      success: true,
      message: `${memberName} has been removed from the project team`
    });

  } catch (error) {
    console.error('âŒ Error removing team member from project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member'
    });
  }
};

// Update team member in project
const updateTeamMember = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.params.userId || req.params.memberId;
    const { role, contribution, tasks } = req.body;

    // Check if member exists in project
    const memberCheck = await query(
      'SELECT id FROM project_team_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team member not found in this project'
      });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    if (role !== undefined) {
      updateFields.push(`role_in_project = $${valueIndex}`);
      values.push(role);
      valueIndex++;
    }

    if (contribution !== undefined) {
      updateFields.push(`contribution_percentage = $${valueIndex}`);
      values.push(contribution);
      valueIndex++;
    }

    if (tasks !== undefined) {
      updateFields.push(`tasks_completed = $${valueIndex}`);
      values.push(tasks);
      valueIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Add project_id and user_id for WHERE clause
    values.push(projectId, userId);

    const updateQuery = `
      UPDATE project_team_members 
      SET ${updateFields.join(', ')}
      WHERE project_id = $${valueIndex} AND user_id = $${valueIndex + 1}
      RETURNING role_in_project, contribution_percentage, tasks_completed
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      message: 'Team member updated successfully',
      updatedMember: result.rows[0]
    });

  } catch (error) {
    console.error('âŒ Error updating team member in project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team member'
    });
  }
};

// Get project team members
const getProjectTeam = async (req, res) => {
  try {
    const projectId = req.params.id || req.params.projectId;

    const teamQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role as user_role,
        ptm.role_in_project,
        ptm.contribution_percentage,
        ptm.tasks_completed,
        COUNT(DISTINCT cdg.id) as career_goals_count
      FROM project_team_members ptm
      JOIN users u ON ptm.user_id = u.id
      LEFT JOIN career_development_goals cdg ON u.id = cdg.user_id AND cdg.status = 'active'
      WHERE ptm.project_id = $1
      GROUP BY u.id, u.name, u.email, u.role, ptm.role_in_project, ptm.contribution_percentage, ptm.tasks_completed
      ORDER BY u.name
    `;

    const result = await query(teamQuery, [projectId]);

    res.json({
      success: true,
      team: result.rows.map(member => ({
        ...member,
        career_goals_count: parseInt(member.career_goals_count) || 0
      }))
    });

  } catch (error) {
    console.error('âŒ Error getting project team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project team'
    });
  }
};

// ========================================
// PROJECT MANAGER TEAM MANAGEMENT (New RBAC functionality)
// ========================================

// Get project manager's team
const getProjectManagerTeam = async (req, res) => {
  try {
    const projectManagerId = req.user.id;

    // Verify user is an project manager
    const userCheck = await query('SELECT role FROM users WHERE id = $1', [projectManagerId]);
    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'Project Manager') {
      return res.status(403).json({
        success: false,
        error: 'Only Project Managers can access team management'
      });
    }

    const teamQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        tm.added_date,
        tm.status,
        tm.notes,
        COUNT(DISTINCT ptm.project_id) as active_projects,
        COUNT(DISTINCT cdg.id) as career_goals,
        AVG(CASE WHEN p.status != 'completed' THEN p.progress END) as avg_project_progress
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
      LEFT JOIN projects p ON ptm.project_id = p.id AND p.status != 'completed'
      LEFT JOIN career_development_goals cdg ON u.id = cdg.user_id AND cdg.status = 'active'
      WHERE tm.project_manager_id = $1 AND tm.status = 'active'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at, tm.added_date, tm.status, tm.notes
      ORDER BY u.name
    `;

    const result = await query(teamQuery, [projectManagerId]);

    res.json({
      success: true,
      team: result.rows.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        joinedTeam: member.added_date,
        status: member.status,
        notes: member.notes,
        stats: {
          activeProjects: parseInt(member.active_projects) || 0,
          careerGoals: parseInt(member.career_goals) || 0,
          avgProgress: parseFloat(member.avg_project_progress) || 0
        }
      }))
    });

  } catch (error) {
    console.error('âŒ Error getting project manager team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team members'
    });
  }
};

// Get available users to add to project manager team
const getAvailableTeamMembers = async (req, res) => {
  try {
    const projectManagerId = req.user.id;

    // Get users who are not already in any team
    const availableUsersQuery = `
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             COUNT(DISTINCT p.id) as project_count
      FROM users u
      LEFT JOIN team_members tm ON u.id = tm.user_id AND tm.status = 'active'
      LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
      LEFT JOIN projects p ON ptm.project_id = p.id
      WHERE tm.user_id IS NULL 
        AND u.id != $1 
        AND u.role = 'Team Member'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.name
    `;

    const result = await query(availableUsersQuery, [projectManagerId]);

    res.json({
      success: true,
      availableUsers: result.rows.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        projectCount: parseInt(user.project_count) || 0
      }))
    });

  } catch (error) {
    console.error('âŒ Error getting available users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available users'
    });
  }
};

// Add user to project manager team
const addProjectManagerTeamMember = async (req, res) => {
  try {
    const projectManagerId = req.user.id;
    const { userId, notes } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user exists and is a team member
    const userCheck = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND role = $2',
      [userId, 'Team Member']
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found or not a team member'
      });
    }

    // Check if user is already in a team
    const existingTeamCheck = await query(
      'SELECT project_manager_id FROM team_members WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (existingTeamCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already assigned to a team'
      });
    }

    // Add user to team
    const addQuery = `
      INSERT INTO team_members (user_id, project_manager_id, added_by, notes, added_date, status)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'active')
      RETURNING id
    `;

    await query(addQuery, [userId, projectManagerId, projectManagerId, notes || '']);

    const user = userCheck.rows[0];

    console.log(`âœ… Added ${user.name} to project manager team of ${projectManagerId}`);

    res.json({
      success: true,
      message: `${user.name} has been added to your team`,
      addedUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('âŒ Error adding project manager team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add team member'
    });
  }
};

// Remove user from project manager team
const removeProjectManagerTeamMember = async (req, res) => {
  try {
    const projectManagerId = req.user.id;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user is in this project manager's team
    const teamMemberCheck = await query(
      `SELECT tm.id, u.name 
       FROM team_members tm 
       JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = $1 AND tm.project_manager_id = $2 AND tm.status = 'active'`,
      [userId, projectManagerId]
    );

    if (teamMemberCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User is not in your team'
      });
    }

    // Update status to inactive instead of deleting
    const removeQuery = `
      UPDATE team_members 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND project_manager_id = $2 AND status = 'active'
    `;

    await query(removeQuery, [userId, projectManagerId]);

    const userName = teamMemberCheck.rows[0].name;

    console.log(`âœ… Removed ${userName} from project manager team of ${projectManagerId}`);

    res.json({
      success: true,
      message: `${userName} has been removed from your team`
    });

  } catch (error) {
    console.error('âŒ Error removing project manager team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member'
    });
  }
};

// Update project manager team member notes
const updateProjectManagerTeamMember = async (req, res) => {
  try {
    const projectManagerId = req.user.id;
    const { userId } = req.params;
    const { notes } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user is in this project manager's team
    const teamMemberCheck = await query(
      `SELECT tm.id, u.name 
       FROM team_members tm 
       JOIN users u ON tm.user_id = u.id
       WHERE tm.user_id = $1 AND tm.project_manager_id = $2 AND tm.status = 'active'`,
      [userId, projectManagerId]
    );

    if (teamMemberCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User is not in your team'
      });
    }

    // Update notes
    const updateQuery = `
      UPDATE team_members 
      SET notes = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND project_manager_id = $3 AND status = 'active'
    `;

    await query(updateQuery, [notes || '', userId, projectManagerId]);

    const userName = teamMemberCheck.rows[0].name;

    console.log(`âœ… Updated notes for ${userName} in project manager team of ${projectManagerId}`);

    res.json({
      success: true,
      message: `Notes updated for ${userName}`
    });

  } catch (error) {
    console.error('âŒ Error updating project manager team member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team member'
    });
  }
};

// Get project manager team member details
const getProjectManagerTeamMemberDetails = async (req, res) => {
  try {
    const projectManagerId = req.user.id;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if user is in this project manager's team
    const teamMemberQuery = `
      SELECT 
        u.id, u.name, u.email, u.role, u.created_at,
        tm.added_date, tm.notes, tm.status,
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        COUNT(DISTINCT cdg.id) as total_career_goals,
        COUNT(DISTINCT CASE WHEN cdg.status = 'completed' THEN cdg.id END) as completed_goals
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
      LEFT JOIN projects p ON ptm.project_id = p.id
      LEFT JOIN career_development_goals cdg ON u.id = cdg.user_id
      WHERE tm.user_id = $1 AND tm.project_manager_id = $2 AND tm.status = 'active'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at, tm.added_date, tm.notes, tm.status
    `;

    const result = await query(teamMemberQuery, [userId, projectManagerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User is not in your team'
      });
    }

    const member = result.rows[0];

    // Get recent career development goals
    const careerGoalsQuery = `
      SELECT id, title, category, current_level, target_level, 
             current_progress, status, target_date
      FROM career_development_goals
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const careerGoalsResult = await query(careerGoalsQuery, [userId]);

    // Get recent projects
    const projectsQuery = `
      SELECT p.id, p.name, p.status, p.priority, p.progress,
             ptm.role_in_project, ptm.contribution_percentage
      FROM projects p
      JOIN project_team_members ptm ON p.id = ptm.project_id
      WHERE ptm.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 5
    `;

    const projectsResult = await query(projectsQuery, [userId]);

    res.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        joinedTeam: member.added_date,
        notes: member.notes,
        stats: {
          totalProjects: parseInt(member.total_projects) || 0,
          completedProjects: parseInt(member.completed_projects) || 0,
          totalCareerGoals: parseInt(member.total_career_goals) || 0,
          completedGoals: parseInt(member.completed_goals) || 0
        },
        recentCareerGoals: careerGoalsResult.rows,
        recentProjects: projectsResult.rows
      }
    });

  } catch (error) {
    console.error('âŒ Error getting project manager team member details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team member details'
    });
  }
};

// Get all team members (for general team overview)
const getAllTeamMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let teamQuery;
    let queryParams;

    if (userRole === 'Project Manager') {
      // Project Manager leaders see their team members
      teamQuery = `
        SELECT 
          u.id, u.name, u.email, u.role, u.created_at,
          COUNT(DISTINCT ptm.project_id) as project_count,
          AVG(ptm.contribution_percentage) as avg_contribution
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
        WHERE tm.project_manager_id = $1 AND tm.status = 'active'
        GROUP BY u.id, u.name, u.email, u.role, u.created_at
        ORDER BY u.name
      `;
      queryParams = [userId];
    } else {
      // Other users see general team info (limited)
      teamQuery = `
        SELECT 
          u.id, u.name, u.email, u.role, u.created_at,
          COUNT(DISTINCT ptm.project_id) as project_count
        FROM users u
        LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
        WHERE u.id != $1
        GROUP BY u.id, u.name, u.email, u.role, u.created_at
        ORDER BY u.name
        LIMIT 20
      `;
      queryParams = [userId];
    }

    const result = await query(teamQuery, queryParams);

    res.json({
      success: true,
      team: result.rows.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        created_at: member.created_at,
        project_count: parseInt(member.project_count) || 0,
        avg_contribution: parseFloat(member.avg_contribution) || 0
      })),
      userRole
    });

  } catch (error) {
    console.error('âŒ Error getting all team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team members'
    });
  }
};

module.exports = {
  // Project team management
  addTeamMember,
  removeTeamMember,
  updateTeamMember,
  getProjectTeam,
  
  // Project Manager team management  
  getProjectManagerTeam,
  getAvailableTeamMembers,
  addProjectManagerTeamMember,
  removeProjectManagerTeamMember,
  updateProjectManagerTeamMember,
  getProjectManagerTeamMemberDetails,
  
  // General team functions
  getAllTeamMembers
};