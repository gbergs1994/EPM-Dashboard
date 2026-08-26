import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

// Updated Delete Confirmation Modal with better error handling
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, projectName }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await onConfirm();
      
      setIsDeleting(false);
      
    } catch (error) {
      console.error('âŒ Delete confirmation error:', error);
      setError(error.message || 'Failed to delete project');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsDeleting(false);
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
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        width: '100%',
        maxWidth: '400px',
        padding: '1.5rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Trash2 size={24} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            Delete Project
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            Are you sure you want to delete "<strong>{projectName}</strong>"? This action cannot be undone.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '1rem'
          }}>
            <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.5rem',
              backgroundColor: isDeleting ? '#9ca3af' : '#ef4444',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isDeleting ? 'not-allowed' : 'pointer'
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;