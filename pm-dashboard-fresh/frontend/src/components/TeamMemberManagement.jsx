import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Users, 
  Mail, 
  UserPlus, 
  UserMinus, 
  AlertCircle, 
  CheckCircle,
  Loader,
  Filter
} from 'lucide-react';
import apiService from '../services/apiService';

const TeamMemberManagement = ({ currentUser, onTeamUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentTeam, setCurrentTeam] = useState([]);
  const [unassignedMembers, setUnassignedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    if (currentUser?.role === 'Project Manager') {
      loadInitialData();
    }
  }, [currentUser]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('Loading initial team management data...');
      
      // Load team data only
      const teamResponse = await apiService.getProjectManagerTeam().catch(err => {
        console.warn('Team data failed:', err);
        return { success: false, data: { teamMembers: [], unassignedMembers: [] } };
      });
      
      console.log('Team response:', teamResponse);
      
      // Set team data
      if (teamResponse.success) {
        setCurrentTeam(teamResponse.data.teamMembers || []);
        setUnassignedMembers(teamResponse.data.unassignedMembers || []);
        if (onTeamUpdate) {
          onTeamUpdate(teamResponse.data);
        }
      }
      
      setDataLoaded(true);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setMessage({ type: 'error', text: 'Failed to load team data' });
    } finally {
      setLoading(false);
    }
  };

  

  const searchUsers = async (query) => {
    setSearchLoading(true);
    
    try {
      const response = query.trim().length >= 2
        ? await apiService.searchUsers(query)
        : await apiService.getAllUsers();

      if (response.success && Array.isArray(response.data || response.users)) {
        const users = response.data || response.users || [];
        // Filter out current user and current team members
        const currentTeamIds = new Set(currentTeam.map(member => member.id));
        
        const filtered = users.filter(user => {
          const excludeCurrentUser = user.id !== currentUser.id;
          const excludeTeamMembers = !currentTeamIds.has(user.id);
          return excludeCurrentUser && excludeTeamMembers;
        });
        
        setSearchResults(filtered);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchResults([]);
      setShowSearchResults(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const addTeamMembers = async (memberIds) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      console.log('Adding team members:', memberIds);
      const response = await apiService.assignTeamMembers(memberIds);
      
      console.log('Add members response:', response);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Successfully added ${response.data?.assignedCount || memberIds.length} team member(s)` 
        });
        
        // Refresh data
        await loadInitialData();
        
        // Clear selections
        setSelectedMembers([]);
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(response.message || 'Failed to add team members');
      }
    } catch (error) {
      console.error('Error adding team members:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to add team members' });
    } finally {
      setLoading(false);
    }
  };

  const removeTeamMembers = async (memberIds) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      console.log('Removing team members:', memberIds);
      const response = await apiService.removeTeamMembers(memberIds);
      
      console.log('Remove members response:', response);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Successfully removed ${response.data?.removedCount || memberIds.length} team member(s)` 
        });
        
        // Refresh data
        await loadInitialData();
        
        // Clear selections
        setSelectedMembers([]);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error(response.message || 'Failed to remove team members');
      }
    } catch (error) {
      console.error('Error removing team members:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to remove team members' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSelected = () => {
    if (selectedMembers.length > 0) {
      addTeamMembers(selectedMembers);
    }
  };

  const handleRemoveMember = (memberId) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      removeTeamMembers([memberId]);
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
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    
    // Set new timeout
    window.searchTimeout = setTimeout(() => {
      searchUsers(query);
    }, 300);
  };
  if (currentUser?.role !== 'Project Manager') {
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
        <p style={{ color: '#6b7280' }}>Only Project Managers can manage team members.</p>
      </div>
    );
  }

  if (loading && !dataLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '3rem',
        color: '#6b7280'
      }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
        Loading team management data...
      </div>
    );
  }

  return (
    <div className="team-member-management-screen" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
          Manage Team Members
        </h2>
        <p style={{ color: '#6b7280' }}>
          Search and add team members to your project manager team or remove existing members.
        </p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div style={{
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#166534' : '#991b1b',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          backgroundColor: '#f3f4f6',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <strong>Debug:</strong> All Users: {allUsers.length}, Current Team: {currentTeam.length}, 
          Unassigned: {unassignedMembers.length}
        </div>
      )}

      {/* Search Section */}
      <div className="team-member-search-panel" style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Add New Team Members
        </h3>
        
        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 3rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#2563eb'; if (!searchQuery) searchUsers(''); }}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            {searchLoading && (
              <Loader size={20} style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                animation: 'spin 1s linear infinite',
                color: '#9ca3af'
              }} />
            )}
          </div>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                {searchQuery ? `No users found matching "${searchQuery}"` : 'No available users to add'}
              </div>
            ) : (
              <>
                <div style={{ padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {searchResults.length} user(s) found
                    </span>
                    {selectedMembers.length > 0 && (
                      <button
                        onClick={handleAddSelected}
                        disabled={loading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        <UserPlus size={16} />
                        Add Selected ({selectedMembers.length})
                      </button>
                    )}
                  </div>
                </div>
                
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
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
                        backgroundColor: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
                          {user.role} • <span style={{ color: (user.current_workload || 0) >= 80 ? '#dc2626' : (user.current_workload || 0) >= 50 ? '#d97706' : '#16a34a' }}>{user.current_workload || 0}% occupied</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => addTeamMembers([user.id])}
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Current Team Section */}
      <div className="current-team-panel" style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Current Team ({currentTeam.length} members)
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Team members currently assigned to you
          </p>
        </div>

        {currentTeam.length === 0 ? (
          <div className="current-team-empty-state" style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f9fafb'
          }}>
            <Users size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No Team Members</h3>
            <p style={{ color: '#6b7280' }}>Search and add team members to get started.</p>
          </div>
        ) : (
          <div style={{ padding: '0' }}>
            {currentTeam.map((member, index) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem',
                  borderBottom: index < currentTeam.length - 1 ? '1px solid #f3f4f6' : 'none'
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
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '1rem' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <Mail size={14} />
                      {member.email}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {member.role} • {member.projectCount || 0} projects
                    </div>
                    {/* Workload bar */}
                    <div style={{ marginTop: '0.375rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.125rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Workload</span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: (member.current_workload || 0) >= 80 ? '#dc2626' : (member.current_workload || 0) >= 50 ? '#d97706' : '#16a34a'
                        }}>
                          {member.current_workload || 0}%
                        </span>
                      </div>
                      <div style={{ width: '140px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: '3px',
                          width: `${member.current_workload || 0}%`,
                          backgroundColor: (member.current_workload || 0) >= 80 ? '#dc2626' : (member.current_workload || 0) >= 50 ? '#f59e0b' : '#22c55e',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  <UserMinus size={16} />
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unassigned Members (if any) */}
      {showSearchResults && (
        <div className="quick-add-banner" style={{
          backgroundColor: '#fefce8',
          border: '1px solid #fde047',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginTop: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Filter size={16} color="#a16207" />
            <span style={{ color: '#a16207', fontWeight: '500' }}>
              Quick Add: Unassigned Members ({unassignedMembers.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {unassignedMembers.slice(0, 5).map((member) => (
              <button
                key={member.id}
                onClick={() => addTeamMembers([member.id])}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'white',
                  color: '#a16207',
                  border: '1px solid #fbbf24',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <Plus size={14} />
                {member.name}
              </button>
            ))}
            {unassignedMembers.length > 5 && (
              <span style={{ 
                color: '#a16207', 
                fontSize: '0.875rem', 
                padding: '0.5rem',
                fontStyle: 'italic'
              }}>
                +{unassignedMembers.length - 5} more...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberManagement;