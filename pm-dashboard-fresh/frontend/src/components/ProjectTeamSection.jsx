// frontend/src/components/ProjectTeamSection.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  UserX, 
  Search, 
  Filter, 
  X,
  Loader,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import TeamMemberModal from './TeamMemberModal';
import apiService from '../services/apiService';

const ProjectTeamSection = ({ 
  teamMembersDetailed = [], 
  project, 
  currentUser, 
  onTeamUpdate, 
  refreshHistory 
}) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Add Team Member Modal State (similar to TeamMemberManagement)
  const [showTeamSearch, setShowTeamSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [projectManagerTeam, setProjectManagerTeam] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [workloadAllocations, setWorkloadAllocations] = useState({});

  // SIMPLIFIED PERMISSIONS - Always allow access for debugging
  const canManageTeam = true; // Always true for debugging
  const isReadOnly = false;   // Always false for debugging

  useEffect(() => {
    console.log('🔍 ProjectTeamSection useEffect triggered', {
      teamMembersDetailed: teamMembersDetailed?.length,
      projectId: project?.id,
      currentUser: currentUser?.name
    });

    if (teamMembersDetailed && teamMembersDetailed.length > 0) {
      console.log('✅ Using teamMembersDetailed:', teamMembersDetailed.length);
      setTeamMembers(teamMembersDetailed);
    } else if (project?.id) {
      console.log('⚠️ Loading team members from API');
      loadTeamMembers();
    }
    
    // Always load users and project manager team for debugging
    loadAllUsers();
    loadProjectManagerTeam();
  }, [project?.id, teamMembersDetailed]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading team members for project:', project.id);
      
      const response = await apiService.getProjectTeam(project.id);
      
      if (response && response.success) {
        console.log('✅ Team members loaded:', response.team);
        const teamData = response.team || response.data || [];
        setTeamMembers(teamData);
      } else {
        console.warn('⚠️ Team loading response:', response);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load team members:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      console.log('📡 Loading all available users...');
      const response = await apiService.getAllUsers();
      
      if (response && response.success) {
        const userData = response.users || response.data || [];
        console.log('✅ All users loaded:', userData.length);
        setAllUsers(userData);
      } else {
        console.warn('⚠️ Users loading response:', response);
        setAllUsers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setAllUsers([]);
    }
  };

  // Load the project manager's assigned team members
  const loadProjectManagerTeam = async () => {
    try {
      console.log('📡 Loading project manager team...');
      
      const response = await apiService.getProjectManagerTeam();
      if (response && response.success) {
        const teamData = response.data?.teamMembers || [];
        console.log('✅ Project Manager team loaded:', teamData.length);
        setProjectManagerTeam(teamData);
      } else {
        console.warn('⚠️ Project Manager team loading failed:', response);
        setProjectManagerTeam([]);
      }
    } catch (error) {
      console.error('❌ Failed to load project manager team:', error);
      setProjectManagerTeam([]);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      console.log('➕ Adding team member:', memberData);

      const normalizedWorkload = Number.parseInt(
        memberData.workload_allocation ?? memberData.contribution,
        10
      );

      if (Number.isNaN(normalizedWorkload) || normalizedWorkload < 1 || normalizedWorkload > 100) {
        throw new Error('workload_allocation must be between 1 and 100');
      }
      
      const response = await apiService.addTeamMember(project.id, {
        user_id: memberData.id,
        name: memberData.name,
        email: memberData.email,
        role_in_project: memberData.role || 'Team Member',
        skills: memberData.skills || [],
        workload_allocation: normalizedWorkload
      });

      if (response && response.success) {
        console.log('✅ Team member added successfully');
        await loadTeamMembers();
        setShowAddMember(false);
        
        // Notify parent component
        if (onTeamUpdate) {
          onTeamUpdate(teamMembers);
        }
        
        // Refresh project history
        if (refreshHistory) {
          refreshHistory();
        }
      } else {
        throw new Error(response?.error || 'Failed to add team member');
      }
    } catch (error) {
      console.error('❌ Failed to add team member:', error);
      throw error;
    }
  };

  const handleEditMember = async (memberData) => {
    try {
      console.log('📝 Updating team member:', memberData);
      const memberUserId = memberData.user_id || memberData.id;

      if (!memberUserId) {
        throw new Error('Invalid team member identifier');
      }
      
      const response = await apiService.updateTeamMember(project.id, memberUserId, {
        name: memberData.name,
        email: memberData.email,
        role_in_project: memberData.role || 'Team Member',
        skills: memberData.skills || [],
        contribution: Number(memberData.contribution ?? memberData.workload_allocation ?? 0),
        workload_allocation: Number(memberData.workload_allocation ?? memberData.contribution ?? 0)
      });

      if (response && response.success) {
        console.log('✅ Team member updated successfully');
        await loadTeamMembers();
        setEditingMember(null);
        
        // Notify parent component
        if (onTeamUpdate) {
          onTeamUpdate(teamMembers);
        }
        
        // Refresh project history
        if (refreshHistory) {
          refreshHistory();
        }
      } else {
        throw new Error(response?.error || 'Failed to update team member');
      }
    } catch (error) {
      console.error('❌ Failed to update team member:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      console.log('🗑️ Removing team member:', memberId);

      if (!memberId) {
        throw new Error('Invalid team member identifier');
      }
      
      const response = await apiService.removeTeamMember(project.id, memberId);
      
      if (response && response.success) {
        console.log('✅ Team member removed successfully');
        await loadTeamMembers();
        
        // Notify parent component
        if (onTeamUpdate) {
          onTeamUpdate(teamMembers);
        }
        
        // Refresh project history
        if (refreshHistory) {
          refreshHistory();
        }
      } else {
        throw new Error(response?.error || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('❌ Failed to remove team member:', error);
      alert(`Failed to remove team member: ${error.message}`);
    }
  };

  // Team search functionality
  const searchTeamMembers = async (query) => {
    setSearchLoading(true);
    
    try {
      // Combine PM team and all users to ensure any team member can be found and added
      const userMap = new Map();
      allUsers.forEach(u => {
        if (u && u.id) userMap.set(u.id, u);
      });
      projectManagerTeam.forEach(u => {
        if (u && u.id) {
          const existing = userMap.get(u.id) || {};
          userMap.set(u.id, { ...existing, ...u });
        }
      });
      let availableUsers = Array.from(userMap.values());
      if (availableUsers.length === 0) {
        availableUsers = projectManagerTeam.length > 0 ? projectManagerTeam : allUsers;
      }

      const filtered = availableUsers.filter(user => {
        const matchesQuery = !query.trim() || query.length < 2 ||
          user.name?.toLowerCase().includes(query.toLowerCase()) ||
          user.email?.toLowerCase().includes(query.toLowerCase());
        const currentTeamIds = new Set(teamMembers.map(member => member.id || member.user_id));
        return matchesQuery && user.id !== currentUser?.id && !currentTeamIds.has(user.id);
      });

      setSearchResults(filtered);
      
    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addTeamMemberFromSearch = async (memberIds) => {
    try {
      setAddMemberLoading(true);
      setMessage({ type: '', text: '' });

      // Validate all allocations before adding anyone
      for (const memberId of memberIds) {
        const alloc = parseInt(workloadAllocations[memberId], 10);
        if (!alloc || alloc < 1 || alloc > 100) {
          setMessage({ type: 'error', text: 'Please enter a workload allocation (1–100) for each selected member.' });
          setAddMemberLoading(false);
          return;
        }
        const member = searchResults.find(u => u.id === memberId);
        const currentWorkload = Number.parseInt(member?.current_workload, 10);
        const normalizedCurrentWorkload = Number.isNaN(currentWorkload) ? 0 : Math.max(0, currentWorkload);

        if (member && normalizedCurrentWorkload + alloc > 100) {
          setMessage({
            type: 'error',
            text: `${member.name} only has ${100 - normalizedCurrentWorkload}% workload capacity remaining.`
          });
          setAddMemberLoading(false);
          return;
        }
      }
      
      for (const memberId of memberIds) {
        const member = searchResults.find(u => u.id === memberId);
        if (member) {
          await handleAddMember({
            id: member.id,
            name: member.name,
            email: member.email,
            role: 'Team Member',
            skills: [],
            workload_allocation: parseInt(workloadAllocations[memberId], 10)
          });
        }
      }
      
      setMessage({ 
        type: 'success', 
        text: `Successfully added ${memberIds.length} team member(s) to project` 
      });
      
      // Clear selections and close search
      setSelectedMembers([]);
      setWorkloadAllocations({});
      setSearchQuery('');
      setSearchResults([]);
      setShowTeamSearch(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      console.error('Error adding team members to project:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to add team members' });
    } finally {
      setAddMemberLoading(false);
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (window.projectSearchTimeout) {
      clearTimeout(window.projectSearchTimeout);
    }
    
    // Set new timeout
    window.projectSearchTimeout = setTimeout(() => {
      searchTeamMembers(query);
    }, 300);
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
                       member.role_in_project?.toLowerCase().includes(roleFilter.toLowerCase());
    
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = [...new Set(teamMembers.map(member => member.role_in_project).filter(Boolean))];

  console.log('🔍 ProjectTeamSection render state:', {
    currentUser: currentUser?.name,
    currentUserRole: currentUser?.role,
    canManageTeam,
    isReadOnly,
    teamMembersCount: teamMembers.length,
    projectId: project?.id,
    allUsersCount: allUsers.length,
    projectManagerTeamCount: projectManagerTeam.length,
    showAddMember,
    showTeamSearch
  });

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{ color: '#6b7280', margin: 0 }}>Loading team members...</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 1.5rem 0',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} style={{ color: '#374151' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Team Members ({teamMembers.length})
          </h3>
        </div>

        {/* ALWAYS SHOW BUTTONS FOR DEBUGGING */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Add from Project Manager Team Button */}
          <button
            onClick={() => { setShowTeamSearch(true); searchTeamMembers(''); }}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            <Plus size={16} />
            Add from Team
          </button>

          {/* Original Add Member Button */}
          <button
            onClick={() => setShowAddMember(true)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>
      </div>

      {/* Debug Information */}
      <div style={{
        padding: '0 1.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        margin: '0 1.5rem 1rem'
      }}>
        <strong>Debug Info:</strong> Users: {allUsers.length}, Project Manager Team: {projectManagerTeam.length}, 
        Current User: {currentUser?.name} ({currentUser?.role}), 
        Can Manage: {canManageTeam ? 'Yes' : 'No'}, 
        Read Only: {isReadOnly ? 'Yes' : 'No'}
      </div>

      {/* Success/Error Messages */}
      {message.text && (
        <div style={{
          padding: '0 1.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '0.5rem',
            color: message.type === 'success' ? '#065f46' : '#991b1b'
          }}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{message.text}</span>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      {teamMembers.length > 0 && (
        <div style={{
          padding: '0 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem'
        }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Role Filter */}
          {uniqueRoles.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'white',
                  minWidth: '140px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Team Members List */}
      <div style={{ padding: '0 1.5rem 1.5rem' }}>
        {filteredMembers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 0',
            color: '#6b7280'
          }}>
            {teamMembers.length === 0 ? (
              <>
                <Users size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  No team members yet
                </p>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  Add team members to start collaborating on this project
                </p>
              </>
            ) : (
              <>
                <Search size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  No members found
                </p>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  Try adjusting your search or filter criteria
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {filteredMembers.map(member => (
              <TeamMemberCard
                key={member.id || member.user_id || member.email}
                member={member}
                onEdit={() => setEditingMember(member)}
                onRemove={() => handleRemoveMember(member.user_id || member.id)}
                isReadOnly={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      {(showAddMember || editingMember) && (
        <TeamMemberModal
          isOpen={showAddMember || !!editingMember}
          onClose={() => {
            setShowAddMember(false);
            setEditingMember(null);
          }}
          onSubmit={editingMember ? handleEditMember : handleAddMember}
          member={editingMember}
          allUsers={projectManagerTeam.length > 0 ? projectManagerTeam : allUsers}
          currentTeamMembers={teamMembers}
        />
      )}

      {/* Team Search Modal */}
      {showTeamSearch && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                Add Team Members to Project
              </h3>
              <button
                onClick={() => {
                  setShowTeamSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setSelectedMembers([]);
                }}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '0.375rem'
                }}
              >
                <X size={20} style={{ color: '#6b7280' }} />
              </button>
            </div>

            {/* Search Section */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
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
                  placeholder="Search available users..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Debug info in modal */}
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                Available for search: {projectManagerTeam.length > 0 ? `${projectManagerTeam.length} project manager team members` : `${allUsers.length} all users`}
              </div>

              {selectedMembers.length > 0 && (
                <div style={{ 
                  marginTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {selectedMembers.length} member(s) selected
                  </span>
                  <button
                    onClick={() => addTeamMemberFromSearch(selectedMembers)}
                    disabled={addMemberLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: addMemberLoading ? 'not-allowed' : 'pointer',
                      opacity: addMemberLoading ? 0.6 : 1
                    }}
                  >
                    {addMemberLoading ? <Loader size={16} /> : <Plus size={16} />}
                    Add Selected
                  </button>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {searchLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  color: '#6b7280'
                }}>
                  <Loader size={20} style={{ marginRight: '0.5rem' }} />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#6b7280'
                  }}>
                    <Users size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      No available users found
                    </p>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Try a different search term or check if members are already on this project
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '0' }}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem 1.5rem',
                          borderBottom: '1px solid #f3f4f6',
                          backgroundColor: selectedMembers.includes(user.id) ? '#eff6ff' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(user.id)}
                            onChange={() => toggleMemberSelection(user.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                          }}>
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '500', color: '#111827' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Mail size={14} />
                              {user.email}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {user.role}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {/* Workload badge */}
                          <div style={{ textAlign: 'right', minWidth: '80px' }}>
                            <div style={{
                              fontSize: '0.75rem',
                              color: (user.current_workload || 0) >= 80 ? '#dc2626' : (user.current_workload || 0) >= 50 ? '#d97706' : '#6b7280',
                              fontWeight: '500'
                            }}>
                              {user.current_workload || 0}% occupied
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                              {100 - (user.current_workload || 0)}% available
                            </div>
                          </div>

                          {/* Workload allocation input */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#6b7280' }}>Workload %</label>
                            <input
                              type="number"
                              min="1"
                              max={100 - (user.current_workload || 0)}
                              value={workloadAllocations[user.id] || ''}
                              onChange={(e) => setWorkloadAllocations(prev => ({ ...prev, [user.id]: e.target.value }))}
                              placeholder="e.g. 25"
                              style={{
                                width: '70px',
                                padding: '0.375rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                textAlign: 'center'
                              }}
                            />
                          </div>

                          <button
                            onClick={() => addTeamMemberFromSearch([user.id])}
                            disabled={addMemberLoading || !workloadAllocations[user.id]}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: !workloadAllocations[user.id] ? '#e5e7eb' : '#f3f4f6',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: (addMemberLoading || !workloadAllocations[user.id]) ? 'not-allowed' : 'pointer',
                              opacity: (addMemberLoading || !workloadAllocations[user.id]) ? 0.6 : 1
                            }}
                          >
                            <Plus size={16} />
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Team Member Card component
const TeamMemberCard = ({ member, onEdit, onRemove, isReadOnly }) => {
  const projectWorkload = Number(member.contribution ?? member.contribution_percentage ?? 0);
  const totalWorkload = Number(member.current_workload ?? 0);

  const handleRemoveClick = () => {
    if (window.confirm(`Are you sure you want to remove ${member.name} from this project?`)) {
      onRemove();
    }
  };

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1rem',
      transition: 'all 0.2s'
    }}>
      {/* Member Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        {/* Avatar */}
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          fontSize: '0.875rem'
        }}>
          {member.avatar || member.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
        </div>

        {/* Member Info */}
        <div style={{ flex: 1 }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 0.25rem 0'
          }}>
            {member.name}
          </h4>
          <p style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Mail size={12} />
            {member.email}
          </p>
        </div>

        {/* Actions - Always show for debugging */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={onEdit}
            style={{
              padding: '0.375rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '0.75rem'
            }}
            title="Edit member"
          >
            Edit
          </button>
          <button
            onClick={handleRemoveClick}
            style={{
              padding: '0.375rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Remove member"
          >
            <UserX size={14} />
          </button>
        </div>
      </div>

      {/* Role and Skills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Project Workload</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1f2937' }}>{projectWorkload}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
            <div style={{
              height: '100%',
              width: `${projectWorkload}%`,
              borderRadius: '3px',
              backgroundColor: projectWorkload >= 80 ? '#dc2626' : projectWorkload >= 50 ? '#f59e0b' : '#22c55e'
            }} />
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Total workload across projects: <strong style={{ color: '#374151' }}>{totalWorkload}%</strong>
        </div>

        {member.role_in_project && (
          <div>
            <span style={{
              fontSize: '0.75rem',
              color: '#374151',
              fontWeight: '500'
            }}>
              Role: 
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginLeft: '0.25rem'
            }}>
              {member.role_in_project}
            </span>
          </div>
        )}

        {member.skills && member.skills.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.75rem',
              color: '#374151',
              fontWeight: '500',
              marginBottom: '0.25rem'
            }}>
              Skills:
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem'
            }}>
              {member.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  style={{
                    fontSize: '0.625rem',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontWeight: '500'
                  }}
                >
                  {skill}
                </span>
              ))}
              {member.skills.length > 3 && (
                <span style={{
                  fontSize: '0.625rem',
                  color: '#6b7280',
                  padding: '0.125rem 0.375rem'
                }}>
                  +{member.skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {member.joined_date && (
          <div>
            <span style={{
              fontSize: '0.75rem',
              color: '#374151',
              fontWeight: '500'
            }}>
              Joined: 
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginLeft: '0.25rem'
            }}>
              {new Date(member.joined_date).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTeamSection;