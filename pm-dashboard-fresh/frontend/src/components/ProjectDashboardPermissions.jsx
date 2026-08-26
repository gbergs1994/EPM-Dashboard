import React from 'react';
import { Shield } from 'lucide-react';

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
      canEdit: true,           // âœ… Project Managers can edit everything
      canDelete: true,         // âœ… Project Managers can delete
      canManageTeam: true,     // âœ… Project Managers can assign/remove people
      canComment: true,
      canView: true
    };
  }

  if (isAssigned) {
    return {
      level: 'member',
      role: 'Team Member',
      canEdit: true,           // âœ… Team Members can edit project dashboard
      canDelete: false,        // âŒ Team Members cannot delete projects
      canManageTeam: false,    // âŒ Team Members cannot assign/remove people
      canComment: true,
      canView: true
    };
  }

  // Project Managers get read-only access to all projects
  if (currentUserRole === 'Project Manager') {
    return {
      level: 'project manager',
      role: 'Project Manager',
      canEdit: false,          // âŒ Project Managers are read-only
      canDelete: false,        // âŒ Project Managers are read-only
      canManageTeam: false,    // âŒ Project Managers cannot manage project teams
      canComment: true,        // âœ… Project Managers can comment
      canView: true           // âœ… Project Managers can view all projects
    };
  }

  return { level: 'none', canView: false };
};

const ProjectDashboardPermissions = ({ project, currentUser, children }) => {
  const accessLevel = getProjectAccessLevel(project, currentUser.id, currentUser.role);
  
  const renderWithPermissions = (component, requiredPermission) => {
    if (!accessLevel[requiredPermission]) {
      return null;
    }
    return component;
  };

  const permissions = {
    // Dashboard editing - Team Members AND Project Managers
    canEditDashboard: accessLevel.canEdit,
    
    // Team management - ONLY Project Managers
    canManageTeam: accessLevel.canManageTeam,
    
    // Read-only for Project Managers
    isReadOnly: accessLevel.level === 'project_manager',
    
    // Access level info
    level: accessLevel.level,
    role: accessLevel.role
  };

  return children(permissions, renderWithPermissions);
};

export default ProjectDashboardPermissions;