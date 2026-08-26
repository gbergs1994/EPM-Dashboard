const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

class TeamManagementController {
  // Get project manager's team members
  getProjectManagerTeam = async (req, res) => {
    try {
      const projectManagerId = req.user?.id || 1; // Use authenticated user ID
      
      console.log('Getting project manager team for user:', projectManagerId);
      
      // Get team members assigned to this project manager
      const teamMembersQuery = `
        SELECT id, name, email, role, created_at, updated_at,
               project_manager_id
        FROM users 
        WHERE project_manager_id = $1
        ORDER BY name ASC
      `;
      
      const teamMembersResult = await query(teamMembersQuery, [projectManagerId]);
      const teamMembers = teamMembersResult.rows;
      
      // Get unassigned team members (no project manager assigned yet)
      const unassignedQuery = `
        SELECT id, name, email, role, created_at, updated_at
        FROM users 
        WHERE project_manager_id IS NULL 
          AND role IN ('Team Member', 'Manager')
          AND id != $1
        ORDER BY name ASC
      `;
      
      const unassignedResult = await query(unassignedQuery, [projectManagerId]);
      const unassignedMembers = unassignedResult.rows;
      
      // Get project count for each team member
      const enhancedTeamMembers = await Promise.all(
        teamMembers.map(async (member) => {
          const projectCountQuery = `
            SELECT COUNT(DISTINCT p.id) as project_count
            FROM projects p
            LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
            WHERE ptm.user_id = $1 OR p.created_by = $1
          `;
          const projectCountResult = await query(projectCountQuery, [member.id]);
          
          return {
            ...member,
            projectCount: parseInt(projectCountResult.rows[0]?.project_count || 0)
          };
        })
      );
      
      console.log(`Found ${teamMembers.length} team members and ${unassignedMembers.length} unassigned`);
      
      res.json({
        success: true,
        data: {
          teamMembers: enhancedTeamMembers,
          unassignedMembers,
          totalTeamSize: teamMembers.length
        }
      });
      
    } catch (error) {
      console.error('Error getting project manager team:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project manager team data'
      });
    }
  };

  // Assign team members to project manager
  assignTeamMembers = async (req, res) => {
    try {
      const projectManagerId = req.user?.id || 1;
      const { memberIds } = req.body;
      
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to assign'
        });
      }
      
      console.log(`Assigning ${memberIds.length} members to project manager ${projectManagerId}`);
      
      // Start transaction
      await query('BEGIN');
      
      try {
        // Update users to assign them to this project manager
        const updateQuery = `
        UPDATE users 
        SET project_manager_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($2::int[]) 
            AND role IN ('Team Member', 'Manager', 'Developer', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Business Analyst', 'Team Lead', 'DevOps Engineer')
            AND (project_manager_id IS NULL OR project_manager_id != $1)
        RETURNING id, name, email
        `;
        
        const result = await query(updateQuery, [projectManagerId, memberIds]);
        const assignedMembers = result.rows;
        
        // Auto-assign project manager to existing projects by these team members
        if (assignedMembers.length > 0) {
          const assignedMemberIds = assignedMembers.map(m => m.id);
          
          // Find projects created by newly assigned members
          const projectsQuery = `
            SELECT id, name, created_by
            FROM projects 
            WHERE created_by = ANY($1::int[])
          `;
          const projectsResult = await query(projectsQuery, [assignedMemberIds]);
          
          // Add project manager to each project's team if not already there
          for (const project of projectsResult.rows) {
            const addToTeamQuery = `
              INSERT INTO project_team_members (project_id, user_id, role_in_project, contribution_percentage, tasks_completed, joined_date)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (project_id, user_id) DO NOTHING
            `;
            
            await query(addToTeamQuery, [
              project.id,
              projectManagerId,
              'Project Manager Oversight',
              0,
              0,
              new Date().toISOString().split('T')[0]
            ]);
          }
          
          console.log(`Auto-assigned project manager to ${projectsResult.rows.length} existing projects`);
        }
        
        await query('COMMIT');
        
        res.json({
          success: true,
          message: `Successfully assigned ${assignedMembers.length} team members`,
          data: { 
            assignedMembers,
            assignedCount: assignedMembers.length 
          }
        });
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error assigning team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign team members'
      });
    }
  };

  // Remove team members from project manager
  removeTeamMembers = async (req, res) => {
    try {
      const projectManagerId = req.user?.id || 1;
      const { memberIds } = req.body;
      
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of member IDs to remove'
        });
      }
      
      console.log(`Removing ${memberIds.length} members from project manager ${projectManagerId}`);
      
      await query('BEGIN');
      
      try {
        // Remove project manager assignment
        const updateQuery = `
          UPDATE users 
          SET project_manager_id = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) 
            AND project_manager_id = $2
          RETURNING id, name, email
        `;
        
        const result = await query(updateQuery, [memberIds, projectManagerId]);
        const removedMembers = result.rows;
        
        // Remove project manager from projects they were auto-assigned to
        if (removedMembers.length > 0) {
          const removeFromProjectsQuery = `
            DELETE FROM project_team_members 
            WHERE user_id = $1 
              AND role_in_project = 'Project Manager Oversight'
              AND project_id IN (
                SELECT id FROM projects WHERE created_by = ANY($2::int[])
              )
          `;
          
          const deleteResult = await query(removeFromProjectsQuery, [projectManagerId, memberIds]);
          console.log(`Removed project manager from ${deleteResult.rowCount} projects`);
        }
        
        await query('COMMIT');
        
        res.json({
          success: true,
          message: `Successfully removed ${removedMembers.length} team members`,
          data: { 
            removedMembers,
            removedCount: removedMembers.length 
          }
        });
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error removing team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove team members'
      });
    }
  };

  // Get project manager dashboard analytics
  getProjectManagerDashboard = async (req, res) => {
    try {
      const projectManagerId = req.user?.id || 1;
      
      console.log('Getting project manager dashboard for user:', projectManagerId);
      
      // Get team member count
      const teamCountQuery = `
        SELECT COUNT(*) as team_count
        FROM users 
        WHERE project_manager_id = $1
      `;
      const teamCountResult = await query(teamCountQuery, [projectManagerId]);
      const teamSize = parseInt(teamCountResult.rows[0]?.team_count || 0);
      
      // Get team projects and their status
      const projectsQuery = `
        SELECT p.id, p.name, p.status, p.priority, p.pm_progress,
               p.leadership_progress, p.change_mgmt_progress, p.career_dev_progress,
               p.created_at, p.updated_at, u.name as creator_name
        FROM projects p
        INNER JOIN users u ON p.created_by = u.id
        WHERE u.project_manager_id = $1
        ORDER BY p.updated_at DESC
      `;
      
      const projectsResult = await query(projectsQuery, [projectManagerId]);
      const teamProjects = projectsResult.rows;
      
      // Calculate project statistics
      const projectStats = teamProjects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {});
      
      // Calculate average progress
      const totalProgress = teamProjects.reduce((sum, project) => {
        const avgProgress = (
          (project.pm_progress || 0) + 
          (project.leadership_progress || 0) + 
          (project.change_mgmt_progress || 0) + 
          (project.career_dev_progress || 0)
        ) / 4;
        return sum + avgProgress;
      }, 0);
      
      const averageProgress = teamProjects.length > 0 
        ? Math.round((totalProgress / teamProjects.length / 7) * 100)
        : 0;
      
      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentActivity = teamProjects.filter(p => 
        new Date(p.updated_at) >= thirtyDaysAgo
      ).length;
      
      const dashboardData = {
        teamSize,
        totalProjects: teamProjects.length,
        projectStats,
        averageProgress,
        recentActivity,
        metrics: {
          activeProjects: projectStats.active || 0,
          completedProjects: projectStats.completed || 0,
          onHoldProjects: projectStats.on_hold || 0,
          planningProjects: projectStats.planning || 0
        }
      };
      
      console.log('Project Manager dashboard data:', dashboardData);
      
      res.json({
        success: true,
        data: dashboardData
      });
      
    } catch (error) {
      console.error('Error getting project manager dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project manager dashboard data'
      });
    }
  };
}

module.exports = new TeamManagementController();