import React, { useState, useEffect } from 'react';
import { X, User, Mail, Calendar, Award, Briefcase, UserCheck, Search, AlertCircle } from 'lucide-react';

const TeamMemberModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  member, 
  allUsers, 
  currentTeamMembers,
  loading,
  title = "Add Team Member"
}) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    role: 'Team Member',
    status: 'active',
    skills: [],
    contribution: 0,
    tasksCompleted: 0,
    joinedDate: new Date().toISOString().split('T')[0],
    avatar: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const allowedProjectRoles = ['Team Member', 'Project Manager', 'Executive Leader'];

  const normalizeProjectRole = (role) => {
    if (allowedProjectRoles.includes(role)) {
      return role;
    }
    return 'Team Member';
  };

  const commonSkills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
    'HTML/CSS', 'TypeScript', 'Vue.js', 'Angular', 'SQL', 'MongoDB',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
    'Problem Solving', 'Team Collaboration', 'UI/UX Design', 'Figma',
    'Adobe Creative Suite', 'Testing', 'QA', 'DevOps', 'AWS', 'Docker'
  ];

  useEffect(() => {
    if (isOpen) {
      if (member) {
        console.log('ðŸ”„ Editing member, loading data:', {
          contribution: member.contribution,
          tasksCompleted: member.tasksCompleted,
          skills: member.skills
        });
        
        setFormData({
          id: member.id || '',
          name: member.name || '',
          email: member.email || '',
          role: normalizeProjectRole(member.role),
          status: member.status || 'active',
          skills: Array.isArray(member.skills) ? member.skills : [],
          contribution: member.contribution ?? 0,
          tasksCompleted: member.tasksCompleted ?? 0,
          joinedDate: member.joinedDate || new Date().toISOString().split('T')[0],
          avatar: member.avatar || ''
        });
        setSearchUser(member.name || '');
      } else {
        console.log('ðŸ†• Adding new member, using defaults');
        setFormData({
          id: '',
          name: '',
          email: '',
          role: 'Team Member',
          status: 'active',
          skills: [],
          contribution: 0,
          tasksCompleted: 0,
          joinedDate: new Date().toISOString().split('T')[0],
          avatar: ''
        });
        setSearchUser('');
      }
      setErrors({});
      setSubmitError('');
      setNewSkill('');
    }
  }, [isOpen, member]);

  const availableUsers = allUsers.filter(user => 
    !currentTeamMembers.some(teamMember => teamMember.email === user.email) ||
    (member && user.email === member.email) 
  );

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const handleInputChange = (field, value) => {
    console.log(`ðŸ”„ Field ${field} changed to:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const handleUserSelect = (user) => {
    setFormData(prev => ({
      ...prev,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    }));
    setSearchUser(user.name);
    setShowUserDropdown(false);

    setErrors({});
    setSubmitError('');
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      handleInputChange('skills', [...formData.skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    handleInputChange('skills', formData.skills.filter(skill => skill !== skillToRemove));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else {
      if (!member) {
        const emailExists = currentTeamMembers.some(teamMember => 
          teamMember.email.toLowerCase() === formData.email.toLowerCase()
        );
        if (emailExists) {
          newErrors.email = 'This email is already on the team';
        }
      }
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    } else if (!allowedProjectRoles.includes(formData.role)) {
      newErrors.role = 'Role must be Team Member, Project Manager, or Executive Leader';
    }

    if (formData.contribution < 1 || formData.contribution > 100) {
      newErrors.contribution = 'Contribution must be between 0 and 100';
    }

    if (formData.tasksCompleted < 0) {
      newErrors.tasksCompleted = 'Tasks completed cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitError('');

      const finalData = {
        ...formData,
        avatar: formData.avatar || formData.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };

      console.log('ðŸ“¤ Submitting team member data:', {
        name: finalData.name,
        contribution: finalData.contribution,
        tasksCompleted: finalData.tasksCompleted,
        skills: finalData.skills
      });

      await onSubmit(finalData);
      
    } catch (error) {
      console.error('âŒ Team member submission error:', error);
      setSubmitError(error.message || 'Failed to save team member. Please try again.');
    }
  };

  const handleClose = () => {
    setErrors({});
    setSubmitError('');
    onClose();
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
        padding: '2rem',
        width: '100%',
        maxWidth: '860px',
        minHeight: '85vh',
        maxHeight: '95vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            {title}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Error Message */}
        {submitError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} style={{ color: '#ef4444', marginTop: '0.125rem', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: 0, fontWeight: '600' }}>
                Error saving team member
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                {submitError}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User Selection (for adding new members) */}
          {!member && (
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                <User size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Select User
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }} />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search for a user..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
                
                {showUserDropdown && filteredUsers.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 20,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    marginTop: '0.25rem'
                  }}>
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
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
                          fontWeight: '600'
                        }}>
                          {user.avatar || user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{user.name}</div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showUserDropdown && filteredUsers.length === 0 && searchUser && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    zIndex: 20,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    marginTop: '0.25rem'
                  }}>
                    No users found matching "{searchUser}"
                  </div>
                )}
              </div>
              {errors.name && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                  {errors.name}
                </p>
              )}
            </div>
          )}

          {/* Manual Input Fields (always shown for editing, shown when user selected for adding) */}
          {(member || formData.name) && (
            <>
              {/* Name + Email (two columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1,
                      boxSizing: 'border-box'
                    }}
                  />
                  {errors.name && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <Mail size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1,
                      boxSizing: 'border-box'
                    }}
                  />
                  {errors.email && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Role + Status (two columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Role */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <Briefcase size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.role ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1,
                      position: 'relative',
                      zIndex: 1,
                      boxSizing: 'border-box'
                    }}
                  >
                    {allowedProjectRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {errors.role && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                      {errors.role}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <UserCheck size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: 'white',
                      opacity: loading ? 0.6 : 1,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="away">Away</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              {/* Contribution + Tasks Completed + Joined Date (three columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Contribution */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Contribution (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.contribution}
                    onChange={(e) => handleInputChange('contribution', parseInt(e.target.value) || 0)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.contribution ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1
                    }}
                  />
                  {errors.contribution && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                      {errors.contribution}
                    </p>
                  )}
                </div>

                {/* Tasks Completed */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Tasks Completed
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.tasksCompleted}
                    onChange={(e) => handleInputChange('tasksCompleted', parseInt(e.target.value) || 0)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${errors.tasksCompleted ? '#ef4444' : '#d1d5db'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1
                    }}
                  />
                  {errors.tasksCompleted && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                      {errors.tasksCompleted}
                    </p>
                  )}
                </div>

                {/* Joined Date */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    Joined Date
                  </label>
                  <input
                    type="date"
                    value={formData.joinedDate}
                    onChange={(e) => handleInputChange('joinedDate', e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Skills */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  <Award size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Skills
                </label>
                
                {/* Add Skill Input */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    list="skills"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    placeholder="Add a skill..."
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      opacity: loading ? 0.6 : 1
                    }}
                  />
                  <datalist id="skills">
                    {commonSkills.map(skill => (
                      <option key={skill} value={skill} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    disabled={loading || !newSkill.trim()}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: loading || !newSkill.trim() ? '#9ca3af' : '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      cursor: loading || !newSkill.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Add
                  </button>
                </div>

                {/* Skills Display */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {formData.skills.map(skill => (
                    <span
                      key={skill}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        borderRadius: '9999px',
                        border: '1px solid #dbeafe'
                      }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        disabled={loading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          padding: 0,
                          fontSize: '0.75rem',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        Ã—
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            marginTop: '1.5rem'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: 'white',
                color: '#374151',
                opacity: loading ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!member && !formData.name)}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: (loading || (!member && !formData.name)) ? 'not-allowed' : 'pointer',
                backgroundColor: '#2563eb',
                color: 'white',
                opacity: (loading || (!member && !formData.name)) ? 0.6 : 1
              }}
            >
              {loading ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamMemberModal;