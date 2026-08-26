// frontend/src/components/AuthDebugComponent.jsx
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const AuthDebugComponent = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    const gatherDebugInfo = () => {
      // Get frontend auth state
      const currentUser = apiService.getCurrentUser();
      const token = localStorage.getItem('token');
      const userFromStorage = localStorage.getItem('user');

      // Test API call
      const testApiCall = async () => {
        try {
          const response = await fetch('/api/organizational-change/test', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          return data;
        } catch (error) {
          return { error: error.message };
        }
      };

      // Get assessments
      const getAssessments = async () => {
        try {
          const response = await apiService.getOrganizationalChangeAssessments();
          return response;
        } catch (error) {
          return { error: error.message };
        }
      };

      Promise.all([testApiCall(), getAssessments()]).then(([apiTest, assessmentsData]) => {
        setDebugInfo({
          frontendUser: currentUser,
          token: token,
          userFromStorage: userFromStorage ? JSON.parse(userFromStorage) : null,
          apiTest: apiTest,
          timestamp: new Date().toISOString()
        });
        
        if (assessmentsData && assessmentsData.assessments) {
          setAssessments(assessmentsData.assessments);
        }
      });
    };

    gatherDebugInfo();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      maxWidth: '400px',
      maxHeight: '600px',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#ef4444' }}>🐛 Auth Debug Info</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Frontend State:</h4>
        <pre style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(debugInfo.frontendUser, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Token:</h4>
        <code style={{ backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '4px' }}>
          {debugInfo.token || 'None'}
        </code>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>API Test Response:</h4>
        <pre style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(debugInfo.apiTest, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Recent Assessments:</h4>
        {assessments.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No assessments found</p>
        ) : (
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {assessments.slice(0, 3).map((assessment, index) => (
              <div key={index} style={{
                backgroundColor: '#f9fafb',
                padding: '0.5rem',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                <div><strong>User:</strong> {assessment.user_name} (ID: {assessment.user_id})</div>
                <div><strong>Date:</strong> {new Date(assessment.created_at).toLocaleString()}</div>
                <div><strong>Vision Score:</strong> {assessment.vision_score}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Refresh Debug Info
      </button>
    </div>
  );
};

export default AuthDebugComponent;