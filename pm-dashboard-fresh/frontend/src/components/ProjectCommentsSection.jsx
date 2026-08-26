import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Trash2, Edit2, X, Check, MoreVertical } from 'lucide-react';
import apiService from '../services/apiService';

const ProjectCommentsSection = ({ 
  project,
  currentUser,
  refreshHistory,
  onCommentsCountChange
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null); 

  useEffect(() => {
    console.log('ðŸ” ProjectCommentsSection props:', {
      project,
      projectId: project?.id,
      projectIdType: typeof project?.id,
      currentUser,
      refreshHistory: !!refreshHistory,
      onCommentsCountChange: !!onCommentsCountChange
    });
  }, [project, currentUser, refreshHistory, onCommentsCountChange]);

  useEffect(() => {
    if (onCommentsCountChange) {
      onCommentsCountChange(comments.length);
    }
  }, [comments.length, onCommentsCountChange]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!project?.id) {
        console.log('âš ï¸ No project ID available for comments fetch');
        return;
      }
      
      try {
        setLoading(true);
        console.log('ðŸ”„ Fetching comments for project:', project.id);
        
        const response = await apiService.getProjectComments(project.id);
        console.log('âœ… Comments response:', response);
        
        if (response && response.success && response.data) {
          setComments(response.data);
          console.log('âœ… Comments loaded:', response.data.length);
        } else {
          console.warn('âš ï¸ Invalid comments response:', response);
          setComments([]);
        }
      } catch (error) {
        console.error('âŒ Failed to load comments:', error);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [project?.id]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const canModifyComment = (comment) => {
    return comment.userId === currentUser?.id || 
           comment.author === currentUser?.name ||
           currentUser?.role === 'admin' ||
           true; 
  };

  const handleMenuToggle = (commentId, event) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === commentId ? null : commentId);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;
    
    if (!project?.id) {
      console.error('âŒ Cannot add comment: No project ID available');
      alert('Error: Project information is missing. Please refresh the page.');
      return;
    }
    
    console.log('ðŸ“ ===== COMMENT SUBMISSION DEBUG =====');
    console.log('ðŸ“ currentUser in comment section:', currentUser);
    console.log('ðŸ“ currentUser.id:', currentUser?.id, 'type:', typeof currentUser?.id);
    console.log('ðŸ“ currentUser.name:', currentUser?.name, 'type:', typeof currentUser?.name);
    
    try {
      setSubmitting(true);
      console.log('ðŸ“ Adding comment:', newComment);
      
      // only the comment text is needed by the API, user info comes from the token
      const commentData = {
        content: newComment.trim()
      };
      
      console.log('📝 Sending comment payload to backend:', commentData);
      
      const response = await apiService.addProjectComment(project.id, commentData);
      console.log('âœ… Comment added response:', response);
      
      if (response && response.success) {
        console.log('âœ… Comment added successfully, returned data:', response.data);
        console.log('âœ… Comment author in response:', response.data.author);
        
        setComments(prev => [response.data, ...prev]);
        setNewComment('');
        
        if (refreshHistory) {
          console.log('ðŸ”„ Refreshing history after comment...');
          refreshHistory();
        }
        
        console.log('âœ… Comment added successfully');
      } else {
        console.error('âŒ Failed to add comment:', response);
        alert('Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('âŒ Error adding comment:', error);
      alert(`Failed to add comment: ${error.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setOpenMenuId(null); 
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (commentId) => {
    if (!editingContent.trim() || updating) return;
    
    try {
      setUpdating(true);
      console.log('ðŸ“ Updating comment:', commentId, editingContent);
      console.log('ðŸ“ Current user for edit:', currentUser);
      
      const response = await apiService.updateProjectComment(project.id, commentId, {
        content: editingContent.trim(),
        userId: currentUser?.id || null, 
        userName: currentUser?.name || 'Current User' 
      });
      
      console.log('âœ… Comment updated response:', response);
      
      if (response && response.success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, content: editingContent.trim() }
            : comment
        ));
        
        setEditingCommentId(null);
        setEditingContent('');
        
        if (refreshHistory) {
          console.log('ðŸ”„ Refreshing history after comment update...');
          refreshHistory();
        }
        
        console.log('âœ… Comment updated successfully');
      } else {
        console.error('âŒ Failed to update comment:', response);
        alert('Failed to update comment. Please try again.');
      }
    } catch (error) {
      console.error('âŒ Error updating comment:', error);
      alert(`Failed to update comment: ${error.message || 'Please try again.'}`);
    } finally {
      setUpdating(false);
    }
  };

  const UserDebugInfo = ({ currentUser }) => (
    <div style={{
      backgroundColor: '#fef3c7',
      padding: '1rem',
      borderRadius: '0.5rem',
      margin: '1rem 0',
      border: '2px solid #f59e0b'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>
        ðŸ‘¤ Current User Debug (You are logged in as):
      </h4>
      <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
        <div><strong>ID:</strong> {currentUser?.id || 'Not set'}</div>
        <div><strong>Name:</strong> {currentUser?.name || 'Not set'}</div>
        <div><strong>Email:</strong> {currentUser?.email || 'Not set'}</div>
        <div><strong>Type:</strong> {typeof currentUser}</div>
      </div>
    </div>
  );

  const handleDeleteComment = async (commentId) => {
    if (deleting === commentId) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this comment? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      setDeleting(commentId);
      setOpenMenuId(null);
      console.log('ðŸ—‘ï¸ Deleting comment:', commentId);
      
      const response = await apiService.deleteProjectComment(project.id, commentId);
      console.log('âœ… Comment deleted response:', response);
      
      if (response && response.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        
        if (refreshHistory) {
          console.log('ðŸ”„ Refreshing history after comment deletion...');
          refreshHistory();
        }
        
        console.log('âœ… Comment deleted successfully');
      } else {
        console.error('âŒ Failed to delete comment:', response);
        alert('Failed to delete comment. Please try again.');
      }
    } catch (error) {
      console.error('âŒ Error deleting comment:', error);
      alert(`Failed to delete comment: ${error.message || 'Please try again.'}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleEditKeyPress = (e, commentId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(commentId);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (!project) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
          <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>Error: No project data</h3>
          <p style={{ color: '#6b7280' }}>
            Project information is missing. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '1.5rem'
    }}>
      {/* Debug info - remove this in production */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '0.5rem',
        borderRadius: '0.25rem',
        marginBottom: '1rem',
        fontSize: '0.75rem',
        color: '#374151'
      }}>
        <strong>Debug:</strong> Project ID: {project?.id} | 
        Comments: {comments.length} | 
        User: {currentUser?.name || 'Not set'} |
        User ID: {currentUser?.id || 'Not set'}
      </div>

      {/* Add Comment Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
          Add Comment
        </h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '600',
            flexShrink: 0
          }}>
            {currentUser?.name?.split(' ').map(n => n[0]).join('') || 'CU'}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a comment... (Press Enter to send)"
              rows={3}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                opacity: submitting ? 0.6 : 1
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Press Shift+Enter for new line
              </span>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting || !project?.id}
                style={{
                  padding: '0.5rem 1rem',
                  background: (newComment.trim() && !submitting && project?.id) ? 'linear-gradient(to right, #2563eb, #1d4ed8)' : '#e5e7eb',
                  color: (newComment.trim() && !submitting && project?.id) ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: (newComment.trim() && !submitting && project?.id) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <Send size={14} />
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Comments ({comments.length})
          </h3>
          {loading && (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Loading comments...
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No comments yet. Be the first to add one!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {comments.map(comment => (
              <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  backgroundColor: comment.author === 'System' ? '#6b7280' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {comment.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                        {comment.author}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    
                    {/* Three-Dot Menu */}
                    {canModifyComment(comment) && editingCommentId !== comment.id && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => handleMenuToggle(comment.id, e)}
                          style={{
                            padding: '0.25rem',
                            background: 'none',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="More options"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openMenuId === comment.id && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            zIndex: 10,
                            minWidth: '120px',
                            overflow: 'hidden'
                          }}>
                            <button
                              onClick={() => handleEditComment(comment)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deleting === comment.id}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: deleting === comment.id ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: deleting === comment.id ? 0.5 : 1
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <Trash2 size={14} />
                              {deleting === comment.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Edit mode buttons */}
                    {editingCommentId === comment.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editingContent.trim() || updating}
                          style={{
                            padding: '0.25rem',
                            background: 'none',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: updating ? 'not-allowed' : 'pointer',
                            color: '#10b981',
                            opacity: updating ? 0.5 : 1
                          }}
                          title="Save changes"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={updating}
                          style={{
                            padding: '0.25rem',
                            background: 'none',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: updating ? 'not-allowed' : 'pointer',
                            color: '#6b7280'
                          }}
                          title="Cancel editing"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Comment content */}
                  {editingCommentId === comment.id ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyPress={(e) => handleEditKeyPress(e, comment.id)}
                        rows={3}
                        disabled={updating}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          opacity: updating ? 0.6 : 1
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        placeholder="Edit your comment..."
                      />
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        Press Enter to save, Escape to cancel
                      </div>
                    </div>
                  ) : (
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#374151', 
                      lineHeight: '1.5', 
                      margin: 0,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCommentsSection;