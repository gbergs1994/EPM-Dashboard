// frontend/src/contexts/RBACContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const RBACContext = createContext();

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

// Role definitions matching backend
const ROLES = {
  TEAM_MEMBER: 'Team Member',
  PROJECT_MANAGER: 'Project Manager', // Dynamic role based on project ownership
  EXECUTIVE_LEADER: 'Executive Leader'
};

// UI permissions based on user role and project relationship
const getUIPermissions = (userRole, projectRelation = null) => {
    const permissions = {
      // Navigation permissions
      canAccessOverview: true,
      canAccessProjects: true,
      canAccessCareer: true,
      canAccessAI: true,
      canAccessSettings: true,
      canAccessTeam: userRole === ROLES.PROJECT_MANAGER,        // ✅ ONLY Project Managers
      canAccessLeadership: userRole === ROLES.PROJECT_MANAGER,   // ✅ ONLY Project Managers
      
      // Project permissions (base level)
      canCreateProject: true,
      canViewAllProjects: userRole === ROLES.PROJECT_MANAGER || userRole === ROLES.EXECUTIVE_LEADER,
      canEditProject: false,     // Determined per project
      canDeleteProject: false,   // Determined per project
      canManageProjectTeam: false, // Determined per project
      canCommentOnProject: true,
      canEditProjectManager: userRole === ROLES.EXECUTIVE_LEADER,
      
      // Team management permissions (global)
      canManageTeam: userRole === ROLES.PROJECT_MANAGER,        // ✅ ONLY Project Managers
      canViewTeamCareer: userRole === ROLES.PROJECT_MANAGER,
      canAddTeamMembers: userRole === ROLES.PROJECT_MANAGER,
      canRemoveTeamMembers: userRole === ROLES.PROJECT_MANAGER,
      
      // Career permissions
      canViewOwnCareer: true,
      canViewTeamCareer: userRole === ROLES.PROJECT_MANAGER,
      canManageCareerPlans: userRole === ROLES.PROJECT_MANAGER
    };
  
    // Project-specific permissions override
    if (projectRelation) {
      const accessLevel = getProjectAccessLevel(projectRelation, projectRelation.currentUserId, userRole);
      permissions.canEditProject = accessLevel.canEdit;
      permissions.canDeleteProject = accessLevel.canDelete;
      permissions.canManageProjectTeam = accessLevel.canManageTeam;
    }
  
    return permissions;
  };
  

// Navigation items based on role
const getNavigationItems = (userRole) => {
  const baseItems = [
    { id: 'overview', label: 'Overview', icon: 'Home', alwaysShow: true },
    { id: 'projects', label: 'Projects', icon: 'Folder', alwaysShow: true },
    { id: 'career', label: 'Career Development', icon: 'TrendingUp', alwaysShow: true },
    { id: 'ai-insights', label: 'AI Insights', icon: 'Brain', alwaysShow: true },
    { id: 'settings', label: 'Settings', icon: 'Settings', alwaysShow: true }
  ];

  const projectManagerItems = [
    { id: 'team', label: 'Team Management', icon: 'Users', roles: [ROLES.PROJECT_MANAGER] },
    { id: 'leadership', label: 'Leadership', icon: 'Award', roles: [ROLES.PROJECT_MANAGER] }
  ];

  // Filter items based on role
  const filteredItems = baseItems.filter(item => 
    item.alwaysShow || (item.roles && item.roles.includes(userRole))
  );

  // Add project manager-specific items
  if (userRole === ROLES.PROJECT_MANAGER) {
    // Insert team and leadership after projects
    const projectIndex = filteredItems.findIndex(item => item.id === 'projects');
    filteredItems.splice(projectIndex + 1, 0, ...projectManagerItems);
  }

  return filteredItems;
};

// Project access level determination
const getProjectAccessLevel = (project, currentUserId, currentUserRole) => {
    if (!project || !currentUserId) return { level: 'none' };
  
    const isCreator = project.created_by === currentUserId || project.isCreator;
    const isAssigned = project.assigned_users?.includes(currentUserId) || 
                       project.isAssigned ||
                       project.teamMembers?.some(member => member.id === currentUserId);
    
  
    if (isCreator) {
      return {
        level: 'manager',
        role: 'Project Manager',
        canEdit: true,           // ✅ Project Managers can edit everything
        canDelete: true,         // ✅ Project Managers can delete
        canManageTeam: true,     // ✅ Project Managers can assign/remove people
        canComment: true,
        canView: true,
        // In getProjectAccessLevel function, add these properties:
        canUpdateProgress: (isCreator || isAssigned) && currentUserRole !== 'Project Manager',
        canSubmitFeedback: (isCreator || isAssigned) && currentUserRole !== 'Project Manager'
      };
    }
  
    if (isAssigned) {
      return {
        level: 'member',
        role: 'Team Member',
        canEdit: true,           // ✅ Team Members can edit project dashboard
        canDelete: false,        // ❌ Team Members cannot delete projects
        canManageTeam: false,    // ❌ Team Members cannot assign/remove people
        canComment: true,
        canView: true,
        // In getProjectAccessLevel function, add these properties:
        canUpdateProgress: (isCreator || isAssigned) && currentUserRole !== ROLES.PROJECT_MANAGER,
        canSubmitFeedback: (isCreator || isAssigned) && currentUserRole !== ROLES.PROJECT_MANAGER
      };
    }
  
    // Executive Leaders get read-only access to all projects and can update project managers
    if (currentUserRole === ROLES.EXECUTIVE_LEADER) {
      return {
        level: 'executive_leader',
        role: ROLES.EXECUTIVE_LEADER,
        canEdit: false,          // ❌ Executive Leaders cannot edit project details
        canDelete: false,        // ❌ Executive Leaders cannot delete projects
        canManageTeam: false,    // ❌ Executive Leaders cannot manage project teams
        canComment: true,        // ✅ Executive Leaders can comment
        canView: true,           // ✅ Executive Leaders can view all projects
        canUpdateProjectManager: true
      };
    }
  
    // Project Managers get read-only access to all projects
    if (currentUserRole === ROLES.PROJECT_MANAGER) {
      return {
        level: 'project_manager',
        role: 'Project Manager',
        canEdit: false,          // ❌ Project Managers are read-only
        canDelete: false,        // ❌ Project Managers are read-only
        canManageTeam: false,    // ❌ Project Managers cannot manage project teams
        canComment: true,        // ✅ Project Managers can comment
        canView: true           // ✅ Project Managers can view all projects
      };
    }
  
    return { level: 'none', canView: false };
  };
  

// Filter projects based on user access
const filterProjects = (projects, userRole, userId) => {
  if (!projects) return [];

  return projects.filter(project => {
    const accessLevel = getProjectAccessLevel(project, userId);
    return accessLevel.canView;
  }).map(project => ({
    ...project,
    userAccess: getProjectAccessLevel(project, userId)
  }));
};

export const RBACProvider = ({ children, user }) => {
  const [currentUser, setCurrentUser] = useState(user);
  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setUserPermissions(getUIPermissions(user.role));
    }
  }, [user]);

  // Check if user can access a specific feature
  const canAccess = (feature, projectContext = null) => {
    if (!currentUser) return false;

    const permissions = getUIPermissions(currentUser.role, projectContext);
    return permissions[feature] || false;
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return currentUser?.role === role;
  };
  

  // Check if user can access project
  const canAccessProject = (project) => {
    if (!currentUser || !project) return false;

    const accessLevel = getProjectAccessLevel(project, currentUser.id);
    return accessLevel.canView;
  };

  // Get user's role in a specific project
  const getProjectRole = (project) => {
    if (!currentUser || !project) return null;

    const accessLevel = getProjectAccessLevel(project, currentUser.id);
    return accessLevel.role || null;
  };

  // Check if user can perform action on project
  const canPerformProjectAction = (action, project) => {
    if (!currentUser || !project) return false;

    const accessLevel = getProjectAccessLevel(project, currentUser.id);
    
    switch (action) {
      case 'view':
        return accessLevel.canView;
      case 'edit':
        return accessLevel.canEdit;
      case 'delete':
        return accessLevel.canDelete;
      case 'manage_team':
        return accessLevel.canManageTeam;
      case 'comment':
        return accessLevel.canComment;
      default:
        return false;
    }
  };

  // Get appropriate dashboard sections for user
  const getDashboardSections = () => {
    const sections = ['personal_projects', 'personal_career'];

    if (hasRole(ROLES.PROJECT_MANAGER)) {
      sections.push('team_overview', 'team_projects', 'team_career', 'organization_insights');
    }

    return sections;
  };

  // Get role display information
  const getRoleDisplay = (role = currentUser?.role) => {
    const roleInfo = {
      [ROLES.TEAM_MEMBER]: {
        label: 'Team Member',
        color: '#6b7280',
        description: 'Access to assigned projects and personal career development'
      },
      [ROLES.PROJECT_MANAGER]: {
        label: 'Project Manager',
        color: '#059669',
        description: 'Full management access for owned projects'
      },
      [ROLES.EXECUTIVE_LEADER]: {
        label: 'Executive Leader',
        color: '#8b5cf6',
        description: 'View all projects and update project manager assignments'
      }
    };

    return roleInfo[role] || roleInfo[ROLES.TEAM_MEMBER];
  };

  const value = {
    // User info
    currentUser,
    userRole: currentUser?.role,
    userPermissions,

    // Permission checks
    canAccess,
    hasRole,
    canAccessProject,
    canPerformProjectAction,

    // Project-specific
    getProjectRole,
    getProjectAccessLevel,
    filterProjects,

    // UI helpers
    getNavigationItems: () => getNavigationItems(currentUser?.role),
    getDashboardSections,
    getRoleDisplay,

    // Constants
    ROLES
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};