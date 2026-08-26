// frontend/src/components/ProjectMilestonesSection.jsx
import React, { useState, useEffect } from 'react';
import { Loader, TrendingUp } from 'lucide-react';
import MilestoneCard from './MilestoneCard';
import apiService from '../services/apiService';

const ProjectMilestonesSection = ({ projectId, currentUser }) => {
  const [milestones, setMilestones] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [summaryMode, setSummaryMode] = useState('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isProjectManager = currentUser?.role === 'Project Manager';

  useEffect(() => {
    if (projectId) {
      loadMilestones();
    }
  }, [projectId]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [milestonesResult, metricsResult] = await Promise.all([
        apiService.getMilestonesByProject(projectId),
        apiService.getProjectMilestoneMetrics(projectId)
      ]);

      if (milestonesResult.success && milestonesResult.milestones) {
        setMilestones(milestonesResult.milestones);
      }

      if (metricsResult.success && metricsResult.metrics) {
        setMetrics(metricsResult.metrics);
      }
    } catch (err) {
      console.error('Error loading milestones:', err);
      setError(err.message || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMilestones();
    setRefreshing(false);
  };

  const handleMilestoneUpdate = (updatedMilestone) => {
    setMilestones(prev =>
      prev.map(m => m.id === updatedMilestone.id ? updatedMilestone : m)
    );
    // Refresh metrics after milestone update
    handleRefresh();
  };

  const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  const formatIndex = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0.00';
    return numeric.toFixed(2);
  };

  const orderedMilestones = [...milestones].sort((a, b) => {
    const orderDiff = (Number(a.order_index) || 0) - (Number(b.order_index) || 0);
    if (orderDiff !== 0) return orderDiff;

    const aStart = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bStart = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;
    if (aStart !== bStart) return aStart - bStart;

    const aEnd = a.end_date ? new Date(a.end_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bEnd = b.end_date ? new Date(b.end_date).getTime() : Number.MAX_SAFE_INTEGER;
    if (aEnd !== bEnd) return aEnd - bEnd;

    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });

  const fallbackCurrentMilestone =
    orderedMilestones.find((m) => (Number(m.completion_percentage) || 0) < 100) ||
    orderedMilestones[orderedMilestones.length - 1] ||
    null;

  const isCurrentMode = summaryMode === 'current';
  const hasApiCurrentMilestone = (Number(metrics?.current_milestone_id) || 0) > 0;
  const hasCurrentMilestone = hasApiCurrentMilestone || !!fallbackCurrentMilestone;
  const currentMilestoneId = hasApiCurrentMilestone ? Number(metrics?.current_milestone_id) : Number(fallbackCurrentMilestone?.id) || null;
  const currentPv = hasApiCurrentMilestone ? Number(metrics?.current_planned_value) || 0 : Number(fallbackCurrentMilestone?.planned_value) || 0;
  const currentAc = hasApiCurrentMilestone ? Number(metrics?.current_actual_cost) || 0 : Number(fallbackCurrentMilestone?.actual_cost) || 0;
  const currentEv = hasApiCurrentMilestone ? Number(metrics?.current_earned_value) || 0 : Number(fallbackCurrentMilestone?.earned_value) || 0;
  const currentSpi = hasApiCurrentMilestone
    ? Number(metrics?.current_spi) || 0
    : (currentPv > 0 ? currentEv / currentPv : 0);
  const currentCpi = hasApiCurrentMilestone
    ? Number(metrics?.current_cpi) || 0
    : (currentAc > 0 ? currentEv / currentAc : 0);

  const activePv = isCurrentMode ? currentPv : Number(metrics?.total_planned_value) || 0;
  const activeAc = isCurrentMode ? currentAc : Number(metrics?.total_actual_cost) || 0;
  const activeEv = isCurrentMode ? currentEv : Number(metrics?.total_earned_value) || 0;
  const activeSpi = isCurrentMode ? currentSpi : Number(metrics?.spi) || 0;
  const activeCpi = isCurrentMode ? currentCpi : Number(metrics?.cpi) || 0;
  const activeCompletion = isCurrentMode
    ? (hasApiCurrentMilestone
      ? Number(metrics?.current_milestone_completion_percentage) || 0
      : Number(fallbackCurrentMilestone?.completion_percentage) || 0)
    : Number(metrics?.avg_completion_percentage) || 0;
  const currentMilestoneOrder = hasApiCurrentMilestone
    ? Number(metrics?.current_milestone_order_index)
    : Number(fallbackCurrentMilestone?.order_index);
  const currentMilestoneName = hasApiCurrentMilestone
    ? (metrics?.current_milestone_title || 'No current milestone')
    : (fallbackCurrentMilestone?.title || 'No current milestone');

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center'
      }}>
        <Loader size={32} style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
        <p style={{
          marginTop: '1rem',
          color: '#6b7280'
        }}>
          Loading milestones...
        </p>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '0.75rem',
        border: '1px dashed #d1d5db'
      }}>
        <TrendingUp size={48} style={{
          margin: '0 auto 1rem',
          color: '#d1d5db'
        }} />
        <h3 style={{
          margin: '0 0 0.5rem 0',
          color: '#6b7280',
          fontSize: '1rem',
          fontWeight: '600'
        }}>
          No Milestones Yet
        </h3>
        <p style={{
          margin: '0 0 1rem 0',
          color: '#9ca3af',
          fontSize: '0.875rem'
        }}>
          Create milestones in the project edit form to track progress in phases.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Metrics Summary */}
      {metrics && (
        <>
          <div style={{
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'inline-flex',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}>
              <button
                type="button"
                onClick={() => setSummaryMode('current')}
                style={{
                  padding: '0.45rem 0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  backgroundColor: isCurrentMode ? '#1d4ed8' : 'transparent',
                  color: isCurrentMode ? '#ffffff' : '#374151'
                }}
              >
                Current Milestone
              </button>
              <button
                type="button"
                onClick={() => setSummaryMode('total')}
                style={{
                  padding: '0.45rem 0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  backgroundColor: !isCurrentMode ? '#1d4ed8' : 'transparent',
                  color: !isCurrentMode ? '#ffffff' : '#374151'
                }}
              >
                Total Portfolio
              </button>
            </div>

            {isCurrentMode && hasCurrentMilestone && (
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
                Viewing: {currentMilestoneName}
              </p>
            )}
          </div>

          <div style={{
            marginBottom: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
          {/* Total Metrics Cards */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            borderRadius: '0.75rem',
            border: '1px solid #bae6fd'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#0369a1',
              textTransform: 'uppercase'
            }}>
              {isCurrentMode ? 'Current Milestone' : 'Total Milestones'}
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {isCurrentMode
                ? (hasCurrentMilestone ? `M${Number.isFinite(currentMilestoneOrder) ? currentMilestoneOrder + 1 : (currentMilestoneId || '-')}` : 'N/A')
                : metrics.total_milestones}
            </p>
            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              {isCurrentMode
                ? (hasCurrentMilestone ? `${activeCompletion.toFixed(2)}% complete` : 'No milestone data')
                : `${metrics.completed_milestones} completed`}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '0.75rem',
            border: '1px solid #bbf7d0'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#15803d',
              textTransform: 'uppercase'
            }}>
              {isCurrentMode ? 'Current Planned Value' : 'Total Planned Value'}
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {formatCurrency(activePv)}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '0.75rem',
            border: '1px solid #bfdbfe'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#1d4ed8',
              textTransform: 'uppercase'
            }}>
              {isCurrentMode ? 'Current Actual Cost' : 'Total Actual Cost'}
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {formatCurrency(activeAc)}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.75rem',
            border: '1px solid #fde68a'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#b45309',
              textTransform: 'uppercase'
            }}>
              {isCurrentMode ? 'Current Earned Value' : 'Total Earned Value'}
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {formatCurrency(activeEv)}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f5f3ff',
            borderRadius: '0.75rem',
            border: '1px solid #e9d5ff'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#7c3aed',
              textTransform: 'uppercase'
            }}>
              Schedule Performance (SPI)
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: activeSpi >= 1 ? '#10b981' : '#ef4444'
            }}>
              {formatIndex(activeSpi)}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            borderRadius: '0.75rem',
            border: '1px solid #fecaca'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#dc2626',
              textTransform: 'uppercase'
            }}>
              Cost Performance (CPI)
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: activeCpi >= 1 ? '#10b981' : '#ef4444'
            }}>
              {formatIndex(activeCpi)}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase'
            }}>
              {isCurrentMode ? 'Milestone Completion' : 'Avg. Completion'}
            </p>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {activeCompletion.toFixed(3)}%
            </p>
          </div>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.75rem',
          color: '#dc2626',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Milestones List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {milestones.map((milestone, index) => (
          <div key={milestone.id || index}>
            <MilestoneCard
              milestone={milestone}
              projectId={projectId}
              onUpdate={handleMilestoneUpdate}
              isEditing={isProjectManager}
            />
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div style={{
        marginTop: '1.5rem',
        textAlign: 'center'
      }}>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            color: '#374151',
            opacity: refreshing ? 0.6 : 1,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => !refreshing && (e.target.style.backgroundColor = '#e5e7eb')}
          onMouseLeave={(e) => !refreshing && (e.target.style.backgroundColor = '#f3f4f6')}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>
    </div>
  );
};

export default ProjectMilestonesSection;
