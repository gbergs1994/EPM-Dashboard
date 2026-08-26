import React from 'react';
import { Shield, Lock, Info } from 'lucide-react';

const AccessNotification = ({ userAccess, action }) => {
  if (!userAccess || userAccess.level === 'manager') {
    return null; // Don't show for managers/creators
  }

  const getNotificationInfo = () => {
    switch (userAccess.level) {
      case 'executive_leader':
        return {
          icon: Shield,
          color: '#8b5cf6',
          bg: '#f3e8ff',
          border: '#d8b4fe',
          title: 'Executive Leader View',
          message: 'You can view all projects and update the assigned project manager, but you cannot edit other project details.'
        };
      case 'project_manager':
        return {
          icon: Shield,
          color: '#8b5cf6',
          bg: '#f3e8ff',
          border: '#d8b4fe',
          title: 'Project Manager View',
          message: 'You can view this project as a Project Manager but cannot make changes.'
        };
      case 'member':
        return {
          icon: Info,
          color: '#3b82f6',
          bg: '#eff6ff',
          border: '#bfdbfe',
          title: 'Team Member Access',
          message: 'You can view and comment on this project but cannot edit project details.'
        };
      case 'viewer':
      default:
        return {
          icon: Lock,
          color: '#6b7280',
          bg: '#f9fafb',
          border: '#e5e7eb',
          title: 'View Only',
          message: 'You have read-only access to this project.'
        };
    }
  };

  const { icon: Icon, color, bg, border, title, message } = getNotificationInfo();

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: '0.5rem',
      margin: '1rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    }}>
      <Icon size={20} style={{ color, flexShrink: 0 }} />
      <div>
        <h4 style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          color: color, 
          margin: '0 0 0.25rem 0' 
        }}>
          {title}
        </h4>
        <p style={{ 
          fontSize: '0.75rem', 
          color: '#6b7280', 
          margin: 0 
        }}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default AccessNotification;