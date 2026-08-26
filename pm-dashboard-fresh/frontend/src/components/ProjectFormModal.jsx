// frontend/src/components/ProjectFormModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, User, AlertCircle } from 'lucide-react';
import apiService from '../services/apiService';
import MilestoneInput from './MilestoneInput';

const ProjectFormModal = ({ isOpen, onClose, onSubmit, project }) => {
  const normalizeDeadlineForInput = (rawDeadline) => {
    if (
      rawDeadline === null ||
      rawDeadline === undefined ||
      rawDeadline === '' ||
      rawDeadline === '0' ||
      rawDeadline === 0
    ) {
      return '';
    }

    const parsed = new Date(rawDeadline);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) {
      return '';
    }

    return parsed.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    deadline: '',
    stakeholder: '',
    team: []
  });
  const [milestones, setMilestones] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    if (project) {
      const normalizedTeam = Array.isArray(project.team)
        ? project.team
            .map((member) => {
              if (member && typeof member === 'object') {
                return {
                  id: member.id,
                  name: member.name,
                  email: member.email,
                  role: member.role || 'Team Member',
                  contribution: Number(member.contribution ?? member.workload_allocation ?? 20),
                  workload_allocation: Number(member.workload_allocation ?? member.contribution ?? 20),
                  skills: Array.isArray(member.skills) ? member.skills : []
                };
              }

              return null;
            })
            .filter(Boolean)
        : [];

      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        deadline: normalizeDeadlineForInput(project.deadline),
        stakeholder:
          project.stakeholder ||
          project.beneficiary ||
          project.who_benefits_from_this_project ||
          project.whoBenefitsFromThisProject ||
          '',
        team: normalizedTeam
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        deadline: '',
        stakeholder: '',
        team: []
      });
    }

    setError('');
    setFieldErrors({});
  }, [isOpen, project]);

  useEffect(() => {
    const loadAvailableMembers = async () => {
      if (!isOpen) return;

      try {
        const result = await apiService.getAllUsers();
        if (result.success && Array.isArray(result.users)) {
          setAvailableMembers(result.users);
        } else {
          setAvailableMembers([]);
        }
      } catch (loadError) {
        console.error('Error loading available members:', loadError);
        setAvailableMembers([]);
      }
    };

    loadAvailableMembers();
  }, [isOpen]);

  useEffect(() => {
    const loadProjectMilestones = async () => {
      if (!isOpen || !project?.id) {
        setMilestones([]);
        return;
      }

      try {
        const result = await apiService.getMilestonesByProject(project.id);
        if (result.success && Array.isArray(result.milestones)) {
          setMilestones(result.milestones);
        } else {
          setMilestones([]);
        }
      } catch (loadError) {
        console.error('Error loading milestones:', loadError);
        setMilestones([]);
      }
    };

    loadProjectMilestones();
  }, [isOpen, project?.id]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMilestonesChange = (updatedMilestones) => {
    setMilestones(updatedMilestones);

    // Clear milestone-specific errors after user edits milestones.
    if (Object.keys(fieldErrors).some((key) => key.startsWith('milestone_'))) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith('milestone_')) {
            delete next[key];
          }
        });
        return next;
      });
    }
  };

  const handleTeamChange = (member) => {
    const isCurrentMember = formData.team.some((m) => Number(m.id) === Number(member.id));
    if (isCurrentMember) {
      setFormData((prev) => ({
        ...prev,
        team: prev.team.filter((m) => Number(m.id) !== Number(member.id))
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        team: [
          ...prev.team,
          {
            id: member.id,
            name: member.name,
            email: member.email,
            role: 'Team Member',
            contribution: 20,
            workload_allocation: 20,
            skills: []
          }
        ]
      }));
    }
  };

  const handleTeamWorkloadChange = (memberId, rawValue) => {
    const parsed = Number.parseInt(rawValue, 10);
    const value = Number.isNaN(parsed) ? 0 : parsed;

    setFormData((prev) => ({
      ...prev,
      team: prev.team.map((member) => {
        if (Number(member.id) !== Number(memberId)) {
          return member;
        }

        return {
          ...member,
          contribution: value,
          workload_allocation: value
        };
      })
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!formData.description.trim()) {
      errors.description = 'Project description is required';
    }
    if (!formData.stakeholder.trim()) {
      errors.stakeholder = 'Please specify who benefits from the outputs of the project';
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        errors.deadline = 'Deadline cannot be in the past';
      }
    }

    milestones.forEach((m, idx) => {
      const prefix = `milestone_${idx}`;
      if (!m.title || !m.title.trim()) {
        errors[`${prefix}_title`] = 'Milestone title is required';
      }
      if (!m.description || !m.description.trim()) {
        errors[`${prefix}_description`] = 'Milestone description is required';
      }
      if (!m.end_date) {
        errors[`${prefix}_end_date`] = 'Milestone end date is required';
      }
      if ((Number(m.planned_value) || 0) <= 0) {
        errors[`${prefix}_planned_value`] = 'Milestone planned value must be greater than 0';
      }
    });

    formData.team.forEach((member, idx) => {
      const memberWorkload = Number(member.workload_allocation ?? member.contribution ?? 0);
      if (memberWorkload < 1 || memberWorkload > 100) {
        errors[`team_workload_${idx}`] = `Workload for ${member.name || 'member'} must be between 1 and 100`;
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Please fix the highlighted errors');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await onSubmit(formData);
      const projectId = response?.id || response?.data?.id;

      if (milestones.length > 0 && projectId) {
        const milestonesToSave = milestones.map((m, idx) => ({
          title: (m.title || `Milestone ${idx + 1}`).trim(),
          description: (m.description || '').trim(),
          planned_value: Number(m.planned_value) || 0,
          start_date: m.start_date || null,
          end_date: m.end_date,
          status: m.status || 'planning',
          order_index: m.order_index ?? idx
        }));

        if (project?.id) {
          const existing = await apiService.getMilestonesByProject(project.id);
          if (existing.success && Array.isArray(existing.milestones)) {
            await Promise.all(existing.milestones.map(m => apiService.deleteMilestone(m.id)));
          }
        }

        await apiService.createMilestones(projectId, milestonesToSave);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('project-milestones-updated', {
              detail: { projectId: Number(projectId) }
            })
          );
        }
      }

      setFormData({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        deadline: '',
        stakeholder: '',
        team: []
      });
      setMilestones([]);
      onClose();
    } catch (submitError) {
      console.error('Project submission failed:', submitError);
      setError(submitError.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.75rem', border: `1px solid ${fieldErrors.name ? '#ef4444' : '#d1d5db'}`, borderRadius: '0.5rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
              rows={3}
              style={{ width: '100%', padding: '0.75rem', border: `1px solid ${fieldErrors.description ? '#ef4444' : '#d1d5db'}`, borderRadius: '0.5rem', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Who benefits from the outputs of the project? *
            </label>
            <input
              type="text"
              value={formData.stakeholder}
              onChange={(e) => handleInputChange('stakeholder', e.target.value)}
              disabled={isSubmitting}
              placeholder="Describe the kind of person whose life will be better for using the results from this project."
              style={{ width: '100%', padding: '0.75rem', border: `1px solid ${fieldErrors.stakeholder ? '#ef4444' : '#d1d5db'}`, borderRadius: '0.5rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Deadline (Optional)
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => handleInputChange('deadline', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.75rem', border: `1px solid ${fieldErrors.deadline ? '#ef4444' : '#d1d5db'}`, borderRadius: '0.5rem' }}
            />
          </div>

          <MilestoneInput
            milestones={milestones}
            onChange={handleMilestonesChange}
            fieldErrors={fieldErrors}
          />

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Team Members
            </label>
            <div style={{
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {availableMembers.map(member => {
                const selectedMember = formData.team.find((m) => Number(m.id) === Number(member.id));
                const isCurrentMember = Boolean(selectedMember);
                return (
                  <label key={member.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    backgroundColor: isCurrentMember ? '#f0f9ff' : 'transparent',
                    marginBottom: '0.25rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={isCurrentMember}
                      onChange={() => handleTeamChange(member)}
                      disabled={isSubmitting}
                      style={{ margin: 0 }}
                    />
                    <span style={{ color: isCurrentMember ? '#0369a1' : '#374151', fontWeight: isCurrentMember ? '600' : '400', flex: 1 }}>
                      {member.name} ({member.email})
                    </span>
                    {isCurrentMember && (
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedMember.workload_allocation ?? selectedMember.contribution ?? 20}
                        onChange={(e) => handleTeamWorkloadChange(member.id, e.target.value)}
                        disabled={isSubmitting}
                        style={{
                          width: '84px',
                          padding: '0.35rem 0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem'
                        }}
                      />
                    )}
                  </label>
                );
              })}
            </div>
            {formData.team.length > 0 && (
              <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                Set workload % (1-100) for each selected team member.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(to right, #2563eb, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectFormModal;
