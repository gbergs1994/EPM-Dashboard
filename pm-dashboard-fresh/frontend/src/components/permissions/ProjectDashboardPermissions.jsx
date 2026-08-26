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
      canEdit: true,           // ✅ Project Managers can edit everything
      canDelete: true,         // ✅ Project Managers can delete
      canManageTeam: true,     // ✅ Project Managers can assign/remove people
      canComment: true,
      canView: true
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
      canView: true
    };
  }

  // Executive Leaders get read-only access to all projects and can update the project manager
  if (currentUserRole === 'Executive Leader') {
    return {
      level: 'executive_leader',
      role: 'Executive Leader',
      canEdit: false,          // ❌ Executive Leaders cannot edit project details
      canDelete: false,        // ❌ Executive Leaders cannot delete projects
      canManageTeam: false,    // ❌ Executive Leaders cannot manage project teams
      canComment: true,        // ✅ Executive Leaders can comment
      canView: true,           // ✅ Executive Leaders can view all projects
      canUpdateProjectManager: true
    };
  }

  // Project Managers get read-only access to all projects
  if (currentUserRole === 'Project Manager') {
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
    isReadOnly: accessLevel.level === 'project manager',
    
    // Access level info
    level: accessLevel.level,
    role: accessLevel.role
  };

  return children(permissions, renderWithPermissions);
};

export default ProjectDashboardPermissions;