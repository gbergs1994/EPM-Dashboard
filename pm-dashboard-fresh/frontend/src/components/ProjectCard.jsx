// frontend/src/components/ProjectCard.jsx
import React, { useState } from 'react';
import { Calendar, Users, Target, FileText, Edit, Trash2, MoreVertical } from 'lucide-react';

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status) => {
    const statusColors = {
      'active': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
      'planning': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      'completed': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      'on_hold': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }
    };
    return statusColors[status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'low': { bg: '#f3f4f6', text: '#6b7280' },
      'medium': { bg: '#fef3c7', text: '#92400e' },
      'high': { bg: '#fecaca', text: '#991b1b' },
      'critical': { bg: '#fee2e2', text: '#7f1d1d' }
    };
    return priorityColors[priority] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  const formatDeadline = (deadline) => {
    if (
      deadline === null ||
      deadline === undefined ||
      deadline === '' ||
      deadline === '0' ||
      deadline === 0
    ) {
      return {
        text: 'No deadline set',
        isOverdue: false
      };
    }

    const date = new Date(deadline);
    if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
      return {
        text: 'No deadline set',
        isOverdue: false
      };
    }

    const now = new Date();
    const isOverdue = date < now;
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue
    };
  };

  const getProjectBeneficiary = () => {
    const stakeholderValue =
      project.stakeholder ??
      project.beneficiary ??
      project.who_benefits_from_this_project ??
      project.whoBenefitsFromThisProject;

    if (typeof stakeholderValue === 'string' && stakeholderValue.trim()) {
      return stakeholderValue.trim();
    }

    return 'Not specified';
  };

  const getLastUpdatedText = () => {
    const explicitLastUpdate = project.lastUpdate || project.last_update;
    if (explicitLastUpdate && explicitLastUpdate !== 'Unknown') {
      return explicitLastUpdate;
    }

    const fallbackDate = project.updated_at || project.created_at;
    if (fallbackDate) {
      const parsed = new Date(fallbackDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }

    return 'recently';
  };

  const deadline = formatDeadline(project.deadline);
  const avgProgress = Math.round((project.progress?.PM || project.pm_progress || 0) * 100 / 7);
  const plannedValue = Number(project.evm?.planned_value ?? project.planned_value ?? 0);
  const actualCost = Number(project.evm?.actual_cost ?? project.actual_cost ?? 0);
  const earnedValue = Number(project.evm?.earned_value ?? project.earned_value ?? 0);
  const scheduleVariance = earnedValue - plannedValue;
  const costVariance = earnedValue - actualCost;
  const spi = plannedValue > 0 ? earnedValue / plannedValue : null;
  const cpi = actualCost > 0 ? earnedValue / actualCost : null;

  const formatCurrency = (value) => `$${Number(value || 0).toLocaleString()}`;
  const formatIndex = (value) => (value == null ? 'N/A' : value.toFixed(2));

  const getVarianceInterpretation = (value, positiveLabel, negativeLabel) => {
    if (value > 0) return positiveLabel;
    if (value < 0) return negativeLabel;
    return 'On Target';
  };

  const getIndexInterpretation = (
    value,
    aboveOneLabel,
    belowOneLabel,
    exceptionallyAboveLabel,
    extremelyBelowLabel
  ) => {
    if (value == null) return 'Unavailable';
    if (value > 1.5) return exceptionallyAboveLabel;
    if (value < 0.5) return extremelyBelowLabel;
    if (value > 1) return aboveOneLabel;
    if (value < 1) return belowOneLabel;
    return 'On Plan';
  };

  const getKpiBadgeStyle = (status) => {
    if (status === 'positive') {
      return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
    }
    if (status === 'negative') {
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
    }
    return { bg: '#e5e7eb', text: '#374151', border: '#d1d5db' };
  };

  const renderKpiBadge = (label, interpretation, status) => {
    const badge = getKpiBadgeStyle(status);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
        <span>{label}</span>
        <span style={{
          padding: '0.1rem 0.45rem',
          borderRadius: '9999px',
          backgroundColor: badge.bg,
          color: badge.text,
          border: `1px solid ${badge.border}`,
          fontWeight: '600'
        }}>
          {interpretation}
        </span>
      </div>
    );
  };

  const statusColors = getStatusColor(project.status);
  const priorityColors = getPriorityColor(project.priority);

  return (
    <div className="project-card" style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}>
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0, flex: 1 }}>
            {project.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="project-status-chip" style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: statusColors.bg,
              color: statusColors.text,
              border: `1px solid ${statusColors.border}`
            }}>
              {project.status.replace('_', ' ')}
            </span>

            <span className="project-priority-chip" style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: priorityColors.bg,
              color: priorityColors.text
            }}>
              {project.priority}
            </span>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowActions(!showActions)}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <MoreVertical size={16} />
              </button>

              {showActions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  minWidth: '120px'
                }}>
                  <button
                    onClick={() => {
                      onEdit(project);
                      setShowActions(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#374151'
                    }}
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(project);
                      setShowActions(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#ef4444',
                      borderTop: '1px solid #f3f4f6'
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.625', margin: '0 0 1.5rem 0' }}>
          {project.description}
        </p>

        {/* Simple Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Project Progress</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>{avgProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: avgProgress >= 80 ? 'linear-gradient(to right, #10b981, #059669)' :
                           avgProgress >= 60 ? 'linear-gradient(to right, #3b82f6, #2563eb)' :
                           avgProgress >= 40 ? 'linear-gradient(to right, #eab308, #ca8a04)' :
                           'linear-gradient(to right, #ef4444, #dc2626)',
                width: `${avgProgress}%`,
                transition: 'width 0.8s ease-in-out'
              }}
            />
          </div>
        </div>

        {/* Basic Project Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
            <Users size={16} style={{ color: '#9ca3af' }} />
                {/* FIXED: Use team_size from backend instead of team.length */}
                <span style={{ fontWeight: '500' }}>{project.team_size || 0} members</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: deadline.isOverdue ? '#ef4444' : '#9ca3af' }} />
            <span style={{ fontWeight: '500', color: deadline.isOverdue ? '#dc2626' : '#6b7280' }}>
              {deadline.text}
            </span>
          </div>
        </div>

        {/* Earned Value quick details */}
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            rowGap: '0.25rem',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>Earned Value</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>EV / PV / AC</span>
            {project.current_milestone?.id ? (
              <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                Current Milestone: {project.current_milestone.title || 'Untitled milestone'}
              </span>
            ) : (
              <span />
            )}
            <span />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#1f2937', fontWeight: '600', textAlign: 'right' }}>
              {formatCurrency(earnedValue)} / {formatCurrency(plannedValue)} / {formatCurrency(actualCost)}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
            <span>SPI: <strong>{formatIndex(spi)}</strong></span>
            <span>CPI: <strong>{formatIndex(cpi)}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginTop: '0.35rem' }}>
            <span>SV: <strong>{formatCurrency(scheduleVariance)}</strong></span>
            <span>CV: <strong>{formatCurrency(costVariance)}</strong></span>
          </div>
          <div style={{ marginTop: '0.4rem', borderTop: '1px dashed #d1d5db', paddingTop: '0.35rem' }}>
            {renderKpiBadge(
              'SV',
              getVarianceInterpretation(scheduleVariance, 'Ahead of Schedule', 'Behind Schedule'),
              scheduleVariance > 0 ? 'positive' : scheduleVariance < 0 ? 'negative' : 'neutral'
            )}
            {renderKpiBadge(
              'CV',
              getVarianceInterpretation(costVariance, 'Under Budget', 'Over Budget'),
              costVariance > 0 ? 'positive' : costVariance < 0 ? 'negative' : 'neutral'
            )}
            {renderKpiBadge(
              'SPI',
              getIndexInterpretation(
                spi,
                'Ahead of Schedule',
                'Behind Schedule',
                'Exceptionally ahead of schedule',
                'extremely behind schedule'
              ),
              spi == null ? 'neutral' : spi > 1 ? 'positive' : spi < 1 ? 'negative' : 'neutral'
            )}
            {renderKpiBadge(
              'CPI',
              getIndexInterpretation(
                cpi,
                'Under Budget',
                'Over Budget',
                'Exceptionally under budget',
                'Extremely over budget'
              ),
              cpi == null ? 'neutral' : cpi > 1 ? 'positive' : cpi < 1 ? 'negative' : 'neutral'
            )}
          </div>
        </div>

        {/* Beneficiary Section */}
        <div className="project-stakeholder-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              flexShrink: 0
            }}>
              <Target size={12} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {getProjectBeneficiary()}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Who benefits from the outputs of the project?
              </p>
            </div>
          </div>

        {/* Project Manager Section */}
        <div className="project-manager-mini-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '600',
              flexShrink: 0
            }}>
              {project.creator_avatar || project.creator_name?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {project.creator_name || 'Unknown'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Project Manager
              </p>
            </div>
          </div>


        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            <FileText size={12} />
            <span>Updated {getLastUpdatedText()}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('👁️ View Details button clicked for:', project.name);
              onView(project);
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(to right, #eff6ff, #dbeafe)',
              border: '1px solid #bfdbfe',
              borderRadius: '0.5rem',
              color: '#2563eb',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;