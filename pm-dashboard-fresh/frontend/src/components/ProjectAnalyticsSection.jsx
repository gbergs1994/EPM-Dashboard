import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Activity, Calendar, 
  Target, Award, Clock, CheckCircle, AlertTriangle,
  RefreshCw, Loader
} from 'lucide-react';
import apiService from '../services/apiService';

const ProjectAnalyticsSection = ({ teamMembersDetailed = [], project, currentUser }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [activitiesCount, setActivitiesCount] = useState(0);

  useEffect(() => {
    console.log('ProjectAnalyticsSection - project received:', project);
    if (project?.id) {
      loadAnalytics();
    } else {
      // Use project data directly if no ID available
      generateAnalyticsFromProject();
    }
  }, [project?.id]);

  const loadAnalytics = async () => {
    setLoading(true);
    
    try {
      console.log('Loading analytics for project ID:', project.id);
      
      // Load analytics from the API (this includes proper comment/activity counts)
      const response = await apiService.getProjectAnalytics(project.id);
      console.log('Analytics API response:', response);
      
      if (response?.success && response?.analytics) {
        console.log('✅ Using API analytics with proper counts:', response.analytics);
        setAnalytics(response.analytics);
        setCommentsCount(response.analytics.comment_count || 0);
        setActivitiesCount(response.analytics.activity_count || 0);
      } else {
        throw new Error('Invalid analytics response');
      }
    } catch (error) {
      console.warn('Analytics API failed, loading individual counts:', error.message);
      await loadIndividualCounts();
    } finally {
      setLoading(false);
    }
  };

  const loadIndividualCounts = async () => {
    try {
      // Load comments count
      try {
        const commentsResponse = await apiService.getProjectComments(project.id);
        const actualCommentsCount = commentsResponse?.success ? (commentsResponse.data?.length || 0) : 0;
        console.log('✅ Loaded comments count:', actualCommentsCount);
        setCommentsCount(actualCommentsCount);
      } catch (commentError) {
        console.warn('Failed to load comments:', commentError.message);
        setCommentsCount(0);
      }

      // Load activities count  
      try {
        const historyResponse = await apiService.getProjectHistory(project.id);
        const actualActivitiesCount = historyResponse?.success ? (historyResponse.data?.length || 0) : 0;
        console.log('✅ Loaded activities count:', actualActivitiesCount);
        setActivitiesCount(actualActivitiesCount);
      } catch (historyError) {
        console.warn('Failed to load history:', historyError.message);
        setActivitiesCount(0);
      }

      // Generate analytics with actual counts
      const analyticsFromProject = {
        pm_progress: project.progress?.PM || 0,
        leadership_progress: project.progress?.Leadership || 0,
        change_mgmt_progress: project.progress?.ChangeMgmt || 0,
        career_dev_progress: project.progress?.CareerDev || 0,
        status: project.status || 'unknown',
        priority: project.priority || 'medium',
        team_size: teamMembersDetailed.length,
        comment_count: commentsCount,
        activity_count: activitiesCount
      };
      
      console.log('Generated analytics with actual counts:', analyticsFromProject);
      setAnalytics(analyticsFromProject);
      
    } catch (error) {
      console.error('Failed to load individual counts:', error);
      generateAnalyticsFromProject();
    }
  };

  const generateAnalyticsFromProject = () => {
    if (!project) {
      console.warn('No project data available for analytics');
      return;
    }

    const analyticsFromProject = {
      pm_progress: project.progress?.PM || 0,
      leadership_progress: project.progress?.Leadership || 0,
      change_mgmt_progress: project.progress?.ChangeMgmt || 0,
      career_dev_progress: project.progress?.CareerDev || 0,
      status: project.status || 'unknown',
      priority: project.priority || 'medium',
      team_size: teamMembersDetailed.length,
      comment_count: commentsCount || project.recentComments?.length || 0,
      activity_count: activitiesCount || project.recentHistory?.length || 0
    };
    
    console.log('Generated analytics from project data with fallback counts:', analyticsFromProject);
    setAnalytics(analyticsFromProject);
  };

  const calculatePercentage = (value, max = 7) => Math.round((value / max) * 100);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb'
      }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem',
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb'
      }}>
        <AlertTriangle size={48} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
        <h3 style={{ color: '#111827', marginBottom: '0.5rem' }}>No Project Data</h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Project information is not available for analytics.
        </p>
        <button
          onClick={() => project?.id ? loadAnalytics() : generateAnalyticsFromProject()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const overallProgress = Math.round(
    (analytics.pm_progress + analytics.leadership_progress + 
     analytics.change_mgmt_progress + analytics.career_dev_progress) / 4
  );

  const progressData = [
    { key: 'PM', label: 'Traditional Project Management', value: analytics.pm_progress, color: '#3b82f6' },
    { key: 'Leadership', label: 'Leadership', value: analytics.leadership_progress, color: '#10b981' },
    { key: 'ChangeMgmt', label: 'Organizational Change Management', value: analytics.change_mgmt_progress, color: '#8b5cf6' },
    { key: 'CareerDev', label: 'Career Development', value: analytics.career_dev_progress, color: '#f59e0b' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Project Analytics
          </h2>
          <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0' }}>
            Performance insights and team metrics for {project?.name || 'this project'}
          </p>
        </div>
        <button
          onClick={() => project?.id ? loadAnalytics() : generateAnalyticsFromProject()}
          disabled={loading}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151'
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <MetricCard
          icon={Target}
          title="Overall Progress"
          value={`${calculatePercentage(overallProgress)}%`}
          subtitle={`${overallProgress}/7 average score`}
          color="#2563eb"
        />
        <MetricCard
          icon={Users}
          title="Team Members"
          value={analytics.team_size || 0}
          subtitle={`${teamMembersDetailed.length} active members`}
          color="#16a34a"
        />
        <MetricCard
          icon={Activity}
          title="Activities"
          value={analytics.activity_count || 0}
          subtitle="Project history entries"
          color="#d97706"
        />
        <MetricCard
          icon={CheckCircle}
          title="Comments"
          value={analytics.comment_count || 0}
          subtitle="Team discussions"
          color="#be185d"
        />
      </div>

      {/* Progress Breakdown */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <BarChart3 size={20} style={{ color: '#374151' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Progress Breakdown
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {progressData.map(category => {
            const percentage = calculatePercentage(category.value);
            return (
              <div key={category.key}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '0.5rem' 
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    {category.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {category.value}/7
                    </span>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: category.color 
                    }}>
                      {percentage}%
                    </span>
                  </div>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '0.75rem', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: category.color,
                      width: `${percentage}%`,
                      borderRadius: '9999px',
                      transition: 'width 0.8s ease-in-out'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Status */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <CheckCircle size={20} style={{ color: '#374151' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Project Status
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <StatusIndicator 
            label="Current Status" 
            value={analytics.status?.replace('_', ' ') || 'Unknown'}
            color={getStatusColor(analytics.status)}
          />
          <StatusIndicator 
            label="Priority Level" 
            value={analytics.priority?.charAt(0).toUpperCase() + analytics.priority?.slice(1) || 'Medium'}
            color={getPriorityColor(analytics.priority)}
          />
          <StatusIndicator 
            label="Overall Health" 
            value={overallProgress >= 5 ? 'Good' : overallProgress >= 3 ? 'Fair' : 'Needs Attention'}
            color={overallProgress >= 5 ? '#10b981' : overallProgress >= 3 ? '#f59e0b' : '#ef4444'}
          />
          {project?.deadline && (
            <StatusIndicator 
              label="Deadline" 
              value={new Date(project.deadline).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
              color="#6b7280"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
    textAlign: 'center'
  }}>
    <div style={{ 
      width: '3rem', 
      height: '3rem', 
      backgroundColor: `${color}15`, 
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1rem auto'
    }}>
      <Icon size={24} style={{ color }} />
    </div>
    <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>
      {value}
    </h3>
    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
      {title}
    </p>
    {subtitle && (
      <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
        {subtitle}
      </p>
    )}
  </div>
);

const StatusIndicator = ({ label, value, color }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem'
  }}>
    <span style={{ fontSize: '0.875rem', color: '#374151' }}>{label}</span>
    <span style={{
      fontSize: '0.875rem',
      fontWeight: '600',
      color,
      backgroundColor: `${color}15`,
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      textTransform: 'capitalize'
    }}>
      {value}
    </span>
  </div>
);

// Helper Functions
const getStatusColor = (status) => {
  const colors = {
    'active': '#10b981',
    'planning': '#f59e0b',
    'completed': '#3b82f6',
    'on_hold': '#ef4444'
  };
  return colors[status] || '#6b7280';
};

const getPriorityColor = (priority) => {
  const colors = {
    'low': '#6b7280',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#dc2626'
  };
  return colors[priority] || '#f59e0b';
};

export default ProjectAnalyticsSection;