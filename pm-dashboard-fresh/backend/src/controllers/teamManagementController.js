const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

class TeamManagementController {
  // Get project manager's team members
  async getProjectManagerTeam(req, res) {
    try {
      const projectManagerId = req.user?.id || 1; // Use authenticated user ID
      
      console.log('Getting project manager team for user:', projectManagerId);
      
      // Get team members assigned to this project manager
      const teamMembersQuery = `
        SELECT u.id, u.name, u.email, u.role, u.created_at, u.updated_at,
               COALESCE(u.current_workload, 0) as current_workload,
               ta.assigned_at, ta.status as assignment_status
        FROM team_assignments ta
        JOIN users u ON ta.team_member_id = u.id
        WHERE ta.project_manager_id = $1 AND ta.status = 'active'
        ORDER BY u.name ASC
      `;
      
      const teamMembersResult = await query(teamMembersQuery, [projectManagerId]);
      const teamMembers = teamMembersResult.rows;
      
      // Get available team members (not yet assigned to this project manager)
      const unassignedQuery = `
        SELECT u.id, u.name, u.email, u.role, u.created_at, u.updated_at,
               COALESCE(u.current_workload, 0) as current_workload
        FROM users u
        LEFT JOIN team_assignments ta ON u.id = ta.team_member_id AND ta.project_manager_id = $1 AND ta.status = 'active'
        WHERE ta.team_member_id IS NULL 
          AND u.role IN ('Team Member', 'Executive Leader', 'Project Manager')
          AND u.id != $1
        ORDER BY u.name ASC
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
          members: enhancedTeamMembers,
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
  }

  // Assign team members to project manager
  async assignTeamMembers(req, res) {
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
        const assignedMembers = [];

        for (const memberId of memberIds) {
          // Verify user exists and is eligible
          const verifyQuery = `
            SELECT id, name, role, email
            FROM users
            WHERE id = $1
              AND role IN ('Team Member', 'Executive Leader', 'Project Manager')
          `;
          const verifyResult = await query(verifyQuery, [memberId]);

          if (verifyResult.rows.length === 0) continue;

          // Insert into team_assignments
          const assignQuery = `
            INSERT INTO team_assignments (project_manager_id, team_member_id, assigned_at, status)
            VALUES ($1, $2, CURRENT_TIMESTAMP, 'active')
            ON CONFLICT (project_manager_id, team_member_id)
            DO UPDATE SET status = 'active', assigned_at = CURRENT_TIMESTAMP
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

          assignedMembers.push(verifyResult.rows[0]);
        }
        
        // Auto-assign project manager to existing projects by these team members
        if (assignedMembers.length > 0) {
          for (const member of assignedMembers) {
            const projectsQuery = `
              SELECT id, name, created_by
              FROM projects 
              WHERE created_by = $1
            `;
            const projectsResult = await query(projectsQuery, [member.id]);
            
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
          }
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
  }

  // Remove team members from project manager
  async removeTeamMembers(req, res) {
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
        const removedMembers = [];

        for (const memberId of memberIds) {
          const updateQuery = `
            UPDATE team_assignments 
            SET status = 'inactive', assigned_at = CURRENT_TIMESTAMP
            WHERE project_manager_id = $1 AND team_member_id = $2
            RETURNING *
          `;
          const result = await query(updateQuery, [projectManagerId, memberId]);

          // Also update team_members
          try {
            await query(`
              UPDATE team_members
              SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
              WHERE project_manager_id = $1 AND user_id = $2
            `, [projectManagerId, memberId]);
          } catch (tmErr) {
            console.warn('Sync to team_members note:', tmErr.message);
          }

          if (result.rows.length > 0) {
            removedMembers.push({ id: memberId });
          }

          // Remove project manager oversight from projects created by this member
          const removeFromProjectsQuery = `
            DELETE FROM project_team_members 
            WHERE user_id = $1 
              AND role_in_project = 'Project Manager Oversight'
              AND project_id IN (
                SELECT id FROM projects WHERE created_by = $2
              )
          `;
          await query(removeFromProjectsQuery, [projectManagerId, memberId]);
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
  }

  // Get project manager dashboard analytics
  async getProjectManagerDashboard(req, res) {
    try {
      const projectManagerId = req.user?.id || 1;
      
      console.log('Getting project manager dashboard for user:', projectManagerId);
      
      // Get team member count
      const teamCountQuery = `
        SELECT COUNT(DISTINCT team_member_id) as team_count
        FROM team_assignments 
        WHERE project_manager_id = $1 AND status = 'active'
      `;
      const teamCountResult = await query(teamCountQuery, [projectManagerId]);
      const teamSize = parseInt(teamCountResult.rows[0]?.team_count || 0);
      
      // Get team projects and their status
      const projectsQuery = `
        SELECT DISTINCT p.id, p.name, p.status, p.priority, p.pm_progress,
               p.leadership_progress, p.change_mgmt_progress, p.career_dev_progress,
               p.created_at, p.updated_at, u.name as creator_name
        FROM projects p
        INNER JOIN users u ON p.created_by = u.id
        LEFT JOIN team_assignments ta ON ta.team_member_id = u.id AND ta.project_manager_id = $1 AND ta.status = 'active'
        LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.user_id = $1
        WHERE p.created_by = $1 OR ta.team_member_id IS NOT NULL OR ptm.user_id IS NOT NULL
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
  }
}

module.exports = new TeamManagementController();