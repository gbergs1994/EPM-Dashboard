import React, { useState } from 'react';
import { Target, CheckCircle, Award, Activity, Users } from 'lucide-react';

// Progress Update Section Component
const ProgressUpdateSection = ({ project, onUpdateProgress, currentUser }) => {
  const [progressData, setProgressData] = useState({
    status: project.status || 'planning',
    priority: project.priority || 'medium',
    deadline: project.deadline || '',
    progress: {
      PM: project.progress?.PM || 0,
      Leadership: project.progress?.Leadership || 0,
      ChangeMgmt: project.progress?.ChangeMgmt || 0,
      CareerDev: project.progress?.CareerDev || 0
    },
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);

  const statusOptions = [
    { value: 'planning', label: 'Planning', color: '#f59e0b' },
    { value: 'active', label: 'Active', color: '#10b981' },
    { value: 'on_hold', label: 'On Hold', color: '#ef4444' },
    { value: 'completed', label: 'Completed', color: '#2563eb' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#6b7280' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'critical', label: 'Critical', color: '#7f1d1d' }
  ];

  const progressCategories = [
    { key: 'PM', label: 'Project Management', color: '#3b82f6', icon: Target },
    { key: 'Leadership', label: 'Leadership', color: '#10b981', icon: Award },
    { key: 'ChangeMgmt', label: 'Change Management', color: '#8b5cf6', icon: Activity },
    { key: 'CareerDev', label: 'Career Development', color: '#f59e0b', icon: Users }
  ];

  const handleProgressChange = (category, value) => {
    setProgressData(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        [category]: parseInt(value)
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const updatedProject = {
        ...project,
        ...progressData,
        lastUpdate: 'Just now',
        updatedAt: new Date().toISOString()
      };

      if (onUpdateProgress) {
        onUpdateProgress(updatedProject);
      }

      setShowSubmitted(true);
      setTimeout(() => setShowSubmitted(false), 3000);

    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOverallProgress = () => {
    return Math.round((progressData.progress.PM / 7) * 100);
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Target size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Update Project Progress
            </h3>
            <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
              Update status, priorities, and progress metrics
            </p>
          </div>
        </div>

        {/* Overall Progress Indicator */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '0.5rem',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
              Current Project Completion
            </span>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#10b981',
              backgroundColor: '#dcfce7',
              padding: '0.5rem 1rem',
              borderRadius: '9999px'
            }}>
              {getOverallProgress()}%
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
            Based on Project Management progress only
          </p>
        </div>
      </div>

      {/* Status and Priority Updates */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          Project Status & Priority
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Status
            </label>
            <select
              value={progressData.status}
              onChange={(e) => setProgressData(prev => ({ ...prev, status: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Priority
            </label>
            <select
              value={progressData.priority}
              onChange={(e) => setProgressData(prev => ({ ...prev, priority: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            Deadline
          </label>
          <input
            type="date"
            value={progressData.deadline}
            onChange={(e) => setProgressData(prev => ({ ...prev, deadline: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Progress Categories */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
          Progress by Category (Scale: 0-7)
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {progressCategories.map(category => {
            const Icon = category.icon;
            const currentValue = progressData.progress[category.key];
            const percentage = (currentValue / 7) * 100;

            return (
              <div key={category.key} style={{
                padding: '1.5rem',
                backgroundColor: '#fafbfc',
                borderRadius: '0.75rem',
                border: `2px solid ${category.color}20`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    backgroundColor: `${category.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={16} style={{ color: category.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                      {category.label}
                    </h5>
                  </div>
                  <span style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: category.color,
                    backgroundColor: `${category.color}15`,
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px'
                  }}>
                    {currentValue}/7
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="7"
                    value={currentValue}
                    onChange={(e) => handleProgressChange(category.key, e.target.value)}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, #ef4444 0%, #f59e0b 50%, ${category.color} 100%)`,
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: category.color,
                      width: `${percentage}%`,
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease-in-out'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes Section */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
          Update Notes (Optional)
        </label>
        <textarea
          value={progressData.notes}
          onChange={(e) => setProgressData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add notes about this update..."
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Submit Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        backgroundColor: '#f0fdf4',
        borderRadius: '0.5rem',
        border: '1px solid #bbf7d0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {showSubmitted && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#047857',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <CheckCircle size={16} />
              Progress updated successfully!
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 2rem',
            background: isSubmitting
              ? 'linear-gradient(to right, #9ca3af, #6b7280)'
              : 'linear-gradient(to right, #10b981, #059669)',
            border: 'none',
            borderRadius: '0.5rem',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)'
          }}
        >
          {isSubmitting ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Updating...
            </>
          ) : (
            <>
              <Target size={16} />
              Update Progress
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProgressUpdateSection;