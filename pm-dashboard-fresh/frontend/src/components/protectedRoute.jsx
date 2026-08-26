// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { useRBAC } from '../contexts/RBACContext';

/**
 * ProtectedRoute component for conditional rendering based on permissions
 * 
 * Usage examples:
 * <ProtectedRoute permission="team.manage">
 *   <TeamManagementButton />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute role="Project Manager">
 *   <ProjectManagerOnlyContent />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute permissions={["projects.create", "projects.edit"]} requireAll={false}>
 *   <ProjectActions />
 * </ProtectedRoute>
 */

const ProtectedRoute = ({
  children,
  permission = null,
  permissions = [],
  role = null,
  roles = [],
  requireAll = true,
  fallback = null,
  project = null, // For project-specific permissions
  showLoading = false
}) => {
  const { 
    currentUser, 
    userPermissions, 
    loading, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    getProjectAccessLevel,
    ROLES 
  } = useRBAC();

  // Show loading state if requested
  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no user is logged in
  if (!currentUser) {
    return fallback;
  }

  // Check single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return fallback;
    }
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasPermissions) {
      return fallback;
    }
  }

  // Check single role
  if (role) {
    if (currentUser.role !== role) {
      return fallback;
    }
  }

  // Check multiple roles
  if (roles.length > 0) {
    if (!roles.includes(currentUser.role)) {
      return fallback;
    }
  }

  // Check project-specific permissions
  if (project) {
    const projectAccess = getProjectAccessLevel(project);
    if (projectAccess.level === 'none') {
      return fallback;
    }
  }

  // If all checks pass, render children
  return children;
};

/**
 * TeamManagementOnly component - shorthand for team management features
 */
export const TeamManagementOnly = ({ children, fallback = null }) => {
  return (
    <ProtectedRoute permission="team.manage" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * LeadershipOnly component - shorthand for leadership assessment features
 */
export const LeadershipOnly = ({ children, fallback = null }) => {
  return (
    <ProtectedRoute permission="leadership.access" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * ValueAssessmentOnly component - shorthand for value assessment features
 */
export const ValueAssessmentOnly = ({ children, fallback = null }) => {
  return (
    <ProtectedRoute permission="value.access" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * ProjectManagerOnly component - for project management features
 */
export const ProjectManagerOnly = ({ children, fallback = null, project = null }) => {
  if (project) {
    return (
      <ProtectedRoute project={project} fallback={fallback}>
        {project && project.isCreator ? children : fallback}
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute role={ROLES.PROJECT_MANAGER} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * AILeadOnly component - shorthand for AI Lead only content
 */
export const AILeadOnly = ({ children, fallback = null }) => {
  return (
    <ProtectedRoute role={ROLES.AI_LEAD} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * ProjectAccess component - for project-specific access control
 */
export const ProjectAccess = ({ 
  children, 
  project, 
  level = 'view', 
  fallback = null 
}) => {
  const { getProjectAccessLevel } = useRBAC();
  
  if (!project) {
    return fallback;
  }

  const accessLevel = getProjectAccessLevel(project);
  
  const hasRequiredAccess = () => {
    switch (level) {
      case 'view':
        return accessLevel.canView;
      case 'edit':
        return accessLevel.canEdit;
      case 'delete':
        return accessLevel.canDelete;
      case 'manage_team':
        return accessLevel.canManageTeam;
      case 'analytics':
        return accessLevel.canViewAnalytics;
      case 'feedback':
        return accessLevel.canSubmitFeedback;
      default:
        return false;
    }
  };

  return hasRequiredAccess() ? children : fallback;
};

/**
 * ConditionalRender component - for complex conditional rendering
 */
export const ConditionalRender = ({ 
  condition, 
  children, 
  fallback = null 
}) => {
  return condition ? children : fallback;
};

/**
 * RoleBasedContent component - render different content based on role
 */
export const RoleBasedContent = ({ 
  teamMemberContent = null,
  projectManagerContent = null,
  projectManagerContent = null,
  aiLeadContent = null,
  defaultContent = null
}) => {
  const { currentUser, ROLES } = useRBAC();
  
  if (!currentUser) {
    return defaultContent;
  }

  switch (currentUser.role) {
    case ROLES.TEAM_MEMBER:
      return teamMemberContent || defaultContent;
    case ROLES.PROJECT_MANAGER:
      return projectManagerContent || defaultContent;
    case ROLES.AI_LEAD:
      return aiLeadContent || defaultContent;
    default:
      return defaultContent;
  }
};

export default ProtectedRoute;