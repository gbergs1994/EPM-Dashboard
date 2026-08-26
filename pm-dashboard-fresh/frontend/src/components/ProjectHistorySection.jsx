import React from 'react';
import { ArrowRight, Plus, Minus, Edit, Users as UsersIcon } from 'lucide-react';
import apiService from '../services/apiService';

const ProjectHistorySection = ({ projectHistory, formatTimestamp, getActionIcon, getActionColor, historyLoading }) => {
  
  const renderDetailedChanges = (details, actionType) => {
    if (!details || typeof details !== 'object') return null;
    
    const changes = [];
    
    Object.entries(details).forEach(([key, value]) => {
      if (key === 'team' && value) {
        if (value.added && value.added.length > 0) {
          changes.push(
            <div key={`${key}-added`} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={14} style={{ color: '#10b981' }} />
              <span><strong>Added team members:</strong> {value.added.join(', ')}</span>
            </div>
          );
        }
        if (value.removed && value.removed.length > 0) {
          changes.push(
            <div key={`${key}-removed`} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Minus size={14} style={{ color: '#ef4444' }} />
              <span><strong>Removed team members:</strong> {value.removed.join(', ')}</span>
            </div>
          );
        }
      } else if (value && typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
        const fieldName = key.replace('_', ' ').replace('progress ', '');
        
        let fromValue = value.from;
        let toValue = value.to;

        if (key === 'deadline') {
          fromValue = value.from ? new Date(value.from).toLocaleDateString() : 'Not set';
          toValue = new Date(value.to).toLocaleDateString();
        }
        
        if (key.startsWith('progress_')) {
          fromValue = `${value.from}/7`;
          toValue = `${value.to}/7`;
        }
        
        changes.push(
          <div key={key} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit size={14} style={{ color: '#f59e0b' }} />
            <span>
              <strong>{fieldName}:</strong> 
              <span style={{ 
                padding: '0.125rem 0.375rem', 
                backgroundColor: '#fef2f2', 
                color: '#991b1b',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                margin: '0 0.25rem'
              }}>
                {String(fromValue)}
              </span>
              <ArrowRight size={12} style={{ color: '#6b7280', margin: '0 0.25rem' }} />
              <span style={{ 
                padding: '0.125rem 0.375rem', 
                backgroundColor: '#f0fdf4', 
                color: '#166534',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                margin: '0 0.25rem'
              }}>
                {String(toValue)}
              </span>
            </span>
          </div>
        );
      }
    });
    
    return changes.length > 0 ? (
      <div style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
          Changes made:
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {changes}
        </div>
      </div>
    ) : null;
  };

  const getEnhancedDescription = (item) => {
    switch (item.type) {
      case 'created':
        return `Project "${item.details?.name || 'Unknown'}" was created with ${item.details?.status || 'unknown'} status and ${item.details?.priority || 'unknown'} priority`;
      case 'project_update':
        return item.description || 'Project was updated';
      case 'team_change':
        if (item.details?.added && item.details?.removed) {
          return `Team updated: added ${item.details.added.join(', ')} and removed ${item.details.removed.join(', ')}`;
        } else if (item.details?.added) {
          return `Added ${item.details.added.join(', ')} to the team`;
        } else if (item.details?.removed) {
          return `Removed ${item.details.removed.join(', ')} from the team`;
        }
        return item.description;
      case 'status_change':
        return item.details?.from && item.details?.to 
          ? `Status changed from "${item.details.from}" to "${item.details.to}"`
          : item.description;
      case 'deadline_change':
        return item.details?.from && item.details?.to
          ? `Deadline changed from ${new Date(item.details.from).toLocaleDateString()} to ${new Date(item.details.to).toLocaleDateString()}`
          : item.description;
      case 'progress_update':
        return 'Project progress was updated';
      case 'feedback_submitted':
        return `${item.user} submitted project feedback with ${item.details?.overallRating || 'unknown'} overall rating`;
      default:
        return item.description;
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
          Project History
        </h3>
        <button 
          onClick={async () => {
            try {
              console.log('ðŸ”„ Finding available projects...');
              
              const projectsResponse = await fetch('/api/projects');
              const projectsData = await projectsResponse.json();
              console.log('ðŸ“Š Available projects:', projectsData.data);
              
              if (!projectsData.data || projectsData.data.length === 0) {
                alert('No projects found in database. Create a project first!');
                return;
              }
              
              const firstProject = projectsData.data[0];
              const projectId = firstProject.id;
              console.log('ðŸ” Using project ID:', projectId, 'Name:', firstProject.name);
              
              console.log('ðŸ” Fetch URL:', `/api/projects/${projectId}/history`);
              
              const response = await fetch(`/api/projects/${projectId}/history`);
              console.log('ðŸ“Š Response status:', response.status);
              console.log('ðŸ“Š Response ok:', response.ok);
              
              const responseText = await response.text();
              console.log('ðŸ“Š Raw response text:', responseText);
              
              let data;
              try {
                data = JSON.parse(responseText);
                console.log('ðŸ“Š Parsed JSON:', data);
              } catch (parseError) {
                console.error('âŒ JSON parse error:', parseError);
                alert(`JSON Parse Error: ${parseError.message}`);
                return;
              }
              
              console.log('ðŸ“Š Data success:', data.success);
              console.log('ðŸ“Š Data length:', data.data?.length);
              
              alert(`History fetch test: ${data.success ? 'Success' : 'Failed'} - Project: ${firstProject.name} - Length: ${data.data?.length || 0}`);
            } catch (error) {
              console.error('âŒ Manual fetch error:', error);
              alert('Manual fetch failed: ' + error.message);
            }
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            marginRight: '0.5rem'
          }}
        >
          Test History API
        </button>
        
        <button 
          onClick={() => {
            console.log('ðŸ” Current projectHistory state:', projectHistory);
            console.log('ðŸ” projectHistory type:', typeof projectHistory);
            console.log('ðŸ” projectHistory isArray:', Array.isArray(projectHistory));
            if (Array.isArray(projectHistory)) {
              console.log('ðŸ” First few items:', projectHistory.slice(0, 3));
            }
            alert(`State debug logged to console. Array length: ${projectHistory?.length || 0}`);
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            marginRight: '0.5rem'
          }}
        >
          Debug State
        </button>
        
        <button 
          onClick={async () => {
            try {
              console.log('ðŸ”„ Testing apiService.getProjectHistory directly...');

              console.log('ðŸ” apiService imported:', !!apiService);
              console.log('ðŸ” getProjectHistory method:', !!apiService.getProjectHistory);
              
              if (!apiService.getProjectHistory) {
                throw new Error('getProjectHistory method not found on apiService');
              }
   
              const projectId = window.location.pathname.includes('project') ? 
                window.location.pathname.split('/').pop() : '8';
              console.log('ðŸ” Using project ID:', projectId);
              
              const response = await apiService.getProjectHistory(projectId);
              console.log('ðŸ“Š apiService result:', response);
              alert(`apiService test: ${response?.success ? 'Success' : 'Failed'} - Length: ${response?.data?.length || 0}`);
            } catch (error) {
              console.error('âŒ apiService error:', error);
              console.error('âŒ Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
              });
              alert('apiService test failed - Check console: ' + error.message);
            }
          }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          Test ApiService
        </button>
      </div>
      
      {/* Debug info */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.75rem'
      }}>
        <strong>Debug:</strong> History array length: {projectHistory?.length || 0} | 
        Loading: {historyLoading ? 'Yes' : 'No'} | 
        Has data: {projectHistory && Array.isArray(projectHistory) ? 'Yes' : 'No'}
      </div>
      
      {projectHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#6b7280' }}>No history available for this project</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '1rem',
            bottom: '1rem',
            width: '2px',
            backgroundColor: '#e5e7eb'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {projectHistory.map(item => {
              const Icon = getActionIcon(item.type);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', position: 'relative' }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    border: `3px solid ${getActionColor(item.type)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                  }}>
                    <Icon size={12} style={{ color: getActionColor(item.type) }} />
                  </div>
                  <div style={{ flex: 1, paddingTop: '0.125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {item.action}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 0.5rem 0' }}>
                      {getEnhancedDescription(item)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                      by {item.user}
                    </p>
                    {renderDetailedChanges(item.details, item.type)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHistorySection;