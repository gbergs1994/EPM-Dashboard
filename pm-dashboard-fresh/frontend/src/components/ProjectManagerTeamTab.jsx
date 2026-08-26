// frontend/src/components/ProjectManagerTeamTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  AlertCircle,
  Activity,
  TrendingUp,
  CheckCircle,
  Search,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';
import apiService from '../services/apiService';
import TeamMemberManagement from './TeamMemberManagement';

const ProjectManagerTeamTab = ({ currentUser }) => {
  const [activeView, setActiveView] = useState('overview');
  const [teamData, setTeamData] = useState({
    teamMembers: [],
    unassignedMembers: [],
    totalTeamSize: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    teamSize: 0,
    totalProjects: 0,
    averageProgress: 0,
    recentActivity: 0
  });

  useEffect(() => {
    if (currentUser.role === 'Project Manager') {
      loadTeamData();
      loadAnalytics();
    }
  }, [currentUser]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getProjectManagerTeam();
      
      if (response.success) {
        setTeamData(response.data);
      } else {
        throw new Error(response.message || 'Failed to load team data');
      }
    } catch (err) {
      console.error('Error loading team data:', err);
      setError(err.message || 'Failed to load team data');
      // Set empty data on error
      setTeamData({
        teamMembers: [],
        unassignedMembers: [],
        totalTeamSize: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await apiService.getProjectManagerDashboard();
      
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      // Set default analytics on error
      setAnalytics({
        teamSize: 0,
        totalProjects: 0,
        averageProgress: 0,
        recentActivity: 0
      });
    }
  };

  const handleTeamUpdate = (updatedTeamData) => {
    setTeamData(updatedTeamData);
    // Refresh analytics when team changes
    loadAnalytics();
  };

  if (currentUser.role !== 'Project Manager') {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>Access Restricted</h3>
        <p style={{ color: '#6b7280' }}>Only Project Managers can access team management features.</p>
      </div>
    );
  }

  if (loading && activeView === 'overview') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Activity size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <p>Loading team data...</p>
      </div>
    );
  }

  const navigationItems = [
    { id: 'overview', label: 'Team Overview', icon: BarChart3 },
    { id: 'manage', label: 'Manage Members', icon: Settings }
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'manage':
        return (
          <TeamMemberManagement 
            currentUser={currentUser}
            onTeamUpdate={handleTeamUpdate}
          />
        );
      case 'overview':
      default:
        return (
          <div>
            {/* Error Display */}
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {/* Analytics Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Users size={24} color="#2563eb" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Team Size</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {analytics.teamSize}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Active team members
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <Activity size={24} color="#059669" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Total Projects</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {analytics.totalProjects}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Team projects
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <TrendingUp size={24} color="#dc2626" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Avg Progress</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {analytics.averageProgress}%
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Across all projects
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <CheckCircle size={24} color="#7c3aed" />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Recent Activity</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {analytics.recentActivity}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Projects this month
                </p>
              </div>
            </div>

            {/* Team Members Section */}
            <div className="team-members-panel" style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Your Team ({teamData.totalTeamSize} members)
                  </h3>
                  <button
                    onClick={() => setActiveView('manage')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    <UserPlus size={16} />
                    Manage Team
                  </button>
                </div>
              </div>

              {teamData.teamMembers.length === 0 ? (
                <div className="team-empty-state" style={{
                  textAlign: 'center',
                  padding: '3rem',
                  backgroundColor: '#f9fafb'
                }}>
                  <Users size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No Team Members Yet</h3>
                  <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                    Start building your team by adding members to track their projects and progress.
                  </p>
                  <button
                    onClick={() => setActiveView('manage')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      margin: '0 auto'
                    }}
                  >
                    <UserPlus size={16} />
                    Add Team Members
                  </button>
                </div>
              ) : (
                <div style={{ padding: '1.5rem' }}>
                  {teamData.teamMembers.map((member, index) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 0',
                        borderBottom: index < teamData.teamMembers.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '1rem'
                        }}>
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', color: '#111827' }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {member.email} • {member.role}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {member.projectCount || 0} projects assigned
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: member.role === 'Manager' ? '#eff6ff' : '#f0fdf4',
                          color: member.role === 'Manager' ? '#1e40af' : '#166534',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned Members (if any) */}
            {teamData.unassignedMembers.length > 0 && (
              <div className="unassigned-members-banner" style={{
                backgroundColor: '#fefce8',
                border: '1px solid #fde047',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginTop: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#a16207', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Unassigned Members Available ({teamData.unassignedMembers.length})
                    </p>
                    <p style={{ color: '#ca8a04', fontSize: '0.875rem' }}>
                      {teamData.unassignedMembers.slice(0, 3).map(m => m.name).join(', ')}
                      {teamData.unassignedMembers.length > 3 && ` and ${teamData.unassignedMembers.length - 3} more`}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveView('manage')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fbbf24',
                      color: '#a16207',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    <UserPlus size={16} />
                    Assign Members
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="team-management-screen" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            Team Management
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage your team members and track their project assignments
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              loadTeamData();
              loadAnalytics();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '0.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default ProjectManagerTeamTab;