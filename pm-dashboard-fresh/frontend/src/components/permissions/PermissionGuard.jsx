import React from 'react';

const PermissionGuard = ({ 
  userRole, 
  requiredRole, 
  requiredRoles = [], 
  fallback = null, 
  children 
}) => {
  const hasPermission = () => {
    if (requiredRole) {
      return userRole === requiredRole;
    }
    
    if (requiredRoles.length > 0) {
      return requiredRoles.includes(userRole);
    }
    
    return true;
  };

  if (!hasPermission()) {
    return fallback;
  }

  return <>{children}</>;
};

export default PermissionGuard;