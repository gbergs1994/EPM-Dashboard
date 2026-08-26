// backend/src/middleware/rbac.js
const { query } = require('../config/database');

// Role definitions based on your requirements
const ROLES = {
  TEAM_MEMBER: 'Team Member',
  PROJECT_MANAGER: 'Project Manager', // Dynamic role based on project ownership
  EXECUTIVE_LEADER: 'Executive Leader'
};

// Permission checking functions
const checkProjectAccess = async (userId, projectId, requiredLevel = 'view') => {
    try {
      console.log(`🔍 Checking access: User ${userId}, Project ${projectId}, Level ${requiredLevel}`);
      
      const accessQuery = `
        SELECT 
          u.id as user_id,
          u.role as user_role,
          u.name as user_name,
          p.id as project_id,
          p.name as project_name,
          p.created_by,
          CASE WHEN p.created_by = u.id THEN true ELSE false END as is_creator,
          CASE WHEN ptm.user_id IS NOT NULL THEN true ELSE false END as is_team_member
        FROM users u
        CROSS JOIN projects p
        LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.user_id = u.id
        WHERE u.id = $1 AND p.id = $2
      `;
      
      const result = await query(accessQuery, [userId, projectId]);
      
      if (result.rows.length === 0) {
        return { hasAccess: false, reason: 'User or project not found' };
      }
      
      const { user_role, is_creator, is_team_member } = result.rows[0];
      
      console.log('🔍 Access check:', { user_role, is_creator, is_team_member, requiredLevel });
      
      const isExecutiveLeader = user_role === ROLES.EXECUTIVE_LEADER;
      const isProjectManager = user_role === ROLES.PROJECT_MANAGER;

      switch (requiredLevel) {
        case 'view':
          if (is_creator || is_team_member || isProjectManager || isExecutiveLeader) {
            return {
              hasAccess: true,
              role: is_creator ? ROLES.PROJECT_MANAGER : user_role,
              level: is_creator ? 'manager' : 
                     (isProjectManager || isExecutiveLeader ? 'project manager' : 'member'),
              isCreator: is_creator,
              canEdit: is_creator || is_team_member,  // BOTH can edit
              canManageTeam: is_creator,              // Only PM can manage team
              canDelete: is_creator                   // Only PM can delete
            };
          }
          break;
  
        case 'edit':
          // CRITICAL FIX: Team Members AND Project Managers can edit
          if (is_creator || is_team_member) {
            return {
              hasAccess: true,
              role: is_creator ? 'Project Manager' : 'Team Member',
              level: is_creator ? 'manager' : 'member',
              isCreator: is_creator
            };
          }
          // Project Managers CANNOT edit
          break;
  
        case 'manage_team':
          // ONLY Project Managers can manage team
          if (is_creator) {
            return {
              hasAccess: true,
              role: 'Project Manager',
              level: 'manager',
              isCreator: true
            };
          }
          break;
  
        case 'comment':
          // Anyone with view access can comment (including feedback submission)
          if (is_creator || is_team_member || isProjectManager || isExecutiveLeader) {
            return {
              hasAccess: true,
              role: is_creator ? ROLES.PROJECT_MANAGER : user_role,
              isCreator: is_creator
            };
          }
          break;
      }
  
      return { hasAccess: false, reason: `Insufficient permissions for ${requiredLevel}` };
      
    } catch (error) {
      console.error('Error checking project access:', error);
      return { hasAccess: false, reason: 'Database error' };
    }
};

const checkProjectManagerTeamMembership = async (userId, projectManagerId) => {
  try {
    const teamQuery = `
      SELECT 1 FROM team_members 
      WHERE user_id = $1 AND project_manager_id = $2
    `;
    const result = await query(teamQuery, [userId, projectManagerId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking team membership:', error);
    return false;
  }
};

// Middleware functions
const requireProjectAccess = (level = 'view') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const projectId = req.params.id || req.params.projectId || req.body.projectId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID required'
        });
      }

      const accessCheck = await checkProjectAccess(userId, projectId, level);

      if (!accessCheck.hasAccess) {
        console.log(`ðŸš« Project access denied: User ${userId} cannot ${level} project ${projectId}. Reason: ${accessCheck.reason}`);
        return res.status(403).json({
          success: false,
          error: accessCheck.reason || 'Access denied',
          requiredLevel: level
        });
      }

      // Add access info to request for use in controllers
      req.projectAccess = accessCheck;
      console.log(`âœ… Project access granted: User ${userId} can ${level} project ${projectId} as ${accessCheck.role}`);
      next();

    } catch (error) {
      console.error('Project access middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Access check failed'
      });
    }
  };
};

const requireProjectManager = () => {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
  
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }
  
        const userQuery = `SELECT role FROM users WHERE id = $1`;
        const result = await query(userQuery, [userId]);
  
        if (result.rows.length === 0 || result.rows[0].role !== 'Project Manager') {
          console.log(`ðŸš« Team management access denied: User ${userId} is not an Project Manager`);
          return res.status(403).json({
            success: false,
            error: 'Project Manager role required for Team Management access'
          });
        }
  
        console.log(`âœ… Project Manager access granted: User ${userId} can access Team Management`);
        next();
  
      } catch (error) {
        console.error('Project Manager leader middleware error:', error);
        return res.status(500).json({
          success: false,
          error: 'Role check failed'
        });
      }
    };
  };

const requireTeamManagement = () => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userQuery = `SELECT role FROM users WHERE id = $1`;
      const result = await query(userQuery, [userId]);

      if (result.rows.length === 0 || result.rows[0].role !== ROLES.PROJECT_MANAGER) {
        console.log(`ðŸš« Team management access denied: User ${userId} cannot manage teams`);
        return res.status(403).json({
          success: false,
          error: 'Only Project Managers can manage teams'
        });
      }

      next();

    } catch (error) {
      console.error('Team management middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

// Get user's accessible projects
const getUserProjects = async (userId) => {
  try {
    const userQuery = `SELECT role FROM users WHERE id = $1`;
    const userResult = await query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return [];
    }

    const userRole = userResult.rows[0].role;
    let projectQuery;
    let queryParams;

    if (userRole === ROLES.EXECUTIVE_LEADER) {
      // Executive Leaders can view all projects
      projectQuery = `
        SELECT DISTINCT p.*, 
               false as is_creator,
               false as is_assigned,
               'Executive Leader' as user_role_in_project
        FROM projects p
        ORDER BY p.created_at DESC
      `;
      queryParams = [];
    } else if (userRole === ROLES.PROJECT_MANAGER) {
      // Project Manager leaders see all projects in their team
      projectQuery = `
        SELECT DISTINCT p.*, 
               p.created_by = $1 as is_creator,
               ptm.user_id is not null as is_assigned,
               'Project Manager' as user_role_in_project
        FROM projects p
        LEFT JOIN project_team_members ptm ON p.id = ptm.project_id AND ptm.user_id = $1
        LEFT JOIN team_members tm ON p.created_by = tm.user_id AND tm.project_manager_id = $1
        WHERE p.created_by = $1 
           OR ptm.user_id = $1 
           OR tm.project_manager_id = $1
        ORDER BY p.created_at DESC
      `;
      queryParams = [userId];
    } else {
      // Team members see only assigned projects or projects they created
      projectQuery = `
        SELECT DISTINCT p.*, 
               p.created_by = $1 as is_creator,
               ptm.user_id is not null as is_assigned,
               CASE 
                 WHEN p.created_by = $1 THEN 'Project Manager'
                 ELSE 'Team Member'
               END as user_role_in_project
        FROM projects p
        LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
        WHERE p.created_by = $1 OR ptm.user_id = $1
        ORDER BY p.created_at DESC
      `;
      queryParams = [userId];
    }

    const result = await query(projectQuery, queryParams);
    return result.rows;

  } catch (error) {
    console.error('Error getting user projects:', error);
    return [];
  }
};

// Check if user can create projects
const canCreateProject = (userRole) => {
  return [ROLES.PROJECT_MANAGER, ROLES.EXECUTIVE_LEADER].includes(userRole);
};

// Get team members for project manager
const getTeamMembers = async (projectManagerId) => {
  try {
    const teamQuery = `
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             COUNT(DISTINCT p.id) as project_count,
             COUNT(DISTINCT cdg.id) as career_goals_count
      FROM users u
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
      LEFT JOIN projects p ON ptm.project_id = p.id
      LEFT JOIN career_development_goals cdg ON u.id = cdg.user_id
      WHERE tm.project_manager_id = $1 OR u.id = $1
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.name
    `;

    const result = await query(teamQuery, [projectManagerId]);
    return result.rows;

  } catch (error) {
    console.error('Error getting team members:', error);
    return [];
  }
};

module.exports = {
  ROLES,
  requireProjectAccess,
  requireProjectManager,
  requireTeamManagement,
  checkProjectAccess,
  getUserProjects,
  canCreateProject,
  getTeamMembers,
  checkProjectManagerTeamMembership
};