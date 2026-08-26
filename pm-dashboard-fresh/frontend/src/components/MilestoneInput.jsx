// frontend/src/components/MilestoneInput.jsx
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const MilestoneInput = ({ milestones, onChange, fieldErrors = {} }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    const invalidMilestoneIndices = Object.keys(fieldErrors)
      .map((key) => {
        const match = key.match(/^milestone_(\d+)_/);
        return match ? Number(match[1]) : -1;
      })
      .filter((index) => index >= 0);

    if (invalidMilestoneIndices.length === 0) return;

    const firstInvalidIndex = Math.min(...invalidMilestoneIndices);
    if (expandedIndex !== firstInvalidIndex) {
      setExpandedIndex(firstInvalidIndex);
    }
  }, [fieldErrors, expandedIndex]);

  const handleAddMilestone = () => {
    const newMilestone = {
      id: `temp_${Date.now()}`,
      title: `Milestone ${milestones.length + 1}`,
      description: '',
      planned_value: 0,
      start_date: '',
      end_date: '',
      status: 'planning',
      order_index: milestones.length
    };
    onChange([...milestones, newMilestone]);
    setExpandedIndex(milestones.length);
  };

  const handleRemoveMilestone = (index) => {
    const updated = milestones.filter((_, i) => i !== index);
    onChange(updated.map((m, i) => ({ ...m, order_index: i })));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleUpdateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <label style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151',
          margin: 0
        }}>
          Milestones ({milestones.length})
        </label>
        <button
          type="button"
          onClick={handleAddMilestone}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          <Plus size={16} />
          Add Milestone
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {milestones.length === 0 ? (
          <p style={{
            color: '#9ca3af',
            fontSize: '0.875rem',
            padding: '1rem',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            margin: 0
          }}>
            No milestones yet. Click "Add Milestone" to create one.
          </p>
        ) : (
          milestones.map((milestone, index) => {
            const titleError = fieldErrors[`milestone_${index}_title`];
            const descriptionError = fieldErrors[`milestone_${index}_description`];
            const plannedValueError = fieldErrors[`milestone_${index}_planned_value`];
            const endDateError = fieldErrors[`milestone_${index}_end_date`];
            const hasMilestoneError = Boolean(titleError || descriptionError || plannedValueError || endDateError);

            return (
            <div key={milestone.id || index} style={{
              border: `1px solid ${hasMilestoneError ? '#ef4444' : '#d1d5db'}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
              backgroundColor: 'white'
            }}>
              {/* Milestone Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: hasMilestoneError ? '#fef2f2' : '#f9fafb',
                cursor: 'pointer',
                userSelect: 'none'
              }} onClick={() => toggleExpand(index)}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    {milestone.title || `Milestone ${index + 1}`}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {milestone.end_date ? `Due: ${milestone.end_date}` : 'No end date set'}
                    {milestone.planned_value > 0 && ` • PV: $${Number(milestone.planned_value).toLocaleString()}`}
                  </p>
                  {hasMilestoneError && (
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                      This milestone has validation errors.
                    </p>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {expandedIndex === index ? (
                    <ChevronUp size={16} color="#6b7280" />
                  ) : (
                    <ChevronDown size={16} color="#6b7280" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMilestone(index);
                    }}
                    style={{
                      padding: '0.375rem',
                      backgroundColor: '#fee2e2',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      color: '#dc2626',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Milestone Details - Expanded */}
              {expandedIndex === index && (
                <div style={{
                  padding: '1rem',
                  borderTop: '1px solid #d1d5db',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem'
                }}>
                  {/* Title */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.375rem'
                    }}>
                      Milestone Title *
                    </label>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => handleUpdateMilestone(index, 'title', e.target.value)}
                      placeholder="e.g., Phase 1 - Requirements"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${titleError ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {titleError && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                        {titleError}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.375rem'
                    }}>
                      Description
                    </label>
                    <textarea
                      value={milestone.description}
                      onChange={(e) => handleUpdateMilestone(index, 'description', e.target.value)}
                      placeholder="Describe the milestone details and the deliverables produced by this milestone."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${descriptionError ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                    {descriptionError && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                        {descriptionError}
                      </p>
                    )}
                  </div>

                  {/* Planned Value */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.375rem'
                    }}>
                      Planned Value ($) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={milestone.planned_value}
                      onChange={(e) => handleUpdateMilestone(index, 'planned_value', e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${plannedValueError ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {plannedValueError && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                        {plannedValueError}
                      </p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.375rem'
                    }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={milestone.start_date}
                      onChange={(e) => handleUpdateMilestone(index, 'start_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.375rem'
                    }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={milestone.end_date}
                      onChange={(e) => handleUpdateMilestone(index, 'end_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: `1px solid ${endDateError ? '#ef4444' : '#d1d5db'}`,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {endDateError && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: '#dc2626' }}>
                        {endDateError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      <p style={{
        fontSize: '0.75rem',
        color: '#6b7280',
        margin: '0.75rem 0 0 0'
      }}>
        Milestones allow you to track project progress in phases, with each milestone having its own Earned Value metrics.
      </p>
    </div>
  );
};

export default MilestoneInput;
