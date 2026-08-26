// frontend/src/components/MilestoneCard.jsx
import React, { useEffect, useState } from 'react';
import { Calendar, TrendingUp, AlertCircle, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import apiService from '../services/apiService';

const MilestoneCard = ({ milestone, projectId, onUpdate, isEditing = true }) => {
  const [completionPercentage, setCompletionPercentage] = useState(
    milestone.completion_percentage || 0
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [actualCost, setActualCost] = useState(milestone.actual_cost || 0);
  const [showCostInput, setShowCostInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadComments = async () => {
    if (!milestone?.id) return;

    try {
      setCommentsLoading(true);
      setCommentsError('');
      const result = await apiService.getMilestoneComments(milestone.id);
      if (result?.success) {
        setComments(result.comments || []);
      } else {
        setComments([]);
      }
    } catch (err) {
      setCommentsError(err.message || 'Failed to load milestone comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [milestone?.id]);

  const calculateEarnedValue = () => {
    const pv = Number(milestone.planned_value) || 0;
    const ev = (pv * completionPercentage) / 100;
    return ev;
  };

  const calculateIndices = () => {
    const ev = calculateEarnedValue();
    const ac = Number(actualCost) || 0;
    const pv = Number(milestone.planned_value) || 0;

    const spi = pv > 0 ? ev / pv : null;
    const cpi = ac > 0 ? ev / ac : null;
    const cv = (ev - ac).toFixed(2);
    const sv = (ev - pv).toFixed(2);

    return { ev: ev.toFixed(2), spi, cpi, cv, sv };
  };

  const handlePercentageChange = (e) => {
    const value = Math.min(100, Math.max(0, Number(e.target.value) || 0));
    setCompletionPercentage(value);
    setError('');
  };

  const handleActualCostChange = (e) => {
    const value = Math.max(0, Number(e.target.value) || 0);
    setActualCost(value);
    setError('');
  };

  const handleSave = async () => {
    if (!isEditing) return;

    if (!commentText.trim()) {
      setError('Please enter a comment before saving milestone changes.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await apiService.updateMilestone(milestone.id, {
        completion_percentage: completionPercentage,
        actual_cost: actualCost,
        comment: commentText.trim()
      });

      if (onUpdate) {
        onUpdate({
          ...milestone,
          completion_percentage: completionPercentage,
          actual_cost: actualCost,
          earned_value: calculateEarnedValue()
        });
      }

      setCommentText('');
      await loadComments();
    } catch (err) {
      console.error('Error updating milestone:', err);
      setError(err.message || 'Failed to update milestone');
    } finally {
      setIsSaving(false);
    }
  };

  const indices = calculateIndices();
  const ev = calculateEarnedValue();

  const formatCurrency = (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const formatIndex = (value) => (value == null ? 'N/A' : Number(value).toFixed(2));

  const getIndexInterpretation = (value, type) => {
    if (value == null) return 'Unavailable';

    if (type === 'spi') {
      if (value > 1.5) return 'Exceptionally ahead of schedule';
      if (value < 0.5) return 'extremely behind schedule';
      if (value > 1) return 'On Schedule';
      if (value < 1) return 'Behind Schedule';
      return 'On Plan';
    }

    if (value > 1.5) return 'Exceptionally under budget';
    if (value < 0.5) return 'Extremely over budget';
    if (value > 1) return 'Under Budget';
    if (value < 1) return 'Over Budget';
    return 'On Plan';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const statusColors = {
    planning: '#9ca3af',
    in_progress: '#f59e0b',
    completed: '#10b981',
    on_hold: '#ef4444'
  };

  const statusLabels = {
    planning: 'Planning',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold'
  };

  return (
    <div style={{
      border: '1px solid #d1d5db',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '0.5rem'
        }}>
          <div>
            <h3 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {milestone.title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {milestone.description}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              backgroundColor: '#f0f9ff',
              color: statusColors[milestone.status] || '#6b7280'
            }}>
              {statusLabels[milestone.status] || milestone.status}
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                color: '#374151',
                padding: '0.35rem 0.55rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              aria-label={isCollapsed ? 'Expand milestone details' : 'Collapse milestone details'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              {isCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
        </div>

        {/* Key Dates */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          {milestone.start_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} />
              Start: {formatDate(milestone.start_date)}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} />
            End: {formatDate(milestone.end_date)}
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <>
      {/* Comment History */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          <MessageSquare size={16} style={{ color: '#475569' }} />
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1f2937' }}>Comment History</h4>
        </div>

        {commentsLoading && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>Loading comments...</p>
        )}

        {!commentsLoading && commentsError && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>{commentsError}</p>
        )}

        {!commentsLoading && !commentsError && comments.length === 0 && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>No milestone comments yet.</p>
        )}

        {!commentsLoading && !commentsError && comments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {comments.map((comment) => (
              <div
                key={comment.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  backgroundColor: 'white',
                  padding: '0.6rem 0.75rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#64748b',
                  marginBottom: '0.3rem'
                }}>
                  <span>{comment.user_name || 'Project Manager'}</span>
                  <span>{formatDateTime(comment.created_at)}</span>
                </div>
                <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.82rem', color: '#1f2937' }}>
                  {comment.content}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: '0.72rem',
                  color: '#475569'
                }}>
                  <span>Completion: {Number(comment.completion_percentage || 0)}%</span>
                  <span>AC: {formatCurrency(comment.actual_cost || 0)}</span>
                  <span>EV: {formatCurrency(comment.earned_value || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EVM Metrics */}
      <div style={{
        padding: '1.25rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {/* Planned Value */}
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f0f9ff',
          borderRadius: '0.5rem'
        }}>
          <p style={{
            margin: '0 0 0.25rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#0369a1',
            textTransform: 'uppercase'
          }}>
            Planned Value (PV)
          </p>
          <p style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: '700',
            color: '#111827'
          }}>
            {formatCurrency(milestone.planned_value)}
          </p>
        </div>

        {/* Actual Cost */}
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fee2e2',
          borderRadius: '0.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.25rem'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#dc2626',
              textTransform: 'uppercase'
            }}>
              Actual Cost (AC)
            </p>
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowCostInput(!showCostInput)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  backgroundColor: 'white',
                  border: '1px solid #fecaca',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  color: '#dc2626'
                }}
              >
                {showCostInput ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
          {showCostInput ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={actualCost}
              onChange={handleActualCostChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          ) : (
            <p style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {formatCurrency(actualCost)}
            </p>
          )}
        </div>

        {/* Earned Value */}
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '0.5rem'
        }}>
          <p style={{
            margin: '0 0 0.25rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#15803d',
            textTransform: 'uppercase'
          }}>
            Earned Value (EV)
          </p>
          <p style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: '700',
            color: '#111827'
          }}>
            {formatCurrency(ev)}
          </p>
        </div>

        {/* Completion % */}
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef3c7',
          borderRadius: '0.5rem'
        }}>
          <p style={{
            margin: '0 0 0.25rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#b45309',
            textTransform: 'uppercase'
          }}>
            Completion
          </p>
          {isEditing ? (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <input
                type="range"
                min="0"
                max="100"
                value={completionPercentage}
                onChange={handlePercentageChange}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: '#fbbf24',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                minWidth: '3rem',
                textAlign: 'right',
                fontSize: '1rem',
                fontWeight: '700',
                color: '#111827'
              }}>
                {completionPercentage}%
              </span>
            </div>
          ) : (
            <p style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827'
            }}>
              {completionPercentage}%
            </p>
          )}
        </div>
      </div>

      {/* Performance Indices */}
      <div style={{
        padding: '1.25rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <p style={{
            margin: '0 0 0.375rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase'
          }}>
            Schedule Performance Index (SPI)
          </p>
          <p style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: indices.spi == null ? '#6b7280' : indices.spi >= 1 ? '#10b981' : '#ef4444'
          }}>
            {formatIndex(indices.spi)}
          </p>
          <p style={{
            margin: '0.25rem 0 0 0',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            {getIndexInterpretation(indices.spi, 'spi')}
          </p>
        </div>

        <div>
          <p style={{
            margin: '0 0 0.375rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase'
          }}>
            Cost Performance Index (CPI)
          </p>
          <p style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: indices.cpi == null ? '#6b7280' : indices.cpi >= 1 ? '#10b981' : '#ef4444'
          }}>
            {formatIndex(indices.cpi)}
          </p>
          <p style={{
            margin: '0.25rem 0 0 0',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            {getIndexInterpretation(indices.cpi, 'cpi')}
          </p>
        </div>

        <div>
          <p style={{
            margin: '0 0 0.375rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase'
          }}>
            Schedule Variance (SV)
          </p>
          <p style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: indices.sv >= 0 ? '#10b981' : '#ef4444'
          }}>
            {formatCurrency(indices.sv)}
          </p>
        </div>

        <div>
          <p style={{
            margin: '0 0 0.375rem 0',
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6b7280',
            textTransform: 'uppercase'
          }}>
            Cost Variance (CV)
          </p>
          <p style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: indices.cv >= 0 ? '#10b981' : '#ef4444'
          }}>
            {formatCurrency(indices.cv)}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#dc2626',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Actions */}
      {isEditing && (
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155' }}>
              Save Comment (required)
            </span>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Describe what changed and why..."
              rows={3}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.6rem',
                fontSize: '0.85rem',
                resize: 'vertical',
                minHeight: '72px'
              }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !commentText.trim()}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isSaving || !commentText.trim() ? 'not-allowed' : 'pointer',
              opacity: isSaving || !commentText.trim() ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => !isSaving && commentText.trim() && (e.target.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => !isSaving && commentText.trim() && (e.target.style.backgroundColor = '#3b82f6')}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default MilestoneCard;
