import React, { useState, useEffect } from 'react';
import { Search, Plus, Bug, Loader, Mail } from 'lucide-react';
import apiService from '../services/apiService';

const SimpleSearchDebug = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllUsers();
      if (response.success) {
        setAllUsers(response.data);
        console.log('All users loaded:', response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Show ALL users that match search, regardless of any filtering
  const searchResults = allUsers.filter(user => {
    if (!searchQuery.trim() || searchQuery.length < 2) return false;
    
    const nameMatch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return nameMatch || emailMatch;
  });

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading users...</div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem' }}>
      <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Bug size={20} />
        Simple Search Debug Tool
      </h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Total users in database: {allUsers.length}
        </p>
        
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
            placeholder="Search by name or email (shows ALL matches)..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {searchQuery.length >= 2 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: 'white'
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #f3f4f6',
            backgroundColor: '#f9fafb',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}>
            Search Results ({searchResults.length} found)
          </div>
          
          {searchResults.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              No users found matching "{searchQuery}"
            </div>
          ) : (
            searchResults.map((user) => (
              <div
                key={user.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: '#111827' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} />
                    {user.email}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Role: {user.role} | ID: {user.id} | Project Manager ID: {user.project_manager_id || 'None'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {searchQuery.length < 2 && searchQuery.length > 0 && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fef3c7', 
          color: '#92400e', 
          borderRadius: '0.5rem',
          fontSize: '0.875rem'
        }}>
          Type at least 2 characters to search
        </div>
      )}
    </div>
  );
};

export default SimpleSearchDebug;